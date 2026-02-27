<script setup lang="ts">
import { inject, type Ref } from 'vue'

export interface TypeResult {
  classification: string
  channels: string[]
  purpose?: string
}

const props = withDefaults(defineProps<{
  activeTab: 'Classification' | 'Context' | 'Summary'
  backLabel?: string
  nextLabel?: string
  nextDisabled?: boolean
  backDisabled?: boolean
  showBackButton?: boolean
  showNextButton?: boolean
  showResultTile?: boolean
  validationHint?: string
  showValidationHint?: boolean
}>(), {
  backLabel: 'Back',
  nextLabel: 'Continue',
  nextDisabled: false,
  backDisabled: false,
  showBackButton: true,
  showNextButton: true,
  showResultTile: true,
  validationHint: '',
  showValidationHint: false,
})

const emit = defineEmits<{
  back: []
  next: []
}>()

const typeResult = inject<Ref<TypeResult | null>>('typeResult', undefined as any)

const tabs = ['Classification', 'Context', 'Summary'] as const
</script>

<template>
  <div class="phase-card-wrapper">
    <!-- Result tile — classification + channel tags (shown when typeResult exists) -->
    <div
      v-if="showResultTile && typeResult"
      class="phase-card__result-tile"
    >
      <span class="phase-card__result-tag phase-card__result-tag--teal">
        {{ typeResult.classification }}
      </span>
      <template v-if="typeResult.channels && typeResult.channels.length > 0">
        <span
          v-for="ch in typeResult.channels"
          :key="ch"
          class="phase-card__result-tag"
        >
          {{ ch }}
        </span>
      </template>
    </div>

    <!-- Card -->
    <div class="phase-card">
      <!-- Step tabs -->
      <div class="phase-card__tabs">
        <span
          v-for="tab in tabs"
          :key="tab"
          class="phase-card__tab"
          :class="{ 'phase-card__tab--active': tab === activeTab }"
        >
          {{ tab }}
        </span>
      </div>

      <!-- Phase-specific content -->
      <slot />

      <!-- Validation hint -->
      <Transition name="hint-slide">
        <div
          v-if="showValidationHint && validationHint"
          class="phase-card__hint"
          role="alert"
        >
          <span class="phase-card__hint-icon">!</span>
          {{ validationHint }}
        </div>
      </Transition>

      <!-- Navigation buttons -->
      <div v-if="showBackButton || showNextButton" class="phase-card__nav">
        <scale-button
          v-if="showBackButton"
          variant="secondary"
          size="small"
          :disabled="backDisabled"
          @click="emit('back')"
        >
          {{ backLabel }}
        </scale-button>
        <scale-button
          v-if="showNextButton"
          size="small"
          :disabled="nextDisabled"
          @click="emit('next')"
        >
          {{ nextLabel }}
        </scale-button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.phase-card-wrapper {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

/* ── Result Tile (Figma 63:2490) ── */
.phase-card__result-tile {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
  padding: 12px 24px;
  background: #fbfbfb;
  border: 1px solid #dfdfe1;
  border-radius: 8px;
}

.phase-card__result-tag {
  display: inline-flex;
  align-items: center;
  padding: 2px 4px;
  background: #dfdfe1;
  color: #000;
  border-radius: 4px;
  font-family: var(--telekom-typography-font-family-sans, 'TeleNeo', sans-serif);
  font-size: 12px;
  font-weight: 650;
  line-height: 16px;
  white-space: nowrap;
}

.phase-card__result-tag--teal {
  background: #d8f1ec;
  color: #177364;
}

/* ── Card ── */
.phase-card {
  background: var(--telekom-color-background-surface, #fff);
  border: 1px solid #dfdfe1;
  border-radius: 8px;
  padding: 24px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

/* ── Step Tabs ── */
.phase-card__tabs {
  display: flex;
  gap: 6px;
}

.phase-card__tab {
  display: inline-flex;
  align-items: center;
  padding: 3px 8px;
  border-radius: 4px;
  font-size: 14px;
  font-weight: 655;
  line-height: 17.5px;
  letter-spacing: -0.14px;
  background: #dfdfe1;
  color: rgba(0, 0, 0, 0.4);
}

.phase-card__tab--active {
  background: #d2eff4;
  color: #00738a;
}

/* ── Validation Hint ── */
.phase-card__hint {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 16px;
  background: rgba(232, 32, 16, 0.06);
  border: 1px solid rgba(232, 32, 16, 0.2);
  border-radius: 8px;
  font-size: 14px;
  font-weight: 500;
  color: var(--telekom-color-functional-danger-standard, #e82010);
}

.phase-card__hint-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: var(--telekom-color-functional-danger-standard, #e82010);
  color: #fff;
  font-size: 12px;
  font-weight: 700;
  flex-shrink: 0;
}

/* ── Navigation Buttons ── */
.phase-card__nav {
  display: flex;
  justify-content: center;
  gap: 12px;
  margin-top: 8px;
}

/* ── Hint Transition ── */
.hint-slide-enter-active,
.hint-slide-leave-active {
  transition: all 0.2s ease;
  overflow: hidden;
}

.hint-slide-enter-from,
.hint-slide-leave-to {
  opacity: 0;
  max-height: 0;
  margin-top: 0;
  padding-top: 0;
  padding-bottom: 0;
}

.hint-slide-enter-to,
.hint-slide-leave-from {
  opacity: 1;
  max-height: 60px;
}
</style>
