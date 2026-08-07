# 004 — Replace jQuery with Mepto — Drop-in Plan

> Standard: ASD-STE100 Simplified Technical English, Issue 8
> Reference: `https://github.com/oreoorbitz/Mepto` (`meptos@npm`), `AGENTS.md 3` (Mepto as Zepto fork), `plans/002-tinybind-dropin-plan.md`, `plans/003-decaffeinate-to-js-plan.md`
> Status: Draft — execution follows this plan step-by-step
> Risk level: High — API must remain identical, Shopify themes depend on jQuery

## 1. Objective

Replace `jquery@4.0.0` with `meptos` (Mepto — modern TypeScript Zepto fork) as a drop-in. Keep every CartJS public API identical. Do not break `jquery`-dependent Shopify themes or the `data-cart-*` contract.

**Vital constraint:** CartJS is a drop-in. Themes call `CartJS.*`, include `jquery` via Shopify's `{{ cart | json }}` page, and expect `jQuery`/`$` globals. Many themes already load jQuery separately. This plan must keep `jQuery` and `$` working if a theme already provides them, while using Mepto internally. If the API changes, the update is not a drop-in.

## 2. Context

Current CartJS uses jQuery `^4.0.0` for:

- **AJAX:** `jQuery.ajax(params)` in `src/queue.js:58` (queue for `/cart.js`, `/cart/add.js`, `/cart/change.js`, `/cart/clear.js`, `/cart/update.js`). Mepto `ajax` is `fetch`-based.
- **Events:** `jQuery(document).on('cart.requestStarted')`, `jQuery(document).trigger('cart.ready')`, `jQuery(document).trigger('cart.requestComplete')` in `src/cartjs.js` and `src/queue.js`.
- **DOM / Data API:** `jQuery(this)`, `jQuery(document)`, `jQuery('[data-cart-view]')`, `jQuery('[data-cart-render]')`, `jQuery.each`, `serializeArray`, `attr`, `is(':checked')`, `addClass`/`removeClass` in `src/data.js` and `src/rivets.js`.
- **Build:** `package.json` devDependency `jquery@4.0.0`; `spec/runner.html` loads `jquery/dist/jquery.js`; `dist/rivets-cart.js` does **not** bundle jQuery (themes provide it).

Mepto (`https://github.com/oreoorbitz/Mepto`, npm `meptos`, globals `$` and `mepto`):

- Lightweight jQuery-compatible for evergreen browsers only (Chrome, Firefox, Safari, Edge last 3 versions — no IE, no legacy Edge).
- Covers all CartJS-needed modules: `core`, `event` (`on/off/trigger` + delegation), `ajax` (`$.ajax`/`$.get`/`$.post`/`$.getJSON` via `fetch`), `form` (`serializeArray`/`serialize`), `data`, `selector`, `fx`.
- Published as `meptos`; UMD exposes `window.$` and `window.mepto`. ESM import is `import { $ } from 'meptos'`.
- TypeScript rewrite of Zepto — API matches Zepto/jQuery for CartJS usage, but some jQuery 4.x edge behaviors differ (e.g., `$.ajax` Deferred vs `fetch` Promise, `$.each` signature, `jQuery(document).trigger` with array args).

The modernization already did:

- Plan 002: `rivets` → `tinybind` (done, `window.rivets === window.tinybind`).
- Plan 003: `src/*.coffee` → `src/*.js` via `decaffeinate` (done, `Gruntfile` now uses `concat:build_js`).

Next step is to let CartJS use Mepto internally while remaining compatible with themes that still load jQuery.

## 3. Scope

### 3.1 In scope

- Add `meptos` dependency and create an adapter `src/jquery-adapter.js` (or `src/mepto.js`) that exposes a `CartJS.$` / `CartJS.jQuery` internal handle.
- Update `src/queue.js`, `src/data.js`, `src/cartjs.js`, `src/rivets.js` to use the adapter instead of global `jQuery` directly, but keep global `jQuery`/`$` alias for themes.
- Update `spec/runner.html` to load `meptos` instead of `jquery` (keep jQuery fallback for dual test).
- Update `Gruntfile` and `package.json` (keep `jquery` as peer/optional for one release, add `meptos`).
- Measure delta: `fetch` vs `$.ajax` behavior, event trigger with `extraParameters`, `serializeArray`.

