# Content Design Principles

The rules that govern how the LLM Serving platform communicates with its users. Apply these principles when writing message content, action labels, and templates for any delivery type.

---

## Why this matters

Users encounter platform messages in stressful moments — something broke, something changed, something needs their attention. Inconsistent or unclear writing makes these moments worse. These principles ensure every message across the platform follows the same standards, regardless of who writes it.

---

## Language

**Plain language.** Write for people who are busy and scanning. Avoid jargon unless the audience is exclusively technical — and even then, prefer clarity.

**Active voice.** Say who does what. "The system revoked your API key" not "Your API key has been revoked."

**Specific over vague.** "GPT-4 is unavailable" not "A model is experiencing issues." Include names, numbers, and timeframes when available.

**No ambiguity.** No double negatives, no hedging. If something is uncertain, say so plainly: "We're investigating" not "There may potentially be an issue."

**Concise.** Every word earns its place. If you can say it in fewer words without losing meaning, do it.

---

## Tone

Professional, clear, and empathetic. Write as a competent colleague who respects the reader's time.

### General

| Do | Don't | Example |
|---|---|---|
| State facts directly | Alarm or dramatize ("URGENT!", "CRITICAL FAILURE!") | "GPT-4 is unavailable since 14:30 CET." |
| Acknowledge impact on the user | Dismiss or minimize ("just", "simply", "minor issue") | "This may affect your current requests." |
| Be specific about what happened | Be vague ("something went wrong") | "Your API quota has reached 85%." |
| Offer a path forward | Leave the user without a next step | "Increase your quota to avoid interruption." |
| Explain neutrally when something fails | Blame the user ("You entered an invalid…") | "This email address is not valid." |

### Tone by type

The register shifts with the communication type. All types stay professional — but the level of detail and urgency varies.

| Type | Register | Example |
|---|---|---|
| Notification (Critical) | Direct, urgent, action-focused | "All models are currently unavailable. Our team is working on recovery." |
| Notification (High) | Clear and prompt | "GPT-4 is currently unavailable. We expect restoration within 2 hours." |
| Notification (Medium) | Informative with a clear ask | "Your API quota has reached 85%. Increase your quota to avoid interruption." |
| Notification (Low) | Brief and neutral | "Llama 3.1 has been added to the model catalog." |
| Error & Warnings | Helpful, not blaming — explain what went wrong and how to fix it | "Request failed — the API key has expired. Generate a new key to continue." |
| Validation Messages | Instructive, guiding — tell users exactly what to enter | "Must be 3–50 characters" |
| Transactional Confirmation | Confident, confirming — assure the user it worked | "API key created. Copy it now — it won't be shown again." |
| Feedback | Minimal, confirming — just enough to acknowledge | "Settings saved." |
| Status Display | Neutral, factual — report the state without editorial | "API Status: Operational" |
| API Response | Technical, direct — machine-readable hints, no apologies | "Service unavailable. Retry after 2026-03-05T04:00:00Z." |

---

## Information hierarchy

Every message follows the same order, most important information first:

1. **What happened** — the event, in one sentence
2. **Who is affected** — scope, if not obvious (all users, specific teams, admins)
3. **What to do** — the action, or explicit "no action required"
4. **When** — timeframe, deadline, or expected resolution

A user who reads only the first line should still understand the essential information.

**Exception — Feedback and Validation:** These types are so short that hierarchy collapses to a single statement. The message IS the hierarchy.

---

## Actionability

Always state the next step. Even when no action is needed — say it explicitly. Never leave a user wondering.

Make the action immediate. Don't describe what to do in body text and expect users to find it themselves. Provide a direct link or button.

### Action labels

Buttons and links are part of the message. Users should never guess what a button will do.

**Verb-first.** Labels describe what happens on click.

| Do | Don't |
|---|---|
| View details / Details anzeigen | Details |
| Increase quota / Kontingent erhöhen | Quota settings |
| Download report / Bericht herunterladen | Report |
| Dismiss / Schließen | X |

**Short.** Maximum 3 words or 25 characters.

**One primary, one secondary, always a dismiss.** Every message with actions follows this hierarchy:

- **Primary action** — the most important thing to do
- **Secondary action** — an alternative (optional)
- **Dismiss** — always available, users must be able to close without acting

**Consistent.** The same action uses the same label everywhere. "View details" in one notification means "View details" in every notification — not "See more" or "Show info." Document agreed labels in the event templates.

---

## Title and subject line conventions

