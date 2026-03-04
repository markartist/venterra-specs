#!/usr/bin/env node
/**
 * EXPORTSPEC COMPILER CLI
 * 
 * Deterministic contract compiler: TXT A files → ExportSpec v1.0 JSON
 */

import * as fs from 'fs';
import * as path from 'path';
import { parseGovernedSpec } from './parser';
import { emitExportSpecJSON } from './emitter';

function showHelp() {
  console.log(`
ExportSpec Compiler v1.0
Deterministic contract compiler: Governed Spec TXT → ExportSpec JSON

USAGE:
  compile-spec <input.txt> --out <output.json>
  compile-spec <input.txt>                         # outputs to stdout
  compile-all --out-dir <directory>                # compiles all *_governed_spec.txt
  validate --dir <directory>                       # validates compiled JSON

EXAMPLES:
  compile-spec homepage_governed_spec.txt --out homepage.json
  compile-spec homepage_governed_spec.txt > homepage.json
  compile-all --out-dir ./dist/specs
  compile-all --out-dir ./dist/specs --spec-dir ./specs
  validate --dir ./compiled-specs

OPTIONS:
  --out <file>       Output file (default: stdout)
  --out-dir <dir>    Output directory for compile-all
  --spec-dir <dir>   Source directory for spec TXT files (default: ./specs)
  --help             Show this help
  `);
}

function compileSpec(inputPath: string, outputPath?: string) {
  try {
    // Read input file
    const content = fs.readFileSync(inputPath, 'utf-8');
    
    // Parse
    const parsed = parseGovernedSpec(content);
    
    // Emit JSON
    const json = emitExportSpecJSON(parsed);
    
    // Output
    if (outputPath) {
      fs.writeFileSync(outputPath, json, 'utf-8');
      console.error(`✓ Compiled: ${inputPath} → ${outputPath}`);
    } else {
      console.log(json);
    }
    
    return true;
  } catch (error) {
    console.error(`✗ Error compiling ${inputPath}:`);
    console.error(error instanceof Error ? error.message : String(error));
    return false;
  }
}

function compileAll(outputDir: string, specDir: string = './specs') {
  try {
    // Find all *_governed_spec.txt files in spec directory
    const resolvedSpecDir = path.resolve(specDir);
    const files = fs.readdirSync(resolvedSpecDir)
      .filter(f => f.endsWith('_governed_spec.txt') || f.endsWith('_governed_spec_new.txt'));
    
    if (files.length === 0) {
      console.error(`✗ No governed spec files found in ${resolvedSpecDir}`);
      return false;
    }
    
    // Create output directory
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
    
    let successCount = 0;
    let failCount = 0;
    
    for (const file of files) {
      const inputPath = path.join(resolvedSpecDir, file);
      const outputName = file.replace(/_governed_spec(_new)?\.txt$/, '.json');
      const outputPath = path.join(outputDir, outputName);
      
      const success = compileSpec(inputPath, outputPath);
      if (success) {
        successCount++;
      } else {
        failCount++;
      }
    }
    
    console.error(`\n✓ Compiled ${successCount} file(s)`);
    if (failCount > 0) {
      console.error(`✗ Failed ${failCount} file(s)`);
    }
    
    return failCount === 0;
  } catch (error) {
    console.error('✗ Error in compile-all:');
    console.error(error instanceof Error ? error.message : String(error));
    return false;
  }
}

// Main
const args = process.argv.slice(2);

if (args.length === 0 || args.includes('--help')) {
  showHelp();
  process.exit(0);
}

if (args[0] === 'compile-all') {
  const outDirIndex = args.indexOf('--out-dir');
  if (outDirIndex === -1 || !args[outDirIndex + 1]) {
    console.error('✗ --out-dir required for compile-all');
    process.exit(1);
  }
  
  const outputDir = args[outDirIndex + 1];
  const specDirIndex = args.indexOf('--spec-dir');
  const specDir = specDirIndex !== -1 && args[specDirIndex + 1] ? args[specDirIndex + 1] : './specs';
  const success = compileAll(outputDir, specDir);
  process.exit(success ? 0 : 1);
} else if (args[0] === 'validate') {
  // Lazy import to avoid loading zod unless needed
  import('./schema').then(({ validateDir }) => {
    const dirIndex = args.indexOf('--dir');
    if (dirIndex === -1 || !args[dirIndex + 1]) {
      console.error('✗ --dir required for validate');
      process.exit(1);
    }
    const success = validateDir(args[dirIndex + 1]);
    process.exit(success ? 0 : 1);
  });
} else {
  const inputPath = args[0];
  
  if (!fs.existsSync(inputPath)) {
    console.error(`✗ File not found: ${inputPath}`);
    process.exit(1);
  }
  
  const outIndex = args.indexOf('--out');
  const outputPath = outIndex !== -1 && args[outIndex + 1] ? args[outIndex + 1] : undefined;
  
  const success = compileSpec(inputPath, outputPath);
  process.exit(success ? 0 : 1);
}
