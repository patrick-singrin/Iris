<script setup lang="ts">
defineProps<{
  modelValue: 'de' | 'en'
}>()

const emit = defineEmits<{
  'update:modelValue': [value: 'de' | 'en']
}>()
</script>

<template>
  <div class="lang-toggle" role="radiogroup" aria-label="Language">
    <button
      class="lang-toggle__btn"
      :class="{ 'lang-toggle__btn--active': modelValue === 'de' }"
      role="radio"
      :aria-checked="modelValue === 'de'"
      @click="emit('update:modelValue', 'de')"
    >
      DE
    </button>
    <button
      class="lang-toggle__btn"
      :class="{ 'lang-toggle__btn--active': modelValue === 'en' }"
      role="radio"
      :aria-checked="modelValue === 'en'"
      @click="emit('update:modelValue', 'en')"
    >
      EN
    </button>
  </div>
</template>

<style scoped>
.lang-toggle {
  display: inline-flex;
  border: 1px solid var(--telekom-color-ui-border-standard, #ccc);
  border-radius: 6px;
  overflow: hidden;
}

.lang-toggle__btn {
  background: var(--telekom-color-background-surface, #fff);
  border: none;
  padding: 6px 14px;
  font-family: 'TeleNeo', sans-serif;
  font-size: 13px;
  font-weight: 700;
  color: var(--telekom-color-text-and-icon-additional, #6c6c6f);
  cursor: pointer;
  transition: background 0.15s, color 0.15s;
}

.lang-toggle__btn:not(:last-child) {
  border-right: 1px solid var(--telekom-color-ui-border-standard, #ccc);
}

.lang-toggle__btn:hover:not(.lang-toggle__btn--active) {
  background: var(--telekom-color-background-surface-subtle, #efeff0);
}

.lang-toggle__btn--active {
  background: var(--telekom-color-primary-standard, #e20074);
  color: #fff;
}
</style>
