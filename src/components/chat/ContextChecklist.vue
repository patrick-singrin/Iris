<script setup lang="ts">
import { computed } from 'vue'
import type { ChecklistItem, ChecklistCategory } from '@/types/chat'
import type { LanguagePreference } from '@/stores/chatStore'

const props = defineProps<{
  items: ChecklistItem[]
  progress: { checked: number; total: number }
  languagePreference: LanguagePreference
}>()

const emit = defineEmits<{
  'update:languagePreference': [value: LanguagePreference]
}>()

const categories: { key: ChecklistCategory; label: string }[] = [
  { key: 'content-type', label: 'Content Type' },
  { key: 'context', label: 'Context' },
  { key: 'preferences', label: 'Preferences' },
]

const languageOptions: { value: LanguagePreference; label: string }[] = [
  { value: 'en', label: 'English' },
  { value: 'de', label: 'Deutsch' },
  { value: 'both', label: 'Both' },
]

const progressPercent = computed(() =>
  props.progress.total > 0
    ? Math.round((props.progress.checked / props.progress.total) * 100)
    : 0
)

function itemsByCategory(category: ChecklistCategory): ChecklistItem[] {
  return props.items.filter(i => i.category === category)
}

function selectLanguage(lang: LanguagePreference) {
  emit('update:languagePreference', lang)
}
</script>

<template>
  <div class="context-checklist">
    <div class="context-checklist__card">
      <h3 class="context-checklist__title">Context Guide</h3>
      <p class="context-checklist__subtitle">
        Mention these details for better results
      </p>

      <!-- Progress -->
      <div class="context-checklist__progress">
        <div class="context-checklist__progress-text">
          <span class="context-checklist__progress-count">{{ progress.checked }}</span>
          / {{ progress.total }} provided
        </div>
        <div class="context-checklist__progress-bar">
          <div
            class="context-checklist__progress-fill"
            :style="{ width: `${progressPercent}%` }"
          />
        </div>
      </div>

      <!-- Category sections -->
      <div
        v-for="cat in categories"
        :key="cat.key"
        class="context-checklist__category"
      >
        <h4 class="context-checklist__category-label">{{ cat.label }}</h4>
        <ul class="context-checklist__list">
          <li
            v-for="item in itemsByCategory(cat.key)"
            :key="item.id"
            class="context-checklist__item"
            :class="{ 'context-checklist__item--detected': item.detected }"
          >
            <div class="context-checklist__check" aria-hidden="true">
              <svg
                v-if="item.detected"
                width="18"
                height="18"
                viewBox="0 0 18 18"
                fill="none"
              >
                <circle cx="9" cy="9" r="9" fill="#1a8a3f" />
                <path
                  d="M5.5 9.5L7.5 11.5L12.5 6.5"
                  stroke="white"
                  stroke-width="2"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                />
              </svg>
              <svg
                v-else
                width="18"
                height="18"
                viewBox="0 0 18 18"
                fill="none"
              >
                <circle cx="9" cy="9" r="8" stroke="#ccc" stroke-width="2" />
              </svg>
            </div>
            <div class="context-checklist__item-text">
              <span class="context-checklist__item-label">{{ item.label }}</span>
              <span class="context-checklist__item-desc">{{ item.description }}</span>
            </div>
          </li>
        </ul>
      </div>

      <!-- Language selector -->
      <div class="context-checklist__language">
        <h4 class="context-checklist__category-label">Language</h4>
        <div class="context-checklist__lang-buttons" role="radiogroup" aria-label="Language preference">
          <button
            v-for="opt in languageOptions"
            :key="opt.value"
            class="context-checklist__lang-btn"
            :class="{ 'context-checklist__lang-btn--active': languagePreference === opt.value }"
            role="radio"
            :aria-checked="languagePreference === opt.value"
            @click="selectLanguage(opt.value)"
          >
            {{ opt.label }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.context-checklist {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 0;
}

.context-checklist__card {
  background: var(--telekom-color-background-surface, #fff);
  border-radius: 8px;
  padding: 24px;
  flex: 1;
  display: flex;
  flex-direction: column;
}

.context-checklist__title {
  font-size: 18px;
  font-weight: 700;
  color: var(--telekom-color-text-and-icon-standard, #191919);
  margin: 0 0 4px;
}

.context-checklist__subtitle {
  font-size: 13px;
  color: var(--telekom-color-text-and-icon-additional, #6c6c6c);
  margin: 0 0 20px;
}

/* Progress */
.context-checklist__progress {
  margin-bottom: 24px;
}

.context-checklist__progress-text {
  font-size: 13px;
  color: var(--telekom-color-text-and-icon-additional, #6c6c6c);
  margin-bottom: 6px;
}

.context-checklist__progress-count {
  font-weight: 700;
  color: var(--telekom-color-text-and-icon-standard, #191919);
}

.context-checklist__progress-bar {
  height: 4px;
  background: #e0e0e0;
  border-radius: 2px;
  overflow: hidden;
}

.context-checklist__progress-fill {
  height: 100%;
  background: var(--telekom-color-primary-standard, #e20074);
  border-radius: 2px;
  transition: width 0.3s ease;
}

/* Categories */
.context-checklist__category {
  margin-bottom: 20px;
}

.context-checklist__category-label {
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  color: var(--telekom-color-text-and-icon-additional, #6c6c6c);
  margin: 0 0 8px;
}

/* List */
.context-checklist__list {
  list-style: none;
  margin: 0;
  padding: 0;
}

.context-checklist__item {
  display: flex;
  gap: 10px;
  padding: 8px 0;
  align-items: flex-start;
}

.context-checklist__check {
  flex-shrink: 0;
  margin-top: 1px;
}

.context-checklist__item-text {
  display: flex;
  flex-direction: column;
  gap: 1px;
}

.context-checklist__item-label {
  font-size: 13px;
  font-weight: 400;
  color: var(--telekom-color-text-and-icon-standard, #191919);
}

.context-checklist__item--detected .context-checklist__item-label {
  font-weight: 600;
}

.context-checklist__item-desc {
  font-size: 12px;
  color: var(--telekom-color-text-and-icon-additional, #6c6c6c);
  line-height: 1.3;
}

/* Language selector */
.context-checklist__language {
  margin-top: auto;
  padding-top: 20px;
  border-top: 1px solid var(--telekom-color-ui-border-standard, #ccc);
}

.context-checklist__lang-buttons {
  display: flex;
  border-radius: 6px;
  overflow: hidden;
  border: 1px solid var(--telekom-color-ui-border-standard, #ccc);
}

.context-checklist__lang-btn {
  flex: 1;
  padding: 8px 0;
  font-size: 13px;
  font-weight: 500;
  font-family: inherit;
  cursor: pointer;
  border: none;
  background: var(--telekom-color-background-surface, #fff);
  color: var(--telekom-color-text-and-icon-standard, #191919);
  transition: background 0.15s, color 0.15s;
}

.context-checklist__lang-btn + .context-checklist__lang-btn {
  border-left: 1px solid var(--telekom-color-ui-border-standard, #ccc);
}

.context-checklist__lang-btn:hover:not(.context-checklist__lang-btn--active) {
  background: rgba(226, 0, 116, 0.04);
}

.context-checklist__lang-btn--active {
  background: var(--telekom-color-primary-standard, #e20074);
  color: #fff;
  font-weight: 600;
}
</style>
