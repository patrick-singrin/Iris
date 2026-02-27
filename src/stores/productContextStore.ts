import { reactive, watch, computed } from 'vue'

export type ProductContextMode = 'local' | 'rag'

export interface RagConfig {
  endpointUrl: string
  apiKey: string
  queryPath: string
}

export interface ProductContextDocument {
  name: string
  content: string
}

export interface ProductContextState {
  enabled: boolean
  mode: ProductContextMode
  documents: ProductContextDocument[]
  /** @deprecated Kept for migration from older localStorage data */
  localContent: string
  ragConfig: RagConfig
}

const STORAGE_KEY = 'iris-product-context'

function getStorage(): Storage | null {
  try { return localStorage } catch { return null }
}

function loadState(): ProductContextState {
  const defaults: ProductContextState = {
    enabled: false,
    mode: 'local',
    documents: [],
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
      const merged = {
        ...defaults,
        ...parsed,
        documents: Array.isArray(parsed.documents) ? parsed.documents : [],
        ragConfig: { ...defaults.ragConfig, ...parsed.ragConfig },
      }
      // Migrate: if old localContent exists but no documents, convert it
      if (merged.documents.length === 0 && typeof parsed.localContent === 'string' && parsed.localContent.trim()) {
        merged.documents = [{ name: 'Product Context.md', content: parsed.localContent.trim() }]
        merged.localContent = ''
      }
      return merged
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
  if (state.mode === 'local') return state.documents.length > 0
  if (state.mode === 'rag') return state.ragConfig.endpointUrl.trim().length > 0
  return false
})

/** Computed list of document names for the UI */
const documentNames = computed(() => state.documents.map(d => d.name))

/** Add a document. Skips if a document with the same name already exists. */
function addDocument(name: string, content: string) {
  if (state.documents.some(d => d.name === name)) return
  state.documents.push({ name, content })
}

/** Remove a document by name. */
function removeDocument(name: string) {
  const idx = state.documents.findIndex(d => d.name === name)
  if (idx !== -1) state.documents.splice(idx, 1)
}

/**
 * Resolve product context for prompt injection.
 * Returns the context string or null if disabled/empty.
 */
async function getProductContext(): Promise<string | null> {
  if (!state.enabled) return null

  if (state.mode === 'local') {
    if (state.documents.length === 0) return null
    return state.documents.map(d => d.content).join('\n\n---\n\n')
  }

  // RAG mode — placeholder for future implementation
  if (state.mode === 'rag') {
    // TODO: implement RAG query via ragService
    return null
  }

  return null
}

export function useProductContextStore() {
  return { state, isActive, documentNames, addDocument, removeDocument, getProductContext }
}
