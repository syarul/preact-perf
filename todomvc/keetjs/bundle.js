(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
'use strict'

const Keet = require('../keet.js/keet')

const {
  containerInit,
  container
} = require('./components/container')
const { store } = require('./utils')

let log = console.log.bind(console)

class App extends Keet {
  constructor(){
    super()
    this.todos = store('todos-keetjs')
    this.updating = false
  }
  intelliUpdate(store){
    // only update when necessary
    if(this.updating) clearTimeout(this.updating)
    this.updating = setTimeout(() => this.getActive(store), 10)
  }
  getActive(store) {
    // if(TODO_APP.container.mainDisplay == 'none'){
    //   TODO_APP.main.toggleDisplay(this.todos.length)
    //   TODO_APP.container.toggleMain(this.todos.length)
    //   TODO_APP.container.toggleFooter(this.todos.length)
    // } else if(TODO_APP.container.mainDisplay == 'block' && !this.todos.length){
    //   TODO_APP.main.toggleDisplay(this.todos.length)
    //   TODO_APP.container.toggleMain(this.todos.length)
    //   TODO_APP.container.toggleFooter(this.todos.length)
    // }

    const actives = this.todos.filter(f => f.completed !== 'completed')

    // TODO_APP.footer.updateCount(actives.length)
    // only store if requested
    if(store) store('todos-keetjs', this.todos)
    log(this.todos)
  }
}

const app = new App

const todo = {
  todoapp: {
    tag: 'section',
    id: 'todoapp'
  },
  info: {
    tag: 'footer',
    id: 'info',
    template: `
      <p>Double-click to edit a todo</p>
      <p>Created by <a href="https://github.com/syarul">Shahrul Nizam Selamat</a></p>
      <p>Part of <a href="http://todomvc.com">TodoMVC</a></p>`
  }
}

app.mount(todo).link('todo').cluster(containerInit)





},{"../keet.js/keet":18,"./components/container":2,"./utils":4}],2:[function(require,module,exports){
const Keet = require('../keet')
const { genId } = require('../utils')
const app = require('../app')

class Container extends Keet {
  constructor () {
    super()
    this.mainDisplay = 'none'
    this.footerDisplay = 'none'
  }
  toggleMain (show) {
    this.mainDisplay = show ? 'block' : 'none'
  }
  toggleFooter (show) {
    this.footerDisplay = show ? 'block' : 'none'
  }
  create (evt) {
    let value = evt.target.value.trim()
    if (evt.keyCode === 13) {
      app.todos.push({
        id: genId(),
        title: value,
        completed: '',
        checked: false,
        display: window.location.hash == '#/all' || window.location.hash == '#/active' ? 'block' : 'none'
      })

      app.intelliUpdate('store')

      evt.target.value = ''
    }
  }
}

const container = new Container()

const vmodel = {
  header: {
    tag: 'header',
    id: 'header',
    template: `
      <h1>todos</h1>
      <input id="new-todo" k-keydown="create()" placeholder="What needs to be done?" autofocus>`
  },
  main: {
    tag: 'section',
    id: 'main',
    style: {
      display: '{{mainDisplay}}'
    }
  },
  footer: {
    tag: 'footer',
    id: 'footer',
    style: {
      display: '{{footerDisplay}}'
    }
  }
}

const containerInit = () => container.mount(vmodel).link('todoapp')// .cluster(mainCluster, footerCluster)

module.exports = {
  containerInit,
  container
}

},{"../app":1,"../keet":3,"../utils":4}],3:[function(require,module,exports){
const Keet = require('../keet.js/keet')

module.exports = Keet
},{"../keet.js/keet":18}],4:[function(require,module,exports){
exports.store = function(namespace, data) {
  if (arguments.length > 1) {
    return localStorage.setItem(namespace, JSON.stringify(data));
  } else {
    var store = localStorage.getItem(namespace);
    return store && JSON.parse(store) || [];
  }
}
exports.genId = function() {
  return (new Date().getTime() * Math.round(Math.random() * 0x1000)).toString(32);
}
},{}],5:[function(require,module,exports){
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

},{}],6:[function(require,module,exports){

var loopChilds = function (arr, elem) {
  if (!elem) return false
  for (var child = elem.firstChild; child !== null; child = child.nextSibling) {
    arr.push(child)
    if (child.hasChildNodes()) {
      loopChilds(arr, child)
    }
  }
}

exports.loopChilds = loopChilds

exports.insertAfter = function (newNode, referenceNode) {
  referenceNode.parentNode.insertBefore(newNode, referenceNode.nextSibling)
}

var nodeUpdate = function (newNode, oldNode) {
  if (!newNode) return
  var oAttr = newNode.attributes
  var output = {}

  for (var i = oAttr.length - 1; i >= 0; i--) {
    output[oAttr[i].name] = oAttr[i].value
  }
  for (var iAttr in output) {
    if (oldNode.attributes[iAttr] && oldNode.attributes[iAttr].name === iAttr && oldNode.attributes[iAttr].value !== output[iAttr]) {
      oldNode.setAttribute(iAttr, output[iAttr])
    }
  }
  if (oldNode.textContent === '' && newNode.textContent) {
    oldNode.textContent = newNode.textContent
  }
  if (oldNode.type === 'checkbox' && !oldNode.checked && newNode.checked) {
    oldNode.checked = true
  }
  if (oldNode.type === 'checkbox' && oldNode.checked && !newNode.checked) {
    oldNode.checked = false
  }
  output = {}
}

var nodeUpdateHTML = function (newNode, oldNode) {
  if (!newNode) return
  if (newNode.nodeValue !== oldNode.nodeValue) { oldNode.nodeValue = newNode.nodeValue }
}

exports.updateElem = function (oldElem, newElem) {
  var oldArr = []
  var newArr = []
  oldArr.push(oldElem)
  newArr.push(newElem)
  loopChilds(oldArr, oldElem)
  loopChilds(newArr, newElem)
  oldArr.map(function (ele, idx, arr) {
    if (ele && ele.nodeType === 1 && ele.hasAttributes()) {
      nodeUpdate(newArr[idx], ele)
    } else if (ele && ele.nodeType === 3) {
      nodeUpdateHTML(newArr[idx], ele)
    }
    if (idx === arr.length - 1) {
      oldArr.splice(0)
      newArr.splice(0)
    }
  })
}

},{}],7:[function(require,module,exports){
var copy = require('./copy')
var tag = require('./tag')
var tmplHandler = require('./tmplHandler')
var tmplStylesHandler = require('./tmplStylesHandler')
var tmplClassHandler = require('./tmplClassHandler')
var tmplAttrHandler = require('./tmplAttrHandler')
var processEvent = require('./processEvent')
var updateElem = require('./elementUtils').updateElem
var insertAfter = require('./elementUtils').insertAfter
var selector = require('./utils').selector
var getId = require('./utils').getId
var genTemplate = require('./genTemplate')

var updateContext = function () {
  var self = this
  var key = [].shift.call(arguments)
  var obj = [].shift.call(arguments)

  Object.keys(this.base).map(function (handlerKey) {
    var tmplBase = self.base[handlerKey].template
    if (tmplBase) {
      var hasTmpl = tmplBase.match('{{' + key + '}}')
      if (hasTmpl && hasTmpl.length) {
        Object.assign(self, obj)
      }
    }

    var styleBase = self.base[handlerKey].style
    if (styleBase) {
      Object.keys(styleBase).map(function (style) {
        var hasStyleAttr = styleBase[style].match('{{' + key + '}}')
        if (hasStyleAttr) Object.assign(self, obj)
      })
    }

    var id = self.base[handlerKey]['keet-id']
    var ele = selector(id)
    var newElem

    if (self.hasOwnProperty(key)) self[key] = obj[key]

    var args = [].slice.call(arguments)

    newElem = genElement.apply(self, [self.base[handlerKey]].concat(args))

    updateElem(ele, newElem)
  })
}

var arrProtoSplice = function () {
  var ele = getId(this.el)
  var childLen
  var len
  var i
  var k
  var c
  var tempDivChildLen
  var tempDiv
  var start = [].shift.call(arguments)
  var count = [].shift.call(arguments)
  tempDiv = document.createElement('div')
  if (arguments.length) {
    i = 0
    while (i < arguments.length) {
      tempDiv.appendChild(genTemplate.call(this, arguments[i]))
      i++
    }
  }
  childLen = copy(ele.childNodes.length)
  tempDivChildLen = copy(tempDiv.childNodes.length)
  if (count && count > 0) {
    for (i = start; i < childLen + 1; i++) {
      len = start + count
      if (i < len && ele.childNodes[start]) {
        ele.removeChild(ele.childNodes[start])
      }
    }
  }
  c = start - 1
  for (k = start; k < tempDivChildLen + start; k++) {
    if (ele.childNodes[c]) { insertAfter(tempDiv.childNodes[0], ele.childNodes[c], ele) } else { ele.appendChild(tempDiv.childNodes[0]) }
    c++
  }
}

var arrProtoUpdate = function (index, value) {
  var ele = getId(this.el)
  if (!ele.childNodes[index]) {
    arrProtoSplice.apply(this, [index, 0, value])
  } else {
    updateElem(ele.childNodes[index], genTemplate.call(this, value))
  }
}

var proxy = function () {
  var self = this
  var watchObject = function (obj) {
    return new Proxy(obj, {
      set: function (target, key, value) {
        var obj = {}
        obj[key] = value
        var args = [].slice.call(arguments)
        args.unshift(obj)
        args.unshift(key)
        updateContext.apply(self, args)
        target[key] = value
        // ignore TypeError in strict mode
        return true
      }
    })
  }
  return watchObject(self)
}

var proxyList = function (list) {
  var self = this
  var watchObject = function (obj) {
    return new Proxy(obj, {
      set: function (target, key, value) {
        var num = parseInt(key)
        var intNum = Number.isInteger(num)
        if (intNum) {
          arrProtoUpdate.apply(self, [num, value])
        }
        target[key] = value
        // ignore TypeError in strict mode
        return true
      },
      deleteProperty: function (target, key) {
        arrProtoSplice.apply(self, [parseInt(key), 1])
        // ignore TypeError in strict mode
        var num = parseInt(key)
        return num < 1 ? 'false' : target[key]
      }
    })
  }
  return watchObject(list)
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
  var tpl = child.template ? tmplHandler.call(this, child.template) : null
  // process styles if has handlebars value
  var styleTpl = tmplStylesHandler.call(this, child.style)
  // process classes if has handlebars value
  var classTpl = tmplClassHandler.call(this, child)
  if (classTpl) cloneChild.class = classTpl
  // custom attributes handler
  if (args && args.length) {
    tmplAttrHandler.apply(this, [ cloneChild ].concat(args))
  }

  var s = child.tag
    ? tag(child.tag,            // html tag
      tpl || '',                // nodeValue
      cloneChild,               // attributes including classes
      styleTpl                  // styles
    ) : child.template          // fallback if non exist, render the template as string

  tempDiv.innerHTML = s
  if (child.tag === 'input') {
    if (cloneChild.checked) {
      tempDiv.childNodes[0].checked = true
    } else {
      tempDiv.childNodes[0].removeAttribute('checked')
    }
  }

  var proxyRes = proxy.apply(this, args)

  this.__proxy__ = proxyRes

  processEvent.apply(this, [ tempDiv, proxyRes ])
  return tempDiv.childNodes[0]
}

exports.proxy = proxy
exports.proxyList = proxyList
exports.genElement = genElement

},{"./copy":5,"./elementUtils":6,"./genTemplate":8,"./processEvent":10,"./tag":11,"./tmplAttrHandler":13,"./tmplClassHandler":14,"./tmplHandler":15,"./tmplStylesHandler":16,"./utils":17}],8:[function(require,module,exports){
var processEvent = require('./processEvent')

module.exports = function (obj) {
  var arrProps = this.base.template.match(/{{([^{}]+)}}/g)
  var tmpl
  var tempDiv
  tmpl = this.base.template
  arrProps.map(function (s) {
    var rep = s.replace(/{{([^{}]+)}}/g, '$1')
    tmpl = tmpl.replace(/{{([^{}]+)}}/, obj[rep])
  })
  tempDiv = document.createElement('div')
  tempDiv.innerHTML = tmpl
  processEvent.call(this, tempDiv)
  return tempDiv.childNodes[0]
}

},{"./processEvent":10}],9:[function(require,module,exports){
var genElement = require('./genElement').genElement
var proxy = require('./genElement').proxy
var tmplHandler = require('./tmplHandler')
var tmplArrayHandler = require('./tmplArrayHandler')
var processEvent = require('./processEvent')
var genId = require('./utils').genId

module.exports = function () {
  if (typeof this.base !== 'object') throw new Error('instance is not an object')
  var self = this
  var elemArr = []
  var args = [].slice.call(arguments)
  if (Array.isArray(this.base.list)) {
    // do array base
    var tpl = tmplArrayHandler.apply(this, args)
    tpl.tmpl.map(function (ptmpl) {
      var tempDiv = document.createElement('div')
      tempDiv.innerHTML = ptmpl
      processEvent.apply(self, [ tempDiv, tpl.proxyRes ])
      elemArr.push(tempDiv.childNodes[0])
    })

    this.list = tpl.proxyRes
  } else {
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
        var tpl = tmplHandler.call(self, child)
        var tempDiv = document.createElement('div')
        tempDiv.innerHTML = tpl
        var proxyRes = proxy.call(self)
        self.__proxy__ = proxyRes
        processEvent.apply(self, [ tempDiv, proxyRes ])
        elemArr.push(tempDiv.childNodes[0])
      }
    })
  }

  return elemArr
}

},{"./genElement":7,"./processEvent":10,"./tmplArrayHandler":12,"./tmplHandler":15,"./utils":17}],10:[function(require,module,exports){
var loopChilds = require('./elementUtils').loopChilds

var next = function (i, c, rem, proxy) {
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
        c.addEventListener(evtName, isHandler.bind.apply(isHandler.bind(proxy), [c].concat(argv)), false)
      }
    }
    i++
    next.apply(this, [ i, c, rem, proxy ])
  } else {
    rem.map(function (f) { c.removeAttribute(f) })
  }
}

