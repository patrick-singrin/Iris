# Phase 1: Classification Flow — Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace LLM-based classification with a deterministic decision-tree flow using two chained JSON trees (information-type → notification-severity).

**Architecture:** New `classificationStore.ts` walks two decision trees via existing `decisionTree.ts` service. `EventStoryView.vue` conditionally renders either the classification flow or the existing interview. `StoryQuestion.vue` + `RadioTile.vue` are reused for the question UI. New `ClassificationProgress.vue` and `FreeformEscapeHatch.vue` are added.

**Tech Stack:** Vue 3 + TypeScript, @telekom/scale-components, existing `decisionTree.ts` service, Vitest for tests.

**Spec:** `docs/superpowers/specs/2026-03-11-phase1-classification-design.md`

---

## File Structure

### New Files
| File | Responsibility |
|---|---|
| `src/stores/classificationStore.ts` | Tree-walking state: currentTreeId, currentNodeId, path, result, 4W narrative. Methods: answerQuestion, reset, getCurrentQuestion. Adapter: toStoryClassification. |
| `src/stores/__tests__/classificationStore.test.ts` | Unit tests for tree walking, chaining, result building, totalQuestions, 4W narrative |
| `src/components/event-story/ClassificationProgress.vue` | Step-based progress bar (6px track, magenta fill, "Step X of Y" text) |
| `src/components/event-story/FreeformEscapeHatch.vue` | LLM-assisted option matching escape hatch (trigger link, text field, suggestion display) |

### Modified Files
| File | Changes |
|---|---|
| `src/data/story-questions.ts` | Add `'tree'` to `RenderableQuestion.origin` union; make `targetChecklistItems` optional |
| `src/components/event-story/EventStoryView.vue` | Import classificationStore; conditionally render classification flow vs existing interview |
| `src/components/event-story/StoryQuestion.vue` | Add escape hatch trigger link for `origin === 'tree'` questions |
| `src/components/event-story/StoryPanel.vue` | Conditional Phase 1 mode: hide ModelSelector, product context, ReasoningTile; switch progress bars |
| `src/components/event-story/ClassificationTile.vue` | Extend `TYPE_TAG_STYLES` with tree info-type values |
| `src/stores/eventStoryStore.ts` | Expose `classificationResult` ref from classificationStore for sidebar |
| `src/i18n/en.ts` | New classification.* keys |
| `src/i18n/de.ts` | German translations for classification.* keys |

---

## Chunk 1: Foundation — Types, Store, and Core Tests

### Task 1: Extend RenderableQuestion Type

**Files:**
- Modify: `src/data/story-questions.ts:122-138`
- Test: `src/data/__tests__/story-classification.test.ts` (existing — verify no regressions)

- [ ] **Step 1: Read the current RenderableQuestion interface**

Open `src/data/story-questions.ts` and locate the `RenderableQuestion` interface (lines 122-138). Note the `origin` field is `'default' | 'verify' | 'followup'` and `targetChecklistItems` is `string[]` (required).

- [ ] **Step 2: Write a test to verify tree origin is accepted**

Create `src/stores/__tests__/classificationStore.test.ts` with an initial test:

```typescript
import { describe, it, expect } from 'vitest'
import type { RenderableQuestion } from '@/data/story-questions'

describe('RenderableQuestion tree origin', () => {
  it('accepts tree as a valid origin', () => {
    const q: RenderableQuestion = {
      id: 'test',
      text: 'Test question',
      inputType: 'single',
      options: [],
      allowFreeform: false,
      origin: 'tree',
      targetChecklistItems: [],
    }
    expect(q.origin).toBe('tree')
  })

  it('allows omitted targetChecklistItems', () => {
    const q: RenderableQuestion = {
      id: 'test',
      text: 'Test question',
      inputType: 'single',
      options: [],
      allowFreeform: false,
      origin: 'tree',
    }
    expect(q.targetChecklistItems).toBeUndefined()
  })
})
```

- [ ] **Step 3: Run test to verify it fails**

Run: `npm run test:run -- --reporter verbose src/stores/__tests__/classificationStore.test.ts`
Expected: TypeScript compilation error — `'tree'` not in origin union, `targetChecklistItems` is required.

- [ ] **Step 4: Modify RenderableQuestion to accept 'tree' and optional targetChecklistItems**

In `src/data/story-questions.ts`, change line ~130:
```typescript
  origin: 'default' | 'verify' | 'followup' | 'tree'
```
And change line ~131:
```typescript
  targetChecklistItems?: string[]
```

- [ ] **Step 5: Run tests to verify pass**

Run: `npm run test:run -- --reporter verbose src/stores/__tests__/classificationStore.test.ts`
Expected: PASS

Then run full test suite to check no regressions:
Run: `npm run test:run`
Expected: All existing tests pass

- [ ] **Step 6: Commit**

```bash
git add src/data/story-questions.ts src/stores/__tests__/classificationStore.test.ts
git commit -m "feat: extend RenderableQuestion with 'tree' origin, optional targetChecklistItems"
```

---

### Task 2: Create classificationStore — Core Tree Walking

**Files:**
- Create: `src/stores/classificationStore.ts`
- Test: `src/stores/__tests__/classificationStore.test.ts` (extend)

- [ ] **Step 1: Write failing tests for core tree walking**

Add to `src/stores/__tests__/classificationStore.test.ts`:

```typescript
import { useClassificationStore } from '../classificationStore'

describe('classificationStore', () => {
  describe('initialization', () => {
    it('starts with information-type tree at entry node', () => {
      const store = useClassificationStore()
      store.reset()
      expect(store.currentTreeId.value).toBe('information-type')
      expect(store.currentNodeId.value).toBe('start')
      expect(store.isComplete.value).toBe(false)
      expect(store.path.value).toEqual([])
    })
  })

  describe('answerQuestion', () => {
    it('advances to next node on answer', () => {
      const store = useClassificationStore()
      store.reset()
      // Answer "Yes — triggered by the user" (option 0)
      store.answerQuestion(0)
      expect(store.currentNodeId.value).toBe('user_problem_check')
      expect(store.path.value).toHaveLength(1)
      expect(store.path.value[0].selectedLabel).toBe('Yes — triggered by the user')
    })

    it('records path entries correctly', () => {
      const store = useClassificationStore()
      store.reset()
      store.answerQuestion(0) // "Yes — triggered by the user"
      store.answerQuestion(0) // "Yes — there's a problem"
      expect(store.path.value).toHaveLength(2)
      expect(store.path.value[0].questionText).toBe('Is the user actively doing something?')
      expect(store.path.value[1].questionText).toBe('Did something go wrong?')
    })
  })

  describe('non-Notification result', () => {
    it('completes when reaching a non-Notification result node', () => {
      const store = useClassificationStore()
      store.reset()
      // Path to "Error & Warnings": start → user_problem_check → result_error_warning
      store.answerQuestion(0) // Yes — triggered by user
      store.answerQuestion(0) // Yes — there's a problem
      expect(store.isComplete.value).toBe(true)
      expect(store.result.value).not.toBeNull()
      expect(store.result.value!.informationType).toBe('Error & Warnings')
      expect(store.result.value!.severity).toBeNull()
      expect(store.result.value!.channels).toEqual([])
    })
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm run test:run -- --reporter verbose src/stores/__tests__/classificationStore.test.ts`
Expected: FAIL — `useClassificationStore` does not exist.

- [ ] **Step 3: Implement classificationStore core**

Create `src/stores/classificationStore.ts`:

```typescript
/**
 * Classification Store — deterministic decision-tree walker.
 *
 * Walks two chained JSON trees (information-type → notification-severity)
 * to classify events without LLM. State: current tree/node, path history,
 * final result, and progressive 4W narrative.
 */

import { ref, computed } from 'vue'
import type { PathEntry, QuestionNode, ResultNode } from '@/types/decisionTree'
import { loadTree, getNode, isQuestionNode, isResultNode, hasContinuation } from '@/services/decisionTree'
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

export interface Narrative4W {
  who: string
  what: string
  when: string
  whatToDo: string
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

// Initialize
function initEntry() {
  const tree = loadTree(INITIAL_TREE)
  currentNodeId.value = tree.entryNode
}
initEntry()

// ---------------------------------------------------------------------------
// Computed
// ---------------------------------------------------------------------------

const answeredQuestions = computed(() => path.value.length)

const totalQuestions = computed(() => {
  if (isComplete.value) return answeredQuestions.value
  const tree = loadTree(currentTreeId.value)
  const remaining = maxDepth(tree.nodes, currentNodeId.value, currentTreeId.value)
  return answeredQuestions.value + remaining
})

/** Recursive max-depth from a node to any leaf (counting question nodes only). */
function maxDepth(
  nodes: Record<string, import('@/types/decisionTree').TreeNode>,
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

const narrative4W = computed<Narrative4W>(() => {
  const n: Narrative4W = { who: '', what: '', when: 'NOW', whatToDo: '' }

  // Extract from severity tree path entries
  for (const entry of path.value) {
    // Scope questions → who
    if (entry.nodeId === 'blocked_scope' || entry.nodeId === 'degraded_scope') {
      n.who = entry.selectedLabel
    }
    // Impact question → what
    if (entry.nodeId === 'impact') {
      n.what = entry.selectedLabel
    }
    // Action question → whatToDo
    if (entry.nodeId === 'action') {
      n.whatToDo = entry.selectedLabel
    }
  }

  // Append trigger from result
  if (result.value?.trigger) {
    n.what = n.what ? `${n.what} — ${result.value.trigger}` : result.value.trigger
  }

  return n
})

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

  // Advance
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
      // Final result
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
    allowFreeform: false,
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
    narrative4W,

    // Methods
    answerQuestion,
    getCurrentQuestion,
    toStoryClassification,
    reset,
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm run test:run -- --reporter verbose src/stores/__tests__/classificationStore.test.ts`
Expected: All 4 tests PASS

- [ ] **Step 5: Commit**

```bash
git add src/stores/classificationStore.ts src/stores/__tests__/classificationStore.test.ts
git commit -m "feat: classificationStore with tree walking and non-Notification results"
```

---

### Task 3: Tree Chaining (Notification → Severity)

**Files:**
- Test: `src/stores/__tests__/classificationStore.test.ts` (extend)
- Modify: `src/stores/classificationStore.ts` (already implemented — just verify)

- [ ] **Step 1: Write failing tests for tree chaining**

Add to the test file:

```typescript
describe('tree chaining (Notification → severity)', () => {
  it('seamlessly transitions to severity tree for Notification type', () => {
    const store = useClassificationStore()
    store.reset()
    // Path to Notification: start → system_temporality → result_notification
    // start: option 1 = "No — it happens independently"
    store.answerQuestion(1)
    // system_temporality: "Was this planned in advance?" → option 1 = "No — it just happened"
    store.answerQuestion(1)

    // Should now be in severity tree
    expect(store.currentTreeId.value).toBe('notification-severity')
    expect(store.currentNodeId.value).toBe('platform')
    expect(store.isComplete.value).toBe(false)
  })

  it('completes with severity when finishing severity tree', () => {
    const store = useClassificationStore()
    store.reset()
    // Path to Notification
    store.answerQuestion(1) // No — it happens independently
    store.answerQuestion(1) // No — it just happened
    // Now in severity tree at 'platform'
    // Answer: "Yes — complete outage" → r_critical_outage
    store.answerQuestion(0)

    expect(store.isComplete.value).toBe(true)
    expect(store.result.value).not.toBeNull()
    expect(store.result.value!.informationType).toBe('Notification')
    expect(store.result.value!.severity).toBe('CRITICAL')
    expect(store.result.value!.channels.length).toBeGreaterThan(0)
  })

  it('tracks total path across both trees', () => {
    const store = useClassificationStore()
    store.reset()
    store.answerQuestion(1) // info-type tree Q1
    store.answerQuestion(1) // info-type tree Q2 → chains
    store.answerQuestion(0) // severity tree Q1 → result
    // 3 questions total across both trees
    expect(store.path.value).toHaveLength(3)
    expect(store.answeredQuestions.value).toBe(3)
  })
})
```

