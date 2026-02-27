#!/usr/bin/env node
/**
 * Pipeline Evaluation Script
 * Tests extraction, classification, narrative, and analysis quality
 * across multiple personas with varying tech knowledge.
 *
 * Usage: node tests/pipeline-eval.mjs
 */

const LM_STUDIO_URL = 'http://localhost:1234/v1/chat/completions'

// ---------------------------------------------------------------------------
// Allowed values (mirrors story-classification.ts)
// ---------------------------------------------------------------------------
const FIELD_ALLOWED_VALUES = {
  event_kind: ['system_change', 'error_issue', 'user_action', 'process_update'],
  user_impact: ['blocked', 'degraded', 'no_impact'],
  impact_scope: ['widespread', 'limited'],
  timing: ['now', 'scheduled', 'resolved'],
  action_required: ['mandatory', 'recommended', 'no'],
  security: ['yes', 'no'],
  error_location: ['specific_field', 'whole_page', 'background', 'api'],
}

// ---------------------------------------------------------------------------
// Checklist template
// ---------------------------------------------------------------------------
function createChecklist() {
  return [
    { id: 'what_happened', label: 'What happened', filled: false, value: null, verified: false },
    { id: 'event_kind', label: 'Event kind', filled: false, value: null, verified: false },
    { id: 'who_affected', label: 'Who is affected', filled: false, value: null, verified: false },
    { id: 'impact_scope', label: 'Scope of impact', filled: false, value: null, verified: false },
    { id: 'user_impact', label: 'User impact level', filled: false, value: null, verified: false },
    { id: 'timing', label: 'Timing', filled: false, value: null, verified: false },
    { id: 'action_required', label: 'Action required', filled: false, value: null, verified: false },
    { id: 'what_to_do', label: 'What users should do', filled: false, value: null, verified: false },
    { id: 'security', label: 'Security concerns', filled: false, value: null, verified: false },
    { id: 'error_location', label: 'Error location', filled: false, value: null, verified: false },
    { id: 'field_context', label: 'Field context', filled: false, value: null, verified: false },
  ]
}

// ---------------------------------------------------------------------------
// System prompt (mirrors storyExtractor.ts)
// ---------------------------------------------------------------------------
function buildSystemPrompt(checklist) {
  const itemDescriptions = checklist.map(item => {
    const allowed = FIELD_ALLOWED_VALUES[item.id]
    const constraint = allowed
      ? ` (MUST be one of: ${allowed.join(', ')})`
      : ' (free text)'
    const status = item.filled ? `VERIFIED: ${item.value}` : 'EMPTY'
    return `  - "${item.id}" (${item.label})${constraint} → ${status}`
  }).join('\n')

  return `You are an assistant for a product communication tool. Teams use this tool to create clear, actionable event notifications for end users — from incident alerts to maintenance announcements.

Your goal is to extract information that is USEFUL FOR WRITING USER-FACING COMMUNICATION, not just to classify keywords.

You have two jobs:

## Job 1: Extract checklist information
Scan the conversation for information matching the checklist items below.

Checklist items:
${itemDescriptions}

### Extraction rules
- ONLY extract items that are currently EMPTY.
- For fields with allowed values, use EXACTLY one of the listed values.
- The "evidence" MUST be the exact phrase from the user's input.
- Be aggressive but accurate: extract everything clearly stated or strongly implied.
- For free text fields, preserve the user's specific, actionable language.

## Job 2: Compose the event narrative
Write a structured event narrative using W-headings:

What:
<1-2 sentences describing what is happening>

Who:
<1 sentence about who is affected>

When:
<1 sentence about timing>

What to do:
<1 sentence about what users should do>

Rules:
- ALWAYS return a story string.
- Address end users directly. Be concise and actionable.
- Only include facts from the conversation. Do NOT invent details.

## Response format
Return ONLY valid JSON:
{"items":[{"id":"field_id","value":"extracted_value","description":"clear summary","evidence":"exact quote"}],"story":"What:\\n<text>\\n\\nWho:\\n<text>\\n\\nWhen:\\n<text>\\n\\nWhat to do:\\n<text>"}`
}

// ---------------------------------------------------------------------------
// LLM call
// ---------------------------------------------------------------------------
async function callLLM(systemPrompt, userPrompt, maxTokens = 4096) {
  const start = Date.now()
  const resp = await fetch(LM_STUDIO_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'mistralai/ministral-3-14b-reasoning',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      max_tokens: maxTokens,
      temperature: 0.3,
    }),
  })
  const data = await resp.json()
  const duration = Date.now() - start
  const raw = data.choices?.[0]?.message?.content || ''
  return { raw, duration }
}

