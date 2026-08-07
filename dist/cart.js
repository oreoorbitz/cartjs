// Cart.js
// version: 1.1.0
// author: Gavin Ballard
// license: MIT
(function() {
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
;
/*
 * decaffeinate suggestions:
 * DS101: Remove unnecessary use of Array.from
 * DS102: Remove unnecessary code created because of implicit returns
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
// CartJS.Cart
// Wraps a normal cart JSON object to provide additional functionality.
// ---------------------

class Cart {

  // Update the cart object in a way that doesn't destroy existing values.
  //
  // Implemented like this instead of a direct assignment to prevent interference with any data bindings.
  constructor() {
    this.update = this.update.bind(this);
  }

  update(cart) {
    for (var key in cart) {
      var value = cart[key];
      if (key !== 'items') {
        this[key] = value;
      }
    }
    return this.items = (Array.from(cart.items).map((item) => new Item(item)));
  }
}
;
/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * DS205: Consider reworking code to avoid use of IIFEs
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
// CartJS.Item
// Wraps a normal cart item JSON object to provide additional functionality.
// ---------------------


class Item {

  constructor(item) {
    this.update = this.update.bind(this);
    this.propertyArray = this.propertyArray.bind(this);
    this.update(item);
  }

  // Update this item in a way that doesn't destroy existing values.
  //
  // Implemented like this instead of a direct assignment to prevent interference with any data bindings.
  update(item) {
    for (var key in item) {
      var value = item[key];
      if (key !== 'properties') {
        this[key] = value;
      }
    }
    return this.properties = CartJS.Utils.extend({}, item.properties);
  }

  // Returns the properties of this item as an array of objects with name/value
  // properties. Useful when you'd like to iterate properties without knowing
  // in advance what they'll be.
  propertyArray() {
    return (() => {
      const result = [];
      for (var name in this.properties) {
        var value = this.properties[name];
        result.push({ name, value });
      }
      return result;
    })();
  }
}
;
/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
// The CartJS namespace.
// ---------------------

const CartJS = {
  // Default settings, publicly accessible on `module.settings`.
  settings: {
    debug: false,
    dataAPI: true,
    requestBodyClass: null,
    rivetsModels: {},
    currency: null,
    moneyFormat: null,
    moneyWithCurrencyFormat: null,
    weightUnit: 'g',
    weightPrecision: 0
  },


  // Our extended cart model.
  cart: new Cart()
};

// Initialisation method. Should be called at the bottom of the page template (usually at the bottom of theme.liquid),
// being passed a JSON representation of the current cart plus an option settings objects. For example:
//
//   <script type="text/javascript">
//     CartJS.init({{ cart | json }}, {
//       dataAPI: true
//     });
//   </script>
//
CartJS.init = function(cart, settings) {
  // Configure settings from any passed settings hash.
  if (settings == null) { settings = {}; }
  CartJS.configure(settings);

  // Note that we are initialising the library.
  CartJS.Utils.log('Initialising CartJS.');

  // Update the cart model with the initial cart objects.
  CartJS.cart.update(cart);

  // Initialise the Data API if enabled.
  if (CartJS.settings.dataAPI) {
    CartJS.Utils.log('"dataAPI" setting is true, initialising Data API.');
    CartJS.Data.init();
  }

  // Set up toggling of CSS class on body during requests if provided.
  if (CartJS.settings.requestBodyClass) {
    CartJS.Utils.log('"requestBodyClass" set, adding event listeners.');
    jQuery(document).on('cart.requestStarted', () => jQuery('body').addClass(CartJS.settings.requestBodyClass));
    jQuery(document).on('cart.requestComplete', () => jQuery('body').removeClass(CartJS.settings.requestBodyClass));
  }

  // Initialise DOM Binding through Rivets module.
  // Performs a no-op if Rivets.js isn't present.
  CartJS.Rivets.init();

  return jQuery(document).trigger('cart.ready', [CartJS.cart]);
};

// Configure CartJS with the given settings object.
CartJS.configure = function(settings) {
  if (settings == null) { settings = {}; }
  return CartJS.Utils.extend(CartJS.settings, settings);
};

// Add a stubbed out console.log method for browsers that don't implement it.
// Omitting this method can lead to Javascript failures in some browsers.
// See: http://stackoverflow.com/questions/7742781/why-javascript-only-works-after-opening-developer-tools-in-ie-once
if (window.console == null) {
  window.console = {};
  window.console.log = function() {};
}
;
/*
 * decaffeinate suggestions:
 * DS101: Remove unnecessary use of Array.from
 * DS102: Remove unnecessary code created because of implicit returns
 * DS103: Rewrite code to no longer use __guard__, or convert again using --optional-chaining
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
// CartJS.Utils
// Utility methods.
// ----------------

const FORMAT_MONEY_WARNING = 'A money formatting filter was used, but Shopify.formatMoney is not available. See the note "Dependency when formatting monetary values" on this page: https://cartjs.org/pages/guide#getting-started-setup.';

CartJS.Utils = {

  // Log an informational message to the console iff debug mode is on and a console is available.
  log() {
    return CartJS.Utils.console(console.log, arguments);
  },

  // Log a warning message to the console iff debug mode is on and a console is available.
  warn() {
    return CartJS.Utils.console(console.warn, arguments);
  },

  // Log an error message to the console iff debug mode is on and a console is available.
  error() {
    return CartJS.Utils.console(console.error, arguments);
  },

  // General wrapper method for outputting to console.
  console(method, args) {
    if (CartJS.settings.debug && (typeof console !== 'undefined' && console !== null)) {
      args = Array.prototype.slice.call(args);
      args.unshift('[CartJS]:');
      return method.apply(console, args);
    }
  },

  // Returns the given object with each key wrapped with the text specified by
  // the 'type' parameter and square brackets, suitable for passing as a POST
  // variable to Shopify. 'type' defaults to 'properties'.
  //
  // For example, {"size": "xs"} becomes {"properties[size]": "xs"}.
  //
  // If 'override' is provided, the actual values in obj will be ignored and
  // all values will be set to that of the override. This is primarily useful
  // when wanting to reset values by setting them to an empty string. Note
  // null values for override will be ignored.
  //
  // Any keys in the provided 'skip' list will, as you'd expect, be skipped in
  // the wrapping but will still be present in the resulting hash.
  wrapKeys(obj, type, override, skip) {
    if (type == null) { type = 'properties'; }
    if (skip == null) { skip = []; }
    const wrapped = {};
    for (var key in obj) {
      var value = obj[key];
      var mappedKey = Array.from(skip).includes(key) ? key : `${type}[${key}]`;
      wrapped[mappedKey] = (override != null) ? override : value;
    }
    return wrapped;
  },

  // Perform the opposite function to wrapKeys above.
  //
  // For example, {"properties[size]": "xs"} becomes {"size": "xs"}.
  unwrapKeys(obj, type, override) {
    if (type == null) { type = 'properties'; }
    const unwrapped = {};
    for (var key in obj) {
      var value = obj[key];
      var unwrappedKey = key.replace(`${type}[`, "").replace("]", "");
      unwrapped[unwrappedKey] = (override != null) ? override : value;
    }
    return unwrapped;
  },

  // Extend a source object with the properties of another object.
  //
  // Can be used to shallow copy an object like so:
  //   copy = extend({}, original)
  extend(object, properties) {
    for (var key in properties) {
      var val = properties[key];
      object[key] = val;
    }
    return object;
  },

  // Clone a source object (deep copy).
  clone(object) {
    if ((object == null) || (typeof object !== 'object')) {
      return object;
    }
    const newInstance = new object.constructor();
    for (var key in object) {
      newInstance[key] = clone(object[key]);
    }
    return newInstance;
  },

  // Return a key from an object and delete it.
  delete(object, key) {
    const val = object[key];
    delete object[key];
    return val;
  },

  // Return true if the given value is an array.
  isArray: Array.isArray || (value => ({}).toString.call(value) === '[object Array]'),

  // Ensure that the given value is returned as an array, either with entries intact or as a blank value.
  ensureArray(value) {
    if (CartJS.Utils.isArray(value)) {
      return value;
    }
    if (value != null) { return [value]; } else { return []; }
  },

  // Format a monetary amount using Shopify's formatMoney if available.
  //
  // If it's not available, just return the value.
  formatMoney(value, format, formatName, currency) {
    if (currency == null) { currency = ''; }
    if (!currency) {
      ({
        currency
      } = CartJS.settings);
    }

    // If we've specified a currency other than the default one, convert the value and format.
    if ((window.Currency != null) && (currency !== CartJS.settings.currency)) {
      // Convert value.
      value = Currency.convert(value, CartJS.settings.currency, currency);

      // Fetch the appropriate format.
      if (((window.Currency != null ? window.Currency.moneyFormats : undefined) != null) && (currency in window.Currency.moneyFormats)) {
        format = window.Currency.moneyFormats[currency][formatName];
      }
    }

    // Render the formatted amount using the Shopify formatter if available, else just the value.
    if ((window.Shopify != null ? window.Shopify.formatMoney : undefined) != null) {
      return Shopify.formatMoney(value, format);
    } else {
      CartJS.Utils.warn(FORMAT_MONEY_WARNING);
      return value;
    }
  },

  // Return a resized image URL using Shopify's getSizedImageUrl if available.
  //
  // If it's not available, just return the original URL.
  getSizedImageUrl(src, size) {
    if (window.Shopify?.Image?.getSizedImageUrl != null) {
      if (src) { return Shopify.Image.getSizedImageUrl(src, size); } else { return Shopify.Image.getSizedImageUrl('https://cdn.shopify.com/s/images/admin/no-image-.gif', size).replace('-_', '-'); }
    } else {
      if (src) { return src; } else { return 'https://cdn.shopify.com/s/images/admin/no-image-large.gif'; }
    }
  }
};;
/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
// CartJS.Queue
// Queue management for synchronous AJAX requests.
// -----------------------------------------------

const queue = [];
let processing = false;

CartJS.Queue = {

  // Add a new request to the queue. Starts processing the queue if we're not already doing so.
  add(url, data, options) {
    // Set up request from arguments and options.
    if (options == null) { options = {}; }
    const request = {
      url,
      data,
      type: options.type || 'POST',
      dataType: options.dataType || 'json',
      cache: !!options.cache,
      success: CartJS.Utils.ensureArray(options.success),
      error: CartJS.Utils.ensureArray(options.error),
      complete: CartJS.Utils.ensureArray(options.complete)
    };

    // Add the cart update method as a success callback if required.
    if (options.updateCart) {
      request.success.push(CartJS.cart.update);
    }

    // Add request to the queue.
    queue.push(request);

    // Don't need to start processing if we're already doing it.
    if (processing) { return; }

    // Start processing.
    jQuery(document).trigger('cart.requestStarted', [CartJS.cart]);
    return CartJS.Queue.process();
  },

  // Process the next item in the queue, if there is one.
  process() {
    if (!queue.length) {
      processing = false;
      jQuery(document).trigger('cart.requestComplete', [CartJS.cart]);
      return;
    }

    processing = true;
    const params = queue.shift();
    params.complete = CartJS.Queue.process;
    return jQuery.ajax(params);
  }
};
;
/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
// CartJS.Core
// Core API methods for manipulating carts.
// ----------------------------------------

CartJS.Core = {

  // Fetch updated cart object from API endpoint.
  getCart(options) {
    if (options == null) { options = {}; }
    options.type = 'GET';
    options.updateCart = true;
    return CartJS.Queue.add('/cart.js', {v: new Date().getTime()}, options);
  },

  // Add a new line item to the cart.
  addItem(id, quantity, properties, options) {
    if (quantity == null) { quantity = 1; }
    if (properties == null) { properties = {}; }
    if (options == null) { options = {}; }
    const data = CartJS.Utils.wrapKeys(properties, null, null, ['selling_plan']);
    data.id = id;
    data.quantity = quantity;
    CartJS.Queue.add('/cart/add.js', data, options);
    return CartJS.Core.getCart();
  },

  // Add multiple new line items to the cart.
  addItems(items, options) {
    if (options == null) { options = {}; }
    const data =
      {items};
    CartJS.Queue.add('/cart/add.js', data, options);
    return CartJS.Core.getCart();
  },

  // Update an existing line item.
  updateItem(line, quantity, properties, options) {
    if (properties == null) { properties = {}; }
    if (options == null) { options = {}; }
    const data = CartJS.Utils.wrapKeys(properties, null, null, ['selling_plan']);
    data.line = line;
    if (quantity != null) {
      data.quantity = quantity;
    }
    options.updateCart = true;
    return CartJS.Queue.add('/cart/change.js', data, options);
  },

  // Remove an existing line item.
  removeItem(line, options) {
    if (options == null) { options = {}; }
    return CartJS.Core.updateItem(line, 0, {}, options);
  },

  // Update item by ID
  updateItemById(id, quantity, properties, options) {
    if (properties == null) { properties = {}; }
    if (options == null) { options = {}; }
    const data = CartJS.Utils.wrapKeys(properties, null, null, ['selling_plan']);
    data.id = id;
    if (quantity != null) {
      data.quantity = quantity;
    }
    options.updateCart = true;
    return CartJS.Queue.add('/cart/change.js', data, options);
  },

  // Set the quantities of a number of items in the cart with an ID/Quantity "updates" mapping.
  updateItemQuantitiesById(updates, options) {
    if (updates == null) { updates = {}; }
    if (options == null) { options = {}; }
    options.updateCart = true;
    return CartJS.Queue.add('/cart/update.js', {updates}, options);
  },

  // Remove all line items for the given variant ID.
  removeItemById(id, options) {
    if (options == null) { options = {}; }
    const data = {
      id,
      quantity: 0
    };
    options.updateCart = true;
    return CartJS.Queue.add('/cart/change.js', data, options);
  },

  // Clear all items from the cart.
  clear(options) {
    if (options == null) { options = {}; }
    options.updateCart = true;
    return CartJS.Queue.add('/cart/clear.js', {}, options);
  },

  // Get a cart attribute.
  getAttribute(attributeName, defaultValue) {
    if (attributeName in CartJS.cart.attributes) { return CartJS.cart.attributes[attributeName]; } else { return defaultValue; }
  },

  // Set a cart attribute.
  setAttribute(attributeName, value, options) {
    if (options == null) { options = {}; }
    const attributes = {};
    attributes[attributeName] = value;
    return CartJS.Core.setAttributes(attributes, options);
  },

  // Get all cart attributes as a hash.
  getAttributes() {
    return CartJS.cart.attributes;
  },

  // Set multiple cart attributes using a hash.
  setAttributes(attributes, options) {
    if (attributes == null) { attributes = {}; }
    if (options == null) { options = {}; }
    options.updateCart = true;
    return CartJS.Queue.add('/cart/update.js', CartJS.Utils.wrapKeys(attributes, 'attributes'), options);
  },

  // Clear all attributes.
  clearAttributes(options) {
    if (options == null) { options = {}; }
    options.updateCart = true;
    return CartJS.Queue.add('/cart/update.js', CartJS.Utils.wrapKeys(CartJS.Core.getAttributes(), 'attributes', ''), options);
  },

  // Get the cart note.
  getNote() {
    return CartJS.cart.note;
  },

  // Set the cart note.
  setNote(note, options) {
    if (options == null) { options = {}; }
    options.updateCart = true;
    return CartJS.Queue.add('/cart/update.js', { note }, options);
  }
};
;
/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
// CartJS.Data
// Data API for CartJS.
// --------------------

// Reference to the document element.
let $document = null;

CartJS.Data = {

  // Initialise the Data API.
  init() {
    $document = jQuery(document);
    CartJS.Data.setEventListeners('on');
    return CartJS.Data.render(null, CartJS.cart);
  },

  // Tear down the Data API.
  destroy() {
    return CartJS.Data.setEventListeners('off');
  },

  // Bind or unbind listeners for Data API events.
  setEventListeners(method) {
    // Attach or remove event listeners for data-cart-* events.
    $document[method]('click', '[data-cart-add]', CartJS.Data.add);
    $document[method]('click', '[data-cart-remove]', CartJS.Data.remove);
    $document[method]('click', '[data-cart-remove-id]', CartJS.Data.removeById);
    $document[method]('click', '[data-cart-update]', CartJS.Data.update);
    $document[method]('click', '[data-cart-update-id]', CartJS.Data.updateById);
    $document[method]('click', '[data-cart-clear]', CartJS.Data.clear);
    $document[method]('change', '[data-cart-toggle]', CartJS.Data.toggle);
    $document[method]('change', '[data-cart-toggle-attribute]', CartJS.Data.toggleAttribute);
    $document[method]('submit', '[data-cart-submit]', CartJS.Data.submit);

    // Attach or remove event listeners for data-cart-render events.
    return $document[method]('cart.requestComplete', CartJS.Data.render);
  },

  // Handler for [data-cart-add] click events.
  add(e) {
    e.preventDefault();
    const $this = jQuery(this);
    const properties = {};
    properties.selling_plan = $this.attr('data-cart-selling-plan');
    return CartJS.Core.addItem($this.attr('data-cart-add'), $this.attr('data-cart-quantity'), properties);
  },

  // Handler for [data-cart-remove] click events.
  remove(e) {
    e.preventDefault();
    const $this = jQuery(this);
    return CartJS.Core.removeItem($this.attr('data-cart-remove'));
  },

  // Handler for [data-cart-remove-id] click events.
  removeById(e) {
    e.preventDefault();
    const $this = jQuery(this);
    return CartJS.Core.removeItemById($this.attr('data-cart-remove-id'));
  },

  // Handler for [data-cart-update] click events.
  update(e) {
    e.preventDefault();
    const $this = jQuery(this);
    const properties = {};
    properties.selling_plan = $this.attr('data-cart-selling-plan');
    return CartJS.Core.updateItem($this.attr('data-cart-update'), $this.attr('data-cart-quantity'), properties);
  },

  // Handler for [data-cart-update-id] click events.
  updateById(e) {
    e.preventDefault();
    const $this = jQuery(this);
    const properties = {};
    properties.selling_plan = $this.attr('data-cart-selling-plan');
    return CartJS.Core.updateItemById($this.attr('data-cart-update-id'), $this.attr('data-cart-quantity'), properties);
  },

  // Handler for [data-cart-clear] click events.
  clear(e) {
    e.preventDefault();
    return CartJS.Core.clear();
  },

  // Handler for [data-cart-toggle] change events.
  toggle(e) {
    const $input = jQuery(this);
    const id = $input.attr('data-cart-toggle');
    if ($input.is(':checked')) {
      return CartJS.Core.addItem(id);
    } else {
      return CartJS.Core.removeItemById(id);
    }
  },

  // Handler for [data-cart-toggle-attribute] change events.
  toggleAttribute(e) {
    const $input = jQuery(this);
    const attribute = $input.attr('data-cart-toggle-attribute');
    return CartJS.Core.setAttribute(attribute, $input.is(':checked') ? 'Yes' : '');
  },

  // Handle for [data-cart-submit] submit events.
  submit(e) {
    e.preventDefault();

    const dataArray = jQuery(this).serializeArray();

    let id = undefined;
    let quantity = undefined;
    const properties = {};
    jQuery.each(dataArray, function(i, item) {
      if (item.name === 'id') {
        return id = item.value;
      } else if (item.name === 'quantity') {
        return quantity = item.value;
      } else if (item.name === 'selling_plan') {
        return properties.selling_plan = item.value;
      } else if (item.name.match(/^properties\[[\w-_ ]*\]$/)) {
        return properties[item.name] = item.value;
      }
    });

    return CartJS.Core.addItem(id, quantity, CartJS.Utils.unwrapKeys(properties));
  },

  // Handler for rendering simple cart properties to bound elements.
  render(e, cart) {
    // Build a hash of render context.
    const context = {
      'item_count': cart.item_count,
      'total_price': cart.total_price,
      'total_price_money': CartJS.Utils.formatMoney(cart.total_price, CartJS.settings.moneyFormat, 'money_format', ((typeof Currency !== 'undefined' && Currency !== null ? Currency.currentCurrency : undefined) != null) ? Currency.currentCurrency : undefined),
      'total_price_money_with_currency': CartJS.Utils.formatMoney(cart.total_price, CartJS.settings.moneyWithCurrencyFormat, 'money_with_currency_format', ((typeof Currency !== 'undefined' && Currency !== null ? Currency.currentCurrency : undefined) != null) ? Currency.currentCurrency : undefined),
    };

    // Render the context to elements as needed.
    return jQuery('[data-cart-render]').each(function(){
      const $this = jQuery(this);
      return $this.html(context[$this.attr('data-cart-render')]);});
  }
};
;
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
      return jQuery('[data-cart-view]').each(function() {
        const view = _bindingEngine.bind(jQuery(this), CartJS.Rivets.model);
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
;
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

}).call(typeof window !== "undefined" ? window : this);