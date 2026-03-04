# Layout Governance System

A governed layout specification system for annotating apartment website screenshots with interactive sections, components, and CTAs using percentage-based positioning.

## 🚀 Quick Start

```bash
npm install
npm run dev
```

Open browser to `http://localhost:5173`

## 📋 Features

- **Interactive Annotation Tool** - Click to add, drag to reposition CTAs
- **Three View Modes** - Toggle between Sections, Components, and CTAs
- **Auto-Save System** - Changes saved to localStorage automatically
- **JSON Export/Import** - Save layouts and reload them anytime
- **Vendor Export System** - Generate TXT/CSV files for implementation
- **Governed Architecture** - Implements Dhun Sheth's data-attribute specification

## 📁 Project Structure

```
layout-governance-system/
├── src/
│   ├── app/
│   │   ├── App.tsx                      # Main application (42KB)
│   │   ├── routes.ts                    # React Router config
│   │   └── components/
│   │       ├── LayoutViewer.tsx         # Main viewer component
│   │       ├── SectionOverlay.tsx       # Section visualization
│   │       ├── ComponentOverlay.tsx     # Component visualization
│   │       ├── CTAOverlay.tsx          # CTA visualization & editing
│   │       ├── Sidebar.tsx              # Navigation sidebar
│   │       ├── JsonModal.tsx            # JSON export modal
│   │       ├── CTAModal.tsx            # CTA creation form
│   │       ├── VendorExportModal.tsx   # Vendor file export
│   │       └── ExportUtilities.tsx     # Export utility functions
│   ├── layouts/
│   │   └── pages/
│   │       ├── homepage.json            # Homepage layout spec
│   │       ├── contact.json             # Contact page spec
│   │       ├── features.json            # Features page spec
│   │       ├── amenities.json           # Amenities page spec
│   │       ├── gallery.json             # Gallery page spec
│   │       ├── neighborhood.json        # Neighborhood page spec
│   │       ├── specials.json            # Specials page spec
│   │       └── reviews.json             # Reviews page spec
│   ├── imports/
│   │   └── [screenshots]                # Website screenshots
│   └── styles/
│       └── theme.css                    # Tailwind + custom styles
├── Guidelines.md                         # Governance specification rules
├── BACKUP_GUIDE.md                      # Backup & recovery procedures
├── backup.sh                            # Automated backup script
└── package.json                         # Dependencies
```

## 🎯 How It Works

### 1. **Load a Page**
- Select a page from sidebar (Homepage, Contact, etc.)
- Screenshot displays with current annotations

### 2. **View Modes**
- **Sections** - Shows major page sections (Hero, Welcome, Features, etc.)
- **Components** - Shows interactive components (Carousels, Tabs, etc.)
- **CTAs** - Shows all call-to-action buttons with labels

### 3. **Edit CTAs**
- **Drag to Reposition** - Click and drag any CTA to move it
- **Add New CTA** - Click "Add New CTA" button, then click on screenshot
- **Coordinates Update** - Positions saved as percentages in real-time

### 4. **Save Your Work**
- **Auto-Save** - Edits saved to browser localStorage automatically
- **Export JSON** - Click "💾 Save Layout" to get JSON in popup modal
- **Upload JSON** - Click "📤 Upload JSON" to restore from backup

### 5. **Export for Implementation**
- Click "📊 Export Vendor Files"
- Generates synchronized TXT and CSV files
- Contains machine-readable data-attributes
- Includes human-readable labels and coordinates

## 🏗️ Architecture Specification

Implements **Dhun Sheth's Governed Web Architecture System**:

### Data Attributes (Dual Reference System)
```html
<section 
  data-page-section="hero" 
  data-page-section-location="2"
>
  <!-- Section content -->
</section>
```

- `data-page-section-location` - Chronological position (1, 2, 3...)
- `data-page-section` - Semantic purpose (hero, welcome, promo_bar...)

