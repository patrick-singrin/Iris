/**
 * Review-phase composable — encapsulates all state and logic for the
 * post-interview review flow (analysis → configure → generate → output).
 *
 * Extracted from eventStoryStore.ts for maintainability.
 */

import { ref, type Ref, type ComputedRef } from 'vue'
import type { StoryChecklistItem, StoryClassification, ChannelQuality } from '@/data/story-questions'
import type { EscalationStep } from '@/types/event'
import { t } from '@/i18n'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type ReviewStep = 'analyze' | 'configure' | 'generate' | 'output'

export interface AnalysisFinding {
  category: string
  severity: 'suggestion' | 'warning'
  message: string
  suggestion: string
}

export interface AnalysisFollowUp {
  id: string
  question: string
  targetChecklistItem: string
  inputType: 'freeform'
}

export interface AnalysisResult {
  assessment: 'good' | 'needs_attention'
  findings: AnalysisFinding[]
  followUpQuestions: AnalysisFollowUp[]
}

// ---------------------------------------------------------------------------
// Dependencies injected from the core store
// ---------------------------------------------------------------------------

export interface ReviewPhaseDeps {
  checklist: Ref<StoryChecklistItem[]>
  storyText: Ref<string>
  classification: ComputedRef<StoryClassification | null>
  channelQuality: ComputedRef<ChannelQuality[]>
  composedStory: ComputedRef<string>
  userHasEditedStory: Ref<boolean>
}

// ---------------------------------------------------------------------------
// Composable
// ---------------------------------------------------------------------------

export function useReviewPhase(
  deps: ReviewPhaseDeps,
  initialReviewStep: ReviewStep = 'analyze',
  initialEscalationSteps: EscalationStep[] = [],
  initialAnalysisResult: AnalysisResult | null = null,
) {
  const reviewStep = ref<ReviewStep>(initialReviewStep)
  const escalationSteps = ref<EscalationStep[]>(initialEscalationSteps)
  const analysisResult = ref<AnalysisResult | null>(initialAnalysisResult)
  const isAnalyzing = ref(false)
  const isGeneratingText = ref(false)
  const generationError = ref<string | null>(null)

  function skipAnalysis() {
    reviewStep.value = 'configure'
  }

  async function startHolisticAnalysis() {
    isAnalyzing.value = true
    analysisResult.value = null
    try {
      const { runHolisticAnalysis } = await import('@/services/llm/storyAnalyzer')
      const result = await runHolisticAnalysis(
        deps.checklist.value,
        deps.storyText.value,
        deps.classification.value,
        deps.channelQuality.value,
      )
      analysisResult.value = result
    } catch (err) {
      console.warn('[useReviewPhase] Holistic analysis failed:', err)
      analysisResult.value = {
        assessment: 'good',
        findings: [{
          category: 'error',
          severity: 'warning',
          message: t('story.holisticAnalysisFailed'),
          suggestion: t('story.holisticAnalysisFailedSuggestion'),
        }],
        followUpQuestions: [],
      }
    } finally {
      isAnalyzing.value = false
    }
  }

  function applyFollowUpAnswer(targetChecklistItem: string, value: string) {
    const item = deps.checklist.value.find(i => i.id === targetChecklistItem)
    if (item) {
      item.filled = true
      item.value = value
      item.evidence = value
      item.source = 'user'
      item.verified = true
    }
    if (!deps.userHasEditedStory.value) {
      deps.storyText.value = deps.composedStory.value
    }
  }

  function proceedToConfigure() {
    reviewStep.value = 'configure'
  }

  function setEscalationSteps(steps: EscalationStep[]) {
    escalationSteps.value = steps
  }

  async function proceedToGenerate() {
    reviewStep.value = 'generate'
    isGeneratingText.value = true
    generationError.value = null

    try {
      const { generateStoryText } = await import('@/services/llm/storyTextGenerator')
      await generateStoryText(
        deps.checklist.value,
        deps.classification.value!,
        deps.storyText.value,
        escalationSteps.value.length > 0 ? escalationSteps.value : undefined,
      )
      reviewStep.value = 'output'
    } catch (err) {
      console.warn('[useReviewPhase] Text generation failed:', err)
      generationError.value = err instanceof Error ? err.message : t('story.generationFailed')
      reviewStep.value = 'configure'
    } finally {
      isGeneratingText.value = false
    }
  }

  async function regenerateForComponent(componentId: string) {
    isGeneratingText.value = true
    generationError.value = null

    try {
      const { regenerateComponentText } = await import('@/services/llm/storyTextGenerator')
      await regenerateComponentText(
        componentId,
        deps.checklist.value,
        deps.classification.value!,
        deps.storyText.value,
        escalationSteps.value.length > 0 ? escalationSteps.value : undefined,
      )
    } catch (err) {
      console.warn('[useReviewPhase] Per-component regeneration failed:', err)
      generationError.value = err instanceof Error ? err.message : t('story.generationFailed')
    } finally {
      isGeneratingText.value = false
    }
  }

  function backToStep(step: ReviewStep) {
    reviewStep.value = step
  }

  function resetReviewState() {
    reviewStep.value = 'analyze'
    escalationSteps.value = []
    analysisResult.value = null
    isAnalyzing.value = false
    isGeneratingText.value = false
    generationError.value = null
  }

  return {
    reviewStep,
    escalationSteps,
    analysisResult,
    isAnalyzing,
    isGeneratingText,
    generationError,
    skipAnalysis,
    startHolisticAnalysis,
    applyFollowUpAnswer,
    proceedToConfigure,
    setEscalationSteps,
    proceedToGenerate,
    regenerateForComponent,
    backToStep,
    resetReviewState,
  }
}
