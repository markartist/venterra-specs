# Layout Specification Governance System - Project State Memorandum

**Last Updated:** 2026-02-23  
**Status:** Active Development - Export Engine Stabilized  
**Version:** ENGINE-V2.0.0 with CONTRACT_LOCK

---

## 🎯 Project Mission

Building a **Layout Specification Governance System** to identify sections, components, and CTAs from full-sized apartment website screenshots with percentage-based positioning. Annotations stay pinned to correct locations and scale with the image.

### Core Objectives
- Implement Dhun Sheth's data-attribute specification exactly
- Split page sections into two separate DOM attributes:
  - `data-page-section-location` (chronological position: "1", "2", "3")
  - `data-page-section` (semantic purpose: promo_bar, hero, etc.)
- Generate synchronized TXT and CSV vendor exports for governance/QA/auditing
- Store target values for every interactive element (modals, overlays, drawers, tabs, carousels, dropdowns, search, anchors)

---

## 🏗️ Architecture Overview

### Three-Layer System

1. **Governed Model Layer** (`/src/layouts/pages/*.json`, `/src/layouts/components/*.json`)
   - JSON specifications with section hierarchy
   - Percentage-based positioning (0-100 scale)
   - Interactive element metadata (actions, targets, priorities)

2. **Export Engine Layer** (`/src/utils/newExportEngine.ts`)
   - Unified serializer (ONE path for all pages/components)
   - Contract locking and versioning gates
   - Schema validation and deterministic hashing
   - Outputs TXT (human-readable) and CSV (machine-readable)

3. **UI Layer** (`/src/app/App.tsx`, `/src/app/components/`)
   - Visual annotation interface over screenshots
   - Drag-and-drop CTA positioning
   - JSON editor for direct model editing
   - Batch export panel with validation status

---

## 📁 Critical Files

### Core Engine
- **`/src/utils/newExportEngine.ts`** - UNIFIED export engine (V2.0)
  - `generateGovernedSpecTXT()` - Main export generator (returns `ExportResult` object with `.content`, `.valid`, `.errors`, `.metadata`)
  - `generateGovernedSpecCSV()` - CSV generator (returns string)
  - `validateExport()` - Hard validation against CONTRACT_LOCK rules
  - `downloadTXT()` and `downloadCSV()` - Download utilities

- **`/src/utils/batchExporter.ts`** - Batch export orchestrator
  - `exportAllLayouts()` - Processes all pages/components
  - `normalizeLegacyStructure()` - Converts legacy section IDs to standard format
  - Returns `ExportResult` with `.governedSpecs` and `.csvExports`

- **`/src/config/CONTRACT_LOCK.ts`** - Single source of truth for versioning
  - Contract Version: `GOV-SPEC-V2.0`
  - Engine Version: `ENGINE-V2.0.0`
  - Allowed actions taxonomy (11 actions)
  - Target requirement rules
  - Build mode and hash configuration

### UI Components
- **`/src/app/App.tsx`** - Main interface
  - Screenshot overlay system
  - CTA drag-and-drop editing
  - JSON editor integration
  - **FIXED:** Now correctly extracts `.content` from `ExportResult` before download

- **`/src/app/components/ExportPanel.tsx`** - Export dashboard
  - Batch download functionality
  - Validation status display
  - Debug output viewer
  - Per-file error/warning expansion

- **`/src/app/components/json-editor.tsx`** - Direct model editor
  - Full JSON editing with syntax highlighting
  - Validation on save
  - Autosave integration

### Layout Specifications
- **`/src/layouts/pages/*.json`** - Page specifications (11 pages)
  - homepage, contact, features, amenities, reviews, specials
  - about-venterra, apartments-pricing, apartment-details
  - faq, gallery, neighborhood

- **`/src/layouts/components/*.json`** - Component specifications (3 components)
  - nav-primary, nav-mobile-menu, footer-primary

### Configuration
- **`/Guidelines.md`** - Governance rules and data structure discipline
- **`/CONTRACT_LOCK.ts`** - Versioning and validation gates

