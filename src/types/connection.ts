export interface DiscoveredModel {
  id: string
  category: 'reasoning' | 'chat'
}

export interface LLMConnection {
  id: string
  name: string
  endpoint: string
  apiKey: string
  models: DiscoveredModel[]
  lastModelFetch: string | null
  status: 'untested' | 'ok' | 'error'
}
