/**
 * Classification Questions — flat sequential question flow for Phase 1.
 *
 * Replaces the two chained decision trees (information-type v6, notification-severity v3)
 * with a simple array of questions, each with a condition function that determines visibility
 * based on previously collected metadata.
 *
 * Three-category domain split: Core value / Capability / Management
 * - Core value & Capability → Notification type with severity
 * - Management → Type classification (Validation, Error, Feedback, etc.)
 *
 * See docs/architecture-evolution.md and Decision #22–#27.
 */

import { t } from '@/i18n'

// ---------------------------------------------------------------------------
// PathEntry — shared by narrative builder and UI history
// ---------------------------------------------------------------------------

/**
 * A single answered question in the classification path.
 * Migrated from types/decisionTree.ts — still the contract between
 * classificationStore, classificationNarrativeBuilder, and EventStoryView.
 */
export interface PathEntry {
  nodeId: string
  questionText: string
  selectedLabel: string
}

// ---------------------------------------------------------------------------
// Phase 1 Metadata — accumulated answers from classification questions
// ---------------------------------------------------------------------------

export type Category = 'core_value' | 'capability' | 'management'
export type Scope = 'all' | 'some' | 'one' | 'none'
export type Reach = 'all' | 'group' | 'single'
export type MgmtTrigger = 'user' | 'system'

export interface Phase1Metadata {
  category: Category | null
  security: boolean | null
  platform_down: boolean | null
  scope: Scope | null
  reach: Reach | null
  // Management-only fields for type classification:
  mgmt_form_field: boolean | null
  mgmt_trigger: MgmtTrigger | null
  mgmt_success: boolean | null
  mgmt_persistence: boolean | null
  mgmt_ongoing: boolean | null
}

export function createEmptyMetadata(): Phase1Metadata {
  return {
    category: null,
    security: null,
    platform_down: null,
    scope: null,
    reach: null,
    mgmt_form_field: null,
    mgmt_trigger: null,
    mgmt_success: null,
    mgmt_persistence: null,
    mgmt_ongoing: null,
  }
}

// ---------------------------------------------------------------------------
// Question Definition
// ---------------------------------------------------------------------------

export interface ClassificationOption {
  value: string
  label: string
  description?: string
}

export interface ClassificationQuestionDef {
  id: string
  text: string
  helpText?: string
  options: ClassificationOption[]
  /** Return true when this question should be shown given the collected metadata */
  condition: (metadata: Phase1Metadata) => boolean
  /** Store the selected option value into the metadata object */
  applyAnswer: (metadata: Phase1Metadata, value: string) => void
}

// ---------------------------------------------------------------------------
// Question Definitions
// ---------------------------------------------------------------------------

/**
 * Returns the classification question definitions with translated strings.
 * Called on each access so t() resolves to the current locale.
 */
