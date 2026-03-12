/**
 * Classification Store — deterministic decision-tree walker.
 *
 * Walks two chained JSON trees (information-type -> notification-severity)
 * to classify events without LLM. State: current tree/node, path history,
 * final result, and progressive 4W narrative.
 */

import { ref, computed } from 'vue'
import type { PathEntry, QuestionNode, ResultNode, TreeNode } from '@/types/decisionTree'
import { isQuestionNode, isResultNode } from '@/types/decisionTree'
import { loadTree, getNode, hasContinuation } from '@/services/decisionTree'
import { buildProgressiveNarrative } from '@/services/classificationNarrativeBuilder'
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

const INITIAL_TREE = 'information-type'

const currentTreeId = ref(INITIAL_TREE)
const currentNodeId = ref('')
const path = ref<PathEntry[]>([])
const result = ref<ClassificationResult | null>(null)
const isComplete = ref(false)
// Captured when chaining: the intermediate result's classification (e.g. "Notification")
const pendingClassification = ref<string | null>(null)

// Initialize entry node
function initEntry() {
  const tree = loadTree(INITIAL_TREE)
  currentNodeId.value = tree.entryNode
}
initEntry()

// ---------------------------------------------------------------------------
// Computed
// ---------------------------------------------------------------------------

const answeredQuestions = computed(() => path.value.length)

/** Human-readable label for current progress step (e.g. "Event Trigger"). */
const currentStepLabel = computed(() => {
  const tree = loadTree(currentTreeId.value)
  return tree.name || currentTreeId.value
})

const totalQuestions = computed(() => {
  if (isComplete.value) return answeredQuestions.value
  const tree = loadTree(currentTreeId.value)
  const remaining = maxDepth(tree.nodes, currentNodeId.value, currentTreeId.value)
  return answeredQuestions.value + remaining
})

/** Recursive max-depth from a node to any leaf (counting question nodes only). */
function maxDepth(
  nodes: Record<string, TreeNode>,
  nodeId: string,
  treeId: string,
): number {
  const node = nodes[nodeId]
  if (!node) return 0
  if (isResultNode(node)) {
    // If result has continueWith, count depth into next tree
    if (hasContinuation(node)) {
      const nextTree = loadTree(node.continueWith!.treeId)
      return maxDepth(nextTree.nodes, nextTree.entryNode, node.continueWith!.treeId)
    }
    return 0
  }
  // Question node — 1 + max of all children
  const qNode = node as QuestionNode
  let max = 0
  for (const opt of qNode.options) {
    const childDepth = maxDepth(nodes, opt.next, treeId)
    if (childDepth > max) max = childDepth
  }
  return 1 + max
}

/** Progressive W-heading narrative built from all classification answers. */
const narrativeText = computed(() =>
  buildProgressiveNarrative(path.value, result.value?.trigger),
)

// ---------------------------------------------------------------------------
// Methods
// ---------------------------------------------------------------------------

function answerQuestion(optionIndex: number) {
  const tree = loadTree(currentTreeId.value)
  const node = getNode(tree, currentNodeId.value)

  if (!isQuestionNode(node)) return

  const qNode = node as QuestionNode
  const option = qNode.options[optionIndex]
  if (!option) return

  // Record path entry
  path.value.push({
    nodeId: currentNodeId.value,
    questionText: qNode.text,
    selectedLabel: option.label,
  })

  // Advance to the next node
  const nextId = option.next
  const nextNode = getNode(tree, nextId)

  if (isResultNode(nextNode)) {
    const resultNode = nextNode as ResultNode
    if (hasContinuation(resultNode)) {
      // Capture intermediate classification before transitioning (e.g. "Notification")
      pendingClassification.value = resultNode.classification || null
      // Seamless transition to next tree
      const nextTreeId = resultNode.continueWith!.treeId
      const nextTree = loadTree(nextTreeId)
      currentTreeId.value = nextTreeId
      currentNodeId.value = nextTree.entryNode
    } else {
      // Final result — no continuation
      buildResult(resultNode)
    }
  } else {
    currentNodeId.value = nextId
  }
}

function buildResult(node: ResultNode) {
  result.value = {
    informationType: pendingClassification.value || node.classification || 'Unknown',
    severity: node.severity || null,
    channels: node.channels || [],
    trigger: node.trigger || '',
    path: [...path.value],
  }
  isComplete.value = true
}

function getCurrentQuestion(): RenderableQuestion | null {
  if (isComplete.value) return null
  const tree = loadTree(currentTreeId.value)
  const node = getNode(tree, currentNodeId.value)
  if (!isQuestionNode(node)) return null
  return treeNodeToRenderable(node as QuestionNode, currentNodeId.value)
}

function treeNodeToRenderable(node: QuestionNode, nodeId: string): RenderableQuestion {
  return {
    id: nodeId,
    text: node.text,
    helpText: node.description,
    inputType: 'single',
    options: node.options.map((opt, idx) => ({
      value: String(idx),
      label: opt.label,
      description: opt.description,
    })),
    allowFreeform: true,
    origin: 'tree',
    targetChecklistItems: [],
  }
}

/** Map tree result to existing StoryClassification shape for ClassificationTile. */
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
 * Shows type as soon as the first tree completes (via pendingClassification),
 * and full result once classification is done.
 */
const progressiveClassification = computed<StoryClassification | null>(() => {
  // Final result takes precedence
  if (result.value) {
    return toStoryClassification(result.value)
  }

  // During severity tree, we know the type from the intermediate result
  if (pendingClassification.value) {
    return {
      type: pendingClassification.value,
      severity: null,
      channels: [],
      confidence: 0.5,
    }
  }

  return null
})

function reset() {
  currentTreeId.value = INITIAL_TREE
  const tree = loadTree(INITIAL_TREE)
  currentNodeId.value = tree.entryNode
  path.value = []
  result.value = null
  isComplete.value = false
  pendingClassification.value = null
}

// ---------------------------------------------------------------------------
// Composable export
// ---------------------------------------------------------------------------

export function useClassificationStore() {
  return {
    // State
    currentTreeId,
    currentNodeId,
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