### 3.2 Out of scope

- Do not change `CartJS.*` public API or `data-cart-*` HTML contract.
- Do not bundle Mepto into `dist/cart.js` if that would duplicate jQuery in themes that already load it — decide in step 4 (bundle vs external).
- Do not change Tinybind (plan 002) or CoffeeScript conversion (plan 003).

## 4. Inputs

- `src/queue.js:43,51,58` (events + ajax)
- `src/cartjs.js:58,59,66` (events)
- `src/data.js:18,48,57,64,71,80,94,105,114,119,145` (DOM, each, serializeArray)
- `src/rivets.js:73` (jQuery each for binding)
- `package.json` (`jquery@4.0.0`)
- `spec/runner.html`, `spec/cartjs/*.js`
- Mepto README and API: `https://github.com/oreoorbitz/Mepto`, `meptos/dist/meptos.umd.cjs`, `meptos/dist/meptos.d.ts`

## 5. Findings (evidence)

### 5.1 Exact jQuery surface CartJS uses (grep `src/*.js`)

| File | jQuery call | Mepto equivalent | Notes |
|---|---|---|---|
| `queue.js:43` | `jQuery(document).trigger('cart.requestStarted', [CartJS.cart])` | `$.trigger` with array args | Mepto `trigger` supports `extraParameters` — test with array |
| `queue.js:51` | `trigger('cart.requestComplete')` | same | |
| `queue.js:58` | `jQuery.ajax(params)` where `params = {url, data, type, dataType, cache, success:[], error:[], complete: process}` | `$.ajax` via `fetch` | Mepto `ajax` returns `fetch`-based Deferred — check `success` array and `complete` chaining (`params.complete = Queue.process`) |
| `cartjs.js:58` | `jQuery(document).on('cart.requestStarted', () => jQuery('body').addClass(...))` | `$.on` with no delegation arg | Mepto `on` matches Zepto |
| `cartjs.js:66` | `jQuery(document).trigger('cart.ready', [CartJS.cart])` | same | |
| `data.js:18` | `$document = jQuery(document)` then `$document.on('click', '[data-cart-add]', Data.add)` | `$.on` with delegation selector `'[data-cart-add]'` | Mepto supports delegation (`on(event, selector, handler)`) — verify |
| `data.js:48,57...` | `const $this = jQuery(this); $this.attr('data-cart-add')` | `$().attr` | Mepto has `attr` |
| `data.js:94,105` | `jQuery(this).is(':checked')` | `:checked` pseudo via `selector` module | Mepto `selector` includes `:visible` etc. — check `:checked` |
| `data.js:114` | `jQuery(this).serializeArray()` | `form` module `serializeArray` | Mepto includes `form` |
| `data.js:119` | `jQuery.each(dataArray, fn)` | `$.each` | Signature `$.each(array, (index, value) =>)` — Mepto matches jQuery |
| `data.js:145` | `jQuery('[data-cart-render]').each(function(){ $(this).html(...) })` | `$.each` + `html` | Mepto has `html` |
| `rivets.js:73` | `jQuery('[data-cart-view]').each(function(){ _bindingEngine.bind(jQuery(this), ...) })` | `$.each` + `bind` | Mepto has `each` |

Total distinct jQuery APIs: `ajax`, `on/off/trigger` (with delegation and array extraParameters), `each`, `attr`, `is`, `addClass/removeClass`, `html`, `serializeArray`, `$(selector)`, `$(document)`, `$(this)`.

### 5.2 Mepto gaps to test before commit

From Mepto README table `What's in the box`:

- `event`: `on/off/trigger` — delegation supported — **test** array extraParameters for `trigger('cart.ready', [cart])`
- `ajax`: `$.ajax` built on `fetch` — **test** `jQuery.ajax` `success` as array, `complete` as function, `dataType: 'json'`, `cache` flag
- `form`: `serializeArray` — **test** with `select`/`input` fixtures
- `selector`: `:checked`, `:visible` — **test** `is(':checked')`
- Mepto does **not** have `$.Deferred` exactly like jQuery 4 — CartJS `Queue` uses `jQuery.ajax` `complete` callback to `Queue.process`, not Deferred chaining, so safe.

## 6. Procedure

Do the steps in order. One action per step. Verify after each step. Keep API identical.

