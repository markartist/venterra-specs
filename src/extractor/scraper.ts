/**
 * LIVE PAGE SPEC EXTRACTOR
 *
 * Loads a web page via Playwright, extracts all governance data-* attributes,
 * and returns a structured spec + audit findings.
 */

import { chromium, type Browser, type Page } from 'playwright';
import type { ParsedSpec, ParsedSection, ParsedBlock, ParsedSubsection } from '../compiler/parser';

// ── Types ──────────────────────────────────────────────────────────────────

export interface SiteAttrs {
  'data-property-name': string | null;
  'data-property-code': string | null;
  'data-site-archetype': string | null;
  'data-site-page-template': string | null;
  'data-site-page-template-version': string | null;
  'data-site-same-store-date': string | null;
}

export interface PageAttrs {
  'data-page-template': string | null;
  'data-page-template-version': string | null;
  'data-banner': string | null;
}

export interface RawComponent {
  tag: string;
  'data-component-name': string;
  'data-action': string | null;
  parentSection: string | null;
  parentBlock: string | null;
  index: number; // document order
}

export interface RawSection {
  'data-page-section': string;
  'data-page-section-location': string | null;
  index: number; // document order
}

export interface AuditFinding {
  severity: 'error' | 'warning' | 'info';
  category: string;
  message: string;
  details?: string;
}

export interface RawAnchor {
  href: string;
  text: string;
  'data-component-name': string | null;
  'data-action': string | null;
  parentSection: string | null;
  parentBlock: string | null;
  classes: string;
  id: string | null;
  isVisible: boolean;
  index: number;
}

export interface ExtractionResult {
  url: string;
  timestamp: string;
  siteAttrs: SiteAttrs;
  pageAttrs: PageAttrs;
  spec: ParsedSpec;
  anchors: RawAnchor[];
  findings: AuditFinding[];
}

// ── Value cleaning ─────────────────────────────────────────────────────────

