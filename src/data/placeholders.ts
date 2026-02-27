/**
 * Placeholder Definitions — typed access to placeholders.json
 *
 * The JSON file is the single source of truth for available placeholders.
 * Backend services can consume placeholders.json directly to generate
 * form fields for placeholder values.
 *
 * This module provides typed helpers for use in the frontend and LLM prompts.
 */

import placeholderData from './placeholders.json'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface PlaceholderDefinition {
  key: string
  label: string
  labelDe: string
  description: string
  type: 'text' | 'date' | 'time' | 'url'
  /** Event kinds this placeholder applies to. null = universal (all event kinds). */
  eventKinds: string[] | null
}

// ---------------------------------------------------------------------------
// Data
// ---------------------------------------------------------------------------

export const placeholders: PlaceholderDefinition[] = placeholderData.placeholders as PlaceholderDefinition[]

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Get all placeholders that apply to a given event kind.
 * Includes universal placeholders (eventKinds === null) plus kind-specific ones.
 */
export function getPlaceholdersForEventKind(eventKind: string): PlaceholderDefinition[] {
  return placeholders.filter(
    p => p.eventKinds === null || p.eventKinds.includes(eventKind),
  )
}

/**
 * Format placeholder keys as a comma-separated list for LLM prompts.
 * E.g. "{service-name}, {date}, {start-time}, {end-time}, {url}"
 */
export function formatPlaceholderList(defs?: PlaceholderDefinition[]): string {
  const list = defs ?? placeholders
  return list.map(p => `{${p.key}}`).join(', ')
}

/**
 * Build a detailed placeholder reference for inclusion in LLM system prompts.
 * Each line shows the placeholder key and its description.
 */
export function buildPlaceholderReference(defs?: PlaceholderDefinition[]): string {
  const list = defs ?? placeholders
  return list
    .map(p => `  - {${p.key}} — ${p.description}`)
    .join('\n')
}
