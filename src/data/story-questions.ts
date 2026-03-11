/**
 * Story Questions — defines the linear question flow and internal checklist
 * for the Event Story Builder.
 *
 * The flow captures 6 core aspects of an event:
 *   1. What triggered it (event_trigger → auto-derives timing)
 *   2. What happened (what_happened)
 *   3. Who is affected (who_affected → auto-derives impact_scope)
 *   4. Are users blocked (user_impact)
 *   5. Do users need to act (action_required → what_to_do)
 *   6. Security concerns (security)
 *
 * All events go through a single classification path: Notification → Severity.
 * Classification, composition, and channel quality are in story-classification.ts.
 */

import { t } from '@/i18n'

// ---------------------------------------------------------------------------
// Checklist (hidden from user — drives classification)
// ---------------------------------------------------------------------------

export interface StoryChecklistItem {
  id: string
  label: string
  confirmLabel: string
  category: 'what' | 'who' | 'impact' | 'timing' | 'action' | 'context'
  filled: boolean
  value: string | string[] | null
  description: string | null
  evidence: string | null
  source: 'user' | 'llm' | null
  verified: boolean
}

export function createDefaultChecklist(): StoryChecklistItem[] {
  return [
    { id: 'what_happened', label: t('sq.cl.whatHappened'), confirmLabel: t('sq.cl.whatHappened.confirm'), category: 'what', filled: false, value: null, description: null, evidence: null, source: null, verified: false },
    { id: 'event_trigger', label: t('sq.cl.eventTrigger'), confirmLabel: t('sq.cl.eventTrigger.confirm'), category: 'what', filled: false, value: null, description: null, evidence: null, source: null, verified: false },
    { id: 'who_affected', label: t('sq.cl.whoAffected'), confirmLabel: t('sq.cl.whoAffected.confirm'), category: 'who', filled: false, value: null, description: null, evidence: null, source: null, verified: false },
    { id: 'impact_scope', label: t('sq.cl.impactScope'), confirmLabel: t('sq.cl.impactScope.confirm'), category: 'impact', filled: false, value: null, description: null, evidence: null, source: null, verified: false },
    { id: 'user_impact', label: t('sq.cl.userImpact'), confirmLabel: t('sq.cl.userImpact.confirm'), category: 'impact', filled: false, value: null, description: null, evidence: null, source: null, verified: false },
    { id: 'timing', label: t('sq.cl.timing'), confirmLabel: t('sq.cl.timing.confirm'), category: 'timing', filled: false, value: null, description: null, evidence: null, source: null, verified: false },
    { id: 'action_required', label: t('sq.cl.actionRequired'), confirmLabel: t('sq.cl.actionRequired.confirm'), category: 'action', filled: false, value: null, description: null, evidence: null, source: null, verified: false },
    { id: 'what_to_do', label: t('sq.cl.whatToDo'), confirmLabel: t('sq.cl.whatToDo.confirm'), category: 'action', filled: false, value: null, description: null, evidence: null, source: null, verified: false },
    { id: 'security', label: t('sq.cl.security'), confirmLabel: t('sq.cl.security.confirm'), category: 'context', filled: false, value: null, description: null, evidence: null, source: null, verified: false },
  ]
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

export function getItem(cl: StoryChecklistItem[], id: string): StoryChecklistItem {
  return cl.find(item => item.id === id)!
}

/** Look up the human-readable option label for a value. Falls back to the fallback string. */
function evidenceFor(questionId: string, val: string, fallback: string): string {
  const q = getStoryQuestions().find(q => q.id === questionId)
  const opt = q?.options.find(o => o.value === val)
  return opt ? opt.label : fallback
}

// ---------------------------------------------------------------------------
// Patch type — returned by mapAnswer for decoupled state mutation
// ---------------------------------------------------------------------------

export interface ChecklistPatch {
  id: string
  value: string | string[]
  evidence: string
  source?: 'user' | 'llm'
  description?: string
}

/** Build a patch object (pure — no mutation). */
function patch(id: string, value: string | string[], evidence: string, source: 'user' | 'llm' = 'user', description?: string): ChecklistPatch {
  return { id, value, evidence, source, description }
}

/** Apply an array of patches to the checklist (single mutation point). */
export function applyPatches(cl: StoryChecklistItem[], patches: ChecklistPatch[]) {
  for (const p of patches) {
    const item = cl.find(i => i.id === p.id)
    if (item) {
      item.filled = true
      item.value = p.value
      item.description = p.description ?? null
      item.evidence = p.evidence
      item.source = p.source ?? 'user'
      item.verified = (p.source ?? 'user') === 'user'
    }
  }
}

export function fillItem(
  cl: StoryChecklistItem[],
  id: string,
  value: string | string[],
  evidence: string,
  source: 'user' | 'llm' = 'user',
  description?: string,
) {
  applyPatches(cl, [patch(id, value, evidence, source, description)])
}

// ---------------------------------------------------------------------------
// Question Definitions
// ---------------------------------------------------------------------------

export interface StoryQuestionOption {
  value: string
  label: string
  description?: string
}

// ---------------------------------------------------------------------------
// Renderable Question (unified type for UI — default or verification)
// ---------------------------------------------------------------------------

export interface RenderableQuestion {
  id: string
  text: string
  helpText?: string
  inputType: 'single' | 'multiple' | 'freeform'
  options: StoryQuestionOption[]
  allowFreeform: boolean
  freeformPlaceholder?: string
  origin: 'default' | 'verify' | 'followup' | 'tree'
  targetChecklistItems?: string[]
  // Verification-specific:
  verifyItemId?: string
  verifyValue?: string | string[]
  verifyEvidence?: string
  /** Full source text (user answer) that contains the evidence — for showing context */
  verifySourceContext?: string
}

export interface StoryQuestionDef {
  id: string
  text: string
  helpText?: string
  type: 'single' | 'multiple'
  options: StoryQuestionOption[]
  allowFreeform: boolean
  freeformPlaceholder?: string
  checklistTargets: string[]
  condition: (checklist: StoryChecklistItem[]) => boolean
  mapAnswer: (selectedOptions: string[], freeformText: string, checklist: StoryChecklistItem[]) => ChecklistPatch[]
}

/**
 * Returns the story question definitions with translated strings.
 * Called on each access so t() resolves to the current locale.
 *
 * Linear flow — no branching. All 6 questions are asked in order,
 * with what_to_do as an optional follow-up within the action question.
 */
export function getStoryQuestions(): StoryQuestionDef[] {
  return [
    // Q1: What triggered this event? (single choice + freeform)
    // Fills: event_trigger, timing (auto-derived), what_happened (if freeform provided)
    {
      id: 'event_trigger',
      text: t('sq.eventTrigger.text'),
      helpText: t('sq.eventTrigger.help'),
      type: 'single',
      options: [
        { value: 'user_interaction', label: t('sq.eventTrigger.userInteraction'), description: t('sq.eventTrigger.userInteraction.desc') },
        { value: 'system_runtime', label: t('sq.eventTrigger.systemRuntime'), description: t('sq.eventTrigger.systemRuntime.desc') },
        { value: 'scheduled_system', label: t('sq.eventTrigger.scheduledSystem'), description: t('sq.eventTrigger.scheduledSystem.desc') },
        { value: 'scheduled_user', label: t('sq.eventTrigger.scheduledUser'), description: t('sq.eventTrigger.scheduledUser.desc') },
      ],
      allowFreeform: true,
      freeformPlaceholder: t('sq.eventTrigger.freeform'),
      checklistTargets: ['event_trigger', 'timing'],
      condition: (cl) => !getItem(cl, 'event_trigger').filled,
      mapAnswer: (opts, text) => {
        const patches: ChecklistPatch[] = []
        if (opts[0]) {
          patches.push(patch('event_trigger', opts[0], evidenceFor('event_trigger', opts[0], opts[0])))
        } else if (text) {
          patches.push(patch('event_trigger', text, text, 'llm'))
        } else {
          return patches
        }

        // Auto-derive timing from trigger type
        const isScheduled = opts[0] === 'scheduled_system' || opts[0] === 'scheduled_user'
        const timingVal = isScheduled ? 'scheduled' : 'now'
        const timingLabel = isScheduled ? t('sq.val.timing.scheduled') : t('sq.val.timing.now')
        patches.push(patch('timing', timingVal, timingLabel, 'user'))

        // Freeform text also fills what_happened
        if (text) patches.push(patch('what_happened', text, text))

        return patches
      },
    },

    // Q2: Tell us what happened (freeform)
    // Fills: what_happened
    {
      id: 'what_happened',
      text: t('sq.whatHappened.text'),
      helpText: t('sq.whatHappened.help'),
      type: 'single',
      options: [],
      allowFreeform: true,
      freeformPlaceholder: t('sq.whatHappened.freeform'),
      checklistTargets: ['what_happened'],
      condition: (cl) => getItem(cl, 'event_trigger').filled && !getItem(cl, 'what_happened').filled,
      mapAnswer: (_opts, text) => {
        if (text) return [patch('what_happened', text, text)]
        return []
      },
    },

    // Q3: Who is affected? (single choice + optional freeform for group name)
    // Fills: who_affected, impact_scope (auto-derived)
    {
      id: 'who_affected',
      text: t('sq.whoAffected.text'),
      helpText: t('sq.whoAffected.help'),
      type: 'single',
      options: [
        { value: 'all_users', label: t('sq.whoAffected.allUsers') },
        { value: 'specific_group', label: t('sq.whoAffected.specificGroup'), description: t('sq.whoAffected.specificGroup.desc') },
        { value: 'single_user', label: t('sq.whoAffected.singleUser') },
      ],
      allowFreeform: true,
      freeformPlaceholder: t('sq.whoAffected.freeform'),
      checklistTargets: ['who_affected', 'impact_scope'],
      condition: (cl) => getItem(cl, 'what_happened').filled && !getItem(cl, 'who_affected').filled,
      mapAnswer: (opts, text) => {
        const val = opts[0] || text
        if (!val) return []

        const patches: ChecklistPatch[] = []

        if (opts[0]) {
          const label = evidenceFor('who_affected', opts[0], opts[0])
          // If specific_group and freeform provided, include group name in evidence
          const displayEvidence = opts[0] === 'specific_group' && text ? `${label}: ${text}` : label
          patches.push(patch('who_affected', opts[0], displayEvidence, 'user', text && opts[0] === 'specific_group' ? text : undefined))
        } else {
          patches.push(patch('who_affected', text, text))
        }

        // Auto-derive impact_scope from audience selection
        const primary = opts[0] || 'limited'
        let scope: string
        if (primary === 'all_users') scope = 'widespread'
        else if (primary === 'single_user') scope = 'individual'
        else scope = 'limited'

        const scopeLabelMap: Record<string, string> = {
          widespread: t('sq.impactScope.widespread'),
          limited: t('sq.impactScope.limited'),
          individual: t('sq.impactScope.individual'),
        }
        const scopeLabel = scopeLabelMap[scope] || scope
        patches.push(patch('impact_scope', scope, scopeLabel, 'user', scopeLabel))

        return patches
      },
    },

    // Q4: Are users blocked? (single choice, 3 levels)
    // Fills: user_impact
    {
      id: 'user_impact',
      text: t('sq.userImpact.text'),
      helpText: t('sq.userImpact.help'),
      type: 'single',
      options: [
        { value: 'blocked', label: t('sq.userImpact.blocked'), description: t('sq.userImpact.blocked.desc') },
        { value: 'degraded', label: t('sq.userImpact.degraded'), description: t('sq.userImpact.degraded.desc') },
        { value: 'no_impact', label: t('sq.userImpact.noImpact'), description: t('sq.userImpact.noImpact.desc') },
      ],
      allowFreeform: true,
      freeformPlaceholder: t('sq.userImpact.freeform'),
      checklistTargets: ['user_impact'],
      condition: (cl) => getItem(cl, 'who_affected').filled && !getItem(cl, 'user_impact').filled,
      mapAnswer: (opts, text) => {
        const val = opts[0] || text || 'no_impact'
        return [patch('user_impact', val, evidenceFor('user_impact', val, text || val))]
      },
    },

    // Q5: Do users need to take action? (yes/no + conditional what_to_do)
    // Fills: action_required, what_to_do (if freeform provided or 'no' selected)
    {
      id: 'action_required',
      text: t('sq.actionRequired.text'),
      helpText: t('sq.actionRequired.help'),
      type: 'single',
      options: [
        { value: 'mandatory', label: t('sq.actionRequired.mandatory'), description: t('sq.actionRequired.mandatory.desc') },
        { value: 'no', label: t('sq.actionRequired.no'), description: t('sq.actionRequired.no.desc') },
      ],
      allowFreeform: true,
      freeformPlaceholder: t('sq.actionRequired.freeform'),
      checklistTargets: ['action_required', 'what_to_do'],
      condition: (cl) => getItem(cl, 'user_impact').filled && !getItem(cl, 'action_required').filled,
      mapAnswer: (opts, text) => {
        const val = opts[0] || (text ? 'mandatory' : 'no')
        const patches = [patch('action_required', val, evidenceFor('action_required', val, text || val))]

        if (val === 'no') {
          // No action needed — auto-fill what_to_do
          patches.push(patch('what_to_do', 'no_action', t('story.noActionRequired'), 'user', t('story.noActionRequired')))
        } else if (text) {
          // User provided action description alongside "Yes"
          patches.push(patch('what_to_do', text, text))
        }

        return patches
      },
    },

    // Q6: What should users do? (freeform follow-up, only if action=mandatory but no description yet)
    // Fills: what_to_do
    {
      id: 'what_to_do',
      text: t('sq.whatToDo.text'),
      helpText: t('sq.whatToDo.help'),
      type: 'single',
      options: [],
      allowFreeform: true,
      freeformPlaceholder: t('sq.whatToDo.freeform'),
      checklistTargets: ['what_to_do'],
      condition: (cl) => getItem(cl, 'action_required').filled && !getItem(cl, 'what_to_do').filled,
      mapAnswer: (_opts, text) => {
        if (text) return [patch('what_to_do', text, text)]
        return []
      },
    },

    // Q7: Security concerns? (yes/no)
    // Fills: security
    {
      id: 'security',
      text: t('sq.security.text'),
      helpText: t('sq.security.help'),
      type: 'single',
      options: [
        { value: 'yes', label: t('sq.security.yes'), description: t('sq.security.yes.desc') },
        { value: 'no', label: t('sq.security.no') },
      ],
      allowFreeform: true,
      freeformPlaceholder: t('sq.security.freeform'),
      checklistTargets: ['security'],
      condition: (cl) => getItem(cl, 'what_to_do').filled && !getItem(cl, 'security').filled,
      mapAnswer: (opts, text) => {
        const val = opts[0] || text || 'no'
        return [patch('security', val, evidenceFor('security', val, text || val))]
      },
    },
  ]
}

/**
 * @deprecated Use getStoryQuestions() instead — kept for backward compatibility during migration.
 */
export const storyQuestions: StoryQuestionDef[] = getStoryQuestions()

// Re-export classification, composition, and channel quality from their new home
export {
  deriveClassification,
  composeStory,
  assessChannelQuality,
  type StoryClassification,
  type ChannelQuality,
} from './story-classification'
