export interface FieldTemplate {
  id: string
  label: string
  maxChars?: number
  minChars?: number
  required: boolean
  description: string
  type?: 'select'
  options?: string[]
  /** Hint for input rendering: 'short' → text field, 'long' → textarea. Defaults based on maxChars. */
  inputSize?: 'short' | 'long'
}

export interface ComponentTemplate {
  name: string
  appliesTo: string[]
  fields: FieldTemplate[]
}

export interface EscalationPhase {
  id: string
  name: string
  description: string
  tone: string
}

export interface TypeTemplate {
  name: string
  description: string
  severityDependent: boolean
  components: Record<string, ComponentTemplate>
  escalationPhases?: EscalationPhase[]
}

export interface ContentTemplates {
  id: string
  name: string
  description: string
  version: string
  types: Record<string, TypeTemplate>
}
