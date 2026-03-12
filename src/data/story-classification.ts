/**
 * Classification derivation, story composition, and channel quality assessment
 * for the Event Story Builder.
 *
 * All events follow a single classification path:
 *   Event → Notification → Severity Matrix → Channel Recommendation
 *
 * The "Moment of Occurrence" principle applies: severity is always computed
 * at the moment the event executes. Lead time (scheduled vs. now) only
 * affects escalation suggestions, not severity.
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
  event_trigger: ['user_interaction', 'system_runtime', 'scheduled_system', 'scheduled_user'],
  user_impact: ['blocked', 'degraded', 'no_impact'],
  impact_scope: ['widespread', 'limited', 'individual'],
  timing: ['now', 'scheduled'],
  action_required: ['mandatory', 'no'],
  security: ['yes', 'no'],
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

/**
 * Derive classification from the checklist state.
 *
 * Single path: ALL events → Notification → computeSeverity().
 * Returns null if the trigger hasn't been filled yet.
 */
export function deriveClassification(checklist: StoryChecklistItem[]): StoryClassification | null {
  const trigger = getItem(checklist, 'event_trigger')
  if (!trigger.filled) return null

  const impact = getItem(checklist, 'user_impact')
  const scope = getItem(checklist, 'impact_scope')
  const action = getItem(checklist, 'action_required')
  const security = getItem(checklist, 'security')

  // Build ImpactFactors for severity matrix.
  // "Moment of occurrence" principle: always classify severity at the moment
  // the event executes, not based on advance notice. Lead time is used only
  // for escalation suggestions, not for reducing severity.
  const factors: ImpactFactors = {
    userImpact: (impact.filled ? impact.value as ImpactFactors['userImpact'] : '') || '',
    userScope: (scope.filled ? scope.value as ImpactFactors['userScope'] : '') || '',
    timing: 'now',
    leadTime: '',
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

function calculateConfidence(checklist: StoryChecklistItem[]): number {
  const relevant = ['what_happened', 'event_trigger', 'who_affected', 'user_impact', 'action_required', 'security']
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

  const TRIGGER_LABELS: Record<string, string> = {
    user_interaction: t('sq.compose.eventTrigger.user_interaction'),
    system_runtime: t('sq.compose.eventTrigger.system_runtime'),
    scheduled_system: t('sq.compose.eventTrigger.scheduled_system'),
    scheduled_user: t('sq.compose.eventTrigger.scheduled_user'),
  }

  const trigger = getItem(checklist, 'event_trigger')
  if (trigger.filled && trigger.value) {
    whatParts.push(TRIGGER_LABELS[trigger.value as string] || (trigger.value as string))
  }

  const what = getItem(checklist, 'what_happened')
  if (what.filled && what.value) whatParts.push(what.value as string)

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
    // Use evidence for human-readable display (e.g., "A group of users: API team")
    const whoStr = who.evidence || (Array.isArray(who.value) ? (who.value as string[]).join(', ') : who.value as string)
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
  if (whatToDo.filled && whatToDo.value) {
    if (whatToDo.value === 'no_action') {
      sections.push(`${t('sq.compose.section.whatToDo')}\n${t('story.noActionRequired')}`)
    } else if (action.filled && action.value !== 'no') {
      sections.push(`${t('sq.compose.section.whatToDo')}\n${t('sq.compose.usersNeedTo')} ${whatToDo.value}`)
    }
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
    if (channel.includes('Mail')) {
      const has = ['what_happened', 'who_affected', 'user_impact', 'what_to_do'].every(id => getItem(checklist, id).filled)
      return has
        ? { channel, status: 'good' as const, message: t('sq.quality.emailReady') }
        : { channel, status: 'needs-work' as const, message: t('sq.quality.emailNeeds') }
    }
    if (channel.includes('Dashboard')) {
      const has = ['what_happened', 'event_trigger'].every(id => getItem(checklist, id).filled)
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
