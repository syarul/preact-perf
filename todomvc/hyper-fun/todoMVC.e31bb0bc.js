// modules are defined as an array
// [ module function, map of requires ]
//
// map of requires is short require name -> numeric require
//
// anything defined in a previous bundle is accessed via the
// orig method which is the require for previous bundles
parcelRequire = (function (modules, cache, entry, globalName) {
  // Save the require from previous bundle to this closure if any
  var previousRequire = typeof parcelRequire === 'function' && parcelRequire;
  var nodeRequire = typeof require === 'function' && require;

  function newRequire(name, jumped) {
    if (!cache[name]) {
      if (!modules[name]) {
        // if we cannot find the module within our internal map or
        // cache jump to the current global require ie. the last bundle
        // that was added to the page.
        var currentRequire = typeof parcelRequire === 'function' && parcelRequire;
        if (!jumped && currentRequire) {
          return currentRequire(name, true);
        }

        // If there are other bundles on this page the require from the
        // previous one is saved to 'previousRequire'. Repeat this as
        // many times as there are bundles until the module is found or
        // we exhaust the require chain.
        if (previousRequire) {
          return previousRequire(name, true);
        }

        // Try the node require function if it exists.
        if (nodeRequire && typeof name === 'string') {
          return nodeRequire(name);
        }

        var err = new Error('Cannot find module \'' + name + '\'');
        err.code = 'MODULE_NOT_FOUND';
        throw err;
      }

      localRequire.resolve = resolve;
      localRequire.cache = {};

      var module = cache[name] = new newRequire.Module(name);

      modules[name][0].call(module.exports, localRequire, module, module.exports, this);
    }

    return cache[name].exports;

    function localRequire(x){
      return newRequire(localRequire.resolve(x));
    }

    function resolve(x){
      return modules[name][1][x] || x;
    }
  }

  function Module(moduleName) {
    this.id = moduleName;
    this.bundle = newRequire;
    this.exports = {};
  }

  newRequire.isParcelRequire = true;
  newRequire.Module = Module;
  newRequire.modules = modules;
  newRequire.cache = cache;
  newRequire.parent = previousRequire;
  newRequire.register = function (id, exports) {
    modules[id] = [function (require, module) {
      module.exports = exports;
    }, {}];
  };

  var error;
  for (var i = 0; i < entry.length; i++) {
    try {
      newRequire(entry[i]);
    } catch (e) {
      // Save first error but execute all entries
      if (!error) {
        error = e;
      }
    }
  }

  if (entry.length) {
    // Expose entry point to Node, AMD or browser globals
    // Based on https://github.com/ForbesLindesay/umd/blob/master/template.js
    var mainExports = newRequire(entry[entry.length - 1]);

    // CommonJS
    if (typeof exports === "object" && typeof module !== "undefined") {
      module.exports = mainExports;

    // RequireJS
    } else if (typeof define === "function" && define.amd) {
     define(function () {
       return mainExports;
     });

    // <script>
    } else if (globalName) {
      this[globalName] = mainExports;
    }
  }

  // Override the current require with this new one
  parcelRequire = newRequire;

  if (error) {
    // throw error from earlier, _after updating parcelRequire_
    throw error;
  }

  return newRequire;
})({"../node_modules/browser-split/index.js":[function(require,module,exports) {
/*!
 * Cross-Browser Split 1.1.1
 * Copyright 2007-2012 Steven Levithan <stevenlevithan.com>
 * Available under the MIT License
 * ECMAScript compliant, uniform cross-browser split method
 */

/**
 * Splits a string into an array of strings using a regex or string separator. Matches of the
 * separator are not included in the result array. However, if `separator` is a regex that contains
 * capturing groups, backreferences are spliced into the result each time `separator` is matched.
 * Fixes browser bugs compared to the native `String.prototype.split` and can be used reliably
 * cross-browser.
 * @param {String} str String to split.
 * @param {RegExp|String} separator Regex or string to use for separating the string.
 * @param {Number} [limit] Maximum number of items to include in the result array.
 * @returns {Array} Array of substrings.
 * @example
 *
 * // Basic use
 * split('a b c d', ' ');
 * // -> ['a', 'b', 'c', 'd']
 *
 * // With limit
 * split('a b c d', ' ', 2);
 * // -> ['a', 'b']
 *
 * // Backreferences in result array
 * split('..word1 word2..', /([a-z]+)(\d+)/i);
 * // -> ['..', 'word', '1', ' ', 'word', '2', '..']
 */
module.exports = (function split(undef) {

  var nativeSplit = String.prototype.split,
    compliantExecNpcg = /()??/.exec("")[1] === undef,
    // NPCG: nonparticipating capturing group
    self;

  self = function(str, separator, limit) {
    // If `separator` is not a regex, use `nativeSplit`
    if (Object.prototype.toString.call(separator) !== "[object RegExp]") {
      return nativeSplit.call(str, separator, limit);
    }
    var output = [],
      flags = (separator.ignoreCase ? "i" : "") + (separator.multiline ? "m" : "") + (separator.extended ? "x" : "") + // Proposed for ES6
      (separator.sticky ? "y" : ""),
      // Firefox 3+
      lastLastIndex = 0,
      // Make `global` and avoid `lastIndex` issues by working with a copy
      separator = new RegExp(separator.source, flags + "g"),
      separator2, match, lastIndex, lastLength;
    str += ""; // Type-convert
    if (!compliantExecNpcg) {
      // Doesn't need flags gy, but they don't hurt
      separator2 = new RegExp("^" + separator.source + "$(?!\\s)", flags);
    }
    /* Values for `limit`, per the spec:
     * If undefined: 4294967295 // Math.pow(2, 32) - 1
     * If 0, Infinity, or NaN: 0
     * If positive number: limit = Math.floor(limit); if (limit > 4294967295) limit -= 4294967296;
     * If negative number: 4294967296 - Math.floor(Math.abs(limit))
     * If other: Type-convert, then use the above rules
     */
    limit = limit === undef ? -1 >>> 0 : // Math.pow(2, 32) - 1
    limit >>> 0; // ToUint32(limit)
    while (match = separator.exec(str)) {
      // `separator.lastIndex` is not reliable cross-browser
      lastIndex = match.index + match[0].length;
      if (lastIndex > lastLastIndex) {
        output.push(str.slice(lastLastIndex, match.index));
        // Fix browsers whose `exec` methods don't consistently return `undefined` for
        // nonparticipating capturing groups
        if (!compliantExecNpcg && match.length > 1) {
          match[0].replace(separator2, function() {
            for (var i = 1; i < arguments.length - 2; i++) {
              if (arguments[i] === undef) {
                match[i] = undef;
              }
            }
          });
        }
        if (match.length > 1 && match.index < str.length) {
          Array.prototype.push.apply(output, match.slice(1));
        }
        lastLength = match[0].length;
        lastLastIndex = lastIndex;
        if (output.length >= limit) {
          break;
        }
      }
      if (separator.lastIndex === match.index) {
        separator.lastIndex++; // Avoid an infinite loop
      }
    }
    if (lastLastIndex === str.length) {
      if (lastLength || !separator.test("")) {
        output.push("");
      }
    } else {
      output.push(str.slice(lastLastIndex));
    }
    return output.length > limit ? output.slice(0, limit) : output;
  };

  return self;
})();

},{}],"../node_modules/indexof/index.js":[function(require,module,exports) {

var indexOf = [].indexOf;

module.exports = function(arr, obj){
  if (indexOf) return arr.indexOf(obj);
  for (var i = 0; i < arr.length; ++i) {
    if (arr[i] === obj) return i;
  }
  return -1;
};
},{}],"../node_modules/class-list/index.js":[function(require,module,exports) {
// contains, add, remove, toggle
var indexof = require('indexof')

module.exports = ClassList

function ClassList(elem) {
    var cl = elem.classList

    if (cl) {
        return cl
    }

    var classList = {
        add: add
        , remove: remove
        , contains: contains
        , toggle: toggle
        , toString: $toString
        , length: 0
        , item: item
    }

    return classList

    function add(token) {
        var list = getTokens()
        if (indexof(list, token) > -1) {
            return
        }
        list.push(token)
        setTokens(list)
    }

    function remove(token) {
        var list = getTokens()
            , index = indexof(list, token)

        if (index === -1) {
            return
        }

        list.splice(index, 1)
        setTokens(list)
    }

    function contains(token) {
        return indexof(getTokens(), token) > -1
    }

    function toggle(token) {
        if (contains(token)) {
            remove(token)
            return false
        } else {
            add(token)
            return true
        }
    }

    function $toString() {
        return elem.className
    }

    function item(index) {
        var tokens = getTokens()
        return tokens[index] || null
    }

    function getTokens() {
        var className = elem.className

        return filter(className.split(" "), isTruthy)
    }

    function setTokens(list) {
        var length = list.length

        elem.className = list.join(" ")
        classList.length = length

        for (var i = 0; i < list.length; i++) {
            classList[i] = list[i]
        }

        delete list[length]
    }
}

function filter (arr, fn) {
    var ret = []
    for (var i = 0; i < arr.length; i++) {
        if (fn(arr[i])) ret.push(arr[i])
    }
    return ret
}

function isTruthy(value) {
    return !!value
}

},{"indexof":"../node_modules/indexof/index.js"}],"../../../AppData/Local/Yarn/Data/global/node_modules/parcel-bundler/src/builtins/_empty.js":[function(require,module,exports) {

},{}],"../node_modules/hyperscript/index.js":[function(require,module,exports) {
var split = require('browser-split')
var ClassList = require('class-list')

var w = typeof window === 'undefined' ? require('html-element') : window
var document = w.document
var Text = w.Text

function context () {

  var cleanupFuncs = []

  function h() {
    var args = [].slice.call(arguments), e = null
    function item (l) {
      var r
      function parseClass (string) {
        // Our minimal parser doesn’t understand escaping CSS special
        // characters like `#`. Don’t use them. More reading:
        // https://mathiasbynens.be/notes/css-escapes .

        var m = split(string, /([\.#]?[^\s#.]+)/)
        if(/^\.|#/.test(m[1]))
          e = document.createElement('div')
        forEach(m, function (v) {
          var s = v.substring(1,v.length)
          if(!v) return
          if(!e)
            e = document.createElement(v)
          else if (v[0] === '.')
            ClassList(e).add(s)
          else if (v[0] === '#')
            e.setAttribute('id', s)
        })
      }

      if(l == null)
        ;
      else if('string' === typeof l) {
        if(!e)
          parseClass(l)
        else
          e.appendChild(r = document.createTextNode(l))
      }
      else if('number' === typeof l
        || 'boolean' === typeof l
        || l instanceof Date
        || l instanceof RegExp ) {
          e.appendChild(r = document.createTextNode(l.toString()))
      }
      //there might be a better way to handle this...
      else if (isArray(l))
        forEach(l, item)
      else if(isNode(l))
        e.appendChild(r = l)
      else if(l instanceof Text)
        e.appendChild(r = l)
      else if ('object' === typeof l) {
        for (var k in l) {
          if('function' === typeof l[k]) {
            if(/^on\w+/.test(k)) {
              (function (k, l) { // capture k, l in the closure
                if (e.addEventListener){
                  e.addEventListener(k.substring(2), l[k], false)
                  cleanupFuncs.push(function(){
                    e.removeEventListener(k.substring(2), l[k], false)
                  })
                }else{
                  e.attachEvent(k, l[k])
                  cleanupFuncs.push(function(){
                    e.detachEvent(k, l[k])
                  })
                }
              })(k, l)
            } else {
              // observable
              e[k] = l[k]()
              cleanupFuncs.push(l[k](function (v) {
                e[k] = v
              }))
            }
          }
          else if(k === 'style') {
            if('string' === typeof l[k]) {
              e.style.cssText = l[k]
            }else{
              for (var s in l[k]) (function(s, v) {
                if('function' === typeof v) {
                  // observable
                  e.style.setProperty(s, v())
                  cleanupFuncs.push(v(function (val) {
                    e.style.setProperty(s, val)
                  }))
                } else
                  var match = l[k][s].match(/(.*)\W+!important\W*$/);
                  if (match) {
                    e.style.setProperty(s, match[1], 'important')
                  } else {
                    e.style.setProperty(s, l[k][s])
                  }
              })(s, l[k][s])
            }
          } else if(k === 'attrs') {
            for (var v in l[k]) {
              e.setAttribute(v, l[k][v])
            }
          }
          else if (k.substr(0, 5) === "data-") {
            e.setAttribute(k, l[k])
          } else {
            e[k] = l[k]
          }
        }
      } else if ('function' === typeof l) {
        //assume it's an observable!
        var v = l()
        e.appendChild(r = isNode(v) ? v : document.createTextNode(v))

        cleanupFuncs.push(l(function (v) {
          if(isNode(v) && r.parentElement)
            r.parentElement.replaceChild(v, r), r = v
          else
            r.textContent = v
        }))
      }

      return r
    }
    while(args.length)
      item(args.shift())

    return e
  }

  h.cleanup = function () {
    for (var i = 0; i < cleanupFuncs.length; i++){
      cleanupFuncs[i]()
    }
    cleanupFuncs.length = 0
  }

  return h
}

var h = module.exports = context()
h.context = context

function isNode (el) {
  return el && el.nodeName && el.nodeType
}

function forEach (arr, fn) {
  if (arr.forEach) return arr.forEach(fn)
  for (var i = 0; i < arr.length; i++) fn(arr[i], i)
}

function isArray (arr) {
  return Object.prototype.toString.call(arr) == '[object Array]'
}



},{"browser-split":"../node_modules/browser-split/index.js","class-list":"../node_modules/class-list/index.js","html-element":"../../../AppData/Local/Yarn/Data/global/node_modules/parcel-bundler/src/builtins/_empty.js"}],"../node_modules/observable/index.js":[function(require,module,exports) {
;(function () {
"use strict";

var useHook = false;

// bind a to b -- One Way Binding
function bind1(a, b) {
  a(b()); b(a)
}
//bind a to b and b to a -- Two Way Binding
function bind2(a, b) {
  b(a()); a(b); b(a);
}

//---util-funtions------

//check if this call is a get.
function isGet(val) {
  return undefined === val
}

//check if this call is a set, else, it's a listen
function isSet(val) {
  return 'function' !== typeof val
}

function isFunction (fun) {
  return 'function' === typeof fun
}

function assertObservable (observable) {
  if(!isFunction(observable))
    throw new Error('transform expects an observable')
  return observable
}

//trigger all listeners
function all(ary, val) {
  for(var k in ary)
    ary[k](val)
}

//remove a listener
function remove(ary, item) {
  delete ary[ary.indexOf(item)]
}

//register a listener
function on(emitter, event, listener) {
  (emitter.on || emitter.addEventListener)
    .call(emitter, event, listener, false)
}

function off(emitter, event, listener) {
  (emitter.removeListener || emitter.removeEventListener || emitter.off)
    .call(emitter, event, listener, false)
}

// accessor for observable value
function fun() {
  var wrapped = [].shift.call(arguments)
  var hooks = [].slice.call(arguments)
  return hooks.length < 1 ? wrapped()
    : function () {
      return wrapped.apply(this, [].concat.call(hooks.map(h => h()), [].slice.call(arguments)))
    }
}

//An observable that stores a value.

function value(initialValue, reducer) {
  var _val = isGet(reducer) ?
    initialValue
    : reducer, listeners = []
  observable.set = function (val) {
    all(listeners, _val = isGet(reducer) ? val : initialValue(_val, val))
  }
  // transform into useState/useReducer
  // i.e const [state, setState] = useState('foo')
  return useHook ? [observable, function (val) {
    all(listeners, _val = isGet(reducer) ? val : initialValue(_val, val))
  }] : observable

  function observable(val) {
    return (
      isGet(val) ? _val
      : isSet(val) ? _val = isGet(reducer) ? val : initialValue(_val, val)
      : (listeners.push(val), val(_val), function () {
        remove(listeners, val)
      })
  )}}
  //^ if written in this style, always ends )}}

/*
##property
observe a property of an object, works with scuttlebutt.
could change this to work with backbone Model - but it would become ugly.
*/

function property (model, key) {
  return function (val) {
    return (
      isGet(val) ? model.get(key) :
      isSet(val) ? model.set(key, val) :
      (on(model, 'change:'+key, val), val(model.get(key)), function () {
        off(model, 'change:'+key, val)
      })
    )}}

/*
note the use of the elvis operator `?:` in chained else-if formation,
and also the comma operator `,` which evaluates each part and then
returns the last value.

only 8 lines! that isn't much for what this baby can do!
*/

function transform (observable, down, up) {
  assertObservable(observable)
  return function (val) {
    return (
      isGet(val) ? down(observable())
    : isSet(val) ? observable((up || down)(val))
    : observable(function (_val) { val(down(_val)) })
    )}}

function not(observable) {
  return transform(observable, function (v) { return !v })
}

function listen (element, event, attr, listener) {
  function onEvent () {
    listener(isFunction(attr) ? attr() : element[attr])
  }
  on(element, event, onEvent)
  onEvent()
  return function () {
    off(element, event, onEvent)
  }
}

//observe html element - aliased as `input`
function attribute(element, attr, event) {
  attr = attr || 'value'; event = event || 'input'
  return function (val) {
    return (
      isGet(val) ? element[attr]
    : isSet(val) ? element[attr] = val
    : listen(element, event, attr, val)
    )}
}

// observe a select element
function select(element) {
  function _attr () {
      return element[element.selectedIndex].value;
  }
  function _set(val) {
    for(var i=0; i < element.options.length; i++) {
      if(element.options[i].value == val) element.selectedIndex = i;
    }
  }
  return function (val) {
    return (
      isGet(val) ? element.options[element.selectedIndex].value
    : isSet(val) ? _set(val)
    : listen(element, 'change', _attr, val)
    )}
}

//toggle based on an event, like mouseover, mouseout
function toggle (el, up, down) {
  var i = false
  return function (val) {
    function onUp() {
      i || val(i = true)
    }
    function onDown () {
      i && val(i = false)
    }
    return (
      isGet(val) ? i
    : isSet(val) ? undefined //read only
    : (on(el, up, onUp), on(el, down || up, onDown), val(i), function () {
      off(el, up, onUp); off(el, down || up, onDown)
    })
  )}}

function error (message) {
  throw new Error(message)
}

function compute (observables, compute) {
  var cur = observables.map(function (e) {
    return e()
  }), init = true

  var [v] = value()

  observables.forEach(function (f, i) {
    f(function (val) {
      cur[i] = val
      if(init) return
      v(compute.apply(null, cur))
    })
  })
  v(compute.apply(null, cur))
  init = false
  v(function () {
    compute.apply(null, cur)
  })

  return v
}

function boolean (observable, truthy, falsey) {
  return (
    transform(observable, function (val) {
      return val ? truthy : falsey
    }, function (val) {
      return val == truthy ? true : false
    })
  )
}

function signal () {
  var _val, listeners = []
  return function (val) {
    return (
      isGet(val) ? _val
        : isSet(val) ? (!(_val===val) ? all(listeners, _val = val):"")
        : (listeners.push(val), val(_val), function () {
           remove(listeners, val)
        })
    )}}

var exports = value
exports.bind1     = bind1
exports.bind2     = bind2
exports.value     = value
exports.not       = not
exports.property  = property
exports.input     =
exports.attribute = attribute
exports.select    = select
exports.compute   = compute
exports.transform = transform
exports.boolean   = boolean
exports.toggle    = toggle
exports.hover     = function (e) { return toggle(e, 'mouseover', 'mouseout')}
exports.focus     = function (e) { return toggle(e, 'focus', 'blur')}
exports.signal    = signal
exports.fun       = fun
exports.useHook   = function (bool) { useHook = bool }

if('object' === typeof module) module.exports = exports
else                           window.observable = exports
})()

},{}],"app/utils.js":[function(require,module,exports) {
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.SHOW_COMPLETE = exports.SHOW_ACTIVE = exports.SHOW_ALL = exports.ESC_KEY = exports.ENTER_KEY = exports.camelCase = exports.uuid = exports.store = void 0;

/* global localStorage */
var store = function store(namespace, data) {
  if (data) {
    return localStorage.setItem(namespace, JSON.stringify(data));
  }

  var store = localStorage.getItem(namespace);
  return store && JSON.parse(store) || [];
};

exports.store = store;

var uuid = function uuid() {
  return Math.round(Math.random() * 1e12).toString(32);
};

exports.uuid = uuid;

var camelCase = function camelCase(s) {
  return s.charAt(0).toUpperCase() + s.slice(1);
};

exports.camelCase = camelCase;
var ENTER_KEY = 13;
exports.ENTER_KEY = ENTER_KEY;
var ESC_KEY = 27;
exports.ESC_KEY = ESC_KEY;
var SHOW_ALL = 'All';
exports.SHOW_ALL = SHOW_ALL;
var SHOW_ACTIVE = 'Active';
exports.SHOW_ACTIVE = SHOW_ACTIVE;
var SHOW_COMPLETE = 'Completed';
exports.SHOW_COMPLETE = SHOW_COMPLETE;
},{}],"app/reducers/todoReducer.js":[function(require,module,exports) {
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.todoReducer = exports.initialTodo = void 0;

var _utils = require("../utils");

function ownKeys(object, enumerableOnly) { var keys = Object.keys(object); if (Object.getOwnPropertySymbols) { var symbols = Object.getOwnPropertySymbols(object); if (enumerableOnly) symbols = symbols.filter(function (sym) { return Object.getOwnPropertyDescriptor(object, sym).enumerable; }); keys.push.apply(keys, symbols); } return keys; }

function _objectSpread(target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i] != null ? arguments[i] : {}; if (i % 2) { ownKeys(Object(source), true).forEach(function (key) { _defineProperty(target, key, source[key]); }); } else if (Object.getOwnPropertyDescriptors) { Object.defineProperties(target, Object.getOwnPropertyDescriptors(source)); } else { ownKeys(Object(source)).forEach(function (key) { Object.defineProperty(target, key, Object.getOwnPropertyDescriptor(source, key)); }); } } return target; }

function _defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }

function _toConsumableArray(arr) { return _arrayWithoutHoles(arr) || _iterableToArray(arr) || _nonIterableSpread(); }

function _nonIterableSpread() { throw new TypeError("Invalid attempt to spread non-iterable instance"); }

function _iterableToArray(iter) { if (Symbol.iterator in Object(iter) || Object.prototype.toString.call(iter) === "[object Arguments]") return Array.from(iter); }

function _arrayWithoutHoles(arr) { if (Array.isArray(arr)) { for (var i = 0, arr2 = new Array(arr.length); i < arr.length; i++) { arr2[i] = arr[i]; } return arr2; } }

var DATA_STORE = 'DATA_STORE'; // we can disable using localStorage at anytime

var useStore = false;

var processOutput = function processOutput(state) {
  var todos = state.todos;
  useStore && (0, _utils.store)(DATA_STORE, todos);
  var uncompleted = todos.filter(function (c) {
    return !c.completed;
  });
  var completed = todos.filter(function (c) {
    return c.completed;
  });
  return {
    todos: todos,
    clearToggle: !!completed.length,
    plural: uncompleted.length === 1 ? '' : 's',
    count: uncompleted.length,
    isChecked: !uncompleted.length
  };
};

var initialTodo = processOutput({
  todos: useStore && (0, _utils.store)(DATA_STORE) || [
    /*{
    id: "9ngehrp",
    todo: "awdx",
    completed: false,
    editing: false
    }*/
  ]
});
exports.initialTodo = initialTodo;

var todoReducer = function todoReducer(state, _ref) {
  var action = _ref.action,
      todo = _ref.todo;

  switch (action) {
    case 'add':
      {
        var newTodo = {
          id: (0, _utils.uuid)(),
          todo: todo,
          completed: false,
          editing: false
        };
        var todos = [].concat(_toConsumableArray(state.todos), [newTodo]);
        return processOutput(_objectSpread({}, state, {
          todos: todos
        }));
      }

    case 'edit':
      {
        var idx = state.todos.findIndex(function (t) {
          return t.id === todo.id;
        });

        var _todos = Object.assign([], state.todos);

        _todos.splice(idx, 1, todo);

        return processOutput(_objectSpread({}, state, {
          todos: _todos
        }));
      }

    case 'remove':
      {
        var _idx = state.todos.findIndex(function (t) {
          return t.id === todo.id;
        });

        var _todos2 = Object.assign([], state.todos);

        _todos2.splice(_idx, 1);

        return processOutput(_objectSpread({}, state, {
          todos: _todos2
        }));
      }

    case 'clearComplete':
      {
        var _todos3 = state.todos.filter(function (t) {
          return !t.completed;
        });

        return processOutput(_objectSpread({}, state, {
          todos: _todos3
        }));
      }

    case 'completeAll':
      {
        var _todos4 = state.todos.map(function (t) {
          return _objectSpread({}, t, {
            completed: !state.isChecked
          });
        });

        return processOutput(_objectSpread({}, state, {
          todos: _todos4
        }));
      }

    default:
      return processOutput(state);
  }
};

exports.todoReducer = todoReducer;
},{"../utils":"app/utils.js"}],"app/reducers/filterReducer.js":[function(require,module,exports) {
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.filterReducer = exports.initialFilter = void 0;

var _utils = require("../utils");

function ownKeys(object, enumerableOnly) { var keys = Object.keys(object); if (Object.getOwnPropertySymbols) { var symbols = Object.getOwnPropertySymbols(object); if (enumerableOnly) symbols = symbols.filter(function (sym) { return Object.getOwnPropertyDescriptor(object, sym).enumerable; }); keys.push.apply(keys, symbols); } return keys; }

function _objectSpread(target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i] != null ? arguments[i] : {}; if (i % 2) { ownKeys(Object(source), true).forEach(function (key) { _defineProperty(target, key, source[key]); }); } else if (Object.getOwnPropertyDescriptors) { Object.defineProperties(target, Object.getOwnPropertyDescriptors(source)); } else { ownKeys(Object(source)).forEach(function (key) { Object.defineProperty(target, key, Object.getOwnPropertyDescriptor(source, key)); }); } } return target; }

function _defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }

function _slicedToArray(arr, i) { return _arrayWithHoles(arr) || _iterableToArrayLimit(arr, i) || _nonIterableRest(); }

function _nonIterableRest() { throw new TypeError("Invalid attempt to destructure non-iterable instance"); }

function _iterableToArrayLimit(arr, i) { if (!(Symbol.iterator in Object(arr) || Object.prototype.toString.call(arr) === "[object Arguments]")) { return; } var _arr = []; var _n = true; var _d = false; var _e = undefined; try { for (var _i = arr[Symbol.iterator](), _s; !(_n = (_s = _i.next()).done); _n = true) { _arr.push(_s.value); if (i && _arr.length === i) break; } } catch (err) { _d = true; _e = err; } finally { try { if (!_n && _i["return"] != null) _i["return"](); } finally { if (_d) throw _e; } } return _arr; }

function _arrayWithHoles(arr) { if (Array.isArray(arr)) return arr; }

var initialFilter = Array.from(['all', 'active', 'completed'], function (page) {
  var _ref = window.location.hash.match(/([^#/])(.*)/) || ['all'],
      _ref2 = _slicedToArray(_ref, 1),
      selected = _ref2[0];

  return {
    href: "#/".concat(page),
    name: (0, _utils.camelCase)(page),
    selected: selected === page
  };
});
exports.initialFilter = initialFilter;

var filterReducer = function filterReducer(state, href) {
  return Array.from(state, function (filter) {
    return filter.href === href ? _objectSpread({}, filter, {
      selected: true
    }) : _objectSpread({}, filter, {
      selected: false
    });
  });
};

exports.filterReducer = filterReducer;
},{"../utils":"app/utils.js"}],"app/header.js":[function(require,module,exports) {
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.header = void 0;

var _hyperscript = _interopRequireDefault(require("hyperscript"));

var _utils = require("./utils");

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var header = function header(_ref) {
  var dispatch = _ref.dispatch;
  var input; // need to wait for sometime

  setTimeout(function () {
    input && input.focus();
  });

  var onkeyup = function onkeyup(e) {
    var todo = e.target.value.trim();

    if (e.which === _utils.ENTER_KEY && todo.length) {
      dispatch({
        action: 'add',
        todo: todo
      });
      e.target.value = '';
    }
  };

  return (0, _hyperscript.default)('header', (0, _hyperscript.default)('h1', 'todos'), input = (0, _hyperscript.default)('input.new-todo', {
    onkeyup: onkeyup,
    placeholder: 'What needs to be done?'
  }));
};

exports.header = header;
},{"hyperscript":"../node_modules/hyperscript/index.js","./utils":"app/utils.js"}],"app/todoItem.js":[function(require,module,exports) {
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.todoItem = void 0;

var _hyperscript = _interopRequireDefault(require("hyperscript"));

var _observable = _interopRequireDefault(require("observable"));

var _utils = require("./utils");

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function ownKeys(object, enumerableOnly) { var keys = Object.keys(object); if (Object.getOwnPropertySymbols) { var symbols = Object.getOwnPropertySymbols(object); if (enumerableOnly) symbols = symbols.filter(function (sym) { return Object.getOwnPropertyDescriptor(object, sym).enumerable; }); keys.push.apply(keys, symbols); } return keys; }

function _objectSpread(target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i] != null ? arguments[i] : {}; if (i % 2) { ownKeys(Object(source), true).forEach(function (key) { _defineProperty(target, key, source[key]); }); } else if (Object.getOwnPropertyDescriptors) { Object.defineProperties(target, Object.getOwnPropertyDescriptors(source)); } else { ownKeys(Object(source)).forEach(function (key) { Object.defineProperty(target, key, Object.getOwnPropertyDescriptor(source, key)); }); } } return target; }

function _defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }

function _slicedToArray(arr, i) { return _arrayWithHoles(arr) || _iterableToArrayLimit(arr, i) || _nonIterableRest(); }

function _nonIterableRest() { throw new TypeError("Invalid attempt to destructure non-iterable instance"); }

function _iterableToArrayLimit(arr, i) { if (!(Symbol.iterator in Object(arr) || Object.prototype.toString.call(arr) === "[object Arguments]")) { return; } var _arr = []; var _n = true; var _d = false; var _e = undefined; try { for (var _i = arr[Symbol.iterator](), _s; !(_n = (_s = _i.next()).done); _n = true) { _arr.push(_s.value); if (i && _arr.length === i) break; } } catch (err) { _d = true; _e = err; } finally { try { if (!_n && _i["return"] != null) _i["return"](); } finally { if (_d) throw _e; } } return _arr; }

function _arrayWithHoles(arr) { if (Array.isArray(arr)) return arr; }

var useState = _observable.default;

var todoItem = function todoItem(item) {
  var todo = item.todo,
      completed = item.completed,
      editing = item.editing,
      dispatch = item.dispatch;

  var _useState = useState(todo),
      _useState2 = _slicedToArray(_useState, 2),
      value = _useState2[0],
      setValue = _useState2[1];

  var onkeyup = function onkeyup(e) {
    setValue(e.target.value.trim());

    if (e.keyCode === _utils.ENTER_KEY) {
      dispatch({
        action: 'edit',
        todo: _objectSpread({}, item, {
          todo: value(),
          editing: false
        })
      });
    } else if (e.keyCode === _utils.ESC_KEY) {
      dispatch({
        action: 'edit',
        todo: _objectSpread({}, item, {
          editing: false
        })
      });
    }
  };

  var toggle = function toggle() {
    dispatch({
      action: 'edit',
      todo: _objectSpread({}, item, {
        completed: !completed
      })
    });
  };

  var activeClass = function activeClass() {
    var cl = [];
    if (completed) cl = cl.concat('completed');
    if (editing) cl = cl.concat('editing');
    return cl.join(' ');
  };

  var editTodo = function editTodo() {
    dispatch({
      action: 'edit',
      todo: _objectSpread({}, item, {
        editing: true
      })
    });
  };

  var destroy = function destroy() {
    dispatch({
      action: 'remove',
      todo: item
    });
  };

  var _useState3 = useState(editing),
      _useState4 = _slicedToArray(_useState3, 1),
      isEditing = _useState4[0];

  var edit; // need to wait for sometime

  isEditing(function (e) {
    e && setTimeout(function () {
      edit.focus();
    });
  });
  return (0, _hyperscript.default)('li', {
    className: activeClass()
  }, (0, _hyperscript.default)('div.view', (0, _hyperscript.default)('input.toggle', {
    type: 'checkbox',
    checked: completed ? true : false,
    onclick: toggle
  }), (0, _hyperscript.default)('label', {
    ondblclick: editTodo,
    value: value
  }, todo), (0, _hyperscript.default)('button.destroy', {
    onclick: destroy
  })), edit = (0, _hyperscript.default)('input.edit', {
    value: value,
    onkeyup: onkeyup
  }));
};

exports.todoItem = todoItem;
},{"hyperscript":"../node_modules/hyperscript/index.js","observable":"../node_modules/observable/index.js","./utils":"app/utils.js"}],"app/todo.js":[function(require,module,exports) {
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.todo = void 0;

var _hyperscript = _interopRequireDefault(require("hyperscript"));

var _todoItem = require("./todoItem");

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function ownKeys(object, enumerableOnly) { var keys = Object.keys(object); if (Object.getOwnPropertySymbols) { var symbols = Object.getOwnPropertySymbols(object); if (enumerableOnly) symbols = symbols.filter(function (sym) { return Object.getOwnPropertyDescriptor(object, sym).enumerable; }); keys.push.apply(keys, symbols); } return keys; }

function _objectSpread(target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i] != null ? arguments[i] : {}; if (i % 2) { ownKeys(Object(source), true).forEach(function (key) { _defineProperty(target, key, source[key]); }); } else if (Object.getOwnPropertyDescriptors) { Object.defineProperties(target, Object.getOwnPropertyDescriptors(source)); } else { ownKeys(Object(source)).forEach(function (key) { Object.defineProperty(target, key, Object.getOwnPropertyDescriptor(source, key)); }); } } return target; }

