<script setup lang="ts">
import { computed } from 'vue'
import type { StoryChecklistItem } from '@/data/story-questions'
import AppIcon from '@/components/shared/AppIcon.vue'
import { useI18n } from '@/i18n'

const { t } = useI18n()

const props = defineProps<{
  item: StoryChecklistItem
}>()

const VALUE_LABELS = computed<Record<string, Record<string, string>>>(() => ({
  event_trigger: {
    user_interaction: t('sq.val.eventTrigger.userInteraction'),
    system_runtime: t('sq.val.eventTrigger.systemRuntime'),
    scheduled_system: t('sq.val.eventTrigger.scheduledSystem'),
    scheduled_user: t('sq.val.eventTrigger.scheduledUser'),
  },
  user_impact: { blocked: t('sq.val.userImpact.blocked'), degraded: t('sq.val.userImpact.degraded'), no_impact: t('sq.val.userImpact.noImpact') },
  impact_scope: { widespread: t('sq.val.impactScope.widespread'), limited: t('sq.val.impactScope.limited'), individual: t('sq.val.impactScope.individual') },
  timing: { now: t('sq.val.timing.now'), scheduled: t('sq.val.timing.scheduled') },
  action_required: { mandatory: t('sq.val.actionRequired.mandatory'), no: t('sq.val.actionRequired.no') },
  security: { yes: t('sq.val.security.yes'), no: t('sq.val.security.no') },
  who_affected: { all_users: t('sq.val.whoAffected.allUsers'), specific_group: t('sq.val.whoAffected.specificGroup'), single_user: t('sq.val.whoAffected.singleUser') },
}))

const status = computed<'empty' | 'unverified' | 'verified'>(() => {
  if (!props.item.filled) return 'empty'
  if (!props.item.verified) return 'unverified'
  return 'verified'
})

const displayValue = computed(() => {
  const item = props.item
  if (item.description) return item.description
  const labels = VALUE_LABELS.value[item.id]
  if (labels && typeof item.value === 'string' && labels[item.value]) return labels[item.value]
  return Array.isArray(item.value) ? item.value.join(', ') : (item.value as string || '')
})
</script>

<template>
  <div
    :class="[
      'checklist-item',
      `checklist-item--${status}`,
    ]"
    :aria-label="item.label + ' — ' + t(`story.status.${status}`)"
  >
    <!-- Empty state: question-mark icon + label + "No Information" -->
    <template v-if="status === 'empty'">
      <div class="checklist-item__top">
        <AppIcon name="question-box" class="checklist-item__icon" />
        <span class="checklist-item__question">{{ item.label }}</span>
      </div>
      <div class="checklist-item__info checklist-item__info--empty">{{ t('story.noInformation') }}</div>
    </template>

    <!-- Unverified state: multi-row with orange search icon -->
    <template v-else-if="status === 'unverified'">
      <div class="checklist-item__top">
        <AppIcon name="search" class="checklist-item__icon" />
        <span class="checklist-item__question">{{ item.label }}</span>
      </div>
      <div v-if="displayValue" class="checklist-item__info">
        {{ displayValue }}
      </div>
      <div v-if="item.evidence" class="checklist-item__source">
        "{{ item.evidence }}"
      </div>
    </template>

    <!-- Verified state: multi-row with green checkmark icon -->
    <template v-else>
      <div class="checklist-item__top">
        <AppIcon name="check" class="checklist-item__icon" />
        <span class="checklist-item__question">{{ item.label }}</span>
      </div>
      <div v-if="displayValue" class="checklist-item__info">
        {{ displayValue }}
      </div>
      <div v-if="item.evidence" class="checklist-item__source">
        "{{ item.evidence }}"
      </div>
    </template>
  </div>
</template>

<style scoped>
.checklist-item {
  border-radius: 8px;
  font-family: 'TeleNeo', sans-serif;
}

/* Empty variant */
.checklist-item--empty {
  display: flex;
  flex-direction: column;
  gap: 0;
  padding: 8px;
  border: 1px solid var(--telekom-color-ui-faint, #dfdfe1);
  background: transparent;
}

/* Unverified variant */
.checklist-item--unverified {
  display: flex;
  flex-direction: column;
  gap: 0;
  padding: 8px;
  border: 1px solid var(--telekom-color-functional-warning-standard, #f97012);
  background: var(--telekom-color-background-canvas-subtle, #fbfbfb);
}

/* Verified variant */
.checklist-item--verified {
  display: flex;
  flex-direction: column;
  gap: 0;
  padding: 8px;
  border: 1px solid var(--telekom-color-functional-success-standard, #00b367);
  background: var(--telekom-color-background-canvas-subtle, #fbfbfb);
}

.checklist-item__icon {
  flex-shrink: 0;
}

/* Icon colors per state — drives SVG currentColor */
.checklist-item--empty .checklist-item__icon {
  color: var(--telekom-color-text-and-icon-standard, #000000);
}

.checklist-item--unverified .checklist-item__icon {
  color: var(--telekom-color-functional-warning-standard, #f97012);
}

.checklist-item--verified .checklist-item__icon {
  color: var(--telekom-color-functional-success-standard, #00b367);
}

.checklist-item__question {
  font-size: 12px;
  font-weight: 700;
  color: var(--telekom-color-text-and-icon-standard, #000000);
  line-height: 16.2px;
}

.checklist-item__top {
  display: flex;
  align-items: center;
  gap: 8px;
}

.checklist-item__info {
  font-size: 12px;
  font-weight: 500;
  color: var(--telekom-color-text-and-icon-standard, #000000);
  line-height: 16.2px;
  padding-left: 24px;
  margin-top: 0;
}

.checklist-item__info--empty {
  font-style: italic;
  color: var(--telekom-color-ui-strong, #747478);
}

.checklist-item__source {
  font-size: 12px;
  font-weight: 500;
  font-style: italic;
  color: var(--telekom-color-ui-strong, #747478);
  line-height: 16.2px;
  padding-left: 24px;
  margin-top: 0;
}
</style>
