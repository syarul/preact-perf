(function(){function r(e,n,t){function o(i,f){if(!n[i]){if(!e[i]){var c="function"==typeof require&&require;if(!f&&c)return c(i,!0);if(u)return u(i,!0);var a=new Error("Cannot find module '"+i+"'");throw a.code="MODULE_NOT_FOUND",a}var p=n[i]={exports:{}};e[i][0].call(p.exports,function(r){var n=e[i][1][r];return o(n||r)},p,p.exports,r,e,n,t)}return n[i].exports}for(var u="function"==typeof require&&require,i=0;i<t.length;i++)o(t[i]);return o}return r})()({1:[function(require,module,exports){
var assert = require('../utils').assert
var getId = require('../utils').getId
module.exports = function (componentStr, node) {
  var component = componentStr.replace('component:', '')
  var c = this[component]
  var el 
  var frag
  if (c !== undefined) {
  	// check if sub-component node exist in the DOM
  	el = getId(c.el)
  	if(el){
  	  // replace it with the rootNode of sub-component
  	  node.parentNode.replaceChild(el.cloneNode(), node)
  	  return
  	}
    frag = document.createDocumentFragment()
    c.base = c.__pristineFragment__.cloneNode(true)
    c.render.call(c, frag)
    node.parentNode.replaceChild(frag, node)
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
var trottle = require('../utils').trottle

var override
var el

var morpher = function () {
  // console.trace(1)
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
}

// var int
var updateContext = trottle(morpher, 1)
// function(){
//   if(int)clearTimeout(int)
//   int = setTimeout(function(){
//     morpher.call(this)
//   }.call(this), 10)
// }

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
          updateContext.call(this)
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
          updateContext.call(this)
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
    if (node.hasAttribute('evt-node') && node.hasAttribute('id') && getId(node.id)) {
      return true
    }
    return false
  }

  function addEvent (node) {
    nodeAttributes = node.attributes

    if (node && lookUpEvtNode(node)) {
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
          }
        }
        // if(i === 0){
        //   rem.map(function (f) { node.removeAttribute(f) })
        // }
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

var parseStr = require('./components/parseStr')
var updateContext = require('./components/genElement').updateContext
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
function Keet () {}

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
  return this
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
  updateContext.call(this)
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
      hash = '49ffdbcc0326c5f871601f30f04efa605e3fa44b',
      Function = function () {}.constructor,
      global = new Function('return this')(),
      gcv = '__coverage__',
      coverageData = {
    path: 'D:\\distro\\preact-perf\\todomvc\\keetjs\\keet\\utils.js',
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

cov_140h9s3pvc.s[0]++;
var getId = function getId(id) {
  cov_140h9s3pvc.f[0]++;
  cov_140h9s3pvc.s[1]++;

  return document.getElementById(id);
};

cov_140h9s3pvc.s[2]++;
exports.getId = getId;

cov_140h9s3pvc.s[3]++;
exports.testEvent = function (tmpl) {
  cov_140h9s3pvc.f[1]++;
  cov_140h9s3pvc.s[4]++;

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
cov_140h9s3pvc.s[5]++;
exports.checkNodeAvailability = function (component, componentName, callback, notFound) {
  cov_140h9s3pvc.f[2]++;

  var ele = (cov_140h9s3pvc.s[6]++, getId(component.el));
  var found = (cov_140h9s3pvc.s[7]++, false);
  cov_140h9s3pvc.s[8]++;
  if (ele) {
      cov_140h9s3pvc.b[0][0]++;
      cov_140h9s3pvc.s[9]++;
      return ele;
    } else {
    cov_140h9s3pvc.b[0][1]++;

    var t = (cov_140h9s3pvc.s[10]++, setInterval(function () {
      cov_140h9s3pvc.f[3]++;
      cov_140h9s3pvc.s[11]++;

      ele = getId(component.el);
      cov_140h9s3pvc.s[12]++;
      if (ele) {
        cov_140h9s3pvc.b[1][0]++;
        cov_140h9s3pvc.s[13]++;

        clearInterval(t);
        cov_140h9s3pvc.s[14]++;
        found = true;
        cov_140h9s3pvc.s[15]++;
        callback(component, componentName, ele);
      } else {
        cov_140h9s3pvc.b[1][1]++;
      }
    }, 0));
    // silently ignore finding the node after sometimes
    cov_140h9s3pvc.s[16]++;
    setTimeout(function () {
      cov_140h9s3pvc.f[4]++;
      cov_140h9s3pvc.s[17]++;

      clearInterval(t);
      cov_140h9s3pvc.s[18]++;
      if ((cov_140h9s3pvc.b[3][0]++, !found) && (cov_140h9s3pvc.b[3][1]++, notFound) && (cov_140h9s3pvc.b[3][2]++, typeof notFound === 'function')) {
          cov_140h9s3pvc.b[2][0]++;
          cov_140h9s3pvc.s[19]++;
          notFound();
        } else {
        cov_140h9s3pvc.b[2][1]++;
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
cov_140h9s3pvc.s[20]++;
exports.assert = function (val, msg) {
  cov_140h9s3pvc.f[5]++;
  cov_140h9s3pvc.s[21]++;

  if (!val) {
      cov_140h9s3pvc.b[4][0]++;
      cov_140h9s3pvc.s[22]++;
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
cov_140h9s3pvc.s[23]++;
exports.html = function html() {
  cov_140h9s3pvc.f[6]++;

  var literals = (cov_140h9s3pvc.s[24]++, [].shift.call(arguments));
  var substs = (cov_140h9s3pvc.s[25]++, [].slice.call(arguments));

  var result = (cov_140h9s3pvc.s[26]++, literals.raw.reduce(function (acc, lit, i) {
    cov_140h9s3pvc.f[7]++;
    cov_140h9s3pvc.s[27]++;

    return acc + substs[i - 1] + lit;
  }));
  // remove spacing, indentation from every line
  cov_140h9s3pvc.s[28]++;
  result = result.split(/\n+/);
  cov_140h9s3pvc.s[29]++;
  result = result.map(function (t) {
    cov_140h9s3pvc.f[8]++;
    cov_140h9s3pvc.s[30]++;

    return t.trim();
  }).join('');
  cov_140h9s3pvc.s[31]++;
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
  cov_140h9s3pvc.f[9]++;

  var timer = (cov_140h9s3pvc.s[32]++, null);
  cov_140h9s3pvc.s[33]++;
  return function () {
    cov_140h9s3pvc.f[10]++;

    var context = (cov_140h9s3pvc.s[34]++, this),
        args = (cov_140h9s3pvc.s[35]++, arguments);
    cov_140h9s3pvc.s[36]++;
    clearTimeout(timer);
    cov_140h9s3pvc.s[37]++;
    timer = setTimeout(function () {
      cov_140h9s3pvc.f[11]++;
      cov_140h9s3pvc.s[38]++;

      fn.apply(context, args);
    }, delay);
  };
};

cov_140h9s3pvc.s[39]++;
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
  cov_140h9s3pvc.f[12]++;

  var model = (cov_140h9s3pvc.s[40]++, []);
  var onChanges = (cov_140h9s3pvc.s[41]++, []);

  cov_140h9s3pvc.s[42]++;
  var inform = function inform() {
    cov_140h9s3pvc.f[13]++;
    cov_140h9s3pvc.s[43]++;

    // console.log(onChanges)
    for (var i = onChanges.length; i--;) {
      cov_140h9s3pvc.s[44]++;

      onChanges[i](model);
    }
  };

  /**
   * @private
   * @description
   * Register callback listener of any changes
   */
  cov_140h9s3pvc.s[45]++;
  Object.defineProperty(this, 'list', {
    enumerable: false,
    configurable: true,
    get: function get() {
      cov_140h9s3pvc.f[14]++;
      cov_140h9s3pvc.s[46]++;

      return model;
    },
    set: function set(val) {
      cov_140h9s3pvc.f[15]++;
      cov_140h9s3pvc.s[47]++;

      model = val;
      cov_140h9s3pvc.s[48]++;
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
  cov_140h9s3pvc.s[49]++;
  this.subscribe = function (fn) {
    cov_140h9s3pvc.f[16]++;
    cov_140h9s3pvc.s[50]++;

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
  cov_140h9s3pvc.s[51]++;
  this.add = function (obj) {
    cov_140h9s3pvc.f[17]++;
    cov_140h9s3pvc.s[52]++;

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
  cov_140h9s3pvc.s[53]++;
  this.update = function (lookupId, updateObj) {
    cov_140h9s3pvc.f[18]++;
    cov_140h9s3pvc.s[54]++;

    this.list = this.list.map(function (obj) {
      cov_140h9s3pvc.f[19]++;
      cov_140h9s3pvc.s[55]++;

      return obj[lookupId] !== updateObj[lookupId] ? (cov_140h9s3pvc.b[5][0]++, obj) : (cov_140h9s3pvc.b[5][1]++, Object.assign(obj, updateObj));
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
  cov_140h9s3pvc.s[56]++;
  this.destroy = function (lookupId, objId) {
    cov_140h9s3pvc.f[20]++;
    cov_140h9s3pvc.s[57]++;

    this.list = this.list.filter(function (obj) {
      cov_140h9s3pvc.f[21]++;
      cov_140h9s3pvc.s[58]++;

      return obj[lookupId] !== objId;
    });
  };
}

cov_140h9s3pvc.s[59]++;
exports.createModel = createModel;

},{}],14:[function(require,module,exports){
'use strict';

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _templateObject = _taggedTemplateLiteral(['\n  <section class="todoapp">\n    <header id="header">\n      <h1>todos</h1>\n      <input class="new-todo" k-keydown="create()" placeholder="What needs to be done?" autofocus>\n    </header>\n    <!-- {{?todoState}} -->\n    <section class="main">\n      <input id="toggle-all" class="toggle-all" type="checkbox" checked="{{isChecked?checked:\'\'}}" k-click="completeAll()">\n      <label for="toggle-all">Mark all as complete</label>\n      <!-- {{component:todoApp}} -->\n    </section>\n    <footer class="footer">\n      <span class="todo-count">\n        <strong>{{count}}</strong> item{{plural}} left\n      </span>\n      <!-- {{component:filter}} -->\n      <!-- {{?clearToggle}} -->\n      <button id="clear-completed" class="clear-completed">Clear completed</button>\n      <!-- {{/clearToggle}} -->\n    </footer>\n    <!-- {{/todoState}} -->\n  </section>\n  <footer class="info">\n    <p>Double-click to edit a todo</p>\n    <p>Created by <a href="https://github.com/syarul">Shahrul Nizam Selamat</a></p>\n    <p>Part of <a href="http://todomvc.com">TodoMVC</a></p>\n  </footer>'], ['\n  <section class="todoapp">\n    <header id="header">\n      <h1>todos</h1>\n      <input class="new-todo" k-keydown="create()" placeholder="What needs to be done?" autofocus>\n    </header>\n    <!-- {{?todoState}} -->\n    <section class="main">\n      <input id="toggle-all" class="toggle-all" type="checkbox" checked="{{isChecked?checked:\'\'}}" k-click="completeAll()">\n      <label for="toggle-all">Mark all as complete</label>\n      <!-- {{component:todoApp}} -->\n    </section>\n    <footer class="footer">\n      <span class="todo-count">\n        <strong>{{count}}</strong> item{{plural}} left\n      </span>\n      <!-- {{component:filter}} -->\n      <!-- {{?clearToggle}} -->\n      <button id="clear-completed" class="clear-completed">Clear completed</button>\n      <!-- {{/clearToggle}} -->\n    </footer>\n    <!-- {{/todoState}} -->\n  </section>\n  <footer class="info">\n    <p>Double-click to edit a todo</p>\n    <p>Created by <a href="https://github.com/syarul">Shahrul Nizam Selamat</a></p>\n    <p>Part of <a href="http://todomvc.com">TodoMVC</a></p>\n  </footer>']);

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

    return _ret = (_temp = (_this = _possibleConstructorReturn(this, (_ref = App.__proto__ || Object.getPrototypeOf(App)).call.apply(_ref, [this].concat(args))), _this), _this.todoApp = _todo2.default, _this.filter = _filter2.default, _this.isChecked = false, _this.count = 0, _this.plural = '', _this.clearToggle = false, _temp), _possibleConstructorReturn(_this, _ret);
  }

  _createClass(App, [{
    key: 'componentWillMount',

    // todoState = true

    value: function componentWillMount() {
      var _this2 = this;

      // this.todoModel.subscribe(todos => this.callBatchPoolUpdate())
      // this.todoState = this.todoApp.todoModel.list.length ? true : false
      // const self = this
      (0, _todo.subscribe)(function (todos) {
        // console.log(todos)
        var uncompleted = todos.filter(function (c) {
          return !c.completed;
        });
        // let completed = todos.filter(c => c.completed)
        // this.clearToggle = completed.length ? true : false
        // this.todoState = todos.length ? true : false
        // this.plural = uncompleted.length === 1 ? '' : 's'
        _this2.count = uncompleted.length;
        // console.log(this)
        // this.callBatchPoolUpdate()
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

exports.default = todoModel;

},{"../keet":10,"../keet/utils":13}],18:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.subscribe = exports.default = undefined;

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _templateObject = _taggedTemplateLiteral(['\n  <ul id="todo-list" class="todo-list" k-click="evtTodo()" k-dblclick="editMode()">\n    <!-- {{model:todoModel}} -->\n      <li id="{{id}}" class="{{completed?completed:\'\'}}">\n        <div class="view">\n          <input class="toggle" data-id="{{id}}" type="checkbox" checked="{{completed?checked:\'\'}}">\n          <label>{{title}}</label>\n          <button class="destroy" data-id="{{id}}"></button>\n        </div>\n        <input class="edit" data-id="{{id}}" value="{{title}}">\n      </li>\n    <!-- {{/model:todoModel}} -->\n  </ul>\n'], ['\n  <ul id="todo-list" class="todo-list" k-click="evtTodo()" k-dblclick="editMode()">\n    <!-- {{model:todoModel}} -->\n      <li id="{{id}}" class="{{completed?completed:\'\'}}">\n        <div class="view">\n          <input class="toggle" data-id="{{id}}" type="checkbox" checked="{{completed?checked:\'\'}}">\n          <label>{{title}}</label>\n          <button class="destroy" data-id="{{id}}"></button>\n        </div>\n        <input class="edit" data-id="{{id}}" value="{{title}}">\n      </li>\n    <!-- {{/model:todoModel}} -->\n  </ul>\n']);

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

var onChanges = [];

var subscribe = function subscribe(fn) {
  return onChanges.push(fn);
};

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
        for (var i = onChanges.length; i--;) {
          onChanges[i](model);
        }
        _this2.callBatchPoolUpdate();
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
  }, {
    key: 'inform',
    value: function inform() {}
  }]);

  return App;
}(_keet2.default);

var todoApp = new App();

var vmodel = (0, _utils.html)(_templateObject);

todoApp.mount(vmodel);

exports.default = todoApp;
exports.subscribe = subscribe;

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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIkM6L1VzZXJzL3BpcGV5L0FwcERhdGEvUm9hbWluZy9ucG0vbm9kZV9tb2R1bGVzL2Jyb3dzZXJpZnkvbm9kZV9tb2R1bGVzL2Jyb3dzZXItcGFjay9fcHJlbHVkZS5qcyIsImtlZXQvY29tcG9uZW50cy9jb21wb25lbnRQYXJzZS5qcyIsImtlZXQvY29tcG9uZW50cy9jb25kaXRpb25hbE5vZGVzLmpzIiwia2VldC9jb21wb25lbnRzL2dlbkVsZW1lbnQuanMiLCJrZWV0L2NvbXBvbmVudHMvZ2VuTW9kZWxMaXN0LmpzIiwia2VldC9jb21wb25lbnRzL2dlbk1vZGVsVGVtcGxhdGUuanMiLCJrZWV0L2NvbXBvbmVudHMvcGFyc2VTdHIuanMiLCJrZWV0L2NvbXBvbmVudHMvc3RySW50ZXJwcmV0ZXIuanMiLCJrZWV0L2NvbXBvbmVudHMvdGVybmFyeU9wcy5qcyIsImtlZXQvY29tcG9uZW50cy90bXBsSGFuZGxlci5qcyIsImtlZXQva2VldC5qcyIsImtlZXQvbm9kZV9tb2R1bGVzL3NldC1kb20vc3JjL2luZGV4LmpzIiwia2VldC9ub2RlX21vZHVsZXMvc2V0LWRvbS9zcmMvcGFyc2UtaHRtbC5qcyIsImtlZXQvdXRpbHMuanMiLCJzcmMvYXBwLmpzIiwic3JjL2ZpbHRlci1tb2RlbC5qcyIsInNyYy9maWx0ZXIuanMiLCJzcmMvdG9kby1tb2RlbC5qcyIsInNyYy90b2RvLmpzIiwic3JjL3V0aWwuanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7QUNBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDdkJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDbENBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNyR0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDdEpBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDekJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzlCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDUkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzdCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDdk5BO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3hIQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNwVUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQ2hGQSxJQUFJLFFBQVEsU0FBUixLQUFRLENBQVUsRUFBVixFQUFjO0FBQUE7QUFBQTs7QUFDeEIsU0FBTyxTQUFTLGNBQVQsQ0FBd0IsRUFBeEIsQ0FBUDtBQUNELENBRkQ7OztBQUlBLFFBQVEsS0FBUixHQUFnQixLQUFoQjs7O0FBRUEsUUFBUSxTQUFSLEdBQW9CLFVBQVUsSUFBVixFQUFnQjtBQUFBO0FBQUE7O0FBQ2xDLFNB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QixTQUFPLE1BQVA7QUFDRCxDQWxDRDs7UUFxQ1UsTyxHQUFSLEk7UUFDQSxLLEdBQUEsSztRQUNBLEssR0FBQSxLO1FBQ0EsUyxHQUFBLFMiLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXNDb250ZW50IjpbIihmdW5jdGlvbigpe2Z1bmN0aW9uIHIoZSxuLHQpe2Z1bmN0aW9uIG8oaSxmKXtpZighbltpXSl7aWYoIWVbaV0pe3ZhciBjPVwiZnVuY3Rpb25cIj09dHlwZW9mIHJlcXVpcmUmJnJlcXVpcmU7aWYoIWYmJmMpcmV0dXJuIGMoaSwhMCk7aWYodSlyZXR1cm4gdShpLCEwKTt2YXIgYT1uZXcgRXJyb3IoXCJDYW5ub3QgZmluZCBtb2R1bGUgJ1wiK2krXCInXCIpO3Rocm93IGEuY29kZT1cIk1PRFVMRV9OT1RfRk9VTkRcIixhfXZhciBwPW5baV09e2V4cG9ydHM6e319O2VbaV1bMF0uY2FsbChwLmV4cG9ydHMsZnVuY3Rpb24ocil7dmFyIG49ZVtpXVsxXVtyXTtyZXR1cm4gbyhufHxyKX0scCxwLmV4cG9ydHMscixlLG4sdCl9cmV0dXJuIG5baV0uZXhwb3J0c31mb3IodmFyIHU9XCJmdW5jdGlvblwiPT10eXBlb2YgcmVxdWlyZSYmcmVxdWlyZSxpPTA7aTx0Lmxlbmd0aDtpKyspbyh0W2ldKTtyZXR1cm4gb31yZXR1cm4gcn0pKCkiLCJ2YXIgYXNzZXJ0ID0gcmVxdWlyZSgnLi4vdXRpbHMnKS5hc3NlcnRcclxudmFyIGdldElkID0gcmVxdWlyZSgnLi4vdXRpbHMnKS5nZXRJZFxyXG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uIChjb21wb25lbnRTdHIsIG5vZGUpIHtcclxuICB2YXIgY29tcG9uZW50ID0gY29tcG9uZW50U3RyLnJlcGxhY2UoJ2NvbXBvbmVudDonLCAnJylcclxuICB2YXIgYyA9IHRoaXNbY29tcG9uZW50XVxyXG4gIHZhciBlbCBcclxuICB2YXIgZnJhZ1xyXG4gIGlmIChjICE9PSB1bmRlZmluZWQpIHtcclxuICBcdC8vIGNoZWNrIGlmIHN1Yi1jb21wb25lbnQgbm9kZSBleGlzdCBpbiB0aGUgRE9NXHJcbiAgXHRlbCA9IGdldElkKGMuZWwpXHJcbiAgXHRpZihlbCl7XHJcbiAgXHQgIC8vIHJlcGxhY2UgaXQgd2l0aCB0aGUgcm9vdE5vZGUgb2Ygc3ViLWNvbXBvbmVudFxyXG4gIFx0ICBub2RlLnBhcmVudE5vZGUucmVwbGFjZUNoaWxkKGVsLmNsb25lTm9kZSgpLCBub2RlKVxyXG4gIFx0ICByZXR1cm5cclxuICBcdH1cclxuICAgIGZyYWcgPSBkb2N1bWVudC5jcmVhdGVEb2N1bWVudEZyYWdtZW50KClcclxuICAgIGMuYmFzZSA9IGMuX19wcmlzdGluZUZyYWdtZW50X18uY2xvbmVOb2RlKHRydWUpXHJcbiAgICBjLnJlbmRlci5jYWxsKGMsIGZyYWcpXHJcbiAgICBub2RlLnBhcmVudE5vZGUucmVwbGFjZUNoaWxkKGZyYWcsIG5vZGUpXHJcbiAgfSBlbHNlIHtcclxuICAgIGFzc2VydChmYWxzZSwgJ0NvbXBvbmVudCAnICsgY29tcG9uZW50ICsgJyBkb2VzIG5vdCBleGlzdC4nKVxyXG4gIH1cclxufVxyXG4iLCJ2YXIgY29uZGl0aW9uYWxOb2Rlc1Jhd1N0YXJ0ID0gL1xce1xce1xcPyhbXnt9XSspXFx9XFx9L2dcclxudmFyIGNvbmRpdGlvbmFsTm9kZXNSYXdFbmQgPSAvXFx7XFx7XFwvKFtee31dKylcXH1cXH0vZ1xyXG52YXIgRE9DVU1FTlRfRUxFTUVOVF9UWVBFID0gMVxyXG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uIChub2RlLCBjb25kaXRpb25hbCwgdG1wbEhhbmRsZXIpIHtcclxuICB2YXIgZW50cnlOb2RlXHJcbiAgdmFyIGN1cnJlbnROb2RlXHJcbiAgdmFyIGlzR2VuXHJcbiAgdmFyIGZyYWcgPSBkb2N1bWVudC5jcmVhdGVEb2N1bWVudEZyYWdtZW50KClcclxuICB3aGlsZSAobm9kZSkge1xyXG4gICAgY3VycmVudE5vZGUgPSBub2RlXHJcbiAgICBub2RlID0gbm9kZS5uZXh0U2libGluZ1xyXG4gICAgaWYgKGN1cnJlbnROb2RlLm5vZGVUeXBlICE9PSBET0NVTUVOVF9FTEVNRU5UX1RZUEUpIHtcclxuICAgICAgaWYgKGN1cnJlbnROb2RlLm5vZGVWYWx1ZS5tYXRjaChjb25kaXRpb25hbE5vZGVzUmF3U3RhcnQpKSB7XHJcbiAgICAgICAgZW50cnlOb2RlID0gY3VycmVudE5vZGVcclxuICAgICAgfSBlbHNlIGlmIChjdXJyZW50Tm9kZS5ub2RlVmFsdWUubWF0Y2goY29uZGl0aW9uYWxOb2Rlc1Jhd0VuZCkpIHtcclxuICAgICAgICBjdXJyZW50Tm9kZS5yZW1vdmUoKVxyXG4gICAgICAgIC8vIHN0YXIgZ2VuZXJhdGluZyB0aGUgY29uZGl0aW9uYWwgbm9kZXMgcmFuZ2UsIGlmIG5vdCB5ZXRcclxuICAgICAgICBpZiAoIWlzR2VuKSB7XHJcbiAgICAgICAgICBpc0dlbiA9IHRydWVcclxuICAgICAgICAgIHRtcGxIYW5kbGVyKHRoaXMsIG51bGwsIG51bGwsIG51bGwsIGZyYWcpXHJcbiAgICAgICAgfVxyXG4gICAgICAgIGlmICh0aGlzW2NvbmRpdGlvbmFsXSkge1xyXG4gICAgICAgICAgZW50cnlOb2RlLnBhcmVudE5vZGUuaW5zZXJ0QmVmb3JlKGZyYWcsIGVudHJ5Tm9kZSlcclxuICAgICAgICB9XHJcbiAgICAgICAgZW50cnlOb2RlLnJlbW92ZSgpXHJcbiAgICAgICAgbm9kZSA9IG51bGxcclxuICAgICAgfVxyXG4gICAgfSBlbHNlIHtcclxuICAgICAgdmFyIGNOb2RlID0gY3VycmVudE5vZGUuY2xvbmVOb2RlKHRydWUpXHJcbiAgICAgIGZyYWcuYXBwZW5kQ2hpbGQoY05vZGUpXHJcbiAgICAgIGN1cnJlbnROb2RlLnJlbW92ZSgpXHJcbiAgICB9XHJcbiAgfVxyXG59XHJcbiIsInZhciB0bXBsSGFuZGxlciA9IHJlcXVpcmUoJy4vdG1wbEhhbmRsZXInKVxyXG52YXIgc3RySW50ZXJwcmV0ZXIgPSByZXF1aXJlKCcuL3N0ckludGVycHJldGVyJylcclxudmFyIG1vcnBoID0gcmVxdWlyZSgnc2V0LWRvbScpXHJcbnZhciBnZXRJZCA9IHJlcXVpcmUoJy4uL3V0aWxzJykuZ2V0SWRcclxudmFyIHRyb3R0bGUgPSByZXF1aXJlKCcuLi91dGlscycpLnRyb3R0bGVcclxuXHJcbnZhciBvdmVycmlkZVxyXG52YXIgZWxcclxuXHJcbnZhciBtb3JwaGVyID0gZnVuY3Rpb24gKCkge1xyXG4gIC8vIGNvbnNvbGUudHJhY2UoMSlcclxuICAvLyBjb25zb2xlLnRpbWUoJ3InKVxyXG4gIGVsID0gZ2V0SWQodGhpcy5lbClcclxuICBnZW5FbGVtZW50LmNhbGwodGhpcylcclxuICBpZihlbCkge1xyXG4gICAgdGhpcy5JU19TVFVCID8gbW9ycGgoZWwsIHRoaXMuYmFzZS5maXJzdENoaWxkKSA6IG1vcnBoKGVsLCB0aGlzLmJhc2UpXHJcbiAgfVxyXG4gIC8vIGV4ZWMgbGlmZS1jeWNsZSBjb21wb25lbnREaWRVcGRhdGVcclxuICBpZiAodGhpcy5jb21wb25lbnREaWRVcGRhdGUgJiYgdHlwZW9mIHRoaXMuY29tcG9uZW50RGlkVXBkYXRlID09PSAnZnVuY3Rpb24nKSB7XHJcbiAgICB0aGlzLmNvbXBvbmVudERpZFVwZGF0ZSgpXHJcbiAgfVxyXG4gIC8vIGNvbnNvbGUudGltZUVuZCgncicpXHJcbn1cclxuXHJcbi8vIHZhciBpbnRcclxudmFyIHVwZGF0ZUNvbnRleHQgPSB0cm90dGxlKG1vcnBoZXIsIDEpXHJcbi8vIGZ1bmN0aW9uKCl7XHJcbi8vICAgaWYoaW50KWNsZWFyVGltZW91dChpbnQpXHJcbi8vICAgaW50ID0gc2V0VGltZW91dChmdW5jdGlvbigpe1xyXG4vLyAgICAgbW9ycGhlci5jYWxsKHRoaXMpXHJcbi8vICAgfS5jYWxsKHRoaXMpLCAxMClcclxuLy8gfVxyXG5cclxudmFyIG5leHRTdGF0ZSA9IGZ1bmN0aW9uIChpKSB7XHJcbiAgdmFyIHN0YXRlXHJcbiAgdmFyIHZhbHVlXHJcbiAgaWYgKGkgPCBzdGF0ZUxpc3QubGVuZ3RoKSB7XHJcbiAgICBzdGF0ZSA9IHN0YXRlTGlzdFtpXVxyXG4gICAgdmFsdWUgPSB0aGlzW3N0YXRlXVxyXG5cclxuICAgIC8vIGlmIHZhbHVlIGlzIHVuZGVmaW5lZCwgbGlrZWx5IGhhcyBvYmplY3Qgbm90YXRpb24gd2UgY29udmVydCBpdCB0byBhcnJheVxyXG4gICAgaWYgKHZhbHVlID09PSB1bmRlZmluZWQpIHZhbHVlID0gc3RySW50ZXJwcmV0ZXIoc3RhdGUpXHJcblxyXG4gICAgaWYgKHZhbHVlICYmIEFycmF5LmlzQXJyYXkodmFsdWUpKSB7XHJcbiAgICAgIC8vIHVzaW5nIHNwbGl0IG9iamVjdCBub3RhdGlvbiBhcyBiYXNlIGZvciBzdGF0ZSB1cGRhdGVcclxuICAgICAgLy8gY29uc29sZS5sb2codmFsdWUpXHJcbiAgICAgIHZhciBpblZhbCA9IHRoaXNbdmFsdWVbMF1dW3ZhbHVlWzFdXVxyXG4gICAgICBPYmplY3QuZGVmaW5lUHJvcGVydHkodGhpc1t2YWx1ZVswXV0sIHZhbHVlWzFdLCB7XHJcbiAgICAgICAgZW51bWVyYWJsZTogZmFsc2UsXHJcbiAgICAgICAgY29uZmlndXJhYmxlOiB0cnVlLFxyXG4gICAgICAgIGdldDogZnVuY3Rpb24gKCkge1xyXG4gICAgICAgICAgcmV0dXJuIGluVmFsXHJcbiAgICAgICAgfSxcclxuICAgICAgICBzZXQ6IGZ1bmN0aW9uICh2YWwpIHtcclxuICAgICAgICAgIGluVmFsID0gdmFsXHJcbiAgICAgICAgICB1cGRhdGVDb250ZXh0LmNhbGwodGhpcylcclxuICAgICAgICB9LmJpbmQodGhpcylcclxuICAgICAgfSlcclxuICAgIH0gZWxzZSB7XHJcbiAgICAgIC8vIGhhbmRsZSBwYXJlbnQgc3RhdGUgdXBkYXRlIGlmIHRoZSBzdGF0ZSBpcyBub3QgYW4gb2JqZWN0XHJcbiAgICAgIE9iamVjdC5kZWZpbmVQcm9wZXJ0eSh0aGlzLCBzdGF0ZSwge1xyXG4gICAgICAgIGVudW1lcmFibGU6IGZhbHNlLFxyXG4gICAgICAgIGNvbmZpZ3VyYWJsZTogdHJ1ZSxcclxuICAgICAgICBnZXQ6IGZ1bmN0aW9uICgpIHtcclxuICAgICAgICAgIHJldHVybiB2YWx1ZVxyXG4gICAgICAgIH0sXHJcbiAgICAgICAgc2V0OiBmdW5jdGlvbiAodmFsKSB7XHJcbiAgICAgICAgICB2YWx1ZSA9IHZhbFxyXG4gICAgICAgICAgdXBkYXRlQ29udGV4dC5jYWxsKHRoaXMpXHJcbiAgICAgICAgfS5iaW5kKHRoaXMpXHJcbiAgICAgIH0pXHJcbiAgICB9XHJcbiAgICBpKytcclxuICAgIG5leHRTdGF0ZS5jYWxsKHRoaXMsIGkpXHJcbiAgfVxyXG59XHJcblxyXG52YXIgc2V0U3RhdGUgPSBmdW5jdGlvbiAoKSB7XHJcbiAgbmV4dFN0YXRlLmNhbGwodGhpcywgMClcclxufVxyXG5cclxudmFyIHN0YXRlTGlzdCA9IFtdXHJcblxyXG52YXIgY2xlYXJTdGF0ZSA9IGZ1bmN0aW9uICgpIHtcclxuICBzdGF0ZUxpc3QgPSBbXVxyXG59XHJcblxyXG52YXIgYWRkU3RhdGUgPSBmdW5jdGlvbiAoc3RhdGUpIHtcclxuICBpZiAoc3RhdGVMaXN0LmluZGV4T2Yoc3RhdGUpID09PSAtMSkgc3RhdGVMaXN0ID0gc3RhdGVMaXN0LmNvbmNhdChzdGF0ZSlcclxufVxyXG5cclxudmFyIGdlbkVsZW1lbnQgPSBmdW5jdGlvbiAoKSB7XHJcbiAgdGhpcy5iYXNlID0gdGhpcy5fX3ByaXN0aW5lRnJhZ21lbnRfXy5jbG9uZU5vZGUodHJ1ZSlcclxuICB0bXBsSGFuZGxlcih0aGlzLCBhZGRTdGF0ZSlcclxufVxyXG5cclxuZXhwb3J0cy5nZW5FbGVtZW50ID0gZ2VuRWxlbWVudFxyXG5leHBvcnRzLmFkZFN0YXRlID0gYWRkU3RhdGVcclxuZXhwb3J0cy5zZXRTdGF0ZSA9IHNldFN0YXRlXHJcbmV4cG9ydHMuY2xlYXJTdGF0ZSA9IGNsZWFyU3RhdGVcclxuZXhwb3J0cy51cGRhdGVDb250ZXh0ID0gdXBkYXRlQ29udGV4dFxyXG4iLCJ2YXIgYXNzZXJ0ID0gcmVxdWlyZSgnLi4vdXRpbHMnKS5hc3NlcnRcclxudmFyIGdldElkID0gcmVxdWlyZSgnLi4vdXRpbHMnKS5nZXRJZFxyXG52YXIgY2hlY2tOb2RlQXZhaWxhYmlsaXR5ID0gcmVxdWlyZSgnLi4vdXRpbHMnKS5jaGVja05vZGVBdmFpbGFiaWxpdHlcclxudmFyIGdlbk1vZGVsVGVtcGxhdGUgPSByZXF1aXJlKCcuL2dlbk1vZGVsVGVtcGxhdGUnKVxyXG4vLyB2YXIgbW9ycGggPSByZXF1aXJlKCdzZXQtZG9tJylcclxuXHJcbnZhciByZSA9IC97eyhbXnt9XSspfX0vZ1xyXG5cclxuLy8gZGlmZmluZyB0d28gYXJyYXkgb2Ygb2JqZWN0cywgaW5jbHVkaW5nIG9iamVjdCBwcm9wZXJ0aWVzIGRpZmZlcmVuY2VzXHJcbmZ1bmN0aW9uIGRpZmYgKGZzdCwgc2VjKSB7XHJcbiAgcmV0dXJuIGZzdC5maWx0ZXIoZnVuY3Rpb24gKG9iaikge1xyXG4gICAgcmV0dXJuICFzZWMuc29tZShmdW5jdGlvbiAoaW5yKSB7XHJcbiAgICAgIHZhciBwcmVkaWNhdGUgPSB0cnVlXHJcbiAgICAgIGZvciAodmFyIGF0dHIgaW4gaW5yKSB7XHJcbiAgICAgICAgaWYgKG9ialthdHRyXSAhPT0gaW5yW2F0dHJdKSB7XHJcbiAgICAgICAgICBwcmVkaWNhdGUgPSBmYWxzZVxyXG4gICAgICAgIH1cclxuICAgICAgfVxyXG4gICAgICByZXR1cm4gcHJlZGljYXRlXHJcbiAgICB9KVxyXG4gIH0pXHJcbn1cclxuXHJcbi8vIGNoZWNrIGlmIGJyb3dzZXIgc3VwcG9ydCBjcmVhdGVSYW5nZVxyXG52YXIgcmFuZ2VcclxuaWYgKHR5cGVvZiBkb2N1bWVudC5jcmVhdGVSYW5nZSA9PT0gJ2Z1bmN0aW9uJykge1xyXG4gIHJhbmdlID0gZG9jdW1lbnQuY3JlYXRlUmFuZ2UoKVxyXG59XHJcblxyXG4vLyBzdG9yYWdlIGZvciBtb2RlbCBzdGF0ZVxyXG52YXIgY2FjaGUgPSB7fVxyXG5cclxubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbiAobm9kZSwgbW9kZWwsIHRtcGxIYW5kbGVyKSB7XHJcbiAgXHJcbiAgdmFyIG1vZGVsTGlzdFxyXG4gIHZhciBtTGVuZ3RoXHJcbiAgdmFyIGlcclxuICB2YXIgbGlzdENsb25lXHJcbiAgdmFyIHBhcmVudE5vZGVcclxuICB2YXIgbVxyXG4gIHZhciBkb2N1bWVudEZyYWdtZW50XHJcbiAgdmFyIHVwZGF0ZU9mTmV3XHJcbiAgdmFyIGRpZmZPZk9sZFxyXG4gIHZhciBwTm9kZVxyXG4gIHZhciByZWZcclxuICB2YXIgZXF1YWxMZW5ndGhcclxuICB2YXIgY2hpbGRcclxuICB2YXIgbGlzdFxyXG4gIHZhciBzdHJcclxuICB2YXIgb2xkTW9kZWxcclxuICB2YXIgcFxyXG5cclxuICBjYWNoZVttb2RlbF0gPSBjYWNoZVttb2RlbF0gfHwge31cclxuXHJcbiAgaWYoIWNhY2hlW21vZGVsXS5saXN0KXtcclxuICAgIGNhY2hlW21vZGVsXS5saXN0ID0gbm9kZS5uZXh0U2libGluZy5jbG9uZU5vZGUodHJ1ZSlcclxuICB9XHJcbiAgbGlzdCA9IGNhY2hlW21vZGVsXS5saXN0XHJcblxyXG4gIGlmKCFjYWNoZVttb2RlbF0uc3RyKXtcclxuICAgIGNhY2hlW21vZGVsXS5zdHIgPSBub2RlLm5leHRTaWJsaW5nLmNsb25lTm9kZSh0cnVlKS5vdXRlckhUTUxcclxuICB9XHJcbiAgc3RyID0gY2FjaGVbbW9kZWxdLnN0clxyXG5cclxuICBpZighY2FjaGVbbW9kZWxdLnJlZil7XHJcbiAgICBpZiAobGlzdC5oYXNBdHRyaWJ1dGUoJ2lkJykgJiYgbGlzdC5pZC5tYXRjaChyZSkpIHtcclxuICAgICAgY2FjaGVbbW9kZWxdLnJlZiA9IGxpc3QuaWQucmVwbGFjZShyZSwgJyQxJylcclxuICAgICAgLy8gcmVtb3ZlIHRoZSBmaXJzdCBwcm90b3R5cGUgbm9kZVxyXG4gICAgICBub2RlLm5leHRTaWJsaW5nLnJlbW92ZSgpXHJcbiAgICAgIC8vIGFsc28gcmVtb3ZlIGZyb20gcHJpc3RpbmUgbm9kZVxyXG4gICAgICBwID0gdGhpcy5fX3ByaXN0aW5lRnJhZ21lbnRfXy5nZXRFbGVtZW50QnlJZChsaXN0LmlkKVxyXG4gICAgICBpZihwKSBwLnJlbW92ZSgpXHJcbiAgICB9XHJcbiAgfVxyXG4gIHJlZiA9IGNhY2hlW21vZGVsXS5yZWZcclxuICBcclxuICBpZiAodGhpc1ttb2RlbF0gIT09IHVuZGVmaW5lZCAmJiB0aGlzW21vZGVsXS5oYXNPd25Qcm9wZXJ0eSgnbGlzdCcpKSB7XHJcblxyXG4gICAgcGFyZW50Tm9kZSA9IG5vZGUucGFyZW50Tm9kZVxyXG5cclxuICAgIGlmIChyYW5nZSAmJiAhcGFyZW50Tm9kZS5oYXNBdHRyaWJ1dGUoJ2RhdGEtaWdub3JlJykpIHtcclxuICAgICAgcGFyZW50Tm9kZS5zZXRBdHRyaWJ1dGUoJ2RhdGEtaWdub3JlJywgJycpXHJcbiAgICB9XHJcblxyXG4gICAgbW9kZWxMaXN0ID0gdGhpc1ttb2RlbF0ubGlzdFxyXG5cclxuICAgIG9sZE1vZGVsID0gY2FjaGVbbW9kZWxdLm9sZE1vZGVsIHx8IFtdXHJcblxyXG4gICAgLy8gY2hlY2sgaWYgY3VycmVudCBicm93c2VyIGRvZXNuJ3Qgc3VwcG9ydCBjcmVhdGVSYW5nZSgpXHJcbiAgICBpZiAoIXJhbmdlKSB7XHJcbiAgICAgIGkgPSAwXHJcbiAgICAgIHdoaWxlIChpIDwgbUxlbmd0aCkge1xyXG4gICAgICAgIC8vIGZhbGxiYWNrIHRvIHJlZ3VsYXIgbm9kZSBnZW5lcmF0aW9uIGhhbmRsZXJcclxuICAgICAgICBsaXN0Q2xvbmUgPSBsaXN0LmNsb25lTm9kZSh0cnVlKVxyXG4gICAgICAgIHRtcGxIYW5kbGVyKHRoaXMsIG51bGwsIGxpc3RDbG9uZSwgbW9kZWxMaXN0W2ldKVxyXG4gICAgICAgIGkrK1xyXG4gICAgICB9XHJcbiAgICB9IGVsc2Uge1xyXG4gICAgICB1cGRhdGVPZk5ldyA9IGRpZmYobW9kZWxMaXN0LCBvbGRNb2RlbClcclxuICAgICAgZGlmZk9mT2xkID0gZGlmZihvbGRNb2RlbCwgbW9kZWxMaXN0KVxyXG5cclxuICAgICAgZnVuY3Rpb24gZGlmZk1vZGVsKCkge1xyXG4gICAgICAgIHBOb2RlID1bXS5wb3AuY2FsbChhcmd1bWVudHMpXHJcbiAgICAgICAgLy8gY2hlY2sgaWYgYm90aCBtb2RlbHMgYXJlIGVxdWFsbHkgaW4gbGVuZ3RoXHJcbiAgICAgICAgZXF1YWxMZW5ndGggPSBvbGRNb2RlbC5sZW5ndGggPT09IG1vZGVsTGlzdC5sZW5ndGhcclxuXHJcbiAgICAgICAgLy8gZG8gcHJvcGVydGllcyB1cGRhdGVcclxuICAgICAgICBpZiAoZXF1YWxMZW5ndGgpIHtcclxuICAgICAgICAgIHVwZGF0ZU9mTmV3Lm1hcChmdW5jdGlvbiAob2JqKSB7XHJcbiAgICAgICAgICAgIGNoaWxkID0gcE5vZGUucXVlcnlTZWxlY3RvcignW2lkPVwiJyArIG9ialtyZWZdICsgJ1wiXScpXHJcbiAgICAgICAgICAgIG0gPSBnZW5Nb2RlbFRlbXBsYXRlKHN0ciwgb2JqKVxyXG4gICAgICAgICAgICBkb2N1bWVudEZyYWdtZW50ID0gcmFuZ2UuY3JlYXRlQ29udGV4dHVhbEZyYWdtZW50KG0pXHJcbiAgICAgICAgICAgIC8vIG1vcnBoKGNoaWxkLCBkb2N1bWVudEZyYWdtZW50LmZpcnN0Q2hpbGQpXHJcbiAgICAgICAgICAgIHBOb2RlLnJlcGxhY2VDaGlsZChkb2N1bWVudEZyYWdtZW50LCBjaGlsZClcclxuICAgICAgICAgIH0pXHJcbiAgICAgICAgLy8gYWRkIG5ldyBvYmplY3RzXHJcbiAgICAgICAgfSBlbHNlIGlmICh1cGRhdGVPZk5ldy5sZW5ndGggPiAwICYmIGRpZmZPZk9sZC5sZW5ndGggPT09IDApIHtcclxuICAgICAgICAgIHVwZGF0ZU9mTmV3Lm1hcChmdW5jdGlvbiAob2JqKSB7XHJcbiAgICAgICAgICAgIG0gPSBnZW5Nb2RlbFRlbXBsYXRlKHN0ciwgb2JqKVxyXG4gICAgICAgICAgICBkb2N1bWVudEZyYWdtZW50ID0gcmFuZ2UuY3JlYXRlQ29udGV4dHVhbEZyYWdtZW50KG0pXHJcbiAgICAgICAgICAgIHBOb2RlLmluc2VydEJlZm9yZShkb2N1bWVudEZyYWdtZW50LCBwTm9kZS5sYXN0Q2hpbGQpXHJcbiAgICAgICAgICB9KVxyXG4gICAgICAgIC8vIGRlc3Ryb3kgc2VsZWN0ZWQgb2JqZWN0c1xyXG4gICAgICAgIH0gZWxzZSBpZiAodXBkYXRlT2ZOZXcubGVuZ3RoID09PSAwICYmIGRpZmZPZk9sZC5sZW5ndGggPiAwKSB7XHJcbiAgICAgICAgICBkaWZmT2ZPbGQubWFwKGZ1bmN0aW9uIChvYmopIHtcclxuICAgICAgICAgICAgY2hpbGQgPSBwTm9kZS5xdWVyeVNlbGVjdG9yKCdbaWQ9XCInICsgb2JqW3JlZl0gKyAnXCJdJylcclxuICAgICAgICAgICAgcE5vZGUucmVtb3ZlQ2hpbGQoY2hpbGQpXHJcbiAgICAgICAgICB9KVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgLy8gcmVwbGFjZSBvbGRNb2RlbCBhZnRlciBkaWZmaW5nXHJcbiAgICAgICAgY2FjaGVbbW9kZWxdLm9sZE1vZGVsID0gSlNPTi5wYXJzZShKU09OLnN0cmluZ2lmeShtb2RlbExpc3QpKVxyXG4gICAgICB9XHJcblxyXG4gICAgICAvLyBjaGVjayBleGlzdGluZyBwYXJlbnROb2RlIGluIHRoZSBET01cclxuICAgICAgaWYgKHBhcmVudE5vZGUuaGFzQXR0cmlidXRlKCdpZCcpKSB7XHJcbiAgICAgICAgcE5vZGUgPSBnZXRJZChwYXJlbnROb2RlLmlkKVxyXG5cclxuICAgICAgICBpZihwTm9kZSl7XHJcbiAgICAgICAgICBkaWZmTW9kZWwuY2FsbCh0aGlzLCBudWxsLCBudWxsLCBwTm9kZSlcclxuICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgY2hlY2tOb2RlQXZhaWxhYmlsaXR5KHsgZWw6IHBhcmVudE5vZGUuaWQgfSwgbW9kZWwsIGRpZmZNb2RlbC5iaW5kKHRoaXMpKVxyXG4gICAgICAgIH1cclxuICAgICAgfVxyXG4gICAgICBcclxuICAgIH1cclxuICB9IGVsc2Uge1xyXG4gICAgYXNzZXJ0KGZhbHNlLCAnTW9kZWwgXCInICsgbW9kZWwgKyAnXCIgZG9lcyBub3QgZXhpc3QuJylcclxuICB9XHJcbn1cclxuIiwidmFyIHRlcm5hcnlPcHMgPSByZXF1aXJlKCcuL3Rlcm5hcnlPcHMnKVxyXG52YXIgcmUgPSBuZXcgUmVnRXhwKC8oXFxzY2hlY2tlZD1cIikoLio/KSg/PVwiKS9nKVxyXG52YXIgdG1wbCA9ICcnXHJcblxyXG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uIChzdHJpbmcsIG9iaikge1xyXG4gIHZhciBhcnJQcm9wcyA9IHN0cmluZy5tYXRjaCgve3soW157fV0rKX19L2cpXHJcbiAgdmFyIHJlcFxyXG4gIHZhciBpc1Rlcm5hcnlcclxuICB0bXBsID0gc3RyaW5nXHJcbiAgZm9yICh2YXIgaSA9IDAsIGxlbiA9IGFyclByb3BzLmxlbmd0aDsgaSA8IGxlbjsgaSsrKSB7XHJcbiAgICByZXAgPSBhcnJQcm9wc1tpXS5yZXBsYWNlKC97eyhbXnt9XSspfX0vZywgJyQxJylcclxuICAgIGlzVGVybmFyeSA9IHRlcm5hcnlPcHMuY2FsbChvYmosIHJlcClcclxuICAgIGlmIChpc1Rlcm5hcnkpIHtcclxuICAgICAgdG1wbCA9IHRtcGwucmVwbGFjZSgne3snICsgcmVwICsgJ319JywgaXNUZXJuYXJ5LnZhbHVlKVxyXG4gICAgfSBlbHNlIHtcclxuICAgICAgdG1wbCA9IHRtcGwucmVwbGFjZSgne3snICsgcmVwICsgJ319Jywgb2JqW3JlcF0pXHJcbiAgICB9XHJcblxyXG4gICAgdmFyIG1hdGNoID0gdG1wbC5tYXRjaChyZSlcclxuICAgIGlmIChtYXRjaCkge1xyXG4gICAgICBpZiAobWF0Y2hbMF0ubGVuZ3RoID09PSAxNykgeyB0bXBsID0gdG1wbC5yZXBsYWNlKCcgY2hlY2tlZD1cImNoZWNrZWRcIicsICcgY2hlY2tlZCcpIH0gZWxzZSB7IHRtcGwgPSB0bXBsLnJlcGxhY2UoJyBjaGVja2VkPVwiXCInLCAnJykgfVxyXG4gICAgfVxyXG4gIH1cclxuICByZXR1cm4gdG1wbFxyXG59XHJcbiIsInZhciBzZXRTdGF0ZSA9IHJlcXVpcmUoJy4vZ2VuRWxlbWVudCcpLnNldFN0YXRlXHJcbnZhciB0bXBsSGFuZGxlciA9IHJlcXVpcmUoJy4vdG1wbEhhbmRsZXInKVxyXG52YXIgZ2V0SWQgPSByZXF1aXJlKCcuLi91dGlscycpLmdldElkXHJcbnZhciBhZGRTdGF0ZSA9IHJlcXVpcmUoJy4vZ2VuRWxlbWVudCcpLmFkZFN0YXRlXHJcbnZhciBhc3NlcnQgPSByZXF1aXJlKCcuLi91dGlscycpLmFzc2VydFxyXG5cclxudmFyIERPQ1VNRU5UX0VMRU1FTlRfVFlQRSA9IDFcclxuXHJcbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24gKHN0dWIpIHtcclxuICB0bXBsSGFuZGxlcih0aGlzLCBhZGRTdGF0ZSlcclxuICB2YXIgZWwgPSBzdHViIHx8IGdldElkKHRoaXMuZWwpXHJcbiAgaWYgKGVsKSB7XHJcbiAgICBpZihlbC5ub2RlVHlwZSA9PT0gRE9DVU1FTlRfRUxFTUVOVF9UWVBFKVxyXG4gICAgICBlbC5zZXRBdHRyaWJ1dGUoJ2RhdGEtaWdub3JlJywgJycpXHJcbiAgICBlbHNlIGlmKGVsLmhhc0NoaWxkTm9kZXMoKSAmJiBlbC5maXJzdENoaWxkLm5vZGVUeXBlID09PSBET0NVTUVOVF9FTEVNRU5UX1RZUEUpe1xyXG4gICAgICBlbC5maXJzdENoaWxkc2V0QXR0cmlidXRlKCdkYXRhLWlnbm9yZScsICcnKVxyXG4gICAgICBhc3NlcnQoZWwuY2hpbGROb2Rlcy5sZW5ndGggIT09IDEsICdTdWItY29tcG9uZW50IHNob3VsZCBvbmx5IGhhcyBhIHNpbmdsZSByb290Tm9kZS4nKVxyXG4gICAgfVxyXG4gICAgLy8gbGlzdGVuIHRvIHN0YXRlIGNoYW5nZXNcclxuICAgIHNldFN0YXRlLmNhbGwodGhpcylcclxuICAgIC8vIG1vdW50IGZyYWdtZW50IHRvIERPTVxyXG4gICAgZWwuYXBwZW5kQ2hpbGQodGhpcy5iYXNlKVxyXG4gICAgLy8gc2luY2UgY29tcG9uZW50IGFscmVhZHkgcmVuZGVyZWQsIHRyaWdnZXIgaXRzIGxpZmUtY3ljbGUgbWV0aG9kXHJcbiAgICBpZiAodGhpcy5jb21wb25lbnREaWRNb3VudCAmJiB0eXBlb2YgdGhpcy5jb21wb25lbnREaWRNb3VudCA9PT0gJ2Z1bmN0aW9uJykge1xyXG4gICAgICB0aGlzLmNvbXBvbmVudERpZE1vdW50KClcclxuICAgIH1cclxuICB9IGVsc2Uge1xyXG4gICAgYXNzZXJ0KGZhbHNlLCAnTm8gZWxlbWVudCB3aXRoIGlkOiBcIicgKyB0aGlzLmVsICsgJ1wiIGV4aXN0LicpXHJcbiAgfVxyXG59XHJcbiIsIm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24gKHN0cikge1xyXG4gIHZhciByZXMgPSBzdHIubWF0Y2goL1xcLipcXC4vZylcclxuICB2YXIgcmVzdWx0XHJcbiAgaWYgKHJlcyAmJiByZXMubGVuZ3RoID4gMCkge1xyXG4gICAgcmV0dXJuIHN0ci5zcGxpdCgnLicpXHJcbiAgfVxyXG4gIHJldHVybiByZXN1bHRcclxufVxyXG4iLCIvLyBmdW5jdGlvbiB0byByZXNvbHZlIHRlcm5hcnkgb3BlcmF0aW9uXHJcblxyXG5mdW5jdGlvbiB0ZXN0IChzdHIpIHtcclxuICBpZiAoc3RyID09PSAnXFwnXFwnJyB8fCBzdHIgPT09ICdcIlwiJyB8fCBzdHIgPT09ICdudWxsJykgeyByZXR1cm4gJycgfVxyXG4gIHJldHVybiBzdHJcclxufVxyXG5cclxubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbiAoaW5wdXQpIHtcclxuICBpZiAoaW5wdXQubWF0Y2goLyhbXj9dKilcXD8oW146XSopOihbXjtdKil8KFxccyo9XFxzKilbXjtdKi9nKSkge1xyXG4gICAgdmFyIHQgPSBpbnB1dC5zcGxpdCgnPycpXHJcbiAgICB2YXIgY29uZGl0aW9uID0gdFswXVxyXG4gICAgdmFyIGxlZnRIYW5kID0gdFsxXS5zcGxpdCgnOicpWzBdXHJcbiAgICB2YXIgcmlnaHRIYW5kID0gdFsxXS5zcGxpdCgnOicpWzFdXHJcblxyXG4gICAgLy8gY2hlY2sgdGhlIGNvbmRpdGlvbiBmdWxmaWxsbWVudFxyXG4gICAgLy8gY29uc29sZS5sb2codGhpcylcclxuICAgIGlmICh0aGlzW2NvbmRpdGlvbl0pIHtcclxuICAgICAgcmV0dXJuIHtcclxuICAgICAgICB2YWx1ZTogdGVzdChsZWZ0SGFuZCksXHJcbiAgICAgICAgc3RhdGU6IGNvbmRpdGlvblxyXG4gICAgICB9XHJcbiAgICB9IGVsc2Uge1xyXG4gICAgICByZXR1cm4ge1xyXG4gICAgICAgIHZhbHVlOiB0ZXN0KHJpZ2h0SGFuZCksXHJcbiAgICAgICAgc3RhdGU6IGNvbmRpdGlvblxyXG4gICAgICB9XHJcbiAgICB9XHJcbiAgfSBlbHNlIHJldHVybiBmYWxzZVxyXG59XHJcbiIsInZhciBzdHJJbnRlcnByZXRlciA9IHJlcXVpcmUoJy4vc3RySW50ZXJwcmV0ZXInKVxyXG52YXIgdGVybmFyeU9wcyA9IHJlcXVpcmUoJy4vdGVybmFyeU9wcycpXHJcbnZhciBnZXRJZCA9IHJlcXVpcmUoJy4uL3V0aWxzJykuZ2V0SWRcclxudmFyIGdlbk1vZGVsTGlzdCA9IHJlcXVpcmUoJy4vZ2VuTW9kZWxMaXN0JylcclxudmFyIGNvbmRpdGlvbmFsTm9kZXMgPSByZXF1aXJlKCcuL2NvbmRpdGlvbmFsTm9kZXMnKVxyXG52YXIgY29tcG9uZW50UGFyc2UgPSByZXF1aXJlKCcuL2NvbXBvbmVudFBhcnNlJylcclxuXHJcbi8vIHZhciBET0NVTUVOVF9GUkFHTUVOVF9UWVBFID0gMTFcclxuLy8gdmFyIERPQ1VNRU5UX1RFWFRfVFlQRSA9IDNcclxudmFyIERPQ1VNRU5UX0VMRU1FTlRfVFlQRSA9IDFcclxuLy8gdmFyIERPQ1VNRU5UX0NPTU1FTlRfVFlQRSA9IDhcclxuLy8gdmFyIERPQ1VNRU5UX0FUVFJJQlVURV9UWVBFID0gMlxyXG5cclxudmFyIHJlID0gL3t7KFtee31dKyl9fS9nXHJcblxyXG52YXIgbW9kZWwgPSAvXm1vZGVsOi9nXHJcbnZhciBtb2RlbFJhdyA9IC9cXHtcXHttb2RlbDooW157fV0rKVxcfVxcfS9nXHJcblxyXG52YXIgY29uZGl0aW9uYWxSZSA9IC9eXFw/L2dcclxuXHJcbnZhciBjb21wb25lbnQgPSAvXmNvbXBvbmVudDooW157fV0rKS9nXHJcblxyXG52YXIgdG1wbGhhbmRsZXIgPSBmdW5jdGlvbiAoY3R4LCB1cGRhdGVTdGF0ZUxpc3QsIG1vZGVsSW5zdGFuY2UsIG1vZGVsT2JqZWN0LCBjb25kaXRpb25hbCkge1xyXG4gIHdpbmRvdy50aW1lID0gbmV3IERhdGUoKVxyXG4gIHZhciBjdXJyZW50Tm9kZVxyXG4gIHZhciBsblxyXG4gIHZhciBwcm9wc1xyXG4gIHZhciByZXBcclxuICB2YXIgZnJhZ21lbnRcclxuICB2YXIgaW5zdGFuY2VcclxuICB2YXIgbm9kZUF0dHJpYnV0ZXNcclxuICB2YXIgaSA9IDBcclxuICB2YXIgYVxyXG4gIHZhciBuc1xyXG4gIHZhciBldnROYW1lXHJcbiAgdmFyIGNcclxuICB2YXIgaFxyXG4gIHZhciBoYW5kbGVyQXJnc1xyXG4gIHZhciBhcmd2XHJcbiAgdmFyIGhhbmRsZXJcclxuICB2YXIgdG5yXHJcbiAgdmFyIG1vZGVsUmVwXHJcbiAgdmFyIGNvbmRpdGlvbmFsUmVwXHJcbiAgdmFyIGZuXHJcbiAgdmFyIHJlbSA9IFtdXHJcbiAgdmFyIGlzT2JqZWN0Tm90YXRpb25cclxuICB2YXIgbmFtZVxyXG4gIHZhciBwXHJcblxyXG4gIGlmIChtb2RlbE9iamVjdCkge1xyXG4gICAgaW5zdGFuY2UgPSBtb2RlbEluc3RhbmNlXHJcbiAgfSBlbHNlIGlmIChjb25kaXRpb25hbCkge1xyXG4gICAgaW5zdGFuY2UgPSBjb25kaXRpb25hbC5maXJzdENoaWxkXHJcbiAgfSBlbHNlIHtcclxuICAgIGZyYWdtZW50ID0gY3R4LmJhc2VcclxuICAgIGluc3RhbmNlID0gZnJhZ21lbnQuZmlyc3RDaGlsZFxyXG4gIH1cclxuXHJcbiAgdmFyIGlucyA9IG1vZGVsT2JqZWN0IHx8IGN0eFxyXG5cclxuICBmdW5jdGlvbiB1cGRhdGVTdGF0ZSAoc3RhdGUpIHtcclxuICAgIGlmICh0eXBlb2YgdXBkYXRlU3RhdGVMaXN0ID09PSAnZnVuY3Rpb24nKSB7XHJcbiAgICAgIHVwZGF0ZVN0YXRlTGlzdChzdGF0ZSlcclxuICAgIH1cclxuICB9XHJcblxyXG4gIGZ1bmN0aW9uIHZhbEFzc2lnbiAobm9kZSwgdmFsdWUsIHJlcGxhY2UsIHdpdGhUbykge1xyXG4gICAgdmFsdWUgPSB2YWx1ZS5yZXBsYWNlKHJlcGxhY2UsIHdpdGhUbylcclxuICAgIGlmKG5vZGUpIG5vZGUubm9kZVZhbHVlID0gdmFsdWVcclxuICB9XHJcblxyXG4gIGZ1bmN0aW9uIHJlcGxhY2VIYW5kbGVCYXJzICh2YWx1ZSwgbm9kZSkge1xyXG4gICAgcHJvcHMgPSB2YWx1ZS5tYXRjaChyZSlcclxuICAgIGxuID0gcHJvcHMubGVuZ3RoXHJcbiAgICB3aGlsZSAobG4pIHtcclxuICAgICAgbG4tLVxyXG4gICAgICByZXAgPSBwcm9wc1tsbl0ucmVwbGFjZShyZSwgJyQxJylcclxuICAgICAgdG5yID0gdGVybmFyeU9wcy5jYWxsKGlucywgcmVwKVxyXG4gICAgICBpc09iamVjdE5vdGF0aW9uID0gc3RySW50ZXJwcmV0ZXIocmVwKVxyXG4gICAgICBpZiAoaXNPYmplY3ROb3RhdGlvbikge1xyXG4gICAgICAgIHVwZGF0ZVN0YXRlKHJlcClcclxuICAgICAgICB2YWxBc3NpZ24obm9kZSwgdmFsdWUsICd7eycgKyByZXAgKyAnfX0nLCBpbnNbaXNPYmplY3ROb3RhdGlvblswXV1baXNPYmplY3ROb3RhdGlvblsxXV0pXHJcbiAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgaWYgKHRucikge1xyXG4gICAgICAgICAgdXBkYXRlU3RhdGUodG5yLnN0YXRlKVxyXG4gICAgICAgICAgdmFsQXNzaWduKG5vZGUsIHZhbHVlLCAne3snICsgcmVwICsgJ319JywgdG5yLnZhbHVlKVxyXG4gICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICBpZiAocmVwLm1hdGNoKG1vZGVsKSkge1xyXG4gICAgICAgICAgICBtb2RlbFJlcCA9IHJlcC5yZXBsYWNlKCdtb2RlbDonLCAnJylcclxuICAgICAgICAgICAgLy8gZ2VuZXJhdGUgbGlzdCBtb2RlbFxyXG4gICAgICAgICAgICBnZW5Nb2RlbExpc3QuY2FsbChjdHgsIG5vZGUsIG1vZGVsUmVwLCB0bXBsaGFuZGxlcilcclxuICAgICAgICAgIH0gZWxzZSBpZiAocmVwLm1hdGNoKGNvbmRpdGlvbmFsUmUpKSB7XHJcbiAgICAgICAgICAgIGNvbmRpdGlvbmFsUmVwID0gcmVwLnJlcGxhY2UoJz8nLCAnJylcclxuICAgICAgICAgICAgaWYgKGluc1tjb25kaXRpb25hbFJlcF0gIT09IHVuZGVmaW5lZCkge1xyXG4gICAgICAgICAgICAgIHVwZGF0ZVN0YXRlKGNvbmRpdGlvbmFsUmVwKVxyXG4gICAgICAgICAgICAgIGNvbmRpdGlvbmFsTm9kZXMuY2FsbChjdHgsIG5vZGUsIGNvbmRpdGlvbmFsUmVwLCB0bXBsaGFuZGxlcilcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgfSBlbHNlIGlmIChyZXAubWF0Y2goY29tcG9uZW50KSkge1xyXG4gICAgICAgICAgICBjb21wb25lbnRQYXJzZS5jYWxsKGN0eCwgcmVwLCBub2RlKVxyXG4gICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgaWYgKGluc1tyZXBdICE9PSB1bmRlZmluZWQpIHtcclxuICAgICAgICAgICAgICB1cGRhdGVTdGF0ZShyZXApXHJcbiAgICAgICAgICAgICAgdmFsQXNzaWduKG5vZGUsIHZhbHVlLCAne3snICsgcmVwICsgJ319JywgaW5zW3JlcF0pXHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgIH1cclxuICAgICAgICB9XHJcbiAgICAgIH1cclxuICAgIH1cclxuICB9XHJcblxyXG4gIGZ1bmN0aW9uIGluc3BlY3RBdHRyaWJ1dGVzIChub2RlKSB7XHJcbiAgICBub2RlQXR0cmlidXRlcyA9IG5vZGUuYXR0cmlidXRlc1xyXG4gICAgZm9yIChpID0gbm9kZUF0dHJpYnV0ZXMubGVuZ3RoOyBpLS07KSB7XHJcbiAgICAgIGEgPSBub2RlQXR0cmlidXRlc1tpXVxyXG4gICAgICBuYW1lID0gYS5sb2NhbE5hbWVcclxuICAgICAgbnMgPSBhLm5vZGVWYWx1ZVxyXG4gICAgICBpZiAocmUudGVzdChuYW1lKSkge1xyXG4gICAgICAgIG5vZGUucmVtb3ZlQXR0cmlidXRlKG5hbWUpXHJcbiAgICAgICAgbmFtZSA9IHJlcGxhY2VIYW5kbGVCYXJzKG5hbWUpXHJcbiAgICAgICAgbm9kZS5zZXRBdHRyaWJ1dGUobmFtZSwgbnMpXHJcbiAgICAgIH0gZWxzZSBpZiAocmUudGVzdChucykpIHtcclxuICAgICAgICBucyA9IHJlcGxhY2VIYW5kbGVCYXJzKG5zKVxyXG4gICAgICAgIGlmIChucyA9PT0gJycpIHtcclxuICAgICAgICAgIG5vZGUucmVtb3ZlQXR0cmlidXRlKG5hbWUpXHJcbiAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgIGlmIChuYW1lID09PSAnY2hlY2tlZCcpIHtcclxuICAgICAgICAgICAgbm9kZS5zZXRBdHRyaWJ1dGUobmFtZSwgJycpXHJcbiAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICBub2RlLnNldEF0dHJpYnV0ZShuYW1lLCBucylcclxuICAgICAgICAgIH1cclxuICAgICAgICB9XHJcbiAgICAgIH1cclxuICAgIH1cclxuICB9XHJcblxyXG4gIGZ1bmN0aW9uIGxvb2tVcEV2dE5vZGUgKG5vZGUpIHtcclxuICAgIC8vIGNoZWNrIGlmIG5vZGUgaXMgdmlzaWJsZSBvbiBET00gYW5kIGhhcyBhdHRyaWJ1dGUgZXZ0LW5vZGVcclxuICAgIGlmIChub2RlLmhhc0F0dHJpYnV0ZSgnZXZ0LW5vZGUnKSAmJiBub2RlLmhhc0F0dHJpYnV0ZSgnaWQnKSAmJiBnZXRJZChub2RlLmlkKSkge1xyXG4gICAgICByZXR1cm4gdHJ1ZVxyXG4gICAgfVxyXG4gICAgcmV0dXJuIGZhbHNlXHJcbiAgfVxyXG5cclxuICBmdW5jdGlvbiBhZGRFdmVudCAobm9kZSkge1xyXG4gICAgbm9kZUF0dHJpYnV0ZXMgPSBub2RlLmF0dHJpYnV0ZXNcclxuXHJcbiAgICBpZiAobm9kZSAmJiBsb29rVXBFdnROb2RlKG5vZGUpKSB7XHJcbiAgICAgIC8vIHNraXAgYWRkZGluZyBldmVudCBmb3Igbm9kZSB0aGF0IGFscmVhZHkgaGFzIGV2ZW50XHJcbiAgICAgIC8vIHRvIGFsbG93IHNraXBwaW5nIGFkZGluZyBldmVudCB0aGUgbm9kZSBtdXN0IGluY2x1ZGUgYGlkYC9cclxuICAgIH0gZWxzZSB7XHJcbiAgICAgIC8vIG9ubHkgYWRkIGV2ZW50IHdoZW4gbm9kZSBkb2VzIG5vdCBoYXMgb25lXHJcbiAgICAgIGZvciAoaSA9IG5vZGVBdHRyaWJ1dGVzLmxlbmd0aDsgaS0tOykge1xyXG4gICAgICAgIGEgPSBub2RlQXR0cmlidXRlc1tpXVxyXG4gICAgICAgIG5hbWUgPSBhLmxvY2FsTmFtZVxyXG4gICAgICAgIG5zID0gYS5ub2RlVmFsdWVcclxuICAgICAgICBpZiAoL15rLS8udGVzdChuYW1lKSkge1xyXG4gICAgICAgICAgZXZ0TmFtZSA9IG5hbWUucmVwbGFjZSgvXmstLywgJycpXHJcbiAgICAgICAgICBoYW5kbGVyID0gbnMubWF0Y2goL1thLXpBLVpdKyg/IVteKF0qXFwpKS8pWzBdXHJcbiAgICAgICAgICBjID0gY3R4W2hhbmRsZXJdXHJcbiAgICAgICAgICBpZiAoYyAhPT0gdW5kZWZpbmVkICYmIHR5cGVvZiBjID09PSAnZnVuY3Rpb24nKSB7XHJcbiAgICAgICAgICAgIGggPSBucy5tYXRjaCgvXFwoKFtee31dKylcXCkvKVxyXG4gICAgICAgICAgICBoYW5kbGVyQXJncyA9IGggPyBoWzFdIDogJydcclxuICAgICAgICAgICAgYXJndiA9IGhhbmRsZXJBcmdzLnNwbGl0KCcsJykuZmlsdGVyKGZ1bmN0aW9uIChmKSB7XHJcbiAgICAgICAgICAgICAgcmV0dXJuIGYgIT09ICcnXHJcbiAgICAgICAgICAgIH0pXHJcbiAgICAgICAgICAgIHJlbS5wdXNoKG5hbWUpXHJcbiAgICAgICAgICAgIGZuID0gZnVuY3Rpb24gKGUpIHtcclxuICAgICAgICAgICAgICBlLnN0b3BQcm9wYWdhdGlvbigpXHJcbiAgICAgICAgICAgICAgaWYgKGUudGFyZ2V0ICE9PSBlLmN1cnJlbnRUYXJnZXQpIHtcclxuICAgICAgICAgICAgICAgIGMuYXBwbHkoY3R4LCBbZS50YXJnZXQsIGVdKVxyXG4gICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAvLyBpZiBub2RlIGlzIHRoZSByb290Tm9kZSBmb3IgbW9kZWwsIHdlIHdyYXAgdGhlIGV2ZW50TGlzdGVuZXIgYW5kXHJcbiAgICAgICAgICAgIC8vIHJlYnVpbGQgdGhlIGFyZ3VtZW50cyBieSBhcHBlbmRpbmcgaWQvY2xhc3NOYW1lIHV0aWwgcm9vdE5vZGUuXHJcbiAgICAgICAgICAgIGlmIChub2RlLmhhc0NoaWxkTm9kZXMoKSAmJiBub2RlLmZpcnN0Q2hpbGQubm9kZVR5cGUgIT09IERPQ1VNRU5UX0VMRU1FTlRfVFlQRSAmJiBub2RlLmZpcnN0Q2hpbGQubm9kZVZhbHVlLm1hdGNoKG1vZGVsUmF3KSkge1xyXG4gICAgICAgICAgICAgIG5vZGUuYWRkRXZlbnRMaXN0ZW5lcihldnROYW1lLCBmbiwgZmFsc2UpXHJcbiAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgbm9kZS5hZGRFdmVudExpc3RlbmVyKGV2dE5hbWUsIGMuYmluZC5hcHBseShjLmJpbmQoY3R4KSwgW25vZGVdLmNvbmNhdChhcmd2KSksIGZhbHNlKVxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIG5vZGUuc2V0QXR0cmlidXRlKCdldnQtbm9kZScsICcnKVxyXG4gICAgICAgICAgICBpZiAobm9kZS5oYXNBdHRyaWJ1dGUoJ2lkJykpIHtcclxuICAgICAgICAgICAgICBwID0gY3R4Ll9fcHJpc3RpbmVGcmFnbWVudF9fLmdldEVsZW1lbnRCeUlkKG5vZGUuaWQpXHJcbiAgICAgICAgICAgICAgaWYgKCFwLmhhc0F0dHJpYnV0ZSgnZXZ0LW5vZGUnKSkge1xyXG4gICAgICAgICAgICAgICAgcC5zZXRBdHRyaWJ1dGUoJ2V2dC1ub2RlJywgJycpXHJcbiAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG4gICAgICAgIC8vIGlmKGkgPT09IDApe1xyXG4gICAgICAgIC8vICAgcmVtLm1hcChmdW5jdGlvbiAoZikgeyBub2RlLnJlbW92ZUF0dHJpYnV0ZShmKSB9KVxyXG4gICAgICAgIC8vIH1cclxuICAgICAgfVxyXG4gICAgfVxyXG4gIH1cclxuXHJcbiAgZnVuY3Rpb24gY2hlY2sgKG5vZGUpIHtcclxuICAgIHdoaWxlIChub2RlKSB7XHJcbiAgICAgIGN1cnJlbnROb2RlID0gbm9kZVxyXG4gICAgICBpZiAoY3VycmVudE5vZGUubm9kZVR5cGUgPT09IERPQ1VNRU5UX0VMRU1FTlRfVFlQRSkge1xyXG4gICAgICAgIGlmIChjdXJyZW50Tm9kZS5oYXNBdHRyaWJ1dGVzKCkpIHtcclxuICAgICAgICAgIGFkZEV2ZW50KGN1cnJlbnROb2RlKVxyXG4gICAgICAgICAgaW5zcGVjdEF0dHJpYnV0ZXMoY3VycmVudE5vZGUpXHJcbiAgICAgICAgfVxyXG4gICAgICAgIGNoZWNrKGN1cnJlbnROb2RlLmZpcnN0Q2hpbGQpXHJcbiAgICAgIH0gZWxzZSBpZiAoY3VycmVudE5vZGUubm9kZVZhbHVlLm1hdGNoKHJlKSkge1xyXG4gICAgICAgIHJlcGxhY2VIYW5kbGVCYXJzKGN1cnJlbnROb2RlLm5vZGVWYWx1ZSwgY3VycmVudE5vZGUpXHJcbiAgICAgIH1cclxuICAgICAgbm9kZSA9IG5vZGUubmV4dFNpYmxpbmdcclxuICAgIH1cclxuICB9XHJcblxyXG4gIGNoZWNrKGluc3RhbmNlKVxyXG59XHJcblxyXG5tb2R1bGUuZXhwb3J0cyA9IHRtcGxoYW5kbGVyXHJcbiIsIid1c2Ugc3RyaWN0J1xyXG4vKipcclxuICogS2VldGpzIHY0LjAuMCBBbHBoYSByZWxlYXNlOiBodHRwczovL2dpdGh1Yi5jb20va2VldGpzL2tlZXQuanNcclxuICogTWluaW1hbGlzdCB2aWV3IGxheWVyIGZvciB0aGUgd2ViXHJcbiAqXHJcbiAqIDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PCBLZWV0anMgPj4+Pj4+Pj4+Pj4+Pj4+Pj4+Pj4+Pj4+Pj4+Pj4+XHJcbiAqXHJcbiAqIENvcHlyaWdodCAyMDE4LCBTaGFocnVsIE5pemFtIFNlbGFtYXRcclxuICogUmVsZWFzZWQgdW5kZXIgdGhlIE1JVCBMaWNlbnNlLlxyXG4gKi9cclxuXHJcbnZhciBwYXJzZVN0ciA9IHJlcXVpcmUoJy4vY29tcG9uZW50cy9wYXJzZVN0cicpXHJcbnZhciB1cGRhdGVDb250ZXh0ID0gcmVxdWlyZSgnLi9jb21wb25lbnRzL2dlbkVsZW1lbnQnKS51cGRhdGVDb250ZXh0XHJcbnZhciBjbGVhclN0YXRlID0gcmVxdWlyZSgnLi9jb21wb25lbnRzL2dlbkVsZW1lbnQnKS5jbGVhclN0YXRlXHJcbnZhciBnZXRJZCA9IHJlcXVpcmUoJy4vdXRpbHMnKS5nZXRJZFxyXG52YXIgYXNzZXJ0ID0gcmVxdWlyZSgnLi91dGlscycpLmFzc2VydFxyXG5cclxudmFyIERPQ1VNRU5UX0ZSQUdNRU5UX1RZUEUgPSAxMVxyXG52YXIgRE9DVU1FTlRfVEVYVF9UWVBFID0gM1xyXG52YXIgRE9DVU1FTlRfRUxFTUVOVF9UWVBFID0gMVxyXG5cclxuLyoqXHJcbiAqIEBkZXNjcmlwdGlvblxyXG4gKiBUaGUgbWFpbiBjb25zdHJ1Y3RvciBvZiBLZWV0XHJcbiAqXHJcbiAqIEJhc2ljIFVzYWdlIDotXHJcbiAqXHJcbiAqICAgIGNvbnN0IEFwcCBleHRlbmRzIEtlZXQge31cclxuICogICAgY29uc3QgYXBwID0gbmV3IEFwcCgpXHJcbiAqICAgIGFwcC5tb3VudCgnaGVsbG8gd29ybGQnKS5saW5rKCdhcHAnKVxyXG4gKlxyXG4gKi9cclxuZnVuY3Rpb24gS2VldCAoKSB7fVxyXG5cclxuS2VldC5wcm90b3R5cGUubW91bnQgPSBmdW5jdGlvbiAoaW5zdGFuY2UpIHtcclxuICB2YXIgYmFzZVxyXG4gIHZhciB0ZW1wRGl2XHJcbiAgdmFyIGZyYWcgPSBkb2N1bWVudC5jcmVhdGVEb2N1bWVudEZyYWdtZW50KClcclxuICAvLyBCZWZvcmUgd2UgYmVnaW4gdG8gcGFyc2UgYW4gaW5zdGFuY2UsIGRvIGEgcnVuLWRvd24gY2hlY2tzXHJcbiAgLy8gdG8gY2xlYW4gdXAgYmFjay10aWNrIHN0cmluZyB3aGljaCB1c3VhbGx5IGhhcyBsaW5lIHNwYWNpbmcuXHJcbiAgaWYgKHR5cGVvZiBpbnN0YW5jZSA9PT0gJ3N0cmluZycpIHtcclxuICAgIGJhc2UgPSBpbnN0YW5jZS50cmltKCkucmVwbGFjZSgvXFxzKy9nLCAnICcpXHJcbiAgICB0ZW1wRGl2ID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnZGl2JylcclxuICAgIHRlbXBEaXYuaW5uZXJIVE1MID0gYmFzZVxyXG4gICAgd2hpbGUgKHRlbXBEaXYuZmlyc3RDaGlsZCkge1xyXG4gICAgICBmcmFnLmFwcGVuZENoaWxkKHRlbXBEaXYuZmlyc3RDaGlsZClcclxuICAgIH1cclxuICAvLyBJZiBpbnN0YW5jZSBpcyBhIGh0bWwgZWxlbWVudCBwcm9jZXNzIGFzIGh0bWwgZW50aXRpZXNcclxuICB9IGVsc2UgaWYgKHR5cGVvZiBpbnN0YW5jZSA9PT0gJ29iamVjdCcgJiYgaW5zdGFuY2VbJ25vZGVUeXBlJ10pIHtcclxuICAgIGlmIChpbnN0YW5jZVsnbm9kZVR5cGUnXSA9PT0gRE9DVU1FTlRfRUxFTUVOVF9UWVBFKSB7XHJcbiAgICAgIGZyYWcuYXBwZW5kQ2hpbGQoaW5zdGFuY2UpXHJcbiAgICB9IGVsc2UgaWYgKGluc3RhbmNlWydub2RlVHlwZSddID09PSBET0NVTUVOVF9GUkFHTUVOVF9UWVBFKSB7XHJcbiAgICAgIGZyYWcgPSBpbnN0YW5jZVxyXG4gICAgfSBlbHNlIGlmIChpbnN0YW5jZVsnbm9kZVR5cGUnXSA9PT0gRE9DVU1FTlRfVEVYVF9UWVBFKSB7XHJcbiAgICAgIGZyYWcuYXBwZW5kQ2hpbGQoaW5zdGFuY2UpXHJcbiAgICB9IGVsc2Uge1xyXG4gICAgICBhc3NlcnQoZmFsc2UsICdVbmFibGUgdG8gcGFyc2UgaW5zdGFuY2UsIHVua25vd24gdHlwZS4nKVxyXG4gICAgfVxyXG4gIH0gZWxzZSB7XHJcbiAgICBhc3NlcnQoZmFsc2UsICdQYXJhbWV0ZXIgaXMgbm90IGEgc3RyaW5nIG9yIGEgaHRtbCBlbGVtZW50LicpXHJcbiAgfVxyXG4gIC8vIHdlIHN0b3JlIHRoZSBwcmlzdGluZSBpbnN0YW5jZSBpbiBfX3ByaXN0aW5lRnJhZ21lbnRfX1xyXG4gIHRoaXMuX19wcmlzdGluZUZyYWdtZW50X18gPSBmcmFnLmNsb25lTm9kZSh0cnVlKVxyXG4gIHRoaXMuYmFzZSA9IGZyYWdcclxuXHJcbiAgLy8gY2xlYW51cCBzdGF0ZXMgb24gbW91bnRcclxuICBjbGVhclN0YXRlKClcclxuXHJcbiAgcmV0dXJuIHRoaXNcclxufVxyXG5cclxuS2VldC5wcm90b3R5cGUuZmx1c2ggPSBmdW5jdGlvbiAoaW5zdGFuY2UpIHtcclxuICAvLyBDdXN0b20gbWV0aG9kIHRvIGNsZWFuIHVwIHRoZSBjb21wb25lbnQgRE9NIHRyZWVcclxuICAvLyB1c2VmdWwgaWYgd2UgbmVlZCB0byBkbyBjbGVhbiB1cCByZXJlbmRlci5cclxuICB2YXIgZWwgPSBpbnN0YW5jZSB8fCB0aGlzLmVsXHJcbiAgdmFyIGVsZSA9IGdldElkKGVsKVxyXG4gIGlmIChlbGUpIGVsZS5pbm5lckhUTUwgPSAnJ1xyXG4gIHJldHVybiB0aGlzXHJcbn1cclxuXHJcbktlZXQucHJvdG90eXBlLmxpbmsgPSBmdW5jdGlvbiAoaWQpIHtcclxuICAvLyBUaGUgdGFyZ2V0IERPTSB3aGVyZSB0aGUgcmVuZGVyaW5nIHdpbGwgdG9vayBwbGFjZS5cclxuICBpZiAoIWlkKSBhc3NlcnQoaWQsICdObyBpZCBpcyBnaXZlbiBhcyBwYXJhbWV0ZXIuJylcclxuICB0aGlzLmVsID0gaWRcclxuICB0aGlzLnJlbmRlcigpXHJcbiAgcmV0dXJuIHRoaXNcclxufVxyXG5cclxuS2VldC5wcm90b3R5cGUucmVuZGVyID0gZnVuY3Rpb24gKHN0dWIpIHtcclxuICAvLyBsaWZlLWN5Y2xlIG1ldGhvZCBiZWZvcmUgcmVuZGVyaW5nIHRoZSBjb21wb25lbnRcclxuICBpZiAodGhpcy5jb21wb25lbnRXaWxsTW91bnQgJiYgdHlwZW9mIHRoaXMuY29tcG9uZW50V2lsbE1vdW50ID09PSAnZnVuY3Rpb24nKSB7XHJcbiAgICB0aGlzLmNvbXBvbmVudFdpbGxNb3VudCgpXHJcbiAgfVxyXG5cclxuICAvLyBSZW5kZXIgdGhpcyBjb21wb25lbnQgdG8gdGhlIHRhcmdldCBET01cclxuICBpZihzdHViKXtcclxuICAgIHRoaXMuSVNfU1RVQiA9IHRydWVcclxuICB9XHJcbiAgcGFyc2VTdHIuY2FsbCh0aGlzLCBzdHViKVxyXG4gIHJldHVybiB0aGlzXHJcbn1cclxuXHJcbktlZXQucHJvdG90eXBlLmNsdXN0ZXIgPSBmdW5jdGlvbiAoKSB7XHJcbiAgLy8gQ2hhaW4gbWV0aG9kIHRvIHJ1biBleHRlcm5hbCBmdW5jdGlvbihzKSwgdGhpcyBiYXNpY2FsbHkgc2VydmVcclxuICAvLyBhcyBhbiBpbml0aWFsaXplciBmb3IgYWxsIG5vbiBhdHRhY2hlZCBjaGlsZCBjb21wb25lbnRzIHdpdGhpbiB0aGUgaW5zdGFuY2UgdHJlZVxyXG4gIHZhciBhcmdzID0gW10uc2xpY2UuY2FsbChhcmd1bWVudHMpXHJcbiAgaWYgKGFyZ3MubGVuZ3RoID4gMCkge1xyXG4gICAgYXJncy5tYXAoZnVuY3Rpb24gKGYpIHtcclxuICAgICAgaWYgKHR5cGVvZiBmID09PSAnZnVuY3Rpb24nKSBmKClcclxuICAgIH0pXHJcbiAgfVxyXG59XHJcblxyXG5LZWV0LnByb3RvdHlwZS5jYWxsQmF0Y2hQb29sVXBkYXRlID0gZnVuY3Rpb24gKCkge1xyXG4gIC8vIGZvcmNlIGNvbXBvbmVudCB0byB1cGRhdGUsIGlmIGFueSBzdGF0ZSAvIG5vbi1zdGF0ZVxyXG4gIC8vIHZhbHVlIGNoYW5nZWQgRE9NIGRpZmZpbmcgd2lsbCBvY2N1clxyXG4gIHVwZGF0ZUNvbnRleHQuY2FsbCh0aGlzKVxyXG59XHJcblxyXG5tb2R1bGUuZXhwb3J0cyA9IEtlZXRcclxuIiwiJ3VzZSBzdHJpY3QnXG5cbnNldERPTS5LRVkgPSAnZGF0YS1rZXknXG5zZXRET00uSUdOT1JFID0gJ2RhdGEtaWdub3JlJ1xuc2V0RE9NLkNIRUNLU1VNID0gJ2RhdGEtY2hlY2tzdW0nXG52YXIgcGFyc2VIVE1MID0gcmVxdWlyZSgnLi9wYXJzZS1odG1sJylcbnZhciBLRVlfUFJFRklYID0gJ19zZXQtZG9tLSdcbnZhciBOT0RFX01PVU5URUQgPSBLRVlfUFJFRklYICsgJ21vdW50ZWQnXG52YXIgRUxFTUVOVF9UWVBFID0gMVxudmFyIERPQ1VNRU5UX1RZUEUgPSA5XG52YXIgRE9DVU1FTlRfRlJBR01FTlRfVFlQRSA9IDExXG5cbi8vIEV4cG9zZSBhcGkuXG5tb2R1bGUuZXhwb3J0cyA9IHNldERPTVxuXG4vKipcbiAqIEBkZXNjcmlwdGlvblxuICogVXBkYXRlcyBleGlzdGluZyBkb20gdG8gbWF0Y2ggYSBuZXcgZG9tLlxuICpcbiAqIEBwYXJhbSB7Tm9kZX0gb2xkTm9kZSAtIFRoZSBodG1sIGVudGl0eSB0byB1cGRhdGUuXG4gKiBAcGFyYW0ge1N0cmluZ3xOb2RlfSBuZXdOb2RlIC0gVGhlIHVwZGF0ZWQgaHRtbChlbnRpdHkpLlxuICovXG5mdW5jdGlvbiBzZXRET00gKG9sZE5vZGUsIG5ld05vZGUpIHtcbiAgLy8gRW5zdXJlIGEgcmVhbGlzaCBkb20gbm9kZSBpcyBwcm92aWRlZC5cbiAgYXNzZXJ0KG9sZE5vZGUgJiYgb2xkTm9kZS5ub2RlVHlwZSwgJ1lvdSBtdXN0IHByb3ZpZGUgYSB2YWxpZCBub2RlIHRvIHVwZGF0ZS4nKVxuXG4gIC8vIEFsaWFzIGRvY3VtZW50IGVsZW1lbnQgd2l0aCBkb2N1bWVudC5cbiAgaWYgKG9sZE5vZGUubm9kZVR5cGUgPT09IERPQ1VNRU5UX1RZUEUpIG9sZE5vZGUgPSBvbGROb2RlLmRvY3VtZW50RWxlbWVudFxuXG4gIC8vIERvY3VtZW50IEZyYWdtZW50cyBkb24ndCBoYXZlIGF0dHJpYnV0ZXMsIHNvIG5vIG5lZWQgdG8gbG9vayBhdCBjaGVja3N1bXMsIGlnbm9yZWQsIGF0dHJpYnV0ZXMsIG9yIG5vZGUgcmVwbGFjZW1lbnQuXG4gIGlmIChuZXdOb2RlLm5vZGVUeXBlID09PSBET0NVTUVOVF9GUkFHTUVOVF9UWVBFKSB7XG4gICAgLy8gU2ltcGx5IHVwZGF0ZSBhbGwgY2hpbGRyZW4gKGFuZCBzdWJjaGlsZHJlbikuXG4gICAgc2V0Q2hpbGROb2RlcyhvbGROb2RlLCBuZXdOb2RlKVxuICB9IGVsc2Uge1xuICAgIC8vIE90aGVyd2lzZSB3ZSBkaWZmIHRoZSBlbnRpcmUgb2xkIG5vZGUuXG4gICAgc2V0Tm9kZShvbGROb2RlLCB0eXBlb2YgbmV3Tm9kZSA9PT0gJ3N0cmluZydcbiAgICAgIC8vIElmIGEgc3RyaW5nIHdhcyBwcm92aWRlZCB3ZSB3aWxsIHBhcnNlIGl0IGFzIGRvbS5cbiAgICAgID8gcGFyc2VIVE1MKG5ld05vZGUsIG9sZE5vZGUubm9kZU5hbWUpXG4gICAgICA6IG5ld05vZGVcbiAgICApXG4gIH1cblxuICAvLyBUcmlnZ2VyIG1vdW50IGV2ZW50cyBvbiBpbml0aWFsIHNldC5cbiAgaWYgKCFvbGROb2RlW05PREVfTU9VTlRFRF0pIHtcbiAgICBvbGROb2RlW05PREVfTU9VTlRFRF0gPSB0cnVlXG4gICAgbW91bnQob2xkTm9kZSlcbiAgfVxufVxuXG4vKipcbiAqIEBwcml2YXRlXG4gKiBAZGVzY3JpcHRpb25cbiAqIFVwZGF0ZXMgYSBzcGVjaWZpYyBodG1sTm9kZSBhbmQgZG9lcyB3aGF0ZXZlciBpdCB0YWtlcyB0byBjb252ZXJ0IGl0IHRvIGFub3RoZXIgb25lLlxuICpcbiAqIEBwYXJhbSB7Tm9kZX0gb2xkTm9kZSAtIFRoZSBwcmV2aW91cyBIVE1MTm9kZS5cbiAqIEBwYXJhbSB7Tm9kZX0gbmV3Tm9kZSAtIFRoZSB1cGRhdGVkIEhUTUxOb2RlLlxuICovXG5mdW5jdGlvbiBzZXROb2RlIChvbGROb2RlLCBuZXdOb2RlKSB7XG4gIGlmIChvbGROb2RlLm5vZGVUeXBlID09PSBuZXdOb2RlLm5vZGVUeXBlKSB7XG4gICAgLy8gSGFuZGxlIHJlZ3VsYXIgZWxlbWVudCBub2RlIHVwZGF0ZXMuXG4gICAgaWYgKG9sZE5vZGUubm9kZVR5cGUgPT09IEVMRU1FTlRfVFlQRSkge1xuICAgICAgLy8gQ2hlY2tzIGlmIG5vZGVzIGFyZSBlcXVhbCBiZWZvcmUgZGlmZmluZy5cbiAgICAgIGlmIChpc0VxdWFsTm9kZShvbGROb2RlLCBuZXdOb2RlKSkge1xuICAgICAgICAvLyBjb25zb2xlLnRyYWNlKG9sZE5vZGUpXG4gICAgICAgIHJldHVyblxuICAgICAgfVxuXG4gICAgICAvLyBVcGRhdGUgYWxsIGNoaWxkcmVuIChhbmQgc3ViY2hpbGRyZW4pLlxuICAgICAgc2V0Q2hpbGROb2RlcyhvbGROb2RlLCBuZXdOb2RlKVxuXG4gICAgICAvLyBVcGRhdGUgdGhlIGVsZW1lbnRzIGF0dHJpYnV0ZXMgLyB0YWdOYW1lLlxuICAgICAgaWYgKG9sZE5vZGUubm9kZU5hbWUgPT09IG5ld05vZGUubm9kZU5hbWUpIHtcbiAgICAgICAgLy8gSWYgd2UgaGF2ZSB0aGUgc2FtZSBub2RlbmFtZSB0aGVuIHdlIGNhbiBkaXJlY3RseSB1cGRhdGUgdGhlIGF0dHJpYnV0ZXMuXG4gICAgICAgIHNldEF0dHJpYnV0ZXMob2xkTm9kZS5hdHRyaWJ1dGVzLCBuZXdOb2RlLmF0dHJpYnV0ZXMpXG4gICAgICB9IGVsc2Uge1xuICAgICAgICAvLyBPdGhlcndpc2UgY2xvbmUgdGhlIG5ldyBub2RlIHRvIHVzZSBhcyB0aGUgZXhpc3Rpbmcgbm9kZS5cbiAgICAgICAgdmFyIG5ld1ByZXYgPSBuZXdOb2RlLmNsb25lTm9kZSgpXG4gICAgICAgIC8vIENvcHkgb3ZlciBhbGwgZXhpc3RpbmcgY2hpbGRyZW4gZnJvbSB0aGUgb3JpZ2luYWwgbm9kZS5cbiAgICAgICAgd2hpbGUgKG9sZE5vZGUuZmlyc3RDaGlsZCkgbmV3UHJldi5hcHBlbmRDaGlsZChvbGROb2RlLmZpcnN0Q2hpbGQpXG4gICAgICAgIC8vIFJlcGxhY2UgdGhlIG9yaWdpbmFsIG5vZGUgd2l0aCB0aGUgbmV3IG9uZSB3aXRoIHRoZSByaWdodCB0YWcuXG4gICAgICAgIG9sZE5vZGUucGFyZW50Tm9kZS5yZXBsYWNlQ2hpbGQobmV3UHJldiwgb2xkTm9kZSlcbiAgICAgIH1cbiAgICB9IGVsc2Uge1xuICAgICAgLy8gSGFuZGxlIG90aGVyIHR5cGVzIG9mIG5vZGUgdXBkYXRlcyAodGV4dC9jb21tZW50cy9ldGMpLlxuICAgICAgLy8gSWYgYm90aCBhcmUgdGhlIHNhbWUgdHlwZSBvZiBub2RlIHdlIGNhbiB1cGRhdGUgZGlyZWN0bHkuXG4gICAgICBpZiAob2xkTm9kZS5ub2RlVmFsdWUgIT09IG5ld05vZGUubm9kZVZhbHVlKSB7XG4gICAgICAgIG9sZE5vZGUubm9kZVZhbHVlID0gbmV3Tm9kZS5ub2RlVmFsdWVcbiAgICAgIH1cbiAgICB9XG4gIH0gZWxzZSB7XG4gICAgLy8gd2UgaGF2ZSB0byByZXBsYWNlIHRoZSBub2RlLlxuICAgIG9sZE5vZGUucGFyZW50Tm9kZS5yZXBsYWNlQ2hpbGQobmV3Tm9kZSwgZGlzbW91bnQob2xkTm9kZSkpXG4gICAgbW91bnQobmV3Tm9kZSlcbiAgfVxufVxuXG4vKipcbiAqIEBwcml2YXRlXG4gKiBAZGVzY3JpcHRpb25cbiAqIFV0aWxpdHkgdGhhdCB3aWxsIHVwZGF0ZSBvbmUgbGlzdCBvZiBhdHRyaWJ1dGVzIHRvIG1hdGNoIGFub3RoZXIuXG4gKlxuICogQHBhcmFtIHtOYW1lZE5vZGVNYXB9IG9sZEF0dHJpYnV0ZXMgLSBUaGUgcHJldmlvdXMgYXR0cmlidXRlcy5cbiAqIEBwYXJhbSB7TmFtZWROb2RlTWFwfSBuZXdBdHRyaWJ1dGVzIC0gVGhlIHVwZGF0ZWQgYXR0cmlidXRlcy5cbiAqL1xuZnVuY3Rpb24gc2V0QXR0cmlidXRlcyAob2xkQXR0cmlidXRlcywgbmV3QXR0cmlidXRlcykge1xuICB2YXIgaSwgYSwgYiwgbnMsIG5hbWVcblxuICAvLyBSZW1vdmUgb2xkIGF0dHJpYnV0ZXMuXG4gIGZvciAoaSA9IG9sZEF0dHJpYnV0ZXMubGVuZ3RoOyBpLS07KSB7XG4gICAgYSA9IG9sZEF0dHJpYnV0ZXNbaV1cbiAgICBucyA9IGEubmFtZXNwYWNlVVJJXG4gICAgbmFtZSA9IGEubG9jYWxOYW1lXG4gICAgYiA9IG5ld0F0dHJpYnV0ZXMuZ2V0TmFtZWRJdGVtTlMobnMsIG5hbWUpXG4gICAgaWYgKCFiKSBvbGRBdHRyaWJ1dGVzLnJlbW92ZU5hbWVkSXRlbU5TKG5zLCBuYW1lKVxuICB9XG5cbiAgLy8gU2V0IG5ldyBhdHRyaWJ1dGVzLlxuICBmb3IgKGkgPSBuZXdBdHRyaWJ1dGVzLmxlbmd0aDsgaS0tOykge1xuICAgIGEgPSBuZXdBdHRyaWJ1dGVzW2ldXG4gICAgbnMgPSBhLm5hbWVzcGFjZVVSSVxuICAgIG5hbWUgPSBhLmxvY2FsTmFtZVxuICAgIGIgPSBvbGRBdHRyaWJ1dGVzLmdldE5hbWVkSXRlbU5TKG5zLCBuYW1lKVxuICAgIGlmICghYikge1xuICAgICAgLy8gQWRkIGEgbmV3IGF0dHJpYnV0ZS5cbiAgICAgIG5ld0F0dHJpYnV0ZXMucmVtb3ZlTmFtZWRJdGVtTlMobnMsIG5hbWUpXG4gICAgICBvbGRBdHRyaWJ1dGVzLnNldE5hbWVkSXRlbU5TKGEpXG4gICAgfSBlbHNlIGlmIChiLnZhbHVlICE9PSBhLnZhbHVlKSB7XG4gICAgICAvLyBVcGRhdGUgZXhpc3RpbmcgYXR0cmlidXRlLlxuICAgICAgYi52YWx1ZSA9IGEudmFsdWVcbiAgICB9XG4gIH1cbn1cblxuLyoqXG4gKiBAcHJpdmF0ZVxuICogQGRlc2NyaXB0aW9uXG4gKiBVdGlsaXR5IHRoYXQgd2lsbCBub2RlcyBjaGlsZGVybiB0byBtYXRjaCBhbm90aGVyIG5vZGVzIGNoaWxkcmVuLlxuICpcbiAqIEBwYXJhbSB7Tm9kZX0gb2xkUGFyZW50IC0gVGhlIGV4aXN0aW5nIHBhcmVudCBub2RlLlxuICogQHBhcmFtIHtOb2RlfSBuZXdQYXJlbnQgLSBUaGUgbmV3IHBhcmVudCBub2RlLlxuICovXG5mdW5jdGlvbiBzZXRDaGlsZE5vZGVzIChvbGRQYXJlbnQsIG5ld1BhcmVudCkge1xuICB2YXIgY2hlY2tPbGQsIG9sZEtleSwgY2hlY2tOZXcsIG5ld0tleSwgZm91bmROb2RlLCBrZXllZE5vZGVzXG4gIHZhciBvbGROb2RlID0gb2xkUGFyZW50LmZpcnN0Q2hpbGRcbiAgdmFyIG5ld05vZGUgPSBuZXdQYXJlbnQuZmlyc3RDaGlsZFxuICB2YXIgZXh0cmEgPSAwXG5cbiAgLy8gRXh0cmFjdCBrZXllZCBub2RlcyBmcm9tIHByZXZpb3VzIGNoaWxkcmVuIGFuZCBrZWVwIHRyYWNrIG9mIHRvdGFsIGNvdW50LlxuICB3aGlsZSAob2xkTm9kZSkge1xuICAgIGV4dHJhKytcbiAgICBjaGVja09sZCA9IG9sZE5vZGVcbiAgICBvbGRLZXkgPSBnZXRLZXkoY2hlY2tPbGQpXG4gICAgb2xkTm9kZSA9IG9sZE5vZGUubmV4dFNpYmxpbmdcblxuICAgIGlmIChvbGRLZXkpIHtcbiAgICAgIGlmICgha2V5ZWROb2Rlcykga2V5ZWROb2RlcyA9IHt9XG4gICAgICBrZXllZE5vZGVzW29sZEtleV0gPSBjaGVja09sZFxuICAgIH1cbiAgfVxuXG4gIC8vIExvb3Agb3ZlciBuZXcgbm9kZXMgYW5kIHBlcmZvcm0gdXBkYXRlcy5cbiAgb2xkTm9kZSA9IG9sZFBhcmVudC5maXJzdENoaWxkXG4gIHdoaWxlIChuZXdOb2RlKSB7XG4gICAgZXh0cmEtLVxuICAgIGNoZWNrTmV3ID0gbmV3Tm9kZVxuICAgIG5ld05vZGUgPSBuZXdOb2RlLm5leHRTaWJsaW5nXG5cbiAgICBpZiAoa2V5ZWROb2RlcyAmJiAobmV3S2V5ID0gZ2V0S2V5KGNoZWNrTmV3KSkgJiYgKGZvdW5kTm9kZSA9IGtleWVkTm9kZXNbbmV3S2V5XSkpIHtcbiAgICAgIGRlbGV0ZSBrZXllZE5vZGVzW25ld0tleV1cbiAgICAgIC8vIElmIHdlIGhhdmUgYSBrZXkgYW5kIGl0IGV4aXN0ZWQgYmVmb3JlIHdlIG1vdmUgdGhlIHByZXZpb3VzIG5vZGUgdG8gdGhlIG5ldyBwb3NpdGlvbiBpZiBuZWVkZWQgYW5kIGRpZmYgaXQuXG4gICAgICBpZiAoZm91bmROb2RlICE9PSBvbGROb2RlKSB7XG4gICAgICAgIG9sZFBhcmVudC5pbnNlcnRCZWZvcmUoZm91bmROb2RlLCBvbGROb2RlKVxuICAgICAgfSBlbHNlIHtcbiAgICAgICAgb2xkTm9kZSA9IG9sZE5vZGUubmV4dFNpYmxpbmdcbiAgICAgIH1cblxuICAgICAgc2V0Tm9kZShmb3VuZE5vZGUsIGNoZWNrTmV3KVxuICAgIH0gZWxzZSBpZiAob2xkTm9kZSkge1xuICAgICAgY2hlY2tPbGQgPSBvbGROb2RlXG4gICAgICBvbGROb2RlID0gb2xkTm9kZS5uZXh0U2libGluZ1xuICAgICAgaWYgKGdldEtleShjaGVja09sZCkpIHtcbiAgICAgICAgLy8gSWYgdGhlIG9sZCBjaGlsZCBoYWQgYSBrZXkgd2Ugc2tpcCBvdmVyIGl0IHVudGlsIHRoZSBlbmQuXG4gICAgICAgIG9sZFBhcmVudC5pbnNlcnRCZWZvcmUoY2hlY2tOZXcsIGNoZWNrT2xkKVxuICAgICAgICBtb3VudChjaGVja05ldylcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIC8vIE90aGVyd2lzZSB3ZSBkaWZmIHRoZSB0d28gbm9uLWtleWVkIG5vZGVzLlxuICAgICAgICBzZXROb2RlKGNoZWNrT2xkLCBjaGVja05ldylcbiAgICAgIH1cbiAgICB9IGVsc2Uge1xuICAgICAgLy8gRmluYWxseSBpZiB0aGVyZSB3YXMgbm8gb2xkIG5vZGUgd2UgYWRkIHRoZSBuZXcgbm9kZS5cbiAgICAgIG9sZFBhcmVudC5hcHBlbmRDaGlsZChjaGVja05ldylcbiAgICAgIG1vdW50KGNoZWNrTmV3KVxuICAgIH1cbiAgfVxuXG4gIC8vIFJlbW92ZSBvbGQga2V5ZWQgbm9kZXMuXG4gIGZvciAob2xkS2V5IGluIGtleWVkTm9kZXMpIHtcbiAgICBleHRyYS0tXG4gICAgb2xkUGFyZW50LnJlbW92ZUNoaWxkKGRpc21vdW50KGtleWVkTm9kZXNbb2xkS2V5XSkpXG4gIH1cblxuICAvLyBJZiB3ZSBoYXZlIGFueSByZW1haW5pbmcgdW5rZXllZCBub2RlcyByZW1vdmUgdGhlbSBmcm9tIHRoZSBlbmQuXG4gIHdoaWxlICgtLWV4dHJhID49IDApIHtcbiAgICBvbGRQYXJlbnQucmVtb3ZlQ2hpbGQoZGlzbW91bnQob2xkUGFyZW50Lmxhc3RDaGlsZCkpXG4gIH1cbn1cblxuLyoqXG4gKiBAcHJpdmF0ZVxuICogQGRlc2NyaXB0aW9uXG4gKiBVdGlsaXR5IHRvIHRyeSB0byBwdWxsIGEga2V5IG91dCBvZiBhbiBlbGVtZW50LlxuICogVXNlcyAnZGF0YS1rZXknIGlmIHBvc3NpYmxlIGFuZCBmYWxscyBiYWNrIHRvICdpZCcuXG4gKlxuICogQHBhcmFtIHtOb2RlfSBub2RlIC0gVGhlIG5vZGUgdG8gZ2V0IHRoZSBrZXkgZm9yLlxuICogQHJldHVybiB7c3RyaW5nfHZvaWR9XG4gKi9cbmZ1bmN0aW9uIGdldEtleSAobm9kZSkge1xuICBpZiAobm9kZS5ub2RlVHlwZSAhPT0gRUxFTUVOVF9UWVBFKSByZXR1cm5cbiAgdmFyIGtleSA9IG5vZGUuZ2V0QXR0cmlidXRlKHNldERPTS5LRVkpIHx8IG5vZGUuaWRcbiAgaWYgKGtleSkgcmV0dXJuIEtFWV9QUkVGSVggKyBrZXlcbn1cblxuLyoqXG4gKiBDaGVja3MgaWYgbm9kZXMgYXJlIGVxdWFsIHVzaW5nIHRoZSBmb2xsb3dpbmcgYnkgY2hlY2tpbmcgaWZcbiAqIHRoZXkgYXJlIGJvdGggaWdub3JlZCwgaGF2ZSB0aGUgc2FtZSBjaGVja3N1bSwgb3IgaGF2ZSB0aGVcbiAqIHNhbWUgY29udGVudHMuXG4gKlxuICogQHBhcmFtIHtOb2RlfSBhIC0gT25lIG9mIHRoZSBub2RlcyB0byBjb21wYXJlLlxuICogQHBhcmFtIHtOb2RlfSBiIC0gQW5vdGhlciBub2RlIHRvIGNvbXBhcmUuXG4gKi9cbmZ1bmN0aW9uIGlzRXF1YWxOb2RlIChhLCBiKSB7XG4gIC8vIGNvbnNvbGUubG9nKGEsIGIsIGlzSWdub3JlZChhKSwgaXNJZ25vcmVkKGIpKVxuICByZXR1cm4gKFxuICAgIC8vIENoZWNrIGlmIGJvdGggbm9kZXMgYXJlIGlnbm9yZWQuXG4gICAgKGlzSWdub3JlZChhKSAmJiBpc0lnbm9yZWQoYikpIHx8XG4gICAgLy8gQ2hlY2sgaWYgYm90aCBub2RlcyBoYXZlIHRoZSBzYW1lIGNoZWNrc3VtLlxuICAgIChnZXRDaGVja1N1bShhKSA9PT0gZ2V0Q2hlY2tTdW0oYikpIHx8XG4gICAgLy8gRmFsbCBiYWNrIHRvIG5hdGl2ZSBpc0VxdWFsTm9kZSBjaGVjay5cbiAgICBhLmlzRXF1YWxOb2RlKGIpXG4gIClcbn1cblxuLyoqXG4gKiBAcHJpdmF0ZVxuICogQGRlc2NyaXB0aW9uXG4gKiBVdGlsaXR5IHRvIHRyeSB0byBwdWxsIGEgY2hlY2tzdW0gYXR0cmlidXRlIGZyb20gYW4gZWxlbWVudC5cbiAqIFVzZXMgJ2RhdGEtY2hlY2tzdW0nIG9yIHVzZXIgc3BlY2lmaWVkIGNoZWNrc3VtIHByb3BlcnR5LlxuICpcbiAqIEBwYXJhbSB7Tm9kZX0gbm9kZSAtIFRoZSBub2RlIHRvIGdldCB0aGUgY2hlY2tzdW0gZm9yLlxuICogQHJldHVybiB7c3RyaW5nfE5hTn1cbiAqL1xuZnVuY3Rpb24gZ2V0Q2hlY2tTdW0gKG5vZGUpIHtcbiAgcmV0dXJuIG5vZGUuZ2V0QXR0cmlidXRlKHNldERPTS5DSEVDS1NVTSkgfHwgTmFOXG59XG5cbi8qKlxuICogQHByaXZhdGVcbiAqIEBkZXNjcmlwdGlvblxuICogVXRpbGl0eSB0byB0cnkgdG8gY2hlY2sgaWYgYW4gZWxlbWVudCBzaG91bGQgYmUgaWdub3JlZCBieSB0aGUgYWxnb3JpdGhtLlxuICogVXNlcyAnZGF0YS1pZ25vcmUnIG9yIHVzZXIgc3BlY2lmaWVkIGlnbm9yZSBwcm9wZXJ0eS5cbiAqXG4gKiBAcGFyYW0ge05vZGV9IG5vZGUgLSBUaGUgbm9kZSB0byBjaGVjayBpZiBpdCBzaG91bGQgYmUgaWdub3JlZC5cbiAqIEByZXR1cm4ge2Jvb2xlYW59XG4gKi9cbmZ1bmN0aW9uIGlzSWdub3JlZCAobm9kZSkge1xuICByZXR1cm4gbm9kZS5nZXRBdHRyaWJ1dGUoc2V0RE9NLklHTk9SRSkgIT0gbnVsbFxufVxuXG4vKipcbiAqIERpc3BhdGNoZXMgYSBtb3VudCBldmVudCBmb3IgdGhlIGdpdmVuIG5vZGUgYW5kIGNoaWxkcmVuLlxuICpcbiAqIEBwYXJhbSB7Tm9kZX0gbm9kZSAtIHRoZSBub2RlIHRvIG1vdW50LlxuICogQHJldHVybiB7bm9kZX1cbiAqL1xuZnVuY3Rpb24gbW91bnQgKG5vZGUpIHtcbiAgcmV0dXJuIGRpc3BhdGNoKG5vZGUsICdtb3VudCcpXG59XG5cbi8qKlxuICogRGlzcGF0Y2hlcyBhIGRpc21vdW50IGV2ZW50IGZvciB0aGUgZ2l2ZW4gbm9kZSBhbmQgY2hpbGRyZW4uXG4gKlxuICogQHBhcmFtIHtOb2RlfSBub2RlIC0gdGhlIG5vZGUgdG8gZGlzbW91bnQuXG4gKiBAcmV0dXJuIHtub2RlfVxuICovXG5mdW5jdGlvbiBkaXNtb3VudCAobm9kZSkge1xuICByZXR1cm4gZGlzcGF0Y2gobm9kZSwgJ2Rpc21vdW50Jylcbn1cblxuLyoqXG4gKiBSZWN1cnNpdmVseSB0cmlnZ2VyIGFuIGV2ZW50IGZvciBhIG5vZGUgYW5kIGl0J3MgY2hpbGRyZW4uXG4gKiBPbmx5IGVtaXRzIGV2ZW50cyBmb3Iga2V5ZWQgbm9kZXMuXG4gKlxuICogQHBhcmFtIHtOb2RlfSBub2RlIC0gdGhlIGluaXRpYWwgbm9kZS5cbiAqIEByZXR1cm4ge05vZGV9XG4gKi9cbmZ1bmN0aW9uIGRpc3BhdGNoIChub2RlLCB0eXBlKSB7XG4gIC8vIFRyaWdnZXIgZXZlbnQgZm9yIHRoaXMgZWxlbWVudCBpZiBpdCBoYXMgYSBrZXkuXG4gIGlmIChnZXRLZXkobm9kZSkpIHtcbiAgICB2YXIgZXYgPSBkb2N1bWVudC5jcmVhdGVFdmVudCgnRXZlbnQnKVxuICAgIHZhciBwcm9wID0geyB2YWx1ZTogbm9kZSB9XG4gICAgZXYuaW5pdEV2ZW50KHR5cGUsIGZhbHNlLCBmYWxzZSlcbiAgICBPYmplY3QuZGVmaW5lUHJvcGVydHkoZXYsICd0YXJnZXQnLCBwcm9wKVxuICAgIE9iamVjdC5kZWZpbmVQcm9wZXJ0eShldiwgJ3NyY0VsZW1lbnQnLCBwcm9wKVxuICAgIG5vZGUuZGlzcGF0Y2hFdmVudChldilcbiAgfVxuXG4gIC8vIERpc3BhdGNoIHRvIGFsbCBjaGlsZHJlbi5cbiAgdmFyIGNoaWxkID0gbm9kZS5maXJzdENoaWxkXG4gIHdoaWxlIChjaGlsZCkgY2hpbGQgPSBkaXNwYXRjaChjaGlsZCwgdHlwZSkubmV4dFNpYmxpbmdcbiAgcmV0dXJuIG5vZGVcbn1cblxuLyoqXG4gKiBAcHJpdmF0ZVxuICogQGRlc2NyaXB0aW9uXG4gKiBDb25maXJtIHRoYXQgYSB2YWx1ZSBpcyB0cnV0aHksIHRocm93cyBhbiBlcnJvciBtZXNzYWdlIG90aGVyd2lzZS5cbiAqXG4gKiBAcGFyYW0geyp9IHZhbCAtIHRoZSB2YWwgdG8gdGVzdC5cbiAqIEBwYXJhbSB7c3RyaW5nfSBtc2cgLSB0aGUgZXJyb3IgbWVzc2FnZSBvbiBmYWlsdXJlLlxuICogQHRocm93cyB7RXJyb3J9XG4gKi9cbmZ1bmN0aW9uIGFzc2VydCAodmFsLCBtc2cpIHtcbiAgaWYgKCF2YWwpIHRocm93IG5ldyBFcnJvcignc2V0LWRvbTogJyArIG1zZylcbn1cbiIsIid1c2Ugc3RyaWN0J1xudmFyIHBhcnNlciA9IHdpbmRvdy5ET01QYXJzZXIgJiYgbmV3IHdpbmRvdy5ET01QYXJzZXIoKVxudmFyIGRvY3VtZW50Um9vdE5hbWUgPSAnSFRNTCdcbnZhciBzdXBwb3J0c0hUTUxUeXBlID0gZmFsc2VcbnZhciBzdXBwb3J0c0lubmVySFRNTCA9IGZhbHNlXG52YXIgaHRtbFR5cGUgPSAndGV4dC9odG1sJ1xudmFyIHhodG1sVHlwZSA9ICdhcHBsaWNhdGlvbi94aHRtbCt4bWwnXG52YXIgdGVzdENsYXNzID0gJ0EnXG52YXIgdGVzdENvZGUgPSAnPHdiciBjbGFzcz1cIicgKyB0ZXN0Q2xhc3MgKyAnXCIvPidcblxudHJ5IHtcbiAgLy8gQ2hlY2sgaWYgYnJvd3NlciBzdXBwb3J0cyB0ZXh0L2h0bWwgRE9NUGFyc2VyXG4gIHZhciBwYXJzZWQgPSBwYXJzZXIucGFyc2VGcm9tU3RyaW5nKHRlc3RDb2RlLCBodG1sVHlwZSkuYm9keS5maXJzdENoaWxkXG4gIC8vIFNvbWUgYnJvd3NlcnMgKGlPUyA5IGFuZCBTYWZhcmkgOSkgbG93ZXJjYXNlIGNsYXNzZXMgZm9yIHBhcnNlZCBlbGVtZW50c1xuICAvLyBidXQgb25seSB3aGVuIGFwcGVuZGluZyB0byBET00sIHNvIHVzZSBpbm5lckhUTUwgaW5zdGVhZFxuICB2YXIgZCA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2RpdicpXG4gIGQuYXBwZW5kQ2hpbGQocGFyc2VkKVxuICBpZiAoZC5maXJzdENoaWxkLmNsYXNzTGlzdFswXSAhPT0gdGVzdENsYXNzKSB0aHJvdyBuZXcgRXJyb3IoKVxuICBzdXBwb3J0c0hUTUxUeXBlID0gdHJ1ZVxufSBjYXRjaCAoZSkge31cblxudmFyIG1vY2tEb2MgPSBkb2N1bWVudC5pbXBsZW1lbnRhdGlvbi5jcmVhdGVIVE1MRG9jdW1lbnQoJycpXG52YXIgbW9ja0hUTUwgPSBtb2NrRG9jLmRvY3VtZW50RWxlbWVudFxudmFyIG1vY2tCb2R5ID0gbW9ja0RvYy5ib2R5XG50cnkge1xuICAvLyBDaGVjayBpZiBicm93c2VyIHN1cHBvcnRzIGRvY3VtZW50RWxlbWVudC5pbm5lckhUTUxcbiAgbW9ja0hUTUwuaW5uZXJIVE1MICs9ICcnXG4gIHN1cHBvcnRzSW5uZXJIVE1MID0gdHJ1ZVxufSBjYXRjaCAoZSkge1xuICAvLyBDaGVjayBpZiBicm93c2VyIHN1cHBvcnRzIHhodG1sIHBhcnNpbmcuXG4gIHBhcnNlci5wYXJzZUZyb21TdHJpbmcodGVzdENvZGUsIHhodG1sVHlwZSlcbiAgdmFyIGJvZHlSZWcgPSAvKDxib2R5W14+XSo+KShbXFxzXFxTXSopPFxcL2JvZHk+L1xufVxuXG5mdW5jdGlvbiBET01QYXJzZXJQYXJzZSAobWFya3VwLCByb290TmFtZSkge1xuICB2YXIgZG9jID0gcGFyc2VyLnBhcnNlRnJvbVN0cmluZyhtYXJrdXAsIGh0bWxUeXBlKVxuICAvLyBQYXRjaCBmb3IgaU9TIFVJV2ViVmlldyBub3QgYWx3YXlzIHJldHVybmluZyBkb2MuYm9keSBzeW5jaHJvbm91c2x5XG4gIGlmICghZG9jLmJvZHkpIHsgcmV0dXJuIGZhbGxiYWNrUGFyc2UobWFya3VwLCByb290TmFtZSkgfVxuXG4gIHJldHVybiByb290TmFtZSA9PT0gZG9jdW1lbnRSb290TmFtZVxuICAgID8gZG9jLmRvY3VtZW50RWxlbWVudFxuICAgIDogZG9jLmJvZHkuZmlyc3RDaGlsZFxufVxuXG5mdW5jdGlvbiBmYWxsYmFja1BhcnNlIChtYXJrdXAsIHJvb3ROYW1lKSB7XG4gIC8vIEZhbGxiYWNrIHRvIGlubmVySFRNTCBmb3Igb3RoZXIgb2xkZXIgYnJvd3NlcnMuXG4gIGlmIChyb290TmFtZSA9PT0gZG9jdW1lbnRSb290TmFtZSkge1xuICAgIGlmIChzdXBwb3J0c0lubmVySFRNTCkge1xuICAgICAgbW9ja0hUTUwuaW5uZXJIVE1MID0gbWFya3VwXG4gICAgICByZXR1cm4gbW9ja0hUTUxcbiAgICB9IGVsc2Uge1xuICAgICAgLy8gSUU5IGRvZXMgbm90IHN1cHBvcnQgaW5uZXJodG1sIGF0IHJvb3QgbGV2ZWwuXG4gICAgICAvLyBXZSBnZXQgYXJvdW5kIHRoaXMgYnkgcGFyc2luZyBldmVyeXRoaW5nIGV4Y2VwdCB0aGUgYm9keSBhcyB4aHRtbC5cbiAgICAgIHZhciBib2R5TWF0Y2ggPSBtYXJrdXAubWF0Y2goYm9keVJlZylcbiAgICAgIGlmIChib2R5TWF0Y2gpIHtcbiAgICAgICAgdmFyIGJvZHlDb250ZW50ID0gYm9keU1hdGNoWzJdXG4gICAgICAgIHZhciBzdGFydEJvZHkgPSBib2R5TWF0Y2guaW5kZXggKyBib2R5TWF0Y2hbMV0ubGVuZ3RoXG4gICAgICAgIHZhciBlbmRCb2R5ID0gc3RhcnRCb2R5ICsgYm9keUNvbnRlbnQubGVuZ3RoXG4gICAgICAgIG1hcmt1cCA9IG1hcmt1cC5zbGljZSgwLCBzdGFydEJvZHkpICsgbWFya3VwLnNsaWNlKGVuZEJvZHkpXG4gICAgICAgIG1vY2tCb2R5LmlubmVySFRNTCA9IGJvZHlDb250ZW50XG4gICAgICB9XG5cbiAgICAgIHZhciBkb2MgPSBwYXJzZXIucGFyc2VGcm9tU3RyaW5nKG1hcmt1cCwgeGh0bWxUeXBlKVxuICAgICAgdmFyIGJvZHkgPSBkb2MuYm9keVxuICAgICAgd2hpbGUgKG1vY2tCb2R5LmZpcnN0Q2hpbGQpIGJvZHkuYXBwZW5kQ2hpbGQobW9ja0JvZHkuZmlyc3RDaGlsZClcbiAgICAgIHJldHVybiBkb2MuZG9jdW1lbnRFbGVtZW50XG4gICAgfVxuICB9IGVsc2Uge1xuICAgIG1vY2tCb2R5LmlubmVySFRNTCA9IG1hcmt1cFxuICAgIHJldHVybiBtb2NrQm9keS5maXJzdENoaWxkXG4gIH1cbn1cblxuLyoqXG4gKiBSZXR1cm5zIHRoZSByZXN1bHRzIG9mIGEgRE9NUGFyc2VyIGFzIGFuIEhUTUxFbGVtZW50LlxuICogKFNoaW1zIGZvciBvbGRlciBicm93c2VycykuXG4gKi9cbm1vZHVsZS5leHBvcnRzID0gc3VwcG9ydHNIVE1MVHlwZVxuICA/IERPTVBhcnNlclBhcnNlXG4gIDogZmFsbGJhY2tQYXJzZVxuIiwidmFyIGdldElkID0gZnVuY3Rpb24gKGlkKSB7XHJcbiAgcmV0dXJuIGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKGlkKVxyXG59XHJcblxyXG5leHBvcnRzLmdldElkID0gZ2V0SWRcclxuXHJcbmV4cG9ydHMudGVzdEV2ZW50ID0gZnVuY3Rpb24gKHRtcGwpIHtcclxuICByZXR1cm4gLyBrLS8udGVzdCh0bXBsKVxyXG59XHJcblxyXG4vKipcclxuICogQHByaXZhdGVcclxuICogQGRlc2NyaXB0aW9uXHJcbiAqIENoZWNrIGEgbm9kZSBhdmFpbGFiaWxpdHkgaW4gMjUwbXMsIGlmIG5vdCBmb3VuZCBzaWxlbnR5IHNraXAgdGhlIGV2ZW50XHJcbiAqXHJcbiAqIEBwYXJhbSB7c3RyaW5nfSBpZCAtIHRoZSBub2RlIGlkXHJcbiAqIEBwYXJhbSB7ZnVuY3Rpb259IGNhbGxiYWNrIC0gdGhlIGZ1bmN0aW9uIHRvIGV4ZWN1dGUgb25jZSB0aGUgbm9kZSBpcyBmb3VuZFxyXG4gKi9cclxuZXhwb3J0cy5jaGVja05vZGVBdmFpbGFiaWxpdHkgPSBmdW5jdGlvbiAoY29tcG9uZW50LCBjb21wb25lbnROYW1lLCBjYWxsYmFjaywgbm90Rm91bmQpIHtcclxuICB2YXIgZWxlID0gZ2V0SWQoY29tcG9uZW50LmVsKVxyXG4gIHZhciBmb3VuZCA9IGZhbHNlXHJcbiAgaWYgKGVsZSkgcmV0dXJuIGVsZVxyXG4gIGVsc2Uge1xyXG4gICAgdmFyIHQgPSBzZXRJbnRlcnZhbChmdW5jdGlvbiAoKSB7XHJcbiAgICAgIGVsZSA9IGdldElkKGNvbXBvbmVudC5lbClcclxuICAgICAgaWYgKGVsZSkge1xyXG4gICAgICAgIGNsZWFySW50ZXJ2YWwodClcclxuICAgICAgICBmb3VuZCA9IHRydWVcclxuICAgICAgICBjYWxsYmFjayhjb21wb25lbnQsIGNvbXBvbmVudE5hbWUsIGVsZSlcclxuICAgICAgfVxyXG4gICAgfSwgMClcclxuICAgIC8vIHNpbGVudGx5IGlnbm9yZSBmaW5kaW5nIHRoZSBub2RlIGFmdGVyIHNvbWV0aW1lc1xyXG4gICAgc2V0VGltZW91dChmdW5jdGlvbiAoKSB7XHJcbiAgICAgIGNsZWFySW50ZXJ2YWwodClcclxuICAgICAgaWYgKCFmb3VuZCAmJiBub3RGb3VuZCAmJiB0eXBlb2Ygbm90Rm91bmQgPT09ICdmdW5jdGlvbicpIG5vdEZvdW5kKClcclxuICAgIH0sIDI1MClcclxuICB9XHJcbn1cclxuXHJcbi8qKlxyXG4gKiBAcHJpdmF0ZVxyXG4gKiBAZGVzY3JpcHRpb25cclxuICogQ29uZmlybSB0aGF0IGEgdmFsdWUgaXMgdHJ1dGh5LCB0aHJvd3MgYW4gZXJyb3IgbWVzc2FnZSBvdGhlcndpc2UuXHJcbiAqXHJcbiAqIEBwYXJhbSB7Kn0gdmFsIC0gdGhlIHZhbCB0byB0ZXN0LlxyXG4gKiBAcGFyYW0ge3N0cmluZ30gbXNnIC0gdGhlIGVycm9yIG1lc3NhZ2Ugb24gZmFpbHVyZS5cclxuICogQHRocm93cyB7RXJyb3J9XHJcbiAqL1xyXG5leHBvcnRzLmFzc2VydCA9IGZ1bmN0aW9uICh2YWwsIG1zZykge1xyXG4gIGlmICghdmFsKSB0aHJvdyBuZXcgRXJyb3IoJyhrZWV0KSAnICsgbXNnKVxyXG59XHJcblxyXG4vKipcclxuICogQHByaXZhdGVcclxuICogQGRlc2NyaXB0aW9uXHJcbiAqIFNpbXBsZSBodG1sIHRlbXBsYXRlIGxpdGVyYWxzIE1PRElGSUVEIGZyb20gOiBodHRwOi8vMmFsaXR5LmNvbS8yMDE1LzAxL3RlbXBsYXRlLXN0cmluZ3MtaHRtbC5odG1sXHJcbiAqIGJ5IERyLiBBeGVsIFJhdXNjaG1heWVyXHJcbiAqIG5vIGNoZWNraW5nIGZvciB3cmFwcGluZyBpbiByb290IGVsZW1lbnRcclxuICogbm8gc3RyaWN0IGNoZWNraW5nXHJcbiAqIHJlbW92ZSBzcGFjaW5nIC8gaW5kZW50YXRpb25cclxuICoga2VlcCBhbGwgc3BhY2luZyB3aXRoaW4gaHRtbCB0YWdzXHJcbiAqIGluY2x1ZGUgaGFuZGxpbmcgJHt9IGluIHRoZSBsaXRlcmFsc1xyXG4gKi9cclxuZXhwb3J0cy5odG1sID0gZnVuY3Rpb24gaHRtbCAoKSB7XHJcbiAgdmFyIGxpdGVyYWxzID0gW10uc2hpZnQuY2FsbChhcmd1bWVudHMpXHJcbiAgdmFyIHN1YnN0cyA9IFtdLnNsaWNlLmNhbGwoYXJndW1lbnRzKVxyXG5cclxuICB2YXIgcmVzdWx0ID0gbGl0ZXJhbHMucmF3LnJlZHVjZShmdW5jdGlvbiAoYWNjLCBsaXQsIGkpIHtcclxuICAgIHJldHVybiBhY2MgKyBzdWJzdHNbaSAtIDFdICsgbGl0XHJcbiAgfSlcclxuICAvLyByZW1vdmUgc3BhY2luZywgaW5kZW50YXRpb24gZnJvbSBldmVyeSBsaW5lXHJcbiAgcmVzdWx0ID0gcmVzdWx0LnNwbGl0KC9cXG4rLylcclxuICByZXN1bHQgPSByZXN1bHQubWFwKGZ1bmN0aW9uICh0KSB7XHJcbiAgICByZXR1cm4gdC50cmltKClcclxuICB9KS5qb2luKCcnKVxyXG4gIHJldHVybiByZXN1bHRcclxufVxyXG5cclxuLyoqXHJcbiAqIEBwcml2YXRlXHJcbiAqIEBkZXNjcmlwdGlvblxyXG4gKiB0cm90dGxlIGZ1bmN0aW9uIGNhbGxzXHJcbiAqXHJcbiAqIEBwYXJhbSB7RnVuY3Rpb259IGZuIC0gZnVuY3Rpb24gdG8gdHJvdHRsZVxyXG4gKiBAcGFyYW0ge051bWJlcn0gZGVsYXkgLSB0aW1lIGRlbGF5IGJlZm9yZSBmdW5jdGlvbiBnZXQgZXhlY3V0ZWRcclxuICovXHJcblxyXG5mdW5jdGlvbiB0cm90dGxlKGZuLCBkZWxheSkge1xyXG4gIHZhciB0aW1lciA9IG51bGw7XHJcbiAgcmV0dXJuIGZ1bmN0aW9uICgpIHtcclxuICAgIHZhciBjb250ZXh0ID0gdGhpcywgYXJncyA9IGFyZ3VtZW50cztcclxuICAgIGNsZWFyVGltZW91dCh0aW1lcik7XHJcbiAgICB0aW1lciA9IHNldFRpbWVvdXQoZnVuY3Rpb24gKCkge1xyXG4gICAgICBmbi5hcHBseShjb250ZXh0LCBhcmdzKTtcclxuICAgIH0sIGRlbGF5KTtcclxuICB9O1xyXG59O1xyXG5cclxuZXhwb3J0cy50cm90dGxlID0gdHJvdHRsZVxyXG5cclxuLyoqXHJcbiAqIEBwcml2YXRlXHJcbiAqIEBkZXNjcmlwdGlvblxyXG4gKiBDb3B5IHdpdGggbW9kaWZpY2F0aW9uIGZyb20gcHJlYWN0LXRvZG9tdmMuIE1vZGVsIGNvbnN0cnVjdG9yIHdpdGhcclxuICogcmVnaXN0ZXJpbmcgY2FsbGJhY2sgbGlzdGVuZXIgaW4gT2JqZWN0LmRlZmluZVByb3BlcnR5LiBBbnkgbW9kaWZpY2F0aW9uXHJcbiAqIHRvIGBgYHRoaXMubGlzdGBgYCBpbnN0YW5jZSB3aWxsIHN1YnNlcXVlbnRseSBpbmZvcm0gYWxsIHJlZ2lzdGVyZWQgbGlzdGVuZXIuXHJcbiAqXHJcbiAqIHt7bW9kZWw6PG15TW9kZWw+fX08bXlNb2RlbFRlbXBsYXRlU3RyaW5nPnt7L21vZGVsOjxteU1vZGVsPn19XHJcbiAqXHJcbiAqL1xyXG5mdW5jdGlvbiBjcmVhdGVNb2RlbCAoKSB7XHJcbiAgdmFyIG1vZGVsID0gW11cclxuICB2YXIgb25DaGFuZ2VzID0gW11cclxuXHJcbiAgdmFyIGluZm9ybSA9IGZ1bmN0aW9uICgpIHtcclxuICAgIC8vIGNvbnNvbGUubG9nKG9uQ2hhbmdlcylcclxuICAgIGZvciAodmFyIGkgPSBvbkNoYW5nZXMubGVuZ3RoOyBpLS07KSB7XHJcbiAgICAgIG9uQ2hhbmdlc1tpXShtb2RlbClcclxuICAgIH1cclxuICB9XHJcblxyXG4vKipcclxuICogQHByaXZhdGVcclxuICogQGRlc2NyaXB0aW9uXHJcbiAqIFJlZ2lzdGVyIGNhbGxiYWNrIGxpc3RlbmVyIG9mIGFueSBjaGFuZ2VzXHJcbiAqL1xyXG4gIE9iamVjdC5kZWZpbmVQcm9wZXJ0eSh0aGlzLCAnbGlzdCcsIHtcclxuICAgIGVudW1lcmFibGU6IGZhbHNlLFxyXG4gICAgY29uZmlndXJhYmxlOiB0cnVlLFxyXG4gICAgZ2V0OiBmdW5jdGlvbiAoKSB7XHJcbiAgICAgIHJldHVybiBtb2RlbFxyXG4gICAgfSxcclxuICAgIHNldDogZnVuY3Rpb24gKHZhbCkge1xyXG4gICAgICBtb2RlbCA9IHZhbFxyXG4gICAgICBpbmZvcm0oKVxyXG4gICAgfVxyXG4gIH0pXHJcblxyXG4vKipcclxuICogQHByaXZhdGVcclxuICogQGRlc2NyaXB0aW9uXHJcbiAqIFN1YnNjcmliZSB0byB0aGUgbW9kZWwgY2hhbmdlcyAoYWRkL3VwZGF0ZS9kZXN0cm95KVxyXG4gKlxyXG4gKiBAcGFyYW0ge09iamVjdH0gbW9kZWwgLSB0aGUgbW9kZWwgaW5jbHVkaW5nIGFsbCBwcm90b3R5cGVzXHJcbiAqXHJcbiAqL1xyXG4gIHRoaXMuc3Vic2NyaWJlID0gZnVuY3Rpb24gKGZuKSB7XHJcbiAgICBvbkNoYW5nZXMucHVzaChmbilcclxuICB9XHJcblxyXG4vKipcclxuICogQHByaXZhdGVcclxuICogQGRlc2NyaXB0aW9uXHJcbiAqIEFkZCBuZXcgb2JqZWN0IHRvIHRoZSBtb2RlbCBsaXN0XHJcbiAqXHJcbiAqIEBwYXJhbSB7T2JqZWN0fSBvYmogLSBuZXcgb2JqZWN0IHRvIGFkZCBpbnRvIHRoZSBtb2RlbCBsaXN0XHJcbiAqXHJcbiAqL1xyXG4gIHRoaXMuYWRkID0gZnVuY3Rpb24gKG9iaikge1xyXG4gICAgdGhpcy5saXN0ID0gdGhpcy5saXN0LmNvbmNhdChvYmopXHJcbiAgfVxyXG5cclxuLyoqXHJcbiAqIEBwcml2YXRlXHJcbiAqIEBkZXNjcmlwdGlvblxyXG4gKiBVcGRhdGUgZXhpc3Rpbmcgb2JqZWN0IGluIHRoZSBtb2RlbCBsaXN0XHJcbiAqXHJcbiAqIEBwYXJhbSB7U3RyaW5nfSBsb29rdXBJZCAtIGxvb2t1cCBpZCBwcm9wZXJ0eSBuYW1lIG9mIHRoZSBvYmplY3RcclxuICogQHBhcmFtIHtPYmplY3R9IHVwZGF0ZU9iaiAtIHRoZSB1cGRhdGVkIHByb3BlcnRpZXNcclxuICpcclxuICovXHJcbiAgdGhpcy51cGRhdGUgPSBmdW5jdGlvbiAobG9va3VwSWQsIHVwZGF0ZU9iaikge1xyXG4gICAgdGhpcy5saXN0ID0gdGhpcy5saXN0Lm1hcChmdW5jdGlvbiAob2JqKSB7XHJcbiAgICAgIHJldHVybiBvYmpbbG9va3VwSWRdICE9PSB1cGRhdGVPYmpbbG9va3VwSWRdID8gb2JqIDogT2JqZWN0LmFzc2lnbihvYmosIHVwZGF0ZU9iailcclxuICAgIH0pXHJcbiAgfVxyXG5cclxuLyoqXHJcbiAqIEBwcml2YXRlXHJcbiAqIEBkZXNjcmlwdGlvblxyXG4gKiBSZW1vdmVkIGV4aXN0aW5nIG9iamVjdCBpbiB0aGUgbW9kZWwgbGlzdFxyXG4gKlxyXG4gKiBAcGFyYW0ge1N0cmluZ30gbG9va3VwSWQgLSBsb29rdXAgaWQgcHJvcGVydHkgbmFtZSBvZiB0aGUgb2JqZWN0XHJcbiAqIEBwYXJhbSB7U3RyaW5nfSBvYmpJZCAtIHVuaXF1ZSBpZGVudGlmaWVyIG9mIHRoZSBsb29rdXAgaWRcclxuICpcclxuICovXHJcbiAgdGhpcy5kZXN0cm95ID0gZnVuY3Rpb24gKGxvb2t1cElkLCBvYmpJZCkge1xyXG4gICAgdGhpcy5saXN0ID0gdGhpcy5saXN0LmZpbHRlcihmdW5jdGlvbiAob2JqKSB7XHJcbiAgICAgIHJldHVybiBvYmpbbG9va3VwSWRdICE9PSBvYmpJZFxyXG4gICAgfSlcclxuICB9XHJcbn1cclxuXHJcbmV4cG9ydHMuY3JlYXRlTW9kZWwgPSBjcmVhdGVNb2RlbFxyXG4iLCJpbXBvcnQgS2VldCBmcm9tICcuLi9rZWV0J1xyXG5pbXBvcnQgeyBodG1sIH0gZnJvbSAnLi4va2VldC91dGlscydcclxuaW1wb3J0IHsgZ2VuSWQgfSBmcm9tICcuL3V0aWwnXHJcbmltcG9ydCBmaWx0ZXJBcHAgIGZyb20gJy4vZmlsdGVyJ1xyXG5pbXBvcnQgdG9kb0FwcCwgeyBzdWJzY3JpYmUgfSBmcm9tICcuL3RvZG8nXHJcblxyXG5jbGFzcyBBcHAgZXh0ZW5kcyBLZWV0IHtcclxuICB0b2RvQXBwID0gdG9kb0FwcFxyXG4gIGZpbHRlciA9IGZpbHRlckFwcFxyXG4gIGlzQ2hlY2tlZCA9IGZhbHNlXHJcbiAgY291bnQgPSAwXHJcbiAgcGx1cmFsID0gJydcclxuICBjbGVhclRvZ2dsZSA9IGZhbHNlXHJcbiAgLy8gdG9kb1N0YXRlID0gdHJ1ZVxyXG5cclxuICBjb21wb25lbnRXaWxsTW91bnQoKSB7XHJcbiAgICAvLyB0aGlzLnRvZG9Nb2RlbC5zdWJzY3JpYmUodG9kb3MgPT4gdGhpcy5jYWxsQmF0Y2hQb29sVXBkYXRlKCkpXHJcbiAgICAvLyB0aGlzLnRvZG9TdGF0ZSA9IHRoaXMudG9kb0FwcC50b2RvTW9kZWwubGlzdC5sZW5ndGggPyB0cnVlIDogZmFsc2VcclxuICAgIC8vIGNvbnN0IHNlbGYgPSB0aGlzXHJcbiAgICBzdWJzY3JpYmUodG9kb3MgPT4ge1xyXG4gICAgICAvLyBjb25zb2xlLmxvZyh0b2RvcylcclxuICAgICAgbGV0IHVuY29tcGxldGVkID0gdG9kb3MuZmlsdGVyKGMgPT4gIWMuY29tcGxldGVkKVxyXG4gICAgICAvLyBsZXQgY29tcGxldGVkID0gdG9kb3MuZmlsdGVyKGMgPT4gYy5jb21wbGV0ZWQpXHJcbiAgICAgIC8vIHRoaXMuY2xlYXJUb2dnbGUgPSBjb21wbGV0ZWQubGVuZ3RoID8gdHJ1ZSA6IGZhbHNlXHJcbiAgICAgIC8vIHRoaXMudG9kb1N0YXRlID0gdG9kb3MubGVuZ3RoID8gdHJ1ZSA6IGZhbHNlXHJcbiAgICAgIC8vIHRoaXMucGx1cmFsID0gdW5jb21wbGV0ZWQubGVuZ3RoID09PSAxID8gJycgOiAncydcclxuICAgICAgdGhpcy5jb3VudCA9IHVuY29tcGxldGVkLmxlbmd0aFxyXG4gICAgICAvLyBjb25zb2xlLmxvZyh0aGlzKVxyXG4gICAgICAvLyB0aGlzLmNhbGxCYXRjaFBvb2xVcGRhdGUoKVxyXG4gICAgfSlcclxuICB9XHJcblxyXG4gIGNyZWF0ZSAoZXZ0KSB7XHJcbiAgICBpZihldnQua2V5Q29kZSAhPT0gMTMpIHJldHVyblxyXG4gICAgZXZ0LnByZXZlbnREZWZhdWx0KClcclxuICAgIGxldCB0aXRsZSA9IGV2dC50YXJnZXQudmFsdWUudHJpbSgpXHJcbiAgICBpZih0aXRsZSl7XHJcbiAgICAgIHRoaXMudG9kb0FwcC5hZGRUb2RvKHsgaWQ6IGdlbklkKCksIHRpdGxlLCBjb21wbGV0ZWQ6IGZhbHNlIH0pXHJcbiAgICAgIGV2dC50YXJnZXQudmFsdWUgPSAnJ1xyXG4gICAgfVxyXG4gIH1cclxuXHJcbiAgY29tcGxldGVBbGwoKXtcclxuICAgIHRoaXMuaXNDaGVja2VkID0gIXRoaXMuaXNDaGVja2VkXHJcbiAgICAvLyB0aGlzLnRvZG9BcHAudXBkYXRlQWxsKHRoaXMuaXNDaGVja2VkKVxyXG4gIH1cclxuXHJcbiAgY2xlYXJDb21wbGV0ZWQoKSB7XHJcbiAgICB0aGlzLnRvZG9BcHAuY2xlYXJDb21wbGV0ZWQoKVxyXG4gIH1cclxuICBlZGl0TW9kZSgpe1xyXG5cclxuICB9XHJcbiAgLy8gY29tcG9uZW50RGlkVXBkYXRlKCl7XHJcbiAgLy8gICBjKytcclxuICAvLyAgIGNvbnNvbGUubG9nKGMvKiwgdGltZSwgRGF0ZS5ub3coKSAtIHRpbWUqLylcclxuICAvLyB9XHJcbn1cclxuXHJcbmNvbnN0IHZtb2RlbCA9IGh0bWxgXHJcbiAgPHNlY3Rpb24gY2xhc3M9XCJ0b2RvYXBwXCI+XHJcbiAgICA8aGVhZGVyIGlkPVwiaGVhZGVyXCI+XHJcbiAgICAgIDxoMT50b2RvczwvaDE+XHJcbiAgICAgIDxpbnB1dCBjbGFzcz1cIm5ldy10b2RvXCIgay1rZXlkb3duPVwiY3JlYXRlKClcIiBwbGFjZWhvbGRlcj1cIldoYXQgbmVlZHMgdG8gYmUgZG9uZT9cIiBhdXRvZm9jdXM+XHJcbiAgICA8L2hlYWRlcj5cclxuICAgIDwhLS0ge3s/dG9kb1N0YXRlfX0gLS0+XHJcbiAgICA8c2VjdGlvbiBjbGFzcz1cIm1haW5cIj5cclxuICAgICAgPGlucHV0IGlkPVwidG9nZ2xlLWFsbFwiIGNsYXNzPVwidG9nZ2xlLWFsbFwiIHR5cGU9XCJjaGVja2JveFwiIGNoZWNrZWQ9XCJ7e2lzQ2hlY2tlZD9jaGVja2VkOicnfX1cIiBrLWNsaWNrPVwiY29tcGxldGVBbGwoKVwiPlxyXG4gICAgICA8bGFiZWwgZm9yPVwidG9nZ2xlLWFsbFwiPk1hcmsgYWxsIGFzIGNvbXBsZXRlPC9sYWJlbD5cclxuICAgICAgPCEtLSB7e2NvbXBvbmVudDp0b2RvQXBwfX0gLS0+XHJcbiAgICA8L3NlY3Rpb24+XHJcbiAgICA8Zm9vdGVyIGNsYXNzPVwiZm9vdGVyXCI+XHJcbiAgICAgIDxzcGFuIGNsYXNzPVwidG9kby1jb3VudFwiPlxyXG4gICAgICAgIDxzdHJvbmc+e3tjb3VudH19PC9zdHJvbmc+IGl0ZW17e3BsdXJhbH19IGxlZnRcclxuICAgICAgPC9zcGFuPlxyXG4gICAgICA8IS0tIHt7Y29tcG9uZW50OmZpbHRlcn19IC0tPlxyXG4gICAgICA8IS0tIHt7P2NsZWFyVG9nZ2xlfX0gLS0+XHJcbiAgICAgIDxidXR0b24gaWQ9XCJjbGVhci1jb21wbGV0ZWRcIiBjbGFzcz1cImNsZWFyLWNvbXBsZXRlZFwiPkNsZWFyIGNvbXBsZXRlZDwvYnV0dG9uPlxyXG4gICAgICA8IS0tIHt7L2NsZWFyVG9nZ2xlfX0gLS0+XHJcbiAgICA8L2Zvb3Rlcj5cclxuICAgIDwhLS0ge3svdG9kb1N0YXRlfX0gLS0+XHJcbiAgPC9zZWN0aW9uPlxyXG4gIDxmb290ZXIgY2xhc3M9XCJpbmZvXCI+XHJcbiAgICA8cD5Eb3VibGUtY2xpY2sgdG8gZWRpdCBhIHRvZG88L3A+XHJcbiAgICA8cD5DcmVhdGVkIGJ5IDxhIGhyZWY9XCJodHRwczovL2dpdGh1Yi5jb20vc3lhcnVsXCI+U2hhaHJ1bCBOaXphbSBTZWxhbWF0PC9hPjwvcD5cclxuICAgIDxwPlBhcnQgb2YgPGEgaHJlZj1cImh0dHA6Ly90b2RvbXZjLmNvbVwiPlRvZG9NVkM8L2E+PC9wPlxyXG4gIDwvZm9vdGVyPmBcclxuXHJcbmNvbnN0IGFwcCA9IG5ldyBBcHAoKVxyXG5cclxuYXBwLm1vdW50KHZtb2RlbCkubGluaygndG9kbycpXHJcbiIsImltcG9ydCB7IGNhbWVsQ2FzZSB9IGZyb20gJy4vdXRpbCdcclxuaW1wb3J0IHsgY3JlYXRlTW9kZWwgfSBmcm9tICcuLi9rZWV0L3V0aWxzJ1xyXG5cclxuY2xhc3MgQ3JlYXRlRmlsdGVyTW9kZWwgZXh0ZW5kcyBjcmVhdGVNb2RlbCB7XHJcbiAgc3dpdGNoKGhhc2gsIG9iail7XHJcbiAgICB0aGlzLmxpc3QgPSB0aGlzLmxpc3QubWFwKGZpbHRlciA9PlxyXG4gICAgICBmaWx0ZXIuaGFzaCA9PT0gaGFzaCA/ICh7IC4uLmZpbHRlciwgLi4ub2JqfSkgOiAoeyAuLi5maWx0ZXIsIC4uLnsgc2VsZWN0ZWQ6IGZhbHNlIH19KVxyXG4gICAgKVxyXG4gIH1cclxufVxyXG5cclxuY29uc3QgZmlsdGVyTW9kZWwgPSBuZXcgQ3JlYXRlRmlsdGVyTW9kZWwoKVxyXG5cclxuQXJyYXkuZnJvbShbJ2FsbCcsICdhY3RpdmUnLCAnY29tcGxldGVkJ10pLm1hcChwYWdlID0+XHJcblx0ZmlsdGVyTW9kZWwuYWRkKHtcclxuICAgIGhhc2g6IGAjLyR7cGFnZX1gLFxyXG4gICAgbmFtZTogY2FtZWxDYXNlKHBhZ2UpLFxyXG4gICAgc2VsZWN0ZWQ6IGZhbHNlXHJcbiAgfSlcclxuKVxyXG5cclxuZXhwb3J0IGRlZmF1bHQgZmlsdGVyTW9kZWwiLCJpbXBvcnQgS2VldCBmcm9tICcuLi9rZWV0J1xyXG5pbXBvcnQgeyBodG1sIH0gZnJvbSAnLi4va2VldC91dGlscydcclxuaW1wb3J0IGZpbHRlck1vZGVsIGZyb20gJy4vZmlsdGVyLW1vZGVsJ1xyXG5cclxuXHJcbmNsYXNzIEFwcCBleHRlbmRzIEtlZXQge1xyXG4gIGVsID0gJ2ZpbHRlcnMnXHJcbiAgZmlsdGVyTW9kZWwgPSBmaWx0ZXJNb2RlbFxyXG4gIGNvbXBvbmVudFdpbGxNb3VudCgpIHtcclxuICAgIHRoaXMuZmlsdGVyTW9kZWwuc3Vic2NyaWJlKG1vZGVsID0+IHRoaXMuY2FsbEJhdGNoUG9vbFVwZGF0ZSgpKVxyXG4gICAgaWYod2luZG93LmxvY2F0aW9uLmhhc2ggPT0gJycpIHtcclxuICAgICAgd2luZG93Lmhpc3RvcnkucHVzaFN0YXRlKHt9LCBudWxsLCAnIy9hbGwnKVxyXG4gICAgfVxyXG4gIH1cclxuICBjb21wb25lbnREaWRNb3VudCgpe1xyXG4gICAgdGhpcy51cGRhdGVVcmwod2luZG93LmxvY2F0aW9uLmhhc2gpXHJcbiAgICB3aW5kb3cub25wb3BzdGF0ZSA9ICgpID0+IHRoaXMudXBkYXRlVXJsKHdpbmRvdy5sb2NhdGlvbi5oYXNoKVxyXG4gIH1cclxuICB1cGRhdGVVcmwoaGFzaCkge1xyXG4gICAgdGhpcy5maWx0ZXJNb2RlbC5zd2l0Y2goaGFzaCwgeyBzZWxlY3RlZDogdHJ1ZSB9KVxyXG4gIH1cclxufVxyXG5cclxuY29uc3QgZmlsdGVyQXBwID0gbmV3IEFwcCgpXHJcblxyXG5sZXQgdm1vZGVsID0gaHRtbGBcclxuXHQ8dWwgaWQ9XCJmaWx0ZXJzXCIgY2xhc3M9XCJmaWx0ZXJzXCI+XHJcblx0XHQ8IS0tIHt7bW9kZWw6ZmlsdGVyTW9kZWx9fSAtLT5cclxuXHRcdDxsaSBpZD1cInt7bmFtZX19XCIgay1jbGljaz1cInVwZGF0ZVVybCh7e2hhc2h9fSlcIj48YSBjbGFzcz1cInt7c2VsZWN0ZWQ/c2VsZWN0ZWQ6Jyd9fVwiIGhyZWY9XCJ7e2hhc2h9fVwiPnt7bmFtZX19PC9hPjwvbGk+XHJcblx0XHQ8IS0tIHt7L21vZGVsOmZpbHRlck1vZGVsfX0gLS0+XHJcblx0PC91bD5cclxuYFxyXG5cclxuZmlsdGVyQXBwLm1vdW50KHZtb2RlbClcclxuXHJcbmV4cG9ydCBkZWZhdWx0IGZpbHRlckFwcCIsImltcG9ydCBLZWV0IGZyb20gJy4uL2tlZXQnXHJcbmltcG9ydCB7IGNyZWF0ZU1vZGVsIH0gZnJvbSAnLi4va2VldC91dGlscydcclxuXHJcbmNsYXNzIENyZWF0ZU1vZGVsIGV4dGVuZHMgY3JlYXRlTW9kZWwge1xyXG5cclxuICBjbGVhckNvbXBsZXRlZCgpIHtcclxuICAgIHRoaXMubGlzdCA9IHRoaXMubGlzdC5maWx0ZXIodG9kbyA9PiAhdG9kby5jb21wbGV0ZWQpXHJcbiAgfSBcclxufVxyXG5cclxuY29uc3QgdG9kb01vZGVsID0gbmV3IENyZWF0ZU1vZGVsKClcclxuXHJcbmV4cG9ydCBkZWZhdWx0IHRvZG9Nb2RlbFxyXG4iLCJpbXBvcnQgS2VldCBmcm9tICcuLi9rZWV0J1xyXG5pbXBvcnQgeyBodG1sIH0gZnJvbSAnLi4va2VldC91dGlscydcclxuaW1wb3J0IHRvZG9Nb2RlbCBmcm9tICcuL3RvZG8tbW9kZWwnXHJcblxyXG5sZXQgb25DaGFuZ2VzID0gW11cclxuXHJcbmNvbnN0IHN1YnNjcmliZSA9IGZuID0+IG9uQ2hhbmdlcy5wdXNoKGZuKVxyXG5cclxuY2xhc3MgQXBwIGV4dGVuZHMgS2VldCB7XHJcbiAgZWwgPSAndG9kby1saXN0J1xyXG4gIHRvZG9Nb2RlbCA9IHRvZG9Nb2RlbFxyXG4gIGNvbXBvbmVudFdpbGxNb3VudCgpIHtcclxuICAgIHRoaXMudG9kb01vZGVsLnN1YnNjcmliZShtb2RlbCA9PiB7XHJcbiAgICAgIGZvciAobGV0IGkgPSBvbkNoYW5nZXMubGVuZ3RoOyBpLS07KSB7XHJcbiAgICAgICAgb25DaGFuZ2VzW2ldKG1vZGVsKVxyXG4gICAgICB9XHJcbiAgICAgIHRoaXMuY2FsbEJhdGNoUG9vbFVwZGF0ZSgpXHJcbiAgICB9KVxyXG4gIH1cclxuICBhZGRUb2RvKG5ld1RvZG8pe1xyXG4gICAgdGhpcy50b2RvTW9kZWwuYWRkKG5ld1RvZG8pXHJcbiAgfVxyXG4gIGV2dFRvZG8odGFyZ2V0KXtcclxuICAgIGlmKHRhcmdldC5jbGFzc05hbWUgPT09ICd0b2dnbGUnKSAgXHJcbiAgICAgIHRoaXMudG9nZ2xlVG9kbyh0YXJnZXQuZ2V0QXR0cmlidXRlKCdkYXRhLWlkJyksICEhdGFyZ2V0LmNoZWNrZWQpXHJcbiAgICBlbHNlIGlmKHRhcmdldC5jbGFzc05hbWUgPT09ICdkZXN0cm95JykgIFxyXG4gICAgICB0aGlzLnRvZG9EZXN0cm95KHRhcmdldC5nZXRBdHRyaWJ1dGUoJ2RhdGEtaWQnKSlcclxuICB9XHJcbiAgdG9nZ2xlVG9kbyhpZCwgY29tcGxldGVkKSB7XHJcbiAgICB0aGlzLnRvZG9Nb2RlbC51cGRhdGUoICdpZCcsIHsgaWQsIGNvbXBsZXRlZCB9KVxyXG4gIH1cclxuICB0b2RvRGVzdHJveShpZCkge1xyXG4gICAgdGhpcy50b2RvTW9kZWwuZGVzdHJveSgnaWQnLCBpZClcclxuICB9XHJcbiAgZWRpdE1vZGUoKXtcclxuICAgIFxyXG4gIH1cclxuICBpbmZvcm0oKXtcclxuXHJcbiAgfVxyXG59XHJcblxyXG5jb25zdCB0b2RvQXBwID0gbmV3IEFwcCgpXHJcblxyXG5sZXQgdm1vZGVsID0gaHRtbGBcclxuICA8dWwgaWQ9XCJ0b2RvLWxpc3RcIiBjbGFzcz1cInRvZG8tbGlzdFwiIGstY2xpY2s9XCJldnRUb2RvKClcIiBrLWRibGNsaWNrPVwiZWRpdE1vZGUoKVwiPlxyXG4gICAgPCEtLSB7e21vZGVsOnRvZG9Nb2RlbH19IC0tPlxyXG4gICAgICA8bGkgaWQ9XCJ7e2lkfX1cIiBjbGFzcz1cInt7Y29tcGxldGVkP2NvbXBsZXRlZDonJ319XCI+XHJcbiAgICAgICAgPGRpdiBjbGFzcz1cInZpZXdcIj5cclxuICAgICAgICAgIDxpbnB1dCBjbGFzcz1cInRvZ2dsZVwiIGRhdGEtaWQ9XCJ7e2lkfX1cIiB0eXBlPVwiY2hlY2tib3hcIiBjaGVja2VkPVwie3tjb21wbGV0ZWQ/Y2hlY2tlZDonJ319XCI+XHJcbiAgICAgICAgICA8bGFiZWw+e3t0aXRsZX19PC9sYWJlbD5cclxuICAgICAgICAgIDxidXR0b24gY2xhc3M9XCJkZXN0cm95XCIgZGF0YS1pZD1cInt7aWR9fVwiPjwvYnV0dG9uPlxyXG4gICAgICAgIDwvZGl2PlxyXG4gICAgICAgIDxpbnB1dCBjbGFzcz1cImVkaXRcIiBkYXRhLWlkPVwie3tpZH19XCIgdmFsdWU9XCJ7e3RpdGxlfX1cIj5cclxuICAgICAgPC9saT5cclxuICAgIDwhLS0ge3svbW9kZWw6dG9kb01vZGVsfX0gLS0+XHJcbiAgPC91bD5cclxuYFxyXG5cclxudG9kb0FwcC5tb3VudCh2bW9kZWwpXHJcblxyXG5leHBvcnQge1xyXG4gIHRvZG9BcHAgYXMgZGVmYXVsdCxcclxuICBzdWJzY3JpYmVcclxufSIsImNvbnN0IHN0b3JlID0gZnVuY3Rpb24obmFtZXNwYWNlLCBkYXRhKSB7XHJcbiAgaWYgKGFyZ3VtZW50cy5sZW5ndGggPiAxKSB7XHJcbiAgICByZXR1cm4gbG9jYWxTdG9yYWdlLnNldEl0ZW0obmFtZXNwYWNlLCBKU09OLnN0cmluZ2lmeShkYXRhKSlcclxuICB9IGVsc2Uge1xyXG4gICAgdmFyIHN0b3JlID0gbG9jYWxTdG9yYWdlLmdldEl0ZW0obmFtZXNwYWNlKVxyXG4gICAgcmV0dXJuIHN0b3JlICYmIEpTT04ucGFyc2Uoc3RvcmUpIHx8IFtdXHJcbiAgfVxyXG59XHJcblxyXG5jb25zdCBnZW5JZCA9IGZ1bmN0aW9uKCkge1xyXG4gIHJldHVybiAoTWF0aC5yb3VuZChNYXRoLnJhbmRvbSgpICogMHgxKjFlMTIpKS50b1N0cmluZygzMilcclxufVxyXG5cclxuY29uc3QgY2FtZWxDYXNlID0gZnVuY3Rpb24ocykge1xyXG4gIHJldHVybiBzLmNoYXJBdCgwKS50b1VwcGVyQ2FzZSgpICsgcy5zbGljZSgxKVxyXG59XHJcblxyXG5jb25zdCBodG1sID0gZnVuY3Rpb24gKGxpdGVyYWxTZWN0aW9ucywgLi4uc3Vic3RzKSB7XHJcbiAgLy8gVXNlIHJhdyBsaXRlcmFsIHNlY3Rpb25zOiB3ZSBkb27igJl0IHdhbnRcclxuICAvLyBiYWNrc2xhc2hlcyAoXFxuIGV0Yy4pIHRvIGJlIGludGVycHJldGVkXHJcbiAgbGV0IHJhdyA9IGxpdGVyYWxTZWN0aW9ucy5yYXc7XHJcblxyXG4gIGxldCByZXN1bHQgPSAnJztcclxuXHJcbiAgc3Vic3RzLmZvckVhY2goKHN1YnN0LCBpKSA9PiB7XHJcbiAgICAgIC8vIFJldHJpZXZlIHRoZSBsaXRlcmFsIHNlY3Rpb24gcHJlY2VkaW5nXHJcbiAgICAgIC8vIHRoZSBjdXJyZW50IHN1YnN0aXR1dGlvblxyXG4gICAgICBsZXQgbGl0ID0gcmF3W2ldO1xyXG5cclxuICAgICAgLy8gSW4gdGhlIGV4YW1wbGUsIG1hcCgpIHJldHVybnMgYW4gYXJyYXk6XHJcbiAgICAgIC8vIElmIHN1YnN0aXR1dGlvbiBpcyBhbiBhcnJheSAoYW5kIG5vdCBhIHN0cmluZyksXHJcbiAgICAgIC8vIHdlIHR1cm4gaXQgaW50byBhIHN0cmluZ1xyXG4gICAgICBpZiAoQXJyYXkuaXNBcnJheShzdWJzdCkpIHtcclxuICAgICAgICAgIHN1YnN0ID0gc3Vic3Quam9pbignJyk7XHJcbiAgICAgIH1cclxuXHJcbiAgICAgIC8vIElmIHRoZSBzdWJzdGl0dXRpb24gaXMgcHJlY2VkZWQgYnkgYSBkb2xsYXIgc2lnbixcclxuICAgICAgLy8gd2UgZXNjYXBlIHNwZWNpYWwgY2hhcmFjdGVycyBpbiBpdFxyXG4gICAgICBpZiAobGl0LmVuZHNXaXRoKCckJykpIHtcclxuICAgICAgICAgIHN1YnN0ID0gaHRtbEVzY2FwZShzdWJzdCk7XHJcbiAgICAgICAgICBsaXQgPSBsaXQuc2xpY2UoMCwgLTEpO1xyXG4gICAgICB9XHJcbiAgICAgIHJlc3VsdCArPSBsaXQ7XHJcbiAgICAgIHJlc3VsdCArPSBzdWJzdDtcclxuICB9KTtcclxuICAvLyBUYWtlIGNhcmUgb2YgbGFzdCBsaXRlcmFsIHNlY3Rpb25cclxuICAvLyAoTmV2ZXIgZmFpbHMsIGJlY2F1c2UgYW4gZW1wdHkgdGVtcGxhdGUgc3RyaW5nXHJcbiAgLy8gcHJvZHVjZXMgb25lIGxpdGVyYWwgc2VjdGlvbiwgYW4gZW1wdHkgc3RyaW5nKVxyXG4gIHJlc3VsdCArPSByYXdbcmF3Lmxlbmd0aC0xXTsgLy8gKEEpXHJcblxyXG4gIHJldHVybiByZXN1bHQ7XHJcbn1cclxuXHJcbmV4cG9ydCB7XHJcbiAgaHRtbCBhcyBkZWZhdWx0LFxyXG4gIGdlbklkLFxyXG4gIHN0b3JlLFxyXG4gIGNhbWVsQ2FzZVxyXG59Il19
