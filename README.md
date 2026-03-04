# Venterra Layout Specification Governance System

Live site: [https://specs.venterradev.com](https://specs.venterradev.com)

This repository has two documentation tracks:
- **Live/Oz track**: current, deployed system behavior.
- **Legacy/Figma track**: archived historical material from the earlier build.

Use this file and `docs/live/` as the source of truth for current operations.

## Live Architecture (Authoritative)

1. **Governed TXT specs** in `specs/` (`*_governed_spec_new.txt`) are the source of truth.
2. **Compiler** in `src/compiler/` parses TXT and emits ExportSpec v1.0 JSON.
3. **Schema** in `src/compiler/schema.ts` validates compiled JSON (Zod, strict mode).
4. **Viewer** in `src/App.tsx` reads `/compiled-specs/*.json` and overlays on screenshots.
5. **Position API** in `functions/api/positions/` stores visual position overrides in KV.

## Daily Workflow

1. Edit a governed TXT file in `specs/`.
2. Compile specs:
   ```bash
   npx tsx src/compiler/cli.ts compile-all --out-dir ./public/compiled-specs
   ```
3. Validate compiled output:
   ```bash
   npx tsx src/compiler/cli.ts validate --dir ./public/compiled-specs
   ```
4. Run locally:
   ```bash
   npm run dev
   ```
5. Run tests:
   ```bash
   npm test
   ```
6. Build & deploy (single command):
   ```bash
   npm run deploy
   ```

## CI

GitHub Actions runs on every push/PR to `main`:
- TypeScript type-check
- Compile all specs
- Validate compiled JSON against ExportSpec schema
- Run vitest snapshot + validation tests

## Documentation Map

- Live docs index: `docs/live/README.md`
- Spec TXT format: `docs/live/SPEC_FORMAT.md`
- Position backup: `docs/live/POSITIONS_BACKUP.md`
- Legacy docs index: `docs/legacy/README.md`
- Full docs index: `docs/README.md`

## Notes

- `docs/legacy/` is retained for historical context and migration reference.
- Legacy docs may describe paths/components not present in the current runtime.