// ---------------------------------------------------------------------------
// JSON repair (simplified from jsonRepair.ts)
// ---------------------------------------------------------------------------
function robustParse(raw) {
  let str = raw.trim()
  // Strip markdown fences
  str = str.replace(/^```(?:json)?\s*\n?/gm, '').replace(/\n?```\s*$/gm, '').trim()
  // Strip any leading text before first {
  const firstBrace = str.indexOf('{')
  if (firstBrace > 0) str = str.substring(firstBrace)

  try { return JSON.parse(str) } catch {}

  // Try closing unclosed braces
  let repaired = str
  let inStr = false, esc = false, braces = 0, brackets = 0
  for (const ch of str) {
    if (esc) { esc = false; continue }
    if (ch === '\\' && inStr) { esc = true; continue }
    if (ch === '"') { inStr = !inStr; continue }
    if (inStr) continue
    if (ch === '{') braces++
    else if (ch === '}') braces--
    else if (ch === '[') brackets++
    else if (ch === ']') brackets--
  }
  if (inStr) repaired += '"'
  while (brackets > 0) { repaired += ']'; brackets-- }
  while (braces > 0) { repaired += '}'; braces-- }
  try { return JSON.parse(repaired) } catch {}

  return null
}

// ---------------------------------------------------------------------------
// Classification (mirrors story-classification.ts)
// ---------------------------------------------------------------------------
function deriveClassification(items) {
  const get = (id) => items.find(i => i.id === id) || { filled: false, value: null }
  const kind = get('event_kind')
  if (!kind.filled) return null

  if (kind.value === 'error_issue') {
    const loc = get('error_location')
    if (loc.filled && loc.value === 'specific_field')
      return { type: 'Validation Message', severity: null, channels: ['Inline Field Validation'] }
    return { type: 'Error & Warning', severity: null, channels: ['Inline message at point of action'] }
  }
  if (kind.value === 'user_action') {
    const ctx = get('field_context')
    if (ctx.filled && ctx.value === 'form')
      return { type: 'Validation Message', severity: null, channels: ['Inline Field Validation'] }
    return { type: 'Feedback', severity: null, channels: ['Toast Notification'] }
  }
  // system_change, process_update, or freeform
  const impact = get('user_impact')
  const scope = get('impact_scope')
  const security = get('security')
  const action = get('action_required')
  const timing = get('timing')

  let severity = 'LOW'
  if (impact.value === 'blocked' || security.value === 'yes') severity = 'CRITICAL'
  else if (impact.value === 'degraded' && scope.value === 'widespread') severity = 'HIGH'
  else if (action.value === 'mandatory') severity = 'HIGH'
  else if (scope.value === 'widespread') severity = 'MEDIUM'

  const channels = []
  if (severity === 'CRITICAL' || severity === 'HIGH') channels.push('Banner', 'Dashboard', 'Email')
  else if (severity === 'MEDIUM') channels.push('Dashboard', 'Email')
  else channels.push('Dashboard')

  return { type: 'Notification', severity, channels }
}

