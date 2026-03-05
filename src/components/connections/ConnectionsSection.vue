<script setup lang="ts">
import { ref } from 'vue'
import { useConnectionsStore } from '@/stores/connectionsStore'
import { useI18n } from '@/i18n'
import ConnectionCard from './ConnectionCard.vue'
import ConnectionForm from './ConnectionForm.vue'

const { t } = useI18n()
const { state, addConnection } = useConnectionsStore()

const showAddForm = ref(false)

function handleAdd(data: { name: string; endpoint: string; apiKey: string }) {
  addConnection(data.name, data.endpoint, data.apiKey)
  showAddForm.value = false
}
</script>

<template>
  <div class="settings__section">
    <h3>{{ t('connections.title') }}</h3>
    <p class="settings__helper">
      {{ t('connections.helper') }}
    </p>
    <p class="settings__helper settings__helper--safe">
      {{ t('connections.credentialsSafe') }}
    </p>

    <!-- Connection list -->
    <ConnectionCard
      v-for="conn in state.connections"
      :key="conn.id"
      :connection="conn"
    />

    <!-- Empty state -->
    <p v-if="state.connections.length === 0 && !showAddForm" class="connections__empty">
      {{ t('connections.empty') }}
    </p>

    <!-- Add form -->
    <ConnectionForm
      v-if="showAddForm"
      @save="handleAdd"
      @cancel="showAddForm = false"
    />

    <!-- Add button -->
    <scale-button
      v-if="!showAddForm"
      size="small"
      variant="secondary"
      @click="showAddForm = true"
    >
      {{ t('connections.add') }}
    </scale-button>
  </div>
</template>

<style scoped>
.connections__empty {
  color: var(--telekom-color-text-and-icon-additional, #6c6c6c);
  font-size: 14px;
  font-style: italic;
  margin: 0;
}
</style>
