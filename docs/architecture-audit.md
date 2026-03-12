# Architecture Audit: Hybrid Classification Model

*Conducted: 2026-03-12*
*Audited document: `docs/architecture-evolution.md`*
*Assessed against: (1) `docs/iris-classification-research.md`, (2) project knowledge, (3) industry best practices*

---

## Executive Summary

The hybrid architecture (structured clicks → LLM normalization → rule-based classification) is **conceptually strong** and addresses real problems in the Phase 1 v1 tree. The TurboTax inversion ("users describe, system classifies") is the research's most important recommendation, and the new architecture implements it correctly. Deterministic rules remain in control of classification — a critical safety property.

The audit initially identified three high-risk areas and four moderate gaps. After clarifications from the product owner, the risk profile has been revised to **zero high-risk areas**, **five moderate gaps**, and **two resolved items**:

| Risk | Concern | Recommendation |
|---|---|---|
| 🟡 MEDIUM | Three-way domain split needs behavioral wording | Conceptual model is sound; user-facing labels need work (acknowledged as open item) |
| 🟢 RESOLVED | LLM normalization fallback defined (Decision #26) | Always-confirm pattern: user always confirms LLM mapping. Confirm step IS the fallback. |
| 🟢 RESOLVED | Form field check (Validation Message) scope clarified | Validation only applies to Management path (UI); Core value and Capability are headless services |
| 🟡 MEDIUM | Severity inflation risk from removing scope | Add scope modifier within HIGH for channel differentiation |
| 🟡 MEDIUM | Loss of progressive narrowing feedback | Add classification hints during data collection |
| 🟡 MEDIUM | No validation target defined | Set 30-event, 80% inter-rater agreement target |
| 🟡 MEDIUM | Negation rules ("this is NOT...") missing | Add "when NOT to use" guidance for boundary-blurring categories |

---

## 1. Three-Category Domain Split (Core Value / Capability / Management)

### What the research says

The research document analyzed 12 design systems and 7 operations frameworks. **None** use a Core value / Capability / Management taxonomy. The research's recommended Q1 is the **form field check** (validation vs. post-submission), not domain categorization. The research explicitly warns against asking users to "think in categories instead of describing what they observe."

### What industry practice says

PagerDuty, Atlassian, and SRE frameworks **do** tier services by criticality — core/critical services get SEV-1/SEV-2 treatment while supporting features get SEV-3/SEV-4. This is standard in incident management. However, the distinction is typically made by **ops teams during triage**, not by users filling out a form. The service catalog (what tier a service belongs to) is usually pre-defined metadata, not something determined per-incident.

### Assessment

The three-way split addresses a real gap — the old Service/Management binary couldn't distinguish "API down" from "file upload broken." The split is a **conceptual model** providing better granularity for how to react to different event categories. The user-facing wording was never intended to be "Core value / Capability / Management" — those are internal labels. Open Question #1 in the architecture doc already flags this as needing behavioral language.

The conceptual distinction is **well-grounded**: Core value and Capability are headless services (APIs, models, background processing) — they have no UI in the traditional sense. Management is the admin console where users configure things. This is not an arbitrary business analysis distinction but a real architectural boundary in the product.

**Remaining concern:** The boundary between Core value and Capability can be product-dependent. For the current product (API keys + LLM models), the distinction is clear. If Iris is used for other products, the categories may need Product Context to anchor.

### Recommendation

- **Downgraded from HIGH to MEDIUM.** The conceptual model is sound; only the user-facing wording needs work.
- User-facing Q1 wording should use behavioral/observable language (already planned as Open Question #1)
- Consider Option B from Product Context: if services and their tiers are pre-defined, Q1 could ask "Which product or service is this about?" and the system maps to the category.
- The wording task is an implementation detail, not an architectural risk.

---

## 2. Severity Model

### What the research says

The research's analysis of PagerDuty supports the single-user severity perspective (Decision #19). The architecture's core principle — "severity measures how much the individual recipient is blocked from getting what they pay for" — is well-supported.

### What industry practice says

Every major incident management framework (PagerDuty, Atlassian, Xurrent, OneUptime) uses scope/breadth as a severity dimension. PagerDuty's definitions explicitly reference "percentage of users affected." Scope is the primary discriminator between SEV-1 and SEV-2 in most frameworks.

The architecture's decision to remove scope from severity is a **deliberate deviation** from industry standard. This is acceptable if justified — and the expired-API-key litmus test provides strong justification for the Iris use case. Iris is a *notification authoring* tool, not an incident management platform. The question isn't "how do we triage?" but "how urgently should we communicate to the affected user?"

### Assessment

The severity model is **sound for Iris's specific use case** but creates a risk of **severity inflation**. If every core-value event is HIGH, and HIGH triggers Banner + Dashboard + E-Mail, then minor transient issues (5-second API latency spike) generate the same channels as sustained outages. This could lead to alert fatigue.

### Recommendation

Keep the category-based severity model. Add a **scope qualifier** within HIGH that affects narrative tone and channel urgency, but not the severity label itself:

| Severity | Scope | Channels | Narrative tone |
|---|---|---|---|
| HIGH | All/Some | Banner + Dashboard + E-Mail | "Multiple services affected, immediate action needed" |
| HIGH | One | Dashboard + E-Mail (no Banner) | "A specific service is affected, here's what to do" |

This preserves "expired key = HIGH" while preventing Banner notifications for single-service, single-user issues.

---

## 3. LLM as Normalizer

### What the research says

The research recommends deterministic classification and warns against free-text classification. The architecture correctly positions the LLM as a normalizer (maps freetext to predefined categories) rather than a classifier. This aligns with the TurboTax inversion principle.

However, the research does not address LLM normalization at all — every recommended approach uses deterministic branching without AI.

### What industry/academic practice says

Research on LLM-based structured extraction (arxiv 2402.04437, 2403.02130) shows:
- GPT-4 achieves 95-98% F1 for constrained normalization tasks (string wrangling, name expansion)
- Schema-guided extraction with explicit allowed value sets significantly improves consistency
- Including predefined categories in the prompt ("normalize to one of: [A, B, C, D]") is the most reliable pattern
- Smaller models are less reliable for normalization, especially with complex prompts

### Assessment

The normalization pattern is **architecturally sound** and well-established in the extraction literature.

**Model context update:** The tool connects to T-Systems LLM Serving (enterprise-grade, not local-only). The 33% JSON failure rate was specific to the local 14B model with longer prompts. T-Systems serving likely provides access to larger, more capable models, which significantly reduces the reliability concern. However, the exact model capabilities and latency characteristics need validation.

### Resolution: Always-Confirm Pattern (Decision #26)

The product owner resolved this with a key insight: **the user should always confirm how the LLM mapped their input.** This means the confirm step IS the fallback — there is no separate failure UI.

Every Phase 2 normalized field uses the existing "confirm extraction" component (Figma node 102:4397):

| LLM result | Component behavior |
|---|---|
| High confidence | Normalized value pre-selected, source quote shown, user clicks Confirm |
| Low confidence / partial | Same view, Change visually encouraged |
| Total failure (LLM down) | No pre-filled value, predefined categories shown directly via Change |

**Why this works:**
- The LLM is a convenience layer, not a dependency — the flow works with or without it
- Every field is user-validated — no silent misclassification
- One component, three states — no separate fallback UI to build or test
- Full transparency: user always sees the mapping and its source

**Status: 🟢 RESOLVED** — See Decision #26 in `docs/decisions.md`.

---

## 4. Form Field Check — Resolved (Management-Only)

### What the research says

The research makes its strongest structural recommendation for the form field check as Q1: "The most common misclassification in message taxonomies is conflating inline validation with post-submission errors." The recommended tree starts by isolating Validation Message events.

### Why this is resolved

The three-category domain split clarifies this naturally: **Validation Messages only exist in the Management path.** Core value and Capability are headless services (APIs, LLM models, pipelines) — they have no UI, no forms, no inline validation. When a user selects "Management" at Q1, they're already in the only domain where form field checks are relevant.

This means:
- The form field check can be a **Management-specific question** (Phase 1 Q2 on the Management path)
- Core value and Capability paths skip it entirely — it's not applicable
- The research's concern about conflating validation with post-submission errors is addressed by the domain split itself

### Recommendation

**RESOLVED.** Add the form field check as a conditional Phase 1 question on the Management path only. This preserves the research's recommendation while respecting that it's irrelevant for headless service events. Example: "Is this about what happens when a user fills in a form?" (Management path only).

---

## 5. Phase 2 Guided Freetext

### What the research says

The research recommends binary questions throughout (yes/no at every node). Freetext is a fundamentally different interaction mode that the research doesn't examine. The research warns about consistency across roles: "a PM thinks about user stories, a developer thinks about API responses."

### What UX research says

NN/g and Oracle wizard guidelines confirm that hybrid wizards (structured steps + freetext inputs) are effective when:
- Structured steps come first to establish context
- Freetext is guided by specific, contextual prompts
- The system provides immediate feedback on freetext input

### Assessment

The Phase 1 → Phase 2 sequence (structured clicks → guided freetext) follows the established hybrid wizard pattern. Phase 1 context constraining Phase 2 prompts is the correct approach. The risk is freetext variability across roles, but the LLM normalization layer is specifically designed to handle this.

**Key strength:** The architecture's use of Phase 1 metadata for unconscious mistake correction (singular/plural, vocabulary alignment) is novel and well-reasoned. No precedent in the research, but the logic is sound.

### Recommendation

- Define 2-3 example prompts per Phase 2 question to anchor the freetext response
- Set a character limit (~200 chars) to prevent overlong responses that challenge normalization
- Show the normalized result immediately ("We understood this as: ...") for user correction

---

## 6. Rule-Based Classification After Data Collection

### What the research says

The research's tree structure classifies during the question flow — each answer narrows the space. Deferring classification to after data collection means the user loses the progressive narrowing feedback that builds confidence.

### Assessment

The deferral is **architecturally correct** — richer data produces better classification. But the loss of intermediate feedback is a real UX cost. The existing progressive narrative builder partially compensates, but the research specifically recommends showing the narrowing classification space.

### Recommendation

Add lightweight progressive hints: after Phase 1, show "This looks like a Notification event" (preliminary type based on Phase 1 data alone). After each Phase 2 answer, update the confidence: "We're classifying this as a HIGH-severity Notification." These are hints, not commitments — final classification still happens after all data is collected.

---

## 7. Additional Gaps

### 7.1 Help Me Decide escape hatches
The research recommends escape hatches at every question (collapsible help, "None of these feel right" option). Not mentioned in the architecture. **Add to Phase 1 question design.**

### 7.2 Negation rules
PatternFly's "This is NOT..." guidance is especially valuable for the fuzzy Core value / Capability boundary. **Add negation guidance to Phase 1 Q1.**

### 7.3 Back button with descriptive labels
The research recommends "Change my answer about [topic]" rather than generic "Back." **Add to UX spec.**

### 7.4 Validation plan
The research recommends 30 real events, 80% inter-rater agreement. **Define before implementation.**

---

## 8. Strengths (What the Architecture Gets Right)

1. **TurboTax inversion** — the research's most important principle, correctly implemented
2. **Deterministic classification** — LLM normalizes, rules decide. Repeatable outcomes
3. **Reach ≠ severity** — fixed the expired-API-key failure. Aligned with PagerDuty's individual-impact model
4. **Six information types preserved** — validated against 12 design systems, correctly unchanged
5. **Progressive narrative continues** — research-recommended "show your work" pattern
6. **Evolutionary migration path** — no rewrite, adapts existing stores and builders
7. **Phase 1 metadata as ground truth** — unconscious mistake correction is novel and valuable
8. **LLM prompt constrained by predefined values** — matches best practice from extraction literature

---

## 9. Recommended Action Sequence

Before any code changes:

1. ✅ Architecture documented (`docs/architecture-evolution.md`)
2. ✅ Audit conducted (this document)
3. ✅ Form field check resolved — Management-only, added as conditional Phase 1 question
4. ✅ LLM fallback resolved — Always-confirm pattern (Decision #26)
5. **All HIGH risks resolved. Address moderate gaps during implementation:**
   - [ ] Behavioral wording for Q1 three-way split (Open Question #1)
   - [ ] Design scope qualifier for HIGH severity (channel differentiation)
   - [ ] Design progressive classification hints during data collection
   - [ ] Add escape hatches and negation rules to question specs
   - [ ] Define validation plan (events, target agreement %)
   - [ ] Validate T-Systems LLM Serving model capabilities for constrained normalization
6. **Ready to proceed with Phase 1 restructuring implementation**

---

*Sources: PagerDuty severity documentation, Atlassian incident management, Xurrent SEV-level definitions, NN/g wizard design recommendations, Oracle Alta wizard patterns, arxiv papers on LLM structured extraction (2402.04437, 2403.02130)*
