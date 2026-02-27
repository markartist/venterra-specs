import { useState } from 'react'
import { generateGovernedSpecTXT, generateGovernedSpecCSV } from './utils/newExportEngine'

// Sample data structure
interface Subsection {
  id: number
  subsection_id: string
  'data-component-name': string
  'data-action'?: string
  label?: string
  top: number
  left: number
}

interface Block {
  id: number
  block_id: string
  subsections: Subsection[]
}

interface Section {
  id: number
  section_id: string
  'data-page-section': string
  'data-page-section-location': string
  name: string
  top: number
  height: number
  blocks: Block[]
}

interface PageData {
  property_name: string
  property_code: string
  page_template: string
  sections: Section[]
}

// Sample homepage data
const sampleHomepageData: PageData = {
  property_name: "Apex West Midtown",
  property_code: "TX054",
  page_template: "homepage",
  sections: [
    {
      id: 1,
      section_id: "section_01",
      "data-page-section": "promo_bar",
      "data-page-section-location": "1",
      name: "SECTION_01",
      top: 0,
      height: 5,
      blocks: [
        {
          id: 1,
          block_id: "promo_bar_actions",
          subsections: [
            {
              id: 1,
              subsection_id: "open_promo_bar",
              "data-component-name": "open_promo_bar",
              label: "open_promo_bar",
              top: 0.5,
              left: 49.95
            },
            {
              id: 2,
              subsection_id: "see_specials",
              "data-component-name": "see_specials",
              "data-action": "navigate_specials",
              label: "see_specials",
              top: 1.5,
              left: 42.25
            }
          ]
        }
      ]
    },
    {
      id: 2,
      section_id: "section_02",
      "data-page-section": "hero",
      "data-page-section-location": "2",
      name: "SECTION_02",
      top: 5,
      height: 35,
      blocks: [
        {
          id: 1,
          block_id: "hero_ctas",
          subsections: [
            {
              id: 1,
              subsection_id: "find_your_home",
              "data-component-name": "find_your_home",
              "data-action": "navigate_apartments",
              label: "find_your_home",
              top: 30,
              left: 50
            }
          ]
        }
      ]
    }
  ]
}