---

## 🔧 Recent Critical Fix (2026-02-23)

### Problem 1: Export Download Showing "[object Object]"
Export files showing "[object Object]" instead of actual TXT content when downloaded from App.tsx.

**Root Cause:** In `/src/app/App.tsx`, the `handleExportTXT()` function was passing the entire `ExportResult` object to `downloadTXT()` instead of extracting the `.content` property.

**Solution:** Extract the `.content` property before passing to download function.

**Status:** ✅ FIXED

### Problem 2: Legacy Section Formatting Inconsistency (STRUCTURAL HARDENING)
**Date:** 2026-02-23  
**Severity:** CRITICAL - System-wide architectural issue

**Problem:** Export files were showing inconsistent section header formats across different pages:
- Some pages: `01_hero: 01_HERO` (legacy format with semantic suffixes)
- Some pages: `section_01: SECTION_01` (canonical format)
- Location values: `"section_01"` or `"01"` instead of numeric `"1"`

**Root Cause:** Export engine was trusting raw model data instead of computing canonical structure from array index.

**Solution - 6 Phase Structural Hardening:**

#### PHASE 1 - CANONICAL SECTION HEADER LOCK
Export engine now **always** computes section headers from array index:
```typescript
const canonicalSectionNum = sectionIndex + 1;
const paddedSectionNum = canonicalSectionNum.toString().padStart(2, '0');
const canonicalSectionId = `section_${paddedSectionNum}`;
const canonicalSectionLabel = `SECTION_${paddedSectionNum}`;
```
Output format: `section_01: SECTION_01`, `section_02: SECTION_02`, etc.

#### PHASE 2 - NUMERIC LOCATION LOCK
Location values **always** numeric-only:
```typescript
const numericLocation = canonicalSectionNum.toString(); // "1", "2", "3"
```
Never `"section_01"`, never `"01"` - only pure numeric strings.

#### PHASE 3 - LEGACY MODEL NORMALIZATION
Enhanced `normalizeLegacyStructure()` in `/src/utils/batchExporter.ts`:
- Strips semantic suffixes from section IDs (`"01_hero"` → `"section_01"`)
- Extracts semantic meaning to `data-page-section` field
- Forces numeric-only location values
- All models normalized BEFORE export engine processes them

#### PHASE 4 - EXPORT ENGINE AUTHORITATIVE STRUCTURE
Export engine **never trusts raw model data** for structural fields:
- Ignores `section.section_id` string value
- Ignores `section['data-page-section-location']` string value
- Computes everything from array index position
- Model can be messy; export is always clean

#### PHASE 5 - HARD VALIDATION UPDATE
Added regex validation in `validateExport()`:
- Section header regex: `/^section_(\d{2}): SECTION_(\d{2})$/`
- Location regex: `/^\d+$/` (numeric only)
- Validation fails with specific error messages if format violated

#### PHASE 6 - MIGRATION ACCEPTANCE TEST
All 11 pages + 2 components now export with identical structural formatting:
- ✅ `section_01: SECTION_01` (never `01_hero: 01_HERO`)
- ✅ `data-page-section-location = "1"` (never `"section_01"`)
- ✅ Semantic meaning in `data-page-section = "hero"`

**Status:** ✅ COMPLETE - System-wide canonical formatting enforced

---

## 📐 Data Structure Specification

### Section Structure (Hierarchical)
```json
{
  "sections": [
    {
      "id": 1,
      "section_id": "section_01",
      "data-page-section": "hero",
      "data-page-section-location": "1",
      "name": "SECTION_01",
      "top": 0,
      "height": 15,
      "blocks": [
        {
          "id": 1,
          "block_id": "hero_cta_group",
          "section": 1,
          "top": 8,
          "subsections": [
            {
              "id": 1,
              "subsection_id": "cta_apply_now",
              "data-component-name": "cta_apply_now",
              "data-action": "navigate_to_apply",
              "target": "#apply-form",
              "top": 45.5,
              "left": 50.0
            }
          ]
        }
      ]
    }
  ]
}
```