- [ ] **Step 2: Run tests**

Run: `npm run test:run -- --reporter verbose src/stores/__tests__/classificationStore.test.ts`

If tree chaining is correctly reading `continueWith` from the result node, tests should PASS. If the info-type tree's Notification result doesn't have `continueWith`, check the tree JSON.

- [ ] **Step 3: Fix any issues**

The info-type tree's Notification result node (`result_notification`) should have:
```json
"continueWith": { "treeId": "notification-severity", "treeFile": "decision-tree_notification-severity.json", "reason": "Notifications need severity classification" }
```

If it's missing, check `src/data/decision-tree_information-type.json` and verify the result node.

- [ ] **Step 4: Run full test suite**

Run: `npm run test:run`
Expected: All tests pass.

- [ ] **Step 5: Commit (if any fixes were needed)**

```bash
git add -A
git commit -m "test: tree chaining tests for Notification → severity flow"
```

---

### Task 4: totalQuestions and Narrative4W Tests

**Files:**
- Test: `src/stores/__tests__/classificationStore.test.ts` (extend)

- [ ] **Step 1: Write tests for totalQuestions**

```typescript
describe('totalQuestions', () => {
  it('estimates total including remaining questions on longest path', () => {
    const store = useClassificationStore()
    store.reset()
    // At start of info-type tree, total should be > 0
    expect(store.totalQuestions.value).toBeGreaterThan(0)
    // After answering first question, total should adjust
    const initialTotal = store.totalQuestions.value
    store.answerQuestion(0)
    // answeredQuestions increased by 1
    expect(store.answeredQuestions.value).toBe(1)
    // total should still be reasonable (2-7 range per spec)
    expect(store.totalQuestions.value).toBeGreaterThanOrEqual(2)
    expect(store.totalQuestions.value).toBeLessThanOrEqual(13)
  })

  it('equals answeredQuestions when complete', () => {
    const store = useClassificationStore()
    store.reset()
    store.answerQuestion(0) // triggered by user
    store.answerQuestion(0) // problem → Error & Warnings
    expect(store.isComplete.value).toBe(true)
    expect(store.totalQuestions.value).toBe(store.answeredQuestions.value)
  })
})
```

- [ ] **Step 2: Write tests for narrative4W**

```typescript
describe('narrative4W', () => {
  it('always has when = NOW', () => {
    const store = useClassificationStore()
    store.reset()
    expect(store.narrative4W.value.when).toBe('NOW')
  })

  it('fills who from scope questions in severity tree', () => {
    const store = useClassificationStore()
    store.reset()
    // Get to severity tree
    store.answerQuestion(1) // No — independent
    store.answerQuestion(1) // No — just happened
    // severity tree: platform
    store.answerQuestion(1) // No — some services work → security
    store.answerQuestion(1) // No security → impact
    store.answerQuestion(0) // No — blocked → blocked_scope
    store.answerQuestion(0) // Many users → result

    expect(store.narrative4W.value.who).toBe('Many users')
  })

  it('includes trigger in what field when complete', () => {
    const store = useClassificationStore()
    store.reset()
    store.answerQuestion(1)
    store.answerQuestion(1)
    store.answerQuestion(0) // complete outage → CRITICAL result
    expect(store.result.value?.trigger).toBeTruthy()
    expect(store.narrative4W.value.what).toContain(store.result.value!.trigger)
  })
})
```

- [ ] **Step 3: Run tests**

Run: `npm run test:run -- --reporter verbose src/stores/__tests__/classificationStore.test.ts`
Expected: All PASS.

- [ ] **Step 4: Commit**

```bash
git add src/stores/__tests__/classificationStore.test.ts
git commit -m "test: totalQuestions and narrative4W tests for classificationStore"
```

---

### Task 5: toStoryClassification Adapter

**Files:**
- Test: `src/stores/__tests__/classificationStore.test.ts` (extend)

- [ ] **Step 1: Write tests for the adapter**

```typescript
describe('toStoryClassification', () => {
  it('maps ClassificationResult to StoryClassification shape', () => {
    const store = useClassificationStore()
    store.reset()
    // Path to CRITICAL
    store.answerQuestion(1)
    store.answerQuestion(1)
    store.answerQuestion(0) // complete outage
    const sc = store.toStoryClassification(store.result.value!)
    expect(sc.type).toBe('Notification')
    expect(sc.severity).toBe('CRITICAL')
    expect(sc.channels.length).toBeGreaterThan(0)
    expect(sc.confidence).toBe(1)
  })

  it('sets severity to null for non-Notification types', () => {
    const store = useClassificationStore()
    store.reset()
    store.answerQuestion(0)
    store.answerQuestion(0) // Error & Warnings
    const sc = store.toStoryClassification(store.result.value!)
    expect(sc.type).toBe('Error & Warnings')
    expect(sc.severity).toBeNull()
    expect(sc.confidence).toBe(1)
  })
})
```

