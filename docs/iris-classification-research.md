# Event classification for UI messages
## Research report for the Iris Phase 1 redesign

*Covers: landscape of existing classification artifacts, UX patterns for guided flows, cognitive load and role-agnostic question design, and a concrete recommended decision tree for Iris*

---

## The core finding upfront

**A public, concrete, role-agnostic decision tree for classifying product events into UI message types barely exists.** Across 12 major design systems, 7 operations frameworks, and the academic HCI literature, only three published visual decision flowcharts were found: GitHub Primer, Lyft (Linzi Berry), and Workday Canvas. Linzi Berry wrote in 2020: "Because we couldn't find a messaging decision tree of the basics online, we decided to create our own." That statement remains accurate in 2026.

This means Iris is not solving a solved problem — it is building an artifact that the industry has consistently failed to produce. That raises the bar for getting the design right.

The second core finding: **the current Iris decision tree fails because it asks users to classify events into types, rather than asking them to describe what they observe.** Every major failure mode in the tree — ambiguous questions, overlapping options, UX jargon — flows from this single structural mistake. The fix is an inversion: users describe reality, the system does the mapping. This is the same approach that made TurboTax dominant in a domain where users have no expertise.

---

## Part 1 — What actually exists in the wild

### The three gold-standard decision trees

Only three sources publish actual visual flowcharts with branching logic that route from observable conditions to a specific notification component.

**GitHub Primer** is the most rigorous design system example. Its notification messaging pattern includes a full decision flowchart with three branches — success messaging, known-error messaging, and unknown-error messaging. The success branch asks: "Is the success of the action evident on the page?" If yes, no visual message is needed (screen-reader only). If no, it asks whether the action resulted from a save/submit, then whether the page changed, routing to Banner or InlineMessage. GitHub has explicitly banned toasts for accessibility reasons, reducing their component set to Banner, InlineMessage, and Dialog. The criteria used are genuinely observable: "evidence on page," "page change," "triggered from dialog."

**Lyft / Linzi Berry** (published 2020, "Tap to Dismiss" on Medium) provides two flowcharts: one for Informative messages and one for Decisional messages. The primary split — is the user consuming information or performing an action? — is the most distinctive first-question design found anywhere. The Informative branch then asks: responsive to user action or instructional? Brief or long? Universal or anchored? These route to Toast, Banner, Info Panel, or Tooltip. The Decisional branch asks: mandatory or optional? Promotional or utilitarian? Is background content relevant? Routing to Sheet, Prompt Screen, Prompt Panel, Alert, or Flow. This framework covers 9 component types and uses criteria that are observable and role-agnostic throughout.

**Workday Canvas** published a notification decision tree (now archived) classifying along two axes: system-generated vs. user-generated, and passive vs. actionable. It also published a separate Errors & Alerts decision tree — making it the only enterprise design system with multiple decision flowcharts for messaging.

### Design systems with structured tables but no flowcharts

A second tier provides comparison matrices — structured, but not branching.

**IBM Carbon** publishes two tables: severity statuses (Info, Success, Warning, Error) mapped to visual treatment, and seven notification types (Inline, Toast, Actionable, Callout, Banner, Notification Panel, Modal) mapped against usage context, duration, and interaction patterns. Carbon organizes types along a disruptiveness spectrum and distinguishes task-generated from system-generated. The most comprehensive matrix found in any design system.

**Salesforce Lightning** has the closest thing to a step-by-step decision process. Their framework prescribes three explicit steps: (1) determine whether the message is system-type or feedback-type, (2) pick component at the right prominence level from a defined spectrum (Inline Text → Popover → Toast → Modal → Banner → Prompt), (3) assign a state. A worked example traces "record saved" through all three steps to arrive at "Success Toast." Not a visual flowchart, but genuinely algorithmic.

**PatternFly (Red Hat)** maps Inline Alerts, Toast Alerts, and Modal Alerts against usage, placement, and persistence in a comparison table. Strongest feature: explicit "when NOT to use" guidance — "Do not use inline alerts to reflect the status of an asynchronous operation." These negation rules create implicit branching logic. Also provides the clearest synchronous-vs-asynchronous distinction as a primary criterion.