function _defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }

var todo = function todo(_ref) {
  var todos = _ref.todos,
      dispatch = _ref.dispatch;
  return (0, _hyperscript.default)('ul.todo-list', todos.map(function (todo) {
    return (0, _todoItem.todoItem)(_objectSpread({}, todo, {
      dispatch: dispatch
    }));
  }));
};

exports.todo = todo;
},{"hyperscript":"../node_modules/hyperscript/index.js","./todoItem":"app/todoItem.js"}],"app/filter.js":[function(require,module,exports) {
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.filter = void 0;

var _hyperscript = _interopRequireDefault(require("hyperscript"));

var _observable = _interopRequireDefault(require("observable"));

var _utils = require("./utils");

var _todoItem = require("./todoItem");

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var transform = _observable.default.transform;
var initial = true;

var filter = function filter(_ref) {
  var filter = _ref.filter,
      dispatchFilter = _ref.dispatchFilter;

  var updateUrl = function updateUrl(e) {
    dispatchFilter(e.target.hash);
  };

  if (initial) {
    initial = false;

    if (!filter().find(function (_ref2) {
      var href = _ref2.href;
      return href === window.location.hash;
    })) {
      window.history.pushState({}, null, '#/all');
    }
  }

  return (0, _hyperscript.default)('ul.filters', Array.from(filter(), function (_ref3) {
    var name = _ref3.name,
        href = _ref3.href,
        selected = _ref3.selected;
    return (0, _hyperscript.default)('li', {
      id: name,
      onclick: updateUrl
    }, (0, _hyperscript.default)('a', {
      className: selected ? 'selected' : '',
      href: href
    }, name));
  }));
};

exports.filter = filter;
},{"hyperscript":"../node_modules/hyperscript/index.js","observable":"../node_modules/observable/index.js","./utils":"app/utils.js","./todoItem":"app/todoItem.js"}],"app/todoFooter.js":[function(require,module,exports) {
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.todoFooter = void 0;

var _hyperscript = _interopRequireDefault(require("hyperscript"));

var _observable = _interopRequireDefault(require("observable"));

var _filter = require("./filter");

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var transform = _observable.default.transform;

var todoFooter = function todoFooter(_ref) {
  var show = _ref.show,
      count = _ref.count,
      plural = _ref.plural,
      clearToggle = _ref.clearToggle,
      showFilter = _ref.showFilter,
      filter = _ref.filter,
      dispatchFilter = _ref.dispatchFilter,
      clearCompleted = _ref.clearCompleted;
  return (0, _hyperscript.default)('footer.footer', {
    style: {
      display: show && 'block' || 'none' // without diffing we can't remove this node

    }
  }, (0, _hyperscript.default)('span.todo-count', (0, _hyperscript.default)('strong', count), " item".concat(plural, " left")), transform(showFilter, function () {
    return (0, _filter.filter)({
      filter: filter,
      dispatchFilter: dispatchFilter
    });
  }), clearToggle ? (0, _hyperscript.default)('button.clear-completed', {
    onclick: clearCompleted
  }, 'Clear Complete') : '');
};

exports.todoFooter = todoFooter;
},{"hyperscript":"../node_modules/hyperscript/index.js","observable":"../node_modules/observable/index.js","./filter":"app/filter.js"}],"app/todoapp.js":[function(require,module,exports) {
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.app = void 0;

var _hyperscript = _interopRequireDefault(require("hyperscript"));

var _observable = _interopRequireDefault(require("observable"));

var _todoReducer = require("./reducers/todoReducer");

var _filterReducer = require("./reducers/filterReducer");

var _header = require("./header");

var _todo = require("./todo");

var _todoFooter = require("./todoFooter");

var _utils = require("./utils");

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _slicedToArray(arr, i) { return _arrayWithHoles(arr) || _iterableToArrayLimit(arr, i) || _nonIterableRest(); }

function _nonIterableRest() { throw new TypeError("Invalid attempt to destructure non-iterable instance"); }

function _iterableToArrayLimit(arr, i) { if (!(Symbol.iterator in Object(arr) || Object.prototype.toString.call(arr) === "[object Arguments]")) { return; } var _arr = []; var _n = true; var _d = false; var _e = undefined; try { for (var _i = arr[Symbol.iterator](), _s; !(_n = (_s = _i.next()).done); _n = true) { _arr.push(_s.value); if (i && _arr.length === i) break; } } catch (err) { _d = true; _e = err; } finally { try { if (!_n && _i["return"] != null) _i["return"](); } finally { if (_d) throw _e; } } return _arr; }

function _arrayWithHoles(arr) { if (Array.isArray(arr)) return arr; }

// enable use hook with observable
_observable.default.useHook(true);

var transform = _observable.default.transform,
    input = _observable.default.input; // for the sake of clarity purpose and
// modernizing observable interface.
// useReducer/useState refer to observable
// and function the same way. When added
// second argument, it will assume the 1st
// value as the reducer aggregator, while the
// the 2nd as the initial value for the reducer

var useReducer = _observable.default;
var useState = _observable.default;

var app = function app() {
  var _useReducer = useReducer(_todoReducer.todoReducer, _todoReducer.initialTodo),
      _useReducer2 = _slicedToArray(_useReducer, 2),
      state = _useReducer2[0],
      dispatch = _useReducer2[1];

  var _useReducer3 = useReducer(_filterReducer.filterReducer, _filterReducer.initialFilter),
      _useReducer4 = _slicedToArray(_useReducer3, 2),
      filter = _useReducer4[0],
      dispatchFilter = _useReducer4[1];

  var _useState = useState(_utils.SHOW_ALL),
      _useState2 = _slicedToArray(_useState, 2),
      showFilter = _useState2[0],
      setShowFilter = _useState2[1];

  filter(function (filter) {
    var _ref = filter.find(function (_ref2) {
      var selected = _ref2.selected;
      return selected;
    }) || {},
        _ref$name = _ref.name,
        name = _ref$name === void 0 ? _utils.SHOW_ALL : _ref$name;

    setShowFilter(name);
  }); // when accessing an observable value pass closing bracket '()'
  // but this does not apply in hyperscript, since hyperscript will
  // resolve the observable directly or using binding, transform, 
  // compute etc++

  var _useState3 = useState(state().todos),
      _useState4 = _slicedToArray(_useState3, 2),
      todos = _useState4[0],
      setTodos = _useState4[1];

  var toggleAll = (0, _hyperscript.default)('input.toggle-all#toggle-all', {
    type: 'checkbox',
    onclick: function onclick() {
      return dispatch({
        action: 'completeAll'
      });
    }
  }); // bind the toggle all to a handler observable

  var handler = input(toggleAll, 'checked', 'change'); // assigning function to an observable. This
  // pretty much how useEffect/useLayoutEffect
  // behave instead it attach directly to the
  // observable, and guess what it's anagram for
  // observable all along ironically

  state(function (state) {
    setTodos(state.todos); // if all todos is checked, toggle it

    handler(state.isChecked);
  });

  var useTodos = function useTodos(name, todos) {
    return todos.filter(function (t) {
      if (name === _utils.SHOW_ACTIVE) {
        return !t.completed;
      } else if (name === _utils.SHOW_COMPLETE) {
        return t.completed;
      } else {
        return t;
      }
    });
  };

  return (0, _hyperscript.default)('section.todoapp', (0, _header.header)({
    dispatch: dispatch
  }), transform(todos, function (todos) {
    return todos.length ? (0, _hyperscript.default)('section.main', toggleAll, (0, _hyperscript.default)('label ', {
      attrs: {
        for: 'toggle-all'
      }
    }, 'Mark all as complete'), transform(showFilter, function (show) {
      return (0, _todo.todo)({
        todos: useTodos(show, todos),
        dispatch: dispatch
      });
    })) : null;
  }), transform(state, function (_ref3) {
    var todos = _ref3.todos,
        count = _ref3.count,
        plural = _ref3.plural,
        clearToggle = _ref3.clearToggle;
    return (0, _todoFooter.todoFooter)({
      show: todos.length,
      count: count,
      plural: plural,
      clearToggle: clearToggle,
      showFilter: showFilter,
      filter: filter,
      dispatchFilter: dispatchFilter,
      clearCompleted: function clearCompleted() {
        return dispatch({
          action: 'clearComplete'
        });
      }
    });
  }));
};

exports.app = app;
},{"hyperscript":"../node_modules/hyperscript/index.js","observable":"../node_modules/observable/index.js","./reducers/todoReducer":"app/reducers/todoReducer.js","./reducers/filterReducer":"app/reducers/filterReducer.js","./header":"app/header.js","./todo":"app/todo.js","./todoFooter":"app/todoFooter.js","./utils":"app/utils.js"}],"index.js":[function(require,module,exports) {
"use strict";

var _hyperscript = _interopRequireDefault(require("hyperscript"));

var _todoapp = require("./app/todoapp");

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var root = document.getElementById('app'); // currently just rerender everything which is not efficient
// should go thorough diffing/patching on subsequent update

root.appendChild((0, _todoapp.app)());
var footer = (0, _hyperscript.default)('footer.info', (0, _hyperscript.default)('p', 'Double-click to edit a todo'), (0, _hyperscript.default)('p', 'Created by ', (0, _hyperscript.default)('a', {
  href: 'https://github.com/syarul'
}, 'Shahrul Nizam Selamat')), (0, _hyperscript.default)('p', 'Part of ', (0, _hyperscript.default)('a', {
  href: 'http://todomvc.com'
}, 'TodoMVC'))); // footer is static so don't bother diffing this

root.appendChild(footer);
},{"hyperscript":"../node_modules/hyperscript/index.js","./app/todoapp":"app/todoapp.js"}],"../../../AppData/Local/Yarn/Data/global/node_modules/parcel-bundler/src/builtins/hmr-runtime.js":[function(require,module,exports) {
var global = arguments[3];
var OVERLAY_ID = '__parcel__error__overlay__';
var OldModule = module.bundle.Module;

function Module(moduleName) {
  OldModule.call(this, moduleName);
  this.hot = {
    data: module.bundle.hotData,
    _acceptCallbacks: [],
    _disposeCallbacks: [],
    accept: function (fn) {
      this._acceptCallbacks.push(fn || function () {});
    },
    dispose: function (fn) {
      this._disposeCallbacks.push(fn);
    }
  };
  module.bundle.hotData = null;
}

module.bundle.Module = Module;
var checkedAssets, assetsToAccept;
var parent = module.bundle.parent;

if ((!parent || !parent.isParcelRequire) && typeof WebSocket !== 'undefined') {
  var hostname = "" || location.hostname;
  var protocol = location.protocol === 'https:' ? 'wss' : 'ws';
  var ws = new WebSocket(protocol + '://' + hostname + ':' + "60375" + '/');

  ws.onmessage = function (event) {
    checkedAssets = {};
    assetsToAccept = [];
    var data = JSON.parse(event.data);

    if (data.type === 'update') {
      var handled = false;
      data.assets.forEach(function (asset) {
        if (!asset.isNew) {
          var didAccept = hmrAcceptCheck(global.parcelRequire, asset.id);

          if (didAccept) {
            handled = true;
          }
        }
      }); // Enable HMR for CSS by default.

      handled = handled || data.assets.every(function (asset) {
        return asset.type === 'css' && asset.generated.js;
      });

      if (handled) {
        console.clear();
        data.assets.forEach(function (asset) {
          hmrApply(global.parcelRequire, asset);
        });
        assetsToAccept.forEach(function (v) {
          hmrAcceptRun(v[0], v[1]);
        });
      } else if (location.reload) {
        // `location` global exists in a web worker context but lacks `.reload()` function.
        location.reload();
      }
    }

    if (data.type === 'reload') {
      ws.close();

      ws.onclose = function () {
        location.reload();
      };
    }

    if (data.type === 'error-resolved') {
      console.log('[parcel] ✨ Error resolved');
      removeErrorOverlay();
    }

    if (data.type === 'error') {
      console.error('[parcel] 🚨  ' + data.error.message + '\n' + data.error.stack);
      removeErrorOverlay();
      var overlay = createErrorOverlay(data);
      document.body.appendChild(overlay);
    }
  };
}

function removeErrorOverlay() {
  var overlay = document.getElementById(OVERLAY_ID);

  if (overlay) {
    overlay.remove();
  }
}

function createErrorOverlay(data) {
  var overlay = document.createElement('div');
  overlay.id = OVERLAY_ID; // html encode message and stack trace

  var message = document.createElement('div');
  var stackTrace = document.createElement('pre');
  message.innerText = data.error.message;
  stackTrace.innerText = data.error.stack;
  overlay.innerHTML = '<div style="background: black; font-size: 16px; color: white; position: fixed; height: 100%; width: 100%; top: 0px; left: 0px; padding: 30px; opacity: 0.85; font-family: Menlo, Consolas, monospace; z-index: 9999;">' + '<span style="background: red; padding: 2px 4px; border-radius: 2px;">ERROR</span>' + '<span style="top: 2px; margin-left: 5px; position: relative;">🚨</span>' + '<div style="font-size: 18px; font-weight: bold; margin-top: 20px;">' + message.innerHTML + '</div>' + '<pre>' + stackTrace.innerHTML + '</pre>' + '</div>';
  return overlay;
}

function getParents(bundle, id) {
  var modules = bundle.modules;

  if (!modules) {
    return [];
  }

  var parents = [];
  var k, d, dep;

  for (k in modules) {
    for (d in modules[k][1]) {
      dep = modules[k][1][d];

      if (dep === id || Array.isArray(dep) && dep[dep.length - 1] === id) {
        parents.push(k);
      }
    }
  }

  if (bundle.parent) {
    parents = parents.concat(getParents(bundle.parent, id));
  }

  return parents;
}

function hmrApply(bundle, asset) {
  var modules = bundle.modules;

  if (!modules) {
    return;
  }

  if (modules[asset.id] || !bundle.parent) {
    var fn = new Function('require', 'module', 'exports', asset.generated.js);
    asset.isNew = !modules[asset.id];
    modules[asset.id] = [fn, asset.deps];
  } else if (bundle.parent) {
    hmrApply(bundle.parent, asset);
  }
}

function hmrAcceptCheck(bundle, id) {
  var modules = bundle.modules;

  if (!modules) {
    return;
  }

  if (!modules[id] && bundle.parent) {
    return hmrAcceptCheck(bundle.parent, id);
  }

  if (checkedAssets[id]) {
    return;
  }

  checkedAssets[id] = true;
  var cached = bundle.cache[id];
  assetsToAccept.push([bundle, id]);

  if (cached && cached.hot && cached.hot._acceptCallbacks.length) {
    return true;
  }

  return getParents(global.parcelRequire, id).some(function (id) {
    return hmrAcceptCheck(global.parcelRequire, id);
  });
}

function hmrAcceptRun(bundle, id) {
  var cached = bundle.cache[id];
  bundle.hotData = {};

  if (cached) {
    cached.hot.data = bundle.hotData;
  }

  if (cached && cached.hot && cached.hot._disposeCallbacks.length) {
    cached.hot._disposeCallbacks.forEach(function (cb) {
      cb(bundle.hotData);
    });
  }

  delete bundle.cache[id];
  bundle(id);
  cached = bundle.cache[id];

  if (cached && cached.hot && cached.hot._acceptCallbacks.length) {
    cached.hot._acceptCallbacks.forEach(function (cb) {
      cb();
    });

    return true;
  }
}
},{}]},{},["../../../AppData/Local/Yarn/Data/global/node_modules/parcel-bundler/src/builtins/hmr-runtime.js","index.js"], null)
//# sourceMappingURL=/todoMVC.e31bb0bc.js.map