### Key Rules (from Guidelines.md)
1. **Section Labels:** Structural only (SECTION_01, SECTION_02, etc.)
2. **Location Values:** Numeric only ("1", "2", "3")
3. **Semantic Keys:** snake_case descriptive names in `data-page-section`
4. **Subsection IDs:** Must equal `data-component-name` attribute
5. **Actions:** Must be in CONTRACT_LOCK allowed set (11 actions)
6. **Targets:** Required for actions like `open_modal`, `open_overlay`, `open_drawer`, etc.

---

## 🔒 Contract Lock & Versioning

### Version Gates
- **Contract Version:** `GOV-SPEC-V2.0` (locked, enforced at export time)
- **Export Engine:** `ENGINE-V2.0.0`
- **Schema Versions:** Supported list in CONTRACT_LOCK

### Allowed Actions (11 Total)
1. `navigate` - Internal page navigation
2. `navigate_external` - External URL navigation
3. `open_modal` - Modal overlay (requires target)
4. `open_overlay` - Generic overlay (requires target)
5. `open_drawer` - Side drawer/menu (requires target)
6. `submit_form` - Form submission
7. `toggle_expansion` - Accordion/expand (requires target)
8. `trigger_search` - Search activation
9. `play_media` - Video/audio play
10. `download_file` - File download
11. `scroll_to_anchor` - Page anchor scroll (requires target)

### Hash System
- **Model Hash:** Deterministic hash of normalized JSON (excludes timestamps in release mode)
- **Export Hash:** Deterministic hash of final TXT output
- **Purpose:** Change detection and contract integrity verification

---

## 🎨 UI Features

### Screenshot Overlay System
- Zoom control (50%-200%)
- Layer toggles (Sections, Blocks, Subsections)
- Color coding:
  - Blue: Sections
  - Green: Blocks
  - Red: Subsections (CTAs)
- Hover tooltips with positioning data

### Editing Capabilities
1. **Drag-and-Drop:** Move red CTA labels to reposition
2. **Add New CTA:** Click-to-place new interactive elements
3. **JSON Editor:** Direct model editing with validation
4. **Autosave:** Local storage persistence (24hr TTL)
5. **Unsaved Warning:** Prevents navigation with unsaved changes

### Export Panel
- Batch download all valid exports
- Per-file validation status (✓ VALID / ✗ INVALID)
- Expandable error/warning messages
- Inventory CSV generation
- Debug "Show First" button for inspection

---

## 📊 Validation System

### Export Validation Rules
1. Section labels are structural only (no semantic suffixes)
2. `data-page-section-location` is numeric
3. Every subsection has `data-component-name` = Subsection ID
4. Every subsection has `data-action` in allowed set
5. Required actions have non-empty targets
6. No mixed-case data attributes
7. Subsection IDs are unique

### Validation Output
- Exports blocked if invalid (download disabled)
- Error list displayed per file
- Warnings shown but don't block download
- Console logging for debug

---

## 🚀 Workflow

### Typical Development Flow
1. **Select Page/Component** from sidebar dropdown
2. **View Annotations** over screenshot (zoom/layer controls)
3. **Edit Model:**
   - Drag red labels to reposition CTAs
   - OR click "Add New CTA" to place new elements
   - OR use "Edit JSON" for direct model editing
4. **Save Changes** (generates JSON output to paste back)
5. **Download Governed Spec** (TXT export with validation)
6. **Batch Export** all pages/components from Export Panel

### Export Workflow
1. Click "Export Panel" in nav
2. Review validation status for all pages
3. Click "Download All Valid" for batch export
4. TXT and CSV files generated per page
5. Inventory CSV summarizes all exports

---

## 🐛 Known Issues & Future Work

### Current State
- ✅ Export engine stabilized with versioning
- ✅ Validation gates working correctly
- ✅ Download functionality fixed
- ✅ Batch export operational

