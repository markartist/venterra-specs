import { useState, useEffect } from 'react'

// ExportSpec v1.0 JSON structure (from compiler)
interface Subsection {
  'data-component-name': string
  'data-action'?: string
  'element_label'?: string
}

interface Block {
  'block_id'?: string
  'data-sub-section'?: string
  subsections: Subsection[]
}

interface Section {
  section_number: string
  section_name: string
  'data-page-section': string
  'data-page-section-location': string
  blocks?: Block[]
  subsections?: Subsection[]
}

interface CompiledSpec {
  page_template: string
  sections: Section[]
}

// Available compiled specs
const AVAILABLE_SPECS = [
  'homepage',
  'contact',
  'features',
  'amenities',
  'reviews',
  'specials',
  'about-venterra',
  'apartments',
  'faqs',
  'gallery',
  'neighborhood',
  'footer-primary',
  'nav-primary',
  'nav-mobile-menu'
]

function App() {
  const [currentPage, setCurrentPage] = useState('homepage')
  const [specData, setSpecData] = useState<CompiledSpec | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showSections, setShowSections] = useState(true)
  const [showBlocks, setShowBlocks] = useState(false)
  const [showSubsections, setShowSubsections] = useState(true)
  const [zoom, setZoom] = useState(100)

  // Load compiled JSON when page changes
  useEffect(() => {
    async function loadSpec() {
      setLoading(true)
      setError(null)
      
      try {
        const response = await fetch(`/compiled-specs/${currentPage}.json`)
        if (!response.ok) {
          throw new Error(`Failed to load ${currentPage}.json`)
        }
        const data = await response.json()
        setSpecData(data)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load spec')
        console.error('Error loading spec:', err)
      } finally {
        setLoading(false)
      }
    }
    
    loadSpec()
  }, [currentPage])

  const handleRecompile = () => {
    alert('Run: npx tsx src/compiler/cli.ts compile-all --out-dir ./compiled-specs')
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
          <select 
            className="w-full bg-slate-700 text-white p-2 rounded text-sm border border-slate-600"
            value={currentPage}
            onChange={(e) => setCurrentPage(e.target.value)}
          >
            {AVAILABLE_SPECS.map(spec => (
              <option key={spec} value={spec}>
                {spec.charAt(0).toUpperCase() + spec.slice(1).replace('-', ' ')}
              </option>
            ))}
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

        {/* Read-only notice */}
        <div className="bg-blue-900/30 border border-blue-700 rounded p-3 mb-4">
          <div className="text-xs font-semibold text-blue-300 mb-1">📖 READ-ONLY MODE</div>
          <div className="text-xs text-slate-400">
            This tool displays compiled JSON from the ExportSpec Compiler.
            Edit source TXT files and recompile to update.
          </div>
        </div>

        {/* Recompile instruction */}
        <button
          onClick={handleRecompile}
          className="w-full bg-orange-600 hover:bg-orange-700 text-white py-3 rounded mb-3 font-semibold"
        >
          🔄 How to Recompile
        </button>
        <div className="text-xs text-center text-slate-400 mb-4">
          Updates data from source TXT files
        </div>

        {/* Spec info */}
        {specData && (
          <div className="bg-slate-700/50 rounded p-3 mb-4">
            <div className="text-xs font-semibold text-slate-300 mb-2">Loaded Spec</div>
            <div className="text-xs text-slate-400">
              Template: {specData.page_template}<br />
              Sections: {specData.sections.length}<br />
              Source: compiled-specs/{currentPage}.json
            </div>
          </div>
        )}
      </div>

      {/* Main Canvas */}
      <div className="flex-1 overflow-auto bg-slate-900 p-8">
        {loading && (
          <div className="flex items-center justify-center h-full">
            <div className="text-slate-400">Loading {currentPage} spec...</div>
          </div>
        )}
        
        {error && (
          <div className="flex items-center justify-center h-full">
            <div className="bg-red-900/20 border border-red-700 rounded p-4 max-w-md">
              <div className="text-red-400 font-semibold mb-2">⚠️ Error Loading Spec</div>
              <div className="text-slate-300 text-sm mb-3">{error}</div>
              <div className="text-xs text-slate-400">
                Make sure you've compiled the specs:
                <code className="block mt-2 bg-slate-800 p-2 rounded">
                  npx tsx src/compiler/cli.ts compile-all --out-dir ./compiled-specs
                </code>
              </div>
            </div>
          </div>
        )}
        
        {!loading && !error && specData && (
          <div className="relative" style={{ transform: `scale(${zoom / 100})`, transformOrigin: 'top left' }}>
            {/* Placeholder for screenshot */}
            <div className="relative w-[1440px] bg-slate-800 border border-slate-700">
              {/* Demo content - in production would load actual screenshot */}
              <div className="h-[3000px] bg-gradient-to-b from-blue-900/20 to-slate-900/20">
                
                {/* Section Overlays */}
                {showSections && specData.sections.map((section, idx) => (
                  <div
                    key={idx}
                    className="absolute left-0 right-0 border-2 border-blue-500/50 bg-blue-500/10"
                    style={{
                      top: `${idx * 10}%`,
                      height: '10%'
                    }}
                  >
                    <div className="absolute top-0 left-0 bg-blue-600 text-white px-2 py-1 text-xs font-semibold">
                      {section.section_name} — {section['data-page-section']}
                    </div>
                  </div>
                ))}

                {/* Block Overlays */}
                {showBlocks && specData.sections.map((section, sIdx) =>
                  section.blocks?.map((block, bIdx) => (
                    <div
                      key={`${sIdx}-${bIdx}`}
                      className="absolute border-2 border-green-500/50 bg-green-500/10"
                      style={{
                        top: `${sIdx * 10 + 1}%`,
                        left: `${bIdx * 20}%`,
                        width: '18%',
                        height: '8%'
                      }}
                    >
                      <div className="absolute top-0 left-0 bg-green-600 text-white px-2 py-1 text-xs font-semibold">
                        Block: {block['block_id'] || 'unnamed'}
                      </div>
                    </div>
                  ))
                )}

                {/* Subsection Overlays (CTAs) - from blocks */}
                {showSubsections && specData.sections.map((section, sIdx) =>
                  section.blocks?.map((block, bIdx) =>
                    block.subsections.map((subsection, subIdx) => (
                      <div
                        key={`${sIdx}-${bIdx}-${subIdx}`}
                        className="absolute bg-red-500 text-white px-3 py-1 text-xs font-semibold rounded"
                        style={{
                          top: `${sIdx * 10 + 2 + subIdx * 0.5}%`,
                          left: `${bIdx * 20 + 2}%`
                        }}
                        title={`${subsection['data-component-name']}${subsection['data-action'] ? ' → ' + subsection['data-action'] : ''}`}
                      >
                        {subsection['data-component-name']}
                      </div>
                    ))
                  )
                )}

                {/* Subsection Overlays (CTAs) - direct under section */}
                {showSubsections && specData.sections.map((section, sIdx) =>
                  section.subsections?.map((subsection, subIdx) => (
                    <div
                      key={`${sIdx}-direct-${subIdx}`}
                      className="absolute bg-red-500 text-white px-3 py-1 text-xs font-semibold rounded"
                      style={{
                        top: `${sIdx * 10 + 2 + subIdx * 0.5}%`,
                        left: '2%'
                      }}
                      title={`${subsection['data-component-name']}${subsection['data-action'] ? ' → ' + subsection['data-action'] : ''}`}
                    >
                      {subsection['data-component-name']}
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default App
