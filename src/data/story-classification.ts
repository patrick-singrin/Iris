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
// Phase 1 Classification — from metadata (Decision #22–#27)
// ---------------------------------------------------------------------------

import type { Phase1Metadata } from './classification-questions'

export type Severity = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW'

export interface Phase1ClassificationResult {
  informationType: string
  severity: Severity | null
  channels: string[]
  trigger: string
}

/** Channel mapping by severity tier (architecture-evolution.md §3) */
const SEVERITY_CHANNELS: Record<Severity, string[]> = {
  CRITICAL: ['Banner', 'Dashboard', 'E-Mail', 'Status Page'],
  HIGH: ['Banner', 'Dashboard', 'E-Mail'],
  MEDIUM: ['Dashboard', 'E-Mail'],
  LOW: ['Dashboard'],
}

/**
 * Derive severity from Phase 1 metadata (Decision #24).
 *
 * - Security or compliance → CRITICAL
 * - Entire platform down → CRITICAL
 * - Core value + any breakage → HIGH
 * - Capability + any breakage → MEDIUM
 * - Nothing broken (scope = none) → LOW
 */
function deriveSeverityFromMetadata(m: Phase1Metadata): Severity {
  if (m.security) return 'CRITICAL'
  if (m.platform_down) return 'CRITICAL'
  if (m.category === 'core_value' && m.scope !== 'none') return 'HIGH'
  if (m.category === 'capability' && m.scope !== 'none') return 'MEDIUM'
  return 'LOW'
}

/**
 * Derive channels from severity + scope (architecture-audit.md §2 scope qualifier).
 *
 * HIGH + scope = one → drop Banner (single-service, single-user issue
 * doesn't warrant the most intrusive channel).
 */
function deriveChannels(severity: Severity, m: Phase1Metadata): string[] {
  const channels = [...SEVERITY_CHANNELS[severity]]
  if (severity === 'HIGH' && m.scope === 'one') {
    return channels.filter(c => c !== 'Banner')
  }
  return channels
}

/**
 * Classify Management events into one of the 6 information types.
 * Mirrors the old decision-tree_information-type.json Management branch logic.
 */
function classifyManagement(m: Phase1Metadata): Phase1ClassificationResult {
  if (m.mgmt_form_field) {
    return {
      informationType: 'Validation Messages',
      severity: null,
      channels: ['Inline'],
      trigger: 'Form field validation',
    }
  }

  if (m.mgmt_trigger === 'user') {
    if (m.mgmt_success === false) {
      return {
        informationType: 'Error & Warnings',
        severity: null,
        channels: ['Inline', 'Toast'],
        trigger: 'User action failed',
      }
    }
    // success = true
    if (m.mgmt_persistence) {
      return {
        informationType: 'Transactional Confirmation',
        severity: null,
        channels: ['Toast', 'Dashboard'],
        trigger: 'User action completed — record needed',
      }
    }
    return {
      informationType: 'Feedback',
      severity: null,
      channels: ['Toast'],
      trigger: 'User action completed',
    }
  }

  if (m.mgmt_trigger === 'system') {
    if (m.mgmt_ongoing) {
      return {
        informationType: 'Status Display',
        severity: null,
        channels: ['Dashboard'],
        trigger: 'Ongoing system status',
      }
    }
    return {
      informationType: 'Notification',
      severity: 'LOW',
      channels: ['Dashboard'],
      trigger: 'System event in management interface',
    }
  }

  // Fallback — should not normally be reached
  return {
    informationType: 'Notification',
    severity: 'LOW',
    channels: ['Dashboard'],
    trigger: 'Management event',
  }
}

/**
 * Pure deterministic classification from Phase 1 metadata.
 * No LLM, no store access — just rules (Decision #22, #25).
 *
 * - Management → type classification (6 information types)
 * - Core value / Capability → Notification with severity
 */
export function classifyFromMetadata(m: Phase1Metadata): Phase1ClassificationResult {
  if (m.category === 'management') {
    return classifyManagement(m)
  }

  // Core value or Capability → always Notification type
  const severity = deriveSeverityFromMetadata(m)
  const channels = deriveChannels(severity, m)

  const scopeLabel = m.scope === 'all' ? 'all services'
    : m.scope === 'some' ? 'some services'
    : m.scope === 'one' ? 'a single service'
    : 'informational'

  const categoryLabel = m.category === 'core_value' ? 'Core product' : 'Platform feature'

  return {
    informationType: 'Notification',
    severity,
    channels,
    trigger: `${categoryLabel} — ${scopeLabel}`,
  }
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
