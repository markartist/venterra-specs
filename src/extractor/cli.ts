#!/usr/bin/env node
/**
 * SPEC EXTRACTOR CLI
 *
 * Extract governance specs from live web pages.
 */

import * as fs from 'fs';
import * as path from 'path';
import { extractPage } from './scraper';
import { generateGovernedTxt } from './txt-generator';
import { emitExportSpecJSON } from '../compiler/emitter';
import { validateJSON } from '../compiler/schema';
import type { AuditFinding } from './scraper';

// ── Default page paths for property_marketing_v1 archetype ──

const DEFAULT_PAGE_PATHS: Record<string, string> = {
  'homepage': '/',
  'apartments': '/apartments/',
  'features': '/features/',
  'amenities': '/amenities/',
  'gallery': '/gallery/',
  'neighborhood': '/neighborhood/',
  'contact': '/contact/',
  'specials': '/specials/',
  'reviews': '/reviews/',
  'faqs': '/faqs/',
  'about-venterra': '/about/',
};

function showHelp() {
  console.log(`
Spec Extractor v1.0
Extract governance specs from live web pages.

USAGE:
  extract --url <url> --out-dir <dir>
  extract-all --base-url <url> --out-dir <dir> [--pages <list>]

COMMANDS:
  extract       Extract spec from a single page URL
  extract-all   Extract specs from all archetype pages

OPTIONS:
  --url <url>           Page URL to extract
  --base-url <url>      Base URL (e.g. https://example.com)
  --out-dir <dir>       Output directory for generated files
  --pages <list>        Comma-separated page templates (default: all)
  --help                Show this help

EXAMPLES:
  extract --url https://example.com/ --out-dir ./extracted
  extract-all --base-url https://example.com --out-dir ./extracted
  extract-all --base-url https://example.com --out-dir ./extracted --pages homepage,amenities
  `);
}

function formatFindings(findings: AuditFinding[]): string {
  const lines: string[] = ['# Extraction Audit Report', ''];

  const errors = findings.filter(f => f.severity === 'error');
  const warnings = findings.filter(f => f.severity === 'warning');
  const infos = findings.filter(f => f.severity === 'info');

  lines.push(`## Summary: ${errors.length} error(s), ${warnings.length} warning(s), ${infos.length} info(s)`);
  lines.push('');

  if (errors.length > 0) {
    lines.push('## Errors');
    for (const f of errors) {
      lines.push(`- **[${f.category}]** ${f.message}`);
      if (f.details) lines.push(f.details);
    }
    lines.push('');
  }

  if (warnings.length > 0) {
    lines.push('## Warnings');
    for (const f of warnings) {
      lines.push(`- **[${f.category}]** ${f.message}`);
      if (f.details) lines.push(f.details);
    }
    lines.push('');
  }

  if (infos.length > 0) {
    lines.push('## Info');
    for (const f of infos) {
      lines.push(`- **[${f.category}]** ${f.message}`);
    }
    lines.push('');
  }

  return lines.join('\n');
}

