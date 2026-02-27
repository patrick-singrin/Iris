import { ref, computed } from 'vue'
import { en } from './en'
import { de } from './de'

export type Locale = 'EN' | 'DE'
export type TranslationKey = keyof typeof en

const locale = ref<Locale>('EN')

const translations: Record<Locale, Record<string, string>> = { EN: en, DE: de }

function t(key: TranslationKey): string {
  return translations[locale.value][key] ?? key
}

function setLocale(lang: Locale) {
  locale.value = lang
}

/** Direct export for non-component contexts (stores, data files). */
export { t }

export function useI18n() {
  return {
    locale: computed(() => locale.value),
    t,
    setLocale,
  }
}
