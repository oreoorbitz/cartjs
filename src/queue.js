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
    mepto(document).trigger('cart.requestStarted', [CartJS.cart]);
    return CartJS.Queue.process();
  },

  // Process the next item in the queue, if there is one.
  process() {
    if (!queue.length) {
      processing = false;
      mepto(document).trigger('cart.requestComplete', [CartJS.cart]);
      return;
    }

    processing = true;
    const params = queue.shift();
    params.complete = CartJS.Queue.process;
    return mepto.ajax(params);
  }
};
