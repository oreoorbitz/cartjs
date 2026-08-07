# AGENTS.md — CartJS Modernization

This file is the source of truth for agent context in this workspace. Read it before you start work.

## 1. Project identity

- **This repo:** `oreoorbitz/cartjs` — a fork of `discolabs/cartjs`.
- **Current state:** Exact fork. No modernization changes have landed yet. `src/*.coffee`, `Gruntfile.coffee`, `dist/*.js`, and `spec/` are upstream as-is at v1.1.0.
- **Upstream:** https://github.com/discolabs/cartjs — JavaScript library for Shopify AJAX cart (`/cart.js`, `/cart/add.js`, `/cart/change.js`, etc.), with two optional modules: Data API (`data-*` attributes) and DOM Binding (Rivets.js).
- **Purpose of this fork:** Modernize the project end-to-end (tooling, language, dependencies, tests, docs, distribution).

## 2. Modernization goals

Modernize without breaking the public contract unless explicitly decided:

- **Language:** CoffeeScript → modern JavaScript/TypeScript (ESM).
- **Build:** Grunt + Bower → npm scripts + modern bundler (Vite/Rollup/esbuild, TBD). Remove `npm-shrinkwrap.json` / `bower.json` legacy.
- **Dependencies:** Remove hard `jQuery` requirement; replace AJAX / events / utils with native APIs or a thin replacement layer. Remove / update `rivets` + `sightglass` for DOM Binding or make it pluggable.
- **Tests:** `grunt-mocha-phantomjs` → Vitest/Jest + jsdom/happy-dom; keep behavioural coverage for `Cart`, `Item`, `Queue`, `Core`, `Data`, `Rivets`, `Utils`.
- **Distribution:** `dist/cart.js` + `dist/rivets-cart.js` → versioned ESM + CJS + minified + CDN-ready artifacts. Preserve `CartJS` global for backwards compat where feasible.
- **Docs:** `docs/` (Terraform/Jade/Less) → modern static site or README-driven docs.
- **Quality gates:** Lint, format, type-check, test, build — all reproducible via `npm run`.

Do not modernize in one giant rewrite. Work incrementally, keep `dist/` buildable at each step, and keep tests green.

## 3. Mepto — Zepto replacement test bed

This modernization is also the validation harness for **Mepto**:

- **Mepto:** https://github.com/oreoorbitz/Mepto — a modernized fork of Zepto (lightweight jQuery-compatible library). Maintained in parallel by the same owner.
- **Why it matters here:** Upstream CartJS depends on `jQuery` for AJAX, deferreds/queues, events (`cart.requestStarted` etc.), and DOM utilities (`$.extend`, selectors). The modernization will evaluate Mepto as a drop-in or adapter for those call sites.
- **How to use it:**
  1. Identify each jQuery usage in `src/` (grep `jQuery`, `$`, `$.ajax`, `$.extend`, `$(document).on/trigger`).
  2. For each, decide: replace with native API *or* route through Mepto and record the gap.
  3. File issues / patches upstream to Mepto when CartJS exposes a missing or divergent API.
- **Constraint:** Do not vendor Mepto silently. Any Mepto integration must be explicit (dependency, adapter module, or documented fallback to native).

## 4. Prompts system — long-form, versioned, STE-controlled

All LLM prompts for this project live in `prompts/` as versioned Markdown. This is intentional: prompts are long-form artifacts that get static analysis before they are used.

### 4.1 Location and naming

- Directory: `prompts/`
- Files: `NNN-kebab-case-title.md` — zero-padded, 3 digits, strictly increasing.
  - Example: `001-modernize-build-system.md`, `002-replace-jquery-ajax.md`
- `000-template.md` is the template. Copy it to create `NNN-*.md`.
- Order = priority / intended execution order. Do not reorder numbers; add new prompts at the end.

### 4.2 Authoring standard — ASD-STE100

