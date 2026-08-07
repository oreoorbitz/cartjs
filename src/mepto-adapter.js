/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 */
// CartJS Mepto Adapter
// Ensures window.jQuery, window.$, window.mepto are strict === for drop-in.
// Prefers Mepto (meptos) with jQuery fallback. For themes that already load jQuery, keep it.

(function() {
  var adapter = null;

  // Try to resolve Mepto from globals first (browser UMD)
  if (typeof window !== 'undefined') {
    if (window.mepto) {
      adapter = window.mepto;
    } else if (window.$ && window.$.mepto) {
      // Mepto may set $ with mepto flag
      adapter = window.$;
    } else if (window.jQuery) {
      adapter = window.jQuery;
    }
  }

  // Try CommonJS require if not in browser (Node, bundler)
  if (!adapter) {
    try {
      var meptos = require('meptos');
      if (meptos && meptos.$) {
        adapter = meptos.$;
      } else if (meptos && meptos.mepto) {
        adapter = meptos.mepto;
      } else {
        adapter = meptos;
      }
    } catch (e) {
      // no meptos in Node, fallback to jquery if available
      try {
        adapter = require('jquery');
      } catch (e2) {}
    }
  }

  // Alias for drop-in: all three globals strict ===
  if (typeof window !== 'undefined' && adapter) {
    // Prefer Mepto if both exist — Mepto is the modern path
    var preferred = null;
    if (window.mepto) {
      preferred = window.mepto;
    } else if (adapter && adapter.mepto) {
      preferred = adapter;
    } else {
      preferred = adapter;
    }
    // Ensure all globals point to same object
    window.jQuery = preferred;
    window.$ = preferred;
    window.mepto = preferred;
    // Also expose as globals for Node-like env
    if (typeof global !== 'undefined') {
      global.jQuery = preferred;
      global.$ = preferred;
      global.mepto = preferred;
    }
  }
})();