### Hierarchy
```
Page
└── Sections (data-page-section, data-page-section-location)
    └── Blocks (data-sub-section)
        └── Subsections (data-component-name)
```

### Coordinate System
- **Unit**: Percentage (0-100)
- **Origin**: Top-left of page frame
- **X Reference**: Frame width (1440px)
- **Y Reference**: Normalized 0-100 scale

## 📊 Export Files

### Vendor TXT Format
```
===== HOMEPAGE LAYOUT SPECIFICATION =====
Property: Apex West Midtown (TX054)
Contract: ARCH-HOMEPAGE-V1 [7F71B5]

SECTION 1: PROMO_BAR
├─ Block: promo_bar_container
│  └─ toggle_promo_bar @ (49.95%, 0.48%)
├─ Block: cta_see_specials
│  └─ cta_see_specials @ (42.25%, 1.36%) [See Specials]
```

### Vendor CSV Format
```csv
element_id,data-component-name,action,label,top,left,width,height,parent_block_id,section_name
toggle_promo_bar,toggle_promo_bar,toggle_dropdown,,0.48,49.95,2,0.6,promo_bar_container,PROMO_BAR
cta_see_specials,cta_see_specials,navigate,See Specials,1.36,42.25,10,0.7,cta_see_specials,PROMO_BAR
```

## 🔄 Workflow

### Daily Usage
1. Open app
2. Select page from sidebar
3. Make edits (drag CTAs, add new ones)
4. Click "💾 Save Layout"
5. Copy JSON from modal
6. Paste back to assistant to update files

### Weekly Backup
1. Export project ZIP from Figma Make
2. Save all JSON files via "Save Layout" button
3. Run `./backup.sh` script
4. Upload backups to cloud storage

## 🛠️ Technology Stack

- **React 18** - UI framework
- **React Router 6** - Page navigation
- **TypeScript** - Type safety
- **Tailwind CSS v4** - Styling
- **Lucide React** - Icons
- **Vite** - Build tool

## 📦 Dependencies

```json
{
  "react": "^18.3.1",
  "react-dom": "^18.3.1",
  "react-router": "^7.1.1",
  "lucide-react": "^0.469.0"
}
```

## 🔐 Data Persistence

### localStorage Keys
```javascript
layout_spec_homepage      // Homepage edits
layout_spec_contact       // Contact page edits
layout_spec_features      // Features page edits
layout_spec_amenities     // Amenities page edits
layout_spec_gallery       // Gallery page edits
layout_spec_neighborhood  // Neighborhood page edits
layout_spec_specials      // Specials page edits
layout_spec_reviews       // Reviews page edits
```

### Auto-Save Triggers
- CTA drag (on mouse release)
- New CTA added (after modal submission)
- JSON upload (after file processed)

### Manual Save
- Click "💾 Save Layout" button
- JSON appears in modal popup
- Copy to clipboard or save to file

## 🆘 Troubleshooting

### Lost Edits
- Check browser localStorage (F12 > Application > Local Storage)
- Upload last saved JSON file via "📤 Upload JSON"

### App Won't Load
- Check console for errors (F12 > Console)
- Verify all JSON files are valid
- Clear localStorage and refresh

### CTAs Not Appearing
- Switch to "CTAs" view mode in sidebar
- Check that subsections exist in JSON
- Verify screenshot is loading

### Export Not Working
- Check browser console for errors
- Ensure JSON structure is valid
- Try exporting one page at a time

## 📚 Additional Documentation

- **BACKUP_GUIDE.md** - Comprehensive backup & recovery procedures
- **Guidelines.md** - Governance specification rules
- **backup.sh** - Automated backup script

## 🤝 Support

If you encounter issues or need to rebuild:
1. Consult BACKUP_GUIDE.md
2. Check localStorage for auto-saved data
3. Contact assistant: "I need help with Layout Governance System"

## 📝 License

Proprietary - Venterra Governed Spec Contract v1.0

---

**Last Updated**: 2026-02-23  
**Version**: 2.0  
**Contract ID**: GOV-SPEC-V2.0