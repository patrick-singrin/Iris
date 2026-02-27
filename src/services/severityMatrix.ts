/**
 * Severity Matrix — computes notification severity from impact assessment factors.
 *
 * Replaces the interactive Tree 2 (notification-severity) walk.
 * Produces the same 32 results as the original tree but without asking
 * any additional questions — all data comes from the Impact Assessment step.
 */

export interface ImpactFactors {
  userImpact: 'blocked' | 'degraded' | 'no_impact' | ''
  userScope: 'widespread' | 'limited' | ''
  timing: 'now' | 'scheduled' | ''
  leadTime: 'less_than_24h' | '1_to_7_days' | 'more_than_7_days' | ''
  securityCompliance: boolean | null
  actionRequired: 'mandatory' | 'recommended' | 'no' | ''
  // Note: workaroundAvailable is NOT a severity driver — it lives in EventDescription
  // and is used only for text generation context.
}

export interface SeverityResult {
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW'
  channels: string[]
  trigger: string
  /** Whether escalation is suggested (all scheduled events). User can override. */
  escalationSuggested: boolean
  explanation: string
}

const CHANNELS = {
  CRITICAL: ['Banner', 'Dashboard', 'Email'],
  HIGH: ['Banner', 'Dashboard', 'Email'],
  MEDIUM: ['Dashboard', 'Email'],
  LOW: ['Dashboard'],
}

/**
 * Resolves the effective timing: "now" for immediate events,
 * or the lead time bracket for scheduled events.
 */
function getTimingKey(factors: ImpactFactors): 'now' | 'less_than_24h' | '1_to_7_days' | 'more_than_7_days' {
  if (factors.timing === 'now' || factors.timing === '') {
    return 'now'
  }
  // Scheduled — use lead time (default to "now" if not set)
  return factors.leadTime || 'now'
}

function isCritical(factors: ImpactFactors, timingKey: string): boolean {
  const security = factors.securityCompliance === true
  const blocked = factors.userImpact === 'blocked'
  const degraded = factors.userImpact === 'degraded'
  const manyUsers = factors.userScope === 'widespread'

  // Security/compliance happening now or < 24h
  if (security && (timingKey === 'now' || timingKey === 'less_than_24h')) return true

  // Complete platform outage (blocked + many) now
  if (blocked && manyUsers && timingKey === 'now') return true

  // Blocked many + < 24h
  if (blocked && manyUsers && timingKey === 'less_than_24h') return true

  // Degraded many + < 24h
  if (degraded && manyUsers && timingKey === 'less_than_24h') return true

  return false
}

function isHigh(factors: ImpactFactors, timingKey: string): boolean {
  const security = factors.securityCompliance === true
  const blocked = factors.userImpact === 'blocked'
  const degraded = factors.userImpact === 'degraded'
  const manyUsers = factors.userScope === 'widespread'
  const fewUsers = factors.userScope === 'limited'

  // Blocked many + 1–7 days
  if (blocked && manyUsers && timingKey === '1_to_7_days') return true

  // Blocked few + now
  if (blocked && fewUsers && timingKey === 'now') return true

  // Degraded many + now
  if (degraded && manyUsers && timingKey === 'now') return true

  // Degraded few + now
  if (degraded && fewUsers && timingKey === 'now') return true

  // Blocked few + < 24h
  if (blocked && fewUsers && timingKey === 'less_than_24h') return true

  // Degraded few + < 24h
  if (degraded && fewUsers && timingKey === 'less_than_24h') return true

  // Security + 1–7 days
  if (security && timingKey === '1_to_7_days') return true

  // Degraded many + 1–7 days
  if (degraded && manyUsers && timingKey === '1_to_7_days') return true

  // Action mandatory + < 24h
  if (factors.actionRequired === 'mandatory' && timingKey === 'less_than_24h') return true

  return false
}

