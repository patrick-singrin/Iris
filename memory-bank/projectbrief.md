# Project Brief

## Vision
Iris is a Content Design Assistant that helps teams create clear, actionable event notifications for end users — from incident alerts to maintenance announcements. It uses an LLM-guided interview flow to extract structured information and generate polished, multi-channel communication.

## Goals
- [x] Guided event documentation via smart question flow
- [x] LLM-powered extraction of structured data from freeform input
- [x] Automated severity classification and channel recommendation
- [x] Bilingual text generation (German + English) for multiple channels
- [x] Product Context integration for domain-specific terminology
- [ ] Production LLM deployment (currently local via LM Studio)

## Target Users
Platform operators, incident managers, and communication teams at Deutsche Telekom who need to quickly draft and distribute event notifications across channels (email, banner, dashboard, status page).

## Scope

### In Scope
- Event story builder (interview-style wizard)
- LLM-based extraction, narrative generation, and text generation
- Severity matrix and classification derivation
- Multi-channel output (email, banner, dashboard, status page)
- Bilingual support (DE/EN)
- Product context for domain-specific tuning
- Markdown export of documented events

### Out of Scope
- Direct publishing to channels (output is text, not API calls)
- User authentication / multi-tenancy
- Real-time collaboration

## Success Criteria
- IPS (IRIS Pipeline Score) >= 90 (Grade A)
- All classification-critical fields extracted correctly from freeform input
- Generated text fits channel constraints (character limits, tone)
- Bilingual output quality (German text independent, not translated)
