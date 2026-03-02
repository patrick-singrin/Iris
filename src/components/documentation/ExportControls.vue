<script setup lang="ts">
import type { IrisEvent } from '@/types/event'
import { downloadMarkdown } from '@/services/markdownExport'
import { useI18n } from '@/i18n'

const { t } = useI18n()

const props = defineProps<{
  event: IrisEvent
}>()

function handleExport() {
  downloadMarkdown(props.event)
}
</script>

<template>
  <div class="export-controls">
    <scale-button size="small" variant="secondary" @click="handleExport">
      {{ t('export.markdown') }}
    </scale-button>
  </div>
</template>

<style scoped>
.export-controls {
  display: flex;
  gap: 8px;
}
</style>
