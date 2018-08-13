(function(){function r(e,n,t){function o(i,f){if(!n[i]){if(!e[i]){var c="function"==typeof require&&require;if(!f&&c)return c(i,!0);if(u)return u(i,!0);var a=new Error("Cannot find module '"+i+"'");throw a.code="MODULE_NOT_FOUND",a}var p=n[i]={exports:{}};e[i][0].call(p.exports,function(r){var n=e[i][1][r];return o(n||r)},p,p.exports,r,e,n,t)}return n[i].exports}for(var u="function"==typeof require&&require,i=0;i<t.length;i++)o(t[i]);return o}return r})()({1:[function(require,module,exports){
var assert = require('../utils').assert
var getId = require('../utils').getId
var checkNodeAvailability = require('../utils').checkNodeAvailability
var tmplHandler = require('./tmplHandler')
var cacheInit = {}
module.exports = function (componentStr, node) {
  var component = componentStr.replace('component:', '')
  var c = this[component]
  var el 
  var frag

  if (c !== undefined) {
    // this is for initial component runner
    if(!cacheInit[c.ID]){
      c.render.call(c, true)
      cacheInit[c.ID] = c.base.cloneNode(true)
      node.parentNode.replaceChild(c.base, node)
    } else {
      // we need to reattach event listeners if the node is not available on DOM
      if(!getId(this[component].el)){
        c.base = c.__pristineFragment__.cloneNode(true)
        c.render.call(c, true)
        node.parentNode.replaceChild(c.base, node)
      } else {
        node.parentNode.replaceChild(cacheInit[c.ID].cloneNode(true), node) 
      }
    }
    // inform sub-component to update
    c.callBatchPoolUpdate()
  } else {
    assert(false, 'Component ' + component + ' does not exist.')
  }
}

},{"../utils":13,"./tmplHandler":9}],2:[function(require,module,exports){
var conditionalNodesRawStart = /\{\{\?([^{}]+)\}\}/g
var conditionalNodesRawEnd = /\{\{\/([^{}]+)\}\}/g
var DOCUMENT_ELEMENT_TYPE = 1
module.exports = function (node, conditional, tmplHandler) {
  var entryNode
  var currentNode
  var isGen
  var frag = document.createDocumentFragment()
  // console.log(node)
  while (node) {
    currentNode = node
    node = node.nextSibling
    if (currentNode.nodeType !== DOCUMENT_ELEMENT_TYPE) {
      if (currentNode.nodeValue.match(conditionalNodesRawStart)) {
        entryNode = currentNode
      } else if (currentNode.nodeValue.match(conditionalNodesRawEnd)) {
        currentNode.remove()
        // star generating the conditional nodes range, if not yet
        if (!isGen) {
          isGen = true
          tmplHandler(this, null, null, null, frag)
        }
        if (this[conditional]) {
          entryNode.parentNode.insertBefore(frag, entryNode)
        }
        entryNode.remove()
        node = null
      }
    } else {
      var cNode = currentNode.cloneNode(true)
      frag.appendChild(cNode)
      currentNode.remove()
    }
  }
}

},{}],3:[function(require,module,exports){
var tmplHandler = require('./tmplHandler')
var strInterpreter = require('./strInterpreter')
var morph = require('set-dom')
var getId = require('../utils').getId

var override
var el
var DELAY = 1

var morpher = function () {
  el = getId(this.el)
  genElement.call(this)
  if(el) {
    this.IS_STUB ? morph(el, this.base.firstChild) : morph(el, this.base)
  }
  // exec life-cycle componentDidUpdate
  if (this.componentDidUpdate && typeof this.componentDidUpdate === 'function') {
    this.componentDidUpdate()
  }
}

var timer = {}
var updateContext = function(fn, delay) {

  var context = this
  timer[this.ID] = timer[this.ID] || null
  clearTimeout(timer[this.ID])
  timer[this.ID] = setTimeout(function () {
    fn.call(context)
  }, delay)
}

var nextState = function (i) {
  var state
  var value
  if (i < stateList.length) {
    state = stateList[i]
    value = this[state]

    // if value is undefined, likely has object notation we convert it to array
    if (value === undefined) value = strInterpreter(state)

    if (value && Array.isArray(value)) {
      // using split object notation as base for state update
      // console.log(value)
      var inVal = this[value[0]][value[1]]
      Object.defineProperty(this[value[0]], value[1], {
        enumerable: false,
        configurable: true,
        get: function () {
          return inVal
        },
        set: function (val) {
          inVal = val
          updateContext.call(this, morpher, DELAY)
        }.bind(this)
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
          updateContext.call(this, morpher, DELAY)
        }.bind(this)
      })
    }
    i++
    nextState.call(this, i)
  }
}

var setState = function () {
  nextState.call(this, 0)
}

var stateList = []

var clearState = function () {
  stateList = []
}

var addState = function (state) {
  if (stateList.indexOf(state) === -1) stateList = stateList.concat(state)
}

var genElement = function () {
  this.base = this.__pristineFragment__.cloneNode(true)
  tmplHandler(this, addState)
}

exports.genElement = genElement
exports.addState = addState
exports.setState = setState
exports.clearState = clearState
exports.updateContext = updateContext
exports.morpher = morpher

},{"../utils":13,"./strInterpreter":7,"./tmplHandler":9,"set-dom":11}],4:[function(require,module,exports){
var assert = require('../utils').assert
var getId = require('../utils').getId
var checkNodeAvailability = require('../utils').checkNodeAvailability
var genModelTemplate = require('./genModelTemplate')
// var morph = require('set-dom')

var re = /{{([^{}]+)}}/g

// diffing two array of objects, including object properties differences
function diff (fst, sec) {
  return fst.filter(function (obj) {
    return !sec.some(function (inr) {
      var predicate = true
      for (var attr in inr) {
        if (obj[attr] !== inr[attr]) {
          predicate = false
        }
      }
      return predicate
    })
  })
}

// check if browser support createRange
var range
if (typeof document.createRange === 'function') {
  range = document.createRange()
}

// storage for model state
var cache = {}

module.exports = function (node, model, tmplHandler) {
  
  var modelList
  var mLength
  var i
  var listClone
  var parentNode
  var m
  var documentFragment
  var updateOfNew
  var diffOfOld
  var pNode
  var ref
  var equalLength
  var child
  var list
  var str
  var oldModel
  var p

  cache[model] = cache[model] || {}

  if(!cache[model].list){
    cache[model].list = node.nextSibling.cloneNode(true)
  }
  list = cache[model].list

  if(!cache[model].str){
    cache[model].str = node.nextSibling.cloneNode(true).outerHTML
  }
  str = cache[model].str

  if(!cache[model].ref){
    if (list.hasAttribute('id') && list.id.match(re)) {
      cache[model].ref = list.id.replace(re, '$1')
      // remove the first prototype node
      node.nextSibling.remove()
      // also remove from pristine node
      p = this.__pristineFragment__.getElementById(list.id)
      if(p) p.remove()
    }
  }
  ref = cache[model].ref
  
  if (this[model] !== undefined && this[model].hasOwnProperty('list')) {

    parentNode = node.parentNode

    if (range && !parentNode.hasAttribute('data-ignore')) {
      parentNode.setAttribute('data-ignore', '')
    }

    modelList = this[model].list

    oldModel = cache[model].oldModel || []

    // check if current browser doesn't support createRange()
    if (!range) {
      i = 0
      while (i < mLength) {
        // fallback to regular node generation handler
        listClone = list.cloneNode(true)
        tmplHandler(this, null, listClone, modelList[i])
        i++
      }
    } else {
      updateOfNew = diff(modelList, oldModel)
      diffOfOld = diff(oldModel, modelList)

      function diffModel() {
        pNode =[].pop.call(arguments)
        // check if both models are equally in length
        equalLength = oldModel.length === modelList.length

        // do properties update
        if (equalLength) {
          // s('update')
          updateOfNew.map(function (obj) {
            child = pNode.querySelector('[id="' + obj[ref] + '"]')
            m = genModelTemplate(str, obj)
            documentFragment = range.createContextualFragment(m)
            // morph(child, documentFragment.firstChild)
            pNode.replaceChild(documentFragment, child)
          })
          // e('update')
        // add new objects
        } else if (updateOfNew.length > 0 && diffOfOld.length === 0) {
          // s('add')
          updateOfNew.map(function (obj) {
            m = genModelTemplate(str, obj)
            documentFragment = range.createContextualFragment(m)
            pNode.insertBefore(documentFragment, pNode.lastChild)
          })
          // e('add')
        // destroy selected objects
        } else if (updateOfNew.length === 0 && diffOfOld.length > 0) {
          // s('del')
          diffOfOld.map(function (obj) {
            child = pNode.querySelector('[id="' + obj[ref] + '"]')
            pNode.removeChild(child)
          })
          // e('del')
        }
        // replace oldModel after diffing
        cache[model].oldModel = JSON.parse(JSON.stringify(modelList))

      }

      // check existing parentNode in the DOM
      if (parentNode.hasAttribute('id')) {
        pNode = getId(parentNode.id)

        if(pNode){
          diffModel.call(this, null, null, pNode)
        } else {
          checkNodeAvailability({ el: parentNode.id }, model, diffModel.bind(this), function(){
            // we cleanup cache on failed search
            cache[model].oldModel = []
          })
        }
      }
      
    }
  } else {
    assert(false, 'Model "' + model + '" does not exist.')
  }
}

},{"../utils":13,"./genModelTemplate":5}],5:[function(require,module,exports){
var ternaryOps = require('./ternaryOps')
var re = new RegExp(/(\schecked=")(.*?)(?=")/g)
var tmpl = ''

module.exports = function (string, obj) {
  var arrProps = string.match(/{{([^{}]+)}}/g)
  var rep
  var isTernary
  tmpl = string
  for (var i = 0, len = arrProps.length; i < len; i++) {
    rep = arrProps[i].replace(/{{([^{}]+)}}/g, '$1')
    isTernary = ternaryOps.call(obj, rep)
    if (isTernary) {
      tmpl = tmpl.replace('{{' + rep + '}}', isTernary.value)
    } else {
      tmpl = tmpl.replace('{{' + rep + '}}', obj[rep])
    }

    var match = tmpl.match(re)
    if (match) {
      if (match[0].length === 17) { tmpl = tmpl.replace(' checked="checked"', ' checked') } else { tmpl = tmpl.replace(' checked=""', '') }
    }
  }
  return tmpl
}

},{"./ternaryOps":8}],6:[function(require,module,exports){
var setState = require('./genElement').setState
var tmplHandler = require('./tmplHandler')
var getId = require('../utils').getId
var addState = require('./genElement').addState
var assert = require('../utils').assert

var DOCUMENT_ELEMENT_TYPE = 1

module.exports = function (stub) {
  tmplHandler(this, addState)
  var el = stub || getId(this.el)
  if (el) {
    if(el.nodeType === DOCUMENT_ELEMENT_TYPE){
      el.setAttribute('data-ignore', '')
    } else {
      assert(this.base.childNodes.length === 1, 'Sub-component should only has a single rootNode.')
      !this.base.firstChild.hasAttribute('data-ignore') && this.base.firstChild.setAttribute('data-ignore', '')
    }
    // listen to state changes
    setState.call(this)

    // mount fragment to DOM
    if(!stub){
      el.appendChild(this.base)
    }
    
    // since component already rendered, trigger its life-cycle method
    if (this.componentDidMount && typeof this.componentDidMount === 'function') {
      this.componentDidMount()
    }
  } else {
    assert(false, 'No element with id: "' + this.el + '" exist.')
  }
}

},{"../utils":13,"./genElement":3,"./tmplHandler":9}],7:[function(require,module,exports){
module.exports = function (str) {
  var res = str.match(/\.*\./g)
  var result
  if (res && res.length > 0) {
    return str.split('.')
  }
  return result
}

},{}],8:[function(require,module,exports){
// function to resolve ternary operation

function test (str) {
  if (str === '\'\'' || str === '""' || str === 'null') { return '' }
  return str
}

module.exports = function (input) {
  if (input.match(/([^?]*)\?([^:]*):([^;]*)|(\s*=\s*)[^;]*/g)) {
    var t = input.split('?')
    var condition = t[0]
    var leftHand = t[1].split(':')[0]
    var rightHand = t[1].split(':')[1]

    // check the condition fulfillment

    if (this[condition]) {
      return {
        value: test(leftHand),
        state: condition
      }
    } else {
      return {
        value: test(rightHand),
        state: condition
      }
    }
  } else return false
}

},{}],9:[function(require,module,exports){
var strInterpreter = require('./strInterpreter')
var ternaryOps = require('./ternaryOps')
var getId = require('../utils').getId
var genModelList = require('./genModelList')
var conditionalNodes = require('./conditionalNodes')
var componentParse = require('./componentParse')

// var DOCUMENT_FRAGMENT_TYPE = 11
// var DOCUMENT_TEXT_TYPE = 3
var DOCUMENT_ELEMENT_TYPE = 1
// var DOCUMENT_COMMENT_TYPE = 8
// var DOCUMENT_ATTRIBUTE_TYPE = 2

var re = /{{([^{}]+)}}/g

var model = /^model:/g
var modelRaw = /\{\{model:([^{}]+)\}\}/g

var conditionalRe = /^\?/g

var component = /^component:([^{}]+)/g

var tmplhandler = function (ctx, updateStateList, modelInstance, modelObject, conditional) {
  window.time = new Date()
  var currentNode
  var ln
  var props
  var rep
  var fragment
  var instance
  var nodeAttributes
  var i = 0
  var a
  var ns
  var evtName
  var c
  var h
  var handlerArgs
  var argv
  var handler
  var tnr
  var modelRep
  var conditionalRep
  var fn
  var rem = []
  var isObjectNotation
  var name
  var p
  var value

  if (modelObject) {
    instance = modelInstance
  } else if (conditional) {
    instance = conditional.firstChild
  } else {
    fragment = ctx.base
    instance = fragment.firstChild
  }

  var ins = modelObject || ctx

  function updateState (state) {
    if (typeof updateStateList === 'function') {
      updateStateList(state)
    }
  }

  function valAssign (node, value, replace, withTo) {
    value = value.replace(replace, withTo)
    if(node) node.nodeValue = value
  }

  function replaceHandleBars (value, node) {
    props = value.match(re)
    ln = props.length
    while (ln) {
      ln--
      rep = props[ln].replace(re, '$1')
      tnr = ternaryOps.call(ins, rep)
      isObjectNotation = strInterpreter(rep)
      if (isObjectNotation) {
        updateState(rep)
        valAssign(node, value, '{{' + rep + '}}', ins[isObjectNotation[0]][isObjectNotation[1]])
      } else {
        if (tnr) {
          updateState(tnr.state)
          valAssign(node, value, '{{' + rep + '}}', tnr.value)
        } else {
          if (rep.match(model)) {
            modelRep = rep.replace('model:', '')
            genModelList.call(ctx, node, modelRep, tmplhandler)
          } else if (rep.match(conditionalRe)) {
            conditionalRep = rep.replace('?', '')
            if (ins[conditionalRep] !== undefined) {
              updateState(conditionalRep)
              conditionalNodes.call(ctx, node, conditionalRep, tmplhandler)
            }
          } else if (rep.match(component)) {
            componentParse.call(ctx, rep, node)
          } else {
            if (ins[rep] !== undefined) {
              updateState(rep)
              valAssign(node, value, '{{' + rep + '}}', ins[rep])
            }
          }
        }
      }
    }
  }

  function inspectAttributes (node) {
    nodeAttributes = node.attributes
    for (i = nodeAttributes.length; i--;) {
      a = nodeAttributes[i]
      name = a.localName
      ns = a.nodeValue
      if (re.test(name)) {
        node.removeAttribute(name)
        name = replaceHandleBars(name)
        node.setAttribute(name, ns)
      } else if (re.test(ns)) {
        ns = replaceHandleBars(ns)
        if (ns === '') {
          node.removeAttribute(name)
        } else {
          if (name === 'checked') {
            node.setAttribute(name, '')
          } else {
            node.setAttribute(name, ns)
          }
        }
      }
    }
  }

  function lookUpEvtNode (node) {
    // check if node is visible on DOM and has attribute evt-node
    if (node.hasAttribute('id') && getId(node.id) && node.hasAttribute('evt-node')) {
      return true
    }
    return false
  }

  function addEvent (node) {
    nodeAttributes = node.attributes

    if (lookUpEvtNode(node)) {
      // skip addding event for node that already has event
      // to allow skipping adding event the node must include `id`/
    } else {
      // only add event when node does not has one
      for (i = nodeAttributes.length; i--;) {
        a = nodeAttributes[i]
        name = a.localName
        ns = a.nodeValue
        if (/^k-/.test(name)) {
          evtName = name.replace(/^k-/, '')
          handler = ns.match(/[a-zA-Z]+(?![^(]*\))/)[0]
          c = ctx[handler]
          if (c !== undefined && typeof c === 'function') {
            h = ns.match(/\(([^{}]+)\)/)
            handlerArgs = h ? h[1] : ''
            argv = handlerArgs.split(',').filter(function (f) {
              return f !== ''
            })
            rem.push(name)
            fn = function (e) {
              e.stopPropagation()
              if (e.target !== e.currentTarget) {
                c.apply(ctx, [e.target, e])
              }
            }
            // if node is the rootNode for model, we wrap the eventListener and
            // rebuild the arguments by appending id/className util rootNode.
            if (node.hasChildNodes() && node.firstChild.nodeType !== DOCUMENT_ELEMENT_TYPE && node.firstChild.nodeValue.match(modelRaw)) {
              node.setAttribute('is-model-event-set', '')
              node.addEventListener(evtName, fn, false)
            } else {
              node.addEventListener(evtName, c.bind.apply(c.bind(ctx), [node].concat(argv)), false)
            }
            if(!node.hasAttribute('evt-node')){
              node.setAttribute('evt-node', '')
              if (node.hasAttribute('id')) {
                p = ctx.__pristineFragment__.getElementById(node.id)
                p.setAttribute('evt-node', '')
              }
            }
          }
        }
      }
    }
  }

  function check (node) {
    while (node) {
      currentNode = node
      if (currentNode.nodeType === DOCUMENT_ELEMENT_TYPE) {
        if (currentNode.hasAttributes()) {
          addEvent(currentNode)
          inspectAttributes(currentNode)
        }
        check(currentNode.firstChild)
      } else if (currentNode.nodeValue.match(re)) {
        replaceHandleBars(currentNode.nodeValue, currentNode)
      }
      node = node.nextSibling
    }
  }

  check(instance)
}

module.exports = tmplhandler

},{"../utils":13,"./componentParse":1,"./conditionalNodes":2,"./genModelList":4,"./strInterpreter":7,"./ternaryOps":8}],10:[function(require,module,exports){
'use strict'
/**
 * Keetjs v4.0.0 Alpha release: https://github.com/keetjs/keet.js
 * Minimalist view layer for the web
 *
 * <<<<<<<<<<<<<<<<<<<<<<<<<<<<<< Keetjs >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
 *
 * Copyright 2018, Shahrul Nizam Selamat
 * Released under the MIT License.
 */

window.l =  window.l || console.log.bind(console)
window.s = window.s || console.time.bind(console)
window.e = window.e || console.timeEnd.bind(console)

var parseStr = require('./components/parseStr')
var updateContext = require('./components/genElement').updateContext
var morpher = require('./components/genElement').morpher
var clearState = require('./components/genElement').clearState
var getId = require('./utils').getId
var genId = require('./utils').genId
var assert = require('./utils').assert

var DOCUMENT_FRAGMENT_TYPE = 11
var DOCUMENT_TEXT_TYPE = 3
var DOCUMENT_ELEMENT_TYPE = 1

/**
 * @description
 * The main constructor of Keet
 *
 * Basic Usage :-
 *
 *    const App extends Keet {}
 *    const app = new App()
 *    app.mount('hello world').link('app')
 *
 */
function Keet () {
  this.ID = genId()
}

Keet.prototype.mount = function (instance) {
  var base
  var tempDiv
  var frag = document.createDocumentFragment()
  // Before we begin to parse an instance, do a run-down checks
  // to clean up back-tick string which usually has line spacing.
  if (typeof instance === 'string') {
    base = instance.trim().replace(/\s+/g, ' ')
    tempDiv = document.createElement('div')
    tempDiv.innerHTML = base
    while (tempDiv.firstChild) {
      frag.appendChild(tempDiv.firstChild)
    }
  // If instance is a html element process as html entities
  } else if (typeof instance === 'object' && instance['nodeType']) {
    if (instance['nodeType'] === DOCUMENT_ELEMENT_TYPE) {
      frag.appendChild(instance)
    } else if (instance['nodeType'] === DOCUMENT_FRAGMENT_TYPE) {
      frag = instance
    } else if (instance['nodeType'] === DOCUMENT_TEXT_TYPE) {
      frag.appendChild(instance)
    } else {
      assert(false, 'Unable to parse instance, unknown type.')
    }
  } else {
    assert(false, 'Parameter is not a string or a html element.')
  }
  // we store the pristine instance in __pristineFragment__
  this.__pristineFragment__ = frag.cloneNode(true)
  this.base = frag

  // cleanup states on mount
  clearState()

  return this
}

Keet.prototype.flush = function (instance) {
  // Custom method to clean up the component DOM tree
  // useful if we need to do clean up rerender.
  var el = instance || this.el
  var ele = getId(el)
  if (ele) ele.innerHTML = ''
  return this
}

Keet.prototype.link = function (id) {
  // The target DOM where the rendering will took place.
  if (!id) assert(id, 'No id is given as parameter.')
  this.el = id
  this.render()
  return this
}

Keet.prototype.render = function (stub) {
  // life-cycle method before rendering the component
  if (this.componentWillMount && typeof this.componentWillMount === 'function') {
    this.componentWillMount()
  }

  // Render this component to the target DOM
  if(stub){
    this.IS_STUB = true
  }
  parseStr.call(this, stub)
}

Keet.prototype.cluster = function () {
  // Chain method to run external function(s), this basically serve
  // as an initializer for all non attached child components within the instance tree
  var args = [].slice.call(arguments)
  if (args.length > 0) {
    args.map(function (f) {
      if (typeof f === 'function') f()
    })
  }
}

Keet.prototype.callBatchPoolUpdate = function () {
  // force component to update, if any state / non-state
  // value changed DOM diffing will occur
  updateContext.call(this, morpher, 1)
}

Keet.prototype.subscribe = function(fn) {
  this.exec = fn
}

Keet.prototype.inform = function (model) {
  this.exec && this.exec(model)
}

module.exports = Keet

},{"./components/genElement":3,"./components/parseStr":6,"./utils":13}],11:[function(require,module,exports){
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
      if (isEqualNode(oldNode, newNode)) {
        // console.trace(oldNode)
        return
      }

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
  // console.log(a, b, isIgnored(a), isIgnored(b))
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

},{"./parse-html":12}],12:[function(require,module,exports){
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

},{}],13:[function(require,module,exports){
'use strict';

var cov_140h9s3pvc = function () {
  var path = 'D:\\distro\\preact-perf\\todomvc\\keetjs\\keet\\utils.js',
      hash = '5e4bd8a6b0f29ff00d950700eba2cb489b2d01b1',
      Function = function () {}.constructor,
      global = new Function('return this')(),
      gcv = '__coverage__',
      coverageData = {
    path: 'D:\\distro\\preact-perf\\todomvc\\keetjs\\keet\\utils.js',
    statementMap: {
      '0': {
        start: {
          line: 1,
          column: 0
        },
        end: {
          line: 6,
          column: 1
        }
      },
      '1': {
        start: {
          line: 3,
          column: 4
        },
        end: {
          line: 3,
          column: 60
        }
      },
      '2': {
        start: {
          line: 5,
          column: 2
        },
        end: {
          line: 5,
          column: 39
        }
      },
      '3': {
        start: {
          line: 8,
          column: 12
        },
        end: {
          line: 10,
          column: 1
        }
      },
      '4': {
        start: {
          line: 9,
          column: 2
        },
        end: {
          line: 9,
          column: 36
        }
      },
      '5': {
        start: {
          line: 12,
          column: 0
        },
        end: {
          line: 12,
          column: 21
        }
      },
      '6': {
        start: {
          line: 14,
          column: 0
        },
        end: {
          line: 16,
          column: 1
        }
      },
      '7': {
        start: {
          line: 15,
          column: 2
        },
        end: {
          line: 15,
          column: 25
        }
      },
      '8': {
        start: {
          line: 28,
          column: 0
        },
        end: {
          line: 47,
          column: 1
        }
      },
      '9': {
        start: {
          line: 29,
          column: 12
        },
        end: {
          line: 29,
          column: 31
        }
      },
      '10': {
        start: {
          line: 30,
          column: 14
        },
        end: {
          line: 30,
          column: 19
        }
      },
      '11': {
        start: {
          line: 31,
          column: 2
        },
        end: {
          line: 46,
          column: 3
        }
      },
      '12': {
        start: {
          line: 31,
          column: 11
        },
        end: {
          line: 31,
          column: 21
        }
      },
      '13': {
        start: {
          line: 33,
          column: 12
        },
        end: {
          line: 40,
          column: 9
        }
      },
      '14': {
        start: {
          line: 34,
          column: 6
        },
        end: {
          line: 34,
          column: 31
        }
      },
      '15': {
        start: {
          line: 35,
          column: 6
        },
        end: {
          line: 39,
          column: 7
        }
      },
      '16': {
        start: {
          line: 36,
          column: 8
        },
        end: {
          line: 36,
          column: 24
        }
      },
      '17': {
        start: {
          line: 37,
          column: 8
        },
        end: {
          line: 37,
          column: 20
        }
      },
      '18': {
        start: {
          line: 38,
          column: 8
        },
        end: {
          line: 38,
          column: 47
        }
      },
      '19': {
        start: {
          line: 42,
          column: 4
        },
        end: {
          line: 45,
          column: 11
        }
      },
      '20': {
        start: {
          line: 43,
          column: 6
        },
        end: {
          line: 43,
          column: 22
        }
      },
      '21': {
        start: {
          line: 44,
          column: 6
        },
        end: {
          line: 44,
          column: 74
        }
      },
      '22': {
        start: {
          line: 44,
          column: 64
        },
        end: {
          line: 44,
          column: 74
        }
      },
      '23': {
        start: {
          line: 58,
          column: 0
        },
        end: {
          line: 60,
          column: 1
        }
      },
      '24': {
        start: {
          line: 59,
          column: 2
        },
        end: {
          line: 59,
          column: 44
        }
      },
      '25': {
        start: {
          line: 59,
          column: 12
        },
        end: {
          line: 59,
          column: 44
        }
      },
      '26': {
        start: {
          line: 73,
          column: 0
        },
        end: {
          line: 86,
          column: 1
        }
      },
      '27': {
        start: {
          line: 74,
          column: 17
        },
        end: {
          line: 74,
          column: 41
        }
      },
      '28': {
        start: {
          line: 75,
          column: 15
        },
        end: {
          line: 75,
          column: 39
        }
      },
      '29': {
        start: {
          line: 77,
          column: 15
        },
        end: {
          line: 79,
          column: 4
        }
      },
      '30': {
        start: {
          line: 78,
          column: 4
        },
        end: {
          line: 78,
          column: 36
        }
      },
      '31': {
        start: {
          line: 81,
          column: 2
        },
        end: {
          line: 81,
          column: 30
        }
      },
      '32': {
        start: {
          line: 82,
          column: 2
        },
        end: {
          line: 84,
          column: 13
        }
      },
      '33': {
        start: {
          line: 83,
          column: 4
        },
        end: {
          line: 83,
          column: 19
        }
      },
      '34': {
        start: {
          line: 85,
          column: 2
        },
        end: {
          line: 85,
          column: 15
        }
      },
      '35': {
        start: {
          line: 99,
          column: 14
        },
        end: {
          line: 99,
          column: 16
        }
      },
      '36': {
        start: {
          line: 100,
          column: 13
        },
        end: {
          line: 100,
          column: 17
        }
      },
      '37': {
        start: {
          line: 102,
          column: 15
        },
        end: {
          line: 104,
          column: 3
        }
      },
      '38': {
        start: {
          line: 103,
          column: 4
        },
        end: {
          line: 103,
          column: 23
        }
      },
      '39': {
        start: {
          line: 111,
          column: 2
        },
        end: {
          line: 121,
          column: 4
        }
      },
      '40': {
        start: {
          line: 115,
          column: 6
        },
        end: {
          line: 115,
          column: 18
        }
      },
      '41': {
        start: {
          line: 118,
          column: 6
        },
        end: {
          line: 118,
          column: 17
        }
      },
      '42': {
        start: {
          line: 119,
          column: 6
        },
        end: {
          line: 119,
          column: 14
        }
      },
      '43': {
        start: {
          line: 131,
          column: 2
        },
        end: {
          line: 133,
          column: 3
        }
      },
      '44': {
        start: {
          line: 132,
          column: 4
        },
        end: {
          line: 132,
          column: 13
        }
      },
      '45': {
        start: {
          line: 143,
          column: 2
        },
        end: {
          line: 145,
          column: 3
        }
      },
      '46': {
        start: {
          line: 144,
          column: 4
        },
        end: {
          line: 144,
          column: 37
        }
      },
      '47': {
        start: {
          line: 156,
          column: 2
        },
        end: {
          line: 160,
          column: 3
        }
      },
      '48': {
        start: {
          line: 157,
          column: 4
        },
        end: {
          line: 159,
          column: 6
        }
      },
      '49': {
        start: {
          line: 158,
          column: 6
        },
        end: {
          line: 158,
          column: 88
        }
      },
      '50': {
        start: {
          line: 171,
          column: 2
        },
        end: {
          line: 175,
          column: 3
        }
      },
      '51': {
        start: {
          line: 172,
          column: 4
        },
        end: {
          line: 174,
          column: 6
        }
      },
      '52': {
        start: {
          line: 173,
          column: 6
        },
        end: {
          line: 173,
          column: 36
        }
      },
      '53': {
        start: {
          line: 178,
          column: 0
        },
        end: {
          line: 178,
          column: 33
        }
      }
    },
    fnMap: {
      '0': {
        name: '(anonymous_0)',
        decl: {
          start: {
            line: 1,
            column: 16
          },
          end: {
            line: 1,
            column: 17
          }
        },
        loc: {
          start: {
            line: 1,
            column: 26
          },
          end: {
            line: 6,
            column: 1
          }
        },
        line: 1
      },
      '1': {
        name: 'gen',
        decl: {
          start: {
            line: 2,
            column: 11
          },
          end: {
            line: 2,
            column: 14
          }
        },
        loc: {
          start: {
            line: 2,
            column: 16
          },
          end: {
            line: 4,
            column: 3
          }
        },
        line: 2
      },
      '2': {
        name: '(anonymous_2)',
        decl: {
          start: {
            line: 8,
            column: 12
          },
          end: {
            line: 8,
            column: 13
          }
        },
        loc: {
          start: {
            line: 8,
            column: 26
          },
          end: {
            line: 10,
            column: 1
          }
        },
        line: 8
      },
      '3': {
        name: '(anonymous_3)',
        decl: {
          start: {
            line: 14,
            column: 20
          },
          end: {
            line: 14,
            column: 21
          }
        },
        loc: {
          start: {
            line: 14,
            column: 36
          },
          end: {
            line: 16,
            column: 1
          }
        },
        line: 14
      },
      '4': {
        name: '(anonymous_4)',
        decl: {
          start: {
            line: 28,
            column: 32
          },
          end: {
            line: 28,
            column: 33
          }
        },
        loc: {
          start: {
            line: 28,
            column: 88
          },
          end: {
            line: 47,
            column: 1
          }
        },
        line: 28
      },
      '5': {
        name: '(anonymous_5)',
        decl: {
          start: {
            line: 33,
            column: 24
          },
          end: {
            line: 33,
            column: 25
          }
        },
        loc: {
          start: {
            line: 33,
            column: 36
          },
          end: {
            line: 40,
            column: 5
          }
        },
        line: 33
      },
      '6': {
        name: '(anonymous_6)',
        decl: {
          start: {
            line: 42,
            column: 15
          },
          end: {
            line: 42,
            column: 16
          }
        },
        loc: {
          start: {
            line: 42,
            column: 27
          },
          end: {
            line: 45,
            column: 5
          }
        },
        line: 42
      },
      '7': {
        name: '(anonymous_7)',
        decl: {
          start: {
            line: 58,
            column: 17
          },
          end: {
            line: 58,
            column: 18
          }
        },
        loc: {
          start: {
            line: 58,
            column: 37
          },
          end: {
            line: 60,
            column: 1
          }
        },
        line: 58
      },
      '8': {
        name: 'html',
        decl: {
          start: {
            line: 73,
            column: 24
          },
          end: {
            line: 73,
            column: 28
          }
        },
        loc: {
          start: {
            line: 73,
            column: 32
          },
          end: {
            line: 86,
            column: 1
          }
        },
        line: 73
      },
      '9': {
        name: '(anonymous_9)',
        decl: {
          start: {
            line: 77,
            column: 35
          },
          end: {
            line: 77,
            column: 36
          }
        },
        loc: {
          start: {
            line: 77,
            column: 58
          },
          end: {
            line: 79,
            column: 3
          }
        },
        line: 77
      },
      '10': {
        name: '(anonymous_10)',
        decl: {
          start: {
            line: 82,
            column: 22
          },
          end: {
            line: 82,
            column: 23
          }
        },
        loc: {
          start: {
            line: 82,
            column: 35
          },
          end: {
            line: 84,
            column: 3
          }
        },
        line: 82
      },
      '11': {
        name: 'createModel',
        decl: {
          start: {
            line: 98,
            column: 9
          },
          end: {
            line: 98,
            column: 20
          }
        },
        loc: {
          start: {
            line: 98,
            column: 24
          },
          end: {
            line: 176,
            column: 1
          }
        },
        line: 98
      },
      '12': {
        name: '(anonymous_12)',
        decl: {
          start: {
            line: 102,
            column: 15
          },
          end: {
            line: 102,
            column: 16
          }
        },
        loc: {
          start: {
            line: 102,
            column: 27
          },
          end: {
            line: 104,
            column: 3
          }
        },
        line: 102
      },
      '13': {
        name: '(anonymous_13)',
        decl: {
          start: {
            line: 114,
            column: 9
          },
          end: {
            line: 114,
            column: 10
          }
        },
        loc: {
          start: {
            line: 114,
            column: 21
          },
          end: {
            line: 116,
            column: 5
          }
        },
        line: 114
      },
      '14': {
        name: '(anonymous_14)',
        decl: {
          start: {
            line: 117,
            column: 9
          },
          end: {
            line: 117,
            column: 10
          }
        },
        loc: {
          start: {
            line: 117,
            column: 24
          },
          end: {
            line: 120,
            column: 5
          }
        },
        line: 117
      },
      '15': {
        name: '(anonymous_15)',
        decl: {
          start: {
            line: 131,
            column: 19
          },
          end: {
            line: 131,
            column: 20
          }
        },
        loc: {
          start: {
            line: 131,
            column: 33
          },
          end: {
            line: 133,
            column: 3
          }
        },
        line: 131
      },
      '16': {
        name: '(anonymous_16)',
        decl: {
          start: {
            line: 143,
            column: 13
          },
          end: {
            line: 143,
            column: 14
          }
        },
        loc: {
          start: {
            line: 143,
            column: 28
          },
          end: {
            line: 145,
            column: 3
          }
        },
        line: 143
      },
      '17': {
        name: '(anonymous_17)',
        decl: {
          start: {
            line: 156,
            column: 16
          },
          end: {
            line: 156,
            column: 17
          }
        },
        loc: {
          start: {
            line: 156,
            column: 47
          },
          end: {
            line: 160,
            column: 3
          }
        },
        line: 156
      },
      '18': {
        name: '(anonymous_18)',
        decl: {
          start: {
            line: 157,
            column: 30
          },
          end: {
            line: 157,
            column: 31
          }
        },
        loc: {
          start: {
            line: 157,
            column: 45
          },
          end: {
            line: 159,
            column: 5
          }
        },
        line: 157
      },
      '19': {
        name: '(anonymous_19)',
        decl: {
          start: {
            line: 171,
            column: 17
          },
          end: {
            line: 171,
            column: 18
          }
        },
        loc: {
          start: {
            line: 171,
            column: 44
          },
          end: {
            line: 175,
            column: 3
          }
        },
        line: 171
      },
      '20': {
        name: '(anonymous_20)',
        decl: {
          start: {
            line: 172,
            column: 33
          },
          end: {
            line: 172,
            column: 34
          }
        },
        loc: {
          start: {
            line: 172,
            column: 48
          },
          end: {
            line: 174,
            column: 5
          }
        },
        line: 172
      }
    },
    branchMap: {
      '0': {
        loc: {
          start: {
            line: 31,
            column: 2
          },
          end: {
            line: 46,
            column: 3
          }
        },
        type: 'if',
        locations: [{
          start: {
            line: 31,
            column: 2
          },
          end: {
            line: 46,
            column: 3
          }
        }, {
          start: {
            line: 31,
            column: 2
          },
          end: {
            line: 46,
            column: 3
          }
        }],
        line: 31
      },
      '1': {
        loc: {
          start: {
            line: 35,
            column: 6
          },
          end: {
            line: 39,
            column: 7
          }
        },
        type: 'if',
        locations: [{
          start: {
            line: 35,
            column: 6
          },
          end: {
            line: 39,
            column: 7
          }
        }, {
          start: {
            line: 35,
            column: 6
          },
          end: {
            line: 39,
            column: 7
          }
        }],
        line: 35
      },
      '2': {
        loc: {
          start: {
            line: 44,
            column: 6
          },
          end: {
            line: 44,
            column: 74
          }
        },
        type: 'if',
        locations: [{
          start: {
            line: 44,
            column: 6
          },
          end: {
            line: 44,
            column: 74
          }
        }, {
          start: {
            line: 44,
            column: 6
          },
          end: {
            line: 44,
            column: 74
          }
        }],
        line: 44
      },
      '3': {
        loc: {
          start: {
            line: 44,
            column: 10
          },
          end: {
            line: 44,
            column: 62
          }
        },
        type: 'binary-expr',
        locations: [{
          start: {
            line: 44,
            column: 10
          },
          end: {
            line: 44,
            column: 16
          }
        }, {
          start: {
            line: 44,
            column: 20
          },
          end: {
            line: 44,
            column: 28
          }
        }, {
          start: {
            line: 44,
            column: 32
          },
          end: {
            line: 44,
            column: 62
          }
        }],
        line: 44
      },
      '4': {
        loc: {
          start: {
            line: 59,
            column: 2
          },
          end: {
            line: 59,
            column: 44
          }
        },
        type: 'if',
        locations: [{
          start: {
            line: 59,
            column: 2
          },
          end: {
            line: 59,
            column: 44
          }
        }, {
          start: {
            line: 59,
            column: 2
          },
          end: {
            line: 59,
            column: 44
          }
        }],
        line: 59
      },
      '5': {
        loc: {
          start: {
            line: 103,
            column: 4
          },
          end: {
            line: 103,
            column: 23
          }
        },
        type: 'binary-expr',
        locations: [{
          start: {
            line: 103,
            column: 4
          },
          end: {
            line: 103,
            column: 8
          }
        }, {
          start: {
            line: 103,
            column: 12
          },
          end: {
            line: 103,
            column: 23
          }
        }],
        line: 103
      },
      '6': {
        loc: {
          start: {
            line: 158,
            column: 13
          },
          end: {
            line: 158,
            column: 88
          }
        },
        type: 'cond-expr',
        locations: [{
          start: {
            line: 158,
            column: 53
          },
          end: {
            line: 158,
            column: 56
          }
        }, {
          start: {
            line: 158,
            column: 59
          },
          end: {
            line: 158,
            column: 88
          }
        }],
        line: 158
      }
    },
    s: {
      '0': 0,
      '1': 0,
      '2': 0,
      '3': 0,
      '4': 0,
      '5': 0,
      '6': 0,
      '7': 0,
      '8': 0,
      '9': 0,
      '10': 0,
      '11': 0,
      '12': 0,
      '13': 0,
      '14': 0,
      '15': 0,
      '16': 0,
      '17': 0,
      '18': 0,
      '19': 0,
      '20': 0,
      '21': 0,
      '22': 0,
      '23': 0,
      '24': 0,
      '25': 0,
      '26': 0,
      '27': 0,
      '28': 0,
      '29': 0,
      '30': 0,
      '31': 0,
      '32': 0,
      '33': 0,
      '34': 0,
      '35': 0,
      '36': 0,
      '37': 0,
      '38': 0,
      '39': 0,
      '40': 0,
      '41': 0,
      '42': 0,
      '43': 0,
      '44': 0,
      '45': 0,
      '46': 0,
      '47': 0,
      '48': 0,
      '49': 0,
      '50': 0,
      '51': 0,
      '52': 0,
      '53': 0
    },
    f: {
      '0': 0,
      '1': 0,
      '2': 0,
      '3': 0,
      '4': 0,
      '5': 0,
      '6': 0,
      '7': 0,
      '8': 0,
      '9': 0,
      '10': 0,
      '11': 0,
      '12': 0,
      '13': 0,
      '14': 0,
      '15': 0,
      '16': 0,
      '17': 0,
      '18': 0,
      '19': 0,
      '20': 0
    },
    b: {
      '0': [0, 0],
      '1': [0, 0],
      '2': [0, 0],
      '3': [0, 0, 0],
      '4': [0, 0],
      '5': [0, 0],
      '6': [0, 0]
    },
    _coverageSchema: '332fd63041d2c1bcb487cc26dd0d5f7d97098a6c'
  },
      coverage = global[gcv] || (global[gcv] = {});

  if (coverage[path] && coverage[path].hash === hash) {
    return coverage[path];
  }

  coverageData.hash = hash;
  return coverage[path] = coverageData;
}();

cov_140h9s3pvc.s[0]++;
exports.genId = function () {
  cov_140h9s3pvc.f[0]++;

  function gen() {
    cov_140h9s3pvc.f[1]++;
    cov_140h9s3pvc.s[1]++;

    return (Math.random() * 1 * 1e17).toString(36).toUpperCase();
  }
  cov_140h9s3pvc.s[2]++;
  return 'KDATA-' + gen() + '-' + gen();
};

cov_140h9s3pvc.s[3]++;
var getId = function getId(id) {
  cov_140h9s3pvc.f[2]++;
  cov_140h9s3pvc.s[4]++;

  return document.getElementById(id);
};

cov_140h9s3pvc.s[5]++;
exports.getId = getId;

cov_140h9s3pvc.s[6]++;
exports.testEvent = function (tmpl) {
  cov_140h9s3pvc.f[3]++;
  cov_140h9s3pvc.s[7]++;

  return (/ k-/.test(tmpl)
  );
};

/**
 * @private
 * @description
 * Check a node availability in 100ms, if not found silenty skip the event
 * or execute a callback
 *
 * @param {string} id - the node id
 * @param {function} callback - the function to execute on success
 * @param {function} notFound - the function to execute on failed
 */
cov_140h9s3pvc.s[8]++;
exports.checkNodeAvailability = function (component, componentName, callback, notFound) {
  cov_140h9s3pvc.f[4]++;

  var ele = (cov_140h9s3pvc.s[9]++, getId(component.el));
  var found = (cov_140h9s3pvc.s[10]++, false);
  cov_140h9s3pvc.s[11]++;
  if (ele) {
      cov_140h9s3pvc.b[0][0]++;
      cov_140h9s3pvc.s[12]++;
      return ele;
    } else {
    cov_140h9s3pvc.b[0][1]++;

    var t = (cov_140h9s3pvc.s[13]++, setInterval(function () {
      cov_140h9s3pvc.f[5]++;
      cov_140h9s3pvc.s[14]++;

      ele = getId(component.el);
      cov_140h9s3pvc.s[15]++;
      if (ele) {
        cov_140h9s3pvc.b[1][0]++;
        cov_140h9s3pvc.s[16]++;

        clearInterval(t);
        cov_140h9s3pvc.s[17]++;
        found = true;
        cov_140h9s3pvc.s[18]++;
        callback(component, componentName, ele);
      } else {
        cov_140h9s3pvc.b[1][1]++;
      }
    }, 0));
    // silently ignore finding the node after sometimes
    cov_140h9s3pvc.s[19]++;
    setTimeout(function () {
      cov_140h9s3pvc.f[6]++;
      cov_140h9s3pvc.s[20]++;

      clearInterval(t);
      cov_140h9s3pvc.s[21]++;
      if ((cov_140h9s3pvc.b[3][0]++, !found) && (cov_140h9s3pvc.b[3][1]++, notFound) && (cov_140h9s3pvc.b[3][2]++, typeof notFound === 'function')) {
          cov_140h9s3pvc.b[2][0]++;
          cov_140h9s3pvc.s[22]++;
          notFound();
        } else {
        cov_140h9s3pvc.b[2][1]++;
      }
    }, 100);
  }
};

/**
 * @private
 * @description
 * Confirm that a value is truthy, throws an error message otherwise.
 *
 * @param {*} val - the val to test.
 * @param {string} msg - the error message on failure.
 * @throws {Error}
 */
cov_140h9s3pvc.s[23]++;
exports.assert = function (val, msg) {
  cov_140h9s3pvc.f[7]++;
  cov_140h9s3pvc.s[24]++;

  if (!val) {
      cov_140h9s3pvc.b[4][0]++;
      cov_140h9s3pvc.s[25]++;
      throw new Error('(keet) ' + msg);
    } else {
    cov_140h9s3pvc.b[4][1]++;
  }
};

/**
 * @private
 * @description
 * Simple html template literals MODIFIED from : http://2ality.com/2015/01/template-strings-html.html
 * by Dr. Axel Rauschmayer
 * no checking for wrapping in root element
 * no strict checking
 * remove spacing / indentation
 * keep all spacing within html tags
 * include handling ${} in the literals
 */
cov_140h9s3pvc.s[26]++;
exports.html = function html() {
  cov_140h9s3pvc.f[8]++;

  var literals = (cov_140h9s3pvc.s[27]++, [].shift.call(arguments));
  var substs = (cov_140h9s3pvc.s[28]++, [].slice.call(arguments));

  var result = (cov_140h9s3pvc.s[29]++, literals.raw.reduce(function (acc, lit, i) {
    cov_140h9s3pvc.f[9]++;
    cov_140h9s3pvc.s[30]++;

    return acc + substs[i - 1] + lit;
  }));
  // remove spacing, indentation from every line
  cov_140h9s3pvc.s[31]++;
  result = result.split(/\n+/);
  cov_140h9s3pvc.s[32]++;
  result = result.map(function (t) {
    cov_140h9s3pvc.f[10]++;
    cov_140h9s3pvc.s[33]++;

    return t.trim();
  }).join('');
  cov_140h9s3pvc.s[34]++;
  return result;
};

/**
 * @private
 * @description
 * Copy with modification from preact-todomvc. Model constructor with
 * registering callback listener in Object.defineProperty. Any modification
 * to ```this.list``` instance will subsequently inform all registered listener.
 *
 * {{model:<myModel>}}<myModelTemplateString>{{/model:<myModel>}}
 *
 */
function createModel() {
  cov_140h9s3pvc.f[11]++;

  var model = (cov_140h9s3pvc.s[35]++, []);
  var exec = (cov_140h9s3pvc.s[36]++, null);

  cov_140h9s3pvc.s[37]++;
  var inform = function inform() {
    cov_140h9s3pvc.f[12]++;
    cov_140h9s3pvc.s[38]++;

    (cov_140h9s3pvc.b[5][0]++, exec) && (cov_140h9s3pvc.b[5][1]++, exec(model));
  };

  /**
   * @private
   * @description
   * Register callback listener of any changes
   */
  cov_140h9s3pvc.s[39]++;
  Object.defineProperty(this, 'list', {
    enumerable: false,
    configurable: true,
    get: function get() {
      cov_140h9s3pvc.f[13]++;
      cov_140h9s3pvc.s[40]++;

      return model;
    },
    set: function set(val) {
      cov_140h9s3pvc.f[14]++;
      cov_140h9s3pvc.s[41]++;

      model = val;
      cov_140h9s3pvc.s[42]++;
      inform();
    }
  });

  /**
   * @private
   * @description
   * Subscribe to the model changes (add/update/destroy)
   *
   * @param {Object} model - the model including all prototypes
   *
   */
  cov_140h9s3pvc.s[43]++;
  this.subscribe = function (fn) {
    cov_140h9s3pvc.f[15]++;
    cov_140h9s3pvc.s[44]++;

    exec = fn;
  };

  /**
   * @private
   * @description
   * Add new object to the model list
   *
   * @param {Object} obj - new object to add into the model list
   *
   */
  cov_140h9s3pvc.s[45]++;
  this.add = function (obj) {
    cov_140h9s3pvc.f[16]++;
    cov_140h9s3pvc.s[46]++;

    this.list = this.list.concat(obj);
  };

  /**
   * @private
   * @description
   * Update existing object in the model list
   *
   * @param {String} lookupId - lookup id property name of the object
   * @param {Object} updateObj - the updated properties
   *
   */
  cov_140h9s3pvc.s[47]++;
  this.update = function (lookupId, updateObj) {
    cov_140h9s3pvc.f[17]++;
    cov_140h9s3pvc.s[48]++;

    this.list = this.list.map(function (obj) {
      cov_140h9s3pvc.f[18]++;
      cov_140h9s3pvc.s[49]++;

      return obj[lookupId] !== updateObj[lookupId] ? (cov_140h9s3pvc.b[6][0]++, obj) : (cov_140h9s3pvc.b[6][1]++, Object.assign(obj, updateObj));
    });
  };

  /**
   * @private
   * @description
   * Removed existing object in the model list
   *
   * @param {String} lookupId - lookup id property name of the object
   * @param {String} objId - unique identifier of the lookup id
   *
   */
  cov_140h9s3pvc.s[50]++;
  this.destroy = function (lookupId, objId) {
    cov_140h9s3pvc.f[19]++;
    cov_140h9s3pvc.s[51]++;

    this.list = this.list.filter(function (obj) {
      cov_140h9s3pvc.f[20]++;
      cov_140h9s3pvc.s[52]++;

      return obj[lookupId] !== objId;
    });
  };
}

cov_140h9s3pvc.s[53]++;
exports.createModel = createModel;

},{}],14:[function(require,module,exports){
'use strict';

var _templateObject = babelHelpers.taggedTemplateLiteral(['\n  <section class="todoapp">\n    <header id="header">\n      <h1>todos</h1>\n      <input id="new-todo" class="new-todo" k-keydown="create()" placeholder="What needs to be done?" autofocus>\n    </header>\n    <!-- {{?todoState}} -->\n    <section class="main">\n      <input id="toggle-all" class="toggle-all" type="checkbox" checked="{{isChecked?checked:\'\'}}" k-click="completeAll()">\n      <label for="toggle-all">Mark all as complete</label>\n      <!-- {{component:todoApp}} -->\n    </section>\n    <footer class="footer">\n      <span class="todo-count">\n        <strong>{{count}}</strong> item{{plural}} left\n      </span>\n      <!-- {{component:filter}} -->\n      <!-- {{?clearToggle}} -->\n      <button id="clear-completed" class="clear-completed">Clear completed</button>\n      <!-- {{/clearToggle}} -->\n    </footer>\n    <!-- {{/todoState}} -->\n  </section>\n  <footer class="info">\n    <p>Double-click to edit a todo</p>\n    <p>Created by <a href="https://github.com/syarul">Shahrul Nizam Selamat</a></p>\n    <p>Part of <a href="http://todomvc.com">TodoMVC</a></p>\n  </footer>'], ['\n  <section class="todoapp">\n    <header id="header">\n      <h1>todos</h1>\n      <input id="new-todo" class="new-todo" k-keydown="create()" placeholder="What needs to be done?" autofocus>\n    </header>\n    <!-- {{?todoState}} -->\n    <section class="main">\n      <input id="toggle-all" class="toggle-all" type="checkbox" checked="{{isChecked?checked:\'\'}}" k-click="completeAll()">\n      <label for="toggle-all">Mark all as complete</label>\n      <!-- {{component:todoApp}} -->\n    </section>\n    <footer class="footer">\n      <span class="todo-count">\n        <strong>{{count}}</strong> item{{plural}} left\n      </span>\n      <!-- {{component:filter}} -->\n      <!-- {{?clearToggle}} -->\n      <button id="clear-completed" class="clear-completed">Clear completed</button>\n      <!-- {{/clearToggle}} -->\n    </footer>\n    <!-- {{/todoState}} -->\n  </section>\n  <footer class="info">\n    <p>Double-click to edit a todo</p>\n    <p>Created by <a href="https://github.com/syarul">Shahrul Nizam Selamat</a></p>\n    <p>Part of <a href="http://todomvc.com">TodoMVC</a></p>\n  </footer>']);

var _keet = require('../keet');

var _keet2 = babelHelpers.interopRequireDefault(_keet);

var _utils = require('../keet/utils');

var _util = require('./util');

var _filter = require('./filter');

var _filter2 = babelHelpers.interopRequireDefault(_filter);

var _todo = require('./todo');

var _todo2 = babelHelpers.interopRequireDefault(_todo);

var App = function (_Keet) {
  babelHelpers.inherits(App, _Keet);

  function App() {
    var _ref;

    var _temp, _this, _ret;

    babelHelpers.classCallCheck(this, App);

    for (var _len = arguments.length, args = Array(_len), _key = 0; _key < _len; _key++) {
      args[_key] = arguments[_key];
    }

    return _ret = (_temp = (_this = babelHelpers.possibleConstructorReturn(this, (_ref = App.__proto__ || Object.getPrototypeOf(App)).call.apply(_ref, [this].concat(args))), _this), _this.todoApp = _todo2.default, _this.filter = _filter2.default, _this.isChecked = false, _this.count = 0, _this.plural = '', _this.clearToggle = false, _this.todoState = false, _temp), babelHelpers.possibleConstructorReturn(_this, _ret);
  }

  babelHelpers.createClass(App, [{
    key: 'componentWillMount',
    value: function componentWillMount() {
      var _this2 = this;

      _todo2.default.subscribe(function (todos) {
        var uncompleted = todos.filter(function (c) {
          return !c.completed;
        });
        var completed = todos.filter(function (c) {
          return c.completed;
        });
        _this2.clearToggle = completed.length ? true : false;
        _this2.todoState = todos.length ? true : false;
        _this2.plural = uncompleted.length === 1 ? '' : 's';
        _this2.count = uncompleted.length;
      });
    }
  }, {
    key: 'create',
    value: function create(evt) {
      if (evt.keyCode !== 13) return;
      evt.preventDefault();
      var title = evt.target.value.trim();
      if (title) {
        this.todoApp.addTodo({ id: (0, _util.genId)(), title: title, completed: false });
        evt.target.value = '';
      }
    }
  }, {
    key: 'completeAll',
    value: function completeAll() {
      this.isChecked = !this.isChecked;
      // this.todoApp.updateAll(this.isChecked)
    }
  }, {
    key: 'clearCompleted',
    value: function clearCompleted() {
      this.todoApp.clearCompleted();
    }
  }, {
    key: 'editMode',
    value: function editMode() {}
  }]);
  return App;
}(_keet2.default);

var vmodel = (0, _utils.html)(_templateObject);

var app = new App();

app.mount(vmodel).link('todo');

},{"../keet":10,"../keet/utils":13,"./filter":16,"./todo":18,"./util":19}],15:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _util = require('./util');

var _utils = require('../keet/utils');

var CreateFilterModel = function (_createModel) {
  babelHelpers.inherits(CreateFilterModel, _createModel);

  function CreateFilterModel() {
    babelHelpers.classCallCheck(this, CreateFilterModel);
    return babelHelpers.possibleConstructorReturn(this, (CreateFilterModel.__proto__ || Object.getPrototypeOf(CreateFilterModel)).apply(this, arguments));
  }

  babelHelpers.createClass(CreateFilterModel, [{
    key: 'switch',
    value: function _switch(hash, obj) {
      this.list = this.list.map(function (filter) {
        return filter.hash === hash ? babelHelpers.extends({}, filter, obj) : babelHelpers.extends({}, filter, { selected: false });
      });
    }
  }]);
  return CreateFilterModel;
}(_utils.createModel);

var filterModel = new CreateFilterModel();

Array.from(['all', 'active', 'completed']).map(function (page) {
  return filterModel.add({
    hash: '#/' + page,
    name: (0, _util.camelCase)(page),
    selected: false
  });
});

exports.default = filterModel;

},{"../keet/utils":13,"./util":19}],16:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _templateObject = babelHelpers.taggedTemplateLiteral(['\n\t<ul id="filters" class="filters">\n\t\t<!-- {{model:filterModel}} -->\n\t\t<li id="{{name}}" k-click="updateUrl({{hash}})"><a class="{{selected?selected:\'\'}}" href="{{hash}}">{{name}}</a></li>\n\t\t<!-- {{/model:filterModel}} -->\n\t</ul>\n'], ['\n\t<ul id="filters" class="filters">\n\t\t<!-- {{model:filterModel}} -->\n\t\t<li id="{{name}}" k-click="updateUrl({{hash}})"><a class="{{selected?selected:\'\'}}" href="{{hash}}">{{name}}</a></li>\n\t\t<!-- {{/model:filterModel}} -->\n\t</ul>\n']);

