/*
 * decaffeinate suggestions:
 * DS101: Remove unnecessary use of Array.from
 * DS102: Remove unnecessary code created because of implicit returns
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
// CartJS.Rivets
// Adds Rivets.js / Tinybind functionality to CartJS if available.
// Drop-in: supports both rivets (0.9.6) and tinybind (1.0.0) via alias.
// -----------------------------------------------------------------

// Resolve binding engine — prefer tinybind, fallback to rivets
// Fix decaffeinate shadow: check window.* not local let
let _bindingEngine = null;
if (typeof window !== "undefined" && window.tinybind != null) {
  _bindingEngine = window.tinybind;
  if (typeof window.rivets === "undefined" || window.rivets == null) { window.rivets = window.tinybind; }
} else if (typeof window !== "undefined" && window.rivets != null) {
  _bindingEngine = window.rivets;
  if (typeof window.tinybind === "undefined" || window.tinybind == null) { window.tinybind = window.rivets; }
}

// Ensure both globals point to same object for drop-in (strict ===)
if (_bindingEngine != null) {
  window.rivets = _bindingEngine;
  window.tinybind = _bindingEngine;
}

if (_bindingEngine != null) {

  // Rivets.js / Tinybind has been loaded, so declare the CartJS.Rivets module.
  CartJS.Rivets = {

    // Maintain a reference to the base model object so that we can reference it later.
    model: null,

    // Maintain a list of all bound views so that we can unbind later if needed.
    boundViews: [],

    // Initialise the Rivets module.
    init() {
      return CartJS.Rivets.bindViews();
    },

    // Tear down the Rivets module.
    destroy() {
      return CartJS.Rivets.unbindViews();
    },

    // Bind all Rivets.js view elements that are currently present on the page.
    bindViews() {
      CartJS.Utils.log('Rivets.js/Tinybind is present, binding views.');

      // Unbind any currently bound views.
      CartJS.Rivets.unbindViews();

      // Merge a new models object with any specified in the settings.
      CartJS.Rivets.model = CartJS.Utils.extend({
        cart: CartJS.cart
      }, CartJS.settings.rivetsModels);

      // If Shopify's Currency global object is available, add it to the data model.
      if (window.Currency != null) {
        CartJS.Rivets.model.Currency = window.Currency;
      }

      // Iterate through and bind all elements marked as views via the [data-cart-view] attribute.
      return mepto('[data-cart-view]').each(function() {
        const view = _bindingEngine.bind(mepto(this), CartJS.Rivets.model);
        return CartJS.Rivets.boundViews.push(view);
      });
    },

    // Unbind all currently bound views.
    unbindViews() {
      for (var view of Array.from(CartJS.Rivets.boundViews)) {
        view.unbind();
      }
      return CartJS.Rivets.boundViews = [];
    }
  };

  // Add useful general-purpose formatters (register on both globals for drop-in)
  const _registerFormatter = function(name, fn) {
    _bindingEngine.formatters[name] = fn;
    // Keep rivets/tinybind in sync if they are separate objects (should be ===, but be safe)
    if (typeof window !== "undefined" && window.rivets != null && window.rivets !== _bindingEngine) {
      window.rivets.formatters[name] = fn;
    }
    if (typeof window !== "undefined" && window.tinybind != null && window.tinybind !== _bindingEngine) {
      return window.tinybind.formatters[name] = fn;
    }
  };

  _registerFormatter('eq', (a, b) => a === b);

  _registerFormatter('includes', (a, b) => a.indexOf(b) >= 0);

  _registerFormatter('match', (a, regexp, flags) => a.match(new RegExp(regexp, flags)));

  _registerFormatter('lt', (a, b) => a < b);

  _registerFormatter('gt', (a, b) => a > b);

  _registerFormatter('not', a => !a);

  _registerFormatter('empty', a => !a.length);

  _registerFormatter('plus', (a, b) => parseInt(a) + parseInt(b));

  _registerFormatter('minus', (a, b) => parseInt(a) - parseInt(b));

  _registerFormatter('times', (a, b) => a * b);

  _registerFormatter('divided_by', (a, b) => a / b);

  _registerFormatter('modulo', (a, b) => a % b);

  _registerFormatter('prepend', (a, b) => b + a);

  _registerFormatter('append', (a, b) => a + b);

  _registerFormatter('slice', (value, start, end) => value.slice(start, end));

  _registerFormatter('pluralize', function(input, singular, plural) {
    if (plural == null) { plural = singular + 's'; }
    if (CartJS.Utils.isArray(input)) { input = input.length; }
    if (input === 1) { return singular; } else { return plural; }
  });

  _registerFormatter('array_element', (array, index) => array[index]);

  _registerFormatter('array_first', array => array[0]);

  _registerFormatter('array_last', array => array[array.length - 1]);

  // Add Shopify-specific formatters
  _registerFormatter('money', (value, currency) => CartJS.Utils.formatMoney(value, CartJS.settings.moneyFormat, 'money_format', currency));

  _registerFormatter('money_with_currency', (value, currency) => CartJS.Utils.formatMoney(value, CartJS.settings.moneyWithCurrencyFormat, 'money_with_currency_format', currency));

  _registerFormatter('weight', function(grams) {
    switch (CartJS.settings.weightUnit) {
      case 'kg': return (grams / 1000).toFixed(CartJS.settings.weightPrecision);
      case 'oz': return (grams * 0.035274).toFixed(CartJS.settings.weightPrecision);
      case 'lb': return (grams * 0.00220462).toFixed(CartJS.settings.weightPrecision);
      default: return grams.toFixed(CartJS.settings.weightPrecision);
    }
  });

  _registerFormatter('weight_with_unit', grams => _bindingEngine.formatters.weight(grams) + CartJS.settings.weightUnit);

  _registerFormatter('product_image_size', (src, size) => CartJS.Utils.getSizedImageUrl(src, size));

  // Add camelCase aliases for underscore formatters.
  _registerFormatter('moneyWithCurrency', _bindingEngine.formatters.money_with_currency);
  _registerFormatter('weightWithUnit', _bindingEngine.formatters.weight_with_unit);
  _registerFormatter('productImageSize', _bindingEngine.formatters.product_image_size);

  // Tinybind compatibility shims for Rivets drop-in
  // 1. index → $index (Tinybind uses $index, Rivets used index)
  // Provide formatter alias so {index} still works if Tinybind provides $index
  if ((_bindingEngine.formatters['$index'] != null) && (_bindingEngine.formatters['index'] == null)) {
    _registerFormatter('index', value => value);
  }

  // 2. unless binder was removed in Tinybind — shim via if+not is documented, but provide alias binder if needed
  if ((_bindingEngine.binders != null) && (_bindingEngine.binders['unless'] == null) && (_bindingEngine.binders['if'] != null)) {
    _bindingEngine.binders['unless'] = _bindingEngine.binders['if'];
  }

} else {

  // Rivets.js / Tinybind has not been loaded, so just declare a no-operation CartJS.Rivets module.
  CartJS.Rivets = {

    init() {},

    destroy() {}
  };
}
