import { createApp } from 'vue'
import { defineCustomElements } from '@telekom/scale-components/loader'
import '@telekom/scale-components/dist/scale-components/scale-components.css'
import { seedEventsIfEmpty } from './services/seedEvents'
import App from './App.vue'

defineCustomElements(window)
seedEventsIfEmpty()

const app = createApp(App)
app.mount('#app')

// Dev demo shortcut — ?demo in URL or window.__iris_demo() in console
if (import.meta.env.DEV) {
  import('./dev/demo').then(m => {
    ;(window as Record<string, unknown>).__iris_demo = m.loadDemo
    if (new URLSearchParams(window.location.search).has('demo')) {
      m.loadDemo()
    }
  })
}
