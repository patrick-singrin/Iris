import type { EventDescription, Classification, TypeContext, EscalationStep } from '@/types/event'
import { isEscalationEnabled } from '@/types/event'
import type { ComponentTemplate } from '@/types/contentTemplate'
import designPrinciples from '@/data/content-design-principles.md?raw'

export function buildSystemPrompt(productContext?: string | null): string {
  let prompt = `You are a professional UX writer for the AIFS Serving platform. Your task is to generate bilingual (English and German) UI text for platform events.

IMPORTANT RULES:
- German text is NEVER a translation of the English text. Write it independently, following the same rules.
- Use formal address (Sie) in German.
- All text must follow the content design principles below.
- CHARACTER LIMITS ARE HARD LIMITS — NEVER exceed them, not even by 1 character. German text tends to be longer than English; compensate by using shorter phrasing in German. Count characters carefully for each field.
- Return your response as a single JSON object (no markdown fences, no explanation).

OUTPUT FORMAT:
Return a JSON object with this exact structure:
{
  "componentId": {
    "fieldId": {
      "en": "English text",
      "de": "German text"
    }
  }
}

Use the component and field IDs exactly as specified in the user prompt.

CONTENT DESIGN PRINCIPLES:
${designPrinciples}`

  if (productContext) {
    prompt += `\n\n## Product Context\nThe following product-specific context should inform your text generation. Use it to match the product's voice, terminology, and domain conventions.\n\n${productContext}`
  }
  return prompt
}

/** Build type-specific context section for non-notification prompts */
function buildTypeContextSection(ctx: TypeContext): string {
  const sections: string[] = ['## Type-Specific Context']

  switch (ctx.kind) {
    case 'error_warning': {
      const errorTypeLabels: Record<string, string> = {
        system_error: 'System/server error',
        permission_error: 'Permission/access error',
        resource_error: 'Resource unavailable or exceeded',
        network_error: 'Network/connection error',
        input_error: 'Invalid user input',
      }
      if (ctx.errorType) sections.push(`Error type: ${errorTypeLabels[ctx.errorType] || ctx.errorType}`)
      if (ctx.userAction) sections.push(`User was trying to: ${ctx.userAction}`)
      sections.push(`What went wrong: ${ctx.whatWentWrong}`)
      sections.push(`Recovery action: ${ctx.recoveryAction}`)
      const toneLabels: Record<string, string> = { neutral: 'Neutral, factual', apologetic: 'Apologetic', urgent: 'Urgent' }
      if (ctx.tone) sections.push(`Desired tone: ${toneLabels[ctx.tone] || ctx.tone}`)
      break
    }
    case 'validation': {
      sections.push(`Field name: ${ctx.fieldName}`)
      const validationTypeLabels: Record<string, string> = {
        format: 'Format validation',
        required: 'Required field',
        range: 'Value range',
        dependency: 'Field dependency',
        uniqueness: 'Uniqueness check',
      }
      if (ctx.validationType) sections.push(`Validation type: ${validationTypeLabels[ctx.validationType] || ctx.validationType}`)
      sections.push(`Constraint: ${ctx.constraint}`)
      if (ctx.exampleValid) sections.push(`Example of valid input: ${ctx.exampleValid}`)
      break
    }
    case 'transactional_confirmation': {
      sections.push(`Completed action: ${ctx.actionCompleted}`)
      if (ctx.keyDetails) sections.push(`Key details to show: ${ctx.keyDetails}`)
      if (ctx.nextStep) sections.push(`Suggested next step: ${ctx.nextStep}`)
      sections.push(`Include secondary CTA: ${ctx.hasSecondaryAction ? 'Yes' : 'No'}`)
      break
    }
    case 'feedback': {
      sections.push(`User action: ${ctx.actionCompleted}`)
      sections.push(`Include undo: ${ctx.hasUndo ? 'Yes' : 'No'}`)
      break
    }
    case 'status_display': {
      sections.push(`System component: ${ctx.systemComponent}`)
      if (ctx.possibleStates) sections.push(`Possible states: ${ctx.possibleStates}`)
      sections.push(`Include tooltip: ${ctx.hasTooltip ? 'Yes' : 'No'}`)
      break
    }
  }

  return sections.join('\n')
}

