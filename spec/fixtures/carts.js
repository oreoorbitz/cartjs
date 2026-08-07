window.Fixtures = (function(Fixtures, $) {

  var _carts = {};

  // Empty cart fixture.
  _carts.empty = {
    "token": null,
    "note": null,
    "attributes": {},
    "total_price": 0,
    "total_discount": 0,
    "total_weight": 0,
    "item_count": 0,
    "items": [],
    "requires_shipping": false
  };

  // Cart with 2 items fixture for tinybind-dropin view test.
  _carts['with-items'] = {
    "token": "test-token",
    "note": null,
    "attributes": {},
    "total_price": 1998,
    "total_discount": 0,
    "total_weight": 200,
    "item_count": 2,
    "items": [
      { "id": 1, "key": "1:abc", "title": "Test Product 1", "quantity": 1, "price": 999, "line_price": 999, "properties": {} },
      { "id": 2, "key": "2:def", "title": "Test Product 2", "quantity": 1, "price": 999, "line_price": 999, "properties": {} }
    ],
    "requires_shipping": true
  };

  Fixtures.getCart = function(name) {
    return $.extend(true, {}, _carts[name]);
  };

  return Fixtures;

})(window.Fixtures || {}, jQuery);