1. Install Mepto: `npm install meptos --save` (keep `jquery@4.0.0` in `package.json` for one release as fallback). Verify `node_modules/meptos/dist/meptos.umd.cjs` and `meptos.d.ts` exist.
2. Create `src/mepto-adapter.js` (or `src/jquery-adapter.js`):
   ```js
   // CartJS.$ — internal jQuery-compatible handle, prefers Mepto, falls back to jQuery
   const Mepto = (() => {
     try { return require('meptos'); } catch(e) { return null; }
   })();
   const $ = (typeof window !== 'undefined' && window.mepto) || (typeof window !== 'undefined' && window.$) || (Mepto && Mepto.$) || window.jQuery;
   // Alias for drop-in: ensure window.jQuery and window.$ still exist for themes
   if (typeof window !== 'undefined') {
     if (!window.jQuery && $) window.jQuery = $;
     if (!window.$ && $) window.$ = $;
     if (!window.mepto && $) window.mepto = $;
   }
   export default $;
   ```
   Keep it CommonJS-compatible for `concat` build (do not use `import` yet — CartJS still uses UMD via `src/export.js`).
3. Update `src/queue.js` (most critical):
   - Replace `jQuery.ajax(params)` with adapter `$.ajax` — test that `params.success` array and `params.complete = Queue.process` still fire in order.
   - Replace `jQuery(document).trigger` with `$(document).trigger`.
   - Verify `Queue.add` still triggers `cart.requestStarted` before `process()` and `cart.requestComplete` after.
4. Update `src/cartjs.js`:
   - Replace `jQuery(document).on` and `jQuery(document).trigger` with adapter.
   - Keep `CartJS.settings.requestBodyClass` addClass/removeClass via adapter.
5. Update `src/data.js`:
   - Replace all `jQuery(this)` / `jQuery(document)` / `jQuery('[data-cart-render]')` with adapter.
   - Verify `serializeArray` + `jQuery.each` still produce `id/quantity/selling_plan/properties` correctly.
6. Update `src/rivets.js`:
   - Replace `jQuery('[data-cart-view]').each` with adapter; keep `_bindingEngine.bind(jQuery(this), ...)` as `$(this)`.
   - Keep `window.rivets === window.tinybind` alias from plan 002.
7. Update `Gruntfile.coffee`:
   - Option A (drop-in, recommended): **do not bundle Mepto** into `dist/cart.js` — keep `dist/rivets-cart.js` as `tinybind + cart.js` only. Themes that already load jQuery will keep working; themes that don't will load Mepto separately via `<script src="meptos/dist/meptos.umd.cjs">`. This keeps bundle size small.
   - Option B: bundle Mepto into `dist/rivets-cart.js` as `['node_modules/meptos/dist/meptos.umd.cjs', 'dist/cart.js']` — only if you want `rivets-cart.js` to be self-contained.
   Document choice in `README.md`.
8. Update `spec/runner.html`:
   - Load `meptos/dist/meptos.umd.cjs` **before** `dist/cart.js` (keep jQuery commented for dual test).
   - Add inline shim: `window.jQuery = window.$ || window.mepto;`
9. Build: `npx grunt build` must succeed (`concat:build_js` now includes `src/mepto-adapter.js` if created, or adapter code in `queue.js`).
10. Run existing tests: `spec/cartjs/formatters.js` and `spec/cartjs/tinybind-dropin.js` via `spec/runner.html` (phantomjs currently broken on `mocha@11.8` — use `vitest` happy-dom as in plan 002 verification). Add new `spec/cartjs/mepto-dropin.js`:
   - `$.ajax` spy: `Queue.add` with `updateCart:true` still calls `getCart` and `ajax`.
   - `trigger` spy: `cart.requestStarted` and `cart.ready` fire with `[CartJS.cart]`.
   - `data-cart-add` click still `addItem` with `selling_plan`.
11. Measure API parity: run the same HTML fixture with `jquery@4.0.0` vs `meptos` and `diff` the `CartJS.cart` JSON after `addItem(123,1)` / `updateItem` / `clear`.
12. Keep `jquery` in `package.json` as `optional` for one release, then remove in next major. Document in `CHANGELOG.md` as **minor** (drop-in): `Replace jquery with meptos — jQuery global still aliases to Mepto`.

## 7. Constraints (vital — API must remain same)

