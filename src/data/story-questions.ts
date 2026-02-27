/**
 * Story Questions — defines the adaptive question flow and internal checklist
 * for the Event Story Builder.
 *
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
    { id: 'event_kind', label: t('sq.cl.eventKind'), confirmLabel: t('sq.cl.eventKind.confirm'), category: 'what', filled: false, value: null, description: null, evidence: null, source: null, verified: false },
    { id: 'who_affected', label: t('sq.cl.whoAffected'), confirmLabel: t('sq.cl.whoAffected.confirm'), category: 'who', filled: false, value: null, description: null, evidence: null, source: null, verified: false },
    { id: 'impact_scope', label: t('sq.cl.impactScope'), confirmLabel: t('sq.cl.impactScope.confirm'), category: 'impact', filled: false, value: null, description: null, evidence: null, source: null, verified: false },
    { id: 'user_impact', label: t('sq.cl.userImpact'), confirmLabel: t('sq.cl.userImpact.confirm'), category: 'impact', filled: false, value: null, description: null, evidence: null, source: null, verified: false },
    { id: 'timing', label: t('sq.cl.timing'), confirmLabel: t('sq.cl.timing.confirm'), category: 'timing', filled: false, value: null, description: null, evidence: null, source: null, verified: false },
    { id: 'action_required', label: t('sq.cl.actionRequired'), confirmLabel: t('sq.cl.actionRequired.confirm'), category: 'action', filled: false, value: null, description: null, evidence: null, source: null, verified: false },
    { id: 'what_to_do', label: t('sq.cl.whatToDo'), confirmLabel: t('sq.cl.whatToDo.confirm'), category: 'action', filled: false, value: null, description: null, evidence: null, source: null, verified: false },
    { id: 'security', label: t('sq.cl.security'), confirmLabel: t('sq.cl.security.confirm'), category: 'context', filled: false, value: null, description: null, evidence: null, source: null, verified: false },
    { id: 'error_location', label: t('sq.cl.errorLocation'), confirmLabel: t('sq.cl.errorLocation.confirm'), category: 'context', filled: false, value: null, description: null, evidence: null, source: null, verified: false },
    { id: 'field_context', label: t('sq.cl.fieldContext'), confirmLabel: t('sq.cl.fieldContext.confirm'), category: 'context', filled: false, value: null, description: null, evidence: null, source: null, verified: false },
  ]
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

export function getItem(cl: StoryChecklistItem[], id: string): StoryChecklistItem {
  return cl.find(item => item.id === id)!
}

const KNOWN_EVENT_KINDS = ['system_change', 'error_issue', 'user_action', 'process_update']

/** Look up the human-readable option label for a value. Falls back to the fallback string. */
function evidenceFor(questionId: string, val: string, fallback: string): string {
  const q = getStoryQuestions().find(q => q.id === questionId)
  const opt = q?.options.find(o => o.value === val)
  return opt ? opt.label : fallback
}

