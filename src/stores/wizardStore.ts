import { reactive, computed, watch } from 'vue'
import type { PathEntry } from '@/types/decisionTree'
import type { EventDescription, Classification, SeverityOverride, TypeContext, EscalationStep } from '@/types/event'
import { createEmptyDescription, createTypeContext, mapClassificationToContextKind } from '@/types/event'
import { getDefaultPreset, getPresetById } from '@/data/escalation-presets'
import { loadTree, getNode, getNextNodeId, isResultNode, isQuestionNode } from '@/services/decisionTree'
import { computeSeverity } from '@/services/severityMatrix'
import type { DecisionTree, ResultNode } from '@/types/decisionTree'
import type { SeverityResult } from '@/services/severityMatrix'

export type WizardPhase =
  | 'CLASSIFICATION_TYPE'
  | 'IMPACT_ASSESSMENT'
  | 'SEVERITY_RESULT'
  | 'EVENT_DESCRIPTION'
  | 'CONTEXT_AND_DESCRIBE'
  | 'SUMMARY'

export interface WizardState {
  phase: WizardPhase
  eventDescription: EventDescription

  // Tree 1 navigation (interactive)
  typeTree: DecisionTree | null
  typeCurrentNodeId: string
  typePath: PathEntry[]
  typeResult: ResultNode | null

  // Type-specific context (non-notification types)
  typeContext: TypeContext | null

  // Severity (computed, not tree-walked — notification only)
  severityResult: SeverityResult | null
  severityOverride: SeverityOverride | null

  // Escalation timeline (notification only, user-configurable)
  escalationSteps: EscalationStep[]

  // Step tracking for forward navigation
  highestCompletedStep: number
}

const STORAGE_KEY = 'iris-wizard-state'
// Bump this whenever the persisted schema changes (e.g. renamed enum values)
const STORAGE_VERSION = 4

function createInitialState(): WizardState {
  const base: WizardState = {
    phase: 'CLASSIFICATION_TYPE',
    eventDescription: createEmptyDescription(),
    typeTree: null,
    typeCurrentNodeId: '',
    typePath: [],
    typeResult: null,
    typeContext: null,
    severityResult: null,
    severityOverride: null,
    escalationSteps: [],
    highestCompletedStep: 0,
  }

  // Hydrate from sessionStorage if available
  try {
    const saved = sessionStorage.getItem(STORAGE_KEY)
    if (saved) {
      const parsed = JSON.parse(saved)
      // Discard state from an older schema version
      if (parsed._v !== STORAGE_VERSION) {
        sessionStorage.removeItem(STORAGE_KEY)
        return base
      }
      return { ...base, ...parsed, typeTree: null }
    }
  } catch { /* ignore corrupted state */ }

  return base
}

const state = reactive<WizardState>(createInitialState())

// Persist state to sessionStorage on changes (exclude typeTree which is loaded from JSON)
watch(
  () => ({
    phase: state.phase,
    eventDescription: state.eventDescription,
    typeCurrentNodeId: state.typeCurrentNodeId,
    typePath: state.typePath,
    typeResult: state.typeResult,
    typeContext: state.typeContext,
    severityResult: state.severityResult,
    severityOverride: state.severityOverride,
    escalationSteps: state.escalationSteps,
    highestCompletedStep: state.highestCompletedStep,
  }),
  (toSave) => {
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ ...toSave, _v: STORAGE_VERSION }))
    } catch { /* storage full or unavailable */ }
  },
  { deep: true },
)

// Initialize Tree 1 on first load
function ensureTypeTreeLoaded() {
  if (!state.typeTree) {
    state.typeTree = loadTree('information-type')
    state.typeCurrentNodeId = state.typeTree.entryNode
  }
}

