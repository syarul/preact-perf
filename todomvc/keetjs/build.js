(function(){function r(e,n,t){function o(i,f){if(!n[i]){if(!e[i]){var c="function"==typeof require&&require;if(!f&&c)return c(i,!0);if(u)return u(i,!0);var a=new Error("Cannot find module '"+i+"'");throw a.code="MODULE_NOT_FOUND",a}var p=n[i]={exports:{}};e[i][0].call(p.exports,function(r){var n=e[i][1][r];return o(n||r)},p,p.exports,r,e,n,t)}return n[i].exports}for(var u="function"==typeof require&&require,i=0;i<t.length;i++)o(t[i]);return o}return r})()({1:[function(require,module,exports){
var assert = require('../utils').assert
module.exports = function(componentStr, node){
  var component = componentStr.replace('component:', '')
  if(this[component] !== undefined){
    var frag = document.createDocumentFragment()
    this[component].render(frag)
    // node.parentNode.insertBefore(frag, null)
    console.log(node, frag)
  } else {
    assert(false, 'Component '+component+' does not exist.')
  }
}
},{"../utils":12}],2:[function(require,module,exports){
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

}

},{}],3:[function(require,module,exports){
var tmplHandler = require('./tmplHandler')
var getId = require('../utils').getId
var strInterpreter = require('./strInterpreter')
var morph = require('morphdom')

var overidde = null

var updateContext = function () {
  var self = this
  // enclose the update event as async ensure bath update
  // ensure only trigger DOM diff once at a time
  if(overidde) clearTimeout(overidde)
  overidde = setTimeout(function(){
    var ele = getId(self.el)
    genElement.call(self)
    var newElem = document.createElement('div')
    newElem.id = self.el
    newElem.appendChild(self.base)
    morph(ele, newElem)
    // exec life-cycle componentDidUpdate
    if (self.componentDidUpdate && typeof self.componentDidUpdate === 'function') {
      self.componentDidUpdate()
    }
    // reset batch pooling
    batchPool.status = 'ready'
  })
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
var batchPoolExec = function () {
  if (batchPool.status === 'pooling') {
    //
  } else {
    var self = this
    batchPool.status = 'pooling'
    // if batchpool is not yet executed or it was idle (after 100ms)
    // direct morph the DOM
    if (!batchPool.ttl) {
      updateContext.call(this)
    } else {
    // we wait until pooling is ready before initiating DOM morphing
      clearTimeout(batchPool.ttl)
      batchPool.ttl = setTimeout(function () {
        updateContext.call(self)
      }, 0)
    }
    // we clear the batch pool if it more then 100ms from
    // last update
    batchPool.ttl = setTimeout(function () {
      batchPool.ttl = 0
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

var genElement = function () {
  this.base = this.__pristineFragment__.cloneNode(true)
  tmplHandler(this, addState)
}

exports.genElement = genElement
exports.addState = addState
exports.setState = setState
exports.clearState = clearState

},{"../utils":12,"./strInterpreter":7,"./tmplHandler":9,"morphdom":11}],4:[function(require,module,exports){
var ternaryOps = require('./ternaryOps')
var createModel = require('../utils').createModel
var assert = require('../utils').assert
var genModelTemplate = require('./genModelTemplate')

module.exports = function (node, model, tmplHandler) {
  var modelList
  var mLength
  var i
  var listClone
  var parentNode

  var list = node.nextSibling.cloneNode(true)
  var str = list.outerHTML

  // check if browser support createRange
  var range
  if(typeof document.createRange === 'function'){
    range = document.createRange()
  }

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
      if(range){
        var m = genModelTemplate(str, modelList[i])
        var documentFragment = range.createContextualFragment(m)
        parentNode.insertBefore(documentFragment, null)
      } else {
        // fallback to regular node generation handler
        listClone = list.cloneNode(true)
        tmplHandler(this, null, listClone, modelList[i]) 
      }
      i++
    }
  } else {
    assert(false, 'Model "'+model+'" does not exist.')
  }
}

},{"../utils":12,"./genModelTemplate":5,"./ternaryOps":8}],5:[function(require,module,exports){
var ternaryOps = require('./ternaryOps')
var re = new RegExp(/(\schecked\=\")(.*?)(?=\")/g)
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
    if(match){
      if(match[0].length === 17)
        tmpl = tmpl.replace(' checked="checked"', ' checked')
      else
        tmpl = tmpl.replace(' checked=""', '')
    }
  }
  return tmpl
}
},{"./ternaryOps":8}],6:[function(require,module,exports){
var setState = require('./genElement').setState
var tmplHandler = require('./tmplHandler')
var getId = require('../utils').getId
var addState =  require('./genElement').addState
var assert = require('../utils').assert

module.exports = function (stub) {

  tmplHandler(this, addState)

  var el = stub || getId(this.el)

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
  
}

},{"../utils":12,"./genElement":3,"./tmplHandler":9}],7:[function(require,module,exports){
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

var DOCUMENT_FRAGMENT_TYPE = 11
var DOCUMENT_TEXT_TYPE = 3
var DOCUMENT_ELEMENT_TYPE = 1
var DOCUMENT_COMMENT_TYPE = 8
var DOCUMENT_ATTRIBUTE_TYPE = 2

var re = /{{([^{}]+)}}/g

var model = /^model:/g
var modelRaw = /^\{\{model:([^{}]+)\}\}/g

var conditionalRe = /^\?/g

var component = /^component:([^{}]+)/g

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
  var idx
  var rem = []
  var isObjectNotation

  if(modelObject){
    instance = modelInstance
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
            genModelList.call(ctx, node, modelRep, tmplhandler)
          } else if(rep.match(conditionalRe)){
            conditionalRep = rep.replace('?', '')
            if(ins[conditionalRep] !== undefined){
              updateState(conditionalRep)
              conditionalNodes.call(ctx, node, conditionalRep, tmplhandler)
            }
          } else if(rep.match(component)) {
            componentParse.call(ctx, rep, node)
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
    // check if node is visible on DOM and has attribute evt-node
    if(node.hasAttribute('evt-node') && getId(node.id)){
      return true
    }
    return false
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
            if(node.id){
              var p = ctx.__pristineFragment__.getElementById(node.id)
              if(!p.hasAttribute('evt-node')){ 
                p.setAttribute('evt-node', '')
              }
            }
          }
        }
        if(i === 0){
          rem.map(function (f) { node.removeAttribute(f) })
        }
      }
    } 
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
      node = node.nextSibling
    } 
  }

  check(instance)

}

