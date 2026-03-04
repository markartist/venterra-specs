import { useState, useEffect } from 'react'

// ExportSpec v1.0 JSON structure (from compiler)
interface Subsection {
  'data-component-name': string
  'data-action'?: string
  'element_label'?: string
  position?: {
    top: string
    left: string
  }
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
  const [editMode, setEditMode] = useState(false)
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)

  // Load compiled JSON + position overrides when page changes
  useEffect(() => {
    async function loadSpec() {
      setLoading(true)
      setError(null)
      
      try {
        // Load base JSON
        const specResponse = await fetch(`/compiled-specs/${currentPage}.json`)
        if (!specResponse.ok) {
          throw new Error(`Failed to load ${currentPage}.json`)
        }
        const baseData = await specResponse.json()
        
        // Load position overrides from Worker
        const positionsResponse = await fetch(`/api/positions/${currentPage}`)
        const positionOverrides = positionsResponse.ok ? await positionsResponse.json() : {}
        
        // Merge positions into base data
        const mergedData = applyPositionOverrides(baseData, positionOverrides)
        setSpecData(mergedData)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load spec')
        console.error('Error loading spec:', err)
      } finally {
        setLoading(false)
      }
    }
    
    loadSpec()
  }, [currentPage])

  const handleDownloadTXT = async () => {
    try {
      const response = await fetch(`/source-txt/${currentPage}_governed_spec_new.txt`)
      if (!response.ok) throw new Error('TXT file not found')
      const blob = await response.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${currentPage}_governed_spec_new.txt`
      a.click()
      URL.revokeObjectURL(url)
    } catch (err) {
      alert('❌ TXT file not available. These are governance source files.')
    }
  }

  const handleDownloadJSON = () => {
    if (!specData) return
    const blob = new Blob([JSON.stringify(specData, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${currentPage}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  const handleDownloadAllTXT = async () => {
    const txtFiles = [
      'about-venterra_governed_spec_new.txt',
      'amenities_governed_spec_new.txt',
      'apartments_governed_spec_new.txt',
      'contact_governed_spec_new.txt',
      'faqs_governed_spec_new.txt',
      'features_governed_spec_new.txt',
      'footer-primary_governed_spec_new.txt',
      'gallery_governed_spec_new.txt',
      'homepage_governed_spec_new.txt',
      'nav-mobile-menu_governed_spec_new.txt',
      'nav-primary_governed_spec_new.txt',
      'neighborhood_governed_spec_new.txt',
      'reviews_governed_spec_new.txt',
      'specials_governed_spec_new.txt'
    ]

    // Create zip file would require a library, so we'll download individually
    // Or just download one master file with all content
    alert('TXT files are governance source files. Contact system admin for access.')
  }

  const handleDragStart = (e: React.DragEvent, type: 'section' | 'subsection', sectionIdx: number, blockIdx: number | null, subIdx: number | null) => {
    e.dataTransfer.setData('text/plain', JSON.stringify({ type, sectionIdx, blockIdx, subIdx }))
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    if (!editMode || !specData) return

    const data = JSON.parse(e.dataTransfer.getData('text/plain'))
    const rect = e.currentTarget.getBoundingClientRect()
    const x = ((e.clientX - rect.left) / rect.width) * 100
    const y = ((e.clientY - rect.top) / rect.height) * 100

    // Update position in specData
    const newSpecData = { ...specData }
    
    if (data.type === 'section') {
      // Update section top position (height auto-calculated)
      const section = newSpecData.sections[data.sectionIdx] as any
      if (!section.layout) section.layout = {}
      section.layout.top = `${y.toFixed(2)}%`
      // Remove height - it's now auto-calculated
      delete section.layout.height
    } else {
      // Update subsection position
      const section = newSpecData.sections[data.sectionIdx]
      if (data.blockIdx !== null && section.blocks) {
        const subsection = section.blocks[data.blockIdx].subsections[data.subIdx!]
        subsection.position = { top: `${y.toFixed(2)}%`, left: `${x.toFixed(2)}%` }
      } else if (section.subsections) {
        const subsection = section.subsections[data.subIdx!]
        subsection.position = { top: `${y.toFixed(2)}%`, left: `${x.toFixed(2)}%` }
      }
    }

    setSpecData(newSpecData)
    setHasUnsavedChanges(true)
  }

  const applyPositionOverrides = (baseData: CompiledSpec, overrides: Record<string, any>) => {
    const data = JSON.parse(JSON.stringify(baseData)) // Deep clone
    
    data.sections.forEach((section: any, sIdx: number) => {
      // Apply section layout overrides
      const sectionKey = `section-${sIdx}`
      if (overrides[sectionKey]) {
        section.layout = overrides[sectionKey]
      }
      
      // Apply to blocks > subsections
      section.blocks?.forEach((block: Block, bIdx: number) => {
        block.subsections.forEach((subsection: Subsection, subIdx: number) => {
          const key = `${sIdx}-${bIdx}-${subIdx}`
          if (overrides[key]) {
            subsection.position = overrides[key]
          }
        })
      })
      
      // Apply to direct subsections
      section.subsections?.forEach((subsection: Subsection, subIdx: number) => {
        const key = `${sIdx}-direct-${subIdx}`
        if (overrides[key]) {
          subsection.position = overrides[key]
        }
      })
    })
    
    return data
  }

  const extractPositionOverrides = (data: CompiledSpec) => {
    const overrides: Record<string, any> = {}
    
    data.sections.forEach((section: any, sIdx) => {
      // Extract section layout if present
      if (section.layout) {
        const sectionKey = `section-${sIdx}`
        overrides[sectionKey] = section.layout
      }
      
      section.blocks?.forEach((block: Block, bIdx: number) => {
        block.subsections.forEach((subsection: Subsection, subIdx: number) => {
          if (subsection.position) {
            const key = `${sIdx}-${bIdx}-${subIdx}`
            overrides[key] = subsection.position
          }
        })
      })
      
      section.subsections?.forEach((subsection: Subsection, subIdx: number) => {
        if (subsection.position) {
          const key = `${sIdx}-direct-${subIdx}`
          overrides[key] = subsection.position
        }
      })
    })
    
    return overrides
  }

  const handleSavePositions = async () => {
    if (!specData) return

    try {
      // Extract only position data
      const positionOverrides = extractPositionOverrides(specData)
      
      // Save to Worker API
      const response = await fetch(`/api/positions/${currentPage}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(positionOverrides)
      })
      
      if (response.ok) {
        setHasUnsavedChanges(false)
        alert('✅ Positions saved! Live for everyone.')
      } else {
        throw new Error('Save failed')
      }
    } catch (err) {
      console.error('Error saving positions:', err)
      alert('❌ Failed to save positions. Check console for details.')
    }
  }

  return (
    <div className="flex h-screen bg-slate-900">
      {/* Sidebar */}
      <div className="w-80 p-8 overflow-y-auto border-r" style={{backgroundColor: '#1e293b', borderColor: '#334155'}}>
        {/* Header */}
        <div className="pb-8 mb-10 border-b border-slate-700" style={{backgroundColor: '#15284B', margin: '-2rem -2rem 2.5rem -2rem', padding: '2rem'}}>
          <div className="flex flex-col items-center text-center">
            <img src="/logo.svg" alt="Venterra" className="w-20 h-20 mb-4" />
            <h1 className="text-xl font-bold text-white leading-tight mb-3">Venterra Layout Specification</h1>
            <p className="text-sm text-slate-300 mb-2">Governance System</p>
            <p className="text-sm text-slate-400 leading-relaxed">Governed Architecture System</p>
            <p className="text-sm text-blue-400 mt-3 font-semibold">Current: {currentPage.charAt(0).toUpperCase() + currentPage.slice(1).replace(/-/g, ' ')}</p>
          </div>
        </div>

        {/* Layout Mode */}
        <div className="mb-10">
          <h3 className="text-sm font-semibold text-white mb-5">Layout Mode</h3>
          <div className="space-y-4">
            <label className="flex items-center gap-3 cursor-pointer">
              <div className="w-5 h-5 rounded-full border-2 flex items-center justify-center" style={{borderColor: '#60a5fa'}}>
                <div className="w-3 h-3 rounded-full" style={{backgroundColor: '#60a5fa'}} />
              </div>
              <span className="text-sm text-white">Pages</span>
            </label>
            <label className="flex items-center gap-3 cursor-pointer">
              <div className="w-5 h-5 rounded-full border-2 border-slate-600" />
              <span className="text-sm text-slate-400">Components</span>
            </label>
          </div>
          <div className="mt-6">
            <label className="flex items-center gap-3">
              <input type="checkbox" className="w-4 h-4" checked readOnly />
              <span className="text-sm text-slate-300">Normalized</span>
            </label>
          </div>
        </div>

        {/* Select Page */}
        <div className="mb-10">
          <h3 className="text-sm font-semibold text-white mb-5">Select Page</h3>
          <select 
            className="w-full text-white p-3 rounded text-sm border"
            style={{backgroundColor: '#334155', borderColor: '#475569'}}
            value={currentPage}
            onChange={(e) => setCurrentPage(e.target.value)}
          >
            {AVAILABLE_SPECS.map(spec => (
              <option key={spec} value={spec}>
                {spec.charAt(0).toUpperCase() + spec.slice(1).replace(/-/g, ' ')}
              </option>
            ))}
          </select>
        </div>

        {/* Show Overlays */}
        <div className="mb-10">
          <h3 className="text-sm font-semibold text-white mb-5">Show Overlays</h3>
          <div className="space-y-4">
            <label className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={showSections}
                onChange={(e) => setShowSections(e.target.checked)}
                className="w-4 h-4"
              />
              <span className="text-sm text-slate-300">Pages</span>
            </label>
            <label className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={showBlocks}
                onChange={(e) => setShowBlocks(e.target.checked)}
                className="w-4 h-4"
              />
              <span className="text-sm text-slate-300">Blocks</span>
            </label>
            <label className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={showSubsections}
                onChange={(e) => setShowSubsections(e.target.checked)}
                className="w-4 h-4"
              />
              <span className="text-sm text-slate-300">Subsections</span>
            </label>
          </div>
        </div>

        {/* Screenshot Zoom */}
        <div className="mb-10">
          <h3 className="text-sm font-semibold text-white mb-5">Screenshot Zoom</h3>
          <div className="text-xs text-slate-400 mb-2">50%    {' '.repeat(20)}    200%</div>
          <input
            type="range"
            min="50"
            max="200"
            value={zoom}
            onChange={(e) => setZoom(Number(e.target.value))}
            className="w-full mb-3"
          />
          <div className="text-center text-lg font-semibold text-white">{zoom}%</div>
          <div className="flex justify-between text-xs mt-2">
            <button onClick={() => setZoom(50)} className="text-slate-400 hover:text-white cursor-pointer">50%</button>
            <button onClick={() => setZoom(75)} className="text-slate-400 hover:text-white cursor-pointer">75%</button>
            <button onClick={() => setZoom(100)} className="text-slate-400 hover:text-white cursor-pointer">100%</button>
            <button onClick={() => setZoom(150)} className="text-slate-400 hover:text-white cursor-pointer">150%</button>
          </div>
        </div>

        {/* Read-only notice */}
        <div className="rounded p-5 mb-10" style={{backgroundColor: '#15284B20', borderColor: '#15284B', borderWidth: '1px'}}>
          <div className="text-xs font-semibold text-blue-300 mb-1">📖 READ-ONLY MODE</div>
          <div className="text-xs text-slate-400">
            This tool displays compiled JSON from the ExportSpec Compiler.
            Edit source TXT files and recompile to update.
          </div>
        </div>

        {/* Download buttons */}
        <div className="space-y-3 mb-8">
          <button
            onClick={handleDownloadTXT}
            className="w-full bg-purple-600 hover:bg-purple-700 text-white py-3 rounded font-semibold"
          >
            📄 Download TXT
          </button>
          <button
            onClick={handleDownloadJSON}
            disabled={!specData}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-slate-600 disabled:cursor-not-allowed text-white py-3 rounded font-semibold"
          >
            ⬇️ Download JSON
          </button>
          <button
            onClick={handleDownloadAllTXT}
            className="w-full bg-green-600 hover:bg-green-700 text-white py-3 rounded font-semibold"
          >
            📦 Download All TXT Files
          </button>
        </div>

        {/* Spec info */}
        {specData && (
          <div className="bg-slate-700/50 rounded p-5 mb-10">
            <div className="text-xs font-semibold text-slate-300 mb-2">Loaded Spec</div>
            <div className="text-xs text-slate-400">
              Template: {specData.page_template}<br />
              Sections: {specData.sections.length}<br />
              Source: compiled-specs/{currentPage}.json
            </div>
          </div>
        )}

        {/* Edit Mode Controls */}
        <div className="border-t border-slate-700 pt-10 mt-10">
          <h3 className="text-sm font-semibold text-white mb-5">Position Editor</h3>
          
          <label className="flex items-center gap-2 mb-3">
            <input
              type="checkbox"
              checked={editMode}
              onChange={(e) => setEditMode(e.target.checked)}
              className="w-4 h-4"
            />
            <span className="text-sm text-slate-300">Edit Mode</span>
          </label>

          {editMode && (
            <div className="text-xs text-slate-400 mb-3 p-2 bg-blue-900/20 rounded">
              💡 Drag blue section labels to reposition boundaries<br />
              💡 Drag red tags to reposition them on the screenshot
            </div>
          )}

          {hasUnsavedChanges && (
            <button
              onClick={handleSavePositions}
              className="w-full bg-green-600 hover:bg-green-700 text-white py-2 rounded mb-2 font-semibold text-sm"
            >
              💾 Save Positions
            </button>
          )}
        </div>
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
            {/* Screenshot container */}
            <div className="relative w-[1440px]">
              {/* Screenshot or fallback */}
              <div 
                className="relative w-full bg-slate-800 border border-slate-700"
              >
                <img 
                  src={`/screenshots/${currentPage}.png`}
                  alt={`${currentPage} screenshot`}
                  className="w-full h-auto block"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none'
                    const fallback = e.currentTarget.parentElement?.querySelector('.fallback') as HTMLElement
                    if (fallback) fallback.style.display = 'block'
                  }}
                />
                <div className="fallback h-[3000px] bg-gradient-to-b from-blue-900/20 to-slate-900/20" style={{display: 'none'}} />
              </div>
              
              {/* Overlay layer (separate from image) */}
              <div 
                className="absolute inset-0 pointer-events-none"
                onDrop={handleDrop}
                onDragOver={(e) => e.preventDefault()}
                style={{ pointerEvents: editMode ? 'auto' : 'none' }}
              >
                
                {/* Section Overlays */}
                {showSections && specData.sections.map((section: any, idx) => {
                  const sectionTop = section.layout?.top || `${idx * 10}%`
                  // Calculate height as distance to next section (or 100% for last)
                  const nextSection = specData.sections[idx + 1] as any
                  const nextTop = nextSection?.layout?.top || `${(idx + 1) * 10}%`
                  const topPercent = parseFloat(sectionTop)
                  const nextPercent = idx === specData.sections.length - 1 ? 100 : parseFloat(nextTop)
                  const sectionHeight = `${nextPercent - topPercent}%`
                  
                  return (
                    <div
                      key={idx}
                      className="absolute left-0 right-0 border-2 border-blue-500/50 bg-blue-500/10"
                      style={{
                        top: sectionTop,
                        height: sectionHeight
                      }}
                    >
                      <div 
                        draggable={editMode}
                        onDragStart={(e) => handleDragStart(e, 'section', idx, null, null)}
                        className={`absolute top-0 left-0 bg-blue-600 text-white px-2 py-1 text-xs font-semibold ${editMode ? 'cursor-move' : 'pointer-events-none'}`}
                      >
                        {section.section_name} — {section['data-page-section']}
                      </div>
                    </div>
                  )
                })}

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
                        draggable={editMode}
                        onDragStart={(e) => handleDragStart(e, 'subsection', sIdx, bIdx, subIdx)}
                        className={`absolute bg-red-500 text-white px-3 py-1 text-xs font-semibold rounded ${editMode ? 'cursor-move hover:bg-red-600' : ''}`}
                        style={{
                          top: subsection.position?.top || `${sIdx * 10 + 2 + subIdx * 0.5}%`,
                          left: subsection.position?.left || `${bIdx * 20 + 2}%`,
                          transform: 'translate(-50%, -50%)'
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
                      draggable={editMode}
                      onDragStart={(e) => handleDragStart(e, 'subsection', sIdx, null, subIdx)}
                      className={`absolute bg-red-500 text-white px-3 py-1 text-xs font-semibold rounded ${editMode ? 'cursor-move hover:bg-red-600' : ''}`}
                      style={{
                        top: subsection.position?.top || `${sIdx * 10 + 2 + subIdx * 0.5}%`,
                        left: subsection.position?.left || '2%',
                        transform: 'translate(-50%, -50%)'
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