- [ ] **Step 2: Run tests**

Run: `npm run test:run -- --reporter verbose src/stores/__tests__/classificationStore.test.ts`
Expected: PASS (adapter already implemented in Task 2).

- [ ] **Step 3: Commit**

```bash
git add src/stores/__tests__/classificationStore.test.ts
git commit -m "test: toStoryClassification adapter tests"
```

---

## Chunk 2: UI Components

### Task 6: ClassificationProgress.vue

**Files:**
- Create: `src/components/event-story/ClassificationProgress.vue`

- [ ] **Step 1: Create the component**

```vue
<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from '@/i18n'

const { t } = useI18n()

const props = defineProps<{
  current: number
  total: number
  complete: boolean
}>()

const percentage = computed(() => {
  if (props.complete) return 100
  if (props.total === 0) return 0
  return Math.round((props.current / props.total) * 100)
})

const fillWidth = computed(() => `${percentage.value}%`)

const infoText = computed(() => {
  if (props.complete) return t('classification.progress.complete')
  // t() doesn't support interpolation — manually replace placeholders
  return t('classification.progress.step')
    .replace('{current}', String(props.current))
    .replace('{total}', String(props.total))
})
</script>

<template>
  <div class="classification-progress">
    <div class="classification-progress__track">
      <div
        class="classification-progress__fill"
        :style="{ width: fillWidth }"
      />
    </div>
    <div class="classification-progress__info">
      <span v-if="complete" class="classification-progress__check">&#10003;</span>
      <span>{{ infoText }}</span>
    </div>
  </div>
</template>

<style scoped>
.classification-progress {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.classification-progress__track {
  position: relative;
  height: 6px;
  background: var(--telekom-color-ui-faint, #dfdfe1);
  border-radius: 50px;
  overflow: hidden;
}

.classification-progress__fill {
  position: absolute;
  top: 0;
  left: 0;
  height: 100%;
  border-radius: 50px;
  background: var(--telekom-color-primary-standard, #e20074);
  transition: width 0.3s ease;
}

.classification-progress__info {
  display: flex;
  align-items: center;
  gap: 4px;
  font-family: 'TeleNeo', sans-serif;
  font-size: 14px;
  font-weight: 400;
  color: var(--telekom-color-text-and-icon-standard, #000000);
  line-height: 19.6px;
}

.classification-progress__check {
  color: var(--telekom-color-functional-success-standard, #00b367);
  font-weight: 700;
}
</style>
```

- [ ] **Step 2: Verify build**

Run: `npm run build`
Expected: No TypeScript errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/event-story/ClassificationProgress.vue
git commit -m "feat: ClassificationProgress component — step-based progress bar"
```

---

### Task 7: FreeformEscapeHatch.vue

**Files:**
- Create: `src/components/event-story/FreeformEscapeHatch.vue`

- [ ] **Step 1: Create the component**

```vue
<script setup lang="ts">
import { ref, computed } from 'vue'
import type { RenderableQuestion } from '@/data/story-questions'
import { useI18n } from '@/i18n'

const { t } = useI18n()

const props = defineProps<{
  question: RenderableQuestion
  visible: boolean
}>()

const emit = defineEmits<{
  selectOption: [optionIndex: number]
  close: []
}>()

const freeformText = ref('')
const isLoading = ref(false)
const suggestion = ref<{ optionIndex: number; label: string; explanation: string; confidence: string } | null>(null)
const retryCount = ref(0)
const errorMessage = ref('')

const showNudge = computed(() => retryCount.value >= 3)

function handleFreeformInput(event: Event) {
  const target = event.target as HTMLTextAreaElement | null
  if (target) freeformText.value = target.value
}

async function handleSubmit() {
  if (!freeformText.value.trim() || isLoading.value) return
  isLoading.value = true
  errorMessage.value = ''
  suggestion.value = null

  try {
    // Build prompt for LLM
    const optionDescriptions = props.question.options
      .map((opt, idx) => `${idx + 1}. "${opt.label}"${opt.description ? ` — ${opt.description}` : ''}`)
      .join('\n')

    const prompt = `You are helping a user classify a platform event. They were asked the following question but couldn't pick an option.

Question: "${props.question.text}"
${props.question.helpText ? `Context: ${props.question.helpText}` : ''}

Available options:
${optionDescriptions}

The user described their situation as: "${freeformText.value}"

Map their description to the most appropriate option. Respond with ONLY a JSON object:
{"optionIndex": <0-based index>, "label": "<option label>", "explanation": "<1-2 sentence explanation>", "confidence": "high"|"medium"|"low"}`

    // Import LLM service dynamically to avoid circular deps
    const { createProvider } = await import('@/services/llm/providerFactory')
    const provider = createProvider()
    const genResult = await provider.generateText({
      systemPrompt: 'You are helping a user classify a platform event. Respond with ONLY a JSON object.',
      userPrompt: prompt,
    })
    const response = genResult.rawResponse

    // Parse response
    const jsonMatch = response.match(/\{[\s\S]*\}/)
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0])
      if (typeof parsed.optionIndex === 'number' && parsed.optionIndex >= 0 && parsed.optionIndex < props.question.options.length) {
        suggestion.value = parsed
      } else {
        errorMessage.value = t('classification.escapeHatch.noMatch')
      }
    } else {
      errorMessage.value = t('classification.escapeHatch.noMatch')
    }
  } catch {
    errorMessage.value = t('classification.escapeHatch.noMatch')
  } finally {
    isLoading.value = false
    retryCount.value++
  }
}

function acceptSuggestion() {
  if (suggestion.value) {
    emit('selectOption', suggestion.value.optionIndex)
  }
}

