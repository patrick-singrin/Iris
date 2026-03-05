<script setup lang="ts">
import { computed } from 'vue'
import { useSettingsStore } from '@/stores/settingsStore'
import { useConnectionsStore } from '@/stores/connectionsStore'
import { useI18n } from '@/i18n'

const { t } = useI18n()
const { state: settings } = useSettingsStore()
const { state: connState } = useConnectionsStore()

interface ModelOption {
  connectionId: string
  connectionName: string
  modelId: string
}

const modelOptions = computed<ModelOption[]>(() => {
  const options: ModelOption[] = []
  for (const conn of connState.connections) {
    for (const model of conn.models) {
      options.push({
        connectionId: conn.id,
        connectionName: conn.name,
        modelId: model.id,
      })
    }
  }
  return options
})

const hasModels = computed(() => modelOptions.value.length > 0)

/** Composite value: "connectionId::modelId" or empty for default */
const selectedValue = computed(() => {
  if (settings.classifierConnectionId && settings.classifierModelId) {
    return `${settings.classifierConnectionId}::${settings.classifierModelId}`
  }
  return ''
})

function handleChange(e: Event) {
  const value = (e as CustomEvent).detail?.value ?? ''
  if (!value) {
    settings.classifierConnectionId = ''
    settings.classifierModelId = ''
  } else {
    const [connId, ...modelParts] = value.split('::')
    settings.classifierConnectionId = connId ?? ''
    settings.classifierModelId = modelParts.join('::')
  }
}

/** Group models by connection name */
const groupedModels = computed(() => {
  const groups = new Map<string, ModelOption[]>()
  for (const opt of modelOptions.value) {
    const list = groups.get(opt.connectionName) ?? []
    list.push(opt)
    groups.set(opt.connectionName, list)
  }
  return groups
})
</script>

<template>
  <div v-if="hasModels" class="model-selector">
    <label class="model-selector__label">{{ t('classifier.modelLabel') }}</label>
    <scale-dropdown-select
      :value="selectedValue"
      :label="t('classifier.modelPlaceholder')"
      size="small"
      @scale-change="handleChange"
    >
      <scale-dropdown-select-item value="" :selected="!selectedValue">
        {{ t('classifier.useGlobal') }}
      </scale-dropdown-select-item>
      <template v-for="[connName, models] in groupedModels" :key="connName">
        <scale-dropdown-select-item disabled value="">
          {{ connName }}
        </scale-dropdown-select-item>
        <scale-dropdown-select-item
          v-for="opt in models"
          :key="`${opt.connectionId}::${opt.modelId}`"
          :value="`${opt.connectionId}::${opt.modelId}`"
          :selected="selectedValue === `${opt.connectionId}::${opt.modelId}`"
        >
          {{ opt.modelId }}
        </scale-dropdown-select-item>
      </template>
    </scale-dropdown-select>
  </div>
</template>

<style scoped>
.model-selector {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.model-selector__label {
  font-family: 'TeleNeo', sans-serif;
  font-size: 12px;
  font-weight: 655;
  color: var(--telekom-color-text-and-icon-additional, rgba(0, 0, 0, 0.55));
  text-transform: uppercase;
  letter-spacing: 0.5px;
}
</style>
