/**
 * Session persistence composable — encapsulates sessionStorage
 * hydration and auto-save for the Event Story Builder.
 *
 * Extracted from eventStoryStore.ts for maintainability.
 */

import { watch, type Ref } from 'vue'
import type { StoryChecklistItem } from '@/data/story-questions'
import type { EscalationStep } from '@/types/event'
import type { ReviewStep, AnalysisResult } from '@/composables/useReviewPhase'

// ---------------------------------------------------------------------------
// Shared type (owned here to avoid circular store → persistence → store)
// ---------------------------------------------------------------------------

export interface AnsweredQuestion {
  questionId: string
  questionText: string
  selectedOptions: string[]
  freeformText: string
  timestamp: string
  origin: 'default' | 'verify' | 'followup' | 'text_edit'
}

const STORAGE_KEY = 'iris-event-story-state'
const STORAGE_VERSION = 9

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ChecklistSnap {
  id: string
  filled: boolean
  value: string | string[] | null
  description: string | null
  evidence: string | null
  source: 'user' | 'llm' | null
  verified: boolean
}

interface PersistedState {
  _v: number
  answers: AnsweredQuestion[]
  storyText: string
  checklistSnapshot: ChecklistSnap[]
  phase: 'collect' | 'text-generation'
  reviewStep: ReviewStep
  escalationSteps: EscalationStep[]
  analysisResult: AnalysisResult | null
  analysisChoice: 'analyze' | 'skip' | null
  followUpsDone: boolean
}

export interface HydratedState {
  answers: AnsweredQuestion[]
  storyText: string
  checklistSnapshot: ChecklistSnap[]
  phase: 'collect' | 'text-generation'
  reviewStep: ReviewStep
  escalationSteps: EscalationStep[]
  analysisResult: AnalysisResult | null
  analysisChoice: 'analyze' | 'skip' | null
  followUpsDone: boolean
}

// ---------------------------------------------------------------------------
// Hydration
// ---------------------------------------------------------------------------

const DEFAULT_HYDRATED: HydratedState = {
  answers: [],
  storyText: '',
  checklistSnapshot: [],
  phase: 'collect',
  reviewStep: 'analyze',
  escalationSteps: [],
  analysisResult: null,
  analysisChoice: null,
  followUpsDone: false,
}

export function hydrateState(): HydratedState {
  try {
    const saved = sessionStorage.getItem(STORAGE_KEY)
    if (saved) {
      const parsed = JSON.parse(saved) as PersistedState
      if (parsed._v !== STORAGE_VERSION) {
        sessionStorage.removeItem(STORAGE_KEY)
        return { ...DEFAULT_HYDRATED }
      }
      return {
        answers: parsed.answers || [],
        storyText: parsed.storyText || '',
        checklistSnapshot: parsed.checklistSnapshot || [],
        phase: parsed.phase || 'collect',
        reviewStep: parsed.reviewStep || 'analyze',
        escalationSteps: parsed.escalationSteps || [],
        analysisResult: parsed.analysisResult || null,
        analysisChoice: parsed.analysisChoice || null,
        followUpsDone: parsed.followUpsDone || false,
      }
    }
  } catch { /* ignore corrupted state */ }
  return { ...DEFAULT_HYDRATED }
}

/** Restore checklist item values from a persisted snapshot. */
export function restoreChecklist(checklist: StoryChecklistItem[], snapshot: ChecklistSnap[]) {
  for (const snap of snapshot) {
    const item = checklist.find(i => i.id === snap.id)
    if (item) {
      item.filled = snap.filled
      item.value = snap.value
      item.description = snap.description ?? null
      item.evidence = snap.evidence
      item.source = snap.source
      item.verified = snap.verified
    }
  }
}

// ---------------------------------------------------------------------------
// Auto-save watcher
// ---------------------------------------------------------------------------

export interface PersistenceRefs {
  answers: Ref<AnsweredQuestion[]>
  storyText: Ref<string>
  phase: Ref<'collect' | 'text-generation'>
  reviewStep: Ref<ReviewStep>
  escalationSteps: Ref<EscalationStep[]>
  analysisResult: Ref<AnalysisResult | null>
  checklist: Ref<StoryChecklistItem[]>
  analysisChoice: Ref<'analyze' | 'skip' | null>
  followUpsDone: Ref<boolean>
}

export function setupPersistenceWatcher(refs: PersistenceRefs) {
  watch(
    () => ({
      answers: refs.answers.value,
      storyText: refs.storyText.value,
      phase: refs.phase.value,
      reviewStep: refs.reviewStep.value,
      escalationSteps: refs.escalationSteps.value,
      analysisResult: refs.analysisResult.value,
      analysisChoice: refs.analysisChoice.value,
      followUpsDone: refs.followUpsDone.value,
      checklistSnapshot: refs.checklist.value.map(i => ({
        id: i.id,
        filled: i.filled,
        value: i.value,
        description: i.description,
        evidence: i.evidence,
        source: i.source,
        verified: i.verified,
      })),
    }),
    (toSave) => {
      try {
        sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ ...toSave, _v: STORAGE_VERSION }))
      } catch { /* storage full or unavailable */ }
    },
    { deep: true },
  )
}

export function clearPersistedState() {
  sessionStorage.removeItem(STORAGE_KEY)
}
