/**
 * GOVERNED SPEC TXT GENERATOR
 *
 * Reverse of the compiler: takes a ParsedSpec + metadata and emits
 * a governed spec TXT file matching the existing format.
 */

import type { ParsedSpec, ParsedSection, ParsedBlock, ParsedSubsection } from '../compiler/parser';
import type { SiteAttrs, PageAttrs } from './scraper';

export interface TxtGeneratorOptions {
  siteAttrs: SiteAttrs;
  pageAttrs: PageAttrs;
  contractId?: string;
  exportHash?: string;
}

export function generateGovernedTxt(spec: ParsedSpec, options: TxtGeneratorOptions): string {
  const lines: string[] = [];
  const now = new Date();
  const timestamp = now.toLocaleDateString('en-US', {
    month: 'long', day: 'numeric', year: 'numeric',
  }) + ' at ' + now.toLocaleTimeString('en-US', {
    hour: 'numeric', minute: '2-digit', second: '2-digit', hour12: true,
  });

  const contractId = options.contractId || `ARCH-${spec.page_template.toUpperCase().replace(/-/g, '_')}-V1`;
  const exportHash = options.exportHash || 'EXTRACTED';

  // ── Header ──
  lines.push('Venterra Governed Spec Contract');
  lines.push('Spec Version: v1.0');
  lines.push('Export Format: ExportSpec v1.0');
  lines.push('Mode: Page');
  lines.push(`Target: ${spec.page_template}`);
  lines.push(`Build Timestamp (Central Time): ${timestamp}`);
  lines.push(`Contract ID: ${contractId}`);
  lines.push(`Export Hash: ${exportHash}`);
  lines.push('');

  // ── Site-level attributes ──
  lines.push('================================================================================');
  lines.push('SITE-LEVEL ATTRIBUTES (Place on <body> tag)(Use Heap Functions to call the below)');
  lines.push('================================================================================');
  lines.push('');
  lines.push(`data-property-name="${options.siteAttrs['data-property-name'] || ''}"`);
  lines.push(`data-property-code="${options.siteAttrs['data-property-code'] || ''}"`);
  lines.push(`data-site-archetype="${options.siteAttrs['data-site-archetype'] || 'property_marketing_v1'}"`);
  lines.push(`data-site-page-template="${options.siteAttrs['data-site-page-template'] || ''}"`);
  lines.push(`data-site-page-template-version="${options.siteAttrs['data-site-page-template-version'] || ''}"`);
  lines.push(`data-site-same-store-date="${options.siteAttrs['data-site-same-store-date'] || ''}"`);
  lines.push('');

  // ── Page-level attributes ──
  lines.push('================================================================================');
  lines.push('PAGE-LEVEL ATTRIBUTES (Place on main page container)(Use Heap Functions to call the below)');
  lines.push('================================================================================');
  lines.push('');
  lines.push(`data-page-template="${spec.page_template}"`);
  lines.push(`data-page-template-version="${options.pageAttrs['data-page-template-version'] || '1.0'}"`);
  lines.push('data-banner="[]" # populate if a banner is loaded');
  lines.push('');

  // ── Interactive elements ──
  lines.push('================================================================================');
  lines.push('INTERACTIVE ELEMENTS (CTAs, Buttons, Links)');
  lines.push('================================================================================');
  lines.push('');

  let totalBlocks = 0;
  let totalSubsections = 0;

  for (let i = 0; i < spec.sections.length; i++) {
    const section = spec.sections[i];
    const sectionNum = section.section_number;
    const sectionLabel = `SECTION_${sectionNum}_${section['data-page-section'].toUpperCase()}`;

    lines.push(`section_${sectionNum}: ${sectionLabel}`);
    lines.push(`data-page-section = "${section['data-page-section']}"`);
    lines.push(`data-page-section-location = "${section['data-page-section-location']}"`);
    lines.push('');

    // Blocks
    if (section.blocks) {
      for (const block of section.blocks) {
        totalBlocks++;
        if (block.block_id) {
          lines.push(`Block: ${block.block_id}`);
        }
        if (block['data-sub-section']) {
          lines.push(`data-sub-section = "${block['data-sub-section']}"`);
        }
        lines.push('');

        for (const sub of block.subsections) {
          totalSubsections++;
          lines.push(`Subsection: ${sub['data-component-name']}`);
          lines.push(`data-component-name = "${sub['data-component-name']}"`);
          if (sub['data-action']) {
            lines.push(`data-action = "${sub['data-action']}"`);
          }
          lines.push('');
        }
      }
    }

    // Direct subsections (no blocks)
    if (section.subsections) {
      for (const sub of section.subsections) {
        totalSubsections++;
        lines.push(`Subsection: ${sub['data-component-name']}`);
        lines.push(`data-component-name = "${sub['data-component-name']}"`);
        if (sub['data-action']) {
          lines.push(`data-action = "${sub['data-action']}"`);
        }
        lines.push('');
      }
    }

    // Section separator (except after last section)
    if (i < spec.sections.length - 1) {
      lines.push('---------------------------');
      lines.push('');
    }
  }

  // ── Footer ──
  lines.push('================================================================================');
  lines.push('END OF VENTERRA GOVERNED SPEC CONTRACT');
  lines.push('================================================================================');
  lines.push('');
  lines.push(`Contract ID: ${contractId}`);
  lines.push(`Export Hash: ${exportHash}`);
  lines.push(`Generated: ${now.toLocaleDateString('en-US')}, ${now.toLocaleTimeString('en-US')}`);
  lines.push(`Total Sections: ${spec.sections.length}`);
  lines.push(`Total Blocks: ${totalBlocks}`);
  lines.push(`Total Subsections: ${totalSubsections}`);
  lines.push('Modified Elements: 0');
  lines.push('');

  return lines.join('\n');
}