**Shopify Polaris** offers a three-column comparison table (Banner, Inline, Toast) with duration/interaction behavior. Toast is restricted to success confirmations only with 3 words or fewer — one of the most prescriptive constraints found.

**Ant Design** includes image-based decision diagrams mapping scenarios across two axes — outcome (Success/Failure/Background) and navigation (Stay/Redirect) — to specific components. Six types distinguished.

**Atlassian** provides a scenario-to-component mapping table organized by message purpose (show a feature, confirm success, report error). Five component types with clear scope, trigger, severity, and persistence distinctions.

### Design systems with prose-only guidance

**Material Design 3** — minimal 3-row table comparing Snackbar, Banner, Dialog on priority and action-required. No unified selection framework.

**Microsoft Fluent 2** — least structured of any major system. Two redirect sentences on the MessageBar page. No comparison table, no unified framework.

**Adobe Spectrum** — separate per-component pages with brief "when to use" prose. One cross-reference exists.

**Apple HIG** — strong qualitative guidance per component, all isolated, no cross-component decision logic.

**GOV.UK** — rigorous and prescriptive per component, strongest logic via negation rules, no unified framework.

### Operations frameworks: severity classification, not component selection

These solve a related but different problem — classifying incident severity rather than choosing a UI component.

**PagerDuty** — SEV-1 through SEV-5 mapped to impact scope and response protocol. Most distinctive decision rule: "Always assume the worst" — if uncertain between two levels, treat as higher severity. Defines four alert priority levels (High/Medium/Low/Notification) based on urgency of required human action.

**Google SRE** — the most sophisticated classification system found anywhere. Rather than static severity levels, uses a quantitative burn-rate model tied to SLO error budgets. Burn rate × time window → response tier (Page, Ticket, Log). Effectively an algorithmic decision tree expressed as mathematical thresholds.

**Atlassian Incident Management** — comparative 3-, 4-, and 5-tier severity models crossing capability tiers against incident type and duration.

**AWS, Azure, Datadog, Grafana** — all use numerical severity scales. Grafana offloads severity entirely to user-defined labels with tree-structured routing.

None of these frameworks include a decision tree for selecting the UI presentation of an alert — they assume the channel is predetermined and focus solely on severity.

### The one academic framework

**McCrickard & Chewar's IRC model (2003)** is the only rigorous academic framework found. It classifies notification systems along three parameters: **Interruption** (disruption to primary task), **Reaction** (response urgency), and **Comprehension** (depth of understanding required). Each rated high/low, creating a 2×2×2 design space of eight notification classes. Elegant, but operates at the level of notification *systems* (IM clients, ambient displays) rather than UI *components* (toast vs. modal). No CHI, UIST, or IUI paper was found that proposes a taxonomy mapping message characteristics to specific UI component choices. This gap is genuine.

**Nielsen Norman Group** ("Indicators, Validations, and Notifications" by Aurora Harley) provides a clean three-way classification — Indicators (passive visual cues), Validations (input-tied feedback), Notifications (system-event messages) — but no decision tree.

### Summary assessment table