// ---------------------------------------------------------------------------
// Test scenarios
// ---------------------------------------------------------------------------
const SCENARIOS = [
  {
    name: 'Persona 1: Senior Backend Engineer',
    techLevel: 'Expert',
    description: 'Detailed technical incident report',
    conversation: [
      { question: 'What type of event is this?', selectedOptions: ['Error or issue'], freeformText: '' },
      { question: 'Describe the event', selectedOptions: [], freeformText: 'The PostgreSQL connection pool on our production API cluster (api-prod-eu-west) became exhausted after a long-running query from the reporting service held all 50 connections for approximately 45 minutes. This caused HTTP 503 errors for all authenticated API endpoints including login, dashboard, and account management.' },
      { question: 'Where does the error appear?', selectedOptions: ['In an API call or integration'], freeformText: '' },
      { question: 'Are there security concerns?', selectedOptions: ['No'], freeformText: '' },
    ],
    expected: {
      event_kind: 'error_issue',
      error_location: 'api',
      security: 'no',
      who_affected: true,     // should extract something
      what_happened: true,    // should extract something
      user_impact: 'blocked', // users can't login
      classificationType: 'Error & Warning',
    },
  },
  {
    name: 'Persona 2: Product Manager',
    techLevel: 'Business',
    description: 'Scheduled maintenance, business language',
    conversation: [
      { question: 'What type of event is this?', selectedOptions: ['System change or maintenance'], freeformText: '' },
      { question: 'Describe the event', selectedOptions: [], freeformText: "We're upgrading our billing system next Saturday. Customers won't be able to view or download invoices for about 2 hours in the morning. Everything else should work fine. We need to let them know ahead of time." },
      { question: 'Are there security concerns?', selectedOptions: ['No'], freeformText: '' },
    ],
    expected: {
      event_kind: 'system_change',
      security: 'no',
      who_affected: true,
      what_happened: true,
      timing: 'scheduled',
      user_impact: 'degraded', // partial outage
      action_required: 'no',
      classificationType: 'Notification',
    },
  },
  {
    name: 'Persona 3: Non-technical Support Agent',
    techLevel: 'Basic',
    description: 'Symptom-focused, vague on causes',
    conversation: [
      { question: 'What type of event is this?', selectedOptions: ['Error or issue'], freeformText: '' },
      { question: 'Describe the event', selectedOptions: [], freeformText: "Customers are calling in saying they can't log in. The login page just shows a spinning wheel and then an error message. It's been happening since this morning. Our team is looking into it but no fix yet." },
      { question: 'Where does the error appear?', selectedOptions: ['On the whole page or screen'], freeformText: '' },
      { question: 'Are there security concerns?', selectedOptions: ['No'], freeformText: '' },
    ],
    expected: {
      event_kind: 'error_issue',
      error_location: 'whole_page',
      security: 'no',
      who_affected: true,
      what_happened: true,
      user_impact: 'blocked',
      timing: 'now',
      classificationType: 'Error & Warning',
    },
  },
  {
    name: 'Persona 4: Junior Developer',
    techLevel: 'Intermediate',
    description: 'Some tech detail, unsure about impact',
    conversation: [
      { question: 'What type of event is this?', selectedOptions: ['System change or maintenance'], freeformText: '' },
      { question: 'Describe the event', selectedOptions: [], freeformText: "We're deprecating the v1 REST API and everyone needs to switch to v2 by end of Q1. The v1 endpoints will return 410 Gone after March 31. There's a migration guide on our dev portal. It mainly affects third-party integrations." },
      { question: 'Are there security concerns?', selectedOptions: ['No'], freeformText: '' },
    ],
    expected: {
      event_kind: 'system_change',
      security: 'no',
      who_affected: true,
      what_happened: true,
      timing: 'scheduled',
      action_required: 'mandatory',
      what_to_do: true,
      classificationType: 'Notification',
    },
  },
  {
    name: 'Persona 5: Marketing Manager',
    techLevel: 'Non-technical',
    description: 'Feature announcement, promotional tone',
    conversation: [
      { question: 'What type of event is this?', selectedOptions: ['Process or status update'], freeformText: '' },
      { question: 'Describe the event', selectedOptions: [], freeformText: "We just launched our new dark mode feature! Users can now switch between light and dark themes in their profile settings. It works across all pages. No action needed, but we'd love for everyone to try it out." },
    ],
    expected: {
      event_kind: 'process_update',
      who_affected: true,
      what_happened: true,
      action_required: 'no',
      user_impact: 'no_impact',
      classificationType: 'Notification',
    },
  },
  {
    name: 'Persona 6: Security Officer',
    techLevel: 'Expert',
    description: 'Security incident with urgency',
    conversation: [
      { question: 'What type of event is this?', selectedOptions: ['Error or issue'], freeformText: '' },
      { question: 'Describe the event', selectedOptions: [], freeformText: "We discovered unauthorized access to our staging database through a compromised service account. We've rotated all credentials and blocked the IP. Production data was not affected but we need all users with admin access to reset their passwords immediately as a precaution." },
      { question: 'Where does the error appear?', selectedOptions: [], freeformText: 'In the admin panel and account settings' },
      { question: 'Are there security concerns?', selectedOptions: ['Yes'], freeformText: '' },
    ],
    expected: {
      event_kind: 'error_issue',
      security: 'yes',
      who_affected: true,
      what_happened: true,
      action_required: 'mandatory',
      what_to_do: true,
      classificationType: 'Error & Warning',
    },
  },
]

