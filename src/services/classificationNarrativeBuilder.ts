/**
 * Classification Narrative Builder — maps decision tree answers to W-heading narrative.
 *
 * Every question node in the info-type and notification-severity trees has a mapping
 * that contributes to one of the four W-heading sections (What/Who/When/What to do).
 * The narrative grows progressively as the user clicks through the classification.
 */

import type { PathEntry } from '@/types/decisionTree'

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
// Mapping table — covers all 11 question nodes across both trees
// ---------------------------------------------------------------------------

const NARRATIVE_MAP: Record<string, NodeMapper> = {
  // === Information-Type Tree (5 question nodes) ===

  start: (label) => {
    if (label.includes('acting right now')) {
      return { section: 'what', text: 'A user-facing event occurred during active interaction.', mode: 'set' }
    }
    // "No — it happens in the background"
    return { section: 'what', text: 'A background system event occurred.', mode: 'set' }
  },

  user_problem_check: (label) => {
    if (label.includes('problem')) {
      return { section: 'what', text: 'Something went wrong.', mode: 'append' }
    }
    // "No — everything worked"
    return { section: 'what', text: 'The action completed successfully.', mode: 'append' }
  },

  user_form_check: (label) => {
    if (label.includes('guides')) {
      return { section: 'what', text: 'A form field needs user guidance.', mode: 'set' }
    }
    // "No — the user completed an action"
    return { section: 'what', text: 'The user completed an action.', mode: 'append' }
  },

  user_outcome: (label) => {
    if (label.includes('record')) {
      return { section: 'what', text: 'A completed transaction the user needs to reference.', mode: 'set' }
    }
    if (label.includes('progress')) {
      return { section: 'what', text: 'A process was started that shows progress.', mode: 'set' }
    }
    // "A quick acknowledgment"
    return { section: 'what', text: 'A brief acknowledgment of a completed action.', mode: 'set' }
  },

  system_temporality: (label) => {
    if (label.includes('live status')) {
      return { section: 'what', text: 'A live system status needs to be displayed.', mode: 'set' }
    }
    // "A message about something that happened or will happen"
    return { section: 'what', text: 'An event notification needs to be communicated to users.', mode: 'set' }
  },

  // === Notification-Severity Tree (6 question nodes) ===

  platform: (label) => {
    if (label.includes('complete outage')) {
      return { section: 'what', text: 'The entire platform is down.', mode: 'append' }
    }
    // "No — some or all services work"
    return { section: 'what', text: 'Part of the platform is still operational.', mode: 'append' }
  },

  security: (label) => {
    if (label.includes('security or compliance')) {
      return { section: 'what', text: 'This involves a security or compliance issue.', mode: 'append' }
    }
    // "No" — no narrative contribution
    return null
  },

  impact: (label) => {
    if (label.includes('blocked')) {
      return { section: 'who', text: 'Users are blocked from completing their tasks.', mode: 'set' }
    }
    if (label.includes('degraded')) {
      return { section: 'who', text: 'Users experience degraded service but can still work.', mode: 'set' }
    }
    // "Yes — no impact on their work"
    return { section: 'who', text: 'Users are not currently impacted.', mode: 'set' }
  },

  blocked_scope: (label) => {
    if (label.includes('Many')) {
      return { section: 'who', text: 'Many users are affected.', mode: 'append' }
    }
    if (label.includes('One')) {
      return { section: 'who', text: 'A single user is affected.', mode: 'append' }
    }
    // "A few users"
    return { section: 'who', text: 'A limited group of users is affected.', mode: 'append' }
  },

  degraded_scope: (label) => {
    // Same logic as blocked_scope — scope question is identical
    if (label.includes('Many')) {
      return { section: 'who', text: 'Many users are affected.', mode: 'append' }
    }
    if (label.includes('One')) {
      return { section: 'who', text: 'A single user is affected.', mode: 'append' }
    }
    return { section: 'who', text: 'A limited group of users is affected.', mode: 'append' }
  },

  action: (label) => {
    if (label.includes('action required')) {
      return { section: 'whatToDo', text: 'Users need to take action.', mode: 'set' }
    }
    // "No — just informational"
    return { section: 'whatToDo', text: 'No action required — this is informational.', mode: 'set' }
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
    when: 'NOW',
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

  // Append trigger from classification result (e.g. "Blocking — many users")
  if (resultTrigger) {
    sections.what = sections.what
      ? `${sections.what} Trigger: ${resultTrigger}`
      : resultTrigger
  }

  return formatWHeadings(sections)
}

/**
 * Format sections into W-heading text.
 * Only includes sections with content (What: is always included).
 */
function formatWHeadings(sections: Record<Section, string>): string {
  const parts: string[] = []

  for (const section of SECTION_ORDER) {
    const text = sections[section]
    // Always include What: even if empty, skip others if empty
    if (!text && section !== 'what') continue

    parts.push(`${SECTION_HEADINGS[section]}\n${text || '(to be determined)'}`)
  }

  return parts.join('\n\n')
}
