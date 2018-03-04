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

var updateContext = function () {
  var self = this
  Object.keys(this.base).map(function (handlerKey) {
    var id = self.base[handlerKey]['keet-id']
    var ele = selector(id)
    if (!ele && typeof self.base[handlerKey] === 'string') {
      ele = document.getElementById(self.el)
    }
    var newElem
    var args = [].slice.call(arguments)
    newElem = genElement.apply(self, [self.base[handlerKey]].concat(args))
    updateElem(ele, newElem)
  })
}

var nextState = function (i, args) {
  var self = this
  if (i < this.__stateList__.length) {
    var state = this.__stateList__[i]
    var value = this[state]
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
    i++
    nextState.apply(this, [ i, args ])
  } else {
    //
  }
}

var setState = function (args) {
  var self = this
  nextState.apply(self, [ 0, args ])
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
    ? tag(child.tag,            // html tag
      tpl || '',                // nodeValue
      cloneChild,               // attributes including classes
      styleTpl                  // styles
    ) : tpl                     // fallback if non exist, render the template as string

  tempDiv.innerHTML = s
  if (child.tag === 'input') {
    if (cloneChild.checked) {
      tempDiv.childNodes[0].checked = true
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

},{"./copy":1,"./elementUtils":2,"./processEvent":6,"./tag":7,"./tmplAttrHandler":8,"./tmplClassHandler":9,"./tmplHandler":10,"./tmplStylesHandler":11,"./utils":12}],4:[function(require,module,exports){
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

},{"./processEvent":6}],5:[function(require,module,exports){
var genElement = require('./genElement').genElement
var setState = require('./genElement').setState
var tmplHandler = require('./tmplHandler')
var processEvent = require('./processEvent')
var genId = require('./utils').genId
var genTemplate = require('./genTemplate')

module.exports = function () {
  if (typeof this.base !== 'object') throw new Error('instance is not an object')
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
        self.__stateList__ = []
        var tpl = tmplHandler.call(self, child, function (state) {
          self.__stateList__ = self.__stateList__.concat(state)
        })
        var tempDiv = document.createElement('div')
        tempDiv.innerHTML = tpl
        setState.call(self, args)
        processEvent.call(self, tempDiv)
        tempDiv.childNodes.forEach(function (c) {
          elemArr.push(c)
        })
      }
    })
  }

  return elemArr
}

},{"./genElement":3,"./genTemplate":4,"./processEvent":6,"./tmplHandler":10,"./utils":12}],6:[function(require,module,exports){
var loopChilds = require('./elementUtils').loopChilds

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

},{"./genElement":3}],9:[function(require,module,exports){
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

},{}],10:[function(require,module,exports){
module.exports = function (str, updateStateList) {
  var self = this
  var arrProps = str.match(/{{([^{}]+)}}/g)
  if (arrProps && arrProps.length) {
    arrProps.map(function (s) {
      var rep = s.replace(/{{([^{}]+)}}/g, '$1')
      if (self[rep] !== undefined) {
        updateStateList(rep)
        str = str.replace(/{{([^{}]+)}}/, self[rep])
      }
    })
  }
  return str
}

},{}],11:[function(require,module,exports){
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

},{"./copy":1}],12:[function(require,module,exports){
exports.getId = function (id) {
  return document.getElementById(id)
}

exports.genId = function () {
  return (Math.round(Math.random() * 0x1 * 1e12)).toString(32)
}

exports.selector = function (id) {
  return document.querySelector('[keet-id="' + id + '"]')
}

},{}],13:[function(require,module,exports){
'use strict'
/**
 * Keetjs v3.4.4 Alpha release: https://github.com/keetjs/keet.js
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
var updateElem = require('./components/elementUtils').updateElem

var next = function (i, ele, els) {
  var self = this
  if (i < els.length) {
    if (!ele.childNodes[i]) ele.appendChild(els[i])
    i++
    next.apply(this, [ i, ele, els ])
  } else {
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
    this.baseProxy = watchObject(this.base)

    // component lifeCycle after mounting
    if (this.componentDidMount && typeof this.componentDidMount === 'function') {
      this.componentDidMount()
    }
  }
}

function Keet () {
  this.base = {}
  Object.defineProperty(this, '__stateList__', {
    enumerable: false,
    writable: true
  })
}

Keet.prototype.mount = function (instance) {
  // Before we begin to parse an instance, do a rundown checks
  // to clean up backtick string which usually has line spacing
  if (typeof instance === 'object') {
    Object.keys(instance).map(function (key) {
      if (typeof instance[key] === 'string') {
        instance[key] = instance[key].trim().replace(/\s+/g, ' ')
      } else if (typeof instance[key] === 'object' && typeof instance[key]['template'] === 'string') {
        instance[key]['template'] = instance[key]['template'].trim().replace(/\s+/g, ' ')
      }
    })
  }
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

Keet.prototype.add = function (obj) {
  // Method to add a new object to component model
  var ele = getId(this.el)
  if (Array.isArray(this.base.model)) {
    obj['keet-id'] = genId()
    this.base.model = this.base.model.concat(obj)
    ele.appendChild(genTemplate.call(this, obj))
  }
}

Keet.prototype.destroy = function (id, attr) {
  // Method to destroy a submodel of a component
  if (Array.isArray(this.base.model)) {
    this.base.model = this.base.model.filter(function (obj, index) {
      if (id === obj[attr]) {
        var node = selector(obj['keet-id'])
        if (node) node.remove()
      } else { return obj }
    })
  }
}

Keet.prototype.update = function (id, attr, newAttr) {
  // Method to update a submodel of a component
  var self = this
  if (Array.isArray(this.base.model)) {
    this.base.model = this.base.model.map(function (obj, idx, model) {
      if (id === obj[attr]) {
        if (newAttr && typeof newAttr === 'object') {
          Object.assign(obj, newAttr)
        }
        var node = selector(obj['keet-id'])
        if (node) updateElem(node, genTemplate.call(self, obj))
      }
      return obj
    })
  }
}

module.exports = Keet

},{"./components/elementUtils":2,"./components/genTemplate":4,"./components/parseStr":5,"./components/utils":12}],14:[function(require,module,exports){
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
    filters.base.model.map(f => {
      let c = {}
      c.className = f.hash === hash ? 'selected' : ''
      if (f.className === 'selected') this.page = f.nodeValue
      filters.update(f.hash, 'hash', c)
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

setTimeout(() => {
  // inform(container, [])
  // inform(footer, [{completed: 'completed'}, {completed: ''}])
  // app.routeUpdate()
}, 4000)
},{"./container":15,"./filters":16,"./footer":17,"./util":19,"keet":13}],15:[function(require,module,exports){
const Keet = require('keet')
const { main, mainInit } = require('./main')
const { footer, footerInit } = require('./footer')
const { filters } = require('./filters')

const log = console.log.bind(console)

class Container extends Keet {
  constructor(){
    super()
    this.onChanges = []
    this.gen = false
    this.subscribe(todos => {
      if(todos.length && !this.gen){
        this.gen = true
        this.mountChild('main', { tag: 'section', id: 'main'})
        this.mountChild('footer', { tag: 'footer', id: 'footer'})
        this.render()
        this.subRender()
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
  }
  subRender() {
    main.render()
    footer.render()
  }
  removeTodoContainer(){
    delete this.baseProxy.main
    delete this.baseProxy.footer
    this.render()
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
},{"./filters":16,"./footer":17,"./main":18,"keet":13}],16:[function(require,module,exports){
const Keet = require('keet')
const app = require('./app')
const { camelCase } = require('./util')

let filterPage = ['all', 'active', 'completed']

class Filters extends Keet {
  updateUrl (uri) {
    // console.log(app)
    // app.updateFilter(uri)
  }
}

const filters = new Filters()

const vmodel = {
  template: `
    <li k-click="updateUrl({{hash}})">
      <a class="{{className}}" href="{{hash}}">{{nodeValue}}</a>
    </li>`.trim(),
  model: filterPage.map((f, i) => {
    return {
      className: '',
      hash: '#/' + f,
      nodeValue: camelCase(f)
    }
  })
}

const filtersInit = () => {
  filters.mount(vmodel).link('filters')
}

module.exports = {
  filtersInit,
  filters
}

},{"./app":14,"./util":19,"keet":13}],17:[function(require,module,exports){
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
      filtersInit()
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

const footerInit = () => footer.mount(vmodel).link('footer')//.cluster(filtersInit)

module.exports = {
  footerInit,
  footer
}

},{"./filters":16,"keet":13}],18:[function(require,module,exports){
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
},{"keet":13}],19:[function(require,module,exports){
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
},{}]},{},[14])
//# sourceMappingURL=data:application/json;charset:utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIkM6L1VzZXJzL2toYWkvQXBwRGF0YS9Sb2FtaW5nL25wbS9ub2RlX21vZHVsZXMvYnJvd3NlcmlmeS9ub2RlX21vZHVsZXMvYnJvd3Nlci1wYWNrL19wcmVsdWRlLmpzIiwibm9kZV9tb2R1bGVzL2tlZXQvY29tcG9uZW50cy9jb3B5LmpzIiwibm9kZV9tb2R1bGVzL2tlZXQvY29tcG9uZW50cy9lbGVtZW50VXRpbHMuanMiLCJub2RlX21vZHVsZXMva2VldC9jb21wb25lbnRzL2dlbkVsZW1lbnQuanMiLCJub2RlX21vZHVsZXMva2VldC9jb21wb25lbnRzL2dlblRlbXBsYXRlLmpzIiwibm9kZV9tb2R1bGVzL2tlZXQvY29tcG9uZW50cy9wYXJzZVN0ci5qcyIsIm5vZGVfbW9kdWxlcy9rZWV0L2NvbXBvbmVudHMvcHJvY2Vzc0V2ZW50LmpzIiwibm9kZV9tb2R1bGVzL2tlZXQvY29tcG9uZW50cy90YWcuanMiLCJub2RlX21vZHVsZXMva2VldC9jb21wb25lbnRzL3RtcGxBdHRySGFuZGxlci5qcyIsIm5vZGVfbW9kdWxlcy9rZWV0L2NvbXBvbmVudHMvdG1wbENsYXNzSGFuZGxlci5qcyIsIm5vZGVfbW9kdWxlcy9rZWV0L2NvbXBvbmVudHMvdG1wbEhhbmRsZXIuanMiLCJub2RlX21vZHVsZXMva2VldC9jb21wb25lbnRzL3RtcGxTdHlsZXNIYW5kbGVyLmpzIiwibm9kZV9tb2R1bGVzL2tlZXQvY29tcG9uZW50cy91dGlscy5qcyIsIm5vZGVfbW9kdWxlcy9rZWV0L2tlZXQuanMiLCJzcmMvYXBwLmpzIiwic3JjL2NvbnRhaW5lci5qcyIsInNyYy9maWx0ZXJzLmpzIiwic3JjL2Zvb3Rlci5qcyIsInNyYy9tYWluLmpzIiwic3JjL3V0aWwuanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7QUNBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNmQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDOURBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQy9HQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDaENBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDcERBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDOUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNuQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3ZCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDcEJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNkQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNyQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ1hBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMzSkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDckVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM5REE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNyQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzlEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3ZEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBIiwiZmlsZSI6ImdlbmVyYXRlZC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzQ29udGVudCI6WyIoZnVuY3Rpb24gZSh0LG4scil7ZnVuY3Rpb24gcyhvLHUpe2lmKCFuW29dKXtpZighdFtvXSl7dmFyIGE9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtpZighdSYmYSlyZXR1cm4gYShvLCEwKTtpZihpKXJldHVybiBpKG8sITApO3ZhciBmPW5ldyBFcnJvcihcIkNhbm5vdCBmaW5kIG1vZHVsZSAnXCIrbytcIidcIik7dGhyb3cgZi5jb2RlPVwiTU9EVUxFX05PVF9GT1VORFwiLGZ9dmFyIGw9bltvXT17ZXhwb3J0czp7fX07dFtvXVswXS5jYWxsKGwuZXhwb3J0cyxmdW5jdGlvbihlKXt2YXIgbj10W29dWzFdW2VdO3JldHVybiBzKG4/bjplKX0sbCxsLmV4cG9ydHMsZSx0LG4scil9cmV0dXJuIG5bb10uZXhwb3J0c312YXIgaT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2Zvcih2YXIgbz0wO288ci5sZW5ndGg7bysrKXMocltvXSk7cmV0dXJuIHN9KSIsIm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24gKGFyZ3YpIHtcclxuICB2YXIgY29wID0gZnVuY3Rpb24gKHYpIHtcclxuICAgIHZhciBvID0ge31cclxuICAgIGlmICh0eXBlb2YgdiAhPT0gJ29iamVjdCcpIHtcclxuICAgICAgby5jb3B5ID0gdlxyXG4gICAgICByZXR1cm4gby5jb3B5XHJcbiAgICB9IGVsc2Uge1xyXG4gICAgICBmb3IgKHZhciBhdHRyIGluIHYpIHtcclxuICAgICAgICBvW2F0dHJdID0gdlthdHRyXVxyXG4gICAgICB9XHJcbiAgICB9XHJcbiAgICByZXR1cm4gb1xyXG4gIH1cclxuICByZXR1cm4gQXJyYXkuaXNBcnJheShhcmd2KSA/IGFyZ3YubWFwKGZ1bmN0aW9uICh2KSB7IHJldHVybiB2IH0pIDogY29wKGFyZ3YpXHJcbn1cclxuIiwiXHJcbnZhciBsb29wQ2hpbGRzID0gZnVuY3Rpb24gKGFyciwgZWxlbSkge1xyXG4gIGlmICghZWxlbSkgcmV0dXJuIGZhbHNlXHJcbiAgZm9yICh2YXIgY2hpbGQgPSBlbGVtLmZpcnN0Q2hpbGQ7IGNoaWxkICE9PSBudWxsOyBjaGlsZCA9IGNoaWxkLm5leHRTaWJsaW5nKSB7XHJcbiAgICBhcnIucHVzaChjaGlsZClcclxuICAgIGlmIChjaGlsZC5oYXNDaGlsZE5vZGVzKCkpIHtcclxuICAgICAgbG9vcENoaWxkcyhhcnIsIGNoaWxkKVxyXG4gICAgfVxyXG4gIH1cclxufVxyXG5cclxuZXhwb3J0cy5sb29wQ2hpbGRzID0gbG9vcENoaWxkc1xyXG5cclxudmFyIG5vZGVVcGRhdGUgPSBmdW5jdGlvbiAobmV3Tm9kZSwgb2xkTm9kZSkge1xyXG4gIGlmICghbmV3Tm9kZSkgcmV0dXJuXHJcbiAgdmFyIG9BdHRyID0gbmV3Tm9kZS5hdHRyaWJ1dGVzXHJcbiAgdmFyIG91dHB1dCA9IHt9XHJcblxyXG4gIGZvciAodmFyIGkgPSBvQXR0ci5sZW5ndGggLSAxOyBpID49IDA7IGktLSkge1xyXG4gICAgb3V0cHV0W29BdHRyW2ldLm5hbWVdID0gb0F0dHJbaV0udmFsdWVcclxuICB9XHJcbiAgZm9yICh2YXIgaUF0dHIgaW4gb3V0cHV0KSB7XHJcbiAgICBpZiAob2xkTm9kZS5hdHRyaWJ1dGVzW2lBdHRyXSAmJiBvbGROb2RlLmF0dHJpYnV0ZXNbaUF0dHJdLm5hbWUgPT09IGlBdHRyICYmIG9sZE5vZGUuYXR0cmlidXRlc1tpQXR0cl0udmFsdWUgIT09IG91dHB1dFtpQXR0cl0pIHtcclxuICAgICAgb2xkTm9kZS5zZXRBdHRyaWJ1dGUoaUF0dHIsIG91dHB1dFtpQXR0cl0pXHJcbiAgICB9XHJcbiAgfVxyXG4gIGlmIChvbGROb2RlLnRleHRDb250ZW50ID09PSAnJyAmJiBuZXdOb2RlLnRleHRDb250ZW50KSB7XHJcbiAgICBvbGROb2RlLnRleHRDb250ZW50ID0gbmV3Tm9kZS50ZXh0Q29udGVudFxyXG4gIH1cclxuICBpZiAob2xkTm9kZS50eXBlID09PSAnY2hlY2tib3gnICYmICFvbGROb2RlLmNoZWNrZWQgJiYgbmV3Tm9kZS5jaGVja2VkKSB7XHJcbiAgICBvbGROb2RlLmNoZWNrZWQgPSB0cnVlXHJcbiAgfVxyXG4gIGlmIChvbGROb2RlLnR5cGUgPT09ICdjaGVja2JveCcgJiYgb2xkTm9kZS5jaGVja2VkICYmICFuZXdOb2RlLmNoZWNrZWQpIHtcclxuICAgIG9sZE5vZGUuY2hlY2tlZCA9IGZhbHNlXHJcbiAgfVxyXG4gIG91dHB1dCA9IHt9XHJcbn1cclxuXHJcbnZhciBub2RlVXBkYXRlSFRNTCA9IGZ1bmN0aW9uIChuZXdOb2RlLCBvbGROb2RlKSB7XHJcbiAgaWYgKCFuZXdOb2RlKSByZXR1cm5cclxuICBpZiAobmV3Tm9kZS5ub2RlVmFsdWUgIT09IG9sZE5vZGUubm9kZVZhbHVlKSB7IG9sZE5vZGUubm9kZVZhbHVlID0gbmV3Tm9kZS5ub2RlVmFsdWUgfVxyXG59XHJcblxyXG5leHBvcnRzLnVwZGF0ZUVsZW0gPSBmdW5jdGlvbiAob2xkRWxlbSwgbmV3RWxlbSkge1xyXG4gIHZhciBvbGRBcnIgPSBbXVxyXG4gIHZhciBuZXdBcnIgPSBbXVxyXG4gIG9sZEFyci5wdXNoKG9sZEVsZW0pXHJcbiAgbmV3QXJyLnB1c2gobmV3RWxlbSlcclxuICBsb29wQ2hpbGRzKG9sZEFyciwgb2xkRWxlbSlcclxuICBsb29wQ2hpbGRzKG5ld0FyciwgbmV3RWxlbSlcclxuICBvbGRBcnIubWFwKGZ1bmN0aW9uIChlbGUsIGlkeCwgYXJyKSB7XHJcbiAgICBpZiAoZWxlICYmIGVsZS5ub2RlVHlwZSA9PT0gMSAmJiBlbGUuaGFzQXR0cmlidXRlcygpKSB7XHJcbiAgICAgIG5vZGVVcGRhdGUobmV3QXJyW2lkeF0sIGVsZSlcclxuICAgIH0gZWxzZSBpZiAoZWxlICYmIGVsZS5ub2RlVHlwZSA9PT0gMykge1xyXG4gICAgICBub2RlVXBkYXRlSFRNTChuZXdBcnJbaWR4XSwgZWxlKVxyXG4gICAgfVxyXG4gICAgaWYgKGlkeCA9PT0gYXJyLmxlbmd0aCAtIDEpIHtcclxuICAgICAgb2xkQXJyLnNwbGljZSgwKVxyXG4gICAgICBuZXdBcnIuc3BsaWNlKDApXHJcbiAgICB9XHJcbiAgfSlcclxufVxyXG4iLCJ2YXIgY29weSA9IHJlcXVpcmUoJy4vY29weScpXHJcbnZhciB0YWcgPSByZXF1aXJlKCcuL3RhZycpXHJcbnZhciB0bXBsSGFuZGxlciA9IHJlcXVpcmUoJy4vdG1wbEhhbmRsZXInKVxyXG52YXIgdG1wbFN0eWxlc0hhbmRsZXIgPSByZXF1aXJlKCcuL3RtcGxTdHlsZXNIYW5kbGVyJylcclxudmFyIHRtcGxDbGFzc0hhbmRsZXIgPSByZXF1aXJlKCcuL3RtcGxDbGFzc0hhbmRsZXInKVxyXG52YXIgdG1wbEF0dHJIYW5kbGVyID0gcmVxdWlyZSgnLi90bXBsQXR0ckhhbmRsZXInKVxyXG52YXIgcHJvY2Vzc0V2ZW50ID0gcmVxdWlyZSgnLi9wcm9jZXNzRXZlbnQnKVxyXG52YXIgdXBkYXRlRWxlbSA9IHJlcXVpcmUoJy4vZWxlbWVudFV0aWxzJykudXBkYXRlRWxlbVxyXG52YXIgc2VsZWN0b3IgPSByZXF1aXJlKCcuL3V0aWxzJykuc2VsZWN0b3JcclxuXHJcbnZhciB1cGRhdGVDb250ZXh0ID0gZnVuY3Rpb24gKCkge1xyXG4gIHZhciBzZWxmID0gdGhpc1xyXG4gIE9iamVjdC5rZXlzKHRoaXMuYmFzZSkubWFwKGZ1bmN0aW9uIChoYW5kbGVyS2V5KSB7XHJcbiAgICB2YXIgaWQgPSBzZWxmLmJhc2VbaGFuZGxlcktleV1bJ2tlZXQtaWQnXVxyXG4gICAgdmFyIGVsZSA9IHNlbGVjdG9yKGlkKVxyXG4gICAgaWYgKCFlbGUgJiYgdHlwZW9mIHNlbGYuYmFzZVtoYW5kbGVyS2V5XSA9PT0gJ3N0cmluZycpIHtcclxuICAgICAgZWxlID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoc2VsZi5lbClcclxuICAgIH1cclxuICAgIHZhciBuZXdFbGVtXHJcbiAgICB2YXIgYXJncyA9IFtdLnNsaWNlLmNhbGwoYXJndW1lbnRzKVxyXG4gICAgbmV3RWxlbSA9IGdlbkVsZW1lbnQuYXBwbHkoc2VsZiwgW3NlbGYuYmFzZVtoYW5kbGVyS2V5XV0uY29uY2F0KGFyZ3MpKVxyXG4gICAgdXBkYXRlRWxlbShlbGUsIG5ld0VsZW0pXHJcbiAgfSlcclxufVxyXG5cclxudmFyIG5leHRTdGF0ZSA9IGZ1bmN0aW9uIChpLCBhcmdzKSB7XHJcbiAgdmFyIHNlbGYgPSB0aGlzXHJcbiAgaWYgKGkgPCB0aGlzLl9fc3RhdGVMaXN0X18ubGVuZ3RoKSB7XHJcbiAgICB2YXIgc3RhdGUgPSB0aGlzLl9fc3RhdGVMaXN0X19baV1cclxuICAgIHZhciB2YWx1ZSA9IHRoaXNbc3RhdGVdXHJcbiAgICBPYmplY3QuZGVmaW5lUHJvcGVydHkodGhpcywgc3RhdGUsIHtcclxuICAgICAgZW51bWVyYWJsZTogZmFsc2UsXHJcbiAgICAgIGNvbmZpZ3VyYWJsZTogdHJ1ZSxcclxuICAgICAgZ2V0OiBmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgcmV0dXJuIHZhbHVlXHJcbiAgICAgIH0sXHJcbiAgICAgIHNldDogZnVuY3Rpb24gKHZhbCkge1xyXG4gICAgICAgIHZhbHVlID0gdmFsXHJcbiAgICAgICAgdXBkYXRlQ29udGV4dC5hcHBseShzZWxmLCBhcmdzKVxyXG4gICAgICB9XHJcbiAgICB9KVxyXG4gICAgaSsrXHJcbiAgICBuZXh0U3RhdGUuYXBwbHkodGhpcywgWyBpLCBhcmdzIF0pXHJcbiAgfSBlbHNlIHtcclxuICAgIC8vXHJcbiAgfVxyXG59XHJcblxyXG52YXIgc2V0U3RhdGUgPSBmdW5jdGlvbiAoYXJncykge1xyXG4gIHZhciBzZWxmID0gdGhpc1xyXG4gIG5leHRTdGF0ZS5hcHBseShzZWxmLCBbIDAsIGFyZ3MgXSlcclxufVxyXG5cclxudmFyIHVwZGF0ZVN0YXRlTGlzdCA9IGZ1bmN0aW9uIChzdGF0ZSkge1xyXG4gIHRoaXMuX19zdGF0ZUxpc3RfXyA9IHRoaXMuX19zdGF0ZUxpc3RfXy5jb25jYXQoc3RhdGUpXHJcbn1cclxuXHJcbnZhciBnZW5FbGVtZW50ID0gZnVuY3Rpb24gKCkge1xyXG4gIHZhciBjaGlsZCA9IFtdLnNoaWZ0LmNhbGwoYXJndW1lbnRzKVxyXG4gIHZhciBhcmdzID0gW10uc2xpY2UuY2FsbChhcmd1bWVudHMpXHJcblxyXG4gIHZhciB0ZW1wRGl2ID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnZGl2JylcclxuICB2YXIgY2xvbmVDaGlsZCA9IGNvcHkoY2hpbGQpXHJcbiAgZGVsZXRlIGNsb25lQ2hpbGQudGVtcGxhdGVcclxuICBkZWxldGUgY2xvbmVDaGlsZC50YWdcclxuICBkZWxldGUgY2xvbmVDaGlsZC5zdHlsZVxyXG4gIGRlbGV0ZSBjbG9uZUNoaWxkLmNsYXNzXHJcbiAgLy8gcHJvY2VzcyB0ZW1wbGF0ZSBpZiBoYXMgaGFuZGxlYmFycyB2YWx1ZVxyXG4gIHRoaXMuX19zdGF0ZUxpc3RfXyA9IFtdXHJcblxyXG4gIHZhciB0cGwgPSBjaGlsZC50ZW1wbGF0ZVxyXG4gICAgPyB0bXBsSGFuZGxlci5jYWxsKHRoaXMsIGNoaWxkLnRlbXBsYXRlLCB1cGRhdGVTdGF0ZUxpc3QuYmluZCh0aGlzKSlcclxuICAgIDogdHlwZW9mIGNoaWxkID09PSAnc3RyaW5nJyA/IHRtcGxIYW5kbGVyLmNhbGwodGhpcywgY2hpbGQsIHVwZGF0ZVN0YXRlTGlzdC5iaW5kKHRoaXMpKSA6IG51bGxcclxuICAvLyBwcm9jZXNzIHN0eWxlcyBpZiBoYXMgaGFuZGxlYmFycyB2YWx1ZVxyXG4gIHZhciBzdHlsZVRwbCA9IHRtcGxTdHlsZXNIYW5kbGVyLmNhbGwodGhpcywgY2hpbGQuc3R5bGUsIHVwZGF0ZVN0YXRlTGlzdC5iaW5kKHRoaXMpKVxyXG4gIC8vIHByb2Nlc3MgY2xhc3NlcyBpZiBoYXMgaGFuZGxlYmFycyB2YWx1ZVxyXG4gIHZhciBjbGFzc1RwbCA9IHRtcGxDbGFzc0hhbmRsZXIuY2FsbCh0aGlzLCBjaGlsZCwgdXBkYXRlU3RhdGVMaXN0LmJpbmQodGhpcykpXHJcbiAgaWYgKGNsYXNzVHBsKSBjbG9uZUNoaWxkLmNsYXNzID0gY2xhc3NUcGxcclxuICAvLyBjdXN0b20gYXR0cmlidXRlcyBoYW5kbGVyXHJcbiAgaWYgKGFyZ3MgJiYgYXJncy5sZW5ndGgpIHtcclxuICAgIHRtcGxBdHRySGFuZGxlci5hcHBseSh0aGlzLCBbIGNsb25lQ2hpbGQgXS5jb25jYXQoYXJncykpXHJcbiAgfVxyXG5cclxuICB2YXIgcyA9IGNoaWxkLnRhZ1xyXG4gICAgPyB0YWcoY2hpbGQudGFnLCAgICAgICAgICAgIC8vIGh0bWwgdGFnXHJcbiAgICAgIHRwbCB8fCAnJywgICAgICAgICAgICAgICAgLy8gbm9kZVZhbHVlXHJcbiAgICAgIGNsb25lQ2hpbGQsICAgICAgICAgICAgICAgLy8gYXR0cmlidXRlcyBpbmNsdWRpbmcgY2xhc3Nlc1xyXG4gICAgICBzdHlsZVRwbCAgICAgICAgICAgICAgICAgIC8vIHN0eWxlc1xyXG4gICAgKSA6IHRwbCAgICAgICAgICAgICAgICAgICAgIC8vIGZhbGxiYWNrIGlmIG5vbiBleGlzdCwgcmVuZGVyIHRoZSB0ZW1wbGF0ZSBhcyBzdHJpbmdcclxuXHJcbiAgdGVtcERpdi5pbm5lckhUTUwgPSBzXHJcbiAgaWYgKGNoaWxkLnRhZyA9PT0gJ2lucHV0Jykge1xyXG4gICAgaWYgKGNsb25lQ2hpbGQuY2hlY2tlZCkge1xyXG4gICAgICB0ZW1wRGl2LmNoaWxkTm9kZXNbMF0uY2hlY2tlZCA9IHRydWVcclxuICAgIH0gZWxzZSB7XHJcbiAgICAgIHRlbXBEaXYuY2hpbGROb2Rlc1swXS5yZW1vdmVBdHRyaWJ1dGUoJ2NoZWNrZWQnKVxyXG4gICAgfVxyXG4gIH1cclxuXHJcbiAgc2V0U3RhdGUuY2FsbCh0aGlzLCBhcmdzKVxyXG5cclxuICBwcm9jZXNzRXZlbnQuY2FsbCh0aGlzLCB0ZW1wRGl2KVxyXG4gIHJldHVybiB0eXBlb2YgY2hpbGQgPT09ICdzdHJpbmcnXHJcbiAgICA/IHRlbXBEaXZcclxuICAgIDogY2hpbGQudGFnID8gdGVtcERpdi5jaGlsZE5vZGVzWzBdXHJcbiAgICA6IHRlbXBEaXZcclxufVxyXG5cclxuZXhwb3J0cy5nZW5FbGVtZW50ID0gZ2VuRWxlbWVudFxyXG5leHBvcnRzLnNldFN0YXRlID0gc2V0U3RhdGVcclxuZXhwb3J0cy51cGRhdGVTdGF0ZUxpc3QgPSB1cGRhdGVTdGF0ZUxpc3RcclxuIiwidmFyIHByb2Nlc3NFdmVudCA9IHJlcXVpcmUoJy4vcHJvY2Vzc0V2ZW50JylcclxuXHJcbnZhciB0bXBsID0gJydcclxuXHJcbmZ1bmN0aW9uIG5leHQgKGksIG9iaiwgYXJyUHJvcHMsIGFyZ3MpIHtcclxuICBpZiAoaSA8IGFyclByb3BzLmxlbmd0aCkge1xyXG4gICAgdmFyIHJlcCA9IGFyclByb3BzW2ldLnJlcGxhY2UoL3t7KFtee31dKyl9fS9nLCAnJDEnKVxyXG4gICAgdG1wbCA9IHRtcGwucmVwbGFjZSgve3soW157fV0rKX19Lywgb2JqW3JlcF0pXHJcbiAgICBpZiAoYXJncyAmJiB+YXJncy5pbmRleE9mKHJlcCkgJiYgIW9ialtyZXBdKSB7XHJcbiAgICAgIHZhciByZSA9IG5ldyBSZWdFeHAoJyAnICsgcmVwICsgJz1cIicgKyBvYmpbcmVwXSArICdcIicsICdnJylcclxuICAgICAgdG1wbCA9IHRtcGwucmVwbGFjZShyZSwgJycpXHJcbiAgICB9XHJcbiAgICBpKytcclxuICAgIG5leHQoaSwgb2JqLCBhcnJQcm9wcywgYXJncylcclxuICB9IGVsc2Uge1xyXG5cclxuICB9XHJcbn1cclxuXHJcbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24gKG9iaikge1xyXG4gIHZhciBhcmdzID0gdGhpcy5hcmdzXHJcbiAgdmFyIGFyclByb3BzID0gdGhpcy5iYXNlLnRlbXBsYXRlLm1hdGNoKC97eyhbXnt9XSspfX0vZylcclxuICB2YXIgdGVtcERpdlxyXG4gIHRtcGwgPSB0aGlzLmJhc2UudGVtcGxhdGVcclxuICBuZXh0KDAsIG9iaiwgYXJyUHJvcHMsIGFyZ3MpXHJcbiAgdGVtcERpdiA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2RpdicpXHJcbiAgdGVtcERpdi5pbm5lckhUTUwgPSB0bXBsXHJcbiAgdmFyIGlzZXZ0ID0gLyBrLS8udGVzdCh0bXBsKVxyXG4gIGlmIChpc2V2dCkgeyBwcm9jZXNzRXZlbnQuY2FsbCh0aGlzLCB0ZW1wRGl2KSB9XHJcbiAgdGVtcERpdi5jaGlsZE5vZGVzWzBdLnNldEF0dHJpYnV0ZSgna2VldC1pZCcsIG9ialsna2VldC1pZCddKVxyXG4gIHJldHVybiB0ZW1wRGl2LmNoaWxkTm9kZXNbMF1cclxufVxyXG4iLCJ2YXIgZ2VuRWxlbWVudCA9IHJlcXVpcmUoJy4vZ2VuRWxlbWVudCcpLmdlbkVsZW1lbnRcclxudmFyIHNldFN0YXRlID0gcmVxdWlyZSgnLi9nZW5FbGVtZW50Jykuc2V0U3RhdGVcclxudmFyIHRtcGxIYW5kbGVyID0gcmVxdWlyZSgnLi90bXBsSGFuZGxlcicpXHJcbnZhciBwcm9jZXNzRXZlbnQgPSByZXF1aXJlKCcuL3Byb2Nlc3NFdmVudCcpXHJcbnZhciBnZW5JZCA9IHJlcXVpcmUoJy4vdXRpbHMnKS5nZW5JZFxyXG52YXIgZ2VuVGVtcGxhdGUgPSByZXF1aXJlKCcuL2dlblRlbXBsYXRlJylcclxuXHJcbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24gKCkge1xyXG4gIGlmICh0eXBlb2YgdGhpcy5iYXNlICE9PSAnb2JqZWN0JykgdGhyb3cgbmV3IEVycm9yKCdpbnN0YW5jZSBpcyBub3QgYW4gb2JqZWN0JylcclxuICB2YXIgc2VsZiA9IHRoaXNcclxuICB2YXIgZWxlbUFyciA9IFtdXHJcbiAgdmFyIGFyZ3MgPSBbXS5zbGljZS5jYWxsKGFyZ3VtZW50cylcclxuICBpZiAoQXJyYXkuaXNBcnJheSh0aGlzLmJhc2UubW9kZWwpKSB7XHJcbiAgICAvLyBkbyBhcnJheSBiYXNlXHJcbiAgICB0aGlzLmJhc2UudGVtcGxhdGUgPSB0aGlzLmJhc2UudGVtcGxhdGUudHJpbSgpLnJlcGxhY2UoL1xccysvZywgJyAnKVxyXG5cclxuICAgIC8vIGdlbmVyYXRlIGlkIGZvciBzZWxlY3RvclxyXG4gICAgdGhpcy5iYXNlLm1vZGVsID0gdGhpcy5iYXNlLm1vZGVsLm1hcChmdW5jdGlvbiAobSkge1xyXG4gICAgICBtWydrZWV0LWlkJ10gPSBnZW5JZCgpXHJcbiAgICAgIHJldHVybiBtXHJcbiAgICB9KVxyXG4gICAgdGhpcy5iYXNlLm1vZGVsLm1hcChmdW5jdGlvbiAobSkge1xyXG4gICAgICBlbGVtQXJyLnB1c2goZ2VuVGVtcGxhdGUuY2FsbChzZWxmLCBtKSlcclxuICAgIH0pXHJcbiAgfSBlbHNlIHtcclxuICAgIC8vIGRvIG9iamVjdCBiYXNlXHJcbiAgICBPYmplY3Qua2V5cyh0aGlzLmJhc2UpLm1hcChmdW5jdGlvbiAoa2V5KSB7XHJcbiAgICAgIHZhciBjaGlsZCA9IHNlbGYuYmFzZVtrZXldXHJcbiAgICAgIGlmIChjaGlsZCAmJiB0eXBlb2YgY2hpbGQgPT09ICdvYmplY3QnKSB7XHJcbiAgICAgICAgdmFyIGlkID0gZ2VuSWQoKVxyXG4gICAgICAgIGNoaWxkWydrZWV0LWlkJ10gPSBpZFxyXG4gICAgICAgIHNlbGYuYmFzZVtrZXldWydrZWV0LWlkJ10gPSBpZFxyXG4gICAgICAgIHZhciBuZXdFbGVtZW50ID0gZ2VuRWxlbWVudC5hcHBseShzZWxmLCBbY2hpbGRdLmNvbmNhdChhcmdzKSlcclxuICAgICAgICBlbGVtQXJyLnB1c2gobmV3RWxlbWVudClcclxuICAgICAgfSBlbHNlIHtcclxuICAgICAgICBzZWxmLl9fc3RhdGVMaXN0X18gPSBbXVxyXG4gICAgICAgIHZhciB0cGwgPSB0bXBsSGFuZGxlci5jYWxsKHNlbGYsIGNoaWxkLCBmdW5jdGlvbiAoc3RhdGUpIHtcclxuICAgICAgICAgIHNlbGYuX19zdGF0ZUxpc3RfXyA9IHNlbGYuX19zdGF0ZUxpc3RfXy5jb25jYXQoc3RhdGUpXHJcbiAgICAgICAgfSlcclxuICAgICAgICB2YXIgdGVtcERpdiA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2RpdicpXHJcbiAgICAgICAgdGVtcERpdi5pbm5lckhUTUwgPSB0cGxcclxuICAgICAgICBzZXRTdGF0ZS5jYWxsKHNlbGYsIGFyZ3MpXHJcbiAgICAgICAgcHJvY2Vzc0V2ZW50LmNhbGwoc2VsZiwgdGVtcERpdilcclxuICAgICAgICB0ZW1wRGl2LmNoaWxkTm9kZXMuZm9yRWFjaChmdW5jdGlvbiAoYykge1xyXG4gICAgICAgICAgZWxlbUFyci5wdXNoKGMpXHJcbiAgICAgICAgfSlcclxuICAgICAgfVxyXG4gICAgfSlcclxuICB9XHJcblxyXG4gIHJldHVybiBlbGVtQXJyXHJcbn1cclxuIiwidmFyIGxvb3BDaGlsZHMgPSByZXF1aXJlKCcuL2VsZW1lbnRVdGlscycpLmxvb3BDaGlsZHNcclxuXHJcbnZhciBuZXh0ID0gZnVuY3Rpb24gKGksIGMsIHJlbSkge1xyXG4gIHZhciBoYXNrXHJcbiAgdmFyIGV2dE5hbWVcclxuICB2YXIgZXZ0aGFuZGxlclxyXG4gIHZhciBoYW5kbGVyXHJcbiAgdmFyIGlzSGFuZGxlclxyXG4gIHZhciBhcmd2XHJcbiAgdmFyIHZcclxuICB2YXIgYXR0cyA9IGMuYXR0cmlidXRlc1xyXG5cclxuICBpZiAoaSA8IGF0dHMubGVuZ3RoKSB7XHJcbiAgICBoYXNrID0gL15rLS8udGVzdChhdHRzW2ldLm5vZGVOYW1lKVxyXG4gICAgaWYgKGhhc2spIHtcclxuICAgICAgZXZ0TmFtZSA9IGF0dHNbaV0ubm9kZU5hbWUuc3BsaXQoJy0nKVsxXVxyXG4gICAgICBldnRoYW5kbGVyID0gYXR0c1tpXS5ub2RlVmFsdWVcclxuICAgICAgaGFuZGxlciA9IGV2dGhhbmRsZXIuc3BsaXQoJygnKVxyXG4gICAgICBpc0hhbmRsZXIgPSB0aGlzW2hhbmRsZXJbMF1dXHJcbiAgICAgIGlmICh0eXBlb2YgaXNIYW5kbGVyID09PSAnZnVuY3Rpb24nKSB7XHJcbiAgICAgICAgcmVtLnB1c2goYXR0c1tpXS5ub2RlTmFtZSlcclxuICAgICAgICBhcmd2ID0gW11cclxuICAgICAgICB2ID0gaGFuZGxlclsxXS5zbGljZSgwLCAtMSkuc3BsaXQoJywnKS5maWx0ZXIoZnVuY3Rpb24gKGYpIHsgcmV0dXJuIGYgIT09ICcnIH0pXHJcbiAgICAgICAgaWYgKHYubGVuZ3RoKSB2Lm1hcChmdW5jdGlvbiAodikgeyBhcmd2LnB1c2godikgfSlcclxuICAgICAgICBjLmFkZEV2ZW50TGlzdGVuZXIoZXZ0TmFtZSwgaXNIYW5kbGVyLmJpbmQuYXBwbHkoaXNIYW5kbGVyLmJpbmQodGhpcyksIFtjXS5jb25jYXQoYXJndikpLCBmYWxzZSlcclxuICAgICAgfVxyXG4gICAgfVxyXG4gICAgaSsrXHJcbiAgICBuZXh0LmFwcGx5KHRoaXMsIFsgaSwgYywgcmVtIF0pXHJcbiAgfSBlbHNlIHtcclxuICAgIHJlbS5tYXAoZnVuY3Rpb24gKGYpIHsgYy5yZW1vdmVBdHRyaWJ1dGUoZikgfSlcclxuICB9XHJcbn1cclxuXHJcbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24gKGtOb2RlKSB7XHJcbiAgdmFyIHNlbGYgPSB0aGlzXHJcbiAgdmFyIGxpc3RLbm9kZUNoaWxkID0gW11cclxuICB2YXIgcmVtID0gW11cclxuICBsb29wQ2hpbGRzKGxpc3RLbm9kZUNoaWxkLCBrTm9kZSlcclxuICBsaXN0S25vZGVDaGlsZC5tYXAoZnVuY3Rpb24gKGMpIHtcclxuICAgIGlmIChjLm5vZGVUeXBlID09PSAxICYmIGMuaGFzQXR0cmlidXRlcygpKSB7XHJcbiAgICAgIG5leHQuYXBwbHkoc2VsZiwgWyAwLCBjLCByZW0gXSlcclxuICAgIH1cclxuICB9KVxyXG4gIGxpc3RLbm9kZUNoaWxkID0gW11cclxufVxyXG4iLCJmdW5jdGlvbiBrdGFnICgpIHtcclxuICB2YXIgYXJncyA9IFtdLnNsaWNlLmNhbGwoYXJndW1lbnRzKVxyXG4gIHZhciBhdHRyXHJcbiAgdmFyIGlkeFxyXG4gIHZhciB0ZVxyXG4gIHZhciByZXQgPSBbJzwnLCBhcmdzWzBdLCAnPicsIGFyZ3NbMV0sICc8LycsIGFyZ3NbMF0sICc+J11cclxuICBpZiAoYXJncy5sZW5ndGggPiAyICYmIHR5cGVvZiBhcmdzWzJdID09PSAnb2JqZWN0Jykge1xyXG4gICAgZm9yIChhdHRyIGluIGFyZ3NbMl0pIHtcclxuICAgICAgaWYgKHR5cGVvZiBhcmdzWzJdW2F0dHJdID09PSAnYm9vbGVhbicgJiYgYXJnc1syXVthdHRyXSkge1xyXG4gICAgICAgIHJldC5zcGxpY2UoMiwgMCwgJyAnLCBhdHRyKVxyXG4gICAgICB9IGVsc2UgaWYgKGF0dHIgPT09ICdjbGFzcycgJiYgQXJyYXkuaXNBcnJheShhcmdzWzJdW2F0dHJdKSkge1xyXG4gICAgICAgIHJldC5zcGxpY2UoMiwgMCwgJyAnLCBhdHRyLCAnPVwiJywgYXJnc1syXVthdHRyXS5qb2luKCcgJykudHJpbSgpLCAnXCInKVxyXG4gICAgICB9IGVsc2Uge1xyXG4gICAgICAgIHJldC5zcGxpY2UoMiwgMCwgJyAnLCBhdHRyLCAnPVwiJywgYXJnc1syXVthdHRyXSwgJ1wiJylcclxuICAgICAgfVxyXG4gICAgfVxyXG4gIH1cclxuICBpZiAoYXJncy5sZW5ndGggPiAzICYmIHR5cGVvZiBhcmdzWzNdID09PSAnb2JqZWN0Jykge1xyXG4gICAgaWR4ID0gcmV0LmluZGV4T2YoJz4nKVxyXG4gICAgdGUgPSBbaWR4LCAwLCAnIHN0eWxlPVwiJ11cclxuICAgIGZvciAoYXR0ciBpbiBhcmdzWzNdKSB7XHJcbiAgICAgIHRlLnB1c2goYXR0cilcclxuICAgICAgdGUucHVzaCgnOicpXHJcbiAgICAgIHRlLnB1c2goYXJnc1szXVthdHRyXSlcclxuICAgICAgdGUucHVzaCgnOycpXHJcbiAgICB9XHJcbiAgICB0ZS5wdXNoKCdcIicpXHJcbiAgICByZXQuc3BsaWNlLmFwcGx5KHJldCwgdGUpXHJcbiAgfVxyXG4gIHJldHVybiByZXRcclxufVxyXG5cclxubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbiAoKSB7XHJcbiAgcmV0dXJuIGt0YWcuYXBwbHkobnVsbCwgYXJndW1lbnRzKS5qb2luKCcnKVxyXG59XHJcbiIsInZhciBnZW5FbGVtZW50ID0gcmVxdWlyZSgnLi9nZW5FbGVtZW50JylcclxubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbiAoKSB7XHJcbiAgdmFyIHNlbGYgPSB0aGlzXHJcbiAgdmFyIGNsb25lQ2hpbGQgPSBbXS5zaGlmdC5jYWxsKGFyZ3VtZW50cylcclxuICBPYmplY3Qua2V5cyhjbG9uZUNoaWxkKS5tYXAoZnVuY3Rpb24gKGMpIHtcclxuICAgIHZhciBoZGwgPSBjbG9uZUNoaWxkW2NdLm1hdGNoKC97eyhbXnt9XSspfX0vZylcclxuICAgIGlmIChoZGwgJiYgaGRsLmxlbmd0aCkge1xyXG4gICAgICB2YXIgc3RyID0gJydcclxuICAgICAgaGRsLm1hcChmdW5jdGlvbiAocykge1xyXG4gICAgICAgIHZhciByZXAgPSBzLnJlcGxhY2UoL3t7KFtee31dKyl9fS9nLCAnJDEnKVxyXG4gICAgICAgIGlmIChzZWxmW3JlcF0gIT09IHVuZGVmaW5lZCkge1xyXG4gICAgICAgICAgZ2VuRWxlbWVudC51cGRhdGVTdGF0ZUxpc3QuY2FsbChzZWxmLCByZXApXHJcbiAgICAgICAgICBpZiAoc2VsZltyZXBdID09PSBmYWxzZSkge1xyXG4gICAgICAgICAgICBkZWxldGUgY2xvbmVDaGlsZFtjXVxyXG4gICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgc3RyICs9IHNlbGZbcmVwXVxyXG4gICAgICAgICAgICBjbG9uZUNoaWxkW2NdID0gc3RyXHJcbiAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG4gICAgICB9KVxyXG4gICAgfVxyXG4gIH0pXHJcbn1cclxuIiwibW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbiAoY2hpbGQsIHVwZGF0ZVN0YXRlTGlzdCkge1xyXG4gIHZhciBzZWxmID0gdGhpc1xyXG4gIGlmIChjaGlsZC5jbGFzcykge1xyXG4gICAgdmFyIGMgPSBjaGlsZC5jbGFzcy5tYXRjaCgve3soW157fV0rKX19L2cpXHJcbiAgICB2YXIgY2xhc3NTdHIgPSAnJ1xyXG4gICAgaWYgKGMgJiYgYy5sZW5ndGgpIHtcclxuICAgICAgYy5tYXAoZnVuY3Rpb24gKHMpIHtcclxuICAgICAgICB2YXIgcmVwID0gcy5yZXBsYWNlKC97eyhbXnt9XSspfX0vZywgJyQxJylcclxuICAgICAgICBpZiAoc2VsZltyZXBdICE9PSB1bmRlZmluZWQpIHtcclxuICAgICAgICAgIHVwZGF0ZVN0YXRlTGlzdChyZXApXHJcbiAgICAgICAgICBzZWxmW3JlcF0uY3N0b3JlLm1hcChmdW5jdGlvbiAoYykge1xyXG4gICAgICAgICAgICBjbGFzc1N0ciArPSBjICsgJyAnXHJcbiAgICAgICAgICB9KVxyXG4gICAgICAgIH1cclxuICAgICAgfSlcclxuICAgIH1cclxuICAgIHJldHVybiBjbGFzc1N0ci5sZW5ndGggPyBjbGFzc1N0ci50cmltKCkgOiBjaGlsZC5jbGFzc1xyXG4gIH1cclxuICByZXR1cm4gZmFsc2VcclxufVxyXG4iLCJtb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uIChzdHIsIHVwZGF0ZVN0YXRlTGlzdCkge1xyXG4gIHZhciBzZWxmID0gdGhpc1xyXG4gIHZhciBhcnJQcm9wcyA9IHN0ci5tYXRjaCgve3soW157fV0rKX19L2cpXHJcbiAgaWYgKGFyclByb3BzICYmIGFyclByb3BzLmxlbmd0aCkge1xyXG4gICAgYXJyUHJvcHMubWFwKGZ1bmN0aW9uIChzKSB7XHJcbiAgICAgIHZhciByZXAgPSBzLnJlcGxhY2UoL3t7KFtee31dKyl9fS9nLCAnJDEnKVxyXG4gICAgICBpZiAoc2VsZltyZXBdICE9PSB1bmRlZmluZWQpIHtcclxuICAgICAgICB1cGRhdGVTdGF0ZUxpc3QocmVwKVxyXG4gICAgICAgIHN0ciA9IHN0ci5yZXBsYWNlKC97eyhbXnt9XSspfX0vLCBzZWxmW3JlcF0pXHJcbiAgICAgIH1cclxuICAgIH0pXHJcbiAgfVxyXG4gIHJldHVybiBzdHJcclxufVxyXG4iLCJ2YXIgY29weSA9IHJlcXVpcmUoJy4vY29weScpXHJcblxyXG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uIChzdHlsZXMsIHVwZGF0ZVN0YXRlTGlzdCkge1xyXG4gIHZhciBzZWxmID0gdGhpc1xyXG4gIHZhciBjb3B5U3R5bGVzID0gY29weShzdHlsZXMpXHJcbiAgaWYgKHN0eWxlcykge1xyXG4gICAgT2JqZWN0LmtleXMoY29weVN0eWxlcykubWFwKGZ1bmN0aW9uIChzdHlsZSkge1xyXG4gICAgICB2YXIgYXJyUHJvcHMgPSBjb3B5U3R5bGVzW3N0eWxlXS5tYXRjaCgve3soW157fV0rKX19L2cpXHJcbiAgICAgIGlmIChhcnJQcm9wcyAmJiBhcnJQcm9wcy5sZW5ndGgpIHtcclxuICAgICAgICBhcnJQcm9wcy5tYXAoZnVuY3Rpb24gKHMpIHtcclxuICAgICAgICAgIHZhciByZXAgPSBzLnJlcGxhY2UoL3t7KFtee31dKyl9fS9nLCAnJDEnKVxyXG4gICAgICAgICAgaWYgKHNlbGZbcmVwXSAhPT0gdW5kZWZpbmVkKSB7XHJcbiAgICAgICAgICAgIHVwZGF0ZVN0YXRlTGlzdChyZXApXHJcbiAgICAgICAgICAgIGNvcHlTdHlsZXNbc3R5bGVdID0gY29weVN0eWxlc1tzdHlsZV0ucmVwbGFjZSgve3soW157fV0rKX19Lywgc2VsZltyZXBdKVxyXG4gICAgICAgICAgfVxyXG4gICAgICAgIH0pXHJcbiAgICAgIH1cclxuICAgIH0pXHJcbiAgfVxyXG4gIHJldHVybiBjb3B5U3R5bGVzXHJcbn1cclxuIiwiZXhwb3J0cy5nZXRJZCA9IGZ1bmN0aW9uIChpZCkge1xyXG4gIHJldHVybiBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChpZClcclxufVxyXG5cclxuZXhwb3J0cy5nZW5JZCA9IGZ1bmN0aW9uICgpIHtcclxuICByZXR1cm4gKE1hdGgucm91bmQoTWF0aC5yYW5kb20oKSAqIDB4MSAqIDFlMTIpKS50b1N0cmluZygzMilcclxufVxyXG5cclxuZXhwb3J0cy5zZWxlY3RvciA9IGZ1bmN0aW9uIChpZCkge1xyXG4gIHJldHVybiBkb2N1bWVudC5xdWVyeVNlbGVjdG9yKCdba2VldC1pZD1cIicgKyBpZCArICdcIl0nKVxyXG59XHJcbiIsIid1c2Ugc3RyaWN0J1xyXG4vKipcclxuICogS2VldGpzIHYzLjQuNCBBbHBoYSByZWxlYXNlOiBodHRwczovL2dpdGh1Yi5jb20va2VldGpzL2tlZXQuanNcclxuICogTWluaW1hbGlzdCB2aWV3IGxheWVyIGZvciB0aGUgd2ViXHJcbiAqXHJcbiAqIDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PCBLZWV0anMgPj4+Pj4+Pj4+Pj4+Pj4+Pj4+Pj4+Pj4+Pj4+Pj4+XHJcbiAqXHJcbiAqIENvcHlyaWdodCAyMDE4LCBTaGFocnVsIE5pemFtIFNlbGFtYXRcclxuICogUmVsZWFzZWQgdW5kZXIgdGhlIE1JVCBMaWNlbnNlLlxyXG4gKi9cclxuXHJcbnZhciBnZXRJZCA9IHJlcXVpcmUoJy4vY29tcG9uZW50cy91dGlscycpLmdldElkXHJcbnZhciBnZW5JZCA9IHJlcXVpcmUoJy4vY29tcG9uZW50cy91dGlscycpLmdlbklkXHJcbnZhciBzZWxlY3RvciA9IHJlcXVpcmUoJy4vY29tcG9uZW50cy91dGlscycpLnNlbGVjdG9yXHJcbnZhciBwYXJzZVN0ciA9IHJlcXVpcmUoJy4vY29tcG9uZW50cy9wYXJzZVN0cicpXHJcbnZhciBnZW5UZW1wbGF0ZSA9IHJlcXVpcmUoJy4vY29tcG9uZW50cy9nZW5UZW1wbGF0ZScpXHJcbnZhciB1cGRhdGVFbGVtID0gcmVxdWlyZSgnLi9jb21wb25lbnRzL2VsZW1lbnRVdGlscycpLnVwZGF0ZUVsZW1cclxuXHJcbnZhciBuZXh0ID0gZnVuY3Rpb24gKGksIGVsZSwgZWxzKSB7XHJcbiAgdmFyIHNlbGYgPSB0aGlzXHJcbiAgaWYgKGkgPCBlbHMubGVuZ3RoKSB7XHJcbiAgICBpZiAoIWVsZS5jaGlsZE5vZGVzW2ldKSBlbGUuYXBwZW5kQ2hpbGQoZWxzW2ldKVxyXG4gICAgaSsrXHJcbiAgICBuZXh0LmFwcGx5KHRoaXMsIFsgaSwgZWxlLCBlbHMgXSlcclxuICB9IGVsc2Uge1xyXG4gICAgdmFyIHdhdGNoT2JqZWN0ID0gZnVuY3Rpb24gKG9iaikge1xyXG4gICAgICByZXR1cm4gbmV3IFByb3h5KG9iaiwge1xyXG4gICAgICAgIHNldDogZnVuY3Rpb24gKHRhcmdldCwga2V5LCB2YWx1ZSkge1xyXG4gICAgICAgICAgdGFyZ2V0W2tleV0gPSB2YWx1ZVxyXG4gICAgICAgICAgc2VsZi5iYXNlW2tleV0gPSB0YXJnZXRba2V5XVxyXG4gICAgICAgICAgcmV0dXJuIHRydWVcclxuICAgICAgICB9LFxyXG4gICAgICAgIGRlbGV0ZVByb3BlcnR5OiBmdW5jdGlvbiAodGFyZ2V0LCBrZXkpIHtcclxuICAgICAgICAgIHZhciBpZCA9IHRhcmdldFtrZXldWydrZWV0LWlkJ11cclxuICAgICAgICAgIHZhciBlbCA9IHNlbGVjdG9yKGlkKVxyXG4gICAgICAgICAgZWwgJiYgZWwucmVtb3ZlKClcclxuICAgICAgICAgIGRlbGV0ZSBzZWxmLmJhc2Vba2V5XVxyXG4gICAgICAgICAgcmV0dXJuIHRydWVcclxuICAgICAgICB9XHJcbiAgICAgIH0pXHJcbiAgICB9XHJcbiAgICB0aGlzLmJhc2VQcm94eSA9IHdhdGNoT2JqZWN0KHRoaXMuYmFzZSlcclxuXHJcbiAgICAvLyBjb21wb25lbnQgbGlmZUN5Y2xlIGFmdGVyIG1vdW50aW5nXHJcbiAgICBpZiAodGhpcy5jb21wb25lbnREaWRNb3VudCAmJiB0eXBlb2YgdGhpcy5jb21wb25lbnREaWRNb3VudCA9PT0gJ2Z1bmN0aW9uJykge1xyXG4gICAgICB0aGlzLmNvbXBvbmVudERpZE1vdW50KClcclxuICAgIH1cclxuICB9XHJcbn1cclxuXHJcbmZ1bmN0aW9uIEtlZXQgKCkge1xyXG4gIHRoaXMuYmFzZSA9IHt9XHJcbiAgT2JqZWN0LmRlZmluZVByb3BlcnR5KHRoaXMsICdfX3N0YXRlTGlzdF9fJywge1xyXG4gICAgZW51bWVyYWJsZTogZmFsc2UsXHJcbiAgICB3cml0YWJsZTogdHJ1ZVxyXG4gIH0pXHJcbn1cclxuXHJcbktlZXQucHJvdG90eXBlLm1vdW50ID0gZnVuY3Rpb24gKGluc3RhbmNlKSB7XHJcbiAgLy8gQmVmb3JlIHdlIGJlZ2luIHRvIHBhcnNlIGFuIGluc3RhbmNlLCBkbyBhIHJ1bmRvd24gY2hlY2tzXHJcbiAgLy8gdG8gY2xlYW4gdXAgYmFja3RpY2sgc3RyaW5nIHdoaWNoIHVzdWFsbHkgaGFzIGxpbmUgc3BhY2luZ1xyXG4gIGlmICh0eXBlb2YgaW5zdGFuY2UgPT09ICdvYmplY3QnKSB7XHJcbiAgICBPYmplY3Qua2V5cyhpbnN0YW5jZSkubWFwKGZ1bmN0aW9uIChrZXkpIHtcclxuICAgICAgaWYgKHR5cGVvZiBpbnN0YW5jZVtrZXldID09PSAnc3RyaW5nJykge1xyXG4gICAgICAgIGluc3RhbmNlW2tleV0gPSBpbnN0YW5jZVtrZXldLnRyaW0oKS5yZXBsYWNlKC9cXHMrL2csICcgJylcclxuICAgICAgfSBlbHNlIGlmICh0eXBlb2YgaW5zdGFuY2Vba2V5XSA9PT0gJ29iamVjdCcgJiYgdHlwZW9mIGluc3RhbmNlW2tleV1bJ3RlbXBsYXRlJ10gPT09ICdzdHJpbmcnKSB7XHJcbiAgICAgICAgaW5zdGFuY2Vba2V5XVsndGVtcGxhdGUnXSA9IGluc3RhbmNlW2tleV1bJ3RlbXBsYXRlJ10udHJpbSgpLnJlcGxhY2UoL1xccysvZywgJyAnKVxyXG4gICAgICB9XHJcbiAgICB9KVxyXG4gIH1cclxuICB0aGlzLmJhc2UgPSBpbnN0YW5jZVxyXG4gIHJldHVybiB0aGlzXHJcbn1cclxuXHJcbktlZXQucHJvdG90eXBlLmZsdXNoID0gZnVuY3Rpb24gKGluc3RhbmNlKSB7XHJcbiAgLy8gQ3VzdG9tIG1ldGhvZCB0byBjbGVhbiB1cCB0aGUgY29tcG9uZW50IERPTSB0cmVlXHJcbiAgLy8gdXNlZnVsbCBpZiB3ZSBuZWVkIHRvIGRvIGNsZWFuIHVwIHJlcmVuZGVyXHJcbiAgdmFyIGVsZSA9IGdldElkKHRoaXMuZWwpXHJcbiAgaWYgKGVsZSkgZWxlLmlubmVySFRNTCA9ICcnXHJcbiAgcmV0dXJuIHRoaXNcclxufVxyXG5cclxuS2VldC5wcm90b3R5cGUubGluayA9IGZ1bmN0aW9uIChpZCkge1xyXG4gIC8vIFRoZSB0YXJnZXQgRE9NIHdoZXJlIHRoZSByZW5kZXJpbmcgd2lsbCB0b29rIHBsYWNlLlxyXG4gIC8vIFdlIGNvdWxkIGFsc28gYXBwbHkgbGlmZUN5Y2xlIG1ldGhvZCBiZWZvcmUgdGhlXHJcbiAgLy8gcmVuZGVyIGhhcHBlblxyXG4gIHRoaXMuZWwgPSBpZFxyXG4gIGlmICh0aGlzLmNvbXBvbmVudFdpbGxNb3VudCAmJiB0eXBlb2YgdGhpcy5jb21wb25lbnRXaWxsTW91bnQgPT09ICdmdW5jdGlvbicpIHtcclxuICAgIHRoaXMuY29tcG9uZW50V2lsbE1vdW50KClcclxuICB9XHJcbiAgdGhpcy5yZW5kZXIoKVxyXG4gIHJldHVybiB0aGlzXHJcbn1cclxuXHJcbktlZXQucHJvdG90eXBlLnJlbmRlciA9IGZ1bmN0aW9uICgpIHtcclxuICAvLyBSZW5kZXIgdGhpcyBjb21wb25lbnQgdG8gdGhlIHRhcmdldCBET01cclxuICB2YXIgZWxlID0gZ2V0SWQodGhpcy5lbClcclxuICB2YXIgZWxzID0gcGFyc2VTdHIuYXBwbHkodGhpcywgdGhpcy5hcmdzKVxyXG4gIGlmIChlbGUpIHtcclxuICAgIG5leHQuYXBwbHkodGhpcywgWyAwLCBlbGUsIGVscyBdKVxyXG4gIH1cclxuICByZXR1cm4gdGhpc1xyXG59XHJcblxyXG5LZWV0LnByb3RvdHlwZS5jbHVzdGVyID0gZnVuY3Rpb24gKCkge1xyXG4gIC8vIENoYWluIG1ldGhvZCB0byBydW4gZXh0ZXJuYWwgZnVuY3Rpb24ocyksIHRoaXMgYmFzaWNhbGx5IHNlcnZlXHJcbiAgLy8gYXMgaW5pdGlhbGl6ZXIgZm9yIGFsbCBjaGlsZCBjb21wb25lbnRzIHdpdGhpbiB0aGUgaW5zdGFuY2UgdHJlZVxyXG4gIHZhciBhcmdzID0gW10uc2xpY2UuY2FsbChhcmd1bWVudHMpXHJcbiAgaWYgKGFyZ3MubGVuZ3RoID4gMCkge1xyXG4gICAgYXJncy5tYXAoZnVuY3Rpb24gKGYpIHtcclxuICAgICAgaWYgKHR5cGVvZiBmID09PSAnZnVuY3Rpb24nKSBmKClcclxuICAgIH0pXHJcbiAgfVxyXG59XHJcblxyXG5LZWV0LnByb3RvdHlwZS5hZGQgPSBmdW5jdGlvbiAob2JqKSB7XHJcbiAgLy8gTWV0aG9kIHRvIGFkZCBhIG5ldyBvYmplY3QgdG8gY29tcG9uZW50IG1vZGVsXHJcbiAgdmFyIGVsZSA9IGdldElkKHRoaXMuZWwpXHJcbiAgaWYgKEFycmF5LmlzQXJyYXkodGhpcy5iYXNlLm1vZGVsKSkge1xyXG4gICAgb2JqWydrZWV0LWlkJ10gPSBnZW5JZCgpXHJcbiAgICB0aGlzLmJhc2UubW9kZWwgPSB0aGlzLmJhc2UubW9kZWwuY29uY2F0KG9iailcclxuICAgIGVsZS5hcHBlbmRDaGlsZChnZW5UZW1wbGF0ZS5jYWxsKHRoaXMsIG9iaikpXHJcbiAgfVxyXG59XHJcblxyXG5LZWV0LnByb3RvdHlwZS5kZXN0cm95ID0gZnVuY3Rpb24gKGlkLCBhdHRyKSB7XHJcbiAgLy8gTWV0aG9kIHRvIGRlc3Ryb3kgYSBzdWJtb2RlbCBvZiBhIGNvbXBvbmVudFxyXG4gIGlmIChBcnJheS5pc0FycmF5KHRoaXMuYmFzZS5tb2RlbCkpIHtcclxuICAgIHRoaXMuYmFzZS5tb2RlbCA9IHRoaXMuYmFzZS5tb2RlbC5maWx0ZXIoZnVuY3Rpb24gKG9iaiwgaW5kZXgpIHtcclxuICAgICAgaWYgKGlkID09PSBvYmpbYXR0cl0pIHtcclxuICAgICAgICB2YXIgbm9kZSA9IHNlbGVjdG9yKG9ialsna2VldC1pZCddKVxyXG4gICAgICAgIGlmIChub2RlKSBub2RlLnJlbW92ZSgpXHJcbiAgICAgIH0gZWxzZSB7IHJldHVybiBvYmogfVxyXG4gICAgfSlcclxuICB9XHJcbn1cclxuXHJcbktlZXQucHJvdG90eXBlLnVwZGF0ZSA9IGZ1bmN0aW9uIChpZCwgYXR0ciwgbmV3QXR0cikge1xyXG4gIC8vIE1ldGhvZCB0byB1cGRhdGUgYSBzdWJtb2RlbCBvZiBhIGNvbXBvbmVudFxyXG4gIHZhciBzZWxmID0gdGhpc1xyXG4gIGlmIChBcnJheS5pc0FycmF5KHRoaXMuYmFzZS5tb2RlbCkpIHtcclxuICAgIHRoaXMuYmFzZS5tb2RlbCA9IHRoaXMuYmFzZS5tb2RlbC5tYXAoZnVuY3Rpb24gKG9iaiwgaWR4LCBtb2RlbCkge1xyXG4gICAgICBpZiAoaWQgPT09IG9ialthdHRyXSkge1xyXG4gICAgICAgIGlmIChuZXdBdHRyICYmIHR5cGVvZiBuZXdBdHRyID09PSAnb2JqZWN0Jykge1xyXG4gICAgICAgICAgT2JqZWN0LmFzc2lnbihvYmosIG5ld0F0dHIpXHJcbiAgICAgICAgfVxyXG4gICAgICAgIHZhciBub2RlID0gc2VsZWN0b3Iob2JqWydrZWV0LWlkJ10pXHJcbiAgICAgICAgaWYgKG5vZGUpIHVwZGF0ZUVsZW0obm9kZSwgZ2VuVGVtcGxhdGUuY2FsbChzZWxmLCBvYmopKVxyXG4gICAgICB9XHJcbiAgICAgIHJldHVybiBvYmpcclxuICAgIH0pXHJcbiAgfVxyXG59XHJcblxyXG5tb2R1bGUuZXhwb3J0cyA9IEtlZXRcclxuIiwiY29uc3QgS2VldCA9IHJlcXVpcmUoJ2tlZXQnKVxyXG5jb25zdCB7IGNvbnRhaW5lckluaXQsIGNvbnRhaW5lciB9ID0gcmVxdWlyZSgnLi9jb250YWluZXInKVxyXG5jb25zdCB7IGluZm9ybSwgZ2V0SWQgfSA9IHJlcXVpcmUoJy4vdXRpbCcpXHJcblxyXG5jb25zdCB7IGZvb3RlciB9ID0gcmVxdWlyZSgnLi9mb290ZXInKVxyXG5jb25zdCB7IGZpbHRlcnMgfSA9IHJlcXVpcmUoJy4vZmlsdGVycycpXHJcblxyXG5jb25zdCBsb2cgPSBjb25zb2xlLmxvZy5iaW5kKGNvbnNvbGUpXHJcblxyXG5jbGFzcyBBcHAgZXh0ZW5kcyBLZWV0IHtcclxuICBjb25zdHJ1Y3RvcigpIHtcclxuICAgIHN1cGVyKClcclxuICAgIHRoaXMucGFnZSA9ICdBbGwnXHJcbiAgfVxyXG4gIHJvdXRlVXBkYXRlKCkge1xyXG4gICAgaWYgKHdpbmRvdy5sb2NhdGlvbi5oYXNoICE9PSAnJykge1xyXG4gICAgICB0aGlzLnVwZGF0ZUZpbHRlcih3aW5kb3cubG9jYXRpb24uaGFzaClcclxuICAgIH0gZWxzZSB7XHJcbiAgICAgIHRoaXMudXBkYXRlRmlsdGVyKCcjL2FsbCcpXHJcbiAgICAgIHdpbmRvdy5oaXN0b3J5LnB1c2hTdGF0ZSh7fSwgbnVsbCwgJyMvYWxsJylcclxuICAgIH1cclxuXHJcbiAgICB3aW5kb3cub25wb3BzdGF0ZSA9ICgpID0+IHRoaXMudXBkYXRlRmlsdGVyKHdpbmRvdy5sb2NhdGlvbi5oYXNoKVxyXG4gIH1cclxuICB1cGRhdGVGaWx0ZXIoaGFzaCkge1xyXG4gIFx0bGV0IGVsID0gZ2V0SWQoZmlsdGVycy5lbClcclxuICBcdGlmKCFlbCkgcmV0dXJuXHJcbiAgICBmaWx0ZXJzLmJhc2UubW9kZWwubWFwKGYgPT4ge1xyXG4gICAgICBsZXQgYyA9IHt9XHJcbiAgICAgIGMuY2xhc3NOYW1lID0gZi5oYXNoID09PSBoYXNoID8gJ3NlbGVjdGVkJyA6ICcnXHJcbiAgICAgIGlmIChmLmNsYXNzTmFtZSA9PT0gJ3NlbGVjdGVkJykgdGhpcy5wYWdlID0gZi5ub2RlVmFsdWVcclxuICAgICAgZmlsdGVycy51cGRhdGUoZi5oYXNoLCAnaGFzaCcsIGMpXHJcbiAgICB9KVxyXG4gIH1cclxufVxyXG5cclxuY29uc3QgYXBwID0gbmV3IEFwcFxyXG5cclxuY29uc3QgdG9kbyA9IHtcclxuICB0b2RvYXBwOiB7XHJcbiAgICB0YWc6ICdzZWN0aW9uJyxcclxuICAgIGlkOiAndG9kb2FwcCdcclxuICB9LFxyXG4gIGluZm86IHtcclxuICAgIHRhZzogJ2Zvb3RlcicsXHJcbiAgICBpZDogJ2luZm8nLFxyXG4gICAgdGVtcGxhdGU6IGBcclxuICAgICAgPHA+RG91YmxlLWNsaWNrIHRvIGVkaXQgYSB0b2RvPC9wPlxyXG4gICAgICA8cD5DcmVhdGVkIGJ5IDxhIGhyZWY9XCJodHRwczovL2dpdGh1Yi5jb20vc3lhcnVsXCI+U2hhaHJ1bCBOaXphbSBTZWxhbWF0PC9hPjwvcD5cclxuICAgICAgPHA+UGFydCBvZiA8YSBocmVmPVwiaHR0cDovL3RvZG9tdmMuY29tXCI+VG9kb01WQzwvYT48L3A+YFxyXG4gIH1cclxufVxyXG5cclxuYXBwLm1vdW50KHRvZG8pLmxpbmsoJ3RvZG8nKS5jbHVzdGVyKGNvbnRhaW5lckluaXQpXHJcblxyXG5hcHAucm91dGVVcGRhdGUoKVxyXG5cclxubW9kdWxlLmV4cG9ydHMgPSBhcHBcclxuXHJcbnNldFRpbWVvdXQoKCkgPT4ge1xyXG4gIGluZm9ybShjb250YWluZXIsIFsxXSlcclxuICBpbmZvcm0oZm9vdGVyLCBbe2NvbXBsZXRlZDogJ2NvbXBsZXRlZCd9LCB7Y29tcGxldGVkOiAnJ31dKVxyXG4gIGFwcC5yb3V0ZVVwZGF0ZSgpXHJcbn0sIDIwMDApXHJcblxyXG5zZXRUaW1lb3V0KCgpID0+IHtcclxuICAvLyBpbmZvcm0oY29udGFpbmVyLCBbXSlcclxuICAvLyBpbmZvcm0oZm9vdGVyLCBbe2NvbXBsZXRlZDogJ2NvbXBsZXRlZCd9LCB7Y29tcGxldGVkOiAnJ31dKVxyXG4gIC8vIGFwcC5yb3V0ZVVwZGF0ZSgpXHJcbn0sIDQwMDApIiwiY29uc3QgS2VldCA9IHJlcXVpcmUoJ2tlZXQnKVxyXG5jb25zdCB7IG1haW4sIG1haW5Jbml0IH0gPSByZXF1aXJlKCcuL21haW4nKVxyXG5jb25zdCB7IGZvb3RlciwgZm9vdGVySW5pdCB9ID0gcmVxdWlyZSgnLi9mb290ZXInKVxyXG5jb25zdCB7IGZpbHRlcnMgfSA9IHJlcXVpcmUoJy4vZmlsdGVycycpXHJcblxyXG5jb25zdCBsb2cgPSBjb25zb2xlLmxvZy5iaW5kKGNvbnNvbGUpXHJcblxyXG5jbGFzcyBDb250YWluZXIgZXh0ZW5kcyBLZWV0IHtcclxuICBjb25zdHJ1Y3Rvcigpe1xyXG4gICAgc3VwZXIoKVxyXG4gICAgdGhpcy5vbkNoYW5nZXMgPSBbXVxyXG4gICAgdGhpcy5nZW4gPSBmYWxzZVxyXG4gICAgdGhpcy5zdWJzY3JpYmUodG9kb3MgPT4ge1xyXG4gICAgICBpZih0b2Rvcy5sZW5ndGggJiYgIXRoaXMuZ2VuKXtcclxuICAgICAgICB0aGlzLmdlbiA9IHRydWVcclxuICAgICAgICB0aGlzLm1vdW50Q2hpbGQoJ21haW4nLCB7IHRhZzogJ3NlY3Rpb24nLCBpZDogJ21haW4nfSlcclxuICAgICAgICB0aGlzLm1vdW50Q2hpbGQoJ2Zvb3RlcicsIHsgdGFnOiAnZm9vdGVyJywgaWQ6ICdmb290ZXInfSlcclxuICAgICAgICB0aGlzLnJlbmRlcigpXHJcbiAgICAgICAgdGhpcy5zdWJSZW5kZXIoKVxyXG4gICAgICB9IFxyXG4gICAgICBlbHNlIGlmKCF0b2Rvcy5sZW5ndGggJiYgdGhpcy5nZW4pe1xyXG4gICAgICAgIHRoaXMuZ2VuID0gZmFsc2VcclxuICAgICAgICB0aGlzLnJlbW92ZVRvZG9Db250YWluZXIoKVxyXG4gICAgICB9XHJcbiAgICB9KVxyXG4gIH1cclxuICBjcmVhdGUgKGV2dCkge1xyXG4gICAgaWYoZXZ0LmtleUNvZGUgIT09IDEzKSByZXR1cm5cclxuICAgIHRvZG9MaXN0LmFkZFRvZG8uY2FsbCh0b2RvTGlzdCwgZXZ0LnRhcmdldC52YWx1ZS50cmltKCkpXHJcbiAgICBldnQudGFyZ2V0LnZhbHVlID0gJydcclxuICB9XHJcbiAgbW91bnRDaGlsZChjaGlsZCwgcHJvcCwgY29tcG9uZW50KXtcclxuICAgIHRoaXMuYmFzZVByb3h5W2NoaWxkXSA9IHByb3BcclxuICB9XHJcbiAgc3ViUmVuZGVyKCkge1xyXG4gICAgbWFpbi5yZW5kZXIoKVxyXG4gICAgZm9vdGVyLnJlbmRlcigpXHJcbiAgfVxyXG4gIHJlbW92ZVRvZG9Db250YWluZXIoKXtcclxuICAgIGRlbGV0ZSB0aGlzLmJhc2VQcm94eS5tYWluXHJcbiAgICBkZWxldGUgdGhpcy5iYXNlUHJveHkuZm9vdGVyXHJcbiAgICB0aGlzLnJlbmRlcigpXHJcbiAgfVxyXG4gIHN1YnNjcmliZShmbikge1xyXG4gICAgdGhpcy5vbkNoYW5nZXMucHVzaChmbilcclxuICB9XHJcbn1cclxuXHJcbmNvbnN0IGNvbnRhaW5lciA9IG5ldyBDb250YWluZXIoKVxyXG5cclxuY29uc3Qgdm1vZGVsID0ge1xyXG4gIGhlYWRlcjoge1xyXG4gICAgdGFnOiAnaGVhZGVyJyxcclxuICAgIGlkOiAnaGVhZGVyJyxcclxuICAgIHRlbXBsYXRlOiBgXHJcbiAgICAgIDxoMT50b2RvczwvaDE+XHJcbiAgICAgIDxpbnB1dCBpZD1cIm5ldy10b2RvXCIgay1rZXlkb3duPVwiY3JlYXRlKClcIiBwbGFjZWhvbGRlcj1cIldoYXQgbmVlZHMgdG8gYmUgZG9uZT9cIiBhdXRvZm9jdXM+YFxyXG4gIH1cclxufVxyXG5cclxuZXhwb3J0cy5jb250YWluZXJJbml0ID0gKCkgPT4gY29udGFpbmVyLm1vdW50KHZtb2RlbCkubGluaygndG9kb2FwcCcpLmNsdXN0ZXIobWFpbkluaXQsIGZvb3RlckluaXQpXHJcblxyXG5leHBvcnRzLmNvbnRhaW5lciA9IGNvbnRhaW5lciIsImNvbnN0IEtlZXQgPSByZXF1aXJlKCdrZWV0JylcclxuY29uc3QgYXBwID0gcmVxdWlyZSgnLi9hcHAnKVxyXG5jb25zdCB7IGNhbWVsQ2FzZSB9ID0gcmVxdWlyZSgnLi91dGlsJylcclxuXHJcbmxldCBmaWx0ZXJQYWdlID0gWydhbGwnLCAnYWN0aXZlJywgJ2NvbXBsZXRlZCddXHJcblxyXG5jbGFzcyBGaWx0ZXJzIGV4dGVuZHMgS2VldCB7XHJcbiAgdXBkYXRlVXJsICh1cmkpIHtcclxuICAgIC8vIGNvbnNvbGUubG9nKGFwcClcclxuICAgIC8vIGFwcC51cGRhdGVGaWx0ZXIodXJpKVxyXG4gIH1cclxufVxyXG5cclxuY29uc3QgZmlsdGVycyA9IG5ldyBGaWx0ZXJzKClcclxuXHJcbmNvbnN0IHZtb2RlbCA9IHtcclxuICB0ZW1wbGF0ZTogYFxyXG4gICAgPGxpIGstY2xpY2s9XCJ1cGRhdGVVcmwoe3toYXNofX0pXCI+XHJcbiAgICAgIDxhIGNsYXNzPVwie3tjbGFzc05hbWV9fVwiIGhyZWY9XCJ7e2hhc2h9fVwiPnt7bm9kZVZhbHVlfX08L2E+XHJcbiAgICA8L2xpPmAudHJpbSgpLFxyXG4gIG1vZGVsOiBmaWx0ZXJQYWdlLm1hcCgoZiwgaSkgPT4ge1xyXG4gICAgcmV0dXJuIHtcclxuICAgICAgY2xhc3NOYW1lOiAnJyxcclxuICAgICAgaGFzaDogJyMvJyArIGYsXHJcbiAgICAgIG5vZGVWYWx1ZTogY2FtZWxDYXNlKGYpXHJcbiAgICB9XHJcbiAgfSlcclxufVxyXG5cclxuY29uc3QgZmlsdGVyc0luaXQgPSAoKSA9PiB7XHJcbiAgZmlsdGVycy5tb3VudCh2bW9kZWwpLmxpbmsoJ2ZpbHRlcnMnKVxyXG59XHJcblxyXG5tb2R1bGUuZXhwb3J0cyA9IHtcclxuICBmaWx0ZXJzSW5pdCxcclxuICBmaWx0ZXJzXHJcbn1cclxuIiwiY29uc3QgS2VldCA9IHJlcXVpcmUoJ2tlZXQnKVxyXG5jb25zdCB7IGZpbHRlcnNJbml0IH0gPXJlcXVpcmUoJy4vZmlsdGVycycpXHJcblxyXG5jbGFzcyBGb290ZXIgZXh0ZW5kcyBLZWV0IHtcclxuICBjb25zdHJ1Y3RvciAoKSB7XHJcbiAgICBzdXBlcigpXHJcbiAgICB0aGlzLmNvdW50ID0gMFxyXG4gICAgdGhpcy5zID0gJydcclxuICAgIHRoaXMuY2xlYXJDb21wbGV0ZWREaXNwbGF5ID0gJ25vbmUnXHJcblxyXG4gICAgdGhpcy5vbkNoYW5nZXMgPSBbXVxyXG4gICAgdGhpcy5zdWJzY3JpYmUodG9kb3MgPT4ge1xyXG4gICAgICBsZXQgYWN0aXZlcyA9IHRvZG9zLmZpbHRlcihmID0+IGYuY29tcGxldGVkICE9PSAnY29tcGxldGVkJylcclxuICAgICAgdGhpcy51cGRhdGVDb3VudChhY3RpdmVzLmxlbmd0aClcclxuICAgICAgdGhpcy50b2dnbGVDbGVhckNvbXBsZXRlKGFjdGl2ZXMubGVuZ3RoICE9PSB0b2Rvcy5sZW5ndGggPyB0cnVlIDogZmFsc2UpXHJcbiAgICAgIGZpbHRlcnNJbml0KClcclxuICAgIH0pXHJcbiAgfVxyXG4gIHRvZ2dsZUNsZWFyQ29tcGxldGUgKGRpc3BsYXkpIHtcclxuICAgIHRoaXMuY2xlYXJDb21wbGV0ZWREaXNwbGF5ID0gZGlzcGxheSB8fCAnbm9uZSdcclxuICB9XHJcbiAgdXBkYXRlQ291bnQgKGNvdW50KSB7XHJcbiAgICB0aGlzLmNvdW50ID0gY291bnQvLy50b1N0cmluZygpXHJcbiAgICB0aGlzLnMgPSBjb3VudCA9PT0gMSA/ICcnIDogJ3MnXHJcbiAgfVxyXG4gIGNsZWFyQ29tcGxldGVkQ2xpY2tlZCAoZXZ0KSB7XHJcbiAgICBhcHAuY2xlYXJDb21wbGV0ZWQuYmluZChhcHApXHJcbiAgfVxyXG4gIHN1YnNjcmliZShmbikge1xyXG4gICAgdGhpcy5vbkNoYW5nZXMucHVzaChmbilcclxuICB9XHJcbn1cclxuXHJcbmNvbnN0IGZvb3RlciA9IG5ldyBGb290ZXIoKVxyXG5cclxuY29uc3Qgdm1vZGVsID0ge1xyXG4gIHRvZG9Db3VudDoge1xyXG4gICAgdGFnOiAnc3BhbicsXHJcbiAgICBpZDogJ3RvZG8tY291bnQnLFxyXG4gICAgdGVtcGxhdGU6IGA8c3Ryb25nPnt7Y291bnR9fTwvc3Ryb25nPiBpdGVte3tzfX0gbGVmdGBcclxuICB9LFxyXG4gIGZpbHRlcnM6IHtcclxuICAgIHRhZzogJ3VsJyxcclxuICAgIGlkOiAnZmlsdGVycydcclxuICB9LFxyXG4gIGNsZWFyQ29tcGxldGVkOiB7XHJcbiAgICB0YWc6ICdidXR0b24nLFxyXG4gICAgaWQ6ICdjbGVhci1jb21wbGV0ZWQnLFxyXG4gICAgc3R5bGU6IHtcclxuICAgICAgZGlzcGxheTogJ3t7Y2xlYXJDb21wbGV0ZWREaXNwbGF5fX0nXHJcbiAgICB9LFxyXG4gICAgJ2stY2xpY2snOiAnY2xlYXJDb21wbGV0ZWRDbGlja2VkKCknLFxyXG4gICAgdGVtcGxhdGU6ICdDbGVhciBjb21wbGV0ZWQnXHJcbiAgfVxyXG59XHJcblxyXG5jb25zdCBmb290ZXJJbml0ID0gKCkgPT4gZm9vdGVyLm1vdW50KHZtb2RlbCkubGluaygnZm9vdGVyJykvLy5jbHVzdGVyKGZpbHRlcnNJbml0KVxyXG5cclxubW9kdWxlLmV4cG9ydHMgPSB7XHJcbiAgZm9vdGVySW5pdCxcclxuICBmb290ZXJcclxufVxyXG4iLCJjb25zdCBLZWV0ID0gcmVxdWlyZSgna2VldCcpXHJcbi8vaW1wb3J0IHRvZG9MaXN0SW5pdCBmcm9tICcuL3RvZG9MaXN0J1xyXG5cclxuY2xhc3MgTWFpbiBleHRlbmRzIEtlZXQge1xyXG4gIGNvbnN0cnVjdG9yICguLi5hcmdzKSB7XHJcbiAgICBzdXBlcigpXHJcbiAgICB0aGlzLmFyZ3MgPSBhcmdzXHJcbiAgICB0aGlzLmRpc3BsYXkgPSAnbm9uZSdcclxuICAgIHRoaXMuaXNDaGVjayA9IGZhbHNlXHJcblxyXG4gICAgdGhpcy5vbkNoYW5nZXMgPSBbXVxyXG4gICAgdGhpcy5zdWJzY3JpYmUodG9kb3MgPT5cclxuICAgICAgdGhpcy50b2dnbGVEaXNwbGF5KHRvZG9zLmxlbmd0aCA/ICdibG9jaycgOiAnbm9uZScpXHJcbiAgICApXHJcbiAgfVxyXG4gIHRvZ2dsZURpc3BsYXkgKGRpc3BsYXkpIHtcclxuICAgIHRoaXMuZGlzcGxheSA9IGRpc3BsYXlcclxuICB9XHJcbiAgdG9nZ2xlQ2hlY2sgKGNoZWNrKSB7XHJcbiAgICB0aGlzLmlzQ2hlY2sgPSBjaGVjayB8fCBmYWxzZVxyXG4gIH1cclxuICBjb21wbGV0ZUFsbCAoZXZ0KSB7XHJcbiAgICBhcHAuY2hlY2tlZEFsbChldnQpXHJcbiAgfVxyXG4gIHN1YnNjcmliZShmbikge1xyXG4gICAgdGhpcy5vbkNoYW5nZXMucHVzaChmbilcclxuICB9XHJcbn1cclxuXHJcbmNvbnN0IG1haW4gPSBuZXcgTWFpbignY2hlY2tlZCcpXHJcblxyXG5jb25zdCB2bW9kZWwgPSB7XHJcbiAgdG9nZ2xlQWxsOiB7XHJcbiAgICB0YWc6ICdpbnB1dCcsXHJcbiAgICBpZDogJ3RvZ2dsZS1hbGwnLFxyXG4gICAgdHlwZTogJ2NoZWNrYm94JyxcclxuICAgIGNoZWNrZWQ6ICd7e2lzQ2hlY2t9fScsXHJcbiAgICBzdHlsZToge1xyXG4gICAgICBkaXNwbGF5OiAne3tkaXNwbGF5fX0nXHJcbiAgICB9LFxyXG4gICAgJ2stY2xpY2snOiAnY29tcGxldGVBbGwoKSdcclxuXHJcbiAgfSxcclxuICB0b2dnbGVMYWJlbDogYDxsYWJlbCBmb3I9XCJ0b2dnbGUtYWxsXCI+TWFyayBhbGwgYXMgY29tcGxldGU8L2xhYmVsPmAsXHJcbiAgdG9kb0xpc3Q6IHtcclxuICAgIHRhZzogJ3VsJyxcclxuICAgIGlkOiAndG9kby1saXN0J1xyXG4gIH1cclxufVxyXG5cclxuY29uc3QgbWFpbkluaXQgPSAoKSA9PiBtYWluLm1vdW50KHZtb2RlbCkubGluaygnbWFpbicpLy8uY2x1c3Rlcih0b2RvTGlzdEluaXQpXHJcblxyXG5tb2R1bGUuZXhwb3J0cyA9IHtcclxuICBtYWluSW5pdCxcclxuICBtYWluXHJcbn0iLCJleHBvcnRzLmluZm9ybSA9IGZ1bmN0aW9uKGJhc2UsIGlucHV0KSB7XHJcbiAgZm9yICh2YXIgaSA9IGJhc2Uub25DaGFuZ2VzLmxlbmd0aDsgaS0tOykge1xyXG4gICAgYmFzZS5vbkNoYW5nZXNbaV0oaW5wdXQpXHJcbiAgfVxyXG59XHJcblxyXG5leHBvcnRzLnN0b3JlID0gZnVuY3Rpb24obmFtZXNwYWNlLCBkYXRhKSB7XHJcbiAgaWYgKGFyZ3VtZW50cy5sZW5ndGggPiAxKSB7XHJcbiAgICByZXR1cm4gbG9jYWxTdG9yYWdlLnNldEl0ZW0obmFtZXNwYWNlLCBKU09OLnN0cmluZ2lmeShkYXRhKSlcclxuICB9IGVsc2Uge1xyXG4gICAgdmFyIHN0b3JlID0gbG9jYWxTdG9yYWdlLmdldEl0ZW0obmFtZXNwYWNlKVxyXG4gICAgcmV0dXJuIHN0b3JlICYmIEpTT04ucGFyc2Uoc3RvcmUpIHx8IFtdXHJcbiAgfVxyXG59XHJcblxyXG5leHBvcnRzLmNhbWVsQ2FzZSA9IGZ1bmN0aW9uKHMpIHtcclxuICByZXR1cm4gcy5jaGFyQXQoMCkudG9VcHBlckNhc2UoKSArIHMuc2xpY2UoMSlcclxufVxyXG5cclxuZXhwb3J0cy5nZW5JZCA9IGZ1bmN0aW9uKCkge1xyXG4gIHJldHVybiAoTWF0aC5yb3VuZChNYXRoLnJhbmRvbSgpICogMHgxMDAwKSkudG9TdHJpbmcoMzIpXHJcbn1cclxuXHJcbmV4cG9ydHMuZ2V0SWQgPSBmdW5jdGlvbiAoaWQpIHtcclxuICByZXR1cm4gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoaWQpXHJcbn0iXX0=
