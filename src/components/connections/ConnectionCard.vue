<script setup lang="ts">
import { ref, computed } from 'vue'
import type { LLMConnection } from '@/types/connection'
import { useConnectionsStore } from '@/stores/connectionsStore'
import { fetchModelsFromEndpoint } from '@/services/llm/modelFetcher'
import { useI18n } from '@/i18n'
import ConnectionForm from './ConnectionForm.vue'

const { t } = useI18n()
const { updateConnection, removeConnection, setModels, setStatus } = useConnectionsStore()

const props = defineProps<{
  connection: LLMConnection
}>()

const isEditing = ref(false)
const showModels = ref(false)
const fetchStatus = ref<'idle' | 'loading' | 'error'>('idle')
const fetchError = ref('')

const reasoningModels = computed(() => props.connection.models.filter(m => m.category === 'reasoning'))
const chatModels = computed(() => props.connection.models.filter(m => m.category === 'chat'))

const statusColor = computed(() => {
  switch (props.connection.status) {
    case 'ok': return 'var(--telekom-color-text-and-icon-functional-success, #2a7a2a)'
    case 'error': return 'var(--telekom-color-text-and-icon-functional-danger, #d90000)'
    default: return 'var(--telekom-color-text-and-icon-additional, #6c6c6c)'
  }
})

const statusLabel = computed(() => t(`connections.status.${props.connection.status}`))

const truncatedEndpoint = computed(() => {
  const ep = props.connection.endpoint
  return ep.length > 50 ? ep.slice(0, 47) + '...' : ep
})

async function handleFetchModels() {
  fetchStatus.value = 'loading'
  fetchError.value = ''
  try {
    const models = await fetchModelsFromEndpoint(
      props.connection.endpoint,
      props.connection.apiKey || undefined,
    )
    setModels(props.connection.id, models)
    fetchStatus.value = 'idle'
    showModels.value = true
  } catch (e) {
    fetchStatus.value = 'error'
    fetchError.value = e instanceof Error ? e.message : 'Unknown error'
    setStatus(props.connection.id, 'error')
  }
}

function handleSave(data: { name: string; endpoint: string; apiKey: string }) {
  updateConnection(props.connection.id, data)
  isEditing.value = false
}

function handleDelete() {
  removeConnection(props.connection.id)
}
</script>

<template>
  <div class="connection-card">
    <!-- Edit mode -->
    <ConnectionForm
      v-if="isEditing"
      :connection="connection"
      @save="handleSave"
      @cancel="isEditing = false"
    />

    <!-- Display mode -->
    <template v-else>
      <div class="connection-card__header">
        <div class="connection-card__info">
          <div class="connection-card__name">{{ connection.name }}</div>
          <div class="connection-card__endpoint">{{ truncatedEndpoint }}</div>
        </div>
        <div class="connection-card__status">
          <span class="connection-card__dot" :style="{ backgroundColor: statusColor }"></span>
          <span class="connection-card__status-label">{{ statusLabel }}</span>
        </div>
      </div>

      <div class="connection-card__actions">
        <scale-button size="small" variant="secondary" @click="isEditing = true">
          {{ t('connections.edit') }}
        </scale-button>
        <scale-button
          size="small"
          variant="secondary"
          :disabled="fetchStatus === 'loading'"
          @click="handleFetchModels"
        >
          {{ fetchStatus === 'loading' ? t('connections.fetchingModels') : t('connections.fetchModels') }}
        </scale-button>
        <scale-button size="small" variant="secondary" @click="handleDelete">
          {{ t('connections.delete') }}
        </scale-button>
      </div>

      <scale-notification
        v-if="fetchStatus === 'error'"
        variant="danger"
        :heading="t('connections.fetchFailed')"
        opened
      >
        {{ fetchError }}
      </scale-notification>

      <!-- Model list -->
      <div v-if="connection.models.length > 0" class="connection-card__models">
        <button class="connection-card__models-toggle" @click="showModels = !showModels">
          {{ t('connections.modelsLoaded').replace('{count}', String(connection.models.length)) }}
          <span class="connection-card__chevron" :class="{ 'connection-card__chevron--open': showModels }">&#9662;</span>
        </button>
        <div v-if="showModels" class="connection-card__model-list">
          <template v-if="reasoningModels.length > 0">
            <div class="connection-card__model-group">{{ t('connections.reasoningModels') }}</div>
            <div v-for="m in reasoningModels" :key="m.id" class="connection-card__model-item">{{ m.id }}</div>
          </template>
          <template v-if="chatModels.length > 0">
            <div class="connection-card__model-group">{{ t('connections.chatModels') }}</div>
            <div v-for="m in chatModels" :key="m.id" class="connection-card__model-item">{{ m.id }}</div>
          </template>
        </div>
      </div>
      <div v-else-if="connection.lastModelFetch === null" class="connection-card__no-models">
        {{ t('connections.noModels') }}
      </div>
    </template>
  </div>
</template>

<style scoped>
.connection-card {
  border: 1px solid var(--telekom-color-ui-border-standard, #ccc);
  border-radius: 8px;
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.connection-card__header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
}

.connection-card__info {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.connection-card__name {
  font-weight: 700;
  font-size: 15px;
}

.connection-card__endpoint {
  font-size: 13px;
  color: var(--telekom-color-text-and-icon-additional, #6c6c6c);
  word-break: break-all;
}

.connection-card__status {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-shrink: 0;
}

.connection-card__dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  display: inline-block;
}

.connection-card__status-label {
  font-size: 13px;
  color: var(--telekom-color-text-and-icon-additional, #6c6c6c);
}

.connection-card__actions {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.connection-card__models-toggle {
  background: none;
  border: none;
  cursor: pointer;
  font-size: 13px;
  color: var(--telekom-color-text-and-icon-functional-success, #2a7a2a);
  padding: 0;
  display: flex;
  align-items: center;
  gap: 4px;
}

.connection-card__chevron {
  transition: transform 0.2s;
  font-size: 12px;
}

.connection-card__chevron--open {
  transform: rotate(180deg);
}

.connection-card__model-list {
  display: flex;
  flex-direction: column;
  gap: 2px;
  margin-top: 8px;
  max-height: 200px;
  overflow-y: auto;
}

.connection-card__model-group {
  font-size: 12px;
  font-weight: 700;
  color: var(--telekom-color-text-and-icon-additional, #6c6c6c);
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin-top: 8px;
}

.connection-card__model-group:first-child {
  margin-top: 0;
}

.connection-card__model-item {
  font-size: 13px;
  padding: 2px 0;
  font-family: monospace;
}

.connection-card__no-models {
  font-size: 13px;
  color: var(--telekom-color-text-and-icon-additional, #6c6c6c);
  font-style: italic;
}
</style>
