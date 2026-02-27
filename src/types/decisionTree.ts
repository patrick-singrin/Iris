export interface QuestionNode {
  type: 'question'
  id?: string
  text: string
  description?: string
  options: QuestionOption[]
}

export interface QuestionOption {
  label: string
  description?: string
  next: string
}

export interface ResultNode {
  type: 'result'
  // Tree 1 fields
  classification?: string
  purpose?: string
  examples?: string[]
  continueWith?: {
    treeId: string
    treeFile: string
    reason: string
  }
  // Tree 2 fields
  severity?: string | null
  channels?: string[]
  trigger?: string
  escalation?: boolean
}

export type TreeNode = QuestionNode | ResultNode

export interface DecisionTree {
  id: string
  name: string
  description: string
  version: string
  entryNode: string
  nodes: Record<string, TreeNode>
}

export interface PathEntry {
  nodeId: string
  questionText: string
  selectedLabel: string
}

export function isQuestionNode(node: TreeNode): node is QuestionNode {
  return node.type === 'question'
}

export function isResultNode(node: TreeNode): node is ResultNode {
  return node.type === 'result'
}