// ---------------------------------------------------------------------------
// Build user message (mirrors storyExtractor.ts)
// ---------------------------------------------------------------------------
function buildUserMessage(conversation) {
  return conversation.map((entry, i) => {
    const parts = [`Q${i + 1}: ${entry.question}`]
    if (entry.selectedOptions.length > 0)
      parts.push(`Selected: ${entry.selectedOptions.join(', ')}`)
    if (entry.freeformText)
      parts.push(`Answer: ${entry.freeformText}`)
    return parts.join('\n')
  }).join('\n\n')
}

// ---------------------------------------------------------------------------
// Evaluate extraction quality
// ---------------------------------------------------------------------------
function evaluateExtraction(items, expected, scenario) {
  const results = { correct: 0, incorrect: 0, missed: 0, unexpected: 0, details: [] }
  const extractedMap = {}
  for (const item of items) extractedMap[item.id] = item.value

  for (const [key, expectedVal] of Object.entries(expected)) {
    if (key === 'classificationType') continue // evaluated separately
    const extracted = extractedMap[key]

    if (expectedVal === true) {
      // Just check it was extracted (any value)
      if (extracted) {
        results.correct++
        results.details.push({ field: key, status: 'OK', extracted })
      } else {
        results.missed++
        results.details.push({ field: key, status: 'MISSED', expected: 'any value' })
      }
    } else {
      // Check exact value
      if (extracted === expectedVal) {
        results.correct++
        results.details.push({ field: key, status: 'OK', extracted })
      } else if (extracted) {
        results.incorrect++
        results.details.push({ field: key, status: 'WRONG', extracted, expected: expectedVal })
      } else {
        results.missed++
        results.details.push({ field: key, status: 'MISSED', expected: expectedVal })
      }
    }
  }

  // Count unexpected extractions (not in expected)
  for (const item of items) {
    if (!(item.id in expected) && item.id !== 'classificationType') {
      results.unexpected++
      results.details.push({ field: item.id, status: 'EXTRA', extracted: item.value })
    }
  }

  return results
}

// ---------------------------------------------------------------------------
// Evaluate narrative quality
// ---------------------------------------------------------------------------
function evaluateNarrative(story) {
  const checks = {
    hasWhatHeading: /^What:/m.test(story || ''),
    hasWhoHeading: /^Who:/m.test(story || ''),
    hasWhenHeading: /^When:/m.test(story || ''),
    hasWhatToDoHeading: /^What to do:/m.test(story || ''),
    isNotEmpty: (story || '').length > 50,
    noPlaceholders: !/\{[A-Z_]+\}/.test(story || ''), // shouldn't invent placeholders
    noMetaLanguage: !/\b(the user|as described|mentioned above|the event|communicated)\b/i.test(story || ''),
    hasConcreteDetails: /\d/.test(story || '') || /[A-Z]{2,}/.test(story || ''), // numbers or acronyms
  }
  const score = Object.values(checks).filter(Boolean).length
  return { score, total: Object.keys(checks).length, checks }
}

