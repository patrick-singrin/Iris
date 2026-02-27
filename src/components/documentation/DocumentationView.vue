<script setup lang="ts">
import { computed, ref } from 'vue'
import { useEventStore } from '@/stores/eventStore'
import { useAppStore } from '@/stores/appStore'
import { downloadMarkdown } from '@/services/markdownExport'
import { useI18n } from '@/i18n'

const { events, refreshEvents, deleteEvent } = useEventStore()
const { viewEvent, setView } = useAppStore()
const { t } = useI18n()
refreshEvents()

// Delete confirmation dialog
const deleteDialogOpen = ref(false)
const eventToDelete = ref<string | null>(null)

function requestDelete(eventId: string) {
  eventToDelete.value = eventId
  deleteDialogOpen.value = true
}

function confirmDelete() {
  if (eventToDelete.value) {
    deleteEvent(eventToDelete.value)
  }
  deleteDialogOpen.value = false
  eventToDelete.value = null
}

function cancelDelete() {
  deleteDialogOpen.value = false
  eventToDelete.value = null
}

const severityColorMap: Record<string, string> = {
  Critical: 'red',
  High: 'orange',
  Medium: 'yellow',
  Low: 'cyan',
}

const impactLabelKeyMap: Record<string, 'impact.blocked' | 'impact.degraded' | 'impact.noImpact'> = {
  blocked: 'impact.blocked',
  degraded: 'impact.degraded',
  no_impact: 'impact.noImpact',
}

const impactColorMap: Record<string, string> = {
  blocked: 'red',
  degraded: 'orange',
  no_impact: 'standard',
}

const typeColorMap: Record<string, string> = {
  Notification: 'teal',
  Information: 'cyan',
}

// ── Sorting ──
type SortColumn = 'id' | 'type' | 'severity' | 'impact' | 'description'
type SortDirection = 'ascending' | 'descending' | 'none'

const sortColumn = ref<SortColumn | null>(null)
const sortDirection = ref<SortDirection>('none')

const severityOrder: Record<string, number> = { Critical: 4, High: 3, Medium: 2, Low: 1 }
const impactOrder: Record<string, number> = { blocked: 3, degraded: 2, no_impact: 1 }

function getSortValue(event: (typeof events.value)[number], col: SortColumn): string | number {
  switch (col) {
    case 'id': return event.id
    case 'type': return event.classification.type
    case 'severity': return severityOrder[titleCase(event.classification.severity || '')] ?? 0
    case 'impact': return impactOrder[event.description.userImpact] ?? 0
    case 'description': return event.description.whatHappened || ''
  }
}

function handleSort(col: SortColumn) {
  if (sortColumn.value === col) {
    // Cycle: ascending → descending → none
    if (sortDirection.value === 'ascending') sortDirection.value = 'descending'
    else if (sortDirection.value === 'descending') { sortDirection.value = 'none'; sortColumn.value = null }
    else sortDirection.value = 'ascending'
  } else {
    sortColumn.value = col
    sortDirection.value = 'ascending'
  }
  currentPage.value = 1
}

function ariaSort(col: SortColumn): SortDirection {
  return sortColumn.value === col ? sortDirection.value : 'none'
}

const pageSize = 10
const currentPage = ref(1)

const sortedEvents = computed(() => {
  const list = [...events.value].reverse() // newest first by default
  if (!sortColumn.value || sortDirection.value === 'none') return list
  const col = sortColumn.value
  const dir = sortDirection.value === 'ascending' ? 1 : -1
  return list.sort((a, b) => {
    const va = getSortValue(a, col)
    const vb = getSortValue(b, col)
    if (typeof va === 'number' && typeof vb === 'number') return (va - vb) * dir
    return String(va).localeCompare(String(vb)) * dir
  })
})
const totalElements = computed(() => sortedEvents.value.length)

const paginatedEvents = computed(() => {
  const start = (currentPage.value - 1) * pageSize
  return sortedEvents.value.slice(start, start + pageSize)
})