var _keet = require('../keet');

var _keet2 = babelHelpers.interopRequireDefault(_keet);

var _utils = require('../keet/utils');

var _filterModel = require('./filter-model');

var _filterModel2 = babelHelpers.interopRequireDefault(_filterModel);

var App = function (_Keet) {
  babelHelpers.inherits(App, _Keet);

  function App() {
    var _ref;

    var _temp, _this, _ret;

    babelHelpers.classCallCheck(this, App);

    for (var _len = arguments.length, args = Array(_len), _key = 0; _key < _len; _key++) {
      args[_key] = arguments[_key];
    }

    return _ret = (_temp = (_this = babelHelpers.possibleConstructorReturn(this, (_ref = App.__proto__ || Object.getPrototypeOf(App)).call.apply(_ref, [this].concat(args))), _this), _this.el = 'filters', _this.filterModel = _filterModel2.default, _temp), babelHelpers.possibleConstructorReturn(_this, _ret);
  }

  babelHelpers.createClass(App, [{
    key: 'componentWillMount',
    value: function componentWillMount() {
      var _this2 = this;

      this.filterModel.subscribe(function (model) {
        return _this2.callBatchPoolUpdate();
      });
      if (window.location.hash == '') {
        window.history.pushState({}, null, '#/all');
      }
    }
  }, {
    key: 'componentDidMount',
    value: function componentDidMount() {
      var _this3 = this;

      this.updateUrl(window.location.hash);
      window.onpopstate = function () {
        return _this3.updateUrl(window.location.hash);
      };
    }
  }, {
    key: 'updateUrl',
    value: function updateUrl(hash) {
      this.filterModel.switch(hash, { selected: true });
    }
  }]);
  return App;
}(_keet2.default);

