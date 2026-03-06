/**
 * POST /api/audit
 *
 * Accepts { url: string }, launches a headless browser via Cloudflare Browser
 * Rendering, extracts all <a> tags with governance context, and returns an
 * AnchorAuditResult.
 */

import puppeteer from '@cloudflare/puppeteer';

interface Env {
  BROWSER: any; // Browser Rendering binding
}

const JSON_HEADERS = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
};

// ── Browser-side scripts (plain JS strings for page.evaluate) ──────────────

const SCROLL_REVEAL_SCRIPT = `(async function() {
  var delay = function(ms) { return new Promise(function(r) { setTimeout(r, ms); }); };
  var scrollHeight = document.body.scrollHeight;
  var viewportHeight = window.innerHeight;
  var step = Math.floor(viewportHeight * 0.7);
  for (var y = 0; y < scrollHeight; y += step) {
    window.scrollTo({ top: y, behavior: 'instant' });
    await delay(250);
  }
  window.scrollTo({ top: scrollHeight, behavior: 'instant' });
  await delay(400);
  window.scrollTo({ top: 0, behavior: 'instant' });
  await delay(200);
})()`;

const FORCE_VISIBLE_CSS = [
  '*, *::before, *::after {',
  '  animation-delay: 0s !important;',
  '  animation-duration: 0s !important;',
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
    if (parseFloat(style.opacity) < 0.1) els[i].style.opacity = '1';
    if (style.visibility === 'hidden') els[i].style.visibility = 'visible';
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
    var structuralRegion = null;
    var structEl = el.closest('header, nav, footer, aside, main, [role="banner"], [role="navigation"], [role="contentinfo"], [role="complementary"]');
    if (structEl) {
      var tag = structEl.tagName.toLowerCase();
      if (tag === 'div' || tag === 'section') {
        var role = structEl.getAttribute('role');
        structuralRegion = role || null;
      } else {
        structuralRegion = tag;
      }
    }
    results.push({
      href: el.getAttribute('href') || '',
      text: (el.textContent || '').trim().substring(0, 200),
      'data-component-name': el.getAttribute('data-component-name'),
      'data-action': el.getAttribute('data-action'),
      parentSection: closestSection ? closestSection.getAttribute('data-page-section') : null,
      parentBlock: closestBlock ? closestBlock.getAttribute('data-sub-section') : null,
      structuralRegion: structuralRegion,
      governance: el.getAttribute('data-governance'),
      classes: el.className || '',
      id: el.id || null,
      isVisible: isVisible,
      index: i
    });
  }
  return results;
})()`;

// ── Audit logic (same as anchor-auditor.ts, inlined for Worker context) ────

const SNAKE_CASE_RE = /^[a-z][a-z0-9_]*$/;
const VALID_ACTION_PREFIXES = [
  'navigate_', 'open_', 'show_', 'submit_', 'apply_', 'initiate_',
];
const VALID_STRUCTURAL_REGIONS = new Set([
  'header', 'nav', 'footer', 'aside', 'main',
  'banner', 'navigation', 'contentinfo', 'complementary',
]);

function trimAttrValue(val: string | null): string | null {
  if (!val) return null;
  return val.replace(/^[\s"']+|[\s"']+$/g, '').trim() || null;
}

interface RawAnchor {
  href: string;
  text: string;
  'data-component-name': string | null;
  'data-action': string | null;
  parentSection: string | null;
  parentBlock: string | null;
  structuralRegion: string | null;
  governance: string | null;
  classes: string;
  id: string | null;
  isVisible: boolean;
  index: number;
}

interface AnchorViolation {
  rule: string;
  message: string;
}

const THIRD_PARTY_DOMAINS = [
  'maps.google.com', 'www.google.com/maps', 'google.com/intl',
  'maps.googleapis.com',
];
const UI_CONTROL_CLASS_PATTERNS = [
  'uk-slidenav', 'uk-navbar-toggle', 'uk-totop', 'uk-icon',
  'slick-arrow', 'swiper-button', 'carousel-control',
];

function isExemptAnchor(anchor: RawAnchor): string | null {
  if (anchor.governance === 'exempt') return 'explicit-exempt';
  const href = (anchor.href || '').trim();
  const text = (anchor.text || '').trim();
  const classes = anchor.classes || '';
  if (href.startsWith('#tm-main') || href.startsWith('#main') || /skip.*(content|nav)/i.test(text)) return 'skip-link';
  if (!href && !text && !anchor['data-component-name']) return 'empty-placeholder';
  if ((href === '#' || href === '') && !text && !anchor['data-component-name']) return 'ui-control';
  if (UI_CONTROL_CLASS_PATTERNS.some(p => classes.includes(p)) && !anchor['data-component-name']) return 'ui-control';
  if (THIRD_PARTY_DOMAINS.some(d => href.includes(d))) return 'third-party-embed';
  if (/^#tm-dialog/.test(href) && !anchor['data-component-name']) return 'ui-control';
  return null;
}

interface AuditedAnchor {
  anchor: RawAnchor;
  status: 'governed' | 'non-compliant' | 'untagged' | 'exempt';
  violations: AnchorViolation[];
}

function auditAnchor(anchor: RawAnchor): AuditedAnchor {
  const violations: AnchorViolation[] = [];
  const componentName = trimAttrValue(anchor['data-component-name']);
  const action = trimAttrValue(anchor['data-action']);

  const exemptReason = isExemptAnchor(anchor);
  if (exemptReason) {
    return { anchor, status: 'exempt', violations: [{ rule: 'exempt', message: exemptReason }] };
  }

  if (!componentName && !action) {
    return { anchor, status: 'untagged', violations: [] };
  }

  if (!componentName) {
    violations.push({ rule: 'missing-component-name', message: 'Has data-action but no data-component-name' });
  }
  if (componentName && !SNAKE_CASE_RE.test(componentName)) {
    violations.push({ rule: 'invalid-component-name', message: `"${componentName}" is not valid snake_case` });
  }
  if (action) {
    if (!VALID_ACTION_PREFIXES.some(p => action.startsWith(p))) {
      violations.push({ rule: 'invalid-action-prefix', message: `"${action}" does not use a known prefix` });
    }
    if (!SNAKE_CASE_RE.test(action)) {
      violations.push({ rule: 'invalid-action-format', message: `"${action}" is not valid snake_case` });
    }
  }
  if (!anchor.parentSection) {
    const region = anchor.structuralRegion;
    if (!region || !VALID_STRUCTURAL_REGIONS.has(region)) {
      violations.push({ rule: 'orphaned-anchor', message: 'Not inside any [data-page-section] or structural region (header/nav/footer)' });
    }
  }

  return { anchor, status: violations.length === 0 ? 'governed' : 'non-compliant', violations };
}

function auditAnchors(anchors: RawAnchor[], url: string) {
  const audited = anchors.map(auditAnchor);
  const visible = audited.filter(a => a.anchor.isVisible);
  const invisible = audited.filter(a => !a.anchor.isVisible);

  const governed = visible.filter(a => a.status === 'governed').length;
  const nonCompliant = visible.filter(a => a.status === 'non-compliant').length;
  const untagged = visible.filter(a => a.status === 'untagged').length;
  const exempt = visible.filter(a => a.status === 'exempt').length;
  const auditEligible = visible.length - exempt;
  const complianceRate = auditEligible > 0
    ? Math.round((governed / auditEligible) * 10000) / 100
    : 0;

  return {
    url,
    timestamp: new Date().toISOString(),
    totalAnchors: anchors.length,
    visibleAnchors: visible.length,
    summary: { governed, nonCompliant, untagged, exempt, invisible: invisible.length },
    complianceRate,
    anchors: audited,
  };
}

// ── Request handler ────────────────────────────────────────────────────────

export const onRequestPost: PagesFunction<Env> = async (context) => {
  try {
    const body = await context.request.json() as { url?: string };

    if (!body.url) {
      return new Response(JSON.stringify({ error: 'url is required' }), {
        status: 400, headers: JSON_HEADERS,
      });
    }

    // Validate URL
    let targetUrl: URL;
    try {
      targetUrl = new URL(body.url);
    } catch {
      return new Response(JSON.stringify({ error: 'Invalid URL' }), {
        status: 400, headers: JSON_HEADERS,
      });
    }

    // Launch browser via Cloudflare Browser Rendering
    const browser = await puppeteer.launch(context.env.BROWSER);
    const page = await browser.newPage();

    await page.setViewport({ width: 1440, height: 900 });
    await page.goto(targetUrl.href, { waitUntil: 'networkidle0', timeout: 45000 });
    await new Promise(r => setTimeout(r, 800));

    // Scroll to trigger reveals
    await page.evaluate(SCROLL_REVEAL_SCRIPT);

    // Force visibility
    await page.addStyleTag({ content: FORCE_VISIBLE_CSS });
    await page.evaluate(FORCE_VISIBLE_SCRIPT);
    await new Promise(r => setTimeout(r, 300));

    // Extract all <a> tags
    const anchors: RawAnchor[] = await page.evaluate(EXTRACT_ANCHORS_SCRIPT);

    await browser.close();

    // Run audit
    const result = auditAnchors(anchors, targetUrl.href);

    return new Response(JSON.stringify(result), { headers: JSON_HEADERS });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Audit failed';
    return new Response(JSON.stringify({ error: message }), {
      status: 500, headers: JSON_HEADERS,
    });
  }
};

// Handle CORS preflight
export const onRequestOptions: PagesFunction = async () => {
  return new Response(null, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
};
