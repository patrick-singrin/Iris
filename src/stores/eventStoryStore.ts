/**
 * Event Story Store — core state and interview orchestration.
 *
 * Review-phase logic lives in useReviewPhase composable.
 * Persistence logic lives in usePersistence composable.
 * This store wires them together and owns the interview flow.
 */

import { ref, computed } from 'vue'
import {
  createDefaultChecklist,
  getStoryQuestions,
  deriveClassification,
  composeStory,
  assessChannelQuality,
  fillItem,
  applyPatches,
  type StoryChecklistItem,
  type StoryClassification,
  type ChannelQuality,
  type RenderableQuestion,
  type StoryQuestionDef,
} from '@/data/story-questions'
import { analyzeConversation, analyzeText, type ConversationEntry } from '@/services/llm/storyExtractor'
import { t } from '@/i18n'

import {
  useReviewPhase,
  type ReviewPhaseDeps,
  type AnalysisFollowUp,
} from '@/composables/useReviewPhase'
import {
  hydrateState,
  restoreChecklist,
  setupPersistenceWatcher,
  clearPersistedState,
  type AnsweredQuestion,
} from '@/composables/usePersistence'

// Re-export types so existing consumers don't need to change imports
export type { ReviewStep, AnalysisFinding, AnalysisFollowUp, AnalysisResult } from '@/composables/useReviewPhase'
export type { AnsweredQuestion } from '@/composables/usePersistence'

// ---------------------------------------------------------------------------
// Module-level state
// ---------------------------------------------------------------------------

const hydrated = hydrateState()

const answers = ref<AnsweredQuestion[]>(hydrated.answers)
const checklist = ref<StoryChecklistItem[]>(createDefaultChecklist())
const storyText = ref(hydrated.storyText)
const phase = ref<'collect' | 'text-generation'>(hydrated.phase)
const showWhyExplainer = ref(false)
const userHasEditedStory = ref(false)
const isExtracting = ref(false)
const analysisError = ref<string | null>(null)
const analysisChoice = ref<'analyze' | 'skip' | null>(hydrated.analysisChoice)
const followUpsDone = ref(hydrated.followUpsDone)
const followUpQueue = ref<AnalysisFollowUp[]>([])

// Restore checklist from snapshot
if (hydrated.checklistSnapshot.length > 0) {
  restoreChecklist(checklist.value, hydrated.checklistSnapshot)
  if (!storyText.value) {
    storyText.value = composeStory(checklist.value)
  }
}

// ---------------------------------------------------------------------------
// Helpers: convert question types to RenderableQuestion
// ---------------------------------------------------------------------------

function convertDefaultToRenderable(def: StoryQuestionDef): RenderableQuestion {
  return {
    id: def.id,
    text: def.text,
    helpText: def.helpText,
    inputType: def.type === 'single' && def.options.length === 0 ? 'freeform' : def.type,
    options: def.options,
    allowFreeform: def.allowFreeform,
    freeformPlaceholder: def.freeformPlaceholder,
    origin: 'default',
    targetChecklistItems: def.checklistTargets,
  }
}

/** Find the default question definition that targets a given checklist item */
function findDefaultDefForItem(itemId: string): StoryQuestionDef | undefined {
  return getStoryQuestions().find(q => q.checklistTargets.includes(itemId))
}

function buildVerificationQuestion(item: StoryChecklistItem, answersHistory: AnsweredQuestion[]): RenderableQuestion {
  const def = findDefaultDefForItem(item.id)
  // Build human-readable label for the value — prefer contextual description,
  // but fall back to the value if the description looks like a meta-description
  // (e.g. "Concrete action required..." instead of the actual action).
  let displayValue = ''
  const descriptionIsUseful = item.description
    && !(/^(concrete|specific|required|relevant|appropriate)\b/i.test(item.description))
    && item.description.length > 5
  if (descriptionIsUseful) {
    displayValue = item.description!
  } else if (Array.isArray(item.value)) {
    if (def) {
      displayValue = (item.value as string[]).map(v => {
        const opt = def.options.find(o => o.value === v)
        return opt ? opt.label : v
      }).join(', ')
    } else {
      displayValue = item.value.join(', ')
    }
  } else if (def) {
    const opt = def.options.find(o => o.value === item.value)
    displayValue = opt ? opt.label : (item.value || '')
  } else {
    displayValue = item.value as string || ''
  }

  // Find the full source context
  let sourceContext: string | undefined
  if (item.evidence && answersHistory && answersHistory.length > 0) {
    for (let i = answersHistory.length - 1; i >= 0; i--) {
      const a = answersHistory[i]
      if (a!.freeformText && a!.freeformText.includes(item.evidence)) {
        sourceContext = a!.freeformText
        break
      }
    }
    if (!sourceContext) {
      sourceContext = item.evidence
    }
  }

  return {
    id: `verify_${item.id}`,
    text: item.confirmLabel,
    helpText: t('story.verificationHint'),
    inputType: def?.type || 'single',
    options: def?.options || [],
    allowFreeform: def?.allowFreeform ?? true,
    freeformPlaceholder: def?.freeformPlaceholder || t('story.orTypeYourOwn'),
    origin: 'verify',
    targetChecklistItems: [item.id],
    verifyItemId: item.id,
    verifyValue: displayValue,
    verifyEvidence: item.evidence || undefined,
    verifySourceContext: sourceContext,
  }
}

