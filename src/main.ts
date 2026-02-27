import { createApp } from 'vue'
import { defineCustomElements } from '@telekom/scale-components/loader'
import '@telekom/scale-components/dist/scale-components/scale-components.css'
import { seedEventsIfEmpty } from './services/seedEvents'
import App from './App.vue'

defineCustomElements(window)
seedEventsIfEmpty()

const app = createApp(App)
app.mount('#app')
