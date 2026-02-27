import type { ContentTemplates, ComponentTemplate, EscalationPhase } from '@/types/contentTemplate'
import templatesData from '@/data/content-templates.json'

const templates = templatesData as unknown as ContentTemplates

export function getNotificationComponents(severity: string): ComponentTemplate[] {
  const notificationType = templates.types.notification
  if (!notificationType) return []

  return Object.values(notificationType.components).filter((component) =>
    component.appliesTo.includes(severity)
  )
}

export function getComponentsForType(typeKey: string): ComponentTemplate[] {
  const typeTemplate = templates.types[typeKey]
  if (!typeTemplate) return []
  return Object.values(typeTemplate.components)
}

export function getEscalationPhases(): EscalationPhase[] {
  const notificationType = templates.types.notification
  if (!notificationType || !notificationType.escalationPhases) return []
  return notificationType.escalationPhases
}

/** Map classification type names to template keys.
 *  Story-flow classification uses singular forms (e.g. "Error & Warning"),
 *  while the wizard flow used plural. Accept both for compatibility. */
const typeKeyMap: Record<string, string> = {
  'Notification': 'notification',
  'Error & Warning': 'error_warning',
  'Error & Warnings': 'error_warning',
  'Validation Message': 'validation',
  'Validation Messages': 'validation',
  'Transactional Confirmation': 'transactional_confirmation',
  'Feedback': 'feedback',
  'Status Display': 'status_display',
}

export function resolveTypeKey(typeName: string): string | null {
  return typeKeyMap[typeName] || null
}

export function getTemplates(): ContentTemplates {
  return templates
}