| Source | Structure | Types distinguished | Observable criteria | Role-agnostic suitability |
|---|---|---|---|---|
| GitHub Primer | ✅ Visual decision flowchart | 3 | Yes | High |
| Lyft / Linzi Berry | ✅ Visual decision flowchart | 9 | Yes | High |
| Workday Canvas | ✅ Visual decision flowchart | 6 | Yes | High |
| Salesforce SLDS | ⚠️ 3-step decision process (prose) | 6 types × 4+ states | Yes | High |
| IBM Carbon | ⚠️ Classification matrix | 7 types × 4 statuses | Yes | High |
| PatternFly | ⚠️ Comparison table + negation rules | 4 | Yes | High |
| Shopify Polaris | ⚠️ Comparison table | 3 | Yes | Moderate |
| Ant Design | ⚠️ Image-based decision matrix | 6 | Yes | Moderate |
| Atlassian | ⚠️ Scenario-to-component table | 5 | Partial | Moderate |
| Material Design 3 | ⚠️ Minimal 3-row table | 3 | Partial | Low–Moderate |
| Microsoft Fluent 2 | ❌ Prose only (2 sentences) | 3 | Minimal | Low |
| Adobe Spectrum | ❌ Prose only per component | 4 | Minimal | Low |
| Apple HIG | ❌ Prose only per component | 3 | Implicit | Low |
| GOV.UK | ❌ Prose only (prescriptive) | 5+ | Via negation | Moderate |
| PagerDuty | ⚠️ Severity table | 5 severity levels | Yes | Moderate (ops-specific) |
| Google SRE | ✅ Quantitative burn-rate model | 3 tiers | Yes | Low (ops-specific) |
| McCrickard & Chewar | ✅ Formal 2×2×2 design space | 8 system classes | Yes | High (system-level only) |
| Nielsen Norman Group | ⚠️ Taxonomy (prose) | 3 categories | Yes | High |

---

## Part 2 — Why most classification trees fail

### The fundamental design error

The most common failure in classification trees — including Iris's current version — is asking users to think in categories instead of asking them to describe what they observe. This forces users to understand the taxonomy they are trying to navigate. The result: ambiguous questions, overlapping options, and answers that depend on UX knowledge the user may not have.

**A developer who wrote a background job doesn't think "is this a Notification or Status Display?" They think "this runs on a schedule and appears in the dashboard when done." The current tree's questions assume the former framing and fail on the latter.**

### The TurboTax inversion

The single most important pattern from the research is the TurboTax inversion: the system should classify the event, not the user. TurboTax — which holds ~60% market share in a domain where users have zero tax expertise — never asks "Which tax form applies?" It asks "Did you buy or sell any stocks this year?" The system determines that Schedule D applies. Users describe their reality; the tool does the mapping.

Applied to Iris: instead of "Is this a Transactional Confirmation or Feedback?", the tree asks "Would the user ever need to find this information again?" The answer routes to the correct type without the user ever seeing the type name during classification.

### Behavioral anchoring eliminates the jargon problem

The most effective technique for role-agnostic classification is behavioral anchoring: replacing abstract labels with descriptions of specific observable behaviors. Research on Behaviorally Anchored Rating Scales found teams using behavioral anchors achieved 25% higher inter-rater agreement than teams using generic labels.

Every Iris question should reference something anyone can see on screen — a click, a form field, a message that disappears, information needed later — rather than anything requiring interpretation.

Concrete translations for the four hardest Iris classification problems:

**Feedback vs. Transactional Confirmation**
- ❌ "Does the user need a record of this?" (abstract — "record" is UX jargon)
- ✅ "Would the user ever need to come back and find this information later?"
- ✅ "Does this involve money, a commitment, or something the user can't easily undo?"
- ✅ "If the user walked away and missed this message, would that cause a real problem?"

**Status Display vs. Notification**
- ❌ "Is this an ongoing state or a discrete event?" (abstract temporal framing)
- ✅ "Is this like a speedometer (showing current speed right now) or a text message (telling you something just happened)?"
- ✅ "If you refreshed the page, would this information still be there showing the same thing?"

**Error & Warning vs. Notification**
- ❌ "Is this user-action-triggered or system-triggered?" (ambiguous for automated actions)
- ✅ "Can you point to the specific button click or form submission that caused this message?"
- ✅ "If the user had done nothing and just sat there, would this message still have appeared?" (the "AFK test")

**User-triggered vs. System-triggered edge cases**
- ❌ "Was this triggered by the user or the system?" (breaks for cron jobs, automations)
- ✅ "Right before this message appeared, was the user actively doing something?"
- Governing principle: **"Who pressed the button right now?" — not "Who set this up originally?"**

### How question order determines accuracy

Research consistently shows the first question carries disproportionate weight. TurboTax's "life events tile" screen asks users to multi-select major life changes before any detailed questions. This broadest-first strategy eliminates irrelevant branches immediately and prevents confusion from compounding downstream.

