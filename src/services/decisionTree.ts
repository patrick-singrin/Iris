import type { DecisionTree, TreeNode, QuestionNode, ResultNode } from '@/types/decisionTree'
import { isQuestionNode, isResultNode } from '@/types/decisionTree'
import infoTypeTree from '@/data/decision-tree_information-type.json'
import severityTree from '@/data/decision-tree_notification-severity.json'

const trees: Record<string, DecisionTree> = {
  'information-type': infoTypeTree as unknown as DecisionTree,
  'notification-severity': severityTree as unknown as DecisionTree,
}

export function loadTree(treeId: string): DecisionTree {
  const tree = trees[treeId]
  if (!tree) throw new Error(`Unknown tree: ${treeId}`)
  return tree
}

export function getNode(tree: DecisionTree, nodeId: string): TreeNode {
  const node = tree.nodes[nodeId]
  if (!node) throw new Error(`Node not found: ${nodeId} in tree ${tree.id}`)
  return node
}

export function getEntryNode(tree: DecisionTree): TreeNode {
  return getNode(tree, tree.entryNode)
}

export function getNextNodeId(node: QuestionNode, optionIndex: number): string {
  const option = node.options[optionIndex]
  if (!option) throw new Error(`Option index ${optionIndex} out of range`)
  return option.next
}

export function hasContinuation(node: ResultNode): boolean {
  return !!node.continueWith
}

export { isQuestionNode, isResultNode }
