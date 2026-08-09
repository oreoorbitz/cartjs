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
  // Uses window.Shopify.routes.root for locale-aware URLs (e.g. "/de/cart.js").
  getCart(options) {
    if (options == null) { options = {}; }
    options.type = 'GET';
    options.updateCart = true;
    return CartJS.Queue.add(CartJS.Utils.getUrl('cart.js'), {v: new Date().getTime()}, options);
  },

  // Add a new line item to the cart.
  addItem(id, quantity, properties, options) {
    if (quantity == null) { quantity = 1; }
    if (properties == null) { properties = {}; }
    if (options == null) { options = {}; }
    const data = CartJS.Utils.wrapKeys(properties, null, null, ['selling_plan']);
    data.id = id;
    data.quantity = quantity;
    CartJS.Queue.add(CartJS.Utils.getUrl('cart/add.js'), data, options);
    return CartJS.Core.getCart();
  },

  // Add multiple new line items to the cart.
  addItems(items, options) {
    if (options == null) { options = {}; }
    const data =
      {items};
    CartJS.Queue.add(CartJS.Utils.getUrl('cart/add.js'), data, options);
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
    return CartJS.Queue.add(CartJS.Utils.getUrl('cart/change.js'), data, options);
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
    return CartJS.Queue.add(CartJS.Utils.getUrl('cart/change.js'), data, options);
  },

  // Set the quantities of a number of items in the cart with an ID/Quantity "updates" mapping.
  updateItemQuantitiesById(updates, options) {
    if (updates == null) { updates = {}; }
    if (options == null) { options = {}; }
    options.updateCart = true;
    return CartJS.Queue.add(CartJS.Utils.getUrl('cart/update.js'), {updates}, options);
  },

  // Remove all line items for the given variant ID.
  removeItemById(id, options) {
    if (options == null) { options = {}; }
    const data = {
      id,
      quantity: 0
    };
    options.updateCart = true;
    return CartJS.Queue.add(CartJS.Utils.getUrl('cart/change.js'), data, options);
  },

  // Clear all items from the cart.
  clear(options) {
    if (options == null) { options = {}; }
    options.updateCart = true;
    return CartJS.Queue.add(CartJS.Utils.getUrl('cart/clear.js'), {}, options);
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
    return CartJS.Queue.add(CartJS.Utils.getUrl('cart/update.js'), CartJS.Utils.wrapKeys(attributes, 'attributes'), options);
  },

  // Clear all attributes.
  clearAttributes(options) {
    if (options == null) { options = {}; }
    options.updateCart = true;
    return CartJS.Queue.add(CartJS.Utils.getUrl('cart/update.js'), CartJS.Utils.wrapKeys(CartJS.Core.getAttributes(), 'attributes', ''), options);
  },

  // Get the cart note.
  getNote() {
    return CartJS.cart.note;
  },

  // Set the cart note.
  setNote(note, options) {
    if (options == null) { options = {}; }
    options.updateCart = true;
    return CartJS.Queue.add(CartJS.Utils.getUrl('cart/update.js'), { note }, options);
  }
};
