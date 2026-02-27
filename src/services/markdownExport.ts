import type { IrisEvent, TypeContext } from '@/types/event'
import { hasEscalationSteps } from '@/types/event'

function formatImpactAssessment(event: IrisEvent): string {
  const d = event.description
  const lines: string[] = []

  const affected = d.whoAffected.length > 0 ? d.whoAffected.join(', ') : 'N/A'
  const custom = d.whoAffectedCustom ? ` (${d.whoAffectedCustom})` : ''
  lines.push(`**Who is affected:** ${affected}${custom}`)
  lines.push('')

  const impactMap: Record<string, string> = {
    blocked: 'Blocked — users cannot complete tasks',
    degraded: 'Degraded — reduced service quality',
    no_impact: 'No direct impact',
  }
  lines.push(`**User impact:** ${impactMap[d.userImpact] || 'N/A'}`)
  lines.push('')

  if (d.userImpact && d.userImpact !== 'no_impact') {
    const scopeMap: Record<string, string> = {
      widespread: 'Widespread (significant portion of users)',
      limited: 'Limited (specific users or teams)',
    }
    lines.push(`**Scope:** ${scopeMap[d.userScope] || 'N/A'}`)
    lines.push('')

    const workaroundMap: Record<string, string> = {
      yes_documented: 'Yes, documented',
      yes_complex: 'Yes, but complex',
      no: 'No workaround available',
    }
    lines.push(`**Workaround:** ${workaroundMap[d.workaroundAvailable] || 'N/A'}`)
    lines.push('')
  }

  const actionMap: Record<string, string> = {
    mandatory: 'Yes, mandatory',
    recommended: 'Yes, recommended',
    no: 'No action required',
  }
  const actionLabel = actionMap[d.actionRequired] || 'N/A'
  const actionDetail = d.actionDescription && d.actionRequired !== 'no' ? ` — ${d.actionDescription}` : ''
  lines.push(`**Action required:** ${actionLabel}${actionDetail}`)
  lines.push('')

  const timingLabel = d.timing === 'now' ? 'Happening now' : d.timing === 'scheduled' ? 'Scheduled' : 'N/A'
  lines.push(`**Timing:** ${timingLabel}`)
  lines.push('')

  if (d.timing === 'scheduled' && d.leadTime) {
    const leadTimeMap: Record<string, string> = {
      less_than_24h: 'Less than 24 hours',
      '1_to_7_days': '1–7 days',
      more_than_7_days: 'More than 7 days',
    }
    lines.push(`**Lead time:** ${leadTimeMap[d.leadTime] || 'N/A'}`)
    lines.push('')
  }

  if (d.securityCompliance === true) {
    lines.push(`**Security/compliance issue:** Yes`)
  } else if (d.securityCompliance === false) {
    lines.push(`**Security/compliance issue:** No`)
  } else {
    lines.push(`**Security/compliance issue:** N/A`)
  }
  lines.push('')

  return lines.join('\n')
}

function formatTypeContext(ctx: TypeContext): string {
  const lines: string[] = []

  const errorTypeLabels: Record<string, string> = {
    system_error: 'System/server error',
    permission_error: 'Permission/access error',
    resource_error: 'Resource unavailable or exceeded',
    network_error: 'Network/connection error',
    input_error: 'Invalid user input',
  }

  const validationTypeLabels: Record<string, string> = {
    format: 'Format validation',
    required: 'Required field',
    range: 'Value range',
    dependency: 'Field dependency',
    uniqueness: 'Uniqueness check',
  }

  const toneLabels: Record<string, string> = {
    neutral: 'Neutral, factual',
    apologetic: 'Apologetic',
    urgent: 'Urgent',
  }

  switch (ctx.kind) {
    case 'error_warning':
      if (ctx.errorType) lines.push(`**Error type:** ${errorTypeLabels[ctx.errorType] || ctx.errorType}`)
      if (ctx.userAction) lines.push(`**User was trying to:** ${ctx.userAction}`)
      lines.push(`**What went wrong:** ${ctx.whatWentWrong || 'N/A'}`)
      lines.push(`**Recovery action:** ${ctx.recoveryAction || 'N/A'}`)
      if (ctx.tone) lines.push(`**Tone:** ${toneLabels[ctx.tone] || ctx.tone}`)
      break
    case 'validation':
      lines.push(`**Field name:** ${ctx.fieldName || 'N/A'}`)
      if (ctx.validationType) lines.push(`**Validation type:** ${validationTypeLabels[ctx.validationType] || ctx.validationType}`)
      lines.push(`**Constraint:** ${ctx.constraint || 'N/A'}`)
      if (ctx.exampleValid) lines.push(`**Valid example:** ${ctx.exampleValid}`)
      break
    case 'transactional_confirmation':
      lines.push(`**Action completed:** ${ctx.actionCompleted || 'N/A'}`)
      if (ctx.keyDetails) lines.push(`**Key details:** ${ctx.keyDetails}`)
      if (ctx.nextStep) lines.push(`**Next step:** ${ctx.nextStep}`)
      lines.push(`**Secondary CTA:** ${ctx.hasSecondaryAction ? 'Yes' : 'No'}`)
      break
    case 'feedback':
      lines.push(`**User action:** ${ctx.actionCompleted || 'N/A'}`)
      lines.push(`**Undo action:** ${ctx.hasUndo ? 'Yes' : 'No'}`)
      break
    case 'status_display':
      lines.push(`**System component:** ${ctx.systemComponent || 'N/A'}`)
      if (ctx.possibleStates) lines.push(`**Possible states:** ${ctx.possibleStates}`)
      lines.push(`**Tooltip:** ${ctx.hasTooltip ? 'Yes' : 'No'}`)
      break
  }

  lines.push('')
  return lines.join('\n')
}

