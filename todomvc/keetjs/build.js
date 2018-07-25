(function(){function r(e,n,t){function o(i,f){if(!n[i]){if(!e[i]){var c="function"==typeof require&&require;if(!f&&c)return c(i,!0);if(u)return u(i,!0);var a=new Error("Cannot find module '"+i+"'");throw a.code="MODULE_NOT_FOUND",a}var p=n[i]={exports:{}};e[i][0].call(p.exports,function(r){var n=e[i][1][r];return o(n||r)},p,p.exports,r,e,n,t)}return n[i].exports}for(var u="function"==typeof require&&require,i=0;i<t.length;i++)o(t[i]);return o}return r})()({1:[function(require,module,exports){
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

setDOM.key = 'keet-id'

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
 * Keetjs v3.5.2 Alpha release: https://github.com/keetjs/keet.js
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

setDOM.key = 'keet-id'

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
 *
 *    const App extends Keet {
 *      constructor(...args) {
 *        super()
 *        this.args = args
 *      }
 *    }
 *    const app = new App('checked')
 *
 * for example usage cases see https://github.com/syarul/keet/blob/master/examples/check.js
 */
function Keet () {
  // prepare the store for states, this is the internal state-management for the
  // components. Personally I never get to like state-management in javascript.
  // The idea might sound devine but you'll stuck in very complicated get-to-master
  // this framework/flow cycles where you always write the state in some external 
  // store and write long logics to do small stuffs and they are very slow. On the 
  // other hand, this internal store is relatively simple, has references and the 
  // availablity of sharing across multiple components in any case.
  Object.defineProperty(this, '__stateList__', {
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
  this.el = id
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

Keet.prototype.add = function (obj, interceptor) {
  // Method to add a new object to component model
  var self = this
  var ele = getId(this.el)
  obj['keet-id'] = genId()
  this.base.model = this.base.model.concat(obj)
  // if interceptor is declared execute it before node update
  if(interceptor && typeof interceptor === 'function'){
    interceptor.call(this)
  }
  if(ele)
    ele.appendChild(genTemplate.call(this, obj))
  else {
    var t = setInterval(function(){
      if(ele) {
        clearInterval(t)
        ele.appendChild(genTemplate.call(self, obj))
      }
    }, 0)
  }
}

Keet.prototype.destroy = function (id, attr, interceptor) {
  // Method to destroy a submodel of a component
  var self = this
  this.base.model = this.base.model.filter(function (obj, index) {
    if (id === obj[attr]) {
      var node = selector(obj['keet-id'])
      if (node) { 
        // if interceptor is declared execute it before node update
        if(interceptor && typeof interceptor === 'function'){
          interceptor.call(self)
        }
        node.remove() 
      }
    } else { return obj }
  })
}

Keet.prototype.update = function (id, attr, newAttr, interceptor) {
  // Method to update a submodel of a component
  var self = this
  this.base.model = this.base.model.map(function (obj, idx, model) {
    if (id === obj[attr]) {
      if (newAttr && typeof newAttr === 'object') {
        Object.assign(obj, newAttr)
      }
      var node = selector(obj['keet-id'])
      if (node) {
        // if interceptor is declared execute it before node update
        if(interceptor && typeof interceptor === 'function'){
          interceptor.call(self)
        }
        setDOM(node, genTemplate.call(self, obj))
      }
    }
    return obj
  })
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

var _templateObject = _taggedTemplateLiteral(['\n  <section id="todoapp">\n    <header id="header">\n      <h1>todos</h1>\n      <input id="new-todo" k-keydown="create()" placeholder="What needs to be done?" autofocus>\n    </header>\n    {{?todoState}}\n    <section id="main">\n      <input id="toggle-all" type="checkbox" {{isChecked}} k-click="completeAll()">\n      <label for="toggle-all">Mark all as complete</label>\n      <ul id="todo-list" data-ignore></ul>\n    </section>\n    <footer id="footer">\n      <span id="todo-count">\n        <strong>{{count}}</strong> item{{plural}} left\n      </span>\n      <ul id="filters">\n        ', '\n      </ul>\n      <button id="clear-completed" style="display: {{clearToggle}}" k-clicked="clearCompleted()">Clear completed</button>\n    </footer>\n    {{/todoState}}\n  </section>\n  <footer id="info">\n    <p>Double-click to edit a todo</p>\n    <p>Created by <a href="https://github.com/syarul">Shahrul Nizam Selamat</a></p>\n    <p>Part of <a href="http://todomvc.com">TodoMVC</a></p>\n  </footer>'], ['\n  <section id="todoapp">\n    <header id="header">\n      <h1>todos</h1>\n      <input id="new-todo" k-keydown="create()" placeholder="What needs to be done?" autofocus>\n    </header>\n    {{?todoState}}\n    <section id="main">\n      <input id="toggle-all" type="checkbox" {{isChecked}} k-click="completeAll()">\n      <label for="toggle-all">Mark all as complete</label>\n      <ul id="todo-list" data-ignore></ul>\n    </section>\n    <footer id="footer">\n      <span id="todo-count">\n        <strong>{{count}}</strong> item{{plural}} left\n      </span>\n      <ul id="filters">\n        ', '\n      </ul>\n      <button id="clear-completed" style="display: {{clearToggle}}" k-clicked="clearCompleted()">Clear completed</button>\n    </footer>\n    {{/todoState}}\n  </section>\n  <footer id="info">\n    <p>Double-click to edit a todo</p>\n    <p>Created by <a href="https://github.com/syarul">Shahrul Nizam Selamat</a></p>\n    <p>Part of <a href="http://todomvc.com">TodoMVC</a></p>\n  </footer>']);

function _taggedTemplateLiteral(strings, raw) { return Object.freeze(Object.defineProperties(strings, { raw: { value: Object.freeze(raw) } })); }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var Keet = require('../keet');

var _require = require('./util'),
    camelCase = _require.camelCase,
    html = _require.html;

var createTodoModel = require('./todoModel');

var todoApp = require('./todo');

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

    return _ret = (_temp = (_this = _possibleConstructorReturn(this, (_ref = App.__proto__ || Object.getPrototypeOf(App)).call.apply(_ref, [this].concat(args))), _this), _this.model = createTodoModel(todoApp), _this.page = 'All', _this.isChecked = '', _this.count = 0, _this.plural = '', _this.clearToggle = 'none', _temp), _possibleConstructorReturn(_this, _ret);
  }

  _createClass(App, [{
    key: 'componentWillMount',
    value: function componentWillMount() {
      var _this2 = this;

      filterPage.map(function (f) {
        return _this2['c_' + f] = '';
      });

      this.model.subscribe(function (store) {
        var c = store.filter(function (c) {
          return !c.completed;
        });
        _this2.todoState = store.length ? true : false;
        _this2.plural = c.length === 1 ? '' : 's';
        _this2.count = c.length;
      });
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
      this.model.addTodo(evt.target.value.trim());
      evt.target.value = "";
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

var vmodel = html(_templateObject, filtersTmpl);

app.mount(vmodel).link('todo');

},{"../keet":14,"./todo":19,"./todoModel":20,"./util":21}],19:[function(require,module,exports){
'use strict';

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _templateObject = _taggedTemplateLiteral(['\n\t<li k-dblclick="editMode({{keet-id}})" class="{{completed}}">\n\t\t<div class="view"><input k-click="completeTodo({{keet-id}})" class="toggle" type="checkbox" checked="{{checked}}">\n\t\t\t<label>{{title}}</label>\n\t\t\t<button k-click="todoDestroy({{keet-id}})" class="destroy"></button>\n\t\t</div>\n\t\t<input class="edit" value="{{title}}">\n\t</li>'], ['\n\t<li k-dblclick="editMode({{keet-id}})" class="{{completed}}">\n\t\t<div class="view"><input k-click="completeTodo({{keet-id}})" class="toggle" type="checkbox" checked="{{checked}}">\n\t\t\t<label>{{title}}</label>\n\t\t\t<button k-click="todoDestroy({{keet-id}})" class="destroy"></button>\n\t\t</div>\n\t\t<input class="edit" value="{{title}}">\n\t</li>']);

function _taggedTemplateLiteral(strings, raw) { return Object.freeze(Object.defineProperties(strings, { raw: { value: Object.freeze(raw) } })); }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var Keet = require('../keet');

var _require = require('./util'),
    store = _require.store,
    inform = _require.inform,
    genId = _require.genId,
    html = _require.html;

var log = console.log.bind(console);

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
    value: function completeTodo(id, evt) {}
    // App.todoCheck(id, 'keet-id', evt.target.parentNode.parentNode)

    // addTodo (title) {
    //   this.add({
    //     id: genId(),
    //     title,
    //     completed: false
    //   })
    //   inform(main, this.base.model)
    // }
    // subscribe(stack) {
    //   this.onChanges.push(stack)
    // }

  }]);

  return TodoApp;
}(Keet);

var todoApp = new TodoApp('checked');

var vmodel = {
  template: html(_templateObject),
  model: store('todos-keetjs')
};

todoApp.mount(vmodel);

module.exports = todoApp;

// module.exports = function(app) {
//   main = app
//   todoApp.mount(vmodel)
//   return todoApp
// }

},{"../keet":14,"./util":21}],20:[function(require,module,exports){
'use strict';

// const Keet = require('../keet')
var _require = require('./util'),
    store = _require.store;

// note: copy with modification from preact-todomvc

// const todo = require('./todo')

module.exports = function (todo) {

  var onChanges = [];

  function inform() {
    for (var i = onChanges.length; i--;) {
      console.log(this);
      this && onChanges[i](this.base.model);
    }
  }

  var model = {
    // todos: [],

    // onChanges: [],

    subscribe: function subscribe(fn) {
      onChanges.push(fn);
    },
    addTodo: function addTodo(title) {
      var m = {
        title: title,
        completed: ''
        // model.todos = model.todos.concat(m)
      };todo.add(m, inform);
      // console.log(todo)
    }

    /* toggleAll(completed) {
      model.todos = model.todos.map(
        todo => ({ ...todo, completed })
      );
      inform();
    },
      toggle(todoToToggle) {
      model.todos = model.todos.map( todo => (
        todo !== todoToToggle ? todo : ({ ...todo, completed: !todo.completed })
      ) );
      inform();
    },
      destroy(todo) {
      model.todos = model.todos.filter( t => t !== todo );
      inform();
    },
      save(todoToSave, title) {
      model.todos = model.todos.map( todo => (
        todo !== todoToSave ? todo : ({ ...todo, title })
      ));
      inform();
    },
      clearCompleted() {
      model.todos = model.todos.filter( todo => !todo.completed );
      inform();
    } */

  };

  return model;
};

},{"./util":21}],21:[function(require,module,exports){
'use strict';

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

exports.html = function (literalSections) {
  // Use raw literal sections: we don’t want
  // backslashes (\n etc.) to be interpreted
  var raw = literalSections.raw;

  var result = '';

  for (var _len = arguments.length, substs = Array(_len > 1 ? _len - 1 : 0), _key = 1; _key < _len; _key++) {
    substs[_key - 1] = arguments[_key];
  }

  substs.forEach(function (subst, i) {
    // Retrieve the literal section preceding
    // the current substitution
    var lit = raw[i];

    // In the example, map() returns an array:
    // If substitution is an array (and not a string),
    // we turn it into a string
    if (Array.isArray(subst)) {
      subst = subst.join('');
    }

    // If the substitution is preceded by a dollar sign,
    // we escape special characters in it
    if (lit.endsWith('$')) {
      subst = htmlEscape(subst);
      lit = lit.slice(0, -1);
    }
    result += lit;
    result += subst;
  });
  // Take care of last literal section
  // (Never fails, because an empty template string
  // produces one literal section, an empty string)
  result += raw[raw.length - 1]; // (A)

  return result;
};

},{}]},{},[18])
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIkM6L1VzZXJzL3BpcGV5L0FwcERhdGEvUm9hbWluZy9ucG0vbm9kZV9tb2R1bGVzL2Jyb3dzZXJpZnkvbm9kZV9tb2R1bGVzL2Jyb3dzZXItcGFjay9fcHJlbHVkZS5qcyIsImtlZXQvY29tcG9uZW50cy9jb3B5LmpzIiwia2VldC9jb21wb25lbnRzL2dlbkVsZW1lbnQuanMiLCJrZWV0L2NvbXBvbmVudHMvZ2VuVGVtcGxhdGUuanMiLCJrZWV0L2NvbXBvbmVudHMvbm9kZXNWaXNpYmlsaXR5LmpzIiwia2VldC9jb21wb25lbnRzL3BhcnNlU3RyLmpzIiwia2VldC9jb21wb25lbnRzL3Byb2Nlc3NFdmVudC5qcyIsImtlZXQvY29tcG9uZW50cy9zdHJJbnRlcnByZXRlci5qcyIsImtlZXQvY29tcG9uZW50cy90YWcuanMiLCJrZWV0L2NvbXBvbmVudHMvdG1wbEF0dHJIYW5kbGVyLmpzIiwia2VldC9jb21wb25lbnRzL3RtcGxDbGFzc0hhbmRsZXIuanMiLCJrZWV0L2NvbXBvbmVudHMvdG1wbEhhbmRsZXIuanMiLCJrZWV0L2NvbXBvbmVudHMvdG1wbFN0eWxlc0hhbmRsZXIuanMiLCJrZWV0L2NvbXBvbmVudHMvdXRpbHMuanMiLCJrZWV0L2tlZXQuanMiLCJrZWV0L25vZGVfbW9kdWxlcy9oYXNoLXN1bS9oYXNoLXN1bS5qcyIsImtlZXQvbm9kZV9tb2R1bGVzL3NldC1kb20vc3JjL2luZGV4LmpzIiwia2VldC9ub2RlX21vZHVsZXMvc2V0LWRvbS9zcmMvcGFyc2UtaHRtbC5qcyIsInNyYy9hcHAuanMiLCJzcmMvdG9kby5qcyIsInNyYy90b2RvTW9kZWwuanMiLCJzcmMvdXRpbC5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTtBQ0FBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2ZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDMUpBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNoQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDckJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMxRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM5Q0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ1JBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNuQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3ZCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDcEJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMxQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDckJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDdEJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM3TkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMxREE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7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QUFDQTtBQUNBLFFBQUksTUFBTSxPQUFOLENBQWMsS0FBZCxDQUFKLEVBQTBCO0FBQ3RCLGNBQVEsTUFBTSxJQUFOLENBQVcsRUFBWCxDQUFSO0FBQ0g7O0FBRUQ7QUFDQTtBQUNBLFFBQUksSUFBSSxRQUFKLENBQWEsR0FBYixDQUFKLEVBQXVCO0FBQ25CLGNBQVEsV0FBVyxLQUFYLENBQVI7QUFDQSxZQUFNLElBQUksS0FBSixDQUFVLENBQVYsRUFBYSxDQUFDLENBQWQsQ0FBTjtBQUNIO0FBQ0QsY0FBVSxHQUFWO0FBQ0EsY0FBVSxLQUFWO0FBQ0gsR0FwQkQ7QUFxQkE7QUFDQTtBQUNBO0FBQ0EsWUFBVSxJQUFJLElBQUksTUFBSixHQUFXLENBQWYsQ0FBVixDQS9CbUQsQ0ErQnRCOztBQUU3QixTQUFPLE1BQVA7QUFDRCxDQWxDRCIsImZpbGUiOiJnZW5lcmF0ZWQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlc0NvbnRlbnQiOlsiKGZ1bmN0aW9uKCl7ZnVuY3Rpb24gcihlLG4sdCl7ZnVuY3Rpb24gbyhpLGYpe2lmKCFuW2ldKXtpZighZVtpXSl7dmFyIGM9XCJmdW5jdGlvblwiPT10eXBlb2YgcmVxdWlyZSYmcmVxdWlyZTtpZighZiYmYylyZXR1cm4gYyhpLCEwKTtpZih1KXJldHVybiB1KGksITApO3ZhciBhPW5ldyBFcnJvcihcIkNhbm5vdCBmaW5kIG1vZHVsZSAnXCIraStcIidcIik7dGhyb3cgYS5jb2RlPVwiTU9EVUxFX05PVF9GT1VORFwiLGF9dmFyIHA9bltpXT17ZXhwb3J0czp7fX07ZVtpXVswXS5jYWxsKHAuZXhwb3J0cyxmdW5jdGlvbihyKXt2YXIgbj1lW2ldWzFdW3JdO3JldHVybiBvKG58fHIpfSxwLHAuZXhwb3J0cyxyLGUsbix0KX1yZXR1cm4gbltpXS5leHBvcnRzfWZvcih2YXIgdT1cImZ1bmN0aW9uXCI9PXR5cGVvZiByZXF1aXJlJiZyZXF1aXJlLGk9MDtpPHQubGVuZ3RoO2krKylvKHRbaV0pO3JldHVybiBvfXJldHVybiByfSkoKSIsIm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24gKGFyZ3YpIHtcclxuICB2YXIgY29wID0gZnVuY3Rpb24gKHYpIHtcclxuICAgIHZhciBvID0ge31cclxuICAgIGlmICh0eXBlb2YgdiAhPT0gJ29iamVjdCcpIHtcclxuICAgICAgby5jb3B5ID0gdlxyXG4gICAgICByZXR1cm4gby5jb3B5XHJcbiAgICB9IGVsc2Uge1xyXG4gICAgICBmb3IgKHZhciBhdHRyIGluIHYpIHtcclxuICAgICAgICBvW2F0dHJdID0gdlthdHRyXVxyXG4gICAgICB9XHJcbiAgICB9XHJcbiAgICByZXR1cm4gb1xyXG4gIH1cclxuICByZXR1cm4gQXJyYXkuaXNBcnJheShhcmd2KSA/IGFyZ3YubWFwKGZ1bmN0aW9uICh2KSB7IHJldHVybiB2IH0pIDogY29wKGFyZ3YpXHJcbn1cclxuIiwidmFyIGNvcHkgPSByZXF1aXJlKCcuL2NvcHknKVxyXG52YXIgdGFnID0gcmVxdWlyZSgnLi90YWcnKVxyXG52YXIgdG1wbEhhbmRsZXIgPSByZXF1aXJlKCcuL3RtcGxIYW5kbGVyJylcclxudmFyIHRtcGxTdHlsZXNIYW5kbGVyID0gcmVxdWlyZSgnLi90bXBsU3R5bGVzSGFuZGxlcicpXHJcbnZhciB0bXBsQ2xhc3NIYW5kbGVyID0gcmVxdWlyZSgnLi90bXBsQ2xhc3NIYW5kbGVyJylcclxudmFyIHRtcGxBdHRySGFuZGxlciA9IHJlcXVpcmUoJy4vdG1wbEF0dHJIYW5kbGVyJylcclxudmFyIHByb2Nlc3NFdmVudCA9IHJlcXVpcmUoJy4vcHJvY2Vzc0V2ZW50JylcclxudmFyIHNlbGVjdG9yID0gcmVxdWlyZSgnLi91dGlscycpLnNlbGVjdG9yXHJcbnZhciBzdHJJbnRlcnByZXRlciA9IHJlcXVpcmUoJy4vc3RySW50ZXJwcmV0ZXInKVxyXG52YXIgbm9kZXNWaXNpYmlsaXR5ID0gcmVxdWlyZSgnLi9ub2Rlc1Zpc2liaWxpdHknKVxyXG52YXIgc3VtID0gcmVxdWlyZSgnaGFzaC1zdW0nKVxyXG52YXIgc2V0RE9NID0gcmVxdWlyZSgnc2V0LWRvbScpXHJcblxyXG5zZXRET00ua2V5ID0gJ2tlZXQtaWQnXHJcblxyXG52YXIgdXBkYXRlQ29udGV4dCA9IGZ1bmN0aW9uICgpIHtcclxuICB2YXIgc2VsZiA9IHRoaXNcclxuICB2YXIgZWxlXHJcbiAgdmFyIG5ld0VsZW1cclxuICB2YXIgYXJncyA9IFtdLnNsaWNlLmNhbGwoYXJndW1lbnRzKVxyXG4gIGlmICh0eXBlb2YgdGhpcy5iYXNlID09PSAnb2JqZWN0Jykge1xyXG4gICAgT2JqZWN0LmtleXModGhpcy5iYXNlKS5tYXAoZnVuY3Rpb24gKGhhbmRsZXJLZXkpIHtcclxuICAgICAgdmFyIGlkID0gc2VsZi5iYXNlW2hhbmRsZXJLZXldWydrZWV0LWlkJ11cclxuICAgICAgZWxlID0gc2VsZWN0b3IoaWQpXHJcbiAgICAgIGlmICghZWxlICYmIHR5cGVvZiBzZWxmLmJhc2VbaGFuZGxlcktleV0gPT09ICdzdHJpbmcnKSB7XHJcbiAgICAgICAgZWxlID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoc2VsZi5lbClcclxuICAgICAgfVxyXG4gICAgICBuZXdFbGVtID0gZ2VuRWxlbWVudC5hcHBseShzZWxmLCBbc2VsZi5iYXNlW2hhbmRsZXJLZXldXS5jb25jYXQoYXJncykpXHJcbiAgICAgIGlmIChzZWxmLmJhc2UuaGFzT3duUHJvcGVydHkoJ3RlbXBsYXRlJykpIHtcclxuICAgICAgICBuZXdFbGVtLmlkID0gc2VsZi5lbFxyXG4gICAgICB9XHJcbiAgICAgIHNldERPTShlbGUsIG5ld0VsZW0pXHJcbiAgICB9KVxyXG4gIH0gZWxzZSB7XHJcbiAgICBlbGUgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChzZWxmLmVsKVxyXG4gICAgaWYgKGVsZSkge1xyXG4gICAgICBuZXdFbGVtID0gZ2VuRWxlbWVudC5hcHBseShzZWxmLCBbc2VsZi5iYXNlXS5jb25jYXQoYXJncykpXHJcbiAgICAgIG5ld0VsZW0uaWQgPSBzZWxmLmVsXHJcbiAgICAgIHNldERPTShlbGUsIG5ld0VsZW0pXHJcbiAgICB9XHJcbiAgfVxyXG59XHJcblxyXG52YXIgbmV4dFN0YXRlID0gZnVuY3Rpb24gKGksIGFyZ3MpIHtcclxuICB2YXIgc2VsZiA9IHRoaXNcclxuICBpZiAoaSA8IHRoaXMuX19zdGF0ZUxpc3RfXy5sZW5ndGgpIHtcclxuICAgIHZhciBzdGF0ZSA9IHRoaXMuX19zdGF0ZUxpc3RfX1tpXVxyXG4gICAgdmFyIHZhbHVlID0gdGhpc1tzdGF0ZV1cclxuICAgIC8vIGlmIHZhbHVlIGlzIHVuZGVmaW5lZCwgbGlrZWx5IGhhcyBvYmplY3Qgbm90YXRpb24gd2UgY29udmVydCBpdCB0byBhcnJheVxyXG4gICAgaWYgKHZhbHVlID09PSB1bmRlZmluZWQpIHZhbHVlID0gc3RySW50ZXJwcmV0ZXIoc3RhdGUpXHJcblxyXG4gICAgaWYgKHZhbHVlICYmIEFycmF5LmlzQXJyYXkodmFsdWUpKSB7XHJcbiAgICAgIC8vIHVzaW5nIHNwbGl0IG9iamVjdCBub3RhdGlvbiBhcyBiYXNlIGZvciBzdGF0ZSB1cGRhdGVcclxuICAgICAgdmFyIGluVmFsID0gdGhpc1t2YWx1ZVswXV1bdmFsdWVbMV1dXHJcbiAgICAgIE9iamVjdC5kZWZpbmVQcm9wZXJ0eSh0aGlzW3ZhbHVlWzBdXSwgdmFsdWVbMV0sIHtcclxuICAgICAgICBlbnVtZXJhYmxlOiBmYWxzZSxcclxuICAgICAgICBjb25maWd1cmFibGU6IHRydWUsXHJcbiAgICAgICAgZ2V0OiBmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgICByZXR1cm4gaW5WYWxcclxuICAgICAgICB9LFxyXG4gICAgICAgIHNldDogZnVuY3Rpb24gKHZhbCkge1xyXG4gICAgICAgICAgaW5WYWwgPSB2YWxcclxuICAgICAgICAgIHVwZGF0ZUNvbnRleHQuYXBwbHkoc2VsZiwgYXJncylcclxuICAgICAgICB9XHJcbiAgICAgIH0pXHJcbiAgICB9IGVsc2Uge1xyXG4gICAgICAvLyBoYW5kbGUgcGFyZW50IHN0YXRlIHVwZGF0ZSBpZiB0aGUgc3RhdGUgaXMgbm90IGFuIG9iamVjdFxyXG4gICAgICBPYmplY3QuZGVmaW5lUHJvcGVydHkodGhpcywgc3RhdGUsIHtcclxuICAgICAgICBlbnVtZXJhYmxlOiBmYWxzZSxcclxuICAgICAgICBjb25maWd1cmFibGU6IHRydWUsXHJcbiAgICAgICAgZ2V0OiBmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgICByZXR1cm4gdmFsdWVcclxuICAgICAgICB9LFxyXG4gICAgICAgIHNldDogZnVuY3Rpb24gKHZhbCkge1xyXG4gICAgICAgICAgdmFsdWUgPSB2YWxcclxuICAgICAgICAgIHVwZGF0ZUNvbnRleHQuYXBwbHkoc2VsZiwgYXJncylcclxuICAgICAgICB9XHJcbiAgICAgIH0pXHJcbiAgICB9XHJcbiAgICBpKytcclxuICAgIG5leHRTdGF0ZS5hcHBseSh0aGlzLCBbIGksIGFyZ3MgXSlcclxuICB9IGVsc2Uge1xyXG4gICAgLy9cclxuICB9XHJcbn1cclxuXHJcbnZhciBzZXRTdGF0ZSA9IGZ1bmN0aW9uIChhcmdzKSB7XHJcbiAgbmV4dFN0YXRlLmFwcGx5KHRoaXMsIFsgMCwgYXJncyBdKVxyXG59XHJcblxyXG52YXIgdXBkYXRlU3RhdGVMaXN0ID0gZnVuY3Rpb24gKHN0YXRlKSB7XHJcbiAgdGhpcy5fX3N0YXRlTGlzdF9fID0gdGhpcy5fX3N0YXRlTGlzdF9fLmNvbmNhdChzdGF0ZSlcclxufVxyXG5cclxudmFyIGdlbkVsZW1lbnQgPSBmdW5jdGlvbiAoKSB7XHJcbiAgdmFyIGNoaWxkID0gW10uc2hpZnQuY2FsbChhcmd1bWVudHMpXHJcbiAgdmFyIGFyZ3MgPSBbXS5zbGljZS5jYWxsKGFyZ3VtZW50cylcclxuXHJcbiAgdmFyIHRlbXBEaXYgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdkaXYnKVxyXG4gIHZhciBjbG9uZUNoaWxkID0gY29weShjaGlsZClcclxuICBkZWxldGUgY2xvbmVDaGlsZC50ZW1wbGF0ZVxyXG4gIGRlbGV0ZSBjbG9uZUNoaWxkLnRhZ1xyXG4gIGRlbGV0ZSBjbG9uZUNoaWxkLnN0eWxlXHJcbiAgZGVsZXRlIGNsb25lQ2hpbGQuY2xhc3NcclxuICAvLyBwcm9jZXNzIHRlbXBsYXRlIGlmIGhhcyBoYW5kbGViYXJzIHZhbHVlXHJcbiAgdGhpcy5fX3N0YXRlTGlzdF9fID0gW11cclxuXHJcbiAgdmFyIHRwbCA9IGNoaWxkLnRlbXBsYXRlXHJcbiAgICA/IHRtcGxIYW5kbGVyLmNhbGwodGhpcywgY2hpbGQudGVtcGxhdGUsIHVwZGF0ZVN0YXRlTGlzdC5iaW5kKHRoaXMpKVxyXG4gICAgOiB0eXBlb2YgY2hpbGQgPT09ICdzdHJpbmcnID8gdG1wbEhhbmRsZXIuY2FsbCh0aGlzLCBjaGlsZCwgdXBkYXRlU3RhdGVMaXN0LmJpbmQodGhpcykpIDogbnVsbFxyXG4gIC8vIHByb2Nlc3Mgc3R5bGVzIGlmIGhhcyBoYW5kbGViYXJzIHZhbHVlXHJcbiAgdmFyIHN0eWxlVHBsID0gdG1wbFN0eWxlc0hhbmRsZXIuY2FsbCh0aGlzLCBjaGlsZC5zdHlsZSwgdXBkYXRlU3RhdGVMaXN0LmJpbmQodGhpcykpXHJcbiAgLy8gcHJvY2VzcyBjbGFzc2VzIGlmIGhhcyBoYW5kbGViYXJzIHZhbHVlXHJcbiAgdmFyIGNsYXNzVHBsID0gdG1wbENsYXNzSGFuZGxlci5jYWxsKHRoaXMsIGNoaWxkLCB1cGRhdGVTdGF0ZUxpc3QuYmluZCh0aGlzKSlcclxuICBpZiAoY2xhc3NUcGwpIGNsb25lQ2hpbGQuY2xhc3MgPSBjbGFzc1RwbFxyXG4gIC8vIGN1c3RvbSBhdHRyaWJ1dGVzIGhhbmRsZXJcclxuICBpZiAoYXJncyAmJiBhcmdzLmxlbmd0aCkge1xyXG4gICAgdG1wbEF0dHJIYW5kbGVyLmFwcGx5KHRoaXMsIFsgY2xvbmVDaGlsZCBdLmNvbmNhdChhcmdzKSlcclxuICB9XHJcblxyXG4gIHZhciBzID0gY2hpbGQudGFnXHJcbiAgICA/IHRhZyhjaGlsZC50YWcsIC8vIGh0bWwgdGFnXHJcbiAgICAgIHRwbCB8fCAnJywgLy8gbm9kZVZhbHVlXHJcbiAgICAgIGNsb25lQ2hpbGQsIC8vIGF0dHJpYnV0ZXMgaW5jbHVkaW5nIGNsYXNzZXNcclxuICAgICAgc3R5bGVUcGwgLy8gaW5saW5lIHN0eWxlc1xyXG4gICAgKSA6IHRwbCAvLyBmYWxsYmFjayBpZiBub24gZXhpc3QsIHJlbmRlciB0aGUgdGVtcGxhdGUgYXMgc3RyaW5nXHJcblxyXG4gIHMgPSBub2Rlc1Zpc2liaWxpdHkuY2FsbCh0aGlzLCBzKVxyXG4gIHRlbXBEaXYuaW5uZXJIVE1MID0gc1xyXG4gIHRlbXBEaXYuY2hpbGROb2Rlcy5mb3JFYWNoKGZ1bmN0aW9uIChjKSB7XHJcbiAgICBpZiAoYy5ub2RlVHlwZSA9PT0gMSkge1xyXG4gICAgICBjLnNldEF0dHJpYnV0ZSgnZGF0YS1jaGVja3N1bScsIHN1bShjLm91dGVySFRNTCkpXHJcbiAgICB9XHJcbiAgfSlcclxuICBpZiAoY2hpbGQudGFnID09PSAnaW5wdXQnKSB7XHJcbiAgICBpZiAoY2xvbmVDaGlsZC5jaGVja2VkKSB7XHJcbiAgICAgIHRlbXBEaXYuY2hpbGROb2Rlc1swXS5zZXRBdHRyaWJ1dGUoJ2NoZWNrZWQnLCAnJylcclxuICAgIH0gZWxzZSB7XHJcbiAgICAgIHRlbXBEaXYuY2hpbGROb2Rlc1swXS5yZW1vdmVBdHRyaWJ1dGUoJ2NoZWNrZWQnKVxyXG4gICAgfVxyXG4gIH1cclxuXHJcbiAgc2V0U3RhdGUuY2FsbCh0aGlzLCBhcmdzKVxyXG5cclxuICBwcm9jZXNzRXZlbnQuY2FsbCh0aGlzLCB0ZW1wRGl2KVxyXG4gIHJldHVybiB0eXBlb2YgY2hpbGQgPT09ICdzdHJpbmcnXHJcbiAgICA/IHRlbXBEaXZcclxuICAgIDogY2hpbGQudGFnID8gdGVtcERpdi5jaGlsZE5vZGVzWzBdXHJcbiAgICAgIDogdGVtcERpdlxyXG59XHJcblxyXG5leHBvcnRzLmdlbkVsZW1lbnQgPSBnZW5FbGVtZW50XHJcbmV4cG9ydHMuc2V0U3RhdGUgPSBzZXRTdGF0ZVxyXG5leHBvcnRzLnVwZGF0ZVN0YXRlTGlzdCA9IHVwZGF0ZVN0YXRlTGlzdFxyXG4iLCJ2YXIgcHJvY2Vzc0V2ZW50ID0gcmVxdWlyZSgnLi9wcm9jZXNzRXZlbnQnKVxyXG5cclxudmFyIHRtcGwgPSAnJ1xyXG5cclxuZnVuY3Rpb24gbmV4dCAoaSwgb2JqLCBhcnJQcm9wcywgYXJncykge1xyXG4gIGlmIChpIDwgYXJyUHJvcHMubGVuZ3RoKSB7XHJcbiAgICB2YXIgcmVwID0gYXJyUHJvcHNbaV0ucmVwbGFjZSgve3soW157fV0rKX19L2csICckMScpXHJcbiAgICB0bXBsID0gdG1wbC5yZXBsYWNlKC97eyhbXnt9XSspfX0vLCBvYmpbcmVwXSlcclxuICAgIGlmIChhcmdzICYmIH5hcmdzLmluZGV4T2YocmVwKSAmJiAhb2JqW3JlcF0pIHtcclxuICAgICAgdmFyIHJlID0gbmV3IFJlZ0V4cCgnICcgKyByZXAgKyAnPVwiJyArIG9ialtyZXBdICsgJ1wiJywgJ2cnKVxyXG4gICAgICB0bXBsID0gdG1wbC5yZXBsYWNlKHJlLCAnJylcclxuICAgIH1cclxuICAgIGkrK1xyXG4gICAgbmV4dChpLCBvYmosIGFyclByb3BzLCBhcmdzKVxyXG4gIH0gZWxzZSB7XHJcblxyXG4gIH1cclxufVxyXG5cclxubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbiAob2JqKSB7XHJcbiAgdmFyIGFyZ3MgPSB0aGlzLmFyZ3NcclxuICB2YXIgYXJyUHJvcHMgPSB0aGlzLmJhc2UudGVtcGxhdGUubWF0Y2goL3t7KFtee31dKyl9fS9nKVxyXG4gIHZhciB0ZW1wRGl2XHJcbiAgdG1wbCA9IHRoaXMuYmFzZS50ZW1wbGF0ZVxyXG4gIG5leHQoMCwgb2JqLCBhcnJQcm9wcywgYXJncylcclxuICB0ZW1wRGl2ID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnZGl2JylcclxuICB0ZW1wRGl2LmlubmVySFRNTCA9IHRtcGxcclxuICB2YXIgaXNldnQgPSAvIGstLy50ZXN0KHRtcGwpXHJcbiAgaWYgKGlzZXZ0KSB7IHByb2Nlc3NFdmVudC5jYWxsKHRoaXMsIHRlbXBEaXYpIH1cclxuICB0ZW1wRGl2LmNoaWxkTm9kZXNbMF0uc2V0QXR0cmlidXRlKCdrZWV0LWlkJywgb2JqWydrZWV0LWlkJ10pXHJcbiAgcmV0dXJuIHRlbXBEaXYuY2hpbGROb2Rlc1swXVxyXG59XHJcbiIsIm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24gKHN0cmluZykge1xyXG4gIHZhciBzZWxmID0gdGhpc1xyXG4gIHRoaXMuX19zdGF0ZUxpc3RfXy5tYXAoZnVuY3Rpb24gKHN0YXRlKSB7XHJcbiAgICBpZiAoIXNlbGZbc3RhdGVdKSB7XHJcbiAgICAgIHZhciBmID0gJ1xcXFx7XFxcXHtcXFxcPycgKyBzdGF0ZSArICdcXFxcfVxcXFx9J1xyXG4gICAgICB2YXIgYiA9ICdcXFxce1xcXFx7XFxcXC8nICsgc3RhdGUgKyAnXFxcXH1cXFxcfSdcclxuICAgICAgLy8gdmFyIHJlZ3ggPSAnKD88PScgKyBmICsgJykoLio/KSg/PScgKyBiICsgJyknXHJcbiAgICAgIC8vICoqIG9sZCBicm93c2VyIGRvZXMgbm90IHN1cHBvcnQgcG9zaXRpdmUgbG9vayBiZWhpbmQgKipcclxuICAgICAgdmFyIHJlZ3ggPSAnKCcgKyBmICsgJykoLio/KSg/PScgKyBiICsgJyknXHJcbiAgICAgIHZhciByZSA9IG5ldyBSZWdFeHAocmVneClcclxuICAgICAgdmFyIGlzQ29uZGl0aW9uYWwgPSByZS50ZXN0KHN0cmluZylcclxuICAgICAgdmFyIG1hdGNoID0gc3RyaW5nLm1hdGNoKHJlKVxyXG4gICAgICBpZiAoaXNDb25kaXRpb25hbCAmJiBtYXRjaCkge1xyXG4gICAgICAgIHN0cmluZyA9IHN0cmluZy5yZXBsYWNlKG1hdGNoWzJdLCAnJylcclxuICAgICAgfVxyXG4gICAgfVxyXG4gICAgc3RyaW5nID0gc3RyaW5nLnJlcGxhY2UoJ3t7PycgKyBzdGF0ZSArICd9fScsICcnKVxyXG4gICAgc3RyaW5nID0gc3RyaW5nLnJlcGxhY2UoJ3t7LycgKyBzdGF0ZSArICd9fScsICcnKVxyXG4gIH0pXHJcbiAgcmV0dXJuIHN0cmluZ1xyXG59XG4iLCJ2YXIgZ2VuRWxlbWVudCA9IHJlcXVpcmUoJy4vZ2VuRWxlbWVudCcpLmdlbkVsZW1lbnRcclxudmFyIHNldFN0YXRlID0gcmVxdWlyZSgnLi9nZW5FbGVtZW50Jykuc2V0U3RhdGVcclxudmFyIHRtcGxIYW5kbGVyID0gcmVxdWlyZSgnLi90bXBsSGFuZGxlcicpXHJcbnZhciBwcm9jZXNzRXZlbnQgPSByZXF1aXJlKCcuL3Byb2Nlc3NFdmVudCcpXHJcbnZhciBnZW5JZCA9IHJlcXVpcmUoJy4vdXRpbHMnKS5nZW5JZFxyXG52YXIgZ2VuVGVtcGxhdGUgPSByZXF1aXJlKCcuL2dlblRlbXBsYXRlJylcclxudmFyIG5vZGVzVmlzaWJpbGl0eSA9IHJlcXVpcmUoJy4vbm9kZXNWaXNpYmlsaXR5JylcclxudmFyIHN1bSA9IHJlcXVpcmUoJ2hhc2gtc3VtJylcclxuXHJcbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24gKCkge1xyXG4gIHZhciBzZWxmID0gdGhpc1xyXG4gIHZhciBlbGVtQXJyID0gW11cclxuICB2YXIgYXJncyA9IFtdLnNsaWNlLmNhbGwoYXJndW1lbnRzKVxyXG4gIGlmIChBcnJheS5pc0FycmF5KHRoaXMuYmFzZS5tb2RlbCkpIHtcclxuICAgIC8vIGRvIGFycmF5IGJhc2VcclxuICAgIHRoaXMuYmFzZS50ZW1wbGF0ZSA9IHRoaXMuYmFzZS50ZW1wbGF0ZS50cmltKCkucmVwbGFjZSgvXFxzKy9nLCAnICcpXHJcblxyXG4gICAgLy8gZ2VuZXJhdGUgaWQgZm9yIHNlbGVjdG9yXHJcbiAgICB0aGlzLmJhc2UubW9kZWwgPSB0aGlzLmJhc2UubW9kZWwubWFwKGZ1bmN0aW9uIChtKSB7XHJcbiAgICAgIG1bJ2tlZXQtaWQnXSA9IGdlbklkKClcclxuICAgICAgcmV0dXJuIG1cclxuICAgIH0pXHJcbiAgICB0aGlzLmJhc2UubW9kZWwubWFwKGZ1bmN0aW9uIChtKSB7XHJcbiAgICAgIGVsZW1BcnIucHVzaChnZW5UZW1wbGF0ZS5jYWxsKHNlbGYsIG0pKVxyXG4gICAgfSlcclxuICB9IGVsc2UgaWYgKHR5cGVvZiB0aGlzLmJhc2UgPT09ICdvYmplY3QnKSB7XHJcbiAgICAvLyBkbyBvYmplY3QgYmFzZVxyXG4gICAgT2JqZWN0LmtleXModGhpcy5iYXNlKS5tYXAoZnVuY3Rpb24gKGtleSkge1xyXG4gICAgICB2YXIgY2hpbGQgPSBzZWxmLmJhc2Vba2V5XVxyXG4gICAgICBpZiAoY2hpbGQgJiYgdHlwZW9mIGNoaWxkID09PSAnb2JqZWN0Jykge1xyXG4gICAgICAgIHZhciBpZCA9IGdlbklkKClcclxuICAgICAgICBjaGlsZFsna2VldC1pZCddID0gaWRcclxuICAgICAgICBzZWxmLmJhc2Vba2V5XVsna2VldC1pZCddID0gaWRcclxuICAgICAgICB2YXIgbmV3RWxlbWVudCA9IGdlbkVsZW1lbnQuYXBwbHkoc2VsZiwgW2NoaWxkXS5jb25jYXQoYXJncykpXHJcbiAgICAgICAgZWxlbUFyci5wdXNoKG5ld0VsZW1lbnQpXHJcbiAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgc2VsZi5fX3N0YXRlTGlzdF9fID0gW11cclxuICAgICAgICB2YXIgdHBsID0gdG1wbEhhbmRsZXIuY2FsbChzZWxmLCBjaGlsZCwgZnVuY3Rpb24gKHN0YXRlKSB7XHJcbiAgICAgICAgICBzZWxmLl9fc3RhdGVMaXN0X18gPSBzZWxmLl9fc3RhdGVMaXN0X18uY29uY2F0KHN0YXRlKVxyXG4gICAgICAgIH0pXHJcbiAgICAgICAgdHBsID0gbm9kZXNWaXNpYmlsaXR5LmNhbGwoc2VsZiwgdHBsKVxyXG4gICAgICAgIHZhciB0ZW1wRGl2ID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnZGl2JylcclxuICAgICAgICB0ZW1wRGl2LmlubmVySFRNTCA9IHRwbFxyXG4gICAgICAgIHNldFN0YXRlLmNhbGwoc2VsZiwgYXJncylcclxuICAgICAgICBwcm9jZXNzRXZlbnQuY2FsbChzZWxmLCB0ZW1wRGl2KVxyXG4gICAgICAgIHRlbXBEaXYuY2hpbGROb2Rlcy5mb3JFYWNoKGZ1bmN0aW9uIChjKSB7XHJcbiAgICAgICAgICBpZiAoYy5ub2RlVHlwZSA9PT0gMSkge1xyXG4gICAgICAgICAgICBjLnNldEF0dHJpYnV0ZSgnZGF0YS1jaGVja3N1bScsIHN1bShjLm91dGVySFRNTCkpXHJcbiAgICAgICAgICB9XHJcbiAgICAgICAgICBlbGVtQXJyLnB1c2goYylcclxuICAgICAgICB9KVxyXG4gICAgICB9XHJcbiAgICB9KVxyXG4gIH0gZWxzZSBpZiAodHlwZW9mIHRoaXMuYmFzZSA9PT0gJ3N0cmluZycpIHtcclxuICAgIHRoaXMuX19zdGF0ZUxpc3RfXyA9IFtdXHJcbiAgICB2YXIgdHBsID0gdG1wbEhhbmRsZXIuY2FsbCh0aGlzLCB0aGlzLmJhc2UsIGZ1bmN0aW9uIChzdGF0ZSkge1xyXG4gICAgICBzZWxmLl9fc3RhdGVMaXN0X18gPSBzZWxmLl9fc3RhdGVMaXN0X18uY29uY2F0KHN0YXRlKVxyXG4gICAgfSlcclxuXHJcbiAgICB0cGwgPSBub2Rlc1Zpc2liaWxpdHkuY2FsbCh0aGlzLCB0cGwpXHJcbiAgICB2YXIgdGVtcERpdiA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2RpdicpXHJcbiAgICB0ZW1wRGl2LmlubmVySFRNTCA9IHRwbFxyXG4gICAgc2V0U3RhdGUuY2FsbCh0aGlzLCBhcmdzKVxyXG4gICAgcHJvY2Vzc0V2ZW50LmNhbGwodGhpcywgdGVtcERpdilcclxuICAgIHRlbXBEaXYuY2hpbGROb2Rlcy5mb3JFYWNoKGZ1bmN0aW9uIChjKSB7XHJcbiAgICAgIGlmIChjLm5vZGVUeXBlID09PSAxKSB7XHJcbiAgICAgICAgYy5zZXRBdHRyaWJ1dGUoJ2RhdGEtY2hlY2tzdW0nLCBzdW0oYy5vdXRlckhUTUwpKVxyXG4gICAgICB9XHJcbiAgICAgIGVsZW1BcnIucHVzaChjKVxyXG4gICAgfSlcclxuICB9XHJcblxyXG4gIHJldHVybiBlbGVtQXJyXHJcbn1cclxuIiwidmFyIGxvb3BDaGlsZHMgPSByZXF1aXJlKCcuL3V0aWxzJykubG9vcENoaWxkc1xyXG5cclxudmFyIG5leHQgPSBmdW5jdGlvbiAoaSwgYywgcmVtKSB7XHJcbiAgdmFyIGhhc2tcclxuICB2YXIgZXZ0TmFtZVxyXG4gIHZhciBldnRoYW5kbGVyXHJcbiAgdmFyIGhhbmRsZXJcclxuICB2YXIgaXNIYW5kbGVyXHJcbiAgdmFyIGFyZ3ZcclxuICB2YXIgdlxyXG4gIHZhciBhdHRzID0gYy5hdHRyaWJ1dGVzXHJcblxyXG4gIGlmIChpIDwgYXR0cy5sZW5ndGgpIHtcclxuICAgIGhhc2sgPSAvXmstLy50ZXN0KGF0dHNbaV0ubm9kZU5hbWUpXHJcbiAgICBpZiAoaGFzaykge1xyXG4gICAgICBldnROYW1lID0gYXR0c1tpXS5ub2RlTmFtZS5zcGxpdCgnLScpWzFdXHJcbiAgICAgIGV2dGhhbmRsZXIgPSBhdHRzW2ldLm5vZGVWYWx1ZVxyXG4gICAgICBoYW5kbGVyID0gZXZ0aGFuZGxlci5zcGxpdCgnKCcpXHJcbiAgICAgIGlzSGFuZGxlciA9IHRoaXNbaGFuZGxlclswXV1cclxuICAgICAgaWYgKHR5cGVvZiBpc0hhbmRsZXIgPT09ICdmdW5jdGlvbicpIHtcclxuICAgICAgICByZW0ucHVzaChhdHRzW2ldLm5vZGVOYW1lKVxyXG4gICAgICAgIGFyZ3YgPSBbXVxyXG4gICAgICAgIHYgPSBoYW5kbGVyWzFdLnNsaWNlKDAsIC0xKS5zcGxpdCgnLCcpLmZpbHRlcihmdW5jdGlvbiAoZikgeyByZXR1cm4gZiAhPT0gJycgfSlcclxuICAgICAgICBpZiAodi5sZW5ndGgpIHYubWFwKGZ1bmN0aW9uICh2KSB7IGFyZ3YucHVzaCh2KSB9KVxyXG4gICAgICAgIGMuYWRkRXZlbnRMaXN0ZW5lcihldnROYW1lLCBpc0hhbmRsZXIuYmluZC5hcHBseShpc0hhbmRsZXIuYmluZCh0aGlzKSwgW2NdLmNvbmNhdChhcmd2KSksIGZhbHNlKVxyXG4gICAgICB9XHJcbiAgICB9XHJcbiAgICBpKytcclxuICAgIG5leHQuYXBwbHkodGhpcywgWyBpLCBjLCByZW0gXSlcclxuICB9IGVsc2Uge1xyXG4gICAgcmVtLm1hcChmdW5jdGlvbiAoZikgeyBjLnJlbW92ZUF0dHJpYnV0ZShmKSB9KVxyXG4gIH1cclxufVxyXG5cclxubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbiAoa05vZGUpIHtcclxuICB2YXIgc2VsZiA9IHRoaXNcclxuICB2YXIgbGlzdEtub2RlQ2hpbGQgPSBbXVxyXG4gIHZhciByZW0gPSBbXVxyXG4gIGxvb3BDaGlsZHMobGlzdEtub2RlQ2hpbGQsIGtOb2RlKVxyXG4gIGxpc3RLbm9kZUNoaWxkLm1hcChmdW5jdGlvbiAoYykge1xyXG4gICAgaWYgKGMubm9kZVR5cGUgPT09IDEgJiYgYy5oYXNBdHRyaWJ1dGVzKCkpIHtcclxuICAgICAgbmV4dC5hcHBseShzZWxmLCBbIDAsIGMsIHJlbSBdKVxyXG4gICAgfVxyXG4gIH0pXHJcbiAgbGlzdEtub2RlQ2hpbGQgPSBbXVxyXG59XHJcbiIsIm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24gKHN0cikge1xyXG4gIHZhciByZXMgPSBzdHIubWF0Y2goL1xcLipcXC4vZylcclxuICB2YXIgcmVzdWx0XHJcbiAgaWYgKHJlcyAmJiByZXMubGVuZ3RoID4gMCkge1xyXG4gICAgcmV0dXJuIHN0ci5zcGxpdCgnLicpXHJcbiAgfVxyXG4gIHJldHVybiByZXN1bHRcclxufVxyXG4iLCJmdW5jdGlvbiBrdGFnICgpIHtcclxuICB2YXIgYXJncyA9IFtdLnNsaWNlLmNhbGwoYXJndW1lbnRzKVxyXG4gIHZhciBhdHRyXHJcbiAgdmFyIGlkeFxyXG4gIHZhciB0ZVxyXG4gIHZhciByZXQgPSBbJzwnLCBhcmdzWzBdLCAnPicsIGFyZ3NbMV0sICc8LycsIGFyZ3NbMF0sICc+J11cclxuICBpZiAoYXJncy5sZW5ndGggPiAyICYmIHR5cGVvZiBhcmdzWzJdID09PSAnb2JqZWN0Jykge1xyXG4gICAgZm9yIChhdHRyIGluIGFyZ3NbMl0pIHtcclxuICAgICAgaWYgKHR5cGVvZiBhcmdzWzJdW2F0dHJdID09PSAnYm9vbGVhbicgJiYgYXJnc1syXVthdHRyXSkge1xyXG4gICAgICAgIHJldC5zcGxpY2UoMiwgMCwgJyAnLCBhdHRyKVxyXG4gICAgICB9IGVsc2UgaWYgKGF0dHIgPT09ICdjbGFzcycgJiYgQXJyYXkuaXNBcnJheShhcmdzWzJdW2F0dHJdKSkge1xyXG4gICAgICAgIHJldC5zcGxpY2UoMiwgMCwgJyAnLCBhdHRyLCAnPVwiJywgYXJnc1syXVthdHRyXS5qb2luKCcgJykudHJpbSgpLCAnXCInKVxyXG4gICAgICB9IGVsc2Uge1xyXG4gICAgICAgIHJldC5zcGxpY2UoMiwgMCwgJyAnLCBhdHRyLCAnPVwiJywgYXJnc1syXVthdHRyXSwgJ1wiJylcclxuICAgICAgfVxyXG4gICAgfVxyXG4gIH1cclxuICBpZiAoYXJncy5sZW5ndGggPiAzICYmIHR5cGVvZiBhcmdzWzNdID09PSAnb2JqZWN0Jykge1xyXG4gICAgaWR4ID0gcmV0LmluZGV4T2YoJz4nKVxyXG4gICAgdGUgPSBbaWR4LCAwLCAnIHN0eWxlPVwiJ11cclxuICAgIGZvciAoYXR0ciBpbiBhcmdzWzNdKSB7XHJcbiAgICAgIHRlLnB1c2goYXR0cilcclxuICAgICAgdGUucHVzaCgnOicpXHJcbiAgICAgIHRlLnB1c2goYXJnc1szXVthdHRyXSlcclxuICAgICAgdGUucHVzaCgnOycpXHJcbiAgICB9XHJcbiAgICB0ZS5wdXNoKCdcIicpXHJcbiAgICByZXQuc3BsaWNlLmFwcGx5KHJldCwgdGUpXHJcbiAgfVxyXG4gIHJldHVybiByZXRcclxufVxyXG5cclxubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbiAoKSB7XHJcbiAgcmV0dXJuIGt0YWcuYXBwbHkobnVsbCwgYXJndW1lbnRzKS5qb2luKCcnKVxyXG59XHJcbiIsInZhciBnZW5FbGVtZW50ID0gcmVxdWlyZSgnLi9nZW5FbGVtZW50JylcclxubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbiAoKSB7XHJcbiAgdmFyIHNlbGYgPSB0aGlzXHJcbiAgdmFyIGNsb25lQ2hpbGQgPSBbXS5zaGlmdC5jYWxsKGFyZ3VtZW50cylcclxuICBPYmplY3Qua2V5cyhjbG9uZUNoaWxkKS5tYXAoZnVuY3Rpb24gKGMpIHtcclxuICAgIHZhciBoZGwgPSBjbG9uZUNoaWxkW2NdLm1hdGNoKC97eyhbXnt9XSspfX0vZylcclxuICAgIGlmIChoZGwgJiYgaGRsLmxlbmd0aCkge1xyXG4gICAgICB2YXIgc3RyID0gJydcclxuICAgICAgaGRsLm1hcChmdW5jdGlvbiAocykge1xyXG4gICAgICAgIHZhciByZXAgPSBzLnJlcGxhY2UoL3t7KFtee31dKyl9fS9nLCAnJDEnKVxyXG4gICAgICAgIGlmIChzZWxmW3JlcF0gIT09IHVuZGVmaW5lZCkge1xyXG4gICAgICAgICAgZ2VuRWxlbWVudC51cGRhdGVTdGF0ZUxpc3QuY2FsbChzZWxmLCByZXApXHJcbiAgICAgICAgICBpZiAoc2VsZltyZXBdID09PSBmYWxzZSkge1xyXG4gICAgICAgICAgICBkZWxldGUgY2xvbmVDaGlsZFtjXVxyXG4gICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgc3RyICs9IHNlbGZbcmVwXVxyXG4gICAgICAgICAgICBjbG9uZUNoaWxkW2NdID0gc3RyXHJcbiAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG4gICAgICB9KVxyXG4gICAgfVxyXG4gIH0pXHJcbn1cclxuIiwibW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbiAoY2hpbGQsIHVwZGF0ZVN0YXRlTGlzdCkge1xyXG4gIHZhciBzZWxmID0gdGhpc1xyXG4gIGlmIChjaGlsZC5jbGFzcykge1xyXG4gICAgdmFyIGMgPSBjaGlsZC5jbGFzcy5tYXRjaCgve3soW157fV0rKX19L2cpXHJcbiAgICB2YXIgY2xhc3NTdHIgPSAnJ1xyXG4gICAgaWYgKGMgJiYgYy5sZW5ndGgpIHtcclxuICAgICAgYy5tYXAoZnVuY3Rpb24gKHMpIHtcclxuICAgICAgICB2YXIgcmVwID0gcy5yZXBsYWNlKC97eyhbXnt9XSspfX0vZywgJyQxJylcclxuICAgICAgICBpZiAoc2VsZltyZXBdICE9PSB1bmRlZmluZWQpIHtcclxuICAgICAgICAgIHVwZGF0ZVN0YXRlTGlzdChyZXApXHJcbiAgICAgICAgICBzZWxmW3JlcF0uY3N0b3JlLm1hcChmdW5jdGlvbiAoYykge1xyXG4gICAgICAgICAgICBjbGFzc1N0ciArPSBjICsgJyAnXHJcbiAgICAgICAgICB9KVxyXG4gICAgICAgIH1cclxuICAgICAgfSlcclxuICAgIH1cclxuICAgIHJldHVybiBjbGFzc1N0ci5sZW5ndGggPyBjbGFzc1N0ci50cmltKCkgOiBjaGlsZC5jbGFzc1xyXG4gIH1cclxuICByZXR1cm4gZmFsc2VcclxufVxyXG4iLCJ2YXIgc3RySW50ZXJwcmV0ZXIgPSByZXF1aXJlKCcuL3N0ckludGVycHJldGVyJylcclxuXHJcbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24gKHN0ciwgdXBkYXRlU3RhdGVMaXN0KSB7XHJcbiAgdmFyIHNlbGYgPSB0aGlzXHJcbiAgdmFyIGFyclByb3BzID0gc3RyLm1hdGNoKC97eyhbXnt9XSspfX0vZylcclxuICBpZiAoYXJyUHJvcHMgJiYgYXJyUHJvcHMubGVuZ3RoKSB7XHJcbiAgICBhcnJQcm9wcy5tYXAoZnVuY3Rpb24gKHMpIHtcclxuICAgICAgdmFyIHJlcCA9IHMucmVwbGFjZSgve3soW157fV0rKX19L2csICckMScpXHJcbiAgICAgIHZhciBpc09iamVjdE5vdGF0aW9uID0gc3RySW50ZXJwcmV0ZXIocmVwKVxyXG4gICAgICBpZiAoIWlzT2JqZWN0Tm90YXRpb24pIHtcclxuICAgICAgICBpZiAoc2VsZltyZXBdICE9PSB1bmRlZmluZWQpIHtcclxuICAgICAgICAgIHVwZGF0ZVN0YXRlTGlzdChyZXApXHJcbiAgICAgICAgICBzdHIgPSBzdHIucmVwbGFjZSgne3snK3JlcCsnfX0nLCBzZWxmW3JlcF0pXHJcbiAgICAgICAgfVxyXG4gICAgICB9IGVsc2Uge1xyXG4gICAgICAgIHVwZGF0ZVN0YXRlTGlzdChyZXApXHJcbiAgICAgICAgc3RyID0gc3RyLnJlcGxhY2UoJ3t7JytyZXArJ319Jywgc2VsZltpc09iamVjdE5vdGF0aW9uWzBdXVtpc09iamVjdE5vdGF0aW9uWzFdXSlcclxuICAgICAgfVxyXG4gICAgICBpZiAocmVwLm1hdGNoKC9eXFw/L2cpKSB7XHJcbiAgICAgICAgdXBkYXRlU3RhdGVMaXN0KHJlcC5yZXBsYWNlKCc/JywgJycpKVxyXG4gICAgICB9XHJcbiAgICB9KVxyXG4gIH1cclxuICByZXR1cm4gc3RyXHJcbn1cclxuXHJcbiIsInZhciBjb3B5ID0gcmVxdWlyZSgnLi9jb3B5JylcclxuXHJcbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24gKHN0eWxlcywgdXBkYXRlU3RhdGVMaXN0KSB7XHJcbiAgdmFyIHNlbGYgPSB0aGlzXHJcbiAgdmFyIGNvcHlTdHlsZXMgPSBjb3B5KHN0eWxlcylcclxuICBpZiAoc3R5bGVzKSB7XHJcbiAgICBPYmplY3Qua2V5cyhjb3B5U3R5bGVzKS5tYXAoZnVuY3Rpb24gKHN0eWxlKSB7XHJcbiAgICAgIHZhciBhcnJQcm9wcyA9IGNvcHlTdHlsZXNbc3R5bGVdLm1hdGNoKC97eyhbXnt9XSspfX0vZylcclxuICAgICAgaWYgKGFyclByb3BzICYmIGFyclByb3BzLmxlbmd0aCkge1xyXG4gICAgICAgIGFyclByb3BzLm1hcChmdW5jdGlvbiAocykge1xyXG4gICAgICAgICAgdmFyIHJlcCA9IHMucmVwbGFjZSgve3soW157fV0rKX19L2csICckMScpXHJcbiAgICAgICAgICBpZiAoc2VsZltyZXBdICE9PSB1bmRlZmluZWQpIHtcclxuICAgICAgICAgICAgdXBkYXRlU3RhdGVMaXN0KHJlcClcclxuICAgICAgICAgICAgY29weVN0eWxlc1tzdHlsZV0gPSBjb3B5U3R5bGVzW3N0eWxlXS5yZXBsYWNlKC97eyhbXnt9XSspfX0vLCBzZWxmW3JlcF0pXHJcbiAgICAgICAgICB9XHJcbiAgICAgICAgfSlcclxuICAgICAgfVxyXG4gICAgfSlcclxuICB9XHJcbiAgcmV0dXJuIGNvcHlTdHlsZXNcclxufVxyXG4iLCJleHBvcnRzLmdldElkID0gZnVuY3Rpb24gKGlkKSB7XHJcbiAgcmV0dXJuIGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKGlkKVxyXG59XHJcblxyXG5leHBvcnRzLmdlbklkID0gZnVuY3Rpb24gKCkge1xyXG4gIHJldHVybiAoTWF0aC5yb3VuZChNYXRoLnJhbmRvbSgpICogMHgxICogMWUxMikpLnRvU3RyaW5nKDMyKVxyXG59XHJcblxyXG5leHBvcnRzLnNlbGVjdG9yID0gZnVuY3Rpb24gKGlkKSB7XHJcbiAgcmV0dXJuIGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3IoJ1trZWV0LWlkPVwiJyArIGlkICsgJ1wiXScpXHJcbn1cclxuXHJcbnZhciBsb29wQ2hpbGRzID0gZnVuY3Rpb24gKGFyciwgZWxlbSkge1xyXG4gIGZvciAodmFyIGNoaWxkID0gZWxlbS5maXJzdENoaWxkOyBjaGlsZCAhPT0gbnVsbDsgY2hpbGQgPSBjaGlsZC5uZXh0U2libGluZykge1xyXG4gICAgYXJyLnB1c2goY2hpbGQpXHJcbiAgICBpZiAoY2hpbGQuaGFzQ2hpbGROb2RlcygpKSB7XHJcbiAgICAgIGxvb3BDaGlsZHMoYXJyLCBjaGlsZClcclxuICAgIH1cclxuICB9XHJcbn1cclxuXHJcbmV4cG9ydHMubG9vcENoaWxkcyA9IGxvb3BDaGlsZHNcclxuIiwiJ3VzZSBzdHJpY3QnXHJcbi8qKlxyXG4gKiBLZWV0anMgdjMuNS4yIEFscGhhIHJlbGVhc2U6IGh0dHBzOi8vZ2l0aHViLmNvbS9rZWV0anMva2VldC5qc1xyXG4gKiBNaW5pbWFsaXN0IHZpZXcgbGF5ZXIgZm9yIHRoZSB3ZWJcclxuICpcclxuICogPDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8IEtlZXRqcyA+Pj4+Pj4+Pj4+Pj4+Pj4+Pj4+Pj4+Pj4+Pj4+Pj5cclxuICpcclxuICogQ29weXJpZ2h0IDIwMTgsIFNoYWhydWwgTml6YW0gU2VsYW1hdFxyXG4gKiBSZWxlYXNlZCB1bmRlciB0aGUgTUlUIExpY2Vuc2UuXHJcbiAqL1xyXG5cclxudmFyIGdldElkID0gcmVxdWlyZSgnLi9jb21wb25lbnRzL3V0aWxzJykuZ2V0SWRcclxudmFyIGdlbklkID0gcmVxdWlyZSgnLi9jb21wb25lbnRzL3V0aWxzJykuZ2VuSWRcclxudmFyIHNlbGVjdG9yID0gcmVxdWlyZSgnLi9jb21wb25lbnRzL3V0aWxzJykuc2VsZWN0b3JcclxudmFyIHBhcnNlU3RyID0gcmVxdWlyZSgnLi9jb21wb25lbnRzL3BhcnNlU3RyJylcclxudmFyIGdlblRlbXBsYXRlID0gcmVxdWlyZSgnLi9jb21wb25lbnRzL2dlblRlbXBsYXRlJylcclxudmFyIHNldERPTSA9IHJlcXVpcmUoJ3NldC1kb20nKVxyXG5cclxuc2V0RE9NLmtleSA9ICdrZWV0LWlkJ1xyXG5cclxuLyoqXHJcbiAqIEBwcml2YXRlXHJcbiAqIEBkZXNjcmlwdGlvblxyXG4gKiBMb29wIHJlbmRlciBhbGwgaW5pdGlhbGx5IHBhcnNlZCBodG1sIGVudGl0aWVzIHRvIFxyXG4gKiB0YXJnZXQgRE9NIG5vZGUgaWQuXHJcbiAqXHJcbiAqIEBwYXJhbSB7SW50fSBpIC0gVGhlIGluZGV4IG9mIGh0bWwgZW50aXR5LlxyXG4gKiBAcGFyYW0ge05vZGV9IGVsZSAtIFRoZSB0YXJnZXQgRE9NIG5vZGUuXHJcbiAqIEBwYXJhbSB7Tm9kZX0gZWxzIC0gVGhlIGxpc3Qgb2YgaHRtbCBlbnRpdGllcy5cclxuICovXHJcbnZhciBuZXh0ID0gZnVuY3Rpb24gKGksIGVsZSwgZWxzKSB7XHJcbiAgdmFyIHNlbGYgPSB0aGlzXHJcbiAgaWYgKGkgPCBlbHMubGVuZ3RoKSB7XHJcbiAgICBpZiAoIWVsZS5jaGlsZE5vZGVzW2ldKSBlbGUuYXBwZW5kQ2hpbGQoZWxzW2ldKVxyXG4gICAgaSsrXHJcbiAgICBuZXh0LmFwcGx5KHRoaXMsIFsgaSwgZWxlLCBlbHMgXSlcclxuICB9IGVsc2Uge1xyXG4gICAgLy8gT25jZSBpbnRpYWwgcmVuZGVyIGFscmVhZHkgaW4gcGxhY2UgY29uc2VjdXRpdmVseVxyXG4gICAgLy8gd2F0Y2ggdGhlIG9iamVjdCBpbiBDb21wb25lbnRzLnByb3RvdHlwZS5iYXNlLiBBZGQgXHJcbiAgICAvLyBhZGRpdGlvbmFsIG9iamVjdCBwcm9wcyBvciBkZWxldGUgZXhpc3Rpbmcgb2JqZWN0IFxyXG4gICAgLy8gcHJvcHMsIHdoaWNoIHdpbGwgcmVmbGVjdCBpbiB0aGUgY29tcG9uZW50IHJlbmRlcmVkIFxyXG4gICAgLy8gZWxlbWVudHMuXHJcbiAgICB2YXIgd2F0Y2hPYmplY3QgPSBmdW5jdGlvbiAob2JqKSB7XHJcbiAgICAgIHJldHVybiBuZXcgUHJveHkob2JqLCB7XHJcbiAgICAgICAgc2V0OiBmdW5jdGlvbiAodGFyZ2V0LCBrZXksIHZhbHVlKSB7XHJcbiAgICAgICAgICB0YXJnZXRba2V5XSA9IHZhbHVlXHJcbiAgICAgICAgICBzZWxmLmJhc2Vba2V5XSA9IHRhcmdldFtrZXldXHJcbiAgICAgICAgICByZXR1cm4gdHJ1ZVxyXG4gICAgICAgIH0sXHJcbiAgICAgICAgZGVsZXRlUHJvcGVydHk6IGZ1bmN0aW9uICh0YXJnZXQsIGtleSkge1xyXG4gICAgICAgICAgdmFyIGlkID0gdGFyZ2V0W2tleV1bJ2tlZXQtaWQnXVxyXG4gICAgICAgICAgdmFyIGVsID0gc2VsZWN0b3IoaWQpXHJcbiAgICAgICAgICBlbCAmJiBlbC5yZW1vdmUoKVxyXG4gICAgICAgICAgZGVsZXRlIHNlbGYuYmFzZVtrZXldXHJcbiAgICAgICAgICByZXR1cm4gdHJ1ZVxyXG4gICAgICAgIH1cclxuICAgICAgfSlcclxuICAgIH1cclxuICAgIC8vIG9ubHkgamF2YXNjcmlwdCBvYmplY3RzIGlzIHdhdGNoYWJsZVxyXG4gICAgaWYgKHR5cGVvZiB0aGlzLmJhc2UgPT09ICdvYmplY3QnKSB7IHRoaXMuYmFzZVByb3h5ID0gd2F0Y2hPYmplY3QodGhpcy5iYXNlKSB9XHJcblxyXG4gICAgLy8gc2luY2UgY29tcG9uZW50IGFscmVhZHkgcmVuZGVyZWQsIHRyaWdnZXIgaXRzIGxpZmUtY3ljbGUgbWV0aG9kXHJcbiAgICBpZiAodGhpcy5jb21wb25lbnREaWRNb3VudCAmJiB0eXBlb2YgdGhpcy5jb21wb25lbnREaWRNb3VudCA9PT0gJ2Z1bmN0aW9uJykge1xyXG4gICAgICB0aGlzLmNvbXBvbmVudERpZE1vdW50KClcclxuICAgIH1cclxuICB9XHJcbn1cclxuXHJcbi8qKlxyXG4gKiBAZGVzY3JpcHRpb25cclxuICogVGhlIG1haW4gY29uc3RydWN0b3Igb2YgS2VldFxyXG4gKlxyXG4gKiBAcGFyYW0ge1N0cmluZyB8IGFyZzBbLCBhcmcxWywgYXJnMlssIC4uLl1dXX0gYXJndW1lbnRzIC0gQ3VzdG9tIHByb3BlcnR5IG5hbWVzXHJcbiAqIGkuZSB1c2luZyAnY2hlY2tlZCcgZm9yIGlucHV0IGVsZW1lbnRzLlxyXG4gKiBVc2FnZSA6LVxyXG4gKlxyXG4gKiAgICBjb25zdCBBcHAgZXh0ZW5kcyBLZWV0IHtcclxuICogICAgICBjb25zdHJ1Y3RvciguLi5hcmdzKSB7XHJcbiAqICAgICAgICBzdXBlcigpXHJcbiAqICAgICAgICB0aGlzLmFyZ3MgPSBhcmdzXHJcbiAqICAgICAgfVxyXG4gKiAgICB9XHJcbiAqICAgIGNvbnN0IGFwcCA9IG5ldyBBcHAoJ2NoZWNrZWQnKVxyXG4gKlxyXG4gKiBmb3IgZXhhbXBsZSB1c2FnZSBjYXNlcyBzZWUgaHR0cHM6Ly9naXRodWIuY29tL3N5YXJ1bC9rZWV0L2Jsb2IvbWFzdGVyL2V4YW1wbGVzL2NoZWNrLmpzXHJcbiAqL1xyXG5mdW5jdGlvbiBLZWV0ICgpIHtcclxuICAvLyBwcmVwYXJlIHRoZSBzdG9yZSBmb3Igc3RhdGVzLCB0aGlzIGlzIHRoZSBpbnRlcm5hbCBzdGF0ZS1tYW5hZ2VtZW50IGZvciB0aGVcclxuICAvLyBjb21wb25lbnRzLiBQZXJzb25hbGx5IEkgbmV2ZXIgZ2V0IHRvIGxpa2Ugc3RhdGUtbWFuYWdlbWVudCBpbiBqYXZhc2NyaXB0LlxyXG4gIC8vIFRoZSBpZGVhIG1pZ2h0IHNvdW5kIGRldmluZSBidXQgeW91J2xsIHN0dWNrIGluIHZlcnkgY29tcGxpY2F0ZWQgZ2V0LXRvLW1hc3RlclxyXG4gIC8vIHRoaXMgZnJhbWV3b3JrL2Zsb3cgY3ljbGVzIHdoZXJlIHlvdSBhbHdheXMgd3JpdGUgdGhlIHN0YXRlIGluIHNvbWUgZXh0ZXJuYWwgXHJcbiAgLy8gc3RvcmUgYW5kIHdyaXRlIGxvbmcgbG9naWNzIHRvIGRvIHNtYWxsIHN0dWZmcyBhbmQgdGhleSBhcmUgdmVyeSBzbG93LiBPbiB0aGUgXHJcbiAgLy8gb3RoZXIgaGFuZCwgdGhpcyBpbnRlcm5hbCBzdG9yZSBpcyByZWxhdGl2ZWx5IHNpbXBsZSwgaGFzIHJlZmVyZW5jZXMgYW5kIHRoZSBcclxuICAvLyBhdmFpbGFibGl0eSBvZiBzaGFyaW5nIGFjcm9zcyBtdWx0aXBsZSBjb21wb25lbnRzIGluIGFueSBjYXNlLlxyXG4gIE9iamVjdC5kZWZpbmVQcm9wZXJ0eSh0aGlzLCAnX19zdGF0ZUxpc3RfXycsIHtcclxuICAgIGVudW1lcmFibGU6IGZhbHNlLFxyXG4gICAgd3JpdGFibGU6IHRydWVcclxuICB9KVxyXG59XHJcblxyXG5LZWV0LnByb3RvdHlwZS5tb3VudCA9IGZ1bmN0aW9uIChpbnN0YW5jZSkge1xyXG4gIC8vIEJlZm9yZSB3ZSBiZWdpbiB0byBwYXJzZSBhbiBpbnN0YW5jZSwgZG8gYSBydW4tZG93biBjaGVja3NcclxuICAvLyB0byBjbGVhbiB1cCBiYWNrdGljayBzdHJpbmcgd2hpY2ggdXN1YWxseSBoYXMgbGluZSBzcGFjaW5nXHJcbiAgaWYgKHR5cGVvZiBpbnN0YW5jZSA9PT0gJ29iamVjdCcpIHtcclxuICAgIE9iamVjdC5rZXlzKGluc3RhbmNlKS5tYXAoZnVuY3Rpb24gKGtleSkge1xyXG4gICAgICBpZiAodHlwZW9mIGluc3RhbmNlW2tleV0gPT09ICdzdHJpbmcnKSB7XHJcbiAgICAgICAgaW5zdGFuY2Vba2V5XSA9IGluc3RhbmNlW2tleV0udHJpbSgpLnJlcGxhY2UoL1xccysvZywgJyAnKVxyXG4gICAgICB9IGVsc2UgaWYgKHR5cGVvZiBpbnN0YW5jZVtrZXldID09PSAnb2JqZWN0JyAmJiB0eXBlb2YgaW5zdGFuY2Vba2V5XVsndGVtcGxhdGUnXSA9PT0gJ3N0cmluZycpIHtcclxuICAgICAgICBpbnN0YW5jZVtrZXldWyd0ZW1wbGF0ZSddID0gaW5zdGFuY2Vba2V5XVsndGVtcGxhdGUnXS50cmltKCkucmVwbGFjZSgvXFxzKy9nLCAnICcpXHJcbiAgICAgIH1cclxuICAgIH0pXHJcbiAgfSBlbHNlIGlmICh0eXBlb2YgaW5zdGFuY2UgPT09ICdzdHJpbmcnKSB7XHJcbiAgICBpbnN0YW5jZSA9IGluc3RhbmNlLnRyaW0oKS5yZXBsYWNlKC9cXHMrL2csICcgJylcclxuICB9XHJcbiAgLy8gd2Ugc3RvcmUgdGhlIHByaXN0aW5lIGluc3RhbmNlIGluIENvbXBvbmVudC5iYXNlXHJcbiAgdGhpcy5iYXNlID0gaW5zdGFuY2VcclxuICByZXR1cm4gdGhpc1xyXG59XHJcblxyXG5LZWV0LnByb3RvdHlwZS5mbHVzaCA9IGZ1bmN0aW9uIChpbnN0YW5jZSkge1xyXG4gIC8vIEN1c3RvbSBtZXRob2QgdG8gY2xlYW4gdXAgdGhlIGNvbXBvbmVudCBET00gdHJlZVxyXG4gIC8vIHVzZWZ1bGwgaWYgd2UgbmVlZCB0byBkbyBjbGVhbiB1cCByZXJlbmRlclxyXG4gIHZhciBlbGUgPSBnZXRJZCh0aGlzLmVsKVxyXG4gIGlmIChlbGUpIGVsZS5pbm5lckhUTUwgPSAnJ1xyXG4gIHJldHVybiB0aGlzXHJcbn1cclxuXHJcbktlZXQucHJvdG90eXBlLmxpbmsgPSBmdW5jdGlvbiAoaWQpIHtcclxuICAvLyBUaGUgdGFyZ2V0IERPTSB3aGVyZSB0aGUgcmVuZGVyaW5nIHdpbGwgdG9vayBwbGFjZS5cclxuICAvLyBXZSBjb3VsZCBhbHNvIGFwcGx5IGxpZmVDeWNsZSBtZXRob2QgYmVmb3JlIHRoZVxyXG4gIC8vIHJlbmRlciBoYXBwZW5cclxuICB0aGlzLmVsID0gaWRcclxuICBpZiAodGhpcy5jb21wb25lbnRXaWxsTW91bnQgJiYgdHlwZW9mIHRoaXMuY29tcG9uZW50V2lsbE1vdW50ID09PSAnZnVuY3Rpb24nKSB7XHJcbiAgICB0aGlzLmNvbXBvbmVudFdpbGxNb3VudCgpXHJcbiAgfVxyXG4gIHRoaXMucmVuZGVyKClcclxuICByZXR1cm4gdGhpc1xyXG59XHJcblxyXG5LZWV0LnByb3RvdHlwZS5yZW5kZXIgPSBmdW5jdGlvbiAoKSB7XHJcbiAgLy8gUmVuZGVyIHRoaXMgY29tcG9uZW50IHRvIHRoZSB0YXJnZXQgRE9NXHJcbiAgdmFyIGVsZSA9IGdldElkKHRoaXMuZWwpXHJcbiAgdmFyIGVscyA9IHBhcnNlU3RyLmFwcGx5KHRoaXMsIHRoaXMuYXJncylcclxuICBpZiAoZWxlKSB7XHJcbiAgICBuZXh0LmFwcGx5KHRoaXMsIFsgMCwgZWxlLCBlbHMgXSlcclxuICB9XHJcbiAgcmV0dXJuIHRoaXNcclxufVxyXG5cclxuS2VldC5wcm90b3R5cGUuY2x1c3RlciA9IGZ1bmN0aW9uICgpIHtcclxuICAvLyBDaGFpbiBtZXRob2QgdG8gcnVuIGV4dGVybmFsIGZ1bmN0aW9uKHMpLCB0aGlzIGJhc2ljYWxseSBzZXJ2ZVxyXG4gIC8vIGFzIGluaXRpYWxpemVyIGZvciBhbGwgY2hpbGQgY29tcG9uZW50cyB3aXRoaW4gdGhlIGluc3RhbmNlIHRyZWVcclxuICB2YXIgYXJncyA9IFtdLnNsaWNlLmNhbGwoYXJndW1lbnRzKVxyXG4gIGlmIChhcmdzLmxlbmd0aCA+IDApIHtcclxuICAgIGFyZ3MubWFwKGZ1bmN0aW9uIChmKSB7XHJcbiAgICAgIGlmICh0eXBlb2YgZiA9PT0gJ2Z1bmN0aW9uJykgZigpXHJcbiAgICB9KVxyXG4gIH1cclxufVxyXG5cclxuS2VldC5wcm90b3R5cGUuYWRkID0gZnVuY3Rpb24gKG9iaiwgaW50ZXJjZXB0b3IpIHtcclxuICAvLyBNZXRob2QgdG8gYWRkIGEgbmV3IG9iamVjdCB0byBjb21wb25lbnQgbW9kZWxcclxuICB2YXIgc2VsZiA9IHRoaXNcclxuICB2YXIgZWxlID0gZ2V0SWQodGhpcy5lbClcclxuICBvYmpbJ2tlZXQtaWQnXSA9IGdlbklkKClcclxuICB0aGlzLmJhc2UubW9kZWwgPSB0aGlzLmJhc2UubW9kZWwuY29uY2F0KG9iailcclxuICAvLyBpZiBpbnRlcmNlcHRvciBpcyBkZWNsYXJlZCBleGVjdXRlIGl0IGJlZm9yZSBub2RlIHVwZGF0ZVxyXG4gIGlmKGludGVyY2VwdG9yICYmIHR5cGVvZiBpbnRlcmNlcHRvciA9PT0gJ2Z1bmN0aW9uJyl7XHJcbiAgICBpbnRlcmNlcHRvci5jYWxsKHRoaXMpXHJcbiAgfVxyXG4gIGlmKGVsZSlcclxuICAgIGVsZS5hcHBlbmRDaGlsZChnZW5UZW1wbGF0ZS5jYWxsKHRoaXMsIG9iaikpXHJcbiAgZWxzZSB7XHJcbiAgICB2YXIgdCA9IHNldEludGVydmFsKGZ1bmN0aW9uKCl7XHJcbiAgICAgIGlmKGVsZSkge1xyXG4gICAgICAgIGNsZWFySW50ZXJ2YWwodClcclxuICAgICAgICBlbGUuYXBwZW5kQ2hpbGQoZ2VuVGVtcGxhdGUuY2FsbChzZWxmLCBvYmopKVxyXG4gICAgICB9XHJcbiAgICB9LCAwKVxyXG4gIH1cclxufVxyXG5cclxuS2VldC5wcm90b3R5cGUuZGVzdHJveSA9IGZ1bmN0aW9uIChpZCwgYXR0ciwgaW50ZXJjZXB0b3IpIHtcclxuICAvLyBNZXRob2QgdG8gZGVzdHJveSBhIHN1Ym1vZGVsIG9mIGEgY29tcG9uZW50XHJcbiAgdmFyIHNlbGYgPSB0aGlzXHJcbiAgdGhpcy5iYXNlLm1vZGVsID0gdGhpcy5iYXNlLm1vZGVsLmZpbHRlcihmdW5jdGlvbiAob2JqLCBpbmRleCkge1xyXG4gICAgaWYgKGlkID09PSBvYmpbYXR0cl0pIHtcclxuICAgICAgdmFyIG5vZGUgPSBzZWxlY3RvcihvYmpbJ2tlZXQtaWQnXSlcclxuICAgICAgaWYgKG5vZGUpIHsgXHJcbiAgICAgICAgLy8gaWYgaW50ZXJjZXB0b3IgaXMgZGVjbGFyZWQgZXhlY3V0ZSBpdCBiZWZvcmUgbm9kZSB1cGRhdGVcclxuICAgICAgICBpZihpbnRlcmNlcHRvciAmJiB0eXBlb2YgaW50ZXJjZXB0b3IgPT09ICdmdW5jdGlvbicpe1xyXG4gICAgICAgICAgaW50ZXJjZXB0b3IuY2FsbChzZWxmKVxyXG4gICAgICAgIH1cclxuICAgICAgICBub2RlLnJlbW92ZSgpIFxyXG4gICAgICB9XHJcbiAgICB9IGVsc2UgeyByZXR1cm4gb2JqIH1cclxuICB9KVxyXG59XHJcblxyXG5LZWV0LnByb3RvdHlwZS51cGRhdGUgPSBmdW5jdGlvbiAoaWQsIGF0dHIsIG5ld0F0dHIsIGludGVyY2VwdG9yKSB7XHJcbiAgLy8gTWV0aG9kIHRvIHVwZGF0ZSBhIHN1Ym1vZGVsIG9mIGEgY29tcG9uZW50XHJcbiAgdmFyIHNlbGYgPSB0aGlzXHJcbiAgdGhpcy5iYXNlLm1vZGVsID0gdGhpcy5iYXNlLm1vZGVsLm1hcChmdW5jdGlvbiAob2JqLCBpZHgsIG1vZGVsKSB7XHJcbiAgICBpZiAoaWQgPT09IG9ialthdHRyXSkge1xyXG4gICAgICBpZiAobmV3QXR0ciAmJiB0eXBlb2YgbmV3QXR0ciA9PT0gJ29iamVjdCcpIHtcclxuICAgICAgICBPYmplY3QuYXNzaWduKG9iaiwgbmV3QXR0cilcclxuICAgICAgfVxyXG4gICAgICB2YXIgbm9kZSA9IHNlbGVjdG9yKG9ialsna2VldC1pZCddKVxyXG4gICAgICBpZiAobm9kZSkge1xyXG4gICAgICAgIC8vIGlmIGludGVyY2VwdG9yIGlzIGRlY2xhcmVkIGV4ZWN1dGUgaXQgYmVmb3JlIG5vZGUgdXBkYXRlXHJcbiAgICAgICAgaWYoaW50ZXJjZXB0b3IgJiYgdHlwZW9mIGludGVyY2VwdG9yID09PSAnZnVuY3Rpb24nKXtcclxuICAgICAgICAgIGludGVyY2VwdG9yLmNhbGwoc2VsZilcclxuICAgICAgICB9XHJcbiAgICAgICAgc2V0RE9NKG5vZGUsIGdlblRlbXBsYXRlLmNhbGwoc2VsZiwgb2JqKSlcclxuICAgICAgfVxyXG4gICAgfVxyXG4gICAgcmV0dXJuIG9ialxyXG4gIH0pXHJcbn1cclxuXHJcbm1vZHVsZS5leHBvcnRzID0gS2VldFxyXG4iLCIndXNlIHN0cmljdCc7XG5cbmZ1bmN0aW9uIHBhZCAoaGFzaCwgbGVuKSB7XG4gIHdoaWxlIChoYXNoLmxlbmd0aCA8IGxlbikge1xuICAgIGhhc2ggPSAnMCcgKyBoYXNoO1xuICB9XG4gIHJldHVybiBoYXNoO1xufVxuXG5mdW5jdGlvbiBmb2xkIChoYXNoLCB0ZXh0KSB7XG4gIHZhciBpO1xuICB2YXIgY2hyO1xuICB2YXIgbGVuO1xuICBpZiAodGV4dC5sZW5ndGggPT09IDApIHtcbiAgICByZXR1cm4gaGFzaDtcbiAgfVxuICBmb3IgKGkgPSAwLCBsZW4gPSB0ZXh0Lmxlbmd0aDsgaSA8IGxlbjsgaSsrKSB7XG4gICAgY2hyID0gdGV4dC5jaGFyQ29kZUF0KGkpO1xuICAgIGhhc2ggPSAoKGhhc2ggPDwgNSkgLSBoYXNoKSArIGNocjtcbiAgICBoYXNoIHw9IDA7XG4gIH1cbiAgcmV0dXJuIGhhc2ggPCAwID8gaGFzaCAqIC0yIDogaGFzaDtcbn1cblxuZnVuY3Rpb24gZm9sZE9iamVjdCAoaGFzaCwgbywgc2Vlbikge1xuICByZXR1cm4gT2JqZWN0LmtleXMobykuc29ydCgpLnJlZHVjZShmb2xkS2V5LCBoYXNoKTtcbiAgZnVuY3Rpb24gZm9sZEtleSAoaGFzaCwga2V5KSB7XG4gICAgcmV0dXJuIGZvbGRWYWx1ZShoYXNoLCBvW2tleV0sIGtleSwgc2Vlbik7XG4gIH1cbn1cblxuZnVuY3Rpb24gZm9sZFZhbHVlIChpbnB1dCwgdmFsdWUsIGtleSwgc2Vlbikge1xuICB2YXIgaGFzaCA9IGZvbGQoZm9sZChmb2xkKGlucHV0LCBrZXkpLCB0b1N0cmluZyh2YWx1ZSkpLCB0eXBlb2YgdmFsdWUpO1xuICBpZiAodmFsdWUgPT09IG51bGwpIHtcbiAgICByZXR1cm4gZm9sZChoYXNoLCAnbnVsbCcpO1xuICB9XG4gIGlmICh2YWx1ZSA9PT0gdW5kZWZpbmVkKSB7XG4gICAgcmV0dXJuIGZvbGQoaGFzaCwgJ3VuZGVmaW5lZCcpO1xuICB9XG4gIGlmICh0eXBlb2YgdmFsdWUgPT09ICdvYmplY3QnKSB7XG4gICAgaWYgKHNlZW4uaW5kZXhPZih2YWx1ZSkgIT09IC0xKSB7XG4gICAgICByZXR1cm4gZm9sZChoYXNoLCAnW0NpcmN1bGFyXScgKyBrZXkpO1xuICAgIH1cbiAgICBzZWVuLnB1c2godmFsdWUpO1xuICAgIHJldHVybiBmb2xkT2JqZWN0KGhhc2gsIHZhbHVlLCBzZWVuKTtcbiAgfVxuICByZXR1cm4gZm9sZChoYXNoLCB2YWx1ZS50b1N0cmluZygpKTtcbn1cblxuZnVuY3Rpb24gdG9TdHJpbmcgKG8pIHtcbiAgcmV0dXJuIE9iamVjdC5wcm90b3R5cGUudG9TdHJpbmcuY2FsbChvKTtcbn1cblxuZnVuY3Rpb24gc3VtIChvKSB7XG4gIHJldHVybiBwYWQoZm9sZFZhbHVlKDAsIG8sICcnLCBbXSkudG9TdHJpbmcoMTYpLCA4KTtcbn1cblxubW9kdWxlLmV4cG9ydHMgPSBzdW07XG4iLCIndXNlIHN0cmljdCdcblxuc2V0RE9NLktFWSA9ICdkYXRhLWtleSdcbnNldERPTS5JR05PUkUgPSAnZGF0YS1pZ25vcmUnXG5zZXRET00uQ0hFQ0tTVU0gPSAnZGF0YS1jaGVja3N1bSdcbnZhciBwYXJzZUhUTUwgPSByZXF1aXJlKCcuL3BhcnNlLWh0bWwnKVxudmFyIEtFWV9QUkVGSVggPSAnX3NldC1kb20tJ1xudmFyIE5PREVfTU9VTlRFRCA9IEtFWV9QUkVGSVggKyAnbW91bnRlZCdcbnZhciBFTEVNRU5UX1RZUEUgPSAxXG52YXIgRE9DVU1FTlRfVFlQRSA9IDlcbnZhciBET0NVTUVOVF9GUkFHTUVOVF9UWVBFID0gMTFcblxuLy8gRXhwb3NlIGFwaS5cbm1vZHVsZS5leHBvcnRzID0gc2V0RE9NXG5cbi8qKlxuICogQGRlc2NyaXB0aW9uXG4gKiBVcGRhdGVzIGV4aXN0aW5nIGRvbSB0byBtYXRjaCBhIG5ldyBkb20uXG4gKlxuICogQHBhcmFtIHtOb2RlfSBvbGROb2RlIC0gVGhlIGh0bWwgZW50aXR5IHRvIHVwZGF0ZS5cbiAqIEBwYXJhbSB7U3RyaW5nfE5vZGV9IG5ld05vZGUgLSBUaGUgdXBkYXRlZCBodG1sKGVudGl0eSkuXG4gKi9cbmZ1bmN0aW9uIHNldERPTSAob2xkTm9kZSwgbmV3Tm9kZSkge1xuICAvLyBFbnN1cmUgYSByZWFsaXNoIGRvbSBub2RlIGlzIHByb3ZpZGVkLlxuICBhc3NlcnQob2xkTm9kZSAmJiBvbGROb2RlLm5vZGVUeXBlLCAnWW91IG11c3QgcHJvdmlkZSBhIHZhbGlkIG5vZGUgdG8gdXBkYXRlLicpXG5cbiAgLy8gQWxpYXMgZG9jdW1lbnQgZWxlbWVudCB3aXRoIGRvY3VtZW50LlxuICBpZiAob2xkTm9kZS5ub2RlVHlwZSA9PT0gRE9DVU1FTlRfVFlQRSkgb2xkTm9kZSA9IG9sZE5vZGUuZG9jdW1lbnRFbGVtZW50XG5cbiAgLy8gRG9jdW1lbnQgRnJhZ21lbnRzIGRvbid0IGhhdmUgYXR0cmlidXRlcywgc28gbm8gbmVlZCB0byBsb29rIGF0IGNoZWNrc3VtcywgaWdub3JlZCwgYXR0cmlidXRlcywgb3Igbm9kZSByZXBsYWNlbWVudC5cbiAgaWYgKG5ld05vZGUubm9kZVR5cGUgPT09IERPQ1VNRU5UX0ZSQUdNRU5UX1RZUEUpIHtcbiAgICAvLyBTaW1wbHkgdXBkYXRlIGFsbCBjaGlsZHJlbiAoYW5kIHN1YmNoaWxkcmVuKS5cbiAgICBzZXRDaGlsZE5vZGVzKG9sZE5vZGUsIG5ld05vZGUpXG4gIH0gZWxzZSB7XG4gICAgLy8gT3RoZXJ3aXNlIHdlIGRpZmYgdGhlIGVudGlyZSBvbGQgbm9kZS5cbiAgICBzZXROb2RlKG9sZE5vZGUsIHR5cGVvZiBuZXdOb2RlID09PSAnc3RyaW5nJ1xuICAgICAgLy8gSWYgYSBzdHJpbmcgd2FzIHByb3ZpZGVkIHdlIHdpbGwgcGFyc2UgaXQgYXMgZG9tLlxuICAgICAgPyBwYXJzZUhUTUwobmV3Tm9kZSwgb2xkTm9kZS5ub2RlTmFtZSlcbiAgICAgIDogbmV3Tm9kZVxuICAgIClcbiAgfVxuXG4gIC8vIFRyaWdnZXIgbW91bnQgZXZlbnRzIG9uIGluaXRpYWwgc2V0LlxuICBpZiAoIW9sZE5vZGVbTk9ERV9NT1VOVEVEXSkge1xuICAgIG9sZE5vZGVbTk9ERV9NT1VOVEVEXSA9IHRydWVcbiAgICBtb3VudChvbGROb2RlKVxuICB9XG59XG5cbi8qKlxuICogQHByaXZhdGVcbiAqIEBkZXNjcmlwdGlvblxuICogVXBkYXRlcyBhIHNwZWNpZmljIGh0bWxOb2RlIGFuZCBkb2VzIHdoYXRldmVyIGl0IHRha2VzIHRvIGNvbnZlcnQgaXQgdG8gYW5vdGhlciBvbmUuXG4gKlxuICogQHBhcmFtIHtOb2RlfSBvbGROb2RlIC0gVGhlIHByZXZpb3VzIEhUTUxOb2RlLlxuICogQHBhcmFtIHtOb2RlfSBuZXdOb2RlIC0gVGhlIHVwZGF0ZWQgSFRNTE5vZGUuXG4gKi9cbmZ1bmN0aW9uIHNldE5vZGUgKG9sZE5vZGUsIG5ld05vZGUpIHtcbiAgaWYgKG9sZE5vZGUubm9kZVR5cGUgPT09IG5ld05vZGUubm9kZVR5cGUpIHtcbiAgICAvLyBIYW5kbGUgcmVndWxhciBlbGVtZW50IG5vZGUgdXBkYXRlcy5cbiAgICBpZiAob2xkTm9kZS5ub2RlVHlwZSA9PT0gRUxFTUVOVF9UWVBFKSB7XG4gICAgICAvLyBDaGVja3MgaWYgbm9kZXMgYXJlIGVxdWFsIGJlZm9yZSBkaWZmaW5nLlxuICAgICAgaWYgKGlzRXF1YWxOb2RlKG9sZE5vZGUsIG5ld05vZGUpKSByZXR1cm5cblxuICAgICAgLy8gVXBkYXRlIGFsbCBjaGlsZHJlbiAoYW5kIHN1YmNoaWxkcmVuKS5cbiAgICAgIHNldENoaWxkTm9kZXMob2xkTm9kZSwgbmV3Tm9kZSlcblxuICAgICAgLy8gVXBkYXRlIHRoZSBlbGVtZW50cyBhdHRyaWJ1dGVzIC8gdGFnTmFtZS5cbiAgICAgIGlmIChvbGROb2RlLm5vZGVOYW1lID09PSBuZXdOb2RlLm5vZGVOYW1lKSB7XG4gICAgICAgIC8vIElmIHdlIGhhdmUgdGhlIHNhbWUgbm9kZW5hbWUgdGhlbiB3ZSBjYW4gZGlyZWN0bHkgdXBkYXRlIHRoZSBhdHRyaWJ1dGVzLlxuICAgICAgICBzZXRBdHRyaWJ1dGVzKG9sZE5vZGUuYXR0cmlidXRlcywgbmV3Tm9kZS5hdHRyaWJ1dGVzKVxuICAgICAgfSBlbHNlIHtcbiAgICAgICAgLy8gT3RoZXJ3aXNlIGNsb25lIHRoZSBuZXcgbm9kZSB0byB1c2UgYXMgdGhlIGV4aXN0aW5nIG5vZGUuXG4gICAgICAgIHZhciBuZXdQcmV2ID0gbmV3Tm9kZS5jbG9uZU5vZGUoKVxuICAgICAgICAvLyBDb3B5IG92ZXIgYWxsIGV4aXN0aW5nIGNoaWxkcmVuIGZyb20gdGhlIG9yaWdpbmFsIG5vZGUuXG4gICAgICAgIHdoaWxlIChvbGROb2RlLmZpcnN0Q2hpbGQpIG5ld1ByZXYuYXBwZW5kQ2hpbGQob2xkTm9kZS5maXJzdENoaWxkKVxuICAgICAgICAvLyBSZXBsYWNlIHRoZSBvcmlnaW5hbCBub2RlIHdpdGggdGhlIG5ldyBvbmUgd2l0aCB0aGUgcmlnaHQgdGFnLlxuICAgICAgICBvbGROb2RlLnBhcmVudE5vZGUucmVwbGFjZUNoaWxkKG5ld1ByZXYsIG9sZE5vZGUpXG4gICAgICB9XG4gICAgfSBlbHNlIHtcbiAgICAgIC8vIEhhbmRsZSBvdGhlciB0eXBlcyBvZiBub2RlIHVwZGF0ZXMgKHRleHQvY29tbWVudHMvZXRjKS5cbiAgICAgIC8vIElmIGJvdGggYXJlIHRoZSBzYW1lIHR5cGUgb2Ygbm9kZSB3ZSBjYW4gdXBkYXRlIGRpcmVjdGx5LlxuICAgICAgaWYgKG9sZE5vZGUubm9kZVZhbHVlICE9PSBuZXdOb2RlLm5vZGVWYWx1ZSkge1xuICAgICAgICBvbGROb2RlLm5vZGVWYWx1ZSA9IG5ld05vZGUubm9kZVZhbHVlXG4gICAgICB9XG4gICAgfVxuICB9IGVsc2Uge1xuICAgIC8vIHdlIGhhdmUgdG8gcmVwbGFjZSB0aGUgbm9kZS5cbiAgICBvbGROb2RlLnBhcmVudE5vZGUucmVwbGFjZUNoaWxkKG5ld05vZGUsIGRpc21vdW50KG9sZE5vZGUpKVxuICAgIG1vdW50KG5ld05vZGUpXG4gIH1cbn1cblxuLyoqXG4gKiBAcHJpdmF0ZVxuICogQGRlc2NyaXB0aW9uXG4gKiBVdGlsaXR5IHRoYXQgd2lsbCB1cGRhdGUgb25lIGxpc3Qgb2YgYXR0cmlidXRlcyB0byBtYXRjaCBhbm90aGVyLlxuICpcbiAqIEBwYXJhbSB7TmFtZWROb2RlTWFwfSBvbGRBdHRyaWJ1dGVzIC0gVGhlIHByZXZpb3VzIGF0dHJpYnV0ZXMuXG4gKiBAcGFyYW0ge05hbWVkTm9kZU1hcH0gbmV3QXR0cmlidXRlcyAtIFRoZSB1cGRhdGVkIGF0dHJpYnV0ZXMuXG4gKi9cbmZ1bmN0aW9uIHNldEF0dHJpYnV0ZXMgKG9sZEF0dHJpYnV0ZXMsIG5ld0F0dHJpYnV0ZXMpIHtcbiAgdmFyIGksIGEsIGIsIG5zLCBuYW1lXG5cbiAgLy8gUmVtb3ZlIG9sZCBhdHRyaWJ1dGVzLlxuICBmb3IgKGkgPSBvbGRBdHRyaWJ1dGVzLmxlbmd0aDsgaS0tOykge1xuICAgIGEgPSBvbGRBdHRyaWJ1dGVzW2ldXG4gICAgbnMgPSBhLm5hbWVzcGFjZVVSSVxuICAgIG5hbWUgPSBhLmxvY2FsTmFtZVxuICAgIGIgPSBuZXdBdHRyaWJ1dGVzLmdldE5hbWVkSXRlbU5TKG5zLCBuYW1lKVxuICAgIGlmICghYikgb2xkQXR0cmlidXRlcy5yZW1vdmVOYW1lZEl0ZW1OUyhucywgbmFtZSlcbiAgfVxuXG4gIC8vIFNldCBuZXcgYXR0cmlidXRlcy5cbiAgZm9yIChpID0gbmV3QXR0cmlidXRlcy5sZW5ndGg7IGktLTspIHtcbiAgICBhID0gbmV3QXR0cmlidXRlc1tpXVxuICAgIG5zID0gYS5uYW1lc3BhY2VVUklcbiAgICBuYW1lID0gYS5sb2NhbE5hbWVcbiAgICBiID0gb2xkQXR0cmlidXRlcy5nZXROYW1lZEl0ZW1OUyhucywgbmFtZSlcbiAgICBpZiAoIWIpIHtcbiAgICAgIC8vIEFkZCBhIG5ldyBhdHRyaWJ1dGUuXG4gICAgICBuZXdBdHRyaWJ1dGVzLnJlbW92ZU5hbWVkSXRlbU5TKG5zLCBuYW1lKVxuICAgICAgb2xkQXR0cmlidXRlcy5zZXROYW1lZEl0ZW1OUyhhKVxuICAgIH0gZWxzZSBpZiAoYi52YWx1ZSAhPT0gYS52YWx1ZSkge1xuICAgICAgLy8gVXBkYXRlIGV4aXN0aW5nIGF0dHJpYnV0ZS5cbiAgICAgIGIudmFsdWUgPSBhLnZhbHVlXG4gICAgfVxuICB9XG59XG5cbi8qKlxuICogQHByaXZhdGVcbiAqIEBkZXNjcmlwdGlvblxuICogVXRpbGl0eSB0aGF0IHdpbGwgbm9kZXMgY2hpbGRlcm4gdG8gbWF0Y2ggYW5vdGhlciBub2RlcyBjaGlsZHJlbi5cbiAqXG4gKiBAcGFyYW0ge05vZGV9IG9sZFBhcmVudCAtIFRoZSBleGlzdGluZyBwYXJlbnQgbm9kZS5cbiAqIEBwYXJhbSB7Tm9kZX0gbmV3UGFyZW50IC0gVGhlIG5ldyBwYXJlbnQgbm9kZS5cbiAqL1xuZnVuY3Rpb24gc2V0Q2hpbGROb2RlcyAob2xkUGFyZW50LCBuZXdQYXJlbnQpIHtcbiAgdmFyIGNoZWNrT2xkLCBvbGRLZXksIGNoZWNrTmV3LCBuZXdLZXksIGZvdW5kTm9kZSwga2V5ZWROb2Rlc1xuICB2YXIgb2xkTm9kZSA9IG9sZFBhcmVudC5maXJzdENoaWxkXG4gIHZhciBuZXdOb2RlID0gbmV3UGFyZW50LmZpcnN0Q2hpbGRcbiAgdmFyIGV4dHJhID0gMFxuXG4gIC8vIEV4dHJhY3Qga2V5ZWQgbm9kZXMgZnJvbSBwcmV2aW91cyBjaGlsZHJlbiBhbmQga2VlcCB0cmFjayBvZiB0b3RhbCBjb3VudC5cbiAgd2hpbGUgKG9sZE5vZGUpIHtcbiAgICBleHRyYSsrXG4gICAgY2hlY2tPbGQgPSBvbGROb2RlXG4gICAgb2xkS2V5ID0gZ2V0S2V5KGNoZWNrT2xkKVxuICAgIG9sZE5vZGUgPSBvbGROb2RlLm5leHRTaWJsaW5nXG5cbiAgICBpZiAob2xkS2V5KSB7XG4gICAgICBpZiAoIWtleWVkTm9kZXMpIGtleWVkTm9kZXMgPSB7fVxuICAgICAga2V5ZWROb2Rlc1tvbGRLZXldID0gY2hlY2tPbGRcbiAgICB9XG4gIH1cblxuICAvLyBMb29wIG92ZXIgbmV3IG5vZGVzIGFuZCBwZXJmb3JtIHVwZGF0ZXMuXG4gIG9sZE5vZGUgPSBvbGRQYXJlbnQuZmlyc3RDaGlsZFxuICB3aGlsZSAobmV3Tm9kZSkge1xuICAgIGV4dHJhLS1cbiAgICBjaGVja05ldyA9IG5ld05vZGVcbiAgICBuZXdOb2RlID0gbmV3Tm9kZS5uZXh0U2libGluZ1xuXG4gICAgaWYgKGtleWVkTm9kZXMgJiYgKG5ld0tleSA9IGdldEtleShjaGVja05ldykpICYmIChmb3VuZE5vZGUgPSBrZXllZE5vZGVzW25ld0tleV0pKSB7XG4gICAgICBkZWxldGUga2V5ZWROb2Rlc1tuZXdLZXldXG4gICAgICAvLyBJZiB3ZSBoYXZlIGEga2V5IGFuZCBpdCBleGlzdGVkIGJlZm9yZSB3ZSBtb3ZlIHRoZSBwcmV2aW91cyBub2RlIHRvIHRoZSBuZXcgcG9zaXRpb24gaWYgbmVlZGVkIGFuZCBkaWZmIGl0LlxuICAgICAgaWYgKGZvdW5kTm9kZSAhPT0gb2xkTm9kZSkge1xuICAgICAgICBvbGRQYXJlbnQuaW5zZXJ0QmVmb3JlKGZvdW5kTm9kZSwgb2xkTm9kZSlcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIG9sZE5vZGUgPSBvbGROb2RlLm5leHRTaWJsaW5nXG4gICAgICB9XG5cbiAgICAgIHNldE5vZGUoZm91bmROb2RlLCBjaGVja05ldylcbiAgICB9IGVsc2UgaWYgKG9sZE5vZGUpIHtcbiAgICAgIGNoZWNrT2xkID0gb2xkTm9kZVxuICAgICAgb2xkTm9kZSA9IG9sZE5vZGUubmV4dFNpYmxpbmdcbiAgICAgIGlmIChnZXRLZXkoY2hlY2tPbGQpKSB7XG4gICAgICAgIC8vIElmIHRoZSBvbGQgY2hpbGQgaGFkIGEga2V5IHdlIHNraXAgb3ZlciBpdCB1bnRpbCB0aGUgZW5kLlxuICAgICAgICBvbGRQYXJlbnQuaW5zZXJ0QmVmb3JlKGNoZWNrTmV3LCBjaGVja09sZClcbiAgICAgICAgbW91bnQoY2hlY2tOZXcpXG4gICAgICB9IGVsc2Uge1xuICAgICAgICAvLyBPdGhlcndpc2Ugd2UgZGlmZiB0aGUgdHdvIG5vbi1rZXllZCBub2Rlcy5cbiAgICAgICAgc2V0Tm9kZShjaGVja09sZCwgY2hlY2tOZXcpXG4gICAgICB9XG4gICAgfSBlbHNlIHtcbiAgICAgIC8vIEZpbmFsbHkgaWYgdGhlcmUgd2FzIG5vIG9sZCBub2RlIHdlIGFkZCB0aGUgbmV3IG5vZGUuXG4gICAgICBvbGRQYXJlbnQuYXBwZW5kQ2hpbGQoY2hlY2tOZXcpXG4gICAgICBtb3VudChjaGVja05ldylcbiAgICB9XG4gIH1cblxuICAvLyBSZW1vdmUgb2xkIGtleWVkIG5vZGVzLlxuICBmb3IgKG9sZEtleSBpbiBrZXllZE5vZGVzKSB7XG4gICAgZXh0cmEtLVxuICAgIG9sZFBhcmVudC5yZW1vdmVDaGlsZChkaXNtb3VudChrZXllZE5vZGVzW29sZEtleV0pKVxuICB9XG5cbiAgLy8gSWYgd2UgaGF2ZSBhbnkgcmVtYWluaW5nIHVua2V5ZWQgbm9kZXMgcmVtb3ZlIHRoZW0gZnJvbSB0aGUgZW5kLlxuICB3aGlsZSAoLS1leHRyYSA+PSAwKSB7XG4gICAgb2xkUGFyZW50LnJlbW92ZUNoaWxkKGRpc21vdW50KG9sZFBhcmVudC5sYXN0Q2hpbGQpKVxuICB9XG59XG5cbi8qKlxuICogQHByaXZhdGVcbiAqIEBkZXNjcmlwdGlvblxuICogVXRpbGl0eSB0byB0cnkgdG8gcHVsbCBhIGtleSBvdXQgb2YgYW4gZWxlbWVudC5cbiAqIFVzZXMgJ2RhdGEta2V5JyBpZiBwb3NzaWJsZSBhbmQgZmFsbHMgYmFjayB0byAnaWQnLlxuICpcbiAqIEBwYXJhbSB7Tm9kZX0gbm9kZSAtIFRoZSBub2RlIHRvIGdldCB0aGUga2V5IGZvci5cbiAqIEByZXR1cm4ge3N0cmluZ3x2b2lkfVxuICovXG5mdW5jdGlvbiBnZXRLZXkgKG5vZGUpIHtcbiAgaWYgKG5vZGUubm9kZVR5cGUgIT09IEVMRU1FTlRfVFlQRSkgcmV0dXJuXG4gIHZhciBrZXkgPSBub2RlLmdldEF0dHJpYnV0ZShzZXRET00uS0VZKSB8fCBub2RlLmlkXG4gIGlmIChrZXkpIHJldHVybiBLRVlfUFJFRklYICsga2V5XG59XG5cbi8qKlxuICogQ2hlY2tzIGlmIG5vZGVzIGFyZSBlcXVhbCB1c2luZyB0aGUgZm9sbG93aW5nIGJ5IGNoZWNraW5nIGlmXG4gKiB0aGV5IGFyZSBib3RoIGlnbm9yZWQsIGhhdmUgdGhlIHNhbWUgY2hlY2tzdW0sIG9yIGhhdmUgdGhlXG4gKiBzYW1lIGNvbnRlbnRzLlxuICpcbiAqIEBwYXJhbSB7Tm9kZX0gYSAtIE9uZSBvZiB0aGUgbm9kZXMgdG8gY29tcGFyZS5cbiAqIEBwYXJhbSB7Tm9kZX0gYiAtIEFub3RoZXIgbm9kZSB0byBjb21wYXJlLlxuICovXG5mdW5jdGlvbiBpc0VxdWFsTm9kZSAoYSwgYikge1xuICByZXR1cm4gKFxuICAgIC8vIENoZWNrIGlmIGJvdGggbm9kZXMgYXJlIGlnbm9yZWQuXG4gICAgKGlzSWdub3JlZChhKSAmJiBpc0lnbm9yZWQoYikpIHx8XG4gICAgLy8gQ2hlY2sgaWYgYm90aCBub2RlcyBoYXZlIHRoZSBzYW1lIGNoZWNrc3VtLlxuICAgIChnZXRDaGVja1N1bShhKSA9PT0gZ2V0Q2hlY2tTdW0oYikpIHx8XG4gICAgLy8gRmFsbCBiYWNrIHRvIG5hdGl2ZSBpc0VxdWFsTm9kZSBjaGVjay5cbiAgICBhLmlzRXF1YWxOb2RlKGIpXG4gIClcbn1cblxuLyoqXG4gKiBAcHJpdmF0ZVxuICogQGRlc2NyaXB0aW9uXG4gKiBVdGlsaXR5IHRvIHRyeSB0byBwdWxsIGEgY2hlY2tzdW0gYXR0cmlidXRlIGZyb20gYW4gZWxlbWVudC5cbiAqIFVzZXMgJ2RhdGEtY2hlY2tzdW0nIG9yIHVzZXIgc3BlY2lmaWVkIGNoZWNrc3VtIHByb3BlcnR5LlxuICpcbiAqIEBwYXJhbSB7Tm9kZX0gbm9kZSAtIFRoZSBub2RlIHRvIGdldCB0aGUgY2hlY2tzdW0gZm9yLlxuICogQHJldHVybiB7c3RyaW5nfE5hTn1cbiAqL1xuZnVuY3Rpb24gZ2V0Q2hlY2tTdW0gKG5vZGUpIHtcbiAgcmV0dXJuIG5vZGUuZ2V0QXR0cmlidXRlKHNldERPTS5DSEVDS1NVTSkgfHwgTmFOXG59XG5cbi8qKlxuICogQHByaXZhdGVcbiAqIEBkZXNjcmlwdGlvblxuICogVXRpbGl0eSB0byB0cnkgdG8gY2hlY2sgaWYgYW4gZWxlbWVudCBzaG91bGQgYmUgaWdub3JlZCBieSB0aGUgYWxnb3JpdGhtLlxuICogVXNlcyAnZGF0YS1pZ25vcmUnIG9yIHVzZXIgc3BlY2lmaWVkIGlnbm9yZSBwcm9wZXJ0eS5cbiAqXG4gKiBAcGFyYW0ge05vZGV9IG5vZGUgLSBUaGUgbm9kZSB0byBjaGVjayBpZiBpdCBzaG91bGQgYmUgaWdub3JlZC5cbiAqIEByZXR1cm4ge2Jvb2xlYW59XG4gKi9cbmZ1bmN0aW9uIGlzSWdub3JlZCAobm9kZSkge1xuICByZXR1cm4gbm9kZS5nZXRBdHRyaWJ1dGUoc2V0RE9NLklHTk9SRSkgIT0gbnVsbFxufVxuXG4vKipcbiAqIERpc3BhdGNoZXMgYSBtb3VudCBldmVudCBmb3IgdGhlIGdpdmVuIG5vZGUgYW5kIGNoaWxkcmVuLlxuICpcbiAqIEBwYXJhbSB7Tm9kZX0gbm9kZSAtIHRoZSBub2RlIHRvIG1vdW50LlxuICogQHJldHVybiB7bm9kZX1cbiAqL1xuZnVuY3Rpb24gbW91bnQgKG5vZGUpIHtcbiAgcmV0dXJuIGRpc3BhdGNoKG5vZGUsICdtb3VudCcpXG59XG5cbi8qKlxuICogRGlzcGF0Y2hlcyBhIGRpc21vdW50IGV2ZW50IGZvciB0aGUgZ2l2ZW4gbm9kZSBhbmQgY2hpbGRyZW4uXG4gKlxuICogQHBhcmFtIHtOb2RlfSBub2RlIC0gdGhlIG5vZGUgdG8gZGlzbW91bnQuXG4gKiBAcmV0dXJuIHtub2RlfVxuICovXG5mdW5jdGlvbiBkaXNtb3VudCAobm9kZSkge1xuICByZXR1cm4gZGlzcGF0Y2gobm9kZSwgJ2Rpc21vdW50Jylcbn1cblxuLyoqXG4gKiBSZWN1cnNpdmVseSB0cmlnZ2VyIGFuIGV2ZW50IGZvciBhIG5vZGUgYW5kIGl0J3MgY2hpbGRyZW4uXG4gKiBPbmx5IGVtaXRzIGV2ZW50cyBmb3Iga2V5ZWQgbm9kZXMuXG4gKlxuICogQHBhcmFtIHtOb2RlfSBub2RlIC0gdGhlIGluaXRpYWwgbm9kZS5cbiAqIEByZXR1cm4ge05vZGV9XG4gKi9cbmZ1bmN0aW9uIGRpc3BhdGNoIChub2RlLCB0eXBlKSB7XG4gIC8vIFRyaWdnZXIgZXZlbnQgZm9yIHRoaXMgZWxlbWVudCBpZiBpdCBoYXMgYSBrZXkuXG4gIGlmIChnZXRLZXkobm9kZSkpIHtcbiAgICB2YXIgZXYgPSBkb2N1bWVudC5jcmVhdGVFdmVudCgnRXZlbnQnKVxuICAgIHZhciBwcm9wID0geyB2YWx1ZTogbm9kZSB9XG4gICAgZXYuaW5pdEV2ZW50KHR5cGUsIGZhbHNlLCBmYWxzZSlcbiAgICBPYmplY3QuZGVmaW5lUHJvcGVydHkoZXYsICd0YXJnZXQnLCBwcm9wKVxuICAgIE9iamVjdC5kZWZpbmVQcm9wZXJ0eShldiwgJ3NyY0VsZW1lbnQnLCBwcm9wKVxuICAgIG5vZGUuZGlzcGF0Y2hFdmVudChldilcbiAgfVxuXG4gIC8vIERpc3BhdGNoIHRvIGFsbCBjaGlsZHJlbi5cbiAgdmFyIGNoaWxkID0gbm9kZS5maXJzdENoaWxkXG4gIHdoaWxlIChjaGlsZCkgY2hpbGQgPSBkaXNwYXRjaChjaGlsZCwgdHlwZSkubmV4dFNpYmxpbmdcbiAgcmV0dXJuIG5vZGVcbn1cblxuLyoqXG4gKiBAcHJpdmF0ZVxuICogQGRlc2NyaXB0aW9uXG4gKiBDb25maXJtIHRoYXQgYSB2YWx1ZSBpcyB0cnV0aHksIHRocm93cyBhbiBlcnJvciBtZXNzYWdlIG90aGVyd2lzZS5cbiAqXG4gKiBAcGFyYW0geyp9IHZhbCAtIHRoZSB2YWwgdG8gdGVzdC5cbiAqIEBwYXJhbSB7c3RyaW5nfSBtc2cgLSB0aGUgZXJyb3IgbWVzc2FnZSBvbiBmYWlsdXJlLlxuICogQHRocm93cyB7RXJyb3J9XG4gKi9cbmZ1bmN0aW9uIGFzc2VydCAodmFsLCBtc2cpIHtcbiAgaWYgKCF2YWwpIHRocm93IG5ldyBFcnJvcignc2V0LWRvbTogJyArIG1zZylcbn1cbiIsIid1c2Ugc3RyaWN0J1xudmFyIHBhcnNlciA9IHdpbmRvdy5ET01QYXJzZXIgJiYgbmV3IHdpbmRvdy5ET01QYXJzZXIoKVxudmFyIGRvY3VtZW50Um9vdE5hbWUgPSAnSFRNTCdcbnZhciBzdXBwb3J0c0hUTUxUeXBlID0gZmFsc2VcbnZhciBzdXBwb3J0c0lubmVySFRNTCA9IGZhbHNlXG52YXIgaHRtbFR5cGUgPSAndGV4dC9odG1sJ1xudmFyIHhodG1sVHlwZSA9ICdhcHBsaWNhdGlvbi94aHRtbCt4bWwnXG52YXIgdGVzdENsYXNzID0gJ0EnXG52YXIgdGVzdENvZGUgPSAnPHdiciBjbGFzcz1cIicgKyB0ZXN0Q2xhc3MgKyAnXCIvPidcblxudHJ5IHtcbiAgLy8gQ2hlY2sgaWYgYnJvd3NlciBzdXBwb3J0cyB0ZXh0L2h0bWwgRE9NUGFyc2VyXG4gIHZhciBwYXJzZWQgPSBwYXJzZXIucGFyc2VGcm9tU3RyaW5nKHRlc3RDb2RlLCBodG1sVHlwZSkuYm9keS5maXJzdENoaWxkXG4gIC8vIFNvbWUgYnJvd3NlcnMgKGlPUyA5IGFuZCBTYWZhcmkgOSkgbG93ZXJjYXNlIGNsYXNzZXMgZm9yIHBhcnNlZCBlbGVtZW50c1xuICAvLyBidXQgb25seSB3aGVuIGFwcGVuZGluZyB0byBET00sIHNvIHVzZSBpbm5lckhUTUwgaW5zdGVhZFxuICB2YXIgZCA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2RpdicpXG4gIGQuYXBwZW5kQ2hpbGQocGFyc2VkKVxuICBpZiAoZC5maXJzdENoaWxkLmNsYXNzTGlzdFswXSAhPT0gdGVzdENsYXNzKSB0aHJvdyBuZXcgRXJyb3IoKVxuICBzdXBwb3J0c0hUTUxUeXBlID0gdHJ1ZVxufSBjYXRjaCAoZSkge31cblxudmFyIG1vY2tEb2MgPSBkb2N1bWVudC5pbXBsZW1lbnRhdGlvbi5jcmVhdGVIVE1MRG9jdW1lbnQoJycpXG52YXIgbW9ja0hUTUwgPSBtb2NrRG9jLmRvY3VtZW50RWxlbWVudFxudmFyIG1vY2tCb2R5ID0gbW9ja0RvYy5ib2R5XG50cnkge1xuICAvLyBDaGVjayBpZiBicm93c2VyIHN1cHBvcnRzIGRvY3VtZW50RWxlbWVudC5pbm5lckhUTUxcbiAgbW9ja0hUTUwuaW5uZXJIVE1MICs9ICcnXG4gIHN1cHBvcnRzSW5uZXJIVE1MID0gdHJ1ZVxufSBjYXRjaCAoZSkge1xuICAvLyBDaGVjayBpZiBicm93c2VyIHN1cHBvcnRzIHhodG1sIHBhcnNpbmcuXG4gIHBhcnNlci5wYXJzZUZyb21TdHJpbmcodGVzdENvZGUsIHhodG1sVHlwZSlcbiAgdmFyIGJvZHlSZWcgPSAvKDxib2R5W14+XSo+KShbXFxzXFxTXSopPFxcL2JvZHk+L1xufVxuXG5mdW5jdGlvbiBET01QYXJzZXJQYXJzZSAobWFya3VwLCByb290TmFtZSkge1xuICB2YXIgZG9jID0gcGFyc2VyLnBhcnNlRnJvbVN0cmluZyhtYXJrdXAsIGh0bWxUeXBlKVxuICAvLyBQYXRjaCBmb3IgaU9TIFVJV2ViVmlldyBub3QgYWx3YXlzIHJldHVybmluZyBkb2MuYm9keSBzeW5jaHJvbm91c2x5XG4gIGlmICghZG9jLmJvZHkpIHsgcmV0dXJuIGZhbGxiYWNrUGFyc2UobWFya3VwLCByb290TmFtZSkgfVxuXG4gIHJldHVybiByb290TmFtZSA9PT0gZG9jdW1lbnRSb290TmFtZVxuICAgID8gZG9jLmRvY3VtZW50RWxlbWVudFxuICAgIDogZG9jLmJvZHkuZmlyc3RDaGlsZFxufVxuXG5mdW5jdGlvbiBmYWxsYmFja1BhcnNlIChtYXJrdXAsIHJvb3ROYW1lKSB7XG4gIC8vIEZhbGxiYWNrIHRvIGlubmVySFRNTCBmb3Igb3RoZXIgb2xkZXIgYnJvd3NlcnMuXG4gIGlmIChyb290TmFtZSA9PT0gZG9jdW1lbnRSb290TmFtZSkge1xuICAgIGlmIChzdXBwb3J0c0lubmVySFRNTCkge1xuICAgICAgbW9ja0hUTUwuaW5uZXJIVE1MID0gbWFya3VwXG4gICAgICByZXR1cm4gbW9ja0hUTUxcbiAgICB9IGVsc2Uge1xuICAgICAgLy8gSUU5IGRvZXMgbm90IHN1cHBvcnQgaW5uZXJodG1sIGF0IHJvb3QgbGV2ZWwuXG4gICAgICAvLyBXZSBnZXQgYXJvdW5kIHRoaXMgYnkgcGFyc2luZyBldmVyeXRoaW5nIGV4Y2VwdCB0aGUgYm9keSBhcyB4aHRtbC5cbiAgICAgIHZhciBib2R5TWF0Y2ggPSBtYXJrdXAubWF0Y2goYm9keVJlZylcbiAgICAgIGlmIChib2R5TWF0Y2gpIHtcbiAgICAgICAgdmFyIGJvZHlDb250ZW50ID0gYm9keU1hdGNoWzJdXG4gICAgICAgIHZhciBzdGFydEJvZHkgPSBib2R5TWF0Y2guaW5kZXggKyBib2R5TWF0Y2hbMV0ubGVuZ3RoXG4gICAgICAgIHZhciBlbmRCb2R5ID0gc3RhcnRCb2R5ICsgYm9keUNvbnRlbnQubGVuZ3RoXG4gICAgICAgIG1hcmt1cCA9IG1hcmt1cC5zbGljZSgwLCBzdGFydEJvZHkpICsgbWFya3VwLnNsaWNlKGVuZEJvZHkpXG4gICAgICAgIG1vY2tCb2R5LmlubmVySFRNTCA9IGJvZHlDb250ZW50XG4gICAgICB9XG5cbiAgICAgIHZhciBkb2MgPSBwYXJzZXIucGFyc2VGcm9tU3RyaW5nKG1hcmt1cCwgeGh0bWxUeXBlKVxuICAgICAgdmFyIGJvZHkgPSBkb2MuYm9keVxuICAgICAgd2hpbGUgKG1vY2tCb2R5LmZpcnN0Q2hpbGQpIGJvZHkuYXBwZW5kQ2hpbGQobW9ja0JvZHkuZmlyc3RDaGlsZClcbiAgICAgIHJldHVybiBkb2MuZG9jdW1lbnRFbGVtZW50XG4gICAgfVxuICB9IGVsc2Uge1xuICAgIG1vY2tCb2R5LmlubmVySFRNTCA9IG1hcmt1cFxuICAgIHJldHVybiBtb2NrQm9keS5maXJzdENoaWxkXG4gIH1cbn1cblxuLyoqXG4gKiBSZXR1cm5zIHRoZSByZXN1bHRzIG9mIGEgRE9NUGFyc2VyIGFzIGFuIEhUTUxFbGVtZW50LlxuICogKFNoaW1zIGZvciBvbGRlciBicm93c2VycykuXG4gKi9cbm1vZHVsZS5leHBvcnRzID0gc3VwcG9ydHNIVE1MVHlwZVxuICA/IERPTVBhcnNlclBhcnNlXG4gIDogZmFsbGJhY2tQYXJzZVxuIiwiY29uc3QgS2VldCA9IHJlcXVpcmUoJy4uL2tlZXQnKVxyXG5cclxuY29uc3QgeyBjYW1lbENhc2UsIGh0bWwgfSA9IHJlcXVpcmUoJy4vdXRpbCcpXHJcblxyXG5jb25zdCBjcmVhdGVUb2RvTW9kZWwgPSByZXF1aXJlKCcuL3RvZG9Nb2RlbCcpXHJcblxyXG5jb25zdCB0b2RvQXBwID0gcmVxdWlyZSgnLi90b2RvJylcclxuXHJcbmNvbnN0IGxvZyA9IGNvbnNvbGUubG9nLmJpbmQoY29uc29sZSlcclxuXHJcbmNvbnN0IGZpbHRlclBhZ2UgPSBbJ2FsbCcsICdhY3RpdmUnLCAnY29tcGxldGVkJ11cclxuXHJcbmNsYXNzIEFwcCBleHRlbmRzIEtlZXQge1xyXG5cclxuICBtb2RlbCA9IGNyZWF0ZVRvZG9Nb2RlbCh0b2RvQXBwKVxyXG5cclxuICBwYWdlID0gJ0FsbCdcclxuXHJcbiAgaXNDaGVja2VkID0gJydcclxuXHJcbiAgY291bnQgPSAwXHJcblxyXG4gIHBsdXJhbCA9ICcnXHJcblxyXG4gIGNsZWFyVG9nZ2xlID0gJ25vbmUnXHJcblxyXG4gIGNvbXBvbmVudFdpbGxNb3VudCgpIHtcclxuXHJcbiAgICBmaWx0ZXJQYWdlLm1hcChmID0+IHRoaXNbYGNfJHtmfWBdID0gJycpXHJcbiAgICBcclxuICAgIHRoaXMubW9kZWwuc3Vic2NyaWJlKCBzdG9yZSA9PiB7XHJcbiAgICAgIGxldCBjID0gc3RvcmUuZmlsdGVyKGMgPT4gIWMuY29tcGxldGVkKVxyXG4gICAgICB0aGlzLnRvZG9TdGF0ZSA9IHN0b3JlLmxlbmd0aCA/IHRydWUgOiBmYWxzZVxyXG4gICAgICB0aGlzLnBsdXJhbCA9IGMubGVuZ3RoID09PSAxID8gJycgOiAncydcclxuICAgICAgdGhpcy5jb3VudCA9IGMubGVuZ3RoXHJcbiAgICB9KVxyXG4gIH1cclxuXHJcbiAgY29tcG9uZW50RGlkTW91bnQoKXtcclxuXHJcbiAgICBpZiAod2luZG93LmxvY2F0aW9uLmhhc2ggPT0gJycpIHtcclxuICAgICAgdGhpcy51cGRhdGVVcmwoJyMvYWxsJylcclxuICAgICAgd2luZG93Lmhpc3RvcnkucHVzaFN0YXRlKHt9LCBudWxsLCAnIy9hbGwnKVxyXG4gICAgfVxyXG4gICAgd2luZG93Lm9ucG9wc3RhdGUgPSAoKSA9PiB0aGlzLnVwZGF0ZVVybCh3aW5kb3cubG9jYXRpb24uaGFzaClcclxuICB9XHJcblxyXG4gIHVwZGF0ZVVybChoYXNoKSB7XHJcbiAgICBmaWx0ZXJQYWdlLm1hcChmID0+IHtcclxuICAgICAgdGhpc1tgY18ke2Z9YF0gPSBoYXNoLnNwbGl0KCcjLycpWzFdID09PSBmID8gJ3NlbGVjdGVkJyA6ICcnXHJcbiAgICAgIGlmKGhhc2guc3BsaXQoJyMvJylbMV0gPT09IGYpIHRoaXMucGFnZSA9IGYubmFtZVxyXG4gICAgfSlcclxuICB9XHJcblxyXG4gIGNyZWF0ZSAoZXZ0KSB7XHJcbiAgICBpZihldnQua2V5Q29kZSAhPT0gMTMpIHJldHVyblxyXG4gICAgdGhpcy5tb2RlbC5hZGRUb2RvKGV2dC50YXJnZXQudmFsdWUudHJpbSgpKVxyXG4gICAgZXZ0LnRhcmdldC52YWx1ZSA9IFwiXCJcclxuICB9XHJcblxyXG4gIGNvbXBsZXRlQWxsKCl7XHJcblxyXG4gIH1cclxuXHJcbiAgY2xlYXJDb21wbGV0ZWQoKXtcclxuXHJcbiAgfVxyXG59XHJcblxyXG5jb25zdCBhcHAgPSBuZXcgQXBwKClcclxuXHJcbmxldCBmaWx0ZXJzVG1wbCA9ICcnXHJcblxyXG5jb25zdCBmaWx0ZXJzID0gcGFnZSA9PiB7XHJcbiAgbGV0IGYgPSB7XHJcbiAgICBjbGFzc05hbWU6IGB7e2NfJHtwYWdlfX19YCxcclxuICAgIGhhc2g6ICcjLycgKyBwYWdlLFxyXG4gICAgbmFtZTogY2FtZWxDYXNlKHBhZ2UpXHJcbiAgfVxyXG4gIGZpbHRlcnNUbXBsICs9IGA8bGkgay1jbGljaz1cInVwZGF0ZVVybCgke2YuaGFzaH0pXCI+PGEgY2xhc3M9XCIke2YuY2xhc3NOYW1lfVwiIGhyZWY9XCIke2YuaGFzaH1cIj4ke2YubmFtZX08L2E+PC9saT5gXHJcbn1cclxuXHJcbmZpbHRlclBhZ2UubWFwKHBhZ2UgPT4gZmlsdGVycyhwYWdlKSlcclxuXHJcbmNvbnN0IHZtb2RlbCA9IGh0bWxgXHJcbiAgPHNlY3Rpb24gaWQ9XCJ0b2RvYXBwXCI+XHJcbiAgICA8aGVhZGVyIGlkPVwiaGVhZGVyXCI+XHJcbiAgICAgIDxoMT50b2RvczwvaDE+XHJcbiAgICAgIDxpbnB1dCBpZD1cIm5ldy10b2RvXCIgay1rZXlkb3duPVwiY3JlYXRlKClcIiBwbGFjZWhvbGRlcj1cIldoYXQgbmVlZHMgdG8gYmUgZG9uZT9cIiBhdXRvZm9jdXM+XHJcbiAgICA8L2hlYWRlcj5cclxuICAgIHt7P3RvZG9TdGF0ZX19XHJcbiAgICA8c2VjdGlvbiBpZD1cIm1haW5cIj5cclxuICAgICAgPGlucHV0IGlkPVwidG9nZ2xlLWFsbFwiIHR5cGU9XCJjaGVja2JveFwiIHt7aXNDaGVja2VkfX0gay1jbGljaz1cImNvbXBsZXRlQWxsKClcIj5cclxuICAgICAgPGxhYmVsIGZvcj1cInRvZ2dsZS1hbGxcIj5NYXJrIGFsbCBhcyBjb21wbGV0ZTwvbGFiZWw+XHJcbiAgICAgIDx1bCBpZD1cInRvZG8tbGlzdFwiIGRhdGEtaWdub3JlPjwvdWw+XHJcbiAgICA8L3NlY3Rpb24+XHJcbiAgICA8Zm9vdGVyIGlkPVwiZm9vdGVyXCI+XHJcbiAgICAgIDxzcGFuIGlkPVwidG9kby1jb3VudFwiPlxyXG4gICAgICAgIDxzdHJvbmc+e3tjb3VudH19PC9zdHJvbmc+IGl0ZW17e3BsdXJhbH19IGxlZnRcclxuICAgICAgPC9zcGFuPlxyXG4gICAgICA8dWwgaWQ9XCJmaWx0ZXJzXCI+XHJcbiAgICAgICAgJHtmaWx0ZXJzVG1wbH1cclxuICAgICAgPC91bD5cclxuICAgICAgPGJ1dHRvbiBpZD1cImNsZWFyLWNvbXBsZXRlZFwiIHN0eWxlPVwiZGlzcGxheToge3tjbGVhclRvZ2dsZX19XCIgay1jbGlja2VkPVwiY2xlYXJDb21wbGV0ZWQoKVwiPkNsZWFyIGNvbXBsZXRlZDwvYnV0dG9uPlxyXG4gICAgPC9mb290ZXI+XHJcbiAgICB7ey90b2RvU3RhdGV9fVxyXG4gIDwvc2VjdGlvbj5cclxuICA8Zm9vdGVyIGlkPVwiaW5mb1wiPlxyXG4gICAgPHA+RG91YmxlLWNsaWNrIHRvIGVkaXQgYSB0b2RvPC9wPlxyXG4gICAgPHA+Q3JlYXRlZCBieSA8YSBocmVmPVwiaHR0cHM6Ly9naXRodWIuY29tL3N5YXJ1bFwiPlNoYWhydWwgTml6YW0gU2VsYW1hdDwvYT48L3A+XHJcbiAgICA8cD5QYXJ0IG9mIDxhIGhyZWY9XCJodHRwOi8vdG9kb212Yy5jb21cIj5Ub2RvTVZDPC9hPjwvcD5cclxuICA8L2Zvb3Rlcj5gXHJcblxyXG5hcHAubW91bnQodm1vZGVsKS5saW5rKCd0b2RvJylcclxuIiwiY29uc3QgS2VldCA9IHJlcXVpcmUoJy4uL2tlZXQnKVxyXG5jb25zdCB7IHN0b3JlLCBpbmZvcm0sIGdlbklkLCBodG1sIH0gPSByZXF1aXJlKCcuL3V0aWwnKVxyXG5cclxuY29uc3QgbG9nID0gY29uc29sZS5sb2cuYmluZChjb25zb2xlKVxyXG5cclxuY2xhc3MgVG9kb0FwcCBleHRlbmRzIEtlZXQge1xyXG4gIFxyXG4gIGFyZ3MgPSBbXS5zbGljZS5jYWxsKGFyZ3VtZW50cylcclxuICBcclxuICBlbCA9ICd0b2RvLWxpc3QnXHJcblxyXG4gIG9uQ2hhbmdlcyA9IFtdXHJcblxyXG4gIGVkaXRNb2RlKGlkKSB7XHJcbiAgICAvLyBBcHAuZWRpdFRvZG9zKGlkLCB0aGlzKVxyXG4gIH1cclxuICB0b2RvRGVzdHJveShpZCwgZXZ0KSB7XHJcbiAgICAvLyB0aGlzLmRlc3Ryb3koaWQsICdrZWV0LWlkJywgZXZ0LnRhcmdldC5wYXJlbnROb2RlLnBhcmVudE5vZGUpXHJcbiAgICAvLyBBcHAudG9kb0Rlc3Ryb3koKVxyXG4gIH1cclxuICBjb21wbGV0ZVRvZG8oaWQsIGV2dCkge1xyXG4gICAgLy8gQXBwLnRvZG9DaGVjayhpZCwgJ2tlZXQtaWQnLCBldnQudGFyZ2V0LnBhcmVudE5vZGUucGFyZW50Tm9kZSlcclxuICB9XHJcbiAgLy8gYWRkVG9kbyAodGl0bGUpIHtcclxuICAvLyAgIHRoaXMuYWRkKHtcclxuICAvLyAgICAgaWQ6IGdlbklkKCksXHJcbiAgLy8gICAgIHRpdGxlLFxyXG4gIC8vICAgICBjb21wbGV0ZWQ6IGZhbHNlXHJcbiAgLy8gICB9KVxyXG4gIC8vICAgaW5mb3JtKG1haW4sIHRoaXMuYmFzZS5tb2RlbClcclxuICAvLyB9XHJcbiAgLy8gc3Vic2NyaWJlKHN0YWNrKSB7XHJcbiAgLy8gICB0aGlzLm9uQ2hhbmdlcy5wdXNoKHN0YWNrKVxyXG4gIC8vIH1cclxufVxyXG5cclxuY29uc3QgdG9kb0FwcCA9IG5ldyBUb2RvQXBwKCdjaGVja2VkJylcclxuXHJcbmNvbnN0IHZtb2RlbCA9IHtcclxuICB0ZW1wbGF0ZTogaHRtbGBcclxuXHQ8bGkgay1kYmxjbGljaz1cImVkaXRNb2RlKHt7a2VldC1pZH19KVwiIGNsYXNzPVwie3tjb21wbGV0ZWR9fVwiPlxyXG5cdFx0PGRpdiBjbGFzcz1cInZpZXdcIj48aW5wdXQgay1jbGljaz1cImNvbXBsZXRlVG9kbyh7e2tlZXQtaWR9fSlcIiBjbGFzcz1cInRvZ2dsZVwiIHR5cGU9XCJjaGVja2JveFwiIGNoZWNrZWQ9XCJ7e2NoZWNrZWR9fVwiPlxyXG5cdFx0XHQ8bGFiZWw+e3t0aXRsZX19PC9sYWJlbD5cclxuXHRcdFx0PGJ1dHRvbiBrLWNsaWNrPVwidG9kb0Rlc3Ryb3koe3trZWV0LWlkfX0pXCIgY2xhc3M9XCJkZXN0cm95XCI+PC9idXR0b24+XHJcblx0XHQ8L2Rpdj5cclxuXHRcdDxpbnB1dCBjbGFzcz1cImVkaXRcIiB2YWx1ZT1cInt7dGl0bGV9fVwiPlxyXG5cdDwvbGk+YCxcclxuICBtb2RlbDogc3RvcmUoJ3RvZG9zLWtlZXRqcycpXHJcbn1cclxuXHJcbnRvZG9BcHAubW91bnQodm1vZGVsKVxyXG5cclxubW9kdWxlLmV4cG9ydHMgPSB0b2RvQXBwXHJcblxyXG4vLyBtb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uKGFwcCkge1xyXG4vLyAgIG1haW4gPSBhcHBcclxuLy8gICB0b2RvQXBwLm1vdW50KHZtb2RlbClcclxuLy8gICByZXR1cm4gdG9kb0FwcFxyXG4vLyB9IiwiLy8gY29uc3QgS2VldCA9IHJlcXVpcmUoJy4uL2tlZXQnKVxyXG5jb25zdCB7IHN0b3JlIH0gPSByZXF1aXJlKCcuL3V0aWwnKVxyXG5cclxuLy8gbm90ZTogY29weSB3aXRoIG1vZGlmaWNhdGlvbiBmcm9tIHByZWFjdC10b2RvbXZjXHJcblxyXG4vLyBjb25zdCB0b2RvID0gcmVxdWlyZSgnLi90b2RvJylcclxuXHJcbm1vZHVsZS5leHBvcnRzID0gdG9kbyA9PiB7XHJcblxyXG4gIGxldCBvbkNoYW5nZXMgPSBbXVxyXG5cclxuICBmdW5jdGlvbiBpbmZvcm0gKCkge1xyXG4gICAgZm9yIChsZXQgaSA9IG9uQ2hhbmdlcy5sZW5ndGg7IGktLTspIHtcclxuICAgICAgY29uc29sZS5sb2codGhpcylcclxuICAgICAgdGhpcyAmJiBvbkNoYW5nZXNbaV0odGhpcy5iYXNlLm1vZGVsKVxyXG4gICAgfVxyXG4gIH1cclxuXHJcbiAgbGV0IG1vZGVsID0ge1xyXG4gICAgLy8gdG9kb3M6IFtdLFxyXG5cclxuICAgIC8vIG9uQ2hhbmdlczogW10sXHJcblxyXG4gICAgc3Vic2NyaWJlIChmbikge1xyXG4gICAgICBvbkNoYW5nZXMucHVzaChmbilcclxuICAgIH0sXHJcblxyXG4gICAgYWRkVG9kbyAodGl0bGUpIHtcclxuICAgICAgbGV0IG0gPSB7XHJcbiAgICAgICAgdGl0bGUsXHJcbiAgICAgICAgY29tcGxldGVkOiAnJ1xyXG4gICAgICB9XHJcbiAgICAgIC8vIG1vZGVsLnRvZG9zID0gbW9kZWwudG9kb3MuY29uY2F0KG0pXHJcbiAgICAgIHRvZG8uYWRkKG0sIGluZm9ybSlcclxuICAgICAgLy8gY29uc29sZS5sb2codG9kbylcclxuICAgIH1cclxuXHJcbiAgICAvKiB0b2dnbGVBbGwoY29tcGxldGVkKSB7XHJcbiAgICAgIG1vZGVsLnRvZG9zID0gbW9kZWwudG9kb3MubWFwKFxyXG4gICAgICAgIHRvZG8gPT4gKHsgLi4udG9kbywgY29tcGxldGVkIH0pXHJcbiAgICAgICk7XHJcbiAgICAgIGluZm9ybSgpO1xyXG4gICAgfSxcclxuXHJcbiAgICB0b2dnbGUodG9kb1RvVG9nZ2xlKSB7XHJcbiAgICAgIG1vZGVsLnRvZG9zID0gbW9kZWwudG9kb3MubWFwKCB0b2RvID0+IChcclxuICAgICAgICB0b2RvICE9PSB0b2RvVG9Ub2dnbGUgPyB0b2RvIDogKHsgLi4udG9kbywgY29tcGxldGVkOiAhdG9kby5jb21wbGV0ZWQgfSlcclxuICAgICAgKSApO1xyXG4gICAgICBpbmZvcm0oKTtcclxuICAgIH0sXHJcblxyXG4gICAgZGVzdHJveSh0b2RvKSB7XHJcbiAgICAgIG1vZGVsLnRvZG9zID0gbW9kZWwudG9kb3MuZmlsdGVyKCB0ID0+IHQgIT09IHRvZG8gKTtcclxuICAgICAgaW5mb3JtKCk7XHJcbiAgICB9LFxyXG5cclxuICAgIHNhdmUodG9kb1RvU2F2ZSwgdGl0bGUpIHtcclxuICAgICAgbW9kZWwudG9kb3MgPSBtb2RlbC50b2Rvcy5tYXAoIHRvZG8gPT4gKFxyXG4gICAgICAgIHRvZG8gIT09IHRvZG9Ub1NhdmUgPyB0b2RvIDogKHsgLi4udG9kbywgdGl0bGUgfSlcclxuICAgICAgKSk7XHJcbiAgICAgIGluZm9ybSgpO1xyXG4gICAgfSxcclxuXHJcbiAgICBjbGVhckNvbXBsZXRlZCgpIHtcclxuICAgICAgbW9kZWwudG9kb3MgPSBtb2RlbC50b2Rvcy5maWx0ZXIoIHRvZG8gPT4gIXRvZG8uY29tcGxldGVkICk7XHJcbiAgICAgIGluZm9ybSgpO1xyXG4gICAgfSAqL1xyXG4gIH1cclxuXHJcbiAgcmV0dXJuIG1vZGVsXHJcbn1cclxuIiwiZXhwb3J0cy5pbmZvcm0gPSBmdW5jdGlvbihiYXNlLCBpbnB1dCkge1xyXG4gIGZvciAodmFyIGkgPSBiYXNlLm9uQ2hhbmdlcy5sZW5ndGg7IGktLTspIHtcclxuICAgIGJhc2Uub25DaGFuZ2VzW2ldKGlucHV0KVxyXG4gIH1cclxufVxyXG5cclxuZXhwb3J0cy5zdG9yZSA9IGZ1bmN0aW9uKG5hbWVzcGFjZSwgZGF0YSkge1xyXG4gIGlmIChhcmd1bWVudHMubGVuZ3RoID4gMSkge1xyXG4gICAgcmV0dXJuIGxvY2FsU3RvcmFnZS5zZXRJdGVtKG5hbWVzcGFjZSwgSlNPTi5zdHJpbmdpZnkoZGF0YSkpXHJcbiAgfSBlbHNlIHtcclxuICAgIHZhciBzdG9yZSA9IGxvY2FsU3RvcmFnZS5nZXRJdGVtKG5hbWVzcGFjZSlcclxuICAgIHJldHVybiBzdG9yZSAmJiBKU09OLnBhcnNlKHN0b3JlKSB8fCBbXVxyXG4gIH1cclxufVxyXG5cclxuZXhwb3J0cy5jYW1lbENhc2UgPSBmdW5jdGlvbihzKSB7XHJcbiAgcmV0dXJuIHMuY2hhckF0KDApLnRvVXBwZXJDYXNlKCkgKyBzLnNsaWNlKDEpXHJcbn1cclxuXHJcbmV4cG9ydHMuZ2VuSWQgPSBmdW5jdGlvbigpIHtcclxuICByZXR1cm4gKE1hdGgucm91bmQoTWF0aC5yYW5kb20oKSAqIDB4MSoxZTEyKSkudG9TdHJpbmcoMzIpXHJcbn1cclxuXHJcbmV4cG9ydHMuZ2V0SWQgPSBmdW5jdGlvbiAoaWQpIHtcclxuICByZXR1cm4gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoaWQpXHJcbn1cclxuXHJcbmV4cG9ydHMuaHRtbCA9IGZ1bmN0aW9uIChsaXRlcmFsU2VjdGlvbnMsIC4uLnN1YnN0cykge1xyXG4gIC8vIFVzZSByYXcgbGl0ZXJhbCBzZWN0aW9uczogd2UgZG9u4oCZdCB3YW50XHJcbiAgLy8gYmFja3NsYXNoZXMgKFxcbiBldGMuKSB0byBiZSBpbnRlcnByZXRlZFxyXG4gIGxldCByYXcgPSBsaXRlcmFsU2VjdGlvbnMucmF3O1xyXG5cclxuICBsZXQgcmVzdWx0ID0gJyc7XHJcblxyXG4gIHN1YnN0cy5mb3JFYWNoKChzdWJzdCwgaSkgPT4ge1xyXG4gICAgICAvLyBSZXRyaWV2ZSB0aGUgbGl0ZXJhbCBzZWN0aW9uIHByZWNlZGluZ1xyXG4gICAgICAvLyB0aGUgY3VycmVudCBzdWJzdGl0dXRpb25cclxuICAgICAgbGV0IGxpdCA9IHJhd1tpXTtcclxuXHJcbiAgICAgIC8vIEluIHRoZSBleGFtcGxlLCBtYXAoKSByZXR1cm5zIGFuIGFycmF5OlxyXG4gICAgICAvLyBJZiBzdWJzdGl0dXRpb24gaXMgYW4gYXJyYXkgKGFuZCBub3QgYSBzdHJpbmcpLFxyXG4gICAgICAvLyB3ZSB0dXJuIGl0IGludG8gYSBzdHJpbmdcclxuICAgICAgaWYgKEFycmF5LmlzQXJyYXkoc3Vic3QpKSB7XHJcbiAgICAgICAgICBzdWJzdCA9IHN1YnN0LmpvaW4oJycpO1xyXG4gICAgICB9XHJcblxyXG4gICAgICAvLyBJZiB0aGUgc3Vic3RpdHV0aW9uIGlzIHByZWNlZGVkIGJ5IGEgZG9sbGFyIHNpZ24sXHJcbiAgICAgIC8vIHdlIGVzY2FwZSBzcGVjaWFsIGNoYXJhY3RlcnMgaW4gaXRcclxuICAgICAgaWYgKGxpdC5lbmRzV2l0aCgnJCcpKSB7XHJcbiAgICAgICAgICBzdWJzdCA9IGh0bWxFc2NhcGUoc3Vic3QpO1xyXG4gICAgICAgICAgbGl0ID0gbGl0LnNsaWNlKDAsIC0xKTtcclxuICAgICAgfVxyXG4gICAgICByZXN1bHQgKz0gbGl0O1xyXG4gICAgICByZXN1bHQgKz0gc3Vic3Q7XHJcbiAgfSk7XHJcbiAgLy8gVGFrZSBjYXJlIG9mIGxhc3QgbGl0ZXJhbCBzZWN0aW9uXHJcbiAgLy8gKE5ldmVyIGZhaWxzLCBiZWNhdXNlIGFuIGVtcHR5IHRlbXBsYXRlIHN0cmluZ1xyXG4gIC8vIHByb2R1Y2VzIG9uZSBsaXRlcmFsIHNlY3Rpb24sIGFuIGVtcHR5IHN0cmluZylcclxuICByZXN1bHQgKz0gcmF3W3Jhdy5sZW5ndGgtMV07IC8vIChBKVxyXG5cclxuICByZXR1cm4gcmVzdWx0O1xyXG59Il19
