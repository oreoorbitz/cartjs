# 009 — Flickity-Mepto — Efficient Mepto-Integrated Flickity

> Standard: ASD-STE100 Simplified Technical English, Issue 8
> Reference: `flickity-mepto/README.md`, `flickity@2.3.0`, `AGENTS.md` 3 (Mepto), `plans/004-jquery-to-mepto-plan.md`
> Status: Draft — `flickity-mepto/` scaffolded from v2.3.0 (last upstream), patched for Mepto

## 1. Objective

Provide a more efficient, Mepto-integrated Flickity that keeps all Flickity same APIs from the last version released (v2.3.0, 2021-12-19). Replace jQuery surface with Mepto, remove `jquery-bridget` weight, keep `PACKAGED` bundle lean.

## 2. Context

- Theme `custom-plugin.js` (123K) = `Flickity PACKAGED v2.2.2 PACKAGED = jquery-bridget + ev-emitter + get-size v2.0.3 + fizzy-ui-utils + unidragger/unipointer + flickity core`. `getSize` itself is 0 jQuery (vanilla `getComputedStyle`), not a separate target.
- `js/flickity.js` jQuery surface: `window.jQuery` → `this.$element`, `jQuery.Event` + `trigger`, `removeData`, `bridget`, `setJQuery`.
- Mepto (`meptos@2.0.0`, UMD `window.mepto`) provides `$.fn`, `$.Event`, `trigger`, but not `bridget/removeData`.

## 3. What was created

- `flickity-mepto/` directory with v2.3.0 `js/` + `css/` verbatim in `src-orig/` + `css/`, and `src/` patched:
  - `src/flickity.js`: `var $ = window.mepto || window.jQuery || window.$`, tolerant `this.$element`, `dispatchEvent` via `$.Event`/`$.fn.trigger`, destroy `removeData` shim, `bridget` fallback to `$.fn.flickity`, `setJQuery` + alias `setMepto`.
  - `src/mepto-bridget.js`: 1.7K shim `$.bridget` → `$.fn` if Mepto lacks it.
  - Other `src/*.js` verbatim (drag, cell, slide, animate, etc. have 0 jQuery).
  - `vite.config.mjs` ESM + IIFE `dist/flickity.pkgd.js` / `flickity.esm.js` (mepto external), banner `PACKAGED v2.3.0-mepto`.
  - `package.json` 2.3.0-mepto.1, peer `meptos`.

## 4. Keep APIs

`new Flickity`, `Flickity.data`, `Flickity.defaults`, `Cell/Slide`, `select/next/previous/destroy/resize`, events (`ready/select/change`), `data-flickity` htmlInit, `$(el).flickity()` via bridget — all from v2.3.0.

## 5. Next steps

1. `npm --prefix flickity-mepto install && npm --prefix flickity-mepto run build` → `dist/`.
2. Copy `dist/flickity.pkgd.min.js` to `test theme assets/flickity-mepto.min.js` for `Orion/experimental-mepto`.
3. Remove duplicate `swiper-bundle.js` (151K) from theme (choose Flickity-Mepto or Swiper).
4. Add browser smoke: `new Flickity('.carousel')`, `$('.carousel').flickity('select',1)`, `Flickity.data`, `flickity` event trigger.