function formatEventDescription(event: IrisEvent): string {
  const d = event.description
  const lines: string[] = []

  lines.push(d.whatHappened || 'N/A')
  lines.push('')

  if (d.additionalNotes) {
    lines.push(`**Additional notes:** ${d.additionalNotes}`)
    lines.push('')
  }

  return lines.join('\n')
}

function formatClassification(event: IrisEvent): string {
  const c = event.classification
  const lines: string[] = []

  lines.push(`| Field | Value |`)
  lines.push(`|---|---|`)
  lines.push(`| Type | ${c.type} |`)
  if (c.severity) lines.push(`| Severity | ${c.severity} |`)
  lines.push(`| Channels | ${c.channels.join(', ')} |`)
  if (c.trigger) lines.push(`| Trigger | ${c.trigger} |`)
  if (hasEscalationSteps(c.escalation)) {
    lines.push(`| Escalation | ${c.escalation.length} steps |`)
  } else if (c.escalation === true) {
    lines.push(`| Escalation | Yes |`)
  }
  lines.push('')

  if (hasEscalationSteps(c.escalation)) {
    lines.push(`### Escalation Timeline`)
    lines.push('')
    lines.push(`| Step | Timing | Tone |`)
    lines.push(`|---|---|---|`)
    for (const step of c.escalation) {
      lines.push(`| ${step.label} | ${step.relativeTime} | ${step.tone || '—'} |`)
    }
    lines.push('')
  }

  if (c.severityExplanation) {
    lines.push(`**Severity explanation:** ${c.severityExplanation}`)
    lines.push('')
  }

  if (c.severityOverride) {
    lines.push(`**Severity override:** Changed from ${c.severityOverride.originalSeverity} to ${c.severityOverride.overriddenSeverity}`)
    lines.push(`**Override justification:** ${c.severityOverride.justification}`)
    lines.push('')
  }

  return lines.join('\n')
}

function formatDecisionPath(event: IrisEvent): string {
  const lines: string[] = []

  if (event.classification.typePath.length > 0) {
    lines.push(`### Classification Path`)
    lines.push('')
    for (const entry of event.classification.typePath) {
      lines.push(`- **${entry.questionText}** → ${entry.selectedLabel}`)
    }
    lines.push('')
  }

  return lines.join('\n')
}

function formatGeneratedText(event: IrisEvent): string {
  if (!event.generatedText) return ''

  const lines: string[] = []
  lines.push(`## Generated UI Text`)
  lines.push('')

  for (const [componentId, fields] of Object.entries(event.generatedText)) {
    lines.push(`### ${componentId}`)
    lines.push('')
    lines.push(`| Field | English | German |`)
    lines.push(`|---|---|---|`)

    for (const [fieldId, text] of Object.entries(fields)) {
      const en = text.en.replace(/\|/g, '\\|')
      const de = text.de.replace(/\|/g, '\\|')
      lines.push(`| ${fieldId} | ${en} | ${de} |`)
    }
    lines.push('')
  }

  return lines.join('\n')
}

export function eventToMarkdown(event: IrisEvent): string {
  const sections: string[] = []
  const isNotification = event.classification.type === 'Notification'

  sections.push(`# ${event.id} — Event Documentation`)
  sections.push('')
  sections.push(`**Created:** ${new Date(event.createdAt).toLocaleString()}`)
  sections.push(`**Status:** ${event.status}`)
  sections.push('')
  sections.push('---')
  sections.push('')

  sections.push(`## Classification`)
  sections.push('')
  sections.push(formatClassification(event))

  if (isNotification) {
    sections.push(`## Impact Assessment`)
    sections.push('')
    sections.push(formatImpactAssessment(event))
  } else if (event.typeContext) {
    const titleMap: Record<string, string> = {
      error_warning: 'Error & Warning Context',
      validation: 'Validation Context',
      transactional_confirmation: 'Confirmation Context',
      feedback: 'Feedback Context',
      status_display: 'Status Display Context',
    }
    sections.push(`## ${titleMap[event.typeContext.kind] || 'Type Context'}`)
    sections.push('')
    sections.push(formatTypeContext(event.typeContext))
  }

  sections.push(`## Event Description`)
  sections.push('')
  sections.push(formatEventDescription(event))

  sections.push(`## Decision Path`)
  sections.push('')
  sections.push(formatDecisionPath(event))

  const textSection = formatGeneratedText(event)
  if (textSection) {
    sections.push(textSection)
  }

  return sections.join('\n')
}

export function downloadMarkdown(event: IrisEvent): void {
  const md = eventToMarkdown(event)
  const blob = new Blob([md], { type: 'text/markdown' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${event.id}.md`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}
