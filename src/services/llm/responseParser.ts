import type { GeneratedText } from '@/types/event'

export function parseGeneratedText(rawResponse: string): GeneratedText | null {
  try {
    // Try to extract JSON from the response, handling possible markdown code fences
    let jsonStr = rawResponse.trim()

    // Remove markdown code fences if present
    const fenceMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)\s*```/)
    if (fenceMatch && fenceMatch[1]) {
      jsonStr = fenceMatch[1]
    }

    const parsed = JSON.parse(jsonStr)

    // Validate structure: { componentId: { fieldId: { en, de } } }
    if (typeof parsed !== 'object' || parsed === null) return null

    const result: GeneratedText = {}
    for (const [componentId, fields] of Object.entries(parsed)) {
      if (typeof fields !== 'object' || fields === null) continue
      result[componentId] = {}
      for (const [fieldId, text] of Object.entries(fields as Record<string, unknown>)) {
        if (typeof text !== 'object' || text === null) continue
        const t = text as Record<string, unknown>
        result[componentId][fieldId] = {
          en: typeof t.en === 'string' ? t.en : '',
          de: typeof t.de === 'string' ? t.de : '',
        }
      }
    }

    return Object.keys(result).length > 0 ? result : null
  } catch {
    return null
  }
}