- **Public CartJS API frozen:** `CartJS.init`, `CartJS.cart`, `CartJS.Core.*`, `CartJS.Data.*`, `CartJS.Rivets.*`, `CartJS.settings.*`, events `cart.requestStarted/Complete/ready` — do not change signature, arguments, or trigger payload.
- **Globals frozen:** After migration, `window.jQuery`, `window.$`, and `window.mepto` must all be defined and `===` (strict) for legacy themes. Theme may do `jQuery(...)` or `$(...)` — both must work.
- **HTML contract frozen:** `data-cart-*` attributes must work without theme edit.
- **Bundle filename frozen:** `dist/cart.js`, `dist/rivets-cart.js` paths must stay (themes use `rivets-cart.min.js`).
- **Ajax behavior frozen:** `Queue.add` `success` array and `complete = Queue.process` must still sequence requests; `dataType: 'json'`, `cache` false must still work via `fetch`.
- **Test for Mepto as you would for jQuery:** This modernization is the test harness for Mepto — file any missing `$.ajax`/`$.each`/`serializeArray` gap as issue in `oreoorbitz/Mepto` and provide adapter workaround here.
- Follow STE100 for all new MD files.

## 8. Risks

- `$.ajax` via `fetch` does not support `xhrFields` or `beforeSend` — not used by CartJS, but verify.
- `trigger` with array extraParameters: jQuery flattens `trigger('cart.ready', [cart])` to handler `(event, cart)`; Mepto must do same — if not, Queue/Data tests fail. Mitigation: adapter wraps `trigger` to ensure array handling.
- `is(':checked')` via `selector` pseudo — if Mepto missing, fallback to `el.checked`.
- Themes that load jQuery `4.0.0` separately will have two `$` — ensure adapter prefers `window.jQuery` if already present to avoid double-fetch.

## 9. Acceptance criteria (drop-in)

- [ ] `meptos` installed, `jquery` kept as optional for one release.
- [ ] `src/queue.js`, `src/data.js`, `src/cartjs.js`, `src/rivets.js` use adapter `$`, not direct `jQuery`.
- [ ] `window.jQuery === window.$ === window.mepto` after `dist/cart.js` load (when Mepto is present).
- [ ] `npx grunt build` and `npx grunt docs` succeed.
- [ ] Existing `spec/cartjs/formatters.js` and `spec/cartjs/tinybind-dropin.js` pass without edit (via `vitest` happy-dom or `grunt test` when phantomjs fixed).
- [ ] New `spec/cartjs/mepto-dropin.js` passes: ajax queue, trigger, serializeArray.
- [ ] Manual smoke: HTML fixture with `data-cart-add="123"` still adds item, `cart.item_count` updates via Tinybind.
- [ ] No change to `CartJS.*` public API (verified by `CartJS.addItem` / `clear` smoke + `vitest`).
- [ ] This file `plans/004-jquery-to-mepto-plan.md` follows STE100 and references `https://github.com/oreoorbitz/Mepto`.

## 10. Output

This plan file `plans/004-jquery-to-mepto-plan.md`. Execution produces: `src/mepto-adapter.js` (or edits to `src/*.js`), `Gruntfile` change, `package.json` (meptos dep), `dist/*`, `spec/cartjs/mepto-dropin.js`, updated docs, and a commit referencing this plan.

## 11. STE100 checklist

- [ ] Each sentence ≤ 20 words.
- [ ] Each paragraph ≤ 6 sentences.
- [ ] One topic per sentence.
- [ ] Active voice only.
- [ ] Approved words only.
- [ ] Vertical lists for procedures.

## 12. References

- Prompt: user request 2026-08-07 `now make a plan to changing the usage of JQuery to Mepto`
- Mepto: `https://github.com/oreoorbitz/Mepto` (Zepto fork, TS, `meptos` npm, `tinybind` already in `dist/rivets-cart.js`)
- CartJS jQuery surface: `src/queue.js:43,51,58`, `src/cartjs.js:58,59,66`, `src/data.js:18-145`, `src/rivets.js:73`
- Spec: `spec/runner.html`, `spec/cartjs/formatters.js`
- `AGENTS.md` §2 (Mepto as test harness), §3 (no API break), §4.2 (STE100)
- Plans: `001`, `002` (tinybind), `003` (decaffeinate)
