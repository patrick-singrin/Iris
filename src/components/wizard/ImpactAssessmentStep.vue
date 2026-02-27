<script setup lang="ts">
import { computed } from 'vue'
import type { EventDescription } from '@/types/event'

const props = defineProps<{
  description: EventDescription
  isNotification: boolean
}>()

// ── Dynamic question counter ──
const visibleQuestions = computed(() => {
  const questions: string[] = ['userImpact']
  if (hasImpact.value) {
    questions.push('userScope')
  }
  questions.push('actionRequired')
  if (props.isNotification) {
    questions.push('timing')
    if (props.description.timing === 'scheduled') {
      questions.push('leadTime')
    }
  }
  questions.push('securityCompliance')
  questions.push('whoAffected')
  if (hasImpact.value) {
    questions.push('workaround')
  }
  return questions
})

const totalVisibleQuestions = computed(() => visibleQuestions.value.length)

function questionNumber(id: string): number {
  return visibleQuestions.value.indexOf(id) + 1
}

// ── Audience options ──
const affectedOptions = [
  'All Users',
  'Specific teams',
  'Admins only',
  'External users',
  'API consumers',
  'Individual user(s)',
]

function toggleAffected(option: string) {
  const idx = props.description.whoAffected.indexOf(option)
  if (idx === -1) {
    props.description.whoAffected.push(option)
  } else {
    props.description.whoAffected.splice(idx, 1)
    if (option === 'Other') {
      props.description.whoAffectedCustom = ''
    }
  }
}

// ── Impact & Urgency setters ──
function setUserImpact(value: 'blocked' | 'degraded' | 'no_impact') {
  props.description.userImpact = value
  if (value === 'no_impact') {
    props.description.userScope = ''
    props.description.workaroundAvailable = ''
  }
}

function setUserScope(value: 'widespread' | 'limited') {
  props.description.userScope = value
}

function setActionRequired(value: 'mandatory' | 'recommended' | 'no') {
  props.description.actionRequired = value
  if (value === 'no') {
    props.description.actionDescription = ''
  }
}

function setTiming(value: 'now' | 'scheduled') {
  props.description.timing = value
  if (value === 'now') {
    props.description.leadTime = ''
  }
}

function setLeadTime(value: 'less_than_24h' | '1_to_7_days' | 'more_than_7_days') {
  props.description.leadTime = value
}

function setSecurity(value: boolean) {
  props.description.securityCompliance = value
}

function setWorkaround(value: 'yes_documented' | 'yes_complex' | 'no') {
  props.description.workaroundAvailable = value
}

// ── Computed helpers ──
const hasImpact = computed(() => {
  return props.description.userImpact === 'blocked' || props.description.userImpact === 'degraded'
})
</script>

