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
var model = require('./model')
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

          if(batchPool.status === 'pooling'){
            return
          } else {

            batchPool.status = 'pooling'

            clearTimeout(batchPool.ttl)

            batchPool.ttl = setTimeout(function(){
              updateContext.apply(self, args)
            }, 0)
          }
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

  s = model.call(this, s)
  s = nodesVisibility.call(this, s)
  console.log(s)
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

},{"./copy":1,"./model":5,"./nodesVisibility":6,"./processEvent":8,"./strInterpreter":9,"./tag":10,"./tmplAttrHandler":12,"./tmplClassHandler":13,"./tmplHandler":14,"./tmplStylesHandler":15,"./utils":16,"hash-sum":18,"set-dom":19}],3:[function(require,module,exports){
var ternaryOps = require('./ternaryOps')
var tmpl = ''

module.exports = function (baseTmpl, obj) {
  var args = this.args
  var arrProps = baseTmpl.match(/{{([^{}]+)}}/g)
  var tempDiv
  var rep
  tmpl = baseTmpl
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
  return tmpl
}

},{"./ternaryOps":11}],4:[function(require,module,exports){
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

},{"./processEvent":8,"./ternaryOps":11,"./utils":16}],5:[function(require,module,exports){
var genModelTemplate = require('./genModelTemplate')
module.exports = function (string) {
  var self = this
  this.__stateList__.map(function (state) {
    
    var f = '\\{\\{\\model:' + state + '\\}\\}'
    var b = '\\{\\{\\/model:' + state + '\\}\\}'
    // var regx = '(?<=' + f + ')(.*?)(?=' + b + ')'
    // ** old browser does not support positive look behind **
    var regx = '(' + f + ')(.*?)(?=' + b + ')'
    var re = new RegExp(regx)
    var isConditional = re.test(string)
    var match = string.match(re)
    if (isConditional && match) {
      var matchPristine = self.base.match(re)
      var modelString = ''
      self[state].list.map(function(obj) {
        modelString += genModelTemplate.call(self, matchPristine[2], obj)
      })
      string = string.replace(match[2], modelString)
    }
    string = string.replace('{{model:' + state + '}}', '')
    string = string.replace('{{/model:' + state + '}}', '')
  })
  return string
}

},{"./genModelTemplate":3}],6:[function(require,module,exports){
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

},{}],7:[function(require,module,exports){
var genElement = require('./genElement').genElement
var setState = require('./genElement').setState
var tmplHandler = require('./tmplHandler')
var processEvent = require('./processEvent')
var genId = require('./utils').genId
var testEvent = require('./utils').testEvent
var genTemplate = require('./genTemplate')
var nodesVisibility = require('./nodesVisibility')
var model = require('./model')
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

    tpl = model.call(this, tpl)
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

},{"./genElement":2,"./genTemplate":4,"./model":5,"./nodesVisibility":6,"./processEvent":8,"./tmplHandler":14,"./utils":16,"hash-sum":18}],8:[function(require,module,exports){
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
    //rem.map(function (f) { c.removeAttribute(f) })
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

},{"./utils":16}],9:[function(require,module,exports){
module.exports = function (str) {
  var res = str.match(/\.*\./g)
  var result
  if (res && res.length > 0) {
    return str.split('.')
  }
  return result
}

},{}],10:[function(require,module,exports){
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

},{}],11:[function(require,module,exports){
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
},{}],12:[function(require,module,exports){
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

},{"./genElement":2}],13:[function(require,module,exports){
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

},{}],14:[function(require,module,exports){
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
      if (rep.match(/^model\:/g)) {
        updateStateList(rep.replace('model:', ''))
      }
    })
  }
  return str
}


},{"./strInterpreter":9,"./ternaryOps":11}],15:[function(require,module,exports){
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

},{"./copy":1}],16:[function(require,module,exports){
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
},{}],17:[function(require,module,exports){
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
  Object.defineProperty(this, '__registerModel__', {
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

Keet.prototype.register = function() {
  var self = this
  this.__registerModel__ = this.__registerModel__ || {}
  var list = [].slice.call(arguments)
  list.map(function(data) {
    self.__registerModel__[data.name] = data.model
  })
  return this
}

module.exports = Keet

},{"./components/genTemplate":4,"./components/parseStr":7,"./components/utils":16,"set-dom":19}],18:[function(require,module,exports){
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

},{}],19:[function(require,module,exports){
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

},{"./parse-html":20}],20:[function(require,module,exports){
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

},{}],21:[function(require,module,exports){
'use strict';

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _templateObject = _taggedTemplateLiteral(['\n  <section id="todoapp">\n    <header id="header">\n      <h1>todos</h1>\n      <input id="new-todo" k-keydown="create()" placeholder="What needs to be done?" autofocus>\n    </header>\n    {{?todoState}}\n    <section id="main">\n      <input id="toggle-all" type="checkbox" {{isChecked?checked:\'\'}} k-click="completeAll()">\n      <label for="toggle-all">Mark all as complete</label>\n      <ul id="todo-list">\n        {{model:todoModel}}\n          <li keet-id="{{id}}" k-dblclick="editMode({{id}})" class="{{completed?completed:\'\'}}">\n            <div class="view"><input k-click="toggleTodo({{id}})" class="toggle" type="checkbox" {{completed?checked:\'\'}}>\n              <label>{{title}}</label>\n              <button k-click="todoDestroy({{id}})" class="destroy"></button>\n            </div>\n            <input class="edit" value="{{title}}">\n          </li>\n        {{/model:todoModel}}\n      </ul>\n    </section>\n    <footer id="footer">\n      <span id="todo-count">\n        <strong>{{count}}</strong> item{{plural}} left\n      </span>\n      <ul id="filters">\n        ', '\n      </ul>\n      {{?clearToggle}}\n      <button id="clear-completed" k-click="clearCompleted()">Clear completed</button>\n      {{/clearToggle}}\n    </footer>\n    {{/todoState}}\n  </section>\n  <footer id="info">\n    <p>Double-click to edit a todo</p>\n    <p>Created by <a href="https://github.com/syarul">Shahrul Nizam Selamat</a></p>\n    <p>Part of <a href="http://todomvc.com">TodoMVC</a></p>\n  </footer>'], ['\n  <section id="todoapp">\n    <header id="header">\n      <h1>todos</h1>\n      <input id="new-todo" k-keydown="create()" placeholder="What needs to be done?" autofocus>\n    </header>\n    {{?todoState}}\n    <section id="main">\n      <input id="toggle-all" type="checkbox" {{isChecked?checked:\'\'}} k-click="completeAll()">\n      <label for="toggle-all">Mark all as complete</label>\n      <ul id="todo-list">\n        {{model:todoModel}}\n          <li keet-id="{{id}}" k-dblclick="editMode({{id}})" class="{{completed?completed:\'\'}}">\n            <div class="view"><input k-click="toggleTodo({{id}})" class="toggle" type="checkbox" {{completed?checked:\'\'}}>\n              <label>{{title}}</label>\n              <button k-click="todoDestroy({{id}})" class="destroy"></button>\n            </div>\n            <input class="edit" value="{{title}}">\n          </li>\n        {{/model:todoModel}}\n      </ul>\n    </section>\n    <footer id="footer">\n      <span id="todo-count">\n        <strong>{{count}}</strong> item{{plural}} left\n      </span>\n      <ul id="filters">\n        ', '\n      </ul>\n      {{?clearToggle}}\n      <button id="clear-completed" k-click="clearCompleted()">Clear completed</button>\n      {{/clearToggle}}\n    </footer>\n    {{/todoState}}\n  </section>\n  <footer id="info">\n    <p>Double-click to edit a todo</p>\n    <p>Created by <a href="https://github.com/syarul">Shahrul Nizam Selamat</a></p>\n    <p>Part of <a href="http://todomvc.com">TodoMVC</a></p>\n  </footer>']);

function _taggedTemplateLiteral(strings, raw) { return Object.freeze(Object.defineProperties(strings, { raw: { value: Object.freeze(raw) } })); }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var Keet = require('../keet');

var _require = require('./util'),
    camelCase = _require.camelCase,
    html = _require.html;

var todo = require('./todo');
var createTodoModel = require('./todoModel');
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

    return _ret = (_temp = (_this = _possibleConstructorReturn(this, (_ref = App.__proto__ || Object.getPrototypeOf(App)).call.apply(_ref, [this].concat(args))), _this), _this.todoModel = createTodoModel(), _this.page = 'All', _this.isChecked = false, _this.count = 0, _this.plural = '', _this.clearToggle = false, _temp), _possibleConstructorReturn(_this, _ret);
  }

  _createClass(App, [{
    key: 'componentWillMount',
    value: function componentWillMount() {
      var _this2 = this;

      filterPage.map(function (f) {
        return _this2['page' + camelCase(f)] = '';
      });

      this.todoState = this.todoModel.list.length ? true : false;

      this.todoModel.subscribe(function (todos) {
        var uncompleted = todos.filter(function (c) {
          return !c.completed;
        });
        var completed = todos.filter(function (c) {
          return c.completed;
        });
        // this.clearToggle = filterCompleted.length ? true : false
        _this2.todoState = todos.length ? true : false;
        // this.plural = filterUncomplete.length === 1 ? '' : 's'
        // this.count = filterUncomplete.length
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
        _this4['page' + camelCase(f)] = hash.split('#/')[1] === f ? 'selected' : '';
        if (hash.split('#/')[1] === f) _this4.page = f.name;
      });
    }
  }, {
    key: 'create',
    value: function create(evt) {
      if (evt.keyCode !== 13) return;
      // todoApp.addTodo(evt.target.value.trim())
      this.todoModel.addTodo(evt.target.value.trim());
      evt.target.value = '';
    }
  }, {
    key: 'toggleTodo',
    value: function toggleTodo(id, evt) {
      this.todoModel.toggle({
        id: id,
        completed: !!evt.target.checked
      });
    }

    // todoDestroy(id) {
    //   console.log(id)
    //   this.todoModel.destroy(id)
    // }

  }, {
    key: 'completeAll',
    value: function completeAll() {
      this.isChecked = !this.isChecked;
      todoApp.updateAll(this.isChecked);
    }
  }, {
    key: 'clearCompleted',
    value: function clearCompleted() {
      todoApp.clearCompleted();
    }
  }]);

  return App;
}(Keet);

var vmodel = html(_templateObject, filtersTmpl);

var app = new App();

app.mount(vmodel).link('todo');

// console.log(app)

},{"../keet":17,"./filters":22,"./todo":23,"./todoModel":24,"./util":25}],22:[function(require,module,exports){
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

},{"./util":25}],23:[function(require,module,exports){
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
    html = _require.html,
    selector = _require.selector;

var log = console.log.bind(console);

var TodoApp = function (_Keet) {
  _inherits(TodoApp, _Keet);

  function TodoApp() {
    var _ref;

    var _temp, _this, _ret;

    _classCallCheck(this, TodoApp);

    for (var _len = arguments.length, args = Array(_len), _key = 0; _key < _len; _key++) {
      args[_key] = arguments[_key];
    }

    return _ret = (_temp = (_this = _possibleConstructorReturn(this, (_ref = TodoApp.__proto__ || Object.getPrototypeOf(TodoApp)).call.apply(_ref, [this].concat(args))), _this), _this.el = 'todo-list', _temp), _possibleConstructorReturn(_this, _ret);
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
      this.base.model = this.base.model.filter(function (model) {
        if (model.completed) {
          var node = selector(model['keet-id']);
          node && node.remove();
        } else {
          return model;
        }
      });
      inform.call(this);
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
  }]);

  return TodoApp;
}(Keet);

var todoApp = new TodoApp();

var vmodel = {
  template: html(_templateObject),
  model: store('todos-keetjs')
};

todoApp.mount(vmodel);

