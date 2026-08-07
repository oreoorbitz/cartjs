describe('CartJS browser smoke (real browser)', () => {
  beforeEach(() => {
    CartJS.init(Fixtures.getCart('empty'), {
      currency: 'USD',
      moneyFormat: '${{amount}}',
      moneyWithCurrencyFormat: '${{amount}} USD'
    });
  });

  it('CartJS loads and init sets empty cart', () => {
    (typeof CartJS).should.equal('object');
    (typeof CartJS.init).should.equal('function');
    CartJS.cart.item_count.should.equal(0);
  });

  it('money formatter works in browser', () => {
    rivets.formatters.money(999, 'USD').should.equal('$9.99');
    tinybind.formatters.money(999, 'USD').should.equal('$9.99');
  });

  it('binds data-cart-view and updates on cart change', async () => {
    const el = document.createElement('div');
    el.setAttribute('data-cart-view', '');
    el.innerHTML = '{cart.item_count}';
    document.body.appendChild(el);

    CartJS.Rivets.bindViews();
    (CartJS.Rivets.boundViews.length > 0).should.equal(true);

    CartJS.cart.update(Fixtures.getCart('with-items'));
    // Tinybind updates bindings on next tick — wait a frame
    await new Promise(r => setTimeout(r, 20));
    CartJS.Rivets.model.cart.item_count.should.equal(2);

    CartJS.Rivets.unbindViews();
    document.body.removeChild(el);
  });

  it('window globals are strict === for drop-in', () => {
    (window.jQuery === window.$).should.equal(true);
    (window.$ === window.mepto).should.equal(true);
    (window.rivets === window.tinybind).should.equal(true);
  });
});
