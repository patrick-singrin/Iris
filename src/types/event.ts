import type { PathEntry } from './decisionTree'

export interface EventDescription {
  // Impact assessment fields (collected in Step 2 for notifications)
  whoAffected: string[]
  whoAffectedCustom: string
  userImpact: 'blocked' | 'degraded' | 'no_impact' | ''
  userScope: 'widespread' | 'limited' | ''
  workaroundAvailable: 'yes_documented' | 'yes_complex' | 'no' | ''
  actionRequired: 'mandatory' | 'recommended' | 'no' | ''
  actionDescription: string
  timing: 'now' | 'scheduled' | ''
  leadTime: 'less_than_24h' | '1_to_7_days' | 'more_than_7_days' | ''
  securityCompliance: boolean | null

  // Event description fields (collected in Description step)
  whatHappened: string
  additionalNotes: string
}

// ── Type-specific context for non-notification types ──

export interface ErrorWarningContext {
  kind: 'error_warning'
  errorType: 'system_error' | 'permission_error' | 'resource_error' | 'network_error' | 'input_error' | ''
  userAction: string
  whatWentWrong: string
  recoveryAction: string
  tone: 'neutral' | 'apologetic' | 'urgent' | ''
}

export interface ValidationContext {
  kind: 'validation'
  fieldName: string
  validationType: 'format' | 'required' | 'range' | 'dependency' | 'uniqueness' | ''
  constraint: string
  exampleValid: string
}

export interface TransactionalConfirmationContext {
  kind: 'transactional_confirmation'
  actionCompleted: string
  keyDetails: string
  nextStep: string
  hasSecondaryAction: boolean
}

export interface FeedbackContext {
  kind: 'feedback'
  actionCompleted: string
  hasUndo: boolean
}

export interface StatusDisplayContext {
  kind: 'status_display'
  systemComponent: string
  possibleStates: string
  hasTooltip: boolean
}

export type TypeContext =
  | ErrorWarningContext
  | ValidationContext
  | TransactionalConfirmationContext
  | FeedbackContext
  | StatusDisplayContext

// ── Escalation steps for configurable notification timelines ──

export interface EscalationStep {
  id: string          // e.g. "step_1", "step_2"
  label: string       // e.g. "Announcement", "Reminder"
  relativeTime: string // e.g. "7 days before", "1 day before", "When it starts"
  relativeDays: number // Sort key: 7 = 7 days before, 1 = 1 day before, 0 = event time, -1 = after
  tone: string        // Tone guidance for LLM
}

/** Type guard: checks if escalation contains user-configured steps */
export function hasEscalationSteps(escalation: boolean | EscalationStep[]): escalation is EscalationStep[] {
  return Array.isArray(escalation)
}

/** Returns true if escalation is active (either legacy boolean or steps array) */
export function isEscalationEnabled(escalation: boolean | EscalationStep[]): boolean {
  return escalation === true || (Array.isArray(escalation) && escalation.length > 0)
}

export interface SeverityOverride {
  originalSeverity: string
  overriddenSeverity: string
  justification: string
}

export interface Classification {
  type: string
  severity: string | null
  severityExplanation: string | null
  channels: string[]
  purpose: string
  trigger: string | null
  escalation: boolean | EscalationStep[]
  typePath: PathEntry[]
  severityOverride: SeverityOverride | null
}

export interface GeneratedTextField {
  en: string
  de: string
}

export type GeneratedText = Record<string, Record<string, GeneratedTextField>>

export interface IrisEvent {
  id: string
  createdAt: string
  status: 'documented'
  description: EventDescription
  classification: Classification
  typeContext: TypeContext | null
  generatedText: GeneratedText | null
}

export function createEmptyDescription(): EventDescription {
  return {
    whoAffected: [],
    whoAffectedCustom: '',
    userImpact: '',
    userScope: '',
    workaroundAvailable: '',
    actionRequired: '',
    actionDescription: '',
    timing: '',
    leadTime: '',
    securityCompliance: null,
    whatHappened: '',
    additionalNotes: '',
  }
}

export function createTypeContext(kind: TypeContext['kind']): TypeContext {
  switch (kind) {
    case 'error_warning':
      return { kind, errorType: '', userAction: '', whatWentWrong: '', recoveryAction: '', tone: '' }
    case 'validation':
      return { kind, fieldName: '', validationType: '', constraint: '', exampleValid: '' }
    case 'transactional_confirmation':
      return { kind, actionCompleted: '', keyDetails: '', nextStep: '', hasSecondaryAction: false }
    case 'feedback':
      return { kind, actionCompleted: '', hasUndo: false }
    case 'status_display':
      return { kind, systemComponent: '', possibleStates: '', hasTooltip: false }
  }
}

/** Maps a classification name from the decision tree to a TypeContext kind */
export function mapClassificationToContextKind(classification: string): TypeContext['kind'] {
  const map: Record<string, TypeContext['kind']> = {
    'Error & Warnings': 'error_warning',
    'Validation Messages': 'validation',
    'Transactional Confirmation': 'transactional_confirmation',
    'Feedback': 'feedback',
    'Status Display': 'status_display',
  }
  return map[classification] || 'error_warning'
}