// ---------------------------------------------------------------------------
// Composable
// ---------------------------------------------------------------------------

export function useEventStoryStore() {
  // Derived computeds
  const classification = computed<StoryClassification | null>(() => {
    return deriveClassification(checklist.value)
  })

  const composedStory = computed(() => composeStory(checklist.value))

  const channelQuality = computed<ChannelQuality[]>(() => {
    if (!classification.value) return []
    return assessChannelQuality(checklist.value, classification.value.channels)
  })

  // Wire up review-phase composable
  const reviewDeps: ReviewPhaseDeps = {
    checklist,
    storyText,
    classification,
    channelQuality,
    composedStory,
    userHasEditedStory,
  }

  const review = useReviewPhase(
    reviewDeps,
    hydrated.reviewStep,
    hydrated.escalationSteps,
    hydrated.analysisResult,
  )

  // Wire up persistence
  setupPersistenceWatcher({
    answers,
    storyText,
    phase,
    reviewStep: review.reviewStep,
    escalationSteps: review.escalationSteps,
    analysisResult: review.analysisResult,
    checklist,
    analysisChoice,
    followUpsDone,
  })

  // ---------------------------------------------------------------------------
  // Question flow
  // ---------------------------------------------------------------------------

  const currentQuestion = computed<RenderableQuestion | null>(() => {
    if (isExtracting.value) return null

    const unverified = checklist.value.find(
      item => item.filled && item.source === 'llm' && !item.verified,
    )
    if (unverified) {
      return buildVerificationQuestion(unverified, answers.value)
    }

    const defaultQ = getStoryQuestions().find(q => q.condition(checklist.value))
    if (defaultQ) return convertDefaultToRenderable(defaultQ)

    return null
  })

  const interviewComplete = computed(() => {
    if (isExtracting.value) return false
    if (answers.value.length === 0) return false
    if (currentQuestion.value !== null) return false
    // All 11 checklist items must be filled and verified
    return checklist.value.every(i => i.filled && i.verified)
  })

  const checklistProgress = computed(() => {
    const filled = checklist.value.filter(i => i.filled).length
    const verified = checklist.value.filter(i => i.filled && i.verified).length
    const unverified = filled - verified
    return { filled, verified, unverified, total: filled }
  })

  // ---------------------------------------------------------------------------
  // Answer handling
  // ---------------------------------------------------------------------------

  function answerQuestion(questionId: string, selectedOptions: string[], freeformText: string) {
    const q = currentQuestion.value
    if (!q) return

    answers.value.push({
      questionId,
      questionText: q.text,
      selectedOptions,
      freeformText,
      timestamp: new Date().toISOString(),
      origin: q.origin,
    })

    if (q.origin === 'default') {
      handleDefaultAnswer(q, selectedOptions, freeformText)
    } else if (q.origin === 'verify') {
      handleVerificationAnswer(q, selectedOptions, freeformText)
    }

    runAnalysis()
  }

  function handleDefaultAnswer(q: RenderableQuestion, selectedOptions: string[], freeformText: string) {
    const staticDef = getStoryQuestions().find(def => def.id === q.id)
    if (staticDef) {
      const patches = staticDef.mapAnswer(selectedOptions, freeformText, checklist.value)
      applyPatches(checklist.value, patches)
      for (const targetId of staticDef.checklistTargets) {
        const item = checklist.value.find(i => i.id === targetId)
        if (item && item.filled && item.source !== 'llm') {
          item.source = 'user'
          item.verified = true
        }
      }
    }
  }

  function handleVerificationAnswer(q: RenderableQuestion, selectedOptions: string[], freeformText: string) {
    if (!q.verifyItemId) return
    const item = checklist.value.find(i => i.id === q.verifyItemId)
    if (!item) return

    if (selectedOptions.includes('__confirm__')) {
      item.verified = true
    } else {
      const newValue = selectedOptions.length > 0 ? (selectedOptions.length === 1 ? selectedOptions[0] : selectedOptions) : freeformText
      if (newValue) {
        item.value = newValue
        item.description = null
        if (!item.evidence) {
          item.evidence = typeof newValue === 'string' ? newValue : (newValue as string[]).join(', ')
        }
        item.source = 'user'
        item.verified = true
      }
    }
  }

  // ---------------------------------------------------------------------------
  // LLM Analysis
  // ---------------------------------------------------------------------------

  function formatAnalysisError(raw: string): string {
    if (!raw) return t('story.analysisError')
    if (/api.?key.*not configured/i.test(raw) || /401/i.test(raw)) return t('story.analysisErrorApiKey')
    if (/429|rate.?limit|overloaded|529/i.test(raw)) return t('story.analysisErrorRateLimit')
    if (/network|fetch|ECONNREFUSED|ECONNRESET|ETIMEDOUT|could not reach/i.test(raw)) return t('story.analysisFailed')
    if (/parse|json|unexpected token/i.test(raw)) return t('story.analysisErrorParse')
    return t('story.analysisError')
  }

  function buildConversationContext(): ConversationEntry[] {
    const questions = getStoryQuestions()
    return answers.value.map(a => {
      // Resolve human-readable labels for selected options
      const def = questions.find(q => q.id === a.questionId)
      const labels = def
        ? a.selectedOptions.map(val => {
            const opt = def.options.find(o => o.value === val)
            return opt ? opt.label : val
          })
        : undefined

      return {
        question: a.questionText,
        selectedOptions: a.selectedOptions,
        selectedOptionLabels: labels,
        freeformText: a.freeformText,
      }
    })
  }

  async function runAnalysis() {
    isExtracting.value = true
    analysisError.value = null
    try {
      const conversation = buildConversationContext()
      const result = await analyzeConversation(conversation, checklist.value)

      if (result.items.length > 0) {
        for (const extracted of result.items) {
          const item = checklist.value.find(i => i.id === extracted.id)
          if (item && !(item.filled && item.verified)) {
            item.filled = true
            item.value = extracted.value
            item.description = extracted.description || null
            item.evidence = extracted.evidence
            item.source = 'llm'
            item.verified = false
          }
        }
      }

      if (!userHasEditedStory.value) {
        if (result.story) {
          storyText.value = result.story
        } else if (!storyText.value) {
          storyText.value = composedStory.value
        }
      }

      if (result.error) {
        console.warn('[eventStoryStore] Analysis error:', result.error)
        analysisError.value = formatAnalysisError(result.error)
        if (!userHasEditedStory.value && !storyText.value) {
          storyText.value = composedStory.value
        }
      }
    } catch (err) {
      console.warn('[eventStoryStore] Analysis failed:', err)
      const msg = err instanceof Error ? err.message : ''
      analysisError.value = formatAnalysisError(msg)
      if (!userHasEditedStory.value && !storyText.value) {
        storyText.value = composedStory.value
      }
    } finally {
      isExtracting.value = false
    }
  }

  function updateStoryText(text: string) {
    storyText.value = text
    userHasEditedStory.value = true
  }

  async function applyTextEdit(text: string) {
    storyText.value = text
    userHasEditedStory.value = true

    answers.value.push({
      questionId: `text_edit_${Date.now()}`,
      questionText: t('sq.evidence.textEdited'),
      selectedOptions: [],
      freeformText: text.length > 200 ? text.substring(0, 200) + '…' : text,
      timestamp: new Date().toISOString(),
      origin: 'text_edit',
    })

    isExtracting.value = true
    analysisError.value = null
    try {
      const result = await analyzeText(text, checklist.value)
      if (result.items.length > 0) {
        for (const extracted of result.items) {
          const item = checklist.value.find(i => i.id === extracted.id)
          if (item) {
            item.filled = true
            item.value = extracted.value
            item.description = extracted.description || null
            item.evidence = extracted.evidence
            item.source = 'llm'
            item.verified = false
          }
        }
      }
      if (result.error) {
        console.warn('[eventStoryStore] Text analysis error:', result.error)
        analysisError.value = formatAnalysisError(result.error)
      }
    } catch (err) {
      console.warn('[eventStoryStore] Text analysis failed:', err)
      const msg = err instanceof Error ? err.message : ''
      analysisError.value = formatAnalysisError(msg)
    } finally {
      isExtracting.value = false
      userHasEditedStory.value = false
    }
  }

  function toggleWhyExplainer() {
    showWhyExplainer.value = !showWhyExplainer.value
  }

  function dismissError() {
    analysisError.value = null
  }

  // ---------------------------------------------------------------------------
  // Analysis flow (inline in conversation)
  // ---------------------------------------------------------------------------

  function selectAnalysisChoice(choice: 'analyze' | 'skip') {
    analysisChoice.value = choice
    if (choice === 'skip') {
      // Skip analysis → go straight to text generation
      review.proceedToGenerate()
      phase.value = 'text-generation'
    } else {
      // Start holistic analysis
      review.startHolisticAnalysis()
    }
  }

  // Follow-up queue — populated after holistic analysis completes
  const currentFollowUp = computed<RenderableQuestion | null>(() => {
    if (followUpQueue.value.length === 0) return null
    const q = followUpQueue.value[0]!
    return {
      id: `followup_${q.id}`,
      text: q.question,
      inputType: 'freeform',
      options: [],
      allowFreeform: true,
      freeformPlaceholder: t('story.orTypeYourOwn'),
      origin: 'followup',
      targetChecklistItems: [q.targetChecklistItem],
    }
  })

  function startFollowUpQueue() {
    if (!review.analysisResult.value?.followUpQuestions?.length) {
      finishFollowUps()
      return
    }
    followUpQueue.value = [...review.analysisResult.value.followUpQuestions]
  }

  function answerFollowUp(freeformText: string) {
    const q = followUpQueue.value[0]
    if (!q) return

    // Record in answer history
    answers.value.push({
      questionId: `followup_${q.id}`,
      questionText: q.question,
      selectedOptions: [],
      freeformText,
      timestamp: new Date().toISOString(),
      origin: 'followup',
    })

    // Apply to checklist
    if (freeformText.trim()) {
      review.applyFollowUpAnswer(q.targetChecklistItem, freeformText.trim())
    }

    // Advance queue
    followUpQueue.value = followUpQueue.value.slice(1)

    // If queue empty, finish
    if (followUpQueue.value.length === 0) {
      finishFollowUps()
    }
  }

  function skipFollowUps() {
    followUpQueue.value = []
    finishFollowUps()
  }

  function finishFollowUps() {
    followUpsDone.value = true
    review.proceedToGenerate()
    phase.value = 'text-generation'
  }

  function backToCollect() {
    phase.value = 'collect'
    // Reset analysis state so the user sees the choice card again
    analysisChoice.value = null
    followUpsDone.value = false
  }

  function resetSession() {
    answers.value = []
    checklist.value = createDefaultChecklist()
    storyText.value = ''
    phase.value = 'collect'
    showWhyExplainer.value = false
    userHasEditedStory.value = false
    isExtracting.value = false
    analysisChoice.value = null
    followUpsDone.value = false
    followUpQueue.value = []
    review.resetReviewState()
    clearPersistedState()
  }

  return {
    // Core state
    answers,
    checklist,
    storyText,
    phase,
    showWhyExplainer,
    isExtracting,
    analysisError,
    analysisChoice,
    followUpsDone,

    // Computed
    currentQuestion,
    interviewComplete,
    classification,
    composedStory,
    channelQuality,
    checklistProgress,

    // Interview methods
    answerQuestion,
    updateStoryText,
    applyTextEdit,
    toggleWhyExplainer,
    dismissError,
    retryAnalysis: runAnalysis,
    backToCollect,
    resetSession,

    // Inline analysis flow
    selectAnalysisChoice,
    currentFollowUp,
    startFollowUpQueue,
    answerFollowUp,
    skipFollowUps,

    // Review-phase (delegated)
    reviewStep: review.reviewStep,
    escalationSteps: review.escalationSteps,
    analysisResult: review.analysisResult,
    isAnalyzing: review.isAnalyzing,
    isGeneratingText: review.isGeneratingText,
    generationError: review.generationError,
    setEscalationSteps: review.setEscalationSteps,
    proceedToGenerate: review.proceedToGenerate,
    regenerateForComponent: review.regenerateForComponent,
    regenerateForStep: review.regenerateForStep,
    deleteStep: review.deleteStep,
    backToStep: review.backToStep,
    savedEventId: review.savedEventId,
  }
}