<template>
  <div class="impact-assessment">

    <!-- ═══ Q1: User Impact ═══ -->
    <div class="question-block">
      <div class="question-block__header">
        <span class="question-block__counter">{{ questionNumber('userImpact') }}/{{ totalVisibleQuestions }}</span>
        <h3 class="question-block__title">What is the user impact?</h3>
      </div>
      <div class="question-block__options">
        <label
          class="radio-tile"
          :class="{ 'radio-tile--selected': description.userImpact === 'blocked' }"
        >
          <scale-radio-button
            name="userImpact"
            value="blocked"
            label="Blocked"
            :checked="description.userImpact === 'blocked'"
            input-id="radio-userImpact-blocked"
            @scale-change="setUserImpact('blocked')"
          />
          <p class="radio-tile__subline">Users cannot complete their tasks at all</p>
        </label>
        <label
          class="radio-tile"
          :class="{ 'radio-tile--selected': description.userImpact === 'degraded' }"
        >
          <scale-radio-button
            name="userImpact"
            value="degraded"
            label="Degraded"
            :checked="description.userImpact === 'degraded'"
            input-id="radio-userImpact-degraded"
            @scale-change="setUserImpact('degraded')"
          />
          <p class="radio-tile__subline">Users can work but with slowness, errors, or reduced quality</p>
        </label>
        <label
          class="radio-tile"
          :class="{ 'radio-tile--selected': description.userImpact === 'no_impact' }"
        >
          <scale-radio-button
            name="userImpact"
            value="no_impact"
            label="No direct impact"
            :checked="description.userImpact === 'no_impact'"
            input-id="radio-userImpact-noimpact"
            @scale-change="setUserImpact('no_impact')"
          />
          <p class="radio-tile__subline">Existing functionality is unaffected</p>
        </label>
      </div>
    </div>

    <!-- ═══ Q2: Scope (conditional on impact) ═══ -->
    <Transition name="slide">
      <div v-if="hasImpact" class="question-block">
        <div class="question-block__header">
          <span class="question-block__counter">{{ questionNumber('userScope') }}/{{ totalVisibleQuestions }}</span>
          <h3 class="question-block__title">How many users are affected?</h3>
        </div>
        <div class="question-block__options">
          <label
            class="radio-tile"
            :class="{ 'radio-tile--selected': description.userScope === 'widespread' }"
          >
            <scale-radio-button
              name="userScope"
              value="widespread"
              label="Widespread"
              :checked="description.userScope === 'widespread'"
              input-id="radio-userScope-widespread"
              @scale-change="setUserScope('widespread')"
            />
            <p class="radio-tile__subline">Significant portion of the user base</p>
          </label>
          <label
            class="radio-tile"
            :class="{ 'radio-tile--selected': description.userScope === 'limited' }"
          >
            <scale-radio-button
              name="userScope"
              value="limited"
              label="Limited"
              :checked="description.userScope === 'limited'"
              input-id="radio-userScope-limited"
              @scale-change="setUserScope('limited')"
            />
            <p class="radio-tile__subline">Specific users or teams only</p>
          </label>
        </div>
      </div>
    </Transition>

    <!-- ═══ Q3: Action Required (with inline textarea) ═══ -->
    <div class="question-block">
      <div class="question-block__header">
        <span class="question-block__counter">{{ questionNumber('actionRequired') }}/{{ totalVisibleQuestions }}</span>
        <h3 class="question-block__title">Do users need to take action?</h3>
      </div>
      <div class="question-block__options">
        <label
          class="radio-tile"
          :class="{ 'radio-tile--selected': description.actionRequired === 'mandatory' }"
        >
          <scale-radio-button
            name="actionRequired"
            value="mandatory"
            label="Yes, mandatory"
            :checked="description.actionRequired === 'mandatory'"
            input-id="radio-actionRequired-mandatory"
            @scale-change="setActionRequired('mandatory')"
          />
          <p class="radio-tile__subline">Users must act to avoid issues</p>
          <Transition name="slide">
            <div v-if="description.actionRequired === 'mandatory'" class="radio-tile__inline-field" @click.stop>
              <scale-textarea
                label="What do users need to do?"
                :value="description.actionDescription"
                @scaleChange="(e: CustomEvent) => description.actionDescription = e.detail.value ?? ''"
                rows="2"
              ></scale-textarea>
            </div>
          </Transition>
        </label>
        <label
          class="radio-tile"
          :class="{ 'radio-tile--selected': description.actionRequired === 'recommended' }"
        >
          <scale-radio-button
            name="actionRequired"
            value="recommended"
            label="Yes, recommended"
            :checked="description.actionRequired === 'recommended'"
            input-id="radio-actionRequired-recommended"
            @scale-change="setActionRequired('recommended')"
          />
          <p class="radio-tile__subline">Helpful but not required</p>
          <Transition name="slide">
            <div v-if="description.actionRequired === 'recommended'" class="radio-tile__inline-field" @click.stop>
              <scale-textarea
                label="What do users need to do?"
                :value="description.actionDescription"
                @scaleChange="(e: CustomEvent) => description.actionDescription = e.detail.value ?? ''"
                rows="2"
              ></scale-textarea>
            </div>
          </Transition>
        </label>
        <label
          class="radio-tile"
          :class="{ 'radio-tile--selected': description.actionRequired === 'no' }"
        >
          <scale-radio-button
            name="actionRequired"
            value="no"
            label="No"
            :checked="description.actionRequired === 'no'"
            input-id="radio-actionRequired-no"
            @scale-change="setActionRequired('no')"
          />
          <p class="radio-tile__subline">Informational only</p>
        </label>
      </div>
    </div>

    <!-- ═══ Q4: Timing (Notifications only) ═══ -->
    <div v-if="isNotification" class="question-block">
      <div class="question-block__header">
        <span class="question-block__counter">{{ questionNumber('timing') }}/{{ totalVisibleQuestions }}</span>
        <h3 class="question-block__title">When is this happening?</h3>
      </div>
      <div class="question-block__options">
        <label
          class="radio-tile"
          :class="{ 'radio-tile--selected': description.timing === 'now' }"
        >
          <scale-radio-button
            name="timing"
            value="now"
            label="Happening now"
            :checked="description.timing === 'now'"
            input-id="radio-timing-now"
            @scale-change="setTiming('now')"
          />
          <p class="radio-tile__subline">Currently active or just occurred</p>
        </label>
        <label
          class="radio-tile"
          :class="{ 'radio-tile--selected': description.timing === 'scheduled' }"
        >
          <scale-radio-button
            name="timing"
            value="scheduled"
            label="Scheduled for later"
            :checked="description.timing === 'scheduled'"
            input-id="radio-timing-scheduled"
            @scale-change="setTiming('scheduled')"
          />
          <p class="radio-tile__subline">Planned for a specific time</p>
        </label>
      </div>
    </div>

    <!-- ═══ Q5: Lead Time (conditional on scheduled) ═══ -->
    <Transition name="slide">
      <div v-if="isNotification && description.timing === 'scheduled'" class="question-block">
        <div class="question-block__header">
          <span class="question-block__counter">{{ questionNumber('leadTime') }}/{{ totalVisibleQuestions }}</span>
          <h3 class="question-block__title">How much lead time do users have?</h3>
        </div>
        <div class="question-block__options">
          <label
            class="radio-tile"
            :class="{ 'radio-tile--selected': description.leadTime === 'less_than_24h' }"
          >
            <scale-radio-button
              name="leadTime"
              value="less_than_24h"
              label="Less than 24 hours"
              :checked="description.leadTime === 'less_than_24h'"
              input-id="radio-leadTime-less24h"
              @scale-change="setLeadTime('less_than_24h')"
            />
          </label>
          <label
            class="radio-tile"
            :class="{ 'radio-tile--selected': description.leadTime === '1_to_7_days' }"
          >
            <scale-radio-button
              name="leadTime"
              value="1_to_7_days"
              label="1–7 days"
              :checked="description.leadTime === '1_to_7_days'"
              input-id="radio-leadTime-1to7"
              @scale-change="setLeadTime('1_to_7_days')"
            />
          </label>
          <label
            class="radio-tile"
            :class="{ 'radio-tile--selected': description.leadTime === 'more_than_7_days' }"
          >
            <scale-radio-button
              name="leadTime"
              value="more_than_7_days"
              label="More than 7 days"
              :checked="description.leadTime === 'more_than_7_days'"
              input-id="radio-leadTime-more7"
              @scale-change="setLeadTime('more_than_7_days')"
            />
          </label>
        </div>
      </div>
    </Transition>

    <!-- ═══ Q6: Security / Compliance ═══ -->
    <div class="question-block">
      <div class="question-block__header">
        <span class="question-block__counter">{{ questionNumber('securityCompliance') }}/{{ totalVisibleQuestions }}</span>
        <h3 class="question-block__title">Is this a security or compliance issue?</h3>
        <p class="question-block__helper">e.g. data breach, compromised credentials, compliance violation</p>
      </div>
      <div class="question-block__options">
        <label
          class="radio-tile"
          :class="{ 'radio-tile--selected': description.securityCompliance === true }"
        >
          <scale-radio-button
            name="securityCompliance"
            value="yes"
            label="Yes"
            :checked="description.securityCompliance === true"
            input-id="radio-security-yes"
            @scale-change="setSecurity(true)"
          />
        </label>
        <label
          class="radio-tile"
          :class="{ 'radio-tile--selected': description.securityCompliance === false }"
        >
          <scale-radio-button
            name="securityCompliance"
            value="no"
            label="No"
            :checked="description.securityCompliance === false"
            input-id="radio-security-no"
            @scale-change="setSecurity(false)"
          />
        </label>
      </div>
    </div>

    <!-- ═══ Q7: Who is affected? (checkboxes) ═══ -->
    <div class="question-block">
      <div class="question-block__header">
        <span class="question-block__counter">{{ questionNumber('whoAffected') }}/{{ totalVisibleQuestions }}</span>
        <h3 class="question-block__title">Who is affected?</h3>
        <p class="question-block__helper">Select all that apply.</p>
      </div>
      <div class="question-block__options">
        <label
          v-for="option in affectedOptions"
          :key="option"
          class="checkbox-tile"
          :class="{ 'checkbox-tile--selected': description.whoAffected.includes(option) }"
        >
          <scale-checkbox
            :label="option"
            :checked="description.whoAffected.includes(option)"
            @scale-change="toggleAffected(option)"
          />
        </label>
        <!-- Other checkbox with inline text field -->
        <label
          class="checkbox-tile"
          :class="{ 'checkbox-tile--selected': description.whoAffected.includes('Other') }"
        >
          <scale-checkbox
            label="Other"
            :checked="description.whoAffected.includes('Other')"
            @scale-change="toggleAffected('Other')"
          />
          <Transition name="slide">
            <div v-if="description.whoAffected.includes('Other')" class="checkbox-tile__inline-field" @click.stop>
              <scale-textarea
                label="Please specify who is affected"
                :value="description.whoAffectedCustom"
                @scaleChange="(e: CustomEvent) => description.whoAffectedCustom = e.detail.value ?? ''"
                rows="3"
              ></scale-textarea>
            </div>
          </Transition>
        </label>
      </div>
    </div>

    <!-- ═══ Q8: Workaround (conditional on impact) ═══ -->
    <Transition name="slide">
      <div v-if="hasImpact" class="question-block">
        <div class="question-block__header">
          <span class="question-block__counter">{{ questionNumber('workaround') }}/{{ totalVisibleQuestions }}</span>
          <h3 class="question-block__title">Is there a workaround?</h3>
        </div>
        <div class="question-block__options">
          <label
            class="radio-tile"
            :class="{ 'radio-tile--selected': description.workaroundAvailable === 'yes_documented' }"
          >
            <scale-radio-button
              name="workaround"
              value="yes_documented"
              label="Yes, documented"
              :checked="description.workaroundAvailable === 'yes_documented'"
              input-id="radio-workaround-documented"
              @scale-change="setWorkaround('yes_documented')"
            />
            <p class="radio-tile__subline">Clear alternative path exists</p>
          </label>
          <label
            class="radio-tile"
            :class="{ 'radio-tile--selected': description.workaroundAvailable === 'yes_complex' }"
          >
            <scale-radio-button
              name="workaround"
              value="yes_complex"
              label="Yes, but complex"
              :checked="description.workaroundAvailable === 'yes_complex'"
              input-id="radio-workaround-complex"
              @scale-change="setWorkaround('yes_complex')"
            />
            <p class="radio-tile__subline">Workaround requires effort or expertise</p>
          </label>
          <label
            class="radio-tile"
            :class="{ 'radio-tile--selected': description.workaroundAvailable === 'no' }"
          >
            <scale-radio-button
              name="workaround"
              value="no"
              label="No"
              :checked="description.workaroundAvailable === 'no'"
              input-id="radio-workaround-no"
              @scale-change="setWorkaround('no')"
            />
            <p class="radio-tile__subline">No alternative available</p>
          </label>
        </div>
      </div>
    </Transition>

  </div>
