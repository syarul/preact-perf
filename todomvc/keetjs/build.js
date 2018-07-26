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
  batchPool.status = 'ready'
}

// batch pool update states to DOM
var batchPool = {
  ttl: null,
  status: 'ready'
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

          // if(batchPool.status === 'pooling'){
          //   return
          // } else {

          //   batchPool.status = 'pooling'

          //   clearTimeout(batchPool.ttl)

          //   batchPool.ttl = setTimeout(function(){
              updateContext.apply(self, args)
          //   }, 0)
          // }
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

},{"./copy":1,"./nodesVisibility":4,"./processEvent":6,"./strInterpreter":7,"./tag":8,"./tmplAttrHandler":10,"./tmplClassHandler":11,"./tmplHandler":12,"./tmplStylesHandler":13,"./utils":14,"hash-sum":16,"set-dom":17}],3:[function(require,module,exports){
var processEvent = require('./processEvent')
var ternaryOps = require('./ternaryOps')
var testEvent = require('./utils').testEvent
var tmpl = ''

module.exports = function (obj) {
  var args = this.args
  var arrProps = this.base.template.match(/{{([^{}]+)}}/g)
  var tempDiv
  var rep
  tmpl = this.base.template
  for(var i=0, len = arrProps.length;i<len;i++){
    rep = arrProps[i].replace(/{{([^{}]+)}}/g, '$1')
    var isTernary = ternaryOps.call(obj, rep)
    if(isTernary){
      tmpl = tmpl.replace('{{'+rep+'}}', isTernary.value)
    } else {
      tmpl = tmpl.replace('{{'+rep+'}}', obj[rep])
    }
    if (args && ~args.indexOf(rep) && !obj[rep]) {
      var re = new RegExp(' ' + rep + '="' + obj[rep] + '"', 'g')
      tmpl = tmpl.replace(re, '')
    }
  }
  tempDiv = document.createElement('div')
  tempDiv.innerHTML = tmpl
  testEvent(tmpl) && processEvent.call(this, tempDiv)
  tempDiv.childNodes[0].setAttribute('keet-id', obj['keet-id'])
  return tempDiv.childNodes[0]
}

},{"./processEvent":6,"./ternaryOps":9,"./utils":14}],4:[function(require,module,exports){
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
var testEvent = require('./utils').testEvent
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
    testEvent(tpl) && processEvent.call(this, tempDiv)
    tempDiv.childNodes.forEach(function (c) {
      if (c.nodeType === 1) {
        c.setAttribute('data-checksum', sum(c.outerHTML))
      }
      elemArr.push(c)
    })
  }

  return elemArr
}

},{"./genElement":2,"./genTemplate":3,"./nodesVisibility":4,"./processEvent":6,"./tmplHandler":12,"./utils":14,"hash-sum":16}],6:[function(require,module,exports){
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

},{"./utils":14}],7:[function(require,module,exports){
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
// function to resolve ternary operation

function test(str){
  if(str === '\'\'' || str === '\"\"')
    return ''
  return str
}

module.exports = function(input) {
  if(input.match(/([^?]*)\?([^:]*):([^;]*)|(\s*=\s*)[^;]*/g)){
    var t = input.split('?')
    var condition = t[0]
    var leftHand = t[1].split(':')[0]
    var rightHand = t[1].split(':')[1]

    // check the condition fulfillment
    if(this[condition])
      return { 
        value:test(leftHand),
        state: condition
      }
    else
      return { 
        value:test(rightHand),
        state: condition
      }
  } else return false
}
},{}],10:[function(require,module,exports){
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

},{"./genElement":2}],11:[function(require,module,exports){
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

},{}],12:[function(require,module,exports){
var strInterpreter = require('./strInterpreter')
var ternaryOps = require('./ternaryOps')

module.exports = function (str, updateStateList) {
  var self = this
  var arrProps = str.match(/{{([^{}]+)}}/g)
  if (arrProps && arrProps.length) {
    arrProps.map(function (s) {
      var rep = s.replace(/{{([^{}]+)}}/g, '$1')
      var isObjectNotation = strInterpreter(rep)
      var isTernary = ternaryOps.call(self, rep)
      if (!isObjectNotation) {
        if (self[rep] !== undefined) {
          updateStateList(rep)
          str = str.replace('{{'+rep+'}}', self[rep])
        } else if(isTernary){
          updateStateList(isTernary.state)
          str = str.replace('{{'+rep+'}}', isTernary.value)
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


},{"./strInterpreter":7,"./ternaryOps":9}],13:[function(require,module,exports){
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

},{"./copy":1}],14:[function(require,module,exports){
var getId = function (id) {
  return document.getElementById(id)
}

exports.getId = getId

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

exports.checkNodeAvailability = function(obj, genTemplate, callback) {
  var ele
  var checked = false
  var id = this.el
  var self = this
  var t = setInterval(function() {
    ele = getId(id)
    if (ele) {
      clearInterval(t)
      checked = true
      callback.call(self, ele, obj, genTemplate)
    }
  }, 0)
  setTimeout(function() {
    if (!checked) {
      clearInterval(t)
      throw new Error('Unable to find html entity with id ' + id + '.')
    }
  }, 500)
}

exports.available = function(ele, obj, genTemplate){
  ele.appendChild(genTemplate.call(this, obj))
}

exports.fn = function(f) {
 return typeof f === 'function'
}

exports.testEvent = function(tmpl) {
  return / k-/.test(tmpl)
}
},{}],15:[function(require,module,exports){
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
var fn = require('./components/utils').fn
var checkNodeAvailability = require('./components/utils').checkNodeAvailability
var available = require('./components/utils').available
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
  var ele = getId(this.el)
  obj['keet-id'] = genId()
  this.base.model = this.base.model.concat(obj)
  // if interceptor is declared execute it before node update
  interceptor && fn(interceptor) && interceptor.call(this)
  // update the node, if it not avaialbe we keep checking the availabilty for a time
  ele && ele.appendChild(genTemplate.call(this, obj)) || checkNodeAvailability.call(this, obj, genTemplate, available)
}

Keet.prototype.destroy = function (id, attr, interceptor) {
  // Method to destroy a submodel of a component
  var self = this
  this.base.model = this.base.model.filter(function (obj, index) {
    if (id === obj[attr]) {
      var node = selector(obj['keet-id'])
      if (node) { 
        // if interceptor is declared execute it before node update
        interceptor && fn(interceptor) && interceptor.call(self)
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
        interceptor && fn(interceptor) && interceptor.call(self)
        setDOM(node, genTemplate.call(self, obj))
      }
    }
    return obj
  })
}

module.exports = Keet

},{"./components/genTemplate":3,"./components/parseStr":5,"./components/utils":14,"set-dom":17}],16:[function(require,module,exports){
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

},{}],17:[function(require,module,exports){
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

},{"./parse-html":18}],18:[function(require,module,exports){
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

},{}],19:[function(require,module,exports){
'use strict';

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _templateObject = _taggedTemplateLiteral(['\n  <section id="todoapp">\n    <header id="header">\n      <h1>todos</h1>\n      <input id="new-todo" k-keydown="create()" placeholder="What needs to be done?" autofocus>\n    </header>\n    {{?todoState}}\n    <section id="main">\n      <input id="toggle-all" type="checkbox" {{isChecked?checked:\'\'}} k-click="completeAll()">\n      <label for="toggle-all">Mark all as complete</label>\n      <ul id="todo-list" data-ignore></ul>\n    </section>\n    <footer id="footer">\n      <span id="todo-count">\n        <strong>{{count}}</strong> item{{plural}} left\n      </span>\n      <ul id="filters">\n        ', '\n      </ul>\n      {{?clearToggle}}\n      <button id="clear-completed" k-clicked="clearCompleted()">Clear completed</button>\n      {{/clearToggle}}\n    </footer>\n    {{/todoState}}\n  </section>\n  <footer id="info">\n    <p>Double-click to edit a todo</p>\n    <p>Created by <a href="https://github.com/syarul">Shahrul Nizam Selamat</a></p>\n    <p>Part of <a href="http://todomvc.com">TodoMVC</a></p>\n  </footer>'], ['\n  <section id="todoapp">\n    <header id="header">\n      <h1>todos</h1>\n      <input id="new-todo" k-keydown="create()" placeholder="What needs to be done?" autofocus>\n    </header>\n    {{?todoState}}\n    <section id="main">\n      <input id="toggle-all" type="checkbox" {{isChecked?checked:\'\'}} k-click="completeAll()">\n      <label for="toggle-all">Mark all as complete</label>\n      <ul id="todo-list" data-ignore></ul>\n    </section>\n    <footer id="footer">\n      <span id="todo-count">\n        <strong>{{count}}</strong> item{{plural}} left\n      </span>\n      <ul id="filters">\n        ', '\n      </ul>\n      {{?clearToggle}}\n      <button id="clear-completed" k-clicked="clearCompleted()">Clear completed</button>\n      {{/clearToggle}}\n    </footer>\n    {{/todoState}}\n  </section>\n  <footer id="info">\n    <p>Double-click to edit a todo</p>\n    <p>Created by <a href="https://github.com/syarul">Shahrul Nizam Selamat</a></p>\n    <p>Part of <a href="http://todomvc.com">TodoMVC</a></p>\n  </footer>']);

function _taggedTemplateLiteral(strings, raw) { return Object.freeze(Object.defineProperties(strings, { raw: { value: Object.freeze(raw) } })); }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var Keet = require('../keet');

var _require = require('./util'),
    camelCase = _require.camelCase,
    html = _require.html;

var todoApp = require('./todo');
var filterPage = ['all', 'active', 'completed'];
var filtersTmpl = require('./filters')(filterPage);

var App = function (_Keet) {
  _inherits(App, _Keet);

  function App() {
    var _ref;

    var _temp, _this, _ret;

    _classCallCheck(this, App);

    for (var _len = arguments.length, args = Array(_len), _key = 0; _key < _len; _key++) {
      args[_key] = arguments[_key];
    }

    return _ret = (_temp = (_this = _possibleConstructorReturn(this, (_ref = App.__proto__ || Object.getPrototypeOf(App)).call.apply(_ref, [this].concat(args))), _this), _this.page = 'All', _this.isChecked = false, _this.count = 0, _this.plural = '', _this.clearToggle = false, _temp), _possibleConstructorReturn(_this, _ret);
  }

  _createClass(App, [{
    key: 'componentWillMount',
    value: function componentWillMount() {
      var _this2 = this;

      filterPage.map(function (f) {
        return _this2['page' + camelCase(f)] = '';
      });
      todoApp.subscribe(function (store) {
        var c = store.filter(function (c) {
          return !c.completed;
        });
        var cc = store.filter(function (c) {
          return c.completed;
        });
        _this2.clearToggle = cc.length ? true : false;
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
      todoApp.addTodo(evt.target.value.trim());
      evt.target.value = '';
    }
  }, {
    key: 'completeAll',
    value: function completeAll() {
      this.isChecked = !this.isChecked;
      todoApp.updateAll(this.isChecked);
    }
  }, {
    key: 'clearCompleted',
    value: function clearCompleted() {
      console.log('do');
      todoApp.clearCompleted();
    }
  }]);

  return App;
}(Keet);

var vmodel = html(_templateObject, filtersTmpl);

var app = new App();

app.mount(vmodel).link('todo');

},{"../keet":15,"./filters":20,"./todo":21,"./util":22}],20:[function(require,module,exports){
'use strict';

var _templateObject = _taggedTemplateLiteral(['<li k-click="updateUrl(', ')"><a class="', '" href="', '">', '</a></li>'], ['<li k-click="updateUrl(', ')"><a class="', '" href="', '">', '</a></li>']);

function _taggedTemplateLiteral(strings, raw) { return Object.freeze(Object.defineProperties(strings, { raw: { value: Object.freeze(raw) } })); }

var _require = require('./util'),
    camelCase = _require.camelCase,
    html = _require.html;

module.exports = function (filterPage) {
  var str = '';
  var filters = function filters(page) {
    var f = {
      className: '{{page' + camelCase(page) + '}}',
      hash: '#/' + page,
      name: camelCase(page)
    };
    str += html(_templateObject, f.hash, f.className, f.hash, f.name);
  };
  filterPage.map(function (page) {
    return filters(page);
  });
  return str;
};

},{"./util":22}],21:[function(require,module,exports){
'use strict';

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _templateObject = _taggedTemplateLiteral(['\n\t<li k-dblclick="editMode({{keet-id}})" class="{{completed?completed:\'\'}}">\n\t\t<div class="view"><input k-click="toggleTodo({{keet-id}})" class="toggle" type="checkbox" {{completed?checked:\'\'}}>\n\t\t\t<label>{{title}}</label>\n\t\t\t<button k-click="todoDestroy({{keet-id}})" class="destroy"></button>\n\t\t</div>\n\t\t<input class="edit" value="{{title}}">\n\t</li>'], ['\n\t<li k-dblclick="editMode({{keet-id}})" class="{{completed?completed:\'\'}}">\n\t\t<div class="view"><input k-click="toggleTodo({{keet-id}})" class="toggle" type="checkbox" {{completed?checked:\'\'}}>\n\t\t\t<label>{{title}}</label>\n\t\t\t<button k-click="todoDestroy({{keet-id}})" class="destroy"></button>\n\t\t</div>\n\t\t<input class="edit" value="{{title}}">\n\t</li>']);

function _taggedTemplateLiteral(strings, raw) { return Object.freeze(Object.defineProperties(strings, { raw: { value: Object.freeze(raw) } })); }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var Keet = require('../keet');

var _require = require('./util'),
    store = _require.store,
    genId = _require.genId,
    html = _require.html,
    intelliUpdate = _require.intelliUpdate;

var log = console.log.bind(console);

// log(intelliUpdate)

// intelliUpdate(function(){
//   console.log(1)
// })

var onChanges = [];

// let flag = false

function inform() {
  for (var i = onChanges.length; i--;) {
    // if(flag) 
    onChanges[i](this.base.model);
  }
}

var TodoApp = function (_Keet) {
  _inherits(TodoApp, _Keet);

  function TodoApp() {
    var _ref;

    var _temp, _this, _ret;

    for (var _len = arguments.length, args = Array(_len), _key = 0; _key < _len; _key++) {
      args[_key] = arguments[_key];
    }

    _classCallCheck(this, TodoApp);

    return _ret = (_temp = (_this = _possibleConstructorReturn(this, (_ref = TodoApp.__proto__ || Object.getPrototypeOf(TodoApp)).call.apply(_ref, [this].concat(args))), _this), _this.args = [].slice.call(arguments), _this.el = 'todo-list', _temp), _possibleConstructorReturn(_this, _ret);
  }

  _createClass(TodoApp, [{
    key: 'addTodo',
    value: function addTodo(title) {
      var m = {
        title: title,
        completed: false
      };
      this.add(m, inform);
    }
  }, {
    key: 'updateAll',
    value: function updateAll(checked) {
      var _this2 = this;

      this.base.model.map(function (model) {
        _this2.update(model['keet-id'], 'keet-id', { completed: checked });
      });
      inform.call(this);
    }
  }, {
    key: 'clearCompleted',
    value: function clearCompleted() {
      console.log('clearCompleted');
    }
  }, {
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
    key: 'toggleTodo',
    value: function toggleTodo(id, evt) {
      this.update(id, 'keet-id', { completed: evt.target.checked ? true : false }, inform);
    }
  }, {
    key: 'subscribe',
    value: function subscribe(fn) {
      onChanges.push(fn);
    }
  }]);

  return TodoApp;
}(Keet);

var todoApp = new TodoApp();

var vmodel = {
  template: html(_templateObject),
  model: store('todos-keetjs')
};

todoApp.mount(vmodel);

// console.log(todoApp)

module.exports = todoApp;

},{"../keet":15,"./util":22}],22:[function(require,module,exports){
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

exports.intelliUpdate = function (state, callback) {
  // only update when necessary
  if (state) clearTimeout(state);
  state = setTimeout(function () {
    callback();
  }, 10);
};

},{}]},{},[19])
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIkM6L1VzZXJzL3BpcGV5L0FwcERhdGEvUm9hbWluZy9ucG0vbm9kZV9tb2R1bGVzL2Jyb3dzZXJpZnkvbm9kZV9tb2R1bGVzL2Jyb3dzZXItcGFjay9fcHJlbHVkZS5qcyIsImtlZXQvY29tcG9uZW50cy9jb3B5LmpzIiwia2VldC9jb21wb25lbnRzL2dlbkVsZW1lbnQuanMiLCJrZWV0L2NvbXBvbmVudHMvZ2VuVGVtcGxhdGUuanMiLCJrZWV0L2NvbXBvbmVudHMvbm9kZXNWaXNpYmlsaXR5LmpzIiwia2VldC9jb21wb25lbnRzL3BhcnNlU3RyLmpzIiwia2VldC9jb21wb25lbnRzL3Byb2Nlc3NFdmVudC5qcyIsImtlZXQvY29tcG9uZW50cy9zdHJJbnRlcnByZXRlci5qcyIsImtlZXQvY29tcG9uZW50cy90YWcuanMiLCJrZWV0L2NvbXBvbmVudHMvdGVybmFyeU9wcy5qcyIsImtlZXQvY29tcG9uZW50cy90bXBsQXR0ckhhbmRsZXIuanMiLCJrZWV0L2NvbXBvbmVudHMvdG1wbENsYXNzSGFuZGxlci5qcyIsImtlZXQvY29tcG9uZW50cy90bXBsSGFuZGxlci5qcyIsImtlZXQvY29tcG9uZW50cy90bXBsU3R5bGVzSGFuZGxlci5qcyIsImtlZXQvY29tcG9uZW50cy91dGlscy5qcyIsImtlZXQva2VldC5qcyIsImtlZXQvbm9kZV9tb2R1bGVzL2hhc2gtc3VtL2hhc2gtc3VtLmpzIiwia2VldC9ub2RlX21vZHVsZXMvc2V0LWRvbS9zcmMvaW5kZXguanMiLCJrZWV0L25vZGVfbW9kdWxlcy9zZXQtZG9tL3NyYy9wYXJzZS1odG1sLmpzIiwic3JjL2FwcC5qcyIsInNyYy9maWx0ZXJzLmpzIiwic3JjL3RvZG8uanMiLCJzcmMvdXRpbC5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTtBQ0FBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2ZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM3S0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDOUJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3JCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMzRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM5Q0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ1JBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNuQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDM0JBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN2QkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3BCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQy9CQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNyQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3hEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDak5BO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDMURBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNoVUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7Ozs7Ozs7Ozs7Ozs7O0FDaEZBLElBQU0s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ZCxDQUFOO0FBQ0g7QUFDRCxjQUFVLEdBQVY7QUFDQSxjQUFVLEtBQVY7QUFDSCxHQXBCRDtBQXFCQTtBQUNBO0FBQ0E7QUFDQSxZQUFVLElBQUksSUFBSSxNQUFKLEdBQVcsQ0FBZixDQUFWLENBL0JtRCxDQStCdEI7O0FBRTdCLFNBQU8sTUFBUDtBQUNELENBbENEOztBQW9DQSxRQUFRLGFBQVIsR0FBd0IsVUFBUyxLQUFULEVBQWdCLFFBQWhCLEVBQTBCO0FBQ2hEO0FBQ0EsTUFBSSxLQUFKLEVBQVcsYUFBYSxLQUFiO0FBQ1gsVUFBUSxXQUFXLFlBQVc7QUFDNUI7QUFDRCxHQUZPLEVBRUwsRUFGSyxDQUFSO0FBR0QsQ0FORCIsImZpbGUiOiJnZW5lcmF0ZWQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlc0NvbnRlbnQiOlsiKGZ1bmN0aW9uKCl7ZnVuY3Rpb24gcihlLG4sdCl7ZnVuY3Rpb24gbyhpLGYpe2lmKCFuW2ldKXtpZighZVtpXSl7dmFyIGM9XCJmdW5jdGlvblwiPT10eXBlb2YgcmVxdWlyZSYmcmVxdWlyZTtpZighZiYmYylyZXR1cm4gYyhpLCEwKTtpZih1KXJldHVybiB1KGksITApO3ZhciBhPW5ldyBFcnJvcihcIkNhbm5vdCBmaW5kIG1vZHVsZSAnXCIraStcIidcIik7dGhyb3cgYS5jb2RlPVwiTU9EVUxFX05PVF9GT1VORFwiLGF9dmFyIHA9bltpXT17ZXhwb3J0czp7fX07ZVtpXVswXS5jYWxsKHAuZXhwb3J0cyxmdW5jdGlvbihyKXt2YXIgbj1lW2ldWzFdW3JdO3JldHVybiBvKG58fHIpfSxwLHAuZXhwb3J0cyxyLGUsbix0KX1yZXR1cm4gbltpXS5leHBvcnRzfWZvcih2YXIgdT1cImZ1bmN0aW9uXCI9PXR5cGVvZiByZXF1aXJlJiZyZXF1aXJlLGk9MDtpPHQubGVuZ3RoO2krKylvKHRbaV0pO3JldHVybiBvfXJldHVybiByfSkoKSIsIm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24gKGFyZ3YpIHtcclxuICB2YXIgY29wID0gZnVuY3Rpb24gKHYpIHtcclxuICAgIHZhciBvID0ge31cclxuICAgIGlmICh0eXBlb2YgdiAhPT0gJ29iamVjdCcpIHtcclxuICAgICAgby5jb3B5ID0gdlxyXG4gICAgICByZXR1cm4gby5jb3B5XHJcbiAgICB9IGVsc2Uge1xyXG4gICAgICBmb3IgKHZhciBhdHRyIGluIHYpIHtcclxuICAgICAgICBvW2F0dHJdID0gdlthdHRyXVxyXG4gICAgICB9XHJcbiAgICB9XHJcbiAgICByZXR1cm4gb1xyXG4gIH1cclxuICByZXR1cm4gQXJyYXkuaXNBcnJheShhcmd2KSA/IGFyZ3YubWFwKGZ1bmN0aW9uICh2KSB7IHJldHVybiB2IH0pIDogY29wKGFyZ3YpXHJcbn1cclxuIiwidmFyIGNvcHkgPSByZXF1aXJlKCcuL2NvcHknKVxyXG52YXIgdGFnID0gcmVxdWlyZSgnLi90YWcnKVxyXG52YXIgdG1wbEhhbmRsZXIgPSByZXF1aXJlKCcuL3RtcGxIYW5kbGVyJylcclxudmFyIHRtcGxTdHlsZXNIYW5kbGVyID0gcmVxdWlyZSgnLi90bXBsU3R5bGVzSGFuZGxlcicpXHJcbnZhciB0bXBsQ2xhc3NIYW5kbGVyID0gcmVxdWlyZSgnLi90bXBsQ2xhc3NIYW5kbGVyJylcclxudmFyIHRtcGxBdHRySGFuZGxlciA9IHJlcXVpcmUoJy4vdG1wbEF0dHJIYW5kbGVyJylcclxudmFyIHByb2Nlc3NFdmVudCA9IHJlcXVpcmUoJy4vcHJvY2Vzc0V2ZW50JylcclxudmFyIHNlbGVjdG9yID0gcmVxdWlyZSgnLi91dGlscycpLnNlbGVjdG9yXHJcbnZhciBzdHJJbnRlcnByZXRlciA9IHJlcXVpcmUoJy4vc3RySW50ZXJwcmV0ZXInKVxyXG52YXIgbm9kZXNWaXNpYmlsaXR5ID0gcmVxdWlyZSgnLi9ub2Rlc1Zpc2liaWxpdHknKVxyXG52YXIgc3VtID0gcmVxdWlyZSgnaGFzaC1zdW0nKVxyXG52YXIgc2V0RE9NID0gcmVxdWlyZSgnc2V0LWRvbScpXHJcblxyXG5zZXRET00ua2V5ID0gJ2tlZXQtaWQnXHJcblxyXG52YXIgdXBkYXRlQ29udGV4dCA9IGZ1bmN0aW9uICgpIHtcclxuICB2YXIgc2VsZiA9IHRoaXNcclxuICB2YXIgZWxlXHJcbiAgdmFyIG5ld0VsZW1cclxuICB2YXIgYXJncyA9IFtdLnNsaWNlLmNhbGwoYXJndW1lbnRzKVxyXG4gIGlmICh0eXBlb2YgdGhpcy5iYXNlID09PSAnb2JqZWN0Jykge1xyXG4gICAgT2JqZWN0LmtleXModGhpcy5iYXNlKS5tYXAoZnVuY3Rpb24gKGhhbmRsZXJLZXkpIHtcclxuICAgICAgdmFyIGlkID0gc2VsZi5iYXNlW2hhbmRsZXJLZXldWydrZWV0LWlkJ11cclxuICAgICAgZWxlID0gc2VsZWN0b3IoaWQpXHJcbiAgICAgIGlmICghZWxlICYmIHR5cGVvZiBzZWxmLmJhc2VbaGFuZGxlcktleV0gPT09ICdzdHJpbmcnKSB7XHJcbiAgICAgICAgZWxlID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoc2VsZi5lbClcclxuICAgICAgfVxyXG4gICAgICBuZXdFbGVtID0gZ2VuRWxlbWVudC5hcHBseShzZWxmLCBbc2VsZi5iYXNlW2hhbmRsZXJLZXldXS5jb25jYXQoYXJncykpXHJcbiAgICAgIGlmIChzZWxmLmJhc2UuaGFzT3duUHJvcGVydHkoJ3RlbXBsYXRlJykpIHtcclxuICAgICAgICBuZXdFbGVtLmlkID0gc2VsZi5lbFxyXG4gICAgICB9XHJcbiAgICAgIHNldERPTShlbGUsIG5ld0VsZW0pXHJcbiAgICB9KVxyXG4gIH0gZWxzZSB7XHJcbiAgICBlbGUgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChzZWxmLmVsKVxyXG4gICAgaWYgKGVsZSkge1xyXG4gICAgICBuZXdFbGVtID0gZ2VuRWxlbWVudC5hcHBseShzZWxmLCBbc2VsZi5iYXNlXS5jb25jYXQoYXJncykpXHJcbiAgICAgIG5ld0VsZW0uaWQgPSBzZWxmLmVsXHJcbiAgICAgIHNldERPTShlbGUsIG5ld0VsZW0pXHJcbiAgICB9XHJcbiAgfVxyXG4gIGJhdGNoUG9vbC5zdGF0dXMgPSAncmVhZHknXHJcbn1cclxuXHJcbi8vIGJhdGNoIHBvb2wgdXBkYXRlIHN0YXRlcyB0byBET01cclxudmFyIGJhdGNoUG9vbCA9IHtcclxuICB0dGw6IG51bGwsXHJcbiAgc3RhdHVzOiAncmVhZHknXHJcbn1cclxuXHJcbnZhciBuZXh0U3RhdGUgPSBmdW5jdGlvbiAoaSwgYXJncykge1xyXG4gIHZhciBzZWxmID0gdGhpc1xyXG4gIGlmIChpIDwgdGhpcy5fX3N0YXRlTGlzdF9fLmxlbmd0aCkge1xyXG4gICAgdmFyIHN0YXRlID0gdGhpcy5fX3N0YXRlTGlzdF9fW2ldXHJcbiAgICB2YXIgdmFsdWUgPSB0aGlzW3N0YXRlXVxyXG4gICAgLy8gaWYgdmFsdWUgaXMgdW5kZWZpbmVkLCBsaWtlbHkgaGFzIG9iamVjdCBub3RhdGlvbiB3ZSBjb252ZXJ0IGl0IHRvIGFycmF5XHJcbiAgICBpZiAodmFsdWUgPT09IHVuZGVmaW5lZCkgdmFsdWUgPSBzdHJJbnRlcnByZXRlcihzdGF0ZSlcclxuXHJcbiAgICBpZiAodmFsdWUgJiYgQXJyYXkuaXNBcnJheSh2YWx1ZSkpIHtcclxuICAgICAgLy8gdXNpbmcgc3BsaXQgb2JqZWN0IG5vdGF0aW9uIGFzIGJhc2UgZm9yIHN0YXRlIHVwZGF0ZVxyXG4gICAgICB2YXIgaW5WYWwgPSB0aGlzW3ZhbHVlWzBdXVt2YWx1ZVsxXV1cclxuICAgICAgT2JqZWN0LmRlZmluZVByb3BlcnR5KHRoaXNbdmFsdWVbMF1dLCB2YWx1ZVsxXSwge1xyXG4gICAgICAgIGVudW1lcmFibGU6IGZhbHNlLFxyXG4gICAgICAgIGNvbmZpZ3VyYWJsZTogdHJ1ZSxcclxuICAgICAgICBnZXQ6IGZ1bmN0aW9uICgpIHtcclxuICAgICAgICAgIHJldHVybiBpblZhbFxyXG4gICAgICAgIH0sXHJcbiAgICAgICAgc2V0OiBmdW5jdGlvbiAodmFsKSB7XHJcbiAgICAgICAgICBpblZhbCA9IHZhbFxyXG4gICAgICAgICAgdXBkYXRlQ29udGV4dC5hcHBseShzZWxmLCBhcmdzKVxyXG4gICAgICAgIH1cclxuICAgICAgfSlcclxuICAgIH0gZWxzZSB7XHJcbiAgICAgIC8vIGhhbmRsZSBwYXJlbnQgc3RhdGUgdXBkYXRlIGlmIHRoZSBzdGF0ZSBpcyBub3QgYW4gb2JqZWN0XHJcbiAgICAgIE9iamVjdC5kZWZpbmVQcm9wZXJ0eSh0aGlzLCBzdGF0ZSwge1xyXG4gICAgICAgIGVudW1lcmFibGU6IGZhbHNlLFxyXG4gICAgICAgIGNvbmZpZ3VyYWJsZTogdHJ1ZSxcclxuICAgICAgICBnZXQ6IGZ1bmN0aW9uICgpIHtcclxuICAgICAgICAgIHJldHVybiB2YWx1ZVxyXG4gICAgICAgIH0sXHJcbiAgICAgICAgc2V0OiBmdW5jdGlvbiAodmFsKSB7XHJcbiAgICAgICAgICB2YWx1ZSA9IHZhbFxyXG5cclxuICAgICAgICAgIC8vIGlmKGJhdGNoUG9vbC5zdGF0dXMgPT09ICdwb29saW5nJyl7XHJcbiAgICAgICAgICAvLyAgIHJldHVyblxyXG4gICAgICAgICAgLy8gfSBlbHNlIHtcclxuXHJcbiAgICAgICAgICAvLyAgIGJhdGNoUG9vbC5zdGF0dXMgPSAncG9vbGluZydcclxuXHJcbiAgICAgICAgICAvLyAgIGNsZWFyVGltZW91dChiYXRjaFBvb2wudHRsKVxyXG5cclxuICAgICAgICAgIC8vICAgYmF0Y2hQb29sLnR0bCA9IHNldFRpbWVvdXQoZnVuY3Rpb24oKXtcclxuICAgICAgICAgICAgICB1cGRhdGVDb250ZXh0LmFwcGx5KHNlbGYsIGFyZ3MpXHJcbiAgICAgICAgICAvLyAgIH0sIDApXHJcbiAgICAgICAgICAvLyB9XHJcbiAgICAgICAgfVxyXG4gICAgICB9KVxyXG4gICAgfVxyXG4gICAgaSsrXHJcbiAgICBuZXh0U3RhdGUuYXBwbHkodGhpcywgWyBpLCBhcmdzIF0pXHJcbiAgfSBlbHNlIHtcclxuICAgIC8vXHJcbiAgfVxyXG59XHJcblxyXG52YXIgc2V0U3RhdGUgPSBmdW5jdGlvbiAoYXJncykge1xyXG4gIG5leHRTdGF0ZS5hcHBseSh0aGlzLCBbIDAsIGFyZ3MgXSlcclxufVxyXG5cclxudmFyIHVwZGF0ZVN0YXRlTGlzdCA9IGZ1bmN0aW9uIChzdGF0ZSkge1xyXG4gIHRoaXMuX19zdGF0ZUxpc3RfXyA9IHRoaXMuX19zdGF0ZUxpc3RfXy5jb25jYXQoc3RhdGUpXHJcbn1cclxuXHJcbnZhciBnZW5FbGVtZW50ID0gZnVuY3Rpb24gKCkge1xyXG4gIHZhciBjaGlsZCA9IFtdLnNoaWZ0LmNhbGwoYXJndW1lbnRzKVxyXG4gIHZhciBhcmdzID0gW10uc2xpY2UuY2FsbChhcmd1bWVudHMpXHJcblxyXG4gIHZhciB0ZW1wRGl2ID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnZGl2JylcclxuICB2YXIgY2xvbmVDaGlsZCA9IGNvcHkoY2hpbGQpXHJcbiAgZGVsZXRlIGNsb25lQ2hpbGQudGVtcGxhdGVcclxuICBkZWxldGUgY2xvbmVDaGlsZC50YWdcclxuICBkZWxldGUgY2xvbmVDaGlsZC5zdHlsZVxyXG4gIGRlbGV0ZSBjbG9uZUNoaWxkLmNsYXNzXHJcbiAgLy8gcHJvY2VzcyB0ZW1wbGF0ZSBpZiBoYXMgaGFuZGxlYmFycyB2YWx1ZVxyXG4gIHRoaXMuX19zdGF0ZUxpc3RfXyA9IFtdXHJcblxyXG4gIHZhciB0cGwgPSBjaGlsZC50ZW1wbGF0ZVxyXG4gICAgPyB0bXBsSGFuZGxlci5jYWxsKHRoaXMsIGNoaWxkLnRlbXBsYXRlLCB1cGRhdGVTdGF0ZUxpc3QuYmluZCh0aGlzKSlcclxuICAgIDogdHlwZW9mIGNoaWxkID09PSAnc3RyaW5nJyA/IHRtcGxIYW5kbGVyLmNhbGwodGhpcywgY2hpbGQsIHVwZGF0ZVN0YXRlTGlzdC5iaW5kKHRoaXMpKSA6IG51bGxcclxuICAvLyBwcm9jZXNzIHN0eWxlcyBpZiBoYXMgaGFuZGxlYmFycyB2YWx1ZVxyXG4gIHZhciBzdHlsZVRwbCA9IHRtcGxTdHlsZXNIYW5kbGVyLmNhbGwodGhpcywgY2hpbGQuc3R5bGUsIHVwZGF0ZVN0YXRlTGlzdC5iaW5kKHRoaXMpKVxyXG4gIC8vIHByb2Nlc3MgY2xhc3NlcyBpZiBoYXMgaGFuZGxlYmFycyB2YWx1ZVxyXG4gIHZhciBjbGFzc1RwbCA9IHRtcGxDbGFzc0hhbmRsZXIuY2FsbCh0aGlzLCBjaGlsZCwgdXBkYXRlU3RhdGVMaXN0LmJpbmQodGhpcykpXHJcbiAgaWYgKGNsYXNzVHBsKSBjbG9uZUNoaWxkLmNsYXNzID0gY2xhc3NUcGxcclxuICAvLyBjdXN0b20gYXR0cmlidXRlcyBoYW5kbGVyXHJcbiAgaWYgKGFyZ3MgJiYgYXJncy5sZW5ndGgpIHtcclxuICAgIHRtcGxBdHRySGFuZGxlci5hcHBseSh0aGlzLCBbIGNsb25lQ2hpbGQgXS5jb25jYXQoYXJncykpXHJcbiAgfVxyXG5cclxuICB2YXIgcyA9IGNoaWxkLnRhZ1xyXG4gICAgPyB0YWcoY2hpbGQudGFnLCAvLyBodG1sIHRhZ1xyXG4gICAgICB0cGwgfHwgJycsIC8vIG5vZGVWYWx1ZVxyXG4gICAgICBjbG9uZUNoaWxkLCAvLyBhdHRyaWJ1dGVzIGluY2x1ZGluZyBjbGFzc2VzXHJcbiAgICAgIHN0eWxlVHBsIC8vIGlubGluZSBzdHlsZXNcclxuICAgICkgOiB0cGwgLy8gZmFsbGJhY2sgaWYgbm9uIGV4aXN0LCByZW5kZXIgdGhlIHRlbXBsYXRlIGFzIHN0cmluZ1xyXG5cclxuICBzID0gbm9kZXNWaXNpYmlsaXR5LmNhbGwodGhpcywgcylcclxuICB0ZW1wRGl2LmlubmVySFRNTCA9IHNcclxuICB0ZW1wRGl2LmNoaWxkTm9kZXMuZm9yRWFjaChmdW5jdGlvbiAoYykge1xyXG4gICAgaWYgKGMubm9kZVR5cGUgPT09IDEpIHtcclxuICAgICAgYy5zZXRBdHRyaWJ1dGUoJ2RhdGEtY2hlY2tzdW0nLCBzdW0oYy5vdXRlckhUTUwpKVxyXG4gICAgfVxyXG4gIH0pXHJcbiAgaWYgKGNoaWxkLnRhZyA9PT0gJ2lucHV0Jykge1xyXG4gICAgaWYgKGNsb25lQ2hpbGQuY2hlY2tlZCkge1xyXG4gICAgICB0ZW1wRGl2LmNoaWxkTm9kZXNbMF0uc2V0QXR0cmlidXRlKCdjaGVja2VkJywgJycpXHJcbiAgICB9IGVsc2Uge1xyXG4gICAgICB0ZW1wRGl2LmNoaWxkTm9kZXNbMF0ucmVtb3ZlQXR0cmlidXRlKCdjaGVja2VkJylcclxuICAgIH1cclxuICB9XHJcblxyXG4gIHNldFN0YXRlLmNhbGwodGhpcywgYXJncylcclxuXHJcbiAgcHJvY2Vzc0V2ZW50LmNhbGwodGhpcywgdGVtcERpdilcclxuICByZXR1cm4gdHlwZW9mIGNoaWxkID09PSAnc3RyaW5nJ1xyXG4gICAgPyB0ZW1wRGl2XHJcbiAgICA6IGNoaWxkLnRhZyA/IHRlbXBEaXYuY2hpbGROb2Rlc1swXVxyXG4gICAgICA6IHRlbXBEaXZcclxufVxyXG5cclxuZXhwb3J0cy5nZW5FbGVtZW50ID0gZ2VuRWxlbWVudFxyXG5leHBvcnRzLnNldFN0YXRlID0gc2V0U3RhdGVcclxuZXhwb3J0cy51cGRhdGVTdGF0ZUxpc3QgPSB1cGRhdGVTdGF0ZUxpc3RcclxuIiwidmFyIHByb2Nlc3NFdmVudCA9IHJlcXVpcmUoJy4vcHJvY2Vzc0V2ZW50JylcclxudmFyIHRlcm5hcnlPcHMgPSByZXF1aXJlKCcuL3Rlcm5hcnlPcHMnKVxyXG52YXIgdGVzdEV2ZW50ID0gcmVxdWlyZSgnLi91dGlscycpLnRlc3RFdmVudFxyXG52YXIgdG1wbCA9ICcnXHJcblxyXG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uIChvYmopIHtcclxuICB2YXIgYXJncyA9IHRoaXMuYXJnc1xyXG4gIHZhciBhcnJQcm9wcyA9IHRoaXMuYmFzZS50ZW1wbGF0ZS5tYXRjaCgve3soW157fV0rKX19L2cpXHJcbiAgdmFyIHRlbXBEaXZcclxuICB2YXIgcmVwXHJcbiAgdG1wbCA9IHRoaXMuYmFzZS50ZW1wbGF0ZVxyXG4gIGZvcih2YXIgaT0wLCBsZW4gPSBhcnJQcm9wcy5sZW5ndGg7aTxsZW47aSsrKXtcclxuICAgIHJlcCA9IGFyclByb3BzW2ldLnJlcGxhY2UoL3t7KFtee31dKyl9fS9nLCAnJDEnKVxyXG4gICAgdmFyIGlzVGVybmFyeSA9IHRlcm5hcnlPcHMuY2FsbChvYmosIHJlcClcclxuICAgIGlmKGlzVGVybmFyeSl7XHJcbiAgICAgIHRtcGwgPSB0bXBsLnJlcGxhY2UoJ3t7JytyZXArJ319JywgaXNUZXJuYXJ5LnZhbHVlKVxyXG4gICAgfSBlbHNlIHtcclxuICAgICAgdG1wbCA9IHRtcGwucmVwbGFjZSgne3snK3JlcCsnfX0nLCBvYmpbcmVwXSlcclxuICAgIH1cclxuICAgIGlmIChhcmdzICYmIH5hcmdzLmluZGV4T2YocmVwKSAmJiAhb2JqW3JlcF0pIHtcclxuICAgICAgdmFyIHJlID0gbmV3IFJlZ0V4cCgnICcgKyByZXAgKyAnPVwiJyArIG9ialtyZXBdICsgJ1wiJywgJ2cnKVxyXG4gICAgICB0bXBsID0gdG1wbC5yZXBsYWNlKHJlLCAnJylcclxuICAgIH1cclxuICB9XHJcbiAgdGVtcERpdiA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2RpdicpXHJcbiAgdGVtcERpdi5pbm5lckhUTUwgPSB0bXBsXHJcbiAgdGVzdEV2ZW50KHRtcGwpICYmIHByb2Nlc3NFdmVudC5jYWxsKHRoaXMsIHRlbXBEaXYpXHJcbiAgdGVtcERpdi5jaGlsZE5vZGVzWzBdLnNldEF0dHJpYnV0ZSgna2VldC1pZCcsIG9ialsna2VldC1pZCddKVxyXG4gIHJldHVybiB0ZW1wRGl2LmNoaWxkTm9kZXNbMF1cclxufVxyXG4iLCJtb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uIChzdHJpbmcpIHtcclxuICB2YXIgc2VsZiA9IHRoaXNcclxuICB0aGlzLl9fc3RhdGVMaXN0X18ubWFwKGZ1bmN0aW9uIChzdGF0ZSkge1xyXG4gICAgaWYgKCFzZWxmW3N0YXRlXSkge1xyXG4gICAgICB2YXIgZiA9ICdcXFxce1xcXFx7XFxcXD8nICsgc3RhdGUgKyAnXFxcXH1cXFxcfSdcclxuICAgICAgdmFyIGIgPSAnXFxcXHtcXFxce1xcXFwvJyArIHN0YXRlICsgJ1xcXFx9XFxcXH0nXHJcbiAgICAgIC8vIHZhciByZWd4ID0gJyg/PD0nICsgZiArICcpKC4qPykoPz0nICsgYiArICcpJ1xyXG4gICAgICAvLyAqKiBvbGQgYnJvd3NlciBkb2VzIG5vdCBzdXBwb3J0IHBvc2l0aXZlIGxvb2sgYmVoaW5kICoqXHJcbiAgICAgIHZhciByZWd4ID0gJygnICsgZiArICcpKC4qPykoPz0nICsgYiArICcpJ1xyXG4gICAgICB2YXIgcmUgPSBuZXcgUmVnRXhwKHJlZ3gpXHJcbiAgICAgIHZhciBpc0NvbmRpdGlvbmFsID0gcmUudGVzdChzdHJpbmcpXHJcbiAgICAgIHZhciBtYXRjaCA9IHN0cmluZy5tYXRjaChyZSlcclxuICAgICAgaWYgKGlzQ29uZGl0aW9uYWwgJiYgbWF0Y2gpIHtcclxuICAgICAgICBzdHJpbmcgPSBzdHJpbmcucmVwbGFjZShtYXRjaFsyXSwgJycpXHJcbiAgICAgIH1cclxuICAgIH1cclxuICAgIHN0cmluZyA9IHN0cmluZy5yZXBsYWNlKCd7ez8nICsgc3RhdGUgKyAnfX0nLCAnJylcclxuICAgIHN0cmluZyA9IHN0cmluZy5yZXBsYWNlKCd7ey8nICsgc3RhdGUgKyAnfX0nLCAnJylcclxuICB9KVxyXG4gIHJldHVybiBzdHJpbmdcclxufVxuIiwidmFyIGdlbkVsZW1lbnQgPSByZXF1aXJlKCcuL2dlbkVsZW1lbnQnKS5nZW5FbGVtZW50XHJcbnZhciBzZXRTdGF0ZSA9IHJlcXVpcmUoJy4vZ2VuRWxlbWVudCcpLnNldFN0YXRlXHJcbnZhciB0bXBsSGFuZGxlciA9IHJlcXVpcmUoJy4vdG1wbEhhbmRsZXInKVxyXG52YXIgcHJvY2Vzc0V2ZW50ID0gcmVxdWlyZSgnLi9wcm9jZXNzRXZlbnQnKVxyXG52YXIgZ2VuSWQgPSByZXF1aXJlKCcuL3V0aWxzJykuZ2VuSWRcclxudmFyIHRlc3RFdmVudCA9IHJlcXVpcmUoJy4vdXRpbHMnKS50ZXN0RXZlbnRcclxudmFyIGdlblRlbXBsYXRlID0gcmVxdWlyZSgnLi9nZW5UZW1wbGF0ZScpXHJcbnZhciBub2Rlc1Zpc2liaWxpdHkgPSByZXF1aXJlKCcuL25vZGVzVmlzaWJpbGl0eScpXHJcbnZhciBzdW0gPSByZXF1aXJlKCdoYXNoLXN1bScpXHJcblxyXG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uICgpIHtcclxuICB2YXIgc2VsZiA9IHRoaXNcclxuICB2YXIgZWxlbUFyciA9IFtdXHJcbiAgdmFyIGFyZ3MgPSBbXS5zbGljZS5jYWxsKGFyZ3VtZW50cylcclxuICBpZiAoQXJyYXkuaXNBcnJheSh0aGlzLmJhc2UubW9kZWwpKSB7XHJcbiAgICAvLyBkbyBhcnJheSBiYXNlXHJcbiAgICB0aGlzLmJhc2UudGVtcGxhdGUgPSB0aGlzLmJhc2UudGVtcGxhdGUudHJpbSgpLnJlcGxhY2UoL1xccysvZywgJyAnKVxyXG5cclxuICAgIC8vIGdlbmVyYXRlIGlkIGZvciBzZWxlY3RvclxyXG4gICAgdGhpcy5iYXNlLm1vZGVsID0gdGhpcy5iYXNlLm1vZGVsLm1hcChmdW5jdGlvbiAobSkge1xyXG4gICAgICBtWydrZWV0LWlkJ10gPSBnZW5JZCgpXHJcbiAgICAgIHJldHVybiBtXHJcbiAgICB9KVxyXG4gICAgdGhpcy5iYXNlLm1vZGVsLm1hcChmdW5jdGlvbiAobSkge1xyXG4gICAgICBlbGVtQXJyLnB1c2goZ2VuVGVtcGxhdGUuY2FsbChzZWxmLCBtKSlcclxuICAgIH0pXHJcbiAgfSBlbHNlIGlmICh0eXBlb2YgdGhpcy5iYXNlID09PSAnb2JqZWN0Jykge1xyXG4gICAgLy8gZG8gb2JqZWN0IGJhc2VcclxuICAgIE9iamVjdC5rZXlzKHRoaXMuYmFzZSkubWFwKGZ1bmN0aW9uIChrZXkpIHtcclxuICAgICAgdmFyIGNoaWxkID0gc2VsZi5iYXNlW2tleV1cclxuICAgICAgaWYgKGNoaWxkICYmIHR5cGVvZiBjaGlsZCA9PT0gJ29iamVjdCcpIHtcclxuICAgICAgICB2YXIgaWQgPSBnZW5JZCgpXHJcbiAgICAgICAgY2hpbGRbJ2tlZXQtaWQnXSA9IGlkXHJcbiAgICAgICAgc2VsZi5iYXNlW2tleV1bJ2tlZXQtaWQnXSA9IGlkXHJcbiAgICAgICAgdmFyIG5ld0VsZW1lbnQgPSBnZW5FbGVtZW50LmFwcGx5KHNlbGYsIFtjaGlsZF0uY29uY2F0KGFyZ3MpKVxyXG4gICAgICAgIGVsZW1BcnIucHVzaChuZXdFbGVtZW50KVxyXG4gICAgICB9IGVsc2Uge1xyXG4gICAgICAgIHNlbGYuX19zdGF0ZUxpc3RfXyA9IFtdXHJcbiAgICAgICAgdmFyIHRwbCA9IHRtcGxIYW5kbGVyLmNhbGwoc2VsZiwgY2hpbGQsIGZ1bmN0aW9uIChzdGF0ZSkge1xyXG4gICAgICAgICAgc2VsZi5fX3N0YXRlTGlzdF9fID0gc2VsZi5fX3N0YXRlTGlzdF9fLmNvbmNhdChzdGF0ZSlcclxuICAgICAgICB9KVxyXG4gICAgICAgIHRwbCA9IG5vZGVzVmlzaWJpbGl0eS5jYWxsKHNlbGYsIHRwbClcclxuICAgICAgICB2YXIgdGVtcERpdiA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2RpdicpXHJcbiAgICAgICAgdGVtcERpdi5pbm5lckhUTUwgPSB0cGxcclxuICAgICAgICBzZXRTdGF0ZS5jYWxsKHNlbGYsIGFyZ3MpXHJcbiAgICAgICAgcHJvY2Vzc0V2ZW50LmNhbGwoc2VsZiwgdGVtcERpdilcclxuICAgICAgICB0ZW1wRGl2LmNoaWxkTm9kZXMuZm9yRWFjaChmdW5jdGlvbiAoYykge1xyXG4gICAgICAgICAgaWYgKGMubm9kZVR5cGUgPT09IDEpIHtcclxuICAgICAgICAgICAgYy5zZXRBdHRyaWJ1dGUoJ2RhdGEtY2hlY2tzdW0nLCBzdW0oYy5vdXRlckhUTUwpKVxyXG4gICAgICAgICAgfVxyXG4gICAgICAgICAgZWxlbUFyci5wdXNoKGMpXHJcbiAgICAgICAgfSlcclxuICAgICAgfVxyXG4gICAgfSlcclxuICB9IGVsc2UgaWYgKHR5cGVvZiB0aGlzLmJhc2UgPT09ICdzdHJpbmcnKSB7XHJcbiAgICB0aGlzLl9fc3RhdGVMaXN0X18gPSBbXVxyXG4gICAgdmFyIHRwbCA9IHRtcGxIYW5kbGVyLmNhbGwodGhpcywgdGhpcy5iYXNlLCBmdW5jdGlvbiAoc3RhdGUpIHtcclxuICAgICAgc2VsZi5fX3N0YXRlTGlzdF9fID0gc2VsZi5fX3N0YXRlTGlzdF9fLmNvbmNhdChzdGF0ZSlcclxuICAgIH0pXHJcblxyXG4gICAgdHBsID0gbm9kZXNWaXNpYmlsaXR5LmNhbGwodGhpcywgdHBsKVxyXG4gICAgdmFyIHRlbXBEaXYgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdkaXYnKVxyXG4gICAgdGVtcERpdi5pbm5lckhUTUwgPSB0cGxcclxuICAgIHNldFN0YXRlLmNhbGwodGhpcywgYXJncylcclxuICAgIHRlc3RFdmVudCh0cGwpICYmIHByb2Nlc3NFdmVudC5jYWxsKHRoaXMsIHRlbXBEaXYpXHJcbiAgICB0ZW1wRGl2LmNoaWxkTm9kZXMuZm9yRWFjaChmdW5jdGlvbiAoYykge1xyXG4gICAgICBpZiAoYy5ub2RlVHlwZSA9PT0gMSkge1xyXG4gICAgICAgIGMuc2V0QXR0cmlidXRlKCdkYXRhLWNoZWNrc3VtJywgc3VtKGMub3V0ZXJIVE1MKSlcclxuICAgICAgfVxyXG4gICAgICBlbGVtQXJyLnB1c2goYylcclxuICAgIH0pXHJcbiAgfVxyXG5cclxuICByZXR1cm4gZWxlbUFyclxyXG59XHJcbiIsInZhciBsb29wQ2hpbGRzID0gcmVxdWlyZSgnLi91dGlscycpLmxvb3BDaGlsZHNcclxuXHJcbnZhciBuZXh0ID0gZnVuY3Rpb24gKGksIGMsIHJlbSkge1xyXG4gIHZhciBoYXNrXHJcbiAgdmFyIGV2dE5hbWVcclxuICB2YXIgZXZ0aGFuZGxlclxyXG4gIHZhciBoYW5kbGVyXHJcbiAgdmFyIGlzSGFuZGxlclxyXG4gIHZhciBhcmd2XHJcbiAgdmFyIHZcclxuICB2YXIgYXR0cyA9IGMuYXR0cmlidXRlc1xyXG5cclxuICBpZiAoaSA8IGF0dHMubGVuZ3RoKSB7XHJcbiAgICBoYXNrID0gL15rLS8udGVzdChhdHRzW2ldLm5vZGVOYW1lKVxyXG4gICAgaWYgKGhhc2spIHtcclxuICAgICAgZXZ0TmFtZSA9IGF0dHNbaV0ubm9kZU5hbWUuc3BsaXQoJy0nKVsxXVxyXG4gICAgICBldnRoYW5kbGVyID0gYXR0c1tpXS5ub2RlVmFsdWVcclxuICAgICAgaGFuZGxlciA9IGV2dGhhbmRsZXIuc3BsaXQoJygnKVxyXG4gICAgICBpc0hhbmRsZXIgPSB0aGlzW2hhbmRsZXJbMF1dXHJcbiAgICAgIGlmICh0eXBlb2YgaXNIYW5kbGVyID09PSAnZnVuY3Rpb24nKSB7XHJcbiAgICAgICAgcmVtLnB1c2goYXR0c1tpXS5ub2RlTmFtZSlcclxuICAgICAgICBhcmd2ID0gW11cclxuICAgICAgICB2ID0gaGFuZGxlclsxXS5zbGljZSgwLCAtMSkuc3BsaXQoJywnKS5maWx0ZXIoZnVuY3Rpb24gKGYpIHsgcmV0dXJuIGYgIT09ICcnIH0pXHJcbiAgICAgICAgaWYgKHYubGVuZ3RoKSB2Lm1hcChmdW5jdGlvbiAodikgeyBhcmd2LnB1c2godikgfSlcclxuICAgICAgICBjLmFkZEV2ZW50TGlzdGVuZXIoZXZ0TmFtZSwgaXNIYW5kbGVyLmJpbmQuYXBwbHkoaXNIYW5kbGVyLmJpbmQodGhpcyksIFtjXS5jb25jYXQoYXJndikpLCBmYWxzZSlcclxuICAgICAgfVxyXG4gICAgfVxyXG4gICAgaSsrXHJcbiAgICBuZXh0LmFwcGx5KHRoaXMsIFsgaSwgYywgcmVtIF0pXHJcbiAgfSBlbHNlIHtcclxuICAgIHJlbS5tYXAoZnVuY3Rpb24gKGYpIHsgYy5yZW1vdmVBdHRyaWJ1dGUoZikgfSlcclxuICB9XHJcbn1cclxuXHJcbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24gKGtOb2RlKSB7XHJcbiAgdmFyIHNlbGYgPSB0aGlzXHJcbiAgdmFyIGxpc3RLbm9kZUNoaWxkID0gW11cclxuICB2YXIgcmVtID0gW11cclxuICBsb29wQ2hpbGRzKGxpc3RLbm9kZUNoaWxkLCBrTm9kZSlcclxuICBsaXN0S25vZGVDaGlsZC5tYXAoZnVuY3Rpb24gKGMpIHtcclxuICAgIGlmIChjLm5vZGVUeXBlID09PSAxICYmIGMuaGFzQXR0cmlidXRlcygpKSB7XHJcbiAgICAgIG5leHQuYXBwbHkoc2VsZiwgWyAwLCBjLCByZW0gXSlcclxuICAgIH1cclxuICB9KVxyXG4gIGxpc3RLbm9kZUNoaWxkID0gW11cclxufVxyXG4iLCJtb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uIChzdHIpIHtcclxuICB2YXIgcmVzID0gc3RyLm1hdGNoKC9cXC4qXFwuL2cpXHJcbiAgdmFyIHJlc3VsdFxyXG4gIGlmIChyZXMgJiYgcmVzLmxlbmd0aCA+IDApIHtcclxuICAgIHJldHVybiBzdHIuc3BsaXQoJy4nKVxyXG4gIH1cclxuICByZXR1cm4gcmVzdWx0XHJcbn1cclxuIiwiZnVuY3Rpb24ga3RhZyAoKSB7XHJcbiAgdmFyIGFyZ3MgPSBbXS5zbGljZS5jYWxsKGFyZ3VtZW50cylcclxuICB2YXIgYXR0clxyXG4gIHZhciBpZHhcclxuICB2YXIgdGVcclxuICB2YXIgcmV0ID0gWyc8JywgYXJnc1swXSwgJz4nLCBhcmdzWzFdLCAnPC8nLCBhcmdzWzBdLCAnPiddXHJcbiAgaWYgKGFyZ3MubGVuZ3RoID4gMiAmJiB0eXBlb2YgYXJnc1syXSA9PT0gJ29iamVjdCcpIHtcclxuICAgIGZvciAoYXR0ciBpbiBhcmdzWzJdKSB7XHJcbiAgICAgIGlmICh0eXBlb2YgYXJnc1syXVthdHRyXSA9PT0gJ2Jvb2xlYW4nICYmIGFyZ3NbMl1bYXR0cl0pIHtcclxuICAgICAgICByZXQuc3BsaWNlKDIsIDAsICcgJywgYXR0cilcclxuICAgICAgfSBlbHNlIGlmIChhdHRyID09PSAnY2xhc3MnICYmIEFycmF5LmlzQXJyYXkoYXJnc1syXVthdHRyXSkpIHtcclxuICAgICAgICByZXQuc3BsaWNlKDIsIDAsICcgJywgYXR0ciwgJz1cIicsIGFyZ3NbMl1bYXR0cl0uam9pbignICcpLnRyaW0oKSwgJ1wiJylcclxuICAgICAgfSBlbHNlIHtcclxuICAgICAgICByZXQuc3BsaWNlKDIsIDAsICcgJywgYXR0ciwgJz1cIicsIGFyZ3NbMl1bYXR0cl0sICdcIicpXHJcbiAgICAgIH1cclxuICAgIH1cclxuICB9XHJcbiAgaWYgKGFyZ3MubGVuZ3RoID4gMyAmJiB0eXBlb2YgYXJnc1szXSA9PT0gJ29iamVjdCcpIHtcclxuICAgIGlkeCA9IHJldC5pbmRleE9mKCc+JylcclxuICAgIHRlID0gW2lkeCwgMCwgJyBzdHlsZT1cIiddXHJcbiAgICBmb3IgKGF0dHIgaW4gYXJnc1szXSkge1xyXG4gICAgICB0ZS5wdXNoKGF0dHIpXHJcbiAgICAgIHRlLnB1c2goJzonKVxyXG4gICAgICB0ZS5wdXNoKGFyZ3NbM11bYXR0cl0pXHJcbiAgICAgIHRlLnB1c2goJzsnKVxyXG4gICAgfVxyXG4gICAgdGUucHVzaCgnXCInKVxyXG4gICAgcmV0LnNwbGljZS5hcHBseShyZXQsIHRlKVxyXG4gIH1cclxuICByZXR1cm4gcmV0XHJcbn1cclxuXHJcbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24gKCkge1xyXG4gIHJldHVybiBrdGFnLmFwcGx5KG51bGwsIGFyZ3VtZW50cykuam9pbignJylcclxufVxyXG4iLCIvLyBmdW5jdGlvbiB0byByZXNvbHZlIHRlcm5hcnkgb3BlcmF0aW9uXHJcblxyXG5mdW5jdGlvbiB0ZXN0KHN0cil7XHJcbiAgaWYoc3RyID09PSAnXFwnXFwnJyB8fCBzdHIgPT09ICdcXFwiXFxcIicpXHJcbiAgICByZXR1cm4gJydcclxuICByZXR1cm4gc3RyXHJcbn1cclxuXHJcbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24oaW5wdXQpIHtcclxuICBpZihpbnB1dC5tYXRjaCgvKFteP10qKVxcPyhbXjpdKik6KFteO10qKXwoXFxzKj1cXHMqKVteO10qL2cpKXtcclxuICAgIHZhciB0ID0gaW5wdXQuc3BsaXQoJz8nKVxyXG4gICAgdmFyIGNvbmRpdGlvbiA9IHRbMF1cclxuICAgIHZhciBsZWZ0SGFuZCA9IHRbMV0uc3BsaXQoJzonKVswXVxyXG4gICAgdmFyIHJpZ2h0SGFuZCA9IHRbMV0uc3BsaXQoJzonKVsxXVxyXG5cclxuICAgIC8vIGNoZWNrIHRoZSBjb25kaXRpb24gZnVsZmlsbG1lbnRcclxuICAgIGlmKHRoaXNbY29uZGl0aW9uXSlcclxuICAgICAgcmV0dXJuIHsgXHJcbiAgICAgICAgdmFsdWU6dGVzdChsZWZ0SGFuZCksXHJcbiAgICAgICAgc3RhdGU6IGNvbmRpdGlvblxyXG4gICAgICB9XHJcbiAgICBlbHNlXHJcbiAgICAgIHJldHVybiB7IFxyXG4gICAgICAgIHZhbHVlOnRlc3QocmlnaHRIYW5kKSxcclxuICAgICAgICBzdGF0ZTogY29uZGl0aW9uXHJcbiAgICAgIH1cclxuICB9IGVsc2UgcmV0dXJuIGZhbHNlXHJcbn0iLCJ2YXIgZ2VuRWxlbWVudCA9IHJlcXVpcmUoJy4vZ2VuRWxlbWVudCcpXHJcbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24gKCkge1xyXG4gIHZhciBzZWxmID0gdGhpc1xyXG4gIHZhciBjbG9uZUNoaWxkID0gW10uc2hpZnQuY2FsbChhcmd1bWVudHMpXHJcbiAgT2JqZWN0LmtleXMoY2xvbmVDaGlsZCkubWFwKGZ1bmN0aW9uIChjKSB7XHJcbiAgICB2YXIgaGRsID0gY2xvbmVDaGlsZFtjXS5tYXRjaCgve3soW157fV0rKX19L2cpXHJcbiAgICBpZiAoaGRsICYmIGhkbC5sZW5ndGgpIHtcclxuICAgICAgdmFyIHN0ciA9ICcnXHJcbiAgICAgIGhkbC5tYXAoZnVuY3Rpb24gKHMpIHtcclxuICAgICAgICB2YXIgcmVwID0gcy5yZXBsYWNlKC97eyhbXnt9XSspfX0vZywgJyQxJylcclxuICAgICAgICBpZiAoc2VsZltyZXBdICE9PSB1bmRlZmluZWQpIHtcclxuICAgICAgICAgIGdlbkVsZW1lbnQudXBkYXRlU3RhdGVMaXN0LmNhbGwoc2VsZiwgcmVwKVxyXG4gICAgICAgICAgaWYgKHNlbGZbcmVwXSA9PT0gZmFsc2UpIHtcclxuICAgICAgICAgICAgZGVsZXRlIGNsb25lQ2hpbGRbY11cclxuICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgIHN0ciArPSBzZWxmW3JlcF1cclxuICAgICAgICAgICAgY2xvbmVDaGlsZFtjXSA9IHN0clxyXG4gICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuICAgICAgfSlcclxuICAgIH1cclxuICB9KVxyXG59XHJcbiIsIm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24gKGNoaWxkLCB1cGRhdGVTdGF0ZUxpc3QpIHtcclxuICB2YXIgc2VsZiA9IHRoaXNcclxuICBpZiAoY2hpbGQuY2xhc3MpIHtcclxuICAgIHZhciBjID0gY2hpbGQuY2xhc3MubWF0Y2goL3t7KFtee31dKyl9fS9nKVxyXG4gICAgdmFyIGNsYXNzU3RyID0gJydcclxuICAgIGlmIChjICYmIGMubGVuZ3RoKSB7XHJcbiAgICAgIGMubWFwKGZ1bmN0aW9uIChzKSB7XHJcbiAgICAgICAgdmFyIHJlcCA9IHMucmVwbGFjZSgve3soW157fV0rKX19L2csICckMScpXHJcbiAgICAgICAgaWYgKHNlbGZbcmVwXSAhPT0gdW5kZWZpbmVkKSB7XHJcbiAgICAgICAgICB1cGRhdGVTdGF0ZUxpc3QocmVwKVxyXG4gICAgICAgICAgc2VsZltyZXBdLmNzdG9yZS5tYXAoZnVuY3Rpb24gKGMpIHtcclxuICAgICAgICAgICAgY2xhc3NTdHIgKz0gYyArICcgJ1xyXG4gICAgICAgICAgfSlcclxuICAgICAgICB9XHJcbiAgICAgIH0pXHJcbiAgICB9XHJcbiAgICByZXR1cm4gY2xhc3NTdHIubGVuZ3RoID8gY2xhc3NTdHIudHJpbSgpIDogY2hpbGQuY2xhc3NcclxuICB9XHJcbiAgcmV0dXJuIGZhbHNlXHJcbn1cclxuIiwidmFyIHN0ckludGVycHJldGVyID0gcmVxdWlyZSgnLi9zdHJJbnRlcnByZXRlcicpXHJcbnZhciB0ZXJuYXJ5T3BzID0gcmVxdWlyZSgnLi90ZXJuYXJ5T3BzJylcclxuXHJcbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24gKHN0ciwgdXBkYXRlU3RhdGVMaXN0KSB7XHJcbiAgdmFyIHNlbGYgPSB0aGlzXHJcbiAgdmFyIGFyclByb3BzID0gc3RyLm1hdGNoKC97eyhbXnt9XSspfX0vZylcclxuICBpZiAoYXJyUHJvcHMgJiYgYXJyUHJvcHMubGVuZ3RoKSB7XHJcbiAgICBhcnJQcm9wcy5tYXAoZnVuY3Rpb24gKHMpIHtcclxuICAgICAgdmFyIHJlcCA9IHMucmVwbGFjZSgve3soW157fV0rKX19L2csICckMScpXHJcbiAgICAgIHZhciBpc09iamVjdE5vdGF0aW9uID0gc3RySW50ZXJwcmV0ZXIocmVwKVxyXG4gICAgICB2YXIgaXNUZXJuYXJ5ID0gdGVybmFyeU9wcy5jYWxsKHNlbGYsIHJlcClcclxuICAgICAgaWYgKCFpc09iamVjdE5vdGF0aW9uKSB7XHJcbiAgICAgICAgaWYgKHNlbGZbcmVwXSAhPT0gdW5kZWZpbmVkKSB7XHJcbiAgICAgICAgICB1cGRhdGVTdGF0ZUxpc3QocmVwKVxyXG4gICAgICAgICAgc3RyID0gc3RyLnJlcGxhY2UoJ3t7JytyZXArJ319Jywgc2VsZltyZXBdKVxyXG4gICAgICAgIH0gZWxzZSBpZihpc1Rlcm5hcnkpe1xyXG4gICAgICAgICAgdXBkYXRlU3RhdGVMaXN0KGlzVGVybmFyeS5zdGF0ZSlcclxuICAgICAgICAgIHN0ciA9IHN0ci5yZXBsYWNlKCd7eycrcmVwKyd9fScsIGlzVGVybmFyeS52YWx1ZSlcclxuICAgICAgICB9IFxyXG4gICAgICB9IGVsc2Uge1xyXG4gICAgICAgIHVwZGF0ZVN0YXRlTGlzdChyZXApXHJcbiAgICAgICAgc3RyID0gc3RyLnJlcGxhY2UoJ3t7JytyZXArJ319Jywgc2VsZltpc09iamVjdE5vdGF0aW9uWzBdXVtpc09iamVjdE5vdGF0aW9uWzFdXSlcclxuICAgICAgfVxyXG4gICAgICBpZiAocmVwLm1hdGNoKC9eXFw/L2cpKSB7XHJcbiAgICAgICAgdXBkYXRlU3RhdGVMaXN0KHJlcC5yZXBsYWNlKCc/JywgJycpKVxyXG4gICAgICB9XHJcbiAgICB9KVxyXG4gIH1cclxuICByZXR1cm4gc3RyXHJcbn1cclxuXHJcbiIsInZhciBjb3B5ID0gcmVxdWlyZSgnLi9jb3B5JylcclxuXHJcbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24gKHN0eWxlcywgdXBkYXRlU3RhdGVMaXN0KSB7XHJcbiAgdmFyIHNlbGYgPSB0aGlzXHJcbiAgdmFyIGNvcHlTdHlsZXMgPSBjb3B5KHN0eWxlcylcclxuICBpZiAoc3R5bGVzKSB7XHJcbiAgICBPYmplY3Qua2V5cyhjb3B5U3R5bGVzKS5tYXAoZnVuY3Rpb24gKHN0eWxlKSB7XHJcbiAgICAgIHZhciBhcnJQcm9wcyA9IGNvcHlTdHlsZXNbc3R5bGVdLm1hdGNoKC97eyhbXnt9XSspfX0vZylcclxuICAgICAgaWYgKGFyclByb3BzICYmIGFyclByb3BzLmxlbmd0aCkge1xyXG4gICAgICAgIGFyclByb3BzLm1hcChmdW5jdGlvbiAocykge1xyXG4gICAgICAgICAgdmFyIHJlcCA9IHMucmVwbGFjZSgve3soW157fV0rKX19L2csICckMScpXHJcbiAgICAgICAgICBpZiAoc2VsZltyZXBdICE9PSB1bmRlZmluZWQpIHtcclxuICAgICAgICAgICAgdXBkYXRlU3RhdGVMaXN0KHJlcClcclxuICAgICAgICAgICAgY29weVN0eWxlc1tzdHlsZV0gPSBjb3B5U3R5bGVzW3N0eWxlXS5yZXBsYWNlKC97eyhbXnt9XSspfX0vLCBzZWxmW3JlcF0pXHJcbiAgICAgICAgICB9XHJcbiAgICAgICAgfSlcclxuICAgICAgfVxyXG4gICAgfSlcclxuICB9XHJcbiAgcmV0dXJuIGNvcHlTdHlsZXNcclxufVxyXG4iLCJ2YXIgZ2V0SWQgPSBmdW5jdGlvbiAoaWQpIHtcclxuICByZXR1cm4gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoaWQpXHJcbn1cclxuXHJcbmV4cG9ydHMuZ2V0SWQgPSBnZXRJZFxyXG5cclxuZXhwb3J0cy5nZW5JZCA9IGZ1bmN0aW9uICgpIHtcclxuICByZXR1cm4gKE1hdGgucm91bmQoTWF0aC5yYW5kb20oKSAqIDB4MSAqIDFlMTIpKS50b1N0cmluZygzMilcclxufVxyXG5cclxuZXhwb3J0cy5zZWxlY3RvciA9IGZ1bmN0aW9uIChpZCkge1xyXG4gIHJldHVybiBkb2N1bWVudC5xdWVyeVNlbGVjdG9yKCdba2VldC1pZD1cIicgKyBpZCArICdcIl0nKVxyXG59XHJcblxyXG52YXIgbG9vcENoaWxkcyA9IGZ1bmN0aW9uIChhcnIsIGVsZW0pIHtcclxuICBmb3IgKHZhciBjaGlsZCA9IGVsZW0uZmlyc3RDaGlsZDsgY2hpbGQgIT09IG51bGw7IGNoaWxkID0gY2hpbGQubmV4dFNpYmxpbmcpIHtcclxuICAgIGFyci5wdXNoKGNoaWxkKVxyXG4gICAgaWYgKGNoaWxkLmhhc0NoaWxkTm9kZXMoKSkge1xyXG4gICAgICBsb29wQ2hpbGRzKGFyciwgY2hpbGQpXHJcbiAgICB9XHJcbiAgfVxyXG59XHJcblxyXG5leHBvcnRzLmxvb3BDaGlsZHMgPSBsb29wQ2hpbGRzXHJcblxyXG5leHBvcnRzLmNoZWNrTm9kZUF2YWlsYWJpbGl0eSA9IGZ1bmN0aW9uKG9iaiwgZ2VuVGVtcGxhdGUsIGNhbGxiYWNrKSB7XHJcbiAgdmFyIGVsZVxyXG4gIHZhciBjaGVja2VkID0gZmFsc2VcclxuICB2YXIgaWQgPSB0aGlzLmVsXHJcbiAgdmFyIHNlbGYgPSB0aGlzXHJcbiAgdmFyIHQgPSBzZXRJbnRlcnZhbChmdW5jdGlvbigpIHtcclxuICAgIGVsZSA9IGdldElkKGlkKVxyXG4gICAgaWYgKGVsZSkge1xyXG4gICAgICBjbGVhckludGVydmFsKHQpXHJcbiAgICAgIGNoZWNrZWQgPSB0cnVlXHJcbiAgICAgIGNhbGxiYWNrLmNhbGwoc2VsZiwgZWxlLCBvYmosIGdlblRlbXBsYXRlKVxyXG4gICAgfVxyXG4gIH0sIDApXHJcbiAgc2V0VGltZW91dChmdW5jdGlvbigpIHtcclxuICAgIGlmICghY2hlY2tlZCkge1xyXG4gICAgICBjbGVhckludGVydmFsKHQpXHJcbiAgICAgIHRocm93IG5ldyBFcnJvcignVW5hYmxlIHRvIGZpbmQgaHRtbCBlbnRpdHkgd2l0aCBpZCAnICsgaWQgKyAnLicpXHJcbiAgICB9XHJcbiAgfSwgNTAwKVxyXG59XHJcblxyXG5leHBvcnRzLmF2YWlsYWJsZSA9IGZ1bmN0aW9uKGVsZSwgb2JqLCBnZW5UZW1wbGF0ZSl7XHJcbiAgZWxlLmFwcGVuZENoaWxkKGdlblRlbXBsYXRlLmNhbGwodGhpcywgb2JqKSlcclxufVxyXG5cclxuZXhwb3J0cy5mbiA9IGZ1bmN0aW9uKGYpIHtcclxuIHJldHVybiB0eXBlb2YgZiA9PT0gJ2Z1bmN0aW9uJ1xyXG59XHJcblxyXG5leHBvcnRzLnRlc3RFdmVudCA9IGZ1bmN0aW9uKHRtcGwpIHtcclxuICByZXR1cm4gLyBrLS8udGVzdCh0bXBsKVxyXG59IiwiJ3VzZSBzdHJpY3QnXHJcbi8qKlxyXG4gKiBLZWV0anMgdjMuNS4yIEFscGhhIHJlbGVhc2U6IGh0dHBzOi8vZ2l0aHViLmNvbS9rZWV0anMva2VldC5qc1xyXG4gKiBNaW5pbWFsaXN0IHZpZXcgbGF5ZXIgZm9yIHRoZSB3ZWJcclxuICpcclxuICogPDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8IEtlZXRqcyA+Pj4+Pj4+Pj4+Pj4+Pj4+Pj4+Pj4+Pj4+Pj4+Pj5cclxuICpcclxuICogQ29weXJpZ2h0IDIwMTgsIFNoYWhydWwgTml6YW0gU2VsYW1hdFxyXG4gKiBSZWxlYXNlZCB1bmRlciB0aGUgTUlUIExpY2Vuc2UuXHJcbiAqL1xyXG5cclxudmFyIGdldElkID0gcmVxdWlyZSgnLi9jb21wb25lbnRzL3V0aWxzJykuZ2V0SWRcclxudmFyIGdlbklkID0gcmVxdWlyZSgnLi9jb21wb25lbnRzL3V0aWxzJykuZ2VuSWRcclxudmFyIHNlbGVjdG9yID0gcmVxdWlyZSgnLi9jb21wb25lbnRzL3V0aWxzJykuc2VsZWN0b3JcclxudmFyIGZuID0gcmVxdWlyZSgnLi9jb21wb25lbnRzL3V0aWxzJykuZm5cclxudmFyIGNoZWNrTm9kZUF2YWlsYWJpbGl0eSA9IHJlcXVpcmUoJy4vY29tcG9uZW50cy91dGlscycpLmNoZWNrTm9kZUF2YWlsYWJpbGl0eVxyXG52YXIgYXZhaWxhYmxlID0gcmVxdWlyZSgnLi9jb21wb25lbnRzL3V0aWxzJykuYXZhaWxhYmxlXHJcbnZhciBwYXJzZVN0ciA9IHJlcXVpcmUoJy4vY29tcG9uZW50cy9wYXJzZVN0cicpXHJcbnZhciBnZW5UZW1wbGF0ZSA9IHJlcXVpcmUoJy4vY29tcG9uZW50cy9nZW5UZW1wbGF0ZScpXHJcbnZhciBzZXRET00gPSByZXF1aXJlKCdzZXQtZG9tJylcclxuXHJcbnNldERPTS5rZXkgPSAna2VldC1pZCdcclxuXHJcbi8qKlxyXG4gKiBAcHJpdmF0ZVxyXG4gKiBAZGVzY3JpcHRpb25cclxuICogTG9vcCByZW5kZXIgYWxsIGluaXRpYWxseSBwYXJzZWQgaHRtbCBlbnRpdGllcyB0byBcclxuICogdGFyZ2V0IERPTSBub2RlIGlkLlxyXG4gKlxyXG4gKiBAcGFyYW0ge0ludH0gaSAtIFRoZSBpbmRleCBvZiBodG1sIGVudGl0eS5cclxuICogQHBhcmFtIHtOb2RlfSBlbGUgLSBUaGUgdGFyZ2V0IERPTSBub2RlLlxyXG4gKiBAcGFyYW0ge05vZGV9IGVscyAtIFRoZSBsaXN0IG9mIGh0bWwgZW50aXRpZXMuXHJcbiAqL1xyXG52YXIgbmV4dCA9IGZ1bmN0aW9uIChpLCBlbGUsIGVscykge1xyXG4gIHZhciBzZWxmID0gdGhpc1xyXG4gIGlmIChpIDwgZWxzLmxlbmd0aCkge1xyXG4gICAgaWYgKCFlbGUuY2hpbGROb2Rlc1tpXSkgZWxlLmFwcGVuZENoaWxkKGVsc1tpXSlcclxuICAgIGkrK1xyXG4gICAgbmV4dC5hcHBseSh0aGlzLCBbIGksIGVsZSwgZWxzIF0pXHJcbiAgfSBlbHNlIHtcclxuICAgIC8vIE9uY2UgaW50aWFsIHJlbmRlciBhbHJlYWR5IGluIHBsYWNlIGNvbnNlY3V0aXZlbHlcclxuICAgIC8vIHdhdGNoIHRoZSBvYmplY3QgaW4gQ29tcG9uZW50cy5wcm90b3R5cGUuYmFzZS4gQWRkIFxyXG4gICAgLy8gYWRkaXRpb25hbCBvYmplY3QgcHJvcHMgb3IgZGVsZXRlIGV4aXN0aW5nIG9iamVjdCBcclxuICAgIC8vIHByb3BzLCB3aGljaCB3aWxsIHJlZmxlY3QgaW4gdGhlIGNvbXBvbmVudCByZW5kZXJlZCBcclxuICAgIC8vIGVsZW1lbnRzLlxyXG4gICAgdmFyIHdhdGNoT2JqZWN0ID0gZnVuY3Rpb24gKG9iaikge1xyXG4gICAgICByZXR1cm4gbmV3IFByb3h5KG9iaiwge1xyXG4gICAgICAgIHNldDogZnVuY3Rpb24gKHRhcmdldCwga2V5LCB2YWx1ZSkge1xyXG4gICAgICAgICAgdGFyZ2V0W2tleV0gPSB2YWx1ZVxyXG4gICAgICAgICAgc2VsZi5iYXNlW2tleV0gPSB0YXJnZXRba2V5XVxyXG4gICAgICAgICAgcmV0dXJuIHRydWVcclxuICAgICAgICB9LFxyXG4gICAgICAgIGRlbGV0ZVByb3BlcnR5OiBmdW5jdGlvbiAodGFyZ2V0LCBrZXkpIHtcclxuICAgICAgICAgIHZhciBpZCA9IHRhcmdldFtrZXldWydrZWV0LWlkJ11cclxuICAgICAgICAgIHZhciBlbCA9IHNlbGVjdG9yKGlkKVxyXG4gICAgICAgICAgZWwgJiYgZWwucmVtb3ZlKClcclxuICAgICAgICAgIGRlbGV0ZSBzZWxmLmJhc2Vba2V5XVxyXG4gICAgICAgICAgcmV0dXJuIHRydWVcclxuICAgICAgICB9XHJcbiAgICAgIH0pXHJcbiAgICB9XHJcbiAgICAvLyBvbmx5IGphdmFzY3JpcHQgb2JqZWN0cyBpcyB3YXRjaGFibGVcclxuICAgIGlmICh0eXBlb2YgdGhpcy5iYXNlID09PSAnb2JqZWN0JykgeyB0aGlzLmJhc2VQcm94eSA9IHdhdGNoT2JqZWN0KHRoaXMuYmFzZSkgfVxyXG5cclxuICAgIC8vIHNpbmNlIGNvbXBvbmVudCBhbHJlYWR5IHJlbmRlcmVkLCB0cmlnZ2VyIGl0cyBsaWZlLWN5Y2xlIG1ldGhvZFxyXG4gICAgaWYgKHRoaXMuY29tcG9uZW50RGlkTW91bnQgJiYgdHlwZW9mIHRoaXMuY29tcG9uZW50RGlkTW91bnQgPT09ICdmdW5jdGlvbicpIHtcclxuICAgICAgdGhpcy5jb21wb25lbnREaWRNb3VudCgpXHJcbiAgICB9XHJcbiAgfVxyXG59XHJcblxyXG4vKipcclxuICogQGRlc2NyaXB0aW9uXHJcbiAqIFRoZSBtYWluIGNvbnN0cnVjdG9yIG9mIEtlZXRcclxuICpcclxuICogQHBhcmFtIHtTdHJpbmcgfCBhcmcwWywgYXJnMVssIGFyZzJbLCAuLi5dXV19IGFyZ3VtZW50cyAtIEN1c3RvbSBwcm9wZXJ0eSBuYW1lc1xyXG4gKiBpLmUgdXNpbmcgJ2NoZWNrZWQnIGZvciBpbnB1dCBlbGVtZW50cy5cclxuICogVXNhZ2UgOi1cclxuICpcclxuICogICAgY29uc3QgQXBwIGV4dGVuZHMgS2VldCB7XHJcbiAqICAgICAgY29uc3RydWN0b3IoLi4uYXJncykge1xyXG4gKiAgICAgICAgc3VwZXIoKVxyXG4gKiAgICAgICAgdGhpcy5hcmdzID0gYXJnc1xyXG4gKiAgICAgIH1cclxuICogICAgfVxyXG4gKiAgICBjb25zdCBhcHAgPSBuZXcgQXBwKCdjaGVja2VkJylcclxuICpcclxuICogZm9yIGV4YW1wbGUgdXNhZ2UgY2FzZXMgc2VlIGh0dHBzOi8vZ2l0aHViLmNvbS9zeWFydWwva2VldC9ibG9iL21hc3Rlci9leGFtcGxlcy9jaGVjay5qc1xyXG4gKi9cclxuZnVuY3Rpb24gS2VldCAoKSB7XHJcbiAgLy8gcHJlcGFyZSB0aGUgc3RvcmUgZm9yIHN0YXRlcywgdGhpcyBpcyB0aGUgaW50ZXJuYWwgc3RhdGUtbWFuYWdlbWVudCBmb3IgdGhlXHJcbiAgLy8gY29tcG9uZW50cy4gUGVyc29uYWxseSBJIG5ldmVyIGdldCB0byBsaWtlIHN0YXRlLW1hbmFnZW1lbnQgaW4gSmF2YVNjcmlwdC5cclxuICAvLyBUaGUgaWRlYSBtaWdodCBzb3VuZCBkaXZpbmUgYnV0IHlvdSdsbCBzdHVjayBpbiB2ZXJ5IGNvbXBsaWNhdGVkIGdldC10by1tYXN0ZXJcclxuICAvLyB0aGlzIGZyYW1ld29yay9mbG93IGN5Y2xlcyB3aGVyZSB5b3UgYWx3YXlzIHdyaXRlIHRoZSBzdGF0ZSBpbiBzb21lIGV4dGVybmFsIFxyXG4gIC8vIHN0b3JlIGFuZCB3cml0ZSBsb25nIGxvZ2ljcyB0byBkbyBzbWFsbCBzdHVmZnMgYW5kIHRoZXkgYXJlIHZlcnkgc2xvdy4gT24gdGhlIFxyXG4gIC8vIG90aGVyIGhhbmQsIHRoaXMgaW50ZXJuYWwgc3RvcmUgaXMgcmVsYXRpdmVseSBzaW1wbGUsIGhhcyByZWZlcmVuY2VzIGFuZCB0aGUgXHJcbiAgLy8gYXZhaWxhYmlsaXR5IG9mIHNoYXJpbmcgYWNyb3NzIG11bHRpcGxlIGNvbXBvbmVudHMgaW4gYW55IGNhc2UuXHJcbiAgT2JqZWN0LmRlZmluZVByb3BlcnR5KHRoaXMsICdfX3N0YXRlTGlzdF9fJywge1xyXG4gICAgZW51bWVyYWJsZTogZmFsc2UsXHJcbiAgICB3cml0YWJsZTogdHJ1ZVxyXG4gIH0pXHJcbn1cclxuXHJcbktlZXQucHJvdG90eXBlLm1vdW50ID0gZnVuY3Rpb24gKGluc3RhbmNlKSB7XHJcbiAgLy8gQmVmb3JlIHdlIGJlZ2luIHRvIHBhcnNlIGFuIGluc3RhbmNlLCBkbyBhIHJ1bi1kb3duIGNoZWNrc1xyXG4gIC8vIHRvIGNsZWFuIHVwIGJhY2stdGljayBzdHJpbmcgd2hpY2ggdXN1YWxseSBoYXMgbGluZSBzcGFjaW5nXHJcbiAgaWYgKHR5cGVvZiBpbnN0YW5jZSA9PT0gJ29iamVjdCcpIHtcclxuICAgIE9iamVjdC5rZXlzKGluc3RhbmNlKS5tYXAoZnVuY3Rpb24gKGtleSkge1xyXG4gICAgICBpZiAodHlwZW9mIGluc3RhbmNlW2tleV0gPT09ICdzdHJpbmcnKSB7XHJcbiAgICAgICAgaW5zdGFuY2Vba2V5XSA9IGluc3RhbmNlW2tleV0udHJpbSgpLnJlcGxhY2UoL1xccysvZywgJyAnKVxyXG4gICAgICB9IGVsc2UgaWYgKHR5cGVvZiBpbnN0YW5jZVtrZXldID09PSAnb2JqZWN0JyAmJiB0eXBlb2YgaW5zdGFuY2Vba2V5XVsndGVtcGxhdGUnXSA9PT0gJ3N0cmluZycpIHtcclxuICAgICAgICBpbnN0YW5jZVtrZXldWyd0ZW1wbGF0ZSddID0gaW5zdGFuY2Vba2V5XVsndGVtcGxhdGUnXS50cmltKCkucmVwbGFjZSgvXFxzKy9nLCAnICcpXHJcbiAgICAgIH1cclxuICAgIH0pXHJcbiAgfSBlbHNlIGlmICh0eXBlb2YgaW5zdGFuY2UgPT09ICdzdHJpbmcnKSB7XHJcbiAgICBpbnN0YW5jZSA9IGluc3RhbmNlLnRyaW0oKS5yZXBsYWNlKC9cXHMrL2csICcgJylcclxuICB9XHJcbiAgLy8gd2Ugc3RvcmUgdGhlIHByaXN0aW5lIGluc3RhbmNlIGluIENvbXBvbmVudC5iYXNlXHJcbiAgdGhpcy5iYXNlID0gaW5zdGFuY2VcclxuICByZXR1cm4gdGhpc1xyXG59XHJcblxyXG5LZWV0LnByb3RvdHlwZS5mbHVzaCA9IGZ1bmN0aW9uIChpbnN0YW5jZSkge1xyXG4gIC8vIEN1c3RvbSBtZXRob2QgdG8gY2xlYW4gdXAgdGhlIGNvbXBvbmVudCBET00gdHJlZVxyXG4gIC8vIHVzZWZ1bCBpZiB3ZSBuZWVkIHRvIGRvIGNsZWFuIHVwIHJlcmVuZGVyLlxyXG4gIHZhciBlbGUgPSBnZXRJZCh0aGlzLmVsKVxyXG4gIGlmIChlbGUpIGVsZS5pbm5lckhUTUwgPSAnJ1xyXG4gIHJldHVybiB0aGlzXHJcbn1cclxuXHJcbktlZXQucHJvdG90eXBlLmxpbmsgPSBmdW5jdGlvbiAoaWQpIHtcclxuICAvLyBUaGUgdGFyZ2V0IERPTSB3aGVyZSB0aGUgcmVuZGVyaW5nIHdpbGwgdG9vayBwbGFjZS5cclxuICAvLyBXZSBjb3VsZCBhbHNvIGFwcGx5IGxpZmUtY3ljbGUgbWV0aG9kIGJlZm9yZSB0aGVcclxuICAvLyByZW5kZXIgaGFwcGVuLlxyXG4gIHRoaXMuZWwgPSBpZFxyXG4gIGlmICh0aGlzLmNvbXBvbmVudFdpbGxNb3VudCAmJiB0eXBlb2YgdGhpcy5jb21wb25lbnRXaWxsTW91bnQgPT09ICdmdW5jdGlvbicpIHtcclxuICAgIHRoaXMuY29tcG9uZW50V2lsbE1vdW50KClcclxuICB9XHJcbiAgdGhpcy5yZW5kZXIoKVxyXG4gIHJldHVybiB0aGlzXHJcbn1cclxuXHJcbktlZXQucHJvdG90eXBlLnJlbmRlciA9IGZ1bmN0aW9uICgpIHtcclxuICAvLyBSZW5kZXIgdGhpcyBjb21wb25lbnQgdG8gdGhlIHRhcmdldCBET01cclxuICB2YXIgZWxlID0gZ2V0SWQodGhpcy5lbClcclxuICB2YXIgZWxzID0gcGFyc2VTdHIuYXBwbHkodGhpcywgdGhpcy5hcmdzKVxyXG4gIGlmIChlbGUpIHtcclxuICAgIG5leHQuYXBwbHkodGhpcywgWyAwLCBlbGUsIGVscyBdKVxyXG4gIH1cclxuICByZXR1cm4gdGhpc1xyXG59XHJcblxyXG5LZWV0LnByb3RvdHlwZS5jbHVzdGVyID0gZnVuY3Rpb24gKCkge1xyXG4gIC8vIENoYWluIG1ldGhvZCB0byBydW4gZXh0ZXJuYWwgZnVuY3Rpb24ocyksIHRoaXMgYmFzaWNhbGx5IHNlcnZlXHJcbiAgLy8gYXMgYW4gaW5pdGlhbGl6ZXIgZm9yIGFsbCBjaGlsZCBjb21wb25lbnRzIHdpdGhpbiB0aGUgaW5zdGFuY2UgdHJlZVxyXG4gIHZhciBhcmdzID0gW10uc2xpY2UuY2FsbChhcmd1bWVudHMpXHJcbiAgaWYgKGFyZ3MubGVuZ3RoID4gMCkge1xyXG4gICAgYXJncy5tYXAoZnVuY3Rpb24gKGYpIHtcclxuICAgICAgaWYgKHR5cGVvZiBmID09PSAnZnVuY3Rpb24nKSBmKClcclxuICAgIH0pXHJcbiAgfVxyXG59XHJcblxyXG5LZWV0LnByb3RvdHlwZS5hZGQgPSBmdW5jdGlvbiAob2JqLCBpbnRlcmNlcHRvcikge1xyXG4gIC8vIE1ldGhvZCB0byBhZGQgYSBuZXcgb2JqZWN0IHRvIGNvbXBvbmVudCBtb2RlbFxyXG4gIHZhciBlbGUgPSBnZXRJZCh0aGlzLmVsKVxyXG4gIG9ialsna2VldC1pZCddID0gZ2VuSWQoKVxyXG4gIHRoaXMuYmFzZS5tb2RlbCA9IHRoaXMuYmFzZS5tb2RlbC5jb25jYXQob2JqKVxyXG4gIC8vIGlmIGludGVyY2VwdG9yIGlzIGRlY2xhcmVkIGV4ZWN1dGUgaXQgYmVmb3JlIG5vZGUgdXBkYXRlXHJcbiAgaW50ZXJjZXB0b3IgJiYgZm4oaW50ZXJjZXB0b3IpICYmIGludGVyY2VwdG9yLmNhbGwodGhpcylcclxuICAvLyB1cGRhdGUgdGhlIG5vZGUsIGlmIGl0IG5vdCBhdmFpYWxiZSB3ZSBrZWVwIGNoZWNraW5nIHRoZSBhdmFpbGFiaWx0eSBmb3IgYSB0aW1lXHJcbiAgZWxlICYmIGVsZS5hcHBlbmRDaGlsZChnZW5UZW1wbGF0ZS5jYWxsKHRoaXMsIG9iaikpIHx8IGNoZWNrTm9kZUF2YWlsYWJpbGl0eS5jYWxsKHRoaXMsIG9iaiwgZ2VuVGVtcGxhdGUsIGF2YWlsYWJsZSlcclxufVxyXG5cclxuS2VldC5wcm90b3R5cGUuZGVzdHJveSA9IGZ1bmN0aW9uIChpZCwgYXR0ciwgaW50ZXJjZXB0b3IpIHtcclxuICAvLyBNZXRob2QgdG8gZGVzdHJveSBhIHN1Ym1vZGVsIG9mIGEgY29tcG9uZW50XHJcbiAgdmFyIHNlbGYgPSB0aGlzXHJcbiAgdGhpcy5iYXNlLm1vZGVsID0gdGhpcy5iYXNlLm1vZGVsLmZpbHRlcihmdW5jdGlvbiAob2JqLCBpbmRleCkge1xyXG4gICAgaWYgKGlkID09PSBvYmpbYXR0cl0pIHtcclxuICAgICAgdmFyIG5vZGUgPSBzZWxlY3RvcihvYmpbJ2tlZXQtaWQnXSlcclxuICAgICAgaWYgKG5vZGUpIHsgXHJcbiAgICAgICAgLy8gaWYgaW50ZXJjZXB0b3IgaXMgZGVjbGFyZWQgZXhlY3V0ZSBpdCBiZWZvcmUgbm9kZSB1cGRhdGVcclxuICAgICAgICBpbnRlcmNlcHRvciAmJiBmbihpbnRlcmNlcHRvcikgJiYgaW50ZXJjZXB0b3IuY2FsbChzZWxmKVxyXG4gICAgICAgIG5vZGUucmVtb3ZlKCkgXHJcbiAgICAgIH1cclxuICAgIH0gZWxzZSB7IHJldHVybiBvYmogfVxyXG4gIH0pXHJcbn1cclxuXHJcbktlZXQucHJvdG90eXBlLnVwZGF0ZSA9IGZ1bmN0aW9uIChpZCwgYXR0ciwgbmV3QXR0ciwgaW50ZXJjZXB0b3IpIHtcclxuICAvLyBNZXRob2QgdG8gdXBkYXRlIGEgc3VibW9kZWwgb2YgYSBjb21wb25lbnRcclxuICB2YXIgc2VsZiA9IHRoaXNcclxuICB0aGlzLmJhc2UubW9kZWwgPSB0aGlzLmJhc2UubW9kZWwubWFwKGZ1bmN0aW9uIChvYmosIGlkeCwgbW9kZWwpIHtcclxuICAgIGlmIChpZCA9PT0gb2JqW2F0dHJdKSB7XHJcbiAgICAgIGlmIChuZXdBdHRyICYmIHR5cGVvZiBuZXdBdHRyID09PSAnb2JqZWN0Jykge1xyXG4gICAgICAgIE9iamVjdC5hc3NpZ24ob2JqLCBuZXdBdHRyKVxyXG4gICAgICB9XHJcbiAgICAgIHZhciBub2RlID0gc2VsZWN0b3Iob2JqWydrZWV0LWlkJ10pXHJcbiAgICAgIGlmIChub2RlKSB7XHJcbiAgICAgICAgLy8gaWYgaW50ZXJjZXB0b3IgaXMgZGVjbGFyZWQgZXhlY3V0ZSBpdCBiZWZvcmUgbm9kZSB1cGRhdGVcclxuICAgICAgICBpbnRlcmNlcHRvciAmJiBmbihpbnRlcmNlcHRvcikgJiYgaW50ZXJjZXB0b3IuY2FsbChzZWxmKVxyXG4gICAgICAgIHNldERPTShub2RlLCBnZW5UZW1wbGF0ZS5jYWxsKHNlbGYsIG9iaikpXHJcbiAgICAgIH1cclxuICAgIH1cclxuICAgIHJldHVybiBvYmpcclxuICB9KVxyXG59XHJcblxyXG5tb2R1bGUuZXhwb3J0cyA9IEtlZXRcclxuIiwiJ3VzZSBzdHJpY3QnO1xuXG5mdW5jdGlvbiBwYWQgKGhhc2gsIGxlbikge1xuICB3aGlsZSAoaGFzaC5sZW5ndGggPCBsZW4pIHtcbiAgICBoYXNoID0gJzAnICsgaGFzaDtcbiAgfVxuICByZXR1cm4gaGFzaDtcbn1cblxuZnVuY3Rpb24gZm9sZCAoaGFzaCwgdGV4dCkge1xuICB2YXIgaTtcbiAgdmFyIGNocjtcbiAgdmFyIGxlbjtcbiAgaWYgKHRleHQubGVuZ3RoID09PSAwKSB7XG4gICAgcmV0dXJuIGhhc2g7XG4gIH1cbiAgZm9yIChpID0gMCwgbGVuID0gdGV4dC5sZW5ndGg7IGkgPCBsZW47IGkrKykge1xuICAgIGNociA9IHRleHQuY2hhckNvZGVBdChpKTtcbiAgICBoYXNoID0gKChoYXNoIDw8IDUpIC0gaGFzaCkgKyBjaHI7XG4gICAgaGFzaCB8PSAwO1xuICB9XG4gIHJldHVybiBoYXNoIDwgMCA/IGhhc2ggKiAtMiA6IGhhc2g7XG59XG5cbmZ1bmN0aW9uIGZvbGRPYmplY3QgKGhhc2gsIG8sIHNlZW4pIHtcbiAgcmV0dXJuIE9iamVjdC5rZXlzKG8pLnNvcnQoKS5yZWR1Y2UoZm9sZEtleSwgaGFzaCk7XG4gIGZ1bmN0aW9uIGZvbGRLZXkgKGhhc2gsIGtleSkge1xuICAgIHJldHVybiBmb2xkVmFsdWUoaGFzaCwgb1trZXldLCBrZXksIHNlZW4pO1xuICB9XG59XG5cbmZ1bmN0aW9uIGZvbGRWYWx1ZSAoaW5wdXQsIHZhbHVlLCBrZXksIHNlZW4pIHtcbiAgdmFyIGhhc2ggPSBmb2xkKGZvbGQoZm9sZChpbnB1dCwga2V5KSwgdG9TdHJpbmcodmFsdWUpKSwgdHlwZW9mIHZhbHVlKTtcbiAgaWYgKHZhbHVlID09PSBudWxsKSB7XG4gICAgcmV0dXJuIGZvbGQoaGFzaCwgJ251bGwnKTtcbiAgfVxuICBpZiAodmFsdWUgPT09IHVuZGVmaW5lZCkge1xuICAgIHJldHVybiBmb2xkKGhhc2gsICd1bmRlZmluZWQnKTtcbiAgfVxuICBpZiAodHlwZW9mIHZhbHVlID09PSAnb2JqZWN0Jykge1xuICAgIGlmIChzZWVuLmluZGV4T2YodmFsdWUpICE9PSAtMSkge1xuICAgICAgcmV0dXJuIGZvbGQoaGFzaCwgJ1tDaXJjdWxhcl0nICsga2V5KTtcbiAgICB9XG4gICAgc2Vlbi5wdXNoKHZhbHVlKTtcbiAgICByZXR1cm4gZm9sZE9iamVjdChoYXNoLCB2YWx1ZSwgc2Vlbik7XG4gIH1cbiAgcmV0dXJuIGZvbGQoaGFzaCwgdmFsdWUudG9TdHJpbmcoKSk7XG59XG5cbmZ1bmN0aW9uIHRvU3RyaW5nIChvKSB7XG4gIHJldHVybiBPYmplY3QucHJvdG90eXBlLnRvU3RyaW5nLmNhbGwobyk7XG59XG5cbmZ1bmN0aW9uIHN1bSAobykge1xuICByZXR1cm4gcGFkKGZvbGRWYWx1ZSgwLCBvLCAnJywgW10pLnRvU3RyaW5nKDE2KSwgOCk7XG59XG5cbm1vZHVsZS5leHBvcnRzID0gc3VtO1xuIiwiJ3VzZSBzdHJpY3QnXG5cbnNldERPTS5LRVkgPSAnZGF0YS1rZXknXG5zZXRET00uSUdOT1JFID0gJ2RhdGEtaWdub3JlJ1xuc2V0RE9NLkNIRUNLU1VNID0gJ2RhdGEtY2hlY2tzdW0nXG52YXIgcGFyc2VIVE1MID0gcmVxdWlyZSgnLi9wYXJzZS1odG1sJylcbnZhciBLRVlfUFJFRklYID0gJ19zZXQtZG9tLSdcbnZhciBOT0RFX01PVU5URUQgPSBLRVlfUFJFRklYICsgJ21vdW50ZWQnXG52YXIgRUxFTUVOVF9UWVBFID0gMVxudmFyIERPQ1VNRU5UX1RZUEUgPSA5XG52YXIgRE9DVU1FTlRfRlJBR01FTlRfVFlQRSA9IDExXG5cbi8vIEV4cG9zZSBhcGkuXG5tb2R1bGUuZXhwb3J0cyA9IHNldERPTVxuXG4vKipcbiAqIEBkZXNjcmlwdGlvblxuICogVXBkYXRlcyBleGlzdGluZyBkb20gdG8gbWF0Y2ggYSBuZXcgZG9tLlxuICpcbiAqIEBwYXJhbSB7Tm9kZX0gb2xkTm9kZSAtIFRoZSBodG1sIGVudGl0eSB0byB1cGRhdGUuXG4gKiBAcGFyYW0ge1N0cmluZ3xOb2RlfSBuZXdOb2RlIC0gVGhlIHVwZGF0ZWQgaHRtbChlbnRpdHkpLlxuICovXG5mdW5jdGlvbiBzZXRET00gKG9sZE5vZGUsIG5ld05vZGUpIHtcbiAgLy8gRW5zdXJlIGEgcmVhbGlzaCBkb20gbm9kZSBpcyBwcm92aWRlZC5cbiAgYXNzZXJ0KG9sZE5vZGUgJiYgb2xkTm9kZS5ub2RlVHlwZSwgJ1lvdSBtdXN0IHByb3ZpZGUgYSB2YWxpZCBub2RlIHRvIHVwZGF0ZS4nKVxuXG4gIC8vIEFsaWFzIGRvY3VtZW50IGVsZW1lbnQgd2l0aCBkb2N1bWVudC5cbiAgaWYgKG9sZE5vZGUubm9kZVR5cGUgPT09IERPQ1VNRU5UX1RZUEUpIG9sZE5vZGUgPSBvbGROb2RlLmRvY3VtZW50RWxlbWVudFxuXG4gIC8vIERvY3VtZW50IEZyYWdtZW50cyBkb24ndCBoYXZlIGF0dHJpYnV0ZXMsIHNvIG5vIG5lZWQgdG8gbG9vayBhdCBjaGVja3N1bXMsIGlnbm9yZWQsIGF0dHJpYnV0ZXMsIG9yIG5vZGUgcmVwbGFjZW1lbnQuXG4gIGlmIChuZXdOb2RlLm5vZGVUeXBlID09PSBET0NVTUVOVF9GUkFHTUVOVF9UWVBFKSB7XG4gICAgLy8gU2ltcGx5IHVwZGF0ZSBhbGwgY2hpbGRyZW4gKGFuZCBzdWJjaGlsZHJlbikuXG4gICAgc2V0Q2hpbGROb2RlcyhvbGROb2RlLCBuZXdOb2RlKVxuICB9IGVsc2Uge1xuICAgIC8vIE90aGVyd2lzZSB3ZSBkaWZmIHRoZSBlbnRpcmUgb2xkIG5vZGUuXG4gICAgc2V0Tm9kZShvbGROb2RlLCB0eXBlb2YgbmV3Tm9kZSA9PT0gJ3N0cmluZydcbiAgICAgIC8vIElmIGEgc3RyaW5nIHdhcyBwcm92aWRlZCB3ZSB3aWxsIHBhcnNlIGl0IGFzIGRvbS5cbiAgICAgID8gcGFyc2VIVE1MKG5ld05vZGUsIG9sZE5vZGUubm9kZU5hbWUpXG4gICAgICA6IG5ld05vZGVcbiAgICApXG4gIH1cblxuICAvLyBUcmlnZ2VyIG1vdW50IGV2ZW50cyBvbiBpbml0aWFsIHNldC5cbiAgaWYgKCFvbGROb2RlW05PREVfTU9VTlRFRF0pIHtcbiAgICBvbGROb2RlW05PREVfTU9VTlRFRF0gPSB0cnVlXG4gICAgbW91bnQob2xkTm9kZSlcbiAgfVxufVxuXG4vKipcbiAqIEBwcml2YXRlXG4gKiBAZGVzY3JpcHRpb25cbiAqIFVwZGF0ZXMgYSBzcGVjaWZpYyBodG1sTm9kZSBhbmQgZG9lcyB3aGF0ZXZlciBpdCB0YWtlcyB0byBjb252ZXJ0IGl0IHRvIGFub3RoZXIgb25lLlxuICpcbiAqIEBwYXJhbSB7Tm9kZX0gb2xkTm9kZSAtIFRoZSBwcmV2aW91cyBIVE1MTm9kZS5cbiAqIEBwYXJhbSB7Tm9kZX0gbmV3Tm9kZSAtIFRoZSB1cGRhdGVkIEhUTUxOb2RlLlxuICovXG5mdW5jdGlvbiBzZXROb2RlIChvbGROb2RlLCBuZXdOb2RlKSB7XG4gIGlmIChvbGROb2RlLm5vZGVUeXBlID09PSBuZXdOb2RlLm5vZGVUeXBlKSB7XG4gICAgLy8gSGFuZGxlIHJlZ3VsYXIgZWxlbWVudCBub2RlIHVwZGF0ZXMuXG4gICAgaWYgKG9sZE5vZGUubm9kZVR5cGUgPT09IEVMRU1FTlRfVFlQRSkge1xuICAgICAgLy8gQ2hlY2tzIGlmIG5vZGVzIGFyZSBlcXVhbCBiZWZvcmUgZGlmZmluZy5cbiAgICAgIGlmIChpc0VxdWFsTm9kZShvbGROb2RlLCBuZXdOb2RlKSkgcmV0dXJuXG5cbiAgICAgIC8vIFVwZGF0ZSBhbGwgY2hpbGRyZW4gKGFuZCBzdWJjaGlsZHJlbikuXG4gICAgICBzZXRDaGlsZE5vZGVzKG9sZE5vZGUsIG5ld05vZGUpXG5cbiAgICAgIC8vIFVwZGF0ZSB0aGUgZWxlbWVudHMgYXR0cmlidXRlcyAvIHRhZ05hbWUuXG4gICAgICBpZiAob2xkTm9kZS5ub2RlTmFtZSA9PT0gbmV3Tm9kZS5ub2RlTmFtZSkge1xuICAgICAgICAvLyBJZiB3ZSBoYXZlIHRoZSBzYW1lIG5vZGVuYW1lIHRoZW4gd2UgY2FuIGRpcmVjdGx5IHVwZGF0ZSB0aGUgYXR0cmlidXRlcy5cbiAgICAgICAgc2V0QXR0cmlidXRlcyhvbGROb2RlLmF0dHJpYnV0ZXMsIG5ld05vZGUuYXR0cmlidXRlcylcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIC8vIE90aGVyd2lzZSBjbG9uZSB0aGUgbmV3IG5vZGUgdG8gdXNlIGFzIHRoZSBleGlzdGluZyBub2RlLlxuICAgICAgICB2YXIgbmV3UHJldiA9IG5ld05vZGUuY2xvbmVOb2RlKClcbiAgICAgICAgLy8gQ29weSBvdmVyIGFsbCBleGlzdGluZyBjaGlsZHJlbiBmcm9tIHRoZSBvcmlnaW5hbCBub2RlLlxuICAgICAgICB3aGlsZSAob2xkTm9kZS5maXJzdENoaWxkKSBuZXdQcmV2LmFwcGVuZENoaWxkKG9sZE5vZGUuZmlyc3RDaGlsZClcbiAgICAgICAgLy8gUmVwbGFjZSB0aGUgb3JpZ2luYWwgbm9kZSB3aXRoIHRoZSBuZXcgb25lIHdpdGggdGhlIHJpZ2h0IHRhZy5cbiAgICAgICAgb2xkTm9kZS5wYXJlbnROb2RlLnJlcGxhY2VDaGlsZChuZXdQcmV2LCBvbGROb2RlKVxuICAgICAgfVxuICAgIH0gZWxzZSB7XG4gICAgICAvLyBIYW5kbGUgb3RoZXIgdHlwZXMgb2Ygbm9kZSB1cGRhdGVzICh0ZXh0L2NvbW1lbnRzL2V0YykuXG4gICAgICAvLyBJZiBib3RoIGFyZSB0aGUgc2FtZSB0eXBlIG9mIG5vZGUgd2UgY2FuIHVwZGF0ZSBkaXJlY3RseS5cbiAgICAgIGlmIChvbGROb2RlLm5vZGVWYWx1ZSAhPT0gbmV3Tm9kZS5ub2RlVmFsdWUpIHtcbiAgICAgICAgb2xkTm9kZS5ub2RlVmFsdWUgPSBuZXdOb2RlLm5vZGVWYWx1ZVxuICAgICAgfVxuICAgIH1cbiAgfSBlbHNlIHtcbiAgICAvLyB3ZSBoYXZlIHRvIHJlcGxhY2UgdGhlIG5vZGUuXG4gICAgb2xkTm9kZS5wYXJlbnROb2RlLnJlcGxhY2VDaGlsZChuZXdOb2RlLCBkaXNtb3VudChvbGROb2RlKSlcbiAgICBtb3VudChuZXdOb2RlKVxuICB9XG59XG5cbi8qKlxuICogQHByaXZhdGVcbiAqIEBkZXNjcmlwdGlvblxuICogVXRpbGl0eSB0aGF0IHdpbGwgdXBkYXRlIG9uZSBsaXN0IG9mIGF0dHJpYnV0ZXMgdG8gbWF0Y2ggYW5vdGhlci5cbiAqXG4gKiBAcGFyYW0ge05hbWVkTm9kZU1hcH0gb2xkQXR0cmlidXRlcyAtIFRoZSBwcmV2aW91cyBhdHRyaWJ1dGVzLlxuICogQHBhcmFtIHtOYW1lZE5vZGVNYXB9IG5ld0F0dHJpYnV0ZXMgLSBUaGUgdXBkYXRlZCBhdHRyaWJ1dGVzLlxuICovXG5mdW5jdGlvbiBzZXRBdHRyaWJ1dGVzIChvbGRBdHRyaWJ1dGVzLCBuZXdBdHRyaWJ1dGVzKSB7XG4gIHZhciBpLCBhLCBiLCBucywgbmFtZVxuXG4gIC8vIFJlbW92ZSBvbGQgYXR0cmlidXRlcy5cbiAgZm9yIChpID0gb2xkQXR0cmlidXRlcy5sZW5ndGg7IGktLTspIHtcbiAgICBhID0gb2xkQXR0cmlidXRlc1tpXVxuICAgIG5zID0gYS5uYW1lc3BhY2VVUklcbiAgICBuYW1lID0gYS5sb2NhbE5hbWVcbiAgICBiID0gbmV3QXR0cmlidXRlcy5nZXROYW1lZEl0ZW1OUyhucywgbmFtZSlcbiAgICBpZiAoIWIpIG9sZEF0dHJpYnV0ZXMucmVtb3ZlTmFtZWRJdGVtTlMobnMsIG5hbWUpXG4gIH1cblxuICAvLyBTZXQgbmV3IGF0dHJpYnV0ZXMuXG4gIGZvciAoaSA9IG5ld0F0dHJpYnV0ZXMubGVuZ3RoOyBpLS07KSB7XG4gICAgYSA9IG5ld0F0dHJpYnV0ZXNbaV1cbiAgICBucyA9IGEubmFtZXNwYWNlVVJJXG4gICAgbmFtZSA9IGEubG9jYWxOYW1lXG4gICAgYiA9IG9sZEF0dHJpYnV0ZXMuZ2V0TmFtZWRJdGVtTlMobnMsIG5hbWUpXG4gICAgaWYgKCFiKSB7XG4gICAgICAvLyBBZGQgYSBuZXcgYXR0cmlidXRlLlxuICAgICAgbmV3QXR0cmlidXRlcy5yZW1vdmVOYW1lZEl0ZW1OUyhucywgbmFtZSlcbiAgICAgIG9sZEF0dHJpYnV0ZXMuc2V0TmFtZWRJdGVtTlMoYSlcbiAgICB9IGVsc2UgaWYgKGIudmFsdWUgIT09IGEudmFsdWUpIHtcbiAgICAgIC8vIFVwZGF0ZSBleGlzdGluZyBhdHRyaWJ1dGUuXG4gICAgICBiLnZhbHVlID0gYS52YWx1ZVxuICAgIH1cbiAgfVxufVxuXG4vKipcbiAqIEBwcml2YXRlXG4gKiBAZGVzY3JpcHRpb25cbiAqIFV0aWxpdHkgdGhhdCB3aWxsIG5vZGVzIGNoaWxkZXJuIHRvIG1hdGNoIGFub3RoZXIgbm9kZXMgY2hpbGRyZW4uXG4gKlxuICogQHBhcmFtIHtOb2RlfSBvbGRQYXJlbnQgLSBUaGUgZXhpc3RpbmcgcGFyZW50IG5vZGUuXG4gKiBAcGFyYW0ge05vZGV9IG5ld1BhcmVudCAtIFRoZSBuZXcgcGFyZW50IG5vZGUuXG4gKi9cbmZ1bmN0aW9uIHNldENoaWxkTm9kZXMgKG9sZFBhcmVudCwgbmV3UGFyZW50KSB7XG4gIHZhciBjaGVja09sZCwgb2xkS2V5LCBjaGVja05ldywgbmV3S2V5LCBmb3VuZE5vZGUsIGtleWVkTm9kZXNcbiAgdmFyIG9sZE5vZGUgPSBvbGRQYXJlbnQuZmlyc3RDaGlsZFxuICB2YXIgbmV3Tm9kZSA9IG5ld1BhcmVudC5maXJzdENoaWxkXG4gIHZhciBleHRyYSA9IDBcblxuICAvLyBFeHRyYWN0IGtleWVkIG5vZGVzIGZyb20gcHJldmlvdXMgY2hpbGRyZW4gYW5kIGtlZXAgdHJhY2sgb2YgdG90YWwgY291bnQuXG4gIHdoaWxlIChvbGROb2RlKSB7XG4gICAgZXh0cmErK1xuICAgIGNoZWNrT2xkID0gb2xkTm9kZVxuICAgIG9sZEtleSA9IGdldEtleShjaGVja09sZClcbiAgICBvbGROb2RlID0gb2xkTm9kZS5uZXh0U2libGluZ1xuXG4gICAgaWYgKG9sZEtleSkge1xuICAgICAgaWYgKCFrZXllZE5vZGVzKSBrZXllZE5vZGVzID0ge31cbiAgICAgIGtleWVkTm9kZXNbb2xkS2V5XSA9IGNoZWNrT2xkXG4gICAgfVxuICB9XG5cbiAgLy8gTG9vcCBvdmVyIG5ldyBub2RlcyBhbmQgcGVyZm9ybSB1cGRhdGVzLlxuICBvbGROb2RlID0gb2xkUGFyZW50LmZpcnN0Q2hpbGRcbiAgd2hpbGUgKG5ld05vZGUpIHtcbiAgICBleHRyYS0tXG4gICAgY2hlY2tOZXcgPSBuZXdOb2RlXG4gICAgbmV3Tm9kZSA9IG5ld05vZGUubmV4dFNpYmxpbmdcblxuICAgIGlmIChrZXllZE5vZGVzICYmIChuZXdLZXkgPSBnZXRLZXkoY2hlY2tOZXcpKSAmJiAoZm91bmROb2RlID0ga2V5ZWROb2Rlc1tuZXdLZXldKSkge1xuICAgICAgZGVsZXRlIGtleWVkTm9kZXNbbmV3S2V5XVxuICAgICAgLy8gSWYgd2UgaGF2ZSBhIGtleSBhbmQgaXQgZXhpc3RlZCBiZWZvcmUgd2UgbW92ZSB0aGUgcHJldmlvdXMgbm9kZSB0byB0aGUgbmV3IHBvc2l0aW9uIGlmIG5lZWRlZCBhbmQgZGlmZiBpdC5cbiAgICAgIGlmIChmb3VuZE5vZGUgIT09IG9sZE5vZGUpIHtcbiAgICAgICAgb2xkUGFyZW50Lmluc2VydEJlZm9yZShmb3VuZE5vZGUsIG9sZE5vZGUpXG4gICAgICB9IGVsc2Uge1xuICAgICAgICBvbGROb2RlID0gb2xkTm9kZS5uZXh0U2libGluZ1xuICAgICAgfVxuXG4gICAgICBzZXROb2RlKGZvdW5kTm9kZSwgY2hlY2tOZXcpXG4gICAgfSBlbHNlIGlmIChvbGROb2RlKSB7XG4gICAgICBjaGVja09sZCA9IG9sZE5vZGVcbiAgICAgIG9sZE5vZGUgPSBvbGROb2RlLm5leHRTaWJsaW5nXG4gICAgICBpZiAoZ2V0S2V5KGNoZWNrT2xkKSkge1xuICAgICAgICAvLyBJZiB0aGUgb2xkIGNoaWxkIGhhZCBhIGtleSB3ZSBza2lwIG92ZXIgaXQgdW50aWwgdGhlIGVuZC5cbiAgICAgICAgb2xkUGFyZW50Lmluc2VydEJlZm9yZShjaGVja05ldywgY2hlY2tPbGQpXG4gICAgICAgIG1vdW50KGNoZWNrTmV3KVxuICAgICAgfSBlbHNlIHtcbiAgICAgICAgLy8gT3RoZXJ3aXNlIHdlIGRpZmYgdGhlIHR3byBub24ta2V5ZWQgbm9kZXMuXG4gICAgICAgIHNldE5vZGUoY2hlY2tPbGQsIGNoZWNrTmV3KVxuICAgICAgfVxuICAgIH0gZWxzZSB7XG4gICAgICAvLyBGaW5hbGx5IGlmIHRoZXJlIHdhcyBubyBvbGQgbm9kZSB3ZSBhZGQgdGhlIG5ldyBub2RlLlxuICAgICAgb2xkUGFyZW50LmFwcGVuZENoaWxkKGNoZWNrTmV3KVxuICAgICAgbW91bnQoY2hlY2tOZXcpXG4gICAgfVxuICB9XG5cbiAgLy8gUmVtb3ZlIG9sZCBrZXllZCBub2Rlcy5cbiAgZm9yIChvbGRLZXkgaW4ga2V5ZWROb2Rlcykge1xuICAgIGV4dHJhLS1cbiAgICBvbGRQYXJlbnQucmVtb3ZlQ2hpbGQoZGlzbW91bnQoa2V5ZWROb2Rlc1tvbGRLZXldKSlcbiAgfVxuXG4gIC8vIElmIHdlIGhhdmUgYW55IHJlbWFpbmluZyB1bmtleWVkIG5vZGVzIHJlbW92ZSB0aGVtIGZyb20gdGhlIGVuZC5cbiAgd2hpbGUgKC0tZXh0cmEgPj0gMCkge1xuICAgIG9sZFBhcmVudC5yZW1vdmVDaGlsZChkaXNtb3VudChvbGRQYXJlbnQubGFzdENoaWxkKSlcbiAgfVxufVxuXG4vKipcbiAqIEBwcml2YXRlXG4gKiBAZGVzY3JpcHRpb25cbiAqIFV0aWxpdHkgdG8gdHJ5IHRvIHB1bGwgYSBrZXkgb3V0IG9mIGFuIGVsZW1lbnQuXG4gKiBVc2VzICdkYXRhLWtleScgaWYgcG9zc2libGUgYW5kIGZhbGxzIGJhY2sgdG8gJ2lkJy5cbiAqXG4gKiBAcGFyYW0ge05vZGV9IG5vZGUgLSBUaGUgbm9kZSB0byBnZXQgdGhlIGtleSBmb3IuXG4gKiBAcmV0dXJuIHtzdHJpbmd8dm9pZH1cbiAqL1xuZnVuY3Rpb24gZ2V0S2V5IChub2RlKSB7XG4gIGlmIChub2RlLm5vZGVUeXBlICE9PSBFTEVNRU5UX1RZUEUpIHJldHVyblxuICB2YXIga2V5ID0gbm9kZS5nZXRBdHRyaWJ1dGUoc2V0RE9NLktFWSkgfHwgbm9kZS5pZFxuICBpZiAoa2V5KSByZXR1cm4gS0VZX1BSRUZJWCArIGtleVxufVxuXG4vKipcbiAqIENoZWNrcyBpZiBub2RlcyBhcmUgZXF1YWwgdXNpbmcgdGhlIGZvbGxvd2luZyBieSBjaGVja2luZyBpZlxuICogdGhleSBhcmUgYm90aCBpZ25vcmVkLCBoYXZlIHRoZSBzYW1lIGNoZWNrc3VtLCBvciBoYXZlIHRoZVxuICogc2FtZSBjb250ZW50cy5cbiAqXG4gKiBAcGFyYW0ge05vZGV9IGEgLSBPbmUgb2YgdGhlIG5vZGVzIHRvIGNvbXBhcmUuXG4gKiBAcGFyYW0ge05vZGV9IGIgLSBBbm90aGVyIG5vZGUgdG8gY29tcGFyZS5cbiAqL1xuZnVuY3Rpb24gaXNFcXVhbE5vZGUgKGEsIGIpIHtcbiAgcmV0dXJuIChcbiAgICAvLyBDaGVjayBpZiBib3RoIG5vZGVzIGFyZSBpZ25vcmVkLlxuICAgIChpc0lnbm9yZWQoYSkgJiYgaXNJZ25vcmVkKGIpKSB8fFxuICAgIC8vIENoZWNrIGlmIGJvdGggbm9kZXMgaGF2ZSB0aGUgc2FtZSBjaGVja3N1bS5cbiAgICAoZ2V0Q2hlY2tTdW0oYSkgPT09IGdldENoZWNrU3VtKGIpKSB8fFxuICAgIC8vIEZhbGwgYmFjayB0byBuYXRpdmUgaXNFcXVhbE5vZGUgY2hlY2suXG4gICAgYS5pc0VxdWFsTm9kZShiKVxuICApXG59XG5cbi8qKlxuICogQHByaXZhdGVcbiAqIEBkZXNjcmlwdGlvblxuICogVXRpbGl0eSB0byB0cnkgdG8gcHVsbCBhIGNoZWNrc3VtIGF0dHJpYnV0ZSBmcm9tIGFuIGVsZW1lbnQuXG4gKiBVc2VzICdkYXRhLWNoZWNrc3VtJyBvciB1c2VyIHNwZWNpZmllZCBjaGVja3N1bSBwcm9wZXJ0eS5cbiAqXG4gKiBAcGFyYW0ge05vZGV9IG5vZGUgLSBUaGUgbm9kZSB0byBnZXQgdGhlIGNoZWNrc3VtIGZvci5cbiAqIEByZXR1cm4ge3N0cmluZ3xOYU59XG4gKi9cbmZ1bmN0aW9uIGdldENoZWNrU3VtIChub2RlKSB7XG4gIHJldHVybiBub2RlLmdldEF0dHJpYnV0ZShzZXRET00uQ0hFQ0tTVU0pIHx8IE5hTlxufVxuXG4vKipcbiAqIEBwcml2YXRlXG4gKiBAZGVzY3JpcHRpb25cbiAqIFV0aWxpdHkgdG8gdHJ5IHRvIGNoZWNrIGlmIGFuIGVsZW1lbnQgc2hvdWxkIGJlIGlnbm9yZWQgYnkgdGhlIGFsZ29yaXRobS5cbiAqIFVzZXMgJ2RhdGEtaWdub3JlJyBvciB1c2VyIHNwZWNpZmllZCBpZ25vcmUgcHJvcGVydHkuXG4gKlxuICogQHBhcmFtIHtOb2RlfSBub2RlIC0gVGhlIG5vZGUgdG8gY2hlY2sgaWYgaXQgc2hvdWxkIGJlIGlnbm9yZWQuXG4gKiBAcmV0dXJuIHtib29sZWFufVxuICovXG5mdW5jdGlvbiBpc0lnbm9yZWQgKG5vZGUpIHtcbiAgcmV0dXJuIG5vZGUuZ2V0QXR0cmlidXRlKHNldERPTS5JR05PUkUpICE9IG51bGxcbn1cblxuLyoqXG4gKiBEaXNwYXRjaGVzIGEgbW91bnQgZXZlbnQgZm9yIHRoZSBnaXZlbiBub2RlIGFuZCBjaGlsZHJlbi5cbiAqXG4gKiBAcGFyYW0ge05vZGV9IG5vZGUgLSB0aGUgbm9kZSB0byBtb3VudC5cbiAqIEByZXR1cm4ge25vZGV9XG4gKi9cbmZ1bmN0aW9uIG1vdW50IChub2RlKSB7XG4gIHJldHVybiBkaXNwYXRjaChub2RlLCAnbW91bnQnKVxufVxuXG4vKipcbiAqIERpc3BhdGNoZXMgYSBkaXNtb3VudCBldmVudCBmb3IgdGhlIGdpdmVuIG5vZGUgYW5kIGNoaWxkcmVuLlxuICpcbiAqIEBwYXJhbSB7Tm9kZX0gbm9kZSAtIHRoZSBub2RlIHRvIGRpc21vdW50LlxuICogQHJldHVybiB7bm9kZX1cbiAqL1xuZnVuY3Rpb24gZGlzbW91bnQgKG5vZGUpIHtcbiAgcmV0dXJuIGRpc3BhdGNoKG5vZGUsICdkaXNtb3VudCcpXG59XG5cbi8qKlxuICogUmVjdXJzaXZlbHkgdHJpZ2dlciBhbiBldmVudCBmb3IgYSBub2RlIGFuZCBpdCdzIGNoaWxkcmVuLlxuICogT25seSBlbWl0cyBldmVudHMgZm9yIGtleWVkIG5vZGVzLlxuICpcbiAqIEBwYXJhbSB7Tm9kZX0gbm9kZSAtIHRoZSBpbml0aWFsIG5vZGUuXG4gKiBAcmV0dXJuIHtOb2RlfVxuICovXG5mdW5jdGlvbiBkaXNwYXRjaCAobm9kZSwgdHlwZSkge1xuICAvLyBUcmlnZ2VyIGV2ZW50IGZvciB0aGlzIGVsZW1lbnQgaWYgaXQgaGFzIGEga2V5LlxuICBpZiAoZ2V0S2V5KG5vZGUpKSB7XG4gICAgdmFyIGV2ID0gZG9jdW1lbnQuY3JlYXRlRXZlbnQoJ0V2ZW50JylcbiAgICB2YXIgcHJvcCA9IHsgdmFsdWU6IG5vZGUgfVxuICAgIGV2LmluaXRFdmVudCh0eXBlLCBmYWxzZSwgZmFsc2UpXG4gICAgT2JqZWN0LmRlZmluZVByb3BlcnR5KGV2LCAndGFyZ2V0JywgcHJvcClcbiAgICBPYmplY3QuZGVmaW5lUHJvcGVydHkoZXYsICdzcmNFbGVtZW50JywgcHJvcClcbiAgICBub2RlLmRpc3BhdGNoRXZlbnQoZXYpXG4gIH1cblxuICAvLyBEaXNwYXRjaCB0byBhbGwgY2hpbGRyZW4uXG4gIHZhciBjaGlsZCA9IG5vZGUuZmlyc3RDaGlsZFxuICB3aGlsZSAoY2hpbGQpIGNoaWxkID0gZGlzcGF0Y2goY2hpbGQsIHR5cGUpLm5leHRTaWJsaW5nXG4gIHJldHVybiBub2RlXG59XG5cbi8qKlxuICogQHByaXZhdGVcbiAqIEBkZXNjcmlwdGlvblxuICogQ29uZmlybSB0aGF0IGEgdmFsdWUgaXMgdHJ1dGh5LCB0aHJvd3MgYW4gZXJyb3IgbWVzc2FnZSBvdGhlcndpc2UuXG4gKlxuICogQHBhcmFtIHsqfSB2YWwgLSB0aGUgdmFsIHRvIHRlc3QuXG4gKiBAcGFyYW0ge3N0cmluZ30gbXNnIC0gdGhlIGVycm9yIG1lc3NhZ2Ugb24gZmFpbHVyZS5cbiAqIEB0aHJvd3Mge0Vycm9yfVxuICovXG5mdW5jdGlvbiBhc3NlcnQgKHZhbCwgbXNnKSB7XG4gIGlmICghdmFsKSB0aHJvdyBuZXcgRXJyb3IoJ3NldC1kb206ICcgKyBtc2cpXG59XG4iLCIndXNlIHN0cmljdCdcbnZhciBwYXJzZXIgPSB3aW5kb3cuRE9NUGFyc2VyICYmIG5ldyB3aW5kb3cuRE9NUGFyc2VyKClcbnZhciBkb2N1bWVudFJvb3ROYW1lID0gJ0hUTUwnXG52YXIgc3VwcG9ydHNIVE1MVHlwZSA9IGZhbHNlXG52YXIgc3VwcG9ydHNJbm5lckhUTUwgPSBmYWxzZVxudmFyIGh0bWxUeXBlID0gJ3RleHQvaHRtbCdcbnZhciB4aHRtbFR5cGUgPSAnYXBwbGljYXRpb24veGh0bWwreG1sJ1xudmFyIHRlc3RDbGFzcyA9ICdBJ1xudmFyIHRlc3RDb2RlID0gJzx3YnIgY2xhc3M9XCInICsgdGVzdENsYXNzICsgJ1wiLz4nXG5cbnRyeSB7XG4gIC8vIENoZWNrIGlmIGJyb3dzZXIgc3VwcG9ydHMgdGV4dC9odG1sIERPTVBhcnNlclxuICB2YXIgcGFyc2VkID0gcGFyc2VyLnBhcnNlRnJvbVN0cmluZyh0ZXN0Q29kZSwgaHRtbFR5cGUpLmJvZHkuZmlyc3RDaGlsZFxuICAvLyBTb21lIGJyb3dzZXJzIChpT1MgOSBhbmQgU2FmYXJpIDkpIGxvd2VyY2FzZSBjbGFzc2VzIGZvciBwYXJzZWQgZWxlbWVudHNcbiAgLy8gYnV0IG9ubHkgd2hlbiBhcHBlbmRpbmcgdG8gRE9NLCBzbyB1c2UgaW5uZXJIVE1MIGluc3RlYWRcbiAgdmFyIGQgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdkaXYnKVxuICBkLmFwcGVuZENoaWxkKHBhcnNlZClcbiAgaWYgKGQuZmlyc3RDaGlsZC5jbGFzc0xpc3RbMF0gIT09IHRlc3RDbGFzcykgdGhyb3cgbmV3IEVycm9yKClcbiAgc3VwcG9ydHNIVE1MVHlwZSA9IHRydWVcbn0gY2F0Y2ggKGUpIHt9XG5cbnZhciBtb2NrRG9jID0gZG9jdW1lbnQuaW1wbGVtZW50YXRpb24uY3JlYXRlSFRNTERvY3VtZW50KCcnKVxudmFyIG1vY2tIVE1MID0gbW9ja0RvYy5kb2N1bWVudEVsZW1lbnRcbnZhciBtb2NrQm9keSA9IG1vY2tEb2MuYm9keVxudHJ5IHtcbiAgLy8gQ2hlY2sgaWYgYnJvd3NlciBzdXBwb3J0cyBkb2N1bWVudEVsZW1lbnQuaW5uZXJIVE1MXG4gIG1vY2tIVE1MLmlubmVySFRNTCArPSAnJ1xuICBzdXBwb3J0c0lubmVySFRNTCA9IHRydWVcbn0gY2F0Y2ggKGUpIHtcbiAgLy8gQ2hlY2sgaWYgYnJvd3NlciBzdXBwb3J0cyB4aHRtbCBwYXJzaW5nLlxuICBwYXJzZXIucGFyc2VGcm9tU3RyaW5nKHRlc3RDb2RlLCB4aHRtbFR5cGUpXG4gIHZhciBib2R5UmVnID0gLyg8Ym9keVtePl0qPikoW1xcc1xcU10qKTxcXC9ib2R5Pi9cbn1cblxuZnVuY3Rpb24gRE9NUGFyc2VyUGFyc2UgKG1hcmt1cCwgcm9vdE5hbWUpIHtcbiAgdmFyIGRvYyA9IHBhcnNlci5wYXJzZUZyb21TdHJpbmcobWFya3VwLCBodG1sVHlwZSlcbiAgLy8gUGF0Y2ggZm9yIGlPUyBVSVdlYlZpZXcgbm90IGFsd2F5cyByZXR1cm5pbmcgZG9jLmJvZHkgc3luY2hyb25vdXNseVxuICBpZiAoIWRvYy5ib2R5KSB7IHJldHVybiBmYWxsYmFja1BhcnNlKG1hcmt1cCwgcm9vdE5hbWUpIH1cblxuICByZXR1cm4gcm9vdE5hbWUgPT09IGRvY3VtZW50Um9vdE5hbWVcbiAgICA/IGRvYy5kb2N1bWVudEVsZW1lbnRcbiAgICA6IGRvYy5ib2R5LmZpcnN0Q2hpbGRcbn1cblxuZnVuY3Rpb24gZmFsbGJhY2tQYXJzZSAobWFya3VwLCByb290TmFtZSkge1xuICAvLyBGYWxsYmFjayB0byBpbm5lckhUTUwgZm9yIG90aGVyIG9sZGVyIGJyb3dzZXJzLlxuICBpZiAocm9vdE5hbWUgPT09IGRvY3VtZW50Um9vdE5hbWUpIHtcbiAgICBpZiAoc3VwcG9ydHNJbm5lckhUTUwpIHtcbiAgICAgIG1vY2tIVE1MLmlubmVySFRNTCA9IG1hcmt1cFxuICAgICAgcmV0dXJuIG1vY2tIVE1MXG4gICAgfSBlbHNlIHtcbiAgICAgIC8vIElFOSBkb2VzIG5vdCBzdXBwb3J0IGlubmVyaHRtbCBhdCByb290IGxldmVsLlxuICAgICAgLy8gV2UgZ2V0IGFyb3VuZCB0aGlzIGJ5IHBhcnNpbmcgZXZlcnl0aGluZyBleGNlcHQgdGhlIGJvZHkgYXMgeGh0bWwuXG4gICAgICB2YXIgYm9keU1hdGNoID0gbWFya3VwLm1hdGNoKGJvZHlSZWcpXG4gICAgICBpZiAoYm9keU1hdGNoKSB7XG4gICAgICAgIHZhciBib2R5Q29udGVudCA9IGJvZHlNYXRjaFsyXVxuICAgICAgICB2YXIgc3RhcnRCb2R5ID0gYm9keU1hdGNoLmluZGV4ICsgYm9keU1hdGNoWzFdLmxlbmd0aFxuICAgICAgICB2YXIgZW5kQm9keSA9IHN0YXJ0Qm9keSArIGJvZHlDb250ZW50Lmxlbmd0aFxuICAgICAgICBtYXJrdXAgPSBtYXJrdXAuc2xpY2UoMCwgc3RhcnRCb2R5KSArIG1hcmt1cC5zbGljZShlbmRCb2R5KVxuICAgICAgICBtb2NrQm9keS5pbm5lckhUTUwgPSBib2R5Q29udGVudFxuICAgICAgfVxuXG4gICAgICB2YXIgZG9jID0gcGFyc2VyLnBhcnNlRnJvbVN0cmluZyhtYXJrdXAsIHhodG1sVHlwZSlcbiAgICAgIHZhciBib2R5ID0gZG9jLmJvZHlcbiAgICAgIHdoaWxlIChtb2NrQm9keS5maXJzdENoaWxkKSBib2R5LmFwcGVuZENoaWxkKG1vY2tCb2R5LmZpcnN0Q2hpbGQpXG4gICAgICByZXR1cm4gZG9jLmRvY3VtZW50RWxlbWVudFxuICAgIH1cbiAgfSBlbHNlIHtcbiAgICBtb2NrQm9keS5pbm5lckhUTUwgPSBtYXJrdXBcbiAgICByZXR1cm4gbW9ja0JvZHkuZmlyc3RDaGlsZFxuICB9XG59XG5cbi8qKlxuICogUmV0dXJucyB0aGUgcmVzdWx0cyBvZiBhIERPTVBhcnNlciBhcyBhbiBIVE1MRWxlbWVudC5cbiAqIChTaGltcyBmb3Igb2xkZXIgYnJvd3NlcnMpLlxuICovXG5tb2R1bGUuZXhwb3J0cyA9IHN1cHBvcnRzSFRNTFR5cGVcbiAgPyBET01QYXJzZXJQYXJzZVxuICA6IGZhbGxiYWNrUGFyc2VcbiIsImNvbnN0IEtlZXQgPSByZXF1aXJlKCcuLi9rZWV0JylcclxuY29uc3QgeyBjYW1lbENhc2UsIGh0bWwgfSA9IHJlcXVpcmUoJy4vdXRpbCcpXHJcbmNvbnN0IHRvZG9BcHAgPSByZXF1aXJlKCcuL3RvZG8nKVxyXG5jb25zdCBmaWx0ZXJQYWdlID0gWydhbGwnLCAnYWN0aXZlJywgJ2NvbXBsZXRlZCddXHJcbmNvbnN0IGZpbHRlcnNUbXBsID0gcmVxdWlyZSgnLi9maWx0ZXJzJykoZmlsdGVyUGFnZSlcclxuXHJcbmNsYXNzIEFwcCBleHRlbmRzIEtlZXQge1xyXG5cclxuICBwYWdlID0gJ0FsbCdcclxuICBpc0NoZWNrZWQgPSBmYWxzZVxyXG4gIGNvdW50ID0gMFxyXG4gIHBsdXJhbCA9ICcnXHJcbiAgY2xlYXJUb2dnbGUgPSBmYWxzZVxyXG5cclxuICBjb21wb25lbnRXaWxsTW91bnQoKSB7XHJcbiAgICBmaWx0ZXJQYWdlLm1hcChmID0+IHRoaXNbYHBhZ2Uke2NhbWVsQ2FzZShmKX1gXSA9ICcnKVxyXG4gICAgdG9kb0FwcC5zdWJzY3JpYmUoIHN0b3JlID0+IHtcclxuICAgICAgbGV0IGMgPSBzdG9yZS5maWx0ZXIoYyA9PiAhYy5jb21wbGV0ZWQpXHJcbiAgICAgIGxldCBjYyA9IHN0b3JlLmZpbHRlcihjID0+IGMuY29tcGxldGVkKVxyXG4gICAgICB0aGlzLmNsZWFyVG9nZ2xlID0gY2MubGVuZ3RoID8gdHJ1ZSA6IGZhbHNlXHJcbiAgICAgIHRoaXMudG9kb1N0YXRlID0gc3RvcmUubGVuZ3RoID8gdHJ1ZSA6IGZhbHNlXHJcbiAgICAgIHRoaXMucGx1cmFsID0gYy5sZW5ndGggPT09IDEgPyAnJyA6ICdzJ1xyXG4gICAgICB0aGlzLmNvdW50ID0gYy5sZW5ndGhcclxuICAgIH0pXHJcbiAgfVxyXG4gIGNvbXBvbmVudERpZE1vdW50KCl7XHJcbiAgICBpZiAod2luZG93LmxvY2F0aW9uLmhhc2ggPT0gJycpIHtcclxuICAgICAgdGhpcy51cGRhdGVVcmwoJyMvYWxsJylcclxuICAgICAgd2luZG93Lmhpc3RvcnkucHVzaFN0YXRlKHt9LCBudWxsLCAnIy9hbGwnKVxyXG4gICAgfVxyXG4gICAgd2luZG93Lm9ucG9wc3RhdGUgPSAoKSA9PiB0aGlzLnVwZGF0ZVVybCh3aW5kb3cubG9jYXRpb24uaGFzaClcclxuICB9XHJcblxyXG4gIHVwZGF0ZVVybChoYXNoKSB7XHJcbiAgICBmaWx0ZXJQYWdlLm1hcChmID0+IHtcclxuICAgICAgdGhpc1tgY18ke2Z9YF0gPSBoYXNoLnNwbGl0KCcjLycpWzFdID09PSBmID8gJ3NlbGVjdGVkJyA6ICcnXHJcbiAgICAgIGlmKGhhc2guc3BsaXQoJyMvJylbMV0gPT09IGYpIHRoaXMucGFnZSA9IGYubmFtZVxyXG4gICAgfSlcclxuICB9XHJcblxyXG4gIGNyZWF0ZSAoZXZ0KSB7XHJcbiAgICBpZihldnQua2V5Q29kZSAhPT0gMTMpIHJldHVyblxyXG4gICAgdG9kb0FwcC5hZGRUb2RvKGV2dC50YXJnZXQudmFsdWUudHJpbSgpKVxyXG4gICAgZXZ0LnRhcmdldC52YWx1ZSA9ICcnXHJcbiAgfVxyXG5cclxuICBjb21wbGV0ZUFsbCgpe1xyXG4gICAgdGhpcy5pc0NoZWNrZWQgPSAhdGhpcy5pc0NoZWNrZWRcclxuICAgIHRvZG9BcHAudXBkYXRlQWxsKHRoaXMuaXNDaGVja2VkKVxyXG4gIH1cclxuXHJcbiAgY2xlYXJDb21wbGV0ZWQoKSB7XHJcbiAgICBjb25zb2xlLmxvZygnZG8nKVxyXG4gICAgdG9kb0FwcC5jbGVhckNvbXBsZXRlZCgpXHJcbiAgfVxyXG59XHJcblxyXG5jb25zdCB2bW9kZWwgPSBodG1sYFxyXG4gIDxzZWN0aW9uIGlkPVwidG9kb2FwcFwiPlxyXG4gICAgPGhlYWRlciBpZD1cImhlYWRlclwiPlxyXG4gICAgICA8aDE+dG9kb3M8L2gxPlxyXG4gICAgICA8aW5wdXQgaWQ9XCJuZXctdG9kb1wiIGsta2V5ZG93bj1cImNyZWF0ZSgpXCIgcGxhY2Vob2xkZXI9XCJXaGF0IG5lZWRzIHRvIGJlIGRvbmU/XCIgYXV0b2ZvY3VzPlxyXG4gICAgPC9oZWFkZXI+XHJcbiAgICB7ez90b2RvU3RhdGV9fVxyXG4gICAgPHNlY3Rpb24gaWQ9XCJtYWluXCI+XHJcbiAgICAgIDxpbnB1dCBpZD1cInRvZ2dsZS1hbGxcIiB0eXBlPVwiY2hlY2tib3hcIiB7e2lzQ2hlY2tlZD9jaGVja2VkOicnfX0gay1jbGljaz1cImNvbXBsZXRlQWxsKClcIj5cclxuICAgICAgPGxhYmVsIGZvcj1cInRvZ2dsZS1hbGxcIj5NYXJrIGFsbCBhcyBjb21wbGV0ZTwvbGFiZWw+XHJcbiAgICAgIDx1bCBpZD1cInRvZG8tbGlzdFwiIGRhdGEtaWdub3JlPjwvdWw+XHJcbiAgICA8L3NlY3Rpb24+XHJcbiAgICA8Zm9vdGVyIGlkPVwiZm9vdGVyXCI+XHJcbiAgICAgIDxzcGFuIGlkPVwidG9kby1jb3VudFwiPlxyXG4gICAgICAgIDxzdHJvbmc+e3tjb3VudH19PC9zdHJvbmc+IGl0ZW17e3BsdXJhbH19IGxlZnRcclxuICAgICAgPC9zcGFuPlxyXG4gICAgICA8dWwgaWQ9XCJmaWx0ZXJzXCI+XHJcbiAgICAgICAgJHtmaWx0ZXJzVG1wbH1cclxuICAgICAgPC91bD5cclxuICAgICAge3s/Y2xlYXJUb2dnbGV9fVxyXG4gICAgICA8YnV0dG9uIGlkPVwiY2xlYXItY29tcGxldGVkXCIgay1jbGlja2VkPVwiY2xlYXJDb21wbGV0ZWQoKVwiPkNsZWFyIGNvbXBsZXRlZDwvYnV0dG9uPlxyXG4gICAgICB7ey9jbGVhclRvZ2dsZX19XHJcbiAgICA8L2Zvb3Rlcj5cclxuICAgIHt7L3RvZG9TdGF0ZX19XHJcbiAgPC9zZWN0aW9uPlxyXG4gIDxmb290ZXIgaWQ9XCJpbmZvXCI+XHJcbiAgICA8cD5Eb3VibGUtY2xpY2sgdG8gZWRpdCBhIHRvZG88L3A+XHJcbiAgICA8cD5DcmVhdGVkIGJ5IDxhIGhyZWY9XCJodHRwczovL2dpdGh1Yi5jb20vc3lhcnVsXCI+U2hhaHJ1bCBOaXphbSBTZWxhbWF0PC9hPjwvcD5cclxuICAgIDxwPlBhcnQgb2YgPGEgaHJlZj1cImh0dHA6Ly90b2RvbXZjLmNvbVwiPlRvZG9NVkM8L2E+PC9wPlxyXG4gIDwvZm9vdGVyPmBcclxuXHJcbmNvbnN0IGFwcCA9IG5ldyBBcHAoKVxyXG5cclxuYXBwLm1vdW50KHZtb2RlbCkubGluaygndG9kbycpXHJcbiIsImNvbnN0IHsgY2FtZWxDYXNlLCBodG1sIH0gPSByZXF1aXJlKCcuL3V0aWwnKVxyXG5cclxubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbihmaWx0ZXJQYWdlKSB7XHJcbiAgbGV0IHN0ciA9ICcnXHJcbiAgY29uc3QgZmlsdGVycyA9IHBhZ2UgPT4ge1xyXG4gICAgbGV0IGYgPSB7XHJcbiAgICAgIGNsYXNzTmFtZTogYHt7cGFnZSR7Y2FtZWxDYXNlKHBhZ2UpfX19YCxcclxuICAgICAgaGFzaDogJyMvJyArIHBhZ2UsXHJcbiAgICAgIG5hbWU6IGNhbWVsQ2FzZShwYWdlKVxyXG4gICAgfVxyXG4gICAgc3RyICs9IGh0bWxgPGxpIGstY2xpY2s9XCJ1cGRhdGVVcmwoJHtmLmhhc2h9KVwiPjxhIGNsYXNzPVwiJHtmLmNsYXNzTmFtZX1cIiBocmVmPVwiJHtmLmhhc2h9XCI+JHtmLm5hbWV9PC9hPjwvbGk+YFxyXG4gIH1cclxuICBmaWx0ZXJQYWdlLm1hcChwYWdlID0+IGZpbHRlcnMocGFnZSkpXHJcbiAgcmV0dXJuIHN0clxyXG59XHJcbiIsImNvbnN0IEtlZXQgPSByZXF1aXJlKCcuLi9rZWV0JylcclxuY29uc3QgeyBzdG9yZSwgZ2VuSWQsIGh0bWwsIGludGVsbGlVcGRhdGUgfSA9IHJlcXVpcmUoJy4vdXRpbCcpXHJcblxyXG5jb25zdCBsb2cgPSBjb25zb2xlLmxvZy5iaW5kKGNvbnNvbGUpXHJcblxyXG4vLyBsb2coaW50ZWxsaVVwZGF0ZSlcclxuXHJcbi8vIGludGVsbGlVcGRhdGUoZnVuY3Rpb24oKXtcclxuLy8gICBjb25zb2xlLmxvZygxKVxyXG4vLyB9KVxyXG5cclxubGV0IG9uQ2hhbmdlcyA9IFtdXHJcblxyXG4vLyBsZXQgZmxhZyA9IGZhbHNlXHJcblxyXG5mdW5jdGlvbiBpbmZvcm0gKCkge1xyXG4gIGZvciAobGV0IGkgPSBvbkNoYW5nZXMubGVuZ3RoOyBpLS07KSB7XHJcbiAgICAvLyBpZihmbGFnKSBcclxuICAgIG9uQ2hhbmdlc1tpXSh0aGlzLmJhc2UubW9kZWwpXHJcbiAgfVxyXG59XHJcblxyXG5jbGFzcyBUb2RvQXBwIGV4dGVuZHMgS2VldCB7XHJcbiAgXHJcbiAgYXJncyA9IFtdLnNsaWNlLmNhbGwoYXJndW1lbnRzKVxyXG4gIFxyXG4gIGVsID0gJ3RvZG8tbGlzdCdcclxuXHJcbiAgYWRkVG9kbyAodGl0bGUpIHtcclxuICAgIGxldCBtID0ge1xyXG4gICAgICB0aXRsZSxcclxuICAgICAgY29tcGxldGVkOiBmYWxzZVxyXG4gICAgfVxyXG4gICAgdGhpcy5hZGQobSwgaW5mb3JtKVxyXG4gIH1cclxuXHJcbiAgdXBkYXRlQWxsKGNoZWNrZWQpIHtcclxuICAgIHRoaXMuYmFzZS5tb2RlbC5tYXAobW9kZWwgPT4ge1xyXG4gICAgICB0aGlzLnVwZGF0ZShtb2RlbFsna2VldC1pZCddLCAna2VldC1pZCcsIHsgY29tcGxldGVkOiBjaGVja2VkIH0pXHJcbiAgICB9KVxyXG4gICAgaW5mb3JtLmNhbGwodGhpcylcclxuICB9XHJcblxyXG4gIGNsZWFyQ29tcGxldGVkKCl7XHJcbiAgICBjb25zb2xlLmxvZygnY2xlYXJDb21wbGV0ZWQnKVxyXG4gIH1cclxuXHJcbiAgZWRpdE1vZGUoaWQpIHtcclxuICAgIC8vIEFwcC5lZGl0VG9kb3MoaWQsIHRoaXMpXHJcbiAgfVxyXG4gIHRvZG9EZXN0cm95KGlkLCBldnQpIHtcclxuICAgIC8vIHRoaXMuZGVzdHJveShpZCwgJ2tlZXQtaWQnLCBldnQudGFyZ2V0LnBhcmVudE5vZGUucGFyZW50Tm9kZSlcclxuICAgIC8vIEFwcC50b2RvRGVzdHJveSgpXHJcbiAgfVxyXG4gIHRvZ2dsZVRvZG8oaWQsIGV2dCkge1xyXG4gICAgdGhpcy51cGRhdGUoaWQsICdrZWV0LWlkJywgeyBjb21wbGV0ZWQ6IGV2dC50YXJnZXQuY2hlY2tlZCA/IHRydWUgOiBmYWxzZSB9LCBpbmZvcm0pXHJcbiAgfVxyXG5cclxuICBzdWJzY3JpYmUgKGZuKSB7XHJcbiAgICBvbkNoYW5nZXMucHVzaChmbilcclxuICB9XHJcbn1cclxuXHJcbmNvbnN0IHRvZG9BcHAgPSBuZXcgVG9kb0FwcCgpXHJcblxyXG5jb25zdCB2bW9kZWwgPSB7XHJcbiAgdGVtcGxhdGU6IGh0bWxgXHJcblx0PGxpIGstZGJsY2xpY2s9XCJlZGl0TW9kZSh7e2tlZXQtaWR9fSlcIiBjbGFzcz1cInt7Y29tcGxldGVkP2NvbXBsZXRlZDonJ319XCI+XHJcblx0XHQ8ZGl2IGNsYXNzPVwidmlld1wiPjxpbnB1dCBrLWNsaWNrPVwidG9nZ2xlVG9kbyh7e2tlZXQtaWR9fSlcIiBjbGFzcz1cInRvZ2dsZVwiIHR5cGU9XCJjaGVja2JveFwiIHt7Y29tcGxldGVkP2NoZWNrZWQ6Jyd9fT5cclxuXHRcdFx0PGxhYmVsPnt7dGl0bGV9fTwvbGFiZWw+XHJcblx0XHRcdDxidXR0b24gay1jbGljaz1cInRvZG9EZXN0cm95KHt7a2VldC1pZH19KVwiIGNsYXNzPVwiZGVzdHJveVwiPjwvYnV0dG9uPlxyXG5cdFx0PC9kaXY+XHJcblx0XHQ8aW5wdXQgY2xhc3M9XCJlZGl0XCIgdmFsdWU9XCJ7e3RpdGxlfX1cIj5cclxuXHQ8L2xpPmAsXHJcbiAgbW9kZWw6IHN0b3JlKCd0b2Rvcy1rZWV0anMnKVxyXG59XHJcblxyXG50b2RvQXBwLm1vdW50KHZtb2RlbClcclxuXHJcbi8vIGNvbnNvbGUubG9nKHRvZG9BcHApXHJcblxyXG5tb2R1bGUuZXhwb3J0cyA9IHRvZG9BcHAiLCJleHBvcnRzLmluZm9ybSA9IGZ1bmN0aW9uKGJhc2UsIGlucHV0KSB7XHJcbiAgZm9yICh2YXIgaSA9IGJhc2Uub25DaGFuZ2VzLmxlbmd0aDsgaS0tOykge1xyXG4gICAgYmFzZS5vbkNoYW5nZXNbaV0oaW5wdXQpXHJcbiAgfVxyXG59XHJcblxyXG5leHBvcnRzLnN0b3JlID0gZnVuY3Rpb24obmFtZXNwYWNlLCBkYXRhKSB7XHJcbiAgaWYgKGFyZ3VtZW50cy5sZW5ndGggPiAxKSB7XHJcbiAgICByZXR1cm4gbG9jYWxTdG9yYWdlLnNldEl0ZW0obmFtZXNwYWNlLCBKU09OLnN0cmluZ2lmeShkYXRhKSlcclxuICB9IGVsc2Uge1xyXG4gICAgdmFyIHN0b3JlID0gbG9jYWxTdG9yYWdlLmdldEl0ZW0obmFtZXNwYWNlKVxyXG4gICAgcmV0dXJuIHN0b3JlICYmIEpTT04ucGFyc2Uoc3RvcmUpIHx8IFtdXHJcbiAgfVxyXG59XHJcblxyXG5leHBvcnRzLmNhbWVsQ2FzZSA9IGZ1bmN0aW9uKHMpIHtcclxuICByZXR1cm4gcy5jaGFyQXQoMCkudG9VcHBlckNhc2UoKSArIHMuc2xpY2UoMSlcclxufVxyXG5cclxuZXhwb3J0cy5nZW5JZCA9IGZ1bmN0aW9uKCkge1xyXG4gIHJldHVybiAoTWF0aC5yb3VuZChNYXRoLnJhbmRvbSgpICogMHgxKjFlMTIpKS50b1N0cmluZygzMilcclxufVxyXG5cclxuZXhwb3J0cy5nZXRJZCA9IGZ1bmN0aW9uIChpZCkge1xyXG4gIHJldHVybiBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChpZClcclxufVxyXG5cclxuZXhwb3J0cy5odG1sID0gZnVuY3Rpb24gKGxpdGVyYWxTZWN0aW9ucywgLi4uc3Vic3RzKSB7XHJcbiAgLy8gVXNlIHJhdyBsaXRlcmFsIHNlY3Rpb25zOiB3ZSBkb27igJl0IHdhbnRcclxuICAvLyBiYWNrc2xhc2hlcyAoXFxuIGV0Yy4pIHRvIGJlIGludGVycHJldGVkXHJcbiAgbGV0IHJhdyA9IGxpdGVyYWxTZWN0aW9ucy5yYXc7XHJcblxyXG4gIGxldCByZXN1bHQgPSAnJztcclxuXHJcbiAgc3Vic3RzLmZvckVhY2goKHN1YnN0LCBpKSA9PiB7XHJcbiAgICAgIC8vIFJldHJpZXZlIHRoZSBsaXRlcmFsIHNlY3Rpb24gcHJlY2VkaW5nXHJcbiAgICAgIC8vIHRoZSBjdXJyZW50IHN1YnN0aXR1dGlvblxyXG4gICAgICBsZXQgbGl0ID0gcmF3W2ldO1xyXG5cclxuICAgICAgLy8gSW4gdGhlIGV4YW1wbGUsIG1hcCgpIHJldHVybnMgYW4gYXJyYXk6XHJcbiAgICAgIC8vIElmIHN1YnN0aXR1dGlvbiBpcyBhbiBhcnJheSAoYW5kIG5vdCBhIHN0cmluZyksXHJcbiAgICAgIC8vIHdlIHR1cm4gaXQgaW50byBhIHN0cmluZ1xyXG4gICAgICBpZiAoQXJyYXkuaXNBcnJheShzdWJzdCkpIHtcclxuICAgICAgICAgIHN1YnN0ID0gc3Vic3Quam9pbignJyk7XHJcbiAgICAgIH1cclxuXHJcbiAgICAgIC8vIElmIHRoZSBzdWJzdGl0dXRpb24gaXMgcHJlY2VkZWQgYnkgYSBkb2xsYXIgc2lnbixcclxuICAgICAgLy8gd2UgZXNjYXBlIHNwZWNpYWwgY2hhcmFjdGVycyBpbiBpdFxyXG4gICAgICBpZiAobGl0LmVuZHNXaXRoKCckJykpIHtcclxuICAgICAgICAgIHN1YnN0ID0gaHRtbEVzY2FwZShzdWJzdCk7XHJcbiAgICAgICAgICBsaXQgPSBsaXQuc2xpY2UoMCwgLTEpO1xyXG4gICAgICB9XHJcbiAgICAgIHJlc3VsdCArPSBsaXQ7XHJcbiAgICAgIHJlc3VsdCArPSBzdWJzdDtcclxuICB9KTtcclxuICAvLyBUYWtlIGNhcmUgb2YgbGFzdCBsaXRlcmFsIHNlY3Rpb25cclxuICAvLyAoTmV2ZXIgZmFpbHMsIGJlY2F1c2UgYW4gZW1wdHkgdGVtcGxhdGUgc3RyaW5nXHJcbiAgLy8gcHJvZHVjZXMgb25lIGxpdGVyYWwgc2VjdGlvbiwgYW4gZW1wdHkgc3RyaW5nKVxyXG4gIHJlc3VsdCArPSByYXdbcmF3Lmxlbmd0aC0xXTsgLy8gKEEpXHJcblxyXG4gIHJldHVybiByZXN1bHQ7XHJcbn1cclxuXHJcbmV4cG9ydHMuaW50ZWxsaVVwZGF0ZSA9IGZ1bmN0aW9uKHN0YXRlLCBjYWxsYmFjaykge1xyXG4gIC8vIG9ubHkgdXBkYXRlIHdoZW4gbmVjZXNzYXJ5XHJcbiAgaWYgKHN0YXRlKSBjbGVhclRpbWVvdXQoc3RhdGUpXHJcbiAgc3RhdGUgPSBzZXRUaW1lb3V0KGZ1bmN0aW9uKCkge1xyXG4gICAgY2FsbGJhY2soKVxyXG4gIH0sIDEwKVxyXG59Il19
