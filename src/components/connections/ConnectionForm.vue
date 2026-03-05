<script setup lang="ts">
import { ref } from 'vue'
import type { LLMConnection } from '@/types/connection'
import { useI18n } from '@/i18n'

const { t } = useI18n()

const props = defineProps<{
  connection?: LLMConnection
}>()

const emit = defineEmits<{
  save: [data: { name: string; endpoint: string; apiKey: string }]
  cancel: []
}>()

const name = ref(props.connection?.name ?? '')
const endpoint = ref(props.connection?.endpoint ?? '')
const apiKey = ref(props.connection?.apiKey ?? '')

function handleSave() {
  if (!name.value.trim() || !endpoint.value.trim()) return
  emit('save', {
    name: name.value.trim(),
    endpoint: endpoint.value.trim(),
    apiKey: apiKey.value,
  })
}
</script>

<template>
  <div class="connection-form">
    <scale-text-field
      :label="t('connections.name')"
      :value="name"
      :placeholder="t('connections.namePlaceholder')"
      @scaleChange="(e: CustomEvent) => name = e.detail.value ?? ''"
    ></scale-text-field>
    <scale-text-field
      :label="t('connections.endpoint')"
      :value="endpoint"
      :placeholder="t('connections.endpointPlaceholder')"
      :helper-text="t('connections.endpointHelper')"
      @scaleChange="(e: CustomEvent) => endpoint = e.detail.value ?? ''"
    ></scale-text-field>
    <scale-text-field
      :label="t('connections.apiKey')"
      type="password"
      :value="apiKey"
      :helper-text="t('connections.apiKeyHelper')"
      @scaleChange="(e: CustomEvent) => apiKey = e.detail.value ?? ''"
    ></scale-text-field>
    <div class="connection-form__actions">
      <scale-button size="small" @click="handleSave" :disabled="!name.trim() || !endpoint.trim()">
        {{ t('connections.save') }}
      </scale-button>
      <scale-button size="small" variant="secondary" @click="$emit('cancel')">
        {{ t('connections.cancel') }}
      </scale-button>
    </div>
  </div>
</template>

<style scoped>
.connection-form {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 16px;
  background: var(--telekom-color-background-surface-subtle, #f4f4f4);
  border-radius: 8px;
}

.connection-form__actions {
  display: flex;
  gap: 8px;
}
</style>
