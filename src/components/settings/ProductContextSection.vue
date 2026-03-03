<script setup lang="ts">
import { ref, computed } from 'vue'
import { useProductContextStore, type ProductContextMode, type ProductContextDocument } from '@/stores/productContextStore'
import { renderMarkdown } from '@/utils/renderMarkdown'
import { useI18n } from '@/i18n'

const { t } = useI18n()

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
</script>

<template>
  <div class="settings__section">
    <h3>{{ t('settings.productContext') }}</h3>
    <p class="settings__helper">
      {{ t('settings.productContextHelper') }}
    </p>

    <scale-dropdown-select
      :label="t('settings.source')"
      :value="pcState.mode"
      @scale-change="handleModeChange"
    >
      <scale-dropdown-select-item value="local" :selected="pcState.mode === 'local'">
        {{ t('settings.localMode') }}
      </scale-dropdown-select-item>
      <scale-dropdown-select-item value="rag" :selected="pcState.mode === 'rag'" disabled>
        {{ t('settings.ragMode') }}
      </scale-dropdown-select-item>
    </scale-dropdown-select>

    <!-- Local document list -->
    <div v-if="pcState.mode === 'local'" class="product-context__documents">
      <input
        ref="fileInputRef"
        type="file"
        accept=".md,.txt,.markdown,text/markdown,text/plain"
        multiple
        :aria-label="t('a11y.uploadFiles')"
        style="display: none"
        @change="handleFileUpload"
      />
      <scale-button variant="secondary" size="small" @click="triggerFileUpload">
        {{ t('settings.uploadMd') }}
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
              {{ t('settings.preview') }}
            </scale-button>
            <scale-button
              variant="secondary"
              size="small"
              @click="handleRemoveDocument(doc.name)"
            >
              {{ t('settings.delete') }}
            </scale-button>
          </div>
        </li>
      </ul>

      <!-- Empty state -->
      <p v-else class="settings__helper">
        {{ t('settings.noDocuments') }}
      </p>
    </div>

    <!-- RAG placeholder -->
    <div v-if="pcState.mode === 'rag'">
      <p class="settings__helper">
        {{ t('settings.ragPlaceholder') }}
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
        {{ t('settings.close') }}
      </scale-button>
    </div>
  </scale-modal>
</template>

<style scoped>
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
