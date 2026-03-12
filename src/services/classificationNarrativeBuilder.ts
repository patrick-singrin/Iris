/**
 * Classification Narrative Builder — maps Phase 1 answers to W-heading narrative.
 *
 * Every classification question has a mapping that contributes to one of the
 * four W-heading sections (What/Who/When/What to do). The narrative grows
 * progressively as the user clicks through the classification.
 *
 * Rewritten for flat sequential questions (Decision #27). Keys are now
 * flat question IDs (category, security, scope, etc.) rather than tree node IDs.
 */

import type { PathEntry } from '@/data/classification-questions'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type Section = 'what' | 'who' | 'when' | 'whatToDo'

interface NarrativeContribution {
  section: Section
  text: string
  /** 'set' replaces the section, 'append' adds detail after existing text */
  mode: 'set' | 'append'
}

type NodeMapper = (selectedLabel: string) => NarrativeContribution | null

// ---------------------------------------------------------------------------
// Mapping table — covers all 10 question nodes (5 core + 5 management)
// ---------------------------------------------------------------------------

const NARRATIVE_MAP: Record<string, NodeMapper> = {
  // === Core questions (Q1–Q5) ===

  category: (label) => {
    if (label.toLowerCase().includes('core') || label.toLowerCase().includes('kern')) {
      return { section: 'what', text: 'An event affecting the core product.', mode: 'set' }
    }
    if (label.toLowerCase().includes('feature') || label.toLowerCase().includes('funktion') || label.toLowerCase().includes('plattform')) {
      return { section: 'what', text: 'An event affecting a platform feature.', mode: 'set' }
    }
    return { section: 'what', text: 'An event in the management interface.', mode: 'set' }
  },

  security: (label) => {
    if (label.toLowerCase().includes('yes') || label.toLowerCase().includes('ja')) {
      return { section: 'what', text: 'A security or compliance issue.', mode: 'append' }
    }
    return null // "No" is routing — no narrative value
  },

  platform_down: (label) => {
    if (label.toLowerCase().includes('yes') || label.toLowerCase().includes('ja') || label.toLowerCase().includes('complete') || label.toLowerCase().includes('vollständig')) {
      return { section: 'what', text: 'The entire platform is down.', mode: 'append' }
    }
    return null
  },

  scope: (label) => {
    const l = label.toLowerCase()
    if (l.includes('nothing') || l.includes('nichts') || l.includes('none')) {
      return { section: 'whatToDo', text: 'No action required — informational event.', mode: 'set' }
    }
    if (l.includes('all') || l.includes('alle')) {
      return { section: 'who', text: 'All services are affected.', mode: 'set' }
    }
    if (l.includes('some') || l.includes('einige')) {
      return { section: 'who', text: 'Some services are affected.', mode: 'set' }
    }
    if (l.includes('one') || l.includes('ein dienst')) {
      return { section: 'who', text: 'A single service is affected.', mode: 'set' }
    }
    return null
  },

  reach: (label) => {
    const l = label.toLowerCase()
    if (l.includes('everyone') || l.includes('alle nutzer')) {
      return { section: 'who', text: 'All users are affected.', mode: 'append' }
    }
    if (l.includes('group') || l.includes('gruppe')) {
      return { section: 'who', text: 'A specific user group is affected.', mode: 'append' }
    }
    return { section: 'who', text: 'A single user is affected.', mode: 'append' }
  },

  // === Management questions (M1–M5) ===

  mgmt_form_field: (label) => {
    if (label.toLowerCase().includes('yes') || label.toLowerCase().includes('ja')) {
      return { section: 'what', text: 'A form field needs input guidance.', mode: 'set' }
    }
    return null // "No" routes to further questions
  },

  mgmt_trigger: (label) => {
    if (label.toLowerCase().includes('user') || label.toLowerCase().includes('nutzer')) {
      return { section: 'what', text: 'The user performed an action.', mode: 'set' }
    }
    return { section: 'what', text: 'A background system event occurred.', mode: 'set' }
  },

  mgmt_success: (label) => {
    if (label.toLowerCase().includes('no') || label.toLowerCase().includes('fehlgeschlagen')) {
      return { section: 'what', text: 'Something went wrong.', mode: 'append' }
    }
    return { section: 'what', text: 'The action succeeded.', mode: 'append' }
  },

  mgmt_persistence: (label) => {
    if (label.toLowerCase().includes('yes') || label.toLowerCase().includes('ja')) {
      return { section: 'what', text: 'The user needs a record of this transaction.', mode: 'set' }
    }
    return { section: 'what', text: 'A brief acknowledgment of a completed action.', mode: 'set' }
  },

  mgmt_ongoing: (label) => {
    if (label.toLowerCase().includes('yes') || label.toLowerCase().includes('ja') || label.toLowerCase().includes('ongoing') || label.toLowerCase().includes('fortlaufend')) {
      return { section: 'what', text: 'A live system status needs to be displayed.', mode: 'set' }
    }
    return { section: 'what', text: 'An event notification needs to reach users.', mode: 'set' }
  },
}

// ---------------------------------------------------------------------------
// Builder
// ---------------------------------------------------------------------------

const SECTION_HEADINGS: Record<Section, string> = {
  what: 'What:',
  who: 'Who:',
  when: 'When:',
  whatToDo: 'What to do:',
}

const SECTION_ORDER: Section[] = ['what', 'who', 'when', 'whatToDo']

/**
 * Build a progressive W-heading narrative from classification path entries.
 * Each path entry (answered question) contributes text to one of the four sections.
 */
export function buildProgressiveNarrative(
  path: PathEntry[],
  resultTrigger?: string,
): string {
  const sections: Record<Section, string> = {
    what: '',
    who: '',
    when: 'Now',
    whatToDo: '',
  }

  for (const entry of path) {
    const mapper = NARRATIVE_MAP[entry.nodeId]
    if (!mapper) continue

    const contribution = mapper(entry.selectedLabel)
    if (!contribution) continue

    if (contribution.mode === 'set' || !sections[contribution.section]) {
      sections[contribution.section] = contribution.text
    } else {
      sections[contribution.section] += ' ' + contribution.text
    }
  }

  // Append trigger from classification result (e.g. "Core product — all services")
  if (resultTrigger) {
    sections.what = sections.what
      ? `${sections.what} Trigger: ${resultTrigger}`
      : resultTrigger
  }

  return formatWHeadings(sections)
}

/** Default text shown when a section has no content yet */
const SECTION_DEFAULTS: Record<Section, string> = {
  what: '-',
  who: '-',
  when: 'Now',
  whatToDo: '-',
}

/**
 * Format sections into W-heading text.
 * All four W-sections are always shown for a consistent, scannable structure.
 */
function formatWHeadings(sections: Record<Section, string>): string {
  const parts: string[] = []

  for (const section of SECTION_ORDER) {
    const text = sections[section] || SECTION_DEFAULTS[section]
    parts.push(`${SECTION_HEADINGS[section]}\n${text}`)
  }

  return parts.join('\n\n')
}
