<script setup lang="ts">
import { ref } from 'vue'
import { useSettingsStore } from '@/stores/settingsStore'
import { useProductContextStore, type ProductContextMode } from '@/stores/productContextStore'
import { createProvider } from '@/services/llm/providerFactory'

const { state } = useSettingsStore()
const { state: pcState } = useProductContextStore()

const LOCAL_TEMPLATE = `# Product Context

## Product Name
[Your product name]

## Domain Description
[Brief description of what your product does and who uses it]

## Key Terminology
[Product-specific terms, feature names, technical concepts]

## Domain-Specific Rules
[Any rules specific to your product's communications]`

const fileInputRef = ref<HTMLInputElement | null>(null)

// Pre-fill template if local content is empty
if (pcState.mode === 'local' && !pcState.localContent.trim()) {
  pcState.localContent = LOCAL_TEMPLATE
}

function handleModeChange(e: Event) {
  const customEvent = e as CustomEvent
  const value = customEvent.detail?.value as ProductContextMode | undefined
  if (value) {
    pcState.mode = value
    if (value === 'local' && !pcState.localContent.trim()) {
      pcState.localContent = LOCAL_TEMPLATE
    }
  }
}

function handleContentChange(e: Event) {
  const customEvent = e as CustomEvent
  pcState.localContent = customEvent.detail?.value ?? ''
}

function triggerFileUpload() {
  fileInputRef.value?.click()
}

async function handleFileUpload(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return
  pcState.localContent = await file.text()
  input.value = ''
}

function clearContent() {
  pcState.localContent = ''
}

const testStatus = ref<'idle' | 'testing' | 'success' | 'error'>('idle')
const testMessage = ref('')

function handleProviderChange(e: Event) {
  const customEvent = e as CustomEvent
  const value = customEvent.detail?.value as 'anthropic' | 'lmstudio' | undefined
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
    <h2>Settings</h2>

    <div class="settings__section">
      <h3>LLM Provider</h3>
      <p class="settings__helper">
        Select the AI provider for text generation. Settings are saved automatically.
      </p>

      <scale-dropdown-select
        label="Provider"
        :value="state.provider"
        @scale-change="handleProviderChange"
      >
        <scale-dropdown-select-item value="anthropic" :selected="state.provider === 'anthropic'">
          Anthropic API (Claude)
        </scale-dropdown-select-item>
        <scale-dropdown-select-item value="lmstudio" :selected="state.provider === 'lmstudio'">
          LM Studio (Local)
        </scale-dropdown-select-item>
      </scale-dropdown-select>
    </div>

    <!-- Anthropic Settings -->
    <div v-if="state.provider === 'anthropic'" class="settings__section">
      <h3>Anthropic Configuration</h3>
      <scale-text-field
        label="API Key"
        type="password"
        :value="state.anthropicApiKey"
        @scaleChange="(e: CustomEvent) => state.anthropicApiKey = e.detail.value ?? ''"
        helper-text="Your Anthropic API key (starts with sk-ant-)"
      ></scale-text-field>
      <scale-text-field
        label="Model"
        :value="state.anthropicModel"
        @scaleChange="(e: CustomEvent) => state.anthropicModel = e.detail.value ?? ''"
        helper-text="Default: claude-sonnet-4-20250514"
      ></scale-text-field>
    </div>

    <!-- LM Studio Settings -->
    <div v-if="state.provider === 'lmstudio'" class="settings__section">
      <h3>LM Studio Configuration</h3>
      <scale-text-field
        label="Endpoint URL"
        :value="state.lmStudioEndpoint"
        @scaleChange="(e: CustomEvent) => state.lmStudioEndpoint = e.detail.value ?? ''"
        helper-text="Default: http://localhost:1234/v1"
      ></scale-text-field>
    </div>

    <!-- Test Connection -->
    <div class="settings__section">
      <h3>Test Connection</h3>
      <p class="settings__helper">
        Send a quick test message to verify your provider is configured correctly.
      </p>
      <div class="settings__test">
        <scale-button
          :disabled="testStatus === 'testing'"
          variant="secondary"
          @click="testConnection"
        >
          {{ testStatus === 'testing' ? 'Testing...' : 'Test connection' }}
        </scale-button>
      </div>

      <scale-notification
        v-if="testStatus === 'success'"
        variant="success"
        heading="Connection successful"
        opened
      >
        {{ testMessage }}
      </scale-notification>

      <scale-notification
        v-if="testStatus === 'error'"
        variant="danger"
        heading="Connection failed"
        opened
      >
        {{ testMessage }}
      </scale-notification>
    </div>

    <!-- Product Context -->
    <div class="settings__section">
      <h3>Product Context</h3>
      <p class="settings__helper">
        Provide product-specific knowledge to improve extraction accuracy and text quality.
        Activate it in the classification panel during event documentation.
      </p>

      <scale-dropdown-select
        label="Source"
        :value="pcState.mode"
        @scale-change="handleModeChange"
      >
        <scale-dropdown-select-item value="local" :selected="pcState.mode === 'local'">
          Local (Markdown)
        </scale-dropdown-select-item>
        <scale-dropdown-select-item value="rag" :selected="pcState.mode === 'rag'" disabled>
          RAG API (coming soon)
        </scale-dropdown-select-item>
      </scale-dropdown-select>

      <!-- Local markdown editor -->
      <div v-if="pcState.mode === 'local'" class="product-context__editor">
        <scale-textarea
          :value="pcState.localContent"
          label="Product context (Markdown)"
          rows="12"
          resize="vertical"
          @scaleChange="handleContentChange"
        />
        <div class="product-context__actions">
          <input
            ref="fileInputRef"
            type="file"
            accept=".md,.txt,.markdown"
            style="display: none"
            @change="handleFileUpload"
          />
          <scale-button variant="secondary" size="small" @click="triggerFileUpload">
            Load .md file
          </scale-button>
          <scale-button variant="secondary" size="small" @click="clearContent">
            Clear
          </scale-button>
        </div>
        <p class="settings__helper">
          Suggested sections: Product Name, Domain Description, Tone &amp; Voice, Key Terminology, Domain-Specific Rules.
        </p>
      </div>

      <!-- RAG placeholder -->
      <div v-if="pcState.mode === 'rag'">
        <p class="settings__helper">
          RAG API integration is planned for a future release. Switch to Local mode to provide product context manually.
        </p>
      </div>
    </div>
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

.product-context__editor {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.product-context__actions {
  display: flex;
  gap: 8px;
}
</style>
