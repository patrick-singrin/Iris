<script setup lang="ts">
import { ref, computed } from 'vue'
import { useSettingsStore } from '@/stores/settingsStore'
import { createProvider } from '@/services/llm/providerFactory'
import { fetchLLMHubModels, type LLMHubModel } from '@/services/llm/llmHubProvider'
import { useI18n } from '@/i18n'
import ProductContextSection from './ProductContextSection.vue'
import ConnectionsSection from '@/components/connections/ConnectionsSection.vue'

const { t } = useI18n()

const { state } = useSettingsStore()

const testStatus = ref<'idle' | 'testing' | 'success' | 'error'>('idle')
const testMessage = ref('')

// LLMHub model fetching
const llmHubModels = ref<LLMHubModel[]>([])
const modelFetchStatus = ref<'idle' | 'loading' | 'success' | 'error'>('idle')
const modelFetchMessage = ref('')

const reasoningModels = computed(() => llmHubModels.value.filter(m => m.category === 'reasoning'))
const chatModels = computed(() => llmHubModels.value.filter(m => m.category === 'chat'))

async function fetchModels() {
  if (!state.llmHubApiKey) {
    modelFetchStatus.value = 'error'
    modelFetchMessage.value = 'Please enter an API key first.'
    return
  }
  modelFetchStatus.value = 'loading'
  modelFetchMessage.value = ''
  try {
    llmHubModels.value = await fetchLLMHubModels(state.llmHubEndpoint, state.llmHubApiKey)
    modelFetchStatus.value = 'success'
    modelFetchMessage.value = t('settings.modelsLoaded').replace('{count}', String(llmHubModels.value.length))
  } catch (e) {
    modelFetchStatus.value = 'error'
    modelFetchMessage.value = e instanceof Error ? e.message : 'Unknown error'
  }
}

function handleModelChange(e: Event) {
  const value = (e as CustomEvent).detail?.value
  if (value) state.llmHubModel = value
}

function handleProviderChange(e: Event) {
  const customEvent = e as CustomEvent
  const value = customEvent.detail?.value as 'anthropic' | 'lmstudio' | 'llmhub' | undefined
  if (value) {
    state.provider = value
    testStatus.value = 'idle'
    testMessage.value = ''
  }
}

async function testConnection() {
  testStatus.value = 'testing'
  testMessage.value = ''

  try {
    const provider = createProvider()
    const result = await provider.generateText({
      systemPrompt: 'Reply with exactly: CONNECTION_OK',
      userPrompt: 'Test',
      maxTokens: 20,
    })

    if (result.rawResponse) {
      testStatus.value = 'success'
      testMessage.value = `Connected successfully. Model responded: "${result.rawResponse.slice(0, 80)}"`
    } else {
      testStatus.value = 'error'
      testMessage.value = 'Connected but received an empty response.'
    }
  } catch (e) {
    testStatus.value = 'error'
    testMessage.value = e instanceof Error ? e.message : 'An unknown error occurred'
  }
}
</script>

