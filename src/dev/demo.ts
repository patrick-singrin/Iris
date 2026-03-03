/**
 * Dev demo — populates store with realistic data and jumps to text output view.
 *
 * Usage (browser console): window.__iris_demo()
 */

import { useEventStoryStore } from '@/stores/eventStoryStore'
import { useTextGenerationStore } from '@/stores/textGenerationStore'
import { useAppStore } from '@/stores/appStore'
import { createDefaultStep } from '@/data/escalation-timing'
import type { GeneratedText } from '@/types/event'

const DEMO_NARRATIVE = `What: API key rotation will be performed on the AIFS LLM Hub platform. All existing API keys will be automatically rotated.
Who: All developers and applications using AIFS API keys are affected.
When: Scheduled for March 15, 2026, 02:00–04:00 CET.
What to do: Update your applications with the new API key before the rotation window. Keys can be regenerated in the Developer Portal.`

const DEMO_CHECKLIST_VALUES: Record<string, { value: string | string[]; description?: string }> = {
  what_happened: { value: 'API key rotation on AIFS LLM Hub platform', description: 'Scheduled API key rotation' },
  event_trigger: { value: 'scheduled_system', description: 'Scheduled system event' },
  who_affected: { value: 'all_users', description: 'Developers and API consumers' },
  impact_scope: { value: 'widespread', description: 'All API key holders' },
  user_impact: { value: 'degraded', description: 'Applications will lose access if keys are not updated' },
  timing: { value: 'scheduled', description: 'Scheduled for March 15, 2026' },
  action_required: { value: 'mandatory', description: 'Must regenerate API keys' },
  what_to_do: { value: 'Regenerate API keys in the Developer Portal before March 15', description: 'Update keys in Developer Portal' },
  security: { value: 'no', description: 'No security/compliance implications' },
}

function buildDemoGeneratedText(): GeneratedText {
  const text: GeneratedText = {}

  // Banner
  text['banner'] = {
    banner_title: { en: 'API key rotation starts soon', de: 'API-Schlüssel-Rotation steht bevor' },
    banner_description: {
      en: 'Your current API key will rotate automatically. Update your applications or create a new key to avoid interruption.',
      de: 'Ihr aktueller API-Schlüssel wird automatisch rotiert. Aktualisieren Sie Ihre Anwendungen oder erstellen Sie einen neuen Schlüssel.',
    },
    banner_cta_primary: { en: 'View details', de: 'Details anzeigen' },
    banner_dismiss: { en: 'Dismissible', de: 'Dismissible' },
  }

  // Dashboard Item
  text['dashboard_item'] = {
    dashboard_title: { en: 'API Key Rotation — March 15', de: 'API-Schlüssel-Rotation — 15. März' },
    dashboard_description: {
      en: 'All API keys rotate on March 15, 02:00 CET. Update your keys before the deadline.',
      de: 'Alle API-Schlüssel werden am 15. März um 02:00 Uhr rotiert. Aktualisieren Sie Ihre Schlüssel rechtzeitig.',
    },
    dashboard_cta_primary: { en: 'Regenerate key', de: 'Schlüssel erneuern' },
    dashboard_cta_secondary: { en: 'Learn more', de: 'Mehr erfahren' },
  }

  // Email
  text['email'] = {
    email_subject: { en: '[Action Required] API Key Rotation — March 15', de: '[Handlungsbedarf] API-Schlüssel-Rotation — 15. März' },
    email_preview: {
      en: 'Your API keys will be rotated on March 15. Update your applications before the deadline.',
      de: 'Ihre API-Schlüssel werden am 15. März rotiert. Aktualisieren Sie Ihre Anwendungen rechtzeitig.',
    },
    email_importance: { en: 'High', de: 'High' },
    email_greeting: { en: 'Dear developers,', de: 'Sehr geehrte Entwicklerinnen und Entwickler,' },
    email_body: {
      en: 'We are writing to inform you that all API keys on the AIFS LLM Hub platform will be automatically rotated on March 15, 2026, between 02:00 and 04:00 CET. This rotation affects all developers and applications using AIFS API keys.\n\nTo ensure uninterrupted service, please regenerate your API key in the Developer Portal before the rotation window. Applications using outdated keys will receive authentication errors until updated.\n\nIf you have already rotated your key within the last 7 days, no action is required.',
      de: 'Wir möchten Sie darüber informieren, dass alle API-Schlüssel auf der AIFS LLM Hub-Plattform am 15. März 2026 zwischen 02:00 und 04:00 Uhr MEZ automatisch rotiert werden. Diese Rotation betrifft alle Entwickler und Anwendungen, die AIFS API-Schlüssel verwenden.\n\nUm einen unterbrechungsfreien Betrieb sicherzustellen, erneuern Sie bitte Ihren API-Schlüssel im Developer Portal vor dem Rotationsfenster. Anwendungen mit veralteten Schlüsseln erhalten Authentifizierungsfehler.\n\nWenn Sie Ihren Schlüssel bereits in den letzten 7 Tagen rotiert haben, ist keine Aktion erforderlich.',
    },
    email_cta_label: { en: 'Open Developer Portal', de: 'Developer Portal öffnen' },
    email_closing: {
      en: 'Best regards,\nThe AIFS Platform Team',
      de: 'Mit freundlichen Grüßen,\nIhr AIFS Platform Team',
    },
  }

  // API Response
  text['api_response'] = {
    api_message: {
      en: 'API key rotation scheduled for March 15, 2026, 02:00–04:00 CET. Regenerate your key in the Developer Portal to avoid service interruption.',
      de: 'API-Schlüssel-Rotation geplant für 15. März 2026, 02:00–04:00 MEZ. Erneuern Sie Ihren Schlüssel im Developer Portal.',
    },
    api_action: {
      en: 'Regenerate your API key at portal.aifs.example.com before the rotation window.',
      de: 'Erneuern Sie Ihren API-Schlüssel unter portal.aifs.example.com vor dem Rotationsfenster.',
    },
  }

  return text
}

export function loadDemo() {
  const store = useEventStoryStore()
  const textStore = useTextGenerationStore()

  // 1. Populate checklist
  for (const [id, data] of Object.entries(DEMO_CHECKLIST_VALUES)) {
    const item = store.checklist.value.find((i: { id: string }) => i.id === id)
    if (item) {
      item.filled = true
      item.value = data.value
      item.description = data.description ?? null
      item.evidence = typeof data.value === 'string' ? data.value : data.value.join(', ')
      item.source = 'llm'
      item.verified = true
    }
  }

  // 2. Set narrative
  store.storyText.value = DEMO_NARRATIVE

  // 3. Set escalation steps with timing labels
  const step1 = createDefaultStep() // "When it occurs"
  store.setEscalationSteps([step1])

  // 4. Populate generated text
  textStore.setGeneratedText(buildDemoGeneratedText())

  // 5. Switch to text-generation output phase
  store.phase.value = 'text-generation'
  store.backToStep('output')
  useAppStore().setView('event-story')

  console.log('[demo] Loaded demo data — text output view ready')
}