var filterApp = new App();

var vmodel = (0, _utils.html)(_templateObject);

filterApp.mount(vmodel);

exports.default = filterApp;

},{"../keet":10,"../keet/utils":13,"./filter-model":15}],17:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _keet = require('../keet');

var _keet2 = babelHelpers.interopRequireDefault(_keet);

var _utils = require('../keet/utils');

var CreateModel = function (_createModel) {
  babelHelpers.inherits(CreateModel, _createModel);

  function CreateModel() {
    babelHelpers.classCallCheck(this, CreateModel);
    return babelHelpers.possibleConstructorReturn(this, (CreateModel.__proto__ || Object.getPrototypeOf(CreateModel)).apply(this, arguments));
  }

  babelHelpers.createClass(CreateModel, [{
    key: 'clearCompleted',
    value: function clearCompleted() {
      this.list = this.list.filter(function (todo) {
        return !todo.completed;
      });
    }
  }]);
  return CreateModel;
}(_utils.createModel);

var todoModel = new CreateModel();

exports.default = todoModel;

},{"../keet":10,"../keet/utils":13}],18:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _templateObject = babelHelpers.taggedTemplateLiteral(['\n  <ul id="todo-list" class="todo-list" k-click="evtTodo()">\n    <!-- {{model:todoModel}} -->\n      <li id="{{id}}" class="{{completed?completed:\'\'}}">\n        <div class="view">\n          <input class="toggle" data-id="{{id}}" type="checkbox" checked="{{completed?checked:\'\'}}">\n          <label>{{title}}</label>\n          <button class="destroy" data-id="{{id}}"></button>\n        </div>\n        <input class="edit" data-id="{{id}}" value="{{title}}">\n      </li>\n    <!-- {{/model:todoModel}} -->\n  </ul>\n'], ['\n  <ul id="todo-list" class="todo-list" k-click="evtTodo()">\n    <!-- {{model:todoModel}} -->\n      <li id="{{id}}" class="{{completed?completed:\'\'}}">\n        <div class="view">\n          <input class="toggle" data-id="{{id}}" type="checkbox" checked="{{completed?checked:\'\'}}">\n          <label>{{title}}</label>\n          <button class="destroy" data-id="{{id}}"></button>\n        </div>\n        <input class="edit" data-id="{{id}}" value="{{title}}">\n      </li>\n    <!-- {{/model:todoModel}} -->\n  </ul>\n']);

var _keet = require('../keet');

var _keet2 = babelHelpers.interopRequireDefault(_keet);

var _utils = require('../keet/utils');

var _todoModel = require('./todo-model');

var _todoModel2 = babelHelpers.interopRequireDefault(_todoModel);

var App = function (_Keet) {
  babelHelpers.inherits(App, _Keet);

  function App() {
    var _ref;

    var _temp, _this, _ret;

    babelHelpers.classCallCheck(this, App);

    for (var _len = arguments.length, args = Array(_len), _key = 0; _key < _len; _key++) {
      args[_key] = arguments[_key];
    }

    return _ret = (_temp = (_this = babelHelpers.possibleConstructorReturn(this, (_ref = App.__proto__ || Object.getPrototypeOf(App)).call.apply(_ref, [this].concat(args))), _this), _this.el = 'todo-list', _this.todoModel = _todoModel2.default, _temp), babelHelpers.possibleConstructorReturn(_this, _ret);
  }

  babelHelpers.createClass(App, [{
    key: 'componentWillMount',
    value: function componentWillMount() {
      var _this2 = this;

      this.todoModel.subscribe(function (model) {
        return _this2.inform(model);
      });
    }
  }, {
    key: 'addTodo',
    value: function addTodo(newTodo) {
      this.todoModel.add(newTodo);
    }
  }, {
    key: 'evtTodo',
    value: function evtTodo(target) {
      if (target.className === 'toggle') this.toggleTodo(target.getAttribute('data-id'), !!target.checked);else if (target.className === 'destroy') this.todoDestroy(target.getAttribute('data-id'));
    }
  }, {
    key: 'toggleTodo',
    value: function toggleTodo(id, completed) {
      this.todoModel.update('id', { id: id, completed: completed });
    }
  }, {
    key: 'todoDestroy',
    value: function todoDestroy(id) {
      this.todoModel.destroy('id', id);
    }
  }, {
    key: 'editMode',
    value: function editMode() {}
  }]);
  return App;
}(_keet2.default);

var todoApp = new App();

var vmodel = (0, _utils.html)(_templateObject);

todoApp.mount(vmodel);

exports.default = todoApp;

},{"../keet":10,"../keet/utils":13,"./todo-model":17}],19:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
var store = function store(namespace, data) {
  if (arguments.length > 1) {
    return localStorage.setItem(namespace, JSON.stringify(data));
  } else {
    var store = localStorage.getItem(namespace);
    return store && JSON.parse(store) || [];
  }
};

var genId = function genId() {
  return Math.round(Math.random() * 0x1 * 1e12).toString(32);
};

var camelCase = function camelCase(s) {
  return s.charAt(0).toUpperCase() + s.slice(1);
};