function tryAgain() {
  freeformText.value = ''
  suggestion.value = null
  errorMessage.value = ''
}
</script>

<template>
  <div v-if="visible" class="escape-hatch">
    <!-- Freeform input -->
    <div v-if="!suggestion" class="escape-hatch__input">
      <scale-textarea
        :value="freeformText"
        :placeholder="t('story.typeYourAnswer')"
        rows="3"
        resize="vertical"
        @scaleChange="handleFreeformInput"
      />
      <div class="escape-hatch__actions">
        <scale-button
          size="small"
          :disabled="!freeformText.trim() || isLoading"
          @click="handleSubmit"
        >
          {{ isLoading ? '...' : t('story.continue') }}
        </scale-button>
      </div>
    </div>

    <!-- Suggestion -->
    <div v-if="suggestion" class="escape-hatch__suggestion">
      <div class="escape-hatch__suggestion-label">
        <strong>{{ suggestion.label }}</strong>
        <span class="escape-hatch__confidence" :class="`escape-hatch__confidence--${suggestion.confidence}`">
          {{ suggestion.confidence }}
        </span>
      </div>
      <p class="escape-hatch__explanation">{{ suggestion.explanation }}</p>
      <div class="escape-hatch__actions">
        <scale-button size="small" @click="acceptSuggestion">
          {{ t('classification.escapeHatch.useThis') }}
        </scale-button>
        <scale-button size="small" variant="secondary" @click="tryAgain">
          {{ t('classification.escapeHatch.tryAgain') }}
        </scale-button>
      </div>
    </div>

    <!-- Error -->
    <p v-if="errorMessage" class="escape-hatch__error">{{ errorMessage }}</p>

    <!-- Nudge after 3 retries -->
    <p v-if="showNudge" class="escape-hatch__nudge">{{ t('classification.escapeHatch.nudge') }}</p>
  </div>
</template>

