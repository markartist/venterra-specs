Layout Specification Governance System — Usage Guidelines

These rules govern the TXT spec files in `specs/` and their compiled JSON output.

Purpose

The governed spec TXT files are the single source of truth for page structure and interaction mapping.

The compiler (`src/compiler/`) produces deterministic ExportSpec JSON from these files. The visual overlay tool is a read-only consumer.

Structure Rules

Page layouts are defined hierarchically: Sections → Blocks → Subsections.

Section numbering is sequential and reflects vertical page order.

Blocks must appear within a valid parent section.

Subsections must appear within a section or block.

Naming & Consistency

Use snake_case, descriptive, human-readable identifiers.

IDs must remain stable once published.

Field names use hyphens for data attributes (`data-page-section`, `data-component-name`) and underscores for structural keys (`section_number`, `block_id`).

Validation

All compiled JSON must pass the ExportSpec v1.0 schema (`src/compiler/schema.ts`).

Run `npx tsx src/compiler/cli.ts validate --dir ./compiled-specs` to verify.

If something appears ambiguous, it should be clarified in the spec—not assumed by the reader.

Change Discipline

Changes should be intentional, minimal, and reviewed.

Do not "fix for aesthetics." Only update when structure, behavior, or meaning changes.

All spec changes must pass CI before merge.
