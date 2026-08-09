/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
// CartJS.Data
// Data API for CartJS.
// Uses mepto (preferred) with graceful fallback to jQuery via mepto-adapter
// --------------------

// Reference to the document element.
let $document = null;

CartJS.Data = {

  // Initialise the Data API.
  init() {
    $document = mepto(document);
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
    const $this = mepto(this);
    const properties = {};
    properties.selling_plan = $this.attr('data-cart-selling-plan');
    return CartJS.Core.addItem($this.attr('data-cart-add'), $this.attr('data-cart-quantity'), properties);
  },

  // Handler for [data-cart-remove] click events.
  remove(e) {
    e.preventDefault();
    const $this = mepto(this);
    return CartJS.Core.removeItem($this.attr('data-cart-remove'));
  },

  // Handler for [data-cart-remove-id] click events.
  removeById(e) {
    e.preventDefault();
    const $this = mepto(this);
    return CartJS.Core.removeItemById($this.attr('data-cart-remove-id'));
  },

  // Handler for [data-cart-update] click events.
  update(e) {
    e.preventDefault();
    const $this = mepto(this);
    const properties = {};
    properties.selling_plan = $this.attr('data-cart-selling-plan');
    return CartJS.Core.updateItem($this.attr('data-cart-update'), $this.attr('data-cart-quantity'), properties);
  },

  // Handler for [data-cart-update-id] click events.
  updateById(e) {
    e.preventDefault();
    const $this = mepto(this);
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
    const $input = mepto(this);
    const id = $input.attr('data-cart-toggle');
    if ($input.is(':checked')) {
      return CartJS.Core.addItem(id);
    } else {
      return CartJS.Core.removeItemById(id);
    }
  },

  // Handler for [data-cart-toggle-attribute] change events.
  toggleAttribute(e) {
    const $input = mepto(this);
    const attribute = $input.attr('data-cart-toggle-attribute');
    return CartJS.Core.setAttribute(attribute, $input.is(':checked') ? 'Yes' : '');
  },

  // Handle for [data-cart-submit] submit events.
  submit(e) {
    e.preventDefault();

    const dataArray = mepto(this).serializeArray();

    let id = undefined;
    let quantity = undefined;
    const properties = {};
    mepto.each(dataArray, function(i, item) {
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
    return mepto('[data-cart-render]').each(function(){
      const $this = mepto(this);
      return $this.html(context[$this.attr('data-cart-render')]);});
  }
};