<style scoped>
.escape-hatch {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 12px;
  background: var(--telekom-color-background-canvas-subtle, #fbfbfb);
  border-radius: 8px;
  border: 1px solid var(--telekom-color-ui-faint, #dfdfe1);
}

.escape-hatch__input {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.escape-hatch__actions {
  display: flex;
  gap: 8px;
  justify-content: flex-end;
}

.escape-hatch__suggestion {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.escape-hatch__suggestion-label {
  display: flex;
  align-items: center;
  gap: 8px;
  font-family: 'TeleNeo', sans-serif;
  font-size: 14px;
}

.escape-hatch__confidence {
  padding: 2px 6px;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 700;
  text-transform: uppercase;
}

.escape-hatch__confidence--high {
  background: var(--telekom-color-functional-success-subtle);
  color: var(--telekom-color-text-and-icon-on-subtle-success);
}

.escape-hatch__confidence--medium {
  background: var(--telekom-color-functional-warning-subtle);
  color: var(--telekom-color-text-and-icon-on-subtle-warning);
}

.escape-hatch__confidence--low {
  background: var(--telekom-color-functional-danger-subtle);
  color: var(--telekom-color-text-and-icon-on-subtle-danger);
}

.escape-hatch__explanation {
  font-family: 'TeleNeo', sans-serif;
  font-size: 14px;
  color: var(--telekom-color-text-and-icon-additional, rgba(0, 0, 0, 0.65));
  margin: 0;
}

.escape-hatch__error {
  font-family: 'TeleNeo', sans-serif;
  font-size: 13px;
  color: var(--telekom-color-functional-danger-standard, #e82010);
  margin: 0;
}

.escape-hatch__nudge {
  font-family: 'TeleNeo', sans-serif;
  font-size: 13px;
  color: var(--telekom-color-text-and-icon-additional, rgba(0, 0, 0, 0.65));
  font-style: italic;
  margin: 0;
}
</style>
```

- [ ] **Step 2: Verify build**

Run: `npm run build`
Expected: No TypeScript errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/event-story/FreeformEscapeHatch.vue
git commit -m "feat: FreeformEscapeHatch — LLM-assisted option matching for tree questions"
```

---

## Chunk 3: Integration — Wiring Components Together

### Task 8: i18n Keys

**Files:**
- Modify: `src/i18n/en.ts`
- Modify: `src/i18n/de.ts`

- [ ] **Step 1: Add English keys**

Add to `src/i18n/en.ts` after the existing keys (find a logical insertion point near story/classification keys):

```typescript
  // Classification flow (Phase 1)
  'classification.progress.step': 'Step {current} of {total}',
  'classification.progress.complete': 'Classification complete',
  'classification.escapeHatch.trigger': 'Not sure? Describe what\'s happening instead',
  'classification.escapeHatch.useThis': 'Use this',
  'classification.escapeHatch.tryAgain': 'Try again',
  'classification.escapeHatch.nudge': 'Having trouble? Try selecting one of the options directly — the helper text under each option explains what it covers.',
  'classification.escapeHatch.noMatch': 'I couldn\'t match your description to any of the options. Try describing what\'s happening on your platform.',
  'classification.result.title': 'Classification Result',
  'classification.result.phase1Complete': 'Phase 1 complete',
  'classification.result.trigger': 'Trigger',
  'classification.result.channels': 'Recommended channels',
  'classification.narrative.who': 'Who',
  'classification.narrative.what': 'What',
  'classification.narrative.when': 'When',
  'classification.narrative.whatToDo': 'What to do',
```

- [ ] **Step 2: Add German keys**

Add corresponding keys to `src/i18n/de.ts`:

```typescript
  // Klassifizierungsfluss (Phase 1)
  'classification.progress.step': 'Schritt {current} von {total}',
  'classification.progress.complete': 'Klassifizierung abgeschlossen',
  'classification.escapeHatch.trigger': 'Nicht sicher? Beschreiben Sie stattdessen, was passiert',
  'classification.escapeHatch.useThis': 'Übernehmen',
  'classification.escapeHatch.tryAgain': 'Erneut versuchen',
  'classification.escapeHatch.nudge': 'Probleme? Versuchen Sie, eine der Optionen direkt auszuwählen — der Hilfetext unter jeder Option erklärt, was sie abdeckt.',
  'classification.escapeHatch.noMatch': 'Ihre Beschreibung konnte keiner Option zugeordnet werden. Versuchen Sie zu beschreiben, was auf Ihrer Plattform passiert.',
  'classification.result.title': 'Klassifizierungsergebnis',
  'classification.result.phase1Complete': 'Phase 1 abgeschlossen',
  'classification.result.trigger': 'Auslöser',
  'classification.result.channels': 'Empfohlene Kanäle',
  'classification.narrative.who': 'Wer',
  'classification.narrative.what': 'Was',
  'classification.narrative.when': 'Wann',
  'classification.narrative.whatToDo': 'Was ist zu tun',
```

- [ ] **Step 3: Verify build**

Run: `npm run build`
Expected: No errors.

- [ ] **Step 4: Commit**

```bash
git add src/i18n/en.ts src/i18n/de.ts
git commit -m "feat: add classification flow i18n keys (EN + DE)"
```

---

### Task 9: Extend ClassificationTile TYPE_TAG_STYLES

**Files:**
- Modify: `src/components/event-story/ClassificationTile.vue:21-26`

- [ ] **Step 1: Add tree info-type values to TYPE_TAG_STYLES**

In `ClassificationTile.vue`, extend the `TYPE_TAG_STYLES` map to include the decision tree's information type values. Add after the existing entries:

```typescript
const TYPE_TAG_STYLES: Record<string, { bg: string; text: string }> = {
  // Existing keys (from LLM classification)
  Notification:      { bg: 'var(--telekom-color-additional-teal-subtle)', text: 'var(--telekom-color-text-and-icon-on-subtle-teal)' },
  'Error or issue':  { bg: 'var(--telekom-color-functional-danger-subtle)', text: 'var(--telekom-color-text-and-icon-on-subtle-danger)' },
  'System change':   { bg: 'var(--telekom-color-additional-cyan-subtle)', text: 'var(--telekom-color-text-and-icon-on-subtle-cyan)' },
  'Process update':  { bg: 'var(--telekom-color-additional-yellow-subtle)', text: 'var(--telekom-color-text-and-icon-on-subtle-yellow)' },
  // Tree-based keys (from decision tree classification)
  'Error & Warnings':           { bg: 'var(--telekom-color-functional-danger-subtle)', text: 'var(--telekom-color-text-and-icon-on-subtle-danger)' },
  'Status Display':             { bg: 'var(--telekom-color-additional-cyan-subtle)', text: 'var(--telekom-color-text-and-icon-on-subtle-cyan)' },
  'Feedback':                   { bg: 'var(--telekom-color-ui-faint)', text: 'var(--telekom-color-text-and-icon-standard)' },
  'Validation Messages':        { bg: 'var(--telekom-color-ui-faint)', text: 'var(--telekom-color-text-and-icon-standard)' },
  'Transactional Confirmation': { bg: 'var(--telekom-color-ui-faint)', text: 'var(--telekom-color-text-and-icon-standard)' },
}
```

- [ ] **Step 2: Verify build**

Run: `npm run build`
Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/event-story/ClassificationTile.vue
git commit -m "feat: extend ClassificationTile TYPE_TAG_STYLES with tree info-type values"
```

---

### Task 10: Modify StoryQuestion.vue — Escape Hatch Trigger

**Files:**
- Modify: `src/components/event-story/StoryQuestion.vue`

- [ ] **Step 1: Import FreeformEscapeHatch and add trigger link**

In the `<script setup>` section, add import:
```typescript
import FreeformEscapeHatch from './FreeformEscapeHatch.vue'
import type { QuestionNode } from '@/types/decisionTree'
```

Add state for escape hatch visibility:
```typescript
const escapeHatchOpen = ref(false)
```

Add a computed to check if LLM is available (for conditional rendering):
```typescript
import { useSettingsStore } from '@/stores/settingsStore'

const { state: settingsState } = useSettingsStore()
const isTreeQuestion = computed(() => props.question.origin === 'tree')
const hasLLM = computed(() => {
  // LLM is available if any provider has configuration
  return settingsState.provider === 'lmstudio'
    || settingsState.anthropicApiKey !== ''
    || settingsState.llmHubApiKey !== ''
})
const showEscapeHatch = computed(() => isTreeQuestion.value && hasLLM.value)
```

Add handler for escape hatch option selection:
```typescript
function handleEscapeHatchSelect(optionIndex: number) {
  selectSingle(String(optionIndex))
  escapeHatchOpen.value = false
  // Auto-submit after LLM selection
  nextTick(() => handleSubmit())
}
```

- [ ] **Step 2: Add template elements**

In the `<!-- RADIO / CHECK / FREEFORM variant -->` template section, between the options `</div>` and the freeform textarea `<div v-if="question.allowFreeform">`, add:

```html
          <!-- Escape hatch trigger (tree questions only) -->
          <template v-if="showEscapeHatch">
            <button
              v-if="!escapeHatchOpen"
              class="input-panel__escape-trigger"
              @click="escapeHatchOpen = true"
            >
              {{ t('classification.escapeHatch.trigger') }}
            </button>
            <FreeformEscapeHatch
              v-if="escapeHatchOpen"
              :question="question"
              :visible="escapeHatchOpen"
              @select-option="handleEscapeHatchSelect"
              @close="escapeHatchOpen = false"
            />
          </template>
```

Note: `FreeformEscapeHatch` now accepts `RenderableQuestion` directly, so no type cast is needed.

- [ ] **Step 3: Add CSS for the trigger link**

```css
.input-panel__escape-trigger {
  background: none;
  border: none;
  padding: 0;
  font-family: 'TeleNeo', sans-serif;
  font-size: 14px;
  color: var(--telekom-color-text-and-icon-link, #00739f);
  cursor: pointer;
  text-decoration: underline;
  text-align: left;
}

.input-panel__escape-trigger:hover {
  color: var(--telekom-color-text-and-icon-link-hovered, #005a7e);
}
```

- [ ] **Step 4: Reset escape hatch state when question changes**

In the existing `watch(() => props.question.id, ...)`, add:
```typescript
  escapeHatchOpen.value = false
```

- [ ] **Step 5: Verify build**

Run: `npm run build`
Expected: No errors.

- [ ] **Step 6: Commit**

```bash
git add src/components/event-story/StoryQuestion.vue
git commit -m "feat: escape hatch trigger link in StoryQuestion for tree questions"
```

---

### Task 11: Modify StoryPanel.vue — Phase 1 Mode

**Files:**
- Modify: `src/components/event-story/StoryPanel.vue`

- [ ] **Step 1: Import classificationStore and ClassificationProgress**

In `<script setup>`, add:
```typescript
import ClassificationProgress from './ClassificationProgress.vue'
import { useClassificationStore } from '@/stores/classificationStore'

const classificationStore = useClassificationStore()

const isClassifying = computed(() => !classificationStore.isComplete.value)

// Narrative text for the textarea during classification
const classificationNarrative = computed(() => {
  const n = classificationStore.narrative4W.value
  const lines: string[] = []
  if (n.who) lines.push(`${t('classification.narrative.who')}: ${n.who}`)
  if (n.what) lines.push(`${t('classification.narrative.what')}: ${n.what}`)
  lines.push(`${t('classification.narrative.when')}: ${n.when}`)
  if (n.whatToDo) lines.push(`${t('classification.narrative.whatToDo')}: ${n.whatToDo}`)
  return lines.join('\n')
})

// Classification result mapped for ClassificationTile
const treeClassification = computed(() => {
  if (!classificationStore.result.value) return null
  return classificationStore.toStoryClassification(classificationStore.result.value)
})
```

- [ ] **Step 2: Modify template for conditional rendering**

Wrap `ModelSelector` with `v-if="!isClassifying"`:
```html
      <ModelSelector v-if="!isClassifying" />
```

Make the textarea read-only during classification and show narrative:
```html
      <scale-textarea
        ref="textareaRef"
        :value="isClassifying ? classificationNarrative : draftText"
        :label="t('story.narrativeLabel')"
        :placeholder="t('story.narrativePlaceholder')"
        rows="10"
        resize="vertical"
        :readonly="isReadOnly || isClassifying"
        @scaleChange="handleStoryInput"
      />
```

Switch progress bars:
```html
        <ClassificationProgress
          v-if="isClassifying"
          :current="classificationStore.answeredQuestions.value"
          :total="classificationStore.totalQuestions.value"
          :complete="classificationStore.isComplete.value"
        />
        <ProgressBar
          v-else
          :verified="checklistProgress.verified"
          :unverified="checklistProgress.unverified"
          :total="checklist.length"
        />
```

Switch classification tile source:
```html
      <ClassificationTile
        :classification="isClassifying ? treeClassification : classification"
        :checklist="checklist"
      />
```

Hide product context and reasoning tile during classification:
```html
      <div v-if="!isClassifying" class="story-panel__bottom">
        <!-- ... existing content ... -->
      </div>
```

- [ ] **Step 3: Verify build**

Run: `npm run build`
Expected: No errors.

- [ ] **Step 4: Commit**

```bash
git add src/components/event-story/StoryPanel.vue
git commit -m "feat: StoryPanel Phase 1 mode — conditional rendering during classification"
```

---

### Task 12: Modify EventStoryView.vue — Classification Flow

**Files:**
- Modify: `src/components/event-story/EventStoryView.vue`

- [ ] **Step 1: Import classificationStore and StoryQuestion**

In `<script setup>`, add:
```typescript
import StoryQuestion from './StoryQuestion.vue'
import { useClassificationStore } from '@/stores/classificationStore'

const classificationStore = useClassificationStore()
const currentTreeQuestion = computed(() => classificationStore.getCurrentQuestion())

function handleTreeAnswer(selectedOptions: string[], _freeformText: string) {
  // selectedOptions[0] is the string index (e.g., "0", "1")
  const optionIndex = parseInt(selectedOptions[0], 10)
  if (!isNaN(optionIndex)) {
    classificationStore.answerQuestion(optionIndex)
  }
}
```

- [ ] **Step 2: Add classification flow to template**

Replace the `<template v-if="phase === 'collect'">` section with classification-aware rendering:

```html
    <template v-if="phase === 'collect'">
      <div class="event-story-view__main">
        <!-- Classification flow (Phase 1) -->
        <template v-if="!classificationStore.isComplete.value">
          <div class="event-story-view__classification">
            <StoryQuestion
              v-if="currentTreeQuestion"
              :key="currentTreeQuestion.id"
              :question="currentTreeQuestion"
              @answer="handleTreeAnswer"
            />
            <!-- Result card when classification is done -->
          </div>
        </template>

        <!-- Post-classification: show result card (Phase 1 end state) -->
        <template v-else-if="classificationStore.isComplete.value && classificationStore.result.value">
          <div class="event-story-view__result">
            <div class="result-card">
              <h2 class="result-card__title">{{ t('classification.result.title') }}</h2>
              <div class="result-card__tags">
                <span class="result-card__type-tag">
                  {{ classificationStore.result.value.informationType }}
                </span>
                <span v-if="classificationStore.result.value.severity" class="result-card__severity-tag">
                  {{ classificationStore.result.value.severity }}
                </span>
              </div>
              <div v-if="classificationStore.result.value.trigger" class="result-card__section">
                <span class="result-card__label">{{ t('classification.result.trigger') }}</span>
                <span>{{ classificationStore.result.value.trigger }}</span>
              </div>
              <div v-if="classificationStore.result.value.channels.length > 0" class="result-card__section">
                <span class="result-card__label">{{ t('classification.result.channels') }}</span>
                <div class="result-card__channels">
                  <span v-for="ch in classificationStore.result.value.channels" :key="ch" class="result-card__channel">{{ ch }}</span>
                </div>
              </div>
              <div class="result-card__footer">
                <span class="result-card__complete">{{ t('classification.result.phase1Complete') }}</span>
              </div>
            </div>
          </div>
        </template>

        <!-- Existing interview (shown after classification in Phase 2/3 — placeholder) -->
        <StoryDialog v-else />
      </div>
      <div class="event-story-view__sidebar">
        <StoryPanel />
      </div>
    </template>
```

- [ ] **Step 3: Add result card styles**

```css
.event-story-view__classification {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 48px 16px;
  max-width: 640px;
  margin: 0 auto;
  width: 100%;
}

.event-story-view__result {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 48px 16px;
  max-width: 640px;
  margin: 0 auto;
  width: 100%;
}

.result-card {
  background: var(--telekom-color-background-surface, #fff);
  border-radius: 8px;
  padding: 24px;
  display: flex;
  flex-direction: column;
  gap: 16px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  width: 100%;
}

.result-card__title {
  font-family: 'TeleNeo', sans-serif;
  font-size: 20px;
  font-weight: 800;
  color: var(--telekom-color-text-and-icon-standard, #000000);
  margin: 0;
}

.result-card__tags {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.result-card__type-tag,
.result-card__severity-tag {
  display: inline-flex;
  align-items: center;
  padding: 3px 8px;
  border-radius: 4px;
  font-family: 'TeleNeo', sans-serif;
  font-size: 14px;
  font-weight: 700;
  white-space: nowrap;
}

.result-card__type-tag {
  background: var(--telekom-color-ui-faint, #dfdfe1);
  color: var(--telekom-color-text-and-icon-standard, #000000);
}

.result-card__severity-tag {
  background: var(--telekom-color-functional-warning-subtle);
  color: var(--telekom-color-text-and-icon-on-subtle-warning);
}

.result-card__section {
  display: flex;
  flex-direction: column;
  gap: 4px;
  font-family: 'TeleNeo', sans-serif;
  font-size: 14px;
}

.result-card__label {
  font-weight: 700;
  color: var(--telekom-color-text-and-icon-standard, #000000);
}

.result-card__channels {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}

.result-card__channel {
  display: inline-flex;
  align-items: center;
  padding: 2px 4px;
  border-radius: 4px;
  background: var(--telekom-color-ui-faint, #dfdfe1);
  font-size: 12px;
  font-weight: 700;
}

.result-card__footer {
  padding-top: 8px;
  border-top: 1px solid var(--telekom-color-ui-faint, #dfdfe1);
}

.result-card__complete {
  font-family: 'TeleNeo', sans-serif;
  font-size: 14px;
  font-weight: 700;
  color: var(--telekom-color-functional-success-standard, #00b367);
}
```

- [ ] **Step 4: Verify build**

Run: `npm run build`
Expected: No errors.

- [ ] **Step 5: Commit**

```bash
git add src/components/event-story/EventStoryView.vue
git commit -m "feat: EventStoryView classification flow — tree questions + result card"
```

---

### Task 13: Expose classificationResult in eventStoryStore

**Files:**
- Modify: `src/stores/eventStoryStore.ts`

- [ ] **Step 1: Import and expose classificationStore result**

At the top of `eventStoryStore.ts`, add:
```typescript
import { useClassificationStore } from '@/stores/classificationStore'
```

Inside `useEventStoryStore()`, add:
```typescript
  const classificationStore = useClassificationStore()
  const classificationResult = computed(() => classificationStore.result.value)
```

Add to the return object:
```typescript
    classificationResult,
```

- [ ] **Step 2: Verify build**

Run: `npm run build`
Expected: No errors.

- [ ] **Step 3: Run full test suite**

Run: `npm run test:run`
Expected: All tests pass.

- [ ] **Step 4: Commit**

```bash
git add src/stores/eventStoryStore.ts
git commit -m "feat: expose classificationResult from eventStoryStore for sidebar"
```

---

## Chunk 4: Final Integration Test and Build

### Task 14: Full Build Verification

- [ ] **Step 1: Run full test suite**

Run: `npm run test:run`
Expected: All tests pass, including new classificationStore tests.

- [ ] **Step 2: Run full build**

Run: `npm run build`
Expected: Clean build with no TypeScript errors.

- [ ] **Step 3: Manual smoke test (dev server)**

Run: `npm run dev`

Verify in the browser:
1. Navigate to "New Event" → should show the first tree question ("Is the user actively doing something?")
2. Select an option → question advances, sidebar narrative updates
3. For Notification path: complete both trees → result card appears with severity and channels
4. For non-Notification path (e.g., Error & Warnings): result card appears with just the info type
5. Sidebar shows ClassificationProgress during questions, ClassificationTile updates when complete
6. ModelSelector, product context toggle, and ReasoningTile are hidden during classification

- [ ] **Step 4: Final commit**

```bash
git add -A
git commit -m "feat: Phase 1 classification flow — complete integration"
```