var html = function html(literalSections) {
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

exports.default = html;
exports.genId = genId;
exports.store = store;
exports.camelCase = camelCase;

},{}]},{},[14])
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIkM6L1VzZXJzL3BpcGV5L0FwcERhdGEvUm9hbWluZy9ucG0vbm9kZV9tb2R1bGVzL2Jyb3dzZXJpZnkvbm9kZV9tb2R1bGVzL2Jyb3dzZXItcGFjay9fcHJlbHVkZS5qcyIsImtlZXQvY29tcG9uZW50cy9jb21wb25lbnRQYXJzZS5qcyIsImtlZXQvY29tcG9uZW50cy9jb25kaXRpb25hbE5vZGVzLmpzIiwia2VldC9jb21wb25lbnRzL2dlbkVsZW1lbnQuanMiLCJrZWV0L2NvbXBvbmVudHMvZ2VuTW9kZWxMaXN0LmpzIiwia2VldC9jb21wb25lbnRzL2dlbk1vZGVsVGVtcGxhdGUuanMiLCJrZWV0L2NvbXBvbmVudHMvcGFyc2VTdHIuanMiLCJrZWV0L2NvbXBvbmVudHMvc3RySW50ZXJwcmV0ZXIuanMiLCJrZWV0L2NvbXBvbmVudHMvdGVybmFyeU9wcy5qcyIsImtlZXQvY29tcG9uZW50cy90bXBsSGFuZGxlci5qcyIsImtlZXQva2VldC5qcyIsImtlZXQvbm9kZV9tb2R1bGVzL3NldC1kb20vc3JjL2luZGV4LmpzIiwia2VldC9ub2RlX21vZHVsZXMvc2V0LWRvbS9zcmMvcGFyc2UtaHRtbC5qcyIsImtlZXQvdXRpbHMuanMiLCJzcmMvYXBwLmpzIiwic3JjL2ZpbHRlci1tb2RlbC5qcyIsInNyYy9maWx0ZXIuanMiLCJzcmMvdG9kby1tb2RlbC5qcyIsInNyYy90b2RvLmpzIiwic3JjL3V0aWwuanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7QUNBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNqQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ25DQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDckdBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQy9KQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3pCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2xDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDUkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzdCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNyTkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDdklBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3BVQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FDaEZBLFFBQVEsS0FBUixHQUFnQixZQUFVO0FBQUE7O0FBQ3hCLFdBQVMsR0FBVCxHQUFjO0FBQUE7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ZnVuY3Rpb24oKXtmdW5jdGlvbiByKGUsbix0KXtmdW5jdGlvbiBvKGksZil7aWYoIW5baV0pe2lmKCFlW2ldKXt2YXIgYz1cImZ1bmN0aW9uXCI9PXR5cGVvZiByZXF1aXJlJiZyZXF1aXJlO2lmKCFmJiZjKXJldHVybiBjKGksITApO2lmKHUpcmV0dXJuIHUoaSwhMCk7dmFyIGE9bmV3IEVycm9yKFwiQ2Fubm90IGZpbmQgbW9kdWxlICdcIitpK1wiJ1wiKTt0aHJvdyBhLmNvZGU9XCJNT0RVTEVfTk9UX0ZPVU5EXCIsYX12YXIgcD1uW2ldPXtleHBvcnRzOnt9fTtlW2ldWzBdLmNhbGwocC5leHBvcnRzLGZ1bmN0aW9uKHIpe3ZhciBuPWVbaV1bMV1bcl07cmV0dXJuIG8obnx8cil9LHAscC5leHBvcnRzLHIsZSxuLHQpfXJldHVybiBuW2ldLmV4cG9ydHN9Zm9yKHZhciB1PVwiZnVuY3Rpb25cIj09dHlwZW9mIHJlcXVpcmUmJnJlcXVpcmUsaT0wO2k8dC5sZW5ndGg7aSsrKW8odFtpXSk7cmV0dXJuIG99cmV0dXJuIHJ9KSgpIiwidmFyIGFzc2VydCA9IHJlcXVpcmUoJy4uL3V0aWxzJykuYXNzZXJ0XHJcbnZhciBnZXRJZCA9IHJlcXVpcmUoJy4uL3V0aWxzJykuZ2V0SWRcclxudmFyIGNoZWNrTm9kZUF2YWlsYWJpbGl0eSA9IHJlcXVpcmUoJy4uL3V0aWxzJykuY2hlY2tOb2RlQXZhaWxhYmlsaXR5XHJcbnZhciB0bXBsSGFuZGxlciA9IHJlcXVpcmUoJy4vdG1wbEhhbmRsZXInKVxyXG52YXIgY2FjaGVJbml0ID0ge31cclxubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbiAoY29tcG9uZW50U3RyLCBub2RlKSB7XHJcbiAgdmFyIGNvbXBvbmVudCA9IGNvbXBvbmVudFN0ci5yZXBsYWNlKCdjb21wb25lbnQ6JywgJycpXHJcbiAgdmFyIGMgPSB0aGlzW2NvbXBvbmVudF1cclxuICB2YXIgZWwgXHJcbiAgdmFyIGZyYWdcclxuXHJcbiAgaWYgKGMgIT09IHVuZGVmaW5lZCkge1xyXG4gICAgLy8gdGhpcyBpcyBmb3IgaW5pdGlhbCBjb21wb25lbnQgcnVubmVyXHJcbiAgICBpZighY2FjaGVJbml0W2MuSURdKXtcclxuICAgICAgYy5yZW5kZXIuY2FsbChjLCB0cnVlKVxyXG4gICAgICBjYWNoZUluaXRbYy5JRF0gPSBjLmJhc2UuY2xvbmVOb2RlKHRydWUpXHJcbiAgICAgIG5vZGUucGFyZW50Tm9kZS5yZXBsYWNlQ2hpbGQoYy5iYXNlLCBub2RlKVxyXG4gICAgfSBlbHNlIHtcclxuICAgICAgLy8gd2UgbmVlZCB0byByZWF0dGFjaCBldmVudCBsaXN0ZW5lcnMgaWYgdGhlIG5vZGUgaXMgbm90IGF2YWlsYWJsZSBvbiBET01cclxuICAgICAgaWYoIWdldElkKHRoaXNbY29tcG9uZW50XS5lbCkpe1xyXG4gICAgICAgIGMuYmFzZSA9IGMuX19wcmlzdGluZUZyYWdtZW50X18uY2xvbmVOb2RlKHRydWUpXHJcbiAgICAgICAgYy5yZW5kZXIuY2FsbChjLCB0cnVlKVxyXG4gICAgICAgIG5vZGUucGFyZW50Tm9kZS5yZXBsYWNlQ2hpbGQoYy5iYXNlLCBub2RlKVxyXG4gICAgICB9IGVsc2Uge1xyXG4gICAgICAgIG5vZGUucGFyZW50Tm9kZS5yZXBsYWNlQ2hpbGQoY2FjaGVJbml0W2MuSURdLmNsb25lTm9kZSh0cnVlKSwgbm9kZSkgXHJcbiAgICAgIH1cclxuICAgIH1cclxuICAgIC8vIGluZm9ybSBzdWItY29tcG9uZW50IHRvIHVwZGF0ZVxyXG4gICAgYy5jYWxsQmF0Y2hQb29sVXBkYXRlKClcclxuICB9IGVsc2Uge1xyXG4gICAgYXNzZXJ0KGZhbHNlLCAnQ29tcG9uZW50ICcgKyBjb21wb25lbnQgKyAnIGRvZXMgbm90IGV4aXN0LicpXHJcbiAgfVxyXG59XHJcbiIsInZhciBjb25kaXRpb25hbE5vZGVzUmF3U3RhcnQgPSAvXFx7XFx7XFw/KFtee31dKylcXH1cXH0vZ1xyXG52YXIgY29uZGl0aW9uYWxOb2Rlc1Jhd0VuZCA9IC9cXHtcXHtcXC8oW157fV0rKVxcfVxcfS9nXHJcbnZhciBET0NVTUVOVF9FTEVNRU5UX1RZUEUgPSAxXHJcbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24gKG5vZGUsIGNvbmRpdGlvbmFsLCB0bXBsSGFuZGxlcikge1xyXG4gIHZhciBlbnRyeU5vZGVcclxuICB2YXIgY3VycmVudE5vZGVcclxuICB2YXIgaXNHZW5cclxuICB2YXIgZnJhZyA9IGRvY3VtZW50LmNyZWF0ZURvY3VtZW50RnJhZ21lbnQoKVxyXG4gIC8vIGNvbnNvbGUubG9nKG5vZGUpXHJcbiAgd2hpbGUgKG5vZGUpIHtcclxuICAgIGN1cnJlbnROb2RlID0gbm9kZVxyXG4gICAgbm9kZSA9IG5vZGUubmV4dFNpYmxpbmdcclxuICAgIGlmIChjdXJyZW50Tm9kZS5ub2RlVHlwZSAhPT0gRE9DVU1FTlRfRUxFTUVOVF9UWVBFKSB7XHJcbiAgICAgIGlmIChjdXJyZW50Tm9kZS5ub2RlVmFsdWUubWF0Y2goY29uZGl0aW9uYWxOb2Rlc1Jhd1N0YXJ0KSkge1xyXG4gICAgICAgIGVudHJ5Tm9kZSA9IGN1cnJlbnROb2RlXHJcbiAgICAgIH0gZWxzZSBpZiAoY3VycmVudE5vZGUubm9kZVZhbHVlLm1hdGNoKGNvbmRpdGlvbmFsTm9kZXNSYXdFbmQpKSB7XHJcbiAgICAgICAgY3VycmVudE5vZGUucmVtb3ZlKClcclxuICAgICAgICAvLyBzdGFyIGdlbmVyYXRpbmcgdGhlIGNvbmRpdGlvbmFsIG5vZGVzIHJhbmdlLCBpZiBub3QgeWV0XHJcbiAgICAgICAgaWYgKCFpc0dlbikge1xyXG4gICAgICAgICAgaXNHZW4gPSB0cnVlXHJcbiAgICAgICAgICB0bXBsSGFuZGxlcih0aGlzLCBudWxsLCBudWxsLCBudWxsLCBmcmFnKVxyXG4gICAgICAgIH1cclxuICAgICAgICBpZiAodGhpc1tjb25kaXRpb25hbF0pIHtcclxuICAgICAgICAgIGVudHJ5Tm9kZS5wYXJlbnROb2RlLmluc2VydEJlZm9yZShmcmFnLCBlbnRyeU5vZGUpXHJcbiAgICAgICAgfVxyXG4gICAgICAgIGVudHJ5Tm9kZS5yZW1vdmUoKVxyXG4gICAgICAgIG5vZGUgPSBudWxsXHJcbiAgICAgIH1cclxuICAgIH0gZWxzZSB7XHJcbiAgICAgIHZhciBjTm9kZSA9IGN1cnJlbnROb2RlLmNsb25lTm9kZSh0cnVlKVxyXG4gICAgICBmcmFnLmFwcGVuZENoaWxkKGNOb2RlKVxyXG4gICAgICBjdXJyZW50Tm9kZS5yZW1vdmUoKVxyXG4gICAgfVxyXG4gIH1cclxufVxyXG4iLCJ2YXIgdG1wbEhhbmRsZXIgPSByZXF1aXJlKCcuL3RtcGxIYW5kbGVyJylcclxudmFyIHN0ckludGVycHJldGVyID0gcmVxdWlyZSgnLi9zdHJJbnRlcnByZXRlcicpXHJcbnZhciBtb3JwaCA9IHJlcXVpcmUoJ3NldC1kb20nKVxyXG52YXIgZ2V0SWQgPSByZXF1aXJlKCcuLi91dGlscycpLmdldElkXHJcblxyXG52YXIgb3ZlcnJpZGVcclxudmFyIGVsXHJcbnZhciBERUxBWSA9IDFcclxuXHJcbnZhciBtb3JwaGVyID0gZnVuY3Rpb24gKCkge1xyXG4gIGVsID0gZ2V0SWQodGhpcy5lbClcclxuICBnZW5FbGVtZW50LmNhbGwodGhpcylcclxuICBpZihlbCkge1xyXG4gICAgdGhpcy5JU19TVFVCID8gbW9ycGgoZWwsIHRoaXMuYmFzZS5maXJzdENoaWxkKSA6IG1vcnBoKGVsLCB0aGlzLmJhc2UpXHJcbiAgfVxyXG4gIC8vIGV4ZWMgbGlmZS1jeWNsZSBjb21wb25lbnREaWRVcGRhdGVcclxuICBpZiAodGhpcy5jb21wb25lbnREaWRVcGRhdGUgJiYgdHlwZW9mIHRoaXMuY29tcG9uZW50RGlkVXBkYXRlID09PSAnZnVuY3Rpb24nKSB7XHJcbiAgICB0aGlzLmNvbXBvbmVudERpZFVwZGF0ZSgpXHJcbiAgfVxyXG59XHJcblxyXG52YXIgdGltZXIgPSB7fVxyXG52YXIgdXBkYXRlQ29udGV4dCA9IGZ1bmN0aW9uKGZuLCBkZWxheSkge1xyXG5cclxuICB2YXIgY29udGV4dCA9IHRoaXNcclxuICB0aW1lclt0aGlzLklEXSA9IHRpbWVyW3RoaXMuSURdIHx8IG51bGxcclxuICBjbGVhclRpbWVvdXQodGltZXJbdGhpcy5JRF0pXHJcbiAgdGltZXJbdGhpcy5JRF0gPSBzZXRUaW1lb3V0KGZ1bmN0aW9uICgpIHtcclxuICAgIGZuLmNhbGwoY29udGV4dClcclxuICB9LCBkZWxheSlcclxufVxyXG5cclxudmFyIG5leHRTdGF0ZSA9IGZ1bmN0aW9uIChpKSB7XHJcbiAgdmFyIHN0YXRlXHJcbiAgdmFyIHZhbHVlXHJcbiAgaWYgKGkgPCBzdGF0ZUxpc3QubGVuZ3RoKSB7XHJcbiAgICBzdGF0ZSA9IHN0YXRlTGlzdFtpXVxyXG4gICAgdmFsdWUgPSB0aGlzW3N0YXRlXVxyXG5cclxuICAgIC8vIGlmIHZhbHVlIGlzIHVuZGVmaW5lZCwgbGlrZWx5IGhhcyBvYmplY3Qgbm90YXRpb24gd2UgY29udmVydCBpdCB0byBhcnJheVxyXG4gICAgaWYgKHZhbHVlID09PSB1bmRlZmluZWQpIHZhbHVlID0gc3RySW50ZXJwcmV0ZXIoc3RhdGUpXHJcblxyXG4gICAgaWYgKHZhbHVlICYmIEFycmF5LmlzQXJyYXkodmFsdWUpKSB7XHJcbiAgICAgIC8vIHVzaW5nIHNwbGl0IG9iamVjdCBub3RhdGlvbiBhcyBiYXNlIGZvciBzdGF0ZSB1cGRhdGVcclxuICAgICAgLy8gY29uc29sZS5sb2codmFsdWUpXHJcbiAgICAgIHZhciBpblZhbCA9IHRoaXNbdmFsdWVbMF1dW3ZhbHVlWzFdXVxyXG4gICAgICBPYmplY3QuZGVmaW5lUHJvcGVydHkodGhpc1t2YWx1ZVswXV0sIHZhbHVlWzFdLCB7XHJcbiAgICAgICAgZW51bWVyYWJsZTogZmFsc2UsXHJcbiAgICAgICAgY29uZmlndXJhYmxlOiB0cnVlLFxyXG4gICAgICAgIGdldDogZnVuY3Rpb24gKCkge1xyXG4gICAgICAgICAgcmV0dXJuIGluVmFsXHJcbiAgICAgICAgfSxcclxuICAgICAgICBzZXQ6IGZ1bmN0aW9uICh2YWwpIHtcclxuICAgICAgICAgIGluVmFsID0gdmFsXHJcbiAgICAgICAgICB1cGRhdGVDb250ZXh0LmNhbGwodGhpcywgbW9ycGhlciwgREVMQVkpXHJcbiAgICAgICAgfS5iaW5kKHRoaXMpXHJcbiAgICAgIH0pXHJcbiAgICB9IGVsc2Uge1xyXG4gICAgICAvLyBoYW5kbGUgcGFyZW50IHN0YXRlIHVwZGF0ZSBpZiB0aGUgc3RhdGUgaXMgbm90IGFuIG9iamVjdFxyXG4gICAgICBPYmplY3QuZGVmaW5lUHJvcGVydHkodGhpcywgc3RhdGUsIHtcclxuICAgICAgICBlbnVtZXJhYmxlOiBmYWxzZSxcclxuICAgICAgICBjb25maWd1cmFibGU6IHRydWUsXHJcbiAgICAgICAgZ2V0OiBmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgICByZXR1cm4gdmFsdWVcclxuICAgICAgICB9LFxyXG4gICAgICAgIHNldDogZnVuY3Rpb24gKHZhbCkge1xyXG4gICAgICAgICAgdmFsdWUgPSB2YWxcclxuICAgICAgICAgIHVwZGF0ZUNvbnRleHQuY2FsbCh0aGlzLCBtb3JwaGVyLCBERUxBWSlcclxuICAgICAgICB9LmJpbmQodGhpcylcclxuICAgICAgfSlcclxuICAgIH1cclxuICAgIGkrK1xyXG4gICAgbmV4dFN0YXRlLmNhbGwodGhpcywgaSlcclxuICB9XHJcbn1cclxuXHJcbnZhciBzZXRTdGF0ZSA9IGZ1bmN0aW9uICgpIHtcclxuICBuZXh0U3RhdGUuY2FsbCh0aGlzLCAwKVxyXG59XHJcblxyXG52YXIgc3RhdGVMaXN0ID0gW11cclxuXHJcbnZhciBjbGVhclN0YXRlID0gZnVuY3Rpb24gKCkge1xyXG4gIHN0YXRlTGlzdCA9IFtdXHJcbn1cclxuXHJcbnZhciBhZGRTdGF0ZSA9IGZ1bmN0aW9uIChzdGF0ZSkge1xyXG4gIGlmIChzdGF0ZUxpc3QuaW5kZXhPZihzdGF0ZSkgPT09IC0xKSBzdGF0ZUxpc3QgPSBzdGF0ZUxpc3QuY29uY2F0KHN0YXRlKVxyXG59XHJcblxyXG52YXIgZ2VuRWxlbWVudCA9IGZ1bmN0aW9uICgpIHtcclxuICB0aGlzLmJhc2UgPSB0aGlzLl9fcHJpc3RpbmVGcmFnbWVudF9fLmNsb25lTm9kZSh0cnVlKVxyXG4gIHRtcGxIYW5kbGVyKHRoaXMsIGFkZFN0YXRlKVxyXG59XHJcblxyXG5leHBvcnRzLmdlbkVsZW1lbnQgPSBnZW5FbGVtZW50XHJcbmV4cG9ydHMuYWRkU3RhdGUgPSBhZGRTdGF0ZVxyXG5leHBvcnRzLnNldFN0YXRlID0gc2V0U3RhdGVcclxuZXhwb3J0cy5jbGVhclN0YXRlID0gY2xlYXJTdGF0ZVxyXG5leHBvcnRzLnVwZGF0ZUNvbnRleHQgPSB1cGRhdGVDb250ZXh0XHJcbmV4cG9ydHMubW9ycGhlciA9IG1vcnBoZXJcclxuIiwidmFyIGFzc2VydCA9IHJlcXVpcmUoJy4uL3V0aWxzJykuYXNzZXJ0XHJcbnZhciBnZXRJZCA9IHJlcXVpcmUoJy4uL3V0aWxzJykuZ2V0SWRcclxudmFyIGNoZWNrTm9kZUF2YWlsYWJpbGl0eSA9IHJlcXVpcmUoJy4uL3V0aWxzJykuY2hlY2tOb2RlQXZhaWxhYmlsaXR5XHJcbnZhciBnZW5Nb2RlbFRlbXBsYXRlID0gcmVxdWlyZSgnLi9nZW5Nb2RlbFRlbXBsYXRlJylcclxuLy8gdmFyIG1vcnBoID0gcmVxdWlyZSgnc2V0LWRvbScpXHJcblxyXG52YXIgcmUgPSAve3soW157fV0rKX19L2dcclxuXHJcbi8vIGRpZmZpbmcgdHdvIGFycmF5IG9mIG9iamVjdHMsIGluY2x1ZGluZyBvYmplY3QgcHJvcGVydGllcyBkaWZmZXJlbmNlc1xyXG5mdW5jdGlvbiBkaWZmIChmc3QsIHNlYykge1xyXG4gIHJldHVybiBmc3QuZmlsdGVyKGZ1bmN0aW9uIChvYmopIHtcclxuICAgIHJldHVybiAhc2VjLnNvbWUoZnVuY3Rpb24gKGlucikge1xyXG4gICAgICB2YXIgcHJlZGljYXRlID0gdHJ1ZVxyXG4gICAgICBmb3IgKHZhciBhdHRyIGluIGlucikge1xyXG4gICAgICAgIGlmIChvYmpbYXR0cl0gIT09IGluclthdHRyXSkge1xyXG4gICAgICAgICAgcHJlZGljYXRlID0gZmFsc2VcclxuICAgICAgICB9XHJcbiAgICAgIH1cclxuICAgICAgcmV0dXJuIHByZWRpY2F0ZVxyXG4gICAgfSlcclxuICB9KVxyXG59XHJcblxyXG4vLyBjaGVjayBpZiBicm93c2VyIHN1cHBvcnQgY3JlYXRlUmFuZ2VcclxudmFyIHJhbmdlXHJcbmlmICh0eXBlb2YgZG9jdW1lbnQuY3JlYXRlUmFuZ2UgPT09ICdmdW5jdGlvbicpIHtcclxuICByYW5nZSA9IGRvY3VtZW50LmNyZWF0ZVJhbmdlKClcclxufVxyXG5cclxuLy8gc3RvcmFnZSBmb3IgbW9kZWwgc3RhdGVcclxudmFyIGNhY2hlID0ge31cclxuXHJcbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24gKG5vZGUsIG1vZGVsLCB0bXBsSGFuZGxlcikge1xyXG4gIFxyXG4gIHZhciBtb2RlbExpc3RcclxuICB2YXIgbUxlbmd0aFxyXG4gIHZhciBpXHJcbiAgdmFyIGxpc3RDbG9uZVxyXG4gIHZhciBwYXJlbnROb2RlXHJcbiAgdmFyIG1cclxuICB2YXIgZG9jdW1lbnRGcmFnbWVudFxyXG4gIHZhciB1cGRhdGVPZk5ld1xyXG4gIHZhciBkaWZmT2ZPbGRcclxuICB2YXIgcE5vZGVcclxuICB2YXIgcmVmXHJcbiAgdmFyIGVxdWFsTGVuZ3RoXHJcbiAgdmFyIGNoaWxkXHJcbiAgdmFyIGxpc3RcclxuICB2YXIgc3RyXHJcbiAgdmFyIG9sZE1vZGVsXHJcbiAgdmFyIHBcclxuXHJcbiAgY2FjaGVbbW9kZWxdID0gY2FjaGVbbW9kZWxdIHx8IHt9XHJcblxyXG4gIGlmKCFjYWNoZVttb2RlbF0ubGlzdCl7XHJcbiAgICBjYWNoZVttb2RlbF0ubGlzdCA9IG5vZGUubmV4dFNpYmxpbmcuY2xvbmVOb2RlKHRydWUpXHJcbiAgfVxyXG4gIGxpc3QgPSBjYWNoZVttb2RlbF0ubGlzdFxyXG5cclxuICBpZighY2FjaGVbbW9kZWxdLnN0cil7XHJcbiAgICBjYWNoZVttb2RlbF0uc3RyID0gbm9kZS5uZXh0U2libGluZy5jbG9uZU5vZGUodHJ1ZSkub3V0ZXJIVE1MXHJcbiAgfVxyXG4gIHN0ciA9IGNhY2hlW21vZGVsXS5zdHJcclxuXHJcbiAgaWYoIWNhY2hlW21vZGVsXS5yZWYpe1xyXG4gICAgaWYgKGxpc3QuaGFzQXR0cmlidXRlKCdpZCcpICYmIGxpc3QuaWQubWF0Y2gocmUpKSB7XHJcbiAgICAgIGNhY2hlW21vZGVsXS5yZWYgPSBsaXN0LmlkLnJlcGxhY2UocmUsICckMScpXHJcbiAgICAgIC8vIHJlbW92ZSB0aGUgZmlyc3QgcHJvdG90eXBlIG5vZGVcclxuICAgICAgbm9kZS5uZXh0U2libGluZy5yZW1vdmUoKVxyXG4gICAgICAvLyBhbHNvIHJlbW92ZSBmcm9tIHByaXN0aW5lIG5vZGVcclxuICAgICAgcCA9IHRoaXMuX19wcmlzdGluZUZyYWdtZW50X18uZ2V0RWxlbWVudEJ5SWQobGlzdC5pZClcclxuICAgICAgaWYocCkgcC5yZW1vdmUoKVxyXG4gICAgfVxyXG4gIH1cclxuICByZWYgPSBjYWNoZVttb2RlbF0ucmVmXHJcbiAgXHJcbiAgaWYgKHRoaXNbbW9kZWxdICE9PSB1bmRlZmluZWQgJiYgdGhpc1ttb2RlbF0uaGFzT3duUHJvcGVydHkoJ2xpc3QnKSkge1xyXG5cclxuICAgIHBhcmVudE5vZGUgPSBub2RlLnBhcmVudE5vZGVcclxuXHJcbiAgICBpZiAocmFuZ2UgJiYgIXBhcmVudE5vZGUuaGFzQXR0cmlidXRlKCdkYXRhLWlnbm9yZScpKSB7XHJcbiAgICAgIHBhcmVudE5vZGUuc2V0QXR0cmlidXRlKCdkYXRhLWlnbm9yZScsICcnKVxyXG4gICAgfVxyXG5cclxuICAgIG1vZGVsTGlzdCA9IHRoaXNbbW9kZWxdLmxpc3RcclxuXHJcbiAgICBvbGRNb2RlbCA9IGNhY2hlW21vZGVsXS5vbGRNb2RlbCB8fCBbXVxyXG5cclxuICAgIC8vIGNoZWNrIGlmIGN1cnJlbnQgYnJvd3NlciBkb2Vzbid0IHN1cHBvcnQgY3JlYXRlUmFuZ2UoKVxyXG4gICAgaWYgKCFyYW5nZSkge1xyXG4gICAgICBpID0gMFxyXG4gICAgICB3aGlsZSAoaSA8IG1MZW5ndGgpIHtcclxuICAgICAgICAvLyBmYWxsYmFjayB0byByZWd1bGFyIG5vZGUgZ2VuZXJhdGlvbiBoYW5kbGVyXHJcbiAgICAgICAgbGlzdENsb25lID0gbGlzdC5jbG9uZU5vZGUodHJ1ZSlcclxuICAgICAgICB0bXBsSGFuZGxlcih0aGlzLCBudWxsLCBsaXN0Q2xvbmUsIG1vZGVsTGlzdFtpXSlcclxuICAgICAgICBpKytcclxuICAgICAgfVxyXG4gICAgfSBlbHNlIHtcclxuICAgICAgdXBkYXRlT2ZOZXcgPSBkaWZmKG1vZGVsTGlzdCwgb2xkTW9kZWwpXHJcbiAgICAgIGRpZmZPZk9sZCA9IGRpZmYob2xkTW9kZWwsIG1vZGVsTGlzdClcclxuXHJcbiAgICAgIGZ1bmN0aW9uIGRpZmZNb2RlbCgpIHtcclxuICAgICAgICBwTm9kZSA9W10ucG9wLmNhbGwoYXJndW1lbnRzKVxyXG4gICAgICAgIC8vIGNoZWNrIGlmIGJvdGggbW9kZWxzIGFyZSBlcXVhbGx5IGluIGxlbmd0aFxyXG4gICAgICAgIGVxdWFsTGVuZ3RoID0gb2xkTW9kZWwubGVuZ3RoID09PSBtb2RlbExpc3QubGVuZ3RoXHJcblxyXG4gICAgICAgIC8vIGRvIHByb3BlcnRpZXMgdXBkYXRlXHJcbiAgICAgICAgaWYgKGVxdWFsTGVuZ3RoKSB7XHJcbiAgICAgICAgICAvLyBzKCd1cGRhdGUnKVxyXG4gICAgICAgICAgdXBkYXRlT2ZOZXcubWFwKGZ1bmN0aW9uIChvYmopIHtcclxuICAgICAgICAgICAgY2hpbGQgPSBwTm9kZS5xdWVyeVNlbGVjdG9yKCdbaWQ9XCInICsgb2JqW3JlZl0gKyAnXCJdJylcclxuICAgICAgICAgICAgbSA9IGdlbk1vZGVsVGVtcGxhdGUoc3RyLCBvYmopXHJcbiAgICAgICAgICAgIGRvY3VtZW50RnJhZ21lbnQgPSByYW5nZS5jcmVhdGVDb250ZXh0dWFsRnJhZ21lbnQobSlcclxuICAgICAgICAgICAgLy8gbW9ycGgoY2hpbGQsIGRvY3VtZW50RnJhZ21lbnQuZmlyc3RDaGlsZClcclxuICAgICAgICAgICAgcE5vZGUucmVwbGFjZUNoaWxkKGRvY3VtZW50RnJhZ21lbnQsIGNoaWxkKVxyXG4gICAgICAgICAgfSlcclxuICAgICAgICAgIC8vIGUoJ3VwZGF0ZScpXHJcbiAgICAgICAgLy8gYWRkIG5ldyBvYmplY3RzXHJcbiAgICAgICAgfSBlbHNlIGlmICh1cGRhdGVPZk5ldy5sZW5ndGggPiAwICYmIGRpZmZPZk9sZC5sZW5ndGggPT09IDApIHtcclxuICAgICAgICAgIC8vIHMoJ2FkZCcpXHJcbiAgICAgICAgICB1cGRhdGVPZk5ldy5tYXAoZnVuY3Rpb24gKG9iaikge1xyXG4gICAgICAgICAgICBtID0gZ2VuTW9kZWxUZW1wbGF0ZShzdHIsIG9iailcclxuICAgICAgICAgICAgZG9jdW1lbnRGcmFnbWVudCA9IHJhbmdlLmNyZWF0ZUNvbnRleHR1YWxGcmFnbWVudChtKVxyXG4gICAgICAgICAgICBwTm9kZS5pbnNlcnRCZWZvcmUoZG9jdW1lbnRGcmFnbWVudCwgcE5vZGUubGFzdENoaWxkKVxyXG4gICAgICAgICAgfSlcclxuICAgICAgICAgIC8vIGUoJ2FkZCcpXHJcbiAgICAgICAgLy8gZGVzdHJveSBzZWxlY3RlZCBvYmplY3RzXHJcbiAgICAgICAgfSBlbHNlIGlmICh1cGRhdGVPZk5ldy5sZW5ndGggPT09IDAgJiYgZGlmZk9mT2xkLmxlbmd0aCA+IDApIHtcclxuICAgICAgICAgIC8vIHMoJ2RlbCcpXHJcbiAgICAgICAgICBkaWZmT2ZPbGQubWFwKGZ1bmN0aW9uIChvYmopIHtcclxuICAgICAgICAgICAgY2hpbGQgPSBwTm9kZS5xdWVyeVNlbGVjdG9yKCdbaWQ9XCInICsgb2JqW3JlZl0gKyAnXCJdJylcclxuICAgICAgICAgICAgcE5vZGUucmVtb3ZlQ2hpbGQoY2hpbGQpXHJcbiAgICAgICAgICB9KVxyXG4gICAgICAgICAgLy8gZSgnZGVsJylcclxuICAgICAgICB9XHJcbiAgICAgICAgLy8gcmVwbGFjZSBvbGRNb2RlbCBhZnRlciBkaWZmaW5nXHJcbiAgICAgICAgY2FjaGVbbW9kZWxdLm9sZE1vZGVsID0gSlNPTi5wYXJzZShKU09OLnN0cmluZ2lmeShtb2RlbExpc3QpKVxyXG5cclxuICAgICAgfVxyXG5cclxuICAgICAgLy8gY2hlY2sgZXhpc3RpbmcgcGFyZW50Tm9kZSBpbiB0aGUgRE9NXHJcbiAgICAgIGlmIChwYXJlbnROb2RlLmhhc0F0dHJpYnV0ZSgnaWQnKSkge1xyXG4gICAgICAgIHBOb2RlID0gZ2V0SWQocGFyZW50Tm9kZS5pZClcclxuXHJcbiAgICAgICAgaWYocE5vZGUpe1xyXG4gICAgICAgICAgZGlmZk1vZGVsLmNhbGwodGhpcywgbnVsbCwgbnVsbCwgcE5vZGUpXHJcbiAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgIGNoZWNrTm9kZUF2YWlsYWJpbGl0eSh7IGVsOiBwYXJlbnROb2RlLmlkIH0sIG1vZGVsLCBkaWZmTW9kZWwuYmluZCh0aGlzKSwgZnVuY3Rpb24oKXtcclxuICAgICAgICAgICAgLy8gd2UgY2xlYW51cCBjYWNoZSBvbiBmYWlsZWQgc2VhcmNoXHJcbiAgICAgICAgICAgIGNhY2hlW21vZGVsXS5vbGRNb2RlbCA9IFtdXHJcbiAgICAgICAgICB9KVxyXG4gICAgICAgIH1cclxuICAgICAgfVxyXG4gICAgICBcclxuICAgIH1cclxuICB9IGVsc2Uge1xyXG4gICAgYXNzZXJ0KGZhbHNlLCAnTW9kZWwgXCInICsgbW9kZWwgKyAnXCIgZG9lcyBub3QgZXhpc3QuJylcclxuICB9XHJcbn1cclxuIiwidmFyIHRlcm5hcnlPcHMgPSByZXF1aXJlKCcuL3Rlcm5hcnlPcHMnKVxyXG52YXIgcmUgPSBuZXcgUmVnRXhwKC8oXFxzY2hlY2tlZD1cIikoLio/KSg/PVwiKS9nKVxyXG52YXIgdG1wbCA9ICcnXHJcblxyXG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uIChzdHJpbmcsIG9iaikge1xyXG4gIHZhciBhcnJQcm9wcyA9IHN0cmluZy5tYXRjaCgve3soW157fV0rKX19L2cpXHJcbiAgdmFyIHJlcFxyXG4gIHZhciBpc1Rlcm5hcnlcclxuICB0bXBsID0gc3RyaW5nXHJcbiAgZm9yICh2YXIgaSA9IDAsIGxlbiA9IGFyclByb3BzLmxlbmd0aDsgaSA8IGxlbjsgaSsrKSB7XHJcbiAgICByZXAgPSBhcnJQcm9wc1tpXS5yZXBsYWNlKC97eyhbXnt9XSspfX0vZywgJyQxJylcclxuICAgIGlzVGVybmFyeSA9IHRlcm5hcnlPcHMuY2FsbChvYmosIHJlcClcclxuICAgIGlmIChpc1Rlcm5hcnkpIHtcclxuICAgICAgdG1wbCA9IHRtcGwucmVwbGFjZSgne3snICsgcmVwICsgJ319JywgaXNUZXJuYXJ5LnZhbHVlKVxyXG4gICAgfSBlbHNlIHtcclxuICAgICAgdG1wbCA9IHRtcGwucmVwbGFjZSgne3snICsgcmVwICsgJ319Jywgb2JqW3JlcF0pXHJcbiAgICB9XHJcblxyXG4gICAgdmFyIG1hdGNoID0gdG1wbC5tYXRjaChyZSlcclxuICAgIGlmIChtYXRjaCkge1xyXG4gICAgICBpZiAobWF0Y2hbMF0ubGVuZ3RoID09PSAxNykgeyB0bXBsID0gdG1wbC5yZXBsYWNlKCcgY2hlY2tlZD1cImNoZWNrZWRcIicsICcgY2hlY2tlZCcpIH0gZWxzZSB7IHRtcGwgPSB0bXBsLnJlcGxhY2UoJyBjaGVja2VkPVwiXCInLCAnJykgfVxyXG4gICAgfVxyXG4gIH1cclxuICByZXR1cm4gdG1wbFxyXG59XHJcbiIsInZhciBzZXRTdGF0ZSA9IHJlcXVpcmUoJy4vZ2VuRWxlbWVudCcpLnNldFN0YXRlXHJcbnZhciB0bXBsSGFuZGxlciA9IHJlcXVpcmUoJy4vdG1wbEhhbmRsZXInKVxyXG52YXIgZ2V0SWQgPSByZXF1aXJlKCcuLi91dGlscycpLmdldElkXHJcbnZhciBhZGRTdGF0ZSA9IHJlcXVpcmUoJy4vZ2VuRWxlbWVudCcpLmFkZFN0YXRlXHJcbnZhciBhc3NlcnQgPSByZXF1aXJlKCcuLi91dGlscycpLmFzc2VydFxyXG5cclxudmFyIERPQ1VNRU5UX0VMRU1FTlRfVFlQRSA9IDFcclxuXHJcbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24gKHN0dWIpIHtcclxuICB0bXBsSGFuZGxlcih0aGlzLCBhZGRTdGF0ZSlcclxuICB2YXIgZWwgPSBzdHViIHx8IGdldElkKHRoaXMuZWwpXHJcbiAgaWYgKGVsKSB7XHJcbiAgICBpZihlbC5ub2RlVHlwZSA9PT0gRE9DVU1FTlRfRUxFTUVOVF9UWVBFKXtcclxuICAgICAgZWwuc2V0QXR0cmlidXRlKCdkYXRhLWlnbm9yZScsICcnKVxyXG4gICAgfSBlbHNlIHtcclxuICAgICAgYXNzZXJ0KHRoaXMuYmFzZS5jaGlsZE5vZGVzLmxlbmd0aCA9PT0gMSwgJ1N1Yi1jb21wb25lbnQgc2hvdWxkIG9ubHkgaGFzIGEgc2luZ2xlIHJvb3ROb2RlLicpXHJcbiAgICAgICF0aGlzLmJhc2UuZmlyc3RDaGlsZC5oYXNBdHRyaWJ1dGUoJ2RhdGEtaWdub3JlJykgJiYgdGhpcy5iYXNlLmZpcnN0Q2hpbGQuc2V0QXR0cmlidXRlKCdkYXRhLWlnbm9yZScsICcnKVxyXG4gICAgfVxyXG4gICAgLy8gbGlzdGVuIHRvIHN0YXRlIGNoYW5nZXNcclxuICAgIHNldFN0YXRlLmNhbGwodGhpcylcclxuXHJcbiAgICAvLyBtb3VudCBmcmFnbWVudCB0byBET01cclxuICAgIGlmKCFzdHViKXtcclxuICAgICAgZWwuYXBwZW5kQ2hpbGQodGhpcy5iYXNlKVxyXG4gICAgfVxyXG4gICAgXHJcbiAgICAvLyBzaW5jZSBjb21wb25lbnQgYWxyZWFkeSByZW5kZXJlZCwgdHJpZ2dlciBpdHMgbGlmZS1jeWNsZSBtZXRob2RcclxuICAgIGlmICh0aGlzLmNvbXBvbmVudERpZE1vdW50ICYmIHR5cGVvZiB0aGlzLmNvbXBvbmVudERpZE1vdW50ID09PSAnZnVuY3Rpb24nKSB7XHJcbiAgICAgIHRoaXMuY29tcG9uZW50RGlkTW91bnQoKVxyXG4gICAgfVxyXG4gIH0gZWxzZSB7XHJcbiAgICBhc3NlcnQoZmFsc2UsICdObyBlbGVtZW50IHdpdGggaWQ6IFwiJyArIHRoaXMuZWwgKyAnXCIgZXhpc3QuJylcclxuICB9XHJcbn1cclxuIiwibW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbiAoc3RyKSB7XHJcbiAgdmFyIHJlcyA9IHN0ci5tYXRjaCgvXFwuKlxcLi9nKVxyXG4gIHZhciByZXN1bHRcclxuICBpZiAocmVzICYmIHJlcy5sZW5ndGggPiAwKSB7XHJcbiAgICByZXR1cm4gc3RyLnNwbGl0KCcuJylcclxuICB9XHJcbiAgcmV0dXJuIHJlc3VsdFxyXG59XHJcbiIsIi8vIGZ1bmN0aW9uIHRvIHJlc29sdmUgdGVybmFyeSBvcGVyYXRpb25cclxuXHJcbmZ1bmN0aW9uIHRlc3QgKHN0cikge1xyXG4gIGlmIChzdHIgPT09ICdcXCdcXCcnIHx8IHN0ciA9PT0gJ1wiXCInIHx8IHN0ciA9PT0gJ251bGwnKSB7IHJldHVybiAnJyB9XHJcbiAgcmV0dXJuIHN0clxyXG59XHJcblxyXG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uIChpbnB1dCkge1xyXG4gIGlmIChpbnB1dC5tYXRjaCgvKFteP10qKVxcPyhbXjpdKik6KFteO10qKXwoXFxzKj1cXHMqKVteO10qL2cpKSB7XHJcbiAgICB2YXIgdCA9IGlucHV0LnNwbGl0KCc/JylcclxuICAgIHZhciBjb25kaXRpb24gPSB0WzBdXHJcbiAgICB2YXIgbGVmdEhhbmQgPSB0WzFdLnNwbGl0KCc6JylbMF1cclxuICAgIHZhciByaWdodEhhbmQgPSB0WzFdLnNwbGl0KCc6JylbMV1cclxuXHJcbiAgICAvLyBjaGVjayB0aGUgY29uZGl0aW9uIGZ1bGZpbGxtZW50XHJcblxyXG4gICAgaWYgKHRoaXNbY29uZGl0aW9uXSkge1xyXG4gICAgICByZXR1cm4ge1xyXG4gICAgICAgIHZhbHVlOiB0ZXN0KGxlZnRIYW5kKSxcclxuICAgICAgICBzdGF0ZTogY29uZGl0aW9uXHJcbiAgICAgIH1cclxuICAgIH0gZWxzZSB7XHJcbiAgICAgIHJldHVybiB7XHJcbiAgICAgICAgdmFsdWU6IHRlc3QocmlnaHRIYW5kKSxcclxuICAgICAgICBzdGF0ZTogY29uZGl0aW9uXHJcbiAgICAgIH1cclxuICAgIH1cclxuICB9IGVsc2UgcmV0dXJuIGZhbHNlXHJcbn1cclxuIiwidmFyIHN0ckludGVycHJldGVyID0gcmVxdWlyZSgnLi9zdHJJbnRlcnByZXRlcicpXHJcbnZhciB0ZXJuYXJ5T3BzID0gcmVxdWlyZSgnLi90ZXJuYXJ5T3BzJylcclxudmFyIGdldElkID0gcmVxdWlyZSgnLi4vdXRpbHMnKS5nZXRJZFxyXG52YXIgZ2VuTW9kZWxMaXN0ID0gcmVxdWlyZSgnLi9nZW5Nb2RlbExpc3QnKVxyXG52YXIgY29uZGl0aW9uYWxOb2RlcyA9IHJlcXVpcmUoJy4vY29uZGl0aW9uYWxOb2RlcycpXHJcbnZhciBjb21wb25lbnRQYXJzZSA9IHJlcXVpcmUoJy4vY29tcG9uZW50UGFyc2UnKVxyXG5cclxuLy8gdmFyIERPQ1VNRU5UX0ZSQUdNRU5UX1RZUEUgPSAxMVxyXG4vLyB2YXIgRE9DVU1FTlRfVEVYVF9UWVBFID0gM1xyXG52YXIgRE9DVU1FTlRfRUxFTUVOVF9UWVBFID0gMVxyXG4vLyB2YXIgRE9DVU1FTlRfQ09NTUVOVF9UWVBFID0gOFxyXG4vLyB2YXIgRE9DVU1FTlRfQVRUUklCVVRFX1RZUEUgPSAyXHJcblxyXG52YXIgcmUgPSAve3soW157fV0rKX19L2dcclxuXHJcbnZhciBtb2RlbCA9IC9ebW9kZWw6L2dcclxudmFyIG1vZGVsUmF3ID0gL1xce1xce21vZGVsOihbXnt9XSspXFx9XFx9L2dcclxuXHJcbnZhciBjb25kaXRpb25hbFJlID0gL15cXD8vZ1xyXG5cclxudmFyIGNvbXBvbmVudCA9IC9eY29tcG9uZW50OihbXnt9XSspL2dcclxuXHJcbnZhciB0bXBsaGFuZGxlciA9IGZ1bmN0aW9uIChjdHgsIHVwZGF0ZVN0YXRlTGlzdCwgbW9kZWxJbnN0YW5jZSwgbW9kZWxPYmplY3QsIGNvbmRpdGlvbmFsKSB7XHJcbiAgd2luZG93LnRpbWUgPSBuZXcgRGF0ZSgpXHJcbiAgdmFyIGN1cnJlbnROb2RlXHJcbiAgdmFyIGxuXHJcbiAgdmFyIHByb3BzXHJcbiAgdmFyIHJlcFxyXG4gIHZhciBmcmFnbWVudFxyXG4gIHZhciBpbnN0YW5jZVxyXG4gIHZhciBub2RlQXR0cmlidXRlc1xyXG4gIHZhciBpID0gMFxyXG4gIHZhciBhXHJcbiAgdmFyIG5zXHJcbiAgdmFyIGV2dE5hbWVcclxuICB2YXIgY1xyXG4gIHZhciBoXHJcbiAgdmFyIGhhbmRsZXJBcmdzXHJcbiAgdmFyIGFyZ3ZcclxuICB2YXIgaGFuZGxlclxyXG4gIHZhciB0bnJcclxuICB2YXIgbW9kZWxSZXBcclxuICB2YXIgY29uZGl0aW9uYWxSZXBcclxuICB2YXIgZm5cclxuICB2YXIgcmVtID0gW11cclxuICB2YXIgaXNPYmplY3ROb3RhdGlvblxyXG4gIHZhciBuYW1lXHJcbiAgdmFyIHBcclxuICB2YXIgdmFsdWVcclxuXHJcbiAgaWYgKG1vZGVsT2JqZWN0KSB7XHJcbiAgICBpbnN0YW5jZSA9IG1vZGVsSW5zdGFuY2VcclxuICB9IGVsc2UgaWYgKGNvbmRpdGlvbmFsKSB7XHJcbiAgICBpbnN0YW5jZSA9IGNvbmRpdGlvbmFsLmZpcnN0Q2hpbGRcclxuICB9IGVsc2Uge1xyXG4gICAgZnJhZ21lbnQgPSBjdHguYmFzZVxyXG4gICAgaW5zdGFuY2UgPSBmcmFnbWVudC5maXJzdENoaWxkXHJcbiAgfVxyXG5cclxuICB2YXIgaW5zID0gbW9kZWxPYmplY3QgfHwgY3R4XHJcblxyXG4gIGZ1bmN0aW9uIHVwZGF0ZVN0YXRlIChzdGF0ZSkge1xyXG4gICAgaWYgKHR5cGVvZiB1cGRhdGVTdGF0ZUxpc3QgPT09ICdmdW5jdGlvbicpIHtcclxuICAgICAgdXBkYXRlU3RhdGVMaXN0KHN0YXRlKVxyXG4gICAgfVxyXG4gIH1cclxuXHJcbiAgZnVuY3Rpb24gdmFsQXNzaWduIChub2RlLCB2YWx1ZSwgcmVwbGFjZSwgd2l0aFRvKSB7XHJcbiAgICB2YWx1ZSA9IHZhbHVlLnJlcGxhY2UocmVwbGFjZSwgd2l0aFRvKVxyXG4gICAgaWYobm9kZSkgbm9kZS5ub2RlVmFsdWUgPSB2YWx1ZVxyXG4gIH1cclxuXHJcbiAgZnVuY3Rpb24gcmVwbGFjZUhhbmRsZUJhcnMgKHZhbHVlLCBub2RlKSB7XHJcbiAgICBwcm9wcyA9IHZhbHVlLm1hdGNoKHJlKVxyXG4gICAgbG4gPSBwcm9wcy5sZW5ndGhcclxuICAgIHdoaWxlIChsbikge1xyXG4gICAgICBsbi0tXHJcbiAgICAgIHJlcCA9IHByb3BzW2xuXS5yZXBsYWNlKHJlLCAnJDEnKVxyXG4gICAgICB0bnIgPSB0ZXJuYXJ5T3BzLmNhbGwoaW5zLCByZXApXHJcbiAgICAgIGlzT2JqZWN0Tm90YXRpb24gPSBzdHJJbnRlcnByZXRlcihyZXApXHJcbiAgICAgIGlmIChpc09iamVjdE5vdGF0aW9uKSB7XHJcbiAgICAgICAgdXBkYXRlU3RhdGUocmVwKVxyXG4gICAgICAgIHZhbEFzc2lnbihub2RlLCB2YWx1ZSwgJ3t7JyArIHJlcCArICd9fScsIGluc1tpc09iamVjdE5vdGF0aW9uWzBdXVtpc09iamVjdE5vdGF0aW9uWzFdXSlcclxuICAgICAgfSBlbHNlIHtcclxuICAgICAgICBpZiAodG5yKSB7XHJcbiAgICAgICAgICB1cGRhdGVTdGF0ZSh0bnIuc3RhdGUpXHJcbiAgICAgICAgICB2YWxBc3NpZ24obm9kZSwgdmFsdWUsICd7eycgKyByZXAgKyAnfX0nLCB0bnIudmFsdWUpXHJcbiAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgIGlmIChyZXAubWF0Y2gobW9kZWwpKSB7XHJcbiAgICAgICAgICAgIG1vZGVsUmVwID0gcmVwLnJlcGxhY2UoJ21vZGVsOicsICcnKVxyXG4gICAgICAgICAgICBnZW5Nb2RlbExpc3QuY2FsbChjdHgsIG5vZGUsIG1vZGVsUmVwLCB0bXBsaGFuZGxlcilcclxuICAgICAgICAgIH0gZWxzZSBpZiAocmVwLm1hdGNoKGNvbmRpdGlvbmFsUmUpKSB7XHJcbiAgICAgICAgICAgIGNvbmRpdGlvbmFsUmVwID0gcmVwLnJlcGxhY2UoJz8nLCAnJylcclxuICAgICAgICAgICAgaWYgKGluc1tjb25kaXRpb25hbFJlcF0gIT09IHVuZGVmaW5lZCkge1xyXG4gICAgICAgICAgICAgIHVwZGF0ZVN0YXRlKGNvbmRpdGlvbmFsUmVwKVxyXG4gICAgICAgICAgICAgIGNvbmRpdGlvbmFsTm9kZXMuY2FsbChjdHgsIG5vZGUsIGNvbmRpdGlvbmFsUmVwLCB0bXBsaGFuZGxlcilcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgfSBlbHNlIGlmIChyZXAubWF0Y2goY29tcG9uZW50KSkge1xyXG4gICAgICAgICAgICBjb21wb25lbnRQYXJzZS5jYWxsKGN0eCwgcmVwLCBub2RlKVxyXG4gICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgaWYgKGluc1tyZXBdICE9PSB1bmRlZmluZWQpIHtcclxuICAgICAgICAgICAgICB1cGRhdGVTdGF0ZShyZXApXHJcbiAgICAgICAgICAgICAgdmFsQXNzaWduKG5vZGUsIHZhbHVlLCAne3snICsgcmVwICsgJ319JywgaW5zW3JlcF0pXHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgIH1cclxuICAgICAgICB9XHJcbiAgICAgIH1cclxuICAgIH1cclxuICB9XHJcblxyXG4gIGZ1bmN0aW9uIGluc3BlY3RBdHRyaWJ1dGVzIChub2RlKSB7XHJcbiAgICBub2RlQXR0cmlidXRlcyA9IG5vZGUuYXR0cmlidXRlc1xyXG4gICAgZm9yIChpID0gbm9kZUF0dHJpYnV0ZXMubGVuZ3RoOyBpLS07KSB7XHJcbiAgICAgIGEgPSBub2RlQXR0cmlidXRlc1tpXVxyXG4gICAgICBuYW1lID0gYS5sb2NhbE5hbWVcclxuICAgICAgbnMgPSBhLm5vZGVWYWx1ZVxyXG4gICAgICBpZiAocmUudGVzdChuYW1lKSkge1xyXG4gICAgICAgIG5vZGUucmVtb3ZlQXR0cmlidXRlKG5hbWUpXHJcbiAgICAgICAgbmFtZSA9IHJlcGxhY2VIYW5kbGVCYXJzKG5hbWUpXHJcbiAgICAgICAgbm9kZS5zZXRBdHRyaWJ1dGUobmFtZSwgbnMpXHJcbiAgICAgIH0gZWxzZSBpZiAocmUudGVzdChucykpIHtcclxuICAgICAgICBucyA9IHJlcGxhY2VIYW5kbGVCYXJzKG5zKVxyXG4gICAgICAgIGlmIChucyA9PT0gJycpIHtcclxuICAgICAgICAgIG5vZGUucmVtb3ZlQXR0cmlidXRlKG5hbWUpXHJcbiAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgIGlmIChuYW1lID09PSAnY2hlY2tlZCcpIHtcclxuICAgICAgICAgICAgbm9kZS5zZXRBdHRyaWJ1dGUobmFtZSwgJycpXHJcbiAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICBub2RlLnNldEF0dHJpYnV0ZShuYW1lLCBucylcclxuICAgICAgICAgIH1cclxuICAgICAgICB9XHJcbiAgICAgIH1cclxuICAgIH1cclxuICB9XHJcblxyXG4gIGZ1bmN0aW9uIGxvb2tVcEV2dE5vZGUgKG5vZGUpIHtcclxuICAgIC8vIGNoZWNrIGlmIG5vZGUgaXMgdmlzaWJsZSBvbiBET00gYW5kIGhhcyBhdHRyaWJ1dGUgZXZ0LW5vZGVcclxuICAgIGlmIChub2RlLmhhc0F0dHJpYnV0ZSgnaWQnKSAmJiBnZXRJZChub2RlLmlkKSAmJiBub2RlLmhhc0F0dHJpYnV0ZSgnZXZ0LW5vZGUnKSkge1xyXG4gICAgICByZXR1cm4gdHJ1ZVxyXG4gICAgfVxyXG4gICAgcmV0dXJuIGZhbHNlXHJcbiAgfVxyXG5cclxuICBmdW5jdGlvbiBhZGRFdmVudCAobm9kZSkge1xyXG4gICAgbm9kZUF0dHJpYnV0ZXMgPSBub2RlLmF0dHJpYnV0ZXNcclxuXHJcbiAgICBpZiAobG9va1VwRXZ0Tm9kZShub2RlKSkge1xyXG4gICAgICAvLyBza2lwIGFkZGRpbmcgZXZlbnQgZm9yIG5vZGUgdGhhdCBhbHJlYWR5IGhhcyBldmVudFxyXG4gICAgICAvLyB0byBhbGxvdyBza2lwcGluZyBhZGRpbmcgZXZlbnQgdGhlIG5vZGUgbXVzdCBpbmNsdWRlIGBpZGAvXHJcbiAgICB9IGVsc2Uge1xyXG4gICAgICAvLyBvbmx5IGFkZCBldmVudCB3aGVuIG5vZGUgZG9lcyBub3QgaGFzIG9uZVxyXG4gICAgICBmb3IgKGkgPSBub2RlQXR0cmlidXRlcy5sZW5ndGg7IGktLTspIHtcclxuICAgICAgICBhID0gbm9kZUF0dHJpYnV0ZXNbaV1cclxuICAgICAgICBuYW1lID0gYS5sb2NhbE5hbWVcclxuICAgICAgICBucyA9IGEubm9kZVZhbHVlXHJcbiAgICAgICAgaWYgKC9eay0vLnRlc3QobmFtZSkpIHtcclxuICAgICAgICAgIGV2dE5hbWUgPSBuYW1lLnJlcGxhY2UoL15rLS8sICcnKVxyXG4gICAgICAgICAgaGFuZGxlciA9IG5zLm1hdGNoKC9bYS16QS1aXSsoPyFbXihdKlxcKSkvKVswXVxyXG4gICAgICAgICAgYyA9IGN0eFtoYW5kbGVyXVxyXG4gICAgICAgICAgaWYgKGMgIT09IHVuZGVmaW5lZCAmJiB0eXBlb2YgYyA9PT0gJ2Z1bmN0aW9uJykge1xyXG4gICAgICAgICAgICBoID0gbnMubWF0Y2goL1xcKChbXnt9XSspXFwpLylcclxuICAgICAgICAgICAgaGFuZGxlckFyZ3MgPSBoID8gaFsxXSA6ICcnXHJcbiAgICAgICAgICAgIGFyZ3YgPSBoYW5kbGVyQXJncy5zcGxpdCgnLCcpLmZpbHRlcihmdW5jdGlvbiAoZikge1xyXG4gICAgICAgICAgICAgIHJldHVybiBmICE9PSAnJ1xyXG4gICAgICAgICAgICB9KVxyXG4gICAgICAgICAgICByZW0ucHVzaChuYW1lKVxyXG4gICAgICAgICAgICBmbiA9IGZ1bmN0aW9uIChlKSB7XHJcbiAgICAgICAgICAgICAgZS5zdG9wUHJvcGFnYXRpb24oKVxyXG4gICAgICAgICAgICAgIGlmIChlLnRhcmdldCAhPT0gZS5jdXJyZW50VGFyZ2V0KSB7XHJcbiAgICAgICAgICAgICAgICBjLmFwcGx5KGN0eCwgW2UudGFyZ2V0LCBlXSlcclxuICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgLy8gaWYgbm9kZSBpcyB0aGUgcm9vdE5vZGUgZm9yIG1vZGVsLCB3ZSB3cmFwIHRoZSBldmVudExpc3RlbmVyIGFuZFxyXG4gICAgICAgICAgICAvLyByZWJ1aWxkIHRoZSBhcmd1bWVudHMgYnkgYXBwZW5kaW5nIGlkL2NsYXNzTmFtZSB1dGlsIHJvb3ROb2RlLlxyXG4gICAgICAgICAgICBpZiAobm9kZS5oYXNDaGlsZE5vZGVzKCkgJiYgbm9kZS5maXJzdENoaWxkLm5vZGVUeXBlICE9PSBET0NVTUVOVF9FTEVNRU5UX1RZUEUgJiYgbm9kZS5maXJzdENoaWxkLm5vZGVWYWx1ZS5tYXRjaChtb2RlbFJhdykpIHtcclxuICAgICAgICAgICAgICBub2RlLnNldEF0dHJpYnV0ZSgnaXMtbW9kZWwtZXZlbnQtc2V0JywgJycpXHJcbiAgICAgICAgICAgICAgbm9kZS5hZGRFdmVudExpc3RlbmVyKGV2dE5hbWUsIGZuLCBmYWxzZSlcclxuICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICBub2RlLmFkZEV2ZW50TGlzdGVuZXIoZXZ0TmFtZSwgYy5iaW5kLmFwcGx5KGMuYmluZChjdHgpLCBbbm9kZV0uY29uY2F0KGFyZ3YpKSwgZmFsc2UpXHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgaWYoIW5vZGUuaGFzQXR0cmlidXRlKCdldnQtbm9kZScpKXtcclxuICAgICAgICAgICAgICBub2RlLnNldEF0dHJpYnV0ZSgnZXZ0LW5vZGUnLCAnJylcclxuICAgICAgICAgICAgICBpZiAobm9kZS5oYXNBdHRyaWJ1dGUoJ2lkJykpIHtcclxuICAgICAgICAgICAgICAgIHAgPSBjdHguX19wcmlzdGluZUZyYWdtZW50X18uZ2V0RWxlbWVudEJ5SWQobm9kZS5pZClcclxuICAgICAgICAgICAgICAgIHAuc2V0QXR0cmlidXRlKCdldnQtbm9kZScsICcnKVxyXG4gICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuICAgICAgfVxyXG4gICAgfVxyXG4gIH1cclxuXHJcbiAgZnVuY3Rpb24gY2hlY2sgKG5vZGUpIHtcclxuICAgIHdoaWxlIChub2RlKSB7XHJcbiAgICAgIGN1cnJlbnROb2RlID0gbm9kZVxyXG4gICAgICBpZiAoY3VycmVudE5vZGUubm9kZVR5cGUgPT09IERPQ1VNRU5UX0VMRU1FTlRfVFlQRSkge1xyXG4gICAgICAgIGlmIChjdXJyZW50Tm9kZS5oYXNBdHRyaWJ1dGVzKCkpIHtcclxuICAgICAgICAgIGFkZEV2ZW50KGN1cnJlbnROb2RlKVxyXG4gICAgICAgICAgaW5zcGVjdEF0dHJpYnV0ZXMoY3VycmVudE5vZGUpXHJcbiAgICAgICAgfVxyXG4gICAgICAgIGNoZWNrKGN1cnJlbnROb2RlLmZpcnN0Q2hpbGQpXHJcbiAgICAgIH0gZWxzZSBpZiAoY3VycmVudE5vZGUubm9kZVZhbHVlLm1hdGNoKHJlKSkge1xyXG4gICAgICAgIHJlcGxhY2VIYW5kbGVCYXJzKGN1cnJlbnROb2RlLm5vZGVWYWx1ZSwgY3VycmVudE5vZGUpXHJcbiAgICAgIH1cclxuICAgICAgbm9kZSA9IG5vZGUubmV4dFNpYmxpbmdcclxuICAgIH1cclxuICB9XHJcblxyXG4gIGNoZWNrKGluc3RhbmNlKVxyXG59XHJcblxyXG5tb2R1bGUuZXhwb3J0cyA9IHRtcGxoYW5kbGVyXHJcbiIsIid1c2Ugc3RyaWN0J1xyXG4vKipcclxuICogS2VldGpzIHY0LjAuMCBBbHBoYSByZWxlYXNlOiBodHRwczovL2dpdGh1Yi5jb20va2VldGpzL2tlZXQuanNcclxuICogTWluaW1hbGlzdCB2aWV3IGxheWVyIGZvciB0aGUgd2ViXHJcbiAqXHJcbiAqIDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PCBLZWV0anMgPj4+Pj4+Pj4+Pj4+Pj4+Pj4+Pj4+Pj4+Pj4+Pj4+XHJcbiAqXHJcbiAqIENvcHlyaWdodCAyMDE4LCBTaGFocnVsIE5pemFtIFNlbGFtYXRcclxuICogUmVsZWFzZWQgdW5kZXIgdGhlIE1JVCBMaWNlbnNlLlxyXG4gKi9cclxuXHJcbndpbmRvdy5sID0gIHdpbmRvdy5sIHx8IGNvbnNvbGUubG9nLmJpbmQoY29uc29sZSlcclxud2luZG93LnMgPSB3aW5kb3cucyB8fCBjb25zb2xlLnRpbWUuYmluZChjb25zb2xlKVxyXG53aW5kb3cuZSA9IHdpbmRvdy5lIHx8IGNvbnNvbGUudGltZUVuZC5iaW5kKGNvbnNvbGUpXHJcblxyXG52YXIgcGFyc2VTdHIgPSByZXF1aXJlKCcuL2NvbXBvbmVudHMvcGFyc2VTdHInKVxyXG52YXIgdXBkYXRlQ29udGV4dCA9IHJlcXVpcmUoJy4vY29tcG9uZW50cy9nZW5FbGVtZW50JykudXBkYXRlQ29udGV4dFxyXG52YXIgbW9ycGhlciA9IHJlcXVpcmUoJy4vY29tcG9uZW50cy9nZW5FbGVtZW50JykubW9ycGhlclxyXG52YXIgY2xlYXJTdGF0ZSA9IHJlcXVpcmUoJy4vY29tcG9uZW50cy9nZW5FbGVtZW50JykuY2xlYXJTdGF0ZVxyXG52YXIgZ2V0SWQgPSByZXF1aXJlKCcuL3V0aWxzJykuZ2V0SWRcclxudmFyIGdlbklkID0gcmVxdWlyZSgnLi91dGlscycpLmdlbklkXHJcbnZhciBhc3NlcnQgPSByZXF1aXJlKCcuL3V0aWxzJykuYXNzZXJ0XHJcblxyXG52YXIgRE9DVU1FTlRfRlJBR01FTlRfVFlQRSA9IDExXHJcbnZhciBET0NVTUVOVF9URVhUX1RZUEUgPSAzXHJcbnZhciBET0NVTUVOVF9FTEVNRU5UX1RZUEUgPSAxXHJcblxyXG4vKipcclxuICogQGRlc2NyaXB0aW9uXHJcbiAqIFRoZSBtYWluIGNvbnN0cnVjdG9yIG9mIEtlZXRcclxuICpcclxuICogQmFzaWMgVXNhZ2UgOi1cclxuICpcclxuICogICAgY29uc3QgQXBwIGV4dGVuZHMgS2VldCB7fVxyXG4gKiAgICBjb25zdCBhcHAgPSBuZXcgQXBwKClcclxuICogICAgYXBwLm1vdW50KCdoZWxsbyB3b3JsZCcpLmxpbmsoJ2FwcCcpXHJcbiAqXHJcbiAqL1xyXG5mdW5jdGlvbiBLZWV0ICgpIHtcclxuICB0aGlzLklEID0gZ2VuSWQoKVxyXG59XHJcblxyXG5LZWV0LnByb3RvdHlwZS5tb3VudCA9IGZ1bmN0aW9uIChpbnN0YW5jZSkge1xyXG4gIHZhciBiYXNlXHJcbiAgdmFyIHRlbXBEaXZcclxuICB2YXIgZnJhZyA9IGRvY3VtZW50LmNyZWF0ZURvY3VtZW50RnJhZ21lbnQoKVxyXG4gIC8vIEJlZm9yZSB3ZSBiZWdpbiB0byBwYXJzZSBhbiBpbnN0YW5jZSwgZG8gYSBydW4tZG93biBjaGVja3NcclxuICAvLyB0byBjbGVhbiB1cCBiYWNrLXRpY2sgc3RyaW5nIHdoaWNoIHVzdWFsbHkgaGFzIGxpbmUgc3BhY2luZy5cclxuICBpZiAodHlwZW9mIGluc3RhbmNlID09PSAnc3RyaW5nJykge1xyXG4gICAgYmFzZSA9IGluc3RhbmNlLnRyaW0oKS5yZXBsYWNlKC9cXHMrL2csICcgJylcclxuICAgIHRlbXBEaXYgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdkaXYnKVxyXG4gICAgdGVtcERpdi5pbm5lckhUTUwgPSBiYXNlXHJcbiAgICB3aGlsZSAodGVtcERpdi5maXJzdENoaWxkKSB7XHJcbiAgICAgIGZyYWcuYXBwZW5kQ2hpbGQodGVtcERpdi5maXJzdENoaWxkKVxyXG4gICAgfVxyXG4gIC8vIElmIGluc3RhbmNlIGlzIGEgaHRtbCBlbGVtZW50IHByb2Nlc3MgYXMgaHRtbCBlbnRpdGllc1xyXG4gIH0gZWxzZSBpZiAodHlwZW9mIGluc3RhbmNlID09PSAnb2JqZWN0JyAmJiBpbnN0YW5jZVsnbm9kZVR5cGUnXSkge1xyXG4gICAgaWYgKGluc3RhbmNlWydub2RlVHlwZSddID09PSBET0NVTUVOVF9FTEVNRU5UX1RZUEUpIHtcclxuICAgICAgZnJhZy5hcHBlbmRDaGlsZChpbnN0YW5jZSlcclxuICAgIH0gZWxzZSBpZiAoaW5zdGFuY2VbJ25vZGVUeXBlJ10gPT09IERPQ1VNRU5UX0ZSQUdNRU5UX1RZUEUpIHtcclxuICAgICAgZnJhZyA9IGluc3RhbmNlXHJcbiAgICB9IGVsc2UgaWYgKGluc3RhbmNlWydub2RlVHlwZSddID09PSBET0NVTUVOVF9URVhUX1RZUEUpIHtcclxuICAgICAgZnJhZy5hcHBlbmRDaGlsZChpbnN0YW5jZSlcclxuICAgIH0gZWxzZSB7XHJcbiAgICAgIGFzc2VydChmYWxzZSwgJ1VuYWJsZSB0byBwYXJzZSBpbnN0YW5jZSwgdW5rbm93biB0eXBlLicpXHJcbiAgICB9XHJcbiAgfSBlbHNlIHtcclxuICAgIGFzc2VydChmYWxzZSwgJ1BhcmFtZXRlciBpcyBub3QgYSBzdHJpbmcgb3IgYSBodG1sIGVsZW1lbnQuJylcclxuICB9XHJcbiAgLy8gd2Ugc3RvcmUgdGhlIHByaXN0aW5lIGluc3RhbmNlIGluIF9fcHJpc3RpbmVGcmFnbWVudF9fXHJcbiAgdGhpcy5fX3ByaXN0aW5lRnJhZ21lbnRfXyA9IGZyYWcuY2xvbmVOb2RlKHRydWUpXHJcbiAgdGhpcy5iYXNlID0gZnJhZ1xyXG5cclxuICAvLyBjbGVhbnVwIHN0YXRlcyBvbiBtb3VudFxyXG4gIGNsZWFyU3RhdGUoKVxyXG5cclxuICByZXR1cm4gdGhpc1xyXG59XHJcblxyXG5LZWV0LnByb3RvdHlwZS5mbHVzaCA9IGZ1bmN0aW9uIChpbnN0YW5jZSkge1xyXG4gIC8vIEN1c3RvbSBtZXRob2QgdG8gY2xlYW4gdXAgdGhlIGNvbXBvbmVudCBET00gdHJlZVxyXG4gIC8vIHVzZWZ1bCBpZiB3ZSBuZWVkIHRvIGRvIGNsZWFuIHVwIHJlcmVuZGVyLlxyXG4gIHZhciBlbCA9IGluc3RhbmNlIHx8IHRoaXMuZWxcclxuICB2YXIgZWxlID0gZ2V0SWQoZWwpXHJcbiAgaWYgKGVsZSkgZWxlLmlubmVySFRNTCA9ICcnXHJcbiAgcmV0dXJuIHRoaXNcclxufVxyXG5cclxuS2VldC5wcm90b3R5cGUubGluayA9IGZ1bmN0aW9uIChpZCkge1xyXG4gIC8vIFRoZSB0YXJnZXQgRE9NIHdoZXJlIHRoZSByZW5kZXJpbmcgd2lsbCB0b29rIHBsYWNlLlxyXG4gIGlmICghaWQpIGFzc2VydChpZCwgJ05vIGlkIGlzIGdpdmVuIGFzIHBhcmFtZXRlci4nKVxyXG4gIHRoaXMuZWwgPSBpZFxyXG4gIHRoaXMucmVuZGVyKClcclxuICByZXR1cm4gdGhpc1xyXG59XHJcblxyXG5LZWV0LnByb3RvdHlwZS5yZW5kZXIgPSBmdW5jdGlvbiAoc3R1Yikge1xyXG4gIC8vIGxpZmUtY3ljbGUgbWV0aG9kIGJlZm9yZSByZW5kZXJpbmcgdGhlIGNvbXBvbmVudFxyXG4gIGlmICh0aGlzLmNvbXBvbmVudFdpbGxNb3VudCAmJiB0eXBlb2YgdGhpcy5jb21wb25lbnRXaWxsTW91bnQgPT09ICdmdW5jdGlvbicpIHtcclxuICAgIHRoaXMuY29tcG9uZW50V2lsbE1vdW50KClcclxuICB9XHJcblxyXG4gIC8vIFJlbmRlciB0aGlzIGNvbXBvbmVudCB0byB0aGUgdGFyZ2V0IERPTVxyXG4gIGlmKHN0dWIpe1xyXG4gICAgdGhpcy5JU19TVFVCID0gdHJ1ZVxyXG4gIH1cclxuICBwYXJzZVN0ci5jYWxsKHRoaXMsIHN0dWIpXHJcbn1cclxuXHJcbktlZXQucHJvdG90eXBlLmNsdXN0ZXIgPSBmdW5jdGlvbiAoKSB7XHJcbiAgLy8gQ2hhaW4gbWV0aG9kIHRvIHJ1biBleHRlcm5hbCBmdW5jdGlvbihzKSwgdGhpcyBiYXNpY2FsbHkgc2VydmVcclxuICAvLyBhcyBhbiBpbml0aWFsaXplciBmb3IgYWxsIG5vbiBhdHRhY2hlZCBjaGlsZCBjb21wb25lbnRzIHdpdGhpbiB0aGUgaW5zdGFuY2UgdHJlZVxyXG4gIHZhciBhcmdzID0gW10uc2xpY2UuY2FsbChhcmd1bWVudHMpXHJcbiAgaWYgKGFyZ3MubGVuZ3RoID4gMCkge1xyXG4gICAgYXJncy5tYXAoZnVuY3Rpb24gKGYpIHtcclxuICAgICAgaWYgKHR5cGVvZiBmID09PSAnZnVuY3Rpb24nKSBmKClcclxuICAgIH0pXHJcbiAgfVxyXG59XHJcblxyXG5LZWV0LnByb3RvdHlwZS5jYWxsQmF0Y2hQb29sVXBkYXRlID0gZnVuY3Rpb24gKCkge1xyXG4gIC8vIGZvcmNlIGNvbXBvbmVudCB0byB1cGRhdGUsIGlmIGFueSBzdGF0ZSAvIG5vbi1zdGF0ZVxyXG4gIC8vIHZhbHVlIGNoYW5nZWQgRE9NIGRpZmZpbmcgd2lsbCBvY2N1clxyXG4gIHVwZGF0ZUNvbnRleHQuY2FsbCh0aGlzLCBtb3JwaGVyLCAxKVxyXG59XHJcblxyXG5LZWV0LnByb3RvdHlwZS5zdWJzY3JpYmUgPSBmdW5jdGlvbihmbikge1xyXG4gIHRoaXMuZXhlYyA9IGZuXHJcbn1cclxuXHJcbktlZXQucHJvdG90eXBlLmluZm9ybSA9IGZ1bmN0aW9uIChtb2RlbCkge1xyXG4gIHRoaXMuZXhlYyAmJiB0aGlzLmV4ZWMobW9kZWwpXHJcbn1cclxuXHJcbm1vZHVsZS5leHBvcnRzID0gS2VldFxyXG4iLCIndXNlIHN0cmljdCdcblxuc2V0RE9NLktFWSA9ICdkYXRhLWtleSdcbnNldERPTS5JR05PUkUgPSAnZGF0YS1pZ25vcmUnXG5zZXRET00uQ0hFQ0tTVU0gPSAnZGF0YS1jaGVja3N1bSdcbnZhciBwYXJzZUhUTUwgPSByZXF1aXJlKCcuL3BhcnNlLWh0bWwnKVxudmFyIEtFWV9QUkVGSVggPSAnX3NldC1kb20tJ1xudmFyIE5PREVfTU9VTlRFRCA9IEtFWV9QUkVGSVggKyAnbW91bnRlZCdcbnZhciBFTEVNRU5UX1RZUEUgPSAxXG52YXIgRE9DVU1FTlRfVFlQRSA9IDlcbnZhciBET0NVTUVOVF9GUkFHTUVOVF9UWVBFID0gMTFcblxuLy8gRXhwb3NlIGFwaS5cbm1vZHVsZS5leHBvcnRzID0gc2V0RE9NXG5cbi8qKlxuICogQGRlc2NyaXB0aW9uXG4gKiBVcGRhdGVzIGV4aXN0aW5nIGRvbSB0byBtYXRjaCBhIG5ldyBkb20uXG4gKlxuICogQHBhcmFtIHtOb2RlfSBvbGROb2RlIC0gVGhlIGh0bWwgZW50aXR5IHRvIHVwZGF0ZS5cbiAqIEBwYXJhbSB7U3RyaW5nfE5vZGV9IG5ld05vZGUgLSBUaGUgdXBkYXRlZCBodG1sKGVudGl0eSkuXG4gKi9cbmZ1bmN0aW9uIHNldERPTSAob2xkTm9kZSwgbmV3Tm9kZSkge1xuICAvLyBFbnN1cmUgYSByZWFsaXNoIGRvbSBub2RlIGlzIHByb3ZpZGVkLlxuICBhc3NlcnQob2xkTm9kZSAmJiBvbGROb2RlLm5vZGVUeXBlLCAnWW91IG11c3QgcHJvdmlkZSBhIHZhbGlkIG5vZGUgdG8gdXBkYXRlLicpXG5cbiAgLy8gQWxpYXMgZG9jdW1lbnQgZWxlbWVudCB3aXRoIGRvY3VtZW50LlxuICBpZiAob2xkTm9kZS5ub2RlVHlwZSA9PT0gRE9DVU1FTlRfVFlQRSkgb2xkTm9kZSA9IG9sZE5vZGUuZG9jdW1lbnRFbGVtZW50XG5cbiAgLy8gRG9jdW1lbnQgRnJhZ21lbnRzIGRvbid0IGhhdmUgYXR0cmlidXRlcywgc28gbm8gbmVlZCB0byBsb29rIGF0IGNoZWNrc3VtcywgaWdub3JlZCwgYXR0cmlidXRlcywgb3Igbm9kZSByZXBsYWNlbWVudC5cbiAgaWYgKG5ld05vZGUubm9kZVR5cGUgPT09IERPQ1VNRU5UX0ZSQUdNRU5UX1RZUEUpIHtcbiAgICAvLyBTaW1wbHkgdXBkYXRlIGFsbCBjaGlsZHJlbiAoYW5kIHN1YmNoaWxkcmVuKS5cbiAgICBzZXRDaGlsZE5vZGVzKG9sZE5vZGUsIG5ld05vZGUpXG4gIH0gZWxzZSB7XG4gICAgLy8gT3RoZXJ3aXNlIHdlIGRpZmYgdGhlIGVudGlyZSBvbGQgbm9kZS5cbiAgICBzZXROb2RlKG9sZE5vZGUsIHR5cGVvZiBuZXdOb2RlID09PSAnc3RyaW5nJ1xuICAgICAgLy8gSWYgYSBzdHJpbmcgd2FzIHByb3ZpZGVkIHdlIHdpbGwgcGFyc2UgaXQgYXMgZG9tLlxuICAgICAgPyBwYXJzZUhUTUwobmV3Tm9kZSwgb2xkTm9kZS5ub2RlTmFtZSlcbiAgICAgIDogbmV3Tm9kZVxuICAgIClcbiAgfVxuXG4gIC8vIFRyaWdnZXIgbW91bnQgZXZlbnRzIG9uIGluaXRpYWwgc2V0LlxuICBpZiAoIW9sZE5vZGVbTk9ERV9NT1VOVEVEXSkge1xuICAgIG9sZE5vZGVbTk9ERV9NT1VOVEVEXSA9IHRydWVcbiAgICBtb3VudChvbGROb2RlKVxuICB9XG59XG5cbi8qKlxuICogQHByaXZhdGVcbiAqIEBkZXNjcmlwdGlvblxuICogVXBkYXRlcyBhIHNwZWNpZmljIGh0bWxOb2RlIGFuZCBkb2VzIHdoYXRldmVyIGl0IHRha2VzIHRvIGNvbnZlcnQgaXQgdG8gYW5vdGhlciBvbmUuXG4gKlxuICogQHBhcmFtIHtOb2RlfSBvbGROb2RlIC0gVGhlIHByZXZpb3VzIEhUTUxOb2RlLlxuICogQHBhcmFtIHtOb2RlfSBuZXdOb2RlIC0gVGhlIHVwZGF0ZWQgSFRNTE5vZGUuXG4gKi9cbmZ1bmN0aW9uIHNldE5vZGUgKG9sZE5vZGUsIG5ld05vZGUpIHtcbiAgaWYgKG9sZE5vZGUubm9kZVR5cGUgPT09IG5ld05vZGUubm9kZVR5cGUpIHtcbiAgICAvLyBIYW5kbGUgcmVndWxhciBlbGVtZW50IG5vZGUgdXBkYXRlcy5cbiAgICBpZiAob2xkTm9kZS5ub2RlVHlwZSA9PT0gRUxFTUVOVF9UWVBFKSB7XG4gICAgICAvLyBDaGVja3MgaWYgbm9kZXMgYXJlIGVxdWFsIGJlZm9yZSBkaWZmaW5nLlxuICAgICAgaWYgKGlzRXF1YWxOb2RlKG9sZE5vZGUsIG5ld05vZGUpKSB7XG4gICAgICAgIC8vIGNvbnNvbGUudHJhY2Uob2xkTm9kZSlcbiAgICAgICAgcmV0dXJuXG4gICAgICB9XG5cbiAgICAgIC8vIFVwZGF0ZSBhbGwgY2hpbGRyZW4gKGFuZCBzdWJjaGlsZHJlbikuXG4gICAgICBzZXRDaGlsZE5vZGVzKG9sZE5vZGUsIG5ld05vZGUpXG5cbiAgICAgIC8vIFVwZGF0ZSB0aGUgZWxlbWVudHMgYXR0cmlidXRlcyAvIHRhZ05hbWUuXG4gICAgICBpZiAob2xkTm9kZS5ub2RlTmFtZSA9PT0gbmV3Tm9kZS5ub2RlTmFtZSkge1xuICAgICAgICAvLyBJZiB3ZSBoYXZlIHRoZSBzYW1lIG5vZGVuYW1lIHRoZW4gd2UgY2FuIGRpcmVjdGx5IHVwZGF0ZSB0aGUgYXR0cmlidXRlcy5cbiAgICAgICAgc2V0QXR0cmlidXRlcyhvbGROb2RlLmF0dHJpYnV0ZXMsIG5ld05vZGUuYXR0cmlidXRlcylcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIC8vIE90aGVyd2lzZSBjbG9uZSB0aGUgbmV3IG5vZGUgdG8gdXNlIGFzIHRoZSBleGlzdGluZyBub2RlLlxuICAgICAgICB2YXIgbmV3UHJldiA9IG5ld05vZGUuY2xvbmVOb2RlKClcbiAgICAgICAgLy8gQ29weSBvdmVyIGFsbCBleGlzdGluZyBjaGlsZHJlbiBmcm9tIHRoZSBvcmlnaW5hbCBub2RlLlxuICAgICAgICB3aGlsZSAob2xkTm9kZS5maXJzdENoaWxkKSBuZXdQcmV2LmFwcGVuZENoaWxkKG9sZE5vZGUuZmlyc3RDaGlsZClcbiAgICAgICAgLy8gUmVwbGFjZSB0aGUgb3JpZ2luYWwgbm9kZSB3aXRoIHRoZSBuZXcgb25lIHdpdGggdGhlIHJpZ2h0IHRhZy5cbiAgICAgICAgb2xkTm9kZS5wYXJlbnROb2RlLnJlcGxhY2VDaGlsZChuZXdQcmV2LCBvbGROb2RlKVxuICAgICAgfVxuICAgIH0gZWxzZSB7XG4gICAgICAvLyBIYW5kbGUgb3RoZXIgdHlwZXMgb2Ygbm9kZSB1cGRhdGVzICh0ZXh0L2NvbW1lbnRzL2V0YykuXG4gICAgICAvLyBJZiBib3RoIGFyZSB0aGUgc2FtZSB0eXBlIG9mIG5vZGUgd2UgY2FuIHVwZGF0ZSBkaXJlY3RseS5cbiAgICAgIGlmIChvbGROb2RlLm5vZGVWYWx1ZSAhPT0gbmV3Tm9kZS5ub2RlVmFsdWUpIHtcbiAgICAgICAgb2xkTm9kZS5ub2RlVmFsdWUgPSBuZXdOb2RlLm5vZGVWYWx1ZVxuICAgICAgfVxuICAgIH1cbiAgfSBlbHNlIHtcbiAgICAvLyB3ZSBoYXZlIHRvIHJlcGxhY2UgdGhlIG5vZGUuXG4gICAgb2xkTm9kZS5wYXJlbnROb2RlLnJlcGxhY2VDaGlsZChuZXdOb2RlLCBkaXNtb3VudChvbGROb2RlKSlcbiAgICBtb3VudChuZXdOb2RlKVxuICB9XG59XG5cbi8qKlxuICogQHByaXZhdGVcbiAqIEBkZXNjcmlwdGlvblxuICogVXRpbGl0eSB0aGF0IHdpbGwgdXBkYXRlIG9uZSBsaXN0IG9mIGF0dHJpYnV0ZXMgdG8gbWF0Y2ggYW5vdGhlci5cbiAqXG4gKiBAcGFyYW0ge05hbWVkTm9kZU1hcH0gb2xkQXR0cmlidXRlcyAtIFRoZSBwcmV2aW91cyBhdHRyaWJ1dGVzLlxuICogQHBhcmFtIHtOYW1lZE5vZGVNYXB9IG5ld0F0dHJpYnV0ZXMgLSBUaGUgdXBkYXRlZCBhdHRyaWJ1dGVzLlxuICovXG5mdW5jdGlvbiBzZXRBdHRyaWJ1dGVzIChvbGRBdHRyaWJ1dGVzLCBuZXdBdHRyaWJ1dGVzKSB7XG4gIHZhciBpLCBhLCBiLCBucywgbmFtZVxuXG4gIC8vIFJlbW92ZSBvbGQgYXR0cmlidXRlcy5cbiAgZm9yIChpID0gb2xkQXR0cmlidXRlcy5sZW5ndGg7IGktLTspIHtcbiAgICBhID0gb2xkQXR0cmlidXRlc1tpXVxuICAgIG5zID0gYS5uYW1lc3BhY2VVUklcbiAgICBuYW1lID0gYS5sb2NhbE5hbWVcbiAgICBiID0gbmV3QXR0cmlidXRlcy5nZXROYW1lZEl0ZW1OUyhucywgbmFtZSlcbiAgICBpZiAoIWIpIG9sZEF0dHJpYnV0ZXMucmVtb3ZlTmFtZWRJdGVtTlMobnMsIG5hbWUpXG4gIH1cblxuICAvLyBTZXQgbmV3IGF0dHJpYnV0ZXMuXG4gIGZvciAoaSA9IG5ld0F0dHJpYnV0ZXMubGVuZ3RoOyBpLS07KSB7XG4gICAgYSA9IG5ld0F0dHJpYnV0ZXNbaV1cbiAgICBucyA9IGEubmFtZXNwYWNlVVJJXG4gICAgbmFtZSA9IGEubG9jYWxOYW1lXG4gICAgYiA9IG9sZEF0dHJpYnV0ZXMuZ2V0TmFtZWRJdGVtTlMobnMsIG5hbWUpXG4gICAgaWYgKCFiKSB7XG4gICAgICAvLyBBZGQgYSBuZXcgYXR0cmlidXRlLlxuICAgICAgbmV3QXR0cmlidXRlcy5yZW1vdmVOYW1lZEl0ZW1OUyhucywgbmFtZSlcbiAgICAgIG9sZEF0dHJpYnV0ZXMuc2V0TmFtZWRJdGVtTlMoYSlcbiAgICB9IGVsc2UgaWYgKGIudmFsdWUgIT09IGEudmFsdWUpIHtcbiAgICAgIC8vIFVwZGF0ZSBleGlzdGluZyBhdHRyaWJ1dGUuXG4gICAgICBiLnZhbHVlID0gYS52YWx1ZVxuICAgIH1cbiAgfVxufVxuXG4vKipcbiAqIEBwcml2YXRlXG4gKiBAZGVzY3JpcHRpb25cbiAqIFV0aWxpdHkgdGhhdCB3aWxsIG5vZGVzIGNoaWxkZXJuIHRvIG1hdGNoIGFub3RoZXIgbm9kZXMgY2hpbGRyZW4uXG4gKlxuICogQHBhcmFtIHtOb2RlfSBvbGRQYXJlbnQgLSBUaGUgZXhpc3RpbmcgcGFyZW50IG5vZGUuXG4gKiBAcGFyYW0ge05vZGV9IG5ld1BhcmVudCAtIFRoZSBuZXcgcGFyZW50IG5vZGUuXG4gKi9cbmZ1bmN0aW9uIHNldENoaWxkTm9kZXMgKG9sZFBhcmVudCwgbmV3UGFyZW50KSB7XG4gIHZhciBjaGVja09sZCwgb2xkS2V5LCBjaGVja05ldywgbmV3S2V5LCBmb3VuZE5vZGUsIGtleWVkTm9kZXNcbiAgdmFyIG9sZE5vZGUgPSBvbGRQYXJlbnQuZmlyc3RDaGlsZFxuICB2YXIgbmV3Tm9kZSA9IG5ld1BhcmVudC5maXJzdENoaWxkXG4gIHZhciBleHRyYSA9IDBcblxuICAvLyBFeHRyYWN0IGtleWVkIG5vZGVzIGZyb20gcHJldmlvdXMgY2hpbGRyZW4gYW5kIGtlZXAgdHJhY2sgb2YgdG90YWwgY291bnQuXG4gIHdoaWxlIChvbGROb2RlKSB7XG4gICAgZXh0cmErK1xuICAgIGNoZWNrT2xkID0gb2xkTm9kZVxuICAgIG9sZEtleSA9IGdldEtleShjaGVja09sZClcbiAgICBvbGROb2RlID0gb2xkTm9kZS5uZXh0U2libGluZ1xuXG4gICAgaWYgKG9sZEtleSkge1xuICAgICAgaWYgKCFrZXllZE5vZGVzKSBrZXllZE5vZGVzID0ge31cbiAgICAgIGtleWVkTm9kZXNbb2xkS2V5XSA9IGNoZWNrT2xkXG4gICAgfVxuICB9XG5cbiAgLy8gTG9vcCBvdmVyIG5ldyBub2RlcyBhbmQgcGVyZm9ybSB1cGRhdGVzLlxuICBvbGROb2RlID0gb2xkUGFyZW50LmZpcnN0Q2hpbGRcbiAgd2hpbGUgKG5ld05vZGUpIHtcbiAgICBleHRyYS0tXG4gICAgY2hlY2tOZXcgPSBuZXdOb2RlXG4gICAgbmV3Tm9kZSA9IG5ld05vZGUubmV4dFNpYmxpbmdcblxuICAgIGlmIChrZXllZE5vZGVzICYmIChuZXdLZXkgPSBnZXRLZXkoY2hlY2tOZXcpKSAmJiAoZm91bmROb2RlID0ga2V5ZWROb2Rlc1tuZXdLZXldKSkge1xuICAgICAgZGVsZXRlIGtleWVkTm9kZXNbbmV3S2V5XVxuICAgICAgLy8gSWYgd2UgaGF2ZSBhIGtleSBhbmQgaXQgZXhpc3RlZCBiZWZvcmUgd2UgbW92ZSB0aGUgcHJldmlvdXMgbm9kZSB0byB0aGUgbmV3IHBvc2l0aW9uIGlmIG5lZWRlZCBhbmQgZGlmZiBpdC5cbiAgICAgIGlmIChmb3VuZE5vZGUgIT09IG9sZE5vZGUpIHtcbiAgICAgICAgb2xkUGFyZW50Lmluc2VydEJlZm9yZShmb3VuZE5vZGUsIG9sZE5vZGUpXG4gICAgICB9IGVsc2Uge1xuICAgICAgICBvbGROb2RlID0gb2xkTm9kZS5uZXh0U2libGluZ1xuICAgICAgfVxuXG4gICAgICBzZXROb2RlKGZvdW5kTm9kZSwgY2hlY2tOZXcpXG4gICAgfSBlbHNlIGlmIChvbGROb2RlKSB7XG4gICAgICBjaGVja09sZCA9IG9sZE5vZGVcbiAgICAgIG9sZE5vZGUgPSBvbGROb2RlLm5leHRTaWJsaW5nXG4gICAgICBpZiAoZ2V0S2V5KGNoZWNrT2xkKSkge1xuICAgICAgICAvLyBJZiB0aGUgb2xkIGNoaWxkIGhhZCBhIGtleSB3ZSBza2lwIG92ZXIgaXQgdW50aWwgdGhlIGVuZC5cbiAgICAgICAgb2xkUGFyZW50Lmluc2VydEJlZm9yZShjaGVja05ldywgY2hlY2tPbGQpXG4gICAgICAgIG1vdW50KGNoZWNrTmV3KVxuICAgICAgfSBlbHNlIHtcbiAgICAgICAgLy8gT3RoZXJ3aXNlIHdlIGRpZmYgdGhlIHR3byBub24ta2V5ZWQgbm9kZXMuXG4gICAgICAgIHNldE5vZGUoY2hlY2tPbGQsIGNoZWNrTmV3KVxuICAgICAgfVxuICAgIH0gZWxzZSB7XG4gICAgICAvLyBGaW5hbGx5IGlmIHRoZXJlIHdhcyBubyBvbGQgbm9kZSB3ZSBhZGQgdGhlIG5ldyBub2RlLlxuICAgICAgb2xkUGFyZW50LmFwcGVuZENoaWxkKGNoZWNrTmV3KVxuICAgICAgbW91bnQoY2hlY2tOZXcpXG4gICAgfVxuICB9XG5cbiAgLy8gUmVtb3ZlIG9sZCBrZXllZCBub2Rlcy5cbiAgZm9yIChvbGRLZXkgaW4ga2V5ZWROb2Rlcykge1xuICAgIGV4dHJhLS1cbiAgICBvbGRQYXJlbnQucmVtb3ZlQ2hpbGQoZGlzbW91bnQoa2V5ZWROb2Rlc1tvbGRLZXldKSlcbiAgfVxuXG4gIC8vIElmIHdlIGhhdmUgYW55IHJlbWFpbmluZyB1bmtleWVkIG5vZGVzIHJlbW92ZSB0aGVtIGZyb20gdGhlIGVuZC5cbiAgd2hpbGUgKC0tZXh0cmEgPj0gMCkge1xuICAgIG9sZFBhcmVudC5yZW1vdmVDaGlsZChkaXNtb3VudChvbGRQYXJlbnQubGFzdENoaWxkKSlcbiAgfVxufVxuXG4vKipcbiAqIEBwcml2YXRlXG4gKiBAZGVzY3JpcHRpb25cbiAqIFV0aWxpdHkgdG8gdHJ5IHRvIHB1bGwgYSBrZXkgb3V0IG9mIGFuIGVsZW1lbnQuXG4gKiBVc2VzICdkYXRhLWtleScgaWYgcG9zc2libGUgYW5kIGZhbGxzIGJhY2sgdG8gJ2lkJy5cbiAqXG4gKiBAcGFyYW0ge05vZGV9IG5vZGUgLSBUaGUgbm9kZSB0byBnZXQgdGhlIGtleSBmb3IuXG4gKiBAcmV0dXJuIHtzdHJpbmd8dm9pZH1cbiAqL1xuZnVuY3Rpb24gZ2V0S2V5IChub2RlKSB7XG4gIGlmIChub2RlLm5vZGVUeXBlICE9PSBFTEVNRU5UX1RZUEUpIHJldHVyblxuICB2YXIga2V5ID0gbm9kZS5nZXRBdHRyaWJ1dGUoc2V0RE9NLktFWSkgfHwgbm9kZS5pZFxuICBpZiAoa2V5KSByZXR1cm4gS0VZX1BSRUZJWCArIGtleVxufVxuXG4vKipcbiAqIENoZWNrcyBpZiBub2RlcyBhcmUgZXF1YWwgdXNpbmcgdGhlIGZvbGxvd2luZyBieSBjaGVja2luZyBpZlxuICogdGhleSBhcmUgYm90aCBpZ25vcmVkLCBoYXZlIHRoZSBzYW1lIGNoZWNrc3VtLCBvciBoYXZlIHRoZVxuICogc2FtZSBjb250ZW50cy5cbiAqXG4gKiBAcGFyYW0ge05vZGV9IGEgLSBPbmUgb2YgdGhlIG5vZGVzIHRvIGNvbXBhcmUuXG4gKiBAcGFyYW0ge05vZGV9IGIgLSBBbm90aGVyIG5vZGUgdG8gY29tcGFyZS5cbiAqL1xuZnVuY3Rpb24gaXNFcXVhbE5vZGUgKGEsIGIpIHtcbiAgLy8gY29uc29sZS5sb2coYSwgYiwgaXNJZ25vcmVkKGEpLCBpc0lnbm9yZWQoYikpXG4gIHJldHVybiAoXG4gICAgLy8gQ2hlY2sgaWYgYm90aCBub2RlcyBhcmUgaWdub3JlZC5cbiAgICAoaXNJZ25vcmVkKGEpICYmIGlzSWdub3JlZChiKSkgfHxcbiAgICAvLyBDaGVjayBpZiBib3RoIG5vZGVzIGhhdmUgdGhlIHNhbWUgY2hlY2tzdW0uXG4gICAgKGdldENoZWNrU3VtKGEpID09PSBnZXRDaGVja1N1bShiKSkgfHxcbiAgICAvLyBGYWxsIGJhY2sgdG8gbmF0aXZlIGlzRXF1YWxOb2RlIGNoZWNrLlxuICAgIGEuaXNFcXVhbE5vZGUoYilcbiAgKVxufVxuXG4vKipcbiAqIEBwcml2YXRlXG4gKiBAZGVzY3JpcHRpb25cbiAqIFV0aWxpdHkgdG8gdHJ5IHRvIHB1bGwgYSBjaGVja3N1bSBhdHRyaWJ1dGUgZnJvbSBhbiBlbGVtZW50LlxuICogVXNlcyAnZGF0YS1jaGVja3N1bScgb3IgdXNlciBzcGVjaWZpZWQgY2hlY2tzdW0gcHJvcGVydHkuXG4gKlxuICogQHBhcmFtIHtOb2RlfSBub2RlIC0gVGhlIG5vZGUgdG8gZ2V0IHRoZSBjaGVja3N1bSBmb3IuXG4gKiBAcmV0dXJuIHtzdHJpbmd8TmFOfVxuICovXG5mdW5jdGlvbiBnZXRDaGVja1N1bSAobm9kZSkge1xuICByZXR1cm4gbm9kZS5nZXRBdHRyaWJ1dGUoc2V0RE9NLkNIRUNLU1VNKSB8fCBOYU5cbn1cblxuLyoqXG4gKiBAcHJpdmF0ZVxuICogQGRlc2NyaXB0aW9uXG4gKiBVdGlsaXR5IHRvIHRyeSB0byBjaGVjayBpZiBhbiBlbGVtZW50IHNob3VsZCBiZSBpZ25vcmVkIGJ5IHRoZSBhbGdvcml0aG0uXG4gKiBVc2VzICdkYXRhLWlnbm9yZScgb3IgdXNlciBzcGVjaWZpZWQgaWdub3JlIHByb3BlcnR5LlxuICpcbiAqIEBwYXJhbSB7Tm9kZX0gbm9kZSAtIFRoZSBub2RlIHRvIGNoZWNrIGlmIGl0IHNob3VsZCBiZSBpZ25vcmVkLlxuICogQHJldHVybiB7Ym9vbGVhbn1cbiAqL1xuZnVuY3Rpb24gaXNJZ25vcmVkIChub2RlKSB7XG4gIHJldHVybiBub2RlLmdldEF0dHJpYnV0ZShzZXRET00uSUdOT1JFKSAhPSBudWxsXG59XG5cbi8qKlxuICogRGlzcGF0Y2hlcyBhIG1vdW50IGV2ZW50IGZvciB0aGUgZ2l2ZW4gbm9kZSBhbmQgY2hpbGRyZW4uXG4gKlxuICogQHBhcmFtIHtOb2RlfSBub2RlIC0gdGhlIG5vZGUgdG8gbW91bnQuXG4gKiBAcmV0dXJuIHtub2RlfVxuICovXG5mdW5jdGlvbiBtb3VudCAobm9kZSkge1xuICByZXR1cm4gZGlzcGF0Y2gobm9kZSwgJ21vdW50Jylcbn1cblxuLyoqXG4gKiBEaXNwYXRjaGVzIGEgZGlzbW91bnQgZXZlbnQgZm9yIHRoZSBnaXZlbiBub2RlIGFuZCBjaGlsZHJlbi5cbiAqXG4gKiBAcGFyYW0ge05vZGV9IG5vZGUgLSB0aGUgbm9kZSB0byBkaXNtb3VudC5cbiAqIEByZXR1cm4ge25vZGV9XG4gKi9cbmZ1bmN0aW9uIGRpc21vdW50IChub2RlKSB7XG4gIHJldHVybiBkaXNwYXRjaChub2RlLCAnZGlzbW91bnQnKVxufVxuXG4vKipcbiAqIFJlY3Vyc2l2ZWx5IHRyaWdnZXIgYW4gZXZlbnQgZm9yIGEgbm9kZSBhbmQgaXQncyBjaGlsZHJlbi5cbiAqIE9ubHkgZW1pdHMgZXZlbnRzIGZvciBrZXllZCBub2Rlcy5cbiAqXG4gKiBAcGFyYW0ge05vZGV9IG5vZGUgLSB0aGUgaW5pdGlhbCBub2RlLlxuICogQHJldHVybiB7Tm9kZX1cbiAqL1xuZnVuY3Rpb24gZGlzcGF0Y2ggKG5vZGUsIHR5cGUpIHtcbiAgLy8gVHJpZ2dlciBldmVudCBmb3IgdGhpcyBlbGVtZW50IGlmIGl0IGhhcyBhIGtleS5cbiAgaWYgKGdldEtleShub2RlKSkge1xuICAgIHZhciBldiA9IGRvY3VtZW50LmNyZWF0ZUV2ZW50KCdFdmVudCcpXG4gICAgdmFyIHByb3AgPSB7IHZhbHVlOiBub2RlIH1cbiAgICBldi5pbml0RXZlbnQodHlwZSwgZmFsc2UsIGZhbHNlKVxuICAgIE9iamVjdC5kZWZpbmVQcm9wZXJ0eShldiwgJ3RhcmdldCcsIHByb3ApXG4gICAgT2JqZWN0LmRlZmluZVByb3BlcnR5KGV2LCAnc3JjRWxlbWVudCcsIHByb3ApXG4gICAgbm9kZS5kaXNwYXRjaEV2ZW50KGV2KVxuICB9XG5cbiAgLy8gRGlzcGF0Y2ggdG8gYWxsIGNoaWxkcmVuLlxuICB2YXIgY2hpbGQgPSBub2RlLmZpcnN0Q2hpbGRcbiAgd2hpbGUgKGNoaWxkKSBjaGlsZCA9IGRpc3BhdGNoKGNoaWxkLCB0eXBlKS5uZXh0U2libGluZ1xuICByZXR1cm4gbm9kZVxufVxuXG4vKipcbiAqIEBwcml2YXRlXG4gKiBAZGVzY3JpcHRpb25cbiAqIENvbmZpcm0gdGhhdCBhIHZhbHVlIGlzIHRydXRoeSwgdGhyb3dzIGFuIGVycm9yIG1lc3NhZ2Ugb3RoZXJ3aXNlLlxuICpcbiAqIEBwYXJhbSB7Kn0gdmFsIC0gdGhlIHZhbCB0byB0ZXN0LlxuICogQHBhcmFtIHtzdHJpbmd9IG1zZyAtIHRoZSBlcnJvciBtZXNzYWdlIG9uIGZhaWx1cmUuXG4gKiBAdGhyb3dzIHtFcnJvcn1cbiAqL1xuZnVuY3Rpb24gYXNzZXJ0ICh2YWwsIG1zZykge1xuICBpZiAoIXZhbCkgdGhyb3cgbmV3IEVycm9yKCdzZXQtZG9tOiAnICsgbXNnKVxufVxuIiwiJ3VzZSBzdHJpY3QnXG52YXIgcGFyc2VyID0gd2luZG93LkRPTVBhcnNlciAmJiBuZXcgd2luZG93LkRPTVBhcnNlcigpXG52YXIgZG9jdW1lbnRSb290TmFtZSA9ICdIVE1MJ1xudmFyIHN1cHBvcnRzSFRNTFR5cGUgPSBmYWxzZVxudmFyIHN1cHBvcnRzSW5uZXJIVE1MID0gZmFsc2VcbnZhciBodG1sVHlwZSA9ICd0ZXh0L2h0bWwnXG52YXIgeGh0bWxUeXBlID0gJ2FwcGxpY2F0aW9uL3hodG1sK3htbCdcbnZhciB0ZXN0Q2xhc3MgPSAnQSdcbnZhciB0ZXN0Q29kZSA9ICc8d2JyIGNsYXNzPVwiJyArIHRlc3RDbGFzcyArICdcIi8+J1xuXG50cnkge1xuICAvLyBDaGVjayBpZiBicm93c2VyIHN1cHBvcnRzIHRleHQvaHRtbCBET01QYXJzZXJcbiAgdmFyIHBhcnNlZCA9IHBhcnNlci5wYXJzZUZyb21TdHJpbmcodGVzdENvZGUsIGh0bWxUeXBlKS5ib2R5LmZpcnN0Q2hpbGRcbiAgLy8gU29tZSBicm93c2VycyAoaU9TIDkgYW5kIFNhZmFyaSA5KSBsb3dlcmNhc2UgY2xhc3NlcyBmb3IgcGFyc2VkIGVsZW1lbnRzXG4gIC8vIGJ1dCBvbmx5IHdoZW4gYXBwZW5kaW5nIHRvIERPTSwgc28gdXNlIGlubmVySFRNTCBpbnN0ZWFkXG4gIHZhciBkID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnZGl2JylcbiAgZC5hcHBlbmRDaGlsZChwYXJzZWQpXG4gIGlmIChkLmZpcnN0Q2hpbGQuY2xhc3NMaXN0WzBdICE9PSB0ZXN0Q2xhc3MpIHRocm93IG5ldyBFcnJvcigpXG4gIHN1cHBvcnRzSFRNTFR5cGUgPSB0cnVlXG59IGNhdGNoIChlKSB7fVxuXG52YXIgbW9ja0RvYyA9IGRvY3VtZW50LmltcGxlbWVudGF0aW9uLmNyZWF0ZUhUTUxEb2N1bWVudCgnJylcbnZhciBtb2NrSFRNTCA9IG1vY2tEb2MuZG9jdW1lbnRFbGVtZW50XG52YXIgbW9ja0JvZHkgPSBtb2NrRG9jLmJvZHlcbnRyeSB7XG4gIC8vIENoZWNrIGlmIGJyb3dzZXIgc3VwcG9ydHMgZG9jdW1lbnRFbGVtZW50LmlubmVySFRNTFxuICBtb2NrSFRNTC5pbm5lckhUTUwgKz0gJydcbiAgc3VwcG9ydHNJbm5lckhUTUwgPSB0cnVlXG59IGNhdGNoIChlKSB7XG4gIC8vIENoZWNrIGlmIGJyb3dzZXIgc3VwcG9ydHMgeGh0bWwgcGFyc2luZy5cbiAgcGFyc2VyLnBhcnNlRnJvbVN0cmluZyh0ZXN0Q29kZSwgeGh0bWxUeXBlKVxuICB2YXIgYm9keVJlZyA9IC8oPGJvZHlbXj5dKj4pKFtcXHNcXFNdKik8XFwvYm9keT4vXG59XG5cbmZ1bmN0aW9uIERPTVBhcnNlclBhcnNlIChtYXJrdXAsIHJvb3ROYW1lKSB7XG4gIHZhciBkb2MgPSBwYXJzZXIucGFyc2VGcm9tU3RyaW5nKG1hcmt1cCwgaHRtbFR5cGUpXG4gIC8vIFBhdGNoIGZvciBpT1MgVUlXZWJWaWV3IG5vdCBhbHdheXMgcmV0dXJuaW5nIGRvYy5ib2R5IHN5bmNocm9ub3VzbHlcbiAgaWYgKCFkb2MuYm9keSkgeyByZXR1cm4gZmFsbGJhY2tQYXJzZShtYXJrdXAsIHJvb3ROYW1lKSB9XG5cbiAgcmV0dXJuIHJvb3ROYW1lID09PSBkb2N1bWVudFJvb3ROYW1lXG4gICAgPyBkb2MuZG9jdW1lbnRFbGVtZW50XG4gICAgOiBkb2MuYm9keS5maXJzdENoaWxkXG59XG5cbmZ1bmN0aW9uIGZhbGxiYWNrUGFyc2UgKG1hcmt1cCwgcm9vdE5hbWUpIHtcbiAgLy8gRmFsbGJhY2sgdG8gaW5uZXJIVE1MIGZvciBvdGhlciBvbGRlciBicm93c2Vycy5cbiAgaWYgKHJvb3ROYW1lID09PSBkb2N1bWVudFJvb3ROYW1lKSB7XG4gICAgaWYgKHN1cHBvcnRzSW5uZXJIVE1MKSB7XG4gICAgICBtb2NrSFRNTC5pbm5lckhUTUwgPSBtYXJrdXBcbiAgICAgIHJldHVybiBtb2NrSFRNTFxuICAgIH0gZWxzZSB7XG4gICAgICAvLyBJRTkgZG9lcyBub3Qgc3VwcG9ydCBpbm5lcmh0bWwgYXQgcm9vdCBsZXZlbC5cbiAgICAgIC8vIFdlIGdldCBhcm91bmQgdGhpcyBieSBwYXJzaW5nIGV2ZXJ5dGhpbmcgZXhjZXB0IHRoZSBib2R5IGFzIHhodG1sLlxuICAgICAgdmFyIGJvZHlNYXRjaCA9IG1hcmt1cC5tYXRjaChib2R5UmVnKVxuICAgICAgaWYgKGJvZHlNYXRjaCkge1xuICAgICAgICB2YXIgYm9keUNvbnRlbnQgPSBib2R5TWF0Y2hbMl1cbiAgICAgICAgdmFyIHN0YXJ0Qm9keSA9IGJvZHlNYXRjaC5pbmRleCArIGJvZHlNYXRjaFsxXS5sZW5ndGhcbiAgICAgICAgdmFyIGVuZEJvZHkgPSBzdGFydEJvZHkgKyBib2R5Q29udGVudC5sZW5ndGhcbiAgICAgICAgbWFya3VwID0gbWFya3VwLnNsaWNlKDAsIHN0YXJ0Qm9keSkgKyBtYXJrdXAuc2xpY2UoZW5kQm9keSlcbiAgICAgICAgbW9ja0JvZHkuaW5uZXJIVE1MID0gYm9keUNvbnRlbnRcbiAgICAgIH1cblxuICAgICAgdmFyIGRvYyA9IHBhcnNlci5wYXJzZUZyb21TdHJpbmcobWFya3VwLCB4aHRtbFR5cGUpXG4gICAgICB2YXIgYm9keSA9IGRvYy5ib2R5XG4gICAgICB3aGlsZSAobW9ja0JvZHkuZmlyc3RDaGlsZCkgYm9keS5hcHBlbmRDaGlsZChtb2NrQm9keS5maXJzdENoaWxkKVxuICAgICAgcmV0dXJuIGRvYy5kb2N1bWVudEVsZW1lbnRcbiAgICB9XG4gIH0gZWxzZSB7XG4gICAgbW9ja0JvZHkuaW5uZXJIVE1MID0gbWFya3VwXG4gICAgcmV0dXJuIG1vY2tCb2R5LmZpcnN0Q2hpbGRcbiAgfVxufVxuXG4vKipcbiAqIFJldHVybnMgdGhlIHJlc3VsdHMgb2YgYSBET01QYXJzZXIgYXMgYW4gSFRNTEVsZW1lbnQuXG4gKiAoU2hpbXMgZm9yIG9sZGVyIGJyb3dzZXJzKS5cbiAqL1xubW9kdWxlLmV4cG9ydHMgPSBzdXBwb3J0c0hUTUxUeXBlXG4gID8gRE9NUGFyc2VyUGFyc2VcbiAgOiBmYWxsYmFja1BhcnNlXG4iLCJleHBvcnRzLmdlbklkID0gZnVuY3Rpb24oKXtcclxuICBmdW5jdGlvbiBnZW4oKXtcclxuICAgIHJldHVybiAoTWF0aC5yYW5kb20oKSoxKjFlMTcpLnRvU3RyaW5nKDM2KS50b1VwcGVyQ2FzZSgpXHJcbiAgfVxyXG4gIHJldHVybiAnS0RBVEEtJyArIGdlbigpICsgJy0nICsgZ2VuKClcclxufVxyXG5cclxudmFyIGdldElkID0gZnVuY3Rpb24gKGlkKSB7XHJcbiAgcmV0dXJuIGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKGlkKVxyXG59XHJcblxyXG5leHBvcnRzLmdldElkID0gZ2V0SWRcclxuXHJcbmV4cG9ydHMudGVzdEV2ZW50ID0gZnVuY3Rpb24gKHRtcGwpIHtcclxuICByZXR1cm4gLyBrLS8udGVzdCh0bXBsKVxyXG59XHJcblxyXG4vKipcclxuICogQHByaXZhdGVcclxuICogQGRlc2NyaXB0aW9uXHJcbiAqIENoZWNrIGEgbm9kZSBhdmFpbGFiaWxpdHkgaW4gMTAwbXMsIGlmIG5vdCBmb3VuZCBzaWxlbnR5IHNraXAgdGhlIGV2ZW50XHJcbiAqIG9yIGV4ZWN1dGUgYSBjYWxsYmFja1xyXG4gKlxyXG4gKiBAcGFyYW0ge3N0cmluZ30gaWQgLSB0aGUgbm9kZSBpZFxyXG4gKiBAcGFyYW0ge2Z1bmN0aW9ufSBjYWxsYmFjayAtIHRoZSBmdW5jdGlvbiB0byBleGVjdXRlIG9uIHN1Y2Nlc3NcclxuICogQHBhcmFtIHtmdW5jdGlvbn0gbm90Rm91bmQgLSB0aGUgZnVuY3Rpb24gdG8gZXhlY3V0ZSBvbiBmYWlsZWRcclxuICovXHJcbmV4cG9ydHMuY2hlY2tOb2RlQXZhaWxhYmlsaXR5ID0gZnVuY3Rpb24gKGNvbXBvbmVudCwgY29tcG9uZW50TmFtZSwgY2FsbGJhY2ssIG5vdEZvdW5kKSB7XHJcbiAgdmFyIGVsZSA9IGdldElkKGNvbXBvbmVudC5lbClcclxuICB2YXIgZm91bmQgPSBmYWxzZVxyXG4gIGlmIChlbGUpIHJldHVybiBlbGVcclxuICBlbHNlIHtcclxuICAgIHZhciB0ID0gc2V0SW50ZXJ2YWwoZnVuY3Rpb24gKCkge1xyXG4gICAgICBlbGUgPSBnZXRJZChjb21wb25lbnQuZWwpXHJcbiAgICAgIGlmIChlbGUpIHtcclxuICAgICAgICBjbGVhckludGVydmFsKHQpXHJcbiAgICAgICAgZm91bmQgPSB0cnVlXHJcbiAgICAgICAgY2FsbGJhY2soY29tcG9uZW50LCBjb21wb25lbnROYW1lLCBlbGUpXHJcbiAgICAgIH1cclxuICAgIH0sIDApXHJcbiAgICAvLyBzaWxlbnRseSBpZ25vcmUgZmluZGluZyB0aGUgbm9kZSBhZnRlciBzb21ldGltZXNcclxuICAgIHNldFRpbWVvdXQoZnVuY3Rpb24gKCkge1xyXG4gICAgICBjbGVhckludGVydmFsKHQpXHJcbiAgICAgIGlmICghZm91bmQgJiYgbm90Rm91bmQgJiYgdHlwZW9mIG5vdEZvdW5kID09PSAnZnVuY3Rpb24nKSBub3RGb3VuZCgpXHJcbiAgICB9LCAxMDApXHJcbiAgfVxyXG59XHJcblxyXG4vKipcclxuICogQHByaXZhdGVcclxuICogQGRlc2NyaXB0aW9uXHJcbiAqIENvbmZpcm0gdGhhdCBhIHZhbHVlIGlzIHRydXRoeSwgdGhyb3dzIGFuIGVycm9yIG1lc3NhZ2Ugb3RoZXJ3aXNlLlxyXG4gKlxyXG4gKiBAcGFyYW0geyp9IHZhbCAtIHRoZSB2YWwgdG8gdGVzdC5cclxuICogQHBhcmFtIHtzdHJpbmd9IG1zZyAtIHRoZSBlcnJvciBtZXNzYWdlIG9uIGZhaWx1cmUuXHJcbiAqIEB0aHJvd3Mge0Vycm9yfVxyXG4gKi9cclxuZXhwb3J0cy5hc3NlcnQgPSBmdW5jdGlvbiAodmFsLCBtc2cpIHtcclxuICBpZiAoIXZhbCkgdGhyb3cgbmV3IEVycm9yKCcoa2VldCkgJyArIG1zZylcclxufVxyXG5cclxuLyoqXHJcbiAqIEBwcml2YXRlXHJcbiAqIEBkZXNjcmlwdGlvblxyXG4gKiBTaW1wbGUgaHRtbCB0ZW1wbGF0ZSBsaXRlcmFscyBNT0RJRklFRCBmcm9tIDogaHR0cDovLzJhbGl0eS5jb20vMjAxNS8wMS90ZW1wbGF0ZS1zdHJpbmdzLWh0bWwuaHRtbFxyXG4gKiBieSBEci4gQXhlbCBSYXVzY2htYXllclxyXG4gKiBubyBjaGVja2luZyBmb3Igd3JhcHBpbmcgaW4gcm9vdCBlbGVtZW50XHJcbiAqIG5vIHN0cmljdCBjaGVja2luZ1xyXG4gKiByZW1vdmUgc3BhY2luZyAvIGluZGVudGF0aW9uXHJcbiAqIGtlZXAgYWxsIHNwYWNpbmcgd2l0aGluIGh0bWwgdGFnc1xyXG4gKiBpbmNsdWRlIGhhbmRsaW5nICR7fSBpbiB0aGUgbGl0ZXJhbHNcclxuICovXHJcbmV4cG9ydHMuaHRtbCA9IGZ1bmN0aW9uIGh0bWwgKCkge1xyXG4gIHZhciBsaXRlcmFscyA9IFtdLnNoaWZ0LmNhbGwoYXJndW1lbnRzKVxyXG4gIHZhciBzdWJzdHMgPSBbXS5zbGljZS5jYWxsKGFyZ3VtZW50cylcclxuXHJcbiAgdmFyIHJlc3VsdCA9IGxpdGVyYWxzLnJhdy5yZWR1Y2UoZnVuY3Rpb24gKGFjYywgbGl0LCBpKSB7XHJcbiAgICByZXR1cm4gYWNjICsgc3Vic3RzW2kgLSAxXSArIGxpdFxyXG4gIH0pXHJcbiAgLy8gcmVtb3ZlIHNwYWNpbmcsIGluZGVudGF0aW9uIGZyb20gZXZlcnkgbGluZVxyXG4gIHJlc3VsdCA9IHJlc3VsdC5zcGxpdCgvXFxuKy8pXHJcbiAgcmVzdWx0ID0gcmVzdWx0Lm1hcChmdW5jdGlvbiAodCkge1xyXG4gICAgcmV0dXJuIHQudHJpbSgpXHJcbiAgfSkuam9pbignJylcclxuICByZXR1cm4gcmVzdWx0XHJcbn1cclxuXHJcbi8qKlxyXG4gKiBAcHJpdmF0ZVxyXG4gKiBAZGVzY3JpcHRpb25cclxuICogQ29weSB3aXRoIG1vZGlmaWNhdGlvbiBmcm9tIHByZWFjdC10b2RvbXZjLiBNb2RlbCBjb25zdHJ1Y3RvciB3aXRoXHJcbiAqIHJlZ2lzdGVyaW5nIGNhbGxiYWNrIGxpc3RlbmVyIGluIE9iamVjdC5kZWZpbmVQcm9wZXJ0eS4gQW55IG1vZGlmaWNhdGlvblxyXG4gKiB0byBgYGB0aGlzLmxpc3RgYGAgaW5zdGFuY2Ugd2lsbCBzdWJzZXF1ZW50bHkgaW5mb3JtIGFsbCByZWdpc3RlcmVkIGxpc3RlbmVyLlxyXG4gKlxyXG4gKiB7e21vZGVsOjxteU1vZGVsPn19PG15TW9kZWxUZW1wbGF0ZVN0cmluZz57ey9tb2RlbDo8bXlNb2RlbD59fVxyXG4gKlxyXG4gKi9cclxuZnVuY3Rpb24gY3JlYXRlTW9kZWwgKCkge1xyXG4gIHZhciBtb2RlbCA9IFtdXHJcbiAgdmFyIGV4ZWMgPSBudWxsXHJcblxyXG4gIHZhciBpbmZvcm0gPSBmdW5jdGlvbiAoKSB7XHJcbiAgICBleGVjICYmIGV4ZWMobW9kZWwpXHJcbiAgfVxyXG5cclxuLyoqXHJcbiAqIEBwcml2YXRlXHJcbiAqIEBkZXNjcmlwdGlvblxyXG4gKiBSZWdpc3RlciBjYWxsYmFjayBsaXN0ZW5lciBvZiBhbnkgY2hhbmdlc1xyXG4gKi9cclxuICBPYmplY3QuZGVmaW5lUHJvcGVydHkodGhpcywgJ2xpc3QnLCB7XHJcbiAgICBlbnVtZXJhYmxlOiBmYWxzZSxcclxuICAgIGNvbmZpZ3VyYWJsZTogdHJ1ZSxcclxuICAgIGdldDogZnVuY3Rpb24gKCkge1xyXG4gICAgICByZXR1cm4gbW9kZWxcclxuICAgIH0sXHJcbiAgICBzZXQ6IGZ1bmN0aW9uICh2YWwpIHtcclxuICAgICAgbW9kZWwgPSB2YWxcclxuICAgICAgaW5mb3JtKClcclxuICAgIH1cclxuICB9KVxyXG5cclxuLyoqXHJcbiAqIEBwcml2YXRlXHJcbiAqIEBkZXNjcmlwdGlvblxyXG4gKiBTdWJzY3JpYmUgdG8gdGhlIG1vZGVsIGNoYW5nZXMgKGFkZC91cGRhdGUvZGVzdHJveSlcclxuICpcclxuICogQHBhcmFtIHtPYmplY3R9IG1vZGVsIC0gdGhlIG1vZGVsIGluY2x1ZGluZyBhbGwgcHJvdG90eXBlc1xyXG4gKlxyXG4gKi9cclxuICB0aGlzLnN1YnNjcmliZSA9IGZ1bmN0aW9uIChmbikge1xyXG4gICAgZXhlYyA9IGZuXHJcbiAgfVxyXG5cclxuLyoqXHJcbiAqIEBwcml2YXRlXHJcbiAqIEBkZXNjcmlwdGlvblxyXG4gKiBBZGQgbmV3IG9iamVjdCB0byB0aGUgbW9kZWwgbGlzdFxyXG4gKlxyXG4gKiBAcGFyYW0ge09iamVjdH0gb2JqIC0gbmV3IG9iamVjdCB0byBhZGQgaW50byB0aGUgbW9kZWwgbGlzdFxyXG4gKlxyXG4gKi9cclxuICB0aGlzLmFkZCA9IGZ1bmN0aW9uIChvYmopIHtcclxuICAgIHRoaXMubGlzdCA9IHRoaXMubGlzdC5jb25jYXQob2JqKVxyXG4gIH1cclxuXHJcbi8qKlxyXG4gKiBAcHJpdmF0ZVxyXG4gKiBAZGVzY3JpcHRpb25cclxuICogVXBkYXRlIGV4aXN0aW5nIG9iamVjdCBpbiB0aGUgbW9kZWwgbGlzdFxyXG4gKlxyXG4gKiBAcGFyYW0ge1N0cmluZ30gbG9va3VwSWQgLSBsb29rdXAgaWQgcHJvcGVydHkgbmFtZSBvZiB0aGUgb2JqZWN0XHJcbiAqIEBwYXJhbSB7T2JqZWN0fSB1cGRhdGVPYmogLSB0aGUgdXBkYXRlZCBwcm9wZXJ0aWVzXHJcbiAqXHJcbiAqL1xyXG4gIHRoaXMudXBkYXRlID0gZnVuY3Rpb24gKGxvb2t1cElkLCB1cGRhdGVPYmopIHtcclxuICAgIHRoaXMubGlzdCA9IHRoaXMubGlzdC5tYXAoZnVuY3Rpb24gKG9iaikge1xyXG4gICAgICByZXR1cm4gb2JqW2xvb2t1cElkXSAhPT0gdXBkYXRlT2JqW2xvb2t1cElkXSA/IG9iaiA6IE9iamVjdC5hc3NpZ24ob2JqLCB1cGRhdGVPYmopXHJcbiAgICB9KVxyXG4gIH1cclxuXHJcbi8qKlxyXG4gKiBAcHJpdmF0ZVxyXG4gKiBAZGVzY3JpcHRpb25cclxuICogUmVtb3ZlZCBleGlzdGluZyBvYmplY3QgaW4gdGhlIG1vZGVsIGxpc3RcclxuICpcclxuICogQHBhcmFtIHtTdHJpbmd9IGxvb2t1cElkIC0gbG9va3VwIGlkIHByb3BlcnR5IG5hbWUgb2YgdGhlIG9iamVjdFxyXG4gKiBAcGFyYW0ge1N0cmluZ30gb2JqSWQgLSB1bmlxdWUgaWRlbnRpZmllciBvZiB0aGUgbG9va3VwIGlkXHJcbiAqXHJcbiAqL1xyXG4gIHRoaXMuZGVzdHJveSA9IGZ1bmN0aW9uIChsb29rdXBJZCwgb2JqSWQpIHtcclxuICAgIHRoaXMubGlzdCA9IHRoaXMubGlzdC5maWx0ZXIoZnVuY3Rpb24gKG9iaikge1xyXG4gICAgICByZXR1cm4gb2JqW2xvb2t1cElkXSAhPT0gb2JqSWRcclxuICAgIH0pXHJcbiAgfVxyXG59XHJcblxyXG5leHBvcnRzLmNyZWF0ZU1vZGVsID0gY3JlYXRlTW9kZWxcclxuIiwiaW1wb3J0IEtlZXQgZnJvbSAnLi4va2VldCdcclxuaW1wb3J0IHsgaHRtbCB9IGZyb20gJy4uL2tlZXQvdXRpbHMnXHJcbmltcG9ydCB7IGdlbklkIH0gZnJvbSAnLi91dGlsJ1xyXG5pbXBvcnQgZmlsdGVyQXBwICBmcm9tICcuL2ZpbHRlcidcclxuaW1wb3J0IHRvZG9BcHAgZnJvbSAnLi90b2RvJ1xyXG5cclxuY2xhc3MgQXBwIGV4dGVuZHMgS2VldCB7XHJcbiAgdG9kb0FwcCA9IHRvZG9BcHBcclxuICBmaWx0ZXIgPSBmaWx0ZXJBcHBcclxuICBpc0NoZWNrZWQgPSBmYWxzZVxyXG4gIGNvdW50ID0gMFxyXG4gIHBsdXJhbCA9ICcnXHJcbiAgY2xlYXJUb2dnbGUgPSBmYWxzZVxyXG4gIHRvZG9TdGF0ZSA9IGZhbHNlXHJcblxyXG4gIGNvbXBvbmVudFdpbGxNb3VudCgpIHtcclxuICAgIHRvZG9BcHAuc3Vic2NyaWJlKHRvZG9zID0+IHtcclxuICAgICAgbGV0IHVuY29tcGxldGVkID0gdG9kb3MuZmlsdGVyKGMgPT4gIWMuY29tcGxldGVkKVxyXG4gICAgICBsZXQgY29tcGxldGVkID0gdG9kb3MuZmlsdGVyKGMgPT4gYy5jb21wbGV0ZWQpXHJcbiAgICAgIHRoaXMuY2xlYXJUb2dnbGUgPSBjb21wbGV0ZWQubGVuZ3RoID8gdHJ1ZSA6IGZhbHNlXHJcbiAgICAgIHRoaXMudG9kb1N0YXRlID0gdG9kb3MubGVuZ3RoID8gdHJ1ZSA6IGZhbHNlXHJcbiAgICAgIHRoaXMucGx1cmFsID0gdW5jb21wbGV0ZWQubGVuZ3RoID09PSAxID8gJycgOiAncydcclxuICAgICAgdGhpcy5jb3VudCA9IHVuY29tcGxldGVkLmxlbmd0aFxyXG4gICAgfSlcclxuICB9XHJcblxyXG4gIGNyZWF0ZSAoZXZ0KSB7XHJcbiAgICBpZihldnQua2V5Q29kZSAhPT0gMTMpIHJldHVyblxyXG4gICAgZXZ0LnByZXZlbnREZWZhdWx0KClcclxuICAgIGxldCB0aXRsZSA9IGV2dC50YXJnZXQudmFsdWUudHJpbSgpXHJcbiAgICBpZih0aXRsZSl7XHJcbiAgICAgIHRoaXMudG9kb0FwcC5hZGRUb2RvKHsgaWQ6IGdlbklkKCksIHRpdGxlLCBjb21wbGV0ZWQ6IGZhbHNlIH0pXHJcbiAgICAgIGV2dC50YXJnZXQudmFsdWUgPSAnJ1xyXG4gICAgfVxyXG4gIH1cclxuXHJcbiAgY29tcGxldGVBbGwoKXtcclxuICAgIHRoaXMuaXNDaGVja2VkID0gIXRoaXMuaXNDaGVja2VkXHJcbiAgICAvLyB0aGlzLnRvZG9BcHAudXBkYXRlQWxsKHRoaXMuaXNDaGVja2VkKVxyXG4gIH1cclxuXHJcbiAgY2xlYXJDb21wbGV0ZWQoKSB7XHJcbiAgICB0aGlzLnRvZG9BcHAuY2xlYXJDb21wbGV0ZWQoKVxyXG4gIH1cclxuICBlZGl0TW9kZSgpe1xyXG5cclxuICB9XHJcbn1cclxuXHJcbmNvbnN0IHZtb2RlbCA9IGh0bWxgXHJcbiAgPHNlY3Rpb24gY2xhc3M9XCJ0b2RvYXBwXCI+XHJcbiAgICA8aGVhZGVyIGlkPVwiaGVhZGVyXCI+XHJcbiAgICAgIDxoMT50b2RvczwvaDE+XHJcbiAgICAgIDxpbnB1dCBpZD1cIm5ldy10b2RvXCIgY2xhc3M9XCJuZXctdG9kb1wiIGsta2V5ZG93bj1cImNyZWF0ZSgpXCIgcGxhY2Vob2xkZXI9XCJXaGF0IG5lZWRzIHRvIGJlIGRvbmU/XCIgYXV0b2ZvY3VzPlxyXG4gICAgPC9oZWFkZXI+XHJcbiAgICA8IS0tIHt7P3RvZG9TdGF0ZX19IC0tPlxyXG4gICAgPHNlY3Rpb24gY2xhc3M9XCJtYWluXCI+XHJcbiAgICAgIDxpbnB1dCBpZD1cInRvZ2dsZS1hbGxcIiBjbGFzcz1cInRvZ2dsZS1hbGxcIiB0eXBlPVwiY2hlY2tib3hcIiBjaGVja2VkPVwie3tpc0NoZWNrZWQ/Y2hlY2tlZDonJ319XCIgay1jbGljaz1cImNvbXBsZXRlQWxsKClcIj5cclxuICAgICAgPGxhYmVsIGZvcj1cInRvZ2dsZS1hbGxcIj5NYXJrIGFsbCBhcyBjb21wbGV0ZTwvbGFiZWw+XHJcbiAgICAgIDwhLS0ge3tjb21wb25lbnQ6dG9kb0FwcH19IC0tPlxyXG4gICAgPC9zZWN0aW9uPlxyXG4gICAgPGZvb3RlciBjbGFzcz1cImZvb3RlclwiPlxyXG4gICAgICA8c3BhbiBjbGFzcz1cInRvZG8tY291bnRcIj5cclxuICAgICAgICA8c3Ryb25nPnt7Y291bnR9fTwvc3Ryb25nPiBpdGVte3twbHVyYWx9fSBsZWZ0XHJcbiAgICAgIDwvc3Bhbj5cclxuICAgICAgPCEtLSB7e2NvbXBvbmVudDpmaWx0ZXJ9fSAtLT5cclxuICAgICAgPCEtLSB7ez9jbGVhclRvZ2dsZX19IC0tPlxyXG4gICAgICA8YnV0dG9uIGlkPVwiY2xlYXItY29tcGxldGVkXCIgY2xhc3M9XCJjbGVhci1jb21wbGV0ZWRcIj5DbGVhciBjb21wbGV0ZWQ8L2J1dHRvbj5cclxuICAgICAgPCEtLSB7ey9jbGVhclRvZ2dsZX19IC0tPlxyXG4gICAgPC9mb290ZXI+XHJcbiAgICA8IS0tIHt7L3RvZG9TdGF0ZX19IC0tPlxyXG4gIDwvc2VjdGlvbj5cclxuICA8Zm9vdGVyIGNsYXNzPVwiaW5mb1wiPlxyXG4gICAgPHA+RG91YmxlLWNsaWNrIHRvIGVkaXQgYSB0b2RvPC9wPlxyXG4gICAgPHA+Q3JlYXRlZCBieSA8YSBocmVmPVwiaHR0cHM6Ly9naXRodWIuY29tL3N5YXJ1bFwiPlNoYWhydWwgTml6YW0gU2VsYW1hdDwvYT48L3A+XHJcbiAgICA8cD5QYXJ0IG9mIDxhIGhyZWY9XCJodHRwOi8vdG9kb212Yy5jb21cIj5Ub2RvTVZDPC9hPjwvcD5cclxuICA8L2Zvb3Rlcj5gXHJcblxyXG5jb25zdCBhcHAgPSBuZXcgQXBwKClcclxuXHJcbmFwcC5tb3VudCh2bW9kZWwpLmxpbmsoJ3RvZG8nKVxyXG4iLCJpbXBvcnQgeyBjYW1lbENhc2UgfSBmcm9tICcuL3V0aWwnXHJcbmltcG9ydCB7IGNyZWF0ZU1vZGVsIH0gZnJvbSAnLi4va2VldC91dGlscydcclxuXHJcbmNsYXNzIENyZWF0ZUZpbHRlck1vZGVsIGV4dGVuZHMgY3JlYXRlTW9kZWwge1xyXG4gIHN3aXRjaChoYXNoLCBvYmope1xyXG4gICAgdGhpcy5saXN0ID0gdGhpcy5saXN0Lm1hcChmaWx0ZXIgPT5cclxuICAgICAgZmlsdGVyLmhhc2ggPT09IGhhc2ggPyAoeyAuLi5maWx0ZXIsIC4uLm9ian0pIDogKHsgLi4uZmlsdGVyLCAuLi57IHNlbGVjdGVkOiBmYWxzZSB9fSlcclxuICAgIClcclxuICB9XHJcbn1cclxuXHJcbmNvbnN0IGZpbHRlck1vZGVsID0gbmV3IENyZWF0ZUZpbHRlck1vZGVsKClcclxuXHJcbkFycmF5LmZyb20oWydhbGwnLCAnYWN0aXZlJywgJ2NvbXBsZXRlZCddKS5tYXAocGFnZSA9PlxyXG5cdGZpbHRlck1vZGVsLmFkZCh7XHJcbiAgICBoYXNoOiBgIy8ke3BhZ2V9YCxcclxuICAgIG5hbWU6IGNhbWVsQ2FzZShwYWdlKSxcclxuICAgIHNlbGVjdGVkOiBmYWxzZVxyXG4gIH0pXHJcbilcclxuXHJcbmV4cG9ydCBkZWZhdWx0IGZpbHRlck1vZGVsIiwiaW1wb3J0IEtlZXQgZnJvbSAnLi4va2VldCdcclxuaW1wb3J0IHsgaHRtbCB9IGZyb20gJy4uL2tlZXQvdXRpbHMnXHJcbmltcG9ydCBmaWx0ZXJNb2RlbCBmcm9tICcuL2ZpbHRlci1tb2RlbCdcclxuXHJcblxyXG5jbGFzcyBBcHAgZXh0ZW5kcyBLZWV0IHtcclxuICBlbCA9ICdmaWx0ZXJzJ1xyXG4gIGZpbHRlck1vZGVsID0gZmlsdGVyTW9kZWxcclxuICBjb21wb25lbnRXaWxsTW91bnQoKSB7XHJcbiAgICB0aGlzLmZpbHRlck1vZGVsLnN1YnNjcmliZShtb2RlbCA9PiB0aGlzLmNhbGxCYXRjaFBvb2xVcGRhdGUoKSlcclxuICAgIGlmKHdpbmRvdy5sb2NhdGlvbi5oYXNoID09ICcnKSB7XHJcbiAgICAgIHdpbmRvdy5oaXN0b3J5LnB1c2hTdGF0ZSh7fSwgbnVsbCwgJyMvYWxsJylcclxuICAgIH1cclxuICB9XHJcbiAgY29tcG9uZW50RGlkTW91bnQoKXtcclxuICAgIHRoaXMudXBkYXRlVXJsKHdpbmRvdy5sb2NhdGlvbi5oYXNoKVxyXG4gICAgd2luZG93Lm9ucG9wc3RhdGUgPSAoKSA9PiB0aGlzLnVwZGF0ZVVybCh3aW5kb3cubG9jYXRpb24uaGFzaClcclxuICB9XHJcbiAgdXBkYXRlVXJsKGhhc2gpIHtcclxuICAgIHRoaXMuZmlsdGVyTW9kZWwuc3dpdGNoKGhhc2gsIHsgc2VsZWN0ZWQ6IHRydWUgfSlcclxuICB9XHJcbn1cclxuXHJcbmNvbnN0IGZpbHRlckFwcCA9IG5ldyBBcHAoKVxyXG5cclxubGV0IHZtb2RlbCA9IGh0bWxgXHJcblx0PHVsIGlkPVwiZmlsdGVyc1wiIGNsYXNzPVwiZmlsdGVyc1wiPlxyXG5cdFx0PCEtLSB7e21vZGVsOmZpbHRlck1vZGVsfX0gLS0+XHJcblx0XHQ8bGkgaWQ9XCJ7e25hbWV9fVwiIGstY2xpY2s9XCJ1cGRhdGVVcmwoe3toYXNofX0pXCI+PGEgY2xhc3M9XCJ7e3NlbGVjdGVkP3NlbGVjdGVkOicnfX1cIiBocmVmPVwie3toYXNofX1cIj57e25hbWV9fTwvYT48L2xpPlxyXG5cdFx0PCEtLSB7ey9tb2RlbDpmaWx0ZXJNb2RlbH19IC0tPlxyXG5cdDwvdWw+XHJcbmBcclxuXHJcbmZpbHRlckFwcC5tb3VudCh2bW9kZWwpXHJcblxyXG5leHBvcnQgZGVmYXVsdCBmaWx0ZXJBcHAiLCJpbXBvcnQgS2VldCBmcm9tICcuLi9rZWV0J1xyXG5pbXBvcnQgeyBjcmVhdGVNb2RlbCB9IGZyb20gJy4uL2tlZXQvdXRpbHMnXHJcblxyXG5jbGFzcyBDcmVhdGVNb2RlbCBleHRlbmRzIGNyZWF0ZU1vZGVsIHtcclxuICBjbGVhckNvbXBsZXRlZCgpIHtcclxuICAgIHRoaXMubGlzdCA9IHRoaXMubGlzdC5maWx0ZXIodG9kbyA9PiAhdG9kby5jb21wbGV0ZWQpXHJcbiAgfSBcclxufVxyXG5cclxuY29uc3QgdG9kb01vZGVsID0gbmV3IENyZWF0ZU1vZGVsKClcclxuXHJcbmV4cG9ydCBkZWZhdWx0IHRvZG9Nb2RlbFxyXG4iLCJpbXBvcnQgS2VldCBmcm9tICcuLi9rZWV0J1xyXG5pbXBvcnQgeyBodG1sIH0gZnJvbSAnLi4va2VldC91dGlscydcclxuaW1wb3J0IHRvZG9Nb2RlbCBmcm9tICcuL3RvZG8tbW9kZWwnXHJcblxyXG5jbGFzcyBBcHAgZXh0ZW5kcyBLZWV0IHtcclxuICBlbCA9ICd0b2RvLWxpc3QnXHJcbiAgdG9kb01vZGVsID0gdG9kb01vZGVsXHJcbiAgY29tcG9uZW50V2lsbE1vdW50KCkge1xyXG4gICAgdGhpcy50b2RvTW9kZWwuc3Vic2NyaWJlKG1vZGVsID0+XHJcbiAgICAgdGhpcy5pbmZvcm0obW9kZWwpXHJcbiAgICApXHJcbiAgfVxyXG4gIGFkZFRvZG8obmV3VG9kbyl7XHJcbiAgICB0aGlzLnRvZG9Nb2RlbC5hZGQobmV3VG9kbylcclxuICB9XHJcbiAgZXZ0VG9kbyh0YXJnZXQpe1xyXG4gICAgaWYodGFyZ2V0LmNsYXNzTmFtZSA9PT0gJ3RvZ2dsZScpICBcclxuICAgICAgdGhpcy50b2dnbGVUb2RvKHRhcmdldC5nZXRBdHRyaWJ1dGUoJ2RhdGEtaWQnKSwgISF0YXJnZXQuY2hlY2tlZClcclxuICAgIGVsc2UgaWYodGFyZ2V0LmNsYXNzTmFtZSA9PT0gJ2Rlc3Ryb3knKSAgXHJcbiAgICAgIHRoaXMudG9kb0Rlc3Ryb3kodGFyZ2V0LmdldEF0dHJpYnV0ZSgnZGF0YS1pZCcpKVxyXG4gIH1cclxuICB0b2dnbGVUb2RvKGlkLCBjb21wbGV0ZWQpIHtcclxuICAgIHRoaXMudG9kb01vZGVsLnVwZGF0ZSggJ2lkJywgeyBpZCwgY29tcGxldGVkIH0pXHJcbiAgfVxyXG4gIHRvZG9EZXN0cm95KGlkKSB7XHJcbiAgICB0aGlzLnRvZG9Nb2RlbC5kZXN0cm95KCdpZCcsIGlkKVxyXG4gIH1cclxuICBlZGl0TW9kZSgpe1xyXG4gICAgXHJcbiAgfVxyXG59XHJcblxyXG5jb25zdCB0b2RvQXBwID0gbmV3IEFwcCgpXHJcblxyXG5sZXQgdm1vZGVsID0gaHRtbGBcclxuICA8dWwgaWQ9XCJ0b2RvLWxpc3RcIiBjbGFzcz1cInRvZG8tbGlzdFwiIGstY2xpY2s9XCJldnRUb2RvKClcIj5cclxuICAgIDwhLS0ge3ttb2RlbDp0b2RvTW9kZWx9fSAtLT5cclxuICAgICAgPGxpIGlkPVwie3tpZH19XCIgY2xhc3M9XCJ7e2NvbXBsZXRlZD9jb21wbGV0ZWQ6Jyd9fVwiPlxyXG4gICAgICAgIDxkaXYgY2xhc3M9XCJ2aWV3XCI+XHJcbiAgICAgICAgICA8aW5wdXQgY2xhc3M9XCJ0b2dnbGVcIiBkYXRhLWlkPVwie3tpZH19XCIgdHlwZT1cImNoZWNrYm94XCIgY2hlY2tlZD1cInt7Y29tcGxldGVkP2NoZWNrZWQ6Jyd9fVwiPlxyXG4gICAgICAgICAgPGxhYmVsPnt7dGl0bGV9fTwvbGFiZWw+XHJcbiAgICAgICAgICA8YnV0dG9uIGNsYXNzPVwiZGVzdHJveVwiIGRhdGEtaWQ9XCJ7e2lkfX1cIj48L2J1dHRvbj5cclxuICAgICAgICA8L2Rpdj5cclxuICAgICAgICA8aW5wdXQgY2xhc3M9XCJlZGl0XCIgZGF0YS1pZD1cInt7aWR9fVwiIHZhbHVlPVwie3t0aXRsZX19XCI+XHJcbiAgICAgIDwvbGk+XHJcbiAgICA8IS0tIHt7L21vZGVsOnRvZG9Nb2RlbH19IC0tPlxyXG4gIDwvdWw+XHJcbmBcclxuXHJcbnRvZG9BcHAubW91bnQodm1vZGVsKVxyXG5cclxuZXhwb3J0IGRlZmF1bHQgdG9kb0FwcCIsImNvbnN0IHN0b3JlID0gZnVuY3Rpb24obmFtZXNwYWNlLCBkYXRhKSB7XHJcbiAgaWYgKGFyZ3VtZW50cy5sZW5ndGggPiAxKSB7XHJcbiAgICByZXR1cm4gbG9jYWxTdG9yYWdlLnNldEl0ZW0obmFtZXNwYWNlLCBKU09OLnN0cmluZ2lmeShkYXRhKSlcclxuICB9IGVsc2Uge1xyXG4gICAgdmFyIHN0b3JlID0gbG9jYWxTdG9yYWdlLmdldEl0ZW0obmFtZXNwYWNlKVxyXG4gICAgcmV0dXJuIHN0b3JlICYmIEpTT04ucGFyc2Uoc3RvcmUpIHx8IFtdXHJcbiAgfVxyXG59XHJcblxyXG5jb25zdCBnZW5JZCA9IGZ1bmN0aW9uKCkge1xyXG4gIHJldHVybiAoTWF0aC5yb3VuZChNYXRoLnJhbmRvbSgpICogMHgxKjFlMTIpKS50b1N0cmluZygzMilcclxufVxyXG5cclxuY29uc3QgY2FtZWxDYXNlID0gZnVuY3Rpb24ocykge1xyXG4gIHJldHVybiBzLmNoYXJBdCgwKS50b1VwcGVyQ2FzZSgpICsgcy5zbGljZSgxKVxyXG59XHJcblxyXG5jb25zdCBodG1sID0gZnVuY3Rpb24gKGxpdGVyYWxTZWN0aW9ucywgLi4uc3Vic3RzKSB7XHJcbiAgLy8gVXNlIHJhdyBsaXRlcmFsIHNlY3Rpb25zOiB3ZSBkb27igJl0IHdhbnRcclxuICAvLyBiYWNrc2xhc2hlcyAoXFxuIGV0Yy4pIHRvIGJlIGludGVycHJldGVkXHJcbiAgbGV0IHJhdyA9IGxpdGVyYWxTZWN0aW9ucy5yYXc7XHJcblxyXG4gIGxldCByZXN1bHQgPSAnJztcclxuXHJcbiAgc3Vic3RzLmZvckVhY2goKHN1YnN0LCBpKSA9PiB7XHJcbiAgICAgIC8vIFJldHJpZXZlIHRoZSBsaXRlcmFsIHNlY3Rpb24gcHJlY2VkaW5nXHJcbiAgICAgIC8vIHRoZSBjdXJyZW50IHN1YnN0aXR1dGlvblxyXG4gICAgICBsZXQgbGl0ID0gcmF3W2ldO1xyXG5cclxuICAgICAgLy8gSW4gdGhlIGV4YW1wbGUsIG1hcCgpIHJldHVybnMgYW4gYXJyYXk6XHJcbiAgICAgIC8vIElmIHN1YnN0aXR1dGlvbiBpcyBhbiBhcnJheSAoYW5kIG5vdCBhIHN0cmluZyksXHJcbiAgICAgIC8vIHdlIHR1cm4gaXQgaW50byBhIHN0cmluZ1xyXG4gICAgICBpZiAoQXJyYXkuaXNBcnJheShzdWJzdCkpIHtcclxuICAgICAgICAgIHN1YnN0ID0gc3Vic3Quam9pbignJyk7XHJcbiAgICAgIH1cclxuXHJcbiAgICAgIC8vIElmIHRoZSBzdWJzdGl0dXRpb24gaXMgcHJlY2VkZWQgYnkgYSBkb2xsYXIgc2lnbixcclxuICAgICAgLy8gd2UgZXNjYXBlIHNwZWNpYWwgY2hhcmFjdGVycyBpbiBpdFxyXG4gICAgICBpZiAobGl0LmVuZHNXaXRoKCckJykpIHtcclxuICAgICAgICAgIHN1YnN0ID0gaHRtbEVzY2FwZShzdWJzdCk7XHJcbiAgICAgICAgICBsaXQgPSBsaXQuc2xpY2UoMCwgLTEpO1xyXG4gICAgICB9XHJcbiAgICAgIHJlc3VsdCArPSBsaXQ7XHJcbiAgICAgIHJlc3VsdCArPSBzdWJzdDtcclxuICB9KTtcclxuICAvLyBUYWtlIGNhcmUgb2YgbGFzdCBsaXRlcmFsIHNlY3Rpb25cclxuICAvLyAoTmV2ZXIgZmFpbHMsIGJlY2F1c2UgYW4gZW1wdHkgdGVtcGxhdGUgc3RyaW5nXHJcbiAgLy8gcHJvZHVjZXMgb25lIGxpdGVyYWwgc2VjdGlvbiwgYW4gZW1wdHkgc3RyaW5nKVxyXG4gIHJlc3VsdCArPSByYXdbcmF3Lmxlbmd0aC0xXTsgLy8gKEEpXHJcblxyXG4gIHJldHVybiByZXN1bHQ7XHJcbn1cclxuXHJcbmV4cG9ydCB7XHJcbiAgaHRtbCBhcyBkZWZhdWx0LFxyXG4gIGdlbklkLFxyXG4gIHN0b3JlLFxyXG4gIGNhbWVsQ2FzZVxyXG59Il19
