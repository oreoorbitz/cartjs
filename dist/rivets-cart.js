// Cart.js
// version: 1.1.0
// author: Gavin Ballard
// license: MIT
(function (global, factory) {
  typeof exports === 'object' && typeof module !== 'undefined' ? module.exports = factory() :
  typeof define === 'function' && define.amd ? define(factory) :
  (global = global || self, global.tinybind = factory());
}(this, function () { 'use strict';

  var OPTIONS = ['prefix', 'templateDelimiters', 'rootInterface', 'preloadData', 'handler'];
  var EXTENSIONS = ['binders', 'formatters', 'adapters'];

  var PRIMITIVE = 0;
  var KEYPATH = 1;
  var TEXT = 0;
  var BINDING = 1;
  var QUOTED_STR = /^'.*'$|^".*"$/; // Parser and tokenizer for getting the type and value from a string.

  function parseType(string) {
    var type = PRIMITIVE;
    var value = string;

    if (QUOTED_STR.test(string)) {
      value = string.slice(1, -1);
    } else if (string === 'true') {
      value = true;
    } else if (string === 'false') {
      value = false;
    } else if (string === 'null') {
      value = null;
    } else if (string === 'undefined') {
      value = undefined;
    } else if (!isNaN(string)) {
      value = Number(string);
    } else {
      type = KEYPATH;
    }

    return {
      type: type,
      value: value
    };
  } // Template parser and tokenizer for mustache-style text content bindings.
  // Parses the template and returns a set of tokens, separating static portions
  // of text from binding declarations.

  function parseTemplate(template, delimiters) {
    var tokens;
    var length = template.length;
    var index = 0;
    var lastIndex = 0;
    var open = delimiters[0],
        close = delimiters[1];

    while (lastIndex < length) {
      index = template.indexOf(open, lastIndex);

      if (index < 0) {
        if (tokens) {
          tokens.push({
            type: TEXT,
            value: template.slice(lastIndex)
          });
        }

        break;
      } else {
        tokens || (tokens = []);

        if (index > 0 && lastIndex < index) {
          tokens.push({
            type: TEXT,
            value: template.slice(lastIndex, index)
          });
        }

        lastIndex = index + open.length;
        index = template.indexOf(close, lastIndex);

        if (index < 0) {
          var substring = template.slice(lastIndex - close.length);
          var lastToken = tokens[tokens.length - 1];

          if (lastToken && lastToken.type === TEXT) {
            lastToken.value += substring;
          } else {
            tokens.push({
              type: TEXT,
              value: substring
            });
          }

          break;
        }

        var value = template.slice(lastIndex, index).trim();
        tokens.push({
          type: BINDING,
          value: value
        });
        lastIndex = index + close.length;
      }
    }

    return tokens;
  }

  var tinybind = {
    // Global binders.
    binders: {},
    // Global formatters.
    formatters: {},
    // Global sightglass adapters.
    adapters: {},
    // Default attribute prefix.
    _prefix: 'rv',
    _fullPrefix: 'rv-',

    get prefix() {
      return this._prefix;
    },

    set prefix(value) {
      this._prefix = value;
      this._fullPrefix = value + '-';
    },

    parseTemplate: parseTemplate,
    parseType: parseType,
    // Default template delimiters.
    templateDelimiters: ['{', '}'],
    // Default sightglass root interface.
    rootInterface: '.',
    // Preload data by default.
    preloadData: true,
    // Default event handler.
    handler: function handler(context, ev, binding) {
      this.call(context, ev, binding.view.models);
    },
    // Sets the attribute on the element. If no binder above is matched it will fall
    // back to using this binder.
    fallbackBinder: function fallbackBinder(el, value) {
      if (value != null) {
        el.setAttribute(this.type, value);
      } else {
        el.removeAttribute(this.type);
      }
    },
    // Merges an object literal into the corresponding global options.
    configure: function configure(options) {
      var _this = this;

      if (!options) {
        return;
      }

      Object.keys(options).forEach(function (option) {
        var value = options[option];

        if (EXTENSIONS.indexOf(option) > -1) {
          Object.keys(value).forEach(function (key) {
            _this[option][key] = value[key];
          });
        } else {
          _this[option] = value;
        }
      });
    }
  };

  // Check if a value is an object than can be observed.
  function isObject(obj) {
    return typeof obj === 'object' && obj !== null;
  } // Error thrower.


  function error(message) {
    throw new Error("[Observer] " + message);
  }

  var adapters;
  var interfaces;
  var rootInterface; // Constructs a new keypath observer and kicks things off.

  var Observer =
  /*#__PURE__*/
  function () {
    Observer.updateOptions = function updateOptions(options) {
      adapters = options.adapters;
      interfaces = Object.keys(adapters);
      rootInterface = options.rootInterface;
    } // Tokenizes the provided keypath string into interface + path tokens for the
    // observer to work with.
    ;

    Observer.tokenize = function tokenize(keypath, root) {
      var tokens = [];
      var current = {
        i: root,
        path: ''
      };
      var index;
      var chr;

      for (index = 0; index < keypath.length; index++) {
        chr = keypath.charAt(index);

        if (!!~interfaces.indexOf(chr)) {
          tokens.push(current);
          current = {
            i: chr,
            path: ''
          };
        } else {
          current.path += chr;
        }
      }

      tokens.push(current);
      return tokens;
    };

    function Observer(obj, keypath, callback) {
      this.keypath = keypath;
      this.callback = callback;
      this.objectPath = [];
      this.parse();
      this.obj = this.getRootObject(obj);

      if (isObject(this.target = this.realize())) {
        this.set(true, this.key, this.target, this.callback);
      }
    } // Parses the keypath using the interfaces defined on the view. Sets variables
    // for the tokenized keypath as well as the end key.


    var _proto = Observer.prototype;

    _proto.parse = function parse() {
      var path;
      var root;

      if (!interfaces.length) {
        error('Must define at least one adapter interface.');
      }

      if (!!~interfaces.indexOf(this.keypath[0])) {
        root = this.keypath[0];
        path = this.keypath.substr(1);
      } else {
        root = rootInterface;
        path = this.keypath;
      }

      this.tokens = Observer.tokenize(path, root);
      this.key = this.tokens.pop();
    } // Realizes the full keypath, attaching observers for every key and correcting
    // old observers to any changed objects in the keypath.
    ;

    _proto.realize = function realize() {
      var current = this.obj;
      var unreached = -1;
      var prev;
      var token;

      for (var index = 0; index < this.tokens.length; index++) {
        token = this.tokens[index];

        if (isObject(current)) {
          if (typeof this.objectPath[index] !== 'undefined') {
            if (current !== (prev = this.objectPath[index])) {
              this.set(false, token, prev, this);
              this.set(true, token, current, this);
              this.objectPath[index] = current;
            }
          } else {
            this.set(true, token, current, this);
            this.objectPath[index] = current;
          }

          current = this.get(token, current);
        } else {
          if (unreached === -1) {
            unreached = index;
          }

          if (prev = this.objectPath[index]) {
            this.set(false, token, prev, this);
          }
        }
      }

      if (unreached !== -1) {
        this.objectPath.splice(unreached);
      }

      return current;
    } // Updates the keypath. This is called when any intermediary key is changed.
    ;

    _proto.sync = function sync() {
      var next;
      var oldValue;
      var newValue;

      if ((next = this.realize()) !== this.target) {
        if (isObject(this.target)) {
          this.set(false, this.key, this.target, this.callback);
        }

        if (isObject(next)) {
          this.set(true, this.key, next, this.callback);
        }

        oldValue = this.value();
        this.target = next;
        newValue = this.value();
        if (newValue !== oldValue || newValue instanceof Function) this.callback.sync();
      } else if (next instanceof Array) {
        this.callback.sync();
      }
    } // Reads the current end value of the observed keypath. Returns undefined if
    // the full keypath is unreachable.
    ;

    _proto.value = function value() {
      if (isObject(this.target)) {
        return this.get(this.key, this.target);
      }
    } // Sets the current end value of the observed keypath. Calling setValue when
    // the full keypath is unreachable is a no-op.
    ;

    _proto.setValue = function setValue(value) {
      if (isObject(this.target)) {
        adapters[this.key.i].set(this.target, this.key.path, value);
      }
    } // Gets the provided key on an object.
    ;

    _proto.get = function get(key, obj) {
      return adapters[key.i].get(obj, key.path);
    } // Observes or unobserves a callback on the object using the provided key.
    ;

    _proto.set = function set(active, key, obj, callback) {
      var action = active ? 'observe' : 'unobserve';
      adapters[key.i][action](obj, key.path, callback);
    } // Unobserves the entire keypath.
    ;

    _proto.unobserve = function unobserve() {
      var obj;
      var token;

      for (var index = 0; index < this.tokens.length; index++) {
        token = this.tokens[index];

        if (obj = this.objectPath[index]) {
          this.set(false, token, obj, this);
        }
      }

      if (isObject(this.target)) {
        this.set(false, this.key, this.target, this.callback);
      }
    } // traverse the scope chain to find the scope which has the root property
    // if the property is not found in chain, returns the root scope
    ;

    _proto.getRootObject = function getRootObject(obj) {
      var rootProp;
      var current;

      if (!obj.$parent) {
        return obj;
      }

      if (this.tokens.length) {
        rootProp = this.tokens[0].path;
      } else {
        rootProp = this.key.path;
      }

      current = obj;

      while (current.$parent && current[rootProp] === undefined) {
        current = current.$parent;
      }

      return current;
    };

    return Observer;
  }();

  function getInputValue(el) {
    if (el.type === 'checkbox') {
      return el.checked;
    } else if (el.type === 'select-multiple') {
      var results = [];
      var option;

      for (var i = 0; i < el.options.length; i++) {
        option = el.options[i];

        if (option.selected) {
          results.push(option.value);
        }
      }

      return results;
    } else {
      return el.value;
    }
  }

  var FORMATTER_ARGS = /[^\s']+|'([^']|'[^\s])*'|"([^"]|"[^\s])*"/g;
  var FORMATTER_SPLIT = /\s+/; // A single binding between a model attribute and a DOM element.

  var Binding =
  /*#__PURE__*/
  function () {
    // All information about the binding is passed into the constructor; the
    // containing view, the DOM node, the type of binding, the model object and the
    // keypath at which to listen for changes.
    function Binding(view, el, type, keypath, binder, arg, formatters) {
      this.view = view;
      this.el = el;
      this.type = type;
      this.keypath = keypath;
      this.binder = binder;
      this.arg = arg;
      this.formatters = formatters;
      this.formatterObservers = {};
      this.model = undefined;
    } // Observes the object keypath


    var _proto = Binding.prototype;

    _proto.observe = function observe(obj, keypath) {
      return new Observer(obj, keypath, this);
    };

    _proto.parseTarget = function parseTarget() {
      if (this.keypath) {
        var token = parseType(this.keypath);

        if (token.type === 0) {
          this.value = token.value;
        } else {
          this.observer = this.observe(this.view.models, this.keypath);
          this.model = this.observer.target;
        }
      } else {
        this.value = undefined;
      }
    };

    _proto.parseFormatterArguments = function parseFormatterArguments(args, formatterIndex) {
      var _this = this;

      return args.map(parseType).map(function (_ref, ai) {
        var type = _ref.type,
            value = _ref.value;

        if (type === 0) {
          return value;
        } else {
          if (!_this.formatterObservers[formatterIndex]) {
            _this.formatterObservers[formatterIndex] = {};
          }

          var observer = _this.formatterObservers[formatterIndex][ai];

          if (!observer) {
            observer = _this.observe(_this.view.models, value);
            _this.formatterObservers[formatterIndex][ai] = observer;
          }

          return observer.value();
        }
      });
    } // Applies all the current formatters to the supplied value and returns the
    // formatted value.
    ;

    _proto.formattedValue = function formattedValue(value) {
      var _this2 = this;

      return this.formatters.reduce(function (result, declaration, index) {
        var args = declaration.match(FORMATTER_ARGS);
        var id = args.shift();
        var formatter = _this2.view.options.formatters[id];

        var processedArgs = _this2.parseFormatterArguments(args, index);

        if (formatter && formatter.read instanceof Function) {
          result = formatter.read.apply(formatter, [result].concat(processedArgs));
        } else if (formatter instanceof Function) {
          result = formatter.apply(void 0, [result].concat(processedArgs));
        }

        return result;
      }, value);
    } // Returns an event handler for the binding around the supplied function.
    ;

    _proto.eventHandler = function eventHandler(fn) {
      var binding = this;
      var handler = binding.view.options.handler;
      return function (ev) {
        handler.call(fn, this, ev, binding);
      };
    } // Sets the value for the binding. This Basically just runs the binding routine
    // with the supplied value formatted.
    ;

    _proto.set = function set(value) {
      if (value instanceof Function && !this.binder.function) {
        value = this.formattedValue(value.call(this.model));
      } else {
        value = this.formattedValue(value);
      }

      var routineFn = this.binder.routine || this.binder;

      if (routineFn instanceof Function) {
        routineFn.call(this, this.el, value);
      }
    } // Syncs up the view binding with the model.
    ;

    _proto.sync = function sync() {
      if (this.observer) {
        this.model = this.observer.target;
        this.set(this.observer.value());
      } else {
        this.set(this.value);
      }
    } // Publishes the value currently set on the input element back to the model.
    ;

    _proto.publish = function publish() {
      var _this3 = this;

      if (this.observer) {
        var value = this.formatters.reduceRight(function (result, declaration, index) {
          var args = declaration.split(FORMATTER_SPLIT);
          var id = args.shift();
          var formatter = _this3.view.options.formatters[id];

          var processedArgs = _this3.parseFormatterArguments(args, index);

          if (formatter && formatter.publish) {
            result = formatter.publish.apply(formatter, [result].concat(processedArgs));
          }

          return result;
        }, this.getValue(this.el));
        this.observer.setValue(value);
      }
    } // Subscribes to the model for changes at the specified keypath. Bi-directional
    // routines will also listen for changes on the element to propagate them back
    // to the model.
    ;

    _proto.bind = function bind() {
      this.parseTarget();

      if (this.binder.hasOwnProperty('bind')) {
        this.binder.bind.call(this, this.el);
      }

      if (this.view.options.preloadData) {
        this.sync();
      }
    } // Unsubscribes from the model and the element.
    ;

    _proto.unbind = function unbind() {
      var _this4 = this;

      if (this.binder.unbind) {
        this.binder.unbind.call(this, this.el);
      }

      if (this.observer) {
        this.observer.unobserve();
      }

      Object.keys(this.formatterObservers).forEach(function (fi) {
        var args = _this4.formatterObservers[fi];
        Object.keys(args).forEach(function (ai) {
          args[ai].unobserve();
        });
      });
      this.formatterObservers = {};
    } // Updates the binding's model from what is currently set on the view. Unbinds
    // the old model first and then re-binds with the new model.
    ;

    _proto.update = function update(models) {
      if (models === void 0) {
        models = {};
      }

      if (this.observer) {
        this.model = this.observer.target;
      }

      if (this.binder.update) {
        this.binder.update.call(this, models);
      }
    } // Returns elements value
    ;

    _proto.getValue = function getValue(el) {
      if (this.binder && this.binder.getValue) {
        return this.binder.getValue.call(this, el);
      } else {
        return getInputValue(el);
      }
    };

    return Binding;
  }();

  var textBinder = {
    routine: function routine(node, value) {
      node.data = value != null ? value : '';
    }
  };
  var DECLARATION_SPLIT = /((?:'[^']*')*(?:(?:[^\|']*(?:'[^']*')+[^\|']*)+|[^\|]+))|^$/g;

  var parseNode = function parseNode(view, node) {
    var block = false;

    if (node.nodeType === 3) {
      var tokens = parseTemplate(node.data, tinybind.templateDelimiters);

      if (tokens) {
        for (var i = 0; i < tokens.length; i++) {
          var token = tokens[i];
          var text = document.createTextNode(token.value);
          node.parentNode.insertBefore(text, node);

          if (token.type === 1) {
            view.buildBinding(text, null, token.value, textBinder, null);
          }
        }

        node.parentNode.removeChild(node);
      }

      block = true;
    } else if (node.nodeType === 1) {
      block = view.traverse(node);
    }

    if (!block) {
      for (var _i = 0; _i < node.childNodes.length; _i++) {
        parseNode(view, node.childNodes[_i]);
      }
    }
  };

  var bindingComparator = function bindingComparator(a, b) {
    var aPriority = a.binder ? a.binder.priority || 0 : 0;
    var bPriority = b.binder ? b.binder.priority || 0 : 0;
    return bPriority - aPriority;
  };

  var trimStr = function trimStr(str) {
    return str.trim();
  }; // A collection of bindings built from a set of parent nodes.


  var View =
  /*#__PURE__*/
  function () {
    // The DOM elements and the model objects for binding are passed into the
    // constructor along with any local options that should be used throughout the
    // context of the view and it's bindings.
    function View(els, models, options) {
      if (els.jquery || els instanceof Array) {
        this.els = els;
      } else {
        this.els = [els];
      }

      this.models = models;
      this.options = options;
      this.build();
    }

    var _proto = View.prototype;

    _proto.buildBinding = function buildBinding(node, type, declaration, binder, arg) {
      var pipes = declaration.match(DECLARATION_SPLIT).map(trimStr);
      var keypath = pipes.shift();
      this.bindings.push(new Binding(this, node, type, keypath, binder, arg, pipes));
    } // Parses the DOM tree and builds `Binding` instances for every matched
    // binding declaration.
    ;

    _proto.build = function build() {
      this.bindings = [];
      var elements = this.els,
          i,
          len;

      for (i = 0, len = elements.length; i < len; i++) {
        parseNode(this, elements[i]);
      }

      this.bindings.sort(bindingComparator);
    };

    _proto.traverse = function traverse(node) {
      var bindingPrefix = tinybind._fullPrefix;
      var block = node.nodeName === 'SCRIPT' || node.nodeName === 'STYLE';
      var attributes = node.attributes;
      var bindInfos = [];
      var starBinders = this.options.starBinders;
      var type, binder, identifier, arg;

      for (var i = 0, len = attributes.length; i < len; i++) {
        var attribute = attributes[i];

        if (attribute.name.indexOf(bindingPrefix) === 0) {
          type = attribute.name.slice(bindingPrefix.length);
          binder = this.options.binders[type];
          arg = undefined;

          if (!binder) {
            for (var k = 0; k < starBinders.length; k++) {
              identifier = starBinders[k];

              if (type.slice(0, identifier.length - 1) === identifier.slice(0, -1)) {
                binder = this.options.binders[identifier];
                arg = type.slice(identifier.length - 1);
                break;
              }
            }
          }

          if (!binder) {
            binder = tinybind.fallbackBinder;
          }

          if (binder.block) {
            this.buildBinding(node, type, attribute.value, binder, arg);
            node.removeAttribute(attribute.name);
            return true;
          }

          bindInfos.push({
            attr: attribute,
            binder: binder,
            type: type,
            arg: arg
          });
        }
      }

      for (var _i2 = 0; _i2 < bindInfos.length; _i2++) {
        var bindInfo = bindInfos[_i2];
        this.buildBinding(node, bindInfo.type, bindInfo.attr.value, bindInfo.binder, bindInfo.arg);
        node.removeAttribute(bindInfo.attr.name);
      }

      return block;
    } // Binds all of the current bindings for this view.
    ;

    _proto.bind = function bind() {
      this.bindings.forEach(function (binding) {
        binding.bind();
      });
    } // Unbinds all of the current bindings for this view.
    ;

    _proto.unbind = function unbind() {
      this.bindings.forEach(function (binding) {
        binding.unbind();
      });
    } // Syncs up the view with the model by running the routines on all bindings.
    ;

    _proto.sync = function sync() {
      this.bindings.forEach(function (binding) {
        binding.sync();
      });
    } // Publishes the input values from the view back to the model (reverse sync).
    ;

    _proto.publish = function publish() {
      this.bindings.forEach(function (binding) {
        if (binding.binder && binding.binder.publishes) {
          binding.publish();
        }
      });
    } // Updates the view's models along with any affected bindings.
    ;

    _proto.update = function update(models) {
      var _this = this;

      if (models === void 0) {
        models = {};
      }

      Object.keys(models).forEach(function (key) {
        _this.models[key] = models[key];
      });
      this.bindings.forEach(function (binding) {
        if (binding.update) {
          binding.update(models);
        }
      });
    };

    return View;
  }();

  // The default `.` adapter that comes with tinybind.js. Allows subscribing to
  // properties on plain objects, implemented in ES5 natives using
  // `Object.defineProperty`.
  var ARRAY_METHODS = ['push', 'pop', 'shift', 'unshift', 'sort', 'reverse', 'splice'];
  var adapter = {
    counter: 0,
    weakmap: {},
    weakReference: function weakReference(obj) {
      if (!obj.hasOwnProperty('__rv')) {
        var id = this.counter++;
        Object.defineProperty(obj, '__rv', {
          value: id
        });
      }

      if (!this.weakmap[obj.__rv]) {
        this.weakmap[obj.__rv] = {
          callbacks: {}
        };
      }

      return this.weakmap[obj.__rv];
    },
    cleanupWeakReference: function cleanupWeakReference(data, refId) {
      if (!Object.keys(data.callbacks).length) {
        if (!(data.pointers && Object.keys(data.pointers).length)) {
          delete this.weakmap[refId];
        }
      }
    },
    stubFunction: function stubFunction(obj, fn) {
      var original = obj[fn];
      var data = this.weakReference(obj);
      var weakmap = this.weakmap;

      obj[fn] = function () {
        for (var _len = arguments.length, args = new Array(_len), _key = 0; _key < _len; _key++) {
          args[_key] = arguments[_key];
        }

        var response = original.apply(obj, args);
        Object.keys(data.pointers).forEach(function (refId) {
          var k = data.pointers[refId];

          if (weakmap[refId]) {
            if (weakmap[refId].callbacks[k] instanceof Array) {
              weakmap[refId].callbacks[k].forEach(function (callback) {
                callback.sync();
              });
            }
          }
        });
        return response;
      };
    },
    observeArray: function observeArray(value, refId, keypath) {
      var _this = this;

      if (value instanceof Array) {
        var data = this.weakReference(value);

        if (!data.pointers) {
          data.pointers = {};
          ARRAY_METHODS.forEach(function (fn) {
            _this.stubFunction(value, fn);
          });
        }

        if (!data.pointers[refId]) {
          data.pointers[refId] = [];
        }

        if (data.pointers[refId].indexOf(keypath) === -1) {
          data.pointers[refId].push(keypath);
        }
      }
    },
    unobserveArray: function unobserveArray(value, refId, keypath) {
      if (value instanceof Array && value.__rv != null) {
        var data = this.weakmap[value.__rv];

        if (data) {
          var pointers = data.pointers[refId];

          if (pointers) {
            var idx = pointers.indexOf(keypath);

            if (idx > -1) {
              pointers.splice(idx, 1);
            }

            if (!pointers.length) {
              delete data.pointers[refId];
            }

            this.cleanupWeakReference(data, value.__rv);
          }
        }
      }
    },
    observe: function observe(obj, keypath, callback) {
      var _this2 = this;

      var value;
      var callbacks = this.weakReference(obj).callbacks;

      if (!callbacks[keypath]) {
        callbacks[keypath] = [];
        var desc = Object.getOwnPropertyDescriptor(obj, keypath);

        if (!desc || !(desc.get || desc.set || !desc.configurable)) {
          value = obj[keypath];
          Object.defineProperty(obj, keypath, {
            enumerable: true,
            get: function get() {
              return value;
            },
            set: function set(newValue) {
              if (newValue !== value) {
                _this2.unobserveArray(value, obj.__rv, keypath);

                value = newValue;
                var data = _this2.weakmap[obj.__rv];

                if (data) {
                  var _callbacks = data.callbacks[keypath];

                  if (_callbacks) {
                    _callbacks.forEach(function (cb) {
                      cb.sync();
                    });
                  }

                  _this2.observeArray(newValue, obj.__rv, keypath);
                }
              }
            }
          });
        }
      }

      if (callbacks[keypath].indexOf(callback) === -1) {
        callbacks[keypath].push(callback);
      }

      this.observeArray(obj[keypath], obj.__rv, keypath);
    },
    unobserve: function unobserve(obj, keypath, callback) {
      var data = this.weakmap[obj.__rv];

      if (data) {
        var callbacks = data.callbacks[keypath];

        if (callbacks) {
          var idx = callbacks.indexOf(callback);

          if (idx > -1) {
            callbacks.splice(idx, 1);

            if (!callbacks.length) {
              delete data.callbacks[keypath];
              this.unobserveArray(obj[keypath], obj.__rv, keypath);
            }
          }

          this.cleanupWeakReference(data, obj.__rv);
        }
      }
    },
    get: function get(obj, keypath) {
      return obj[keypath];
    },
    set: function set(obj, keypath, value) {
      obj[keypath] = value;
    }
  };

  var getString = function getString(value) {
    return value != null ? value.toString() : undefined;
  };

  var times = function times(n, cb) {
    for (var i = 0; i < n; i++) {
      cb();
    }
  };

  function createView(binding, data, anchorEl) {
    var template = binding.el.cloneNode(true);
    var view = new View(template, data, binding.view.options);
    view.bind();
    binding.marker.parentNode.insertBefore(template, anchorEl);
    return view;
  }

  var binders = {
    // Binds an event handler on the element.
    'on-*': {
      function: true,
      priority: 1000,
      unbind: function unbind(el) {
        if (this.handler) {
          el.removeEventListener(this.arg, this.handler);
        }
      },
      routine: function routine(el, value) {
        if (this.handler) {
          el.removeEventListener(this.arg, this.handler);
        }

        this.handler = this.eventHandler(value);
        el.addEventListener(this.arg, this.handler);
      }
    },
    // Appends bound instances of the element in place for each item in the array.
    'each-*': {
      block: true,
      priority: 4000,
      bind: function bind(el) {
        if (!this.marker) {
          this.marker = document.createComment(" tinybind: " + this.type + " ");
          this.iterated = [];
          el.parentNode.insertBefore(this.marker, el);
          el.parentNode.removeChild(el);
        } else {
          this.iterated.forEach(function (view) {
            view.bind();
          });
        }
      },
      unbind: function unbind(el) {
        if (this.iterated) {
          this.iterated.forEach(function (view) {
            view.unbind();
          });
        }
      },
      routine: function routine(el, collection) {
        var _this = this;

        var modelName = this.arg;
        collection = collection || [];
        var indexProp = el.getAttribute('index-property') || '$index';
        collection.forEach(function (model, index) {
          var data = {
            $parent: _this.view.models
          };
          data[indexProp] = index;
          data[modelName] = model;
          var view = _this.iterated[index];

          if (!view) {
            var previous = _this.marker;

            if (_this.iterated.length) {
              previous = _this.iterated[_this.iterated.length - 1].els[0];
            }

            view = createView(_this, data, previous.nextSibling);

            _this.iterated.push(view);
          } else {
            if (view.models[modelName] !== model) {
              // search for a view that matches the model
              var matchIndex, nextView;

              for (var nextIndex = index + 1; nextIndex < _this.iterated.length; nextIndex++) {
                nextView = _this.iterated[nextIndex];

                if (nextView.models[modelName] === model) {
                  matchIndex = nextIndex;
                  break;
                }
              }

              if (matchIndex !== undefined) {
                // model is in other position
                // todo: consider avoiding the splice here by setting a flag
                // profile performance before implementing such change
                _this.iterated.splice(matchIndex, 1);

                _this.marker.parentNode.insertBefore(nextView.els[0], view.els[0]);

                nextView.models[indexProp] = index;
              } else {
                //new model
                nextView = createView(_this, data, view.els[0]);
              }

              _this.iterated.splice(index, 0, nextView);
            } else {
              view.models[indexProp] = index;
            }
          }
        });

        if (this.iterated.length > collection.length) {
          times(this.iterated.length - collection.length, function () {
            var view = _this.iterated.pop();

            view.unbind();

            _this.marker.parentNode.removeChild(view.els[0]);
          });
        }

        if (el.nodeName === 'OPTION') {
          this.view.bindings.forEach(function (binding) {
            if (binding.el === _this.marker.parentNode && binding.type === 'value') {
              binding.sync();
            }
          });
        }
      },
      update: function update(models) {
        var _this2 = this;

        var data = {}; //todo: add test and fix if necessary

        Object.keys(models).forEach(function (key) {
          if (key !== _this2.arg) {
            data[key] = models[key];
          }
        });
        this.iterated.forEach(function (view) {
          view.update(data);
        });
      }
    },
    // Adds or removes the class from the element when value is true or false.
    'class-*': function _class(el, value) {
      var elClass = " " + el.className + " ";

      if (!value === elClass.indexOf(" " + this.arg + " ") > -1) {
        if (value) {
          el.className = el.className + " " + this.arg;
        } else {
          el.className = elClass.replace(" " + this.arg + " ", ' ').trim();
        }
      }
    },
    // Sets the element's text value.
    text: function text(el, value) {
      el.textContent = value != null ? value : '';
    },
    // Sets the element's HTML content.
    html: function html(el, value) {
      el.innerHTML = value != null ? value : '';
    },
    // Shows the element when value is true.
    show: function show(el, value) {
      el.style.display = value ? '' : 'none';
    },
    // Hides the element when value is true (negated version of `show` binder).
    hide: function hide(el, value) {
      el.style.display = value ? 'none' : '';
    },
    // Enables the element when value is true.
    enabled: function enabled(el, value) {
      el.disabled = !value;
    },
    // Disables the element when value is true (negated version of `enabled` binder).
    disabled: function disabled(el, value) {
      el.disabled = !!value;
    },
    // Checks a checkbox or radio input when the value is true. Also sets the model
    // property when the input is checked or unchecked (two-way binder).
    checked: {
      publishes: true,
      priority: 2000,
      bind: function bind(el) {
        var self = this;

        if (!this.callback) {
          this.callback = function () {
            self.publish();
          };
        }

        el.addEventListener('change', this.callback);
      },
      unbind: function unbind(el) {
        el.removeEventListener('change', this.callback);
      },
      routine: function routine(el, value) {
        if (el.type === 'radio') {
          el.checked = getString(el.value) === getString(value);
        } else {
          el.checked = !!value;
        }
      }
    },
    // Sets the element's value. Also sets the model property when the input changes
    // (two-way binder).
    value: {
      publishes: true,
      priority: 3000,
      bind: function bind(el) {
        this.isRadio = el.tagName === 'INPUT' && el.type === 'radio';

        if (!this.isRadio) {
          this.event = el.getAttribute('event-name') || (el.tagName === 'SELECT' ? 'change' : 'input');
          var self = this;

          if (!this.callback) {
            this.callback = function () {
              self.publish();
            };
          }

          el.addEventListener(this.event, this.callback);
        }
      },
      unbind: function unbind(el) {
        if (!this.isRadio) {
          el.removeEventListener(this.event, this.callback);
        }
      },
      routine: function routine(el, value) {
        if (this.isRadio) {
          el.setAttribute('value', value);
        } else {
          if (el.type === 'select-multiple') {
            if (value instanceof Array) {
              for (var i = 0; i < el.length; i++) {
                var option = el[i];
                option.selected = value.indexOf(option.value) > -1;
              }
            }
          } else if (getString(value) !== getString(el.value)) {
            el.value = value != null ? value : '';
          }
        }
      }
    },
    // Inserts and binds the element and it's child nodes into the DOM when true.
    if: {
      block: true,
      priority: 4000,
      bind: function bind(el) {
        if (!this.marker) {
          this.marker = document.createComment(' tinybind: ' + this.type + ' ' + this.keypath + ' ');
          this.attached = false;
          el.parentNode.insertBefore(this.marker, el);
          el.parentNode.removeChild(el);
        } else if (this.bound === false && this.nested) {
          this.nested.bind();
        }

        this.bound = true;
      },
      unbind: function unbind() {
        if (this.nested) {
          this.nested.unbind();
          this.bound = false;
        }
      },
      routine: function routine(el, value) {
        if (!!value !== this.attached) {
          if (value) {
            if (!this.nested) {
              this.nested = new View(el, this.view.models, this.view.options);
              this.nested.bind();
            }

            this.marker.parentNode.insertBefore(el, this.marker.nextSibling);
            this.attached = true;
          } else {
            el.parentNode.removeChild(el);
            this.attached = false;
          }
        }
      },
      update: function update(models) {
        if (this.nested) {
          this.nested.update(models);
        }
      }
    }
  };

  var formatters = {
    watch: function watch(value) {
      return value;
    },
    not: function not(value) {
      return !value;
    },
    negate: function negate(value) {
      return !value;
    }
  };

  function _defineProperties(target, props) {
    for (var i = 0; i < props.length; i++) {
      var descriptor = props[i];
      descriptor.enumerable = descriptor.enumerable || false;
      descriptor.configurable = true;
      if ("value" in descriptor) descriptor.writable = true;
      Object.defineProperty(target, descriptor.key, descriptor);
    }
  }

  function _createClass(Constructor, protoProps, staticProps) {
    if (protoProps) _defineProperties(Constructor.prototype, protoProps);
    if (staticProps) _defineProperties(Constructor, staticProps);
    return Constructor;
  }

  function _inheritsLoose(subClass, superClass) {
    subClass.prototype = Object.create(superClass.prototype);
    subClass.prototype.constructor = subClass;
    subClass.__proto__ = superClass;
  }

  function _getPrototypeOf(o) {
    _getPrototypeOf = Object.setPrototypeOf ? Object.getPrototypeOf : function _getPrototypeOf(o) {
      return o.__proto__ || Object.getPrototypeOf(o);
    };
    return _getPrototypeOf(o);
  }

  function _setPrototypeOf(o, p) {
    _setPrototypeOf = Object.setPrototypeOf || function _setPrototypeOf(o, p) {
      o.__proto__ = p;
      return o;
    };

    return _setPrototypeOf(o, p);
  }

  function isNativeReflectConstruct() {
    if (typeof Reflect === "undefined" || !Reflect.construct) return false;
    if (Reflect.construct.sham) return false;
    if (typeof Proxy === "function") return true;

    try {
      Date.prototype.toString.call(Reflect.construct(Date, [], function () {}));
      return true;
    } catch (e) {
      return false;
    }
  }

  function _construct(Parent, args, Class) {
    if (isNativeReflectConstruct()) {
      _construct = Reflect.construct;
    } else {
      _construct = function _construct(Parent, args, Class) {
        var a = [null];
        a.push.apply(a, args);
        var Constructor = Function.bind.apply(Parent, a);
        var instance = new Constructor();
        if (Class) _setPrototypeOf(instance, Class.prototype);
        return instance;
      };
    }

    return _construct.apply(null, arguments);
  }

  function _isNativeFunction(fn) {
    return Function.toString.call(fn).indexOf("[native code]") !== -1;
  }

  function _wrapNativeSuper(Class) {
    var _cache = typeof Map === "function" ? new Map() : undefined;

    _wrapNativeSuper = function _wrapNativeSuper(Class) {
      if (Class === null || !_isNativeFunction(Class)) return Class;

      if (typeof Class !== "function") {
        throw new TypeError("Super expression must either be null or a function");
      }

      if (typeof _cache !== "undefined") {
        if (_cache.has(Class)) return _cache.get(Class);

        _cache.set(Class, Wrapper);
      }

      function Wrapper() {
        return _construct(Class, arguments, _getPrototypeOf(this).constructor);
      }

      Wrapper.prototype = Object.create(Class.prototype, {
        constructor: {
          value: Wrapper,
          enumerable: false,
          writable: true,
          configurable: true
        }
      });
      return _setPrototypeOf(Wrapper, Class);
    };

    return _wrapNativeSuper(Class);
  }

  var Component =
  /*#__PURE__*/
  function (_HTMLElement) {
    _inheritsLoose(Component, _HTMLElement);

    function Component() {
      return _HTMLElement.apply(this, arguments) || this;
    }

    var _proto = Component.prototype;

    _proto.connectedCallback = function connectedCallback() {
      var nodes = this.constructor.__templateEl.content.cloneNode(true);

      this.__tinybindView = tinybind.bind(nodes, this);

      while (this.firstChild) {
        this.removeChild(this.firstChild);
      }

      this.appendChild(nodes);
    };

    _proto.disconnectedCallback = function disconnectedCallback() {
      this.__tinybindView.unbind();
    };

    _proto.attributeChangedCallback = function attributeChangedCallback(name, old, value) {
      if (old !== value) {
        var propName = this.constructor.__propAttributeMap[name];
        this[propName] = value;
      }
    };

    _createClass(Component, null, [{
      key: "observedAttributes",
      get: function get() {
        var template = this.template;

        if (!template) {
          throw new Error("No template declared for " + this.name);
        }

        this.__templateEl = document.createElement('template');
        this.__templateEl.innerHTML = template;
        var propAttributeMap = this.__propAttributeMap = {};
        var attributes = [];
        var properties = this.properties;

        if (properties) {
          Object.keys(properties).forEach(function (propName) {
            var propConfig = properties[propName];
            var attrName = typeof propConfig === 'string' ? propConfig : propName;
            propAttributeMap[attrName] = propName;
            attributes.push(attrName);
          });
        }

        return attributes;
      }
    }]);

    return Component;
  }(_wrapNativeSuper(HTMLElement));

  tinybind.binders = binders;
  tinybind.formatters = formatters;
  tinybind.adapters['.'] = adapter;
  tinybind.Component = Component; // Binds some data to a template / element. Returns a tinybind.View instance.

  tinybind.bind = function (el, models, options) {
    var viewOptions = {};
    models = models || {};
    options = options || {};
    EXTENSIONS.forEach(function (extensionType) {
      viewOptions[extensionType] = Object.create(null);

      if (options[extensionType]) {
        Object.keys(options[extensionType]).forEach(function (key) {
          viewOptions[extensionType][key] = options[extensionType][key];
        });
      }

      Object.keys(tinybind[extensionType]).forEach(function (key) {
        if (!viewOptions[extensionType][key]) {
          viewOptions[extensionType][key] = tinybind[extensionType][key];
        }
      });
    });
    OPTIONS.forEach(function (option) {
      var value = options[option];
      viewOptions[option] = value != null ? value : tinybind[option];
    });
    viewOptions.starBinders = Object.keys(viewOptions.binders).filter(function (key) {
      return key.indexOf('*') > 0;
    });
    Observer.updateOptions(viewOptions);
    var view = new View(el, models, viewOptions);
    view.bind();
    return view;
  };

  return tinybind;

}));
//# sourceMappingURL=tinybind.js.map

