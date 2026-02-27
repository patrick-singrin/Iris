import { reactive, watch, computed } from 'vue'

export type ProductContextMode = 'local' | 'rag'

export interface RagConfig {
  endpointUrl: string
  apiKey: string
  queryPath: string
}

export interface ProductContextState {
  enabled: boolean
  mode: ProductContextMode
  localContent: string
  ragConfig: RagConfig
}

const STORAGE_KEY = 'iris-product-context'

const LOCAL_TEMPLATE = `# Product Context

## Product Name
[Your product name]

## Domain Description
[Brief description of what your product does and who uses it]

## Key Terminology
[Product-specific terms, feature names, technical concepts]

## Domain-Specific Rules
[Any rules specific to your product's communications]`

function getStorage(): Storage | null {
  try { return localStorage } catch { return null }
}

function loadState(): ProductContextState {
  const defaults: ProductContextState = {
    enabled: false,
    mode: 'local',
    localContent: '',
    ragConfig: {
      endpointUrl: '',
      apiKey: '',
      queryPath: '/search',
    },
  }
  const saved = getStorage()?.getItem(STORAGE_KEY)
  if (saved) {
    try {
      const parsed = JSON.parse(saved)
      return {
        ...defaults,
        ...parsed,
        ragConfig: { ...defaults.ragConfig, ...parsed.ragConfig },
      }
    } catch {
      // ignore corrupt data
    }
  }
  return defaults
}

const state = reactive<ProductContextState>(loadState())

watch(state, (val) => {
  getStorage()?.setItem(STORAGE_KEY, JSON.stringify(val))
}, { deep: true })

/** Whether product context is active and has content */
const isActive = computed(() => {
  if (!state.enabled) return false
  if (state.mode === 'local') return state.localContent.trim().length > 0
  if (state.mode === 'rag') return state.ragConfig.endpointUrl.trim().length > 0
  return false
})

/**
 * Resolve product context for prompt injection.
 * Returns the context string or null if disabled/empty.
 */
async function getProductContext(): Promise<string | null> {
  if (!state.enabled) return null

  if (state.mode === 'local') {
    const content = state.localContent.trim()
    return content.length > 0 ? content : null
  }

  // RAG mode — placeholder for future implementation
  if (state.mode === 'rag') {
    // TODO: implement RAG query via ragService
    return null
  }

  return null
}

export function useProductContextStore() {
  return { state, isActive, getProductContext }
}
