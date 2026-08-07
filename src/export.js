/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * DS208: Avoid top-level this
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
// Export the CartJS module.
// -------------------------

// CartJS module factory.
CartJS.factory = function(exports) {
  // Exposes the full CartJS namespace. This is mainly used for isolated testing.
  // exports._ = CartJS (Don't export; only for testing.)

  // Export initialisation and configuration.
  exports.init = CartJS.init;
  exports.configure = CartJS.configure;

  // Export objects attached to CartJS.
  exports.cart = CartJS.cart;
  exports.settings = CartJS.settings;

  // Export core API as top-level methods.
  exports.getCart = CartJS.Core.getCart;
  exports.addItem = CartJS.Core.addItem;
  exports.addItems = CartJS.Core.addItems;
  exports.updateItem = CartJS.Core.updateItem;
  exports.updateItemById = CartJS.Core.updateItemById;
  exports.updateItemQuantitiesById = CartJS.Core.updateItemQuantitiesById;
  exports.removeItem = CartJS.Core.removeItem;
  exports.removeItemById = CartJS.Core.removeItemById;
  exports.clear = CartJS.Core.clear;
  exports.getAttribute = CartJS.Core.getAttribute;
  exports.setAttribute = CartJS.Core.setAttribute;
  exports.getAttributes = CartJS.Core.getAttributes;
  exports.setAttributes = CartJS.Core.setAttributes;
  exports.clearAttributes = CartJS.Core.clearAttributes;
  exports.getNote = CartJS.Core.getNote;
  exports.setNote = CartJS.Core.setNote;

  // Export the render() method for the Data API so that it can be manually triggered if needed.
  return exports.render = CartJS.Data.render;
};

  // Export Cart and Item classes so they can be extended.
  // (Don't export for the moment; this isn't documented yet).
  // exports.Cart = CartJS.Cart
  // exports.Item = CartJS.Item

// Exports CartJS for CommonJS, AMD and the browser.
if (typeof exports === 'object') {
  CartJS.factory(exports);
} else if ((typeof define === 'function') && define.amd) {
  define(['exports'], function(exports) {
    CartJS.factory(this.CartJS = exports);
    return exports;
  });
} else {
  CartJS.factory(this.CartJS = {});
  // Preserve full namespace on window.CartJS for drop-in tests
  if (typeof window !== "undefined" && window.CartJS) {
    window.CartJS.Core = CartJS.Core;
    window.CartJS.Data = CartJS.Data;
    window.CartJS.Rivets = CartJS.Rivets;
    window.CartJS.Utils = CartJS.Utils;
    window.CartJS.Queue = CartJS.Queue;
    if (typeof Cart !== "undefined") window.CartJS.Cart = Cart;
    if (typeof Item !== "undefined") window.CartJS.Item = Item;
  }
}