<template>
  <div class="settings">
    <h2>{{ t('settings.title') }}</h2>

    <div class="settings__section">
      <h3>{{ t('settings.llmProvider') }}</h3>
      <p class="settings__helper">
        {{ t('settings.llmProviderHelper') }}
      </p>

      <scale-dropdown-select
        :label="t('settings.provider')"
        :value="state.provider"
        @scale-change="handleProviderChange"
      >
        <scale-dropdown-select-item value="anthropic" :selected="state.provider === 'anthropic'">
          {{ t('settings.anthropicApi') }}
        </scale-dropdown-select-item>
        <scale-dropdown-select-item value="lmstudio" :selected="state.provider === 'lmstudio'">
          {{ t('settings.lmStudio') }}
        </scale-dropdown-select-item>
        <scale-dropdown-select-item value="llmhub" :selected="state.provider === 'llmhub'">
          {{ t('settings.llmHub') }}
        </scale-dropdown-select-item>
      </scale-dropdown-select>
    </div>

    <!-- Anthropic Settings -->
    <div v-if="state.provider === 'anthropic'" class="settings__section">
      <h3>{{ t('settings.anthropicConfig') }}</h3>
      <scale-text-field
        :label="t('settings.apiKey')"
        type="password"
        :value="state.anthropicApiKey"
        @scaleChange="(e: CustomEvent) => state.anthropicApiKey = e.detail.value ?? ''"
        :helper-text="t('settings.apiKeyHelper')"
      ></scale-text-field>
      <scale-text-field
        :label="t('settings.model')"
        :value="state.anthropicModel"
        @scaleChange="(e: CustomEvent) => state.anthropicModel = e.detail.value ?? ''"
        :helper-text="t('settings.modelHelper')"
      ></scale-text-field>
    </div>

    <!-- LM Studio Settings -->
    <div v-if="state.provider === 'lmstudio'" class="settings__section">
      <h3>{{ t('settings.lmStudioConfig') }}</h3>
      <scale-text-field
        :label="t('settings.endpoint')"
        :value="state.lmStudioEndpoint"
        @scaleChange="(e: CustomEvent) => state.lmStudioEndpoint = e.detail.value ?? ''"
        :helper-text="t('settings.endpointHelper')"
      ></scale-text-field>
    </div>

    <!-- LLMHub Settings -->
    <div v-if="state.provider === 'llmhub'" class="settings__section">
      <h3>{{ t('settings.llmHubConfig') }}</h3>
      <p class="settings__helper settings__helper--safe">
        {{ t('settings.credentialsSafe') }}
      </p>
      <scale-text-field
        :label="t('settings.apiKey')"
        type="password"
        :value="state.llmHubApiKey"
        @scaleChange="(e: CustomEvent) => state.llmHubApiKey = e.detail.value ?? ''"
        :helper-text="t('settings.llmHubApiKeyHelper')"
      ></scale-text-field>
      <scale-text-field
        :label="t('settings.endpoint')"
        :value="state.llmHubEndpoint"
        @scaleChange="(e: CustomEvent) => state.llmHubEndpoint = e.detail.value ?? ''"
        :helper-text="t('settings.llmHubEndpointHelper')"
      ></scale-text-field>

      <!-- Model selection: dropdown if models fetched, text field as fallback -->
      <div class="settings__model-row">
        <scale-button
          variant="secondary"
          size="small"
          :disabled="modelFetchStatus === 'loading' || !state.llmHubApiKey"
          @click="fetchModels"
        >
          {{ modelFetchStatus === 'loading' ? t('settings.fetchingModels') : t('settings.fetchModels') }}
        </scale-button>
        <span v-if="modelFetchStatus === 'success'" class="settings__model-count">
          {{ modelFetchMessage }}
        </span>
      </div>

      <scale-notification
        v-if="modelFetchStatus === 'error'"
        variant="danger"
        :heading="t('settings.fetchModelsFailed')"
        opened
      >
        {{ modelFetchMessage }}
      </scale-notification>

      <!-- Grouped model dropdown when models are available -->
      <scale-dropdown-select
        v-if="llmHubModels.length > 0"
        :label="t('settings.model')"
        :value="state.llmHubModel"
        @scale-change="handleModelChange"
      >
        <!-- Reasoning models group -->
        <scale-dropdown-select-item v-if="reasoningModels.length > 0" disabled value="">
          {{ t('settings.reasoningModels') }}
        </scale-dropdown-select-item>
        <scale-dropdown-select-item
          v-for="model in reasoningModels"
          :key="model.id"
          :value="model.id"
          :selected="state.llmHubModel === model.id"
        >
          {{ model.id }}
        </scale-dropdown-select-item>
        <!-- Chat models group -->
        <scale-dropdown-select-item v-if="chatModels.length > 0" disabled value="">
          {{ t('settings.chatModels') }}
        </scale-dropdown-select-item>
        <scale-dropdown-select-item
          v-for="model in chatModels"
          :key="model.id"
          :value="model.id"
          :selected="state.llmHubModel === model.id"
        >
          {{ model.id }}
        </scale-dropdown-select-item>
      </scale-dropdown-select>

      <!-- Fallback: manual text field when no models fetched -->
      <scale-text-field
        v-else
        :label="t('settings.model')"
        :value="state.llmHubModel"
        @scaleChange="(e: CustomEvent) => state.llmHubModel = e.detail.value ?? ''"
        :helper-text="t('settings.llmHubModelHelper')"
      ></scale-text-field>
    </div>

    <!-- Test Connection -->
    <div class="settings__section">
      <h3>{{ t('settings.testConnection') }}</h3>
      <p class="settings__helper">
        {{ t('settings.testConnectionHelper') }}
      </p>
      <div class="settings__test">
        <scale-button
          :disabled="testStatus === 'testing'"
          variant="secondary"
          @click="testConnection"
        >
          {{ testStatus === 'testing' ? t('settings.testing') : t('settings.testBtn') }}
        </scale-button>
      </div>

      <scale-notification
        v-if="testStatus === 'success'"
        variant="success"
        :heading="t('settings.connectionSuccess')"
        opened
      >
        {{ testMessage }}
      </scale-notification>

      <scale-notification
        v-if="testStatus === 'error'"
        variant="danger"
        :heading="t('settings.connectionFailed')"
        opened
      >
        {{ testMessage }}
      </scale-notification>
    </div>

    <!-- API Connections -->
    <ConnectionsSection />

    <!-- Product Context (extracted sub-component) -->
    <ProductContextSection />
  </div>
</template>

<style scoped>
.settings {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.settings__section {
  background: var(--telekom-color-background-surface, #fff);
  border: 1px solid var(--telekom-color-ui-border-standard, #ccc);
  border-radius: 8px;
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.settings__section h3 {
  margin: 0;
}

.settings__helper {
  color: var(--telekom-color-text-and-icon-additional, #6c6c6c);
  font-size: 14px;
  margin: 0;
}

.settings__test {
  display: flex;
  align-items: center;
  gap: 12px;
}

.settings__helper--safe {
  font-style: italic;
}

.settings__model-row {
  display: flex;
  align-items: center;
  gap: 12px;
}

.settings__model-count {
  color: var(--telekom-color-text-and-icon-functional-success, #2a7a2a);
  font-size: 14px;
}
</style>
