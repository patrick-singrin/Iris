import { reactive, watch } from 'vue'
import type { LLMConnection, DiscoveredModel } from '@/types/connection'

export interface ConnectionsState {
  connections: LLMConnection[]
}

const STORAGE_KEY = 'iris-connections'

function getStorage(): Storage | null {
  try { return localStorage } catch { return null }
}

function loadState(): ConnectionsState {
  const defaults: ConnectionsState = { connections: [] }
  const saved = getStorage()?.getItem(STORAGE_KEY)
  if (saved) {
    try {
      const parsed = JSON.parse(saved)
      return {
        ...defaults,
        connections: Array.isArray(parsed.connections) ? parsed.connections : [],
      }
    } catch {
      // ignore corrupt data
    }
  }
  return defaults
}

const state = reactive<ConnectionsState>(loadState())

watch(state, (val) => {
  getStorage()?.setItem(STORAGE_KEY, JSON.stringify(val))
}, { deep: true })

function addConnection(name: string, endpoint: string, apiKey: string): LLMConnection {
  const connection: LLMConnection = {
    id: crypto.randomUUID(),
    name,
    endpoint: endpoint.replace(/\/$/, ''),
    apiKey,
    models: [],
    lastModelFetch: null,
    status: 'untested',
  }
  state.connections.push(connection)
  return connection
}

function updateConnection(id: string, updates: Partial<Pick<LLMConnection, 'name' | 'endpoint' | 'apiKey'>>) {
  const conn = state.connections.find(c => c.id === id)
  if (!conn) return
  if (updates.name !== undefined) conn.name = updates.name
  if (updates.endpoint !== undefined) conn.endpoint = updates.endpoint.replace(/\/$/, '')
  if (updates.apiKey !== undefined) conn.apiKey = updates.apiKey
}

function removeConnection(id: string) {
  const idx = state.connections.findIndex(c => c.id === id)
  if (idx !== -1) state.connections.splice(idx, 1)
}

function getConnection(id: string): LLMConnection | undefined {
  return state.connections.find(c => c.id === id)
}

function setModels(id: string, models: DiscoveredModel[]) {
  const conn = state.connections.find(c => c.id === id)
  if (!conn) return
  conn.models = models
  conn.lastModelFetch = new Date().toISOString()
  conn.status = 'ok'
}

function setStatus(id: string, status: LLMConnection['status']) {
  const conn = state.connections.find(c => c.id === id)
  if (conn) conn.status = status
}

export function useConnectionsStore() {
  return { state, addConnection, updateConnection, removeConnection, getConnection, setModels, setStatus }
}