module.exports = tmplhandler

},{"../utils":12,"./componentParse":1,"./conditionalNodes":2,"./genModelList":4,"./strInterpreter":7,"./ternaryOps":8}],10:[function(require,module,exports){
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
var genElement = require('./components/genElement').genElement
var clearState = require('./components/genElement').clearState
var getId = require('./utils').getId
var assert = require('./utils').assert

var DOCUMENT_FRAGMENT_TYPE = 11
var DOCUMENT_TEXT_TYPE = 3
var DOCUMENT_ELEMENT_TYPE = 1
// var DOCUMENT_COMMENT_TYPE = 8
// var DOCUMENT_ATTRIBUTE_TYPE = 2

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
  // Render this component to the target DOM
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

},{"./components/genElement":3,"./components/parseStr":6,"./utils":12}],11:[function(require,module,exports){
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
      hash = '52e823a3aeb60330c8baffd262079a2547f2faca',
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
          line: 87,
          column: 2
        },
        end: {
          line: 87,
          column: 15
        }
      },
      '29': {
        start: {
          line: 101,
          column: 14
        },
        end: {
          line: 101,
          column: 16
        }
      },
      '30': {
        start: {
          line: 102,
          column: 18
        },
        end: {
          line: 102,
          column: 20
        }
      },
      '31': {
        start: {
          line: 104,
          column: 15
        },
        end: {
          line: 109,
          column: 3
        }
      },
      '32': {
        start: {
          line: 106,
          column: 4
        },
        end: {
          line: 108,
          column: 5
        }
      },
      '33': {
        start: {
          line: 107,
          column: 6
        },
        end: {
          line: 107,
          column: 25
        }
      },
      '34': {
        start: {
          line: 116,
          column: 2
        },
        end: {
          line: 126,
          column: 4
        }
      },
      '35': {
        start: {
          line: 120,
          column: 6
        },
        end: {
          line: 120,
          column: 18
        }
      },
      '36': {
        start: {
          line: 123,
          column: 6
        },
        end: {
          line: 123,
          column: 17
        }
      },
      '37': {
        start: {
          line: 124,
          column: 6
        },
        end: {
          line: 124,
          column: 14
        }
      },
      '38': {
        start: {
          line: 136,
          column: 2
        },
        end: {
          line: 138,
          column: 3
        }
      },
      '39': {
        start: {
          line: 137,
          column: 4
        },
        end: {
          line: 137,
          column: 22
        }
      },
      '40': {
        start: {
          line: 148,
          column: 2
        },
        end: {
          line: 150,
          column: 3
        }
      },
      '41': {
        start: {
          line: 149,
          column: 4
        },
        end: {
          line: 149,
          column: 37
        }
      },
      '42': {
        start: {
          line: 161,
          column: 2
        },
        end: {
          line: 165,
          column: 3
        }
      },
      '43': {
        start: {
          line: 162,
          column: 4
        },
        end: {
          line: 164,
          column: 6
        }
      },
      '44': {
        start: {
          line: 163,
          column: 6
        },
        end: {
          line: 163,
          column: 88
        }
      },
      '45': {
        start: {
          line: 176,
          column: 2
        },
        end: {
          line: 180,
          column: 3
        }
      },
      '46': {
        start: {
          line: 177,
          column: 4
        },
        end: {
          line: 179,
          column: 6
        }
      },
      '47': {
        start: {
          line: 178,
          column: 6
        },
        end: {
          line: 178,
          column: 36
        }
      },
      '48': {
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
      '9': {
        name: '(anonymous_9)',
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
      '10': {
        name: '(anonymous_10)',
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
      '11': {
        name: '(anonymous_11)',
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
      '12': {
        name: '(anonymous_12)',
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
      '13': {
        name: '(anonymous_13)',
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
      '14': {
        name: '(anonymous_14)',
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
      '15': {
        name: '(anonymous_15)',
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
      '16': {
        name: '(anonymous_16)',
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
      '17': {
        name: '(anonymous_17)',
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
      '48': 0
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
      '17': 0
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
  // result = result.split(/\n+/)
  // result = result.map(function (t) {
  //   return t.trim()
  // }).join('')
  cov_140h9s3pvc.s[28]++;
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
  cov_140h9s3pvc.f[8]++;

  var model = (cov_140h9s3pvc.s[29]++, []);
  var onChanges = (cov_140h9s3pvc.s[30]++, []);

  cov_140h9s3pvc.s[31]++;
  var inform = function inform() {
    cov_140h9s3pvc.f[9]++;
    cov_140h9s3pvc.s[32]++;

    // console.trace(onChanges)
    for (var i = onChanges.length; i--;) {
      cov_140h9s3pvc.s[33]++;

      onChanges[i](model);
    }
  };

  /**
   * @private
   * @description
   * Register callback listener of any changes
   */
  cov_140h9s3pvc.s[34]++;
  Object.defineProperty(this, 'list', {
    enumerable: false,
    configurable: true,
    get: function get() {
      cov_140h9s3pvc.f[10]++;
      cov_140h9s3pvc.s[35]++;

      return model;
    },
    set: function set(val) {
      cov_140h9s3pvc.f[11]++;
      cov_140h9s3pvc.s[36]++;

      model = val;
      cov_140h9s3pvc.s[37]++;
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
  cov_140h9s3pvc.s[38]++;
  this.subscribe = function (fn) {
    cov_140h9s3pvc.f[12]++;
    cov_140h9s3pvc.s[39]++;

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
  cov_140h9s3pvc.s[40]++;
  this.add = function (obj) {
    cov_140h9s3pvc.f[13]++;
    cov_140h9s3pvc.s[41]++;

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
  cov_140h9s3pvc.s[42]++;
  this.update = function (lookupId, updateObj) {
    cov_140h9s3pvc.f[14]++;
    cov_140h9s3pvc.s[43]++;

    this.list = this.list.map(function (obj) {
      cov_140h9s3pvc.f[15]++;
      cov_140h9s3pvc.s[44]++;

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
  cov_140h9s3pvc.s[45]++;
  this.destroy = function (lookupId, objId) {
    cov_140h9s3pvc.f[16]++;
    cov_140h9s3pvc.s[46]++;

    this.list = this.list.filter(function (obj) {
      cov_140h9s3pvc.f[17]++;
      cov_140h9s3pvc.s[47]++;

      return obj[lookupId] !== objId;
    });
  };
}

cov_140h9s3pvc.s[48]++;
exports.createModel = createModel;

},{}],13:[function(require,module,exports){
'use strict';

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _templateObject = _taggedTemplateLiteral(['\n  <section class="todoapp">\n    <header id="header">\n      <h1>todos</h1>\n      <input class="new-todo" k-keydown="create()" placeholder="What needs to be done?" autofocus>\n    </header>\n    {{?todoState}}\n    <section class="main">\n      <input id="toggle-all" class="toggle-all" type="checkbox" checked="{{isChecked?checked:\'\'}}" k-click="completeAll()">\n      <label for="toggle-all">Mark all as complete</label>\n      <ul id="todo-list" class="todo-list" k-click="evtTodo()" k-dblclick="editMode()">\n        {{model:todoModel}}\n          <li id="{{id}}" class="{{completed?completed:\'\'}}">\n            <div class="view">\n              <input class="toggle" type="checkbox" checked="{{completed?checked:\'\'}}">\n              <label>{{title}}</label>\n              <button class="destroy"></button>\n            </div>\n            <input class="edit" value="{{title}}">\n          </li>\n        {{/model:todoModel}}\n      </ul>\n    </section>\n    <footer class="footer">\n      <span class="todo-count">\n        <strong>{{count}}</strong> item{{plural}} left\n      </span>\n      {{component:filter}}\n      {{?clearToggle}}\n      <button id="clear-completed" class="clear-completed">Clear completed</button>\n      {{/clearToggle}}\n    </footer>\n    {{/todoState}}\n  </section>\n  <footer class="info">\n    <p>Double-click to edit a todo</p>\n    <p>Created by <a href="https://github.com/syarul">Shahrul Nizam Selamat</a></p>\n    <p>Part of <a href="http://todomvc.com">TodoMVC</a></p>\n  </footer>'], ['\n  <section class="todoapp">\n    <header id="header">\n      <h1>todos</h1>\n      <input class="new-todo" k-keydown="create()" placeholder="What needs to be done?" autofocus>\n    </header>\n    {{?todoState}}\n    <section class="main">\n      <input id="toggle-all" class="toggle-all" type="checkbox" checked="{{isChecked?checked:\'\'}}" k-click="completeAll()">\n      <label for="toggle-all">Mark all as complete</label>\n      <ul id="todo-list" class="todo-list" k-click="evtTodo()" k-dblclick="editMode()">\n        {{model:todoModel}}\n          <li id="{{id}}" class="{{completed?completed:\'\'}}">\n            <div class="view">\n              <input class="toggle" type="checkbox" checked="{{completed?checked:\'\'}}">\n              <label>{{title}}</label>\n              <button class="destroy"></button>\n            </div>\n            <input class="edit" value="{{title}}">\n          </li>\n        {{/model:todoModel}}\n      </ul>\n    </section>\n    <footer class="footer">\n      <span class="todo-count">\n        <strong>{{count}}</strong> item{{plural}} left\n      </span>\n      {{component:filter}}\n      {{?clearToggle}}\n      <button id="clear-completed" class="clear-completed">Clear completed</button>\n      {{/clearToggle}}\n    </footer>\n    {{/todoState}}\n  </section>\n  <footer class="info">\n    <p>Double-click to edit a todo</p>\n    <p>Created by <a href="https://github.com/syarul">Shahrul Nizam Selamat</a></p>\n    <p>Part of <a href="http://todomvc.com">TodoMVC</a></p>\n  </footer>']);

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

    return _ret = (_temp = (_this = _possibleConstructorReturn(this, (_ref = App.__proto__ || Object.getPrototypeOf(App)).call.apply(_ref, [this].concat(args))), _this), _this.todoModel = _todo2.default, _this.filter = _filter2.default, _this.page = 'All', _this.isChecked = false, _this.count = 0, _this.plural = '', _this.clearToggle = false, _temp), _possibleConstructorReturn(_this, _ret);
  }

  _createClass(App, [{
    key: 'componentWillMount',

    // todoState = true

    value: function componentWillMount() {
      var _this2 = this;

      this.todoState = this.todoModel.list.length ? true : false;

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
      evt.preventDefault();
      var title = evt.target.value.trim();
      if (title) {
        this.todoModel.add({ id: (0, _util.genId)(), title: title, completed: false });
        evt.target.value = '';
      }
    }
  }, {
    key: 'evtTodo',
    value: function evtTodo() {
      for (var _len2 = arguments.length, args = Array(_len2), _key2 = 0; _key2 < _len2; _key2++) {
        args[_key2] = arguments[_key2];
      }

      var target = args.shift();
      var evt = args.pop();
      var id = args.pop();

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
}(_keet2.default);

var vmodel = (0, _utils.html)(_templateObject);

var app = new App();

app.mount(vmodel).link('todo');

},{"../keet":10,"../keet/utils":12,"./filter":15,"./todo":16,"./util":17}],14:[function(require,module,exports){
'use strict';

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
  filterModel.add({
    hash: '#/' + page,
    name: (0, _util.camelCase)(page),
    selected: false
  });
});

module.exports = filterModel;

},{"../keet/utils":12,"./util":17}],15:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _templateObject = _taggedTemplateLiteral(['\n\t<ul id="filters">\n\t\t{{model:filterModel}}\n\t\t<li k-click="updateUrl({{hash}})"><a class="{{selected?selected:\'\'}}" href="{{hash}}">{{name}}</a></li>\n\t\t{{/model:filterModel}}\n\t</ul>\n'], ['\n\t<ul id="filters">\n\t\t{{model:filterModel}}\n\t\t<li k-click="updateUrl({{hash}})"><a class="{{selected?selected:\'\'}}" href="{{hash}}">{{name}}</a></li>\n\t\t{{/model:filterModel}}\n\t</ul>\n']);

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

      console.log(1);
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
}(_keet2.default);

var filterApp = new App();

var vmodel = (0, _utils.html)(_templateObject);

filterApp.mount(vmodel);

exports.default = filterApp;

},{"../keet":10,"../keet/utils":12,"./filter-model":14}],16:[function(require,module,exports){
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

var todos = new CreateModel();

exports.default = todos;

},{"../keet":10,"../keet/utils":12}],17:[function(require,module,exports){
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

},{}]},{},[13])
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIkM6L1VzZXJzL3BpcGV5L0FwcERhdGEvUm9hbWluZy9ucG0vbm9kZV9tb2R1bGVzL2Jyb3dzZXJpZnkvbm9kZV9tb2R1bGVzL2Jyb3dzZXItcGFjay9fcHJlbHVkZS5qcyIsImtlZXQvY29tcG9uZW50cy9jb21wb25lbnRQYXJzZS5qcyIsImtlZXQvY29tcG9uZW50cy9jb25kaXRpb25hbE5vZGVzLmpzIiwia2VldC9jb21wb25lbnRzL2dlbkVsZW1lbnQuanMiLCJrZWV0L2NvbXBvbmVudHMvZ2VuTW9kZWxMaXN0LmpzIiwia2VldC9jb21wb25lbnRzL2dlbk1vZGVsVGVtcGxhdGUuanMiLCJrZWV0L2NvbXBvbmVudHMvcGFyc2VTdHIuanMiLCJrZWV0L2NvbXBvbmVudHMvc3RySW50ZXJwcmV0ZXIuanMiLCJrZWV0L2NvbXBvbmVudHMvdGVybmFyeU9wcy5qcyIsImtlZXQvY29tcG9uZW50cy90bXBsSGFuZGxlci5qcyIsImtlZXQva2VldC5qcyIsImtlZXQvbm9kZV9tb2R1bGVzL21vcnBoZG9tL2Rpc3QvbW9ycGhkb20uanMiLCJrZWV0L3V0aWxzLmpzIiwic3JjL2FwcC5qcyIsInNyYy9maWx0ZXItbW9kZWwuanMiLCJzcmMvZmlsdGVyLmpzIiwic3JjL3RvZG8uanMiLCJzcmMvdXRpbC5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTtBQ0FBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNYQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDbkNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3BJQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDckRBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzNCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDMUJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNSQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDN0JBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNsUEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2hJQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUMxcUJBLElBQUksUUFBUSxTQUFSLEtBQVEsQ0FBVSxFQUFWLEVBQWM7QUFBQTtBQUFBOztBQUN4QixTQUFPLFNBQVMsY0FBVCxDQUF3QixFQUF4QixDQUFQO0FBQ0QsQ0FGRDs7O0FBSUEsUUFBUSxLQUFSLEdBQWdCLEtBQWhCOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7OztBQUVBLFFBQVEsU0FBUixHQUFvQixVQUFVLElBQVYsRUFBZ0I7QUFBQTtBQUFBOztBQUNsQyxTQUFPLE9BQU0sSUFBTixDQUFXLElBQVg7QUFBUDtBQUNELENBRkQ7O0FBSUE7Ozs7Ozs7OztBQVFBLFFBQVEscUJBQVIsR0FBZ0MsVUFBVSxTQUFWLEVBQXFCLGFBQXJCLEVBQW9DLFFBQXBDLEVBQThDLFFBQTlDLEVBQXdEO0FBQUE7O0FBQ3RGLE1BQUksOEJBQU0sTUFBTSxVQUFVLEVBQWhCLENBQU4sQ0FBSjtBQUNBLE1BQUksZ0NBQVEsS0FBUixDQUFKO0FBRnNGO0FBR3RGLE1BQUksR0FBSixFQUFTO0FBQUE7QUFBQTtBQUFBLGFBQU8sR0FBUDtBQUFVLEtBQW5CLE1BQ0s7QUFBQTs7QUFDSCxRQUFJLDZCQUFJLFlBQVksWUFBWTtBQUFBO0FBQUE7O0FBQzlCLFlBQU0sTUFBTSxVQUFVLEVBQWhCLENBQU47QUFEOEI7QUFFOUIsVUFBSSxHQUFKLEVBQVM7QUFBQTtBQUFBOztBQUNQLHNCQUFjLENBQWQ7QUFETztBQUVQLGdCQUFRLElBQVI7QUFGTztBQUdQLGlCQUFTLFNBQVQsRUFBb0IsYUFBcEIsRUFBbUMsR0FBbkM7QUFDRCxPQUpEO0FBQUE7QUFBQTtBQUtELEtBUE8sRUFPTCxDQVBLLENBQUosQ0FBSjtBQVFBO0FBVEc7QUFVSCxlQUFXLFlBQVk7QUFBQTtBQUFBOztBQUNyQixvQkFBYyxDQUFkO0FBRHFCO0FBRXJCLFVBQUcsNEJBQUMsS0FBRCxnQ0FBVSxRQUFWLGdDQUFzQixPQUFPLFFBQVAsS0FBb0IsVUFBMUMsQ0FBSCxFQUF5RDtBQUFBO0FBQUE7QUFBQTtBQUFVLFNBQW5FO0FBQUE7QUFBQTtBQUNELEtBSEQsRUFHRyxHQUhIO0FBSUQ7QUFDRixDQW5CRDs7QUFxQkE7Ozs7Ozs7Ozs7QUFTQSxRQUFRLE1BQVIsR0FBaUIsVUFBVSxHQUFWLEVBQWUsR0FBZixFQUFvQjtBQUFBO0FBQUE7O0FBQ25DLE1BQUksQ0FBQyxHQUFMLEVBQVU7QUFBQTtBQUFBO0FBQUEsWUFBTSxJQUFJLEtBQUosQ0FBVSxZQUFZLEdBQXRCLENBQU47QUFBZ0MsS0FBMUM7QUFBQTtBQUFBO0FBQ0QsQ0FGRDs7QUFJQTs7Ozs7Ozs7Ozs7O0FBV0EsUUFBUSxJQUFSLEdBQWUsU0FBUyxJQUFULEdBQWlCO0FBQUE7O0FBQzlCLE1BQUksb0NBQVcsR0FBRyxLQUFILENBQVMsSUFBVCxDQUFjLFNBQWQsQ0FBWCxDQUFKO0FBQ0EsTUFBSSxrQ0FBUyxHQUFHLEtBQUgsQ0FBUyxJQUFULENBQWMsU0FBZCxDQUFULENBQUo7O0FBRUEsTUFBSSxrQ0FBUyxTQUFTLEdBQVQsQ0FBYSxNQUFiLENBQW9CLFVBQVUsR0FBVixFQUFlLEdBQWYsRUFBb0IsQ0FBcEIsRUFBdUI7QUFBQTtBQUFBOztBQUN0RCxXQUFPLE1BQU0sT0FBTyxJQUFJLENBQVgsQ0FBTixHQUFzQixHQUE3QjtBQUNELEdBRlksQ0FBVCxDQUFKO0FBR0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQVg4QjtBQVk5QixTQUFPLE1BQVA7QUFDRCxDQWJEOztBQWVBOzs7Ozs7Ozs7O0FBVUEsU0FBUyxXQUFULEdBQXVCO0FBQUE7O0FBQ3JCLE1BQUksaUNBQVEsRUFBUixDQUFKO0FBQ0EsTUFBSSxxQ0FBWSxFQUFaLENBQUo7O0FBRnFCO0FBSXJCLE1BQUksU0FBUyxTQUFULE1BQVMsR0FBWTtBQUFBO0FBQUE7O0FBQ3ZCO0FBQ0EsU0FBSyxJQUFJLElBQUksVUFBVSxNQUF2QixFQUErQixHQUEvQixHQUFxQztBQUFBOztBQUNuQyxnQkFBVSxDQUFWLEVBQWEsS0FBYjtBQUNEO0FBQ0YsR0FMRDs7QUFPRjs7Ozs7QUFYdUI7QUFnQnJCLFNBQU8sY0FBUCxDQUFzQixJQUF0QixFQUE0QixNQUE1QixFQUFvQztBQUNsQyxnQkFBWSxLQURzQjtBQUVsQyxrQkFBYyxJQUZvQjtBQUdsQyxTQUFLLGVBQVk7QUFBQTtBQUFBOztBQUNmLGFBQU8sS0FBUDtBQUNELEtBTGlDO0FBTWxDLFNBQUssYUFBVSxHQUFWLEVBQWU7QUFBQTtBQUFBOztBQUNsQixjQUFRLEdBQVI7QUFEa0I7QUFFbEI7QUFDRDtBQVRpQyxHQUFwQzs7QUFZRjs7Ozs7Ozs7QUE1QnVCO0FBb0NyQixPQUFLLFNBQUwsR0FBaUIsVUFBVSxFQUFWLEVBQWM7QUFBQTtBQUFBOztBQUM3QixjQUFVLElBQVYsQ0FBZSxFQUFmO0FBQ0QsR0FGRDs7QUFJRjs7Ozs7Ozs7QUF4Q3VCO0FBZ0RyQixPQUFLLEdBQUwsR0FBVyxVQUFVLEdBQVYsRUFBZTtBQUFBO0FBQUE7O0FBQ3hCLFNBQUssSUFBTCxHQUFZLEtBQUssSUFBTCxDQUFVLE1BQVYsQ0FBaUIsR0FBakIsQ0FBWjtBQUNELEdBRkQ7O0FBSUY7Ozs7Ozs7OztBQXBEdUI7QUE2RHJCLE9BQUssTUFBTCxHQUFjLFVBQVUsUUFBVixFQUFvQixTQUFwQixFQUErQjtBQUFBO0FBQUE7O0FBQzNDLFNBQUssSUFBTCxHQUFZLEtBQUssSUFBTCxDQUFVLEdBQVYsQ0FBYyxVQUFVLEdBQVYsRUFBZTtBQUFBO0FBQUE7O0FBQ3ZDLGFBQU8sSUFBSSxRQUFKLE1BQWtCLFVBQVUsUUFBVixDQUFsQiw4QkFBd0MsR0FBeEMsK0JBQThDLE9BQU8sTUFBUCxDQUFjLEdBQWQsRUFBbUIsU0FBbkIsQ0FBOUMsQ0FBUDtBQUNELEtBRlcsQ0FBWjtBQUdELEdBSkQ7O0FBTUY7Ozs7Ozs7OztBQW5FdUI7QUE0RXJCLE9BQUssT0FBTCxHQUFlLFVBQVUsUUFBVixFQUFvQixLQUFwQixFQUEyQjtBQUFBO0FBQUE7O0FBQ3hDLFNBQUssSUFBTCxHQUFZLEtBQUssSUFBTCxDQUFVLE1BQVYsQ0FBaUIsVUFBVSxHQUFWLEVBQWU7QUFBQTtBQUFBOztBQUMxQyxhQUFPLElBQUksUUFBSixNQUFrQixLQUF6QjtBQUNELEtBRlcsQ0FBWjtBQUdELEdBSkQ7QUFLRDs7O0FBRUQsUUFBUSxXQUFSLEdBQXNCLFdBQXRCOzs7Ozs7Ozs7QUN0TEE7Ozs7QUFDQTs7QUFDQTs7QUFDQTs7OztBQUNBOzs7Ozs7Ozs7Ozs7OztJQUVNLEc7Ozs7Ozs7Ozs7Ozs7O2dMQUNKLFMseUJBQ0EsTSwyQkFDQSxJLEdBQU8sSyxRQUNQLFMsR0FBWSxLLFFBQ1osSyxHQUFRLEMsUUFDUixNLEdBQVMsRSxRQUNULFcsR0FBYyxLOzs7Ozs7QUFDZDs7eUNBRXFCO0FBQUE7O0FBRW5CLFdBQUssU0FBTCxHQUFpQixLQUFLLFNBQUwsQ0FBZSxJQUFmLENBQW9CLE1BQXBCLEdBQTZCLElBQTdCLEdBQW9DLEtBQXJEOztBQUVBLFdBQUssU0FBTCxDQUFlLFNBQWYsQ0FBeUIsaUJBQVM7QUFDaEMsWUFBSSxjQUFjLE1BQU0sTUFBTixDQUFhO0FBQUEsaUJBQUssQ0FBQyxFQUFFLFNBQVI7QUFBQSxTQUFiLENBQWxCO0FBQ0EsWUFBSSxZQUFZLE1BQU0sTUFBTixDQUFhO0FBQUEsaUJBQUssRUFBRSxTQUFQO0FBQUEsU0FBYixDQUFoQjtBQUNBLGVBQUssV0FBTCxHQUFtQixVQUFVLE1BQVYsR0FBbUIsSUFBbkIsR0FBMEIsS0FBN0M7QUFDQSxlQUFLLFNBQUwsR0FBaUIsTUFBTSxNQUFOLEdBQWUsSUFBZixHQUFzQixLQUF2QztBQUNBLGVBQUssTUFBTCxHQUFjLFlBQVksTUFBWixLQUF1QixDQUF2QixHQUEyQixFQUEzQixHQUFnQyxHQUE5QztBQUNBLGVBQUssS0FBTCxHQUFhLFlBQVksTUFBekI7QUFDRCxPQVBEO0FBUUQ7OzsyQkFFTyxHLEVBQUs7QUFDWCxVQUFHLElBQUksT0FBSixLQUFnQixFQUFuQixFQUF1QjtBQUN2QixVQUFJLGNBQUo7QUFDQSxVQUFJLFFBQVEsSUFBSSxNQUFKLENBQVcsS0FBWCxDQUFpQixJQUFqQixFQUFaO0FBQ0EsVUFBRyxLQUFILEVBQVM7QUFDUCxhQUFLLFNBQUwsQ0FBZSxHQUFmLENBQW1CLEVBQUUsSUFBSSxrQkFBTixFQUFlLFlBQWYsRUFBc0IsV0FBVyxLQUFqQyxFQUFuQjtBQUNBLFlBQUksTUFBSixDQUFXLEtBQVgsR0FBbUIsRUFBbkI7QUFDRDtBQUNGOzs7OEJBRWU7QUFBQSx5Q0FBTCxJQUFLO0FBQUwsWUFBSztBQUFBOztBQUNkLFVBQUksU0FBUyxLQUFLLEtBQUwsRUFBYjtBQUNBLFVBQUksTUFBTSxLQUFLLEdBQUwsRUFBVjtBQUNBLFVBQUksS0FBSyxLQUFLLEdBQUwsRUFBVDs7QUFFQSxVQUFHLFdBQVcsUUFBZCxFQUNFLEtBQUssVUFBTCxDQUFnQixFQUFoQixFQUFvQixHQUFwQixFQURGLEtBRUssSUFBRyxXQUFXLFNBQWQsRUFDSCxLQUFLLFdBQUwsQ0FBaUIsRUFBakI7QUFDSDs7OytCQUVVLEUsRUFBSSxHLEVBQUs7QUFDbEIsV0FBSyxTQUFMLENBQWUsTUFBZixDQUF1QixJQUF2QixFQUE2QixFQUFFLE1BQUYsRUFBTSxXQUFXLENBQUMsQ0FBQyxJQUFJLE1BQUosQ0FBVyxPQUE5QixFQUE3QjtBQUNEOzs7Z0NBRVcsRSxFQUFJO0FBQ2QsV0FBSyxTQUFMLENBQWUsT0FBZixDQUF1QixJQUF2QixFQUE2QixFQUE3QjtBQUNEOzs7a0NBRVk7QUFDWCxXQUFLLFNBQUwsR0FBaUIsQ0FBQyxLQUFLLFNBQXZCO0FBQ0E7QUFDRDs7O3FDQUVnQjtBQUNmLFdBQUssU0FBTCxDQUFlLGNBQWY7QUFDRDs7OytCQUNTLENBRVQ7QUFDRDtBQUNBO0FBQ0E7QUFDQTs7Ozs7OztBQUdGLElBQU0sMENBQU47O0FBd0NBLElBQU0sTUFBTSxJQUFJLEdBQUosRUFBWjs7QUFFQSxJQUFJLEtBQUosQ0FBVSxNQUFWLEVBQWtCLElBQWxCLENBQXVCLE1BQXZCOzs7Ozs7Ozs7QUN0SEE7O0FBQ0E7Ozs7Ozs7O0lBRU0saUI7Ozs7Ozs7Ozs7OzRCQUNHLEksRUFBTSxHLEVBQUk7QUFDZixXQUFLLElBQUwsR0FBWSxLQUFLLElBQUwsQ0FBVSxHQUFWLENBQWM7QUFBQSxlQUN4QixPQUFPLElBQVAsS0FBZ0IsSUFBaEIsZ0JBQTZCLE1BQTdCLEVBQXdDLEdBQXhDLGlCQUFzRCxNQUF0RCxFQUFpRSxFQUFFLFVBQVUsS0FBWixFQUFqRSxDQUR3QjtBQUFBLE9BQWQsQ0FBWjtBQUdEOzs7Ozs7QUFHSCxJQUFNLGNBQWMsSUFBSSxpQkFBSixFQUFwQjs7QUFFQSxNQUFNLElBQU4sQ0FBVyxDQUFDLEtBQUQsRUFBUSxRQUFSLEVBQWtCLFdBQWxCLENBQVgsRUFBMkMsR0FBM0MsQ0FBK0MsZ0JBQVE7QUFDdEQsY0FBWSxHQUFaLENBQWdCO0FBQ1gsVUFBTSxPQUFPLElBREY7QUFFWCxVQUFNLHFCQUFVLElBQVYsQ0FGSztBQUdYLGNBQVU7QUFIQyxHQUFoQjtBQUtBLENBTkQ7O0FBUUEsT0FBTyxPQUFQLEdBQWlCLFdBQWpCOzs7Ozs7Ozs7Ozs7O0FDckJBOzs7O0FBQ0E7O0FBQ0E7Ozs7Ozs7Ozs7Ozs7O0lBR00sRzs7Ozs7Ozs7Ozs7Ozs7Z0xBQ0osRSxHQUFLLFMsUUFDTCxXOzs7Ozt5Q0FDcUI7QUFBQTs7QUFDbkIsV0FBSyxXQUFMLENBQWlCLFNBQWpCLENBQTJCLGlCQUFTO0FBQ2xDLGVBQUssbUJBQUw7QUFDRCxPQUZEO0FBR0EsVUFBRyxPQUFPLFFBQVAsQ0FBZ0IsSUFBaEIsSUFBd0IsRUFBM0IsRUFBK0I7QUFDN0IsZUFBTyxPQUFQLENBQWUsU0FBZixDQUF5QixFQUF6QixFQUE2QixJQUE3QixFQUFtQyxPQUFuQztBQUNEO0FBQ0Y7Ozt3Q0FDa0I7QUFBQTs7QUFDakIsY0FBUSxHQUFSLENBQVksQ0FBWjtBQUNBLFdBQUssU0FBTCxDQUFlLE9BQU8sUUFBUCxDQUFnQixJQUEvQjtBQUNBLGFBQU8sVUFBUCxHQUFvQjtBQUFBLGVBQU0sT0FBSyxTQUFMLENBQWUsT0FBTyxRQUFQLENBQWdCLElBQS9CLENBQU47QUFBQSxPQUFwQjtBQUNEOztBQUVEO0FBQ0U7QUFDRjs7Ozs4QkFFVSxJLEVBQU07QUFDZCxXQUFLLFdBQUwsQ0FBaUIsTUFBakIsQ0FBd0IsSUFBeEIsRUFBOEIsRUFBRSxVQUFVLElBQVosRUFBOUI7QUFDRDs7Ozs7O0FBR0gsSUFBTSxZQUFZLElBQUksR0FBSixFQUFsQjs7QUFFQSxJQUFJLDBDQUFKOztBQVFBLFVBQVUsS0FBVixDQUFnQixNQUFoQjs7a0JBRWUsUzs7Ozs7Ozs7Ozs7QUMzQ2Y7Ozs7QUFDQTs7Ozs7Ozs7OztJQUVNLFc7Ozs7Ozs7Ozs7O3FDQUVhO0FBQ2YsV0FBSyxJQUFMLEdBQVksS0FBSyxJQUFMLENBQVUsTUFBVixDQUFpQjtBQUFBLGVBQVEsQ0FBQyxLQUFLLFNBQWQ7QUFBQSxPQUFqQixDQUFaO0FBQ0Q7Ozs7OztBQUdILElBQU0sUUFBUSxJQUFJLFdBQUosRUFBZDs7a0JBRWUsSzs7Ozs7Ozs7QUNaZixJQUFNLFFBQVEsZUFBUyxTQUFULEVBQW9CLElBQXBCLEVBQTBCO0FBQ3RDLE1BQUksVUFBVSxNQUFWLEdBQW1CLENBQXZCLEVBQTBCO0FBQ3hCLFdBQU8sYUFBYSxPQUFiLENBQXFCLFNBQXJCLEVBQWdDLEtBQUssU0FBTCxDQUFlLElBQWYsQ0FBaEMsQ0FBUDtBQUNELEdBRkQsTUFFTztBQUNMLFFBQUksUUFBUSxhQUFhLE9BQWIsQ0FBcUIsU0FBckIsQ0FBWjtBQUNBLFdBQU8sU0FBUyxLQUFLLEtBQUwsQ0FBVyxLQUFYLENBQVQsSUFBOEIsRUFBckM7QUFDRDtBQUNGLENBUEQ7O0FBU0EsSUFBTSxRQUFRLFNBQVIsS0FBUSxHQUFXO0FBQ3ZCLFNBQVEsS0FBSyxLQUFMLENBQVcsS0FBSyxNQUFMLEtBQWdCLEdBQWhCLEdBQW9CLElBQS9CLENBQUQsQ0FBdUMsUUFBdkMsQ0FBZ0QsRUFBaEQsQ0FBUDtBQUNELENBRkQ7O0FBSUEsSUFBTSxZQUFZLFNBQVosU0FBWSxDQUFTLENBQVQsRUFBWTtBQUM1QixTQUFPLEVBQUUsTUFBRixDQUFTLENBQVQsRUFBWSxXQUFaLEtBQTRCLEVBQUUsS0FBRixDQUFRLENBQVIsQ0FBbkM7QUFDRCxDQUZEOztBQUlBLElBQU0sT0FBTyxTQUFQLElBQU8sQ0FBVSxlQUFWLEVBQXNDO0FBQ2pEO0FBQ0E7QUFDQSxNQUFJLE1BQU0sZ0JBQWdCLEdBQTFCOztBQUVBLE1BQUksU0FBUyxFQUFiOztBQUxpRCxvQ0FBUixNQUFRO0FBQVIsVUFBUTtBQUFBOztBQU9qRCxTQUFPLE9BQVAsQ0FBZSxVQUFDLEtBQUQsRUFBUSxDQUFSLEVBQWM7QUFDekI7QUFDQTtBQUNBLFFBQUksTUFBTSxJQUFJLENBQUosQ0FBVjs7QUFFQTtBQUNBO0FBQ0E7QUFDQSxRQUFJLE1BQU0sT0FBTixDQUFjLEtBQWQsQ0FBSixFQUEwQjtBQUN0QixjQUFRLE1BQU0sSUFBTixDQUFXLEVBQVgsQ0FBUjtBQUNIOztBQUVEO0FBQ0E7QUFDQSxRQUFJLElBQUksUUFBSixDQUFhLEdBQWIsQ0FBSixFQUF1QjtBQUNuQixjQUFRLFdBQVcsS0FBWCxDQUFSO0FBQ0EsWUFBTSxJQUFJLEtBQUosQ0FBVSxDQUFWLEVBQWEsQ0FBQyxDQUFkLENBQU47QUFDSDtBQUNELGNBQVUsR0FBVjtBQUNBLGNBQVUsS0FBVjtBQUNILEdBcEJEO0FBcUJBO0FBQ0E7QUFDQTtBQUNBLFlBQVUsSUFBSSxJQUFJLE1BQUosR0FBVyxDQUFmLENBQVYsQ0EvQmlELENBK0JwQjs7QUFFN0IsU0FBTyxNQUFQO0FBQ0QsQ0FsQ0Q7O1FBcUNVLE8sR0FBUixJO1FBQ0EsSyxHQUFBLEs7UUFDQSxLLEdBQUEsSztRQUNBLFMsR0FBQSxTIiwiZmlsZSI6ImdlbmVyYXRlZC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzQ29udGVudCI6WyIoZnVuY3Rpb24oKXtmdW5jdGlvbiByKGUsbix0KXtmdW5jdGlvbiBvKGksZil7aWYoIW5baV0pe2lmKCFlW2ldKXt2YXIgYz1cImZ1bmN0aW9uXCI9PXR5cGVvZiByZXF1aXJlJiZyZXF1aXJlO2lmKCFmJiZjKXJldHVybiBjKGksITApO2lmKHUpcmV0dXJuIHUoaSwhMCk7dmFyIGE9bmV3IEVycm9yKFwiQ2Fubm90IGZpbmQgbW9kdWxlICdcIitpK1wiJ1wiKTt0aHJvdyBhLmNvZGU9XCJNT0RVTEVfTk9UX0ZPVU5EXCIsYX12YXIgcD1uW2ldPXtleHBvcnRzOnt9fTtlW2ldWzBdLmNhbGwocC5leHBvcnRzLGZ1bmN0aW9uKHIpe3ZhciBuPWVbaV1bMV1bcl07cmV0dXJuIG8obnx8cil9LHAscC5leHBvcnRzLHIsZSxuLHQpfXJldHVybiBuW2ldLmV4cG9ydHN9Zm9yKHZhciB1PVwiZnVuY3Rpb25cIj09dHlwZW9mIHJlcXVpcmUmJnJlcXVpcmUsaT0wO2k8dC5sZW5ndGg7aSsrKW8odFtpXSk7cmV0dXJuIG99cmV0dXJuIHJ9KSgpIiwidmFyIGFzc2VydCA9IHJlcXVpcmUoJy4uL3V0aWxzJykuYXNzZXJ0XHJcbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24oY29tcG9uZW50U3RyLCBub2RlKXtcclxuICB2YXIgY29tcG9uZW50ID0gY29tcG9uZW50U3RyLnJlcGxhY2UoJ2NvbXBvbmVudDonLCAnJylcclxuICBpZih0aGlzW2NvbXBvbmVudF0gIT09IHVuZGVmaW5lZCl7XHJcbiAgICB2YXIgZnJhZyA9IGRvY3VtZW50LmNyZWF0ZURvY3VtZW50RnJhZ21lbnQoKVxyXG4gICAgdGhpc1tjb21wb25lbnRdLnJlbmRlcihmcmFnKVxyXG4gICAgLy8gbm9kZS5wYXJlbnROb2RlLmluc2VydEJlZm9yZShmcmFnLCBudWxsKVxyXG4gICAgY29uc29sZS5sb2cobm9kZSwgZnJhZylcclxuICB9IGVsc2Uge1xyXG4gICAgYXNzZXJ0KGZhbHNlLCAnQ29tcG9uZW50ICcrY29tcG9uZW50KycgZG9lcyBub3QgZXhpc3QuJylcclxuICB9XHJcbn0iLCJ2YXIgY29uZGl0aW9uYWxOb2Rlc1Jhd1N0YXJ0ID0gL1xce1xce1xcPyhbXnt9XSspXFx9XFx9L2dcclxudmFyIGNvbmRpdGlvbmFsTm9kZXNSYXdFbmQgPSAvXFx7XFx7XFwvKFtee31dKylcXH1cXH0vZ1xyXG52YXIgRE9DVU1FTlRfVEVYVF9UWVBFID0gM1xyXG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uIChub2RlLCBjb25kaXRpb25hbCwgdG1wbEhhbmRsZXIpIHtcclxuICB2YXIgZW50cnlOb2RlXHJcbiAgdmFyIGN1cnJlbnROb2RlXHJcbiAgdmFyIGlzR2VuXHJcbiAgdmFyIGZyYWcgPSBkb2N1bWVudC5jcmVhdGVEb2N1bWVudEZyYWdtZW50KClcclxuICB3aGlsZShub2RlKXtcclxuICAgIGN1cnJlbnROb2RlID0gbm9kZVxyXG4gICAgbm9kZSA9IG5vZGUubmV4dFNpYmxpbmdcclxuICAgIGlmKGN1cnJlbnROb2RlLm5vZGVUeXBlID09PSBET0NVTUVOVF9URVhUX1RZUEUpe1xyXG4gICAgICBpZihjdXJyZW50Tm9kZS5ub2RlVmFsdWUubWF0Y2goY29uZGl0aW9uYWxOb2Rlc1Jhd1N0YXJ0KSl7XHJcbiAgICAgICAgZW50cnlOb2RlID0gY3VycmVudE5vZGVcclxuICAgICAgfSBlbHNlIGlmKGN1cnJlbnROb2RlLm5vZGVWYWx1ZS5tYXRjaChjb25kaXRpb25hbE5vZGVzUmF3RW5kKSl7XHJcbiAgICAgICAgY3VycmVudE5vZGUucmVtb3ZlKClcclxuICAgICAgICAvLyBzdGFyIGdlbmVyYXRpbmcgdGhlIGNvbmRpdGlvbmFsIG5vZGVzIHJhbmdlLCBpZiBub3QgeWV0XHJcbiAgICAgICAgaWYoIWlzR2VuKXtcclxuICAgICAgICAgIGlzR2VuID0gdHJ1ZVxyXG4gICAgICAgICAgdG1wbEhhbmRsZXIodGhpcywgbnVsbCwgbnVsbCwgbnVsbCwgZnJhZylcclxuICAgICAgICB9XHJcbiAgICAgICAgaWYodGhpc1tjb25kaXRpb25hbF0pe1xyXG4gICAgICAgICAgZW50cnlOb2RlLnBhcmVudE5vZGUuaW5zZXJ0QmVmb3JlKGZyYWcsIGVudHJ5Tm9kZSlcclxuICAgICAgICB9XHJcbiAgICAgICAgZW50cnlOb2RlLnJlbW92ZSgpXHJcbiAgICAgICAgbm9kZSA9IG51bGxcclxuICAgICAgfVxyXG4gICAgfSBlbHNlIHtcclxuICAgICAgdmFyIGNOb2RlID0gY3VycmVudE5vZGUuY2xvbmVOb2RlKHRydWUpXHJcbiAgICAgIGZyYWcuYXBwZW5kQ2hpbGQoY05vZGUpXHJcbiAgICAgIGN1cnJlbnROb2RlLnJlbW92ZSgpXHJcbiAgICB9XHJcbiAgfVxyXG5cclxufVxyXG4iLCJ2YXIgdG1wbEhhbmRsZXIgPSByZXF1aXJlKCcuL3RtcGxIYW5kbGVyJylcclxudmFyIGdldElkID0gcmVxdWlyZSgnLi4vdXRpbHMnKS5nZXRJZFxyXG52YXIgc3RySW50ZXJwcmV0ZXIgPSByZXF1aXJlKCcuL3N0ckludGVycHJldGVyJylcclxudmFyIG1vcnBoID0gcmVxdWlyZSgnbW9ycGhkb20nKVxyXG5cclxudmFyIG92ZXJpZGRlID0gbnVsbFxyXG5cclxudmFyIHVwZGF0ZUNvbnRleHQgPSBmdW5jdGlvbiAoKSB7XHJcbiAgdmFyIHNlbGYgPSB0aGlzXHJcbiAgLy8gZW5jbG9zZSB0aGUgdXBkYXRlIGV2ZW50IGFzIGFzeW5jIGVuc3VyZSBiYXRoIHVwZGF0ZVxyXG4gIC8vIGVuc3VyZSBvbmx5IHRyaWdnZXIgRE9NIGRpZmYgb25jZSBhdCBhIHRpbWVcclxuICBpZihvdmVyaWRkZSkgY2xlYXJUaW1lb3V0KG92ZXJpZGRlKVxyXG4gIG92ZXJpZGRlID0gc2V0VGltZW91dChmdW5jdGlvbigpe1xyXG4gICAgdmFyIGVsZSA9IGdldElkKHNlbGYuZWwpXHJcbiAgICBnZW5FbGVtZW50LmNhbGwoc2VsZilcclxuICAgIHZhciBuZXdFbGVtID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnZGl2JylcclxuICAgIG5ld0VsZW0uaWQgPSBzZWxmLmVsXHJcbiAgICBuZXdFbGVtLmFwcGVuZENoaWxkKHNlbGYuYmFzZSlcclxuICAgIG1vcnBoKGVsZSwgbmV3RWxlbSlcclxuICAgIC8vIGV4ZWMgbGlmZS1jeWNsZSBjb21wb25lbnREaWRVcGRhdGVcclxuICAgIGlmIChzZWxmLmNvbXBvbmVudERpZFVwZGF0ZSAmJiB0eXBlb2Ygc2VsZi5jb21wb25lbnREaWRVcGRhdGUgPT09ICdmdW5jdGlvbicpIHtcclxuICAgICAgc2VsZi5jb21wb25lbnREaWRVcGRhdGUoKVxyXG4gICAgfVxyXG4gICAgLy8gcmVzZXQgYmF0Y2ggcG9vbGluZ1xyXG4gICAgYmF0Y2hQb29sLnN0YXR1cyA9ICdyZWFkeSdcclxuICB9KVxyXG59XHJcblxyXG4vLyBiYXRjaCBwb29sIHVwZGF0ZSBzdGF0ZXMgdG8gRE9NXHJcbnZhciBiYXRjaFBvb2wgPSB7XHJcbiAgdHRsOiAwLFxyXG4gIHN0YXR1czogJ3JlYWR5J1xyXG59XHJcblxyXG4vLyBUaGUgaWRlYSBiZWhpbmQgdGhpcyBpcyB0byByZWR1Y2UgbW9ycGhpbmcgdGhlIERPTSB3aGVuIG11bHRpcGxlIHVwZGF0ZXNcclxuLy8gaGl0IHRoZSBkZWNrLiBJZiBwb3NzaWJsZSB3ZSB3YW50IHRvIHBvb2wgdGhlbSBiZWZvcmUgaW5pdGlhdGluZyBET01cclxuLy8gbW9ycGhpbmcsIGJ1dCBpbiB0aGUgZXZlbnQgdGhlIHVwZGF0ZSBpcyBub3QgZmFzdCBlbm91Z2ggd2Ugd2FudCB0byByZXR1cm5cclxuLy8gdG8gbm9ybWFsIHN5bmNocm9ub3VzIHVwZGF0ZS5cclxudmFyIGJhdGNoUG9vbEV4ZWMgPSBmdW5jdGlvbiAoKSB7XHJcbiAgaWYgKGJhdGNoUG9vbC5zdGF0dXMgPT09ICdwb29saW5nJykge1xyXG4gICAgLy9cclxuICB9IGVsc2Uge1xyXG4gICAgdmFyIHNlbGYgPSB0aGlzXHJcbiAgICBiYXRjaFBvb2wuc3RhdHVzID0gJ3Bvb2xpbmcnXHJcbiAgICAvLyBpZiBiYXRjaHBvb2wgaXMgbm90IHlldCBleGVjdXRlZCBvciBpdCB3YXMgaWRsZSAoYWZ0ZXIgMTAwbXMpXHJcbiAgICAvLyBkaXJlY3QgbW9ycGggdGhlIERPTVxyXG4gICAgaWYgKCFiYXRjaFBvb2wudHRsKSB7XHJcbiAgICAgIHVwZGF0ZUNvbnRleHQuY2FsbCh0aGlzKVxyXG4gICAgfSBlbHNlIHtcclxuICAgIC8vIHdlIHdhaXQgdW50aWwgcG9vbGluZyBpcyByZWFkeSBiZWZvcmUgaW5pdGlhdGluZyBET00gbW9ycGhpbmdcclxuICAgICAgY2xlYXJUaW1lb3V0KGJhdGNoUG9vbC50dGwpXHJcbiAgICAgIGJhdGNoUG9vbC50dGwgPSBzZXRUaW1lb3V0KGZ1bmN0aW9uICgpIHtcclxuICAgICAgICB1cGRhdGVDb250ZXh0LmNhbGwoc2VsZilcclxuICAgICAgfSwgMClcclxuICAgIH1cclxuICAgIC8vIHdlIGNsZWFyIHRoZSBiYXRjaCBwb29sIGlmIGl0IG1vcmUgdGhlbiAxMDBtcyBmcm9tXHJcbiAgICAvLyBsYXN0IHVwZGF0ZVxyXG4gICAgYmF0Y2hQb29sLnR0bCA9IHNldFRpbWVvdXQoZnVuY3Rpb24gKCkge1xyXG4gICAgICBiYXRjaFBvb2wudHRsID0gMFxyXG4gICAgfSwgMClcclxuICB9XHJcbn1cclxuXHJcbnZhciBuZXh0U3RhdGUgPSBmdW5jdGlvbiAoaSkge1xyXG4gIHZhciBzZWxmID0gdGhpc1xyXG4gIHZhciBzdGF0ZVxyXG4gIHZhciB2YWx1ZVxyXG4gIGlmKGkgPCBzdGF0ZUxpc3QubGVuZ3RoKSB7XHJcblxyXG4gICAgc3RhdGUgPSBzdGF0ZUxpc3RbaV1cclxuICAgIHZhbHVlID0gdGhpc1tzdGF0ZV1cclxuXHJcbiAgICAvLyBpZiB2YWx1ZSBpcyB1bmRlZmluZWQsIGxpa2VseSBoYXMgb2JqZWN0IG5vdGF0aW9uIHdlIGNvbnZlcnQgaXQgdG8gYXJyYXlcclxuICAgIGlmICh2YWx1ZSA9PT0gdW5kZWZpbmVkKSB2YWx1ZSA9IHN0ckludGVycHJldGVyKHN0YXRlKVxyXG5cclxuICAgIGlmICh2YWx1ZSAmJiBBcnJheS5pc0FycmF5KHZhbHVlKSkge1xyXG4gICAgICAvLyB1c2luZyBzcGxpdCBvYmplY3Qgbm90YXRpb24gYXMgYmFzZSBmb3Igc3RhdGUgdXBkYXRlXHJcbiAgICAgIC8vIGNvbnNvbGUubG9nKHZhbHVlKVxyXG4gICAgICB2YXIgaW5WYWwgPSB0aGlzW3ZhbHVlWzBdXVt2YWx1ZVsxXV1cclxuICAgICAgT2JqZWN0LmRlZmluZVByb3BlcnR5KHRoaXNbdmFsdWVbMF1dLCB2YWx1ZVsxXSwge1xyXG4gICAgICAgIGVudW1lcmFibGU6IGZhbHNlLFxyXG4gICAgICAgIGNvbmZpZ3VyYWJsZTogdHJ1ZSxcclxuICAgICAgICBnZXQ6IGZ1bmN0aW9uICgpIHtcclxuICAgICAgICAgIHJldHVybiBpblZhbFxyXG4gICAgICAgIH0sXHJcbiAgICAgICAgc2V0OiBmdW5jdGlvbiAodmFsKSB7XHJcbiAgICAgICAgICBpblZhbCA9IHZhbFxyXG4gICAgICAgICAgYmF0Y2hQb29sRXhlYy5jYWxsKHNlbGYpXHJcbiAgICAgICAgfVxyXG4gICAgICB9KVxyXG4gICAgfSBlbHNlIHtcclxuICAgICAgLy8gaGFuZGxlIHBhcmVudCBzdGF0ZSB1cGRhdGUgaWYgdGhlIHN0YXRlIGlzIG5vdCBhbiBvYmplY3RcclxuICAgICAgT2JqZWN0LmRlZmluZVByb3BlcnR5KHRoaXMsIHN0YXRlLCB7XHJcbiAgICAgICAgZW51bWVyYWJsZTogZmFsc2UsXHJcbiAgICAgICAgY29uZmlndXJhYmxlOiB0cnVlLFxyXG4gICAgICAgIGdldDogZnVuY3Rpb24gKCkge1xyXG4gICAgICAgICAgcmV0dXJuIHZhbHVlXHJcbiAgICAgICAgfSxcclxuICAgICAgICBzZXQ6IGZ1bmN0aW9uICh2YWwpIHtcclxuICAgICAgICAgIHZhbHVlID0gdmFsXHJcbiAgICAgICAgICBiYXRjaFBvb2xFeGVjLmNhbGwoc2VsZilcclxuICAgICAgICB9XHJcbiAgICAgIH0pXHJcbiAgICB9XHJcbiAgICBpKytcclxuICAgIG5leHRTdGF0ZS5jYWxsKHRoaXMsIGkpXHJcbiAgfVxyXG59XHJcblxyXG52YXIgc2V0U3RhdGUgPSBmdW5jdGlvbiAoKSB7XHJcbiAgbmV4dFN0YXRlLmNhbGwodGhpcywgMClcclxufVxyXG5cclxudmFyIHN0YXRlTGlzdCA9IFtdXHJcblxyXG52YXIgY2xlYXJTdGF0ZSA9IGZ1bmN0aW9uKCl7XHJcbiAgc3RhdGVMaXN0ID0gW11cclxufVxyXG5cclxudmFyIGFkZFN0YXRlID0gZnVuY3Rpb24oc3RhdGUpe1xyXG4gIGlmKHN0YXRlTGlzdC5pbmRleE9mKHN0YXRlKSA9PT0gLTEpIHN0YXRlTGlzdCA9IHN0YXRlTGlzdC5jb25jYXQoc3RhdGUpXHJcbn1cclxuXHJcbnZhciBnZW5FbGVtZW50ID0gZnVuY3Rpb24gKCkge1xyXG4gIHRoaXMuYmFzZSA9IHRoaXMuX19wcmlzdGluZUZyYWdtZW50X18uY2xvbmVOb2RlKHRydWUpXHJcbiAgdG1wbEhhbmRsZXIodGhpcywgYWRkU3RhdGUpXHJcbn1cclxuXHJcbmV4cG9ydHMuZ2VuRWxlbWVudCA9IGdlbkVsZW1lbnRcclxuZXhwb3J0cy5hZGRTdGF0ZSA9IGFkZFN0YXRlXHJcbmV4cG9ydHMuc2V0U3RhdGUgPSBzZXRTdGF0ZVxyXG5leHBvcnRzLmNsZWFyU3RhdGUgPSBjbGVhclN0YXRlXHJcbiIsInZhciB0ZXJuYXJ5T3BzID0gcmVxdWlyZSgnLi90ZXJuYXJ5T3BzJylcclxudmFyIGNyZWF0ZU1vZGVsID0gcmVxdWlyZSgnLi4vdXRpbHMnKS5jcmVhdGVNb2RlbFxyXG52YXIgYXNzZXJ0ID0gcmVxdWlyZSgnLi4vdXRpbHMnKS5hc3NlcnRcclxudmFyIGdlbk1vZGVsVGVtcGxhdGUgPSByZXF1aXJlKCcuL2dlbk1vZGVsVGVtcGxhdGUnKVxyXG5cclxubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbiAobm9kZSwgbW9kZWwsIHRtcGxIYW5kbGVyKSB7XHJcbiAgdmFyIG1vZGVsTGlzdFxyXG4gIHZhciBtTGVuZ3RoXHJcbiAgdmFyIGlcclxuICB2YXIgbGlzdENsb25lXHJcbiAgdmFyIHBhcmVudE5vZGVcclxuXHJcbiAgdmFyIGxpc3QgPSBub2RlLm5leHRTaWJsaW5nLmNsb25lTm9kZSh0cnVlKVxyXG4gIHZhciBzdHIgPSBsaXN0Lm91dGVySFRNTFxyXG5cclxuICAvLyBjaGVjayBpZiBicm93c2VyIHN1cHBvcnQgY3JlYXRlUmFuZ2VcclxuICB2YXIgcmFuZ2VcclxuICBpZih0eXBlb2YgZG9jdW1lbnQuY3JlYXRlUmFuZ2UgPT09ICdmdW5jdGlvbicpe1xyXG4gICAgcmFuZ2UgPSBkb2N1bWVudC5jcmVhdGVSYW5nZSgpXHJcbiAgfVxyXG5cclxuICAvLyByZW1vdmUgdGhlIGZpcnN0IHByb3RvdHlwZSBub2RlIFxyXG4gIG5vZGUubmV4dFNpYmxpbmcucmVtb3ZlKClcclxuXHJcbiAgaWYodGhpc1ttb2RlbF0gIT09IHVuZGVmaW5lZCAmJiB0aGlzW21vZGVsXS5oYXNPd25Qcm9wZXJ0eSgnbGlzdCcpKXtcclxuICAgIHBhcmVudE5vZGUgPSBub2RlLnBhcmVudE5vZGVcclxuICAgIGlmKG5vZGUubmV4dFNpYmxpbmcpe1xyXG4gICAgICBub2RlLm5leHRTaWJsaW5nLnJlbW92ZSgpIC8vIHJlbW92ZSB0aGUgdGV4dCB0YWcgZm9yIG1vZGVsRW5kXHJcbiAgICB9IGVsc2Uge1xyXG4gICAgICBhc3NlcnQoZmFsc2UsICdNb2RlbCBcInt7L21vZGVsOicrbW9kZWwrJ319XCIgZW5jbG9zaW5nIHRhZyBkb2VzIG5vdCBleGlzdC4nKVxyXG4gICAgfVxyXG4gICAgbm9kZS5yZW1vdmUoKSAvLyByZW1vdmUgdGhlIHRleHQgZm9yIG1vZGVsIHN0YXJ0IHRhZ1xyXG4gICAgXHJcbiAgICBtb2RlbExpc3QgPSB0aGlzW21vZGVsXS5saXN0XHJcbiAgICBtTGVuZ3RoID0gbW9kZWxMaXN0Lmxlbmd0aFxyXG4gICAgaSA9IDBcclxuICAgIFxyXG4gICAgd2hpbGUoaSA8IG1MZW5ndGgpe1xyXG4gICAgICBpZihyYW5nZSl7XHJcbiAgICAgICAgdmFyIG0gPSBnZW5Nb2RlbFRlbXBsYXRlKHN0ciwgbW9kZWxMaXN0W2ldKVxyXG4gICAgICAgIHZhciBkb2N1bWVudEZyYWdtZW50ID0gcmFuZ2UuY3JlYXRlQ29udGV4dHVhbEZyYWdtZW50KG0pXHJcbiAgICAgICAgcGFyZW50Tm9kZS5pbnNlcnRCZWZvcmUoZG9jdW1lbnRGcmFnbWVudCwgbnVsbClcclxuICAgICAgfSBlbHNlIHtcclxuICAgICAgICAvLyBmYWxsYmFjayB0byByZWd1bGFyIG5vZGUgZ2VuZXJhdGlvbiBoYW5kbGVyXHJcbiAgICAgICAgbGlzdENsb25lID0gbGlzdC5jbG9uZU5vZGUodHJ1ZSlcclxuICAgICAgICB0bXBsSGFuZGxlcih0aGlzLCBudWxsLCBsaXN0Q2xvbmUsIG1vZGVsTGlzdFtpXSkgXHJcbiAgICAgIH1cclxuICAgICAgaSsrXHJcbiAgICB9XHJcbiAgfSBlbHNlIHtcclxuICAgIGFzc2VydChmYWxzZSwgJ01vZGVsIFwiJyttb2RlbCsnXCIgZG9lcyBub3QgZXhpc3QuJylcclxuICB9XHJcbn1cclxuIiwidmFyIHRlcm5hcnlPcHMgPSByZXF1aXJlKCcuL3Rlcm5hcnlPcHMnKVxyXG52YXIgcmUgPSBuZXcgUmVnRXhwKC8oXFxzY2hlY2tlZFxcPVxcXCIpKC4qPykoPz1cXFwiKS9nKVxyXG52YXIgdG1wbCA9ICcnXHJcblxyXG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uIChzdHJpbmcsIG9iaikge1xyXG4gIHZhciBhcnJQcm9wcyA9IHN0cmluZy5tYXRjaCgve3soW157fV0rKX19L2cpXHJcbiAgdmFyIHJlcFxyXG4gIHZhciBpc1Rlcm5hcnlcclxuICB0bXBsID0gc3RyaW5nXHJcbiAgZm9yICh2YXIgaSA9IDAsIGxlbiA9IGFyclByb3BzLmxlbmd0aDsgaSA8IGxlbjsgaSsrKSB7XHJcbiAgICByZXAgPSBhcnJQcm9wc1tpXS5yZXBsYWNlKC97eyhbXnt9XSspfX0vZywgJyQxJylcclxuICAgIGlzVGVybmFyeSA9IHRlcm5hcnlPcHMuY2FsbChvYmosIHJlcClcclxuICAgIGlmIChpc1Rlcm5hcnkpIHtcclxuICAgICAgdG1wbCA9IHRtcGwucmVwbGFjZSgne3snICsgcmVwICsgJ319JywgaXNUZXJuYXJ5LnZhbHVlKVxyXG4gICAgfSBlbHNlIHtcclxuICAgICAgdG1wbCA9IHRtcGwucmVwbGFjZSgne3snICsgcmVwICsgJ319Jywgb2JqW3JlcF0pXHJcbiAgICB9XHJcblxyXG4gICAgdmFyIG1hdGNoID0gdG1wbC5tYXRjaChyZSlcclxuICAgIGlmKG1hdGNoKXtcclxuICAgICAgaWYobWF0Y2hbMF0ubGVuZ3RoID09PSAxNylcclxuICAgICAgICB0bXBsID0gdG1wbC5yZXBsYWNlKCcgY2hlY2tlZD1cImNoZWNrZWRcIicsICcgY2hlY2tlZCcpXHJcbiAgICAgIGVsc2VcclxuICAgICAgICB0bXBsID0gdG1wbC5yZXBsYWNlKCcgY2hlY2tlZD1cIlwiJywgJycpXHJcbiAgICB9XHJcbiAgfVxyXG4gIHJldHVybiB0bXBsXHJcbn0iLCJ2YXIgc2V0U3RhdGUgPSByZXF1aXJlKCcuL2dlbkVsZW1lbnQnKS5zZXRTdGF0ZVxyXG52YXIgdG1wbEhhbmRsZXIgPSByZXF1aXJlKCcuL3RtcGxIYW5kbGVyJylcclxudmFyIGdldElkID0gcmVxdWlyZSgnLi4vdXRpbHMnKS5nZXRJZFxyXG52YXIgYWRkU3RhdGUgPSAgcmVxdWlyZSgnLi9nZW5FbGVtZW50JykuYWRkU3RhdGVcclxudmFyIGFzc2VydCA9IHJlcXVpcmUoJy4uL3V0aWxzJykuYXNzZXJ0XHJcblxyXG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uIChzdHViKSB7XHJcblxyXG4gIHRtcGxIYW5kbGVyKHRoaXMsIGFkZFN0YXRlKVxyXG5cclxuICB2YXIgZWwgPSBzdHViIHx8IGdldElkKHRoaXMuZWwpXHJcblxyXG4gIGlmKGVsKXtcclxuICAgIC8vIGxpc3RlbiB0byBzdGF0ZSBjaGFuZ2VzXHJcbiAgICBzZXRTdGF0ZS5jYWxsKHRoaXMpXHJcbiAgICAvLyBtb3VudCBmcmFnbWVudCB0byBET01cclxuICAgIGVsLmFwcGVuZENoaWxkKHRoaXMuYmFzZSlcclxuICAgIC8vIHNpbmNlIGNvbXBvbmVudCBhbHJlYWR5IHJlbmRlcmVkLCB0cmlnZ2VyIGl0cyBsaWZlLWN5Y2xlIG1ldGhvZFxyXG4gICAgaWYgKHRoaXMuY29tcG9uZW50RGlkTW91bnQgJiYgdHlwZW9mIHRoaXMuY29tcG9uZW50RGlkTW91bnQgPT09ICdmdW5jdGlvbicpIHtcclxuICAgICAgdGhpcy5jb21wb25lbnREaWRNb3VudCgpXHJcbiAgICB9XHJcbiAgfSBlbHNlIHtcclxuICAgIGFzc2VydChmYWxzZSwgJ05vIGVsZW1lbnQgd2l0aCBpZDogXCInICsgdGhpcy5lbCArICdcIiBleGlzdC4nKVxyXG4gIH1cclxuICBcclxufVxyXG4iLCJtb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uIChzdHIpIHtcclxuICB2YXIgcmVzID0gc3RyLm1hdGNoKC9cXC4qXFwuL2cpXHJcbiAgdmFyIHJlc3VsdFxyXG4gIGlmIChyZXMgJiYgcmVzLmxlbmd0aCA+IDApIHtcclxuICAgIHJldHVybiBzdHIuc3BsaXQoJy4nKVxyXG4gIH1cclxuICByZXR1cm4gcmVzdWx0XHJcbn1cclxuIiwiLy8gZnVuY3Rpb24gdG8gcmVzb2x2ZSB0ZXJuYXJ5IG9wZXJhdGlvblxyXG5cclxuZnVuY3Rpb24gdGVzdCAoc3RyKSB7XHJcbiAgaWYgKHN0ciA9PT0gJ1xcJ1xcJycgfHwgc3RyID09PSAnXCJcIicgfHwgc3RyID09PSAnbnVsbCcpIHsgcmV0dXJuICcnIH1cclxuICByZXR1cm4gc3RyXHJcbn1cclxuXHJcbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24gKGlucHV0KSB7XHJcbiAgaWYgKGlucHV0Lm1hdGNoKC8oW14/XSopXFw/KFteOl0qKTooW147XSopfChcXHMqPVxccyopW147XSovZykpIHtcclxuICAgIHZhciB0ID0gaW5wdXQuc3BsaXQoJz8nKVxyXG4gICAgdmFyIGNvbmRpdGlvbiA9IHRbMF1cclxuICAgIHZhciBsZWZ0SGFuZCA9IHRbMV0uc3BsaXQoJzonKVswXVxyXG4gICAgdmFyIHJpZ2h0SGFuZCA9IHRbMV0uc3BsaXQoJzonKVsxXVxyXG5cclxuICAgIC8vIGNoZWNrIHRoZSBjb25kaXRpb24gZnVsZmlsbG1lbnRcclxuICAgIC8vIGNvbnNvbGUubG9nKHRoaXMpXHJcbiAgICBpZiAodGhpc1tjb25kaXRpb25dKSB7XHJcbiAgICAgIHJldHVybiB7XHJcbiAgICAgICAgdmFsdWU6IHRlc3QobGVmdEhhbmQpLFxyXG4gICAgICAgIHN0YXRlOiBjb25kaXRpb25cclxuICAgICAgfVxyXG4gICAgfSBlbHNlIHtcclxuICAgICAgcmV0dXJuIHtcclxuICAgICAgICB2YWx1ZTogdGVzdChyaWdodEhhbmQpLFxyXG4gICAgICAgIHN0YXRlOiBjb25kaXRpb25cclxuICAgICAgfVxyXG4gICAgfVxyXG4gIH0gZWxzZSByZXR1cm4gZmFsc2VcclxufVxyXG4iLCJ2YXIgc3RySW50ZXJwcmV0ZXIgPSByZXF1aXJlKCcuL3N0ckludGVycHJldGVyJylcclxudmFyIHRlcm5hcnlPcHMgPSByZXF1aXJlKCcuL3Rlcm5hcnlPcHMnKVxyXG52YXIgZ2V0SWQgPSByZXF1aXJlKCcuLi91dGlscycpLmdldElkXHJcbnZhciBnZW5Nb2RlbExpc3QgPSByZXF1aXJlKCcuL2dlbk1vZGVsTGlzdCcpXHJcbnZhciBjb25kaXRpb25hbE5vZGVzID0gcmVxdWlyZSgnLi9jb25kaXRpb25hbE5vZGVzJylcclxudmFyIGNvbXBvbmVudFBhcnNlID0gcmVxdWlyZSgnLi9jb21wb25lbnRQYXJzZScpXHJcblxyXG52YXIgRE9DVU1FTlRfRlJBR01FTlRfVFlQRSA9IDExXHJcbnZhciBET0NVTUVOVF9URVhUX1RZUEUgPSAzXHJcbnZhciBET0NVTUVOVF9FTEVNRU5UX1RZUEUgPSAxXHJcbnZhciBET0NVTUVOVF9DT01NRU5UX1RZUEUgPSA4XHJcbnZhciBET0NVTUVOVF9BVFRSSUJVVEVfVFlQRSA9IDJcclxuXHJcbnZhciByZSA9IC97eyhbXnt9XSspfX0vZ1xyXG5cclxudmFyIG1vZGVsID0gL15tb2RlbDovZ1xyXG52YXIgbW9kZWxSYXcgPSAvXlxce1xce21vZGVsOihbXnt9XSspXFx9XFx9L2dcclxuXHJcbnZhciBjb25kaXRpb25hbFJlID0gL15cXD8vZ1xyXG5cclxudmFyIGNvbXBvbmVudCA9IC9eY29tcG9uZW50OihbXnt9XSspL2dcclxuXHJcbnZhciB0bXBsaGFuZGxlciA9IGZ1bmN0aW9uIChjdHgsIHVwZGF0ZVN0YXRlTGlzdCwgbW9kZWxJbnN0YW5jZSwgbW9kZWxPYmplY3QsIGNvbmRpdGlvbmFsKSB7XHJcblxyXG4gIHZhciBjdXJyZW50Tm9kZVxyXG4gIHZhciBzdHJcclxuICB2YXIgdmFsIFxyXG4gIHZhciB0eXBlXHJcbiAgdmFyIGxuIFxyXG4gIHZhciBwcm9wcyBcclxuICB2YXIgcmVwXHJcbiAgdmFyIGZyYWdtZW50XHJcbiAgdmFyIGluc3RhbmNlXHJcbiAgdmFyIG5vZGVBdHRyaWJ1dGVzXHJcbiAgdmFyIGkgPSAwXHJcbiAgdmFyIGFcclxuICB2YXIgbnNcclxuICB2YXIgZXZ0TmFtZVxyXG4gIHZhciBjXHJcbiAgdmFyIGhcclxuICB2YXIgaGFuZGxlckFyZ3NcclxuICB2YXIgYXJndlxyXG4gIHZhciBoYW5kbGVyXHJcbiAgdmFyIHRuciBcclxuICB2YXIgbW9kZWxSZXBcclxuICB2YXIgY29uZGl0aW9uYWxSZXBcclxuICB2YXIgZm4gXHJcbiAgdmFyIGVsXHJcbiAgdmFyIGlkeFxyXG4gIHZhciByZW0gPSBbXVxyXG4gIHZhciBpc09iamVjdE5vdGF0aW9uXHJcblxyXG4gIGlmKG1vZGVsT2JqZWN0KXtcclxuICAgIGluc3RhbmNlID0gbW9kZWxJbnN0YW5jZVxyXG4gIH0gZWxzZSBpZihjb25kaXRpb25hbCl7XHJcbiAgICBpbnN0YW5jZSA9IGNvbmRpdGlvbmFsLmZpcnN0Q2hpbGRcclxuICB9IGVsc2Uge1xyXG4gICAgZnJhZ21lbnQgPSBjdHguYmFzZVxyXG4gICAgaW5zdGFuY2UgPSBmcmFnbWVudC5maXJzdENoaWxkXHJcbiAgfVxyXG5cclxuICB2YXIgaW5zID0gbW9kZWxPYmplY3QgfHwgY3R4XHJcblxyXG4gIGZ1bmN0aW9uIHVwZGF0ZVN0YXRlKHN0YXRlKXtcclxuICAgIGlmKHR5cGVvZiB1cGRhdGVTdGF0ZUxpc3QgPT09ICdmdW5jdGlvbicpe1xyXG4gICAgICB1cGRhdGVTdGF0ZUxpc3Qoc3RhdGUpXHJcbiAgICB9XHJcbiAgfVxyXG5cclxuICBmdW5jdGlvbiByZXBsYWNlSGFuZGxlQmFycyh2YWx1ZSwgbm9kZSkge1xyXG4gICAgcHJvcHMgPSB2YWx1ZS5tYXRjaChyZSlcclxuICAgIGxuID0gcHJvcHMubGVuZ3RoXHJcbiAgICB3aGlsZSAobG4pIHtcclxuICAgICAgbG4tLVxyXG4gICAgICByZXAgPSBwcm9wc1tsbl0ucmVwbGFjZShyZSwgJyQxJylcclxuICAgICAgdG5yID0gdGVybmFyeU9wcy5jYWxsKGlucywgcmVwKVxyXG4gICAgICBpc09iamVjdE5vdGF0aW9uID0gc3RySW50ZXJwcmV0ZXIocmVwKVxyXG4gICAgICBpZihpc09iamVjdE5vdGF0aW9uKXtcclxuICAgICAgICB1cGRhdGVTdGF0ZShyZXApXHJcbiAgICAgICAgdmFsdWUgPSB2YWx1ZS5yZXBsYWNlKCd7eycgKyByZXAgKyAnfX0nLCBpbnNbaXNPYmplY3ROb3RhdGlvblswXV1baXNPYmplY3ROb3RhdGlvblsxXV0pXHJcbiAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgaWYodG5yKXtcclxuICAgICAgICAgIHVwZGF0ZVN0YXRlKHRuci5zdGF0ZSlcclxuICAgICAgICAgIHZhbHVlID0gdmFsdWUucmVwbGFjZSgne3snK3JlcCsnfX0nLCB0bnIudmFsdWUpXHJcbiAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgIGlmKHJlcC5tYXRjaChtb2RlbCkpe1xyXG4gICAgICAgICAgICBtb2RlbFJlcCA9IHJlcC5yZXBsYWNlKCdtb2RlbDonLCAnJylcclxuICAgICAgICAgICAgLy8gZ2VuZXJhdGUgbGlzdCBtb2RlbFxyXG4gICAgICAgICAgICBnZW5Nb2RlbExpc3QuY2FsbChjdHgsIG5vZGUsIG1vZGVsUmVwLCB0bXBsaGFuZGxlcilcclxuICAgICAgICAgIH0gZWxzZSBpZihyZXAubWF0Y2goY29uZGl0aW9uYWxSZSkpe1xyXG4gICAgICAgICAgICBjb25kaXRpb25hbFJlcCA9IHJlcC5yZXBsYWNlKCc/JywgJycpXHJcbiAgICAgICAgICAgIGlmKGluc1tjb25kaXRpb25hbFJlcF0gIT09IHVuZGVmaW5lZCl7XHJcbiAgICAgICAgICAgICAgdXBkYXRlU3RhdGUoY29uZGl0aW9uYWxSZXApXHJcbiAgICAgICAgICAgICAgY29uZGl0aW9uYWxOb2Rlcy5jYWxsKGN0eCwgbm9kZSwgY29uZGl0aW9uYWxSZXAsIHRtcGxoYW5kbGVyKVxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICB9IGVsc2UgaWYocmVwLm1hdGNoKGNvbXBvbmVudCkpIHtcclxuICAgICAgICAgICAgY29tcG9uZW50UGFyc2UuY2FsbChjdHgsIHJlcCwgbm9kZSlcclxuICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgIGlmKGluc1tyZXBdICE9PSB1bmRlZmluZWQpe1xyXG4gICAgICAgICAgICAgIHVwZGF0ZVN0YXRlKHJlcClcclxuICAgICAgICAgICAgICB2YWx1ZSA9IHZhbHVlLnJlcGxhY2UoJ3t7JytyZXArJ319JywgaW5zW3JlcF0pXHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgIH1cclxuICAgICAgICB9XHJcbiAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICByZXR1cm4gdmFsdWVcclxuICB9XHJcblxyXG4gIGZ1bmN0aW9uIGluc3BlY3Qobm9kZSl7XHJcbiAgICB0eXBlID0gbm9kZS5ub2RlVHlwZVxyXG4gICAgdmFsID0gbm9kZS5ub2RlVmFsdWVcclxuICAgIGlmKHZhbC5tYXRjaChyZSkpe1xyXG4gICAgICB2YWwgPSByZXBsYWNlSGFuZGxlQmFycyh2YWwsIG5vZGUpXHJcbiAgICAgIG5vZGUubm9kZVZhbHVlID0gdmFsXHJcbiAgICB9XHJcbiAgfVxyXG5cclxuICBmdW5jdGlvbiBpbnNwZWN0QXR0cmlidXRlcyhub2RlKXtcclxuICAgIG5vZGVBdHRyaWJ1dGVzID0gbm9kZS5hdHRyaWJ1dGVzXHJcbiAgICBmb3IgKGkgPSBub2RlQXR0cmlidXRlcy5sZW5ndGg7IGktLTspIHtcclxuICAgICAgYSA9IG5vZGVBdHRyaWJ1dGVzW2ldXHJcbiAgICAgIG5hbWUgPSBhLmxvY2FsTmFtZVxyXG4gICAgICBucyA9IGEubm9kZVZhbHVlXHJcbiAgICAgIGlmIChyZS50ZXN0KG5hbWUpKSB7XHJcbiAgICAgICAgbm9kZS5yZW1vdmVBdHRyaWJ1dGUobmFtZSlcclxuICAgICAgICB2YXIgdGVtcCA9IG5hbWVcclxuICAgICAgICBuYW1lID0gcmVwbGFjZUhhbmRsZUJhcnMobmFtZSlcclxuICAgICAgICBub2RlLnNldEF0dHJpYnV0ZShuYW1lLCBucylcclxuICAgICAgfSBlbHNlIGlmKHJlLnRlc3QobnMpKXtcclxuICAgICAgICBucyA9IHJlcGxhY2VIYW5kbGVCYXJzKG5zKVxyXG4gICAgICAgIGlmKG5zID09PSAnJyl7XHJcbiAgICAgICAgICBub2RlLnJlbW92ZUF0dHJpYnV0ZShuYW1lKVxyXG4gICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICBpZihuYW1lID09PSAnY2hlY2tlZCcpe1xyXG4gICAgICAgICAgICBub2RlLnNldEF0dHJpYnV0ZShuYW1lLCAnJylcclxuICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgIG5vZGUuc2V0QXR0cmlidXRlKG5hbWUsIG5zKVxyXG4gICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuICAgICAgfVxyXG4gICAgfVxyXG4gIH1cclxuXHJcbiAgZnVuY3Rpb24gbG9va1VwRXZ0Tm9kZShub2RlKXtcclxuICAgIC8vIGNoZWNrIGlmIG5vZGUgaXMgdmlzaWJsZSBvbiBET00gYW5kIGhhcyBhdHRyaWJ1dGUgZXZ0LW5vZGVcclxuICAgIGlmKG5vZGUuaGFzQXR0cmlidXRlKCdldnQtbm9kZScpICYmIGdldElkKG5vZGUuaWQpKXtcclxuICAgICAgcmV0dXJuIHRydWVcclxuICAgIH1cclxuICAgIHJldHVybiBmYWxzZVxyXG4gIH1cclxuXHJcbiAgZnVuY3Rpb24gbG9va3VwUGFyZW50Tm9kZShyb290Tm9kZSwgbm9kZSwgYXJndil7XHJcbiAgICB3aGlsZShub2RlKXtcclxuICAgICAgaWYobm9kZS5jbGFzc05hbWUpe1xyXG4gICAgICAgIGFyZ3YucHVzaChub2RlLmNsYXNzTmFtZSlcclxuICAgICAgfVxyXG4gICAgICBpZihub2RlLmlkKXtcclxuICAgICAgICBhcmd2LnB1c2gobm9kZS5pZClcclxuICAgICAgfVxyXG4gICAgICBub2RlID0gbm9kZS5wYXJlbnROb2RlXHJcbiAgICAgIGlmKG5vZGUuaXNFcXVhbE5vZGUocm9vdE5vZGUpKXtcclxuICAgICAgICBub2RlID0gbnVsbFxyXG4gICAgICB9XHJcbiAgICB9XHJcbiAgICByZXR1cm4gYXJndlxyXG4gIH1cclxuXHJcbiAgZnVuY3Rpb24gYWRkRXZlbnQobm9kZSl7XHJcbiAgICBub2RlQXR0cmlidXRlcyA9IG5vZGUuYXR0cmlidXRlc1xyXG5cclxuICAgIGlmKG5vZGUgJiYgbG9va1VwRXZ0Tm9kZShub2RlKSkge1xyXG4gICAgICAvLyBza2lwIGFkZGRpbmcgZXZlbnQgZm9yIG5vZGUgdGhhdCBhbHJlYWR5IGhhcyBldmVudFxyXG4gICAgICAvLyB0byBhbGxvdyBza2lwcGluZyBhZGRpbmcgZXZlbnQgdGhlIG5vZGUgbXVzdCBpbmNsdWRlIGBpZGAvXHJcbiAgICB9IGVsc2Uge1xyXG4gICAgICAvLyBvbmx5IGFkZCBldmVudCB3aGVuIG5vZGUgZG9lcyBub3QgaGFzIG9uZVxyXG4gICAgICBmb3IgKGkgPSBub2RlQXR0cmlidXRlcy5sZW5ndGg7IGktLTspIHtcclxuICAgICAgICBhID0gbm9kZUF0dHJpYnV0ZXNbaV1cclxuICAgICAgICBuYW1lID0gYS5sb2NhbE5hbWVcclxuICAgICAgICBucyA9IGEubm9kZVZhbHVlXHJcbiAgICAgICAgaWYgKC9eay0vLnRlc3QobmFtZSkpIHtcclxuICAgICAgICAgIGV2dE5hbWUgPSBuYW1lLnJlcGxhY2UoL15rLS8sICcnKVxyXG4gICAgICAgICAgaGFuZGxlciA9IG5zLm1hdGNoKC9bYS16QS1aXSsoPyFbXihdKlxcKSkvKVswXVxyXG4gICAgICAgICAgYyA9IGN0eFtoYW5kbGVyXVxyXG4gICAgICAgICAgaWYoYyAhPT0gdW5kZWZpbmVkICYmIHR5cGVvZiBjID09PSAnZnVuY3Rpb24nKXtcclxuICAgICAgICAgICAgaCA9IG5zLm1hdGNoKC9cXCgoW157fV0rKVxcKS8pXHJcbiAgICAgICAgICAgIGhhbmRsZXJBcmdzID0gaCA/IGhbMV0gOiAnJ1xyXG4gICAgICAgICAgICBhcmd2ID0gaGFuZGxlckFyZ3Muc3BsaXQoJywnKS5maWx0ZXIoZnVuY3Rpb24oZil7XHJcbiAgICAgICAgICAgICAgcmV0dXJuIGYgIT09ICcnXHJcbiAgICAgICAgICAgIH0pXHJcbiAgICAgICAgICAgIHJlbS5wdXNoKG5hbWUpXHJcbiAgICAgICAgICAgIGZuID0gZnVuY3Rpb24oZSl7XHJcbiAgICAgICAgICAgICAgaWYgKGUudGFyZ2V0ICE9PSBlLmN1cnJlbnRUYXJnZXQpIHtcclxuICAgICAgICAgICAgICAgIGFyZ3YgPSBsb29rdXBQYXJlbnROb2RlKG5vZGUsIGUudGFyZ2V0LCBbXSlcclxuICAgICAgICAgICAgICAgIGMuYXBwbHkoY3R4LCBhcmd2LmNvbmNhdChlKSlcclxuICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgZS5zdG9wUHJvcGFnYXRpb24oKVxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIC8vIGlmIG5vZGUgaXMgdGhlIHJvb3ROb2RlIGZvciBtb2RlbCwgd2Ugd3JhcCB0aGUgZXZlbnRMaXN0ZW5lciBhbmRcclxuICAgICAgICAgICAgLy8gcmVidWlsZCB0aGUgYXJndW1lbnRzIGJ5IGFwcGVuZGluZyBpZC9jbGFzc05hbWUgdXRpbCByb290Tm9kZS5cclxuICAgICAgICAgICAgaWYobm9kZS5oYXNDaGlsZE5vZGVzKCkgJiYgbm9kZS5maXJzdENoaWxkLm5vZGVUeXBlID09PSBET0NVTUVOVF9URVhUX1RZUEUgJiYgbm9kZS5maXJzdENoaWxkLm5vZGVWYWx1ZS5tYXRjaChtb2RlbFJhdykpe1xyXG4gICAgICAgICAgICAgIG5vZGUuYWRkRXZlbnRMaXN0ZW5lcihldnROYW1lLCBmbiwgZmFsc2UpXHJcbiAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgbm9kZS5hZGRFdmVudExpc3RlbmVyKGV2dE5hbWUsIGMuYmluZC5hcHBseShjLmJpbmQoY3R4KSwgW25vZGVdLmNvbmNhdChhcmd2KSksIGZhbHNlKVxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIGlmKG5vZGUuaWQpe1xyXG4gICAgICAgICAgICAgIHZhciBwID0gY3R4Ll9fcHJpc3RpbmVGcmFnbWVudF9fLmdldEVsZW1lbnRCeUlkKG5vZGUuaWQpXHJcbiAgICAgICAgICAgICAgaWYoIXAuaGFzQXR0cmlidXRlKCdldnQtbm9kZScpKXsgXHJcbiAgICAgICAgICAgICAgICBwLnNldEF0dHJpYnV0ZSgnZXZ0LW5vZGUnLCAnJylcclxuICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgIH1cclxuICAgICAgICB9XHJcbiAgICAgICAgaWYoaSA9PT0gMCl7XHJcbiAgICAgICAgICByZW0ubWFwKGZ1bmN0aW9uIChmKSB7IG5vZGUucmVtb3ZlQXR0cmlidXRlKGYpIH0pXHJcbiAgICAgICAgfVxyXG4gICAgICB9XHJcbiAgICB9IFxyXG4gIH1cclxuXHJcbiAgZnVuY3Rpb24gY2hlY2sobm9kZSl7XHJcbiAgICB3aGlsZShub2RlKXtcclxuICAgICAgY3VycmVudE5vZGUgPSBub2RlXHJcbiAgICAgIGlmKGN1cnJlbnROb2RlLm5vZGVUeXBlID09PSBET0NVTUVOVF9FTEVNRU5UX1RZUEUpe1xyXG4gICAgICAgIGlmKGN1cnJlbnROb2RlLmhhc0F0dHJpYnV0ZXMoKSl7XHJcbiAgICAgICAgICBhZGRFdmVudChjdXJyZW50Tm9kZSlcclxuICAgICAgICAgIGluc3BlY3RBdHRyaWJ1dGVzKGN1cnJlbnROb2RlKVxyXG4gICAgICAgIH1cclxuICAgICAgICBjaGVjayhjdXJyZW50Tm9kZS5maXJzdENoaWxkKVxyXG4gICAgICB9IGVsc2Uge1xyXG4gICAgICAgIGluc3BlY3QoY3VycmVudE5vZGUpXHJcbiAgICAgIH1cclxuICAgICAgbm9kZSA9IG5vZGUubmV4dFNpYmxpbmdcclxuICAgIH0gXHJcbiAgfVxyXG5cclxuICBjaGVjayhpbnN0YW5jZSlcclxuXHJcbn1cclxuXHJcbm1vZHVsZS5leHBvcnRzID0gdG1wbGhhbmRsZXJcclxuIiwiJ3VzZSBzdHJpY3QnXHJcbi8qKlxyXG4gKiBLZWV0anMgdjQuMC4wIEFscGhhIHJlbGVhc2U6IGh0dHBzOi8vZ2l0aHViLmNvbS9rZWV0anMva2VldC5qc1xyXG4gKiBNaW5pbWFsaXN0IHZpZXcgbGF5ZXIgZm9yIHRoZSB3ZWJcclxuICpcclxuICogPDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8IEtlZXRqcyA+Pj4+Pj4+Pj4+Pj4+Pj4+Pj4+Pj4+Pj4+Pj4+Pj5cclxuICpcclxuICogQ29weXJpZ2h0IDIwMTgsIFNoYWhydWwgTml6YW0gU2VsYW1hdFxyXG4gKiBSZWxlYXNlZCB1bmRlciB0aGUgTUlUIExpY2Vuc2UuXHJcbiAqL1xyXG5cclxudmFyIHBhcnNlU3RyID0gcmVxdWlyZSgnLi9jb21wb25lbnRzL3BhcnNlU3RyJylcclxudmFyIGdlbkVsZW1lbnQgPSByZXF1aXJlKCcuL2NvbXBvbmVudHMvZ2VuRWxlbWVudCcpLmdlbkVsZW1lbnRcclxudmFyIGNsZWFyU3RhdGUgPSByZXF1aXJlKCcuL2NvbXBvbmVudHMvZ2VuRWxlbWVudCcpLmNsZWFyU3RhdGVcclxudmFyIGdldElkID0gcmVxdWlyZSgnLi91dGlscycpLmdldElkXHJcbnZhciBhc3NlcnQgPSByZXF1aXJlKCcuL3V0aWxzJykuYXNzZXJ0XHJcblxyXG52YXIgRE9DVU1FTlRfRlJBR01FTlRfVFlQRSA9IDExXHJcbnZhciBET0NVTUVOVF9URVhUX1RZUEUgPSAzXHJcbnZhciBET0NVTUVOVF9FTEVNRU5UX1RZUEUgPSAxXHJcbi8vIHZhciBET0NVTUVOVF9DT01NRU5UX1RZUEUgPSA4XHJcbi8vIHZhciBET0NVTUVOVF9BVFRSSUJVVEVfVFlQRSA9IDJcclxuXHJcbi8qKlxyXG4gKiBAZGVzY3JpcHRpb25cclxuICogVGhlIG1haW4gY29uc3RydWN0b3Igb2YgS2VldFxyXG4gKlxyXG4gKiBCYXNpYyBVc2FnZSA6LVxyXG4gKlxyXG4gKiAgICBjb25zdCBBcHAgZXh0ZW5kcyBLZWV0IHt9XHJcbiAqICAgIGNvbnN0IGFwcCA9IG5ldyBBcHAoKVxyXG4gKiAgICBhcHAubW91bnQoJ2hlbGxvIHdvcmxkJykubGluaygnYXBwJylcclxuICpcclxuICovXHJcbmZ1bmN0aW9uIEtlZXQgKCkge31cclxuXHJcbktlZXQucHJvdG90eXBlLm1vdW50ID0gZnVuY3Rpb24gKGluc3RhbmNlKSB7XHJcbiAgdmFyIGJhc2VcclxuICB2YXIgdGVtcERpdlxyXG4gIHZhciBmcmFnID0gZG9jdW1lbnQuY3JlYXRlRG9jdW1lbnRGcmFnbWVudCgpXHJcbiAgLy8gQmVmb3JlIHdlIGJlZ2luIHRvIHBhcnNlIGFuIGluc3RhbmNlLCBkbyBhIHJ1bi1kb3duIGNoZWNrc1xyXG4gIC8vIHRvIGNsZWFuIHVwIGJhY2stdGljayBzdHJpbmcgd2hpY2ggdXN1YWxseSBoYXMgbGluZSBzcGFjaW5nLlxyXG4gIGlmICh0eXBlb2YgaW5zdGFuY2UgPT09ICdzdHJpbmcnKSB7XHJcbiAgICBiYXNlID0gaW5zdGFuY2UudHJpbSgpLnJlcGxhY2UoL1xccysvZywgJyAnKVxyXG4gICAgdGVtcERpdiA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2RpdicpXHJcbiAgICB0ZW1wRGl2LmlubmVySFRNTCA9IGJhc2VcclxuICAgIHdoaWxlICh0ZW1wRGl2LmZpcnN0Q2hpbGQpIHtcclxuICAgICAgZnJhZy5hcHBlbmRDaGlsZCh0ZW1wRGl2LmZpcnN0Q2hpbGQpXHJcbiAgICB9XHJcbiAgLy8gSWYgaW5zdGFuY2UgaXMgYSBodG1sIGVsZW1lbnQgcHJvY2VzcyBhcyBodG1sIGVudGl0aWVzXHJcbiAgfSBlbHNlIGlmICh0eXBlb2YgaW5zdGFuY2UgPT09ICdvYmplY3QnICYmIGluc3RhbmNlWydub2RlVHlwZSddKSB7XHJcbiAgICBpZiAoaW5zdGFuY2VbJ25vZGVUeXBlJ10gPT09IERPQ1VNRU5UX0VMRU1FTlRfVFlQRSkge1xyXG4gICAgICBmcmFnLmFwcGVuZENoaWxkKGluc3RhbmNlKVxyXG4gICAgfSBlbHNlIGlmIChpbnN0YW5jZVsnbm9kZVR5cGUnXSA9PT0gRE9DVU1FTlRfRlJBR01FTlRfVFlQRSkge1xyXG4gICAgICBmcmFnID0gaW5zdGFuY2VcclxuICAgIH0gZWxzZSBpZiAoaW5zdGFuY2VbJ25vZGVUeXBlJ10gPT09IERPQ1VNRU5UX1RFWFRfVFlQRSkge1xyXG4gICAgICBmcmFnLmFwcGVuZENoaWxkKGluc3RhbmNlKVxyXG4gICAgfSBlbHNlIHtcclxuICAgICAgYXNzZXJ0KGZhbHNlLCAnVW5hYmxlIHRvIHBhcnNlIGluc3RhbmNlLCB1bmtub3duIHR5cGUuJylcclxuICAgIH1cclxuICB9IGVsc2Uge1xyXG4gICAgYXNzZXJ0KGZhbHNlLCAnUGFyYW1ldGVyIGlzIG5vdCBhIHN0cmluZyBvciBhIGh0bWwgZWxlbWVudC4nKVxyXG4gIH1cclxuICAvLyB3ZSBzdG9yZSB0aGUgcHJpc3RpbmUgaW5zdGFuY2UgaW4gX19wcmlzdGluZUZyYWdtZW50X19cclxuICB0aGlzLl9fcHJpc3RpbmVGcmFnbWVudF9fID0gZnJhZy5jbG9uZU5vZGUodHJ1ZSlcclxuICB0aGlzLmJhc2UgPSBmcmFnXHJcblxyXG4gIC8vIGNsZWFudXAgc3RhdGVzIG9uIG1vdW50XHJcbiAgY2xlYXJTdGF0ZSgpXHJcblxyXG4gIHJldHVybiB0aGlzXHJcbn1cclxuXHJcbktlZXQucHJvdG90eXBlLmZsdXNoID0gZnVuY3Rpb24gKGluc3RhbmNlKSB7XHJcbiAgLy8gQ3VzdG9tIG1ldGhvZCB0byBjbGVhbiB1cCB0aGUgY29tcG9uZW50IERPTSB0cmVlXHJcbiAgLy8gdXNlZnVsIGlmIHdlIG5lZWQgdG8gZG8gY2xlYW4gdXAgcmVyZW5kZXIuXHJcbiAgdmFyIGVsID0gaW5zdGFuY2UgfHwgdGhpcy5lbFxyXG4gIHZhciBlbGUgPSBnZXRJZChlbClcclxuICBpZiAoZWxlKSBlbGUuaW5uZXJIVE1MID0gJydcclxuICByZXR1cm4gdGhpc1xyXG59XHJcblxyXG5LZWV0LnByb3RvdHlwZS5saW5rID0gZnVuY3Rpb24gKGlkKSB7XHJcbiAgLy8gVGhlIHRhcmdldCBET00gd2hlcmUgdGhlIHJlbmRlcmluZyB3aWxsIHRvb2sgcGxhY2UuXHJcbiAgLy8gV2UgY291bGQgYWxzbyBhcHBseSBsaWZlLWN5Y2xlIG1ldGhvZCBiZWZvcmUgdGhlXHJcbiAgLy8gcmVuZGVyIGhhcHBlbi5cclxuICBpZiAoIWlkKSBhc3NlcnQoaWQsICdObyBpZCBpcyBnaXZlbiBhcyBwYXJhbWV0ZXIuJylcclxuICB0aGlzLmVsID0gaWRcclxuICAvLyBsaWZlLWN5Y2xlIG1ldGhvZCBiZWZvcmUgcmVuZGVyaW5nIHRoZSBjb21wb25lbnRcclxuICBpZiAodGhpcy5jb21wb25lbnRXaWxsTW91bnQgJiYgdHlwZW9mIHRoaXMuY29tcG9uZW50V2lsbE1vdW50ID09PSAnZnVuY3Rpb24nKSB7XHJcbiAgICB0aGlzLmNvbXBvbmVudFdpbGxNb3VudCgpXHJcbiAgfVxyXG4gIHRoaXMucmVuZGVyKClcclxuICByZXR1cm4gdGhpc1xyXG59XHJcblxyXG5LZWV0LnByb3RvdHlwZS5yZW5kZXIgPSBmdW5jdGlvbiAoc3R1Yikge1xyXG4gIC8vIFJlbmRlciB0aGlzIGNvbXBvbmVudCB0byB0aGUgdGFyZ2V0IERPTVxyXG4gIHBhcnNlU3RyLmNhbGwodGhpcywgc3R1YilcclxuICByZXR1cm4gdGhpc1xyXG59XHJcblxyXG5LZWV0LnByb3RvdHlwZS5jbHVzdGVyID0gZnVuY3Rpb24gKCkge1xyXG4gIC8vIENoYWluIG1ldGhvZCB0byBydW4gZXh0ZXJuYWwgZnVuY3Rpb24ocyksIHRoaXMgYmFzaWNhbGx5IHNlcnZlXHJcbiAgLy8gYXMgYW4gaW5pdGlhbGl6ZXIgZm9yIGFsbCBub24gYXR0YWNoZWQgY2hpbGQgY29tcG9uZW50cyB3aXRoaW4gdGhlIGluc3RhbmNlIHRyZWVcclxuICB2YXIgYXJncyA9IFtdLnNsaWNlLmNhbGwoYXJndW1lbnRzKVxyXG4gIGlmIChhcmdzLmxlbmd0aCA+IDApIHtcclxuICAgIGFyZ3MubWFwKGZ1bmN0aW9uIChmKSB7XHJcbiAgICAgIGlmICh0eXBlb2YgZiA9PT0gJ2Z1bmN0aW9uJykgZigpXHJcbiAgICB9KVxyXG4gIH1cclxufVxyXG5cclxudmFyIEJBVENIX0NBTExfUkVRVUVTVCA9IG51bGxcclxuXHJcbktlZXQucHJvdG90eXBlLmNhbGxCYXRjaFBvb2xVcGRhdGUgPSBmdW5jdGlvbiAoKSB7XHJcbiAgLy8gZm9yY2UgY29tcG9uZW50IHRvIHVwZGF0ZSwgaWYgYW55IHN0YXRlIC8gbm9uLXN0YXRlXHJcbiAgLy8gdmFsdWUgY2hhbmdlZCBET00gZGlmZmluZyB3aWxsIG9jY3VyXHJcbiAgdmFyIHNlbGYgPSB0aGlzXHJcbiAgaWYoQkFUQ0hfQ0FMTF9SRVFVRVNUKXtcclxuICAgIGNsZWFyVGltZW91dChCQVRDSF9DQUxMX1JFUVVFU1QpXHJcbiAgfSBcclxuICBCQVRDSF9DQUxMX1JFUVVFU1QgPSBzZXRUaW1lb3V0KGZ1bmN0aW9uKCl7XHJcbiAgICBnZW5FbGVtZW50LmNhbGwoc2VsZiwgdHJ1ZSlcclxuICB9KVxyXG59XHJcblxyXG5tb2R1bGUuZXhwb3J0cyA9IEtlZXRcclxuIiwiJ3VzZSBzdHJpY3QnO1xuXG52YXIgcmFuZ2U7IC8vIENyZWF0ZSBhIHJhbmdlIG9iamVjdCBmb3IgZWZmaWNlbnRseSByZW5kZXJpbmcgc3RyaW5ncyB0byBlbGVtZW50cy5cbnZhciBOU19YSFRNTCA9ICdodHRwOi8vd3d3LnczLm9yZy8xOTk5L3hodG1sJztcblxudmFyIGRvYyA9IHR5cGVvZiBkb2N1bWVudCA9PT0gJ3VuZGVmaW5lZCcgPyB1bmRlZmluZWQgOiBkb2N1bWVudDtcblxudmFyIHRlc3RFbCA9IGRvYyA/XG4gICAgZG9jLmJvZHkgfHwgZG9jLmNyZWF0ZUVsZW1lbnQoJ2RpdicpIDpcbiAgICB7fTtcblxuLy8gRml4ZXMgPGh0dHBzOi8vZ2l0aHViLmNvbS9wYXRyaWNrLXN0ZWVsZS1pZGVtL21vcnBoZG9tL2lzc3Vlcy8zMj5cbi8vIChJRTcrIHN1cHBvcnQpIDw9SUU3IGRvZXMgbm90IHN1cHBvcnQgZWwuaGFzQXR0cmlidXRlKG5hbWUpXG52YXIgYWN0dWFsSGFzQXR0cmlidXRlTlM7XG5cbmlmICh0ZXN0RWwuaGFzQXR0cmlidXRlTlMpIHtcbiAgICBhY3R1YWxIYXNBdHRyaWJ1dGVOUyA9IGZ1bmN0aW9uKGVsLCBuYW1lc3BhY2VVUkksIG5hbWUpIHtcbiAgICAgICAgcmV0dXJuIGVsLmhhc0F0dHJpYnV0ZU5TKG5hbWVzcGFjZVVSSSwgbmFtZSk7XG4gICAgfTtcbn0gZWxzZSBpZiAodGVzdEVsLmhhc0F0dHJpYnV0ZSkge1xuICAgIGFjdHVhbEhhc0F0dHJpYnV0ZU5TID0gZnVuY3Rpb24oZWwsIG5hbWVzcGFjZVVSSSwgbmFtZSkge1xuICAgICAgICByZXR1cm4gZWwuaGFzQXR0cmlidXRlKG5hbWUpO1xuICAgIH07XG59IGVsc2Uge1xuICAgIGFjdHVhbEhhc0F0dHJpYnV0ZU5TID0gZnVuY3Rpb24oZWwsIG5hbWVzcGFjZVVSSSwgbmFtZSkge1xuICAgICAgICByZXR1cm4gZWwuZ2V0QXR0cmlidXRlTm9kZShuYW1lc3BhY2VVUkksIG5hbWUpICE9IG51bGw7XG4gICAgfTtcbn1cblxudmFyIGhhc0F0dHJpYnV0ZU5TID0gYWN0dWFsSGFzQXR0cmlidXRlTlM7XG5cblxuZnVuY3Rpb24gdG9FbGVtZW50KHN0cikge1xuICAgIGlmICghcmFuZ2UgJiYgZG9jLmNyZWF0ZVJhbmdlKSB7XG4gICAgICAgIHJhbmdlID0gZG9jLmNyZWF0ZVJhbmdlKCk7XG4gICAgICAgIHJhbmdlLnNlbGVjdE5vZGUoZG9jLmJvZHkpO1xuICAgIH1cblxuICAgIHZhciBmcmFnbWVudDtcbiAgICBpZiAocmFuZ2UgJiYgcmFuZ2UuY3JlYXRlQ29udGV4dHVhbEZyYWdtZW50KSB7XG4gICAgICAgIGZyYWdtZW50ID0gcmFuZ2UuY3JlYXRlQ29udGV4dHVhbEZyYWdtZW50KHN0cik7XG4gICAgfSBlbHNlIHtcbiAgICAgICAgZnJhZ21lbnQgPSBkb2MuY3JlYXRlRWxlbWVudCgnYm9keScpO1xuICAgICAgICBmcmFnbWVudC5pbm5lckhUTUwgPSBzdHI7XG4gICAgfVxuICAgIHJldHVybiBmcmFnbWVudC5jaGlsZE5vZGVzWzBdO1xufVxuXG4vKipcbiAqIFJldHVybnMgdHJ1ZSBpZiB0d28gbm9kZSdzIG5hbWVzIGFyZSB0aGUgc2FtZS5cbiAqXG4gKiBOT1RFOiBXZSBkb24ndCBib3RoZXIgY2hlY2tpbmcgYG5hbWVzcGFjZVVSSWAgYmVjYXVzZSB5b3Ugd2lsbCBuZXZlciBmaW5kIHR3byBIVE1MIGVsZW1lbnRzIHdpdGggdGhlIHNhbWVcbiAqICAgICAgIG5vZGVOYW1lIGFuZCBkaWZmZXJlbnQgbmFtZXNwYWNlIFVSSXMuXG4gKlxuICogQHBhcmFtIHtFbGVtZW50fSBhXG4gKiBAcGFyYW0ge0VsZW1lbnR9IGIgVGhlIHRhcmdldCBlbGVtZW50XG4gKiBAcmV0dXJuIHtib29sZWFufVxuICovXG5mdW5jdGlvbiBjb21wYXJlTm9kZU5hbWVzKGZyb21FbCwgdG9FbCkge1xuICAgIHZhciBmcm9tTm9kZU5hbWUgPSBmcm9tRWwubm9kZU5hbWU7XG4gICAgdmFyIHRvTm9kZU5hbWUgPSB0b0VsLm5vZGVOYW1lO1xuXG4gICAgaWYgKGZyb21Ob2RlTmFtZSA9PT0gdG9Ob2RlTmFtZSkge1xuICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9XG5cbiAgICBpZiAodG9FbC5hY3R1YWxpemUgJiZcbiAgICAgICAgZnJvbU5vZGVOYW1lLmNoYXJDb2RlQXQoMCkgPCA5MSAmJiAvKiBmcm9tIHRhZyBuYW1lIGlzIHVwcGVyIGNhc2UgKi9cbiAgICAgICAgdG9Ob2RlTmFtZS5jaGFyQ29kZUF0KDApID4gOTAgLyogdGFyZ2V0IHRhZyBuYW1lIGlzIGxvd2VyIGNhc2UgKi8pIHtcbiAgICAgICAgLy8gSWYgdGhlIHRhcmdldCBlbGVtZW50IGlzIGEgdmlydHVhbCBET00gbm9kZSB0aGVuIHdlIG1heSBuZWVkIHRvIG5vcm1hbGl6ZSB0aGUgdGFnIG5hbWVcbiAgICAgICAgLy8gYmVmb3JlIGNvbXBhcmluZy4gTm9ybWFsIEhUTUwgZWxlbWVudHMgdGhhdCBhcmUgaW4gdGhlIFwiaHR0cDovL3d3dy53My5vcmcvMTk5OS94aHRtbFwiXG4gICAgICAgIC8vIGFyZSBjb252ZXJ0ZWQgdG8gdXBwZXIgY2FzZVxuICAgICAgICByZXR1cm4gZnJvbU5vZGVOYW1lID09PSB0b05vZGVOYW1lLnRvVXBwZXJDYXNlKCk7XG4gICAgfSBlbHNlIHtcbiAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cbn1cblxuLyoqXG4gKiBDcmVhdGUgYW4gZWxlbWVudCwgb3B0aW9uYWxseSB3aXRoIGEga25vd24gbmFtZXNwYWNlIFVSSS5cbiAqXG4gKiBAcGFyYW0ge3N0cmluZ30gbmFtZSB0aGUgZWxlbWVudCBuYW1lLCBlLmcuICdkaXYnIG9yICdzdmcnXG4gKiBAcGFyYW0ge3N0cmluZ30gW25hbWVzcGFjZVVSSV0gdGhlIGVsZW1lbnQncyBuYW1lc3BhY2UgVVJJLCBpLmUuIHRoZSB2YWx1ZSBvZlxuICogaXRzIGB4bWxuc2AgYXR0cmlidXRlIG9yIGl0cyBpbmZlcnJlZCBuYW1lc3BhY2UuXG4gKlxuICogQHJldHVybiB7RWxlbWVudH1cbiAqL1xuZnVuY3Rpb24gY3JlYXRlRWxlbWVudE5TKG5hbWUsIG5hbWVzcGFjZVVSSSkge1xuICAgIHJldHVybiAhbmFtZXNwYWNlVVJJIHx8IG5hbWVzcGFjZVVSSSA9PT0gTlNfWEhUTUwgP1xuICAgICAgICBkb2MuY3JlYXRlRWxlbWVudChuYW1lKSA6XG4gICAgICAgIGRvYy5jcmVhdGVFbGVtZW50TlMobmFtZXNwYWNlVVJJLCBuYW1lKTtcbn1cblxuLyoqXG4gKiBDb3BpZXMgdGhlIGNoaWxkcmVuIG9mIG9uZSBET00gZWxlbWVudCB0byBhbm90aGVyIERPTSBlbGVtZW50XG4gKi9cbmZ1bmN0aW9uIG1vdmVDaGlsZHJlbihmcm9tRWwsIHRvRWwpIHtcbiAgICB2YXIgY3VyQ2hpbGQgPSBmcm9tRWwuZmlyc3RDaGlsZDtcbiAgICB3aGlsZSAoY3VyQ2hpbGQpIHtcbiAgICAgICAgdmFyIG5leHRDaGlsZCA9IGN1ckNoaWxkLm5leHRTaWJsaW5nO1xuICAgICAgICB0b0VsLmFwcGVuZENoaWxkKGN1ckNoaWxkKTtcbiAgICAgICAgY3VyQ2hpbGQgPSBuZXh0Q2hpbGQ7XG4gICAgfVxuICAgIHJldHVybiB0b0VsO1xufVxuXG5mdW5jdGlvbiBtb3JwaEF0dHJzKGZyb21Ob2RlLCB0b05vZGUpIHtcbiAgICB2YXIgYXR0cnMgPSB0b05vZGUuYXR0cmlidXRlcztcbiAgICB2YXIgaTtcbiAgICB2YXIgYXR0cjtcbiAgICB2YXIgYXR0ck5hbWU7XG4gICAgdmFyIGF0dHJOYW1lc3BhY2VVUkk7XG4gICAgdmFyIGF0dHJWYWx1ZTtcbiAgICB2YXIgZnJvbVZhbHVlO1xuXG4gICAgZm9yIChpID0gYXR0cnMubGVuZ3RoIC0gMTsgaSA+PSAwOyAtLWkpIHtcbiAgICAgICAgYXR0ciA9IGF0dHJzW2ldO1xuICAgICAgICBhdHRyTmFtZSA9IGF0dHIubmFtZTtcbiAgICAgICAgYXR0ck5hbWVzcGFjZVVSSSA9IGF0dHIubmFtZXNwYWNlVVJJO1xuICAgICAgICBhdHRyVmFsdWUgPSBhdHRyLnZhbHVlO1xuXG4gICAgICAgIGlmIChhdHRyTmFtZXNwYWNlVVJJKSB7XG4gICAgICAgICAgICBhdHRyTmFtZSA9IGF0dHIubG9jYWxOYW1lIHx8IGF0dHJOYW1lO1xuICAgICAgICAgICAgZnJvbVZhbHVlID0gZnJvbU5vZGUuZ2V0QXR0cmlidXRlTlMoYXR0ck5hbWVzcGFjZVVSSSwgYXR0ck5hbWUpO1xuXG4gICAgICAgICAgICBpZiAoZnJvbVZhbHVlICE9PSBhdHRyVmFsdWUpIHtcbiAgICAgICAgICAgICAgICBmcm9tTm9kZS5zZXRBdHRyaWJ1dGVOUyhhdHRyTmFtZXNwYWNlVVJJLCBhdHRyTmFtZSwgYXR0clZhbHVlKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGZyb21WYWx1ZSA9IGZyb21Ob2RlLmdldEF0dHJpYnV0ZShhdHRyTmFtZSk7XG5cbiAgICAgICAgICAgIGlmIChmcm9tVmFsdWUgIT09IGF0dHJWYWx1ZSkge1xuICAgICAgICAgICAgICAgIGZyb21Ob2RlLnNldEF0dHJpYnV0ZShhdHRyTmFtZSwgYXR0clZhbHVlKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH1cblxuICAgIC8vIFJlbW92ZSBhbnkgZXh0cmEgYXR0cmlidXRlcyBmb3VuZCBvbiB0aGUgb3JpZ2luYWwgRE9NIGVsZW1lbnQgdGhhdFxuICAgIC8vIHdlcmVuJ3QgZm91bmQgb24gdGhlIHRhcmdldCBlbGVtZW50LlxuICAgIGF0dHJzID0gZnJvbU5vZGUuYXR0cmlidXRlcztcblxuICAgIGZvciAoaSA9IGF0dHJzLmxlbmd0aCAtIDE7IGkgPj0gMDsgLS1pKSB7XG4gICAgICAgIGF0dHIgPSBhdHRyc1tpXTtcbiAgICAgICAgaWYgKGF0dHIuc3BlY2lmaWVkICE9PSBmYWxzZSkge1xuICAgICAgICAgICAgYXR0ck5hbWUgPSBhdHRyLm5hbWU7XG4gICAgICAgICAgICBhdHRyTmFtZXNwYWNlVVJJID0gYXR0ci5uYW1lc3BhY2VVUkk7XG5cbiAgICAgICAgICAgIGlmIChhdHRyTmFtZXNwYWNlVVJJKSB7XG4gICAgICAgICAgICAgICAgYXR0ck5hbWUgPSBhdHRyLmxvY2FsTmFtZSB8fCBhdHRyTmFtZTtcblxuICAgICAgICAgICAgICAgIGlmICghaGFzQXR0cmlidXRlTlModG9Ob2RlLCBhdHRyTmFtZXNwYWNlVVJJLCBhdHRyTmFtZSkpIHtcbiAgICAgICAgICAgICAgICAgICAgZnJvbU5vZGUucmVtb3ZlQXR0cmlidXRlTlMoYXR0ck5hbWVzcGFjZVVSSSwgYXR0ck5hbWUpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgaWYgKCFoYXNBdHRyaWJ1dGVOUyh0b05vZGUsIG51bGwsIGF0dHJOYW1lKSkge1xuICAgICAgICAgICAgICAgICAgICBmcm9tTm9kZS5yZW1vdmVBdHRyaWJ1dGUoYXR0ck5hbWUpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH1cbn1cblxuZnVuY3Rpb24gc3luY0Jvb2xlYW5BdHRyUHJvcChmcm9tRWwsIHRvRWwsIG5hbWUpIHtcbiAgICBpZiAoZnJvbUVsW25hbWVdICE9PSB0b0VsW25hbWVdKSB7XG4gICAgICAgIGZyb21FbFtuYW1lXSA9IHRvRWxbbmFtZV07XG4gICAgICAgIGlmIChmcm9tRWxbbmFtZV0pIHtcbiAgICAgICAgICAgIGZyb21FbC5zZXRBdHRyaWJ1dGUobmFtZSwgJycpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgZnJvbUVsLnJlbW92ZUF0dHJpYnV0ZShuYW1lLCAnJyk7XG4gICAgICAgIH1cbiAgICB9XG59XG5cbnZhciBzcGVjaWFsRWxIYW5kbGVycyA9IHtcbiAgICAvKipcbiAgICAgKiBOZWVkZWQgZm9yIElFLiBBcHBhcmVudGx5IElFIGRvZXNuJ3QgdGhpbmsgdGhhdCBcInNlbGVjdGVkXCIgaXMgYW5cbiAgICAgKiBhdHRyaWJ1dGUgd2hlbiByZWFkaW5nIG92ZXIgdGhlIGF0dHJpYnV0ZXMgdXNpbmcgc2VsZWN0RWwuYXR0cmlidXRlc1xuICAgICAqL1xuICAgIE9QVElPTjogZnVuY3Rpb24oZnJvbUVsLCB0b0VsKSB7XG4gICAgICAgIHN5bmNCb29sZWFuQXR0clByb3AoZnJvbUVsLCB0b0VsLCAnc2VsZWN0ZWQnKTtcbiAgICB9LFxuICAgIC8qKlxuICAgICAqIFRoZSBcInZhbHVlXCIgYXR0cmlidXRlIGlzIHNwZWNpYWwgZm9yIHRoZSA8aW5wdXQ+IGVsZW1lbnQgc2luY2UgaXQgc2V0c1xuICAgICAqIHRoZSBpbml0aWFsIHZhbHVlLiBDaGFuZ2luZyB0aGUgXCJ2YWx1ZVwiIGF0dHJpYnV0ZSB3aXRob3V0IGNoYW5naW5nIHRoZVxuICAgICAqIFwidmFsdWVcIiBwcm9wZXJ0eSB3aWxsIGhhdmUgbm8gZWZmZWN0IHNpbmNlIGl0IGlzIG9ubHkgdXNlZCB0byB0aGUgc2V0IHRoZVxuICAgICAqIGluaXRpYWwgdmFsdWUuICBTaW1pbGFyIGZvciB0aGUgXCJjaGVja2VkXCIgYXR0cmlidXRlLCBhbmQgXCJkaXNhYmxlZFwiLlxuICAgICAqL1xuICAgIElOUFVUOiBmdW5jdGlvbihmcm9tRWwsIHRvRWwpIHtcbiAgICAgICAgc3luY0Jvb2xlYW5BdHRyUHJvcChmcm9tRWwsIHRvRWwsICdjaGVja2VkJyk7XG4gICAgICAgIHN5bmNCb29sZWFuQXR0clByb3AoZnJvbUVsLCB0b0VsLCAnZGlzYWJsZWQnKTtcblxuICAgICAgICBpZiAoZnJvbUVsLnZhbHVlICE9PSB0b0VsLnZhbHVlKSB7XG4gICAgICAgICAgICBmcm9tRWwudmFsdWUgPSB0b0VsLnZhbHVlO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKCFoYXNBdHRyaWJ1dGVOUyh0b0VsLCBudWxsLCAndmFsdWUnKSkge1xuICAgICAgICAgICAgZnJvbUVsLnJlbW92ZUF0dHJpYnV0ZSgndmFsdWUnKTtcbiAgICAgICAgfVxuICAgIH0sXG5cbiAgICBURVhUQVJFQTogZnVuY3Rpb24oZnJvbUVsLCB0b0VsKSB7XG4gICAgICAgIHZhciBuZXdWYWx1ZSA9IHRvRWwudmFsdWU7XG4gICAgICAgIGlmIChmcm9tRWwudmFsdWUgIT09IG5ld1ZhbHVlKSB7XG4gICAgICAgICAgICBmcm9tRWwudmFsdWUgPSBuZXdWYWx1ZTtcbiAgICAgICAgfVxuXG4gICAgICAgIHZhciBmaXJzdENoaWxkID0gZnJvbUVsLmZpcnN0Q2hpbGQ7XG4gICAgICAgIGlmIChmaXJzdENoaWxkKSB7XG4gICAgICAgICAgICAvLyBOZWVkZWQgZm9yIElFLiBBcHBhcmVudGx5IElFIHNldHMgdGhlIHBsYWNlaG9sZGVyIGFzIHRoZVxuICAgICAgICAgICAgLy8gbm9kZSB2YWx1ZSBhbmQgdmlzZSB2ZXJzYS4gVGhpcyBpZ25vcmVzIGFuIGVtcHR5IHVwZGF0ZS5cbiAgICAgICAgICAgIHZhciBvbGRWYWx1ZSA9IGZpcnN0Q2hpbGQubm9kZVZhbHVlO1xuXG4gICAgICAgICAgICBpZiAob2xkVmFsdWUgPT0gbmV3VmFsdWUgfHwgKCFuZXdWYWx1ZSAmJiBvbGRWYWx1ZSA9PSBmcm9tRWwucGxhY2Vob2xkZXIpKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBmaXJzdENoaWxkLm5vZGVWYWx1ZSA9IG5ld1ZhbHVlO1xuICAgICAgICB9XG4gICAgfSxcbiAgICBTRUxFQ1Q6IGZ1bmN0aW9uKGZyb21FbCwgdG9FbCkge1xuICAgICAgICBpZiAoIWhhc0F0dHJpYnV0ZU5TKHRvRWwsIG51bGwsICdtdWx0aXBsZScpKSB7XG4gICAgICAgICAgICB2YXIgc2VsZWN0ZWRJbmRleCA9IC0xO1xuICAgICAgICAgICAgdmFyIGkgPSAwO1xuICAgICAgICAgICAgdmFyIGN1ckNoaWxkID0gdG9FbC5maXJzdENoaWxkO1xuICAgICAgICAgICAgd2hpbGUoY3VyQ2hpbGQpIHtcbiAgICAgICAgICAgICAgICB2YXIgbm9kZU5hbWUgPSBjdXJDaGlsZC5ub2RlTmFtZTtcbiAgICAgICAgICAgICAgICBpZiAobm9kZU5hbWUgJiYgbm9kZU5hbWUudG9VcHBlckNhc2UoKSA9PT0gJ09QVElPTicpIHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKGhhc0F0dHJpYnV0ZU5TKGN1ckNoaWxkLCBudWxsLCAnc2VsZWN0ZWQnKSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgc2VsZWN0ZWRJbmRleCA9IGk7XG4gICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICBpKys7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGN1ckNoaWxkID0gY3VyQ2hpbGQubmV4dFNpYmxpbmc7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGZyb21FbC5zZWxlY3RlZEluZGV4ID0gaTtcbiAgICAgICAgfVxuICAgIH1cbn07XG5cbnZhciBFTEVNRU5UX05PREUgPSAxO1xudmFyIFRFWFRfTk9ERSA9IDM7XG52YXIgQ09NTUVOVF9OT0RFID0gODtcblxuZnVuY3Rpb24gbm9vcCgpIHt9XG5cbmZ1bmN0aW9uIGRlZmF1bHRHZXROb2RlS2V5KG5vZGUpIHtcbiAgICByZXR1cm4gbm9kZS5pZDtcbn1cblxuZnVuY3Rpb24gbW9ycGhkb21GYWN0b3J5KG1vcnBoQXR0cnMpIHtcblxuICAgIHJldHVybiBmdW5jdGlvbiBtb3JwaGRvbShmcm9tTm9kZSwgdG9Ob2RlLCBvcHRpb25zKSB7XG4gICAgICAgIGlmICghb3B0aW9ucykge1xuICAgICAgICAgICAgb3B0aW9ucyA9IHt9O1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKHR5cGVvZiB0b05vZGUgPT09ICdzdHJpbmcnKSB7XG4gICAgICAgICAgICBpZiAoZnJvbU5vZGUubm9kZU5hbWUgPT09ICcjZG9jdW1lbnQnIHx8IGZyb21Ob2RlLm5vZGVOYW1lID09PSAnSFRNTCcpIHtcbiAgICAgICAgICAgICAgICB2YXIgdG9Ob2RlSHRtbCA9IHRvTm9kZTtcbiAgICAgICAgICAgICAgICB0b05vZGUgPSBkb2MuY3JlYXRlRWxlbWVudCgnaHRtbCcpO1xuICAgICAgICAgICAgICAgIHRvTm9kZS5pbm5lckhUTUwgPSB0b05vZGVIdG1sO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICB0b05vZGUgPSB0b0VsZW1lbnQodG9Ob2RlKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIHZhciBnZXROb2RlS2V5ID0gb3B0aW9ucy5nZXROb2RlS2V5IHx8IGRlZmF1bHRHZXROb2RlS2V5O1xuICAgICAgICB2YXIgb25CZWZvcmVOb2RlQWRkZWQgPSBvcHRpb25zLm9uQmVmb3JlTm9kZUFkZGVkIHx8IG5vb3A7XG4gICAgICAgIHZhciBvbk5vZGVBZGRlZCA9IG9wdGlvbnMub25Ob2RlQWRkZWQgfHwgbm9vcDtcbiAgICAgICAgdmFyIG9uQmVmb3JlRWxVcGRhdGVkID0gb3B0aW9ucy5vbkJlZm9yZUVsVXBkYXRlZCB8fCBub29wO1xuICAgICAgICB2YXIgb25FbFVwZGF0ZWQgPSBvcHRpb25zLm9uRWxVcGRhdGVkIHx8IG5vb3A7XG4gICAgICAgIHZhciBvbkJlZm9yZU5vZGVEaXNjYXJkZWQgPSBvcHRpb25zLm9uQmVmb3JlTm9kZURpc2NhcmRlZCB8fCBub29wO1xuICAgICAgICB2YXIgb25Ob2RlRGlzY2FyZGVkID0gb3B0aW9ucy5vbk5vZGVEaXNjYXJkZWQgfHwgbm9vcDtcbiAgICAgICAgdmFyIG9uQmVmb3JlRWxDaGlsZHJlblVwZGF0ZWQgPSBvcHRpb25zLm9uQmVmb3JlRWxDaGlsZHJlblVwZGF0ZWQgfHwgbm9vcDtcbiAgICAgICAgdmFyIGNoaWxkcmVuT25seSA9IG9wdGlvbnMuY2hpbGRyZW5Pbmx5ID09PSB0cnVlO1xuXG4gICAgICAgIC8vIFRoaXMgb2JqZWN0IGlzIHVzZWQgYXMgYSBsb29rdXAgdG8gcXVpY2tseSBmaW5kIGFsbCBrZXllZCBlbGVtZW50cyBpbiB0aGUgb3JpZ2luYWwgRE9NIHRyZWUuXG4gICAgICAgIHZhciBmcm9tTm9kZXNMb29rdXAgPSB7fTtcbiAgICAgICAgdmFyIGtleWVkUmVtb3ZhbExpc3Q7XG5cbiAgICAgICAgZnVuY3Rpb24gYWRkS2V5ZWRSZW1vdmFsKGtleSkge1xuICAgICAgICAgICAgaWYgKGtleWVkUmVtb3ZhbExpc3QpIHtcbiAgICAgICAgICAgICAgICBrZXllZFJlbW92YWxMaXN0LnB1c2goa2V5KTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAga2V5ZWRSZW1vdmFsTGlzdCA9IFtrZXldO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgZnVuY3Rpb24gd2Fsa0Rpc2NhcmRlZENoaWxkTm9kZXMobm9kZSwgc2tpcEtleWVkTm9kZXMpIHtcbiAgICAgICAgICAgIGlmIChub2RlLm5vZGVUeXBlID09PSBFTEVNRU5UX05PREUpIHtcbiAgICAgICAgICAgICAgICB2YXIgY3VyQ2hpbGQgPSBub2RlLmZpcnN0Q2hpbGQ7XG4gICAgICAgICAgICAgICAgd2hpbGUgKGN1ckNoaWxkKSB7XG5cbiAgICAgICAgICAgICAgICAgICAgdmFyIGtleSA9IHVuZGVmaW5lZDtcblxuICAgICAgICAgICAgICAgICAgICBpZiAoc2tpcEtleWVkTm9kZXMgJiYgKGtleSA9IGdldE5vZGVLZXkoY3VyQ2hpbGQpKSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgLy8gSWYgd2UgYXJlIHNraXBwaW5nIGtleWVkIG5vZGVzIHRoZW4gd2UgYWRkIHRoZSBrZXlcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIHRvIGEgbGlzdCBzbyB0aGF0IGl0IGNhbiBiZSBoYW5kbGVkIGF0IHRoZSB2ZXJ5IGVuZC5cbiAgICAgICAgICAgICAgICAgICAgICAgIGFkZEtleWVkUmVtb3ZhbChrZXkpO1xuICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgLy8gT25seSByZXBvcnQgdGhlIG5vZGUgYXMgZGlzY2FyZGVkIGlmIGl0IGlzIG5vdCBrZXllZC4gV2UgZG8gdGhpcyBiZWNhdXNlXG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBhdCB0aGUgZW5kIHdlIGxvb3AgdGhyb3VnaCBhbGwga2V5ZWQgZWxlbWVudHMgdGhhdCB3ZXJlIHVubWF0Y2hlZFxuICAgICAgICAgICAgICAgICAgICAgICAgLy8gYW5kIHRoZW4gZGlzY2FyZCB0aGVtIGluIG9uZSBmaW5hbCBwYXNzLlxuICAgICAgICAgICAgICAgICAgICAgICAgb25Ob2RlRGlzY2FyZGVkKGN1ckNoaWxkKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChjdXJDaGlsZC5maXJzdENoaWxkKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgd2Fsa0Rpc2NhcmRlZENoaWxkTm9kZXMoY3VyQ2hpbGQsIHNraXBLZXllZE5vZGVzKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgICAgIGN1ckNoaWxkID0gY3VyQ2hpbGQubmV4dFNpYmxpbmc7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgLyoqXG4gICAgICAgICAqIFJlbW92ZXMgYSBET00gbm9kZSBvdXQgb2YgdGhlIG9yaWdpbmFsIERPTVxuICAgICAgICAgKlxuICAgICAgICAgKiBAcGFyYW0gIHtOb2RlfSBub2RlIFRoZSBub2RlIHRvIHJlbW92ZVxuICAgICAgICAgKiBAcGFyYW0gIHtOb2RlfSBwYXJlbnROb2RlIFRoZSBub2RlcyBwYXJlbnRcbiAgICAgICAgICogQHBhcmFtICB7Qm9vbGVhbn0gc2tpcEtleWVkTm9kZXMgSWYgdHJ1ZSB0aGVuIGVsZW1lbnRzIHdpdGgga2V5cyB3aWxsIGJlIHNraXBwZWQgYW5kIG5vdCBkaXNjYXJkZWQuXG4gICAgICAgICAqIEByZXR1cm4ge3VuZGVmaW5lZH1cbiAgICAgICAgICovXG4gICAgICAgIGZ1bmN0aW9uIHJlbW92ZU5vZGUobm9kZSwgcGFyZW50Tm9kZSwgc2tpcEtleWVkTm9kZXMpIHtcbiAgICAgICAgICAgIGlmIChvbkJlZm9yZU5vZGVEaXNjYXJkZWQobm9kZSkgPT09IGZhbHNlKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBpZiAocGFyZW50Tm9kZSkge1xuICAgICAgICAgICAgICAgIHBhcmVudE5vZGUucmVtb3ZlQ2hpbGQobm9kZSk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIG9uTm9kZURpc2NhcmRlZChub2RlKTtcbiAgICAgICAgICAgIHdhbGtEaXNjYXJkZWRDaGlsZE5vZGVzKG5vZGUsIHNraXBLZXllZE5vZGVzKTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIC8vIFRyZWVXYWxrZXIgaW1wbGVtZW50YXRpb24gaXMgbm8gZmFzdGVyLCBidXQga2VlcGluZyB0aGlzIGFyb3VuZCBpbiBjYXNlIHRoaXMgY2hhbmdlcyBpbiB0aGUgZnV0dXJlXG4gICAgICAgIC8vIGZ1bmN0aW9uIGluZGV4VHJlZShyb290KSB7XG4gICAgICAgIC8vICAgICB2YXIgdHJlZVdhbGtlciA9IGRvY3VtZW50LmNyZWF0ZVRyZWVXYWxrZXIoXG4gICAgICAgIC8vICAgICAgICAgcm9vdCxcbiAgICAgICAgLy8gICAgICAgICBOb2RlRmlsdGVyLlNIT1dfRUxFTUVOVCk7XG4gICAgICAgIC8vXG4gICAgICAgIC8vICAgICB2YXIgZWw7XG4gICAgICAgIC8vICAgICB3aGlsZSgoZWwgPSB0cmVlV2Fsa2VyLm5leHROb2RlKCkpKSB7XG4gICAgICAgIC8vICAgICAgICAgdmFyIGtleSA9IGdldE5vZGVLZXkoZWwpO1xuICAgICAgICAvLyAgICAgICAgIGlmIChrZXkpIHtcbiAgICAgICAgLy8gICAgICAgICAgICAgZnJvbU5vZGVzTG9va3VwW2tleV0gPSBlbDtcbiAgICAgICAgLy8gICAgICAgICB9XG4gICAgICAgIC8vICAgICB9XG4gICAgICAgIC8vIH1cblxuICAgICAgICAvLyAvLyBOb2RlSXRlcmF0b3IgaW1wbGVtZW50YXRpb24gaXMgbm8gZmFzdGVyLCBidXQga2VlcGluZyB0aGlzIGFyb3VuZCBpbiBjYXNlIHRoaXMgY2hhbmdlcyBpbiB0aGUgZnV0dXJlXG4gICAgICAgIC8vXG4gICAgICAgIC8vIGZ1bmN0aW9uIGluZGV4VHJlZShub2RlKSB7XG4gICAgICAgIC8vICAgICB2YXIgbm9kZUl0ZXJhdG9yID0gZG9jdW1lbnQuY3JlYXRlTm9kZUl0ZXJhdG9yKG5vZGUsIE5vZGVGaWx0ZXIuU0hPV19FTEVNRU5UKTtcbiAgICAgICAgLy8gICAgIHZhciBlbDtcbiAgICAgICAgLy8gICAgIHdoaWxlKChlbCA9IG5vZGVJdGVyYXRvci5uZXh0Tm9kZSgpKSkge1xuICAgICAgICAvLyAgICAgICAgIHZhciBrZXkgPSBnZXROb2RlS2V5KGVsKTtcbiAgICAgICAgLy8gICAgICAgICBpZiAoa2V5KSB7XG4gICAgICAgIC8vICAgICAgICAgICAgIGZyb21Ob2Rlc0xvb2t1cFtrZXldID0gZWw7XG4gICAgICAgIC8vICAgICAgICAgfVxuICAgICAgICAvLyAgICAgfVxuICAgICAgICAvLyB9XG5cbiAgICAgICAgZnVuY3Rpb24gaW5kZXhUcmVlKG5vZGUpIHtcbiAgICAgICAgICAgIGlmIChub2RlLm5vZGVUeXBlID09PSBFTEVNRU5UX05PREUpIHtcbiAgICAgICAgICAgICAgICB2YXIgY3VyQ2hpbGQgPSBub2RlLmZpcnN0Q2hpbGQ7XG4gICAgICAgICAgICAgICAgd2hpbGUgKGN1ckNoaWxkKSB7XG4gICAgICAgICAgICAgICAgICAgIHZhciBrZXkgPSBnZXROb2RlS2V5KGN1ckNoaWxkKTtcbiAgICAgICAgICAgICAgICAgICAgaWYgKGtleSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgZnJvbU5vZGVzTG9va3VwW2tleV0gPSBjdXJDaGlsZDtcbiAgICAgICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgICAgIC8vIFdhbGsgcmVjdXJzaXZlbHlcbiAgICAgICAgICAgICAgICAgICAgaW5kZXhUcmVlKGN1ckNoaWxkKTtcblxuICAgICAgICAgICAgICAgICAgICBjdXJDaGlsZCA9IGN1ckNoaWxkLm5leHRTaWJsaW5nO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIGluZGV4VHJlZShmcm9tTm9kZSk7XG5cbiAgICAgICAgZnVuY3Rpb24gaGFuZGxlTm9kZUFkZGVkKGVsKSB7XG4gICAgICAgICAgICBvbk5vZGVBZGRlZChlbCk7XG5cbiAgICAgICAgICAgIHZhciBjdXJDaGlsZCA9IGVsLmZpcnN0Q2hpbGQ7XG4gICAgICAgICAgICB3aGlsZSAoY3VyQ2hpbGQpIHtcbiAgICAgICAgICAgICAgICB2YXIgbmV4dFNpYmxpbmcgPSBjdXJDaGlsZC5uZXh0U2libGluZztcblxuICAgICAgICAgICAgICAgIHZhciBrZXkgPSBnZXROb2RlS2V5KGN1ckNoaWxkKTtcbiAgICAgICAgICAgICAgICBpZiAoa2V5KSB7XG4gICAgICAgICAgICAgICAgICAgIHZhciB1bm1hdGNoZWRGcm9tRWwgPSBmcm9tTm9kZXNMb29rdXBba2V5XTtcbiAgICAgICAgICAgICAgICAgICAgaWYgKHVubWF0Y2hlZEZyb21FbCAmJiBjb21wYXJlTm9kZU5hbWVzKGN1ckNoaWxkLCB1bm1hdGNoZWRGcm9tRWwpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBjdXJDaGlsZC5wYXJlbnROb2RlLnJlcGxhY2VDaGlsZCh1bm1hdGNoZWRGcm9tRWwsIGN1ckNoaWxkKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIG1vcnBoRWwodW5tYXRjaGVkRnJvbUVsLCBjdXJDaGlsZCk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICBoYW5kbGVOb2RlQWRkZWQoY3VyQ2hpbGQpO1xuICAgICAgICAgICAgICAgIGN1ckNoaWxkID0gbmV4dFNpYmxpbmc7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICBmdW5jdGlvbiBtb3JwaEVsKGZyb21FbCwgdG9FbCwgY2hpbGRyZW5Pbmx5KSB7XG4gICAgICAgICAgICB2YXIgdG9FbEtleSA9IGdldE5vZGVLZXkodG9FbCk7XG4gICAgICAgICAgICB2YXIgY3VyRnJvbU5vZGVLZXk7XG5cbiAgICAgICAgICAgIGlmICh0b0VsS2V5KSB7XG4gICAgICAgICAgICAgICAgLy8gSWYgYW4gZWxlbWVudCB3aXRoIGFuIElEIGlzIGJlaW5nIG1vcnBoZWQgdGhlbiBpdCBpcyB3aWxsIGJlIGluIHRoZSBmaW5hbFxuICAgICAgICAgICAgICAgIC8vIERPTSBzbyBjbGVhciBpdCBvdXQgb2YgdGhlIHNhdmVkIGVsZW1lbnRzIGNvbGxlY3Rpb25cbiAgICAgICAgICAgICAgICBkZWxldGUgZnJvbU5vZGVzTG9va3VwW3RvRWxLZXldO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBpZiAodG9Ob2RlLmlzU2FtZU5vZGUgJiYgdG9Ob2RlLmlzU2FtZU5vZGUoZnJvbU5vZGUpKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBpZiAoIWNoaWxkcmVuT25seSkge1xuICAgICAgICAgICAgICAgIGlmIChvbkJlZm9yZUVsVXBkYXRlZChmcm9tRWwsIHRvRWwpID09PSBmYWxzZSkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgbW9ycGhBdHRycyhmcm9tRWwsIHRvRWwpO1xuICAgICAgICAgICAgICAgIG9uRWxVcGRhdGVkKGZyb21FbCk7XG5cbiAgICAgICAgICAgICAgICBpZiAob25CZWZvcmVFbENoaWxkcmVuVXBkYXRlZChmcm9tRWwsIHRvRWwpID09PSBmYWxzZSkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBpZiAoZnJvbUVsLm5vZGVOYW1lICE9PSAnVEVYVEFSRUEnKSB7XG4gICAgICAgICAgICAgICAgdmFyIGN1clRvTm9kZUNoaWxkID0gdG9FbC5maXJzdENoaWxkO1xuICAgICAgICAgICAgICAgIHZhciBjdXJGcm9tTm9kZUNoaWxkID0gZnJvbUVsLmZpcnN0Q2hpbGQ7XG4gICAgICAgICAgICAgICAgdmFyIGN1clRvTm9kZUtleTtcblxuICAgICAgICAgICAgICAgIHZhciBmcm9tTmV4dFNpYmxpbmc7XG4gICAgICAgICAgICAgICAgdmFyIHRvTmV4dFNpYmxpbmc7XG4gICAgICAgICAgICAgICAgdmFyIG1hdGNoaW5nRnJvbUVsO1xuXG4gICAgICAgICAgICAgICAgb3V0ZXI6IHdoaWxlIChjdXJUb05vZGVDaGlsZCkge1xuICAgICAgICAgICAgICAgICAgICB0b05leHRTaWJsaW5nID0gY3VyVG9Ob2RlQ2hpbGQubmV4dFNpYmxpbmc7XG4gICAgICAgICAgICAgICAgICAgIGN1clRvTm9kZUtleSA9IGdldE5vZGVLZXkoY3VyVG9Ob2RlQ2hpbGQpO1xuXG4gICAgICAgICAgICAgICAgICAgIHdoaWxlIChjdXJGcm9tTm9kZUNoaWxkKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBmcm9tTmV4dFNpYmxpbmcgPSBjdXJGcm9tTm9kZUNoaWxkLm5leHRTaWJsaW5nO1xuXG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoY3VyVG9Ob2RlQ2hpbGQuaXNTYW1lTm9kZSAmJiBjdXJUb05vZGVDaGlsZC5pc1NhbWVOb2RlKGN1ckZyb21Ob2RlQ2hpbGQpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY3VyVG9Ob2RlQ2hpbGQgPSB0b05leHRTaWJsaW5nO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGN1ckZyb21Ob2RlQ2hpbGQgPSBmcm9tTmV4dFNpYmxpbmc7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY29udGludWUgb3V0ZXI7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAgICAgICAgIGN1ckZyb21Ob2RlS2V5ID0gZ2V0Tm9kZUtleShjdXJGcm9tTm9kZUNoaWxkKTtcblxuICAgICAgICAgICAgICAgICAgICAgICAgdmFyIGN1ckZyb21Ob2RlVHlwZSA9IGN1ckZyb21Ob2RlQ2hpbGQubm9kZVR5cGU7XG5cbiAgICAgICAgICAgICAgICAgICAgICAgIHZhciBpc0NvbXBhdGlibGUgPSB1bmRlZmluZWQ7XG5cbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChjdXJGcm9tTm9kZVR5cGUgPT09IGN1clRvTm9kZUNoaWxkLm5vZGVUeXBlKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGN1ckZyb21Ob2RlVHlwZSA9PT0gRUxFTUVOVF9OT0RFKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIEJvdGggbm9kZXMgYmVpbmcgY29tcGFyZWQgYXJlIEVsZW1lbnQgbm9kZXNcblxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoY3VyVG9Ob2RlS2V5KSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBUaGUgdGFyZ2V0IG5vZGUgaGFzIGEga2V5IHNvIHdlIHdhbnQgdG8gbWF0Y2ggaXQgdXAgd2l0aCB0aGUgY29ycmVjdCBlbGVtZW50XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBpbiB0aGUgb3JpZ2luYWwgRE9NIHRyZWVcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChjdXJUb05vZGVLZXkgIT09IGN1ckZyb21Ob2RlS2V5KSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gVGhlIGN1cnJlbnQgZWxlbWVudCBpbiB0aGUgb3JpZ2luYWwgRE9NIHRyZWUgZG9lcyBub3QgaGF2ZSBhIG1hdGNoaW5nIGtleSBzb1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIGxldCdzIGNoZWNrIG91ciBsb29rdXAgdG8gc2VlIGlmIHRoZXJlIGlzIGEgbWF0Y2hpbmcgZWxlbWVudCBpbiB0aGUgb3JpZ2luYWxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBET00gdHJlZVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmICgobWF0Y2hpbmdGcm9tRWwgPSBmcm9tTm9kZXNMb29rdXBbY3VyVG9Ob2RlS2V5XSkpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGN1ckZyb21Ob2RlQ2hpbGQubmV4dFNpYmxpbmcgPT09IG1hdGNoaW5nRnJvbUVsKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBTcGVjaWFsIGNhc2UgZm9yIHNpbmdsZSBlbGVtZW50IHJlbW92YWxzLiBUbyBhdm9pZCByZW1vdmluZyB0aGUgb3JpZ2luYWxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIERPTSBub2RlIG91dCBvZiB0aGUgdHJlZSAoc2luY2UgdGhhdCBjYW4gYnJlYWsgQ1NTIHRyYW5zaXRpb25zLCBldGMuKSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIHdlIHdpbGwgaW5zdGVhZCBkaXNjYXJkIHRoZSBjdXJyZW50IG5vZGUgYW5kIHdhaXQgdW50aWwgdGhlIG5leHRcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIGl0ZXJhdGlvbiB0byBwcm9wZXJseSBtYXRjaCB1cCB0aGUga2V5ZWQgdGFyZ2V0IGVsZW1lbnQgd2l0aCBpdHMgbWF0Y2hpbmdcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIGVsZW1lbnQgaW4gdGhlIG9yaWdpbmFsIHRyZWVcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlzQ29tcGF0aWJsZSA9IGZhbHNlO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gV2UgZm91bmQgYSBtYXRjaGluZyBrZXllZCBlbGVtZW50IHNvbWV3aGVyZSBpbiB0aGUgb3JpZ2luYWwgRE9NIHRyZWUuXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBMZXQncyBtb3ZpbmcgdGhlIG9yaWdpbmFsIERPTSBub2RlIGludG8gdGhlIGN1cnJlbnQgcG9zaXRpb24gYW5kIG1vcnBoXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBpdC5cblxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gTk9URTogV2UgdXNlIGluc2VydEJlZm9yZSBpbnN0ZWFkIG9mIHJlcGxhY2VDaGlsZCBiZWNhdXNlIHdlIHdhbnQgdG8gZ28gdGhyb3VnaFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gdGhlIGByZW1vdmVOb2RlKClgIGZ1bmN0aW9uIGZvciB0aGUgbm9kZSB0aGF0IGlzIGJlaW5nIGRpc2NhcmRlZCBzbyB0aGF0XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBhbGwgbGlmZWN5Y2xlIGhvb2tzIGFyZSBjb3JyZWN0bHkgaW52b2tlZFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZnJvbUVsLmluc2VydEJlZm9yZShtYXRjaGluZ0Zyb21FbCwgY3VyRnJvbU5vZGVDaGlsZCk7XG5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGZyb21OZXh0U2libGluZyA9IGN1ckZyb21Ob2RlQ2hpbGQubmV4dFNpYmxpbmc7XG5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChjdXJGcm9tTm9kZUtleSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIFNpbmNlIHRoZSBub2RlIGlzIGtleWVkIGl0IG1pZ2h0IGJlIG1hdGNoZWQgdXAgbGF0ZXIgc28gd2UgZGVmZXJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyB0aGUgYWN0dWFsIHJlbW92YWwgdG8gbGF0ZXJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBhZGRLZXllZFJlbW92YWwoY3VyRnJvbU5vZGVLZXkpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBOT1RFOiB3ZSBza2lwIG5lc3RlZCBrZXllZCBub2RlcyBmcm9tIGJlaW5nIHJlbW92ZWQgc2luY2UgdGhlcmUgaXNcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyAgICAgICBzdGlsbCBhIGNoYW5jZSB0aGV5IHdpbGwgYmUgbWF0Y2hlZCB1cCBsYXRlclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJlbW92ZU5vZGUoY3VyRnJvbU5vZGVDaGlsZCwgZnJvbUVsLCB0cnVlIC8qIHNraXAga2V5ZWQgbm9kZXMgKi8pO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjdXJGcm9tTm9kZUNoaWxkID0gbWF0Y2hpbmdGcm9tRWw7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBUaGUgbm9kZXMgYXJlIG5vdCBjb21wYXRpYmxlIHNpbmNlIHRoZSBcInRvXCIgbm9kZSBoYXMgYSBrZXkgYW5kIHRoZXJlXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIGlzIG5vIG1hdGNoaW5nIGtleWVkIG5vZGUgaW4gdGhlIHNvdXJjZSB0cmVlXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlzQ29tcGF0aWJsZSA9IGZhbHNlO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfSBlbHNlIGlmIChjdXJGcm9tTm9kZUtleSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gVGhlIG9yaWdpbmFsIGhhcyBhIGtleVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaXNDb21wYXRpYmxlID0gZmFsc2U7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpc0NvbXBhdGlibGUgPSBpc0NvbXBhdGlibGUgIT09IGZhbHNlICYmIGNvbXBhcmVOb2RlTmFtZXMoY3VyRnJvbU5vZGVDaGlsZCwgY3VyVG9Ob2RlQ2hpbGQpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoaXNDb21wYXRpYmxlKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBXZSBmb3VuZCBjb21wYXRpYmxlIERPTSBlbGVtZW50cyBzbyB0cmFuc2Zvcm1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIHRoZSBjdXJyZW50IFwiZnJvbVwiIG5vZGUgdG8gbWF0Y2ggdGhlIGN1cnJlbnRcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIHRhcmdldCBET00gbm9kZS5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIG1vcnBoRWwoY3VyRnJvbU5vZGVDaGlsZCwgY3VyVG9Ob2RlQ2hpbGQpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKGN1ckZyb21Ob2RlVHlwZSA9PT0gVEVYVF9OT0RFIHx8IGN1ckZyb21Ob2RlVHlwZSA9PSBDT01NRU5UX05PREUpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gQm90aCBub2RlcyBiZWluZyBjb21wYXJlZCBhcmUgVGV4dCBvciBDb21tZW50IG5vZGVzXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlzQ29tcGF0aWJsZSA9IHRydWU7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIFNpbXBseSB1cGRhdGUgbm9kZVZhbHVlIG9uIHRoZSBvcmlnaW5hbCBub2RlIHRvXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIGNoYW5nZSB0aGUgdGV4dCB2YWx1ZVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoY3VyRnJvbU5vZGVDaGlsZC5ub2RlVmFsdWUgIT09IGN1clRvTm9kZUNoaWxkLm5vZGVWYWx1ZSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY3VyRnJvbU5vZGVDaGlsZC5ub2RlVmFsdWUgPSBjdXJUb05vZGVDaGlsZC5ub2RlVmFsdWU7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGlzQ29tcGF0aWJsZSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIEFkdmFuY2UgYm90aCB0aGUgXCJ0b1wiIGNoaWxkIGFuZCB0aGUgXCJmcm9tXCIgY2hpbGQgc2luY2Ugd2UgZm91bmQgYSBtYXRjaFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGN1clRvTm9kZUNoaWxkID0gdG9OZXh0U2libGluZztcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjdXJGcm9tTm9kZUNoaWxkID0gZnJvbU5leHRTaWJsaW5nO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnRpbnVlIG91dGVyO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBObyBjb21wYXRpYmxlIG1hdGNoIHNvIHJlbW92ZSB0aGUgb2xkIG5vZGUgZnJvbSB0aGUgRE9NIGFuZCBjb250aW51ZSB0cnlpbmcgdG8gZmluZCBhXG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBtYXRjaCBpbiB0aGUgb3JpZ2luYWwgRE9NLiBIb3dldmVyLCB3ZSBvbmx5IGRvIHRoaXMgaWYgdGhlIGZyb20gbm9kZSBpcyBub3Qga2V5ZWRcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIHNpbmNlIGl0IGlzIHBvc3NpYmxlIHRoYXQgYSBrZXllZCBub2RlIG1pZ2h0IG1hdGNoIHVwIHdpdGggYSBub2RlIHNvbWV3aGVyZSBlbHNlIGluIHRoZVxuICAgICAgICAgICAgICAgICAgICAgICAgLy8gdGFyZ2V0IHRyZWUgYW5kIHdlIGRvbid0IHdhbnQgdG8gZGlzY2FyZCBpdCBqdXN0IHlldCBzaW5jZSBpdCBzdGlsbCBtaWdodCBmaW5kIGFcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIGhvbWUgaW4gdGhlIGZpbmFsIERPTSB0cmVlLiBBZnRlciBldmVyeXRoaW5nIGlzIGRvbmUgd2Ugd2lsbCByZW1vdmUgYW55IGtleWVkIG5vZGVzXG4gICAgICAgICAgICAgICAgICAgICAgICAvLyB0aGF0IGRpZG4ndCBmaW5kIGEgaG9tZVxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGN1ckZyb21Ob2RlS2V5KSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gU2luY2UgdGhlIG5vZGUgaXMga2V5ZWQgaXQgbWlnaHQgYmUgbWF0Y2hlZCB1cCBsYXRlciBzbyB3ZSBkZWZlclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIHRoZSBhY3R1YWwgcmVtb3ZhbCB0byBsYXRlclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGFkZEtleWVkUmVtb3ZhbChjdXJGcm9tTm9kZUtleSk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIE5PVEU6IHdlIHNraXAgbmVzdGVkIGtleWVkIG5vZGVzIGZyb20gYmVpbmcgcmVtb3ZlZCBzaW5jZSB0aGVyZSBpc1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vICAgICAgIHN0aWxsIGEgY2hhbmNlIHRoZXkgd2lsbCBiZSBtYXRjaGVkIHVwIGxhdGVyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcmVtb3ZlTm9kZShjdXJGcm9tTm9kZUNoaWxkLCBmcm9tRWwsIHRydWUgLyogc2tpcCBrZXllZCBub2RlcyAqLyk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAgICAgICAgIGN1ckZyb21Ob2RlQ2hpbGQgPSBmcm9tTmV4dFNpYmxpbmc7XG4gICAgICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgICAgICAvLyBJZiB3ZSBnb3QgdGhpcyBmYXIgdGhlbiB3ZSBkaWQgbm90IGZpbmQgYSBjYW5kaWRhdGUgbWF0Y2ggZm9yXG4gICAgICAgICAgICAgICAgICAgIC8vIG91ciBcInRvIG5vZGVcIiBhbmQgd2UgZXhoYXVzdGVkIGFsbCBvZiB0aGUgY2hpbGRyZW4gXCJmcm9tXCJcbiAgICAgICAgICAgICAgICAgICAgLy8gbm9kZXMuIFRoZXJlZm9yZSwgd2Ugd2lsbCBqdXN0IGFwcGVuZCB0aGUgY3VycmVudCBcInRvXCIgbm9kZVxuICAgICAgICAgICAgICAgICAgICAvLyB0byB0aGUgZW5kXG4gICAgICAgICAgICAgICAgICAgIGlmIChjdXJUb05vZGVLZXkgJiYgKG1hdGNoaW5nRnJvbUVsID0gZnJvbU5vZGVzTG9va3VwW2N1clRvTm9kZUtleV0pICYmIGNvbXBhcmVOb2RlTmFtZXMobWF0Y2hpbmdGcm9tRWwsIGN1clRvTm9kZUNoaWxkKSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgZnJvbUVsLmFwcGVuZENoaWxkKG1hdGNoaW5nRnJvbUVsKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIG1vcnBoRWwobWF0Y2hpbmdGcm9tRWwsIGN1clRvTm9kZUNoaWxkKTtcbiAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHZhciBvbkJlZm9yZU5vZGVBZGRlZFJlc3VsdCA9IG9uQmVmb3JlTm9kZUFkZGVkKGN1clRvTm9kZUNoaWxkKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChvbkJlZm9yZU5vZGVBZGRlZFJlc3VsdCAhPT0gZmFsc2UpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAob25CZWZvcmVOb2RlQWRkZWRSZXN1bHQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY3VyVG9Ob2RlQ2hpbGQgPSBvbkJlZm9yZU5vZGVBZGRlZFJlc3VsdDtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoY3VyVG9Ob2RlQ2hpbGQuYWN0dWFsaXplKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGN1clRvTm9kZUNoaWxkID0gY3VyVG9Ob2RlQ2hpbGQuYWN0dWFsaXplKGZyb21FbC5vd25lckRvY3VtZW50IHx8IGRvYyk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGZyb21FbC5hcHBlbmRDaGlsZChjdXJUb05vZGVDaGlsZCk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaGFuZGxlTm9kZUFkZGVkKGN1clRvTm9kZUNoaWxkKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgICAgIGN1clRvTm9kZUNoaWxkID0gdG9OZXh0U2libGluZztcbiAgICAgICAgICAgICAgICAgICAgY3VyRnJvbU5vZGVDaGlsZCA9IGZyb21OZXh0U2libGluZztcbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAvLyBXZSBoYXZlIHByb2Nlc3NlZCBhbGwgb2YgdGhlIFwidG8gbm9kZXNcIi4gSWYgY3VyRnJvbU5vZGVDaGlsZCBpc1xuICAgICAgICAgICAgICAgIC8vIG5vbi1udWxsIHRoZW4gd2Ugc3RpbGwgaGF2ZSBzb21lIGZyb20gbm9kZXMgbGVmdCBvdmVyIHRoYXQgbmVlZFxuICAgICAgICAgICAgICAgIC8vIHRvIGJlIHJlbW92ZWRcbiAgICAgICAgICAgICAgICB3aGlsZSAoY3VyRnJvbU5vZGVDaGlsZCkge1xuICAgICAgICAgICAgICAgICAgICBmcm9tTmV4dFNpYmxpbmcgPSBjdXJGcm9tTm9kZUNoaWxkLm5leHRTaWJsaW5nO1xuICAgICAgICAgICAgICAgICAgICBpZiAoKGN1ckZyb21Ob2RlS2V5ID0gZ2V0Tm9kZUtleShjdXJGcm9tTm9kZUNoaWxkKSkpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIFNpbmNlIHRoZSBub2RlIGlzIGtleWVkIGl0IG1pZ2h0IGJlIG1hdGNoZWQgdXAgbGF0ZXIgc28gd2UgZGVmZXJcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIHRoZSBhY3R1YWwgcmVtb3ZhbCB0byBsYXRlclxuICAgICAgICAgICAgICAgICAgICAgICAgYWRkS2V5ZWRSZW1vdmFsKGN1ckZyb21Ob2RlS2V5KTtcbiAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIE5PVEU6IHdlIHNraXAgbmVzdGVkIGtleWVkIG5vZGVzIGZyb20gYmVpbmcgcmVtb3ZlZCBzaW5jZSB0aGVyZSBpc1xuICAgICAgICAgICAgICAgICAgICAgICAgLy8gICAgICAgc3RpbGwgYSBjaGFuY2UgdGhleSB3aWxsIGJlIG1hdGNoZWQgdXAgbGF0ZXJcbiAgICAgICAgICAgICAgICAgICAgICAgIHJlbW92ZU5vZGUoY3VyRnJvbU5vZGVDaGlsZCwgZnJvbUVsLCB0cnVlIC8qIHNraXAga2V5ZWQgbm9kZXMgKi8pO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIGN1ckZyb21Ob2RlQ2hpbGQgPSBmcm9tTmV4dFNpYmxpbmc7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICB2YXIgc3BlY2lhbEVsSGFuZGxlciA9IHNwZWNpYWxFbEhhbmRsZXJzW2Zyb21FbC5ub2RlTmFtZV07XG4gICAgICAgICAgICBpZiAoc3BlY2lhbEVsSGFuZGxlcikge1xuICAgICAgICAgICAgICAgIHNwZWNpYWxFbEhhbmRsZXIoZnJvbUVsLCB0b0VsKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSAvLyBFTkQ6IG1vcnBoRWwoLi4uKVxuXG4gICAgICAgIHZhciBtb3JwaGVkTm9kZSA9IGZyb21Ob2RlO1xuICAgICAgICB2YXIgbW9ycGhlZE5vZGVUeXBlID0gbW9ycGhlZE5vZGUubm9kZVR5cGU7XG4gICAgICAgIHZhciB0b05vZGVUeXBlID0gdG9Ob2RlLm5vZGVUeXBlO1xuXG4gICAgICAgIGlmICghY2hpbGRyZW5Pbmx5KSB7XG4gICAgICAgICAgICAvLyBIYW5kbGUgdGhlIGNhc2Ugd2hlcmUgd2UgYXJlIGdpdmVuIHR3byBET00gbm9kZXMgdGhhdCBhcmUgbm90XG4gICAgICAgICAgICAvLyBjb21wYXRpYmxlIChlLmcuIDxkaXY+IC0tPiA8c3Bhbj4gb3IgPGRpdj4gLS0+IFRFWFQpXG4gICAgICAgICAgICBpZiAobW9ycGhlZE5vZGVUeXBlID09PSBFTEVNRU5UX05PREUpIHtcbiAgICAgICAgICAgICAgICBpZiAodG9Ob2RlVHlwZSA9PT0gRUxFTUVOVF9OT0RFKSB7XG4gICAgICAgICAgICAgICAgICAgIGlmICghY29tcGFyZU5vZGVOYW1lcyhmcm9tTm9kZSwgdG9Ob2RlKSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgb25Ob2RlRGlzY2FyZGVkKGZyb21Ob2RlKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIG1vcnBoZWROb2RlID0gbW92ZUNoaWxkcmVuKGZyb21Ob2RlLCBjcmVhdGVFbGVtZW50TlModG9Ob2RlLm5vZGVOYW1lLCB0b05vZGUubmFtZXNwYWNlVVJJKSk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAvLyBHb2luZyBmcm9tIGFuIGVsZW1lbnQgbm9kZSB0byBhIHRleHQgbm9kZVxuICAgICAgICAgICAgICAgICAgICBtb3JwaGVkTm9kZSA9IHRvTm9kZTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9IGVsc2UgaWYgKG1vcnBoZWROb2RlVHlwZSA9PT0gVEVYVF9OT0RFIHx8IG1vcnBoZWROb2RlVHlwZSA9PT0gQ09NTUVOVF9OT0RFKSB7IC8vIFRleHQgb3IgY29tbWVudCBub2RlXG4gICAgICAgICAgICAgICAgaWYgKHRvTm9kZVR5cGUgPT09IG1vcnBoZWROb2RlVHlwZSkge1xuICAgICAgICAgICAgICAgICAgICBpZiAobW9ycGhlZE5vZGUubm9kZVZhbHVlICE9PSB0b05vZGUubm9kZVZhbHVlKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBtb3JwaGVkTm9kZS5ub2RlVmFsdWUgPSB0b05vZGUubm9kZVZhbHVlO1xuICAgICAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIG1vcnBoZWROb2RlO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIC8vIFRleHQgbm9kZSB0byBzb21ldGhpbmcgZWxzZVxuICAgICAgICAgICAgICAgICAgICBtb3JwaGVkTm9kZSA9IHRvTm9kZTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICBpZiAobW9ycGhlZE5vZGUgPT09IHRvTm9kZSkge1xuICAgICAgICAgICAgLy8gVGhlIFwidG8gbm9kZVwiIHdhcyBub3QgY29tcGF0aWJsZSB3aXRoIHRoZSBcImZyb20gbm9kZVwiIHNvIHdlIGhhZCB0b1xuICAgICAgICAgICAgLy8gdG9zcyBvdXQgdGhlIFwiZnJvbSBub2RlXCIgYW5kIHVzZSB0aGUgXCJ0byBub2RlXCJcbiAgICAgICAgICAgIG9uTm9kZURpc2NhcmRlZChmcm9tTm9kZSk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBtb3JwaEVsKG1vcnBoZWROb2RlLCB0b05vZGUsIGNoaWxkcmVuT25seSk7XG5cbiAgICAgICAgICAgIC8vIFdlIG5vdyBuZWVkIHRvIGxvb3Agb3ZlciBhbnkga2V5ZWQgbm9kZXMgdGhhdCBtaWdodCBuZWVkIHRvIGJlXG4gICAgICAgICAgICAvLyByZW1vdmVkLiBXZSBvbmx5IGRvIHRoZSByZW1vdmFsIGlmIHdlIGtub3cgdGhhdCB0aGUga2V5ZWQgbm9kZVxuICAgICAgICAgICAgLy8gbmV2ZXIgZm91bmQgYSBtYXRjaC4gV2hlbiBhIGtleWVkIG5vZGUgaXMgbWF0Y2hlZCB1cCB3ZSByZW1vdmVcbiAgICAgICAgICAgIC8vIGl0IG91dCBvZiBmcm9tTm9kZXNMb29rdXAgYW5kIHdlIHVzZSBmcm9tTm9kZXNMb29rdXAgdG8gZGV0ZXJtaW5lXG4gICAgICAgICAgICAvLyBpZiBhIGtleWVkIG5vZGUgaGFzIGJlZW4gbWF0Y2hlZCB1cCBvciBub3RcbiAgICAgICAgICAgIGlmIChrZXllZFJlbW92YWxMaXN0KSB7XG4gICAgICAgICAgICAgICAgZm9yICh2YXIgaT0wLCBsZW49a2V5ZWRSZW1vdmFsTGlzdC5sZW5ndGg7IGk8bGVuOyBpKyspIHtcbiAgICAgICAgICAgICAgICAgICAgdmFyIGVsVG9SZW1vdmUgPSBmcm9tTm9kZXNMb29rdXBba2V5ZWRSZW1vdmFsTGlzdFtpXV07XG4gICAgICAgICAgICAgICAgICAgIGlmIChlbFRvUmVtb3ZlKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZW1vdmVOb2RlKGVsVG9SZW1vdmUsIGVsVG9SZW1vdmUucGFyZW50Tm9kZSwgZmFsc2UpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgaWYgKCFjaGlsZHJlbk9ubHkgJiYgbW9ycGhlZE5vZGUgIT09IGZyb21Ob2RlICYmIGZyb21Ob2RlLnBhcmVudE5vZGUpIHtcbiAgICAgICAgICAgIGlmIChtb3JwaGVkTm9kZS5hY3R1YWxpemUpIHtcbiAgICAgICAgICAgICAgICBtb3JwaGVkTm9kZSA9IG1vcnBoZWROb2RlLmFjdHVhbGl6ZShmcm9tTm9kZS5vd25lckRvY3VtZW50IHx8IGRvYyk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICAvLyBJZiB3ZSBoYWQgdG8gc3dhcCBvdXQgdGhlIGZyb20gbm9kZSB3aXRoIGEgbmV3IG5vZGUgYmVjYXVzZSB0aGUgb2xkXG4gICAgICAgICAgICAvLyBub2RlIHdhcyBub3QgY29tcGF0aWJsZSB3aXRoIHRoZSB0YXJnZXQgbm9kZSB0aGVuIHdlIG5lZWQgdG9cbiAgICAgICAgICAgIC8vIHJlcGxhY2UgdGhlIG9sZCBET00gbm9kZSBpbiB0aGUgb3JpZ2luYWwgRE9NIHRyZWUuIFRoaXMgaXMgb25seVxuICAgICAgICAgICAgLy8gcG9zc2libGUgaWYgdGhlIG9yaWdpbmFsIERPTSBub2RlIHdhcyBwYXJ0IG9mIGEgRE9NIHRyZWUgd2hpY2hcbiAgICAgICAgICAgIC8vIHdlIGtub3cgaXMgdGhlIGNhc2UgaWYgaXQgaGFzIGEgcGFyZW50IG5vZGUuXG4gICAgICAgICAgICBmcm9tTm9kZS5wYXJlbnROb2RlLnJlcGxhY2VDaGlsZChtb3JwaGVkTm9kZSwgZnJvbU5vZGUpO1xuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIG1vcnBoZWROb2RlO1xuICAgIH07XG59XG5cbnZhciBtb3JwaGRvbSA9IG1vcnBoZG9tRmFjdG9yeShtb3JwaEF0dHJzKTtcblxubW9kdWxlLmV4cG9ydHMgPSBtb3JwaGRvbTtcbiIsInZhciBnZXRJZCA9IGZ1bmN0aW9uIChpZCkge1xyXG4gIHJldHVybiBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChpZClcclxufVxyXG5cclxuZXhwb3J0cy5nZXRJZCA9IGdldElkXHJcblxyXG4vLyB2YXIgbG9vcENoaWxkcyA9IGZ1bmN0aW9uIChhcnIsIGVsZW0pIHtcclxuLy8gICBmb3IgKHZhciBjaGlsZCA9IGVsZW0uZmlyc3RDaGlsZDsgY2hpbGQgIT09IG51bGw7IGNoaWxkID0gY2hpbGQubmV4dFNpYmxpbmcpIHtcclxuLy8gICAgIGFyci5wdXNoKGNoaWxkKVxyXG4vLyAgICAgaWYgKGNoaWxkLmhhc0NoaWxkTm9kZXMoKSkge1xyXG4vLyAgICAgICBsb29wQ2hpbGRzKGFyciwgY2hpbGQpXHJcbi8vICAgICB9XHJcbi8vICAgfVxyXG4vLyB9XHJcblxyXG4vLyBleHBvcnRzLmxvb3BDaGlsZHMgPSBsb29wQ2hpbGRzXHJcblxyXG5leHBvcnRzLnRlc3RFdmVudCA9IGZ1bmN0aW9uICh0bXBsKSB7XHJcbiAgcmV0dXJuIC8gay0vLnRlc3QodG1wbClcclxufVxyXG5cclxuLyoqXHJcbiAqIEBwcml2YXRlXHJcbiAqIEBkZXNjcmlwdGlvblxyXG4gKiBDaGVjayBhIG5vZGUgYXZhaWxhYmlsaXR5IGluIDI1MG1zLCBpZiBub3QgZm91bmQgc2lsZW50eSBza2lwIHRoZSBldmVudFxyXG4gKlxyXG4gKiBAcGFyYW0ge3N0cmluZ30gaWQgLSB0aGUgbm9kZSBpZFxyXG4gKiBAcGFyYW0ge2Z1bmN0aW9ufSBjYWxsYmFjayAtIHRoZSBmdW5jdGlvbiB0byBleGVjdXRlIG9uY2UgdGhlIG5vZGUgaXMgZm91bmRcclxuICovXHJcbmV4cG9ydHMuY2hlY2tOb2RlQXZhaWxhYmlsaXR5ID0gZnVuY3Rpb24gKGNvbXBvbmVudCwgY29tcG9uZW50TmFtZSwgY2FsbGJhY2ssIG5vdEZvdW5kKSB7XHJcbiAgdmFyIGVsZSA9IGdldElkKGNvbXBvbmVudC5lbClcclxuICB2YXIgZm91bmQgPSBmYWxzZVxyXG4gIGlmIChlbGUpIHJldHVybiBlbGVcclxuICBlbHNlIHtcclxuICAgIHZhciB0ID0gc2V0SW50ZXJ2YWwoZnVuY3Rpb24gKCkge1xyXG4gICAgICBlbGUgPSBnZXRJZChjb21wb25lbnQuZWwpXHJcbiAgICAgIGlmIChlbGUpIHtcclxuICAgICAgICBjbGVhckludGVydmFsKHQpXHJcbiAgICAgICAgZm91bmQgPSB0cnVlXHJcbiAgICAgICAgY2FsbGJhY2soY29tcG9uZW50LCBjb21wb25lbnROYW1lLCBlbGUpXHJcbiAgICAgIH1cclxuICAgIH0sIDApXHJcbiAgICAvLyBzaWxlbnRseSBpZ25vcmUgZmluZGluZyB0aGUgbm9kZSBhZnRlciBzb21ldGltZXNcclxuICAgIHNldFRpbWVvdXQoZnVuY3Rpb24gKCkge1xyXG4gICAgICBjbGVhckludGVydmFsKHQpXHJcbiAgICAgIGlmKCFmb3VuZCAmJiBub3RGb3VuZCAmJiB0eXBlb2Ygbm90Rm91bmQgPT09ICdmdW5jdGlvbicpIG5vdEZvdW5kKClcclxuICAgIH0sIDI1MClcclxuICB9XHJcbn1cclxuXHJcbi8qKlxyXG4gKiBAcHJpdmF0ZVxyXG4gKiBAZGVzY3JpcHRpb25cclxuICogQ29uZmlybSB0aGF0IGEgdmFsdWUgaXMgdHJ1dGh5LCB0aHJvd3MgYW4gZXJyb3IgbWVzc2FnZSBvdGhlcndpc2UuXHJcbiAqXHJcbiAqIEBwYXJhbSB7Kn0gdmFsIC0gdGhlIHZhbCB0byB0ZXN0LlxyXG4gKiBAcGFyYW0ge3N0cmluZ30gbXNnIC0gdGhlIGVycm9yIG1lc3NhZ2Ugb24gZmFpbHVyZS5cclxuICogQHRocm93cyB7RXJyb3J9XHJcbiAqL1xyXG5leHBvcnRzLmFzc2VydCA9IGZ1bmN0aW9uICh2YWwsIG1zZykge1xyXG4gIGlmICghdmFsKSB0aHJvdyBuZXcgRXJyb3IoJyhrZWV0KSAnICsgbXNnKVxyXG59XHJcblxyXG4vKipcclxuICogQHByaXZhdGVcclxuICogQGRlc2NyaXB0aW9uXHJcbiAqIFNpbXBsZSBodG1sIHRlbXBsYXRlIGxpdGVyYWxzIE1PRElGSUVEIGZyb20gOiBodHRwOi8vMmFsaXR5LmNvbS8yMDE1LzAxL3RlbXBsYXRlLXN0cmluZ3MtaHRtbC5odG1sXHJcbiAqIGJ5IERyLiBBeGVsIFJhdXNjaG1heWVyXHJcbiAqIG5vIGNoZWNraW5nIGZvciB3cmFwcGluZyBpbiByb290IGVsZW1lbnRcclxuICogbm8gc3RyaWN0IGNoZWNraW5nXHJcbiAqIHJlbW92ZSBzcGFjaW5nIC8gaW5kZW50YXRpb25cclxuICoga2VlcCBhbGwgc3BhY2luZyB3aXRoaW4gaHRtbCB0YWdzXHJcbiAqIGluY2x1ZGUgaGFuZGxpbmcgJHt9IGluIHRoZSBsaXRlcmFsc1xyXG4gKi9cclxuZXhwb3J0cy5odG1sID0gZnVuY3Rpb24gaHRtbCAoKSB7XHJcbiAgdmFyIGxpdGVyYWxzID0gW10uc2hpZnQuY2FsbChhcmd1bWVudHMpXHJcbiAgdmFyIHN1YnN0cyA9IFtdLnNsaWNlLmNhbGwoYXJndW1lbnRzKVxyXG5cclxuICB2YXIgcmVzdWx0ID0gbGl0ZXJhbHMucmF3LnJlZHVjZShmdW5jdGlvbiAoYWNjLCBsaXQsIGkpIHtcclxuICAgIHJldHVybiBhY2MgKyBzdWJzdHNbaSAtIDFdICsgbGl0XHJcbiAgfSlcclxuICAvLyByZW1vdmUgc3BhY2luZywgaW5kZW50YXRpb24gZnJvbSBldmVyeSBsaW5lXHJcbiAgLy8gcmVzdWx0ID0gcmVzdWx0LnNwbGl0KC9cXG4rLylcclxuICAvLyByZXN1bHQgPSByZXN1bHQubWFwKGZ1bmN0aW9uICh0KSB7XHJcbiAgLy8gICByZXR1cm4gdC50cmltKClcclxuICAvLyB9KS5qb2luKCcnKVxyXG4gIHJldHVybiByZXN1bHRcclxufVxyXG5cclxuLyoqXHJcbiAqIEBwcml2YXRlXHJcbiAqIEBkZXNjcmlwdGlvblxyXG4gKiBDb3B5IHdpdGggbW9kaWZpY2F0aW9uIGZyb20gcHJlYWN0LXRvZG9tdmMuIE1vZGVsIGNvbnN0cnVjdG9yIHdpdGhcclxuICogcmVnaXN0ZXJpbmcgY2FsbGJhY2sgbGlzdGVuZXIgaW4gT2JqZWN0LmRlZmluZVByb3BlcnR5LiBBbnkgbW9kaWZpY2F0aW9uXHJcbiAqIHRvIGBgYHRoaXMubGlzdGBgYCBpbnN0YW5jZSB3aWxsIHN1YnNlcXVlbnRseSBpbmZvcm0gYWxsIHJlZ2lzdGVyZWQgbGlzdGVuZXIuXHJcbiAqXHJcbiAqIHt7bW9kZWw6PG15TW9kZWw+fX08bXlNb2RlbFRlbXBsYXRlU3RyaW5nPnt7L21vZGVsOjxteU1vZGVsPn19XHJcbiAqXHJcbiAqL1xyXG5mdW5jdGlvbiBjcmVhdGVNb2RlbCgpIHtcclxuICB2YXIgbW9kZWwgPSBbXVxyXG4gIHZhciBvbkNoYW5nZXMgPSBbXVxyXG5cclxuICB2YXIgaW5mb3JtID0gZnVuY3Rpb24gKCkge1xyXG4gICAgLy8gY29uc29sZS50cmFjZShvbkNoYW5nZXMpXHJcbiAgICBmb3IgKHZhciBpID0gb25DaGFuZ2VzLmxlbmd0aDsgaS0tOykge1xyXG4gICAgICBvbkNoYW5nZXNbaV0obW9kZWwpXHJcbiAgICB9XHJcbiAgfVxyXG5cclxuLyoqXHJcbiAqIEBwcml2YXRlXHJcbiAqIEBkZXNjcmlwdGlvblxyXG4gKiBSZWdpc3RlciBjYWxsYmFjayBsaXN0ZW5lciBvZiBhbnkgY2hhbmdlc1xyXG4gKi9cclxuICBPYmplY3QuZGVmaW5lUHJvcGVydHkodGhpcywgJ2xpc3QnLCB7XHJcbiAgICBlbnVtZXJhYmxlOiBmYWxzZSxcclxuICAgIGNvbmZpZ3VyYWJsZTogdHJ1ZSxcclxuICAgIGdldDogZnVuY3Rpb24gKCkge1xyXG4gICAgICByZXR1cm4gbW9kZWxcclxuICAgIH0sXHJcbiAgICBzZXQ6IGZ1bmN0aW9uICh2YWwpIHtcclxuICAgICAgbW9kZWwgPSB2YWxcclxuICAgICAgaW5mb3JtKClcclxuICAgIH1cclxuICB9KVxyXG5cclxuLyoqXHJcbiAqIEBwcml2YXRlXHJcbiAqIEBkZXNjcmlwdGlvblxyXG4gKiBTdWJzY3JpYmUgdG8gdGhlIG1vZGVsIGNoYW5nZXMgKGFkZC91cGRhdGUvZGVzdHJveSlcclxuICpcclxuICogQHBhcmFtIHtPYmplY3R9IG1vZGVsIC0gdGhlIG1vZGVsIGluY2x1ZGluZyBhbGwgcHJvdG90eXBlc1xyXG4gKlxyXG4gKi9cclxuICB0aGlzLnN1YnNjcmliZSA9IGZ1bmN0aW9uIChmbikge1xyXG4gICAgb25DaGFuZ2VzLnB1c2goZm4pXHJcbiAgfVxyXG5cclxuLyoqXHJcbiAqIEBwcml2YXRlXHJcbiAqIEBkZXNjcmlwdGlvblxyXG4gKiBBZGQgbmV3IG9iamVjdCB0byB0aGUgbW9kZWwgbGlzdFxyXG4gKlxyXG4gKiBAcGFyYW0ge09iamVjdH0gb2JqIC0gbmV3IG9iamVjdCB0byBhZGQgaW50byB0aGUgbW9kZWwgbGlzdFxyXG4gKlxyXG4gKi9cclxuICB0aGlzLmFkZCA9IGZ1bmN0aW9uIChvYmopIHtcclxuICAgIHRoaXMubGlzdCA9IHRoaXMubGlzdC5jb25jYXQob2JqKVxyXG4gIH1cclxuXHJcbi8qKlxyXG4gKiBAcHJpdmF0ZVxyXG4gKiBAZGVzY3JpcHRpb25cclxuICogVXBkYXRlIGV4aXN0aW5nIG9iamVjdCBpbiB0aGUgbW9kZWwgbGlzdFxyXG4gKlxyXG4gKiBAcGFyYW0ge1N0cmluZ30gbG9va3VwSWQgLSBsb29rdXAgaWQgcHJvcGVydHkgbmFtZSBvZiB0aGUgb2JqZWN0XHJcbiAqIEBwYXJhbSB7T2JqZWN0fSB1cGRhdGVPYmogLSB0aGUgdXBkYXRlZCBwcm9wZXJ0aWVzXHJcbiAqXHJcbiAqL1xyXG4gIHRoaXMudXBkYXRlID0gZnVuY3Rpb24gKGxvb2t1cElkLCB1cGRhdGVPYmopIHtcclxuICAgIHRoaXMubGlzdCA9IHRoaXMubGlzdC5tYXAoZnVuY3Rpb24gKG9iaikge1xyXG4gICAgICByZXR1cm4gb2JqW2xvb2t1cElkXSAhPT0gdXBkYXRlT2JqW2xvb2t1cElkXSA/IG9iaiA6IE9iamVjdC5hc3NpZ24ob2JqLCB1cGRhdGVPYmopXHJcbiAgICB9KVxyXG4gIH1cclxuXHJcbi8qKlxyXG4gKiBAcHJpdmF0ZVxyXG4gKiBAZGVzY3JpcHRpb25cclxuICogUmVtb3ZlZCBleGlzdGluZyBvYmplY3QgaW4gdGhlIG1vZGVsIGxpc3RcclxuICpcclxuICogQHBhcmFtIHtTdHJpbmd9IGxvb2t1cElkIC0gbG9va3VwIGlkIHByb3BlcnR5IG5hbWUgb2YgdGhlIG9iamVjdFxyXG4gKiBAcGFyYW0ge1N0cmluZ30gb2JqSWQgLSB1bmlxdWUgaWRlbnRpZmllciBvZiB0aGUgbG9va3VwIGlkXHJcbiAqXHJcbiAqL1xyXG4gIHRoaXMuZGVzdHJveSA9IGZ1bmN0aW9uIChsb29rdXBJZCwgb2JqSWQpIHtcclxuICAgIHRoaXMubGlzdCA9IHRoaXMubGlzdC5maWx0ZXIoZnVuY3Rpb24gKG9iaikge1xyXG4gICAgICByZXR1cm4gb2JqW2xvb2t1cElkXSAhPT0gb2JqSWRcclxuICAgIH0pXHJcbiAgfVxyXG59XHJcblxyXG5leHBvcnRzLmNyZWF0ZU1vZGVsID0gY3JlYXRlTW9kZWxcclxuIiwiaW1wb3J0IEtlZXQgZnJvbSAnLi4va2VldCdcclxuaW1wb3J0IHsgaHRtbCB9IGZyb20gJy4uL2tlZXQvdXRpbHMnXHJcbmltcG9ydCB7IGdlbklkIH0gZnJvbSAnLi91dGlsJ1xyXG5pbXBvcnQgZmlsdGVyQXBwICBmcm9tICcuL2ZpbHRlcidcclxuaW1wb3J0IHRvZG9zIGZyb20gJy4vdG9kbydcclxuXHJcbmNsYXNzIEFwcCBleHRlbmRzIEtlZXQge1xyXG4gIHRvZG9Nb2RlbCA9IHRvZG9zXHJcbiAgZmlsdGVyID0gZmlsdGVyQXBwXHJcbiAgcGFnZSA9ICdBbGwnXHJcbiAgaXNDaGVja2VkID0gZmFsc2VcclxuICBjb3VudCA9IDBcclxuICBwbHVyYWwgPSAnJ1xyXG4gIGNsZWFyVG9nZ2xlID0gZmFsc2VcclxuICAvLyB0b2RvU3RhdGUgPSB0cnVlXHJcblxyXG4gIGNvbXBvbmVudFdpbGxNb3VudCgpIHtcclxuXHJcbiAgICB0aGlzLnRvZG9TdGF0ZSA9IHRoaXMudG9kb01vZGVsLmxpc3QubGVuZ3RoID8gdHJ1ZSA6IGZhbHNlXHJcblxyXG4gICAgdGhpcy50b2RvTW9kZWwuc3Vic2NyaWJlKHRvZG9zID0+IHtcclxuICAgICAgbGV0IHVuY29tcGxldGVkID0gdG9kb3MuZmlsdGVyKGMgPT4gIWMuY29tcGxldGVkKVxyXG4gICAgICBsZXQgY29tcGxldGVkID0gdG9kb3MuZmlsdGVyKGMgPT4gYy5jb21wbGV0ZWQpXHJcbiAgICAgIHRoaXMuY2xlYXJUb2dnbGUgPSBjb21wbGV0ZWQubGVuZ3RoID8gdHJ1ZSA6IGZhbHNlXHJcbiAgICAgIHRoaXMudG9kb1N0YXRlID0gdG9kb3MubGVuZ3RoID8gdHJ1ZSA6IGZhbHNlXHJcbiAgICAgIHRoaXMucGx1cmFsID0gdW5jb21wbGV0ZWQubGVuZ3RoID09PSAxID8gJycgOiAncydcclxuICAgICAgdGhpcy5jb3VudCA9IHVuY29tcGxldGVkLmxlbmd0aFxyXG4gICAgfSlcclxuICB9XHJcblxyXG4gIGNyZWF0ZSAoZXZ0KSB7XHJcbiAgICBpZihldnQua2V5Q29kZSAhPT0gMTMpIHJldHVyblxyXG4gICAgZXZ0LnByZXZlbnREZWZhdWx0KClcclxuICAgIGxldCB0aXRsZSA9IGV2dC50YXJnZXQudmFsdWUudHJpbSgpXHJcbiAgICBpZih0aXRsZSl7XHJcbiAgICAgIHRoaXMudG9kb01vZGVsLmFkZCh7IGlkOiBnZW5JZCgpLCB0aXRsZSwgY29tcGxldGVkOiBmYWxzZSB9KVxyXG4gICAgICBldnQudGFyZ2V0LnZhbHVlID0gJydcclxuICAgIH1cclxuICB9XHJcblxyXG4gIGV2dFRvZG8oLi4uYXJncyl7XHJcbiAgICBsZXQgdGFyZ2V0ID0gYXJncy5zaGlmdCgpXHJcbiAgICBsZXQgZXZ0ID0gYXJncy5wb3AoKVxyXG4gICAgbGV0IGlkID0gYXJncy5wb3AoKVxyXG5cclxuICAgIGlmKHRhcmdldCA9PT0gJ3RvZ2dsZScpICBcclxuICAgICAgdGhpcy50b2dnbGVUb2RvKGlkLCBldnQpXHJcbiAgICBlbHNlIGlmKHRhcmdldCA9PT0gJ2Rlc3Ryb3knKSAgXHJcbiAgICAgIHRoaXMudG9kb0Rlc3Ryb3koaWQpXHJcbiAgfVxyXG5cclxuICB0b2dnbGVUb2RvKGlkLCBldnQpIHtcclxuICAgIHRoaXMudG9kb01vZGVsLnVwZGF0ZSggJ2lkJywgeyBpZCwgY29tcGxldGVkOiAhIWV2dC50YXJnZXQuY2hlY2tlZCB9KVxyXG4gIH1cclxuXHJcbiAgdG9kb0Rlc3Ryb3koaWQpIHtcclxuICAgIHRoaXMudG9kb01vZGVsLmRlc3Ryb3koJ2lkJywgaWQpXHJcbiAgfVxyXG5cclxuICBjb21wbGV0ZUFsbCgpe1xyXG4gICAgdGhpcy5pc0NoZWNrZWQgPSAhdGhpcy5pc0NoZWNrZWRcclxuICAgIC8vIHRoaXMudG9kb01vZGVsLnVwZGF0ZUFsbCh0aGlzLmlzQ2hlY2tlZClcclxuICB9XHJcblxyXG4gIGNsZWFyQ29tcGxldGVkKCkge1xyXG4gICAgdGhpcy50b2RvTW9kZWwuY2xlYXJDb21wbGV0ZWQoKVxyXG4gIH1cclxuICBlZGl0TW9kZSgpe1xyXG5cclxuICB9XHJcbiAgLy8gY29tcG9uZW50RGlkVXBkYXRlKCl7XHJcbiAgLy8gICBjKytcclxuICAvLyAgIGNvbnNvbGUubG9nKGMvKiwgdGltZSwgRGF0ZS5ub3coKSAtIHRpbWUqLylcclxuICAvLyB9XHJcbn1cclxuXHJcbmNvbnN0IHZtb2RlbCA9IGh0bWxgXHJcbiAgPHNlY3Rpb24gY2xhc3M9XCJ0b2RvYXBwXCI+XHJcbiAgICA8aGVhZGVyIGlkPVwiaGVhZGVyXCI+XHJcbiAgICAgIDxoMT50b2RvczwvaDE+XHJcbiAgICAgIDxpbnB1dCBjbGFzcz1cIm5ldy10b2RvXCIgay1rZXlkb3duPVwiY3JlYXRlKClcIiBwbGFjZWhvbGRlcj1cIldoYXQgbmVlZHMgdG8gYmUgZG9uZT9cIiBhdXRvZm9jdXM+XHJcbiAgICA8L2hlYWRlcj5cclxuICAgIHt7P3RvZG9TdGF0ZX19XHJcbiAgICA8c2VjdGlvbiBjbGFzcz1cIm1haW5cIj5cclxuICAgICAgPGlucHV0IGlkPVwidG9nZ2xlLWFsbFwiIGNsYXNzPVwidG9nZ2xlLWFsbFwiIHR5cGU9XCJjaGVja2JveFwiIGNoZWNrZWQ9XCJ7e2lzQ2hlY2tlZD9jaGVja2VkOicnfX1cIiBrLWNsaWNrPVwiY29tcGxldGVBbGwoKVwiPlxyXG4gICAgICA8bGFiZWwgZm9yPVwidG9nZ2xlLWFsbFwiPk1hcmsgYWxsIGFzIGNvbXBsZXRlPC9sYWJlbD5cclxuICAgICAgPHVsIGlkPVwidG9kby1saXN0XCIgY2xhc3M9XCJ0b2RvLWxpc3RcIiBrLWNsaWNrPVwiZXZ0VG9kbygpXCIgay1kYmxjbGljaz1cImVkaXRNb2RlKClcIj5cclxuICAgICAgICB7e21vZGVsOnRvZG9Nb2RlbH19XHJcbiAgICAgICAgICA8bGkgaWQ9XCJ7e2lkfX1cIiBjbGFzcz1cInt7Y29tcGxldGVkP2NvbXBsZXRlZDonJ319XCI+XHJcbiAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJ2aWV3XCI+XHJcbiAgICAgICAgICAgICAgPGlucHV0IGNsYXNzPVwidG9nZ2xlXCIgdHlwZT1cImNoZWNrYm94XCIgY2hlY2tlZD1cInt7Y29tcGxldGVkP2NoZWNrZWQ6Jyd9fVwiPlxyXG4gICAgICAgICAgICAgIDxsYWJlbD57e3RpdGxlfX08L2xhYmVsPlxyXG4gICAgICAgICAgICAgIDxidXR0b24gY2xhc3M9XCJkZXN0cm95XCI+PC9idXR0b24+XHJcbiAgICAgICAgICAgIDwvZGl2PlxyXG4gICAgICAgICAgICA8aW5wdXQgY2xhc3M9XCJlZGl0XCIgdmFsdWU9XCJ7e3RpdGxlfX1cIj5cclxuICAgICAgICAgIDwvbGk+XHJcbiAgICAgICAge3svbW9kZWw6dG9kb01vZGVsfX1cclxuICAgICAgPC91bD5cclxuICAgIDwvc2VjdGlvbj5cclxuICAgIDxmb290ZXIgY2xhc3M9XCJmb290ZXJcIj5cclxuICAgICAgPHNwYW4gY2xhc3M9XCJ0b2RvLWNvdW50XCI+XHJcbiAgICAgICAgPHN0cm9uZz57e2NvdW50fX08L3N0cm9uZz4gaXRlbXt7cGx1cmFsfX0gbGVmdFxyXG4gICAgICA8L3NwYW4+XHJcbiAgICAgIHt7Y29tcG9uZW50OmZpbHRlcn19XHJcbiAgICAgIHt7P2NsZWFyVG9nZ2xlfX1cclxuICAgICAgPGJ1dHRvbiBpZD1cImNsZWFyLWNvbXBsZXRlZFwiIGNsYXNzPVwiY2xlYXItY29tcGxldGVkXCI+Q2xlYXIgY29tcGxldGVkPC9idXR0b24+XHJcbiAgICAgIHt7L2NsZWFyVG9nZ2xlfX1cclxuICAgIDwvZm9vdGVyPlxyXG4gICAge3svdG9kb1N0YXRlfX1cclxuICA8L3NlY3Rpb24+XHJcbiAgPGZvb3RlciBjbGFzcz1cImluZm9cIj5cclxuICAgIDxwPkRvdWJsZS1jbGljayB0byBlZGl0IGEgdG9kbzwvcD5cclxuICAgIDxwPkNyZWF0ZWQgYnkgPGEgaHJlZj1cImh0dHBzOi8vZ2l0aHViLmNvbS9zeWFydWxcIj5TaGFocnVsIE5pemFtIFNlbGFtYXQ8L2E+PC9wPlxyXG4gICAgPHA+UGFydCBvZiA8YSBocmVmPVwiaHR0cDovL3RvZG9tdmMuY29tXCI+VG9kb01WQzwvYT48L3A+XHJcbiAgPC9mb290ZXI+YFxyXG5cclxuY29uc3QgYXBwID0gbmV3IEFwcCgpXHJcblxyXG5hcHAubW91bnQodm1vZGVsKS5saW5rKCd0b2RvJylcclxuIiwiaW1wb3J0IHsgY2FtZWxDYXNlIH0gZnJvbSAnLi91dGlsJ1xyXG5pbXBvcnQgeyBjcmVhdGVNb2RlbCB9IGZyb20gJy4uL2tlZXQvdXRpbHMnXHJcblxyXG5jbGFzcyBDcmVhdGVGaWx0ZXJNb2RlbCBleHRlbmRzIGNyZWF0ZU1vZGVsIHtcclxuICBzd2l0Y2goaGFzaCwgb2JqKXtcclxuICAgIHRoaXMubGlzdCA9IHRoaXMubGlzdC5tYXAoZmlsdGVyID0+XHJcbiAgICAgIGZpbHRlci5oYXNoID09PSBoYXNoID8gKHsgLi4uZmlsdGVyLCAuLi5vYmp9KSA6ICh7IC4uLmZpbHRlciwgLi4ueyBzZWxlY3RlZDogZmFsc2UgfX0pXHJcbiAgICApXHJcbiAgfVxyXG59XHJcblxyXG5jb25zdCBmaWx0ZXJNb2RlbCA9IG5ldyBDcmVhdGVGaWx0ZXJNb2RlbCgpXHJcblxyXG5BcnJheS5mcm9tKFsnYWxsJywgJ2FjdGl2ZScsICdjb21wbGV0ZWQnXSkubWFwKHBhZ2UgPT4ge1xyXG5cdGZpbHRlck1vZGVsLmFkZCh7XHJcbiAgICAgIGhhc2g6ICcjLycgKyBwYWdlLFxyXG4gICAgICBuYW1lOiBjYW1lbENhc2UocGFnZSksXHJcbiAgICAgIHNlbGVjdGVkOiBmYWxzZVxyXG4gICAgfSlcclxufSlcclxuXHJcbm1vZHVsZS5leHBvcnRzID0gZmlsdGVyTW9kZWwiLCJpbXBvcnQgS2VldCBmcm9tICcuLi9rZWV0J1xyXG5pbXBvcnQgeyBodG1sIH0gZnJvbSAnLi4va2VldC91dGlscydcclxuaW1wb3J0IGZpbHRlcnMgZnJvbSAnLi9maWx0ZXItbW9kZWwnXHJcblxyXG5cclxuY2xhc3MgQXBwIGV4dGVuZHMgS2VldCB7XHJcbiAgZWwgPSAnZmlsdGVycydcclxuICBmaWx0ZXJNb2RlbCA9IGZpbHRlcnNcclxuICBjb21wb25lbnRXaWxsTW91bnQoKSB7XHJcbiAgICB0aGlzLmZpbHRlck1vZGVsLnN1YnNjcmliZShtb2RlbCA9PiB7XHJcbiAgICAgIHRoaXMuY2FsbEJhdGNoUG9vbFVwZGF0ZSgpXHJcbiAgICB9KVxyXG4gICAgaWYod2luZG93LmxvY2F0aW9uLmhhc2ggPT0gJycpIHtcclxuICAgICAgd2luZG93Lmhpc3RvcnkucHVzaFN0YXRlKHt9LCBudWxsLCAnIy9hbGwnKVxyXG4gICAgfVxyXG4gIH1cclxuICBjb21wb25lbnREaWRNb3VudCgpe1xyXG4gICAgY29uc29sZS5sb2coMSlcclxuICAgIHRoaXMudXBkYXRlVXJsKHdpbmRvdy5sb2NhdGlvbi5oYXNoKVxyXG4gICAgd2luZG93Lm9ucG9wc3RhdGUgPSAoKSA9PiB0aGlzLnVwZGF0ZVVybCh3aW5kb3cubG9jYXRpb24uaGFzaClcclxuICB9XHJcblxyXG4gIC8vIGNvbXBvbmVudERpZFVuTW91bnQoKXtcclxuICAgIC8vXHJcbiAgLy8gfVxyXG5cclxuICB1cGRhdGVVcmwoaGFzaCkge1xyXG4gICAgdGhpcy5maWx0ZXJNb2RlbC5zd2l0Y2goaGFzaCwgeyBzZWxlY3RlZDogdHJ1ZSB9KVxyXG4gIH1cclxufVxyXG5cclxuY29uc3QgZmlsdGVyQXBwID0gbmV3IEFwcCgpXHJcblxyXG5sZXQgdm1vZGVsID0gaHRtbGBcclxuXHQ8dWwgaWQ9XCJmaWx0ZXJzXCI+XHJcblx0XHR7e21vZGVsOmZpbHRlck1vZGVsfX1cclxuXHRcdDxsaSBrLWNsaWNrPVwidXBkYXRlVXJsKHt7aGFzaH19KVwiPjxhIGNsYXNzPVwie3tzZWxlY3RlZD9zZWxlY3RlZDonJ319XCIgaHJlZj1cInt7aGFzaH19XCI+e3tuYW1lfX08L2E+PC9saT5cclxuXHRcdHt7L21vZGVsOmZpbHRlck1vZGVsfX1cclxuXHQ8L3VsPlxyXG5gXHJcblxyXG5maWx0ZXJBcHAubW91bnQodm1vZGVsKVxyXG5cclxuZXhwb3J0IGRlZmF1bHQgZmlsdGVyQXBwIiwiaW1wb3J0IEtlZXQgZnJvbSAnLi4va2VldCdcclxuaW1wb3J0IHsgY3JlYXRlTW9kZWwgfSBmcm9tICcuLi9rZWV0L3V0aWxzJ1xyXG5cclxuY2xhc3MgQ3JlYXRlTW9kZWwgZXh0ZW5kcyBjcmVhdGVNb2RlbCB7XHJcblxyXG4gIGNsZWFyQ29tcGxldGVkKCkge1xyXG4gICAgdGhpcy5saXN0ID0gdGhpcy5saXN0LmZpbHRlcih0b2RvID0+ICF0b2RvLmNvbXBsZXRlZClcclxuICB9IFxyXG59XHJcblxyXG5jb25zdCB0b2RvcyA9IG5ldyBDcmVhdGVNb2RlbCgpXHJcblxyXG5leHBvcnQgZGVmYXVsdCB0b2Rvc1xyXG4iLCJjb25zdCBzdG9yZSA9IGZ1bmN0aW9uKG5hbWVzcGFjZSwgZGF0YSkge1xyXG4gIGlmIChhcmd1bWVudHMubGVuZ3RoID4gMSkge1xyXG4gICAgcmV0dXJuIGxvY2FsU3RvcmFnZS5zZXRJdGVtKG5hbWVzcGFjZSwgSlNPTi5zdHJpbmdpZnkoZGF0YSkpXHJcbiAgfSBlbHNlIHtcclxuICAgIHZhciBzdG9yZSA9IGxvY2FsU3RvcmFnZS5nZXRJdGVtKG5hbWVzcGFjZSlcclxuICAgIHJldHVybiBzdG9yZSAmJiBKU09OLnBhcnNlKHN0b3JlKSB8fCBbXVxyXG4gIH1cclxufVxyXG5cclxuY29uc3QgZ2VuSWQgPSBmdW5jdGlvbigpIHtcclxuICByZXR1cm4gKE1hdGgucm91bmQoTWF0aC5yYW5kb20oKSAqIDB4MSoxZTEyKSkudG9TdHJpbmcoMzIpXHJcbn1cclxuXHJcbmNvbnN0IGNhbWVsQ2FzZSA9IGZ1bmN0aW9uKHMpIHtcclxuICByZXR1cm4gcy5jaGFyQXQoMCkudG9VcHBlckNhc2UoKSArIHMuc2xpY2UoMSlcclxufVxyXG5cclxuY29uc3QgaHRtbCA9IGZ1bmN0aW9uIChsaXRlcmFsU2VjdGlvbnMsIC4uLnN1YnN0cykge1xyXG4gIC8vIFVzZSByYXcgbGl0ZXJhbCBzZWN0aW9uczogd2UgZG9u4oCZdCB3YW50XHJcbiAgLy8gYmFja3NsYXNoZXMgKFxcbiBldGMuKSB0byBiZSBpbnRlcnByZXRlZFxyXG4gIGxldCByYXcgPSBsaXRlcmFsU2VjdGlvbnMucmF3O1xyXG5cclxuICBsZXQgcmVzdWx0ID0gJyc7XHJcblxyXG4gIHN1YnN0cy5mb3JFYWNoKChzdWJzdCwgaSkgPT4ge1xyXG4gICAgICAvLyBSZXRyaWV2ZSB0aGUgbGl0ZXJhbCBzZWN0aW9uIHByZWNlZGluZ1xyXG4gICAgICAvLyB0aGUgY3VycmVudCBzdWJzdGl0dXRpb25cclxuICAgICAgbGV0IGxpdCA9IHJhd1tpXTtcclxuXHJcbiAgICAgIC8vIEluIHRoZSBleGFtcGxlLCBtYXAoKSByZXR1cm5zIGFuIGFycmF5OlxyXG4gICAgICAvLyBJZiBzdWJzdGl0dXRpb24gaXMgYW4gYXJyYXkgKGFuZCBub3QgYSBzdHJpbmcpLFxyXG4gICAgICAvLyB3ZSB0dXJuIGl0IGludG8gYSBzdHJpbmdcclxuICAgICAgaWYgKEFycmF5LmlzQXJyYXkoc3Vic3QpKSB7XHJcbiAgICAgICAgICBzdWJzdCA9IHN1YnN0LmpvaW4oJycpO1xyXG4gICAgICB9XHJcblxyXG4gICAgICAvLyBJZiB0aGUgc3Vic3RpdHV0aW9uIGlzIHByZWNlZGVkIGJ5IGEgZG9sbGFyIHNpZ24sXHJcbiAgICAgIC8vIHdlIGVzY2FwZSBzcGVjaWFsIGNoYXJhY3RlcnMgaW4gaXRcclxuICAgICAgaWYgKGxpdC5lbmRzV2l0aCgnJCcpKSB7XHJcbiAgICAgICAgICBzdWJzdCA9IGh0bWxFc2NhcGUoc3Vic3QpO1xyXG4gICAgICAgICAgbGl0ID0gbGl0LnNsaWNlKDAsIC0xKTtcclxuICAgICAgfVxyXG4gICAgICByZXN1bHQgKz0gbGl0O1xyXG4gICAgICByZXN1bHQgKz0gc3Vic3Q7XHJcbiAgfSk7XHJcbiAgLy8gVGFrZSBjYXJlIG9mIGxhc3QgbGl0ZXJhbCBzZWN0aW9uXHJcbiAgLy8gKE5ldmVyIGZhaWxzLCBiZWNhdXNlIGFuIGVtcHR5IHRlbXBsYXRlIHN0cmluZ1xyXG4gIC8vIHByb2R1Y2VzIG9uZSBsaXRlcmFsIHNlY3Rpb24sIGFuIGVtcHR5IHN0cmluZylcclxuICByZXN1bHQgKz0gcmF3W3Jhdy5sZW5ndGgtMV07IC8vIChBKVxyXG5cclxuICByZXR1cm4gcmVzdWx0O1xyXG59XHJcblxyXG5leHBvcnQge1xyXG4gIGh0bWwgYXMgZGVmYXVsdCxcclxuICBnZW5JZCxcclxuICBzdG9yZSxcclxuICBjYW1lbENhc2VcclxufSJdfQ==
