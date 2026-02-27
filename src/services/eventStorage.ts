import type { IrisEvent } from '@/types/event'

const EVENTS_KEY = 'iris-events'
const COUNTER_KEY = 'iris-event-counter'

export function getNextEventId(): string {
  const counter = parseInt(localStorage.getItem(COUNTER_KEY) || '0', 10) + 1
  localStorage.setItem(COUNTER_KEY, String(counter))
  return `IC-${String(counter).padStart(3, '0')}`
}

export function saveEvent(event: IrisEvent): void {
  const events = getAllEvents()
  events.push(event)
  localStorage.setItem(EVENTS_KEY, JSON.stringify(events))
}

export function getAllEvents(): IrisEvent[] {
  const raw = localStorage.getItem(EVENTS_KEY)
  if (!raw) return []
  try {
    return JSON.parse(raw) as IrisEvent[]
  } catch {
    return []
  }
}

export function getEvent(id: string): IrisEvent | undefined {
  return getAllEvents().find((e) => e.id === id)
}

export function deleteEvent(id: string): void {
  const events = getAllEvents().filter((e) => e.id !== id)
  localStorage.setItem(EVENTS_KEY, JSON.stringify(events))
}