/** Build notification-specific impact context section */
function buildNotificationContextSection(description: EventDescription): string {
  const sections: string[] = ['## Event Context']

  sections.push(`What happened: ${description.whatHappened}`)
  sections.push(`Who is affected: ${description.whoAffected.join(', ')}${description.whoAffectedCustom ? ' (' + description.whoAffectedCustom + ')' : ''}`)

  const impactMap: Record<string, string> = {
    blocked: 'Users are blocked',
    degraded: 'Service is degraded',
    no_impact: 'No impact on current work',
  }
  sections.push(`User impact: ${impactMap[description.userImpact] || 'Unknown'}`)

  if (description.userScope) {
    sections.push(`User scope: ${description.userScope === 'widespread' ? 'Widespread impact' : 'Limited impact'}`)
  }

  if (description.workaroundAvailable) {
    const workaroundMap: Record<string, string> = {
      yes_documented: 'Yes, documented',
      yes_complex: 'Yes, but complex',
      no: 'No workaround',
    }
    sections.push(`Workaround: ${workaroundMap[description.workaroundAvailable] || 'Unknown'}`)
  }

  const actionMap: Record<string, string> = {
    mandatory: 'Yes, mandatory',
    recommended: 'Yes, recommended',
    no: 'No',
  }
  sections.push(`Action required: ${actionMap[description.actionRequired] || 'N/A'}`)
  if (description.actionDescription && description.actionRequired !== 'no') {
    sections.push(`Action details: ${description.actionDescription}`)
  }

  const timingLabel = description.timing === 'now' ? 'Happening now' : description.timing === 'scheduled' ? 'Scheduled' : 'N/A'
  sections.push(`Timing: ${timingLabel}`)
  if (description.timing === 'scheduled' && description.leadTime) {
    const leadMap: Record<string, string> = { less_than_24h: '< 24h', '1_to_7_days': '1–7 days', more_than_7_days: '> 7 days' }
    sections.push(`Lead time: ${leadMap[description.leadTime] || description.leadTime}`)
  }
  sections.push(`Security/compliance issue: ${description.securityCompliance ? 'Yes' : 'No'}`)

  if (description.additionalNotes) {
    sections.push(`Additional notes: ${description.additionalNotes}`)
  }

  return sections.join('\n')
}

export function buildUserPrompt(
  description: EventDescription,
  classification: Classification,
  components: ComponentTemplate[],
  escalationSteps?: EscalationStep[],
  typeContext?: TypeContext | null,
): string {
  const sections: string[] = []

  // Context section — differs by type
  if (typeContext) {
    // Non-notification: use type-specific context
    sections.push(buildTypeContextSection(typeContext))
    sections.push('')
    sections.push('## Event Description')
    sections.push(description.whatHappened || 'N/A')
    if (description.additionalNotes) {
      sections.push(`Additional notes: ${description.additionalNotes}`)
    }
  } else {
    // Notification: use impact assessment context
    sections.push(buildNotificationContextSection(description))
  }

  sections.push('')
  sections.push('## Classification')
  sections.push(`Type: ${classification.type}`)
  sections.push(`Severity: ${classification.severity || 'N/A'}`)
  sections.push(`Channels: ${classification.channels.join(', ')}`)
  if (classification.trigger) sections.push(`Trigger: ${classification.trigger}`)
  if (isEscalationEnabled(classification.escalation)) sections.push(`Escalation: Yes (${escalationSteps?.length || 0} steps)`)

  sections.push('')
  sections.push('## Fields to Generate')
  sections.push('Generate text for each field below. Respect the character limits.')
  sections.push('')

  function appendComponentFields(component: ComponentTemplate, idPrefix?: string) {
    const componentId = idPrefix
      ? `${idPrefix}_${component.name.toLowerCase().replace(/\s+/g, '_')}`
      : component.name.toLowerCase().replace(/\s+/g, '_')
    sections.push(`### Component: ${component.name} (ID: ${componentId})`)

    for (const field of component.fields) {
      const fieldId = idPrefix ? `${idPrefix}_${field.id}` : field.id
      const parts: string[] = [`- **${field.label}** (ID: ${fieldId})`]
      if (field.maxChars) parts.push(`max ${field.maxChars} chars`)
      if (field.minChars) parts.push(`min ${field.minChars} chars`)
      parts.push(field.required ? 'REQUIRED' : 'optional')
      if (field.description) parts.push(`— ${field.description}`)

      if (field.type === 'select' && field.options) {
        const severity = classification.severity || ''
        let selectedOption = field.options[0]
        if (field.id === 'banner_dismiss') {
          selectedOption = severity === 'CRITICAL' ? 'Must acknowledge' : 'Dismissible'
        } else if (field.id === 'email_importance') {
          selectedOption = (severity === 'CRITICAL' || severity === 'HIGH') ? 'High' : 'Normal'
        }
        parts.push(`[SELECT: ${selectedOption}]`)
      }

      sections.push(parts.join(' | '))
    }
    sections.push('')
  }

  if (escalationSteps && escalationSteps.length > 0) {
    sections.push('This is a SCHEDULED event with ESCALATION.')
    sections.push(`There are ${escalationSteps.length} communication steps.`)
    sections.push('Generate separate text for each step.')
    sections.push('Use step-prefixed IDs: {stepId}_{componentId} and {stepId}_{fieldId}.')
    sections.push('')

    for (const step of escalationSteps) {
      sections.push(`## Step: ${step.label} (ID: ${step.id})`)
      sections.push(`Timing: ${step.relativeTime}`)
      if (step.tone) sections.push(`Tone: ${step.tone}`)
      sections.push('')
      for (const component of components) {
        appendComponentFields(component, step.id)
      }
    }
  } else {
    for (const component of components) {
      appendComponentFields(component)
    }
  }

  return sections.join('\n')
}
