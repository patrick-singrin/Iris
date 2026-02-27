import { ref, watch } from 'vue'

export type AppView = 'settings' | 'documentation' | 'design-principles' | 'event-detail' | 'chat' | 'event-story'

const VALID_VIEWS: AppView[] = ['settings', 'documentation', 'design-principles', 'event-detail', 'chat', 'event-story']

function viewFromHash(): AppView {
  const hash = window.location.hash.replace('#/', '').replace('#', '')
  if (VALID_VIEWS.includes(hash as AppView)) return hash as AppView
  return 'documentation'
}

const activeView = ref<AppView>(viewFromHash())
const selectedEventId = ref<string | null>(null)

// Sync hash → state on browser back/forward
window.addEventListener('hashchange', () => {
  const view = viewFromHash()
  if (activeView.value !== view) activeView.value = view
})

// Sync state → hash on view change
watch(activeView, (view) => {
  const target = `#/${view}`
  if (window.location.hash !== target) window.location.hash = target
}, { immediate: true })

export function useAppStore() {
  function setView(view: AppView) {
    activeView.value = view
  }

  function viewEvent(eventId: string) {
    selectedEventId.value = eventId
    activeView.value = 'event-detail'
  }

  return {
    activeView,
    selectedEventId,
    setView,
    viewEvent,
  }
}
