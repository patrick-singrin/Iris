/**
 * Classification Store — flat sequential question flow for Phase 1.
 *
 * Replaces the tree-walking composable (v1) with a simple metadata collector
 * that walks a flat array of conditional questions. Deterministic rules
 * derive Information Type, Severity, and Channels from the collected metadata.
 *
 * Public API is compatible with the previous tree-walker version so that
 * EventStoryView, StoryPanel, and StoryQuestion require no changes.
 *
 * See Decision #22–#27 and docs/architecture-evolution.md.
 */

import { ref, computed } from 'vue'
import {
  type PathEntry,
  type Phase1Metadata,
  type ClassificationQuestionDef,
  createEmptyMetadata,
  getClassificationQuestions,
  findNextQuestion,
  countRemainingQuestions,
} from '@/data/classification-questions'
import { buildProgressiveNarrative } from '@/services/classificationNarrativeBuilder'
import { classifyFromMetadata } from '@/data/story-classification'
import type { RenderableQuestion } from '@/data/story-questions'
import type { StoryClassification } from '@/data/story-classification'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ClassificationResult {
  informationType: string
  severity: string | null
  channels: string[]
  trigger: string
  path: PathEntry[]
}

// ---------------------------------------------------------------------------
// Module-level state
// ---------------------------------------------------------------------------

const metadata = ref<Phase1Metadata>(createEmptyMetadata())
const currentQuestionIndex = ref(0)
const path = ref<PathEntry[]>([])
const result = ref<ClassificationResult | null>(null)
const isComplete = ref(false)

// ---------------------------------------------------------------------------
// Computed
// ---------------------------------------------------------------------------

const answeredQuestions = computed(() => path.value.length)

const currentStepLabel = computed(() => 'Classification')

const totalQuestions = computed(() => {
  if (isComplete.value) return answeredQuestions.value
  const questions = getClassificationQuestions()
  const remaining = countRemainingQuestions(questions, metadata.value, currentQuestionIndex.value)
  return answeredQuestions.value + remaining
})

/** Progressive W-heading narrative built from all classification answers. */
const narrativeText = computed(() =>
  buildProgressiveNarrative(path.value, result.value?.trigger),
)

// ---------------------------------------------------------------------------
// Methods
// ---------------------------------------------------------------------------

function answerQuestion(optionIndex: number) {
  const questions = getClassificationQuestions()
  const found = findNextQuestion(questions, metadata.value, currentQuestionIndex.value)
  if (!found) return

  const { question, index } = found
  const option = question.options[optionIndex]
  if (!option) return

  // Apply answer to metadata
  question.applyAnswer(metadata.value, option.value)

  // Record path entry for history + narrative
  path.value.push({
    nodeId: question.id,
    questionText: question.text,
    selectedLabel: option.label,
  })

  // Advance past this question
  currentQuestionIndex.value = index + 1

  // Check if there are more visible questions
  const next = findNextQuestion(questions, metadata.value, currentQuestionIndex.value)
  if (!next) {
    buildResult()
  }
}

function buildResult() {
  const classification = classifyFromMetadata(metadata.value)
  result.value = {
    informationType: classification.informationType,
    severity: classification.severity,
    channels: classification.channels,
    trigger: classification.trigger,
    path: [...path.value],
  }
  isComplete.value = true
}

function getCurrentQuestion(): RenderableQuestion | null {
  if (isComplete.value) return null
  const questions = getClassificationQuestions()
  const found = findNextQuestion(questions, metadata.value, currentQuestionIndex.value)
  if (!found) return null
  return questionDefToRenderable(found.question)
}

function questionDefToRenderable(def: ClassificationQuestionDef): RenderableQuestion {
  return {
    id: def.id,
    text: def.text,
    helpText: def.helpText,
    inputType: 'single',
    options: def.options.map((opt, idx) => ({
      value: String(idx),
      label: opt.label,
      description: opt.description,
    })),
    allowFreeform: true,
    origin: 'tree',
    targetChecklistItems: [],
  }
}

/** Map classification result to StoryClassification shape for ClassificationTile. */
function toStoryClassification(res: ClassificationResult): StoryClassification {
  return {
    type: res.informationType,
    severity: res.severity as StoryClassification['severity'],
    channels: res.channels,
    confidence: 1,
  }
}

/**
 * Progressive classification that updates live as the user answers questions.
 *
 * Shows partial results based on what metadata has been collected so far:
 * - After Q1 (category): show predicted type
 * - After severity-relevant questions: show predicted severity + channels
 * - Final: full result
 */
const progressiveClassification = computed<StoryClassification | null>(() => {
  // Final result takes precedence
  if (result.value) {
    return toStoryClassification(result.value)
  }

  // Need at least category to show anything
  if (!metadata.value.category) return null

  // For management, show type prediction as soon as we can
  if (metadata.value.category === 'management') {
    // After form field check, we can predict Validation Messages
    if (metadata.value.mgmt_form_field === true) {
      return { type: 'Validation Messages', severity: null, channels: ['Inline'], confidence: 0.8 }
    }
    // Otherwise just show "Management event" pending
    return { type: 'Management event', severity: null, channels: [], confidence: 0.3 }
  }

  // Core value / Capability → we know it's a Notification
  const type = 'Notification'

  // Can we derive severity yet? Need security + (platform_down if core_value) + scope
  const m = metadata.value
  const hasSeverityData = m.security !== null && m.scope !== null
    && (m.category !== 'core_value' || m.platform_down !== null)

  if (hasSeverityData) {
    const classification = classifyFromMetadata(m)
    return {
      type,
      severity: classification.severity,
      channels: classification.channels,
      confidence: 0.8,
    }
  }

  // Security known but not scope yet → can show CRITICAL if security
  if (m.security === true) {
    return { type, severity: 'CRITICAL', channels: ['Banner', 'Dashboard', 'E-Mail', 'Status Page'], confidence: 0.7 }
  }

  // Just category known
  return { type, severity: null, channels: [], confidence: 0.3 }
})

function reset() {
  metadata.value = createEmptyMetadata()
  currentQuestionIndex.value = 0
  path.value = []
  result.value = null
  isComplete.value = false
}

// ---------------------------------------------------------------------------
// Composable export
// ---------------------------------------------------------------------------

export function useClassificationStore() {
  return {
    // State
    metadata,
    path,
    result,
    isComplete,

    // Computed
    answeredQuestions,
    totalQuestions,
    currentStepLabel,
    narrativeText,
    progressiveClassification,

    // Methods
    answerQuestion,
    getCurrentQuestion,
    toStoryClassification,
    reset,
  }
}
