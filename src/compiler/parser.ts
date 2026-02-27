/**
 * GOVERNED SPEC PARSER
 * 
 * Parses governed spec TXT files (A files) into intermediate structure.
 * Zero inference. Zero normalization. Exact mirroring only.
 */

export interface ParsedSubsection {
  'data-component-name': string;
  'data-action'?: string;
  'element_label'?: string;
}

export interface ParsedBlock {
  'block_id'?: string;
  'data-sub-section'?: string;
  subsections: ParsedSubsection[];
}

export interface ParsedSection {
  section_number: string;
  section_name: string;
  'data-page-section': string;
  'data-page-section-location': string;
  blocks?: ParsedBlock[];
  subsections?: ParsedSubsection[];
}

export interface ParsedSpec {
  page_template: string;
  sections: ParsedSection[];
}

export function parseGovernedSpec(content: string): ParsedSpec {
  const lines = content.split('\n');
  
  // Extract page template from Target line
  let page_template = '';
  for (const line of lines) {
    if (line.startsWith('Target:')) {
      page_template = line.replace('Target:', '').trim();
      break;
    }
  }
  
  const sections: ParsedSection[] = [];
  let currentSection: ParsedSection | null = null;
  let currentBlock: ParsedBlock | null = null;
  let inInteractiveElements = false;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    
    // Start of interactive elements section
    if (line.includes('INTERACTIVE ELEMENTS')) {
      inInteractiveElements = true;
      continue;
    }
    
    // End of spec
    if (line.includes('END OF VENTERRA GOVERNED SPEC CONTRACT')) {
      break;
    }
    
    if (!inInteractiveElements) continue;
    
    // Section header: section_01: PROMO_BAR
    if (line.match(/^section_(\d+):\s*(.+)$/)) {
      // Save previous section
      if (currentSection) {
        if (currentBlock) {
          if (!currentSection.blocks) currentSection.blocks = [];
          currentSection.blocks.push(currentBlock);
          currentBlock = null;
        }
        sections.push(currentSection);
      }
      
      const match = line.match(/^section_(\d+):\s*(.+)$/);
      if (match) {
        currentSection = {
          section_number: match[1],
          section_name: `SECTION_${match[1]}`,
          'data-page-section': '',
          'data-page-section-location': match[1]
        };
      }
      continue;
    }
    
    // data-page-section attribute
    if (line.match(/^data-page-section\s*=\s*"(.+)"$/)) {
      if (currentSection) {
        const match = line.match(/^data-page-section\s*=\s*"(.+)"$/);
        if (match) {
          currentSection['data-page-section'] = match[1];
        }
      }
      continue;
    }
    
    // data-page-section-location attribute
    if (line.match(/^data-page-section-location\s*=\s*"(.+)"$/)) {
      if (currentSection) {
        const match = line.match(/^data-page-section-location\s*=\s*"(.+)"$/);
        if (match) {
          currentSection['data-page-section-location'] = match[1];
        }
      }
      continue;
    }
    
    // Block header: Block: tab_navigation
    if (line.match(/^Block:\s*(.+)$/)) {
      // Save previous block
      if (currentBlock && currentSection) {
        if (!currentSection.blocks) currentSection.blocks = [];
        currentSection.blocks.push(currentBlock);
      }
      
      const match = line.match(/^Block:\s*(.+)$/);
      if (match) {
        currentBlock = {
          block_id: match[1],
          subsections: []
        };
      }
      continue;
    }
    
    // data-sub-section attribute (for blocks)
    if (line.match(/^data-sub-section\s*=\s*"(.+)"$/)) {
      if (currentBlock) {
        const match = line.match(/^data-sub-section\s*=\s*"(.+)"$/);
        if (match) {
          currentBlock['data-sub-section'] = match[1];
        }
      }
      continue;
    }
    
    // Subsection header: Subsection: open_promo_bar
    if (line.match(/^Subsection:\s*(.+)$/)) {
      const match = line.match(/^Subsection:\s*(.+)$/);
      if (match) {
        const subsection: ParsedSubsection = {
          'data-component-name': match[1]
        };
        
        // Look ahead for data-component-name and data-action
        let j = i + 1;
        while (j < lines.length && lines[j].trim() !== '' && !lines[j].trim().startsWith('Subsection:') && !lines[j].trim().startsWith('Block:') && !lines[j].trim().startsWith('section_') && !lines[j].trim().startsWith('---')) {
          const attrLine = lines[j].trim();
          
          // data-component-name
          const compMatch = attrLine.match(/^[Dd]ata-component-name\s*=\s*"(.+)"$/);
          if (compMatch) {
            subsection['data-component-name'] = compMatch[1];
          }
          
          // data-action
          const actionMatch = attrLine.match(/^[Dd]ata-action\s*=\s*"(.+)"$/);
          if (actionMatch) {
            subsection['data-action'] = actionMatch[1];
          }
          
          j++;
        }
        
        // Add subsection to current block or section
        if (currentBlock) {
          currentBlock.subsections.push(subsection);
        } else if (currentSection) {
          if (!currentSection.subsections) currentSection.subsections = [];
          currentSection.subsections.push(subsection);
        }
      }
      continue;
    }
    
    // Section separator
    if (line.match(/^-+$/)) {
      // Save current block if exists
      if (currentBlock && currentSection) {
        if (!currentSection.blocks) currentSection.blocks = [];
        currentSection.blocks.push(currentBlock);
        currentBlock = null;
      }
      continue;
    }
  }
  
  // Save final section
  if (currentSection) {
    if (currentBlock) {
      if (!currentSection.blocks) currentSection.blocks = [];
      currentSection.blocks.push(currentBlock);
    }
    sections.push(currentSection);
  }
  
  return {
    page_template,
    sections
  };
}
