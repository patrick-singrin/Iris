import type { EscalationStep } from '@/types/event'

export interface EscalationPreset {
  id: string
  name: string
  description: string
  steps: EscalationStep[]
}

const presets: EscalationPreset[] = [
  {
    id: 'standard',
    name: 'Standard',
    description: '3 steps: Announce → Remind → Go live',
    steps: [
      {
        id: 'step_announce',
        label: 'Announcement',
        relativeTime: '7 days before',
        relativeDays: 7,
        tone: 'Informational, planning-focused. Prepare users for the upcoming change.',
      },
      {
        id: 'step_reminder',
        label: 'Reminder',
        relativeTime: '1 day before',
        relativeDays: 1,
        tone: 'Urgent, action-focused. Emphasize deadline and required actions.',
      },
      {
        id: 'step_active',
        label: 'Active',
        relativeTime: 'When it starts',
        relativeDays: 0,
        tone: 'Direct, status-update. Confirm the event is in progress.',
      },
    ],
  },
  {
    id: 'quick',
    name: 'Quick',
    description: '2 steps: Heads-up → Go live',
    steps: [
      {
        id: 'step_headsup',
        label: 'Heads-up',
        relativeTime: '1 day before',
        relativeDays: 1,
        tone: 'Brief, informational. Give users a quick heads-up about the upcoming change.',
      },
      {
        id: 'step_active',
        label: 'Active',
        relativeTime: 'When it starts',
        relativeDays: 0,
        tone: 'Direct, status-update. Confirm the event is in progress.',
      },
    ],
  },
  {
    id: 'full',
    name: 'Full',
    description: '4 steps: Announce → Remind → Go live → Resolve',
    steps: [
      {
        id: 'step_announce',
        label: 'Announcement',
        relativeTime: '7 days before',
        relativeDays: 7,
        tone: 'Informational, planning-focused. Prepare users for the upcoming change.',
      },
      {
        id: 'step_reminder',
        label: 'Reminder',
        relativeTime: '1 day before',
        relativeDays: 1,
        tone: 'Urgent, action-focused. Emphasize deadline and required actions.',
      },
      {
        id: 'step_active',
        label: 'Active',
        relativeTime: 'When it starts',
        relativeDays: 0,
        tone: 'Direct, status-update. Confirm the event is in progress.',
      },
      {
        id: 'step_resolution',
        label: 'Resolution',
        relativeTime: 'After completion',
        relativeDays: -1,
        tone: 'Confirming, closing. Summarize outcome and next steps.',
      },
    ],
  },
]

export function getPresets(): EscalationPreset[] {
  return presets
}

export function getPresetById(id: string): EscalationPreset | undefined {
  return presets.find(p => p.id === id)
}

/**
 * Returns the recommended default preset based on lead time.
 * Short notice (< 24h) → Quick (2 steps)
 * Otherwise → Standard (3 steps)
 */
export function getDefaultPreset(leadTime: string): EscalationPreset {
  if (leadTime === 'less_than_24h') {
    return presets.find(p => p.id === 'quick')!
  }
  return presets.find(p => p.id === 'standard')!
}