Banners and emails need a title or subject. Keep them factual and scannable.

**Pattern:** [Status/Action]: [What] — [Scope or timeframe]

| Context | EN | DE |
|---|---|---|
| Email subject (action needed) | Action required: API quota at 85% | Handlungsbedarf: API-Kontingent bei 85 % |
| Email subject (informational) | New model available: Llama 3.1 | Neues Modell verfügbar: Llama 3.1 |
| Banner title | GPT-4 unavailable — estimated recovery 14:30 CET | GPT-4 nicht verfügbar — voraussichtlich wiederhergestellt um 14:30 MEZ |

Use "Action required" / "Handlungsbedarf" only when user action is genuinely needed.

---

## Writing guidance by type

Each of the six communication types has distinct writing requirements. This section provides type-specific guidance for tone, structure, and common patterns.

### Feedback

**Purpose:** Acknowledge the user's action and maintain interaction flow. Brief, transient, auto-dismissing.

**Tone:** Minimal and confirming. The shortest possible statement that still tells the user what happened.

**Structure:** Single statement. No title, no CTA (except optional undo). State what happened in past tense or present confirmation.

| Do | Don't |
|---|---|
| "Settings saved" | "Your settings have been successfully saved!" |
| "Copied to clipboard" | "The API key has been copied to your clipboard" |
| "Model removed" | "The model has been removed from your favorites list" |

**Rules:**
- Maximum ~15 words. Aim for 2–4 words
- Past tense or present confirmation ("Saved", "Copied", "Deleted")
- No exclamation marks, no "successfully", no "Great!"
- Undo label: just "Undo" / "Rückgängig" — never "Undo this action"
- Toast auto-dismisses after 4 seconds; the text must be readable in that time

### Validation Messages

**Purpose:** Guide users toward valid input during form entry. Appears inline next to the field.

**Tone:** Instructive and guiding. Tell users exactly what the system expects — never blame.

**Structure:** Two levels: helper text (proactive, shown before errors) and error message (reactive, shown when validation fails).

**Helper text rules:**
- Shown under the field before the user makes an error
- State the constraint, not what went wrong
- Use imperative or descriptive form: "Must be 3–50 characters", "Letters, numbers, and hyphens only"
- Do NOT start with "Please" — it's guidance, not a request

**Error message rules:**
- Shown when the user's input fails validation
- State what's wrong, then how to fix it
- Pattern: [What's wrong] — [how to fix] or [What's wrong]. [How to fix]
- Never blame: "Too short — minimum 3 characters" not "You entered too few characters"

| Do | Don't |
|---|---|
| "Too short — minimum 3 characters" | "The value you entered is too short" |
| "This name is already taken" | "Error: duplicate name" |
| "Required" | "This field is required and must be filled in" |

**Rules:**
- Maximum 80 characters per message
- No error codes in validation messages — those belong in API responses
- No periods at end of single-line messages
- `role="alert"` with `aria-live="polite"` — announced but not interruptive
- Helper text uses `aria-describedby` linking to the field

### Error & Warnings

**Purpose:** Communicate problems requiring user attention or corrective action. Displayed inline at the point of action.

**Tone:** Helpful, not blaming. Explain what went wrong, then offer a path forward.

**Structure:** Optional title + required message + optional action link. Title summarizes the category; message provides specifics.

| Do | Don't |
|---|---|
| "Request failed — the API key has expired. Generate a new key." | "Error 401: Unauthorized" |
| "Rate limit exceeded. Wait 60 seconds or upgrade your plan." | "Too many requests" |
| "Connection lost. Check your network and try again." | "Network error" |

**Rules:**
- Message: 1–2 sentences, max 150 characters
- Title (if used): max 60 characters, describes the category ("Request failed", "Permission denied")
- Include a recovery action: what the user can do to fix it
- If there's nothing the user can do, say so: "Our team is investigating. No action needed on your side."
- Include reference ID for server errors: `Ref: IC-20260217-a3f8` at the end
- Never show raw error codes to end users — translate to human language
- `role="alert"` with `aria-live="assertive"` — interrupts screen readers

### Transactional Confirmation

**Purpose:** Document and confirm completion of significant transactions. Serves as a receipt or record the user may need later.

**Tone:** Confident and confirming. Assure the user the action completed, then surface important details.

**Structure:** Title (what was completed) + description (key details and any values) + primary CTA + optional secondary CTA. May also include a transactional email.

