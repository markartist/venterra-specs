# ExportSpec Compiler v1.0

**Deterministic contract compiler: Governed Spec TXT → ExportSpec v1.0 JSON**

## What This Is

The ExportSpec Compiler is a **deterministic contract compiler** that converts governed specification files (A files in TXT format) into strict, machine-readable ExportSpec v1.0 JSON.

### Core Principles

- **Structure is cloned, not generated** - Zero inference, zero normalization
- **Exact mirroring only** - Preserves hierarchy, ordering, and field names exactly
- **Schema locked** - Only allowed keys, no additions
- **Deterministic** - Same input always produces identical output

## Usage

### Compile Single File

```bash
npx tsx src/compiler/cli.ts homepage_governed_spec.txt --out homepage.json
```

### Compile All Files

```bash
npx tsx src/compiler/cli.ts compile-all --out-dir ./compiled-specs
```

This finds all `*_governed_spec.txt` files in the current directory and compiles them to JSON.

### Output to Stdout

```bash
npx tsx src/compiler/cli.ts homepage_governed_spec.txt
```

## Output Format

### ExportSpec v1.0 JSON Schema

```json
{
  "page_template": "homepage",
  "sections": [
    {
      "section_number": "01",
      "section_name": "SECTION_01",
      "data-page-section": "promo_bar",
      "data-page-section-location": "1",
      "subsections": [
        {
          "data-component-name": "open_promo_bar"
        },
        {
          "data-component-name": "see_specials",
          "data-action": "navigate_specials"
        }
      ]
    }
  ]
}
```

### Hierarchy Rules

**Sections without blocks:**
- `subsections` array directly under `section`

**Sections with blocks:**
```json
{
  "section_number": "07",
  "blocks": [
    {
      "block_id": "tab_navigation",
      "data-sub-section": "tab_navigation",
      "subsections": [ ... ]
    }
  ]
}
```

### Allowed Keys Only

**Section level:**
- `section_number`
- `section_name`
- `data-page-section`
- `data-page-section-location`
- `blocks` (if present in A file)
- `subsections` (if no blocks)

**Block level:**
- `block_id` (if present)
- `data-sub-section` (if present)
- `subsections`

**Subsection level:**
- `data-component-name` (required)
- `data-action` (if present)
- `element_label` (if present)

## Validation Rules

### Zero Tolerance for Drift

The compiler **fails** if:
- Any additional keys appear in output
- Any key naming deviates (hyphen vs underscore)
- Any block is added/removed relative to A file
- Any subsection moves between block and section level
- Any ordering changes
- Any field is auto-inserted when not present in A

### What Gets Preserved

✓ Exact hierarchy from A file  
✓ Exact field names (hyphens preserved)  
✓ Exact ordering  
✓ Optional fields only when present  
✓ Block structure when present, flat when not  

### What Never Happens

✗ Normalization  
✗ Inference  
✗ Structure generation  
✗ Key renaming  
✗ Field additions  
✗ Reordering  

## Architecture

```
A File (TXT, Git) → Parser → Emitter → ExportSpec JSON
```

### Components

**Parser** (`src/compiler/parser.ts`)
- Reads governed spec TXT files
- Extracts sections, blocks, subsections
- Zero inference

**Emitter** (`src/compiler/emitter.ts`)
- Outputs ExportSpec v1.0 JSON
- Deterministic serialization
- No transformations

**CLI** (`src/compiler/cli.ts`)
- Command-line interface
- Single file and batch modes
- File I/O handling

## Integration with Visual Tool

The visual overlay system is a **read-only consumer** of compiler output:

```
A File (TXT) → Compiler → JSON → Visual Tool (display only)
```

The visual tool:
- Loads JSON from compiler
- Displays overlays on screenshots
- Never generates or modifies structure
- Purpose: QA, validation, stakeholder communication

## Development

### Requirements

- Node.js 18+
- TypeScript
- tsx (for running TS files directly)

### Install Dependencies

```bash
npm install
```

### Run Tests

Compile a single file and inspect output:

```bash
npx tsx src/compiler/cli.ts homepage_governed_spec_new.txt > test.json
cat test.json | jq .
```

Compile all files:

```bash
npx tsx src/compiler/cli.ts compile-all --out-dir ./test-output
ls -l ./test-output
```

## Git Hook Integration (Future)

Recommended CI/CD integration:

```bash
#!/bin/bash
# .git/hooks/pre-commit or CI pipeline

# Compile all specs
npx tsx src/compiler/cli.ts compile-all --out-dir ./dist/specs

# Validate output
if [ $? -ne 0 ]; then
  echo "❌ Spec compilation failed"
  exit 1
fi

echo "✅ All specs compiled successfully"
```

## Troubleshooting

### File Not Found

Ensure you're running from the directory containing the spec files, or provide absolute paths.

### Parse Errors

Check that the A file follows the expected format:
- Sections marked as `section_01: SECTION_NAME`
- Attributes as `data-page-section = "value"`
- Subsections as `Subsection: name`

### Output Validation

Compare output JSON structure with this README's schema to ensure compliance.

## Version

- **Compiler Version:** 1.0
- **ExportSpec Version:** 1.0
- **Last Updated:** 2026-02-27

## Support

For issues or questions:
1. Check this README
2. Inspect sample output in `compiled-specs/`
3. Validate against ExportSpec v1.0 schema above

---

**Remember:** The compiler is the only structure authority. The visual overlay is a read-only validator.