async function extractSingle(url: string, outDir: string) {
  console.error(`\n🔍 Extracting: ${url}`);

  const { result, screenshot } = await extractPage(url);
  const pageTemplate = result.spec.page_template;

  // Ensure output directory
  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }

  // 1. ExportSpec JSON
  const json = emitExportSpecJSON(result.spec);
  const jsonPath = path.join(outDir, `${pageTemplate}.json`);
  fs.writeFileSync(jsonPath, json, 'utf-8');
  console.error(`  ✓ JSON: ${jsonPath}`);

  // 2. Validate JSON
  const validation = validateJSON(JSON.parse(json));
  if (validation.success) {
    console.error(`  ✓ Schema validation passed`);
  } else {
    console.error(`  ✗ Schema validation failed:`);
    for (const err of validation.errors) {
      console.error(`    ${err}`);
    }
  }

  // 3. Governed TXT
  const txt = generateGovernedTxt(result.spec, {
    siteAttrs: result.siteAttrs,
    pageAttrs: result.pageAttrs,
  });
  const txtPath = path.join(outDir, `${pageTemplate}_governed_spec_new.txt`);
  fs.writeFileSync(txtPath, txt, 'utf-8');
  console.error(`  ✓ TXT: ${txtPath}`);

  // 4. Screenshot
  const screenshotPath = path.join(outDir, `${pageTemplate}.png`);
  fs.writeFileSync(screenshotPath, screenshot);
  console.error(`  ✓ Screenshot: ${screenshotPath}`);

  // 5. Audit report
  const report = formatFindings(result.findings);
  const reportPath = path.join(outDir, `${pageTemplate}_audit.md`);
  fs.writeFileSync(reportPath, report, 'utf-8');
  const errors = result.findings.filter(f => f.severity === 'error').length;
  const warnings = result.findings.filter(f => f.severity === 'warning').length;
  console.error(`  ✓ Audit: ${reportPath} (${errors} errors, ${warnings} warnings)`);

  return result;
}

async function extractAll(baseUrl: string, outDir: string, pageFilter?: string[]) {
  const pages = pageFilter || Object.keys(DEFAULT_PAGE_PATHS);
  const base = baseUrl.replace(/\/$/, '');

  console.error(`\n📦 Extracting ${pages.length} page(s) from ${base}`);

  let successCount = 0;
  let failCount = 0;

  for (const page of pages) {
    const pagePath = DEFAULT_PAGE_PATHS[page];
    if (!pagePath) {
      console.error(`  ✗ Unknown page template: ${page}`);
      failCount++;
      continue;
    }

    const url = base + pagePath;
    try {
      await extractSingle(url, outDir);
      successCount++;
    } catch (error) {
      console.error(`  ✗ Failed: ${url}`);
      console.error(`    ${error instanceof Error ? error.message : String(error)}`);
      failCount++;
    }
  }

  console.error(`\n✓ Extracted ${successCount} page(s)`);
  if (failCount > 0) {
    console.error(`✗ Failed ${failCount} page(s)`);
  }

  return failCount === 0;
}

// ── Main ──

const args = process.argv.slice(2);

if (args.length === 0 || args.includes('--help')) {
  showHelp();
  process.exit(0);
}

if (args[0] === 'extract') {
  const urlIdx = args.indexOf('--url');
  const outIdx = args.indexOf('--out-dir');

  if (urlIdx === -1 || !args[urlIdx + 1]) {
    console.error('✗ --url required');
    process.exit(1);
  }
  if (outIdx === -1 || !args[outIdx + 1]) {
    console.error('✗ --out-dir required');
    process.exit(1);
  }

  extractSingle(args[urlIdx + 1], args[outIdx + 1])
    .then(() => process.exit(0))
    .catch(err => {
      console.error(`✗ ${err.message}`);
      process.exit(1);
    });

} else if (args[0] === 'extract-all') {
  const baseIdx = args.indexOf('--base-url');
  const outIdx = args.indexOf('--out-dir');
  const pagesIdx = args.indexOf('--pages');

  if (baseIdx === -1 || !args[baseIdx + 1]) {
    console.error('✗ --base-url required');
    process.exit(1);
  }
  if (outIdx === -1 || !args[outIdx + 1]) {
    console.error('✗ --out-dir required');
    process.exit(1);
  }

  const pageFilter = pagesIdx !== -1 && args[pagesIdx + 1]
    ? args[pagesIdx + 1].split(',').map(s => s.trim())
    : undefined;

  extractAll(args[baseIdx + 1], args[outIdx + 1], pageFilter)
    .then(success => process.exit(success ? 0 : 1))
    .catch(err => {
      console.error(`✗ ${err.message}`);
      process.exit(1);
    });

} else {
  console.error(`✗ Unknown command: ${args[0]}`);
  showHelp();
  process.exit(1);
}