| Do | Don't |
|---|---|
| "API key created" | "Your new API key has been successfully created" |
| "Copy it now — it won't be shown again" | "Please make sure to copy the key below for your records as it will not be displayed again after you leave this page" |

**Confirmation screen rules:**
- Title: past tense, max 60 characters — "API key created", "Subscription activated"
- Description: include any values the user needs (key, ID, reference number). Max 200 characters
- Primary CTA: the most important next action ("Copy key", "View receipt")
- If something can't be retrieved later, say so explicitly ("won't be shown again")

**Transactional email rules:**
- Sent when the transaction needs a persistent record (email verification, purchase confirmation, account changes)
- Subject: state what was completed or what to do — "Verify your email address", "Your API key has been created"
- Greeting: personal when possible. EN: "Hello [Name]," / DE: "Hallo [Name],"
- Body: 1–3 sentences. What was completed, key details, what to do next. Max 400 characters
- CTA: single, clear action — "Verify email" / "E-Mail bestätigen"
- Sign-off: team name. EN: "Best regards, The AIFS Platform Team" / DE: "Mit freundlichen Grüßen, Ihr AIFS Platform Team"
- Tone: professional, personal (not institutional), action-oriented
- Never include sensitive data in the email body (full API keys, passwords). Reference that details are available in-app

### Status Display

**Purpose:** Provide continuous visibility into system state or process progress. Always visible, updates automatically.

**Tone:** Neutral and factual. Report the state without editorial. No opinions, no reassurance — just data.

**Structure:** Two variants: status indicator (system state) and progress indicator (user-initiated process).

**Status indicator rules:**
- Label: what is being monitored — "API Status", "Connection", "Quota"
- Value: current state — "Operational", "Degraded", "Offline", "85%"
- Tooltip: additional context on hover — "Last checked 2 minutes ago", "3 of 5 models active"
- Keep labels and values short (max 30 characters each)
- Use consistent value terms: "Operational" / "Betriebsbereit", "Degraded" / "Eingeschränkt", "Offline"

**Progress indicator rules:**
- Label: what process is running — "Uploading file", "Training model" (present continuous)
- Status: current step or percentage — "Step 3 of 5", "67% complete"
- Completion message: shown when done — "Upload complete", "Training finished"
- German progressive: use "wird [participle]" pattern — "Datei wird hochgeladen"
- Use `role="progressbar"` with `aria-valuenow`, `aria-valuemin`, `aria-valuemax`
- `role="status"` with `aria-live="polite"` for text updates — announced at next pause

| Do | Don't |
|---|---|
| "Uploading file — 67% complete" | "Your file is currently being uploaded and is 67% done" |
| "API Status: Operational" | "Everything is working fine!" |
| "Quota: 8,500 / 10,000" | "You have used most of your quota" |

### Notification

**Purpose:** Inform users about important events, changes, or announcements. Delivered proactively through multiple channels.

**Tone:** Varies by severity (see Tone by type table). Always factual, always actionable.

**Structure:** Multi-channel. A single notification may produce text for a banner, dashboard item, email, and API response — each with different constraints and levels of detail.

**Banner rules:**
- Title: one-line headline, max 80 characters — what happened
- Description: 1–2 additional sentences, max 150 characters — context and impact
- Primary CTA: verb-first, max 25 characters
- Critical banners: must-acknowledge (cannot dismiss without clicking)
- High banners: dismissible

**Dashboard item rules:**
- Title: short label, max 60 characters
- Description: what happened + what to do, max 120 characters
- Useful as a persistent reference — users scroll through these

**Notification email rules:**

Structure: Subject → Preview → Greeting → Body → CTA → Sign-off.

Subject line formulas by severity:
- CRITICAL: `[URGENT] {Service} — {Impact}` (e.g. "[URGENT] GPT-4 — Complete outage")
- HIGH: `[Action needed] {Service} — {Issue}` (e.g. "[Action needed] API quota — Limit approaching")
- MEDIUM: `{Service} — {What changed}` (e.g. "Model catalog — Llama 3.1 now available")

