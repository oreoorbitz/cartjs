// spec/browser/setup.browser.js — runs inside real browser (Vitest Browser Mode)
import 'should';

// Load tinybind and CartJS in the browser page context
// Vitest browser provides `window` as the real browser window
// We inject scripts via dynamic import / fetch + eval so the LLM can see the same IIFE that themes use

async function loadScript(src) {
  return new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = src;
    s.onload = resolve;
    s.onerror = reject;
    document.head.appendChild(s);
  });
}

async function loadScriptText(url) {
  const res = await fetch(url);
  const text = await res.text();
  // Use window.eval to run IIFE in page scope (same as <script src>)
  window.eval(text);
}

// Setup before each file — load deps once
if (!window.__CARTJS_BROWSER_SETUP) {
  window.__CARTJS_BROWSER_SETUP = (async () => {
    // jQuery / Mepto — use meptos UMD if available, fallback to jquery
    try {
      await loadScript('/node_modules/meptos/dist/meptos.umd.cjs');
      if (window.mepto) {
        window.jQuery = window.$ = window.mepto;
      }
    } catch {}
    if (!window.jQuery) {
      await loadScript('/node_modules/jquery/dist/jquery.js');
    }
    // Tinybind
    await loadScript('/node_modules/tinybind/dist/tinybind.js');
    window.rivets = window.tinybind;
    // CartJS — built file (IIFE)
    await loadScriptText('/dist/cart.js');

    // Ensure globals for drop-in tests
    if (window.tinybind) window.rivets = window.tinybind;
    if (window.mepto) window.jQuery = window.$ = window.mepto;

    // Minimal Shopify stubs so CartJS.Utils.formatMoney does not warn
    window.Shopify = window.Shopify || { formatMoney: (v) => `$${(v / 100).toFixed(2)}` };
    window.Currency = window.Currency || { convert: (v) => v, moneyFormats: {} };
  })();
  await window.__CARTJS_BROWSER_SETUP;
}

// Fixtures helper for browser — mirror spec/fixtures/carts.js but via JSON clone
window.Fixtures = {
  getCart(name) {
    const carts = {
      empty: {
        token: null, note: null, attributes: {}, total_price: 0, total_discount: 0, total_weight: 0, item_count: 0, items: [], requires_shipping: false
      },
      'with-items': {
        token: 'test-token', note: null, attributes: {}, total_price: 1998, total_discount: 0, total_weight: 200, item_count: 2,
        items: [
          { id: 1, key: '1:abc', title: 'Test Product 1', quantity: 1, price: 999, line_price: 999, properties: {} },
          { id: 2, key: '2:def', title: 'Test Product 2', quantity: 1, price: 999, line_price: 999, properties: {} }
        ],
        requires_shipping: true
      }
    };
    return JSON.parse(JSON.stringify(carts[name] || carts.empty));
  }
};
