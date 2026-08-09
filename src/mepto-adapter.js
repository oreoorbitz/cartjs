// CartJS Mepto Adapter — graceful fallback, not bundled
// Resolves adapter at runtime: prefers window.mepto, falls back to window.jQuery/window.$
// Ensures window.mepto, window.jQuery, window.$ are strict === for drop-in
// dist/cart.js remains external: theme loads mepto or jQuery separately via <script> tag

(function () {
  var adapter = null;
  var hasWindow = typeof window !== 'undefined';

  // 1. Prefer mepto already on page (theme loaded meptos.min.js)
  if (hasWindow) {
    if (window.mepto) {
      adapter = window.mepto;
    } else if (window.$ && window.$.mepto) {
      // Mepto may expose itself as $
      adapter = window.$;
    } else if (window.jQuery) {
      // Graceful fallback: jQuery present (legacy theme)
      adapter = window.jQuery;
    } else if (window.$) {
      adapter = window.$;
    }
  }

  // 2. Node / bundler fallback (Vitest happy-dom, build)
  if (!adapter) {
    try {
      var meptos = require('meptos');
      if (meptos && meptos.$) adapter = meptos.$;
      else if (meptos && meptos.mepto) adapter = meptos.mepto;
      else adapter = meptos;
    } catch (e) {
      try {
        adapter = require('jquery');
      } catch (e2) {}
    }
  }

  // 3. Alias all globals to same object so existing theme code
  //    `jQuery(document).on('cart.requestComplete', ...)` keeps working
  //    whether theme loaded mepto or jQuery
  if (hasWindow && adapter) {
    var preferred = window.mepto || adapter;
    // If both mepto and jQuery exist, prefer mepto (modern path)
    if (window.mepto && window.mepto.mepto) preferred = window.mepto;
    else if (adapter && adapter.mepto) preferred = adapter;

    window.mepto = preferred;
    window.jQuery = preferred;
    window.$ = preferred;

    if (typeof global !== 'undefined') {
      global.mepto = preferred;
      global.jQuery = preferred;
      global.$ = preferred;
    }
  } else if (typeof global !== 'undefined' && adapter) {
    global.mepto = adapter;
    global.jQuery = adapter;
    global.$ = adapter;
    if (hasWindow) {
      window.mepto = adapter;
      window.jQuery = adapter;
      window.$ = adapter;
    }
  }
})();
