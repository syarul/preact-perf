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
const { camelCase } = require('./util')
// const { containerInit, container } = require('./container')
const { inform, getId } = require('./util')

// const { footer } = require('./footer')
// const { filters } = require('./filters')

const log = console.log.bind(console)

const filterPage = ['all', 'active', 'completed']

class App extends Keet {
  constructor() {
    super()

    this.onChanges = []
    this.ignoreNodes = ['todo-list']
    this.page = 'All'
    this.isChecked = ''
    this.count = 0
    this.plural = ''
    this.clearToggle = 'none'

    filterPage.map(f => this[`c_${f}`] = '')

    let gen = false

    this.subscribe(todos => {
      if(todos.length){
        if(!gen) {
          gen = true
          this.base.todoapp.template = tmpl(gen)
          // log(this.base)
          this.flush().render()
        }
      } 
      else if(!todos.length){
        if(gen){
          gen = false
          this.base.todoapp.template = tmpl(gen)
          this.flush().render()
        }
      }
    })

  }
  componentDidMount(){
    if (window.location.hash == '') {
      this.updateUrl('#/all')
      window.history.pushState({}, null, '#/all')
    }
    window.onpopstate = () => this.updateUrl(window.location.hash)
  }
  updateUrl(hash) {
    filterPage.map(f => {
      this[`c_${f}`] = hash.split('#/')[1] === f ? 'selected' : ''
      if(hash.split('#/')[1] === f) this.page = f.name
    })
  }
  completeAll(){

  }
  clearCompleted(){

  }
  subscribe(stack) {
    this.onChanges.push(stack)
  }
}

const app = new App

let filtersTmpl = ''

const filters = page => {
  let f = {
    className: `{{c_${page}}}`,
    hash: '#/' + page,
    name: camelCase(page)
  }
  filtersTmpl += `<li k-click="updateUrl(${f.hash})"><a class="${f.className}" href="${f.hash}">${f.name}</a></li>`
}

filterPage.map(page => filters(page))

const tmpl = todoLength => {
  let static = `
    <header id="header">
      <h1>todos</h1>
      <input id="new-todo" k-keydown="create()" placeholder="What needs to be done?" autofocus>
    </header>
  `
  let main = `
    <section id="main">
      <input id="toggle-all" type="checkbox" {{isChecked}} k-click="completeAll()">
      <label for="toggle-all">Mark all as complete</label>
      <!-- todo list component dom entry-->
      <ul id="todo-list"></ul>
    </section>
  `
  let footer = `
    <footer id="footer">
      <span id="todo-count">
        <strong>{{count}}</strong> item{{plural}} left
      </span>
      <ul id="filters">
        ${filtersTmpl}
      </ul>
      <button id="clear-completed" style="display: {{clearToggle}}" k-clicked="clearCompleted()">Clear completed</button>
    </footer>
  `
  return todoLength ?  static.concat(main, footer) : static
}

