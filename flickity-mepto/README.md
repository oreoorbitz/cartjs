# flickity-mepto — Mepto-integrated Flickity 2.3.0

Efficient, drop-in replacement for `Flickity PACKAGED v2.3.0` (last upstream release 2021-12-19, GPLv3/Commercial).

## Why

- `example theme assets/custom-plugin.js` (123K) bundles `Flickity PACKAGED v2.2.2 PACKAGED = jquery-bridget v2.0.1 + ev-emitter + get-size + fizzy-ui-utils + unidragger/unipointer + flickity core` and expects `window.jQuery` / `$.bridget` / `$.data` / `$.Event` / `$element.trigger`.
- Theme also ships `swiper-bundle.js` (151K) — duplicate carousel, choose one.
- `getSize v2.0.3` itself is vanilla (0 jQuery) and stays as-is; the modernization target is Flickity’s jQuery surface, not getSize.

## Goal — keep every Flickity API, replace jQuery with Mepto

- `new Flickity(elem, opts)` , `Flickity.data(elem)`, `Flickity.Cell/Slide`, `Flickity.defaults`, `Flickity.createMethods`, `Flickity.setJQuery` — identical to v2.3.0.
- `$(elem).flickity(opts)` plugin via bridget stays, but backed by Mepto (`window.mepto || window.jQuery`).
- No breaking HTML: `data-flickity`, `.flickity-enabled`, `.flickity-viewport`, page-dots, prev/next, lazyload, `flickity-as-nav-for` / `imagesloaded` still work.
- More efficient than PACKAGED: remove `jquery-bridget` UMD, remove dead `imagesloaded/as-nav-for` from bundle (PACKAGED shipped them), tree-shake via Vite ESM, keep `ev-emitter/get-size` external as before.

## jQuery surface mapped → Mepto

| Upstream `js/flickity.js` line | jQuery | Mepto equivalent |
|---|---|---|
| 50 `var jQuery = window.jQuery` | `window.jQuery` | `window.mepto \|\| window.jQuery \|\| window.$` |
| 85 `this.$element = jQuery(this.element)` | `$(el)` | `$ (mepto)`, same |
| 483 `new jQuery.Event(event)` | `$.Event` | `new $.Event` (mepto Event) or fallback `new Event` |
| 493 `this.$element.trigger($event, args)` | `$().trigger` | `$.fn.trigger` (mepto) |
| 897 `jQuery.removeData(el,'flickity')` | `$.removeData` | `el.flickityGUID` delete + `delete instances[guid]` (mepto has no removeData) |
| 922 `jQuery.bridget('flickity',F)` | `$.bridget` | shim `src/mepto-bridget.js` → `$.fn.flickity` |
| 926 `Flickity.setJQuery(jq)` | rebind internal `jQuery` | `setMepto = setJQuery` alias, both set `$` |

## Layout

```
flickity-mepto/
  src-orig/          # verbatim v2.3.0 js/ (reference, do not edit)
  src/               # mepto-integrated ESM (patched flickity.js + mepto-bridget.js + verbatim others)
  css/flickity.css   # verbatim
  dist/              # Vite build: flickity.pkgd.js + flickity.pkgd.min.js + ESM flickity.esm.js
  vite.config.mjs
  package.json
  README.upstream.md
```

## Build

```sh
npm --prefix flickity-mepto install
npm --prefix flickity-mepto run build   # Vite ESM + IIFE, mepto external
```

`dist/flickity.pkgd.js` is IIFE global `Flickity` (theme `<script>`), `dist/flickity.esm.js` is ESM `import Flickity from 'flickity-mepto'` with `mepto` external.

## Use in theme (experimental branch)

```liquid
{{ 'mepto.js' | asset_url | script_tag }}
{{ 'flickity-mepto/dist/flickity.pkgd.min.js' | asset_url | script_tag }}
{{ 'flickity-mepto/dist/flickity.min.css' | asset_url | stylesheet_tag }}
```

Then `new Flickity('.carousel')` and `$('.carousel').flickity()` both work. `Flickity.setJQuery = Flickity.setMepto` for compat.
