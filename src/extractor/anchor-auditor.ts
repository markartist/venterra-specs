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

export type AnchorStatus = 'governed' | 'non-compliant' | 'untagged';

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
    invisible: number;
  };
  /** Compliance percentage (governed / visible) */
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

// ── Audit logic ────────────────────────────────────────────────────────────

function auditAnchor(anchor: RawAnchor): AuditedAnchor {
  const violations: AnchorViolation[] = [];
  const componentName = trimAttrValue(anchor['data-component-name']);
  const action = trimAttrValue(anchor['data-action']);

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

  const complianceRate = visible.length > 0
    ? Math.round((governed / visible.length) * 10000) / 100
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
  lines.push(`Governed: ${summary.governed} | Non-Compliant: ${summary.nonCompliant} | Untagged: ${summary.untagged}`);
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

  return lines.join('\n');
}

function truncate(s: string, max: number): string {
  return s.length > max ? s.substring(0, max - 1) + '…' : s;
}
