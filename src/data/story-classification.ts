/**
 * Classification derivation, story composition, and channel quality assessment
 * for the Event Story Builder.
 *
 * Extracted from story-questions.ts for maintainability.
 */

import { computeSeverity, type ImpactFactors } from '@/services/severityMatrix'
import { t } from '@/i18n'
import { getItem, type StoryChecklistItem } from './story-questions'

// ---------------------------------------------------------------------------
// Allowed values for classification-critical fields (single source of truth)
// ---------------------------------------------------------------------------

export const FIELD_ALLOWED_VALUES: Record<string, string[]> = {
  event_kind: ['system_change', 'error_issue', 'user_action', 'process_update'],
  user_impact: ['blocked', 'degraded', 'no_impact'],
  impact_scope: ['widespread', 'limited', 'individual'],
  timing: ['now', 'scheduled', 'resolved'],
  action_required: ['mandatory', 'recommended', 'no'],
  security: ['yes', 'no'],
  error_location: ['specific_field', 'whole_page', 'background', 'api'],
}

// ---------------------------------------------------------------------------
// Classification Derivation
// ---------------------------------------------------------------------------

export interface StoryClassification {
  type: string
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | null
  channels: string[]
  confidence: number
}

const KNOWN_EVENT_KINDS = ['system_change', 'error_issue', 'user_action', 'process_update']

export function deriveClassification(checklist: StoryChecklistItem[]): StoryClassification | null {
  const kind = getItem(checklist, 'event_kind')
  if (!kind.filled) return null

  const kindVal = kind.value as string
  const isKnown = KNOWN_EVENT_KINDS.includes(kindVal)

  // Error branch (only for exact enum match)
  if (kindVal === 'error_issue') {
    const loc = getItem(checklist, 'error_location')
    if (loc.filled && loc.value === 'specific_field') {
      return { type: t('sq.type.validationMessage'), severity: null, channels: [t('sq.ch.inlineFieldValidation')], confidence: 0.85 }
    }
    return { type: t('sq.type.errorWarning'), severity: null, channels: [t('sq.ch.inlineMessage')], confidence: 0.75 }
  }

  // User action branch (only for exact enum match)
  if (kindVal === 'user_action') {
    const fieldCtx = getItem(checklist, 'field_context')
    if (fieldCtx.filled && fieldCtx.value === 'form') {
      return { type: t('sq.type.validationMessage'), severity: null, channels: [t('sq.ch.inlineFieldValidation')], confidence: 0.8 }
    }
    return { type: t('sq.type.feedback'), severity: null, channels: [t('sq.ch.toastNotification')], confidence: 0.7 }
  }

  // System change / process update / freeform → Notification
  if (kindVal === 'system_change' || kindVal === 'process_update' || !isKnown) {
    const impact = getItem(checklist, 'user_impact')
    const scope = getItem(checklist, 'impact_scope')
    const timing = getItem(checklist, 'timing')
    const action = getItem(checklist, 'action_required')
    const security = getItem(checklist, 'security')

    // Build ImpactFactors for severity matrix
    const factors: ImpactFactors = {
      userImpact: (impact.filled ? impact.value as ImpactFactors['userImpact'] : '') || '',
      userScope: (scope.filled ? scope.value as ImpactFactors['userScope'] : '') || '',
      timing: (timing.filled ? timing.value as ImpactFactors['timing'] : '') || '',
      leadTime: timing.filled && timing.value === 'scheduled' ? '1_to_7_days' : '',
      securityCompliance: security.filled ? security.value === 'yes' : null,
      actionRequired: (action.filled ? action.value as ImpactFactors['actionRequired'] : '') || '',
    }

    const result = computeSeverity(factors)
    return {
      type: t('sq.type.notification'),
      severity: result.severity,
      channels: result.channels,
      confidence: calculateConfidence(checklist),
    }
  }

  return null
}

function calculateConfidence(checklist: StoryChecklistItem[]): number {
  const relevant = ['what_happened', 'event_kind', 'who_affected', 'user_impact', 'timing', 'action_required']
  const filled = relevant.filter(id => getItem(checklist, id).filled).length
  return Math.round((filled / relevant.length) * 100) / 100
}

// ---------------------------------------------------------------------------
// Story Composition
// ---------------------------------------------------------------------------

