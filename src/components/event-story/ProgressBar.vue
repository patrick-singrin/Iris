<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from '@/i18n'

const { t } = useI18n()

const props = defineProps<{
  verified: number
  unverified: number
  total: number
}>()

const filledWidth = computed(() => {
  if (props.total === 0) return '0%'
  return `${Math.round(((props.verified + props.unverified) / props.total) * 100)}%`
})

const verifiedWidth = computed(() => {
  if (props.total === 0) return '0%'
  return `${Math.round((props.verified / props.total) * 100)}%`
})
</script>

<template>
  <div class="progress-bar">
    <div class="progress-bar__track">
      <!-- Orange layer: spans full filled width (verified + unverified) -->
      <div
        v-if="verified + unverified > 0"
        class="progress-bar__fill progress-bar__fill--unverified"
        :style="{ width: filledWidth }"
      />
      <!-- Green layer: overlaps on top with white outline -->
      <div
        v-if="verified > 0"
        class="progress-bar__fill progress-bar__fill--verified"
        :style="{ width: verifiedWidth }"
      />
    </div>
    <div class="progress-bar__info">
      <span class="progress-bar__left">
        <strong>{{ verified }}</strong>/{{ total }} {{ t('story.detailsVerified') }}
      </span>
      <span v-if="unverified > 0" class="progress-bar__right">
        <strong>{{ unverified }}</strong> {{ t('story.detailsUnverified') }}
      </span>
    </div>
  </div>
</template>

<style scoped>
.progress-bar {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.progress-bar__track {
  position: relative;
  height: 6px;
  background: var(--telekom-color-ui-faint, #dfdfe1);
  border-radius: 50px;
  overflow: hidden;
}

.progress-bar__fill {
  position: absolute;
  top: 0;
  left: 0;
  height: 100%;
  border-radius: 50px;
  transition: width 0.3s ease;
}

/* Orange: behind, spans verified + unverified */
.progress-bar__fill--unverified {
  background: var(--telekom-color-functional-warning-standard, #f97012);
  z-index: 1;
}

/* Green: on top, with white outline clipped by track overflow:hidden */
.progress-bar__fill--verified {
  background: var(--telekom-color-functional-success-standard, #00b367);
  z-index: 2;
  box-shadow: 0 0 0 2px var(--telekom-color-background-surface, #fff);
}

.progress-bar__info {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 14px;
  font-family: 'TeleNeo', sans-serif;
  font-weight: 400;
  color: var(--telekom-color-text-and-icon-standard, #000000);
  line-height: 19.6px;
}

.progress-bar__info strong {
  font-weight: 700;
}

.progress-bar__right {
  color: #b63d00;
}

.progress-bar__right strong {
  font-weight: 700;
}
</style>
