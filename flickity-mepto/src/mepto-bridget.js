// mepto-bridget.js — minimal jQuery Bridget for Mepto
// Upstream jquery-bridget v2.0.1 is 1.2K UMD, requires jQuery.
// This shim implements $.bridget(name, Klass) using Mepto's $.fn.
// Keeps Flickity API: $(elem).flickity(opts), $(elem).flickity('select', i), etc.
// If window.mepto || window.jQuery already has .bridget, this is no-op.
(function (global) {
  'use strict';
  var $ = global.mepto || global.jQuery || global.$;
  if (!$ || $.bridget) return;
  // $.bridget shim — mirrors jquery-bridget but without jQuery.Deferred
  $.bridget = function (namespace, PluginClass) {
    // add to $.fn
    $.fn[namespace] = function (option) {
      if (typeof option === 'string') {
        var args = Array.prototype.slice.call(arguments, 1);
        for (var i = 0; i < this.length; i++) {
          var elem = this[i];
          var instance = PluginClass.data(elem);
          if (!instance) {
            // eslint-disable-next-line no-console
            if (global.console) global.console.error(namespace + ' not initialized. Cannot call method ' + option);
            continue;
          }
          var method = instance[option];
          if (!method || option.charAt(0) === '_') {
            if (global.console) global.console.error(namespace + ' has no method ' + option);
            continue;
          }
          var ret = method.apply(instance, args);
          if (ret !== undefined && ret !== instance) return ret;
        }
        return this;
      }
      // init
      return this.each(function () {
        var instance = PluginClass.data(this);
        if (instance) instance.option(option || {});
        else new PluginClass(this, option);
      });
    };
  };
})(typeof window !== 'undefined' ? window : this);