| Field | Rules |
|---|---|
| Subject | Max 70 characters. Use severity formula. Must work in a crowded inbox — specific, not generic |
| Preview text | 40–90 characters. Complements the subject, doesn't repeat it. Visible in inbox list before opening |
| Greeting | Formal. EN: "Dear users," or "Dear [Team] team,". DE: "Sehr geehrte Nutzerinnen und Nutzer," or "Liebes [Team]-Team," |
| Body | 2–4 sentences, max 600 characters. Follow information hierarchy: what happened → who is affected → what to do → when. Be specific, actionable. Mention the service by name. Avoid vague language |
| CTA | Verb-first label, max 25 characters. e.g. "Check status page" / "Status-Seite aufrufen" |
| Sign-off | Include team name. EN: "Best regards, The AIFS Platform Team". DE: "Mit freundlichen Grüßen, Ihr AIFS Platform Team" |
| Tone | CRITICAL: urgent, direct. HIGH: clear, action-oriented. MEDIUM: informational, helpful |

**API Response rules:**
- Machine-readable first, human-readable second
- Message: terse, factual, max 200 characters — "Service temporarily unavailable due to scheduled maintenance. Expected resolution: 2026-03-05T04:00:00Z."
- Resolution hint: what the developer should do, max 120 characters — "Retry after the maintenance window. Monitor status at status.llmhub.com."
- Use ISO 8601 timestamps (`2026-03-05T04:00:00Z`) — never "next Tuesday" or "soon"
- No apologies, no emotional language, no exclamation marks
- Include reference ID when applicable: `"ref": "IC-20260217-a3f8"`
- Include machine-actionable fields where possible: `retry_after`, `status_url`, `deprecation_date`

**Escalation timeline rules (scheduled notifications):**
- Scheduled events may use an escalation timeline with multiple communication steps (e.g. Announcement → Reminder → Active)
- Each step has its own tone and level of urgency:
  - Early steps (7+ days before): informational, planning-focused — prepare users for the change
  - Middle steps (1 day before): urgent, action-focused — emphasize the deadline and required actions
  - At-event steps (when it starts): direct, status-update — confirm the event is in progress
  - Post-event steps (after completion): confirming, closing — summarize outcome, confirm resolution
- Generate separate text for each step. The same information shifts from "this will happen" to "this is happening" to "this has been completed"
- Step labels and timing are user-defined — respect the specific labels and relative timing provided

---

## Length constraints

Messages must work within the constraints of their channel and component.

### By component

| Component | Field | Max chars | Notes |
|---|---|---|---|
| Toast | Message | 40 | Readable within 4 seconds. 2–4 words ideal |
| Toast | Undo/Action | 15 | Single word preferred |
| Inline Message | Title | 60 | Optional heading |
| Inline Message | Message | 150 | 1–2 sentences |
| Inline Message | Action link | 25 | Verb-first |
| Field Validation | Helper text | 80 | Proactive guidance |
| Field Validation | Error message | 80 | What's wrong + how to fix |
| Confirmation Screen | Title | 60 | What was completed |
| Confirmation Screen | Description | 200 | Key details and values |
| Confirmation Screen | CTA | 25 | Primary and secondary |
| Transactional Email | Subject | 70 | What was completed or what to do |
| Transactional Email | Preview | 40–90 | Complements subject |
| Transactional Email | Body | 400 | 1–3 sentences |
| Transactional Email | CTA | 25 | Single clear action |
| Status Indicator | Label | 30 | What is being monitored |
| Status Indicator | Value | 30 | Current state |
| Status Indicator | Tooltip | 120 | Additional context |
| Progress Indicator | Label | 40 | What process is running |
| Progress Indicator | Status | 60 | Current step or percentage |
| Progress Indicator | Completion | 60 | Shown when finished |
| Banner | Title | 80 | One-line headline |
| Banner | Description | 150 | 1–2 sentences context |
| Banner | Primary CTA | 25 | Verb-first |
| Dashboard Item | Title | 60 | Short label |
| Dashboard Item | Description | 120 | What happened + what to do |
| Dashboard Item | CTAs | 25 | Primary and secondary |
| Notification Email | Subject | 70 | Severity formula |
| Notification Email | Preview | 40–90 | Complements subject |
| Notification Email | Body | 600 | 2–4 sentences |
| Notification Email | CTA | 25 | Verb-first |
| API Response | Message | 200 | Human-readable status |
| API Response | Resolution hint | 120 | Developer action |

---

## Bilingual content (EN / DE)

All messages exist in English and German. Both are equal — neither is a "translation" of the other. Write for clarity in each language independently.

### Address

Use formal address (Sie) in German. The platform communicates as a professional tool.

| EN | DE |
|---|---|
| Your API key has been revoked. | Ihr API-Schlüssel wurde widerrufen. |
| You need to update your configuration. | Sie müssen Ihre Konfiguration aktualisieren. |

