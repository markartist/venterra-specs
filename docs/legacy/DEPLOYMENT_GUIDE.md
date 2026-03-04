# Deployment Guide - Cloning Source Code to GitHub

This guide documents the process for deploying the complete Layout Specification Governance System source code to the markartist/figma repository.

## Repository Structure

```
/
├── Guidelines.md                  # Governance rules
├── package.json                   # Dependencies
├── vite.config.ts                # Build config
├── postcss.config.mjs            # PostCSS config
├── src/
│   ├── config/                   # Configuration files
│   │   ├── CONTRACT_LOCK.ts      # Version & validation config
│   │   ├── environment.ts        # Environment configuration
│   │   └── page-registry.json    # Page/component registry
│   ├── utils/                    # Utility functions
│   │   ├── newExportEngine.ts    # Core export engine
│   │   ├── batchExporter.ts      # Batch export orchestrator
│   │   ├── downloadHelper.ts     # Download utilities
│   │   ├── validation.ts         # Validation engine
│   │   └── [other utils]
│   ├── app/                      # Application code
│   │   ├── App.tsx               # Main app component
│   │   ├── SaveHandler.tsx       # Save functionality
│   │   ├── handoff-generator.ts  # Handoff generation
│   │   └── components/           # React components
│   ├── layouts/                  # Layout JSON files
│   │   ├── pages/                # Page specifications
│   │   └── components/           # Component specifications
│   ├── styles/                   # CSS files
│   │   ├── globals.css
│   │   ├── theme.css
│   │   └── fonts.css
│   └── main.tsx                  # Application entry point
└── docs/                         # Documentation
    ├── PROJECT_STATE_MEMO.md     # Project status
    └── README.md                 # Project overview
```

## Already Deployed (✅)

The following files have been successfully pushed to GitHub:

1. **Core Configuration** (Commit: d63f676)
   - package.json
   - vite.config.ts
   - postcss.config.mjs
   - Guidelines.md

2. **Config Directory** (Commit: 45dbc88)
   - src/config/CONTRACT_LOCK.ts
   - src/config/environment.ts

3. **Core Export Utilities** (Commit: 8b6a90f)
   - src/utils/newExportEngine.ts (685 lines - full version)
   - src/utils/batchExporter.ts

4. **Page Registry** (Commit: 226073c)
   - src/config/page-registry.json

5. **Documentation** (Previous commits)
   - docs/PROJECT_STATE_MEMO.md
   - docs/README.md

## Remaining Files to Deploy

### High Priority - Core System Files

1. **src/utils/** (remaining files)
   - downloadHelper.ts
   - validation.ts
   - contractStamp.ts
   - attributeExporter.ts
   - unifiedExporter.ts
   - flatAttributeFormatter.ts
   - tagValidator.ts
   - imageAnalyzer.ts
   - inventoryGenerator.ts
   - exportTest.ts
   - fix-homepage-sections.ts
   - generateTestExports.js

2. **src/app/**
   - App.tsx
   - SaveHandler.tsx
   - handoff-generator.ts
   - components/ (all component files)

3. **src/styles/**
   - globals.css
   - theme.css
   - fonts.css

4. **src/** (root files)
   - main.tsx
   - index.html (if exists)

### Medium Priority - Layout Specifications

5. **src/layouts/pages/** (all page JSON files)
   - homepage.json
   - contact.json
   - features.json
   - amenities.json
   - reviews.json
   - specials.json
   - about-venterra.json
   - apartments-pricing.json
   - faq.json
   - gallery.json
   - neighborhood.json

6. **src/layouts/components/**
   - nav-primary.json
   - footer-primary.json

## Deployment Strategy

### Option 1: Manual Batch Push (Recommended)
Continue using GitHub MCP tool to push files in logical batches:

```bash
# Batch 1: Remaining utils
src/utils/downloadHelper.ts
src/utils/validation.ts
src/utils/contractStamp.ts

# Batch 2: App core
src/app/App.tsx
src/app/SaveHandler.tsx
src/app/handoff-generator.ts

# Batch 3: Styles
src/styles/globals.css
src/styles/theme.css
src/styles/fonts.css

# Batch 4-N: Layout JSON files (in groups of 3-4)
```

### Option 2: Git CLI Push
If you have local file system access:

```bash
git clone https://github.com/markartist/figma.git
cd figma
# Copy all source files to appropriate directories
git add .
git commit -m "feat: Add complete source code implementation"
git push origin main
```

### Option 3: GitHub API Bulk Upload
Use GitHub's tree API to create multiple files in a single commit.

## File Size Considerations

The following files are particularly large and may need special handling:

- **src/utils/newExportEngine.ts** (685 lines) - ✅ Successfully pushed
- **src/utils/validation.ts** (711 lines) - Pending
- **Layout JSON files** - Vary in size, may need individual commits

## Next Steps

1. Push remaining utility files (downloadHelper.ts, validation.ts, etc.)
2. Push app component files
3. Push style files
4. Push layout JSON files in batches
5. Verify all files are present in repository
6. Test build process: `npm install && npm run build`
7. Document deployment completion in PROJECT_STATE_MEMO.md

## Validation Checklist

After deployment, verify:

- [ ] All config files present
- [ ] All utility files present
- [ ] All app components present
- [ ] All layout specifications present
- [ ] All style files present
- [ ] package.json dependencies match
- [ ] Build succeeds: `npm run build`
- [ ] No missing imports
- [ ] Documentation is current

## Support

For questions or issues with deployment:
- Review commit history: https://github.com/markartist/figma/commits/main
- Check project documentation in /docs
- Verify file structure matches this guide