export function composeStory(checklist: StoryChecklistItem[]): string {
  const sections: string[] = []

  // --- WHAT section ---
  const whatParts: string[] = []

  const EVENT_KIND_LABELS: Record<string, string> = {
    system_change: t('sq.compose.eventKind.system_change'),
    error_issue: t('sq.compose.eventKind.error_issue'),
    user_action: t('sq.compose.eventKind.user_action'),
    process_update: t('sq.compose.eventKind.process_update'),
  }

  const kind = getItem(checklist, 'event_kind')
  if (kind.filled && kind.value) {
    whatParts.push(EVENT_KIND_LABELS[kind.value as string] || (kind.value as string))
  }

  const what = getItem(checklist, 'what_happened')
  if (what.filled && what.value) whatParts.push(what.value as string)

  const loc = getItem(checklist, 'error_location')
  if (loc.filled && loc.value) {
    whatParts.push(`${t('sq.compose.occursAt')} ${loc.value}.`)
  }

  const security = getItem(checklist, 'security')
  if (security.filled && security.value === 'yes') {
    whatParts.push(t('sq.compose.securityImplication'))
  }

  if (whatParts.length > 0) {
    sections.push(`${t('sq.compose.section.what')}\n${whatParts.join(' ')}`)
  }

  // --- WHO section ---
  const whoParts: string[] = []

  const who = getItem(checklist, 'who_affected')
  if (who.filled) {
    const whoStr = Array.isArray(who.value) ? who.value.join(', ') : who.value
    whoParts.push(`${t('sq.compose.affects')} ${whoStr}.`)
  }

  const IMPACT_LABELS: Record<string, string> = {
    blocked: t('sq.compose.impactBlocked'),
    degraded: t('sq.compose.impactDegraded'),
    no_impact: t('sq.compose.impactNone'),
  }

  const impact = getItem(checklist, 'user_impact')
  if (impact.filled && impact.value) {
    const label = IMPACT_LABELS[impact.value as string]
    if (label) whoParts.push(label)
  }

  if (whoParts.length > 0) {
    sections.push(`${t('sq.compose.section.who')}\n${whoParts.join(' ')}`)
  }

  // --- WHEN section ---
  const TIMING_LABELS: Record<string, string> = {
    now: t('sq.compose.timingNow'),
    scheduled: t('sq.compose.timingScheduled'),
    resolved: t('sq.compose.timingResolved'),
  }

  const timing = getItem(checklist, 'timing')
  if (timing.filled && timing.value) {
    const label = TIMING_LABELS[timing.value as string]
    if (label) {
      sections.push(`${t('sq.compose.section.when')}\n${label}`)
    }
  }

  // --- WHAT TO DO section ---
  const action = getItem(checklist, 'action_required')
  const whatToDo = getItem(checklist, 'what_to_do')
  if (action.filled && action.value !== 'no' && whatToDo.filled && whatToDo.value) {
    sections.push(`${t('sq.compose.section.whatToDo')}\n${t('sq.compose.usersNeedTo')} ${whatToDo.value}`)
  }

  return sections.join('\n\n')
}

// ---------------------------------------------------------------------------
// Channel Quality Assessment
// ---------------------------------------------------------------------------

export interface ChannelQuality {
  channel: string
  status: 'good' | 'needs-work' | 'incomplete'
  message: string
}

export function assessChannelQuality(
  checklist: StoryChecklistItem[],
  channels: string[],
): ChannelQuality[] {
  return channels.map(channel => {
    if (channel.includes('Banner')) {
      const has = ['what_happened', 'timing', 'action_required'].every(id => getItem(checklist, id).filled)
      return has
        ? { channel, status: 'good' as const, message: t('sq.quality.bannerReady') }
        : { channel, status: 'needs-work' as const, message: t('sq.quality.bannerNeeds') }
    }
    if (channel.includes('Email')) {
      const has = ['what_happened', 'who_affected', 'user_impact', 'what_to_do'].every(id => getItem(checklist, id).filled)
      return has
        ? { channel, status: 'good' as const, message: t('sq.quality.emailReady') }
        : { channel, status: 'needs-work' as const, message: t('sq.quality.emailNeeds') }
    }
    if (channel.includes('Dashboard')) {
      const has = ['what_happened', 'event_kind'].every(id => getItem(checklist, id).filled)
      return has
        ? { channel, status: 'good' as const, message: t('sq.quality.dashboardReady') }
        : { channel, status: 'incomplete' as const, message: t('sq.quality.dashboardNeeds') }
    }
    // Default (Inline, Toast, etc.)
    const has = getItem(checklist, 'what_happened').filled
    return has
      ? { channel, status: 'good' as const, message: t('sq.quality.defaultReady') }
      : { channel, status: 'incomplete' as const, message: t('sq.quality.defaultNeeds') }
  })
}