</template>

<style scoped>
.impact-assessment {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

/* ── Question Block ── */
.question-block {
  background: #efeff0;
  border-radius: 8px;
  padding: 20px 16px 16px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.question-block__header {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.question-block__counter {
  font-family: 'TeleNeo', sans-serif;
  font-weight: 400;
  font-size: 16px;
  line-height: 22.4px;
  color: #6c6c6c;
}

.question-block__title {
  margin: 0;
  font-family: 'TeleNeo', sans-serif;
  font-weight: 800;
  font-size: 20px;
  line-height: 28px;
  color: #000;
}

.question-block__helper {
  margin: 0;
  font-family: 'TeleNeo', sans-serif;
  font-weight: 400;
  font-size: 14px;
  line-height: 1.4;
  color: #747478;
}

/* ── Options Container ── */
.question-block__options {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

/* ── Radio Tile (same pattern as TreeQuestionStep) ── */
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

.radio-tile__inline-field {
  padding-top: 8px;
  padding-left: 28px;
}

/* ── Checkbox Tile ── */
.checkbox-tile {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 10px 16px;
  background: var(--telekom-color-background-surface, #fff);
  border: 1px solid #dfdfe1;
  border-radius: 8px;
  cursor: pointer;
  transition: border-color 0.15s ease, box-shadow 0.15s ease;
}

.checkbox-tile:hover {
  border-color: var(--telekom-color-primary-standard, #e20074);
}

.checkbox-tile--selected {
  border-color: var(--telekom-color-primary-standard, #e20074);
  box-shadow: 0 0 0 1px var(--telekom-color-primary-standard, #e20074);
}

.checkbox-tile__inline-field {
  padding-top: 8px;
  padding-left: 28px;
}

/* ── Slide transition (for conditional fields) ── */
.slide-enter-active,
.slide-leave-active {
  transition: all 0.2s ease;
  overflow: hidden;
}

.slide-enter-from,
.slide-leave-to {
  opacity: 0;
  max-height: 0;
  margin-top: 0;
}

.slide-enter-to,
.slide-leave-from {
  opacity: 1;
  max-height: 500px;
}
</style>