function App() {
  const [currentPage] = useState('homepage')
  const [pageData] = useState<PageData>(sampleHomepageData)
  const [showSections, setShowSections] = useState(true)
  const [showBlocks, setShowBlocks] = useState(false)
  const [showSubsections, setShowSubsections] = useState(true)
  const [zoom, setZoom] = useState(100)

  const handleDownloadTXT = () => {
    const result = generateGovernedSpecTXT(pageData, currentPage, 'Pages')
    if (result.valid) {
      const blob = new Blob([result.content], { type: 'text/plain' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${currentPage}_governed_spec_new.txt`
      a.click()
      URL.revokeObjectURL(url)
    } else {
      alert(`Export has errors:\n${result.errors.join('\n')}`)
    }
  }

  const handleDownloadCSV = () => {
    const csv = generateGovernedSpecCSV(pageData, currentPage, 'Pages')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${currentPage}_export.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="flex h-screen bg-slate-900">
      {/* Sidebar */}
      <div className="w-64 bg-slate-800 p-4 overflow-y-auto border-r border-slate-700">
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center text-white font-bold">
              V
            </div>
            <div>
              <h1 className="text-lg font-bold text-white">Venterra Layout Specification</h1>
            </div>
          </div>
          <p className="text-sm text-slate-400">Governance System</p>
          <p className="text-xs text-slate-500 mt-1">Governed Architecture System</p>
          <p className="text-xs text-slate-500">Layout Version: v1.0</p>
          <p className="text-xs text-blue-400 mt-1">Current: Homepage</p>
        </div>

        {/* Layout Mode */}
        <div className="mb-6">
          <h3 className="text-sm font-semibold text-slate-300 mb-2">Layout Mode</h3>
          <div className="flex gap-2">
            <button className="px-3 py-1 bg-blue-600 text-white text-sm rounded">Pages</button>
            <button className="px-3 py-1 bg-slate-700 text-slate-300 text-sm rounded">Components</button>
          </div>
        </div>

        {/* Select Page */}
        <div className="mb-6">
          <h3 className="text-sm font-semibold text-slate-300 mb-2">Select Page</h3>
          <select className="w-full bg-slate-700 text-white p-2 rounded text-sm border border-slate-600">
            <option>Homepage</option>
            <option>Contact</option>
            <option>Features</option>
            <option>Amenities</option>
          </select>
        </div>

        {/* Show Overlays */}
        <div className="mb-6">
          <h3 className="text-sm font-semibold text-slate-300 mb-2">Show Overlays</h3>
          <label className="flex items-center gap-2 mb-2">
            <input
              type="checkbox"
              checked={showSections}
              onChange={(e) => setShowSections(e.target.checked)}
              className="w-4 h-4"
            />
            <span className="text-sm text-slate-300">Pages</span>
          </label>
          <label className="flex items-center gap-2 mb-2">
            <input
              type="checkbox"
              checked={showBlocks}
              onChange={(e) => setShowBlocks(e.target.checked)}
              className="w-4 h-4"
            />
            <span className="text-sm text-slate-300">Blocks</span>
          </label>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={showSubsections}
              onChange={(e) => setShowSubsections(e.target.checked)}
              className="w-4 h-4"
            />
            <span className="text-sm text-slate-300">Subsections</span>
          </label>
        </div>

        {/* Screenshot Zoom */}
        <div className="mb-6">
          <h3 className="text-sm font-semibold text-slate-300 mb-2">Screenshot Zoom</h3>
          <input
            type="range"
            min="50"
            max="200"
            value={zoom}
            onChange={(e) => setZoom(Number(e.target.value))}
            className="w-full"
          />
          <div className="text-center text-sm text-slate-400 mt-1">{zoom}%</div>
        </div>

        {/* Download Buttons */}
        <button
          onClick={handleDownloadTXT}
          className="w-full bg-green-600 hover:bg-green-700 text-white py-3 rounded mb-3 font-semibold"
        >
          ⬇️ Download Governed Spec
        </button>
        <div className="text-xs text-center text-slate-400 mb-4">
          {currentPage}_governed_spec.txt
        </div>

        <button
          onClick={handleDownloadCSV}
          className="w-full bg-green-600 hover:bg-green-700 text-white py-3 rounded mb-3 font-semibold"
        >
          ⬇️ Download CSV
        </button>
        <div className="text-xs text-center text-slate-400 mb-4">
          {currentPage}_export.csv
        </div>

        <button className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded mb-3 font-semibold">
          📦 BATCH EXPORT ALL
        </button>
        <div className="text-xs text-center text-green-400 mb-4">
          Export all 11 pages + 2 components<br />
          26 files (13 TXT + 13 CSV)
        </div>

        <button className="w-full bg-purple-600 hover:bg-purple-700 text-white py-3 rounded mb-3 font-semibold">
          &lt;/&gt; Edit JSON
        </button>

        <button className="w-full bg-purple-600 hover:bg-purple-700 text-white py-3 rounded font-semibold">
          ➕ Add New CTA
        </button>
      </div>

      {/* Main Canvas */}
      <div className="flex-1 overflow-auto bg-slate-900 p-8">
        <div className="relative" style={{ transform: `scale(${zoom / 100})`, transformOrigin: 'top left' }}>
          {/* Placeholder for screenshot - would be actual image in production */}
          <div className="relative w-[1440px] bg-slate-800 border border-slate-700">
            {/* Demo content */}
            <div className="h-[3000px] bg-gradient-to-b from-blue-900/20 to-slate-900/20">
              
              {/* Section Overlays */}
              {showSections && pageData.sections.map((section) => (
                <div
                  key={section.id}
                  className="absolute left-0 right-0 border-2 border-blue-500/50 bg-blue-500/10"
                  style={{
                    top: `${section.top}%`,
                    height: `${section.height}%`
                  }}
                >
                  <div className="absolute top-0 left-0 bg-blue-600 text-white px-2 py-1 text-xs font-semibold">
                    {section.name} — {section['data-page-section']}
                  </div>
                </div>
              ))}

              {/* Subsection Overlays (CTAs) */}
              {showSubsections && pageData.sections.map((section) =>
                section.blocks.map((block) =>
                  block.subsections.map((subsection) => (
                    <div
                      key={subsection.id}
                      className="absolute bg-red-500 text-white px-3 py-1 text-xs font-semibold rounded cursor-move hover:bg-red-600"
                      style={{
                        top: `${subsection.top}%`,
                        left: `${subsection.left}%`,
                        transform: 'translate(-50%, -50%)'
                      }}
                    >
                      {subsection.label || subsection['data-component-name']}
                    </div>
                  ))
                )
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default App