For Iris, the optimal first question is not the trigger question (user vs. system) but the **form field check** — because Validation Message is the most distinctive and least ambiguous type. Asking this first isolates it cleanly and prevents the common misclassification of inline field errors as Error & Warning.

### Role diversity requires observable questions, not role-specific paths

A PM thinks about user stories, a developer thinks about API responses, an incident responder thinks about severity. These are radically different mental models. Two strategies handle this:

**Observable questions as universal language.** "Did the user just click something?" is answerable regardless of role. "Is this a feedback pattern?" is not. Every question must reference what anyone can see on screen.

**Concrete scenarios at every decision point.** At each question, show 2–3 examples. When asking "Would the user need to find this later?", show: "Like an order confirmation with a tracking number (yes)" vs. "a 'Saved!' message that fades away (no)." IBM Carbon's tables and Lyft's decision tree both use this pattern to bridge role diversity.

A role-specific paths approach — different entry points for PMs vs. developers — adds complexity without proportionate benefit. Behavioral questions make role-specific paths unnecessary.

### Decision fatigue has hard limits

Working memory holds 7 ± 2 items, but classification decisions should tax it minimally. Research constraints:

- **3–5 steps is the optimal range.** Oracle guidelines cite abandonment risk beyond 5 steps. Andrew Coyle (ex-Google, Flexport) sets 10 as absolute maximum.
- **2–4 options per step.** Hick's Law: decision time increases logarithmically with choices. Binary questions produce the fastest, most reliable decisions.
- **Each step should take under 10 seconds.** If a question requires significant deliberation, it is either too abstract or ambiguous.
- **Progress indicators are mandatory.** NN/g confirms they foster a sense of accomplishment that motivates continuation.

---

## Part 3 — Patterns worth stealing from existing tools

### From GitHub Primer
- **Negative-space logic.** "Is the success evident on the page?" — routing to "no visual message needed" as a valid outcome. Iris should consider this: some events don't need a UI message at all.
- **Explicit toast ban.** Primer's decision to remove toasts entirely resolved a persistent ambiguity. Iris could consider whether any of its six types can be consolidated.

### From Lyft / Linzi Berry
- **Informative vs. Decisional as first split.** Does the user consume information or perform an action? This is a cleaner primary axis than "user-triggered vs. system-triggered" for the component selection problem.
- **Anchored vs. universal scope.** A dimension that Carbon also uses — is this message tied to a specific context on screen or floating above all content?

### From IBM Carbon
- **Task-generated vs. system-generated as organizing axis.** Carbon uses this as the primary organizational dimension across its notification matrix. Directly transferable to Iris's Q2.
- **Disruptiveness spectrum.** Inline → Toast → Actionable → Callout → Banner → Modal. A secondary ordering dimension useful for teams that want to think about intrusiveness after classification.

### From Salesforce Lightning
- **Three-step explicit process.** Type → Component → State. Iris's three-phase architecture (Classify → Describe → Generate) mirrors this and is structurally sound.
- **Worked examples per event type.** Salesforce traces a concrete event through all three steps as a reference. Iris should do the same at the classification result screen.

### From PatternFly
- **Synchronous vs. asynchronous** as a primary criterion. PatternFly is the only design system that makes this explicit. "Did the user trigger this right now and wait for it?" vs. "Did this arrive from a background process?" Directly maps to Iris's trigger question.
- **"When NOT to use" rules.** Negation is often cleaner than affirmation for overlapping categories. Iris's result screens should include explicit "not this type if..." guidance.

### From PagerDuty
- **"Assume the worst" default.** When classification is uncertain, default to the more urgent/persistent category. For Iris: Feedback ↔ Transactional Confirmation defaults to Transactional Confirmation. Status Display ↔ Notification defaults to Status Display.
- **Metric-driven definitions.** Tie classifications to objective criteria, not subjective judgment. The persistence test ("would they need this later?") is Iris's equivalent of PagerDuty's "% users affected" threshold.
- **Severity can be upgraded.** PagerDuty allows reclassification as situations evolve. Iris should make reclassification frictionless — one click to re-run the tree.

