import type { EscalationStep } from '@/types/event'

export interface TimingOption {
  id: string
  label: string
  relativeTime: string
  relativeDays: number
  tone: string
}

export const TIMING_OPTIONS: TimingOption[] = [
  {
    id: 'week_before',
    label: '1 week before',
    relativeTime: '1 week before',
    relativeDays: 7,
    tone: 'Informational, planning-focused. Prepare users for the upcoming change.',
  },
  {
    id: '3days_before',
    label: '3 days before',
    relativeTime: '3 days before',
    relativeDays: 3,
    tone: 'Informational with urgency. Remind users to prepare.',
  },
  {
    id: 'day_before',
    label: '1 day before',
    relativeTime: '1 day before',
    relativeDays: 1,
    tone: 'Urgent, action-focused. Emphasize deadline and required actions.',
  },
  {
    id: 'when_starts',
    label: 'When it occurs',
    relativeTime: 'When it occurs',
    relativeDays: 0,
    tone: 'Direct, status-update. Confirm the event is in progress.',
  },
  {
    id: 'after_completion',
    label: 'After completion',
    relativeTime: 'After completion',
    relativeDays: -1,
    tone: 'Confirming, closing. Summarize outcome and next steps.',
  },
]

export const DEFAULT_TIMING_ID = 'when_starts'

export function getTimingById(id: string): TimingOption | undefined {
  return TIMING_OPTIONS.find(t => t.id === id)
}

export function getDefaultTiming(): TimingOption {
  return TIMING_OPTIONS.find(t => t.id === DEFAULT_TIMING_ID)!
}

/** Create a default escalation step with sensible defaults. */
export function createDefaultStep(_index?: number): EscalationStep {
  const timing = getDefaultTiming()
  return {
    id: `step_${Date.now()}`,
    label: timing.label,
    timingId: timing.id,
    relativeTime: timing.relativeTime,
    relativeDays: timing.relativeDays,
    tone: timing.tone,
  }
}
