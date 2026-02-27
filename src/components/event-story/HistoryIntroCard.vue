<script setup lang="ts">
import { ref } from 'vue'
import { useI18n } from '@/i18n'

const { t } = useI18n()
const expanded = ref(false)

function toggle() {
  expanded.value = !expanded.value
}

const steps = [
  { num: '1.', titleKey: 'story.intro.step1.title', descKey: 'story.intro.step1.desc' },
  { num: '2.', titleKey: 'story.intro.step2.title', descKey: 'story.intro.step2.desc' },
  { num: '3.', titleKey: 'story.intro.step3.title', descKey: 'story.intro.step3.desc' },
] as const
</script>

<template>
  <div class="intro-card">
    <!-- Intro section: title + description -->
    <div class="intro-card__intro">
      <h3 class="intro-card__title">{{ t('story.intro.title') }}</h3>
      <p class="intro-card__description">{{ t('story.intro.description') }}</p>
    </div>

    <!-- Instruction section: collapsible "How it works" -->
    <div class="intro-card__instruction">
      <button
        class="intro-card__toggle"
        :aria-expanded="expanded"
        @click="toggle"
      >
        <span class="intro-card__toggle-label">{{ t('story.intro.howItWorks') }}</span>
        <svg
          class="intro-card__chevron"
          :class="{ 'intro-card__chevron--up': expanded }"
          width="16"
          height="16"
          viewBox="0 0 16 16"
          fill="none"
          aria-hidden="true"
        >
          <path d="M4 6l4 4 4-4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" />
        </svg>
      </button>

      <div v-if="expanded" class="intro-card__list">
        <div v-for="step in steps" :key="step.num" class="intro-card__step">
          <span class="intro-card__step-num">{{ step.num }}</span>
          <span class="intro-card__step-text">
            <strong>{{ t(step.titleKey) }}</strong> – {{ t(step.descKey) }}
          </span>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.intro-card {
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 24px;
  background: var(--telekom-color-background-surface, #fff);
  border: 1px solid var(--telekom-color-ui-border-standard, hsla(0, 0%, 0%, 0.44));
  border-radius: 4px;
  box-sizing: border-box;
}

.intro-card__intro {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.intro-card__title {
  font-family: 'TeleNeo', sans-serif;
  font-size: 20px;
  font-weight: 800;
  line-height: 28px;
  color: var(--telekom-color-text-and-icon-standard, #000000);
  margin: 0;
}

.intro-card__description {
  font-family: 'TeleNeo', sans-serif;
  font-size: 16px;
  font-weight: 400;
  line-height: 22.4px;
  color: var(--telekom-color-text-and-icon-standard, #000000);
  margin: 0;
}

.intro-card__instruction {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 12px;
  background: var(--telekom-color-background-canvas-subtle, #fbfbfb);
  border: 1px solid var(--telekom-color-ui-faint, #dfdfe1);
  border-radius: 4px;
}

.intro-card__toggle {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  padding: 0;
  margin: 0;
  background: none;
  border: none;
  cursor: pointer;
  color: var(--telekom-color-text-and-icon-standard, #000000);
}

.intro-card__toggle-label {
  font-family: 'TeleNeo', sans-serif;
  font-size: 16px;
  font-weight: 700;
  line-height: 22.4px;
}

.intro-card__chevron {
  flex-shrink: 0;
  transition: transform 0.2s ease;
}

.intro-card__chevron--up {
  transform: rotate(180deg);
}

.intro-card__list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.intro-card__step {
  display: flex;
  gap: 10px;
  align-items: flex-start;
}

.intro-card__step-num {
  font-family: 'TeleNeo', sans-serif;
  font-size: 16px;
  font-weight: 700;
  line-height: 22.4px;
  color: var(--telekom-color-text-and-icon-standard, #000000);
  flex-shrink: 0;
}

.intro-card__step-text {
  font-family: 'TeleNeo', sans-serif;
  font-size: 16px;
  font-weight: 400;
  line-height: 22.4px;
  color: var(--telekom-color-text-and-icon-standard, #000000);
}

.intro-card__step-text strong {
  font-weight: 700;
}
</style>
