<script setup lang="ts">
import type { IrisEvent } from '@/types/event'

defineProps<{
  event: IrisEvent
}>()

const impactLabels: Record<string, string> = {
  blocked: 'Blocked',
  degraded: 'Degraded',
  no_impact: 'No impact',
}
</script>

<template>
  <div class="event-card">
    <div class="event-card__header">
      <div class="event-card__id">{{ event.id }}</div>
      <div class="event-card__tags">
        <scale-tag color="teal" size="small">{{ event.classification.type }}</scale-tag>
        <scale-tag v-if="event.classification.severity" color="cyan" size="small">
          {{ event.classification.severity }}
        </scale-tag>
      </div>
      <div class="event-card__date">
        {{ new Date(event.createdAt).toLocaleDateString() }}
        {{ new Date(event.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }}
      </div>
    </div>

    <div class="event-card__body">
      <p class="event-card__description">
        {{ event.description.whatHappened || 'No description provided' }}
      </p>
      <div class="event-card__meta">
        <span v-if="event.classification.channels.length > 0">
          <strong>Channels:</strong> {{ event.classification.channels.join(', ') }}
        </span>
        <span v-if="event.description.userImpact">
          <strong>User impact:</strong> {{ impactLabels[event.description.userImpact] || 'Unknown' }}
        </span>
      </div>
    </div>

    <!-- Generated text preview -->
    <details v-if="event.generatedText" class="event-card__text-preview">
      <summary>Generated UI Text</summary>
      <div class="event-card__text-content">
        <div
          v-for="(fields, componentId) in event.generatedText"
          :key="componentId"
          class="event-card__component"
        >
          <h4>{{ componentId }}</h4>
          <table>
            <thead>
              <tr>
                <th>Field</th>
                <th>English</th>
                <th>German</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(text, fieldId) in fields" :key="fieldId">
                <td>{{ fieldId }}</td>
                <td>{{ text.en }}</td>
                <td>{{ text.de }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </details>
  </div>
</template>

<style scoped>
.event-card {
  background: var(--telekom-color-background-surface, #fff);
  border: 1px solid var(--telekom-color-ui-border-standard, #ccc);
  border-radius: 8px;
  padding: 20px;
}

.event-card__header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 12px;
}

.event-card__id {
  font-weight: 700;
  font-size: 16px;
}

.event-card__tags {
  display: flex;
  gap: 6px;
}

.event-card__date {
  margin-left: auto;
  font-size: 13px;
  color: var(--telekom-color-text-and-icon-additional, #6c6c6c);
}

.event-card__description {
  margin: 0 0 8px;
  font-size: 14px;
}

.event-card__meta {
  display: flex;
  gap: 20px;
  font-size: 13px;
  color: var(--telekom-color-text-and-icon-additional, #6c6c6c);
}

.event-card__text-preview {
  margin-top: 12px;
  border-top: 1px solid var(--telekom-color-ui-border-standard, #ccc);
  padding-top: 12px;
}

.event-card__text-preview summary {
  cursor: pointer;
  font-weight: 600;
  font-size: 14px;
}

.event-card__text-content {
  margin-top: 12px;
}

.event-card__component {
  margin-bottom: 12px;
}

.event-card__component h4 {
  margin: 0 0 8px;
  text-transform: capitalize;
}

.event-card__component table {
  width: 100%;
  border-collapse: collapse;
  font-size: 13px;
}

.event-card__component th,
.event-card__component td {
  border: 1px solid var(--telekom-color-ui-border-standard, #ccc);
  padding: 6px 10px;
  text-align: left;
}

.event-card__component th {
  background: var(--telekom-color-background-canvas, #f4f4f4);
  font-weight: 600;
}
</style>