### Future Enhancements
1. **AI Screenshot Analysis** - Auto-detect CTAs from screenshots
2. **Component Merging** - Better nav/footer subsection transformation
3. **Undo/Redo** - Edit history for CTA repositioning
4. **Export Diffing** - Compare export versions
5. **Target Autocomplete** - Suggest valid target values

---

## 🔍 Debugging Tips

### Common Issues

**"[object Object]" in exports:**
- Check if calling code extracts `.content` from `ExportResult`
- See App.tsx line 624 for correct pattern

**Validation errors:**
- Check CONTRACT_LOCK for allowed actions
- Verify target values exist for required actions
- Ensure section labels are structural (SECTION_XX only)

**Subsection not updating:**
- Check console for "🎯 Updating position" logs
- Verify subsection ID matching in `updateSubsectionPosition()`
- Check if data structure is hierarchical vs flat

**Screenshot misalignment:**
- Verify zoom level calculation
- Check percentage conversion in drag handlers
- Ensure image reference is set correctly

### Debug Tools
1. **Console Logs:** `console.log('✅ TXT Export (New Engine):', exportResult)`
2. **Show First Button:** Export Panel debug viewer
3. **Browser DevTools:** Inspect `exportData.exportResults` structure
4. **JSON Editor:** Direct model inspection

---

## 📦 Dependencies

### Key Packages
- React + TypeScript
- Lucide React (icons)
- Figma asset imports (`figma:asset/...`)

### Build Environment
- Vite or similar (inferred from import structure)
- ESM modules
- TypeScript strict mode

---

## 📝 Naming Conventions

### Files
- Pages: `lowercase-with-dashes.json` (e.g., `about-venterra.json`)
- Components: `type-descriptor.json` (e.g., `nav-primary.json`)
- Exports: `{id}_governed_spec_new.txt`, `{id}_export.csv`

### Data Attributes
- All lowercase with hyphens: `data-page-section`, `data-component-name`
- IDs: snake_case (e.g., `cta_apply_now`, `hero_cta_group`)

### Code
- React components: PascalCase
- Functions: camelCase
- Constants: SCREAMING_SNAKE_CASE (e.g., `CONTRACT_LOCK`)

---

## 🎓 Onboarding Checklist

To resume development, read these files in order:

1. ✅ **This file** (`/PROJECT_STATE_MEMO.md`) - Overview
2. 📋 **`/Guidelines.md`** - Data structure rules
3. 🔧 **`/src/config/CONTRACT_LOCK.ts`** - Versioning configuration
4. ⚙️ **`/src/utils/newExportEngine.ts`** - Core export logic
5. 🖥️ **`/src/app/App.tsx`** - Main UI (lines 620-630 for export example)
6. 📤 **`/src/app/components/ExportPanel.tsx`** - Batch export UI
7. 📄 **`/src/layouts/pages/homepage.json`** - Example page spec

**You are now ready to continue development.** 🚀

---

## 💡 Quick Reference

### Export a single page (App.tsx pattern):
```typescript
const exportResult = generateGovernedSpecTXT(data, 'homepage', 'Pages');
downloadTXT(exportResult.content, 'homepage_governed_spec_new.txt');
console.log('Validation:', exportResult.valid, exportResult.errors);
```

### Batch export all pages:
```typescript
import { getExportDataLegacyCompat } from '@/utils/batchExporter';
const result = getExportDataLegacyCompat();
// result.attributes = { filename: content }
// result.exportResults = { filename: ExportResult }
// result.inventory = CSV string
```

### Validate against CONTRACT_LOCK:
```typescript
import { isAllowedAction, requiresTarget } from '@/config/CONTRACT_LOCK';
if (!isAllowedAction('open_modal')) throw new Error('Invalid action');
if (requiresTarget('open_modal') && !target) throw new Error('Target required');
```

---

**End of Project State Memorandum**  
*Ready for immediate development resumption.*