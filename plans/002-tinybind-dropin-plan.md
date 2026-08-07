# 002 — Replace Rivets with Tinybind — Drop-in Plan

> Standard: ASD-STE100 Simplified Technical English, Issue 8
> Reference: `prompts/003-npm-audit.md` context, `AGENTS.md 3` (Mepto), `plans/001-dependency-modernization-plan.md`
> Status: Draft — execution follows this plan step-by-step
> Risk level: High — API must remain identical

## 1. Objective

Replace `rivets@0.9.6` and `sightglass@0.2.6` with `tinybind@1.0.0` as a drop-in. Keep every CartJS public API identical. Do not break `rivets-cart.js` consumers.

**Vital constraint:** CartJS is a drop-in library for Shopify themes. Themes call `CartJS.*`, use `data-cart-*` attributes, and use Rivets bindings (`data-cart-view`, `{cart.*}`, `| money` etc.). This plan must not change that contract. If the API changes, the update is not a drop-in and themes break.

## 2. Context

Rivets `0.9.6` is the last release (2017, CoffeeScript source in `node_modules/rivets/src/*.coffee`). `sightglass 0.2.6` is its observer engine. Both are abandoned. Tinybind `1.0.0` is the spiritual successor:

- Tinybind integrates `sightglass` into its codebase (no separate `sightglass` package).
- Tinybind is written in ES6 (no CoffeeScript → no `decaffeinate` step for Rivets).
- Tinybind API is `tinybind.bind(el, models)` vs `rivets.bind(el, models)` — nearly identical, but Tinybind changes internals (see §5.3).

CartJS bundles Rivets via `Gruntfile.coffee:concat:dist/rivets-cart.js`:
```
dist/rivets-cart.js = sightglass/index.js + rivets/dist/rivets.js + dist/cart.js
```
`src/rivets.coffee` checks `if rivets?` and registers `CartJS.Rivets` and 20+ `rivets.formatters.*` (money, weight, pluralize, etc.). `spec/runner.html` loads `sightglass` + `rivets` + `cart.js`.

The modernization also handles decaffeinate: `src/*.coffee` will be converted to vanilla JS. For Rivets, you do **not** decaffeinate `node_modules/rivets/src/*.coffee` — you replace it with Tinybind (already ES6). This saves work and removes CoffeeScript debt.

## 3. Scope

### 3.1 In scope

- Replace `rivets` and `sightglass` deps with `tinybind`.
- Update `Gruntfile.coffee` (`coffee`, `concat`, `uglify` tasks) to produce `dist/cart.js` and `dist/rivets-cart.js` with Tinybind.
- Update `src/rivets.coffee` → `src/tinybind.coffee` (or keep name) to support both `window.rivets` and `window.tinybind` for compatibility.
- Keep every formatter name, binder behavior, and `CartJS.Rivets` model identical.
- Update docs, `package.json`, and tests.

### 3.2 Out of scope

- Do not change `CartJS` core API (`CartJS.init`, `CartJS.cart`, `CartJS.Core.*`, `CartJS.Data.*`, `CartJS.Utils.*`).
- Do not change `data-cart-*` HTML contract.
- Do not do full Grunt→Vite migration in this plan (later plan).

## 4. Inputs

- `src/rivets.coffee` (CartJS Rivets integration, 20 formatters)
- `node_modules/rivets/src/*.coffee` (reference only — do not modify)
- `node_modules/rivets/dist/rivets.js` and `sightglass/index.js` (current bundle)
- `tinybind@1.0.0` (from `https://github.com/blikblum/tinybind`, `npm view tinybind`)
- `Gruntfile.coffee`, `package.json`, `spec/runner.html`, `spec/cartjs/formatters.js`
- `dist/cart.js` and `dist/rivets-cart.js` (built artifacts)

## 5. Findings (evidence)

### 5.1 CartJS uses Rivets in a narrow, well-defined way

Search shows all `rivets` references:

- `src/rivets.coffee`: `if rivets?` guard, `rivets.bind(jQuery(this), CartJS.Rivets.model)`, `rivets.formatters.*` (eq, includes, match, lt, gt, not, empty, plus, minus, times, divided_by, modulo, prepend, append, slice, pluralize, array_*, money, weight, etc. — 20 formatters).
- `CartJS.Rivets.model` holds `cart` + `rivetsModels` + `Currency`.
- `Gruntfile.coffee` bundles `rivets` for `dist/rivets-cart.js`. `dist/cart.js` alone does **not** bundle Rivets (it `if typeof rivets !== "undefined"` guards).
- No use of `rivets.components`, `rivets.adapters` custom, or `view.select`.

