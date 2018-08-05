(function(){function r(e,n,t){function o(i,f){if(!n[i]){if(!e[i]){var c="function"==typeof require&&require;if(!f&&c)return c(i,!0);if(u)return u(i,!0);var a=new Error("Cannot find module '"+i+"'");throw a.code="MODULE_NOT_FOUND",a}var p=n[i]={exports:{}};e[i][0].call(p.exports,function(r){var n=e[i][1][r];return o(n||r)},p,p.exports,r,e,n,t)}return n[i].exports}for(var u="function"==typeof require&&require,i=0;i<t.length;i++)o(t[i]);return o}return r})()({1:[function(require,module,exports){
module.exports = function (string) {
  var self = this
  this.__componentList__.map(function (component) {
    if (self[component]) {
      var c = self[component]
      // register this component as a sub-component
      c.IS_STUB = true
      // life-cycle method before rendering sub-component
      var regx = '(\\{\\{component:' + component + '\\}\\})'
      var re = new RegExp(regx, 'g')
      var tpl = c.render('asString')
      self.__componentStub__[component] = tpl
      string = string.replace(re, tpl)
    }
  })
  return string
}

},{}],2:[function(require,module,exports){
var conditionalNodesRawStart = /\{\{\?([^{}]+)\}\}/g
var conditionalNodesRawEnd = /\{\{\/([^{}]+)\}\}/g
var DOCUMENT_TEXT_TYPE = 3
module.exports = function (node, conditional, tmplHandler) {
  var entryNode
  var currentNode
  var isGen
  var frag = document.createDocumentFragment()
  while(node){
    currentNode = node
    node = node.nextSibling
    if(currentNode.nodeType === DOCUMENT_TEXT_TYPE){
      if(currentNode.nodeValue.match(conditionalNodesRawStart)){
        entryNode = currentNode
      } else if(currentNode.nodeValue.match(conditionalNodesRawEnd)){
        currentNode.remove()
        // star generating the conditional nodes range, if not yet
        if(!isGen){
          isGen = true
          tmplHandler(this, null, null, null, frag)
        }
        if(this[conditional]){
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
  
  // var self = this
  // this.__stateList__.map(function (state) {
  //   if (!self[state]) {
  //     var f = '\\{\\{\\?' + state + '\\}\\}'
  //     var b = '\\{\\{\\/' + state + '\\}\\}'
  //     // var regx = '(?<=' + f + ')(.*?)(?=' + b + ')'
  //     // ** old browser does not support positive look behind **
  //     var regx = '(' + f + ')(.*?)(?=' + b + ')'
  //     var re = new RegExp(regx)
  //     var isConditional = re.test(string)
  //     var match = string.match(re)
  //     if (isConditional && match) {
  //       string = string.replace(match[2], '')
  //     }
  //   }
  //   string = string.replace('{{?' + state + '}}', '')
  //   string = string.replace('{{/' + state + '}}', '')
  // })
  // return string
}

},{}],3:[function(require,module,exports){
var tmplHandler = require('./tmplHandler')
var processEvent = require('./processEvent')
var getId = require('../utils').getId
var testEvent = require('../utils').testEvent
var checkNodeAvailability = require('../utils').checkNodeAvailability
var strInterpreter = require('./strInterpreter')
var componentParse = require('./componentParse')
// var modelParse = require('./modelParse')
// var nodesVisibility = require('./nodesVisibility')
var morph = require('morphdom')

var updateContext = function (force) {
  var self = this
  var frag = []
  var ele = getId(this.el)
  var node 
  var currentNode
  !force && genElement.call(this)
  var newElem = document.createElement('div')
  // morp as sub-component
  if (this.IS_STUB) {
    morph(ele, newElem.childNodes[0])
  } else {
  // otherwise moph as whole
    newElem.id = this.el
    newElem.appendChild(this.base)
    morph(ele, newElem)
    
    // sub-component life-cycle
    // this.__componentList__.map(function (component) {
    //   if(self[component]){
    //     var c = self[component]
    //     checkNodeAvailability(c, null, function(){
    //       if (!c.DID_MOUNT && c.componentDidMount && typeof c.componentDidMount === 'function') {
    //         c.DID_MOUNT = true
    //         c.componentDidMount()
    //       }
    //     }, function(){
    //       if (c.DID_MOUNT && c.componentDidUnMount && typeof c.componentDidUnMount === 'function') {
    //         c.DID_MOUNT = false
    //         c.componentDidUnMount()
    //       }
    //     })
    //   }
    // })
  }
  // clean up document creation since its not a fragment
  node = newElem.firstChild
  while(node){
    currentNode = node
    node = node.nextSibling
    currentNode.remove()
  }
  // exec life-cycle componentDidUpdate
  if (this.componentDidUpdate && typeof this.componentDidUpdate === 'function') {
    this.componentDidUpdate()
  }
  // console.log(this)
  // reset batch pooling
  batchPool.status = 'ready'
}

// batch pool update states to DOM
var batchPool = {
  ttl: 0,
  status: 'ready'
}

// The idea behind this is to reduce morphing the DOM when multiple updates
// hit the deck. If possible we want to pool them before initiating DOM
// morphing, but in the event the update is not fast enough we want to return
// to normal synchronous update.
var batchPoolExec = function (force) {
  if (batchPool.status === 'pooling') {
    //
  } else {
    var self = this
    batchPool.status = 'pooling'
    // if batchpool is not yet executed or it was idle (after 100ms)
    // direct morph the DOM
    if (!batchPool.ttl) {
      updateContext.call(this, force)
    } else {
    // we wait until pooling is ready before initiating DOM morphing
      clearTimeout(batchPool.ttl)
      batchPool.ttl = setTimeout(function () {
        updateContext.call(self, force)
      }, 0)
    }
    // we clear the batch pool if it more then 100ms from
    // last update
    batchPool.ttl = setTimeout(function () {
      batchPool.ttl = 0
    }, 100)
  }
}

var nextState = function (i) {
  var self = this
  var state
  var value
  if(i < stateList.length) {

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
          batchPoolExec.call(self)
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
          batchPoolExec.call(self)
        }
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

var clearState = function(){
  stateList = []
}

var addState = function(state){
  if(stateList.indexOf(state) === -1) stateList = stateList.concat(state)
}

var genElement = function (force) {

  this.base = this.__pristineFragment__.cloneNode(true)
  tmplHandler(this, addState)
  // return
  // var tempDiv = document.createElement('div')
  // tpl = componentParse.call(this, tpl)
  // tpl = modelParse.call(this, tpl)
  // tpl = nodesVisibility.call(this, tpl)
  // tempDiv.innerHTML = tpl

  // setState.call(this)
  // testEvent(tpl) && processEvent.call(this, tempDiv)
  if (force) {
    batchPoolExec.call(this, force)
  }
}

exports.genElement = genElement
exports.addState = addState
exports.setState = setState
exports.clearState = clearState

},{"../utils":12,"./componentParse":1,"./processEvent":6,"./strInterpreter":7,"./tmplHandler":9,"morphdom":11}],4:[function(require,module,exports){
var ternaryOps = require('./ternaryOps')
var createModel = require('../utils').createModel
var assert = require('../utils').assert

module.exports = function (node, model, tmplHandler) {
  var modelList
  var mLength
  var i
  var listClone
  var parentNode

  var list = node.nextSibling.cloneNode(true)
  // remove the first prototype node 
  node.nextSibling.remove()

  if(this[model] !== undefined && this[model].hasOwnProperty('list')){
    parentNode = node.parentNode
    if(node.nextSibling){
      node.nextSibling.remove() // remove the text tag for modelEnd
    } else {
      assert(false, 'Model "{{/model:'+model+'}}" enclosing tag does not exist.')
    }
    node.remove() // remove the text for model start tag
    
    modelList = this[model].list
    mLength = modelList.length
    i = 0
    while(i < mLength){
      listClone = list.cloneNode(true)
      tmplHandler(this, null, listClone, modelList[i])
      parentNode.insertBefore(listClone, null)
      i++
    } 
  } else {
    assert(false, 'Model "'+model+'" does not exist.')
  }
}

},{"../utils":12,"./ternaryOps":8}],5:[function(require,module,exports){
var setState = require('./genElement').setState
var tmplHandler = require('./tmplHandler')
var processEvent = require('./processEvent')
var getId = require('../utils').getId
var testEvent = require('../utils').testEvent
var componentParse = require('./componentParse')
// var modelParse = require('./modelParse')
// var nodesVisibility = require('./nodesVisibility')
var checkNodeAvailability = require('../utils').checkNodeAvailability
var addState =  require('./genElement').addState
var assert = require('../utils').assert

var renderSub = function (c, cName, node) {
  c.stubRender(this.__componentStub__[cName], node)
}

module.exports = function (stub) {

  // this.__stateList__ = this.__stateList__ || []
  // this.__modelList__ = this.__modelList__ || []
  // this.__componentList__ = this.__componentList__ || []
  // this.__componentStub__ = this.__componentStub__ || {}
  tmplHandler(this, addState)

  var el = getId(this.el)

  if(el){
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
  return 
  // tpl = tmplHandler.call(this, function (state) {
  //   if (!~self.__stateList__.indexOf(state)) self.__stateList__ = self.__stateList__.concat(state)
  // })
  // tpl = componentParse.call(this, tpl)
  // tpl = modelParse.call(this, tpl)
  // tpl = nodesVisibility.call(this, tpl)
  if (stub) {
    return tpl
  } else {
    el = getId(this.el)
    if (el) {
      el.innerHTML = tpl
      // this.__componentList__.map(function (componentName) {
      //   var component = self[componentName]
      //   if (component) {
      //     // do initial checking of the node availability
      //     var node = checkNodeAvailability(component, componentName, renderSub.bind(self))
      //     if (node) renderSub.call(self, component, componentName, node)
      //   }
      // })
      setState.call(this)
      testEvent(tpl) && processEvent.call(this, el)

      // since component already rendered, trigger its life-cycle method
      if (this.componentDidMount && typeof this.componentDidMount === 'function') {
        this.componentDidMount()
      }
    }
  }
  
}

},{"../utils":12,"./componentParse":1,"./genElement":3,"./processEvent":6,"./tmplHandler":9}],6:[function(require,module,exports){
var loopChilds = require('../utils').loopChilds

var next = function (i, c, rem) {
  var hask
  var evtName
  var handler
  var handlerArgs
  var isHandler
  var argv
  var v
  var h
  var atts = c.attributes

  if (i < atts.length) {
    hask = /^k-/.test(atts[i].nodeName)
    if (hask) {
      evtName = atts[i].nodeName.replace(/^[^-]+-/, '')
      handler = atts[i].nodeValue.match(/[a-zA-Z]+(?![^(]*\))/)[0]
      h = atts[i].nodeValue.match(/\(([^{}]+)\)/)
      handlerArgs = h ? h[1] : ''
      isHandler = this[handler]
      if (typeof isHandler === 'function') {
        rem.push(atts[i].nodeName)
        argv = []
        v = handlerArgs.split(',').filter(function (f) { return f !== '' })
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

},{"../utils":12}],7:[function(require,module,exports){
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

var DOCUMENT_FRAGMENT_TYPE = 11
var DOCUMENT_TEXT_TYPE = 3
var DOCUMENT_ELEMENT_TYPE = 1
var DOCUMENT_COMMENT_TYPE = 8
var DOCUMENT_ATTRIBUTE_TYPE = 2

var re = /{{([^{}]+)}}/g

var model = /^model:/g
var modelRaw = /^\{\{model:([^{}]+)\}\}/g

var conditionalRe = /^\?/g

var toSkipStore = []
var skipNode = []

var tmplhandler = function (ctx, updateStateList, modelInstance, modelObject, conditional) {

  var currentNode
  var str
  var val 
  var type
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
  var el
  var isModelConstruct = false
  var idx
  var rem = []
  var isObjectNotation

  if(modelObject){
    instance = modelInstance
    isModelConstruct = true
  } else if(conditional){
    instance = conditional.firstChild
  } else {
    fragment = ctx.base
    instance = fragment.firstChild
  }

  var ins = modelObject || ctx

  function updateState(state){
    if(typeof updateStateList === 'function'){
      updateStateList(state)
    }
  }

  function replaceHandleBars(value, node) {
    props = value.match(re)
    ln = props.length
    while (ln) {
      ln--
      rep = props[ln].replace(re, '$1')
      tnr = ternaryOps.call(ins, rep)
      isObjectNotation = strInterpreter(rep)
      if(isObjectNotation){
        updateState(rep)
        value = value.replace('{{' + rep + '}}', ins[isObjectNotation[0]][isObjectNotation[1]])
      } else {
        if(tnr){
          updateState(tnr.state)
          value = value.replace('{{'+rep+'}}', tnr.value)
        } else {
          if(rep.match(model)){
            modelRep = rep.replace('model:', '')
            // generate list model
            // ensure not to stay inside the loop forever
            if(!isModelConstruct){
              genModelList.call(ctx, node, modelRep, tmplhandler)
            }
          } else if(rep.match(conditionalRe)){
            conditionalRep = rep.replace('?', '')
            if(ins[conditionalRep] !== undefined){
              updateState(conditionalRep)
              if(!conditional){
                conditionalNodes.call(ctx, node, conditionalRep, tmplhandler)
              }
              // processConditionalNodes(node, ins[conditionalRep], conditionalRep)
            }
          } else {
            if(ins[rep] !== undefined){
              updateState(rep)
              value = value.replace('{{'+rep+'}}', ins[rep])
            }
          }
        }
      }
    }

    return value
  }

  function inspect(node){
    // console.log(node)
    type = node.nodeType
    val = node.nodeValue
    if(val.match(re)){
      val = replaceHandleBars(val, node)
      node.nodeValue = val
    }
  }

  function inspectAttributes(node){
    nodeAttributes = node.attributes
    for (i = nodeAttributes.length; i--;) {
      a = nodeAttributes[i]
      name = a.localName
      ns = a.nodeValue
      if (re.test(name)) {
        console.log(name, ns)
        node.removeAttribute(name)
        var temp = name
        name = replaceHandleBars(name)
        node.setAttribute(name, ns)
      } else if(re.test(ns)){
        ns = replaceHandleBars(ns)
        if(ns === ''){
          node.removeAttribute(name)
        } else {
          if(name === 'checked'){
            node.setAttribute(name, '')
          } else {
            node.setAttribute(name, ns)
          }
        }
      }
    }
  }

  function lookUpEvtNode(node){
    if(node.hasAttribute('id')){
      idx = skipNode.indexOf(node.id)
      if(~idx){
        return true
      } else {
        return false
      }
    }
  }

  function addToSkipNode(store, nodeId){
    idx = store.indexOf(nodeId)
    if(!~idx){
      store.push(nodeId)
    }
  }

  function lookupParentNode(rootNode, node, argv){
    while(node){
      if(node.className){
        argv.push(node.className)
      }
      if(node.id){
        argv.push(node.id)
      }
      node = node.parentNode
      if(node.isEqualNode(rootNode)){
        node = null
      }
    }
    return argv
  }

  function addEvent(node){
    nodeAttributes = node.attributes
    if(node && lookUpEvtNode(node)) {
      // skip addding event for node that already has event
      // to allow skipping adding event the node must include `id`/
      // console.log(node, 'has evt')
    } else {
      // only add event when node does not has one
      // console.log(node, 'adding evt')
      for (i = nodeAttributes.length; i--;) {
        a = nodeAttributes[i]
        name = a.localName
        ns = a.nodeValue
        if (/^k-/.test(name)) {
          evtName = name.replace(/^k-/, '')
          handler = ns.match(/[a-zA-Z]+(?![^(]*\))/)[0]
          c = ctx[handler]
          if(c !== undefined && typeof c === 'function'){
            h = ns.match(/\(([^{}]+)\)/)
            handlerArgs = h ? h[1] : ''
            argv = handlerArgs.split(',').filter(function(f){
              return f !== ''
            })
            rem.push(name)
            fn = function(e){
              if (e.target !== e.currentTarget) {
                argv = lookupParentNode(node, e.target, [])
                c.apply(ctx, argv.concat(e))
              }
              e.stopPropagation()
            }
            // if node is the rootNode for model, we wrap the eventListener and
            // rebuild the arguments by appending id/className util rootNode.
            if(node.hasChildNodes() && node.firstChild.nodeType === DOCUMENT_TEXT_TYPE && node.firstChild.nodeValue.match(modelRaw)){
              node.addEventListener(evtName, fn, false)
            } else {
              node.addEventListener(evtName, c.bind.apply(c.bind(ctx), [node].concat(argv)), false)
            }
            if(node.hasAttribute('id')){
              addToSkipNode(toSkipStore, node.id)
            }
          }
        }
        if(i === 0){
          rem.map(function (f) { node.removeAttribute(f) })
        }
      }
    } 
  }

  var t
  var start = Date.now()

  function end(time){

    if(t) clearTimeout(t)

    t = setTimeout(function(){

      toSkipStore.map(function(skip){
        addToSkipNode(skipNode, skip)
        var node = ctx.__pristineFragment__.getElementById(skip)
        if(!node) return
        nodeAttributes = node.attributes
        for (i = nodeAttributes.length; i--;) {
          a = nodeAttributes[i]
          name = a.localName
          if (/^k-/.test(name)) {
            node.removeAttribute(name)
          }
        }
      })

      // console.log('end', time)

    })
  }

  function check(node){
    while(node){
      currentNode = node
      if(currentNode.nodeType === DOCUMENT_ELEMENT_TYPE){
        if(currentNode.hasAttributes()){
          addEvent(currentNode)
          inspectAttributes(currentNode)
        }
        check(currentNode.firstChild)
      } else {
        inspect(currentNode)
      }
      node = node.nextSibling || end(Date.now() - start)
    } 
  }

  check(instance)

  // return
  // var arrProps = str.match(/{{([^{}]+)}}/g)
  // if (arrProps && arrProps.length) {
  //   arrProps.map(function (s) {
  //     var rep = s.replace(/{{([^{}]+)}}/g, '$1')
  //     var isObjectNotation = strInterpreter(rep)
  //     var isTernary = ternaryOps.call(self, rep)
  //     if (!isObjectNotation) {
  //       if (self[rep] !== undefined) {
  //         updateStateList(rep)
  //         str = str.replace('{{' + rep + '}}', self[rep])
  //       } else if (isTernary) {
  //         updateStateList(isTernary.state)
  //         str = str.replace('{{' + rep + '}}', isTernary.value)
  //       }
  //     } else {
  //       updateStateList(rep)
  //       str = str.replace('{{' + rep + '}}', self[isObjectNotation[0]][isObjectNotation[1]])
  //     }
  //     // resolve nodeVisibility
  //     if (rep.match(/^\?/g)) {
  //       updateStateList(rep.replace('?', ''))
  //     }
  //     // resolve model
  //     if (rep.match(/^model:/g)) {
  //       var modelRep = rep.replace('model:', '')
  //       if (!~self.__modelList__.indexOf(modelRep)) { self.__modelList__.push(modelRep) }
  //     }
  //     // resolve component
  //     if (rep.match(/^component:/g)) {
  //       var componentRep = rep.replace('component:', '')
  //       if (!~self.__componentList__.indexOf(componentRep)) { self.__componentList__.push(componentRep) }
  //     }
  //   })
  // }
  // return str
}

module.exports = tmplhandler

},{"../utils":12,"./conditionalNodes":2,"./genModelList":4,"./strInterpreter":7,"./ternaryOps":8}],10:[function(require,module,exports){
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
var setState = require('./components/genElement').setState
var genElement = require('./components/genElement').genElement
var clearState = require('./components/genElement').clearState
var processEvent = require('./components/processEvent')
var getId = require('./utils').getId
var testEvent = require('./utils').testEvent
var assert = require('./utils').assert

var DOCUMENT_FRAGMENT_TYPE = 11
var DOCUMENT_TEXT_TYPE = 3
var DOCUMENT_ELEMENT_TYPE = 1
var DOCUMENT_COMMENT_TYPE = 8
var DOCUMENT_ATTRIBUTE_TYPE = 2

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
  // We could also apply life-cycle method before the
  // render happen.
  if (!id) assert(id, 'No id is given as parameter.')
  this.el = id
  // life-cycle method before rendering the component
  if (this.componentWillMount && typeof this.componentWillMount === 'function') {
    this.componentWillMount()
  }
  this.render()
  return this
}

Keet.prototype.render = function (stub) {
  if (stub) {
    // life-cycle method before rendering the component
    if (!this.WILL_MOUNT && this.componentWillMount && typeof this.componentWillMount === 'function') {
      this.WILL_MOUNT = true
      this.componentWillMount()
    }
    return parseStr.call(this, stub)
  } else {
    // Render this component to the target DOM
    parseStr.call(this)
    return this
  }
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

Keet.prototype.stubRender = function (tpl, node) {
  // sub-component rendering
  setState.call(this)
  testEvent(tpl) && processEvent.call(this, node)
  // since component already rendered, trigger its life-cycle method
  if (!this.DID_MOUNT && this.componentDidMount && typeof this.componentDidMount === 'function') {
    this.DID_MOUNT = true
    this.componentDidMount()
  }
}

var BATCH_CALL_REQUEST = null

Keet.prototype.callBatchPoolUpdate = function () {
  // force component to update, if any state / non-state
  // value changed DOM diffing will occur
  var self = this
  if(BATCH_CALL_REQUEST){
    clearTimeout(BATCH_CALL_REQUEST)
  } 
  BATCH_CALL_REQUEST = setTimeout(function(){
    genElement.call(self, true)
  })
}

module.exports = Keet

},{"./components/genElement":3,"./components/parseStr":5,"./components/processEvent":6,"./utils":12}],11:[function(require,module,exports){
'use strict';

var range; // Create a range object for efficently rendering strings to elements.
var NS_XHTML = 'http://www.w3.org/1999/xhtml';

var doc = typeof document === 'undefined' ? undefined : document;

var testEl = doc ?
    doc.body || doc.createElement('div') :
    {};

// Fixes <https://github.com/patrick-steele-idem/morphdom/issues/32>
// (IE7+ support) <=IE7 does not support el.hasAttribute(name)
var actualHasAttributeNS;

if (testEl.hasAttributeNS) {
    actualHasAttributeNS = function(el, namespaceURI, name) {
        return el.hasAttributeNS(namespaceURI, name);
    };
} else if (testEl.hasAttribute) {
    actualHasAttributeNS = function(el, namespaceURI, name) {
        return el.hasAttribute(name);
    };
} else {
    actualHasAttributeNS = function(el, namespaceURI, name) {
        return el.getAttributeNode(namespaceURI, name) != null;
    };
}

var hasAttributeNS = actualHasAttributeNS;


function toElement(str) {
    if (!range && doc.createRange) {
        range = doc.createRange();
        range.selectNode(doc.body);
    }

    var fragment;
    if (range && range.createContextualFragment) {
        fragment = range.createContextualFragment(str);
    } else {
        fragment = doc.createElement('body');
        fragment.innerHTML = str;
    }
    return fragment.childNodes[0];
}

/**
 * Returns true if two node's names are the same.
 *
 * NOTE: We don't bother checking `namespaceURI` because you will never find two HTML elements with the same
 *       nodeName and different namespace URIs.
 *
 * @param {Element} a
 * @param {Element} b The target element
 * @return {boolean}
 */
function compareNodeNames(fromEl, toEl) {
    var fromNodeName = fromEl.nodeName;
    var toNodeName = toEl.nodeName;

    if (fromNodeName === toNodeName) {
        return true;
    }

    if (toEl.actualize &&
        fromNodeName.charCodeAt(0) < 91 && /* from tag name is upper case */
        toNodeName.charCodeAt(0) > 90 /* target tag name is lower case */) {
        // If the target element is a virtual DOM node then we may need to normalize the tag name
        // before comparing. Normal HTML elements that are in the "http://www.w3.org/1999/xhtml"
        // are converted to upper case
        return fromNodeName === toNodeName.toUpperCase();
    } else {
        return false;
    }
}

/**
 * Create an element, optionally with a known namespace URI.
 *
 * @param {string} name the element name, e.g. 'div' or 'svg'
 * @param {string} [namespaceURI] the element's namespace URI, i.e. the value of
 * its `xmlns` attribute or its inferred namespace.
 *
 * @return {Element}
 */
function createElementNS(name, namespaceURI) {
    return !namespaceURI || namespaceURI === NS_XHTML ?
        doc.createElement(name) :
        doc.createElementNS(namespaceURI, name);
}

/**
 * Copies the children of one DOM element to another DOM element
 */
function moveChildren(fromEl, toEl) {
    var curChild = fromEl.firstChild;
    while (curChild) {
        var nextChild = curChild.nextSibling;
        toEl.appendChild(curChild);
        curChild = nextChild;
    }
    return toEl;
}

function morphAttrs(fromNode, toNode) {
    var attrs = toNode.attributes;
    var i;
    var attr;
    var attrName;
    var attrNamespaceURI;
    var attrValue;
    var fromValue;

    for (i = attrs.length - 1; i >= 0; --i) {
        attr = attrs[i];
        attrName = attr.name;
        attrNamespaceURI = attr.namespaceURI;
        attrValue = attr.value;

        if (attrNamespaceURI) {
            attrName = attr.localName || attrName;
            fromValue = fromNode.getAttributeNS(attrNamespaceURI, attrName);

            if (fromValue !== attrValue) {
                fromNode.setAttributeNS(attrNamespaceURI, attrName, attrValue);
            }
        } else {
            fromValue = fromNode.getAttribute(attrName);

            if (fromValue !== attrValue) {
                fromNode.setAttribute(attrName, attrValue);
            }
        }
    }

    // Remove any extra attributes found on the original DOM element that
    // weren't found on the target element.
    attrs = fromNode.attributes;

    for (i = attrs.length - 1; i >= 0; --i) {
        attr = attrs[i];
        if (attr.specified !== false) {
            attrName = attr.name;
            attrNamespaceURI = attr.namespaceURI;

            if (attrNamespaceURI) {
                attrName = attr.localName || attrName;

                if (!hasAttributeNS(toNode, attrNamespaceURI, attrName)) {
                    fromNode.removeAttributeNS(attrNamespaceURI, attrName);
                }
            } else {
                if (!hasAttributeNS(toNode, null, attrName)) {
                    fromNode.removeAttribute(attrName);
                }
            }
        }
    }
}

function syncBooleanAttrProp(fromEl, toEl, name) {
    if (fromEl[name] !== toEl[name]) {
        fromEl[name] = toEl[name];
        if (fromEl[name]) {
            fromEl.setAttribute(name, '');
        } else {
            fromEl.removeAttribute(name, '');
        }
    }
}

var specialElHandlers = {
    /**
     * Needed for IE. Apparently IE doesn't think that "selected" is an
     * attribute when reading over the attributes using selectEl.attributes
     */
    OPTION: function(fromEl, toEl) {
        syncBooleanAttrProp(fromEl, toEl, 'selected');
    },
    /**
     * The "value" attribute is special for the <input> element since it sets
     * the initial value. Changing the "value" attribute without changing the
     * "value" property will have no effect since it is only used to the set the
     * initial value.  Similar for the "checked" attribute, and "disabled".
     */
    INPUT: function(fromEl, toEl) {
        syncBooleanAttrProp(fromEl, toEl, 'checked');
        syncBooleanAttrProp(fromEl, toEl, 'disabled');

        if (fromEl.value !== toEl.value) {
            fromEl.value = toEl.value;
        }

        if (!hasAttributeNS(toEl, null, 'value')) {
            fromEl.removeAttribute('value');
        }
    },

    TEXTAREA: function(fromEl, toEl) {
        var newValue = toEl.value;
        if (fromEl.value !== newValue) {
            fromEl.value = newValue;
        }

        var firstChild = fromEl.firstChild;
        if (firstChild) {
            // Needed for IE. Apparently IE sets the placeholder as the
            // node value and vise versa. This ignores an empty update.
            var oldValue = firstChild.nodeValue;

            if (oldValue == newValue || (!newValue && oldValue == fromEl.placeholder)) {
                return;
            }

            firstChild.nodeValue = newValue;
        }
    },
    SELECT: function(fromEl, toEl) {
        if (!hasAttributeNS(toEl, null, 'multiple')) {
            var selectedIndex = -1;
            var i = 0;
            var curChild = toEl.firstChild;
            while(curChild) {
                var nodeName = curChild.nodeName;
                if (nodeName && nodeName.toUpperCase() === 'OPTION') {
                    if (hasAttributeNS(curChild, null, 'selected')) {
                        selectedIndex = i;
                        break;
                    }
                    i++;
                }
                curChild = curChild.nextSibling;
            }

            fromEl.selectedIndex = i;
        }
    }
};

var ELEMENT_NODE = 1;
var TEXT_NODE = 3;
var COMMENT_NODE = 8;

function noop() {}

function defaultGetNodeKey(node) {
    return node.id;
}

function morphdomFactory(morphAttrs) {

    return function morphdom(fromNode, toNode, options) {
        if (!options) {
            options = {};
        }

        if (typeof toNode === 'string') {
            if (fromNode.nodeName === '#document' || fromNode.nodeName === 'HTML') {
                var toNodeHtml = toNode;
                toNode = doc.createElement('html');
                toNode.innerHTML = toNodeHtml;
            } else {
                toNode = toElement(toNode);
            }
        }

        var getNodeKey = options.getNodeKey || defaultGetNodeKey;
        var onBeforeNodeAdded = options.onBeforeNodeAdded || noop;
        var onNodeAdded = options.onNodeAdded || noop;
        var onBeforeElUpdated = options.onBeforeElUpdated || noop;
        var onElUpdated = options.onElUpdated || noop;
        var onBeforeNodeDiscarded = options.onBeforeNodeDiscarded || noop;
        var onNodeDiscarded = options.onNodeDiscarded || noop;
        var onBeforeElChildrenUpdated = options.onBeforeElChildrenUpdated || noop;
        var childrenOnly = options.childrenOnly === true;

        // This object is used as a lookup to quickly find all keyed elements in the original DOM tree.
        var fromNodesLookup = {};
        var keyedRemovalList;

        function addKeyedRemoval(key) {
            if (keyedRemovalList) {
                keyedRemovalList.push(key);
            } else {
                keyedRemovalList = [key];
            }
        }

        function walkDiscardedChildNodes(node, skipKeyedNodes) {
            if (node.nodeType === ELEMENT_NODE) {
                var curChild = node.firstChild;
                while (curChild) {

                    var key = undefined;

                    if (skipKeyedNodes && (key = getNodeKey(curChild))) {
                        // If we are skipping keyed nodes then we add the key
                        // to a list so that it can be handled at the very end.
                        addKeyedRemoval(key);
                    } else {
                        // Only report the node as discarded if it is not keyed. We do this because
                        // at the end we loop through all keyed elements that were unmatched
                        // and then discard them in one final pass.
                        onNodeDiscarded(curChild);
                        if (curChild.firstChild) {
                            walkDiscardedChildNodes(curChild, skipKeyedNodes);
                        }
                    }

                    curChild = curChild.nextSibling;
                }
            }
        }

        /**
         * Removes a DOM node out of the original DOM
         *
         * @param  {Node} node The node to remove
         * @param  {Node} parentNode The nodes parent
         * @param  {Boolean} skipKeyedNodes If true then elements with keys will be skipped and not discarded.
         * @return {undefined}
         */
        function removeNode(node, parentNode, skipKeyedNodes) {
            if (onBeforeNodeDiscarded(node) === false) {
                return;
            }

            if (parentNode) {
                parentNode.removeChild(node);
            }

            onNodeDiscarded(node);
            walkDiscardedChildNodes(node, skipKeyedNodes);
        }

        // // TreeWalker implementation is no faster, but keeping this around in case this changes in the future
        // function indexTree(root) {
        //     var treeWalker = document.createTreeWalker(
        //         root,
        //         NodeFilter.SHOW_ELEMENT);
        //
        //     var el;
        //     while((el = treeWalker.nextNode())) {
        //         var key = getNodeKey(el);
        //         if (key) {
        //             fromNodesLookup[key] = el;
        //         }
        //     }
        // }

        // // NodeIterator implementation is no faster, but keeping this around in case this changes in the future
        //
        // function indexTree(node) {
        //     var nodeIterator = document.createNodeIterator(node, NodeFilter.SHOW_ELEMENT);
        //     var el;
        //     while((el = nodeIterator.nextNode())) {
        //         var key = getNodeKey(el);
        //         if (key) {
        //             fromNodesLookup[key] = el;
        //         }
        //     }
        // }

        function indexTree(node) {
            if (node.nodeType === ELEMENT_NODE) {
                var curChild = node.firstChild;
                while (curChild) {
                    var key = getNodeKey(curChild);
                    if (key) {
                        fromNodesLookup[key] = curChild;
                    }

                    // Walk recursively
                    indexTree(curChild);

                    curChild = curChild.nextSibling;
                }
            }
        }

        indexTree(fromNode);

        function handleNodeAdded(el) {
            onNodeAdded(el);

            var curChild = el.firstChild;
            while (curChild) {
                var nextSibling = curChild.nextSibling;

                var key = getNodeKey(curChild);
                if (key) {
                    var unmatchedFromEl = fromNodesLookup[key];
                    if (unmatchedFromEl && compareNodeNames(curChild, unmatchedFromEl)) {
                        curChild.parentNode.replaceChild(unmatchedFromEl, curChild);
                        morphEl(unmatchedFromEl, curChild);
                    }
                }

                handleNodeAdded(curChild);
                curChild = nextSibling;
            }
        }

        function morphEl(fromEl, toEl, childrenOnly) {
            var toElKey = getNodeKey(toEl);
            var curFromNodeKey;

            if (toElKey) {
                // If an element with an ID is being morphed then it is will be in the final
                // DOM so clear it out of the saved elements collection
                delete fromNodesLookup[toElKey];
            }

            if (toNode.isSameNode && toNode.isSameNode(fromNode)) {
                return;
            }

            if (!childrenOnly) {
                if (onBeforeElUpdated(fromEl, toEl) === false) {
                    return;
                }

                morphAttrs(fromEl, toEl);
                onElUpdated(fromEl);

                if (onBeforeElChildrenUpdated(fromEl, toEl) === false) {
                    return;
                }
            }

            if (fromEl.nodeName !== 'TEXTAREA') {
                var curToNodeChild = toEl.firstChild;
                var curFromNodeChild = fromEl.firstChild;
                var curToNodeKey;

                var fromNextSibling;
                var toNextSibling;
                var matchingFromEl;

                outer: while (curToNodeChild) {
                    toNextSibling = curToNodeChild.nextSibling;
                    curToNodeKey = getNodeKey(curToNodeChild);

                    while (curFromNodeChild) {
                        fromNextSibling = curFromNodeChild.nextSibling;

                        if (curToNodeChild.isSameNode && curToNodeChild.isSameNode(curFromNodeChild)) {
                            curToNodeChild = toNextSibling;
                            curFromNodeChild = fromNextSibling;
                            continue outer;
                        }

                        curFromNodeKey = getNodeKey(curFromNodeChild);

                        var curFromNodeType = curFromNodeChild.nodeType;

                        var isCompatible = undefined;

                        if (curFromNodeType === curToNodeChild.nodeType) {
                            if (curFromNodeType === ELEMENT_NODE) {
                                // Both nodes being compared are Element nodes

                                if (curToNodeKey) {
                                    // The target node has a key so we want to match it up with the correct element
                                    // in the original DOM tree
                                    if (curToNodeKey !== curFromNodeKey) {
                                        // The current element in the original DOM tree does not have a matching key so
                                        // let's check our lookup to see if there is a matching element in the original
                                        // DOM tree
                                        if ((matchingFromEl = fromNodesLookup[curToNodeKey])) {
                                            if (curFromNodeChild.nextSibling === matchingFromEl) {
                                                // Special case for single element removals. To avoid removing the original
                                                // DOM node out of the tree (since that can break CSS transitions, etc.),
                                                // we will instead discard the current node and wait until the next
                                                // iteration to properly match up the keyed target element with its matching
                                                // element in the original tree
                                                isCompatible = false;
                                            } else {
                                                // We found a matching keyed element somewhere in the original DOM tree.
                                                // Let's moving the original DOM node into the current position and morph
                                                // it.

                                                // NOTE: We use insertBefore instead of replaceChild because we want to go through
                                                // the `removeNode()` function for the node that is being discarded so that
                                                // all lifecycle hooks are correctly invoked
                                                fromEl.insertBefore(matchingFromEl, curFromNodeChild);

                                                fromNextSibling = curFromNodeChild.nextSibling;

                                                if (curFromNodeKey) {
                                                    // Since the node is keyed it might be matched up later so we defer
                                                    // the actual removal to later
                                                    addKeyedRemoval(curFromNodeKey);
                                                } else {
                                                    // NOTE: we skip nested keyed nodes from being removed since there is
                                                    //       still a chance they will be matched up later
                                                    removeNode(curFromNodeChild, fromEl, true /* skip keyed nodes */);
                                                }

                                                curFromNodeChild = matchingFromEl;
                                            }
                                        } else {
                                            // The nodes are not compatible since the "to" node has a key and there
                                            // is no matching keyed node in the source tree
                                            isCompatible = false;
                                        }
                                    }
                                } else if (curFromNodeKey) {
                                    // The original has a key
                                    isCompatible = false;
                                }

                                isCompatible = isCompatible !== false && compareNodeNames(curFromNodeChild, curToNodeChild);
                                if (isCompatible) {
                                    // We found compatible DOM elements so transform
                                    // the current "from" node to match the current
                                    // target DOM node.
                                    morphEl(curFromNodeChild, curToNodeChild);
                                }

                            } else if (curFromNodeType === TEXT_NODE || curFromNodeType == COMMENT_NODE) {
                                // Both nodes being compared are Text or Comment nodes
                                isCompatible = true;
                                // Simply update nodeValue on the original node to
                                // change the text value
                                if (curFromNodeChild.nodeValue !== curToNodeChild.nodeValue) {
                                    curFromNodeChild.nodeValue = curToNodeChild.nodeValue;
                                }

                            }
                        }

                        if (isCompatible) {
                            // Advance both the "to" child and the "from" child since we found a match
                            curToNodeChild = toNextSibling;
                            curFromNodeChild = fromNextSibling;
                            continue outer;
                        }

                        // No compatible match so remove the old node from the DOM and continue trying to find a
                        // match in the original DOM. However, we only do this if the from node is not keyed
                        // since it is possible that a keyed node might match up with a node somewhere else in the
                        // target tree and we don't want to discard it just yet since it still might find a
                        // home in the final DOM tree. After everything is done we will remove any keyed nodes
                        // that didn't find a home
                        if (curFromNodeKey) {
                            // Since the node is keyed it might be matched up later so we defer
                            // the actual removal to later
                            addKeyedRemoval(curFromNodeKey);
                        } else {
                            // NOTE: we skip nested keyed nodes from being removed since there is
                            //       still a chance they will be matched up later
                            removeNode(curFromNodeChild, fromEl, true /* skip keyed nodes */);
                        }

                        curFromNodeChild = fromNextSibling;
                    }

                    // If we got this far then we did not find a candidate match for
                    // our "to node" and we exhausted all of the children "from"
                    // nodes. Therefore, we will just append the current "to" node
                    // to the end
                    if (curToNodeKey && (matchingFromEl = fromNodesLookup[curToNodeKey]) && compareNodeNames(matchingFromEl, curToNodeChild)) {
                        fromEl.appendChild(matchingFromEl);
                        morphEl(matchingFromEl, curToNodeChild);
                    } else {
                        var onBeforeNodeAddedResult = onBeforeNodeAdded(curToNodeChild);
                        if (onBeforeNodeAddedResult !== false) {
                            if (onBeforeNodeAddedResult) {
                                curToNodeChild = onBeforeNodeAddedResult;
                            }

                            if (curToNodeChild.actualize) {
                                curToNodeChild = curToNodeChild.actualize(fromEl.ownerDocument || doc);
                            }
                            fromEl.appendChild(curToNodeChild);
                            handleNodeAdded(curToNodeChild);
                        }
                    }

                    curToNodeChild = toNextSibling;
                    curFromNodeChild = fromNextSibling;
                }

                // We have processed all of the "to nodes". If curFromNodeChild is
                // non-null then we still have some from nodes left over that need
                // to be removed
                while (curFromNodeChild) {
                    fromNextSibling = curFromNodeChild.nextSibling;
                    if ((curFromNodeKey = getNodeKey(curFromNodeChild))) {
                        // Since the node is keyed it might be matched up later so we defer
                        // the actual removal to later
                        addKeyedRemoval(curFromNodeKey);
                    } else {
                        // NOTE: we skip nested keyed nodes from being removed since there is
                        //       still a chance they will be matched up later
                        removeNode(curFromNodeChild, fromEl, true /* skip keyed nodes */);
                    }
                    curFromNodeChild = fromNextSibling;
                }
            }

            var specialElHandler = specialElHandlers[fromEl.nodeName];
            if (specialElHandler) {
                specialElHandler(fromEl, toEl);
            }
        } // END: morphEl(...)

        var morphedNode = fromNode;
        var morphedNodeType = morphedNode.nodeType;
        var toNodeType = toNode.nodeType;

        if (!childrenOnly) {
            // Handle the case where we are given two DOM nodes that are not
            // compatible (e.g. <div> --> <span> or <div> --> TEXT)
            if (morphedNodeType === ELEMENT_NODE) {
                if (toNodeType === ELEMENT_NODE) {
                    if (!compareNodeNames(fromNode, toNode)) {
                        onNodeDiscarded(fromNode);
                        morphedNode = moveChildren(fromNode, createElementNS(toNode.nodeName, toNode.namespaceURI));
                    }
                } else {
                    // Going from an element node to a text node
                    morphedNode = toNode;
                }
            } else if (morphedNodeType === TEXT_NODE || morphedNodeType === COMMENT_NODE) { // Text or comment node
                if (toNodeType === morphedNodeType) {
                    if (morphedNode.nodeValue !== toNode.nodeValue) {
                        morphedNode.nodeValue = toNode.nodeValue;
                    }

                    return morphedNode;
                } else {
                    // Text node to something else
                    morphedNode = toNode;
                }
            }
        }

        if (morphedNode === toNode) {
            // The "to node" was not compatible with the "from node" so we had to
            // toss out the "from node" and use the "to node"
            onNodeDiscarded(fromNode);
        } else {
            morphEl(morphedNode, toNode, childrenOnly);

            // We now need to loop over any keyed nodes that might need to be
            // removed. We only do the removal if we know that the keyed node
            // never found a match. When a keyed node is matched up we remove
            // it out of fromNodesLookup and we use fromNodesLookup to determine
            // if a keyed node has been matched up or not
            if (keyedRemovalList) {
                for (var i=0, len=keyedRemovalList.length; i<len; i++) {
                    var elToRemove = fromNodesLookup[keyedRemovalList[i]];
                    if (elToRemove) {
                        removeNode(elToRemove, elToRemove.parentNode, false);
                    }
                }
            }
        }

        if (!childrenOnly && morphedNode !== fromNode && fromNode.parentNode) {
            if (morphedNode.actualize) {
                morphedNode = morphedNode.actualize(fromNode.ownerDocument || doc);
            }
            // If we had to swap out the from node with a new node because the old
            // node was not compatible with the target node then we need to
            // replace the old DOM node in the original DOM tree. This is only
            // possible if the original DOM node was part of a DOM tree which
            // we know is the case if it has a parent node.
            fromNode.parentNode.replaceChild(morphedNode, fromNode);
        }

        return morphedNode;
    };
}

var morphdom = morphdomFactory(morphAttrs);

module.exports = morphdom;

},{}],12:[function(require,module,exports){
'use strict';

var cov_140h9s3pvc = function () {
  var path = 'D:\\distro\\preact-perf\\todomvc\\keetjs\\keet\\utils.js',
      hash = '2e556e8606fa887fd972eb9ae7c9db7c9d6e1535',
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
          line: 18,
          column: 0
        },
        end: {
          line: 20,
          column: 1
        }
      },
      '4': {
        start: {
          line: 19,
          column: 2
        },
        end: {
          line: 19,
          column: 25
        }
      },
      '5': {
        start: {
          line: 30,
          column: 0
        },
        end: {
          line: 49,
          column: 1
        }
      },
      '6': {
        start: {
          line: 31,
          column: 12
        },
        end: {
          line: 31,
          column: 31
        }
      },
      '7': {
        start: {
          line: 32,
          column: 14
        },
        end: {
          line: 32,
          column: 19
        }
      },
      '8': {
        start: {
          line: 33,
          column: 2
        },
        end: {
          line: 48,
          column: 3
        }
      },
      '9': {
        start: {
          line: 33,
          column: 11
        },
        end: {
          line: 33,
          column: 21
        }
      },
      '10': {
        start: {
          line: 35,
          column: 12
        },
        end: {
          line: 42,
          column: 9
        }
      },
      '11': {
        start: {
          line: 36,
          column: 6
        },
        end: {
          line: 36,
          column: 31
        }
      },
      '12': {
        start: {
          line: 37,
          column: 6
        },
        end: {
          line: 41,
          column: 7
        }
      },
      '13': {
        start: {
          line: 38,
          column: 8
        },
        end: {
          line: 38,
          column: 24
        }
      },
      '14': {
        start: {
          line: 39,
          column: 8
        },
        end: {
          line: 39,
          column: 20
        }
      },
      '15': {
        start: {
          line: 40,
          column: 8
        },
        end: {
          line: 40,
          column: 47
        }
      },
      '16': {
        start: {
          line: 44,
          column: 4
        },
        end: {
          line: 47,
          column: 11
        }
      },
      '17': {
        start: {
          line: 45,
          column: 6
        },
        end: {
          line: 45,
          column: 22
        }
      },
      '18': {
        start: {
          line: 46,
          column: 6
        },
        end: {
          line: 46,
          column: 73
        }
      },
      '19': {
        start: {
          line: 46,
          column: 63
        },
        end: {
          line: 46,
          column: 73
        }
      },
      '20': {
        start: {
          line: 60,
          column: 0
        },
        end: {
          line: 62,
          column: 1
        }
      },
      '21': {
        start: {
          line: 61,
          column: 2
        },
        end: {
          line: 61,
          column: 44
        }
      },
      '22': {
        start: {
          line: 61,
          column: 12
        },
        end: {
          line: 61,
          column: 44
        }
      },
      '23': {
        start: {
          line: 75,
          column: 0
        },
        end: {
          line: 88,
          column: 1
        }
      },
      '24': {
        start: {
          line: 76,
          column: 17
        },
        end: {
          line: 76,
          column: 41
        }
      },
      '25': {
        start: {
          line: 77,
          column: 15
        },
        end: {
          line: 77,
          column: 39
        }
      },
      '26': {
        start: {
          line: 79,
          column: 15
        },
        end: {
          line: 81,
          column: 4
        }
      },
      '27': {
        start: {
          line: 80,
          column: 4
        },
        end: {
          line: 80,
          column: 36
        }
      },
      '28': {
        start: {
          line: 83,
          column: 2
        },
        end: {
          line: 83,
          column: 30
        }
      },
      '29': {
        start: {
          line: 84,
          column: 2
        },
        end: {
          line: 86,
          column: 13
        }
      },
      '30': {
        start: {
          line: 85,
          column: 4
        },
        end: {
          line: 85,
          column: 19
        }
      },
      '31': {
        start: {
          line: 87,
          column: 2
        },
        end: {
          line: 87,
          column: 15
        }
      },
      '32': {
        start: {
          line: 101,
          column: 14
        },
        end: {
          line: 101,
          column: 16
        }
      },
      '33': {
        start: {
          line: 102,
          column: 18
        },
        end: {
          line: 102,
          column: 20
        }
      },
      '34': {
        start: {
          line: 104,
          column: 15
        },
        end: {
          line: 109,
          column: 3
        }
      },
      '35': {
        start: {
          line: 106,
          column: 4
        },
        end: {
          line: 108,
          column: 5
        }
      },
      '36': {
        start: {
          line: 107,
          column: 6
        },
        end: {
          line: 107,
          column: 25
        }
      },
      '37': {
        start: {
          line: 116,
          column: 2
        },
        end: {
          line: 126,
          column: 4
        }
      },
      '38': {
        start: {
          line: 120,
          column: 6
        },
        end: {
          line: 120,
          column: 18
        }
      },
      '39': {
        start: {
          line: 123,
          column: 6
        },
        end: {
          line: 123,
          column: 17
        }
      },
      '40': {
        start: {
          line: 124,
          column: 6
        },
        end: {
          line: 124,
          column: 14
        }
      },
      '41': {
        start: {
          line: 136,
          column: 2
        },
        end: {
          line: 138,
          column: 3
        }
      },
      '42': {
        start: {
          line: 137,
          column: 4
        },
        end: {
          line: 137,
          column: 22
        }
      },
      '43': {
        start: {
          line: 148,
          column: 2
        },
        end: {
          line: 150,
          column: 3
        }
      },
      '44': {
        start: {
          line: 149,
          column: 4
        },
        end: {
          line: 149,
          column: 37
        }
      },
      '45': {
        start: {
          line: 161,
          column: 2
        },
        end: {
          line: 165,
          column: 3
        }
      },
      '46': {
        start: {
          line: 162,
          column: 4
        },
        end: {
          line: 164,
          column: 6
        }
      },
      '47': {
        start: {
          line: 163,
          column: 6
        },
        end: {
          line: 163,
          column: 88
        }
      },
      '48': {
        start: {
          line: 176,
          column: 2
        },
        end: {
          line: 180,
          column: 3
        }
      },
      '49': {
        start: {
          line: 177,
          column: 4
        },
        end: {
          line: 179,
          column: 6
        }
      },
      '50': {
        start: {
          line: 178,
          column: 6
        },
        end: {
          line: 178,
          column: 36
        }
      },
      '51': {
        start: {
          line: 183,
          column: 0
        },
        end: {
          line: 183,
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
            line: 18,
            column: 20
          },
          end: {
            line: 18,
            column: 21
          }
        },
        loc: {
          start: {
            line: 18,
            column: 36
          },
          end: {
            line: 20,
            column: 1
          }
        },
        line: 18
      },
      '2': {
        name: '(anonymous_2)',
        decl: {
          start: {
            line: 30,
            column: 32
          },
          end: {
            line: 30,
            column: 33
          }
        },
        loc: {
          start: {
            line: 30,
            column: 88
          },
          end: {
            line: 49,
            column: 1
          }
        },
        line: 30
      },
      '3': {
        name: '(anonymous_3)',
        decl: {
          start: {
            line: 35,
            column: 24
          },
          end: {
            line: 35,
            column: 25
          }
        },
        loc: {
          start: {
            line: 35,
            column: 36
          },
          end: {
            line: 42,
            column: 5
          }
        },
        line: 35
      },
      '4': {
        name: '(anonymous_4)',
        decl: {
          start: {
            line: 44,
            column: 15
          },
          end: {
            line: 44,
            column: 16
          }
        },
        loc: {
          start: {
            line: 44,
            column: 27
          },
          end: {
            line: 47,
            column: 5
          }
        },
        line: 44
      },
      '5': {
        name: '(anonymous_5)',
        decl: {
          start: {
            line: 60,
            column: 17
          },
          end: {
            line: 60,
            column: 18
          }
        },
        loc: {
          start: {
            line: 60,
            column: 37
          },
          end: {
            line: 62,
            column: 1
          }
        },
        line: 60
      },
      '6': {
        name: 'html',
        decl: {
          start: {
            line: 75,
            column: 24
          },
          end: {
            line: 75,
            column: 28
          }
        },
        loc: {
          start: {
            line: 75,
            column: 32
          },
          end: {
            line: 88,
            column: 1
          }
        },
        line: 75
      },
      '7': {
        name: '(anonymous_7)',
        decl: {
          start: {
            line: 79,
            column: 35
          },
          end: {
            line: 79,
            column: 36
          }
        },
        loc: {
          start: {
            line: 79,
            column: 58
          },
          end: {
            line: 81,
            column: 3
          }
        },
        line: 79
      },
      '8': {
        name: '(anonymous_8)',
        decl: {
          start: {
            line: 84,
            column: 22
          },
          end: {
            line: 84,
            column: 23
          }
        },
        loc: {
          start: {
            line: 84,
            column: 35
          },
          end: {
            line: 86,
            column: 3
          }
        },
        line: 84
      },
      '9': {
        name: 'createModel',
        decl: {
          start: {
            line: 100,
            column: 9
          },
          end: {
            line: 100,
            column: 20
          }
        },
        loc: {
          start: {
            line: 100,
            column: 23
          },
          end: {
            line: 181,
            column: 1
          }
        },
        line: 100
      },
      '10': {
        name: '(anonymous_10)',
        decl: {
          start: {
            line: 104,
            column: 15
          },
          end: {
            line: 104,
            column: 16
          }
        },
        loc: {
          start: {
            line: 104,
            column: 27
          },
          end: {
            line: 109,
            column: 3
          }
        },
        line: 104
      },
      '11': {
        name: '(anonymous_11)',
        decl: {
          start: {
            line: 119,
            column: 9
          },
          end: {
            line: 119,
            column: 10
          }
        },
        loc: {
          start: {
            line: 119,
            column: 21
          },
          end: {
            line: 121,
            column: 5
          }
        },
        line: 119
      },
      '12': {
        name: '(anonymous_12)',
        decl: {
          start: {
            line: 122,
            column: 9
          },
          end: {
            line: 122,
            column: 10
          }
        },
        loc: {
          start: {
            line: 122,
            column: 24
          },
          end: {
            line: 125,
            column: 5
          }
        },
        line: 122
      },
      '13': {
        name: '(anonymous_13)',
        decl: {
          start: {
            line: 136,
            column: 19
          },
          end: {
            line: 136,
            column: 20
          }
        },
        loc: {
          start: {
            line: 136,
            column: 33
          },
          end: {
            line: 138,
            column: 3
          }
        },
        line: 136
      },
      '14': {
        name: '(anonymous_14)',
        decl: {
          start: {
            line: 148,
            column: 13
          },
          end: {
            line: 148,
            column: 14
          }
        },
        loc: {
          start: {
            line: 148,
            column: 28
          },
          end: {
            line: 150,
            column: 3
          }
        },
        line: 148
      },
      '15': {
        name: '(anonymous_15)',
        decl: {
          start: {
            line: 161,
            column: 16
          },
          end: {
            line: 161,
            column: 17
          }
        },
        loc: {
          start: {
            line: 161,
            column: 47
          },
          end: {
            line: 165,
            column: 3
          }
        },
        line: 161
      },
      '16': {
        name: '(anonymous_16)',
        decl: {
          start: {
            line: 162,
            column: 30
          },
          end: {
            line: 162,
            column: 31
          }
        },
        loc: {
          start: {
            line: 162,
            column: 45
          },
          end: {
            line: 164,
            column: 5
          }
        },
        line: 162
      },
      '17': {
        name: '(anonymous_17)',
        decl: {
          start: {
            line: 176,
            column: 17
          },
          end: {
            line: 176,
            column: 18
          }
        },
        loc: {
          start: {
            line: 176,
            column: 44
          },
          end: {
            line: 180,
            column: 3
          }
        },
        line: 176
      },
      '18': {
        name: '(anonymous_18)',
        decl: {
          start: {
            line: 177,
            column: 33
          },
          end: {
            line: 177,
            column: 34
          }
        },
        loc: {
          start: {
            line: 177,
            column: 48
          },
          end: {
            line: 179,
            column: 5
          }
        },
        line: 177
      }
    },
    branchMap: {
      '0': {
        loc: {
          start: {
            line: 33,
            column: 2
          },
          end: {
            line: 48,
            column: 3
          }
        },
        type: 'if',
        locations: [{
          start: {
            line: 33,
            column: 2
          },
          end: {
            line: 48,
            column: 3
          }
        }, {
          start: {
            line: 33,
            column: 2
          },
          end: {
            line: 48,
            column: 3
          }
        }],
        line: 33
      },
      '1': {
        loc: {
          start: {
            line: 37,
            column: 6
          },
          end: {
            line: 41,
            column: 7
          }
        },
        type: 'if',
        locations: [{
          start: {
            line: 37,
            column: 6
          },
          end: {
            line: 41,
            column: 7
          }
        }, {
          start: {
            line: 37,
            column: 6
          },
          end: {
            line: 41,
            column: 7
          }
        }],
        line: 37
      },
      '2': {
        loc: {
          start: {
            line: 46,
            column: 6
          },
          end: {
            line: 46,
            column: 73
          }
        },
        type: 'if',
        locations: [{
          start: {
            line: 46,
            column: 6
          },
          end: {
            line: 46,
            column: 73
          }
        }, {
          start: {
            line: 46,
            column: 6
          },
          end: {
            line: 46,
            column: 73
          }
        }],
        line: 46
      },
      '3': {
        loc: {
          start: {
            line: 46,
            column: 9
          },
          end: {
            line: 46,
            column: 61
          }
        },
        type: 'binary-expr',
        locations: [{
          start: {
            line: 46,
            column: 9
          },
          end: {
            line: 46,
            column: 15
          }
        }, {
          start: {
            line: 46,
            column: 19
          },
          end: {
            line: 46,
            column: 27
          }
        }, {
          start: {
            line: 46,
            column: 31
          },
          end: {
            line: 46,
            column: 61
          }
        }],
        line: 46
      },
      '4': {
        loc: {
          start: {
            line: 61,
            column: 2
          },
          end: {
            line: 61,
            column: 44
          }
        },
        type: 'if',
        locations: [{
          start: {
            line: 61,
            column: 2
          },
          end: {
            line: 61,
            column: 44
          }
        }, {
          start: {
            line: 61,
            column: 2
          },
          end: {
            line: 61,
            column: 44
          }
        }],
        line: 61
      },
      '5': {
        loc: {
          start: {
            line: 163,
            column: 13
          },
          end: {
            line: 163,
            column: 88
          }
        },
        type: 'cond-expr',
        locations: [{
          start: {
            line: 163,
            column: 53
          },
          end: {
            line: 163,
            column: 56
          }
        }, {
          start: {
            line: 163,
            column: 59
          },
          end: {
            line: 163,
            column: 88
          }
        }],
        line: 163
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
      '51': 0
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
      '18': 0
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

// var loopChilds = function (arr, elem) {
//   for (var child = elem.firstChild; child !== null; child = child.nextSibling) {
//     arr.push(child)
//     if (child.hasChildNodes()) {
//       loopChilds(arr, child)
//     }
//   }
// }

// exports.loopChilds = loopChilds

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
 * Copy with modification from preact-todomvc. Model constructor with
 * registering callback listener in Object.defineProperty. Any modification
 * to ```this.list``` instance will subsequently inform all registered listener.
 *
 * {{model:<myModel>}}<myModelTemplateString>{{/model:<myModel>}}
 *
 */
function createModel() {
  cov_140h9s3pvc.f[9]++;

  var model = (cov_140h9s3pvc.s[32]++, []);
  var onChanges = (cov_140h9s3pvc.s[33]++, []);

  cov_140h9s3pvc.s[34]++;
  var inform = function inform() {
    cov_140h9s3pvc.f[10]++;
    cov_140h9s3pvc.s[35]++;

    // console.trace(onChanges)
    for (var i = onChanges.length; i--;) {
      cov_140h9s3pvc.s[36]++;

      onChanges[i](model);
    }
  };

  /**
   * @private
   * @description
   * Register callback listener of any changes
   */
  cov_140h9s3pvc.s[37]++;
  Object.defineProperty(this, 'list', {
    enumerable: false,
    configurable: true,
    get: function get() {
      cov_140h9s3pvc.f[11]++;
      cov_140h9s3pvc.s[38]++;

      return model;
    },
    set: function set(val) {
      cov_140h9s3pvc.f[12]++;
      cov_140h9s3pvc.s[39]++;

      model = val;
      cov_140h9s3pvc.s[40]++;
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
  cov_140h9s3pvc.s[41]++;
  this.subscribe = function (fn) {
    cov_140h9s3pvc.f[13]++;
    cov_140h9s3pvc.s[42]++;

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
  cov_140h9s3pvc.s[43]++;
  this.add = function (obj) {
    cov_140h9s3pvc.f[14]++;
    cov_140h9s3pvc.s[44]++;

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
  cov_140h9s3pvc.s[45]++;
  this.update = function (lookupId, updateObj) {
    cov_140h9s3pvc.f[15]++;
    cov_140h9s3pvc.s[46]++;

    this.list = this.list.map(function (obj) {
      cov_140h9s3pvc.f[16]++;
      cov_140h9s3pvc.s[47]++;

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
  cov_140h9s3pvc.s[48]++;
  this.destroy = function (lookupId, objId) {
    cov_140h9s3pvc.f[17]++;
    cov_140h9s3pvc.s[49]++;

    this.list = this.list.filter(function (obj) {
      cov_140h9s3pvc.f[18]++;
      cov_140h9s3pvc.s[50]++;

      return obj[lookupId] !== objId;
    });
  };
}

cov_140h9s3pvc.s[51]++;
exports.createModel = createModel;

},{}],13:[function(require,module,exports){
'use strict';

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _templateObject = _taggedTemplateLiteral(['\n  <section id="todoapp">\n    <header id="header">\n      <h1>todos</h1>\n      <input id="new-todo" k-keydown="create()" placeholder="What needs to be done?" autofocus>\n    </header>\n    {{?todoState}}\n    <section id="main">\n      <input id="toggle-all" type="checkbox" checked="{{isChecked?checked:\'\'}}" k-click="completeAll()">\n      <label for="toggle-all">Mark all as complete</label>\n      <ul id="todo-list" k-click="evtTodo()" k-dblclick="editMode()">\n        {{model:todoModel}}\n          <li id="{{id}}" class="{{completed?completed:\'\'}}">\n            <div class="view">\n              <input class="toggle" type="checkbox" checked="{{completed?checked:\'\'}}">\n              <label>{{title}}</label>\n              <button class="destroy"></button>\n            </div>\n            <input class="edit" value="{{title}}">\n          </li>\n        {{/model:todoModel}}\n      </ul>\n    </section>\n    <footer id="footer">\n      <span id="todo-count">\n        <strong>{{count}}</strong> item{{plural}} left\n      </span>\n      {{component:filter}}\n      {{?clearToggle}}\n      <button id="clear-completed" k-click="clearCompleted()">Clear completed</button>\n      {{/clearToggle}}\n    </footer>\n    {{/todoState}}\n  </section>\n  <footer id="info">\n    <p>Double-click to edit a todo</p>\n    <p>Created by <a href="https://github.com/syarul">Shahrul Nizam Selamat</a></p>\n    <p>Part of <a href="http://todomvc.com">TodoMVC</a></p>\n  </footer>'], ['\n  <section id="todoapp">\n    <header id="header">\n      <h1>todos</h1>\n      <input id="new-todo" k-keydown="create()" placeholder="What needs to be done?" autofocus>\n    </header>\n    {{?todoState}}\n    <section id="main">\n      <input id="toggle-all" type="checkbox" checked="{{isChecked?checked:\'\'}}" k-click="completeAll()">\n      <label for="toggle-all">Mark all as complete</label>\n      <ul id="todo-list" k-click="evtTodo()" k-dblclick="editMode()">\n        {{model:todoModel}}\n          <li id="{{id}}" class="{{completed?completed:\'\'}}">\n            <div class="view">\n              <input class="toggle" type="checkbox" checked="{{completed?checked:\'\'}}">\n              <label>{{title}}</label>\n              <button class="destroy"></button>\n            </div>\n            <input class="edit" value="{{title}}">\n          </li>\n        {{/model:todoModel}}\n      </ul>\n    </section>\n    <footer id="footer">\n      <span id="todo-count">\n        <strong>{{count}}</strong> item{{plural}} left\n      </span>\n      {{component:filter}}\n      {{?clearToggle}}\n      <button id="clear-completed" k-click="clearCompleted()">Clear completed</button>\n      {{/clearToggle}}\n    </footer>\n    {{/todoState}}\n  </section>\n  <footer id="info">\n    <p>Double-click to edit a todo</p>\n    <p>Created by <a href="https://github.com/syarul">Shahrul Nizam Selamat</a></p>\n    <p>Part of <a href="http://todomvc.com">TodoMVC</a></p>\n  </footer>']);

function _taggedTemplateLiteral(strings, raw) { return Object.freeze(Object.defineProperties(strings, { raw: { value: Object.freeze(raw) } })); }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var Keet = require('../keet');

var _require = require('../keet/utils'),
    html = _require.html;

var _require2 = require('./util'),
    camelCase = _require2.camelCase,
    genId = _require2.genId;

var createTodoModel = require('./todoModel');
var filterPage = ['all', 'active', 'completed'];
// const filtersTmpl = require('./filters')(filterPage)
var filterApp = require('./filter');
var todos = require('./todo');

var App = function (_Keet) {
  _inherits(App, _Keet);

  function App() {
    var _ref;

    var _temp, _this, _ret;

    _classCallCheck(this, App);

    for (var _len = arguments.length, args = Array(_len), _key = 0; _key < _len; _key++) {
      args[_key] = arguments[_key];
    }

    return _ret = (_temp = (_this = _possibleConstructorReturn(this, (_ref = App.__proto__ || Object.getPrototypeOf(App)).call.apply(_ref, [this].concat(args))), _this), _this.todoModel = todos, _this.filter = filterApp, _this.page = 'All', _this.isChecked = false, _this.count = 0, _this.plural = '', _this.clearToggle = false, _this.todoState = true, _temp), _possibleConstructorReturn(_this, _ret);
  }

  _createClass(App, [{
    key: 'componentWillMount',
    value: function componentWillMount() {
      var _this2 = this;

      filterPage.map(function (f) {
        return _this2['page' + camelCase(f)] = '';
      });

      // this.todoState = this.todoModel.list.length ? true : false

      this.todoModel.subscribe(function (todos) {
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
      var title = evt.target.value.trim();
      if (title) {
        this.todoModel.add({ id: genId(), title: title, completed: false });
        evt.target.value = '';
      }
    }
  }, {
    key: 'evtTodo',
    value: function evtTodo(evt) {
      console.log(1);
      if (evt.target.className === 'toggle') {
        this.toggleTodo(evt.target.parentNode.parentNode.id, evt);
      } else if (evt.target.className === 'destroy') {
        this.todoDestroy(evt.target.parentNode.parentNode.id);
      }
    }
  }, {
    key: 'toggleTodo',
    value: function toggleTodo(id, evt) {
      this.todoModel.update('id', { id: id, completed: !!evt.target.checked });
    }
  }, {
    key: 'todoDestroy',
    value: function todoDestroy(id) {
      this.todoModel.destroy('id', id);
    }
  }, {
    key: 'completeAll',
    value: function completeAll() {
      this.isChecked = !this.isChecked;
      this.todoModel.updateAll(this.isChecked);
    }
  }, {
    key: 'clearCompleted',
    value: function clearCompleted() {
      this.todoModel.clearCompleted();
    }
  }, {
    key: 'editMode',
    value: function editMode() {}
  }]);

  return App;
}(Keet);

// <ul id="filters">
// ${filtersTmpl}
// </ul>

var vmodel = html(_templateObject);

var app = new App();

app.mount(vmodel).link('todo');

console.log(app);

},{"../keet":10,"../keet/utils":12,"./filter":15,"./todo":16,"./todoModel":17,"./util":18}],14:[function(require,module,exports){
'use strict';

var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var _require = require('./util'),
    camelCase = _require.camelCase;

var _require2 = require('../keet/utils'),
    createModel = _require2.createModel;

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
}(createModel);

var filterModel = new CreateFilterModel();

Array.from(['all', 'active', 'completed']).map(function (page) {
  filterModel.add({
    hash: '#/' + page,
    name: camelCase(page),
    selected: false
  });
});

module.exports = filterModel;

},{"../keet/utils":12,"./util":18}],15:[function(require,module,exports){
'use strict';

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _templateObject = _taggedTemplateLiteral(['\n\t<ul id="filters">\n\t\t{{model:filterModel}}\n\t\t<li k-click="updateUrl({{hash}})"><a class="{{selected?selected:\'\'}}" href="{{hash}}">{{name}}</a></li>\n\t\t{{/model:filterModel}}\n\t</ul>\n'], ['\n\t<ul id="filters">\n\t\t{{model:filterModel}}\n\t\t<li k-click="updateUrl({{hash}})"><a class="{{selected?selected:\'\'}}" href="{{hash}}">{{name}}</a></li>\n\t\t{{/model:filterModel}}\n\t</ul>\n']);

function _taggedTemplateLiteral(strings, raw) { return Object.freeze(Object.defineProperties(strings, { raw: { value: Object.freeze(raw) } })); }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var Keet = require('../keet');

var _require = require('./util'),
    camelCase = _require.camelCase,
    html = _require.html;

var filters = require('./filter-model');

var App = function (_Keet) {
  _inherits(App, _Keet);

  function App() {
    var _ref;

    var _temp, _this, _ret;

    _classCallCheck(this, App);

    for (var _len = arguments.length, args = Array(_len), _key = 0; _key < _len; _key++) {
      args[_key] = arguments[_key];
    }

    return _ret = (_temp = (_this = _possibleConstructorReturn(this, (_ref = App.__proto__ || Object.getPrototypeOf(App)).call.apply(_ref, [this].concat(args))), _this), _this.el = 'filters', _this.filterModel = filters, _temp), _possibleConstructorReturn(_this, _ret);
  }

  _createClass(App, [{
    key: 'componentWillMount',
    value: function componentWillMount() {
      var _this2 = this;

      this.filterModel.subscribe(function (model) {
        _this2.callBatchPoolUpdate();
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

    // componentDidUnMount(){
    //
    // }

  }, {
    key: 'updateUrl',
    value: function updateUrl(hash) {
      this.filterModel.switch(hash, { selected: true });
    }
  }]);

  return App;
}(Keet);

var filterApp = new App();

var vmodel = html(_templateObject);

filterApp.mount(vmodel);

module.exports = filterApp;

},{"../keet":10,"./filter-model":14,"./util":18}],16:[function(require,module,exports){
'use strict';

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var Keet = require('../keet');

var _require = require('../keet/utils'),
    createModel = _require.createModel;

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
}(createModel);

var todos = new CreateModel();

module.exports = todos;

},{"../keet":10,"../keet/utils":12}],17:[function(require,module,exports){
'use strict';

var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

var _require = require('./util'),
    genId = _require.genId;

// note: copy with modification from preact-todomvc

module.exports = function () {

  var onChanges = [];

  function inform() {
    for (var i = onChanges.length; i--;) {
      onChanges[i](model);
    }
  }

  var model = {

    list: [],

    // ops: null,

    subscribe: function subscribe(fn) {
      onChanges.push(fn);
    },
    addTodo: function addTodo(title) {
      // this.ops = 'add'
      this.list = this.list.concat({
        id: genId(),
        title: title,
        completed: false
      });
      inform();
    },
    toggleAll: function toggleAll(completed) {
      this.ops = 'toggleAll';
      this.list = this.list.map(function (todo) {
        return _extends({}, todo, { completed: completed });
      });
      inform();
    },
    toggle: function toggle(todoToToggle) {
      // this.ops = 'toggle'
      this.list = this.list.map(function (todo) {
        return todo.id !== todoToToggle.id ? todo : _extends({}, todo, todoToToggle);
      });
      inform();
    },
    destroy: function destroy(id) {
      // this.ops = 'destroy'
      this.list = this.list.filter(function (t) {
        return t.id !== id;
      });
      inform();
    }
  };

  return model;
};

},{"./util":18}],18:[function(require,module,exports){
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

},{}]},{},[13])
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIkM6L1VzZXJzL3BpcGV5L0FwcERhdGEvUm9hbWluZy9ucG0vbm9kZV9tb2R1bGVzL2Jyb3dzZXJpZnkvbm9kZV9tb2R1bGVzL2Jyb3dzZXItcGFjay9fcHJlbHVkZS5qcyIsImtlZXQvY29tcG9uZW50cy9jb21wb25lbnRQYXJzZS5qcyIsImtlZXQvY29tcG9uZW50cy9jb25kaXRpb25hbE5vZGVzLmpzIiwia2VldC9jb21wb25lbnRzL2dlbkVsZW1lbnQuanMiLCJrZWV0L2NvbXBvbmVudHMvZ2VuTW9kZWxMaXN0LmpzIiwia2VldC9jb21wb25lbnRzL3BhcnNlU3RyLmpzIiwia2VldC9jb21wb25lbnRzL3Byb2Nlc3NFdmVudC5qcyIsImtlZXQvY29tcG9uZW50cy9zdHJJbnRlcnByZXRlci5qcyIsImtlZXQvY29tcG9uZW50cy90ZXJuYXJ5T3BzLmpzIiwia2VldC9jb21wb25lbnRzL3RtcGxIYW5kbGVyLmpzIiwia2VldC9rZWV0LmpzIiwia2VldC9ub2RlX21vZHVsZXMvbW9ycGhkb20vZGlzdC9tb3JwaGRvbS5qcyIsImtlZXQvdXRpbHMuanMiLCJzcmMvYXBwLmpzIiwic3JjL2ZpbHRlci1tb2RlbC5qcyIsInNyYy9maWx0ZXIuanMiLCJzcmMvdG9kby5qcyIsInNyYy90b2RvTW9kZWwuanMiLCJzcmMvdXRpbC5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTtBQ0FBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNqQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDdERBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNuTEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNyQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN0RUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDaERBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNSQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDN0JBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDbFVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDdkpBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7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QWxDRDs7QUFvQ0EsUUFBUSxhQUFSLEdBQXdCLFVBQVMsS0FBVCxFQUFnQixRQUFoQixFQUEwQjtBQUNoRDtBQUNBLE1BQUksS0FBSixFQUFXLGFBQWEsS0FBYjtBQUNYLFVBQVEsV0FBVyxZQUFXO0FBQzVCO0FBQ0QsR0FGTyxFQUVMLEVBRkssQ0FBUjtBQUdELENBTkQiLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXNDb250ZW50IjpbIihmdW5jdGlvbigpe2Z1bmN0aW9uIHIoZSxuLHQpe2Z1bmN0aW9uIG8oaSxmKXtpZighbltpXSl7aWYoIWVbaV0pe3ZhciBjPVwiZnVuY3Rpb25cIj09dHlwZW9mIHJlcXVpcmUmJnJlcXVpcmU7aWYoIWYmJmMpcmV0dXJuIGMoaSwhMCk7aWYodSlyZXR1cm4gdShpLCEwKTt2YXIgYT1uZXcgRXJyb3IoXCJDYW5ub3QgZmluZCBtb2R1bGUgJ1wiK2krXCInXCIpO3Rocm93IGEuY29kZT1cIk1PRFVMRV9OT1RfRk9VTkRcIixhfXZhciBwPW5baV09e2V4cG9ydHM6e319O2VbaV1bMF0uY2FsbChwLmV4cG9ydHMsZnVuY3Rpb24ocil7dmFyIG49ZVtpXVsxXVtyXTtyZXR1cm4gbyhufHxyKX0scCxwLmV4cG9ydHMscixlLG4sdCl9cmV0dXJuIG5baV0uZXhwb3J0c31mb3IodmFyIHU9XCJmdW5jdGlvblwiPT10eXBlb2YgcmVxdWlyZSYmcmVxdWlyZSxpPTA7aTx0Lmxlbmd0aDtpKyspbyh0W2ldKTtyZXR1cm4gb31yZXR1cm4gcn0pKCkiLCJtb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uIChzdHJpbmcpIHtcclxuICB2YXIgc2VsZiA9IHRoaXNcclxuICB0aGlzLl9fY29tcG9uZW50TGlzdF9fLm1hcChmdW5jdGlvbiAoY29tcG9uZW50KSB7XHJcbiAgICBpZiAoc2VsZltjb21wb25lbnRdKSB7XHJcbiAgICAgIHZhciBjID0gc2VsZltjb21wb25lbnRdXHJcbiAgICAgIC8vIHJlZ2lzdGVyIHRoaXMgY29tcG9uZW50IGFzIGEgc3ViLWNvbXBvbmVudFxyXG4gICAgICBjLklTX1NUVUIgPSB0cnVlXHJcbiAgICAgIC8vIGxpZmUtY3ljbGUgbWV0aG9kIGJlZm9yZSByZW5kZXJpbmcgc3ViLWNvbXBvbmVudFxyXG4gICAgICB2YXIgcmVneCA9ICcoXFxcXHtcXFxce2NvbXBvbmVudDonICsgY29tcG9uZW50ICsgJ1xcXFx9XFxcXH0pJ1xyXG4gICAgICB2YXIgcmUgPSBuZXcgUmVnRXhwKHJlZ3gsICdnJylcclxuICAgICAgdmFyIHRwbCA9IGMucmVuZGVyKCdhc1N0cmluZycpXHJcbiAgICAgIHNlbGYuX19jb21wb25lbnRTdHViX19bY29tcG9uZW50XSA9IHRwbFxyXG4gICAgICBzdHJpbmcgPSBzdHJpbmcucmVwbGFjZShyZSwgdHBsKVxyXG4gICAgfVxyXG4gIH0pXHJcbiAgcmV0dXJuIHN0cmluZ1xyXG59XHJcbiIsInZhciBjb25kaXRpb25hbE5vZGVzUmF3U3RhcnQgPSAvXFx7XFx7XFw/KFtee31dKylcXH1cXH0vZ1xyXG52YXIgY29uZGl0aW9uYWxOb2Rlc1Jhd0VuZCA9IC9cXHtcXHtcXC8oW157fV0rKVxcfVxcfS9nXHJcbnZhciBET0NVTUVOVF9URVhUX1RZUEUgPSAzXHJcbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24gKG5vZGUsIGNvbmRpdGlvbmFsLCB0bXBsSGFuZGxlcikge1xyXG4gIHZhciBlbnRyeU5vZGVcclxuICB2YXIgY3VycmVudE5vZGVcclxuICB2YXIgaXNHZW5cclxuICB2YXIgZnJhZyA9IGRvY3VtZW50LmNyZWF0ZURvY3VtZW50RnJhZ21lbnQoKVxyXG4gIHdoaWxlKG5vZGUpe1xyXG4gICAgY3VycmVudE5vZGUgPSBub2RlXHJcbiAgICBub2RlID0gbm9kZS5uZXh0U2libGluZ1xyXG4gICAgaWYoY3VycmVudE5vZGUubm9kZVR5cGUgPT09IERPQ1VNRU5UX1RFWFRfVFlQRSl7XHJcbiAgICAgIGlmKGN1cnJlbnROb2RlLm5vZGVWYWx1ZS5tYXRjaChjb25kaXRpb25hbE5vZGVzUmF3U3RhcnQpKXtcclxuICAgICAgICBlbnRyeU5vZGUgPSBjdXJyZW50Tm9kZVxyXG4gICAgICB9IGVsc2UgaWYoY3VycmVudE5vZGUubm9kZVZhbHVlLm1hdGNoKGNvbmRpdGlvbmFsTm9kZXNSYXdFbmQpKXtcclxuICAgICAgICBjdXJyZW50Tm9kZS5yZW1vdmUoKVxyXG4gICAgICAgIC8vIHN0YXIgZ2VuZXJhdGluZyB0aGUgY29uZGl0aW9uYWwgbm9kZXMgcmFuZ2UsIGlmIG5vdCB5ZXRcclxuICAgICAgICBpZighaXNHZW4pe1xyXG4gICAgICAgICAgaXNHZW4gPSB0cnVlXHJcbiAgICAgICAgICB0bXBsSGFuZGxlcih0aGlzLCBudWxsLCBudWxsLCBudWxsLCBmcmFnKVxyXG4gICAgICAgIH1cclxuICAgICAgICBpZih0aGlzW2NvbmRpdGlvbmFsXSl7XHJcbiAgICAgICAgICBlbnRyeU5vZGUucGFyZW50Tm9kZS5pbnNlcnRCZWZvcmUoZnJhZywgZW50cnlOb2RlKVxyXG4gICAgICAgIH1cclxuICAgICAgICBlbnRyeU5vZGUucmVtb3ZlKClcclxuICAgICAgICBub2RlID0gbnVsbFxyXG4gICAgICB9XHJcbiAgICB9IGVsc2Uge1xyXG4gICAgICB2YXIgY05vZGUgPSBjdXJyZW50Tm9kZS5jbG9uZU5vZGUodHJ1ZSlcclxuICAgICAgZnJhZy5hcHBlbmRDaGlsZChjTm9kZSlcclxuICAgICAgY3VycmVudE5vZGUucmVtb3ZlKClcclxuICAgIH1cclxuICB9XHJcbiAgXHJcbiAgLy8gdmFyIHNlbGYgPSB0aGlzXHJcbiAgLy8gdGhpcy5fX3N0YXRlTGlzdF9fLm1hcChmdW5jdGlvbiAoc3RhdGUpIHtcclxuICAvLyAgIGlmICghc2VsZltzdGF0ZV0pIHtcclxuICAvLyAgICAgdmFyIGYgPSAnXFxcXHtcXFxce1xcXFw/JyArIHN0YXRlICsgJ1xcXFx9XFxcXH0nXHJcbiAgLy8gICAgIHZhciBiID0gJ1xcXFx7XFxcXHtcXFxcLycgKyBzdGF0ZSArICdcXFxcfVxcXFx9J1xyXG4gIC8vICAgICAvLyB2YXIgcmVneCA9ICcoPzw9JyArIGYgKyAnKSguKj8pKD89JyArIGIgKyAnKSdcclxuICAvLyAgICAgLy8gKiogb2xkIGJyb3dzZXIgZG9lcyBub3Qgc3VwcG9ydCBwb3NpdGl2ZSBsb29rIGJlaGluZCAqKlxyXG4gIC8vICAgICB2YXIgcmVneCA9ICcoJyArIGYgKyAnKSguKj8pKD89JyArIGIgKyAnKSdcclxuICAvLyAgICAgdmFyIHJlID0gbmV3IFJlZ0V4cChyZWd4KVxyXG4gIC8vICAgICB2YXIgaXNDb25kaXRpb25hbCA9IHJlLnRlc3Qoc3RyaW5nKVxyXG4gIC8vICAgICB2YXIgbWF0Y2ggPSBzdHJpbmcubWF0Y2gocmUpXHJcbiAgLy8gICAgIGlmIChpc0NvbmRpdGlvbmFsICYmIG1hdGNoKSB7XHJcbiAgLy8gICAgICAgc3RyaW5nID0gc3RyaW5nLnJlcGxhY2UobWF0Y2hbMl0sICcnKVxyXG4gIC8vICAgICB9XHJcbiAgLy8gICB9XHJcbiAgLy8gICBzdHJpbmcgPSBzdHJpbmcucmVwbGFjZSgne3s/JyArIHN0YXRlICsgJ319JywgJycpXHJcbiAgLy8gICBzdHJpbmcgPSBzdHJpbmcucmVwbGFjZSgne3svJyArIHN0YXRlICsgJ319JywgJycpXHJcbiAgLy8gfSlcclxuICAvLyByZXR1cm4gc3RyaW5nXHJcbn1cclxuIiwidmFyIHRtcGxIYW5kbGVyID0gcmVxdWlyZSgnLi90bXBsSGFuZGxlcicpXHJcbnZhciBwcm9jZXNzRXZlbnQgPSByZXF1aXJlKCcuL3Byb2Nlc3NFdmVudCcpXHJcbnZhciBnZXRJZCA9IHJlcXVpcmUoJy4uL3V0aWxzJykuZ2V0SWRcclxudmFyIHRlc3RFdmVudCA9IHJlcXVpcmUoJy4uL3V0aWxzJykudGVzdEV2ZW50XHJcbnZhciBjaGVja05vZGVBdmFpbGFiaWxpdHkgPSByZXF1aXJlKCcuLi91dGlscycpLmNoZWNrTm9kZUF2YWlsYWJpbGl0eVxyXG52YXIgc3RySW50ZXJwcmV0ZXIgPSByZXF1aXJlKCcuL3N0ckludGVycHJldGVyJylcclxudmFyIGNvbXBvbmVudFBhcnNlID0gcmVxdWlyZSgnLi9jb21wb25lbnRQYXJzZScpXHJcbi8vIHZhciBtb2RlbFBhcnNlID0gcmVxdWlyZSgnLi9tb2RlbFBhcnNlJylcclxuLy8gdmFyIG5vZGVzVmlzaWJpbGl0eSA9IHJlcXVpcmUoJy4vbm9kZXNWaXNpYmlsaXR5JylcclxudmFyIG1vcnBoID0gcmVxdWlyZSgnbW9ycGhkb20nKVxyXG5cclxudmFyIHVwZGF0ZUNvbnRleHQgPSBmdW5jdGlvbiAoZm9yY2UpIHtcclxuICB2YXIgc2VsZiA9IHRoaXNcclxuICB2YXIgZnJhZyA9IFtdXHJcbiAgdmFyIGVsZSA9IGdldElkKHRoaXMuZWwpXHJcbiAgdmFyIG5vZGUgXHJcbiAgdmFyIGN1cnJlbnROb2RlXHJcbiAgIWZvcmNlICYmIGdlbkVsZW1lbnQuY2FsbCh0aGlzKVxyXG4gIHZhciBuZXdFbGVtID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnZGl2JylcclxuICAvLyBtb3JwIGFzIHN1Yi1jb21wb25lbnRcclxuICBpZiAodGhpcy5JU19TVFVCKSB7XHJcbiAgICBtb3JwaChlbGUsIG5ld0VsZW0uY2hpbGROb2Rlc1swXSlcclxuICB9IGVsc2Uge1xyXG4gIC8vIG90aGVyd2lzZSBtb3BoIGFzIHdob2xlXHJcbiAgICBuZXdFbGVtLmlkID0gdGhpcy5lbFxyXG4gICAgbmV3RWxlbS5hcHBlbmRDaGlsZCh0aGlzLmJhc2UpXHJcbiAgICBtb3JwaChlbGUsIG5ld0VsZW0pXHJcbiAgICBcclxuICAgIC8vIHN1Yi1jb21wb25lbnQgbGlmZS1jeWNsZVxyXG4gICAgLy8gdGhpcy5fX2NvbXBvbmVudExpc3RfXy5tYXAoZnVuY3Rpb24gKGNvbXBvbmVudCkge1xyXG4gICAgLy8gICBpZihzZWxmW2NvbXBvbmVudF0pe1xyXG4gICAgLy8gICAgIHZhciBjID0gc2VsZltjb21wb25lbnRdXHJcbiAgICAvLyAgICAgY2hlY2tOb2RlQXZhaWxhYmlsaXR5KGMsIG51bGwsIGZ1bmN0aW9uKCl7XHJcbiAgICAvLyAgICAgICBpZiAoIWMuRElEX01PVU5UICYmIGMuY29tcG9uZW50RGlkTW91bnQgJiYgdHlwZW9mIGMuY29tcG9uZW50RGlkTW91bnQgPT09ICdmdW5jdGlvbicpIHtcclxuICAgIC8vICAgICAgICAgYy5ESURfTU9VTlQgPSB0cnVlXHJcbiAgICAvLyAgICAgICAgIGMuY29tcG9uZW50RGlkTW91bnQoKVxyXG4gICAgLy8gICAgICAgfVxyXG4gICAgLy8gICAgIH0sIGZ1bmN0aW9uKCl7XHJcbiAgICAvLyAgICAgICBpZiAoYy5ESURfTU9VTlQgJiYgYy5jb21wb25lbnREaWRVbk1vdW50ICYmIHR5cGVvZiBjLmNvbXBvbmVudERpZFVuTW91bnQgPT09ICdmdW5jdGlvbicpIHtcclxuICAgIC8vICAgICAgICAgYy5ESURfTU9VTlQgPSBmYWxzZVxyXG4gICAgLy8gICAgICAgICBjLmNvbXBvbmVudERpZFVuTW91bnQoKVxyXG4gICAgLy8gICAgICAgfVxyXG4gICAgLy8gICAgIH0pXHJcbiAgICAvLyAgIH1cclxuICAgIC8vIH0pXHJcbiAgfVxyXG4gIC8vIGNsZWFuIHVwIGRvY3VtZW50IGNyZWF0aW9uIHNpbmNlIGl0cyBub3QgYSBmcmFnbWVudFxyXG4gIG5vZGUgPSBuZXdFbGVtLmZpcnN0Q2hpbGRcclxuICB3aGlsZShub2RlKXtcclxuICAgIGN1cnJlbnROb2RlID0gbm9kZVxyXG4gICAgbm9kZSA9IG5vZGUubmV4dFNpYmxpbmdcclxuICAgIGN1cnJlbnROb2RlLnJlbW92ZSgpXHJcbiAgfVxyXG4gIC8vIGV4ZWMgbGlmZS1jeWNsZSBjb21wb25lbnREaWRVcGRhdGVcclxuICBpZiAodGhpcy5jb21wb25lbnREaWRVcGRhdGUgJiYgdHlwZW9mIHRoaXMuY29tcG9uZW50RGlkVXBkYXRlID09PSAnZnVuY3Rpb24nKSB7XHJcbiAgICB0aGlzLmNvbXBvbmVudERpZFVwZGF0ZSgpXHJcbiAgfVxyXG4gIC8vIGNvbnNvbGUubG9nKHRoaXMpXHJcbiAgLy8gcmVzZXQgYmF0Y2ggcG9vbGluZ1xyXG4gIGJhdGNoUG9vbC5zdGF0dXMgPSAncmVhZHknXHJcbn1cclxuXHJcbi8vIGJhdGNoIHBvb2wgdXBkYXRlIHN0YXRlcyB0byBET01cclxudmFyIGJhdGNoUG9vbCA9IHtcclxuICB0dGw6IDAsXHJcbiAgc3RhdHVzOiAncmVhZHknXHJcbn1cclxuXHJcbi8vIFRoZSBpZGVhIGJlaGluZCB0aGlzIGlzIHRvIHJlZHVjZSBtb3JwaGluZyB0aGUgRE9NIHdoZW4gbXVsdGlwbGUgdXBkYXRlc1xyXG4vLyBoaXQgdGhlIGRlY2suIElmIHBvc3NpYmxlIHdlIHdhbnQgdG8gcG9vbCB0aGVtIGJlZm9yZSBpbml0aWF0aW5nIERPTVxyXG4vLyBtb3JwaGluZywgYnV0IGluIHRoZSBldmVudCB0aGUgdXBkYXRlIGlzIG5vdCBmYXN0IGVub3VnaCB3ZSB3YW50IHRvIHJldHVyblxyXG4vLyB0byBub3JtYWwgc3luY2hyb25vdXMgdXBkYXRlLlxyXG52YXIgYmF0Y2hQb29sRXhlYyA9IGZ1bmN0aW9uIChmb3JjZSkge1xyXG4gIGlmIChiYXRjaFBvb2wuc3RhdHVzID09PSAncG9vbGluZycpIHtcclxuICAgIC8vXHJcbiAgfSBlbHNlIHtcclxuICAgIHZhciBzZWxmID0gdGhpc1xyXG4gICAgYmF0Y2hQb29sLnN0YXR1cyA9ICdwb29saW5nJ1xyXG4gICAgLy8gaWYgYmF0Y2hwb29sIGlzIG5vdCB5ZXQgZXhlY3V0ZWQgb3IgaXQgd2FzIGlkbGUgKGFmdGVyIDEwMG1zKVxyXG4gICAgLy8gZGlyZWN0IG1vcnBoIHRoZSBET01cclxuICAgIGlmICghYmF0Y2hQb29sLnR0bCkge1xyXG4gICAgICB1cGRhdGVDb250ZXh0LmNhbGwodGhpcywgZm9yY2UpXHJcbiAgICB9IGVsc2Uge1xyXG4gICAgLy8gd2Ugd2FpdCB1bnRpbCBwb29saW5nIGlzIHJlYWR5IGJlZm9yZSBpbml0aWF0aW5nIERPTSBtb3JwaGluZ1xyXG4gICAgICBjbGVhclRpbWVvdXQoYmF0Y2hQb29sLnR0bClcclxuICAgICAgYmF0Y2hQb29sLnR0bCA9IHNldFRpbWVvdXQoZnVuY3Rpb24gKCkge1xyXG4gICAgICAgIHVwZGF0ZUNvbnRleHQuY2FsbChzZWxmLCBmb3JjZSlcclxuICAgICAgfSwgMClcclxuICAgIH1cclxuICAgIC8vIHdlIGNsZWFyIHRoZSBiYXRjaCBwb29sIGlmIGl0IG1vcmUgdGhlbiAxMDBtcyBmcm9tXHJcbiAgICAvLyBsYXN0IHVwZGF0ZVxyXG4gICAgYmF0Y2hQb29sLnR0bCA9IHNldFRpbWVvdXQoZnVuY3Rpb24gKCkge1xyXG4gICAgICBiYXRjaFBvb2wudHRsID0gMFxyXG4gICAgfSwgMTAwKVxyXG4gIH1cclxufVxyXG5cclxudmFyIG5leHRTdGF0ZSA9IGZ1bmN0aW9uIChpKSB7XHJcbiAgdmFyIHNlbGYgPSB0aGlzXHJcbiAgdmFyIHN0YXRlXHJcbiAgdmFyIHZhbHVlXHJcbiAgaWYoaSA8IHN0YXRlTGlzdC5sZW5ndGgpIHtcclxuXHJcbiAgICBzdGF0ZSA9IHN0YXRlTGlzdFtpXVxyXG4gICAgdmFsdWUgPSB0aGlzW3N0YXRlXVxyXG5cclxuICAgIC8vIGlmIHZhbHVlIGlzIHVuZGVmaW5lZCwgbGlrZWx5IGhhcyBvYmplY3Qgbm90YXRpb24gd2UgY29udmVydCBpdCB0byBhcnJheVxyXG4gICAgaWYgKHZhbHVlID09PSB1bmRlZmluZWQpIHZhbHVlID0gc3RySW50ZXJwcmV0ZXIoc3RhdGUpXHJcblxyXG4gICAgaWYgKHZhbHVlICYmIEFycmF5LmlzQXJyYXkodmFsdWUpKSB7XHJcbiAgICAgIC8vIHVzaW5nIHNwbGl0IG9iamVjdCBub3RhdGlvbiBhcyBiYXNlIGZvciBzdGF0ZSB1cGRhdGVcclxuICAgICAgLy8gY29uc29sZS5sb2codmFsdWUpXHJcbiAgICAgIHZhciBpblZhbCA9IHRoaXNbdmFsdWVbMF1dW3ZhbHVlWzFdXVxyXG4gICAgICBPYmplY3QuZGVmaW5lUHJvcGVydHkodGhpc1t2YWx1ZVswXV0sIHZhbHVlWzFdLCB7XHJcbiAgICAgICAgZW51bWVyYWJsZTogZmFsc2UsXHJcbiAgICAgICAgY29uZmlndXJhYmxlOiB0cnVlLFxyXG4gICAgICAgIGdldDogZnVuY3Rpb24gKCkge1xyXG4gICAgICAgICAgcmV0dXJuIGluVmFsXHJcbiAgICAgICAgfSxcclxuICAgICAgICBzZXQ6IGZ1bmN0aW9uICh2YWwpIHtcclxuICAgICAgICAgIGluVmFsID0gdmFsXHJcbiAgICAgICAgICBiYXRjaFBvb2xFeGVjLmNhbGwoc2VsZilcclxuICAgICAgICB9XHJcbiAgICAgIH0pXHJcbiAgICB9IGVsc2Uge1xyXG4gICAgICAvLyBoYW5kbGUgcGFyZW50IHN0YXRlIHVwZGF0ZSBpZiB0aGUgc3RhdGUgaXMgbm90IGFuIG9iamVjdFxyXG4gICAgICBPYmplY3QuZGVmaW5lUHJvcGVydHkodGhpcywgc3RhdGUsIHtcclxuICAgICAgICBlbnVtZXJhYmxlOiBmYWxzZSxcclxuICAgICAgICBjb25maWd1cmFibGU6IHRydWUsXHJcbiAgICAgICAgZ2V0OiBmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgICByZXR1cm4gdmFsdWVcclxuICAgICAgICB9LFxyXG4gICAgICAgIHNldDogZnVuY3Rpb24gKHZhbCkge1xyXG4gICAgICAgICAgdmFsdWUgPSB2YWxcclxuICAgICAgICAgIGJhdGNoUG9vbEV4ZWMuY2FsbChzZWxmKVxyXG4gICAgICAgIH1cclxuICAgICAgfSlcclxuICAgIH1cclxuICAgIGkrK1xyXG4gICAgbmV4dFN0YXRlLmNhbGwodGhpcywgaSlcclxuICB9XHJcbn1cclxuXHJcbnZhciBzZXRTdGF0ZSA9IGZ1bmN0aW9uICgpIHtcclxuICBuZXh0U3RhdGUuY2FsbCh0aGlzLCAwKVxyXG59XHJcblxyXG52YXIgc3RhdGVMaXN0ID0gW11cclxuXHJcbnZhciBjbGVhclN0YXRlID0gZnVuY3Rpb24oKXtcclxuICBzdGF0ZUxpc3QgPSBbXVxyXG59XHJcblxyXG52YXIgYWRkU3RhdGUgPSBmdW5jdGlvbihzdGF0ZSl7XHJcbiAgaWYoc3RhdGVMaXN0LmluZGV4T2Yoc3RhdGUpID09PSAtMSkgc3RhdGVMaXN0ID0gc3RhdGVMaXN0LmNvbmNhdChzdGF0ZSlcclxufVxyXG5cclxudmFyIGdlbkVsZW1lbnQgPSBmdW5jdGlvbiAoZm9yY2UpIHtcclxuXHJcbiAgdGhpcy5iYXNlID0gdGhpcy5fX3ByaXN0aW5lRnJhZ21lbnRfXy5jbG9uZU5vZGUodHJ1ZSlcclxuICB0bXBsSGFuZGxlcih0aGlzLCBhZGRTdGF0ZSlcclxuICAvLyByZXR1cm5cclxuICAvLyB2YXIgdGVtcERpdiA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2RpdicpXHJcbiAgLy8gdHBsID0gY29tcG9uZW50UGFyc2UuY2FsbCh0aGlzLCB0cGwpXHJcbiAgLy8gdHBsID0gbW9kZWxQYXJzZS5jYWxsKHRoaXMsIHRwbClcclxuICAvLyB0cGwgPSBub2Rlc1Zpc2liaWxpdHkuY2FsbCh0aGlzLCB0cGwpXHJcbiAgLy8gdGVtcERpdi5pbm5lckhUTUwgPSB0cGxcclxuXHJcbiAgLy8gc2V0U3RhdGUuY2FsbCh0aGlzKVxyXG4gIC8vIHRlc3RFdmVudCh0cGwpICYmIHByb2Nlc3NFdmVudC5jYWxsKHRoaXMsIHRlbXBEaXYpXHJcbiAgaWYgKGZvcmNlKSB7XHJcbiAgICBiYXRjaFBvb2xFeGVjLmNhbGwodGhpcywgZm9yY2UpXHJcbiAgfVxyXG59XHJcblxyXG5leHBvcnRzLmdlbkVsZW1lbnQgPSBnZW5FbGVtZW50XHJcbmV4cG9ydHMuYWRkU3RhdGUgPSBhZGRTdGF0ZVxyXG5leHBvcnRzLnNldFN0YXRlID0gc2V0U3RhdGVcclxuZXhwb3J0cy5jbGVhclN0YXRlID0gY2xlYXJTdGF0ZVxyXG4iLCJ2YXIgdGVybmFyeU9wcyA9IHJlcXVpcmUoJy4vdGVybmFyeU9wcycpXHJcbnZhciBjcmVhdGVNb2RlbCA9IHJlcXVpcmUoJy4uL3V0aWxzJykuY3JlYXRlTW9kZWxcclxudmFyIGFzc2VydCA9IHJlcXVpcmUoJy4uL3V0aWxzJykuYXNzZXJ0XHJcblxyXG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uIChub2RlLCBtb2RlbCwgdG1wbEhhbmRsZXIpIHtcclxuICB2YXIgbW9kZWxMaXN0XHJcbiAgdmFyIG1MZW5ndGhcclxuICB2YXIgaVxyXG4gIHZhciBsaXN0Q2xvbmVcclxuICB2YXIgcGFyZW50Tm9kZVxyXG5cclxuICB2YXIgbGlzdCA9IG5vZGUubmV4dFNpYmxpbmcuY2xvbmVOb2RlKHRydWUpXHJcbiAgLy8gcmVtb3ZlIHRoZSBmaXJzdCBwcm90b3R5cGUgbm9kZSBcclxuICBub2RlLm5leHRTaWJsaW5nLnJlbW92ZSgpXHJcblxyXG4gIGlmKHRoaXNbbW9kZWxdICE9PSB1bmRlZmluZWQgJiYgdGhpc1ttb2RlbF0uaGFzT3duUHJvcGVydHkoJ2xpc3QnKSl7XHJcbiAgICBwYXJlbnROb2RlID0gbm9kZS5wYXJlbnROb2RlXHJcbiAgICBpZihub2RlLm5leHRTaWJsaW5nKXtcclxuICAgICAgbm9kZS5uZXh0U2libGluZy5yZW1vdmUoKSAvLyByZW1vdmUgdGhlIHRleHQgdGFnIGZvciBtb2RlbEVuZFxyXG4gICAgfSBlbHNlIHtcclxuICAgICAgYXNzZXJ0KGZhbHNlLCAnTW9kZWwgXCJ7ey9tb2RlbDonK21vZGVsKyd9fVwiIGVuY2xvc2luZyB0YWcgZG9lcyBub3QgZXhpc3QuJylcclxuICAgIH1cclxuICAgIG5vZGUucmVtb3ZlKCkgLy8gcmVtb3ZlIHRoZSB0ZXh0IGZvciBtb2RlbCBzdGFydCB0YWdcclxuICAgIFxyXG4gICAgbW9kZWxMaXN0ID0gdGhpc1ttb2RlbF0ubGlzdFxyXG4gICAgbUxlbmd0aCA9IG1vZGVsTGlzdC5sZW5ndGhcclxuICAgIGkgPSAwXHJcbiAgICB3aGlsZShpIDwgbUxlbmd0aCl7XHJcbiAgICAgIGxpc3RDbG9uZSA9IGxpc3QuY2xvbmVOb2RlKHRydWUpXHJcbiAgICAgIHRtcGxIYW5kbGVyKHRoaXMsIG51bGwsIGxpc3RDbG9uZSwgbW9kZWxMaXN0W2ldKVxyXG4gICAgICBwYXJlbnROb2RlLmluc2VydEJlZm9yZShsaXN0Q2xvbmUsIG51bGwpXHJcbiAgICAgIGkrK1xyXG4gICAgfSBcclxuICB9IGVsc2Uge1xyXG4gICAgYXNzZXJ0KGZhbHNlLCAnTW9kZWwgXCInK21vZGVsKydcIiBkb2VzIG5vdCBleGlzdC4nKVxyXG4gIH1cclxufVxyXG4iLCJ2YXIgc2V0U3RhdGUgPSByZXF1aXJlKCcuL2dlbkVsZW1lbnQnKS5zZXRTdGF0ZVxyXG52YXIgdG1wbEhhbmRsZXIgPSByZXF1aXJlKCcuL3RtcGxIYW5kbGVyJylcclxudmFyIHByb2Nlc3NFdmVudCA9IHJlcXVpcmUoJy4vcHJvY2Vzc0V2ZW50JylcclxudmFyIGdldElkID0gcmVxdWlyZSgnLi4vdXRpbHMnKS5nZXRJZFxyXG52YXIgdGVzdEV2ZW50ID0gcmVxdWlyZSgnLi4vdXRpbHMnKS50ZXN0RXZlbnRcclxudmFyIGNvbXBvbmVudFBhcnNlID0gcmVxdWlyZSgnLi9jb21wb25lbnRQYXJzZScpXHJcbi8vIHZhciBtb2RlbFBhcnNlID0gcmVxdWlyZSgnLi9tb2RlbFBhcnNlJylcclxuLy8gdmFyIG5vZGVzVmlzaWJpbGl0eSA9IHJlcXVpcmUoJy4vbm9kZXNWaXNpYmlsaXR5JylcclxudmFyIGNoZWNrTm9kZUF2YWlsYWJpbGl0eSA9IHJlcXVpcmUoJy4uL3V0aWxzJykuY2hlY2tOb2RlQXZhaWxhYmlsaXR5XHJcbnZhciBhZGRTdGF0ZSA9ICByZXF1aXJlKCcuL2dlbkVsZW1lbnQnKS5hZGRTdGF0ZVxyXG52YXIgYXNzZXJ0ID0gcmVxdWlyZSgnLi4vdXRpbHMnKS5hc3NlcnRcclxuXHJcbnZhciByZW5kZXJTdWIgPSBmdW5jdGlvbiAoYywgY05hbWUsIG5vZGUpIHtcclxuICBjLnN0dWJSZW5kZXIodGhpcy5fX2NvbXBvbmVudFN0dWJfX1tjTmFtZV0sIG5vZGUpXHJcbn1cclxuXHJcbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24gKHN0dWIpIHtcclxuXHJcbiAgLy8gdGhpcy5fX3N0YXRlTGlzdF9fID0gdGhpcy5fX3N0YXRlTGlzdF9fIHx8IFtdXHJcbiAgLy8gdGhpcy5fX21vZGVsTGlzdF9fID0gdGhpcy5fX21vZGVsTGlzdF9fIHx8IFtdXHJcbiAgLy8gdGhpcy5fX2NvbXBvbmVudExpc3RfXyA9IHRoaXMuX19jb21wb25lbnRMaXN0X18gfHwgW11cclxuICAvLyB0aGlzLl9fY29tcG9uZW50U3R1Yl9fID0gdGhpcy5fX2NvbXBvbmVudFN0dWJfXyB8fCB7fVxyXG4gIHRtcGxIYW5kbGVyKHRoaXMsIGFkZFN0YXRlKVxyXG5cclxuICB2YXIgZWwgPSBnZXRJZCh0aGlzLmVsKVxyXG5cclxuICBpZihlbCl7XHJcbiAgICAvLyBsaXN0ZW4gdG8gc3RhdGUgY2hhbmdlc1xyXG4gICAgc2V0U3RhdGUuY2FsbCh0aGlzKVxyXG4gICAgLy8gbW91bnQgZnJhZ21lbnQgdG8gRE9NXHJcbiAgICBlbC5hcHBlbmRDaGlsZCh0aGlzLmJhc2UpXHJcbiAgICAvLyBzaW5jZSBjb21wb25lbnQgYWxyZWFkeSByZW5kZXJlZCwgdHJpZ2dlciBpdHMgbGlmZS1jeWNsZSBtZXRob2RcclxuICAgIGlmICh0aGlzLmNvbXBvbmVudERpZE1vdW50ICYmIHR5cGVvZiB0aGlzLmNvbXBvbmVudERpZE1vdW50ID09PSAnZnVuY3Rpb24nKSB7XHJcbiAgICAgIHRoaXMuY29tcG9uZW50RGlkTW91bnQoKVxyXG4gICAgfVxyXG4gIH0gZWxzZSB7XHJcbiAgICBhc3NlcnQoZmFsc2UsICdObyBlbGVtZW50IHdpdGggaWQ6IFwiJyArIHRoaXMuZWwgKyAnXCIgZXhpc3QuJylcclxuICB9XHJcbiAgcmV0dXJuIFxyXG4gIC8vIHRwbCA9IHRtcGxIYW5kbGVyLmNhbGwodGhpcywgZnVuY3Rpb24gKHN0YXRlKSB7XHJcbiAgLy8gICBpZiAoIX5zZWxmLl9fc3RhdGVMaXN0X18uaW5kZXhPZihzdGF0ZSkpIHNlbGYuX19zdGF0ZUxpc3RfXyA9IHNlbGYuX19zdGF0ZUxpc3RfXy5jb25jYXQoc3RhdGUpXHJcbiAgLy8gfSlcclxuICAvLyB0cGwgPSBjb21wb25lbnRQYXJzZS5jYWxsKHRoaXMsIHRwbClcclxuICAvLyB0cGwgPSBtb2RlbFBhcnNlLmNhbGwodGhpcywgdHBsKVxyXG4gIC8vIHRwbCA9IG5vZGVzVmlzaWJpbGl0eS5jYWxsKHRoaXMsIHRwbClcclxuICBpZiAoc3R1Yikge1xyXG4gICAgcmV0dXJuIHRwbFxyXG4gIH0gZWxzZSB7XHJcbiAgICBlbCA9IGdldElkKHRoaXMuZWwpXHJcbiAgICBpZiAoZWwpIHtcclxuICAgICAgZWwuaW5uZXJIVE1MID0gdHBsXHJcbiAgICAgIC8vIHRoaXMuX19jb21wb25lbnRMaXN0X18ubWFwKGZ1bmN0aW9uIChjb21wb25lbnROYW1lKSB7XHJcbiAgICAgIC8vICAgdmFyIGNvbXBvbmVudCA9IHNlbGZbY29tcG9uZW50TmFtZV1cclxuICAgICAgLy8gICBpZiAoY29tcG9uZW50KSB7XHJcbiAgICAgIC8vICAgICAvLyBkbyBpbml0aWFsIGNoZWNraW5nIG9mIHRoZSBub2RlIGF2YWlsYWJpbGl0eVxyXG4gICAgICAvLyAgICAgdmFyIG5vZGUgPSBjaGVja05vZGVBdmFpbGFiaWxpdHkoY29tcG9uZW50LCBjb21wb25lbnROYW1lLCByZW5kZXJTdWIuYmluZChzZWxmKSlcclxuICAgICAgLy8gICAgIGlmIChub2RlKSByZW5kZXJTdWIuY2FsbChzZWxmLCBjb21wb25lbnQsIGNvbXBvbmVudE5hbWUsIG5vZGUpXHJcbiAgICAgIC8vICAgfVxyXG4gICAgICAvLyB9KVxyXG4gICAgICBzZXRTdGF0ZS5jYWxsKHRoaXMpXHJcbiAgICAgIHRlc3RFdmVudCh0cGwpICYmIHByb2Nlc3NFdmVudC5jYWxsKHRoaXMsIGVsKVxyXG5cclxuICAgICAgLy8gc2luY2UgY29tcG9uZW50IGFscmVhZHkgcmVuZGVyZWQsIHRyaWdnZXIgaXRzIGxpZmUtY3ljbGUgbWV0aG9kXHJcbiAgICAgIGlmICh0aGlzLmNvbXBvbmVudERpZE1vdW50ICYmIHR5cGVvZiB0aGlzLmNvbXBvbmVudERpZE1vdW50ID09PSAnZnVuY3Rpb24nKSB7XHJcbiAgICAgICAgdGhpcy5jb21wb25lbnREaWRNb3VudCgpXHJcbiAgICAgIH1cclxuICAgIH1cclxuICB9XHJcbiAgXHJcbn1cclxuIiwidmFyIGxvb3BDaGlsZHMgPSByZXF1aXJlKCcuLi91dGlscycpLmxvb3BDaGlsZHNcclxuXHJcbnZhciBuZXh0ID0gZnVuY3Rpb24gKGksIGMsIHJlbSkge1xyXG4gIHZhciBoYXNrXHJcbiAgdmFyIGV2dE5hbWVcclxuICB2YXIgaGFuZGxlclxyXG4gIHZhciBoYW5kbGVyQXJnc1xyXG4gIHZhciBpc0hhbmRsZXJcclxuICB2YXIgYXJndlxyXG4gIHZhciB2XHJcbiAgdmFyIGhcclxuICB2YXIgYXR0cyA9IGMuYXR0cmlidXRlc1xyXG5cclxuICBpZiAoaSA8IGF0dHMubGVuZ3RoKSB7XHJcbiAgICBoYXNrID0gL15rLS8udGVzdChhdHRzW2ldLm5vZGVOYW1lKVxyXG4gICAgaWYgKGhhc2spIHtcclxuICAgICAgZXZ0TmFtZSA9IGF0dHNbaV0ubm9kZU5hbWUucmVwbGFjZSgvXlteLV0rLS8sICcnKVxyXG4gICAgICBoYW5kbGVyID0gYXR0c1tpXS5ub2RlVmFsdWUubWF0Y2goL1thLXpBLVpdKyg/IVteKF0qXFwpKS8pWzBdXHJcbiAgICAgIGggPSBhdHRzW2ldLm5vZGVWYWx1ZS5tYXRjaCgvXFwoKFtee31dKylcXCkvKVxyXG4gICAgICBoYW5kbGVyQXJncyA9IGggPyBoWzFdIDogJydcclxuICAgICAgaXNIYW5kbGVyID0gdGhpc1toYW5kbGVyXVxyXG4gICAgICBpZiAodHlwZW9mIGlzSGFuZGxlciA9PT0gJ2Z1bmN0aW9uJykge1xyXG4gICAgICAgIHJlbS5wdXNoKGF0dHNbaV0ubm9kZU5hbWUpXHJcbiAgICAgICAgYXJndiA9IFtdXHJcbiAgICAgICAgdiA9IGhhbmRsZXJBcmdzLnNwbGl0KCcsJykuZmlsdGVyKGZ1bmN0aW9uIChmKSB7IHJldHVybiBmICE9PSAnJyB9KVxyXG4gICAgICAgIGlmICh2Lmxlbmd0aCkgdi5tYXAoZnVuY3Rpb24gKHYpIHsgYXJndi5wdXNoKHYpIH0pXHJcbiAgICAgICAgYy5hZGRFdmVudExpc3RlbmVyKGV2dE5hbWUsIGlzSGFuZGxlci5iaW5kLmFwcGx5KGlzSGFuZGxlci5iaW5kKHRoaXMpLCBbY10uY29uY2F0KGFyZ3YpKSwgZmFsc2UpXHJcbiAgICAgIH1cclxuICAgIH1cclxuICAgIGkrK1xyXG4gICAgbmV4dC5hcHBseSh0aGlzLCBbIGksIGMsIHJlbSBdKVxyXG4gIH0gZWxzZSB7XHJcbiAgICByZW0ubWFwKGZ1bmN0aW9uIChmKSB7IGMucmVtb3ZlQXR0cmlidXRlKGYpIH0pXHJcbiAgfVxyXG59XHJcblxyXG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uIChrTm9kZSkge1xyXG4gIHZhciBzZWxmID0gdGhpc1xyXG4gIHZhciBsaXN0S25vZGVDaGlsZCA9IFtdXHJcbiAgdmFyIHJlbSA9IFtdXHJcbiAgbG9vcENoaWxkcyhsaXN0S25vZGVDaGlsZCwga05vZGUpXHJcbiAgbGlzdEtub2RlQ2hpbGQubWFwKGZ1bmN0aW9uIChjKSB7XHJcbiAgICBpZiAoYy5ub2RlVHlwZSA9PT0gMSAmJiBjLmhhc0F0dHJpYnV0ZXMoKSkge1xyXG4gICAgICBuZXh0LmFwcGx5KHNlbGYsIFsgMCwgYywgcmVtIF0pXHJcbiAgICB9XHJcbiAgfSlcclxuICBsaXN0S25vZGVDaGlsZCA9IFtdXHJcbn1cclxuIiwibW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbiAoc3RyKSB7XHJcbiAgdmFyIHJlcyA9IHN0ci5tYXRjaCgvXFwuKlxcLi9nKVxyXG4gIHZhciByZXN1bHRcclxuICBpZiAocmVzICYmIHJlcy5sZW5ndGggPiAwKSB7XHJcbiAgICByZXR1cm4gc3RyLnNwbGl0KCcuJylcclxuICB9XHJcbiAgcmV0dXJuIHJlc3VsdFxyXG59XHJcbiIsIi8vIGZ1bmN0aW9uIHRvIHJlc29sdmUgdGVybmFyeSBvcGVyYXRpb25cclxuXHJcbmZ1bmN0aW9uIHRlc3QgKHN0cikge1xyXG4gIGlmIChzdHIgPT09ICdcXCdcXCcnIHx8IHN0ciA9PT0gJ1wiXCInIHx8IHN0ciA9PT0gJ251bGwnKSB7IHJldHVybiAnJyB9XHJcbiAgcmV0dXJuIHN0clxyXG59XHJcblxyXG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uIChpbnB1dCkge1xyXG4gIGlmIChpbnB1dC5tYXRjaCgvKFteP10qKVxcPyhbXjpdKik6KFteO10qKXwoXFxzKj1cXHMqKVteO10qL2cpKSB7XHJcbiAgICB2YXIgdCA9IGlucHV0LnNwbGl0KCc/JylcclxuICAgIHZhciBjb25kaXRpb24gPSB0WzBdXHJcbiAgICB2YXIgbGVmdEhhbmQgPSB0WzFdLnNwbGl0KCc6JylbMF1cclxuICAgIHZhciByaWdodEhhbmQgPSB0WzFdLnNwbGl0KCc6JylbMV1cclxuXHJcbiAgICAvLyBjaGVjayB0aGUgY29uZGl0aW9uIGZ1bGZpbGxtZW50XHJcbiAgICAvLyBjb25zb2xlLmxvZyh0aGlzKVxyXG4gICAgaWYgKHRoaXNbY29uZGl0aW9uXSkge1xyXG4gICAgICByZXR1cm4ge1xyXG4gICAgICAgIHZhbHVlOiB0ZXN0KGxlZnRIYW5kKSxcclxuICAgICAgICBzdGF0ZTogY29uZGl0aW9uXHJcbiAgICAgIH1cclxuICAgIH0gZWxzZSB7XHJcbiAgICAgIHJldHVybiB7XHJcbiAgICAgICAgdmFsdWU6IHRlc3QocmlnaHRIYW5kKSxcclxuICAgICAgICBzdGF0ZTogY29uZGl0aW9uXHJcbiAgICAgIH1cclxuICAgIH1cclxuICB9IGVsc2UgcmV0dXJuIGZhbHNlXHJcbn1cclxuIiwidmFyIHN0ckludGVycHJldGVyID0gcmVxdWlyZSgnLi9zdHJJbnRlcnByZXRlcicpXHJcbnZhciB0ZXJuYXJ5T3BzID0gcmVxdWlyZSgnLi90ZXJuYXJ5T3BzJylcclxudmFyIGdldElkID0gcmVxdWlyZSgnLi4vdXRpbHMnKS5nZXRJZFxyXG52YXIgZ2VuTW9kZWxMaXN0ID0gcmVxdWlyZSgnLi9nZW5Nb2RlbExpc3QnKVxyXG52YXIgY29uZGl0aW9uYWxOb2RlcyA9IHJlcXVpcmUoJy4vY29uZGl0aW9uYWxOb2RlcycpXHJcblxyXG52YXIgRE9DVU1FTlRfRlJBR01FTlRfVFlQRSA9IDExXHJcbnZhciBET0NVTUVOVF9URVhUX1RZUEUgPSAzXHJcbnZhciBET0NVTUVOVF9FTEVNRU5UX1RZUEUgPSAxXHJcbnZhciBET0NVTUVOVF9DT01NRU5UX1RZUEUgPSA4XHJcbnZhciBET0NVTUVOVF9BVFRSSUJVVEVfVFlQRSA9IDJcclxuXHJcbnZhciByZSA9IC97eyhbXnt9XSspfX0vZ1xyXG5cclxudmFyIG1vZGVsID0gL15tb2RlbDovZ1xyXG52YXIgbW9kZWxSYXcgPSAvXlxce1xce21vZGVsOihbXnt9XSspXFx9XFx9L2dcclxuXHJcbnZhciBjb25kaXRpb25hbFJlID0gL15cXD8vZ1xyXG5cclxudmFyIHRvU2tpcFN0b3JlID0gW11cclxudmFyIHNraXBOb2RlID0gW11cclxuXHJcbnZhciB0bXBsaGFuZGxlciA9IGZ1bmN0aW9uIChjdHgsIHVwZGF0ZVN0YXRlTGlzdCwgbW9kZWxJbnN0YW5jZSwgbW9kZWxPYmplY3QsIGNvbmRpdGlvbmFsKSB7XHJcblxyXG4gIHZhciBjdXJyZW50Tm9kZVxyXG4gIHZhciBzdHJcclxuICB2YXIgdmFsIFxyXG4gIHZhciB0eXBlXHJcbiAgdmFyIGxuIFxyXG4gIHZhciBwcm9wcyBcclxuICB2YXIgcmVwXHJcbiAgdmFyIGZyYWdtZW50XHJcbiAgdmFyIGluc3RhbmNlXHJcbiAgdmFyIG5vZGVBdHRyaWJ1dGVzXHJcbiAgdmFyIGkgPSAwXHJcbiAgdmFyIGFcclxuICB2YXIgbnNcclxuICB2YXIgZXZ0TmFtZVxyXG4gIHZhciBjXHJcbiAgdmFyIGhcclxuICB2YXIgaGFuZGxlckFyZ3NcclxuICB2YXIgYXJndlxyXG4gIHZhciBoYW5kbGVyXHJcbiAgdmFyIHRuciBcclxuICB2YXIgbW9kZWxSZXBcclxuICB2YXIgY29uZGl0aW9uYWxSZXBcclxuICB2YXIgZm4gXHJcbiAgdmFyIGVsXHJcbiAgdmFyIGlzTW9kZWxDb25zdHJ1Y3QgPSBmYWxzZVxyXG4gIHZhciBpZHhcclxuICB2YXIgcmVtID0gW11cclxuICB2YXIgaXNPYmplY3ROb3RhdGlvblxyXG5cclxuICBpZihtb2RlbE9iamVjdCl7XHJcbiAgICBpbnN0YW5jZSA9IG1vZGVsSW5zdGFuY2VcclxuICAgIGlzTW9kZWxDb25zdHJ1Y3QgPSB0cnVlXHJcbiAgfSBlbHNlIGlmKGNvbmRpdGlvbmFsKXtcclxuICAgIGluc3RhbmNlID0gY29uZGl0aW9uYWwuZmlyc3RDaGlsZFxyXG4gIH0gZWxzZSB7XHJcbiAgICBmcmFnbWVudCA9IGN0eC5iYXNlXHJcbiAgICBpbnN0YW5jZSA9IGZyYWdtZW50LmZpcnN0Q2hpbGRcclxuICB9XHJcblxyXG4gIHZhciBpbnMgPSBtb2RlbE9iamVjdCB8fCBjdHhcclxuXHJcbiAgZnVuY3Rpb24gdXBkYXRlU3RhdGUoc3RhdGUpe1xyXG4gICAgaWYodHlwZW9mIHVwZGF0ZVN0YXRlTGlzdCA9PT0gJ2Z1bmN0aW9uJyl7XHJcbiAgICAgIHVwZGF0ZVN0YXRlTGlzdChzdGF0ZSlcclxuICAgIH1cclxuICB9XHJcblxyXG4gIGZ1bmN0aW9uIHJlcGxhY2VIYW5kbGVCYXJzKHZhbHVlLCBub2RlKSB7XHJcbiAgICBwcm9wcyA9IHZhbHVlLm1hdGNoKHJlKVxyXG4gICAgbG4gPSBwcm9wcy5sZW5ndGhcclxuICAgIHdoaWxlIChsbikge1xyXG4gICAgICBsbi0tXHJcbiAgICAgIHJlcCA9IHByb3BzW2xuXS5yZXBsYWNlKHJlLCAnJDEnKVxyXG4gICAgICB0bnIgPSB0ZXJuYXJ5T3BzLmNhbGwoaW5zLCByZXApXHJcbiAgICAgIGlzT2JqZWN0Tm90YXRpb24gPSBzdHJJbnRlcnByZXRlcihyZXApXHJcbiAgICAgIGlmKGlzT2JqZWN0Tm90YXRpb24pe1xyXG4gICAgICAgIHVwZGF0ZVN0YXRlKHJlcClcclxuICAgICAgICB2YWx1ZSA9IHZhbHVlLnJlcGxhY2UoJ3t7JyArIHJlcCArICd9fScsIGluc1tpc09iamVjdE5vdGF0aW9uWzBdXVtpc09iamVjdE5vdGF0aW9uWzFdXSlcclxuICAgICAgfSBlbHNlIHtcclxuICAgICAgICBpZih0bnIpe1xyXG4gICAgICAgICAgdXBkYXRlU3RhdGUodG5yLnN0YXRlKVxyXG4gICAgICAgICAgdmFsdWUgPSB2YWx1ZS5yZXBsYWNlKCd7eycrcmVwKyd9fScsIHRuci52YWx1ZSlcclxuICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgaWYocmVwLm1hdGNoKG1vZGVsKSl7XHJcbiAgICAgICAgICAgIG1vZGVsUmVwID0gcmVwLnJlcGxhY2UoJ21vZGVsOicsICcnKVxyXG4gICAgICAgICAgICAvLyBnZW5lcmF0ZSBsaXN0IG1vZGVsXHJcbiAgICAgICAgICAgIC8vIGVuc3VyZSBub3QgdG8gc3RheSBpbnNpZGUgdGhlIGxvb3AgZm9yZXZlclxyXG4gICAgICAgICAgICBpZighaXNNb2RlbENvbnN0cnVjdCl7XHJcbiAgICAgICAgICAgICAgZ2VuTW9kZWxMaXN0LmNhbGwoY3R4LCBub2RlLCBtb2RlbFJlcCwgdG1wbGhhbmRsZXIpXHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgIH0gZWxzZSBpZihyZXAubWF0Y2goY29uZGl0aW9uYWxSZSkpe1xyXG4gICAgICAgICAgICBjb25kaXRpb25hbFJlcCA9IHJlcC5yZXBsYWNlKCc/JywgJycpXHJcbiAgICAgICAgICAgIGlmKGluc1tjb25kaXRpb25hbFJlcF0gIT09IHVuZGVmaW5lZCl7XHJcbiAgICAgICAgICAgICAgdXBkYXRlU3RhdGUoY29uZGl0aW9uYWxSZXApXHJcbiAgICAgICAgICAgICAgaWYoIWNvbmRpdGlvbmFsKXtcclxuICAgICAgICAgICAgICAgIGNvbmRpdGlvbmFsTm9kZXMuY2FsbChjdHgsIG5vZGUsIGNvbmRpdGlvbmFsUmVwLCB0bXBsaGFuZGxlcilcclxuICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgLy8gcHJvY2Vzc0NvbmRpdGlvbmFsTm9kZXMobm9kZSwgaW5zW2NvbmRpdGlvbmFsUmVwXSwgY29uZGl0aW9uYWxSZXApXHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgIGlmKGluc1tyZXBdICE9PSB1bmRlZmluZWQpe1xyXG4gICAgICAgICAgICAgIHVwZGF0ZVN0YXRlKHJlcClcclxuICAgICAgICAgICAgICB2YWx1ZSA9IHZhbHVlLnJlcGxhY2UoJ3t7JytyZXArJ319JywgaW5zW3JlcF0pXHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgIH1cclxuICAgICAgICB9XHJcbiAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICByZXR1cm4gdmFsdWVcclxuICB9XHJcblxyXG4gIGZ1bmN0aW9uIGluc3BlY3Qobm9kZSl7XHJcbiAgICAvLyBjb25zb2xlLmxvZyhub2RlKVxyXG4gICAgdHlwZSA9IG5vZGUubm9kZVR5cGVcclxuICAgIHZhbCA9IG5vZGUubm9kZVZhbHVlXHJcbiAgICBpZih2YWwubWF0Y2gocmUpKXtcclxuICAgICAgdmFsID0gcmVwbGFjZUhhbmRsZUJhcnModmFsLCBub2RlKVxyXG4gICAgICBub2RlLm5vZGVWYWx1ZSA9IHZhbFxyXG4gICAgfVxyXG4gIH1cclxuXHJcbiAgZnVuY3Rpb24gaW5zcGVjdEF0dHJpYnV0ZXMobm9kZSl7XHJcbiAgICBub2RlQXR0cmlidXRlcyA9IG5vZGUuYXR0cmlidXRlc1xyXG4gICAgZm9yIChpID0gbm9kZUF0dHJpYnV0ZXMubGVuZ3RoOyBpLS07KSB7XHJcbiAgICAgIGEgPSBub2RlQXR0cmlidXRlc1tpXVxyXG4gICAgICBuYW1lID0gYS5sb2NhbE5hbWVcclxuICAgICAgbnMgPSBhLm5vZGVWYWx1ZVxyXG4gICAgICBpZiAocmUudGVzdChuYW1lKSkge1xyXG4gICAgICAgIGNvbnNvbGUubG9nKG5hbWUsIG5zKVxyXG4gICAgICAgIG5vZGUucmVtb3ZlQXR0cmlidXRlKG5hbWUpXHJcbiAgICAgICAgdmFyIHRlbXAgPSBuYW1lXHJcbiAgICAgICAgbmFtZSA9IHJlcGxhY2VIYW5kbGVCYXJzKG5hbWUpXHJcbiAgICAgICAgbm9kZS5zZXRBdHRyaWJ1dGUobmFtZSwgbnMpXHJcbiAgICAgIH0gZWxzZSBpZihyZS50ZXN0KG5zKSl7XHJcbiAgICAgICAgbnMgPSByZXBsYWNlSGFuZGxlQmFycyhucylcclxuICAgICAgICBpZihucyA9PT0gJycpe1xyXG4gICAgICAgICAgbm9kZS5yZW1vdmVBdHRyaWJ1dGUobmFtZSlcclxuICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgaWYobmFtZSA9PT0gJ2NoZWNrZWQnKXtcclxuICAgICAgICAgICAgbm9kZS5zZXRBdHRyaWJ1dGUobmFtZSwgJycpXHJcbiAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICBub2RlLnNldEF0dHJpYnV0ZShuYW1lLCBucylcclxuICAgICAgICAgIH1cclxuICAgICAgICB9XHJcbiAgICAgIH1cclxuICAgIH1cclxuICB9XHJcblxyXG4gIGZ1bmN0aW9uIGxvb2tVcEV2dE5vZGUobm9kZSl7XHJcbiAgICBpZihub2RlLmhhc0F0dHJpYnV0ZSgnaWQnKSl7XHJcbiAgICAgIGlkeCA9IHNraXBOb2RlLmluZGV4T2Yobm9kZS5pZClcclxuICAgICAgaWYofmlkeCl7XHJcbiAgICAgICAgcmV0dXJuIHRydWVcclxuICAgICAgfSBlbHNlIHtcclxuICAgICAgICByZXR1cm4gZmFsc2VcclxuICAgICAgfVxyXG4gICAgfVxyXG4gIH1cclxuXHJcbiAgZnVuY3Rpb24gYWRkVG9Ta2lwTm9kZShzdG9yZSwgbm9kZUlkKXtcclxuICAgIGlkeCA9IHN0b3JlLmluZGV4T2Yobm9kZUlkKVxyXG4gICAgaWYoIX5pZHgpe1xyXG4gICAgICBzdG9yZS5wdXNoKG5vZGVJZClcclxuICAgIH1cclxuICB9XHJcblxyXG4gIGZ1bmN0aW9uIGxvb2t1cFBhcmVudE5vZGUocm9vdE5vZGUsIG5vZGUsIGFyZ3Ype1xyXG4gICAgd2hpbGUobm9kZSl7XHJcbiAgICAgIGlmKG5vZGUuY2xhc3NOYW1lKXtcclxuICAgICAgICBhcmd2LnB1c2gobm9kZS5jbGFzc05hbWUpXHJcbiAgICAgIH1cclxuICAgICAgaWYobm9kZS5pZCl7XHJcbiAgICAgICAgYXJndi5wdXNoKG5vZGUuaWQpXHJcbiAgICAgIH1cclxuICAgICAgbm9kZSA9IG5vZGUucGFyZW50Tm9kZVxyXG4gICAgICBpZihub2RlLmlzRXF1YWxOb2RlKHJvb3ROb2RlKSl7XHJcbiAgICAgICAgbm9kZSA9IG51bGxcclxuICAgICAgfVxyXG4gICAgfVxyXG4gICAgcmV0dXJuIGFyZ3ZcclxuICB9XHJcblxyXG4gIGZ1bmN0aW9uIGFkZEV2ZW50KG5vZGUpe1xyXG4gICAgbm9kZUF0dHJpYnV0ZXMgPSBub2RlLmF0dHJpYnV0ZXNcclxuICAgIGlmKG5vZGUgJiYgbG9va1VwRXZ0Tm9kZShub2RlKSkge1xyXG4gICAgICAvLyBza2lwIGFkZGRpbmcgZXZlbnQgZm9yIG5vZGUgdGhhdCBhbHJlYWR5IGhhcyBldmVudFxyXG4gICAgICAvLyB0byBhbGxvdyBza2lwcGluZyBhZGRpbmcgZXZlbnQgdGhlIG5vZGUgbXVzdCBpbmNsdWRlIGBpZGAvXHJcbiAgICAgIC8vIGNvbnNvbGUubG9nKG5vZGUsICdoYXMgZXZ0JylcclxuICAgIH0gZWxzZSB7XHJcbiAgICAgIC8vIG9ubHkgYWRkIGV2ZW50IHdoZW4gbm9kZSBkb2VzIG5vdCBoYXMgb25lXHJcbiAgICAgIC8vIGNvbnNvbGUubG9nKG5vZGUsICdhZGRpbmcgZXZ0JylcclxuICAgICAgZm9yIChpID0gbm9kZUF0dHJpYnV0ZXMubGVuZ3RoOyBpLS07KSB7XHJcbiAgICAgICAgYSA9IG5vZGVBdHRyaWJ1dGVzW2ldXHJcbiAgICAgICAgbmFtZSA9IGEubG9jYWxOYW1lXHJcbiAgICAgICAgbnMgPSBhLm5vZGVWYWx1ZVxyXG4gICAgICAgIGlmICgvXmstLy50ZXN0KG5hbWUpKSB7XHJcbiAgICAgICAgICBldnROYW1lID0gbmFtZS5yZXBsYWNlKC9eay0vLCAnJylcclxuICAgICAgICAgIGhhbmRsZXIgPSBucy5tYXRjaCgvW2EtekEtWl0rKD8hW14oXSpcXCkpLylbMF1cclxuICAgICAgICAgIGMgPSBjdHhbaGFuZGxlcl1cclxuICAgICAgICAgIGlmKGMgIT09IHVuZGVmaW5lZCAmJiB0eXBlb2YgYyA9PT0gJ2Z1bmN0aW9uJyl7XHJcbiAgICAgICAgICAgIGggPSBucy5tYXRjaCgvXFwoKFtee31dKylcXCkvKVxyXG4gICAgICAgICAgICBoYW5kbGVyQXJncyA9IGggPyBoWzFdIDogJydcclxuICAgICAgICAgICAgYXJndiA9IGhhbmRsZXJBcmdzLnNwbGl0KCcsJykuZmlsdGVyKGZ1bmN0aW9uKGYpe1xyXG4gICAgICAgICAgICAgIHJldHVybiBmICE9PSAnJ1xyXG4gICAgICAgICAgICB9KVxyXG4gICAgICAgICAgICByZW0ucHVzaChuYW1lKVxyXG4gICAgICAgICAgICBmbiA9IGZ1bmN0aW9uKGUpe1xyXG4gICAgICAgICAgICAgIGlmIChlLnRhcmdldCAhPT0gZS5jdXJyZW50VGFyZ2V0KSB7XHJcbiAgICAgICAgICAgICAgICBhcmd2ID0gbG9va3VwUGFyZW50Tm9kZShub2RlLCBlLnRhcmdldCwgW10pXHJcbiAgICAgICAgICAgICAgICBjLmFwcGx5KGN0eCwgYXJndi5jb25jYXQoZSkpXHJcbiAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgIGUuc3RvcFByb3BhZ2F0aW9uKClcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAvLyBpZiBub2RlIGlzIHRoZSByb290Tm9kZSBmb3IgbW9kZWwsIHdlIHdyYXAgdGhlIGV2ZW50TGlzdGVuZXIgYW5kXHJcbiAgICAgICAgICAgIC8vIHJlYnVpbGQgdGhlIGFyZ3VtZW50cyBieSBhcHBlbmRpbmcgaWQvY2xhc3NOYW1lIHV0aWwgcm9vdE5vZGUuXHJcbiAgICAgICAgICAgIGlmKG5vZGUuaGFzQ2hpbGROb2RlcygpICYmIG5vZGUuZmlyc3RDaGlsZC5ub2RlVHlwZSA9PT0gRE9DVU1FTlRfVEVYVF9UWVBFICYmIG5vZGUuZmlyc3RDaGlsZC5ub2RlVmFsdWUubWF0Y2gobW9kZWxSYXcpKXtcclxuICAgICAgICAgICAgICBub2RlLmFkZEV2ZW50TGlzdGVuZXIoZXZ0TmFtZSwgZm4sIGZhbHNlKVxyXG4gICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgIG5vZGUuYWRkRXZlbnRMaXN0ZW5lcihldnROYW1lLCBjLmJpbmQuYXBwbHkoYy5iaW5kKGN0eCksIFtub2RlXS5jb25jYXQoYXJndikpLCBmYWxzZSlcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBpZihub2RlLmhhc0F0dHJpYnV0ZSgnaWQnKSl7XHJcbiAgICAgICAgICAgICAgYWRkVG9Ta2lwTm9kZSh0b1NraXBTdG9yZSwgbm9kZS5pZClcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuICAgICAgICBpZihpID09PSAwKXtcclxuICAgICAgICAgIHJlbS5tYXAoZnVuY3Rpb24gKGYpIHsgbm9kZS5yZW1vdmVBdHRyaWJ1dGUoZikgfSlcclxuICAgICAgICB9XHJcbiAgICAgIH1cclxuICAgIH0gXHJcbiAgfVxyXG5cclxuICB2YXIgdFxyXG4gIHZhciBzdGFydCA9IERhdGUubm93KClcclxuXHJcbiAgZnVuY3Rpb24gZW5kKHRpbWUpe1xyXG5cclxuICAgIGlmKHQpIGNsZWFyVGltZW91dCh0KVxyXG5cclxuICAgIHQgPSBzZXRUaW1lb3V0KGZ1bmN0aW9uKCl7XHJcblxyXG4gICAgICB0b1NraXBTdG9yZS5tYXAoZnVuY3Rpb24oc2tpcCl7XHJcbiAgICAgICAgYWRkVG9Ta2lwTm9kZShza2lwTm9kZSwgc2tpcClcclxuICAgICAgICB2YXIgbm9kZSA9IGN0eC5fX3ByaXN0aW5lRnJhZ21lbnRfXy5nZXRFbGVtZW50QnlJZChza2lwKVxyXG4gICAgICAgIGlmKCFub2RlKSByZXR1cm5cclxuICAgICAgICBub2RlQXR0cmlidXRlcyA9IG5vZGUuYXR0cmlidXRlc1xyXG4gICAgICAgIGZvciAoaSA9IG5vZGVBdHRyaWJ1dGVzLmxlbmd0aDsgaS0tOykge1xyXG4gICAgICAgICAgYSA9IG5vZGVBdHRyaWJ1dGVzW2ldXHJcbiAgICAgICAgICBuYW1lID0gYS5sb2NhbE5hbWVcclxuICAgICAgICAgIGlmICgvXmstLy50ZXN0KG5hbWUpKSB7XHJcbiAgICAgICAgICAgIG5vZGUucmVtb3ZlQXR0cmlidXRlKG5hbWUpXHJcbiAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG4gICAgICB9KVxyXG5cclxuICAgICAgLy8gY29uc29sZS5sb2coJ2VuZCcsIHRpbWUpXHJcblxyXG4gICAgfSlcclxuICB9XHJcblxyXG4gIGZ1bmN0aW9uIGNoZWNrKG5vZGUpe1xyXG4gICAgd2hpbGUobm9kZSl7XHJcbiAgICAgIGN1cnJlbnROb2RlID0gbm9kZVxyXG4gICAgICBpZihjdXJyZW50Tm9kZS5ub2RlVHlwZSA9PT0gRE9DVU1FTlRfRUxFTUVOVF9UWVBFKXtcclxuICAgICAgICBpZihjdXJyZW50Tm9kZS5oYXNBdHRyaWJ1dGVzKCkpe1xyXG4gICAgICAgICAgYWRkRXZlbnQoY3VycmVudE5vZGUpXHJcbiAgICAgICAgICBpbnNwZWN0QXR0cmlidXRlcyhjdXJyZW50Tm9kZSlcclxuICAgICAgICB9XHJcbiAgICAgICAgY2hlY2soY3VycmVudE5vZGUuZmlyc3RDaGlsZClcclxuICAgICAgfSBlbHNlIHtcclxuICAgICAgICBpbnNwZWN0KGN1cnJlbnROb2RlKVxyXG4gICAgICB9XHJcbiAgICAgIG5vZGUgPSBub2RlLm5leHRTaWJsaW5nIHx8IGVuZChEYXRlLm5vdygpIC0gc3RhcnQpXHJcbiAgICB9IFxyXG4gIH1cclxuXHJcbiAgY2hlY2soaW5zdGFuY2UpXHJcblxyXG4gIC8vIHJldHVyblxyXG4gIC8vIHZhciBhcnJQcm9wcyA9IHN0ci5tYXRjaCgve3soW157fV0rKX19L2cpXHJcbiAgLy8gaWYgKGFyclByb3BzICYmIGFyclByb3BzLmxlbmd0aCkge1xyXG4gIC8vICAgYXJyUHJvcHMubWFwKGZ1bmN0aW9uIChzKSB7XHJcbiAgLy8gICAgIHZhciByZXAgPSBzLnJlcGxhY2UoL3t7KFtee31dKyl9fS9nLCAnJDEnKVxyXG4gIC8vICAgICB2YXIgaXNPYmplY3ROb3RhdGlvbiA9IHN0ckludGVycHJldGVyKHJlcClcclxuICAvLyAgICAgdmFyIGlzVGVybmFyeSA9IHRlcm5hcnlPcHMuY2FsbChzZWxmLCByZXApXHJcbiAgLy8gICAgIGlmICghaXNPYmplY3ROb3RhdGlvbikge1xyXG4gIC8vICAgICAgIGlmIChzZWxmW3JlcF0gIT09IHVuZGVmaW5lZCkge1xyXG4gIC8vICAgICAgICAgdXBkYXRlU3RhdGVMaXN0KHJlcClcclxuICAvLyAgICAgICAgIHN0ciA9IHN0ci5yZXBsYWNlKCd7eycgKyByZXAgKyAnfX0nLCBzZWxmW3JlcF0pXHJcbiAgLy8gICAgICAgfSBlbHNlIGlmIChpc1Rlcm5hcnkpIHtcclxuICAvLyAgICAgICAgIHVwZGF0ZVN0YXRlTGlzdChpc1Rlcm5hcnkuc3RhdGUpXHJcbiAgLy8gICAgICAgICBzdHIgPSBzdHIucmVwbGFjZSgne3snICsgcmVwICsgJ319JywgaXNUZXJuYXJ5LnZhbHVlKVxyXG4gIC8vICAgICAgIH1cclxuICAvLyAgICAgfSBlbHNlIHtcclxuICAvLyAgICAgICB1cGRhdGVTdGF0ZUxpc3QocmVwKVxyXG4gIC8vICAgICAgIHN0ciA9IHN0ci5yZXBsYWNlKCd7eycgKyByZXAgKyAnfX0nLCBzZWxmW2lzT2JqZWN0Tm90YXRpb25bMF1dW2lzT2JqZWN0Tm90YXRpb25bMV1dKVxyXG4gIC8vICAgICB9XHJcbiAgLy8gICAgIC8vIHJlc29sdmUgbm9kZVZpc2liaWxpdHlcclxuICAvLyAgICAgaWYgKHJlcC5tYXRjaCgvXlxcPy9nKSkge1xyXG4gIC8vICAgICAgIHVwZGF0ZVN0YXRlTGlzdChyZXAucmVwbGFjZSgnPycsICcnKSlcclxuICAvLyAgICAgfVxyXG4gIC8vICAgICAvLyByZXNvbHZlIG1vZGVsXHJcbiAgLy8gICAgIGlmIChyZXAubWF0Y2goL15tb2RlbDovZykpIHtcclxuICAvLyAgICAgICB2YXIgbW9kZWxSZXAgPSByZXAucmVwbGFjZSgnbW9kZWw6JywgJycpXHJcbiAgLy8gICAgICAgaWYgKCF+c2VsZi5fX21vZGVsTGlzdF9fLmluZGV4T2YobW9kZWxSZXApKSB7IHNlbGYuX19tb2RlbExpc3RfXy5wdXNoKG1vZGVsUmVwKSB9XHJcbiAgLy8gICAgIH1cclxuICAvLyAgICAgLy8gcmVzb2x2ZSBjb21wb25lbnRcclxuICAvLyAgICAgaWYgKHJlcC5tYXRjaCgvXmNvbXBvbmVudDovZykpIHtcclxuICAvLyAgICAgICB2YXIgY29tcG9uZW50UmVwID0gcmVwLnJlcGxhY2UoJ2NvbXBvbmVudDonLCAnJylcclxuICAvLyAgICAgICBpZiAoIX5zZWxmLl9fY29tcG9uZW50TGlzdF9fLmluZGV4T2YoY29tcG9uZW50UmVwKSkgeyBzZWxmLl9fY29tcG9uZW50TGlzdF9fLnB1c2goY29tcG9uZW50UmVwKSB9XHJcbiAgLy8gICAgIH1cclxuICAvLyAgIH0pXHJcbiAgLy8gfVxyXG4gIC8vIHJldHVybiBzdHJcclxufVxyXG5cclxubW9kdWxlLmV4cG9ydHMgPSB0bXBsaGFuZGxlclxyXG4iLCIndXNlIHN0cmljdCdcclxuLyoqXHJcbiAqIEtlZXRqcyB2NC4wLjAgQWxwaGEgcmVsZWFzZTogaHR0cHM6Ly9naXRodWIuY29tL2tlZXRqcy9rZWV0LmpzXHJcbiAqIE1pbmltYWxpc3QgdmlldyBsYXllciBmb3IgdGhlIHdlYlxyXG4gKlxyXG4gKiA8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDwgS2VldGpzID4+Pj4+Pj4+Pj4+Pj4+Pj4+Pj4+Pj4+Pj4+Pj4+PlxyXG4gKlxyXG4gKiBDb3B5cmlnaHQgMjAxOCwgU2hhaHJ1bCBOaXphbSBTZWxhbWF0XHJcbiAqIFJlbGVhc2VkIHVuZGVyIHRoZSBNSVQgTGljZW5zZS5cclxuICovXHJcblxyXG52YXIgcGFyc2VTdHIgPSByZXF1aXJlKCcuL2NvbXBvbmVudHMvcGFyc2VTdHInKVxyXG52YXIgc2V0U3RhdGUgPSByZXF1aXJlKCcuL2NvbXBvbmVudHMvZ2VuRWxlbWVudCcpLnNldFN0YXRlXHJcbnZhciBnZW5FbGVtZW50ID0gcmVxdWlyZSgnLi9jb21wb25lbnRzL2dlbkVsZW1lbnQnKS5nZW5FbGVtZW50XHJcbnZhciBjbGVhclN0YXRlID0gcmVxdWlyZSgnLi9jb21wb25lbnRzL2dlbkVsZW1lbnQnKS5jbGVhclN0YXRlXHJcbnZhciBwcm9jZXNzRXZlbnQgPSByZXF1aXJlKCcuL2NvbXBvbmVudHMvcHJvY2Vzc0V2ZW50JylcclxudmFyIGdldElkID0gcmVxdWlyZSgnLi91dGlscycpLmdldElkXHJcbnZhciB0ZXN0RXZlbnQgPSByZXF1aXJlKCcuL3V0aWxzJykudGVzdEV2ZW50XHJcbnZhciBhc3NlcnQgPSByZXF1aXJlKCcuL3V0aWxzJykuYXNzZXJ0XHJcblxyXG52YXIgRE9DVU1FTlRfRlJBR01FTlRfVFlQRSA9IDExXHJcbnZhciBET0NVTUVOVF9URVhUX1RZUEUgPSAzXHJcbnZhciBET0NVTUVOVF9FTEVNRU5UX1RZUEUgPSAxXHJcbnZhciBET0NVTUVOVF9DT01NRU5UX1RZUEUgPSA4XHJcbnZhciBET0NVTUVOVF9BVFRSSUJVVEVfVFlQRSA9IDJcclxuXHJcbi8qKlxyXG4gKiBAZGVzY3JpcHRpb25cclxuICogVGhlIG1haW4gY29uc3RydWN0b3Igb2YgS2VldFxyXG4gKlxyXG4gKiBCYXNpYyBVc2FnZSA6LVxyXG4gKlxyXG4gKiAgICBjb25zdCBBcHAgZXh0ZW5kcyBLZWV0IHt9XHJcbiAqICAgIGNvbnN0IGFwcCA9IG5ldyBBcHAoKVxyXG4gKiAgICBhcHAubW91bnQoJ2hlbGxvIHdvcmxkJykubGluaygnYXBwJylcclxuICpcclxuICovXHJcbmZ1bmN0aW9uIEtlZXQgKCkge31cclxuXHJcbktlZXQucHJvdG90eXBlLm1vdW50ID0gZnVuY3Rpb24gKGluc3RhbmNlKSB7XHJcbiAgdmFyIGJhc2VcclxuICB2YXIgdGVtcERpdlxyXG4gIHZhciBmcmFnID0gZG9jdW1lbnQuY3JlYXRlRG9jdW1lbnRGcmFnbWVudCgpXHJcbiAgLy8gQmVmb3JlIHdlIGJlZ2luIHRvIHBhcnNlIGFuIGluc3RhbmNlLCBkbyBhIHJ1bi1kb3duIGNoZWNrc1xyXG4gIC8vIHRvIGNsZWFuIHVwIGJhY2stdGljayBzdHJpbmcgd2hpY2ggdXN1YWxseSBoYXMgbGluZSBzcGFjaW5nLlxyXG4gIGlmICh0eXBlb2YgaW5zdGFuY2UgPT09ICdzdHJpbmcnKSB7XHJcbiAgICBiYXNlID0gaW5zdGFuY2UudHJpbSgpLnJlcGxhY2UoL1xccysvZywgJyAnKVxyXG4gICAgdGVtcERpdiA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2RpdicpXHJcbiAgICB0ZW1wRGl2LmlubmVySFRNTCA9IGJhc2VcclxuICAgIHdoaWxlICh0ZW1wRGl2LmZpcnN0Q2hpbGQpIHtcclxuICAgICAgZnJhZy5hcHBlbmRDaGlsZCh0ZW1wRGl2LmZpcnN0Q2hpbGQpXHJcbiAgICB9XHJcbiAgLy8gSWYgaW5zdGFuY2UgaXMgYSBodG1sIGVsZW1lbnQgcHJvY2VzcyBhcyBodG1sIGVudGl0aWVzXHJcbiAgfSBlbHNlIGlmICh0eXBlb2YgaW5zdGFuY2UgPT09ICdvYmplY3QnICYmIGluc3RhbmNlWydub2RlVHlwZSddKSB7XHJcbiAgICBpZiAoaW5zdGFuY2VbJ25vZGVUeXBlJ10gPT09IERPQ1VNRU5UX0VMRU1FTlRfVFlQRSkge1xyXG4gICAgICBmcmFnLmFwcGVuZENoaWxkKGluc3RhbmNlKVxyXG4gICAgfSBlbHNlIGlmIChpbnN0YW5jZVsnbm9kZVR5cGUnXSA9PT0gRE9DVU1FTlRfRlJBR01FTlRfVFlQRSkge1xyXG4gICAgICBmcmFnID0gaW5zdGFuY2VcclxuICAgIH0gZWxzZSBpZiAoaW5zdGFuY2VbJ25vZGVUeXBlJ10gPT09IERPQ1VNRU5UX1RFWFRfVFlQRSkge1xyXG4gICAgICBmcmFnLmFwcGVuZENoaWxkKGluc3RhbmNlKVxyXG4gICAgfSBlbHNlIHtcclxuICAgICAgYXNzZXJ0KGZhbHNlLCAnVW5hYmxlIHRvIHBhcnNlIGluc3RhbmNlLCB1bmtub3duIHR5cGUuJylcclxuICAgIH1cclxuICB9IGVsc2Uge1xyXG4gICAgYXNzZXJ0KGZhbHNlLCAnUGFyYW1ldGVyIGlzIG5vdCBhIHN0cmluZyBvciBhIGh0bWwgZWxlbWVudC4nKVxyXG4gIH1cclxuICAvLyB3ZSBzdG9yZSB0aGUgcHJpc3RpbmUgaW5zdGFuY2UgaW4gX19wcmlzdGluZUZyYWdtZW50X19cclxuICB0aGlzLl9fcHJpc3RpbmVGcmFnbWVudF9fID0gZnJhZy5jbG9uZU5vZGUodHJ1ZSlcclxuICB0aGlzLmJhc2UgPSBmcmFnXHJcblxyXG4gIC8vIGNsZWFudXAgc3RhdGVzIG9uIG1vdW50XHJcbiAgY2xlYXJTdGF0ZSgpXHJcblxyXG4gIHJldHVybiB0aGlzXHJcbn1cclxuXHJcbktlZXQucHJvdG90eXBlLmZsdXNoID0gZnVuY3Rpb24gKGluc3RhbmNlKSB7XHJcbiAgLy8gQ3VzdG9tIG1ldGhvZCB0byBjbGVhbiB1cCB0aGUgY29tcG9uZW50IERPTSB0cmVlXHJcbiAgLy8gdXNlZnVsIGlmIHdlIG5lZWQgdG8gZG8gY2xlYW4gdXAgcmVyZW5kZXIuXHJcbiAgdmFyIGVsID0gaW5zdGFuY2UgfHwgdGhpcy5lbFxyXG4gIHZhciBlbGUgPSBnZXRJZChlbClcclxuICBpZiAoZWxlKSBlbGUuaW5uZXJIVE1MID0gJydcclxuICByZXR1cm4gdGhpc1xyXG59XHJcblxyXG5LZWV0LnByb3RvdHlwZS5saW5rID0gZnVuY3Rpb24gKGlkKSB7XHJcbiAgLy8gVGhlIHRhcmdldCBET00gd2hlcmUgdGhlIHJlbmRlcmluZyB3aWxsIHRvb2sgcGxhY2UuXHJcbiAgLy8gV2UgY291bGQgYWxzbyBhcHBseSBsaWZlLWN5Y2xlIG1ldGhvZCBiZWZvcmUgdGhlXHJcbiAgLy8gcmVuZGVyIGhhcHBlbi5cclxuICBpZiAoIWlkKSBhc3NlcnQoaWQsICdObyBpZCBpcyBnaXZlbiBhcyBwYXJhbWV0ZXIuJylcclxuICB0aGlzLmVsID0gaWRcclxuICAvLyBsaWZlLWN5Y2xlIG1ldGhvZCBiZWZvcmUgcmVuZGVyaW5nIHRoZSBjb21wb25lbnRcclxuICBpZiAodGhpcy5jb21wb25lbnRXaWxsTW91bnQgJiYgdHlwZW9mIHRoaXMuY29tcG9uZW50V2lsbE1vdW50ID09PSAnZnVuY3Rpb24nKSB7XHJcbiAgICB0aGlzLmNvbXBvbmVudFdpbGxNb3VudCgpXHJcbiAgfVxyXG4gIHRoaXMucmVuZGVyKClcclxuICByZXR1cm4gdGhpc1xyXG59XHJcblxyXG5LZWV0LnByb3RvdHlwZS5yZW5kZXIgPSBmdW5jdGlvbiAoc3R1Yikge1xyXG4gIGlmIChzdHViKSB7XHJcbiAgICAvLyBsaWZlLWN5Y2xlIG1ldGhvZCBiZWZvcmUgcmVuZGVyaW5nIHRoZSBjb21wb25lbnRcclxuICAgIGlmICghdGhpcy5XSUxMX01PVU5UICYmIHRoaXMuY29tcG9uZW50V2lsbE1vdW50ICYmIHR5cGVvZiB0aGlzLmNvbXBvbmVudFdpbGxNb3VudCA9PT0gJ2Z1bmN0aW9uJykge1xyXG4gICAgICB0aGlzLldJTExfTU9VTlQgPSB0cnVlXHJcbiAgICAgIHRoaXMuY29tcG9uZW50V2lsbE1vdW50KClcclxuICAgIH1cclxuICAgIHJldHVybiBwYXJzZVN0ci5jYWxsKHRoaXMsIHN0dWIpXHJcbiAgfSBlbHNlIHtcclxuICAgIC8vIFJlbmRlciB0aGlzIGNvbXBvbmVudCB0byB0aGUgdGFyZ2V0IERPTVxyXG4gICAgcGFyc2VTdHIuY2FsbCh0aGlzKVxyXG4gICAgcmV0dXJuIHRoaXNcclxuICB9XHJcbn1cclxuXHJcbktlZXQucHJvdG90eXBlLmNsdXN0ZXIgPSBmdW5jdGlvbiAoKSB7XHJcbiAgLy8gQ2hhaW4gbWV0aG9kIHRvIHJ1biBleHRlcm5hbCBmdW5jdGlvbihzKSwgdGhpcyBiYXNpY2FsbHkgc2VydmVcclxuICAvLyBhcyBhbiBpbml0aWFsaXplciBmb3IgYWxsIG5vbiBhdHRhY2hlZCBjaGlsZCBjb21wb25lbnRzIHdpdGhpbiB0aGUgaW5zdGFuY2UgdHJlZVxyXG4gIHZhciBhcmdzID0gW10uc2xpY2UuY2FsbChhcmd1bWVudHMpXHJcbiAgaWYgKGFyZ3MubGVuZ3RoID4gMCkge1xyXG4gICAgYXJncy5tYXAoZnVuY3Rpb24gKGYpIHtcclxuICAgICAgaWYgKHR5cGVvZiBmID09PSAnZnVuY3Rpb24nKSBmKClcclxuICAgIH0pXHJcbiAgfVxyXG59XHJcblxyXG5LZWV0LnByb3RvdHlwZS5zdHViUmVuZGVyID0gZnVuY3Rpb24gKHRwbCwgbm9kZSkge1xyXG4gIC8vIHN1Yi1jb21wb25lbnQgcmVuZGVyaW5nXHJcbiAgc2V0U3RhdGUuY2FsbCh0aGlzKVxyXG4gIHRlc3RFdmVudCh0cGwpICYmIHByb2Nlc3NFdmVudC5jYWxsKHRoaXMsIG5vZGUpXHJcbiAgLy8gc2luY2UgY29tcG9uZW50IGFscmVhZHkgcmVuZGVyZWQsIHRyaWdnZXIgaXRzIGxpZmUtY3ljbGUgbWV0aG9kXHJcbiAgaWYgKCF0aGlzLkRJRF9NT1VOVCAmJiB0aGlzLmNvbXBvbmVudERpZE1vdW50ICYmIHR5cGVvZiB0aGlzLmNvbXBvbmVudERpZE1vdW50ID09PSAnZnVuY3Rpb24nKSB7XHJcbiAgICB0aGlzLkRJRF9NT1VOVCA9IHRydWVcclxuICAgIHRoaXMuY29tcG9uZW50RGlkTW91bnQoKVxyXG4gIH1cclxufVxyXG5cclxudmFyIEJBVENIX0NBTExfUkVRVUVTVCA9IG51bGxcclxuXHJcbktlZXQucHJvdG90eXBlLmNhbGxCYXRjaFBvb2xVcGRhdGUgPSBmdW5jdGlvbiAoKSB7XHJcbiAgLy8gZm9yY2UgY29tcG9uZW50IHRvIHVwZGF0ZSwgaWYgYW55IHN0YXRlIC8gbm9uLXN0YXRlXHJcbiAgLy8gdmFsdWUgY2hhbmdlZCBET00gZGlmZmluZyB3aWxsIG9jY3VyXHJcbiAgdmFyIHNlbGYgPSB0aGlzXHJcbiAgaWYoQkFUQ0hfQ0FMTF9SRVFVRVNUKXtcclxuICAgIGNsZWFyVGltZW91dChCQVRDSF9DQUxMX1JFUVVFU1QpXHJcbiAgfSBcclxuICBCQVRDSF9DQUxMX1JFUVVFU1QgPSBzZXRUaW1lb3V0KGZ1bmN0aW9uKCl7XHJcbiAgICBnZW5FbGVtZW50LmNhbGwoc2VsZiwgdHJ1ZSlcclxuICB9KVxyXG59XHJcblxyXG5tb2R1bGUuZXhwb3J0cyA9IEtlZXRcclxuIiwiJ3VzZSBzdHJpY3QnO1xuXG52YXIgcmFuZ2U7IC8vIENyZWF0ZSBhIHJhbmdlIG9iamVjdCBmb3IgZWZmaWNlbnRseSByZW5kZXJpbmcgc3RyaW5ncyB0byBlbGVtZW50cy5cbnZhciBOU19YSFRNTCA9ICdodHRwOi8vd3d3LnczLm9yZy8xOTk5L3hodG1sJztcblxudmFyIGRvYyA9IHR5cGVvZiBkb2N1bWVudCA9PT0gJ3VuZGVmaW5lZCcgPyB1bmRlZmluZWQgOiBkb2N1bWVudDtcblxudmFyIHRlc3RFbCA9IGRvYyA/XG4gICAgZG9jLmJvZHkgfHwgZG9jLmNyZWF0ZUVsZW1lbnQoJ2RpdicpIDpcbiAgICB7fTtcblxuLy8gRml4ZXMgPGh0dHBzOi8vZ2l0aHViLmNvbS9wYXRyaWNrLXN0ZWVsZS1pZGVtL21vcnBoZG9tL2lzc3Vlcy8zMj5cbi8vIChJRTcrIHN1cHBvcnQpIDw9SUU3IGRvZXMgbm90IHN1cHBvcnQgZWwuaGFzQXR0cmlidXRlKG5hbWUpXG52YXIgYWN0dWFsSGFzQXR0cmlidXRlTlM7XG5cbmlmICh0ZXN0RWwuaGFzQXR0cmlidXRlTlMpIHtcbiAgICBhY3R1YWxIYXNBdHRyaWJ1dGVOUyA9IGZ1bmN0aW9uKGVsLCBuYW1lc3BhY2VVUkksIG5hbWUpIHtcbiAgICAgICAgcmV0dXJuIGVsLmhhc0F0dHJpYnV0ZU5TKG5hbWVzcGFjZVVSSSwgbmFtZSk7XG4gICAgfTtcbn0gZWxzZSBpZiAodGVzdEVsLmhhc0F0dHJpYnV0ZSkge1xuICAgIGFjdHVhbEhhc0F0dHJpYnV0ZU5TID0gZnVuY3Rpb24oZWwsIG5hbWVzcGFjZVVSSSwgbmFtZSkge1xuICAgICAgICByZXR1cm4gZWwuaGFzQXR0cmlidXRlKG5hbWUpO1xuICAgIH07XG59IGVsc2Uge1xuICAgIGFjdHVhbEhhc0F0dHJpYnV0ZU5TID0gZnVuY3Rpb24oZWwsIG5hbWVzcGFjZVVSSSwgbmFtZSkge1xuICAgICAgICByZXR1cm4gZWwuZ2V0QXR0cmlidXRlTm9kZShuYW1lc3BhY2VVUkksIG5hbWUpICE9IG51bGw7XG4gICAgfTtcbn1cblxudmFyIGhhc0F0dHJpYnV0ZU5TID0gYWN0dWFsSGFzQXR0cmlidXRlTlM7XG5cblxuZnVuY3Rpb24gdG9FbGVtZW50KHN0cikge1xuICAgIGlmICghcmFuZ2UgJiYgZG9jLmNyZWF0ZVJhbmdlKSB7XG4gICAgICAgIHJhbmdlID0gZG9jLmNyZWF0ZVJhbmdlKCk7XG4gICAgICAgIHJhbmdlLnNlbGVjdE5vZGUoZG9jLmJvZHkpO1xuICAgIH1cblxuICAgIHZhciBmcmFnbWVudDtcbiAgICBpZiAocmFuZ2UgJiYgcmFuZ2UuY3JlYXRlQ29udGV4dHVhbEZyYWdtZW50KSB7XG4gICAgICAgIGZyYWdtZW50ID0gcmFuZ2UuY3JlYXRlQ29udGV4dHVhbEZyYWdtZW50KHN0cik7XG4gICAgfSBlbHNlIHtcbiAgICAgICAgZnJhZ21lbnQgPSBkb2MuY3JlYXRlRWxlbWVudCgnYm9keScpO1xuICAgICAgICBmcmFnbWVudC5pbm5lckhUTUwgPSBzdHI7XG4gICAgfVxuICAgIHJldHVybiBmcmFnbWVudC5jaGlsZE5vZGVzWzBdO1xufVxuXG4vKipcbiAqIFJldHVybnMgdHJ1ZSBpZiB0d28gbm9kZSdzIG5hbWVzIGFyZSB0aGUgc2FtZS5cbiAqXG4gKiBOT1RFOiBXZSBkb24ndCBib3RoZXIgY2hlY2tpbmcgYG5hbWVzcGFjZVVSSWAgYmVjYXVzZSB5b3Ugd2lsbCBuZXZlciBmaW5kIHR3byBIVE1MIGVsZW1lbnRzIHdpdGggdGhlIHNhbWVcbiAqICAgICAgIG5vZGVOYW1lIGFuZCBkaWZmZXJlbnQgbmFtZXNwYWNlIFVSSXMuXG4gKlxuICogQHBhcmFtIHtFbGVtZW50fSBhXG4gKiBAcGFyYW0ge0VsZW1lbnR9IGIgVGhlIHRhcmdldCBlbGVtZW50XG4gKiBAcmV0dXJuIHtib29sZWFufVxuICovXG5mdW5jdGlvbiBjb21wYXJlTm9kZU5hbWVzKGZyb21FbCwgdG9FbCkge1xuICAgIHZhciBmcm9tTm9kZU5hbWUgPSBmcm9tRWwubm9kZU5hbWU7XG4gICAgdmFyIHRvTm9kZU5hbWUgPSB0b0VsLm5vZGVOYW1lO1xuXG4gICAgaWYgKGZyb21Ob2RlTmFtZSA9PT0gdG9Ob2RlTmFtZSkge1xuICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9XG5cbiAgICBpZiAodG9FbC5hY3R1YWxpemUgJiZcbiAgICAgICAgZnJvbU5vZGVOYW1lLmNoYXJDb2RlQXQoMCkgPCA5MSAmJiAvKiBmcm9tIHRhZyBuYW1lIGlzIHVwcGVyIGNhc2UgKi9cbiAgICAgICAgdG9Ob2RlTmFtZS5jaGFyQ29kZUF0KDApID4gOTAgLyogdGFyZ2V0IHRhZyBuYW1lIGlzIGxvd2VyIGNhc2UgKi8pIHtcbiAgICAgICAgLy8gSWYgdGhlIHRhcmdldCBlbGVtZW50IGlzIGEgdmlydHVhbCBET00gbm9kZSB0aGVuIHdlIG1heSBuZWVkIHRvIG5vcm1hbGl6ZSB0aGUgdGFnIG5hbWVcbiAgICAgICAgLy8gYmVmb3JlIGNvbXBhcmluZy4gTm9ybWFsIEhUTUwgZWxlbWVudHMgdGhhdCBhcmUgaW4gdGhlIFwiaHR0cDovL3d3dy53My5vcmcvMTk5OS94aHRtbFwiXG4gICAgICAgIC8vIGFyZSBjb252ZXJ0ZWQgdG8gdXBwZXIgY2FzZVxuICAgICAgICByZXR1cm4gZnJvbU5vZGVOYW1lID09PSB0b05vZGVOYW1lLnRvVXBwZXJDYXNlKCk7XG4gICAgfSBlbHNlIHtcbiAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cbn1cblxuLyoqXG4gKiBDcmVhdGUgYW4gZWxlbWVudCwgb3B0aW9uYWxseSB3aXRoIGEga25vd24gbmFtZXNwYWNlIFVSSS5cbiAqXG4gKiBAcGFyYW0ge3N0cmluZ30gbmFtZSB0aGUgZWxlbWVudCBuYW1lLCBlLmcuICdkaXYnIG9yICdzdmcnXG4gKiBAcGFyYW0ge3N0cmluZ30gW25hbWVzcGFjZVVSSV0gdGhlIGVsZW1lbnQncyBuYW1lc3BhY2UgVVJJLCBpLmUuIHRoZSB2YWx1ZSBvZlxuICogaXRzIGB4bWxuc2AgYXR0cmlidXRlIG9yIGl0cyBpbmZlcnJlZCBuYW1lc3BhY2UuXG4gKlxuICogQHJldHVybiB7RWxlbWVudH1cbiAqL1xuZnVuY3Rpb24gY3JlYXRlRWxlbWVudE5TKG5hbWUsIG5hbWVzcGFjZVVSSSkge1xuICAgIHJldHVybiAhbmFtZXNwYWNlVVJJIHx8IG5hbWVzcGFjZVVSSSA9PT0gTlNfWEhUTUwgP1xuICAgICAgICBkb2MuY3JlYXRlRWxlbWVudChuYW1lKSA6XG4gICAgICAgIGRvYy5jcmVhdGVFbGVtZW50TlMobmFtZXNwYWNlVVJJLCBuYW1lKTtcbn1cblxuLyoqXG4gKiBDb3BpZXMgdGhlIGNoaWxkcmVuIG9mIG9uZSBET00gZWxlbWVudCB0byBhbm90aGVyIERPTSBlbGVtZW50XG4gKi9cbmZ1bmN0aW9uIG1vdmVDaGlsZHJlbihmcm9tRWwsIHRvRWwpIHtcbiAgICB2YXIgY3VyQ2hpbGQgPSBmcm9tRWwuZmlyc3RDaGlsZDtcbiAgICB3aGlsZSAoY3VyQ2hpbGQpIHtcbiAgICAgICAgdmFyIG5leHRDaGlsZCA9IGN1ckNoaWxkLm5leHRTaWJsaW5nO1xuICAgICAgICB0b0VsLmFwcGVuZENoaWxkKGN1ckNoaWxkKTtcbiAgICAgICAgY3VyQ2hpbGQgPSBuZXh0Q2hpbGQ7XG4gICAgfVxuICAgIHJldHVybiB0b0VsO1xufVxuXG5mdW5jdGlvbiBtb3JwaEF0dHJzKGZyb21Ob2RlLCB0b05vZGUpIHtcbiAgICB2YXIgYXR0cnMgPSB0b05vZGUuYXR0cmlidXRlcztcbiAgICB2YXIgaTtcbiAgICB2YXIgYXR0cjtcbiAgICB2YXIgYXR0ck5hbWU7XG4gICAgdmFyIGF0dHJOYW1lc3BhY2VVUkk7XG4gICAgdmFyIGF0dHJWYWx1ZTtcbiAgICB2YXIgZnJvbVZhbHVlO1xuXG4gICAgZm9yIChpID0gYXR0cnMubGVuZ3RoIC0gMTsgaSA+PSAwOyAtLWkpIHtcbiAgICAgICAgYXR0ciA9IGF0dHJzW2ldO1xuICAgICAgICBhdHRyTmFtZSA9IGF0dHIubmFtZTtcbiAgICAgICAgYXR0ck5hbWVzcGFjZVVSSSA9IGF0dHIubmFtZXNwYWNlVVJJO1xuICAgICAgICBhdHRyVmFsdWUgPSBhdHRyLnZhbHVlO1xuXG4gICAgICAgIGlmIChhdHRyTmFtZXNwYWNlVVJJKSB7XG4gICAgICAgICAgICBhdHRyTmFtZSA9IGF0dHIubG9jYWxOYW1lIHx8IGF0dHJOYW1lO1xuICAgICAgICAgICAgZnJvbVZhbHVlID0gZnJvbU5vZGUuZ2V0QXR0cmlidXRlTlMoYXR0ck5hbWVzcGFjZVVSSSwgYXR0ck5hbWUpO1xuXG4gICAgICAgICAgICBpZiAoZnJvbVZhbHVlICE9PSBhdHRyVmFsdWUpIHtcbiAgICAgICAgICAgICAgICBmcm9tTm9kZS5zZXRBdHRyaWJ1dGVOUyhhdHRyTmFtZXNwYWNlVVJJLCBhdHRyTmFtZSwgYXR0clZhbHVlKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGZyb21WYWx1ZSA9IGZyb21Ob2RlLmdldEF0dHJpYnV0ZShhdHRyTmFtZSk7XG5cbiAgICAgICAgICAgIGlmIChmcm9tVmFsdWUgIT09IGF0dHJWYWx1ZSkge1xuICAgICAgICAgICAgICAgIGZyb21Ob2RlLnNldEF0dHJpYnV0ZShhdHRyTmFtZSwgYXR0clZhbHVlKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH1cblxuICAgIC8vIFJlbW92ZSBhbnkgZXh0cmEgYXR0cmlidXRlcyBmb3VuZCBvbiB0aGUgb3JpZ2luYWwgRE9NIGVsZW1lbnQgdGhhdFxuICAgIC8vIHdlcmVuJ3QgZm91bmQgb24gdGhlIHRhcmdldCBlbGVtZW50LlxuICAgIGF0dHJzID0gZnJvbU5vZGUuYXR0cmlidXRlcztcblxuICAgIGZvciAoaSA9IGF0dHJzLmxlbmd0aCAtIDE7IGkgPj0gMDsgLS1pKSB7XG4gICAgICAgIGF0dHIgPSBhdHRyc1tpXTtcbiAgICAgICAgaWYgKGF0dHIuc3BlY2lmaWVkICE9PSBmYWxzZSkge1xuICAgICAgICAgICAgYXR0ck5hbWUgPSBhdHRyLm5hbWU7XG4gICAgICAgICAgICBhdHRyTmFtZXNwYWNlVVJJID0gYXR0ci5uYW1lc3BhY2VVUkk7XG5cbiAgICAgICAgICAgIGlmIChhdHRyTmFtZXNwYWNlVVJJKSB7XG4gICAgICAgICAgICAgICAgYXR0ck5hbWUgPSBhdHRyLmxvY2FsTmFtZSB8fCBhdHRyTmFtZTtcblxuICAgICAgICAgICAgICAgIGlmICghaGFzQXR0cmlidXRlTlModG9Ob2RlLCBhdHRyTmFtZXNwYWNlVVJJLCBhdHRyTmFtZSkpIHtcbiAgICAgICAgICAgICAgICAgICAgZnJvbU5vZGUucmVtb3ZlQXR0cmlidXRlTlMoYXR0ck5hbWVzcGFjZVVSSSwgYXR0ck5hbWUpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgaWYgKCFoYXNBdHRyaWJ1dGVOUyh0b05vZGUsIG51bGwsIGF0dHJOYW1lKSkge1xuICAgICAgICAgICAgICAgICAgICBmcm9tTm9kZS5yZW1vdmVBdHRyaWJ1dGUoYXR0ck5hbWUpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH1cbn1cblxuZnVuY3Rpb24gc3luY0Jvb2xlYW5BdHRyUHJvcChmcm9tRWwsIHRvRWwsIG5hbWUpIHtcbiAgICBpZiAoZnJvbUVsW25hbWVdICE9PSB0b0VsW25hbWVdKSB7XG4gICAgICAgIGZyb21FbFtuYW1lXSA9IHRvRWxbbmFtZV07XG4gICAgICAgIGlmIChmcm9tRWxbbmFtZV0pIHtcbiAgICAgICAgICAgIGZyb21FbC5zZXRBdHRyaWJ1dGUobmFtZSwgJycpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgZnJvbUVsLnJlbW92ZUF0dHJpYnV0ZShuYW1lLCAnJyk7XG4gICAgICAgIH1cbiAgICB9XG59XG5cbnZhciBzcGVjaWFsRWxIYW5kbGVycyA9IHtcbiAgICAvKipcbiAgICAgKiBOZWVkZWQgZm9yIElFLiBBcHBhcmVudGx5IElFIGRvZXNuJ3QgdGhpbmsgdGhhdCBcInNlbGVjdGVkXCIgaXMgYW5cbiAgICAgKiBhdHRyaWJ1dGUgd2hlbiByZWFkaW5nIG92ZXIgdGhlIGF0dHJpYnV0ZXMgdXNpbmcgc2VsZWN0RWwuYXR0cmlidXRlc1xuICAgICAqL1xuICAgIE9QVElPTjogZnVuY3Rpb24oZnJvbUVsLCB0b0VsKSB7XG4gICAgICAgIHN5bmNCb29sZWFuQXR0clByb3AoZnJvbUVsLCB0b0VsLCAnc2VsZWN0ZWQnKTtcbiAgICB9LFxuICAgIC8qKlxuICAgICAqIFRoZSBcInZhbHVlXCIgYXR0cmlidXRlIGlzIHNwZWNpYWwgZm9yIHRoZSA8aW5wdXQ+IGVsZW1lbnQgc2luY2UgaXQgc2V0c1xuICAgICAqIHRoZSBpbml0aWFsIHZhbHVlLiBDaGFuZ2luZyB0aGUgXCJ2YWx1ZVwiIGF0dHJpYnV0ZSB3aXRob3V0IGNoYW5naW5nIHRoZVxuICAgICAqIFwidmFsdWVcIiBwcm9wZXJ0eSB3aWxsIGhhdmUgbm8gZWZmZWN0IHNpbmNlIGl0IGlzIG9ubHkgdXNlZCB0byB0aGUgc2V0IHRoZVxuICAgICAqIGluaXRpYWwgdmFsdWUuICBTaW1pbGFyIGZvciB0aGUgXCJjaGVja2VkXCIgYXR0cmlidXRlLCBhbmQgXCJkaXNhYmxlZFwiLlxuICAgICAqL1xuICAgIElOUFVUOiBmdW5jdGlvbihmcm9tRWwsIHRvRWwpIHtcbiAgICAgICAgc3luY0Jvb2xlYW5BdHRyUHJvcChmcm9tRWwsIHRvRWwsICdjaGVja2VkJyk7XG4gICAgICAgIHN5bmNCb29sZWFuQXR0clByb3AoZnJvbUVsLCB0b0VsLCAnZGlzYWJsZWQnKTtcblxuICAgICAgICBpZiAoZnJvbUVsLnZhbHVlICE9PSB0b0VsLnZhbHVlKSB7XG4gICAgICAgICAgICBmcm9tRWwudmFsdWUgPSB0b0VsLnZhbHVlO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKCFoYXNBdHRyaWJ1dGVOUyh0b0VsLCBudWxsLCAndmFsdWUnKSkge1xuICAgICAgICAgICAgZnJvbUVsLnJlbW92ZUF0dHJpYnV0ZSgndmFsdWUnKTtcbiAgICAgICAgfVxuICAgIH0sXG5cbiAgICBURVhUQVJFQTogZnVuY3Rpb24oZnJvbUVsLCB0b0VsKSB7XG4gICAgICAgIHZhciBuZXdWYWx1ZSA9IHRvRWwudmFsdWU7XG4gICAgICAgIGlmIChmcm9tRWwudmFsdWUgIT09IG5ld1ZhbHVlKSB7XG4gICAgICAgICAgICBmcm9tRWwudmFsdWUgPSBuZXdWYWx1ZTtcbiAgICAgICAgfVxuXG4gICAgICAgIHZhciBmaXJzdENoaWxkID0gZnJvbUVsLmZpcnN0Q2hpbGQ7XG4gICAgICAgIGlmIChmaXJzdENoaWxkKSB7XG4gICAgICAgICAgICAvLyBOZWVkZWQgZm9yIElFLiBBcHBhcmVudGx5IElFIHNldHMgdGhlIHBsYWNlaG9sZGVyIGFzIHRoZVxuICAgICAgICAgICAgLy8gbm9kZSB2YWx1ZSBhbmQgdmlzZSB2ZXJzYS4gVGhpcyBpZ25vcmVzIGFuIGVtcHR5IHVwZGF0ZS5cbiAgICAgICAgICAgIHZhciBvbGRWYWx1ZSA9IGZpcnN0Q2hpbGQubm9kZVZhbHVlO1xuXG4gICAgICAgICAgICBpZiAob2xkVmFsdWUgPT0gbmV3VmFsdWUgfHwgKCFuZXdWYWx1ZSAmJiBvbGRWYWx1ZSA9PSBmcm9tRWwucGxhY2Vob2xkZXIpKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBmaXJzdENoaWxkLm5vZGVWYWx1ZSA9IG5ld1ZhbHVlO1xuICAgICAgICB9XG4gICAgfSxcbiAgICBTRUxFQ1Q6IGZ1bmN0aW9uKGZyb21FbCwgdG9FbCkge1xuICAgICAgICBpZiAoIWhhc0F0dHJpYnV0ZU5TKHRvRWwsIG51bGwsICdtdWx0aXBsZScpKSB7XG4gICAgICAgICAgICB2YXIgc2VsZWN0ZWRJbmRleCA9IC0xO1xuICAgICAgICAgICAgdmFyIGkgPSAwO1xuICAgICAgICAgICAgdmFyIGN1ckNoaWxkID0gdG9FbC5maXJzdENoaWxkO1xuICAgICAgICAgICAgd2hpbGUoY3VyQ2hpbGQpIHtcbiAgICAgICAgICAgICAgICB2YXIgbm9kZU5hbWUgPSBjdXJDaGlsZC5ub2RlTmFtZTtcbiAgICAgICAgICAgICAgICBpZiAobm9kZU5hbWUgJiYgbm9kZU5hbWUudG9VcHBlckNhc2UoKSA9PT0gJ09QVElPTicpIHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKGhhc0F0dHJpYnV0ZU5TKGN1ckNoaWxkLCBudWxsLCAnc2VsZWN0ZWQnKSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgc2VsZWN0ZWRJbmRleCA9IGk7XG4gICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICBpKys7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGN1ckNoaWxkID0gY3VyQ2hpbGQubmV4dFNpYmxpbmc7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGZyb21FbC5zZWxlY3RlZEluZGV4ID0gaTtcbiAgICAgICAgfVxuICAgIH1cbn07XG5cbnZhciBFTEVNRU5UX05PREUgPSAxO1xudmFyIFRFWFRfTk9ERSA9IDM7XG52YXIgQ09NTUVOVF9OT0RFID0gODtcblxuZnVuY3Rpb24gbm9vcCgpIHt9XG5cbmZ1bmN0aW9uIGRlZmF1bHRHZXROb2RlS2V5KG5vZGUpIHtcbiAgICByZXR1cm4gbm9kZS5pZDtcbn1cblxuZnVuY3Rpb24gbW9ycGhkb21GYWN0b3J5KG1vcnBoQXR0cnMpIHtcblxuICAgIHJldHVybiBmdW5jdGlvbiBtb3JwaGRvbShmcm9tTm9kZSwgdG9Ob2RlLCBvcHRpb25zKSB7XG4gICAgICAgIGlmICghb3B0aW9ucykge1xuICAgICAgICAgICAgb3B0aW9ucyA9IHt9O1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKHR5cGVvZiB0b05vZGUgPT09ICdzdHJpbmcnKSB7XG4gICAgICAgICAgICBpZiAoZnJvbU5vZGUubm9kZU5hbWUgPT09ICcjZG9jdW1lbnQnIHx8IGZyb21Ob2RlLm5vZGVOYW1lID09PSAnSFRNTCcpIHtcbiAgICAgICAgICAgICAgICB2YXIgdG9Ob2RlSHRtbCA9IHRvTm9kZTtcbiAgICAgICAgICAgICAgICB0b05vZGUgPSBkb2MuY3JlYXRlRWxlbWVudCgnaHRtbCcpO1xuICAgICAgICAgICAgICAgIHRvTm9kZS5pbm5lckhUTUwgPSB0b05vZGVIdG1sO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICB0b05vZGUgPSB0b0VsZW1lbnQodG9Ob2RlKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIHZhciBnZXROb2RlS2V5ID0gb3B0aW9ucy5nZXROb2RlS2V5IHx8IGRlZmF1bHRHZXROb2RlS2V5O1xuICAgICAgICB2YXIgb25CZWZvcmVOb2RlQWRkZWQgPSBvcHRpb25zLm9uQmVmb3JlTm9kZUFkZGVkIHx8IG5vb3A7XG4gICAgICAgIHZhciBvbk5vZGVBZGRlZCA9IG9wdGlvbnMub25Ob2RlQWRkZWQgfHwgbm9vcDtcbiAgICAgICAgdmFyIG9uQmVmb3JlRWxVcGRhdGVkID0gb3B0aW9ucy5vbkJlZm9yZUVsVXBkYXRlZCB8fCBub29wO1xuICAgICAgICB2YXIgb25FbFVwZGF0ZWQgPSBvcHRpb25zLm9uRWxVcGRhdGVkIHx8IG5vb3A7XG4gICAgICAgIHZhciBvbkJlZm9yZU5vZGVEaXNjYXJkZWQgPSBvcHRpb25zLm9uQmVmb3JlTm9kZURpc2NhcmRlZCB8fCBub29wO1xuICAgICAgICB2YXIgb25Ob2RlRGlzY2FyZGVkID0gb3B0aW9ucy5vbk5vZGVEaXNjYXJkZWQgfHwgbm9vcDtcbiAgICAgICAgdmFyIG9uQmVmb3JlRWxDaGlsZHJlblVwZGF0ZWQgPSBvcHRpb25zLm9uQmVmb3JlRWxDaGlsZHJlblVwZGF0ZWQgfHwgbm9vcDtcbiAgICAgICAgdmFyIGNoaWxkcmVuT25seSA9IG9wdGlvbnMuY2hpbGRyZW5Pbmx5ID09PSB0cnVlO1xuXG4gICAgICAgIC8vIFRoaXMgb2JqZWN0IGlzIHVzZWQgYXMgYSBsb29rdXAgdG8gcXVpY2tseSBmaW5kIGFsbCBrZXllZCBlbGVtZW50cyBpbiB0aGUgb3JpZ2luYWwgRE9NIHRyZWUuXG4gICAgICAgIHZhciBmcm9tTm9kZXNMb29rdXAgPSB7fTtcbiAgICAgICAgdmFyIGtleWVkUmVtb3ZhbExpc3Q7XG5cbiAgICAgICAgZnVuY3Rpb24gYWRkS2V5ZWRSZW1vdmFsKGtleSkge1xuICAgICAgICAgICAgaWYgKGtleWVkUmVtb3ZhbExpc3QpIHtcbiAgICAgICAgICAgICAgICBrZXllZFJlbW92YWxMaXN0LnB1c2goa2V5KTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAga2V5ZWRSZW1vdmFsTGlzdCA9IFtrZXldO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgZnVuY3Rpb24gd2Fsa0Rpc2NhcmRlZENoaWxkTm9kZXMobm9kZSwgc2tpcEtleWVkTm9kZXMpIHtcbiAgICAgICAgICAgIGlmIChub2RlLm5vZGVUeXBlID09PSBFTEVNRU5UX05PREUpIHtcbiAgICAgICAgICAgICAgICB2YXIgY3VyQ2hpbGQgPSBub2RlLmZpcnN0Q2hpbGQ7XG4gICAgICAgICAgICAgICAgd2hpbGUgKGN1ckNoaWxkKSB7XG5cbiAgICAgICAgICAgICAgICAgICAgdmFyIGtleSA9IHVuZGVmaW5lZDtcblxuICAgICAgICAgICAgICAgICAgICBpZiAoc2tpcEtleWVkTm9kZXMgJiYgKGtleSA9IGdldE5vZGVLZXkoY3VyQ2hpbGQpKSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgLy8gSWYgd2UgYXJlIHNraXBwaW5nIGtleWVkIG5vZGVzIHRoZW4gd2UgYWRkIHRoZSBrZXlcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIHRvIGEgbGlzdCBzbyB0aGF0IGl0IGNhbiBiZSBoYW5kbGVkIGF0IHRoZSB2ZXJ5IGVuZC5cbiAgICAgICAgICAgICAgICAgICAgICAgIGFkZEtleWVkUmVtb3ZhbChrZXkpO1xuICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgLy8gT25seSByZXBvcnQgdGhlIG5vZGUgYXMgZGlzY2FyZGVkIGlmIGl0IGlzIG5vdCBrZXllZC4gV2UgZG8gdGhpcyBiZWNhdXNlXG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBhdCB0aGUgZW5kIHdlIGxvb3AgdGhyb3VnaCBhbGwga2V5ZWQgZWxlbWVudHMgdGhhdCB3ZXJlIHVubWF0Y2hlZFxuICAgICAgICAgICAgICAgICAgICAgICAgLy8gYW5kIHRoZW4gZGlzY2FyZCB0aGVtIGluIG9uZSBmaW5hbCBwYXNzLlxuICAgICAgICAgICAgICAgICAgICAgICAgb25Ob2RlRGlzY2FyZGVkKGN1ckNoaWxkKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChjdXJDaGlsZC5maXJzdENoaWxkKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgd2Fsa0Rpc2NhcmRlZENoaWxkTm9kZXMoY3VyQ2hpbGQsIHNraXBLZXllZE5vZGVzKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgICAgIGN1ckNoaWxkID0gY3VyQ2hpbGQubmV4dFNpYmxpbmc7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgLyoqXG4gICAgICAgICAqIFJlbW92ZXMgYSBET00gbm9kZSBvdXQgb2YgdGhlIG9yaWdpbmFsIERPTVxuICAgICAgICAgKlxuICAgICAgICAgKiBAcGFyYW0gIHtOb2RlfSBub2RlIFRoZSBub2RlIHRvIHJlbW92ZVxuICAgICAgICAgKiBAcGFyYW0gIHtOb2RlfSBwYXJlbnROb2RlIFRoZSBub2RlcyBwYXJlbnRcbiAgICAgICAgICogQHBhcmFtICB7Qm9vbGVhbn0gc2tpcEtleWVkTm9kZXMgSWYgdHJ1ZSB0aGVuIGVsZW1lbnRzIHdpdGgga2V5cyB3aWxsIGJlIHNraXBwZWQgYW5kIG5vdCBkaXNjYXJkZWQuXG4gICAgICAgICAqIEByZXR1cm4ge3VuZGVmaW5lZH1cbiAgICAgICAgICovXG4gICAgICAgIGZ1bmN0aW9uIHJlbW92ZU5vZGUobm9kZSwgcGFyZW50Tm9kZSwgc2tpcEtleWVkTm9kZXMpIHtcbiAgICAgICAgICAgIGlmIChvbkJlZm9yZU5vZGVEaXNjYXJkZWQobm9kZSkgPT09IGZhbHNlKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBpZiAocGFyZW50Tm9kZSkge1xuICAgICAgICAgICAgICAgIHBhcmVudE5vZGUucmVtb3ZlQ2hpbGQobm9kZSk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIG9uTm9kZURpc2NhcmRlZChub2RlKTtcbiAgICAgICAgICAgIHdhbGtEaXNjYXJkZWRDaGlsZE5vZGVzKG5vZGUsIHNraXBLZXllZE5vZGVzKTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIC8vIFRyZWVXYWxrZXIgaW1wbGVtZW50YXRpb24gaXMgbm8gZmFzdGVyLCBidXQga2VlcGluZyB0aGlzIGFyb3VuZCBpbiBjYXNlIHRoaXMgY2hhbmdlcyBpbiB0aGUgZnV0dXJlXG4gICAgICAgIC8vIGZ1bmN0aW9uIGluZGV4VHJlZShyb290KSB7XG4gICAgICAgIC8vICAgICB2YXIgdHJlZVdhbGtlciA9IGRvY3VtZW50LmNyZWF0ZVRyZWVXYWxrZXIoXG4gICAgICAgIC8vICAgICAgICAgcm9vdCxcbiAgICAgICAgLy8gICAgICAgICBOb2RlRmlsdGVyLlNIT1dfRUxFTUVOVCk7XG4gICAgICAgIC8vXG4gICAgICAgIC8vICAgICB2YXIgZWw7XG4gICAgICAgIC8vICAgICB3aGlsZSgoZWwgPSB0cmVlV2Fsa2VyLm5leHROb2RlKCkpKSB7XG4gICAgICAgIC8vICAgICAgICAgdmFyIGtleSA9IGdldE5vZGVLZXkoZWwpO1xuICAgICAgICAvLyAgICAgICAgIGlmIChrZXkpIHtcbiAgICAgICAgLy8gICAgICAgICAgICAgZnJvbU5vZGVzTG9va3VwW2tleV0gPSBlbDtcbiAgICAgICAgLy8gICAgICAgICB9XG4gICAgICAgIC8vICAgICB9XG4gICAgICAgIC8vIH1cblxuICAgICAgICAvLyAvLyBOb2RlSXRlcmF0b3IgaW1wbGVtZW50YXRpb24gaXMgbm8gZmFzdGVyLCBidXQga2VlcGluZyB0aGlzIGFyb3VuZCBpbiBjYXNlIHRoaXMgY2hhbmdlcyBpbiB0aGUgZnV0dXJlXG4gICAgICAgIC8vXG4gICAgICAgIC8vIGZ1bmN0aW9uIGluZGV4VHJlZShub2RlKSB7XG4gICAgICAgIC8vICAgICB2YXIgbm9kZUl0ZXJhdG9yID0gZG9jdW1lbnQuY3JlYXRlTm9kZUl0ZXJhdG9yKG5vZGUsIE5vZGVGaWx0ZXIuU0hPV19FTEVNRU5UKTtcbiAgICAgICAgLy8gICAgIHZhciBlbDtcbiAgICAgICAgLy8gICAgIHdoaWxlKChlbCA9IG5vZGVJdGVyYXRvci5uZXh0Tm9kZSgpKSkge1xuICAgICAgICAvLyAgICAgICAgIHZhciBrZXkgPSBnZXROb2RlS2V5KGVsKTtcbiAgICAgICAgLy8gICAgICAgICBpZiAoa2V5KSB7XG4gICAgICAgIC8vICAgICAgICAgICAgIGZyb21Ob2Rlc0xvb2t1cFtrZXldID0gZWw7XG4gICAgICAgIC8vICAgICAgICAgfVxuICAgICAgICAvLyAgICAgfVxuICAgICAgICAvLyB9XG5cbiAgICAgICAgZnVuY3Rpb24gaW5kZXhUcmVlKG5vZGUpIHtcbiAgICAgICAgICAgIGlmIChub2RlLm5vZGVUeXBlID09PSBFTEVNRU5UX05PREUpIHtcbiAgICAgICAgICAgICAgICB2YXIgY3VyQ2hpbGQgPSBub2RlLmZpcnN0Q2hpbGQ7XG4gICAgICAgICAgICAgICAgd2hpbGUgKGN1ckNoaWxkKSB7XG4gICAgICAgICAgICAgICAgICAgIHZhciBrZXkgPSBnZXROb2RlS2V5KGN1ckNoaWxkKTtcbiAgICAgICAgICAgICAgICAgICAgaWYgKGtleSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgZnJvbU5vZGVzTG9va3VwW2tleV0gPSBjdXJDaGlsZDtcbiAgICAgICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgICAgIC8vIFdhbGsgcmVjdXJzaXZlbHlcbiAgICAgICAgICAgICAgICAgICAgaW5kZXhUcmVlKGN1ckNoaWxkKTtcblxuICAgICAgICAgICAgICAgICAgICBjdXJDaGlsZCA9IGN1ckNoaWxkLm5leHRTaWJsaW5nO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIGluZGV4VHJlZShmcm9tTm9kZSk7XG5cbiAgICAgICAgZnVuY3Rpb24gaGFuZGxlTm9kZUFkZGVkKGVsKSB7XG4gICAgICAgICAgICBvbk5vZGVBZGRlZChlbCk7XG5cbiAgICAgICAgICAgIHZhciBjdXJDaGlsZCA9IGVsLmZpcnN0Q2hpbGQ7XG4gICAgICAgICAgICB3aGlsZSAoY3VyQ2hpbGQpIHtcbiAgICAgICAgICAgICAgICB2YXIgbmV4dFNpYmxpbmcgPSBjdXJDaGlsZC5uZXh0U2libGluZztcblxuICAgICAgICAgICAgICAgIHZhciBrZXkgPSBnZXROb2RlS2V5KGN1ckNoaWxkKTtcbiAgICAgICAgICAgICAgICBpZiAoa2V5KSB7XG4gICAgICAgICAgICAgICAgICAgIHZhciB1bm1hdGNoZWRGcm9tRWwgPSBmcm9tTm9kZXNMb29rdXBba2V5XTtcbiAgICAgICAgICAgICAgICAgICAgaWYgKHVubWF0Y2hlZEZyb21FbCAmJiBjb21wYXJlTm9kZU5hbWVzKGN1ckNoaWxkLCB1bm1hdGNoZWRGcm9tRWwpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBjdXJDaGlsZC5wYXJlbnROb2RlLnJlcGxhY2VDaGlsZCh1bm1hdGNoZWRGcm9tRWwsIGN1ckNoaWxkKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIG1vcnBoRWwodW5tYXRjaGVkRnJvbUVsLCBjdXJDaGlsZCk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICBoYW5kbGVOb2RlQWRkZWQoY3VyQ2hpbGQpO1xuICAgICAgICAgICAgICAgIGN1ckNoaWxkID0gbmV4dFNpYmxpbmc7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICBmdW5jdGlvbiBtb3JwaEVsKGZyb21FbCwgdG9FbCwgY2hpbGRyZW5Pbmx5KSB7XG4gICAgICAgICAgICB2YXIgdG9FbEtleSA9IGdldE5vZGVLZXkodG9FbCk7XG4gICAgICAgICAgICB2YXIgY3VyRnJvbU5vZGVLZXk7XG5cbiAgICAgICAgICAgIGlmICh0b0VsS2V5KSB7XG4gICAgICAgICAgICAgICAgLy8gSWYgYW4gZWxlbWVudCB3aXRoIGFuIElEIGlzIGJlaW5nIG1vcnBoZWQgdGhlbiBpdCBpcyB3aWxsIGJlIGluIHRoZSBmaW5hbFxuICAgICAgICAgICAgICAgIC8vIERPTSBzbyBjbGVhciBpdCBvdXQgb2YgdGhlIHNhdmVkIGVsZW1lbnRzIGNvbGxlY3Rpb25cbiAgICAgICAgICAgICAgICBkZWxldGUgZnJvbU5vZGVzTG9va3VwW3RvRWxLZXldO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBpZiAodG9Ob2RlLmlzU2FtZU5vZGUgJiYgdG9Ob2RlLmlzU2FtZU5vZGUoZnJvbU5vZGUpKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBpZiAoIWNoaWxkcmVuT25seSkge1xuICAgICAgICAgICAgICAgIGlmIChvbkJlZm9yZUVsVXBkYXRlZChmcm9tRWwsIHRvRWwpID09PSBmYWxzZSkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgbW9ycGhBdHRycyhmcm9tRWwsIHRvRWwpO1xuICAgICAgICAgICAgICAgIG9uRWxVcGRhdGVkKGZyb21FbCk7XG5cbiAgICAgICAgICAgICAgICBpZiAob25CZWZvcmVFbENoaWxkcmVuVXBkYXRlZChmcm9tRWwsIHRvRWwpID09PSBmYWxzZSkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBpZiAoZnJvbUVsLm5vZGVOYW1lICE9PSAnVEVYVEFSRUEnKSB7XG4gICAgICAgICAgICAgICAgdmFyIGN1clRvTm9kZUNoaWxkID0gdG9FbC5maXJzdENoaWxkO1xuICAgICAgICAgICAgICAgIHZhciBjdXJGcm9tTm9kZUNoaWxkID0gZnJvbUVsLmZpcnN0Q2hpbGQ7XG4gICAgICAgICAgICAgICAgdmFyIGN1clRvTm9kZUtleTtcblxuICAgICAgICAgICAgICAgIHZhciBmcm9tTmV4dFNpYmxpbmc7XG4gICAgICAgICAgICAgICAgdmFyIHRvTmV4dFNpYmxpbmc7XG4gICAgICAgICAgICAgICAgdmFyIG1hdGNoaW5nRnJvbUVsO1xuXG4gICAgICAgICAgICAgICAgb3V0ZXI6IHdoaWxlIChjdXJUb05vZGVDaGlsZCkge1xuICAgICAgICAgICAgICAgICAgICB0b05leHRTaWJsaW5nID0gY3VyVG9Ob2RlQ2hpbGQubmV4dFNpYmxpbmc7XG4gICAgICAgICAgICAgICAgICAgIGN1clRvTm9kZUtleSA9IGdldE5vZGVLZXkoY3VyVG9Ob2RlQ2hpbGQpO1xuXG4gICAgICAgICAgICAgICAgICAgIHdoaWxlIChjdXJGcm9tTm9kZUNoaWxkKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBmcm9tTmV4dFNpYmxpbmcgPSBjdXJGcm9tTm9kZUNoaWxkLm5leHRTaWJsaW5nO1xuXG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoY3VyVG9Ob2RlQ2hpbGQuaXNTYW1lTm9kZSAmJiBjdXJUb05vZGVDaGlsZC5pc1NhbWVOb2RlKGN1ckZyb21Ob2RlQ2hpbGQpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY3VyVG9Ob2RlQ2hpbGQgPSB0b05leHRTaWJsaW5nO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGN1ckZyb21Ob2RlQ2hpbGQgPSBmcm9tTmV4dFNpYmxpbmc7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY29udGludWUgb3V0ZXI7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAgICAgICAgIGN1ckZyb21Ob2RlS2V5ID0gZ2V0Tm9kZUtleShjdXJGcm9tTm9kZUNoaWxkKTtcblxuICAgICAgICAgICAgICAgICAgICAgICAgdmFyIGN1ckZyb21Ob2RlVHlwZSA9IGN1ckZyb21Ob2RlQ2hpbGQubm9kZVR5cGU7XG5cbiAgICAgICAgICAgICAgICAgICAgICAgIHZhciBpc0NvbXBhdGlibGUgPSB1bmRlZmluZWQ7XG5cbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChjdXJGcm9tTm9kZVR5cGUgPT09IGN1clRvTm9kZUNoaWxkLm5vZGVUeXBlKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGN1ckZyb21Ob2RlVHlwZSA9PT0gRUxFTUVOVF9OT0RFKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIEJvdGggbm9kZXMgYmVpbmcgY29tcGFyZWQgYXJlIEVsZW1lbnQgbm9kZXNcblxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoY3VyVG9Ob2RlS2V5KSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBUaGUgdGFyZ2V0IG5vZGUgaGFzIGEga2V5IHNvIHdlIHdhbnQgdG8gbWF0Y2ggaXQgdXAgd2l0aCB0aGUgY29ycmVjdCBlbGVtZW50XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBpbiB0aGUgb3JpZ2luYWwgRE9NIHRyZWVcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChjdXJUb05vZGVLZXkgIT09IGN1ckZyb21Ob2RlS2V5KSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gVGhlIGN1cnJlbnQgZWxlbWVudCBpbiB0aGUgb3JpZ2luYWwgRE9NIHRyZWUgZG9lcyBub3QgaGF2ZSBhIG1hdGNoaW5nIGtleSBzb1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIGxldCdzIGNoZWNrIG91ciBsb29rdXAgdG8gc2VlIGlmIHRoZXJlIGlzIGEgbWF0Y2hpbmcgZWxlbWVudCBpbiB0aGUgb3JpZ2luYWxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBET00gdHJlZVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmICgobWF0Y2hpbmdGcm9tRWwgPSBmcm9tTm9kZXNMb29rdXBbY3VyVG9Ob2RlS2V5XSkpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGN1ckZyb21Ob2RlQ2hpbGQubmV4dFNpYmxpbmcgPT09IG1hdGNoaW5nRnJvbUVsKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBTcGVjaWFsIGNhc2UgZm9yIHNpbmdsZSBlbGVtZW50IHJlbW92YWxzLiBUbyBhdm9pZCByZW1vdmluZyB0aGUgb3JpZ2luYWxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIERPTSBub2RlIG91dCBvZiB0aGUgdHJlZSAoc2luY2UgdGhhdCBjYW4gYnJlYWsgQ1NTIHRyYW5zaXRpb25zLCBldGMuKSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIHdlIHdpbGwgaW5zdGVhZCBkaXNjYXJkIHRoZSBjdXJyZW50IG5vZGUgYW5kIHdhaXQgdW50aWwgdGhlIG5leHRcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIGl0ZXJhdGlvbiB0byBwcm9wZXJseSBtYXRjaCB1cCB0aGUga2V5ZWQgdGFyZ2V0IGVsZW1lbnQgd2l0aCBpdHMgbWF0Y2hpbmdcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIGVsZW1lbnQgaW4gdGhlIG9yaWdpbmFsIHRyZWVcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlzQ29tcGF0aWJsZSA9IGZhbHNlO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gV2UgZm91bmQgYSBtYXRjaGluZyBrZXllZCBlbGVtZW50IHNvbWV3aGVyZSBpbiB0aGUgb3JpZ2luYWwgRE9NIHRyZWUuXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBMZXQncyBtb3ZpbmcgdGhlIG9yaWdpbmFsIERPTSBub2RlIGludG8gdGhlIGN1cnJlbnQgcG9zaXRpb24gYW5kIG1vcnBoXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBpdC5cblxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gTk9URTogV2UgdXNlIGluc2VydEJlZm9yZSBpbnN0ZWFkIG9mIHJlcGxhY2VDaGlsZCBiZWNhdXNlIHdlIHdhbnQgdG8gZ28gdGhyb3VnaFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gdGhlIGByZW1vdmVOb2RlKClgIGZ1bmN0aW9uIGZvciB0aGUgbm9kZSB0aGF0IGlzIGJlaW5nIGRpc2NhcmRlZCBzbyB0aGF0XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBhbGwgbGlmZWN5Y2xlIGhvb2tzIGFyZSBjb3JyZWN0bHkgaW52b2tlZFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZnJvbUVsLmluc2VydEJlZm9yZShtYXRjaGluZ0Zyb21FbCwgY3VyRnJvbU5vZGVDaGlsZCk7XG5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGZyb21OZXh0U2libGluZyA9IGN1ckZyb21Ob2RlQ2hpbGQubmV4dFNpYmxpbmc7XG5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChjdXJGcm9tTm9kZUtleSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIFNpbmNlIHRoZSBub2RlIGlzIGtleWVkIGl0IG1pZ2h0IGJlIG1hdGNoZWQgdXAgbGF0ZXIgc28gd2UgZGVmZXJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyB0aGUgYWN0dWFsIHJlbW92YWwgdG8gbGF0ZXJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBhZGRLZXllZFJlbW92YWwoY3VyRnJvbU5vZGVLZXkpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBOT1RFOiB3ZSBza2lwIG5lc3RlZCBrZXllZCBub2RlcyBmcm9tIGJlaW5nIHJlbW92ZWQgc2luY2UgdGhlcmUgaXNcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyAgICAgICBzdGlsbCBhIGNoYW5jZSB0aGV5IHdpbGwgYmUgbWF0Y2hlZCB1cCBsYXRlclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJlbW92ZU5vZGUoY3VyRnJvbU5vZGVDaGlsZCwgZnJvbUVsLCB0cnVlIC8qIHNraXAga2V5ZWQgbm9kZXMgKi8pO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjdXJGcm9tTm9kZUNoaWxkID0gbWF0Y2hpbmdGcm9tRWw7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBUaGUgbm9kZXMgYXJlIG5vdCBjb21wYXRpYmxlIHNpbmNlIHRoZSBcInRvXCIgbm9kZSBoYXMgYSBrZXkgYW5kIHRoZXJlXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIGlzIG5vIG1hdGNoaW5nIGtleWVkIG5vZGUgaW4gdGhlIHNvdXJjZSB0cmVlXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlzQ29tcGF0aWJsZSA9IGZhbHNlO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfSBlbHNlIGlmIChjdXJGcm9tTm9kZUtleSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gVGhlIG9yaWdpbmFsIGhhcyBhIGtleVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaXNDb21wYXRpYmxlID0gZmFsc2U7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpc0NvbXBhdGlibGUgPSBpc0NvbXBhdGlibGUgIT09IGZhbHNlICYmIGNvbXBhcmVOb2RlTmFtZXMoY3VyRnJvbU5vZGVDaGlsZCwgY3VyVG9Ob2RlQ2hpbGQpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoaXNDb21wYXRpYmxlKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBXZSBmb3VuZCBjb21wYXRpYmxlIERPTSBlbGVtZW50cyBzbyB0cmFuc2Zvcm1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIHRoZSBjdXJyZW50IFwiZnJvbVwiIG5vZGUgdG8gbWF0Y2ggdGhlIGN1cnJlbnRcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIHRhcmdldCBET00gbm9kZS5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIG1vcnBoRWwoY3VyRnJvbU5vZGVDaGlsZCwgY3VyVG9Ob2RlQ2hpbGQpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKGN1ckZyb21Ob2RlVHlwZSA9PT0gVEVYVF9OT0RFIHx8IGN1ckZyb21Ob2RlVHlwZSA9PSBDT01NRU5UX05PREUpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gQm90aCBub2RlcyBiZWluZyBjb21wYXJlZCBhcmUgVGV4dCBvciBDb21tZW50IG5vZGVzXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlzQ29tcGF0aWJsZSA9IHRydWU7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIFNpbXBseSB1cGRhdGUgbm9kZVZhbHVlIG9uIHRoZSBvcmlnaW5hbCBub2RlIHRvXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIGNoYW5nZSB0aGUgdGV4dCB2YWx1ZVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoY3VyRnJvbU5vZGVDaGlsZC5ub2RlVmFsdWUgIT09IGN1clRvTm9kZUNoaWxkLm5vZGVWYWx1ZSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY3VyRnJvbU5vZGVDaGlsZC5ub2RlVmFsdWUgPSBjdXJUb05vZGVDaGlsZC5ub2RlVmFsdWU7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGlzQ29tcGF0aWJsZSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIEFkdmFuY2UgYm90aCB0aGUgXCJ0b1wiIGNoaWxkIGFuZCB0aGUgXCJmcm9tXCIgY2hpbGQgc2luY2Ugd2UgZm91bmQgYSBtYXRjaFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGN1clRvTm9kZUNoaWxkID0gdG9OZXh0U2libGluZztcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjdXJGcm9tTm9kZUNoaWxkID0gZnJvbU5leHRTaWJsaW5nO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnRpbnVlIG91dGVyO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBObyBjb21wYXRpYmxlIG1hdGNoIHNvIHJlbW92ZSB0aGUgb2xkIG5vZGUgZnJvbSB0aGUgRE9NIGFuZCBjb250aW51ZSB0cnlpbmcgdG8gZmluZCBhXG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBtYXRjaCBpbiB0aGUgb3JpZ2luYWwgRE9NLiBIb3dldmVyLCB3ZSBvbmx5IGRvIHRoaXMgaWYgdGhlIGZyb20gbm9kZSBpcyBub3Qga2V5ZWRcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIHNpbmNlIGl0IGlzIHBvc3NpYmxlIHRoYXQgYSBrZXllZCBub2RlIG1pZ2h0IG1hdGNoIHVwIHdpdGggYSBub2RlIHNvbWV3aGVyZSBlbHNlIGluIHRoZVxuICAgICAgICAgICAgICAgICAgICAgICAgLy8gdGFyZ2V0IHRyZWUgYW5kIHdlIGRvbid0IHdhbnQgdG8gZGlzY2FyZCBpdCBqdXN0IHlldCBzaW5jZSBpdCBzdGlsbCBtaWdodCBmaW5kIGFcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIGhvbWUgaW4gdGhlIGZpbmFsIERPTSB0cmVlLiBBZnRlciBldmVyeXRoaW5nIGlzIGRvbmUgd2Ugd2lsbCByZW1vdmUgYW55IGtleWVkIG5vZGVzXG4gICAgICAgICAgICAgICAgICAgICAgICAvLyB0aGF0IGRpZG4ndCBmaW5kIGEgaG9tZVxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGN1ckZyb21Ob2RlS2V5KSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gU2luY2UgdGhlIG5vZGUgaXMga2V5ZWQgaXQgbWlnaHQgYmUgbWF0Y2hlZCB1cCBsYXRlciBzbyB3ZSBkZWZlclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIHRoZSBhY3R1YWwgcmVtb3ZhbCB0byBsYXRlclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGFkZEtleWVkUmVtb3ZhbChjdXJGcm9tTm9kZUtleSk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIE5PVEU6IHdlIHNraXAgbmVzdGVkIGtleWVkIG5vZGVzIGZyb20gYmVpbmcgcmVtb3ZlZCBzaW5jZSB0aGVyZSBpc1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vICAgICAgIHN0aWxsIGEgY2hhbmNlIHRoZXkgd2lsbCBiZSBtYXRjaGVkIHVwIGxhdGVyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcmVtb3ZlTm9kZShjdXJGcm9tTm9kZUNoaWxkLCBmcm9tRWwsIHRydWUgLyogc2tpcCBrZXllZCBub2RlcyAqLyk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAgICAgICAgIGN1ckZyb21Ob2RlQ2hpbGQgPSBmcm9tTmV4dFNpYmxpbmc7XG4gICAgICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgICAgICAvLyBJZiB3ZSBnb3QgdGhpcyBmYXIgdGhlbiB3ZSBkaWQgbm90IGZpbmQgYSBjYW5kaWRhdGUgbWF0Y2ggZm9yXG4gICAgICAgICAgICAgICAgICAgIC8vIG91ciBcInRvIG5vZGVcIiBhbmQgd2UgZXhoYXVzdGVkIGFsbCBvZiB0aGUgY2hpbGRyZW4gXCJmcm9tXCJcbiAgICAgICAgICAgICAgICAgICAgLy8gbm9kZXMuIFRoZXJlZm9yZSwgd2Ugd2lsbCBqdXN0IGFwcGVuZCB0aGUgY3VycmVudCBcInRvXCIgbm9kZVxuICAgICAgICAgICAgICAgICAgICAvLyB0byB0aGUgZW5kXG4gICAgICAgICAgICAgICAgICAgIGlmIChjdXJUb05vZGVLZXkgJiYgKG1hdGNoaW5nRnJvbUVsID0gZnJvbU5vZGVzTG9va3VwW2N1clRvTm9kZUtleV0pICYmIGNvbXBhcmVOb2RlTmFtZXMobWF0Y2hpbmdGcm9tRWwsIGN1clRvTm9kZUNoaWxkKSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgZnJvbUVsLmFwcGVuZENoaWxkKG1hdGNoaW5nRnJvbUVsKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIG1vcnBoRWwobWF0Y2hpbmdGcm9tRWwsIGN1clRvTm9kZUNoaWxkKTtcbiAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHZhciBvbkJlZm9yZU5vZGVBZGRlZFJlc3VsdCA9IG9uQmVmb3JlTm9kZUFkZGVkKGN1clRvTm9kZUNoaWxkKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChvbkJlZm9yZU5vZGVBZGRlZFJlc3VsdCAhPT0gZmFsc2UpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAob25CZWZvcmVOb2RlQWRkZWRSZXN1bHQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY3VyVG9Ob2RlQ2hpbGQgPSBvbkJlZm9yZU5vZGVBZGRlZFJlc3VsdDtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoY3VyVG9Ob2RlQ2hpbGQuYWN0dWFsaXplKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGN1clRvTm9kZUNoaWxkID0gY3VyVG9Ob2RlQ2hpbGQuYWN0dWFsaXplKGZyb21FbC5vd25lckRvY3VtZW50IHx8IGRvYyk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGZyb21FbC5hcHBlbmRDaGlsZChjdXJUb05vZGVDaGlsZCk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaGFuZGxlTm9kZUFkZGVkKGN1clRvTm9kZUNoaWxkKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgICAgIGN1clRvTm9kZUNoaWxkID0gdG9OZXh0U2libGluZztcbiAgICAgICAgICAgICAgICAgICAgY3VyRnJvbU5vZGVDaGlsZCA9IGZyb21OZXh0U2libGluZztcbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAvLyBXZSBoYXZlIHByb2Nlc3NlZCBhbGwgb2YgdGhlIFwidG8gbm9kZXNcIi4gSWYgY3VyRnJvbU5vZGVDaGlsZCBpc1xuICAgICAgICAgICAgICAgIC8vIG5vbi1udWxsIHRoZW4gd2Ugc3RpbGwgaGF2ZSBzb21lIGZyb20gbm9kZXMgbGVmdCBvdmVyIHRoYXQgbmVlZFxuICAgICAgICAgICAgICAgIC8vIHRvIGJlIHJlbW92ZWRcbiAgICAgICAgICAgICAgICB3aGlsZSAoY3VyRnJvbU5vZGVDaGlsZCkge1xuICAgICAgICAgICAgICAgICAgICBmcm9tTmV4dFNpYmxpbmcgPSBjdXJGcm9tTm9kZUNoaWxkLm5leHRTaWJsaW5nO1xuICAgICAgICAgICAgICAgICAgICBpZiAoKGN1ckZyb21Ob2RlS2V5ID0gZ2V0Tm9kZUtleShjdXJGcm9tTm9kZUNoaWxkKSkpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIFNpbmNlIHRoZSBub2RlIGlzIGtleWVkIGl0IG1pZ2h0IGJlIG1hdGNoZWQgdXAgbGF0ZXIgc28gd2UgZGVmZXJcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIHRoZSBhY3R1YWwgcmVtb3ZhbCB0byBsYXRlclxuICAgICAgICAgICAgICAgICAgICAgICAgYWRkS2V5ZWRSZW1vdmFsKGN1ckZyb21Ob2RlS2V5KTtcbiAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIE5PVEU6IHdlIHNraXAgbmVzdGVkIGtleWVkIG5vZGVzIGZyb20gYmVpbmcgcmVtb3ZlZCBzaW5jZSB0aGVyZSBpc1xuICAgICAgICAgICAgICAgICAgICAgICAgLy8gICAgICAgc3RpbGwgYSBjaGFuY2UgdGhleSB3aWxsIGJlIG1hdGNoZWQgdXAgbGF0ZXJcbiAgICAgICAgICAgICAgICAgICAgICAgIHJlbW92ZU5vZGUoY3VyRnJvbU5vZGVDaGlsZCwgZnJvbUVsLCB0cnVlIC8qIHNraXAga2V5ZWQgbm9kZXMgKi8pO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIGN1ckZyb21Ob2RlQ2hpbGQgPSBmcm9tTmV4dFNpYmxpbmc7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICB2YXIgc3BlY2lhbEVsSGFuZGxlciA9IHNwZWNpYWxFbEhhbmRsZXJzW2Zyb21FbC5ub2RlTmFtZV07XG4gICAgICAgICAgICBpZiAoc3BlY2lhbEVsSGFuZGxlcikge1xuICAgICAgICAgICAgICAgIHNwZWNpYWxFbEhhbmRsZXIoZnJvbUVsLCB0b0VsKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSAvLyBFTkQ6IG1vcnBoRWwoLi4uKVxuXG4gICAgICAgIHZhciBtb3JwaGVkTm9kZSA9IGZyb21Ob2RlO1xuICAgICAgICB2YXIgbW9ycGhlZE5vZGVUeXBlID0gbW9ycGhlZE5vZGUubm9kZVR5cGU7XG4gICAgICAgIHZhciB0b05vZGVUeXBlID0gdG9Ob2RlLm5vZGVUeXBlO1xuXG4gICAgICAgIGlmICghY2hpbGRyZW5Pbmx5KSB7XG4gICAgICAgICAgICAvLyBIYW5kbGUgdGhlIGNhc2Ugd2hlcmUgd2UgYXJlIGdpdmVuIHR3byBET00gbm9kZXMgdGhhdCBhcmUgbm90XG4gICAgICAgICAgICAvLyBjb21wYXRpYmxlIChlLmcuIDxkaXY+IC0tPiA8c3Bhbj4gb3IgPGRpdj4gLS0+IFRFWFQpXG4gICAgICAgICAgICBpZiAobW9ycGhlZE5vZGVUeXBlID09PSBFTEVNRU5UX05PREUpIHtcbiAgICAgICAgICAgICAgICBpZiAodG9Ob2RlVHlwZSA9PT0gRUxFTUVOVF9OT0RFKSB7XG4gICAgICAgICAgICAgICAgICAgIGlmICghY29tcGFyZU5vZGVOYW1lcyhmcm9tTm9kZSwgdG9Ob2RlKSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgb25Ob2RlRGlzY2FyZGVkKGZyb21Ob2RlKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIG1vcnBoZWROb2RlID0gbW92ZUNoaWxkcmVuKGZyb21Ob2RlLCBjcmVhdGVFbGVtZW50TlModG9Ob2RlLm5vZGVOYW1lLCB0b05vZGUubmFtZXNwYWNlVVJJKSk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAvLyBHb2luZyBmcm9tIGFuIGVsZW1lbnQgbm9kZSB0byBhIHRleHQgbm9kZVxuICAgICAgICAgICAgICAgICAgICBtb3JwaGVkTm9kZSA9IHRvTm9kZTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9IGVsc2UgaWYgKG1vcnBoZWROb2RlVHlwZSA9PT0gVEVYVF9OT0RFIHx8IG1vcnBoZWROb2RlVHlwZSA9PT0gQ09NTUVOVF9OT0RFKSB7IC8vIFRleHQgb3IgY29tbWVudCBub2RlXG4gICAgICAgICAgICAgICAgaWYgKHRvTm9kZVR5cGUgPT09IG1vcnBoZWROb2RlVHlwZSkge1xuICAgICAgICAgICAgICAgICAgICBpZiAobW9ycGhlZE5vZGUubm9kZVZhbHVlICE9PSB0b05vZGUubm9kZVZhbHVlKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBtb3JwaGVkTm9kZS5ub2RlVmFsdWUgPSB0b05vZGUubm9kZVZhbHVlO1xuICAgICAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIG1vcnBoZWROb2RlO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIC8vIFRleHQgbm9kZSB0byBzb21ldGhpbmcgZWxzZVxuICAgICAgICAgICAgICAgICAgICBtb3JwaGVkTm9kZSA9IHRvTm9kZTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICBpZiAobW9ycGhlZE5vZGUgPT09IHRvTm9kZSkge1xuICAgICAgICAgICAgLy8gVGhlIFwidG8gbm9kZVwiIHdhcyBub3QgY29tcGF0aWJsZSB3aXRoIHRoZSBcImZyb20gbm9kZVwiIHNvIHdlIGhhZCB0b1xuICAgICAgICAgICAgLy8gdG9zcyBvdXQgdGhlIFwiZnJvbSBub2RlXCIgYW5kIHVzZSB0aGUgXCJ0byBub2RlXCJcbiAgICAgICAgICAgIG9uTm9kZURpc2NhcmRlZChmcm9tTm9kZSk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBtb3JwaEVsKG1vcnBoZWROb2RlLCB0b05vZGUsIGNoaWxkcmVuT25seSk7XG5cbiAgICAgICAgICAgIC8vIFdlIG5vdyBuZWVkIHRvIGxvb3Agb3ZlciBhbnkga2V5ZWQgbm9kZXMgdGhhdCBtaWdodCBuZWVkIHRvIGJlXG4gICAgICAgICAgICAvLyByZW1vdmVkLiBXZSBvbmx5IGRvIHRoZSByZW1vdmFsIGlmIHdlIGtub3cgdGhhdCB0aGUga2V5ZWQgbm9kZVxuICAgICAgICAgICAgLy8gbmV2ZXIgZm91bmQgYSBtYXRjaC4gV2hlbiBhIGtleWVkIG5vZGUgaXMgbWF0Y2hlZCB1cCB3ZSByZW1vdmVcbiAgICAgICAgICAgIC8vIGl0IG91dCBvZiBmcm9tTm9kZXNMb29rdXAgYW5kIHdlIHVzZSBmcm9tTm9kZXNMb29rdXAgdG8gZGV0ZXJtaW5lXG4gICAgICAgICAgICAvLyBpZiBhIGtleWVkIG5vZGUgaGFzIGJlZW4gbWF0Y2hlZCB1cCBvciBub3RcbiAgICAgICAgICAgIGlmIChrZXllZFJlbW92YWxMaXN0KSB7XG4gICAgICAgICAgICAgICAgZm9yICh2YXIgaT0wLCBsZW49a2V5ZWRSZW1vdmFsTGlzdC5sZW5ndGg7IGk8bGVuOyBpKyspIHtcbiAgICAgICAgICAgICAgICAgICAgdmFyIGVsVG9SZW1vdmUgPSBmcm9tTm9kZXNMb29rdXBba2V5ZWRSZW1vdmFsTGlzdFtpXV07XG4gICAgICAgICAgICAgICAgICAgIGlmIChlbFRvUmVtb3ZlKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZW1vdmVOb2RlKGVsVG9SZW1vdmUsIGVsVG9SZW1vdmUucGFyZW50Tm9kZSwgZmFsc2UpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgaWYgKCFjaGlsZHJlbk9ubHkgJiYgbW9ycGhlZE5vZGUgIT09IGZyb21Ob2RlICYmIGZyb21Ob2RlLnBhcmVudE5vZGUpIHtcbiAgICAgICAgICAgIGlmIChtb3JwaGVkTm9kZS5hY3R1YWxpemUpIHtcbiAgICAgICAgICAgICAgICBtb3JwaGVkTm9kZSA9IG1vcnBoZWROb2RlLmFjdHVhbGl6ZShmcm9tTm9kZS5vd25lckRvY3VtZW50IHx8IGRvYyk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICAvLyBJZiB3ZSBoYWQgdG8gc3dhcCBvdXQgdGhlIGZyb20gbm9kZSB3aXRoIGEgbmV3IG5vZGUgYmVjYXVzZSB0aGUgb2xkXG4gICAgICAgICAgICAvLyBub2RlIHdhcyBub3QgY29tcGF0aWJsZSB3aXRoIHRoZSB0YXJnZXQgbm9kZSB0aGVuIHdlIG5lZWQgdG9cbiAgICAgICAgICAgIC8vIHJlcGxhY2UgdGhlIG9sZCBET00gbm9kZSBpbiB0aGUgb3JpZ2luYWwgRE9NIHRyZWUuIFRoaXMgaXMgb25seVxuICAgICAgICAgICAgLy8gcG9zc2libGUgaWYgdGhlIG9yaWdpbmFsIERPTSBub2RlIHdhcyBwYXJ0IG9mIGEgRE9NIHRyZWUgd2hpY2hcbiAgICAgICAgICAgIC8vIHdlIGtub3cgaXMgdGhlIGNhc2UgaWYgaXQgaGFzIGEgcGFyZW50IG5vZGUuXG4gICAgICAgICAgICBmcm9tTm9kZS5wYXJlbnROb2RlLnJlcGxhY2VDaGlsZChtb3JwaGVkTm9kZSwgZnJvbU5vZGUpO1xuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIG1vcnBoZWROb2RlO1xuICAgIH07XG59XG5cbnZhciBtb3JwaGRvbSA9IG1vcnBoZG9tRmFjdG9yeShtb3JwaEF0dHJzKTtcblxubW9kdWxlLmV4cG9ydHMgPSBtb3JwaGRvbTtcbiIsInZhciBnZXRJZCA9IGZ1bmN0aW9uIChpZCkge1xyXG4gIHJldHVybiBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChpZClcclxufVxyXG5cclxuZXhwb3J0cy5nZXRJZCA9IGdldElkXHJcblxyXG4vLyB2YXIgbG9vcENoaWxkcyA9IGZ1bmN0aW9uIChhcnIsIGVsZW0pIHtcclxuLy8gICBmb3IgKHZhciBjaGlsZCA9IGVsZW0uZmlyc3RDaGlsZDsgY2hpbGQgIT09IG51bGw7IGNoaWxkID0gY2hpbGQubmV4dFNpYmxpbmcpIHtcclxuLy8gICAgIGFyci5wdXNoKGNoaWxkKVxyXG4vLyAgICAgaWYgKGNoaWxkLmhhc0NoaWxkTm9kZXMoKSkge1xyXG4vLyAgICAgICBsb29wQ2hpbGRzKGFyciwgY2hpbGQpXHJcbi8vICAgICB9XHJcbi8vICAgfVxyXG4vLyB9XHJcblxyXG4vLyBleHBvcnRzLmxvb3BDaGlsZHMgPSBsb29wQ2hpbGRzXHJcblxyXG5leHBvcnRzLnRlc3RFdmVudCA9IGZ1bmN0aW9uICh0bXBsKSB7XHJcbiAgcmV0dXJuIC8gay0vLnRlc3QodG1wbClcclxufVxyXG5cclxuLyoqXHJcbiAqIEBwcml2YXRlXHJcbiAqIEBkZXNjcmlwdGlvblxyXG4gKiBDaGVjayBhIG5vZGUgYXZhaWxhYmlsaXR5IGluIDI1MG1zLCBpZiBub3QgZm91bmQgc2lsZW50eSBza2lwIHRoZSBldmVudFxyXG4gKlxyXG4gKiBAcGFyYW0ge3N0cmluZ30gaWQgLSB0aGUgbm9kZSBpZFxyXG4gKiBAcGFyYW0ge2Z1bmN0aW9ufSBjYWxsYmFjayAtIHRoZSBmdW5jdGlvbiB0byBleGVjdXRlIG9uY2UgdGhlIG5vZGUgaXMgZm91bmRcclxuICovXHJcbmV4cG9ydHMuY2hlY2tOb2RlQXZhaWxhYmlsaXR5ID0gZnVuY3Rpb24gKGNvbXBvbmVudCwgY29tcG9uZW50TmFtZSwgY2FsbGJhY2ssIG5vdEZvdW5kKSB7XHJcbiAgdmFyIGVsZSA9IGdldElkKGNvbXBvbmVudC5lbClcclxuICB2YXIgZm91bmQgPSBmYWxzZVxyXG4gIGlmIChlbGUpIHJldHVybiBlbGVcclxuICBlbHNlIHtcclxuICAgIHZhciB0ID0gc2V0SW50ZXJ2YWwoZnVuY3Rpb24gKCkge1xyXG4gICAgICBlbGUgPSBnZXRJZChjb21wb25lbnQuZWwpXHJcbiAgICAgIGlmIChlbGUpIHtcclxuICAgICAgICBjbGVhckludGVydmFsKHQpXHJcbiAgICAgICAgZm91bmQgPSB0cnVlXHJcbiAgICAgICAgY2FsbGJhY2soY29tcG9uZW50LCBjb21wb25lbnROYW1lLCBlbGUpXHJcbiAgICAgIH1cclxuICAgIH0sIDApXHJcbiAgICAvLyBzaWxlbnRseSBpZ25vcmUgZmluZGluZyB0aGUgbm9kZSBhZnRlciBzb21ldGltZXNcclxuICAgIHNldFRpbWVvdXQoZnVuY3Rpb24gKCkge1xyXG4gICAgICBjbGVhckludGVydmFsKHQpXHJcbiAgICAgIGlmKCFmb3VuZCAmJiBub3RGb3VuZCAmJiB0eXBlb2Ygbm90Rm91bmQgPT09ICdmdW5jdGlvbicpIG5vdEZvdW5kKClcclxuICAgIH0sIDI1MClcclxuICB9XHJcbn1cclxuXHJcbi8qKlxyXG4gKiBAcHJpdmF0ZVxyXG4gKiBAZGVzY3JpcHRpb25cclxuICogQ29uZmlybSB0aGF0IGEgdmFsdWUgaXMgdHJ1dGh5LCB0aHJvd3MgYW4gZXJyb3IgbWVzc2FnZSBvdGhlcndpc2UuXHJcbiAqXHJcbiAqIEBwYXJhbSB7Kn0gdmFsIC0gdGhlIHZhbCB0byB0ZXN0LlxyXG4gKiBAcGFyYW0ge3N0cmluZ30gbXNnIC0gdGhlIGVycm9yIG1lc3NhZ2Ugb24gZmFpbHVyZS5cclxuICogQHRocm93cyB7RXJyb3J9XHJcbiAqL1xyXG5leHBvcnRzLmFzc2VydCA9IGZ1bmN0aW9uICh2YWwsIG1zZykge1xyXG4gIGlmICghdmFsKSB0aHJvdyBuZXcgRXJyb3IoJyhrZWV0KSAnICsgbXNnKVxyXG59XHJcblxyXG4vKipcclxuICogQHByaXZhdGVcclxuICogQGRlc2NyaXB0aW9uXHJcbiAqIFNpbXBsZSBodG1sIHRlbXBsYXRlIGxpdGVyYWxzIE1PRElGSUVEIGZyb20gOiBodHRwOi8vMmFsaXR5LmNvbS8yMDE1LzAxL3RlbXBsYXRlLXN0cmluZ3MtaHRtbC5odG1sXHJcbiAqIGJ5IERyLiBBeGVsIFJhdXNjaG1heWVyXHJcbiAqIG5vIGNoZWNraW5nIGZvciB3cmFwcGluZyBpbiByb290IGVsZW1lbnRcclxuICogbm8gc3RyaWN0IGNoZWNraW5nXHJcbiAqIHJlbW92ZSBzcGFjaW5nIC8gaW5kZW50YXRpb25cclxuICoga2VlcCBhbGwgc3BhY2luZyB3aXRoaW4gaHRtbCB0YWdzXHJcbiAqIGluY2x1ZGUgaGFuZGxpbmcgJHt9IGluIHRoZSBsaXRlcmFsc1xyXG4gKi9cclxuZXhwb3J0cy5odG1sID0gZnVuY3Rpb24gaHRtbCAoKSB7XHJcbiAgdmFyIGxpdGVyYWxzID0gW10uc2hpZnQuY2FsbChhcmd1bWVudHMpXHJcbiAgdmFyIHN1YnN0cyA9IFtdLnNsaWNlLmNhbGwoYXJndW1lbnRzKVxyXG5cclxuICB2YXIgcmVzdWx0ID0gbGl0ZXJhbHMucmF3LnJlZHVjZShmdW5jdGlvbiAoYWNjLCBsaXQsIGkpIHtcclxuICAgIHJldHVybiBhY2MgKyBzdWJzdHNbaSAtIDFdICsgbGl0XHJcbiAgfSlcclxuICAvLyByZW1vdmUgc3BhY2luZywgaW5kZW50YXRpb24gZnJvbSBldmVyeSBsaW5lXHJcbiAgcmVzdWx0ID0gcmVzdWx0LnNwbGl0KC9cXG4rLylcclxuICByZXN1bHQgPSByZXN1bHQubWFwKGZ1bmN0aW9uICh0KSB7XHJcbiAgICByZXR1cm4gdC50cmltKClcclxuICB9KS5qb2luKCcnKVxyXG4gIHJldHVybiByZXN1bHRcclxufVxyXG5cclxuLyoqXHJcbiAqIEBwcml2YXRlXHJcbiAqIEBkZXNjcmlwdGlvblxyXG4gKiBDb3B5IHdpdGggbW9kaWZpY2F0aW9uIGZyb20gcHJlYWN0LXRvZG9tdmMuIE1vZGVsIGNvbnN0cnVjdG9yIHdpdGhcclxuICogcmVnaXN0ZXJpbmcgY2FsbGJhY2sgbGlzdGVuZXIgaW4gT2JqZWN0LmRlZmluZVByb3BlcnR5LiBBbnkgbW9kaWZpY2F0aW9uXHJcbiAqIHRvIGBgYHRoaXMubGlzdGBgYCBpbnN0YW5jZSB3aWxsIHN1YnNlcXVlbnRseSBpbmZvcm0gYWxsIHJlZ2lzdGVyZWQgbGlzdGVuZXIuXHJcbiAqXHJcbiAqIHt7bW9kZWw6PG15TW9kZWw+fX08bXlNb2RlbFRlbXBsYXRlU3RyaW5nPnt7L21vZGVsOjxteU1vZGVsPn19XHJcbiAqXHJcbiAqL1xyXG5mdW5jdGlvbiBjcmVhdGVNb2RlbCgpIHtcclxuICB2YXIgbW9kZWwgPSBbXVxyXG4gIHZhciBvbkNoYW5nZXMgPSBbXVxyXG5cclxuICB2YXIgaW5mb3JtID0gZnVuY3Rpb24gKCkge1xyXG4gICAgLy8gY29uc29sZS50cmFjZShvbkNoYW5nZXMpXHJcbiAgICBmb3IgKHZhciBpID0gb25DaGFuZ2VzLmxlbmd0aDsgaS0tOykge1xyXG4gICAgICBvbkNoYW5nZXNbaV0obW9kZWwpXHJcbiAgICB9XHJcbiAgfVxyXG5cclxuLyoqXHJcbiAqIEBwcml2YXRlXHJcbiAqIEBkZXNjcmlwdGlvblxyXG4gKiBSZWdpc3RlciBjYWxsYmFjayBsaXN0ZW5lciBvZiBhbnkgY2hhbmdlc1xyXG4gKi9cclxuICBPYmplY3QuZGVmaW5lUHJvcGVydHkodGhpcywgJ2xpc3QnLCB7XHJcbiAgICBlbnVtZXJhYmxlOiBmYWxzZSxcclxuICAgIGNvbmZpZ3VyYWJsZTogdHJ1ZSxcclxuICAgIGdldDogZnVuY3Rpb24gKCkge1xyXG4gICAgICByZXR1cm4gbW9kZWxcclxuICAgIH0sXHJcbiAgICBzZXQ6IGZ1bmN0aW9uICh2YWwpIHtcclxuICAgICAgbW9kZWwgPSB2YWxcclxuICAgICAgaW5mb3JtKClcclxuICAgIH1cclxuICB9KVxyXG5cclxuLyoqXHJcbiAqIEBwcml2YXRlXHJcbiAqIEBkZXNjcmlwdGlvblxyXG4gKiBTdWJzY3JpYmUgdG8gdGhlIG1vZGVsIGNoYW5nZXMgKGFkZC91cGRhdGUvZGVzdHJveSlcclxuICpcclxuICogQHBhcmFtIHtPYmplY3R9IG1vZGVsIC0gdGhlIG1vZGVsIGluY2x1ZGluZyBhbGwgcHJvdG90eXBlc1xyXG4gKlxyXG4gKi9cclxuICB0aGlzLnN1YnNjcmliZSA9IGZ1bmN0aW9uIChmbikge1xyXG4gICAgb25DaGFuZ2VzLnB1c2goZm4pXHJcbiAgfVxyXG5cclxuLyoqXHJcbiAqIEBwcml2YXRlXHJcbiAqIEBkZXNjcmlwdGlvblxyXG4gKiBBZGQgbmV3IG9iamVjdCB0byB0aGUgbW9kZWwgbGlzdFxyXG4gKlxyXG4gKiBAcGFyYW0ge09iamVjdH0gb2JqIC0gbmV3IG9iamVjdCB0byBhZGQgaW50byB0aGUgbW9kZWwgbGlzdFxyXG4gKlxyXG4gKi9cclxuICB0aGlzLmFkZCA9IGZ1bmN0aW9uIChvYmopIHtcclxuICAgIHRoaXMubGlzdCA9IHRoaXMubGlzdC5jb25jYXQob2JqKVxyXG4gIH1cclxuXHJcbi8qKlxyXG4gKiBAcHJpdmF0ZVxyXG4gKiBAZGVzY3JpcHRpb25cclxuICogVXBkYXRlIGV4aXN0aW5nIG9iamVjdCBpbiB0aGUgbW9kZWwgbGlzdFxyXG4gKlxyXG4gKiBAcGFyYW0ge1N0cmluZ30gbG9va3VwSWQgLSBsb29rdXAgaWQgcHJvcGVydHkgbmFtZSBvZiB0aGUgb2JqZWN0XHJcbiAqIEBwYXJhbSB7T2JqZWN0fSB1cGRhdGVPYmogLSB0aGUgdXBkYXRlZCBwcm9wZXJ0aWVzXHJcbiAqXHJcbiAqL1xyXG4gIHRoaXMudXBkYXRlID0gZnVuY3Rpb24gKGxvb2t1cElkLCB1cGRhdGVPYmopIHtcclxuICAgIHRoaXMubGlzdCA9IHRoaXMubGlzdC5tYXAoZnVuY3Rpb24gKG9iaikge1xyXG4gICAgICByZXR1cm4gb2JqW2xvb2t1cElkXSAhPT0gdXBkYXRlT2JqW2xvb2t1cElkXSA/IG9iaiA6IE9iamVjdC5hc3NpZ24ob2JqLCB1cGRhdGVPYmopXHJcbiAgICB9KVxyXG4gIH1cclxuXHJcbi8qKlxyXG4gKiBAcHJpdmF0ZVxyXG4gKiBAZGVzY3JpcHRpb25cclxuICogUmVtb3ZlZCBleGlzdGluZyBvYmplY3QgaW4gdGhlIG1vZGVsIGxpc3RcclxuICpcclxuICogQHBhcmFtIHtTdHJpbmd9IGxvb2t1cElkIC0gbG9va3VwIGlkIHByb3BlcnR5IG5hbWUgb2YgdGhlIG9iamVjdFxyXG4gKiBAcGFyYW0ge1N0cmluZ30gb2JqSWQgLSB1bmlxdWUgaWRlbnRpZmllciBvZiB0aGUgbG9va3VwIGlkXHJcbiAqXHJcbiAqL1xyXG4gIHRoaXMuZGVzdHJveSA9IGZ1bmN0aW9uIChsb29rdXBJZCwgb2JqSWQpIHtcclxuICAgIHRoaXMubGlzdCA9IHRoaXMubGlzdC5maWx0ZXIoZnVuY3Rpb24gKG9iaikge1xyXG4gICAgICByZXR1cm4gb2JqW2xvb2t1cElkXSAhPT0gb2JqSWRcclxuICAgIH0pXHJcbiAgfVxyXG59XHJcblxyXG5leHBvcnRzLmNyZWF0ZU1vZGVsID0gY3JlYXRlTW9kZWxcclxuIiwiY29uc3QgS2VldCA9IHJlcXVpcmUoJy4uL2tlZXQnKVxyXG5jb25zdCB7IGh0bWwgfSA9IHJlcXVpcmUgKCcuLi9rZWV0L3V0aWxzJylcclxuY29uc3QgeyBjYW1lbENhc2UgLCBnZW5JZCB9ID0gcmVxdWlyZSgnLi91dGlsJylcclxuY29uc3QgY3JlYXRlVG9kb01vZGVsID0gcmVxdWlyZSgnLi90b2RvTW9kZWwnKVxyXG5jb25zdCBmaWx0ZXJQYWdlID0gWydhbGwnLCAnYWN0aXZlJywgJ2NvbXBsZXRlZCddXHJcbi8vIGNvbnN0IGZpbHRlcnNUbXBsID0gcmVxdWlyZSgnLi9maWx0ZXJzJykoZmlsdGVyUGFnZSlcclxuY29uc3QgZmlsdGVyQXBwID0gcmVxdWlyZSgnLi9maWx0ZXInKVxyXG5jb25zdCB0b2RvcyA9IHJlcXVpcmUoJy4vdG9kbycpXHJcblxyXG5jbGFzcyBBcHAgZXh0ZW5kcyBLZWV0IHtcclxuICB0b2RvTW9kZWwgPSB0b2Rvc1xyXG4gIGZpbHRlciA9IGZpbHRlckFwcFxyXG4gIHBhZ2UgPSAnQWxsJ1xyXG4gIGlzQ2hlY2tlZCA9IGZhbHNlXHJcbiAgY291bnQgPSAwXHJcbiAgcGx1cmFsID0gJydcclxuICBjbGVhclRvZ2dsZSA9IGZhbHNlXHJcbiAgdG9kb1N0YXRlID0gdHJ1ZVxyXG5cclxuICBjb21wb25lbnRXaWxsTW91bnQoKSB7XHJcbiAgICBmaWx0ZXJQYWdlLm1hcChmID0+IHRoaXNbYHBhZ2Uke2NhbWVsQ2FzZShmKX1gXSA9ICcnKVxyXG5cclxuICAgIC8vIHRoaXMudG9kb1N0YXRlID0gdGhpcy50b2RvTW9kZWwubGlzdC5sZW5ndGggPyB0cnVlIDogZmFsc2VcclxuXHJcbiAgICB0aGlzLnRvZG9Nb2RlbC5zdWJzY3JpYmUodG9kb3MgPT4ge1xyXG4gICAgICBsZXQgdW5jb21wbGV0ZWQgPSB0b2Rvcy5maWx0ZXIoYyA9PiAhYy5jb21wbGV0ZWQpXHJcbiAgICAgIGxldCBjb21wbGV0ZWQgPSB0b2Rvcy5maWx0ZXIoYyA9PiBjLmNvbXBsZXRlZClcclxuICAgICAgdGhpcy5jbGVhclRvZ2dsZSA9IGNvbXBsZXRlZC5sZW5ndGggPyB0cnVlIDogZmFsc2VcclxuICAgICAgdGhpcy50b2RvU3RhdGUgPSB0b2Rvcy5sZW5ndGggPyB0cnVlIDogZmFsc2VcclxuICAgICAgdGhpcy5wbHVyYWwgPSB1bmNvbXBsZXRlZC5sZW5ndGggPT09IDEgPyAnJyA6ICdzJ1xyXG4gICAgICB0aGlzLmNvdW50ID0gdW5jb21wbGV0ZWQubGVuZ3RoXHJcbiAgICB9KVxyXG4gIH1cclxuXHJcbiAgY3JlYXRlIChldnQpIHtcclxuICAgIGlmKGV2dC5rZXlDb2RlICE9PSAxMykgcmV0dXJuXHJcbiAgICBsZXQgdGl0bGUgPSBldnQudGFyZ2V0LnZhbHVlLnRyaW0oKVxyXG4gICAgaWYodGl0bGUpe1xyXG4gICAgICB0aGlzLnRvZG9Nb2RlbC5hZGQoeyBpZDogZ2VuSWQoKSwgdGl0bGUsIGNvbXBsZXRlZDogZmFsc2UgfSlcclxuICAgICAgZXZ0LnRhcmdldC52YWx1ZSA9ICcnXHJcbiAgICB9XHJcbiAgfVxyXG5cclxuICBldnRUb2RvKGV2dCl7XHJcbiAgICBjb25zb2xlLmxvZygxKVxyXG4gICAgaWYoZXZ0LnRhcmdldC5jbGFzc05hbWUgPT09ICd0b2dnbGUnKXtcclxuICAgICAgdGhpcy50b2dnbGVUb2RvKGV2dC50YXJnZXQucGFyZW50Tm9kZS5wYXJlbnROb2RlLmlkLCBldnQpXHJcbiAgICB9IGVsc2UgaWYoZXZ0LnRhcmdldC5jbGFzc05hbWUgPT09ICdkZXN0cm95Jyl7XHJcbiAgICAgIHRoaXMudG9kb0Rlc3Ryb3koZXZ0LnRhcmdldC5wYXJlbnROb2RlLnBhcmVudE5vZGUuaWQpXHJcbiAgICB9XHJcbiAgfVxyXG5cclxuICB0b2dnbGVUb2RvKGlkLCBldnQpIHtcclxuICAgIHRoaXMudG9kb01vZGVsLnVwZGF0ZSggJ2lkJywgeyBpZCwgY29tcGxldGVkOiAhIWV2dC50YXJnZXQuY2hlY2tlZCB9KVxyXG4gIH1cclxuXHJcbiAgdG9kb0Rlc3Ryb3koaWQpIHtcclxuICAgIHRoaXMudG9kb01vZGVsLmRlc3Ryb3koJ2lkJywgaWQpXHJcbiAgfVxyXG5cclxuICBjb21wbGV0ZUFsbCgpe1xyXG4gICAgdGhpcy5pc0NoZWNrZWQgPSAhdGhpcy5pc0NoZWNrZWRcclxuICAgIHRoaXMudG9kb01vZGVsLnVwZGF0ZUFsbCh0aGlzLmlzQ2hlY2tlZClcclxuICB9XHJcblxyXG4gIGNsZWFyQ29tcGxldGVkKCkge1xyXG4gICAgdGhpcy50b2RvTW9kZWwuY2xlYXJDb21wbGV0ZWQoKVxyXG4gIH1cclxuICBlZGl0TW9kZSgpe1xyXG5cclxuICB9XHJcbn1cclxuXHJcbi8vIDx1bCBpZD1cImZpbHRlcnNcIj5cclxuLy8gJHtmaWx0ZXJzVG1wbH1cclxuLy8gPC91bD5cclxuXHJcbmNvbnN0IHZtb2RlbCA9IGh0bWxgXHJcbiAgPHNlY3Rpb24gaWQ9XCJ0b2RvYXBwXCI+XHJcbiAgICA8aGVhZGVyIGlkPVwiaGVhZGVyXCI+XHJcbiAgICAgIDxoMT50b2RvczwvaDE+XHJcbiAgICAgIDxpbnB1dCBpZD1cIm5ldy10b2RvXCIgay1rZXlkb3duPVwiY3JlYXRlKClcIiBwbGFjZWhvbGRlcj1cIldoYXQgbmVlZHMgdG8gYmUgZG9uZT9cIiBhdXRvZm9jdXM+XHJcbiAgICA8L2hlYWRlcj5cclxuICAgIHt7P3RvZG9TdGF0ZX19XHJcbiAgICA8c2VjdGlvbiBpZD1cIm1haW5cIj5cclxuICAgICAgPGlucHV0IGlkPVwidG9nZ2xlLWFsbFwiIHR5cGU9XCJjaGVja2JveFwiIGNoZWNrZWQ9XCJ7e2lzQ2hlY2tlZD9jaGVja2VkOicnfX1cIiBrLWNsaWNrPVwiY29tcGxldGVBbGwoKVwiPlxyXG4gICAgICA8bGFiZWwgZm9yPVwidG9nZ2xlLWFsbFwiPk1hcmsgYWxsIGFzIGNvbXBsZXRlPC9sYWJlbD5cclxuICAgICAgPHVsIGlkPVwidG9kby1saXN0XCIgay1jbGljaz1cImV2dFRvZG8oKVwiIGstZGJsY2xpY2s9XCJlZGl0TW9kZSgpXCI+XHJcbiAgICAgICAge3ttb2RlbDp0b2RvTW9kZWx9fVxyXG4gICAgICAgICAgPGxpIGlkPVwie3tpZH19XCIgY2xhc3M9XCJ7e2NvbXBsZXRlZD9jb21wbGV0ZWQ6Jyd9fVwiPlxyXG4gICAgICAgICAgICA8ZGl2IGNsYXNzPVwidmlld1wiPlxyXG4gICAgICAgICAgICAgIDxpbnB1dCBjbGFzcz1cInRvZ2dsZVwiIHR5cGU9XCJjaGVja2JveFwiIGNoZWNrZWQ9XCJ7e2NvbXBsZXRlZD9jaGVja2VkOicnfX1cIj5cclxuICAgICAgICAgICAgICA8bGFiZWw+e3t0aXRsZX19PC9sYWJlbD5cclxuICAgICAgICAgICAgICA8YnV0dG9uIGNsYXNzPVwiZGVzdHJveVwiPjwvYnV0dG9uPlxyXG4gICAgICAgICAgICA8L2Rpdj5cclxuICAgICAgICAgICAgPGlucHV0IGNsYXNzPVwiZWRpdFwiIHZhbHVlPVwie3t0aXRsZX19XCI+XHJcbiAgICAgICAgICA8L2xpPlxyXG4gICAgICAgIHt7L21vZGVsOnRvZG9Nb2RlbH19XHJcbiAgICAgIDwvdWw+XHJcbiAgICA8L3NlY3Rpb24+XHJcbiAgICA8Zm9vdGVyIGlkPVwiZm9vdGVyXCI+XHJcbiAgICAgIDxzcGFuIGlkPVwidG9kby1jb3VudFwiPlxyXG4gICAgICAgIDxzdHJvbmc+e3tjb3VudH19PC9zdHJvbmc+IGl0ZW17e3BsdXJhbH19IGxlZnRcclxuICAgICAgPC9zcGFuPlxyXG4gICAgICB7e2NvbXBvbmVudDpmaWx0ZXJ9fVxyXG4gICAgICB7ez9jbGVhclRvZ2dsZX19XHJcbiAgICAgIDxidXR0b24gaWQ9XCJjbGVhci1jb21wbGV0ZWRcIiBrLWNsaWNrPVwiY2xlYXJDb21wbGV0ZWQoKVwiPkNsZWFyIGNvbXBsZXRlZDwvYnV0dG9uPlxyXG4gICAgICB7ey9jbGVhclRvZ2dsZX19XHJcbiAgICA8L2Zvb3Rlcj5cclxuICAgIHt7L3RvZG9TdGF0ZX19XHJcbiAgPC9zZWN0aW9uPlxyXG4gIDxmb290ZXIgaWQ9XCJpbmZvXCI+XHJcbiAgICA8cD5Eb3VibGUtY2xpY2sgdG8gZWRpdCBhIHRvZG88L3A+XHJcbiAgICA8cD5DcmVhdGVkIGJ5IDxhIGhyZWY9XCJodHRwczovL2dpdGh1Yi5jb20vc3lhcnVsXCI+U2hhaHJ1bCBOaXphbSBTZWxhbWF0PC9hPjwvcD5cclxuICAgIDxwPlBhcnQgb2YgPGEgaHJlZj1cImh0dHA6Ly90b2RvbXZjLmNvbVwiPlRvZG9NVkM8L2E+PC9wPlxyXG4gIDwvZm9vdGVyPmBcclxuXHJcbmNvbnN0IGFwcCA9IG5ldyBBcHAoKVxyXG5cclxuYXBwLm1vdW50KHZtb2RlbCkubGluaygndG9kbycpXHJcblxyXG5jb25zb2xlLmxvZyhhcHApXHJcbiIsImNvbnN0IHsgY2FtZWxDYXNlIH0gPSByZXF1aXJlKCcuL3V0aWwnKVxyXG5jb25zdCB7IGNyZWF0ZU1vZGVsIH0gPSByZXF1aXJlKCcuLi9rZWV0L3V0aWxzJylcclxuXHJcbmNsYXNzIENyZWF0ZUZpbHRlck1vZGVsIGV4dGVuZHMgY3JlYXRlTW9kZWwge1xyXG4gIHN3aXRjaChoYXNoLCBvYmope1xyXG4gICAgdGhpcy5saXN0ID0gdGhpcy5saXN0Lm1hcChmaWx0ZXIgPT5cclxuICAgICAgZmlsdGVyLmhhc2ggPT09IGhhc2ggPyAoeyAuLi5maWx0ZXIsIC4uLm9ian0pIDogKHsgLi4uZmlsdGVyLCAuLi57IHNlbGVjdGVkOiBmYWxzZSB9fSlcclxuICAgIClcclxuICB9XHJcbn1cclxuXHJcbmNvbnN0IGZpbHRlck1vZGVsID0gbmV3IENyZWF0ZUZpbHRlck1vZGVsKClcclxuXHJcbkFycmF5LmZyb20oWydhbGwnLCAnYWN0aXZlJywgJ2NvbXBsZXRlZCddKS5tYXAocGFnZSA9PiB7XHJcblx0ZmlsdGVyTW9kZWwuYWRkKHtcclxuICAgICAgaGFzaDogJyMvJyArIHBhZ2UsXHJcbiAgICAgIG5hbWU6IGNhbWVsQ2FzZShwYWdlKSxcclxuICAgICAgc2VsZWN0ZWQ6IGZhbHNlXHJcbiAgICB9KVxyXG59KVxyXG5cclxubW9kdWxlLmV4cG9ydHMgPSBmaWx0ZXJNb2RlbCIsImNvbnN0IEtlZXQgPSByZXF1aXJlKCcuLi9rZWV0JylcclxuY29uc3QgeyBjYW1lbENhc2UsIGh0bWwgfSA9IHJlcXVpcmUoJy4vdXRpbCcpXHJcbmNvbnN0IGZpbHRlcnMgPSByZXF1aXJlKCcuL2ZpbHRlci1tb2RlbCcpXHJcblxyXG5cclxuY2xhc3MgQXBwIGV4dGVuZHMgS2VldCB7XHJcbiAgZWwgPSAnZmlsdGVycydcclxuICBmaWx0ZXJNb2RlbCA9IGZpbHRlcnNcclxuICBjb21wb25lbnRXaWxsTW91bnQoKSB7XHJcbiAgICB0aGlzLmZpbHRlck1vZGVsLnN1YnNjcmliZShtb2RlbCA9PiB7XHJcbiAgICAgIHRoaXMuY2FsbEJhdGNoUG9vbFVwZGF0ZSgpXHJcbiAgICB9KVxyXG4gICAgaWYod2luZG93LmxvY2F0aW9uLmhhc2ggPT0gJycpIHtcclxuICAgICAgd2luZG93Lmhpc3RvcnkucHVzaFN0YXRlKHt9LCBudWxsLCAnIy9hbGwnKVxyXG4gICAgfVxyXG4gIH1cclxuICBjb21wb25lbnREaWRNb3VudCgpe1xyXG4gICAgdGhpcy51cGRhdGVVcmwod2luZG93LmxvY2F0aW9uLmhhc2gpXHJcbiAgICB3aW5kb3cub25wb3BzdGF0ZSA9ICgpID0+IHRoaXMudXBkYXRlVXJsKHdpbmRvdy5sb2NhdGlvbi5oYXNoKVxyXG4gIH1cclxuXHJcbiAgLy8gY29tcG9uZW50RGlkVW5Nb3VudCgpe1xyXG4gICAgLy9cclxuICAvLyB9XHJcblxyXG4gIHVwZGF0ZVVybChoYXNoKSB7XHJcbiAgICB0aGlzLmZpbHRlck1vZGVsLnN3aXRjaChoYXNoLCB7IHNlbGVjdGVkOiB0cnVlIH0pXHJcbiAgfVxyXG59XHJcblxyXG5jb25zdCBmaWx0ZXJBcHAgPSBuZXcgQXBwKClcclxuXHJcbmxldCB2bW9kZWwgPSBodG1sYFxyXG5cdDx1bCBpZD1cImZpbHRlcnNcIj5cclxuXHRcdHt7bW9kZWw6ZmlsdGVyTW9kZWx9fVxyXG5cdFx0PGxpIGstY2xpY2s9XCJ1cGRhdGVVcmwoe3toYXNofX0pXCI+PGEgY2xhc3M9XCJ7e3NlbGVjdGVkP3NlbGVjdGVkOicnfX1cIiBocmVmPVwie3toYXNofX1cIj57e25hbWV9fTwvYT48L2xpPlxyXG5cdFx0e3svbW9kZWw6ZmlsdGVyTW9kZWx9fVxyXG5cdDwvdWw+XHJcbmBcclxuXHJcbmZpbHRlckFwcC5tb3VudCh2bW9kZWwpXHJcblxyXG5tb2R1bGUuZXhwb3J0cyA9IGZpbHRlckFwcCIsImNvbnN0IEtlZXQgPSByZXF1aXJlKCcuLi9rZWV0JylcclxuY29uc3QgeyBjcmVhdGVNb2RlbCB9ID0gcmVxdWlyZSgnLi4va2VldC91dGlscycpXHJcblxyXG5jbGFzcyBDcmVhdGVNb2RlbCBleHRlbmRzIGNyZWF0ZU1vZGVsIHtcclxuXHJcbiAgY2xlYXJDb21wbGV0ZWQoKSB7XHJcbiAgICB0aGlzLmxpc3QgPSB0aGlzLmxpc3QuZmlsdGVyKHRvZG8gPT4gIXRvZG8uY29tcGxldGVkKVxyXG4gIH0gXHJcbn1cclxuXHJcbmNvbnN0IHRvZG9zID0gbmV3IENyZWF0ZU1vZGVsKClcclxuXHJcbm1vZHVsZS5leHBvcnRzID0gdG9kb3NcclxuIiwiXHJcbmNvbnN0IHsgZ2VuSWQgfSA9IHJlcXVpcmUoJy4vdXRpbCcpXHJcblxyXG4vLyBub3RlOiBjb3B5IHdpdGggbW9kaWZpY2F0aW9uIGZyb20gcHJlYWN0LXRvZG9tdmNcclxuXHJcbm1vZHVsZS5leHBvcnRzID0gKCkgPT4ge1xyXG5cclxuICBsZXQgb25DaGFuZ2VzID0gW11cclxuXHJcbiAgZnVuY3Rpb24gaW5mb3JtICgpIHtcclxuICAgIGZvciAobGV0IGkgPSBvbkNoYW5nZXMubGVuZ3RoOyBpLS07KSB7XHJcbiAgICAgIG9uQ2hhbmdlc1tpXShtb2RlbClcclxuICAgIH1cclxuICB9XHJcblxyXG4gIGxldCBtb2RlbCA9IHtcclxuXHJcbiAgICBsaXN0OiBbXSxcclxuXHJcbiAgICAvLyBvcHM6IG51bGwsXHJcblxyXG4gICAgc3Vic2NyaWJlIChmbikge1xyXG4gICAgICBvbkNoYW5nZXMucHVzaChmbilcclxuICAgIH0sXHJcblxyXG4gICAgYWRkVG9kbyAodGl0bGUpIHtcclxuICAgICAgLy8gdGhpcy5vcHMgPSAnYWRkJ1xyXG4gICAgICB0aGlzLmxpc3QgPSB0aGlzLmxpc3QuY29uY2F0KHtcclxuICAgICAgICBpZDogZ2VuSWQoKSxcclxuICAgICAgICB0aXRsZSxcclxuICAgICAgICBjb21wbGV0ZWQ6IGZhbHNlXHJcbiAgICAgIH0pXHJcbiAgICAgIGluZm9ybSgpXHJcbiAgICB9LFxyXG5cclxuICAgIHRvZ2dsZUFsbChjb21wbGV0ZWQpIHtcclxuICAgICAgdGhpcy5vcHMgPSAndG9nZ2xlQWxsJ1xyXG4gICAgICB0aGlzLmxpc3QgPSB0aGlzLmxpc3QubWFwKFxyXG4gICAgICAgIHRvZG8gPT4gKHsgLi4udG9kbywgY29tcGxldGVkIH0pXHJcbiAgICAgICk7XHJcbiAgICAgIGluZm9ybSgpXHJcbiAgICB9LFxyXG4gICAgXHJcbiAgICB0b2dnbGUodG9kb1RvVG9nZ2xlKSB7XHJcbiAgICAgIC8vIHRoaXMub3BzID0gJ3RvZ2dsZSdcclxuICAgICAgdGhpcy5saXN0ID0gdGhpcy5saXN0Lm1hcCh0b2RvID0+XHJcbiAgICAgICAgdG9kby5pZCAhPT0gdG9kb1RvVG9nZ2xlLmlkID8gdG9kbyA6ICh7IC4uLnRvZG8sIC4uLnRvZG9Ub1RvZ2dsZX0pXHJcbiAgICAgIClcclxuICAgICAgaW5mb3JtKClcclxuICAgIH0sXHJcbiAgICBcclxuICAgIGRlc3Ryb3koaWQpIHtcclxuICAgICAgLy8gdGhpcy5vcHMgPSAnZGVzdHJveSdcclxuICAgICAgdGhpcy5saXN0ID0gdGhpcy5saXN0LmZpbHRlcih0ID0+IHQuaWQgIT09IGlkKVxyXG4gICAgICBpbmZvcm0oKVxyXG4gICAgfSxcclxuICAgIC8qXHJcbiAgICBzYXZlKHRvZG9Ub1NhdmUsIHRpdGxlKSB7XHJcbiAgICAgIG1vZGVsLnRvZG9zID0gbW9kZWwudG9kb3MubWFwKCB0b2RvID0+IChcclxuICAgICAgICB0b2RvICE9PSB0b2RvVG9TYXZlID8gdG9kbyA6ICh7IC4uLnRvZG8sIHRpdGxlIH0pXHJcbiAgICAgICkpO1xyXG4gICAgICBpbmZvcm0oKTtcclxuICAgIH0sXHJcblxyXG4gICAgY2xlYXJDb21wbGV0ZWQoKSB7XHJcbiAgICAgIG1vZGVsLnRvZG9zID0gbW9kZWwudG9kb3MuZmlsdGVyKCB0b2RvID0+ICF0b2RvLmNvbXBsZXRlZCApO1xyXG4gICAgICBpbmZvcm0oKTtcclxuICAgIH0gKi9cclxuICB9XHJcblxyXG4gIHJldHVybiBtb2RlbFxyXG59XHJcbiIsImV4cG9ydHMuaW5mb3JtID0gZnVuY3Rpb24oYmFzZSwgaW5wdXQpIHtcclxuICBmb3IgKHZhciBpID0gYmFzZS5vbkNoYW5nZXMubGVuZ3RoOyBpLS07KSB7XHJcbiAgICBiYXNlLm9uQ2hhbmdlc1tpXShpbnB1dClcclxuICB9XHJcbn1cclxuXHJcbmV4cG9ydHMuc3RvcmUgPSBmdW5jdGlvbihuYW1lc3BhY2UsIGRhdGEpIHtcclxuICBpZiAoYXJndW1lbnRzLmxlbmd0aCA+IDEpIHtcclxuICAgIHJldHVybiBsb2NhbFN0b3JhZ2Uuc2V0SXRlbShuYW1lc3BhY2UsIEpTT04uc3RyaW5naWZ5KGRhdGEpKVxyXG4gIH0gZWxzZSB7XHJcbiAgICB2YXIgc3RvcmUgPSBsb2NhbFN0b3JhZ2UuZ2V0SXRlbShuYW1lc3BhY2UpXHJcbiAgICByZXR1cm4gc3RvcmUgJiYgSlNPTi5wYXJzZShzdG9yZSkgfHwgW11cclxuICB9XHJcbn1cclxuXHJcbmV4cG9ydHMuY2FtZWxDYXNlID0gZnVuY3Rpb24ocykge1xyXG4gIHJldHVybiBzLmNoYXJBdCgwKS50b1VwcGVyQ2FzZSgpICsgcy5zbGljZSgxKVxyXG59XHJcblxyXG5leHBvcnRzLnNlbGVjdG9yID0gZnVuY3Rpb24gKGlkKSB7XHJcbiAgcmV0dXJuIGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3IoJ1trZWV0LWlkPVwiJyArIGlkICsgJ1wiXScpXHJcbn1cclxuXHJcbmV4cG9ydHMuZ2VuSWQgPSBmdW5jdGlvbigpIHtcclxuICByZXR1cm4gKE1hdGgucm91bmQoTWF0aC5yYW5kb20oKSAqIDB4MSoxZTEyKSkudG9TdHJpbmcoMzIpXHJcbn1cclxuXHJcbmV4cG9ydHMuZ2V0SWQgPSBmdW5jdGlvbiAoaWQpIHtcclxuICByZXR1cm4gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoaWQpXHJcbn1cclxuXHJcbmV4cG9ydHMuaHRtbCA9IGZ1bmN0aW9uIChsaXRlcmFsU2VjdGlvbnMsIC4uLnN1YnN0cykge1xyXG4gIC8vIFVzZSByYXcgbGl0ZXJhbCBzZWN0aW9uczogd2UgZG9u4oCZdCB3YW50XHJcbiAgLy8gYmFja3NsYXNoZXMgKFxcbiBldGMuKSB0byBiZSBpbnRlcnByZXRlZFxyXG4gIGxldCByYXcgPSBsaXRlcmFsU2VjdGlvbnMucmF3O1xyXG5cclxuICBsZXQgcmVzdWx0ID0gJyc7XHJcblxyXG4gIHN1YnN0cy5mb3JFYWNoKChzdWJzdCwgaSkgPT4ge1xyXG4gICAgICAvLyBSZXRyaWV2ZSB0aGUgbGl0ZXJhbCBzZWN0aW9uIHByZWNlZGluZ1xyXG4gICAgICAvLyB0aGUgY3VycmVudCBzdWJzdGl0dXRpb25cclxuICAgICAgbGV0IGxpdCA9IHJhd1tpXTtcclxuXHJcbiAgICAgIC8vIEluIHRoZSBleGFtcGxlLCBtYXAoKSByZXR1cm5zIGFuIGFycmF5OlxyXG4gICAgICAvLyBJZiBzdWJzdGl0dXRpb24gaXMgYW4gYXJyYXkgKGFuZCBub3QgYSBzdHJpbmcpLFxyXG4gICAgICAvLyB3ZSB0dXJuIGl0IGludG8gYSBzdHJpbmdcclxuICAgICAgaWYgKEFycmF5LmlzQXJyYXkoc3Vic3QpKSB7XHJcbiAgICAgICAgICBzdWJzdCA9IHN1YnN0LmpvaW4oJycpO1xyXG4gICAgICB9XHJcblxyXG4gICAgICAvLyBJZiB0aGUgc3Vic3RpdHV0aW9uIGlzIHByZWNlZGVkIGJ5IGEgZG9sbGFyIHNpZ24sXHJcbiAgICAgIC8vIHdlIGVzY2FwZSBzcGVjaWFsIGNoYXJhY3RlcnMgaW4gaXRcclxuICAgICAgaWYgKGxpdC5lbmRzV2l0aCgnJCcpKSB7XHJcbiAgICAgICAgICBzdWJzdCA9IGh0bWxFc2NhcGUoc3Vic3QpO1xyXG4gICAgICAgICAgbGl0ID0gbGl0LnNsaWNlKDAsIC0xKTtcclxuICAgICAgfVxyXG4gICAgICByZXN1bHQgKz0gbGl0O1xyXG4gICAgICByZXN1bHQgKz0gc3Vic3Q7XHJcbiAgfSk7XHJcbiAgLy8gVGFrZSBjYXJlIG9mIGxhc3QgbGl0ZXJhbCBzZWN0aW9uXHJcbiAgLy8gKE5ldmVyIGZhaWxzLCBiZWNhdXNlIGFuIGVtcHR5IHRlbXBsYXRlIHN0cmluZ1xyXG4gIC8vIHByb2R1Y2VzIG9uZSBsaXRlcmFsIHNlY3Rpb24sIGFuIGVtcHR5IHN0cmluZylcclxuICByZXN1bHQgKz0gcmF3W3Jhdy5sZW5ndGgtMV07IC8vIChBKVxyXG5cclxuICByZXR1cm4gcmVzdWx0O1xyXG59XHJcblxyXG5leHBvcnRzLmludGVsbGlVcGRhdGUgPSBmdW5jdGlvbihzdGF0ZSwgY2FsbGJhY2spIHtcclxuICAvLyBvbmx5IHVwZGF0ZSB3aGVuIG5lY2Vzc2FyeVxyXG4gIGlmIChzdGF0ZSkgY2xlYXJUaW1lb3V0KHN0YXRlKVxyXG4gIHN0YXRlID0gc2V0VGltZW91dChmdW5jdGlvbigpIHtcclxuICAgIGNhbGxiYWNrKClcclxuICB9LCAxMClcclxufSJdfQ==