### From Linear
- **Opinionated constraints.** Four priority levels, not customizable. Iris's six types should be fixed and not extensible per team.
- **Triage staging.** Classification as a deliberate review step, not a forced field at creation time.
- **Visible AI reasoning.** Linear's Triage Intelligence shows why it suggests a classification. If Iris adds smart suggestions, always surface the reasoning.

### From TurboTax
- **Returning user intelligence.** TurboTax compares with previous returns to pre-fill answers. For Iris, if a product area has previously classified events, suggest the most common type as a starting point.
- **Context-setting before detail.** TurboTax's life-events tile screen eliminates irrelevant branches before users encounter them.
- **Screen layout mirroring.** TurboTax mirrors the physical layout of tax documents. For Iris, show the UI context where the event appears alongside the classification question — a screenshot or wireframe of where the message shows up.

---

## Part 4 — The recommended Iris decision tree

### Complete behavioral decision tree

This tree uses only observable, behavioral questions. It reaches any of the six Iris types in 3–4 questions maximum. Every question is binary.

```
START: "You have a product event that communicates something to the user."

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Q1 — FORM FIELD CHECK  (isolates Validation Message early)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

"Is this message helping the user fill in a specific form field
correctly — like format hints, required-field warnings,
or character limits?"

  → YES → ✅ VALIDATION MESSAGE
  → NO  → Go to Q2

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Q2 — PROXIMATE TRIGGER  (highest-leverage binary split)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

"Right before this appeared, was the user actively doing
something — clicking a button, submitting a form, saving,
uploading?"

  → YES → Go to Q3  (user-action path)
  → NO  → Go to Q5  (system path)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Q3 — SUCCESS OR FAILURE  (user-action path)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

"Did the user's action fail, or is this warning them about
a problem?"

  → YES → ✅ ERROR & WARNING
  → NO  → Go to Q4

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Q4 — PERSISTENCE TEST  (Feedback vs. Transactional Confirmation)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

"Would the user ever need to find this information again —
for proof, a reference number, or follow-up steps?"

  → YES → ✅ TRANSACTIONAL CONFIRMATION
  → NO  → ✅ FEEDBACK

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Q5 — ONGOING VS. DISCRETE  (system path)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

"Is this showing a current condition that could change over
time — like a gauge, progress bar, or status badge?"

  → YES → ✅ STATUS DISPLAY
  → NO  → ✅ NOTIFICATION
```

### Why this sequence works

The tree is ordered by discriminating power — each question eliminates the maximum number of remaining categories:

**Q1 isolates Validation Message first** because it is the most distinctive type. It is the only type tied to a specific form field during data entry. Asking this first prevents the common downstream confusion where "field-level error while typing" gets classified as Error & Warning.

**Q2 is the highest-leverage split** because it cleanly divides the remaining five types into two groups: user-triggered (Feedback, Error & Warning, Transactional Confirmation) and system-triggered (Status Display, Notification). This split is supported by IBM Carbon, Salesforce Lightning, Lyft, and Workday as the primary organizing dimension.

**Q3 separates failure from success** within user-triggered events. This is unambiguous — either something went wrong or it didn't.

**Q4 resolves Feedback/Transactional Confirmation** using the persistence test rather than UX jargon. "Would they need this later?" is grounded in real consequences.

**Q5 resolves Status Display/Notification** using the "gauge vs. announcement" framing. The speedometer-vs-text-message analogy can be included as helper text.

### MECE validation

| Potential overlap | How the tree resolves it |
|---|---|
| Feedback ↔ Transactional Confirmation | Q4: "Need to find later?" — either there's a reference number/receipt or there isn't |
| Error & Warning ↔ Notification | Q2: Proximate user action separates them before "something went wrong" question arises |
| Status Display ↔ Notification | Q5: "Current condition that changes" vs. "specific announcement" — the refresh test clarifies |
| Validation Message ↔ Error & Warning | Q1: Field-level guidance during entry vs. action-level failure after submission |

### Edge case guidance for the trigger question

Include this as collapsible help text at Q2:

