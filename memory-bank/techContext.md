# Tech Context

## Stack
- **Runtime:** Node.js (via Vite 7.3)
- **Framework:** Vue 3.5 (Composition API, `<script setup>`)
- **Language:** TypeScript 5.9 (strict mode)
- **Build:** Vite 7.3 + vue-tsc
- **Testing:** Vitest 4.0
- **Design System:** @telekom/scale-components v3.0.0-beta.156 (Web Components)
- **Styling:** Scoped CSS with `--telekom-color-*` and `--telekom-spacing-*` custom properties

## Dependencies of Note
- **@telekom/scale-components** — Stencil-based Web Components. Custom elements are prefixed `scale-*`. Must be excluded from Vite's `optimizeDeps` to avoid lazy-loading breakage (see decisions.md #Vite cache).
- **No Vue Router** — view switching via `appStore.ts` `activeView` ref. Simple and intentional.
- **No state management library** — reactive stores use Vue's `ref`/`reactive` directly.

## Dev Environment
- `npm run dev` — starts Vite dev server (port 5188)
- `npm run build` — `vue-tsc -b && vite build`
- `npm run test` — Vitest in watch mode
- `npm run test:run` — Vitest single run
- LM Studio must be running locally at `localhost:1234` for LLM features
- Vite config excludes `@telekom/scale-components` from optimizeDeps

## External Services & APIs
- **LM Studio** (local) — OpenAI-compatible API at `localhost:1234`. Currently using `ministral-3-14b-reasoning` model. Temperature 0.3.
- **Anthropic API** (planned) — `anthropicProvider.ts` exists for production deployment via cloud API.

## Deployment
- Not yet deployed to production. Local development only.
- Production target: will need cloud LLM provider (Anthropic or similar) instead of LM Studio.

## Known Constraints
- Local 14B model produces malformed JSON ~33% of the time with longer prompts (product context enabled). Production LLM expected to resolve this.
- Scale components use Stencil lazy-loading which conflicts with Vite pre-bundling — must exclude from optimizeDeps.
- German text generation must be independent prose, not translated from English.
- Channel text has character limits: banner ~120 chars, dashboard ~200 chars.