export function useWizardStore() {
  // Computed properties
  const currentTypeNode = computed(() => {
    if (!state.typeTree || !state.typeCurrentNodeId) return null
    return getNode(state.typeTree, state.typeCurrentNodeId)
  })

  const isNotification = computed(() => {
    return state.typeResult?.classification === 'Notification'
  })

  const effectiveSeverity = computed(() => {
    if (!state.severityResult) return null
    if (state.severityOverride) {
      return state.severityOverride.overriddenSeverity
    }
    return state.severityResult.severity
  })

  const classification = computed<Classification | null>(() => {
    if (!state.typeResult) return null

    const severity = state.severityResult
    const effectiveSev = effectiveSeverity.value

    return {
      type: state.typeResult.classification || 'Unknown',
      severity: effectiveSev,
      severityExplanation: severity?.explanation || null,
      channels: severity?.channels || state.typeResult.channels || [],
      purpose: state.typeResult.purpose || '',
      trigger: severity?.trigger || null,
      escalation: state.escalationSteps.length > 0 ? [...state.escalationSteps] : false,
      typePath: [...state.typePath],
      severityOverride: state.severityOverride ? { ...state.severityOverride } : null,
    }
  })

  // Wizard step labels for stepper — adapts based on classification type
  const wizardSteps = computed(() => {
    if (isNotification.value) {
      return [
        { id: 'CLASSIFICATION_TYPE', label: 'Classification' },
        { id: 'IMPACT_ASSESSMENT', label: 'Impact' },
        { id: 'SEVERITY_RESULT', label: 'Severity' },
        { id: 'EVENT_DESCRIPTION', label: 'Description' },
        { id: 'SUMMARY', label: 'Summary' },
      ]
    }
    // Non-notification: streamlined 3-step flow
    return [
      { id: 'CLASSIFICATION_TYPE', label: 'Classification' },
      { id: 'CONTEXT_AND_DESCRIBE', label: 'Context & Describe' },
      { id: 'SUMMARY', label: 'Summary' },
    ]
  })

  const currentStepIndex = computed(() => {
    return wizardSteps.value.findIndex(s => s.id === state.phase)
  })

  // ── Tree 1 Navigation ──

  function startClassification() {
    state.phase = 'CLASSIFICATION_TYPE'
    ensureTypeTreeLoaded()
  }

  function selectTypeOption(optionIndex: number) {
    if (!state.typeTree || !state.typeCurrentNodeId) return
    const currentNode = getNode(state.typeTree, state.typeCurrentNodeId)
    if (!isQuestionNode(currentNode)) return

    const option = currentNode.options[optionIndex]
    if (!option) return
    state.typePath.push({
      nodeId: state.typeCurrentNodeId,
      questionText: currentNode.text,
      selectedLabel: option.label,
    })

    const nextId = getNextNodeId(currentNode, optionIndex)
    state.typeCurrentNodeId = nextId

    const nextNode = getNode(state.typeTree, nextId)
    if (isResultNode(nextNode)) {
      state.typeResult = nextNode
      // Don't auto-advance — show classification confirmation first
    }
  }

  function goBackInTypeTree() {
    if (state.typePath.length === 0) {
      // Already at the start of the tree
      return
    }
    const lastEntry = state.typePath.pop()!
    state.typeCurrentNodeId = lastEntry.nodeId
    state.typeResult = null
  }

  // ── Classification Confirmation ──

  function confirmClassification() {
    if (isNotification.value) {
      state.phase = 'IMPACT_ASSESSMENT'
    } else {
      // Initialize type context for non-notification types
      const kind = mapClassificationToContextKind(state.typeResult!.classification!)
      state.typeContext = createTypeContext(kind)
      state.phase = 'CONTEXT_AND_DESCRIBE'
    }
    updateHighestStep()
  }

  function reclassify() {
    // Go back to the last question in the tree
    if (state.typePath.length > 0) {
      const lastEntry = state.typePath.pop()!
      state.typeCurrentNodeId = lastEntry.nodeId
      state.typeResult = null
    }
  }

  function updateHighestStep() {
    const idx = wizardSteps.value.findIndex(s => s.id === state.phase)
    if (idx > state.highestCompletedStep) {
      state.highestCompletedStep = idx
    }
  }

  // ── Impact Assessment Navigation (Notification only) ──

  function completeImpactAssessment() {
    // Compute severity from collected factors
    state.severityResult = computeSeverity({
      userImpact: state.eventDescription.userImpact,
      userScope: state.eventDescription.userScope,
      timing: state.eventDescription.timing,
      leadTime: state.eventDescription.leadTime,
      securityCompliance: state.eventDescription.securityCompliance,
      actionRequired: state.eventDescription.actionRequired,
    })

    // Auto-apply escalation preset for scheduled events (if not already configured)
    if (state.severityResult.escalationSuggested && state.escalationSteps.length === 0) {
      const preset = getDefaultPreset(state.eventDescription.leadTime)
      state.escalationSteps = preset.steps.map(s => ({ ...s }))
    }

    state.phase = 'SEVERITY_RESULT'
    updateHighestStep()
  }

  function goBackFromImpactAssessment() {
    // Return to classification confirmation screen (typeResult stays intact)
    state.phase = 'CLASSIFICATION_TYPE'
  }

  // ── Severity Result Navigation (Notification only) ──

  function overrideSeverity(newSeverity: string, justification: string) {
    if (!state.severityResult) return
    state.severityOverride = {
      originalSeverity: state.severityResult.severity,
      overriddenSeverity: newSeverity,
      justification,
    }
  }

  function clearSeverityOverride() {
    state.severityOverride = null
  }

  // ── Escalation Timeline (Notification only) ──

  function setEscalationSteps(steps: EscalationStep[]) {
    state.escalationSteps = steps
  }

  function addEscalationStep(step: EscalationStep) {
    state.escalationSteps.push(step)
    // Keep sorted by relativeDays descending (furthest out first)
    state.escalationSteps.sort((a, b) => b.relativeDays - a.relativeDays)
  }

  function removeEscalationStep(index: number) {
    state.escalationSteps.splice(index, 1)
  }

  function updateEscalationStep(index: number, step: EscalationStep) {
    state.escalationSteps[index] = step
  }

  function applyEscalationPreset(presetId: string) {
    const preset = getPresetById(presetId)
    if (preset) {
      state.escalationSteps = preset.steps.map(s => ({ ...s }))
    }
  }

  function clearEscalation() {
    state.escalationSteps = []
  }

  function completeSeverityResult() {
    state.phase = 'EVENT_DESCRIPTION'
    updateHighestStep()
  }

  function goBackFromSeverityResult() {
    state.phase = 'IMPACT_ASSESSMENT'
  }

  // ── Event Description Navigation (Notification only) ──

  function completeEventDescription() {
    state.phase = 'SUMMARY'
    updateHighestStep()
  }

  function goBackFromEventDescription() {
    state.phase = 'SEVERITY_RESULT'
  }

  // ── Context & Describe Navigation (Non-notification) ──

  function completeContextAndDescribe() {
    state.phase = 'SUMMARY'
    updateHighestStep()
  }

  function goBackFromContextAndDescribe() {
    state.phase = 'CLASSIFICATION_TYPE'
  }

  // ── Summary Navigation ──

  function goBackFromSummary() {
    if (isNotification.value) {
      state.phase = 'EVENT_DESCRIPTION'
    } else {
      state.phase = 'CONTEXT_AND_DESCRIBE'
    }
  }

  // ── Navigate to specific step (for stepper clicks) ──

  function navigateToStep(phase: WizardPhase) {
    const targetIndex = wizardSteps.value.findIndex(s => s.id === phase)
    const currentIndex = currentStepIndex.value
    // Allow navigating to any previously visited step (backward or forward jump)
    if (targetIndex !== currentIndex && targetIndex <= state.highestCompletedStep) {
      state.phase = phase
    }
  }

  // ── Reset ──

  function resetWizard() {
    sessionStorage.removeItem(STORAGE_KEY)
    Object.assign(state, {
      phase: 'CLASSIFICATION_TYPE' as WizardPhase,
      eventDescription: createEmptyDescription(),
      typeTree: null,
      typeCurrentNodeId: '',
      typePath: [],
      typeResult: null,
      typeContext: null,
      severityResult: null,
      severityOverride: null,
      escalationSteps: [],
      highestCompletedStep: 0,
    })
    // Re-load tree
    state.typeTree = loadTree('information-type')
    state.typeCurrentNodeId = state.typeTree.entryNode
  }

  // Initialize tree on first use
  ensureTypeTreeLoaded()

  return {
    state,
    currentTypeNode,
    isNotification,
    effectiveSeverity,
    classification,
    wizardSteps,
    currentStepIndex,
    startClassification,
    selectTypeOption,
    goBackInTypeTree,
    confirmClassification,
    reclassify,
    completeImpactAssessment,
    goBackFromImpactAssessment,
    overrideSeverity,
    clearSeverityOverride,
    setEscalationSteps,
    addEscalationStep,
    removeEscalationStep,
    updateEscalationStep,
    applyEscalationPreset,
    clearEscalation,
    completeSeverityResult,
    goBackFromSeverityResult,
    completeEventDescription,
    goBackFromEventDescription,
    completeContextAndDescribe,
    goBackFromContextAndDescribe,
    goBackFromSummary,
    navigateToStep,
    resetWizard,
  }
}
