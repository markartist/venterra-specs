import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { parseGovernedSpec } from '../parser';
import { emitExportSpecJSON } from '../emitter';
import { validateJSON } from '../schema';

const SPECS_DIR = path.resolve(__dirname, '../../../specs');

// Collect all governed spec TXT files
const specFiles = fs.readdirSync(SPECS_DIR)
  .filter(f => f.endsWith('_governed_spec.txt') || f.endsWith('_governed_spec_new.txt'))
  .sort();

describe('Compiler: snapshot tests', () => {
  it.each(specFiles)('compiles %s to expected JSON', (file) => {
    const content = fs.readFileSync(path.join(SPECS_DIR, file), 'utf-8');
    const parsed = parseGovernedSpec(content);
    const json = emitExportSpecJSON(parsed);
    expect(json).toMatchSnapshot();
  });
});

describe('Compiler: schema validation', () => {
  it.each(specFiles)('output of %s passes ExportSpec schema', (file) => {
    const content = fs.readFileSync(path.join(SPECS_DIR, file), 'utf-8');
    const parsed = parseGovernedSpec(content);
    const json = emitExportSpecJSON(parsed);
    const result = validateJSON(JSON.parse(json));
    expect(result.success).toBe(true);
  });
});

describe('Compiler: determinism', () => {
  it.each(specFiles)('produces identical output on repeated compilation of %s', (file) => {
    const content = fs.readFileSync(path.join(SPECS_DIR, file), 'utf-8');
    const run1 = emitExportSpecJSON(parseGovernedSpec(content));
    const run2 = emitExportSpecJSON(parseGovernedSpec(content));
    expect(run1).toBe(run2);
  });
});

describe('Compiler: error handling', () => {
  it('returns empty sections for empty input', () => {
    const parsed = parseGovernedSpec('');
    expect(parsed.page_template).toBe('');
    expect(parsed.sections).toEqual([]);
  });

  it('returns empty sections when no INTERACTIVE ELEMENTS marker exists', () => {
    const input = 'Target: test_page\nSome random content\n';
    const parsed = parseGovernedSpec(input);
    expect(parsed.page_template).toBe('test_page');
    expect(parsed.sections).toEqual([]);
  });

  it('extracts page_template from Target line', () => {
    const input = 'Target: my_page\n';
    const parsed = parseGovernedSpec(input);
    expect(parsed.page_template).toBe('my_page');
  });
});
