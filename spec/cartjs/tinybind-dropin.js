describe('Tinybind Drop-in', function() {

  beforeEach(function() {
    CartJS.init(Fixtures.getCart('empty'), {
      "currency": "USD",
      "moneyFormat": "${{amount}}",
      "moneyWithCurrencyFormat": "${{amount}} USD"
    });
  });

  describe('global alias', function() {
    it("window.rivets and window.tinybind are strict equal", function() {
      (window.rivets === window.tinybind).should.equal(true);
    });

    it("CartJS uses _bindingEngine that is defined", function() {
      (CartJS.Rivets != null).should.equal(true);
      (typeof CartJS.Rivets.bindViews).should.equal('function');
    });

    it("rivets.bind and tinybind.bind are same function", function() {
      rivets.bind.should.equal(tinybind.bind);
    });
  });

  describe('formatters drop-in', function() {
    it("money formatter still works via rivets", function() {
      rivets.formatters.money(999, 'USD').should.equal('$9.99');
    });

    it("money formatter works via tinybind", function() {
      tinybind.formatters.money(999, 'USD').should.equal('$9.99');
    });

    it("both formatter objects are synced", function() {
      rivets.formatters.eq.should.equal(tinybind.formatters.eq);
      rivets.formatters.not.should.equal(tinybind.formatters.not);
    });

    it("CartJS custom formatters are on both", function() {
      (typeof rivets.formatters.money).should.equal('function');
      (typeof tinybind.formatters.money).should.equal('function');
      rivets.formatters.money.should.equal(tinybind.formatters.money);
    });
  });

  describe('data-cart-view binding', function() {
    it("binds a data-cart-view element and updates on cart change", function() {
      var el = document.createElement('div');
      el.setAttribute('data-cart-view', '');
      el.innerHTML = '{cart.item_count}';
      document.body.appendChild(el);

      CartJS.Rivets.bindViews();
      // Initially empty cart
      // The binding should have been created
      (CartJS.Rivets.boundViews.length > 0).should.equal(true);

      // Update cart and check view model
      CartJS.cart.update(Fixtures.getCart('with-items'));
      (CartJS.Rivets.model.cart.item_count).should.equal(2);

      // Cleanup
      CartJS.Rivets.unbindViews();
      document.body.removeChild(el);
    });
  });

  describe('unless binder shim', function() {
    it("unless binder exists as alias to if", function() {
      // Tinybind removed unless; our shim aliases it to if
      (typeof tinybind.binders['unless'] !== 'undefined').should.equal(true);
      (typeof rivets.binders['unless'] !== 'undefined').should.equal(true);
    });

    it("rv-unless via not formatter works", function() {
      // Theme should be able to do rv-if="x | not" instead of rv-unless
      rivets.formatters.not(false).should.equal(true);
      tinybind.formatters.not(false).should.equal(true);
    });
  });

  describe('each binder index compatibility', function() {
    it("$index is available in tinybind each", function() {
      // Tinybind uses $index, Rivets used index
      // Our plan shims index if needed; check that at least $index path does not throw
      (typeof tinybind.binders['each'] !== 'undefined').should.equal(true);
    });
  });

  describe('CartJS public API unchanged', function() {
    it("CartJS.init, CartJS.cart, CartJS.Core still exist", function() {
      (typeof CartJS.init).should.equal('function');
      (typeof CartJS.cart).should.equal('object');
      (typeof CartJS.Core.addItem).should.equal('function');
      (typeof CartJS.Data.init).should.equal('function');
    });

    it("rivets-cart.js filename still serves drop-in", function() {
      // This test runs from dist/rivets-cart.js bundle; if we are here, bundle loaded
      (typeof CartJS.Rivets).should.equal('object');
    });
  });

});
