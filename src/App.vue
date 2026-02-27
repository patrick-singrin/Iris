<script setup lang="ts">
import WizardContainer from '@/components/wizard/WizardContainer.vue'
import SettingsPanel from '@/components/settings/SettingsPanel.vue'
import DocumentationView from '@/components/documentation/DocumentationView.vue'
import EventDetailView from '@/components/documentation/EventDetailView.vue'
import DesignPrinciplesView from '@/components/design-principles/DesignPrinciplesView.vue'
import ChatView from '@/components/chat/ChatView.vue'
import EventStoryView from '@/components/event-story/EventStoryView.vue'
import DevContextForms from '@/components/dev/DevContextForms.vue'
import { useAppStore, type AppView } from '@/stores/appStore'
import { useI18n, type Locale } from '@/i18n'

const { activeView, setView } = useAppStore()
const { locale, t, setLocale } = useI18n()

const navItems: { view: AppView; labelKey: 'nav.events' | 'nav.uiTextGenerator' | 'nav.eventStory' | 'nav.designPrinciples' | 'nav.settings' }[] = [
  { view: 'documentation', labelKey: 'nav.events' },
  { view: 'chat', labelKey: 'nav.uiTextGenerator' },
  { view: 'event-story', labelKey: 'nav.eventStory' },
  { view: 'design-principles', labelKey: 'nav.designPrinciples' },
  { view: 'settings', labelKey: 'nav.settings' },
]

function setLang(lang: string) {
  setLocale(lang as Locale)
}
</script>

<template>
  <scale-telekom-app-shell>
    <scale-telekom-header
      slot="header"
      app-name="Iris – Content Design Assistant"
      app-name-link="#"
    >
      <!-- Meta Navigation: "Event Database" external link -->
      <scale-telekom-nav-list
        slot="meta-nav-external"
        variant="meta-nav-external"
        aria-label="External Meta Navigation"
      >
        <scale-telekom-nav-item>
          <a href="#" target="_blank" rel="noopener noreferrer">
            {{ t('nav.eventDatabase') }}
            <scale-icon-navigation-external-link size="11" />
          </a>
        </scale-telekom-nav-item>
      </scale-telekom-nav-list>

      <!-- Language Switcher: EN / DE -->
      <scale-telekom-nav-list
        slot="lang-switcher"
        variant="lang-switcher"
        aria-label="Language Switcher"
      >
        <scale-telekom-nav-item :active="locale === 'EN'">
          <a href="#" @click.prevent="setLang('EN')">EN</a>
        </scale-telekom-nav-item>
        <scale-telekom-nav-item :active="locale === 'DE'">
          <a href="#" @click.prevent="setLang('DE')">DE</a>
        </scale-telekom-nav-item>
      </scale-telekom-nav-list>

      <!-- Main Navigation -->
      <scale-telekom-nav-list
        slot="main-nav"
        variant="main-nav"
        aria-label="Main Navigation"
      >
        <scale-telekom-nav-item
          v-for="item in navItems"
          :key="item.view"
          :active="activeView === item.view || (item.view === 'documentation' && activeView === 'event-detail')"
        >
          <a href="#" @click.prevent="setView(item.view)">
            {{ t(item.labelKey) }}
          </a>
        </scale-telekom-nav-item>
      </scale-telekom-nav-list>

    </scale-telekom-header>

    <div class="app-content">
      <DocumentationView v-if="activeView === 'documentation'" />
      <EventDetailView v-else-if="activeView === 'event-detail'" />
      <DesignPrinciplesView v-else-if="activeView === 'design-principles'" />
      <WizardContainer v-else-if="activeView === 'wizard'" />
      <SettingsPanel v-else-if="activeView === 'settings'" />
      <ChatView v-else-if="activeView === 'chat'" />
      <EventStoryView v-else-if="activeView === 'event-story'" />
      <DevContextForms v-else-if="activeView === 'dev-context-forms'" />
    </div>
  </scale-telekom-app-shell>
</template>

<style>
body {
  margin: 0;
}

.app-content {
  padding: 32px 32px 0;
  min-height: calc(100vh - 96px);
}

.app-content:has(.chat-view),
.app-content:has(.event-story-view) {
  padding: 0;
  overflow: hidden;
  height: calc(100vh - 96px);
  min-height: 0;
}

scale-telekom-app-shell {
  --telekom-color-background-canvas: #fbfbfb;
}
</style>
