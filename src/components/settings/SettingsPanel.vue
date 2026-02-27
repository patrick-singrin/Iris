<script setup lang="ts">
import { ref, computed } from 'vue'
import { useSettingsStore } from '@/stores/settingsStore'
import { useProductContextStore, type ProductContextMode, type ProductContextDocument } from '@/stores/productContextStore'
import { createProvider } from '@/services/llm/providerFactory'
import { renderMarkdown } from '@/utils/renderMarkdown'

const { state } = useSettingsStore()
const { state: pcState, addDocument, removeDocument } = useProductContextStore()

const fileInputRef = ref<HTMLInputElement | null>(null)

// --- Document preview modal ---
const previewDoc = ref<ProductContextDocument | null>(null)

function openPreview(doc: ProductContextDocument) {
  previewDoc.value = doc
}

function closePreview() {
  previewDoc.value = null
}

const previewHtml = computed(() =>
  previewDoc.value ? renderMarkdown(previewDoc.value.content) : '',
)

function handleModeChange(e: Event) {
  const customEvent = e as CustomEvent
  const value = customEvent.detail?.value as ProductContextMode | undefined
  if (value) {
    pcState.mode = value
  }
}

function triggerFileUpload() {
  fileInputRef.value?.click()
}

async function handleFileUpload(event: Event) {
  const input = event.target as HTMLInputElement
  const files = input.files
  if (!files || files.length === 0) return

  for (const file of Array.from(files)) {
    const content = await file.text()
    if (content.trim()) {
      addDocument(file.name, content)
    }
  }
  input.value = ''
}

function handleRemoveDocument(name: string) {
  removeDocument(name)
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
        Upload Markdown files with product-specific knowledge to improve extraction accuracy and text quality.
        Activate context in the classification panel during event documentation.
      </p>

      <scale-dropdown-select
        label="Source"
        :value="pcState.mode"
        @scale-change="handleModeChange"
      >
        <scale-dropdown-select-item value="local" :selected="pcState.mode === 'local'">
          Local (Markdown files)
        </scale-dropdown-select-item>
        <scale-dropdown-select-item value="rag" :selected="pcState.mode === 'rag'" disabled>
          RAG API (coming soon)
        </scale-dropdown-select-item>
      </scale-dropdown-select>

      <!-- Local document list -->
      <div v-if="pcState.mode === 'local'" class="product-context__documents">
        <input
          ref="fileInputRef"
          type="file"
          accept=".md,.txt,.markdown"
          multiple
          style="display: none"
          @change="handleFileUpload"
        />
        <scale-button variant="secondary" size="small" @click="triggerFileUpload">
          Upload .md files
        </scale-button>

        <!-- Document list -->
        <ul v-if="pcState.documents.length > 0" class="product-context__list">
          <li
            v-for="doc in pcState.documents"
            :key="doc.name"
            class="product-context__item"
          >
            <span class="product-context__name">{{ doc.name }}</span>
            <div class="product-context__actions">
              <scale-button
                variant="secondary"
                size="small"
                @click="openPreview(doc)"
              >
                Preview
              </scale-button>
              <scale-button
                variant="secondary"
                size="small"
                @click="handleRemoveDocument(doc.name)"
              >
                Delete
              </scale-button>
            </div>
          </li>
        </ul>

        <!-- Empty state -->
        <p v-else class="settings__helper">
          No context documents uploaded yet. Upload .md files with product name, terminology, tone guidelines, or domain rules.
        </p>
      </div>

      <!-- RAG placeholder -->
      <div v-if="pcState.mode === 'rag'">
        <p class="settings__helper">
          RAG API integration is planned for a future release. Switch to Local mode to provide product context via files.
        </p>
      </div>
    </div>

    <!-- Document preview modal -->
    <scale-modal
      :opened="!!previewDoc"
      :heading="previewDoc?.name ?? ''"
      size="large"
      @scale-close="closePreview"
    >
      <!-- eslint-disable-next-line vue/no-v-html -->
      <div class="md-preview md-content" v-html="previewHtml"></div>
      <div slot="action">
        <scale-button variant="secondary" @click="closePreview">
          Close
        </scale-button>
      </div>
    </scale-modal>
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

.product-context__documents {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.product-context__list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.product-context__item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 12px;
  background: var(--telekom-color-background-canvas, #f4f4f4);
  border: 1px solid var(--telekom-color-ui-border-standard, #ccc);
  border-radius: 6px;
}

.product-context__name {
  font-size: 14px;
  font-weight: 500;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: var(--telekom-color-text-and-icon-standard, #1b1b1b);
  min-width: 0;
  flex: 1;
}

.product-context__actions {
  display: flex;
  gap: 8px;
  flex-shrink: 0;
}

.md-preview {
  max-height: 60vh;
  overflow-y: auto;
  padding: 4px 0;
}
</style>

<!-- Non-scoped: markdown styles must reach v-html content -->
<style>
@import '@/styles/markdown.css';
</style>
