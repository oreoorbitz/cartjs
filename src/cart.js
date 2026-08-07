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