Write prompts in **ASD-STE100 Simplified Technical English** (https://www.asd-ste100.org/, spec `ASD-STE100` Issue 8).

Why: STE is a controlled language for unambiguous technical instructions. It reduces prompt ambiguity and makes static analysis effective.

Key STE rules to follow in prompts (summary — the spec is authoritative):

- **Dictionary:** Use only approved words with their approved meaning. ~900 approved words + approved technical names/verbs you add to the project dictionary. If a word is not approved, find an approved synonym.
- **One word, one meaning.** Do not use synonyms for variety. Example: always use `start`, not `begin`/`commence`.
- **Sentence length:** Max 20 words (procedural sentences max 20 words, descriptive max 25). One idea per sentence.
- **Paragraph length:** Max 6 sentences.
- **Voice:** Use active voice. Use imperative for procedures.
- **Tense:** Simple present / simple past / future with `will` only. Avoid progressive, perfect, and complex modals.
- **Parts of speech:** Do not use a word as a different part of speech than its approved category (e.g., do not verb a noun).
- **Lists:** Use vertical lists for procedures. Number steps.
- **Warnings/Cautions/Notes:** Use them explicitly before the hazard.
- **Consistency:** Same thing, same name, every time.

Reference: https://www.asd-ste100.org/ and ASD-STE100 Issue 8. For a quick checklist see `prompts/README.md`.

### 4.3 Static analysis

Before a prompt is used, run the configured checks:

- Vale with `vale-llm-slop` STE ruleset (or equivalent) against `prompts/*.md`.
- Markdown lint + spell check.
- CI will block prompts that fail STE lint. Fix the prompt, not the linter.

No prompt is executed by an agent until it passes lint.

## 5. Repository layout (current)

```
src/           CoffeeScript sources (cart.coffee, cartjs.coffee, core.coffee, data.coffee, item.coffee, queue.coffee, rivets.coffee, utils.coffee, export.coffee)
dist/          Built artifacts (cart.js, cart.min.js, rivets-cart.js, rivets-cart.min.js) — Grunt output
spec/          Mocha specs (spec/shopify/, spec/cartjs/, fixtures)
docs/          Terraform/Jade/Less documentation site
Gruntfile.coffee  Build definition
package.json   npm metadata (v1.1.0) — grunt 0.4.5 era
bower.json     legacy
```

Target layout will be decided in prompts `001-*` onward. Do not move files until a prompt says so.

## 6. Working conventions for agents

- **Small steps.** One prompt = one coherent change set. Keep builds green between prompts.
- **Evidence first.** Search call sites, read tests and types, then change code. Derive the contract from the repo, not the issue text.
- **No hidden work.** Do not edit `dist/` by hand; it is a build artifact. Do not rewrite git history.
- **Package manager:** Check lockfile before installing. `npm install` can rewrite `yarn.lock`; revert collateral edits.
- **Tests:** `npm test` (currently `grunt test` via `grunt-mocha-phantomjs`). After modernization, `npm test` will be Vitest/Jest. Run the relevant suite before you claim done.
- **Mepto feedback loop:** When you touch jQuery code, note in the PR/prompt whether Mepto covers it natively, via adapter, or needs an upstream fix.

## 7. How to add a new prompt

1. Copy `prompts/000-template.md` to `prompts/NNN-your-title.md` (next number).
2. Write in STE. Keep sentences short. Use the template headings.
3. Run `npx vale prompts/NNN-your-title.md` (or project script) and fix all STE findings.
4. Open a PR or commit that adds only the prompt file.

## 8. Out of scope / guardrails

- Do not publish to npm / CDN without explicit human approval.
- Do not add Mepto as a hard dependency without a prompt that justifies it and shows test results.
- Do not claim browser / Shopify integration works without a real browser or mocked Shopify API test.

## 9. Quick links

- Upstream CartJS: https://github.com/discolabs/cartjs
- CartJS docs (legacy): https://cartjs.org
- Mepto: https://github.com/oreoorbitz/Mepto
- STE spec overview: https://www.asd-ste100.org/
- STE basics: https://www.asd-europe.org/standards-specifications/simplified-technical-english/what-are-the-basics-of-simplified-technical-english/
