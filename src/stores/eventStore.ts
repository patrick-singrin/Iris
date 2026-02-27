import { ref } from 'vue'
import type { IrisEvent, EventDescription, Classification, GeneratedText, TypeContext } from '@/types/event'
import { getNextEventId, saveEvent as persistEvent, getAllEvents, deleteEvent as removeEvent } from '@/services/eventStorage'

const events = ref<IrisEvent[]>(getAllEvents())
const currentEvent = ref<IrisEvent | null>(null)

export function useEventStore() {
  function createEvent(
    description: EventDescription,
    classification: Classification,
    generatedText: GeneratedText | null = null,
    typeContext: TypeContext | null = null,
  ): IrisEvent {
    const event: IrisEvent = {
      id: getNextEventId(),
      createdAt: new Date().toISOString(),
      status: 'documented',
      description: { ...description },
      classification: { ...classification },
      typeContext: typeContext ? { ...typeContext } : null,
      generatedText: generatedText ? { ...generatedText } : null,
    }

    persistEvent(event)
    events.value = getAllEvents()
    currentEvent.value = event
    return event
  }

  function deleteEvent(id: string) {
    removeEvent(id)
    events.value = getAllEvents()
    if (currentEvent.value?.id === id) {
      currentEvent.value = null
    }
  }

  function refreshEvents() {
    events.value = getAllEvents()
  }

  return {
    events,
    currentEvent,
    createEvent,
    deleteEvent,
    refreshEvents,
  }
}