function cleanAttrValue(val: string | null): string | null {
  if (!val) return null;
  // Strip embedded quotes and trim whitespace
  return val.replace(/^[\s"']+|[\s"']+$/g, '').replace(/\\"/g, '');
}

// ── Browser-side scripts (run in page context via evaluate) ────────────────

const SCROLL_REVEAL_SCRIPT = `(async function() {
  var delay = function(ms) { return new Promise(function(r) { setTimeout(r, ms); }); };
  var scrollHeight = document.body.scrollHeight;
  var viewportHeight = window.innerHeight;
  var step = Math.floor(viewportHeight * 0.7);

  for (var y = 0; y < scrollHeight; y += step) {
    window.scrollTo({ top: y, behavior: 'instant' });
    await delay(300);
  }
  window.scrollTo({ top: scrollHeight, behavior: 'instant' });
  await delay(500);
  window.scrollTo({ top: 0, behavior: 'instant' });
  await delay(300);
})()`;

const FORCE_VISIBLE_CSS = [
  '*, *::before, *::after {',
  '  animation-delay: 0s !important;',
  '  animation-duration: 0s !important;',
  '  animation-play-state: paused !important;',
  '  transition-delay: 0s !important;',
  '  transition-duration: 0s !important;',
  '}',
  '[class*="reveal"], [class*="fade"], [class*="slide"],',
  '[class*="animate"], [class*="hidden"], [class*="invisible"],',
  '[data-aos], [data-scroll], [data-animate] {',
  '  opacity: 1 !important;',
  '  visibility: visible !important;',
  '  transform: none !important;',
  '}',
].join('\n');

const FORCE_VISIBLE_SCRIPT = `(function() {
  var els = document.querySelectorAll('*');
  for (var i = 0; i < els.length; i++) {
    var style = window.getComputedStyle(els[i]);
    if (parseFloat(style.opacity) < 0.1) {
      els[i].style.opacity = '1';
    }
    if (style.visibility === 'hidden') {
      els[i].style.visibility = 'visible';
    }
  }
})()`;

const EXTRACT_ANCHORS_SCRIPT = `(function() {
  var anchors = document.querySelectorAll('a');
  var results = [];
  for (var i = 0; i < anchors.length; i++) {
    var el = anchors[i];
    var rect = el.getBoundingClientRect();
    var style = window.getComputedStyle(el);
    var isVisible = rect.width > 0 && rect.height > 0
      && style.display !== 'none'
      && style.visibility !== 'hidden'
      && parseFloat(style.opacity) > 0.01;

    var closestSection = el.closest('[data-page-section]');
    var closestBlock = el.closest('[data-sub-section]');

    results.push({
      href: el.getAttribute('href') || '',
      text: (el.textContent || '').trim().substring(0, 200),
      'data-component-name': el.getAttribute('data-component-name'),
      'data-action': el.getAttribute('data-action'),
      parentSection: closestSection ? closestSection.getAttribute('data-page-section') : null,
      parentBlock: closestBlock ? closestBlock.getAttribute('data-sub-section') : null,
      classes: el.className || '',
      id: el.id || null,
      isVisible: isVisible,
      index: i
    });
  }
  return results;
})()`;

const EXTRACT_SCRIPT = `(function() {
  var result = {};

  // Site-level (body)
  var body = document.body;
  result.siteAttrs = {
    'data-property-name': body.getAttribute('data-property-name'),
    'data-property-code': body.getAttribute('data-property-code'),
    'data-site-archetype': body.getAttribute('data-site-archetype'),
    'data-site-page-template': body.getAttribute('data-site-page-template'),
    'data-site-page-template-version': body.getAttribute('data-site-page-template-version'),
    'data-site-same-store-date': body.getAttribute('data-site-same-store-date'),
  };

  // Page-level container
  var pc = document.querySelector('[data-page-template]');
  result.pageAttrs = {
    'data-page-template': pc ? pc.getAttribute('data-page-template') : null,
    'data-page-template-version': pc ? pc.getAttribute('data-page-template-version') : null,
    'data-banner': pc ? pc.getAttribute('data-banner') : null,
  };

  // Walk all tagged elements in document order using TreeWalker
  var walker = document.createTreeWalker(
    document.documentElement,
    NodeFilter.SHOW_ELEMENT,
    null
  );

  var allElements = [];
  var idx = 0;
  var node;
  while (node = walker.nextNode()) {
    var el = node;
    var pageSection = el.getAttribute('data-page-section');
    var subSection = el.getAttribute('data-sub-section');
    var componentName = el.getAttribute('data-component-name');

    if (pageSection || subSection || componentName) {
      allElements.push({
        idx: idx++,
        tag: el.tagName,
        pageSection: pageSection,
        pageSectionLocation: el.getAttribute('data-page-section-location'),
        subSection: subSection,
        componentName: componentName,
        action: el.getAttribute('data-action'),
        closestSection: (function() {
          var p = el.closest('[data-page-section]');
          return p ? p.getAttribute('data-page-section') : null;
        })(),
        closestBlock: (function() {
          var p = el.closest('[data-sub-section]');
          return p ? p.getAttribute('data-sub-section') : null;
        })(),
      });
    }
  }

  result.elements = allElements;
  return result;
})()`;

// ── Main extraction logic ──────────────────────────────────────────────────

export async function extractPage(url: string): Promise<{ result: ExtractionResult; screenshot: Buffer }> {
  let browser: Browser | null = null;

  try {
    browser = await chromium.launch();
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
    await page.goto(url, { waitUntil: 'networkidle', timeout: 60000 });

    // Wait for initial load
    await page.waitForTimeout(1000);

    // Scroll through the entire page to trigger scroll-reveal animations
    // (IntersectionObserver, scroll-triggered CSS, lazy images, etc.)
    await page.evaluate(SCROLL_REVEAL_SCRIPT);

    // Inject CSS to force all elements visible and disable animations
    await page.addStyleTag({ content: FORCE_VISIBLE_CSS });

    // Force visibility via JS for frameworks that use inline styles
    await page.evaluate(FORCE_VISIBLE_SCRIPT);

    await page.waitForTimeout(500);

    // Extract DOM data
    const raw: any = await page.evaluate(EXTRACT_SCRIPT);

    // Extract all <a> tags
    const anchors: RawAnchor[] = await page.evaluate(EXTRACT_ANCHORS_SCRIPT);

    // Full-page screenshot
    const screenshot = await page.screenshot({ fullPage: true, type: 'png' });

    await browser.close();
    browser = null;

    // Process raw data into structured spec
    const result = processRawData(url, raw);
    result.anchors = anchors;
    return {
      result,
      screenshot: screenshot as Buffer,
    };
  } finally {
    if (browser) await browser.close();
  }
}

function processRawData(url: string, raw: any): ExtractionResult {
  const findings: AuditFinding[] = [];
  const siteAttrs: SiteAttrs = raw.siteAttrs;
  const pageAttrs: PageAttrs = raw.pageAttrs;

  // ── Audit site/page attributes ──
  if (!pageAttrs['data-page-template']) {
    findings.push({
      severity: 'error',
      category: 'page-template',
      message: 'No [data-page-template] container found on page',
    });
  }

  for (const [key, val] of Object.entries(siteAttrs)) {
    if (!val) {
      findings.push({
        severity: 'warning',
        category: 'site-attrs',
        message: `Missing body attribute: ${key}`,
      });
    }
  }

  // ── Separate elements by type ──
  const elements: any[] = raw.elements;

  const sectionEls = elements.filter((e: any) => e.pageSection);
  const blockEls = elements.filter((e: any) => e.subSection && !e.pageSection);
  const componentEls = elements.filter((e: any) => e.componentName && !e.pageSection && !e.subSection);

  // ── Deduplicate sections ──
  const sectionMap = new Map<string, { section: string; location: string; index: number }>();
  for (const el of sectionEls) {
    const key = el.pageSection;
    if (sectionMap.has(key)) {
      findings.push({
        severity: 'warning',
        category: 'duplicate-section',
        message: `Duplicate data-page-section="${key}" found (keeping first occurrence)`,
      });
    } else {
      sectionMap.set(key, {
        section: el.pageSection,
        location: el.pageSectionLocation || '0',
        index: el.idx,
      });
    }
  }

  // ── Sort sections by location ──
  const sortedSections = Array.from(sectionMap.values())
    .sort((a, b) => parseInt(a.location) - parseInt(b.location));

  // ── Build components grouped by parent section ──
  const sectionComponents = new Map<string, RawComponent[]>();
  const orphanedComponents: RawComponent[] = [];

  for (const el of componentEls) {
    const name = cleanAttrValue(el.componentName);
    if (!name) continue;

    const comp: RawComponent = {
      tag: el.tag,
      'data-component-name': name,
      'data-action': cleanAttrValue(el.action),
      parentSection: cleanAttrValue(el.closestSection),
      parentBlock: cleanAttrValue(el.closestBlock),
      index: el.idx,
    };

    if (comp.parentSection) {
      const list = sectionComponents.get(comp.parentSection) || [];
      list.push(comp);
      sectionComponents.set(comp.parentSection, list);
    } else {
      orphanedComponents.push(comp);
    }
  }

  // ── Deduplicate components within each section ──
  function dedupeComponents(comps: RawComponent[]): ParsedSubsection[] {
    const seen = new Set<string>();
    const result: ParsedSubsection[] = [];
    for (const c of comps.sort((a, b) => a.index - b.index)) {
      if (seen.has(c['data-component-name'])) {
        findings.push({
          severity: 'info',
          category: 'duplicate-component',
          message: `Duplicate component "${c['data-component-name']}" in section (keeping first)`,
        });
        continue;
      }
      seen.add(c['data-component-name']);
      const sub: ParsedSubsection = { 'data-component-name': c['data-component-name'] };
      if (c['data-action']) sub['data-action'] = c['data-action'];
      result.push(sub);
    }
    return result;
  }

  // ── Build ParsedSpec ──
  const sections: ParsedSection[] = sortedSections.map((s, idx) => {
    const num = String(idx + 1).padStart(2, '0');
    const comps = sectionComponents.get(s.section) || [];
    const subsections = dedupeComponents(comps);

    const section: ParsedSection = {
      section_number: num,
      section_name: `SECTION_${num}`,
      'data-page-section': s.section,
      'data-page-section-location': String(idx + 1),
    };

    if (subsections.length > 0) {
      section.subsections = subsections;
    }

    return section;
  });

  // ── Log orphaned components ──
  if (orphanedComponents.length > 0) {
    // Deduplicate orphans by component name
    const seenOrphans = new Set<string>();
    const uniqueOrphans: RawComponent[] = [];
    for (const o of orphanedComponents) {
      if (!seenOrphans.has(o['data-component-name'])) {
        seenOrphans.add(o['data-component-name']);
        uniqueOrphans.push(o);
      }
    }

    findings.push({
      severity: 'error',
      category: 'orphaned-components',
      message: `${uniqueOrphans.length} unique component(s) found outside any [data-page-section] container`,
      details: uniqueOrphans.map(o => {
        const action = o['data-action'] ? ` (action: ${o['data-action']})` : '';
        return `  - ${o['data-component-name']}${action} [<${o.tag}>]`;
      }).join('\n'),
    });
  }

  // ── Determine page template ──
  const pageTemplate = cleanAttrValue(pageAttrs['data-page-template']) ||
    guessPageTemplate(url) ||
    'unknown';

  const spec: ParsedSpec = {
    page_template: pageTemplate,
    sections,
  };

  return {
    url,
    timestamp: new Date().toISOString(),
    siteAttrs,
    pageAttrs,
    spec,
    anchors: [], // populated after processRawData by caller
    findings,
  };
}

function guessPageTemplate(url: string): string | null {
  const pathname = new URL(url).pathname.replace(/\/$/, '');
  if (!pathname || pathname === '') return 'homepage';

  const slug = pathname.split('/').pop();
  const mapping: Record<string, string> = {
    'apartments': 'apartments',
    'apartments-and-pricing': 'apartments',
    'features': 'features',
    'amenities': 'amenities',
    'gallery': 'gallery',
    'neighborhood': 'neighborhood',
    'location': 'neighborhood',
    'contact': 'contact',
    'contact-us': 'contact',
    'specials': 'specials',
    'reviews': 'reviews',
    'faqs': 'faqs',
    'faq': 'faqs',
    'about': 'about-venterra',
    'about-venterra': 'about-venterra',
  };

  return mapping[slug || ''] || slug || null;
}
