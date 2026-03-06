/**
 * ANCHOR TAG AUDITOR
 *
 * Evaluates all <a> tags on a page for governance compliance:
 * - GOVERNED: has data-component-name + passes all naming rules
 * - NON-COMPLIANT: has some governance attrs but naming/structure is wrong
 * - UNTAGGED: no governance attributes at all
 */

import type { RawAnchor } from './scraper';

// ── Naming convention rules ────────────────────────────────────────────────

/** Component names must be lowercase snake_case (letters, digits, underscores) */
const SNAKE_CASE_RE = /^[a-z][a-z0-9_]*$/;

/** Known action prefixes from the governed taxonomy */
const VALID_ACTION_PREFIXES = [
  'navigate_',
  'open_',
  'show_',
  'submit_',
  'apply_',
  'initiate_',
] as const;

// ── Types ──────────────────────────────────────────────────────────────────

export type AnchorStatus = 'governed' | 'non-compliant' | 'untagged' | 'exempt';

export interface AnchorViolation {
  rule: string;
  message: string;
}

export interface AuditedAnchor {
  /** Raw anchor data */
  anchor: RawAnchor;
  /** Compliance status */
  status: AnchorStatus;
  /** Violations (empty for governed, populated for non-compliant) */
  violations: AnchorViolation[];
}

export interface AnchorAuditResult {
  url: string;
  timestamp: string;
  pageTemplate: string;
  /** Total <a> tags found on page */
  totalAnchors: number;
  /** Visible <a> tags (invisible ones excluded from compliance counts) */
  visibleAnchors: number;
  /** Counts by status */
  summary: {
    governed: number;
    nonCompliant: number;
    untagged: number;
    exempt: number;
    invisible: number;
  };
  /** Compliance percentage: governed / (visible - exempt) */
  complianceRate: number;
  /** All audited anchors */
  anchors: AuditedAnchor[];
}

/** Known structural regions that serve as valid section contexts */
const VALID_STRUCTURAL_REGIONS = new Set([
  'header', 'nav', 'footer', 'aside', 'main',
  'banner', 'navigation', 'contentinfo', 'complementary',
]);

/**
 * Auto-trim attribute values that may contain embedded quotes/spaces
 * from CMS copy-paste (e.g. ' "cta_schedule_tour"' → 'cta_schedule_tour')
 */