export function getClassificationQuestions(): ClassificationQuestionDef[] {
  return [
    // ─────────────────────────────────────────────────────────────
    // Q1: Category (always shown)
    // ─────────────────────────────────────────────────────────────
    {
      id: 'category',
      text: t('cl.q.category.text'),
      helpText: t('cl.q.category.help'),
      options: [
        {
          value: 'core_value',
          label: t('cl.q.category.opt.core_value'),
          description: t('cl.q.category.opt.core_value.desc'),
        },
        {
          value: 'capability',
          label: t('cl.q.category.opt.capability'),
          description: t('cl.q.category.opt.capability.desc'),
        },
        {
          value: 'management',
          label: t('cl.q.category.opt.management'),
          description: t('cl.q.category.opt.management.desc'),
        },
      ],
      condition: () => true,
      applyAnswer: (m, v) => { m.category = v as Category },
    },

    // ─────────────────────────────────────────────────────────────
    // Q2: Security gate (core_value or capability)
    // ─────────────────────────────────────────────────────────────
    {
      id: 'security',
      text: t('cl.q.security.text'),
      helpText: t('cl.q.security.help'),
      options: [
        { value: 'yes', label: t('cl.q.security.opt.yes'), description: t('cl.q.security.opt.yes.desc') },
        { value: 'no', label: t('cl.q.security.opt.no') },
      ],
      condition: (m) => m.category === 'core_value' || m.category === 'capability',
      applyAnswer: (m, v) => { m.security = v === 'yes' },
    },

    // ─────────────────────────────────────────────────────────────
    // Q3: Platform down gate (core_value only)
    // ─────────────────────────────────────────────────────────────
    {
      id: 'platform_down',
      text: t('cl.q.platform_down.text'),
      helpText: t('cl.q.platform_down.help'),
      options: [
        { value: 'yes', label: t('cl.q.platform_down.opt.yes') },
        { value: 'no', label: t('cl.q.platform_down.opt.no') },
      ],
      condition: (m) => m.category === 'core_value',
      applyAnswer: (m, v) => { m.platform_down = v === 'yes' },
    },

    // ─────────────────────────────────────────────────────────────
    // Q4: Scope — how much is affected (core_value or capability)
    // ─────────────────────────────────────────────────────────────
    {
      id: 'scope',
      text: t('cl.q.scope.text'),
      helpText: t('cl.q.scope.help'),
      options: [
        { value: 'all', label: t('cl.q.scope.opt.all'), description: t('cl.q.scope.opt.all.desc') },
        { value: 'some', label: t('cl.q.scope.opt.some'), description: t('cl.q.scope.opt.some.desc') },
        { value: 'one', label: t('cl.q.scope.opt.one'), description: t('cl.q.scope.opt.one.desc') },
        { value: 'none', label: t('cl.q.scope.opt.none'), description: t('cl.q.scope.opt.none.desc') },
      ],
      condition: (m) => m.category === 'core_value' || m.category === 'capability',
      applyAnswer: (m, v) => { m.scope = v as Scope },
    },

    // ─────────────────────────────────────────────────────────────
    // Q5: Reach — who is affected (core_value or capability)
    // ─────────────────────────────────────────────────────────────
    {
      id: 'reach',
      text: t('cl.q.reach.text'),
      helpText: t('cl.q.reach.help'),
      options: [
        { value: 'all', label: t('cl.q.reach.opt.all') },
        { value: 'group', label: t('cl.q.reach.opt.group'), description: t('cl.q.reach.opt.group.desc') },
        { value: 'single', label: t('cl.q.reach.opt.single') },
      ],
      condition: (m) => m.category === 'core_value' || m.category === 'capability',
      applyAnswer: (m, v) => { m.reach = v as Reach },
    },

    // ─────────────────────────────────────────────────────────────
    // M1: Form field check (management only)
    // ─────────────────────────────────────────────────────────────
    {
      id: 'mgmt_form_field',
      text: t('cl.q.mgmt_form_field.text'),
      helpText: t('cl.q.mgmt_form_field.help'),
      options: [
        { value: 'yes', label: t('cl.q.mgmt_form_field.opt.yes'), description: t('cl.q.mgmt_form_field.opt.yes.desc') },
        { value: 'no', label: t('cl.q.mgmt_form_field.opt.no') },
      ],
      condition: (m) => m.category === 'management',
      applyAnswer: (m, v) => { m.mgmt_form_field = v === 'yes' },
    },

    // ─────────────────────────────────────────────────────────────
    // M2: Trigger — user action or system event (management, not form field)
    // ─────────────────────────────────────────────────────────────
    {
      id: 'mgmt_trigger',
      text: t('cl.q.mgmt_trigger.text'),
      helpText: t('cl.q.mgmt_trigger.help'),
      options: [
        { value: 'user', label: t('cl.q.mgmt_trigger.opt.user'), description: t('cl.q.mgmt_trigger.opt.user.desc') },
        { value: 'system', label: t('cl.q.mgmt_trigger.opt.system'), description: t('cl.q.mgmt_trigger.opt.system.desc') },
      ],
      condition: (m) => m.category === 'management' && m.mgmt_form_field === false,
      applyAnswer: (m, v) => { m.mgmt_trigger = v as MgmtTrigger },
    },

    // ─────────────────────────────────────────────────────────────
    // M3: Success or failure (management, user-triggered)
    // ─────────────────────────────────────────────────────────────
    {
      id: 'mgmt_success',
      text: t('cl.q.mgmt_success.text'),
      helpText: t('cl.q.mgmt_success.help'),
      options: [
        { value: 'yes', label: t('cl.q.mgmt_success.opt.yes') },
        { value: 'no', label: t('cl.q.mgmt_success.opt.no') },
      ],
      condition: (m) => m.category === 'management' && m.mgmt_trigger === 'user',
      applyAnswer: (m, v) => { m.mgmt_success = v === 'yes' },
    },

    // ─────────────────────────────────────────────────────────────
    // M4: Persistence — does the user need a record? (management, user success)
    // ─────────────────────────────────────────────────────────────
    {
      id: 'mgmt_persistence',
      text: t('cl.q.mgmt_persistence.text'),
      helpText: t('cl.q.mgmt_persistence.help'),
      options: [
        { value: 'yes', label: t('cl.q.mgmt_persistence.opt.yes'), description: t('cl.q.mgmt_persistence.opt.yes.desc') },
        { value: 'no', label: t('cl.q.mgmt_persistence.opt.no') },
      ],
      condition: (m) => m.category === 'management' && m.mgmt_success === true,
      applyAnswer: (m, v) => { m.mgmt_persistence = v === 'yes' },
    },

    // ─────────────────────────────────────────────────────────────
    // M5: Ongoing vs discrete (management, system-triggered)
    // ─────────────────────────────────────────────────────────────
    {
      id: 'mgmt_ongoing',
      text: t('cl.q.mgmt_ongoing.text'),
      helpText: t('cl.q.mgmt_ongoing.help'),
      options: [
        { value: 'yes', label: t('cl.q.mgmt_ongoing.opt.yes'), description: t('cl.q.mgmt_ongoing.opt.yes.desc') },
        { value: 'no', label: t('cl.q.mgmt_ongoing.opt.no') },
      ],
      condition: (m) => m.category === 'management' && m.mgmt_trigger === 'system',
      applyAnswer: (m, v) => { m.mgmt_ongoing = v === 'yes' },
    },
  ]
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Find the next visible question starting from the given index.
 * Returns the question definition and its index, or null if done.
 */
export function findNextQuestion(
  questions: ClassificationQuestionDef[],
  metadata: Phase1Metadata,
  startIndex: number,
): { question: ClassificationQuestionDef; index: number } | null {
  for (let i = startIndex; i < questions.length; i++) {
    const q = questions[i]
    if (q && q.condition(metadata)) {
      return { question: q, index: i }
    }
  }
  return null
}

/**
 * Count remaining visible questions from the given index (for progress indicator).
 */
export function countRemainingQuestions(
  questions: ClassificationQuestionDef[],
  metadata: Phase1Metadata,
  startIndex: number,
): number {
  let count = 0
  for (let i = startIndex; i < questions.length; i++) {
    const q = questions[i]
    if (q && q.condition(metadata)) count++
  }
  return count
}