function isMedium(factors: ImpactFactors, timingKey: string): boolean {
  const security = factors.securityCompliance === true
  const blocked = factors.userImpact === 'blocked'
  const degraded = factors.userImpact === 'degraded'
  const noImpact = factors.userImpact === 'no_impact' || factors.userImpact === ''
  const manyUsers = factors.userScope === 'widespread'
  const fewUsers = factors.userScope === 'limited'

  // Blocked few + 1–7 days
  if (blocked && fewUsers && timingKey === '1_to_7_days') return true

  // Degraded few + 1–7 days
  if (degraded && fewUsers && timingKey === '1_to_7_days') return true

  // Blocked many + > 7 days
  if (blocked && manyUsers && timingKey === 'more_than_7_days') return true

  // Degraded many + > 7 days
  if (degraded && manyUsers && timingKey === 'more_than_7_days') return true

  // Security + > 7 days
  if (security && timingKey === 'more_than_7_days') return true

  // Action mandatory + now + no direct impact
  if (factors.actionRequired === 'mandatory' && timingKey === 'now' && noImpact) return true

  // Action mandatory + 1–7 days
  if (factors.actionRequired === 'mandatory' && timingKey === '1_to_7_days') return true

  // Blocked few + now (fallback for cases not caught by HIGH — shouldn't happen but safety net)
  // Degraded few + now (same)

  return false
}

function buildExplanation(factors: ImpactFactors, severity: string, timingKey: string): string {
  const parts: string[] = []

  // Impact
  if (factors.userImpact === 'blocked') {
    parts.push('users are blocked')
  } else if (factors.userImpact === 'degraded') {
    parts.push('users experience degraded service')
  } else {
    parts.push('no direct user impact')
  }

  // Scope
  if (factors.userScope === 'widespread') {
    parts.push('widespread user impact')
  } else if (factors.userScope === 'limited') {
    parts.push('limited user impact')
  }

  // Timing
  if (timingKey === 'now') {
    parts.push('happening now')
  } else if (timingKey === 'less_than_24h') {
    parts.push('less than 24 hours notice')
  } else if (timingKey === '1_to_7_days') {
    parts.push('1–7 days notice')
  } else if (timingKey === 'more_than_7_days') {
    parts.push('more than 7 days notice')
  }

  // Security
  if (factors.securityCompliance === true) {
    parts.push('security/compliance concern')
  }

  // Action
  if (factors.actionRequired === 'mandatory') {
    parts.push('mandatory user action required')
  } else if (factors.actionRequired === 'recommended') {
    parts.push('recommended user action')
  }

  return `${severity} because ${parts.join(', ')}.`
}

function buildTrigger(factors: ImpactFactors, timingKey: string): string {
  const parts: string[] = []

  if (factors.securityCompliance === true) {
    parts.push('Security/compliance')
  } else if (factors.userImpact === 'blocked' && factors.userScope === 'widespread') {
    parts.push('Blocking — widespread')
  } else if (factors.userImpact === 'blocked' && factors.userScope === 'limited') {
    parts.push('Blocking — limited')
  } else if (factors.userImpact === 'degraded' && factors.userScope === 'widespread') {
    parts.push('Degraded — widespread')
  } else if (factors.userImpact === 'degraded' && factors.userScope === 'limited') {
    parts.push('Degraded — limited')
  } else if (factors.actionRequired === 'mandatory' || factors.actionRequired === 'recommended') {
    parts.push('Non-blocking, action needed')
  } else {
    parts.push('Informational only')
  }

  if (timingKey === 'now') {
    parts.push('— NOW')
  } else if (timingKey === 'less_than_24h') {
    parts.push('— <24h notice')
  } else if (timingKey === '1_to_7_days') {
    parts.push('— 1–7 days notice')
  } else if (timingKey === 'more_than_7_days') {
    parts.push('— >7 days notice')
  }

  return parts.join(' ')
}

/**
 * Computes notification severity from collected impact assessment factors.
 * Uses a deterministic rules-based matrix that produces the same results
 * as walking the notification-severity decision tree interactively.
 */
export function computeSeverity(factors: ImpactFactors): SeverityResult {
  const timingKey = getTimingKey(factors)

  let severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW'

  if (isCritical(factors, timingKey)) {
    severity = 'CRITICAL'
  } else if (isHigh(factors, timingKey)) {
    severity = 'HIGH'
  } else if (isMedium(factors, timingKey)) {
    severity = 'MEDIUM'
  } else {
    severity = 'LOW'
  }

  // Escalation suggested for all scheduled events (user decides whether to enable)
  const escalationSuggested = factors.timing === 'scheduled'

  return {
    severity,
    channels: CHANNELS[severity],
    trigger: buildTrigger(factors, timingKey),
    escalationSuggested,
    explanation: buildExplanation(factors, severity, timingKey),
  }
}
