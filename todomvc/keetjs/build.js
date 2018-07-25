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
  // components. Personally I never get to like state-management in JavaScript.
  // The idea might sound divine but you'll stuck in very complicated get-to-master
  // this framework/flow cycles where you always write the state in some external 
  // store and write long logics to do small stuffs and they are very slow. On the 
  // other hand, this internal store is relatively simple, has references and the 
  // availability of sharing across multiple components in any case.
  Object.defineProperty(this, '__stateList__', {
    enumerable: false,
    writable: true
  })
}

Keet.prototype.mount = function (instance) {
  // Before we begin to parse an instance, do a run-down checks
  // to clean up back-tick string which usually has line spacing
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
  // useful if we need to do clean up rerender.
  var ele = getId(this.el)
  if (ele) ele.innerHTML = ''
  return this
}

Keet.prototype.link = function (id) {
  // The target DOM where the rendering will took place.
  // We could also apply life-cycle method before the
  // render happen.
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
  // as an initializer for all child components within the instance tree
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
    // if element is not ready we keep checking the initial availability
    var t = setInterval(function(){
      ele = getId(self.el)
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
    console.log(id, obj, attr, obj[attr])
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

var _templateObject = _taggedTemplateLiteral(['<li k-click="updateUrl(', ')"><a class="', '" href="', '">', '</a></li>'], ['<li k-click="updateUrl(', ')"><a class="', '" href="', '">', '</a></li>']),
    _templateObject2 = _taggedTemplateLiteral(['\n  <section id="todoapp">\n    <header id="header">\n      <h1>todos</h1>\n      <input id="new-todo" k-keydown="create()" placeholder="What needs to be done?" autofocus>\n    </header>\n    {{?todoState}}\n    <section id="main">\n      <input id="toggle-all" type="checkbox" {{isChecked}} k-click="completeAll()">\n      <label for="toggle-all">Mark all as complete</label>\n      <ul id="todo-list" data-ignore></ul>\n    </section>\n    <footer id="footer">\n      <span id="todo-count">\n        <strong>{{count}}</strong> item{{plural}} left\n      </span>\n      <ul id="filters">\n        ', '\n      </ul>\n      <button id="clear-completed" style="display: {{clearToggle}}" k-clicked="clearCompleted()">Clear completed</button>\n    </footer>\n    {{/todoState}}\n  </section>\n  <footer id="info">\n    <p>Double-click to edit a todo</p>\n    <p>Created by <a href="https://github.com/syarul">Shahrul Nizam Selamat</a></p>\n    <p>Part of <a href="http://todomvc.com">TodoMVC</a></p>\n  </footer>'], ['\n  <section id="todoapp">\n    <header id="header">\n      <h1>todos</h1>\n      <input id="new-todo" k-keydown="create()" placeholder="What needs to be done?" autofocus>\n    </header>\n    {{?todoState}}\n    <section id="main">\n      <input id="toggle-all" type="checkbox" {{isChecked}} k-click="completeAll()">\n      <label for="toggle-all">Mark all as complete</label>\n      <ul id="todo-list" data-ignore></ul>\n    </section>\n    <footer id="footer">\n      <span id="todo-count">\n        <strong>{{count}}</strong> item{{plural}} left\n      </span>\n      <ul id="filters">\n        ', '\n      </ul>\n      <button id="clear-completed" style="display: {{clearToggle}}" k-clicked="clearCompleted()">Clear completed</button>\n    </footer>\n    {{/todoState}}\n  </section>\n  <footer id="info">\n    <p>Double-click to edit a todo</p>\n    <p>Created by <a href="https://github.com/syarul">Shahrul Nizam Selamat</a></p>\n    <p>Part of <a href="http://todomvc.com">TodoMVC</a></p>\n  </footer>']);

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
    value: function completeAll() {
      this.isChecked = this.isChecked === '' ? 'checked' : '';
      console.log(this.isChecked);
      this.model.toggleAll(this.isChecked === '' ? '' : 'completed');
    }
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
  filtersTmpl += html(_templateObject, f.hash, f.className, f.hash, f.name);
};

filterPage.map(function (page) {
  return filters(page);
});

var vmodel = html(_templateObject2, filtersTmpl);

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

var _require = require('./util'),
    store = _require.store;

// note: copy with modification from preact-todomvc

module.exports = function (todo) {

  var onChanges = [];

  function inform() {
    for (var i = onChanges.length; i--;) {
      onChanges[i](this.base.model);
    }
  }

  var model = {
    subscribe: function subscribe(fn) {
      onChanges.push(fn);
    },
    addTodo: function addTodo(title) {
      var m = {
        title: title,
        completed: ''
      };
      todo.add(m, inform);
    },
    toggleAll: function toggleAll(completed) {
      todo.base.model.map(function (m) {
        console.log(m);
        todo.update(m['keet-id'], 'keet-id', {
          completed: completed,
          checked: completed === 'completed' ? 'checked' : ''
        });
      });
      console.log(todo);
      inform.call(todo);
      // todo.base.model = model.todos.map(
      //   todo => ({ ...todo, completed })
      // );
      // inform();
    },
    toggle: function toggle(todoToToggle) {
      // model.todos = model.todos.map( todo => (
      //   todo !== todoToToggle ? todo : ({ ...todo, completed: !todo.completed })
      // ) );
      // inform();
    }
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIkM6L1VzZXJzL3BpcGV5L0FwcERhdGEvUm9hbWluZy9ucG0vbm9kZV9tb2R1bGVzL2Jyb3dzZXJpZnkvbm9kZV9tb2R1bGVzL2Jyb3dzZXItcGFjay9fcHJlbHVkZS5qcyIsImtlZXQvY29tcG9uZW50cy9jb3B5LmpzIiwia2VldC9jb21wb25lbnRzL2dlbkVsZW1lbnQuanMiLCJrZWV0L2NvbXBvbmVudHMvZ2VuVGVtcGxhdGUuanMiLCJrZWV0L2NvbXBvbmVudHMvbm9kZXNWaXNpYmlsaXR5LmpzIiwia2VldC9jb21wb25lbnRzL3BhcnNlU3RyLmpzIiwia2VldC9jb21wb25lbnRzL3Byb2Nlc3NFdmVudC5qcyIsImtlZXQvY29tcG9uZW50cy9zdHJJbnRlcnByZXRlci5qcyIsImtlZXQvY29tcG9uZW50cy90YWcuanMiLCJrZWV0L2NvbXBvbmVudHMvdG1wbEF0dHJIYW5kbGVyLmpzIiwia2VldC9jb21wb25lbnRzL3RtcGxDbGFzc0hhbmRsZXIuanMiLCJrZWV0L2NvbXBvbmVudHMvdG1wbEhhbmRsZXIuanMiLCJrZWV0L2NvbXBvbmVudHMvdG1wbFN0eWxlc0hhbmRsZXIuanMiLCJrZWV0L2NvbXBvbmVudHMvdXRpbHMuanMiLCJrZWV0L2tlZXQuanMiLCJrZWV0L25vZGVfbW9kdWxlcy9oYXNoLXN1bS9oYXNoLXN1bS5qcyIsImtlZXQvbm9kZV9tb2R1bGVzL3NldC1kb20vc3JjL2luZGV4LmpzIiwia2VldC9ub2RlX21vZHVsZXMvc2V0LWRvbS9zcmMvcGFyc2UtaHRtbC5qcyIsInNyYy9hcHAuanMiLCJzcmMvdG9kby5qcyIsInNyYy90b2RvTW9kZWwuanMiLCJzcmMvdXRpbC5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTtBQ0FBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2ZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDMUpBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNoQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDckJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMxRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM5Q0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ1JBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNuQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3ZCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDcEJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMxQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDckJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDdEJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNoT0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMxREE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7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QUFXO0FBQ3pCLFNBQVEsS0FBSyxLQUFMLENBQVcsS0FBSyxNQUFMLEtBQWdCLEdBQWhCLEdBQW9CLElBQS9CLENBQUQsQ0FBdUMsUUFBdkMsQ0FBZ0QsRUFBaEQsQ0FBUDtBQUNELENBRkQ7O0FBSUEsUUFBUSxLQUFSLEdBQWdCLFVBQVUsRUFBVixFQUFjO0FBQzVCLFNBQU8sU0FBUyxjQUFULENBQXdCLEVBQXhCLENBQVA7QUFDRCxDQUZEOztBQUlBLFFBQVEsSUFBUixHQUFlLFVBQVUsZUFBVixFQUFzQztBQUNuRDtBQUNBO0FBQ0EsTUFBSSxNQUFNLGdCQUFnQixHQUExQjs7QUFFQSxNQUFJLFNBQVMsRUFBYjs7QUFMbUQsb0NBQVIsTUFBUTtBQUFSLFVBQVE7QUFBQTs7QUFPbkQsU0FBTyxPQUFQLENBQWUsVUFBQyxLQUFELEVBQVEsQ0FBUixFQUFjO0FBQ3pCO0FBQ0E7QUFDQSxRQUFJLE1BQU0sSUFBSSxDQUFKLENBQVY7O0FBRUE7QUFDQTtBQUNBO0FBQ0EsUUFBSSxNQUFNLE9BQU4sQ0FBYyxLQUFkLENBQUosRUFBMEI7QUFDdEIsY0FBUSxNQUFNLElBQU4sQ0FBVyxFQUFYLENBQVI7QUFDSDs7QUFFRDtBQUNBO0FBQ0EsUUFBSSxJQUFJLFFBQUosQ0FBYSxHQUFiLENBQUosRUFBdUI7QUFDbkIsY0FBUSxXQUFXLEtBQVgsQ0FBUjtBQUNBLFlBQU0sSUFBSSxLQUFKLENBQVUsQ0FBVixFQUFhLENBQUMsQ0FBZCxDQUFOO0FBQ0g7QUFDRCxjQUFVLEdBQVY7QUFDQSxjQUFVLEtBQVY7QUFDSCxHQXBCRDtBQXFCQTtBQUNBO0FBQ0E7QUFDQSxZQUFVLElBQUksSUFBSSxNQUFKLEdBQVcsQ0FBZixDQUFWLENBL0JtRCxDQStCdEI7O0FBRTdCLFNBQU8sTUFBUDtBQUNELENBbENEIiwiZmlsZSI6ImdlbmVyYXRlZC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzQ29udGVudCI6WyIoZnVuY3Rpb24oKXtmdW5jdGlvbiByKGUsbix0KXtmdW5jdGlvbiBvKGksZil7aWYoIW5baV0pe2lmKCFlW2ldKXt2YXIgYz1cImZ1bmN0aW9uXCI9PXR5cGVvZiByZXF1aXJlJiZyZXF1aXJlO2lmKCFmJiZjKXJldHVybiBjKGksITApO2lmKHUpcmV0dXJuIHUoaSwhMCk7dmFyIGE9bmV3IEVycm9yKFwiQ2Fubm90IGZpbmQgbW9kdWxlICdcIitpK1wiJ1wiKTt0aHJvdyBhLmNvZGU9XCJNT0RVTEVfTk9UX0ZPVU5EXCIsYX12YXIgcD1uW2ldPXtleHBvcnRzOnt9fTtlW2ldWzBdLmNhbGwocC5leHBvcnRzLGZ1bmN0aW9uKHIpe3ZhciBuPWVbaV1bMV1bcl07cmV0dXJuIG8obnx8cil9LHAscC5leHBvcnRzLHIsZSxuLHQpfXJldHVybiBuW2ldLmV4cG9ydHN9Zm9yKHZhciB1PVwiZnVuY3Rpb25cIj09dHlwZW9mIHJlcXVpcmUmJnJlcXVpcmUsaT0wO2k8dC5sZW5ndGg7aSsrKW8odFtpXSk7cmV0dXJuIG99cmV0dXJuIHJ9KSgpIiwibW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbiAoYXJndikge1xyXG4gIHZhciBjb3AgPSBmdW5jdGlvbiAodikge1xyXG4gICAgdmFyIG8gPSB7fVxyXG4gICAgaWYgKHR5cGVvZiB2ICE9PSAnb2JqZWN0Jykge1xyXG4gICAgICBvLmNvcHkgPSB2XHJcbiAgICAgIHJldHVybiBvLmNvcHlcclxuICAgIH0gZWxzZSB7XHJcbiAgICAgIGZvciAodmFyIGF0dHIgaW4gdikge1xyXG4gICAgICAgIG9bYXR0cl0gPSB2W2F0dHJdXHJcbiAgICAgIH1cclxuICAgIH1cclxuICAgIHJldHVybiBvXHJcbiAgfVxyXG4gIHJldHVybiBBcnJheS5pc0FycmF5KGFyZ3YpID8gYXJndi5tYXAoZnVuY3Rpb24gKHYpIHsgcmV0dXJuIHYgfSkgOiBjb3AoYXJndilcclxufVxyXG4iLCJ2YXIgY29weSA9IHJlcXVpcmUoJy4vY29weScpXHJcbnZhciB0YWcgPSByZXF1aXJlKCcuL3RhZycpXHJcbnZhciB0bXBsSGFuZGxlciA9IHJlcXVpcmUoJy4vdG1wbEhhbmRsZXInKVxyXG52YXIgdG1wbFN0eWxlc0hhbmRsZXIgPSByZXF1aXJlKCcuL3RtcGxTdHlsZXNIYW5kbGVyJylcclxudmFyIHRtcGxDbGFzc0hhbmRsZXIgPSByZXF1aXJlKCcuL3RtcGxDbGFzc0hhbmRsZXInKVxyXG52YXIgdG1wbEF0dHJIYW5kbGVyID0gcmVxdWlyZSgnLi90bXBsQXR0ckhhbmRsZXInKVxyXG52YXIgcHJvY2Vzc0V2ZW50ID0gcmVxdWlyZSgnLi9wcm9jZXNzRXZlbnQnKVxyXG52YXIgc2VsZWN0b3IgPSByZXF1aXJlKCcuL3V0aWxzJykuc2VsZWN0b3JcclxudmFyIHN0ckludGVycHJldGVyID0gcmVxdWlyZSgnLi9zdHJJbnRlcnByZXRlcicpXHJcbnZhciBub2Rlc1Zpc2liaWxpdHkgPSByZXF1aXJlKCcuL25vZGVzVmlzaWJpbGl0eScpXHJcbnZhciBzdW0gPSByZXF1aXJlKCdoYXNoLXN1bScpXHJcbnZhciBzZXRET00gPSByZXF1aXJlKCdzZXQtZG9tJylcclxuXHJcbnNldERPTS5rZXkgPSAna2VldC1pZCdcclxuXHJcbnZhciB1cGRhdGVDb250ZXh0ID0gZnVuY3Rpb24gKCkge1xyXG4gIHZhciBzZWxmID0gdGhpc1xyXG4gIHZhciBlbGVcclxuICB2YXIgbmV3RWxlbVxyXG4gIHZhciBhcmdzID0gW10uc2xpY2UuY2FsbChhcmd1bWVudHMpXHJcbiAgaWYgKHR5cGVvZiB0aGlzLmJhc2UgPT09ICdvYmplY3QnKSB7XHJcbiAgICBPYmplY3Qua2V5cyh0aGlzLmJhc2UpLm1hcChmdW5jdGlvbiAoaGFuZGxlcktleSkge1xyXG4gICAgICB2YXIgaWQgPSBzZWxmLmJhc2VbaGFuZGxlcktleV1bJ2tlZXQtaWQnXVxyXG4gICAgICBlbGUgPSBzZWxlY3RvcihpZClcclxuICAgICAgaWYgKCFlbGUgJiYgdHlwZW9mIHNlbGYuYmFzZVtoYW5kbGVyS2V5XSA9PT0gJ3N0cmluZycpIHtcclxuICAgICAgICBlbGUgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChzZWxmLmVsKVxyXG4gICAgICB9XHJcbiAgICAgIG5ld0VsZW0gPSBnZW5FbGVtZW50LmFwcGx5KHNlbGYsIFtzZWxmLmJhc2VbaGFuZGxlcktleV1dLmNvbmNhdChhcmdzKSlcclxuICAgICAgaWYgKHNlbGYuYmFzZS5oYXNPd25Qcm9wZXJ0eSgndGVtcGxhdGUnKSkge1xyXG4gICAgICAgIG5ld0VsZW0uaWQgPSBzZWxmLmVsXHJcbiAgICAgIH1cclxuICAgICAgc2V0RE9NKGVsZSwgbmV3RWxlbSlcclxuICAgIH0pXHJcbiAgfSBlbHNlIHtcclxuICAgIGVsZSA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKHNlbGYuZWwpXHJcbiAgICBpZiAoZWxlKSB7XHJcbiAgICAgIG5ld0VsZW0gPSBnZW5FbGVtZW50LmFwcGx5KHNlbGYsIFtzZWxmLmJhc2VdLmNvbmNhdChhcmdzKSlcclxuICAgICAgbmV3RWxlbS5pZCA9IHNlbGYuZWxcclxuICAgICAgc2V0RE9NKGVsZSwgbmV3RWxlbSlcclxuICAgIH1cclxuICB9XHJcbn1cclxuXHJcbnZhciBuZXh0U3RhdGUgPSBmdW5jdGlvbiAoaSwgYXJncykge1xyXG4gIHZhciBzZWxmID0gdGhpc1xyXG4gIGlmIChpIDwgdGhpcy5fX3N0YXRlTGlzdF9fLmxlbmd0aCkge1xyXG4gICAgdmFyIHN0YXRlID0gdGhpcy5fX3N0YXRlTGlzdF9fW2ldXHJcbiAgICB2YXIgdmFsdWUgPSB0aGlzW3N0YXRlXVxyXG4gICAgLy8gaWYgdmFsdWUgaXMgdW5kZWZpbmVkLCBsaWtlbHkgaGFzIG9iamVjdCBub3RhdGlvbiB3ZSBjb252ZXJ0IGl0IHRvIGFycmF5XHJcbiAgICBpZiAodmFsdWUgPT09IHVuZGVmaW5lZCkgdmFsdWUgPSBzdHJJbnRlcnByZXRlcihzdGF0ZSlcclxuXHJcbiAgICBpZiAodmFsdWUgJiYgQXJyYXkuaXNBcnJheSh2YWx1ZSkpIHtcclxuICAgICAgLy8gdXNpbmcgc3BsaXQgb2JqZWN0IG5vdGF0aW9uIGFzIGJhc2UgZm9yIHN0YXRlIHVwZGF0ZVxyXG4gICAgICB2YXIgaW5WYWwgPSB0aGlzW3ZhbHVlWzBdXVt2YWx1ZVsxXV1cclxuICAgICAgT2JqZWN0LmRlZmluZVByb3BlcnR5KHRoaXNbdmFsdWVbMF1dLCB2YWx1ZVsxXSwge1xyXG4gICAgICAgIGVudW1lcmFibGU6IGZhbHNlLFxyXG4gICAgICAgIGNvbmZpZ3VyYWJsZTogdHJ1ZSxcclxuICAgICAgICBnZXQ6IGZ1bmN0aW9uICgpIHtcclxuICAgICAgICAgIHJldHVybiBpblZhbFxyXG4gICAgICAgIH0sXHJcbiAgICAgICAgc2V0OiBmdW5jdGlvbiAodmFsKSB7XHJcbiAgICAgICAgICBpblZhbCA9IHZhbFxyXG4gICAgICAgICAgdXBkYXRlQ29udGV4dC5hcHBseShzZWxmLCBhcmdzKVxyXG4gICAgICAgIH1cclxuICAgICAgfSlcclxuICAgIH0gZWxzZSB7XHJcbiAgICAgIC8vIGhhbmRsZSBwYXJlbnQgc3RhdGUgdXBkYXRlIGlmIHRoZSBzdGF0ZSBpcyBub3QgYW4gb2JqZWN0XHJcbiAgICAgIE9iamVjdC5kZWZpbmVQcm9wZXJ0eSh0aGlzLCBzdGF0ZSwge1xyXG4gICAgICAgIGVudW1lcmFibGU6IGZhbHNlLFxyXG4gICAgICAgIGNvbmZpZ3VyYWJsZTogdHJ1ZSxcclxuICAgICAgICBnZXQ6IGZ1bmN0aW9uICgpIHtcclxuICAgICAgICAgIHJldHVybiB2YWx1ZVxyXG4gICAgICAgIH0sXHJcbiAgICAgICAgc2V0OiBmdW5jdGlvbiAodmFsKSB7XHJcbiAgICAgICAgICB2YWx1ZSA9IHZhbFxyXG4gICAgICAgICAgdXBkYXRlQ29udGV4dC5hcHBseShzZWxmLCBhcmdzKVxyXG4gICAgICAgIH1cclxuICAgICAgfSlcclxuICAgIH1cclxuICAgIGkrK1xyXG4gICAgbmV4dFN0YXRlLmFwcGx5KHRoaXMsIFsgaSwgYXJncyBdKVxyXG4gIH0gZWxzZSB7XHJcbiAgICAvL1xyXG4gIH1cclxufVxyXG5cclxudmFyIHNldFN0YXRlID0gZnVuY3Rpb24gKGFyZ3MpIHtcclxuICBuZXh0U3RhdGUuYXBwbHkodGhpcywgWyAwLCBhcmdzIF0pXHJcbn1cclxuXHJcbnZhciB1cGRhdGVTdGF0ZUxpc3QgPSBmdW5jdGlvbiAoc3RhdGUpIHtcclxuICB0aGlzLl9fc3RhdGVMaXN0X18gPSB0aGlzLl9fc3RhdGVMaXN0X18uY29uY2F0KHN0YXRlKVxyXG59XHJcblxyXG52YXIgZ2VuRWxlbWVudCA9IGZ1bmN0aW9uICgpIHtcclxuICB2YXIgY2hpbGQgPSBbXS5zaGlmdC5jYWxsKGFyZ3VtZW50cylcclxuICB2YXIgYXJncyA9IFtdLnNsaWNlLmNhbGwoYXJndW1lbnRzKVxyXG5cclxuICB2YXIgdGVtcERpdiA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2RpdicpXHJcbiAgdmFyIGNsb25lQ2hpbGQgPSBjb3B5KGNoaWxkKVxyXG4gIGRlbGV0ZSBjbG9uZUNoaWxkLnRlbXBsYXRlXHJcbiAgZGVsZXRlIGNsb25lQ2hpbGQudGFnXHJcbiAgZGVsZXRlIGNsb25lQ2hpbGQuc3R5bGVcclxuICBkZWxldGUgY2xvbmVDaGlsZC5jbGFzc1xyXG4gIC8vIHByb2Nlc3MgdGVtcGxhdGUgaWYgaGFzIGhhbmRsZWJhcnMgdmFsdWVcclxuICB0aGlzLl9fc3RhdGVMaXN0X18gPSBbXVxyXG5cclxuICB2YXIgdHBsID0gY2hpbGQudGVtcGxhdGVcclxuICAgID8gdG1wbEhhbmRsZXIuY2FsbCh0aGlzLCBjaGlsZC50ZW1wbGF0ZSwgdXBkYXRlU3RhdGVMaXN0LmJpbmQodGhpcykpXHJcbiAgICA6IHR5cGVvZiBjaGlsZCA9PT0gJ3N0cmluZycgPyB0bXBsSGFuZGxlci5jYWxsKHRoaXMsIGNoaWxkLCB1cGRhdGVTdGF0ZUxpc3QuYmluZCh0aGlzKSkgOiBudWxsXHJcbiAgLy8gcHJvY2VzcyBzdHlsZXMgaWYgaGFzIGhhbmRsZWJhcnMgdmFsdWVcclxuICB2YXIgc3R5bGVUcGwgPSB0bXBsU3R5bGVzSGFuZGxlci5jYWxsKHRoaXMsIGNoaWxkLnN0eWxlLCB1cGRhdGVTdGF0ZUxpc3QuYmluZCh0aGlzKSlcclxuICAvLyBwcm9jZXNzIGNsYXNzZXMgaWYgaGFzIGhhbmRsZWJhcnMgdmFsdWVcclxuICB2YXIgY2xhc3NUcGwgPSB0bXBsQ2xhc3NIYW5kbGVyLmNhbGwodGhpcywgY2hpbGQsIHVwZGF0ZVN0YXRlTGlzdC5iaW5kKHRoaXMpKVxyXG4gIGlmIChjbGFzc1RwbCkgY2xvbmVDaGlsZC5jbGFzcyA9IGNsYXNzVHBsXHJcbiAgLy8gY3VzdG9tIGF0dHJpYnV0ZXMgaGFuZGxlclxyXG4gIGlmIChhcmdzICYmIGFyZ3MubGVuZ3RoKSB7XHJcbiAgICB0bXBsQXR0ckhhbmRsZXIuYXBwbHkodGhpcywgWyBjbG9uZUNoaWxkIF0uY29uY2F0KGFyZ3MpKVxyXG4gIH1cclxuXHJcbiAgdmFyIHMgPSBjaGlsZC50YWdcclxuICAgID8gdGFnKGNoaWxkLnRhZywgLy8gaHRtbCB0YWdcclxuICAgICAgdHBsIHx8ICcnLCAvLyBub2RlVmFsdWVcclxuICAgICAgY2xvbmVDaGlsZCwgLy8gYXR0cmlidXRlcyBpbmNsdWRpbmcgY2xhc3Nlc1xyXG4gICAgICBzdHlsZVRwbCAvLyBpbmxpbmUgc3R5bGVzXHJcbiAgICApIDogdHBsIC8vIGZhbGxiYWNrIGlmIG5vbiBleGlzdCwgcmVuZGVyIHRoZSB0ZW1wbGF0ZSBhcyBzdHJpbmdcclxuXHJcbiAgcyA9IG5vZGVzVmlzaWJpbGl0eS5jYWxsKHRoaXMsIHMpXHJcbiAgdGVtcERpdi5pbm5lckhUTUwgPSBzXHJcbiAgdGVtcERpdi5jaGlsZE5vZGVzLmZvckVhY2goZnVuY3Rpb24gKGMpIHtcclxuICAgIGlmIChjLm5vZGVUeXBlID09PSAxKSB7XHJcbiAgICAgIGMuc2V0QXR0cmlidXRlKCdkYXRhLWNoZWNrc3VtJywgc3VtKGMub3V0ZXJIVE1MKSlcclxuICAgIH1cclxuICB9KVxyXG4gIGlmIChjaGlsZC50YWcgPT09ICdpbnB1dCcpIHtcclxuICAgIGlmIChjbG9uZUNoaWxkLmNoZWNrZWQpIHtcclxuICAgICAgdGVtcERpdi5jaGlsZE5vZGVzWzBdLnNldEF0dHJpYnV0ZSgnY2hlY2tlZCcsICcnKVxyXG4gICAgfSBlbHNlIHtcclxuICAgICAgdGVtcERpdi5jaGlsZE5vZGVzWzBdLnJlbW92ZUF0dHJpYnV0ZSgnY2hlY2tlZCcpXHJcbiAgICB9XHJcbiAgfVxyXG5cclxuICBzZXRTdGF0ZS5jYWxsKHRoaXMsIGFyZ3MpXHJcblxyXG4gIHByb2Nlc3NFdmVudC5jYWxsKHRoaXMsIHRlbXBEaXYpXHJcbiAgcmV0dXJuIHR5cGVvZiBjaGlsZCA9PT0gJ3N0cmluZydcclxuICAgID8gdGVtcERpdlxyXG4gICAgOiBjaGlsZC50YWcgPyB0ZW1wRGl2LmNoaWxkTm9kZXNbMF1cclxuICAgICAgOiB0ZW1wRGl2XHJcbn1cclxuXHJcbmV4cG9ydHMuZ2VuRWxlbWVudCA9IGdlbkVsZW1lbnRcclxuZXhwb3J0cy5zZXRTdGF0ZSA9IHNldFN0YXRlXHJcbmV4cG9ydHMudXBkYXRlU3RhdGVMaXN0ID0gdXBkYXRlU3RhdGVMaXN0XHJcbiIsInZhciBwcm9jZXNzRXZlbnQgPSByZXF1aXJlKCcuL3Byb2Nlc3NFdmVudCcpXHJcblxyXG52YXIgdG1wbCA9ICcnXHJcblxyXG5mdW5jdGlvbiBuZXh0IChpLCBvYmosIGFyclByb3BzLCBhcmdzKSB7XHJcbiAgaWYgKGkgPCBhcnJQcm9wcy5sZW5ndGgpIHtcclxuICAgIHZhciByZXAgPSBhcnJQcm9wc1tpXS5yZXBsYWNlKC97eyhbXnt9XSspfX0vZywgJyQxJylcclxuICAgIHRtcGwgPSB0bXBsLnJlcGxhY2UoL3t7KFtee31dKyl9fS8sIG9ialtyZXBdKVxyXG4gICAgaWYgKGFyZ3MgJiYgfmFyZ3MuaW5kZXhPZihyZXApICYmICFvYmpbcmVwXSkge1xyXG4gICAgICB2YXIgcmUgPSBuZXcgUmVnRXhwKCcgJyArIHJlcCArICc9XCInICsgb2JqW3JlcF0gKyAnXCInLCAnZycpXHJcbiAgICAgIHRtcGwgPSB0bXBsLnJlcGxhY2UocmUsICcnKVxyXG4gICAgfVxyXG4gICAgaSsrXHJcbiAgICBuZXh0KGksIG9iaiwgYXJyUHJvcHMsIGFyZ3MpXHJcbiAgfSBlbHNlIHtcclxuXHJcbiAgfVxyXG59XHJcblxyXG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uIChvYmopIHtcclxuICB2YXIgYXJncyA9IHRoaXMuYXJnc1xyXG4gIHZhciBhcnJQcm9wcyA9IHRoaXMuYmFzZS50ZW1wbGF0ZS5tYXRjaCgve3soW157fV0rKX19L2cpXHJcbiAgdmFyIHRlbXBEaXZcclxuICB0bXBsID0gdGhpcy5iYXNlLnRlbXBsYXRlXHJcbiAgbmV4dCgwLCBvYmosIGFyclByb3BzLCBhcmdzKVxyXG4gIHRlbXBEaXYgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdkaXYnKVxyXG4gIHRlbXBEaXYuaW5uZXJIVE1MID0gdG1wbFxyXG4gIHZhciBpc2V2dCA9IC8gay0vLnRlc3QodG1wbClcclxuICBpZiAoaXNldnQpIHsgcHJvY2Vzc0V2ZW50LmNhbGwodGhpcywgdGVtcERpdikgfVxyXG4gIHRlbXBEaXYuY2hpbGROb2Rlc1swXS5zZXRBdHRyaWJ1dGUoJ2tlZXQtaWQnLCBvYmpbJ2tlZXQtaWQnXSlcclxuICByZXR1cm4gdGVtcERpdi5jaGlsZE5vZGVzWzBdXHJcbn1cclxuIiwibW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbiAoc3RyaW5nKSB7XHJcbiAgdmFyIHNlbGYgPSB0aGlzXHJcbiAgdGhpcy5fX3N0YXRlTGlzdF9fLm1hcChmdW5jdGlvbiAoc3RhdGUpIHtcclxuICAgIGlmICghc2VsZltzdGF0ZV0pIHtcclxuICAgICAgdmFyIGYgPSAnXFxcXHtcXFxce1xcXFw/JyArIHN0YXRlICsgJ1xcXFx9XFxcXH0nXHJcbiAgICAgIHZhciBiID0gJ1xcXFx7XFxcXHtcXFxcLycgKyBzdGF0ZSArICdcXFxcfVxcXFx9J1xyXG4gICAgICAvLyB2YXIgcmVneCA9ICcoPzw9JyArIGYgKyAnKSguKj8pKD89JyArIGIgKyAnKSdcclxuICAgICAgLy8gKiogb2xkIGJyb3dzZXIgZG9lcyBub3Qgc3VwcG9ydCBwb3NpdGl2ZSBsb29rIGJlaGluZCAqKlxyXG4gICAgICB2YXIgcmVneCA9ICcoJyArIGYgKyAnKSguKj8pKD89JyArIGIgKyAnKSdcclxuICAgICAgdmFyIHJlID0gbmV3IFJlZ0V4cChyZWd4KVxyXG4gICAgICB2YXIgaXNDb25kaXRpb25hbCA9IHJlLnRlc3Qoc3RyaW5nKVxyXG4gICAgICB2YXIgbWF0Y2ggPSBzdHJpbmcubWF0Y2gocmUpXHJcbiAgICAgIGlmIChpc0NvbmRpdGlvbmFsICYmIG1hdGNoKSB7XHJcbiAgICAgICAgc3RyaW5nID0gc3RyaW5nLnJlcGxhY2UobWF0Y2hbMl0sICcnKVxyXG4gICAgICB9XHJcbiAgICB9XHJcbiAgICBzdHJpbmcgPSBzdHJpbmcucmVwbGFjZSgne3s/JyArIHN0YXRlICsgJ319JywgJycpXHJcbiAgICBzdHJpbmcgPSBzdHJpbmcucmVwbGFjZSgne3svJyArIHN0YXRlICsgJ319JywgJycpXHJcbiAgfSlcclxuICByZXR1cm4gc3RyaW5nXHJcbn1cbiIsInZhciBnZW5FbGVtZW50ID0gcmVxdWlyZSgnLi9nZW5FbGVtZW50JykuZ2VuRWxlbWVudFxyXG52YXIgc2V0U3RhdGUgPSByZXF1aXJlKCcuL2dlbkVsZW1lbnQnKS5zZXRTdGF0ZVxyXG52YXIgdG1wbEhhbmRsZXIgPSByZXF1aXJlKCcuL3RtcGxIYW5kbGVyJylcclxudmFyIHByb2Nlc3NFdmVudCA9IHJlcXVpcmUoJy4vcHJvY2Vzc0V2ZW50JylcclxudmFyIGdlbklkID0gcmVxdWlyZSgnLi91dGlscycpLmdlbklkXHJcbnZhciBnZW5UZW1wbGF0ZSA9IHJlcXVpcmUoJy4vZ2VuVGVtcGxhdGUnKVxyXG52YXIgbm9kZXNWaXNpYmlsaXR5ID0gcmVxdWlyZSgnLi9ub2Rlc1Zpc2liaWxpdHknKVxyXG52YXIgc3VtID0gcmVxdWlyZSgnaGFzaC1zdW0nKVxyXG5cclxubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbiAoKSB7XHJcbiAgdmFyIHNlbGYgPSB0aGlzXHJcbiAgdmFyIGVsZW1BcnIgPSBbXVxyXG4gIHZhciBhcmdzID0gW10uc2xpY2UuY2FsbChhcmd1bWVudHMpXHJcbiAgaWYgKEFycmF5LmlzQXJyYXkodGhpcy5iYXNlLm1vZGVsKSkge1xyXG4gICAgLy8gZG8gYXJyYXkgYmFzZVxyXG4gICAgdGhpcy5iYXNlLnRlbXBsYXRlID0gdGhpcy5iYXNlLnRlbXBsYXRlLnRyaW0oKS5yZXBsYWNlKC9cXHMrL2csICcgJylcclxuXHJcbiAgICAvLyBnZW5lcmF0ZSBpZCBmb3Igc2VsZWN0b3JcclxuICAgIHRoaXMuYmFzZS5tb2RlbCA9IHRoaXMuYmFzZS5tb2RlbC5tYXAoZnVuY3Rpb24gKG0pIHtcclxuICAgICAgbVsna2VldC1pZCddID0gZ2VuSWQoKVxyXG4gICAgICByZXR1cm4gbVxyXG4gICAgfSlcclxuICAgIHRoaXMuYmFzZS5tb2RlbC5tYXAoZnVuY3Rpb24gKG0pIHtcclxuICAgICAgZWxlbUFyci5wdXNoKGdlblRlbXBsYXRlLmNhbGwoc2VsZiwgbSkpXHJcbiAgICB9KVxyXG4gIH0gZWxzZSBpZiAodHlwZW9mIHRoaXMuYmFzZSA9PT0gJ29iamVjdCcpIHtcclxuICAgIC8vIGRvIG9iamVjdCBiYXNlXHJcbiAgICBPYmplY3Qua2V5cyh0aGlzLmJhc2UpLm1hcChmdW5jdGlvbiAoa2V5KSB7XHJcbiAgICAgIHZhciBjaGlsZCA9IHNlbGYuYmFzZVtrZXldXHJcbiAgICAgIGlmIChjaGlsZCAmJiB0eXBlb2YgY2hpbGQgPT09ICdvYmplY3QnKSB7XHJcbiAgICAgICAgdmFyIGlkID0gZ2VuSWQoKVxyXG4gICAgICAgIGNoaWxkWydrZWV0LWlkJ10gPSBpZFxyXG4gICAgICAgIHNlbGYuYmFzZVtrZXldWydrZWV0LWlkJ10gPSBpZFxyXG4gICAgICAgIHZhciBuZXdFbGVtZW50ID0gZ2VuRWxlbWVudC5hcHBseShzZWxmLCBbY2hpbGRdLmNvbmNhdChhcmdzKSlcclxuICAgICAgICBlbGVtQXJyLnB1c2gobmV3RWxlbWVudClcclxuICAgICAgfSBlbHNlIHtcclxuICAgICAgICBzZWxmLl9fc3RhdGVMaXN0X18gPSBbXVxyXG4gICAgICAgIHZhciB0cGwgPSB0bXBsSGFuZGxlci5jYWxsKHNlbGYsIGNoaWxkLCBmdW5jdGlvbiAoc3RhdGUpIHtcclxuICAgICAgICAgIHNlbGYuX19zdGF0ZUxpc3RfXyA9IHNlbGYuX19zdGF0ZUxpc3RfXy5jb25jYXQoc3RhdGUpXHJcbiAgICAgICAgfSlcclxuICAgICAgICB0cGwgPSBub2Rlc1Zpc2liaWxpdHkuY2FsbChzZWxmLCB0cGwpXHJcbiAgICAgICAgdmFyIHRlbXBEaXYgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdkaXYnKVxyXG4gICAgICAgIHRlbXBEaXYuaW5uZXJIVE1MID0gdHBsXHJcbiAgICAgICAgc2V0U3RhdGUuY2FsbChzZWxmLCBhcmdzKVxyXG4gICAgICAgIHByb2Nlc3NFdmVudC5jYWxsKHNlbGYsIHRlbXBEaXYpXHJcbiAgICAgICAgdGVtcERpdi5jaGlsZE5vZGVzLmZvckVhY2goZnVuY3Rpb24gKGMpIHtcclxuICAgICAgICAgIGlmIChjLm5vZGVUeXBlID09PSAxKSB7XHJcbiAgICAgICAgICAgIGMuc2V0QXR0cmlidXRlKCdkYXRhLWNoZWNrc3VtJywgc3VtKGMub3V0ZXJIVE1MKSlcclxuICAgICAgICAgIH1cclxuICAgICAgICAgIGVsZW1BcnIucHVzaChjKVxyXG4gICAgICAgIH0pXHJcbiAgICAgIH1cclxuICAgIH0pXHJcbiAgfSBlbHNlIGlmICh0eXBlb2YgdGhpcy5iYXNlID09PSAnc3RyaW5nJykge1xyXG4gICAgdGhpcy5fX3N0YXRlTGlzdF9fID0gW11cclxuICAgIHZhciB0cGwgPSB0bXBsSGFuZGxlci5jYWxsKHRoaXMsIHRoaXMuYmFzZSwgZnVuY3Rpb24gKHN0YXRlKSB7XHJcbiAgICAgIHNlbGYuX19zdGF0ZUxpc3RfXyA9IHNlbGYuX19zdGF0ZUxpc3RfXy5jb25jYXQoc3RhdGUpXHJcbiAgICB9KVxyXG5cclxuICAgIHRwbCA9IG5vZGVzVmlzaWJpbGl0eS5jYWxsKHRoaXMsIHRwbClcclxuICAgIHZhciB0ZW1wRGl2ID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnZGl2JylcclxuICAgIHRlbXBEaXYuaW5uZXJIVE1MID0gdHBsXHJcbiAgICBzZXRTdGF0ZS5jYWxsKHRoaXMsIGFyZ3MpXHJcbiAgICBwcm9jZXNzRXZlbnQuY2FsbCh0aGlzLCB0ZW1wRGl2KVxyXG4gICAgdGVtcERpdi5jaGlsZE5vZGVzLmZvckVhY2goZnVuY3Rpb24gKGMpIHtcclxuICAgICAgaWYgKGMubm9kZVR5cGUgPT09IDEpIHtcclxuICAgICAgICBjLnNldEF0dHJpYnV0ZSgnZGF0YS1jaGVja3N1bScsIHN1bShjLm91dGVySFRNTCkpXHJcbiAgICAgIH1cclxuICAgICAgZWxlbUFyci5wdXNoKGMpXHJcbiAgICB9KVxyXG4gIH1cclxuXHJcbiAgcmV0dXJuIGVsZW1BcnJcclxufVxyXG4iLCJ2YXIgbG9vcENoaWxkcyA9IHJlcXVpcmUoJy4vdXRpbHMnKS5sb29wQ2hpbGRzXHJcblxyXG52YXIgbmV4dCA9IGZ1bmN0aW9uIChpLCBjLCByZW0pIHtcclxuICB2YXIgaGFza1xyXG4gIHZhciBldnROYW1lXHJcbiAgdmFyIGV2dGhhbmRsZXJcclxuICB2YXIgaGFuZGxlclxyXG4gIHZhciBpc0hhbmRsZXJcclxuICB2YXIgYXJndlxyXG4gIHZhciB2XHJcbiAgdmFyIGF0dHMgPSBjLmF0dHJpYnV0ZXNcclxuXHJcbiAgaWYgKGkgPCBhdHRzLmxlbmd0aCkge1xyXG4gICAgaGFzayA9IC9eay0vLnRlc3QoYXR0c1tpXS5ub2RlTmFtZSlcclxuICAgIGlmIChoYXNrKSB7XHJcbiAgICAgIGV2dE5hbWUgPSBhdHRzW2ldLm5vZGVOYW1lLnNwbGl0KCctJylbMV1cclxuICAgICAgZXZ0aGFuZGxlciA9IGF0dHNbaV0ubm9kZVZhbHVlXHJcbiAgICAgIGhhbmRsZXIgPSBldnRoYW5kbGVyLnNwbGl0KCcoJylcclxuICAgICAgaXNIYW5kbGVyID0gdGhpc1toYW5kbGVyWzBdXVxyXG4gICAgICBpZiAodHlwZW9mIGlzSGFuZGxlciA9PT0gJ2Z1bmN0aW9uJykge1xyXG4gICAgICAgIHJlbS5wdXNoKGF0dHNbaV0ubm9kZU5hbWUpXHJcbiAgICAgICAgYXJndiA9IFtdXHJcbiAgICAgICAgdiA9IGhhbmRsZXJbMV0uc2xpY2UoMCwgLTEpLnNwbGl0KCcsJykuZmlsdGVyKGZ1bmN0aW9uIChmKSB7IHJldHVybiBmICE9PSAnJyB9KVxyXG4gICAgICAgIGlmICh2Lmxlbmd0aCkgdi5tYXAoZnVuY3Rpb24gKHYpIHsgYXJndi5wdXNoKHYpIH0pXHJcbiAgICAgICAgYy5hZGRFdmVudExpc3RlbmVyKGV2dE5hbWUsIGlzSGFuZGxlci5iaW5kLmFwcGx5KGlzSGFuZGxlci5iaW5kKHRoaXMpLCBbY10uY29uY2F0KGFyZ3YpKSwgZmFsc2UpXHJcbiAgICAgIH1cclxuICAgIH1cclxuICAgIGkrK1xyXG4gICAgbmV4dC5hcHBseSh0aGlzLCBbIGksIGMsIHJlbSBdKVxyXG4gIH0gZWxzZSB7XHJcbiAgICByZW0ubWFwKGZ1bmN0aW9uIChmKSB7IGMucmVtb3ZlQXR0cmlidXRlKGYpIH0pXHJcbiAgfVxyXG59XHJcblxyXG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uIChrTm9kZSkge1xyXG4gIHZhciBzZWxmID0gdGhpc1xyXG4gIHZhciBsaXN0S25vZGVDaGlsZCA9IFtdXHJcbiAgdmFyIHJlbSA9IFtdXHJcbiAgbG9vcENoaWxkcyhsaXN0S25vZGVDaGlsZCwga05vZGUpXHJcbiAgbGlzdEtub2RlQ2hpbGQubWFwKGZ1bmN0aW9uIChjKSB7XHJcbiAgICBpZiAoYy5ub2RlVHlwZSA9PT0gMSAmJiBjLmhhc0F0dHJpYnV0ZXMoKSkge1xyXG4gICAgICBuZXh0LmFwcGx5KHNlbGYsIFsgMCwgYywgcmVtIF0pXHJcbiAgICB9XHJcbiAgfSlcclxuICBsaXN0S25vZGVDaGlsZCA9IFtdXHJcbn1cclxuIiwibW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbiAoc3RyKSB7XHJcbiAgdmFyIHJlcyA9IHN0ci5tYXRjaCgvXFwuKlxcLi9nKVxyXG4gIHZhciByZXN1bHRcclxuICBpZiAocmVzICYmIHJlcy5sZW5ndGggPiAwKSB7XHJcbiAgICByZXR1cm4gc3RyLnNwbGl0KCcuJylcclxuICB9XHJcbiAgcmV0dXJuIHJlc3VsdFxyXG59XHJcbiIsImZ1bmN0aW9uIGt0YWcgKCkge1xyXG4gIHZhciBhcmdzID0gW10uc2xpY2UuY2FsbChhcmd1bWVudHMpXHJcbiAgdmFyIGF0dHJcclxuICB2YXIgaWR4XHJcbiAgdmFyIHRlXHJcbiAgdmFyIHJldCA9IFsnPCcsIGFyZ3NbMF0sICc+JywgYXJnc1sxXSwgJzwvJywgYXJnc1swXSwgJz4nXVxyXG4gIGlmIChhcmdzLmxlbmd0aCA+IDIgJiYgdHlwZW9mIGFyZ3NbMl0gPT09ICdvYmplY3QnKSB7XHJcbiAgICBmb3IgKGF0dHIgaW4gYXJnc1syXSkge1xyXG4gICAgICBpZiAodHlwZW9mIGFyZ3NbMl1bYXR0cl0gPT09ICdib29sZWFuJyAmJiBhcmdzWzJdW2F0dHJdKSB7XHJcbiAgICAgICAgcmV0LnNwbGljZSgyLCAwLCAnICcsIGF0dHIpXHJcbiAgICAgIH0gZWxzZSBpZiAoYXR0ciA9PT0gJ2NsYXNzJyAmJiBBcnJheS5pc0FycmF5KGFyZ3NbMl1bYXR0cl0pKSB7XHJcbiAgICAgICAgcmV0LnNwbGljZSgyLCAwLCAnICcsIGF0dHIsICc9XCInLCBhcmdzWzJdW2F0dHJdLmpvaW4oJyAnKS50cmltKCksICdcIicpXHJcbiAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgcmV0LnNwbGljZSgyLCAwLCAnICcsIGF0dHIsICc9XCInLCBhcmdzWzJdW2F0dHJdLCAnXCInKVxyXG4gICAgICB9XHJcbiAgICB9XHJcbiAgfVxyXG4gIGlmIChhcmdzLmxlbmd0aCA+IDMgJiYgdHlwZW9mIGFyZ3NbM10gPT09ICdvYmplY3QnKSB7XHJcbiAgICBpZHggPSByZXQuaW5kZXhPZignPicpXHJcbiAgICB0ZSA9IFtpZHgsIDAsICcgc3R5bGU9XCInXVxyXG4gICAgZm9yIChhdHRyIGluIGFyZ3NbM10pIHtcclxuICAgICAgdGUucHVzaChhdHRyKVxyXG4gICAgICB0ZS5wdXNoKCc6JylcclxuICAgICAgdGUucHVzaChhcmdzWzNdW2F0dHJdKVxyXG4gICAgICB0ZS5wdXNoKCc7JylcclxuICAgIH1cclxuICAgIHRlLnB1c2goJ1wiJylcclxuICAgIHJldC5zcGxpY2UuYXBwbHkocmV0LCB0ZSlcclxuICB9XHJcbiAgcmV0dXJuIHJldFxyXG59XHJcblxyXG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uICgpIHtcclxuICByZXR1cm4ga3RhZy5hcHBseShudWxsLCBhcmd1bWVudHMpLmpvaW4oJycpXHJcbn1cclxuIiwidmFyIGdlbkVsZW1lbnQgPSByZXF1aXJlKCcuL2dlbkVsZW1lbnQnKVxyXG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uICgpIHtcclxuICB2YXIgc2VsZiA9IHRoaXNcclxuICB2YXIgY2xvbmVDaGlsZCA9IFtdLnNoaWZ0LmNhbGwoYXJndW1lbnRzKVxyXG4gIE9iamVjdC5rZXlzKGNsb25lQ2hpbGQpLm1hcChmdW5jdGlvbiAoYykge1xyXG4gICAgdmFyIGhkbCA9IGNsb25lQ2hpbGRbY10ubWF0Y2goL3t7KFtee31dKyl9fS9nKVxyXG4gICAgaWYgKGhkbCAmJiBoZGwubGVuZ3RoKSB7XHJcbiAgICAgIHZhciBzdHIgPSAnJ1xyXG4gICAgICBoZGwubWFwKGZ1bmN0aW9uIChzKSB7XHJcbiAgICAgICAgdmFyIHJlcCA9IHMucmVwbGFjZSgve3soW157fV0rKX19L2csICckMScpXHJcbiAgICAgICAgaWYgKHNlbGZbcmVwXSAhPT0gdW5kZWZpbmVkKSB7XHJcbiAgICAgICAgICBnZW5FbGVtZW50LnVwZGF0ZVN0YXRlTGlzdC5jYWxsKHNlbGYsIHJlcClcclxuICAgICAgICAgIGlmIChzZWxmW3JlcF0gPT09IGZhbHNlKSB7XHJcbiAgICAgICAgICAgIGRlbGV0ZSBjbG9uZUNoaWxkW2NdXHJcbiAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICBzdHIgKz0gc2VsZltyZXBdXHJcbiAgICAgICAgICAgIGNsb25lQ2hpbGRbY10gPSBzdHJcclxuICAgICAgICAgIH1cclxuICAgICAgICB9XHJcbiAgICAgIH0pXHJcbiAgICB9XHJcbiAgfSlcclxufVxyXG4iLCJtb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uIChjaGlsZCwgdXBkYXRlU3RhdGVMaXN0KSB7XHJcbiAgdmFyIHNlbGYgPSB0aGlzXHJcbiAgaWYgKGNoaWxkLmNsYXNzKSB7XHJcbiAgICB2YXIgYyA9IGNoaWxkLmNsYXNzLm1hdGNoKC97eyhbXnt9XSspfX0vZylcclxuICAgIHZhciBjbGFzc1N0ciA9ICcnXHJcbiAgICBpZiAoYyAmJiBjLmxlbmd0aCkge1xyXG4gICAgICBjLm1hcChmdW5jdGlvbiAocykge1xyXG4gICAgICAgIHZhciByZXAgPSBzLnJlcGxhY2UoL3t7KFtee31dKyl9fS9nLCAnJDEnKVxyXG4gICAgICAgIGlmIChzZWxmW3JlcF0gIT09IHVuZGVmaW5lZCkge1xyXG4gICAgICAgICAgdXBkYXRlU3RhdGVMaXN0KHJlcClcclxuICAgICAgICAgIHNlbGZbcmVwXS5jc3RvcmUubWFwKGZ1bmN0aW9uIChjKSB7XHJcbiAgICAgICAgICAgIGNsYXNzU3RyICs9IGMgKyAnICdcclxuICAgICAgICAgIH0pXHJcbiAgICAgICAgfVxyXG4gICAgICB9KVxyXG4gICAgfVxyXG4gICAgcmV0dXJuIGNsYXNzU3RyLmxlbmd0aCA/IGNsYXNzU3RyLnRyaW0oKSA6IGNoaWxkLmNsYXNzXHJcbiAgfVxyXG4gIHJldHVybiBmYWxzZVxyXG59XHJcbiIsInZhciBzdHJJbnRlcnByZXRlciA9IHJlcXVpcmUoJy4vc3RySW50ZXJwcmV0ZXInKVxyXG5cclxubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbiAoc3RyLCB1cGRhdGVTdGF0ZUxpc3QpIHtcclxuICB2YXIgc2VsZiA9IHRoaXNcclxuICB2YXIgYXJyUHJvcHMgPSBzdHIubWF0Y2goL3t7KFtee31dKyl9fS9nKVxyXG4gIGlmIChhcnJQcm9wcyAmJiBhcnJQcm9wcy5sZW5ndGgpIHtcclxuICAgIGFyclByb3BzLm1hcChmdW5jdGlvbiAocykge1xyXG4gICAgICB2YXIgcmVwID0gcy5yZXBsYWNlKC97eyhbXnt9XSspfX0vZywgJyQxJylcclxuICAgICAgdmFyIGlzT2JqZWN0Tm90YXRpb24gPSBzdHJJbnRlcnByZXRlcihyZXApXHJcbiAgICAgIGlmICghaXNPYmplY3ROb3RhdGlvbikge1xyXG4gICAgICAgIGlmIChzZWxmW3JlcF0gIT09IHVuZGVmaW5lZCkge1xyXG4gICAgICAgICAgdXBkYXRlU3RhdGVMaXN0KHJlcClcclxuICAgICAgICAgIHN0ciA9IHN0ci5yZXBsYWNlKCd7eycrcmVwKyd9fScsIHNlbGZbcmVwXSlcclxuICAgICAgICB9XHJcbiAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgdXBkYXRlU3RhdGVMaXN0KHJlcClcclxuICAgICAgICBzdHIgPSBzdHIucmVwbGFjZSgne3snK3JlcCsnfX0nLCBzZWxmW2lzT2JqZWN0Tm90YXRpb25bMF1dW2lzT2JqZWN0Tm90YXRpb25bMV1dKVxyXG4gICAgICB9XHJcbiAgICAgIGlmIChyZXAubWF0Y2goL15cXD8vZykpIHtcclxuICAgICAgICB1cGRhdGVTdGF0ZUxpc3QocmVwLnJlcGxhY2UoJz8nLCAnJykpXHJcbiAgICAgIH1cclxuICAgIH0pXHJcbiAgfVxyXG4gIHJldHVybiBzdHJcclxufVxyXG5cclxuIiwidmFyIGNvcHkgPSByZXF1aXJlKCcuL2NvcHknKVxyXG5cclxubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbiAoc3R5bGVzLCB1cGRhdGVTdGF0ZUxpc3QpIHtcclxuICB2YXIgc2VsZiA9IHRoaXNcclxuICB2YXIgY29weVN0eWxlcyA9IGNvcHkoc3R5bGVzKVxyXG4gIGlmIChzdHlsZXMpIHtcclxuICAgIE9iamVjdC5rZXlzKGNvcHlTdHlsZXMpLm1hcChmdW5jdGlvbiAoc3R5bGUpIHtcclxuICAgICAgdmFyIGFyclByb3BzID0gY29weVN0eWxlc1tzdHlsZV0ubWF0Y2goL3t7KFtee31dKyl9fS9nKVxyXG4gICAgICBpZiAoYXJyUHJvcHMgJiYgYXJyUHJvcHMubGVuZ3RoKSB7XHJcbiAgICAgICAgYXJyUHJvcHMubWFwKGZ1bmN0aW9uIChzKSB7XHJcbiAgICAgICAgICB2YXIgcmVwID0gcy5yZXBsYWNlKC97eyhbXnt9XSspfX0vZywgJyQxJylcclxuICAgICAgICAgIGlmIChzZWxmW3JlcF0gIT09IHVuZGVmaW5lZCkge1xyXG4gICAgICAgICAgICB1cGRhdGVTdGF0ZUxpc3QocmVwKVxyXG4gICAgICAgICAgICBjb3B5U3R5bGVzW3N0eWxlXSA9IGNvcHlTdHlsZXNbc3R5bGVdLnJlcGxhY2UoL3t7KFtee31dKyl9fS8sIHNlbGZbcmVwXSlcclxuICAgICAgICAgIH1cclxuICAgICAgICB9KVxyXG4gICAgICB9XHJcbiAgICB9KVxyXG4gIH1cclxuICByZXR1cm4gY29weVN0eWxlc1xyXG59XHJcbiIsImV4cG9ydHMuZ2V0SWQgPSBmdW5jdGlvbiAoaWQpIHtcclxuICByZXR1cm4gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoaWQpXHJcbn1cclxuXHJcbmV4cG9ydHMuZ2VuSWQgPSBmdW5jdGlvbiAoKSB7XHJcbiAgcmV0dXJuIChNYXRoLnJvdW5kKE1hdGgucmFuZG9tKCkgKiAweDEgKiAxZTEyKSkudG9TdHJpbmcoMzIpXHJcbn1cclxuXHJcbmV4cG9ydHMuc2VsZWN0b3IgPSBmdW5jdGlvbiAoaWQpIHtcclxuICByZXR1cm4gZG9jdW1lbnQucXVlcnlTZWxlY3RvcignW2tlZXQtaWQ9XCInICsgaWQgKyAnXCJdJylcclxufVxyXG5cclxudmFyIGxvb3BDaGlsZHMgPSBmdW5jdGlvbiAoYXJyLCBlbGVtKSB7XHJcbiAgZm9yICh2YXIgY2hpbGQgPSBlbGVtLmZpcnN0Q2hpbGQ7IGNoaWxkICE9PSBudWxsOyBjaGlsZCA9IGNoaWxkLm5leHRTaWJsaW5nKSB7XHJcbiAgICBhcnIucHVzaChjaGlsZClcclxuICAgIGlmIChjaGlsZC5oYXNDaGlsZE5vZGVzKCkpIHtcclxuICAgICAgbG9vcENoaWxkcyhhcnIsIGNoaWxkKVxyXG4gICAgfVxyXG4gIH1cclxufVxyXG5cclxuZXhwb3J0cy5sb29wQ2hpbGRzID0gbG9vcENoaWxkc1xyXG4iLCIndXNlIHN0cmljdCdcclxuLyoqXHJcbiAqIEtlZXRqcyB2My41LjIgQWxwaGEgcmVsZWFzZTogaHR0cHM6Ly9naXRodWIuY29tL2tlZXRqcy9rZWV0LmpzXHJcbiAqIE1pbmltYWxpc3QgdmlldyBsYXllciBmb3IgdGhlIHdlYlxyXG4gKlxyXG4gKiA8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDwgS2VldGpzID4+Pj4+Pj4+Pj4+Pj4+Pj4+Pj4+Pj4+Pj4+Pj4+PlxyXG4gKlxyXG4gKiBDb3B5cmlnaHQgMjAxOCwgU2hhaHJ1bCBOaXphbSBTZWxhbWF0XHJcbiAqIFJlbGVhc2VkIHVuZGVyIHRoZSBNSVQgTGljZW5zZS5cclxuICovXHJcblxyXG52YXIgZ2V0SWQgPSByZXF1aXJlKCcuL2NvbXBvbmVudHMvdXRpbHMnKS5nZXRJZFxyXG52YXIgZ2VuSWQgPSByZXF1aXJlKCcuL2NvbXBvbmVudHMvdXRpbHMnKS5nZW5JZFxyXG52YXIgc2VsZWN0b3IgPSByZXF1aXJlKCcuL2NvbXBvbmVudHMvdXRpbHMnKS5zZWxlY3RvclxyXG52YXIgcGFyc2VTdHIgPSByZXF1aXJlKCcuL2NvbXBvbmVudHMvcGFyc2VTdHInKVxyXG52YXIgZ2VuVGVtcGxhdGUgPSByZXF1aXJlKCcuL2NvbXBvbmVudHMvZ2VuVGVtcGxhdGUnKVxyXG52YXIgc2V0RE9NID0gcmVxdWlyZSgnc2V0LWRvbScpXHJcblxyXG5zZXRET00ua2V5ID0gJ2tlZXQtaWQnXHJcblxyXG4vKipcclxuICogQHByaXZhdGVcclxuICogQGRlc2NyaXB0aW9uXHJcbiAqIExvb3AgcmVuZGVyIGFsbCBpbml0aWFsbHkgcGFyc2VkIGh0bWwgZW50aXRpZXMgdG8gXHJcbiAqIHRhcmdldCBET00gbm9kZSBpZC5cclxuICpcclxuICogQHBhcmFtIHtJbnR9IGkgLSBUaGUgaW5kZXggb2YgaHRtbCBlbnRpdHkuXHJcbiAqIEBwYXJhbSB7Tm9kZX0gZWxlIC0gVGhlIHRhcmdldCBET00gbm9kZS5cclxuICogQHBhcmFtIHtOb2RlfSBlbHMgLSBUaGUgbGlzdCBvZiBodG1sIGVudGl0aWVzLlxyXG4gKi9cclxudmFyIG5leHQgPSBmdW5jdGlvbiAoaSwgZWxlLCBlbHMpIHtcclxuICB2YXIgc2VsZiA9IHRoaXNcclxuICBpZiAoaSA8IGVscy5sZW5ndGgpIHtcclxuICAgIGlmICghZWxlLmNoaWxkTm9kZXNbaV0pIGVsZS5hcHBlbmRDaGlsZChlbHNbaV0pXHJcbiAgICBpKytcclxuICAgIG5leHQuYXBwbHkodGhpcywgWyBpLCBlbGUsIGVscyBdKVxyXG4gIH0gZWxzZSB7XHJcbiAgICAvLyBPbmNlIGludGlhbCByZW5kZXIgYWxyZWFkeSBpbiBwbGFjZSBjb25zZWN1dGl2ZWx5XHJcbiAgICAvLyB3YXRjaCB0aGUgb2JqZWN0IGluIENvbXBvbmVudHMucHJvdG90eXBlLmJhc2UuIEFkZCBcclxuICAgIC8vIGFkZGl0aW9uYWwgb2JqZWN0IHByb3BzIG9yIGRlbGV0ZSBleGlzdGluZyBvYmplY3QgXHJcbiAgICAvLyBwcm9wcywgd2hpY2ggd2lsbCByZWZsZWN0IGluIHRoZSBjb21wb25lbnQgcmVuZGVyZWQgXHJcbiAgICAvLyBlbGVtZW50cy5cclxuICAgIHZhciB3YXRjaE9iamVjdCA9IGZ1bmN0aW9uIChvYmopIHtcclxuICAgICAgcmV0dXJuIG5ldyBQcm94eShvYmosIHtcclxuICAgICAgICBzZXQ6IGZ1bmN0aW9uICh0YXJnZXQsIGtleSwgdmFsdWUpIHtcclxuICAgICAgICAgIHRhcmdldFtrZXldID0gdmFsdWVcclxuICAgICAgICAgIHNlbGYuYmFzZVtrZXldID0gdGFyZ2V0W2tleV1cclxuICAgICAgICAgIHJldHVybiB0cnVlXHJcbiAgICAgICAgfSxcclxuICAgICAgICBkZWxldGVQcm9wZXJ0eTogZnVuY3Rpb24gKHRhcmdldCwga2V5KSB7XHJcbiAgICAgICAgICB2YXIgaWQgPSB0YXJnZXRba2V5XVsna2VldC1pZCddXHJcbiAgICAgICAgICB2YXIgZWwgPSBzZWxlY3RvcihpZClcclxuICAgICAgICAgIGVsICYmIGVsLnJlbW92ZSgpXHJcbiAgICAgICAgICBkZWxldGUgc2VsZi5iYXNlW2tleV1cclxuICAgICAgICAgIHJldHVybiB0cnVlXHJcbiAgICAgICAgfVxyXG4gICAgICB9KVxyXG4gICAgfVxyXG4gICAgLy8gb25seSBqYXZhc2NyaXB0IG9iamVjdHMgaXMgd2F0Y2hhYmxlXHJcbiAgICBpZiAodHlwZW9mIHRoaXMuYmFzZSA9PT0gJ29iamVjdCcpIHsgdGhpcy5iYXNlUHJveHkgPSB3YXRjaE9iamVjdCh0aGlzLmJhc2UpIH1cclxuXHJcbiAgICAvLyBzaW5jZSBjb21wb25lbnQgYWxyZWFkeSByZW5kZXJlZCwgdHJpZ2dlciBpdHMgbGlmZS1jeWNsZSBtZXRob2RcclxuICAgIGlmICh0aGlzLmNvbXBvbmVudERpZE1vdW50ICYmIHR5cGVvZiB0aGlzLmNvbXBvbmVudERpZE1vdW50ID09PSAnZnVuY3Rpb24nKSB7XHJcbiAgICAgIHRoaXMuY29tcG9uZW50RGlkTW91bnQoKVxyXG4gICAgfVxyXG4gIH1cclxufVxyXG5cclxuLyoqXHJcbiAqIEBkZXNjcmlwdGlvblxyXG4gKiBUaGUgbWFpbiBjb25zdHJ1Y3RvciBvZiBLZWV0XHJcbiAqXHJcbiAqIEBwYXJhbSB7U3RyaW5nIHwgYXJnMFssIGFyZzFbLCBhcmcyWywgLi4uXV1dfSBhcmd1bWVudHMgLSBDdXN0b20gcHJvcGVydHkgbmFtZXNcclxuICogaS5lIHVzaW5nICdjaGVja2VkJyBmb3IgaW5wdXQgZWxlbWVudHMuXHJcbiAqIFVzYWdlIDotXHJcbiAqXHJcbiAqICAgIGNvbnN0IEFwcCBleHRlbmRzIEtlZXQge1xyXG4gKiAgICAgIGNvbnN0cnVjdG9yKC4uLmFyZ3MpIHtcclxuICogICAgICAgIHN1cGVyKClcclxuICogICAgICAgIHRoaXMuYXJncyA9IGFyZ3NcclxuICogICAgICB9XHJcbiAqICAgIH1cclxuICogICAgY29uc3QgYXBwID0gbmV3IEFwcCgnY2hlY2tlZCcpXHJcbiAqXHJcbiAqIGZvciBleGFtcGxlIHVzYWdlIGNhc2VzIHNlZSBodHRwczovL2dpdGh1Yi5jb20vc3lhcnVsL2tlZXQvYmxvYi9tYXN0ZXIvZXhhbXBsZXMvY2hlY2suanNcclxuICovXHJcbmZ1bmN0aW9uIEtlZXQgKCkge1xyXG4gIC8vIHByZXBhcmUgdGhlIHN0b3JlIGZvciBzdGF0ZXMsIHRoaXMgaXMgdGhlIGludGVybmFsIHN0YXRlLW1hbmFnZW1lbnQgZm9yIHRoZVxyXG4gIC8vIGNvbXBvbmVudHMuIFBlcnNvbmFsbHkgSSBuZXZlciBnZXQgdG8gbGlrZSBzdGF0ZS1tYW5hZ2VtZW50IGluIEphdmFTY3JpcHQuXHJcbiAgLy8gVGhlIGlkZWEgbWlnaHQgc291bmQgZGl2aW5lIGJ1dCB5b3UnbGwgc3R1Y2sgaW4gdmVyeSBjb21wbGljYXRlZCBnZXQtdG8tbWFzdGVyXHJcbiAgLy8gdGhpcyBmcmFtZXdvcmsvZmxvdyBjeWNsZXMgd2hlcmUgeW91IGFsd2F5cyB3cml0ZSB0aGUgc3RhdGUgaW4gc29tZSBleHRlcm5hbCBcclxuICAvLyBzdG9yZSBhbmQgd3JpdGUgbG9uZyBsb2dpY3MgdG8gZG8gc21hbGwgc3R1ZmZzIGFuZCB0aGV5IGFyZSB2ZXJ5IHNsb3cuIE9uIHRoZSBcclxuICAvLyBvdGhlciBoYW5kLCB0aGlzIGludGVybmFsIHN0b3JlIGlzIHJlbGF0aXZlbHkgc2ltcGxlLCBoYXMgcmVmZXJlbmNlcyBhbmQgdGhlIFxyXG4gIC8vIGF2YWlsYWJpbGl0eSBvZiBzaGFyaW5nIGFjcm9zcyBtdWx0aXBsZSBjb21wb25lbnRzIGluIGFueSBjYXNlLlxyXG4gIE9iamVjdC5kZWZpbmVQcm9wZXJ0eSh0aGlzLCAnX19zdGF0ZUxpc3RfXycsIHtcclxuICAgIGVudW1lcmFibGU6IGZhbHNlLFxyXG4gICAgd3JpdGFibGU6IHRydWVcclxuICB9KVxyXG59XHJcblxyXG5LZWV0LnByb3RvdHlwZS5tb3VudCA9IGZ1bmN0aW9uIChpbnN0YW5jZSkge1xyXG4gIC8vIEJlZm9yZSB3ZSBiZWdpbiB0byBwYXJzZSBhbiBpbnN0YW5jZSwgZG8gYSBydW4tZG93biBjaGVja3NcclxuICAvLyB0byBjbGVhbiB1cCBiYWNrLXRpY2sgc3RyaW5nIHdoaWNoIHVzdWFsbHkgaGFzIGxpbmUgc3BhY2luZ1xyXG4gIGlmICh0eXBlb2YgaW5zdGFuY2UgPT09ICdvYmplY3QnKSB7XHJcbiAgICBPYmplY3Qua2V5cyhpbnN0YW5jZSkubWFwKGZ1bmN0aW9uIChrZXkpIHtcclxuICAgICAgaWYgKHR5cGVvZiBpbnN0YW5jZVtrZXldID09PSAnc3RyaW5nJykge1xyXG4gICAgICAgIGluc3RhbmNlW2tleV0gPSBpbnN0YW5jZVtrZXldLnRyaW0oKS5yZXBsYWNlKC9cXHMrL2csICcgJylcclxuICAgICAgfSBlbHNlIGlmICh0eXBlb2YgaW5zdGFuY2Vba2V5XSA9PT0gJ29iamVjdCcgJiYgdHlwZW9mIGluc3RhbmNlW2tleV1bJ3RlbXBsYXRlJ10gPT09ICdzdHJpbmcnKSB7XHJcbiAgICAgICAgaW5zdGFuY2Vba2V5XVsndGVtcGxhdGUnXSA9IGluc3RhbmNlW2tleV1bJ3RlbXBsYXRlJ10udHJpbSgpLnJlcGxhY2UoL1xccysvZywgJyAnKVxyXG4gICAgICB9XHJcbiAgICB9KVxyXG4gIH0gZWxzZSBpZiAodHlwZW9mIGluc3RhbmNlID09PSAnc3RyaW5nJykge1xyXG4gICAgaW5zdGFuY2UgPSBpbnN0YW5jZS50cmltKCkucmVwbGFjZSgvXFxzKy9nLCAnICcpXHJcbiAgfVxyXG4gIC8vIHdlIHN0b3JlIHRoZSBwcmlzdGluZSBpbnN0YW5jZSBpbiBDb21wb25lbnQuYmFzZVxyXG4gIHRoaXMuYmFzZSA9IGluc3RhbmNlXHJcbiAgcmV0dXJuIHRoaXNcclxufVxyXG5cclxuS2VldC5wcm90b3R5cGUuZmx1c2ggPSBmdW5jdGlvbiAoaW5zdGFuY2UpIHtcclxuICAvLyBDdXN0b20gbWV0aG9kIHRvIGNsZWFuIHVwIHRoZSBjb21wb25lbnQgRE9NIHRyZWVcclxuICAvLyB1c2VmdWwgaWYgd2UgbmVlZCB0byBkbyBjbGVhbiB1cCByZXJlbmRlci5cclxuICB2YXIgZWxlID0gZ2V0SWQodGhpcy5lbClcclxuICBpZiAoZWxlKSBlbGUuaW5uZXJIVE1MID0gJydcclxuICByZXR1cm4gdGhpc1xyXG59XHJcblxyXG5LZWV0LnByb3RvdHlwZS5saW5rID0gZnVuY3Rpb24gKGlkKSB7XHJcbiAgLy8gVGhlIHRhcmdldCBET00gd2hlcmUgdGhlIHJlbmRlcmluZyB3aWxsIHRvb2sgcGxhY2UuXHJcbiAgLy8gV2UgY291bGQgYWxzbyBhcHBseSBsaWZlLWN5Y2xlIG1ldGhvZCBiZWZvcmUgdGhlXHJcbiAgLy8gcmVuZGVyIGhhcHBlbi5cclxuICB0aGlzLmVsID0gaWRcclxuICBpZiAodGhpcy5jb21wb25lbnRXaWxsTW91bnQgJiYgdHlwZW9mIHRoaXMuY29tcG9uZW50V2lsbE1vdW50ID09PSAnZnVuY3Rpb24nKSB7XHJcbiAgICB0aGlzLmNvbXBvbmVudFdpbGxNb3VudCgpXHJcbiAgfVxyXG4gIHRoaXMucmVuZGVyKClcclxuICByZXR1cm4gdGhpc1xyXG59XHJcblxyXG5LZWV0LnByb3RvdHlwZS5yZW5kZXIgPSBmdW5jdGlvbiAoKSB7XHJcbiAgLy8gUmVuZGVyIHRoaXMgY29tcG9uZW50IHRvIHRoZSB0YXJnZXQgRE9NXHJcbiAgdmFyIGVsZSA9IGdldElkKHRoaXMuZWwpXHJcbiAgdmFyIGVscyA9IHBhcnNlU3RyLmFwcGx5KHRoaXMsIHRoaXMuYXJncylcclxuICBpZiAoZWxlKSB7XHJcbiAgICBuZXh0LmFwcGx5KHRoaXMsIFsgMCwgZWxlLCBlbHMgXSlcclxuICB9XHJcbiAgcmV0dXJuIHRoaXNcclxufVxyXG5cclxuS2VldC5wcm90b3R5cGUuY2x1c3RlciA9IGZ1bmN0aW9uICgpIHtcclxuICAvLyBDaGFpbiBtZXRob2QgdG8gcnVuIGV4dGVybmFsIGZ1bmN0aW9uKHMpLCB0aGlzIGJhc2ljYWxseSBzZXJ2ZVxyXG4gIC8vIGFzIGFuIGluaXRpYWxpemVyIGZvciBhbGwgY2hpbGQgY29tcG9uZW50cyB3aXRoaW4gdGhlIGluc3RhbmNlIHRyZWVcclxuICB2YXIgYXJncyA9IFtdLnNsaWNlLmNhbGwoYXJndW1lbnRzKVxyXG4gIGlmIChhcmdzLmxlbmd0aCA+IDApIHtcclxuICAgIGFyZ3MubWFwKGZ1bmN0aW9uIChmKSB7XHJcbiAgICAgIGlmICh0eXBlb2YgZiA9PT0gJ2Z1bmN0aW9uJykgZigpXHJcbiAgICB9KVxyXG4gIH1cclxufVxyXG5cclxuS2VldC5wcm90b3R5cGUuYWRkID0gZnVuY3Rpb24gKG9iaiwgaW50ZXJjZXB0b3IpIHtcclxuICAvLyBNZXRob2QgdG8gYWRkIGEgbmV3IG9iamVjdCB0byBjb21wb25lbnQgbW9kZWxcclxuICB2YXIgc2VsZiA9IHRoaXNcclxuICB2YXIgZWxlID0gZ2V0SWQodGhpcy5lbClcclxuICBvYmpbJ2tlZXQtaWQnXSA9IGdlbklkKClcclxuICB0aGlzLmJhc2UubW9kZWwgPSB0aGlzLmJhc2UubW9kZWwuY29uY2F0KG9iailcclxuICAvLyBpZiBpbnRlcmNlcHRvciBpcyBkZWNsYXJlZCBleGVjdXRlIGl0IGJlZm9yZSBub2RlIHVwZGF0ZVxyXG4gIGlmKGludGVyY2VwdG9yICYmIHR5cGVvZiBpbnRlcmNlcHRvciA9PT0gJ2Z1bmN0aW9uJyl7XHJcbiAgICBpbnRlcmNlcHRvci5jYWxsKHRoaXMpXHJcbiAgfVxyXG4gIGlmKGVsZSlcclxuICAgIGVsZS5hcHBlbmRDaGlsZChnZW5UZW1wbGF0ZS5jYWxsKHRoaXMsIG9iaikpXHJcbiAgZWxzZSB7XHJcbiAgICAvLyBpZiBlbGVtZW50IGlzIG5vdCByZWFkeSB3ZSBrZWVwIGNoZWNraW5nIHRoZSBpbml0aWFsIGF2YWlsYWJpbGl0eVxyXG4gICAgdmFyIHQgPSBzZXRJbnRlcnZhbChmdW5jdGlvbigpe1xyXG4gICAgICBlbGUgPSBnZXRJZChzZWxmLmVsKVxyXG4gICAgICBpZihlbGUpIHtcclxuICAgICAgICBjbGVhckludGVydmFsKHQpXHJcbiAgICAgICAgZWxlLmFwcGVuZENoaWxkKGdlblRlbXBsYXRlLmNhbGwoc2VsZiwgb2JqKSlcclxuICAgICAgfVxyXG4gICAgfSwgMClcclxuICB9XHJcbn1cclxuXHJcbktlZXQucHJvdG90eXBlLmRlc3Ryb3kgPSBmdW5jdGlvbiAoaWQsIGF0dHIsIGludGVyY2VwdG9yKSB7XHJcbiAgLy8gTWV0aG9kIHRvIGRlc3Ryb3kgYSBzdWJtb2RlbCBvZiBhIGNvbXBvbmVudFxyXG4gIHZhciBzZWxmID0gdGhpc1xyXG4gIHRoaXMuYmFzZS5tb2RlbCA9IHRoaXMuYmFzZS5tb2RlbC5maWx0ZXIoZnVuY3Rpb24gKG9iaiwgaW5kZXgpIHtcclxuICAgIGlmIChpZCA9PT0gb2JqW2F0dHJdKSB7XHJcbiAgICAgIHZhciBub2RlID0gc2VsZWN0b3Iob2JqWydrZWV0LWlkJ10pXHJcbiAgICAgIGlmIChub2RlKSB7IFxyXG4gICAgICAgIC8vIGlmIGludGVyY2VwdG9yIGlzIGRlY2xhcmVkIGV4ZWN1dGUgaXQgYmVmb3JlIG5vZGUgdXBkYXRlXHJcbiAgICAgICAgaWYoaW50ZXJjZXB0b3IgJiYgdHlwZW9mIGludGVyY2VwdG9yID09PSAnZnVuY3Rpb24nKXtcclxuICAgICAgICAgIGludGVyY2VwdG9yLmNhbGwoc2VsZilcclxuICAgICAgICB9XHJcbiAgICAgICAgbm9kZS5yZW1vdmUoKSBcclxuICAgICAgfVxyXG4gICAgfSBlbHNlIHsgcmV0dXJuIG9iaiB9XHJcbiAgfSlcclxufVxyXG5cclxuS2VldC5wcm90b3R5cGUudXBkYXRlID0gZnVuY3Rpb24gKGlkLCBhdHRyLCBuZXdBdHRyLCBpbnRlcmNlcHRvcikge1xyXG4gIC8vIE1ldGhvZCB0byB1cGRhdGUgYSBzdWJtb2RlbCBvZiBhIGNvbXBvbmVudFxyXG4gIHZhciBzZWxmID0gdGhpc1xyXG4gIHRoaXMuYmFzZS5tb2RlbCA9IHRoaXMuYmFzZS5tb2RlbC5tYXAoZnVuY3Rpb24gKG9iaiwgaWR4LCBtb2RlbCkge1xyXG4gICAgY29uc29sZS5sb2coaWQsIG9iaiwgYXR0ciwgb2JqW2F0dHJdKVxyXG4gICAgaWYgKGlkID09PSBvYmpbYXR0cl0pIHtcclxuICAgICAgaWYgKG5ld0F0dHIgJiYgdHlwZW9mIG5ld0F0dHIgPT09ICdvYmplY3QnKSB7XHJcbiAgICAgICAgT2JqZWN0LmFzc2lnbihvYmosIG5ld0F0dHIpXHJcbiAgICAgIH1cclxuICAgICAgdmFyIG5vZGUgPSBzZWxlY3RvcihvYmpbJ2tlZXQtaWQnXSlcclxuICAgICAgaWYgKG5vZGUpIHtcclxuICAgICAgICAvLyBpZiBpbnRlcmNlcHRvciBpcyBkZWNsYXJlZCBleGVjdXRlIGl0IGJlZm9yZSBub2RlIHVwZGF0ZVxyXG4gICAgICAgIGlmKGludGVyY2VwdG9yICYmIHR5cGVvZiBpbnRlcmNlcHRvciA9PT0gJ2Z1bmN0aW9uJyl7XHJcbiAgICAgICAgICBpbnRlcmNlcHRvci5jYWxsKHNlbGYpXHJcbiAgICAgICAgfVxyXG4gICAgICAgIHNldERPTShub2RlLCBnZW5UZW1wbGF0ZS5jYWxsKHNlbGYsIG9iaikpXHJcbiAgICAgIH1cclxuICAgIH1cclxuICAgIHJldHVybiBvYmpcclxuICB9KVxyXG59XHJcblxyXG5tb2R1bGUuZXhwb3J0cyA9IEtlZXRcclxuIiwiJ3VzZSBzdHJpY3QnO1xuXG5mdW5jdGlvbiBwYWQgKGhhc2gsIGxlbikge1xuICB3aGlsZSAoaGFzaC5sZW5ndGggPCBsZW4pIHtcbiAgICBoYXNoID0gJzAnICsgaGFzaDtcbiAgfVxuICByZXR1cm4gaGFzaDtcbn1cblxuZnVuY3Rpb24gZm9sZCAoaGFzaCwgdGV4dCkge1xuICB2YXIgaTtcbiAgdmFyIGNocjtcbiAgdmFyIGxlbjtcbiAgaWYgKHRleHQubGVuZ3RoID09PSAwKSB7XG4gICAgcmV0dXJuIGhhc2g7XG4gIH1cbiAgZm9yIChpID0gMCwgbGVuID0gdGV4dC5sZW5ndGg7IGkgPCBsZW47IGkrKykge1xuICAgIGNociA9IHRleHQuY2hhckNvZGVBdChpKTtcbiAgICBoYXNoID0gKChoYXNoIDw8IDUpIC0gaGFzaCkgKyBjaHI7XG4gICAgaGFzaCB8PSAwO1xuICB9XG4gIHJldHVybiBoYXNoIDwgMCA/IGhhc2ggKiAtMiA6IGhhc2g7XG59XG5cbmZ1bmN0aW9uIGZvbGRPYmplY3QgKGhhc2gsIG8sIHNlZW4pIHtcbiAgcmV0dXJuIE9iamVjdC5rZXlzKG8pLnNvcnQoKS5yZWR1Y2UoZm9sZEtleSwgaGFzaCk7XG4gIGZ1bmN0aW9uIGZvbGRLZXkgKGhhc2gsIGtleSkge1xuICAgIHJldHVybiBmb2xkVmFsdWUoaGFzaCwgb1trZXldLCBrZXksIHNlZW4pO1xuICB9XG59XG5cbmZ1bmN0aW9uIGZvbGRWYWx1ZSAoaW5wdXQsIHZhbHVlLCBrZXksIHNlZW4pIHtcbiAgdmFyIGhhc2ggPSBmb2xkKGZvbGQoZm9sZChpbnB1dCwga2V5KSwgdG9TdHJpbmcodmFsdWUpKSwgdHlwZW9mIHZhbHVlKTtcbiAgaWYgKHZhbHVlID09PSBudWxsKSB7XG4gICAgcmV0dXJuIGZvbGQoaGFzaCwgJ251bGwnKTtcbiAgfVxuICBpZiAodmFsdWUgPT09IHVuZGVmaW5lZCkge1xuICAgIHJldHVybiBmb2xkKGhhc2gsICd1bmRlZmluZWQnKTtcbiAgfVxuICBpZiAodHlwZW9mIHZhbHVlID09PSAnb2JqZWN0Jykge1xuICAgIGlmIChzZWVuLmluZGV4T2YodmFsdWUpICE9PSAtMSkge1xuICAgICAgcmV0dXJuIGZvbGQoaGFzaCwgJ1tDaXJjdWxhcl0nICsga2V5KTtcbiAgICB9XG4gICAgc2Vlbi5wdXNoKHZhbHVlKTtcbiAgICByZXR1cm4gZm9sZE9iamVjdChoYXNoLCB2YWx1ZSwgc2Vlbik7XG4gIH1cbiAgcmV0dXJuIGZvbGQoaGFzaCwgdmFsdWUudG9TdHJpbmcoKSk7XG59XG5cbmZ1bmN0aW9uIHRvU3RyaW5nIChvKSB7XG4gIHJldHVybiBPYmplY3QucHJvdG90eXBlLnRvU3RyaW5nLmNhbGwobyk7XG59XG5cbmZ1bmN0aW9uIHN1bSAobykge1xuICByZXR1cm4gcGFkKGZvbGRWYWx1ZSgwLCBvLCAnJywgW10pLnRvU3RyaW5nKDE2KSwgOCk7XG59XG5cbm1vZHVsZS5leHBvcnRzID0gc3VtO1xuIiwiJ3VzZSBzdHJpY3QnXG5cbnNldERPTS5LRVkgPSAnZGF0YS1rZXknXG5zZXRET00uSUdOT1JFID0gJ2RhdGEtaWdub3JlJ1xuc2V0RE9NLkNIRUNLU1VNID0gJ2RhdGEtY2hlY2tzdW0nXG52YXIgcGFyc2VIVE1MID0gcmVxdWlyZSgnLi9wYXJzZS1odG1sJylcbnZhciBLRVlfUFJFRklYID0gJ19zZXQtZG9tLSdcbnZhciBOT0RFX01PVU5URUQgPSBLRVlfUFJFRklYICsgJ21vdW50ZWQnXG52YXIgRUxFTUVOVF9UWVBFID0gMVxudmFyIERPQ1VNRU5UX1RZUEUgPSA5XG52YXIgRE9DVU1FTlRfRlJBR01FTlRfVFlQRSA9IDExXG5cbi8vIEV4cG9zZSBhcGkuXG5tb2R1bGUuZXhwb3J0cyA9IHNldERPTVxuXG4vKipcbiAqIEBkZXNjcmlwdGlvblxuICogVXBkYXRlcyBleGlzdGluZyBkb20gdG8gbWF0Y2ggYSBuZXcgZG9tLlxuICpcbiAqIEBwYXJhbSB7Tm9kZX0gb2xkTm9kZSAtIFRoZSBodG1sIGVudGl0eSB0byB1cGRhdGUuXG4gKiBAcGFyYW0ge1N0cmluZ3xOb2RlfSBuZXdOb2RlIC0gVGhlIHVwZGF0ZWQgaHRtbChlbnRpdHkpLlxuICovXG5mdW5jdGlvbiBzZXRET00gKG9sZE5vZGUsIG5ld05vZGUpIHtcbiAgLy8gRW5zdXJlIGEgcmVhbGlzaCBkb20gbm9kZSBpcyBwcm92aWRlZC5cbiAgYXNzZXJ0KG9sZE5vZGUgJiYgb2xkTm9kZS5ub2RlVHlwZSwgJ1lvdSBtdXN0IHByb3ZpZGUgYSB2YWxpZCBub2RlIHRvIHVwZGF0ZS4nKVxuXG4gIC8vIEFsaWFzIGRvY3VtZW50IGVsZW1lbnQgd2l0aCBkb2N1bWVudC5cbiAgaWYgKG9sZE5vZGUubm9kZVR5cGUgPT09IERPQ1VNRU5UX1RZUEUpIG9sZE5vZGUgPSBvbGROb2RlLmRvY3VtZW50RWxlbWVudFxuXG4gIC8vIERvY3VtZW50IEZyYWdtZW50cyBkb24ndCBoYXZlIGF0dHJpYnV0ZXMsIHNvIG5vIG5lZWQgdG8gbG9vayBhdCBjaGVja3N1bXMsIGlnbm9yZWQsIGF0dHJpYnV0ZXMsIG9yIG5vZGUgcmVwbGFjZW1lbnQuXG4gIGlmIChuZXdOb2RlLm5vZGVUeXBlID09PSBET0NVTUVOVF9GUkFHTUVOVF9UWVBFKSB7XG4gICAgLy8gU2ltcGx5IHVwZGF0ZSBhbGwgY2hpbGRyZW4gKGFuZCBzdWJjaGlsZHJlbikuXG4gICAgc2V0Q2hpbGROb2RlcyhvbGROb2RlLCBuZXdOb2RlKVxuICB9IGVsc2Uge1xuICAgIC8vIE90aGVyd2lzZSB3ZSBkaWZmIHRoZSBlbnRpcmUgb2xkIG5vZGUuXG4gICAgc2V0Tm9kZShvbGROb2RlLCB0eXBlb2YgbmV3Tm9kZSA9PT0gJ3N0cmluZydcbiAgICAgIC8vIElmIGEgc3RyaW5nIHdhcyBwcm92aWRlZCB3ZSB3aWxsIHBhcnNlIGl0IGFzIGRvbS5cbiAgICAgID8gcGFyc2VIVE1MKG5ld05vZGUsIG9sZE5vZGUubm9kZU5hbWUpXG4gICAgICA6IG5ld05vZGVcbiAgICApXG4gIH1cblxuICAvLyBUcmlnZ2VyIG1vdW50IGV2ZW50cyBvbiBpbml0aWFsIHNldC5cbiAgaWYgKCFvbGROb2RlW05PREVfTU9VTlRFRF0pIHtcbiAgICBvbGROb2RlW05PREVfTU9VTlRFRF0gPSB0cnVlXG4gICAgbW91bnQob2xkTm9kZSlcbiAgfVxufVxuXG4vKipcbiAqIEBwcml2YXRlXG4gKiBAZGVzY3JpcHRpb25cbiAqIFVwZGF0ZXMgYSBzcGVjaWZpYyBodG1sTm9kZSBhbmQgZG9lcyB3aGF0ZXZlciBpdCB0YWtlcyB0byBjb252ZXJ0IGl0IHRvIGFub3RoZXIgb25lLlxuICpcbiAqIEBwYXJhbSB7Tm9kZX0gb2xkTm9kZSAtIFRoZSBwcmV2aW91cyBIVE1MTm9kZS5cbiAqIEBwYXJhbSB7Tm9kZX0gbmV3Tm9kZSAtIFRoZSB1cGRhdGVkIEhUTUxOb2RlLlxuICovXG5mdW5jdGlvbiBzZXROb2RlIChvbGROb2RlLCBuZXdOb2RlKSB7XG4gIGlmIChvbGROb2RlLm5vZGVUeXBlID09PSBuZXdOb2RlLm5vZGVUeXBlKSB7XG4gICAgLy8gSGFuZGxlIHJlZ3VsYXIgZWxlbWVudCBub2RlIHVwZGF0ZXMuXG4gICAgaWYgKG9sZE5vZGUubm9kZVR5cGUgPT09IEVMRU1FTlRfVFlQRSkge1xuICAgICAgLy8gQ2hlY2tzIGlmIG5vZGVzIGFyZSBlcXVhbCBiZWZvcmUgZGlmZmluZy5cbiAgICAgIGlmIChpc0VxdWFsTm9kZShvbGROb2RlLCBuZXdOb2RlKSkgcmV0dXJuXG5cbiAgICAgIC8vIFVwZGF0ZSBhbGwgY2hpbGRyZW4gKGFuZCBzdWJjaGlsZHJlbikuXG4gICAgICBzZXRDaGlsZE5vZGVzKG9sZE5vZGUsIG5ld05vZGUpXG5cbiAgICAgIC8vIFVwZGF0ZSB0aGUgZWxlbWVudHMgYXR0cmlidXRlcyAvIHRhZ05hbWUuXG4gICAgICBpZiAob2xkTm9kZS5ub2RlTmFtZSA9PT0gbmV3Tm9kZS5ub2RlTmFtZSkge1xuICAgICAgICAvLyBJZiB3ZSBoYXZlIHRoZSBzYW1lIG5vZGVuYW1lIHRoZW4gd2UgY2FuIGRpcmVjdGx5IHVwZGF0ZSB0aGUgYXR0cmlidXRlcy5cbiAgICAgICAgc2V0QXR0cmlidXRlcyhvbGROb2RlLmF0dHJpYnV0ZXMsIG5ld05vZGUuYXR0cmlidXRlcylcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIC8vIE90aGVyd2lzZSBjbG9uZSB0aGUgbmV3IG5vZGUgdG8gdXNlIGFzIHRoZSBleGlzdGluZyBub2RlLlxuICAgICAgICB2YXIgbmV3UHJldiA9IG5ld05vZGUuY2xvbmVOb2RlKClcbiAgICAgICAgLy8gQ29weSBvdmVyIGFsbCBleGlzdGluZyBjaGlsZHJlbiBmcm9tIHRoZSBvcmlnaW5hbCBub2RlLlxuICAgICAgICB3aGlsZSAob2xkTm9kZS5maXJzdENoaWxkKSBuZXdQcmV2LmFwcGVuZENoaWxkKG9sZE5vZGUuZmlyc3RDaGlsZClcbiAgICAgICAgLy8gUmVwbGFjZSB0aGUgb3JpZ2luYWwgbm9kZSB3aXRoIHRoZSBuZXcgb25lIHdpdGggdGhlIHJpZ2h0IHRhZy5cbiAgICAgICAgb2xkTm9kZS5wYXJlbnROb2RlLnJlcGxhY2VDaGlsZChuZXdQcmV2LCBvbGROb2RlKVxuICAgICAgfVxuICAgIH0gZWxzZSB7XG4gICAgICAvLyBIYW5kbGUgb3RoZXIgdHlwZXMgb2Ygbm9kZSB1cGRhdGVzICh0ZXh0L2NvbW1lbnRzL2V0YykuXG4gICAgICAvLyBJZiBib3RoIGFyZSB0aGUgc2FtZSB0eXBlIG9mIG5vZGUgd2UgY2FuIHVwZGF0ZSBkaXJlY3RseS5cbiAgICAgIGlmIChvbGROb2RlLm5vZGVWYWx1ZSAhPT0gbmV3Tm9kZS5ub2RlVmFsdWUpIHtcbiAgICAgICAgb2xkTm9kZS5ub2RlVmFsdWUgPSBuZXdOb2RlLm5vZGVWYWx1ZVxuICAgICAgfVxuICAgIH1cbiAgfSBlbHNlIHtcbiAgICAvLyB3ZSBoYXZlIHRvIHJlcGxhY2UgdGhlIG5vZGUuXG4gICAgb2xkTm9kZS5wYXJlbnROb2RlLnJlcGxhY2VDaGlsZChuZXdOb2RlLCBkaXNtb3VudChvbGROb2RlKSlcbiAgICBtb3VudChuZXdOb2RlKVxuICB9XG59XG5cbi8qKlxuICogQHByaXZhdGVcbiAqIEBkZXNjcmlwdGlvblxuICogVXRpbGl0eSB0aGF0IHdpbGwgdXBkYXRlIG9uZSBsaXN0IG9mIGF0dHJpYnV0ZXMgdG8gbWF0Y2ggYW5vdGhlci5cbiAqXG4gKiBAcGFyYW0ge05hbWVkTm9kZU1hcH0gb2xkQXR0cmlidXRlcyAtIFRoZSBwcmV2aW91cyBhdHRyaWJ1dGVzLlxuICogQHBhcmFtIHtOYW1lZE5vZGVNYXB9IG5ld0F0dHJpYnV0ZXMgLSBUaGUgdXBkYXRlZCBhdHRyaWJ1dGVzLlxuICovXG5mdW5jdGlvbiBzZXRBdHRyaWJ1dGVzIChvbGRBdHRyaWJ1dGVzLCBuZXdBdHRyaWJ1dGVzKSB7XG4gIHZhciBpLCBhLCBiLCBucywgbmFtZVxuXG4gIC8vIFJlbW92ZSBvbGQgYXR0cmlidXRlcy5cbiAgZm9yIChpID0gb2xkQXR0cmlidXRlcy5sZW5ndGg7IGktLTspIHtcbiAgICBhID0gb2xkQXR0cmlidXRlc1tpXVxuICAgIG5zID0gYS5uYW1lc3BhY2VVUklcbiAgICBuYW1lID0gYS5sb2NhbE5hbWVcbiAgICBiID0gbmV3QXR0cmlidXRlcy5nZXROYW1lZEl0ZW1OUyhucywgbmFtZSlcbiAgICBpZiAoIWIpIG9sZEF0dHJpYnV0ZXMucmVtb3ZlTmFtZWRJdGVtTlMobnMsIG5hbWUpXG4gIH1cblxuICAvLyBTZXQgbmV3IGF0dHJpYnV0ZXMuXG4gIGZvciAoaSA9IG5ld0F0dHJpYnV0ZXMubGVuZ3RoOyBpLS07KSB7XG4gICAgYSA9IG5ld0F0dHJpYnV0ZXNbaV1cbiAgICBucyA9IGEubmFtZXNwYWNlVVJJXG4gICAgbmFtZSA9IGEubG9jYWxOYW1lXG4gICAgYiA9IG9sZEF0dHJpYnV0ZXMuZ2V0TmFtZWRJdGVtTlMobnMsIG5hbWUpXG4gICAgaWYgKCFiKSB7XG4gICAgICAvLyBBZGQgYSBuZXcgYXR0cmlidXRlLlxuICAgICAgbmV3QXR0cmlidXRlcy5yZW1vdmVOYW1lZEl0ZW1OUyhucywgbmFtZSlcbiAgICAgIG9sZEF0dHJpYnV0ZXMuc2V0TmFtZWRJdGVtTlMoYSlcbiAgICB9IGVsc2UgaWYgKGIudmFsdWUgIT09IGEudmFsdWUpIHtcbiAgICAgIC8vIFVwZGF0ZSBleGlzdGluZyBhdHRyaWJ1dGUuXG4gICAgICBiLnZhbHVlID0gYS52YWx1ZVxuICAgIH1cbiAgfVxufVxuXG4vKipcbiAqIEBwcml2YXRlXG4gKiBAZGVzY3JpcHRpb25cbiAqIFV0aWxpdHkgdGhhdCB3aWxsIG5vZGVzIGNoaWxkZXJuIHRvIG1hdGNoIGFub3RoZXIgbm9kZXMgY2hpbGRyZW4uXG4gKlxuICogQHBhcmFtIHtOb2RlfSBvbGRQYXJlbnQgLSBUaGUgZXhpc3RpbmcgcGFyZW50IG5vZGUuXG4gKiBAcGFyYW0ge05vZGV9IG5ld1BhcmVudCAtIFRoZSBuZXcgcGFyZW50IG5vZGUuXG4gKi9cbmZ1bmN0aW9uIHNldENoaWxkTm9kZXMgKG9sZFBhcmVudCwgbmV3UGFyZW50KSB7XG4gIHZhciBjaGVja09sZCwgb2xkS2V5LCBjaGVja05ldywgbmV3S2V5LCBmb3VuZE5vZGUsIGtleWVkTm9kZXNcbiAgdmFyIG9sZE5vZGUgPSBvbGRQYXJlbnQuZmlyc3RDaGlsZFxuICB2YXIgbmV3Tm9kZSA9IG5ld1BhcmVudC5maXJzdENoaWxkXG4gIHZhciBleHRyYSA9IDBcblxuICAvLyBFeHRyYWN0IGtleWVkIG5vZGVzIGZyb20gcHJldmlvdXMgY2hpbGRyZW4gYW5kIGtlZXAgdHJhY2sgb2YgdG90YWwgY291bnQuXG4gIHdoaWxlIChvbGROb2RlKSB7XG4gICAgZXh0cmErK1xuICAgIGNoZWNrT2xkID0gb2xkTm9kZVxuICAgIG9sZEtleSA9IGdldEtleShjaGVja09sZClcbiAgICBvbGROb2RlID0gb2xkTm9kZS5uZXh0U2libGluZ1xuXG4gICAgaWYgKG9sZEtleSkge1xuICAgICAgaWYgKCFrZXllZE5vZGVzKSBrZXllZE5vZGVzID0ge31cbiAgICAgIGtleWVkTm9kZXNbb2xkS2V5XSA9IGNoZWNrT2xkXG4gICAgfVxuICB9XG5cbiAgLy8gTG9vcCBvdmVyIG5ldyBub2RlcyBhbmQgcGVyZm9ybSB1cGRhdGVzLlxuICBvbGROb2RlID0gb2xkUGFyZW50LmZpcnN0Q2hpbGRcbiAgd2hpbGUgKG5ld05vZGUpIHtcbiAgICBleHRyYS0tXG4gICAgY2hlY2tOZXcgPSBuZXdOb2RlXG4gICAgbmV3Tm9kZSA9IG5ld05vZGUubmV4dFNpYmxpbmdcblxuICAgIGlmIChrZXllZE5vZGVzICYmIChuZXdLZXkgPSBnZXRLZXkoY2hlY2tOZXcpKSAmJiAoZm91bmROb2RlID0ga2V5ZWROb2Rlc1tuZXdLZXldKSkge1xuICAgICAgZGVsZXRlIGtleWVkTm9kZXNbbmV3S2V5XVxuICAgICAgLy8gSWYgd2UgaGF2ZSBhIGtleSBhbmQgaXQgZXhpc3RlZCBiZWZvcmUgd2UgbW92ZSB0aGUgcHJldmlvdXMgbm9kZSB0byB0aGUgbmV3IHBvc2l0aW9uIGlmIG5lZWRlZCBhbmQgZGlmZiBpdC5cbiAgICAgIGlmIChmb3VuZE5vZGUgIT09IG9sZE5vZGUpIHtcbiAgICAgICAgb2xkUGFyZW50Lmluc2VydEJlZm9yZShmb3VuZE5vZGUsIG9sZE5vZGUpXG4gICAgICB9IGVsc2Uge1xuICAgICAgICBvbGROb2RlID0gb2xkTm9kZS5uZXh0U2libGluZ1xuICAgICAgfVxuXG4gICAgICBzZXROb2RlKGZvdW5kTm9kZSwgY2hlY2tOZXcpXG4gICAgfSBlbHNlIGlmIChvbGROb2RlKSB7XG4gICAgICBjaGVja09sZCA9IG9sZE5vZGVcbiAgICAgIG9sZE5vZGUgPSBvbGROb2RlLm5leHRTaWJsaW5nXG4gICAgICBpZiAoZ2V0S2V5KGNoZWNrT2xkKSkge1xuICAgICAgICAvLyBJZiB0aGUgb2xkIGNoaWxkIGhhZCBhIGtleSB3ZSBza2lwIG92ZXIgaXQgdW50aWwgdGhlIGVuZC5cbiAgICAgICAgb2xkUGFyZW50Lmluc2VydEJlZm9yZShjaGVja05ldywgY2hlY2tPbGQpXG4gICAgICAgIG1vdW50KGNoZWNrTmV3KVxuICAgICAgfSBlbHNlIHtcbiAgICAgICAgLy8gT3RoZXJ3aXNlIHdlIGRpZmYgdGhlIHR3byBub24ta2V5ZWQgbm9kZXMuXG4gICAgICAgIHNldE5vZGUoY2hlY2tPbGQsIGNoZWNrTmV3KVxuICAgICAgfVxuICAgIH0gZWxzZSB7XG4gICAgICAvLyBGaW5hbGx5IGlmIHRoZXJlIHdhcyBubyBvbGQgbm9kZSB3ZSBhZGQgdGhlIG5ldyBub2RlLlxuICAgICAgb2xkUGFyZW50LmFwcGVuZENoaWxkKGNoZWNrTmV3KVxuICAgICAgbW91bnQoY2hlY2tOZXcpXG4gICAgfVxuICB9XG5cbiAgLy8gUmVtb3ZlIG9sZCBrZXllZCBub2Rlcy5cbiAgZm9yIChvbGRLZXkgaW4ga2V5ZWROb2Rlcykge1xuICAgIGV4dHJhLS1cbiAgICBvbGRQYXJlbnQucmVtb3ZlQ2hpbGQoZGlzbW91bnQoa2V5ZWROb2Rlc1tvbGRLZXldKSlcbiAgfVxuXG4gIC8vIElmIHdlIGhhdmUgYW55IHJlbWFpbmluZyB1bmtleWVkIG5vZGVzIHJlbW92ZSB0aGVtIGZyb20gdGhlIGVuZC5cbiAgd2hpbGUgKC0tZXh0cmEgPj0gMCkge1xuICAgIG9sZFBhcmVudC5yZW1vdmVDaGlsZChkaXNtb3VudChvbGRQYXJlbnQubGFzdENoaWxkKSlcbiAgfVxufVxuXG4vKipcbiAqIEBwcml2YXRlXG4gKiBAZGVzY3JpcHRpb25cbiAqIFV0aWxpdHkgdG8gdHJ5IHRvIHB1bGwgYSBrZXkgb3V0IG9mIGFuIGVsZW1lbnQuXG4gKiBVc2VzICdkYXRhLWtleScgaWYgcG9zc2libGUgYW5kIGZhbGxzIGJhY2sgdG8gJ2lkJy5cbiAqXG4gKiBAcGFyYW0ge05vZGV9IG5vZGUgLSBUaGUgbm9kZSB0byBnZXQgdGhlIGtleSBmb3IuXG4gKiBAcmV0dXJuIHtzdHJpbmd8dm9pZH1cbiAqL1xuZnVuY3Rpb24gZ2V0S2V5IChub2RlKSB7XG4gIGlmIChub2RlLm5vZGVUeXBlICE9PSBFTEVNRU5UX1RZUEUpIHJldHVyblxuICB2YXIga2V5ID0gbm9kZS5nZXRBdHRyaWJ1dGUoc2V0RE9NLktFWSkgfHwgbm9kZS5pZFxuICBpZiAoa2V5KSByZXR1cm4gS0VZX1BSRUZJWCArIGtleVxufVxuXG4vKipcbiAqIENoZWNrcyBpZiBub2RlcyBhcmUgZXF1YWwgdXNpbmcgdGhlIGZvbGxvd2luZyBieSBjaGVja2luZyBpZlxuICogdGhleSBhcmUgYm90aCBpZ25vcmVkLCBoYXZlIHRoZSBzYW1lIGNoZWNrc3VtLCBvciBoYXZlIHRoZVxuICogc2FtZSBjb250ZW50cy5cbiAqXG4gKiBAcGFyYW0ge05vZGV9IGEgLSBPbmUgb2YgdGhlIG5vZGVzIHRvIGNvbXBhcmUuXG4gKiBAcGFyYW0ge05vZGV9IGIgLSBBbm90aGVyIG5vZGUgdG8gY29tcGFyZS5cbiAqL1xuZnVuY3Rpb24gaXNFcXVhbE5vZGUgKGEsIGIpIHtcbiAgcmV0dXJuIChcbiAgICAvLyBDaGVjayBpZiBib3RoIG5vZGVzIGFyZSBpZ25vcmVkLlxuICAgIChpc0lnbm9yZWQoYSkgJiYgaXNJZ25vcmVkKGIpKSB8fFxuICAgIC8vIENoZWNrIGlmIGJvdGggbm9kZXMgaGF2ZSB0aGUgc2FtZSBjaGVja3N1bS5cbiAgICAoZ2V0Q2hlY2tTdW0oYSkgPT09IGdldENoZWNrU3VtKGIpKSB8fFxuICAgIC8vIEZhbGwgYmFjayB0byBuYXRpdmUgaXNFcXVhbE5vZGUgY2hlY2suXG4gICAgYS5pc0VxdWFsTm9kZShiKVxuICApXG59XG5cbi8qKlxuICogQHByaXZhdGVcbiAqIEBkZXNjcmlwdGlvblxuICogVXRpbGl0eSB0byB0cnkgdG8gcHVsbCBhIGNoZWNrc3VtIGF0dHJpYnV0ZSBmcm9tIGFuIGVsZW1lbnQuXG4gKiBVc2VzICdkYXRhLWNoZWNrc3VtJyBvciB1c2VyIHNwZWNpZmllZCBjaGVja3N1bSBwcm9wZXJ0eS5cbiAqXG4gKiBAcGFyYW0ge05vZGV9IG5vZGUgLSBUaGUgbm9kZSB0byBnZXQgdGhlIGNoZWNrc3VtIGZvci5cbiAqIEByZXR1cm4ge3N0cmluZ3xOYU59XG4gKi9cbmZ1bmN0aW9uIGdldENoZWNrU3VtIChub2RlKSB7XG4gIHJldHVybiBub2RlLmdldEF0dHJpYnV0ZShzZXRET00uQ0hFQ0tTVU0pIHx8IE5hTlxufVxuXG4vKipcbiAqIEBwcml2YXRlXG4gKiBAZGVzY3JpcHRpb25cbiAqIFV0aWxpdHkgdG8gdHJ5IHRvIGNoZWNrIGlmIGFuIGVsZW1lbnQgc2hvdWxkIGJlIGlnbm9yZWQgYnkgdGhlIGFsZ29yaXRobS5cbiAqIFVzZXMgJ2RhdGEtaWdub3JlJyBvciB1c2VyIHNwZWNpZmllZCBpZ25vcmUgcHJvcGVydHkuXG4gKlxuICogQHBhcmFtIHtOb2RlfSBub2RlIC0gVGhlIG5vZGUgdG8gY2hlY2sgaWYgaXQgc2hvdWxkIGJlIGlnbm9yZWQuXG4gKiBAcmV0dXJuIHtib29sZWFufVxuICovXG5mdW5jdGlvbiBpc0lnbm9yZWQgKG5vZGUpIHtcbiAgcmV0dXJuIG5vZGUuZ2V0QXR0cmlidXRlKHNldERPTS5JR05PUkUpICE9IG51bGxcbn1cblxuLyoqXG4gKiBEaXNwYXRjaGVzIGEgbW91bnQgZXZlbnQgZm9yIHRoZSBnaXZlbiBub2RlIGFuZCBjaGlsZHJlbi5cbiAqXG4gKiBAcGFyYW0ge05vZGV9IG5vZGUgLSB0aGUgbm9kZSB0byBtb3VudC5cbiAqIEByZXR1cm4ge25vZGV9XG4gKi9cbmZ1bmN0aW9uIG1vdW50IChub2RlKSB7XG4gIHJldHVybiBkaXNwYXRjaChub2RlLCAnbW91bnQnKVxufVxuXG4vKipcbiAqIERpc3BhdGNoZXMgYSBkaXNtb3VudCBldmVudCBmb3IgdGhlIGdpdmVuIG5vZGUgYW5kIGNoaWxkcmVuLlxuICpcbiAqIEBwYXJhbSB7Tm9kZX0gbm9kZSAtIHRoZSBub2RlIHRvIGRpc21vdW50LlxuICogQHJldHVybiB7bm9kZX1cbiAqL1xuZnVuY3Rpb24gZGlzbW91bnQgKG5vZGUpIHtcbiAgcmV0dXJuIGRpc3BhdGNoKG5vZGUsICdkaXNtb3VudCcpXG59XG5cbi8qKlxuICogUmVjdXJzaXZlbHkgdHJpZ2dlciBhbiBldmVudCBmb3IgYSBub2RlIGFuZCBpdCdzIGNoaWxkcmVuLlxuICogT25seSBlbWl0cyBldmVudHMgZm9yIGtleWVkIG5vZGVzLlxuICpcbiAqIEBwYXJhbSB7Tm9kZX0gbm9kZSAtIHRoZSBpbml0aWFsIG5vZGUuXG4gKiBAcmV0dXJuIHtOb2RlfVxuICovXG5mdW5jdGlvbiBkaXNwYXRjaCAobm9kZSwgdHlwZSkge1xuICAvLyBUcmlnZ2VyIGV2ZW50IGZvciB0aGlzIGVsZW1lbnQgaWYgaXQgaGFzIGEga2V5LlxuICBpZiAoZ2V0S2V5KG5vZGUpKSB7XG4gICAgdmFyIGV2ID0gZG9jdW1lbnQuY3JlYXRlRXZlbnQoJ0V2ZW50JylcbiAgICB2YXIgcHJvcCA9IHsgdmFsdWU6IG5vZGUgfVxuICAgIGV2LmluaXRFdmVudCh0eXBlLCBmYWxzZSwgZmFsc2UpXG4gICAgT2JqZWN0LmRlZmluZVByb3BlcnR5KGV2LCAndGFyZ2V0JywgcHJvcClcbiAgICBPYmplY3QuZGVmaW5lUHJvcGVydHkoZXYsICdzcmNFbGVtZW50JywgcHJvcClcbiAgICBub2RlLmRpc3BhdGNoRXZlbnQoZXYpXG4gIH1cblxuICAvLyBEaXNwYXRjaCB0byBhbGwgY2hpbGRyZW4uXG4gIHZhciBjaGlsZCA9IG5vZGUuZmlyc3RDaGlsZFxuICB3aGlsZSAoY2hpbGQpIGNoaWxkID0gZGlzcGF0Y2goY2hpbGQsIHR5cGUpLm5leHRTaWJsaW5nXG4gIHJldHVybiBub2RlXG59XG5cbi8qKlxuICogQHByaXZhdGVcbiAqIEBkZXNjcmlwdGlvblxuICogQ29uZmlybSB0aGF0IGEgdmFsdWUgaXMgdHJ1dGh5LCB0aHJvd3MgYW4gZXJyb3IgbWVzc2FnZSBvdGhlcndpc2UuXG4gKlxuICogQHBhcmFtIHsqfSB2YWwgLSB0aGUgdmFsIHRvIHRlc3QuXG4gKiBAcGFyYW0ge3N0cmluZ30gbXNnIC0gdGhlIGVycm9yIG1lc3NhZ2Ugb24gZmFpbHVyZS5cbiAqIEB0aHJvd3Mge0Vycm9yfVxuICovXG5mdW5jdGlvbiBhc3NlcnQgKHZhbCwgbXNnKSB7XG4gIGlmICghdmFsKSB0aHJvdyBuZXcgRXJyb3IoJ3NldC1kb206ICcgKyBtc2cpXG59XG4iLCIndXNlIHN0cmljdCdcbnZhciBwYXJzZXIgPSB3aW5kb3cuRE9NUGFyc2VyICYmIG5ldyB3aW5kb3cuRE9NUGFyc2VyKClcbnZhciBkb2N1bWVudFJvb3ROYW1lID0gJ0hUTUwnXG52YXIgc3VwcG9ydHNIVE1MVHlwZSA9IGZhbHNlXG52YXIgc3VwcG9ydHNJbm5lckhUTUwgPSBmYWxzZVxudmFyIGh0bWxUeXBlID0gJ3RleHQvaHRtbCdcbnZhciB4aHRtbFR5cGUgPSAnYXBwbGljYXRpb24veGh0bWwreG1sJ1xudmFyIHRlc3RDbGFzcyA9ICdBJ1xudmFyIHRlc3RDb2RlID0gJzx3YnIgY2xhc3M9XCInICsgdGVzdENsYXNzICsgJ1wiLz4nXG5cbnRyeSB7XG4gIC8vIENoZWNrIGlmIGJyb3dzZXIgc3VwcG9ydHMgdGV4dC9odG1sIERPTVBhcnNlclxuICB2YXIgcGFyc2VkID0gcGFyc2VyLnBhcnNlRnJvbVN0cmluZyh0ZXN0Q29kZSwgaHRtbFR5cGUpLmJvZHkuZmlyc3RDaGlsZFxuICAvLyBTb21lIGJyb3dzZXJzIChpT1MgOSBhbmQgU2FmYXJpIDkpIGxvd2VyY2FzZSBjbGFzc2VzIGZvciBwYXJzZWQgZWxlbWVudHNcbiAgLy8gYnV0IG9ubHkgd2hlbiBhcHBlbmRpbmcgdG8gRE9NLCBzbyB1c2UgaW5uZXJIVE1MIGluc3RlYWRcbiAgdmFyIGQgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdkaXYnKVxuICBkLmFwcGVuZENoaWxkKHBhcnNlZClcbiAgaWYgKGQuZmlyc3RDaGlsZC5jbGFzc0xpc3RbMF0gIT09IHRlc3RDbGFzcykgdGhyb3cgbmV3IEVycm9yKClcbiAgc3VwcG9ydHNIVE1MVHlwZSA9IHRydWVcbn0gY2F0Y2ggKGUpIHt9XG5cbnZhciBtb2NrRG9jID0gZG9jdW1lbnQuaW1wbGVtZW50YXRpb24uY3JlYXRlSFRNTERvY3VtZW50KCcnKVxudmFyIG1vY2tIVE1MID0gbW9ja0RvYy5kb2N1bWVudEVsZW1lbnRcbnZhciBtb2NrQm9keSA9IG1vY2tEb2MuYm9keVxudHJ5IHtcbiAgLy8gQ2hlY2sgaWYgYnJvd3NlciBzdXBwb3J0cyBkb2N1bWVudEVsZW1lbnQuaW5uZXJIVE1MXG4gIG1vY2tIVE1MLmlubmVySFRNTCArPSAnJ1xuICBzdXBwb3J0c0lubmVySFRNTCA9IHRydWVcbn0gY2F0Y2ggKGUpIHtcbiAgLy8gQ2hlY2sgaWYgYnJvd3NlciBzdXBwb3J0cyB4aHRtbCBwYXJzaW5nLlxuICBwYXJzZXIucGFyc2VGcm9tU3RyaW5nKHRlc3RDb2RlLCB4aHRtbFR5cGUpXG4gIHZhciBib2R5UmVnID0gLyg8Ym9keVtePl0qPikoW1xcc1xcU10qKTxcXC9ib2R5Pi9cbn1cblxuZnVuY3Rpb24gRE9NUGFyc2VyUGFyc2UgKG1hcmt1cCwgcm9vdE5hbWUpIHtcbiAgdmFyIGRvYyA9IHBhcnNlci5wYXJzZUZyb21TdHJpbmcobWFya3VwLCBodG1sVHlwZSlcbiAgLy8gUGF0Y2ggZm9yIGlPUyBVSVdlYlZpZXcgbm90IGFsd2F5cyByZXR1cm5pbmcgZG9jLmJvZHkgc3luY2hyb25vdXNseVxuICBpZiAoIWRvYy5ib2R5KSB7IHJldHVybiBmYWxsYmFja1BhcnNlKG1hcmt1cCwgcm9vdE5hbWUpIH1cblxuICByZXR1cm4gcm9vdE5hbWUgPT09IGRvY3VtZW50Um9vdE5hbWVcbiAgICA/IGRvYy5kb2N1bWVudEVsZW1lbnRcbiAgICA6IGRvYy5ib2R5LmZpcnN0Q2hpbGRcbn1cblxuZnVuY3Rpb24gZmFsbGJhY2tQYXJzZSAobWFya3VwLCByb290TmFtZSkge1xuICAvLyBGYWxsYmFjayB0byBpbm5lckhUTUwgZm9yIG90aGVyIG9sZGVyIGJyb3dzZXJzLlxuICBpZiAocm9vdE5hbWUgPT09IGRvY3VtZW50Um9vdE5hbWUpIHtcbiAgICBpZiAoc3VwcG9ydHNJbm5lckhUTUwpIHtcbiAgICAgIG1vY2tIVE1MLmlubmVySFRNTCA9IG1hcmt1cFxuICAgICAgcmV0dXJuIG1vY2tIVE1MXG4gICAgfSBlbHNlIHtcbiAgICAgIC8vIElFOSBkb2VzIG5vdCBzdXBwb3J0IGlubmVyaHRtbCBhdCByb290IGxldmVsLlxuICAgICAgLy8gV2UgZ2V0IGFyb3VuZCB0aGlzIGJ5IHBhcnNpbmcgZXZlcnl0aGluZyBleGNlcHQgdGhlIGJvZHkgYXMgeGh0bWwuXG4gICAgICB2YXIgYm9keU1hdGNoID0gbWFya3VwLm1hdGNoKGJvZHlSZWcpXG4gICAgICBpZiAoYm9keU1hdGNoKSB7XG4gICAgICAgIHZhciBib2R5Q29udGVudCA9IGJvZHlNYXRjaFsyXVxuICAgICAgICB2YXIgc3RhcnRCb2R5ID0gYm9keU1hdGNoLmluZGV4ICsgYm9keU1hdGNoWzFdLmxlbmd0aFxuICAgICAgICB2YXIgZW5kQm9keSA9IHN0YXJ0Qm9keSArIGJvZHlDb250ZW50Lmxlbmd0aFxuICAgICAgICBtYXJrdXAgPSBtYXJrdXAuc2xpY2UoMCwgc3RhcnRCb2R5KSArIG1hcmt1cC5zbGljZShlbmRCb2R5KVxuICAgICAgICBtb2NrQm9keS5pbm5lckhUTUwgPSBib2R5Q29udGVudFxuICAgICAgfVxuXG4gICAgICB2YXIgZG9jID0gcGFyc2VyLnBhcnNlRnJvbVN0cmluZyhtYXJrdXAsIHhodG1sVHlwZSlcbiAgICAgIHZhciBib2R5ID0gZG9jLmJvZHlcbiAgICAgIHdoaWxlIChtb2NrQm9keS5maXJzdENoaWxkKSBib2R5LmFwcGVuZENoaWxkKG1vY2tCb2R5LmZpcnN0Q2hpbGQpXG4gICAgICByZXR1cm4gZG9jLmRvY3VtZW50RWxlbWVudFxuICAgIH1cbiAgfSBlbHNlIHtcbiAgICBtb2NrQm9keS5pbm5lckhUTUwgPSBtYXJrdXBcbiAgICByZXR1cm4gbW9ja0JvZHkuZmlyc3RDaGlsZFxuICB9XG59XG5cbi8qKlxuICogUmV0dXJucyB0aGUgcmVzdWx0cyBvZiBhIERPTVBhcnNlciBhcyBhbiBIVE1MRWxlbWVudC5cbiAqIChTaGltcyBmb3Igb2xkZXIgYnJvd3NlcnMpLlxuICovXG5tb2R1bGUuZXhwb3J0cyA9IHN1cHBvcnRzSFRNTFR5cGVcbiAgPyBET01QYXJzZXJQYXJzZVxuICA6IGZhbGxiYWNrUGFyc2VcbiIsImNvbnN0IEtlZXQgPSByZXF1aXJlKCcuLi9rZWV0JylcclxuY29uc3QgeyBjYW1lbENhc2UsIGh0bWwgfSA9IHJlcXVpcmUoJy4vdXRpbCcpXHJcbmNvbnN0IGNyZWF0ZVRvZG9Nb2RlbCA9IHJlcXVpcmUoJy4vdG9kb01vZGVsJylcclxuY29uc3QgdG9kb0FwcCA9IHJlcXVpcmUoJy4vdG9kbycpXHJcbmNvbnN0IGZpbHRlclBhZ2UgPSBbJ2FsbCcsICdhY3RpdmUnLCAnY29tcGxldGVkJ11cclxuXHJcbmNsYXNzIEFwcCBleHRlbmRzIEtlZXQge1xyXG5cclxuICBtb2RlbCA9IGNyZWF0ZVRvZG9Nb2RlbCh0b2RvQXBwKVxyXG4gIHBhZ2UgPSAnQWxsJ1xyXG4gIGlzQ2hlY2tlZCA9ICcnXHJcbiAgY291bnQgPSAwXHJcbiAgcGx1cmFsID0gJydcclxuICBjbGVhclRvZ2dsZSA9ICdub25lJ1xyXG5cclxuICBjb21wb25lbnRXaWxsTW91bnQoKSB7XHJcbiAgICBmaWx0ZXJQYWdlLm1hcChmID0+IHRoaXNbYGNfJHtmfWBdID0gJycpXHJcbiAgICB0aGlzLm1vZGVsLnN1YnNjcmliZSggc3RvcmUgPT4ge1xyXG4gICAgICBsZXQgYyA9IHN0b3JlLmZpbHRlcihjID0+ICFjLmNvbXBsZXRlZClcclxuICAgICAgdGhpcy50b2RvU3RhdGUgPSBzdG9yZS5sZW5ndGggPyB0cnVlIDogZmFsc2VcclxuICAgICAgdGhpcy5wbHVyYWwgPSBjLmxlbmd0aCA9PT0gMSA/ICcnIDogJ3MnXHJcbiAgICAgIHRoaXMuY291bnQgPSBjLmxlbmd0aFxyXG4gICAgfSlcclxuICB9XHJcbiAgY29tcG9uZW50RGlkTW91bnQoKXtcclxuICAgIGlmICh3aW5kb3cubG9jYXRpb24uaGFzaCA9PSAnJykge1xyXG4gICAgICB0aGlzLnVwZGF0ZVVybCgnIy9hbGwnKVxyXG4gICAgICB3aW5kb3cuaGlzdG9yeS5wdXNoU3RhdGUoe30sIG51bGwsICcjL2FsbCcpXHJcbiAgICB9XHJcbiAgICB3aW5kb3cub25wb3BzdGF0ZSA9ICgpID0+IHRoaXMudXBkYXRlVXJsKHdpbmRvdy5sb2NhdGlvbi5oYXNoKVxyXG4gIH1cclxuXHJcbiAgdXBkYXRlVXJsKGhhc2gpIHtcclxuICAgIGZpbHRlclBhZ2UubWFwKGYgPT4ge1xyXG4gICAgICB0aGlzW2BjXyR7Zn1gXSA9IGhhc2guc3BsaXQoJyMvJylbMV0gPT09IGYgPyAnc2VsZWN0ZWQnIDogJydcclxuICAgICAgaWYoaGFzaC5zcGxpdCgnIy8nKVsxXSA9PT0gZikgdGhpcy5wYWdlID0gZi5uYW1lXHJcbiAgICB9KVxyXG4gIH1cclxuXHJcbiAgY3JlYXRlIChldnQpIHtcclxuICAgIGlmKGV2dC5rZXlDb2RlICE9PSAxMykgcmV0dXJuXHJcbiAgICB0aGlzLm1vZGVsLmFkZFRvZG8oZXZ0LnRhcmdldC52YWx1ZS50cmltKCkpXHJcbiAgICBldnQudGFyZ2V0LnZhbHVlID0gXCJcIlxyXG4gIH1cclxuXHJcbiAgY29tcGxldGVBbGwoKXtcclxuICAgIHRoaXMuaXNDaGVja2VkID0gdGhpcy5pc0NoZWNrZWQgPT09ICcnID8gJ2NoZWNrZWQnIDogJydcclxuICAgIGNvbnNvbGUubG9nKHRoaXMuaXNDaGVja2VkKVxyXG4gICAgdGhpcy5tb2RlbC50b2dnbGVBbGwodGhpcy5pc0NoZWNrZWQgPT09ICcnID8gJycgOiAnY29tcGxldGVkJylcclxuICB9XHJcblxyXG4gIGNsZWFyQ29tcGxldGVkKCl7XHJcblxyXG4gIH1cclxufVxyXG5cclxuY29uc3QgYXBwID0gbmV3IEFwcCgpXHJcblxyXG5sZXQgZmlsdGVyc1RtcGwgPSAnJ1xyXG5cclxuY29uc3QgZmlsdGVycyA9IHBhZ2UgPT4ge1xyXG4gIGxldCBmID0ge1xyXG4gICAgY2xhc3NOYW1lOiBge3tjXyR7cGFnZX19fWAsXHJcbiAgICBoYXNoOiAnIy8nICsgcGFnZSxcclxuICAgIG5hbWU6IGNhbWVsQ2FzZShwYWdlKVxyXG4gIH1cclxuICBmaWx0ZXJzVG1wbCArPSBodG1sYDxsaSBrLWNsaWNrPVwidXBkYXRlVXJsKCR7Zi5oYXNofSlcIj48YSBjbGFzcz1cIiR7Zi5jbGFzc05hbWV9XCIgaHJlZj1cIiR7Zi5oYXNofVwiPiR7Zi5uYW1lfTwvYT48L2xpPmBcclxufVxyXG5cclxuZmlsdGVyUGFnZS5tYXAocGFnZSA9PiBmaWx0ZXJzKHBhZ2UpKVxyXG5cclxuY29uc3Qgdm1vZGVsID0gaHRtbGBcclxuICA8c2VjdGlvbiBpZD1cInRvZG9hcHBcIj5cclxuICAgIDxoZWFkZXIgaWQ9XCJoZWFkZXJcIj5cclxuICAgICAgPGgxPnRvZG9zPC9oMT5cclxuICAgICAgPGlucHV0IGlkPVwibmV3LXRvZG9cIiBrLWtleWRvd249XCJjcmVhdGUoKVwiIHBsYWNlaG9sZGVyPVwiV2hhdCBuZWVkcyB0byBiZSBkb25lP1wiIGF1dG9mb2N1cz5cclxuICAgIDwvaGVhZGVyPlxyXG4gICAge3s/dG9kb1N0YXRlfX1cclxuICAgIDxzZWN0aW9uIGlkPVwibWFpblwiPlxyXG4gICAgICA8aW5wdXQgaWQ9XCJ0b2dnbGUtYWxsXCIgdHlwZT1cImNoZWNrYm94XCIge3tpc0NoZWNrZWR9fSBrLWNsaWNrPVwiY29tcGxldGVBbGwoKVwiPlxyXG4gICAgICA8bGFiZWwgZm9yPVwidG9nZ2xlLWFsbFwiPk1hcmsgYWxsIGFzIGNvbXBsZXRlPC9sYWJlbD5cclxuICAgICAgPHVsIGlkPVwidG9kby1saXN0XCIgZGF0YS1pZ25vcmU+PC91bD5cclxuICAgIDwvc2VjdGlvbj5cclxuICAgIDxmb290ZXIgaWQ9XCJmb290ZXJcIj5cclxuICAgICAgPHNwYW4gaWQ9XCJ0b2RvLWNvdW50XCI+XHJcbiAgICAgICAgPHN0cm9uZz57e2NvdW50fX08L3N0cm9uZz4gaXRlbXt7cGx1cmFsfX0gbGVmdFxyXG4gICAgICA8L3NwYW4+XHJcbiAgICAgIDx1bCBpZD1cImZpbHRlcnNcIj5cclxuICAgICAgICAke2ZpbHRlcnNUbXBsfVxyXG4gICAgICA8L3VsPlxyXG4gICAgICA8YnV0dG9uIGlkPVwiY2xlYXItY29tcGxldGVkXCIgc3R5bGU9XCJkaXNwbGF5OiB7e2NsZWFyVG9nZ2xlfX1cIiBrLWNsaWNrZWQ9XCJjbGVhckNvbXBsZXRlZCgpXCI+Q2xlYXIgY29tcGxldGVkPC9idXR0b24+XHJcbiAgICA8L2Zvb3Rlcj5cclxuICAgIHt7L3RvZG9TdGF0ZX19XHJcbiAgPC9zZWN0aW9uPlxyXG4gIDxmb290ZXIgaWQ9XCJpbmZvXCI+XHJcbiAgICA8cD5Eb3VibGUtY2xpY2sgdG8gZWRpdCBhIHRvZG88L3A+XHJcbiAgICA8cD5DcmVhdGVkIGJ5IDxhIGhyZWY9XCJodHRwczovL2dpdGh1Yi5jb20vc3lhcnVsXCI+U2hhaHJ1bCBOaXphbSBTZWxhbWF0PC9hPjwvcD5cclxuICAgIDxwPlBhcnQgb2YgPGEgaHJlZj1cImh0dHA6Ly90b2RvbXZjLmNvbVwiPlRvZG9NVkM8L2E+PC9wPlxyXG4gIDwvZm9vdGVyPmBcclxuXHJcbmFwcC5tb3VudCh2bW9kZWwpLmxpbmsoJ3RvZG8nKVxyXG4iLCJjb25zdCBLZWV0ID0gcmVxdWlyZSgnLi4va2VldCcpXHJcbmNvbnN0IHsgc3RvcmUsIGluZm9ybSwgZ2VuSWQsIGh0bWwgfSA9IHJlcXVpcmUoJy4vdXRpbCcpXHJcblxyXG5jb25zdCBsb2cgPSBjb25zb2xlLmxvZy5iaW5kKGNvbnNvbGUpXHJcblxyXG5jbGFzcyBUb2RvQXBwIGV4dGVuZHMgS2VldCB7XHJcbiAgXHJcbiAgYXJncyA9IFtdLnNsaWNlLmNhbGwoYXJndW1lbnRzKVxyXG4gIFxyXG4gIGVsID0gJ3RvZG8tbGlzdCdcclxuXHJcbiAgb25DaGFuZ2VzID0gW11cclxuXHJcbiAgZWRpdE1vZGUoaWQpIHtcclxuICAgIC8vIEFwcC5lZGl0VG9kb3MoaWQsIHRoaXMpXHJcbiAgfVxyXG4gIHRvZG9EZXN0cm95KGlkLCBldnQpIHtcclxuICAgIC8vIHRoaXMuZGVzdHJveShpZCwgJ2tlZXQtaWQnLCBldnQudGFyZ2V0LnBhcmVudE5vZGUucGFyZW50Tm9kZSlcclxuICAgIC8vIEFwcC50b2RvRGVzdHJveSgpXHJcbiAgfVxyXG4gIGNvbXBsZXRlVG9kbyhpZCwgZXZ0KSB7XHJcbiAgICAvLyBBcHAudG9kb0NoZWNrKGlkLCAna2VldC1pZCcsIGV2dC50YXJnZXQucGFyZW50Tm9kZS5wYXJlbnROb2RlKVxyXG4gIH1cclxuICAvLyBhZGRUb2RvICh0aXRsZSkge1xyXG4gIC8vICAgdGhpcy5hZGQoe1xyXG4gIC8vICAgICBpZDogZ2VuSWQoKSxcclxuICAvLyAgICAgdGl0bGUsXHJcbiAgLy8gICAgIGNvbXBsZXRlZDogZmFsc2VcclxuICAvLyAgIH0pXHJcbiAgLy8gICBpbmZvcm0obWFpbiwgdGhpcy5iYXNlLm1vZGVsKVxyXG4gIC8vIH1cclxuICAvLyBzdWJzY3JpYmUoc3RhY2spIHtcclxuICAvLyAgIHRoaXMub25DaGFuZ2VzLnB1c2goc3RhY2spXHJcbiAgLy8gfVxyXG59XHJcblxyXG5jb25zdCB0b2RvQXBwID0gbmV3IFRvZG9BcHAoJ2NoZWNrZWQnKVxyXG5cclxuY29uc3Qgdm1vZGVsID0ge1xyXG4gIHRlbXBsYXRlOiBodG1sYFxyXG5cdDxsaSBrLWRibGNsaWNrPVwiZWRpdE1vZGUoe3trZWV0LWlkfX0pXCIgY2xhc3M9XCJ7e2NvbXBsZXRlZH19XCI+XHJcblx0XHQ8ZGl2IGNsYXNzPVwidmlld1wiPjxpbnB1dCBrLWNsaWNrPVwiY29tcGxldGVUb2RvKHt7a2VldC1pZH19KVwiIGNsYXNzPVwidG9nZ2xlXCIgdHlwZT1cImNoZWNrYm94XCIgY2hlY2tlZD1cInt7Y2hlY2tlZH19XCI+XHJcblx0XHRcdDxsYWJlbD57e3RpdGxlfX08L2xhYmVsPlxyXG5cdFx0XHQ8YnV0dG9uIGstY2xpY2s9XCJ0b2RvRGVzdHJveSh7e2tlZXQtaWR9fSlcIiBjbGFzcz1cImRlc3Ryb3lcIj48L2J1dHRvbj5cclxuXHRcdDwvZGl2PlxyXG5cdFx0PGlucHV0IGNsYXNzPVwiZWRpdFwiIHZhbHVlPVwie3t0aXRsZX19XCI+XHJcblx0PC9saT5gLFxyXG4gIG1vZGVsOiBzdG9yZSgndG9kb3Mta2VldGpzJylcclxufVxyXG5cclxudG9kb0FwcC5tb3VudCh2bW9kZWwpXHJcblxyXG5tb2R1bGUuZXhwb3J0cyA9IHRvZG9BcHBcclxuXHJcbi8vIG1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24oYXBwKSB7XHJcbi8vICAgbWFpbiA9IGFwcFxyXG4vLyAgIHRvZG9BcHAubW91bnQodm1vZGVsKVxyXG4vLyAgIHJldHVybiB0b2RvQXBwXHJcbi8vIH0iLCJcclxuY29uc3QgeyBzdG9yZSB9ID0gcmVxdWlyZSgnLi91dGlsJylcclxuXHJcbi8vIG5vdGU6IGNvcHkgd2l0aCBtb2RpZmljYXRpb24gZnJvbSBwcmVhY3QtdG9kb212Y1xyXG5cclxubW9kdWxlLmV4cG9ydHMgPSB0b2RvID0+IHtcclxuXHJcbiAgbGV0IG9uQ2hhbmdlcyA9IFtdXHJcblxyXG4gIGZ1bmN0aW9uIGluZm9ybSAoKSB7XHJcbiAgICBmb3IgKGxldCBpID0gb25DaGFuZ2VzLmxlbmd0aDsgaS0tOykge1xyXG4gICAgICBvbkNoYW5nZXNbaV0odGhpcy5iYXNlLm1vZGVsKVxyXG4gICAgfVxyXG4gIH1cclxuXHJcbiAgbGV0IG1vZGVsID0ge1xyXG5cclxuICAgIHN1YnNjcmliZSAoZm4pIHtcclxuICAgICAgb25DaGFuZ2VzLnB1c2goZm4pXHJcbiAgICB9LFxyXG5cclxuICAgIGFkZFRvZG8gKHRpdGxlKSB7XHJcbiAgICAgIGxldCBtID0ge1xyXG4gICAgICAgIHRpdGxlLFxyXG4gICAgICAgIGNvbXBsZXRlZDogJydcclxuICAgICAgfVxyXG4gICAgICB0b2RvLmFkZChtLCBpbmZvcm0pXHJcbiAgICB9LFxyXG5cclxuICAgIHRvZ2dsZUFsbChjb21wbGV0ZWQpIHtcclxuICAgICAgdG9kby5iYXNlLm1vZGVsLm1hcChtID0+IHtcclxuICAgICAgICBjb25zb2xlLmxvZyhtKVxyXG4gICAgICAgIHRvZG8udXBkYXRlKG1bJ2tlZXQtaWQnXSwgJ2tlZXQtaWQnLCB7IFxyXG4gICAgICAgICAgY29tcGxldGVkOiBjb21wbGV0ZWQsIFxyXG4gICAgICAgICAgY2hlY2tlZDogY29tcGxldGVkID09PSAnY29tcGxldGVkJyA/ICdjaGVja2VkJyA6ICcnXHJcbiAgICAgICAgfSlcclxuICAgICAgfSlcclxuICAgICAgY29uc29sZS5sb2codG9kbylcclxuICAgICAgaW5mb3JtLmNhbGwodG9kbylcclxuICAgICAgLy8gdG9kby5iYXNlLm1vZGVsID0gbW9kZWwudG9kb3MubWFwKFxyXG4gICAgICAvLyAgIHRvZG8gPT4gKHsgLi4udG9kbywgY29tcGxldGVkIH0pXHJcbiAgICAgIC8vICk7XHJcbiAgICAgIC8vIGluZm9ybSgpO1xyXG4gICAgfSxcclxuICAgIFxyXG4gICAgdG9nZ2xlKHRvZG9Ub1RvZ2dsZSkge1xyXG4gICAgICAvLyBtb2RlbC50b2RvcyA9IG1vZGVsLnRvZG9zLm1hcCggdG9kbyA9PiAoXHJcbiAgICAgIC8vICAgdG9kbyAhPT0gdG9kb1RvVG9nZ2xlID8gdG9kbyA6ICh7IC4uLnRvZG8sIGNvbXBsZXRlZDogIXRvZG8uY29tcGxldGVkIH0pXHJcbiAgICAgIC8vICkgKTtcclxuICAgICAgLy8gaW5mb3JtKCk7XHJcbiAgICB9LFxyXG4gICAgLypcclxuICAgIGRlc3Ryb3kodG9kbykge1xyXG4gICAgICBtb2RlbC50b2RvcyA9IG1vZGVsLnRvZG9zLmZpbHRlciggdCA9PiB0ICE9PSB0b2RvICk7XHJcbiAgICAgIGluZm9ybSgpO1xyXG4gICAgfSxcclxuXHJcbiAgICBzYXZlKHRvZG9Ub1NhdmUsIHRpdGxlKSB7XHJcbiAgICAgIG1vZGVsLnRvZG9zID0gbW9kZWwudG9kb3MubWFwKCB0b2RvID0+IChcclxuICAgICAgICB0b2RvICE9PSB0b2RvVG9TYXZlID8gdG9kbyA6ICh7IC4uLnRvZG8sIHRpdGxlIH0pXHJcbiAgICAgICkpO1xyXG4gICAgICBpbmZvcm0oKTtcclxuICAgIH0sXHJcblxyXG4gICAgY2xlYXJDb21wbGV0ZWQoKSB7XHJcbiAgICAgIG1vZGVsLnRvZG9zID0gbW9kZWwudG9kb3MuZmlsdGVyKCB0b2RvID0+ICF0b2RvLmNvbXBsZXRlZCApO1xyXG4gICAgICBpbmZvcm0oKTtcclxuICAgIH0gKi9cclxuICB9XHJcblxyXG4gIHJldHVybiBtb2RlbFxyXG59XHJcbiIsImV4cG9ydHMuaW5mb3JtID0gZnVuY3Rpb24oYmFzZSwgaW5wdXQpIHtcclxuICBmb3IgKHZhciBpID0gYmFzZS5vbkNoYW5nZXMubGVuZ3RoOyBpLS07KSB7XHJcbiAgICBiYXNlLm9uQ2hhbmdlc1tpXShpbnB1dClcclxuICB9XHJcbn1cclxuXHJcbmV4cG9ydHMuc3RvcmUgPSBmdW5jdGlvbihuYW1lc3BhY2UsIGRhdGEpIHtcclxuICBpZiAoYXJndW1lbnRzLmxlbmd0aCA+IDEpIHtcclxuICAgIHJldHVybiBsb2NhbFN0b3JhZ2Uuc2V0SXRlbShuYW1lc3BhY2UsIEpTT04uc3RyaW5naWZ5KGRhdGEpKVxyXG4gIH0gZWxzZSB7XHJcbiAgICB2YXIgc3RvcmUgPSBsb2NhbFN0b3JhZ2UuZ2V0SXRlbShuYW1lc3BhY2UpXHJcbiAgICByZXR1cm4gc3RvcmUgJiYgSlNPTi5wYXJzZShzdG9yZSkgfHwgW11cclxuICB9XHJcbn1cclxuXHJcbmV4cG9ydHMuY2FtZWxDYXNlID0gZnVuY3Rpb24ocykge1xyXG4gIHJldHVybiBzLmNoYXJBdCgwKS50b1VwcGVyQ2FzZSgpICsgcy5zbGljZSgxKVxyXG59XHJcblxyXG5leHBvcnRzLmdlbklkID0gZnVuY3Rpb24oKSB7XHJcbiAgcmV0dXJuIChNYXRoLnJvdW5kKE1hdGgucmFuZG9tKCkgKiAweDEqMWUxMikpLnRvU3RyaW5nKDMyKVxyXG59XHJcblxyXG5leHBvcnRzLmdldElkID0gZnVuY3Rpb24gKGlkKSB7XHJcbiAgcmV0dXJuIGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKGlkKVxyXG59XHJcblxyXG5leHBvcnRzLmh0bWwgPSBmdW5jdGlvbiAobGl0ZXJhbFNlY3Rpb25zLCAuLi5zdWJzdHMpIHtcclxuICAvLyBVc2UgcmF3IGxpdGVyYWwgc2VjdGlvbnM6IHdlIGRvbuKAmXQgd2FudFxyXG4gIC8vIGJhY2tzbGFzaGVzIChcXG4gZXRjLikgdG8gYmUgaW50ZXJwcmV0ZWRcclxuICBsZXQgcmF3ID0gbGl0ZXJhbFNlY3Rpb25zLnJhdztcclxuXHJcbiAgbGV0IHJlc3VsdCA9ICcnO1xyXG5cclxuICBzdWJzdHMuZm9yRWFjaCgoc3Vic3QsIGkpID0+IHtcclxuICAgICAgLy8gUmV0cmlldmUgdGhlIGxpdGVyYWwgc2VjdGlvbiBwcmVjZWRpbmdcclxuICAgICAgLy8gdGhlIGN1cnJlbnQgc3Vic3RpdHV0aW9uXHJcbiAgICAgIGxldCBsaXQgPSByYXdbaV07XHJcblxyXG4gICAgICAvLyBJbiB0aGUgZXhhbXBsZSwgbWFwKCkgcmV0dXJucyBhbiBhcnJheTpcclxuICAgICAgLy8gSWYgc3Vic3RpdHV0aW9uIGlzIGFuIGFycmF5IChhbmQgbm90IGEgc3RyaW5nKSxcclxuICAgICAgLy8gd2UgdHVybiBpdCBpbnRvIGEgc3RyaW5nXHJcbiAgICAgIGlmIChBcnJheS5pc0FycmF5KHN1YnN0KSkge1xyXG4gICAgICAgICAgc3Vic3QgPSBzdWJzdC5qb2luKCcnKTtcclxuICAgICAgfVxyXG5cclxuICAgICAgLy8gSWYgdGhlIHN1YnN0aXR1dGlvbiBpcyBwcmVjZWRlZCBieSBhIGRvbGxhciBzaWduLFxyXG4gICAgICAvLyB3ZSBlc2NhcGUgc3BlY2lhbCBjaGFyYWN0ZXJzIGluIGl0XHJcbiAgICAgIGlmIChsaXQuZW5kc1dpdGgoJyQnKSkge1xyXG4gICAgICAgICAgc3Vic3QgPSBodG1sRXNjYXBlKHN1YnN0KTtcclxuICAgICAgICAgIGxpdCA9IGxpdC5zbGljZSgwLCAtMSk7XHJcbiAgICAgIH1cclxuICAgICAgcmVzdWx0ICs9IGxpdDtcclxuICAgICAgcmVzdWx0ICs9IHN1YnN0O1xyXG4gIH0pO1xyXG4gIC8vIFRha2UgY2FyZSBvZiBsYXN0IGxpdGVyYWwgc2VjdGlvblxyXG4gIC8vIChOZXZlciBmYWlscywgYmVjYXVzZSBhbiBlbXB0eSB0ZW1wbGF0ZSBzdHJpbmdcclxuICAvLyBwcm9kdWNlcyBvbmUgbGl0ZXJhbCBzZWN0aW9uLCBhbiBlbXB0eSBzdHJpbmcpXHJcbiAgcmVzdWx0ICs9IHJhd1tyYXcubGVuZ3RoLTFdOyAvLyAoQSlcclxuXHJcbiAgcmV0dXJuIHJlc3VsdDtcclxufSJdfQ==