function trimAttrValue(val: string | null): string | null {
  if (!val) return null;
  return val.replace(/^[\s"']+|[\s"']+$/g, '').trim() || null;
}

// ── Exempt detection ───────────────────────────────────────────────────────

/** Third-party domains whose anchors are outside our governance scope */
const THIRD_PARTY_DOMAINS = [
  'maps.google.com', 'www.google.com/maps', 'google.com/intl',
  'maps.googleapis.com',
];

/** CSS class patterns that indicate UI/framework controls */
const UI_CONTROL_CLASS_PATTERNS = [
  'uk-slidenav', 'uk-navbar-toggle', 'uk-totop', 'uk-icon',
  'slick-arrow', 'swiper-button', 'carousel-control',
];

/**
 * Detect anchors that are decorative, UI controls, or third-party embeds
 * and should be excluded from the compliance denominator.
 */
function isExemptAnchor(anchor: RawAnchor): string | null {
  // Explicit opt-out via data-governance="exempt"
  if (anchor.governance === 'exempt') return 'explicit-exempt';

  const href = (anchor.href || '').trim();
  const text = (anchor.text || '').trim();
  const classes = anchor.classes || '';

  // Skip-to-content links
  if (href.startsWith('#tm-main') || href.startsWith('#main') || /skip.*(content|nav)/i.test(text)) {
    return 'skip-link';
  }

  // Empty placeholder anchors (no href, no text, no governance attrs)
  if (!href && !text && !anchor['data-component-name']) return 'empty-placeholder';

  // Anchors with href="#" or empty href and no text — UI controls (carousel arrows, etc.)
  if ((href === '#' || href === '') && !text && !anchor['data-component-name']) {
    return 'ui-control';
  }

  // Framework UI control classes
  if (UI_CONTROL_CLASS_PATTERNS.some(p => classes.includes(p)) && !anchor['data-component-name']) {
    return 'ui-control';
  }

  // Third-party embed links (Google Maps, etc.)
  if (THIRD_PARTY_DOMAINS.some(d => href.includes(d))) return 'third-party-embed';

  // Hamburger/mobile menu toggle (common: href to dialog/offcanvas)
  if (/^#tm-dialog/.test(href) && !anchor['data-component-name']) return 'ui-control';

  return null;
}

// ── Audit logic ────────────────────────────────────────────────────────────

function auditAnchor(anchor: RawAnchor): AuditedAnchor {
  const violations: AnchorViolation[] = [];
  const componentName = trimAttrValue(anchor['data-component-name']);
  const action = trimAttrValue(anchor['data-action']);

  // Check if anchor is exempt (decorative/UI/third-party)
  const exemptReason = isExemptAnchor(anchor);
  if (exemptReason) {
    return { anchor, status: 'exempt', violations: [{ rule: 'exempt', message: exemptReason }] };
  }

  // If no governance attributes at all → untagged
  if (!componentName && !action) {
    return { anchor, status: 'untagged', violations: [] };
  }

  // Has at least one governance attr → check compliance

  // Rule 1: Must have data-component-name
  if (!componentName) {
    violations.push({
      rule: 'missing-component-name',
      message: 'Has data-action but no data-component-name',
    });
  }

  // Rule 2: Component name must be snake_case
  if (componentName && !SNAKE_CASE_RE.test(componentName)) {
    violations.push({
      rule: 'invalid-component-name',
      message: `Component name "${componentName}" is not valid snake_case`,
    });
  }

  // Rule 3: If data-action is present, it must use a known prefix
  if (action) {
    const hasValidPrefix = VALID_ACTION_PREFIXES.some(p => action.startsWith(p));
    if (!hasValidPrefix) {
      violations.push({
        rule: 'invalid-action-prefix',
        message: `Action "${action}" does not use a known prefix (${VALID_ACTION_PREFIXES.join(', ')})`,
      });
    }
    // Action must also be snake_case
    if (!SNAKE_CASE_RE.test(action)) {
      violations.push({
        rule: 'invalid-action-format',
        message: `Action "${action}" is not valid snake_case`,
      });
    }
  }

  // Rule 4: Should be inside a data-page-section OR a known structural region
  if (!anchor.parentSection) {
    const region = anchor.structuralRegion;
    if (region && VALID_STRUCTURAL_REGIONS.has(region)) {
      // Anchor is in a known structural region (header, nav, footer, etc.)
      // This is acceptable — not orphaned
    } else {
      violations.push({
        rule: 'orphaned-anchor',
        message: 'Tagged anchor is not inside any [data-page-section] or structural region (header/nav/footer)',
      });
    }
  }

  const status: AnchorStatus = violations.length === 0 ? 'governed' : 'non-compliant';
  return { anchor, status, violations };
}

export function auditAnchors(
  anchors: RawAnchor[],
  url: string,
  pageTemplate: string,
): AnchorAuditResult {
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
    pageTemplate,
    totalAnchors: anchors.length,
    visibleAnchors: visible.length,
    summary: {
      governed,
      nonCompliant,
      untagged,
      exempt,
      invisible: invisible.length,
    },
    complianceRate,
    anchors: audited,
  };
}

// ── Report formatting ──────────────────────────────────────────────────────

export function formatAnchorAuditReport(result: AnchorAuditResult): string {
  const lines: string[] = [];
  const { summary } = result;

  lines.push(`# Anchor Tag Audit: ${result.pageTemplate}`);
  lines.push(`URL: ${result.url}`);
  lines.push(`Date: ${result.timestamp}`);
  lines.push('');
  lines.push('## Summary');
  lines.push(`Total <a> tags: ${result.totalAnchors}`);
  lines.push(`Visible: ${result.visibleAnchors} | Invisible: ${summary.invisible}`);
  lines.push(`Governed: ${summary.governed} | Non-Compliant: ${summary.nonCompliant} | Untagged: ${summary.untagged} | Exempt: ${summary.exempt}`);
  lines.push(`Audit-eligible: ${result.visibleAnchors - summary.exempt} (visible minus exempt)`);
  lines.push(`**Compliance Rate: ${result.complianceRate}%**`);
  lines.push('');

  // Non-compliant anchors (most actionable)
  const nonCompliant = result.anchors.filter(a => a.status === 'non-compliant' && a.anchor.isVisible);
  if (nonCompliant.length > 0) {
    lines.push('## Non-Compliant Anchors');
    lines.push('These anchors have governance attributes but fail one or more rules.');
    lines.push('');
    for (const item of nonCompliant) {
      const a = item.anchor;
      const label = a.text || a.href || '(empty)';
      lines.push(`### ${a['data-component-name'] || '(no name)'} — "${truncate(label, 60)}"`);
      lines.push(`- href: ${a.href || '(none)'}`);
      const section = a.parentSection || (a.structuralRegion ? `site:${a.structuralRegion}` : '(orphaned)');
      lines.push(`- section: ${section}`);
      if (a['data-component-name']) lines.push(`- component: ${a['data-component-name']}`);
      if (a['data-action']) lines.push(`- action: ${a['data-action']}`);
      lines.push(`- Violations:`);
      for (const v of item.violations) {
        lines.push(`  - **[${v.rule}]** ${v.message}`);
      }
      lines.push('');
    }
  }

  // Untagged anchors
  const untagged = result.anchors.filter(a => a.status === 'untagged' && a.anchor.isVisible);
  if (untagged.length > 0) {
    lines.push('## Untagged Anchors');
    lines.push('These visible <a> tags have no governance attributes.');
    lines.push('');

    // Group by parent section for readability
    const bySection = new Map<string, AuditedAnchor[]>();
    for (const item of untagged) {
      const key = item.anchor.parentSection || '(no section)';
      const list = bySection.get(key) || [];
      list.push(item);
      bySection.set(key, list);
    }

    for (const [section, items] of bySection) {
      lines.push(`### Section: ${section}`);
      for (const item of items) {
        const a = item.anchor;
        const label = a.text || '(no text)';
        lines.push(`- "${truncate(label, 60)}" → ${a.href || '(no href)'}`);
      }
      lines.push('');
    }
  }

  // Governed anchors (brief summary)
  const governed = result.anchors.filter(a => a.status === 'governed' && a.anchor.isVisible);
  if (governed.length > 0) {
    lines.push('## Governed Anchors');
    lines.push(`${governed.length} anchor(s) fully compliant.`);
    lines.push('');
    for (const item of governed) {
      const a = item.anchor;
      const region = a.parentSection || (a.structuralRegion ? `site:${a.structuralRegion}` : 'orphaned');
      lines.push(`- ✓ **${a['data-component-name']}** → ${a['data-action'] || '(no action)'} [${region}]`);
    }
    lines.push('');
  }

  // Exempt anchors
  const exemptAnchors = result.anchors.filter(a => a.status === 'exempt' && a.anchor.isVisible);
  if (exemptAnchors.length > 0) {
    lines.push('## Exempt Anchors');
    lines.push(`${exemptAnchors.length} anchor(s) excluded from compliance (UI controls, skip links, third-party embeds).`);
    lines.push('');
    for (const item of exemptAnchors) {
      const a = item.anchor;
      const label = a.text || a.href || '(empty)';
      const reason = item.violations[0]?.message || 'exempt';
      lines.push(`- \`${reason}\` — "${truncate(label, 50)}" → ${a.href || '(no href)'}`);
    }
    lines.push('');
  }

  return lines.join('\n');
}

function truncate(s: string, max: number): string {
  return s.length > max ? s.substring(0, max - 1) + '…' : s;
}
