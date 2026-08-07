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
};