(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
module.exports = function (argv) {
  var cop = function (v) {
    var o = {}
    if (typeof v !== 'object') {
      o.copy = v
      return o.copy
    } else {
      for (var attr in v) {
        o[attr] = v[attr]
      }
    }
    return o
  }
  return Array.isArray(argv) ? argv.map(function (v) { return v }) : cop(argv)
}

},{}],2:[function(require,module,exports){
var copy = require('./copy')
var tag = require('./tag')
var tmplHandler = require('./tmplHandler')
var tmplStylesHandler = require('./tmplStylesHandler')
var tmplClassHandler = require('./tmplClassHandler')
var tmplAttrHandler = require('./tmplAttrHandler')
var processEvent = require('./processEvent')
var selector = require('./utils').selector
var strInterpreter = require('./strInterpreter')
var nodesVisibility = require('./nodesVisibility')
var sum = require('hash-sum')
var setDOM = require('set-dom')

var updateContext = function () {
  var self = this
  var ele
  var newElem
  var args = [].slice.call(arguments)
  if (typeof this.base === 'object') {
    Object.keys(this.base).map(function (handlerKey) {
      var id = self.base[handlerKey]['keet-id']
      ele = selector(id)
      if (!ele && typeof self.base[handlerKey] === 'string') {
        ele = document.getElementById(self.el)
      }
      newElem = genElement.apply(self, [self.base[handlerKey]].concat(args))
      if (self.base.hasOwnProperty('template')) {
        newElem.id = self.el
      }
      setDOM(ele, newElem)
    })
  } else {
    ele = document.getElementById(self.el)
    if (ele) {
      newElem = genElement.apply(self, [self.base].concat(args))
      newElem.id = self.el
      setDOM(ele, newElem)
    }
  }

  // virtual Nodes rendering resolver
  if(this.__virtualNodes__) {
    this.__virtualNodes__.map(function(vNode) {
      vNode.flush().render()
    })
  }
}

var nextState = function (i, args) {
  var self = this
  if (i < this.__stateList__.length) {
    var state = this.__stateList__[i]
    var value = this[state]
    // if value is undefined, likely has object notation we convert it to array
    if (value === undefined) value = strInterpreter(state)

    if (value && Array.isArray(value)) {
      // using split object notation as base for state update
      var inVal = this[value[0]][value[1]]
      Object.defineProperty(this[value[0]], value[1], {
        enumerable: false,
        configurable: true,
        get: function () {
          return inVal
        },
        set: function (val) {
          inVal = val
          updateContext.apply(self, args)
        }
      })
    } else {
      // handle parent state update if the state is not an object
      Object.defineProperty(this, state, {
        enumerable: false,
        configurable: true,
        get: function () {
          return value
        },
        set: function (val) {
          value = val
          updateContext.apply(self, args)
        }
      })
    }
    i++
    nextState.apply(this, [ i, args ])
  } else {
    //
  }
}

var setState = function (args) {
  nextState.apply(this, [ 0, args ])
}

var updateStateList = function (state) {
  this.__stateList__ = this.__stateList__.concat(state)
}

var genElement = function () {
  var child = [].shift.call(arguments)
  var args = [].slice.call(arguments)

  var tempDiv = document.createElement('div')
  var cloneChild = copy(child)
  delete cloneChild.template
  delete cloneChild.tag
  delete cloneChild.style
  delete cloneChild.class
  // process template if has handlebars value
  this.__stateList__ = []

  var tpl = child.template
    ? tmplHandler.call(this, child.template, updateStateList.bind(this))
    : typeof child === 'string' ? tmplHandler.call(this, child, updateStateList.bind(this)) : null
  // process styles if has handlebars value
  var styleTpl = tmplStylesHandler.call(this, child.style, updateStateList.bind(this))
  // process classes if has handlebars value
  var classTpl = tmplClassHandler.call(this, child, updateStateList.bind(this))
  if (classTpl) cloneChild.class = classTpl
  // custom attributes handler
  if (args && args.length) {
    tmplAttrHandler.apply(this, [ cloneChild ].concat(args))
  }

  var s = child.tag
    ? tag(child.tag, // html tag
      tpl || '', // nodeValue
      cloneChild, // attributes including classes
      styleTpl // inline styles
    ) : tpl // fallback if non exist, render the template as string

  s = nodesVisibility.call(this, s)
  tempDiv.innerHTML = s
  tempDiv.childNodes.forEach(function (c) {
    if (c.nodeType === 1) {
      c.setAttribute('data-checksum', sum(c.outerHTML))
    }
  })
  if (child.tag === 'input') {
    if (cloneChild.checked) {
      tempDiv.childNodes[0].setAttribute('checked', '')
    } else {
      tempDiv.childNodes[0].removeAttribute('checked')
    }
  }

  setState.call(this, args)

  processEvent.call(this, tempDiv)
  return typeof child === 'string'
    ? tempDiv
    : child.tag ? tempDiv.childNodes[0]
      : tempDiv
}

exports.genElement = genElement
exports.setState = setState
exports.updateStateList = updateStateList

},{"./copy":1,"./nodesVisibility":4,"./processEvent":6,"./strInterpreter":7,"./tag":8,"./tmplAttrHandler":9,"./tmplClassHandler":10,"./tmplHandler":11,"./tmplStylesHandler":12,"./utils":13,"hash-sum":15,"set-dom":16}],3:[function(require,module,exports){
var processEvent = require('./processEvent')

var tmpl = ''

function next (i, obj, arrProps, args) {
  if (i < arrProps.length) {
    var rep = arrProps[i].replace(/{{([^{}]+)}}/g, '$1')
    tmpl = tmpl.replace(/{{([^{}]+)}}/, obj[rep])
    if (args && ~args.indexOf(rep) && !obj[rep]) {
      var re = new RegExp(' ' + rep + '="' + obj[rep] + '"', 'g')
      tmpl = tmpl.replace(re, '')
    }
    i++
    next(i, obj, arrProps, args)
  } else {

  }
}

module.exports = function (obj) {
  var args = this.args
  var arrProps = this.base.template.match(/{{([^{}]+)}}/g)
  var tempDiv
  tmpl = this.base.template
  next(0, obj, arrProps, args)
  tempDiv = document.createElement('div')
  tempDiv.innerHTML = tmpl
  var isevt = / k-/.test(tmpl)
  if (isevt) { processEvent.call(this, tempDiv) }
  tempDiv.childNodes[0].setAttribute('keet-id', obj['keet-id'])
  return tempDiv.childNodes[0]
}

},{"./processEvent":6}],4:[function(require,module,exports){
module.exports = function (string) {
  var self = this
  this.__stateList__.map(function (state) {
    if (!self[state]) {
      var f = '\\{\\{\\?' + state + '\\}\\}'
      var b = '\\{\\{\\/' + state + '\\}\\}'
      // var regx = '(?<=' + f + ')(.*?)(?=' + b + ')'
      // ** old browser does not support positive look behind **
      var regx = '(' + f + ')(.*?)(?=' + b + ')'
      var re = new RegExp(regx)
      var isConditional = re.test(string)
      var match = string.match(re)
      if (isConditional && match) {
        string = string.replace(match[2], '')
      }
    }
    string = string.replace('{{?' + state + '}}', '')
    string = string.replace('{{/' + state + '}}', '')
  })
  return string
}

},{}],5:[function(require,module,exports){
var genElement = require('./genElement').genElement
var setState = require('./genElement').setState
var tmplHandler = require('./tmplHandler')
var processEvent = require('./processEvent')
var genId = require('./utils').genId
var genTemplate = require('./genTemplate')
var nodesVisibility = require('./nodesVisibility')
var sum = require('hash-sum')

module.exports = function () {
  var self = this
  var elemArr = []
  var args = [].slice.call(arguments)
  if (Array.isArray(this.base.model)) {
    // do array base
    this.base.template = this.base.template.trim().replace(/\s+/g, ' ')

    // generate id for selector
    this.base.model = this.base.model.map(function (m) {
      m['keet-id'] = genId()
      return m
    })
    this.base.model.map(function (m) {
      elemArr.push(genTemplate.call(self, m))
    })
  } else if (typeof this.base === 'object') {
    // do object base
    Object.keys(this.base).map(function (key) {
      var child = self.base[key]
      if (child && typeof child === 'object') {
        var id = genId()
        child['keet-id'] = id
        self.base[key]['keet-id'] = id
        var newElement = genElement.apply(self, [child].concat(args))
        elemArr.push(newElement)
      } else {
        self.__stateList__ = []
        var tpl = tmplHandler.call(self, child, function (state) {
          self.__stateList__ = self.__stateList__.concat(state)
        })
        tpl = nodesVisibility.call(self, tpl)
        var tempDiv = document.createElement('div')
        tempDiv.innerHTML = tpl
        setState.call(self, args)
        processEvent.call(self, tempDiv)
        tempDiv.childNodes.forEach(function (c) {
          if (c.nodeType === 1) {
            c.setAttribute('data-checksum', sum(c.outerHTML))
          }
          elemArr.push(c)
        })
      }
    })
  } else if (typeof this.base === 'string') {
    this.__stateList__ = []
    var tpl = tmplHandler.call(this, this.base, function (state) {
      self.__stateList__ = self.__stateList__.concat(state)
    })

    tpl = nodesVisibility.call(this, tpl)
    var tempDiv = document.createElement('div')
    tempDiv.innerHTML = tpl
    setState.call(this, args)
    processEvent.call(this, tempDiv)

    tempDiv.childNodes.forEach(function (c) {
      if (c.nodeType === 1) {
        c.setAttribute('data-checksum', sum(c.outerHTML))
      }
      elemArr.push(c)
    })
  }

  return elemArr
}

},{"./genElement":2,"./genTemplate":3,"./nodesVisibility":4,"./processEvent":6,"./tmplHandler":11,"./utils":13,"hash-sum":15}],6:[function(require,module,exports){
var loopChilds = require('./utils').loopChilds

var next = function (i, c, rem) {
  var hask
  var evtName
  var evthandler
  var handler
  var isHandler
  var argv
  var v
  var atts = c.attributes

  if (i < atts.length) {
    hask = /^k-/.test(atts[i].nodeName)
    if (hask) {
      evtName = atts[i].nodeName.split('-')[1]
      evthandler = atts[i].nodeValue
      handler = evthandler.split('(')
      isHandler = this[handler[0]]
      if (typeof isHandler === 'function') {
        rem.push(atts[i].nodeName)
        argv = []
        v = handler[1].slice(0, -1).split(',').filter(function (f) { return f !== '' })
        if (v.length) v.map(function (v) { argv.push(v) })
        c.addEventListener(evtName, isHandler.bind.apply(isHandler.bind(this), [c].concat(argv)), false)
      }
    }
    i++
    next.apply(this, [ i, c, rem ])
  } else {
    rem.map(function (f) { c.removeAttribute(f) })
  }
}

module.exports = function (kNode) {
  var self = this
  var listKnodeChild = []
  var rem = []
  loopChilds(listKnodeChild, kNode)
  listKnodeChild.map(function (c) {
    if (c.nodeType === 1 && c.hasAttributes()) {
      next.apply(self, [ 0, c, rem ])
    }
  })
  listKnodeChild = []
}

},{"./utils":13}],7:[function(require,module,exports){
module.exports = function (str) {
  var res = str.match(/\.*\./g)
  var result
  if (res && res.length > 0) {
    return str.split('.')
  }
  return result
}

},{}],8:[function(require,module,exports){
function ktag () {
  var args = [].slice.call(arguments)
  var attr
  var idx
  var te
  var ret = ['<', args[0], '>', args[1], '</', args[0], '>']
  if (args.length > 2 && typeof args[2] === 'object') {
    for (attr in args[2]) {
      if (typeof args[2][attr] === 'boolean' && args[2][attr]) {
        ret.splice(2, 0, ' ', attr)
      } else if (attr === 'class' && Array.isArray(args[2][attr])) {
        ret.splice(2, 0, ' ', attr, '="', args[2][attr].join(' ').trim(), '"')
      } else {
        ret.splice(2, 0, ' ', attr, '="', args[2][attr], '"')
      }
    }
  }
  if (args.length > 3 && typeof args[3] === 'object') {
    idx = ret.indexOf('>')
    te = [idx, 0, ' style="']
    for (attr in args[3]) {
      te.push(attr)
      te.push(':')
      te.push(args[3][attr])
      te.push(';')
    }
    te.push('"')
    ret.splice.apply(ret, te)
  }
  return ret
}

module.exports = function () {
  return ktag.apply(null, arguments).join('')
}

},{}],9:[function(require,module,exports){
var genElement = require('./genElement')
module.exports = function () {
  var self = this
  var cloneChild = [].shift.call(arguments)
  Object.keys(cloneChild).map(function (c) {
    var hdl = cloneChild[c].match(/{{([^{}]+)}}/g)
    if (hdl && hdl.length) {
      var str = ''
      hdl.map(function (s) {
        var rep = s.replace(/{{([^{}]+)}}/g, '$1')
        if (self[rep] !== undefined) {
          genElement.updateStateList.call(self, rep)
          if (self[rep] === false) {
            delete cloneChild[c]
          } else {
            str += self[rep]
            cloneChild[c] = str
          }
        }
      })
    }
  })
}

},{"./genElement":2}],10:[function(require,module,exports){
module.exports = function (child, updateStateList) {
  var self = this
  if (child.class) {
    var c = child.class.match(/{{([^{}]+)}}/g)
    var classStr = ''
    if (c && c.length) {
      c.map(function (s) {
        var rep = s.replace(/{{([^{}]+)}}/g, '$1')
        if (self[rep] !== undefined) {
          updateStateList(rep)
          self[rep].cstore.map(function (c) {
            classStr += c + ' '
          })
        }
      })
    }
    return classStr.length ? classStr.trim() : child.class
  }
  return false
}

},{}],11:[function(require,module,exports){
var strInterpreter = require('./strInterpreter')

module.exports = function (str, updateStateList) {
  var self = this
  var arrProps = str.match(/{{([^{}]+)}}/g)
  if (arrProps && arrProps.length) {
    arrProps.map(function (s) {
      var rep = s.replace(/{{([^{}]+)}}/g, '$1')
      var isObjectNotation = strInterpreter(rep)
      if (!isObjectNotation) {
        if (self[rep] !== undefined) {
          updateStateList(rep)
          str = str.replace('{{'+rep+'}}', self[rep])
        }
      } else {
        updateStateList(rep)
        str = str.replace('{{'+rep+'}}', self[isObjectNotation[0]][isObjectNotation[1]])
      }
      if (rep.match(/^\?/g)) {
        updateStateList(rep.replace('?', ''))
      }
    })
  }
  return str
}


},{"./strInterpreter":7}],12:[function(require,module,exports){
var copy = require('./copy')

module.exports = function (styles, updateStateList) {
  var self = this
  var copyStyles = copy(styles)
  if (styles) {
    Object.keys(copyStyles).map(function (style) {
      var arrProps = copyStyles[style].match(/{{([^{}]+)}}/g)
      if (arrProps && arrProps.length) {
        arrProps.map(function (s) {
          var rep = s.replace(/{{([^{}]+)}}/g, '$1')
          if (self[rep] !== undefined) {
            updateStateList(rep)
            copyStyles[style] = copyStyles[style].replace(/{{([^{}]+)}}/, self[rep])
          }
        })
      }
    })
  }
  return copyStyles
}

},{"./copy":1}],13:[function(require,module,exports){
exports.getId = function (id) {
  return document.getElementById(id)
}

exports.genId = function () {
  return (Math.round(Math.random() * 0x1 * 1e12)).toString(32)
}

exports.selector = function (id) {
  return document.querySelector('[keet-id="' + id + '"]')
}

var loopChilds = function (arr, elem) {
  for (var child = elem.firstChild; child !== null; child = child.nextSibling) {
    arr.push(child)
    if (child.hasChildNodes()) {
      loopChilds(arr, child)
    }
  }
}

exports.loopChilds = loopChilds

},{}],14:[function(require,module,exports){
'use strict'
/**
 * Keetjs v3.5.1 Alpha release: https://github.com/keetjs/keet.js
 * Minimalist view layer for the web
 *
 * <<<<<<<<<<<<<<<<<<<<<<<<<<<<<< Keetjs >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
 *
 * Copyright 2018, Shahrul Nizam Selamat
 * Released under the MIT License.
 */

var getId = require('./components/utils').getId
var genId = require('./components/utils').genId
var selector = require('./components/utils').selector
var parseStr = require('./components/parseStr')
var genTemplate = require('./components/genTemplate')
var setDOM = require('set-dom')

/**
 * @private
 * @description
 * Loop render all initially parsed html entities to 
 * target DOM node id.
 *
 * @param {Int} i - The index of html entity.
 * @param {Node} ele - The target DOM node.
 * @param {Node} els - The list of html entities.
 */
var next = function (i, ele, els) {
  var self = this
  if (i < els.length) {
    if (!ele.childNodes[i]) ele.appendChild(els[i])
    i++
    next.apply(this, [ i, ele, els ])
  } else {
    // Once intial render already in place consecutively
    // watch the object in Components.prototype.base. Add 
    // additional object props or delete existing object 
    // props, which will reflect in the component rendered 
    // elements.
    var watchObject = function (obj) {
      return new Proxy(obj, {
        set: function (target, key, value) {
          target[key] = value
          self.base[key] = target[key]
          return true
        },
        deleteProperty: function (target, key) {
          var id = target[key]['keet-id']
          var el = selector(id)
          el && el.remove()
          delete self.base[key]
          return true
        }
      })
    }

    // virtual Nodes rendering resolver
    if(this.__virtualNodes__) {
      this.__virtualNodes__.map(function(vNode) {
        vNode.flush().render()
      })
    }

    // only javascript objects is watchable
    if (typeof this.base === 'object') { this.baseProxy = watchObject(this.base) }

    // since component already rendered, trigger its life-cycle method
    if (this.componentDidMount && typeof this.componentDidMount === 'function') {
      this.componentDidMount()
    }
  }
}

/**
 * @description
 * The main constructor of Keet
 *
 * @param {String | arg0[, arg1[, arg2[, ...]]]} arguments - Custom property names
 * i.e using 'checked' for input elements.
 * Usage :-
 *    const App extends Keet {
 *      constructor(...args) {
 *        super()
 *        this.args = args
 *      }
 *    }
 *    const app = new App('checked')
 * for example usage cases see https://github.com/syarul/keet/blob/master/examples/check.js
 */
function Keet () {
  // prepare the store for states, this is the internal state-management for the
  // components. Personally I never get to like state-management in javascript.
  // The idea might sound devine but you'll stuck in very complicated get-to-master
  // this framework/flow cycles where you always write the state in some external 
  // store and write long logics to do small stuffs and they are very slow. On the 
  // other hand, this internal store is relatively simple, has referance and 
  // across multiple components able to share the state in any case.
  Object.defineProperty(this, '__stateList__', {
    enumerable: false,
    writable: true
  })
  Object.defineProperty(this, '__virtualNodes__', {
    enumerable: false,
    writable: true
  })
}

Keet.prototype.mount = function (instance) {
  // Before we begin to parse an instance, do a run-down checks
  // to clean up backtick string which usually has line spacing
  if (typeof instance === 'object') {
    Object.keys(instance).map(function (key) {
      if (typeof instance[key] === 'string') {
        instance[key] = instance[key].trim().replace(/\s+/g, ' ')
      } else if (typeof instance[key] === 'object' && typeof instance[key]['template'] === 'string') {
        instance[key]['template'] = instance[key]['template'].trim().replace(/\s+/g, ' ')
      }
    })
  } else if (typeof instance === 'string') {
    instance = instance.trim().replace(/\s+/g, ' ')
  }
  // we store the pristine instance in Component.base
  this.base = instance
  return this
}

Keet.prototype.flush = function (instance) {
  // Custom method to clean up the component DOM tree
  // usefull if we need to do clean up rerender
  var ele = getId(this.el)
  if (ele) ele.innerHTML = ''
  return this
}

Keet.prototype.link = function (id) {
  // The target DOM where the rendering will took place.
  // We could also apply lifeCycle method before the
  // render happen
  this.el = this.el || id
  if (this.componentWillMount && typeof this.componentWillMount === 'function') {
    this.componentWillMount()
  }
  this.render()
  return this
}

Keet.prototype.render = function () {
  // Render this component to the target DOM
  var ele = getId(this.el)
  var els = parseStr.apply(this, this.args)
  if (ele) {
    next.apply(this, [ 0, ele, els ])
  }
  return this
}

Keet.prototype.cluster = function () {
  // Chain method to run external function(s), this basically serve
  // as initializer for all child components within the instance tree
  var args = [].slice.call(arguments)
  if (args.length > 0) {
    args.map(function (f) {
      if (typeof f === 'function') f()
    })
  }
}

Keet.prototype.add = function (obj) {
  // Method to add a new object to component model
  var ele = getId(this.el)
  obj['keet-id'] = genId()
  this.base.model = this.base.model.concat(obj)
  ele.appendChild(genTemplate.call(this, obj))
}

Keet.prototype.destroy = function (id, attr) {
  // Method to destroy a submodel of a component
  this.base.model = this.base.model.filter(function (obj, index) {
    if (id === obj[attr]) {
      var node = selector(obj['keet-id'])
      if (node) node.remove()
    } else { return obj }
  })
}

Keet.prototype.update = function (id, attr, newAttr) {
  // Method to update a submodel of a component
  var self = this
  this.base.model = this.base.model.map(function (obj, idx, model) {
    if (id === obj[attr]) {
      if (newAttr && typeof newAttr === 'object') {
        Object.assign(obj, newAttr)
      }
      var node = selector(obj['keet-id'])
      if (node) setDOM(node, genTemplate.call(self, obj))
    }
    return obj
  })
}

Keet.prototype.register = function () {
  this.__virtualNodes__ = [].slice.call(arguments)
  return this
}

module.exports = Keet

},{"./components/genTemplate":3,"./components/parseStr":5,"./components/utils":13,"set-dom":16}],15:[function(require,module,exports){
'use strict';

function pad (hash, len) {
  while (hash.length < len) {
    hash = '0' + hash;
  }
  return hash;
}

function fold (hash, text) {
  var i;
  var chr;
  var len;
  if (text.length === 0) {
    return hash;
  }
  for (i = 0, len = text.length; i < len; i++) {
    chr = text.charCodeAt(i);
    hash = ((hash << 5) - hash) + chr;
    hash |= 0;
  }
  return hash < 0 ? hash * -2 : hash;
}

function foldObject (hash, o, seen) {
  return Object.keys(o).sort().reduce(foldKey, hash);
  function foldKey (hash, key) {
    return foldValue(hash, o[key], key, seen);
  }
}

function foldValue (input, value, key, seen) {
  var hash = fold(fold(fold(input, key), toString(value)), typeof value);
  if (value === null) {
    return fold(hash, 'null');
  }
  if (value === undefined) {
    return fold(hash, 'undefined');
  }
  if (typeof value === 'object') {
    if (seen.indexOf(value) !== -1) {
      return fold(hash, '[Circular]' + key);
    }
    seen.push(value);
    return foldObject(hash, value, seen);
  }
  return fold(hash, value.toString());
}

function toString (o) {
  return Object.prototype.toString.call(o);
}

function sum (o) {
  return pad(foldValue(0, o, '', []).toString(16), 8);
}

module.exports = sum;

},{}],16:[function(require,module,exports){
'use strict'

setDOM.KEY = 'data-key'
setDOM.IGNORE = 'data-ignore'
setDOM.CHECKSUM = 'data-checksum'
var parseHTML = require('./parse-html')
var KEY_PREFIX = '_set-dom-'
var NODE_MOUNTED = KEY_PREFIX + 'mounted'
var ELEMENT_TYPE = 1
var DOCUMENT_TYPE = 9
var DOCUMENT_FRAGMENT_TYPE = 11

// Expose api.
module.exports = setDOM

/**
 * @description
 * Updates existing dom to match a new dom.
 *
 * @param {Node} oldNode - The html entity to update.
 * @param {String|Node} newNode - The updated html(entity).
 */
function setDOM (oldNode, newNode) {
  // Ensure a realish dom node is provided.
  assert(oldNode && oldNode.nodeType, 'You must provide a valid node to update.')

  // Alias document element with document.
  if (oldNode.nodeType === DOCUMENT_TYPE) oldNode = oldNode.documentElement

  // Document Fragments don't have attributes, so no need to look at checksums, ignored, attributes, or node replacement.
  if (newNode.nodeType === DOCUMENT_FRAGMENT_TYPE) {
    // Simply update all children (and subchildren).
    setChildNodes(oldNode, newNode)
  } else {
    // Otherwise we diff the entire old node.
    setNode(oldNode, typeof newNode === 'string'
      // If a string was provided we will parse it as dom.
      ? parseHTML(newNode, oldNode.nodeName)
      : newNode
    )
  }

  // Trigger mount events on initial set.
  if (!oldNode[NODE_MOUNTED]) {
    oldNode[NODE_MOUNTED] = true
    mount(oldNode)
  }
}

/**
 * @private
 * @description
 * Updates a specific htmlNode and does whatever it takes to convert it to another one.
 *
 * @param {Node} oldNode - The previous HTMLNode.
 * @param {Node} newNode - The updated HTMLNode.
 */
function setNode (oldNode, newNode) {
  if (oldNode.nodeType === newNode.nodeType) {
    // Handle regular element node updates.
    if (oldNode.nodeType === ELEMENT_TYPE) {
      // Checks if nodes are equal before diffing.
      if (isEqualNode(oldNode, newNode)) return

      // Update all children (and subchildren).
      setChildNodes(oldNode, newNode)

      // Update the elements attributes / tagName.
      if (oldNode.nodeName === newNode.nodeName) {
        // If we have the same nodename then we can directly update the attributes.
        setAttributes(oldNode.attributes, newNode.attributes)
      } else {
        // Otherwise clone the new node to use as the existing node.
        var newPrev = newNode.cloneNode()
        // Copy over all existing children from the original node.
        while (oldNode.firstChild) newPrev.appendChild(oldNode.firstChild)
        // Replace the original node with the new one with the right tag.
        oldNode.parentNode.replaceChild(newPrev, oldNode)
      }
    } else {
      // Handle other types of node updates (text/comments/etc).
      // If both are the same type of node we can update directly.
      if (oldNode.nodeValue !== newNode.nodeValue) {
        oldNode.nodeValue = newNode.nodeValue
      }
    }
  } else {
    // we have to replace the node.
    oldNode.parentNode.replaceChild(newNode, dismount(oldNode))
    mount(newNode)
  }
}

/**
 * @private
 * @description
 * Utility that will update one list of attributes to match another.
 *
 * @param {NamedNodeMap} oldAttributes - The previous attributes.
 * @param {NamedNodeMap} newAttributes - The updated attributes.
 */
function setAttributes (oldAttributes, newAttributes) {
  var i, a, b, ns, name

  // Remove old attributes.
  for (i = oldAttributes.length; i--;) {
    a = oldAttributes[i]
    ns = a.namespaceURI
    name = a.localName
    b = newAttributes.getNamedItemNS(ns, name)
    if (!b) oldAttributes.removeNamedItemNS(ns, name)
  }

  // Set new attributes.
  for (i = newAttributes.length; i--;) {
    a = newAttributes[i]
    ns = a.namespaceURI
    name = a.localName
    b = oldAttributes.getNamedItemNS(ns, name)
    if (!b) {
      // Add a new attribute.
      newAttributes.removeNamedItemNS(ns, name)
      oldAttributes.setNamedItemNS(a)
    } else if (b.value !== a.value) {
      // Update existing attribute.
      b.value = a.value
    }
  }
}

/**
 * @private
 * @description
 * Utility that will nodes childern to match another nodes children.
 *
 * @param {Node} oldParent - The existing parent node.
 * @param {Node} newParent - The new parent node.
 */
function setChildNodes (oldParent, newParent) {
  var checkOld, oldKey, checkNew, newKey, foundNode, keyedNodes
  var oldNode = oldParent.firstChild
  var newNode = newParent.firstChild
  var extra = 0

  // Extract keyed nodes from previous children and keep track of total count.
  while (oldNode) {
    extra++
    checkOld = oldNode
    oldKey = getKey(checkOld)
    oldNode = oldNode.nextSibling

    if (oldKey) {
      if (!keyedNodes) keyedNodes = {}
      keyedNodes[oldKey] = checkOld
    }
  }

  // Loop over new nodes and perform updates.
  oldNode = oldParent.firstChild
  while (newNode) {
    extra--
    checkNew = newNode
    newNode = newNode.nextSibling

    if (keyedNodes && (newKey = getKey(checkNew)) && (foundNode = keyedNodes[newKey])) {
      delete keyedNodes[newKey]
      // If we have a key and it existed before we move the previous node to the new position if needed and diff it.
      if (foundNode !== oldNode) {
        oldParent.insertBefore(foundNode, oldNode)
      } else {
        oldNode = oldNode.nextSibling
      }

      setNode(foundNode, checkNew)
    } else if (oldNode) {
      checkOld = oldNode
      oldNode = oldNode.nextSibling
      if (getKey(checkOld)) {
        // If the old child had a key we skip over it until the end.
        oldParent.insertBefore(checkNew, checkOld)
        mount(checkNew)
      } else {
        // Otherwise we diff the two non-keyed nodes.
        setNode(checkOld, checkNew)
      }
    } else {
      // Finally if there was no old node we add the new node.
      oldParent.appendChild(checkNew)
      mount(checkNew)
    }
  }

  // Remove old keyed nodes.
  for (oldKey in keyedNodes) {
    extra--
    oldParent.removeChild(dismount(keyedNodes[oldKey]))
  }

  // If we have any remaining unkeyed nodes remove them from the end.
  while (--extra >= 0) {
    oldParent.removeChild(dismount(oldParent.lastChild))
  }
}

/**
 * @private
 * @description
 * Utility to try to pull a key out of an element.
 * Uses 'data-key' if possible and falls back to 'id'.
 *
 * @param {Node} node - The node to get the key for.
 * @return {string|void}
 */
function getKey (node) {
  if (node.nodeType !== ELEMENT_TYPE) return
  var key = node.getAttribute(setDOM.KEY) || node.id
  if (key) return KEY_PREFIX + key
}

/**
 * Checks if nodes are equal using the following by checking if
 * they are both ignored, have the same checksum, or have the
 * same contents.
 *
 * @param {Node} a - One of the nodes to compare.
 * @param {Node} b - Another node to compare.
 */
function isEqualNode (a, b) {
  return (
    // Check if both nodes are ignored.
    (isIgnored(a) && isIgnored(b)) ||
    // Check if both nodes have the same checksum.
    (getCheckSum(a) === getCheckSum(b)) ||
    // Fall back to native isEqualNode check.
    a.isEqualNode(b)
  )
}

/**
 * @private
 * @description
 * Utility to try to pull a checksum attribute from an element.
 * Uses 'data-checksum' or user specified checksum property.
 *
 * @param {Node} node - The node to get the checksum for.
 * @return {string|NaN}
 */
function getCheckSum (node) {
  return node.getAttribute(setDOM.CHECKSUM) || NaN
}

/**
 * @private
 * @description
 * Utility to try to check if an element should be ignored by the algorithm.
 * Uses 'data-ignore' or user specified ignore property.
 *
 * @param {Node} node - The node to check if it should be ignored.
 * @return {boolean}
 */
function isIgnored (node) {
  return node.getAttribute(setDOM.IGNORE) != null
}

/**
 * Dispatches a mount event for the given node and children.
 *
 * @param {Node} node - the node to mount.
 * @return {node}
 */
function mount (node) {
  return dispatch(node, 'mount')
}

/**
 * Dispatches a dismount event for the given node and children.
 *
 * @param {Node} node - the node to dismount.
 * @return {node}
 */
function dismount (node) {
  return dispatch(node, 'dismount')
}

/**
 * Recursively trigger an event for a node and it's children.
 * Only emits events for keyed nodes.
 *
 * @param {Node} node - the initial node.
 * @return {Node}
 */
function dispatch (node, type) {
  // Trigger event for this element if it has a key.
  if (getKey(node)) {
    var ev = document.createEvent('Event')
    var prop = { value: node }
    ev.initEvent(type, false, false)
    Object.defineProperty(ev, 'target', prop)
    Object.defineProperty(ev, 'srcElement', prop)
    node.dispatchEvent(ev)
  }

  // Dispatch to all children.
  var child = node.firstChild
  while (child) child = dispatch(child, type).nextSibling
  return node
}

/**
 * @private
 * @description
 * Confirm that a value is truthy, throws an error message otherwise.
 *
 * @param {*} val - the val to test.
 * @param {string} msg - the error message on failure.
 * @throws {Error}
 */
function assert (val, msg) {
  if (!val) throw new Error('set-dom: ' + msg)
}

},{"./parse-html":17}],17:[function(require,module,exports){
'use strict'
var parser = window.DOMParser && new window.DOMParser()
var documentRootName = 'HTML'
var supportsHTMLType = false
var supportsInnerHTML = false
var htmlType = 'text/html'
var xhtmlType = 'application/xhtml+xml'
var testClass = 'A'
var testCode = '<wbr class="' + testClass + '"/>'

try {
  // Check if browser supports text/html DOMParser
  var parsed = parser.parseFromString(testCode, htmlType).body.firstChild
  // Some browsers (iOS 9 and Safari 9) lowercase classes for parsed elements
  // but only when appending to DOM, so use innerHTML instead
  var d = document.createElement('div')
  d.appendChild(parsed)
  if (d.firstChild.classList[0] !== testClass) throw new Error()
  supportsHTMLType = true
} catch (e) {}

var mockDoc = document.implementation.createHTMLDocument('')
var mockHTML = mockDoc.documentElement
var mockBody = mockDoc.body
try {
  // Check if browser supports documentElement.innerHTML
  mockHTML.innerHTML += ''
  supportsInnerHTML = true
} catch (e) {
  // Check if browser supports xhtml parsing.
  parser.parseFromString(testCode, xhtmlType)
  var bodyReg = /(<body[^>]*>)([\s\S]*)<\/body>/
}

function DOMParserParse (markup, rootName) {
  var doc = parser.parseFromString(markup, htmlType)
  // Patch for iOS UIWebView not always returning doc.body synchronously
  if (!doc.body) { return fallbackParse(markup, rootName) }

  return rootName === documentRootName
    ? doc.documentElement
    : doc.body.firstChild
}

function fallbackParse (markup, rootName) {
  // Fallback to innerHTML for other older browsers.
  if (rootName === documentRootName) {
    if (supportsInnerHTML) {
      mockHTML.innerHTML = markup
      return mockHTML
    } else {
      // IE9 does not support innerhtml at root level.
      // We get around this by parsing everything except the body as xhtml.
      var bodyMatch = markup.match(bodyReg)
      if (bodyMatch) {
        var bodyContent = bodyMatch[2]
        var startBody = bodyMatch.index + bodyMatch[1].length
        var endBody = startBody + bodyContent.length
        markup = markup.slice(0, startBody) + markup.slice(endBody)
        mockBody.innerHTML = bodyContent
      }

      var doc = parser.parseFromString(markup, xhtmlType)
      var body = doc.body
      while (mockBody.firstChild) body.appendChild(mockBody.firstChild)
      return doc.documentElement
    }
  } else {
    mockBody.innerHTML = markup
    return mockBody.firstChild
  }
}

/**
 * Returns the results of a DOMParser as an HTMLElement.
 * (Shims for older browsers).
 */
module.exports = supportsHTMLType
  ? DOMParserParse
  : fallbackParse

},{}],18:[function(require,module,exports){
'use strict';

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var Keet = require('../keet');

var _require = require('./util'),
    camelCase = _require.camelCase;

var _require2 = require('./util'),
    inform = _require2.inform,
    getId = _require2.getId;

// const createTodoModel = require('./todoModel')

var _require3 = require('./todo'),
    createTodoModel = _require3.createTodoModel,
    todoApp = _require3.todoApp;

var log = console.log.bind(console);

var filterPage = ['all', 'active', 'completed'];

var App = function (_Keet) {
  _inherits(App, _Keet);

  function App() {
    var _ref;

    var _temp, _this, _ret;

    _classCallCheck(this, App);

    for (var _len = arguments.length, args = Array(_len), _key = 0; _key < _len; _key++) {
      args[_key] = arguments[_key];
    }

    return _ret = (_temp = (_this = _possibleConstructorReturn(this, (_ref = App.__proto__ || Object.getPrototypeOf(App)).call.apply(_ref, [this].concat(args))), _this), _this.model = createTodoModel(_this), _this.page = 'All', _this.isChecked = '', _this.count = 0, _this.plural = '', _this.clearToggle = 'none', _temp), _possibleConstructorReturn(_this, _ret);
  }

  _createClass(App, [{
    key: 'componentWillMount',
    value: function componentWillMount() {
      var _this2 = this;

      filterPage.map(function (f) {
        return _this2['c_' + f] = '';
      });
      log(this.model);
      // this.model.subscribe( store => {
      //   let m = store.todos
      //   let c = m.filter(c => !c.completed)
      //   this.todoState = m.length ? true : false
      //   this.plural = c.length === 1 ? '' : 's'
      //   this.count = c.length
      // })
    }
  }, {
    key: 'componentDidMount',
    value: function componentDidMount() {
      var _this3 = this;

      if (window.location.hash == '') {
        this.updateUrl('#/all');
        window.history.pushState({}, null, '#/all');
      }
      window.onpopstate = function () {
        return _this3.updateUrl(window.location.hash);
      };
    }
  }, {
    key: 'updateUrl',
    value: function updateUrl(hash) {
      var _this4 = this;

      filterPage.map(function (f) {
        _this4['c_' + f] = hash.split('#/')[1] === f ? 'selected' : '';
        if (hash.split('#/')[1] === f) _this4.page = f.name;
      });
    }
  }, {
    key: 'create',
    value: function create(evt) {
      if (evt.keyCode !== 13) return;

      // let obj = {
      //   title: evt.target.value.trim(),
      //   completed: '',
      //   display: window.location.hash == '#/all' || window.location.hash == '#/active' ? 'block' : 'none',
      //   checked: false
      // }
      this.model.addTodo(evt.target.value.trim());
      evt.target.value = '';
    }
  }, {
    key: 'completeAll',
    value: function completeAll() {}
  }, {
    key: 'clearCompleted',
    value: function clearCompleted() {}
  }]);

  return App;
}(Keet);

var app = new App();

var filtersTmpl = '';

var filters = function filters(page) {
  var f = {
    className: '{{c_' + page + '}}',
    hash: '#/' + page,
    name: camelCase(page)
  };
  filtersTmpl += '<li k-click="updateUrl(' + f.hash + ')"><a class="' + f.className + '" href="' + f.hash + '">' + f.name + '</a></li>';
};

filterPage.map(function (page) {
  return filters(page);
});

var vmodel = '\n  <section id="todoapp">\n    <header id="header">\n      <h1>todos</h1>\n      <input id="new-todo" k-keydown="create()" placeholder="What needs to be done?" autofocus>\n    </header>\n    {{?todoState}}\n    <section id="main">\n      <input id="toggle-all" type="checkbox" {{isChecked}} k-click="completeAll()">\n      <label for="toggle-all">Mark all as complete</label>\n      <ul id="todo-list"></ul>\n    </section>\n    <footer id="footer">\n      <span id="todo-count">\n        <strong>{{count}}</strong> item{{plural}} left\n      </span>\n      <ul id="filters">\n        ' + filtersTmpl + '\n      </ul>\n      <button id="clear-completed" style="display: {{clearToggle}}" k-clicked="clearCompleted()">Clear completed</button>\n    </footer>\n    {{/todoState}}\n  </section>\n  <footer id="info">\n    <p>Double-click to edit a todo</p>\n    <p>Created by <a href="https://github.com/syarul">Shahrul Nizam Selamat</a></p>\n    <p>Part of <a href="http://todomvc.com">TodoMVC</a></p>\n  </footer>';

app.mount(vmodel).register(todoApp).link('todo'); //.cluster(todoInit)

// console.log(app)

module.exports = app;

},{"../keet":14,"./todo":19,"./util":20}],19:[function(require,module,exports){
'use strict';

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var Keet = require('../keet');

var _require = require('./util'),
    store = _require.store,
    inform = _require.inform;

var log = console.log.bind(console);

var main = null;

var TodoApp = function (_Keet) {
  _inherits(TodoApp, _Keet);

  function TodoApp() {
    var _ref;

    var _temp, _this, _ret;

    for (var _len = arguments.length, args = Array(_len), _key = 0; _key < _len; _key++) {
      args[_key] = arguments[_key];
    }

    _classCallCheck(this, TodoApp);

    return _ret = (_temp = (_this = _possibleConstructorReturn(this, (_ref = TodoApp.__proto__ || Object.getPrototypeOf(TodoApp)).call.apply(_ref, [this].concat(args))), _this), _this.args = [].slice.call(arguments), _this.el = 'todo-list', _this.onChanges = [], _temp), _possibleConstructorReturn(_this, _ret);
  }

  _createClass(TodoApp, [{
    key: 'editMode',
    value: function editMode(id) {
      // App.editTodos(id, this)
    }
  }, {
    key: 'todoDestroy',
    value: function todoDestroy(id, evt) {
      // this.destroy(id, 'keet-id', evt.target.parentNode.parentNode)
      // App.todoDestroy()
    }
  }, {
    key: 'completeTodo',
    value: function completeTodo(id, evt) {
      // App.todoCheck(id, 'keet-id', evt.target.parentNode.parentNode)
    }
  }, {
    key: 'addTodo',
    value: function addTodo(title) {
      this.add({
        id: genId(),
        title: title,
        completed: false
      });
      inform(main, this.base.model);
    }
  }, {
    key: 'subscribe',
    value: function subscribe(stack) {
      this.onChanges.push(stack);
    }
  }]);

  return TodoApp;
}(Keet);

log(store('todos-keetjs'));

var todoApp = new TodoApp('checked');

var vmodel = {
  template: '\n\t<li k-dblclick="editMode({{id}})" class="{{completed}}" data-id="{{id}}" style="display: {{display}}">\n\t\t<div class="view"><input k-click="completeTodo({{keet-id}})" class="toggle" type="checkbox" checked="{{checked}}">\n\t\t\t<label>{{title}}</label>\n\t\t\t<button k-click="todoDestroy({{keet-id}})" class="destroy"></button>\n\t\t</div>\n\t\t<input class="edit" value="{{title}}">\n\t</li>',
  model: store('todos-keetjs')
};

module.exports = {
  createTodoModel: function createTodoModel(app) {
    console.log(2);
    main = app;
    todoApp.mount(vmodel);
  },
  todoApp: todoApp
};

},{"../keet":14,"./util":20}],20:[function(require,module,exports){
"use strict";

exports.inform = function (base, input) {
  for (var i = base.onChanges.length; i--;) {
    base.onChanges[i](input);
  }
};

exports.store = function (namespace, data) {
  if (arguments.length > 1) {
    return localStorage.setItem(namespace, JSON.stringify(data));
  } else {
    var store = localStorage.getItem(namespace);
    return store && JSON.parse(store) || [];
  }
};

exports.camelCase = function (s) {
  return s.charAt(0).toUpperCase() + s.slice(1);
};

exports.genId = function () {
  return Math.round(Math.random() * 0x1 * 1e12).toString(32);
};

exports.getId = function (id) {
  return document.getElementById(id);
};

},{}]},{},[18])
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uL0FwcERhdGEvUm9hbWluZy9ucG0vbm9kZV9tb2R1bGVzL2Jyb3dzZXJpZnkvbm9kZV9tb2R1bGVzL2Jyb3dzZXItcGFjay9fcHJlbHVkZS5qcyIsImtlZXQvY29tcG9uZW50cy9jb3B5LmpzIiwia2VldC9jb21wb25lbnRzL2dlbkVsZW1lbnQuanMiLCJrZWV0L2NvbXBvbmVudHMvZ2VuVGVtcGxhdGUuanMiLCJrZWV0L2NvbXBvbmVudHMvbm9kZXNWaXNpYmlsaXR5LmpzIiwia2VldC9jb21wb25lbnRzL3BhcnNlU3RyLmpzIiwia2VldC9jb21wb25lbnRzL3Byb2Nlc3NFdmVudC5qcyIsImtlZXQvY29tcG9uZW50cy9zdHJJbnRlcnByZXRlci5qcyIsImtlZXQvY29tcG9uZW50cy90YWcuanMiLCJrZWV0L2NvbXBvbmVudHMvdG1wbEF0dHJIYW5kbGVyLmpzIiwia2VldC9jb21wb25lbnRzL3RtcGxDbGFzc0hhbmRsZXIuanMiLCJrZWV0L2NvbXBvbmVudHMvdG1wbEhhbmRsZXIuanMiLCJrZWV0L2NvbXBvbmVudHMvdG1wbFN0eWxlc0hhbmRsZXIuanMiLCJrZWV0L2NvbXBvbmVudHMvdXRpbHMuanMiLCJrZWV0L2tlZXQuanMiLCJrZWV0L25vZGVfbW9kdWxlcy9oYXNoLXN1bS9oYXNoLXN1bS5qcyIsImtlZXQvbm9kZV9tb2R1bGVzL3NldC1kb20vc3JjL2luZGV4LmpzIiwia2VldC9ub2RlX21vZHVsZXMvc2V0LWRvbS9zcmMvcGFyc2UtaHRtbC5qcyIsInNyYy9hcHAuanMiLCJzcmMvdG9kby5qcyIsInNyYy91dGlsLmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBO0FDQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDZkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDL0pBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNoQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDckJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzNFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzlDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDUkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ25DQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDdkJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNwQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzFCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNyQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN0QkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDL01BO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDMURBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FB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LEdBQWhCLEdBQW9CLElBQS9CLENBQUQsQ0FBdUMsUUFBdkMsQ0FBZ0QsRUFBaEQsQ0FBUDtBQUNELENBRkQ7O0FBSUEsUUFBUSxLQUFSLEdBQWdCLFVBQVUsRUFBVixFQUFjO0FBQzVCLFNBQU8sU0FBUyxjQUFULENBQXdCLEVBQXhCLENBQVA7QUFDRCxDQUZEIiwiZmlsZSI6ImdlbmVyYXRlZC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzQ29udGVudCI6WyIoZnVuY3Rpb24gZSh0LG4scil7ZnVuY3Rpb24gcyhvLHUpe2lmKCFuW29dKXtpZighdFtvXSl7dmFyIGE9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtpZighdSYmYSlyZXR1cm4gYShvLCEwKTtpZihpKXJldHVybiBpKG8sITApO3ZhciBmPW5ldyBFcnJvcihcIkNhbm5vdCBmaW5kIG1vZHVsZSAnXCIrbytcIidcIik7dGhyb3cgZi5jb2RlPVwiTU9EVUxFX05PVF9GT1VORFwiLGZ9dmFyIGw9bltvXT17ZXhwb3J0czp7fX07dFtvXVswXS5jYWxsKGwuZXhwb3J0cyxmdW5jdGlvbihlKXt2YXIgbj10W29dWzFdW2VdO3JldHVybiBzKG4/bjplKX0sbCxsLmV4cG9ydHMsZSx0LG4scil9cmV0dXJuIG5bb10uZXhwb3J0c312YXIgaT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2Zvcih2YXIgbz0wO288ci5sZW5ndGg7bysrKXMocltvXSk7cmV0dXJuIHN9KSIsIm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24gKGFyZ3YpIHtcclxuICB2YXIgY29wID0gZnVuY3Rpb24gKHYpIHtcclxuICAgIHZhciBvID0ge31cclxuICAgIGlmICh0eXBlb2YgdiAhPT0gJ29iamVjdCcpIHtcclxuICAgICAgby5jb3B5ID0gdlxyXG4gICAgICByZXR1cm4gby5jb3B5XHJcbiAgICB9IGVsc2Uge1xyXG4gICAgICBmb3IgKHZhciBhdHRyIGluIHYpIHtcclxuICAgICAgICBvW2F0dHJdID0gdlthdHRyXVxyXG4gICAgICB9XHJcbiAgICB9XHJcbiAgICByZXR1cm4gb1xyXG4gIH1cclxuICByZXR1cm4gQXJyYXkuaXNBcnJheShhcmd2KSA/IGFyZ3YubWFwKGZ1bmN0aW9uICh2KSB7IHJldHVybiB2IH0pIDogY29wKGFyZ3YpXHJcbn1cclxuIiwidmFyIGNvcHkgPSByZXF1aXJlKCcuL2NvcHknKVxyXG52YXIgdGFnID0gcmVxdWlyZSgnLi90YWcnKVxyXG52YXIgdG1wbEhhbmRsZXIgPSByZXF1aXJlKCcuL3RtcGxIYW5kbGVyJylcclxudmFyIHRtcGxTdHlsZXNIYW5kbGVyID0gcmVxdWlyZSgnLi90bXBsU3R5bGVzSGFuZGxlcicpXHJcbnZhciB0bXBsQ2xhc3NIYW5kbGVyID0gcmVxdWlyZSgnLi90bXBsQ2xhc3NIYW5kbGVyJylcclxudmFyIHRtcGxBdHRySGFuZGxlciA9IHJlcXVpcmUoJy4vdG1wbEF0dHJIYW5kbGVyJylcclxudmFyIHByb2Nlc3NFdmVudCA9IHJlcXVpcmUoJy4vcHJvY2Vzc0V2ZW50JylcclxudmFyIHNlbGVjdG9yID0gcmVxdWlyZSgnLi91dGlscycpLnNlbGVjdG9yXHJcbnZhciBzdHJJbnRlcnByZXRlciA9IHJlcXVpcmUoJy4vc3RySW50ZXJwcmV0ZXInKVxyXG52YXIgbm9kZXNWaXNpYmlsaXR5ID0gcmVxdWlyZSgnLi9ub2Rlc1Zpc2liaWxpdHknKVxyXG52YXIgc3VtID0gcmVxdWlyZSgnaGFzaC1zdW0nKVxyXG52YXIgc2V0RE9NID0gcmVxdWlyZSgnc2V0LWRvbScpXHJcblxyXG52YXIgdXBkYXRlQ29udGV4dCA9IGZ1bmN0aW9uICgpIHtcclxuICB2YXIgc2VsZiA9IHRoaXNcclxuICB2YXIgZWxlXHJcbiAgdmFyIG5ld0VsZW1cclxuICB2YXIgYXJncyA9IFtdLnNsaWNlLmNhbGwoYXJndW1lbnRzKVxyXG4gIGlmICh0eXBlb2YgdGhpcy5iYXNlID09PSAnb2JqZWN0Jykge1xyXG4gICAgT2JqZWN0LmtleXModGhpcy5iYXNlKS5tYXAoZnVuY3Rpb24gKGhhbmRsZXJLZXkpIHtcclxuICAgICAgdmFyIGlkID0gc2VsZi5iYXNlW2hhbmRsZXJLZXldWydrZWV0LWlkJ11cclxuICAgICAgZWxlID0gc2VsZWN0b3IoaWQpXHJcbiAgICAgIGlmICghZWxlICYmIHR5cGVvZiBzZWxmLmJhc2VbaGFuZGxlcktleV0gPT09ICdzdHJpbmcnKSB7XHJcbiAgICAgICAgZWxlID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoc2VsZi5lbClcclxuICAgICAgfVxyXG4gICAgICBuZXdFbGVtID0gZ2VuRWxlbWVudC5hcHBseShzZWxmLCBbc2VsZi5iYXNlW2hhbmRsZXJLZXldXS5jb25jYXQoYXJncykpXHJcbiAgICAgIGlmIChzZWxmLmJhc2UuaGFzT3duUHJvcGVydHkoJ3RlbXBsYXRlJykpIHtcclxuICAgICAgICBuZXdFbGVtLmlkID0gc2VsZi5lbFxyXG4gICAgICB9XHJcbiAgICAgIHNldERPTShlbGUsIG5ld0VsZW0pXHJcbiAgICB9KVxyXG4gIH0gZWxzZSB7XHJcbiAgICBlbGUgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChzZWxmLmVsKVxyXG4gICAgaWYgKGVsZSkge1xyXG4gICAgICBuZXdFbGVtID0gZ2VuRWxlbWVudC5hcHBseShzZWxmLCBbc2VsZi5iYXNlXS5jb25jYXQoYXJncykpXHJcbiAgICAgIG5ld0VsZW0uaWQgPSBzZWxmLmVsXHJcbiAgICAgIHNldERPTShlbGUsIG5ld0VsZW0pXHJcbiAgICB9XHJcbiAgfVxyXG5cclxuICAvLyB2aXJ0dWFsIE5vZGVzIHJlbmRlcmluZyByZXNvbHZlclxyXG4gIGlmKHRoaXMuX192aXJ0dWFsTm9kZXNfXykge1xyXG4gICAgdGhpcy5fX3ZpcnR1YWxOb2Rlc19fLm1hcChmdW5jdGlvbih2Tm9kZSkge1xyXG4gICAgICB2Tm9kZS5mbHVzaCgpLnJlbmRlcigpXHJcbiAgICB9KVxyXG4gIH1cclxufVxyXG5cclxudmFyIG5leHRTdGF0ZSA9IGZ1bmN0aW9uIChpLCBhcmdzKSB7XHJcbiAgdmFyIHNlbGYgPSB0aGlzXHJcbiAgaWYgKGkgPCB0aGlzLl9fc3RhdGVMaXN0X18ubGVuZ3RoKSB7XHJcbiAgICB2YXIgc3RhdGUgPSB0aGlzLl9fc3RhdGVMaXN0X19baV1cclxuICAgIHZhciB2YWx1ZSA9IHRoaXNbc3RhdGVdXHJcbiAgICAvLyBpZiB2YWx1ZSBpcyB1bmRlZmluZWQsIGxpa2VseSBoYXMgb2JqZWN0IG5vdGF0aW9uIHdlIGNvbnZlcnQgaXQgdG8gYXJyYXlcclxuICAgIGlmICh2YWx1ZSA9PT0gdW5kZWZpbmVkKSB2YWx1ZSA9IHN0ckludGVycHJldGVyKHN0YXRlKVxyXG5cclxuICAgIGlmICh2YWx1ZSAmJiBBcnJheS5pc0FycmF5KHZhbHVlKSkge1xyXG4gICAgICAvLyB1c2luZyBzcGxpdCBvYmplY3Qgbm90YXRpb24gYXMgYmFzZSBmb3Igc3RhdGUgdXBkYXRlXHJcbiAgICAgIHZhciBpblZhbCA9IHRoaXNbdmFsdWVbMF1dW3ZhbHVlWzFdXVxyXG4gICAgICBPYmplY3QuZGVmaW5lUHJvcGVydHkodGhpc1t2YWx1ZVswXV0sIHZhbHVlWzFdLCB7XHJcbiAgICAgICAgZW51bWVyYWJsZTogZmFsc2UsXHJcbiAgICAgICAgY29uZmlndXJhYmxlOiB0cnVlLFxyXG4gICAgICAgIGdldDogZnVuY3Rpb24gKCkge1xyXG4gICAgICAgICAgcmV0dXJuIGluVmFsXHJcbiAgICAgICAgfSxcclxuICAgICAgICBzZXQ6IGZ1bmN0aW9uICh2YWwpIHtcclxuICAgICAgICAgIGluVmFsID0gdmFsXHJcbiAgICAgICAgICB1cGRhdGVDb250ZXh0LmFwcGx5KHNlbGYsIGFyZ3MpXHJcbiAgICAgICAgfVxyXG4gICAgICB9KVxyXG4gICAgfSBlbHNlIHtcclxuICAgICAgLy8gaGFuZGxlIHBhcmVudCBzdGF0ZSB1cGRhdGUgaWYgdGhlIHN0YXRlIGlzIG5vdCBhbiBvYmplY3RcclxuICAgICAgT2JqZWN0LmRlZmluZVByb3BlcnR5KHRoaXMsIHN0YXRlLCB7XHJcbiAgICAgICAgZW51bWVyYWJsZTogZmFsc2UsXHJcbiAgICAgICAgY29uZmlndXJhYmxlOiB0cnVlLFxyXG4gICAgICAgIGdldDogZnVuY3Rpb24gKCkge1xyXG4gICAgICAgICAgcmV0dXJuIHZhbHVlXHJcbiAgICAgICAgfSxcclxuICAgICAgICBzZXQ6IGZ1bmN0aW9uICh2YWwpIHtcclxuICAgICAgICAgIHZhbHVlID0gdmFsXHJcbiAgICAgICAgICB1cGRhdGVDb250ZXh0LmFwcGx5KHNlbGYsIGFyZ3MpXHJcbiAgICAgICAgfVxyXG4gICAgICB9KVxyXG4gICAgfVxyXG4gICAgaSsrXHJcbiAgICBuZXh0U3RhdGUuYXBwbHkodGhpcywgWyBpLCBhcmdzIF0pXHJcbiAgfSBlbHNlIHtcclxuICAgIC8vXHJcbiAgfVxyXG59XHJcblxyXG52YXIgc2V0U3RhdGUgPSBmdW5jdGlvbiAoYXJncykge1xyXG4gIG5leHRTdGF0ZS5hcHBseSh0aGlzLCBbIDAsIGFyZ3MgXSlcclxufVxyXG5cclxudmFyIHVwZGF0ZVN0YXRlTGlzdCA9IGZ1bmN0aW9uIChzdGF0ZSkge1xyXG4gIHRoaXMuX19zdGF0ZUxpc3RfXyA9IHRoaXMuX19zdGF0ZUxpc3RfXy5jb25jYXQoc3RhdGUpXHJcbn1cclxuXHJcbnZhciBnZW5FbGVtZW50ID0gZnVuY3Rpb24gKCkge1xyXG4gIHZhciBjaGlsZCA9IFtdLnNoaWZ0LmNhbGwoYXJndW1lbnRzKVxyXG4gIHZhciBhcmdzID0gW10uc2xpY2UuY2FsbChhcmd1bWVudHMpXHJcblxyXG4gIHZhciB0ZW1wRGl2ID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnZGl2JylcclxuICB2YXIgY2xvbmVDaGlsZCA9IGNvcHkoY2hpbGQpXHJcbiAgZGVsZXRlIGNsb25lQ2hpbGQudGVtcGxhdGVcclxuICBkZWxldGUgY2xvbmVDaGlsZC50YWdcclxuICBkZWxldGUgY2xvbmVDaGlsZC5zdHlsZVxyXG4gIGRlbGV0ZSBjbG9uZUNoaWxkLmNsYXNzXHJcbiAgLy8gcHJvY2VzcyB0ZW1wbGF0ZSBpZiBoYXMgaGFuZGxlYmFycyB2YWx1ZVxyXG4gIHRoaXMuX19zdGF0ZUxpc3RfXyA9IFtdXHJcblxyXG4gIHZhciB0cGwgPSBjaGlsZC50ZW1wbGF0ZVxyXG4gICAgPyB0bXBsSGFuZGxlci5jYWxsKHRoaXMsIGNoaWxkLnRlbXBsYXRlLCB1cGRhdGVTdGF0ZUxpc3QuYmluZCh0aGlzKSlcclxuICAgIDogdHlwZW9mIGNoaWxkID09PSAnc3RyaW5nJyA/IHRtcGxIYW5kbGVyLmNhbGwodGhpcywgY2hpbGQsIHVwZGF0ZVN0YXRlTGlzdC5iaW5kKHRoaXMpKSA6IG51bGxcclxuICAvLyBwcm9jZXNzIHN0eWxlcyBpZiBoYXMgaGFuZGxlYmFycyB2YWx1ZVxyXG4gIHZhciBzdHlsZVRwbCA9IHRtcGxTdHlsZXNIYW5kbGVyLmNhbGwodGhpcywgY2hpbGQuc3R5bGUsIHVwZGF0ZVN0YXRlTGlzdC5iaW5kKHRoaXMpKVxyXG4gIC8vIHByb2Nlc3MgY2xhc3NlcyBpZiBoYXMgaGFuZGxlYmFycyB2YWx1ZVxyXG4gIHZhciBjbGFzc1RwbCA9IHRtcGxDbGFzc0hhbmRsZXIuY2FsbCh0aGlzLCBjaGlsZCwgdXBkYXRlU3RhdGVMaXN0LmJpbmQodGhpcykpXHJcbiAgaWYgKGNsYXNzVHBsKSBjbG9uZUNoaWxkLmNsYXNzID0gY2xhc3NUcGxcclxuICAvLyBjdXN0b20gYXR0cmlidXRlcyBoYW5kbGVyXHJcbiAgaWYgKGFyZ3MgJiYgYXJncy5sZW5ndGgpIHtcclxuICAgIHRtcGxBdHRySGFuZGxlci5hcHBseSh0aGlzLCBbIGNsb25lQ2hpbGQgXS5jb25jYXQoYXJncykpXHJcbiAgfVxyXG5cclxuICB2YXIgcyA9IGNoaWxkLnRhZ1xyXG4gICAgPyB0YWcoY2hpbGQudGFnLCAvLyBodG1sIHRhZ1xyXG4gICAgICB0cGwgfHwgJycsIC8vIG5vZGVWYWx1ZVxyXG4gICAgICBjbG9uZUNoaWxkLCAvLyBhdHRyaWJ1dGVzIGluY2x1ZGluZyBjbGFzc2VzXHJcbiAgICAgIHN0eWxlVHBsIC8vIGlubGluZSBzdHlsZXNcclxuICAgICkgOiB0cGwgLy8gZmFsbGJhY2sgaWYgbm9uIGV4aXN0LCByZW5kZXIgdGhlIHRlbXBsYXRlIGFzIHN0cmluZ1xyXG5cclxuICBzID0gbm9kZXNWaXNpYmlsaXR5LmNhbGwodGhpcywgcylcclxuICB0ZW1wRGl2LmlubmVySFRNTCA9IHNcclxuICB0ZW1wRGl2LmNoaWxkTm9kZXMuZm9yRWFjaChmdW5jdGlvbiAoYykge1xyXG4gICAgaWYgKGMubm9kZVR5cGUgPT09IDEpIHtcclxuICAgICAgYy5zZXRBdHRyaWJ1dGUoJ2RhdGEtY2hlY2tzdW0nLCBzdW0oYy5vdXRlckhUTUwpKVxyXG4gICAgfVxyXG4gIH0pXHJcbiAgaWYgKGNoaWxkLnRhZyA9PT0gJ2lucHV0Jykge1xyXG4gICAgaWYgKGNsb25lQ2hpbGQuY2hlY2tlZCkge1xyXG4gICAgICB0ZW1wRGl2LmNoaWxkTm9kZXNbMF0uc2V0QXR0cmlidXRlKCdjaGVja2VkJywgJycpXHJcbiAgICB9IGVsc2Uge1xyXG4gICAgICB0ZW1wRGl2LmNoaWxkTm9kZXNbMF0ucmVtb3ZlQXR0cmlidXRlKCdjaGVja2VkJylcclxuICAgIH1cclxuICB9XHJcblxyXG4gIHNldFN0YXRlLmNhbGwodGhpcywgYXJncylcclxuXHJcbiAgcHJvY2Vzc0V2ZW50LmNhbGwodGhpcywgdGVtcERpdilcclxuICByZXR1cm4gdHlwZW9mIGNoaWxkID09PSAnc3RyaW5nJ1xyXG4gICAgPyB0ZW1wRGl2XHJcbiAgICA6IGNoaWxkLnRhZyA/IHRlbXBEaXYuY2hpbGROb2Rlc1swXVxyXG4gICAgICA6IHRlbXBEaXZcclxufVxyXG5cclxuZXhwb3J0cy5nZW5FbGVtZW50ID0gZ2VuRWxlbWVudFxyXG5leHBvcnRzLnNldFN0YXRlID0gc2V0U3RhdGVcclxuZXhwb3J0cy51cGRhdGVTdGF0ZUxpc3QgPSB1cGRhdGVTdGF0ZUxpc3RcclxuIiwidmFyIHByb2Nlc3NFdmVudCA9IHJlcXVpcmUoJy4vcHJvY2Vzc0V2ZW50JylcclxuXHJcbnZhciB0bXBsID0gJydcclxuXHJcbmZ1bmN0aW9uIG5leHQgKGksIG9iaiwgYXJyUHJvcHMsIGFyZ3MpIHtcclxuICBpZiAoaSA8IGFyclByb3BzLmxlbmd0aCkge1xyXG4gICAgdmFyIHJlcCA9IGFyclByb3BzW2ldLnJlcGxhY2UoL3t7KFtee31dKyl9fS9nLCAnJDEnKVxyXG4gICAgdG1wbCA9IHRtcGwucmVwbGFjZSgve3soW157fV0rKX19Lywgb2JqW3JlcF0pXHJcbiAgICBpZiAoYXJncyAmJiB+YXJncy5pbmRleE9mKHJlcCkgJiYgIW9ialtyZXBdKSB7XHJcbiAgICAgIHZhciByZSA9IG5ldyBSZWdFeHAoJyAnICsgcmVwICsgJz1cIicgKyBvYmpbcmVwXSArICdcIicsICdnJylcclxuICAgICAgdG1wbCA9IHRtcGwucmVwbGFjZShyZSwgJycpXHJcbiAgICB9XHJcbiAgICBpKytcclxuICAgIG5leHQoaSwgb2JqLCBhcnJQcm9wcywgYXJncylcclxuICB9IGVsc2Uge1xyXG5cclxuICB9XHJcbn1cclxuXHJcbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24gKG9iaikge1xyXG4gIHZhciBhcmdzID0gdGhpcy5hcmdzXHJcbiAgdmFyIGFyclByb3BzID0gdGhpcy5iYXNlLnRlbXBsYXRlLm1hdGNoKC97eyhbXnt9XSspfX0vZylcclxuICB2YXIgdGVtcERpdlxyXG4gIHRtcGwgPSB0aGlzLmJhc2UudGVtcGxhdGVcclxuICBuZXh0KDAsIG9iaiwgYXJyUHJvcHMsIGFyZ3MpXHJcbiAgdGVtcERpdiA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2RpdicpXHJcbiAgdGVtcERpdi5pbm5lckhUTUwgPSB0bXBsXHJcbiAgdmFyIGlzZXZ0ID0gLyBrLS8udGVzdCh0bXBsKVxyXG4gIGlmIChpc2V2dCkgeyBwcm9jZXNzRXZlbnQuY2FsbCh0aGlzLCB0ZW1wRGl2KSB9XHJcbiAgdGVtcERpdi5jaGlsZE5vZGVzWzBdLnNldEF0dHJpYnV0ZSgna2VldC1pZCcsIG9ialsna2VldC1pZCddKVxyXG4gIHJldHVybiB0ZW1wRGl2LmNoaWxkTm9kZXNbMF1cclxufVxyXG4iLCJtb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uIChzdHJpbmcpIHtcclxuICB2YXIgc2VsZiA9IHRoaXNcclxuICB0aGlzLl9fc3RhdGVMaXN0X18ubWFwKGZ1bmN0aW9uIChzdGF0ZSkge1xyXG4gICAgaWYgKCFzZWxmW3N0YXRlXSkge1xyXG4gICAgICB2YXIgZiA9ICdcXFxce1xcXFx7XFxcXD8nICsgc3RhdGUgKyAnXFxcXH1cXFxcfSdcclxuICAgICAgdmFyIGIgPSAnXFxcXHtcXFxce1xcXFwvJyArIHN0YXRlICsgJ1xcXFx9XFxcXH0nXHJcbiAgICAgIC8vIHZhciByZWd4ID0gJyg/PD0nICsgZiArICcpKC4qPykoPz0nICsgYiArICcpJ1xyXG4gICAgICAvLyAqKiBvbGQgYnJvd3NlciBkb2VzIG5vdCBzdXBwb3J0IHBvc2l0aXZlIGxvb2sgYmVoaW5kICoqXHJcbiAgICAgIHZhciByZWd4ID0gJygnICsgZiArICcpKC4qPykoPz0nICsgYiArICcpJ1xyXG4gICAgICB2YXIgcmUgPSBuZXcgUmVnRXhwKHJlZ3gpXHJcbiAgICAgIHZhciBpc0NvbmRpdGlvbmFsID0gcmUudGVzdChzdHJpbmcpXHJcbiAgICAgIHZhciBtYXRjaCA9IHN0cmluZy5tYXRjaChyZSlcclxuICAgICAgaWYgKGlzQ29uZGl0aW9uYWwgJiYgbWF0Y2gpIHtcclxuICAgICAgICBzdHJpbmcgPSBzdHJpbmcucmVwbGFjZShtYXRjaFsyXSwgJycpXHJcbiAgICAgIH1cclxuICAgIH1cclxuICAgIHN0cmluZyA9IHN0cmluZy5yZXBsYWNlKCd7ez8nICsgc3RhdGUgKyAnfX0nLCAnJylcclxuICAgIHN0cmluZyA9IHN0cmluZy5yZXBsYWNlKCd7ey8nICsgc3RhdGUgKyAnfX0nLCAnJylcclxuICB9KVxyXG4gIHJldHVybiBzdHJpbmdcclxufVxuIiwidmFyIGdlbkVsZW1lbnQgPSByZXF1aXJlKCcuL2dlbkVsZW1lbnQnKS5nZW5FbGVtZW50XHJcbnZhciBzZXRTdGF0ZSA9IHJlcXVpcmUoJy4vZ2VuRWxlbWVudCcpLnNldFN0YXRlXHJcbnZhciB0bXBsSGFuZGxlciA9IHJlcXVpcmUoJy4vdG1wbEhhbmRsZXInKVxyXG52YXIgcHJvY2Vzc0V2ZW50ID0gcmVxdWlyZSgnLi9wcm9jZXNzRXZlbnQnKVxyXG52YXIgZ2VuSWQgPSByZXF1aXJlKCcuL3V0aWxzJykuZ2VuSWRcclxudmFyIGdlblRlbXBsYXRlID0gcmVxdWlyZSgnLi9nZW5UZW1wbGF0ZScpXHJcbnZhciBub2Rlc1Zpc2liaWxpdHkgPSByZXF1aXJlKCcuL25vZGVzVmlzaWJpbGl0eScpXHJcbnZhciBzdW0gPSByZXF1aXJlKCdoYXNoLXN1bScpXHJcblxyXG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uICgpIHtcclxuICB2YXIgc2VsZiA9IHRoaXNcclxuICB2YXIgZWxlbUFyciA9IFtdXHJcbiAgdmFyIGFyZ3MgPSBbXS5zbGljZS5jYWxsKGFyZ3VtZW50cylcclxuICBpZiAoQXJyYXkuaXNBcnJheSh0aGlzLmJhc2UubW9kZWwpKSB7XHJcbiAgICAvLyBkbyBhcnJheSBiYXNlXHJcbiAgICB0aGlzLmJhc2UudGVtcGxhdGUgPSB0aGlzLmJhc2UudGVtcGxhdGUudHJpbSgpLnJlcGxhY2UoL1xccysvZywgJyAnKVxyXG5cclxuICAgIC8vIGdlbmVyYXRlIGlkIGZvciBzZWxlY3RvclxyXG4gICAgdGhpcy5iYXNlLm1vZGVsID0gdGhpcy5iYXNlLm1vZGVsLm1hcChmdW5jdGlvbiAobSkge1xyXG4gICAgICBtWydrZWV0LWlkJ10gPSBnZW5JZCgpXHJcbiAgICAgIHJldHVybiBtXHJcbiAgICB9KVxyXG4gICAgdGhpcy5iYXNlLm1vZGVsLm1hcChmdW5jdGlvbiAobSkge1xyXG4gICAgICBlbGVtQXJyLnB1c2goZ2VuVGVtcGxhdGUuY2FsbChzZWxmLCBtKSlcclxuICAgIH0pXHJcbiAgfSBlbHNlIGlmICh0eXBlb2YgdGhpcy5iYXNlID09PSAnb2JqZWN0Jykge1xyXG4gICAgLy8gZG8gb2JqZWN0IGJhc2VcclxuICAgIE9iamVjdC5rZXlzKHRoaXMuYmFzZSkubWFwKGZ1bmN0aW9uIChrZXkpIHtcclxuICAgICAgdmFyIGNoaWxkID0gc2VsZi5iYXNlW2tleV1cclxuICAgICAgaWYgKGNoaWxkICYmIHR5cGVvZiBjaGlsZCA9PT0gJ29iamVjdCcpIHtcclxuICAgICAgICB2YXIgaWQgPSBnZW5JZCgpXHJcbiAgICAgICAgY2hpbGRbJ2tlZXQtaWQnXSA9IGlkXHJcbiAgICAgICAgc2VsZi5iYXNlW2tleV1bJ2tlZXQtaWQnXSA9IGlkXHJcbiAgICAgICAgdmFyIG5ld0VsZW1lbnQgPSBnZW5FbGVtZW50LmFwcGx5KHNlbGYsIFtjaGlsZF0uY29uY2F0KGFyZ3MpKVxyXG4gICAgICAgIGVsZW1BcnIucHVzaChuZXdFbGVtZW50KVxyXG4gICAgICB9IGVsc2Uge1xyXG4gICAgICAgIHNlbGYuX19zdGF0ZUxpc3RfXyA9IFtdXHJcbiAgICAgICAgdmFyIHRwbCA9IHRtcGxIYW5kbGVyLmNhbGwoc2VsZiwgY2hpbGQsIGZ1bmN0aW9uIChzdGF0ZSkge1xyXG4gICAgICAgICAgc2VsZi5fX3N0YXRlTGlzdF9fID0gc2VsZi5fX3N0YXRlTGlzdF9fLmNvbmNhdChzdGF0ZSlcclxuICAgICAgICB9KVxyXG4gICAgICAgIHRwbCA9IG5vZGVzVmlzaWJpbGl0eS5jYWxsKHNlbGYsIHRwbClcclxuICAgICAgICB2YXIgdGVtcERpdiA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2RpdicpXHJcbiAgICAgICAgdGVtcERpdi5pbm5lckhUTUwgPSB0cGxcclxuICAgICAgICBzZXRTdGF0ZS5jYWxsKHNlbGYsIGFyZ3MpXHJcbiAgICAgICAgcHJvY2Vzc0V2ZW50LmNhbGwoc2VsZiwgdGVtcERpdilcclxuICAgICAgICB0ZW1wRGl2LmNoaWxkTm9kZXMuZm9yRWFjaChmdW5jdGlvbiAoYykge1xyXG4gICAgICAgICAgaWYgKGMubm9kZVR5cGUgPT09IDEpIHtcclxuICAgICAgICAgICAgYy5zZXRBdHRyaWJ1dGUoJ2RhdGEtY2hlY2tzdW0nLCBzdW0oYy5vdXRlckhUTUwpKVxyXG4gICAgICAgICAgfVxyXG4gICAgICAgICAgZWxlbUFyci5wdXNoKGMpXHJcbiAgICAgICAgfSlcclxuICAgICAgfVxyXG4gICAgfSlcclxuICB9IGVsc2UgaWYgKHR5cGVvZiB0aGlzLmJhc2UgPT09ICdzdHJpbmcnKSB7XHJcbiAgICB0aGlzLl9fc3RhdGVMaXN0X18gPSBbXVxyXG4gICAgdmFyIHRwbCA9IHRtcGxIYW5kbGVyLmNhbGwodGhpcywgdGhpcy5iYXNlLCBmdW5jdGlvbiAoc3RhdGUpIHtcclxuICAgICAgc2VsZi5fX3N0YXRlTGlzdF9fID0gc2VsZi5fX3N0YXRlTGlzdF9fLmNvbmNhdChzdGF0ZSlcclxuICAgIH0pXHJcblxyXG4gICAgdHBsID0gbm9kZXNWaXNpYmlsaXR5LmNhbGwodGhpcywgdHBsKVxyXG4gICAgdmFyIHRlbXBEaXYgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdkaXYnKVxyXG4gICAgdGVtcERpdi5pbm5lckhUTUwgPSB0cGxcclxuICAgIHNldFN0YXRlLmNhbGwodGhpcywgYXJncylcclxuICAgIHByb2Nlc3NFdmVudC5jYWxsKHRoaXMsIHRlbXBEaXYpXHJcblxyXG4gICAgdGVtcERpdi5jaGlsZE5vZGVzLmZvckVhY2goZnVuY3Rpb24gKGMpIHtcclxuICAgICAgaWYgKGMubm9kZVR5cGUgPT09IDEpIHtcclxuICAgICAgICBjLnNldEF0dHJpYnV0ZSgnZGF0YS1jaGVja3N1bScsIHN1bShjLm91dGVySFRNTCkpXHJcbiAgICAgIH1cclxuICAgICAgZWxlbUFyci5wdXNoKGMpXHJcbiAgICB9KVxyXG4gIH1cclxuXHJcbiAgcmV0dXJuIGVsZW1BcnJcclxufVxyXG4iLCJ2YXIgbG9vcENoaWxkcyA9IHJlcXVpcmUoJy4vdXRpbHMnKS5sb29wQ2hpbGRzXHJcblxyXG52YXIgbmV4dCA9IGZ1bmN0aW9uIChpLCBjLCByZW0pIHtcclxuICB2YXIgaGFza1xyXG4gIHZhciBldnROYW1lXHJcbiAgdmFyIGV2dGhhbmRsZXJcclxuICB2YXIgaGFuZGxlclxyXG4gIHZhciBpc0hhbmRsZXJcclxuICB2YXIgYXJndlxyXG4gIHZhciB2XHJcbiAgdmFyIGF0dHMgPSBjLmF0dHJpYnV0ZXNcclxuXHJcbiAgaWYgKGkgPCBhdHRzLmxlbmd0aCkge1xyXG4gICAgaGFzayA9IC9eay0vLnRlc3QoYXR0c1tpXS5ub2RlTmFtZSlcclxuICAgIGlmIChoYXNrKSB7XHJcbiAgICAgIGV2dE5hbWUgPSBhdHRzW2ldLm5vZGVOYW1lLnNwbGl0KCctJylbMV1cclxuICAgICAgZXZ0aGFuZGxlciA9IGF0dHNbaV0ubm9kZVZhbHVlXHJcbiAgICAgIGhhbmRsZXIgPSBldnRoYW5kbGVyLnNwbGl0KCcoJylcclxuICAgICAgaXNIYW5kbGVyID0gdGhpc1toYW5kbGVyWzBdXVxyXG4gICAgICBpZiAodHlwZW9mIGlzSGFuZGxlciA9PT0gJ2Z1bmN0aW9uJykge1xyXG4gICAgICAgIHJlbS5wdXNoKGF0dHNbaV0ubm9kZU5hbWUpXHJcbiAgICAgICAgYXJndiA9IFtdXHJcbiAgICAgICAgdiA9IGhhbmRsZXJbMV0uc2xpY2UoMCwgLTEpLnNwbGl0KCcsJykuZmlsdGVyKGZ1bmN0aW9uIChmKSB7IHJldHVybiBmICE9PSAnJyB9KVxyXG4gICAgICAgIGlmICh2Lmxlbmd0aCkgdi5tYXAoZnVuY3Rpb24gKHYpIHsgYXJndi5wdXNoKHYpIH0pXHJcbiAgICAgICAgYy5hZGRFdmVudExpc3RlbmVyKGV2dE5hbWUsIGlzSGFuZGxlci5iaW5kLmFwcGx5KGlzSGFuZGxlci5iaW5kKHRoaXMpLCBbY10uY29uY2F0KGFyZ3YpKSwgZmFsc2UpXHJcbiAgICAgIH1cclxuICAgIH1cclxuICAgIGkrK1xyXG4gICAgbmV4dC5hcHBseSh0aGlzLCBbIGksIGMsIHJlbSBdKVxyXG4gIH0gZWxzZSB7XHJcbiAgICByZW0ubWFwKGZ1bmN0aW9uIChmKSB7IGMucmVtb3ZlQXR0cmlidXRlKGYpIH0pXHJcbiAgfVxyXG59XHJcblxyXG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uIChrTm9kZSkge1xyXG4gIHZhciBzZWxmID0gdGhpc1xyXG4gIHZhciBsaXN0S25vZGVDaGlsZCA9IFtdXHJcbiAgdmFyIHJlbSA9IFtdXHJcbiAgbG9vcENoaWxkcyhsaXN0S25vZGVDaGlsZCwga05vZGUpXHJcbiAgbGlzdEtub2RlQ2hpbGQubWFwKGZ1bmN0aW9uIChjKSB7XHJcbiAgICBpZiAoYy5ub2RlVHlwZSA9PT0gMSAmJiBjLmhhc0F0dHJpYnV0ZXMoKSkge1xyXG4gICAgICBuZXh0LmFwcGx5KHNlbGYsIFsgMCwgYywgcmVtIF0pXHJcbiAgICB9XHJcbiAgfSlcclxuICBsaXN0S25vZGVDaGlsZCA9IFtdXHJcbn1cclxuIiwibW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbiAoc3RyKSB7XHJcbiAgdmFyIHJlcyA9IHN0ci5tYXRjaCgvXFwuKlxcLi9nKVxyXG4gIHZhciByZXN1bHRcclxuICBpZiAocmVzICYmIHJlcy5sZW5ndGggPiAwKSB7XHJcbiAgICByZXR1cm4gc3RyLnNwbGl0KCcuJylcclxuICB9XHJcbiAgcmV0dXJuIHJlc3VsdFxyXG59XHJcbiIsImZ1bmN0aW9uIGt0YWcgKCkge1xyXG4gIHZhciBhcmdzID0gW10uc2xpY2UuY2FsbChhcmd1bWVudHMpXHJcbiAgdmFyIGF0dHJcclxuICB2YXIgaWR4XHJcbiAgdmFyIHRlXHJcbiAgdmFyIHJldCA9IFsnPCcsIGFyZ3NbMF0sICc+JywgYXJnc1sxXSwgJzwvJywgYXJnc1swXSwgJz4nXVxyXG4gIGlmIChhcmdzLmxlbmd0aCA+IDIgJiYgdHlwZW9mIGFyZ3NbMl0gPT09ICdvYmplY3QnKSB7XHJcbiAgICBmb3IgKGF0dHIgaW4gYXJnc1syXSkge1xyXG4gICAgICBpZiAodHlwZW9mIGFyZ3NbMl1bYXR0cl0gPT09ICdib29sZWFuJyAmJiBhcmdzWzJdW2F0dHJdKSB7XHJcbiAgICAgICAgcmV0LnNwbGljZSgyLCAwLCAnICcsIGF0dHIpXHJcbiAgICAgIH0gZWxzZSBpZiAoYXR0ciA9PT0gJ2NsYXNzJyAmJiBBcnJheS5pc0FycmF5KGFyZ3NbMl1bYXR0cl0pKSB7XHJcbiAgICAgICAgcmV0LnNwbGljZSgyLCAwLCAnICcsIGF0dHIsICc9XCInLCBhcmdzWzJdW2F0dHJdLmpvaW4oJyAnKS50cmltKCksICdcIicpXHJcbiAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgcmV0LnNwbGljZSgyLCAwLCAnICcsIGF0dHIsICc9XCInLCBhcmdzWzJdW2F0dHJdLCAnXCInKVxyXG4gICAgICB9XHJcbiAgICB9XHJcbiAgfVxyXG4gIGlmIChhcmdzLmxlbmd0aCA+IDMgJiYgdHlwZW9mIGFyZ3NbM10gPT09ICdvYmplY3QnKSB7XHJcbiAgICBpZHggPSByZXQuaW5kZXhPZignPicpXHJcbiAgICB0ZSA9IFtpZHgsIDAsICcgc3R5bGU9XCInXVxyXG4gICAgZm9yIChhdHRyIGluIGFyZ3NbM10pIHtcclxuICAgICAgdGUucHVzaChhdHRyKVxyXG4gICAgICB0ZS5wdXNoKCc6JylcclxuICAgICAgdGUucHVzaChhcmdzWzNdW2F0dHJdKVxyXG4gICAgICB0ZS5wdXNoKCc7JylcclxuICAgIH1cclxuICAgIHRlLnB1c2goJ1wiJylcclxuICAgIHJldC5zcGxpY2UuYXBwbHkocmV0LCB0ZSlcclxuICB9XHJcbiAgcmV0dXJuIHJldFxyXG59XHJcblxyXG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uICgpIHtcclxuICByZXR1cm4ga3RhZy5hcHBseShudWxsLCBhcmd1bWVudHMpLmpvaW4oJycpXHJcbn1cclxuIiwidmFyIGdlbkVsZW1lbnQgPSByZXF1aXJlKCcuL2dlbkVsZW1lbnQnKVxyXG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uICgpIHtcclxuICB2YXIgc2VsZiA9IHRoaXNcclxuICB2YXIgY2xvbmVDaGlsZCA9IFtdLnNoaWZ0LmNhbGwoYXJndW1lbnRzKVxyXG4gIE9iamVjdC5rZXlzKGNsb25lQ2hpbGQpLm1hcChmdW5jdGlvbiAoYykge1xyXG4gICAgdmFyIGhkbCA9IGNsb25lQ2hpbGRbY10ubWF0Y2goL3t7KFtee31dKyl9fS9nKVxyXG4gICAgaWYgKGhkbCAmJiBoZGwubGVuZ3RoKSB7XHJcbiAgICAgIHZhciBzdHIgPSAnJ1xyXG4gICAgICBoZGwubWFwKGZ1bmN0aW9uIChzKSB7XHJcbiAgICAgICAgdmFyIHJlcCA9IHMucmVwbGFjZSgve3soW157fV0rKX19L2csICckMScpXHJcbiAgICAgICAgaWYgKHNlbGZbcmVwXSAhPT0gdW5kZWZpbmVkKSB7XHJcbiAgICAgICAgICBnZW5FbGVtZW50LnVwZGF0ZVN0YXRlTGlzdC5jYWxsKHNlbGYsIHJlcClcclxuICAgICAgICAgIGlmIChzZWxmW3JlcF0gPT09IGZhbHNlKSB7XHJcbiAgICAgICAgICAgIGRlbGV0ZSBjbG9uZUNoaWxkW2NdXHJcbiAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICBzdHIgKz0gc2VsZltyZXBdXHJcbiAgICAgICAgICAgIGNsb25lQ2hpbGRbY10gPSBzdHJcclxuICAgICAgICAgIH1cclxuICAgICAgICB9XHJcbiAgICAgIH0pXHJcbiAgICB9XHJcbiAgfSlcclxufVxyXG4iLCJtb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uIChjaGlsZCwgdXBkYXRlU3RhdGVMaXN0KSB7XHJcbiAgdmFyIHNlbGYgPSB0aGlzXHJcbiAgaWYgKGNoaWxkLmNsYXNzKSB7XHJcbiAgICB2YXIgYyA9IGNoaWxkLmNsYXNzLm1hdGNoKC97eyhbXnt9XSspfX0vZylcclxuICAgIHZhciBjbGFzc1N0ciA9ICcnXHJcbiAgICBpZiAoYyAmJiBjLmxlbmd0aCkge1xyXG4gICAgICBjLm1hcChmdW5jdGlvbiAocykge1xyXG4gICAgICAgIHZhciByZXAgPSBzLnJlcGxhY2UoL3t7KFtee31dKyl9fS9nLCAnJDEnKVxyXG4gICAgICAgIGlmIChzZWxmW3JlcF0gIT09IHVuZGVmaW5lZCkge1xyXG4gICAgICAgICAgdXBkYXRlU3RhdGVMaXN0KHJlcClcclxuICAgICAgICAgIHNlbGZbcmVwXS5jc3RvcmUubWFwKGZ1bmN0aW9uIChjKSB7XHJcbiAgICAgICAgICAgIGNsYXNzU3RyICs9IGMgKyAnICdcclxuICAgICAgICAgIH0pXHJcbiAgICAgICAgfVxyXG4gICAgICB9KVxyXG4gICAgfVxyXG4gICAgcmV0dXJuIGNsYXNzU3RyLmxlbmd0aCA/IGNsYXNzU3RyLnRyaW0oKSA6IGNoaWxkLmNsYXNzXHJcbiAgfVxyXG4gIHJldHVybiBmYWxzZVxyXG59XHJcbiIsInZhciBzdHJJbnRlcnByZXRlciA9IHJlcXVpcmUoJy4vc3RySW50ZXJwcmV0ZXInKVxyXG5cclxubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbiAoc3RyLCB1cGRhdGVTdGF0ZUxpc3QpIHtcclxuICB2YXIgc2VsZiA9IHRoaXNcclxuICB2YXIgYXJyUHJvcHMgPSBzdHIubWF0Y2goL3t7KFtee31dKyl9fS9nKVxyXG4gIGlmIChhcnJQcm9wcyAmJiBhcnJQcm9wcy5sZW5ndGgpIHtcclxuICAgIGFyclByb3BzLm1hcChmdW5jdGlvbiAocykge1xyXG4gICAgICB2YXIgcmVwID0gcy5yZXBsYWNlKC97eyhbXnt9XSspfX0vZywgJyQxJylcclxuICAgICAgdmFyIGlzT2JqZWN0Tm90YXRpb24gPSBzdHJJbnRlcnByZXRlcihyZXApXHJcbiAgICAgIGlmICghaXNPYmplY3ROb3RhdGlvbikge1xyXG4gICAgICAgIGlmIChzZWxmW3JlcF0gIT09IHVuZGVmaW5lZCkge1xyXG4gICAgICAgICAgdXBkYXRlU3RhdGVMaXN0KHJlcClcclxuICAgICAgICAgIHN0ciA9IHN0ci5yZXBsYWNlKCd7eycrcmVwKyd9fScsIHNlbGZbcmVwXSlcclxuICAgICAgICB9XHJcbiAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgdXBkYXRlU3RhdGVMaXN0KHJlcClcclxuICAgICAgICBzdHIgPSBzdHIucmVwbGFjZSgne3snK3JlcCsnfX0nLCBzZWxmW2lzT2JqZWN0Tm90YXRpb25bMF1dW2lzT2JqZWN0Tm90YXRpb25bMV1dKVxyXG4gICAgICB9XHJcbiAgICAgIGlmIChyZXAubWF0Y2goL15cXD8vZykpIHtcclxuICAgICAgICB1cGRhdGVTdGF0ZUxpc3QocmVwLnJlcGxhY2UoJz8nLCAnJykpXHJcbiAgICAgIH1cclxuICAgIH0pXHJcbiAgfVxyXG4gIHJldHVybiBzdHJcclxufVxyXG5cclxuIiwidmFyIGNvcHkgPSByZXF1aXJlKCcuL2NvcHknKVxyXG5cclxubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbiAoc3R5bGVzLCB1cGRhdGVTdGF0ZUxpc3QpIHtcclxuICB2YXIgc2VsZiA9IHRoaXNcclxuICB2YXIgY29weVN0eWxlcyA9IGNvcHkoc3R5bGVzKVxyXG4gIGlmIChzdHlsZXMpIHtcclxuICAgIE9iamVjdC5rZXlzKGNvcHlTdHlsZXMpLm1hcChmdW5jdGlvbiAoc3R5bGUpIHtcclxuICAgICAgdmFyIGFyclByb3BzID0gY29weVN0eWxlc1tzdHlsZV0ubWF0Y2goL3t7KFtee31dKyl9fS9nKVxyXG4gICAgICBpZiAoYXJyUHJvcHMgJiYgYXJyUHJvcHMubGVuZ3RoKSB7XHJcbiAgICAgICAgYXJyUHJvcHMubWFwKGZ1bmN0aW9uIChzKSB7XHJcbiAgICAgICAgICB2YXIgcmVwID0gcy5yZXBsYWNlKC97eyhbXnt9XSspfX0vZywgJyQxJylcclxuICAgICAgICAgIGlmIChzZWxmW3JlcF0gIT09IHVuZGVmaW5lZCkge1xyXG4gICAgICAgICAgICB1cGRhdGVTdGF0ZUxpc3QocmVwKVxyXG4gICAgICAgICAgICBjb3B5U3R5bGVzW3N0eWxlXSA9IGNvcHlTdHlsZXNbc3R5bGVdLnJlcGxhY2UoL3t7KFtee31dKyl9fS8sIHNlbGZbcmVwXSlcclxuICAgICAgICAgIH1cclxuICAgICAgICB9KVxyXG4gICAgICB9XHJcbiAgICB9KVxyXG4gIH1cclxuICByZXR1cm4gY29weVN0eWxlc1xyXG59XHJcbiIsImV4cG9ydHMuZ2V0SWQgPSBmdW5jdGlvbiAoaWQpIHtcclxuICByZXR1cm4gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoaWQpXHJcbn1cclxuXHJcbmV4cG9ydHMuZ2VuSWQgPSBmdW5jdGlvbiAoKSB7XHJcbiAgcmV0dXJuIChNYXRoLnJvdW5kKE1hdGgucmFuZG9tKCkgKiAweDEgKiAxZTEyKSkudG9TdHJpbmcoMzIpXHJcbn1cclxuXHJcbmV4cG9ydHMuc2VsZWN0b3IgPSBmdW5jdGlvbiAoaWQpIHtcclxuICByZXR1cm4gZG9jdW1lbnQucXVlcnlTZWxlY3RvcignW2tlZXQtaWQ9XCInICsgaWQgKyAnXCJdJylcclxufVxyXG5cclxudmFyIGxvb3BDaGlsZHMgPSBmdW5jdGlvbiAoYXJyLCBlbGVtKSB7XHJcbiAgZm9yICh2YXIgY2hpbGQgPSBlbGVtLmZpcnN0Q2hpbGQ7IGNoaWxkICE9PSBudWxsOyBjaGlsZCA9IGNoaWxkLm5leHRTaWJsaW5nKSB7XHJcbiAgICBhcnIucHVzaChjaGlsZClcclxuICAgIGlmIChjaGlsZC5oYXNDaGlsZE5vZGVzKCkpIHtcclxuICAgICAgbG9vcENoaWxkcyhhcnIsIGNoaWxkKVxyXG4gICAgfVxyXG4gIH1cclxufVxyXG5cclxuZXhwb3J0cy5sb29wQ2hpbGRzID0gbG9vcENoaWxkc1xyXG4iLCIndXNlIHN0cmljdCdcclxuLyoqXHJcbiAqIEtlZXRqcyB2My41LjEgQWxwaGEgcmVsZWFzZTogaHR0cHM6Ly9naXRodWIuY29tL2tlZXRqcy9rZWV0LmpzXHJcbiAqIE1pbmltYWxpc3QgdmlldyBsYXllciBmb3IgdGhlIHdlYlxyXG4gKlxyXG4gKiA8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDwgS2VldGpzID4+Pj4+Pj4+Pj4+Pj4+Pj4+Pj4+Pj4+Pj4+Pj4+PlxyXG4gKlxyXG4gKiBDb3B5cmlnaHQgMjAxOCwgU2hhaHJ1bCBOaXphbSBTZWxhbWF0XHJcbiAqIFJlbGVhc2VkIHVuZGVyIHRoZSBNSVQgTGljZW5zZS5cclxuICovXHJcblxyXG52YXIgZ2V0SWQgPSByZXF1aXJlKCcuL2NvbXBvbmVudHMvdXRpbHMnKS5nZXRJZFxyXG52YXIgZ2VuSWQgPSByZXF1aXJlKCcuL2NvbXBvbmVudHMvdXRpbHMnKS5nZW5JZFxyXG52YXIgc2VsZWN0b3IgPSByZXF1aXJlKCcuL2NvbXBvbmVudHMvdXRpbHMnKS5zZWxlY3RvclxyXG52YXIgcGFyc2VTdHIgPSByZXF1aXJlKCcuL2NvbXBvbmVudHMvcGFyc2VTdHInKVxyXG52YXIgZ2VuVGVtcGxhdGUgPSByZXF1aXJlKCcuL2NvbXBvbmVudHMvZ2VuVGVtcGxhdGUnKVxyXG52YXIgc2V0RE9NID0gcmVxdWlyZSgnc2V0LWRvbScpXHJcblxyXG4vKipcclxuICogQHByaXZhdGVcclxuICogQGRlc2NyaXB0aW9uXHJcbiAqIExvb3AgcmVuZGVyIGFsbCBpbml0aWFsbHkgcGFyc2VkIGh0bWwgZW50aXRpZXMgdG8gXHJcbiAqIHRhcmdldCBET00gbm9kZSBpZC5cclxuICpcclxuICogQHBhcmFtIHtJbnR9IGkgLSBUaGUgaW5kZXggb2YgaHRtbCBlbnRpdHkuXHJcbiAqIEBwYXJhbSB7Tm9kZX0gZWxlIC0gVGhlIHRhcmdldCBET00gbm9kZS5cclxuICogQHBhcmFtIHtOb2RlfSBlbHMgLSBUaGUgbGlzdCBvZiBodG1sIGVudGl0aWVzLlxyXG4gKi9cclxudmFyIG5leHQgPSBmdW5jdGlvbiAoaSwgZWxlLCBlbHMpIHtcclxuICB2YXIgc2VsZiA9IHRoaXNcclxuICBpZiAoaSA8IGVscy5sZW5ndGgpIHtcclxuICAgIGlmICghZWxlLmNoaWxkTm9kZXNbaV0pIGVsZS5hcHBlbmRDaGlsZChlbHNbaV0pXHJcbiAgICBpKytcclxuICAgIG5leHQuYXBwbHkodGhpcywgWyBpLCBlbGUsIGVscyBdKVxyXG4gIH0gZWxzZSB7XHJcbiAgICAvLyBPbmNlIGludGlhbCByZW5kZXIgYWxyZWFkeSBpbiBwbGFjZSBjb25zZWN1dGl2ZWx5XHJcbiAgICAvLyB3YXRjaCB0aGUgb2JqZWN0IGluIENvbXBvbmVudHMucHJvdG90eXBlLmJhc2UuIEFkZCBcclxuICAgIC8vIGFkZGl0aW9uYWwgb2JqZWN0IHByb3BzIG9yIGRlbGV0ZSBleGlzdGluZyBvYmplY3QgXHJcbiAgICAvLyBwcm9wcywgd2hpY2ggd2lsbCByZWZsZWN0IGluIHRoZSBjb21wb25lbnQgcmVuZGVyZWQgXHJcbiAgICAvLyBlbGVtZW50cy5cclxuICAgIHZhciB3YXRjaE9iamVjdCA9IGZ1bmN0aW9uIChvYmopIHtcclxuICAgICAgcmV0dXJuIG5ldyBQcm94eShvYmosIHtcclxuICAgICAgICBzZXQ6IGZ1bmN0aW9uICh0YXJnZXQsIGtleSwgdmFsdWUpIHtcclxuICAgICAgICAgIHRhcmdldFtrZXldID0gdmFsdWVcclxuICAgICAgICAgIHNlbGYuYmFzZVtrZXldID0gdGFyZ2V0W2tleV1cclxuICAgICAgICAgIHJldHVybiB0cnVlXHJcbiAgICAgICAgfSxcclxuICAgICAgICBkZWxldGVQcm9wZXJ0eTogZnVuY3Rpb24gKHRhcmdldCwga2V5KSB7XHJcbiAgICAgICAgICB2YXIgaWQgPSB0YXJnZXRba2V5XVsna2VldC1pZCddXHJcbiAgICAgICAgICB2YXIgZWwgPSBzZWxlY3RvcihpZClcclxuICAgICAgICAgIGVsICYmIGVsLnJlbW92ZSgpXHJcbiAgICAgICAgICBkZWxldGUgc2VsZi5iYXNlW2tleV1cclxuICAgICAgICAgIHJldHVybiB0cnVlXHJcbiAgICAgICAgfVxyXG4gICAgICB9KVxyXG4gICAgfVxyXG5cclxuICAgIC8vIHZpcnR1YWwgTm9kZXMgcmVuZGVyaW5nIHJlc29sdmVyXHJcbiAgICBpZih0aGlzLl9fdmlydHVhbE5vZGVzX18pIHtcclxuICAgICAgdGhpcy5fX3ZpcnR1YWxOb2Rlc19fLm1hcChmdW5jdGlvbih2Tm9kZSkge1xyXG4gICAgICAgIHZOb2RlLmZsdXNoKCkucmVuZGVyKClcclxuICAgICAgfSlcclxuICAgIH1cclxuXHJcbiAgICAvLyBvbmx5IGphdmFzY3JpcHQgb2JqZWN0cyBpcyB3YXRjaGFibGVcclxuICAgIGlmICh0eXBlb2YgdGhpcy5iYXNlID09PSAnb2JqZWN0JykgeyB0aGlzLmJhc2VQcm94eSA9IHdhdGNoT2JqZWN0KHRoaXMuYmFzZSkgfVxyXG5cclxuICAgIC8vIHNpbmNlIGNvbXBvbmVudCBhbHJlYWR5IHJlbmRlcmVkLCB0cmlnZ2VyIGl0cyBsaWZlLWN5Y2xlIG1ldGhvZFxyXG4gICAgaWYgKHRoaXMuY29tcG9uZW50RGlkTW91bnQgJiYgdHlwZW9mIHRoaXMuY29tcG9uZW50RGlkTW91bnQgPT09ICdmdW5jdGlvbicpIHtcclxuICAgICAgdGhpcy5jb21wb25lbnREaWRNb3VudCgpXHJcbiAgICB9XHJcbiAgfVxyXG59XHJcblxyXG4vKipcclxuICogQGRlc2NyaXB0aW9uXHJcbiAqIFRoZSBtYWluIGNvbnN0cnVjdG9yIG9mIEtlZXRcclxuICpcclxuICogQHBhcmFtIHtTdHJpbmcgfCBhcmcwWywgYXJnMVssIGFyZzJbLCAuLi5dXV19IGFyZ3VtZW50cyAtIEN1c3RvbSBwcm9wZXJ0eSBuYW1lc1xyXG4gKiBpLmUgdXNpbmcgJ2NoZWNrZWQnIGZvciBpbnB1dCBlbGVtZW50cy5cclxuICogVXNhZ2UgOi1cclxuICogICAgY29uc3QgQXBwIGV4dGVuZHMgS2VldCB7XHJcbiAqICAgICAgY29uc3RydWN0b3IoLi4uYXJncykge1xyXG4gKiAgICAgICAgc3VwZXIoKVxyXG4gKiAgICAgICAgdGhpcy5hcmdzID0gYXJnc1xyXG4gKiAgICAgIH1cclxuICogICAgfVxyXG4gKiAgICBjb25zdCBhcHAgPSBuZXcgQXBwKCdjaGVja2VkJylcclxuICogZm9yIGV4YW1wbGUgdXNhZ2UgY2FzZXMgc2VlIGh0dHBzOi8vZ2l0aHViLmNvbS9zeWFydWwva2VldC9ibG9iL21hc3Rlci9leGFtcGxlcy9jaGVjay5qc1xyXG4gKi9cclxuZnVuY3Rpb24gS2VldCAoKSB7XHJcbiAgLy8gcHJlcGFyZSB0aGUgc3RvcmUgZm9yIHN0YXRlcywgdGhpcyBpcyB0aGUgaW50ZXJuYWwgc3RhdGUtbWFuYWdlbWVudCBmb3IgdGhlXHJcbiAgLy8gY29tcG9uZW50cy4gUGVyc29uYWxseSBJIG5ldmVyIGdldCB0byBsaWtlIHN0YXRlLW1hbmFnZW1lbnQgaW4gamF2YXNjcmlwdC5cclxuICAvLyBUaGUgaWRlYSBtaWdodCBzb3VuZCBkZXZpbmUgYnV0IHlvdSdsbCBzdHVjayBpbiB2ZXJ5IGNvbXBsaWNhdGVkIGdldC10by1tYXN0ZXJcclxuICAvLyB0aGlzIGZyYW1ld29yay9mbG93IGN5Y2xlcyB3aGVyZSB5b3UgYWx3YXlzIHdyaXRlIHRoZSBzdGF0ZSBpbiBzb21lIGV4dGVybmFsIFxyXG4gIC8vIHN0b3JlIGFuZCB3cml0ZSBsb25nIGxvZ2ljcyB0byBkbyBzbWFsbCBzdHVmZnMgYW5kIHRoZXkgYXJlIHZlcnkgc2xvdy4gT24gdGhlIFxyXG4gIC8vIG90aGVyIGhhbmQsIHRoaXMgaW50ZXJuYWwgc3RvcmUgaXMgcmVsYXRpdmVseSBzaW1wbGUsIGhhcyByZWZlcmFuY2UgYW5kIFxyXG4gIC8vIGFjcm9zcyBtdWx0aXBsZSBjb21wb25lbnRzIGFibGUgdG8gc2hhcmUgdGhlIHN0YXRlIGluIGFueSBjYXNlLlxyXG4gIE9iamVjdC5kZWZpbmVQcm9wZXJ0eSh0aGlzLCAnX19zdGF0ZUxpc3RfXycsIHtcclxuICAgIGVudW1lcmFibGU6IGZhbHNlLFxyXG4gICAgd3JpdGFibGU6IHRydWVcclxuICB9KVxyXG4gIE9iamVjdC5kZWZpbmVQcm9wZXJ0eSh0aGlzLCAnX192aXJ0dWFsTm9kZXNfXycsIHtcclxuICAgIGVudW1lcmFibGU6IGZhbHNlLFxyXG4gICAgd3JpdGFibGU6IHRydWVcclxuICB9KVxyXG59XHJcblxyXG5LZWV0LnByb3RvdHlwZS5tb3VudCA9IGZ1bmN0aW9uIChpbnN0YW5jZSkge1xyXG4gIC8vIEJlZm9yZSB3ZSBiZWdpbiB0byBwYXJzZSBhbiBpbnN0YW5jZSwgZG8gYSBydW4tZG93biBjaGVja3NcclxuICAvLyB0byBjbGVhbiB1cCBiYWNrdGljayBzdHJpbmcgd2hpY2ggdXN1YWxseSBoYXMgbGluZSBzcGFjaW5nXHJcbiAgaWYgKHR5cGVvZiBpbnN0YW5jZSA9PT0gJ29iamVjdCcpIHtcclxuICAgIE9iamVjdC5rZXlzKGluc3RhbmNlKS5tYXAoZnVuY3Rpb24gKGtleSkge1xyXG4gICAgICBpZiAodHlwZW9mIGluc3RhbmNlW2tleV0gPT09ICdzdHJpbmcnKSB7XHJcbiAgICAgICAgaW5zdGFuY2Vba2V5XSA9IGluc3RhbmNlW2tleV0udHJpbSgpLnJlcGxhY2UoL1xccysvZywgJyAnKVxyXG4gICAgICB9IGVsc2UgaWYgKHR5cGVvZiBpbnN0YW5jZVtrZXldID09PSAnb2JqZWN0JyAmJiB0eXBlb2YgaW5zdGFuY2Vba2V5XVsndGVtcGxhdGUnXSA9PT0gJ3N0cmluZycpIHtcclxuICAgICAgICBpbnN0YW5jZVtrZXldWyd0ZW1wbGF0ZSddID0gaW5zdGFuY2Vba2V5XVsndGVtcGxhdGUnXS50cmltKCkucmVwbGFjZSgvXFxzKy9nLCAnICcpXHJcbiAgICAgIH1cclxuICAgIH0pXHJcbiAgfSBlbHNlIGlmICh0eXBlb2YgaW5zdGFuY2UgPT09ICdzdHJpbmcnKSB7XHJcbiAgICBpbnN0YW5jZSA9IGluc3RhbmNlLnRyaW0oKS5yZXBsYWNlKC9cXHMrL2csICcgJylcclxuICB9XHJcbiAgLy8gd2Ugc3RvcmUgdGhlIHByaXN0aW5lIGluc3RhbmNlIGluIENvbXBvbmVudC5iYXNlXHJcbiAgdGhpcy5iYXNlID0gaW5zdGFuY2VcclxuICByZXR1cm4gdGhpc1xyXG59XHJcblxyXG5LZWV0LnByb3RvdHlwZS5mbHVzaCA9IGZ1bmN0aW9uIChpbnN0YW5jZSkge1xyXG4gIC8vIEN1c3RvbSBtZXRob2QgdG8gY2xlYW4gdXAgdGhlIGNvbXBvbmVudCBET00gdHJlZVxyXG4gIC8vIHVzZWZ1bGwgaWYgd2UgbmVlZCB0byBkbyBjbGVhbiB1cCByZXJlbmRlclxyXG4gIHZhciBlbGUgPSBnZXRJZCh0aGlzLmVsKVxyXG4gIGlmIChlbGUpIGVsZS5pbm5lckhUTUwgPSAnJ1xyXG4gIHJldHVybiB0aGlzXHJcbn1cclxuXHJcbktlZXQucHJvdG90eXBlLmxpbmsgPSBmdW5jdGlvbiAoaWQpIHtcclxuICAvLyBUaGUgdGFyZ2V0IERPTSB3aGVyZSB0aGUgcmVuZGVyaW5nIHdpbGwgdG9vayBwbGFjZS5cclxuICAvLyBXZSBjb3VsZCBhbHNvIGFwcGx5IGxpZmVDeWNsZSBtZXRob2QgYmVmb3JlIHRoZVxyXG4gIC8vIHJlbmRlciBoYXBwZW5cclxuICB0aGlzLmVsID0gdGhpcy5lbCB8fCBpZFxyXG4gIGlmICh0aGlzLmNvbXBvbmVudFdpbGxNb3VudCAmJiB0eXBlb2YgdGhpcy5jb21wb25lbnRXaWxsTW91bnQgPT09ICdmdW5jdGlvbicpIHtcclxuICAgIHRoaXMuY29tcG9uZW50V2lsbE1vdW50KClcclxuICB9XHJcbiAgdGhpcy5yZW5kZXIoKVxyXG4gIHJldHVybiB0aGlzXHJcbn1cclxuXHJcbktlZXQucHJvdG90eXBlLnJlbmRlciA9IGZ1bmN0aW9uICgpIHtcclxuICAvLyBSZW5kZXIgdGhpcyBjb21wb25lbnQgdG8gdGhlIHRhcmdldCBET01cclxuICB2YXIgZWxlID0gZ2V0SWQodGhpcy5lbClcclxuICB2YXIgZWxzID0gcGFyc2VTdHIuYXBwbHkodGhpcywgdGhpcy5hcmdzKVxyXG4gIGlmIChlbGUpIHtcclxuICAgIG5leHQuYXBwbHkodGhpcywgWyAwLCBlbGUsIGVscyBdKVxyXG4gIH1cclxuICByZXR1cm4gdGhpc1xyXG59XHJcblxyXG5LZWV0LnByb3RvdHlwZS5jbHVzdGVyID0gZnVuY3Rpb24gKCkge1xyXG4gIC8vIENoYWluIG1ldGhvZCB0byBydW4gZXh0ZXJuYWwgZnVuY3Rpb24ocyksIHRoaXMgYmFzaWNhbGx5IHNlcnZlXHJcbiAgLy8gYXMgaW5pdGlhbGl6ZXIgZm9yIGFsbCBjaGlsZCBjb21wb25lbnRzIHdpdGhpbiB0aGUgaW5zdGFuY2UgdHJlZVxyXG4gIHZhciBhcmdzID0gW10uc2xpY2UuY2FsbChhcmd1bWVudHMpXHJcbiAgaWYgKGFyZ3MubGVuZ3RoID4gMCkge1xyXG4gICAgYXJncy5tYXAoZnVuY3Rpb24gKGYpIHtcclxuICAgICAgaWYgKHR5cGVvZiBmID09PSAnZnVuY3Rpb24nKSBmKClcclxuICAgIH0pXHJcbiAgfVxyXG59XHJcblxyXG5LZWV0LnByb3RvdHlwZS5hZGQgPSBmdW5jdGlvbiAob2JqKSB7XHJcbiAgLy8gTWV0aG9kIHRvIGFkZCBhIG5ldyBvYmplY3QgdG8gY29tcG9uZW50IG1vZGVsXHJcbiAgdmFyIGVsZSA9IGdldElkKHRoaXMuZWwpXHJcbiAgb2JqWydrZWV0LWlkJ10gPSBnZW5JZCgpXHJcbiAgdGhpcy5iYXNlLm1vZGVsID0gdGhpcy5iYXNlLm1vZGVsLmNvbmNhdChvYmopXHJcbiAgZWxlLmFwcGVuZENoaWxkKGdlblRlbXBsYXRlLmNhbGwodGhpcywgb2JqKSlcclxufVxyXG5cclxuS2VldC5wcm90b3R5cGUuZGVzdHJveSA9IGZ1bmN0aW9uIChpZCwgYXR0cikge1xyXG4gIC8vIE1ldGhvZCB0byBkZXN0cm95IGEgc3VibW9kZWwgb2YgYSBjb21wb25lbnRcclxuICB0aGlzLmJhc2UubW9kZWwgPSB0aGlzLmJhc2UubW9kZWwuZmlsdGVyKGZ1bmN0aW9uIChvYmosIGluZGV4KSB7XHJcbiAgICBpZiAoaWQgPT09IG9ialthdHRyXSkge1xyXG4gICAgICB2YXIgbm9kZSA9IHNlbGVjdG9yKG9ialsna2VldC1pZCddKVxyXG4gICAgICBpZiAobm9kZSkgbm9kZS5yZW1vdmUoKVxyXG4gICAgfSBlbHNlIHsgcmV0dXJuIG9iaiB9XHJcbiAgfSlcclxufVxyXG5cclxuS2VldC5wcm90b3R5cGUudXBkYXRlID0gZnVuY3Rpb24gKGlkLCBhdHRyLCBuZXdBdHRyKSB7XHJcbiAgLy8gTWV0aG9kIHRvIHVwZGF0ZSBhIHN1Ym1vZGVsIG9mIGEgY29tcG9uZW50XHJcbiAgdmFyIHNlbGYgPSB0aGlzXHJcbiAgdGhpcy5iYXNlLm1vZGVsID0gdGhpcy5iYXNlLm1vZGVsLm1hcChmdW5jdGlvbiAob2JqLCBpZHgsIG1vZGVsKSB7XHJcbiAgICBpZiAoaWQgPT09IG9ialthdHRyXSkge1xyXG4gICAgICBpZiAobmV3QXR0ciAmJiB0eXBlb2YgbmV3QXR0ciA9PT0gJ29iamVjdCcpIHtcclxuICAgICAgICBPYmplY3QuYXNzaWduKG9iaiwgbmV3QXR0cilcclxuICAgICAgfVxyXG4gICAgICB2YXIgbm9kZSA9IHNlbGVjdG9yKG9ialsna2VldC1pZCddKVxyXG4gICAgICBpZiAobm9kZSkgc2V0RE9NKG5vZGUsIGdlblRlbXBsYXRlLmNhbGwoc2VsZiwgb2JqKSlcclxuICAgIH1cclxuICAgIHJldHVybiBvYmpcclxuICB9KVxyXG59XHJcblxyXG5LZWV0LnByb3RvdHlwZS5yZWdpc3RlciA9IGZ1bmN0aW9uICgpIHtcclxuICB0aGlzLl9fdmlydHVhbE5vZGVzX18gPSBbXS5zbGljZS5jYWxsKGFyZ3VtZW50cylcclxuICByZXR1cm4gdGhpc1xyXG59XHJcblxyXG5tb2R1bGUuZXhwb3J0cyA9IEtlZXRcclxuIiwiJ3VzZSBzdHJpY3QnO1xuXG5mdW5jdGlvbiBwYWQgKGhhc2gsIGxlbikge1xuICB3aGlsZSAoaGFzaC5sZW5ndGggPCBsZW4pIHtcbiAgICBoYXNoID0gJzAnICsgaGFzaDtcbiAgfVxuICByZXR1cm4gaGFzaDtcbn1cblxuZnVuY3Rpb24gZm9sZCAoaGFzaCwgdGV4dCkge1xuICB2YXIgaTtcbiAgdmFyIGNocjtcbiAgdmFyIGxlbjtcbiAgaWYgKHRleHQubGVuZ3RoID09PSAwKSB7XG4gICAgcmV0dXJuIGhhc2g7XG4gIH1cbiAgZm9yIChpID0gMCwgbGVuID0gdGV4dC5sZW5ndGg7IGkgPCBsZW47IGkrKykge1xuICAgIGNociA9IHRleHQuY2hhckNvZGVBdChpKTtcbiAgICBoYXNoID0gKChoYXNoIDw8IDUpIC0gaGFzaCkgKyBjaHI7XG4gICAgaGFzaCB8PSAwO1xuICB9XG4gIHJldHVybiBoYXNoIDwgMCA/IGhhc2ggKiAtMiA6IGhhc2g7XG59XG5cbmZ1bmN0aW9uIGZvbGRPYmplY3QgKGhhc2gsIG8sIHNlZW4pIHtcbiAgcmV0dXJuIE9iamVjdC5rZXlzKG8pLnNvcnQoKS5yZWR1Y2UoZm9sZEtleSwgaGFzaCk7XG4gIGZ1bmN0aW9uIGZvbGRLZXkgKGhhc2gsIGtleSkge1xuICAgIHJldHVybiBmb2xkVmFsdWUoaGFzaCwgb1trZXldLCBrZXksIHNlZW4pO1xuICB9XG59XG5cbmZ1bmN0aW9uIGZvbGRWYWx1ZSAoaW5wdXQsIHZhbHVlLCBrZXksIHNlZW4pIHtcbiAgdmFyIGhhc2ggPSBmb2xkKGZvbGQoZm9sZChpbnB1dCwga2V5KSwgdG9TdHJpbmcodmFsdWUpKSwgdHlwZW9mIHZhbHVlKTtcbiAgaWYgKHZhbHVlID09PSBudWxsKSB7XG4gICAgcmV0dXJuIGZvbGQoaGFzaCwgJ251bGwnKTtcbiAgfVxuICBpZiAodmFsdWUgPT09IHVuZGVmaW5lZCkge1xuICAgIHJldHVybiBmb2xkKGhhc2gsICd1bmRlZmluZWQnKTtcbiAgfVxuICBpZiAodHlwZW9mIHZhbHVlID09PSAnb2JqZWN0Jykge1xuICAgIGlmIChzZWVuLmluZGV4T2YodmFsdWUpICE9PSAtMSkge1xuICAgICAgcmV0dXJuIGZvbGQoaGFzaCwgJ1tDaXJjdWxhcl0nICsga2V5KTtcbiAgICB9XG4gICAgc2Vlbi5wdXNoKHZhbHVlKTtcbiAgICByZXR1cm4gZm9sZE9iamVjdChoYXNoLCB2YWx1ZSwgc2Vlbik7XG4gIH1cbiAgcmV0dXJuIGZvbGQoaGFzaCwgdmFsdWUudG9TdHJpbmcoKSk7XG59XG5cbmZ1bmN0aW9uIHRvU3RyaW5nIChvKSB7XG4gIHJldHVybiBPYmplY3QucHJvdG90eXBlLnRvU3RyaW5nLmNhbGwobyk7XG59XG5cbmZ1bmN0aW9uIHN1bSAobykge1xuICByZXR1cm4gcGFkKGZvbGRWYWx1ZSgwLCBvLCAnJywgW10pLnRvU3RyaW5nKDE2KSwgOCk7XG59XG5cbm1vZHVsZS5leHBvcnRzID0gc3VtO1xuIiwiJ3VzZSBzdHJpY3QnXG5cbnNldERPTS5LRVkgPSAnZGF0YS1rZXknXG5zZXRET00uSUdOT1JFID0gJ2RhdGEtaWdub3JlJ1xuc2V0RE9NLkNIRUNLU1VNID0gJ2RhdGEtY2hlY2tzdW0nXG52YXIgcGFyc2VIVE1MID0gcmVxdWlyZSgnLi9wYXJzZS1odG1sJylcbnZhciBLRVlfUFJFRklYID0gJ19zZXQtZG9tLSdcbnZhciBOT0RFX01PVU5URUQgPSBLRVlfUFJFRklYICsgJ21vdW50ZWQnXG52YXIgRUxFTUVOVF9UWVBFID0gMVxudmFyIERPQ1VNRU5UX1RZUEUgPSA5XG52YXIgRE9DVU1FTlRfRlJBR01FTlRfVFlQRSA9IDExXG5cbi8vIEV4cG9zZSBhcGkuXG5tb2R1bGUuZXhwb3J0cyA9IHNldERPTVxuXG4vKipcbiAqIEBkZXNjcmlwdGlvblxuICogVXBkYXRlcyBleGlzdGluZyBkb20gdG8gbWF0Y2ggYSBuZXcgZG9tLlxuICpcbiAqIEBwYXJhbSB7Tm9kZX0gb2xkTm9kZSAtIFRoZSBodG1sIGVudGl0eSB0byB1cGRhdGUuXG4gKiBAcGFyYW0ge1N0cmluZ3xOb2RlfSBuZXdOb2RlIC0gVGhlIHVwZGF0ZWQgaHRtbChlbnRpdHkpLlxuICovXG5mdW5jdGlvbiBzZXRET00gKG9sZE5vZGUsIG5ld05vZGUpIHtcbiAgLy8gRW5zdXJlIGEgcmVhbGlzaCBkb20gbm9kZSBpcyBwcm92aWRlZC5cbiAgYXNzZXJ0KG9sZE5vZGUgJiYgb2xkTm9kZS5ub2RlVHlwZSwgJ1lvdSBtdXN0IHByb3ZpZGUgYSB2YWxpZCBub2RlIHRvIHVwZGF0ZS4nKVxuXG4gIC8vIEFsaWFzIGRvY3VtZW50IGVsZW1lbnQgd2l0aCBkb2N1bWVudC5cbiAgaWYgKG9sZE5vZGUubm9kZVR5cGUgPT09IERPQ1VNRU5UX1RZUEUpIG9sZE5vZGUgPSBvbGROb2RlLmRvY3VtZW50RWxlbWVudFxuXG4gIC8vIERvY3VtZW50IEZyYWdtZW50cyBkb24ndCBoYXZlIGF0dHJpYnV0ZXMsIHNvIG5vIG5lZWQgdG8gbG9vayBhdCBjaGVja3N1bXMsIGlnbm9yZWQsIGF0dHJpYnV0ZXMsIG9yIG5vZGUgcmVwbGFjZW1lbnQuXG4gIGlmIChuZXdOb2RlLm5vZGVUeXBlID09PSBET0NVTUVOVF9GUkFHTUVOVF9UWVBFKSB7XG4gICAgLy8gU2ltcGx5IHVwZGF0ZSBhbGwgY2hpbGRyZW4gKGFuZCBzdWJjaGlsZHJlbikuXG4gICAgc2V0Q2hpbGROb2RlcyhvbGROb2RlLCBuZXdOb2RlKVxuICB9IGVsc2Uge1xuICAgIC8vIE90aGVyd2lzZSB3ZSBkaWZmIHRoZSBlbnRpcmUgb2xkIG5vZGUuXG4gICAgc2V0Tm9kZShvbGROb2RlLCB0eXBlb2YgbmV3Tm9kZSA9PT0gJ3N0cmluZydcbiAgICAgIC8vIElmIGEgc3RyaW5nIHdhcyBwcm92aWRlZCB3ZSB3aWxsIHBhcnNlIGl0IGFzIGRvbS5cbiAgICAgID8gcGFyc2VIVE1MKG5ld05vZGUsIG9sZE5vZGUubm9kZU5hbWUpXG4gICAgICA6IG5ld05vZGVcbiAgICApXG4gIH1cblxuICAvLyBUcmlnZ2VyIG1vdW50IGV2ZW50cyBvbiBpbml0aWFsIHNldC5cbiAgaWYgKCFvbGROb2RlW05PREVfTU9VTlRFRF0pIHtcbiAgICBvbGROb2RlW05PREVfTU9VTlRFRF0gPSB0cnVlXG4gICAgbW91bnQob2xkTm9kZSlcbiAgfVxufVxuXG4vKipcbiAqIEBwcml2YXRlXG4gKiBAZGVzY3JpcHRpb25cbiAqIFVwZGF0ZXMgYSBzcGVjaWZpYyBodG1sTm9kZSBhbmQgZG9lcyB3aGF0ZXZlciBpdCB0YWtlcyB0byBjb252ZXJ0IGl0IHRvIGFub3RoZXIgb25lLlxuICpcbiAqIEBwYXJhbSB7Tm9kZX0gb2xkTm9kZSAtIFRoZSBwcmV2aW91cyBIVE1MTm9kZS5cbiAqIEBwYXJhbSB7Tm9kZX0gbmV3Tm9kZSAtIFRoZSB1cGRhdGVkIEhUTUxOb2RlLlxuICovXG5mdW5jdGlvbiBzZXROb2RlIChvbGROb2RlLCBuZXdOb2RlKSB7XG4gIGlmIChvbGROb2RlLm5vZGVUeXBlID09PSBuZXdOb2RlLm5vZGVUeXBlKSB7XG4gICAgLy8gSGFuZGxlIHJlZ3VsYXIgZWxlbWVudCBub2RlIHVwZGF0ZXMuXG4gICAgaWYgKG9sZE5vZGUubm9kZVR5cGUgPT09IEVMRU1FTlRfVFlQRSkge1xuICAgICAgLy8gQ2hlY2tzIGlmIG5vZGVzIGFyZSBlcXVhbCBiZWZvcmUgZGlmZmluZy5cbiAgICAgIGlmIChpc0VxdWFsTm9kZShvbGROb2RlLCBuZXdOb2RlKSkgcmV0dXJuXG5cbiAgICAgIC8vIFVwZGF0ZSBhbGwgY2hpbGRyZW4gKGFuZCBzdWJjaGlsZHJlbikuXG4gICAgICBzZXRDaGlsZE5vZGVzKG9sZE5vZGUsIG5ld05vZGUpXG5cbiAgICAgIC8vIFVwZGF0ZSB0aGUgZWxlbWVudHMgYXR0cmlidXRlcyAvIHRhZ05hbWUuXG4gICAgICBpZiAob2xkTm9kZS5ub2RlTmFtZSA9PT0gbmV3Tm9kZS5ub2RlTmFtZSkge1xuICAgICAgICAvLyBJZiB3ZSBoYXZlIHRoZSBzYW1lIG5vZGVuYW1lIHRoZW4gd2UgY2FuIGRpcmVjdGx5IHVwZGF0ZSB0aGUgYXR0cmlidXRlcy5cbiAgICAgICAgc2V0QXR0cmlidXRlcyhvbGROb2RlLmF0dHJpYnV0ZXMsIG5ld05vZGUuYXR0cmlidXRlcylcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIC8vIE90aGVyd2lzZSBjbG9uZSB0aGUgbmV3IG5vZGUgdG8gdXNlIGFzIHRoZSBleGlzdGluZyBub2RlLlxuICAgICAgICB2YXIgbmV3UHJldiA9IG5ld05vZGUuY2xvbmVOb2RlKClcbiAgICAgICAgLy8gQ29weSBvdmVyIGFsbCBleGlzdGluZyBjaGlsZHJlbiBmcm9tIHRoZSBvcmlnaW5hbCBub2RlLlxuICAgICAgICB3aGlsZSAob2xkTm9kZS5maXJzdENoaWxkKSBuZXdQcmV2LmFwcGVuZENoaWxkKG9sZE5vZGUuZmlyc3RDaGlsZClcbiAgICAgICAgLy8gUmVwbGFjZSB0aGUgb3JpZ2luYWwgbm9kZSB3aXRoIHRoZSBuZXcgb25lIHdpdGggdGhlIHJpZ2h0IHRhZy5cbiAgICAgICAgb2xkTm9kZS5wYXJlbnROb2RlLnJlcGxhY2VDaGlsZChuZXdQcmV2LCBvbGROb2RlKVxuICAgICAgfVxuICAgIH0gZWxzZSB7XG4gICAgICAvLyBIYW5kbGUgb3RoZXIgdHlwZXMgb2Ygbm9kZSB1cGRhdGVzICh0ZXh0L2NvbW1lbnRzL2V0YykuXG4gICAgICAvLyBJZiBib3RoIGFyZSB0aGUgc2FtZSB0eXBlIG9mIG5vZGUgd2UgY2FuIHVwZGF0ZSBkaXJlY3RseS5cbiAgICAgIGlmIChvbGROb2RlLm5vZGVWYWx1ZSAhPT0gbmV3Tm9kZS5ub2RlVmFsdWUpIHtcbiAgICAgICAgb2xkTm9kZS5ub2RlVmFsdWUgPSBuZXdOb2RlLm5vZGVWYWx1ZVxuICAgICAgfVxuICAgIH1cbiAgfSBlbHNlIHtcbiAgICAvLyB3ZSBoYXZlIHRvIHJlcGxhY2UgdGhlIG5vZGUuXG4gICAgb2xkTm9kZS5wYXJlbnROb2RlLnJlcGxhY2VDaGlsZChuZXdOb2RlLCBkaXNtb3VudChvbGROb2RlKSlcbiAgICBtb3VudChuZXdOb2RlKVxuICB9XG59XG5cbi8qKlxuICogQHByaXZhdGVcbiAqIEBkZXNjcmlwdGlvblxuICogVXRpbGl0eSB0aGF0IHdpbGwgdXBkYXRlIG9uZSBsaXN0IG9mIGF0dHJpYnV0ZXMgdG8gbWF0Y2ggYW5vdGhlci5cbiAqXG4gKiBAcGFyYW0ge05hbWVkTm9kZU1hcH0gb2xkQXR0cmlidXRlcyAtIFRoZSBwcmV2aW91cyBhdHRyaWJ1dGVzLlxuICogQHBhcmFtIHtOYW1lZE5vZGVNYXB9IG5ld0F0dHJpYnV0ZXMgLSBUaGUgdXBkYXRlZCBhdHRyaWJ1dGVzLlxuICovXG5mdW5jdGlvbiBzZXRBdHRyaWJ1dGVzIChvbGRBdHRyaWJ1dGVzLCBuZXdBdHRyaWJ1dGVzKSB7XG4gIHZhciBpLCBhLCBiLCBucywgbmFtZVxuXG4gIC8vIFJlbW92ZSBvbGQgYXR0cmlidXRlcy5cbiAgZm9yIChpID0gb2xkQXR0cmlidXRlcy5sZW5ndGg7IGktLTspIHtcbiAgICBhID0gb2xkQXR0cmlidXRlc1tpXVxuICAgIG5zID0gYS5uYW1lc3BhY2VVUklcbiAgICBuYW1lID0gYS5sb2NhbE5hbWVcbiAgICBiID0gbmV3QXR0cmlidXRlcy5nZXROYW1lZEl0ZW1OUyhucywgbmFtZSlcbiAgICBpZiAoIWIpIG9sZEF0dHJpYnV0ZXMucmVtb3ZlTmFtZWRJdGVtTlMobnMsIG5hbWUpXG4gIH1cblxuICAvLyBTZXQgbmV3IGF0dHJpYnV0ZXMuXG4gIGZvciAoaSA9IG5ld0F0dHJpYnV0ZXMubGVuZ3RoOyBpLS07KSB7XG4gICAgYSA9IG5ld0F0dHJpYnV0ZXNbaV1cbiAgICBucyA9IGEubmFtZXNwYWNlVVJJXG4gICAgbmFtZSA9IGEubG9jYWxOYW1lXG4gICAgYiA9IG9sZEF0dHJpYnV0ZXMuZ2V0TmFtZWRJdGVtTlMobnMsIG5hbWUpXG4gICAgaWYgKCFiKSB7XG4gICAgICAvLyBBZGQgYSBuZXcgYXR0cmlidXRlLlxuICAgICAgbmV3QXR0cmlidXRlcy5yZW1vdmVOYW1lZEl0ZW1OUyhucywgbmFtZSlcbiAgICAgIG9sZEF0dHJpYnV0ZXMuc2V0TmFtZWRJdGVtTlMoYSlcbiAgICB9IGVsc2UgaWYgKGIudmFsdWUgIT09IGEudmFsdWUpIHtcbiAgICAgIC8vIFVwZGF0ZSBleGlzdGluZyBhdHRyaWJ1dGUuXG4gICAgICBiLnZhbHVlID0gYS52YWx1ZVxuICAgIH1cbiAgfVxufVxuXG4vKipcbiAqIEBwcml2YXRlXG4gKiBAZGVzY3JpcHRpb25cbiAqIFV0aWxpdHkgdGhhdCB3aWxsIG5vZGVzIGNoaWxkZXJuIHRvIG1hdGNoIGFub3RoZXIgbm9kZXMgY2hpbGRyZW4uXG4gKlxuICogQHBhcmFtIHtOb2RlfSBvbGRQYXJlbnQgLSBUaGUgZXhpc3RpbmcgcGFyZW50IG5vZGUuXG4gKiBAcGFyYW0ge05vZGV9IG5ld1BhcmVudCAtIFRoZSBuZXcgcGFyZW50IG5vZGUuXG4gKi9cbmZ1bmN0aW9uIHNldENoaWxkTm9kZXMgKG9sZFBhcmVudCwgbmV3UGFyZW50KSB7XG4gIHZhciBjaGVja09sZCwgb2xkS2V5LCBjaGVja05ldywgbmV3S2V5LCBmb3VuZE5vZGUsIGtleWVkTm9kZXNcbiAgdmFyIG9sZE5vZGUgPSBvbGRQYXJlbnQuZmlyc3RDaGlsZFxuICB2YXIgbmV3Tm9kZSA9IG5ld1BhcmVudC5maXJzdENoaWxkXG4gIHZhciBleHRyYSA9IDBcblxuICAvLyBFeHRyYWN0IGtleWVkIG5vZGVzIGZyb20gcHJldmlvdXMgY2hpbGRyZW4gYW5kIGtlZXAgdHJhY2sgb2YgdG90YWwgY291bnQuXG4gIHdoaWxlIChvbGROb2RlKSB7XG4gICAgZXh0cmErK1xuICAgIGNoZWNrT2xkID0gb2xkTm9kZVxuICAgIG9sZEtleSA9IGdldEtleShjaGVja09sZClcbiAgICBvbGROb2RlID0gb2xkTm9kZS5uZXh0U2libGluZ1xuXG4gICAgaWYgKG9sZEtleSkge1xuICAgICAgaWYgKCFrZXllZE5vZGVzKSBrZXllZE5vZGVzID0ge31cbiAgICAgIGtleWVkTm9kZXNbb2xkS2V5XSA9IGNoZWNrT2xkXG4gICAgfVxuICB9XG5cbiAgLy8gTG9vcCBvdmVyIG5ldyBub2RlcyBhbmQgcGVyZm9ybSB1cGRhdGVzLlxuICBvbGROb2RlID0gb2xkUGFyZW50LmZpcnN0Q2hpbGRcbiAgd2hpbGUgKG5ld05vZGUpIHtcbiAgICBleHRyYS0tXG4gICAgY2hlY2tOZXcgPSBuZXdOb2RlXG4gICAgbmV3Tm9kZSA9IG5ld05vZGUubmV4dFNpYmxpbmdcblxuICAgIGlmIChrZXllZE5vZGVzICYmIChuZXdLZXkgPSBnZXRLZXkoY2hlY2tOZXcpKSAmJiAoZm91bmROb2RlID0ga2V5ZWROb2Rlc1tuZXdLZXldKSkge1xuICAgICAgZGVsZXRlIGtleWVkTm9kZXNbbmV3S2V5XVxuICAgICAgLy8gSWYgd2UgaGF2ZSBhIGtleSBhbmQgaXQgZXhpc3RlZCBiZWZvcmUgd2UgbW92ZSB0aGUgcHJldmlvdXMgbm9kZSB0byB0aGUgbmV3IHBvc2l0aW9uIGlmIG5lZWRlZCBhbmQgZGlmZiBpdC5cbiAgICAgIGlmIChmb3VuZE5vZGUgIT09IG9sZE5vZGUpIHtcbiAgICAgICAgb2xkUGFyZW50Lmluc2VydEJlZm9yZShmb3VuZE5vZGUsIG9sZE5vZGUpXG4gICAgICB9IGVsc2Uge1xuICAgICAgICBvbGROb2RlID0gb2xkTm9kZS5uZXh0U2libGluZ1xuICAgICAgfVxuXG4gICAgICBzZXROb2RlKGZvdW5kTm9kZSwgY2hlY2tOZXcpXG4gICAgfSBlbHNlIGlmIChvbGROb2RlKSB7XG4gICAgICBjaGVja09sZCA9IG9sZE5vZGVcbiAgICAgIG9sZE5vZGUgPSBvbGROb2RlLm5leHRTaWJsaW5nXG4gICAgICBpZiAoZ2V0S2V5KGNoZWNrT2xkKSkge1xuICAgICAgICAvLyBJZiB0aGUgb2xkIGNoaWxkIGhhZCBhIGtleSB3ZSBza2lwIG92ZXIgaXQgdW50aWwgdGhlIGVuZC5cbiAgICAgICAgb2xkUGFyZW50Lmluc2VydEJlZm9yZShjaGVja05ldywgY2hlY2tPbGQpXG4gICAgICAgIG1vdW50KGNoZWNrTmV3KVxuICAgICAgfSBlbHNlIHtcbiAgICAgICAgLy8gT3RoZXJ3aXNlIHdlIGRpZmYgdGhlIHR3byBub24ta2V5ZWQgbm9kZXMuXG4gICAgICAgIHNldE5vZGUoY2hlY2tPbGQsIGNoZWNrTmV3KVxuICAgICAgfVxuICAgIH0gZWxzZSB7XG4gICAgICAvLyBGaW5hbGx5IGlmIHRoZXJlIHdhcyBubyBvbGQgbm9kZSB3ZSBhZGQgdGhlIG5ldyBub2RlLlxuICAgICAgb2xkUGFyZW50LmFwcGVuZENoaWxkKGNoZWNrTmV3KVxuICAgICAgbW91bnQoY2hlY2tOZXcpXG4gICAgfVxuICB9XG5cbiAgLy8gUmVtb3ZlIG9sZCBrZXllZCBub2Rlcy5cbiAgZm9yIChvbGRLZXkgaW4ga2V5ZWROb2Rlcykge1xuICAgIGV4dHJhLS1cbiAgICBvbGRQYXJlbnQucmVtb3ZlQ2hpbGQoZGlzbW91bnQoa2V5ZWROb2Rlc1tvbGRLZXldKSlcbiAgfVxuXG4gIC8vIElmIHdlIGhhdmUgYW55IHJlbWFpbmluZyB1bmtleWVkIG5vZGVzIHJlbW92ZSB0aGVtIGZyb20gdGhlIGVuZC5cbiAgd2hpbGUgKC0tZXh0cmEgPj0gMCkge1xuICAgIG9sZFBhcmVudC5yZW1vdmVDaGlsZChkaXNtb3VudChvbGRQYXJlbnQubGFzdENoaWxkKSlcbiAgfVxufVxuXG4vKipcbiAqIEBwcml2YXRlXG4gKiBAZGVzY3JpcHRpb25cbiAqIFV0aWxpdHkgdG8gdHJ5IHRvIHB1bGwgYSBrZXkgb3V0IG9mIGFuIGVsZW1lbnQuXG4gKiBVc2VzICdkYXRhLWtleScgaWYgcG9zc2libGUgYW5kIGZhbGxzIGJhY2sgdG8gJ2lkJy5cbiAqXG4gKiBAcGFyYW0ge05vZGV9IG5vZGUgLSBUaGUgbm9kZSB0byBnZXQgdGhlIGtleSBmb3IuXG4gKiBAcmV0dXJuIHtzdHJpbmd8dm9pZH1cbiAqL1xuZnVuY3Rpb24gZ2V0S2V5IChub2RlKSB7XG4gIGlmIChub2RlLm5vZGVUeXBlICE9PSBFTEVNRU5UX1RZUEUpIHJldHVyblxuICB2YXIga2V5ID0gbm9kZS5nZXRBdHRyaWJ1dGUoc2V0RE9NLktFWSkgfHwgbm9kZS5pZFxuICBpZiAoa2V5KSByZXR1cm4gS0VZX1BSRUZJWCArIGtleVxufVxuXG4vKipcbiAqIENoZWNrcyBpZiBub2RlcyBhcmUgZXF1YWwgdXNpbmcgdGhlIGZvbGxvd2luZyBieSBjaGVja2luZyBpZlxuICogdGhleSBhcmUgYm90aCBpZ25vcmVkLCBoYXZlIHRoZSBzYW1lIGNoZWNrc3VtLCBvciBoYXZlIHRoZVxuICogc2FtZSBjb250ZW50cy5cbiAqXG4gKiBAcGFyYW0ge05vZGV9IGEgLSBPbmUgb2YgdGhlIG5vZGVzIHRvIGNvbXBhcmUuXG4gKiBAcGFyYW0ge05vZGV9IGIgLSBBbm90aGVyIG5vZGUgdG8gY29tcGFyZS5cbiAqL1xuZnVuY3Rpb24gaXNFcXVhbE5vZGUgKGEsIGIpIHtcbiAgcmV0dXJuIChcbiAgICAvLyBDaGVjayBpZiBib3RoIG5vZGVzIGFyZSBpZ25vcmVkLlxuICAgIChpc0lnbm9yZWQoYSkgJiYgaXNJZ25vcmVkKGIpKSB8fFxuICAgIC8vIENoZWNrIGlmIGJvdGggbm9kZXMgaGF2ZSB0aGUgc2FtZSBjaGVja3N1bS5cbiAgICAoZ2V0Q2hlY2tTdW0oYSkgPT09IGdldENoZWNrU3VtKGIpKSB8fFxuICAgIC8vIEZhbGwgYmFjayB0byBuYXRpdmUgaXNFcXVhbE5vZGUgY2hlY2suXG4gICAgYS5pc0VxdWFsTm9kZShiKVxuICApXG59XG5cbi8qKlxuICogQHByaXZhdGVcbiAqIEBkZXNjcmlwdGlvblxuICogVXRpbGl0eSB0byB0cnkgdG8gcHVsbCBhIGNoZWNrc3VtIGF0dHJpYnV0ZSBmcm9tIGFuIGVsZW1lbnQuXG4gKiBVc2VzICdkYXRhLWNoZWNrc3VtJyBvciB1c2VyIHNwZWNpZmllZCBjaGVja3N1bSBwcm9wZXJ0eS5cbiAqXG4gKiBAcGFyYW0ge05vZGV9IG5vZGUgLSBUaGUgbm9kZSB0byBnZXQgdGhlIGNoZWNrc3VtIGZvci5cbiAqIEByZXR1cm4ge3N0cmluZ3xOYU59XG4gKi9cbmZ1bmN0aW9uIGdldENoZWNrU3VtIChub2RlKSB7XG4gIHJldHVybiBub2RlLmdldEF0dHJpYnV0ZShzZXRET00uQ0hFQ0tTVU0pIHx8IE5hTlxufVxuXG4vKipcbiAqIEBwcml2YXRlXG4gKiBAZGVzY3JpcHRpb25cbiAqIFV0aWxpdHkgdG8gdHJ5IHRvIGNoZWNrIGlmIGFuIGVsZW1lbnQgc2hvdWxkIGJlIGlnbm9yZWQgYnkgdGhlIGFsZ29yaXRobS5cbiAqIFVzZXMgJ2RhdGEtaWdub3JlJyBvciB1c2VyIHNwZWNpZmllZCBpZ25vcmUgcHJvcGVydHkuXG4gKlxuICogQHBhcmFtIHtOb2RlfSBub2RlIC0gVGhlIG5vZGUgdG8gY2hlY2sgaWYgaXQgc2hvdWxkIGJlIGlnbm9yZWQuXG4gKiBAcmV0dXJuIHtib29sZWFufVxuICovXG5mdW5jdGlvbiBpc0lnbm9yZWQgKG5vZGUpIHtcbiAgcmV0dXJuIG5vZGUuZ2V0QXR0cmlidXRlKHNldERPTS5JR05PUkUpICE9IG51bGxcbn1cblxuLyoqXG4gKiBEaXNwYXRjaGVzIGEgbW91bnQgZXZlbnQgZm9yIHRoZSBnaXZlbiBub2RlIGFuZCBjaGlsZHJlbi5cbiAqXG4gKiBAcGFyYW0ge05vZGV9IG5vZGUgLSB0aGUgbm9kZSB0byBtb3VudC5cbiAqIEByZXR1cm4ge25vZGV9XG4gKi9cbmZ1bmN0aW9uIG1vdW50IChub2RlKSB7XG4gIHJldHVybiBkaXNwYXRjaChub2RlLCAnbW91bnQnKVxufVxuXG4vKipcbiAqIERpc3BhdGNoZXMgYSBkaXNtb3VudCBldmVudCBmb3IgdGhlIGdpdmVuIG5vZGUgYW5kIGNoaWxkcmVuLlxuICpcbiAqIEBwYXJhbSB7Tm9kZX0gbm9kZSAtIHRoZSBub2RlIHRvIGRpc21vdW50LlxuICogQHJldHVybiB7bm9kZX1cbiAqL1xuZnVuY3Rpb24gZGlzbW91bnQgKG5vZGUpIHtcbiAgcmV0dXJuIGRpc3BhdGNoKG5vZGUsICdkaXNtb3VudCcpXG59XG5cbi8qKlxuICogUmVjdXJzaXZlbHkgdHJpZ2dlciBhbiBldmVudCBmb3IgYSBub2RlIGFuZCBpdCdzIGNoaWxkcmVuLlxuICogT25seSBlbWl0cyBldmVudHMgZm9yIGtleWVkIG5vZGVzLlxuICpcbiAqIEBwYXJhbSB7Tm9kZX0gbm9kZSAtIHRoZSBpbml0aWFsIG5vZGUuXG4gKiBAcmV0dXJuIHtOb2RlfVxuICovXG5mdW5jdGlvbiBkaXNwYXRjaCAobm9kZSwgdHlwZSkge1xuICAvLyBUcmlnZ2VyIGV2ZW50IGZvciB0aGlzIGVsZW1lbnQgaWYgaXQgaGFzIGEga2V5LlxuICBpZiAoZ2V0S2V5KG5vZGUpKSB7XG4gICAgdmFyIGV2ID0gZG9jdW1lbnQuY3JlYXRlRXZlbnQoJ0V2ZW50JylcbiAgICB2YXIgcHJvcCA9IHsgdmFsdWU6IG5vZGUgfVxuICAgIGV2LmluaXRFdmVudCh0eXBlLCBmYWxzZSwgZmFsc2UpXG4gICAgT2JqZWN0LmRlZmluZVByb3BlcnR5KGV2LCAndGFyZ2V0JywgcHJvcClcbiAgICBPYmplY3QuZGVmaW5lUHJvcGVydHkoZXYsICdzcmNFbGVtZW50JywgcHJvcClcbiAgICBub2RlLmRpc3BhdGNoRXZlbnQoZXYpXG4gIH1cblxuICAvLyBEaXNwYXRjaCB0byBhbGwgY2hpbGRyZW4uXG4gIHZhciBjaGlsZCA9IG5vZGUuZmlyc3RDaGlsZFxuICB3aGlsZSAoY2hpbGQpIGNoaWxkID0gZGlzcGF0Y2goY2hpbGQsIHR5cGUpLm5leHRTaWJsaW5nXG4gIHJldHVybiBub2RlXG59XG5cbi8qKlxuICogQHByaXZhdGVcbiAqIEBkZXNjcmlwdGlvblxuICogQ29uZmlybSB0aGF0IGEgdmFsdWUgaXMgdHJ1dGh5LCB0aHJvd3MgYW4gZXJyb3IgbWVzc2FnZSBvdGhlcndpc2UuXG4gKlxuICogQHBhcmFtIHsqfSB2YWwgLSB0aGUgdmFsIHRvIHRlc3QuXG4gKiBAcGFyYW0ge3N0cmluZ30gbXNnIC0gdGhlIGVycm9yIG1lc3NhZ2Ugb24gZmFpbHVyZS5cbiAqIEB0aHJvd3Mge0Vycm9yfVxuICovXG5mdW5jdGlvbiBhc3NlcnQgKHZhbCwgbXNnKSB7XG4gIGlmICghdmFsKSB0aHJvdyBuZXcgRXJyb3IoJ3NldC1kb206ICcgKyBtc2cpXG59XG4iLCIndXNlIHN0cmljdCdcbnZhciBwYXJzZXIgPSB3aW5kb3cuRE9NUGFyc2VyICYmIG5ldyB3aW5kb3cuRE9NUGFyc2VyKClcbnZhciBkb2N1bWVudFJvb3ROYW1lID0gJ0hUTUwnXG52YXIgc3VwcG9ydHNIVE1MVHlwZSA9IGZhbHNlXG52YXIgc3VwcG9ydHNJbm5lckhUTUwgPSBmYWxzZVxudmFyIGh0bWxUeXBlID0gJ3RleHQvaHRtbCdcbnZhciB4aHRtbFR5cGUgPSAnYXBwbGljYXRpb24veGh0bWwreG1sJ1xudmFyIHRlc3RDbGFzcyA9ICdBJ1xudmFyIHRlc3RDb2RlID0gJzx3YnIgY2xhc3M9XCInICsgdGVzdENsYXNzICsgJ1wiLz4nXG5cbnRyeSB7XG4gIC8vIENoZWNrIGlmIGJyb3dzZXIgc3VwcG9ydHMgdGV4dC9odG1sIERPTVBhcnNlclxuICB2YXIgcGFyc2VkID0gcGFyc2VyLnBhcnNlRnJvbVN0cmluZyh0ZXN0Q29kZSwgaHRtbFR5cGUpLmJvZHkuZmlyc3RDaGlsZFxuICAvLyBTb21lIGJyb3dzZXJzIChpT1MgOSBhbmQgU2FmYXJpIDkpIGxvd2VyY2FzZSBjbGFzc2VzIGZvciBwYXJzZWQgZWxlbWVudHNcbiAgLy8gYnV0IG9ubHkgd2hlbiBhcHBlbmRpbmcgdG8gRE9NLCBzbyB1c2UgaW5uZXJIVE1MIGluc3RlYWRcbiAgdmFyIGQgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdkaXYnKVxuICBkLmFwcGVuZENoaWxkKHBhcnNlZClcbiAgaWYgKGQuZmlyc3RDaGlsZC5jbGFzc0xpc3RbMF0gIT09IHRlc3RDbGFzcykgdGhyb3cgbmV3IEVycm9yKClcbiAgc3VwcG9ydHNIVE1MVHlwZSA9IHRydWVcbn0gY2F0Y2ggKGUpIHt9XG5cbnZhciBtb2NrRG9jID0gZG9jdW1lbnQuaW1wbGVtZW50YXRpb24uY3JlYXRlSFRNTERvY3VtZW50KCcnKVxudmFyIG1vY2tIVE1MID0gbW9ja0RvYy5kb2N1bWVudEVsZW1lbnRcbnZhciBtb2NrQm9keSA9IG1vY2tEb2MuYm9keVxudHJ5IHtcbiAgLy8gQ2hlY2sgaWYgYnJvd3NlciBzdXBwb3J0cyBkb2N1bWVudEVsZW1lbnQuaW5uZXJIVE1MXG4gIG1vY2tIVE1MLmlubmVySFRNTCArPSAnJ1xuICBzdXBwb3J0c0lubmVySFRNTCA9IHRydWVcbn0gY2F0Y2ggKGUpIHtcbiAgLy8gQ2hlY2sgaWYgYnJvd3NlciBzdXBwb3J0cyB4aHRtbCBwYXJzaW5nLlxuICBwYXJzZXIucGFyc2VGcm9tU3RyaW5nKHRlc3RDb2RlLCB4aHRtbFR5cGUpXG4gIHZhciBib2R5UmVnID0gLyg8Ym9keVtePl0qPikoW1xcc1xcU10qKTxcXC9ib2R5Pi9cbn1cblxuZnVuY3Rpb24gRE9NUGFyc2VyUGFyc2UgKG1hcmt1cCwgcm9vdE5hbWUpIHtcbiAgdmFyIGRvYyA9IHBhcnNlci5wYXJzZUZyb21TdHJpbmcobWFya3VwLCBodG1sVHlwZSlcbiAgLy8gUGF0Y2ggZm9yIGlPUyBVSVdlYlZpZXcgbm90IGFsd2F5cyByZXR1cm5pbmcgZG9jLmJvZHkgc3luY2hyb25vdXNseVxuICBpZiAoIWRvYy5ib2R5KSB7IHJldHVybiBmYWxsYmFja1BhcnNlKG1hcmt1cCwgcm9vdE5hbWUpIH1cblxuICByZXR1cm4gcm9vdE5hbWUgPT09IGRvY3VtZW50Um9vdE5hbWVcbiAgICA/IGRvYy5kb2N1bWVudEVsZW1lbnRcbiAgICA6IGRvYy5ib2R5LmZpcnN0Q2hpbGRcbn1cblxuZnVuY3Rpb24gZmFsbGJhY2tQYXJzZSAobWFya3VwLCByb290TmFtZSkge1xuICAvLyBGYWxsYmFjayB0byBpbm5lckhUTUwgZm9yIG90aGVyIG9sZGVyIGJyb3dzZXJzLlxuICBpZiAocm9vdE5hbWUgPT09IGRvY3VtZW50Um9vdE5hbWUpIHtcbiAgICBpZiAoc3VwcG9ydHNJbm5lckhUTUwpIHtcbiAgICAgIG1vY2tIVE1MLmlubmVySFRNTCA9IG1hcmt1cFxuICAgICAgcmV0dXJuIG1vY2tIVE1MXG4gICAgfSBlbHNlIHtcbiAgICAgIC8vIElFOSBkb2VzIG5vdCBzdXBwb3J0IGlubmVyaHRtbCBhdCByb290IGxldmVsLlxuICAgICAgLy8gV2UgZ2V0IGFyb3VuZCB0aGlzIGJ5IHBhcnNpbmcgZXZlcnl0aGluZyBleGNlcHQgdGhlIGJvZHkgYXMgeGh0bWwuXG4gICAgICB2YXIgYm9keU1hdGNoID0gbWFya3VwLm1hdGNoKGJvZHlSZWcpXG4gICAgICBpZiAoYm9keU1hdGNoKSB7XG4gICAgICAgIHZhciBib2R5Q29udGVudCA9IGJvZHlNYXRjaFsyXVxuICAgICAgICB2YXIgc3RhcnRCb2R5ID0gYm9keU1hdGNoLmluZGV4ICsgYm9keU1hdGNoWzFdLmxlbmd0aFxuICAgICAgICB2YXIgZW5kQm9keSA9IHN0YXJ0Qm9keSArIGJvZHlDb250ZW50Lmxlbmd0aFxuICAgICAgICBtYXJrdXAgPSBtYXJrdXAuc2xpY2UoMCwgc3RhcnRCb2R5KSArIG1hcmt1cC5zbGljZShlbmRCb2R5KVxuICAgICAgICBtb2NrQm9keS5pbm5lckhUTUwgPSBib2R5Q29udGVudFxuICAgICAgfVxuXG4gICAgICB2YXIgZG9jID0gcGFyc2VyLnBhcnNlRnJvbVN0cmluZyhtYXJrdXAsIHhodG1sVHlwZSlcbiAgICAgIHZhciBib2R5ID0gZG9jLmJvZHlcbiAgICAgIHdoaWxlIChtb2NrQm9keS5maXJzdENoaWxkKSBib2R5LmFwcGVuZENoaWxkKG1vY2tCb2R5LmZpcnN0Q2hpbGQpXG4gICAgICByZXR1cm4gZG9jLmRvY3VtZW50RWxlbWVudFxuICAgIH1cbiAgfSBlbHNlIHtcbiAgICBtb2NrQm9keS5pbm5lckhUTUwgPSBtYXJrdXBcbiAgICByZXR1cm4gbW9ja0JvZHkuZmlyc3RDaGlsZFxuICB9XG59XG5cbi8qKlxuICogUmV0dXJucyB0aGUgcmVzdWx0cyBvZiBhIERPTVBhcnNlciBhcyBhbiBIVE1MRWxlbWVudC5cbiAqIChTaGltcyBmb3Igb2xkZXIgYnJvd3NlcnMpLlxuICovXG5tb2R1bGUuZXhwb3J0cyA9IHN1cHBvcnRzSFRNTFR5cGVcbiAgPyBET01QYXJzZXJQYXJzZVxuICA6IGZhbGxiYWNrUGFyc2VcbiIsImNvbnN0IEtlZXQgPSByZXF1aXJlKCcuLi9rZWV0JylcclxuY29uc3QgeyBjYW1lbENhc2UgfSA9IHJlcXVpcmUoJy4vdXRpbCcpXHJcbmNvbnN0IHsgaW5mb3JtLCBnZXRJZCB9ID0gcmVxdWlyZSgnLi91dGlsJylcclxuXHJcbi8vIGNvbnN0IGNyZWF0ZVRvZG9Nb2RlbCA9IHJlcXVpcmUoJy4vdG9kb01vZGVsJylcclxuXHJcbmNvbnN0IHsgY3JlYXRlVG9kb01vZGVsLCB0b2RvQXBwIH0gPSByZXF1aXJlKCcuL3RvZG8nKVxyXG5cclxuY29uc3QgbG9nID0gY29uc29sZS5sb2cuYmluZChjb25zb2xlKVxyXG5cclxuY29uc3QgZmlsdGVyUGFnZSA9IFsnYWxsJywgJ2FjdGl2ZScsICdjb21wbGV0ZWQnXVxyXG5cclxuY2xhc3MgQXBwIGV4dGVuZHMgS2VldCB7XHJcblxyXG4gIG1vZGVsID0gY3JlYXRlVG9kb01vZGVsKHRoaXMpXHJcblxyXG4gIHBhZ2UgPSAnQWxsJ1xyXG5cclxuICBpc0NoZWNrZWQgPSAnJ1xyXG5cclxuICBjb3VudCA9IDBcclxuXHJcbiAgcGx1cmFsID0gJydcclxuXHJcbiAgY2xlYXJUb2dnbGUgPSAnbm9uZSdcclxuXHJcbiAgY29tcG9uZW50V2lsbE1vdW50KCkge1xyXG5cclxuICAgIGZpbHRlclBhZ2UubWFwKGYgPT4gdGhpc1tgY18ke2Z9YF0gPSAnJylcclxuICAgIGxvZyh0aGlzLm1vZGVsKVxyXG4gICAgLy8gdGhpcy5tb2RlbC5zdWJzY3JpYmUoIHN0b3JlID0+IHtcclxuICAgIC8vICAgbGV0IG0gPSBzdG9yZS50b2Rvc1xyXG4gICAgLy8gICBsZXQgYyA9IG0uZmlsdGVyKGMgPT4gIWMuY29tcGxldGVkKVxyXG4gICAgLy8gICB0aGlzLnRvZG9TdGF0ZSA9IG0ubGVuZ3RoID8gdHJ1ZSA6IGZhbHNlXHJcbiAgICAvLyAgIHRoaXMucGx1cmFsID0gYy5sZW5ndGggPT09IDEgPyAnJyA6ICdzJ1xyXG4gICAgLy8gICB0aGlzLmNvdW50ID0gYy5sZW5ndGhcclxuICAgIC8vIH0pXHJcbiAgfVxyXG5cclxuICBjb21wb25lbnREaWRNb3VudCgpe1xyXG5cclxuICAgIGlmICh3aW5kb3cubG9jYXRpb24uaGFzaCA9PSAnJykge1xyXG4gICAgICB0aGlzLnVwZGF0ZVVybCgnIy9hbGwnKVxyXG4gICAgICB3aW5kb3cuaGlzdG9yeS5wdXNoU3RhdGUoe30sIG51bGwsICcjL2FsbCcpXHJcbiAgICB9XHJcbiAgICB3aW5kb3cub25wb3BzdGF0ZSA9ICgpID0+IHRoaXMudXBkYXRlVXJsKHdpbmRvdy5sb2NhdGlvbi5oYXNoKVxyXG4gIH1cclxuXHJcbiAgdXBkYXRlVXJsKGhhc2gpIHtcclxuICAgIGZpbHRlclBhZ2UubWFwKGYgPT4ge1xyXG4gICAgICB0aGlzW2BjXyR7Zn1gXSA9IGhhc2guc3BsaXQoJyMvJylbMV0gPT09IGYgPyAnc2VsZWN0ZWQnIDogJydcclxuICAgICAgaWYoaGFzaC5zcGxpdCgnIy8nKVsxXSA9PT0gZikgdGhpcy5wYWdlID0gZi5uYW1lXHJcbiAgICB9KVxyXG4gIH1cclxuXHJcbiAgY3JlYXRlIChldnQpIHtcclxuICAgIGlmKGV2dC5rZXlDb2RlICE9PSAxMykgcmV0dXJuXHJcblxyXG4gICAgLy8gbGV0IG9iaiA9IHtcclxuICAgIC8vICAgdGl0bGU6IGV2dC50YXJnZXQudmFsdWUudHJpbSgpLFxyXG4gICAgLy8gICBjb21wbGV0ZWQ6ICcnLFxyXG4gICAgLy8gICBkaXNwbGF5OiB3aW5kb3cubG9jYXRpb24uaGFzaCA9PSAnIy9hbGwnIHx8IHdpbmRvdy5sb2NhdGlvbi5oYXNoID09ICcjL2FjdGl2ZScgPyAnYmxvY2snIDogJ25vbmUnLFxyXG4gICAgLy8gICBjaGVja2VkOiBmYWxzZVxyXG4gICAgLy8gfVxyXG4gICAgdGhpcy5tb2RlbC5hZGRUb2RvKGV2dC50YXJnZXQudmFsdWUudHJpbSgpKVxyXG4gICAgZXZ0LnRhcmdldC52YWx1ZSA9ICcnXHJcbiAgfVxyXG5cclxuICBjb21wbGV0ZUFsbCgpe1xyXG5cclxuICB9XHJcblxyXG4gIGNsZWFyQ29tcGxldGVkKCl7XHJcblxyXG4gIH1cclxufVxyXG5cclxuY29uc3QgYXBwID0gbmV3IEFwcCgpXHJcblxyXG5sZXQgZmlsdGVyc1RtcGwgPSAnJ1xyXG5cclxuY29uc3QgZmlsdGVycyA9IHBhZ2UgPT4ge1xyXG4gIGxldCBmID0ge1xyXG4gICAgY2xhc3NOYW1lOiBge3tjXyR7cGFnZX19fWAsXHJcbiAgICBoYXNoOiAnIy8nICsgcGFnZSxcclxuICAgIG5hbWU6IGNhbWVsQ2FzZShwYWdlKVxyXG4gIH1cclxuICBmaWx0ZXJzVG1wbCArPSBgPGxpIGstY2xpY2s9XCJ1cGRhdGVVcmwoJHtmLmhhc2h9KVwiPjxhIGNsYXNzPVwiJHtmLmNsYXNzTmFtZX1cIiBocmVmPVwiJHtmLmhhc2h9XCI+JHtmLm5hbWV9PC9hPjwvbGk+YFxyXG59XHJcblxyXG5maWx0ZXJQYWdlLm1hcChwYWdlID0+IGZpbHRlcnMocGFnZSkpXHJcblxyXG5jb25zdCB2bW9kZWwgPSBgXHJcbiAgPHNlY3Rpb24gaWQ9XCJ0b2RvYXBwXCI+XHJcbiAgICA8aGVhZGVyIGlkPVwiaGVhZGVyXCI+XHJcbiAgICAgIDxoMT50b2RvczwvaDE+XHJcbiAgICAgIDxpbnB1dCBpZD1cIm5ldy10b2RvXCIgay1rZXlkb3duPVwiY3JlYXRlKClcIiBwbGFjZWhvbGRlcj1cIldoYXQgbmVlZHMgdG8gYmUgZG9uZT9cIiBhdXRvZm9jdXM+XHJcbiAgICA8L2hlYWRlcj5cclxuICAgIHt7P3RvZG9TdGF0ZX19XHJcbiAgICA8c2VjdGlvbiBpZD1cIm1haW5cIj5cclxuICAgICAgPGlucHV0IGlkPVwidG9nZ2xlLWFsbFwiIHR5cGU9XCJjaGVja2JveFwiIHt7aXNDaGVja2VkfX0gay1jbGljaz1cImNvbXBsZXRlQWxsKClcIj5cclxuICAgICAgPGxhYmVsIGZvcj1cInRvZ2dsZS1hbGxcIj5NYXJrIGFsbCBhcyBjb21wbGV0ZTwvbGFiZWw+XHJcbiAgICAgIDx1bCBpZD1cInRvZG8tbGlzdFwiPjwvdWw+XHJcbiAgICA8L3NlY3Rpb24+XHJcbiAgICA8Zm9vdGVyIGlkPVwiZm9vdGVyXCI+XHJcbiAgICAgIDxzcGFuIGlkPVwidG9kby1jb3VudFwiPlxyXG4gICAgICAgIDxzdHJvbmc+e3tjb3VudH19PC9zdHJvbmc+IGl0ZW17e3BsdXJhbH19IGxlZnRcclxuICAgICAgPC9zcGFuPlxyXG4gICAgICA8dWwgaWQ9XCJmaWx0ZXJzXCI+XHJcbiAgICAgICAgJHtmaWx0ZXJzVG1wbH1cclxuICAgICAgPC91bD5cclxuICAgICAgPGJ1dHRvbiBpZD1cImNsZWFyLWNvbXBsZXRlZFwiIHN0eWxlPVwiZGlzcGxheToge3tjbGVhclRvZ2dsZX19XCIgay1jbGlja2VkPVwiY2xlYXJDb21wbGV0ZWQoKVwiPkNsZWFyIGNvbXBsZXRlZDwvYnV0dG9uPlxyXG4gICAgPC9mb290ZXI+XHJcbiAgICB7ey90b2RvU3RhdGV9fVxyXG4gIDwvc2VjdGlvbj5cclxuICA8Zm9vdGVyIGlkPVwiaW5mb1wiPlxyXG4gICAgPHA+RG91YmxlLWNsaWNrIHRvIGVkaXQgYSB0b2RvPC9wPlxyXG4gICAgPHA+Q3JlYXRlZCBieSA8YSBocmVmPVwiaHR0cHM6Ly9naXRodWIuY29tL3N5YXJ1bFwiPlNoYWhydWwgTml6YW0gU2VsYW1hdDwvYT48L3A+XHJcbiAgICA8cD5QYXJ0IG9mIDxhIGhyZWY9XCJodHRwOi8vdG9kb212Yy5jb21cIj5Ub2RvTVZDPC9hPjwvcD5cclxuICA8L2Zvb3Rlcj5gXHJcblxyXG5hcHAubW91bnQodm1vZGVsKS5yZWdpc3Rlcih0b2RvQXBwKS5saW5rKCd0b2RvJykvLy5jbHVzdGVyKHRvZG9Jbml0KVxyXG5cclxuLy8gY29uc29sZS5sb2coYXBwKVxyXG5cclxubW9kdWxlLmV4cG9ydHMgPSBhcHAiLCJjb25zdCBLZWV0ID0gcmVxdWlyZSgnLi4va2VldCcpXHJcbmNvbnN0IHsgc3RvcmUsIGluZm9ybSB9ID0gcmVxdWlyZSgnLi91dGlsJylcclxuXHJcbmNvbnN0IGxvZyA9IGNvbnNvbGUubG9nLmJpbmQoY29uc29sZSlcclxuXHJcbmxldCBtYWluID0gbnVsbFxyXG5cclxuY2xhc3MgVG9kb0FwcCBleHRlbmRzIEtlZXQge1xyXG4gIFxyXG4gIGFyZ3MgPSBbXS5zbGljZS5jYWxsKGFyZ3VtZW50cylcclxuICBcclxuICBlbCA9ICd0b2RvLWxpc3QnXHJcblxyXG4gIG9uQ2hhbmdlcyA9IFtdXHJcblxyXG4gIGVkaXRNb2RlKGlkKSB7XHJcbiAgICAvLyBBcHAuZWRpdFRvZG9zKGlkLCB0aGlzKVxyXG4gIH1cclxuICB0b2RvRGVzdHJveShpZCwgZXZ0KSB7XHJcbiAgICAvLyB0aGlzLmRlc3Ryb3koaWQsICdrZWV0LWlkJywgZXZ0LnRhcmdldC5wYXJlbnROb2RlLnBhcmVudE5vZGUpXHJcbiAgICAvLyBBcHAudG9kb0Rlc3Ryb3koKVxyXG4gIH1cclxuICBjb21wbGV0ZVRvZG8oaWQsIGV2dCkge1xyXG4gICAgLy8gQXBwLnRvZG9DaGVjayhpZCwgJ2tlZXQtaWQnLCBldnQudGFyZ2V0LnBhcmVudE5vZGUucGFyZW50Tm9kZSlcclxuICB9XHJcbiAgYWRkVG9kbyAodGl0bGUpIHtcclxuICAgIHRoaXMuYWRkKHtcclxuICAgICAgaWQ6IGdlbklkKCksXHJcbiAgICAgIHRpdGxlLFxyXG4gICAgICBjb21wbGV0ZWQ6IGZhbHNlXHJcbiAgICB9KVxyXG4gICAgaW5mb3JtKG1haW4sIHRoaXMuYmFzZS5tb2RlbClcclxuICB9XHJcbiAgc3Vic2NyaWJlKHN0YWNrKSB7XHJcbiAgICB0aGlzLm9uQ2hhbmdlcy5wdXNoKHN0YWNrKVxyXG4gIH1cclxufVxyXG5cclxubG9nKHN0b3JlKCd0b2Rvcy1rZWV0anMnKSlcclxuXHJcbmNvbnN0IHRvZG9BcHAgPSBuZXcgVG9kb0FwcCgnY2hlY2tlZCcpXHJcblxyXG5jb25zdCB2bW9kZWwgPSB7XHJcbiAgdGVtcGxhdGU6IGBcclxuXHQ8bGkgay1kYmxjbGljaz1cImVkaXRNb2RlKHt7aWR9fSlcIiBjbGFzcz1cInt7Y29tcGxldGVkfX1cIiBkYXRhLWlkPVwie3tpZH19XCIgc3R5bGU9XCJkaXNwbGF5OiB7e2Rpc3BsYXl9fVwiPlxyXG5cdFx0PGRpdiBjbGFzcz1cInZpZXdcIj48aW5wdXQgay1jbGljaz1cImNvbXBsZXRlVG9kbyh7e2tlZXQtaWR9fSlcIiBjbGFzcz1cInRvZ2dsZVwiIHR5cGU9XCJjaGVja2JveFwiIGNoZWNrZWQ9XCJ7e2NoZWNrZWR9fVwiPlxyXG5cdFx0XHQ8bGFiZWw+e3t0aXRsZX19PC9sYWJlbD5cclxuXHRcdFx0PGJ1dHRvbiBrLWNsaWNrPVwidG9kb0Rlc3Ryb3koe3trZWV0LWlkfX0pXCIgY2xhc3M9XCJkZXN0cm95XCI+PC9idXR0b24+XHJcblx0XHQ8L2Rpdj5cclxuXHRcdDxpbnB1dCBjbGFzcz1cImVkaXRcIiB2YWx1ZT1cInt7dGl0bGV9fVwiPlxyXG5cdDwvbGk+YCxcclxuICBtb2RlbDogc3RvcmUoJ3RvZG9zLWtlZXRqcycpXHJcbn1cclxuXHJcblxyXG5cclxubW9kdWxlLmV4cG9ydHMgPSB7XHJcbiAgY3JlYXRlVG9kb01vZGVsOiBmdW5jdGlvbihhcHApIHtcclxuICAgIGNvbnNvbGUubG9nKDIpXHJcbiAgICBtYWluID0gYXBwXHJcbiAgICB0b2RvQXBwLm1vdW50KHZtb2RlbClcclxuICB9LFxyXG4gIHRvZG9BcHA6IHRvZG9BcHBcclxufSIsImV4cG9ydHMuaW5mb3JtID0gZnVuY3Rpb24oYmFzZSwgaW5wdXQpIHtcclxuICBmb3IgKHZhciBpID0gYmFzZS5vbkNoYW5nZXMubGVuZ3RoOyBpLS07KSB7XHJcbiAgICBiYXNlLm9uQ2hhbmdlc1tpXShpbnB1dClcclxuICB9XHJcbn1cclxuXHJcbmV4cG9ydHMuc3RvcmUgPSBmdW5jdGlvbihuYW1lc3BhY2UsIGRhdGEpIHtcclxuICBpZiAoYXJndW1lbnRzLmxlbmd0aCA+IDEpIHtcclxuICAgIHJldHVybiBsb2NhbFN0b3JhZ2Uuc2V0SXRlbShuYW1lc3BhY2UsIEpTT04uc3RyaW5naWZ5KGRhdGEpKVxyXG4gIH0gZWxzZSB7XHJcbiAgICB2YXIgc3RvcmUgPSBsb2NhbFN0b3JhZ2UuZ2V0SXRlbShuYW1lc3BhY2UpXHJcbiAgICByZXR1cm4gc3RvcmUgJiYgSlNPTi5wYXJzZShzdG9yZSkgfHwgW11cclxuICB9XHJcbn1cclxuXHJcbmV4cG9ydHMuY2FtZWxDYXNlID0gZnVuY3Rpb24ocykge1xyXG4gIHJldHVybiBzLmNoYXJBdCgwKS50b1VwcGVyQ2FzZSgpICsgcy5zbGljZSgxKVxyXG59XHJcblxyXG5leHBvcnRzLmdlbklkID0gZnVuY3Rpb24oKSB7XHJcbiAgcmV0dXJuIChNYXRoLnJvdW5kKE1hdGgucmFuZG9tKCkgKiAweDEqMWUxMikpLnRvU3RyaW5nKDMyKVxyXG59XHJcblxyXG5leHBvcnRzLmdldElkID0gZnVuY3Rpb24gKGlkKSB7XHJcbiAgcmV0dXJuIGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKGlkKVxyXG59Il19
