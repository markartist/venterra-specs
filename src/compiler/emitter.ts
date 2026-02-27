/**
 * EXPORTSPEC JSON EMITTER
 * 
 * Emits ExportSpec v1.0 JSON from parsed structure.
 * Deterministic. No additions. No transformations.
 */

import { ParsedSpec } from './parser';

export function emitExportSpecJSON(parsed: ParsedSpec): string {
  // Build JSON object exactly matching parsed structure
  const output: any = {
    page_template: parsed.page_template,
    sections: []
  };
  
  for (const section of parsed.sections) {
    const sectionObj: any = {
      section_number: section.section_number,
      section_name: section.section_name,
      'data-page-section': section['data-page-section'],
      'data-page-section-location': section['data-page-section-location']
    };
    
    // If blocks exist, add them
    if (section.blocks && section.blocks.length > 0) {
      sectionObj.blocks = [];
      for (const block of section.blocks) {
        const blockObj: any = {
          subsections: []
        };
        
        // Only add block_id if it exists
        if (block.block_id) {
          blockObj.block_id = block.block_id;
        }
        
        // Only add data-sub-section if it exists
        if (block['data-sub-section']) {
          blockObj['data-sub-section'] = block['data-sub-section'];
        }
        
        // Add subsections
        for (const subsection of block.subsections) {
          const subsectionObj: any = {
            'data-component-name': subsection['data-component-name']
          };
          
          // Only add data-action if it exists
          if (subsection['data-action']) {
            subsectionObj['data-action'] = subsection['data-action'];
          }
          
          // Only add element_label if it exists
          if (subsection['element_label']) {
            subsectionObj['element_label'] = subsection['element_label'];
          }
          
          blockObj.subsections.push(subsectionObj);
        }
        
        sectionObj.blocks.push(blockObj);
      }
    }
    
    // If subsections exist directly under section (no blocks), add them
    if (section.subsections && section.subsections.length > 0) {
      sectionObj.subsections = [];
      for (const subsection of section.subsections) {
        const subsectionObj: any = {
          'data-component-name': subsection['data-component-name']
        };
        
        // Only add data-action if it exists
        if (subsection['data-action']) {
          subsectionObj['data-action'] = subsection['data-action'];
        }
        
        // Only add element_label if it exists
        if (subsection['element_label']) {
          subsectionObj['element_label'] = subsection['element_label'];
        }
        
        sectionObj.subsections.push(subsectionObj);
      }
    }
    
    output.sections.push(sectionObj);
  }
  
  // Deterministic JSON serialization (2 space indent, sorted keys disabled for order preservation)
  return JSON.stringify(output, null, 2);
}