const todo = {
  todoapp: {
    tag: 'section',
    id: 'todoapp',
    template: tmpl(false)
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

app.mount(todo).link('todo')//.cluster(containerInit)

// app.routeUpdate()

module.exports = app

setTimeout(() => {
  inform(app, [1])
  // inform(container, [1])
  // inform(footer, [{completed: 'completed'}, {completed: ''}])
  app.updateUrl(window.location.hash)
}, 2000)

setTimeout(() => {
  // inform(container, [])
  // inform(footer, [{completed: 'completed'}, {completed: ''}])
  // app.routeUpdate()
}, 4000)
},{"./util":15,"keet":13}],15:[function(require,module,exports){
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
//# sourceMappingURL=data:application/json;charset:utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIkM6L1VzZXJzL2toYWkvQXBwRGF0YS9Sb2FtaW5nL25wbS9ub2RlX21vZHVsZXMvYnJvd3NlcmlmeS9ub2RlX21vZHVsZXMvYnJvd3Nlci1wYWNrL19wcmVsdWRlLmpzIiwibm9kZV9tb2R1bGVzL2tlZXQvY29tcG9uZW50cy9jb3B5LmpzIiwibm9kZV9tb2R1bGVzL2tlZXQvY29tcG9uZW50cy9lbGVtZW50VXRpbHMuanMiLCJub2RlX21vZHVsZXMva2VldC9jb21wb25lbnRzL2dlbkVsZW1lbnQuanMiLCJub2RlX21vZHVsZXMva2VldC9jb21wb25lbnRzL2dlblRlbXBsYXRlLmpzIiwibm9kZV9tb2R1bGVzL2tlZXQvY29tcG9uZW50cy9wYXJzZVN0ci5qcyIsIm5vZGVfbW9kdWxlcy9rZWV0L2NvbXBvbmVudHMvcHJvY2Vzc0V2ZW50LmpzIiwibm9kZV9tb2R1bGVzL2tlZXQvY29tcG9uZW50cy90YWcuanMiLCJub2RlX21vZHVsZXMva2VldC9jb21wb25lbnRzL3RtcGxBdHRySGFuZGxlci5qcyIsIm5vZGVfbW9kdWxlcy9rZWV0L2NvbXBvbmVudHMvdG1wbENsYXNzSGFuZGxlci5qcyIsIm5vZGVfbW9kdWxlcy9rZWV0L2NvbXBvbmVudHMvdG1wbEhhbmRsZXIuanMiLCJub2RlX21vZHVsZXMva2VldC9jb21wb25lbnRzL3RtcGxTdHlsZXNIYW5kbGVyLmpzIiwibm9kZV9tb2R1bGVzL2tlZXQvY29tcG9uZW50cy91dGlscy5qcyIsIm5vZGVfbW9kdWxlcy9rZWV0L2tlZXQuanMiLCJzcmMvYXBwLmpzIiwic3JjL3V0aWwuanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7QUNBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNmQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDOURBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQy9HQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDaENBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDcERBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDOUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNuQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3ZCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDcEJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNkQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNyQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ1hBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMzSkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNwSkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSIsImZpbGUiOiJnZW5lcmF0ZWQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlc0NvbnRlbnQiOlsiKGZ1bmN0aW9uIGUodCxuLHIpe2Z1bmN0aW9uIHMobyx1KXtpZighbltvXSl7aWYoIXRbb10pe3ZhciBhPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7aWYoIXUmJmEpcmV0dXJuIGEobywhMCk7aWYoaSlyZXR1cm4gaShvLCEwKTt2YXIgZj1uZXcgRXJyb3IoXCJDYW5ub3QgZmluZCBtb2R1bGUgJ1wiK28rXCInXCIpO3Rocm93IGYuY29kZT1cIk1PRFVMRV9OT1RfRk9VTkRcIixmfXZhciBsPW5bb109e2V4cG9ydHM6e319O3Rbb11bMF0uY2FsbChsLmV4cG9ydHMsZnVuY3Rpb24oZSl7dmFyIG49dFtvXVsxXVtlXTtyZXR1cm4gcyhuP246ZSl9LGwsbC5leHBvcnRzLGUsdCxuLHIpfXJldHVybiBuW29dLmV4cG9ydHN9dmFyIGk9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtmb3IodmFyIG89MDtvPHIubGVuZ3RoO28rKylzKHJbb10pO3JldHVybiBzfSkiLCJtb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uIChhcmd2KSB7XHJcbiAgdmFyIGNvcCA9IGZ1bmN0aW9uICh2KSB7XHJcbiAgICB2YXIgbyA9IHt9XHJcbiAgICBpZiAodHlwZW9mIHYgIT09ICdvYmplY3QnKSB7XHJcbiAgICAgIG8uY29weSA9IHZcclxuICAgICAgcmV0dXJuIG8uY29weVxyXG4gICAgfSBlbHNlIHtcclxuICAgICAgZm9yICh2YXIgYXR0ciBpbiB2KSB7XHJcbiAgICAgICAgb1thdHRyXSA9IHZbYXR0cl1cclxuICAgICAgfVxyXG4gICAgfVxyXG4gICAgcmV0dXJuIG9cclxuICB9XHJcbiAgcmV0dXJuIEFycmF5LmlzQXJyYXkoYXJndikgPyBhcmd2Lm1hcChmdW5jdGlvbiAodikgeyByZXR1cm4gdiB9KSA6IGNvcChhcmd2KVxyXG59XHJcbiIsIlxyXG52YXIgbG9vcENoaWxkcyA9IGZ1bmN0aW9uIChhcnIsIGVsZW0pIHtcclxuICBpZiAoIWVsZW0pIHJldHVybiBmYWxzZVxyXG4gIGZvciAodmFyIGNoaWxkID0gZWxlbS5maXJzdENoaWxkOyBjaGlsZCAhPT0gbnVsbDsgY2hpbGQgPSBjaGlsZC5uZXh0U2libGluZykge1xyXG4gICAgYXJyLnB1c2goY2hpbGQpXHJcbiAgICBpZiAoY2hpbGQuaGFzQ2hpbGROb2RlcygpKSB7XHJcbiAgICAgIGxvb3BDaGlsZHMoYXJyLCBjaGlsZClcclxuICAgIH1cclxuICB9XHJcbn1cclxuXHJcbmV4cG9ydHMubG9vcENoaWxkcyA9IGxvb3BDaGlsZHNcclxuXHJcbnZhciBub2RlVXBkYXRlID0gZnVuY3Rpb24gKG5ld05vZGUsIG9sZE5vZGUpIHtcclxuICBpZiAoIW5ld05vZGUpIHJldHVyblxyXG4gIHZhciBvQXR0ciA9IG5ld05vZGUuYXR0cmlidXRlc1xyXG4gIHZhciBvdXRwdXQgPSB7fVxyXG5cclxuICBmb3IgKHZhciBpID0gb0F0dHIubGVuZ3RoIC0gMTsgaSA+PSAwOyBpLS0pIHtcclxuICAgIG91dHB1dFtvQXR0cltpXS5uYW1lXSA9IG9BdHRyW2ldLnZhbHVlXHJcbiAgfVxyXG4gIGZvciAodmFyIGlBdHRyIGluIG91dHB1dCkge1xyXG4gICAgaWYgKG9sZE5vZGUuYXR0cmlidXRlc1tpQXR0cl0gJiYgb2xkTm9kZS5hdHRyaWJ1dGVzW2lBdHRyXS5uYW1lID09PSBpQXR0ciAmJiBvbGROb2RlLmF0dHJpYnV0ZXNbaUF0dHJdLnZhbHVlICE9PSBvdXRwdXRbaUF0dHJdKSB7XHJcbiAgICAgIG9sZE5vZGUuc2V0QXR0cmlidXRlKGlBdHRyLCBvdXRwdXRbaUF0dHJdKVxyXG4gICAgfVxyXG4gIH1cclxuICBpZiAob2xkTm9kZS50ZXh0Q29udGVudCA9PT0gJycgJiYgbmV3Tm9kZS50ZXh0Q29udGVudCkge1xyXG4gICAgb2xkTm9kZS50ZXh0Q29udGVudCA9IG5ld05vZGUudGV4dENvbnRlbnRcclxuICB9XHJcbiAgaWYgKG9sZE5vZGUudHlwZSA9PT0gJ2NoZWNrYm94JyAmJiAhb2xkTm9kZS5jaGVja2VkICYmIG5ld05vZGUuY2hlY2tlZCkge1xyXG4gICAgb2xkTm9kZS5jaGVja2VkID0gdHJ1ZVxyXG4gIH1cclxuICBpZiAob2xkTm9kZS50eXBlID09PSAnY2hlY2tib3gnICYmIG9sZE5vZGUuY2hlY2tlZCAmJiAhbmV3Tm9kZS5jaGVja2VkKSB7XHJcbiAgICBvbGROb2RlLmNoZWNrZWQgPSBmYWxzZVxyXG4gIH1cclxuICBvdXRwdXQgPSB7fVxyXG59XHJcblxyXG52YXIgbm9kZVVwZGF0ZUhUTUwgPSBmdW5jdGlvbiAobmV3Tm9kZSwgb2xkTm9kZSkge1xyXG4gIGlmICghbmV3Tm9kZSkgcmV0dXJuXHJcbiAgaWYgKG5ld05vZGUubm9kZVZhbHVlICE9PSBvbGROb2RlLm5vZGVWYWx1ZSkgeyBvbGROb2RlLm5vZGVWYWx1ZSA9IG5ld05vZGUubm9kZVZhbHVlIH1cclxufVxyXG5cclxuZXhwb3J0cy51cGRhdGVFbGVtID0gZnVuY3Rpb24gKG9sZEVsZW0sIG5ld0VsZW0pIHtcclxuICB2YXIgb2xkQXJyID0gW11cclxuICB2YXIgbmV3QXJyID0gW11cclxuICBvbGRBcnIucHVzaChvbGRFbGVtKVxyXG4gIG5ld0Fyci5wdXNoKG5ld0VsZW0pXHJcbiAgbG9vcENoaWxkcyhvbGRBcnIsIG9sZEVsZW0pXHJcbiAgbG9vcENoaWxkcyhuZXdBcnIsIG5ld0VsZW0pXHJcbiAgb2xkQXJyLm1hcChmdW5jdGlvbiAoZWxlLCBpZHgsIGFycikge1xyXG4gICAgaWYgKGVsZSAmJiBlbGUubm9kZVR5cGUgPT09IDEgJiYgZWxlLmhhc0F0dHJpYnV0ZXMoKSkge1xyXG4gICAgICBub2RlVXBkYXRlKG5ld0FycltpZHhdLCBlbGUpXHJcbiAgICB9IGVsc2UgaWYgKGVsZSAmJiBlbGUubm9kZVR5cGUgPT09IDMpIHtcclxuICAgICAgbm9kZVVwZGF0ZUhUTUwobmV3QXJyW2lkeF0sIGVsZSlcclxuICAgIH1cclxuICAgIGlmIChpZHggPT09IGFyci5sZW5ndGggLSAxKSB7XHJcbiAgICAgIG9sZEFyci5zcGxpY2UoMClcclxuICAgICAgbmV3QXJyLnNwbGljZSgwKVxyXG4gICAgfVxyXG4gIH0pXHJcbn1cclxuIiwidmFyIGNvcHkgPSByZXF1aXJlKCcuL2NvcHknKVxyXG52YXIgdGFnID0gcmVxdWlyZSgnLi90YWcnKVxyXG52YXIgdG1wbEhhbmRsZXIgPSByZXF1aXJlKCcuL3RtcGxIYW5kbGVyJylcclxudmFyIHRtcGxTdHlsZXNIYW5kbGVyID0gcmVxdWlyZSgnLi90bXBsU3R5bGVzSGFuZGxlcicpXHJcbnZhciB0bXBsQ2xhc3NIYW5kbGVyID0gcmVxdWlyZSgnLi90bXBsQ2xhc3NIYW5kbGVyJylcclxudmFyIHRtcGxBdHRySGFuZGxlciA9IHJlcXVpcmUoJy4vdG1wbEF0dHJIYW5kbGVyJylcclxudmFyIHByb2Nlc3NFdmVudCA9IHJlcXVpcmUoJy4vcHJvY2Vzc0V2ZW50JylcclxudmFyIHVwZGF0ZUVsZW0gPSByZXF1aXJlKCcuL2VsZW1lbnRVdGlscycpLnVwZGF0ZUVsZW1cclxudmFyIHNlbGVjdG9yID0gcmVxdWlyZSgnLi91dGlscycpLnNlbGVjdG9yXHJcblxyXG52YXIgdXBkYXRlQ29udGV4dCA9IGZ1bmN0aW9uICgpIHtcclxuICB2YXIgc2VsZiA9IHRoaXNcclxuICBPYmplY3Qua2V5cyh0aGlzLmJhc2UpLm1hcChmdW5jdGlvbiAoaGFuZGxlcktleSkge1xyXG4gICAgdmFyIGlkID0gc2VsZi5iYXNlW2hhbmRsZXJLZXldWydrZWV0LWlkJ11cclxuICAgIHZhciBlbGUgPSBzZWxlY3RvcihpZClcclxuICAgIGlmICghZWxlICYmIHR5cGVvZiBzZWxmLmJhc2VbaGFuZGxlcktleV0gPT09ICdzdHJpbmcnKSB7XHJcbiAgICAgIGVsZSA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKHNlbGYuZWwpXHJcbiAgICB9XHJcbiAgICB2YXIgbmV3RWxlbVxyXG4gICAgdmFyIGFyZ3MgPSBbXS5zbGljZS5jYWxsKGFyZ3VtZW50cylcclxuICAgIG5ld0VsZW0gPSBnZW5FbGVtZW50LmFwcGx5KHNlbGYsIFtzZWxmLmJhc2VbaGFuZGxlcktleV1dLmNvbmNhdChhcmdzKSlcclxuICAgIHVwZGF0ZUVsZW0oZWxlLCBuZXdFbGVtKVxyXG4gIH0pXHJcbn1cclxuXHJcbnZhciBuZXh0U3RhdGUgPSBmdW5jdGlvbiAoaSwgYXJncykge1xyXG4gIHZhciBzZWxmID0gdGhpc1xyXG4gIGlmIChpIDwgdGhpcy5fX3N0YXRlTGlzdF9fLmxlbmd0aCkge1xyXG4gICAgdmFyIHN0YXRlID0gdGhpcy5fX3N0YXRlTGlzdF9fW2ldXHJcbiAgICB2YXIgdmFsdWUgPSB0aGlzW3N0YXRlXVxyXG4gICAgT2JqZWN0LmRlZmluZVByb3BlcnR5KHRoaXMsIHN0YXRlLCB7XHJcbiAgICAgIGVudW1lcmFibGU6IGZhbHNlLFxyXG4gICAgICBjb25maWd1cmFibGU6IHRydWUsXHJcbiAgICAgIGdldDogZnVuY3Rpb24gKCkge1xyXG4gICAgICAgIHJldHVybiB2YWx1ZVxyXG4gICAgICB9LFxyXG4gICAgICBzZXQ6IGZ1bmN0aW9uICh2YWwpIHtcclxuICAgICAgICB2YWx1ZSA9IHZhbFxyXG4gICAgICAgIHVwZGF0ZUNvbnRleHQuYXBwbHkoc2VsZiwgYXJncylcclxuICAgICAgfVxyXG4gICAgfSlcclxuICAgIGkrK1xyXG4gICAgbmV4dFN0YXRlLmFwcGx5KHRoaXMsIFsgaSwgYXJncyBdKVxyXG4gIH0gZWxzZSB7XHJcbiAgICAvL1xyXG4gIH1cclxufVxyXG5cclxudmFyIHNldFN0YXRlID0gZnVuY3Rpb24gKGFyZ3MpIHtcclxuICB2YXIgc2VsZiA9IHRoaXNcclxuICBuZXh0U3RhdGUuYXBwbHkoc2VsZiwgWyAwLCBhcmdzIF0pXHJcbn1cclxuXHJcbnZhciB1cGRhdGVTdGF0ZUxpc3QgPSBmdW5jdGlvbiAoc3RhdGUpIHtcclxuICB0aGlzLl9fc3RhdGVMaXN0X18gPSB0aGlzLl9fc3RhdGVMaXN0X18uY29uY2F0KHN0YXRlKVxyXG59XHJcblxyXG52YXIgZ2VuRWxlbWVudCA9IGZ1bmN0aW9uICgpIHtcclxuICB2YXIgY2hpbGQgPSBbXS5zaGlmdC5jYWxsKGFyZ3VtZW50cylcclxuICB2YXIgYXJncyA9IFtdLnNsaWNlLmNhbGwoYXJndW1lbnRzKVxyXG5cclxuICB2YXIgdGVtcERpdiA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2RpdicpXHJcbiAgdmFyIGNsb25lQ2hpbGQgPSBjb3B5KGNoaWxkKVxyXG4gIGRlbGV0ZSBjbG9uZUNoaWxkLnRlbXBsYXRlXHJcbiAgZGVsZXRlIGNsb25lQ2hpbGQudGFnXHJcbiAgZGVsZXRlIGNsb25lQ2hpbGQuc3R5bGVcclxuICBkZWxldGUgY2xvbmVDaGlsZC5jbGFzc1xyXG4gIC8vIHByb2Nlc3MgdGVtcGxhdGUgaWYgaGFzIGhhbmRsZWJhcnMgdmFsdWVcclxuICB0aGlzLl9fc3RhdGVMaXN0X18gPSBbXVxyXG5cclxuICB2YXIgdHBsID0gY2hpbGQudGVtcGxhdGVcclxuICAgID8gdG1wbEhhbmRsZXIuY2FsbCh0aGlzLCBjaGlsZC50ZW1wbGF0ZSwgdXBkYXRlU3RhdGVMaXN0LmJpbmQodGhpcykpXHJcbiAgICA6IHR5cGVvZiBjaGlsZCA9PT0gJ3N0cmluZycgPyB0bXBsSGFuZGxlci5jYWxsKHRoaXMsIGNoaWxkLCB1cGRhdGVTdGF0ZUxpc3QuYmluZCh0aGlzKSkgOiBudWxsXHJcbiAgLy8gcHJvY2VzcyBzdHlsZXMgaWYgaGFzIGhhbmRsZWJhcnMgdmFsdWVcclxuICB2YXIgc3R5bGVUcGwgPSB0bXBsU3R5bGVzSGFuZGxlci5jYWxsKHRoaXMsIGNoaWxkLnN0eWxlLCB1cGRhdGVTdGF0ZUxpc3QuYmluZCh0aGlzKSlcclxuICAvLyBwcm9jZXNzIGNsYXNzZXMgaWYgaGFzIGhhbmRsZWJhcnMgdmFsdWVcclxuICB2YXIgY2xhc3NUcGwgPSB0bXBsQ2xhc3NIYW5kbGVyLmNhbGwodGhpcywgY2hpbGQsIHVwZGF0ZVN0YXRlTGlzdC5iaW5kKHRoaXMpKVxyXG4gIGlmIChjbGFzc1RwbCkgY2xvbmVDaGlsZC5jbGFzcyA9IGNsYXNzVHBsXHJcbiAgLy8gY3VzdG9tIGF0dHJpYnV0ZXMgaGFuZGxlclxyXG4gIGlmIChhcmdzICYmIGFyZ3MubGVuZ3RoKSB7XHJcbiAgICB0bXBsQXR0ckhhbmRsZXIuYXBwbHkodGhpcywgWyBjbG9uZUNoaWxkIF0uY29uY2F0KGFyZ3MpKVxyXG4gIH1cclxuXHJcbiAgdmFyIHMgPSBjaGlsZC50YWdcclxuICAgID8gdGFnKGNoaWxkLnRhZywgICAgICAgICAgICAvLyBodG1sIHRhZ1xyXG4gICAgICB0cGwgfHwgJycsICAgICAgICAgICAgICAgIC8vIG5vZGVWYWx1ZVxyXG4gICAgICBjbG9uZUNoaWxkLCAgICAgICAgICAgICAgIC8vIGF0dHJpYnV0ZXMgaW5jbHVkaW5nIGNsYXNzZXNcclxuICAgICAgc3R5bGVUcGwgICAgICAgICAgICAgICAgICAvLyBzdHlsZXNcclxuICAgICkgOiB0cGwgICAgICAgICAgICAgICAgICAgICAvLyBmYWxsYmFjayBpZiBub24gZXhpc3QsIHJlbmRlciB0aGUgdGVtcGxhdGUgYXMgc3RyaW5nXHJcblxyXG4gIHRlbXBEaXYuaW5uZXJIVE1MID0gc1xyXG4gIGlmIChjaGlsZC50YWcgPT09ICdpbnB1dCcpIHtcclxuICAgIGlmIChjbG9uZUNoaWxkLmNoZWNrZWQpIHtcclxuICAgICAgdGVtcERpdi5jaGlsZE5vZGVzWzBdLmNoZWNrZWQgPSB0cnVlXHJcbiAgICB9IGVsc2Uge1xyXG4gICAgICB0ZW1wRGl2LmNoaWxkTm9kZXNbMF0ucmVtb3ZlQXR0cmlidXRlKCdjaGVja2VkJylcclxuICAgIH1cclxuICB9XHJcblxyXG4gIHNldFN0YXRlLmNhbGwodGhpcywgYXJncylcclxuXHJcbiAgcHJvY2Vzc0V2ZW50LmNhbGwodGhpcywgdGVtcERpdilcclxuICByZXR1cm4gdHlwZW9mIGNoaWxkID09PSAnc3RyaW5nJ1xyXG4gICAgPyB0ZW1wRGl2XHJcbiAgICA6IGNoaWxkLnRhZyA/IHRlbXBEaXYuY2hpbGROb2Rlc1swXVxyXG4gICAgOiB0ZW1wRGl2XHJcbn1cclxuXHJcbmV4cG9ydHMuZ2VuRWxlbWVudCA9IGdlbkVsZW1lbnRcclxuZXhwb3J0cy5zZXRTdGF0ZSA9IHNldFN0YXRlXHJcbmV4cG9ydHMudXBkYXRlU3RhdGVMaXN0ID0gdXBkYXRlU3RhdGVMaXN0XHJcbiIsInZhciBwcm9jZXNzRXZlbnQgPSByZXF1aXJlKCcuL3Byb2Nlc3NFdmVudCcpXHJcblxyXG52YXIgdG1wbCA9ICcnXHJcblxyXG5mdW5jdGlvbiBuZXh0IChpLCBvYmosIGFyclByb3BzLCBhcmdzKSB7XHJcbiAgaWYgKGkgPCBhcnJQcm9wcy5sZW5ndGgpIHtcclxuICAgIHZhciByZXAgPSBhcnJQcm9wc1tpXS5yZXBsYWNlKC97eyhbXnt9XSspfX0vZywgJyQxJylcclxuICAgIHRtcGwgPSB0bXBsLnJlcGxhY2UoL3t7KFtee31dKyl9fS8sIG9ialtyZXBdKVxyXG4gICAgaWYgKGFyZ3MgJiYgfmFyZ3MuaW5kZXhPZihyZXApICYmICFvYmpbcmVwXSkge1xyXG4gICAgICB2YXIgcmUgPSBuZXcgUmVnRXhwKCcgJyArIHJlcCArICc9XCInICsgb2JqW3JlcF0gKyAnXCInLCAnZycpXHJcbiAgICAgIHRtcGwgPSB0bXBsLnJlcGxhY2UocmUsICcnKVxyXG4gICAgfVxyXG4gICAgaSsrXHJcbiAgICBuZXh0KGksIG9iaiwgYXJyUHJvcHMsIGFyZ3MpXHJcbiAgfSBlbHNlIHtcclxuXHJcbiAgfVxyXG59XHJcblxyXG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uIChvYmopIHtcclxuICB2YXIgYXJncyA9IHRoaXMuYXJnc1xyXG4gIHZhciBhcnJQcm9wcyA9IHRoaXMuYmFzZS50ZW1wbGF0ZS5tYXRjaCgve3soW157fV0rKX19L2cpXHJcbiAgdmFyIHRlbXBEaXZcclxuICB0bXBsID0gdGhpcy5iYXNlLnRlbXBsYXRlXHJcbiAgbmV4dCgwLCBvYmosIGFyclByb3BzLCBhcmdzKVxyXG4gIHRlbXBEaXYgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdkaXYnKVxyXG4gIHRlbXBEaXYuaW5uZXJIVE1MID0gdG1wbFxyXG4gIHZhciBpc2V2dCA9IC8gay0vLnRlc3QodG1wbClcclxuICBpZiAoaXNldnQpIHsgcHJvY2Vzc0V2ZW50LmNhbGwodGhpcywgdGVtcERpdikgfVxyXG4gIHRlbXBEaXYuY2hpbGROb2Rlc1swXS5zZXRBdHRyaWJ1dGUoJ2tlZXQtaWQnLCBvYmpbJ2tlZXQtaWQnXSlcclxuICByZXR1cm4gdGVtcERpdi5jaGlsZE5vZGVzWzBdXHJcbn1cclxuIiwidmFyIGdlbkVsZW1lbnQgPSByZXF1aXJlKCcuL2dlbkVsZW1lbnQnKS5nZW5FbGVtZW50XHJcbnZhciBzZXRTdGF0ZSA9IHJlcXVpcmUoJy4vZ2VuRWxlbWVudCcpLnNldFN0YXRlXHJcbnZhciB0bXBsSGFuZGxlciA9IHJlcXVpcmUoJy4vdG1wbEhhbmRsZXInKVxyXG52YXIgcHJvY2Vzc0V2ZW50ID0gcmVxdWlyZSgnLi9wcm9jZXNzRXZlbnQnKVxyXG52YXIgZ2VuSWQgPSByZXF1aXJlKCcuL3V0aWxzJykuZ2VuSWRcclxudmFyIGdlblRlbXBsYXRlID0gcmVxdWlyZSgnLi9nZW5UZW1wbGF0ZScpXHJcblxyXG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uICgpIHtcclxuICBpZiAodHlwZW9mIHRoaXMuYmFzZSAhPT0gJ29iamVjdCcpIHRocm93IG5ldyBFcnJvcignaW5zdGFuY2UgaXMgbm90IGFuIG9iamVjdCcpXHJcbiAgdmFyIHNlbGYgPSB0aGlzXHJcbiAgdmFyIGVsZW1BcnIgPSBbXVxyXG4gIHZhciBhcmdzID0gW10uc2xpY2UuY2FsbChhcmd1bWVudHMpXHJcbiAgaWYgKEFycmF5LmlzQXJyYXkodGhpcy5iYXNlLm1vZGVsKSkge1xyXG4gICAgLy8gZG8gYXJyYXkgYmFzZVxyXG4gICAgdGhpcy5iYXNlLnRlbXBsYXRlID0gdGhpcy5iYXNlLnRlbXBsYXRlLnRyaW0oKS5yZXBsYWNlKC9cXHMrL2csICcgJylcclxuXHJcbiAgICAvLyBnZW5lcmF0ZSBpZCBmb3Igc2VsZWN0b3JcclxuICAgIHRoaXMuYmFzZS5tb2RlbCA9IHRoaXMuYmFzZS5tb2RlbC5tYXAoZnVuY3Rpb24gKG0pIHtcclxuICAgICAgbVsna2VldC1pZCddID0gZ2VuSWQoKVxyXG4gICAgICByZXR1cm4gbVxyXG4gICAgfSlcclxuICAgIHRoaXMuYmFzZS5tb2RlbC5tYXAoZnVuY3Rpb24gKG0pIHtcclxuICAgICAgZWxlbUFyci5wdXNoKGdlblRlbXBsYXRlLmNhbGwoc2VsZiwgbSkpXHJcbiAgICB9KVxyXG4gIH0gZWxzZSB7XHJcbiAgICAvLyBkbyBvYmplY3QgYmFzZVxyXG4gICAgT2JqZWN0LmtleXModGhpcy5iYXNlKS5tYXAoZnVuY3Rpb24gKGtleSkge1xyXG4gICAgICB2YXIgY2hpbGQgPSBzZWxmLmJhc2Vba2V5XVxyXG4gICAgICBpZiAoY2hpbGQgJiYgdHlwZW9mIGNoaWxkID09PSAnb2JqZWN0Jykge1xyXG4gICAgICAgIHZhciBpZCA9IGdlbklkKClcclxuICAgICAgICBjaGlsZFsna2VldC1pZCddID0gaWRcclxuICAgICAgICBzZWxmLmJhc2Vba2V5XVsna2VldC1pZCddID0gaWRcclxuICAgICAgICB2YXIgbmV3RWxlbWVudCA9IGdlbkVsZW1lbnQuYXBwbHkoc2VsZiwgW2NoaWxkXS5jb25jYXQoYXJncykpXHJcbiAgICAgICAgZWxlbUFyci5wdXNoKG5ld0VsZW1lbnQpXHJcbiAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgc2VsZi5fX3N0YXRlTGlzdF9fID0gW11cclxuICAgICAgICB2YXIgdHBsID0gdG1wbEhhbmRsZXIuY2FsbChzZWxmLCBjaGlsZCwgZnVuY3Rpb24gKHN0YXRlKSB7XHJcbiAgICAgICAgICBzZWxmLl9fc3RhdGVMaXN0X18gPSBzZWxmLl9fc3RhdGVMaXN0X18uY29uY2F0KHN0YXRlKVxyXG4gICAgICAgIH0pXHJcbiAgICAgICAgdmFyIHRlbXBEaXYgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdkaXYnKVxyXG4gICAgICAgIHRlbXBEaXYuaW5uZXJIVE1MID0gdHBsXHJcbiAgICAgICAgc2V0U3RhdGUuY2FsbChzZWxmLCBhcmdzKVxyXG4gICAgICAgIHByb2Nlc3NFdmVudC5jYWxsKHNlbGYsIHRlbXBEaXYpXHJcbiAgICAgICAgdGVtcERpdi5jaGlsZE5vZGVzLmZvckVhY2goZnVuY3Rpb24gKGMpIHtcclxuICAgICAgICAgIGVsZW1BcnIucHVzaChjKVxyXG4gICAgICAgIH0pXHJcbiAgICAgIH1cclxuICAgIH0pXHJcbiAgfVxyXG5cclxuICByZXR1cm4gZWxlbUFyclxyXG59XHJcbiIsInZhciBsb29wQ2hpbGRzID0gcmVxdWlyZSgnLi9lbGVtZW50VXRpbHMnKS5sb29wQ2hpbGRzXHJcblxyXG52YXIgbmV4dCA9IGZ1bmN0aW9uIChpLCBjLCByZW0pIHtcclxuICB2YXIgaGFza1xyXG4gIHZhciBldnROYW1lXHJcbiAgdmFyIGV2dGhhbmRsZXJcclxuICB2YXIgaGFuZGxlclxyXG4gIHZhciBpc0hhbmRsZXJcclxuICB2YXIgYXJndlxyXG4gIHZhciB2XHJcbiAgdmFyIGF0dHMgPSBjLmF0dHJpYnV0ZXNcclxuXHJcbiAgaWYgKGkgPCBhdHRzLmxlbmd0aCkge1xyXG4gICAgaGFzayA9IC9eay0vLnRlc3QoYXR0c1tpXS5ub2RlTmFtZSlcclxuICAgIGlmIChoYXNrKSB7XHJcbiAgICAgIGV2dE5hbWUgPSBhdHRzW2ldLm5vZGVOYW1lLnNwbGl0KCctJylbMV1cclxuICAgICAgZXZ0aGFuZGxlciA9IGF0dHNbaV0ubm9kZVZhbHVlXHJcbiAgICAgIGhhbmRsZXIgPSBldnRoYW5kbGVyLnNwbGl0KCcoJylcclxuICAgICAgaXNIYW5kbGVyID0gdGhpc1toYW5kbGVyWzBdXVxyXG4gICAgICBpZiAodHlwZW9mIGlzSGFuZGxlciA9PT0gJ2Z1bmN0aW9uJykge1xyXG4gICAgICAgIHJlbS5wdXNoKGF0dHNbaV0ubm9kZU5hbWUpXHJcbiAgICAgICAgYXJndiA9IFtdXHJcbiAgICAgICAgdiA9IGhhbmRsZXJbMV0uc2xpY2UoMCwgLTEpLnNwbGl0KCcsJykuZmlsdGVyKGZ1bmN0aW9uIChmKSB7IHJldHVybiBmICE9PSAnJyB9KVxyXG4gICAgICAgIGlmICh2Lmxlbmd0aCkgdi5tYXAoZnVuY3Rpb24gKHYpIHsgYXJndi5wdXNoKHYpIH0pXHJcbiAgICAgICAgYy5hZGRFdmVudExpc3RlbmVyKGV2dE5hbWUsIGlzSGFuZGxlci5iaW5kLmFwcGx5KGlzSGFuZGxlci5iaW5kKHRoaXMpLCBbY10uY29uY2F0KGFyZ3YpKSwgZmFsc2UpXHJcbiAgICAgIH1cclxuICAgIH1cclxuICAgIGkrK1xyXG4gICAgbmV4dC5hcHBseSh0aGlzLCBbIGksIGMsIHJlbSBdKVxyXG4gIH0gZWxzZSB7XHJcbiAgICByZW0ubWFwKGZ1bmN0aW9uIChmKSB7IGMucmVtb3ZlQXR0cmlidXRlKGYpIH0pXHJcbiAgfVxyXG59XHJcblxyXG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uIChrTm9kZSkge1xyXG4gIHZhciBzZWxmID0gdGhpc1xyXG4gIHZhciBsaXN0S25vZGVDaGlsZCA9IFtdXHJcbiAgdmFyIHJlbSA9IFtdXHJcbiAgbG9vcENoaWxkcyhsaXN0S25vZGVDaGlsZCwga05vZGUpXHJcbiAgbGlzdEtub2RlQ2hpbGQubWFwKGZ1bmN0aW9uIChjKSB7XHJcbiAgICBpZiAoYy5ub2RlVHlwZSA9PT0gMSAmJiBjLmhhc0F0dHJpYnV0ZXMoKSkge1xyXG4gICAgICBuZXh0LmFwcGx5KHNlbGYsIFsgMCwgYywgcmVtIF0pXHJcbiAgICB9XHJcbiAgfSlcclxuICBsaXN0S25vZGVDaGlsZCA9IFtdXHJcbn1cclxuIiwiZnVuY3Rpb24ga3RhZyAoKSB7XHJcbiAgdmFyIGFyZ3MgPSBbXS5zbGljZS5jYWxsKGFyZ3VtZW50cylcclxuICB2YXIgYXR0clxyXG4gIHZhciBpZHhcclxuICB2YXIgdGVcclxuICB2YXIgcmV0ID0gWyc8JywgYXJnc1swXSwgJz4nLCBhcmdzWzFdLCAnPC8nLCBhcmdzWzBdLCAnPiddXHJcbiAgaWYgKGFyZ3MubGVuZ3RoID4gMiAmJiB0eXBlb2YgYXJnc1syXSA9PT0gJ29iamVjdCcpIHtcclxuICAgIGZvciAoYXR0ciBpbiBhcmdzWzJdKSB7XHJcbiAgICAgIGlmICh0eXBlb2YgYXJnc1syXVthdHRyXSA9PT0gJ2Jvb2xlYW4nICYmIGFyZ3NbMl1bYXR0cl0pIHtcclxuICAgICAgICByZXQuc3BsaWNlKDIsIDAsICcgJywgYXR0cilcclxuICAgICAgfSBlbHNlIGlmIChhdHRyID09PSAnY2xhc3MnICYmIEFycmF5LmlzQXJyYXkoYXJnc1syXVthdHRyXSkpIHtcclxuICAgICAgICByZXQuc3BsaWNlKDIsIDAsICcgJywgYXR0ciwgJz1cIicsIGFyZ3NbMl1bYXR0cl0uam9pbignICcpLnRyaW0oKSwgJ1wiJylcclxuICAgICAgfSBlbHNlIHtcclxuICAgICAgICByZXQuc3BsaWNlKDIsIDAsICcgJywgYXR0ciwgJz1cIicsIGFyZ3NbMl1bYXR0cl0sICdcIicpXHJcbiAgICAgIH1cclxuICAgIH1cclxuICB9XHJcbiAgaWYgKGFyZ3MubGVuZ3RoID4gMyAmJiB0eXBlb2YgYXJnc1szXSA9PT0gJ29iamVjdCcpIHtcclxuICAgIGlkeCA9IHJldC5pbmRleE9mKCc+JylcclxuICAgIHRlID0gW2lkeCwgMCwgJyBzdHlsZT1cIiddXHJcbiAgICBmb3IgKGF0dHIgaW4gYXJnc1szXSkge1xyXG4gICAgICB0ZS5wdXNoKGF0dHIpXHJcbiAgICAgIHRlLnB1c2goJzonKVxyXG4gICAgICB0ZS5wdXNoKGFyZ3NbM11bYXR0cl0pXHJcbiAgICAgIHRlLnB1c2goJzsnKVxyXG4gICAgfVxyXG4gICAgdGUucHVzaCgnXCInKVxyXG4gICAgcmV0LnNwbGljZS5hcHBseShyZXQsIHRlKVxyXG4gIH1cclxuICByZXR1cm4gcmV0XHJcbn1cclxuXHJcbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24gKCkge1xyXG4gIHJldHVybiBrdGFnLmFwcGx5KG51bGwsIGFyZ3VtZW50cykuam9pbignJylcclxufVxyXG4iLCJ2YXIgZ2VuRWxlbWVudCA9IHJlcXVpcmUoJy4vZ2VuRWxlbWVudCcpXHJcbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24gKCkge1xyXG4gIHZhciBzZWxmID0gdGhpc1xyXG4gIHZhciBjbG9uZUNoaWxkID0gW10uc2hpZnQuY2FsbChhcmd1bWVudHMpXHJcbiAgT2JqZWN0LmtleXMoY2xvbmVDaGlsZCkubWFwKGZ1bmN0aW9uIChjKSB7XHJcbiAgICB2YXIgaGRsID0gY2xvbmVDaGlsZFtjXS5tYXRjaCgve3soW157fV0rKX19L2cpXHJcbiAgICBpZiAoaGRsICYmIGhkbC5sZW5ndGgpIHtcclxuICAgICAgdmFyIHN0ciA9ICcnXHJcbiAgICAgIGhkbC5tYXAoZnVuY3Rpb24gKHMpIHtcclxuICAgICAgICB2YXIgcmVwID0gcy5yZXBsYWNlKC97eyhbXnt9XSspfX0vZywgJyQxJylcclxuICAgICAgICBpZiAoc2VsZltyZXBdICE9PSB1bmRlZmluZWQpIHtcclxuICAgICAgICAgIGdlbkVsZW1lbnQudXBkYXRlU3RhdGVMaXN0LmNhbGwoc2VsZiwgcmVwKVxyXG4gICAgICAgICAgaWYgKHNlbGZbcmVwXSA9PT0gZmFsc2UpIHtcclxuICAgICAgICAgICAgZGVsZXRlIGNsb25lQ2hpbGRbY11cclxuICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgIHN0ciArPSBzZWxmW3JlcF1cclxuICAgICAgICAgICAgY2xvbmVDaGlsZFtjXSA9IHN0clxyXG4gICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuICAgICAgfSlcclxuICAgIH1cclxuICB9KVxyXG59XHJcbiIsIm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24gKGNoaWxkLCB1cGRhdGVTdGF0ZUxpc3QpIHtcclxuICB2YXIgc2VsZiA9IHRoaXNcclxuICBpZiAoY2hpbGQuY2xhc3MpIHtcclxuICAgIHZhciBjID0gY2hpbGQuY2xhc3MubWF0Y2goL3t7KFtee31dKyl9fS9nKVxyXG4gICAgdmFyIGNsYXNzU3RyID0gJydcclxuICAgIGlmIChjICYmIGMubGVuZ3RoKSB7XHJcbiAgICAgIGMubWFwKGZ1bmN0aW9uIChzKSB7XHJcbiAgICAgICAgdmFyIHJlcCA9IHMucmVwbGFjZSgve3soW157fV0rKX19L2csICckMScpXHJcbiAgICAgICAgaWYgKHNlbGZbcmVwXSAhPT0gdW5kZWZpbmVkKSB7XHJcbiAgICAgICAgICB1cGRhdGVTdGF0ZUxpc3QocmVwKVxyXG4gICAgICAgICAgc2VsZltyZXBdLmNzdG9yZS5tYXAoZnVuY3Rpb24gKGMpIHtcclxuICAgICAgICAgICAgY2xhc3NTdHIgKz0gYyArICcgJ1xyXG4gICAgICAgICAgfSlcclxuICAgICAgICB9XHJcbiAgICAgIH0pXHJcbiAgICB9XHJcbiAgICByZXR1cm4gY2xhc3NTdHIubGVuZ3RoID8gY2xhc3NTdHIudHJpbSgpIDogY2hpbGQuY2xhc3NcclxuICB9XHJcbiAgcmV0dXJuIGZhbHNlXHJcbn1cclxuIiwibW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbiAoc3RyLCB1cGRhdGVTdGF0ZUxpc3QpIHtcclxuICB2YXIgc2VsZiA9IHRoaXNcclxuICB2YXIgYXJyUHJvcHMgPSBzdHIubWF0Y2goL3t7KFtee31dKyl9fS9nKVxyXG4gIGlmIChhcnJQcm9wcyAmJiBhcnJQcm9wcy5sZW5ndGgpIHtcclxuICAgIGFyclByb3BzLm1hcChmdW5jdGlvbiAocykge1xyXG4gICAgICB2YXIgcmVwID0gcy5yZXBsYWNlKC97eyhbXnt9XSspfX0vZywgJyQxJylcclxuICAgICAgaWYgKHNlbGZbcmVwXSAhPT0gdW5kZWZpbmVkKSB7XHJcbiAgICAgICAgdXBkYXRlU3RhdGVMaXN0KHJlcClcclxuICAgICAgICBzdHIgPSBzdHIucmVwbGFjZSgve3soW157fV0rKX19Lywgc2VsZltyZXBdKVxyXG4gICAgICB9XHJcbiAgICB9KVxyXG4gIH1cclxuICByZXR1cm4gc3RyXHJcbn1cclxuIiwidmFyIGNvcHkgPSByZXF1aXJlKCcuL2NvcHknKVxyXG5cclxubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbiAoc3R5bGVzLCB1cGRhdGVTdGF0ZUxpc3QpIHtcclxuICB2YXIgc2VsZiA9IHRoaXNcclxuICB2YXIgY29weVN0eWxlcyA9IGNvcHkoc3R5bGVzKVxyXG4gIGlmIChzdHlsZXMpIHtcclxuICAgIE9iamVjdC5rZXlzKGNvcHlTdHlsZXMpLm1hcChmdW5jdGlvbiAoc3R5bGUpIHtcclxuICAgICAgdmFyIGFyclByb3BzID0gY29weVN0eWxlc1tzdHlsZV0ubWF0Y2goL3t7KFtee31dKyl9fS9nKVxyXG4gICAgICBpZiAoYXJyUHJvcHMgJiYgYXJyUHJvcHMubGVuZ3RoKSB7XHJcbiAgICAgICAgYXJyUHJvcHMubWFwKGZ1bmN0aW9uIChzKSB7XHJcbiAgICAgICAgICB2YXIgcmVwID0gcy5yZXBsYWNlKC97eyhbXnt9XSspfX0vZywgJyQxJylcclxuICAgICAgICAgIGlmIChzZWxmW3JlcF0gIT09IHVuZGVmaW5lZCkge1xyXG4gICAgICAgICAgICB1cGRhdGVTdGF0ZUxpc3QocmVwKVxyXG4gICAgICAgICAgICBjb3B5U3R5bGVzW3N0eWxlXSA9IGNvcHlTdHlsZXNbc3R5bGVdLnJlcGxhY2UoL3t7KFtee31dKyl9fS8sIHNlbGZbcmVwXSlcclxuICAgICAgICAgIH1cclxuICAgICAgICB9KVxyXG4gICAgICB9XHJcbiAgICB9KVxyXG4gIH1cclxuICByZXR1cm4gY29weVN0eWxlc1xyXG59XHJcbiIsImV4cG9ydHMuZ2V0SWQgPSBmdW5jdGlvbiAoaWQpIHtcclxuICByZXR1cm4gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoaWQpXHJcbn1cclxuXHJcbmV4cG9ydHMuZ2VuSWQgPSBmdW5jdGlvbiAoKSB7XHJcbiAgcmV0dXJuIChNYXRoLnJvdW5kKE1hdGgucmFuZG9tKCkgKiAweDEgKiAxZTEyKSkudG9TdHJpbmcoMzIpXHJcbn1cclxuXHJcbmV4cG9ydHMuc2VsZWN0b3IgPSBmdW5jdGlvbiAoaWQpIHtcclxuICByZXR1cm4gZG9jdW1lbnQucXVlcnlTZWxlY3RvcignW2tlZXQtaWQ9XCInICsgaWQgKyAnXCJdJylcclxufVxyXG4iLCIndXNlIHN0cmljdCdcclxuLyoqXHJcbiAqIEtlZXRqcyB2My40LjQgQWxwaGEgcmVsZWFzZTogaHR0cHM6Ly9naXRodWIuY29tL2tlZXRqcy9rZWV0LmpzXHJcbiAqIE1pbmltYWxpc3QgdmlldyBsYXllciBmb3IgdGhlIHdlYlxyXG4gKlxyXG4gKiA8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDwgS2VldGpzID4+Pj4+Pj4+Pj4+Pj4+Pj4+Pj4+Pj4+Pj4+Pj4+PlxyXG4gKlxyXG4gKiBDb3B5cmlnaHQgMjAxOCwgU2hhaHJ1bCBOaXphbSBTZWxhbWF0XHJcbiAqIFJlbGVhc2VkIHVuZGVyIHRoZSBNSVQgTGljZW5zZS5cclxuICovXHJcblxyXG52YXIgZ2V0SWQgPSByZXF1aXJlKCcuL2NvbXBvbmVudHMvdXRpbHMnKS5nZXRJZFxyXG52YXIgZ2VuSWQgPSByZXF1aXJlKCcuL2NvbXBvbmVudHMvdXRpbHMnKS5nZW5JZFxyXG52YXIgc2VsZWN0b3IgPSByZXF1aXJlKCcuL2NvbXBvbmVudHMvdXRpbHMnKS5zZWxlY3RvclxyXG52YXIgcGFyc2VTdHIgPSByZXF1aXJlKCcuL2NvbXBvbmVudHMvcGFyc2VTdHInKVxyXG52YXIgZ2VuVGVtcGxhdGUgPSByZXF1aXJlKCcuL2NvbXBvbmVudHMvZ2VuVGVtcGxhdGUnKVxyXG52YXIgdXBkYXRlRWxlbSA9IHJlcXVpcmUoJy4vY29tcG9uZW50cy9lbGVtZW50VXRpbHMnKS51cGRhdGVFbGVtXHJcblxyXG52YXIgbmV4dCA9IGZ1bmN0aW9uIChpLCBlbGUsIGVscykge1xyXG4gIHZhciBzZWxmID0gdGhpc1xyXG4gIGlmIChpIDwgZWxzLmxlbmd0aCkge1xyXG4gICAgaWYgKCFlbGUuY2hpbGROb2Rlc1tpXSkgZWxlLmFwcGVuZENoaWxkKGVsc1tpXSlcclxuICAgIGkrK1xyXG4gICAgbmV4dC5hcHBseSh0aGlzLCBbIGksIGVsZSwgZWxzIF0pXHJcbiAgfSBlbHNlIHtcclxuICAgIHZhciB3YXRjaE9iamVjdCA9IGZ1bmN0aW9uIChvYmopIHtcclxuICAgICAgcmV0dXJuIG5ldyBQcm94eShvYmosIHtcclxuICAgICAgICBzZXQ6IGZ1bmN0aW9uICh0YXJnZXQsIGtleSwgdmFsdWUpIHtcclxuICAgICAgICAgIHRhcmdldFtrZXldID0gdmFsdWVcclxuICAgICAgICAgIHNlbGYuYmFzZVtrZXldID0gdGFyZ2V0W2tleV1cclxuICAgICAgICAgIHJldHVybiB0cnVlXHJcbiAgICAgICAgfSxcclxuICAgICAgICBkZWxldGVQcm9wZXJ0eTogZnVuY3Rpb24gKHRhcmdldCwga2V5KSB7XHJcbiAgICAgICAgICB2YXIgaWQgPSB0YXJnZXRba2V5XVsna2VldC1pZCddXHJcbiAgICAgICAgICB2YXIgZWwgPSBzZWxlY3RvcihpZClcclxuICAgICAgICAgIGVsICYmIGVsLnJlbW92ZSgpXHJcbiAgICAgICAgICBkZWxldGUgc2VsZi5iYXNlW2tleV1cclxuICAgICAgICAgIHJldHVybiB0cnVlXHJcbiAgICAgICAgfVxyXG4gICAgICB9KVxyXG4gICAgfVxyXG4gICAgdGhpcy5iYXNlUHJveHkgPSB3YXRjaE9iamVjdCh0aGlzLmJhc2UpXHJcblxyXG4gICAgLy8gY29tcG9uZW50IGxpZmVDeWNsZSBhZnRlciBtb3VudGluZ1xyXG4gICAgaWYgKHRoaXMuY29tcG9uZW50RGlkTW91bnQgJiYgdHlwZW9mIHRoaXMuY29tcG9uZW50RGlkTW91bnQgPT09ICdmdW5jdGlvbicpIHtcclxuICAgICAgdGhpcy5jb21wb25lbnREaWRNb3VudCgpXHJcbiAgICB9XHJcbiAgfVxyXG59XHJcblxyXG5mdW5jdGlvbiBLZWV0ICgpIHtcclxuICB0aGlzLmJhc2UgPSB7fVxyXG4gIE9iamVjdC5kZWZpbmVQcm9wZXJ0eSh0aGlzLCAnX19zdGF0ZUxpc3RfXycsIHtcclxuICAgIGVudW1lcmFibGU6IGZhbHNlLFxyXG4gICAgd3JpdGFibGU6IHRydWVcclxuICB9KVxyXG59XHJcblxyXG5LZWV0LnByb3RvdHlwZS5tb3VudCA9IGZ1bmN0aW9uIChpbnN0YW5jZSkge1xyXG4gIC8vIEJlZm9yZSB3ZSBiZWdpbiB0byBwYXJzZSBhbiBpbnN0YW5jZSwgZG8gYSBydW5kb3duIGNoZWNrc1xyXG4gIC8vIHRvIGNsZWFuIHVwIGJhY2t0aWNrIHN0cmluZyB3aGljaCB1c3VhbGx5IGhhcyBsaW5lIHNwYWNpbmdcclxuICBpZiAodHlwZW9mIGluc3RhbmNlID09PSAnb2JqZWN0Jykge1xyXG4gICAgT2JqZWN0LmtleXMoaW5zdGFuY2UpLm1hcChmdW5jdGlvbiAoa2V5KSB7XHJcbiAgICAgIGlmICh0eXBlb2YgaW5zdGFuY2Vba2V5XSA9PT0gJ3N0cmluZycpIHtcclxuICAgICAgICBpbnN0YW5jZVtrZXldID0gaW5zdGFuY2Vba2V5XS50cmltKCkucmVwbGFjZSgvXFxzKy9nLCAnICcpXHJcbiAgICAgIH0gZWxzZSBpZiAodHlwZW9mIGluc3RhbmNlW2tleV0gPT09ICdvYmplY3QnICYmIHR5cGVvZiBpbnN0YW5jZVtrZXldWyd0ZW1wbGF0ZSddID09PSAnc3RyaW5nJykge1xyXG4gICAgICAgIGluc3RhbmNlW2tleV1bJ3RlbXBsYXRlJ10gPSBpbnN0YW5jZVtrZXldWyd0ZW1wbGF0ZSddLnRyaW0oKS5yZXBsYWNlKC9cXHMrL2csICcgJylcclxuICAgICAgfVxyXG4gICAgfSlcclxuICB9XHJcbiAgdGhpcy5iYXNlID0gaW5zdGFuY2VcclxuICByZXR1cm4gdGhpc1xyXG59XHJcblxyXG5LZWV0LnByb3RvdHlwZS5mbHVzaCA9IGZ1bmN0aW9uIChpbnN0YW5jZSkge1xyXG4gIC8vIEN1c3RvbSBtZXRob2QgdG8gY2xlYW4gdXAgdGhlIGNvbXBvbmVudCBET00gdHJlZVxyXG4gIC8vIHVzZWZ1bGwgaWYgd2UgbmVlZCB0byBkbyBjbGVhbiB1cCByZXJlbmRlclxyXG4gIHZhciBlbGUgPSBnZXRJZCh0aGlzLmVsKVxyXG4gIGlmIChlbGUpIGVsZS5pbm5lckhUTUwgPSAnJ1xyXG4gIHJldHVybiB0aGlzXHJcbn1cclxuXHJcbktlZXQucHJvdG90eXBlLmxpbmsgPSBmdW5jdGlvbiAoaWQpIHtcclxuICAvLyBUaGUgdGFyZ2V0IERPTSB3aGVyZSB0aGUgcmVuZGVyaW5nIHdpbGwgdG9vayBwbGFjZS5cclxuICAvLyBXZSBjb3VsZCBhbHNvIGFwcGx5IGxpZmVDeWNsZSBtZXRob2QgYmVmb3JlIHRoZVxyXG4gIC8vIHJlbmRlciBoYXBwZW5cclxuICB0aGlzLmVsID0gaWRcclxuICBpZiAodGhpcy5jb21wb25lbnRXaWxsTW91bnQgJiYgdHlwZW9mIHRoaXMuY29tcG9uZW50V2lsbE1vdW50ID09PSAnZnVuY3Rpb24nKSB7XHJcbiAgICB0aGlzLmNvbXBvbmVudFdpbGxNb3VudCgpXHJcbiAgfVxyXG4gIHRoaXMucmVuZGVyKClcclxuICByZXR1cm4gdGhpc1xyXG59XHJcblxyXG5LZWV0LnByb3RvdHlwZS5yZW5kZXIgPSBmdW5jdGlvbiAoKSB7XHJcbiAgLy8gUmVuZGVyIHRoaXMgY29tcG9uZW50IHRvIHRoZSB0YXJnZXQgRE9NXHJcbiAgdmFyIGVsZSA9IGdldElkKHRoaXMuZWwpXHJcbiAgdmFyIGVscyA9IHBhcnNlU3RyLmFwcGx5KHRoaXMsIHRoaXMuYXJncylcclxuICBpZiAoZWxlKSB7XHJcbiAgICBuZXh0LmFwcGx5KHRoaXMsIFsgMCwgZWxlLCBlbHMgXSlcclxuICB9XHJcbiAgcmV0dXJuIHRoaXNcclxufVxyXG5cclxuS2VldC5wcm90b3R5cGUuY2x1c3RlciA9IGZ1bmN0aW9uICgpIHtcclxuICAvLyBDaGFpbiBtZXRob2QgdG8gcnVuIGV4dGVybmFsIGZ1bmN0aW9uKHMpLCB0aGlzIGJhc2ljYWxseSBzZXJ2ZVxyXG4gIC8vIGFzIGluaXRpYWxpemVyIGZvciBhbGwgY2hpbGQgY29tcG9uZW50cyB3aXRoaW4gdGhlIGluc3RhbmNlIHRyZWVcclxuICB2YXIgYXJncyA9IFtdLnNsaWNlLmNhbGwoYXJndW1lbnRzKVxyXG4gIGlmIChhcmdzLmxlbmd0aCA+IDApIHtcclxuICAgIGFyZ3MubWFwKGZ1bmN0aW9uIChmKSB7XHJcbiAgICAgIGlmICh0eXBlb2YgZiA9PT0gJ2Z1bmN0aW9uJykgZigpXHJcbiAgICB9KVxyXG4gIH1cclxufVxyXG5cclxuS2VldC5wcm90b3R5cGUuYWRkID0gZnVuY3Rpb24gKG9iaikge1xyXG4gIC8vIE1ldGhvZCB0byBhZGQgYSBuZXcgb2JqZWN0IHRvIGNvbXBvbmVudCBtb2RlbFxyXG4gIHZhciBlbGUgPSBnZXRJZCh0aGlzLmVsKVxyXG4gIGlmIChBcnJheS5pc0FycmF5KHRoaXMuYmFzZS5tb2RlbCkpIHtcclxuICAgIG9ialsna2VldC1pZCddID0gZ2VuSWQoKVxyXG4gICAgdGhpcy5iYXNlLm1vZGVsID0gdGhpcy5iYXNlLm1vZGVsLmNvbmNhdChvYmopXHJcbiAgICBlbGUuYXBwZW5kQ2hpbGQoZ2VuVGVtcGxhdGUuY2FsbCh0aGlzLCBvYmopKVxyXG4gIH1cclxufVxyXG5cclxuS2VldC5wcm90b3R5cGUuZGVzdHJveSA9IGZ1bmN0aW9uIChpZCwgYXR0cikge1xyXG4gIC8vIE1ldGhvZCB0byBkZXN0cm95IGEgc3VibW9kZWwgb2YgYSBjb21wb25lbnRcclxuICBpZiAoQXJyYXkuaXNBcnJheSh0aGlzLmJhc2UubW9kZWwpKSB7XHJcbiAgICB0aGlzLmJhc2UubW9kZWwgPSB0aGlzLmJhc2UubW9kZWwuZmlsdGVyKGZ1bmN0aW9uIChvYmosIGluZGV4KSB7XHJcbiAgICAgIGlmIChpZCA9PT0gb2JqW2F0dHJdKSB7XHJcbiAgICAgICAgdmFyIG5vZGUgPSBzZWxlY3RvcihvYmpbJ2tlZXQtaWQnXSlcclxuICAgICAgICBpZiAobm9kZSkgbm9kZS5yZW1vdmUoKVxyXG4gICAgICB9IGVsc2UgeyByZXR1cm4gb2JqIH1cclxuICAgIH0pXHJcbiAgfVxyXG59XHJcblxyXG5LZWV0LnByb3RvdHlwZS51cGRhdGUgPSBmdW5jdGlvbiAoaWQsIGF0dHIsIG5ld0F0dHIpIHtcclxuICAvLyBNZXRob2QgdG8gdXBkYXRlIGEgc3VibW9kZWwgb2YgYSBjb21wb25lbnRcclxuICB2YXIgc2VsZiA9IHRoaXNcclxuICBpZiAoQXJyYXkuaXNBcnJheSh0aGlzLmJhc2UubW9kZWwpKSB7XHJcbiAgICB0aGlzLmJhc2UubW9kZWwgPSB0aGlzLmJhc2UubW9kZWwubWFwKGZ1bmN0aW9uIChvYmosIGlkeCwgbW9kZWwpIHtcclxuICAgICAgaWYgKGlkID09PSBvYmpbYXR0cl0pIHtcclxuICAgICAgICBpZiAobmV3QXR0ciAmJiB0eXBlb2YgbmV3QXR0ciA9PT0gJ29iamVjdCcpIHtcclxuICAgICAgICAgIE9iamVjdC5hc3NpZ24ob2JqLCBuZXdBdHRyKVxyXG4gICAgICAgIH1cclxuICAgICAgICB2YXIgbm9kZSA9IHNlbGVjdG9yKG9ialsna2VldC1pZCddKVxyXG4gICAgICAgIGlmIChub2RlKSB1cGRhdGVFbGVtKG5vZGUsIGdlblRlbXBsYXRlLmNhbGwoc2VsZiwgb2JqKSlcclxuICAgICAgfVxyXG4gICAgICByZXR1cm4gb2JqXHJcbiAgICB9KVxyXG4gIH1cclxufVxyXG5cclxubW9kdWxlLmV4cG9ydHMgPSBLZWV0XHJcbiIsImNvbnN0IEtlZXQgPSByZXF1aXJlKCdrZWV0JylcclxuY29uc3QgeyBjYW1lbENhc2UgfSA9IHJlcXVpcmUoJy4vdXRpbCcpXHJcbi8vIGNvbnN0IHsgY29udGFpbmVySW5pdCwgY29udGFpbmVyIH0gPSByZXF1aXJlKCcuL2NvbnRhaW5lcicpXHJcbmNvbnN0IHsgaW5mb3JtLCBnZXRJZCB9ID0gcmVxdWlyZSgnLi91dGlsJylcclxuXHJcbi8vIGNvbnN0IHsgZm9vdGVyIH0gPSByZXF1aXJlKCcuL2Zvb3RlcicpXHJcbi8vIGNvbnN0IHsgZmlsdGVycyB9ID0gcmVxdWlyZSgnLi9maWx0ZXJzJylcclxuXHJcbmNvbnN0IGxvZyA9IGNvbnNvbGUubG9nLmJpbmQoY29uc29sZSlcclxuXHJcbmNvbnN0IGZpbHRlclBhZ2UgPSBbJ2FsbCcsICdhY3RpdmUnLCAnY29tcGxldGVkJ11cclxuXHJcbmNsYXNzIEFwcCBleHRlbmRzIEtlZXQge1xyXG4gIGNvbnN0cnVjdG9yKCkge1xyXG4gICAgc3VwZXIoKVxyXG5cclxuICAgIHRoaXMub25DaGFuZ2VzID0gW11cclxuICAgIHRoaXMuaWdub3JlTm9kZXMgPSBbJ3RvZG8tbGlzdCddXHJcbiAgICB0aGlzLnBhZ2UgPSAnQWxsJ1xyXG4gICAgdGhpcy5pc0NoZWNrZWQgPSAnJ1xyXG4gICAgdGhpcy5jb3VudCA9IDBcclxuICAgIHRoaXMucGx1cmFsID0gJydcclxuICAgIHRoaXMuY2xlYXJUb2dnbGUgPSAnbm9uZSdcclxuXHJcbiAgICBmaWx0ZXJQYWdlLm1hcChmID0+IHRoaXNbYGNfJHtmfWBdID0gJycpXHJcblxyXG4gICAgbGV0IGdlbiA9IGZhbHNlXHJcblxyXG4gICAgdGhpcy5zdWJzY3JpYmUodG9kb3MgPT4ge1xyXG4gICAgICBpZih0b2Rvcy5sZW5ndGgpe1xyXG4gICAgICAgIGlmKCFnZW4pIHtcclxuICAgICAgICAgIGdlbiA9IHRydWVcclxuICAgICAgICAgIHRoaXMuYmFzZS50b2RvYXBwLnRlbXBsYXRlID0gdG1wbChnZW4pXHJcbiAgICAgICAgICAvLyBsb2codGhpcy5iYXNlKVxyXG4gICAgICAgICAgdGhpcy5mbHVzaCgpLnJlbmRlcigpXHJcbiAgICAgICAgfVxyXG4gICAgICB9IFxyXG4gICAgICBlbHNlIGlmKCF0b2Rvcy5sZW5ndGgpe1xyXG4gICAgICAgIGlmKGdlbil7XHJcbiAgICAgICAgICBnZW4gPSBmYWxzZVxyXG4gICAgICAgICAgdGhpcy5iYXNlLnRvZG9hcHAudGVtcGxhdGUgPSB0bXBsKGdlbilcclxuICAgICAgICAgIHRoaXMuZmx1c2goKS5yZW5kZXIoKVxyXG4gICAgICAgIH1cclxuICAgICAgfVxyXG4gICAgfSlcclxuXHJcbiAgfVxyXG4gIGNvbXBvbmVudERpZE1vdW50KCl7XHJcbiAgICBpZiAod2luZG93LmxvY2F0aW9uLmhhc2ggPT0gJycpIHtcclxuICAgICAgdGhpcy51cGRhdGVVcmwoJyMvYWxsJylcclxuICAgICAgd2luZG93Lmhpc3RvcnkucHVzaFN0YXRlKHt9LCBudWxsLCAnIy9hbGwnKVxyXG4gICAgfVxyXG4gICAgd2luZG93Lm9ucG9wc3RhdGUgPSAoKSA9PiB0aGlzLnVwZGF0ZVVybCh3aW5kb3cubG9jYXRpb24uaGFzaClcclxuICB9XHJcbiAgdXBkYXRlVXJsKGhhc2gpIHtcclxuICAgIGZpbHRlclBhZ2UubWFwKGYgPT4ge1xyXG4gICAgICB0aGlzW2BjXyR7Zn1gXSA9IGhhc2guc3BsaXQoJyMvJylbMV0gPT09IGYgPyAnc2VsZWN0ZWQnIDogJydcclxuICAgICAgaWYoaGFzaC5zcGxpdCgnIy8nKVsxXSA9PT0gZikgdGhpcy5wYWdlID0gZi5uYW1lXHJcbiAgICB9KVxyXG4gIH1cclxuICBjb21wbGV0ZUFsbCgpe1xyXG5cclxuICB9XHJcbiAgY2xlYXJDb21wbGV0ZWQoKXtcclxuXHJcbiAgfVxyXG4gIHN1YnNjcmliZShzdGFjaykge1xyXG4gICAgdGhpcy5vbkNoYW5nZXMucHVzaChzdGFjaylcclxuICB9XHJcbn1cclxuXHJcbmNvbnN0IGFwcCA9IG5ldyBBcHBcclxuXHJcbmxldCBmaWx0ZXJzVG1wbCA9ICcnXHJcblxyXG5jb25zdCBmaWx0ZXJzID0gcGFnZSA9PiB7XHJcbiAgbGV0IGYgPSB7XHJcbiAgICBjbGFzc05hbWU6IGB7e2NfJHtwYWdlfX19YCxcclxuICAgIGhhc2g6ICcjLycgKyBwYWdlLFxyXG4gICAgbmFtZTogY2FtZWxDYXNlKHBhZ2UpXHJcbiAgfVxyXG4gIGZpbHRlcnNUbXBsICs9IGA8bGkgay1jbGljaz1cInVwZGF0ZVVybCgke2YuaGFzaH0pXCI+PGEgY2xhc3M9XCIke2YuY2xhc3NOYW1lfVwiIGhyZWY9XCIke2YuaGFzaH1cIj4ke2YubmFtZX08L2E+PC9saT5gXHJcbn1cclxuXHJcbmZpbHRlclBhZ2UubWFwKHBhZ2UgPT4gZmlsdGVycyhwYWdlKSlcclxuXHJcbmNvbnN0IHRtcGwgPSB0b2RvTGVuZ3RoID0+IHtcclxuICBsZXQgc3RhdGljID0gYFxyXG4gICAgPGhlYWRlciBpZD1cImhlYWRlclwiPlxyXG4gICAgICA8aDE+dG9kb3M8L2gxPlxyXG4gICAgICA8aW5wdXQgaWQ9XCJuZXctdG9kb1wiIGsta2V5ZG93bj1cImNyZWF0ZSgpXCIgcGxhY2Vob2xkZXI9XCJXaGF0IG5lZWRzIHRvIGJlIGRvbmU/XCIgYXV0b2ZvY3VzPlxyXG4gICAgPC9oZWFkZXI+XHJcbiAgYFxyXG4gIGxldCBtYWluID0gYFxyXG4gICAgPHNlY3Rpb24gaWQ9XCJtYWluXCI+XHJcbiAgICAgIDxpbnB1dCBpZD1cInRvZ2dsZS1hbGxcIiB0eXBlPVwiY2hlY2tib3hcIiB7e2lzQ2hlY2tlZH19IGstY2xpY2s9XCJjb21wbGV0ZUFsbCgpXCI+XHJcbiAgICAgIDxsYWJlbCBmb3I9XCJ0b2dnbGUtYWxsXCI+TWFyayBhbGwgYXMgY29tcGxldGU8L2xhYmVsPlxyXG4gICAgICA8IS0tIHRvZG8gbGlzdCBjb21wb25lbnQgZG9tIGVudHJ5LS0+XHJcbiAgICAgIDx1bCBpZD1cInRvZG8tbGlzdFwiPjwvdWw+XHJcbiAgICA8L3NlY3Rpb24+XHJcbiAgYFxyXG4gIGxldCBmb290ZXIgPSBgXHJcbiAgICA8Zm9vdGVyIGlkPVwiZm9vdGVyXCI+XHJcbiAgICAgIDxzcGFuIGlkPVwidG9kby1jb3VudFwiPlxyXG4gICAgICAgIDxzdHJvbmc+e3tjb3VudH19PC9zdHJvbmc+IGl0ZW17e3BsdXJhbH19IGxlZnRcclxuICAgICAgPC9zcGFuPlxyXG4gICAgICA8dWwgaWQ9XCJmaWx0ZXJzXCI+XHJcbiAgICAgICAgJHtmaWx0ZXJzVG1wbH1cclxuICAgICAgPC91bD5cclxuICAgICAgPGJ1dHRvbiBpZD1cImNsZWFyLWNvbXBsZXRlZFwiIHN0eWxlPVwiZGlzcGxheToge3tjbGVhclRvZ2dsZX19XCIgay1jbGlja2VkPVwiY2xlYXJDb21wbGV0ZWQoKVwiPkNsZWFyIGNvbXBsZXRlZDwvYnV0dG9uPlxyXG4gICAgPC9mb290ZXI+XHJcbiAgYFxyXG4gIHJldHVybiB0b2RvTGVuZ3RoID8gIHN0YXRpYy5jb25jYXQobWFpbiwgZm9vdGVyKSA6IHN0YXRpY1xyXG59XHJcblxyXG5jb25zdCB0b2RvID0ge1xyXG4gIHRvZG9hcHA6IHtcclxuICAgIHRhZzogJ3NlY3Rpb24nLFxyXG4gICAgaWQ6ICd0b2RvYXBwJyxcclxuICAgIHRlbXBsYXRlOiB0bXBsKGZhbHNlKVxyXG4gIH0sXHJcbiAgaW5mbzoge1xyXG4gICAgdGFnOiAnZm9vdGVyJyxcclxuICAgIGlkOiAnaW5mbycsXHJcbiAgICB0ZW1wbGF0ZTogYFxyXG4gICAgICA8cD5Eb3VibGUtY2xpY2sgdG8gZWRpdCBhIHRvZG88L3A+XHJcbiAgICAgIDxwPkNyZWF0ZWQgYnkgPGEgaHJlZj1cImh0dHBzOi8vZ2l0aHViLmNvbS9zeWFydWxcIj5TaGFocnVsIE5pemFtIFNlbGFtYXQ8L2E+PC9wPlxyXG4gICAgICA8cD5QYXJ0IG9mIDxhIGhyZWY9XCJodHRwOi8vdG9kb212Yy5jb21cIj5Ub2RvTVZDPC9hPjwvcD5gXHJcbiAgfVxyXG59XHJcblxyXG5hcHAubW91bnQodG9kbykubGluaygndG9kbycpLy8uY2x1c3Rlcihjb250YWluZXJJbml0KVxyXG5cclxuLy8gYXBwLnJvdXRlVXBkYXRlKClcclxuXHJcbm1vZHVsZS5leHBvcnRzID0gYXBwXHJcblxyXG5zZXRUaW1lb3V0KCgpID0+IHtcclxuICBpbmZvcm0oYXBwLCBbMV0pXHJcbiAgLy8gaW5mb3JtKGNvbnRhaW5lciwgWzFdKVxyXG4gIC8vIGluZm9ybShmb290ZXIsIFt7Y29tcGxldGVkOiAnY29tcGxldGVkJ30sIHtjb21wbGV0ZWQ6ICcnfV0pXHJcbiAgYXBwLnVwZGF0ZVVybCh3aW5kb3cubG9jYXRpb24uaGFzaClcclxufSwgMjAwMClcclxuXHJcbnNldFRpbWVvdXQoKCkgPT4ge1xyXG4gIC8vIGluZm9ybShjb250YWluZXIsIFtdKVxyXG4gIC8vIGluZm9ybShmb290ZXIsIFt7Y29tcGxldGVkOiAnY29tcGxldGVkJ30sIHtjb21wbGV0ZWQ6ICcnfV0pXHJcbiAgLy8gYXBwLnJvdXRlVXBkYXRlKClcclxufSwgNDAwMCkiLCJleHBvcnRzLmluZm9ybSA9IGZ1bmN0aW9uKGJhc2UsIGlucHV0KSB7XHJcbiAgZm9yICh2YXIgaSA9IGJhc2Uub25DaGFuZ2VzLmxlbmd0aDsgaS0tOykge1xyXG4gICAgYmFzZS5vbkNoYW5nZXNbaV0oaW5wdXQpXHJcbiAgfVxyXG59XHJcblxyXG5leHBvcnRzLnN0b3JlID0gZnVuY3Rpb24obmFtZXNwYWNlLCBkYXRhKSB7XHJcbiAgaWYgKGFyZ3VtZW50cy5sZW5ndGggPiAxKSB7XHJcbiAgICByZXR1cm4gbG9jYWxTdG9yYWdlLnNldEl0ZW0obmFtZXNwYWNlLCBKU09OLnN0cmluZ2lmeShkYXRhKSlcclxuICB9IGVsc2Uge1xyXG4gICAgdmFyIHN0b3JlID0gbG9jYWxTdG9yYWdlLmdldEl0ZW0obmFtZXNwYWNlKVxyXG4gICAgcmV0dXJuIHN0b3JlICYmIEpTT04ucGFyc2Uoc3RvcmUpIHx8IFtdXHJcbiAgfVxyXG59XHJcblxyXG5leHBvcnRzLmNhbWVsQ2FzZSA9IGZ1bmN0aW9uKHMpIHtcclxuICByZXR1cm4gcy5jaGFyQXQoMCkudG9VcHBlckNhc2UoKSArIHMuc2xpY2UoMSlcclxufVxyXG5cclxuZXhwb3J0cy5nZW5JZCA9IGZ1bmN0aW9uKCkge1xyXG4gIHJldHVybiAoTWF0aC5yb3VuZChNYXRoLnJhbmRvbSgpICogMHgxMDAwKSkudG9TdHJpbmcoMzIpXHJcbn1cclxuXHJcbmV4cG9ydHMuZ2V0SWQgPSBmdW5jdGlvbiAoaWQpIHtcclxuICByZXR1cm4gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoaWQpXHJcbn0iXX0=
