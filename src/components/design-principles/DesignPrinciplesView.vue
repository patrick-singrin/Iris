<script setup lang="ts">
</script>

<template>
  <div class="design-principles">
    <div class="design-principles__placeholder">
      <p class="design-principles__title">Design Principles</p>
      <p class="design-principles__text">
        Content design principles and guidelines will be documented here.
      </p>
    </div>
  </div>
</template>

<style scoped>
.design-principles {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.design-principles__placeholder {
  background: var(--telekom-color-background-surface, #fff);
  border: 1px solid var(--telekom-color-ui-border-standard, #ccc);
  border-radius: var(--telekom-radius-standard, 8px);
  padding: 60px 40px;
  text-align: center;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--telekom-spacing-composition-space-04, 8px);
}

.design-principles__title {
  margin: 0;
  font: var(--telekom-text-style-heading-5);
  color: var(--telekom-color-text-and-icon-standard, #191919);
}

.design-principles__text {
  margin: 0;
  font: var(--telekom-text-style-body);
  color: var(--telekom-color-text-and-icon-additional, #6c6c6c);
}
</style>
