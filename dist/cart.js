(function() {
  // CartJS.Cart
  // Wraps a normal cart JSON object to provide additional functionality.
  // ---------------------
  var $document, Cart, CartJS, FORMAT_MONEY_WARNING, Item, processing, queue,
    indexOf = [].indexOf;

  Cart = class Cart {
    constructor() {
      // Update the cart object in a way that doesn't destroy existing values.

      // Implemented like this instead of a direct assignment to prevent interference with any data bindings.
      this.update = this.update.bind(this);
    }

    update(cart) {
      var item, key, value;
      for (key in cart) {
        value = cart[key];
        if (key !== 'items') {
          this[key] = value;
        }
      }
      return this.items = (function() {
        var j, len, ref, results;
        ref = cart.items;
        results = [];
        for (j = 0, len = ref.length; j < len; j++) {
          item = ref[j];
          results.push(new Item(item));
        }
        return results;
      })();
    }

  };

  // CartJS.Item
  // Wraps a normal cart item JSON object to provide additional functionality.
  // ---------------------
  Item = class Item {
    constructor(item) {
      // Update this item in a way that doesn't destroy existing values.

      // Implemented like this instead of a direct assignment to prevent interference with any data bindings.
      this.update = this.update.bind(this);
      // Returns the properties of this item as an array of objects with name/value
      // properties. Useful when you'd like to iterate properties without knowing
      // in advance what they'll be.
      this.propertyArray = this.propertyArray.bind(this);
      this.update(item);
    }

    update(item) {
      var key, value;
      for (key in item) {
        value = item[key];
        if (key !== 'properties') {
          this[key] = value;
        }
      }
      return this.properties = CartJS.Utils.extend({}, item.properties);
    }

    propertyArray() {
      var name, ref, results, value;
      ref = this.properties;
      results = [];
      for (name in ref) {
        value = ref[name];
        results.push({
          name: name,
          value: value
        });
      }
      return results;
    }

  };

  // The CartJS namespace.
  // ---------------------
  CartJS = {
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

  //   <script type="text/javascript">
  //     CartJS.init({{ cart | json }}, {
  //       dataAPI: true
  //     });
  //   </script>

  CartJS.init = function(cart, settings = {}) {
    // Configure settings from any passed settings hash.
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
      jQuery(document).on('cart.requestStarted', function() {
        return jQuery('body').addClass(CartJS.settings.requestBodyClass);
      });
      jQuery(document).on('cart.requestComplete', function() {
        return jQuery('body').removeClass(CartJS.settings.requestBodyClass);
      });
    }
    // Initialise DOM Binding through Rivets module.
    // Performs a no-op if Rivets.js isn't present.
    CartJS.Rivets.init();
    return jQuery(document).trigger('cart.ready', [CartJS.cart]);
  };

  // Configure CartJS with the given settings object.
  CartJS.configure = function(settings = {}) {
    return CartJS.Utils.extend(CartJS.settings, settings);
  };

  // Add a stubbed out console.log method for browsers that don't implement it.
  // Omitting this method can lead to Javascript failures in some browsers.
  // See: http://stackoverflow.com/questions/7742781/why-javascript-only-works-after-opening-developer-tools-in-ie-once
  if (window.console == null) {
    window.console = {};
    window.console.log = function() {};
  }

  // CartJS.Utils
  // Utility methods.
  // ----------------
  FORMAT_MONEY_WARNING = 'A money formatting filter was used, but Shopify.formatMoney is not available. See the note "Dependency when formatting monetary values" on this page: https://cartjs.org/pages/guide#getting-started-setup.';

  CartJS.Utils = {
    // Log an informational message to the console iff debug mode is on and a console is available.
    log: function() {
      return CartJS.Utils.console(console.log, arguments);
    },
    // Log a warning message to the console iff debug mode is on and a console is available.
    warn: function() {
      return CartJS.Utils.console(console.warn, arguments);
    },
    // Log an error message to the console iff debug mode is on and a console is available.
    error: function() {
      return CartJS.Utils.console(console.error, arguments);
    },
    // General wrapper method for outputting to console.
    console: function(method, args) {
      if (CartJS.settings.debug && (typeof console !== "undefined" && console !== null)) {
        args = Array.prototype.slice.call(args);
        args.unshift('[CartJS]:');
        return method.apply(console, args);
      }
    },
    // Returns the given object with each key wrapped with the text specified by
    // the 'type' parameter and square brackets, suitable for passing as a POST
    // variable to Shopify. 'type' defaults to 'properties'.

    // For example, {"size": "xs"} becomes {"properties[size]": "xs"}.

    // If 'override' is provided, the actual values in obj will be ignored and
    // all values will be set to that of the override. This is primarily useful
    // when wanting to reset values by setting them to an empty string. Note
    // null values for override will be ignored.

    // Any keys in the provided 'skip' list will, as you'd expect, be skipped in
    // the wrapping but will still be present in the resulting hash.
    wrapKeys: function(obj, type = 'properties', override, skip = []) {
      var key, mappedKey, value, wrapped;
      wrapped = {};
      for (key in obj) {
        value = obj[key];
        mappedKey = indexOf.call(skip, key) >= 0 ? key : `${type}[${key}]`;
        wrapped[mappedKey] = override != null ? override : value;
      }
      return wrapped;
    },
    // Perform the opposite function to wrapKeys above.

    // For example, {"properties[size]": "xs"} becomes {"size": "xs"}.
    unwrapKeys: function(obj, type = 'properties', override) {
      var key, unwrapped, unwrappedKey, value;
      unwrapped = {};
      for (key in obj) {
        value = obj[key];
        unwrappedKey = key.replace(`${type}[`, "").replace("]", "");
        unwrapped[unwrappedKey] = override != null ? override : value;
      }
      return unwrapped;
    },
    // Extend a source object with the properties of another object.

    // Can be used to shallow copy an object like so:
    //   copy = extend({}, original)
    extend: function(object, properties) {
      var key, val;
      for (key in properties) {
        val = properties[key];
        object[key] = val;
      }
      return object;
    },
    // Clone a source object (deep copy).
    clone: function(object) {
      var key, newInstance;
      if ((object == null) || typeof object !== 'object') {
        return object;
      }
      newInstance = new object.constructor();
      for (key in object) {
        newInstance[key] = clone(object[key]);
      }
      return newInstance;
    },
    // Return a key from an object and delete it.
    delete: function(object, key) {
      var val;
      val = object[key];
      delete object[key];
      return val;
    },
    // Return true if the given value is an array.
    isArray: Array.isArray || function(value) {
      return {}.toString.call(value) === '[object Array]';
    },
    // Ensure that the given value is returned as an array, either with entries intact or as a blank value.
    ensureArray: function(value) {
      if (CartJS.Utils.isArray(value)) {
        return value;
      }
      if (value != null) {
        return [value];
      } else {
        return [];
      }
    },
    // Format a monetary amount using Shopify's formatMoney if available.

    // If it's not available, just return the value.
    formatMoney: function(value, format, formatName, currency = '') {
      var ref, ref1;
      if (!currency) {
        currency = CartJS.settings.currency;
      }
      // If we've specified a currency other than the default one, convert the value and format.
      if ((window.Currency != null) && currency !== CartJS.settings.currency) {
        // Convert value.
        value = Currency.convert(value, CartJS.settings.currency, currency);
        // Fetch the appropriate format.
        if ((((ref = window.Currency) != null ? ref.moneyFormats : void 0) != null) && (currency in window.Currency.moneyFormats)) {
          format = window.Currency.moneyFormats[currency][formatName];
        }
      }
      // Render the formatted amount using the Shopify formatter if available, else just the value.
      if (((ref1 = window.Shopify) != null ? ref1.formatMoney : void 0) != null) {
        return Shopify.formatMoney(value, format);
      } else {
        CartJS.Utils.warn(FORMAT_MONEY_WARNING);
        return value;
      }
    },
    // Return a resized image URL using Shopify's getSizedImageUrl if available.

    // If it's not available, just return the original URL.
    getSizedImageUrl: function(src, size) {
      var ref, ref1;
      if (((ref = window.Shopify) != null ? (ref1 = ref.Image) != null ? ref1.getSizedImageUrl : void 0 : void 0) != null) {
        if (src) {
          return Shopify.Image.getSizedImageUrl(src, size);
        } else {
          return Shopify.Image.getSizedImageUrl('https://cdn.shopify.com/s/images/admin/no-image-.gif', size).replace('-_', '-');
        }
      } else {
        if (src) {
          return src;
        } else {
          return 'https://cdn.shopify.com/s/images/admin/no-image-large.gif';
        }
      }
    }
  };

  // CartJS.Queue
  // Queue management for synchronous AJAX requests.
  // -----------------------------------------------
  queue = [];

  processing = false;

  CartJS.Queue = {
    // Add a new request to the queue. Starts processing the queue if we're not already doing so.
    add: function(url, data, options = {}) {
      var request;
      // Set up request from arguments and options.
      request = {
        url: url,
        data: data,
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
      if (processing) {
        return;
      }
      // Start processing.
      jQuery(document).trigger('cart.requestStarted', [CartJS.cart]);
      return CartJS.Queue.process();
    },
    // Process the next item in the queue, if there is one.
    process: function() {
      var params;
      if (!queue.length) {
        processing = false;
        jQuery(document).trigger('cart.requestComplete', [CartJS.cart]);
        return;
      }
      processing = true;
      params = queue.shift();
      params.complete = CartJS.Queue.process;
      return jQuery.ajax(params);
    }
  };

  // CartJS.Core
  // Core API methods for manipulating carts.
  // ----------------------------------------
  CartJS.Core = {
    // Fetch updated cart object from API endpoint.
    getCart: function(options = {}) {
      options.type = 'GET';
      options.updateCart = true;
      return CartJS.Queue.add('/cart.js', {
        v: new Date().getTime()
      }, options);
    },
    // Add a new line item to the cart.
    addItem: function(id, quantity = 1, properties = {}, options = {}) {
      var data;
      data = CartJS.Utils.wrapKeys(properties, null, null, ['selling_plan']);
      data.id = id;
      data.quantity = quantity;
      CartJS.Queue.add('/cart/add.js', data, options);
      return CartJS.Core.getCart();
    },
    // Add multiple new line items to the cart.
    addItems: function(items, options = {}) {
      var data;
      data = {
        items: items
      };
      CartJS.Queue.add('/cart/add.js', data, options);
      return CartJS.Core.getCart();
    },
    // Update an existing line item.
    updateItem: function(line, quantity, properties = {}, options = {}) {
      var data;
      data = CartJS.Utils.wrapKeys(properties, null, null, ['selling_plan']);
      data.line = line;
      if (quantity != null) {
        data.quantity = quantity;
      }
      options.updateCart = true;
      return CartJS.Queue.add('/cart/change.js', data, options);
    },
    // Remove an existing line item.
    removeItem: function(line, options = {}) {
      return CartJS.Core.updateItem(line, 0, {}, options);
    },
    // Update item by ID
    updateItemById: function(id, quantity, properties = {}, options = {}) {
      var data;
      data = CartJS.Utils.wrapKeys(properties, null, null, ['selling_plan']);
      data.id = id;
      if (quantity != null) {
        data.quantity = quantity;
      }
      options.updateCart = true;
      return CartJS.Queue.add('/cart/change.js', data, options);
    },
    // Set the quantities of a number of items in the cart with an ID/Quantity "updates" mapping.
    updateItemQuantitiesById: function(updates = {}, options = {}) {
      options.updateCart = true;
      return CartJS.Queue.add('/cart/update.js', {
        updates: updates
      }, options);
    },
    // Remove all line items for the given variant ID.
    removeItemById: function(id, options = {}) {
      var data;
      data = {
        id: id,
        quantity: 0
      };
      options.updateCart = true;
      return CartJS.Queue.add('/cart/change.js', data, options);
    },
    // Clear all items from the cart.
    clear: function(options = {}) {
      options.updateCart = true;
      return CartJS.Queue.add('/cart/clear.js', {}, options);
    },
    // Get a cart attribute.
    getAttribute: function(attributeName, defaultValue) {
      if (attributeName in CartJS.cart.attributes) {
        return CartJS.cart.attributes[attributeName];
      } else {
        return defaultValue;
      }
    },
    // Set a cart attribute.
    setAttribute: function(attributeName, value, options = {}) {
      var attributes;
      attributes = {};
      attributes[attributeName] = value;
      return CartJS.Core.setAttributes(attributes, options);
    },
    // Get all cart attributes as a hash.
    getAttributes: function() {
      return CartJS.cart.attributes;
    },
    // Set multiple cart attributes using a hash.
    setAttributes: function(attributes = {}, options = {}) {
      options.updateCart = true;
      return CartJS.Queue.add('/cart/update.js', CartJS.Utils.wrapKeys(attributes, 'attributes'), options);
    },
    // Clear all attributes.
    clearAttributes: function(options = {}) {
      options.updateCart = true;
      return CartJS.Queue.add('/cart/update.js', CartJS.Utils.wrapKeys(CartJS.Core.getAttributes(), 'attributes', ''), options);
    },
    // Get the cart note.
    getNote: function() {
      return CartJS.cart.note;
    },
    // Set the cart note.
    setNote: function(note, options = {}) {
      options.updateCart = true;
      return CartJS.Queue.add('/cart/update.js', {
        note: note
      }, options);
    }
  };

  // CartJS.Data
  // Data API for CartJS.
  // --------------------

  // Reference to the document element.
  $document = null;

  CartJS.Data = {
    // Initialise the Data API.
    init: function() {
      $document = jQuery(document);
      CartJS.Data.setEventListeners('on');
      return CartJS.Data.render(null, CartJS.cart);
    },
    // Tear down the Data API.
    destroy: function() {
      return CartJS.Data.setEventListeners('off');
    },
    // Bind or unbind listeners for Data API events.
    setEventListeners: function(method) {
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
    add: function(e) {
      var $this, properties;
      e.preventDefault();
      $this = jQuery(this);
      properties = {};
      properties.selling_plan = $this.attr('data-cart-selling-plan');
      return CartJS.Core.addItem($this.attr('data-cart-add'), $this.attr('data-cart-quantity'), properties);
    },
    // Handler for [data-cart-remove] click events.
    remove: function(e) {
      var $this;
      e.preventDefault();
      $this = jQuery(this);
      return CartJS.Core.removeItem($this.attr('data-cart-remove'));
    },
    // Handler for [data-cart-remove-id] click events.
    removeById: function(e) {
      var $this;
      e.preventDefault();
      $this = jQuery(this);
      return CartJS.Core.removeItemById($this.attr('data-cart-remove-id'));
    },
    // Handler for [data-cart-update] click events.
    update: function(e) {
      var $this, properties;
      e.preventDefault();
      $this = jQuery(this);
      properties = {};
      properties.selling_plan = $this.attr('data-cart-selling-plan');
      return CartJS.Core.updateItem($this.attr('data-cart-update'), $this.attr('data-cart-quantity'), properties);
    },
    // Handler for [data-cart-update-id] click events.
    updateById: function(e) {
      var $this, properties;
      e.preventDefault();
      $this = jQuery(this);
      properties = {};
      properties.selling_plan = $this.attr('data-cart-selling-plan');
      return CartJS.Core.updateItemById($this.attr('data-cart-update-id'), $this.attr('data-cart-quantity'), properties);
    },
    // Handler for [data-cart-clear] click events.
    clear: function(e) {
      e.preventDefault();
      return CartJS.Core.clear();
    },
    // Handler for [data-cart-toggle] change events.
    toggle: function(e) {
      var $input, id;
      $input = jQuery(this);
      id = $input.attr('data-cart-toggle');
      if ($input.is(':checked')) {
        return CartJS.Core.addItem(id);
      } else {
        return CartJS.Core.removeItemById(id);
      }
    },
    // Handler for [data-cart-toggle-attribute] change events.
    toggleAttribute: function(e) {
      var $input, attribute;
      $input = jQuery(this);
      attribute = $input.attr('data-cart-toggle-attribute');
      return CartJS.Core.setAttribute(attribute, $input.is(':checked') ? 'Yes' : '');
    },
    // Handle for [data-cart-submit] submit events.
    submit: function(e) {
      var dataArray, id, properties, quantity;
      e.preventDefault();
      dataArray = jQuery(this).serializeArray();
      id = void 0;
      quantity = void 0;
      properties = {};
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
    render: function(e, cart) {
      var context;
      // Build a hash of render context.
      context = {
        'item_count': cart.item_count,
        'total_price': cart.total_price,
        'total_price_money': CartJS.Utils.formatMoney(cart.total_price, CartJS.settings.moneyFormat, 'money_format', (typeof Currency !== "undefined" && Currency !== null ? Currency.currentCurrency : void 0) != null ? Currency.currentCurrency : void 0),
        'total_price_money_with_currency': CartJS.Utils.formatMoney(cart.total_price, CartJS.settings.moneyWithCurrencyFormat, 'money_with_currency_format', (typeof Currency !== "undefined" && Currency !== null ? Currency.currentCurrency : void 0) != null ? Currency.currentCurrency : void 0)
      };
      // Render the context to elements as needed.
      return jQuery('[data-cart-render]').each(function() {
        var $this;
        $this = jQuery(this);
        return $this.html(context[$this.attr('data-cart-render')]);
      });
    }
  };

  // CartJS.Rivets
  // Adds Rivets.js functionality to CartJS if Rivets.js is available.
  // -----------------------------------------------------------------
  if (typeof rivets !== "undefined" && rivets !== null) {
    // Rivets.js has been loaded, so declare the CartJS.Rivets module.
    CartJS.Rivets = {
      // Maintain a reference to the base model object so that we can reference it later.
      model: null,
      // Maintain a list of all bound Rivets.js views so that we can unbind later if needed.
      boundViews: [],
      // Initialise the Rivets module.
      init: function() {
        return CartJS.Rivets.bindViews();
      },
      // Tear down the Rivets module.
      destroy: function() {
        return CartJS.Rivets.unbindViews();
      },
      // Bind all Rivets.js view elements that are currently present on the page.
      bindViews: function() {
        CartJS.Utils.log('Rivets.js is present, binding views.');
        // Unbind any currently bound views.
        CartJS.Rivets.unbindViews();
        // Merge a new models object with any specified in the settings.
        CartJS.Rivets.model = CartJS.Utils.extend({
          cart: CartJS.cart
        }, CartJS.settings.rivetsModels);
        // If Shopify's Currency global object is available, add it to the data model.
        // Done so that we can observer Currency.currentCurrency for changes.
        if (window.Currency != null) {
          CartJS.Rivets.model.Currency = window.Currency;
        }
        // Iterate through and bind all elements marked as Rivets.js views via the [data-cart-view] attribute.
        return jQuery('[data-cart-view]').each(function() {
          var view;
          view = rivets.bind(jQuery(this), CartJS.Rivets.model);
          return CartJS.Rivets.boundViews.push(view);
        });
      },
      // Unbind all currently bound Rivets.js views.
      unbindViews: function() {
        var j, len, ref, view;
        ref = CartJS.Rivets.boundViews;
        for (j = 0, len = ref.length; j < len; j++) {
          view = ref[j];
          view.unbind();
        }
        return CartJS.Rivets.boundViews = [];
      }
    };
    // Add useful general-purpose formatters for Rivets.js
    rivets.formatters.eq = function(a, b) {
      return a === b;
    };
    rivets.formatters.includes = function(a, b) {
      return a.indexOf(b) >= 0;
    };
    rivets.formatters.match = function(a, regexp, flags) {
      return a.match(new RegExp(regexp, flags));
    };
    rivets.formatters.lt = function(a, b) {
      return a < b;
    };
    rivets.formatters.gt = function(a, b) {
      return a > b;
    };
    rivets.formatters.not = function(a) {
      return !a;
    };
    rivets.formatters.empty = function(a) {
      return !a.length;
    };
    rivets.formatters.plus = function(a, b) {
      return parseInt(a) + parseInt(b);
    };
    rivets.formatters.minus = function(a, b) {
      return parseInt(a) - parseInt(b);
    };
    rivets.formatters.times = function(a, b) {
      return a * b;
    };
    rivets.formatters.divided_by = function(a, b) {
      return a / b;
    };
    rivets.formatters.modulo = function(a, b) {
      return a % b;
    };
    rivets.formatters.prepend = function(a, b) {
      return b + a;
    };
    rivets.formatters.append = function(a, b) {
      return a + b;
    };
    rivets.formatters.slice = function(value, start, end) {
      return value.slice(start, end);
    };
    rivets.formatters.pluralize = function(input, singular, plural = singular + 's') {
      if (CartJS.Utils.isArray(input)) {
        input = input.length;
      }
      if (input === 1) {
        return singular;
      } else {
        return plural;
      }
    };
    rivets.formatters.array_element = function(array, index) {
      return array[index];
    };
    rivets.formatters.array_first = function(array) {
      return array[0];
    };
    rivets.formatters.array_last = function(array) {
      return array[array.length - 1];
    };
    // Add Shopify-specific formatters for Rivets.js.
    rivets.formatters.money = function(value, currency) {
      return CartJS.Utils.formatMoney(value, CartJS.settings.moneyFormat, 'money_format', currency);
    };
    rivets.formatters.money_with_currency = function(value, currency) {
      return CartJS.Utils.formatMoney(value, CartJS.settings.moneyWithCurrencyFormat, 'money_with_currency_format', currency);
    };
    rivets.formatters.weight = function(grams) {
      switch (CartJS.settings.weightUnit) {
        case 'kg':
          return (grams / 1000).toFixed(CartJS.settings.weightPrecision);
        case 'oz':
          return (grams * 0.035274).toFixed(CartJS.settings.weightPrecision);
        case 'lb':
          return (grams * 0.00220462).toFixed(CartJS.settings.weightPrecision);
        default:
          return grams.toFixed(CartJS.settings.weightPrecision);
      }
    };
    rivets.formatters.weight_with_unit = function(grams) {
      return rivets.formatters.weight(grams) + CartJS.settings.weightUnit;
    };
    rivets.formatters.product_image_size = function(src, size) {
      return CartJS.Utils.getSizedImageUrl(src, size);
    };
    // Add camelCase aliases for underscore formatters.
    rivets.formatters.moneyWithCurrency = rivets.formatters.money_with_currency;
    rivets.formatters.weightWithUnit = rivets.formatters.weight_with_unit;
    rivets.formatters.productImageSize = rivets.formatters.product_image_size;
  } else {
    // Rivets.js has not been loaded, so just declare a no-operation CartJS.Rivets module.
    CartJS.Rivets = {
      init: function() {},
      destroy: function() {}
    };
  }

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
  } else if (typeof define === 'function' && define.amd) {
    define(['exports'], function(exports) {
      CartJS.factory(this.CartJS = exports);
      return exports;
    });
  } else {
    CartJS.factory(this.CartJS = {});
  }

}).call(this);
