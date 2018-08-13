(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
var assert = require('../utils').assert
var getId = require('../utils').getId
var checkNodeAvailability = require('../utils').checkNodeAvailability
var cacheInit = {}
module.exports = function (componentStr, node) {
  var component = componentStr.replace('component:', '')
  var c = this[component]
  var el 
  var frag

  if (c !== undefined) {
    // check if sub-component node exist in the DOM


    // this is for initial component runner
    if(!cacheInit[component]){
      frag = document.createDocumentFragment()
      c.base = c.__pristineFragment__.cloneNode(true)
      c.render.call(c, frag)
      cacheInit[component] = frag.cloneNode(true)
      node.parentNode.replaceChild(frag, node)
    } else {
      node.parentNode.replaceChild(cacheInit[component].cloneNode(true), node) 
      c.callBatchPoolUpdate()
    }
  } else {
    assert(false, 'Component ' + component + ' does not exist.')
  }
}

},{"../utils":13}],2:[function(require,module,exports){
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
// var trottle = require('../utils').trottle

var override
var el
var DELAY = 1

var trottle = function(fn, delay) {
  var timer = null;
  return function () {
    var context = this, args = arguments;
    clearTimeout(timer);
    timer = setTimeout(function () {
      fn.apply(context, args);
    }, delay);
  };
};

var morpher = function () {
  // console.log(this.el)
  // console.time('r')
  el = getId(this.el)
  genElement.call(this)
  if(el) {
    this.IS_STUB ? morph(el, this.base.firstChild) : morph(el, this.base)
  }
  // exec life-cycle componentDidUpdate
  if (this.componentDidUpdate && typeof this.componentDidUpdate === 'function') {
    this.componentDidUpdate()
  }
  // console.timeEnd('r')
  // console.log('up')
}

// var updateContext = trottle(morpher, 1)
// var int
var timer = {}
var updateContext = function(fn, delay) {

  var context = this
  timer[this.el] = timer[this.el] || null
  clearTimeout(timer[this.el])
  timer[this.el] = setTimeout(function () {
    fn.call(context)
  }, delay)
  // console.log(timer)
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

  // console.trace(1)

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
      // console.log(updateOfNew)
      function diffModel() {
        pNode =[].pop.call(arguments)
        // check if both models are equally in length
        equalLength = oldModel.length === modelList.length

        // do properties update
        if (equalLength) {
          updateOfNew.map(function (obj) {
            child = pNode.querySelector('[id="' + obj[ref] + '"]')
            m = genModelTemplate(str, obj)
            documentFragment = range.createContextualFragment(m)
            // morph(child, documentFragment.firstChild)
            pNode.replaceChild(documentFragment, child)
          })
        // add new objects
        } else if (updateOfNew.length > 0 && diffOfOld.length === 0) {
          updateOfNew.map(function (obj) {
            m = genModelTemplate(str, obj)
            documentFragment = range.createContextualFragment(m)
            pNode.insertBefore(documentFragment, pNode.lastChild)
          })
        // destroy selected objects
        } else if (updateOfNew.length === 0 && diffOfOld.length > 0) {
          diffOfOld.map(function (obj) {
            child = pNode.querySelector('[id="' + obj[ref] + '"]')
            pNode.removeChild(child)
          })
        }

        // replace oldModel after diffing
        cache[model].oldModel = JSON.parse(JSON.stringify(modelList))
      }

      // check existing parentNode in the DOM
      if (parentNode.hasAttribute('id')) {
        pNode = getId(parentNode.id)
        // console.log(pNode)
        if(pNode){
          diffModel.call(this, null, null, pNode)
        } else {
          checkNodeAvailability({ el: parentNode.id }, model, diffModel.bind(this))
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
    if(el.nodeType === DOCUMENT_ELEMENT_TYPE)
      el.setAttribute('data-ignore', '')
    else if(el.hasChildNodes() && el.firstChild.nodeType === DOCUMENT_ELEMENT_TYPE){
      el.firstChildsetAttribute('data-ignore', '')
      assert(el.childNodes.length !== 1, 'Sub-component should only has a single rootNode.')
    }
    // listen to state changes
    setState.call(this)
    // mount fragment to DOM
    el.appendChild(this.base)
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
    // console.log(this)
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
            // generate list model
            genModelList.call(ctx, node, modelRep, tmplhandler)
          } else if (rep.match(conditionalRe)) {
            // console.log(node)
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
      // console.log(node)
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
              // console.log(node)
              node.addEventListener(evtName, fn, false)
            } else {
              node.addEventListener(evtName, c.bind.apply(c.bind(ctx), [node].concat(argv)), false)
            }
            node.setAttribute('evt-node', '')
            if (node.hasAttribute('id')) {
              p = ctx.__pristineFragment__.getElementById(node.id)
              if (!p.hasAttribute('evt-node')) {
                p.setAttribute('evt-node', '')
              }
            }
            // console.log(node)
          }
        }
      }
    }
  }

  function check (node) {
    parse: while (node) {
      currentNode = node
      if (currentNode.nodeType === DOCUMENT_ELEMENT_TYPE) {
        if (currentNode.hasAttributes()) {
          addEvent(currentNode)
          inspectAttributes(currentNode)
        }
        check(currentNode.firstChild)
      } else if (currentNode.nodeValue.match(re)) {
        value = currentNode.nodeValue
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
                // generate list model
                genModelList.call(ctx, node, modelRep, tmplhandler)
                // node = node.nextSibling.nextSibling 
                // console.log(currentNode.nextSibling)
                // continue parse
              } else if (rep.match(conditionalRe)) {
                // console.log(node)
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

var parseStr = require('./components/parseStr')
var updateContext = require('./components/genElement').updateContext
var morpher = require('./components/genElement').morpher
var clearState = require('./components/genElement').clearState
var getId = require('./utils').getId
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
  this.onChanges = []
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
  return parseStr.call(this, stub)
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
  this.onChanges.push(fn)
}

Keet.prototype.inform = function (model) {
  for (var i = this.onChanges.length; i--;) {
    this.onChanges[i](model)
  }
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

var cov_18r9707xyl = function () {
  var path = 'C:\\Users\\User\\distro\\preact-perf\\todomvc\\keetjs\\keet\\utils.js',
      hash = '0525b31896ff82f40d93f224193e31853eaba8a8',
      Function = function () {}.constructor,
      global = new Function('return this')(),
      gcv = '__coverage__',
      coverageData = {
    path: 'C:\\Users\\User\\distro\\preact-perf\\todomvc\\keetjs\\keet\\utils.js',
    statementMap: {
      '0': {
        start: {
          line: 1,
          column: 12
        },
        end: {
          line: 3,
          column: 1
        }
      },
      '1': {
        start: {
          line: 2,
          column: 2
        },
        end: {
          line: 2,
          column: 36
        }
      },
      '2': {
        start: {
          line: 5,
          column: 0
        },
        end: {
          line: 5,
          column: 21
        }
      },
      '3': {
        start: {
          line: 7,
          column: 0
        },
        end: {
          line: 9,
          column: 1
        }
      },
      '4': {
        start: {
          line: 8,
          column: 2
        },
        end: {
          line: 8,
          column: 25
        }
      },
      '5': {
        start: {
          line: 19,
          column: 0
        },
        end: {
          line: 38,
          column: 1
        }
      },
      '6': {
        start: {
          line: 20,
          column: 12
        },
        end: {
          line: 20,
          column: 31
        }
      },
      '7': {
        start: {
          line: 21,
          column: 14
        },
        end: {
          line: 21,
          column: 19
        }
      },
      '8': {
        start: {
          line: 22,
          column: 2
        },
        end: {
          line: 37,
          column: 3
        }
      },
      '9': {
        start: {
          line: 22,
          column: 11
        },
        end: {
          line: 22,
          column: 21
        }
      },
      '10': {
        start: {
          line: 24,
          column: 12
        },
        end: {
          line: 31,
          column: 9
        }
      },
      '11': {
        start: {
          line: 25,
          column: 6
        },
        end: {
          line: 25,
          column: 31
        }
      },
      '12': {
        start: {
          line: 26,
          column: 6
        },
        end: {
          line: 30,
          column: 7
        }
      },
      '13': {
        start: {
          line: 27,
          column: 8
        },
        end: {
          line: 27,
          column: 24
        }
      },
      '14': {
        start: {
          line: 28,
          column: 8
        },
        end: {
          line: 28,
          column: 20
        }
      },
      '15': {
        start: {
          line: 29,
          column: 8
        },
        end: {
          line: 29,
          column: 47
        }
      },
      '16': {
        start: {
          line: 33,
          column: 4
        },
        end: {
          line: 36,
          column: 11
        }
      },
      '17': {
        start: {
          line: 34,
          column: 6
        },
        end: {
          line: 34,
          column: 22
        }
      },
      '18': {
        start: {
          line: 35,
          column: 6
        },
        end: {
          line: 35,
          column: 74
        }
      },
      '19': {
        start: {
          line: 35,
          column: 64
        },
        end: {
          line: 35,
          column: 74
        }
      },
      '20': {
        start: {
          line: 49,
          column: 0
        },
        end: {
          line: 51,
          column: 1
        }
      },
      '21': {
        start: {
          line: 50,
          column: 2
        },
        end: {
          line: 50,
          column: 44
        }
      },
      '22': {
        start: {
          line: 50,
          column: 12
        },
        end: {
          line: 50,
          column: 44
        }
      },
      '23': {
        start: {
          line: 64,
          column: 0
        },
        end: {
          line: 77,
          column: 1
        }
      },
      '24': {
        start: {
          line: 65,
          column: 17
        },
        end: {
          line: 65,
          column: 41
        }
      },
      '25': {
        start: {
          line: 66,
          column: 15
        },
        end: {
          line: 66,
          column: 39
        }
      },
      '26': {
        start: {
          line: 68,
          column: 15
        },
        end: {
          line: 70,
          column: 4
        }
      },
      '27': {
        start: {
          line: 69,
          column: 4
        },
        end: {
          line: 69,
          column: 36
        }
      },
      '28': {
        start: {
          line: 72,
          column: 2
        },
        end: {
          line: 72,
          column: 30
        }
      },
      '29': {
        start: {
          line: 73,
          column: 2
        },
        end: {
          line: 75,
          column: 13
        }
      },
      '30': {
        start: {
          line: 74,
          column: 4
        },
        end: {
          line: 74,
          column: 19
        }
      },
      '31': {
        start: {
          line: 76,
          column: 2
        },
        end: {
          line: 76,
          column: 15
        }
      },
      '32': {
        start: {
          line: 89,
          column: 14
        },
        end: {
          line: 89,
          column: 18
        }
      },
      '33': {
        start: {
          line: 90,
          column: 2
        },
        end: {
          line: 96,
          column: 4
        }
      },
      '34': {
        start: {
          line: 91,
          column: 18
        },
        end: {
          line: 91,
          column: 22
        }
      },
      '35': {
        start: {
          line: 91,
          column: 31
        },
        end: {
          line: 91,
          column: 40
        }
      },
      '36': {
        start: {
          line: 92,
          column: 4
        },
        end: {
          line: 92,
          column: 24
        }
      },
      '37': {
        start: {
          line: 93,
          column: 4
        },
        end: {
          line: 95,
          column: 14
        }
      },
      '38': {
        start: {
          line: 94,
          column: 6
        },
        end: {
          line: 94,
          column: 30
        }
      },
      '39': {
        start: {
          line: 99,
          column: 0
        },
        end: {
          line: 99,
          column: 25
        }
      },
      '40': {
        start: {
          line: 112,
          column: 14
        },
        end: {
          line: 112,
          column: 16
        }
      },
      '41': {
        start: {
          line: 113,
          column: 18
        },
        end: {
          line: 113,
          column: 20
        }
      },
      '42': {
        start: {
          line: 115,
          column: 15
        },
        end: {
          line: 120,
          column: 3
        }
      },
      '43': {
        start: {
          line: 117,
          column: 4
        },
        end: {
          line: 119,
          column: 5
        }
      },
      '44': {
        start: {
          line: 118,
          column: 6
        },
        end: {
          line: 118,
          column: 25
        }
      },
      '45': {
        start: {
          line: 127,
          column: 2
        },
        end: {
          line: 137,
          column: 4
        }
      },
      '46': {
        start: {
          line: 131,
          column: 6
        },
        end: {
          line: 131,
          column: 18
        }
      },
      '47': {
        start: {
          line: 134,
          column: 6
        },
        end: {
          line: 134,
          column: 17
        }
      },
      '48': {
        start: {
          line: 135,
          column: 6
        },
        end: {
          line: 135,
          column: 14
        }
      },
      '49': {
        start: {
          line: 147,
          column: 2
        },
        end: {
          line: 149,
          column: 3
        }
      },
      '50': {
        start: {
          line: 148,
          column: 4
        },
        end: {
          line: 148,
          column: 22
        }
      },
      '51': {
        start: {
          line: 159,
          column: 2
        },
        end: {
          line: 161,
          column: 3
        }
      },
      '52': {
        start: {
          line: 160,
          column: 4
        },
        end: {
          line: 160,
          column: 37
        }
      },
      '53': {
        start: {
          line: 172,
          column: 2
        },
        end: {
          line: 176,
          column: 3
        }
      },
      '54': {
        start: {
          line: 173,
          column: 4
        },
        end: {
          line: 175,
          column: 6
        }
      },
      '55': {
        start: {
          line: 174,
          column: 6
        },
        end: {
          line: 174,
          column: 88
        }
      },
      '56': {
        start: {
          line: 187,
          column: 2
        },
        end: {
          line: 191,
          column: 3
        }
      },
      '57': {
        start: {
          line: 188,
          column: 4
        },
        end: {
          line: 190,
          column: 6
        }
      },
      '58': {
        start: {
          line: 189,
          column: 6
        },
        end: {
          line: 189,
          column: 36
        }
      },
      '59': {
        start: {
          line: 194,
          column: 0
        },
        end: {
          line: 194,
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
            column: 12
          },
          end: {
            line: 1,
            column: 13
          }
        },
        loc: {
          start: {
            line: 1,
            column: 26
          },
          end: {
            line: 3,
            column: 1
          }
        },
        line: 1
      },
      '1': {
        name: '(anonymous_1)',
        decl: {
          start: {
            line: 7,
            column: 20
          },
          end: {
            line: 7,
            column: 21
          }
        },
        loc: {
          start: {
            line: 7,
            column: 36
          },
          end: {
            line: 9,
            column: 1
          }
        },
        line: 7
      },
      '2': {
        name: '(anonymous_2)',
        decl: {
          start: {
            line: 19,
            column: 32
          },
          end: {
            line: 19,
            column: 33
          }
        },
        loc: {
          start: {
            line: 19,
            column: 88
          },
          end: {
            line: 38,
            column: 1
          }
        },
        line: 19
      },
      '3': {
        name: '(anonymous_3)',
        decl: {
          start: {
            line: 24,
            column: 24
          },
          end: {
            line: 24,
            column: 25
          }
        },
        loc: {
          start: {
            line: 24,
            column: 36
          },
          end: {
            line: 31,
            column: 5
          }
        },
        line: 24
      },
      '4': {
        name: '(anonymous_4)',
        decl: {
          start: {
            line: 33,
            column: 15
          },
          end: {
            line: 33,
            column: 16
          }
        },
        loc: {
          start: {
            line: 33,
            column: 27
          },
          end: {
            line: 36,
            column: 5
          }
        },
        line: 33
      },
      '5': {
        name: '(anonymous_5)',
        decl: {
          start: {
            line: 49,
            column: 17
          },
          end: {
            line: 49,
            column: 18
          }
        },
        loc: {
          start: {
            line: 49,
            column: 37
          },
          end: {
            line: 51,
            column: 1
          }
        },
        line: 49
      },
      '6': {
        name: 'html',
        decl: {
          start: {
            line: 64,
            column: 24
          },
          end: {
            line: 64,
            column: 28
          }
        },
        loc: {
          start: {
            line: 64,
            column: 32
          },
          end: {
            line: 77,
            column: 1
          }
        },
        line: 64
      },
      '7': {
        name: '(anonymous_7)',
        decl: {
          start: {
            line: 68,
            column: 35
          },
          end: {
            line: 68,
            column: 36
          }
        },
        loc: {
          start: {
            line: 68,
            column: 58
          },
          end: {
            line: 70,
            column: 3
          }
        },
        line: 68
      },
      '8': {
        name: '(anonymous_8)',
        decl: {
          start: {
            line: 73,
            column: 22
          },
          end: {
            line: 73,
            column: 23
          }
        },
        loc: {
          start: {
            line: 73,
            column: 35
          },
          end: {
            line: 75,
            column: 3
          }
        },
        line: 73
      },
      '9': {
        name: 'trottle',
        decl: {
          start: {
            line: 88,
            column: 9
          },
          end: {
            line: 88,
            column: 16
          }
        },
        loc: {
          start: {
            line: 88,
            column: 28
          },
          end: {
            line: 97,
            column: 1
          }
        },
        line: 88
      },
      '10': {
        name: '(anonymous_10)',
        decl: {
          start: {
            line: 90,
            column: 9
          },
          end: {
            line: 90,
            column: 10
          }
        },
        loc: {
          start: {
            line: 90,
            column: 21
          },
          end: {
            line: 96,
            column: 3
          }
        },
        line: 90
      },
      '11': {
        name: '(anonymous_11)',
        decl: {
          start: {
            line: 93,
            column: 23
          },
          end: {
            line: 93,
            column: 24
          }
        },
        loc: {
          start: {
            line: 93,
            column: 35
          },
          end: {
            line: 95,
            column: 5
          }
        },
        line: 93
      },
      '12': {
        name: 'createModel',
        decl: {
          start: {
            line: 111,
            column: 9
          },
          end: {
            line: 111,
            column: 20
          }
        },
        loc: {
          start: {
            line: 111,
            column: 24
          },
          end: {
            line: 192,
            column: 1
          }
        },
        line: 111
      },
      '13': {
        name: '(anonymous_13)',
        decl: {
          start: {
            line: 115,
            column: 15
          },
          end: {
            line: 115,
            column: 16
          }
        },
        loc: {
          start: {
            line: 115,
            column: 27
          },
          end: {
            line: 120,
            column: 3
          }
        },
        line: 115
      },
      '14': {
        name: '(anonymous_14)',
        decl: {
          start: {
            line: 130,
            column: 9
          },
          end: {
            line: 130,
            column: 10
          }
        },
        loc: {
          start: {
            line: 130,
            column: 21
          },
          end: {
            line: 132,
            column: 5
          }
        },
        line: 130
      },
      '15': {
        name: '(anonymous_15)',
        decl: {
          start: {
            line: 133,
            column: 9
          },
          end: {
            line: 133,
            column: 10
          }
        },
        loc: {
          start: {
            line: 133,
            column: 24
          },
          end: {
            line: 136,
            column: 5
          }
        },
        line: 133
      },
      '16': {
        name: '(anonymous_16)',
        decl: {
          start: {
            line: 147,
            column: 19
          },
          end: {
            line: 147,
            column: 20
          }
        },
        loc: {
          start: {
            line: 147,
            column: 33
          },
          end: {
            line: 149,
            column: 3
          }
        },
        line: 147
      },
      '17': {
        name: '(anonymous_17)',
        decl: {
          start: {
            line: 159,
            column: 13
          },
          end: {
            line: 159,
            column: 14
          }
        },
        loc: {
          start: {
            line: 159,
            column: 28
          },
          end: {
            line: 161,
            column: 3
          }
        },
        line: 159
      },
      '18': {
        name: '(anonymous_18)',
        decl: {
          start: {
            line: 172,
            column: 16
          },
          end: {
            line: 172,
            column: 17
          }
        },
        loc: {
          start: {
            line: 172,
            column: 47
          },
          end: {
            line: 176,
            column: 3
          }
        },
        line: 172
      },
      '19': {
        name: '(anonymous_19)',
        decl: {
          start: {
            line: 173,
            column: 30
          },
          end: {
            line: 173,
            column: 31
          }
        },
        loc: {
          start: {
            line: 173,
            column: 45
          },
          end: {
            line: 175,
            column: 5
          }
        },
        line: 173
      },
      '20': {
        name: '(anonymous_20)',
        decl: {
          start: {
            line: 187,
            column: 17
          },
          end: {
            line: 187,
            column: 18
          }
        },
        loc: {
          start: {
            line: 187,
            column: 44
          },
          end: {
            line: 191,
            column: 3
          }
        },
        line: 187
      },
      '21': {
        name: '(anonymous_21)',
        decl: {
          start: {
            line: 188,
            column: 33
          },
          end: {
            line: 188,
            column: 34
          }
        },
        loc: {
          start: {
            line: 188,
            column: 48
          },
          end: {
            line: 190,
            column: 5
          }
        },
        line: 188
      }
    },
    branchMap: {
      '0': {
        loc: {
          start: {
            line: 22,
            column: 2
          },
          end: {
            line: 37,
            column: 3
          }
        },
        type: 'if',
        locations: [{
          start: {
            line: 22,
            column: 2
          },
          end: {
            line: 37,
            column: 3
          }
        }, {
          start: {
            line: 22,
            column: 2
          },
          end: {
            line: 37,
            column: 3
          }
        }],
        line: 22
      },
      '1': {
        loc: {
          start: {
            line: 26,
            column: 6
          },
          end: {
            line: 30,
            column: 7
          }
        },
        type: 'if',
        locations: [{
          start: {
            line: 26,
            column: 6
          },
          end: {
            line: 30,
            column: 7
          }
        }, {
          start: {
            line: 26,
            column: 6
          },
          end: {
            line: 30,
            column: 7
          }
        }],
        line: 26
      },
      '2': {
        loc: {
          start: {
            line: 35,
            column: 6
          },
          end: {
            line: 35,
            column: 74
          }
        },
        type: 'if',
        locations: [{
          start: {
            line: 35,
            column: 6
          },
          end: {
            line: 35,
            column: 74
          }
        }, {
          start: {
            line: 35,
            column: 6
          },
          end: {
            line: 35,
            column: 74
          }
        }],
        line: 35
      },
      '3': {
        loc: {
          start: {
            line: 35,
            column: 10
          },
          end: {
            line: 35,
            column: 62
          }
        },
        type: 'binary-expr',
        locations: [{
          start: {
            line: 35,
            column: 10
          },
          end: {
            line: 35,
            column: 16
          }
        }, {
          start: {
            line: 35,
            column: 20
          },
          end: {
            line: 35,
            column: 28
          }
        }, {
          start: {
            line: 35,
            column: 32
          },
          end: {
            line: 35,
            column: 62
          }
        }],
        line: 35
      },
      '4': {
        loc: {
          start: {
            line: 50,
            column: 2
          },
          end: {
            line: 50,
            column: 44
          }
        },
        type: 'if',
        locations: [{
          start: {
            line: 50,
            column: 2
          },
          end: {
            line: 50,
            column: 44
          }
        }, {
          start: {
            line: 50,
            column: 2
          },
          end: {
            line: 50,
            column: 44
          }
        }],
        line: 50
      },
      '5': {
        loc: {
          start: {
            line: 174,
            column: 13
          },
          end: {
            line: 174,
            column: 88
          }
        },
        type: 'cond-expr',
        locations: [{
          start: {
            line: 174,
            column: 53
          },
          end: {
            line: 174,
            column: 56
          }
        }, {
          start: {
            line: 174,
            column: 59
          },
          end: {
            line: 174,
            column: 88
          }
        }],
        line: 174
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
      '53': 0,
      '54': 0,
      '55': 0,
      '56': 0,
      '57': 0,
      '58': 0,
      '59': 0
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
      '20': 0,
      '21': 0
    },
    b: {
      '0': [0, 0],
      '1': [0, 0],
      '2': [0, 0],
      '3': [0, 0, 0],
      '4': [0, 0],
      '5': [0, 0]
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

cov_18r9707xyl.s[0]++;
var getId = function getId(id) {
  cov_18r9707xyl.f[0]++;
  cov_18r9707xyl.s[1]++;

  return document.getElementById(id);
};

cov_18r9707xyl.s[2]++;
exports.getId = getId;

cov_18r9707xyl.s[3]++;
exports.testEvent = function (tmpl) {
  cov_18r9707xyl.f[1]++;
  cov_18r9707xyl.s[4]++;

  return (/ k-/.test(tmpl)
  );
};

/**
 * @private
 * @description
 * Check a node availability in 250ms, if not found silenty skip the event
 *
 * @param {string} id - the node id
 * @param {function} callback - the function to execute once the node is found
 */
cov_18r9707xyl.s[5]++;
exports.checkNodeAvailability = function (component, componentName, callback, notFound) {
  cov_18r9707xyl.f[2]++;

  var ele = (cov_18r9707xyl.s[6]++, getId(component.el));
  var found = (cov_18r9707xyl.s[7]++, false);
  cov_18r9707xyl.s[8]++;
  if (ele) {
      cov_18r9707xyl.b[0][0]++;
      cov_18r9707xyl.s[9]++;
      return ele;
    } else {
    cov_18r9707xyl.b[0][1]++;

    var t = (cov_18r9707xyl.s[10]++, setInterval(function () {
      cov_18r9707xyl.f[3]++;
      cov_18r9707xyl.s[11]++;

      ele = getId(component.el);
      cov_18r9707xyl.s[12]++;
      if (ele) {
        cov_18r9707xyl.b[1][0]++;
        cov_18r9707xyl.s[13]++;

        clearInterval(t);
        cov_18r9707xyl.s[14]++;
        found = true;
        cov_18r9707xyl.s[15]++;
        callback(component, componentName, ele);
      } else {
        cov_18r9707xyl.b[1][1]++;
      }
    }, 0));
    // silently ignore finding the node after sometimes
    cov_18r9707xyl.s[16]++;
    setTimeout(function () {
      cov_18r9707xyl.f[4]++;
      cov_18r9707xyl.s[17]++;

      clearInterval(t);
      cov_18r9707xyl.s[18]++;
      if ((cov_18r9707xyl.b[3][0]++, !found) && (cov_18r9707xyl.b[3][1]++, notFound) && (cov_18r9707xyl.b[3][2]++, typeof notFound === 'function')) {
          cov_18r9707xyl.b[2][0]++;
          cov_18r9707xyl.s[19]++;
          notFound();
        } else {
        cov_18r9707xyl.b[2][1]++;
      }
    }, 250);
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
cov_18r9707xyl.s[20]++;
exports.assert = function (val, msg) {
  cov_18r9707xyl.f[5]++;
  cov_18r9707xyl.s[21]++;

  if (!val) {
      cov_18r9707xyl.b[4][0]++;
      cov_18r9707xyl.s[22]++;
      throw new Error('(keet) ' + msg);
    } else {
    cov_18r9707xyl.b[4][1]++;
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
cov_18r9707xyl.s[23]++;
exports.html = function html() {
  cov_18r9707xyl.f[6]++;

  var literals = (cov_18r9707xyl.s[24]++, [].shift.call(arguments));
  var substs = (cov_18r9707xyl.s[25]++, [].slice.call(arguments));

  var result = (cov_18r9707xyl.s[26]++, literals.raw.reduce(function (acc, lit, i) {
    cov_18r9707xyl.f[7]++;
    cov_18r9707xyl.s[27]++;

    return acc + substs[i - 1] + lit;
  }));
  // remove spacing, indentation from every line
  cov_18r9707xyl.s[28]++;
  result = result.split(/\n+/);
  cov_18r9707xyl.s[29]++;
  result = result.map(function (t) {
    cov_18r9707xyl.f[8]++;
    cov_18r9707xyl.s[30]++;

    return t.trim();
  }).join('');
  cov_18r9707xyl.s[31]++;
  return result;
};

/**
 * @private
 * @description
 * trottle function calls
 *
 * @param {Function} fn - function to trottle
 * @param {Number} delay - time delay before function get executed
 */

function trottle(fn, delay) {
  cov_18r9707xyl.f[9]++;

  var timer = (cov_18r9707xyl.s[32]++, null);
  cov_18r9707xyl.s[33]++;
  return function () {
    cov_18r9707xyl.f[10]++;

    var context = (cov_18r9707xyl.s[34]++, this),
        args = (cov_18r9707xyl.s[35]++, arguments);
    cov_18r9707xyl.s[36]++;
    clearTimeout(timer);
    cov_18r9707xyl.s[37]++;
    timer = setTimeout(function () {
      cov_18r9707xyl.f[11]++;
      cov_18r9707xyl.s[38]++;

      fn.apply(context, args);
    }, delay);
  };
};

cov_18r9707xyl.s[39]++;
exports.trottle = trottle;

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
  cov_18r9707xyl.f[12]++;

  var model = (cov_18r9707xyl.s[40]++, []);
  var onChanges = (cov_18r9707xyl.s[41]++, []);

  cov_18r9707xyl.s[42]++;
  var inform = function inform() {
    cov_18r9707xyl.f[13]++;
    cov_18r9707xyl.s[43]++;

    // console.log(onChanges)
    for (var i = onChanges.length; i--;) {
      cov_18r9707xyl.s[44]++;

      onChanges[i](model);
    }
  };

  /**
   * @private
   * @description
   * Register callback listener of any changes
   */
  cov_18r9707xyl.s[45]++;
  Object.defineProperty(this, 'list', {
    enumerable: false,
    configurable: true,
    get: function get() {
      cov_18r9707xyl.f[14]++;
      cov_18r9707xyl.s[46]++;

      return model;
    },
    set: function set(val) {
      cov_18r9707xyl.f[15]++;
      cov_18r9707xyl.s[47]++;

      model = val;
      cov_18r9707xyl.s[48]++;
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
  cov_18r9707xyl.s[49]++;
  this.subscribe = function (fn) {
    cov_18r9707xyl.f[16]++;
    cov_18r9707xyl.s[50]++;

    onChanges.push(fn);
  };

  /**
   * @private
   * @description
   * Add new object to the model list
   *
   * @param {Object} obj - new object to add into the model list
   *
   */
  cov_18r9707xyl.s[51]++;
  this.add = function (obj) {
    cov_18r9707xyl.f[17]++;
    cov_18r9707xyl.s[52]++;

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
  cov_18r9707xyl.s[53]++;
  this.update = function (lookupId, updateObj) {
    cov_18r9707xyl.f[18]++;
    cov_18r9707xyl.s[54]++;

    this.list = this.list.map(function (obj) {
      cov_18r9707xyl.f[19]++;
      cov_18r9707xyl.s[55]++;

      return obj[lookupId] !== updateObj[lookupId] ? (cov_18r9707xyl.b[5][0]++, obj) : (cov_18r9707xyl.b[5][1]++, Object.assign(obj, updateObj));
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
  cov_18r9707xyl.s[56]++;
  this.destroy = function (lookupId, objId) {
    cov_18r9707xyl.f[20]++;
    cov_18r9707xyl.s[57]++;

    this.list = this.list.filter(function (obj) {
      cov_18r9707xyl.f[21]++;
      cov_18r9707xyl.s[58]++;

      return obj[lookupId] !== objId;
    });
  };
}

cov_18r9707xyl.s[59]++;
exports.createModel = createModel;

},{}],14:[function(require,module,exports){
'use strict';

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _templateObject = _taggedTemplateLiteral(['\n  <section class="todoapp">\n    <header id="header">\n      <h1>todos</h1>\n      <input id="new-todo" class="new-todo" k-keydown="create()" placeholder="What needs to be done?" autofocus>\n    </header>\n    <!-- {{?todoState}} -->\n    <section class="main">\n      <input id="toggle-all" class="toggle-all" type="checkbox" checked="{{isChecked?checked:\'\'}}" k-click="completeAll()">\n      <label for="toggle-all">Mark all as complete</label>\n      <!-- {{component:todoApp}} -->\n    </section>\n    <footer class="footer">\n      <span class="todo-count">\n        <strong>{{count}}</strong> item{{plural}} left\n      </span>\n      <!-- component:filter -->\n      <!-- {{?clearToggle}} -->\n      <button id="clear-completed" class="clear-completed">Clear completed</button>\n      <!-- {{/clearToggle}} -->\n    </footer>\n    <!-- {{/todoState}} -->\n  </section>\n  <footer class="info">\n    <p>Double-click to edit a todo</p>\n    <p>Created by <a href="https://github.com/syarul">Shahrul Nizam Selamat</a></p>\n    <p>Part of <a href="http://todomvc.com">TodoMVC</a></p>\n  </footer>'], ['\n  <section class="todoapp">\n    <header id="header">\n      <h1>todos</h1>\n      <input id="new-todo" class="new-todo" k-keydown="create()" placeholder="What needs to be done?" autofocus>\n    </header>\n    <!-- {{?todoState}} -->\n    <section class="main">\n      <input id="toggle-all" class="toggle-all" type="checkbox" checked="{{isChecked?checked:\'\'}}" k-click="completeAll()">\n      <label for="toggle-all">Mark all as complete</label>\n      <!-- {{component:todoApp}} -->\n    </section>\n    <footer class="footer">\n      <span class="todo-count">\n        <strong>{{count}}</strong> item{{plural}} left\n      </span>\n      <!-- component:filter -->\n      <!-- {{?clearToggle}} -->\n      <button id="clear-completed" class="clear-completed">Clear completed</button>\n      <!-- {{/clearToggle}} -->\n    </footer>\n    <!-- {{/todoState}} -->\n  </section>\n  <footer class="info">\n    <p>Double-click to edit a todo</p>\n    <p>Created by <a href="https://github.com/syarul">Shahrul Nizam Selamat</a></p>\n    <p>Part of <a href="http://todomvc.com">TodoMVC</a></p>\n  </footer>']);

var _keet = require('../keet');

var _keet2 = _interopRequireDefault(_keet);

var _utils = require('../keet/utils');

var _util = require('./util');

var _filter = require('./filter');

var _filter2 = _interopRequireDefault(_filter);

var _todo = require('./todo');

var _todo2 = _interopRequireDefault(_todo);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _taggedTemplateLiteral(strings, raw) { return Object.freeze(Object.defineProperties(strings, { raw: { value: Object.freeze(raw) } })); }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var App = function (_Keet) {
  _inherits(App, _Keet);

  function App() {
    var _ref;

    var _temp, _this, _ret;

    _classCallCheck(this, App);

    for (var _len = arguments.length, args = Array(_len), _key = 0; _key < _len; _key++) {
      args[_key] = arguments[_key];
    }

    return _ret = (_temp = (_this = _possibleConstructorReturn(this, (_ref = App.__proto__ || Object.getPrototypeOf(App)).call.apply(_ref, [this].concat(args))), _this), _this.todoApp = _todo2.default, _this.filter = _filter2.default, _this.isChecked = false, _this.count = 0, _this.plural = '', _this.clearToggle = false, _this.todoState = true, _temp), _possibleConstructorReturn(_this, _ret);
  }

  _createClass(App, [{
    key: 'componentWillMount',
    value: function componentWillMount() {
      // this.todoModel.subscribe(todos => this.callBatchPoolUpdate())
      // this.todoState = this.todoApp.todoModel.list.length ? true : false
      // const self = this
      _todo2.default.subscribe(function (todos) {
        console.log(todos);
        // let uncompleted = todos.filter(c => !c.completed)
        // let completed = todos.filter(c => c.completed)
        // this.clearToggle = completed.length ? true : false
        // this.todoState = todos.length ? true : false
        // this.plural = uncompleted.length === 1 ? '' : 's'
        // this.count = uncompleted.length
        // console.log(this)
        // this.todoApp.callBatchPoolUpdate()
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
    key: 'createFromFn',
    value: function createFromFn(title) {
      this.todoApp.addTodo({ id: (0, _util.genId)(), title: title, completed: false });
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
    // componentDidUpdate(){
    //   c++
    //   console.log(c/*, time, Date.now() - time*/)
    // }

  }]);

  return App;
}(_keet2.default);

var vmodel = (0, _utils.html)(_templateObject);

var app = new App();

app.mount(vmodel).link('todo');

var i = 1;
while (i > 0) {
  // app.createFromFn(`NEW TODO ${i}`)
  i--;
}

},{"../keet":10,"../keet/utils":13,"./filter":16,"./todo":18,"./util":19}],15:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _util = require('./util');

var _utils = require('../keet/utils');

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var CreateFilterModel = function (_createModel) {
  _inherits(CreateFilterModel, _createModel);

  function CreateFilterModel() {
    _classCallCheck(this, CreateFilterModel);

    return _possibleConstructorReturn(this, (CreateFilterModel.__proto__ || Object.getPrototypeOf(CreateFilterModel)).apply(this, arguments));
  }

  _createClass(CreateFilterModel, [{
    key: 'switch',
    value: function _switch(hash, obj) {
      this.list = this.list.map(function (filter) {
        return filter.hash === hash ? _extends({}, filter, obj) : _extends({}, filter, { selected: false });
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

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _templateObject = _taggedTemplateLiteral(['\n\t<ul id="filters" class="filters">\n\t\t<!-- {{model:filterModel}} -->\n\t\t<li id="{{name}}" k-click="updateUrl({{hash}})"><a class="{{selected?selected:\'\'}}" href="{{hash}}">{{name}}</a></li>\n\t\t<!-- {{/model:filterModel}} -->\n\t</ul>\n'], ['\n\t<ul id="filters" class="filters">\n\t\t<!-- {{model:filterModel}} -->\n\t\t<li id="{{name}}" k-click="updateUrl({{hash}})"><a class="{{selected?selected:\'\'}}" href="{{hash}}">{{name}}</a></li>\n\t\t<!-- {{/model:filterModel}} -->\n\t</ul>\n']);

var _keet = require('../keet');

var _keet2 = _interopRequireDefault(_keet);

var _utils = require('../keet/utils');

var _filterModel = require('./filter-model');

var _filterModel2 = _interopRequireDefault(_filterModel);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _taggedTemplateLiteral(strings, raw) { return Object.freeze(Object.defineProperties(strings, { raw: { value: Object.freeze(raw) } })); }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var App = function (_Keet) {
  _inherits(App, _Keet);

  function App() {
    var _ref;

    var _temp, _this, _ret;

    _classCallCheck(this, App);

    for (var _len = arguments.length, args = Array(_len), _key = 0; _key < _len; _key++) {
      args[_key] = arguments[_key];
    }

    return _ret = (_temp = (_this = _possibleConstructorReturn(this, (_ref = App.__proto__ || Object.getPrototypeOf(App)).call.apply(_ref, [this].concat(args))), _this), _this.el = 'filters', _this.filterModel = _filterModel2.default, _temp), _possibleConstructorReturn(_this, _ret);
  }

  _createClass(App, [{
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

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _keet = require('../keet');

var _keet2 = _interopRequireDefault(_keet);

var _utils = require('../keet/utils');

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var CreateModel = function (_createModel) {
  _inherits(CreateModel, _createModel);

  function CreateModel() {
    _classCallCheck(this, CreateModel);

    return _possibleConstructorReturn(this, (CreateModel.__proto__ || Object.getPrototypeOf(CreateModel)).apply(this, arguments));
  }

  _createClass(CreateModel, [{
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

// todoModel.add({
// 	id: '12345',
// 	title: 'what the',
// 	completed: false
// })

exports.default = todoModel;

},{"../keet":10,"../keet/utils":13}],18:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _templateObject = _taggedTemplateLiteral(['\n  <ul id="todo-list" class="todo-list" k-click="evtTodo()">\n    <!-- {{model:todoModel}} -->\n      <li id="{{id}}" class="{{completed?completed:\'\'}}">\n        <div class="view">\n          <input class="toggle" data-id="{{id}}" type="checkbox" checked="{{completed?checked:\'\'}}">\n          <label>{{title}}</label>\n          <button class="destroy" data-id="{{id}}"></button>\n        </div>\n        <input class="edit" data-id="{{id}}" value="{{title}}">\n      </li>\n    <!-- {{/model:todoModel}} -->\n  </ul>\n'], ['\n  <ul id="todo-list" class="todo-list" k-click="evtTodo()">\n    <!-- {{model:todoModel}} -->\n      <li id="{{id}}" class="{{completed?completed:\'\'}}">\n        <div class="view">\n          <input class="toggle" data-id="{{id}}" type="checkbox" checked="{{completed?checked:\'\'}}">\n          <label>{{title}}</label>\n          <button class="destroy" data-id="{{id}}"></button>\n        </div>\n        <input class="edit" data-id="{{id}}" value="{{title}}">\n      </li>\n    <!-- {{/model:todoModel}} -->\n  </ul>\n']);

var _keet = require('../keet');

var _keet2 = _interopRequireDefault(_keet);

var _utils = require('../keet/utils');

var _todoModel = require('./todo-model');

var _todoModel2 = _interopRequireDefault(_todoModel);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _taggedTemplateLiteral(strings, raw) { return Object.freeze(Object.defineProperties(strings, { raw: { value: Object.freeze(raw) } })); }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var App = function (_Keet) {
  _inherits(App, _Keet);

  function App() {
    var _ref;

    var _temp, _this, _ret;

    _classCallCheck(this, App);

    for (var _len = arguments.length, args = Array(_len), _key = 0; _key < _len; _key++) {
      args[_key] = arguments[_key];
    }

    return _ret = (_temp = (_this = _possibleConstructorReturn(this, (_ref = App.__proto__ || Object.getPrototypeOf(App)).call.apply(_ref, [this].concat(args))), _this), _this.el = 'todo-list', _this.todoModel = _todoModel2.default, _temp), _possibleConstructorReturn(_this, _ret);
  }

  _createClass(App, [{
    key: 'componentWillMount',
    value: function componentWillMount() {
      var _this2 = this;

      this.todoModel.subscribe(function (model) {
        // console.log(model)
        _this2.callBatchPoolUpdate();
        // this.inform(model)
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uL0FwcERhdGEvUm9hbWluZy9ucG0vbm9kZV9tb2R1bGVzL2Jyb3dzZXJpZnkvbm9kZV9tb2R1bGVzL2Jyb3dzZXItcGFjay9fcHJlbHVkZS5qcyIsImtlZXQvY29tcG9uZW50cy9jb21wb25lbnRQYXJzZS5qcyIsImtlZXQvY29tcG9uZW50cy9jb25kaXRpb25hbE5vZGVzLmpzIiwia2VldC9jb21wb25lbnRzL2dlbkVsZW1lbnQuanMiLCJrZWV0L2NvbXBvbmVudHMvZ2VuTW9kZWxMaXN0LmpzIiwia2VldC9jb21wb25lbnRzL2dlbk1vZGVsVGVtcGxhdGUuanMiLCJrZWV0L2NvbXBvbmVudHMvcGFyc2VTdHIuanMiLCJrZWV0L2NvbXBvbmVudHMvc3RySW50ZXJwcmV0ZXIuanMiLCJrZWV0L2NvbXBvbmVudHMvdGVybmFyeU9wcy5qcyIsImtlZXQvY29tcG9uZW50cy90bXBsSGFuZGxlci5qcyIsImtlZXQva2VldC5qcyIsImtlZXQvbm9kZV9tb2R1bGVzL3NldC1kb20vc3JjL2luZGV4LmpzIiwia2VldC9ub2RlX21vZHVsZXMvc2V0LWRvbS9zcmMvcGFyc2UtaHRtbC5qcyIsImtlZXQvdXRpbHMuanMiLCJzcmMvYXBwLmpzIiwic3JjL2ZpbHRlci1tb2RlbC5qcyIsInNyYy9maWx0ZXIuanMiLCJzcmMvdG9kby1tb2RlbC5qcyIsInNyYy90b2RvLmpzIiwic3JjL3V0aWwuanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7QUNBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDN0JBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNuQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDeEhBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN4SkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN6QkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDOUJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNSQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDN0JBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNqUUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDcElBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNoVUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7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T0FBTixDQUFjLEtBQWQsQ0FBSixFQUEwQjtBQUN0QixjQUFRLE1BQU0sSUFBTixDQUFXLEVBQVgsQ0FBUjtBQUNIOztBQUVEO0FBQ0E7QUFDQSxRQUFJLElBQUksUUFBSixDQUFhLEdBQWIsQ0FBSixFQUF1QjtBQUNuQixjQUFRLFdBQVcsS0FBWCxDQUFSO0FBQ0EsWUFBTSxJQUFJLEtBQUosQ0FBVSxDQUFWLEVBQWEsQ0FBQyxDQUFkLENBQU47QUFDSDtBQUNELGNBQVUsR0FBVjtBQUNBLGNBQVUsS0FBVjtBQUNILEdBcEJEO0FBcUJBO0FBQ0E7QUFDQTtBQUNBLFlBQVUsSUFBSSxJQUFJLE1BQUosR0FBVyxDQUFmLENBQVYsQ0EvQmlELENBK0JwQjs7QUFFN0IsU0FBTyxNQUFQO0FBQ0QsQ0FsQ0Q7O1FBcUNVLE8sR0FBUixJO1FBQ0EsSyxHQUFBLEs7UUFDQSxLLEdBQUEsSztRQUNBLFMsR0FBQSxTIiwiZmlsZSI6ImdlbmVyYXRlZC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzQ29udGVudCI6WyIoZnVuY3Rpb24gZSh0LG4scil7ZnVuY3Rpb24gcyhvLHUpe2lmKCFuW29dKXtpZighdFtvXSl7dmFyIGE9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtpZighdSYmYSlyZXR1cm4gYShvLCEwKTtpZihpKXJldHVybiBpKG8sITApO3ZhciBmPW5ldyBFcnJvcihcIkNhbm5vdCBmaW5kIG1vZHVsZSAnXCIrbytcIidcIik7dGhyb3cgZi5jb2RlPVwiTU9EVUxFX05PVF9GT1VORFwiLGZ9dmFyIGw9bltvXT17ZXhwb3J0czp7fX07dFtvXVswXS5jYWxsKGwuZXhwb3J0cyxmdW5jdGlvbihlKXt2YXIgbj10W29dWzFdW2VdO3JldHVybiBzKG4/bjplKX0sbCxsLmV4cG9ydHMsZSx0LG4scil9cmV0dXJuIG5bb10uZXhwb3J0c312YXIgaT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2Zvcih2YXIgbz0wO288ci5sZW5ndGg7bysrKXMocltvXSk7cmV0dXJuIHN9KSIsInZhciBhc3NlcnQgPSByZXF1aXJlKCcuLi91dGlscycpLmFzc2VydFxyXG52YXIgZ2V0SWQgPSByZXF1aXJlKCcuLi91dGlscycpLmdldElkXHJcbnZhciBjaGVja05vZGVBdmFpbGFiaWxpdHkgPSByZXF1aXJlKCcuLi91dGlscycpLmNoZWNrTm9kZUF2YWlsYWJpbGl0eVxyXG52YXIgY2FjaGVJbml0ID0ge31cclxubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbiAoY29tcG9uZW50U3RyLCBub2RlKSB7XHJcbiAgdmFyIGNvbXBvbmVudCA9IGNvbXBvbmVudFN0ci5yZXBsYWNlKCdjb21wb25lbnQ6JywgJycpXHJcbiAgdmFyIGMgPSB0aGlzW2NvbXBvbmVudF1cclxuICB2YXIgZWwgXHJcbiAgdmFyIGZyYWdcclxuXHJcbiAgaWYgKGMgIT09IHVuZGVmaW5lZCkge1xyXG4gICAgLy8gY2hlY2sgaWYgc3ViLWNvbXBvbmVudCBub2RlIGV4aXN0IGluIHRoZSBET01cclxuXHJcblxyXG4gICAgLy8gdGhpcyBpcyBmb3IgaW5pdGlhbCBjb21wb25lbnQgcnVubmVyXHJcbiAgICBpZighY2FjaGVJbml0W2NvbXBvbmVudF0pe1xyXG4gICAgICBmcmFnID0gZG9jdW1lbnQuY3JlYXRlRG9jdW1lbnRGcmFnbWVudCgpXHJcbiAgICAgIGMuYmFzZSA9IGMuX19wcmlzdGluZUZyYWdtZW50X18uY2xvbmVOb2RlKHRydWUpXHJcbiAgICAgIGMucmVuZGVyLmNhbGwoYywgZnJhZylcclxuICAgICAgY2FjaGVJbml0W2NvbXBvbmVudF0gPSBmcmFnLmNsb25lTm9kZSh0cnVlKVxyXG4gICAgICBub2RlLnBhcmVudE5vZGUucmVwbGFjZUNoaWxkKGZyYWcsIG5vZGUpXHJcbiAgICB9IGVsc2Uge1xyXG4gICAgICBub2RlLnBhcmVudE5vZGUucmVwbGFjZUNoaWxkKGNhY2hlSW5pdFtjb21wb25lbnRdLmNsb25lTm9kZSh0cnVlKSwgbm9kZSkgXHJcbiAgICAgIGMuY2FsbEJhdGNoUG9vbFVwZGF0ZSgpXHJcbiAgICB9XHJcbiAgfSBlbHNlIHtcclxuICAgIGFzc2VydChmYWxzZSwgJ0NvbXBvbmVudCAnICsgY29tcG9uZW50ICsgJyBkb2VzIG5vdCBleGlzdC4nKVxyXG4gIH1cclxufVxyXG4iLCJ2YXIgY29uZGl0aW9uYWxOb2Rlc1Jhd1N0YXJ0ID0gL1xce1xce1xcPyhbXnt9XSspXFx9XFx9L2dcclxudmFyIGNvbmRpdGlvbmFsTm9kZXNSYXdFbmQgPSAvXFx7XFx7XFwvKFtee31dKylcXH1cXH0vZ1xyXG52YXIgRE9DVU1FTlRfRUxFTUVOVF9UWVBFID0gMVxyXG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uIChub2RlLCBjb25kaXRpb25hbCwgdG1wbEhhbmRsZXIpIHtcclxuICB2YXIgZW50cnlOb2RlXHJcbiAgdmFyIGN1cnJlbnROb2RlXHJcbiAgdmFyIGlzR2VuXHJcbiAgdmFyIGZyYWcgPSBkb2N1bWVudC5jcmVhdGVEb2N1bWVudEZyYWdtZW50KClcclxuICAvLyBjb25zb2xlLmxvZyhub2RlKVxyXG4gIHdoaWxlIChub2RlKSB7XHJcbiAgICBjdXJyZW50Tm9kZSA9IG5vZGVcclxuICAgIG5vZGUgPSBub2RlLm5leHRTaWJsaW5nXHJcbiAgICBpZiAoY3VycmVudE5vZGUubm9kZVR5cGUgIT09IERPQ1VNRU5UX0VMRU1FTlRfVFlQRSkge1xyXG4gICAgICBpZiAoY3VycmVudE5vZGUubm9kZVZhbHVlLm1hdGNoKGNvbmRpdGlvbmFsTm9kZXNSYXdTdGFydCkpIHtcclxuICAgICAgICBlbnRyeU5vZGUgPSBjdXJyZW50Tm9kZVxyXG4gICAgICB9IGVsc2UgaWYgKGN1cnJlbnROb2RlLm5vZGVWYWx1ZS5tYXRjaChjb25kaXRpb25hbE5vZGVzUmF3RW5kKSkge1xyXG4gICAgICAgIGN1cnJlbnROb2RlLnJlbW92ZSgpXHJcbiAgICAgICAgLy8gc3RhciBnZW5lcmF0aW5nIHRoZSBjb25kaXRpb25hbCBub2RlcyByYW5nZSwgaWYgbm90IHlldFxyXG4gICAgICAgIGlmICghaXNHZW4pIHtcclxuICAgICAgICAgIGlzR2VuID0gdHJ1ZVxyXG4gICAgICAgICAgdG1wbEhhbmRsZXIodGhpcywgbnVsbCwgbnVsbCwgbnVsbCwgZnJhZylcclxuICAgICAgICB9XHJcbiAgICAgICAgaWYgKHRoaXNbY29uZGl0aW9uYWxdKSB7XHJcbiAgICAgICAgICBlbnRyeU5vZGUucGFyZW50Tm9kZS5pbnNlcnRCZWZvcmUoZnJhZywgZW50cnlOb2RlKVxyXG4gICAgICAgIH1cclxuICAgICAgICBlbnRyeU5vZGUucmVtb3ZlKClcclxuICAgICAgICBub2RlID0gbnVsbFxyXG4gICAgICB9XHJcbiAgICB9IGVsc2Uge1xyXG4gICAgICB2YXIgY05vZGUgPSBjdXJyZW50Tm9kZS5jbG9uZU5vZGUodHJ1ZSlcclxuICAgICAgZnJhZy5hcHBlbmRDaGlsZChjTm9kZSlcclxuICAgICAgY3VycmVudE5vZGUucmVtb3ZlKClcclxuICAgIH1cclxuICB9XHJcbn1cclxuIiwidmFyIHRtcGxIYW5kbGVyID0gcmVxdWlyZSgnLi90bXBsSGFuZGxlcicpXHJcbnZhciBzdHJJbnRlcnByZXRlciA9IHJlcXVpcmUoJy4vc3RySW50ZXJwcmV0ZXInKVxyXG52YXIgbW9ycGggPSByZXF1aXJlKCdzZXQtZG9tJylcclxudmFyIGdldElkID0gcmVxdWlyZSgnLi4vdXRpbHMnKS5nZXRJZFxyXG4vLyB2YXIgdHJvdHRsZSA9IHJlcXVpcmUoJy4uL3V0aWxzJykudHJvdHRsZVxyXG5cclxudmFyIG92ZXJyaWRlXHJcbnZhciBlbFxyXG52YXIgREVMQVkgPSAxXHJcblxyXG52YXIgdHJvdHRsZSA9IGZ1bmN0aW9uKGZuLCBkZWxheSkge1xyXG4gIHZhciB0aW1lciA9IG51bGw7XHJcbiAgcmV0dXJuIGZ1bmN0aW9uICgpIHtcclxuICAgIHZhciBjb250ZXh0ID0gdGhpcywgYXJncyA9IGFyZ3VtZW50cztcclxuICAgIGNsZWFyVGltZW91dCh0aW1lcik7XHJcbiAgICB0aW1lciA9IHNldFRpbWVvdXQoZnVuY3Rpb24gKCkge1xyXG4gICAgICBmbi5hcHBseShjb250ZXh0LCBhcmdzKTtcclxuICAgIH0sIGRlbGF5KTtcclxuICB9O1xyXG59O1xyXG5cclxudmFyIG1vcnBoZXIgPSBmdW5jdGlvbiAoKSB7XHJcbiAgLy8gY29uc29sZS5sb2codGhpcy5lbClcclxuICAvLyBjb25zb2xlLnRpbWUoJ3InKVxyXG4gIGVsID0gZ2V0SWQodGhpcy5lbClcclxuICBnZW5FbGVtZW50LmNhbGwodGhpcylcclxuICBpZihlbCkge1xyXG4gICAgdGhpcy5JU19TVFVCID8gbW9ycGgoZWwsIHRoaXMuYmFzZS5maXJzdENoaWxkKSA6IG1vcnBoKGVsLCB0aGlzLmJhc2UpXHJcbiAgfVxyXG4gIC8vIGV4ZWMgbGlmZS1jeWNsZSBjb21wb25lbnREaWRVcGRhdGVcclxuICBpZiAodGhpcy5jb21wb25lbnREaWRVcGRhdGUgJiYgdHlwZW9mIHRoaXMuY29tcG9uZW50RGlkVXBkYXRlID09PSAnZnVuY3Rpb24nKSB7XHJcbiAgICB0aGlzLmNvbXBvbmVudERpZFVwZGF0ZSgpXHJcbiAgfVxyXG4gIC8vIGNvbnNvbGUudGltZUVuZCgncicpXHJcbiAgLy8gY29uc29sZS5sb2coJ3VwJylcclxufVxyXG5cclxuLy8gdmFyIHVwZGF0ZUNvbnRleHQgPSB0cm90dGxlKG1vcnBoZXIsIDEpXHJcbi8vIHZhciBpbnRcclxudmFyIHRpbWVyID0ge31cclxudmFyIHVwZGF0ZUNvbnRleHQgPSBmdW5jdGlvbihmbiwgZGVsYXkpIHtcclxuXHJcbiAgdmFyIGNvbnRleHQgPSB0aGlzXHJcbiAgdGltZXJbdGhpcy5lbF0gPSB0aW1lclt0aGlzLmVsXSB8fCBudWxsXHJcbiAgY2xlYXJUaW1lb3V0KHRpbWVyW3RoaXMuZWxdKVxyXG4gIHRpbWVyW3RoaXMuZWxdID0gc2V0VGltZW91dChmdW5jdGlvbiAoKSB7XHJcbiAgICBmbi5jYWxsKGNvbnRleHQpXHJcbiAgfSwgZGVsYXkpXHJcbiAgLy8gY29uc29sZS5sb2codGltZXIpXHJcbn1cclxuXHJcbnZhciBuZXh0U3RhdGUgPSBmdW5jdGlvbiAoaSkge1xyXG4gIHZhciBzdGF0ZVxyXG4gIHZhciB2YWx1ZVxyXG4gIGlmIChpIDwgc3RhdGVMaXN0Lmxlbmd0aCkge1xyXG4gICAgc3RhdGUgPSBzdGF0ZUxpc3RbaV1cclxuICAgIHZhbHVlID0gdGhpc1tzdGF0ZV1cclxuXHJcbiAgICAvLyBpZiB2YWx1ZSBpcyB1bmRlZmluZWQsIGxpa2VseSBoYXMgb2JqZWN0IG5vdGF0aW9uIHdlIGNvbnZlcnQgaXQgdG8gYXJyYXlcclxuICAgIGlmICh2YWx1ZSA9PT0gdW5kZWZpbmVkKSB2YWx1ZSA9IHN0ckludGVycHJldGVyKHN0YXRlKVxyXG5cclxuICAgIGlmICh2YWx1ZSAmJiBBcnJheS5pc0FycmF5KHZhbHVlKSkge1xyXG4gICAgICAvLyB1c2luZyBzcGxpdCBvYmplY3Qgbm90YXRpb24gYXMgYmFzZSBmb3Igc3RhdGUgdXBkYXRlXHJcbiAgICAgIC8vIGNvbnNvbGUubG9nKHZhbHVlKVxyXG4gICAgICB2YXIgaW5WYWwgPSB0aGlzW3ZhbHVlWzBdXVt2YWx1ZVsxXV1cclxuICAgICAgT2JqZWN0LmRlZmluZVByb3BlcnR5KHRoaXNbdmFsdWVbMF1dLCB2YWx1ZVsxXSwge1xyXG4gICAgICAgIGVudW1lcmFibGU6IGZhbHNlLFxyXG4gICAgICAgIGNvbmZpZ3VyYWJsZTogdHJ1ZSxcclxuICAgICAgICBnZXQ6IGZ1bmN0aW9uICgpIHtcclxuICAgICAgICAgIHJldHVybiBpblZhbFxyXG4gICAgICAgIH0sXHJcbiAgICAgICAgc2V0OiBmdW5jdGlvbiAodmFsKSB7XHJcbiAgICAgICAgICBpblZhbCA9IHZhbFxyXG4gICAgICAgICAgdXBkYXRlQ29udGV4dC5jYWxsKHRoaXMsIG1vcnBoZXIsIERFTEFZKVxyXG4gICAgICAgIH0uYmluZCh0aGlzKVxyXG4gICAgICB9KVxyXG4gICAgfSBlbHNlIHtcclxuICAgICAgLy8gaGFuZGxlIHBhcmVudCBzdGF0ZSB1cGRhdGUgaWYgdGhlIHN0YXRlIGlzIG5vdCBhbiBvYmplY3RcclxuICAgICAgT2JqZWN0LmRlZmluZVByb3BlcnR5KHRoaXMsIHN0YXRlLCB7XHJcbiAgICAgICAgZW51bWVyYWJsZTogZmFsc2UsXHJcbiAgICAgICAgY29uZmlndXJhYmxlOiB0cnVlLFxyXG4gICAgICAgIGdldDogZnVuY3Rpb24gKCkge1xyXG4gICAgICAgICAgcmV0dXJuIHZhbHVlXHJcbiAgICAgICAgfSxcclxuICAgICAgICBzZXQ6IGZ1bmN0aW9uICh2YWwpIHtcclxuICAgICAgICAgIHZhbHVlID0gdmFsXHJcbiAgICAgICAgICB1cGRhdGVDb250ZXh0LmNhbGwodGhpcywgbW9ycGhlciwgREVMQVkpXHJcbiAgICAgICAgfS5iaW5kKHRoaXMpXHJcbiAgICAgIH0pXHJcbiAgICB9XHJcbiAgICBpKytcclxuICAgIG5leHRTdGF0ZS5jYWxsKHRoaXMsIGkpXHJcbiAgfVxyXG59XHJcblxyXG52YXIgc2V0U3RhdGUgPSBmdW5jdGlvbiAoKSB7XHJcbiAgbmV4dFN0YXRlLmNhbGwodGhpcywgMClcclxufVxyXG5cclxudmFyIHN0YXRlTGlzdCA9IFtdXHJcblxyXG52YXIgY2xlYXJTdGF0ZSA9IGZ1bmN0aW9uICgpIHtcclxuICBzdGF0ZUxpc3QgPSBbXVxyXG59XHJcblxyXG52YXIgYWRkU3RhdGUgPSBmdW5jdGlvbiAoc3RhdGUpIHtcclxuICBpZiAoc3RhdGVMaXN0LmluZGV4T2Yoc3RhdGUpID09PSAtMSkgc3RhdGVMaXN0ID0gc3RhdGVMaXN0LmNvbmNhdChzdGF0ZSlcclxufVxyXG5cclxudmFyIGdlbkVsZW1lbnQgPSBmdW5jdGlvbiAoKSB7XHJcbiAgdGhpcy5iYXNlID0gdGhpcy5fX3ByaXN0aW5lRnJhZ21lbnRfXy5jbG9uZU5vZGUodHJ1ZSlcclxuICB0bXBsSGFuZGxlcih0aGlzLCBhZGRTdGF0ZSlcclxufVxyXG5cclxuZXhwb3J0cy5nZW5FbGVtZW50ID0gZ2VuRWxlbWVudFxyXG5leHBvcnRzLmFkZFN0YXRlID0gYWRkU3RhdGVcclxuZXhwb3J0cy5zZXRTdGF0ZSA9IHNldFN0YXRlXHJcbmV4cG9ydHMuY2xlYXJTdGF0ZSA9IGNsZWFyU3RhdGVcclxuZXhwb3J0cy51cGRhdGVDb250ZXh0ID0gdXBkYXRlQ29udGV4dFxyXG5leHBvcnRzLm1vcnBoZXIgPSBtb3JwaGVyXHJcbiIsInZhciBhc3NlcnQgPSByZXF1aXJlKCcuLi91dGlscycpLmFzc2VydFxyXG52YXIgZ2V0SWQgPSByZXF1aXJlKCcuLi91dGlscycpLmdldElkXHJcbnZhciBjaGVja05vZGVBdmFpbGFiaWxpdHkgPSByZXF1aXJlKCcuLi91dGlscycpLmNoZWNrTm9kZUF2YWlsYWJpbGl0eVxyXG52YXIgZ2VuTW9kZWxUZW1wbGF0ZSA9IHJlcXVpcmUoJy4vZ2VuTW9kZWxUZW1wbGF0ZScpXHJcbi8vIHZhciBtb3JwaCA9IHJlcXVpcmUoJ3NldC1kb20nKVxyXG5cclxudmFyIHJlID0gL3t7KFtee31dKyl9fS9nXHJcblxyXG4vLyBkaWZmaW5nIHR3byBhcnJheSBvZiBvYmplY3RzLCBpbmNsdWRpbmcgb2JqZWN0IHByb3BlcnRpZXMgZGlmZmVyZW5jZXNcclxuZnVuY3Rpb24gZGlmZiAoZnN0LCBzZWMpIHtcclxuICByZXR1cm4gZnN0LmZpbHRlcihmdW5jdGlvbiAob2JqKSB7XHJcbiAgICByZXR1cm4gIXNlYy5zb21lKGZ1bmN0aW9uIChpbnIpIHtcclxuICAgICAgdmFyIHByZWRpY2F0ZSA9IHRydWVcclxuICAgICAgZm9yICh2YXIgYXR0ciBpbiBpbnIpIHtcclxuICAgICAgICBpZiAob2JqW2F0dHJdICE9PSBpbnJbYXR0cl0pIHtcclxuICAgICAgICAgIHByZWRpY2F0ZSA9IGZhbHNlXHJcbiAgICAgICAgfVxyXG4gICAgICB9XHJcbiAgICAgIHJldHVybiBwcmVkaWNhdGVcclxuICAgIH0pXHJcbiAgfSlcclxufVxyXG5cclxuLy8gY2hlY2sgaWYgYnJvd3NlciBzdXBwb3J0IGNyZWF0ZVJhbmdlXHJcbnZhciByYW5nZVxyXG5pZiAodHlwZW9mIGRvY3VtZW50LmNyZWF0ZVJhbmdlID09PSAnZnVuY3Rpb24nKSB7XHJcbiAgcmFuZ2UgPSBkb2N1bWVudC5jcmVhdGVSYW5nZSgpXHJcbn1cclxuXHJcbi8vIHN0b3JhZ2UgZm9yIG1vZGVsIHN0YXRlXHJcbnZhciBjYWNoZSA9IHt9XHJcblxyXG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uIChub2RlLCBtb2RlbCwgdG1wbEhhbmRsZXIpIHtcclxuICBcclxuICB2YXIgbW9kZWxMaXN0XHJcbiAgdmFyIG1MZW5ndGhcclxuICB2YXIgaVxyXG4gIHZhciBsaXN0Q2xvbmVcclxuICB2YXIgcGFyZW50Tm9kZVxyXG4gIHZhciBtXHJcbiAgdmFyIGRvY3VtZW50RnJhZ21lbnRcclxuICB2YXIgdXBkYXRlT2ZOZXdcclxuICB2YXIgZGlmZk9mT2xkXHJcbiAgdmFyIHBOb2RlXHJcbiAgdmFyIHJlZlxyXG4gIHZhciBlcXVhbExlbmd0aFxyXG4gIHZhciBjaGlsZFxyXG4gIHZhciBsaXN0XHJcbiAgdmFyIHN0clxyXG4gIHZhciBvbGRNb2RlbFxyXG4gIHZhciBwXHJcblxyXG4gIC8vIGNvbnNvbGUudHJhY2UoMSlcclxuXHJcbiAgY2FjaGVbbW9kZWxdID0gY2FjaGVbbW9kZWxdIHx8IHt9XHJcblxyXG4gIGlmKCFjYWNoZVttb2RlbF0ubGlzdCl7XHJcbiAgICBjYWNoZVttb2RlbF0ubGlzdCA9IG5vZGUubmV4dFNpYmxpbmcuY2xvbmVOb2RlKHRydWUpXHJcbiAgfVxyXG4gIGxpc3QgPSBjYWNoZVttb2RlbF0ubGlzdFxyXG5cclxuICBpZighY2FjaGVbbW9kZWxdLnN0cil7XHJcbiAgICBjYWNoZVttb2RlbF0uc3RyID0gbm9kZS5uZXh0U2libGluZy5jbG9uZU5vZGUodHJ1ZSkub3V0ZXJIVE1MXHJcbiAgfVxyXG4gIHN0ciA9IGNhY2hlW21vZGVsXS5zdHJcclxuXHJcbiAgaWYoIWNhY2hlW21vZGVsXS5yZWYpe1xyXG4gICAgaWYgKGxpc3QuaGFzQXR0cmlidXRlKCdpZCcpICYmIGxpc3QuaWQubWF0Y2gocmUpKSB7XHJcbiAgICAgIGNhY2hlW21vZGVsXS5yZWYgPSBsaXN0LmlkLnJlcGxhY2UocmUsICckMScpXHJcbiAgICAgIC8vIHJlbW92ZSB0aGUgZmlyc3QgcHJvdG90eXBlIG5vZGVcclxuICAgICAgbm9kZS5uZXh0U2libGluZy5yZW1vdmUoKVxyXG4gICAgICAvLyBhbHNvIHJlbW92ZSBmcm9tIHByaXN0aW5lIG5vZGVcclxuICAgICAgcCA9IHRoaXMuX19wcmlzdGluZUZyYWdtZW50X18uZ2V0RWxlbWVudEJ5SWQobGlzdC5pZClcclxuICAgICAgaWYocCkgcC5yZW1vdmUoKVxyXG4gICAgfVxyXG4gIH1cclxuICByZWYgPSBjYWNoZVttb2RlbF0ucmVmXHJcbiAgXHJcbiAgaWYgKHRoaXNbbW9kZWxdICE9PSB1bmRlZmluZWQgJiYgdGhpc1ttb2RlbF0uaGFzT3duUHJvcGVydHkoJ2xpc3QnKSkge1xyXG5cclxuICAgIHBhcmVudE5vZGUgPSBub2RlLnBhcmVudE5vZGVcclxuXHJcbiAgICBpZiAocmFuZ2UgJiYgIXBhcmVudE5vZGUuaGFzQXR0cmlidXRlKCdkYXRhLWlnbm9yZScpKSB7XHJcbiAgICAgIHBhcmVudE5vZGUuc2V0QXR0cmlidXRlKCdkYXRhLWlnbm9yZScsICcnKVxyXG4gICAgfVxyXG5cclxuICAgIG1vZGVsTGlzdCA9IHRoaXNbbW9kZWxdLmxpc3RcclxuXHJcbiAgICBvbGRNb2RlbCA9IGNhY2hlW21vZGVsXS5vbGRNb2RlbCB8fCBbXVxyXG5cclxuICAgIC8vIGNoZWNrIGlmIGN1cnJlbnQgYnJvd3NlciBkb2Vzbid0IHN1cHBvcnQgY3JlYXRlUmFuZ2UoKVxyXG4gICAgaWYgKCFyYW5nZSkge1xyXG4gICAgICBpID0gMFxyXG4gICAgICB3aGlsZSAoaSA8IG1MZW5ndGgpIHtcclxuICAgICAgICAvLyBmYWxsYmFjayB0byByZWd1bGFyIG5vZGUgZ2VuZXJhdGlvbiBoYW5kbGVyXHJcbiAgICAgICAgbGlzdENsb25lID0gbGlzdC5jbG9uZU5vZGUodHJ1ZSlcclxuICAgICAgICB0bXBsSGFuZGxlcih0aGlzLCBudWxsLCBsaXN0Q2xvbmUsIG1vZGVsTGlzdFtpXSlcclxuICAgICAgICBpKytcclxuICAgICAgfVxyXG4gICAgfSBlbHNlIHtcclxuICAgICAgdXBkYXRlT2ZOZXcgPSBkaWZmKG1vZGVsTGlzdCwgb2xkTW9kZWwpXHJcbiAgICAgIGRpZmZPZk9sZCA9IGRpZmYob2xkTW9kZWwsIG1vZGVsTGlzdClcclxuICAgICAgLy8gY29uc29sZS5sb2codXBkYXRlT2ZOZXcpXHJcbiAgICAgIGZ1bmN0aW9uIGRpZmZNb2RlbCgpIHtcclxuICAgICAgICBwTm9kZSA9W10ucG9wLmNhbGwoYXJndW1lbnRzKVxyXG4gICAgICAgIC8vIGNoZWNrIGlmIGJvdGggbW9kZWxzIGFyZSBlcXVhbGx5IGluIGxlbmd0aFxyXG4gICAgICAgIGVxdWFsTGVuZ3RoID0gb2xkTW9kZWwubGVuZ3RoID09PSBtb2RlbExpc3QubGVuZ3RoXHJcblxyXG4gICAgICAgIC8vIGRvIHByb3BlcnRpZXMgdXBkYXRlXHJcbiAgICAgICAgaWYgKGVxdWFsTGVuZ3RoKSB7XHJcbiAgICAgICAgICB1cGRhdGVPZk5ldy5tYXAoZnVuY3Rpb24gKG9iaikge1xyXG4gICAgICAgICAgICBjaGlsZCA9IHBOb2RlLnF1ZXJ5U2VsZWN0b3IoJ1tpZD1cIicgKyBvYmpbcmVmXSArICdcIl0nKVxyXG4gICAgICAgICAgICBtID0gZ2VuTW9kZWxUZW1wbGF0ZShzdHIsIG9iailcclxuICAgICAgICAgICAgZG9jdW1lbnRGcmFnbWVudCA9IHJhbmdlLmNyZWF0ZUNvbnRleHR1YWxGcmFnbWVudChtKVxyXG4gICAgICAgICAgICAvLyBtb3JwaChjaGlsZCwgZG9jdW1lbnRGcmFnbWVudC5maXJzdENoaWxkKVxyXG4gICAgICAgICAgICBwTm9kZS5yZXBsYWNlQ2hpbGQoZG9jdW1lbnRGcmFnbWVudCwgY2hpbGQpXHJcbiAgICAgICAgICB9KVxyXG4gICAgICAgIC8vIGFkZCBuZXcgb2JqZWN0c1xyXG4gICAgICAgIH0gZWxzZSBpZiAodXBkYXRlT2ZOZXcubGVuZ3RoID4gMCAmJiBkaWZmT2ZPbGQubGVuZ3RoID09PSAwKSB7XHJcbiAgICAgICAgICB1cGRhdGVPZk5ldy5tYXAoZnVuY3Rpb24gKG9iaikge1xyXG4gICAgICAgICAgICBtID0gZ2VuTW9kZWxUZW1wbGF0ZShzdHIsIG9iailcclxuICAgICAgICAgICAgZG9jdW1lbnRGcmFnbWVudCA9IHJhbmdlLmNyZWF0ZUNvbnRleHR1YWxGcmFnbWVudChtKVxyXG4gICAgICAgICAgICBwTm9kZS5pbnNlcnRCZWZvcmUoZG9jdW1lbnRGcmFnbWVudCwgcE5vZGUubGFzdENoaWxkKVxyXG4gICAgICAgICAgfSlcclxuICAgICAgICAvLyBkZXN0cm95IHNlbGVjdGVkIG9iamVjdHNcclxuICAgICAgICB9IGVsc2UgaWYgKHVwZGF0ZU9mTmV3Lmxlbmd0aCA9PT0gMCAmJiBkaWZmT2ZPbGQubGVuZ3RoID4gMCkge1xyXG4gICAgICAgICAgZGlmZk9mT2xkLm1hcChmdW5jdGlvbiAob2JqKSB7XHJcbiAgICAgICAgICAgIGNoaWxkID0gcE5vZGUucXVlcnlTZWxlY3RvcignW2lkPVwiJyArIG9ialtyZWZdICsgJ1wiXScpXHJcbiAgICAgICAgICAgIHBOb2RlLnJlbW92ZUNoaWxkKGNoaWxkKVxyXG4gICAgICAgICAgfSlcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIC8vIHJlcGxhY2Ugb2xkTW9kZWwgYWZ0ZXIgZGlmZmluZ1xyXG4gICAgICAgIGNhY2hlW21vZGVsXS5vbGRNb2RlbCA9IEpTT04ucGFyc2UoSlNPTi5zdHJpbmdpZnkobW9kZWxMaXN0KSlcclxuICAgICAgfVxyXG5cclxuICAgICAgLy8gY2hlY2sgZXhpc3RpbmcgcGFyZW50Tm9kZSBpbiB0aGUgRE9NXHJcbiAgICAgIGlmIChwYXJlbnROb2RlLmhhc0F0dHJpYnV0ZSgnaWQnKSkge1xyXG4gICAgICAgIHBOb2RlID0gZ2V0SWQocGFyZW50Tm9kZS5pZClcclxuICAgICAgICAvLyBjb25zb2xlLmxvZyhwTm9kZSlcclxuICAgICAgICBpZihwTm9kZSl7XHJcbiAgICAgICAgICBkaWZmTW9kZWwuY2FsbCh0aGlzLCBudWxsLCBudWxsLCBwTm9kZSlcclxuICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgY2hlY2tOb2RlQXZhaWxhYmlsaXR5KHsgZWw6IHBhcmVudE5vZGUuaWQgfSwgbW9kZWwsIGRpZmZNb2RlbC5iaW5kKHRoaXMpKVxyXG4gICAgICAgIH1cclxuICAgICAgfVxyXG4gICAgICBcclxuICAgIH1cclxuICB9IGVsc2Uge1xyXG4gICAgYXNzZXJ0KGZhbHNlLCAnTW9kZWwgXCInICsgbW9kZWwgKyAnXCIgZG9lcyBub3QgZXhpc3QuJylcclxuICB9XHJcbn1cclxuIiwidmFyIHRlcm5hcnlPcHMgPSByZXF1aXJlKCcuL3Rlcm5hcnlPcHMnKVxyXG52YXIgcmUgPSBuZXcgUmVnRXhwKC8oXFxzY2hlY2tlZD1cIikoLio/KSg/PVwiKS9nKVxyXG52YXIgdG1wbCA9ICcnXHJcblxyXG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uIChzdHJpbmcsIG9iaikge1xyXG4gIHZhciBhcnJQcm9wcyA9IHN0cmluZy5tYXRjaCgve3soW157fV0rKX19L2cpXHJcbiAgdmFyIHJlcFxyXG4gIHZhciBpc1Rlcm5hcnlcclxuICB0bXBsID0gc3RyaW5nXHJcbiAgZm9yICh2YXIgaSA9IDAsIGxlbiA9IGFyclByb3BzLmxlbmd0aDsgaSA8IGxlbjsgaSsrKSB7XHJcbiAgICByZXAgPSBhcnJQcm9wc1tpXS5yZXBsYWNlKC97eyhbXnt9XSspfX0vZywgJyQxJylcclxuICAgIGlzVGVybmFyeSA9IHRlcm5hcnlPcHMuY2FsbChvYmosIHJlcClcclxuICAgIGlmIChpc1Rlcm5hcnkpIHtcclxuICAgICAgdG1wbCA9IHRtcGwucmVwbGFjZSgne3snICsgcmVwICsgJ319JywgaXNUZXJuYXJ5LnZhbHVlKVxyXG4gICAgfSBlbHNlIHtcclxuICAgICAgdG1wbCA9IHRtcGwucmVwbGFjZSgne3snICsgcmVwICsgJ319Jywgb2JqW3JlcF0pXHJcbiAgICB9XHJcblxyXG4gICAgdmFyIG1hdGNoID0gdG1wbC5tYXRjaChyZSlcclxuICAgIGlmIChtYXRjaCkge1xyXG4gICAgICBpZiAobWF0Y2hbMF0ubGVuZ3RoID09PSAxNykgeyB0bXBsID0gdG1wbC5yZXBsYWNlKCcgY2hlY2tlZD1cImNoZWNrZWRcIicsICcgY2hlY2tlZCcpIH0gZWxzZSB7IHRtcGwgPSB0bXBsLnJlcGxhY2UoJyBjaGVja2VkPVwiXCInLCAnJykgfVxyXG4gICAgfVxyXG4gIH1cclxuICByZXR1cm4gdG1wbFxyXG59XHJcbiIsInZhciBzZXRTdGF0ZSA9IHJlcXVpcmUoJy4vZ2VuRWxlbWVudCcpLnNldFN0YXRlXHJcbnZhciB0bXBsSGFuZGxlciA9IHJlcXVpcmUoJy4vdG1wbEhhbmRsZXInKVxyXG52YXIgZ2V0SWQgPSByZXF1aXJlKCcuLi91dGlscycpLmdldElkXHJcbnZhciBhZGRTdGF0ZSA9IHJlcXVpcmUoJy4vZ2VuRWxlbWVudCcpLmFkZFN0YXRlXHJcbnZhciBhc3NlcnQgPSByZXF1aXJlKCcuLi91dGlscycpLmFzc2VydFxyXG5cclxudmFyIERPQ1VNRU5UX0VMRU1FTlRfVFlQRSA9IDFcclxuXHJcbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24gKHN0dWIpIHtcclxuICB0bXBsSGFuZGxlcih0aGlzLCBhZGRTdGF0ZSlcclxuICB2YXIgZWwgPSBzdHViIHx8IGdldElkKHRoaXMuZWwpXHJcbiAgaWYgKGVsKSB7XHJcbiAgICBpZihlbC5ub2RlVHlwZSA9PT0gRE9DVU1FTlRfRUxFTUVOVF9UWVBFKVxyXG4gICAgICBlbC5zZXRBdHRyaWJ1dGUoJ2RhdGEtaWdub3JlJywgJycpXHJcbiAgICBlbHNlIGlmKGVsLmhhc0NoaWxkTm9kZXMoKSAmJiBlbC5maXJzdENoaWxkLm5vZGVUeXBlID09PSBET0NVTUVOVF9FTEVNRU5UX1RZUEUpe1xyXG4gICAgICBlbC5maXJzdENoaWxkc2V0QXR0cmlidXRlKCdkYXRhLWlnbm9yZScsICcnKVxyXG4gICAgICBhc3NlcnQoZWwuY2hpbGROb2Rlcy5sZW5ndGggIT09IDEsICdTdWItY29tcG9uZW50IHNob3VsZCBvbmx5IGhhcyBhIHNpbmdsZSByb290Tm9kZS4nKVxyXG4gICAgfVxyXG4gICAgLy8gbGlzdGVuIHRvIHN0YXRlIGNoYW5nZXNcclxuICAgIHNldFN0YXRlLmNhbGwodGhpcylcclxuICAgIC8vIG1vdW50IGZyYWdtZW50IHRvIERPTVxyXG4gICAgZWwuYXBwZW5kQ2hpbGQodGhpcy5iYXNlKVxyXG4gICAgLy8gc2luY2UgY29tcG9uZW50IGFscmVhZHkgcmVuZGVyZWQsIHRyaWdnZXIgaXRzIGxpZmUtY3ljbGUgbWV0aG9kXHJcbiAgICBpZiAodGhpcy5jb21wb25lbnREaWRNb3VudCAmJiB0eXBlb2YgdGhpcy5jb21wb25lbnREaWRNb3VudCA9PT0gJ2Z1bmN0aW9uJykge1xyXG4gICAgICB0aGlzLmNvbXBvbmVudERpZE1vdW50KClcclxuICAgIH1cclxuICB9IGVsc2Uge1xyXG4gICAgYXNzZXJ0KGZhbHNlLCAnTm8gZWxlbWVudCB3aXRoIGlkOiBcIicgKyB0aGlzLmVsICsgJ1wiIGV4aXN0LicpXHJcbiAgfVxyXG59XHJcbiIsIm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24gKHN0cikge1xyXG4gIHZhciByZXMgPSBzdHIubWF0Y2goL1xcLipcXC4vZylcclxuICB2YXIgcmVzdWx0XHJcbiAgaWYgKHJlcyAmJiByZXMubGVuZ3RoID4gMCkge1xyXG4gICAgcmV0dXJuIHN0ci5zcGxpdCgnLicpXHJcbiAgfVxyXG4gIHJldHVybiByZXN1bHRcclxufVxyXG4iLCIvLyBmdW5jdGlvbiB0byByZXNvbHZlIHRlcm5hcnkgb3BlcmF0aW9uXHJcblxyXG5mdW5jdGlvbiB0ZXN0IChzdHIpIHtcclxuICBpZiAoc3RyID09PSAnXFwnXFwnJyB8fCBzdHIgPT09ICdcIlwiJyB8fCBzdHIgPT09ICdudWxsJykgeyByZXR1cm4gJycgfVxyXG4gIHJldHVybiBzdHJcclxufVxyXG5cclxubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbiAoaW5wdXQpIHtcclxuICBpZiAoaW5wdXQubWF0Y2goLyhbXj9dKilcXD8oW146XSopOihbXjtdKil8KFxccyo9XFxzKilbXjtdKi9nKSkge1xyXG4gICAgdmFyIHQgPSBpbnB1dC5zcGxpdCgnPycpXHJcbiAgICB2YXIgY29uZGl0aW9uID0gdFswXVxyXG4gICAgdmFyIGxlZnRIYW5kID0gdFsxXS5zcGxpdCgnOicpWzBdXHJcbiAgICB2YXIgcmlnaHRIYW5kID0gdFsxXS5zcGxpdCgnOicpWzFdXHJcblxyXG4gICAgLy8gY2hlY2sgdGhlIGNvbmRpdGlvbiBmdWxmaWxsbWVudFxyXG4gICAgLy8gY29uc29sZS5sb2codGhpcylcclxuICAgIGlmICh0aGlzW2NvbmRpdGlvbl0pIHtcclxuICAgICAgcmV0dXJuIHtcclxuICAgICAgICB2YWx1ZTogdGVzdChsZWZ0SGFuZCksXHJcbiAgICAgICAgc3RhdGU6IGNvbmRpdGlvblxyXG4gICAgICB9XHJcbiAgICB9IGVsc2Uge1xyXG4gICAgICByZXR1cm4ge1xyXG4gICAgICAgIHZhbHVlOiB0ZXN0KHJpZ2h0SGFuZCksXHJcbiAgICAgICAgc3RhdGU6IGNvbmRpdGlvblxyXG4gICAgICB9XHJcbiAgICB9XHJcbiAgfSBlbHNlIHJldHVybiBmYWxzZVxyXG59XHJcbiIsInZhciBzdHJJbnRlcnByZXRlciA9IHJlcXVpcmUoJy4vc3RySW50ZXJwcmV0ZXInKVxyXG52YXIgdGVybmFyeU9wcyA9IHJlcXVpcmUoJy4vdGVybmFyeU9wcycpXHJcbnZhciBnZXRJZCA9IHJlcXVpcmUoJy4uL3V0aWxzJykuZ2V0SWRcclxudmFyIGdlbk1vZGVsTGlzdCA9IHJlcXVpcmUoJy4vZ2VuTW9kZWxMaXN0JylcclxudmFyIGNvbmRpdGlvbmFsTm9kZXMgPSByZXF1aXJlKCcuL2NvbmRpdGlvbmFsTm9kZXMnKVxyXG52YXIgY29tcG9uZW50UGFyc2UgPSByZXF1aXJlKCcuL2NvbXBvbmVudFBhcnNlJylcclxuXHJcbi8vIHZhciBET0NVTUVOVF9GUkFHTUVOVF9UWVBFID0gMTFcclxuLy8gdmFyIERPQ1VNRU5UX1RFWFRfVFlQRSA9IDNcclxudmFyIERPQ1VNRU5UX0VMRU1FTlRfVFlQRSA9IDFcclxuLy8gdmFyIERPQ1VNRU5UX0NPTU1FTlRfVFlQRSA9IDhcclxuLy8gdmFyIERPQ1VNRU5UX0FUVFJJQlVURV9UWVBFID0gMlxyXG5cclxudmFyIHJlID0gL3t7KFtee31dKyl9fS9nXHJcblxyXG52YXIgbW9kZWwgPSAvXm1vZGVsOi9nXHJcbnZhciBtb2RlbFJhdyA9IC9cXHtcXHttb2RlbDooW157fV0rKVxcfVxcfS9nXHJcblxyXG52YXIgY29uZGl0aW9uYWxSZSA9IC9eXFw/L2dcclxuXHJcbnZhciBjb21wb25lbnQgPSAvXmNvbXBvbmVudDooW157fV0rKS9nXHJcblxyXG52YXIgdG1wbGhhbmRsZXIgPSBmdW5jdGlvbiAoY3R4LCB1cGRhdGVTdGF0ZUxpc3QsIG1vZGVsSW5zdGFuY2UsIG1vZGVsT2JqZWN0LCBjb25kaXRpb25hbCkge1xyXG4gIHdpbmRvdy50aW1lID0gbmV3IERhdGUoKVxyXG4gIHZhciBjdXJyZW50Tm9kZVxyXG4gIHZhciBsblxyXG4gIHZhciBwcm9wc1xyXG4gIHZhciByZXBcclxuICB2YXIgZnJhZ21lbnRcclxuICB2YXIgaW5zdGFuY2VcclxuICB2YXIgbm9kZUF0dHJpYnV0ZXNcclxuICB2YXIgaSA9IDBcclxuICB2YXIgYVxyXG4gIHZhciBuc1xyXG4gIHZhciBldnROYW1lXHJcbiAgdmFyIGNcclxuICB2YXIgaFxyXG4gIHZhciBoYW5kbGVyQXJnc1xyXG4gIHZhciBhcmd2XHJcbiAgdmFyIGhhbmRsZXJcclxuICB2YXIgdG5yXHJcbiAgdmFyIG1vZGVsUmVwXHJcbiAgdmFyIGNvbmRpdGlvbmFsUmVwXHJcbiAgdmFyIGZuXHJcbiAgdmFyIHJlbSA9IFtdXHJcbiAgdmFyIGlzT2JqZWN0Tm90YXRpb25cclxuICB2YXIgbmFtZVxyXG4gIHZhciBwXHJcbiAgdmFyIHZhbHVlXHJcblxyXG4gIGlmIChtb2RlbE9iamVjdCkge1xyXG4gICAgaW5zdGFuY2UgPSBtb2RlbEluc3RhbmNlXHJcbiAgfSBlbHNlIGlmIChjb25kaXRpb25hbCkge1xyXG4gICAgaW5zdGFuY2UgPSBjb25kaXRpb25hbC5maXJzdENoaWxkXHJcbiAgfSBlbHNlIHtcclxuICAgIGZyYWdtZW50ID0gY3R4LmJhc2VcclxuICAgIGluc3RhbmNlID0gZnJhZ21lbnQuZmlyc3RDaGlsZFxyXG4gIH1cclxuXHJcbiAgdmFyIGlucyA9IG1vZGVsT2JqZWN0IHx8IGN0eFxyXG5cclxuICBmdW5jdGlvbiB1cGRhdGVTdGF0ZSAoc3RhdGUpIHtcclxuICAgIGlmICh0eXBlb2YgdXBkYXRlU3RhdGVMaXN0ID09PSAnZnVuY3Rpb24nKSB7XHJcbiAgICAgIHVwZGF0ZVN0YXRlTGlzdChzdGF0ZSlcclxuICAgIH1cclxuICB9XHJcblxyXG4gIGZ1bmN0aW9uIHZhbEFzc2lnbiAobm9kZSwgdmFsdWUsIHJlcGxhY2UsIHdpdGhUbykge1xyXG4gICAgdmFsdWUgPSB2YWx1ZS5yZXBsYWNlKHJlcGxhY2UsIHdpdGhUbylcclxuICAgIGlmKG5vZGUpIG5vZGUubm9kZVZhbHVlID0gdmFsdWVcclxuICB9XHJcblxyXG4gIGZ1bmN0aW9uIHJlcGxhY2VIYW5kbGVCYXJzICh2YWx1ZSwgbm9kZSkge1xyXG4gICAgcHJvcHMgPSB2YWx1ZS5tYXRjaChyZSlcclxuICAgIGxuID0gcHJvcHMubGVuZ3RoXHJcbiAgICB3aGlsZSAobG4pIHtcclxuICAgICAgbG4tLVxyXG4gICAgICByZXAgPSBwcm9wc1tsbl0ucmVwbGFjZShyZSwgJyQxJylcclxuICAgICAgdG5yID0gdGVybmFyeU9wcy5jYWxsKGlucywgcmVwKVxyXG4gICAgICBpc09iamVjdE5vdGF0aW9uID0gc3RySW50ZXJwcmV0ZXIocmVwKVxyXG4gICAgICBpZiAoaXNPYmplY3ROb3RhdGlvbikge1xyXG4gICAgICAgIHVwZGF0ZVN0YXRlKHJlcClcclxuICAgICAgICB2YWxBc3NpZ24obm9kZSwgdmFsdWUsICd7eycgKyByZXAgKyAnfX0nLCBpbnNbaXNPYmplY3ROb3RhdGlvblswXV1baXNPYmplY3ROb3RhdGlvblsxXV0pXHJcbiAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgaWYgKHRucikge1xyXG4gICAgICAgICAgdXBkYXRlU3RhdGUodG5yLnN0YXRlKVxyXG4gICAgICAgICAgdmFsQXNzaWduKG5vZGUsIHZhbHVlLCAne3snICsgcmVwICsgJ319JywgdG5yLnZhbHVlKVxyXG4gICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICBpZiAocmVwLm1hdGNoKG1vZGVsKSkge1xyXG4gICAgICAgICAgICBtb2RlbFJlcCA9IHJlcC5yZXBsYWNlKCdtb2RlbDonLCAnJylcclxuICAgICAgICAgICAgLy8gZ2VuZXJhdGUgbGlzdCBtb2RlbFxyXG4gICAgICAgICAgICBnZW5Nb2RlbExpc3QuY2FsbChjdHgsIG5vZGUsIG1vZGVsUmVwLCB0bXBsaGFuZGxlcilcclxuICAgICAgICAgIH0gZWxzZSBpZiAocmVwLm1hdGNoKGNvbmRpdGlvbmFsUmUpKSB7XHJcbiAgICAgICAgICAgIC8vIGNvbnNvbGUubG9nKG5vZGUpXHJcbiAgICAgICAgICAgIGNvbmRpdGlvbmFsUmVwID0gcmVwLnJlcGxhY2UoJz8nLCAnJylcclxuICAgICAgICAgICAgaWYgKGluc1tjb25kaXRpb25hbFJlcF0gIT09IHVuZGVmaW5lZCkge1xyXG4gICAgICAgICAgICAgIHVwZGF0ZVN0YXRlKGNvbmRpdGlvbmFsUmVwKVxyXG4gICAgICAgICAgICAgIGNvbmRpdGlvbmFsTm9kZXMuY2FsbChjdHgsIG5vZGUsIGNvbmRpdGlvbmFsUmVwLCB0bXBsaGFuZGxlcilcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgfSBlbHNlIGlmIChyZXAubWF0Y2goY29tcG9uZW50KSkge1xyXG4gICAgICAgICAgICBjb21wb25lbnRQYXJzZS5jYWxsKGN0eCwgcmVwLCBub2RlKVxyXG4gICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgaWYgKGluc1tyZXBdICE9PSB1bmRlZmluZWQpIHtcclxuICAgICAgICAgICAgICB1cGRhdGVTdGF0ZShyZXApXHJcbiAgICAgICAgICAgICAgdmFsQXNzaWduKG5vZGUsIHZhbHVlLCAne3snICsgcmVwICsgJ319JywgaW5zW3JlcF0pXHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgIH1cclxuICAgICAgICB9XHJcbiAgICAgIH1cclxuICAgIH1cclxuICB9XHJcblxyXG4gIGZ1bmN0aW9uIGluc3BlY3RBdHRyaWJ1dGVzIChub2RlKSB7XHJcbiAgICBub2RlQXR0cmlidXRlcyA9IG5vZGUuYXR0cmlidXRlc1xyXG4gICAgZm9yIChpID0gbm9kZUF0dHJpYnV0ZXMubGVuZ3RoOyBpLS07KSB7XHJcbiAgICAgIGEgPSBub2RlQXR0cmlidXRlc1tpXVxyXG4gICAgICBuYW1lID0gYS5sb2NhbE5hbWVcclxuICAgICAgbnMgPSBhLm5vZGVWYWx1ZVxyXG4gICAgICBpZiAocmUudGVzdChuYW1lKSkge1xyXG4gICAgICAgIG5vZGUucmVtb3ZlQXR0cmlidXRlKG5hbWUpXHJcbiAgICAgICAgbmFtZSA9IHJlcGxhY2VIYW5kbGVCYXJzKG5hbWUpXHJcbiAgICAgICAgbm9kZS5zZXRBdHRyaWJ1dGUobmFtZSwgbnMpXHJcbiAgICAgIH0gZWxzZSBpZiAocmUudGVzdChucykpIHtcclxuICAgICAgICBucyA9IHJlcGxhY2VIYW5kbGVCYXJzKG5zKVxyXG4gICAgICAgIGlmIChucyA9PT0gJycpIHtcclxuICAgICAgICAgIG5vZGUucmVtb3ZlQXR0cmlidXRlKG5hbWUpXHJcbiAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgIGlmIChuYW1lID09PSAnY2hlY2tlZCcpIHtcclxuICAgICAgICAgICAgbm9kZS5zZXRBdHRyaWJ1dGUobmFtZSwgJycpXHJcbiAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICBub2RlLnNldEF0dHJpYnV0ZShuYW1lLCBucylcclxuICAgICAgICAgIH1cclxuICAgICAgICB9XHJcbiAgICAgIH1cclxuICAgIH1cclxuICB9XHJcblxyXG4gIGZ1bmN0aW9uIGxvb2tVcEV2dE5vZGUgKG5vZGUpIHtcclxuICAgIC8vIGNoZWNrIGlmIG5vZGUgaXMgdmlzaWJsZSBvbiBET00gYW5kIGhhcyBhdHRyaWJ1dGUgZXZ0LW5vZGVcclxuICAgIGlmIChub2RlLmhhc0F0dHJpYnV0ZSgnaWQnKSAmJiBnZXRJZChub2RlLmlkKSAmJiBub2RlLmhhc0F0dHJpYnV0ZSgnZXZ0LW5vZGUnKSkge1xyXG4gICAgICByZXR1cm4gdHJ1ZVxyXG4gICAgfVxyXG4gICAgcmV0dXJuIGZhbHNlXHJcbiAgfVxyXG5cclxuICBmdW5jdGlvbiBhZGRFdmVudCAobm9kZSkge1xyXG4gICAgbm9kZUF0dHJpYnV0ZXMgPSBub2RlLmF0dHJpYnV0ZXNcclxuXHJcbiAgICBpZiAobG9va1VwRXZ0Tm9kZShub2RlKSkge1xyXG4gICAgICAvLyBjb25zb2xlLmxvZyhub2RlKVxyXG4gICAgICAvLyBza2lwIGFkZGRpbmcgZXZlbnQgZm9yIG5vZGUgdGhhdCBhbHJlYWR5IGhhcyBldmVudFxyXG4gICAgICAvLyB0byBhbGxvdyBza2lwcGluZyBhZGRpbmcgZXZlbnQgdGhlIG5vZGUgbXVzdCBpbmNsdWRlIGBpZGAvXHJcbiAgICB9IGVsc2Uge1xyXG4gICAgICAvLyBvbmx5IGFkZCBldmVudCB3aGVuIG5vZGUgZG9lcyBub3QgaGFzIG9uZVxyXG4gICAgICBmb3IgKGkgPSBub2RlQXR0cmlidXRlcy5sZW5ndGg7IGktLTspIHtcclxuICAgICAgICBhID0gbm9kZUF0dHJpYnV0ZXNbaV1cclxuICAgICAgICBuYW1lID0gYS5sb2NhbE5hbWVcclxuICAgICAgICBucyA9IGEubm9kZVZhbHVlXHJcbiAgICAgICAgaWYgKC9eay0vLnRlc3QobmFtZSkpIHtcclxuICAgICAgICAgIGV2dE5hbWUgPSBuYW1lLnJlcGxhY2UoL15rLS8sICcnKVxyXG4gICAgICAgICAgaGFuZGxlciA9IG5zLm1hdGNoKC9bYS16QS1aXSsoPyFbXihdKlxcKSkvKVswXVxyXG4gICAgICAgICAgYyA9IGN0eFtoYW5kbGVyXVxyXG4gICAgICAgICAgaWYgKGMgIT09IHVuZGVmaW5lZCAmJiB0eXBlb2YgYyA9PT0gJ2Z1bmN0aW9uJykge1xyXG4gICAgICAgICAgICBoID0gbnMubWF0Y2goL1xcKChbXnt9XSspXFwpLylcclxuICAgICAgICAgICAgaGFuZGxlckFyZ3MgPSBoID8gaFsxXSA6ICcnXHJcbiAgICAgICAgICAgIGFyZ3YgPSBoYW5kbGVyQXJncy5zcGxpdCgnLCcpLmZpbHRlcihmdW5jdGlvbiAoZikge1xyXG4gICAgICAgICAgICAgIHJldHVybiBmICE9PSAnJ1xyXG4gICAgICAgICAgICB9KVxyXG4gICAgICAgICAgICByZW0ucHVzaChuYW1lKVxyXG4gICAgICAgICAgICBmbiA9IGZ1bmN0aW9uIChlKSB7XHJcbiAgICAgICAgICAgICAgZS5zdG9wUHJvcGFnYXRpb24oKVxyXG4gICAgICAgICAgICAgIGlmIChlLnRhcmdldCAhPT0gZS5jdXJyZW50VGFyZ2V0KSB7XHJcbiAgICAgICAgICAgICAgICBjLmFwcGx5KGN0eCwgW2UudGFyZ2V0LCBlXSlcclxuICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgLy8gaWYgbm9kZSBpcyB0aGUgcm9vdE5vZGUgZm9yIG1vZGVsLCB3ZSB3cmFwIHRoZSBldmVudExpc3RlbmVyIGFuZFxyXG4gICAgICAgICAgICAvLyByZWJ1aWxkIHRoZSBhcmd1bWVudHMgYnkgYXBwZW5kaW5nIGlkL2NsYXNzTmFtZSB1dGlsIHJvb3ROb2RlLlxyXG4gICAgICAgICAgICBpZiAobm9kZS5oYXNDaGlsZE5vZGVzKCkgJiYgbm9kZS5maXJzdENoaWxkLm5vZGVUeXBlICE9PSBET0NVTUVOVF9FTEVNRU5UX1RZUEUgJiYgbm9kZS5maXJzdENoaWxkLm5vZGVWYWx1ZS5tYXRjaChtb2RlbFJhdykpIHtcclxuICAgICAgICAgICAgICAvLyBjb25zb2xlLmxvZyhub2RlKVxyXG4gICAgICAgICAgICAgIG5vZGUuYWRkRXZlbnRMaXN0ZW5lcihldnROYW1lLCBmbiwgZmFsc2UpXHJcbiAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgbm9kZS5hZGRFdmVudExpc3RlbmVyKGV2dE5hbWUsIGMuYmluZC5hcHBseShjLmJpbmQoY3R4KSwgW25vZGVdLmNvbmNhdChhcmd2KSksIGZhbHNlKVxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIG5vZGUuc2V0QXR0cmlidXRlKCdldnQtbm9kZScsICcnKVxyXG4gICAgICAgICAgICBpZiAobm9kZS5oYXNBdHRyaWJ1dGUoJ2lkJykpIHtcclxuICAgICAgICAgICAgICBwID0gY3R4Ll9fcHJpc3RpbmVGcmFnbWVudF9fLmdldEVsZW1lbnRCeUlkKG5vZGUuaWQpXHJcbiAgICAgICAgICAgICAgaWYgKCFwLmhhc0F0dHJpYnV0ZSgnZXZ0LW5vZGUnKSkge1xyXG4gICAgICAgICAgICAgICAgcC5zZXRBdHRyaWJ1dGUoJ2V2dC1ub2RlJywgJycpXHJcbiAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIC8vIGNvbnNvbGUubG9nKG5vZGUpXHJcbiAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG4gICAgICB9XHJcbiAgICB9XHJcbiAgfVxyXG5cclxuICBmdW5jdGlvbiBjaGVjayAobm9kZSkge1xyXG4gICAgcGFyc2U6IHdoaWxlIChub2RlKSB7XHJcbiAgICAgIGN1cnJlbnROb2RlID0gbm9kZVxyXG4gICAgICBpZiAoY3VycmVudE5vZGUubm9kZVR5cGUgPT09IERPQ1VNRU5UX0VMRU1FTlRfVFlQRSkge1xyXG4gICAgICAgIGlmIChjdXJyZW50Tm9kZS5oYXNBdHRyaWJ1dGVzKCkpIHtcclxuICAgICAgICAgIGFkZEV2ZW50KGN1cnJlbnROb2RlKVxyXG4gICAgICAgICAgaW5zcGVjdEF0dHJpYnV0ZXMoY3VycmVudE5vZGUpXHJcbiAgICAgICAgfVxyXG4gICAgICAgIGNoZWNrKGN1cnJlbnROb2RlLmZpcnN0Q2hpbGQpXHJcbiAgICAgIH0gZWxzZSBpZiAoY3VycmVudE5vZGUubm9kZVZhbHVlLm1hdGNoKHJlKSkge1xyXG4gICAgICAgIHZhbHVlID0gY3VycmVudE5vZGUubm9kZVZhbHVlXHJcbiAgICAgICAgcHJvcHMgPSB2YWx1ZS5tYXRjaChyZSlcclxuICAgICAgICBsbiA9IHByb3BzLmxlbmd0aFxyXG4gICAgICAgIHdoaWxlIChsbikge1xyXG4gICAgICAgICAgbG4tLVxyXG4gICAgICAgICAgcmVwID0gcHJvcHNbbG5dLnJlcGxhY2UocmUsICckMScpXHJcbiAgICAgICAgICB0bnIgPSB0ZXJuYXJ5T3BzLmNhbGwoaW5zLCByZXApXHJcbiAgICAgICAgICBpc09iamVjdE5vdGF0aW9uID0gc3RySW50ZXJwcmV0ZXIocmVwKVxyXG4gICAgICAgICAgaWYgKGlzT2JqZWN0Tm90YXRpb24pIHtcclxuICAgICAgICAgICAgdXBkYXRlU3RhdGUocmVwKVxyXG4gICAgICAgICAgICB2YWxBc3NpZ24obm9kZSwgdmFsdWUsICd7eycgKyByZXAgKyAnfX0nLCBpbnNbaXNPYmplY3ROb3RhdGlvblswXV1baXNPYmplY3ROb3RhdGlvblsxXV0pXHJcbiAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICBpZiAodG5yKSB7XHJcbiAgICAgICAgICAgICAgdXBkYXRlU3RhdGUodG5yLnN0YXRlKVxyXG4gICAgICAgICAgICAgIHZhbEFzc2lnbihub2RlLCB2YWx1ZSwgJ3t7JyArIHJlcCArICd9fScsIHRuci52YWx1ZSlcclxuICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICBpZiAocmVwLm1hdGNoKG1vZGVsKSkge1xyXG4gICAgICAgICAgICAgICAgbW9kZWxSZXAgPSByZXAucmVwbGFjZSgnbW9kZWw6JywgJycpXHJcbiAgICAgICAgICAgICAgICAvLyBnZW5lcmF0ZSBsaXN0IG1vZGVsXHJcbiAgICAgICAgICAgICAgICBnZW5Nb2RlbExpc3QuY2FsbChjdHgsIG5vZGUsIG1vZGVsUmVwLCB0bXBsaGFuZGxlcilcclxuICAgICAgICAgICAgICAgIC8vIG5vZGUgPSBub2RlLm5leHRTaWJsaW5nLm5leHRTaWJsaW5nIFxyXG4gICAgICAgICAgICAgICAgLy8gY29uc29sZS5sb2coY3VycmVudE5vZGUubmV4dFNpYmxpbmcpXHJcbiAgICAgICAgICAgICAgICAvLyBjb250aW51ZSBwYXJzZVxyXG4gICAgICAgICAgICAgIH0gZWxzZSBpZiAocmVwLm1hdGNoKGNvbmRpdGlvbmFsUmUpKSB7XHJcbiAgICAgICAgICAgICAgICAvLyBjb25zb2xlLmxvZyhub2RlKVxyXG4gICAgICAgICAgICAgICAgY29uZGl0aW9uYWxSZXAgPSByZXAucmVwbGFjZSgnPycsICcnKVxyXG4gICAgICAgICAgICAgICAgaWYgKGluc1tjb25kaXRpb25hbFJlcF0gIT09IHVuZGVmaW5lZCkge1xyXG4gICAgICAgICAgICAgICAgICB1cGRhdGVTdGF0ZShjb25kaXRpb25hbFJlcClcclxuICAgICAgICAgICAgICAgICAgY29uZGl0aW9uYWxOb2Rlcy5jYWxsKGN0eCwgbm9kZSwgY29uZGl0aW9uYWxSZXAsIHRtcGxoYW5kbGVyKVxyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgIH0gZWxzZSBpZiAocmVwLm1hdGNoKGNvbXBvbmVudCkpIHtcclxuICAgICAgICAgICAgICAgIGNvbXBvbmVudFBhcnNlLmNhbGwoY3R4LCByZXAsIG5vZGUpXHJcbiAgICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgIGlmIChpbnNbcmVwXSAhPT0gdW5kZWZpbmVkKSB7XHJcbiAgICAgICAgICAgICAgICAgIHVwZGF0ZVN0YXRlKHJlcClcclxuICAgICAgICAgICAgICAgICAgdmFsQXNzaWduKG5vZGUsIHZhbHVlLCAne3snICsgcmVwICsgJ319JywgaW5zW3JlcF0pXHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG4gICAgICB9XHJcbiAgICAgIG5vZGUgPSBub2RlLm5leHRTaWJsaW5nXHJcbiAgICB9XHJcbiAgfVxyXG5cclxuICBjaGVjayhpbnN0YW5jZSlcclxufVxyXG5cclxubW9kdWxlLmV4cG9ydHMgPSB0bXBsaGFuZGxlclxyXG4iLCIndXNlIHN0cmljdCdcclxuLyoqXHJcbiAqIEtlZXRqcyB2NC4wLjAgQWxwaGEgcmVsZWFzZTogaHR0cHM6Ly9naXRodWIuY29tL2tlZXRqcy9rZWV0LmpzXHJcbiAqIE1pbmltYWxpc3QgdmlldyBsYXllciBmb3IgdGhlIHdlYlxyXG4gKlxyXG4gKiA8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDwgS2VldGpzID4+Pj4+Pj4+Pj4+Pj4+Pj4+Pj4+Pj4+Pj4+Pj4+PlxyXG4gKlxyXG4gKiBDb3B5cmlnaHQgMjAxOCwgU2hhaHJ1bCBOaXphbSBTZWxhbWF0XHJcbiAqIFJlbGVhc2VkIHVuZGVyIHRoZSBNSVQgTGljZW5zZS5cclxuICovXHJcblxyXG52YXIgcGFyc2VTdHIgPSByZXF1aXJlKCcuL2NvbXBvbmVudHMvcGFyc2VTdHInKVxyXG52YXIgdXBkYXRlQ29udGV4dCA9IHJlcXVpcmUoJy4vY29tcG9uZW50cy9nZW5FbGVtZW50JykudXBkYXRlQ29udGV4dFxyXG52YXIgbW9ycGhlciA9IHJlcXVpcmUoJy4vY29tcG9uZW50cy9nZW5FbGVtZW50JykubW9ycGhlclxyXG52YXIgY2xlYXJTdGF0ZSA9IHJlcXVpcmUoJy4vY29tcG9uZW50cy9nZW5FbGVtZW50JykuY2xlYXJTdGF0ZVxyXG52YXIgZ2V0SWQgPSByZXF1aXJlKCcuL3V0aWxzJykuZ2V0SWRcclxudmFyIGFzc2VydCA9IHJlcXVpcmUoJy4vdXRpbHMnKS5hc3NlcnRcclxuXHJcbnZhciBET0NVTUVOVF9GUkFHTUVOVF9UWVBFID0gMTFcclxudmFyIERPQ1VNRU5UX1RFWFRfVFlQRSA9IDNcclxudmFyIERPQ1VNRU5UX0VMRU1FTlRfVFlQRSA9IDFcclxuXHJcbi8qKlxyXG4gKiBAZGVzY3JpcHRpb25cclxuICogVGhlIG1haW4gY29uc3RydWN0b3Igb2YgS2VldFxyXG4gKlxyXG4gKiBCYXNpYyBVc2FnZSA6LVxyXG4gKlxyXG4gKiAgICBjb25zdCBBcHAgZXh0ZW5kcyBLZWV0IHt9XHJcbiAqICAgIGNvbnN0IGFwcCA9IG5ldyBBcHAoKVxyXG4gKiAgICBhcHAubW91bnQoJ2hlbGxvIHdvcmxkJykubGluaygnYXBwJylcclxuICpcclxuICovXHJcbmZ1bmN0aW9uIEtlZXQgKCkge1xyXG4gIHRoaXMub25DaGFuZ2VzID0gW11cclxufVxyXG5cclxuS2VldC5wcm90b3R5cGUubW91bnQgPSBmdW5jdGlvbiAoaW5zdGFuY2UpIHtcclxuICB2YXIgYmFzZVxyXG4gIHZhciB0ZW1wRGl2XHJcbiAgdmFyIGZyYWcgPSBkb2N1bWVudC5jcmVhdGVEb2N1bWVudEZyYWdtZW50KClcclxuICAvLyBCZWZvcmUgd2UgYmVnaW4gdG8gcGFyc2UgYW4gaW5zdGFuY2UsIGRvIGEgcnVuLWRvd24gY2hlY2tzXHJcbiAgLy8gdG8gY2xlYW4gdXAgYmFjay10aWNrIHN0cmluZyB3aGljaCB1c3VhbGx5IGhhcyBsaW5lIHNwYWNpbmcuXHJcbiAgaWYgKHR5cGVvZiBpbnN0YW5jZSA9PT0gJ3N0cmluZycpIHtcclxuICAgIGJhc2UgPSBpbnN0YW5jZS50cmltKCkucmVwbGFjZSgvXFxzKy9nLCAnICcpXHJcbiAgICB0ZW1wRGl2ID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnZGl2JylcclxuICAgIHRlbXBEaXYuaW5uZXJIVE1MID0gYmFzZVxyXG4gICAgd2hpbGUgKHRlbXBEaXYuZmlyc3RDaGlsZCkge1xyXG4gICAgICBmcmFnLmFwcGVuZENoaWxkKHRlbXBEaXYuZmlyc3RDaGlsZClcclxuICAgIH1cclxuICAvLyBJZiBpbnN0YW5jZSBpcyBhIGh0bWwgZWxlbWVudCBwcm9jZXNzIGFzIGh0bWwgZW50aXRpZXNcclxuICB9IGVsc2UgaWYgKHR5cGVvZiBpbnN0YW5jZSA9PT0gJ29iamVjdCcgJiYgaW5zdGFuY2VbJ25vZGVUeXBlJ10pIHtcclxuICAgIGlmIChpbnN0YW5jZVsnbm9kZVR5cGUnXSA9PT0gRE9DVU1FTlRfRUxFTUVOVF9UWVBFKSB7XHJcbiAgICAgIGZyYWcuYXBwZW5kQ2hpbGQoaW5zdGFuY2UpXHJcbiAgICB9IGVsc2UgaWYgKGluc3RhbmNlWydub2RlVHlwZSddID09PSBET0NVTUVOVF9GUkFHTUVOVF9UWVBFKSB7XHJcbiAgICAgIGZyYWcgPSBpbnN0YW5jZVxyXG4gICAgfSBlbHNlIGlmIChpbnN0YW5jZVsnbm9kZVR5cGUnXSA9PT0gRE9DVU1FTlRfVEVYVF9UWVBFKSB7XHJcbiAgICAgIGZyYWcuYXBwZW5kQ2hpbGQoaW5zdGFuY2UpXHJcbiAgICB9IGVsc2Uge1xyXG4gICAgICBhc3NlcnQoZmFsc2UsICdVbmFibGUgdG8gcGFyc2UgaW5zdGFuY2UsIHVua25vd24gdHlwZS4nKVxyXG4gICAgfVxyXG4gIH0gZWxzZSB7XHJcbiAgICBhc3NlcnQoZmFsc2UsICdQYXJhbWV0ZXIgaXMgbm90IGEgc3RyaW5nIG9yIGEgaHRtbCBlbGVtZW50LicpXHJcbiAgfVxyXG4gIC8vIHdlIHN0b3JlIHRoZSBwcmlzdGluZSBpbnN0YW5jZSBpbiBfX3ByaXN0aW5lRnJhZ21lbnRfX1xyXG4gIHRoaXMuX19wcmlzdGluZUZyYWdtZW50X18gPSBmcmFnLmNsb25lTm9kZSh0cnVlKVxyXG4gIHRoaXMuYmFzZSA9IGZyYWdcclxuXHJcbiAgLy8gY2xlYW51cCBzdGF0ZXMgb24gbW91bnRcclxuICBjbGVhclN0YXRlKClcclxuXHJcbiAgcmV0dXJuIHRoaXNcclxufVxyXG5cclxuS2VldC5wcm90b3R5cGUuZmx1c2ggPSBmdW5jdGlvbiAoaW5zdGFuY2UpIHtcclxuICAvLyBDdXN0b20gbWV0aG9kIHRvIGNsZWFuIHVwIHRoZSBjb21wb25lbnQgRE9NIHRyZWVcclxuICAvLyB1c2VmdWwgaWYgd2UgbmVlZCB0byBkbyBjbGVhbiB1cCByZXJlbmRlci5cclxuICB2YXIgZWwgPSBpbnN0YW5jZSB8fCB0aGlzLmVsXHJcbiAgdmFyIGVsZSA9IGdldElkKGVsKVxyXG4gIGlmIChlbGUpIGVsZS5pbm5lckhUTUwgPSAnJ1xyXG4gIHJldHVybiB0aGlzXHJcbn1cclxuXHJcbktlZXQucHJvdG90eXBlLmxpbmsgPSBmdW5jdGlvbiAoaWQpIHtcclxuICAvLyBUaGUgdGFyZ2V0IERPTSB3aGVyZSB0aGUgcmVuZGVyaW5nIHdpbGwgdG9vayBwbGFjZS5cclxuICBpZiAoIWlkKSBhc3NlcnQoaWQsICdObyBpZCBpcyBnaXZlbiBhcyBwYXJhbWV0ZXIuJylcclxuICB0aGlzLmVsID0gaWRcclxuICB0aGlzLnJlbmRlcigpXHJcbiAgcmV0dXJuIHRoaXNcclxufVxyXG5cclxuS2VldC5wcm90b3R5cGUucmVuZGVyID0gZnVuY3Rpb24gKHN0dWIpIHtcclxuICAvLyBsaWZlLWN5Y2xlIG1ldGhvZCBiZWZvcmUgcmVuZGVyaW5nIHRoZSBjb21wb25lbnRcclxuICBpZiAodGhpcy5jb21wb25lbnRXaWxsTW91bnQgJiYgdHlwZW9mIHRoaXMuY29tcG9uZW50V2lsbE1vdW50ID09PSAnZnVuY3Rpb24nKSB7XHJcbiAgICB0aGlzLmNvbXBvbmVudFdpbGxNb3VudCgpXHJcbiAgfVxyXG5cclxuICAvLyBSZW5kZXIgdGhpcyBjb21wb25lbnQgdG8gdGhlIHRhcmdldCBET01cclxuICBpZihzdHViKXtcclxuICAgIHRoaXMuSVNfU1RVQiA9IHRydWVcclxuICB9XHJcbiAgcmV0dXJuIHBhcnNlU3RyLmNhbGwodGhpcywgc3R1YilcclxufVxyXG5cclxuS2VldC5wcm90b3R5cGUuY2x1c3RlciA9IGZ1bmN0aW9uICgpIHtcclxuICAvLyBDaGFpbiBtZXRob2QgdG8gcnVuIGV4dGVybmFsIGZ1bmN0aW9uKHMpLCB0aGlzIGJhc2ljYWxseSBzZXJ2ZVxyXG4gIC8vIGFzIGFuIGluaXRpYWxpemVyIGZvciBhbGwgbm9uIGF0dGFjaGVkIGNoaWxkIGNvbXBvbmVudHMgd2l0aGluIHRoZSBpbnN0YW5jZSB0cmVlXHJcbiAgdmFyIGFyZ3MgPSBbXS5zbGljZS5jYWxsKGFyZ3VtZW50cylcclxuICBpZiAoYXJncy5sZW5ndGggPiAwKSB7XHJcbiAgICBhcmdzLm1hcChmdW5jdGlvbiAoZikge1xyXG4gICAgICBpZiAodHlwZW9mIGYgPT09ICdmdW5jdGlvbicpIGYoKVxyXG4gICAgfSlcclxuICB9XHJcbn1cclxuXHJcbktlZXQucHJvdG90eXBlLmNhbGxCYXRjaFBvb2xVcGRhdGUgPSBmdW5jdGlvbiAoKSB7XHJcbiAgLy8gZm9yY2UgY29tcG9uZW50IHRvIHVwZGF0ZSwgaWYgYW55IHN0YXRlIC8gbm9uLXN0YXRlXHJcbiAgLy8gdmFsdWUgY2hhbmdlZCBET00gZGlmZmluZyB3aWxsIG9jY3VyXHJcbiAgdXBkYXRlQ29udGV4dC5jYWxsKHRoaXMsIG1vcnBoZXIsIDEpXHJcbn1cclxuXHJcbktlZXQucHJvdG90eXBlLnN1YnNjcmliZSA9IGZ1bmN0aW9uKGZuKSB7XHJcbiAgdGhpcy5vbkNoYW5nZXMucHVzaChmbilcclxufVxyXG5cclxuS2VldC5wcm90b3R5cGUuaW5mb3JtID0gZnVuY3Rpb24gKG1vZGVsKSB7XHJcbiAgZm9yICh2YXIgaSA9IHRoaXMub25DaGFuZ2VzLmxlbmd0aDsgaS0tOykge1xyXG4gICAgdGhpcy5vbkNoYW5nZXNbaV0obW9kZWwpXHJcbiAgfVxyXG59XHJcblxyXG5tb2R1bGUuZXhwb3J0cyA9IEtlZXRcclxuIiwiJ3VzZSBzdHJpY3QnXG5cbnNldERPTS5LRVkgPSAnZGF0YS1rZXknXG5zZXRET00uSUdOT1JFID0gJ2RhdGEtaWdub3JlJ1xuc2V0RE9NLkNIRUNLU1VNID0gJ2RhdGEtY2hlY2tzdW0nXG52YXIgcGFyc2VIVE1MID0gcmVxdWlyZSgnLi9wYXJzZS1odG1sJylcbnZhciBLRVlfUFJFRklYID0gJ19zZXQtZG9tLSdcbnZhciBOT0RFX01PVU5URUQgPSBLRVlfUFJFRklYICsgJ21vdW50ZWQnXG52YXIgRUxFTUVOVF9UWVBFID0gMVxudmFyIERPQ1VNRU5UX1RZUEUgPSA5XG52YXIgRE9DVU1FTlRfRlJBR01FTlRfVFlQRSA9IDExXG5cbi8vIEV4cG9zZSBhcGkuXG5tb2R1bGUuZXhwb3J0cyA9IHNldERPTVxuXG4vKipcbiAqIEBkZXNjcmlwdGlvblxuICogVXBkYXRlcyBleGlzdGluZyBkb20gdG8gbWF0Y2ggYSBuZXcgZG9tLlxuICpcbiAqIEBwYXJhbSB7Tm9kZX0gb2xkTm9kZSAtIFRoZSBodG1sIGVudGl0eSB0byB1cGRhdGUuXG4gKiBAcGFyYW0ge1N0cmluZ3xOb2RlfSBuZXdOb2RlIC0gVGhlIHVwZGF0ZWQgaHRtbChlbnRpdHkpLlxuICovXG5mdW5jdGlvbiBzZXRET00gKG9sZE5vZGUsIG5ld05vZGUpIHtcbiAgLy8gRW5zdXJlIGEgcmVhbGlzaCBkb20gbm9kZSBpcyBwcm92aWRlZC5cbiAgYXNzZXJ0KG9sZE5vZGUgJiYgb2xkTm9kZS5ub2RlVHlwZSwgJ1lvdSBtdXN0IHByb3ZpZGUgYSB2YWxpZCBub2RlIHRvIHVwZGF0ZS4nKVxuXG4gIC8vIEFsaWFzIGRvY3VtZW50IGVsZW1lbnQgd2l0aCBkb2N1bWVudC5cbiAgaWYgKG9sZE5vZGUubm9kZVR5cGUgPT09IERPQ1VNRU5UX1RZUEUpIG9sZE5vZGUgPSBvbGROb2RlLmRvY3VtZW50RWxlbWVudFxuXG4gIC8vIERvY3VtZW50IEZyYWdtZW50cyBkb24ndCBoYXZlIGF0dHJpYnV0ZXMsIHNvIG5vIG5lZWQgdG8gbG9vayBhdCBjaGVja3N1bXMsIGlnbm9yZWQsIGF0dHJpYnV0ZXMsIG9yIG5vZGUgcmVwbGFjZW1lbnQuXG4gIGlmIChuZXdOb2RlLm5vZGVUeXBlID09PSBET0NVTUVOVF9GUkFHTUVOVF9UWVBFKSB7XG4gICAgLy8gU2ltcGx5IHVwZGF0ZSBhbGwgY2hpbGRyZW4gKGFuZCBzdWJjaGlsZHJlbikuXG4gICAgc2V0Q2hpbGROb2RlcyhvbGROb2RlLCBuZXdOb2RlKVxuICB9IGVsc2Uge1xuICAgIC8vIE90aGVyd2lzZSB3ZSBkaWZmIHRoZSBlbnRpcmUgb2xkIG5vZGUuXG4gICAgc2V0Tm9kZShvbGROb2RlLCB0eXBlb2YgbmV3Tm9kZSA9PT0gJ3N0cmluZydcbiAgICAgIC8vIElmIGEgc3RyaW5nIHdhcyBwcm92aWRlZCB3ZSB3aWxsIHBhcnNlIGl0IGFzIGRvbS5cbiAgICAgID8gcGFyc2VIVE1MKG5ld05vZGUsIG9sZE5vZGUubm9kZU5hbWUpXG4gICAgICA6IG5ld05vZGVcbiAgICApXG4gIH1cblxuICAvLyBUcmlnZ2VyIG1vdW50IGV2ZW50cyBvbiBpbml0aWFsIHNldC5cbiAgaWYgKCFvbGROb2RlW05PREVfTU9VTlRFRF0pIHtcbiAgICBvbGROb2RlW05PREVfTU9VTlRFRF0gPSB0cnVlXG4gICAgbW91bnQob2xkTm9kZSlcbiAgfVxufVxuXG4vKipcbiAqIEBwcml2YXRlXG4gKiBAZGVzY3JpcHRpb25cbiAqIFVwZGF0ZXMgYSBzcGVjaWZpYyBodG1sTm9kZSBhbmQgZG9lcyB3aGF0ZXZlciBpdCB0YWtlcyB0byBjb252ZXJ0IGl0IHRvIGFub3RoZXIgb25lLlxuICpcbiAqIEBwYXJhbSB7Tm9kZX0gb2xkTm9kZSAtIFRoZSBwcmV2aW91cyBIVE1MTm9kZS5cbiAqIEBwYXJhbSB7Tm9kZX0gbmV3Tm9kZSAtIFRoZSB1cGRhdGVkIEhUTUxOb2RlLlxuICovXG5mdW5jdGlvbiBzZXROb2RlIChvbGROb2RlLCBuZXdOb2RlKSB7XG4gIGlmIChvbGROb2RlLm5vZGVUeXBlID09PSBuZXdOb2RlLm5vZGVUeXBlKSB7XG4gICAgLy8gSGFuZGxlIHJlZ3VsYXIgZWxlbWVudCBub2RlIHVwZGF0ZXMuXG4gICAgaWYgKG9sZE5vZGUubm9kZVR5cGUgPT09IEVMRU1FTlRfVFlQRSkge1xuICAgICAgLy8gQ2hlY2tzIGlmIG5vZGVzIGFyZSBlcXVhbCBiZWZvcmUgZGlmZmluZy5cbiAgICAgIGlmIChpc0VxdWFsTm9kZShvbGROb2RlLCBuZXdOb2RlKSkgcmV0dXJuXG5cbiAgICAgIC8vIFVwZGF0ZSBhbGwgY2hpbGRyZW4gKGFuZCBzdWJjaGlsZHJlbikuXG4gICAgICBzZXRDaGlsZE5vZGVzKG9sZE5vZGUsIG5ld05vZGUpXG5cbiAgICAgIC8vIFVwZGF0ZSB0aGUgZWxlbWVudHMgYXR0cmlidXRlcyAvIHRhZ05hbWUuXG4gICAgICBpZiAob2xkTm9kZS5ub2RlTmFtZSA9PT0gbmV3Tm9kZS5ub2RlTmFtZSkge1xuICAgICAgICAvLyBJZiB3ZSBoYXZlIHRoZSBzYW1lIG5vZGVuYW1lIHRoZW4gd2UgY2FuIGRpcmVjdGx5IHVwZGF0ZSB0aGUgYXR0cmlidXRlcy5cbiAgICAgICAgc2V0QXR0cmlidXRlcyhvbGROb2RlLmF0dHJpYnV0ZXMsIG5ld05vZGUuYXR0cmlidXRlcylcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIC8vIE90aGVyd2lzZSBjbG9uZSB0aGUgbmV3IG5vZGUgdG8gdXNlIGFzIHRoZSBleGlzdGluZyBub2RlLlxuICAgICAgICB2YXIgbmV3UHJldiA9IG5ld05vZGUuY2xvbmVOb2RlKClcbiAgICAgICAgLy8gQ29weSBvdmVyIGFsbCBleGlzdGluZyBjaGlsZHJlbiBmcm9tIHRoZSBvcmlnaW5hbCBub2RlLlxuICAgICAgICB3aGlsZSAob2xkTm9kZS5maXJzdENoaWxkKSBuZXdQcmV2LmFwcGVuZENoaWxkKG9sZE5vZGUuZmlyc3RDaGlsZClcbiAgICAgICAgLy8gUmVwbGFjZSB0aGUgb3JpZ2luYWwgbm9kZSB3aXRoIHRoZSBuZXcgb25lIHdpdGggdGhlIHJpZ2h0IHRhZy5cbiAgICAgICAgb2xkTm9kZS5wYXJlbnROb2RlLnJlcGxhY2VDaGlsZChuZXdQcmV2LCBvbGROb2RlKVxuICAgICAgfVxuICAgIH0gZWxzZSB7XG4gICAgICAvLyBIYW5kbGUgb3RoZXIgdHlwZXMgb2Ygbm9kZSB1cGRhdGVzICh0ZXh0L2NvbW1lbnRzL2V0YykuXG4gICAgICAvLyBJZiBib3RoIGFyZSB0aGUgc2FtZSB0eXBlIG9mIG5vZGUgd2UgY2FuIHVwZGF0ZSBkaXJlY3RseS5cbiAgICAgIGlmIChvbGROb2RlLm5vZGVWYWx1ZSAhPT0gbmV3Tm9kZS5ub2RlVmFsdWUpIHtcbiAgICAgICAgb2xkTm9kZS5ub2RlVmFsdWUgPSBuZXdOb2RlLm5vZGVWYWx1ZVxuICAgICAgfVxuICAgIH1cbiAgfSBlbHNlIHtcbiAgICAvLyB3ZSBoYXZlIHRvIHJlcGxhY2UgdGhlIG5vZGUuXG4gICAgb2xkTm9kZS5wYXJlbnROb2RlLnJlcGxhY2VDaGlsZChuZXdOb2RlLCBkaXNtb3VudChvbGROb2RlKSlcbiAgICBtb3VudChuZXdOb2RlKVxuICB9XG59XG5cbi8qKlxuICogQHByaXZhdGVcbiAqIEBkZXNjcmlwdGlvblxuICogVXRpbGl0eSB0aGF0IHdpbGwgdXBkYXRlIG9uZSBsaXN0IG9mIGF0dHJpYnV0ZXMgdG8gbWF0Y2ggYW5vdGhlci5cbiAqXG4gKiBAcGFyYW0ge05hbWVkTm9kZU1hcH0gb2xkQXR0cmlidXRlcyAtIFRoZSBwcmV2aW91cyBhdHRyaWJ1dGVzLlxuICogQHBhcmFtIHtOYW1lZE5vZGVNYXB9IG5ld0F0dHJpYnV0ZXMgLSBUaGUgdXBkYXRlZCBhdHRyaWJ1dGVzLlxuICovXG5mdW5jdGlvbiBzZXRBdHRyaWJ1dGVzIChvbGRBdHRyaWJ1dGVzLCBuZXdBdHRyaWJ1dGVzKSB7XG4gIHZhciBpLCBhLCBiLCBucywgbmFtZVxuXG4gIC8vIFJlbW92ZSBvbGQgYXR0cmlidXRlcy5cbiAgZm9yIChpID0gb2xkQXR0cmlidXRlcy5sZW5ndGg7IGktLTspIHtcbiAgICBhID0gb2xkQXR0cmlidXRlc1tpXVxuICAgIG5zID0gYS5uYW1lc3BhY2VVUklcbiAgICBuYW1lID0gYS5sb2NhbE5hbWVcbiAgICBiID0gbmV3QXR0cmlidXRlcy5nZXROYW1lZEl0ZW1OUyhucywgbmFtZSlcbiAgICBpZiAoIWIpIG9sZEF0dHJpYnV0ZXMucmVtb3ZlTmFtZWRJdGVtTlMobnMsIG5hbWUpXG4gIH1cblxuICAvLyBTZXQgbmV3IGF0dHJpYnV0ZXMuXG4gIGZvciAoaSA9IG5ld0F0dHJpYnV0ZXMubGVuZ3RoOyBpLS07KSB7XG4gICAgYSA9IG5ld0F0dHJpYnV0ZXNbaV1cbiAgICBucyA9IGEubmFtZXNwYWNlVVJJXG4gICAgbmFtZSA9IGEubG9jYWxOYW1lXG4gICAgYiA9IG9sZEF0dHJpYnV0ZXMuZ2V0TmFtZWRJdGVtTlMobnMsIG5hbWUpXG4gICAgaWYgKCFiKSB7XG4gICAgICAvLyBBZGQgYSBuZXcgYXR0cmlidXRlLlxuICAgICAgbmV3QXR0cmlidXRlcy5yZW1vdmVOYW1lZEl0ZW1OUyhucywgbmFtZSlcbiAgICAgIG9sZEF0dHJpYnV0ZXMuc2V0TmFtZWRJdGVtTlMoYSlcbiAgICB9IGVsc2UgaWYgKGIudmFsdWUgIT09IGEudmFsdWUpIHtcbiAgICAgIC8vIFVwZGF0ZSBleGlzdGluZyBhdHRyaWJ1dGUuXG4gICAgICBiLnZhbHVlID0gYS52YWx1ZVxuICAgIH1cbiAgfVxufVxuXG4vKipcbiAqIEBwcml2YXRlXG4gKiBAZGVzY3JpcHRpb25cbiAqIFV0aWxpdHkgdGhhdCB3aWxsIG5vZGVzIGNoaWxkZXJuIHRvIG1hdGNoIGFub3RoZXIgbm9kZXMgY2hpbGRyZW4uXG4gKlxuICogQHBhcmFtIHtOb2RlfSBvbGRQYXJlbnQgLSBUaGUgZXhpc3RpbmcgcGFyZW50IG5vZGUuXG4gKiBAcGFyYW0ge05vZGV9IG5ld1BhcmVudCAtIFRoZSBuZXcgcGFyZW50IG5vZGUuXG4gKi9cbmZ1bmN0aW9uIHNldENoaWxkTm9kZXMgKG9sZFBhcmVudCwgbmV3UGFyZW50KSB7XG4gIHZhciBjaGVja09sZCwgb2xkS2V5LCBjaGVja05ldywgbmV3S2V5LCBmb3VuZE5vZGUsIGtleWVkTm9kZXNcbiAgdmFyIG9sZE5vZGUgPSBvbGRQYXJlbnQuZmlyc3RDaGlsZFxuICB2YXIgbmV3Tm9kZSA9IG5ld1BhcmVudC5maXJzdENoaWxkXG4gIHZhciBleHRyYSA9IDBcblxuICAvLyBFeHRyYWN0IGtleWVkIG5vZGVzIGZyb20gcHJldmlvdXMgY2hpbGRyZW4gYW5kIGtlZXAgdHJhY2sgb2YgdG90YWwgY291bnQuXG4gIHdoaWxlIChvbGROb2RlKSB7XG4gICAgZXh0cmErK1xuICAgIGNoZWNrT2xkID0gb2xkTm9kZVxuICAgIG9sZEtleSA9IGdldEtleShjaGVja09sZClcbiAgICBvbGROb2RlID0gb2xkTm9kZS5uZXh0U2libGluZ1xuXG4gICAgaWYgKG9sZEtleSkge1xuICAgICAgaWYgKCFrZXllZE5vZGVzKSBrZXllZE5vZGVzID0ge31cbiAgICAgIGtleWVkTm9kZXNbb2xkS2V5XSA9IGNoZWNrT2xkXG4gICAgfVxuICB9XG5cbiAgLy8gTG9vcCBvdmVyIG5ldyBub2RlcyBhbmQgcGVyZm9ybSB1cGRhdGVzLlxuICBvbGROb2RlID0gb2xkUGFyZW50LmZpcnN0Q2hpbGRcbiAgd2hpbGUgKG5ld05vZGUpIHtcbiAgICBleHRyYS0tXG4gICAgY2hlY2tOZXcgPSBuZXdOb2RlXG4gICAgbmV3Tm9kZSA9IG5ld05vZGUubmV4dFNpYmxpbmdcblxuICAgIGlmIChrZXllZE5vZGVzICYmIChuZXdLZXkgPSBnZXRLZXkoY2hlY2tOZXcpKSAmJiAoZm91bmROb2RlID0ga2V5ZWROb2Rlc1tuZXdLZXldKSkge1xuICAgICAgZGVsZXRlIGtleWVkTm9kZXNbbmV3S2V5XVxuICAgICAgLy8gSWYgd2UgaGF2ZSBhIGtleSBhbmQgaXQgZXhpc3RlZCBiZWZvcmUgd2UgbW92ZSB0aGUgcHJldmlvdXMgbm9kZSB0byB0aGUgbmV3IHBvc2l0aW9uIGlmIG5lZWRlZCBhbmQgZGlmZiBpdC5cbiAgICAgIGlmIChmb3VuZE5vZGUgIT09IG9sZE5vZGUpIHtcbiAgICAgICAgb2xkUGFyZW50Lmluc2VydEJlZm9yZShmb3VuZE5vZGUsIG9sZE5vZGUpXG4gICAgICB9IGVsc2Uge1xuICAgICAgICBvbGROb2RlID0gb2xkTm9kZS5uZXh0U2libGluZ1xuICAgICAgfVxuXG4gICAgICBzZXROb2RlKGZvdW5kTm9kZSwgY2hlY2tOZXcpXG4gICAgfSBlbHNlIGlmIChvbGROb2RlKSB7XG4gICAgICBjaGVja09sZCA9IG9sZE5vZGVcbiAgICAgIG9sZE5vZGUgPSBvbGROb2RlLm5leHRTaWJsaW5nXG4gICAgICBpZiAoZ2V0S2V5KGNoZWNrT2xkKSkge1xuICAgICAgICAvLyBJZiB0aGUgb2xkIGNoaWxkIGhhZCBhIGtleSB3ZSBza2lwIG92ZXIgaXQgdW50aWwgdGhlIGVuZC5cbiAgICAgICAgb2xkUGFyZW50Lmluc2VydEJlZm9yZShjaGVja05ldywgY2hlY2tPbGQpXG4gICAgICAgIG1vdW50KGNoZWNrTmV3KVxuICAgICAgfSBlbHNlIHtcbiAgICAgICAgLy8gT3RoZXJ3aXNlIHdlIGRpZmYgdGhlIHR3byBub24ta2V5ZWQgbm9kZXMuXG4gICAgICAgIHNldE5vZGUoY2hlY2tPbGQsIGNoZWNrTmV3KVxuICAgICAgfVxuICAgIH0gZWxzZSB7XG4gICAgICAvLyBGaW5hbGx5IGlmIHRoZXJlIHdhcyBubyBvbGQgbm9kZSB3ZSBhZGQgdGhlIG5ldyBub2RlLlxuICAgICAgb2xkUGFyZW50LmFwcGVuZENoaWxkKGNoZWNrTmV3KVxuICAgICAgbW91bnQoY2hlY2tOZXcpXG4gICAgfVxuICB9XG5cbiAgLy8gUmVtb3ZlIG9sZCBrZXllZCBub2Rlcy5cbiAgZm9yIChvbGRLZXkgaW4ga2V5ZWROb2Rlcykge1xuICAgIGV4dHJhLS1cbiAgICBvbGRQYXJlbnQucmVtb3ZlQ2hpbGQoZGlzbW91bnQoa2V5ZWROb2Rlc1tvbGRLZXldKSlcbiAgfVxuXG4gIC8vIElmIHdlIGhhdmUgYW55IHJlbWFpbmluZyB1bmtleWVkIG5vZGVzIHJlbW92ZSB0aGVtIGZyb20gdGhlIGVuZC5cbiAgd2hpbGUgKC0tZXh0cmEgPj0gMCkge1xuICAgIG9sZFBhcmVudC5yZW1vdmVDaGlsZChkaXNtb3VudChvbGRQYXJlbnQubGFzdENoaWxkKSlcbiAgfVxufVxuXG4vKipcbiAqIEBwcml2YXRlXG4gKiBAZGVzY3JpcHRpb25cbiAqIFV0aWxpdHkgdG8gdHJ5IHRvIHB1bGwgYSBrZXkgb3V0IG9mIGFuIGVsZW1lbnQuXG4gKiBVc2VzICdkYXRhLWtleScgaWYgcG9zc2libGUgYW5kIGZhbGxzIGJhY2sgdG8gJ2lkJy5cbiAqXG4gKiBAcGFyYW0ge05vZGV9IG5vZGUgLSBUaGUgbm9kZSB0byBnZXQgdGhlIGtleSBmb3IuXG4gKiBAcmV0dXJuIHtzdHJpbmd8dm9pZH1cbiAqL1xuZnVuY3Rpb24gZ2V0S2V5IChub2RlKSB7XG4gIGlmIChub2RlLm5vZGVUeXBlICE9PSBFTEVNRU5UX1RZUEUpIHJldHVyblxuICB2YXIga2V5ID0gbm9kZS5nZXRBdHRyaWJ1dGUoc2V0RE9NLktFWSkgfHwgbm9kZS5pZFxuICBpZiAoa2V5KSByZXR1cm4gS0VZX1BSRUZJWCArIGtleVxufVxuXG4vKipcbiAqIENoZWNrcyBpZiBub2RlcyBhcmUgZXF1YWwgdXNpbmcgdGhlIGZvbGxvd2luZyBieSBjaGVja2luZyBpZlxuICogdGhleSBhcmUgYm90aCBpZ25vcmVkLCBoYXZlIHRoZSBzYW1lIGNoZWNrc3VtLCBvciBoYXZlIHRoZVxuICogc2FtZSBjb250ZW50cy5cbiAqXG4gKiBAcGFyYW0ge05vZGV9IGEgLSBPbmUgb2YgdGhlIG5vZGVzIHRvIGNvbXBhcmUuXG4gKiBAcGFyYW0ge05vZGV9IGIgLSBBbm90aGVyIG5vZGUgdG8gY29tcGFyZS5cbiAqL1xuZnVuY3Rpb24gaXNFcXVhbE5vZGUgKGEsIGIpIHtcbiAgcmV0dXJuIChcbiAgICAvLyBDaGVjayBpZiBib3RoIG5vZGVzIGFyZSBpZ25vcmVkLlxuICAgIChpc0lnbm9yZWQoYSkgJiYgaXNJZ25vcmVkKGIpKSB8fFxuICAgIC8vIENoZWNrIGlmIGJvdGggbm9kZXMgaGF2ZSB0aGUgc2FtZSBjaGVja3N1bS5cbiAgICAoZ2V0Q2hlY2tTdW0oYSkgPT09IGdldENoZWNrU3VtKGIpKSB8fFxuICAgIC8vIEZhbGwgYmFjayB0byBuYXRpdmUgaXNFcXVhbE5vZGUgY2hlY2suXG4gICAgYS5pc0VxdWFsTm9kZShiKVxuICApXG59XG5cbi8qKlxuICogQHByaXZhdGVcbiAqIEBkZXNjcmlwdGlvblxuICogVXRpbGl0eSB0byB0cnkgdG8gcHVsbCBhIGNoZWNrc3VtIGF0dHJpYnV0ZSBmcm9tIGFuIGVsZW1lbnQuXG4gKiBVc2VzICdkYXRhLWNoZWNrc3VtJyBvciB1c2VyIHNwZWNpZmllZCBjaGVja3N1bSBwcm9wZXJ0eS5cbiAqXG4gKiBAcGFyYW0ge05vZGV9IG5vZGUgLSBUaGUgbm9kZSB0byBnZXQgdGhlIGNoZWNrc3VtIGZvci5cbiAqIEByZXR1cm4ge3N0cmluZ3xOYU59XG4gKi9cbmZ1bmN0aW9uIGdldENoZWNrU3VtIChub2RlKSB7XG4gIHJldHVybiBub2RlLmdldEF0dHJpYnV0ZShzZXRET00uQ0hFQ0tTVU0pIHx8IE5hTlxufVxuXG4vKipcbiAqIEBwcml2YXRlXG4gKiBAZGVzY3JpcHRpb25cbiAqIFV0aWxpdHkgdG8gdHJ5IHRvIGNoZWNrIGlmIGFuIGVsZW1lbnQgc2hvdWxkIGJlIGlnbm9yZWQgYnkgdGhlIGFsZ29yaXRobS5cbiAqIFVzZXMgJ2RhdGEtaWdub3JlJyBvciB1c2VyIHNwZWNpZmllZCBpZ25vcmUgcHJvcGVydHkuXG4gKlxuICogQHBhcmFtIHtOb2RlfSBub2RlIC0gVGhlIG5vZGUgdG8gY2hlY2sgaWYgaXQgc2hvdWxkIGJlIGlnbm9yZWQuXG4gKiBAcmV0dXJuIHtib29sZWFufVxuICovXG5mdW5jdGlvbiBpc0lnbm9yZWQgKG5vZGUpIHtcbiAgcmV0dXJuIG5vZGUuZ2V0QXR0cmlidXRlKHNldERPTS5JR05PUkUpICE9IG51bGxcbn1cblxuLyoqXG4gKiBEaXNwYXRjaGVzIGEgbW91bnQgZXZlbnQgZm9yIHRoZSBnaXZlbiBub2RlIGFuZCBjaGlsZHJlbi5cbiAqXG4gKiBAcGFyYW0ge05vZGV9IG5vZGUgLSB0aGUgbm9kZSB0byBtb3VudC5cbiAqIEByZXR1cm4ge25vZGV9XG4gKi9cbmZ1bmN0aW9uIG1vdW50IChub2RlKSB7XG4gIHJldHVybiBkaXNwYXRjaChub2RlLCAnbW91bnQnKVxufVxuXG4vKipcbiAqIERpc3BhdGNoZXMgYSBkaXNtb3VudCBldmVudCBmb3IgdGhlIGdpdmVuIG5vZGUgYW5kIGNoaWxkcmVuLlxuICpcbiAqIEBwYXJhbSB7Tm9kZX0gbm9kZSAtIHRoZSBub2RlIHRvIGRpc21vdW50LlxuICogQHJldHVybiB7bm9kZX1cbiAqL1xuZnVuY3Rpb24gZGlzbW91bnQgKG5vZGUpIHtcbiAgcmV0dXJuIGRpc3BhdGNoKG5vZGUsICdkaXNtb3VudCcpXG59XG5cbi8qKlxuICogUmVjdXJzaXZlbHkgdHJpZ2dlciBhbiBldmVudCBmb3IgYSBub2RlIGFuZCBpdCdzIGNoaWxkcmVuLlxuICogT25seSBlbWl0cyBldmVudHMgZm9yIGtleWVkIG5vZGVzLlxuICpcbiAqIEBwYXJhbSB7Tm9kZX0gbm9kZSAtIHRoZSBpbml0aWFsIG5vZGUuXG4gKiBAcmV0dXJuIHtOb2RlfVxuICovXG5mdW5jdGlvbiBkaXNwYXRjaCAobm9kZSwgdHlwZSkge1xuICAvLyBUcmlnZ2VyIGV2ZW50IGZvciB0aGlzIGVsZW1lbnQgaWYgaXQgaGFzIGEga2V5LlxuICBpZiAoZ2V0S2V5KG5vZGUpKSB7XG4gICAgdmFyIGV2ID0gZG9jdW1lbnQuY3JlYXRlRXZlbnQoJ0V2ZW50JylcbiAgICB2YXIgcHJvcCA9IHsgdmFsdWU6IG5vZGUgfVxuICAgIGV2LmluaXRFdmVudCh0eXBlLCBmYWxzZSwgZmFsc2UpXG4gICAgT2JqZWN0LmRlZmluZVByb3BlcnR5KGV2LCAndGFyZ2V0JywgcHJvcClcbiAgICBPYmplY3QuZGVmaW5lUHJvcGVydHkoZXYsICdzcmNFbGVtZW50JywgcHJvcClcbiAgICBub2RlLmRpc3BhdGNoRXZlbnQoZXYpXG4gIH1cblxuICAvLyBEaXNwYXRjaCB0byBhbGwgY2hpbGRyZW4uXG4gIHZhciBjaGlsZCA9IG5vZGUuZmlyc3RDaGlsZFxuICB3aGlsZSAoY2hpbGQpIGNoaWxkID0gZGlzcGF0Y2goY2hpbGQsIHR5cGUpLm5leHRTaWJsaW5nXG4gIHJldHVybiBub2RlXG59XG5cbi8qKlxuICogQHByaXZhdGVcbiAqIEBkZXNjcmlwdGlvblxuICogQ29uZmlybSB0aGF0IGEgdmFsdWUgaXMgdHJ1dGh5LCB0aHJvd3MgYW4gZXJyb3IgbWVzc2FnZSBvdGhlcndpc2UuXG4gKlxuICogQHBhcmFtIHsqfSB2YWwgLSB0aGUgdmFsIHRvIHRlc3QuXG4gKiBAcGFyYW0ge3N0cmluZ30gbXNnIC0gdGhlIGVycm9yIG1lc3NhZ2Ugb24gZmFpbHVyZS5cbiAqIEB0aHJvd3Mge0Vycm9yfVxuICovXG5mdW5jdGlvbiBhc3NlcnQgKHZhbCwgbXNnKSB7XG4gIGlmICghdmFsKSB0aHJvdyBuZXcgRXJyb3IoJ3NldC1kb206ICcgKyBtc2cpXG59XG4iLCIndXNlIHN0cmljdCdcbnZhciBwYXJzZXIgPSB3aW5kb3cuRE9NUGFyc2VyICYmIG5ldyB3aW5kb3cuRE9NUGFyc2VyKClcbnZhciBkb2N1bWVudFJvb3ROYW1lID0gJ0hUTUwnXG52YXIgc3VwcG9ydHNIVE1MVHlwZSA9IGZhbHNlXG52YXIgc3VwcG9ydHNJbm5lckhUTUwgPSBmYWxzZVxudmFyIGh0bWxUeXBlID0gJ3RleHQvaHRtbCdcbnZhciB4aHRtbFR5cGUgPSAnYXBwbGljYXRpb24veGh0bWwreG1sJ1xudmFyIHRlc3RDbGFzcyA9ICdBJ1xudmFyIHRlc3RDb2RlID0gJzx3YnIgY2xhc3M9XCInICsgdGVzdENsYXNzICsgJ1wiLz4nXG5cbnRyeSB7XG4gIC8vIENoZWNrIGlmIGJyb3dzZXIgc3VwcG9ydHMgdGV4dC9odG1sIERPTVBhcnNlclxuICB2YXIgcGFyc2VkID0gcGFyc2VyLnBhcnNlRnJvbVN0cmluZyh0ZXN0Q29kZSwgaHRtbFR5cGUpLmJvZHkuZmlyc3RDaGlsZFxuICAvLyBTb21lIGJyb3dzZXJzIChpT1MgOSBhbmQgU2FmYXJpIDkpIGxvd2VyY2FzZSBjbGFzc2VzIGZvciBwYXJzZWQgZWxlbWVudHNcbiAgLy8gYnV0IG9ubHkgd2hlbiBhcHBlbmRpbmcgdG8gRE9NLCBzbyB1c2UgaW5uZXJIVE1MIGluc3RlYWRcbiAgdmFyIGQgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdkaXYnKVxuICBkLmFwcGVuZENoaWxkKHBhcnNlZClcbiAgaWYgKGQuZmlyc3RDaGlsZC5jbGFzc0xpc3RbMF0gIT09IHRlc3RDbGFzcykgdGhyb3cgbmV3IEVycm9yKClcbiAgc3VwcG9ydHNIVE1MVHlwZSA9IHRydWVcbn0gY2F0Y2ggKGUpIHt9XG5cbnZhciBtb2NrRG9jID0gZG9jdW1lbnQuaW1wbGVtZW50YXRpb24uY3JlYXRlSFRNTERvY3VtZW50KCcnKVxudmFyIG1vY2tIVE1MID0gbW9ja0RvYy5kb2N1bWVudEVsZW1lbnRcbnZhciBtb2NrQm9keSA9IG1vY2tEb2MuYm9keVxudHJ5IHtcbiAgLy8gQ2hlY2sgaWYgYnJvd3NlciBzdXBwb3J0cyBkb2N1bWVudEVsZW1lbnQuaW5uZXJIVE1MXG4gIG1vY2tIVE1MLmlubmVySFRNTCArPSAnJ1xuICBzdXBwb3J0c0lubmVySFRNTCA9IHRydWVcbn0gY2F0Y2ggKGUpIHtcbiAgLy8gQ2hlY2sgaWYgYnJvd3NlciBzdXBwb3J0cyB4aHRtbCBwYXJzaW5nLlxuICBwYXJzZXIucGFyc2VGcm9tU3RyaW5nKHRlc3RDb2RlLCB4aHRtbFR5cGUpXG4gIHZhciBib2R5UmVnID0gLyg8Ym9keVtePl0qPikoW1xcc1xcU10qKTxcXC9ib2R5Pi9cbn1cblxuZnVuY3Rpb24gRE9NUGFyc2VyUGFyc2UgKG1hcmt1cCwgcm9vdE5hbWUpIHtcbiAgdmFyIGRvYyA9IHBhcnNlci5wYXJzZUZyb21TdHJpbmcobWFya3VwLCBodG1sVHlwZSlcbiAgLy8gUGF0Y2ggZm9yIGlPUyBVSVdlYlZpZXcgbm90IGFsd2F5cyByZXR1cm5pbmcgZG9jLmJvZHkgc3luY2hyb25vdXNseVxuICBpZiAoIWRvYy5ib2R5KSB7IHJldHVybiBmYWxsYmFja1BhcnNlKG1hcmt1cCwgcm9vdE5hbWUpIH1cblxuICByZXR1cm4gcm9vdE5hbWUgPT09IGRvY3VtZW50Um9vdE5hbWVcbiAgICA/IGRvYy5kb2N1bWVudEVsZW1lbnRcbiAgICA6IGRvYy5ib2R5LmZpcnN0Q2hpbGRcbn1cblxuZnVuY3Rpb24gZmFsbGJhY2tQYXJzZSAobWFya3VwLCByb290TmFtZSkge1xuICAvLyBGYWxsYmFjayB0byBpbm5lckhUTUwgZm9yIG90aGVyIG9sZGVyIGJyb3dzZXJzLlxuICBpZiAocm9vdE5hbWUgPT09IGRvY3VtZW50Um9vdE5hbWUpIHtcbiAgICBpZiAoc3VwcG9ydHNJbm5lckhUTUwpIHtcbiAgICAgIG1vY2tIVE1MLmlubmVySFRNTCA9IG1hcmt1cFxuICAgICAgcmV0dXJuIG1vY2tIVE1MXG4gICAgfSBlbHNlIHtcbiAgICAgIC8vIElFOSBkb2VzIG5vdCBzdXBwb3J0IGlubmVyaHRtbCBhdCByb290IGxldmVsLlxuICAgICAgLy8gV2UgZ2V0IGFyb3VuZCB0aGlzIGJ5IHBhcnNpbmcgZXZlcnl0aGluZyBleGNlcHQgdGhlIGJvZHkgYXMgeGh0bWwuXG4gICAgICB2YXIgYm9keU1hdGNoID0gbWFya3VwLm1hdGNoKGJvZHlSZWcpXG4gICAgICBpZiAoYm9keU1hdGNoKSB7XG4gICAgICAgIHZhciBib2R5Q29udGVudCA9IGJvZHlNYXRjaFsyXVxuICAgICAgICB2YXIgc3RhcnRCb2R5ID0gYm9keU1hdGNoLmluZGV4ICsgYm9keU1hdGNoWzFdLmxlbmd0aFxuICAgICAgICB2YXIgZW5kQm9keSA9IHN0YXJ0Qm9keSArIGJvZHlDb250ZW50Lmxlbmd0aFxuICAgICAgICBtYXJrdXAgPSBtYXJrdXAuc2xpY2UoMCwgc3RhcnRCb2R5KSArIG1hcmt1cC5zbGljZShlbmRCb2R5KVxuICAgICAgICBtb2NrQm9keS5pbm5lckhUTUwgPSBib2R5Q29udGVudFxuICAgICAgfVxuXG4gICAgICB2YXIgZG9jID0gcGFyc2VyLnBhcnNlRnJvbVN0cmluZyhtYXJrdXAsIHhodG1sVHlwZSlcbiAgICAgIHZhciBib2R5ID0gZG9jLmJvZHlcbiAgICAgIHdoaWxlIChtb2NrQm9keS5maXJzdENoaWxkKSBib2R5LmFwcGVuZENoaWxkKG1vY2tCb2R5LmZpcnN0Q2hpbGQpXG4gICAgICByZXR1cm4gZG9jLmRvY3VtZW50RWxlbWVudFxuICAgIH1cbiAgfSBlbHNlIHtcbiAgICBtb2NrQm9keS5pbm5lckhUTUwgPSBtYXJrdXBcbiAgICByZXR1cm4gbW9ja0JvZHkuZmlyc3RDaGlsZFxuICB9XG59XG5cbi8qKlxuICogUmV0dXJucyB0aGUgcmVzdWx0cyBvZiBhIERPTVBhcnNlciBhcyBhbiBIVE1MRWxlbWVudC5cbiAqIChTaGltcyBmb3Igb2xkZXIgYnJvd3NlcnMpLlxuICovXG5tb2R1bGUuZXhwb3J0cyA9IHN1cHBvcnRzSFRNTFR5cGVcbiAgPyBET01QYXJzZXJQYXJzZVxuICA6IGZhbGxiYWNrUGFyc2VcbiIsInZhciBnZXRJZCA9IGZ1bmN0aW9uIChpZCkge1xyXG4gIHJldHVybiBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChpZClcclxufVxyXG5cclxuZXhwb3J0cy5nZXRJZCA9IGdldElkXHJcblxyXG5leHBvcnRzLnRlc3RFdmVudCA9IGZ1bmN0aW9uICh0bXBsKSB7XHJcbiAgcmV0dXJuIC8gay0vLnRlc3QodG1wbClcclxufVxyXG5cclxuLyoqXHJcbiAqIEBwcml2YXRlXHJcbiAqIEBkZXNjcmlwdGlvblxyXG4gKiBDaGVjayBhIG5vZGUgYXZhaWxhYmlsaXR5IGluIDI1MG1zLCBpZiBub3QgZm91bmQgc2lsZW50eSBza2lwIHRoZSBldmVudFxyXG4gKlxyXG4gKiBAcGFyYW0ge3N0cmluZ30gaWQgLSB0aGUgbm9kZSBpZFxyXG4gKiBAcGFyYW0ge2Z1bmN0aW9ufSBjYWxsYmFjayAtIHRoZSBmdW5jdGlvbiB0byBleGVjdXRlIG9uY2UgdGhlIG5vZGUgaXMgZm91bmRcclxuICovXHJcbmV4cG9ydHMuY2hlY2tOb2RlQXZhaWxhYmlsaXR5ID0gZnVuY3Rpb24gKGNvbXBvbmVudCwgY29tcG9uZW50TmFtZSwgY2FsbGJhY2ssIG5vdEZvdW5kKSB7XHJcbiAgdmFyIGVsZSA9IGdldElkKGNvbXBvbmVudC5lbClcclxuICB2YXIgZm91bmQgPSBmYWxzZVxyXG4gIGlmIChlbGUpIHJldHVybiBlbGVcclxuICBlbHNlIHtcclxuICAgIHZhciB0ID0gc2V0SW50ZXJ2YWwoZnVuY3Rpb24gKCkge1xyXG4gICAgICBlbGUgPSBnZXRJZChjb21wb25lbnQuZWwpXHJcbiAgICAgIGlmIChlbGUpIHtcclxuICAgICAgICBjbGVhckludGVydmFsKHQpXHJcbiAgICAgICAgZm91bmQgPSB0cnVlXHJcbiAgICAgICAgY2FsbGJhY2soY29tcG9uZW50LCBjb21wb25lbnROYW1lLCBlbGUpXHJcbiAgICAgIH1cclxuICAgIH0sIDApXHJcbiAgICAvLyBzaWxlbnRseSBpZ25vcmUgZmluZGluZyB0aGUgbm9kZSBhZnRlciBzb21ldGltZXNcclxuICAgIHNldFRpbWVvdXQoZnVuY3Rpb24gKCkge1xyXG4gICAgICBjbGVhckludGVydmFsKHQpXHJcbiAgICAgIGlmICghZm91bmQgJiYgbm90Rm91bmQgJiYgdHlwZW9mIG5vdEZvdW5kID09PSAnZnVuY3Rpb24nKSBub3RGb3VuZCgpXHJcbiAgICB9LCAyNTApXHJcbiAgfVxyXG59XHJcblxyXG4vKipcclxuICogQHByaXZhdGVcclxuICogQGRlc2NyaXB0aW9uXHJcbiAqIENvbmZpcm0gdGhhdCBhIHZhbHVlIGlzIHRydXRoeSwgdGhyb3dzIGFuIGVycm9yIG1lc3NhZ2Ugb3RoZXJ3aXNlLlxyXG4gKlxyXG4gKiBAcGFyYW0geyp9IHZhbCAtIHRoZSB2YWwgdG8gdGVzdC5cclxuICogQHBhcmFtIHtzdHJpbmd9IG1zZyAtIHRoZSBlcnJvciBtZXNzYWdlIG9uIGZhaWx1cmUuXHJcbiAqIEB0aHJvd3Mge0Vycm9yfVxyXG4gKi9cclxuZXhwb3J0cy5hc3NlcnQgPSBmdW5jdGlvbiAodmFsLCBtc2cpIHtcclxuICBpZiAoIXZhbCkgdGhyb3cgbmV3IEVycm9yKCcoa2VldCkgJyArIG1zZylcclxufVxyXG5cclxuLyoqXHJcbiAqIEBwcml2YXRlXHJcbiAqIEBkZXNjcmlwdGlvblxyXG4gKiBTaW1wbGUgaHRtbCB0ZW1wbGF0ZSBsaXRlcmFscyBNT0RJRklFRCBmcm9tIDogaHR0cDovLzJhbGl0eS5jb20vMjAxNS8wMS90ZW1wbGF0ZS1zdHJpbmdzLWh0bWwuaHRtbFxyXG4gKiBieSBEci4gQXhlbCBSYXVzY2htYXllclxyXG4gKiBubyBjaGVja2luZyBmb3Igd3JhcHBpbmcgaW4gcm9vdCBlbGVtZW50XHJcbiAqIG5vIHN0cmljdCBjaGVja2luZ1xyXG4gKiByZW1vdmUgc3BhY2luZyAvIGluZGVudGF0aW9uXHJcbiAqIGtlZXAgYWxsIHNwYWNpbmcgd2l0aGluIGh0bWwgdGFnc1xyXG4gKiBpbmNsdWRlIGhhbmRsaW5nICR7fSBpbiB0aGUgbGl0ZXJhbHNcclxuICovXHJcbmV4cG9ydHMuaHRtbCA9IGZ1bmN0aW9uIGh0bWwgKCkge1xyXG4gIHZhciBsaXRlcmFscyA9IFtdLnNoaWZ0LmNhbGwoYXJndW1lbnRzKVxyXG4gIHZhciBzdWJzdHMgPSBbXS5zbGljZS5jYWxsKGFyZ3VtZW50cylcclxuXHJcbiAgdmFyIHJlc3VsdCA9IGxpdGVyYWxzLnJhdy5yZWR1Y2UoZnVuY3Rpb24gKGFjYywgbGl0LCBpKSB7XHJcbiAgICByZXR1cm4gYWNjICsgc3Vic3RzW2kgLSAxXSArIGxpdFxyXG4gIH0pXHJcbiAgLy8gcmVtb3ZlIHNwYWNpbmcsIGluZGVudGF0aW9uIGZyb20gZXZlcnkgbGluZVxyXG4gIHJlc3VsdCA9IHJlc3VsdC5zcGxpdCgvXFxuKy8pXHJcbiAgcmVzdWx0ID0gcmVzdWx0Lm1hcChmdW5jdGlvbiAodCkge1xyXG4gICAgcmV0dXJuIHQudHJpbSgpXHJcbiAgfSkuam9pbignJylcclxuICByZXR1cm4gcmVzdWx0XHJcbn1cclxuXHJcbi8qKlxyXG4gKiBAcHJpdmF0ZVxyXG4gKiBAZGVzY3JpcHRpb25cclxuICogdHJvdHRsZSBmdW5jdGlvbiBjYWxsc1xyXG4gKlxyXG4gKiBAcGFyYW0ge0Z1bmN0aW9ufSBmbiAtIGZ1bmN0aW9uIHRvIHRyb3R0bGVcclxuICogQHBhcmFtIHtOdW1iZXJ9IGRlbGF5IC0gdGltZSBkZWxheSBiZWZvcmUgZnVuY3Rpb24gZ2V0IGV4ZWN1dGVkXHJcbiAqL1xyXG5cclxuZnVuY3Rpb24gdHJvdHRsZShmbiwgZGVsYXkpIHtcclxuICB2YXIgdGltZXIgPSBudWxsO1xyXG4gIHJldHVybiBmdW5jdGlvbiAoKSB7XHJcbiAgICB2YXIgY29udGV4dCA9IHRoaXMsIGFyZ3MgPSBhcmd1bWVudHM7XHJcbiAgICBjbGVhclRpbWVvdXQodGltZXIpO1xyXG4gICAgdGltZXIgPSBzZXRUaW1lb3V0KGZ1bmN0aW9uICgpIHtcclxuICAgICAgZm4uYXBwbHkoY29udGV4dCwgYXJncyk7XHJcbiAgICB9LCBkZWxheSk7XHJcbiAgfTtcclxufTtcclxuXHJcbmV4cG9ydHMudHJvdHRsZSA9IHRyb3R0bGVcclxuXHJcbi8qKlxyXG4gKiBAcHJpdmF0ZVxyXG4gKiBAZGVzY3JpcHRpb25cclxuICogQ29weSB3aXRoIG1vZGlmaWNhdGlvbiBmcm9tIHByZWFjdC10b2RvbXZjLiBNb2RlbCBjb25zdHJ1Y3RvciB3aXRoXHJcbiAqIHJlZ2lzdGVyaW5nIGNhbGxiYWNrIGxpc3RlbmVyIGluIE9iamVjdC5kZWZpbmVQcm9wZXJ0eS4gQW55IG1vZGlmaWNhdGlvblxyXG4gKiB0byBgYGB0aGlzLmxpc3RgYGAgaW5zdGFuY2Ugd2lsbCBzdWJzZXF1ZW50bHkgaW5mb3JtIGFsbCByZWdpc3RlcmVkIGxpc3RlbmVyLlxyXG4gKlxyXG4gKiB7e21vZGVsOjxteU1vZGVsPn19PG15TW9kZWxUZW1wbGF0ZVN0cmluZz57ey9tb2RlbDo8bXlNb2RlbD59fVxyXG4gKlxyXG4gKi9cclxuZnVuY3Rpb24gY3JlYXRlTW9kZWwgKCkge1xyXG4gIHZhciBtb2RlbCA9IFtdXHJcbiAgdmFyIG9uQ2hhbmdlcyA9IFtdXHJcblxyXG4gIHZhciBpbmZvcm0gPSBmdW5jdGlvbiAoKSB7XHJcbiAgICAvLyBjb25zb2xlLmxvZyhvbkNoYW5nZXMpXHJcbiAgICBmb3IgKHZhciBpID0gb25DaGFuZ2VzLmxlbmd0aDsgaS0tOykge1xyXG4gICAgICBvbkNoYW5nZXNbaV0obW9kZWwpXHJcbiAgICB9XHJcbiAgfVxyXG5cclxuLyoqXHJcbiAqIEBwcml2YXRlXHJcbiAqIEBkZXNjcmlwdGlvblxyXG4gKiBSZWdpc3RlciBjYWxsYmFjayBsaXN0ZW5lciBvZiBhbnkgY2hhbmdlc1xyXG4gKi9cclxuICBPYmplY3QuZGVmaW5lUHJvcGVydHkodGhpcywgJ2xpc3QnLCB7XHJcbiAgICBlbnVtZXJhYmxlOiBmYWxzZSxcclxuICAgIGNvbmZpZ3VyYWJsZTogdHJ1ZSxcclxuICAgIGdldDogZnVuY3Rpb24gKCkge1xyXG4gICAgICByZXR1cm4gbW9kZWxcclxuICAgIH0sXHJcbiAgICBzZXQ6IGZ1bmN0aW9uICh2YWwpIHtcclxuICAgICAgbW9kZWwgPSB2YWxcclxuICAgICAgaW5mb3JtKClcclxuICAgIH1cclxuICB9KVxyXG5cclxuLyoqXHJcbiAqIEBwcml2YXRlXHJcbiAqIEBkZXNjcmlwdGlvblxyXG4gKiBTdWJzY3JpYmUgdG8gdGhlIG1vZGVsIGNoYW5nZXMgKGFkZC91cGRhdGUvZGVzdHJveSlcclxuICpcclxuICogQHBhcmFtIHtPYmplY3R9IG1vZGVsIC0gdGhlIG1vZGVsIGluY2x1ZGluZyBhbGwgcHJvdG90eXBlc1xyXG4gKlxyXG4gKi9cclxuICB0aGlzLnN1YnNjcmliZSA9IGZ1bmN0aW9uIChmbikge1xyXG4gICAgb25DaGFuZ2VzLnB1c2goZm4pXHJcbiAgfVxyXG5cclxuLyoqXHJcbiAqIEBwcml2YXRlXHJcbiAqIEBkZXNjcmlwdGlvblxyXG4gKiBBZGQgbmV3IG9iamVjdCB0byB0aGUgbW9kZWwgbGlzdFxyXG4gKlxyXG4gKiBAcGFyYW0ge09iamVjdH0gb2JqIC0gbmV3IG9iamVjdCB0byBhZGQgaW50byB0aGUgbW9kZWwgbGlzdFxyXG4gKlxyXG4gKi9cclxuICB0aGlzLmFkZCA9IGZ1bmN0aW9uIChvYmopIHtcclxuICAgIHRoaXMubGlzdCA9IHRoaXMubGlzdC5jb25jYXQob2JqKVxyXG4gIH1cclxuXHJcbi8qKlxyXG4gKiBAcHJpdmF0ZVxyXG4gKiBAZGVzY3JpcHRpb25cclxuICogVXBkYXRlIGV4aXN0aW5nIG9iamVjdCBpbiB0aGUgbW9kZWwgbGlzdFxyXG4gKlxyXG4gKiBAcGFyYW0ge1N0cmluZ30gbG9va3VwSWQgLSBsb29rdXAgaWQgcHJvcGVydHkgbmFtZSBvZiB0aGUgb2JqZWN0XHJcbiAqIEBwYXJhbSB7T2JqZWN0fSB1cGRhdGVPYmogLSB0aGUgdXBkYXRlZCBwcm9wZXJ0aWVzXHJcbiAqXHJcbiAqL1xyXG4gIHRoaXMudXBkYXRlID0gZnVuY3Rpb24gKGxvb2t1cElkLCB1cGRhdGVPYmopIHtcclxuICAgIHRoaXMubGlzdCA9IHRoaXMubGlzdC5tYXAoZnVuY3Rpb24gKG9iaikge1xyXG4gICAgICByZXR1cm4gb2JqW2xvb2t1cElkXSAhPT0gdXBkYXRlT2JqW2xvb2t1cElkXSA/IG9iaiA6IE9iamVjdC5hc3NpZ24ob2JqLCB1cGRhdGVPYmopXHJcbiAgICB9KVxyXG4gIH1cclxuXHJcbi8qKlxyXG4gKiBAcHJpdmF0ZVxyXG4gKiBAZGVzY3JpcHRpb25cclxuICogUmVtb3ZlZCBleGlzdGluZyBvYmplY3QgaW4gdGhlIG1vZGVsIGxpc3RcclxuICpcclxuICogQHBhcmFtIHtTdHJpbmd9IGxvb2t1cElkIC0gbG9va3VwIGlkIHByb3BlcnR5IG5hbWUgb2YgdGhlIG9iamVjdFxyXG4gKiBAcGFyYW0ge1N0cmluZ30gb2JqSWQgLSB1bmlxdWUgaWRlbnRpZmllciBvZiB0aGUgbG9va3VwIGlkXHJcbiAqXHJcbiAqL1xyXG4gIHRoaXMuZGVzdHJveSA9IGZ1bmN0aW9uIChsb29rdXBJZCwgb2JqSWQpIHtcclxuICAgIHRoaXMubGlzdCA9IHRoaXMubGlzdC5maWx0ZXIoZnVuY3Rpb24gKG9iaikge1xyXG4gICAgICByZXR1cm4gb2JqW2xvb2t1cElkXSAhPT0gb2JqSWRcclxuICAgIH0pXHJcbiAgfVxyXG59XHJcblxyXG5leHBvcnRzLmNyZWF0ZU1vZGVsID0gY3JlYXRlTW9kZWxcclxuIiwiaW1wb3J0IEtlZXQgZnJvbSAnLi4va2VldCdcclxuaW1wb3J0IHsgaHRtbCB9IGZyb20gJy4uL2tlZXQvdXRpbHMnXHJcbmltcG9ydCB7IGdlbklkIH0gZnJvbSAnLi91dGlsJ1xyXG5pbXBvcnQgZmlsdGVyQXBwICBmcm9tICcuL2ZpbHRlcidcclxuaW1wb3J0IHRvZG9BcHAgZnJvbSAnLi90b2RvJ1xyXG5cclxuY2xhc3MgQXBwIGV4dGVuZHMgS2VldCB7XHJcbiAgdG9kb0FwcCA9IHRvZG9BcHBcclxuICBmaWx0ZXIgPSBmaWx0ZXJBcHBcclxuICBpc0NoZWNrZWQgPSBmYWxzZVxyXG4gIGNvdW50ID0gMFxyXG4gIHBsdXJhbCA9ICcnXHJcbiAgY2xlYXJUb2dnbGUgPSBmYWxzZVxyXG4gIHRvZG9TdGF0ZSA9IHRydWVcclxuXHJcbiAgY29tcG9uZW50V2lsbE1vdW50KCkge1xyXG4gICAgLy8gdGhpcy50b2RvTW9kZWwuc3Vic2NyaWJlKHRvZG9zID0+IHRoaXMuY2FsbEJhdGNoUG9vbFVwZGF0ZSgpKVxyXG4gICAgLy8gdGhpcy50b2RvU3RhdGUgPSB0aGlzLnRvZG9BcHAudG9kb01vZGVsLmxpc3QubGVuZ3RoID8gdHJ1ZSA6IGZhbHNlXHJcbiAgICAvLyBjb25zdCBzZWxmID0gdGhpc1xyXG4gICAgdG9kb0FwcC5zdWJzY3JpYmUodG9kb3MgPT4ge1xyXG4gICAgICBjb25zb2xlLmxvZyh0b2RvcylcclxuICAgICAgLy8gbGV0IHVuY29tcGxldGVkID0gdG9kb3MuZmlsdGVyKGMgPT4gIWMuY29tcGxldGVkKVxyXG4gICAgICAvLyBsZXQgY29tcGxldGVkID0gdG9kb3MuZmlsdGVyKGMgPT4gYy5jb21wbGV0ZWQpXHJcbiAgICAgIC8vIHRoaXMuY2xlYXJUb2dnbGUgPSBjb21wbGV0ZWQubGVuZ3RoID8gdHJ1ZSA6IGZhbHNlXHJcbiAgICAgIC8vIHRoaXMudG9kb1N0YXRlID0gdG9kb3MubGVuZ3RoID8gdHJ1ZSA6IGZhbHNlXHJcbiAgICAgIC8vIHRoaXMucGx1cmFsID0gdW5jb21wbGV0ZWQubGVuZ3RoID09PSAxID8gJycgOiAncydcclxuICAgICAgLy8gdGhpcy5jb3VudCA9IHVuY29tcGxldGVkLmxlbmd0aFxyXG4gICAgICAvLyBjb25zb2xlLmxvZyh0aGlzKVxyXG4gICAgICAvLyB0aGlzLnRvZG9BcHAuY2FsbEJhdGNoUG9vbFVwZGF0ZSgpXHJcbiAgICB9KVxyXG4gIH1cclxuXHJcbiAgY3JlYXRlIChldnQpIHtcclxuICAgIGlmKGV2dC5rZXlDb2RlICE9PSAxMykgcmV0dXJuXHJcbiAgICBldnQucHJldmVudERlZmF1bHQoKVxyXG4gICAgbGV0IHRpdGxlID0gZXZ0LnRhcmdldC52YWx1ZS50cmltKClcclxuICAgIGlmKHRpdGxlKXtcclxuICAgICAgdGhpcy50b2RvQXBwLmFkZFRvZG8oeyBpZDogZ2VuSWQoKSwgdGl0bGUsIGNvbXBsZXRlZDogZmFsc2UgfSlcclxuICAgICAgZXZ0LnRhcmdldC52YWx1ZSA9ICcnXHJcbiAgICB9XHJcbiAgfVxyXG5cclxuICBjcmVhdGVGcm9tRm4gKHRpdGxlKSB7XHJcbiAgICB0aGlzLnRvZG9BcHAuYWRkVG9kbyh7IGlkOiBnZW5JZCgpLCB0aXRsZSwgY29tcGxldGVkOiBmYWxzZSB9KVxyXG4gIH1cclxuXHJcbiAgY29tcGxldGVBbGwoKXtcclxuICAgIHRoaXMuaXNDaGVja2VkID0gIXRoaXMuaXNDaGVja2VkXHJcbiAgICAvLyB0aGlzLnRvZG9BcHAudXBkYXRlQWxsKHRoaXMuaXNDaGVja2VkKVxyXG4gIH1cclxuXHJcbiAgY2xlYXJDb21wbGV0ZWQoKSB7XHJcbiAgICB0aGlzLnRvZG9BcHAuY2xlYXJDb21wbGV0ZWQoKVxyXG4gIH1cclxuICBlZGl0TW9kZSgpe1xyXG5cclxuICB9XHJcbiAgLy8gY29tcG9uZW50RGlkVXBkYXRlKCl7XHJcbiAgLy8gICBjKytcclxuICAvLyAgIGNvbnNvbGUubG9nKGMvKiwgdGltZSwgRGF0ZS5ub3coKSAtIHRpbWUqLylcclxuICAvLyB9XHJcbn1cclxuXHJcbmNvbnN0IHZtb2RlbCA9IGh0bWxgXHJcbiAgPHNlY3Rpb24gY2xhc3M9XCJ0b2RvYXBwXCI+XHJcbiAgICA8aGVhZGVyIGlkPVwiaGVhZGVyXCI+XHJcbiAgICAgIDxoMT50b2RvczwvaDE+XHJcbiAgICAgIDxpbnB1dCBpZD1cIm5ldy10b2RvXCIgY2xhc3M9XCJuZXctdG9kb1wiIGsta2V5ZG93bj1cImNyZWF0ZSgpXCIgcGxhY2Vob2xkZXI9XCJXaGF0IG5lZWRzIHRvIGJlIGRvbmU/XCIgYXV0b2ZvY3VzPlxyXG4gICAgPC9oZWFkZXI+XHJcbiAgICA8IS0tIHt7P3RvZG9TdGF0ZX19IC0tPlxyXG4gICAgPHNlY3Rpb24gY2xhc3M9XCJtYWluXCI+XHJcbiAgICAgIDxpbnB1dCBpZD1cInRvZ2dsZS1hbGxcIiBjbGFzcz1cInRvZ2dsZS1hbGxcIiB0eXBlPVwiY2hlY2tib3hcIiBjaGVja2VkPVwie3tpc0NoZWNrZWQ/Y2hlY2tlZDonJ319XCIgay1jbGljaz1cImNvbXBsZXRlQWxsKClcIj5cclxuICAgICAgPGxhYmVsIGZvcj1cInRvZ2dsZS1hbGxcIj5NYXJrIGFsbCBhcyBjb21wbGV0ZTwvbGFiZWw+XHJcbiAgICAgIDwhLS0ge3tjb21wb25lbnQ6dG9kb0FwcH19IC0tPlxyXG4gICAgPC9zZWN0aW9uPlxyXG4gICAgPGZvb3RlciBjbGFzcz1cImZvb3RlclwiPlxyXG4gICAgICA8c3BhbiBjbGFzcz1cInRvZG8tY291bnRcIj5cclxuICAgICAgICA8c3Ryb25nPnt7Y291bnR9fTwvc3Ryb25nPiBpdGVte3twbHVyYWx9fSBsZWZ0XHJcbiAgICAgIDwvc3Bhbj5cclxuICAgICAgPCEtLSBjb21wb25lbnQ6ZmlsdGVyIC0tPlxyXG4gICAgICA8IS0tIHt7P2NsZWFyVG9nZ2xlfX0gLS0+XHJcbiAgICAgIDxidXR0b24gaWQ9XCJjbGVhci1jb21wbGV0ZWRcIiBjbGFzcz1cImNsZWFyLWNvbXBsZXRlZFwiPkNsZWFyIGNvbXBsZXRlZDwvYnV0dG9uPlxyXG4gICAgICA8IS0tIHt7L2NsZWFyVG9nZ2xlfX0gLS0+XHJcbiAgICA8L2Zvb3Rlcj5cclxuICAgIDwhLS0ge3svdG9kb1N0YXRlfX0gLS0+XHJcbiAgPC9zZWN0aW9uPlxyXG4gIDxmb290ZXIgY2xhc3M9XCJpbmZvXCI+XHJcbiAgICA8cD5Eb3VibGUtY2xpY2sgdG8gZWRpdCBhIHRvZG88L3A+XHJcbiAgICA8cD5DcmVhdGVkIGJ5IDxhIGhyZWY9XCJodHRwczovL2dpdGh1Yi5jb20vc3lhcnVsXCI+U2hhaHJ1bCBOaXphbSBTZWxhbWF0PC9hPjwvcD5cclxuICAgIDxwPlBhcnQgb2YgPGEgaHJlZj1cImh0dHA6Ly90b2RvbXZjLmNvbVwiPlRvZG9NVkM8L2E+PC9wPlxyXG4gIDwvZm9vdGVyPmBcclxuXHJcbmNvbnN0IGFwcCA9IG5ldyBBcHAoKVxyXG5cclxuYXBwLm1vdW50KHZtb2RlbCkubGluaygndG9kbycpXHJcblxyXG5sZXQgaSA9IDFcclxud2hpbGUoaSA+IDApe1xyXG4gIC8vIGFwcC5jcmVhdGVGcm9tRm4oYE5FVyBUT0RPICR7aX1gKVxyXG4gIGktLVxyXG59XHJcbiIsImltcG9ydCB7IGNhbWVsQ2FzZSB9IGZyb20gJy4vdXRpbCdcclxuaW1wb3J0IHsgY3JlYXRlTW9kZWwgfSBmcm9tICcuLi9rZWV0L3V0aWxzJ1xyXG5cclxuY2xhc3MgQ3JlYXRlRmlsdGVyTW9kZWwgZXh0ZW5kcyBjcmVhdGVNb2RlbCB7XHJcbiAgc3dpdGNoKGhhc2gsIG9iail7XHJcbiAgICB0aGlzLmxpc3QgPSB0aGlzLmxpc3QubWFwKGZpbHRlciA9PlxyXG4gICAgICBmaWx0ZXIuaGFzaCA9PT0gaGFzaCA/ICh7IC4uLmZpbHRlciwgLi4ub2JqfSkgOiAoeyAuLi5maWx0ZXIsIC4uLnsgc2VsZWN0ZWQ6IGZhbHNlIH19KVxyXG4gICAgKVxyXG4gIH1cclxufVxyXG5cclxuY29uc3QgZmlsdGVyTW9kZWwgPSBuZXcgQ3JlYXRlRmlsdGVyTW9kZWwoKVxyXG5cclxuQXJyYXkuZnJvbShbJ2FsbCcsICdhY3RpdmUnLCAnY29tcGxldGVkJ10pLm1hcChwYWdlID0+XHJcblx0ZmlsdGVyTW9kZWwuYWRkKHtcclxuICAgIGhhc2g6IGAjLyR7cGFnZX1gLFxyXG4gICAgbmFtZTogY2FtZWxDYXNlKHBhZ2UpLFxyXG4gICAgc2VsZWN0ZWQ6IGZhbHNlXHJcbiAgfSlcclxuKVxyXG5cclxuZXhwb3J0IGRlZmF1bHQgZmlsdGVyTW9kZWwiLCJpbXBvcnQgS2VldCBmcm9tICcuLi9rZWV0J1xyXG5pbXBvcnQgeyBodG1sIH0gZnJvbSAnLi4va2VldC91dGlscydcclxuaW1wb3J0IGZpbHRlck1vZGVsIGZyb20gJy4vZmlsdGVyLW1vZGVsJ1xyXG5cclxuXHJcbmNsYXNzIEFwcCBleHRlbmRzIEtlZXQge1xyXG4gIGVsID0gJ2ZpbHRlcnMnXHJcbiAgZmlsdGVyTW9kZWwgPSBmaWx0ZXJNb2RlbFxyXG4gIGNvbXBvbmVudFdpbGxNb3VudCgpIHtcclxuICAgIHRoaXMuZmlsdGVyTW9kZWwuc3Vic2NyaWJlKG1vZGVsID0+IHRoaXMuY2FsbEJhdGNoUG9vbFVwZGF0ZSgpKVxyXG4gICAgaWYod2luZG93LmxvY2F0aW9uLmhhc2ggPT0gJycpIHtcclxuICAgICAgd2luZG93Lmhpc3RvcnkucHVzaFN0YXRlKHt9LCBudWxsLCAnIy9hbGwnKVxyXG4gICAgfVxyXG4gIH1cclxuICBjb21wb25lbnREaWRNb3VudCgpe1xyXG4gICAgdGhpcy51cGRhdGVVcmwod2luZG93LmxvY2F0aW9uLmhhc2gpXHJcbiAgICB3aW5kb3cub25wb3BzdGF0ZSA9ICgpID0+IHRoaXMudXBkYXRlVXJsKHdpbmRvdy5sb2NhdGlvbi5oYXNoKVxyXG4gIH1cclxuICB1cGRhdGVVcmwoaGFzaCkge1xyXG4gICAgdGhpcy5maWx0ZXJNb2RlbC5zd2l0Y2goaGFzaCwgeyBzZWxlY3RlZDogdHJ1ZSB9KVxyXG4gIH1cclxufVxyXG5cclxuY29uc3QgZmlsdGVyQXBwID0gbmV3IEFwcCgpXHJcblxyXG5sZXQgdm1vZGVsID0gaHRtbGBcclxuXHQ8dWwgaWQ9XCJmaWx0ZXJzXCIgY2xhc3M9XCJmaWx0ZXJzXCI+XHJcblx0XHQ8IS0tIHt7bW9kZWw6ZmlsdGVyTW9kZWx9fSAtLT5cclxuXHRcdDxsaSBpZD1cInt7bmFtZX19XCIgay1jbGljaz1cInVwZGF0ZVVybCh7e2hhc2h9fSlcIj48YSBjbGFzcz1cInt7c2VsZWN0ZWQ/c2VsZWN0ZWQ6Jyd9fVwiIGhyZWY9XCJ7e2hhc2h9fVwiPnt7bmFtZX19PC9hPjwvbGk+XHJcblx0XHQ8IS0tIHt7L21vZGVsOmZpbHRlck1vZGVsfX0gLS0+XHJcblx0PC91bD5cclxuYFxyXG5cclxuZmlsdGVyQXBwLm1vdW50KHZtb2RlbClcclxuXHJcbmV4cG9ydCBkZWZhdWx0IGZpbHRlckFwcCIsImltcG9ydCBLZWV0IGZyb20gJy4uL2tlZXQnXHJcbmltcG9ydCB7IGNyZWF0ZU1vZGVsIH0gZnJvbSAnLi4va2VldC91dGlscydcclxuXHJcbmNsYXNzIENyZWF0ZU1vZGVsIGV4dGVuZHMgY3JlYXRlTW9kZWwge1xyXG5cclxuICBjbGVhckNvbXBsZXRlZCgpIHtcclxuICAgIHRoaXMubGlzdCA9IHRoaXMubGlzdC5maWx0ZXIodG9kbyA9PiAhdG9kby5jb21wbGV0ZWQpXHJcbiAgfSBcclxufVxyXG5cclxuY29uc3QgdG9kb01vZGVsID0gbmV3IENyZWF0ZU1vZGVsKClcclxuXHJcbi8vIHRvZG9Nb2RlbC5hZGQoe1xyXG4vLyBcdGlkOiAnMTIzNDUnLFxyXG4vLyBcdHRpdGxlOiAnd2hhdCB0aGUnLFxyXG4vLyBcdGNvbXBsZXRlZDogZmFsc2VcclxuLy8gfSlcclxuXHJcbmV4cG9ydCBkZWZhdWx0IHRvZG9Nb2RlbFxyXG4iLCJpbXBvcnQgS2VldCBmcm9tICcuLi9rZWV0J1xyXG5pbXBvcnQgeyBodG1sIH0gZnJvbSAnLi4va2VldC91dGlscydcclxuaW1wb3J0IHRvZG9Nb2RlbCBmcm9tICcuL3RvZG8tbW9kZWwnXHJcblxyXG5jbGFzcyBBcHAgZXh0ZW5kcyBLZWV0IHtcclxuICBlbCA9ICd0b2RvLWxpc3QnXHJcbiAgdG9kb01vZGVsID0gdG9kb01vZGVsXHJcbiAgY29tcG9uZW50V2lsbE1vdW50KCkge1xyXG4gICAgdGhpcy50b2RvTW9kZWwuc3Vic2NyaWJlKG1vZGVsID0+IHtcclxuICAgICAgLy8gY29uc29sZS5sb2cobW9kZWwpXHJcbiAgICAgIHRoaXMuY2FsbEJhdGNoUG9vbFVwZGF0ZSgpXHJcbiAgICAgLy8gdGhpcy5pbmZvcm0obW9kZWwpXHJcbiAgICB9KVxyXG4gIH1cclxuICBhZGRUb2RvKG5ld1RvZG8pe1xyXG4gICAgdGhpcy50b2RvTW9kZWwuYWRkKG5ld1RvZG8pXHJcbiAgfVxyXG4gIGV2dFRvZG8odGFyZ2V0KXtcclxuICAgIGlmKHRhcmdldC5jbGFzc05hbWUgPT09ICd0b2dnbGUnKSAgXHJcbiAgICAgIHRoaXMudG9nZ2xlVG9kbyh0YXJnZXQuZ2V0QXR0cmlidXRlKCdkYXRhLWlkJyksICEhdGFyZ2V0LmNoZWNrZWQpXHJcbiAgICBlbHNlIGlmKHRhcmdldC5jbGFzc05hbWUgPT09ICdkZXN0cm95JykgIFxyXG4gICAgICB0aGlzLnRvZG9EZXN0cm95KHRhcmdldC5nZXRBdHRyaWJ1dGUoJ2RhdGEtaWQnKSlcclxuICB9XHJcbiAgdG9nZ2xlVG9kbyhpZCwgY29tcGxldGVkKSB7XHJcbiAgICB0aGlzLnRvZG9Nb2RlbC51cGRhdGUoICdpZCcsIHsgaWQsIGNvbXBsZXRlZCB9KVxyXG4gIH1cclxuICB0b2RvRGVzdHJveShpZCkge1xyXG4gICAgdGhpcy50b2RvTW9kZWwuZGVzdHJveSgnaWQnLCBpZClcclxuICB9XHJcbiAgZWRpdE1vZGUoKXtcclxuICAgIFxyXG4gIH1cclxufVxyXG5cclxuY29uc3QgdG9kb0FwcCA9IG5ldyBBcHAoKVxyXG5cclxubGV0IHZtb2RlbCA9IGh0bWxgXHJcbiAgPHVsIGlkPVwidG9kby1saXN0XCIgY2xhc3M9XCJ0b2RvLWxpc3RcIiBrLWNsaWNrPVwiZXZ0VG9kbygpXCI+XHJcbiAgICA8IS0tIHt7bW9kZWw6dG9kb01vZGVsfX0gLS0+XHJcbiAgICAgIDxsaSBpZD1cInt7aWR9fVwiIGNsYXNzPVwie3tjb21wbGV0ZWQ/Y29tcGxldGVkOicnfX1cIj5cclxuICAgICAgICA8ZGl2IGNsYXNzPVwidmlld1wiPlxyXG4gICAgICAgICAgPGlucHV0IGNsYXNzPVwidG9nZ2xlXCIgZGF0YS1pZD1cInt7aWR9fVwiIHR5cGU9XCJjaGVja2JveFwiIGNoZWNrZWQ9XCJ7e2NvbXBsZXRlZD9jaGVja2VkOicnfX1cIj5cclxuICAgICAgICAgIDxsYWJlbD57e3RpdGxlfX08L2xhYmVsPlxyXG4gICAgICAgICAgPGJ1dHRvbiBjbGFzcz1cImRlc3Ryb3lcIiBkYXRhLWlkPVwie3tpZH19XCI+PC9idXR0b24+XHJcbiAgICAgICAgPC9kaXY+XHJcbiAgICAgICAgPGlucHV0IGNsYXNzPVwiZWRpdFwiIGRhdGEtaWQ9XCJ7e2lkfX1cIiB2YWx1ZT1cInt7dGl0bGV9fVwiPlxyXG4gICAgICA8L2xpPlxyXG4gICAgPCEtLSB7ey9tb2RlbDp0b2RvTW9kZWx9fSAtLT5cclxuICA8L3VsPlxyXG5gXHJcblxyXG50b2RvQXBwLm1vdW50KHZtb2RlbClcclxuXHJcbmV4cG9ydCBkZWZhdWx0IHRvZG9BcHAiLCJjb25zdCBzdG9yZSA9IGZ1bmN0aW9uKG5hbWVzcGFjZSwgZGF0YSkge1xyXG4gIGlmIChhcmd1bWVudHMubGVuZ3RoID4gMSkge1xyXG4gICAgcmV0dXJuIGxvY2FsU3RvcmFnZS5zZXRJdGVtKG5hbWVzcGFjZSwgSlNPTi5zdHJpbmdpZnkoZGF0YSkpXHJcbiAgfSBlbHNlIHtcclxuICAgIHZhciBzdG9yZSA9IGxvY2FsU3RvcmFnZS5nZXRJdGVtKG5hbWVzcGFjZSlcclxuICAgIHJldHVybiBzdG9yZSAmJiBKU09OLnBhcnNlKHN0b3JlKSB8fCBbXVxyXG4gIH1cclxufVxyXG5cclxuY29uc3QgZ2VuSWQgPSBmdW5jdGlvbigpIHtcclxuICByZXR1cm4gKE1hdGgucm91bmQoTWF0aC5yYW5kb20oKSAqIDB4MSoxZTEyKSkudG9TdHJpbmcoMzIpXHJcbn1cclxuXHJcbmNvbnN0IGNhbWVsQ2FzZSA9IGZ1bmN0aW9uKHMpIHtcclxuICByZXR1cm4gcy5jaGFyQXQoMCkudG9VcHBlckNhc2UoKSArIHMuc2xpY2UoMSlcclxufVxyXG5cclxuY29uc3QgaHRtbCA9IGZ1bmN0aW9uIChsaXRlcmFsU2VjdGlvbnMsIC4uLnN1YnN0cykge1xyXG4gIC8vIFVzZSByYXcgbGl0ZXJhbCBzZWN0aW9uczogd2UgZG9u4oCZdCB3YW50XHJcbiAgLy8gYmFja3NsYXNoZXMgKFxcbiBldGMuKSB0byBiZSBpbnRlcnByZXRlZFxyXG4gIGxldCByYXcgPSBsaXRlcmFsU2VjdGlvbnMucmF3O1xyXG5cclxuICBsZXQgcmVzdWx0ID0gJyc7XHJcblxyXG4gIHN1YnN0cy5mb3JFYWNoKChzdWJzdCwgaSkgPT4ge1xyXG4gICAgICAvLyBSZXRyaWV2ZSB0aGUgbGl0ZXJhbCBzZWN0aW9uIHByZWNlZGluZ1xyXG4gICAgICAvLyB0aGUgY3VycmVudCBzdWJzdGl0dXRpb25cclxuICAgICAgbGV0IGxpdCA9IHJhd1tpXTtcclxuXHJcbiAgICAgIC8vIEluIHRoZSBleGFtcGxlLCBtYXAoKSByZXR1cm5zIGFuIGFycmF5OlxyXG4gICAgICAvLyBJZiBzdWJzdGl0dXRpb24gaXMgYW4gYXJyYXkgKGFuZCBub3QgYSBzdHJpbmcpLFxyXG4gICAgICAvLyB3ZSB0dXJuIGl0IGludG8gYSBzdHJpbmdcclxuICAgICAgaWYgKEFycmF5LmlzQXJyYXkoc3Vic3QpKSB7XHJcbiAgICAgICAgICBzdWJzdCA9IHN1YnN0LmpvaW4oJycpO1xyXG4gICAgICB9XHJcblxyXG4gICAgICAvLyBJZiB0aGUgc3Vic3RpdHV0aW9uIGlzIHByZWNlZGVkIGJ5IGEgZG9sbGFyIHNpZ24sXHJcbiAgICAgIC8vIHdlIGVzY2FwZSBzcGVjaWFsIGNoYXJhY3RlcnMgaW4gaXRcclxuICAgICAgaWYgKGxpdC5lbmRzV2l0aCgnJCcpKSB7XHJcbiAgICAgICAgICBzdWJzdCA9IGh0bWxFc2NhcGUoc3Vic3QpO1xyXG4gICAgICAgICAgbGl0ID0gbGl0LnNsaWNlKDAsIC0xKTtcclxuICAgICAgfVxyXG4gICAgICByZXN1bHQgKz0gbGl0O1xyXG4gICAgICByZXN1bHQgKz0gc3Vic3Q7XHJcbiAgfSk7XHJcbiAgLy8gVGFrZSBjYXJlIG9mIGxhc3QgbGl0ZXJhbCBzZWN0aW9uXHJcbiAgLy8gKE5ldmVyIGZhaWxzLCBiZWNhdXNlIGFuIGVtcHR5IHRlbXBsYXRlIHN0cmluZ1xyXG4gIC8vIHByb2R1Y2VzIG9uZSBsaXRlcmFsIHNlY3Rpb24sIGFuIGVtcHR5IHN0cmluZylcclxuICByZXN1bHQgKz0gcmF3W3Jhdy5sZW5ndGgtMV07IC8vIChBKVxyXG5cclxuICByZXR1cm4gcmVzdWx0O1xyXG59XHJcblxyXG5leHBvcnQge1xyXG4gIGh0bWwgYXMgZGVmYXVsdCxcclxuICBnZW5JZCxcclxuICBzdG9yZSxcclxuICBjYW1lbENhc2VcclxufSJdfQ==