module.exports = todoApp;

},{"../keet":17,"./util":25}],24:[function(require,module,exports){
'use strict';

var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

var _require = require('./util'),
    store = _require.store,
    genId = _require.genId;

// note: copy with modification from preact-todomvc

module.exports = function () {

  var onChanges = [];

  function inform() {
    for (var i = onChanges.length; i--;) {
      onChanges[i](model.list);
    }
  }

  var model = {

    list: [],

    subscribe: function subscribe(fn) {
      onChanges.push(fn);
    },
    addTodo: function addTodo(title) {
      model.list = model.list.concat({
        id: genId(),
        title: title,
        completed: false
      });
      inform();
    },
    toggleAll: function toggleAll(completed) {
      model.list = model.list.map(function (todo) {
        return _extends({}, todo, { completed: completed });
      });
      inform();
    },
    toggle: function toggle(todoToToggle) {
      model.list = model.list.map(function (todo) {
        return todo.id !== todoToToggle.id ? todo : _extends({}, todo, todoToToggle);
      });
      inform();
    },
    destroy: function destroy(id) {
      console.log(id);
      model.list = model.list.filter(function (t) {
        return t.id !== id;
      });
      inform();
    }
  };

  return model;
};

},{"./util":25}],25:[function(require,module,exports){
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

exports.selector = function (id) {
  return document.querySelector('[keet-id="' + id + '"]');
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

},{}]},{},[21])
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uL0FwcERhdGEvUm9hbWluZy9ucG0vbm9kZV9tb2R1bGVzL2Jyb3dzZXJpZnkvbm9kZV9tb2R1bGVzL2Jyb3dzZXItcGFjay9fcHJlbHVkZS5qcyIsImtlZXQvY29tcG9uZW50cy9jb3B5LmpzIiwia2VldC9jb21wb25lbnRzL2dlbkVsZW1lbnQuanMiLCJrZWV0L2NvbXBvbmVudHMvZ2VuTW9kZWxUZW1wbGF0ZS5qcyIsImtlZXQvY29tcG9uZW50cy9nZW5UZW1wbGF0ZS5qcyIsImtlZXQvY29tcG9uZW50cy9tb2RlbC5qcyIsImtlZXQvY29tcG9uZW50cy9ub2Rlc1Zpc2liaWxpdHkuanMiLCJrZWV0L2NvbXBvbmVudHMvcGFyc2VTdHIuanMiLCJrZWV0L2NvbXBvbmVudHMvcHJvY2Vzc0V2ZW50LmpzIiwia2VldC9jb21wb25lbnRzL3N0ckludGVycHJldGVyLmpzIiwia2VldC9jb21wb25lbnRzL3RhZy5qcyIsImtlZXQvY29tcG9uZW50cy90ZXJuYXJ5T3BzLmpzIiwia2VldC9jb21wb25lbnRzL3RtcGxBdHRySGFuZGxlci5qcyIsImtlZXQvY29tcG9uZW50cy90bXBsQ2xhc3NIYW5kbGVyLmpzIiwia2VldC9jb21wb25lbnRzL3RtcGxIYW5kbGVyLmpzIiwia2VldC9jb21wb25lbnRzL3RtcGxTdHlsZXNIYW5kbGVyLmpzIiwia2VldC9jb21wb25lbnRzL3V0aWxzLmpzIiwia2VldC9rZWV0LmpzIiwia2VldC9ub2RlX21vZHVsZXMvaGFzaC1zdW0vaGFzaC1zdW0uanMiLCJrZWV0L25vZGVfbW9kdWxlcy9zZXQtZG9tL3NyYy9pbmRleC5qcyIsImtlZXQvbm9kZV9tb2R1bGVzL3NldC1kb20vc3JjL3BhcnNlLWh0bWwuanMiLCJzcmMvYXBwLmpzIiwic3JjL2ZpbHRlcnMuanMiLCJzcmMvdG9kby5qcyIsInNyYy90b2RvTW9kZWwuanMiLCJzcmMvdXRpbC5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTtBQ0FBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2ZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNoTEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDeEJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzlCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDMUJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3JCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDN0VBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDOUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNSQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDbkNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzNCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDdkJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNwQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNsQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDckJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN4REE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMvTkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMxREE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFD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UixHQUF3QixVQUFTLEtBQVQsRUFBZ0IsUUFBaEIsRUFBMEI7QUFDaEQ7QUFDQSxNQUFJLEtBQUosRUFBVyxhQUFhLEtBQWI7QUFDWCxVQUFRLFdBQVcsWUFBVztBQUM1QjtBQUNELEdBRk8sRUFFTCxFQUZLLENBQVI7QUFHRCxDQU5EIiwiZmlsZSI6ImdlbmVyYXRlZC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzQ29udGVudCI6WyIoZnVuY3Rpb24gZSh0LG4scil7ZnVuY3Rpb24gcyhvLHUpe2lmKCFuW29dKXtpZighdFtvXSl7dmFyIGE9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtpZighdSYmYSlyZXR1cm4gYShvLCEwKTtpZihpKXJldHVybiBpKG8sITApO3ZhciBmPW5ldyBFcnJvcihcIkNhbm5vdCBmaW5kIG1vZHVsZSAnXCIrbytcIidcIik7dGhyb3cgZi5jb2RlPVwiTU9EVUxFX05PVF9GT1VORFwiLGZ9dmFyIGw9bltvXT17ZXhwb3J0czp7fX07dFtvXVswXS5jYWxsKGwuZXhwb3J0cyxmdW5jdGlvbihlKXt2YXIgbj10W29dWzFdW2VdO3JldHVybiBzKG4/bjplKX0sbCxsLmV4cG9ydHMsZSx0LG4scil9cmV0dXJuIG5bb10uZXhwb3J0c312YXIgaT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2Zvcih2YXIgbz0wO288ci5sZW5ndGg7bysrKXMocltvXSk7cmV0dXJuIHN9KSIsIm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24gKGFyZ3YpIHtcclxuICB2YXIgY29wID0gZnVuY3Rpb24gKHYpIHtcclxuICAgIHZhciBvID0ge31cclxuICAgIGlmICh0eXBlb2YgdiAhPT0gJ29iamVjdCcpIHtcclxuICAgICAgby5jb3B5ID0gdlxyXG4gICAgICByZXR1cm4gby5jb3B5XHJcbiAgICB9IGVsc2Uge1xyXG4gICAgICBmb3IgKHZhciBhdHRyIGluIHYpIHtcclxuICAgICAgICBvW2F0dHJdID0gdlthdHRyXVxyXG4gICAgICB9XHJcbiAgICB9XHJcbiAgICByZXR1cm4gb1xyXG4gIH1cclxuICByZXR1cm4gQXJyYXkuaXNBcnJheShhcmd2KSA/IGFyZ3YubWFwKGZ1bmN0aW9uICh2KSB7IHJldHVybiB2IH0pIDogY29wKGFyZ3YpXHJcbn1cclxuIiwidmFyIGNvcHkgPSByZXF1aXJlKCcuL2NvcHknKVxyXG52YXIgdGFnID0gcmVxdWlyZSgnLi90YWcnKVxyXG52YXIgdG1wbEhhbmRsZXIgPSByZXF1aXJlKCcuL3RtcGxIYW5kbGVyJylcclxudmFyIHRtcGxTdHlsZXNIYW5kbGVyID0gcmVxdWlyZSgnLi90bXBsU3R5bGVzSGFuZGxlcicpXHJcbnZhciB0bXBsQ2xhc3NIYW5kbGVyID0gcmVxdWlyZSgnLi90bXBsQ2xhc3NIYW5kbGVyJylcclxudmFyIHRtcGxBdHRySGFuZGxlciA9IHJlcXVpcmUoJy4vdG1wbEF0dHJIYW5kbGVyJylcclxudmFyIHByb2Nlc3NFdmVudCA9IHJlcXVpcmUoJy4vcHJvY2Vzc0V2ZW50JylcclxudmFyIHNlbGVjdG9yID0gcmVxdWlyZSgnLi91dGlscycpLnNlbGVjdG9yXHJcbnZhciBzdHJJbnRlcnByZXRlciA9IHJlcXVpcmUoJy4vc3RySW50ZXJwcmV0ZXInKVxyXG52YXIgbm9kZXNWaXNpYmlsaXR5ID0gcmVxdWlyZSgnLi9ub2Rlc1Zpc2liaWxpdHknKVxyXG52YXIgbW9kZWwgPSByZXF1aXJlKCcuL21vZGVsJylcclxudmFyIHN1bSA9IHJlcXVpcmUoJ2hhc2gtc3VtJylcclxudmFyIHNldERPTSA9IHJlcXVpcmUoJ3NldC1kb20nKVxyXG5cclxuc2V0RE9NLmtleSA9ICdrZWV0LWlkJ1xyXG5cclxudmFyIHVwZGF0ZUNvbnRleHQgPSBmdW5jdGlvbiAoKSB7XHJcbiAgdmFyIHNlbGYgPSB0aGlzXHJcbiAgdmFyIGVsZVxyXG4gIHZhciBuZXdFbGVtXHJcbiAgdmFyIGFyZ3MgPSBbXS5zbGljZS5jYWxsKGFyZ3VtZW50cylcclxuICBpZiAodHlwZW9mIHRoaXMuYmFzZSA9PT0gJ29iamVjdCcpIHtcclxuICAgIE9iamVjdC5rZXlzKHRoaXMuYmFzZSkubWFwKGZ1bmN0aW9uIChoYW5kbGVyS2V5KSB7XHJcbiAgICAgIHZhciBpZCA9IHNlbGYuYmFzZVtoYW5kbGVyS2V5XVsna2VldC1pZCddXHJcbiAgICAgIGVsZSA9IHNlbGVjdG9yKGlkKVxyXG4gICAgICBpZiAoIWVsZSAmJiB0eXBlb2Ygc2VsZi5iYXNlW2hhbmRsZXJLZXldID09PSAnc3RyaW5nJykge1xyXG4gICAgICAgIGVsZSA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKHNlbGYuZWwpXHJcbiAgICAgIH1cclxuICAgICAgbmV3RWxlbSA9IGdlbkVsZW1lbnQuYXBwbHkoc2VsZiwgW3NlbGYuYmFzZVtoYW5kbGVyS2V5XV0uY29uY2F0KGFyZ3MpKVxyXG4gICAgICBpZiAoc2VsZi5iYXNlLmhhc093blByb3BlcnR5KCd0ZW1wbGF0ZScpKSB7XHJcbiAgICAgICAgbmV3RWxlbS5pZCA9IHNlbGYuZWxcclxuICAgICAgfVxyXG4gICAgICBzZXRET00oZWxlLCBuZXdFbGVtKVxyXG4gICAgfSlcclxuICB9IGVsc2Uge1xyXG4gICAgZWxlID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoc2VsZi5lbClcclxuICAgIGlmIChlbGUpIHtcclxuICAgICAgbmV3RWxlbSA9IGdlbkVsZW1lbnQuYXBwbHkoc2VsZiwgW3NlbGYuYmFzZV0uY29uY2F0KGFyZ3MpKVxyXG4gICAgICBuZXdFbGVtLmlkID0gc2VsZi5lbFxyXG4gICAgICBzZXRET00oZWxlLCBuZXdFbGVtKVxyXG4gICAgfVxyXG4gIH1cclxuICBiYXRjaFBvb2wuc3RhdHVzID0gJ3JlYWR5J1xyXG59XHJcblxyXG4vLyBiYXRjaCBwb29sIHVwZGF0ZSBzdGF0ZXMgdG8gRE9NXHJcbnZhciBiYXRjaFBvb2wgPSB7XHJcbiAgdHRsOiBudWxsLFxyXG4gIHN0YXR1czogJ3JlYWR5J1xyXG59XHJcblxyXG52YXIgbmV4dFN0YXRlID0gZnVuY3Rpb24gKGksIGFyZ3MpIHtcclxuICB2YXIgc2VsZiA9IHRoaXNcclxuICBpZiAoaSA8IHRoaXMuX19zdGF0ZUxpc3RfXy5sZW5ndGgpIHtcclxuICAgIHZhciBzdGF0ZSA9IHRoaXMuX19zdGF0ZUxpc3RfX1tpXVxyXG4gICAgdmFyIHZhbHVlID0gdGhpc1tzdGF0ZV1cclxuICAgIC8vIGlmIHZhbHVlIGlzIHVuZGVmaW5lZCwgbGlrZWx5IGhhcyBvYmplY3Qgbm90YXRpb24gd2UgY29udmVydCBpdCB0byBhcnJheVxyXG4gICAgaWYgKHZhbHVlID09PSB1bmRlZmluZWQpIHZhbHVlID0gc3RySW50ZXJwcmV0ZXIoc3RhdGUpXHJcblxyXG4gICAgaWYgKHZhbHVlICYmIEFycmF5LmlzQXJyYXkodmFsdWUpKSB7XHJcbiAgICAgIC8vIHVzaW5nIHNwbGl0IG9iamVjdCBub3RhdGlvbiBhcyBiYXNlIGZvciBzdGF0ZSB1cGRhdGVcclxuICAgICAgdmFyIGluVmFsID0gdGhpc1t2YWx1ZVswXV1bdmFsdWVbMV1dXHJcbiAgICAgIE9iamVjdC5kZWZpbmVQcm9wZXJ0eSh0aGlzW3ZhbHVlWzBdXSwgdmFsdWVbMV0sIHtcclxuICAgICAgICBlbnVtZXJhYmxlOiBmYWxzZSxcclxuICAgICAgICBjb25maWd1cmFibGU6IHRydWUsXHJcbiAgICAgICAgZ2V0OiBmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgICByZXR1cm4gaW5WYWxcclxuICAgICAgICB9LFxyXG4gICAgICAgIHNldDogZnVuY3Rpb24gKHZhbCkge1xyXG4gICAgICAgICAgaW5WYWwgPSB2YWxcclxuICAgICAgICAgIHVwZGF0ZUNvbnRleHQuYXBwbHkoc2VsZiwgYXJncylcclxuICAgICAgICB9XHJcbiAgICAgIH0pXHJcbiAgICB9IGVsc2Uge1xyXG4gICAgICAvLyBoYW5kbGUgcGFyZW50IHN0YXRlIHVwZGF0ZSBpZiB0aGUgc3RhdGUgaXMgbm90IGFuIG9iamVjdFxyXG4gICAgICBPYmplY3QuZGVmaW5lUHJvcGVydHkodGhpcywgc3RhdGUsIHtcclxuICAgICAgICBlbnVtZXJhYmxlOiBmYWxzZSxcclxuICAgICAgICBjb25maWd1cmFibGU6IHRydWUsXHJcbiAgICAgICAgZ2V0OiBmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgICByZXR1cm4gdmFsdWVcclxuICAgICAgICB9LFxyXG4gICAgICAgIHNldDogZnVuY3Rpb24gKHZhbCkge1xyXG4gICAgICAgICAgdmFsdWUgPSB2YWxcclxuXHJcbiAgICAgICAgICBpZihiYXRjaFBvb2wuc3RhdHVzID09PSAncG9vbGluZycpe1xyXG4gICAgICAgICAgICByZXR1cm5cclxuICAgICAgICAgIH0gZWxzZSB7XHJcblxyXG4gICAgICAgICAgICBiYXRjaFBvb2wuc3RhdHVzID0gJ3Bvb2xpbmcnXHJcblxyXG4gICAgICAgICAgICBjbGVhclRpbWVvdXQoYmF0Y2hQb29sLnR0bClcclxuXHJcbiAgICAgICAgICAgIGJhdGNoUG9vbC50dGwgPSBzZXRUaW1lb3V0KGZ1bmN0aW9uKCl7XHJcbiAgICAgICAgICAgICAgdXBkYXRlQ29udGV4dC5hcHBseShzZWxmLCBhcmdzKVxyXG4gICAgICAgICAgICB9LCAwKVxyXG4gICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuICAgICAgfSlcclxuICAgIH1cclxuICAgIGkrK1xyXG4gICAgbmV4dFN0YXRlLmFwcGx5KHRoaXMsIFsgaSwgYXJncyBdKVxyXG4gIH0gZWxzZSB7XHJcbiAgICAvL1xyXG4gIH1cclxufVxyXG5cclxudmFyIHNldFN0YXRlID0gZnVuY3Rpb24gKGFyZ3MpIHtcclxuICBuZXh0U3RhdGUuYXBwbHkodGhpcywgWyAwLCBhcmdzIF0pXHJcbn1cclxuXHJcbnZhciB1cGRhdGVTdGF0ZUxpc3QgPSBmdW5jdGlvbiAoc3RhdGUpIHtcclxuICB0aGlzLl9fc3RhdGVMaXN0X18gPSB0aGlzLl9fc3RhdGVMaXN0X18uY29uY2F0KHN0YXRlKVxyXG59XHJcblxyXG52YXIgZ2VuRWxlbWVudCA9IGZ1bmN0aW9uICgpIHtcclxuICB2YXIgY2hpbGQgPSBbXS5zaGlmdC5jYWxsKGFyZ3VtZW50cylcclxuICB2YXIgYXJncyA9IFtdLnNsaWNlLmNhbGwoYXJndW1lbnRzKVxyXG5cclxuICB2YXIgdGVtcERpdiA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2RpdicpXHJcbiAgdmFyIGNsb25lQ2hpbGQgPSBjb3B5KGNoaWxkKVxyXG4gIGRlbGV0ZSBjbG9uZUNoaWxkLnRlbXBsYXRlXHJcbiAgZGVsZXRlIGNsb25lQ2hpbGQudGFnXHJcbiAgZGVsZXRlIGNsb25lQ2hpbGQuc3R5bGVcclxuICBkZWxldGUgY2xvbmVDaGlsZC5jbGFzc1xyXG4gIC8vIHByb2Nlc3MgdGVtcGxhdGUgaWYgaGFzIGhhbmRsZWJhcnMgdmFsdWVcclxuICB0aGlzLl9fc3RhdGVMaXN0X18gPSBbXVxyXG5cclxuICB2YXIgdHBsID0gY2hpbGQudGVtcGxhdGVcclxuICAgID8gdG1wbEhhbmRsZXIuY2FsbCh0aGlzLCBjaGlsZC50ZW1wbGF0ZSwgdXBkYXRlU3RhdGVMaXN0LmJpbmQodGhpcykpXHJcbiAgICA6IHR5cGVvZiBjaGlsZCA9PT0gJ3N0cmluZycgPyB0bXBsSGFuZGxlci5jYWxsKHRoaXMsIGNoaWxkLCB1cGRhdGVTdGF0ZUxpc3QuYmluZCh0aGlzKSkgOiBudWxsXHJcbiAgLy8gcHJvY2VzcyBzdHlsZXMgaWYgaGFzIGhhbmRsZWJhcnMgdmFsdWVcclxuICB2YXIgc3R5bGVUcGwgPSB0bXBsU3R5bGVzSGFuZGxlci5jYWxsKHRoaXMsIGNoaWxkLnN0eWxlLCB1cGRhdGVTdGF0ZUxpc3QuYmluZCh0aGlzKSlcclxuICAvLyBwcm9jZXNzIGNsYXNzZXMgaWYgaGFzIGhhbmRsZWJhcnMgdmFsdWVcclxuICB2YXIgY2xhc3NUcGwgPSB0bXBsQ2xhc3NIYW5kbGVyLmNhbGwodGhpcywgY2hpbGQsIHVwZGF0ZVN0YXRlTGlzdC5iaW5kKHRoaXMpKVxyXG4gIGlmIChjbGFzc1RwbCkgY2xvbmVDaGlsZC5jbGFzcyA9IGNsYXNzVHBsXHJcbiAgLy8gY3VzdG9tIGF0dHJpYnV0ZXMgaGFuZGxlclxyXG4gIGlmIChhcmdzICYmIGFyZ3MubGVuZ3RoKSB7XHJcbiAgICB0bXBsQXR0ckhhbmRsZXIuYXBwbHkodGhpcywgWyBjbG9uZUNoaWxkIF0uY29uY2F0KGFyZ3MpKVxyXG4gIH1cclxuXHJcbiAgdmFyIHMgPSBjaGlsZC50YWdcclxuICAgID8gdGFnKGNoaWxkLnRhZywgLy8gaHRtbCB0YWdcclxuICAgICAgdHBsIHx8ICcnLCAvLyBub2RlVmFsdWVcclxuICAgICAgY2xvbmVDaGlsZCwgLy8gYXR0cmlidXRlcyBpbmNsdWRpbmcgY2xhc3Nlc1xyXG4gICAgICBzdHlsZVRwbCAvLyBpbmxpbmUgc3R5bGVzXHJcbiAgICApIDogdHBsIC8vIGZhbGxiYWNrIGlmIG5vbiBleGlzdCwgcmVuZGVyIHRoZSB0ZW1wbGF0ZSBhcyBzdHJpbmdcclxuXHJcbiAgcyA9IG1vZGVsLmNhbGwodGhpcywgcylcclxuICBzID0gbm9kZXNWaXNpYmlsaXR5LmNhbGwodGhpcywgcylcclxuICBjb25zb2xlLmxvZyhzKVxyXG4gIHRlbXBEaXYuaW5uZXJIVE1MID0gc1xyXG4gIHRlbXBEaXYuY2hpbGROb2Rlcy5mb3JFYWNoKGZ1bmN0aW9uIChjKSB7XHJcbiAgICBpZiAoYy5ub2RlVHlwZSA9PT0gMSkge1xyXG4gICAgICBjLnNldEF0dHJpYnV0ZSgnZGF0YS1jaGVja3N1bScsIHN1bShjLm91dGVySFRNTCkpXHJcbiAgICB9XHJcbiAgfSlcclxuICBpZiAoY2hpbGQudGFnID09PSAnaW5wdXQnKSB7XHJcbiAgICBpZiAoY2xvbmVDaGlsZC5jaGVja2VkKSB7XHJcbiAgICAgIHRlbXBEaXYuY2hpbGROb2Rlc1swXS5zZXRBdHRyaWJ1dGUoJ2NoZWNrZWQnLCAnJylcclxuICAgIH0gZWxzZSB7XHJcbiAgICAgIHRlbXBEaXYuY2hpbGROb2Rlc1swXS5yZW1vdmVBdHRyaWJ1dGUoJ2NoZWNrZWQnKVxyXG4gICAgfVxyXG4gIH1cclxuXHJcbiAgc2V0U3RhdGUuY2FsbCh0aGlzLCBhcmdzKVxyXG5cclxuICBwcm9jZXNzRXZlbnQuY2FsbCh0aGlzLCB0ZW1wRGl2KVxyXG4gIHJldHVybiB0eXBlb2YgY2hpbGQgPT09ICdzdHJpbmcnXHJcbiAgICA/IHRlbXBEaXZcclxuICAgIDogY2hpbGQudGFnID8gdGVtcERpdi5jaGlsZE5vZGVzWzBdXHJcbiAgICAgIDogdGVtcERpdlxyXG59XHJcblxyXG5leHBvcnRzLmdlbkVsZW1lbnQgPSBnZW5FbGVtZW50XHJcbmV4cG9ydHMuc2V0U3RhdGUgPSBzZXRTdGF0ZVxyXG5leHBvcnRzLnVwZGF0ZVN0YXRlTGlzdCA9IHVwZGF0ZVN0YXRlTGlzdFxyXG4iLCJ2YXIgdGVybmFyeU9wcyA9IHJlcXVpcmUoJy4vdGVybmFyeU9wcycpXHJcbnZhciB0bXBsID0gJydcclxuXHJcbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24gKGJhc2VUbXBsLCBvYmopIHtcclxuICB2YXIgYXJncyA9IHRoaXMuYXJnc1xyXG4gIHZhciBhcnJQcm9wcyA9IGJhc2VUbXBsLm1hdGNoKC97eyhbXnt9XSspfX0vZylcclxuICB2YXIgdGVtcERpdlxyXG4gIHZhciByZXBcclxuICB0bXBsID0gYmFzZVRtcGxcclxuICBmb3IodmFyIGk9MCwgbGVuID0gYXJyUHJvcHMubGVuZ3RoO2k8bGVuO2krKyl7XHJcbiAgICByZXAgPSBhcnJQcm9wc1tpXS5yZXBsYWNlKC97eyhbXnt9XSspfX0vZywgJyQxJylcclxuICAgIHZhciBpc1Rlcm5hcnkgPSB0ZXJuYXJ5T3BzLmNhbGwob2JqLCByZXApXHJcbiAgICBpZihpc1Rlcm5hcnkpe1xyXG4gICAgICB0bXBsID0gdG1wbC5yZXBsYWNlKCd7eycrcmVwKyd9fScsIGlzVGVybmFyeS52YWx1ZSlcclxuICAgIH0gZWxzZSB7XHJcbiAgICAgIHRtcGwgPSB0bXBsLnJlcGxhY2UoJ3t7JytyZXArJ319Jywgb2JqW3JlcF0pXHJcbiAgICB9XHJcbiAgICBpZiAoYXJncyAmJiB+YXJncy5pbmRleE9mKHJlcCkgJiYgIW9ialtyZXBdKSB7XHJcbiAgICAgIHZhciByZSA9IG5ldyBSZWdFeHAoJyAnICsgcmVwICsgJz1cIicgKyBvYmpbcmVwXSArICdcIicsICdnJylcclxuICAgICAgdG1wbCA9IHRtcGwucmVwbGFjZShyZSwgJycpXHJcbiAgICB9XHJcbiAgfVxyXG4gIHJldHVybiB0bXBsXHJcbn1cclxuIiwidmFyIHByb2Nlc3NFdmVudCA9IHJlcXVpcmUoJy4vcHJvY2Vzc0V2ZW50JylcclxudmFyIHRlcm5hcnlPcHMgPSByZXF1aXJlKCcuL3Rlcm5hcnlPcHMnKVxyXG52YXIgdGVzdEV2ZW50ID0gcmVxdWlyZSgnLi91dGlscycpLnRlc3RFdmVudFxyXG52YXIgdG1wbCA9ICcnXHJcblxyXG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uIChvYmopIHtcclxuICB2YXIgYXJncyA9IHRoaXMuYXJnc1xyXG4gIHZhciBhcnJQcm9wcyA9IHRoaXMuYmFzZS50ZW1wbGF0ZS5tYXRjaCgve3soW157fV0rKX19L2cpXHJcbiAgdmFyIHRlbXBEaXZcclxuICB2YXIgcmVwXHJcbiAgdG1wbCA9IHRoaXMuYmFzZS50ZW1wbGF0ZVxyXG4gIGZvcih2YXIgaT0wLCBsZW4gPSBhcnJQcm9wcy5sZW5ndGg7aTxsZW47aSsrKXtcclxuICAgIHJlcCA9IGFyclByb3BzW2ldLnJlcGxhY2UoL3t7KFtee31dKyl9fS9nLCAnJDEnKVxyXG4gICAgdmFyIGlzVGVybmFyeSA9IHRlcm5hcnlPcHMuY2FsbChvYmosIHJlcClcclxuICAgIGlmKGlzVGVybmFyeSl7XHJcbiAgICAgIHRtcGwgPSB0bXBsLnJlcGxhY2UoJ3t7JytyZXArJ319JywgaXNUZXJuYXJ5LnZhbHVlKVxyXG4gICAgfSBlbHNlIHtcclxuICAgICAgdG1wbCA9IHRtcGwucmVwbGFjZSgne3snK3JlcCsnfX0nLCBvYmpbcmVwXSlcclxuICAgIH1cclxuICAgIGlmIChhcmdzICYmIH5hcmdzLmluZGV4T2YocmVwKSAmJiAhb2JqW3JlcF0pIHtcclxuICAgICAgdmFyIHJlID0gbmV3IFJlZ0V4cCgnICcgKyByZXAgKyAnPVwiJyArIG9ialtyZXBdICsgJ1wiJywgJ2cnKVxyXG4gICAgICB0bXBsID0gdG1wbC5yZXBsYWNlKHJlLCAnJylcclxuICAgIH1cclxuICB9XHJcbiAgdGVtcERpdiA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2RpdicpXHJcbiAgdGVtcERpdi5pbm5lckhUTUwgPSB0bXBsXHJcbiAgdGVzdEV2ZW50KHRtcGwpICYmIHByb2Nlc3NFdmVudC5jYWxsKHRoaXMsIHRlbXBEaXYpXHJcbiAgdGVtcERpdi5jaGlsZE5vZGVzWzBdLnNldEF0dHJpYnV0ZSgna2VldC1pZCcsIG9ialsna2VldC1pZCddKVxyXG4gIHJldHVybiB0ZW1wRGl2LmNoaWxkTm9kZXNbMF1cclxufVxyXG4iLCJ2YXIgZ2VuTW9kZWxUZW1wbGF0ZSA9IHJlcXVpcmUoJy4vZ2VuTW9kZWxUZW1wbGF0ZScpXHJcbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24gKHN0cmluZykge1xyXG4gIHZhciBzZWxmID0gdGhpc1xyXG4gIHRoaXMuX19zdGF0ZUxpc3RfXy5tYXAoZnVuY3Rpb24gKHN0YXRlKSB7XHJcbiAgICBcclxuICAgIHZhciBmID0gJ1xcXFx7XFxcXHtcXFxcbW9kZWw6JyArIHN0YXRlICsgJ1xcXFx9XFxcXH0nXHJcbiAgICB2YXIgYiA9ICdcXFxce1xcXFx7XFxcXC9tb2RlbDonICsgc3RhdGUgKyAnXFxcXH1cXFxcfSdcclxuICAgIC8vIHZhciByZWd4ID0gJyg/PD0nICsgZiArICcpKC4qPykoPz0nICsgYiArICcpJ1xyXG4gICAgLy8gKiogb2xkIGJyb3dzZXIgZG9lcyBub3Qgc3VwcG9ydCBwb3NpdGl2ZSBsb29rIGJlaGluZCAqKlxyXG4gICAgdmFyIHJlZ3ggPSAnKCcgKyBmICsgJykoLio/KSg/PScgKyBiICsgJyknXHJcbiAgICB2YXIgcmUgPSBuZXcgUmVnRXhwKHJlZ3gpXHJcbiAgICB2YXIgaXNDb25kaXRpb25hbCA9IHJlLnRlc3Qoc3RyaW5nKVxyXG4gICAgdmFyIG1hdGNoID0gc3RyaW5nLm1hdGNoKHJlKVxyXG4gICAgaWYgKGlzQ29uZGl0aW9uYWwgJiYgbWF0Y2gpIHtcclxuICAgICAgdmFyIG1hdGNoUHJpc3RpbmUgPSBzZWxmLmJhc2UubWF0Y2gocmUpXHJcbiAgICAgIHZhciBtb2RlbFN0cmluZyA9ICcnXHJcbiAgICAgIHNlbGZbc3RhdGVdLmxpc3QubWFwKGZ1bmN0aW9uKG9iaikge1xyXG4gICAgICAgIG1vZGVsU3RyaW5nICs9IGdlbk1vZGVsVGVtcGxhdGUuY2FsbChzZWxmLCBtYXRjaFByaXN0aW5lWzJdLCBvYmopXHJcbiAgICAgIH0pXHJcbiAgICAgIHN0cmluZyA9IHN0cmluZy5yZXBsYWNlKG1hdGNoWzJdLCBtb2RlbFN0cmluZylcclxuICAgIH1cclxuICAgIHN0cmluZyA9IHN0cmluZy5yZXBsYWNlKCd7e21vZGVsOicgKyBzdGF0ZSArICd9fScsICcnKVxyXG4gICAgc3RyaW5nID0gc3RyaW5nLnJlcGxhY2UoJ3t7L21vZGVsOicgKyBzdGF0ZSArICd9fScsICcnKVxyXG4gIH0pXHJcbiAgcmV0dXJuIHN0cmluZ1xyXG59XHJcbiIsIm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24gKHN0cmluZykge1xyXG4gIHZhciBzZWxmID0gdGhpc1xyXG4gIHRoaXMuX19zdGF0ZUxpc3RfXy5tYXAoZnVuY3Rpb24gKHN0YXRlKSB7XHJcbiAgICBpZiAoIXNlbGZbc3RhdGVdKSB7XHJcbiAgICAgIHZhciBmID0gJ1xcXFx7XFxcXHtcXFxcPycgKyBzdGF0ZSArICdcXFxcfVxcXFx9J1xyXG4gICAgICB2YXIgYiA9ICdcXFxce1xcXFx7XFxcXC8nICsgc3RhdGUgKyAnXFxcXH1cXFxcfSdcclxuICAgICAgLy8gdmFyIHJlZ3ggPSAnKD88PScgKyBmICsgJykoLio/KSg/PScgKyBiICsgJyknXHJcbiAgICAgIC8vICoqIG9sZCBicm93c2VyIGRvZXMgbm90IHN1cHBvcnQgcG9zaXRpdmUgbG9vayBiZWhpbmQgKipcclxuICAgICAgdmFyIHJlZ3ggPSAnKCcgKyBmICsgJykoLio/KSg/PScgKyBiICsgJyknXHJcbiAgICAgIHZhciByZSA9IG5ldyBSZWdFeHAocmVneClcclxuICAgICAgdmFyIGlzQ29uZGl0aW9uYWwgPSByZS50ZXN0KHN0cmluZylcclxuICAgICAgdmFyIG1hdGNoID0gc3RyaW5nLm1hdGNoKHJlKVxyXG4gICAgICBpZiAoaXNDb25kaXRpb25hbCAmJiBtYXRjaCkge1xyXG4gICAgICAgIHN0cmluZyA9IHN0cmluZy5yZXBsYWNlKG1hdGNoWzJdLCAnJylcclxuICAgICAgfVxyXG4gICAgfVxyXG4gICAgc3RyaW5nID0gc3RyaW5nLnJlcGxhY2UoJ3t7PycgKyBzdGF0ZSArICd9fScsICcnKVxyXG4gICAgc3RyaW5nID0gc3RyaW5nLnJlcGxhY2UoJ3t7LycgKyBzdGF0ZSArICd9fScsICcnKVxyXG4gIH0pXHJcbiAgcmV0dXJuIHN0cmluZ1xyXG59XHJcbiIsInZhciBnZW5FbGVtZW50ID0gcmVxdWlyZSgnLi9nZW5FbGVtZW50JykuZ2VuRWxlbWVudFxyXG52YXIgc2V0U3RhdGUgPSByZXF1aXJlKCcuL2dlbkVsZW1lbnQnKS5zZXRTdGF0ZVxyXG52YXIgdG1wbEhhbmRsZXIgPSByZXF1aXJlKCcuL3RtcGxIYW5kbGVyJylcclxudmFyIHByb2Nlc3NFdmVudCA9IHJlcXVpcmUoJy4vcHJvY2Vzc0V2ZW50JylcclxudmFyIGdlbklkID0gcmVxdWlyZSgnLi91dGlscycpLmdlbklkXHJcbnZhciB0ZXN0RXZlbnQgPSByZXF1aXJlKCcuL3V0aWxzJykudGVzdEV2ZW50XHJcbnZhciBnZW5UZW1wbGF0ZSA9IHJlcXVpcmUoJy4vZ2VuVGVtcGxhdGUnKVxyXG52YXIgbm9kZXNWaXNpYmlsaXR5ID0gcmVxdWlyZSgnLi9ub2Rlc1Zpc2liaWxpdHknKVxyXG52YXIgbW9kZWwgPSByZXF1aXJlKCcuL21vZGVsJylcclxudmFyIHN1bSA9IHJlcXVpcmUoJ2hhc2gtc3VtJylcclxuXHJcbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24gKCkge1xyXG4gIHZhciBzZWxmID0gdGhpc1xyXG4gIHZhciBlbGVtQXJyID0gW11cclxuICB2YXIgYXJncyA9IFtdLnNsaWNlLmNhbGwoYXJndW1lbnRzKVxyXG4gIGlmIChBcnJheS5pc0FycmF5KHRoaXMuYmFzZS5tb2RlbCkpIHtcclxuICAgIC8vIGRvIGFycmF5IGJhc2VcclxuICAgIHRoaXMuYmFzZS50ZW1wbGF0ZSA9IHRoaXMuYmFzZS50ZW1wbGF0ZS50cmltKCkucmVwbGFjZSgvXFxzKy9nLCAnICcpXHJcblxyXG4gICAgLy8gZ2VuZXJhdGUgaWQgZm9yIHNlbGVjdG9yXHJcbiAgICB0aGlzLmJhc2UubW9kZWwgPSB0aGlzLmJhc2UubW9kZWwubWFwKGZ1bmN0aW9uIChtKSB7XHJcbiAgICAgIG1bJ2tlZXQtaWQnXSA9IGdlbklkKClcclxuICAgICAgcmV0dXJuIG1cclxuICAgIH0pXHJcbiAgICB0aGlzLmJhc2UubW9kZWwubWFwKGZ1bmN0aW9uIChtKSB7XHJcbiAgICAgIGVsZW1BcnIucHVzaChnZW5UZW1wbGF0ZS5jYWxsKHNlbGYsIG0pKVxyXG4gICAgfSlcclxuICB9IGVsc2UgaWYgKHR5cGVvZiB0aGlzLmJhc2UgPT09ICdvYmplY3QnKSB7XHJcbiAgICAvLyBkbyBvYmplY3QgYmFzZVxyXG4gICAgT2JqZWN0LmtleXModGhpcy5iYXNlKS5tYXAoZnVuY3Rpb24gKGtleSkge1xyXG4gICAgICB2YXIgY2hpbGQgPSBzZWxmLmJhc2Vba2V5XVxyXG4gICAgICBpZiAoY2hpbGQgJiYgdHlwZW9mIGNoaWxkID09PSAnb2JqZWN0Jykge1xyXG4gICAgICAgIHZhciBpZCA9IGdlbklkKClcclxuICAgICAgICBjaGlsZFsna2VldC1pZCddID0gaWRcclxuICAgICAgICBzZWxmLmJhc2Vba2V5XVsna2VldC1pZCddID0gaWRcclxuICAgICAgICB2YXIgbmV3RWxlbWVudCA9IGdlbkVsZW1lbnQuYXBwbHkoc2VsZiwgW2NoaWxkXS5jb25jYXQoYXJncykpXHJcbiAgICAgICAgZWxlbUFyci5wdXNoKG5ld0VsZW1lbnQpXHJcbiAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgc2VsZi5fX3N0YXRlTGlzdF9fID0gW11cclxuICAgICAgICB2YXIgdHBsID0gdG1wbEhhbmRsZXIuY2FsbChzZWxmLCBjaGlsZCwgZnVuY3Rpb24gKHN0YXRlKSB7XHJcbiAgICAgICAgICBzZWxmLl9fc3RhdGVMaXN0X18gPSBzZWxmLl9fc3RhdGVMaXN0X18uY29uY2F0KHN0YXRlKVxyXG4gICAgICAgIH0pXHJcbiAgICAgICAgdHBsID0gbm9kZXNWaXNpYmlsaXR5LmNhbGwoc2VsZiwgdHBsKVxyXG4gICAgICAgIHZhciB0ZW1wRGl2ID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnZGl2JylcclxuICAgICAgICB0ZW1wRGl2LmlubmVySFRNTCA9IHRwbFxyXG4gICAgICAgIHNldFN0YXRlLmNhbGwoc2VsZiwgYXJncylcclxuICAgICAgICBwcm9jZXNzRXZlbnQuY2FsbChzZWxmLCB0ZW1wRGl2KVxyXG4gICAgICAgIHRlbXBEaXYuY2hpbGROb2Rlcy5mb3JFYWNoKGZ1bmN0aW9uIChjKSB7XHJcbiAgICAgICAgICBpZiAoYy5ub2RlVHlwZSA9PT0gMSkge1xyXG4gICAgICAgICAgICBjLnNldEF0dHJpYnV0ZSgnZGF0YS1jaGVja3N1bScsIHN1bShjLm91dGVySFRNTCkpXHJcbiAgICAgICAgICB9XHJcbiAgICAgICAgICBlbGVtQXJyLnB1c2goYylcclxuICAgICAgICB9KVxyXG4gICAgICB9XHJcbiAgICB9KVxyXG4gIH0gZWxzZSBpZiAodHlwZW9mIHRoaXMuYmFzZSA9PT0gJ3N0cmluZycpIHtcclxuICAgIHRoaXMuX19zdGF0ZUxpc3RfXyA9IFtdXHJcbiAgICB2YXIgdHBsID0gdG1wbEhhbmRsZXIuY2FsbCh0aGlzLCB0aGlzLmJhc2UsIGZ1bmN0aW9uIChzdGF0ZSkge1xyXG4gICAgICBzZWxmLl9fc3RhdGVMaXN0X18gPSBzZWxmLl9fc3RhdGVMaXN0X18uY29uY2F0KHN0YXRlKVxyXG4gICAgfSlcclxuXHJcbiAgICB0cGwgPSBtb2RlbC5jYWxsKHRoaXMsIHRwbClcclxuICAgIHRwbCA9IG5vZGVzVmlzaWJpbGl0eS5jYWxsKHRoaXMsIHRwbClcclxuICAgIHZhciB0ZW1wRGl2ID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnZGl2JylcclxuICAgIHRlbXBEaXYuaW5uZXJIVE1MID0gdHBsXHJcbiAgICBzZXRTdGF0ZS5jYWxsKHRoaXMsIGFyZ3MpXHJcbiAgICB0ZXN0RXZlbnQodHBsKSAmJiBwcm9jZXNzRXZlbnQuY2FsbCh0aGlzLCB0ZW1wRGl2KVxyXG4gICAgdGVtcERpdi5jaGlsZE5vZGVzLmZvckVhY2goZnVuY3Rpb24gKGMpIHtcclxuICAgICAgaWYgKGMubm9kZVR5cGUgPT09IDEpIHtcclxuICAgICAgICBjLnNldEF0dHJpYnV0ZSgnZGF0YS1jaGVja3N1bScsIHN1bShjLm91dGVySFRNTCkpXHJcbiAgICAgIH1cclxuICAgICAgZWxlbUFyci5wdXNoKGMpXHJcbiAgICB9KVxyXG4gIH1cclxuXHJcbiAgcmV0dXJuIGVsZW1BcnJcclxufVxyXG4iLCJ2YXIgbG9vcENoaWxkcyA9IHJlcXVpcmUoJy4vdXRpbHMnKS5sb29wQ2hpbGRzXHJcblxyXG52YXIgbmV4dCA9IGZ1bmN0aW9uIChpLCBjLCByZW0pIHtcclxuICB2YXIgaGFza1xyXG4gIHZhciBldnROYW1lXHJcbiAgdmFyIGV2dGhhbmRsZXJcclxuICB2YXIgaGFuZGxlclxyXG4gIHZhciBpc0hhbmRsZXJcclxuICB2YXIgYXJndlxyXG4gIHZhciB2XHJcbiAgdmFyIGF0dHMgPSBjLmF0dHJpYnV0ZXNcclxuXHJcbiAgaWYgKGkgPCBhdHRzLmxlbmd0aCkge1xyXG4gICAgaGFzayA9IC9eay0vLnRlc3QoYXR0c1tpXS5ub2RlTmFtZSlcclxuICAgIGlmIChoYXNrKSB7XHJcbiAgICAgIGV2dE5hbWUgPSBhdHRzW2ldLm5vZGVOYW1lLnNwbGl0KCctJylbMV1cclxuICAgICAgZXZ0aGFuZGxlciA9IGF0dHNbaV0ubm9kZVZhbHVlXHJcbiAgICAgIGhhbmRsZXIgPSBldnRoYW5kbGVyLnNwbGl0KCcoJylcclxuICAgICAgaXNIYW5kbGVyID0gdGhpc1toYW5kbGVyWzBdXVxyXG4gICAgICBpZiAodHlwZW9mIGlzSGFuZGxlciA9PT0gJ2Z1bmN0aW9uJykge1xyXG4gICAgICAgIHJlbS5wdXNoKGF0dHNbaV0ubm9kZU5hbWUpXHJcbiAgICAgICAgYXJndiA9IFtdXHJcbiAgICAgICAgdiA9IGhhbmRsZXJbMV0uc2xpY2UoMCwgLTEpLnNwbGl0KCcsJykuZmlsdGVyKGZ1bmN0aW9uIChmKSB7IHJldHVybiBmICE9PSAnJyB9KVxyXG4gICAgICAgIGlmICh2Lmxlbmd0aCkgdi5tYXAoZnVuY3Rpb24gKHYpIHsgYXJndi5wdXNoKHYpIH0pXHJcbiAgICAgICAgYy5hZGRFdmVudExpc3RlbmVyKGV2dE5hbWUsIGlzSGFuZGxlci5iaW5kLmFwcGx5KGlzSGFuZGxlci5iaW5kKHRoaXMpLCBbY10uY29uY2F0KGFyZ3YpKSwgZmFsc2UpXHJcbiAgICAgIH1cclxuICAgIH1cclxuICAgIGkrK1xyXG4gICAgbmV4dC5hcHBseSh0aGlzLCBbIGksIGMsIHJlbSBdKVxyXG4gIH0gZWxzZSB7XHJcbiAgICAvL3JlbS5tYXAoZnVuY3Rpb24gKGYpIHsgYy5yZW1vdmVBdHRyaWJ1dGUoZikgfSlcclxuICB9XHJcbn1cclxuXHJcbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24gKGtOb2RlKSB7XHJcbiAgdmFyIHNlbGYgPSB0aGlzXHJcbiAgdmFyIGxpc3RLbm9kZUNoaWxkID0gW11cclxuICB2YXIgcmVtID0gW11cclxuICBsb29wQ2hpbGRzKGxpc3RLbm9kZUNoaWxkLCBrTm9kZSlcclxuICBsaXN0S25vZGVDaGlsZC5tYXAoZnVuY3Rpb24gKGMpIHtcclxuICAgIGlmIChjLm5vZGVUeXBlID09PSAxICYmIGMuaGFzQXR0cmlidXRlcygpKSB7XHJcbiAgICAgIG5leHQuYXBwbHkoc2VsZiwgWyAwLCBjLCByZW0gXSlcclxuICAgIH1cclxuICB9KVxyXG4gIGxpc3RLbm9kZUNoaWxkID0gW11cclxufVxyXG4iLCJtb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uIChzdHIpIHtcclxuICB2YXIgcmVzID0gc3RyLm1hdGNoKC9cXC4qXFwuL2cpXHJcbiAgdmFyIHJlc3VsdFxyXG4gIGlmIChyZXMgJiYgcmVzLmxlbmd0aCA+IDApIHtcclxuICAgIHJldHVybiBzdHIuc3BsaXQoJy4nKVxyXG4gIH1cclxuICByZXR1cm4gcmVzdWx0XHJcbn1cclxuIiwiZnVuY3Rpb24ga3RhZyAoKSB7XHJcbiAgdmFyIGFyZ3MgPSBbXS5zbGljZS5jYWxsKGFyZ3VtZW50cylcclxuICB2YXIgYXR0clxyXG4gIHZhciBpZHhcclxuICB2YXIgdGVcclxuICB2YXIgcmV0ID0gWyc8JywgYXJnc1swXSwgJz4nLCBhcmdzWzFdLCAnPC8nLCBhcmdzWzBdLCAnPiddXHJcbiAgaWYgKGFyZ3MubGVuZ3RoID4gMiAmJiB0eXBlb2YgYXJnc1syXSA9PT0gJ29iamVjdCcpIHtcclxuICAgIGZvciAoYXR0ciBpbiBhcmdzWzJdKSB7XHJcbiAgICAgIGlmICh0eXBlb2YgYXJnc1syXVthdHRyXSA9PT0gJ2Jvb2xlYW4nICYmIGFyZ3NbMl1bYXR0cl0pIHtcclxuICAgICAgICByZXQuc3BsaWNlKDIsIDAsICcgJywgYXR0cilcclxuICAgICAgfSBlbHNlIGlmIChhdHRyID09PSAnY2xhc3MnICYmIEFycmF5LmlzQXJyYXkoYXJnc1syXVthdHRyXSkpIHtcclxuICAgICAgICByZXQuc3BsaWNlKDIsIDAsICcgJywgYXR0ciwgJz1cIicsIGFyZ3NbMl1bYXR0cl0uam9pbignICcpLnRyaW0oKSwgJ1wiJylcclxuICAgICAgfSBlbHNlIHtcclxuICAgICAgICByZXQuc3BsaWNlKDIsIDAsICcgJywgYXR0ciwgJz1cIicsIGFyZ3NbMl1bYXR0cl0sICdcIicpXHJcbiAgICAgIH1cclxuICAgIH1cclxuICB9XHJcbiAgaWYgKGFyZ3MubGVuZ3RoID4gMyAmJiB0eXBlb2YgYXJnc1szXSA9PT0gJ29iamVjdCcpIHtcclxuICAgIGlkeCA9IHJldC5pbmRleE9mKCc+JylcclxuICAgIHRlID0gW2lkeCwgMCwgJyBzdHlsZT1cIiddXHJcbiAgICBmb3IgKGF0dHIgaW4gYXJnc1szXSkge1xyXG4gICAgICB0ZS5wdXNoKGF0dHIpXHJcbiAgICAgIHRlLnB1c2goJzonKVxyXG4gICAgICB0ZS5wdXNoKGFyZ3NbM11bYXR0cl0pXHJcbiAgICAgIHRlLnB1c2goJzsnKVxyXG4gICAgfVxyXG4gICAgdGUucHVzaCgnXCInKVxyXG4gICAgcmV0LnNwbGljZS5hcHBseShyZXQsIHRlKVxyXG4gIH1cclxuICByZXR1cm4gcmV0XHJcbn1cclxuXHJcbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24gKCkge1xyXG4gIHJldHVybiBrdGFnLmFwcGx5KG51bGwsIGFyZ3VtZW50cykuam9pbignJylcclxufVxyXG4iLCIvLyBmdW5jdGlvbiB0byByZXNvbHZlIHRlcm5hcnkgb3BlcmF0aW9uXHJcblxyXG5mdW5jdGlvbiB0ZXN0KHN0cil7XHJcbiAgaWYoc3RyID09PSAnXFwnXFwnJyB8fCBzdHIgPT09ICdcXFwiXFxcIicpXHJcbiAgICByZXR1cm4gJydcclxuICByZXR1cm4gc3RyXHJcbn1cclxuXHJcbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24oaW5wdXQpIHtcclxuICBpZihpbnB1dC5tYXRjaCgvKFteP10qKVxcPyhbXjpdKik6KFteO10qKXwoXFxzKj1cXHMqKVteO10qL2cpKXtcclxuICAgIHZhciB0ID0gaW5wdXQuc3BsaXQoJz8nKVxyXG4gICAgdmFyIGNvbmRpdGlvbiA9IHRbMF1cclxuICAgIHZhciBsZWZ0SGFuZCA9IHRbMV0uc3BsaXQoJzonKVswXVxyXG4gICAgdmFyIHJpZ2h0SGFuZCA9IHRbMV0uc3BsaXQoJzonKVsxXVxyXG5cclxuICAgIC8vIGNoZWNrIHRoZSBjb25kaXRpb24gZnVsZmlsbG1lbnRcclxuICAgIGlmKHRoaXNbY29uZGl0aW9uXSlcclxuICAgICAgcmV0dXJuIHsgXHJcbiAgICAgICAgdmFsdWU6dGVzdChsZWZ0SGFuZCksXHJcbiAgICAgICAgc3RhdGU6IGNvbmRpdGlvblxyXG4gICAgICB9XHJcbiAgICBlbHNlXHJcbiAgICAgIHJldHVybiB7IFxyXG4gICAgICAgIHZhbHVlOnRlc3QocmlnaHRIYW5kKSxcclxuICAgICAgICBzdGF0ZTogY29uZGl0aW9uXHJcbiAgICAgIH1cclxuICB9IGVsc2UgcmV0dXJuIGZhbHNlXHJcbn0iLCJ2YXIgZ2VuRWxlbWVudCA9IHJlcXVpcmUoJy4vZ2VuRWxlbWVudCcpXHJcbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24gKCkge1xyXG4gIHZhciBzZWxmID0gdGhpc1xyXG4gIHZhciBjbG9uZUNoaWxkID0gW10uc2hpZnQuY2FsbChhcmd1bWVudHMpXHJcbiAgT2JqZWN0LmtleXMoY2xvbmVDaGlsZCkubWFwKGZ1bmN0aW9uIChjKSB7XHJcbiAgICB2YXIgaGRsID0gY2xvbmVDaGlsZFtjXS5tYXRjaCgve3soW157fV0rKX19L2cpXHJcbiAgICBpZiAoaGRsICYmIGhkbC5sZW5ndGgpIHtcclxuICAgICAgdmFyIHN0ciA9ICcnXHJcbiAgICAgIGhkbC5tYXAoZnVuY3Rpb24gKHMpIHtcclxuICAgICAgICB2YXIgcmVwID0gcy5yZXBsYWNlKC97eyhbXnt9XSspfX0vZywgJyQxJylcclxuICAgICAgICBpZiAoc2VsZltyZXBdICE9PSB1bmRlZmluZWQpIHtcclxuICAgICAgICAgIGdlbkVsZW1lbnQudXBkYXRlU3RhdGVMaXN0LmNhbGwoc2VsZiwgcmVwKVxyXG4gICAgICAgICAgaWYgKHNlbGZbcmVwXSA9PT0gZmFsc2UpIHtcclxuICAgICAgICAgICAgZGVsZXRlIGNsb25lQ2hpbGRbY11cclxuICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgIHN0ciArPSBzZWxmW3JlcF1cclxuICAgICAgICAgICAgY2xvbmVDaGlsZFtjXSA9IHN0clxyXG4gICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuICAgICAgfSlcclxuICAgIH1cclxuICB9KVxyXG59XHJcbiIsIm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24gKGNoaWxkLCB1cGRhdGVTdGF0ZUxpc3QpIHtcclxuICB2YXIgc2VsZiA9IHRoaXNcclxuICBpZiAoY2hpbGQuY2xhc3MpIHtcclxuICAgIHZhciBjID0gY2hpbGQuY2xhc3MubWF0Y2goL3t7KFtee31dKyl9fS9nKVxyXG4gICAgdmFyIGNsYXNzU3RyID0gJydcclxuICAgIGlmIChjICYmIGMubGVuZ3RoKSB7XHJcbiAgICAgIGMubWFwKGZ1bmN0aW9uIChzKSB7XHJcbiAgICAgICAgdmFyIHJlcCA9IHMucmVwbGFjZSgve3soW157fV0rKX19L2csICckMScpXHJcbiAgICAgICAgaWYgKHNlbGZbcmVwXSAhPT0gdW5kZWZpbmVkKSB7XHJcbiAgICAgICAgICB1cGRhdGVTdGF0ZUxpc3QocmVwKVxyXG4gICAgICAgICAgc2VsZltyZXBdLmNzdG9yZS5tYXAoZnVuY3Rpb24gKGMpIHtcclxuICAgICAgICAgICAgY2xhc3NTdHIgKz0gYyArICcgJ1xyXG4gICAgICAgICAgfSlcclxuICAgICAgICB9XHJcbiAgICAgIH0pXHJcbiAgICB9XHJcbiAgICByZXR1cm4gY2xhc3NTdHIubGVuZ3RoID8gY2xhc3NTdHIudHJpbSgpIDogY2hpbGQuY2xhc3NcclxuICB9XHJcbiAgcmV0dXJuIGZhbHNlXHJcbn1cclxuIiwidmFyIHN0ckludGVycHJldGVyID0gcmVxdWlyZSgnLi9zdHJJbnRlcnByZXRlcicpXHJcbnZhciB0ZXJuYXJ5T3BzID0gcmVxdWlyZSgnLi90ZXJuYXJ5T3BzJylcclxuXHJcbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24gKHN0ciwgdXBkYXRlU3RhdGVMaXN0KSB7XHJcbiAgdmFyIHNlbGYgPSB0aGlzXHJcbiAgdmFyIGFyclByb3BzID0gc3RyLm1hdGNoKC97eyhbXnt9XSspfX0vZylcclxuICBpZiAoYXJyUHJvcHMgJiYgYXJyUHJvcHMubGVuZ3RoKSB7XHJcbiAgICBhcnJQcm9wcy5tYXAoZnVuY3Rpb24gKHMpIHtcclxuICAgICAgdmFyIHJlcCA9IHMucmVwbGFjZSgve3soW157fV0rKX19L2csICckMScpXHJcbiAgICAgIHZhciBpc09iamVjdE5vdGF0aW9uID0gc3RySW50ZXJwcmV0ZXIocmVwKVxyXG4gICAgICB2YXIgaXNUZXJuYXJ5ID0gdGVybmFyeU9wcy5jYWxsKHNlbGYsIHJlcClcclxuICAgICAgaWYgKCFpc09iamVjdE5vdGF0aW9uKSB7XHJcbiAgICAgICAgaWYgKHNlbGZbcmVwXSAhPT0gdW5kZWZpbmVkKSB7XHJcbiAgICAgICAgICB1cGRhdGVTdGF0ZUxpc3QocmVwKVxyXG4gICAgICAgICAgc3RyID0gc3RyLnJlcGxhY2UoJ3t7JytyZXArJ319Jywgc2VsZltyZXBdKVxyXG4gICAgICAgIH0gZWxzZSBpZihpc1Rlcm5hcnkpe1xyXG4gICAgICAgICAgdXBkYXRlU3RhdGVMaXN0KGlzVGVybmFyeS5zdGF0ZSlcclxuICAgICAgICAgIHN0ciA9IHN0ci5yZXBsYWNlKCd7eycrcmVwKyd9fScsIGlzVGVybmFyeS52YWx1ZSlcclxuICAgICAgICB9IFxyXG4gICAgICB9IGVsc2Uge1xyXG4gICAgICAgIHVwZGF0ZVN0YXRlTGlzdChyZXApXHJcbiAgICAgICAgc3RyID0gc3RyLnJlcGxhY2UoJ3t7JytyZXArJ319Jywgc2VsZltpc09iamVjdE5vdGF0aW9uWzBdXVtpc09iamVjdE5vdGF0aW9uWzFdXSlcclxuICAgICAgfVxyXG4gICAgICBpZiAocmVwLm1hdGNoKC9eXFw/L2cpKSB7XHJcbiAgICAgICAgdXBkYXRlU3RhdGVMaXN0KHJlcC5yZXBsYWNlKCc/JywgJycpKVxyXG4gICAgICB9XHJcbiAgICAgIGlmIChyZXAubWF0Y2goL15tb2RlbFxcOi9nKSkge1xyXG4gICAgICAgIHVwZGF0ZVN0YXRlTGlzdChyZXAucmVwbGFjZSgnbW9kZWw6JywgJycpKVxyXG4gICAgICB9XHJcbiAgICB9KVxyXG4gIH1cclxuICByZXR1cm4gc3RyXHJcbn1cclxuXHJcbiIsInZhciBjb3B5ID0gcmVxdWlyZSgnLi9jb3B5JylcclxuXHJcbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24gKHN0eWxlcywgdXBkYXRlU3RhdGVMaXN0KSB7XHJcbiAgdmFyIHNlbGYgPSB0aGlzXHJcbiAgdmFyIGNvcHlTdHlsZXMgPSBjb3B5KHN0eWxlcylcclxuICBpZiAoc3R5bGVzKSB7XHJcbiAgICBPYmplY3Qua2V5cyhjb3B5U3R5bGVzKS5tYXAoZnVuY3Rpb24gKHN0eWxlKSB7XHJcbiAgICAgIHZhciBhcnJQcm9wcyA9IGNvcHlTdHlsZXNbc3R5bGVdLm1hdGNoKC97eyhbXnt9XSspfX0vZylcclxuICAgICAgaWYgKGFyclByb3BzICYmIGFyclByb3BzLmxlbmd0aCkge1xyXG4gICAgICAgIGFyclByb3BzLm1hcChmdW5jdGlvbiAocykge1xyXG4gICAgICAgICAgdmFyIHJlcCA9IHMucmVwbGFjZSgve3soW157fV0rKX19L2csICckMScpXHJcbiAgICAgICAgICBpZiAoc2VsZltyZXBdICE9PSB1bmRlZmluZWQpIHtcclxuICAgICAgICAgICAgdXBkYXRlU3RhdGVMaXN0KHJlcClcclxuICAgICAgICAgICAgY29weVN0eWxlc1tzdHlsZV0gPSBjb3B5U3R5bGVzW3N0eWxlXS5yZXBsYWNlKC97eyhbXnt9XSspfX0vLCBzZWxmW3JlcF0pXHJcbiAgICAgICAgICB9XHJcbiAgICAgICAgfSlcclxuICAgICAgfVxyXG4gICAgfSlcclxuICB9XHJcbiAgcmV0dXJuIGNvcHlTdHlsZXNcclxufVxyXG4iLCJ2YXIgZ2V0SWQgPSBmdW5jdGlvbiAoaWQpIHtcclxuICByZXR1cm4gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoaWQpXHJcbn1cclxuXHJcbmV4cG9ydHMuZ2V0SWQgPSBnZXRJZFxyXG5cclxuZXhwb3J0cy5nZW5JZCA9IGZ1bmN0aW9uICgpIHtcclxuICByZXR1cm4gKE1hdGgucm91bmQoTWF0aC5yYW5kb20oKSAqIDB4MSAqIDFlMTIpKS50b1N0cmluZygzMilcclxufVxyXG5cclxuZXhwb3J0cy5zZWxlY3RvciA9IGZ1bmN0aW9uIChpZCkge1xyXG4gIHJldHVybiBkb2N1bWVudC5xdWVyeVNlbGVjdG9yKCdba2VldC1pZD1cIicgKyBpZCArICdcIl0nKVxyXG59XHJcblxyXG52YXIgbG9vcENoaWxkcyA9IGZ1bmN0aW9uIChhcnIsIGVsZW0pIHtcclxuICBmb3IgKHZhciBjaGlsZCA9IGVsZW0uZmlyc3RDaGlsZDsgY2hpbGQgIT09IG51bGw7IGNoaWxkID0gY2hpbGQubmV4dFNpYmxpbmcpIHtcclxuICAgIGFyci5wdXNoKGNoaWxkKVxyXG4gICAgaWYgKGNoaWxkLmhhc0NoaWxkTm9kZXMoKSkge1xyXG4gICAgICBsb29wQ2hpbGRzKGFyciwgY2hpbGQpXHJcbiAgICB9XHJcbiAgfVxyXG59XHJcblxyXG5leHBvcnRzLmxvb3BDaGlsZHMgPSBsb29wQ2hpbGRzXHJcblxyXG5leHBvcnRzLmNoZWNrTm9kZUF2YWlsYWJpbGl0eSA9IGZ1bmN0aW9uKG9iaiwgZ2VuVGVtcGxhdGUsIGNhbGxiYWNrKSB7XHJcbiAgdmFyIGVsZVxyXG4gIHZhciBjaGVja2VkID0gZmFsc2VcclxuICB2YXIgaWQgPSB0aGlzLmVsXHJcbiAgdmFyIHNlbGYgPSB0aGlzXHJcbiAgdmFyIHQgPSBzZXRJbnRlcnZhbChmdW5jdGlvbigpIHtcclxuICAgIGVsZSA9IGdldElkKGlkKVxyXG4gICAgaWYgKGVsZSkge1xyXG4gICAgICBjbGVhckludGVydmFsKHQpXHJcbiAgICAgIGNoZWNrZWQgPSB0cnVlXHJcbiAgICAgIGNhbGxiYWNrLmNhbGwoc2VsZiwgZWxlLCBvYmosIGdlblRlbXBsYXRlKVxyXG4gICAgfVxyXG4gIH0sIDApXHJcbiAgc2V0VGltZW91dChmdW5jdGlvbigpIHtcclxuICAgIGlmICghY2hlY2tlZCkge1xyXG4gICAgICBjbGVhckludGVydmFsKHQpXHJcbiAgICAgIHRocm93IG5ldyBFcnJvcignVW5hYmxlIHRvIGZpbmQgaHRtbCBlbnRpdHkgd2l0aCBpZCAnICsgaWQgKyAnLicpXHJcbiAgICB9XHJcbiAgfSwgNTAwKVxyXG59XHJcblxyXG5leHBvcnRzLmF2YWlsYWJsZSA9IGZ1bmN0aW9uKGVsZSwgb2JqLCBnZW5UZW1wbGF0ZSl7XHJcbiAgZWxlLmFwcGVuZENoaWxkKGdlblRlbXBsYXRlLmNhbGwodGhpcywgb2JqKSlcclxufVxyXG5cclxuZXhwb3J0cy5mbiA9IGZ1bmN0aW9uKGYpIHtcclxuIHJldHVybiB0eXBlb2YgZiA9PT0gJ2Z1bmN0aW9uJ1xyXG59XHJcblxyXG5leHBvcnRzLnRlc3RFdmVudCA9IGZ1bmN0aW9uKHRtcGwpIHtcclxuICByZXR1cm4gLyBrLS8udGVzdCh0bXBsKVxyXG59IiwiJ3VzZSBzdHJpY3QnXHJcbi8qKlxyXG4gKiBLZWV0anMgdjMuNS4yIEFscGhhIHJlbGVhc2U6IGh0dHBzOi8vZ2l0aHViLmNvbS9rZWV0anMva2VldC5qc1xyXG4gKiBNaW5pbWFsaXN0IHZpZXcgbGF5ZXIgZm9yIHRoZSB3ZWJcclxuICpcclxuICogPDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8IEtlZXRqcyA+Pj4+Pj4+Pj4+Pj4+Pj4+Pj4+Pj4+Pj4+Pj4+Pj5cclxuICpcclxuICogQ29weXJpZ2h0IDIwMTgsIFNoYWhydWwgTml6YW0gU2VsYW1hdFxyXG4gKiBSZWxlYXNlZCB1bmRlciB0aGUgTUlUIExpY2Vuc2UuXHJcbiAqL1xyXG5cclxudmFyIGdldElkID0gcmVxdWlyZSgnLi9jb21wb25lbnRzL3V0aWxzJykuZ2V0SWRcclxudmFyIGdlbklkID0gcmVxdWlyZSgnLi9jb21wb25lbnRzL3V0aWxzJykuZ2VuSWRcclxudmFyIHNlbGVjdG9yID0gcmVxdWlyZSgnLi9jb21wb25lbnRzL3V0aWxzJykuc2VsZWN0b3JcclxudmFyIGZuID0gcmVxdWlyZSgnLi9jb21wb25lbnRzL3V0aWxzJykuZm5cclxudmFyIGNoZWNrTm9kZUF2YWlsYWJpbGl0eSA9IHJlcXVpcmUoJy4vY29tcG9uZW50cy91dGlscycpLmNoZWNrTm9kZUF2YWlsYWJpbGl0eVxyXG52YXIgYXZhaWxhYmxlID0gcmVxdWlyZSgnLi9jb21wb25lbnRzL3V0aWxzJykuYXZhaWxhYmxlXHJcbnZhciBwYXJzZVN0ciA9IHJlcXVpcmUoJy4vY29tcG9uZW50cy9wYXJzZVN0cicpXHJcbnZhciBnZW5UZW1wbGF0ZSA9IHJlcXVpcmUoJy4vY29tcG9uZW50cy9nZW5UZW1wbGF0ZScpXHJcbnZhciBzZXRET00gPSByZXF1aXJlKCdzZXQtZG9tJylcclxuXHJcbnNldERPTS5rZXkgPSAna2VldC1pZCdcclxuXHJcbi8qKlxyXG4gKiBAcHJpdmF0ZVxyXG4gKiBAZGVzY3JpcHRpb25cclxuICogTG9vcCByZW5kZXIgYWxsIGluaXRpYWxseSBwYXJzZWQgaHRtbCBlbnRpdGllcyB0byBcclxuICogdGFyZ2V0IERPTSBub2RlIGlkLlxyXG4gKlxyXG4gKiBAcGFyYW0ge0ludH0gaSAtIFRoZSBpbmRleCBvZiBodG1sIGVudGl0eS5cclxuICogQHBhcmFtIHtOb2RlfSBlbGUgLSBUaGUgdGFyZ2V0IERPTSBub2RlLlxyXG4gKiBAcGFyYW0ge05vZGV9IGVscyAtIFRoZSBsaXN0IG9mIGh0bWwgZW50aXRpZXMuXHJcbiAqL1xyXG52YXIgbmV4dCA9IGZ1bmN0aW9uIChpLCBlbGUsIGVscykge1xyXG4gIHZhciBzZWxmID0gdGhpc1xyXG4gIGlmIChpIDwgZWxzLmxlbmd0aCkge1xyXG4gICAgaWYgKCFlbGUuY2hpbGROb2Rlc1tpXSkgZWxlLmFwcGVuZENoaWxkKGVsc1tpXSlcclxuICAgIGkrK1xyXG4gICAgbmV4dC5hcHBseSh0aGlzLCBbIGksIGVsZSwgZWxzIF0pXHJcbiAgfSBlbHNlIHtcclxuICAgIC8vIE9uY2UgaW50aWFsIHJlbmRlciBhbHJlYWR5IGluIHBsYWNlIGNvbnNlY3V0aXZlbHlcclxuICAgIC8vIHdhdGNoIHRoZSBvYmplY3QgaW4gQ29tcG9uZW50cy5wcm90b3R5cGUuYmFzZS4gQWRkIFxyXG4gICAgLy8gYWRkaXRpb25hbCBvYmplY3QgcHJvcHMgb3IgZGVsZXRlIGV4aXN0aW5nIG9iamVjdCBcclxuICAgIC8vIHByb3BzLCB3aGljaCB3aWxsIHJlZmxlY3QgaW4gdGhlIGNvbXBvbmVudCByZW5kZXJlZCBcclxuICAgIC8vIGVsZW1lbnRzLlxyXG4gICAgdmFyIHdhdGNoT2JqZWN0ID0gZnVuY3Rpb24gKG9iaikge1xyXG4gICAgICByZXR1cm4gbmV3IFByb3h5KG9iaiwge1xyXG4gICAgICAgIHNldDogZnVuY3Rpb24gKHRhcmdldCwga2V5LCB2YWx1ZSkge1xyXG4gICAgICAgICAgdGFyZ2V0W2tleV0gPSB2YWx1ZVxyXG4gICAgICAgICAgc2VsZi5iYXNlW2tleV0gPSB0YXJnZXRba2V5XVxyXG4gICAgICAgICAgcmV0dXJuIHRydWVcclxuICAgICAgICB9LFxyXG4gICAgICAgIGRlbGV0ZVByb3BlcnR5OiBmdW5jdGlvbiAodGFyZ2V0LCBrZXkpIHtcclxuICAgICAgICAgIHZhciBpZCA9IHRhcmdldFtrZXldWydrZWV0LWlkJ11cclxuICAgICAgICAgIHZhciBlbCA9IHNlbGVjdG9yKGlkKVxyXG4gICAgICAgICAgZWwgJiYgZWwucmVtb3ZlKClcclxuICAgICAgICAgIGRlbGV0ZSBzZWxmLmJhc2Vba2V5XVxyXG4gICAgICAgICAgcmV0dXJuIHRydWVcclxuICAgICAgICB9XHJcbiAgICAgIH0pXHJcbiAgICB9XHJcbiAgICAvLyBvbmx5IGphdmFzY3JpcHQgb2JqZWN0cyBpcyB3YXRjaGFibGVcclxuICAgIGlmICh0eXBlb2YgdGhpcy5iYXNlID09PSAnb2JqZWN0JykgeyB0aGlzLmJhc2VQcm94eSA9IHdhdGNoT2JqZWN0KHRoaXMuYmFzZSkgfVxyXG5cclxuICAgIC8vIHNpbmNlIGNvbXBvbmVudCBhbHJlYWR5IHJlbmRlcmVkLCB0cmlnZ2VyIGl0cyBsaWZlLWN5Y2xlIG1ldGhvZFxyXG4gICAgaWYgKHRoaXMuY29tcG9uZW50RGlkTW91bnQgJiYgdHlwZW9mIHRoaXMuY29tcG9uZW50RGlkTW91bnQgPT09ICdmdW5jdGlvbicpIHtcclxuICAgICAgdGhpcy5jb21wb25lbnREaWRNb3VudCgpXHJcbiAgICB9XHJcbiAgfVxyXG59XHJcblxyXG4vKipcclxuICogQGRlc2NyaXB0aW9uXHJcbiAqIFRoZSBtYWluIGNvbnN0cnVjdG9yIG9mIEtlZXRcclxuICpcclxuICogQHBhcmFtIHtTdHJpbmcgfCBhcmcwWywgYXJnMVssIGFyZzJbLCAuLi5dXV19IGFyZ3VtZW50cyAtIEN1c3RvbSBwcm9wZXJ0eSBuYW1lc1xyXG4gKiBpLmUgdXNpbmcgJ2NoZWNrZWQnIGZvciBpbnB1dCBlbGVtZW50cy5cclxuICogVXNhZ2UgOi1cclxuICpcclxuICogICAgY29uc3QgQXBwIGV4dGVuZHMgS2VldCB7XHJcbiAqICAgICAgY29uc3RydWN0b3IoLi4uYXJncykge1xyXG4gKiAgICAgICAgc3VwZXIoKVxyXG4gKiAgICAgICAgdGhpcy5hcmdzID0gYXJnc1xyXG4gKiAgICAgIH1cclxuICogICAgfVxyXG4gKiAgICBjb25zdCBhcHAgPSBuZXcgQXBwKCdjaGVja2VkJylcclxuICpcclxuICogZm9yIGV4YW1wbGUgdXNhZ2UgY2FzZXMgc2VlIGh0dHBzOi8vZ2l0aHViLmNvbS9zeWFydWwva2VldC9ibG9iL21hc3Rlci9leGFtcGxlcy9jaGVjay5qc1xyXG4gKi9cclxuZnVuY3Rpb24gS2VldCAoKSB7XHJcbiAgLy8gcHJlcGFyZSB0aGUgc3RvcmUgZm9yIHN0YXRlcywgdGhpcyBpcyB0aGUgaW50ZXJuYWwgc3RhdGUtbWFuYWdlbWVudCBmb3IgdGhlXHJcbiAgLy8gY29tcG9uZW50cy4gUGVyc29uYWxseSBJIG5ldmVyIGdldCB0byBsaWtlIHN0YXRlLW1hbmFnZW1lbnQgaW4gSmF2YVNjcmlwdC5cclxuICAvLyBUaGUgaWRlYSBtaWdodCBzb3VuZCBkaXZpbmUgYnV0IHlvdSdsbCBzdHVjayBpbiB2ZXJ5IGNvbXBsaWNhdGVkIGdldC10by1tYXN0ZXJcclxuICAvLyB0aGlzIGZyYW1ld29yay9mbG93IGN5Y2xlcyB3aGVyZSB5b3UgYWx3YXlzIHdyaXRlIHRoZSBzdGF0ZSBpbiBzb21lIGV4dGVybmFsIFxyXG4gIC8vIHN0b3JlIGFuZCB3cml0ZSBsb25nIGxvZ2ljcyB0byBkbyBzbWFsbCBzdHVmZnMgYW5kIHRoZXkgYXJlIHZlcnkgc2xvdy4gT24gdGhlIFxyXG4gIC8vIG90aGVyIGhhbmQsIHRoaXMgaW50ZXJuYWwgc3RvcmUgaXMgcmVsYXRpdmVseSBzaW1wbGUsIGhhcyByZWZlcmVuY2VzIGFuZCB0aGUgXHJcbiAgLy8gYXZhaWxhYmlsaXR5IG9mIHNoYXJpbmcgYWNyb3NzIG11bHRpcGxlIGNvbXBvbmVudHMgaW4gYW55IGNhc2UuXHJcbiAgT2JqZWN0LmRlZmluZVByb3BlcnR5KHRoaXMsICdfX3N0YXRlTGlzdF9fJywge1xyXG4gICAgZW51bWVyYWJsZTogZmFsc2UsXHJcbiAgICB3cml0YWJsZTogdHJ1ZVxyXG4gIH0pXHJcbiAgT2JqZWN0LmRlZmluZVByb3BlcnR5KHRoaXMsICdfX3JlZ2lzdGVyTW9kZWxfXycsIHtcclxuICAgIGVudW1lcmFibGU6IGZhbHNlLFxyXG4gICAgd3JpdGFibGU6IHRydWVcclxuICB9KVxyXG59XHJcblxyXG5LZWV0LnByb3RvdHlwZS5tb3VudCA9IGZ1bmN0aW9uIChpbnN0YW5jZSkge1xyXG4gIC8vIEJlZm9yZSB3ZSBiZWdpbiB0byBwYXJzZSBhbiBpbnN0YW5jZSwgZG8gYSBydW4tZG93biBjaGVja3NcclxuICAvLyB0byBjbGVhbiB1cCBiYWNrLXRpY2sgc3RyaW5nIHdoaWNoIHVzdWFsbHkgaGFzIGxpbmUgc3BhY2luZ1xyXG4gIGlmICh0eXBlb2YgaW5zdGFuY2UgPT09ICdvYmplY3QnKSB7XHJcbiAgICBPYmplY3Qua2V5cyhpbnN0YW5jZSkubWFwKGZ1bmN0aW9uIChrZXkpIHtcclxuICAgICAgaWYgKHR5cGVvZiBpbnN0YW5jZVtrZXldID09PSAnc3RyaW5nJykge1xyXG4gICAgICAgIGluc3RhbmNlW2tleV0gPSBpbnN0YW5jZVtrZXldLnRyaW0oKS5yZXBsYWNlKC9cXHMrL2csICcgJylcclxuICAgICAgfSBlbHNlIGlmICh0eXBlb2YgaW5zdGFuY2Vba2V5XSA9PT0gJ29iamVjdCcgJiYgdHlwZW9mIGluc3RhbmNlW2tleV1bJ3RlbXBsYXRlJ10gPT09ICdzdHJpbmcnKSB7XHJcbiAgICAgICAgaW5zdGFuY2Vba2V5XVsndGVtcGxhdGUnXSA9IGluc3RhbmNlW2tleV1bJ3RlbXBsYXRlJ10udHJpbSgpLnJlcGxhY2UoL1xccysvZywgJyAnKVxyXG4gICAgICB9XHJcbiAgICB9KVxyXG4gIH0gZWxzZSBpZiAodHlwZW9mIGluc3RhbmNlID09PSAnc3RyaW5nJykge1xyXG4gICAgaW5zdGFuY2UgPSBpbnN0YW5jZS50cmltKCkucmVwbGFjZSgvXFxzKy9nLCAnICcpXHJcbiAgfVxyXG4gIC8vIHdlIHN0b3JlIHRoZSBwcmlzdGluZSBpbnN0YW5jZSBpbiBDb21wb25lbnQuYmFzZVxyXG4gIHRoaXMuYmFzZSA9IGluc3RhbmNlXHJcbiAgcmV0dXJuIHRoaXNcclxufVxyXG5cclxuS2VldC5wcm90b3R5cGUuZmx1c2ggPSBmdW5jdGlvbiAoaW5zdGFuY2UpIHtcclxuICAvLyBDdXN0b20gbWV0aG9kIHRvIGNsZWFuIHVwIHRoZSBjb21wb25lbnQgRE9NIHRyZWVcclxuICAvLyB1c2VmdWwgaWYgd2UgbmVlZCB0byBkbyBjbGVhbiB1cCByZXJlbmRlci5cclxuICB2YXIgZWxlID0gZ2V0SWQodGhpcy5lbClcclxuICBpZiAoZWxlKSBlbGUuaW5uZXJIVE1MID0gJydcclxuICByZXR1cm4gdGhpc1xyXG59XHJcblxyXG5LZWV0LnByb3RvdHlwZS5saW5rID0gZnVuY3Rpb24gKGlkKSB7XHJcbiAgLy8gVGhlIHRhcmdldCBET00gd2hlcmUgdGhlIHJlbmRlcmluZyB3aWxsIHRvb2sgcGxhY2UuXHJcbiAgLy8gV2UgY291bGQgYWxzbyBhcHBseSBsaWZlLWN5Y2xlIG1ldGhvZCBiZWZvcmUgdGhlXHJcbiAgLy8gcmVuZGVyIGhhcHBlbi5cclxuICB0aGlzLmVsID0gaWRcclxuICBpZiAodGhpcy5jb21wb25lbnRXaWxsTW91bnQgJiYgdHlwZW9mIHRoaXMuY29tcG9uZW50V2lsbE1vdW50ID09PSAnZnVuY3Rpb24nKSB7XHJcbiAgICB0aGlzLmNvbXBvbmVudFdpbGxNb3VudCgpXHJcbiAgfVxyXG4gIHRoaXMucmVuZGVyKClcclxuICByZXR1cm4gdGhpc1xyXG59XHJcblxyXG5LZWV0LnByb3RvdHlwZS5yZW5kZXIgPSBmdW5jdGlvbiAoKSB7XHJcbiAgLy8gUmVuZGVyIHRoaXMgY29tcG9uZW50IHRvIHRoZSB0YXJnZXQgRE9NXHJcbiAgdmFyIGVsZSA9IGdldElkKHRoaXMuZWwpXHJcbiAgdmFyIGVscyA9IHBhcnNlU3RyLmFwcGx5KHRoaXMsIHRoaXMuYXJncylcclxuICBpZiAoZWxlKSB7XHJcbiAgICBuZXh0LmFwcGx5KHRoaXMsIFsgMCwgZWxlLCBlbHMgXSlcclxuICB9XHJcbiAgcmV0dXJuIHRoaXNcclxufVxyXG5cclxuS2VldC5wcm90b3R5cGUuY2x1c3RlciA9IGZ1bmN0aW9uICgpIHtcclxuICAvLyBDaGFpbiBtZXRob2QgdG8gcnVuIGV4dGVybmFsIGZ1bmN0aW9uKHMpLCB0aGlzIGJhc2ljYWxseSBzZXJ2ZVxyXG4gIC8vIGFzIGFuIGluaXRpYWxpemVyIGZvciBhbGwgY2hpbGQgY29tcG9uZW50cyB3aXRoaW4gdGhlIGluc3RhbmNlIHRyZWVcclxuICB2YXIgYXJncyA9IFtdLnNsaWNlLmNhbGwoYXJndW1lbnRzKVxyXG4gIGlmIChhcmdzLmxlbmd0aCA+IDApIHtcclxuICAgIGFyZ3MubWFwKGZ1bmN0aW9uIChmKSB7XHJcbiAgICAgIGlmICh0eXBlb2YgZiA9PT0gJ2Z1bmN0aW9uJykgZigpXHJcbiAgICB9KVxyXG4gIH1cclxufVxyXG5cclxuS2VldC5wcm90b3R5cGUuYWRkID0gZnVuY3Rpb24gKG9iaiwgaW50ZXJjZXB0b3IpIHtcclxuICAvLyBNZXRob2QgdG8gYWRkIGEgbmV3IG9iamVjdCB0byBjb21wb25lbnQgbW9kZWxcclxuICB2YXIgZWxlID0gZ2V0SWQodGhpcy5lbClcclxuICBvYmpbJ2tlZXQtaWQnXSA9IGdlbklkKClcclxuICB0aGlzLmJhc2UubW9kZWwgPSB0aGlzLmJhc2UubW9kZWwuY29uY2F0KG9iailcclxuICAvLyBpZiBpbnRlcmNlcHRvciBpcyBkZWNsYXJlZCBleGVjdXRlIGl0IGJlZm9yZSBub2RlIHVwZGF0ZVxyXG4gIGludGVyY2VwdG9yICYmIGZuKGludGVyY2VwdG9yKSAmJiBpbnRlcmNlcHRvci5jYWxsKHRoaXMpXHJcbiAgLy8gdXBkYXRlIHRoZSBub2RlLCBpZiBpdCBub3QgYXZhaWFsYmUgd2Uga2VlcCBjaGVja2luZyB0aGUgYXZhaWxhYmlsdHkgZm9yIGEgdGltZVxyXG4gIGVsZSAmJiBlbGUuYXBwZW5kQ2hpbGQoZ2VuVGVtcGxhdGUuY2FsbCh0aGlzLCBvYmopKSB8fCBjaGVja05vZGVBdmFpbGFiaWxpdHkuY2FsbCh0aGlzLCBvYmosIGdlblRlbXBsYXRlLCBhdmFpbGFibGUpXHJcbn1cclxuXHJcbktlZXQucHJvdG90eXBlLmRlc3Ryb3kgPSBmdW5jdGlvbiAoaWQsIGF0dHIsIGludGVyY2VwdG9yKSB7XHJcbiAgLy8gTWV0aG9kIHRvIGRlc3Ryb3kgYSBzdWJtb2RlbCBvZiBhIGNvbXBvbmVudFxyXG4gIHZhciBzZWxmID0gdGhpc1xyXG4gIHRoaXMuYmFzZS5tb2RlbCA9IHRoaXMuYmFzZS5tb2RlbC5maWx0ZXIoZnVuY3Rpb24gKG9iaiwgaW5kZXgpIHtcclxuICAgIGlmIChpZCA9PT0gb2JqW2F0dHJdKSB7XHJcbiAgICAgIHZhciBub2RlID0gc2VsZWN0b3Iob2JqWydrZWV0LWlkJ10pXHJcbiAgICAgIGlmIChub2RlKSB7IFxyXG4gICAgICAgIC8vIGlmIGludGVyY2VwdG9yIGlzIGRlY2xhcmVkIGV4ZWN1dGUgaXQgYmVmb3JlIG5vZGUgdXBkYXRlXHJcbiAgICAgICAgaW50ZXJjZXB0b3IgJiYgZm4oaW50ZXJjZXB0b3IpICYmIGludGVyY2VwdG9yLmNhbGwoc2VsZilcclxuICAgICAgICBub2RlLnJlbW92ZSgpIFxyXG4gICAgICB9XHJcbiAgICB9IGVsc2UgeyByZXR1cm4gb2JqIH1cclxuICB9KVxyXG59XHJcblxyXG5LZWV0LnByb3RvdHlwZS51cGRhdGUgPSBmdW5jdGlvbiAoaWQsIGF0dHIsIG5ld0F0dHIsIGludGVyY2VwdG9yKSB7XHJcbiAgLy8gTWV0aG9kIHRvIHVwZGF0ZSBhIHN1Ym1vZGVsIG9mIGEgY29tcG9uZW50XHJcbiAgdmFyIHNlbGYgPSB0aGlzXHJcbiAgdGhpcy5iYXNlLm1vZGVsID0gdGhpcy5iYXNlLm1vZGVsLm1hcChmdW5jdGlvbiAob2JqLCBpZHgsIG1vZGVsKSB7XHJcbiAgICBpZiAoaWQgPT09IG9ialthdHRyXSkge1xyXG4gICAgICBpZiAobmV3QXR0ciAmJiB0eXBlb2YgbmV3QXR0ciA9PT0gJ29iamVjdCcpIHtcclxuICAgICAgICBPYmplY3QuYXNzaWduKG9iaiwgbmV3QXR0cilcclxuICAgICAgfVxyXG4gICAgICB2YXIgbm9kZSA9IHNlbGVjdG9yKG9ialsna2VldC1pZCddKVxyXG4gICAgICBpZiAobm9kZSkge1xyXG4gICAgICAgIC8vIGlmIGludGVyY2VwdG9yIGlzIGRlY2xhcmVkIGV4ZWN1dGUgaXQgYmVmb3JlIG5vZGUgdXBkYXRlXHJcbiAgICAgICAgaW50ZXJjZXB0b3IgJiYgZm4oaW50ZXJjZXB0b3IpICYmIGludGVyY2VwdG9yLmNhbGwoc2VsZilcclxuICAgICAgICBzZXRET00obm9kZSwgZ2VuVGVtcGxhdGUuY2FsbChzZWxmLCBvYmopKVxyXG4gICAgICB9XHJcbiAgICB9XHJcbiAgICByZXR1cm4gb2JqXHJcbiAgfSlcclxufVxyXG5cclxuS2VldC5wcm90b3R5cGUucmVnaXN0ZXIgPSBmdW5jdGlvbigpIHtcclxuICB2YXIgc2VsZiA9IHRoaXNcclxuICB0aGlzLl9fcmVnaXN0ZXJNb2RlbF9fID0gdGhpcy5fX3JlZ2lzdGVyTW9kZWxfXyB8fCB7fVxyXG4gIHZhciBsaXN0ID0gW10uc2xpY2UuY2FsbChhcmd1bWVudHMpXHJcbiAgbGlzdC5tYXAoZnVuY3Rpb24oZGF0YSkge1xyXG4gICAgc2VsZi5fX3JlZ2lzdGVyTW9kZWxfX1tkYXRhLm5hbWVdID0gZGF0YS5tb2RlbFxyXG4gIH0pXHJcbiAgcmV0dXJuIHRoaXNcclxufVxyXG5cclxubW9kdWxlLmV4cG9ydHMgPSBLZWV0XHJcbiIsIid1c2Ugc3RyaWN0JztcblxuZnVuY3Rpb24gcGFkIChoYXNoLCBsZW4pIHtcbiAgd2hpbGUgKGhhc2gubGVuZ3RoIDwgbGVuKSB7XG4gICAgaGFzaCA9ICcwJyArIGhhc2g7XG4gIH1cbiAgcmV0dXJuIGhhc2g7XG59XG5cbmZ1bmN0aW9uIGZvbGQgKGhhc2gsIHRleHQpIHtcbiAgdmFyIGk7XG4gIHZhciBjaHI7XG4gIHZhciBsZW47XG4gIGlmICh0ZXh0Lmxlbmd0aCA9PT0gMCkge1xuICAgIHJldHVybiBoYXNoO1xuICB9XG4gIGZvciAoaSA9IDAsIGxlbiA9IHRleHQubGVuZ3RoOyBpIDwgbGVuOyBpKyspIHtcbiAgICBjaHIgPSB0ZXh0LmNoYXJDb2RlQXQoaSk7XG4gICAgaGFzaCA9ICgoaGFzaCA8PCA1KSAtIGhhc2gpICsgY2hyO1xuICAgIGhhc2ggfD0gMDtcbiAgfVxuICByZXR1cm4gaGFzaCA8IDAgPyBoYXNoICogLTIgOiBoYXNoO1xufVxuXG5mdW5jdGlvbiBmb2xkT2JqZWN0IChoYXNoLCBvLCBzZWVuKSB7XG4gIHJldHVybiBPYmplY3Qua2V5cyhvKS5zb3J0KCkucmVkdWNlKGZvbGRLZXksIGhhc2gpO1xuICBmdW5jdGlvbiBmb2xkS2V5IChoYXNoLCBrZXkpIHtcbiAgICByZXR1cm4gZm9sZFZhbHVlKGhhc2gsIG9ba2V5XSwga2V5LCBzZWVuKTtcbiAgfVxufVxuXG5mdW5jdGlvbiBmb2xkVmFsdWUgKGlucHV0LCB2YWx1ZSwga2V5LCBzZWVuKSB7XG4gIHZhciBoYXNoID0gZm9sZChmb2xkKGZvbGQoaW5wdXQsIGtleSksIHRvU3RyaW5nKHZhbHVlKSksIHR5cGVvZiB2YWx1ZSk7XG4gIGlmICh2YWx1ZSA9PT0gbnVsbCkge1xuICAgIHJldHVybiBmb2xkKGhhc2gsICdudWxsJyk7XG4gIH1cbiAgaWYgKHZhbHVlID09PSB1bmRlZmluZWQpIHtcbiAgICByZXR1cm4gZm9sZChoYXNoLCAndW5kZWZpbmVkJyk7XG4gIH1cbiAgaWYgKHR5cGVvZiB2YWx1ZSA9PT0gJ29iamVjdCcpIHtcbiAgICBpZiAoc2Vlbi5pbmRleE9mKHZhbHVlKSAhPT0gLTEpIHtcbiAgICAgIHJldHVybiBmb2xkKGhhc2gsICdbQ2lyY3VsYXJdJyArIGtleSk7XG4gICAgfVxuICAgIHNlZW4ucHVzaCh2YWx1ZSk7XG4gICAgcmV0dXJuIGZvbGRPYmplY3QoaGFzaCwgdmFsdWUsIHNlZW4pO1xuICB9XG4gIHJldHVybiBmb2xkKGhhc2gsIHZhbHVlLnRvU3RyaW5nKCkpO1xufVxuXG5mdW5jdGlvbiB0b1N0cmluZyAobykge1xuICByZXR1cm4gT2JqZWN0LnByb3RvdHlwZS50b1N0cmluZy5jYWxsKG8pO1xufVxuXG5mdW5jdGlvbiBzdW0gKG8pIHtcbiAgcmV0dXJuIHBhZChmb2xkVmFsdWUoMCwgbywgJycsIFtdKS50b1N0cmluZygxNiksIDgpO1xufVxuXG5tb2R1bGUuZXhwb3J0cyA9IHN1bTtcbiIsIid1c2Ugc3RyaWN0J1xuXG5zZXRET00uS0VZID0gJ2RhdGEta2V5J1xuc2V0RE9NLklHTk9SRSA9ICdkYXRhLWlnbm9yZSdcbnNldERPTS5DSEVDS1NVTSA9ICdkYXRhLWNoZWNrc3VtJ1xudmFyIHBhcnNlSFRNTCA9IHJlcXVpcmUoJy4vcGFyc2UtaHRtbCcpXG52YXIgS0VZX1BSRUZJWCA9ICdfc2V0LWRvbS0nXG52YXIgTk9ERV9NT1VOVEVEID0gS0VZX1BSRUZJWCArICdtb3VudGVkJ1xudmFyIEVMRU1FTlRfVFlQRSA9IDFcbnZhciBET0NVTUVOVF9UWVBFID0gOVxudmFyIERPQ1VNRU5UX0ZSQUdNRU5UX1RZUEUgPSAxMVxuXG4vLyBFeHBvc2UgYXBpLlxubW9kdWxlLmV4cG9ydHMgPSBzZXRET01cblxuLyoqXG4gKiBAZGVzY3JpcHRpb25cbiAqIFVwZGF0ZXMgZXhpc3RpbmcgZG9tIHRvIG1hdGNoIGEgbmV3IGRvbS5cbiAqXG4gKiBAcGFyYW0ge05vZGV9IG9sZE5vZGUgLSBUaGUgaHRtbCBlbnRpdHkgdG8gdXBkYXRlLlxuICogQHBhcmFtIHtTdHJpbmd8Tm9kZX0gbmV3Tm9kZSAtIFRoZSB1cGRhdGVkIGh0bWwoZW50aXR5KS5cbiAqL1xuZnVuY3Rpb24gc2V0RE9NIChvbGROb2RlLCBuZXdOb2RlKSB7XG4gIC8vIEVuc3VyZSBhIHJlYWxpc2ggZG9tIG5vZGUgaXMgcHJvdmlkZWQuXG4gIGFzc2VydChvbGROb2RlICYmIG9sZE5vZGUubm9kZVR5cGUsICdZb3UgbXVzdCBwcm92aWRlIGEgdmFsaWQgbm9kZSB0byB1cGRhdGUuJylcblxuICAvLyBBbGlhcyBkb2N1bWVudCBlbGVtZW50IHdpdGggZG9jdW1lbnQuXG4gIGlmIChvbGROb2RlLm5vZGVUeXBlID09PSBET0NVTUVOVF9UWVBFKSBvbGROb2RlID0gb2xkTm9kZS5kb2N1bWVudEVsZW1lbnRcblxuICAvLyBEb2N1bWVudCBGcmFnbWVudHMgZG9uJ3QgaGF2ZSBhdHRyaWJ1dGVzLCBzbyBubyBuZWVkIHRvIGxvb2sgYXQgY2hlY2tzdW1zLCBpZ25vcmVkLCBhdHRyaWJ1dGVzLCBvciBub2RlIHJlcGxhY2VtZW50LlxuICBpZiAobmV3Tm9kZS5ub2RlVHlwZSA9PT0gRE9DVU1FTlRfRlJBR01FTlRfVFlQRSkge1xuICAgIC8vIFNpbXBseSB1cGRhdGUgYWxsIGNoaWxkcmVuIChhbmQgc3ViY2hpbGRyZW4pLlxuICAgIHNldENoaWxkTm9kZXMob2xkTm9kZSwgbmV3Tm9kZSlcbiAgfSBlbHNlIHtcbiAgICAvLyBPdGhlcndpc2Ugd2UgZGlmZiB0aGUgZW50aXJlIG9sZCBub2RlLlxuICAgIHNldE5vZGUob2xkTm9kZSwgdHlwZW9mIG5ld05vZGUgPT09ICdzdHJpbmcnXG4gICAgICAvLyBJZiBhIHN0cmluZyB3YXMgcHJvdmlkZWQgd2Ugd2lsbCBwYXJzZSBpdCBhcyBkb20uXG4gICAgICA/IHBhcnNlSFRNTChuZXdOb2RlLCBvbGROb2RlLm5vZGVOYW1lKVxuICAgICAgOiBuZXdOb2RlXG4gICAgKVxuICB9XG5cbiAgLy8gVHJpZ2dlciBtb3VudCBldmVudHMgb24gaW5pdGlhbCBzZXQuXG4gIGlmICghb2xkTm9kZVtOT0RFX01PVU5URURdKSB7XG4gICAgb2xkTm9kZVtOT0RFX01PVU5URURdID0gdHJ1ZVxuICAgIG1vdW50KG9sZE5vZGUpXG4gIH1cbn1cblxuLyoqXG4gKiBAcHJpdmF0ZVxuICogQGRlc2NyaXB0aW9uXG4gKiBVcGRhdGVzIGEgc3BlY2lmaWMgaHRtbE5vZGUgYW5kIGRvZXMgd2hhdGV2ZXIgaXQgdGFrZXMgdG8gY29udmVydCBpdCB0byBhbm90aGVyIG9uZS5cbiAqXG4gKiBAcGFyYW0ge05vZGV9IG9sZE5vZGUgLSBUaGUgcHJldmlvdXMgSFRNTE5vZGUuXG4gKiBAcGFyYW0ge05vZGV9IG5ld05vZGUgLSBUaGUgdXBkYXRlZCBIVE1MTm9kZS5cbiAqL1xuZnVuY3Rpb24gc2V0Tm9kZSAob2xkTm9kZSwgbmV3Tm9kZSkge1xuICBpZiAob2xkTm9kZS5ub2RlVHlwZSA9PT0gbmV3Tm9kZS5ub2RlVHlwZSkge1xuICAgIC8vIEhhbmRsZSByZWd1bGFyIGVsZW1lbnQgbm9kZSB1cGRhdGVzLlxuICAgIGlmIChvbGROb2RlLm5vZGVUeXBlID09PSBFTEVNRU5UX1RZUEUpIHtcbiAgICAgIC8vIENoZWNrcyBpZiBub2RlcyBhcmUgZXF1YWwgYmVmb3JlIGRpZmZpbmcuXG4gICAgICBpZiAoaXNFcXVhbE5vZGUob2xkTm9kZSwgbmV3Tm9kZSkpIHJldHVyblxuXG4gICAgICAvLyBVcGRhdGUgYWxsIGNoaWxkcmVuIChhbmQgc3ViY2hpbGRyZW4pLlxuICAgICAgc2V0Q2hpbGROb2RlcyhvbGROb2RlLCBuZXdOb2RlKVxuXG4gICAgICAvLyBVcGRhdGUgdGhlIGVsZW1lbnRzIGF0dHJpYnV0ZXMgLyB0YWdOYW1lLlxuICAgICAgaWYgKG9sZE5vZGUubm9kZU5hbWUgPT09IG5ld05vZGUubm9kZU5hbWUpIHtcbiAgICAgICAgLy8gSWYgd2UgaGF2ZSB0aGUgc2FtZSBub2RlbmFtZSB0aGVuIHdlIGNhbiBkaXJlY3RseSB1cGRhdGUgdGhlIGF0dHJpYnV0ZXMuXG4gICAgICAgIHNldEF0dHJpYnV0ZXMob2xkTm9kZS5hdHRyaWJ1dGVzLCBuZXdOb2RlLmF0dHJpYnV0ZXMpXG4gICAgICB9IGVsc2Uge1xuICAgICAgICAvLyBPdGhlcndpc2UgY2xvbmUgdGhlIG5ldyBub2RlIHRvIHVzZSBhcyB0aGUgZXhpc3Rpbmcgbm9kZS5cbiAgICAgICAgdmFyIG5ld1ByZXYgPSBuZXdOb2RlLmNsb25lTm9kZSgpXG4gICAgICAgIC8vIENvcHkgb3ZlciBhbGwgZXhpc3RpbmcgY2hpbGRyZW4gZnJvbSB0aGUgb3JpZ2luYWwgbm9kZS5cbiAgICAgICAgd2hpbGUgKG9sZE5vZGUuZmlyc3RDaGlsZCkgbmV3UHJldi5hcHBlbmRDaGlsZChvbGROb2RlLmZpcnN0Q2hpbGQpXG4gICAgICAgIC8vIFJlcGxhY2UgdGhlIG9yaWdpbmFsIG5vZGUgd2l0aCB0aGUgbmV3IG9uZSB3aXRoIHRoZSByaWdodCB0YWcuXG4gICAgICAgIG9sZE5vZGUucGFyZW50Tm9kZS5yZXBsYWNlQ2hpbGQobmV3UHJldiwgb2xkTm9kZSlcbiAgICAgIH1cbiAgICB9IGVsc2Uge1xuICAgICAgLy8gSGFuZGxlIG90aGVyIHR5cGVzIG9mIG5vZGUgdXBkYXRlcyAodGV4dC9jb21tZW50cy9ldGMpLlxuICAgICAgLy8gSWYgYm90aCBhcmUgdGhlIHNhbWUgdHlwZSBvZiBub2RlIHdlIGNhbiB1cGRhdGUgZGlyZWN0bHkuXG4gICAgICBpZiAob2xkTm9kZS5ub2RlVmFsdWUgIT09IG5ld05vZGUubm9kZVZhbHVlKSB7XG4gICAgICAgIG9sZE5vZGUubm9kZVZhbHVlID0gbmV3Tm9kZS5ub2RlVmFsdWVcbiAgICAgIH1cbiAgICB9XG4gIH0gZWxzZSB7XG4gICAgLy8gd2UgaGF2ZSB0byByZXBsYWNlIHRoZSBub2RlLlxuICAgIG9sZE5vZGUucGFyZW50Tm9kZS5yZXBsYWNlQ2hpbGQobmV3Tm9kZSwgZGlzbW91bnQob2xkTm9kZSkpXG4gICAgbW91bnQobmV3Tm9kZSlcbiAgfVxufVxuXG4vKipcbiAqIEBwcml2YXRlXG4gKiBAZGVzY3JpcHRpb25cbiAqIFV0aWxpdHkgdGhhdCB3aWxsIHVwZGF0ZSBvbmUgbGlzdCBvZiBhdHRyaWJ1dGVzIHRvIG1hdGNoIGFub3RoZXIuXG4gKlxuICogQHBhcmFtIHtOYW1lZE5vZGVNYXB9IG9sZEF0dHJpYnV0ZXMgLSBUaGUgcHJldmlvdXMgYXR0cmlidXRlcy5cbiAqIEBwYXJhbSB7TmFtZWROb2RlTWFwfSBuZXdBdHRyaWJ1dGVzIC0gVGhlIHVwZGF0ZWQgYXR0cmlidXRlcy5cbiAqL1xuZnVuY3Rpb24gc2V0QXR0cmlidXRlcyAob2xkQXR0cmlidXRlcywgbmV3QXR0cmlidXRlcykge1xuICB2YXIgaSwgYSwgYiwgbnMsIG5hbWVcblxuICAvLyBSZW1vdmUgb2xkIGF0dHJpYnV0ZXMuXG4gIGZvciAoaSA9IG9sZEF0dHJpYnV0ZXMubGVuZ3RoOyBpLS07KSB7XG4gICAgYSA9IG9sZEF0dHJpYnV0ZXNbaV1cbiAgICBucyA9IGEubmFtZXNwYWNlVVJJXG4gICAgbmFtZSA9IGEubG9jYWxOYW1lXG4gICAgYiA9IG5ld0F0dHJpYnV0ZXMuZ2V0TmFtZWRJdGVtTlMobnMsIG5hbWUpXG4gICAgaWYgKCFiKSBvbGRBdHRyaWJ1dGVzLnJlbW92ZU5hbWVkSXRlbU5TKG5zLCBuYW1lKVxuICB9XG5cbiAgLy8gU2V0IG5ldyBhdHRyaWJ1dGVzLlxuICBmb3IgKGkgPSBuZXdBdHRyaWJ1dGVzLmxlbmd0aDsgaS0tOykge1xuICAgIGEgPSBuZXdBdHRyaWJ1dGVzW2ldXG4gICAgbnMgPSBhLm5hbWVzcGFjZVVSSVxuICAgIG5hbWUgPSBhLmxvY2FsTmFtZVxuICAgIGIgPSBvbGRBdHRyaWJ1dGVzLmdldE5hbWVkSXRlbU5TKG5zLCBuYW1lKVxuICAgIGlmICghYikge1xuICAgICAgLy8gQWRkIGEgbmV3IGF0dHJpYnV0ZS5cbiAgICAgIG5ld0F0dHJpYnV0ZXMucmVtb3ZlTmFtZWRJdGVtTlMobnMsIG5hbWUpXG4gICAgICBvbGRBdHRyaWJ1dGVzLnNldE5hbWVkSXRlbU5TKGEpXG4gICAgfSBlbHNlIGlmIChiLnZhbHVlICE9PSBhLnZhbHVlKSB7XG4gICAgICAvLyBVcGRhdGUgZXhpc3RpbmcgYXR0cmlidXRlLlxuICAgICAgYi52YWx1ZSA9IGEudmFsdWVcbiAgICB9XG4gIH1cbn1cblxuLyoqXG4gKiBAcHJpdmF0ZVxuICogQGRlc2NyaXB0aW9uXG4gKiBVdGlsaXR5IHRoYXQgd2lsbCBub2RlcyBjaGlsZGVybiB0byBtYXRjaCBhbm90aGVyIG5vZGVzIGNoaWxkcmVuLlxuICpcbiAqIEBwYXJhbSB7Tm9kZX0gb2xkUGFyZW50IC0gVGhlIGV4aXN0aW5nIHBhcmVudCBub2RlLlxuICogQHBhcmFtIHtOb2RlfSBuZXdQYXJlbnQgLSBUaGUgbmV3IHBhcmVudCBub2RlLlxuICovXG5mdW5jdGlvbiBzZXRDaGlsZE5vZGVzIChvbGRQYXJlbnQsIG5ld1BhcmVudCkge1xuICB2YXIgY2hlY2tPbGQsIG9sZEtleSwgY2hlY2tOZXcsIG5ld0tleSwgZm91bmROb2RlLCBrZXllZE5vZGVzXG4gIHZhciBvbGROb2RlID0gb2xkUGFyZW50LmZpcnN0Q2hpbGRcbiAgdmFyIG5ld05vZGUgPSBuZXdQYXJlbnQuZmlyc3RDaGlsZFxuICB2YXIgZXh0cmEgPSAwXG5cbiAgLy8gRXh0cmFjdCBrZXllZCBub2RlcyBmcm9tIHByZXZpb3VzIGNoaWxkcmVuIGFuZCBrZWVwIHRyYWNrIG9mIHRvdGFsIGNvdW50LlxuICB3aGlsZSAob2xkTm9kZSkge1xuICAgIGV4dHJhKytcbiAgICBjaGVja09sZCA9IG9sZE5vZGVcbiAgICBvbGRLZXkgPSBnZXRLZXkoY2hlY2tPbGQpXG4gICAgb2xkTm9kZSA9IG9sZE5vZGUubmV4dFNpYmxpbmdcblxuICAgIGlmIChvbGRLZXkpIHtcbiAgICAgIGlmICgha2V5ZWROb2Rlcykga2V5ZWROb2RlcyA9IHt9XG4gICAgICBrZXllZE5vZGVzW29sZEtleV0gPSBjaGVja09sZFxuICAgIH1cbiAgfVxuXG4gIC8vIExvb3Agb3ZlciBuZXcgbm9kZXMgYW5kIHBlcmZvcm0gdXBkYXRlcy5cbiAgb2xkTm9kZSA9IG9sZFBhcmVudC5maXJzdENoaWxkXG4gIHdoaWxlIChuZXdOb2RlKSB7XG4gICAgZXh0cmEtLVxuICAgIGNoZWNrTmV3ID0gbmV3Tm9kZVxuICAgIG5ld05vZGUgPSBuZXdOb2RlLm5leHRTaWJsaW5nXG5cbiAgICBpZiAoa2V5ZWROb2RlcyAmJiAobmV3S2V5ID0gZ2V0S2V5KGNoZWNrTmV3KSkgJiYgKGZvdW5kTm9kZSA9IGtleWVkTm9kZXNbbmV3S2V5XSkpIHtcbiAgICAgIGRlbGV0ZSBrZXllZE5vZGVzW25ld0tleV1cbiAgICAgIC8vIElmIHdlIGhhdmUgYSBrZXkgYW5kIGl0IGV4aXN0ZWQgYmVmb3JlIHdlIG1vdmUgdGhlIHByZXZpb3VzIG5vZGUgdG8gdGhlIG5ldyBwb3NpdGlvbiBpZiBuZWVkZWQgYW5kIGRpZmYgaXQuXG4gICAgICBpZiAoZm91bmROb2RlICE9PSBvbGROb2RlKSB7XG4gICAgICAgIG9sZFBhcmVudC5pbnNlcnRCZWZvcmUoZm91bmROb2RlLCBvbGROb2RlKVxuICAgICAgfSBlbHNlIHtcbiAgICAgICAgb2xkTm9kZSA9IG9sZE5vZGUubmV4dFNpYmxpbmdcbiAgICAgIH1cblxuICAgICAgc2V0Tm9kZShmb3VuZE5vZGUsIGNoZWNrTmV3KVxuICAgIH0gZWxzZSBpZiAob2xkTm9kZSkge1xuICAgICAgY2hlY2tPbGQgPSBvbGROb2RlXG4gICAgICBvbGROb2RlID0gb2xkTm9kZS5uZXh0U2libGluZ1xuICAgICAgaWYgKGdldEtleShjaGVja09sZCkpIHtcbiAgICAgICAgLy8gSWYgdGhlIG9sZCBjaGlsZCBoYWQgYSBrZXkgd2Ugc2tpcCBvdmVyIGl0IHVudGlsIHRoZSBlbmQuXG4gICAgICAgIG9sZFBhcmVudC5pbnNlcnRCZWZvcmUoY2hlY2tOZXcsIGNoZWNrT2xkKVxuICAgICAgICBtb3VudChjaGVja05ldylcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIC8vIE90aGVyd2lzZSB3ZSBkaWZmIHRoZSB0d28gbm9uLWtleWVkIG5vZGVzLlxuICAgICAgICBzZXROb2RlKGNoZWNrT2xkLCBjaGVja05ldylcbiAgICAgIH1cbiAgICB9IGVsc2Uge1xuICAgICAgLy8gRmluYWxseSBpZiB0aGVyZSB3YXMgbm8gb2xkIG5vZGUgd2UgYWRkIHRoZSBuZXcgbm9kZS5cbiAgICAgIG9sZFBhcmVudC5hcHBlbmRDaGlsZChjaGVja05ldylcbiAgICAgIG1vdW50KGNoZWNrTmV3KVxuICAgIH1cbiAgfVxuXG4gIC8vIFJlbW92ZSBvbGQga2V5ZWQgbm9kZXMuXG4gIGZvciAob2xkS2V5IGluIGtleWVkTm9kZXMpIHtcbiAgICBleHRyYS0tXG4gICAgb2xkUGFyZW50LnJlbW92ZUNoaWxkKGRpc21vdW50KGtleWVkTm9kZXNbb2xkS2V5XSkpXG4gIH1cblxuICAvLyBJZiB3ZSBoYXZlIGFueSByZW1haW5pbmcgdW5rZXllZCBub2RlcyByZW1vdmUgdGhlbSBmcm9tIHRoZSBlbmQuXG4gIHdoaWxlICgtLWV4dHJhID49IDApIHtcbiAgICBvbGRQYXJlbnQucmVtb3ZlQ2hpbGQoZGlzbW91bnQob2xkUGFyZW50Lmxhc3RDaGlsZCkpXG4gIH1cbn1cblxuLyoqXG4gKiBAcHJpdmF0ZVxuICogQGRlc2NyaXB0aW9uXG4gKiBVdGlsaXR5IHRvIHRyeSB0byBwdWxsIGEga2V5IG91dCBvZiBhbiBlbGVtZW50LlxuICogVXNlcyAnZGF0YS1rZXknIGlmIHBvc3NpYmxlIGFuZCBmYWxscyBiYWNrIHRvICdpZCcuXG4gKlxuICogQHBhcmFtIHtOb2RlfSBub2RlIC0gVGhlIG5vZGUgdG8gZ2V0IHRoZSBrZXkgZm9yLlxuICogQHJldHVybiB7c3RyaW5nfHZvaWR9XG4gKi9cbmZ1bmN0aW9uIGdldEtleSAobm9kZSkge1xuICBpZiAobm9kZS5ub2RlVHlwZSAhPT0gRUxFTUVOVF9UWVBFKSByZXR1cm5cbiAgdmFyIGtleSA9IG5vZGUuZ2V0QXR0cmlidXRlKHNldERPTS5LRVkpIHx8IG5vZGUuaWRcbiAgaWYgKGtleSkgcmV0dXJuIEtFWV9QUkVGSVggKyBrZXlcbn1cblxuLyoqXG4gKiBDaGVja3MgaWYgbm9kZXMgYXJlIGVxdWFsIHVzaW5nIHRoZSBmb2xsb3dpbmcgYnkgY2hlY2tpbmcgaWZcbiAqIHRoZXkgYXJlIGJvdGggaWdub3JlZCwgaGF2ZSB0aGUgc2FtZSBjaGVja3N1bSwgb3IgaGF2ZSB0aGVcbiAqIHNhbWUgY29udGVudHMuXG4gKlxuICogQHBhcmFtIHtOb2RlfSBhIC0gT25lIG9mIHRoZSBub2RlcyB0byBjb21wYXJlLlxuICogQHBhcmFtIHtOb2RlfSBiIC0gQW5vdGhlciBub2RlIHRvIGNvbXBhcmUuXG4gKi9cbmZ1bmN0aW9uIGlzRXF1YWxOb2RlIChhLCBiKSB7XG4gIHJldHVybiAoXG4gICAgLy8gQ2hlY2sgaWYgYm90aCBub2RlcyBhcmUgaWdub3JlZC5cbiAgICAoaXNJZ25vcmVkKGEpICYmIGlzSWdub3JlZChiKSkgfHxcbiAgICAvLyBDaGVjayBpZiBib3RoIG5vZGVzIGhhdmUgdGhlIHNhbWUgY2hlY2tzdW0uXG4gICAgKGdldENoZWNrU3VtKGEpID09PSBnZXRDaGVja1N1bShiKSkgfHxcbiAgICAvLyBGYWxsIGJhY2sgdG8gbmF0aXZlIGlzRXF1YWxOb2RlIGNoZWNrLlxuICAgIGEuaXNFcXVhbE5vZGUoYilcbiAgKVxufVxuXG4vKipcbiAqIEBwcml2YXRlXG4gKiBAZGVzY3JpcHRpb25cbiAqIFV0aWxpdHkgdG8gdHJ5IHRvIHB1bGwgYSBjaGVja3N1bSBhdHRyaWJ1dGUgZnJvbSBhbiBlbGVtZW50LlxuICogVXNlcyAnZGF0YS1jaGVja3N1bScgb3IgdXNlciBzcGVjaWZpZWQgY2hlY2tzdW0gcHJvcGVydHkuXG4gKlxuICogQHBhcmFtIHtOb2RlfSBub2RlIC0gVGhlIG5vZGUgdG8gZ2V0IHRoZSBjaGVja3N1bSBmb3IuXG4gKiBAcmV0dXJuIHtzdHJpbmd8TmFOfVxuICovXG5mdW5jdGlvbiBnZXRDaGVja1N1bSAobm9kZSkge1xuICByZXR1cm4gbm9kZS5nZXRBdHRyaWJ1dGUoc2V0RE9NLkNIRUNLU1VNKSB8fCBOYU5cbn1cblxuLyoqXG4gKiBAcHJpdmF0ZVxuICogQGRlc2NyaXB0aW9uXG4gKiBVdGlsaXR5IHRvIHRyeSB0byBjaGVjayBpZiBhbiBlbGVtZW50IHNob3VsZCBiZSBpZ25vcmVkIGJ5IHRoZSBhbGdvcml0aG0uXG4gKiBVc2VzICdkYXRhLWlnbm9yZScgb3IgdXNlciBzcGVjaWZpZWQgaWdub3JlIHByb3BlcnR5LlxuICpcbiAqIEBwYXJhbSB7Tm9kZX0gbm9kZSAtIFRoZSBub2RlIHRvIGNoZWNrIGlmIGl0IHNob3VsZCBiZSBpZ25vcmVkLlxuICogQHJldHVybiB7Ym9vbGVhbn1cbiAqL1xuZnVuY3Rpb24gaXNJZ25vcmVkIChub2RlKSB7XG4gIHJldHVybiBub2RlLmdldEF0dHJpYnV0ZShzZXRET00uSUdOT1JFKSAhPSBudWxsXG59XG5cbi8qKlxuICogRGlzcGF0Y2hlcyBhIG1vdW50IGV2ZW50IGZvciB0aGUgZ2l2ZW4gbm9kZSBhbmQgY2hpbGRyZW4uXG4gKlxuICogQHBhcmFtIHtOb2RlfSBub2RlIC0gdGhlIG5vZGUgdG8gbW91bnQuXG4gKiBAcmV0dXJuIHtub2RlfVxuICovXG5mdW5jdGlvbiBtb3VudCAobm9kZSkge1xuICByZXR1cm4gZGlzcGF0Y2gobm9kZSwgJ21vdW50Jylcbn1cblxuLyoqXG4gKiBEaXNwYXRjaGVzIGEgZGlzbW91bnQgZXZlbnQgZm9yIHRoZSBnaXZlbiBub2RlIGFuZCBjaGlsZHJlbi5cbiAqXG4gKiBAcGFyYW0ge05vZGV9IG5vZGUgLSB0aGUgbm9kZSB0byBkaXNtb3VudC5cbiAqIEByZXR1cm4ge25vZGV9XG4gKi9cbmZ1bmN0aW9uIGRpc21vdW50IChub2RlKSB7XG4gIHJldHVybiBkaXNwYXRjaChub2RlLCAnZGlzbW91bnQnKVxufVxuXG4vKipcbiAqIFJlY3Vyc2l2ZWx5IHRyaWdnZXIgYW4gZXZlbnQgZm9yIGEgbm9kZSBhbmQgaXQncyBjaGlsZHJlbi5cbiAqIE9ubHkgZW1pdHMgZXZlbnRzIGZvciBrZXllZCBub2Rlcy5cbiAqXG4gKiBAcGFyYW0ge05vZGV9IG5vZGUgLSB0aGUgaW5pdGlhbCBub2RlLlxuICogQHJldHVybiB7Tm9kZX1cbiAqL1xuZnVuY3Rpb24gZGlzcGF0Y2ggKG5vZGUsIHR5cGUpIHtcbiAgLy8gVHJpZ2dlciBldmVudCBmb3IgdGhpcyBlbGVtZW50IGlmIGl0IGhhcyBhIGtleS5cbiAgaWYgKGdldEtleShub2RlKSkge1xuICAgIHZhciBldiA9IGRvY3VtZW50LmNyZWF0ZUV2ZW50KCdFdmVudCcpXG4gICAgdmFyIHByb3AgPSB7IHZhbHVlOiBub2RlIH1cbiAgICBldi5pbml0RXZlbnQodHlwZSwgZmFsc2UsIGZhbHNlKVxuICAgIE9iamVjdC5kZWZpbmVQcm9wZXJ0eShldiwgJ3RhcmdldCcsIHByb3ApXG4gICAgT2JqZWN0LmRlZmluZVByb3BlcnR5KGV2LCAnc3JjRWxlbWVudCcsIHByb3ApXG4gICAgbm9kZS5kaXNwYXRjaEV2ZW50KGV2KVxuICB9XG5cbiAgLy8gRGlzcGF0Y2ggdG8gYWxsIGNoaWxkcmVuLlxuICB2YXIgY2hpbGQgPSBub2RlLmZpcnN0Q2hpbGRcbiAgd2hpbGUgKGNoaWxkKSBjaGlsZCA9IGRpc3BhdGNoKGNoaWxkLCB0eXBlKS5uZXh0U2libGluZ1xuICByZXR1cm4gbm9kZVxufVxuXG4vKipcbiAqIEBwcml2YXRlXG4gKiBAZGVzY3JpcHRpb25cbiAqIENvbmZpcm0gdGhhdCBhIHZhbHVlIGlzIHRydXRoeSwgdGhyb3dzIGFuIGVycm9yIG1lc3NhZ2Ugb3RoZXJ3aXNlLlxuICpcbiAqIEBwYXJhbSB7Kn0gdmFsIC0gdGhlIHZhbCB0byB0ZXN0LlxuICogQHBhcmFtIHtzdHJpbmd9IG1zZyAtIHRoZSBlcnJvciBtZXNzYWdlIG9uIGZhaWx1cmUuXG4gKiBAdGhyb3dzIHtFcnJvcn1cbiAqL1xuZnVuY3Rpb24gYXNzZXJ0ICh2YWwsIG1zZykge1xuICBpZiAoIXZhbCkgdGhyb3cgbmV3IEVycm9yKCdzZXQtZG9tOiAnICsgbXNnKVxufVxuIiwiJ3VzZSBzdHJpY3QnXG52YXIgcGFyc2VyID0gd2luZG93LkRPTVBhcnNlciAmJiBuZXcgd2luZG93LkRPTVBhcnNlcigpXG52YXIgZG9jdW1lbnRSb290TmFtZSA9ICdIVE1MJ1xudmFyIHN1cHBvcnRzSFRNTFR5cGUgPSBmYWxzZVxudmFyIHN1cHBvcnRzSW5uZXJIVE1MID0gZmFsc2VcbnZhciBodG1sVHlwZSA9ICd0ZXh0L2h0bWwnXG52YXIgeGh0bWxUeXBlID0gJ2FwcGxpY2F0aW9uL3hodG1sK3htbCdcbnZhciB0ZXN0Q2xhc3MgPSAnQSdcbnZhciB0ZXN0Q29kZSA9ICc8d2JyIGNsYXNzPVwiJyArIHRlc3RDbGFzcyArICdcIi8+J1xuXG50cnkge1xuICAvLyBDaGVjayBpZiBicm93c2VyIHN1cHBvcnRzIHRleHQvaHRtbCBET01QYXJzZXJcbiAgdmFyIHBhcnNlZCA9IHBhcnNlci5wYXJzZUZyb21TdHJpbmcodGVzdENvZGUsIGh0bWxUeXBlKS5ib2R5LmZpcnN0Q2hpbGRcbiAgLy8gU29tZSBicm93c2VycyAoaU9TIDkgYW5kIFNhZmFyaSA5KSBsb3dlcmNhc2UgY2xhc3NlcyBmb3IgcGFyc2VkIGVsZW1lbnRzXG4gIC8vIGJ1dCBvbmx5IHdoZW4gYXBwZW5kaW5nIHRvIERPTSwgc28gdXNlIGlubmVySFRNTCBpbnN0ZWFkXG4gIHZhciBkID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnZGl2JylcbiAgZC5hcHBlbmRDaGlsZChwYXJzZWQpXG4gIGlmIChkLmZpcnN0Q2hpbGQuY2xhc3NMaXN0WzBdICE9PSB0ZXN0Q2xhc3MpIHRocm93IG5ldyBFcnJvcigpXG4gIHN1cHBvcnRzSFRNTFR5cGUgPSB0cnVlXG59IGNhdGNoIChlKSB7fVxuXG52YXIgbW9ja0RvYyA9IGRvY3VtZW50LmltcGxlbWVudGF0aW9uLmNyZWF0ZUhUTUxEb2N1bWVudCgnJylcbnZhciBtb2NrSFRNTCA9IG1vY2tEb2MuZG9jdW1lbnRFbGVtZW50XG52YXIgbW9ja0JvZHkgPSBtb2NrRG9jLmJvZHlcbnRyeSB7XG4gIC8vIENoZWNrIGlmIGJyb3dzZXIgc3VwcG9ydHMgZG9jdW1lbnRFbGVtZW50LmlubmVySFRNTFxuICBtb2NrSFRNTC5pbm5lckhUTUwgKz0gJydcbiAgc3VwcG9ydHNJbm5lckhUTUwgPSB0cnVlXG59IGNhdGNoIChlKSB7XG4gIC8vIENoZWNrIGlmIGJyb3dzZXIgc3VwcG9ydHMgeGh0bWwgcGFyc2luZy5cbiAgcGFyc2VyLnBhcnNlRnJvbVN0cmluZyh0ZXN0Q29kZSwgeGh0bWxUeXBlKVxuICB2YXIgYm9keVJlZyA9IC8oPGJvZHlbXj5dKj4pKFtcXHNcXFNdKik8XFwvYm9keT4vXG59XG5cbmZ1bmN0aW9uIERPTVBhcnNlclBhcnNlIChtYXJrdXAsIHJvb3ROYW1lKSB7XG4gIHZhciBkb2MgPSBwYXJzZXIucGFyc2VGcm9tU3RyaW5nKG1hcmt1cCwgaHRtbFR5cGUpXG4gIC8vIFBhdGNoIGZvciBpT1MgVUlXZWJWaWV3IG5vdCBhbHdheXMgcmV0dXJuaW5nIGRvYy5ib2R5IHN5bmNocm9ub3VzbHlcbiAgaWYgKCFkb2MuYm9keSkgeyByZXR1cm4gZmFsbGJhY2tQYXJzZShtYXJrdXAsIHJvb3ROYW1lKSB9XG5cbiAgcmV0dXJuIHJvb3ROYW1lID09PSBkb2N1bWVudFJvb3ROYW1lXG4gICAgPyBkb2MuZG9jdW1lbnRFbGVtZW50XG4gICAgOiBkb2MuYm9keS5maXJzdENoaWxkXG59XG5cbmZ1bmN0aW9uIGZhbGxiYWNrUGFyc2UgKG1hcmt1cCwgcm9vdE5hbWUpIHtcbiAgLy8gRmFsbGJhY2sgdG8gaW5uZXJIVE1MIGZvciBvdGhlciBvbGRlciBicm93c2Vycy5cbiAgaWYgKHJvb3ROYW1lID09PSBkb2N1bWVudFJvb3ROYW1lKSB7XG4gICAgaWYgKHN1cHBvcnRzSW5uZXJIVE1MKSB7XG4gICAgICBtb2NrSFRNTC5pbm5lckhUTUwgPSBtYXJrdXBcbiAgICAgIHJldHVybiBtb2NrSFRNTFxuICAgIH0gZWxzZSB7XG4gICAgICAvLyBJRTkgZG9lcyBub3Qgc3VwcG9ydCBpbm5lcmh0bWwgYXQgcm9vdCBsZXZlbC5cbiAgICAgIC8vIFdlIGdldCBhcm91bmQgdGhpcyBieSBwYXJzaW5nIGV2ZXJ5dGhpbmcgZXhjZXB0IHRoZSBib2R5IGFzIHhodG1sLlxuICAgICAgdmFyIGJvZHlNYXRjaCA9IG1hcmt1cC5tYXRjaChib2R5UmVnKVxuICAgICAgaWYgKGJvZHlNYXRjaCkge1xuICAgICAgICB2YXIgYm9keUNvbnRlbnQgPSBib2R5TWF0Y2hbMl1cbiAgICAgICAgdmFyIHN0YXJ0Qm9keSA9IGJvZHlNYXRjaC5pbmRleCArIGJvZHlNYXRjaFsxXS5sZW5ndGhcbiAgICAgICAgdmFyIGVuZEJvZHkgPSBzdGFydEJvZHkgKyBib2R5Q29udGVudC5sZW5ndGhcbiAgICAgICAgbWFya3VwID0gbWFya3VwLnNsaWNlKDAsIHN0YXJ0Qm9keSkgKyBtYXJrdXAuc2xpY2UoZW5kQm9keSlcbiAgICAgICAgbW9ja0JvZHkuaW5uZXJIVE1MID0gYm9keUNvbnRlbnRcbiAgICAgIH1cblxuICAgICAgdmFyIGRvYyA9IHBhcnNlci5wYXJzZUZyb21TdHJpbmcobWFya3VwLCB4aHRtbFR5cGUpXG4gICAgICB2YXIgYm9keSA9IGRvYy5ib2R5XG4gICAgICB3aGlsZSAobW9ja0JvZHkuZmlyc3RDaGlsZCkgYm9keS5hcHBlbmRDaGlsZChtb2NrQm9keS5maXJzdENoaWxkKVxuICAgICAgcmV0dXJuIGRvYy5kb2N1bWVudEVsZW1lbnRcbiAgICB9XG4gIH0gZWxzZSB7XG4gICAgbW9ja0JvZHkuaW5uZXJIVE1MID0gbWFya3VwXG4gICAgcmV0dXJuIG1vY2tCb2R5LmZpcnN0Q2hpbGRcbiAgfVxufVxuXG4vKipcbiAqIFJldHVybnMgdGhlIHJlc3VsdHMgb2YgYSBET01QYXJzZXIgYXMgYW4gSFRNTEVsZW1lbnQuXG4gKiAoU2hpbXMgZm9yIG9sZGVyIGJyb3dzZXJzKS5cbiAqL1xubW9kdWxlLmV4cG9ydHMgPSBzdXBwb3J0c0hUTUxUeXBlXG4gID8gRE9NUGFyc2VyUGFyc2VcbiAgOiBmYWxsYmFja1BhcnNlXG4iLCJjb25zdCBLZWV0ID0gcmVxdWlyZSgnLi4va2VldCcpXHJcbmNvbnN0IHsgY2FtZWxDYXNlLCBodG1sIH0gPSByZXF1aXJlKCcuL3V0aWwnKVxyXG5jb25zdCB0b2RvID0gcmVxdWlyZSgnLi90b2RvJylcclxuY29uc3QgY3JlYXRlVG9kb01vZGVsID0gcmVxdWlyZSgnLi90b2RvTW9kZWwnKVxyXG5jb25zdCBmaWx0ZXJQYWdlID0gWydhbGwnLCAnYWN0aXZlJywgJ2NvbXBsZXRlZCddXHJcbmNvbnN0IGZpbHRlcnNUbXBsID0gcmVxdWlyZSgnLi9maWx0ZXJzJykoZmlsdGVyUGFnZSlcclxuXHJcbmNsYXNzIEFwcCBleHRlbmRzIEtlZXQge1xyXG4gIHRvZG9Nb2RlbCA9IGNyZWF0ZVRvZG9Nb2RlbCgpXHJcbiAgcGFnZSA9ICdBbGwnXHJcbiAgaXNDaGVja2VkID0gZmFsc2VcclxuICBjb3VudCA9IDBcclxuICBwbHVyYWwgPSAnJ1xyXG4gIGNsZWFyVG9nZ2xlID0gZmFsc2VcclxuXHJcbiAgY29tcG9uZW50V2lsbE1vdW50KCkge1xyXG4gICAgZmlsdGVyUGFnZS5tYXAoZiA9PiB0aGlzW2BwYWdlJHtjYW1lbENhc2UoZil9YF0gPSAnJylcclxuXHJcbiAgICB0aGlzLnRvZG9TdGF0ZSA9IHRoaXMudG9kb01vZGVsLmxpc3QubGVuZ3RoID8gdHJ1ZSA6IGZhbHNlXHJcblxyXG4gICAgdGhpcy50b2RvTW9kZWwuc3Vic2NyaWJlKCB0b2RvcyA9PiB7XHJcbiAgICAgIGxldCB1bmNvbXBsZXRlZCA9IHRvZG9zLmZpbHRlcihjID0+ICFjLmNvbXBsZXRlZClcclxuICAgICAgbGV0IGNvbXBsZXRlZCA9IHRvZG9zLmZpbHRlcihjID0+IGMuY29tcGxldGVkKVxyXG4gICAgICAvLyB0aGlzLmNsZWFyVG9nZ2xlID0gZmlsdGVyQ29tcGxldGVkLmxlbmd0aCA/IHRydWUgOiBmYWxzZVxyXG4gICAgICB0aGlzLnRvZG9TdGF0ZSA9IHRvZG9zLmxlbmd0aCA/IHRydWUgOiBmYWxzZVxyXG4gICAgICAvLyB0aGlzLnBsdXJhbCA9IGZpbHRlclVuY29tcGxldGUubGVuZ3RoID09PSAxID8gJycgOiAncydcclxuICAgICAgLy8gdGhpcy5jb3VudCA9IGZpbHRlclVuY29tcGxldGUubGVuZ3RoXHJcbiAgICB9KVxyXG4gIH1cclxuICBjb21wb25lbnREaWRNb3VudCgpe1xyXG4gICAgaWYgKHdpbmRvdy5sb2NhdGlvbi5oYXNoID09ICcnKSB7XHJcbiAgICAgIHRoaXMudXBkYXRlVXJsKCcjL2FsbCcpXHJcbiAgICAgIHdpbmRvdy5oaXN0b3J5LnB1c2hTdGF0ZSh7fSwgbnVsbCwgJyMvYWxsJylcclxuICAgIH1cclxuICAgIHdpbmRvdy5vbnBvcHN0YXRlID0gKCkgPT4gdGhpcy51cGRhdGVVcmwod2luZG93LmxvY2F0aW9uLmhhc2gpXHJcbiAgfVxyXG5cclxuICB1cGRhdGVVcmwoaGFzaCkge1xyXG4gICAgZmlsdGVyUGFnZS5tYXAoZiA9PiB7XHJcbiAgICAgIHRoaXNbYHBhZ2Uke2NhbWVsQ2FzZShmKX1gXSA9IGhhc2guc3BsaXQoJyMvJylbMV0gPT09IGYgPyAnc2VsZWN0ZWQnIDogJydcclxuICAgICAgaWYoaGFzaC5zcGxpdCgnIy8nKVsxXSA9PT0gZikgdGhpcy5wYWdlID0gZi5uYW1lXHJcbiAgICB9KVxyXG4gIH1cclxuXHJcbiAgY3JlYXRlIChldnQpIHtcclxuICAgIGlmKGV2dC5rZXlDb2RlICE9PSAxMykgcmV0dXJuXHJcbiAgICAvLyB0b2RvQXBwLmFkZFRvZG8oZXZ0LnRhcmdldC52YWx1ZS50cmltKCkpXHJcbiAgICB0aGlzLnRvZG9Nb2RlbC5hZGRUb2RvKGV2dC50YXJnZXQudmFsdWUudHJpbSgpKVxyXG4gICAgZXZ0LnRhcmdldC52YWx1ZSA9ICcnXHJcbiAgfVxyXG5cclxuICB0b2dnbGVUb2RvKGlkLCBldnQpIHtcclxuICAgIHRoaXMudG9kb01vZGVsLnRvZ2dsZSh7IFxyXG4gICAgICBpZDogaWQsXHJcbiAgICAgIGNvbXBsZXRlZDogISFldnQudGFyZ2V0LmNoZWNrZWRcclxuICAgIH0pXHJcbiAgfVxyXG5cclxuICAvLyB0b2RvRGVzdHJveShpZCkge1xyXG4gIC8vICAgY29uc29sZS5sb2coaWQpXHJcbiAgLy8gICB0aGlzLnRvZG9Nb2RlbC5kZXN0cm95KGlkKVxyXG4gIC8vIH1cclxuXHJcbiAgY29tcGxldGVBbGwoKXtcclxuICAgIHRoaXMuaXNDaGVja2VkID0gIXRoaXMuaXNDaGVja2VkXHJcbiAgICB0b2RvQXBwLnVwZGF0ZUFsbCh0aGlzLmlzQ2hlY2tlZClcclxuICB9XHJcblxyXG4gIGNsZWFyQ29tcGxldGVkKCkge1xyXG4gICAgdG9kb0FwcC5jbGVhckNvbXBsZXRlZCgpXHJcbiAgfVxyXG59XHJcblxyXG5jb25zdCB2bW9kZWwgPSBodG1sYFxyXG4gIDxzZWN0aW9uIGlkPVwidG9kb2FwcFwiPlxyXG4gICAgPGhlYWRlciBpZD1cImhlYWRlclwiPlxyXG4gICAgICA8aDE+dG9kb3M8L2gxPlxyXG4gICAgICA8aW5wdXQgaWQ9XCJuZXctdG9kb1wiIGsta2V5ZG93bj1cImNyZWF0ZSgpXCIgcGxhY2Vob2xkZXI9XCJXaGF0IG5lZWRzIHRvIGJlIGRvbmU/XCIgYXV0b2ZvY3VzPlxyXG4gICAgPC9oZWFkZXI+XHJcbiAgICB7ez90b2RvU3RhdGV9fVxyXG4gICAgPHNlY3Rpb24gaWQ9XCJtYWluXCI+XHJcbiAgICAgIDxpbnB1dCBpZD1cInRvZ2dsZS1hbGxcIiB0eXBlPVwiY2hlY2tib3hcIiB7e2lzQ2hlY2tlZD9jaGVja2VkOicnfX0gay1jbGljaz1cImNvbXBsZXRlQWxsKClcIj5cclxuICAgICAgPGxhYmVsIGZvcj1cInRvZ2dsZS1hbGxcIj5NYXJrIGFsbCBhcyBjb21wbGV0ZTwvbGFiZWw+XHJcbiAgICAgIDx1bCBpZD1cInRvZG8tbGlzdFwiPlxyXG4gICAgICAgIHt7bW9kZWw6dG9kb01vZGVsfX1cclxuICAgICAgICAgIDxsaSBrZWV0LWlkPVwie3tpZH19XCIgay1kYmxjbGljaz1cImVkaXRNb2RlKHt7aWR9fSlcIiBjbGFzcz1cInt7Y29tcGxldGVkP2NvbXBsZXRlZDonJ319XCI+XHJcbiAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJ2aWV3XCI+PGlucHV0IGstY2xpY2s9XCJ0b2dnbGVUb2RvKHt7aWR9fSlcIiBjbGFzcz1cInRvZ2dsZVwiIHR5cGU9XCJjaGVja2JveFwiIHt7Y29tcGxldGVkP2NoZWNrZWQ6Jyd9fT5cclxuICAgICAgICAgICAgICA8bGFiZWw+e3t0aXRsZX19PC9sYWJlbD5cclxuICAgICAgICAgICAgICA8YnV0dG9uIGstY2xpY2s9XCJ0b2RvRGVzdHJveSh7e2lkfX0pXCIgY2xhc3M9XCJkZXN0cm95XCI+PC9idXR0b24+XHJcbiAgICAgICAgICAgIDwvZGl2PlxyXG4gICAgICAgICAgICA8aW5wdXQgY2xhc3M9XCJlZGl0XCIgdmFsdWU9XCJ7e3RpdGxlfX1cIj5cclxuICAgICAgICAgIDwvbGk+XHJcbiAgICAgICAge3svbW9kZWw6dG9kb01vZGVsfX1cclxuICAgICAgPC91bD5cclxuICAgIDwvc2VjdGlvbj5cclxuICAgIDxmb290ZXIgaWQ9XCJmb290ZXJcIj5cclxuICAgICAgPHNwYW4gaWQ9XCJ0b2RvLWNvdW50XCI+XHJcbiAgICAgICAgPHN0cm9uZz57e2NvdW50fX08L3N0cm9uZz4gaXRlbXt7cGx1cmFsfX0gbGVmdFxyXG4gICAgICA8L3NwYW4+XHJcbiAgICAgIDx1bCBpZD1cImZpbHRlcnNcIj5cclxuICAgICAgICAke2ZpbHRlcnNUbXBsfVxyXG4gICAgICA8L3VsPlxyXG4gICAgICB7ez9jbGVhclRvZ2dsZX19XHJcbiAgICAgIDxidXR0b24gaWQ9XCJjbGVhci1jb21wbGV0ZWRcIiBrLWNsaWNrPVwiY2xlYXJDb21wbGV0ZWQoKVwiPkNsZWFyIGNvbXBsZXRlZDwvYnV0dG9uPlxyXG4gICAgICB7ey9jbGVhclRvZ2dsZX19XHJcbiAgICA8L2Zvb3Rlcj5cclxuICAgIHt7L3RvZG9TdGF0ZX19XHJcbiAgPC9zZWN0aW9uPlxyXG4gIDxmb290ZXIgaWQ9XCJpbmZvXCI+XHJcbiAgICA8cD5Eb3VibGUtY2xpY2sgdG8gZWRpdCBhIHRvZG88L3A+XHJcbiAgICA8cD5DcmVhdGVkIGJ5IDxhIGhyZWY9XCJodHRwczovL2dpdGh1Yi5jb20vc3lhcnVsXCI+U2hhaHJ1bCBOaXphbSBTZWxhbWF0PC9hPjwvcD5cclxuICAgIDxwPlBhcnQgb2YgPGEgaHJlZj1cImh0dHA6Ly90b2RvbXZjLmNvbVwiPlRvZG9NVkM8L2E+PC9wPlxyXG4gIDwvZm9vdGVyPmBcclxuXHJcbmNvbnN0IGFwcCA9IG5ldyBBcHAoKVxyXG5cclxuYXBwLm1vdW50KHZtb2RlbCkubGluaygndG9kbycpXHJcblxyXG4vLyBjb25zb2xlLmxvZyhhcHApXHJcbiIsImNvbnN0IHsgY2FtZWxDYXNlLCBodG1sIH0gPSByZXF1aXJlKCcuL3V0aWwnKVxyXG5cclxubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbihmaWx0ZXJQYWdlKSB7XHJcbiAgbGV0IHN0ciA9ICcnXHJcbiAgY29uc3QgZmlsdGVycyA9IHBhZ2UgPT4ge1xyXG4gICAgbGV0IGYgPSB7XHJcbiAgICAgIGNsYXNzTmFtZTogYHt7cGFnZSR7Y2FtZWxDYXNlKHBhZ2UpfX19YCxcclxuICAgICAgaGFzaDogJyMvJyArIHBhZ2UsXHJcbiAgICAgIG5hbWU6IGNhbWVsQ2FzZShwYWdlKVxyXG4gICAgfVxyXG4gICAgc3RyICs9IGh0bWxgPGxpIGstY2xpY2s9XCJ1cGRhdGVVcmwoJHtmLmhhc2h9KVwiPjxhIGNsYXNzPVwiJHtmLmNsYXNzTmFtZX1cIiBocmVmPVwiJHtmLmhhc2h9XCI+JHtmLm5hbWV9PC9hPjwvbGk+YFxyXG4gIH1cclxuICBmaWx0ZXJQYWdlLm1hcChwYWdlID0+IGZpbHRlcnMocGFnZSkpXHJcbiAgcmV0dXJuIHN0clxyXG59XHJcbiIsImNvbnN0IEtlZXQgPSByZXF1aXJlKCcuLi9rZWV0JylcclxuY29uc3QgeyBzdG9yZSwgaHRtbCwgc2VsZWN0b3IgfSA9IHJlcXVpcmUoJy4vdXRpbCcpXHJcblxyXG5jb25zdCBsb2cgPSBjb25zb2xlLmxvZy5iaW5kKGNvbnNvbGUpXHJcblxyXG5jbGFzcyBUb2RvQXBwIGV4dGVuZHMgS2VldCB7XHJcblxyXG4gIGVsID0gJ3RvZG8tbGlzdCdcclxuXHJcbiAgYWRkVG9kbyAodGl0bGUpIHtcclxuICAgIGxldCBtID0ge1xyXG4gICAgICB0aXRsZSxcclxuICAgICAgY29tcGxldGVkOiBmYWxzZVxyXG4gICAgfVxyXG4gICAgdGhpcy5hZGQobSwgaW5mb3JtKVxyXG4gIH1cclxuXHJcbiAgdXBkYXRlQWxsKGNoZWNrZWQpIHtcclxuICAgIHRoaXMuYmFzZS5tb2RlbC5tYXAobW9kZWwgPT4ge1xyXG4gICAgICB0aGlzLnVwZGF0ZShtb2RlbFsna2VldC1pZCddLCAna2VldC1pZCcsIHsgY29tcGxldGVkOiBjaGVja2VkIH0pXHJcbiAgICB9KVxyXG4gICAgaW5mb3JtLmNhbGwodGhpcylcclxuICB9XHJcblxyXG4gIGNsZWFyQ29tcGxldGVkKCl7XHJcbiAgICB0aGlzLmJhc2UubW9kZWwgPSB0aGlzLmJhc2UubW9kZWwuZmlsdGVyKG1vZGVsID0+IHtcclxuICAgICAgaWYgKG1vZGVsLmNvbXBsZXRlZCkge1xyXG4gICAgICAgIGxldCBub2RlID0gc2VsZWN0b3IobW9kZWxbJ2tlZXQtaWQnXSlcclxuICAgICAgICBub2RlICYmIG5vZGUucmVtb3ZlKCkgXHJcbiAgICAgIH0gZWxzZSB7IHJldHVybiBtb2RlbCB9XHJcbiAgICB9KVxyXG4gICAgaW5mb3JtLmNhbGwodGhpcylcclxuICB9XHJcblxyXG4gIGVkaXRNb2RlKGlkKSB7XHJcbiAgICAvLyBBcHAuZWRpdFRvZG9zKGlkLCB0aGlzKVxyXG4gIH1cclxuICB0b2RvRGVzdHJveShpZCwgZXZ0KSB7XHJcbiAgICAvLyB0aGlzLmRlc3Ryb3koaWQsICdrZWV0LWlkJywgZXZ0LnRhcmdldC5wYXJlbnROb2RlLnBhcmVudE5vZGUpXHJcbiAgICAvLyBBcHAudG9kb0Rlc3Ryb3koKVxyXG4gIH1cclxuICB0b2dnbGVUb2RvKGlkLCBldnQpIHtcclxuICAgIHRoaXMudXBkYXRlKGlkLCAna2VldC1pZCcsIHsgY29tcGxldGVkOiBldnQudGFyZ2V0LmNoZWNrZWQgPyB0cnVlIDogZmFsc2UgfSwgaW5mb3JtKVxyXG4gIH1cclxufVxyXG5cclxuY29uc3QgdG9kb0FwcCA9IG5ldyBUb2RvQXBwKClcclxuXHJcbmNvbnN0IHZtb2RlbCA9IHtcclxuICB0ZW1wbGF0ZTogaHRtbGBcclxuXHQ8bGkgay1kYmxjbGljaz1cImVkaXRNb2RlKHt7a2VldC1pZH19KVwiIGNsYXNzPVwie3tjb21wbGV0ZWQ/Y29tcGxldGVkOicnfX1cIj5cclxuXHRcdDxkaXYgY2xhc3M9XCJ2aWV3XCI+PGlucHV0IGstY2xpY2s9XCJ0b2dnbGVUb2RvKHt7a2VldC1pZH19KVwiIGNsYXNzPVwidG9nZ2xlXCIgdHlwZT1cImNoZWNrYm94XCIge3tjb21wbGV0ZWQ/Y2hlY2tlZDonJ319PlxyXG5cdFx0XHQ8bGFiZWw+e3t0aXRsZX19PC9sYWJlbD5cclxuXHRcdFx0PGJ1dHRvbiBrLWNsaWNrPVwidG9kb0Rlc3Ryb3koe3trZWV0LWlkfX0pXCIgY2xhc3M9XCJkZXN0cm95XCI+PC9idXR0b24+XHJcblx0XHQ8L2Rpdj5cclxuXHRcdDxpbnB1dCBjbGFzcz1cImVkaXRcIiB2YWx1ZT1cInt7dGl0bGV9fVwiPlxyXG5cdDwvbGk+YCxcclxuICBtb2RlbDogc3RvcmUoJ3RvZG9zLWtlZXRqcycpXHJcbn1cclxuXHJcbnRvZG9BcHAubW91bnQodm1vZGVsKVxyXG5cclxubW9kdWxlLmV4cG9ydHMgPSB0b2RvQXBwIiwiXHJcbmNvbnN0IHsgc3RvcmUsIGdlbklkIH0gPSByZXF1aXJlKCcuL3V0aWwnKVxyXG5cclxuLy8gbm90ZTogY29weSB3aXRoIG1vZGlmaWNhdGlvbiBmcm9tIHByZWFjdC10b2RvbXZjXHJcblxyXG5tb2R1bGUuZXhwb3J0cyA9ICgpID0+IHtcclxuXHJcbiAgbGV0IG9uQ2hhbmdlcyA9IFtdXHJcblxyXG4gIGZ1bmN0aW9uIGluZm9ybSAoKSB7XHJcbiAgICBmb3IgKGxldCBpID0gb25DaGFuZ2VzLmxlbmd0aDsgaS0tOykge1xyXG4gICAgICBvbkNoYW5nZXNbaV0obW9kZWwubGlzdClcclxuICAgIH1cclxuICB9XHJcblxyXG4gIGxldCBtb2RlbCA9IHtcclxuXHJcbiAgICBsaXN0OiBbXSxcclxuXHJcbiAgICBzdWJzY3JpYmUgKGZuKSB7XHJcbiAgICAgIG9uQ2hhbmdlcy5wdXNoKGZuKVxyXG4gICAgfSxcclxuXHJcbiAgICBhZGRUb2RvICh0aXRsZSkge1xyXG4gICAgICBtb2RlbC5saXN0ID0gbW9kZWwubGlzdC5jb25jYXQoe1xyXG4gICAgICAgIGlkOiBnZW5JZCgpLFxyXG4gICAgICAgIHRpdGxlLFxyXG4gICAgICAgIGNvbXBsZXRlZDogZmFsc2VcclxuICAgICAgfSlcclxuICAgICAgaW5mb3JtKClcclxuICAgIH0sXHJcblxyXG4gICAgdG9nZ2xlQWxsKGNvbXBsZXRlZCkge1xyXG4gICAgICBtb2RlbC5saXN0PSBtb2RlbC5saXN0Lm1hcChcclxuICAgICAgICB0b2RvID0+ICh7IC4uLnRvZG8sIGNvbXBsZXRlZCB9KVxyXG4gICAgICApO1xyXG4gICAgICBpbmZvcm0oKVxyXG4gICAgfSxcclxuICAgIFxyXG4gICAgdG9nZ2xlKHRvZG9Ub1RvZ2dsZSkge1xyXG4gICAgICBtb2RlbC5saXN0ID0gbW9kZWwubGlzdC5tYXAodG9kbyA9PlxyXG4gICAgICAgIHRvZG8uaWQgIT09IHRvZG9Ub1RvZ2dsZS5pZCA/IHRvZG8gOiAoeyAuLi50b2RvLCAuLi50b2RvVG9Ub2dnbGV9KVxyXG4gICAgICApXHJcbiAgICAgIGluZm9ybSgpXHJcbiAgICB9LFxyXG4gICAgXHJcbiAgICBkZXN0cm95KGlkKSB7XHJcbiAgICAgIGNvbnNvbGUubG9nKGlkKVxyXG4gICAgICBtb2RlbC5saXN0ID0gbW9kZWwubGlzdC5maWx0ZXIodCA9PiB0LmlkICE9PSBpZClcclxuICAgICAgaW5mb3JtKClcclxuICAgIH0sXHJcbiAgICAvKlxyXG4gICAgc2F2ZSh0b2RvVG9TYXZlLCB0aXRsZSkge1xyXG4gICAgICBtb2RlbC50b2RvcyA9IG1vZGVsLnRvZG9zLm1hcCggdG9kbyA9PiAoXHJcbiAgICAgICAgdG9kbyAhPT0gdG9kb1RvU2F2ZSA/IHRvZG8gOiAoeyAuLi50b2RvLCB0aXRsZSB9KVxyXG4gICAgICApKTtcclxuICAgICAgaW5mb3JtKCk7XHJcbiAgICB9LFxyXG5cclxuICAgIGNsZWFyQ29tcGxldGVkKCkge1xyXG4gICAgICBtb2RlbC50b2RvcyA9IG1vZGVsLnRvZG9zLmZpbHRlciggdG9kbyA9PiAhdG9kby5jb21wbGV0ZWQgKTtcclxuICAgICAgaW5mb3JtKCk7XHJcbiAgICB9ICovXHJcbiAgfVxyXG5cclxuICByZXR1cm4gbW9kZWxcclxufVxyXG4iLCJleHBvcnRzLmluZm9ybSA9IGZ1bmN0aW9uKGJhc2UsIGlucHV0KSB7XHJcbiAgZm9yICh2YXIgaSA9IGJhc2Uub25DaGFuZ2VzLmxlbmd0aDsgaS0tOykge1xyXG4gICAgYmFzZS5vbkNoYW5nZXNbaV0oaW5wdXQpXHJcbiAgfVxyXG59XHJcblxyXG5leHBvcnRzLnN0b3JlID0gZnVuY3Rpb24obmFtZXNwYWNlLCBkYXRhKSB7XHJcbiAgaWYgKGFyZ3VtZW50cy5sZW5ndGggPiAxKSB7XHJcbiAgICByZXR1cm4gbG9jYWxTdG9yYWdlLnNldEl0ZW0obmFtZXNwYWNlLCBKU09OLnN0cmluZ2lmeShkYXRhKSlcclxuICB9IGVsc2Uge1xyXG4gICAgdmFyIHN0b3JlID0gbG9jYWxTdG9yYWdlLmdldEl0ZW0obmFtZXNwYWNlKVxyXG4gICAgcmV0dXJuIHN0b3JlICYmIEpTT04ucGFyc2Uoc3RvcmUpIHx8IFtdXHJcbiAgfVxyXG59XHJcblxyXG5leHBvcnRzLmNhbWVsQ2FzZSA9IGZ1bmN0aW9uKHMpIHtcclxuICByZXR1cm4gcy5jaGFyQXQoMCkudG9VcHBlckNhc2UoKSArIHMuc2xpY2UoMSlcclxufVxyXG5cclxuZXhwb3J0cy5zZWxlY3RvciA9IGZ1bmN0aW9uIChpZCkge1xyXG4gIHJldHVybiBkb2N1bWVudC5xdWVyeVNlbGVjdG9yKCdba2VldC1pZD1cIicgKyBpZCArICdcIl0nKVxyXG59XHJcblxyXG5leHBvcnRzLmdlbklkID0gZnVuY3Rpb24oKSB7XHJcbiAgcmV0dXJuIChNYXRoLnJvdW5kKE1hdGgucmFuZG9tKCkgKiAweDEqMWUxMikpLnRvU3RyaW5nKDMyKVxyXG59XHJcblxyXG5leHBvcnRzLmdldElkID0gZnVuY3Rpb24gKGlkKSB7XHJcbiAgcmV0dXJuIGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKGlkKVxyXG59XHJcblxyXG5leHBvcnRzLmh0bWwgPSBmdW5jdGlvbiAobGl0ZXJhbFNlY3Rpb25zLCAuLi5zdWJzdHMpIHtcclxuICAvLyBVc2UgcmF3IGxpdGVyYWwgc2VjdGlvbnM6IHdlIGRvbuKAmXQgd2FudFxyXG4gIC8vIGJhY2tzbGFzaGVzIChcXG4gZXRjLikgdG8gYmUgaW50ZXJwcmV0ZWRcclxuICBsZXQgcmF3ID0gbGl0ZXJhbFNlY3Rpb25zLnJhdztcclxuXHJcbiAgbGV0IHJlc3VsdCA9ICcnO1xyXG5cclxuICBzdWJzdHMuZm9yRWFjaCgoc3Vic3QsIGkpID0+IHtcclxuICAgICAgLy8gUmV0cmlldmUgdGhlIGxpdGVyYWwgc2VjdGlvbiBwcmVjZWRpbmdcclxuICAgICAgLy8gdGhlIGN1cnJlbnQgc3Vic3RpdHV0aW9uXHJcbiAgICAgIGxldCBsaXQgPSByYXdbaV07XHJcblxyXG4gICAgICAvLyBJbiB0aGUgZXhhbXBsZSwgbWFwKCkgcmV0dXJucyBhbiBhcnJheTpcclxuICAgICAgLy8gSWYgc3Vic3RpdHV0aW9uIGlzIGFuIGFycmF5IChhbmQgbm90IGEgc3RyaW5nKSxcclxuICAgICAgLy8gd2UgdHVybiBpdCBpbnRvIGEgc3RyaW5nXHJcbiAgICAgIGlmIChBcnJheS5pc0FycmF5KHN1YnN0KSkge1xyXG4gICAgICAgICAgc3Vic3QgPSBzdWJzdC5qb2luKCcnKTtcclxuICAgICAgfVxyXG5cclxuICAgICAgLy8gSWYgdGhlIHN1YnN0aXR1dGlvbiBpcyBwcmVjZWRlZCBieSBhIGRvbGxhciBzaWduLFxyXG4gICAgICAvLyB3ZSBlc2NhcGUgc3BlY2lhbCBjaGFyYWN0ZXJzIGluIGl0XHJcbiAgICAgIGlmIChsaXQuZW5kc1dpdGgoJyQnKSkge1xyXG4gICAgICAgICAgc3Vic3QgPSBodG1sRXNjYXBlKHN1YnN0KTtcclxuICAgICAgICAgIGxpdCA9IGxpdC5zbGljZSgwLCAtMSk7XHJcbiAgICAgIH1cclxuICAgICAgcmVzdWx0ICs9IGxpdDtcclxuICAgICAgcmVzdWx0ICs9IHN1YnN0O1xyXG4gIH0pO1xyXG4gIC8vIFRha2UgY2FyZSBvZiBsYXN0IGxpdGVyYWwgc2VjdGlvblxyXG4gIC8vIChOZXZlciBmYWlscywgYmVjYXVzZSBhbiBlbXB0eSB0ZW1wbGF0ZSBzdHJpbmdcclxuICAvLyBwcm9kdWNlcyBvbmUgbGl0ZXJhbCBzZWN0aW9uLCBhbiBlbXB0eSBzdHJpbmcpXHJcbiAgcmVzdWx0ICs9IHJhd1tyYXcubGVuZ3RoLTFdOyAvLyAoQSlcclxuXHJcbiAgcmV0dXJuIHJlc3VsdDtcclxufVxyXG5cclxuZXhwb3J0cy5pbnRlbGxpVXBkYXRlID0gZnVuY3Rpb24oc3RhdGUsIGNhbGxiYWNrKSB7XHJcbiAgLy8gb25seSB1cGRhdGUgd2hlbiBuZWNlc3NhcnlcclxuICBpZiAoc3RhdGUpIGNsZWFyVGltZW91dChzdGF0ZSlcclxuICBzdGF0ZSA9IHNldFRpbWVvdXQoZnVuY3Rpb24oKSB7XHJcbiAgICBjYWxsYmFjaygpXHJcbiAgfSwgMTApXHJcbn0iXX0=