function handlePagination(e: CustomEvent) {
  if (e.detail?.currentPage) {
    currentPage.value = e.detail.currentPage
  }
}

function titleCase(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase()
}

function getTypeColor(type: string): string {
  return typeColorMap[type] || typeColorMap[titleCase(type)] || 'teal'
}

function getSeverityColor(severity: string | null): string {
  if (!severity) return 'standard'
  return severityColorMap[severity] || severityColorMap[titleCase(severity)] || 'standard'
}

function getSeverityLabel(severity: string): string {
  return titleCase(severity)
}

function getImpactLabel(impact: string): string {
  const key = impactLabelKeyMap[impact]
  return key ? t(key) : impact
}

function getImpactColor(impact: string): string {
  return impactColorMap[impact] || 'standard'
}

function getChannelShortName(channel: string): string {
  return channel.replace(/\s*\(.*\)$/, '').trim()
}
</script>

<template>
  <div class="documentation">
    <div class="documentation__top">
      <div class="documentation__text">
        <h1 class="documentation__heading">{{ t('events.title') }}</h1>
        <p class="documentation__description">{{ t('events.description') }}</p>
      </div>
      <scale-button
        variant="primary"
        @click="setView('event-story')"
      >
        <scale-icon-action-add size="20" />
        {{ t('events.newEvent') }}
      </scale-button>
    </div>

    <scale-table show-sort>
      <table>
        <colgroup>
          <col style="width: 100px" />
          <col />
          <col />
          <col />
          <col style="width: 210px" />
          <col style="width: 100%" />
          <col style="width: 110px" />
        </colgroup>
        <thead>
          <tr>
            <th :aria-sort="ariaSort('id')" @click="handleSort('id')">{{ t('table.eventId') }}</th>
            <th :aria-sort="ariaSort('type')" @click="handleSort('type')">{{ t('table.type') }}</th>
            <th :aria-sort="ariaSort('severity')" @click="handleSort('severity')">{{ t('table.severity') }}</th>
            <th :aria-sort="ariaSort('impact')" @click="handleSort('impact')">{{ t('table.impact') }}</th>
            <th aria-disabled="true">{{ t('table.channels') }}</th>
            <th :aria-sort="ariaSort('description')" @click="handleSort('description')">{{ t('table.description') }}</th>
            <th aria-disabled="true">{{ t('table.actions') }}</th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="paginatedEvents.length === 0">
            <td colspan="7" class="events-table__empty">{{ t('events.empty') }}</td>
          </tr>
          <tr v-for="event in paginatedEvents" :key="event.id">
            <td>{{ event.id }}</td>
            <td>
              <scale-tag
                :color="getTypeColor(event.classification.type)"
              >{{ event.classification.type }}</scale-tag>
            </td>
            <td>
              <scale-tag
                v-if="event.classification.severity"
                :color="getSeverityColor(event.classification.severity)"
              >{{ getSeverityLabel(event.classification.severity) }}</scale-tag>
              <span v-else class="events-table__na">–</span>
            </td>
            <td>
              <scale-tag
                v-if="event.description.userImpact && event.description.userImpact !== 'no_impact'"
                :color="getImpactColor(event.description.userImpact)"
              >{{ getImpactLabel(event.description.userImpact) }}</scale-tag>
              <span
                v-else-if="event.description.userImpact === 'no_impact'"
                class="events-table__no-impact"
              >{{ getImpactLabel(event.description.userImpact) }}</span>
              <span v-else class="events-table__na">–</span>
            </td>
            <td>
              <div
                class="events-table__tags"
                :title="event.classification.channels.map(getChannelShortName).join(', ')"
              >
                <scale-tag
                  v-for="channel in event.classification.channels"
                  :key="channel"
                  color="standard"
                >{{ getChannelShortName(channel) }}</scale-tag>
              </div>
            </td>
            <td>{{ event.description.whatHappened || '—' }}</td>
            <td>
              <div class="events-table__actions">
                <button
                  class="events-table__action-btn"
                  :title="'View details ' + event.id"
                  @click="viewEvent(event.id)"
                >
                  <scale-icon-alert-compliance size="16" />
                </button>
                <button
                  class="events-table__action-btn"
                  :title="'Export ' + event.id"
                  @click="downloadMarkdown(event)"
                >
                  <scale-icon-action-download size="16" />
                </button>
                <button
                  class="events-table__action-btn events-table__action-btn--danger"
                  :title="t('action.delete') + ' ' + event.id"
                  @click="requestDelete(event.id)"
                >
                  <scale-icon-action-remove size="16" />
                </button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </scale-table>

    <scale-pagination
      v-if="totalElements > 0"
      class="documentation__pagination"
      :page-size="pageSize"
      :start-element="(currentPage - 1) * pageSize"
      :total-elements="totalElements"
      @scale-pagination="handlePagination"
    ></scale-pagination>

    <!-- Delete confirmation dialog -->
    <scale-modal
      :opened="deleteDialogOpen"
      :heading="t('dialog.deleteTitle')"
      @scale-close="cancelDelete"
    >
      <p class="delete-dialog__message">
        {{ t('dialog.deleteMessage').replace('{id}', eventToDelete || '') }}
      </p>
      <div slot="action" class="delete-dialog__actions">
        <scale-button variant="secondary" @click="cancelDelete">
          {{ t('dialog.cancel') }}
        </scale-button>
        <scale-button variant="primary" @click="confirmDelete">
          {{ t('dialog.confirmDelete') }}
        </scale-button>
      </div>
    </scale-modal>
  </div>
