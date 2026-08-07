// spec/setup.js — happy-dom setup for Vitest (migrate from spec/runner.html)
import 'should';
import fs from 'fs';
import path from 'path';

// happy-dom provides globalThis.window, document
// Ensure globals for legacy specs that use window.*
if (!globalThis.window) globalThis.window = globalThis;

// 1) Provide jQuery + Mepto globals (strict ===) for drop-in tests
// Use jquery@4 as the reliable implementation for unit tests; alias mepto to same object
// Mepto (meptos 2.0.0) is intended for browser/theme test — in happy-dom its UMD expects
// a pre-existing window.mepto and does not reliably create a callable $ on Node 20, so
// we use jquery here and alias all three globals to satisfy window.jQuery===window.$===window.mepto
try {
  const jqueryMod = await import('jquery');
  const jq = jqueryMod.default || jqueryMod;
  // jquery may be function with .extend, .ajax stub will be mocked below if needed
  globalThis.window.jQuery = globalThis.window.$ = globalThis.window.mepto = jq;
  globalThis.jQuery = globalThis.$ = globalThis.mepto = jq;
  if (typeof globalThis.$ === 'function' && !globalThis.$.mepto) {
    // mark as mepto-like for adapter detection
    globalThis.$.mepto = globalThis.$;
  }
} catch (e) {
  console.warn('spec/setup.js: jquery import failed', e.message);
}

// 2) Tinybind: tinybind 1.0.0 is ESM, set window.tinybind / window.rivets alias
try {
  const tb = await import('tinybind');
  const tinybind = tb.default || tb;
  globalThis.window.tinybind = globalThis.window.rivets = tinybind;
  globalThis.tinybind = globalThis.rivets = tinybind;
} catch {
  try {
    const tinyPath = path.resolve('node_modules/tinybind/dist/tinybind.js');
    if (fs.existsSync(tinyPath)) {
      const code = fs.readFileSync(tinyPath, 'utf8');
      globalThis.window.eval(code);
      globalThis.tinybind = globalThis.rivets = globalThis.window.tinybind || globalThis.window.rivets;
    }
  } catch {}
}

// 3) Load CartJS bundle via window.eval (defines window.CartJS as IIFE)
try {
  const cartPath = path.resolve('dist/cart.js');
  if (fs.existsSync(cartPath)) {
    const cartCode = fs.readFileSync(cartPath, 'utf8');
    globalThis.window.eval(cartCode);
    if (globalThis.window.CartJS) {
      globalThis.CartJS = globalThis.window.CartJS;
      // Also ensure Cart is globally reachable for specs
      if (globalThis.window.Cart) globalThis.Cart = globalThis.window.Cart;
      if (globalThis.window.Item) globalThis.Item = globalThis.window.Item;
    }
    if (globalThis.window.rivets) globalThis.rivets = globalThis.window.rivets;
    if (globalThis.window.tinybind) globalThis.tinybind = globalThis.window.tinybind;
  } else {
    console.warn('spec/setup.js: dist/cart.js not found — run npm run build first');
  }
} catch (e) {
  console.warn('spec/setup.js: failed to load dist/cart.js', e.message);
}

// Ensure jQuery has $.extend for fixtures (mepto may not)
if (globalThis.jQuery && typeof globalThis.jQuery.extend !== 'function') {
  globalThis.jQuery.extend = function() {
    let deep = false, target, i = 0;
    if (typeof arguments[0] === 'boolean') { deep = arguments[0]; target = arguments[1] || {}; i = 2; } else { target = arguments[0] || {}; i = 1; }
    for (; i < arguments.length; i++) {
      const src = arguments[i];
      if (src != null) {
        for (const key in src) {
          const val = src[key];
          if (deep && val && typeof val === 'object') {
            target[key] = globalThis.jQuery.extend(true, Array.isArray(val) ? [] : {}, val);
            // deep merge already done via recursion, now copy via extend
            // Actually we need to merge into target[key]; simple JSON clone suffices for fixtures
            target[key] = JSON.parse(JSON.stringify(val));
            // Use deep copy via JSON for fixtures (only plain objects)
            if (Array.isArray(val)) target[key] = JSON.parse(JSON.stringify(val));
            else if (val && typeof val === 'object') target[key] = JSON.parse(JSON.stringify(val));
            else target[key] = val;
          } else {
            target[key] = val;
          }
        }
      }
    }
    return target;
  };
  if (globalThis.window) globalThis.window.jQuery = globalThis.jQuery;
  if (globalThis.window) globalThis.window.$ = globalThis.jQuery;
  globalThis.$ = globalThis.jQuery;
}
// Alias $ for fixtures eval scope
if (typeof globalThis.$ === 'undefined' && globalThis.jQuery) globalThis.$ = globalThis.jQuery;
// Load fixtures (carts) — provide Fixtures without relying on $.extend edge
try {
  const fixturesPath = path.resolve('spec/fixtures/carts.js');
  if (fs.existsSync(fixturesPath)) {
    // Read original file but replace $.extend with JSON deep clone for reliability
    // Original: Fixtures.getCart = function(name) { return $.extend(true, {}, _carts[name]); }
    // We implement directly to avoid $.extend dependency
    const cartsCode = fs.readFileSync(fixturesPath, 'utf8');
    // Extract _carts object by evaluating only the data part in a sandbox that provides a stub $
    // Simpler: define Fixtures manually with deep clone
    globalThis.Fixtures = {
      getCart(name) {
        const _carts = {
          empty: {
            token: null, note: null, attributes: {}, total_price: 0, total_discount: 0, total_weight: 0, item_count: 0, items: [], requires_shipping: false
          },
          'with-items': {
            token: "test-token", note: null, attributes: {}, total_price: 1998, total_discount: 0, total_weight: 200, item_count: 2,
            items: [
              { id: 1, key: "1:abc", title: "Test Product 1", quantity: 1, price: 999, line_price: 999, properties: {} },
              { id: 2, key: "2:def", title: "Test Product 2", quantity: 1, price: 999, line_price: 999, properties: {} }
            ],
            requires_shipping: true
          }
        };
        if (!_carts[name] && globalThis.window?.Fixtures?._carts?.[name]) {
          return JSON.parse(JSON.stringify(globalThis.window.Fixtures._carts[name]));
        }
        return JSON.parse(JSON.stringify(_carts[name] || _carts.empty));
      },
      _carts: {}
    };
    // Also try to load the original file's _carts via window.eval with jQuery present (now extend exists)
    try { globalThis.window.eval(cartsCode); if (globalThis.window.Fixtures) globalThis.Fixtures = globalThis.window.Fixtures; } catch {}
    // Ensure global Fixtures is also on window
    globalThis.window.Fixtures = globalThis.Fixtures;
  }
} catch (e) {
  console.warn('spec/setup.js: fixtures load failed', e.message);
}

// Load Shopify stubs into window if needed
try {
  const shopifyCurrPath = path.resolve('spec/shopify/currencies.js');
  if (fs.existsSync(shopifyCurrPath)) {
    const code = fs.readFileSync(shopifyCurrPath, 'utf8');
    (0, eval)(code);
  }
  const optPath = path.resolve('spec/shopify/option_selection.js');
  if (fs.existsSync(optPath)) {
    const code2 = fs.readFileSync(optPath, 'utf8');
    (0, eval)(code2);
  }
} catch {}