module.exports = function (kNode, proxy) {
  var self = this
  var listKnodeChild = []
  var rem = []
  loopChilds(listKnodeChild, kNode)
  listKnodeChild.map(function (c) {
    if (c.nodeType === 1 && c.hasAttributes()) {
      next.apply(self, [ 0, c, rem, proxy ])
    }
  })
  listKnodeChild = []
}

},{"./elementUtils":6}],11:[function(require,module,exports){
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

},{}],12:[function(require,module,exports){
var proxyList = require('./genElement').proxyList

module.exports = function () {
  var args = [].slice.call(arguments)
  var str = this.base.template
  // clean up es6 backtick string including line spacing
  str = str.trim().replace(/\s+/g, ' ')
  var list = this.base.list
  var arrProps = str.match(/{{([^{}]+)}}/g)
  var tmpl
  var strList = []
  if (arrProps && arrProps.length) {
    list.map(function (r) {
      tmpl = str
      arrProps.map(function (s) {
        var rep = s.replace(/{{([^{}]+)}}/g, '$1')
        tmpl = tmpl.replace(/{{([^{}]+)}}/, r[rep])
        if (~args.indexOf(rep) && !r[rep]) {
          var re = new RegExp(' ' + rep + '=\'' + r[rep] + '\'', 'g')
          tmpl = tmpl.replace(re, '')
        }
      })
      strList.push(tmpl)
    })
  }

  var proxyRes = proxyList.call(this, list)

  return {
    tmpl: strList,
    proxyRes: proxyRes
  }
}

},{"./genElement":7}],13:[function(require,module,exports){
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

},{}],14:[function(require,module,exports){
module.exports = function (child) {
  var self = this
  if (child.class) {
    var c = child.class.match(/{{([^{}]+)}}/g)
    var classStr = ''
    if (c && c.length) {
      c.map(function (s) {
        var rep = s.replace(/{{([^{}]+)}}/g, '$1')
        if (self[rep] !== undefined) {
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

},{}],15:[function(require,module,exports){
module.exports = function (str) {
  var self = this
  // clean up es6 backtick string including line spacing
  str = str.trim().replace(/\s+/g, ' ')
  var arrProps = str.match(/{{([^{}]+)}}/g)
  if (arrProps && arrProps.length) {
    arrProps.map(function (s) {
      var rep = s.replace(/{{([^{}]+)}}/g, '$1')
      if (self[rep] !== undefined) {
        str = str.replace(/{{([^{}]+)}}/, self[rep])
      }
    })
  }
  return str
}

},{}],16:[function(require,module,exports){
var copy = require('./copy')

module.exports = function (styles) {
  var self = this
  var copyStyles = copy(styles)
  if (styles) {
    Object.keys(copyStyles).map(function (style) {
      var arrProps = copyStyles[style].match(/{{([^{}]+)}}/g)
      if (arrProps && arrProps.length) {
        arrProps.map(function (s) {
          var rep = s.replace(/{{([^{}]+)}}/g, '$1')
          if (self[rep] !== undefined) {
            copyStyles[style] = copyStyles[style].replace(/{{([^{}]+)}}/, self[rep])
          }
        })
      }
    })
  }
  return copyStyles
}

},{"./copy":5}],17:[function(require,module,exports){
exports.getId = function (id) {
  return document.getElementById(id)
}

exports.genId = function () {
  return (Math.round(Math.random() * 0x1 * 1e12)).toString(32)
}

exports.selector = function (id) {
  return document.querySelector('[keet-id="' + id + '"]')
}

},{}],18:[function(require,module,exports){
'use strict'
/**
 * Keetjs v3.2.3 Alpha release: https://github.com/keetjs/keet.js
 * Minimalist view layer for the web
 *
 * <<<<<<<<<<<<<<<<<<<<<<<<<<<<<< Keetjs >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
 *
 * Copyright 2018, Shahrul Nizam Selamat
 * Released under the MIT License.
 */

var getId = require('./components/utils').getId
var parseStr = require('./components/parseStr')

var next = function (i, ele, els) {
  var self = this
  if (i < els.length) {
    ele.appendChild(els[i])
    i++
    next.apply(this, [ i, ele, els ])
  } else {
    // bind proxy to component methods
    Object.getOwnPropertyNames(Object.getPrototypeOf(this))
      .filter(function (fn) { return fn !== 'constructor' })
      .map(function (fn) {
        self[fn] = self[fn].bind(self.__proxy__)
      })

    // component lifeCycle after mounting
    if (this.componentDidMount && typeof this.componentDidMount === 'function') {
      this.componentDidMount()
    }
  }
}

function Keet () {
  this.base = {}
  Object.defineProperty(this, '__proxy__', {
    enumerable: false,
    writable: true
  })
}

Keet.prototype.mount = function (instance) {
  this.base = instance
  return this
}

Keet.prototype.link = function (id) {
  this.el = id
  // component lifeCycle before mounting
  if (this.componentWillMount && typeof this.componentWillMount === 'function') {
    this.componentWillMount()
  }
  this.render()
  return this
}

Keet.prototype.render = function () {
  var ele = getId(this.el)
  var els = parseStr.apply(this, this.args)
  if (ele) {
    ele.innerHTML = ''
    next.apply(this, [ 0, ele, els ])
  }
  return this
}

Keet.prototype.cluster = function () {
  var args = [].slice.call(arguments)
  if (args.length > 0) {
    args.map(function (f) {
      if (typeof f === 'function') f()
    })
  }
}

module.exports = Keet

},{"./components/parseStr":9,"./components/utils":17}]},{},[1]);