// ---------------------------------------------------------------------------
// Main test runner
// ---------------------------------------------------------------------------
async function runTests() {
  console.log('='.repeat(70))
  console.log('  IRIS EVENT STORY BUILDER — PIPELINE EVALUATION')
  console.log('  Model: mistralai/ministral-3-14b-reasoning (LM Studio)')
  console.log('='.repeat(70))
  console.log()

  const allResults = []

  for (const scenario of SCENARIOS) {
    console.log(`\n${'─'.repeat(70)}`)
    console.log(`  ${scenario.name}`)
    console.log(`  Tech Level: ${scenario.techLevel} | ${scenario.description}`)
    console.log(`${'─'.repeat(70)}`)

    // Build checklist with already-known answers from selectedOptions
    const checklist = createChecklist()
    // Pre-fill event_kind from first question's selected option
    const firstQ = scenario.conversation[0]
    if (firstQ.selectedOptions.length > 0) {
      const kindMap = {
        'System change or maintenance': 'system_change',
        'Error or issue': 'error_issue',
        'User-triggered action': 'user_action',
        'Process or status update': 'process_update',
      }
      const kind = kindMap[firstQ.selectedOptions[0]]
      if (kind) {
        const item = checklist.find(i => i.id === 'event_kind')
        item.filled = true; item.value = kind; item.verified = true
      }
    }
    // Pre-fill error_location if selected
    for (const entry of scenario.conversation) {
      const locMap = {
        'In a specific form field': 'specific_field',
        'On the whole page or screen': 'whole_page',
        'In a background process': 'background',
        'In an API call or integration': 'api',
      }
      if (entry.selectedOptions.length > 0 && locMap[entry.selectedOptions[0]]) {
        const item = checklist.find(i => i.id === 'error_location')
        item.filled = true; item.value = locMap[entry.selectedOptions[0]]; item.verified = true
      }
      // Pre-fill security
      if (entry.question.includes('security') && entry.selectedOptions.length > 0) {
        const item = checklist.find(i => i.id === 'security')
        item.filled = true; item.value = entry.selectedOptions[0] === 'Yes' ? 'yes' : 'no'; item.verified = true
      }
    }

    const systemPrompt = buildSystemPrompt(checklist)
    const userMessage = buildUserMessage(scenario.conversation)

    console.log('\n  Calling LLM...')
    const { raw, duration } = await callLLM(systemPrompt, userMessage)
    console.log(`  Response time: ${(duration / 1000).toFixed(1)}s`)

    // Parse response
    const parsed = robustParse(raw)
    const parseSuccess = parsed !== null
    console.log(`  JSON parse: ${parseSuccess ? 'OK' : 'FAILED'}`)

    if (!parseSuccess) {
      console.log(`  Raw (first 300): ${raw.substring(0, 300)}`)
      allResults.push({
        scenario: scenario.name,
        parseSuccess: false,
        extractionScore: 0,
        narrativeScore: 0,
        classificationCorrect: false,
        duration,
      })
      continue
    }

    const items = parsed.items || []
    const story = parsed.story || null

    // Merge extracted items into checklist for classification
    for (const ext of items) {
      const cl = checklist.find(i => i.id === ext.id)
      if (cl && !cl.filled) {
        cl.filled = true; cl.value = ext.value; cl.verified = false
      }
    }

    // --- Extraction evaluation ---
    const extraction = evaluateExtraction(items, scenario.expected, scenario)
    const totalExpected = Object.keys(scenario.expected).filter(k => k !== 'classificationType').length
    const extractionScore = totalExpected > 0 ? (extraction.correct / totalExpected * 100) : 0

    console.log(`\n  EXTRACTION: ${extraction.correct}/${totalExpected} correct (${extractionScore.toFixed(0)}%)`)
    if (extraction.incorrect > 0) console.log(`    ${extraction.incorrect} incorrect`)
    if (extraction.missed > 0) console.log(`    ${extraction.missed} missed`)
    if (extraction.unexpected > 0) console.log(`    ${extraction.unexpected} extra (bonus)`)
    for (const d of extraction.details) {
      const icon = d.status === 'OK' ? '  ✓' : d.status === 'EXTRA' ? '  +' : '  ✗'
      const info = d.status === 'OK' ? d.extracted
        : d.status === 'WRONG' ? `got "${d.extracted}" expected "${d.expected}"`
        : d.status === 'MISSED' ? `expected "${d.expected}"`
        : d.extracted
      console.log(`    ${icon} ${d.field}: ${info}`)
    }

    // --- Narrative evaluation ---
    const narrative = evaluateNarrative(story)
    console.log(`\n  NARRATIVE: ${narrative.score}/${narrative.total} checks passed`)
    for (const [check, passed] of Object.entries(narrative.checks)) {
      console.log(`    ${passed ? '✓' : '✗'} ${check}`)
    }
    if (story) {
      const preview = story.replace(/\n/g, ' ').substring(0, 150)
      console.log(`    Preview: "${preview}..."`)
    }

    // --- Classification evaluation ---
    const classification = deriveClassification(checklist)
    const classificationCorrect = classification?.type === scenario.expected.classificationType
    console.log(`\n  CLASSIFICATION: ${classificationCorrect ? '✓ CORRECT' : '✗ WRONG'}`)
    console.log(`    Expected: ${scenario.expected.classificationType}`)
    console.log(`    Got: ${classification?.type || 'null'} / ${classification?.severity || 'N/A'}`)
    if (classification?.channels) console.log(`    Channels: ${classification.channels.join(', ')}`)

    allResults.push({
      scenario: scenario.name,
      techLevel: scenario.techLevel,
      parseSuccess,
      extractionScore,
      extractionCorrect: extraction.correct,
      extractionTotal: totalExpected,
      extractionMissed: extraction.missed,
      extractionWrong: extraction.incorrect,
      narrativeScore: narrative.score,
      narrativeTotal: narrative.total,
      classificationCorrect,
      classificationType: classification?.type,
      severity: classification?.severity,
      duration,
    })
  }

  // ---------------------------------------------------------------------------
  // Summary statistics
  // ---------------------------------------------------------------------------
  console.log('\n\n' + '='.repeat(70))
  console.log('  SUMMARY STATISTICS')
  console.log('='.repeat(70))

  const n = allResults.length
  const parsed = allResults.filter(r => r.parseSuccess).length
  const avgExtraction = allResults.reduce((s, r) => s + r.extractionScore, 0) / n
  const avgNarrative = allResults.filter(r => r.parseSuccess).reduce((s, r) => s + (r.narrativeScore / r.narrativeTotal * 100), 0) / parsed
  const classCorrect = allResults.filter(r => r.classificationCorrect).length
  const avgDuration = allResults.reduce((s, r) => s + r.duration, 0) / n

  console.log(`\n  Scenarios tested:       ${n}`)
  console.log(`  JSON parse success:     ${parsed}/${n} (${(parsed/n*100).toFixed(0)}%)`)
  console.log(`  Avg extraction score:   ${avgExtraction.toFixed(1)}%`)
  console.log(`  Avg narrative quality:  ${avgNarrative.toFixed(1)}%`)
  console.log(`  Classification correct: ${classCorrect}/${n} (${(classCorrect/n*100).toFixed(0)}%)`)
  console.log(`  Avg response time:      ${(avgDuration/1000).toFixed(1)}s`)

  console.log('\n  Per-scenario breakdown:')
  console.log('  ' + '─'.repeat(68))
  console.log(`  ${'Scenario'.padEnd(38)} ${'Extract'.padStart(8)} ${'Narr'.padStart(6)} ${'Class'.padStart(6)} ${'Time'.padStart(6)}`)
  console.log('  ' + '─'.repeat(68))
  for (const r of allResults) {
    const name = r.scenario.substring(0, 36).padEnd(38)
    const ext = r.parseSuccess ? `${r.extractionScore.toFixed(0)}%`.padStart(8) : 'FAIL'.padStart(8)
    const nar = r.parseSuccess ? `${(r.narrativeScore/r.narrativeTotal*100).toFixed(0)}%`.padStart(6) : 'FAIL'.padStart(6)
    const cls = (r.classificationCorrect ? '✓' : '✗').padStart(6)
    const time = `${(r.duration/1000).toFixed(1)}s`.padStart(6)
    console.log(`  ${name} ${ext} ${nar} ${cls} ${time}`)
  }
  console.log('  ' + '─'.repeat(68))

  // Extraction detail by field
  console.log('\n  Extraction by field (across all scenarios):')
  const fieldStats = {}
  for (const r of allResults) {
    if (!r.parseSuccess) continue
    // Need to re-derive from the details... let's collect from scenarios
  }

  console.log('\n  Key findings:')
  const lowExtraction = allResults.filter(r => r.extractionScore < 50)
  if (lowExtraction.length > 0) {
    console.log(`  ⚠ ${lowExtraction.length} scenario(s) had extraction below 50%:`)
    for (const r of lowExtraction) console.log(`    - ${r.scenario} (${r.extractionScore.toFixed(0)}%)`)
  }
  const lowNarrative = allResults.filter(r => r.parseSuccess && r.narrativeScore / r.narrativeTotal < 0.5)
  if (lowNarrative.length > 0) {
    console.log(`  ⚠ ${lowNarrative.length} scenario(s) had narrative quality below 50%`)
  }
  const wrongClass = allResults.filter(r => !r.classificationCorrect)
  if (wrongClass.length > 0) {
    console.log(`  ⚠ ${wrongClass.length} scenario(s) had wrong classification:`)
    for (const r of wrongClass) console.log(`    - ${r.scenario}: expected ${SCENARIOS.find(s => s.name === r.scenario)?.expected.classificationType}, got ${r.classificationType}`)
  }
  if (lowExtraction.length === 0 && lowNarrative.length === 0 && wrongClass.length === 0) {
    console.log('  ✓ All scenarios passed with good quality!')
  }

  console.log()
}

runTests().catch(err => {
  console.error('Test runner failed:', err)
  process.exit(1)
})
