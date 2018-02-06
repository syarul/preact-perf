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

},{}],3:[function(require,module,exports){
var copy = require('./copy')
var tag = require('./tag')
var tmplHandler = require('./tmplHandler')
var tmplStylesHandler = require('./tmplStylesHandler')
var tmplClassHandler = require('./tmplClassHandler')
var tmplAttrHandler = require('./tmplAttrHandler')
var processEvent = require('./processEvent')
var updateElem = require('./elementUtils').updateElem
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

var arrProtoUpdate = function (index, value) {
  var ele = getId(this.el)
  var child = ele.childNodes[index]
  if (child) {
    var replace = genTemplate.call(this, value)
    updateElem(child, replace)
  } else {
    ele.appendChild(genTemplate.call(this, value))
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
        // console.log(target[key])
        var ele = getId(self.el)
        var num = parseInt(key)
        var child = ele.childNodes[num]
        child.remove()
        // ignore TypeError in strict mode
        return true // target[key]
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
exports.arrProtoUpdate = arrProtoUpdate

},{"./copy":1,"./elementUtils":2,"./genTemplate":4,"./processEvent":6,"./tag":7,"./tmplAttrHandler":9,"./tmplClassHandler":10,"./tmplHandler":11,"./tmplStylesHandler":12,"./utils":13}],4:[function(require,module,exports){
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
  return tempDiv.childNodes[0]
}

},{"./processEvent":6}],5:[function(require,module,exports){
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

},{"./genElement":3,"./processEvent":6,"./tmplArrayHandler":8,"./tmplHandler":11,"./utils":13}],6:[function(require,module,exports){
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

},{"./elementUtils":2}],7:[function(require,module,exports){
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

},{}],8:[function(require,module,exports){
var proxyList = require('./genElement').proxyList

module.exports = function () {
  var args = [].slice.call(arguments)
  var str = this.base.template
  // clean up es6 backtick string including line spacing
  str = str.trim().replace(/\s+/g, ' ')
  this.base.template = str
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
        if (args && ~args.indexOf(rep) && !r[rep]) {
          var re = new RegExp(' ' + rep + '="' + r[rep] + '"', 'g')
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

},{"./genElement":3}],9:[function(require,module,exports){
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

},{}],10:[function(require,module,exports){
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

},{}],11:[function(require,module,exports){
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

},{}],12:[function(require,module,exports){
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

},{}],14:[function(require,module,exports){
'use strict'
/**
 * Keetjs v3.2.8 Alpha release: https://github.com/keetjs/keet.js
 * Minimalist view layer for the web
 *
 * <<<<<<<<<<<<<<<<<<<<<<<<<<<<<< Keetjs >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
 *
 * Copyright 2018, Shahrul Nizam Selamat
 * Released under the MIT License.
 */

var getId = require('./components/utils').getId
var selector = require('./components/utils').selector
var parseStr = require('./components/parseStr')

var next = function (i, ele, els) {
  var self = this
  if (i < els.length) {
    if (!ele.childNodes[i]) { ele.appendChild(els[i]) }
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

    var watchObject = function (obj) {
      return new Proxy(obj, {
        set: function (target, key, value) {
          target[key] = value
          self.base[key] = target[key]
          self.render()
          return true
        },
        deleteProperty: function (target, key) {
          var id = target[key]['keet-id']
          var el = selector(id)
          if (el) el.remove()
          return true
        }
      })
    }
    this.baseProxy = watchObject(this.base)
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

Keet.prototype.render = function (force) {
  var ele = getId(this.el)
  var els = parseStr.apply(this, this.args)
  if (ele) {
    if (force) ele.innerHTML = ''
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

},{"./components/parseStr":5,"./components/utils":13}],15:[function(require,module,exports){
const Keet = require('keet')
const { containerInit, container } = require('./container')
const { inform, getId } = require('./util')

const { footer } = require('./footer')
const { filters } = require('./filters')

const log = console.log.bind(console)

class App extends Keet {
  constructor() {
    super()
    this.page = 'All'
  }
  routeUpdate() {
    if (window.location.hash !== '') {
      this.updateFilter(window.location.hash)
    } else {
      this.updateFilter('#/all')
      window.history.pushState({}, null, '#/all')
    }

    window.onpopstate = () => this.updateFilter(window.location.hash)
  }
  updateFilter(hash) {
  	let el = getId(filters.el)
  	if(!el) return

    filters.list.map((f, i, r) => {
      let c = {}
      c.className = f.hash === hash ? 'selected' : ''
      if (f.className === 'selected') this.page = f.nodeValue
      r[i] = Object.assign(f, c)
    })
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

app.routeUpdate()

module.exports = app

setTimeout(() => {
  inform(container, [1])
  inform(footer, [{completed: 'completed'}, {completed: ''}])
  app.routeUpdate()
}, 2000)
},{"./container":16,"./filters":17,"./footer":18,"./util":20,"keet":14}],16:[function(require,module,exports){
const Keet = require('keet')
const { main, mainInit } = require('./main')
const { footer, footerInit } = require('./footer')
const { filters } = require('./filters')

class Container extends Keet {
  constructor(){
    super()
    this.onChanges = []
    this.gen = false
    this.subscribe(todos => {
      if(todos.length && !this.gen){
        this.gen = true
        this.mountChild('main', { tag: 'section', id: 'main'}, main)
        this.mountChild('footer', { tag: 'footer', id: 'footer'}, footer)
      } 
      else if(!todos.length && this.gen){
        this.gen = false
        this.removeTodoContainer()
      }
    })
  }
  create (evt) {
    if(evt.keyCode !== 13) return
    todoList.addTodo.call(todoList, evt.target.value.trim())
    evt.target.value = ''
  }
  mountChild(child, prop, component){
    this.baseProxy[child] = prop
    component.render()
    filters.render()
  }
  removeTodoContainer(){
    delete this.baseProxy.main
    delete this.baseProxy.footer
  }
  subscribe(fn) {
    this.onChanges.push(fn)
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
  }
}

exports.containerInit = () => container.mount(vmodel).link('todoapp').cluster(mainInit, footerInit)

exports.container = container
},{"./filters":17,"./footer":18,"./main":19,"keet":14}],17:[function(require,module,exports){
const Keet = require('keet')
const app = require('./app')
const { camelCase } = require('./util')

let filterPage = ['all', 'active', 'completed']

class Filters extends Keet {
  updateUrl (uri) {
    console.log(app)
    // app.updateFilter(uri)
  }
}

const filters = new Filters()

const vmodel = {
  template: `
    <li k-click="updateUrl({{hash}})">
      <a class="{{className}}" href="{{hash}}">{{nodeValue}}</a>
    </li>`.trim(),
  list: filterPage.map(f => {
    return {
      className: '',
      hash: '#/' + f,
      nodeValue: camelCase(f)
    }
  })
}

const filtersInit = () => filters.mount(vmodel).link('filters')

module.exports = {
  filtersInit,
  filters
}

},{"./app":15,"./util":20,"keet":14}],18:[function(require,module,exports){
const Keet = require('keet')
const { filtersInit } =require('./filters')

class Footer extends Keet {
  constructor () {
    super()
    this.count = 0
    this.s = ''
    this.clearCompletedDisplay = 'none'

    this.onChanges = []
    this.subscribe(todos => {
      let actives = todos.filter(f => f.completed !== 'completed')
      this.updateCount(actives.length)
      this.toggleClearComplete(actives.length !== todos.length ? true : false)
    })
  }
  toggleClearComplete (display) {
    this.clearCompletedDisplay = display || 'none'
  }
  updateCount (count) {
    this.count = count//.toString()
    this.s = count === 1 ? '' : 's'
  }
  clearCompletedClicked (evt) {
    app.clearCompleted.bind(app)
  }
  subscribe(fn) {
    this.onChanges.push(fn)
  }
}

const footer = new Footer()

const vmodel = {
  todoCount: {
    tag: 'span',
    id: 'todo-count',
    template: `<strong>{{count}}</strong> item{{s}} left`
  },
  filters: {
    tag: 'ul',
    id: 'filters'
  },
  clearCompleted: {
    tag: 'button',
    id: 'clear-completed',
    style: {
      display: '{{clearCompletedDisplay}}'
    },
    'k-click': 'clearCompletedClicked()',
    template: 'Clear completed'
  }
}

const footerInit = () => footer.mount(vmodel).link('footer').cluster(filtersInit)

module.exports = {
  footerInit,
  footer
}

},{"./filters":17,"keet":14}],19:[function(require,module,exports){
const Keet = require('keet')
//import todoListInit from './todoList'

class Main extends Keet {
  constructor (...args) {
    super()
    this.args = args
    this.display = 'none'
    this.isCheck = false

    this.onChanges = []
    this.subscribe(todos =>
      this.toggleDisplay(todos.length ? 'block' : 'none')
    )
  }
  toggleDisplay (display) {
    this.display = display
  }
  toggleCheck (check) {
    this.isCheck = check || false
  }
  completeAll (evt) {
    app.checkedAll(evt)
  }
  subscribe(fn) {
    this.onChanges.push(fn)
  }
}

const main = new Main('checked')

const vmodel = {
  toggleAll: {
    tag: 'input',
    id: 'toggle-all',
    type: 'checkbox',
    checked: '{{isCheck}}',
    style: {
      display: '{{display}}'
    },
    'k-click': 'completeAll()'

  },
  toggleLabel: `<label for="toggle-all">Mark all as complete</label>`,
  todoList: {
    tag: 'ul',
    id: 'todo-list'
  }
}

const mainInit = () => main.mount(vmodel).link('main')//.cluster(todoListInit)

module.exports = {
  mainInit,
  main
}
},{"keet":14}],20:[function(require,module,exports){
exports.inform = function(base, input) {
  for (var i = base.onChanges.length; i--;) {
    base.onChanges[i](input)
  }
}

exports.store = function(namespace, data) {
  if (arguments.length > 1) {
    return localStorage.setItem(namespace, JSON.stringify(data))
  } else {
    var store = localStorage.getItem(namespace)
    return store && JSON.parse(store) || []
  }
}

exports.camelCase = function(s) {
  return s.charAt(0).toUpperCase() + s.slice(1)
}

exports.genId = function() {
  return (Math.round(Math.random() * 0x1000)).toString(32)
}

exports.getId = function (id) {
  return document.getElementById(id)
}
},{}]},{},[15])
//# sourceMappingURL=data:application/json;charset:utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIkM6L1VzZXJzL2toYWkvQXBwRGF0YS9Sb2FtaW5nL25wbS9ub2RlX21vZHVsZXMvYnJvd3NlcmlmeS9ub2RlX21vZHVsZXMvYnJvd3Nlci1wYWNrL19wcmVsdWRlLmpzIiwibm9kZV9tb2R1bGVzL2tlZXQvY29tcG9uZW50cy9jb3B5LmpzIiwibm9kZV9tb2R1bGVzL2tlZXQvY29tcG9uZW50cy9lbGVtZW50VXRpbHMuanMiLCJub2RlX21vZHVsZXMva2VldC9jb21wb25lbnRzL2dlbkVsZW1lbnQuanMiLCJub2RlX21vZHVsZXMva2VldC9jb21wb25lbnRzL2dlblRlbXBsYXRlLmpzIiwibm9kZV9tb2R1bGVzL2tlZXQvY29tcG9uZW50cy9wYXJzZVN0ci5qcyIsIm5vZGVfbW9kdWxlcy9rZWV0L2NvbXBvbmVudHMvcHJvY2Vzc0V2ZW50LmpzIiwibm9kZV9tb2R1bGVzL2tlZXQvY29tcG9uZW50cy90YWcuanMiLCJub2RlX21vZHVsZXMva2VldC9jb21wb25lbnRzL3RtcGxBcnJheUhhbmRsZXIuanMiLCJub2RlX21vZHVsZXMva2VldC9jb21wb25lbnRzL3RtcGxBdHRySGFuZGxlci5qcyIsIm5vZGVfbW9kdWxlcy9rZWV0L2NvbXBvbmVudHMvdG1wbENsYXNzSGFuZGxlci5qcyIsIm5vZGVfbW9kdWxlcy9rZWV0L2NvbXBvbmVudHMvdG1wbEhhbmRsZXIuanMiLCJub2RlX21vZHVsZXMva2VldC9jb21wb25lbnRzL3RtcGxTdHlsZXNIYW5kbGVyLmpzIiwibm9kZV9tb2R1bGVzL2tlZXQvY29tcG9uZW50cy91dGlscy5qcyIsIm5vZGVfbW9kdWxlcy9rZWV0L2tlZXQuanMiLCJzcmMvYXBwLmpzIiwic3JjL2NvbnRhaW5lci5qcyIsInNyYy9maWx0ZXJzLmpzIiwic3JjL2Zvb3Rlci5qcyIsInNyYy9tYWluLmpzIiwic3JjL3V0aWwuanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7QUNBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNmQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDOURBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzVKQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDN0JBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMvQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM5Q0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ25DQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2xDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNyQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNuQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDZkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3BCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDWEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNqR0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNoRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN2REE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ25DQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzdEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3ZEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBIiwiZmlsZSI6ImdlbmVyYXRlZC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzQ29udGVudCI6WyIoZnVuY3Rpb24gZSh0LG4scil7ZnVuY3Rpb24gcyhvLHUpe2lmKCFuW29dKXtpZighdFtvXSl7dmFyIGE9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtpZighdSYmYSlyZXR1cm4gYShvLCEwKTtpZihpKXJldHVybiBpKG8sITApO3ZhciBmPW5ldyBFcnJvcihcIkNhbm5vdCBmaW5kIG1vZHVsZSAnXCIrbytcIidcIik7dGhyb3cgZi5jb2RlPVwiTU9EVUxFX05PVF9GT1VORFwiLGZ9dmFyIGw9bltvXT17ZXhwb3J0czp7fX07dFtvXVswXS5jYWxsKGwuZXhwb3J0cyxmdW5jdGlvbihlKXt2YXIgbj10W29dWzFdW2VdO3JldHVybiBzKG4/bjplKX0sbCxsLmV4cG9ydHMsZSx0LG4scil9cmV0dXJuIG5bb10uZXhwb3J0c312YXIgaT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2Zvcih2YXIgbz0wO288ci5sZW5ndGg7bysrKXMocltvXSk7cmV0dXJuIHN9KSIsIm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24gKGFyZ3YpIHtcclxuICB2YXIgY29wID0gZnVuY3Rpb24gKHYpIHtcclxuICAgIHZhciBvID0ge31cclxuICAgIGlmICh0eXBlb2YgdiAhPT0gJ29iamVjdCcpIHtcclxuICAgICAgby5jb3B5ID0gdlxyXG4gICAgICByZXR1cm4gby5jb3B5XHJcbiAgICB9IGVsc2Uge1xyXG4gICAgICBmb3IgKHZhciBhdHRyIGluIHYpIHtcclxuICAgICAgICBvW2F0dHJdID0gdlthdHRyXVxyXG4gICAgICB9XHJcbiAgICB9XHJcbiAgICByZXR1cm4gb1xyXG4gIH1cclxuICByZXR1cm4gQXJyYXkuaXNBcnJheShhcmd2KSA/IGFyZ3YubWFwKGZ1bmN0aW9uICh2KSB7IHJldHVybiB2IH0pIDogY29wKGFyZ3YpXHJcbn1cclxuIiwiXHJcbnZhciBsb29wQ2hpbGRzID0gZnVuY3Rpb24gKGFyciwgZWxlbSkge1xyXG4gIGlmICghZWxlbSkgcmV0dXJuIGZhbHNlXHJcbiAgZm9yICh2YXIgY2hpbGQgPSBlbGVtLmZpcnN0Q2hpbGQ7IGNoaWxkICE9PSBudWxsOyBjaGlsZCA9IGNoaWxkLm5leHRTaWJsaW5nKSB7XHJcbiAgICBhcnIucHVzaChjaGlsZClcclxuICAgIGlmIChjaGlsZC5oYXNDaGlsZE5vZGVzKCkpIHtcclxuICAgICAgbG9vcENoaWxkcyhhcnIsIGNoaWxkKVxyXG4gICAgfVxyXG4gIH1cclxufVxyXG5cclxuZXhwb3J0cy5sb29wQ2hpbGRzID0gbG9vcENoaWxkc1xyXG5cclxudmFyIG5vZGVVcGRhdGUgPSBmdW5jdGlvbiAobmV3Tm9kZSwgb2xkTm9kZSkge1xyXG4gIGlmICghbmV3Tm9kZSkgcmV0dXJuXHJcbiAgdmFyIG9BdHRyID0gbmV3Tm9kZS5hdHRyaWJ1dGVzXHJcbiAgdmFyIG91dHB1dCA9IHt9XHJcblxyXG4gIGZvciAodmFyIGkgPSBvQXR0ci5sZW5ndGggLSAxOyBpID49IDA7IGktLSkge1xyXG4gICAgb3V0cHV0W29BdHRyW2ldLm5hbWVdID0gb0F0dHJbaV0udmFsdWVcclxuICB9XHJcbiAgZm9yICh2YXIgaUF0dHIgaW4gb3V0cHV0KSB7XHJcbiAgICBpZiAob2xkTm9kZS5hdHRyaWJ1dGVzW2lBdHRyXSAmJiBvbGROb2RlLmF0dHJpYnV0ZXNbaUF0dHJdLm5hbWUgPT09IGlBdHRyICYmIG9sZE5vZGUuYXR0cmlidXRlc1tpQXR0cl0udmFsdWUgIT09IG91dHB1dFtpQXR0cl0pIHtcclxuICAgICAgb2xkTm9kZS5zZXRBdHRyaWJ1dGUoaUF0dHIsIG91dHB1dFtpQXR0cl0pXHJcbiAgICB9XHJcbiAgfVxyXG4gIGlmIChvbGROb2RlLnRleHRDb250ZW50ID09PSAnJyAmJiBuZXdOb2RlLnRleHRDb250ZW50KSB7XHJcbiAgICBvbGROb2RlLnRleHRDb250ZW50ID0gbmV3Tm9kZS50ZXh0Q29udGVudFxyXG4gIH1cclxuICBpZiAob2xkTm9kZS50eXBlID09PSAnY2hlY2tib3gnICYmICFvbGROb2RlLmNoZWNrZWQgJiYgbmV3Tm9kZS5jaGVja2VkKSB7XHJcbiAgICBvbGROb2RlLmNoZWNrZWQgPSB0cnVlXHJcbiAgfVxyXG4gIGlmIChvbGROb2RlLnR5cGUgPT09ICdjaGVja2JveCcgJiYgb2xkTm9kZS5jaGVja2VkICYmICFuZXdOb2RlLmNoZWNrZWQpIHtcclxuICAgIG9sZE5vZGUuY2hlY2tlZCA9IGZhbHNlXHJcbiAgfVxyXG4gIG91dHB1dCA9IHt9XHJcbn1cclxuXHJcbnZhciBub2RlVXBkYXRlSFRNTCA9IGZ1bmN0aW9uIChuZXdOb2RlLCBvbGROb2RlKSB7XHJcbiAgaWYgKCFuZXdOb2RlKSByZXR1cm5cclxuICBpZiAobmV3Tm9kZS5ub2RlVmFsdWUgIT09IG9sZE5vZGUubm9kZVZhbHVlKSB7IG9sZE5vZGUubm9kZVZhbHVlID0gbmV3Tm9kZS5ub2RlVmFsdWUgfVxyXG59XHJcblxyXG5leHBvcnRzLnVwZGF0ZUVsZW0gPSBmdW5jdGlvbiAob2xkRWxlbSwgbmV3RWxlbSkge1xyXG4gIHZhciBvbGRBcnIgPSBbXVxyXG4gIHZhciBuZXdBcnIgPSBbXVxyXG4gIG9sZEFyci5wdXNoKG9sZEVsZW0pXHJcbiAgbmV3QXJyLnB1c2gobmV3RWxlbSlcclxuICBsb29wQ2hpbGRzKG9sZEFyciwgb2xkRWxlbSlcclxuICBsb29wQ2hpbGRzKG5ld0FyciwgbmV3RWxlbSlcclxuICBvbGRBcnIubWFwKGZ1bmN0aW9uIChlbGUsIGlkeCwgYXJyKSB7XHJcbiAgICBpZiAoZWxlICYmIGVsZS5ub2RlVHlwZSA9PT0gMSAmJiBlbGUuaGFzQXR0cmlidXRlcygpKSB7XHJcbiAgICAgIG5vZGVVcGRhdGUobmV3QXJyW2lkeF0sIGVsZSlcclxuICAgIH0gZWxzZSBpZiAoZWxlICYmIGVsZS5ub2RlVHlwZSA9PT0gMykge1xyXG4gICAgICBub2RlVXBkYXRlSFRNTChuZXdBcnJbaWR4XSwgZWxlKVxyXG4gICAgfVxyXG4gICAgaWYgKGlkeCA9PT0gYXJyLmxlbmd0aCAtIDEpIHtcclxuICAgICAgb2xkQXJyLnNwbGljZSgwKVxyXG4gICAgICBuZXdBcnIuc3BsaWNlKDApXHJcbiAgICB9XHJcbiAgfSlcclxufVxyXG4iLCJ2YXIgY29weSA9IHJlcXVpcmUoJy4vY29weScpXHJcbnZhciB0YWcgPSByZXF1aXJlKCcuL3RhZycpXHJcbnZhciB0bXBsSGFuZGxlciA9IHJlcXVpcmUoJy4vdG1wbEhhbmRsZXInKVxyXG52YXIgdG1wbFN0eWxlc0hhbmRsZXIgPSByZXF1aXJlKCcuL3RtcGxTdHlsZXNIYW5kbGVyJylcclxudmFyIHRtcGxDbGFzc0hhbmRsZXIgPSByZXF1aXJlKCcuL3RtcGxDbGFzc0hhbmRsZXInKVxyXG52YXIgdG1wbEF0dHJIYW5kbGVyID0gcmVxdWlyZSgnLi90bXBsQXR0ckhhbmRsZXInKVxyXG52YXIgcHJvY2Vzc0V2ZW50ID0gcmVxdWlyZSgnLi9wcm9jZXNzRXZlbnQnKVxyXG52YXIgdXBkYXRlRWxlbSA9IHJlcXVpcmUoJy4vZWxlbWVudFV0aWxzJykudXBkYXRlRWxlbVxyXG52YXIgc2VsZWN0b3IgPSByZXF1aXJlKCcuL3V0aWxzJykuc2VsZWN0b3JcclxudmFyIGdldElkID0gcmVxdWlyZSgnLi91dGlscycpLmdldElkXHJcbnZhciBnZW5UZW1wbGF0ZSA9IHJlcXVpcmUoJy4vZ2VuVGVtcGxhdGUnKVxyXG5cclxudmFyIHVwZGF0ZUNvbnRleHQgPSBmdW5jdGlvbiAoKSB7XHJcbiAgdmFyIHNlbGYgPSB0aGlzXHJcbiAgdmFyIGtleSA9IFtdLnNoaWZ0LmNhbGwoYXJndW1lbnRzKVxyXG4gIHZhciBvYmogPSBbXS5zaGlmdC5jYWxsKGFyZ3VtZW50cylcclxuXHJcbiAgT2JqZWN0LmtleXModGhpcy5iYXNlKS5tYXAoZnVuY3Rpb24gKGhhbmRsZXJLZXkpIHtcclxuICAgIHZhciB0bXBsQmFzZSA9IHNlbGYuYmFzZVtoYW5kbGVyS2V5XS50ZW1wbGF0ZVxyXG4gICAgaWYgKHRtcGxCYXNlKSB7XHJcbiAgICAgIHZhciBoYXNUbXBsID0gdG1wbEJhc2UubWF0Y2goJ3t7JyArIGtleSArICd9fScpXHJcbiAgICAgIGlmIChoYXNUbXBsICYmIGhhc1RtcGwubGVuZ3RoKSB7XHJcbiAgICAgICAgT2JqZWN0LmFzc2lnbihzZWxmLCBvYmopXHJcbiAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICB2YXIgc3R5bGVCYXNlID0gc2VsZi5iYXNlW2hhbmRsZXJLZXldLnN0eWxlXHJcbiAgICBpZiAoc3R5bGVCYXNlKSB7XHJcbiAgICAgIE9iamVjdC5rZXlzKHN0eWxlQmFzZSkubWFwKGZ1bmN0aW9uIChzdHlsZSkge1xyXG4gICAgICAgIHZhciBoYXNTdHlsZUF0dHIgPSBzdHlsZUJhc2Vbc3R5bGVdLm1hdGNoKCd7eycgKyBrZXkgKyAnfX0nKVxyXG4gICAgICAgIGlmIChoYXNTdHlsZUF0dHIpIE9iamVjdC5hc3NpZ24oc2VsZiwgb2JqKVxyXG4gICAgICB9KVxyXG4gICAgfVxyXG5cclxuICAgIHZhciBpZCA9IHNlbGYuYmFzZVtoYW5kbGVyS2V5XVsna2VldC1pZCddXHJcbiAgICB2YXIgZWxlID0gc2VsZWN0b3IoaWQpXHJcbiAgICB2YXIgbmV3RWxlbVxyXG5cclxuICAgIGlmIChzZWxmLmhhc093blByb3BlcnR5KGtleSkpIHNlbGZba2V5XSA9IG9ialtrZXldXHJcblxyXG4gICAgdmFyIGFyZ3MgPSBbXS5zbGljZS5jYWxsKGFyZ3VtZW50cylcclxuXHJcbiAgICBuZXdFbGVtID0gZ2VuRWxlbWVudC5hcHBseShzZWxmLCBbc2VsZi5iYXNlW2hhbmRsZXJLZXldXS5jb25jYXQoYXJncykpXHJcblxyXG4gICAgdXBkYXRlRWxlbShlbGUsIG5ld0VsZW0pXHJcbiAgfSlcclxufVxyXG5cclxudmFyIGFyclByb3RvVXBkYXRlID0gZnVuY3Rpb24gKGluZGV4LCB2YWx1ZSkge1xyXG4gIHZhciBlbGUgPSBnZXRJZCh0aGlzLmVsKVxyXG4gIHZhciBjaGlsZCA9IGVsZS5jaGlsZE5vZGVzW2luZGV4XVxyXG4gIGlmIChjaGlsZCkge1xyXG4gICAgdmFyIHJlcGxhY2UgPSBnZW5UZW1wbGF0ZS5jYWxsKHRoaXMsIHZhbHVlKVxyXG4gICAgdXBkYXRlRWxlbShjaGlsZCwgcmVwbGFjZSlcclxuICB9IGVsc2Uge1xyXG4gICAgZWxlLmFwcGVuZENoaWxkKGdlblRlbXBsYXRlLmNhbGwodGhpcywgdmFsdWUpKVxyXG4gIH1cclxufVxyXG5cclxudmFyIHByb3h5ID0gZnVuY3Rpb24gKCkge1xyXG4gIHZhciBzZWxmID0gdGhpc1xyXG4gIHZhciB3YXRjaE9iamVjdCA9IGZ1bmN0aW9uIChvYmopIHtcclxuICAgIHJldHVybiBuZXcgUHJveHkob2JqLCB7XHJcbiAgICAgIHNldDogZnVuY3Rpb24gKHRhcmdldCwga2V5LCB2YWx1ZSkge1xyXG4gICAgICAgIHZhciBvYmogPSB7fVxyXG4gICAgICAgIG9ialtrZXldID0gdmFsdWVcclxuICAgICAgICB2YXIgYXJncyA9IFtdLnNsaWNlLmNhbGwoYXJndW1lbnRzKVxyXG4gICAgICAgIGFyZ3MudW5zaGlmdChvYmopXHJcbiAgICAgICAgYXJncy51bnNoaWZ0KGtleSlcclxuICAgICAgICB1cGRhdGVDb250ZXh0LmFwcGx5KHNlbGYsIGFyZ3MpXHJcbiAgICAgICAgdGFyZ2V0W2tleV0gPSB2YWx1ZVxyXG4gICAgICAgIC8vIGlnbm9yZSBUeXBlRXJyb3IgaW4gc3RyaWN0IG1vZGVcclxuICAgICAgICByZXR1cm4gdHJ1ZVxyXG4gICAgICB9XHJcbiAgICB9KVxyXG4gIH1cclxuICByZXR1cm4gd2F0Y2hPYmplY3Qoc2VsZilcclxufVxyXG5cclxudmFyIHByb3h5TGlzdCA9IGZ1bmN0aW9uIChsaXN0KSB7XHJcbiAgdmFyIHNlbGYgPSB0aGlzXHJcbiAgdmFyIHdhdGNoT2JqZWN0ID0gZnVuY3Rpb24gKG9iaikge1xyXG4gICAgcmV0dXJuIG5ldyBQcm94eShvYmosIHtcclxuICAgICAgc2V0OiBmdW5jdGlvbiAodGFyZ2V0LCBrZXksIHZhbHVlKSB7XHJcbiAgICAgICAgdmFyIG51bSA9IHBhcnNlSW50KGtleSlcclxuICAgICAgICB2YXIgaW50TnVtID0gTnVtYmVyLmlzSW50ZWdlcihudW0pXHJcbiAgICAgICAgaWYgKGludE51bSkge1xyXG4gICAgICAgICAgYXJyUHJvdG9VcGRhdGUuYXBwbHkoc2VsZiwgW251bSwgdmFsdWVdKVxyXG4gICAgICAgIH1cclxuICAgICAgICB0YXJnZXRba2V5XSA9IHZhbHVlXHJcbiAgICAgICAgLy8gaWdub3JlIFR5cGVFcnJvciBpbiBzdHJpY3QgbW9kZVxyXG4gICAgICAgIHJldHVybiB0cnVlXHJcbiAgICAgIH0sXHJcbiAgICAgIGRlbGV0ZVByb3BlcnR5OiBmdW5jdGlvbiAodGFyZ2V0LCBrZXkpIHtcclxuICAgICAgICAvLyBjb25zb2xlLmxvZyh0YXJnZXRba2V5XSlcclxuICAgICAgICB2YXIgZWxlID0gZ2V0SWQoc2VsZi5lbClcclxuICAgICAgICB2YXIgbnVtID0gcGFyc2VJbnQoa2V5KVxyXG4gICAgICAgIHZhciBjaGlsZCA9IGVsZS5jaGlsZE5vZGVzW251bV1cclxuICAgICAgICBjaGlsZC5yZW1vdmUoKVxyXG4gICAgICAgIC8vIGlnbm9yZSBUeXBlRXJyb3IgaW4gc3RyaWN0IG1vZGVcclxuICAgICAgICByZXR1cm4gdHJ1ZSAvLyB0YXJnZXRba2V5XVxyXG4gICAgICB9XHJcbiAgICB9KVxyXG4gIH1cclxuICByZXR1cm4gd2F0Y2hPYmplY3QobGlzdClcclxufVxyXG5cclxudmFyIGdlbkVsZW1lbnQgPSBmdW5jdGlvbiAoKSB7XHJcbiAgdmFyIGNoaWxkID0gW10uc2hpZnQuY2FsbChhcmd1bWVudHMpXHJcbiAgdmFyIGFyZ3MgPSBbXS5zbGljZS5jYWxsKGFyZ3VtZW50cylcclxuICB2YXIgdGVtcERpdiA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2RpdicpXHJcbiAgdmFyIGNsb25lQ2hpbGQgPSBjb3B5KGNoaWxkKVxyXG4gIGRlbGV0ZSBjbG9uZUNoaWxkLnRlbXBsYXRlXHJcbiAgZGVsZXRlIGNsb25lQ2hpbGQudGFnXHJcbiAgZGVsZXRlIGNsb25lQ2hpbGQuc3R5bGVcclxuICBkZWxldGUgY2xvbmVDaGlsZC5jbGFzc1xyXG4gIC8vIHByb2Nlc3MgdGVtcGxhdGUgaWYgaGFzIGhhbmRsZWJhcnMgdmFsdWVcclxuICB2YXIgdHBsID0gY2hpbGQudGVtcGxhdGUgPyB0bXBsSGFuZGxlci5jYWxsKHRoaXMsIGNoaWxkLnRlbXBsYXRlKSA6IG51bGxcclxuICAvLyBwcm9jZXNzIHN0eWxlcyBpZiBoYXMgaGFuZGxlYmFycyB2YWx1ZVxyXG4gIHZhciBzdHlsZVRwbCA9IHRtcGxTdHlsZXNIYW5kbGVyLmNhbGwodGhpcywgY2hpbGQuc3R5bGUpXHJcbiAgLy8gcHJvY2VzcyBjbGFzc2VzIGlmIGhhcyBoYW5kbGViYXJzIHZhbHVlXHJcbiAgdmFyIGNsYXNzVHBsID0gdG1wbENsYXNzSGFuZGxlci5jYWxsKHRoaXMsIGNoaWxkKVxyXG4gIGlmIChjbGFzc1RwbCkgY2xvbmVDaGlsZC5jbGFzcyA9IGNsYXNzVHBsXHJcbiAgLy8gY3VzdG9tIGF0dHJpYnV0ZXMgaGFuZGxlclxyXG4gIGlmIChhcmdzICYmIGFyZ3MubGVuZ3RoKSB7XHJcbiAgICB0bXBsQXR0ckhhbmRsZXIuYXBwbHkodGhpcywgWyBjbG9uZUNoaWxkIF0uY29uY2F0KGFyZ3MpKVxyXG4gIH1cclxuXHJcbiAgdmFyIHMgPSBjaGlsZC50YWdcclxuICAgID8gdGFnKGNoaWxkLnRhZywgICAgICAgICAgICAvLyBodG1sIHRhZ1xyXG4gICAgICB0cGwgfHwgJycsICAgICAgICAgICAgICAgIC8vIG5vZGVWYWx1ZVxyXG4gICAgICBjbG9uZUNoaWxkLCAgICAgICAgICAgICAgIC8vIGF0dHJpYnV0ZXMgaW5jbHVkaW5nIGNsYXNzZXNcclxuICAgICAgc3R5bGVUcGwgICAgICAgICAgICAgICAgICAvLyBzdHlsZXNcclxuICAgICkgOiBjaGlsZC50ZW1wbGF0ZSAgICAgICAgICAvLyBmYWxsYmFjayBpZiBub24gZXhpc3QsIHJlbmRlciB0aGUgdGVtcGxhdGUgYXMgc3RyaW5nXHJcblxyXG4gIHRlbXBEaXYuaW5uZXJIVE1MID0gc1xyXG4gIGlmIChjaGlsZC50YWcgPT09ICdpbnB1dCcpIHtcclxuICAgIGlmIChjbG9uZUNoaWxkLmNoZWNrZWQpIHtcclxuICAgICAgdGVtcERpdi5jaGlsZE5vZGVzWzBdLmNoZWNrZWQgPSB0cnVlXHJcbiAgICB9IGVsc2Uge1xyXG4gICAgICB0ZW1wRGl2LmNoaWxkTm9kZXNbMF0ucmVtb3ZlQXR0cmlidXRlKCdjaGVja2VkJylcclxuICAgIH1cclxuICB9XHJcblxyXG4gIHZhciBwcm94eVJlcyA9IHByb3h5LmFwcGx5KHRoaXMsIGFyZ3MpXHJcblxyXG4gIHRoaXMuX19wcm94eV9fID0gcHJveHlSZXNcclxuXHJcbiAgcHJvY2Vzc0V2ZW50LmFwcGx5KHRoaXMsIFsgdGVtcERpdiwgcHJveHlSZXMgXSlcclxuICByZXR1cm4gdGVtcERpdi5jaGlsZE5vZGVzWzBdXHJcbn1cclxuXHJcbmV4cG9ydHMucHJveHkgPSBwcm94eVxyXG5leHBvcnRzLnByb3h5TGlzdCA9IHByb3h5TGlzdFxyXG5leHBvcnRzLmdlbkVsZW1lbnQgPSBnZW5FbGVtZW50XHJcbmV4cG9ydHMuYXJyUHJvdG9VcGRhdGUgPSBhcnJQcm90b1VwZGF0ZVxyXG4iLCJ2YXIgcHJvY2Vzc0V2ZW50ID0gcmVxdWlyZSgnLi9wcm9jZXNzRXZlbnQnKVxyXG5cclxudmFyIHRtcGwgPSAnJ1xyXG5cclxuZnVuY3Rpb24gbmV4dCAoaSwgb2JqLCBhcnJQcm9wcywgYXJncykge1xyXG4gIGlmIChpIDwgYXJyUHJvcHMubGVuZ3RoKSB7XHJcbiAgICB2YXIgcmVwID0gYXJyUHJvcHNbaV0ucmVwbGFjZSgve3soW157fV0rKX19L2csICckMScpXHJcbiAgICB0bXBsID0gdG1wbC5yZXBsYWNlKC97eyhbXnt9XSspfX0vLCBvYmpbcmVwXSlcclxuICAgIGlmIChhcmdzICYmIH5hcmdzLmluZGV4T2YocmVwKSAmJiAhb2JqW3JlcF0pIHtcclxuICAgICAgdmFyIHJlID0gbmV3IFJlZ0V4cCgnICcgKyByZXAgKyAnPVwiJyArIG9ialtyZXBdICsgJ1wiJywgJ2cnKVxyXG4gICAgICB0bXBsID0gdG1wbC5yZXBsYWNlKHJlLCAnJylcclxuICAgIH1cclxuICAgIGkrK1xyXG4gICAgbmV4dChpLCBvYmosIGFyclByb3BzLCBhcmdzKVxyXG4gIH1cclxufVxyXG5cclxubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbiAob2JqKSB7XHJcbiAgdmFyIGFyZ3MgPSB0aGlzLmFyZ3NcclxuICB2YXIgYXJyUHJvcHMgPSB0aGlzLmJhc2UudGVtcGxhdGUubWF0Y2goL3t7KFtee31dKyl9fS9nKVxyXG4gIHZhciB0ZW1wRGl2XHJcbiAgdG1wbCA9IHRoaXMuYmFzZS50ZW1wbGF0ZVxyXG4gIG5leHQoMCwgb2JqLCBhcnJQcm9wcywgYXJncylcclxuICB0ZW1wRGl2ID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnZGl2JylcclxuICB0ZW1wRGl2LmlubmVySFRNTCA9IHRtcGxcclxuICB2YXIgaXNldnQgPSAvIGstLy50ZXN0KHRtcGwpXHJcbiAgaWYgKGlzZXZ0KSB7IHByb2Nlc3NFdmVudC5jYWxsKHRoaXMsIHRlbXBEaXYpIH1cclxuICByZXR1cm4gdGVtcERpdi5jaGlsZE5vZGVzWzBdXHJcbn1cclxuIiwidmFyIGdlbkVsZW1lbnQgPSByZXF1aXJlKCcuL2dlbkVsZW1lbnQnKS5nZW5FbGVtZW50XHJcbnZhciBwcm94eSA9IHJlcXVpcmUoJy4vZ2VuRWxlbWVudCcpLnByb3h5XHJcbnZhciB0bXBsSGFuZGxlciA9IHJlcXVpcmUoJy4vdG1wbEhhbmRsZXInKVxyXG52YXIgdG1wbEFycmF5SGFuZGxlciA9IHJlcXVpcmUoJy4vdG1wbEFycmF5SGFuZGxlcicpXHJcbnZhciBwcm9jZXNzRXZlbnQgPSByZXF1aXJlKCcuL3Byb2Nlc3NFdmVudCcpXHJcbnZhciBnZW5JZCA9IHJlcXVpcmUoJy4vdXRpbHMnKS5nZW5JZFxyXG5cclxubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbiAoKSB7XHJcbiAgaWYgKHR5cGVvZiB0aGlzLmJhc2UgIT09ICdvYmplY3QnKSB0aHJvdyBuZXcgRXJyb3IoJ2luc3RhbmNlIGlzIG5vdCBhbiBvYmplY3QnKVxyXG4gIHZhciBzZWxmID0gdGhpc1xyXG4gIHZhciBlbGVtQXJyID0gW11cclxuICB2YXIgYXJncyA9IFtdLnNsaWNlLmNhbGwoYXJndW1lbnRzKVxyXG4gIGlmIChBcnJheS5pc0FycmF5KHRoaXMuYmFzZS5saXN0KSkge1xyXG4gICAgLy8gZG8gYXJyYXkgYmFzZVxyXG4gICAgdmFyIHRwbCA9IHRtcGxBcnJheUhhbmRsZXIuYXBwbHkodGhpcywgYXJncylcclxuICAgIHRwbC50bXBsLm1hcChmdW5jdGlvbiAocHRtcGwpIHtcclxuICAgICAgdmFyIHRlbXBEaXYgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdkaXYnKVxyXG4gICAgICB0ZW1wRGl2LmlubmVySFRNTCA9IHB0bXBsXHJcbiAgICAgIHByb2Nlc3NFdmVudC5hcHBseShzZWxmLCBbIHRlbXBEaXYsIHRwbC5wcm94eVJlcyBdKVxyXG4gICAgICBlbGVtQXJyLnB1c2godGVtcERpdi5jaGlsZE5vZGVzWzBdKVxyXG4gICAgfSlcclxuXHJcbiAgICB0aGlzLmxpc3QgPSB0cGwucHJveHlSZXNcclxuICB9IGVsc2Uge1xyXG4gICAgLy8gZG8gb2JqZWN0IGJhc2VcclxuICAgIE9iamVjdC5rZXlzKHRoaXMuYmFzZSkubWFwKGZ1bmN0aW9uIChrZXkpIHtcclxuICAgICAgdmFyIGNoaWxkID0gc2VsZi5iYXNlW2tleV1cclxuICAgICAgaWYgKGNoaWxkICYmIHR5cGVvZiBjaGlsZCA9PT0gJ29iamVjdCcpIHtcclxuICAgICAgICB2YXIgaWQgPSBnZW5JZCgpXHJcbiAgICAgICAgY2hpbGRbJ2tlZXQtaWQnXSA9IGlkXHJcbiAgICAgICAgc2VsZi5iYXNlW2tleV1bJ2tlZXQtaWQnXSA9IGlkXHJcbiAgICAgICAgdmFyIG5ld0VsZW1lbnQgPSBnZW5FbGVtZW50LmFwcGx5KHNlbGYsIFtjaGlsZF0uY29uY2F0KGFyZ3MpKVxyXG4gICAgICAgIGVsZW1BcnIucHVzaChuZXdFbGVtZW50KVxyXG4gICAgICB9IGVsc2Uge1xyXG4gICAgICAgIHZhciB0cGwgPSB0bXBsSGFuZGxlci5jYWxsKHNlbGYsIGNoaWxkKVxyXG4gICAgICAgIHZhciB0ZW1wRGl2ID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnZGl2JylcclxuICAgICAgICB0ZW1wRGl2LmlubmVySFRNTCA9IHRwbFxyXG4gICAgICAgIHZhciBwcm94eVJlcyA9IHByb3h5LmNhbGwoc2VsZilcclxuICAgICAgICBzZWxmLl9fcHJveHlfXyA9IHByb3h5UmVzXHJcbiAgICAgICAgcHJvY2Vzc0V2ZW50LmFwcGx5KHNlbGYsIFsgdGVtcERpdiwgcHJveHlSZXMgXSlcclxuICAgICAgICBlbGVtQXJyLnB1c2godGVtcERpdi5jaGlsZE5vZGVzWzBdKVxyXG4gICAgICB9XHJcbiAgICB9KVxyXG4gIH1cclxuXHJcbiAgcmV0dXJuIGVsZW1BcnJcclxufVxyXG4iLCJ2YXIgbG9vcENoaWxkcyA9IHJlcXVpcmUoJy4vZWxlbWVudFV0aWxzJykubG9vcENoaWxkc1xyXG5cclxudmFyIG5leHQgPSBmdW5jdGlvbiAoaSwgYywgcmVtLCBwcm94eSkge1xyXG4gIHZhciBoYXNrXHJcbiAgdmFyIGV2dE5hbWVcclxuICB2YXIgZXZ0aGFuZGxlclxyXG4gIHZhciBoYW5kbGVyXHJcbiAgdmFyIGlzSGFuZGxlclxyXG4gIHZhciBhcmd2XHJcbiAgdmFyIHZcclxuICB2YXIgYXR0cyA9IGMuYXR0cmlidXRlc1xyXG5cclxuICBpZiAoaSA8IGF0dHMubGVuZ3RoKSB7XHJcbiAgICBoYXNrID0gL15rLS8udGVzdChhdHRzW2ldLm5vZGVOYW1lKVxyXG4gICAgaWYgKGhhc2spIHtcclxuICAgICAgZXZ0TmFtZSA9IGF0dHNbaV0ubm9kZU5hbWUuc3BsaXQoJy0nKVsxXVxyXG4gICAgICBldnRoYW5kbGVyID0gYXR0c1tpXS5ub2RlVmFsdWVcclxuICAgICAgaGFuZGxlciA9IGV2dGhhbmRsZXIuc3BsaXQoJygnKVxyXG4gICAgICBpc0hhbmRsZXIgPSB0aGlzW2hhbmRsZXJbMF1dXHJcbiAgICAgIGlmICh0eXBlb2YgaXNIYW5kbGVyID09PSAnZnVuY3Rpb24nKSB7XHJcbiAgICAgICAgcmVtLnB1c2goYXR0c1tpXS5ub2RlTmFtZSlcclxuICAgICAgICBhcmd2ID0gW11cclxuICAgICAgICB2ID0gaGFuZGxlclsxXS5zbGljZSgwLCAtMSkuc3BsaXQoJywnKS5maWx0ZXIoZnVuY3Rpb24gKGYpIHsgcmV0dXJuIGYgIT09ICcnIH0pXHJcbiAgICAgICAgaWYgKHYubGVuZ3RoKSB2Lm1hcChmdW5jdGlvbiAodikgeyBhcmd2LnB1c2godikgfSlcclxuICAgICAgICBjLmFkZEV2ZW50TGlzdGVuZXIoZXZ0TmFtZSwgaXNIYW5kbGVyLmJpbmQuYXBwbHkoaXNIYW5kbGVyLmJpbmQocHJveHkpLCBbY10uY29uY2F0KGFyZ3YpKSwgZmFsc2UpXHJcbiAgICAgIH1cclxuICAgIH1cclxuICAgIGkrK1xyXG4gICAgbmV4dC5hcHBseSh0aGlzLCBbIGksIGMsIHJlbSwgcHJveHkgXSlcclxuICB9IGVsc2Uge1xyXG4gICAgcmVtLm1hcChmdW5jdGlvbiAoZikgeyBjLnJlbW92ZUF0dHJpYnV0ZShmKSB9KVxyXG4gIH1cclxufVxyXG5cclxubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbiAoa05vZGUsIHByb3h5KSB7XHJcbiAgdmFyIHNlbGYgPSB0aGlzXHJcbiAgdmFyIGxpc3RLbm9kZUNoaWxkID0gW11cclxuICB2YXIgcmVtID0gW11cclxuICBsb29wQ2hpbGRzKGxpc3RLbm9kZUNoaWxkLCBrTm9kZSlcclxuICBsaXN0S25vZGVDaGlsZC5tYXAoZnVuY3Rpb24gKGMpIHtcclxuICAgIGlmIChjLm5vZGVUeXBlID09PSAxICYmIGMuaGFzQXR0cmlidXRlcygpKSB7XHJcbiAgICAgIG5leHQuYXBwbHkoc2VsZiwgWyAwLCBjLCByZW0sIHByb3h5IF0pXHJcbiAgICB9XHJcbiAgfSlcclxuICBsaXN0S25vZGVDaGlsZCA9IFtdXHJcbn1cclxuIiwiZnVuY3Rpb24ga3RhZyAoKSB7XHJcbiAgdmFyIGFyZ3MgPSBbXS5zbGljZS5jYWxsKGFyZ3VtZW50cylcclxuICB2YXIgYXR0clxyXG4gIHZhciBpZHhcclxuICB2YXIgdGVcclxuICB2YXIgcmV0ID0gWyc8JywgYXJnc1swXSwgJz4nLCBhcmdzWzFdLCAnPC8nLCBhcmdzWzBdLCAnPiddXHJcbiAgaWYgKGFyZ3MubGVuZ3RoID4gMiAmJiB0eXBlb2YgYXJnc1syXSA9PT0gJ29iamVjdCcpIHtcclxuICAgIGZvciAoYXR0ciBpbiBhcmdzWzJdKSB7XHJcbiAgICAgIGlmICh0eXBlb2YgYXJnc1syXVthdHRyXSA9PT0gJ2Jvb2xlYW4nICYmIGFyZ3NbMl1bYXR0cl0pIHtcclxuICAgICAgICByZXQuc3BsaWNlKDIsIDAsICcgJywgYXR0cilcclxuICAgICAgfSBlbHNlIGlmIChhdHRyID09PSAnY2xhc3MnICYmIEFycmF5LmlzQXJyYXkoYXJnc1syXVthdHRyXSkpIHtcclxuICAgICAgICByZXQuc3BsaWNlKDIsIDAsICcgJywgYXR0ciwgJz1cIicsIGFyZ3NbMl1bYXR0cl0uam9pbignICcpLnRyaW0oKSwgJ1wiJylcclxuICAgICAgfSBlbHNlIHtcclxuICAgICAgICByZXQuc3BsaWNlKDIsIDAsICcgJywgYXR0ciwgJz1cIicsIGFyZ3NbMl1bYXR0cl0sICdcIicpXHJcbiAgICAgIH1cclxuICAgIH1cclxuICB9XHJcbiAgaWYgKGFyZ3MubGVuZ3RoID4gMyAmJiB0eXBlb2YgYXJnc1szXSA9PT0gJ29iamVjdCcpIHtcclxuICAgIGlkeCA9IHJldC5pbmRleE9mKCc+JylcclxuICAgIHRlID0gW2lkeCwgMCwgJyBzdHlsZT1cIiddXHJcbiAgICBmb3IgKGF0dHIgaW4gYXJnc1szXSkge1xyXG4gICAgICB0ZS5wdXNoKGF0dHIpXHJcbiAgICAgIHRlLnB1c2goJzonKVxyXG4gICAgICB0ZS5wdXNoKGFyZ3NbM11bYXR0cl0pXHJcbiAgICAgIHRlLnB1c2goJzsnKVxyXG4gICAgfVxyXG4gICAgdGUucHVzaCgnXCInKVxyXG4gICAgcmV0LnNwbGljZS5hcHBseShyZXQsIHRlKVxyXG4gIH1cclxuICByZXR1cm4gcmV0XHJcbn1cclxuXHJcbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24gKCkge1xyXG4gIHJldHVybiBrdGFnLmFwcGx5KG51bGwsIGFyZ3VtZW50cykuam9pbignJylcclxufVxyXG4iLCJ2YXIgcHJveHlMaXN0ID0gcmVxdWlyZSgnLi9nZW5FbGVtZW50JykucHJveHlMaXN0XHJcblxyXG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uICgpIHtcclxuICB2YXIgYXJncyA9IFtdLnNsaWNlLmNhbGwoYXJndW1lbnRzKVxyXG4gIHZhciBzdHIgPSB0aGlzLmJhc2UudGVtcGxhdGVcclxuICAvLyBjbGVhbiB1cCBlczYgYmFja3RpY2sgc3RyaW5nIGluY2x1ZGluZyBsaW5lIHNwYWNpbmdcclxuICBzdHIgPSBzdHIudHJpbSgpLnJlcGxhY2UoL1xccysvZywgJyAnKVxyXG4gIHRoaXMuYmFzZS50ZW1wbGF0ZSA9IHN0clxyXG4gIHZhciBsaXN0ID0gdGhpcy5iYXNlLmxpc3RcclxuICB2YXIgYXJyUHJvcHMgPSBzdHIubWF0Y2goL3t7KFtee31dKyl9fS9nKVxyXG4gIHZhciB0bXBsXHJcbiAgdmFyIHN0ckxpc3QgPSBbXVxyXG4gIGlmIChhcnJQcm9wcyAmJiBhcnJQcm9wcy5sZW5ndGgpIHtcclxuICAgIGxpc3QubWFwKGZ1bmN0aW9uIChyKSB7XHJcbiAgICAgIHRtcGwgPSBzdHJcclxuICAgICAgYXJyUHJvcHMubWFwKGZ1bmN0aW9uIChzKSB7XHJcbiAgICAgICAgdmFyIHJlcCA9IHMucmVwbGFjZSgve3soW157fV0rKX19L2csICckMScpXHJcbiAgICAgICAgdG1wbCA9IHRtcGwucmVwbGFjZSgve3soW157fV0rKX19LywgcltyZXBdKVxyXG4gICAgICAgIGlmIChhcmdzICYmIH5hcmdzLmluZGV4T2YocmVwKSAmJiAhcltyZXBdKSB7XHJcbiAgICAgICAgICB2YXIgcmUgPSBuZXcgUmVnRXhwKCcgJyArIHJlcCArICc9XCInICsgcltyZXBdICsgJ1wiJywgJ2cnKVxyXG4gICAgICAgICAgdG1wbCA9IHRtcGwucmVwbGFjZShyZSwgJycpXHJcbiAgICAgICAgfVxyXG4gICAgICB9KVxyXG4gICAgICBzdHJMaXN0LnB1c2godG1wbClcclxuICAgIH0pXHJcbiAgfVxyXG5cclxuICB2YXIgcHJveHlSZXMgPSBwcm94eUxpc3QuY2FsbCh0aGlzLCBsaXN0KVxyXG5cclxuICByZXR1cm4ge1xyXG4gICAgdG1wbDogc3RyTGlzdCxcclxuICAgIHByb3h5UmVzOiBwcm94eVJlc1xyXG4gIH1cclxufVxyXG4iLCJtb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uICgpIHtcclxuICB2YXIgc2VsZiA9IHRoaXNcclxuICB2YXIgY2xvbmVDaGlsZCA9IFtdLnNoaWZ0LmNhbGwoYXJndW1lbnRzKVxyXG4gIE9iamVjdC5rZXlzKGNsb25lQ2hpbGQpLm1hcChmdW5jdGlvbiAoYykge1xyXG4gICAgdmFyIGhkbCA9IGNsb25lQ2hpbGRbY10ubWF0Y2goL3t7KFtee31dKyl9fS9nKVxyXG4gICAgaWYgKGhkbCAmJiBoZGwubGVuZ3RoKSB7XHJcbiAgICAgIHZhciBzdHIgPSAnJ1xyXG4gICAgICBoZGwubWFwKGZ1bmN0aW9uIChzKSB7XHJcbiAgICAgICAgdmFyIHJlcCA9IHMucmVwbGFjZSgve3soW157fV0rKX19L2csICckMScpXHJcbiAgICAgICAgaWYgKHNlbGZbcmVwXSAhPT0gdW5kZWZpbmVkKSB7XHJcbiAgICAgICAgICBpZiAoc2VsZltyZXBdID09PSBmYWxzZSkge1xyXG4gICAgICAgICAgICBkZWxldGUgY2xvbmVDaGlsZFtjXVxyXG4gICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgc3RyICs9IHNlbGZbcmVwXVxyXG4gICAgICAgICAgICBjbG9uZUNoaWxkW2NdID0gc3RyXHJcbiAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG4gICAgICB9KVxyXG4gICAgfVxyXG4gIH0pXHJcbn1cclxuIiwibW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbiAoY2hpbGQpIHtcclxuICB2YXIgc2VsZiA9IHRoaXNcclxuICBpZiAoY2hpbGQuY2xhc3MpIHtcclxuICAgIHZhciBjID0gY2hpbGQuY2xhc3MubWF0Y2goL3t7KFtee31dKyl9fS9nKVxyXG4gICAgdmFyIGNsYXNzU3RyID0gJydcclxuICAgIGlmIChjICYmIGMubGVuZ3RoKSB7XHJcbiAgICAgIGMubWFwKGZ1bmN0aW9uIChzKSB7XHJcbiAgICAgICAgdmFyIHJlcCA9IHMucmVwbGFjZSgve3soW157fV0rKX19L2csICckMScpXHJcbiAgICAgICAgaWYgKHNlbGZbcmVwXSAhPT0gdW5kZWZpbmVkKSB7XHJcbiAgICAgICAgICBzZWxmW3JlcF0uY3N0b3JlLm1hcChmdW5jdGlvbiAoYykge1xyXG4gICAgICAgICAgICBjbGFzc1N0ciArPSBjICsgJyAnXHJcbiAgICAgICAgICB9KVxyXG4gICAgICAgIH1cclxuICAgICAgfSlcclxuICAgIH1cclxuICAgIHJldHVybiBjbGFzc1N0ci5sZW5ndGggPyBjbGFzc1N0ci50cmltKCkgOiBjaGlsZC5jbGFzc1xyXG4gIH1cclxuICByZXR1cm4gZmFsc2VcclxufVxyXG4iLCJtb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uIChzdHIpIHtcclxuICB2YXIgc2VsZiA9IHRoaXNcclxuICAvLyBjbGVhbiB1cCBlczYgYmFja3RpY2sgc3RyaW5nIGluY2x1ZGluZyBsaW5lIHNwYWNpbmdcclxuICBzdHIgPSBzdHIudHJpbSgpLnJlcGxhY2UoL1xccysvZywgJyAnKVxyXG4gIHZhciBhcnJQcm9wcyA9IHN0ci5tYXRjaCgve3soW157fV0rKX19L2cpXHJcbiAgaWYgKGFyclByb3BzICYmIGFyclByb3BzLmxlbmd0aCkge1xyXG4gICAgYXJyUHJvcHMubWFwKGZ1bmN0aW9uIChzKSB7XHJcbiAgICAgIHZhciByZXAgPSBzLnJlcGxhY2UoL3t7KFtee31dKyl9fS9nLCAnJDEnKVxyXG4gICAgICBpZiAoc2VsZltyZXBdICE9PSB1bmRlZmluZWQpIHtcclxuICAgICAgICBzdHIgPSBzdHIucmVwbGFjZSgve3soW157fV0rKX19Lywgc2VsZltyZXBdKVxyXG4gICAgICB9XHJcbiAgICB9KVxyXG4gIH1cclxuICByZXR1cm4gc3RyXHJcbn1cclxuIiwidmFyIGNvcHkgPSByZXF1aXJlKCcuL2NvcHknKVxyXG5cclxubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbiAoc3R5bGVzKSB7XHJcbiAgdmFyIHNlbGYgPSB0aGlzXHJcbiAgdmFyIGNvcHlTdHlsZXMgPSBjb3B5KHN0eWxlcylcclxuICBpZiAoc3R5bGVzKSB7XHJcbiAgICBPYmplY3Qua2V5cyhjb3B5U3R5bGVzKS5tYXAoZnVuY3Rpb24gKHN0eWxlKSB7XHJcbiAgICAgIHZhciBhcnJQcm9wcyA9IGNvcHlTdHlsZXNbc3R5bGVdLm1hdGNoKC97eyhbXnt9XSspfX0vZylcclxuICAgICAgaWYgKGFyclByb3BzICYmIGFyclByb3BzLmxlbmd0aCkge1xyXG4gICAgICAgIGFyclByb3BzLm1hcChmdW5jdGlvbiAocykge1xyXG4gICAgICAgICAgdmFyIHJlcCA9IHMucmVwbGFjZSgve3soW157fV0rKX19L2csICckMScpXHJcbiAgICAgICAgICBpZiAoc2VsZltyZXBdICE9PSB1bmRlZmluZWQpIHtcclxuICAgICAgICAgICAgY29weVN0eWxlc1tzdHlsZV0gPSBjb3B5U3R5bGVzW3N0eWxlXS5yZXBsYWNlKC97eyhbXnt9XSspfX0vLCBzZWxmW3JlcF0pXHJcbiAgICAgICAgICB9XHJcbiAgICAgICAgfSlcclxuICAgICAgfVxyXG4gICAgfSlcclxuICB9XHJcbiAgcmV0dXJuIGNvcHlTdHlsZXNcclxufVxyXG4iLCJleHBvcnRzLmdldElkID0gZnVuY3Rpb24gKGlkKSB7XHJcbiAgcmV0dXJuIGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKGlkKVxyXG59XHJcblxyXG5leHBvcnRzLmdlbklkID0gZnVuY3Rpb24gKCkge1xyXG4gIHJldHVybiAoTWF0aC5yb3VuZChNYXRoLnJhbmRvbSgpICogMHgxICogMWUxMikpLnRvU3RyaW5nKDMyKVxyXG59XHJcblxyXG5leHBvcnRzLnNlbGVjdG9yID0gZnVuY3Rpb24gKGlkKSB7XHJcbiAgcmV0dXJuIGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3IoJ1trZWV0LWlkPVwiJyArIGlkICsgJ1wiXScpXHJcbn1cclxuIiwiJ3VzZSBzdHJpY3QnXHJcbi8qKlxyXG4gKiBLZWV0anMgdjMuMi44IEFscGhhIHJlbGVhc2U6IGh0dHBzOi8vZ2l0aHViLmNvbS9rZWV0anMva2VldC5qc1xyXG4gKiBNaW5pbWFsaXN0IHZpZXcgbGF5ZXIgZm9yIHRoZSB3ZWJcclxuICpcclxuICogPDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8IEtlZXRqcyA+Pj4+Pj4+Pj4+Pj4+Pj4+Pj4+Pj4+Pj4+Pj4+Pj5cclxuICpcclxuICogQ29weXJpZ2h0IDIwMTgsIFNoYWhydWwgTml6YW0gU2VsYW1hdFxyXG4gKiBSZWxlYXNlZCB1bmRlciB0aGUgTUlUIExpY2Vuc2UuXHJcbiAqL1xyXG5cclxudmFyIGdldElkID0gcmVxdWlyZSgnLi9jb21wb25lbnRzL3V0aWxzJykuZ2V0SWRcclxudmFyIHNlbGVjdG9yID0gcmVxdWlyZSgnLi9jb21wb25lbnRzL3V0aWxzJykuc2VsZWN0b3JcclxudmFyIHBhcnNlU3RyID0gcmVxdWlyZSgnLi9jb21wb25lbnRzL3BhcnNlU3RyJylcclxuXHJcbnZhciBuZXh0ID0gZnVuY3Rpb24gKGksIGVsZSwgZWxzKSB7XHJcbiAgdmFyIHNlbGYgPSB0aGlzXHJcbiAgaWYgKGkgPCBlbHMubGVuZ3RoKSB7XHJcbiAgICBpZiAoIWVsZS5jaGlsZE5vZGVzW2ldKSB7IGVsZS5hcHBlbmRDaGlsZChlbHNbaV0pIH1cclxuICAgIGkrK1xyXG4gICAgbmV4dC5hcHBseSh0aGlzLCBbIGksIGVsZSwgZWxzIF0pXHJcbiAgfSBlbHNlIHtcclxuICAgIC8vIGJpbmQgcHJveHkgdG8gY29tcG9uZW50IG1ldGhvZHNcclxuICAgIE9iamVjdC5nZXRPd25Qcm9wZXJ0eU5hbWVzKE9iamVjdC5nZXRQcm90b3R5cGVPZih0aGlzKSlcclxuICAgICAgLmZpbHRlcihmdW5jdGlvbiAoZm4pIHsgcmV0dXJuIGZuICE9PSAnY29uc3RydWN0b3InIH0pXHJcbiAgICAgIC5tYXAoZnVuY3Rpb24gKGZuKSB7XHJcbiAgICAgICAgc2VsZltmbl0gPSBzZWxmW2ZuXS5iaW5kKHNlbGYuX19wcm94eV9fKVxyXG4gICAgICB9KVxyXG5cclxuICAgIC8vIGNvbXBvbmVudCBsaWZlQ3ljbGUgYWZ0ZXIgbW91bnRpbmdcclxuICAgIGlmICh0aGlzLmNvbXBvbmVudERpZE1vdW50ICYmIHR5cGVvZiB0aGlzLmNvbXBvbmVudERpZE1vdW50ID09PSAnZnVuY3Rpb24nKSB7XHJcbiAgICAgIHRoaXMuY29tcG9uZW50RGlkTW91bnQoKVxyXG4gICAgfVxyXG5cclxuICAgIHZhciB3YXRjaE9iamVjdCA9IGZ1bmN0aW9uIChvYmopIHtcclxuICAgICAgcmV0dXJuIG5ldyBQcm94eShvYmosIHtcclxuICAgICAgICBzZXQ6IGZ1bmN0aW9uICh0YXJnZXQsIGtleSwgdmFsdWUpIHtcclxuICAgICAgICAgIHRhcmdldFtrZXldID0gdmFsdWVcclxuICAgICAgICAgIHNlbGYuYmFzZVtrZXldID0gdGFyZ2V0W2tleV1cclxuICAgICAgICAgIHNlbGYucmVuZGVyKClcclxuICAgICAgICAgIHJldHVybiB0cnVlXHJcbiAgICAgICAgfSxcclxuICAgICAgICBkZWxldGVQcm9wZXJ0eTogZnVuY3Rpb24gKHRhcmdldCwga2V5KSB7XHJcbiAgICAgICAgICB2YXIgaWQgPSB0YXJnZXRba2V5XVsna2VldC1pZCddXHJcbiAgICAgICAgICB2YXIgZWwgPSBzZWxlY3RvcihpZClcclxuICAgICAgICAgIGlmIChlbCkgZWwucmVtb3ZlKClcclxuICAgICAgICAgIHJldHVybiB0cnVlXHJcbiAgICAgICAgfVxyXG4gICAgICB9KVxyXG4gICAgfVxyXG4gICAgdGhpcy5iYXNlUHJveHkgPSB3YXRjaE9iamVjdCh0aGlzLmJhc2UpXHJcbiAgfVxyXG59XHJcblxyXG5mdW5jdGlvbiBLZWV0ICgpIHtcclxuICB0aGlzLmJhc2UgPSB7fVxyXG4gIE9iamVjdC5kZWZpbmVQcm9wZXJ0eSh0aGlzLCAnX19wcm94eV9fJywge1xyXG4gICAgZW51bWVyYWJsZTogZmFsc2UsXHJcbiAgICB3cml0YWJsZTogdHJ1ZVxyXG4gIH0pXHJcbn1cclxuXHJcbktlZXQucHJvdG90eXBlLm1vdW50ID0gZnVuY3Rpb24gKGluc3RhbmNlKSB7XHJcbiAgdGhpcy5iYXNlID0gaW5zdGFuY2VcclxuICByZXR1cm4gdGhpc1xyXG59XHJcblxyXG5LZWV0LnByb3RvdHlwZS5saW5rID0gZnVuY3Rpb24gKGlkKSB7XHJcbiAgdGhpcy5lbCA9IGlkXHJcbiAgLy8gY29tcG9uZW50IGxpZmVDeWNsZSBiZWZvcmUgbW91bnRpbmdcclxuICBpZiAodGhpcy5jb21wb25lbnRXaWxsTW91bnQgJiYgdHlwZW9mIHRoaXMuY29tcG9uZW50V2lsbE1vdW50ID09PSAnZnVuY3Rpb24nKSB7XHJcbiAgICB0aGlzLmNvbXBvbmVudFdpbGxNb3VudCgpXHJcbiAgfVxyXG4gIHRoaXMucmVuZGVyKClcclxuICByZXR1cm4gdGhpc1xyXG59XHJcblxyXG5LZWV0LnByb3RvdHlwZS5yZW5kZXIgPSBmdW5jdGlvbiAoZm9yY2UpIHtcclxuICB2YXIgZWxlID0gZ2V0SWQodGhpcy5lbClcclxuICB2YXIgZWxzID0gcGFyc2VTdHIuYXBwbHkodGhpcywgdGhpcy5hcmdzKVxyXG4gIGlmIChlbGUpIHtcclxuICAgIGlmIChmb3JjZSkgZWxlLmlubmVySFRNTCA9ICcnXHJcbiAgICBuZXh0LmFwcGx5KHRoaXMsIFsgMCwgZWxlLCBlbHMgXSlcclxuICB9XHJcbiAgcmV0dXJuIHRoaXNcclxufVxyXG5cclxuS2VldC5wcm90b3R5cGUuY2x1c3RlciA9IGZ1bmN0aW9uICgpIHtcclxuICB2YXIgYXJncyA9IFtdLnNsaWNlLmNhbGwoYXJndW1lbnRzKVxyXG4gIGlmIChhcmdzLmxlbmd0aCA+IDApIHtcclxuICAgIGFyZ3MubWFwKGZ1bmN0aW9uIChmKSB7XHJcbiAgICAgIGlmICh0eXBlb2YgZiA9PT0gJ2Z1bmN0aW9uJykgZigpXHJcbiAgICB9KVxyXG4gIH1cclxufVxyXG5cclxubW9kdWxlLmV4cG9ydHMgPSBLZWV0XHJcbiIsImNvbnN0IEtlZXQgPSByZXF1aXJlKCdrZWV0JylcclxuY29uc3QgeyBjb250YWluZXJJbml0LCBjb250YWluZXIgfSA9IHJlcXVpcmUoJy4vY29udGFpbmVyJylcclxuY29uc3QgeyBpbmZvcm0sIGdldElkIH0gPSByZXF1aXJlKCcuL3V0aWwnKVxyXG5cclxuY29uc3QgeyBmb290ZXIgfSA9IHJlcXVpcmUoJy4vZm9vdGVyJylcclxuY29uc3QgeyBmaWx0ZXJzIH0gPSByZXF1aXJlKCcuL2ZpbHRlcnMnKVxyXG5cclxuY29uc3QgbG9nID0gY29uc29sZS5sb2cuYmluZChjb25zb2xlKVxyXG5cclxuY2xhc3MgQXBwIGV4dGVuZHMgS2VldCB7XHJcbiAgY29uc3RydWN0b3IoKSB7XHJcbiAgICBzdXBlcigpXHJcbiAgICB0aGlzLnBhZ2UgPSAnQWxsJ1xyXG4gIH1cclxuICByb3V0ZVVwZGF0ZSgpIHtcclxuICAgIGlmICh3aW5kb3cubG9jYXRpb24uaGFzaCAhPT0gJycpIHtcclxuICAgICAgdGhpcy51cGRhdGVGaWx0ZXIod2luZG93LmxvY2F0aW9uLmhhc2gpXHJcbiAgICB9IGVsc2Uge1xyXG4gICAgICB0aGlzLnVwZGF0ZUZpbHRlcignIy9hbGwnKVxyXG4gICAgICB3aW5kb3cuaGlzdG9yeS5wdXNoU3RhdGUoe30sIG51bGwsICcjL2FsbCcpXHJcbiAgICB9XHJcblxyXG4gICAgd2luZG93Lm9ucG9wc3RhdGUgPSAoKSA9PiB0aGlzLnVwZGF0ZUZpbHRlcih3aW5kb3cubG9jYXRpb24uaGFzaClcclxuICB9XHJcbiAgdXBkYXRlRmlsdGVyKGhhc2gpIHtcclxuICBcdGxldCBlbCA9IGdldElkKGZpbHRlcnMuZWwpXHJcbiAgXHRpZighZWwpIHJldHVyblxyXG5cclxuICAgIGZpbHRlcnMubGlzdC5tYXAoKGYsIGksIHIpID0+IHtcclxuICAgICAgbGV0IGMgPSB7fVxyXG4gICAgICBjLmNsYXNzTmFtZSA9IGYuaGFzaCA9PT0gaGFzaCA/ICdzZWxlY3RlZCcgOiAnJ1xyXG4gICAgICBpZiAoZi5jbGFzc05hbWUgPT09ICdzZWxlY3RlZCcpIHRoaXMucGFnZSA9IGYubm9kZVZhbHVlXHJcbiAgICAgIHJbaV0gPSBPYmplY3QuYXNzaWduKGYsIGMpXHJcbiAgICB9KVxyXG4gIH1cclxufVxyXG5cclxuY29uc3QgYXBwID0gbmV3IEFwcFxyXG5cclxuY29uc3QgdG9kbyA9IHtcclxuICB0b2RvYXBwOiB7XHJcbiAgICB0YWc6ICdzZWN0aW9uJyxcclxuICAgIGlkOiAndG9kb2FwcCdcclxuICB9LFxyXG4gIGluZm86IHtcclxuICAgIHRhZzogJ2Zvb3RlcicsXHJcbiAgICBpZDogJ2luZm8nLFxyXG4gICAgdGVtcGxhdGU6IGBcclxuICAgICAgPHA+RG91YmxlLWNsaWNrIHRvIGVkaXQgYSB0b2RvPC9wPlxyXG4gICAgICA8cD5DcmVhdGVkIGJ5IDxhIGhyZWY9XCJodHRwczovL2dpdGh1Yi5jb20vc3lhcnVsXCI+U2hhaHJ1bCBOaXphbSBTZWxhbWF0PC9hPjwvcD5cclxuICAgICAgPHA+UGFydCBvZiA8YSBocmVmPVwiaHR0cDovL3RvZG9tdmMuY29tXCI+VG9kb01WQzwvYT48L3A+YFxyXG4gIH1cclxufVxyXG5cclxuYXBwLm1vdW50KHRvZG8pLmxpbmsoJ3RvZG8nKS5jbHVzdGVyKGNvbnRhaW5lckluaXQpXHJcblxyXG5hcHAucm91dGVVcGRhdGUoKVxyXG5cclxubW9kdWxlLmV4cG9ydHMgPSBhcHBcclxuXHJcbnNldFRpbWVvdXQoKCkgPT4ge1xyXG4gIGluZm9ybShjb250YWluZXIsIFsxXSlcclxuICBpbmZvcm0oZm9vdGVyLCBbe2NvbXBsZXRlZDogJ2NvbXBsZXRlZCd9LCB7Y29tcGxldGVkOiAnJ31dKVxyXG4gIGFwcC5yb3V0ZVVwZGF0ZSgpXHJcbn0sIDIwMDApIiwiY29uc3QgS2VldCA9IHJlcXVpcmUoJ2tlZXQnKVxyXG5jb25zdCB7IG1haW4sIG1haW5Jbml0IH0gPSByZXF1aXJlKCcuL21haW4nKVxyXG5jb25zdCB7IGZvb3RlciwgZm9vdGVySW5pdCB9ID0gcmVxdWlyZSgnLi9mb290ZXInKVxyXG5jb25zdCB7IGZpbHRlcnMgfSA9IHJlcXVpcmUoJy4vZmlsdGVycycpXHJcblxyXG5jbGFzcyBDb250YWluZXIgZXh0ZW5kcyBLZWV0IHtcclxuICBjb25zdHJ1Y3Rvcigpe1xyXG4gICAgc3VwZXIoKVxyXG4gICAgdGhpcy5vbkNoYW5nZXMgPSBbXVxyXG4gICAgdGhpcy5nZW4gPSBmYWxzZVxyXG4gICAgdGhpcy5zdWJzY3JpYmUodG9kb3MgPT4ge1xyXG4gICAgICBpZih0b2Rvcy5sZW5ndGggJiYgIXRoaXMuZ2VuKXtcclxuICAgICAgICB0aGlzLmdlbiA9IHRydWVcclxuICAgICAgICB0aGlzLm1vdW50Q2hpbGQoJ21haW4nLCB7IHRhZzogJ3NlY3Rpb24nLCBpZDogJ21haW4nfSwgbWFpbilcclxuICAgICAgICB0aGlzLm1vdW50Q2hpbGQoJ2Zvb3RlcicsIHsgdGFnOiAnZm9vdGVyJywgaWQ6ICdmb290ZXInfSwgZm9vdGVyKVxyXG4gICAgICB9IFxyXG4gICAgICBlbHNlIGlmKCF0b2Rvcy5sZW5ndGggJiYgdGhpcy5nZW4pe1xyXG4gICAgICAgIHRoaXMuZ2VuID0gZmFsc2VcclxuICAgICAgICB0aGlzLnJlbW92ZVRvZG9Db250YWluZXIoKVxyXG4gICAgICB9XHJcbiAgICB9KVxyXG4gIH1cclxuICBjcmVhdGUgKGV2dCkge1xyXG4gICAgaWYoZXZ0LmtleUNvZGUgIT09IDEzKSByZXR1cm5cclxuICAgIHRvZG9MaXN0LmFkZFRvZG8uY2FsbCh0b2RvTGlzdCwgZXZ0LnRhcmdldC52YWx1ZS50cmltKCkpXHJcbiAgICBldnQudGFyZ2V0LnZhbHVlID0gJydcclxuICB9XHJcbiAgbW91bnRDaGlsZChjaGlsZCwgcHJvcCwgY29tcG9uZW50KXtcclxuICAgIHRoaXMuYmFzZVByb3h5W2NoaWxkXSA9IHByb3BcclxuICAgIGNvbXBvbmVudC5yZW5kZXIoKVxyXG4gICAgZmlsdGVycy5yZW5kZXIoKVxyXG4gIH1cclxuICByZW1vdmVUb2RvQ29udGFpbmVyKCl7XHJcbiAgICBkZWxldGUgdGhpcy5iYXNlUHJveHkubWFpblxyXG4gICAgZGVsZXRlIHRoaXMuYmFzZVByb3h5LmZvb3RlclxyXG4gIH1cclxuICBzdWJzY3JpYmUoZm4pIHtcclxuICAgIHRoaXMub25DaGFuZ2VzLnB1c2goZm4pXHJcbiAgfVxyXG59XHJcblxyXG5jb25zdCBjb250YWluZXIgPSBuZXcgQ29udGFpbmVyKClcclxuXHJcbmNvbnN0IHZtb2RlbCA9IHtcclxuICBoZWFkZXI6IHtcclxuICAgIHRhZzogJ2hlYWRlcicsXHJcbiAgICBpZDogJ2hlYWRlcicsXHJcbiAgICB0ZW1wbGF0ZTogYFxyXG4gICAgICA8aDE+dG9kb3M8L2gxPlxyXG4gICAgICA8aW5wdXQgaWQ9XCJuZXctdG9kb1wiIGsta2V5ZG93bj1cImNyZWF0ZSgpXCIgcGxhY2Vob2xkZXI9XCJXaGF0IG5lZWRzIHRvIGJlIGRvbmU/XCIgYXV0b2ZvY3VzPmBcclxuICB9XHJcbn1cclxuXHJcbmV4cG9ydHMuY29udGFpbmVySW5pdCA9ICgpID0+IGNvbnRhaW5lci5tb3VudCh2bW9kZWwpLmxpbmsoJ3RvZG9hcHAnKS5jbHVzdGVyKG1haW5Jbml0LCBmb290ZXJJbml0KVxyXG5cclxuZXhwb3J0cy5jb250YWluZXIgPSBjb250YWluZXIiLCJjb25zdCBLZWV0ID0gcmVxdWlyZSgna2VldCcpXHJcbmNvbnN0IGFwcCA9IHJlcXVpcmUoJy4vYXBwJylcclxuY29uc3QgeyBjYW1lbENhc2UgfSA9IHJlcXVpcmUoJy4vdXRpbCcpXHJcblxyXG5sZXQgZmlsdGVyUGFnZSA9IFsnYWxsJywgJ2FjdGl2ZScsICdjb21wbGV0ZWQnXVxyXG5cclxuY2xhc3MgRmlsdGVycyBleHRlbmRzIEtlZXQge1xyXG4gIHVwZGF0ZVVybCAodXJpKSB7XHJcbiAgICBjb25zb2xlLmxvZyhhcHApXHJcbiAgICAvLyBhcHAudXBkYXRlRmlsdGVyKHVyaSlcclxuICB9XHJcbn1cclxuXHJcbmNvbnN0IGZpbHRlcnMgPSBuZXcgRmlsdGVycygpXHJcblxyXG5jb25zdCB2bW9kZWwgPSB7XHJcbiAgdGVtcGxhdGU6IGBcclxuICAgIDxsaSBrLWNsaWNrPVwidXBkYXRlVXJsKHt7aGFzaH19KVwiPlxyXG4gICAgICA8YSBjbGFzcz1cInt7Y2xhc3NOYW1lfX1cIiBocmVmPVwie3toYXNofX1cIj57e25vZGVWYWx1ZX19PC9hPlxyXG4gICAgPC9saT5gLnRyaW0oKSxcclxuICBsaXN0OiBmaWx0ZXJQYWdlLm1hcChmID0+IHtcclxuICAgIHJldHVybiB7XHJcbiAgICAgIGNsYXNzTmFtZTogJycsXHJcbiAgICAgIGhhc2g6ICcjLycgKyBmLFxyXG4gICAgICBub2RlVmFsdWU6IGNhbWVsQ2FzZShmKVxyXG4gICAgfVxyXG4gIH0pXHJcbn1cclxuXHJcbmNvbnN0IGZpbHRlcnNJbml0ID0gKCkgPT4gZmlsdGVycy5tb3VudCh2bW9kZWwpLmxpbmsoJ2ZpbHRlcnMnKVxyXG5cclxubW9kdWxlLmV4cG9ydHMgPSB7XHJcbiAgZmlsdGVyc0luaXQsXHJcbiAgZmlsdGVyc1xyXG59XHJcbiIsImNvbnN0IEtlZXQgPSByZXF1aXJlKCdrZWV0JylcclxuY29uc3QgeyBmaWx0ZXJzSW5pdCB9ID1yZXF1aXJlKCcuL2ZpbHRlcnMnKVxyXG5cclxuY2xhc3MgRm9vdGVyIGV4dGVuZHMgS2VldCB7XHJcbiAgY29uc3RydWN0b3IgKCkge1xyXG4gICAgc3VwZXIoKVxyXG4gICAgdGhpcy5jb3VudCA9IDBcclxuICAgIHRoaXMucyA9ICcnXHJcbiAgICB0aGlzLmNsZWFyQ29tcGxldGVkRGlzcGxheSA9ICdub25lJ1xyXG5cclxuICAgIHRoaXMub25DaGFuZ2VzID0gW11cclxuICAgIHRoaXMuc3Vic2NyaWJlKHRvZG9zID0+IHtcclxuICAgICAgbGV0IGFjdGl2ZXMgPSB0b2Rvcy5maWx0ZXIoZiA9PiBmLmNvbXBsZXRlZCAhPT0gJ2NvbXBsZXRlZCcpXHJcbiAgICAgIHRoaXMudXBkYXRlQ291bnQoYWN0aXZlcy5sZW5ndGgpXHJcbiAgICAgIHRoaXMudG9nZ2xlQ2xlYXJDb21wbGV0ZShhY3RpdmVzLmxlbmd0aCAhPT0gdG9kb3MubGVuZ3RoID8gdHJ1ZSA6IGZhbHNlKVxyXG4gICAgfSlcclxuICB9XHJcbiAgdG9nZ2xlQ2xlYXJDb21wbGV0ZSAoZGlzcGxheSkge1xyXG4gICAgdGhpcy5jbGVhckNvbXBsZXRlZERpc3BsYXkgPSBkaXNwbGF5IHx8ICdub25lJ1xyXG4gIH1cclxuICB1cGRhdGVDb3VudCAoY291bnQpIHtcclxuICAgIHRoaXMuY291bnQgPSBjb3VudC8vLnRvU3RyaW5nKClcclxuICAgIHRoaXMucyA9IGNvdW50ID09PSAxID8gJycgOiAncydcclxuICB9XHJcbiAgY2xlYXJDb21wbGV0ZWRDbGlja2VkIChldnQpIHtcclxuICAgIGFwcC5jbGVhckNvbXBsZXRlZC5iaW5kKGFwcClcclxuICB9XHJcbiAgc3Vic2NyaWJlKGZuKSB7XHJcbiAgICB0aGlzLm9uQ2hhbmdlcy5wdXNoKGZuKVxyXG4gIH1cclxufVxyXG5cclxuY29uc3QgZm9vdGVyID0gbmV3IEZvb3RlcigpXHJcblxyXG5jb25zdCB2bW9kZWwgPSB7XHJcbiAgdG9kb0NvdW50OiB7XHJcbiAgICB0YWc6ICdzcGFuJyxcclxuICAgIGlkOiAndG9kby1jb3VudCcsXHJcbiAgICB0ZW1wbGF0ZTogYDxzdHJvbmc+e3tjb3VudH19PC9zdHJvbmc+IGl0ZW17e3N9fSBsZWZ0YFxyXG4gIH0sXHJcbiAgZmlsdGVyczoge1xyXG4gICAgdGFnOiAndWwnLFxyXG4gICAgaWQ6ICdmaWx0ZXJzJ1xyXG4gIH0sXHJcbiAgY2xlYXJDb21wbGV0ZWQ6IHtcclxuICAgIHRhZzogJ2J1dHRvbicsXHJcbiAgICBpZDogJ2NsZWFyLWNvbXBsZXRlZCcsXHJcbiAgICBzdHlsZToge1xyXG4gICAgICBkaXNwbGF5OiAne3tjbGVhckNvbXBsZXRlZERpc3BsYXl9fSdcclxuICAgIH0sXHJcbiAgICAnay1jbGljayc6ICdjbGVhckNvbXBsZXRlZENsaWNrZWQoKScsXHJcbiAgICB0ZW1wbGF0ZTogJ0NsZWFyIGNvbXBsZXRlZCdcclxuICB9XHJcbn1cclxuXHJcbmNvbnN0IGZvb3RlckluaXQgPSAoKSA9PiBmb290ZXIubW91bnQodm1vZGVsKS5saW5rKCdmb290ZXInKS5jbHVzdGVyKGZpbHRlcnNJbml0KVxyXG5cclxubW9kdWxlLmV4cG9ydHMgPSB7XHJcbiAgZm9vdGVySW5pdCxcclxuICBmb290ZXJcclxufVxyXG4iLCJjb25zdCBLZWV0ID0gcmVxdWlyZSgna2VldCcpXHJcbi8vaW1wb3J0IHRvZG9MaXN0SW5pdCBmcm9tICcuL3RvZG9MaXN0J1xyXG5cclxuY2xhc3MgTWFpbiBleHRlbmRzIEtlZXQge1xyXG4gIGNvbnN0cnVjdG9yICguLi5hcmdzKSB7XHJcbiAgICBzdXBlcigpXHJcbiAgICB0aGlzLmFyZ3MgPSBhcmdzXHJcbiAgICB0aGlzLmRpc3BsYXkgPSAnbm9uZSdcclxuICAgIHRoaXMuaXNDaGVjayA9IGZhbHNlXHJcblxyXG4gICAgdGhpcy5vbkNoYW5nZXMgPSBbXVxyXG4gICAgdGhpcy5zdWJzY3JpYmUodG9kb3MgPT5cclxuICAgICAgdGhpcy50b2dnbGVEaXNwbGF5KHRvZG9zLmxlbmd0aCA/ICdibG9jaycgOiAnbm9uZScpXHJcbiAgICApXHJcbiAgfVxyXG4gIHRvZ2dsZURpc3BsYXkgKGRpc3BsYXkpIHtcclxuICAgIHRoaXMuZGlzcGxheSA9IGRpc3BsYXlcclxuICB9XHJcbiAgdG9nZ2xlQ2hlY2sgKGNoZWNrKSB7XHJcbiAgICB0aGlzLmlzQ2hlY2sgPSBjaGVjayB8fCBmYWxzZVxyXG4gIH1cclxuICBjb21wbGV0ZUFsbCAoZXZ0KSB7XHJcbiAgICBhcHAuY2hlY2tlZEFsbChldnQpXHJcbiAgfVxyXG4gIHN1YnNjcmliZShmbikge1xyXG4gICAgdGhpcy5vbkNoYW5nZXMucHVzaChmbilcclxuICB9XHJcbn1cclxuXHJcbmNvbnN0IG1haW4gPSBuZXcgTWFpbignY2hlY2tlZCcpXHJcblxyXG5jb25zdCB2bW9kZWwgPSB7XHJcbiAgdG9nZ2xlQWxsOiB7XHJcbiAgICB0YWc6ICdpbnB1dCcsXHJcbiAgICBpZDogJ3RvZ2dsZS1hbGwnLFxyXG4gICAgdHlwZTogJ2NoZWNrYm94JyxcclxuICAgIGNoZWNrZWQ6ICd7e2lzQ2hlY2t9fScsXHJcbiAgICBzdHlsZToge1xyXG4gICAgICBkaXNwbGF5OiAne3tkaXNwbGF5fX0nXHJcbiAgICB9LFxyXG4gICAgJ2stY2xpY2snOiAnY29tcGxldGVBbGwoKSdcclxuXHJcbiAgfSxcclxuICB0b2dnbGVMYWJlbDogYDxsYWJlbCBmb3I9XCJ0b2dnbGUtYWxsXCI+TWFyayBhbGwgYXMgY29tcGxldGU8L2xhYmVsPmAsXHJcbiAgdG9kb0xpc3Q6IHtcclxuICAgIHRhZzogJ3VsJyxcclxuICAgIGlkOiAndG9kby1saXN0J1xyXG4gIH1cclxufVxyXG5cclxuY29uc3QgbWFpbkluaXQgPSAoKSA9PiBtYWluLm1vdW50KHZtb2RlbCkubGluaygnbWFpbicpLy8uY2x1c3Rlcih0b2RvTGlzdEluaXQpXHJcblxyXG5tb2R1bGUuZXhwb3J0cyA9IHtcclxuICBtYWluSW5pdCxcclxuICBtYWluXHJcbn0iLCJleHBvcnRzLmluZm9ybSA9IGZ1bmN0aW9uKGJhc2UsIGlucHV0KSB7XHJcbiAgZm9yICh2YXIgaSA9IGJhc2Uub25DaGFuZ2VzLmxlbmd0aDsgaS0tOykge1xyXG4gICAgYmFzZS5vbkNoYW5nZXNbaV0oaW5wdXQpXHJcbiAgfVxyXG59XHJcblxyXG5leHBvcnRzLnN0b3JlID0gZnVuY3Rpb24obmFtZXNwYWNlLCBkYXRhKSB7XHJcbiAgaWYgKGFyZ3VtZW50cy5sZW5ndGggPiAxKSB7XHJcbiAgICByZXR1cm4gbG9jYWxTdG9yYWdlLnNldEl0ZW0obmFtZXNwYWNlLCBKU09OLnN0cmluZ2lmeShkYXRhKSlcclxuICB9IGVsc2Uge1xyXG4gICAgdmFyIHN0b3JlID0gbG9jYWxTdG9yYWdlLmdldEl0ZW0obmFtZXNwYWNlKVxyXG4gICAgcmV0dXJuIHN0b3JlICYmIEpTT04ucGFyc2Uoc3RvcmUpIHx8IFtdXHJcbiAgfVxyXG59XHJcblxyXG5leHBvcnRzLmNhbWVsQ2FzZSA9IGZ1bmN0aW9uKHMpIHtcclxuICByZXR1cm4gcy5jaGFyQXQoMCkudG9VcHBlckNhc2UoKSArIHMuc2xpY2UoMSlcclxufVxyXG5cclxuZXhwb3J0cy5nZW5JZCA9IGZ1bmN0aW9uKCkge1xyXG4gIHJldHVybiAoTWF0aC5yb3VuZChNYXRoLnJhbmRvbSgpICogMHgxMDAwKSkudG9TdHJpbmcoMzIpXHJcbn1cclxuXHJcbmV4cG9ydHMuZ2V0SWQgPSBmdW5jdGlvbiAoaWQpIHtcclxuICByZXR1cm4gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoaWQpXHJcbn0iXX0=