| Scenario | Q2 answer | Reasoning |
|---|---|---|
| Scheduled report the user set up | NO — system | The clock triggered it, not a click |
| Cron job completing | NO — system | Background automation |
| Background sync finishing | NO — system | No proximate user action |
| Auto-save firing | NO — system | Timer triggered, not user |
| User clicks "Generate Report," result arrives 2 min later | YES — user | A specific click started the chain |
| Webhook from external system | NO — system | External system initiated |
| User's automation rule fires | NO — system | Rule engine triggered it; user configured it in the past |

Governing principle: **"Who pressed the button right now?" — not "Who set this up originally?"**

---

## Part 5 — Scenario walk-throughs validating the tree

### User-action path

| Event | Q1 | Q2 | Q3 | Q4 | Result |
|---|---|---|---|---|---|
| User clicks Save on a document | No | Yes | No | No — the doc itself is proof | **Feedback** ✅ |
| User places an order | No | Yes | No | Yes — order number, receipt | **Transactional Confirmation** ✅ |
| User changes notification preferences | No | Yes | No | No — settings page reflects it | **Feedback** ✅ |
| User submits a support ticket | No | Yes | No | Yes — ticket number for follow-up | **Transactional Confirmation** ✅ |
| User adds item to cart | No | Yes | No | No — cart badge shows it | **Feedback** ✅ |
| Form submission returns "Invalid email" | No | Yes | Yes | — | **Error & Warning** ✅ |
| File upload fails: "File too large" | No | Yes | Yes | — | **Error & Warning** ✅ |
| Payment declined after checkout | No | Yes | Yes | — | **Error & Warning** ✅ |
| User signs a digital contract | No | Yes | No | Yes — legal proof needed | **Transactional Confirmation** ✅ |
| Email field shows "Must be valid email" while typing | Yes | — | — | — | **Validation Message** ✅ |
| Password field shows strength indicator | Yes | — | — | — | **Validation Message** ✅ |

### System path

| Event | Q1 | Q2 | Q5 | Result |
|---|---|---|---|---|
| "All Systems Operational" badge | No | No | Yes — current state gauge | **Status Display** ✅ |
| Build pipeline: Running/Passed/Failed | No | No | Yes — current build state | **Status Display** ✅ |
| CPU usage dashboard showing 78% | No | No | Yes — current metric | **Status Display** ✅ |
| "New comment on your PR" | No | No | No — announcement | **Notification** ✅ |
| "Scheduled maintenance Saturday 2am" | No | No | No — future event announcement | **Notification** ✅ |
| "Your monthly report is ready" | No | No | No — one-time announcement | **Notification** ✅ |
| "Your API key expires in 7 days" | No | No | No — announcement | **Notification** ✅ |
| "Unusual login detected" | No | No | No — announcement | **Notification** ✅ |

**Noted edge cases:**