// Cart.js
// version: 1.1.0
// author: Gavin Ballard
// license: MIT
(function() {
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
;/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * DS205: Consider reworking code to avoid use of IIFEs
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
// CartJS.Item
// Wraps a normal cart item JSON object to provide additional functionality.
// ---------------------


class Item {

  constructor(item) {
    this.update = this.update.bind(this);
    this.propertyArray = this.propertyArray.bind(this);
    this.update(item);
  }

  // Update this item in a way that doesn't destroy existing values.
  //
  // Implemented like this instead of a direct assignment to prevent interference with any data bindings.
  update(item) {
    for (var key in item) {
      var value = item[key];
      if (key !== 'properties') {
        this[key] = value;
      }
    }
    return this.properties = CartJS.Utils.extend({}, item.properties);
  }

  // Returns the properties of this item as an array of objects with name/value
  // properties. Useful when you'd like to iterate properties without knowing
  // in advance what they'll be.
  propertyArray() {
    return (() => {
      const result = [];
      for (var name in this.properties) {
        var value = this.properties[name];
        result.push({ name, value });
      }
      return result;
    })();
  }
}
;/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
// The CartJS namespace.
// ---------------------

const CartJS = {
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
//
//   <script type="text/javascript">
//     CartJS.init({{ cart | json }}, {
//       dataAPI: true
//     });
//   </script>
//
CartJS.init = function(cart, settings) {
  // Configure settings from any passed settings hash.
  if (settings == null) { settings = {}; }
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
    jQuery(document).on('cart.requestStarted', () => jQuery('body').addClass(CartJS.settings.requestBodyClass));
    jQuery(document).on('cart.requestComplete', () => jQuery('body').removeClass(CartJS.settings.requestBodyClass));
  }

  // Initialise DOM Binding through Rivets module.
  // Performs a no-op if Rivets.js isn't present.
  CartJS.Rivets.init();

  return jQuery(document).trigger('cart.ready', [CartJS.cart]);
};

// Configure CartJS with the given settings object.
CartJS.configure = function(settings) {
  if (settings == null) { settings = {}; }
  return CartJS.Utils.extend(CartJS.settings, settings);
};

// Add a stubbed out console.log method for browsers that don't implement it.
// Omitting this method can lead to Javascript failures in some browsers.
// See: http://stackoverflow.com/questions/7742781/why-javascript-only-works-after-opening-developer-tools-in-ie-once
if (window.console == null) {
  window.console = {};
  window.console.log = function() {};
}
;/*
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
};;/*
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
    jQuery(document).trigger('cart.requestStarted', [CartJS.cart]);
    return CartJS.Queue.process();
  },

  // Process the next item in the queue, if there is one.
  process() {
    if (!queue.length) {
      processing = false;
      jQuery(document).trigger('cart.requestComplete', [CartJS.cart]);
      return;
    }

    processing = true;
    const params = queue.shift();
    params.complete = CartJS.Queue.process;
    return jQuery.ajax(params);
  }
};
;/*
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
  getCart(options) {
    if (options == null) { options = {}; }
    options.type = 'GET';
    options.updateCart = true;
    return CartJS.Queue.add('/cart.js', {v: new Date().getTime()}, options);
  },

  // Add a new line item to the cart.
  addItem(id, quantity, properties, options) {
    if (quantity == null) { quantity = 1; }
    if (properties == null) { properties = {}; }
    if (options == null) { options = {}; }
    const data = CartJS.Utils.wrapKeys(properties, null, null, ['selling_plan']);
    data.id = id;
    data.quantity = quantity;
    CartJS.Queue.add('/cart/add.js', data, options);
    return CartJS.Core.getCart();
  },

  // Add multiple new line items to the cart.
  addItems(items, options) {
    if (options == null) { options = {}; }
    const data =
      {items};
    CartJS.Queue.add('/cart/add.js', data, options);
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
    return CartJS.Queue.add('/cart/change.js', data, options);
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
    return CartJS.Queue.add('/cart/change.js', data, options);
  },

  // Set the quantities of a number of items in the cart with an ID/Quantity "updates" mapping.
  updateItemQuantitiesById(updates, options) {
    if (updates == null) { updates = {}; }
    if (options == null) { options = {}; }
    options.updateCart = true;
    return CartJS.Queue.add('/cart/update.js', {updates}, options);
  },

  // Remove all line items for the given variant ID.
  removeItemById(id, options) {
    if (options == null) { options = {}; }
    const data = {
      id,
      quantity: 0
    };
    options.updateCart = true;
    return CartJS.Queue.add('/cart/change.js', data, options);
  },

  // Clear all items from the cart.
  clear(options) {
    if (options == null) { options = {}; }
    options.updateCart = true;
    return CartJS.Queue.add('/cart/clear.js', {}, options);
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
    return CartJS.Queue.add('/cart/update.js', CartJS.Utils.wrapKeys(attributes, 'attributes'), options);
  },

  // Clear all attributes.
  clearAttributes(options) {
    if (options == null) { options = {}; }
    options.updateCart = true;
    return CartJS.Queue.add('/cart/update.js', CartJS.Utils.wrapKeys(CartJS.Core.getAttributes(), 'attributes', ''), options);
  },

  // Get the cart note.
  getNote() {
    return CartJS.cart.note;
  },

  // Set the cart note.
  setNote(note, options) {
    if (options == null) { options = {}; }
    options.updateCart = true;
    return CartJS.Queue.add('/cart/update.js', { note }, options);
  }
};
;/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
// CartJS.Data
// Data API for CartJS.
// --------------------

// Reference to the document element.
let $document = null;

CartJS.Data = {

  // Initialise the Data API.
  init() {
    $document = jQuery(document);
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
    const $this = jQuery(this);
    const properties = {};
    properties.selling_plan = $this.attr('data-cart-selling-plan');
    return CartJS.Core.addItem($this.attr('data-cart-add'), $this.attr('data-cart-quantity'), properties);
  },

  // Handler for [data-cart-remove] click events.
  remove(e) {
    e.preventDefault();
    const $this = jQuery(this);
    return CartJS.Core.removeItem($this.attr('data-cart-remove'));
  },

  // Handler for [data-cart-remove-id] click events.
  removeById(e) {
    e.preventDefault();
    const $this = jQuery(this);
    return CartJS.Core.removeItemById($this.attr('data-cart-remove-id'));
  },

  // Handler for [data-cart-update] click events.
  update(e) {
    e.preventDefault();
    const $this = jQuery(this);
    const properties = {};
    properties.selling_plan = $this.attr('data-cart-selling-plan');
    return CartJS.Core.updateItem($this.attr('data-cart-update'), $this.attr('data-cart-quantity'), properties);
  },

  // Handler for [data-cart-update-id] click events.
  updateById(e) {
    e.preventDefault();
    const $this = jQuery(this);
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
    const $input = jQuery(this);
    const id = $input.attr('data-cart-toggle');
    if ($input.is(':checked')) {
      return CartJS.Core.addItem(id);
    } else {
      return CartJS.Core.removeItemById(id);
    }
  },

  // Handler for [data-cart-toggle-attribute] change events.
  toggleAttribute(e) {
    const $input = jQuery(this);
    const attribute = $input.attr('data-cart-toggle-attribute');
    return CartJS.Core.setAttribute(attribute, $input.is(':checked') ? 'Yes' : '');
  },

  // Handle for [data-cart-submit] submit events.
  submit(e) {
    e.preventDefault();

    const dataArray = jQuery(this).serializeArray();

    let id = undefined;
    let quantity = undefined;
    const properties = {};
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
  render(e, cart) {
    // Build a hash of render context.
    const context = {
      'item_count': cart.item_count,
      'total_price': cart.total_price,
      'total_price_money': CartJS.Utils.formatMoney(cart.total_price, CartJS.settings.moneyFormat, 'money_format', ((typeof Currency !== 'undefined' && Currency !== null ? Currency.currentCurrency : undefined) != null) ? Currency.currentCurrency : undefined),
      'total_price_money_with_currency': CartJS.Utils.formatMoney(cart.total_price, CartJS.settings.moneyWithCurrencyFormat, 'money_with_currency_format', ((typeof Currency !== 'undefined' && Currency !== null ? Currency.currentCurrency : undefined) != null) ? Currency.currentCurrency : undefined),
    };

    // Render the context to elements as needed.
    return jQuery('[data-cart-render]').each(function(){
      const $this = jQuery(this);
      return $this.html(context[$this.attr('data-cart-render')]);});
  }
};
;/*
 * decaffeinate suggestions:
 * DS101: Remove unnecessary use of Array.from
 * DS102: Remove unnecessary code created because of implicit returns
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
// CartJS.Rivets
// Adds Rivets.js / Tinybind functionality to CartJS if available.
// Drop-in: supports both rivets (0.9.6) and tinybind (1.0.0) via alias.
// -----------------------------------------------------------------

// Resolve binding engine — prefer tinybind, fallback to rivets
let rivets, tinybind;
let _bindingEngine = null;
if ((typeof tinybind !== "undefined") && (tinybind != null)) {
  _bindingEngine = tinybind;
  // Alias for legacy themes that reference window.rivets
  if ((typeof rivets === "undefined") || (rivets == null)) { window.rivets = tinybind; }
} else if ((typeof rivets !== "undefined") && (rivets != null)) {
  _bindingEngine = rivets;
  // Alias for new code that references tinybind
  if ((typeof tinybind === "undefined") || (tinybind == null)) { window.tinybind = rivets; }
}

// Ensure both globals point to same object for drop-in (strict ===)
if (_bindingEngine != null) {
  window.rivets = _bindingEngine;
  window.tinybind = _bindingEngine;
  rivets = _bindingEngine;
  tinybind = _bindingEngine;
}

if (_bindingEngine != null) {

  // Rivets.js / Tinybind has been loaded, so declare the CartJS.Rivets module.
  CartJS.Rivets = {

    // Maintain a reference to the base model object so that we can reference it later.
    model: null,

    // Maintain a list of all bound views so that we can unbind later if needed.
    boundViews: [],

    // Initialise the Rivets module.
    init() {
      return CartJS.Rivets.bindViews();
    },

    // Tear down the Rivets module.
    destroy() {
      return CartJS.Rivets.unbindViews();
    },

    // Bind all Rivets.js view elements that are currently present on the page.
    bindViews() {
      CartJS.Utils.log('Rivets.js/Tinybind is present, binding views.');

      // Unbind any currently bound views.
      CartJS.Rivets.unbindViews();

      // Merge a new models object with any specified in the settings.
      CartJS.Rivets.model = CartJS.Utils.extend({
        cart: CartJS.cart
      }, CartJS.settings.rivetsModels);

      // If Shopify's Currency global object is available, add it to the data model.
      if (window.Currency != null) {
        CartJS.Rivets.model.Currency = window.Currency;
      }

      // Iterate through and bind all elements marked as views via the [data-cart-view] attribute.
      return jQuery('[data-cart-view]').each(function() {
        const view = _bindingEngine.bind(jQuery(this), CartJS.Rivets.model);
        return CartJS.Rivets.boundViews.push(view);
      });
    },

    // Unbind all currently bound views.
    unbindViews() {
      for (var view of Array.from(CartJS.Rivets.boundViews)) {
        view.unbind();
      }
      return CartJS.Rivets.boundViews = [];
    }
  };

  // Add useful general-purpose formatters (register on both globals for drop-in)
  const _registerFormatter = function(name, fn) {
    _bindingEngine.formatters[name] = fn;
    // Keep rivets/tinybind in sync if they are separate objects (should be ===, but be safe)
    if ((typeof rivets !== "undefined") && (rivets != null) && (rivets !== _bindingEngine)) {
      rivets.formatters[name] = fn;
    }
    if ((typeof tinybind !== "undefined") && (tinybind != null) && (tinybind !== _bindingEngine)) {
      return tinybind.formatters[name] = fn;
    }
  };

  _registerFormatter('eq', (a, b) => a === b);

  _registerFormatter('includes', (a, b) => a.indexOf(b) >= 0);

  _registerFormatter('match', (a, regexp, flags) => a.match(new RegExp(regexp, flags)));

  _registerFormatter('lt', (a, b) => a < b);

  _registerFormatter('gt', (a, b) => a > b);

  _registerFormatter('not', a => !a);

  _registerFormatter('empty', a => !a.length);

  _registerFormatter('plus', (a, b) => parseInt(a) + parseInt(b));

  _registerFormatter('minus', (a, b) => parseInt(a) - parseInt(b));

  _registerFormatter('times', (a, b) => a * b);

  _registerFormatter('divided_by', (a, b) => a / b);

  _registerFormatter('modulo', (a, b) => a % b);

  _registerFormatter('prepend', (a, b) => b + a);

  _registerFormatter('append', (a, b) => a + b);

  _registerFormatter('slice', (value, start, end) => value.slice(start, end));

  _registerFormatter('pluralize', function(input, singular, plural) {
    if (plural == null) { plural = singular + 's'; }
    if (CartJS.Utils.isArray(input)) { input = input.length; }
    if (input === 1) { return singular; } else { return plural; }
  });

  _registerFormatter('array_element', (array, index) => array[index]);

  _registerFormatter('array_first', array => array[0]);

  _registerFormatter('array_last', array => array[array.length - 1]);

  // Add Shopify-specific formatters
  _registerFormatter('money', (value, currency) => CartJS.Utils.formatMoney(value, CartJS.settings.moneyFormat, 'money_format', currency));

  _registerFormatter('money_with_currency', (value, currency) => CartJS.Utils.formatMoney(value, CartJS.settings.moneyWithCurrencyFormat, 'money_with_currency_format', currency));

  _registerFormatter('weight', function(grams) {
    switch (CartJS.settings.weightUnit) {
      case 'kg': return (grams / 1000).toFixed(CartJS.settings.weightPrecision);
      case 'oz': return (grams * 0.035274).toFixed(CartJS.settings.weightPrecision);
      case 'lb': return (grams * 0.00220462).toFixed(CartJS.settings.weightPrecision);
      default: return grams.toFixed(CartJS.settings.weightPrecision);
    }
  });

  _registerFormatter('weight_with_unit', grams => _bindingEngine.formatters.weight(grams) + CartJS.settings.weightUnit);

  _registerFormatter('product_image_size', (src, size) => CartJS.Utils.getSizedImageUrl(src, size));

  // Add camelCase aliases for underscore formatters.
  _registerFormatter('moneyWithCurrency', _bindingEngine.formatters.money_with_currency);
  _registerFormatter('weightWithUnit', _bindingEngine.formatters.weight_with_unit);
  _registerFormatter('productImageSize', _bindingEngine.formatters.product_image_size);

  // Tinybind compatibility shims for Rivets drop-in
  // 1. index → $index (Tinybind uses $index, Rivets used index)
  // Provide formatter alias so {index} still works if Tinybind provides $index
  if ((_bindingEngine.formatters['$index'] != null) && (_bindingEngine.formatters['index'] == null)) {
    _registerFormatter('index', value => value);
  }

  // 2. unless binder was removed in Tinybind — shim via if+not is documented, but provide alias binder if needed
  if ((_bindingEngine.binders != null) && (_bindingEngine.binders['unless'] == null) && (_bindingEngine.binders['if'] != null)) {
    _bindingEngine.binders['unless'] = _bindingEngine.binders['if'];
  }

} else {

  // Rivets.js / Tinybind has not been loaded, so just declare a no-operation CartJS.Rivets module.
  CartJS.Rivets = {

    init() {},

    destroy() {}
  };
}
;/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * DS208: Avoid top-level this
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
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
} else if ((typeof define === 'function') && define.amd) {
  define(['exports'], function(exports) {
    CartJS.factory(this.CartJS = exports);
    return exports;
  });
} else {
  CartJS.factory(this.CartJS = {});
}

}).call(typeof window !== "undefined" ? window : this);