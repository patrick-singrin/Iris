<script setup lang="ts">
import { ref, watch, toRef } from 'vue'
import type { QuestionNode } from '@/types/decisionTree'

const props = defineProps<{
  node: QuestionNode
  showBack: boolean
  showCancel: boolean
  stepTags?: { label: string; active: boolean }[]
}>()

const emit = defineEmits<{
  select: [optionIndex: number]
  back: []
  cancel: []
}>()

const selectedIndex = ref<number | null>(null)

watch(toRef(props, 'node'), () => {
  selectedIndex.value = null
})

function onRadioChange(index: number) {
  selectedIndex.value = index
}
</script>

<template>
  <div class="classification-question">
    <!-- Step tags row -->
    <div v-if="stepTags" class="classification-question__tags">
      <span
        v-for="(tag, i) in stepTags"
        :key="i"
        class="classification-tag"
        :class="{ 'classification-tag--active': tag.active }"
      >
        {{ tag.label }}
      </span>
    </div>

    <!-- Question text -->
    <div class="classification-question__text">
      <h3 class="classification-question__heading">{{ node.text }}</h3>
      <p v-if="node.description" class="classification-question__desc">{{ node.description }}</p>
    </div>

    <!-- Radio-tile options using scale-radio-button -->
    <div class="classification-question__options">
      <label
        v-for="(option, index) in node.options"
        :key="index"
        class="radio-tile"
        :class="{ 'radio-tile--selected': selectedIndex === index }"
      >
        <scale-radio-button
          :name="node.id"
          :value="String(index)"
          :label="option.label"
          :checked="selectedIndex === index"
          :input-id="`radio-${node.id}-${index}`"
          @scale-change="onRadioChange(index)"
        />
        <p v-if="option.description" class="radio-tile__subline">
          {{ option.description }}
        </p>
      </label>
    </div>

    <!-- CTA buttons -->
    <div class="classification-question__cta">
      <scale-button
        v-if="showCancel"
        variant="secondary"
        @click="emit('cancel')"
      >
        Cancel
      </scale-button>
      <scale-button
        v-else-if="showBack"
        variant="secondary"
        @click="emit('back')"
      >
        Go back
      </scale-button>
      <scale-button
        :disabled="selectedIndex === null"
        @click="selectedIndex !== null && emit('select', selectedIndex)"
      >
        Continue
      </scale-button>
    </div>
  </div>
</template>

<style scoped>
.classification-question {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

/* ── Step Tags ── */
.classification-question__tags {
  display: flex;
  gap: 6px;
}

.classification-tag {
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

.classification-tag--active {
  background: #d2eff4;
  color: #00738a;
}

/* ── Question Text ── */
.classification-question__text {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.classification-question__heading {
  margin: 0;
  font-family: 'TeleNeo', sans-serif;
  font-weight: 800;
  font-size: 24px;
  line-height: 1.35;
  color: #000;
}

.classification-question__desc {
  margin: 0;
  font-family: 'TeleNeo', sans-serif;
  font-weight: 400;
  font-size: 16px;
  line-height: 1.4;
  color: #000;
}

/* ── Radio Tiles ── */
.classification-question__options {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.radio-tile {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 16px;
  background: var(--telekom-color-background-surface, #fff);
  border: 1px solid #dfdfe1;
  border-radius: 8px;
  cursor: pointer;
  transition: border-color 0.15s ease, box-shadow 0.15s ease;
}

.radio-tile:hover {
  border-color: var(--telekom-color-primary-standard, #e20074);
}

.radio-tile--selected {
  border-color: var(--telekom-color-primary-standard, #e20074);
  box-shadow: 0 0 0 1px var(--telekom-color-primary-standard, #e20074);
}

.radio-tile__subline {
  margin: 0;
  padding-left: 28px; /* 20px radio circle + 8px gap — aligns with label text */
  font-family: 'TeleNeo', sans-serif;
  font-weight: 400;
  font-size: 14px;
  line-height: 1.4;
  color: #747478;
}

/* ── CTA Buttons ── */
.classification-question__cta {
  display: flex;
  justify-content: flex-end;
  gap: 16px;
  margin-top: 8px; /* Figma: 32px gap from options (24px container gap + 8px) */
}
</style>