</template>

<style scoped>
.documentation {
  background: #ffffff;
  margin: -32px -32px 0;
  padding: 32px;
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.documentation__top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
}

.documentation__text {
  display: flex;
  flex-direction: column;
  gap: 0;
}

.documentation__heading {
  font-size: 32px;
  font-weight: 800;
  line-height: 40px;
  color: #000000;
  margin: 0;
}

.documentation__description {
  font-size: 16px;
  font-weight: 400;
  line-height: 22.4px;
  color: #000000;
  margin: 0;
}

.documentation :deep(scale-table) {
  width: 100%;
}

.documentation :deep(table) {
  width: 100%;
  border-bottom: 1px solid #242426;
}

.documentation :deep(td:nth-child(6)),
.documentation :deep(th:nth-child(6)) {
  max-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.documentation :deep(td:nth-child(2)),
.documentation :deep(td:nth-child(3)),
.documentation :deep(td:nth-child(4)) {
  white-space: nowrap;
}

.events-table__tags {
  display: flex;
  flex-wrap: nowrap;
  gap: 4px;
  overflow: hidden;
}

.events-table__actions {
  display: flex;
  gap: 0;
}

.events-table__action-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  background: none;
  border: none;
  cursor: pointer;
  padding: 4px 8px;
  border-radius: 4px;
  color: var(--telekom-color-text-and-icon-standard, #191919);
}

.events-table__action-btn:hover {
  background: var(--telekom-color-ui-state-fill-hovered, #e8e8e8);
}

.events-table__action-btn--danger:hover {
  background: rgba(232, 32, 16, 0.08);
  color: var(--telekom-color-functional-danger-standard, #e82010);
}

.events-table__no-impact {
  font-family: 'TeleNeo', sans-serif;
  font-weight: 500;
  font-size: 12px;
  line-height: 16.2px;
  color: #242426;
}

.events-table__na {
  color: var(--telekom-color-text-and-icon-additional, #6c6c6c);
  font-size: 13px;
}

.events-table__empty {
  text-align: center;
  color: var(--telekom-color-text-and-icon-additional, #6c6c6c);
  padding: 40px 0;
}

.documentation__pagination {
  margin-top: 8px;
  align-self: center;
}

.delete-dialog__message {
  margin: 0;
  font-size: 14px;
  line-height: 1.5;
  color: var(--telekom-color-text-and-icon-standard, #191919);
}

.delete-dialog__actions {
  display: flex;
  gap: 12px;
  justify-content: flex-end;
}
</style>
