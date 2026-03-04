/**
 * EXPORTSPEC v1.0 JSON SCHEMA
 * 
 * Strict Zod schema for validating compiled ExportSpec JSON.
 * No additional keys allowed at any level.
 */

import { z } from 'zod';
import * as fs from 'fs';
import * as path from 'path';

// --- Subsection ---
export const SubsectionSchema = z.object({
  'data-component-name': z.string().min(1),
  'data-action': z.string().min(1).optional(),
  'element_label': z.string().min(1).optional(),
}).strict();

// --- Block ---
export const BlockSchema = z.object({
  'block_id': z.string().min(1).optional(),
  'data-sub-section': z.string().min(1).optional(),
  subsections: z.array(SubsectionSchema).min(1),
}).strict();

// --- Section ---
// Sections have EITHER blocks OR subsections (or neither), never both.
const BaseSectionFields = {
  section_number: z.string().regex(/^\d+$/, 'section_number must be digits'),
  section_name: z.string().min(1),
  'data-page-section': z.string(), // may be empty string for sections with no interactive elements
  'data-page-section-location': z.string().min(1),
};

const SectionWithBlocks = z.object({
  ...BaseSectionFields,
  blocks: z.array(BlockSchema).min(1),
}).strict();

const SectionWithSubsections = z.object({
  ...BaseSectionFields,
  subsections: z.array(SubsectionSchema).min(1),
}).strict();

// Some sections have subsections before the first block AND blocks — both coexist.
const SectionWithBoth = z.object({
  ...BaseSectionFields,
  blocks: z.array(BlockSchema).min(1),
  subsections: z.array(SubsectionSchema).min(1),
}).strict();

const SectionBare = z.object({
  ...BaseSectionFields,
}).strict();

export const SectionSchema = z.union([
  SectionWithBoth,
  SectionWithBlocks,
  SectionWithSubsections,
  SectionBare,
]);

// --- Top-level ExportSpec ---
export const ExportSpecSchema = z.object({
  page_template: z.string().min(1),
  sections: z.array(SectionSchema),
}).strict();

// --- Types ---
export type ExportSpec = z.infer<typeof ExportSpecSchema>;

// --- Validation helpers ---

export function validateJSON(json: unknown): { success: true } | { success: false; errors: string[] } {
  const result = ExportSpecSchema.safeParse(json);
  if (result.success) {
    return { success: true };
  }
  const errors = result.error.issues.map(issue => {
    const path = issue.path.join('.');
    return `  ${path}: ${issue.message}`;
  });
  return { success: false, errors };
}

export function validateFile(filePath: string): boolean {
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    const json = JSON.parse(content);
    const result = validateJSON(json);
    if (result.success) {
      console.error(`✓ Valid: ${filePath}`);
      return true;
    } else {
      console.error(`✗ Invalid: ${filePath}`);
      for (const err of result.errors) {
        console.error(err);
      }
      return false;
    }
  } catch (error) {
    console.error(`✗ Error reading ${filePath}: ${error instanceof Error ? error.message : String(error)}`);
    return false;
  }
}

export function validateDir(dirPath: string): boolean {
  const resolvedDir = path.resolve(dirPath);
  
  if (!fs.existsSync(resolvedDir)) {
    console.error(`✗ Directory not found: ${resolvedDir}`);
    return false;
  }
  
  const files = fs.readdirSync(resolvedDir).filter(f => f.endsWith('.json'));
  
  if (files.length === 0) {
    console.error(`✗ No JSON files found in ${resolvedDir}`);
    return false;
  }
  
  let allValid = true;
  for (const file of files) {
    const valid = validateFile(path.join(resolvedDir, file));
    if (!valid) allValid = false;
  }
  
  const total = files.length;
  const passed = files.length - (allValid ? 0 : 1);
  console.error(`\n${allValid ? '✓' : '✗'} Validated ${total} file(s)`);
  
  return allValid;
}