Upload progress bar: The user started the upload, but the progress bar shows ongoing system state persisting independently of further user action. Route via Q2 → Yes (user started it) → Q3 → No (not failure) → Q4 → No (user doesn't need progress bar later) → **Feedback** for the initial acknowledgment. The ongoing progress indicator is **Status Display**. Include guidance: "For long-running processes the user started, the initial acknowledgment is Feedback; the ongoing progress indicator is Status Display."

Service degradation banner: Could be Status Display (ongoing condition) or Notification (announcing a problem). The refresh test resolves it: if refreshing shows the same degraded state, it is Status Display. If it is a one-time banner that announced the degradation event, it is Notification. This depends on UI implementation — flag as an edge case.

---

## Part 6 — Interaction design recommendations

### One question per screen

The GOV.UK "One Thing Per Page" pattern reduces cognitive load and ensures each question can be written in the simplest possible language. Show the question prominently with two clearly labeled buttons — not radio buttons requiring a separate "Next" click.

### Concrete examples at every question

Below each answer option, show 1–2 real-world examples as gray helper text. For Q4, show: *"Yes — like an order confirmation with a tracking number"* and *"No — like a 'Saved!' message that fades away."* This is the pattern used in Workday Canvas and the Lyft decision tree to bridge role diversity.

### Visual result with "show your work"

When the tree reaches a classification, show: (1) the type name, (2) a brief plain-language description, (3) the UI pattern it maps to with a screenshot or illustration, and (4) the path taken — "You said: the user was active → the action succeeded → they don't need this info later → **Feedback (toast)**." This builds confidence and enables self-correction.

### Back button at every step, no penalties

NN/g and W3C accessibility guidelines are emphatic: never lose user work on back navigation. Label back buttons descriptively ("Change my answer about the trigger") rather than generically ("Previous").

### "I'm not sure" escape hatch at every question

At each step, include a collapsible "Help me decide" section with 3–4 example scenarios for each answer. If the user is still stuck, offer a "None of these feel right" option that routes to a brief description field and flags the event for manual review. This prevents forced misclassification.

### "When in doubt" tiebreaker guidance

Borrowing from PagerDuty's "assume the higher severity" principle, include explicit tiebreaker text: "Not sure? Default to the more persistent/structured option. You can always reclassify later."

Specific defaults:
- Feedback ↔ Transactional Confirmation → default to **Transactional Confirmation**
- Status Display ↔ Notification → default to **Status Display**

---

## Part 7 — Anti-patterns to avoid

**Do not use type names in questions.** The user should never see "Feedback," "Transactional Confirmation," or "Status Display" until the final result screen. Using taxonomy terms during classification forces users to understand what they are trying to navigate.

**Do not ask "why" questions.** The "5 Whys" technique is designed for root cause analysis, not classification. It is divergent when classification needs to be convergent. Stick to "what happened?" not "why did it happen?"

**Do not present all six types simultaneously.** A dropdown of six options forces users to compare all options against each other — O(n²) cognitive complexity. The binary tree reduces this to O(log n): three to four sequential yes/no decisions.

**Do not allow free-text classification.** Flexible user-defined categories lead to inconsistency at scale. Iris's six types should be fixed, not extensible.

**Do not couple classification to event creation.** Require classification at a meaningful transition point — before design implementation begins — rather than at the moment an event is logged. Linear and Intercom both enforce classification at transitions rather than at creation.

**Do not skip the form field question.** The most common misclassification in message taxonomies is conflating inline validation ("Must be a valid email" while typing) with post-submission errors ("Your submission failed"). Asking about form fields first — before any other question — prevents this.

**Do not remove the path summary from the result screen.** Teams that show only the classification outcome without the reasoning path produce lower confidence and higher reclassification rates. Show the chain of answers.

---

## Conclusion

Three changes matter most:

**Replace all type-name-based questions with behavioral questions.** Every question should reference something visible: a click, a form field, a message that disappears, information needed later. The recommended tree achieves this in 3–4 binary questions. Validate it by running 30 real product events through the tree with PMs, developers, and incident responders — target 80%+ agreement before shipping.

**Reorder the tree to ask the most discriminating question first.** Starting with the form-field check (isolates Validation Message) and then the proximate-trigger split (separates user-action types from system types) eliminates the most categories earliest. This prevents ambiguity from compounding downstream.

**Add concrete examples and escape hatches at every node.** The difference between a good decision tree and a great one is not the logic — it is the support. Show real-world scenarios at every question. Include "Help me decide" sections. Provide "When in doubt" defaults. Show the classification path at the end so users can self-verify. These are the mechanisms that make the tree work for people who are not trained UX designers.

---

*Research compiled March 2026 for the Iris Phase 1 redesign. Sources: IBM Carbon Design System, Salesforce Lightning, GitHub Primer, PatternFly (Red Hat), Shopify Polaris, Ant Design, Atlassian Design System, Material Design 3, Microsoft Fluent 2, Adobe Spectrum, Apple HIG, GOV.UK Design System, Lyft / Linzi Berry "Tap to Dismiss," Workday Canvas, PagerDuty Incident Response Documentation, Google SRE Workbook, Atlassian Incident Management, McCrickard & Chewar (2003), Nielsen Norman Group, Smashing Magazine.*