/** Check if event_kind is one of the given known values, OR is freeform text (not a known enum). */
function kindMatches(cl: StoryChecklistItem[], ...kinds: string[]): boolean {
  const kind = getItem(cl, 'event_kind')
  if (!kind.filled) return false
  const val = kind.value as string
  if (KNOWN_EVENT_KINDS.includes(val)) return kinds.includes(val)
  // Freeform text — follow the general (system_change) path
  return kinds.includes('system_change')
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
  origin: 'default' | 'verify' | 'followup'
  targetChecklistItems: string[]
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
 */
export function getStoryQuestions(): StoryQuestionDef[] {
  return [
    // Q1: What kind of change are you communicating? (always first, single choice)
    {
      id: 'event_kind',
      text: t('sq.eventKind.text'),
      helpText: t('sq.eventKind.help'),
      type: 'single',
      options: [
        { value: 'system_change', label: t('sq.eventKind.systemChange'), description: t('sq.eventKind.systemChange.desc') },
        { value: 'error_issue', label: t('sq.eventKind.errorIssue'), description: t('sq.eventKind.errorIssue.desc') },
        { value: 'user_action', label: t('sq.eventKind.userAction'), description: t('sq.eventKind.userAction.desc') },
        { value: 'process_update', label: t('sq.eventKind.processUpdate'), description: t('sq.eventKind.processUpdate.desc') },
      ],
      allowFreeform: true,
      freeformPlaceholder: t('sq.eventKind.freeform'),
      checklistTargets: ['event_kind'],
      condition: (cl) => !getItem(cl, 'event_kind').filled,
      mapAnswer: (opts, text) => {
        const patches: ChecklistPatch[] = []
        if (opts[0]) {
          patches.push(patch('event_kind', opts[0], evidenceFor('event_kind', opts[0], opts[0])))
        } else if (text) {
          patches.push(patch('event_kind', text, text, 'llm'))
        }
        if (text) patches.push(patch('what_happened', text, text))
        return patches
      },
    },

    // Q2: Describe what happened (freeform, after event kind is set)
    {
      id: 'what_happened',
      text: t('sq.whatHappened.text'),
      helpText: t('sq.whatHappened.help'),
      type: 'single',
      options: [],
      allowFreeform: true,
      freeformPlaceholder: t('sq.whatHappened.freeform'),
      checklistTargets: ['what_happened'],
      condition: (cl) => getItem(cl, 'event_kind').filled && !getItem(cl, 'what_happened').filled,
      mapAnswer: (_opts, text) => {
        if (text) return [patch('what_happened', text, text)]
        return []
      },
    },

    // Q3: Who is affected? (always asked after what_happened)
    {
      id: 'who_affected',
      text: t('sq.whoAffected.text'),
      helpText: t('sq.whoAffected.help'),
      type: 'multiple',
      options: [
        { value: 'all_users', label: t('sq.whoAffected.allUsers') },
        { value: 'specific_group', label: t('sq.whoAffected.specificGroup'), description: t('sq.whoAffected.specificGroup.desc') },
        { value: 'admins', label: t('sq.whoAffected.admins') },
        { value: 'external_partners', label: t('sq.whoAffected.externalPartners') },
      ],
      allowFreeform: true,
      freeformPlaceholder: t('sq.whoAffected.freeform'),
      checklistTargets: ['who_affected'],
      condition: (cl) => {
        return getItem(cl, 'what_happened').filled
          && !getItem(cl, 'who_affected').filled
      },
      mapAnswer: (opts, text) => {
        const combined = text ? [...opts, text] : opts
        if (combined.length > 0) {
          const labels = combined.map(v => evidenceFor('who_affected', v, v))
          return [patch('who_affected', combined, labels.join(', '))]
        }
        return []
      },
    },

    // Q4: What is the scope of impact?
    {
      id: 'impact_scope',
      text: t('sq.impactScope.text'),
      helpText: t('sq.impactScope.help'),
      type: 'single',
      options: [
        { value: 'widespread', label: t('sq.impactScope.widespread'), description: t('sq.impactScope.widespread.desc') },
        { value: 'limited', label: t('sq.impactScope.limited'), description: t('sq.impactScope.limited.desc') },
        { value: 'individual', label: t('sq.impactScope.individual'), description: t('sq.impactScope.individual.desc') },
      ],
      allowFreeform: false,
      checklistTargets: ['impact_scope'],
      condition: (cl) => {
        return getItem(cl, 'who_affected').filled
          && !getItem(cl, 'impact_scope').filled
      },
      mapAnswer: (opts) => {
        const val = opts[0] || 'limited'
        return [patch('impact_scope', val, evidenceFor('impact_scope', val, val))]
      },
    },

    // Q5: Where does the error occur?
    {
      id: 'error_location',
      text: t('sq.errorLocation.text'),
      helpText: t('sq.errorLocation.help'),
      type: 'single',
      options: [
        { value: 'specific_field', label: t('sq.errorLocation.specificField') },
        { value: 'whole_page', label: t('sq.errorLocation.wholePage') },
        { value: 'background', label: t('sq.errorLocation.background') },
        { value: 'api', label: t('sq.errorLocation.api') },
      ],
      allowFreeform: true,
      freeformPlaceholder: t('sq.errorLocation.freeform'),
      checklistTargets: ['error_location'],
      condition: (cl) => {
        return getItem(cl, 'impact_scope').filled
          && !getItem(cl, 'error_location').filled
      },
      mapAnswer: (opts, text) => {
        const val = opts[0] || text
        if (val) {
          const patches = [patch('error_location', val, evidenceFor('error_location', val, text || val))]
          if (opts.includes('specific_field')) {
            patches.push(patch('field_context', 'specific_field', t('sq.evidence.fieldLevelError')))
          }
          return patches
        }
        return []
      },
    },

    // Q6: What triggered this?
    {
      id: 'user_action_detail',
      text: t('sq.userActionDetail.text'),
      helpText: t('sq.userActionDetail.help'),
      type: 'single',
      options: [
        { value: 'form_submit', label: t('sq.userActionDetail.formSubmit') },
        { value: 'button_click', label: t('sq.userActionDetail.buttonClick') },
        { value: 'file_upload', label: t('sq.userActionDetail.fileUpload') },
        { value: 'config_change', label: t('sq.userActionDetail.configChange') },
      ],
      allowFreeform: true,
      freeformPlaceholder: t('sq.userActionDetail.freeform'),
      checklistTargets: ['field_context'],
      condition: (cl) => {
        return getItem(cl, 'error_location').filled
          && !getItem(cl, 'field_context').filled
      },
      mapAnswer: (opts, text) => {
        const val = opts[0] || text || 'user_action'
        if (opts.includes('form_submit')) {
          return [patch('field_context', 'form', t('sq.evidence.formSubmission'))]
        }
        return [patch('field_context', val, evidenceFor('user_action_detail', val, text || val))]
      },
    },

    // Q7: How are users impacted?
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
      condition: (cl) => {
        return getItem(cl, 'field_context').filled
          && !getItem(cl, 'user_impact').filled
      },
      mapAnswer: (opts, text) => {
        const val = opts[0] || text || 'no_impact'
        return [patch('user_impact', val, evidenceFor('user_impact', val, text || val))]
      },
    },

    // Q8: When is this happening?
    {
      id: 'timing',
      text: t('sq.timing.text'),
      helpText: t('sq.timing.help'),
      type: 'single',
      options: [
        { value: 'now', label: t('sq.timing.now') },
        { value: 'scheduled', label: t('sq.timing.scheduled') },
        { value: 'resolved', label: t('sq.timing.resolved') },
      ],
      allowFreeform: true,
      freeformPlaceholder: t('sq.timing.freeform'),
      checklistTargets: ['timing'],
      condition: (cl) => {
        return getItem(cl, 'user_impact').filled
          && !getItem(cl, 'timing').filled
      },
      mapAnswer: (opts, text) => {
        const val = opts[0] || text || 'now'
        return [patch('timing', val, evidenceFor('timing', val, text || val))]
      },
    },

    // Q9: Is user action required?
    {
      id: 'action_required',
      text: t('sq.actionRequired.text'),
      helpText: t('sq.actionRequired.help'),
      type: 'single',
      options: [
        { value: 'mandatory', label: t('sq.actionRequired.mandatory'), description: t('sq.actionRequired.mandatory.desc') },
        { value: 'recommended', label: t('sq.actionRequired.recommended'), description: t('sq.actionRequired.recommended.desc') },
        { value: 'no', label: t('sq.actionRequired.no'), description: t('sq.actionRequired.no.desc') },
      ],
      allowFreeform: true,
      freeformPlaceholder: t('sq.actionRequired.freeform'),
      checklistTargets: ['action_required'],
      condition: (cl) => {
        return getItem(cl, 'timing').filled
          && !getItem(cl, 'action_required').filled
      },
      mapAnswer: (opts, text) => {
        const val = opts[0] || text || 'no'
        return [patch('action_required', val, evidenceFor('action_required', val, text || val))]
      },
    },

    // Q10: What should users do?
    {
      id: 'what_to_do',
      text: t('sq.whatToDo.text'),
      helpText: t('sq.whatToDo.help'),
      type: 'single',
      options: [],
      allowFreeform: true,
      freeformPlaceholder: t('sq.whatToDo.freeform'),
      checklistTargets: ['what_to_do'],
      condition: (cl) => {
        return getItem(cl, 'action_required').filled
          && !getItem(cl, 'what_to_do').filled
      },
      mapAnswer: (_opts, text) => {
        if (text) return [patch('what_to_do', text, text)]
        return []
      },
    },

    // Q11: Security implications?
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
      condition: (cl) => {
        return getItem(cl, 'what_to_do').filled
          && !getItem(cl, 'security').filled
      },
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