### Terminology

Some terms don't translate and shouldn't be forced. Use English when it's the established standard.

**Keep in English:** API, Token, Prompt, Model (as product name), Quota, Dashboard, Deployment

**Translate:** Benutzer (user), Einstellungen (settings), Benachrichtigung (notification), Kontingent (quota in running text), Sicherheit (security)

Maintain a shared terminology list. When in doubt, use the term your users use.

---

## Capitalization

**English:** Sentence case for all UI text. Only capitalize proper nouns and the first word.

**German:** Sentence case as baseline, with standard German noun capitalization (all nouns capitalized).

| Context | EN | DE |
|---|---|---|
| Button | View details | Details anzeigen |
| Banner title | API quota at 85% | API-Kontingent bei 85 % |
| Error | Invalid email address | Ungültige E-Mail-Adresse |

---

## Punctuation

- No period at end of button labels, toasts, or single-line banners
- Period at end of multi-sentence body text and email content
- German: Non-breaking space before % and units (85 %, 14:30 Uhr) per DIN 5008

---

## Formatting

### Dates and times

| Format | EN | DE |
|---|---|---|
| Absolute date | Feb 20, 2026 | 20. Feb. 2026 |
| Absolute time | 2:30 PM CET | 14:30 MEZ |
| Relative | 5 minutes ago | Vor 5 Minuten |
| Duration | Estimated: 2 hours | Voraussichtlich: 2 Stunden |
| Deadline | Before March 1, 2026 | Bis zum 1. März 2026 |
| ISO 8601 (API) | 2026-03-05T04:00:00Z | 2026-03-05T04:00:00Z |

Always include timezone for scheduled events (CET/CEST or MEZ/MESZ). Use 24-hour format in German, 12-hour with AM/PM in English (or 24-hour in operational contexts). API responses always use ISO 8601.

### Numbers

| Convention | EN | DE |
|---|---|---|
| Decimal | 85.5% | 85,5 % |
| Thousands | 1,000 | 1.000 |
| Percentage spacing | 85% | 85 % |

### Placeholder variables

Use descriptive names in curly braces: `{model_name}`, `{quota_percentage}`, `{deadline_date}`.

Fallbacks are mandatory. Never show raw variable names or empty strings. Define a fallback for every variable (e.g., `{model_name}` → "the affected model" / "das betroffene Modell").

Position variables so the sentence works in both EN and DE word order. If word order differs significantly, write separate templates per language.

### Reference IDs

Error messages and incident notifications include a reference ID for support traceability.

**Format:** `Ref: IC-{timestamp}-{short_hash}` (e.g., Ref: IC-20260217-a3f8)

**Placement:** End of message body, visually de-emphasized (smaller text, muted color). Never in the title or subject line.

---

## Accessibility

**Screen reader roles by type:**

| Type / Component | Role | aria-live | Behavior |
|---|---|---|---|
| Notification (Critical/High banner) | `role="alert"` | `assertive` | Interrupts — captures focus |
| Notification (Medium/Low dashboard) | `role="status"` | `polite` | Announced at next pause |
| Error & Warnings | `role="alert"` | `assertive` | Interrupts — error needs attention |
| Validation (error message) | `role="alert"` | `polite` | Announced but not interruptive |
| Validation (helper text) | — | — | Linked via `aria-describedby` |
| Feedback (toast) | `role="status"` | `polite` | Announced at next pause |
| Status Display (indicator) | `role="status"` | `polite` | Announced at next pause |
| Status Display (progress) | `role="progressbar"` | `polite` | Uses `aria-valuenow/min/max` |
| Transactional Confirmation | `role="status"` | `polite` | Announced at next pause |

**ARIA labels.** Add context to ambiguous labels (e.g., `aria-label="Dismiss maintenance notification"` / `aria-label="Wartungsbenachrichtigung schließen"`).

**Color independence.** Never rely on color alone for severity. Always pair with text label (Critical / Kritisch, High / Hoch, Medium / Mittel, Low / Niedrig), icon, or both.

**Focus management.** Critical and high-severity banners capture focus on appearance. Dismiss action must be keyboard-accessible.

**Validation focus.** When a field fails validation, move focus to the first invalid field. Error message must be programmatically associated with the field via `aria-describedby`.

**Progress announcements.** Progress updates use `role="progressbar"` for percentage-based indicators. Text-based status updates use `role="status"` with `aria-live="polite"` — screen readers announce changes at the next natural pause.