### 5.2 Tinybind API — compatible but with breaking internal changes

From Tinybind README and docs (`https://blikblum.github.io/tinybind`):

- **Public API rename:** `rivets` → `tinybind` (`tinybind.bind`, `tinybind.configure`, `tinybind.formatters`, `tinybind.binders`). The `bind` signature is identical: `(el, models) → view` with `view.unbind()`.
- **Integrated sightglass:** No separate `sightglass` import. Tinybind already includes observer logic.
- **Breaking changes that affect CartJS** (must be shimmed for drop-in):
  - `each` scope: Rivets copies properties to children; Tinybind uses prototype chain (issue #486, #512). Our `src/rivets.coffee` does not use `rv-each`, so no direct impact, but theme code might.
  - Index name: `index` → `$index` (and custom index via attribute). Theme `rv-each` loops that use `{index}` will break unless shimmed.
  - `unless` binder removed → use `rv-if` + `not` formatter. CartJS does not define custom binders, but themes might use `rv-unless`.
  - `view.select` removed, `binding.args` → `arg` (string), `bind/unbind` not bound to instance, `rv-*` attributes removed after bind. CartJS does not call `view.select`, so safe.
  - `formatters`: Tinybind ships same binder set, plus `not`/`negate`. All CartJS formatters (money, weight, etc.) are registered on the global object — they will work if we register on `tinybind.formatters` and alias to `rivets.formatters`.

### 5.3 What decaffeinate means here

- `src/*.coffee` (CartJS) will be run through `decaffeinate` to produce vanilla JS. Do that in a separate step for `src/rivets.coffee` as well.
- For **Rivets library itself**, do **not** decaffeinate `rivets/src/*.coffee` (9 files). Use Tinybind's already-decaffeinated ES6 source instead. This satisfies the user's question: the repo has no vendored Rivets source to decaffeinate; the source lives in `node_modules/rivets/src`.

## 6. Procedure

Do the steps in order. One action per step. Verify after each step. Keep API identical.

1. Install Tinybind: `npm install tinybind@1.0.0 --save` (keep `rivets@0.9.6` and `sightglass@0.2.6` in `package.json` during migration, remove after verification).
2. Create `src/tinybind.coffee` (or convert `src/rivets.coffee` via `decaffeinate` first, then patch):
   - Detect both globals: `tinybindRef = window.tinybind or window.rivets`
   - Use `tinybindRef` for `bind`, `formatters`, `configure`.
   - After binding, alias for compatibility: `window.rivets = window.tinybind` if `rivets` is absent, and vice-versa.
3. Keep formatter registration dual: `tinybind.formatters.money = ...` and `rivets.formatters.money = ...` (or `rivets = tinybind` alias before registration).
4. Update `Gruntfile.coffee`:
   - `concat:dist/rivets-cart.js` → `['node_modules/tinybind/dist/tinybind.js', 'dist/cart.js']` (no separate `sightglass`).
   - Keep `dist/rivets-cart.js` **filename** for drop-in (do not rename to `tinybind-cart.js`); themes include `rivets-cart.min.js`.
   - Add fallback: if `tinybind` not found, build fails with clear message.
5. Build: `npx grunt build`. Verify `dist/rivets-cart.js` contains Tinybind header and `CartJS.Rivets` still works.
6. Update `spec/runner.html`:
   - Load `tinybind/dist/tinybind.js` instead of `sightglass` + `rivets`.
   - Add shim: `<script>window.rivets = window.tinybind;</script>` for legacy tests.
7. Run existing tests: `npm test` (or `grunt test` / `vitest` if migrated). All formatter tests (`spec/cartjs/formatters.js` — money, pluralize, etc.) must pass without edit.
8. Add **drop-in compatibility tests** (new file `spec/tinybind-dropin.js`):
   - Theme can still call `rivets.bind` (alias works).
   - `data-cart-view` auto-binds with Tinybind.
   - `rv-each` with `{index}` and `{ $index }` both work (shim index → $index if needed).
   - `rv-unless` + `rv-if|not` both work.
9. Test `data-cart-*` HTML fixtures with Tinybind bound view — verify `cart.item_count`, `cart.total_price | money` update on `cart.requestComplete`.
10. Weigh `index` shim: if theme uses `{index}`, add `tinybind.formatters.index = (v) -> v` or document `$index` migration.
11. Verify bundle size and `dist/rivets-cart.min.js` builds via `uglify`.
12. Remove `sightglass` from `package.json` only after Tinybind bundle passes all tests. Keep `rivets` as `optional` alias for one release, then deprecate.
13. Update `docs/NVM.md` and `README.md` to state `tinybind@1.0.0` replaces `rivets`.
14. Document in `CHANGELOG.md` as **minor** (drop-in): `Replace rivets@0.9.6 with tinybind@1.0.0 — API unchanged, `rivets` global aliased to `tinybind``.

## 7. Constraints (vital — API must remain same)

- **Public CartJS API frozen:** `CartJS.init`, `CartJS.configure`, `CartJS.cart`, `CartJS.Core.*`, `CartJS.Data.*`, `CartJS.Rivets.*`, `CartJS.settings.rivetsModels` — do not change signature, return value, or event names (`cart.requestStarted`, `cart.requestComplete`, `cart.ready`).
- **Rivets formatters frozen:** All 20+ formatters (`eq`, `includes`, `match`, `lt`, `gt`, `not`, `empty`, `plus`, `minus`, `times`, `divided_by`, `modulo`, `prepend`, `append`, `slice`, `pluralize`, `array_*`, `money`, `weight`, `product_image_size`) must keep name, args, and output.
- **HTML contract frozen:** `data-cart-view`, `data-cart-add`, `data-cart-render`, etc., must work without theme edit.
- **Bundle filename frozen:** `dist/rivets-cart.js` and `dist/rivets-cart.min.js` must stay at same path (themes use `rivets-cart.min.js`).
- **Global alias:** After migration, `window.rivets` and `window.tinybind` must both be defined and equal (strict `===`) for legacy theme code.
- Do not assume Rivets usage — search every `rivets.` call site before change.
- Follow STE100 for all new MD files.

## 8. Risks

- `each` scope prototype vs copy: theme `rv-each` that mutates parent may behave differently. Mitigation: test with real theme fixtures.
- `index` → `$index`: silent break if theme uses `rv-each` index. Mitigation: shim `$index` alias and add warning log.
- `unless` removal: theme `rv-unless` will not bind. Mitigation: Tinybind `not` formatter makes `rv-if="x | not"` equivalent — document migration.
- `sightglass` removal: some theme may `require('sightglass')` directly — unlikely via CartJS, but check.

## 9. Acceptance criteria (drop-in)

- [ ] `npm install` on Node `24.19.0` shows no `EBADENGINE` and no `rivets` CoffeeScript build.
- [ ] `npx grunt build` and `npx grunt docs` succeed with Tinybind bundle.
- [ ] `dist/rivets-cart.js` contains `tinybind` and no `sightglass` separate file.
- [ ] `window.rivets === window.tinybind` after load.
- [ ] All existing `spec/cartjs/formatters.js` pass without edit.
- [ ] New drop-in test `spec/tinybind-dropin.js` passes: `rv-each` index, `rv-unless` shim, `data-cart-view` bind.
- [ ] Theme HTML from `docs/theme` renders `cart.item_count` and `| money` identically with Rivets vs Tinybind build (pixel-equal or `diff` < 1%).
- [ ] No change to `CartJS.*` public API (verified by `npm test` + manual `CartJS.addItem` / `CartJS.clear` smoke test).
- [ ] `plans/002-tinybind-dropin-plan.md` follows STE100 and references `prompts/003-npm-audit.md` context and `AGENTS.md` drop-in rule.

## 10. Output

This plan file `plans/002-tinybind-dropin-plan.md`. Execution produces: `src/tinybind.coffee` (or updated `src/rivets.coffee`), `Gruntfile.coffee`, `package.json` (tinybind dep), `dist/*`, `spec/tinybind-dropin.js`, updated docs.

## 11. STE100 checklist

- [ ] Each sentence ≤ 20 words.
- [ ] Each paragraph ≤ 6 sentences.
- [ ] One topic per sentence.
- [ ] Active voice only.
- [ ] Approved words only.
- [ ] Vertical lists for procedures.

## 12. References

- Prompt: `prompts/003-npm-audit.md` (via user request 2026-08-07)
- `src/rivets.coffee`, `Gruntfile.coffee`, `spec/runner.html`, `spec/cartjs/formatters.js`
- `node_modules/rivets/src/*.coffee` (9 CoffeeScript files — source of Rivets, not vendored in `src/`)
- Tinybind: `https://github.com/blikblum/tinybind`, `npm: tinybind@1.0.0`, `https://blikblum.github.io/tinybind/`
- AGENTS.md §2 (Mepto), §3 (no API break), §4.2 (STE100)
- `plans/001-dependency-modernization-plan.md`
