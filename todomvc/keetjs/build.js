(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
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
        // if(!isGen){
          // isGen = true
        // }
        if(this[conditional]){
          tmplHandler(this, null, null, null, frag, this[conditional])
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
  // node = newElem.firstChild
  // while(node){
  //   currentNode = node
  //   node = node.nextSibling
  //   currentNode.remove()
  // }
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
    // we wait until pooling is ready before initiating DOM morphing
    clearTimeout(batchPool.ttl)
    batchPool.ttl = setTimeout(function () {
      updateContext.call(self, force)
    }, 0)
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

var DOCUMENT_TEXT_TYPE = 3
var modelRawStart = /^\{\{model:([^{}]+)\}\}/g
var modelRawEnd = /^\{\{\/model:([^{}]+)\}\}/g

module.exports = function (node, model, tmplHandler) {
  var modelList
  var mLength
  var i
  var listClone
  var list

  var currentNode
  var entryNode

  while(node){
    currentNode = node
    node = node.nextSibling
    if(currentNode.nodeType === DOCUMENT_TEXT_TYPE){
      if(currentNode.nodeValue.match(modelRawStart)){
        entryNode = currentNode
        list = entryNode.nextSibling.cloneNode(true)
      } else if(currentNode.nodeValue.match(modelRawEnd)){
        currentNode.remove()
        // star generating the model nodes range, if not yet
        // apply conditional hash sum check before doing this
        if(this[model] !== undefined && this[model].hasOwnProperty('list')){
            modelList = this[model].list
            mLength = modelList.length
            i = 0
            while(i < mLength){
              listClone = list.cloneNode(true)
              tmplHandler(this, null, listClone, modelList[i])
              entryNode.parentNode.insertBefore(listClone, null)
              i++
            } 
        }
        entryNode.nextSibling.remove()
        entryNode.remove()

        node = null
      }
    }
  }

  // var list = node.nextSibling.cloneNode(true)
  // // remove the first prototype node 
  // node.nextSibling.remove()

  // if(this[model] !== undefined && this[model].hasOwnProperty('list')){
  //   parentNode = node.parentNode
  //   if(node.nextSibling){
  //     node.nextSibling.remove() // remove the text tag for modelEnd
  //   } else {
  //     assert(false, 'Model "{{/model:'+model+'}}" enclosing tag does not exist.')
  //   }
  //   node.remove() // remove the text for model start tag
    
  //   modelList = this[model].list
  //   mLength = modelList.length
  //   i = 0
  //   while(i < mLength){
  //     listClone = list.cloneNode(true)
  //     tmplHandler(this, null, listClone, modelList[i])
  //     parentNode.insertBefore(listClone, null)
  //     i++
  //   } 
  // } else {
  //   assert(false, 'Model "'+model+'" does not exist.')
  // }
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
    this.__cloneFragment__ = this.base.cloneNode(true)
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

var tmplhandler = function (ctx, updateStateList, modelInstance, modelObject, conditional, conditionalState) {

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
  var idx
  var rem = []
  var isObjectNotation

  if(modelObject){
    instance = modelInstance
  } else if(conditional){
    instance = conditional.firstChild
    // clean up cache nodes for events
    // console.log(conditionalState)
    if(!conditionalState){
      // toSkipStore = []
      // skipNode = []
    }
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
            genModelList.call(ctx, node, modelRep, tmplhandler)
          } else if(rep.match(conditionalRe)){
            conditionalRep = rep.replace('?', '')
            if(ins[conditionalRep] !== undefined){
              updateState(conditionalRep)
              // process conditional nodes
              conditionalNodes.call(ctx, node, conditionalRep, tmplhandler)
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
    console.log(node.parentNode)
  }

  function inspectAttributes(node){
    nodeAttributes = node.attributes
    for (i = nodeAttributes.length; i--;) {
      a = nodeAttributes[i]
      name = a.localName
      ns = a.nodeValue
      if (re.test(name)) {
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
    var realNode
    if(node.id){
      realNode = getId(node.id)
    }
    if(realNode && realNode.hasAttribute('evt-node')){
      return true
    } else {
      return false
    }
    // if(node.hasAttribute('id')){
    //   idx = skipNode.indexOf(node.id)
    //   if(~idx){
    //     return true
    //   } else {
    //     return false
    //   }
    // }
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
      // console.trace(1)
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
            node.setAttribute('evt-node', '')
            var pristineNode = ctx.__pristineFragment__.getElementById(node.id)
            if(pristineNode){
              pristineNode.setAttribute('evt-node', '')
            }
            // if(node.hasAttribute('id')){
            //   addToSkipNode(toSkipStore, node.id)
            console.log(node.id)
              // console.log(node, 'adding evt')
            // }
          }
        }
        // if(i === 0){
        //   rem.map(function (f) { node.removeAttribute(f) })
        // }
      }
    } 
  }

  var t
  var start = Date.now()

  function end(time){

    if(t) clearTimeout(t)

    t = setTimeout(function(){

      // toSkipStore.map(function(skip){
      //   addToSkipNode(skipNode, skip)
      //   var node = ctx.__pristineFragment__.getElementById(skip)
      //   if(!node) return
      //   nodeAttributes = node.attributes
      //   for (i = nodeAttributes.length; i--;) {
      //     a = nodeAttributes[i]
      //     name = a.localName
      //     if (/^k-/.test(name)) {
      //       node.removeAttribute(name)
      //     }
      //   }
      // })

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

var cov_18r9707xyl = function () {
  var path = 'C:\\Users\\User\\distro\\preact-perf\\todomvc\\keetjs\\keet\\utils.js',
      hash = '7620a39af3c1eefdef7db76c1940cbfe8f548c58',
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

cov_18r9707xyl.s[0]++;
var getId = function getId(id) {
  cov_18r9707xyl.f[0]++;
  cov_18r9707xyl.s[1]++;

  return document.getElementById(id);
};

cov_18r9707xyl.s[2]++;
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
 * Copy with modification from preact-todomvc. Model constructor with
 * registering callback listener in Object.defineProperty. Any modification
 * to ```this.list``` instance will subsequently inform all registered listener.
 *
 * {{model:<myModel>}}<myModelTemplateString>{{/model:<myModel>}}
 *
 */
function createModel() {
  cov_18r9707xyl.f[9]++;

  var model = (cov_18r9707xyl.s[32]++, []);
  var onChanges = (cov_18r9707xyl.s[33]++, []);

  cov_18r9707xyl.s[34]++;
  var inform = function inform() {
    cov_18r9707xyl.f[10]++;
    cov_18r9707xyl.s[35]++;

    // console.trace(onChanges)
    for (var i = onChanges.length; i--;) {
      cov_18r9707xyl.s[36]++;

      onChanges[i](model);
    }
  };

  /**
   * @private
   * @description
   * Register callback listener of any changes
   */
  cov_18r9707xyl.s[37]++;
  Object.defineProperty(this, 'list', {
    enumerable: false,
    configurable: true,
    get: function get() {
      cov_18r9707xyl.f[11]++;
      cov_18r9707xyl.s[38]++;

      return model;
    },
    set: function set(val) {
      cov_18r9707xyl.f[12]++;
      cov_18r9707xyl.s[39]++;

      model = val;
      cov_18r9707xyl.s[40]++;
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
  cov_18r9707xyl.s[41]++;
  this.subscribe = function (fn) {
    cov_18r9707xyl.f[13]++;
    cov_18r9707xyl.s[42]++;

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
  cov_18r9707xyl.s[43]++;
  this.add = function (obj) {
    cov_18r9707xyl.f[14]++;
    cov_18r9707xyl.s[44]++;

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
  cov_18r9707xyl.s[45]++;
  this.update = function (lookupId, updateObj) {
    cov_18r9707xyl.f[15]++;
    cov_18r9707xyl.s[46]++;

    this.list = this.list.map(function (obj) {
      cov_18r9707xyl.f[16]++;
      cov_18r9707xyl.s[47]++;

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
  cov_18r9707xyl.s[48]++;
  this.destroy = function (lookupId, objId) {
    cov_18r9707xyl.f[17]++;
    cov_18r9707xyl.s[49]++;

    this.list = this.list.filter(function (obj) {
      cov_18r9707xyl.f[18]++;
      cov_18r9707xyl.s[50]++;

      return obj[lookupId] !== objId;
    });
  };
}

cov_18r9707xyl.s[51]++;
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

var c = 0;

// let start

// let time

var App = function (_Keet) {
  _inherits(App, _Keet);

  function App() {
    var _ref;

    var _temp, _this, _ret;

    _classCallCheck(this, App);

    for (var _len = arguments.length, args = Array(_len), _key = 0; _key < _len; _key++) {
      args[_key] = arguments[_key];
    }

    return _ret = (_temp = (_this = _possibleConstructorReturn(this, (_ref = App.__proto__ || Object.getPrototypeOf(App)).call.apply(_ref, [this].concat(args))), _this), _this.todoModel = todos, _this.filter = filterApp, _this.page = 'All', _this.isChecked = false, _this.count = 0, _this.plural = '', _this.clearToggle = false, _temp), _possibleConstructorReturn(_this, _ret);
  }

  _createClass(App, [{
    key: 'componentWillMount',

    // todoState = true

    value: function componentWillMount() {
      var _this2 = this;

      filterPage.map(function (f) {
        return _this2['page' + camelCase(f)] = '';
      });

      this.todoState = this.todoModel.list.length ? true : false;

      this.todoModel.subscribe(function (todos) {
        // let uncompleted = todos.filter(c => !c.completed)
        // let completed = todos.filter(c => c.completed)
        // this.clearToggle = completed.length ? true : false
        _this2.todoState = todos.length ? true : false;
        // this.plural = uncompleted.length === 1 ? '' : 's'
        // this.count = uncompleted.length
      });
    }
  }, {
    key: 'create',
    value: function create(evt) {
      if (evt.keyCode !== 13) return;
      // if(!start){
      //   start = true
      //   time = Date.now()
      // }
      var title = evt.target.value.trim();
      if (title) {
        this.todoModel.add({ id: genId(), title: title, completed: false });
        evt.target.value = '';
      }
    }
  }, {
    key: 'evtTodo',
    value: function evtTodo() {
      var _ref2, _ref3;

      var target = arguments.length <= 0 ? undefined : arguments[0];
      var id = (_ref2 = arguments.length - 2, arguments.length <= _ref2 ? undefined : arguments[_ref2]);
      var evt = (_ref3 = arguments.length - 1, arguments.length <= _ref3 ? undefined : arguments[_ref3]);

      if (target === 'toggle') this.toggleTodo(id, evt);else if (target === 'destroy') this.todoDestroy(id);
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
      console.log(this);
      this.isChecked = !this.isChecked;
      // this.todoModel.updateAll(this.isChecked)
    }
  }, {
    key: 'clearCompleted',
    value: function clearCompleted() {
      this.todoModel.clearCompleted();
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
}(Keet);

// <ul id="filters">
// ${filtersTmpl}
// </ul>

var vmodel = html(_templateObject);

var app = new App();

app.mount(vmodel).link('todo');

// console.log(app)

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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uL0FwcERhdGEvUm9hbWluZy9ucG0vbm9kZV9tb2R1bGVzL2Jyb3dzZXJpZnkvbm9kZV9tb2R1bGVzL2Jyb3dzZXItcGFjay9fcHJlbHVkZS5qcyIsImtlZXQvY29tcG9uZW50cy9jb21wb25lbnRQYXJzZS5qcyIsImtlZXQvY29tcG9uZW50cy9jb25kaXRpb25hbE5vZGVzLmpzIiwia2VldC9jb21wb25lbnRzL2dlbkVsZW1lbnQuanMiLCJrZWV0L2NvbXBvbmVudHMvZ2VuTW9kZWxMaXN0LmpzIiwia2VldC9jb21wb25lbnRzL3BhcnNlU3RyLmpzIiwia2VldC9jb21wb25lbnRzL3Byb2Nlc3NFdmVudC5qcyIsImtlZXQvY29tcG9uZW50cy9zdHJJbnRlcnByZXRlci5qcyIsImtlZXQvY29tcG9uZW50cy90ZXJuYXJ5T3BzLmpzIiwia2VldC9jb21wb25lbnRzL3RtcGxIYW5kbGVyLmpzIiwia2VldC9rZWV0LmpzIiwia2VldC9ub2RlX21vZHVsZXMvbW9ycGhkb20vZGlzdC9tb3JwaGRvbS5qcyIsImtlZXQvdXRpbHMuanMiLCJzcmMvYXBwLmpzIiwic3JjL2ZpbHRlci1tb2RlbC5qcyIsInNyYy9maWx0ZXIuanMiLCJzcmMvdG9kby5qcyIsInNyYy90b2RvTW9kZWwuanMiLCJzcmMvdXRpbC5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTtBQ0FBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNqQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDdERBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3hLQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDMUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN2RUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDaERBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNSQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDN0JBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNsVkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN2SkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7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QVEsYUFBUixHQUF3QixVQUFTLEtBQVQsRUFBZ0IsUUFBaEIsRUFBMEI7QUFDaEQ7QUFDQSxNQUFJLEtBQUosRUFBVyxhQUFhLEtBQWI7QUFDWCxVQUFRLFdBQVcsWUFBVztBQUM1QjtBQUNELEdBRk8sRUFFTCxFQUZLLENBQVI7QUFHRCxDQU5EIiwiZmlsZSI6ImdlbmVyYXRlZC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzQ29udGVudCI6WyIoZnVuY3Rpb24gZSh0LG4scil7ZnVuY3Rpb24gcyhvLHUpe2lmKCFuW29dKXtpZighdFtvXSl7dmFyIGE9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtpZighdSYmYSlyZXR1cm4gYShvLCEwKTtpZihpKXJldHVybiBpKG8sITApO3ZhciBmPW5ldyBFcnJvcihcIkNhbm5vdCBmaW5kIG1vZHVsZSAnXCIrbytcIidcIik7dGhyb3cgZi5jb2RlPVwiTU9EVUxFX05PVF9GT1VORFwiLGZ9dmFyIGw9bltvXT17ZXhwb3J0czp7fX07dFtvXVswXS5jYWxsKGwuZXhwb3J0cyxmdW5jdGlvbihlKXt2YXIgbj10W29dWzFdW2VdO3JldHVybiBzKG4/bjplKX0sbCxsLmV4cG9ydHMsZSx0LG4scil9cmV0dXJuIG5bb10uZXhwb3J0c312YXIgaT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2Zvcih2YXIgbz0wO288ci5sZW5ndGg7bysrKXMocltvXSk7cmV0dXJuIHN9KSIsIm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24gKHN0cmluZykge1xyXG4gIHZhciBzZWxmID0gdGhpc1xyXG4gIHRoaXMuX19jb21wb25lbnRMaXN0X18ubWFwKGZ1bmN0aW9uIChjb21wb25lbnQpIHtcclxuICAgIGlmIChzZWxmW2NvbXBvbmVudF0pIHtcclxuICAgICAgdmFyIGMgPSBzZWxmW2NvbXBvbmVudF1cclxuICAgICAgLy8gcmVnaXN0ZXIgdGhpcyBjb21wb25lbnQgYXMgYSBzdWItY29tcG9uZW50XHJcbiAgICAgIGMuSVNfU1RVQiA9IHRydWVcclxuICAgICAgLy8gbGlmZS1jeWNsZSBtZXRob2QgYmVmb3JlIHJlbmRlcmluZyBzdWItY29tcG9uZW50XHJcbiAgICAgIHZhciByZWd4ID0gJyhcXFxce1xcXFx7Y29tcG9uZW50OicgKyBjb21wb25lbnQgKyAnXFxcXH1cXFxcfSknXHJcbiAgICAgIHZhciByZSA9IG5ldyBSZWdFeHAocmVneCwgJ2cnKVxyXG4gICAgICB2YXIgdHBsID0gYy5yZW5kZXIoJ2FzU3RyaW5nJylcclxuICAgICAgc2VsZi5fX2NvbXBvbmVudFN0dWJfX1tjb21wb25lbnRdID0gdHBsXHJcbiAgICAgIHN0cmluZyA9IHN0cmluZy5yZXBsYWNlKHJlLCB0cGwpXHJcbiAgICB9XHJcbiAgfSlcclxuICByZXR1cm4gc3RyaW5nXHJcbn1cclxuIiwidmFyIGNvbmRpdGlvbmFsTm9kZXNSYXdTdGFydCA9IC9cXHtcXHtcXD8oW157fV0rKVxcfVxcfS9nXHJcbnZhciBjb25kaXRpb25hbE5vZGVzUmF3RW5kID0gL1xce1xce1xcLyhbXnt9XSspXFx9XFx9L2dcclxudmFyIERPQ1VNRU5UX1RFWFRfVFlQRSA9IDNcclxubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbiAobm9kZSwgY29uZGl0aW9uYWwsIHRtcGxIYW5kbGVyKSB7XHJcbiAgdmFyIGVudHJ5Tm9kZVxyXG4gIHZhciBjdXJyZW50Tm9kZVxyXG4gIHZhciBpc0dlblxyXG4gIHZhciBmcmFnID0gZG9jdW1lbnQuY3JlYXRlRG9jdW1lbnRGcmFnbWVudCgpXHJcbiAgd2hpbGUobm9kZSl7XHJcbiAgICBjdXJyZW50Tm9kZSA9IG5vZGVcclxuICAgIG5vZGUgPSBub2RlLm5leHRTaWJsaW5nXHJcbiAgICBpZihjdXJyZW50Tm9kZS5ub2RlVHlwZSA9PT0gRE9DVU1FTlRfVEVYVF9UWVBFKXtcclxuICAgICAgaWYoY3VycmVudE5vZGUubm9kZVZhbHVlLm1hdGNoKGNvbmRpdGlvbmFsTm9kZXNSYXdTdGFydCkpe1xyXG4gICAgICAgIGVudHJ5Tm9kZSA9IGN1cnJlbnROb2RlXHJcbiAgICAgIH0gZWxzZSBpZihjdXJyZW50Tm9kZS5ub2RlVmFsdWUubWF0Y2goY29uZGl0aW9uYWxOb2Rlc1Jhd0VuZCkpe1xyXG4gICAgICAgIGN1cnJlbnROb2RlLnJlbW92ZSgpXHJcbiAgICAgICAgLy8gc3RhciBnZW5lcmF0aW5nIHRoZSBjb25kaXRpb25hbCBub2RlcyByYW5nZSwgaWYgbm90IHlldFxyXG4gICAgICAgIC8vIGlmKCFpc0dlbil7XHJcbiAgICAgICAgICAvLyBpc0dlbiA9IHRydWVcclxuICAgICAgICAvLyB9XHJcbiAgICAgICAgaWYodGhpc1tjb25kaXRpb25hbF0pe1xyXG4gICAgICAgICAgdG1wbEhhbmRsZXIodGhpcywgbnVsbCwgbnVsbCwgbnVsbCwgZnJhZywgdGhpc1tjb25kaXRpb25hbF0pXHJcbiAgICAgICAgICBlbnRyeU5vZGUucGFyZW50Tm9kZS5pbnNlcnRCZWZvcmUoZnJhZywgZW50cnlOb2RlKVxyXG4gICAgICAgIH1cclxuICAgICAgICBlbnRyeU5vZGUucmVtb3ZlKClcclxuICAgICAgICBub2RlID0gbnVsbFxyXG4gICAgICB9XHJcbiAgICB9IGVsc2Uge1xyXG4gICAgICB2YXIgY05vZGUgPSBjdXJyZW50Tm9kZS5jbG9uZU5vZGUodHJ1ZSlcclxuICAgICAgZnJhZy5hcHBlbmRDaGlsZChjTm9kZSlcclxuICAgICAgY3VycmVudE5vZGUucmVtb3ZlKClcclxuICAgIH1cclxuICB9XHJcbiAgXHJcbiAgLy8gdmFyIHNlbGYgPSB0aGlzXHJcbiAgLy8gdGhpcy5fX3N0YXRlTGlzdF9fLm1hcChmdW5jdGlvbiAoc3RhdGUpIHtcclxuICAvLyAgIGlmICghc2VsZltzdGF0ZV0pIHtcclxuICAvLyAgICAgdmFyIGYgPSAnXFxcXHtcXFxce1xcXFw/JyArIHN0YXRlICsgJ1xcXFx9XFxcXH0nXHJcbiAgLy8gICAgIHZhciBiID0gJ1xcXFx7XFxcXHtcXFxcLycgKyBzdGF0ZSArICdcXFxcfVxcXFx9J1xyXG4gIC8vICAgICAvLyB2YXIgcmVneCA9ICcoPzw9JyArIGYgKyAnKSguKj8pKD89JyArIGIgKyAnKSdcclxuICAvLyAgICAgLy8gKiogb2xkIGJyb3dzZXIgZG9lcyBub3Qgc3VwcG9ydCBwb3NpdGl2ZSBsb29rIGJlaGluZCAqKlxyXG4gIC8vICAgICB2YXIgcmVneCA9ICcoJyArIGYgKyAnKSguKj8pKD89JyArIGIgKyAnKSdcclxuICAvLyAgICAgdmFyIHJlID0gbmV3IFJlZ0V4cChyZWd4KVxyXG4gIC8vICAgICB2YXIgaXNDb25kaXRpb25hbCA9IHJlLnRlc3Qoc3RyaW5nKVxyXG4gIC8vICAgICB2YXIgbWF0Y2ggPSBzdHJpbmcubWF0Y2gocmUpXHJcbiAgLy8gICAgIGlmIChpc0NvbmRpdGlvbmFsICYmIG1hdGNoKSB7XHJcbiAgLy8gICAgICAgc3RyaW5nID0gc3RyaW5nLnJlcGxhY2UobWF0Y2hbMl0sICcnKVxyXG4gIC8vICAgICB9XHJcbiAgLy8gICB9XHJcbiAgLy8gICBzdHJpbmcgPSBzdHJpbmcucmVwbGFjZSgne3s/JyArIHN0YXRlICsgJ319JywgJycpXHJcbiAgLy8gICBzdHJpbmcgPSBzdHJpbmcucmVwbGFjZSgne3svJyArIHN0YXRlICsgJ319JywgJycpXHJcbiAgLy8gfSlcclxuICAvLyByZXR1cm4gc3RyaW5nXHJcbn1cclxuIiwidmFyIHRtcGxIYW5kbGVyID0gcmVxdWlyZSgnLi90bXBsSGFuZGxlcicpXHJcbnZhciBwcm9jZXNzRXZlbnQgPSByZXF1aXJlKCcuL3Byb2Nlc3NFdmVudCcpXHJcbnZhciBnZXRJZCA9IHJlcXVpcmUoJy4uL3V0aWxzJykuZ2V0SWRcclxudmFyIHRlc3RFdmVudCA9IHJlcXVpcmUoJy4uL3V0aWxzJykudGVzdEV2ZW50XHJcbnZhciBjaGVja05vZGVBdmFpbGFiaWxpdHkgPSByZXF1aXJlKCcuLi91dGlscycpLmNoZWNrTm9kZUF2YWlsYWJpbGl0eVxyXG52YXIgc3RySW50ZXJwcmV0ZXIgPSByZXF1aXJlKCcuL3N0ckludGVycHJldGVyJylcclxudmFyIGNvbXBvbmVudFBhcnNlID0gcmVxdWlyZSgnLi9jb21wb25lbnRQYXJzZScpXHJcbi8vIHZhciBtb2RlbFBhcnNlID0gcmVxdWlyZSgnLi9tb2RlbFBhcnNlJylcclxuLy8gdmFyIG5vZGVzVmlzaWJpbGl0eSA9IHJlcXVpcmUoJy4vbm9kZXNWaXNpYmlsaXR5JylcclxudmFyIG1vcnBoID0gcmVxdWlyZSgnbW9ycGhkb20nKVxyXG5cclxudmFyIHVwZGF0ZUNvbnRleHQgPSBmdW5jdGlvbiAoZm9yY2UpIHtcclxuICB2YXIgc2VsZiA9IHRoaXNcclxuICB2YXIgZnJhZyA9IFtdXHJcbiAgdmFyIGVsZSA9IGdldElkKHRoaXMuZWwpXHJcbiAgdmFyIG5vZGUgXHJcbiAgdmFyIGN1cnJlbnROb2RlXHJcbiAgIWZvcmNlICYmIGdlbkVsZW1lbnQuY2FsbCh0aGlzKVxyXG4gIHZhciBuZXdFbGVtID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnZGl2JylcclxuICAvLyBtb3JwIGFzIHN1Yi1jb21wb25lbnRcclxuICBpZiAodGhpcy5JU19TVFVCKSB7XHJcbiAgICBtb3JwaChlbGUsIG5ld0VsZW0uY2hpbGROb2Rlc1swXSlcclxuICB9IGVsc2Uge1xyXG4gIC8vIG90aGVyd2lzZSBtb3BoIGFzIHdob2xlXHJcbiAgICBuZXdFbGVtLmlkID0gdGhpcy5lbFxyXG4gICAgbmV3RWxlbS5hcHBlbmRDaGlsZCh0aGlzLmJhc2UpXHJcbiAgICBtb3JwaChlbGUsIG5ld0VsZW0pXHJcbiAgICBcclxuICAgIC8vIHN1Yi1jb21wb25lbnQgbGlmZS1jeWNsZVxyXG4gICAgLy8gdGhpcy5fX2NvbXBvbmVudExpc3RfXy5tYXAoZnVuY3Rpb24gKGNvbXBvbmVudCkge1xyXG4gICAgLy8gICBpZihzZWxmW2NvbXBvbmVudF0pe1xyXG4gICAgLy8gICAgIHZhciBjID0gc2VsZltjb21wb25lbnRdXHJcbiAgICAvLyAgICAgY2hlY2tOb2RlQXZhaWxhYmlsaXR5KGMsIG51bGwsIGZ1bmN0aW9uKCl7XHJcbiAgICAvLyAgICAgICBpZiAoIWMuRElEX01PVU5UICYmIGMuY29tcG9uZW50RGlkTW91bnQgJiYgdHlwZW9mIGMuY29tcG9uZW50RGlkTW91bnQgPT09ICdmdW5jdGlvbicpIHtcclxuICAgIC8vICAgICAgICAgYy5ESURfTU9VTlQgPSB0cnVlXHJcbiAgICAvLyAgICAgICAgIGMuY29tcG9uZW50RGlkTW91bnQoKVxyXG4gICAgLy8gICAgICAgfVxyXG4gICAgLy8gICAgIH0sIGZ1bmN0aW9uKCl7XHJcbiAgICAvLyAgICAgICBpZiAoYy5ESURfTU9VTlQgJiYgYy5jb21wb25lbnREaWRVbk1vdW50ICYmIHR5cGVvZiBjLmNvbXBvbmVudERpZFVuTW91bnQgPT09ICdmdW5jdGlvbicpIHtcclxuICAgIC8vICAgICAgICAgYy5ESURfTU9VTlQgPSBmYWxzZVxyXG4gICAgLy8gICAgICAgICBjLmNvbXBvbmVudERpZFVuTW91bnQoKVxyXG4gICAgLy8gICAgICAgfVxyXG4gICAgLy8gICAgIH0pXHJcbiAgICAvLyAgIH1cclxuICAgIC8vIH0pXHJcbiAgfVxyXG4gIC8vIGNsZWFuIHVwIGRvY3VtZW50IGNyZWF0aW9uIHNpbmNlIGl0cyBub3QgYSBmcmFnbWVudFxyXG4gIC8vIG5vZGUgPSBuZXdFbGVtLmZpcnN0Q2hpbGRcclxuICAvLyB3aGlsZShub2RlKXtcclxuICAvLyAgIGN1cnJlbnROb2RlID0gbm9kZVxyXG4gIC8vICAgbm9kZSA9IG5vZGUubmV4dFNpYmxpbmdcclxuICAvLyAgIGN1cnJlbnROb2RlLnJlbW92ZSgpXHJcbiAgLy8gfVxyXG4gIC8vIGV4ZWMgbGlmZS1jeWNsZSBjb21wb25lbnREaWRVcGRhdGVcclxuICBpZiAodGhpcy5jb21wb25lbnREaWRVcGRhdGUgJiYgdHlwZW9mIHRoaXMuY29tcG9uZW50RGlkVXBkYXRlID09PSAnZnVuY3Rpb24nKSB7XHJcbiAgICB0aGlzLmNvbXBvbmVudERpZFVwZGF0ZSgpXHJcbiAgfVxyXG4gIC8vIGNvbnNvbGUubG9nKHRoaXMpXHJcbiAgLy8gcmVzZXQgYmF0Y2ggcG9vbGluZ1xyXG4gIGJhdGNoUG9vbC5zdGF0dXMgPSAncmVhZHknXHJcbn1cclxuXHJcbi8vIGJhdGNoIHBvb2wgdXBkYXRlIHN0YXRlcyB0byBET01cclxudmFyIGJhdGNoUG9vbCA9IHtcclxuICB0dGw6IDAsXHJcbiAgc3RhdHVzOiAncmVhZHknXHJcbn1cclxuXHJcbi8vIFRoZSBpZGVhIGJlaGluZCB0aGlzIGlzIHRvIHJlZHVjZSBtb3JwaGluZyB0aGUgRE9NIHdoZW4gbXVsdGlwbGUgdXBkYXRlc1xyXG4vLyBoaXQgdGhlIGRlY2suIElmIHBvc3NpYmxlIHdlIHdhbnQgdG8gcG9vbCB0aGVtIGJlZm9yZSBpbml0aWF0aW5nIERPTVxyXG4vLyBtb3JwaGluZywgYnV0IGluIHRoZSBldmVudCB0aGUgdXBkYXRlIGlzIG5vdCBmYXN0IGVub3VnaCB3ZSB3YW50IHRvIHJldHVyblxyXG4vLyB0byBub3JtYWwgc3luY2hyb25vdXMgdXBkYXRlLlxyXG52YXIgYmF0Y2hQb29sRXhlYyA9IGZ1bmN0aW9uIChmb3JjZSkge1xyXG4gIGlmIChiYXRjaFBvb2wuc3RhdHVzID09PSAncG9vbGluZycpIHtcclxuICAgIC8vXHJcbiAgfSBlbHNlIHtcclxuICAgIHZhciBzZWxmID0gdGhpc1xyXG4gICAgYmF0Y2hQb29sLnN0YXR1cyA9ICdwb29saW5nJ1xyXG4gICAgLy8gd2Ugd2FpdCB1bnRpbCBwb29saW5nIGlzIHJlYWR5IGJlZm9yZSBpbml0aWF0aW5nIERPTSBtb3JwaGluZ1xyXG4gICAgY2xlYXJUaW1lb3V0KGJhdGNoUG9vbC50dGwpXHJcbiAgICBiYXRjaFBvb2wudHRsID0gc2V0VGltZW91dChmdW5jdGlvbiAoKSB7XHJcbiAgICAgIHVwZGF0ZUNvbnRleHQuY2FsbChzZWxmLCBmb3JjZSlcclxuICAgIH0sIDApXHJcbiAgfVxyXG59XHJcblxyXG52YXIgbmV4dFN0YXRlID0gZnVuY3Rpb24gKGkpIHtcclxuICB2YXIgc2VsZiA9IHRoaXNcclxuICB2YXIgc3RhdGVcclxuICB2YXIgdmFsdWVcclxuICBpZihpIDwgc3RhdGVMaXN0Lmxlbmd0aCkge1xyXG5cclxuICAgIHN0YXRlID0gc3RhdGVMaXN0W2ldXHJcbiAgICB2YWx1ZSA9IHRoaXNbc3RhdGVdXHJcblxyXG4gICAgLy8gaWYgdmFsdWUgaXMgdW5kZWZpbmVkLCBsaWtlbHkgaGFzIG9iamVjdCBub3RhdGlvbiB3ZSBjb252ZXJ0IGl0IHRvIGFycmF5XHJcbiAgICBpZiAodmFsdWUgPT09IHVuZGVmaW5lZCkgdmFsdWUgPSBzdHJJbnRlcnByZXRlcihzdGF0ZSlcclxuXHJcbiAgICBpZiAodmFsdWUgJiYgQXJyYXkuaXNBcnJheSh2YWx1ZSkpIHtcclxuICAgICAgLy8gdXNpbmcgc3BsaXQgb2JqZWN0IG5vdGF0aW9uIGFzIGJhc2UgZm9yIHN0YXRlIHVwZGF0ZVxyXG4gICAgICAvLyBjb25zb2xlLmxvZyh2YWx1ZSlcclxuICAgICAgdmFyIGluVmFsID0gdGhpc1t2YWx1ZVswXV1bdmFsdWVbMV1dXHJcbiAgICAgIE9iamVjdC5kZWZpbmVQcm9wZXJ0eSh0aGlzW3ZhbHVlWzBdXSwgdmFsdWVbMV0sIHtcclxuICAgICAgICBlbnVtZXJhYmxlOiBmYWxzZSxcclxuICAgICAgICBjb25maWd1cmFibGU6IHRydWUsXHJcbiAgICAgICAgZ2V0OiBmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgICByZXR1cm4gaW5WYWxcclxuICAgICAgICB9LFxyXG4gICAgICAgIHNldDogZnVuY3Rpb24gKHZhbCkge1xyXG4gICAgICAgICAgaW5WYWwgPSB2YWxcclxuICAgICAgICAgIGJhdGNoUG9vbEV4ZWMuY2FsbChzZWxmKVxyXG4gICAgICAgIH1cclxuICAgICAgfSlcclxuICAgIH0gZWxzZSB7XHJcbiAgICAgIC8vIGhhbmRsZSBwYXJlbnQgc3RhdGUgdXBkYXRlIGlmIHRoZSBzdGF0ZSBpcyBub3QgYW4gb2JqZWN0XHJcbiAgICAgIE9iamVjdC5kZWZpbmVQcm9wZXJ0eSh0aGlzLCBzdGF0ZSwge1xyXG4gICAgICAgIGVudW1lcmFibGU6IGZhbHNlLFxyXG4gICAgICAgIGNvbmZpZ3VyYWJsZTogdHJ1ZSxcclxuICAgICAgICBnZXQ6IGZ1bmN0aW9uICgpIHtcclxuICAgICAgICAgIHJldHVybiB2YWx1ZVxyXG4gICAgICAgIH0sXHJcbiAgICAgICAgc2V0OiBmdW5jdGlvbiAodmFsKSB7XHJcbiAgICAgICAgICB2YWx1ZSA9IHZhbFxyXG4gICAgICAgICAgYmF0Y2hQb29sRXhlYy5jYWxsKHNlbGYpXHJcbiAgICAgICAgfVxyXG4gICAgICB9KVxyXG4gICAgfVxyXG4gICAgaSsrXHJcbiAgICBuZXh0U3RhdGUuY2FsbCh0aGlzLCBpKVxyXG4gIH1cclxufVxyXG5cclxudmFyIHNldFN0YXRlID0gZnVuY3Rpb24gKCkge1xyXG4gIG5leHRTdGF0ZS5jYWxsKHRoaXMsIDApXHJcbn1cclxuXHJcbnZhciBzdGF0ZUxpc3QgPSBbXVxyXG5cclxudmFyIGNsZWFyU3RhdGUgPSBmdW5jdGlvbigpe1xyXG4gIHN0YXRlTGlzdCA9IFtdXHJcbn1cclxuXHJcbnZhciBhZGRTdGF0ZSA9IGZ1bmN0aW9uKHN0YXRlKXtcclxuICBpZihzdGF0ZUxpc3QuaW5kZXhPZihzdGF0ZSkgPT09IC0xKSBzdGF0ZUxpc3QgPSBzdGF0ZUxpc3QuY29uY2F0KHN0YXRlKVxyXG59XHJcblxyXG52YXIgZ2VuRWxlbWVudCA9IGZ1bmN0aW9uIChmb3JjZSkge1xyXG5cclxuICB0aGlzLmJhc2UgPSB0aGlzLl9fcHJpc3RpbmVGcmFnbWVudF9fLmNsb25lTm9kZSh0cnVlKVxyXG4gIHRtcGxIYW5kbGVyKHRoaXMsIGFkZFN0YXRlKVxyXG4gIC8vIHJldHVyblxyXG4gIC8vIHZhciB0ZW1wRGl2ID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnZGl2JylcclxuICAvLyB0cGwgPSBjb21wb25lbnRQYXJzZS5jYWxsKHRoaXMsIHRwbClcclxuICAvLyB0cGwgPSBtb2RlbFBhcnNlLmNhbGwodGhpcywgdHBsKVxyXG4gIC8vIHRwbCA9IG5vZGVzVmlzaWJpbGl0eS5jYWxsKHRoaXMsIHRwbClcclxuICAvLyB0ZW1wRGl2LmlubmVySFRNTCA9IHRwbFxyXG5cclxuICAvLyBzZXRTdGF0ZS5jYWxsKHRoaXMpXHJcbiAgLy8gdGVzdEV2ZW50KHRwbCkgJiYgcHJvY2Vzc0V2ZW50LmNhbGwodGhpcywgdGVtcERpdilcclxuICBpZiAoZm9yY2UpIHtcclxuICAgIGJhdGNoUG9vbEV4ZWMuY2FsbCh0aGlzLCBmb3JjZSlcclxuICB9XHJcbn1cclxuXHJcbmV4cG9ydHMuZ2VuRWxlbWVudCA9IGdlbkVsZW1lbnRcclxuZXhwb3J0cy5hZGRTdGF0ZSA9IGFkZFN0YXRlXHJcbmV4cG9ydHMuc2V0U3RhdGUgPSBzZXRTdGF0ZVxyXG5leHBvcnRzLmNsZWFyU3RhdGUgPSBjbGVhclN0YXRlXHJcbiIsInZhciB0ZXJuYXJ5T3BzID0gcmVxdWlyZSgnLi90ZXJuYXJ5T3BzJylcclxudmFyIGNyZWF0ZU1vZGVsID0gcmVxdWlyZSgnLi4vdXRpbHMnKS5jcmVhdGVNb2RlbFxyXG52YXIgYXNzZXJ0ID0gcmVxdWlyZSgnLi4vdXRpbHMnKS5hc3NlcnRcclxuXHJcbnZhciBET0NVTUVOVF9URVhUX1RZUEUgPSAzXHJcbnZhciBtb2RlbFJhd1N0YXJ0ID0gL15cXHtcXHttb2RlbDooW157fV0rKVxcfVxcfS9nXHJcbnZhciBtb2RlbFJhd0VuZCA9IC9eXFx7XFx7XFwvbW9kZWw6KFtee31dKylcXH1cXH0vZ1xyXG5cclxubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbiAobm9kZSwgbW9kZWwsIHRtcGxIYW5kbGVyKSB7XHJcbiAgdmFyIG1vZGVsTGlzdFxyXG4gIHZhciBtTGVuZ3RoXHJcbiAgdmFyIGlcclxuICB2YXIgbGlzdENsb25lXHJcbiAgdmFyIGxpc3RcclxuXHJcbiAgdmFyIGN1cnJlbnROb2RlXHJcbiAgdmFyIGVudHJ5Tm9kZVxyXG5cclxuICB3aGlsZShub2RlKXtcclxuICAgIGN1cnJlbnROb2RlID0gbm9kZVxyXG4gICAgbm9kZSA9IG5vZGUubmV4dFNpYmxpbmdcclxuICAgIGlmKGN1cnJlbnROb2RlLm5vZGVUeXBlID09PSBET0NVTUVOVF9URVhUX1RZUEUpe1xyXG4gICAgICBpZihjdXJyZW50Tm9kZS5ub2RlVmFsdWUubWF0Y2gobW9kZWxSYXdTdGFydCkpe1xyXG4gICAgICAgIGVudHJ5Tm9kZSA9IGN1cnJlbnROb2RlXHJcbiAgICAgICAgbGlzdCA9IGVudHJ5Tm9kZS5uZXh0U2libGluZy5jbG9uZU5vZGUodHJ1ZSlcclxuICAgICAgfSBlbHNlIGlmKGN1cnJlbnROb2RlLm5vZGVWYWx1ZS5tYXRjaChtb2RlbFJhd0VuZCkpe1xyXG4gICAgICAgIGN1cnJlbnROb2RlLnJlbW92ZSgpXHJcbiAgICAgICAgLy8gc3RhciBnZW5lcmF0aW5nIHRoZSBtb2RlbCBub2RlcyByYW5nZSwgaWYgbm90IHlldFxyXG4gICAgICAgIC8vIGFwcGx5IGNvbmRpdGlvbmFsIGhhc2ggc3VtIGNoZWNrIGJlZm9yZSBkb2luZyB0aGlzXHJcbiAgICAgICAgaWYodGhpc1ttb2RlbF0gIT09IHVuZGVmaW5lZCAmJiB0aGlzW21vZGVsXS5oYXNPd25Qcm9wZXJ0eSgnbGlzdCcpKXtcclxuICAgICAgICAgICAgbW9kZWxMaXN0ID0gdGhpc1ttb2RlbF0ubGlzdFxyXG4gICAgICAgICAgICBtTGVuZ3RoID0gbW9kZWxMaXN0Lmxlbmd0aFxyXG4gICAgICAgICAgICBpID0gMFxyXG4gICAgICAgICAgICB3aGlsZShpIDwgbUxlbmd0aCl7XHJcbiAgICAgICAgICAgICAgbGlzdENsb25lID0gbGlzdC5jbG9uZU5vZGUodHJ1ZSlcclxuICAgICAgICAgICAgICB0bXBsSGFuZGxlcih0aGlzLCBudWxsLCBsaXN0Q2xvbmUsIG1vZGVsTGlzdFtpXSlcclxuICAgICAgICAgICAgICBlbnRyeU5vZGUucGFyZW50Tm9kZS5pbnNlcnRCZWZvcmUobGlzdENsb25lLCBudWxsKVxyXG4gICAgICAgICAgICAgIGkrK1xyXG4gICAgICAgICAgICB9IFxyXG4gICAgICAgIH1cclxuICAgICAgICBlbnRyeU5vZGUubmV4dFNpYmxpbmcucmVtb3ZlKClcclxuICAgICAgICBlbnRyeU5vZGUucmVtb3ZlKClcclxuXHJcbiAgICAgICAgbm9kZSA9IG51bGxcclxuICAgICAgfVxyXG4gICAgfVxyXG4gIH1cclxuXHJcbiAgLy8gdmFyIGxpc3QgPSBub2RlLm5leHRTaWJsaW5nLmNsb25lTm9kZSh0cnVlKVxyXG4gIC8vIC8vIHJlbW92ZSB0aGUgZmlyc3QgcHJvdG90eXBlIG5vZGUgXHJcbiAgLy8gbm9kZS5uZXh0U2libGluZy5yZW1vdmUoKVxyXG5cclxuICAvLyBpZih0aGlzW21vZGVsXSAhPT0gdW5kZWZpbmVkICYmIHRoaXNbbW9kZWxdLmhhc093blByb3BlcnR5KCdsaXN0Jykpe1xyXG4gIC8vICAgcGFyZW50Tm9kZSA9IG5vZGUucGFyZW50Tm9kZVxyXG4gIC8vICAgaWYobm9kZS5uZXh0U2libGluZyl7XHJcbiAgLy8gICAgIG5vZGUubmV4dFNpYmxpbmcucmVtb3ZlKCkgLy8gcmVtb3ZlIHRoZSB0ZXh0IHRhZyBmb3IgbW9kZWxFbmRcclxuICAvLyAgIH0gZWxzZSB7XHJcbiAgLy8gICAgIGFzc2VydChmYWxzZSwgJ01vZGVsIFwie3svbW9kZWw6Jyttb2RlbCsnfX1cIiBlbmNsb3NpbmcgdGFnIGRvZXMgbm90IGV4aXN0LicpXHJcbiAgLy8gICB9XHJcbiAgLy8gICBub2RlLnJlbW92ZSgpIC8vIHJlbW92ZSB0aGUgdGV4dCBmb3IgbW9kZWwgc3RhcnQgdGFnXHJcbiAgICBcclxuICAvLyAgIG1vZGVsTGlzdCA9IHRoaXNbbW9kZWxdLmxpc3RcclxuICAvLyAgIG1MZW5ndGggPSBtb2RlbExpc3QubGVuZ3RoXHJcbiAgLy8gICBpID0gMFxyXG4gIC8vICAgd2hpbGUoaSA8IG1MZW5ndGgpe1xyXG4gIC8vICAgICBsaXN0Q2xvbmUgPSBsaXN0LmNsb25lTm9kZSh0cnVlKVxyXG4gIC8vICAgICB0bXBsSGFuZGxlcih0aGlzLCBudWxsLCBsaXN0Q2xvbmUsIG1vZGVsTGlzdFtpXSlcclxuICAvLyAgICAgcGFyZW50Tm9kZS5pbnNlcnRCZWZvcmUobGlzdENsb25lLCBudWxsKVxyXG4gIC8vICAgICBpKytcclxuICAvLyAgIH0gXHJcbiAgLy8gfSBlbHNlIHtcclxuICAvLyAgIGFzc2VydChmYWxzZSwgJ01vZGVsIFwiJyttb2RlbCsnXCIgZG9lcyBub3QgZXhpc3QuJylcclxuICAvLyB9XHJcbn1cclxuIiwidmFyIHNldFN0YXRlID0gcmVxdWlyZSgnLi9nZW5FbGVtZW50Jykuc2V0U3RhdGVcclxudmFyIHRtcGxIYW5kbGVyID0gcmVxdWlyZSgnLi90bXBsSGFuZGxlcicpXHJcbnZhciBwcm9jZXNzRXZlbnQgPSByZXF1aXJlKCcuL3Byb2Nlc3NFdmVudCcpXHJcbnZhciBnZXRJZCA9IHJlcXVpcmUoJy4uL3V0aWxzJykuZ2V0SWRcclxudmFyIHRlc3RFdmVudCA9IHJlcXVpcmUoJy4uL3V0aWxzJykudGVzdEV2ZW50XHJcbnZhciBjb21wb25lbnRQYXJzZSA9IHJlcXVpcmUoJy4vY29tcG9uZW50UGFyc2UnKVxyXG4vLyB2YXIgbW9kZWxQYXJzZSA9IHJlcXVpcmUoJy4vbW9kZWxQYXJzZScpXHJcbi8vIHZhciBub2Rlc1Zpc2liaWxpdHkgPSByZXF1aXJlKCcuL25vZGVzVmlzaWJpbGl0eScpXHJcbnZhciBjaGVja05vZGVBdmFpbGFiaWxpdHkgPSByZXF1aXJlKCcuLi91dGlscycpLmNoZWNrTm9kZUF2YWlsYWJpbGl0eVxyXG52YXIgYWRkU3RhdGUgPSAgcmVxdWlyZSgnLi9nZW5FbGVtZW50JykuYWRkU3RhdGVcclxudmFyIGFzc2VydCA9IHJlcXVpcmUoJy4uL3V0aWxzJykuYXNzZXJ0XHJcblxyXG52YXIgcmVuZGVyU3ViID0gZnVuY3Rpb24gKGMsIGNOYW1lLCBub2RlKSB7XHJcbiAgYy5zdHViUmVuZGVyKHRoaXMuX19jb21wb25lbnRTdHViX19bY05hbWVdLCBub2RlKVxyXG59XHJcblxyXG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uIChzdHViKSB7XHJcblxyXG4gIC8vIHRoaXMuX19zdGF0ZUxpc3RfXyA9IHRoaXMuX19zdGF0ZUxpc3RfXyB8fCBbXVxyXG4gIC8vIHRoaXMuX19tb2RlbExpc3RfXyA9IHRoaXMuX19tb2RlbExpc3RfXyB8fCBbXVxyXG4gIC8vIHRoaXMuX19jb21wb25lbnRMaXN0X18gPSB0aGlzLl9fY29tcG9uZW50TGlzdF9fIHx8IFtdXHJcbiAgLy8gdGhpcy5fX2NvbXBvbmVudFN0dWJfXyA9IHRoaXMuX19jb21wb25lbnRTdHViX18gfHwge31cclxuICB0bXBsSGFuZGxlcih0aGlzLCBhZGRTdGF0ZSlcclxuXHJcbiAgdmFyIGVsID0gZ2V0SWQodGhpcy5lbClcclxuXHJcbiAgaWYoZWwpe1xyXG4gICAgLy8gbGlzdGVuIHRvIHN0YXRlIGNoYW5nZXNcclxuICAgIHNldFN0YXRlLmNhbGwodGhpcylcclxuICAgIC8vIG1vdW50IGZyYWdtZW50IHRvIERPTVxyXG4gICAgdGhpcy5fX2Nsb25lRnJhZ21lbnRfXyA9IHRoaXMuYmFzZS5jbG9uZU5vZGUodHJ1ZSlcclxuICAgIGVsLmFwcGVuZENoaWxkKHRoaXMuYmFzZSlcclxuICAgIC8vIHNpbmNlIGNvbXBvbmVudCBhbHJlYWR5IHJlbmRlcmVkLCB0cmlnZ2VyIGl0cyBsaWZlLWN5Y2xlIG1ldGhvZFxyXG4gICAgaWYgKHRoaXMuY29tcG9uZW50RGlkTW91bnQgJiYgdHlwZW9mIHRoaXMuY29tcG9uZW50RGlkTW91bnQgPT09ICdmdW5jdGlvbicpIHtcclxuICAgICAgdGhpcy5jb21wb25lbnREaWRNb3VudCgpXHJcbiAgICB9XHJcbiAgfSBlbHNlIHtcclxuICAgIGFzc2VydChmYWxzZSwgJ05vIGVsZW1lbnQgd2l0aCBpZDogXCInICsgdGhpcy5lbCArICdcIiBleGlzdC4nKVxyXG4gIH1cclxuICByZXR1cm4gXHJcbiAgLy8gdHBsID0gdG1wbEhhbmRsZXIuY2FsbCh0aGlzLCBmdW5jdGlvbiAoc3RhdGUpIHtcclxuICAvLyAgIGlmICghfnNlbGYuX19zdGF0ZUxpc3RfXy5pbmRleE9mKHN0YXRlKSkgc2VsZi5fX3N0YXRlTGlzdF9fID0gc2VsZi5fX3N0YXRlTGlzdF9fLmNvbmNhdChzdGF0ZSlcclxuICAvLyB9KVxyXG4gIC8vIHRwbCA9IGNvbXBvbmVudFBhcnNlLmNhbGwodGhpcywgdHBsKVxyXG4gIC8vIHRwbCA9IG1vZGVsUGFyc2UuY2FsbCh0aGlzLCB0cGwpXHJcbiAgLy8gdHBsID0gbm9kZXNWaXNpYmlsaXR5LmNhbGwodGhpcywgdHBsKVxyXG4gIGlmIChzdHViKSB7XHJcbiAgICByZXR1cm4gdHBsXHJcbiAgfSBlbHNlIHtcclxuICAgIGVsID0gZ2V0SWQodGhpcy5lbClcclxuICAgIGlmIChlbCkge1xyXG4gICAgICBlbC5pbm5lckhUTUwgPSB0cGxcclxuICAgICAgLy8gdGhpcy5fX2NvbXBvbmVudExpc3RfXy5tYXAoZnVuY3Rpb24gKGNvbXBvbmVudE5hbWUpIHtcclxuICAgICAgLy8gICB2YXIgY29tcG9uZW50ID0gc2VsZltjb21wb25lbnROYW1lXVxyXG4gICAgICAvLyAgIGlmIChjb21wb25lbnQpIHtcclxuICAgICAgLy8gICAgIC8vIGRvIGluaXRpYWwgY2hlY2tpbmcgb2YgdGhlIG5vZGUgYXZhaWxhYmlsaXR5XHJcbiAgICAgIC8vICAgICB2YXIgbm9kZSA9IGNoZWNrTm9kZUF2YWlsYWJpbGl0eShjb21wb25lbnQsIGNvbXBvbmVudE5hbWUsIHJlbmRlclN1Yi5iaW5kKHNlbGYpKVxyXG4gICAgICAvLyAgICAgaWYgKG5vZGUpIHJlbmRlclN1Yi5jYWxsKHNlbGYsIGNvbXBvbmVudCwgY29tcG9uZW50TmFtZSwgbm9kZSlcclxuICAgICAgLy8gICB9XHJcbiAgICAgIC8vIH0pXHJcbiAgICAgIHNldFN0YXRlLmNhbGwodGhpcylcclxuICAgICAgdGVzdEV2ZW50KHRwbCkgJiYgcHJvY2Vzc0V2ZW50LmNhbGwodGhpcywgZWwpXHJcblxyXG4gICAgICAvLyBzaW5jZSBjb21wb25lbnQgYWxyZWFkeSByZW5kZXJlZCwgdHJpZ2dlciBpdHMgbGlmZS1jeWNsZSBtZXRob2RcclxuICAgICAgaWYgKHRoaXMuY29tcG9uZW50RGlkTW91bnQgJiYgdHlwZW9mIHRoaXMuY29tcG9uZW50RGlkTW91bnQgPT09ICdmdW5jdGlvbicpIHtcclxuICAgICAgICB0aGlzLmNvbXBvbmVudERpZE1vdW50KClcclxuICAgICAgfVxyXG4gICAgfVxyXG4gIH1cclxuICBcclxufVxyXG4iLCJ2YXIgbG9vcENoaWxkcyA9IHJlcXVpcmUoJy4uL3V0aWxzJykubG9vcENoaWxkc1xyXG5cclxudmFyIG5leHQgPSBmdW5jdGlvbiAoaSwgYywgcmVtKSB7XHJcbiAgdmFyIGhhc2tcclxuICB2YXIgZXZ0TmFtZVxyXG4gIHZhciBoYW5kbGVyXHJcbiAgdmFyIGhhbmRsZXJBcmdzXHJcbiAgdmFyIGlzSGFuZGxlclxyXG4gIHZhciBhcmd2XHJcbiAgdmFyIHZcclxuICB2YXIgaFxyXG4gIHZhciBhdHRzID0gYy5hdHRyaWJ1dGVzXHJcblxyXG4gIGlmIChpIDwgYXR0cy5sZW5ndGgpIHtcclxuICAgIGhhc2sgPSAvXmstLy50ZXN0KGF0dHNbaV0ubm9kZU5hbWUpXHJcbiAgICBpZiAoaGFzaykge1xyXG4gICAgICBldnROYW1lID0gYXR0c1tpXS5ub2RlTmFtZS5yZXBsYWNlKC9eW14tXSstLywgJycpXHJcbiAgICAgIGhhbmRsZXIgPSBhdHRzW2ldLm5vZGVWYWx1ZS5tYXRjaCgvW2EtekEtWl0rKD8hW14oXSpcXCkpLylbMF1cclxuICAgICAgaCA9IGF0dHNbaV0ubm9kZVZhbHVlLm1hdGNoKC9cXCgoW157fV0rKVxcKS8pXHJcbiAgICAgIGhhbmRsZXJBcmdzID0gaCA/IGhbMV0gOiAnJ1xyXG4gICAgICBpc0hhbmRsZXIgPSB0aGlzW2hhbmRsZXJdXHJcbiAgICAgIGlmICh0eXBlb2YgaXNIYW5kbGVyID09PSAnZnVuY3Rpb24nKSB7XHJcbiAgICAgICAgcmVtLnB1c2goYXR0c1tpXS5ub2RlTmFtZSlcclxuICAgICAgICBhcmd2ID0gW11cclxuICAgICAgICB2ID0gaGFuZGxlckFyZ3Muc3BsaXQoJywnKS5maWx0ZXIoZnVuY3Rpb24gKGYpIHsgcmV0dXJuIGYgIT09ICcnIH0pXHJcbiAgICAgICAgaWYgKHYubGVuZ3RoKSB2Lm1hcChmdW5jdGlvbiAodikgeyBhcmd2LnB1c2godikgfSlcclxuICAgICAgICBjLmFkZEV2ZW50TGlzdGVuZXIoZXZ0TmFtZSwgaXNIYW5kbGVyLmJpbmQuYXBwbHkoaXNIYW5kbGVyLmJpbmQodGhpcyksIFtjXS5jb25jYXQoYXJndikpLCBmYWxzZSlcclxuICAgICAgfVxyXG4gICAgfVxyXG4gICAgaSsrXHJcbiAgICBuZXh0LmFwcGx5KHRoaXMsIFsgaSwgYywgcmVtIF0pXHJcbiAgfSBlbHNlIHtcclxuICAgIHJlbS5tYXAoZnVuY3Rpb24gKGYpIHsgYy5yZW1vdmVBdHRyaWJ1dGUoZikgfSlcclxuICB9XHJcbn1cclxuXHJcbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24gKGtOb2RlKSB7XHJcbiAgdmFyIHNlbGYgPSB0aGlzXHJcbiAgdmFyIGxpc3RLbm9kZUNoaWxkID0gW11cclxuICB2YXIgcmVtID0gW11cclxuICBsb29wQ2hpbGRzKGxpc3RLbm9kZUNoaWxkLCBrTm9kZSlcclxuICBsaXN0S25vZGVDaGlsZC5tYXAoZnVuY3Rpb24gKGMpIHtcclxuICAgIGlmIChjLm5vZGVUeXBlID09PSAxICYmIGMuaGFzQXR0cmlidXRlcygpKSB7XHJcbiAgICAgIG5leHQuYXBwbHkoc2VsZiwgWyAwLCBjLCByZW0gXSlcclxuICAgIH1cclxuICB9KVxyXG4gIGxpc3RLbm9kZUNoaWxkID0gW11cclxufVxyXG4iLCJtb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uIChzdHIpIHtcclxuICB2YXIgcmVzID0gc3RyLm1hdGNoKC9cXC4qXFwuL2cpXHJcbiAgdmFyIHJlc3VsdFxyXG4gIGlmIChyZXMgJiYgcmVzLmxlbmd0aCA+IDApIHtcclxuICAgIHJldHVybiBzdHIuc3BsaXQoJy4nKVxyXG4gIH1cclxuICByZXR1cm4gcmVzdWx0XHJcbn1cclxuIiwiLy8gZnVuY3Rpb24gdG8gcmVzb2x2ZSB0ZXJuYXJ5IG9wZXJhdGlvblxyXG5cclxuZnVuY3Rpb24gdGVzdCAoc3RyKSB7XHJcbiAgaWYgKHN0ciA9PT0gJ1xcJ1xcJycgfHwgc3RyID09PSAnXCJcIicgfHwgc3RyID09PSAnbnVsbCcpIHsgcmV0dXJuICcnIH1cclxuICByZXR1cm4gc3RyXHJcbn1cclxuXHJcbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24gKGlucHV0KSB7XHJcbiAgaWYgKGlucHV0Lm1hdGNoKC8oW14/XSopXFw/KFteOl0qKTooW147XSopfChcXHMqPVxccyopW147XSovZykpIHtcclxuICAgIHZhciB0ID0gaW5wdXQuc3BsaXQoJz8nKVxyXG4gICAgdmFyIGNvbmRpdGlvbiA9IHRbMF1cclxuICAgIHZhciBsZWZ0SGFuZCA9IHRbMV0uc3BsaXQoJzonKVswXVxyXG4gICAgdmFyIHJpZ2h0SGFuZCA9IHRbMV0uc3BsaXQoJzonKVsxXVxyXG5cclxuICAgIC8vIGNoZWNrIHRoZSBjb25kaXRpb24gZnVsZmlsbG1lbnRcclxuICAgIC8vIGNvbnNvbGUubG9nKHRoaXMpXHJcbiAgICBpZiAodGhpc1tjb25kaXRpb25dKSB7XHJcbiAgICAgIHJldHVybiB7XHJcbiAgICAgICAgdmFsdWU6IHRlc3QobGVmdEhhbmQpLFxyXG4gICAgICAgIHN0YXRlOiBjb25kaXRpb25cclxuICAgICAgfVxyXG4gICAgfSBlbHNlIHtcclxuICAgICAgcmV0dXJuIHtcclxuICAgICAgICB2YWx1ZTogdGVzdChyaWdodEhhbmQpLFxyXG4gICAgICAgIHN0YXRlOiBjb25kaXRpb25cclxuICAgICAgfVxyXG4gICAgfVxyXG4gIH0gZWxzZSByZXR1cm4gZmFsc2VcclxufVxyXG4iLCJ2YXIgc3RySW50ZXJwcmV0ZXIgPSByZXF1aXJlKCcuL3N0ckludGVycHJldGVyJylcclxudmFyIHRlcm5hcnlPcHMgPSByZXF1aXJlKCcuL3Rlcm5hcnlPcHMnKVxyXG52YXIgZ2V0SWQgPSByZXF1aXJlKCcuLi91dGlscycpLmdldElkXHJcbnZhciBnZW5Nb2RlbExpc3QgPSByZXF1aXJlKCcuL2dlbk1vZGVsTGlzdCcpXHJcbnZhciBjb25kaXRpb25hbE5vZGVzID0gcmVxdWlyZSgnLi9jb25kaXRpb25hbE5vZGVzJylcclxuXHJcbnZhciBET0NVTUVOVF9GUkFHTUVOVF9UWVBFID0gMTFcclxudmFyIERPQ1VNRU5UX1RFWFRfVFlQRSA9IDNcclxudmFyIERPQ1VNRU5UX0VMRU1FTlRfVFlQRSA9IDFcclxudmFyIERPQ1VNRU5UX0NPTU1FTlRfVFlQRSA9IDhcclxudmFyIERPQ1VNRU5UX0FUVFJJQlVURV9UWVBFID0gMlxyXG5cclxudmFyIHJlID0gL3t7KFtee31dKyl9fS9nXHJcblxyXG52YXIgbW9kZWwgPSAvXm1vZGVsOi9nXHJcbnZhciBtb2RlbFJhdyA9IC9eXFx7XFx7bW9kZWw6KFtee31dKylcXH1cXH0vZ1xyXG5cclxudmFyIGNvbmRpdGlvbmFsUmUgPSAvXlxcPy9nXHJcblxyXG52YXIgdG9Ta2lwU3RvcmUgPSBbXVxyXG52YXIgc2tpcE5vZGUgPSBbXVxyXG5cclxudmFyIHRtcGxoYW5kbGVyID0gZnVuY3Rpb24gKGN0eCwgdXBkYXRlU3RhdGVMaXN0LCBtb2RlbEluc3RhbmNlLCBtb2RlbE9iamVjdCwgY29uZGl0aW9uYWwsIGNvbmRpdGlvbmFsU3RhdGUpIHtcclxuXHJcbiAgdmFyIGN1cnJlbnROb2RlXHJcbiAgdmFyIHN0clxyXG4gIHZhciB2YWwgXHJcbiAgdmFyIHR5cGVcclxuICB2YXIgbG4gXHJcbiAgdmFyIHByb3BzIFxyXG4gIHZhciByZXBcclxuICB2YXIgZnJhZ21lbnRcclxuICB2YXIgaW5zdGFuY2VcclxuICB2YXIgbm9kZUF0dHJpYnV0ZXNcclxuICB2YXIgaSA9IDBcclxuICB2YXIgYVxyXG4gIHZhciBuc1xyXG4gIHZhciBldnROYW1lXHJcbiAgdmFyIGNcclxuICB2YXIgaFxyXG4gIHZhciBoYW5kbGVyQXJnc1xyXG4gIHZhciBhcmd2XHJcbiAgdmFyIGhhbmRsZXJcclxuICB2YXIgdG5yIFxyXG4gIHZhciBtb2RlbFJlcFxyXG4gIHZhciBjb25kaXRpb25hbFJlcFxyXG4gIHZhciBmbiBcclxuICB2YXIgZWxcclxuICB2YXIgaWR4XHJcbiAgdmFyIHJlbSA9IFtdXHJcbiAgdmFyIGlzT2JqZWN0Tm90YXRpb25cclxuXHJcbiAgaWYobW9kZWxPYmplY3Qpe1xyXG4gICAgaW5zdGFuY2UgPSBtb2RlbEluc3RhbmNlXHJcbiAgfSBlbHNlIGlmKGNvbmRpdGlvbmFsKXtcclxuICAgIGluc3RhbmNlID0gY29uZGl0aW9uYWwuZmlyc3RDaGlsZFxyXG4gICAgLy8gY2xlYW4gdXAgY2FjaGUgbm9kZXMgZm9yIGV2ZW50c1xyXG4gICAgLy8gY29uc29sZS5sb2coY29uZGl0aW9uYWxTdGF0ZSlcclxuICAgIGlmKCFjb25kaXRpb25hbFN0YXRlKXtcclxuICAgICAgLy8gdG9Ta2lwU3RvcmUgPSBbXVxyXG4gICAgICAvLyBza2lwTm9kZSA9IFtdXHJcbiAgICB9XHJcbiAgfSBlbHNlIHtcclxuICAgIGZyYWdtZW50ID0gY3R4LmJhc2VcclxuICAgIGluc3RhbmNlID0gZnJhZ21lbnQuZmlyc3RDaGlsZFxyXG4gIH1cclxuXHJcbiAgdmFyIGlucyA9IG1vZGVsT2JqZWN0IHx8IGN0eFxyXG5cclxuICBmdW5jdGlvbiB1cGRhdGVTdGF0ZShzdGF0ZSl7XHJcbiAgICBpZih0eXBlb2YgdXBkYXRlU3RhdGVMaXN0ID09PSAnZnVuY3Rpb24nKXtcclxuICAgICAgdXBkYXRlU3RhdGVMaXN0KHN0YXRlKVxyXG4gICAgfVxyXG4gIH1cclxuXHJcbiAgZnVuY3Rpb24gcmVwbGFjZUhhbmRsZUJhcnModmFsdWUsIG5vZGUpIHtcclxuICAgIHByb3BzID0gdmFsdWUubWF0Y2gocmUpXHJcbiAgICBsbiA9IHByb3BzLmxlbmd0aFxyXG4gICAgd2hpbGUgKGxuKSB7XHJcbiAgICAgIGxuLS1cclxuICAgICAgcmVwID0gcHJvcHNbbG5dLnJlcGxhY2UocmUsICckMScpXHJcbiAgICAgIHRuciA9IHRlcm5hcnlPcHMuY2FsbChpbnMsIHJlcClcclxuICAgICAgaXNPYmplY3ROb3RhdGlvbiA9IHN0ckludGVycHJldGVyKHJlcClcclxuICAgICAgaWYoaXNPYmplY3ROb3RhdGlvbil7XHJcbiAgICAgICAgdXBkYXRlU3RhdGUocmVwKVxyXG4gICAgICAgIHZhbHVlID0gdmFsdWUucmVwbGFjZSgne3snICsgcmVwICsgJ319JywgaW5zW2lzT2JqZWN0Tm90YXRpb25bMF1dW2lzT2JqZWN0Tm90YXRpb25bMV1dKVxyXG4gICAgICB9IGVsc2Uge1xyXG4gICAgICAgIGlmKHRucil7XHJcbiAgICAgICAgICB1cGRhdGVTdGF0ZSh0bnIuc3RhdGUpXHJcbiAgICAgICAgICB2YWx1ZSA9IHZhbHVlLnJlcGxhY2UoJ3t7JytyZXArJ319JywgdG5yLnZhbHVlKVxyXG4gICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICBpZihyZXAubWF0Y2gobW9kZWwpKXtcclxuICAgICAgICAgICAgbW9kZWxSZXAgPSByZXAucmVwbGFjZSgnbW9kZWw6JywgJycpXHJcbiAgICAgICAgICAgIC8vIGdlbmVyYXRlIGxpc3QgbW9kZWxcclxuICAgICAgICAgICAgZ2VuTW9kZWxMaXN0LmNhbGwoY3R4LCBub2RlLCBtb2RlbFJlcCwgdG1wbGhhbmRsZXIpXHJcbiAgICAgICAgICB9IGVsc2UgaWYocmVwLm1hdGNoKGNvbmRpdGlvbmFsUmUpKXtcclxuICAgICAgICAgICAgY29uZGl0aW9uYWxSZXAgPSByZXAucmVwbGFjZSgnPycsICcnKVxyXG4gICAgICAgICAgICBpZihpbnNbY29uZGl0aW9uYWxSZXBdICE9PSB1bmRlZmluZWQpe1xyXG4gICAgICAgICAgICAgIHVwZGF0ZVN0YXRlKGNvbmRpdGlvbmFsUmVwKVxyXG4gICAgICAgICAgICAgIC8vIHByb2Nlc3MgY29uZGl0aW9uYWwgbm9kZXNcclxuICAgICAgICAgICAgICBjb25kaXRpb25hbE5vZGVzLmNhbGwoY3R4LCBub2RlLCBjb25kaXRpb25hbFJlcCwgdG1wbGhhbmRsZXIpXHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgIGlmKGluc1tyZXBdICE9PSB1bmRlZmluZWQpe1xyXG4gICAgICAgICAgICAgIHVwZGF0ZVN0YXRlKHJlcClcclxuICAgICAgICAgICAgICB2YWx1ZSA9IHZhbHVlLnJlcGxhY2UoJ3t7JytyZXArJ319JywgaW5zW3JlcF0pXHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgIH1cclxuICAgICAgICB9XHJcbiAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICByZXR1cm4gdmFsdWVcclxuICB9XHJcblxyXG4gIGZ1bmN0aW9uIGluc3BlY3Qobm9kZSl7XHJcbiAgICAvLyBjb25zb2xlLmxvZyhub2RlKVxyXG4gICAgdHlwZSA9IG5vZGUubm9kZVR5cGVcclxuICAgIHZhbCA9IG5vZGUubm9kZVZhbHVlXHJcbiAgICBpZih2YWwubWF0Y2gocmUpKXtcclxuICAgICAgdmFsID0gcmVwbGFjZUhhbmRsZUJhcnModmFsLCBub2RlKVxyXG4gICAgICBub2RlLm5vZGVWYWx1ZSA9IHZhbFxyXG4gICAgfVxyXG4gICAgY29uc29sZS5sb2cobm9kZS5wYXJlbnROb2RlKVxyXG4gIH1cclxuXHJcbiAgZnVuY3Rpb24gaW5zcGVjdEF0dHJpYnV0ZXMobm9kZSl7XHJcbiAgICBub2RlQXR0cmlidXRlcyA9IG5vZGUuYXR0cmlidXRlc1xyXG4gICAgZm9yIChpID0gbm9kZUF0dHJpYnV0ZXMubGVuZ3RoOyBpLS07KSB7XHJcbiAgICAgIGEgPSBub2RlQXR0cmlidXRlc1tpXVxyXG4gICAgICBuYW1lID0gYS5sb2NhbE5hbWVcclxuICAgICAgbnMgPSBhLm5vZGVWYWx1ZVxyXG4gICAgICBpZiAocmUudGVzdChuYW1lKSkge1xyXG4gICAgICAgIG5vZGUucmVtb3ZlQXR0cmlidXRlKG5hbWUpXHJcbiAgICAgICAgdmFyIHRlbXAgPSBuYW1lXHJcbiAgICAgICAgbmFtZSA9IHJlcGxhY2VIYW5kbGVCYXJzKG5hbWUpXHJcbiAgICAgICAgbm9kZS5zZXRBdHRyaWJ1dGUobmFtZSwgbnMpXHJcbiAgICAgIH0gZWxzZSBpZihyZS50ZXN0KG5zKSl7XHJcbiAgICAgICAgbnMgPSByZXBsYWNlSGFuZGxlQmFycyhucylcclxuICAgICAgICBpZihucyA9PT0gJycpe1xyXG4gICAgICAgICAgbm9kZS5yZW1vdmVBdHRyaWJ1dGUobmFtZSlcclxuICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgaWYobmFtZSA9PT0gJ2NoZWNrZWQnKXtcclxuICAgICAgICAgICAgbm9kZS5zZXRBdHRyaWJ1dGUobmFtZSwgJycpXHJcbiAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICBub2RlLnNldEF0dHJpYnV0ZShuYW1lLCBucylcclxuICAgICAgICAgIH1cclxuICAgICAgICB9XHJcbiAgICAgIH1cclxuICAgIH1cclxuICB9XHJcblxyXG4gIGZ1bmN0aW9uIGxvb2tVcEV2dE5vZGUobm9kZSl7XHJcbiAgICB2YXIgcmVhbE5vZGVcclxuICAgIGlmKG5vZGUuaWQpe1xyXG4gICAgICByZWFsTm9kZSA9IGdldElkKG5vZGUuaWQpXHJcbiAgICB9XHJcbiAgICBpZihyZWFsTm9kZSAmJiByZWFsTm9kZS5oYXNBdHRyaWJ1dGUoJ2V2dC1ub2RlJykpe1xyXG4gICAgICByZXR1cm4gdHJ1ZVxyXG4gICAgfSBlbHNlIHtcclxuICAgICAgcmV0dXJuIGZhbHNlXHJcbiAgICB9XHJcbiAgICAvLyBpZihub2RlLmhhc0F0dHJpYnV0ZSgnaWQnKSl7XHJcbiAgICAvLyAgIGlkeCA9IHNraXBOb2RlLmluZGV4T2Yobm9kZS5pZClcclxuICAgIC8vICAgaWYofmlkeCl7XHJcbiAgICAvLyAgICAgcmV0dXJuIHRydWVcclxuICAgIC8vICAgfSBlbHNlIHtcclxuICAgIC8vICAgICByZXR1cm4gZmFsc2VcclxuICAgIC8vICAgfVxyXG4gICAgLy8gfVxyXG4gIH1cclxuXHJcbiAgZnVuY3Rpb24gYWRkVG9Ta2lwTm9kZShzdG9yZSwgbm9kZUlkKXtcclxuICAgIGlkeCA9IHN0b3JlLmluZGV4T2Yobm9kZUlkKVxyXG4gICAgaWYoIX5pZHgpe1xyXG4gICAgICBzdG9yZS5wdXNoKG5vZGVJZClcclxuICAgIH1cclxuICB9XHJcblxyXG4gIGZ1bmN0aW9uIGxvb2t1cFBhcmVudE5vZGUocm9vdE5vZGUsIG5vZGUsIGFyZ3Ype1xyXG4gICAgd2hpbGUobm9kZSl7XHJcbiAgICAgIGlmKG5vZGUuY2xhc3NOYW1lKXtcclxuICAgICAgICBhcmd2LnB1c2gobm9kZS5jbGFzc05hbWUpXHJcbiAgICAgIH1cclxuICAgICAgaWYobm9kZS5pZCl7XHJcbiAgICAgICAgYXJndi5wdXNoKG5vZGUuaWQpXHJcbiAgICAgIH1cclxuICAgICAgbm9kZSA9IG5vZGUucGFyZW50Tm9kZVxyXG4gICAgICBpZihub2RlLmlzRXF1YWxOb2RlKHJvb3ROb2RlKSl7XHJcbiAgICAgICAgbm9kZSA9IG51bGxcclxuICAgICAgfVxyXG4gICAgfVxyXG4gICAgcmV0dXJuIGFyZ3ZcclxuICB9XHJcblxyXG4gIGZ1bmN0aW9uIGFkZEV2ZW50KG5vZGUpe1xyXG4gICAgbm9kZUF0dHJpYnV0ZXMgPSBub2RlLmF0dHJpYnV0ZXNcclxuICAgIGlmKG5vZGUgJiYgbG9va1VwRXZ0Tm9kZShub2RlKSkge1xyXG4gICAgICAvLyBza2lwIGFkZGRpbmcgZXZlbnQgZm9yIG5vZGUgdGhhdCBhbHJlYWR5IGhhcyBldmVudFxyXG4gICAgICAvLyB0byBhbGxvdyBza2lwcGluZyBhZGRpbmcgZXZlbnQgdGhlIG5vZGUgbXVzdCBpbmNsdWRlIGBpZGAvXHJcbiAgICAgIC8vIGNvbnNvbGUudHJhY2UoMSlcclxuICAgICAgLy8gY29uc29sZS5sb2cobm9kZSwgJ2hhcyBldnQnKVxyXG4gICAgfSBlbHNlIHtcclxuICAgICAgLy8gb25seSBhZGQgZXZlbnQgd2hlbiBub2RlIGRvZXMgbm90IGhhcyBvbmVcclxuICAgICAgLy8gY29uc29sZS5sb2cobm9kZSwgJ2FkZGluZyBldnQnKVxyXG4gICAgICBmb3IgKGkgPSBub2RlQXR0cmlidXRlcy5sZW5ndGg7IGktLTspIHtcclxuICAgICAgICBhID0gbm9kZUF0dHJpYnV0ZXNbaV1cclxuICAgICAgICBuYW1lID0gYS5sb2NhbE5hbWVcclxuICAgICAgICBucyA9IGEubm9kZVZhbHVlXHJcbiAgICAgICAgaWYgKC9eay0vLnRlc3QobmFtZSkpIHtcclxuICAgICAgICAgIGV2dE5hbWUgPSBuYW1lLnJlcGxhY2UoL15rLS8sICcnKVxyXG4gICAgICAgICAgaGFuZGxlciA9IG5zLm1hdGNoKC9bYS16QS1aXSsoPyFbXihdKlxcKSkvKVswXVxyXG4gICAgICAgICAgYyA9IGN0eFtoYW5kbGVyXVxyXG4gICAgICAgICAgaWYoYyAhPT0gdW5kZWZpbmVkICYmIHR5cGVvZiBjID09PSAnZnVuY3Rpb24nKXtcclxuICAgICAgICAgICAgaCA9IG5zLm1hdGNoKC9cXCgoW157fV0rKVxcKS8pXHJcbiAgICAgICAgICAgIGhhbmRsZXJBcmdzID0gaCA/IGhbMV0gOiAnJ1xyXG4gICAgICAgICAgICBhcmd2ID0gaGFuZGxlckFyZ3Muc3BsaXQoJywnKS5maWx0ZXIoZnVuY3Rpb24oZil7XHJcbiAgICAgICAgICAgICAgcmV0dXJuIGYgIT09ICcnXHJcbiAgICAgICAgICAgIH0pXHJcbiAgICAgICAgICAgIHJlbS5wdXNoKG5hbWUpXHJcbiAgICAgICAgICAgIGZuID0gZnVuY3Rpb24oZSl7XHJcbiAgICAgICAgICAgICAgaWYgKGUudGFyZ2V0ICE9PSBlLmN1cnJlbnRUYXJnZXQpIHtcclxuICAgICAgICAgICAgICAgIGFyZ3YgPSBsb29rdXBQYXJlbnROb2RlKG5vZGUsIGUudGFyZ2V0LCBbXSlcclxuICAgICAgICAgICAgICAgIGMuYXBwbHkoY3R4LCBhcmd2LmNvbmNhdChlKSlcclxuICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgZS5zdG9wUHJvcGFnYXRpb24oKVxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIC8vIGlmIG5vZGUgaXMgdGhlIHJvb3ROb2RlIGZvciBtb2RlbCwgd2Ugd3JhcCB0aGUgZXZlbnRMaXN0ZW5lciBhbmRcclxuICAgICAgICAgICAgLy8gcmVidWlsZCB0aGUgYXJndW1lbnRzIGJ5IGFwcGVuZGluZyBpZC9jbGFzc05hbWUgdXRpbCByb290Tm9kZS5cclxuICAgICAgICAgICAgaWYobm9kZS5oYXNDaGlsZE5vZGVzKCkgJiYgbm9kZS5maXJzdENoaWxkLm5vZGVUeXBlID09PSBET0NVTUVOVF9URVhUX1RZUEUgJiYgbm9kZS5maXJzdENoaWxkLm5vZGVWYWx1ZS5tYXRjaChtb2RlbFJhdykpe1xyXG4gICAgICAgICAgICAgIG5vZGUuYWRkRXZlbnRMaXN0ZW5lcihldnROYW1lLCBmbiwgZmFsc2UpXHJcbiAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgbm9kZS5hZGRFdmVudExpc3RlbmVyKGV2dE5hbWUsIGMuYmluZC5hcHBseShjLmJpbmQoY3R4KSwgW25vZGVdLmNvbmNhdChhcmd2KSksIGZhbHNlKVxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIG5vZGUuc2V0QXR0cmlidXRlKCdldnQtbm9kZScsICcnKVxyXG4gICAgICAgICAgICB2YXIgcHJpc3RpbmVOb2RlID0gY3R4Ll9fcHJpc3RpbmVGcmFnbWVudF9fLmdldEVsZW1lbnRCeUlkKG5vZGUuaWQpXHJcbiAgICAgICAgICAgIGlmKHByaXN0aW5lTm9kZSl7XHJcbiAgICAgICAgICAgICAgcHJpc3RpbmVOb2RlLnNldEF0dHJpYnV0ZSgnZXZ0LW5vZGUnLCAnJylcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAvLyBpZihub2RlLmhhc0F0dHJpYnV0ZSgnaWQnKSl7XHJcbiAgICAgICAgICAgIC8vICAgYWRkVG9Ta2lwTm9kZSh0b1NraXBTdG9yZSwgbm9kZS5pZClcclxuICAgICAgICAgICAgY29uc29sZS5sb2cobm9kZS5pZClcclxuICAgICAgICAgICAgICAvLyBjb25zb2xlLmxvZyhub2RlLCAnYWRkaW5nIGV2dCcpXHJcbiAgICAgICAgICAgIC8vIH1cclxuICAgICAgICAgIH1cclxuICAgICAgICB9XHJcbiAgICAgICAgLy8gaWYoaSA9PT0gMCl7XHJcbiAgICAgICAgLy8gICByZW0ubWFwKGZ1bmN0aW9uIChmKSB7IG5vZGUucmVtb3ZlQXR0cmlidXRlKGYpIH0pXHJcbiAgICAgICAgLy8gfVxyXG4gICAgICB9XHJcbiAgICB9IFxyXG4gIH1cclxuXHJcbiAgdmFyIHRcclxuICB2YXIgc3RhcnQgPSBEYXRlLm5vdygpXHJcblxyXG4gIGZ1bmN0aW9uIGVuZCh0aW1lKXtcclxuXHJcbiAgICBpZih0KSBjbGVhclRpbWVvdXQodClcclxuXHJcbiAgICB0ID0gc2V0VGltZW91dChmdW5jdGlvbigpe1xyXG5cclxuICAgICAgLy8gdG9Ta2lwU3RvcmUubWFwKGZ1bmN0aW9uKHNraXApe1xyXG4gICAgICAvLyAgIGFkZFRvU2tpcE5vZGUoc2tpcE5vZGUsIHNraXApXHJcbiAgICAgIC8vICAgdmFyIG5vZGUgPSBjdHguX19wcmlzdGluZUZyYWdtZW50X18uZ2V0RWxlbWVudEJ5SWQoc2tpcClcclxuICAgICAgLy8gICBpZighbm9kZSkgcmV0dXJuXHJcbiAgICAgIC8vICAgbm9kZUF0dHJpYnV0ZXMgPSBub2RlLmF0dHJpYnV0ZXNcclxuICAgICAgLy8gICBmb3IgKGkgPSBub2RlQXR0cmlidXRlcy5sZW5ndGg7IGktLTspIHtcclxuICAgICAgLy8gICAgIGEgPSBub2RlQXR0cmlidXRlc1tpXVxyXG4gICAgICAvLyAgICAgbmFtZSA9IGEubG9jYWxOYW1lXHJcbiAgICAgIC8vICAgICBpZiAoL15rLS8udGVzdChuYW1lKSkge1xyXG4gICAgICAvLyAgICAgICBub2RlLnJlbW92ZUF0dHJpYnV0ZShuYW1lKVxyXG4gICAgICAvLyAgICAgfVxyXG4gICAgICAvLyAgIH1cclxuICAgICAgLy8gfSlcclxuXHJcbiAgICAgIC8vIGNvbnNvbGUubG9nKCdlbmQnLCB0aW1lKVxyXG5cclxuICAgIH0pXHJcbiAgfVxyXG5cclxuICBmdW5jdGlvbiBjaGVjayhub2RlKXtcclxuICAgIHdoaWxlKG5vZGUpe1xyXG4gICAgICBjdXJyZW50Tm9kZSA9IG5vZGVcclxuICAgICAgaWYoY3VycmVudE5vZGUubm9kZVR5cGUgPT09IERPQ1VNRU5UX0VMRU1FTlRfVFlQRSl7XHJcbiAgICAgICAgaWYoY3VycmVudE5vZGUuaGFzQXR0cmlidXRlcygpKXtcclxuICAgICAgICAgIGFkZEV2ZW50KGN1cnJlbnROb2RlKVxyXG4gICAgICAgICAgaW5zcGVjdEF0dHJpYnV0ZXMoY3VycmVudE5vZGUpXHJcbiAgICAgICAgfVxyXG4gICAgICAgIGNoZWNrKGN1cnJlbnROb2RlLmZpcnN0Q2hpbGQpXHJcbiAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgaW5zcGVjdChjdXJyZW50Tm9kZSlcclxuICAgICAgfVxyXG4gICAgICBub2RlID0gbm9kZS5uZXh0U2libGluZyB8fCBlbmQoRGF0ZS5ub3coKSAtIHN0YXJ0KVxyXG4gICAgfSBcclxuICB9XHJcblxyXG4gIGNoZWNrKGluc3RhbmNlKVxyXG5cclxuICAvLyByZXR1cm5cclxuICAvLyB2YXIgYXJyUHJvcHMgPSBzdHIubWF0Y2goL3t7KFtee31dKyl9fS9nKVxyXG4gIC8vIGlmIChhcnJQcm9wcyAmJiBhcnJQcm9wcy5sZW5ndGgpIHtcclxuICAvLyAgIGFyclByb3BzLm1hcChmdW5jdGlvbiAocykge1xyXG4gIC8vICAgICB2YXIgcmVwID0gcy5yZXBsYWNlKC97eyhbXnt9XSspfX0vZywgJyQxJylcclxuICAvLyAgICAgdmFyIGlzT2JqZWN0Tm90YXRpb24gPSBzdHJJbnRlcnByZXRlcihyZXApXHJcbiAgLy8gICAgIHZhciBpc1Rlcm5hcnkgPSB0ZXJuYXJ5T3BzLmNhbGwoc2VsZiwgcmVwKVxyXG4gIC8vICAgICBpZiAoIWlzT2JqZWN0Tm90YXRpb24pIHtcclxuICAvLyAgICAgICBpZiAoc2VsZltyZXBdICE9PSB1bmRlZmluZWQpIHtcclxuICAvLyAgICAgICAgIHVwZGF0ZVN0YXRlTGlzdChyZXApXHJcbiAgLy8gICAgICAgICBzdHIgPSBzdHIucmVwbGFjZSgne3snICsgcmVwICsgJ319Jywgc2VsZltyZXBdKVxyXG4gIC8vICAgICAgIH0gZWxzZSBpZiAoaXNUZXJuYXJ5KSB7XHJcbiAgLy8gICAgICAgICB1cGRhdGVTdGF0ZUxpc3QoaXNUZXJuYXJ5LnN0YXRlKVxyXG4gIC8vICAgICAgICAgc3RyID0gc3RyLnJlcGxhY2UoJ3t7JyArIHJlcCArICd9fScsIGlzVGVybmFyeS52YWx1ZSlcclxuICAvLyAgICAgICB9XHJcbiAgLy8gICAgIH0gZWxzZSB7XHJcbiAgLy8gICAgICAgdXBkYXRlU3RhdGVMaXN0KHJlcClcclxuICAvLyAgICAgICBzdHIgPSBzdHIucmVwbGFjZSgne3snICsgcmVwICsgJ319Jywgc2VsZltpc09iamVjdE5vdGF0aW9uWzBdXVtpc09iamVjdE5vdGF0aW9uWzFdXSlcclxuICAvLyAgICAgfVxyXG4gIC8vICAgICAvLyByZXNvbHZlIG5vZGVWaXNpYmlsaXR5XHJcbiAgLy8gICAgIGlmIChyZXAubWF0Y2goL15cXD8vZykpIHtcclxuICAvLyAgICAgICB1cGRhdGVTdGF0ZUxpc3QocmVwLnJlcGxhY2UoJz8nLCAnJykpXHJcbiAgLy8gICAgIH1cclxuICAvLyAgICAgLy8gcmVzb2x2ZSBtb2RlbFxyXG4gIC8vICAgICBpZiAocmVwLm1hdGNoKC9ebW9kZWw6L2cpKSB7XHJcbiAgLy8gICAgICAgdmFyIG1vZGVsUmVwID0gcmVwLnJlcGxhY2UoJ21vZGVsOicsICcnKVxyXG4gIC8vICAgICAgIGlmICghfnNlbGYuX19tb2RlbExpc3RfXy5pbmRleE9mKG1vZGVsUmVwKSkgeyBzZWxmLl9fbW9kZWxMaXN0X18ucHVzaChtb2RlbFJlcCkgfVxyXG4gIC8vICAgICB9XHJcbiAgLy8gICAgIC8vIHJlc29sdmUgY29tcG9uZW50XHJcbiAgLy8gICAgIGlmIChyZXAubWF0Y2goL15jb21wb25lbnQ6L2cpKSB7XHJcbiAgLy8gICAgICAgdmFyIGNvbXBvbmVudFJlcCA9IHJlcC5yZXBsYWNlKCdjb21wb25lbnQ6JywgJycpXHJcbiAgLy8gICAgICAgaWYgKCF+c2VsZi5fX2NvbXBvbmVudExpc3RfXy5pbmRleE9mKGNvbXBvbmVudFJlcCkpIHsgc2VsZi5fX2NvbXBvbmVudExpc3RfXy5wdXNoKGNvbXBvbmVudFJlcCkgfVxyXG4gIC8vICAgICB9XHJcbiAgLy8gICB9KVxyXG4gIC8vIH1cclxuICAvLyByZXR1cm4gc3RyXHJcbn1cclxuXHJcbm1vZHVsZS5leHBvcnRzID0gdG1wbGhhbmRsZXJcclxuIiwiJ3VzZSBzdHJpY3QnXHJcbi8qKlxyXG4gKiBLZWV0anMgdjQuMC4wIEFscGhhIHJlbGVhc2U6IGh0dHBzOi8vZ2l0aHViLmNvbS9rZWV0anMva2VldC5qc1xyXG4gKiBNaW5pbWFsaXN0IHZpZXcgbGF5ZXIgZm9yIHRoZSB3ZWJcclxuICpcclxuICogPDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8IEtlZXRqcyA+Pj4+Pj4+Pj4+Pj4+Pj4+Pj4+Pj4+Pj4+Pj4+Pj5cclxuICpcclxuICogQ29weXJpZ2h0IDIwMTgsIFNoYWhydWwgTml6YW0gU2VsYW1hdFxyXG4gKiBSZWxlYXNlZCB1bmRlciB0aGUgTUlUIExpY2Vuc2UuXHJcbiAqL1xyXG5cclxudmFyIHBhcnNlU3RyID0gcmVxdWlyZSgnLi9jb21wb25lbnRzL3BhcnNlU3RyJylcclxudmFyIHNldFN0YXRlID0gcmVxdWlyZSgnLi9jb21wb25lbnRzL2dlbkVsZW1lbnQnKS5zZXRTdGF0ZVxyXG52YXIgZ2VuRWxlbWVudCA9IHJlcXVpcmUoJy4vY29tcG9uZW50cy9nZW5FbGVtZW50JykuZ2VuRWxlbWVudFxyXG52YXIgY2xlYXJTdGF0ZSA9IHJlcXVpcmUoJy4vY29tcG9uZW50cy9nZW5FbGVtZW50JykuY2xlYXJTdGF0ZVxyXG52YXIgcHJvY2Vzc0V2ZW50ID0gcmVxdWlyZSgnLi9jb21wb25lbnRzL3Byb2Nlc3NFdmVudCcpXHJcbnZhciBnZXRJZCA9IHJlcXVpcmUoJy4vdXRpbHMnKS5nZXRJZFxyXG52YXIgdGVzdEV2ZW50ID0gcmVxdWlyZSgnLi91dGlscycpLnRlc3RFdmVudFxyXG52YXIgYXNzZXJ0ID0gcmVxdWlyZSgnLi91dGlscycpLmFzc2VydFxyXG5cclxudmFyIERPQ1VNRU5UX0ZSQUdNRU5UX1RZUEUgPSAxMVxyXG52YXIgRE9DVU1FTlRfVEVYVF9UWVBFID0gM1xyXG52YXIgRE9DVU1FTlRfRUxFTUVOVF9UWVBFID0gMVxyXG52YXIgRE9DVU1FTlRfQ09NTUVOVF9UWVBFID0gOFxyXG52YXIgRE9DVU1FTlRfQVRUUklCVVRFX1RZUEUgPSAyXHJcblxyXG4vKipcclxuICogQGRlc2NyaXB0aW9uXHJcbiAqIFRoZSBtYWluIGNvbnN0cnVjdG9yIG9mIEtlZXRcclxuICpcclxuICogQmFzaWMgVXNhZ2UgOi1cclxuICpcclxuICogICAgY29uc3QgQXBwIGV4dGVuZHMgS2VldCB7fVxyXG4gKiAgICBjb25zdCBhcHAgPSBuZXcgQXBwKClcclxuICogICAgYXBwLm1vdW50KCdoZWxsbyB3b3JsZCcpLmxpbmsoJ2FwcCcpXHJcbiAqXHJcbiAqL1xyXG5mdW5jdGlvbiBLZWV0ICgpIHt9XHJcblxyXG5LZWV0LnByb3RvdHlwZS5tb3VudCA9IGZ1bmN0aW9uIChpbnN0YW5jZSkge1xyXG4gIHZhciBiYXNlXHJcbiAgdmFyIHRlbXBEaXZcclxuICB2YXIgZnJhZyA9IGRvY3VtZW50LmNyZWF0ZURvY3VtZW50RnJhZ21lbnQoKVxyXG4gIC8vIEJlZm9yZSB3ZSBiZWdpbiB0byBwYXJzZSBhbiBpbnN0YW5jZSwgZG8gYSBydW4tZG93biBjaGVja3NcclxuICAvLyB0byBjbGVhbiB1cCBiYWNrLXRpY2sgc3RyaW5nIHdoaWNoIHVzdWFsbHkgaGFzIGxpbmUgc3BhY2luZy5cclxuICBpZiAodHlwZW9mIGluc3RhbmNlID09PSAnc3RyaW5nJykge1xyXG4gICAgYmFzZSA9IGluc3RhbmNlLnRyaW0oKS5yZXBsYWNlKC9cXHMrL2csICcgJylcclxuICAgIHRlbXBEaXYgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdkaXYnKVxyXG4gICAgdGVtcERpdi5pbm5lckhUTUwgPSBiYXNlXHJcbiAgICB3aGlsZSAodGVtcERpdi5maXJzdENoaWxkKSB7XHJcbiAgICAgIGZyYWcuYXBwZW5kQ2hpbGQodGVtcERpdi5maXJzdENoaWxkKVxyXG4gICAgfVxyXG4gIC8vIElmIGluc3RhbmNlIGlzIGEgaHRtbCBlbGVtZW50IHByb2Nlc3MgYXMgaHRtbCBlbnRpdGllc1xyXG4gIH0gZWxzZSBpZiAodHlwZW9mIGluc3RhbmNlID09PSAnb2JqZWN0JyAmJiBpbnN0YW5jZVsnbm9kZVR5cGUnXSkge1xyXG4gICAgaWYgKGluc3RhbmNlWydub2RlVHlwZSddID09PSBET0NVTUVOVF9FTEVNRU5UX1RZUEUpIHtcclxuICAgICAgZnJhZy5hcHBlbmRDaGlsZChpbnN0YW5jZSlcclxuICAgIH0gZWxzZSBpZiAoaW5zdGFuY2VbJ25vZGVUeXBlJ10gPT09IERPQ1VNRU5UX0ZSQUdNRU5UX1RZUEUpIHtcclxuICAgICAgZnJhZyA9IGluc3RhbmNlXHJcbiAgICB9IGVsc2UgaWYgKGluc3RhbmNlWydub2RlVHlwZSddID09PSBET0NVTUVOVF9URVhUX1RZUEUpIHtcclxuICAgICAgZnJhZy5hcHBlbmRDaGlsZChpbnN0YW5jZSlcclxuICAgIH0gZWxzZSB7XHJcbiAgICAgIGFzc2VydChmYWxzZSwgJ1VuYWJsZSB0byBwYXJzZSBpbnN0YW5jZSwgdW5rbm93biB0eXBlLicpXHJcbiAgICB9XHJcbiAgfSBlbHNlIHtcclxuICAgIGFzc2VydChmYWxzZSwgJ1BhcmFtZXRlciBpcyBub3QgYSBzdHJpbmcgb3IgYSBodG1sIGVsZW1lbnQuJylcclxuICB9XHJcbiAgLy8gd2Ugc3RvcmUgdGhlIHByaXN0aW5lIGluc3RhbmNlIGluIF9fcHJpc3RpbmVGcmFnbWVudF9fXHJcbiAgdGhpcy5fX3ByaXN0aW5lRnJhZ21lbnRfXyA9IGZyYWcuY2xvbmVOb2RlKHRydWUpXHJcbiAgdGhpcy5iYXNlID0gZnJhZ1xyXG5cclxuICAvLyBjbGVhbnVwIHN0YXRlcyBvbiBtb3VudFxyXG4gIGNsZWFyU3RhdGUoKVxyXG5cclxuICByZXR1cm4gdGhpc1xyXG59XHJcblxyXG5LZWV0LnByb3RvdHlwZS5mbHVzaCA9IGZ1bmN0aW9uIChpbnN0YW5jZSkge1xyXG4gIC8vIEN1c3RvbSBtZXRob2QgdG8gY2xlYW4gdXAgdGhlIGNvbXBvbmVudCBET00gdHJlZVxyXG4gIC8vIHVzZWZ1bCBpZiB3ZSBuZWVkIHRvIGRvIGNsZWFuIHVwIHJlcmVuZGVyLlxyXG4gIHZhciBlbCA9IGluc3RhbmNlIHx8IHRoaXMuZWxcclxuICB2YXIgZWxlID0gZ2V0SWQoZWwpXHJcbiAgaWYgKGVsZSkgZWxlLmlubmVySFRNTCA9ICcnXHJcbiAgcmV0dXJuIHRoaXNcclxufVxyXG5cclxuS2VldC5wcm90b3R5cGUubGluayA9IGZ1bmN0aW9uIChpZCkge1xyXG4gIC8vIFRoZSB0YXJnZXQgRE9NIHdoZXJlIHRoZSByZW5kZXJpbmcgd2lsbCB0b29rIHBsYWNlLlxyXG4gIC8vIFdlIGNvdWxkIGFsc28gYXBwbHkgbGlmZS1jeWNsZSBtZXRob2QgYmVmb3JlIHRoZVxyXG4gIC8vIHJlbmRlciBoYXBwZW4uXHJcbiAgaWYgKCFpZCkgYXNzZXJ0KGlkLCAnTm8gaWQgaXMgZ2l2ZW4gYXMgcGFyYW1ldGVyLicpXHJcbiAgdGhpcy5lbCA9IGlkXHJcbiAgLy8gbGlmZS1jeWNsZSBtZXRob2QgYmVmb3JlIHJlbmRlcmluZyB0aGUgY29tcG9uZW50XHJcbiAgaWYgKHRoaXMuY29tcG9uZW50V2lsbE1vdW50ICYmIHR5cGVvZiB0aGlzLmNvbXBvbmVudFdpbGxNb3VudCA9PT0gJ2Z1bmN0aW9uJykge1xyXG4gICAgdGhpcy5jb21wb25lbnRXaWxsTW91bnQoKVxyXG4gIH1cclxuICB0aGlzLnJlbmRlcigpXHJcbiAgcmV0dXJuIHRoaXNcclxufVxyXG5cclxuS2VldC5wcm90b3R5cGUucmVuZGVyID0gZnVuY3Rpb24gKHN0dWIpIHtcclxuICBpZiAoc3R1Yikge1xyXG4gICAgLy8gbGlmZS1jeWNsZSBtZXRob2QgYmVmb3JlIHJlbmRlcmluZyB0aGUgY29tcG9uZW50XHJcbiAgICBpZiAoIXRoaXMuV0lMTF9NT1VOVCAmJiB0aGlzLmNvbXBvbmVudFdpbGxNb3VudCAmJiB0eXBlb2YgdGhpcy5jb21wb25lbnRXaWxsTW91bnQgPT09ICdmdW5jdGlvbicpIHtcclxuICAgICAgdGhpcy5XSUxMX01PVU5UID0gdHJ1ZVxyXG4gICAgICB0aGlzLmNvbXBvbmVudFdpbGxNb3VudCgpXHJcbiAgICB9XHJcbiAgICByZXR1cm4gcGFyc2VTdHIuY2FsbCh0aGlzLCBzdHViKVxyXG4gIH0gZWxzZSB7XHJcbiAgICAvLyBSZW5kZXIgdGhpcyBjb21wb25lbnQgdG8gdGhlIHRhcmdldCBET01cclxuICAgIHBhcnNlU3RyLmNhbGwodGhpcylcclxuICAgIHJldHVybiB0aGlzXHJcbiAgfVxyXG59XHJcblxyXG5LZWV0LnByb3RvdHlwZS5jbHVzdGVyID0gZnVuY3Rpb24gKCkge1xyXG4gIC8vIENoYWluIG1ldGhvZCB0byBydW4gZXh0ZXJuYWwgZnVuY3Rpb24ocyksIHRoaXMgYmFzaWNhbGx5IHNlcnZlXHJcbiAgLy8gYXMgYW4gaW5pdGlhbGl6ZXIgZm9yIGFsbCBub24gYXR0YWNoZWQgY2hpbGQgY29tcG9uZW50cyB3aXRoaW4gdGhlIGluc3RhbmNlIHRyZWVcclxuICB2YXIgYXJncyA9IFtdLnNsaWNlLmNhbGwoYXJndW1lbnRzKVxyXG4gIGlmIChhcmdzLmxlbmd0aCA+IDApIHtcclxuICAgIGFyZ3MubWFwKGZ1bmN0aW9uIChmKSB7XHJcbiAgICAgIGlmICh0eXBlb2YgZiA9PT0gJ2Z1bmN0aW9uJykgZigpXHJcbiAgICB9KVxyXG4gIH1cclxufVxyXG5cclxuS2VldC5wcm90b3R5cGUuc3R1YlJlbmRlciA9IGZ1bmN0aW9uICh0cGwsIG5vZGUpIHtcclxuICAvLyBzdWItY29tcG9uZW50IHJlbmRlcmluZ1xyXG4gIHNldFN0YXRlLmNhbGwodGhpcylcclxuICB0ZXN0RXZlbnQodHBsKSAmJiBwcm9jZXNzRXZlbnQuY2FsbCh0aGlzLCBub2RlKVxyXG4gIC8vIHNpbmNlIGNvbXBvbmVudCBhbHJlYWR5IHJlbmRlcmVkLCB0cmlnZ2VyIGl0cyBsaWZlLWN5Y2xlIG1ldGhvZFxyXG4gIGlmICghdGhpcy5ESURfTU9VTlQgJiYgdGhpcy5jb21wb25lbnREaWRNb3VudCAmJiB0eXBlb2YgdGhpcy5jb21wb25lbnREaWRNb3VudCA9PT0gJ2Z1bmN0aW9uJykge1xyXG4gICAgdGhpcy5ESURfTU9VTlQgPSB0cnVlXHJcbiAgICB0aGlzLmNvbXBvbmVudERpZE1vdW50KClcclxuICB9XHJcbn1cclxuXHJcbnZhciBCQVRDSF9DQUxMX1JFUVVFU1QgPSBudWxsXHJcblxyXG5LZWV0LnByb3RvdHlwZS5jYWxsQmF0Y2hQb29sVXBkYXRlID0gZnVuY3Rpb24gKCkge1xyXG4gIC8vIGZvcmNlIGNvbXBvbmVudCB0byB1cGRhdGUsIGlmIGFueSBzdGF0ZSAvIG5vbi1zdGF0ZVxyXG4gIC8vIHZhbHVlIGNoYW5nZWQgRE9NIGRpZmZpbmcgd2lsbCBvY2N1clxyXG4gIHZhciBzZWxmID0gdGhpc1xyXG4gIGlmKEJBVENIX0NBTExfUkVRVUVTVCl7XHJcbiAgICBjbGVhclRpbWVvdXQoQkFUQ0hfQ0FMTF9SRVFVRVNUKVxyXG4gIH0gXHJcbiAgQkFUQ0hfQ0FMTF9SRVFVRVNUID0gc2V0VGltZW91dChmdW5jdGlvbigpe1xyXG4gICAgZ2VuRWxlbWVudC5jYWxsKHNlbGYsIHRydWUpXHJcbiAgfSlcclxufVxyXG5cclxubW9kdWxlLmV4cG9ydHMgPSBLZWV0XHJcbiIsIid1c2Ugc3RyaWN0JztcblxudmFyIHJhbmdlOyAvLyBDcmVhdGUgYSByYW5nZSBvYmplY3QgZm9yIGVmZmljZW50bHkgcmVuZGVyaW5nIHN0cmluZ3MgdG8gZWxlbWVudHMuXG52YXIgTlNfWEhUTUwgPSAnaHR0cDovL3d3dy53My5vcmcvMTk5OS94aHRtbCc7XG5cbnZhciBkb2MgPSB0eXBlb2YgZG9jdW1lbnQgPT09ICd1bmRlZmluZWQnID8gdW5kZWZpbmVkIDogZG9jdW1lbnQ7XG5cbnZhciB0ZXN0RWwgPSBkb2MgP1xuICAgIGRvYy5ib2R5IHx8IGRvYy5jcmVhdGVFbGVtZW50KCdkaXYnKSA6XG4gICAge307XG5cbi8vIEZpeGVzIDxodHRwczovL2dpdGh1Yi5jb20vcGF0cmljay1zdGVlbGUtaWRlbS9tb3JwaGRvbS9pc3N1ZXMvMzI+XG4vLyAoSUU3KyBzdXBwb3J0KSA8PUlFNyBkb2VzIG5vdCBzdXBwb3J0IGVsLmhhc0F0dHJpYnV0ZShuYW1lKVxudmFyIGFjdHVhbEhhc0F0dHJpYnV0ZU5TO1xuXG5pZiAodGVzdEVsLmhhc0F0dHJpYnV0ZU5TKSB7XG4gICAgYWN0dWFsSGFzQXR0cmlidXRlTlMgPSBmdW5jdGlvbihlbCwgbmFtZXNwYWNlVVJJLCBuYW1lKSB7XG4gICAgICAgIHJldHVybiBlbC5oYXNBdHRyaWJ1dGVOUyhuYW1lc3BhY2VVUkksIG5hbWUpO1xuICAgIH07XG59IGVsc2UgaWYgKHRlc3RFbC5oYXNBdHRyaWJ1dGUpIHtcbiAgICBhY3R1YWxIYXNBdHRyaWJ1dGVOUyA9IGZ1bmN0aW9uKGVsLCBuYW1lc3BhY2VVUkksIG5hbWUpIHtcbiAgICAgICAgcmV0dXJuIGVsLmhhc0F0dHJpYnV0ZShuYW1lKTtcbiAgICB9O1xufSBlbHNlIHtcbiAgICBhY3R1YWxIYXNBdHRyaWJ1dGVOUyA9IGZ1bmN0aW9uKGVsLCBuYW1lc3BhY2VVUkksIG5hbWUpIHtcbiAgICAgICAgcmV0dXJuIGVsLmdldEF0dHJpYnV0ZU5vZGUobmFtZXNwYWNlVVJJLCBuYW1lKSAhPSBudWxsO1xuICAgIH07XG59XG5cbnZhciBoYXNBdHRyaWJ1dGVOUyA9IGFjdHVhbEhhc0F0dHJpYnV0ZU5TO1xuXG5cbmZ1bmN0aW9uIHRvRWxlbWVudChzdHIpIHtcbiAgICBpZiAoIXJhbmdlICYmIGRvYy5jcmVhdGVSYW5nZSkge1xuICAgICAgICByYW5nZSA9IGRvYy5jcmVhdGVSYW5nZSgpO1xuICAgICAgICByYW5nZS5zZWxlY3ROb2RlKGRvYy5ib2R5KTtcbiAgICB9XG5cbiAgICB2YXIgZnJhZ21lbnQ7XG4gICAgaWYgKHJhbmdlICYmIHJhbmdlLmNyZWF0ZUNvbnRleHR1YWxGcmFnbWVudCkge1xuICAgICAgICBmcmFnbWVudCA9IHJhbmdlLmNyZWF0ZUNvbnRleHR1YWxGcmFnbWVudChzdHIpO1xuICAgIH0gZWxzZSB7XG4gICAgICAgIGZyYWdtZW50ID0gZG9jLmNyZWF0ZUVsZW1lbnQoJ2JvZHknKTtcbiAgICAgICAgZnJhZ21lbnQuaW5uZXJIVE1MID0gc3RyO1xuICAgIH1cbiAgICByZXR1cm4gZnJhZ21lbnQuY2hpbGROb2Rlc1swXTtcbn1cblxuLyoqXG4gKiBSZXR1cm5zIHRydWUgaWYgdHdvIG5vZGUncyBuYW1lcyBhcmUgdGhlIHNhbWUuXG4gKlxuICogTk9URTogV2UgZG9uJ3QgYm90aGVyIGNoZWNraW5nIGBuYW1lc3BhY2VVUklgIGJlY2F1c2UgeW91IHdpbGwgbmV2ZXIgZmluZCB0d28gSFRNTCBlbGVtZW50cyB3aXRoIHRoZSBzYW1lXG4gKiAgICAgICBub2RlTmFtZSBhbmQgZGlmZmVyZW50IG5hbWVzcGFjZSBVUklzLlxuICpcbiAqIEBwYXJhbSB7RWxlbWVudH0gYVxuICogQHBhcmFtIHtFbGVtZW50fSBiIFRoZSB0YXJnZXQgZWxlbWVudFxuICogQHJldHVybiB7Ym9vbGVhbn1cbiAqL1xuZnVuY3Rpb24gY29tcGFyZU5vZGVOYW1lcyhmcm9tRWwsIHRvRWwpIHtcbiAgICB2YXIgZnJvbU5vZGVOYW1lID0gZnJvbUVsLm5vZGVOYW1lO1xuICAgIHZhciB0b05vZGVOYW1lID0gdG9FbC5ub2RlTmFtZTtcblxuICAgIGlmIChmcm9tTm9kZU5hbWUgPT09IHRvTm9kZU5hbWUpIHtcbiAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgfVxuXG4gICAgaWYgKHRvRWwuYWN0dWFsaXplICYmXG4gICAgICAgIGZyb21Ob2RlTmFtZS5jaGFyQ29kZUF0KDApIDwgOTEgJiYgLyogZnJvbSB0YWcgbmFtZSBpcyB1cHBlciBjYXNlICovXG4gICAgICAgIHRvTm9kZU5hbWUuY2hhckNvZGVBdCgwKSA+IDkwIC8qIHRhcmdldCB0YWcgbmFtZSBpcyBsb3dlciBjYXNlICovKSB7XG4gICAgICAgIC8vIElmIHRoZSB0YXJnZXQgZWxlbWVudCBpcyBhIHZpcnR1YWwgRE9NIG5vZGUgdGhlbiB3ZSBtYXkgbmVlZCB0byBub3JtYWxpemUgdGhlIHRhZyBuYW1lXG4gICAgICAgIC8vIGJlZm9yZSBjb21wYXJpbmcuIE5vcm1hbCBIVE1MIGVsZW1lbnRzIHRoYXQgYXJlIGluIHRoZSBcImh0dHA6Ly93d3cudzMub3JnLzE5OTkveGh0bWxcIlxuICAgICAgICAvLyBhcmUgY29udmVydGVkIHRvIHVwcGVyIGNhc2VcbiAgICAgICAgcmV0dXJuIGZyb21Ob2RlTmFtZSA9PT0gdG9Ob2RlTmFtZS50b1VwcGVyQ2FzZSgpO1xuICAgIH0gZWxzZSB7XG4gICAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG59XG5cbi8qKlxuICogQ3JlYXRlIGFuIGVsZW1lbnQsIG9wdGlvbmFsbHkgd2l0aCBhIGtub3duIG5hbWVzcGFjZSBVUkkuXG4gKlxuICogQHBhcmFtIHtzdHJpbmd9IG5hbWUgdGhlIGVsZW1lbnQgbmFtZSwgZS5nLiAnZGl2JyBvciAnc3ZnJ1xuICogQHBhcmFtIHtzdHJpbmd9IFtuYW1lc3BhY2VVUkldIHRoZSBlbGVtZW50J3MgbmFtZXNwYWNlIFVSSSwgaS5lLiB0aGUgdmFsdWUgb2ZcbiAqIGl0cyBgeG1sbnNgIGF0dHJpYnV0ZSBvciBpdHMgaW5mZXJyZWQgbmFtZXNwYWNlLlxuICpcbiAqIEByZXR1cm4ge0VsZW1lbnR9XG4gKi9cbmZ1bmN0aW9uIGNyZWF0ZUVsZW1lbnROUyhuYW1lLCBuYW1lc3BhY2VVUkkpIHtcbiAgICByZXR1cm4gIW5hbWVzcGFjZVVSSSB8fCBuYW1lc3BhY2VVUkkgPT09IE5TX1hIVE1MID9cbiAgICAgICAgZG9jLmNyZWF0ZUVsZW1lbnQobmFtZSkgOlxuICAgICAgICBkb2MuY3JlYXRlRWxlbWVudE5TKG5hbWVzcGFjZVVSSSwgbmFtZSk7XG59XG5cbi8qKlxuICogQ29waWVzIHRoZSBjaGlsZHJlbiBvZiBvbmUgRE9NIGVsZW1lbnQgdG8gYW5vdGhlciBET00gZWxlbWVudFxuICovXG5mdW5jdGlvbiBtb3ZlQ2hpbGRyZW4oZnJvbUVsLCB0b0VsKSB7XG4gICAgdmFyIGN1ckNoaWxkID0gZnJvbUVsLmZpcnN0Q2hpbGQ7XG4gICAgd2hpbGUgKGN1ckNoaWxkKSB7XG4gICAgICAgIHZhciBuZXh0Q2hpbGQgPSBjdXJDaGlsZC5uZXh0U2libGluZztcbiAgICAgICAgdG9FbC5hcHBlbmRDaGlsZChjdXJDaGlsZCk7XG4gICAgICAgIGN1ckNoaWxkID0gbmV4dENoaWxkO1xuICAgIH1cbiAgICByZXR1cm4gdG9FbDtcbn1cblxuZnVuY3Rpb24gbW9ycGhBdHRycyhmcm9tTm9kZSwgdG9Ob2RlKSB7XG4gICAgdmFyIGF0dHJzID0gdG9Ob2RlLmF0dHJpYnV0ZXM7XG4gICAgdmFyIGk7XG4gICAgdmFyIGF0dHI7XG4gICAgdmFyIGF0dHJOYW1lO1xuICAgIHZhciBhdHRyTmFtZXNwYWNlVVJJO1xuICAgIHZhciBhdHRyVmFsdWU7XG4gICAgdmFyIGZyb21WYWx1ZTtcblxuICAgIGZvciAoaSA9IGF0dHJzLmxlbmd0aCAtIDE7IGkgPj0gMDsgLS1pKSB7XG4gICAgICAgIGF0dHIgPSBhdHRyc1tpXTtcbiAgICAgICAgYXR0ck5hbWUgPSBhdHRyLm5hbWU7XG4gICAgICAgIGF0dHJOYW1lc3BhY2VVUkkgPSBhdHRyLm5hbWVzcGFjZVVSSTtcbiAgICAgICAgYXR0clZhbHVlID0gYXR0ci52YWx1ZTtcblxuICAgICAgICBpZiAoYXR0ck5hbWVzcGFjZVVSSSkge1xuICAgICAgICAgICAgYXR0ck5hbWUgPSBhdHRyLmxvY2FsTmFtZSB8fCBhdHRyTmFtZTtcbiAgICAgICAgICAgIGZyb21WYWx1ZSA9IGZyb21Ob2RlLmdldEF0dHJpYnV0ZU5TKGF0dHJOYW1lc3BhY2VVUkksIGF0dHJOYW1lKTtcblxuICAgICAgICAgICAgaWYgKGZyb21WYWx1ZSAhPT0gYXR0clZhbHVlKSB7XG4gICAgICAgICAgICAgICAgZnJvbU5vZGUuc2V0QXR0cmlidXRlTlMoYXR0ck5hbWVzcGFjZVVSSSwgYXR0ck5hbWUsIGF0dHJWYWx1ZSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBmcm9tVmFsdWUgPSBmcm9tTm9kZS5nZXRBdHRyaWJ1dGUoYXR0ck5hbWUpO1xuXG4gICAgICAgICAgICBpZiAoZnJvbVZhbHVlICE9PSBhdHRyVmFsdWUpIHtcbiAgICAgICAgICAgICAgICBmcm9tTm9kZS5zZXRBdHRyaWJ1dGUoYXR0ck5hbWUsIGF0dHJWYWx1ZSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICAvLyBSZW1vdmUgYW55IGV4dHJhIGF0dHJpYnV0ZXMgZm91bmQgb24gdGhlIG9yaWdpbmFsIERPTSBlbGVtZW50IHRoYXRcbiAgICAvLyB3ZXJlbid0IGZvdW5kIG9uIHRoZSB0YXJnZXQgZWxlbWVudC5cbiAgICBhdHRycyA9IGZyb21Ob2RlLmF0dHJpYnV0ZXM7XG5cbiAgICBmb3IgKGkgPSBhdHRycy5sZW5ndGggLSAxOyBpID49IDA7IC0taSkge1xuICAgICAgICBhdHRyID0gYXR0cnNbaV07XG4gICAgICAgIGlmIChhdHRyLnNwZWNpZmllZCAhPT0gZmFsc2UpIHtcbiAgICAgICAgICAgIGF0dHJOYW1lID0gYXR0ci5uYW1lO1xuICAgICAgICAgICAgYXR0ck5hbWVzcGFjZVVSSSA9IGF0dHIubmFtZXNwYWNlVVJJO1xuXG4gICAgICAgICAgICBpZiAoYXR0ck5hbWVzcGFjZVVSSSkge1xuICAgICAgICAgICAgICAgIGF0dHJOYW1lID0gYXR0ci5sb2NhbE5hbWUgfHwgYXR0ck5hbWU7XG5cbiAgICAgICAgICAgICAgICBpZiAoIWhhc0F0dHJpYnV0ZU5TKHRvTm9kZSwgYXR0ck5hbWVzcGFjZVVSSSwgYXR0ck5hbWUpKSB7XG4gICAgICAgICAgICAgICAgICAgIGZyb21Ob2RlLnJlbW92ZUF0dHJpYnV0ZU5TKGF0dHJOYW1lc3BhY2VVUkksIGF0dHJOYW1lKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIGlmICghaGFzQXR0cmlidXRlTlModG9Ob2RlLCBudWxsLCBhdHRyTmFtZSkpIHtcbiAgICAgICAgICAgICAgICAgICAgZnJvbU5vZGUucmVtb3ZlQXR0cmlidXRlKGF0dHJOYW1lKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9XG59XG5cbmZ1bmN0aW9uIHN5bmNCb29sZWFuQXR0clByb3AoZnJvbUVsLCB0b0VsLCBuYW1lKSB7XG4gICAgaWYgKGZyb21FbFtuYW1lXSAhPT0gdG9FbFtuYW1lXSkge1xuICAgICAgICBmcm9tRWxbbmFtZV0gPSB0b0VsW25hbWVdO1xuICAgICAgICBpZiAoZnJvbUVsW25hbWVdKSB7XG4gICAgICAgICAgICBmcm9tRWwuc2V0QXR0cmlidXRlKG5hbWUsICcnKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGZyb21FbC5yZW1vdmVBdHRyaWJ1dGUobmFtZSwgJycpO1xuICAgICAgICB9XG4gICAgfVxufVxuXG52YXIgc3BlY2lhbEVsSGFuZGxlcnMgPSB7XG4gICAgLyoqXG4gICAgICogTmVlZGVkIGZvciBJRS4gQXBwYXJlbnRseSBJRSBkb2Vzbid0IHRoaW5rIHRoYXQgXCJzZWxlY3RlZFwiIGlzIGFuXG4gICAgICogYXR0cmlidXRlIHdoZW4gcmVhZGluZyBvdmVyIHRoZSBhdHRyaWJ1dGVzIHVzaW5nIHNlbGVjdEVsLmF0dHJpYnV0ZXNcbiAgICAgKi9cbiAgICBPUFRJT046IGZ1bmN0aW9uKGZyb21FbCwgdG9FbCkge1xuICAgICAgICBzeW5jQm9vbGVhbkF0dHJQcm9wKGZyb21FbCwgdG9FbCwgJ3NlbGVjdGVkJyk7XG4gICAgfSxcbiAgICAvKipcbiAgICAgKiBUaGUgXCJ2YWx1ZVwiIGF0dHJpYnV0ZSBpcyBzcGVjaWFsIGZvciB0aGUgPGlucHV0PiBlbGVtZW50IHNpbmNlIGl0IHNldHNcbiAgICAgKiB0aGUgaW5pdGlhbCB2YWx1ZS4gQ2hhbmdpbmcgdGhlIFwidmFsdWVcIiBhdHRyaWJ1dGUgd2l0aG91dCBjaGFuZ2luZyB0aGVcbiAgICAgKiBcInZhbHVlXCIgcHJvcGVydHkgd2lsbCBoYXZlIG5vIGVmZmVjdCBzaW5jZSBpdCBpcyBvbmx5IHVzZWQgdG8gdGhlIHNldCB0aGVcbiAgICAgKiBpbml0aWFsIHZhbHVlLiAgU2ltaWxhciBmb3IgdGhlIFwiY2hlY2tlZFwiIGF0dHJpYnV0ZSwgYW5kIFwiZGlzYWJsZWRcIi5cbiAgICAgKi9cbiAgICBJTlBVVDogZnVuY3Rpb24oZnJvbUVsLCB0b0VsKSB7XG4gICAgICAgIHN5bmNCb29sZWFuQXR0clByb3AoZnJvbUVsLCB0b0VsLCAnY2hlY2tlZCcpO1xuICAgICAgICBzeW5jQm9vbGVhbkF0dHJQcm9wKGZyb21FbCwgdG9FbCwgJ2Rpc2FibGVkJyk7XG5cbiAgICAgICAgaWYgKGZyb21FbC52YWx1ZSAhPT0gdG9FbC52YWx1ZSkge1xuICAgICAgICAgICAgZnJvbUVsLnZhbHVlID0gdG9FbC52YWx1ZTtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmICghaGFzQXR0cmlidXRlTlModG9FbCwgbnVsbCwgJ3ZhbHVlJykpIHtcbiAgICAgICAgICAgIGZyb21FbC5yZW1vdmVBdHRyaWJ1dGUoJ3ZhbHVlJyk7XG4gICAgICAgIH1cbiAgICB9LFxuXG4gICAgVEVYVEFSRUE6IGZ1bmN0aW9uKGZyb21FbCwgdG9FbCkge1xuICAgICAgICB2YXIgbmV3VmFsdWUgPSB0b0VsLnZhbHVlO1xuICAgICAgICBpZiAoZnJvbUVsLnZhbHVlICE9PSBuZXdWYWx1ZSkge1xuICAgICAgICAgICAgZnJvbUVsLnZhbHVlID0gbmV3VmFsdWU7XG4gICAgICAgIH1cblxuICAgICAgICB2YXIgZmlyc3RDaGlsZCA9IGZyb21FbC5maXJzdENoaWxkO1xuICAgICAgICBpZiAoZmlyc3RDaGlsZCkge1xuICAgICAgICAgICAgLy8gTmVlZGVkIGZvciBJRS4gQXBwYXJlbnRseSBJRSBzZXRzIHRoZSBwbGFjZWhvbGRlciBhcyB0aGVcbiAgICAgICAgICAgIC8vIG5vZGUgdmFsdWUgYW5kIHZpc2UgdmVyc2EuIFRoaXMgaWdub3JlcyBhbiBlbXB0eSB1cGRhdGUuXG4gICAgICAgICAgICB2YXIgb2xkVmFsdWUgPSBmaXJzdENoaWxkLm5vZGVWYWx1ZTtcblxuICAgICAgICAgICAgaWYgKG9sZFZhbHVlID09IG5ld1ZhbHVlIHx8ICghbmV3VmFsdWUgJiYgb2xkVmFsdWUgPT0gZnJvbUVsLnBsYWNlaG9sZGVyKSkge1xuICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgZmlyc3RDaGlsZC5ub2RlVmFsdWUgPSBuZXdWYWx1ZTtcbiAgICAgICAgfVxuICAgIH0sXG4gICAgU0VMRUNUOiBmdW5jdGlvbihmcm9tRWwsIHRvRWwpIHtcbiAgICAgICAgaWYgKCFoYXNBdHRyaWJ1dGVOUyh0b0VsLCBudWxsLCAnbXVsdGlwbGUnKSkge1xuICAgICAgICAgICAgdmFyIHNlbGVjdGVkSW5kZXggPSAtMTtcbiAgICAgICAgICAgIHZhciBpID0gMDtcbiAgICAgICAgICAgIHZhciBjdXJDaGlsZCA9IHRvRWwuZmlyc3RDaGlsZDtcbiAgICAgICAgICAgIHdoaWxlKGN1ckNoaWxkKSB7XG4gICAgICAgICAgICAgICAgdmFyIG5vZGVOYW1lID0gY3VyQ2hpbGQubm9kZU5hbWU7XG4gICAgICAgICAgICAgICAgaWYgKG5vZGVOYW1lICYmIG5vZGVOYW1lLnRvVXBwZXJDYXNlKCkgPT09ICdPUFRJT04nKSB7XG4gICAgICAgICAgICAgICAgICAgIGlmIChoYXNBdHRyaWJ1dGVOUyhjdXJDaGlsZCwgbnVsbCwgJ3NlbGVjdGVkJykpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHNlbGVjdGVkSW5kZXggPSBpO1xuICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgaSsrO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBjdXJDaGlsZCA9IGN1ckNoaWxkLm5leHRTaWJsaW5nO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBmcm9tRWwuc2VsZWN0ZWRJbmRleCA9IGk7XG4gICAgICAgIH1cbiAgICB9XG59O1xuXG52YXIgRUxFTUVOVF9OT0RFID0gMTtcbnZhciBURVhUX05PREUgPSAzO1xudmFyIENPTU1FTlRfTk9ERSA9IDg7XG5cbmZ1bmN0aW9uIG5vb3AoKSB7fVxuXG5mdW5jdGlvbiBkZWZhdWx0R2V0Tm9kZUtleShub2RlKSB7XG4gICAgcmV0dXJuIG5vZGUuaWQ7XG59XG5cbmZ1bmN0aW9uIG1vcnBoZG9tRmFjdG9yeShtb3JwaEF0dHJzKSB7XG5cbiAgICByZXR1cm4gZnVuY3Rpb24gbW9ycGhkb20oZnJvbU5vZGUsIHRvTm9kZSwgb3B0aW9ucykge1xuICAgICAgICBpZiAoIW9wdGlvbnMpIHtcbiAgICAgICAgICAgIG9wdGlvbnMgPSB7fTtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmICh0eXBlb2YgdG9Ob2RlID09PSAnc3RyaW5nJykge1xuICAgICAgICAgICAgaWYgKGZyb21Ob2RlLm5vZGVOYW1lID09PSAnI2RvY3VtZW50JyB8fCBmcm9tTm9kZS5ub2RlTmFtZSA9PT0gJ0hUTUwnKSB7XG4gICAgICAgICAgICAgICAgdmFyIHRvTm9kZUh0bWwgPSB0b05vZGU7XG4gICAgICAgICAgICAgICAgdG9Ob2RlID0gZG9jLmNyZWF0ZUVsZW1lbnQoJ2h0bWwnKTtcbiAgICAgICAgICAgICAgICB0b05vZGUuaW5uZXJIVE1MID0gdG9Ob2RlSHRtbDtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgdG9Ob2RlID0gdG9FbGVtZW50KHRvTm9kZSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICB2YXIgZ2V0Tm9kZUtleSA9IG9wdGlvbnMuZ2V0Tm9kZUtleSB8fCBkZWZhdWx0R2V0Tm9kZUtleTtcbiAgICAgICAgdmFyIG9uQmVmb3JlTm9kZUFkZGVkID0gb3B0aW9ucy5vbkJlZm9yZU5vZGVBZGRlZCB8fCBub29wO1xuICAgICAgICB2YXIgb25Ob2RlQWRkZWQgPSBvcHRpb25zLm9uTm9kZUFkZGVkIHx8IG5vb3A7XG4gICAgICAgIHZhciBvbkJlZm9yZUVsVXBkYXRlZCA9IG9wdGlvbnMub25CZWZvcmVFbFVwZGF0ZWQgfHwgbm9vcDtcbiAgICAgICAgdmFyIG9uRWxVcGRhdGVkID0gb3B0aW9ucy5vbkVsVXBkYXRlZCB8fCBub29wO1xuICAgICAgICB2YXIgb25CZWZvcmVOb2RlRGlzY2FyZGVkID0gb3B0aW9ucy5vbkJlZm9yZU5vZGVEaXNjYXJkZWQgfHwgbm9vcDtcbiAgICAgICAgdmFyIG9uTm9kZURpc2NhcmRlZCA9IG9wdGlvbnMub25Ob2RlRGlzY2FyZGVkIHx8IG5vb3A7XG4gICAgICAgIHZhciBvbkJlZm9yZUVsQ2hpbGRyZW5VcGRhdGVkID0gb3B0aW9ucy5vbkJlZm9yZUVsQ2hpbGRyZW5VcGRhdGVkIHx8IG5vb3A7XG4gICAgICAgIHZhciBjaGlsZHJlbk9ubHkgPSBvcHRpb25zLmNoaWxkcmVuT25seSA9PT0gdHJ1ZTtcblxuICAgICAgICAvLyBUaGlzIG9iamVjdCBpcyB1c2VkIGFzIGEgbG9va3VwIHRvIHF1aWNrbHkgZmluZCBhbGwga2V5ZWQgZWxlbWVudHMgaW4gdGhlIG9yaWdpbmFsIERPTSB0cmVlLlxuICAgICAgICB2YXIgZnJvbU5vZGVzTG9va3VwID0ge307XG4gICAgICAgIHZhciBrZXllZFJlbW92YWxMaXN0O1xuXG4gICAgICAgIGZ1bmN0aW9uIGFkZEtleWVkUmVtb3ZhbChrZXkpIHtcbiAgICAgICAgICAgIGlmIChrZXllZFJlbW92YWxMaXN0KSB7XG4gICAgICAgICAgICAgICAga2V5ZWRSZW1vdmFsTGlzdC5wdXNoKGtleSk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIGtleWVkUmVtb3ZhbExpc3QgPSBba2V5XTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIGZ1bmN0aW9uIHdhbGtEaXNjYXJkZWRDaGlsZE5vZGVzKG5vZGUsIHNraXBLZXllZE5vZGVzKSB7XG4gICAgICAgICAgICBpZiAobm9kZS5ub2RlVHlwZSA9PT0gRUxFTUVOVF9OT0RFKSB7XG4gICAgICAgICAgICAgICAgdmFyIGN1ckNoaWxkID0gbm9kZS5maXJzdENoaWxkO1xuICAgICAgICAgICAgICAgIHdoaWxlIChjdXJDaGlsZCkge1xuXG4gICAgICAgICAgICAgICAgICAgIHZhciBrZXkgPSB1bmRlZmluZWQ7XG5cbiAgICAgICAgICAgICAgICAgICAgaWYgKHNraXBLZXllZE5vZGVzICYmIChrZXkgPSBnZXROb2RlS2V5KGN1ckNoaWxkKSkpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIElmIHdlIGFyZSBza2lwcGluZyBrZXllZCBub2RlcyB0aGVuIHdlIGFkZCB0aGUga2V5XG4gICAgICAgICAgICAgICAgICAgICAgICAvLyB0byBhIGxpc3Qgc28gdGhhdCBpdCBjYW4gYmUgaGFuZGxlZCBhdCB0aGUgdmVyeSBlbmQuXG4gICAgICAgICAgICAgICAgICAgICAgICBhZGRLZXllZFJlbW92YWwoa2V5KTtcbiAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIE9ubHkgcmVwb3J0IHRoZSBub2RlIGFzIGRpc2NhcmRlZCBpZiBpdCBpcyBub3Qga2V5ZWQuIFdlIGRvIHRoaXMgYmVjYXVzZVxuICAgICAgICAgICAgICAgICAgICAgICAgLy8gYXQgdGhlIGVuZCB3ZSBsb29wIHRocm91Z2ggYWxsIGtleWVkIGVsZW1lbnRzIHRoYXQgd2VyZSB1bm1hdGNoZWRcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIGFuZCB0aGVuIGRpc2NhcmQgdGhlbSBpbiBvbmUgZmluYWwgcGFzcy5cbiAgICAgICAgICAgICAgICAgICAgICAgIG9uTm9kZURpc2NhcmRlZChjdXJDaGlsZCk7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoY3VyQ2hpbGQuZmlyc3RDaGlsZCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHdhbGtEaXNjYXJkZWRDaGlsZE5vZGVzKGN1ckNoaWxkLCBza2lwS2V5ZWROb2Rlcyk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgICAgICBjdXJDaGlsZCA9IGN1ckNoaWxkLm5leHRTaWJsaW5nO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIC8qKlxuICAgICAgICAgKiBSZW1vdmVzIGEgRE9NIG5vZGUgb3V0IG9mIHRoZSBvcmlnaW5hbCBET01cbiAgICAgICAgICpcbiAgICAgICAgICogQHBhcmFtICB7Tm9kZX0gbm9kZSBUaGUgbm9kZSB0byByZW1vdmVcbiAgICAgICAgICogQHBhcmFtICB7Tm9kZX0gcGFyZW50Tm9kZSBUaGUgbm9kZXMgcGFyZW50XG4gICAgICAgICAqIEBwYXJhbSAge0Jvb2xlYW59IHNraXBLZXllZE5vZGVzIElmIHRydWUgdGhlbiBlbGVtZW50cyB3aXRoIGtleXMgd2lsbCBiZSBza2lwcGVkIGFuZCBub3QgZGlzY2FyZGVkLlxuICAgICAgICAgKiBAcmV0dXJuIHt1bmRlZmluZWR9XG4gICAgICAgICAqL1xuICAgICAgICBmdW5jdGlvbiByZW1vdmVOb2RlKG5vZGUsIHBhcmVudE5vZGUsIHNraXBLZXllZE5vZGVzKSB7XG4gICAgICAgICAgICBpZiAob25CZWZvcmVOb2RlRGlzY2FyZGVkKG5vZGUpID09PSBmYWxzZSkge1xuICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgaWYgKHBhcmVudE5vZGUpIHtcbiAgICAgICAgICAgICAgICBwYXJlbnROb2RlLnJlbW92ZUNoaWxkKG5vZGUpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBvbk5vZGVEaXNjYXJkZWQobm9kZSk7XG4gICAgICAgICAgICB3YWxrRGlzY2FyZGVkQ2hpbGROb2Rlcyhub2RlLCBza2lwS2V5ZWROb2Rlcyk7XG4gICAgICAgIH1cblxuICAgICAgICAvLyAvLyBUcmVlV2Fsa2VyIGltcGxlbWVudGF0aW9uIGlzIG5vIGZhc3RlciwgYnV0IGtlZXBpbmcgdGhpcyBhcm91bmQgaW4gY2FzZSB0aGlzIGNoYW5nZXMgaW4gdGhlIGZ1dHVyZVxuICAgICAgICAvLyBmdW5jdGlvbiBpbmRleFRyZWUocm9vdCkge1xuICAgICAgICAvLyAgICAgdmFyIHRyZWVXYWxrZXIgPSBkb2N1bWVudC5jcmVhdGVUcmVlV2Fsa2VyKFxuICAgICAgICAvLyAgICAgICAgIHJvb3QsXG4gICAgICAgIC8vICAgICAgICAgTm9kZUZpbHRlci5TSE9XX0VMRU1FTlQpO1xuICAgICAgICAvL1xuICAgICAgICAvLyAgICAgdmFyIGVsO1xuICAgICAgICAvLyAgICAgd2hpbGUoKGVsID0gdHJlZVdhbGtlci5uZXh0Tm9kZSgpKSkge1xuICAgICAgICAvLyAgICAgICAgIHZhciBrZXkgPSBnZXROb2RlS2V5KGVsKTtcbiAgICAgICAgLy8gICAgICAgICBpZiAoa2V5KSB7XG4gICAgICAgIC8vICAgICAgICAgICAgIGZyb21Ob2Rlc0xvb2t1cFtrZXldID0gZWw7XG4gICAgICAgIC8vICAgICAgICAgfVxuICAgICAgICAvLyAgICAgfVxuICAgICAgICAvLyB9XG5cbiAgICAgICAgLy8gLy8gTm9kZUl0ZXJhdG9yIGltcGxlbWVudGF0aW9uIGlzIG5vIGZhc3RlciwgYnV0IGtlZXBpbmcgdGhpcyBhcm91bmQgaW4gY2FzZSB0aGlzIGNoYW5nZXMgaW4gdGhlIGZ1dHVyZVxuICAgICAgICAvL1xuICAgICAgICAvLyBmdW5jdGlvbiBpbmRleFRyZWUobm9kZSkge1xuICAgICAgICAvLyAgICAgdmFyIG5vZGVJdGVyYXRvciA9IGRvY3VtZW50LmNyZWF0ZU5vZGVJdGVyYXRvcihub2RlLCBOb2RlRmlsdGVyLlNIT1dfRUxFTUVOVCk7XG4gICAgICAgIC8vICAgICB2YXIgZWw7XG4gICAgICAgIC8vICAgICB3aGlsZSgoZWwgPSBub2RlSXRlcmF0b3IubmV4dE5vZGUoKSkpIHtcbiAgICAgICAgLy8gICAgICAgICB2YXIga2V5ID0gZ2V0Tm9kZUtleShlbCk7XG4gICAgICAgIC8vICAgICAgICAgaWYgKGtleSkge1xuICAgICAgICAvLyAgICAgICAgICAgICBmcm9tTm9kZXNMb29rdXBba2V5XSA9IGVsO1xuICAgICAgICAvLyAgICAgICAgIH1cbiAgICAgICAgLy8gICAgIH1cbiAgICAgICAgLy8gfVxuXG4gICAgICAgIGZ1bmN0aW9uIGluZGV4VHJlZShub2RlKSB7XG4gICAgICAgICAgICBpZiAobm9kZS5ub2RlVHlwZSA9PT0gRUxFTUVOVF9OT0RFKSB7XG4gICAgICAgICAgICAgICAgdmFyIGN1ckNoaWxkID0gbm9kZS5maXJzdENoaWxkO1xuICAgICAgICAgICAgICAgIHdoaWxlIChjdXJDaGlsZCkge1xuICAgICAgICAgICAgICAgICAgICB2YXIga2V5ID0gZ2V0Tm9kZUtleShjdXJDaGlsZCk7XG4gICAgICAgICAgICAgICAgICAgIGlmIChrZXkpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGZyb21Ob2Rlc0xvb2t1cFtrZXldID0gY3VyQ2hpbGQ7XG4gICAgICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgICAgICAvLyBXYWxrIHJlY3Vyc2l2ZWx5XG4gICAgICAgICAgICAgICAgICAgIGluZGV4VHJlZShjdXJDaGlsZCk7XG5cbiAgICAgICAgICAgICAgICAgICAgY3VyQ2hpbGQgPSBjdXJDaGlsZC5uZXh0U2libGluZztcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICBpbmRleFRyZWUoZnJvbU5vZGUpO1xuXG4gICAgICAgIGZ1bmN0aW9uIGhhbmRsZU5vZGVBZGRlZChlbCkge1xuICAgICAgICAgICAgb25Ob2RlQWRkZWQoZWwpO1xuXG4gICAgICAgICAgICB2YXIgY3VyQ2hpbGQgPSBlbC5maXJzdENoaWxkO1xuICAgICAgICAgICAgd2hpbGUgKGN1ckNoaWxkKSB7XG4gICAgICAgICAgICAgICAgdmFyIG5leHRTaWJsaW5nID0gY3VyQ2hpbGQubmV4dFNpYmxpbmc7XG5cbiAgICAgICAgICAgICAgICB2YXIga2V5ID0gZ2V0Tm9kZUtleShjdXJDaGlsZCk7XG4gICAgICAgICAgICAgICAgaWYgKGtleSkge1xuICAgICAgICAgICAgICAgICAgICB2YXIgdW5tYXRjaGVkRnJvbUVsID0gZnJvbU5vZGVzTG9va3VwW2tleV07XG4gICAgICAgICAgICAgICAgICAgIGlmICh1bm1hdGNoZWRGcm9tRWwgJiYgY29tcGFyZU5vZGVOYW1lcyhjdXJDaGlsZCwgdW5tYXRjaGVkRnJvbUVsKSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgY3VyQ2hpbGQucGFyZW50Tm9kZS5yZXBsYWNlQ2hpbGQodW5tYXRjaGVkRnJvbUVsLCBjdXJDaGlsZCk7XG4gICAgICAgICAgICAgICAgICAgICAgICBtb3JwaEVsKHVubWF0Y2hlZEZyb21FbCwgY3VyQ2hpbGQpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgaGFuZGxlTm9kZUFkZGVkKGN1ckNoaWxkKTtcbiAgICAgICAgICAgICAgICBjdXJDaGlsZCA9IG5leHRTaWJsaW5nO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgZnVuY3Rpb24gbW9ycGhFbChmcm9tRWwsIHRvRWwsIGNoaWxkcmVuT25seSkge1xuICAgICAgICAgICAgdmFyIHRvRWxLZXkgPSBnZXROb2RlS2V5KHRvRWwpO1xuICAgICAgICAgICAgdmFyIGN1ckZyb21Ob2RlS2V5O1xuXG4gICAgICAgICAgICBpZiAodG9FbEtleSkge1xuICAgICAgICAgICAgICAgIC8vIElmIGFuIGVsZW1lbnQgd2l0aCBhbiBJRCBpcyBiZWluZyBtb3JwaGVkIHRoZW4gaXQgaXMgd2lsbCBiZSBpbiB0aGUgZmluYWxcbiAgICAgICAgICAgICAgICAvLyBET00gc28gY2xlYXIgaXQgb3V0IG9mIHRoZSBzYXZlZCBlbGVtZW50cyBjb2xsZWN0aW9uXG4gICAgICAgICAgICAgICAgZGVsZXRlIGZyb21Ob2Rlc0xvb2t1cFt0b0VsS2V5XTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgaWYgKHRvTm9kZS5pc1NhbWVOb2RlICYmIHRvTm9kZS5pc1NhbWVOb2RlKGZyb21Ob2RlKSkge1xuICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgaWYgKCFjaGlsZHJlbk9ubHkpIHtcbiAgICAgICAgICAgICAgICBpZiAob25CZWZvcmVFbFVwZGF0ZWQoZnJvbUVsLCB0b0VsKSA9PT0gZmFsc2UpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIG1vcnBoQXR0cnMoZnJvbUVsLCB0b0VsKTtcbiAgICAgICAgICAgICAgICBvbkVsVXBkYXRlZChmcm9tRWwpO1xuXG4gICAgICAgICAgICAgICAgaWYgKG9uQmVmb3JlRWxDaGlsZHJlblVwZGF0ZWQoZnJvbUVsLCB0b0VsKSA9PT0gZmFsc2UpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgaWYgKGZyb21FbC5ub2RlTmFtZSAhPT0gJ1RFWFRBUkVBJykge1xuICAgICAgICAgICAgICAgIHZhciBjdXJUb05vZGVDaGlsZCA9IHRvRWwuZmlyc3RDaGlsZDtcbiAgICAgICAgICAgICAgICB2YXIgY3VyRnJvbU5vZGVDaGlsZCA9IGZyb21FbC5maXJzdENoaWxkO1xuICAgICAgICAgICAgICAgIHZhciBjdXJUb05vZGVLZXk7XG5cbiAgICAgICAgICAgICAgICB2YXIgZnJvbU5leHRTaWJsaW5nO1xuICAgICAgICAgICAgICAgIHZhciB0b05leHRTaWJsaW5nO1xuICAgICAgICAgICAgICAgIHZhciBtYXRjaGluZ0Zyb21FbDtcblxuICAgICAgICAgICAgICAgIG91dGVyOiB3aGlsZSAoY3VyVG9Ob2RlQ2hpbGQpIHtcbiAgICAgICAgICAgICAgICAgICAgdG9OZXh0U2libGluZyA9IGN1clRvTm9kZUNoaWxkLm5leHRTaWJsaW5nO1xuICAgICAgICAgICAgICAgICAgICBjdXJUb05vZGVLZXkgPSBnZXROb2RlS2V5KGN1clRvTm9kZUNoaWxkKTtcblxuICAgICAgICAgICAgICAgICAgICB3aGlsZSAoY3VyRnJvbU5vZGVDaGlsZCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgZnJvbU5leHRTaWJsaW5nID0gY3VyRnJvbU5vZGVDaGlsZC5uZXh0U2libGluZztcblxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGN1clRvTm9kZUNoaWxkLmlzU2FtZU5vZGUgJiYgY3VyVG9Ob2RlQ2hpbGQuaXNTYW1lTm9kZShjdXJGcm9tTm9kZUNoaWxkKSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGN1clRvTm9kZUNoaWxkID0gdG9OZXh0U2libGluZztcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjdXJGcm9tTm9kZUNoaWxkID0gZnJvbU5leHRTaWJsaW5nO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnRpbnVlIG91dGVyO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgICAgICAgICBjdXJGcm9tTm9kZUtleSA9IGdldE5vZGVLZXkoY3VyRnJvbU5vZGVDaGlsZCk7XG5cbiAgICAgICAgICAgICAgICAgICAgICAgIHZhciBjdXJGcm9tTm9kZVR5cGUgPSBjdXJGcm9tTm9kZUNoaWxkLm5vZGVUeXBlO1xuXG4gICAgICAgICAgICAgICAgICAgICAgICB2YXIgaXNDb21wYXRpYmxlID0gdW5kZWZpbmVkO1xuXG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoY3VyRnJvbU5vZGVUeXBlID09PSBjdXJUb05vZGVDaGlsZC5ub2RlVHlwZSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChjdXJGcm9tTm9kZVR5cGUgPT09IEVMRU1FTlRfTk9ERSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBCb3RoIG5vZGVzIGJlaW5nIGNvbXBhcmVkIGFyZSBFbGVtZW50IG5vZGVzXG5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGN1clRvTm9kZUtleSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gVGhlIHRhcmdldCBub2RlIGhhcyBhIGtleSBzbyB3ZSB3YW50IHRvIG1hdGNoIGl0IHVwIHdpdGggdGhlIGNvcnJlY3QgZWxlbWVudFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gaW4gdGhlIG9yaWdpbmFsIERPTSB0cmVlXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoY3VyVG9Ob2RlS2V5ICE9PSBjdXJGcm9tTm9kZUtleSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIFRoZSBjdXJyZW50IGVsZW1lbnQgaW4gdGhlIG9yaWdpbmFsIERPTSB0cmVlIGRvZXMgbm90IGhhdmUgYSBtYXRjaGluZyBrZXkgc29cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBsZXQncyBjaGVjayBvdXIgbG9va3VwIHRvIHNlZSBpZiB0aGVyZSBpcyBhIG1hdGNoaW5nIGVsZW1lbnQgaW4gdGhlIG9yaWdpbmFsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gRE9NIHRyZWVcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoKG1hdGNoaW5nRnJvbUVsID0gZnJvbU5vZGVzTG9va3VwW2N1clRvTm9kZUtleV0pKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChjdXJGcm9tTm9kZUNoaWxkLm5leHRTaWJsaW5nID09PSBtYXRjaGluZ0Zyb21FbCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gU3BlY2lhbCBjYXNlIGZvciBzaW5nbGUgZWxlbWVudCByZW1vdmFscy4gVG8gYXZvaWQgcmVtb3ZpbmcgdGhlIG9yaWdpbmFsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBET00gbm9kZSBvdXQgb2YgdGhlIHRyZWUgKHNpbmNlIHRoYXQgY2FuIGJyZWFrIENTUyB0cmFuc2l0aW9ucywgZXRjLiksXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyB3ZSB3aWxsIGluc3RlYWQgZGlzY2FyZCB0aGUgY3VycmVudCBub2RlIGFuZCB3YWl0IHVudGlsIHRoZSBuZXh0XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBpdGVyYXRpb24gdG8gcHJvcGVybHkgbWF0Y2ggdXAgdGhlIGtleWVkIHRhcmdldCBlbGVtZW50IHdpdGggaXRzIG1hdGNoaW5nXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBlbGVtZW50IGluIHRoZSBvcmlnaW5hbCB0cmVlXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpc0NvbXBhdGlibGUgPSBmYWxzZTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIFdlIGZvdW5kIGEgbWF0Y2hpbmcga2V5ZWQgZWxlbWVudCBzb21ld2hlcmUgaW4gdGhlIG9yaWdpbmFsIERPTSB0cmVlLlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gTGV0J3MgbW92aW5nIHRoZSBvcmlnaW5hbCBET00gbm9kZSBpbnRvIHRoZSBjdXJyZW50IHBvc2l0aW9uIGFuZCBtb3JwaFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gaXQuXG5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIE5PVEU6IFdlIHVzZSBpbnNlcnRCZWZvcmUgaW5zdGVhZCBvZiByZXBsYWNlQ2hpbGQgYmVjYXVzZSB3ZSB3YW50IHRvIGdvIHRocm91Z2hcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIHRoZSBgcmVtb3ZlTm9kZSgpYCBmdW5jdGlvbiBmb3IgdGhlIG5vZGUgdGhhdCBpcyBiZWluZyBkaXNjYXJkZWQgc28gdGhhdFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gYWxsIGxpZmVjeWNsZSBob29rcyBhcmUgY29ycmVjdGx5IGludm9rZWRcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGZyb21FbC5pbnNlcnRCZWZvcmUobWF0Y2hpbmdGcm9tRWwsIGN1ckZyb21Ob2RlQ2hpbGQpO1xuXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBmcm9tTmV4dFNpYmxpbmcgPSBjdXJGcm9tTm9kZUNoaWxkLm5leHRTaWJsaW5nO1xuXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoY3VyRnJvbU5vZGVLZXkpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBTaW5jZSB0aGUgbm9kZSBpcyBrZXllZCBpdCBtaWdodCBiZSBtYXRjaGVkIHVwIGxhdGVyIHNvIHdlIGRlZmVyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gdGhlIGFjdHVhbCByZW1vdmFsIHRvIGxhdGVyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgYWRkS2V5ZWRSZW1vdmFsKGN1ckZyb21Ob2RlS2V5KTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gTk9URTogd2Ugc2tpcCBuZXN0ZWQga2V5ZWQgbm9kZXMgZnJvbSBiZWluZyByZW1vdmVkIHNpbmNlIHRoZXJlIGlzXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gICAgICAgc3RpbGwgYSBjaGFuY2UgdGhleSB3aWxsIGJlIG1hdGNoZWQgdXAgbGF0ZXJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICByZW1vdmVOb2RlKGN1ckZyb21Ob2RlQ2hpbGQsIGZyb21FbCwgdHJ1ZSAvKiBza2lwIGtleWVkIG5vZGVzICovKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY3VyRnJvbU5vZGVDaGlsZCA9IG1hdGNoaW5nRnJvbUVsO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gVGhlIG5vZGVzIGFyZSBub3QgY29tcGF0aWJsZSBzaW5jZSB0aGUgXCJ0b1wiIG5vZGUgaGFzIGEga2V5IGFuZCB0aGVyZVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBpcyBubyBtYXRjaGluZyBrZXllZCBub2RlIGluIHRoZSBzb3VyY2UgdHJlZVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpc0NvbXBhdGlibGUgPSBmYWxzZTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAoY3VyRnJvbU5vZGVLZXkpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIFRoZSBvcmlnaW5hbCBoYXMgYSBrZXlcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlzQ29tcGF0aWJsZSA9IGZhbHNlO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaXNDb21wYXRpYmxlID0gaXNDb21wYXRpYmxlICE9PSBmYWxzZSAmJiBjb21wYXJlTm9kZU5hbWVzKGN1ckZyb21Ob2RlQ2hpbGQsIGN1clRvTm9kZUNoaWxkKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGlzQ29tcGF0aWJsZSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gV2UgZm91bmQgY29tcGF0aWJsZSBET00gZWxlbWVudHMgc28gdHJhbnNmb3JtXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyB0aGUgY3VycmVudCBcImZyb21cIiBub2RlIHRvIG1hdGNoIHRoZSBjdXJyZW50XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyB0YXJnZXQgRE9NIG5vZGUuXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBtb3JwaEVsKGN1ckZyb21Ob2RlQ2hpbGQsIGN1clRvTm9kZUNoaWxkKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfSBlbHNlIGlmIChjdXJGcm9tTm9kZVR5cGUgPT09IFRFWFRfTk9ERSB8fCBjdXJGcm9tTm9kZVR5cGUgPT0gQ09NTUVOVF9OT0RFKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIEJvdGggbm9kZXMgYmVpbmcgY29tcGFyZWQgYXJlIFRleHQgb3IgQ29tbWVudCBub2Rlc1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpc0NvbXBhdGlibGUgPSB0cnVlO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBTaW1wbHkgdXBkYXRlIG5vZGVWYWx1ZSBvbiB0aGUgb3JpZ2luYWwgbm9kZSB0b1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBjaGFuZ2UgdGhlIHRleHQgdmFsdWVcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGN1ckZyb21Ob2RlQ2hpbGQubm9kZVZhbHVlICE9PSBjdXJUb05vZGVDaGlsZC5ub2RlVmFsdWUpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGN1ckZyb21Ob2RlQ2hpbGQubm9kZVZhbHVlID0gY3VyVG9Ob2RlQ2hpbGQubm9kZVZhbHVlO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChpc0NvbXBhdGlibGUpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBBZHZhbmNlIGJvdGggdGhlIFwidG9cIiBjaGlsZCBhbmQgdGhlIFwiZnJvbVwiIGNoaWxkIHNpbmNlIHdlIGZvdW5kIGEgbWF0Y2hcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjdXJUb05vZGVDaGlsZCA9IHRvTmV4dFNpYmxpbmc7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY3VyRnJvbU5vZGVDaGlsZCA9IGZyb21OZXh0U2libGluZztcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb250aW51ZSBvdXRlcjtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgICAgICAgICAgLy8gTm8gY29tcGF0aWJsZSBtYXRjaCBzbyByZW1vdmUgdGhlIG9sZCBub2RlIGZyb20gdGhlIERPTSBhbmQgY29udGludWUgdHJ5aW5nIHRvIGZpbmQgYVxuICAgICAgICAgICAgICAgICAgICAgICAgLy8gbWF0Y2ggaW4gdGhlIG9yaWdpbmFsIERPTS4gSG93ZXZlciwgd2Ugb25seSBkbyB0aGlzIGlmIHRoZSBmcm9tIG5vZGUgaXMgbm90IGtleWVkXG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBzaW5jZSBpdCBpcyBwb3NzaWJsZSB0aGF0IGEga2V5ZWQgbm9kZSBtaWdodCBtYXRjaCB1cCB3aXRoIGEgbm9kZSBzb21ld2hlcmUgZWxzZSBpbiB0aGVcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIHRhcmdldCB0cmVlIGFuZCB3ZSBkb24ndCB3YW50IHRvIGRpc2NhcmQgaXQganVzdCB5ZXQgc2luY2UgaXQgc3RpbGwgbWlnaHQgZmluZCBhXG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBob21lIGluIHRoZSBmaW5hbCBET00gdHJlZS4gQWZ0ZXIgZXZlcnl0aGluZyBpcyBkb25lIHdlIHdpbGwgcmVtb3ZlIGFueSBrZXllZCBub2Rlc1xuICAgICAgICAgICAgICAgICAgICAgICAgLy8gdGhhdCBkaWRuJ3QgZmluZCBhIGhvbWVcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChjdXJGcm9tTm9kZUtleSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIFNpbmNlIHRoZSBub2RlIGlzIGtleWVkIGl0IG1pZ2h0IGJlIG1hdGNoZWQgdXAgbGF0ZXIgc28gd2UgZGVmZXJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyB0aGUgYWN0dWFsIHJlbW92YWwgdG8gbGF0ZXJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBhZGRLZXllZFJlbW92YWwoY3VyRnJvbU5vZGVLZXkpO1xuICAgICAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBOT1RFOiB3ZSBza2lwIG5lc3RlZCBrZXllZCBub2RlcyBmcm9tIGJlaW5nIHJlbW92ZWQgc2luY2UgdGhlcmUgaXNcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyAgICAgICBzdGlsbCBhIGNoYW5jZSB0aGV5IHdpbGwgYmUgbWF0Y2hlZCB1cCBsYXRlclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJlbW92ZU5vZGUoY3VyRnJvbU5vZGVDaGlsZCwgZnJvbUVsLCB0cnVlIC8qIHNraXAga2V5ZWQgbm9kZXMgKi8pO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgICAgICAgICBjdXJGcm9tTm9kZUNoaWxkID0gZnJvbU5leHRTaWJsaW5nO1xuICAgICAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAgICAgLy8gSWYgd2UgZ290IHRoaXMgZmFyIHRoZW4gd2UgZGlkIG5vdCBmaW5kIGEgY2FuZGlkYXRlIG1hdGNoIGZvclxuICAgICAgICAgICAgICAgICAgICAvLyBvdXIgXCJ0byBub2RlXCIgYW5kIHdlIGV4aGF1c3RlZCBhbGwgb2YgdGhlIGNoaWxkcmVuIFwiZnJvbVwiXG4gICAgICAgICAgICAgICAgICAgIC8vIG5vZGVzLiBUaGVyZWZvcmUsIHdlIHdpbGwganVzdCBhcHBlbmQgdGhlIGN1cnJlbnQgXCJ0b1wiIG5vZGVcbiAgICAgICAgICAgICAgICAgICAgLy8gdG8gdGhlIGVuZFxuICAgICAgICAgICAgICAgICAgICBpZiAoY3VyVG9Ob2RlS2V5ICYmIChtYXRjaGluZ0Zyb21FbCA9IGZyb21Ob2Rlc0xvb2t1cFtjdXJUb05vZGVLZXldKSAmJiBjb21wYXJlTm9kZU5hbWVzKG1hdGNoaW5nRnJvbUVsLCBjdXJUb05vZGVDaGlsZCkpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGZyb21FbC5hcHBlbmRDaGlsZChtYXRjaGluZ0Zyb21FbCk7XG4gICAgICAgICAgICAgICAgICAgICAgICBtb3JwaEVsKG1hdGNoaW5nRnJvbUVsLCBjdXJUb05vZGVDaGlsZCk7XG4gICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICB2YXIgb25CZWZvcmVOb2RlQWRkZWRSZXN1bHQgPSBvbkJlZm9yZU5vZGVBZGRlZChjdXJUb05vZGVDaGlsZCk7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAob25CZWZvcmVOb2RlQWRkZWRSZXN1bHQgIT09IGZhbHNlKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKG9uQmVmb3JlTm9kZUFkZGVkUmVzdWx0KSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGN1clRvTm9kZUNoaWxkID0gb25CZWZvcmVOb2RlQWRkZWRSZXN1bHQ7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGN1clRvTm9kZUNoaWxkLmFjdHVhbGl6ZSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjdXJUb05vZGVDaGlsZCA9IGN1clRvTm9kZUNoaWxkLmFjdHVhbGl6ZShmcm9tRWwub3duZXJEb2N1bWVudCB8fCBkb2MpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBmcm9tRWwuYXBwZW5kQ2hpbGQoY3VyVG9Ob2RlQ2hpbGQpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGhhbmRsZU5vZGVBZGRlZChjdXJUb05vZGVDaGlsZCk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgICAgICBjdXJUb05vZGVDaGlsZCA9IHRvTmV4dFNpYmxpbmc7XG4gICAgICAgICAgICAgICAgICAgIGN1ckZyb21Ob2RlQ2hpbGQgPSBmcm9tTmV4dFNpYmxpbmc7XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgLy8gV2UgaGF2ZSBwcm9jZXNzZWQgYWxsIG9mIHRoZSBcInRvIG5vZGVzXCIuIElmIGN1ckZyb21Ob2RlQ2hpbGQgaXNcbiAgICAgICAgICAgICAgICAvLyBub24tbnVsbCB0aGVuIHdlIHN0aWxsIGhhdmUgc29tZSBmcm9tIG5vZGVzIGxlZnQgb3ZlciB0aGF0IG5lZWRcbiAgICAgICAgICAgICAgICAvLyB0byBiZSByZW1vdmVkXG4gICAgICAgICAgICAgICAgd2hpbGUgKGN1ckZyb21Ob2RlQ2hpbGQpIHtcbiAgICAgICAgICAgICAgICAgICAgZnJvbU5leHRTaWJsaW5nID0gY3VyRnJvbU5vZGVDaGlsZC5uZXh0U2libGluZztcbiAgICAgICAgICAgICAgICAgICAgaWYgKChjdXJGcm9tTm9kZUtleSA9IGdldE5vZGVLZXkoY3VyRnJvbU5vZGVDaGlsZCkpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBTaW5jZSB0aGUgbm9kZSBpcyBrZXllZCBpdCBtaWdodCBiZSBtYXRjaGVkIHVwIGxhdGVyIHNvIHdlIGRlZmVyXG4gICAgICAgICAgICAgICAgICAgICAgICAvLyB0aGUgYWN0dWFsIHJlbW92YWwgdG8gbGF0ZXJcbiAgICAgICAgICAgICAgICAgICAgICAgIGFkZEtleWVkUmVtb3ZhbChjdXJGcm9tTm9kZUtleSk7XG4gICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBOT1RFOiB3ZSBza2lwIG5lc3RlZCBrZXllZCBub2RlcyBmcm9tIGJlaW5nIHJlbW92ZWQgc2luY2UgdGhlcmUgaXNcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vICAgICAgIHN0aWxsIGEgY2hhbmNlIHRoZXkgd2lsbCBiZSBtYXRjaGVkIHVwIGxhdGVyXG4gICAgICAgICAgICAgICAgICAgICAgICByZW1vdmVOb2RlKGN1ckZyb21Ob2RlQ2hpbGQsIGZyb21FbCwgdHJ1ZSAvKiBza2lwIGtleWVkIG5vZGVzICovKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICBjdXJGcm9tTm9kZUNoaWxkID0gZnJvbU5leHRTaWJsaW5nO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgdmFyIHNwZWNpYWxFbEhhbmRsZXIgPSBzcGVjaWFsRWxIYW5kbGVyc1tmcm9tRWwubm9kZU5hbWVdO1xuICAgICAgICAgICAgaWYgKHNwZWNpYWxFbEhhbmRsZXIpIHtcbiAgICAgICAgICAgICAgICBzcGVjaWFsRWxIYW5kbGVyKGZyb21FbCwgdG9FbCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0gLy8gRU5EOiBtb3JwaEVsKC4uLilcblxuICAgICAgICB2YXIgbW9ycGhlZE5vZGUgPSBmcm9tTm9kZTtcbiAgICAgICAgdmFyIG1vcnBoZWROb2RlVHlwZSA9IG1vcnBoZWROb2RlLm5vZGVUeXBlO1xuICAgICAgICB2YXIgdG9Ob2RlVHlwZSA9IHRvTm9kZS5ub2RlVHlwZTtcblxuICAgICAgICBpZiAoIWNoaWxkcmVuT25seSkge1xuICAgICAgICAgICAgLy8gSGFuZGxlIHRoZSBjYXNlIHdoZXJlIHdlIGFyZSBnaXZlbiB0d28gRE9NIG5vZGVzIHRoYXQgYXJlIG5vdFxuICAgICAgICAgICAgLy8gY29tcGF0aWJsZSAoZS5nLiA8ZGl2PiAtLT4gPHNwYW4+IG9yIDxkaXY+IC0tPiBURVhUKVxuICAgICAgICAgICAgaWYgKG1vcnBoZWROb2RlVHlwZSA9PT0gRUxFTUVOVF9OT0RFKSB7XG4gICAgICAgICAgICAgICAgaWYgKHRvTm9kZVR5cGUgPT09IEVMRU1FTlRfTk9ERSkge1xuICAgICAgICAgICAgICAgICAgICBpZiAoIWNvbXBhcmVOb2RlTmFtZXMoZnJvbU5vZGUsIHRvTm9kZSkpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIG9uTm9kZURpc2NhcmRlZChmcm9tTm9kZSk7XG4gICAgICAgICAgICAgICAgICAgICAgICBtb3JwaGVkTm9kZSA9IG1vdmVDaGlsZHJlbihmcm9tTm9kZSwgY3JlYXRlRWxlbWVudE5TKHRvTm9kZS5ub2RlTmFtZSwgdG9Ob2RlLm5hbWVzcGFjZVVSSSkpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgLy8gR29pbmcgZnJvbSBhbiBlbGVtZW50IG5vZGUgdG8gYSB0ZXh0IG5vZGVcbiAgICAgICAgICAgICAgICAgICAgbW9ycGhlZE5vZGUgPSB0b05vZGU7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSBlbHNlIGlmIChtb3JwaGVkTm9kZVR5cGUgPT09IFRFWFRfTk9ERSB8fCBtb3JwaGVkTm9kZVR5cGUgPT09IENPTU1FTlRfTk9ERSkgeyAvLyBUZXh0IG9yIGNvbW1lbnQgbm9kZVxuICAgICAgICAgICAgICAgIGlmICh0b05vZGVUeXBlID09PSBtb3JwaGVkTm9kZVR5cGUpIHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKG1vcnBoZWROb2RlLm5vZGVWYWx1ZSAhPT0gdG9Ob2RlLm5vZGVWYWx1ZSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgbW9ycGhlZE5vZGUubm9kZVZhbHVlID0gdG9Ob2RlLm5vZGVWYWx1ZTtcbiAgICAgICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBtb3JwaGVkTm9kZTtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAvLyBUZXh0IG5vZGUgdG8gc29tZXRoaW5nIGVsc2VcbiAgICAgICAgICAgICAgICAgICAgbW9ycGhlZE5vZGUgPSB0b05vZGU7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgaWYgKG1vcnBoZWROb2RlID09PSB0b05vZGUpIHtcbiAgICAgICAgICAgIC8vIFRoZSBcInRvIG5vZGVcIiB3YXMgbm90IGNvbXBhdGlibGUgd2l0aCB0aGUgXCJmcm9tIG5vZGVcIiBzbyB3ZSBoYWQgdG9cbiAgICAgICAgICAgIC8vIHRvc3Mgb3V0IHRoZSBcImZyb20gbm9kZVwiIGFuZCB1c2UgdGhlIFwidG8gbm9kZVwiXG4gICAgICAgICAgICBvbk5vZGVEaXNjYXJkZWQoZnJvbU5vZGUpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgbW9ycGhFbChtb3JwaGVkTm9kZSwgdG9Ob2RlLCBjaGlsZHJlbk9ubHkpO1xuXG4gICAgICAgICAgICAvLyBXZSBub3cgbmVlZCB0byBsb29wIG92ZXIgYW55IGtleWVkIG5vZGVzIHRoYXQgbWlnaHQgbmVlZCB0byBiZVxuICAgICAgICAgICAgLy8gcmVtb3ZlZC4gV2Ugb25seSBkbyB0aGUgcmVtb3ZhbCBpZiB3ZSBrbm93IHRoYXQgdGhlIGtleWVkIG5vZGVcbiAgICAgICAgICAgIC8vIG5ldmVyIGZvdW5kIGEgbWF0Y2guIFdoZW4gYSBrZXllZCBub2RlIGlzIG1hdGNoZWQgdXAgd2UgcmVtb3ZlXG4gICAgICAgICAgICAvLyBpdCBvdXQgb2YgZnJvbU5vZGVzTG9va3VwIGFuZCB3ZSB1c2UgZnJvbU5vZGVzTG9va3VwIHRvIGRldGVybWluZVxuICAgICAgICAgICAgLy8gaWYgYSBrZXllZCBub2RlIGhhcyBiZWVuIG1hdGNoZWQgdXAgb3Igbm90XG4gICAgICAgICAgICBpZiAoa2V5ZWRSZW1vdmFsTGlzdCkge1xuICAgICAgICAgICAgICAgIGZvciAodmFyIGk9MCwgbGVuPWtleWVkUmVtb3ZhbExpc3QubGVuZ3RoOyBpPGxlbjsgaSsrKSB7XG4gICAgICAgICAgICAgICAgICAgIHZhciBlbFRvUmVtb3ZlID0gZnJvbU5vZGVzTG9va3VwW2tleWVkUmVtb3ZhbExpc3RbaV1dO1xuICAgICAgICAgICAgICAgICAgICBpZiAoZWxUb1JlbW92ZSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmVtb3ZlTm9kZShlbFRvUmVtb3ZlLCBlbFRvUmVtb3ZlLnBhcmVudE5vZGUsIGZhbHNlKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIGlmICghY2hpbGRyZW5Pbmx5ICYmIG1vcnBoZWROb2RlICE9PSBmcm9tTm9kZSAmJiBmcm9tTm9kZS5wYXJlbnROb2RlKSB7XG4gICAgICAgICAgICBpZiAobW9ycGhlZE5vZGUuYWN0dWFsaXplKSB7XG4gICAgICAgICAgICAgICAgbW9ycGhlZE5vZGUgPSBtb3JwaGVkTm9kZS5hY3R1YWxpemUoZnJvbU5vZGUub3duZXJEb2N1bWVudCB8fCBkb2MpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgLy8gSWYgd2UgaGFkIHRvIHN3YXAgb3V0IHRoZSBmcm9tIG5vZGUgd2l0aCBhIG5ldyBub2RlIGJlY2F1c2UgdGhlIG9sZFxuICAgICAgICAgICAgLy8gbm9kZSB3YXMgbm90IGNvbXBhdGlibGUgd2l0aCB0aGUgdGFyZ2V0IG5vZGUgdGhlbiB3ZSBuZWVkIHRvXG4gICAgICAgICAgICAvLyByZXBsYWNlIHRoZSBvbGQgRE9NIG5vZGUgaW4gdGhlIG9yaWdpbmFsIERPTSB0cmVlLiBUaGlzIGlzIG9ubHlcbiAgICAgICAgICAgIC8vIHBvc3NpYmxlIGlmIHRoZSBvcmlnaW5hbCBET00gbm9kZSB3YXMgcGFydCBvZiBhIERPTSB0cmVlIHdoaWNoXG4gICAgICAgICAgICAvLyB3ZSBrbm93IGlzIHRoZSBjYXNlIGlmIGl0IGhhcyBhIHBhcmVudCBub2RlLlxuICAgICAgICAgICAgZnJvbU5vZGUucGFyZW50Tm9kZS5yZXBsYWNlQ2hpbGQobW9ycGhlZE5vZGUsIGZyb21Ob2RlKTtcbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiBtb3JwaGVkTm9kZTtcbiAgICB9O1xufVxuXG52YXIgbW9ycGhkb20gPSBtb3JwaGRvbUZhY3RvcnkobW9ycGhBdHRycyk7XG5cbm1vZHVsZS5leHBvcnRzID0gbW9ycGhkb207XG4iLCJ2YXIgZ2V0SWQgPSBmdW5jdGlvbiAoaWQpIHtcclxuICByZXR1cm4gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoaWQpXHJcbn1cclxuXHJcbmV4cG9ydHMuZ2V0SWQgPSBnZXRJZFxyXG5cclxuLy8gdmFyIGxvb3BDaGlsZHMgPSBmdW5jdGlvbiAoYXJyLCBlbGVtKSB7XHJcbi8vICAgZm9yICh2YXIgY2hpbGQgPSBlbGVtLmZpcnN0Q2hpbGQ7IGNoaWxkICE9PSBudWxsOyBjaGlsZCA9IGNoaWxkLm5leHRTaWJsaW5nKSB7XHJcbi8vICAgICBhcnIucHVzaChjaGlsZClcclxuLy8gICAgIGlmIChjaGlsZC5oYXNDaGlsZE5vZGVzKCkpIHtcclxuLy8gICAgICAgbG9vcENoaWxkcyhhcnIsIGNoaWxkKVxyXG4vLyAgICAgfVxyXG4vLyAgIH1cclxuLy8gfVxyXG5cclxuLy8gZXhwb3J0cy5sb29wQ2hpbGRzID0gbG9vcENoaWxkc1xyXG5cclxuZXhwb3J0cy50ZXN0RXZlbnQgPSBmdW5jdGlvbiAodG1wbCkge1xyXG4gIHJldHVybiAvIGstLy50ZXN0KHRtcGwpXHJcbn1cclxuXHJcbi8qKlxyXG4gKiBAcHJpdmF0ZVxyXG4gKiBAZGVzY3JpcHRpb25cclxuICogQ2hlY2sgYSBub2RlIGF2YWlsYWJpbGl0eSBpbiAyNTBtcywgaWYgbm90IGZvdW5kIHNpbGVudHkgc2tpcCB0aGUgZXZlbnRcclxuICpcclxuICogQHBhcmFtIHtzdHJpbmd9IGlkIC0gdGhlIG5vZGUgaWRcclxuICogQHBhcmFtIHtmdW5jdGlvbn0gY2FsbGJhY2sgLSB0aGUgZnVuY3Rpb24gdG8gZXhlY3V0ZSBvbmNlIHRoZSBub2RlIGlzIGZvdW5kXHJcbiAqL1xyXG5leHBvcnRzLmNoZWNrTm9kZUF2YWlsYWJpbGl0eSA9IGZ1bmN0aW9uIChjb21wb25lbnQsIGNvbXBvbmVudE5hbWUsIGNhbGxiYWNrLCBub3RGb3VuZCkge1xyXG4gIHZhciBlbGUgPSBnZXRJZChjb21wb25lbnQuZWwpXHJcbiAgdmFyIGZvdW5kID0gZmFsc2VcclxuICBpZiAoZWxlKSByZXR1cm4gZWxlXHJcbiAgZWxzZSB7XHJcbiAgICB2YXIgdCA9IHNldEludGVydmFsKGZ1bmN0aW9uICgpIHtcclxuICAgICAgZWxlID0gZ2V0SWQoY29tcG9uZW50LmVsKVxyXG4gICAgICBpZiAoZWxlKSB7XHJcbiAgICAgICAgY2xlYXJJbnRlcnZhbCh0KVxyXG4gICAgICAgIGZvdW5kID0gdHJ1ZVxyXG4gICAgICAgIGNhbGxiYWNrKGNvbXBvbmVudCwgY29tcG9uZW50TmFtZSwgZWxlKVxyXG4gICAgICB9XHJcbiAgICB9LCAwKVxyXG4gICAgLy8gc2lsZW50bHkgaWdub3JlIGZpbmRpbmcgdGhlIG5vZGUgYWZ0ZXIgc29tZXRpbWVzXHJcbiAgICBzZXRUaW1lb3V0KGZ1bmN0aW9uICgpIHtcclxuICAgICAgY2xlYXJJbnRlcnZhbCh0KVxyXG4gICAgICBpZighZm91bmQgJiYgbm90Rm91bmQgJiYgdHlwZW9mIG5vdEZvdW5kID09PSAnZnVuY3Rpb24nKSBub3RGb3VuZCgpXHJcbiAgICB9LCAyNTApXHJcbiAgfVxyXG59XHJcblxyXG4vKipcclxuICogQHByaXZhdGVcclxuICogQGRlc2NyaXB0aW9uXHJcbiAqIENvbmZpcm0gdGhhdCBhIHZhbHVlIGlzIHRydXRoeSwgdGhyb3dzIGFuIGVycm9yIG1lc3NhZ2Ugb3RoZXJ3aXNlLlxyXG4gKlxyXG4gKiBAcGFyYW0geyp9IHZhbCAtIHRoZSB2YWwgdG8gdGVzdC5cclxuICogQHBhcmFtIHtzdHJpbmd9IG1zZyAtIHRoZSBlcnJvciBtZXNzYWdlIG9uIGZhaWx1cmUuXHJcbiAqIEB0aHJvd3Mge0Vycm9yfVxyXG4gKi9cclxuZXhwb3J0cy5hc3NlcnQgPSBmdW5jdGlvbiAodmFsLCBtc2cpIHtcclxuICBpZiAoIXZhbCkgdGhyb3cgbmV3IEVycm9yKCcoa2VldCkgJyArIG1zZylcclxufVxyXG5cclxuLyoqXHJcbiAqIEBwcml2YXRlXHJcbiAqIEBkZXNjcmlwdGlvblxyXG4gKiBTaW1wbGUgaHRtbCB0ZW1wbGF0ZSBsaXRlcmFscyBNT0RJRklFRCBmcm9tIDogaHR0cDovLzJhbGl0eS5jb20vMjAxNS8wMS90ZW1wbGF0ZS1zdHJpbmdzLWh0bWwuaHRtbFxyXG4gKiBieSBEci4gQXhlbCBSYXVzY2htYXllclxyXG4gKiBubyBjaGVja2luZyBmb3Igd3JhcHBpbmcgaW4gcm9vdCBlbGVtZW50XHJcbiAqIG5vIHN0cmljdCBjaGVja2luZ1xyXG4gKiByZW1vdmUgc3BhY2luZyAvIGluZGVudGF0aW9uXHJcbiAqIGtlZXAgYWxsIHNwYWNpbmcgd2l0aGluIGh0bWwgdGFnc1xyXG4gKiBpbmNsdWRlIGhhbmRsaW5nICR7fSBpbiB0aGUgbGl0ZXJhbHNcclxuICovXHJcbmV4cG9ydHMuaHRtbCA9IGZ1bmN0aW9uIGh0bWwgKCkge1xyXG4gIHZhciBsaXRlcmFscyA9IFtdLnNoaWZ0LmNhbGwoYXJndW1lbnRzKVxyXG4gIHZhciBzdWJzdHMgPSBbXS5zbGljZS5jYWxsKGFyZ3VtZW50cylcclxuXHJcbiAgdmFyIHJlc3VsdCA9IGxpdGVyYWxzLnJhdy5yZWR1Y2UoZnVuY3Rpb24gKGFjYywgbGl0LCBpKSB7XHJcbiAgICByZXR1cm4gYWNjICsgc3Vic3RzW2kgLSAxXSArIGxpdFxyXG4gIH0pXHJcbiAgLy8gcmVtb3ZlIHNwYWNpbmcsIGluZGVudGF0aW9uIGZyb20gZXZlcnkgbGluZVxyXG4gIHJlc3VsdCA9IHJlc3VsdC5zcGxpdCgvXFxuKy8pXHJcbiAgcmVzdWx0ID0gcmVzdWx0Lm1hcChmdW5jdGlvbiAodCkge1xyXG4gICAgcmV0dXJuIHQudHJpbSgpXHJcbiAgfSkuam9pbignJylcclxuICByZXR1cm4gcmVzdWx0XHJcbn1cclxuXHJcbi8qKlxyXG4gKiBAcHJpdmF0ZVxyXG4gKiBAZGVzY3JpcHRpb25cclxuICogQ29weSB3aXRoIG1vZGlmaWNhdGlvbiBmcm9tIHByZWFjdC10b2RvbXZjLiBNb2RlbCBjb25zdHJ1Y3RvciB3aXRoXHJcbiAqIHJlZ2lzdGVyaW5nIGNhbGxiYWNrIGxpc3RlbmVyIGluIE9iamVjdC5kZWZpbmVQcm9wZXJ0eS4gQW55IG1vZGlmaWNhdGlvblxyXG4gKiB0byBgYGB0aGlzLmxpc3RgYGAgaW5zdGFuY2Ugd2lsbCBzdWJzZXF1ZW50bHkgaW5mb3JtIGFsbCByZWdpc3RlcmVkIGxpc3RlbmVyLlxyXG4gKlxyXG4gKiB7e21vZGVsOjxteU1vZGVsPn19PG15TW9kZWxUZW1wbGF0ZVN0cmluZz57ey9tb2RlbDo8bXlNb2RlbD59fVxyXG4gKlxyXG4gKi9cclxuZnVuY3Rpb24gY3JlYXRlTW9kZWwoKSB7XHJcbiAgdmFyIG1vZGVsID0gW11cclxuICB2YXIgb25DaGFuZ2VzID0gW11cclxuXHJcbiAgdmFyIGluZm9ybSA9IGZ1bmN0aW9uICgpIHtcclxuICAgIC8vIGNvbnNvbGUudHJhY2Uob25DaGFuZ2VzKVxyXG4gICAgZm9yICh2YXIgaSA9IG9uQ2hhbmdlcy5sZW5ndGg7IGktLTspIHtcclxuICAgICAgb25DaGFuZ2VzW2ldKG1vZGVsKVxyXG4gICAgfVxyXG4gIH1cclxuXHJcbi8qKlxyXG4gKiBAcHJpdmF0ZVxyXG4gKiBAZGVzY3JpcHRpb25cclxuICogUmVnaXN0ZXIgY2FsbGJhY2sgbGlzdGVuZXIgb2YgYW55IGNoYW5nZXNcclxuICovXHJcbiAgT2JqZWN0LmRlZmluZVByb3BlcnR5KHRoaXMsICdsaXN0Jywge1xyXG4gICAgZW51bWVyYWJsZTogZmFsc2UsXHJcbiAgICBjb25maWd1cmFibGU6IHRydWUsXHJcbiAgICBnZXQ6IGZ1bmN0aW9uICgpIHtcclxuICAgICAgcmV0dXJuIG1vZGVsXHJcbiAgICB9LFxyXG4gICAgc2V0OiBmdW5jdGlvbiAodmFsKSB7XHJcbiAgICAgIG1vZGVsID0gdmFsXHJcbiAgICAgIGluZm9ybSgpXHJcbiAgICB9XHJcbiAgfSlcclxuXHJcbi8qKlxyXG4gKiBAcHJpdmF0ZVxyXG4gKiBAZGVzY3JpcHRpb25cclxuICogU3Vic2NyaWJlIHRvIHRoZSBtb2RlbCBjaGFuZ2VzIChhZGQvdXBkYXRlL2Rlc3Ryb3kpXHJcbiAqXHJcbiAqIEBwYXJhbSB7T2JqZWN0fSBtb2RlbCAtIHRoZSBtb2RlbCBpbmNsdWRpbmcgYWxsIHByb3RvdHlwZXNcclxuICpcclxuICovXHJcbiAgdGhpcy5zdWJzY3JpYmUgPSBmdW5jdGlvbiAoZm4pIHtcclxuICAgIG9uQ2hhbmdlcy5wdXNoKGZuKVxyXG4gIH1cclxuXHJcbi8qKlxyXG4gKiBAcHJpdmF0ZVxyXG4gKiBAZGVzY3JpcHRpb25cclxuICogQWRkIG5ldyBvYmplY3QgdG8gdGhlIG1vZGVsIGxpc3RcclxuICpcclxuICogQHBhcmFtIHtPYmplY3R9IG9iaiAtIG5ldyBvYmplY3QgdG8gYWRkIGludG8gdGhlIG1vZGVsIGxpc3RcclxuICpcclxuICovXHJcbiAgdGhpcy5hZGQgPSBmdW5jdGlvbiAob2JqKSB7XHJcbiAgICB0aGlzLmxpc3QgPSB0aGlzLmxpc3QuY29uY2F0KG9iailcclxuICB9XHJcblxyXG4vKipcclxuICogQHByaXZhdGVcclxuICogQGRlc2NyaXB0aW9uXHJcbiAqIFVwZGF0ZSBleGlzdGluZyBvYmplY3QgaW4gdGhlIG1vZGVsIGxpc3RcclxuICpcclxuICogQHBhcmFtIHtTdHJpbmd9IGxvb2t1cElkIC0gbG9va3VwIGlkIHByb3BlcnR5IG5hbWUgb2YgdGhlIG9iamVjdFxyXG4gKiBAcGFyYW0ge09iamVjdH0gdXBkYXRlT2JqIC0gdGhlIHVwZGF0ZWQgcHJvcGVydGllc1xyXG4gKlxyXG4gKi9cclxuICB0aGlzLnVwZGF0ZSA9IGZ1bmN0aW9uIChsb29rdXBJZCwgdXBkYXRlT2JqKSB7XHJcbiAgICB0aGlzLmxpc3QgPSB0aGlzLmxpc3QubWFwKGZ1bmN0aW9uIChvYmopIHtcclxuICAgICAgcmV0dXJuIG9ialtsb29rdXBJZF0gIT09IHVwZGF0ZU9ialtsb29rdXBJZF0gPyBvYmogOiBPYmplY3QuYXNzaWduKG9iaiwgdXBkYXRlT2JqKVxyXG4gICAgfSlcclxuICB9XHJcblxyXG4vKipcclxuICogQHByaXZhdGVcclxuICogQGRlc2NyaXB0aW9uXHJcbiAqIFJlbW92ZWQgZXhpc3Rpbmcgb2JqZWN0IGluIHRoZSBtb2RlbCBsaXN0XHJcbiAqXHJcbiAqIEBwYXJhbSB7U3RyaW5nfSBsb29rdXBJZCAtIGxvb2t1cCBpZCBwcm9wZXJ0eSBuYW1lIG9mIHRoZSBvYmplY3RcclxuICogQHBhcmFtIHtTdHJpbmd9IG9iaklkIC0gdW5pcXVlIGlkZW50aWZpZXIgb2YgdGhlIGxvb2t1cCBpZFxyXG4gKlxyXG4gKi9cclxuICB0aGlzLmRlc3Ryb3kgPSBmdW5jdGlvbiAobG9va3VwSWQsIG9iaklkKSB7XHJcbiAgICB0aGlzLmxpc3QgPSB0aGlzLmxpc3QuZmlsdGVyKGZ1bmN0aW9uIChvYmopIHtcclxuICAgICAgcmV0dXJuIG9ialtsb29rdXBJZF0gIT09IG9iaklkXHJcbiAgICB9KVxyXG4gIH1cclxufVxyXG5cclxuZXhwb3J0cy5jcmVhdGVNb2RlbCA9IGNyZWF0ZU1vZGVsXHJcbiIsImNvbnN0IEtlZXQgPSByZXF1aXJlKCcuLi9rZWV0JylcclxuY29uc3QgeyBodG1sIH0gPSByZXF1aXJlICgnLi4va2VldC91dGlscycpXHJcbmNvbnN0IHsgY2FtZWxDYXNlICwgZ2VuSWQgfSA9IHJlcXVpcmUoJy4vdXRpbCcpXHJcbmNvbnN0IGNyZWF0ZVRvZG9Nb2RlbCA9IHJlcXVpcmUoJy4vdG9kb01vZGVsJylcclxuY29uc3QgZmlsdGVyUGFnZSA9IFsnYWxsJywgJ2FjdGl2ZScsICdjb21wbGV0ZWQnXVxyXG4vLyBjb25zdCBmaWx0ZXJzVG1wbCA9IHJlcXVpcmUoJy4vZmlsdGVycycpKGZpbHRlclBhZ2UpXHJcbmNvbnN0IGZpbHRlckFwcCA9IHJlcXVpcmUoJy4vZmlsdGVyJylcclxuY29uc3QgdG9kb3MgPSByZXF1aXJlKCcuL3RvZG8nKVxyXG5cclxubGV0IGMgPSAwXHJcblxyXG4vLyBsZXQgc3RhcnRcclxuXHJcbi8vIGxldCB0aW1lXHJcblxyXG5jbGFzcyBBcHAgZXh0ZW5kcyBLZWV0IHtcclxuICB0b2RvTW9kZWwgPSB0b2Rvc1xyXG4gIGZpbHRlciA9IGZpbHRlckFwcFxyXG4gIHBhZ2UgPSAnQWxsJ1xyXG4gIGlzQ2hlY2tlZCA9IGZhbHNlXHJcbiAgY291bnQgPSAwXHJcbiAgcGx1cmFsID0gJydcclxuICBjbGVhclRvZ2dsZSA9IGZhbHNlXHJcbiAgLy8gdG9kb1N0YXRlID0gdHJ1ZVxyXG5cclxuICBjb21wb25lbnRXaWxsTW91bnQoKSB7XHJcbiAgICBmaWx0ZXJQYWdlLm1hcChmID0+IHRoaXNbYHBhZ2Uke2NhbWVsQ2FzZShmKX1gXSA9ICcnKVxyXG5cclxuICAgIHRoaXMudG9kb1N0YXRlID0gdGhpcy50b2RvTW9kZWwubGlzdC5sZW5ndGggPyB0cnVlIDogZmFsc2VcclxuXHJcbiAgICB0aGlzLnRvZG9Nb2RlbC5zdWJzY3JpYmUodG9kb3MgPT4ge1xyXG4gICAgICAvLyBsZXQgdW5jb21wbGV0ZWQgPSB0b2Rvcy5maWx0ZXIoYyA9PiAhYy5jb21wbGV0ZWQpXHJcbiAgICAgIC8vIGxldCBjb21wbGV0ZWQgPSB0b2Rvcy5maWx0ZXIoYyA9PiBjLmNvbXBsZXRlZClcclxuICAgICAgLy8gdGhpcy5jbGVhclRvZ2dsZSA9IGNvbXBsZXRlZC5sZW5ndGggPyB0cnVlIDogZmFsc2VcclxuICAgICAgdGhpcy50b2RvU3RhdGUgPSB0b2Rvcy5sZW5ndGggPyB0cnVlIDogZmFsc2VcclxuICAgICAgLy8gdGhpcy5wbHVyYWwgPSB1bmNvbXBsZXRlZC5sZW5ndGggPT09IDEgPyAnJyA6ICdzJ1xyXG4gICAgICAvLyB0aGlzLmNvdW50ID0gdW5jb21wbGV0ZWQubGVuZ3RoXHJcbiAgICB9KVxyXG4gIH1cclxuXHJcbiAgY3JlYXRlIChldnQpIHtcclxuICAgIGlmKGV2dC5rZXlDb2RlICE9PSAxMykgcmV0dXJuXHJcbiAgICAvLyBpZighc3RhcnQpe1xyXG4gICAgLy8gICBzdGFydCA9IHRydWVcclxuICAgIC8vICAgdGltZSA9IERhdGUubm93KClcclxuICAgIC8vIH1cclxuICAgIGxldCB0aXRsZSA9IGV2dC50YXJnZXQudmFsdWUudHJpbSgpXHJcbiAgICBpZih0aXRsZSl7XHJcbiAgICAgIHRoaXMudG9kb01vZGVsLmFkZCh7IGlkOiBnZW5JZCgpLCB0aXRsZSwgY29tcGxldGVkOiBmYWxzZSB9KVxyXG4gICAgICBldnQudGFyZ2V0LnZhbHVlID0gJydcclxuICAgIH1cclxuICB9XHJcblxyXG4gIGV2dFRvZG8oLi4uYXJncyl7XHJcbiAgICBsZXQgdGFyZ2V0ID0gYXJnc1swXVxyXG4gICAgbGV0IGlkID0gYXJnc1thcmdzLmxlbmd0aCAtIDJdXHJcbiAgICBsZXQgZXZ0ID0gYXJnc1thcmdzLmxlbmd0aCAtIDFdXHJcblxyXG4gICAgaWYodGFyZ2V0ID09PSAndG9nZ2xlJykgIFxyXG4gICAgICB0aGlzLnRvZ2dsZVRvZG8oaWQsIGV2dClcclxuICAgIGVsc2UgaWYodGFyZ2V0ID09PSAnZGVzdHJveScpICBcclxuICAgICAgdGhpcy50b2RvRGVzdHJveShpZClcclxuICB9XHJcblxyXG4gIHRvZ2dsZVRvZG8oaWQsIGV2dCkge1xyXG4gICAgdGhpcy50b2RvTW9kZWwudXBkYXRlKCAnaWQnLCB7IGlkLCBjb21wbGV0ZWQ6ICEhZXZ0LnRhcmdldC5jaGVja2VkIH0pXHJcbiAgfVxyXG5cclxuICB0b2RvRGVzdHJveShpZCkge1xyXG4gICAgdGhpcy50b2RvTW9kZWwuZGVzdHJveSgnaWQnLCBpZClcclxuICB9XHJcblxyXG4gIGNvbXBsZXRlQWxsKCl7XHJcbiAgICBjb25zb2xlLmxvZyh0aGlzKVxyXG4gICAgdGhpcy5pc0NoZWNrZWQgPSAhdGhpcy5pc0NoZWNrZWRcclxuICAgIC8vIHRoaXMudG9kb01vZGVsLnVwZGF0ZUFsbCh0aGlzLmlzQ2hlY2tlZClcclxuICB9XHJcblxyXG4gIGNsZWFyQ29tcGxldGVkKCkge1xyXG4gICAgdGhpcy50b2RvTW9kZWwuY2xlYXJDb21wbGV0ZWQoKVxyXG4gIH1cclxuICBlZGl0TW9kZSgpe1xyXG5cclxuICB9XHJcbiAgLy8gY29tcG9uZW50RGlkVXBkYXRlKCl7XHJcbiAgLy8gICBjKytcclxuICAvLyAgIGNvbnNvbGUubG9nKGMvKiwgdGltZSwgRGF0ZS5ub3coKSAtIHRpbWUqLylcclxuICAvLyB9XHJcbn1cclxuXHJcbi8vIDx1bCBpZD1cImZpbHRlcnNcIj5cclxuLy8gJHtmaWx0ZXJzVG1wbH1cclxuLy8gPC91bD5cclxuXHJcbmNvbnN0IHZtb2RlbCA9IGh0bWxgXHJcbiAgPHNlY3Rpb24gaWQ9XCJ0b2RvYXBwXCI+XHJcbiAgICA8aGVhZGVyIGlkPVwiaGVhZGVyXCI+XHJcbiAgICAgIDxoMT50b2RvczwvaDE+XHJcbiAgICAgIDxpbnB1dCBpZD1cIm5ldy10b2RvXCIgay1rZXlkb3duPVwiY3JlYXRlKClcIiBwbGFjZWhvbGRlcj1cIldoYXQgbmVlZHMgdG8gYmUgZG9uZT9cIiBhdXRvZm9jdXM+XHJcbiAgICA8L2hlYWRlcj5cclxuICAgIHt7P3RvZG9TdGF0ZX19XHJcbiAgICA8c2VjdGlvbiBpZD1cIm1haW5cIj5cclxuICAgICAgPGlucHV0IGlkPVwidG9nZ2xlLWFsbFwiIHR5cGU9XCJjaGVja2JveFwiIGNoZWNrZWQ9XCJ7e2lzQ2hlY2tlZD9jaGVja2VkOicnfX1cIiBrLWNsaWNrPVwiY29tcGxldGVBbGwoKVwiPlxyXG4gICAgICA8bGFiZWwgZm9yPVwidG9nZ2xlLWFsbFwiPk1hcmsgYWxsIGFzIGNvbXBsZXRlPC9sYWJlbD5cclxuICAgICAgPHVsIGlkPVwidG9kby1saXN0XCIgay1jbGljaz1cImV2dFRvZG8oKVwiIGstZGJsY2xpY2s9XCJlZGl0TW9kZSgpXCI+XHJcbiAgICAgICAge3ttb2RlbDp0b2RvTW9kZWx9fVxyXG4gICAgICAgICAgPGxpIGlkPVwie3tpZH19XCIgY2xhc3M9XCJ7e2NvbXBsZXRlZD9jb21wbGV0ZWQ6Jyd9fVwiPlxyXG4gICAgICAgICAgICA8ZGl2IGNsYXNzPVwidmlld1wiPlxyXG4gICAgICAgICAgICAgIDxpbnB1dCBjbGFzcz1cInRvZ2dsZVwiIHR5cGU9XCJjaGVja2JveFwiIGNoZWNrZWQ9XCJ7e2NvbXBsZXRlZD9jaGVja2VkOicnfX1cIj5cclxuICAgICAgICAgICAgICA8bGFiZWw+e3t0aXRsZX19PC9sYWJlbD5cclxuICAgICAgICAgICAgICA8YnV0dG9uIGNsYXNzPVwiZGVzdHJveVwiPjwvYnV0dG9uPlxyXG4gICAgICAgICAgICA8L2Rpdj5cclxuICAgICAgICAgICAgPGlucHV0IGNsYXNzPVwiZWRpdFwiIHZhbHVlPVwie3t0aXRsZX19XCI+XHJcbiAgICAgICAgICA8L2xpPlxyXG4gICAgICAgIHt7L21vZGVsOnRvZG9Nb2RlbH19XHJcbiAgICAgIDwvdWw+XHJcbiAgICA8L3NlY3Rpb24+XHJcbiAgICA8Zm9vdGVyIGlkPVwiZm9vdGVyXCI+XHJcbiAgICAgIDxzcGFuIGlkPVwidG9kby1jb3VudFwiPlxyXG4gICAgICAgIDxzdHJvbmc+e3tjb3VudH19PC9zdHJvbmc+IGl0ZW17e3BsdXJhbH19IGxlZnRcclxuICAgICAgPC9zcGFuPlxyXG4gICAgICB7e2NvbXBvbmVudDpmaWx0ZXJ9fVxyXG4gICAgICB7ez9jbGVhclRvZ2dsZX19XHJcbiAgICAgIDxidXR0b24gaWQ9XCJjbGVhci1jb21wbGV0ZWRcIiBrLWNsaWNrPVwiY2xlYXJDb21wbGV0ZWQoKVwiPkNsZWFyIGNvbXBsZXRlZDwvYnV0dG9uPlxyXG4gICAgICB7ey9jbGVhclRvZ2dsZX19XHJcbiAgICA8L2Zvb3Rlcj5cclxuICAgIHt7L3RvZG9TdGF0ZX19XHJcbiAgPC9zZWN0aW9uPlxyXG4gIDxmb290ZXIgaWQ9XCJpbmZvXCI+XHJcbiAgICA8cD5Eb3VibGUtY2xpY2sgdG8gZWRpdCBhIHRvZG88L3A+XHJcbiAgICA8cD5DcmVhdGVkIGJ5IDxhIGhyZWY9XCJodHRwczovL2dpdGh1Yi5jb20vc3lhcnVsXCI+U2hhaHJ1bCBOaXphbSBTZWxhbWF0PC9hPjwvcD5cclxuICAgIDxwPlBhcnQgb2YgPGEgaHJlZj1cImh0dHA6Ly90b2RvbXZjLmNvbVwiPlRvZG9NVkM8L2E+PC9wPlxyXG4gIDwvZm9vdGVyPmBcclxuXHJcbmNvbnN0IGFwcCA9IG5ldyBBcHAoKVxyXG5cclxuYXBwLm1vdW50KHZtb2RlbCkubGluaygndG9kbycpXHJcblxyXG4vLyBjb25zb2xlLmxvZyhhcHApXHJcbiIsImNvbnN0IHsgY2FtZWxDYXNlIH0gPSByZXF1aXJlKCcuL3V0aWwnKVxyXG5jb25zdCB7IGNyZWF0ZU1vZGVsIH0gPSByZXF1aXJlKCcuLi9rZWV0L3V0aWxzJylcclxuXHJcbmNsYXNzIENyZWF0ZUZpbHRlck1vZGVsIGV4dGVuZHMgY3JlYXRlTW9kZWwge1xyXG4gIHN3aXRjaChoYXNoLCBvYmope1xyXG4gICAgdGhpcy5saXN0ID0gdGhpcy5saXN0Lm1hcChmaWx0ZXIgPT5cclxuICAgICAgZmlsdGVyLmhhc2ggPT09IGhhc2ggPyAoeyAuLi5maWx0ZXIsIC4uLm9ian0pIDogKHsgLi4uZmlsdGVyLCAuLi57IHNlbGVjdGVkOiBmYWxzZSB9fSlcclxuICAgIClcclxuICB9XHJcbn1cclxuXHJcbmNvbnN0IGZpbHRlck1vZGVsID0gbmV3IENyZWF0ZUZpbHRlck1vZGVsKClcclxuXHJcbkFycmF5LmZyb20oWydhbGwnLCAnYWN0aXZlJywgJ2NvbXBsZXRlZCddKS5tYXAocGFnZSA9PiB7XHJcblx0ZmlsdGVyTW9kZWwuYWRkKHtcclxuICAgICAgaGFzaDogJyMvJyArIHBhZ2UsXHJcbiAgICAgIG5hbWU6IGNhbWVsQ2FzZShwYWdlKSxcclxuICAgICAgc2VsZWN0ZWQ6IGZhbHNlXHJcbiAgICB9KVxyXG59KVxyXG5cclxubW9kdWxlLmV4cG9ydHMgPSBmaWx0ZXJNb2RlbCIsImNvbnN0IEtlZXQgPSByZXF1aXJlKCcuLi9rZWV0JylcclxuY29uc3QgeyBjYW1lbENhc2UsIGh0bWwgfSA9IHJlcXVpcmUoJy4vdXRpbCcpXHJcbmNvbnN0IGZpbHRlcnMgPSByZXF1aXJlKCcuL2ZpbHRlci1tb2RlbCcpXHJcblxyXG5cclxuY2xhc3MgQXBwIGV4dGVuZHMgS2VldCB7XHJcbiAgZWwgPSAnZmlsdGVycydcclxuICBmaWx0ZXJNb2RlbCA9IGZpbHRlcnNcclxuICBjb21wb25lbnRXaWxsTW91bnQoKSB7XHJcbiAgICB0aGlzLmZpbHRlck1vZGVsLnN1YnNjcmliZShtb2RlbCA9PiB7XHJcbiAgICAgIHRoaXMuY2FsbEJhdGNoUG9vbFVwZGF0ZSgpXHJcbiAgICB9KVxyXG4gICAgaWYod2luZG93LmxvY2F0aW9uLmhhc2ggPT0gJycpIHtcclxuICAgICAgd2luZG93Lmhpc3RvcnkucHVzaFN0YXRlKHt9LCBudWxsLCAnIy9hbGwnKVxyXG4gICAgfVxyXG4gIH1cclxuICBjb21wb25lbnREaWRNb3VudCgpe1xyXG4gICAgdGhpcy51cGRhdGVVcmwod2luZG93LmxvY2F0aW9uLmhhc2gpXHJcbiAgICB3aW5kb3cub25wb3BzdGF0ZSA9ICgpID0+IHRoaXMudXBkYXRlVXJsKHdpbmRvdy5sb2NhdGlvbi5oYXNoKVxyXG4gIH1cclxuXHJcbiAgLy8gY29tcG9uZW50RGlkVW5Nb3VudCgpe1xyXG4gICAgLy9cclxuICAvLyB9XHJcblxyXG4gIHVwZGF0ZVVybChoYXNoKSB7XHJcbiAgICB0aGlzLmZpbHRlck1vZGVsLnN3aXRjaChoYXNoLCB7IHNlbGVjdGVkOiB0cnVlIH0pXHJcbiAgfVxyXG59XHJcblxyXG5jb25zdCBmaWx0ZXJBcHAgPSBuZXcgQXBwKClcclxuXHJcbmxldCB2bW9kZWwgPSBodG1sYFxyXG5cdDx1bCBpZD1cImZpbHRlcnNcIj5cclxuXHRcdHt7bW9kZWw6ZmlsdGVyTW9kZWx9fVxyXG5cdFx0PGxpIGstY2xpY2s9XCJ1cGRhdGVVcmwoe3toYXNofX0pXCI+PGEgY2xhc3M9XCJ7e3NlbGVjdGVkP3NlbGVjdGVkOicnfX1cIiBocmVmPVwie3toYXNofX1cIj57e25hbWV9fTwvYT48L2xpPlxyXG5cdFx0e3svbW9kZWw6ZmlsdGVyTW9kZWx9fVxyXG5cdDwvdWw+XHJcbmBcclxuXHJcbmZpbHRlckFwcC5tb3VudCh2bW9kZWwpXHJcblxyXG5tb2R1bGUuZXhwb3J0cyA9IGZpbHRlckFwcCIsImNvbnN0IEtlZXQgPSByZXF1aXJlKCcuLi9rZWV0JylcclxuY29uc3QgeyBjcmVhdGVNb2RlbCB9ID0gcmVxdWlyZSgnLi4va2VldC91dGlscycpXHJcblxyXG5jbGFzcyBDcmVhdGVNb2RlbCBleHRlbmRzIGNyZWF0ZU1vZGVsIHtcclxuXHJcbiAgY2xlYXJDb21wbGV0ZWQoKSB7XHJcbiAgICB0aGlzLmxpc3QgPSB0aGlzLmxpc3QuZmlsdGVyKHRvZG8gPT4gIXRvZG8uY29tcGxldGVkKVxyXG4gIH0gXHJcbn1cclxuXHJcbmNvbnN0IHRvZG9zID0gbmV3IENyZWF0ZU1vZGVsKClcclxuXHJcbm1vZHVsZS5leHBvcnRzID0gdG9kb3NcclxuIiwiXHJcbmNvbnN0IHsgZ2VuSWQgfSA9IHJlcXVpcmUoJy4vdXRpbCcpXHJcblxyXG4vLyBub3RlOiBjb3B5IHdpdGggbW9kaWZpY2F0aW9uIGZyb20gcHJlYWN0LXRvZG9tdmNcclxuXHJcbm1vZHVsZS5leHBvcnRzID0gKCkgPT4ge1xyXG5cclxuICBsZXQgb25DaGFuZ2VzID0gW11cclxuXHJcbiAgZnVuY3Rpb24gaW5mb3JtICgpIHtcclxuICAgIGZvciAobGV0IGkgPSBvbkNoYW5nZXMubGVuZ3RoOyBpLS07KSB7XHJcbiAgICAgIG9uQ2hhbmdlc1tpXShtb2RlbClcclxuICAgIH1cclxuICB9XHJcblxyXG4gIGxldCBtb2RlbCA9IHtcclxuXHJcbiAgICBsaXN0OiBbXSxcclxuXHJcbiAgICAvLyBvcHM6IG51bGwsXHJcblxyXG4gICAgc3Vic2NyaWJlIChmbikge1xyXG4gICAgICBvbkNoYW5nZXMucHVzaChmbilcclxuICAgIH0sXHJcblxyXG4gICAgYWRkVG9kbyAodGl0bGUpIHtcclxuICAgICAgLy8gdGhpcy5vcHMgPSAnYWRkJ1xyXG4gICAgICB0aGlzLmxpc3QgPSB0aGlzLmxpc3QuY29uY2F0KHtcclxuICAgICAgICBpZDogZ2VuSWQoKSxcclxuICAgICAgICB0aXRsZSxcclxuICAgICAgICBjb21wbGV0ZWQ6IGZhbHNlXHJcbiAgICAgIH0pXHJcbiAgICAgIGluZm9ybSgpXHJcbiAgICB9LFxyXG5cclxuICAgIHRvZ2dsZUFsbChjb21wbGV0ZWQpIHtcclxuICAgICAgdGhpcy5vcHMgPSAndG9nZ2xlQWxsJ1xyXG4gICAgICB0aGlzLmxpc3QgPSB0aGlzLmxpc3QubWFwKFxyXG4gICAgICAgIHRvZG8gPT4gKHsgLi4udG9kbywgY29tcGxldGVkIH0pXHJcbiAgICAgICk7XHJcbiAgICAgIGluZm9ybSgpXHJcbiAgICB9LFxyXG4gICAgXHJcbiAgICB0b2dnbGUodG9kb1RvVG9nZ2xlKSB7XHJcbiAgICAgIC8vIHRoaXMub3BzID0gJ3RvZ2dsZSdcclxuICAgICAgdGhpcy5saXN0ID0gdGhpcy5saXN0Lm1hcCh0b2RvID0+XHJcbiAgICAgICAgdG9kby5pZCAhPT0gdG9kb1RvVG9nZ2xlLmlkID8gdG9kbyA6ICh7IC4uLnRvZG8sIC4uLnRvZG9Ub1RvZ2dsZX0pXHJcbiAgICAgIClcclxuICAgICAgaW5mb3JtKClcclxuICAgIH0sXHJcbiAgICBcclxuICAgIGRlc3Ryb3koaWQpIHtcclxuICAgICAgLy8gdGhpcy5vcHMgPSAnZGVzdHJveSdcclxuICAgICAgdGhpcy5saXN0ID0gdGhpcy5saXN0LmZpbHRlcih0ID0+IHQuaWQgIT09IGlkKVxyXG4gICAgICBpbmZvcm0oKVxyXG4gICAgfSxcclxuICAgIC8qXHJcbiAgICBzYXZlKHRvZG9Ub1NhdmUsIHRpdGxlKSB7XHJcbiAgICAgIG1vZGVsLnRvZG9zID0gbW9kZWwudG9kb3MubWFwKCB0b2RvID0+IChcclxuICAgICAgICB0b2RvICE9PSB0b2RvVG9TYXZlID8gdG9kbyA6ICh7IC4uLnRvZG8sIHRpdGxlIH0pXHJcbiAgICAgICkpO1xyXG4gICAgICBpbmZvcm0oKTtcclxuICAgIH0sXHJcblxyXG4gICAgY2xlYXJDb21wbGV0ZWQoKSB7XHJcbiAgICAgIG1vZGVsLnRvZG9zID0gbW9kZWwudG9kb3MuZmlsdGVyKCB0b2RvID0+ICF0b2RvLmNvbXBsZXRlZCApO1xyXG4gICAgICBpbmZvcm0oKTtcclxuICAgIH0gKi9cclxuICB9XHJcblxyXG4gIHJldHVybiBtb2RlbFxyXG59XHJcbiIsImV4cG9ydHMuaW5mb3JtID0gZnVuY3Rpb24oYmFzZSwgaW5wdXQpIHtcclxuICBmb3IgKHZhciBpID0gYmFzZS5vbkNoYW5nZXMubGVuZ3RoOyBpLS07KSB7XHJcbiAgICBiYXNlLm9uQ2hhbmdlc1tpXShpbnB1dClcclxuICB9XHJcbn1cclxuXHJcbmV4cG9ydHMuc3RvcmUgPSBmdW5jdGlvbihuYW1lc3BhY2UsIGRhdGEpIHtcclxuICBpZiAoYXJndW1lbnRzLmxlbmd0aCA+IDEpIHtcclxuICAgIHJldHVybiBsb2NhbFN0b3JhZ2Uuc2V0SXRlbShuYW1lc3BhY2UsIEpTT04uc3RyaW5naWZ5KGRhdGEpKVxyXG4gIH0gZWxzZSB7XHJcbiAgICB2YXIgc3RvcmUgPSBsb2NhbFN0b3JhZ2UuZ2V0SXRlbShuYW1lc3BhY2UpXHJcbiAgICByZXR1cm4gc3RvcmUgJiYgSlNPTi5wYXJzZShzdG9yZSkgfHwgW11cclxuICB9XHJcbn1cclxuXHJcbmV4cG9ydHMuY2FtZWxDYXNlID0gZnVuY3Rpb24ocykge1xyXG4gIHJldHVybiBzLmNoYXJBdCgwKS50b1VwcGVyQ2FzZSgpICsgcy5zbGljZSgxKVxyXG59XHJcblxyXG5leHBvcnRzLnNlbGVjdG9yID0gZnVuY3Rpb24gKGlkKSB7XHJcbiAgcmV0dXJuIGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3IoJ1trZWV0LWlkPVwiJyArIGlkICsgJ1wiXScpXHJcbn1cclxuXHJcbmV4cG9ydHMuZ2VuSWQgPSBmdW5jdGlvbigpIHtcclxuICByZXR1cm4gKE1hdGgucm91bmQoTWF0aC5yYW5kb20oKSAqIDB4MSoxZTEyKSkudG9TdHJpbmcoMzIpXHJcbn1cclxuXHJcbmV4cG9ydHMuZ2V0SWQgPSBmdW5jdGlvbiAoaWQpIHtcclxuICByZXR1cm4gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoaWQpXHJcbn1cclxuXHJcbmV4cG9ydHMuaHRtbCA9IGZ1bmN0aW9uIChsaXRlcmFsU2VjdGlvbnMsIC4uLnN1YnN0cykge1xyXG4gIC8vIFVzZSByYXcgbGl0ZXJhbCBzZWN0aW9uczogd2UgZG9u4oCZdCB3YW50XHJcbiAgLy8gYmFja3NsYXNoZXMgKFxcbiBldGMuKSB0byBiZSBpbnRlcnByZXRlZFxyXG4gIGxldCByYXcgPSBsaXRlcmFsU2VjdGlvbnMucmF3O1xyXG5cclxuICBsZXQgcmVzdWx0ID0gJyc7XHJcblxyXG4gIHN1YnN0cy5mb3JFYWNoKChzdWJzdCwgaSkgPT4ge1xyXG4gICAgICAvLyBSZXRyaWV2ZSB0aGUgbGl0ZXJhbCBzZWN0aW9uIHByZWNlZGluZ1xyXG4gICAgICAvLyB0aGUgY3VycmVudCBzdWJzdGl0dXRpb25cclxuICAgICAgbGV0IGxpdCA9IHJhd1tpXTtcclxuXHJcbiAgICAgIC8vIEluIHRoZSBleGFtcGxlLCBtYXAoKSByZXR1cm5zIGFuIGFycmF5OlxyXG4gICAgICAvLyBJZiBzdWJzdGl0dXRpb24gaXMgYW4gYXJyYXkgKGFuZCBub3QgYSBzdHJpbmcpLFxyXG4gICAgICAvLyB3ZSB0dXJuIGl0IGludG8gYSBzdHJpbmdcclxuICAgICAgaWYgKEFycmF5LmlzQXJyYXkoc3Vic3QpKSB7XHJcbiAgICAgICAgICBzdWJzdCA9IHN1YnN0LmpvaW4oJycpO1xyXG4gICAgICB9XHJcblxyXG4gICAgICAvLyBJZiB0aGUgc3Vic3RpdHV0aW9uIGlzIHByZWNlZGVkIGJ5IGEgZG9sbGFyIHNpZ24sXHJcbiAgICAgIC8vIHdlIGVzY2FwZSBzcGVjaWFsIGNoYXJhY3RlcnMgaW4gaXRcclxuICAgICAgaWYgKGxpdC5lbmRzV2l0aCgnJCcpKSB7XHJcbiAgICAgICAgICBzdWJzdCA9IGh0bWxFc2NhcGUoc3Vic3QpO1xyXG4gICAgICAgICAgbGl0ID0gbGl0LnNsaWNlKDAsIC0xKTtcclxuICAgICAgfVxyXG4gICAgICByZXN1bHQgKz0gbGl0O1xyXG4gICAgICByZXN1bHQgKz0gc3Vic3Q7XHJcbiAgfSk7XHJcbiAgLy8gVGFrZSBjYXJlIG9mIGxhc3QgbGl0ZXJhbCBzZWN0aW9uXHJcbiAgLy8gKE5ldmVyIGZhaWxzLCBiZWNhdXNlIGFuIGVtcHR5IHRlbXBsYXRlIHN0cmluZ1xyXG4gIC8vIHByb2R1Y2VzIG9uZSBsaXRlcmFsIHNlY3Rpb24sIGFuIGVtcHR5IHN0cmluZylcclxuICByZXN1bHQgKz0gcmF3W3Jhdy5sZW5ndGgtMV07IC8vIChBKVxyXG5cclxuICByZXR1cm4gcmVzdWx0O1xyXG59XHJcblxyXG5leHBvcnRzLmludGVsbGlVcGRhdGUgPSBmdW5jdGlvbihzdGF0ZSwgY2FsbGJhY2spIHtcclxuICAvLyBvbmx5IHVwZGF0ZSB3aGVuIG5lY2Vzc2FyeVxyXG4gIGlmIChzdGF0ZSkgY2xlYXJUaW1lb3V0KHN0YXRlKVxyXG4gIHN0YXRlID0gc2V0VGltZW91dChmdW5jdGlvbigpIHtcclxuICAgIGNhbGxiYWNrKClcclxuICB9LCAxMClcclxufSJdfQ==
