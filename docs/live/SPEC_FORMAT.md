# Governed Spec TXT Format Reference

This document defines the exact syntax for `*_governed_spec_new.txt` files in `specs/`.

## File Structure

```
Venterra Governed Spec Contract
Spec Version: v1.0
Export Format: ExportSpec v1.0
Mode: Page
Target: <page_template>
Build Timestamp (Central Time): ...
Contract ID: ...
Export Hash: ...

==== SITE-LEVEL ATTRIBUTES ====
(body-tag data attributes — not parsed by compiler)

==== PAGE-LEVEL ATTRIBUTES ====
(page-container data attributes — not parsed by compiler)

==== INTERACTIVE ELEMENTS (CTAs, Buttons, Links) ====
(parsed by compiler — see syntax below)

==== END OF VENTERRA GOVERNED SPEC CONTRACT ====
(footer metadata — not parsed by compiler)
```

## Compiler-Relevant Sections

The compiler only processes content between the `INTERACTIVE ELEMENTS` header and the `END OF VENTERRA GOVERNED SPEC CONTRACT` line.

### Target Line

```
Target: homepage
```

Becomes `page_template` in the JSON output.

### Section

```
section_01: PROMO_BAR
data-page-section = "promo_bar"
data-page-section-location = "1"
```

- Format: `section_<NN>: <NAME>`
- `NN` becomes `section_number`, `SECTION_<NN>` becomes `section_name`
- `data-page-section` and `data-page-section-location` are required attributes

### Block (optional, within a section)

```
Block: tab_navigation
data-sub-section = "tab_navigation"
```

- Blocks group subsections within a section
- `block_id` is set from the name after `Block:`
- `data-sub-section` is an optional attribute

### Subsection

```
Subsection: see_specials
data-component-name = "see_specials"
data-action = "navigate_specials"
```

- `data-component-name` is required (defaults to the subsection name if the attribute line is missing)
- `data-action` is optional
- Case-insensitive: `Data-action` and `data-action` are both accepted

### Section Separator

```
---------------------------
```

A line of dashes separates sections. It also closes any open block.

## Attribute Syntax

All attributes follow this pattern:

```
<attribute-name> = "<value>"
```

Spaces around `=` are optional. Values must be quoted.

## Ordering

- Sections are numbered sequentially and reflect vertical page order
- Subsections within a section/block preserve their source order
- Blocks within a section preserve their source order

## Example

See `specs/homepage_governed_spec_new.txt` for a complete example with sections, blocks, and subsections.
