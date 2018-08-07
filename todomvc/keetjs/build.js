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
var tmplHandler = require('./tmplHandler')
var processEvent = require('./processEvent')
var getId = require('../utils').getId
var testEvent = require('../utils').testEvent
var loopChilds = require('../utils').loopChilds
var checkNodeAvailability = require('../utils').checkNodeAvailability
var strInterpreter = require('./strInterpreter')
var componentParse = require('./componentParse')
var modelParse = require('./modelParse')
var nodesVisibility = require('./nodesVisibility')
var morph = require('morphdom')

var has = 0

var updateContext = function () {
  var self = this
  var ele = getId(this.el)
  var newElem = genElement.call(this)
  var frag = []
  // morp as sub-component
  if (this.IS_STUB) {
    morph(ele, newElem.childNodes[0])
    // processEvent.call(this, ele)
  } else {
  // otherwise moph as whole
    newElem.id = this.el
    morph(ele, newElem)
    has++
    if(has === 2){
      processEvent.call(this, ele)
    }
    // clean up document creation from potential memory leaks
    loopChilds(frag, newElem)
    frag.map(function (fragment) {
      fragment.remove()
    })
    // sub-component life-cycle
    this.__componentList__.map(function (component) {
      if(self[component]){
        var c = self[component]
        checkNodeAvailability(c, null, function(){
          if (!c.DID_MOUNT && c.componentDidMount && typeof c.componentDidMount === 'function') {
            c.DID_MOUNT = true
            c.componentDidMount()
          }
        }, function(){
          if (c.DID_MOUNT && c.componentDidUnMount && typeof c.componentDidUnMount === 'function') {
            c.DID_MOUNT = false
            c.componentDidUnMount()
          }
        })
      }
    })
  }
  // exec life-cycle componentDidUpdate
  if (this.componentDidUpdate && typeof this.componentDidUpdate === 'function') {
    this.componentDidUpdate()
  }

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
    }, 100)
  }
}

var nextState = function (i) {
  var self = this
  if (i < this.__stateList__.length) {
    var state = this.__stateList__[i]
    var value = this[state]
    // if value is undefined, likely has object notation we convert it to array
    if (value === undefined) value = strInterpreter(state)

    if (value && Array.isArray(value)) {
      // using split object notation as base for state update
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

var setState = function (args) {
  nextState.call(this, 0)
}

var updateStateList = function (state) {
  if (!~this.__stateList__.indexOf(state)) this.__stateList__ = this.__stateList__.concat(state)
}

var genElement = function (force) {
  var tempDiv = document.createElement('div')
  var tpl = tmplHandler.call(this, updateStateList.bind(this))
  tpl = componentParse.call(this, tpl)
  tpl = modelParse.call(this, tpl)
  tpl = nodesVisibility.call(this, tpl)
  tempDiv.innerHTML = tpl

  setState.call(this)
  if (force) batchPoolExec.call(this)
  return tempDiv
}

exports.genElement = genElement
exports.setState = setState
exports.updateStateList = updateStateList

},{"../utils":13,"./componentParse":1,"./modelParse":4,"./nodesVisibility":5,"./processEvent":7,"./strInterpreter":8,"./tmplHandler":10,"morphdom":12}],3:[function(require,module,exports){
var ternaryOps = require('./ternaryOps')
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
  }
  return tmpl
}

},{"./ternaryOps":9}],4:[function(require,module,exports){
var genModelTemplate = require('./genModelTemplate')
module.exports = function (string) {
  var self = this
  this.__modelList__.map(function (model, index) {
    if (self[model]) {
      var regx = '(\\{\\{model:' + model + '\\}\\})(.*?)(\\{\\{\\/model:' + model + '\\}\\})'
      var re = new RegExp(regx)
      var match = string.match(re)
      if (match) {
        var matchPristine = self.base.match(re)
        var modelTemplate = ''
        self[model]['list'].map(function (obj) {
          modelTemplate += genModelTemplate.call(self, matchPristine[2], obj)
        })
        string = string.replace(match[2], modelTemplate)
      }
    }
    string = string.replace('{{model:' + model + '}}', '')
    string = string.replace('{{/model:' + model + '}}', '')
  })
  return string
}

},{"./genModelTemplate":3}],5:[function(require,module,exports){
module.exports = function (string) {
  var self = this
  this.__stateList__.map(function (state) {
    if (!self[state]) {
      var f = '\\{\\{\\?' + state + '\\}\\}'
      var b = '\\{\\{\\/' + state + '\\}\\}'
      // var regx = '(?<=' + f + ')(.*?)(?=' + b + ')'
      // ** old browser does not support positive look behind **
      var regx = '(' + f + ')(.*?)(?=' + b + ')'
      var re = new RegExp(regx)
      var isConditional = re.test(string)
      var match = string.match(re)
      if (isConditional && match) {
        string = string.replace(match[2], '')
      }
    }
    string = string.replace('{{?' + state + '}}', '')
    string = string.replace('{{/' + state + '}}', '')
  })
  return string
}

},{}],6:[function(require,module,exports){
var setState = require('./genElement').setState
var tmplHandler = require('./tmplHandler')
var processEvent = require('./processEvent')
var getId = require('../utils').getId
var testEvent = require('../utils').testEvent
var componentParse = require('./componentParse')
var modelParse = require('./modelParse')
var nodesVisibility = require('./nodesVisibility')
var checkNodeAvailability = require('../utils').checkNodeAvailability

var renderSub = function (c, cName, node) {
  c.stubRender(this.__componentStub__[cName], node)
}

module.exports = function (stub) {
  var self = this
  var el
  var tpl
  if (typeof this.base === 'string') {
    this.__stateList__ = this.__stateList__ || []
    this.__modelList__ = this.__modelList__ || []
    this.__componentList__ = this.__componentList__ || []
    this.__componentStub__ = this.__componentStub__ || {}
    tpl = tmplHandler.call(this, function (state) {
      if (!~self.__stateList__.indexOf(state)) self.__stateList__ = self.__stateList__.concat(state)
    })
    tpl = componentParse.call(this, tpl)
    tpl = modelParse.call(this, tpl)
    tpl = nodesVisibility.call(this, tpl)
    if (stub) {
      return tpl
    } else {
      el = getId(this.el)
      if (el) {
        el.innerHTML = tpl
        this.__componentList__.map(function (componentName) {
          var component = self[componentName]
          if (component) {
            // do initial checking of the node availability
            var node = checkNodeAvailability(component, componentName, renderSub.bind(self))
            if (node) renderSub.call(self, component, componentName, node)
          }
        })
        setState.call(this)
        testEvent(tpl) && processEvent.call(this, el)

        // since component already rendered, trigger its life-cycle method
        if (this.componentDidMount && typeof this.componentDidMount === 'function') {
          this.componentDidMount()
        }
      }
    }
  }
}

},{"../utils":13,"./componentParse":1,"./genElement":2,"./modelParse":4,"./nodesVisibility":5,"./processEvent":7,"./tmplHandler":10}],7:[function(require,module,exports){
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
  var self = this
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

        var fn = function(e){
          e.stopPropagation()
          if (e.target !== e.currentTarget) {
            isHandler.apply(self, argv.concat(e))
          }
        }
        if(c.hasAttribute('evt-node')){
          c.addEventListener(evtName, fn, false)
        } else{
          c.addEventListener(evtName, isHandler.bind.apply(isHandler.bind(this), [c].concat(argv)), false)
        }
        console.log(c)
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

},{"../utils":13}],8:[function(require,module,exports){
module.exports = function (str) {
  var res = str.match(/\.*\./g)
  var result
  if (res && res.length > 0) {
    return str.split('.')
  }
  return result
}

},{}],9:[function(require,module,exports){
// function to resolve ternary operation

function test (str) {
  if (str === '\'\'' || str === '""') { return '' }
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

},{}],10:[function(require,module,exports){
var strInterpreter = require('./strInterpreter')
var ternaryOps = require('./ternaryOps')
module.exports = function (updateStateList) {
  var self = this
  var str = this.base
  var arrProps = str.match(/{{([^{}]+)}}/g)
  if (arrProps && arrProps.length) {
    arrProps.map(function (s) {
      var rep = s.replace(/{{([^{}]+)}}/g, '$1')
      var isObjectNotation = strInterpreter(rep)
      var isTernary = ternaryOps.call(self, rep)
      if (!isObjectNotation) {
        if (self[rep] !== undefined) {
          updateStateList(rep)
          str = str.replace('{{' + rep + '}}', self[rep])
        } else if (isTernary) {
          updateStateList(isTernary.state)
          str = str.replace('{{' + rep + '}}', isTernary.value)
        }
      } else {
        updateStateList(rep)
        str = str.replace('{{' + rep + '}}', self[isObjectNotation[0]][isObjectNotation[1]])
      }
      // resolve nodeVisibility
      if (rep.match(/^\?/g)) {
        updateStateList(rep.replace('?', ''))
      }
      // resolve model
      if (rep.match(/^model:/g)) {
        var modelRep = rep.replace('model:', '')
        if (!~self.__modelList__.indexOf(modelRep)) { self.__modelList__.push(modelRep) }
      }
      // resolve component
      if (rep.match(/^component:/g)) {
        var componentRep = rep.replace('component:', '')
        if (!~self.__componentList__.indexOf(componentRep)) { self.__componentList__.push(componentRep) }
      }
    })
  }
  return str
}

},{"./strInterpreter":8,"./ternaryOps":9}],11:[function(require,module,exports){
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
var processEvent = require('./components/processEvent')
var getId = require('./utils').getId
var testEvent = require('./utils').testEvent
var loopChilds = require('./utils').loopChilds
var assert = require('./utils').assert

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
  var frag = []
  // Before we begin to parse an instance, do a run-down checks
  // to clean up back-tick string which usually has line spacing.
  if (typeof instance === 'string') {
    base = instance.trim().replace(/\s+/g, ' ')
  // If instance is a html element (usually using template literals),
  // convert it back to string.
  } else if (typeof instance === 'object' && instance['nodeType']) {
    if (instance['nodeType'] === 1) {
      base = instance.outerHTML.toString()
    } else if (instance['nodeType'] === 11 || instance['nodeType'] === 3) {
      var serializer = new XMLSerializer()
      base = serializer.serializeToString(instance)
    } else {
      assert(false, 'Unable to parse instance, unknown type.')
    }
    // clean up document creation from potential memory leaks
    loopChilds(frag, instance)
    frag.map(function (fragment) { fragment.remove() })
  } else {
    assert(typeof instance === 'string' || typeof instance === 'object', 'Parameter is not a string or a html element.')
  }
  // we store the pristine instance in Component.base
  this.base = base
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

Keet.prototype.callBatchPoolUpdate = function () {
  // force component to update, if any state / non-state
  // value changed DOM diffing will occur
  genElement.call(this, true)
}

module.exports = Keet

},{"./components/genElement":2,"./components/parseStr":6,"./components/processEvent":7,"./utils":13}],12:[function(require,module,exports){
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

},{}],13:[function(require,module,exports){
'use strict';

var cov_18r9707xyl = function () {
  var path = 'C:\\Users\\User\\distro\\preact-perf\\todomvc\\keetjs\\keet\\utils.js',
      hash = 'de19f76c5cd3683db747b4d024bec22a3833d569',
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
          column: 17
        },
        end: {
          line: 14,
          column: 1
        }
      },
      '4': {
        start: {
          line: 8,
          column: 2
        },
        end: {
          line: 13,
          column: 3
        }
      },
      '5': {
        start: {
          line: 9,
          column: 4
        },
        end: {
          line: 9,
          column: 19
        }
      },
      '6': {
        start: {
          line: 10,
          column: 4
        },
        end: {
          line: 12,
          column: 5
        }
      },
      '7': {
        start: {
          line: 11,
          column: 6
        },
        end: {
          line: 11,
          column: 28
        }
      },
      '8': {
        start: {
          line: 16,
          column: 0
        },
        end: {
          line: 16,
          column: 31
        }
      },
      '9': {
        start: {
          line: 18,
          column: 0
        },
        end: {
          line: 20,
          column: 1
        }
      },
      '10': {
        start: {
          line: 19,
          column: 2
        },
        end: {
          line: 19,
          column: 25
        }
      },
      '11': {
        start: {
          line: 30,
          column: 0
        },
        end: {
          line: 49,
          column: 1
        }
      },
      '12': {
        start: {
          line: 31,
          column: 12
        },
        end: {
          line: 31,
          column: 31
        }
      },
      '13': {
        start: {
          line: 32,
          column: 14
        },
        end: {
          line: 32,
          column: 19
        }
      },
      '14': {
        start: {
          line: 33,
          column: 2
        },
        end: {
          line: 48,
          column: 3
        }
      },
      '15': {
        start: {
          line: 33,
          column: 11
        },
        end: {
          line: 33,
          column: 21
        }
      },
      '16': {
        start: {
          line: 35,
          column: 12
        },
        end: {
          line: 42,
          column: 9
        }
      },
      '17': {
        start: {
          line: 36,
          column: 6
        },
        end: {
          line: 36,
          column: 31
        }
      },
      '18': {
        start: {
          line: 37,
          column: 6
        },
        end: {
          line: 41,
          column: 7
        }
      },
      '19': {
        start: {
          line: 38,
          column: 8
        },
        end: {
          line: 38,
          column: 24
        }
      },
      '20': {
        start: {
          line: 39,
          column: 8
        },
        end: {
          line: 39,
          column: 20
        }
      },
      '21': {
        start: {
          line: 40,
          column: 8
        },
        end: {
          line: 40,
          column: 47
        }
      },
      '22': {
        start: {
          line: 44,
          column: 4
        },
        end: {
          line: 47,
          column: 11
        }
      },
      '23': {
        start: {
          line: 45,
          column: 6
        },
        end: {
          line: 45,
          column: 22
        }
      },
      '24': {
        start: {
          line: 46,
          column: 6
        },
        end: {
          line: 46,
          column: 73
        }
      },
      '25': {
        start: {
          line: 46,
          column: 63
        },
        end: {
          line: 46,
          column: 73
        }
      },
      '26': {
        start: {
          line: 60,
          column: 0
        },
        end: {
          line: 62,
          column: 1
        }
      },
      '27': {
        start: {
          line: 61,
          column: 2
        },
        end: {
          line: 61,
          column: 44
        }
      },
      '28': {
        start: {
          line: 61,
          column: 12
        },
        end: {
          line: 61,
          column: 44
        }
      },
      '29': {
        start: {
          line: 75,
          column: 0
        },
        end: {
          line: 88,
          column: 1
        }
      },
      '30': {
        start: {
          line: 76,
          column: 17
        },
        end: {
          line: 76,
          column: 41
        }
      },
      '31': {
        start: {
          line: 77,
          column: 15
        },
        end: {
          line: 77,
          column: 39
        }
      },
      '32': {
        start: {
          line: 79,
          column: 15
        },
        end: {
          line: 81,
          column: 4
        }
      },
      '33': {
        start: {
          line: 80,
          column: 4
        },
        end: {
          line: 80,
          column: 36
        }
      },
      '34': {
        start: {
          line: 83,
          column: 2
        },
        end: {
          line: 83,
          column: 30
        }
      },
      '35': {
        start: {
          line: 84,
          column: 2
        },
        end: {
          line: 86,
          column: 13
        }
      },
      '36': {
        start: {
          line: 85,
          column: 4
        },
        end: {
          line: 85,
          column: 19
        }
      },
      '37': {
        start: {
          line: 87,
          column: 2
        },
        end: {
          line: 87,
          column: 15
        }
      },
      '38': {
        start: {
          line: 101,
          column: 14
        },
        end: {
          line: 101,
          column: 16
        }
      },
      '39': {
        start: {
          line: 102,
          column: 18
        },
        end: {
          line: 102,
          column: 20
        }
      },
      '40': {
        start: {
          line: 104,
          column: 15
        },
        end: {
          line: 109,
          column: 3
        }
      },
      '41': {
        start: {
          line: 106,
          column: 4
        },
        end: {
          line: 108,
          column: 5
        }
      },
      '42': {
        start: {
          line: 107,
          column: 6
        },
        end: {
          line: 107,
          column: 25
        }
      },
      '43': {
        start: {
          line: 116,
          column: 2
        },
        end: {
          line: 126,
          column: 4
        }
      },
      '44': {
        start: {
          line: 120,
          column: 6
        },
        end: {
          line: 120,
          column: 18
        }
      },
      '45': {
        start: {
          line: 123,
          column: 6
        },
        end: {
          line: 123,
          column: 17
        }
      },
      '46': {
        start: {
          line: 124,
          column: 6
        },
        end: {
          line: 124,
          column: 14
        }
      },
      '47': {
        start: {
          line: 136,
          column: 2
        },
        end: {
          line: 138,
          column: 3
        }
      },
      '48': {
        start: {
          line: 137,
          column: 4
        },
        end: {
          line: 137,
          column: 22
        }
      },
      '49': {
        start: {
          line: 148,
          column: 2
        },
        end: {
          line: 150,
          column: 3
        }
      },
      '50': {
        start: {
          line: 149,
          column: 4
        },
        end: {
          line: 149,
          column: 37
        }
      },
      '51': {
        start: {
          line: 161,
          column: 2
        },
        end: {
          line: 165,
          column: 3
        }
      },
      '52': {
        start: {
          line: 162,
          column: 4
        },
        end: {
          line: 164,
          column: 6
        }
      },
      '53': {
        start: {
          line: 163,
          column: 6
        },
        end: {
          line: 163,
          column: 88
        }
      },
      '54': {
        start: {
          line: 176,
          column: 2
        },
        end: {
          line: 180,
          column: 3
        }
      },
      '55': {
        start: {
          line: 177,
          column: 4
        },
        end: {
          line: 179,
          column: 6
        }
      },
      '56': {
        start: {
          line: 178,
          column: 6
        },
        end: {
          line: 178,
          column: 36
        }
      },
      '57': {
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
            line: 7,
            column: 17
          },
          end: {
            line: 7,
            column: 18
          }
        },
        loc: {
          start: {
            line: 7,
            column: 38
          },
          end: {
            line: 14,
            column: 1
          }
        },
        line: 7
      },
      '2': {
        name: '(anonymous_2)',
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
      '3': {
        name: '(anonymous_3)',
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
      '4': {
        name: '(anonymous_4)',
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
      '5': {
        name: '(anonymous_5)',
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
      '6': {
        name: '(anonymous_6)',
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
      '7': {
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
      '8': {
        name: '(anonymous_8)',
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
      '9': {
        name: '(anonymous_9)',
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
      '10': {
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
      '11': {
        name: '(anonymous_11)',
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
      '12': {
        name: '(anonymous_12)',
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
      '13': {
        name: '(anonymous_13)',
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
      '14': {
        name: '(anonymous_14)',
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
      '15': {
        name: '(anonymous_15)',
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
      '16': {
        name: '(anonymous_16)',
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
      '17': {
        name: '(anonymous_17)',
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
      '18': {
        name: '(anonymous_18)',
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
      '19': {
        name: '(anonymous_19)',
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
            line: 10,
            column: 4
          },
          end: {
            line: 12,
            column: 5
          }
        },
        type: 'if',
        locations: [{
          start: {
            line: 10,
            column: 4
          },
          end: {
            line: 12,
            column: 5
          }
        }, {
          start: {
            line: 10,
            column: 4
          },
          end: {
            line: 12,
            column: 5
          }
        }],
        line: 10
      },
      '1': {
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
      '2': {
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
      '3': {
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
      '4': {
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
      '5': {
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
      '6': {
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
      '51': 0,
      '52': 0,
      '53': 0,
      '54': 0,
      '55': 0,
      '56': 0,
      '57': 0
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
      '19': 0
    },
    b: {
      '0': [0, 0],
      '1': [0, 0],
      '2': [0, 0],
      '3': [0, 0],
      '4': [0, 0, 0],
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

cov_18r9707xyl.s[0]++;
var getId = function getId(id) {
  cov_18r9707xyl.f[0]++;
  cov_18r9707xyl.s[1]++;

  return document.getElementById(id);
};

cov_18r9707xyl.s[2]++;
exports.getId = getId;

cov_18r9707xyl.s[3]++;
var loopChilds = function loopChilds(arr, elem) {
  cov_18r9707xyl.f[1]++;
  cov_18r9707xyl.s[4]++;

  for (var child = elem.firstChild; child !== null; child = child.nextSibling) {
    cov_18r9707xyl.s[5]++;

    arr.push(child);
    cov_18r9707xyl.s[6]++;
    if (child.hasChildNodes()) {
      cov_18r9707xyl.b[0][0]++;
      cov_18r9707xyl.s[7]++;

      loopChilds(arr, child);
    } else {
      cov_18r9707xyl.b[0][1]++;
    }
  }
};

cov_18r9707xyl.s[8]++;
exports.loopChilds = loopChilds;

cov_18r9707xyl.s[9]++;
exports.testEvent = function (tmpl) {
  cov_18r9707xyl.f[2]++;
  cov_18r9707xyl.s[10]++;

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
cov_18r9707xyl.s[11]++;
exports.checkNodeAvailability = function (component, componentName, callback, notFound) {
  cov_18r9707xyl.f[3]++;

  var ele = (cov_18r9707xyl.s[12]++, getId(component.el));
  var found = (cov_18r9707xyl.s[13]++, false);
  cov_18r9707xyl.s[14]++;
  if (ele) {
      cov_18r9707xyl.b[1][0]++;
      cov_18r9707xyl.s[15]++;
      return ele;
    } else {
    cov_18r9707xyl.b[1][1]++;

    var t = (cov_18r9707xyl.s[16]++, setInterval(function () {
      cov_18r9707xyl.f[4]++;
      cov_18r9707xyl.s[17]++;

      ele = getId(component.el);
      cov_18r9707xyl.s[18]++;
      if (ele) {
        cov_18r9707xyl.b[2][0]++;
        cov_18r9707xyl.s[19]++;

        clearInterval(t);
        cov_18r9707xyl.s[20]++;
        found = true;
        cov_18r9707xyl.s[21]++;
        callback(component, componentName, ele);
      } else {
        cov_18r9707xyl.b[2][1]++;
      }
    }, 0));
    // silently ignore finding the node after sometimes
    cov_18r9707xyl.s[22]++;
    setTimeout(function () {
      cov_18r9707xyl.f[5]++;
      cov_18r9707xyl.s[23]++;

      clearInterval(t);
      cov_18r9707xyl.s[24]++;
      if ((cov_18r9707xyl.b[4][0]++, !found) && (cov_18r9707xyl.b[4][1]++, notFound) && (cov_18r9707xyl.b[4][2]++, typeof notFound === 'function')) {
          cov_18r9707xyl.b[3][0]++;
          cov_18r9707xyl.s[25]++;
          notFound();
        } else {
        cov_18r9707xyl.b[3][1]++;
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
cov_18r9707xyl.s[26]++;
exports.assert = function (val, msg) {
  cov_18r9707xyl.f[6]++;
  cov_18r9707xyl.s[27]++;

  if (!val) {
      cov_18r9707xyl.b[5][0]++;
      cov_18r9707xyl.s[28]++;
      throw new Error('(keet) ' + msg);
    } else {
    cov_18r9707xyl.b[5][1]++;
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
cov_18r9707xyl.s[29]++;
exports.html = function html() {
  cov_18r9707xyl.f[7]++;

  var literals = (cov_18r9707xyl.s[30]++, [].shift.call(arguments));
  var substs = (cov_18r9707xyl.s[31]++, [].slice.call(arguments));

  var result = (cov_18r9707xyl.s[32]++, literals.raw.reduce(function (acc, lit, i) {
    cov_18r9707xyl.f[8]++;
    cov_18r9707xyl.s[33]++;

    return acc + substs[i - 1] + lit;
  }));
  // remove spacing, indentation from every line
  cov_18r9707xyl.s[34]++;
  result = result.split(/\n+/);
  cov_18r9707xyl.s[35]++;
  result = result.map(function (t) {
    cov_18r9707xyl.f[9]++;
    cov_18r9707xyl.s[36]++;

    return t.trim();
  }).join('');
  cov_18r9707xyl.s[37]++;
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
  cov_18r9707xyl.f[10]++;

  var model = (cov_18r9707xyl.s[38]++, []);
  var onChanges = (cov_18r9707xyl.s[39]++, []);

  cov_18r9707xyl.s[40]++;
  var inform = function inform() {
    cov_18r9707xyl.f[11]++;
    cov_18r9707xyl.s[41]++;

    // console.trace(onChanges)
    for (var i = onChanges.length; i--;) {
      cov_18r9707xyl.s[42]++;

      onChanges[i](model);
    }
  };

  /**
   * @private
   * @description
   * Register callback listener of any changes
   */
  cov_18r9707xyl.s[43]++;
  Object.defineProperty(this, 'list', {
    enumerable: false,
    configurable: true,
    get: function get() {
      cov_18r9707xyl.f[12]++;
      cov_18r9707xyl.s[44]++;

      return model;
    },
    set: function set(val) {
      cov_18r9707xyl.f[13]++;
      cov_18r9707xyl.s[45]++;

      model = val;
      cov_18r9707xyl.s[46]++;
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
  cov_18r9707xyl.s[47]++;
  this.subscribe = function (fn) {
    cov_18r9707xyl.f[14]++;
    cov_18r9707xyl.s[48]++;

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
  cov_18r9707xyl.s[49]++;
  this.add = function (obj) {
    cov_18r9707xyl.f[15]++;
    cov_18r9707xyl.s[50]++;

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
  cov_18r9707xyl.s[51]++;
  this.update = function (lookupId, updateObj) {
    cov_18r9707xyl.f[16]++;
    cov_18r9707xyl.s[52]++;

    this.list = this.list.map(function (obj) {
      cov_18r9707xyl.f[17]++;
      cov_18r9707xyl.s[53]++;

      return obj[lookupId] !== updateObj[lookupId] ? (cov_18r9707xyl.b[6][0]++, obj) : (cov_18r9707xyl.b[6][1]++, Object.assign(obj, updateObj));
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
  cov_18r9707xyl.s[54]++;
  this.destroy = function (lookupId, objId) {
    cov_18r9707xyl.f[18]++;
    cov_18r9707xyl.s[55]++;

    this.list = this.list.filter(function (obj) {
      cov_18r9707xyl.f[19]++;
      cov_18r9707xyl.s[56]++;

      return obj[lookupId] !== objId;
    });
  };
}

cov_18r9707xyl.s[57]++;
exports.createModel = createModel;

},{}],14:[function(require,module,exports){
'use strict';

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _templateObject = _taggedTemplateLiteral(['\n  <section id="todoapp">\n    <header id="header">\n      <h1>todos</h1>\n      <input id="new-todo" k-keydown="create()" placeholder="What needs to be done?" autofocus>\n    </header>\n    {{?todoState}}\n    <section id="main">\n      <input id="toggle-all" type="checkbox" {{isChecked?checked:\'\'}} k-click="completeAll()">\n      <label for="toggle-all">Mark all as complete</label>\n      <ul id="todo-list" k-click="evtTodo()" k-dblclick="editMode()" evt-node>\n        {{model:todoModel}}\n          <li id="{{id}}" class="{{completed?completed:\'\'}}">\n            <div class="view">\n              <input class="toggle" type="checkbox" {{completed?checked:\'\'}}>\n              <label>{{title}}</label>\n              <button class="destroy"></button>\n            </div>\n            <input class="edit" value="{{title}}">\n          </li>\n        {{/model:todoModel}}\n      </ul>\n    </section>\n    <footer id="footer">\n      <span id="todo-count">\n        <strong>{{count}}</strong> item{{plural}} left\n      </span>\n      {{component:filter}}\n      {{?clearToggle}}\n      <button id="clear-completed" k-click="clearCompleted()">Clear completed</button>\n      {{/clearToggle}}\n    </footer>\n    {{/todoState}}\n  </section>\n  <footer id="info">\n    <p>Double-click to edit a todo</p>\n    <p>Created by <a href="https://github.com/syarul">Shahrul Nizam Selamat</a></p>\n    <p>Part of <a href="http://todomvc.com">TodoMVC</a></p>\n  </footer>'], ['\n  <section id="todoapp">\n    <header id="header">\n      <h1>todos</h1>\n      <input id="new-todo" k-keydown="create()" placeholder="What needs to be done?" autofocus>\n    </header>\n    {{?todoState}}\n    <section id="main">\n      <input id="toggle-all" type="checkbox" {{isChecked?checked:\'\'}} k-click="completeAll()">\n      <label for="toggle-all">Mark all as complete</label>\n      <ul id="todo-list" k-click="evtTodo()" k-dblclick="editMode()" evt-node>\n        {{model:todoModel}}\n          <li id="{{id}}" class="{{completed?completed:\'\'}}">\n            <div class="view">\n              <input class="toggle" type="checkbox" {{completed?checked:\'\'}}>\n              <label>{{title}}</label>\n              <button class="destroy"></button>\n            </div>\n            <input class="edit" value="{{title}}">\n          </li>\n        {{/model:todoModel}}\n      </ul>\n    </section>\n    <footer id="footer">\n      <span id="todo-count">\n        <strong>{{count}}</strong> item{{plural}} left\n      </span>\n      {{component:filter}}\n      {{?clearToggle}}\n      <button id="clear-completed" k-click="clearCompleted()">Clear completed</button>\n      {{/clearToggle}}\n    </footer>\n    {{/todoState}}\n  </section>\n  <footer id="info">\n    <p>Double-click to edit a todo</p>\n    <p>Created by <a href="https://github.com/syarul">Shahrul Nizam Selamat</a></p>\n    <p>Part of <a href="http://todomvc.com">TodoMVC</a></p>\n  </footer>']);

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

var vmodel = html(_templateObject);

var app = new App();

app.mount(vmodel).link('todo');

},{"../keet":11,"../keet/utils":13,"./filter":16,"./todo":17,"./todoModel":18,"./util":19}],15:[function(require,module,exports){
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

},{"../keet/utils":13,"./util":19}],16:[function(require,module,exports){
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

},{"../keet":11,"./filter-model":15,"./util":19}],17:[function(require,module,exports){
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

},{"../keet":11,"../keet/utils":13}],18:[function(require,module,exports){
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

},{"./util":19}],19:[function(require,module,exports){
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

},{}]},{},[14])
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uL0FwcERhdGEvUm9hbWluZy9ucG0vbm9kZV9tb2R1bGVzL2Jyb3dzZXJpZnkvbm9kZV9tb2R1bGVzL2Jyb3dzZXItcGFjay9fcHJlbHVkZS5qcyIsImtlZXQvY29tcG9uZW50cy9jb21wb25lbnRQYXJzZS5qcyIsImtlZXQvY29tcG9uZW50cy9nZW5FbGVtZW50LmpzIiwia2VldC9jb21wb25lbnRzL2dlbk1vZGVsVGVtcGxhdGUuanMiLCJrZWV0L2NvbXBvbmVudHMvbW9kZWxQYXJzZS5qcyIsImtlZXQvY29tcG9uZW50cy9ub2Rlc1Zpc2liaWxpdHkuanMiLCJrZWV0L2NvbXBvbmVudHMvcGFyc2VTdHIuanMiLCJrZWV0L2NvbXBvbmVudHMvcHJvY2Vzc0V2ZW50LmpzIiwia2VldC9jb21wb25lbnRzL3N0ckludGVycHJldGVyLmpzIiwia2VldC9jb21wb25lbnRzL3Rlcm5hcnlPcHMuanMiLCJrZWV0L2NvbXBvbmVudHMvdG1wbEhhbmRsZXIuanMiLCJrZWV0L2tlZXQuanMiLCJrZWV0L25vZGVfbW9kdWxlcy9tb3JwaGRvbS9kaXN0L21vcnBoZG9tLmpzIiwia2VldC91dGlscy5qcyIsInNyYy9hcHAuanMiLCJzcmMvZmlsdGVyLW1vZGVsLmpzIiwic3JjL2ZpbHRlci5qcyIsInNyYy90b2RvLmpzIiwic3JjL3RvZG9Nb2RlbC5qcyIsInNyYy91dGlsLmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBO0FDQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2pCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ25LQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ25CQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3RCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNyQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDdERBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzVEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDUkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM1QkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3pDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNqSUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7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QVIsVUFBUTtBQUFBOztBQU9uRCxTQUFPLE9BQVAsQ0FBZSxVQUFDLEtBQUQsRUFBUSxDQUFSLEVBQWM7QUFDekI7QUFDQTtBQUNBLFFBQUksTUFBTSxJQUFJLENBQUosQ0FBVjs7QUFFQTtBQUNBO0FBQ0E7QUFDQSxRQUFJLE1BQU0sT0FBTixDQUFjLEtBQWQsQ0FBSixFQUEwQjtBQUN0QixjQUFRLE1BQU0sSUFBTixDQUFXLEVBQVgsQ0FBUjtBQUNIOztBQUVEO0FBQ0E7QUFDQSxRQUFJLElBQUksUUFBSixDQUFhLEdBQWIsQ0FBSixFQUF1QjtBQUNuQixjQUFRLFdBQVcsS0FBWCxDQUFSO0FBQ0EsWUFBTSxJQUFJLEtBQUosQ0FBVSxDQUFWLEVBQWEsQ0FBQyxDQUFkLENBQU47QUFDSDtBQUNELGNBQVUsR0FBVjtBQUNBLGNBQVUsS0FBVjtBQUNILEdBcEJEO0FBcUJBO0FBQ0E7QUFDQTtBQUNBLFlBQVUsSUFBSSxJQUFJLE1BQUosR0FBVyxDQUFmLENBQVYsQ0EvQm1ELENBK0J0Qjs7QUFFN0IsU0FBTyxNQUFQO0FBQ0QsQ0FsQ0Q7O0FBb0NBLFFBQVEsYUFBUixHQUF3QixVQUFTLEtBQVQsRUFBZ0IsUUFBaEIsRUFBMEI7QUFDaEQ7QUFDQSxNQUFJLEtBQUosRUFBVyxhQUFhLEtBQWI7QUFDWCxVQUFRLFdBQVcsWUFBVztBQUM1QjtBQUNELEdBRk8sRUFFTCxFQUZLLENBQVI7QUFHRCxDQU5EIiwiZmlsZSI6ImdlbmVyYXRlZC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzQ29udGVudCI6WyIoZnVuY3Rpb24gZSh0LG4scil7ZnVuY3Rpb24gcyhvLHUpe2lmKCFuW29dKXtpZighdFtvXSl7dmFyIGE9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtpZighdSYmYSlyZXR1cm4gYShvLCEwKTtpZihpKXJldHVybiBpKG8sITApO3ZhciBmPW5ldyBFcnJvcihcIkNhbm5vdCBmaW5kIG1vZHVsZSAnXCIrbytcIidcIik7dGhyb3cgZi5jb2RlPVwiTU9EVUxFX05PVF9GT1VORFwiLGZ9dmFyIGw9bltvXT17ZXhwb3J0czp7fX07dFtvXVswXS5jYWxsKGwuZXhwb3J0cyxmdW5jdGlvbihlKXt2YXIgbj10W29dWzFdW2VdO3JldHVybiBzKG4/bjplKX0sbCxsLmV4cG9ydHMsZSx0LG4scil9cmV0dXJuIG5bb10uZXhwb3J0c312YXIgaT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2Zvcih2YXIgbz0wO288ci5sZW5ndGg7bysrKXMocltvXSk7cmV0dXJuIHN9KSIsIm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24gKHN0cmluZykge1xyXG4gIHZhciBzZWxmID0gdGhpc1xyXG4gIHRoaXMuX19jb21wb25lbnRMaXN0X18ubWFwKGZ1bmN0aW9uIChjb21wb25lbnQpIHtcclxuICAgIGlmIChzZWxmW2NvbXBvbmVudF0pIHtcclxuICAgICAgdmFyIGMgPSBzZWxmW2NvbXBvbmVudF1cclxuICAgICAgLy8gcmVnaXN0ZXIgdGhpcyBjb21wb25lbnQgYXMgYSBzdWItY29tcG9uZW50XHJcbiAgICAgIGMuSVNfU1RVQiA9IHRydWVcclxuICAgICAgLy8gbGlmZS1jeWNsZSBtZXRob2QgYmVmb3JlIHJlbmRlcmluZyBzdWItY29tcG9uZW50XHJcbiAgICAgIHZhciByZWd4ID0gJyhcXFxce1xcXFx7Y29tcG9uZW50OicgKyBjb21wb25lbnQgKyAnXFxcXH1cXFxcfSknXHJcbiAgICAgIHZhciByZSA9IG5ldyBSZWdFeHAocmVneCwgJ2cnKVxyXG4gICAgICB2YXIgdHBsID0gYy5yZW5kZXIoJ2FzU3RyaW5nJylcclxuICAgICAgc2VsZi5fX2NvbXBvbmVudFN0dWJfX1tjb21wb25lbnRdID0gdHBsXHJcbiAgICAgIHN0cmluZyA9IHN0cmluZy5yZXBsYWNlKHJlLCB0cGwpXHJcbiAgICB9XHJcbiAgfSlcclxuICByZXR1cm4gc3RyaW5nXHJcbn1cclxuIiwidmFyIHRtcGxIYW5kbGVyID0gcmVxdWlyZSgnLi90bXBsSGFuZGxlcicpXHJcbnZhciBwcm9jZXNzRXZlbnQgPSByZXF1aXJlKCcuL3Byb2Nlc3NFdmVudCcpXHJcbnZhciBnZXRJZCA9IHJlcXVpcmUoJy4uL3V0aWxzJykuZ2V0SWRcclxudmFyIHRlc3RFdmVudCA9IHJlcXVpcmUoJy4uL3V0aWxzJykudGVzdEV2ZW50XHJcbnZhciBsb29wQ2hpbGRzID0gcmVxdWlyZSgnLi4vdXRpbHMnKS5sb29wQ2hpbGRzXHJcbnZhciBjaGVja05vZGVBdmFpbGFiaWxpdHkgPSByZXF1aXJlKCcuLi91dGlscycpLmNoZWNrTm9kZUF2YWlsYWJpbGl0eVxyXG52YXIgc3RySW50ZXJwcmV0ZXIgPSByZXF1aXJlKCcuL3N0ckludGVycHJldGVyJylcclxudmFyIGNvbXBvbmVudFBhcnNlID0gcmVxdWlyZSgnLi9jb21wb25lbnRQYXJzZScpXHJcbnZhciBtb2RlbFBhcnNlID0gcmVxdWlyZSgnLi9tb2RlbFBhcnNlJylcclxudmFyIG5vZGVzVmlzaWJpbGl0eSA9IHJlcXVpcmUoJy4vbm9kZXNWaXNpYmlsaXR5JylcclxudmFyIG1vcnBoID0gcmVxdWlyZSgnbW9ycGhkb20nKVxyXG5cclxudmFyIGhhcyA9IDBcclxuXHJcbnZhciB1cGRhdGVDb250ZXh0ID0gZnVuY3Rpb24gKCkge1xyXG4gIHZhciBzZWxmID0gdGhpc1xyXG4gIHZhciBlbGUgPSBnZXRJZCh0aGlzLmVsKVxyXG4gIHZhciBuZXdFbGVtID0gZ2VuRWxlbWVudC5jYWxsKHRoaXMpXHJcbiAgdmFyIGZyYWcgPSBbXVxyXG4gIC8vIG1vcnAgYXMgc3ViLWNvbXBvbmVudFxyXG4gIGlmICh0aGlzLklTX1NUVUIpIHtcclxuICAgIG1vcnBoKGVsZSwgbmV3RWxlbS5jaGlsZE5vZGVzWzBdKVxyXG4gICAgLy8gcHJvY2Vzc0V2ZW50LmNhbGwodGhpcywgZWxlKVxyXG4gIH0gZWxzZSB7XHJcbiAgLy8gb3RoZXJ3aXNlIG1vcGggYXMgd2hvbGVcclxuICAgIG5ld0VsZW0uaWQgPSB0aGlzLmVsXHJcbiAgICBtb3JwaChlbGUsIG5ld0VsZW0pXHJcbiAgICBoYXMrK1xyXG4gICAgaWYoaGFzID09PSAyKXtcclxuICAgICAgcHJvY2Vzc0V2ZW50LmNhbGwodGhpcywgZWxlKVxyXG4gICAgfVxyXG4gICAgLy8gY2xlYW4gdXAgZG9jdW1lbnQgY3JlYXRpb24gZnJvbSBwb3RlbnRpYWwgbWVtb3J5IGxlYWtzXHJcbiAgICBsb29wQ2hpbGRzKGZyYWcsIG5ld0VsZW0pXHJcbiAgICBmcmFnLm1hcChmdW5jdGlvbiAoZnJhZ21lbnQpIHtcclxuICAgICAgZnJhZ21lbnQucmVtb3ZlKClcclxuICAgIH0pXHJcbiAgICAvLyBzdWItY29tcG9uZW50IGxpZmUtY3ljbGVcclxuICAgIHRoaXMuX19jb21wb25lbnRMaXN0X18ubWFwKGZ1bmN0aW9uIChjb21wb25lbnQpIHtcclxuICAgICAgaWYoc2VsZltjb21wb25lbnRdKXtcclxuICAgICAgICB2YXIgYyA9IHNlbGZbY29tcG9uZW50XVxyXG4gICAgICAgIGNoZWNrTm9kZUF2YWlsYWJpbGl0eShjLCBudWxsLCBmdW5jdGlvbigpe1xyXG4gICAgICAgICAgaWYgKCFjLkRJRF9NT1VOVCAmJiBjLmNvbXBvbmVudERpZE1vdW50ICYmIHR5cGVvZiBjLmNvbXBvbmVudERpZE1vdW50ID09PSAnZnVuY3Rpb24nKSB7XHJcbiAgICAgICAgICAgIGMuRElEX01PVU5UID0gdHJ1ZVxyXG4gICAgICAgICAgICBjLmNvbXBvbmVudERpZE1vdW50KClcclxuICAgICAgICAgIH1cclxuICAgICAgICB9LCBmdW5jdGlvbigpe1xyXG4gICAgICAgICAgaWYgKGMuRElEX01PVU5UICYmIGMuY29tcG9uZW50RGlkVW5Nb3VudCAmJiB0eXBlb2YgYy5jb21wb25lbnREaWRVbk1vdW50ID09PSAnZnVuY3Rpb24nKSB7XHJcbiAgICAgICAgICAgIGMuRElEX01PVU5UID0gZmFsc2VcclxuICAgICAgICAgICAgYy5jb21wb25lbnREaWRVbk1vdW50KClcclxuICAgICAgICAgIH1cclxuICAgICAgICB9KVxyXG4gICAgICB9XHJcbiAgICB9KVxyXG4gIH1cclxuICAvLyBleGVjIGxpZmUtY3ljbGUgY29tcG9uZW50RGlkVXBkYXRlXHJcbiAgaWYgKHRoaXMuY29tcG9uZW50RGlkVXBkYXRlICYmIHR5cGVvZiB0aGlzLmNvbXBvbmVudERpZFVwZGF0ZSA9PT0gJ2Z1bmN0aW9uJykge1xyXG4gICAgdGhpcy5jb21wb25lbnREaWRVcGRhdGUoKVxyXG4gIH1cclxuXHJcbiAgLy8gcmVzZXQgYmF0Y2ggcG9vbGluZ1xyXG4gIGJhdGNoUG9vbC5zdGF0dXMgPSAncmVhZHknXHJcbn1cclxuXHJcbi8vIGJhdGNoIHBvb2wgdXBkYXRlIHN0YXRlcyB0byBET01cclxudmFyIGJhdGNoUG9vbCA9IHtcclxuICB0dGw6IDAsXHJcbiAgc3RhdHVzOiAncmVhZHknXHJcbn1cclxuXHJcbi8vIFRoZSBpZGVhIGJlaGluZCB0aGlzIGlzIHRvIHJlZHVjZSBtb3JwaGluZyB0aGUgRE9NIHdoZW4gbXVsdGlwbGUgdXBkYXRlc1xyXG4vLyBoaXQgdGhlIGRlY2suIElmIHBvc3NpYmxlIHdlIHdhbnQgdG8gcG9vbCB0aGVtIGJlZm9yZSBpbml0aWF0aW5nIERPTVxyXG4vLyBtb3JwaGluZywgYnV0IGluIHRoZSBldmVudCB0aGUgdXBkYXRlIGlzIG5vdCBmYXN0IGVub3VnaCB3ZSB3YW50IHRvIHJldHVyblxyXG4vLyB0byBub3JtYWwgc3luY2hyb25vdXMgdXBkYXRlLlxyXG52YXIgYmF0Y2hQb29sRXhlYyA9IGZ1bmN0aW9uICgpIHtcclxuICBpZiAoYmF0Y2hQb29sLnN0YXR1cyA9PT0gJ3Bvb2xpbmcnKSB7XHJcbiAgICAvL1xyXG4gIH0gZWxzZSB7XHJcbiAgICB2YXIgc2VsZiA9IHRoaXNcclxuICAgIGJhdGNoUG9vbC5zdGF0dXMgPSAncG9vbGluZydcclxuICAgIC8vIGlmIGJhdGNocG9vbCBpcyBub3QgeWV0IGV4ZWN1dGVkIG9yIGl0IHdhcyBpZGxlIChhZnRlciAxMDBtcylcclxuICAgIC8vIGRpcmVjdCBtb3JwaCB0aGUgRE9NXHJcbiAgICBpZiAoIWJhdGNoUG9vbC50dGwpIHtcclxuICAgICAgdXBkYXRlQ29udGV4dC5jYWxsKHRoaXMpXHJcbiAgICB9IGVsc2Uge1xyXG4gICAgLy8gd2Ugd2FpdCB1bnRpbCBwb29saW5nIGlzIHJlYWR5IGJlZm9yZSBpbml0aWF0aW5nIERPTSBtb3JwaGluZ1xyXG4gICAgICBjbGVhclRpbWVvdXQoYmF0Y2hQb29sLnR0bClcclxuICAgICAgYmF0Y2hQb29sLnR0bCA9IHNldFRpbWVvdXQoZnVuY3Rpb24gKCkge1xyXG4gICAgICAgIHVwZGF0ZUNvbnRleHQuY2FsbChzZWxmKVxyXG4gICAgICB9LCAwKVxyXG4gICAgfVxyXG4gICAgLy8gd2UgY2xlYXIgdGhlIGJhdGNoIHBvb2wgaWYgaXQgbW9yZSB0aGVuIDEwMG1zIGZyb21cclxuICAgIC8vIGxhc3QgdXBkYXRlXHJcbiAgICBiYXRjaFBvb2wudHRsID0gc2V0VGltZW91dChmdW5jdGlvbiAoKSB7XHJcbiAgICAgIGJhdGNoUG9vbC50dGwgPSAwXHJcbiAgICB9LCAxMDApXHJcbiAgfVxyXG59XHJcblxyXG52YXIgbmV4dFN0YXRlID0gZnVuY3Rpb24gKGkpIHtcclxuICB2YXIgc2VsZiA9IHRoaXNcclxuICBpZiAoaSA8IHRoaXMuX19zdGF0ZUxpc3RfXy5sZW5ndGgpIHtcclxuICAgIHZhciBzdGF0ZSA9IHRoaXMuX19zdGF0ZUxpc3RfX1tpXVxyXG4gICAgdmFyIHZhbHVlID0gdGhpc1tzdGF0ZV1cclxuICAgIC8vIGlmIHZhbHVlIGlzIHVuZGVmaW5lZCwgbGlrZWx5IGhhcyBvYmplY3Qgbm90YXRpb24gd2UgY29udmVydCBpdCB0byBhcnJheVxyXG4gICAgaWYgKHZhbHVlID09PSB1bmRlZmluZWQpIHZhbHVlID0gc3RySW50ZXJwcmV0ZXIoc3RhdGUpXHJcblxyXG4gICAgaWYgKHZhbHVlICYmIEFycmF5LmlzQXJyYXkodmFsdWUpKSB7XHJcbiAgICAgIC8vIHVzaW5nIHNwbGl0IG9iamVjdCBub3RhdGlvbiBhcyBiYXNlIGZvciBzdGF0ZSB1cGRhdGVcclxuICAgICAgdmFyIGluVmFsID0gdGhpc1t2YWx1ZVswXV1bdmFsdWVbMV1dXHJcbiAgICAgIE9iamVjdC5kZWZpbmVQcm9wZXJ0eSh0aGlzW3ZhbHVlWzBdXSwgdmFsdWVbMV0sIHtcclxuICAgICAgICBlbnVtZXJhYmxlOiBmYWxzZSxcclxuICAgICAgICBjb25maWd1cmFibGU6IHRydWUsXHJcbiAgICAgICAgZ2V0OiBmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgICByZXR1cm4gaW5WYWxcclxuICAgICAgICB9LFxyXG4gICAgICAgIHNldDogZnVuY3Rpb24gKHZhbCkge1xyXG4gICAgICAgICAgaW5WYWwgPSB2YWxcclxuICAgICAgICAgIGJhdGNoUG9vbEV4ZWMuY2FsbChzZWxmKVxyXG4gICAgICAgIH1cclxuICAgICAgfSlcclxuICAgIH0gZWxzZSB7XHJcbiAgICAgIC8vIGhhbmRsZSBwYXJlbnQgc3RhdGUgdXBkYXRlIGlmIHRoZSBzdGF0ZSBpcyBub3QgYW4gb2JqZWN0XHJcbiAgICAgIE9iamVjdC5kZWZpbmVQcm9wZXJ0eSh0aGlzLCBzdGF0ZSwge1xyXG4gICAgICAgIGVudW1lcmFibGU6IGZhbHNlLFxyXG4gICAgICAgIGNvbmZpZ3VyYWJsZTogdHJ1ZSxcclxuICAgICAgICBnZXQ6IGZ1bmN0aW9uICgpIHtcclxuICAgICAgICAgIHJldHVybiB2YWx1ZVxyXG4gICAgICAgIH0sXHJcbiAgICAgICAgc2V0OiBmdW5jdGlvbiAodmFsKSB7XHJcbiAgICAgICAgICB2YWx1ZSA9IHZhbFxyXG4gICAgICAgICAgYmF0Y2hQb29sRXhlYy5jYWxsKHNlbGYpXHJcbiAgICAgICAgfVxyXG4gICAgICB9KVxyXG4gICAgfVxyXG4gICAgaSsrXHJcbiAgICBuZXh0U3RhdGUuY2FsbCh0aGlzLCBpKVxyXG4gIH1cclxufVxyXG5cclxudmFyIHNldFN0YXRlID0gZnVuY3Rpb24gKGFyZ3MpIHtcclxuICBuZXh0U3RhdGUuY2FsbCh0aGlzLCAwKVxyXG59XHJcblxyXG52YXIgdXBkYXRlU3RhdGVMaXN0ID0gZnVuY3Rpb24gKHN0YXRlKSB7XHJcbiAgaWYgKCF+dGhpcy5fX3N0YXRlTGlzdF9fLmluZGV4T2Yoc3RhdGUpKSB0aGlzLl9fc3RhdGVMaXN0X18gPSB0aGlzLl9fc3RhdGVMaXN0X18uY29uY2F0KHN0YXRlKVxyXG59XHJcblxyXG52YXIgZ2VuRWxlbWVudCA9IGZ1bmN0aW9uIChmb3JjZSkge1xyXG4gIHZhciB0ZW1wRGl2ID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnZGl2JylcclxuICB2YXIgdHBsID0gdG1wbEhhbmRsZXIuY2FsbCh0aGlzLCB1cGRhdGVTdGF0ZUxpc3QuYmluZCh0aGlzKSlcclxuICB0cGwgPSBjb21wb25lbnRQYXJzZS5jYWxsKHRoaXMsIHRwbClcclxuICB0cGwgPSBtb2RlbFBhcnNlLmNhbGwodGhpcywgdHBsKVxyXG4gIHRwbCA9IG5vZGVzVmlzaWJpbGl0eS5jYWxsKHRoaXMsIHRwbClcclxuICB0ZW1wRGl2LmlubmVySFRNTCA9IHRwbFxyXG5cclxuICBzZXRTdGF0ZS5jYWxsKHRoaXMpXHJcbiAgaWYgKGZvcmNlKSBiYXRjaFBvb2xFeGVjLmNhbGwodGhpcylcclxuICByZXR1cm4gdGVtcERpdlxyXG59XHJcblxyXG5leHBvcnRzLmdlbkVsZW1lbnQgPSBnZW5FbGVtZW50XHJcbmV4cG9ydHMuc2V0U3RhdGUgPSBzZXRTdGF0ZVxyXG5leHBvcnRzLnVwZGF0ZVN0YXRlTGlzdCA9IHVwZGF0ZVN0YXRlTGlzdFxyXG4iLCJ2YXIgdGVybmFyeU9wcyA9IHJlcXVpcmUoJy4vdGVybmFyeU9wcycpXHJcbnZhciB0bXBsID0gJydcclxuXHJcbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24gKHN0cmluZywgb2JqKSB7XHJcbiAgdmFyIGFyclByb3BzID0gc3RyaW5nLm1hdGNoKC97eyhbXnt9XSspfX0vZylcclxuICB2YXIgcmVwXHJcbiAgdmFyIGlzVGVybmFyeVxyXG4gIHRtcGwgPSBzdHJpbmdcclxuICBmb3IgKHZhciBpID0gMCwgbGVuID0gYXJyUHJvcHMubGVuZ3RoOyBpIDwgbGVuOyBpKyspIHtcclxuICAgIHJlcCA9IGFyclByb3BzW2ldLnJlcGxhY2UoL3t7KFtee31dKyl9fS9nLCAnJDEnKVxyXG4gICAgaXNUZXJuYXJ5ID0gdGVybmFyeU9wcy5jYWxsKG9iaiwgcmVwKVxyXG4gICAgaWYgKGlzVGVybmFyeSkge1xyXG4gICAgICB0bXBsID0gdG1wbC5yZXBsYWNlKCd7eycgKyByZXAgKyAnfX0nLCBpc1Rlcm5hcnkudmFsdWUpXHJcbiAgICB9IGVsc2Uge1xyXG4gICAgICB0bXBsID0gdG1wbC5yZXBsYWNlKCd7eycgKyByZXAgKyAnfX0nLCBvYmpbcmVwXSlcclxuICAgIH1cclxuICB9XHJcbiAgcmV0dXJuIHRtcGxcclxufVxyXG4iLCJ2YXIgZ2VuTW9kZWxUZW1wbGF0ZSA9IHJlcXVpcmUoJy4vZ2VuTW9kZWxUZW1wbGF0ZScpXHJcbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24gKHN0cmluZykge1xyXG4gIHZhciBzZWxmID0gdGhpc1xyXG4gIHRoaXMuX19tb2RlbExpc3RfXy5tYXAoZnVuY3Rpb24gKG1vZGVsLCBpbmRleCkge1xyXG4gICAgaWYgKHNlbGZbbW9kZWxdKSB7XHJcbiAgICAgIHZhciByZWd4ID0gJyhcXFxce1xcXFx7bW9kZWw6JyArIG1vZGVsICsgJ1xcXFx9XFxcXH0pKC4qPykoXFxcXHtcXFxce1xcXFwvbW9kZWw6JyArIG1vZGVsICsgJ1xcXFx9XFxcXH0pJ1xyXG4gICAgICB2YXIgcmUgPSBuZXcgUmVnRXhwKHJlZ3gpXHJcbiAgICAgIHZhciBtYXRjaCA9IHN0cmluZy5tYXRjaChyZSlcclxuICAgICAgaWYgKG1hdGNoKSB7XHJcbiAgICAgICAgdmFyIG1hdGNoUHJpc3RpbmUgPSBzZWxmLmJhc2UubWF0Y2gocmUpXHJcbiAgICAgICAgdmFyIG1vZGVsVGVtcGxhdGUgPSAnJ1xyXG4gICAgICAgIHNlbGZbbW9kZWxdWydsaXN0J10ubWFwKGZ1bmN0aW9uIChvYmopIHtcclxuICAgICAgICAgIG1vZGVsVGVtcGxhdGUgKz0gZ2VuTW9kZWxUZW1wbGF0ZS5jYWxsKHNlbGYsIG1hdGNoUHJpc3RpbmVbMl0sIG9iailcclxuICAgICAgICB9KVxyXG4gICAgICAgIHN0cmluZyA9IHN0cmluZy5yZXBsYWNlKG1hdGNoWzJdLCBtb2RlbFRlbXBsYXRlKVxyXG4gICAgICB9XHJcbiAgICB9XHJcbiAgICBzdHJpbmcgPSBzdHJpbmcucmVwbGFjZSgne3ttb2RlbDonICsgbW9kZWwgKyAnfX0nLCAnJylcclxuICAgIHN0cmluZyA9IHN0cmluZy5yZXBsYWNlKCd7ey9tb2RlbDonICsgbW9kZWwgKyAnfX0nLCAnJylcclxuICB9KVxyXG4gIHJldHVybiBzdHJpbmdcclxufVxyXG4iLCJtb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uIChzdHJpbmcpIHtcclxuICB2YXIgc2VsZiA9IHRoaXNcclxuICB0aGlzLl9fc3RhdGVMaXN0X18ubWFwKGZ1bmN0aW9uIChzdGF0ZSkge1xyXG4gICAgaWYgKCFzZWxmW3N0YXRlXSkge1xyXG4gICAgICB2YXIgZiA9ICdcXFxce1xcXFx7XFxcXD8nICsgc3RhdGUgKyAnXFxcXH1cXFxcfSdcclxuICAgICAgdmFyIGIgPSAnXFxcXHtcXFxce1xcXFwvJyArIHN0YXRlICsgJ1xcXFx9XFxcXH0nXHJcbiAgICAgIC8vIHZhciByZWd4ID0gJyg/PD0nICsgZiArICcpKC4qPykoPz0nICsgYiArICcpJ1xyXG4gICAgICAvLyAqKiBvbGQgYnJvd3NlciBkb2VzIG5vdCBzdXBwb3J0IHBvc2l0aXZlIGxvb2sgYmVoaW5kICoqXHJcbiAgICAgIHZhciByZWd4ID0gJygnICsgZiArICcpKC4qPykoPz0nICsgYiArICcpJ1xyXG4gICAgICB2YXIgcmUgPSBuZXcgUmVnRXhwKHJlZ3gpXHJcbiAgICAgIHZhciBpc0NvbmRpdGlvbmFsID0gcmUudGVzdChzdHJpbmcpXHJcbiAgICAgIHZhciBtYXRjaCA9IHN0cmluZy5tYXRjaChyZSlcclxuICAgICAgaWYgKGlzQ29uZGl0aW9uYWwgJiYgbWF0Y2gpIHtcclxuICAgICAgICBzdHJpbmcgPSBzdHJpbmcucmVwbGFjZShtYXRjaFsyXSwgJycpXHJcbiAgICAgIH1cclxuICAgIH1cclxuICAgIHN0cmluZyA9IHN0cmluZy5yZXBsYWNlKCd7ez8nICsgc3RhdGUgKyAnfX0nLCAnJylcclxuICAgIHN0cmluZyA9IHN0cmluZy5yZXBsYWNlKCd7ey8nICsgc3RhdGUgKyAnfX0nLCAnJylcclxuICB9KVxyXG4gIHJldHVybiBzdHJpbmdcclxufVxyXG4iLCJ2YXIgc2V0U3RhdGUgPSByZXF1aXJlKCcuL2dlbkVsZW1lbnQnKS5zZXRTdGF0ZVxyXG52YXIgdG1wbEhhbmRsZXIgPSByZXF1aXJlKCcuL3RtcGxIYW5kbGVyJylcclxudmFyIHByb2Nlc3NFdmVudCA9IHJlcXVpcmUoJy4vcHJvY2Vzc0V2ZW50JylcclxudmFyIGdldElkID0gcmVxdWlyZSgnLi4vdXRpbHMnKS5nZXRJZFxyXG52YXIgdGVzdEV2ZW50ID0gcmVxdWlyZSgnLi4vdXRpbHMnKS50ZXN0RXZlbnRcclxudmFyIGNvbXBvbmVudFBhcnNlID0gcmVxdWlyZSgnLi9jb21wb25lbnRQYXJzZScpXHJcbnZhciBtb2RlbFBhcnNlID0gcmVxdWlyZSgnLi9tb2RlbFBhcnNlJylcclxudmFyIG5vZGVzVmlzaWJpbGl0eSA9IHJlcXVpcmUoJy4vbm9kZXNWaXNpYmlsaXR5JylcclxudmFyIGNoZWNrTm9kZUF2YWlsYWJpbGl0eSA9IHJlcXVpcmUoJy4uL3V0aWxzJykuY2hlY2tOb2RlQXZhaWxhYmlsaXR5XHJcblxyXG52YXIgcmVuZGVyU3ViID0gZnVuY3Rpb24gKGMsIGNOYW1lLCBub2RlKSB7XHJcbiAgYy5zdHViUmVuZGVyKHRoaXMuX19jb21wb25lbnRTdHViX19bY05hbWVdLCBub2RlKVxyXG59XHJcblxyXG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uIChzdHViKSB7XHJcbiAgdmFyIHNlbGYgPSB0aGlzXHJcbiAgdmFyIGVsXHJcbiAgdmFyIHRwbFxyXG4gIGlmICh0eXBlb2YgdGhpcy5iYXNlID09PSAnc3RyaW5nJykge1xyXG4gICAgdGhpcy5fX3N0YXRlTGlzdF9fID0gdGhpcy5fX3N0YXRlTGlzdF9fIHx8IFtdXHJcbiAgICB0aGlzLl9fbW9kZWxMaXN0X18gPSB0aGlzLl9fbW9kZWxMaXN0X18gfHwgW11cclxuICAgIHRoaXMuX19jb21wb25lbnRMaXN0X18gPSB0aGlzLl9fY29tcG9uZW50TGlzdF9fIHx8IFtdXHJcbiAgICB0aGlzLl9fY29tcG9uZW50U3R1Yl9fID0gdGhpcy5fX2NvbXBvbmVudFN0dWJfXyB8fCB7fVxyXG4gICAgdHBsID0gdG1wbEhhbmRsZXIuY2FsbCh0aGlzLCBmdW5jdGlvbiAoc3RhdGUpIHtcclxuICAgICAgaWYgKCF+c2VsZi5fX3N0YXRlTGlzdF9fLmluZGV4T2Yoc3RhdGUpKSBzZWxmLl9fc3RhdGVMaXN0X18gPSBzZWxmLl9fc3RhdGVMaXN0X18uY29uY2F0KHN0YXRlKVxyXG4gICAgfSlcclxuICAgIHRwbCA9IGNvbXBvbmVudFBhcnNlLmNhbGwodGhpcywgdHBsKVxyXG4gICAgdHBsID0gbW9kZWxQYXJzZS5jYWxsKHRoaXMsIHRwbClcclxuICAgIHRwbCA9IG5vZGVzVmlzaWJpbGl0eS5jYWxsKHRoaXMsIHRwbClcclxuICAgIGlmIChzdHViKSB7XHJcbiAgICAgIHJldHVybiB0cGxcclxuICAgIH0gZWxzZSB7XHJcbiAgICAgIGVsID0gZ2V0SWQodGhpcy5lbClcclxuICAgICAgaWYgKGVsKSB7XHJcbiAgICAgICAgZWwuaW5uZXJIVE1MID0gdHBsXHJcbiAgICAgICAgdGhpcy5fX2NvbXBvbmVudExpc3RfXy5tYXAoZnVuY3Rpb24gKGNvbXBvbmVudE5hbWUpIHtcclxuICAgICAgICAgIHZhciBjb21wb25lbnQgPSBzZWxmW2NvbXBvbmVudE5hbWVdXHJcbiAgICAgICAgICBpZiAoY29tcG9uZW50KSB7XHJcbiAgICAgICAgICAgIC8vIGRvIGluaXRpYWwgY2hlY2tpbmcgb2YgdGhlIG5vZGUgYXZhaWxhYmlsaXR5XHJcbiAgICAgICAgICAgIHZhciBub2RlID0gY2hlY2tOb2RlQXZhaWxhYmlsaXR5KGNvbXBvbmVudCwgY29tcG9uZW50TmFtZSwgcmVuZGVyU3ViLmJpbmQoc2VsZikpXHJcbiAgICAgICAgICAgIGlmIChub2RlKSByZW5kZXJTdWIuY2FsbChzZWxmLCBjb21wb25lbnQsIGNvbXBvbmVudE5hbWUsIG5vZGUpXHJcbiAgICAgICAgICB9XHJcbiAgICAgICAgfSlcclxuICAgICAgICBzZXRTdGF0ZS5jYWxsKHRoaXMpXHJcbiAgICAgICAgdGVzdEV2ZW50KHRwbCkgJiYgcHJvY2Vzc0V2ZW50LmNhbGwodGhpcywgZWwpXHJcblxyXG4gICAgICAgIC8vIHNpbmNlIGNvbXBvbmVudCBhbHJlYWR5IHJlbmRlcmVkLCB0cmlnZ2VyIGl0cyBsaWZlLWN5Y2xlIG1ldGhvZFxyXG4gICAgICAgIGlmICh0aGlzLmNvbXBvbmVudERpZE1vdW50ICYmIHR5cGVvZiB0aGlzLmNvbXBvbmVudERpZE1vdW50ID09PSAnZnVuY3Rpb24nKSB7XHJcbiAgICAgICAgICB0aGlzLmNvbXBvbmVudERpZE1vdW50KClcclxuICAgICAgICB9XHJcbiAgICAgIH1cclxuICAgIH1cclxuICB9XHJcbn1cclxuIiwidmFyIGxvb3BDaGlsZHMgPSByZXF1aXJlKCcuLi91dGlscycpLmxvb3BDaGlsZHNcclxuXHJcbnZhciBuZXh0ID0gZnVuY3Rpb24gKGksIGMsIHJlbSkge1xyXG4gIHZhciBoYXNrXHJcbiAgdmFyIGV2dE5hbWVcclxuICB2YXIgaGFuZGxlclxyXG4gIHZhciBoYW5kbGVyQXJnc1xyXG4gIHZhciBpc0hhbmRsZXJcclxuICB2YXIgYXJndlxyXG4gIHZhciB2XHJcbiAgdmFyIGhcclxuICB2YXIgYXR0cyA9IGMuYXR0cmlidXRlc1xyXG4gIHZhciBzZWxmID0gdGhpc1xyXG4gIGlmIChpIDwgYXR0cy5sZW5ndGgpIHtcclxuICAgIGhhc2sgPSAvXmstLy50ZXN0KGF0dHNbaV0ubm9kZU5hbWUpXHJcbiAgICBpZiAoaGFzaykge1xyXG4gICAgICBldnROYW1lID0gYXR0c1tpXS5ub2RlTmFtZS5yZXBsYWNlKC9eW14tXSstLywgJycpXHJcbiAgICAgIGhhbmRsZXIgPSBhdHRzW2ldLm5vZGVWYWx1ZS5tYXRjaCgvW2EtekEtWl0rKD8hW14oXSpcXCkpLylbMF1cclxuICAgICAgaCA9IGF0dHNbaV0ubm9kZVZhbHVlLm1hdGNoKC9cXCgoW157fV0rKVxcKS8pXHJcbiAgICAgIGhhbmRsZXJBcmdzID0gaCA/IGhbMV0gOiAnJ1xyXG4gICAgICBpc0hhbmRsZXIgPSB0aGlzW2hhbmRsZXJdXHJcbiAgICAgIGlmICh0eXBlb2YgaXNIYW5kbGVyID09PSAnZnVuY3Rpb24nKSB7XHJcbiAgICAgICAgcmVtLnB1c2goYXR0c1tpXS5ub2RlTmFtZSlcclxuICAgICAgICBhcmd2ID0gW11cclxuICAgICAgICB2ID0gaGFuZGxlckFyZ3Muc3BsaXQoJywnKS5maWx0ZXIoZnVuY3Rpb24gKGYpIHsgcmV0dXJuIGYgIT09ICcnIH0pXHJcbiAgICAgICAgaWYgKHYubGVuZ3RoKSB2Lm1hcChmdW5jdGlvbiAodikgeyBhcmd2LnB1c2godikgfSlcclxuXHJcbiAgICAgICAgdmFyIGZuID0gZnVuY3Rpb24oZSl7XHJcbiAgICAgICAgICBlLnN0b3BQcm9wYWdhdGlvbigpXHJcbiAgICAgICAgICBpZiAoZS50YXJnZXQgIT09IGUuY3VycmVudFRhcmdldCkge1xyXG4gICAgICAgICAgICBpc0hhbmRsZXIuYXBwbHkoc2VsZiwgYXJndi5jb25jYXQoZSkpXHJcbiAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG4gICAgICAgIGlmKGMuaGFzQXR0cmlidXRlKCdldnQtbm9kZScpKXtcclxuICAgICAgICAgIGMuYWRkRXZlbnRMaXN0ZW5lcihldnROYW1lLCBmbiwgZmFsc2UpXHJcbiAgICAgICAgfSBlbHNle1xyXG4gICAgICAgICAgYy5hZGRFdmVudExpc3RlbmVyKGV2dE5hbWUsIGlzSGFuZGxlci5iaW5kLmFwcGx5KGlzSGFuZGxlci5iaW5kKHRoaXMpLCBbY10uY29uY2F0KGFyZ3YpKSwgZmFsc2UpXHJcbiAgICAgICAgfVxyXG4gICAgICAgIGNvbnNvbGUubG9nKGMpXHJcbiAgICAgIH1cclxuICAgIH1cclxuICAgIGkrK1xyXG4gICAgbmV4dC5hcHBseSh0aGlzLCBbIGksIGMsIHJlbSBdKVxyXG4gIH0gZWxzZSB7XHJcbiAgICByZW0ubWFwKGZ1bmN0aW9uIChmKSB7IGMucmVtb3ZlQXR0cmlidXRlKGYpIH0pXHJcbiAgfVxyXG59XHJcblxyXG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uIChrTm9kZSkge1xyXG4gIHZhciBzZWxmID0gdGhpc1xyXG4gIHZhciBsaXN0S25vZGVDaGlsZCA9IFtdXHJcbiAgdmFyIHJlbSA9IFtdXHJcbiAgbG9vcENoaWxkcyhsaXN0S25vZGVDaGlsZCwga05vZGUpXHJcbiAgbGlzdEtub2RlQ2hpbGQubWFwKGZ1bmN0aW9uIChjKSB7XHJcbiAgICBpZiAoYy5ub2RlVHlwZSA9PT0gMSAmJiBjLmhhc0F0dHJpYnV0ZXMoKSkge1xyXG4gICAgICBuZXh0LmFwcGx5KHNlbGYsIFsgMCwgYywgcmVtIF0pXHJcbiAgICB9XHJcbiAgfSlcclxuICBsaXN0S25vZGVDaGlsZCA9IFtdXHJcbn1cclxuIiwibW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbiAoc3RyKSB7XHJcbiAgdmFyIHJlcyA9IHN0ci5tYXRjaCgvXFwuKlxcLi9nKVxyXG4gIHZhciByZXN1bHRcclxuICBpZiAocmVzICYmIHJlcy5sZW5ndGggPiAwKSB7XHJcbiAgICByZXR1cm4gc3RyLnNwbGl0KCcuJylcclxuICB9XHJcbiAgcmV0dXJuIHJlc3VsdFxyXG59XHJcbiIsIi8vIGZ1bmN0aW9uIHRvIHJlc29sdmUgdGVybmFyeSBvcGVyYXRpb25cclxuXHJcbmZ1bmN0aW9uIHRlc3QgKHN0cikge1xyXG4gIGlmIChzdHIgPT09ICdcXCdcXCcnIHx8IHN0ciA9PT0gJ1wiXCInKSB7IHJldHVybiAnJyB9XHJcbiAgcmV0dXJuIHN0clxyXG59XHJcblxyXG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uIChpbnB1dCkge1xyXG4gIGlmIChpbnB1dC5tYXRjaCgvKFteP10qKVxcPyhbXjpdKik6KFteO10qKXwoXFxzKj1cXHMqKVteO10qL2cpKSB7XHJcbiAgICB2YXIgdCA9IGlucHV0LnNwbGl0KCc/JylcclxuICAgIHZhciBjb25kaXRpb24gPSB0WzBdXHJcbiAgICB2YXIgbGVmdEhhbmQgPSB0WzFdLnNwbGl0KCc6JylbMF1cclxuICAgIHZhciByaWdodEhhbmQgPSB0WzFdLnNwbGl0KCc6JylbMV1cclxuXHJcbiAgICAvLyBjaGVjayB0aGUgY29uZGl0aW9uIGZ1bGZpbGxtZW50XHJcbiAgICBpZiAodGhpc1tjb25kaXRpb25dKSB7XHJcbiAgICAgIHJldHVybiB7XHJcbiAgICAgICAgdmFsdWU6IHRlc3QobGVmdEhhbmQpLFxyXG4gICAgICAgIHN0YXRlOiBjb25kaXRpb25cclxuICAgICAgfVxyXG4gICAgfSBlbHNlIHtcclxuICAgICAgcmV0dXJuIHtcclxuICAgICAgICB2YWx1ZTogdGVzdChyaWdodEhhbmQpLFxyXG4gICAgICAgIHN0YXRlOiBjb25kaXRpb25cclxuICAgICAgfVxyXG4gICAgfVxyXG4gIH0gZWxzZSByZXR1cm4gZmFsc2VcclxufVxyXG4iLCJ2YXIgc3RySW50ZXJwcmV0ZXIgPSByZXF1aXJlKCcuL3N0ckludGVycHJldGVyJylcclxudmFyIHRlcm5hcnlPcHMgPSByZXF1aXJlKCcuL3Rlcm5hcnlPcHMnKVxyXG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uICh1cGRhdGVTdGF0ZUxpc3QpIHtcclxuICB2YXIgc2VsZiA9IHRoaXNcclxuICB2YXIgc3RyID0gdGhpcy5iYXNlXHJcbiAgdmFyIGFyclByb3BzID0gc3RyLm1hdGNoKC97eyhbXnt9XSspfX0vZylcclxuICBpZiAoYXJyUHJvcHMgJiYgYXJyUHJvcHMubGVuZ3RoKSB7XHJcbiAgICBhcnJQcm9wcy5tYXAoZnVuY3Rpb24gKHMpIHtcclxuICAgICAgdmFyIHJlcCA9IHMucmVwbGFjZSgve3soW157fV0rKX19L2csICckMScpXHJcbiAgICAgIHZhciBpc09iamVjdE5vdGF0aW9uID0gc3RySW50ZXJwcmV0ZXIocmVwKVxyXG4gICAgICB2YXIgaXNUZXJuYXJ5ID0gdGVybmFyeU9wcy5jYWxsKHNlbGYsIHJlcClcclxuICAgICAgaWYgKCFpc09iamVjdE5vdGF0aW9uKSB7XHJcbiAgICAgICAgaWYgKHNlbGZbcmVwXSAhPT0gdW5kZWZpbmVkKSB7XHJcbiAgICAgICAgICB1cGRhdGVTdGF0ZUxpc3QocmVwKVxyXG4gICAgICAgICAgc3RyID0gc3RyLnJlcGxhY2UoJ3t7JyArIHJlcCArICd9fScsIHNlbGZbcmVwXSlcclxuICAgICAgICB9IGVsc2UgaWYgKGlzVGVybmFyeSkge1xyXG4gICAgICAgICAgdXBkYXRlU3RhdGVMaXN0KGlzVGVybmFyeS5zdGF0ZSlcclxuICAgICAgICAgIHN0ciA9IHN0ci5yZXBsYWNlKCd7eycgKyByZXAgKyAnfX0nLCBpc1Rlcm5hcnkudmFsdWUpXHJcbiAgICAgICAgfVxyXG4gICAgICB9IGVsc2Uge1xyXG4gICAgICAgIHVwZGF0ZVN0YXRlTGlzdChyZXApXHJcbiAgICAgICAgc3RyID0gc3RyLnJlcGxhY2UoJ3t7JyArIHJlcCArICd9fScsIHNlbGZbaXNPYmplY3ROb3RhdGlvblswXV1baXNPYmplY3ROb3RhdGlvblsxXV0pXHJcbiAgICAgIH1cclxuICAgICAgLy8gcmVzb2x2ZSBub2RlVmlzaWJpbGl0eVxyXG4gICAgICBpZiAocmVwLm1hdGNoKC9eXFw/L2cpKSB7XHJcbiAgICAgICAgdXBkYXRlU3RhdGVMaXN0KHJlcC5yZXBsYWNlKCc/JywgJycpKVxyXG4gICAgICB9XHJcbiAgICAgIC8vIHJlc29sdmUgbW9kZWxcclxuICAgICAgaWYgKHJlcC5tYXRjaCgvXm1vZGVsOi9nKSkge1xyXG4gICAgICAgIHZhciBtb2RlbFJlcCA9IHJlcC5yZXBsYWNlKCdtb2RlbDonLCAnJylcclxuICAgICAgICBpZiAoIX5zZWxmLl9fbW9kZWxMaXN0X18uaW5kZXhPZihtb2RlbFJlcCkpIHsgc2VsZi5fX21vZGVsTGlzdF9fLnB1c2gobW9kZWxSZXApIH1cclxuICAgICAgfVxyXG4gICAgICAvLyByZXNvbHZlIGNvbXBvbmVudFxyXG4gICAgICBpZiAocmVwLm1hdGNoKC9eY29tcG9uZW50Oi9nKSkge1xyXG4gICAgICAgIHZhciBjb21wb25lbnRSZXAgPSByZXAucmVwbGFjZSgnY29tcG9uZW50OicsICcnKVxyXG4gICAgICAgIGlmICghfnNlbGYuX19jb21wb25lbnRMaXN0X18uaW5kZXhPZihjb21wb25lbnRSZXApKSB7IHNlbGYuX19jb21wb25lbnRMaXN0X18ucHVzaChjb21wb25lbnRSZXApIH1cclxuICAgICAgfVxyXG4gICAgfSlcclxuICB9XHJcbiAgcmV0dXJuIHN0clxyXG59XHJcbiIsIid1c2Ugc3RyaWN0J1xyXG4vKipcclxuICogS2VldGpzIHY0LjAuMCBBbHBoYSByZWxlYXNlOiBodHRwczovL2dpdGh1Yi5jb20va2VldGpzL2tlZXQuanNcclxuICogTWluaW1hbGlzdCB2aWV3IGxheWVyIGZvciB0aGUgd2ViXHJcbiAqXHJcbiAqIDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PCBLZWV0anMgPj4+Pj4+Pj4+Pj4+Pj4+Pj4+Pj4+Pj4+Pj4+Pj4+XHJcbiAqXHJcbiAqIENvcHlyaWdodCAyMDE4LCBTaGFocnVsIE5pemFtIFNlbGFtYXRcclxuICogUmVsZWFzZWQgdW5kZXIgdGhlIE1JVCBMaWNlbnNlLlxyXG4gKi9cclxuXHJcbnZhciBwYXJzZVN0ciA9IHJlcXVpcmUoJy4vY29tcG9uZW50cy9wYXJzZVN0cicpXHJcbnZhciBzZXRTdGF0ZSA9IHJlcXVpcmUoJy4vY29tcG9uZW50cy9nZW5FbGVtZW50Jykuc2V0U3RhdGVcclxudmFyIGdlbkVsZW1lbnQgPSByZXF1aXJlKCcuL2NvbXBvbmVudHMvZ2VuRWxlbWVudCcpLmdlbkVsZW1lbnRcclxudmFyIHByb2Nlc3NFdmVudCA9IHJlcXVpcmUoJy4vY29tcG9uZW50cy9wcm9jZXNzRXZlbnQnKVxyXG52YXIgZ2V0SWQgPSByZXF1aXJlKCcuL3V0aWxzJykuZ2V0SWRcclxudmFyIHRlc3RFdmVudCA9IHJlcXVpcmUoJy4vdXRpbHMnKS50ZXN0RXZlbnRcclxudmFyIGxvb3BDaGlsZHMgPSByZXF1aXJlKCcuL3V0aWxzJykubG9vcENoaWxkc1xyXG52YXIgYXNzZXJ0ID0gcmVxdWlyZSgnLi91dGlscycpLmFzc2VydFxyXG5cclxuLyoqXHJcbiAqIEBkZXNjcmlwdGlvblxyXG4gKiBUaGUgbWFpbiBjb25zdHJ1Y3RvciBvZiBLZWV0XHJcbiAqXHJcbiAqIEJhc2ljIFVzYWdlIDotXHJcbiAqXHJcbiAqICAgIGNvbnN0IEFwcCBleHRlbmRzIEtlZXQge31cclxuICogICAgY29uc3QgYXBwID0gbmV3IEFwcCgpXHJcbiAqICAgIGFwcC5tb3VudCgnaGVsbG8gd29ybGQnKS5saW5rKCdhcHAnKVxyXG4gKlxyXG4gKi9cclxuZnVuY3Rpb24gS2VldCAoKSB7fVxyXG5cclxuS2VldC5wcm90b3R5cGUubW91bnQgPSBmdW5jdGlvbiAoaW5zdGFuY2UpIHtcclxuICB2YXIgYmFzZVxyXG4gIHZhciBmcmFnID0gW11cclxuICAvLyBCZWZvcmUgd2UgYmVnaW4gdG8gcGFyc2UgYW4gaW5zdGFuY2UsIGRvIGEgcnVuLWRvd24gY2hlY2tzXHJcbiAgLy8gdG8gY2xlYW4gdXAgYmFjay10aWNrIHN0cmluZyB3aGljaCB1c3VhbGx5IGhhcyBsaW5lIHNwYWNpbmcuXHJcbiAgaWYgKHR5cGVvZiBpbnN0YW5jZSA9PT0gJ3N0cmluZycpIHtcclxuICAgIGJhc2UgPSBpbnN0YW5jZS50cmltKCkucmVwbGFjZSgvXFxzKy9nLCAnICcpXHJcbiAgLy8gSWYgaW5zdGFuY2UgaXMgYSBodG1sIGVsZW1lbnQgKHVzdWFsbHkgdXNpbmcgdGVtcGxhdGUgbGl0ZXJhbHMpLFxyXG4gIC8vIGNvbnZlcnQgaXQgYmFjayB0byBzdHJpbmcuXHJcbiAgfSBlbHNlIGlmICh0eXBlb2YgaW5zdGFuY2UgPT09ICdvYmplY3QnICYmIGluc3RhbmNlWydub2RlVHlwZSddKSB7XHJcbiAgICBpZiAoaW5zdGFuY2VbJ25vZGVUeXBlJ10gPT09IDEpIHtcclxuICAgICAgYmFzZSA9IGluc3RhbmNlLm91dGVySFRNTC50b1N0cmluZygpXHJcbiAgICB9IGVsc2UgaWYgKGluc3RhbmNlWydub2RlVHlwZSddID09PSAxMSB8fCBpbnN0YW5jZVsnbm9kZVR5cGUnXSA9PT0gMykge1xyXG4gICAgICB2YXIgc2VyaWFsaXplciA9IG5ldyBYTUxTZXJpYWxpemVyKClcclxuICAgICAgYmFzZSA9IHNlcmlhbGl6ZXIuc2VyaWFsaXplVG9TdHJpbmcoaW5zdGFuY2UpXHJcbiAgICB9IGVsc2Uge1xyXG4gICAgICBhc3NlcnQoZmFsc2UsICdVbmFibGUgdG8gcGFyc2UgaW5zdGFuY2UsIHVua25vd24gdHlwZS4nKVxyXG4gICAgfVxyXG4gICAgLy8gY2xlYW4gdXAgZG9jdW1lbnQgY3JlYXRpb24gZnJvbSBwb3RlbnRpYWwgbWVtb3J5IGxlYWtzXHJcbiAgICBsb29wQ2hpbGRzKGZyYWcsIGluc3RhbmNlKVxyXG4gICAgZnJhZy5tYXAoZnVuY3Rpb24gKGZyYWdtZW50KSB7IGZyYWdtZW50LnJlbW92ZSgpIH0pXHJcbiAgfSBlbHNlIHtcclxuICAgIGFzc2VydCh0eXBlb2YgaW5zdGFuY2UgPT09ICdzdHJpbmcnIHx8IHR5cGVvZiBpbnN0YW5jZSA9PT0gJ29iamVjdCcsICdQYXJhbWV0ZXIgaXMgbm90IGEgc3RyaW5nIG9yIGEgaHRtbCBlbGVtZW50LicpXHJcbiAgfVxyXG4gIC8vIHdlIHN0b3JlIHRoZSBwcmlzdGluZSBpbnN0YW5jZSBpbiBDb21wb25lbnQuYmFzZVxyXG4gIHRoaXMuYmFzZSA9IGJhc2VcclxuICByZXR1cm4gdGhpc1xyXG59XHJcblxyXG5LZWV0LnByb3RvdHlwZS5mbHVzaCA9IGZ1bmN0aW9uIChpbnN0YW5jZSkge1xyXG4gIC8vIEN1c3RvbSBtZXRob2QgdG8gY2xlYW4gdXAgdGhlIGNvbXBvbmVudCBET00gdHJlZVxyXG4gIC8vIHVzZWZ1bCBpZiB3ZSBuZWVkIHRvIGRvIGNsZWFuIHVwIHJlcmVuZGVyLlxyXG4gIHZhciBlbCA9IGluc3RhbmNlIHx8IHRoaXMuZWxcclxuICB2YXIgZWxlID0gZ2V0SWQoZWwpXHJcbiAgaWYgKGVsZSkgZWxlLmlubmVySFRNTCA9ICcnXHJcbiAgcmV0dXJuIHRoaXNcclxufVxyXG5cclxuS2VldC5wcm90b3R5cGUubGluayA9IGZ1bmN0aW9uIChpZCkge1xyXG4gIC8vIFRoZSB0YXJnZXQgRE9NIHdoZXJlIHRoZSByZW5kZXJpbmcgd2lsbCB0b29rIHBsYWNlLlxyXG4gIC8vIFdlIGNvdWxkIGFsc28gYXBwbHkgbGlmZS1jeWNsZSBtZXRob2QgYmVmb3JlIHRoZVxyXG4gIC8vIHJlbmRlciBoYXBwZW4uXHJcbiAgaWYgKCFpZCkgYXNzZXJ0KGlkLCAnTm8gaWQgaXMgZ2l2ZW4gYXMgcGFyYW1ldGVyLicpXHJcbiAgdGhpcy5lbCA9IGlkXHJcbiAgLy8gbGlmZS1jeWNsZSBtZXRob2QgYmVmb3JlIHJlbmRlcmluZyB0aGUgY29tcG9uZW50XHJcbiAgaWYgKHRoaXMuY29tcG9uZW50V2lsbE1vdW50ICYmIHR5cGVvZiB0aGlzLmNvbXBvbmVudFdpbGxNb3VudCA9PT0gJ2Z1bmN0aW9uJykge1xyXG4gICAgdGhpcy5jb21wb25lbnRXaWxsTW91bnQoKVxyXG4gIH1cclxuICB0aGlzLnJlbmRlcigpXHJcbiAgcmV0dXJuIHRoaXNcclxufVxyXG5cclxuS2VldC5wcm90b3R5cGUucmVuZGVyID0gZnVuY3Rpb24gKHN0dWIpIHtcclxuICBpZiAoc3R1Yikge1xyXG4gICAgLy8gbGlmZS1jeWNsZSBtZXRob2QgYmVmb3JlIHJlbmRlcmluZyB0aGUgY29tcG9uZW50XHJcbiAgICBpZiAoIXRoaXMuV0lMTF9NT1VOVCAmJiB0aGlzLmNvbXBvbmVudFdpbGxNb3VudCAmJiB0eXBlb2YgdGhpcy5jb21wb25lbnRXaWxsTW91bnQgPT09ICdmdW5jdGlvbicpIHtcclxuICAgICAgdGhpcy5XSUxMX01PVU5UID0gdHJ1ZVxyXG4gICAgICB0aGlzLmNvbXBvbmVudFdpbGxNb3VudCgpXHJcbiAgICB9XHJcbiAgICByZXR1cm4gcGFyc2VTdHIuY2FsbCh0aGlzLCBzdHViKVxyXG4gIH0gZWxzZSB7XHJcbiAgICAvLyBSZW5kZXIgdGhpcyBjb21wb25lbnQgdG8gdGhlIHRhcmdldCBET01cclxuICAgIHBhcnNlU3RyLmNhbGwodGhpcylcclxuICAgIHJldHVybiB0aGlzXHJcbiAgfVxyXG59XHJcblxyXG5LZWV0LnByb3RvdHlwZS5jbHVzdGVyID0gZnVuY3Rpb24gKCkge1xyXG4gIC8vIENoYWluIG1ldGhvZCB0byBydW4gZXh0ZXJuYWwgZnVuY3Rpb24ocyksIHRoaXMgYmFzaWNhbGx5IHNlcnZlXHJcbiAgLy8gYXMgYW4gaW5pdGlhbGl6ZXIgZm9yIGFsbCBub24gYXR0YWNoZWQgY2hpbGQgY29tcG9uZW50cyB3aXRoaW4gdGhlIGluc3RhbmNlIHRyZWVcclxuICB2YXIgYXJncyA9IFtdLnNsaWNlLmNhbGwoYXJndW1lbnRzKVxyXG4gIGlmIChhcmdzLmxlbmd0aCA+IDApIHtcclxuICAgIGFyZ3MubWFwKGZ1bmN0aW9uIChmKSB7XHJcbiAgICAgIGlmICh0eXBlb2YgZiA9PT0gJ2Z1bmN0aW9uJykgZigpXHJcbiAgICB9KVxyXG4gIH1cclxufVxyXG5cclxuS2VldC5wcm90b3R5cGUuc3R1YlJlbmRlciA9IGZ1bmN0aW9uICh0cGwsIG5vZGUpIHtcclxuICAvLyBzdWItY29tcG9uZW50IHJlbmRlcmluZ1xyXG4gIHNldFN0YXRlLmNhbGwodGhpcylcclxuICB0ZXN0RXZlbnQodHBsKSAmJiBwcm9jZXNzRXZlbnQuY2FsbCh0aGlzLCBub2RlKVxyXG4gIC8vIHNpbmNlIGNvbXBvbmVudCBhbHJlYWR5IHJlbmRlcmVkLCB0cmlnZ2VyIGl0cyBsaWZlLWN5Y2xlIG1ldGhvZFxyXG4gIGlmICghdGhpcy5ESURfTU9VTlQgJiYgdGhpcy5jb21wb25lbnREaWRNb3VudCAmJiB0eXBlb2YgdGhpcy5jb21wb25lbnREaWRNb3VudCA9PT0gJ2Z1bmN0aW9uJykge1xyXG4gICAgdGhpcy5ESURfTU9VTlQgPSB0cnVlXHJcbiAgICB0aGlzLmNvbXBvbmVudERpZE1vdW50KClcclxuICB9XHJcbn1cclxuXHJcbktlZXQucHJvdG90eXBlLmNhbGxCYXRjaFBvb2xVcGRhdGUgPSBmdW5jdGlvbiAoKSB7XHJcbiAgLy8gZm9yY2UgY29tcG9uZW50IHRvIHVwZGF0ZSwgaWYgYW55IHN0YXRlIC8gbm9uLXN0YXRlXHJcbiAgLy8gdmFsdWUgY2hhbmdlZCBET00gZGlmZmluZyB3aWxsIG9jY3VyXHJcbiAgZ2VuRWxlbWVudC5jYWxsKHRoaXMsIHRydWUpXHJcbn1cclxuXHJcbm1vZHVsZS5leHBvcnRzID0gS2VldFxyXG4iLCIndXNlIHN0cmljdCc7XG5cbnZhciByYW5nZTsgLy8gQ3JlYXRlIGEgcmFuZ2Ugb2JqZWN0IGZvciBlZmZpY2VudGx5IHJlbmRlcmluZyBzdHJpbmdzIHRvIGVsZW1lbnRzLlxudmFyIE5TX1hIVE1MID0gJ2h0dHA6Ly93d3cudzMub3JnLzE5OTkveGh0bWwnO1xuXG52YXIgZG9jID0gdHlwZW9mIGRvY3VtZW50ID09PSAndW5kZWZpbmVkJyA/IHVuZGVmaW5lZCA6IGRvY3VtZW50O1xuXG52YXIgdGVzdEVsID0gZG9jID9cbiAgICBkb2MuYm9keSB8fCBkb2MuY3JlYXRlRWxlbWVudCgnZGl2JykgOlxuICAgIHt9O1xuXG4vLyBGaXhlcyA8aHR0cHM6Ly9naXRodWIuY29tL3BhdHJpY2stc3RlZWxlLWlkZW0vbW9ycGhkb20vaXNzdWVzLzMyPlxuLy8gKElFNysgc3VwcG9ydCkgPD1JRTcgZG9lcyBub3Qgc3VwcG9ydCBlbC5oYXNBdHRyaWJ1dGUobmFtZSlcbnZhciBhY3R1YWxIYXNBdHRyaWJ1dGVOUztcblxuaWYgKHRlc3RFbC5oYXNBdHRyaWJ1dGVOUykge1xuICAgIGFjdHVhbEhhc0F0dHJpYnV0ZU5TID0gZnVuY3Rpb24oZWwsIG5hbWVzcGFjZVVSSSwgbmFtZSkge1xuICAgICAgICByZXR1cm4gZWwuaGFzQXR0cmlidXRlTlMobmFtZXNwYWNlVVJJLCBuYW1lKTtcbiAgICB9O1xufSBlbHNlIGlmICh0ZXN0RWwuaGFzQXR0cmlidXRlKSB7XG4gICAgYWN0dWFsSGFzQXR0cmlidXRlTlMgPSBmdW5jdGlvbihlbCwgbmFtZXNwYWNlVVJJLCBuYW1lKSB7XG4gICAgICAgIHJldHVybiBlbC5oYXNBdHRyaWJ1dGUobmFtZSk7XG4gICAgfTtcbn0gZWxzZSB7XG4gICAgYWN0dWFsSGFzQXR0cmlidXRlTlMgPSBmdW5jdGlvbihlbCwgbmFtZXNwYWNlVVJJLCBuYW1lKSB7XG4gICAgICAgIHJldHVybiBlbC5nZXRBdHRyaWJ1dGVOb2RlKG5hbWVzcGFjZVVSSSwgbmFtZSkgIT0gbnVsbDtcbiAgICB9O1xufVxuXG52YXIgaGFzQXR0cmlidXRlTlMgPSBhY3R1YWxIYXNBdHRyaWJ1dGVOUztcblxuXG5mdW5jdGlvbiB0b0VsZW1lbnQoc3RyKSB7XG4gICAgaWYgKCFyYW5nZSAmJiBkb2MuY3JlYXRlUmFuZ2UpIHtcbiAgICAgICAgcmFuZ2UgPSBkb2MuY3JlYXRlUmFuZ2UoKTtcbiAgICAgICAgcmFuZ2Uuc2VsZWN0Tm9kZShkb2MuYm9keSk7XG4gICAgfVxuXG4gICAgdmFyIGZyYWdtZW50O1xuICAgIGlmIChyYW5nZSAmJiByYW5nZS5jcmVhdGVDb250ZXh0dWFsRnJhZ21lbnQpIHtcbiAgICAgICAgZnJhZ21lbnQgPSByYW5nZS5jcmVhdGVDb250ZXh0dWFsRnJhZ21lbnQoc3RyKTtcbiAgICB9IGVsc2Uge1xuICAgICAgICBmcmFnbWVudCA9IGRvYy5jcmVhdGVFbGVtZW50KCdib2R5Jyk7XG4gICAgICAgIGZyYWdtZW50LmlubmVySFRNTCA9IHN0cjtcbiAgICB9XG4gICAgcmV0dXJuIGZyYWdtZW50LmNoaWxkTm9kZXNbMF07XG59XG5cbi8qKlxuICogUmV0dXJucyB0cnVlIGlmIHR3byBub2RlJ3MgbmFtZXMgYXJlIHRoZSBzYW1lLlxuICpcbiAqIE5PVEU6IFdlIGRvbid0IGJvdGhlciBjaGVja2luZyBgbmFtZXNwYWNlVVJJYCBiZWNhdXNlIHlvdSB3aWxsIG5ldmVyIGZpbmQgdHdvIEhUTUwgZWxlbWVudHMgd2l0aCB0aGUgc2FtZVxuICogICAgICAgbm9kZU5hbWUgYW5kIGRpZmZlcmVudCBuYW1lc3BhY2UgVVJJcy5cbiAqXG4gKiBAcGFyYW0ge0VsZW1lbnR9IGFcbiAqIEBwYXJhbSB7RWxlbWVudH0gYiBUaGUgdGFyZ2V0IGVsZW1lbnRcbiAqIEByZXR1cm4ge2Jvb2xlYW59XG4gKi9cbmZ1bmN0aW9uIGNvbXBhcmVOb2RlTmFtZXMoZnJvbUVsLCB0b0VsKSB7XG4gICAgdmFyIGZyb21Ob2RlTmFtZSA9IGZyb21FbC5ub2RlTmFtZTtcbiAgICB2YXIgdG9Ob2RlTmFtZSA9IHRvRWwubm9kZU5hbWU7XG5cbiAgICBpZiAoZnJvbU5vZGVOYW1lID09PSB0b05vZGVOYW1lKSB7XG4gICAgICAgIHJldHVybiB0cnVlO1xuICAgIH1cblxuICAgIGlmICh0b0VsLmFjdHVhbGl6ZSAmJlxuICAgICAgICBmcm9tTm9kZU5hbWUuY2hhckNvZGVBdCgwKSA8IDkxICYmIC8qIGZyb20gdGFnIG5hbWUgaXMgdXBwZXIgY2FzZSAqL1xuICAgICAgICB0b05vZGVOYW1lLmNoYXJDb2RlQXQoMCkgPiA5MCAvKiB0YXJnZXQgdGFnIG5hbWUgaXMgbG93ZXIgY2FzZSAqLykge1xuICAgICAgICAvLyBJZiB0aGUgdGFyZ2V0IGVsZW1lbnQgaXMgYSB2aXJ0dWFsIERPTSBub2RlIHRoZW4gd2UgbWF5IG5lZWQgdG8gbm9ybWFsaXplIHRoZSB0YWcgbmFtZVxuICAgICAgICAvLyBiZWZvcmUgY29tcGFyaW5nLiBOb3JtYWwgSFRNTCBlbGVtZW50cyB0aGF0IGFyZSBpbiB0aGUgXCJodHRwOi8vd3d3LnczLm9yZy8xOTk5L3hodG1sXCJcbiAgICAgICAgLy8gYXJlIGNvbnZlcnRlZCB0byB1cHBlciBjYXNlXG4gICAgICAgIHJldHVybiBmcm9tTm9kZU5hbWUgPT09IHRvTm9kZU5hbWUudG9VcHBlckNhc2UoKTtcbiAgICB9IGVsc2Uge1xuICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxufVxuXG4vKipcbiAqIENyZWF0ZSBhbiBlbGVtZW50LCBvcHRpb25hbGx5IHdpdGggYSBrbm93biBuYW1lc3BhY2UgVVJJLlxuICpcbiAqIEBwYXJhbSB7c3RyaW5nfSBuYW1lIHRoZSBlbGVtZW50IG5hbWUsIGUuZy4gJ2Rpdicgb3IgJ3N2ZydcbiAqIEBwYXJhbSB7c3RyaW5nfSBbbmFtZXNwYWNlVVJJXSB0aGUgZWxlbWVudCdzIG5hbWVzcGFjZSBVUkksIGkuZS4gdGhlIHZhbHVlIG9mXG4gKiBpdHMgYHhtbG5zYCBhdHRyaWJ1dGUgb3IgaXRzIGluZmVycmVkIG5hbWVzcGFjZS5cbiAqXG4gKiBAcmV0dXJuIHtFbGVtZW50fVxuICovXG5mdW5jdGlvbiBjcmVhdGVFbGVtZW50TlMobmFtZSwgbmFtZXNwYWNlVVJJKSB7XG4gICAgcmV0dXJuICFuYW1lc3BhY2VVUkkgfHwgbmFtZXNwYWNlVVJJID09PSBOU19YSFRNTCA/XG4gICAgICAgIGRvYy5jcmVhdGVFbGVtZW50KG5hbWUpIDpcbiAgICAgICAgZG9jLmNyZWF0ZUVsZW1lbnROUyhuYW1lc3BhY2VVUkksIG5hbWUpO1xufVxuXG4vKipcbiAqIENvcGllcyB0aGUgY2hpbGRyZW4gb2Ygb25lIERPTSBlbGVtZW50IHRvIGFub3RoZXIgRE9NIGVsZW1lbnRcbiAqL1xuZnVuY3Rpb24gbW92ZUNoaWxkcmVuKGZyb21FbCwgdG9FbCkge1xuICAgIHZhciBjdXJDaGlsZCA9IGZyb21FbC5maXJzdENoaWxkO1xuICAgIHdoaWxlIChjdXJDaGlsZCkge1xuICAgICAgICB2YXIgbmV4dENoaWxkID0gY3VyQ2hpbGQubmV4dFNpYmxpbmc7XG4gICAgICAgIHRvRWwuYXBwZW5kQ2hpbGQoY3VyQ2hpbGQpO1xuICAgICAgICBjdXJDaGlsZCA9IG5leHRDaGlsZDtcbiAgICB9XG4gICAgcmV0dXJuIHRvRWw7XG59XG5cbmZ1bmN0aW9uIG1vcnBoQXR0cnMoZnJvbU5vZGUsIHRvTm9kZSkge1xuICAgIHZhciBhdHRycyA9IHRvTm9kZS5hdHRyaWJ1dGVzO1xuICAgIHZhciBpO1xuICAgIHZhciBhdHRyO1xuICAgIHZhciBhdHRyTmFtZTtcbiAgICB2YXIgYXR0ck5hbWVzcGFjZVVSSTtcbiAgICB2YXIgYXR0clZhbHVlO1xuICAgIHZhciBmcm9tVmFsdWU7XG5cbiAgICBmb3IgKGkgPSBhdHRycy5sZW5ndGggLSAxOyBpID49IDA7IC0taSkge1xuICAgICAgICBhdHRyID0gYXR0cnNbaV07XG4gICAgICAgIGF0dHJOYW1lID0gYXR0ci5uYW1lO1xuICAgICAgICBhdHRyTmFtZXNwYWNlVVJJID0gYXR0ci5uYW1lc3BhY2VVUkk7XG4gICAgICAgIGF0dHJWYWx1ZSA9IGF0dHIudmFsdWU7XG5cbiAgICAgICAgaWYgKGF0dHJOYW1lc3BhY2VVUkkpIHtcbiAgICAgICAgICAgIGF0dHJOYW1lID0gYXR0ci5sb2NhbE5hbWUgfHwgYXR0ck5hbWU7XG4gICAgICAgICAgICBmcm9tVmFsdWUgPSBmcm9tTm9kZS5nZXRBdHRyaWJ1dGVOUyhhdHRyTmFtZXNwYWNlVVJJLCBhdHRyTmFtZSk7XG5cbiAgICAgICAgICAgIGlmIChmcm9tVmFsdWUgIT09IGF0dHJWYWx1ZSkge1xuICAgICAgICAgICAgICAgIGZyb21Ob2RlLnNldEF0dHJpYnV0ZU5TKGF0dHJOYW1lc3BhY2VVUkksIGF0dHJOYW1lLCBhdHRyVmFsdWUpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgZnJvbVZhbHVlID0gZnJvbU5vZGUuZ2V0QXR0cmlidXRlKGF0dHJOYW1lKTtcblxuICAgICAgICAgICAgaWYgKGZyb21WYWx1ZSAhPT0gYXR0clZhbHVlKSB7XG4gICAgICAgICAgICAgICAgZnJvbU5vZGUuc2V0QXR0cmlidXRlKGF0dHJOYW1lLCBhdHRyVmFsdWUpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfVxuXG4gICAgLy8gUmVtb3ZlIGFueSBleHRyYSBhdHRyaWJ1dGVzIGZvdW5kIG9uIHRoZSBvcmlnaW5hbCBET00gZWxlbWVudCB0aGF0XG4gICAgLy8gd2VyZW4ndCBmb3VuZCBvbiB0aGUgdGFyZ2V0IGVsZW1lbnQuXG4gICAgYXR0cnMgPSBmcm9tTm9kZS5hdHRyaWJ1dGVzO1xuXG4gICAgZm9yIChpID0gYXR0cnMubGVuZ3RoIC0gMTsgaSA+PSAwOyAtLWkpIHtcbiAgICAgICAgYXR0ciA9IGF0dHJzW2ldO1xuICAgICAgICBpZiAoYXR0ci5zcGVjaWZpZWQgIT09IGZhbHNlKSB7XG4gICAgICAgICAgICBhdHRyTmFtZSA9IGF0dHIubmFtZTtcbiAgICAgICAgICAgIGF0dHJOYW1lc3BhY2VVUkkgPSBhdHRyLm5hbWVzcGFjZVVSSTtcblxuICAgICAgICAgICAgaWYgKGF0dHJOYW1lc3BhY2VVUkkpIHtcbiAgICAgICAgICAgICAgICBhdHRyTmFtZSA9IGF0dHIubG9jYWxOYW1lIHx8IGF0dHJOYW1lO1xuXG4gICAgICAgICAgICAgICAgaWYgKCFoYXNBdHRyaWJ1dGVOUyh0b05vZGUsIGF0dHJOYW1lc3BhY2VVUkksIGF0dHJOYW1lKSkge1xuICAgICAgICAgICAgICAgICAgICBmcm9tTm9kZS5yZW1vdmVBdHRyaWJ1dGVOUyhhdHRyTmFtZXNwYWNlVVJJLCBhdHRyTmFtZSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBpZiAoIWhhc0F0dHJpYnV0ZU5TKHRvTm9kZSwgbnVsbCwgYXR0ck5hbWUpKSB7XG4gICAgICAgICAgICAgICAgICAgIGZyb21Ob2RlLnJlbW92ZUF0dHJpYnV0ZShhdHRyTmFtZSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfVxufVxuXG5mdW5jdGlvbiBzeW5jQm9vbGVhbkF0dHJQcm9wKGZyb21FbCwgdG9FbCwgbmFtZSkge1xuICAgIGlmIChmcm9tRWxbbmFtZV0gIT09IHRvRWxbbmFtZV0pIHtcbiAgICAgICAgZnJvbUVsW25hbWVdID0gdG9FbFtuYW1lXTtcbiAgICAgICAgaWYgKGZyb21FbFtuYW1lXSkge1xuICAgICAgICAgICAgZnJvbUVsLnNldEF0dHJpYnV0ZShuYW1lLCAnJyk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBmcm9tRWwucmVtb3ZlQXR0cmlidXRlKG5hbWUsICcnKTtcbiAgICAgICAgfVxuICAgIH1cbn1cblxudmFyIHNwZWNpYWxFbEhhbmRsZXJzID0ge1xuICAgIC8qKlxuICAgICAqIE5lZWRlZCBmb3IgSUUuIEFwcGFyZW50bHkgSUUgZG9lc24ndCB0aGluayB0aGF0IFwic2VsZWN0ZWRcIiBpcyBhblxuICAgICAqIGF0dHJpYnV0ZSB3aGVuIHJlYWRpbmcgb3ZlciB0aGUgYXR0cmlidXRlcyB1c2luZyBzZWxlY3RFbC5hdHRyaWJ1dGVzXG4gICAgICovXG4gICAgT1BUSU9OOiBmdW5jdGlvbihmcm9tRWwsIHRvRWwpIHtcbiAgICAgICAgc3luY0Jvb2xlYW5BdHRyUHJvcChmcm9tRWwsIHRvRWwsICdzZWxlY3RlZCcpO1xuICAgIH0sXG4gICAgLyoqXG4gICAgICogVGhlIFwidmFsdWVcIiBhdHRyaWJ1dGUgaXMgc3BlY2lhbCBmb3IgdGhlIDxpbnB1dD4gZWxlbWVudCBzaW5jZSBpdCBzZXRzXG4gICAgICogdGhlIGluaXRpYWwgdmFsdWUuIENoYW5naW5nIHRoZSBcInZhbHVlXCIgYXR0cmlidXRlIHdpdGhvdXQgY2hhbmdpbmcgdGhlXG4gICAgICogXCJ2YWx1ZVwiIHByb3BlcnR5IHdpbGwgaGF2ZSBubyBlZmZlY3Qgc2luY2UgaXQgaXMgb25seSB1c2VkIHRvIHRoZSBzZXQgdGhlXG4gICAgICogaW5pdGlhbCB2YWx1ZS4gIFNpbWlsYXIgZm9yIHRoZSBcImNoZWNrZWRcIiBhdHRyaWJ1dGUsIGFuZCBcImRpc2FibGVkXCIuXG4gICAgICovXG4gICAgSU5QVVQ6IGZ1bmN0aW9uKGZyb21FbCwgdG9FbCkge1xuICAgICAgICBzeW5jQm9vbGVhbkF0dHJQcm9wKGZyb21FbCwgdG9FbCwgJ2NoZWNrZWQnKTtcbiAgICAgICAgc3luY0Jvb2xlYW5BdHRyUHJvcChmcm9tRWwsIHRvRWwsICdkaXNhYmxlZCcpO1xuXG4gICAgICAgIGlmIChmcm9tRWwudmFsdWUgIT09IHRvRWwudmFsdWUpIHtcbiAgICAgICAgICAgIGZyb21FbC52YWx1ZSA9IHRvRWwudmFsdWU7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAoIWhhc0F0dHJpYnV0ZU5TKHRvRWwsIG51bGwsICd2YWx1ZScpKSB7XG4gICAgICAgICAgICBmcm9tRWwucmVtb3ZlQXR0cmlidXRlKCd2YWx1ZScpO1xuICAgICAgICB9XG4gICAgfSxcblxuICAgIFRFWFRBUkVBOiBmdW5jdGlvbihmcm9tRWwsIHRvRWwpIHtcbiAgICAgICAgdmFyIG5ld1ZhbHVlID0gdG9FbC52YWx1ZTtcbiAgICAgICAgaWYgKGZyb21FbC52YWx1ZSAhPT0gbmV3VmFsdWUpIHtcbiAgICAgICAgICAgIGZyb21FbC52YWx1ZSA9IG5ld1ZhbHVlO1xuICAgICAgICB9XG5cbiAgICAgICAgdmFyIGZpcnN0Q2hpbGQgPSBmcm9tRWwuZmlyc3RDaGlsZDtcbiAgICAgICAgaWYgKGZpcnN0Q2hpbGQpIHtcbiAgICAgICAgICAgIC8vIE5lZWRlZCBmb3IgSUUuIEFwcGFyZW50bHkgSUUgc2V0cyB0aGUgcGxhY2Vob2xkZXIgYXMgdGhlXG4gICAgICAgICAgICAvLyBub2RlIHZhbHVlIGFuZCB2aXNlIHZlcnNhLiBUaGlzIGlnbm9yZXMgYW4gZW1wdHkgdXBkYXRlLlxuICAgICAgICAgICAgdmFyIG9sZFZhbHVlID0gZmlyc3RDaGlsZC5ub2RlVmFsdWU7XG5cbiAgICAgICAgICAgIGlmIChvbGRWYWx1ZSA9PSBuZXdWYWx1ZSB8fCAoIW5ld1ZhbHVlICYmIG9sZFZhbHVlID09IGZyb21FbC5wbGFjZWhvbGRlcikpIHtcbiAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGZpcnN0Q2hpbGQubm9kZVZhbHVlID0gbmV3VmFsdWU7XG4gICAgICAgIH1cbiAgICB9LFxuICAgIFNFTEVDVDogZnVuY3Rpb24oZnJvbUVsLCB0b0VsKSB7XG4gICAgICAgIGlmICghaGFzQXR0cmlidXRlTlModG9FbCwgbnVsbCwgJ211bHRpcGxlJykpIHtcbiAgICAgICAgICAgIHZhciBzZWxlY3RlZEluZGV4ID0gLTE7XG4gICAgICAgICAgICB2YXIgaSA9IDA7XG4gICAgICAgICAgICB2YXIgY3VyQ2hpbGQgPSB0b0VsLmZpcnN0Q2hpbGQ7XG4gICAgICAgICAgICB3aGlsZShjdXJDaGlsZCkge1xuICAgICAgICAgICAgICAgIHZhciBub2RlTmFtZSA9IGN1ckNoaWxkLm5vZGVOYW1lO1xuICAgICAgICAgICAgICAgIGlmIChub2RlTmFtZSAmJiBub2RlTmFtZS50b1VwcGVyQ2FzZSgpID09PSAnT1BUSU9OJykge1xuICAgICAgICAgICAgICAgICAgICBpZiAoaGFzQXR0cmlidXRlTlMoY3VyQ2hpbGQsIG51bGwsICdzZWxlY3RlZCcpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBzZWxlY3RlZEluZGV4ID0gaTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIGkrKztcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgY3VyQ2hpbGQgPSBjdXJDaGlsZC5uZXh0U2libGluZztcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgZnJvbUVsLnNlbGVjdGVkSW5kZXggPSBpO1xuICAgICAgICB9XG4gICAgfVxufTtcblxudmFyIEVMRU1FTlRfTk9ERSA9IDE7XG52YXIgVEVYVF9OT0RFID0gMztcbnZhciBDT01NRU5UX05PREUgPSA4O1xuXG5mdW5jdGlvbiBub29wKCkge31cblxuZnVuY3Rpb24gZGVmYXVsdEdldE5vZGVLZXkobm9kZSkge1xuICAgIHJldHVybiBub2RlLmlkO1xufVxuXG5mdW5jdGlvbiBtb3JwaGRvbUZhY3RvcnkobW9ycGhBdHRycykge1xuXG4gICAgcmV0dXJuIGZ1bmN0aW9uIG1vcnBoZG9tKGZyb21Ob2RlLCB0b05vZGUsIG9wdGlvbnMpIHtcbiAgICAgICAgaWYgKCFvcHRpb25zKSB7XG4gICAgICAgICAgICBvcHRpb25zID0ge307XG4gICAgICAgIH1cblxuICAgICAgICBpZiAodHlwZW9mIHRvTm9kZSA9PT0gJ3N0cmluZycpIHtcbiAgICAgICAgICAgIGlmIChmcm9tTm9kZS5ub2RlTmFtZSA9PT0gJyNkb2N1bWVudCcgfHwgZnJvbU5vZGUubm9kZU5hbWUgPT09ICdIVE1MJykge1xuICAgICAgICAgICAgICAgIHZhciB0b05vZGVIdG1sID0gdG9Ob2RlO1xuICAgICAgICAgICAgICAgIHRvTm9kZSA9IGRvYy5jcmVhdGVFbGVtZW50KCdodG1sJyk7XG4gICAgICAgICAgICAgICAgdG9Ob2RlLmlubmVySFRNTCA9IHRvTm9kZUh0bWw7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIHRvTm9kZSA9IHRvRWxlbWVudCh0b05vZGUpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgdmFyIGdldE5vZGVLZXkgPSBvcHRpb25zLmdldE5vZGVLZXkgfHwgZGVmYXVsdEdldE5vZGVLZXk7XG4gICAgICAgIHZhciBvbkJlZm9yZU5vZGVBZGRlZCA9IG9wdGlvbnMub25CZWZvcmVOb2RlQWRkZWQgfHwgbm9vcDtcbiAgICAgICAgdmFyIG9uTm9kZUFkZGVkID0gb3B0aW9ucy5vbk5vZGVBZGRlZCB8fCBub29wO1xuICAgICAgICB2YXIgb25CZWZvcmVFbFVwZGF0ZWQgPSBvcHRpb25zLm9uQmVmb3JlRWxVcGRhdGVkIHx8IG5vb3A7XG4gICAgICAgIHZhciBvbkVsVXBkYXRlZCA9IG9wdGlvbnMub25FbFVwZGF0ZWQgfHwgbm9vcDtcbiAgICAgICAgdmFyIG9uQmVmb3JlTm9kZURpc2NhcmRlZCA9IG9wdGlvbnMub25CZWZvcmVOb2RlRGlzY2FyZGVkIHx8IG5vb3A7XG4gICAgICAgIHZhciBvbk5vZGVEaXNjYXJkZWQgPSBvcHRpb25zLm9uTm9kZURpc2NhcmRlZCB8fCBub29wO1xuICAgICAgICB2YXIgb25CZWZvcmVFbENoaWxkcmVuVXBkYXRlZCA9IG9wdGlvbnMub25CZWZvcmVFbENoaWxkcmVuVXBkYXRlZCB8fCBub29wO1xuICAgICAgICB2YXIgY2hpbGRyZW5Pbmx5ID0gb3B0aW9ucy5jaGlsZHJlbk9ubHkgPT09IHRydWU7XG5cbiAgICAgICAgLy8gVGhpcyBvYmplY3QgaXMgdXNlZCBhcyBhIGxvb2t1cCB0byBxdWlja2x5IGZpbmQgYWxsIGtleWVkIGVsZW1lbnRzIGluIHRoZSBvcmlnaW5hbCBET00gdHJlZS5cbiAgICAgICAgdmFyIGZyb21Ob2Rlc0xvb2t1cCA9IHt9O1xuICAgICAgICB2YXIga2V5ZWRSZW1vdmFsTGlzdDtcblxuICAgICAgICBmdW5jdGlvbiBhZGRLZXllZFJlbW92YWwoa2V5KSB7XG4gICAgICAgICAgICBpZiAoa2V5ZWRSZW1vdmFsTGlzdCkge1xuICAgICAgICAgICAgICAgIGtleWVkUmVtb3ZhbExpc3QucHVzaChrZXkpO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBrZXllZFJlbW92YWxMaXN0ID0gW2tleV07XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICBmdW5jdGlvbiB3YWxrRGlzY2FyZGVkQ2hpbGROb2Rlcyhub2RlLCBza2lwS2V5ZWROb2Rlcykge1xuICAgICAgICAgICAgaWYgKG5vZGUubm9kZVR5cGUgPT09IEVMRU1FTlRfTk9ERSkge1xuICAgICAgICAgICAgICAgIHZhciBjdXJDaGlsZCA9IG5vZGUuZmlyc3RDaGlsZDtcbiAgICAgICAgICAgICAgICB3aGlsZSAoY3VyQ2hpbGQpIHtcblxuICAgICAgICAgICAgICAgICAgICB2YXIga2V5ID0gdW5kZWZpbmVkO1xuXG4gICAgICAgICAgICAgICAgICAgIGlmIChza2lwS2V5ZWROb2RlcyAmJiAoa2V5ID0gZ2V0Tm9kZUtleShjdXJDaGlsZCkpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBJZiB3ZSBhcmUgc2tpcHBpbmcga2V5ZWQgbm9kZXMgdGhlbiB3ZSBhZGQgdGhlIGtleVxuICAgICAgICAgICAgICAgICAgICAgICAgLy8gdG8gYSBsaXN0IHNvIHRoYXQgaXQgY2FuIGJlIGhhbmRsZWQgYXQgdGhlIHZlcnkgZW5kLlxuICAgICAgICAgICAgICAgICAgICAgICAgYWRkS2V5ZWRSZW1vdmFsKGtleSk7XG4gICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBPbmx5IHJlcG9ydCB0aGUgbm9kZSBhcyBkaXNjYXJkZWQgaWYgaXQgaXMgbm90IGtleWVkLiBXZSBkbyB0aGlzIGJlY2F1c2VcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIGF0IHRoZSBlbmQgd2UgbG9vcCB0aHJvdWdoIGFsbCBrZXllZCBlbGVtZW50cyB0aGF0IHdlcmUgdW5tYXRjaGVkXG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBhbmQgdGhlbiBkaXNjYXJkIHRoZW0gaW4gb25lIGZpbmFsIHBhc3MuXG4gICAgICAgICAgICAgICAgICAgICAgICBvbk5vZGVEaXNjYXJkZWQoY3VyQ2hpbGQpO1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGN1ckNoaWxkLmZpcnN0Q2hpbGQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB3YWxrRGlzY2FyZGVkQ2hpbGROb2RlcyhjdXJDaGlsZCwgc2tpcEtleWVkTm9kZXMpO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAgICAgY3VyQ2hpbGQgPSBjdXJDaGlsZC5uZXh0U2libGluZztcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICAvKipcbiAgICAgICAgICogUmVtb3ZlcyBhIERPTSBub2RlIG91dCBvZiB0aGUgb3JpZ2luYWwgRE9NXG4gICAgICAgICAqXG4gICAgICAgICAqIEBwYXJhbSAge05vZGV9IG5vZGUgVGhlIG5vZGUgdG8gcmVtb3ZlXG4gICAgICAgICAqIEBwYXJhbSAge05vZGV9IHBhcmVudE5vZGUgVGhlIG5vZGVzIHBhcmVudFxuICAgICAgICAgKiBAcGFyYW0gIHtCb29sZWFufSBza2lwS2V5ZWROb2RlcyBJZiB0cnVlIHRoZW4gZWxlbWVudHMgd2l0aCBrZXlzIHdpbGwgYmUgc2tpcHBlZCBhbmQgbm90IGRpc2NhcmRlZC5cbiAgICAgICAgICogQHJldHVybiB7dW5kZWZpbmVkfVxuICAgICAgICAgKi9cbiAgICAgICAgZnVuY3Rpb24gcmVtb3ZlTm9kZShub2RlLCBwYXJlbnROb2RlLCBza2lwS2V5ZWROb2Rlcykge1xuICAgICAgICAgICAgaWYgKG9uQmVmb3JlTm9kZURpc2NhcmRlZChub2RlKSA9PT0gZmFsc2UpIHtcbiAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGlmIChwYXJlbnROb2RlKSB7XG4gICAgICAgICAgICAgICAgcGFyZW50Tm9kZS5yZW1vdmVDaGlsZChub2RlKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgb25Ob2RlRGlzY2FyZGVkKG5vZGUpO1xuICAgICAgICAgICAgd2Fsa0Rpc2NhcmRlZENoaWxkTm9kZXMobm9kZSwgc2tpcEtleWVkTm9kZXMpO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gLy8gVHJlZVdhbGtlciBpbXBsZW1lbnRhdGlvbiBpcyBubyBmYXN0ZXIsIGJ1dCBrZWVwaW5nIHRoaXMgYXJvdW5kIGluIGNhc2UgdGhpcyBjaGFuZ2VzIGluIHRoZSBmdXR1cmVcbiAgICAgICAgLy8gZnVuY3Rpb24gaW5kZXhUcmVlKHJvb3QpIHtcbiAgICAgICAgLy8gICAgIHZhciB0cmVlV2Fsa2VyID0gZG9jdW1lbnQuY3JlYXRlVHJlZVdhbGtlcihcbiAgICAgICAgLy8gICAgICAgICByb290LFxuICAgICAgICAvLyAgICAgICAgIE5vZGVGaWx0ZXIuU0hPV19FTEVNRU5UKTtcbiAgICAgICAgLy9cbiAgICAgICAgLy8gICAgIHZhciBlbDtcbiAgICAgICAgLy8gICAgIHdoaWxlKChlbCA9IHRyZWVXYWxrZXIubmV4dE5vZGUoKSkpIHtcbiAgICAgICAgLy8gICAgICAgICB2YXIga2V5ID0gZ2V0Tm9kZUtleShlbCk7XG4gICAgICAgIC8vICAgICAgICAgaWYgKGtleSkge1xuICAgICAgICAvLyAgICAgICAgICAgICBmcm9tTm9kZXNMb29rdXBba2V5XSA9IGVsO1xuICAgICAgICAvLyAgICAgICAgIH1cbiAgICAgICAgLy8gICAgIH1cbiAgICAgICAgLy8gfVxuXG4gICAgICAgIC8vIC8vIE5vZGVJdGVyYXRvciBpbXBsZW1lbnRhdGlvbiBpcyBubyBmYXN0ZXIsIGJ1dCBrZWVwaW5nIHRoaXMgYXJvdW5kIGluIGNhc2UgdGhpcyBjaGFuZ2VzIGluIHRoZSBmdXR1cmVcbiAgICAgICAgLy9cbiAgICAgICAgLy8gZnVuY3Rpb24gaW5kZXhUcmVlKG5vZGUpIHtcbiAgICAgICAgLy8gICAgIHZhciBub2RlSXRlcmF0b3IgPSBkb2N1bWVudC5jcmVhdGVOb2RlSXRlcmF0b3Iobm9kZSwgTm9kZUZpbHRlci5TSE9XX0VMRU1FTlQpO1xuICAgICAgICAvLyAgICAgdmFyIGVsO1xuICAgICAgICAvLyAgICAgd2hpbGUoKGVsID0gbm9kZUl0ZXJhdG9yLm5leHROb2RlKCkpKSB7XG4gICAgICAgIC8vICAgICAgICAgdmFyIGtleSA9IGdldE5vZGVLZXkoZWwpO1xuICAgICAgICAvLyAgICAgICAgIGlmIChrZXkpIHtcbiAgICAgICAgLy8gICAgICAgICAgICAgZnJvbU5vZGVzTG9va3VwW2tleV0gPSBlbDtcbiAgICAgICAgLy8gICAgICAgICB9XG4gICAgICAgIC8vICAgICB9XG4gICAgICAgIC8vIH1cblxuICAgICAgICBmdW5jdGlvbiBpbmRleFRyZWUobm9kZSkge1xuICAgICAgICAgICAgaWYgKG5vZGUubm9kZVR5cGUgPT09IEVMRU1FTlRfTk9ERSkge1xuICAgICAgICAgICAgICAgIHZhciBjdXJDaGlsZCA9IG5vZGUuZmlyc3RDaGlsZDtcbiAgICAgICAgICAgICAgICB3aGlsZSAoY3VyQ2hpbGQpIHtcbiAgICAgICAgICAgICAgICAgICAgdmFyIGtleSA9IGdldE5vZGVLZXkoY3VyQ2hpbGQpO1xuICAgICAgICAgICAgICAgICAgICBpZiAoa2V5KSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBmcm9tTm9kZXNMb29rdXBba2V5XSA9IGN1ckNoaWxkO1xuICAgICAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAgICAgLy8gV2FsayByZWN1cnNpdmVseVxuICAgICAgICAgICAgICAgICAgICBpbmRleFRyZWUoY3VyQ2hpbGQpO1xuXG4gICAgICAgICAgICAgICAgICAgIGN1ckNoaWxkID0gY3VyQ2hpbGQubmV4dFNpYmxpbmc7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgaW5kZXhUcmVlKGZyb21Ob2RlKTtcblxuICAgICAgICBmdW5jdGlvbiBoYW5kbGVOb2RlQWRkZWQoZWwpIHtcbiAgICAgICAgICAgIG9uTm9kZUFkZGVkKGVsKTtcblxuICAgICAgICAgICAgdmFyIGN1ckNoaWxkID0gZWwuZmlyc3RDaGlsZDtcbiAgICAgICAgICAgIHdoaWxlIChjdXJDaGlsZCkge1xuICAgICAgICAgICAgICAgIHZhciBuZXh0U2libGluZyA9IGN1ckNoaWxkLm5leHRTaWJsaW5nO1xuXG4gICAgICAgICAgICAgICAgdmFyIGtleSA9IGdldE5vZGVLZXkoY3VyQ2hpbGQpO1xuICAgICAgICAgICAgICAgIGlmIChrZXkpIHtcbiAgICAgICAgICAgICAgICAgICAgdmFyIHVubWF0Y2hlZEZyb21FbCA9IGZyb21Ob2Rlc0xvb2t1cFtrZXldO1xuICAgICAgICAgICAgICAgICAgICBpZiAodW5tYXRjaGVkRnJvbUVsICYmIGNvbXBhcmVOb2RlTmFtZXMoY3VyQ2hpbGQsIHVubWF0Y2hlZEZyb21FbCkpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGN1ckNoaWxkLnBhcmVudE5vZGUucmVwbGFjZUNoaWxkKHVubWF0Y2hlZEZyb21FbCwgY3VyQ2hpbGQpO1xuICAgICAgICAgICAgICAgICAgICAgICAgbW9ycGhFbCh1bm1hdGNoZWRGcm9tRWwsIGN1ckNoaWxkKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIGhhbmRsZU5vZGVBZGRlZChjdXJDaGlsZCk7XG4gICAgICAgICAgICAgICAgY3VyQ2hpbGQgPSBuZXh0U2libGluZztcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIGZ1bmN0aW9uIG1vcnBoRWwoZnJvbUVsLCB0b0VsLCBjaGlsZHJlbk9ubHkpIHtcbiAgICAgICAgICAgIHZhciB0b0VsS2V5ID0gZ2V0Tm9kZUtleSh0b0VsKTtcbiAgICAgICAgICAgIHZhciBjdXJGcm9tTm9kZUtleTtcblxuICAgICAgICAgICAgaWYgKHRvRWxLZXkpIHtcbiAgICAgICAgICAgICAgICAvLyBJZiBhbiBlbGVtZW50IHdpdGggYW4gSUQgaXMgYmVpbmcgbW9ycGhlZCB0aGVuIGl0IGlzIHdpbGwgYmUgaW4gdGhlIGZpbmFsXG4gICAgICAgICAgICAgICAgLy8gRE9NIHNvIGNsZWFyIGl0IG91dCBvZiB0aGUgc2F2ZWQgZWxlbWVudHMgY29sbGVjdGlvblxuICAgICAgICAgICAgICAgIGRlbGV0ZSBmcm9tTm9kZXNMb29rdXBbdG9FbEtleV07XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGlmICh0b05vZGUuaXNTYW1lTm9kZSAmJiB0b05vZGUuaXNTYW1lTm9kZShmcm9tTm9kZSkpIHtcbiAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGlmICghY2hpbGRyZW5Pbmx5KSB7XG4gICAgICAgICAgICAgICAgaWYgKG9uQmVmb3JlRWxVcGRhdGVkKGZyb21FbCwgdG9FbCkgPT09IGZhbHNlKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICBtb3JwaEF0dHJzKGZyb21FbCwgdG9FbCk7XG4gICAgICAgICAgICAgICAgb25FbFVwZGF0ZWQoZnJvbUVsKTtcblxuICAgICAgICAgICAgICAgIGlmIChvbkJlZm9yZUVsQ2hpbGRyZW5VcGRhdGVkKGZyb21FbCwgdG9FbCkgPT09IGZhbHNlKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGlmIChmcm9tRWwubm9kZU5hbWUgIT09ICdURVhUQVJFQScpIHtcbiAgICAgICAgICAgICAgICB2YXIgY3VyVG9Ob2RlQ2hpbGQgPSB0b0VsLmZpcnN0Q2hpbGQ7XG4gICAgICAgICAgICAgICAgdmFyIGN1ckZyb21Ob2RlQ2hpbGQgPSBmcm9tRWwuZmlyc3RDaGlsZDtcbiAgICAgICAgICAgICAgICB2YXIgY3VyVG9Ob2RlS2V5O1xuXG4gICAgICAgICAgICAgICAgdmFyIGZyb21OZXh0U2libGluZztcbiAgICAgICAgICAgICAgICB2YXIgdG9OZXh0U2libGluZztcbiAgICAgICAgICAgICAgICB2YXIgbWF0Y2hpbmdGcm9tRWw7XG5cbiAgICAgICAgICAgICAgICBvdXRlcjogd2hpbGUgKGN1clRvTm9kZUNoaWxkKSB7XG4gICAgICAgICAgICAgICAgICAgIHRvTmV4dFNpYmxpbmcgPSBjdXJUb05vZGVDaGlsZC5uZXh0U2libGluZztcbiAgICAgICAgICAgICAgICAgICAgY3VyVG9Ob2RlS2V5ID0gZ2V0Tm9kZUtleShjdXJUb05vZGVDaGlsZCk7XG5cbiAgICAgICAgICAgICAgICAgICAgd2hpbGUgKGN1ckZyb21Ob2RlQ2hpbGQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGZyb21OZXh0U2libGluZyA9IGN1ckZyb21Ob2RlQ2hpbGQubmV4dFNpYmxpbmc7XG5cbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChjdXJUb05vZGVDaGlsZC5pc1NhbWVOb2RlICYmIGN1clRvTm9kZUNoaWxkLmlzU2FtZU5vZGUoY3VyRnJvbU5vZGVDaGlsZCkpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjdXJUb05vZGVDaGlsZCA9IHRvTmV4dFNpYmxpbmc7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY3VyRnJvbU5vZGVDaGlsZCA9IGZyb21OZXh0U2libGluZztcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb250aW51ZSBvdXRlcjtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgICAgICAgICAgY3VyRnJvbU5vZGVLZXkgPSBnZXROb2RlS2V5KGN1ckZyb21Ob2RlQ2hpbGQpO1xuXG4gICAgICAgICAgICAgICAgICAgICAgICB2YXIgY3VyRnJvbU5vZGVUeXBlID0gY3VyRnJvbU5vZGVDaGlsZC5ub2RlVHlwZTtcblxuICAgICAgICAgICAgICAgICAgICAgICAgdmFyIGlzQ29tcGF0aWJsZSA9IHVuZGVmaW5lZDtcblxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGN1ckZyb21Ob2RlVHlwZSA9PT0gY3VyVG9Ob2RlQ2hpbGQubm9kZVR5cGUpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoY3VyRnJvbU5vZGVUeXBlID09PSBFTEVNRU5UX05PREUpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gQm90aCBub2RlcyBiZWluZyBjb21wYXJlZCBhcmUgRWxlbWVudCBub2Rlc1xuXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChjdXJUb05vZGVLZXkpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIFRoZSB0YXJnZXQgbm9kZSBoYXMgYSBrZXkgc28gd2Ugd2FudCB0byBtYXRjaCBpdCB1cCB3aXRoIHRoZSBjb3JyZWN0IGVsZW1lbnRcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIGluIHRoZSBvcmlnaW5hbCBET00gdHJlZVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGN1clRvTm9kZUtleSAhPT0gY3VyRnJvbU5vZGVLZXkpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBUaGUgY3VycmVudCBlbGVtZW50IGluIHRoZSBvcmlnaW5hbCBET00gdHJlZSBkb2VzIG5vdCBoYXZlIGEgbWF0Y2hpbmcga2V5IHNvXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gbGV0J3MgY2hlY2sgb3VyIGxvb2t1cCB0byBzZWUgaWYgdGhlcmUgaXMgYSBtYXRjaGluZyBlbGVtZW50IGluIHRoZSBvcmlnaW5hbFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIERPTSB0cmVlXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKChtYXRjaGluZ0Zyb21FbCA9IGZyb21Ob2Rlc0xvb2t1cFtjdXJUb05vZGVLZXldKSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoY3VyRnJvbU5vZGVDaGlsZC5uZXh0U2libGluZyA9PT0gbWF0Y2hpbmdGcm9tRWwpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIFNwZWNpYWwgY2FzZSBmb3Igc2luZ2xlIGVsZW1lbnQgcmVtb3ZhbHMuIFRvIGF2b2lkIHJlbW92aW5nIHRoZSBvcmlnaW5hbFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gRE9NIG5vZGUgb3V0IG9mIHRoZSB0cmVlIChzaW5jZSB0aGF0IGNhbiBicmVhayBDU1MgdHJhbnNpdGlvbnMsIGV0Yy4pLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gd2Ugd2lsbCBpbnN0ZWFkIGRpc2NhcmQgdGhlIGN1cnJlbnQgbm9kZSBhbmQgd2FpdCB1bnRpbCB0aGUgbmV4dFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gaXRlcmF0aW9uIHRvIHByb3Blcmx5IG1hdGNoIHVwIHRoZSBrZXllZCB0YXJnZXQgZWxlbWVudCB3aXRoIGl0cyBtYXRjaGluZ1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gZWxlbWVudCBpbiB0aGUgb3JpZ2luYWwgdHJlZVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaXNDb21wYXRpYmxlID0gZmFsc2U7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBXZSBmb3VuZCBhIG1hdGNoaW5nIGtleWVkIGVsZW1lbnQgc29tZXdoZXJlIGluIHRoZSBvcmlnaW5hbCBET00gdHJlZS5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIExldCdzIG1vdmluZyB0aGUgb3JpZ2luYWwgRE9NIG5vZGUgaW50byB0aGUgY3VycmVudCBwb3NpdGlvbiBhbmQgbW9ycGhcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIGl0LlxuXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBOT1RFOiBXZSB1c2UgaW5zZXJ0QmVmb3JlIGluc3RlYWQgb2YgcmVwbGFjZUNoaWxkIGJlY2F1c2Ugd2Ugd2FudCB0byBnbyB0aHJvdWdoXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyB0aGUgYHJlbW92ZU5vZGUoKWAgZnVuY3Rpb24gZm9yIHRoZSBub2RlIHRoYXQgaXMgYmVpbmcgZGlzY2FyZGVkIHNvIHRoYXRcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIGFsbCBsaWZlY3ljbGUgaG9va3MgYXJlIGNvcnJlY3RseSBpbnZva2VkXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBmcm9tRWwuaW5zZXJ0QmVmb3JlKG1hdGNoaW5nRnJvbUVsLCBjdXJGcm9tTm9kZUNoaWxkKTtcblxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZnJvbU5leHRTaWJsaW5nID0gY3VyRnJvbU5vZGVDaGlsZC5uZXh0U2libGluZztcblxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGN1ckZyb21Ob2RlS2V5KSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gU2luY2UgdGhlIG5vZGUgaXMga2V5ZWQgaXQgbWlnaHQgYmUgbWF0Y2hlZCB1cCBsYXRlciBzbyB3ZSBkZWZlclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIHRoZSBhY3R1YWwgcmVtb3ZhbCB0byBsYXRlclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGFkZEtleWVkUmVtb3ZhbChjdXJGcm9tTm9kZUtleSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIE5PVEU6IHdlIHNraXAgbmVzdGVkIGtleWVkIG5vZGVzIGZyb20gYmVpbmcgcmVtb3ZlZCBzaW5jZSB0aGVyZSBpc1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vICAgICAgIHN0aWxsIGEgY2hhbmNlIHRoZXkgd2lsbCBiZSBtYXRjaGVkIHVwIGxhdGVyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcmVtb3ZlTm9kZShjdXJGcm9tTm9kZUNoaWxkLCBmcm9tRWwsIHRydWUgLyogc2tpcCBrZXllZCBub2RlcyAqLyk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGN1ckZyb21Ob2RlQ2hpbGQgPSBtYXRjaGluZ0Zyb21FbDtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIFRoZSBub2RlcyBhcmUgbm90IGNvbXBhdGlibGUgc2luY2UgdGhlIFwidG9cIiBub2RlIGhhcyBhIGtleSBhbmQgdGhlcmVcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gaXMgbm8gbWF0Y2hpbmcga2V5ZWQgbm9kZSBpbiB0aGUgc291cmNlIHRyZWVcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaXNDb21wYXRpYmxlID0gZmFsc2U7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKGN1ckZyb21Ob2RlS2V5KSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBUaGUgb3JpZ2luYWwgaGFzIGEga2V5XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpc0NvbXBhdGlibGUgPSBmYWxzZTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlzQ29tcGF0aWJsZSA9IGlzQ29tcGF0aWJsZSAhPT0gZmFsc2UgJiYgY29tcGFyZU5vZGVOYW1lcyhjdXJGcm9tTm9kZUNoaWxkLCBjdXJUb05vZGVDaGlsZCk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChpc0NvbXBhdGlibGUpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIFdlIGZvdW5kIGNvbXBhdGlibGUgRE9NIGVsZW1lbnRzIHNvIHRyYW5zZm9ybVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gdGhlIGN1cnJlbnQgXCJmcm9tXCIgbm9kZSB0byBtYXRjaCB0aGUgY3VycmVudFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gdGFyZ2V0IERPTSBub2RlLlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgbW9ycGhFbChjdXJGcm9tTm9kZUNoaWxkLCBjdXJUb05vZGVDaGlsZCk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAoY3VyRnJvbU5vZGVUeXBlID09PSBURVhUX05PREUgfHwgY3VyRnJvbU5vZGVUeXBlID09IENPTU1FTlRfTk9ERSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBCb3RoIG5vZGVzIGJlaW5nIGNvbXBhcmVkIGFyZSBUZXh0IG9yIENvbW1lbnQgbm9kZXNcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaXNDb21wYXRpYmxlID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gU2ltcGx5IHVwZGF0ZSBub2RlVmFsdWUgb24gdGhlIG9yaWdpbmFsIG5vZGUgdG9cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gY2hhbmdlIHRoZSB0ZXh0IHZhbHVlXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChjdXJGcm9tTm9kZUNoaWxkLm5vZGVWYWx1ZSAhPT0gY3VyVG9Ob2RlQ2hpbGQubm9kZVZhbHVlKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjdXJGcm9tTm9kZUNoaWxkLm5vZGVWYWx1ZSA9IGN1clRvTm9kZUNoaWxkLm5vZGVWYWx1ZTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoaXNDb21wYXRpYmxlKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gQWR2YW5jZSBib3RoIHRoZSBcInRvXCIgY2hpbGQgYW5kIHRoZSBcImZyb21cIiBjaGlsZCBzaW5jZSB3ZSBmb3VuZCBhIG1hdGNoXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY3VyVG9Ob2RlQ2hpbGQgPSB0b05leHRTaWJsaW5nO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGN1ckZyb21Ob2RlQ2hpbGQgPSBmcm9tTmV4dFNpYmxpbmc7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY29udGludWUgb3V0ZXI7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIE5vIGNvbXBhdGlibGUgbWF0Y2ggc28gcmVtb3ZlIHRoZSBvbGQgbm9kZSBmcm9tIHRoZSBET00gYW5kIGNvbnRpbnVlIHRyeWluZyB0byBmaW5kIGFcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIG1hdGNoIGluIHRoZSBvcmlnaW5hbCBET00uIEhvd2V2ZXIsIHdlIG9ubHkgZG8gdGhpcyBpZiB0aGUgZnJvbSBub2RlIGlzIG5vdCBrZXllZFxuICAgICAgICAgICAgICAgICAgICAgICAgLy8gc2luY2UgaXQgaXMgcG9zc2libGUgdGhhdCBhIGtleWVkIG5vZGUgbWlnaHQgbWF0Y2ggdXAgd2l0aCBhIG5vZGUgc29tZXdoZXJlIGVsc2UgaW4gdGhlXG4gICAgICAgICAgICAgICAgICAgICAgICAvLyB0YXJnZXQgdHJlZSBhbmQgd2UgZG9uJ3Qgd2FudCB0byBkaXNjYXJkIGl0IGp1c3QgeWV0IHNpbmNlIGl0IHN0aWxsIG1pZ2h0IGZpbmQgYVxuICAgICAgICAgICAgICAgICAgICAgICAgLy8gaG9tZSBpbiB0aGUgZmluYWwgRE9NIHRyZWUuIEFmdGVyIGV2ZXJ5dGhpbmcgaXMgZG9uZSB3ZSB3aWxsIHJlbW92ZSBhbnkga2V5ZWQgbm9kZXNcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIHRoYXQgZGlkbid0IGZpbmQgYSBob21lXG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoY3VyRnJvbU5vZGVLZXkpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBTaW5jZSB0aGUgbm9kZSBpcyBrZXllZCBpdCBtaWdodCBiZSBtYXRjaGVkIHVwIGxhdGVyIHNvIHdlIGRlZmVyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gdGhlIGFjdHVhbCByZW1vdmFsIHRvIGxhdGVyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgYWRkS2V5ZWRSZW1vdmFsKGN1ckZyb21Ob2RlS2V5KTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gTk9URTogd2Ugc2tpcCBuZXN0ZWQga2V5ZWQgbm9kZXMgZnJvbSBiZWluZyByZW1vdmVkIHNpbmNlIHRoZXJlIGlzXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gICAgICAgc3RpbGwgYSBjaGFuY2UgdGhleSB3aWxsIGJlIG1hdGNoZWQgdXAgbGF0ZXJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICByZW1vdmVOb2RlKGN1ckZyb21Ob2RlQ2hpbGQsIGZyb21FbCwgdHJ1ZSAvKiBza2lwIGtleWVkIG5vZGVzICovKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgICAgICAgICAgY3VyRnJvbU5vZGVDaGlsZCA9IGZyb21OZXh0U2libGluZztcbiAgICAgICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgICAgIC8vIElmIHdlIGdvdCB0aGlzIGZhciB0aGVuIHdlIGRpZCBub3QgZmluZCBhIGNhbmRpZGF0ZSBtYXRjaCBmb3JcbiAgICAgICAgICAgICAgICAgICAgLy8gb3VyIFwidG8gbm9kZVwiIGFuZCB3ZSBleGhhdXN0ZWQgYWxsIG9mIHRoZSBjaGlsZHJlbiBcImZyb21cIlxuICAgICAgICAgICAgICAgICAgICAvLyBub2Rlcy4gVGhlcmVmb3JlLCB3ZSB3aWxsIGp1c3QgYXBwZW5kIHRoZSBjdXJyZW50IFwidG9cIiBub2RlXG4gICAgICAgICAgICAgICAgICAgIC8vIHRvIHRoZSBlbmRcbiAgICAgICAgICAgICAgICAgICAgaWYgKGN1clRvTm9kZUtleSAmJiAobWF0Y2hpbmdGcm9tRWwgPSBmcm9tTm9kZXNMb29rdXBbY3VyVG9Ob2RlS2V5XSkgJiYgY29tcGFyZU5vZGVOYW1lcyhtYXRjaGluZ0Zyb21FbCwgY3VyVG9Ob2RlQ2hpbGQpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBmcm9tRWwuYXBwZW5kQ2hpbGQobWF0Y2hpbmdGcm9tRWwpO1xuICAgICAgICAgICAgICAgICAgICAgICAgbW9ycGhFbChtYXRjaGluZ0Zyb21FbCwgY3VyVG9Ob2RlQ2hpbGQpO1xuICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgdmFyIG9uQmVmb3JlTm9kZUFkZGVkUmVzdWx0ID0gb25CZWZvcmVOb2RlQWRkZWQoY3VyVG9Ob2RlQ2hpbGQpO1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKG9uQmVmb3JlTm9kZUFkZGVkUmVzdWx0ICE9PSBmYWxzZSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChvbkJlZm9yZU5vZGVBZGRlZFJlc3VsdCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjdXJUb05vZGVDaGlsZCA9IG9uQmVmb3JlTm9kZUFkZGVkUmVzdWx0O1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChjdXJUb05vZGVDaGlsZC5hY3R1YWxpemUpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY3VyVG9Ob2RlQ2hpbGQgPSBjdXJUb05vZGVDaGlsZC5hY3R1YWxpemUoZnJvbUVsLm93bmVyRG9jdW1lbnQgfHwgZG9jKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZnJvbUVsLmFwcGVuZENoaWxkKGN1clRvTm9kZUNoaWxkKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBoYW5kbGVOb2RlQWRkZWQoY3VyVG9Ob2RlQ2hpbGQpO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAgICAgY3VyVG9Ob2RlQ2hpbGQgPSB0b05leHRTaWJsaW5nO1xuICAgICAgICAgICAgICAgICAgICBjdXJGcm9tTm9kZUNoaWxkID0gZnJvbU5leHRTaWJsaW5nO1xuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIC8vIFdlIGhhdmUgcHJvY2Vzc2VkIGFsbCBvZiB0aGUgXCJ0byBub2Rlc1wiLiBJZiBjdXJGcm9tTm9kZUNoaWxkIGlzXG4gICAgICAgICAgICAgICAgLy8gbm9uLW51bGwgdGhlbiB3ZSBzdGlsbCBoYXZlIHNvbWUgZnJvbSBub2RlcyBsZWZ0IG92ZXIgdGhhdCBuZWVkXG4gICAgICAgICAgICAgICAgLy8gdG8gYmUgcmVtb3ZlZFxuICAgICAgICAgICAgICAgIHdoaWxlIChjdXJGcm9tTm9kZUNoaWxkKSB7XG4gICAgICAgICAgICAgICAgICAgIGZyb21OZXh0U2libGluZyA9IGN1ckZyb21Ob2RlQ2hpbGQubmV4dFNpYmxpbmc7XG4gICAgICAgICAgICAgICAgICAgIGlmICgoY3VyRnJvbU5vZGVLZXkgPSBnZXROb2RlS2V5KGN1ckZyb21Ob2RlQ2hpbGQpKSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgLy8gU2luY2UgdGhlIG5vZGUgaXMga2V5ZWQgaXQgbWlnaHQgYmUgbWF0Y2hlZCB1cCBsYXRlciBzbyB3ZSBkZWZlclxuICAgICAgICAgICAgICAgICAgICAgICAgLy8gdGhlIGFjdHVhbCByZW1vdmFsIHRvIGxhdGVyXG4gICAgICAgICAgICAgICAgICAgICAgICBhZGRLZXllZFJlbW92YWwoY3VyRnJvbU5vZGVLZXkpO1xuICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgLy8gTk9URTogd2Ugc2tpcCBuZXN0ZWQga2V5ZWQgbm9kZXMgZnJvbSBiZWluZyByZW1vdmVkIHNpbmNlIHRoZXJlIGlzXG4gICAgICAgICAgICAgICAgICAgICAgICAvLyAgICAgICBzdGlsbCBhIGNoYW5jZSB0aGV5IHdpbGwgYmUgbWF0Y2hlZCB1cCBsYXRlclxuICAgICAgICAgICAgICAgICAgICAgICAgcmVtb3ZlTm9kZShjdXJGcm9tTm9kZUNoaWxkLCBmcm9tRWwsIHRydWUgLyogc2tpcCBrZXllZCBub2RlcyAqLyk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgY3VyRnJvbU5vZGVDaGlsZCA9IGZyb21OZXh0U2libGluZztcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIHZhciBzcGVjaWFsRWxIYW5kbGVyID0gc3BlY2lhbEVsSGFuZGxlcnNbZnJvbUVsLm5vZGVOYW1lXTtcbiAgICAgICAgICAgIGlmIChzcGVjaWFsRWxIYW5kbGVyKSB7XG4gICAgICAgICAgICAgICAgc3BlY2lhbEVsSGFuZGxlcihmcm9tRWwsIHRvRWwpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9IC8vIEVORDogbW9ycGhFbCguLi4pXG5cbiAgICAgICAgdmFyIG1vcnBoZWROb2RlID0gZnJvbU5vZGU7XG4gICAgICAgIHZhciBtb3JwaGVkTm9kZVR5cGUgPSBtb3JwaGVkTm9kZS5ub2RlVHlwZTtcbiAgICAgICAgdmFyIHRvTm9kZVR5cGUgPSB0b05vZGUubm9kZVR5cGU7XG5cbiAgICAgICAgaWYgKCFjaGlsZHJlbk9ubHkpIHtcbiAgICAgICAgICAgIC8vIEhhbmRsZSB0aGUgY2FzZSB3aGVyZSB3ZSBhcmUgZ2l2ZW4gdHdvIERPTSBub2RlcyB0aGF0IGFyZSBub3RcbiAgICAgICAgICAgIC8vIGNvbXBhdGlibGUgKGUuZy4gPGRpdj4gLS0+IDxzcGFuPiBvciA8ZGl2PiAtLT4gVEVYVClcbiAgICAgICAgICAgIGlmIChtb3JwaGVkTm9kZVR5cGUgPT09IEVMRU1FTlRfTk9ERSkge1xuICAgICAgICAgICAgICAgIGlmICh0b05vZGVUeXBlID09PSBFTEVNRU5UX05PREUpIHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKCFjb21wYXJlTm9kZU5hbWVzKGZyb21Ob2RlLCB0b05vZGUpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBvbk5vZGVEaXNjYXJkZWQoZnJvbU5vZGUpO1xuICAgICAgICAgICAgICAgICAgICAgICAgbW9ycGhlZE5vZGUgPSBtb3ZlQ2hpbGRyZW4oZnJvbU5vZGUsIGNyZWF0ZUVsZW1lbnROUyh0b05vZGUubm9kZU5hbWUsIHRvTm9kZS5uYW1lc3BhY2VVUkkpKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIC8vIEdvaW5nIGZyb20gYW4gZWxlbWVudCBub2RlIHRvIGEgdGV4dCBub2RlXG4gICAgICAgICAgICAgICAgICAgIG1vcnBoZWROb2RlID0gdG9Ob2RlO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0gZWxzZSBpZiAobW9ycGhlZE5vZGVUeXBlID09PSBURVhUX05PREUgfHwgbW9ycGhlZE5vZGVUeXBlID09PSBDT01NRU5UX05PREUpIHsgLy8gVGV4dCBvciBjb21tZW50IG5vZGVcbiAgICAgICAgICAgICAgICBpZiAodG9Ob2RlVHlwZSA9PT0gbW9ycGhlZE5vZGVUeXBlKSB7XG4gICAgICAgICAgICAgICAgICAgIGlmIChtb3JwaGVkTm9kZS5ub2RlVmFsdWUgIT09IHRvTm9kZS5ub2RlVmFsdWUpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIG1vcnBoZWROb2RlLm5vZGVWYWx1ZSA9IHRvTm9kZS5ub2RlVmFsdWU7XG4gICAgICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgICAgICByZXR1cm4gbW9ycGhlZE5vZGU7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgLy8gVGV4dCBub2RlIHRvIHNvbWV0aGluZyBlbHNlXG4gICAgICAgICAgICAgICAgICAgIG1vcnBoZWROb2RlID0gdG9Ob2RlO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIGlmIChtb3JwaGVkTm9kZSA9PT0gdG9Ob2RlKSB7XG4gICAgICAgICAgICAvLyBUaGUgXCJ0byBub2RlXCIgd2FzIG5vdCBjb21wYXRpYmxlIHdpdGggdGhlIFwiZnJvbSBub2RlXCIgc28gd2UgaGFkIHRvXG4gICAgICAgICAgICAvLyB0b3NzIG91dCB0aGUgXCJmcm9tIG5vZGVcIiBhbmQgdXNlIHRoZSBcInRvIG5vZGVcIlxuICAgICAgICAgICAgb25Ob2RlRGlzY2FyZGVkKGZyb21Ob2RlKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIG1vcnBoRWwobW9ycGhlZE5vZGUsIHRvTm9kZSwgY2hpbGRyZW5Pbmx5KTtcblxuICAgICAgICAgICAgLy8gV2Ugbm93IG5lZWQgdG8gbG9vcCBvdmVyIGFueSBrZXllZCBub2RlcyB0aGF0IG1pZ2h0IG5lZWQgdG8gYmVcbiAgICAgICAgICAgIC8vIHJlbW92ZWQuIFdlIG9ubHkgZG8gdGhlIHJlbW92YWwgaWYgd2Uga25vdyB0aGF0IHRoZSBrZXllZCBub2RlXG4gICAgICAgICAgICAvLyBuZXZlciBmb3VuZCBhIG1hdGNoLiBXaGVuIGEga2V5ZWQgbm9kZSBpcyBtYXRjaGVkIHVwIHdlIHJlbW92ZVxuICAgICAgICAgICAgLy8gaXQgb3V0IG9mIGZyb21Ob2Rlc0xvb2t1cCBhbmQgd2UgdXNlIGZyb21Ob2Rlc0xvb2t1cCB0byBkZXRlcm1pbmVcbiAgICAgICAgICAgIC8vIGlmIGEga2V5ZWQgbm9kZSBoYXMgYmVlbiBtYXRjaGVkIHVwIG9yIG5vdFxuICAgICAgICAgICAgaWYgKGtleWVkUmVtb3ZhbExpc3QpIHtcbiAgICAgICAgICAgICAgICBmb3IgKHZhciBpPTAsIGxlbj1rZXllZFJlbW92YWxMaXN0Lmxlbmd0aDsgaTxsZW47IGkrKykge1xuICAgICAgICAgICAgICAgICAgICB2YXIgZWxUb1JlbW92ZSA9IGZyb21Ob2Rlc0xvb2t1cFtrZXllZFJlbW92YWxMaXN0W2ldXTtcbiAgICAgICAgICAgICAgICAgICAgaWYgKGVsVG9SZW1vdmUpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJlbW92ZU5vZGUoZWxUb1JlbW92ZSwgZWxUb1JlbW92ZS5wYXJlbnROb2RlLCBmYWxzZSk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICBpZiAoIWNoaWxkcmVuT25seSAmJiBtb3JwaGVkTm9kZSAhPT0gZnJvbU5vZGUgJiYgZnJvbU5vZGUucGFyZW50Tm9kZSkge1xuICAgICAgICAgICAgaWYgKG1vcnBoZWROb2RlLmFjdHVhbGl6ZSkge1xuICAgICAgICAgICAgICAgIG1vcnBoZWROb2RlID0gbW9ycGhlZE5vZGUuYWN0dWFsaXplKGZyb21Ob2RlLm93bmVyRG9jdW1lbnQgfHwgZG9jKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIC8vIElmIHdlIGhhZCB0byBzd2FwIG91dCB0aGUgZnJvbSBub2RlIHdpdGggYSBuZXcgbm9kZSBiZWNhdXNlIHRoZSBvbGRcbiAgICAgICAgICAgIC8vIG5vZGUgd2FzIG5vdCBjb21wYXRpYmxlIHdpdGggdGhlIHRhcmdldCBub2RlIHRoZW4gd2UgbmVlZCB0b1xuICAgICAgICAgICAgLy8gcmVwbGFjZSB0aGUgb2xkIERPTSBub2RlIGluIHRoZSBvcmlnaW5hbCBET00gdHJlZS4gVGhpcyBpcyBvbmx5XG4gICAgICAgICAgICAvLyBwb3NzaWJsZSBpZiB0aGUgb3JpZ2luYWwgRE9NIG5vZGUgd2FzIHBhcnQgb2YgYSBET00gdHJlZSB3aGljaFxuICAgICAgICAgICAgLy8gd2Uga25vdyBpcyB0aGUgY2FzZSBpZiBpdCBoYXMgYSBwYXJlbnQgbm9kZS5cbiAgICAgICAgICAgIGZyb21Ob2RlLnBhcmVudE5vZGUucmVwbGFjZUNoaWxkKG1vcnBoZWROb2RlLCBmcm9tTm9kZSk7XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gbW9ycGhlZE5vZGU7XG4gICAgfTtcbn1cblxudmFyIG1vcnBoZG9tID0gbW9ycGhkb21GYWN0b3J5KG1vcnBoQXR0cnMpO1xuXG5tb2R1bGUuZXhwb3J0cyA9IG1vcnBoZG9tO1xuIiwidmFyIGdldElkID0gZnVuY3Rpb24gKGlkKSB7XHJcbiAgcmV0dXJuIGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKGlkKVxyXG59XHJcblxyXG5leHBvcnRzLmdldElkID0gZ2V0SWRcclxuXHJcbnZhciBsb29wQ2hpbGRzID0gZnVuY3Rpb24gKGFyciwgZWxlbSkge1xyXG4gIGZvciAodmFyIGNoaWxkID0gZWxlbS5maXJzdENoaWxkOyBjaGlsZCAhPT0gbnVsbDsgY2hpbGQgPSBjaGlsZC5uZXh0U2libGluZykge1xyXG4gICAgYXJyLnB1c2goY2hpbGQpXHJcbiAgICBpZiAoY2hpbGQuaGFzQ2hpbGROb2RlcygpKSB7XHJcbiAgICAgIGxvb3BDaGlsZHMoYXJyLCBjaGlsZClcclxuICAgIH1cclxuICB9XHJcbn1cclxuXHJcbmV4cG9ydHMubG9vcENoaWxkcyA9IGxvb3BDaGlsZHNcclxuXHJcbmV4cG9ydHMudGVzdEV2ZW50ID0gZnVuY3Rpb24gKHRtcGwpIHtcclxuICByZXR1cm4gLyBrLS8udGVzdCh0bXBsKVxyXG59XHJcblxyXG4vKipcclxuICogQHByaXZhdGVcclxuICogQGRlc2NyaXB0aW9uXHJcbiAqIENoZWNrIGEgbm9kZSBhdmFpbGFiaWxpdHkgaW4gMjUwbXMsIGlmIG5vdCBmb3VuZCBzaWxlbnR5IHNraXAgdGhlIGV2ZW50XHJcbiAqXHJcbiAqIEBwYXJhbSB7c3RyaW5nfSBpZCAtIHRoZSBub2RlIGlkXHJcbiAqIEBwYXJhbSB7ZnVuY3Rpb259IGNhbGxiYWNrIC0gdGhlIGZ1bmN0aW9uIHRvIGV4ZWN1dGUgb25jZSB0aGUgbm9kZSBpcyBmb3VuZFxyXG4gKi9cclxuZXhwb3J0cy5jaGVja05vZGVBdmFpbGFiaWxpdHkgPSBmdW5jdGlvbiAoY29tcG9uZW50LCBjb21wb25lbnROYW1lLCBjYWxsYmFjaywgbm90Rm91bmQpIHtcclxuICB2YXIgZWxlID0gZ2V0SWQoY29tcG9uZW50LmVsKVxyXG4gIHZhciBmb3VuZCA9IGZhbHNlXHJcbiAgaWYgKGVsZSkgcmV0dXJuIGVsZVxyXG4gIGVsc2Uge1xyXG4gICAgdmFyIHQgPSBzZXRJbnRlcnZhbChmdW5jdGlvbiAoKSB7XHJcbiAgICAgIGVsZSA9IGdldElkKGNvbXBvbmVudC5lbClcclxuICAgICAgaWYgKGVsZSkge1xyXG4gICAgICAgIGNsZWFySW50ZXJ2YWwodClcclxuICAgICAgICBmb3VuZCA9IHRydWVcclxuICAgICAgICBjYWxsYmFjayhjb21wb25lbnQsIGNvbXBvbmVudE5hbWUsIGVsZSlcclxuICAgICAgfVxyXG4gICAgfSwgMClcclxuICAgIC8vIHNpbGVudGx5IGlnbm9yZSBmaW5kaW5nIHRoZSBub2RlIGFmdGVyIHNvbWV0aW1lc1xyXG4gICAgc2V0VGltZW91dChmdW5jdGlvbiAoKSB7XHJcbiAgICAgIGNsZWFySW50ZXJ2YWwodClcclxuICAgICAgaWYoIWZvdW5kICYmIG5vdEZvdW5kICYmIHR5cGVvZiBub3RGb3VuZCA9PT0gJ2Z1bmN0aW9uJykgbm90Rm91bmQoKVxyXG4gICAgfSwgMjUwKVxyXG4gIH1cclxufVxyXG5cclxuLyoqXHJcbiAqIEBwcml2YXRlXHJcbiAqIEBkZXNjcmlwdGlvblxyXG4gKiBDb25maXJtIHRoYXQgYSB2YWx1ZSBpcyB0cnV0aHksIHRocm93cyBhbiBlcnJvciBtZXNzYWdlIG90aGVyd2lzZS5cclxuICpcclxuICogQHBhcmFtIHsqfSB2YWwgLSB0aGUgdmFsIHRvIHRlc3QuXHJcbiAqIEBwYXJhbSB7c3RyaW5nfSBtc2cgLSB0aGUgZXJyb3IgbWVzc2FnZSBvbiBmYWlsdXJlLlxyXG4gKiBAdGhyb3dzIHtFcnJvcn1cclxuICovXHJcbmV4cG9ydHMuYXNzZXJ0ID0gZnVuY3Rpb24gKHZhbCwgbXNnKSB7XHJcbiAgaWYgKCF2YWwpIHRocm93IG5ldyBFcnJvcignKGtlZXQpICcgKyBtc2cpXHJcbn1cclxuXHJcbi8qKlxyXG4gKiBAcHJpdmF0ZVxyXG4gKiBAZGVzY3JpcHRpb25cclxuICogU2ltcGxlIGh0bWwgdGVtcGxhdGUgbGl0ZXJhbHMgTU9ESUZJRUQgZnJvbSA6IGh0dHA6Ly8yYWxpdHkuY29tLzIwMTUvMDEvdGVtcGxhdGUtc3RyaW5ncy1odG1sLmh0bWxcclxuICogYnkgRHIuIEF4ZWwgUmF1c2NobWF5ZXJcclxuICogbm8gY2hlY2tpbmcgZm9yIHdyYXBwaW5nIGluIHJvb3QgZWxlbWVudFxyXG4gKiBubyBzdHJpY3QgY2hlY2tpbmdcclxuICogcmVtb3ZlIHNwYWNpbmcgLyBpbmRlbnRhdGlvblxyXG4gKiBrZWVwIGFsbCBzcGFjaW5nIHdpdGhpbiBodG1sIHRhZ3NcclxuICogaW5jbHVkZSBoYW5kbGluZyAke30gaW4gdGhlIGxpdGVyYWxzXHJcbiAqL1xyXG5leHBvcnRzLmh0bWwgPSBmdW5jdGlvbiBodG1sICgpIHtcclxuICB2YXIgbGl0ZXJhbHMgPSBbXS5zaGlmdC5jYWxsKGFyZ3VtZW50cylcclxuICB2YXIgc3Vic3RzID0gW10uc2xpY2UuY2FsbChhcmd1bWVudHMpXHJcblxyXG4gIHZhciByZXN1bHQgPSBsaXRlcmFscy5yYXcucmVkdWNlKGZ1bmN0aW9uIChhY2MsIGxpdCwgaSkge1xyXG4gICAgcmV0dXJuIGFjYyArIHN1YnN0c1tpIC0gMV0gKyBsaXRcclxuICB9KVxyXG4gIC8vIHJlbW92ZSBzcGFjaW5nLCBpbmRlbnRhdGlvbiBmcm9tIGV2ZXJ5IGxpbmVcclxuICByZXN1bHQgPSByZXN1bHQuc3BsaXQoL1xcbisvKVxyXG4gIHJlc3VsdCA9IHJlc3VsdC5tYXAoZnVuY3Rpb24gKHQpIHtcclxuICAgIHJldHVybiB0LnRyaW0oKVxyXG4gIH0pLmpvaW4oJycpXHJcbiAgcmV0dXJuIHJlc3VsdFxyXG59XHJcblxyXG4vKipcclxuICogQHByaXZhdGVcclxuICogQGRlc2NyaXB0aW9uXHJcbiAqIENvcHkgd2l0aCBtb2RpZmljYXRpb24gZnJvbSBwcmVhY3QtdG9kb212Yy4gTW9kZWwgY29uc3RydWN0b3Igd2l0aFxyXG4gKiByZWdpc3RlcmluZyBjYWxsYmFjayBsaXN0ZW5lciBpbiBPYmplY3QuZGVmaW5lUHJvcGVydHkuIEFueSBtb2RpZmljYXRpb25cclxuICogdG8gYGBgdGhpcy5saXN0YGBgIGluc3RhbmNlIHdpbGwgc3Vic2VxdWVudGx5IGluZm9ybSBhbGwgcmVnaXN0ZXJlZCBsaXN0ZW5lci5cclxuICpcclxuICoge3ttb2RlbDo8bXlNb2RlbD59fTxteU1vZGVsVGVtcGxhdGVTdHJpbmc+e3svbW9kZWw6PG15TW9kZWw+fX1cclxuICpcclxuICovXHJcbmZ1bmN0aW9uIGNyZWF0ZU1vZGVsKCkge1xyXG4gIHZhciBtb2RlbCA9IFtdXHJcbiAgdmFyIG9uQ2hhbmdlcyA9IFtdXHJcblxyXG4gIHZhciBpbmZvcm0gPSBmdW5jdGlvbiAoKSB7XHJcbiAgICAvLyBjb25zb2xlLnRyYWNlKG9uQ2hhbmdlcylcclxuICAgIGZvciAodmFyIGkgPSBvbkNoYW5nZXMubGVuZ3RoOyBpLS07KSB7XHJcbiAgICAgIG9uQ2hhbmdlc1tpXShtb2RlbClcclxuICAgIH1cclxuICB9XHJcblxyXG4vKipcclxuICogQHByaXZhdGVcclxuICogQGRlc2NyaXB0aW9uXHJcbiAqIFJlZ2lzdGVyIGNhbGxiYWNrIGxpc3RlbmVyIG9mIGFueSBjaGFuZ2VzXHJcbiAqL1xyXG4gIE9iamVjdC5kZWZpbmVQcm9wZXJ0eSh0aGlzLCAnbGlzdCcsIHtcclxuICAgIGVudW1lcmFibGU6IGZhbHNlLFxyXG4gICAgY29uZmlndXJhYmxlOiB0cnVlLFxyXG4gICAgZ2V0OiBmdW5jdGlvbiAoKSB7XHJcbiAgICAgIHJldHVybiBtb2RlbFxyXG4gICAgfSxcclxuICAgIHNldDogZnVuY3Rpb24gKHZhbCkge1xyXG4gICAgICBtb2RlbCA9IHZhbFxyXG4gICAgICBpbmZvcm0oKVxyXG4gICAgfVxyXG4gIH0pXHJcblxyXG4vKipcclxuICogQHByaXZhdGVcclxuICogQGRlc2NyaXB0aW9uXHJcbiAqIFN1YnNjcmliZSB0byB0aGUgbW9kZWwgY2hhbmdlcyAoYWRkL3VwZGF0ZS9kZXN0cm95KVxyXG4gKlxyXG4gKiBAcGFyYW0ge09iamVjdH0gbW9kZWwgLSB0aGUgbW9kZWwgaW5jbHVkaW5nIGFsbCBwcm90b3R5cGVzXHJcbiAqXHJcbiAqL1xyXG4gIHRoaXMuc3Vic2NyaWJlID0gZnVuY3Rpb24gKGZuKSB7XHJcbiAgICBvbkNoYW5nZXMucHVzaChmbilcclxuICB9XHJcblxyXG4vKipcclxuICogQHByaXZhdGVcclxuICogQGRlc2NyaXB0aW9uXHJcbiAqIEFkZCBuZXcgb2JqZWN0IHRvIHRoZSBtb2RlbCBsaXN0XHJcbiAqXHJcbiAqIEBwYXJhbSB7T2JqZWN0fSBvYmogLSBuZXcgb2JqZWN0IHRvIGFkZCBpbnRvIHRoZSBtb2RlbCBsaXN0XHJcbiAqXHJcbiAqL1xyXG4gIHRoaXMuYWRkID0gZnVuY3Rpb24gKG9iaikge1xyXG4gICAgdGhpcy5saXN0ID0gdGhpcy5saXN0LmNvbmNhdChvYmopXHJcbiAgfVxyXG5cclxuLyoqXHJcbiAqIEBwcml2YXRlXHJcbiAqIEBkZXNjcmlwdGlvblxyXG4gKiBVcGRhdGUgZXhpc3Rpbmcgb2JqZWN0IGluIHRoZSBtb2RlbCBsaXN0XHJcbiAqXHJcbiAqIEBwYXJhbSB7U3RyaW5nfSBsb29rdXBJZCAtIGxvb2t1cCBpZCBwcm9wZXJ0eSBuYW1lIG9mIHRoZSBvYmplY3RcclxuICogQHBhcmFtIHtPYmplY3R9IHVwZGF0ZU9iaiAtIHRoZSB1cGRhdGVkIHByb3BlcnRpZXNcclxuICpcclxuICovXHJcbiAgdGhpcy51cGRhdGUgPSBmdW5jdGlvbiAobG9va3VwSWQsIHVwZGF0ZU9iaikge1xyXG4gICAgdGhpcy5saXN0ID0gdGhpcy5saXN0Lm1hcChmdW5jdGlvbiAob2JqKSB7XHJcbiAgICAgIHJldHVybiBvYmpbbG9va3VwSWRdICE9PSB1cGRhdGVPYmpbbG9va3VwSWRdID8gb2JqIDogT2JqZWN0LmFzc2lnbihvYmosIHVwZGF0ZU9iailcclxuICAgIH0pXHJcbiAgfVxyXG5cclxuLyoqXHJcbiAqIEBwcml2YXRlXHJcbiAqIEBkZXNjcmlwdGlvblxyXG4gKiBSZW1vdmVkIGV4aXN0aW5nIG9iamVjdCBpbiB0aGUgbW9kZWwgbGlzdFxyXG4gKlxyXG4gKiBAcGFyYW0ge1N0cmluZ30gbG9va3VwSWQgLSBsb29rdXAgaWQgcHJvcGVydHkgbmFtZSBvZiB0aGUgb2JqZWN0XHJcbiAqIEBwYXJhbSB7U3RyaW5nfSBvYmpJZCAtIHVuaXF1ZSBpZGVudGlmaWVyIG9mIHRoZSBsb29rdXAgaWRcclxuICpcclxuICovXHJcbiAgdGhpcy5kZXN0cm95ID0gZnVuY3Rpb24gKGxvb2t1cElkLCBvYmpJZCkge1xyXG4gICAgdGhpcy5saXN0ID0gdGhpcy5saXN0LmZpbHRlcihmdW5jdGlvbiAob2JqKSB7XHJcbiAgICAgIHJldHVybiBvYmpbbG9va3VwSWRdICE9PSBvYmpJZFxyXG4gICAgfSlcclxuICB9XHJcbn1cclxuXHJcbmV4cG9ydHMuY3JlYXRlTW9kZWwgPSBjcmVhdGVNb2RlbFxyXG4iLCJjb25zdCBLZWV0ID0gcmVxdWlyZSgnLi4va2VldCcpXHJcbmNvbnN0IHsgaHRtbCB9ID0gcmVxdWlyZSAoJy4uL2tlZXQvdXRpbHMnKVxyXG5jb25zdCB7IGNhbWVsQ2FzZSAsIGdlbklkIH0gPSByZXF1aXJlKCcuL3V0aWwnKVxyXG5jb25zdCBjcmVhdGVUb2RvTW9kZWwgPSByZXF1aXJlKCcuL3RvZG9Nb2RlbCcpXHJcbmNvbnN0IGZpbHRlclBhZ2UgPSBbJ2FsbCcsICdhY3RpdmUnLCAnY29tcGxldGVkJ11cclxuLy8gY29uc3QgZmlsdGVyc1RtcGwgPSByZXF1aXJlKCcuL2ZpbHRlcnMnKShmaWx0ZXJQYWdlKVxyXG5jb25zdCBmaWx0ZXJBcHAgPSByZXF1aXJlKCcuL2ZpbHRlcicpXHJcbmNvbnN0IHRvZG9zID0gcmVxdWlyZSgnLi90b2RvJylcclxuXHJcbmNsYXNzIEFwcCBleHRlbmRzIEtlZXQge1xyXG4gIHRvZG9Nb2RlbCA9IHRvZG9zXHJcbiAgZmlsdGVyID0gZmlsdGVyQXBwXHJcbiAgcGFnZSA9ICdBbGwnXHJcbiAgaXNDaGVja2VkID0gZmFsc2VcclxuICBjb3VudCA9IDBcclxuICBwbHVyYWwgPSAnJ1xyXG4gIGNsZWFyVG9nZ2xlID0gZmFsc2VcclxuICAvLyB0b2RvU3RhdGUgPSB0cnVlXHJcblxyXG4gIGNvbXBvbmVudFdpbGxNb3VudCgpIHtcclxuICAgIGZpbHRlclBhZ2UubWFwKGYgPT4gdGhpc1tgcGFnZSR7Y2FtZWxDYXNlKGYpfWBdID0gJycpXHJcblxyXG4gICAgdGhpcy50b2RvU3RhdGUgPSB0aGlzLnRvZG9Nb2RlbC5saXN0Lmxlbmd0aCA/IHRydWUgOiBmYWxzZVxyXG5cclxuICAgIHRoaXMudG9kb01vZGVsLnN1YnNjcmliZSh0b2RvcyA9PiB7XHJcbiAgICAgIGxldCB1bmNvbXBsZXRlZCA9IHRvZG9zLmZpbHRlcihjID0+ICFjLmNvbXBsZXRlZClcclxuICAgICAgbGV0IGNvbXBsZXRlZCA9IHRvZG9zLmZpbHRlcihjID0+IGMuY29tcGxldGVkKVxyXG4gICAgICB0aGlzLmNsZWFyVG9nZ2xlID0gY29tcGxldGVkLmxlbmd0aCA/IHRydWUgOiBmYWxzZVxyXG4gICAgICB0aGlzLnRvZG9TdGF0ZSA9IHRvZG9zLmxlbmd0aCA/IHRydWUgOiBmYWxzZVxyXG4gICAgICB0aGlzLnBsdXJhbCA9IHVuY29tcGxldGVkLmxlbmd0aCA9PT0gMSA/ICcnIDogJ3MnXHJcbiAgICAgIHRoaXMuY291bnQgPSB1bmNvbXBsZXRlZC5sZW5ndGhcclxuICAgIH0pXHJcbiAgfVxyXG5cclxuICBjcmVhdGUgKGV2dCkge1xyXG4gICAgaWYoZXZ0LmtleUNvZGUgIT09IDEzKSByZXR1cm5cclxuICAgIGxldCB0aXRsZSA9IGV2dC50YXJnZXQudmFsdWUudHJpbSgpXHJcbiAgICBpZih0aXRsZSl7XHJcbiAgICAgIHRoaXMudG9kb01vZGVsLmFkZCh7IGlkOiBnZW5JZCgpLCB0aXRsZSwgY29tcGxldGVkOiBmYWxzZSB9KVxyXG4gICAgICBldnQudGFyZ2V0LnZhbHVlID0gJydcclxuICAgIH1cclxuICB9XHJcblxyXG4gIGV2dFRvZG8oZXZ0KXtcclxuICAgIGlmKGV2dC50YXJnZXQuY2xhc3NOYW1lID09PSAndG9nZ2xlJyl7XHJcbiAgICAgIHRoaXMudG9nZ2xlVG9kbyhldnQudGFyZ2V0LnBhcmVudE5vZGUucGFyZW50Tm9kZS5pZCwgZXZ0KVxyXG4gICAgfSBlbHNlIGlmKGV2dC50YXJnZXQuY2xhc3NOYW1lID09PSAnZGVzdHJveScpe1xyXG4gICAgICB0aGlzLnRvZG9EZXN0cm95KGV2dC50YXJnZXQucGFyZW50Tm9kZS5wYXJlbnROb2RlLmlkKVxyXG4gICAgfVxyXG4gIH1cclxuXHJcbiAgdG9nZ2xlVG9kbyhpZCwgZXZ0KSB7XHJcbiAgICB0aGlzLnRvZG9Nb2RlbC51cGRhdGUoICdpZCcsIHsgaWQsIGNvbXBsZXRlZDogISFldnQudGFyZ2V0LmNoZWNrZWQgfSlcclxuICB9XHJcblxyXG4gIHRvZG9EZXN0cm95KGlkKSB7XHJcbiAgICB0aGlzLnRvZG9Nb2RlbC5kZXN0cm95KCdpZCcsIGlkKVxyXG4gIH1cclxuXHJcbiAgY29tcGxldGVBbGwoKXtcclxuICAgIHRoaXMuaXNDaGVja2VkID0gIXRoaXMuaXNDaGVja2VkXHJcbiAgICB0aGlzLnRvZG9Nb2RlbC51cGRhdGVBbGwodGhpcy5pc0NoZWNrZWQpXHJcbiAgfVxyXG5cclxuICBjbGVhckNvbXBsZXRlZCgpIHtcclxuICAgIHRoaXMudG9kb01vZGVsLmNsZWFyQ29tcGxldGVkKClcclxuICB9XHJcbiAgZWRpdE1vZGUoKXtcclxuXHJcbiAgfVxyXG59XHJcblxyXG5jb25zdCB2bW9kZWwgPSBodG1sYFxyXG4gIDxzZWN0aW9uIGlkPVwidG9kb2FwcFwiPlxyXG4gICAgPGhlYWRlciBpZD1cImhlYWRlclwiPlxyXG4gICAgICA8aDE+dG9kb3M8L2gxPlxyXG4gICAgICA8aW5wdXQgaWQ9XCJuZXctdG9kb1wiIGsta2V5ZG93bj1cImNyZWF0ZSgpXCIgcGxhY2Vob2xkZXI9XCJXaGF0IG5lZWRzIHRvIGJlIGRvbmU/XCIgYXV0b2ZvY3VzPlxyXG4gICAgPC9oZWFkZXI+XHJcbiAgICB7ez90b2RvU3RhdGV9fVxyXG4gICAgPHNlY3Rpb24gaWQ9XCJtYWluXCI+XHJcbiAgICAgIDxpbnB1dCBpZD1cInRvZ2dsZS1hbGxcIiB0eXBlPVwiY2hlY2tib3hcIiB7e2lzQ2hlY2tlZD9jaGVja2VkOicnfX0gay1jbGljaz1cImNvbXBsZXRlQWxsKClcIj5cclxuICAgICAgPGxhYmVsIGZvcj1cInRvZ2dsZS1hbGxcIj5NYXJrIGFsbCBhcyBjb21wbGV0ZTwvbGFiZWw+XHJcbiAgICAgIDx1bCBpZD1cInRvZG8tbGlzdFwiIGstY2xpY2s9XCJldnRUb2RvKClcIiBrLWRibGNsaWNrPVwiZWRpdE1vZGUoKVwiIGV2dC1ub2RlPlxyXG4gICAgICAgIHt7bW9kZWw6dG9kb01vZGVsfX1cclxuICAgICAgICAgIDxsaSBpZD1cInt7aWR9fVwiIGNsYXNzPVwie3tjb21wbGV0ZWQ/Y29tcGxldGVkOicnfX1cIj5cclxuICAgICAgICAgICAgPGRpdiBjbGFzcz1cInZpZXdcIj5cclxuICAgICAgICAgICAgICA8aW5wdXQgY2xhc3M9XCJ0b2dnbGVcIiB0eXBlPVwiY2hlY2tib3hcIiB7e2NvbXBsZXRlZD9jaGVja2VkOicnfX0+XHJcbiAgICAgICAgICAgICAgPGxhYmVsPnt7dGl0bGV9fTwvbGFiZWw+XHJcbiAgICAgICAgICAgICAgPGJ1dHRvbiBjbGFzcz1cImRlc3Ryb3lcIj48L2J1dHRvbj5cclxuICAgICAgICAgICAgPC9kaXY+XHJcbiAgICAgICAgICAgIDxpbnB1dCBjbGFzcz1cImVkaXRcIiB2YWx1ZT1cInt7dGl0bGV9fVwiPlxyXG4gICAgICAgICAgPC9saT5cclxuICAgICAgICB7ey9tb2RlbDp0b2RvTW9kZWx9fVxyXG4gICAgICA8L3VsPlxyXG4gICAgPC9zZWN0aW9uPlxyXG4gICAgPGZvb3RlciBpZD1cImZvb3RlclwiPlxyXG4gICAgICA8c3BhbiBpZD1cInRvZG8tY291bnRcIj5cclxuICAgICAgICA8c3Ryb25nPnt7Y291bnR9fTwvc3Ryb25nPiBpdGVte3twbHVyYWx9fSBsZWZ0XHJcbiAgICAgIDwvc3Bhbj5cclxuICAgICAge3tjb21wb25lbnQ6ZmlsdGVyfX1cclxuICAgICAge3s/Y2xlYXJUb2dnbGV9fVxyXG4gICAgICA8YnV0dG9uIGlkPVwiY2xlYXItY29tcGxldGVkXCIgay1jbGljaz1cImNsZWFyQ29tcGxldGVkKClcIj5DbGVhciBjb21wbGV0ZWQ8L2J1dHRvbj5cclxuICAgICAge3svY2xlYXJUb2dnbGV9fVxyXG4gICAgPC9mb290ZXI+XHJcbiAgICB7ey90b2RvU3RhdGV9fVxyXG4gIDwvc2VjdGlvbj5cclxuICA8Zm9vdGVyIGlkPVwiaW5mb1wiPlxyXG4gICAgPHA+RG91YmxlLWNsaWNrIHRvIGVkaXQgYSB0b2RvPC9wPlxyXG4gICAgPHA+Q3JlYXRlZCBieSA8YSBocmVmPVwiaHR0cHM6Ly9naXRodWIuY29tL3N5YXJ1bFwiPlNoYWhydWwgTml6YW0gU2VsYW1hdDwvYT48L3A+XHJcbiAgICA8cD5QYXJ0IG9mIDxhIGhyZWY9XCJodHRwOi8vdG9kb212Yy5jb21cIj5Ub2RvTVZDPC9hPjwvcD5cclxuICA8L2Zvb3Rlcj5gXHJcblxyXG5jb25zdCBhcHAgPSBuZXcgQXBwKClcclxuXHJcbmFwcC5tb3VudCh2bW9kZWwpLmxpbmsoJ3RvZG8nKVxyXG4iLCJjb25zdCB7IGNhbWVsQ2FzZSB9ID0gcmVxdWlyZSgnLi91dGlsJylcclxuY29uc3QgeyBjcmVhdGVNb2RlbCB9ID0gcmVxdWlyZSgnLi4va2VldC91dGlscycpXHJcblxyXG5jbGFzcyBDcmVhdGVGaWx0ZXJNb2RlbCBleHRlbmRzIGNyZWF0ZU1vZGVsIHtcclxuICBzd2l0Y2goaGFzaCwgb2JqKXtcclxuICAgIHRoaXMubGlzdCA9IHRoaXMubGlzdC5tYXAoZmlsdGVyID0+XHJcbiAgICAgIGZpbHRlci5oYXNoID09PSBoYXNoID8gKHsgLi4uZmlsdGVyLCAuLi5vYmp9KSA6ICh7IC4uLmZpbHRlciwgLi4ueyBzZWxlY3RlZDogZmFsc2UgfX0pXHJcbiAgICApXHJcbiAgfVxyXG59XHJcblxyXG5jb25zdCBmaWx0ZXJNb2RlbCA9IG5ldyBDcmVhdGVGaWx0ZXJNb2RlbCgpXHJcblxyXG5BcnJheS5mcm9tKFsnYWxsJywgJ2FjdGl2ZScsICdjb21wbGV0ZWQnXSkubWFwKHBhZ2UgPT4ge1xyXG5cdGZpbHRlck1vZGVsLmFkZCh7XHJcbiAgICAgIGhhc2g6ICcjLycgKyBwYWdlLFxyXG4gICAgICBuYW1lOiBjYW1lbENhc2UocGFnZSksXHJcbiAgICAgIHNlbGVjdGVkOiBmYWxzZVxyXG4gICAgfSlcclxufSlcclxuXHJcbm1vZHVsZS5leHBvcnRzID0gZmlsdGVyTW9kZWwiLCJjb25zdCBLZWV0ID0gcmVxdWlyZSgnLi4va2VldCcpXHJcbmNvbnN0IHsgY2FtZWxDYXNlLCBodG1sIH0gPSByZXF1aXJlKCcuL3V0aWwnKVxyXG5jb25zdCBmaWx0ZXJzID0gcmVxdWlyZSgnLi9maWx0ZXItbW9kZWwnKVxyXG5cclxuXHJcbmNsYXNzIEFwcCBleHRlbmRzIEtlZXQge1xyXG4gIGVsID0gJ2ZpbHRlcnMnXHJcbiAgZmlsdGVyTW9kZWwgPSBmaWx0ZXJzXHJcbiAgY29tcG9uZW50V2lsbE1vdW50KCkge1xyXG4gICAgdGhpcy5maWx0ZXJNb2RlbC5zdWJzY3JpYmUobW9kZWwgPT4ge1xyXG4gICAgICB0aGlzLmNhbGxCYXRjaFBvb2xVcGRhdGUoKVxyXG4gICAgfSlcclxuICAgIGlmKHdpbmRvdy5sb2NhdGlvbi5oYXNoID09ICcnKSB7XHJcbiAgICAgIHdpbmRvdy5oaXN0b3J5LnB1c2hTdGF0ZSh7fSwgbnVsbCwgJyMvYWxsJylcclxuICAgIH1cclxuICB9XHJcbiAgY29tcG9uZW50RGlkTW91bnQoKXtcclxuICAgIHRoaXMudXBkYXRlVXJsKHdpbmRvdy5sb2NhdGlvbi5oYXNoKVxyXG4gICAgd2luZG93Lm9ucG9wc3RhdGUgPSAoKSA9PiB0aGlzLnVwZGF0ZVVybCh3aW5kb3cubG9jYXRpb24uaGFzaClcclxuICB9XHJcblxyXG4gIC8vIGNvbXBvbmVudERpZFVuTW91bnQoKXtcclxuICAgIC8vXHJcbiAgLy8gfVxyXG5cclxuICB1cGRhdGVVcmwoaGFzaCkge1xyXG4gICAgdGhpcy5maWx0ZXJNb2RlbC5zd2l0Y2goaGFzaCwgeyBzZWxlY3RlZDogdHJ1ZSB9KVxyXG4gIH1cclxufVxyXG5cclxuY29uc3QgZmlsdGVyQXBwID0gbmV3IEFwcCgpXHJcblxyXG5sZXQgdm1vZGVsID0gaHRtbGBcclxuXHQ8dWwgaWQ9XCJmaWx0ZXJzXCI+XHJcblx0XHR7e21vZGVsOmZpbHRlck1vZGVsfX1cclxuXHRcdDxsaSBrLWNsaWNrPVwidXBkYXRlVXJsKHt7aGFzaH19KVwiPjxhIGNsYXNzPVwie3tzZWxlY3RlZD9zZWxlY3RlZDonJ319XCIgaHJlZj1cInt7aGFzaH19XCI+e3tuYW1lfX08L2E+PC9saT5cclxuXHRcdHt7L21vZGVsOmZpbHRlck1vZGVsfX1cclxuXHQ8L3VsPlxyXG5gXHJcblxyXG5maWx0ZXJBcHAubW91bnQodm1vZGVsKVxyXG5cclxubW9kdWxlLmV4cG9ydHMgPSBmaWx0ZXJBcHAiLCJjb25zdCBLZWV0ID0gcmVxdWlyZSgnLi4va2VldCcpXHJcbmNvbnN0IHsgY3JlYXRlTW9kZWwgfSA9IHJlcXVpcmUoJy4uL2tlZXQvdXRpbHMnKVxyXG5cclxuY2xhc3MgQ3JlYXRlTW9kZWwgZXh0ZW5kcyBjcmVhdGVNb2RlbCB7XHJcblxyXG4gIGNsZWFyQ29tcGxldGVkKCkge1xyXG4gICAgdGhpcy5saXN0ID0gdGhpcy5saXN0LmZpbHRlcih0b2RvID0+ICF0b2RvLmNvbXBsZXRlZClcclxuICB9IFxyXG59XHJcblxyXG5jb25zdCB0b2RvcyA9IG5ldyBDcmVhdGVNb2RlbCgpXHJcblxyXG5tb2R1bGUuZXhwb3J0cyA9IHRvZG9zXHJcbiIsIlxyXG5jb25zdCB7IGdlbklkIH0gPSByZXF1aXJlKCcuL3V0aWwnKVxyXG5cclxuLy8gbm90ZTogY29weSB3aXRoIG1vZGlmaWNhdGlvbiBmcm9tIHByZWFjdC10b2RvbXZjXHJcblxyXG5tb2R1bGUuZXhwb3J0cyA9ICgpID0+IHtcclxuXHJcbiAgbGV0IG9uQ2hhbmdlcyA9IFtdXHJcblxyXG4gIGZ1bmN0aW9uIGluZm9ybSAoKSB7XHJcbiAgICBmb3IgKGxldCBpID0gb25DaGFuZ2VzLmxlbmd0aDsgaS0tOykge1xyXG4gICAgICBvbkNoYW5nZXNbaV0obW9kZWwpXHJcbiAgICB9XHJcbiAgfVxyXG5cclxuICBsZXQgbW9kZWwgPSB7XHJcblxyXG4gICAgbGlzdDogW10sXHJcblxyXG4gICAgLy8gb3BzOiBudWxsLFxyXG5cclxuICAgIHN1YnNjcmliZSAoZm4pIHtcclxuICAgICAgb25DaGFuZ2VzLnB1c2goZm4pXHJcbiAgICB9LFxyXG5cclxuICAgIGFkZFRvZG8gKHRpdGxlKSB7XHJcbiAgICAgIC8vIHRoaXMub3BzID0gJ2FkZCdcclxuICAgICAgdGhpcy5saXN0ID0gdGhpcy5saXN0LmNvbmNhdCh7XHJcbiAgICAgICAgaWQ6IGdlbklkKCksXHJcbiAgICAgICAgdGl0bGUsXHJcbiAgICAgICAgY29tcGxldGVkOiBmYWxzZVxyXG4gICAgICB9KVxyXG4gICAgICBpbmZvcm0oKVxyXG4gICAgfSxcclxuXHJcbiAgICB0b2dnbGVBbGwoY29tcGxldGVkKSB7XHJcbiAgICAgIHRoaXMub3BzID0gJ3RvZ2dsZUFsbCdcclxuICAgICAgdGhpcy5saXN0ID0gdGhpcy5saXN0Lm1hcChcclxuICAgICAgICB0b2RvID0+ICh7IC4uLnRvZG8sIGNvbXBsZXRlZCB9KVxyXG4gICAgICApO1xyXG4gICAgICBpbmZvcm0oKVxyXG4gICAgfSxcclxuICAgIFxyXG4gICAgdG9nZ2xlKHRvZG9Ub1RvZ2dsZSkge1xyXG4gICAgICAvLyB0aGlzLm9wcyA9ICd0b2dnbGUnXHJcbiAgICAgIHRoaXMubGlzdCA9IHRoaXMubGlzdC5tYXAodG9kbyA9PlxyXG4gICAgICAgIHRvZG8uaWQgIT09IHRvZG9Ub1RvZ2dsZS5pZCA/IHRvZG8gOiAoeyAuLi50b2RvLCAuLi50b2RvVG9Ub2dnbGV9KVxyXG4gICAgICApXHJcbiAgICAgIGluZm9ybSgpXHJcbiAgICB9LFxyXG4gICAgXHJcbiAgICBkZXN0cm95KGlkKSB7XHJcbiAgICAgIC8vIHRoaXMub3BzID0gJ2Rlc3Ryb3knXHJcbiAgICAgIHRoaXMubGlzdCA9IHRoaXMubGlzdC5maWx0ZXIodCA9PiB0LmlkICE9PSBpZClcclxuICAgICAgaW5mb3JtKClcclxuICAgIH0sXHJcbiAgICAvKlxyXG4gICAgc2F2ZSh0b2RvVG9TYXZlLCB0aXRsZSkge1xyXG4gICAgICBtb2RlbC50b2RvcyA9IG1vZGVsLnRvZG9zLm1hcCggdG9kbyA9PiAoXHJcbiAgICAgICAgdG9kbyAhPT0gdG9kb1RvU2F2ZSA/IHRvZG8gOiAoeyAuLi50b2RvLCB0aXRsZSB9KVxyXG4gICAgICApKTtcclxuICAgICAgaW5mb3JtKCk7XHJcbiAgICB9LFxyXG5cclxuICAgIGNsZWFyQ29tcGxldGVkKCkge1xyXG4gICAgICBtb2RlbC50b2RvcyA9IG1vZGVsLnRvZG9zLmZpbHRlciggdG9kbyA9PiAhdG9kby5jb21wbGV0ZWQgKTtcclxuICAgICAgaW5mb3JtKCk7XHJcbiAgICB9ICovXHJcbiAgfVxyXG5cclxuICByZXR1cm4gbW9kZWxcclxufVxyXG4iLCJleHBvcnRzLmluZm9ybSA9IGZ1bmN0aW9uKGJhc2UsIGlucHV0KSB7XHJcbiAgZm9yICh2YXIgaSA9IGJhc2Uub25DaGFuZ2VzLmxlbmd0aDsgaS0tOykge1xyXG4gICAgYmFzZS5vbkNoYW5nZXNbaV0oaW5wdXQpXHJcbiAgfVxyXG59XHJcblxyXG5leHBvcnRzLnN0b3JlID0gZnVuY3Rpb24obmFtZXNwYWNlLCBkYXRhKSB7XHJcbiAgaWYgKGFyZ3VtZW50cy5sZW5ndGggPiAxKSB7XHJcbiAgICByZXR1cm4gbG9jYWxTdG9yYWdlLnNldEl0ZW0obmFtZXNwYWNlLCBKU09OLnN0cmluZ2lmeShkYXRhKSlcclxuICB9IGVsc2Uge1xyXG4gICAgdmFyIHN0b3JlID0gbG9jYWxTdG9yYWdlLmdldEl0ZW0obmFtZXNwYWNlKVxyXG4gICAgcmV0dXJuIHN0b3JlICYmIEpTT04ucGFyc2Uoc3RvcmUpIHx8IFtdXHJcbiAgfVxyXG59XHJcblxyXG5leHBvcnRzLmNhbWVsQ2FzZSA9IGZ1bmN0aW9uKHMpIHtcclxuICByZXR1cm4gcy5jaGFyQXQoMCkudG9VcHBlckNhc2UoKSArIHMuc2xpY2UoMSlcclxufVxyXG5cclxuZXhwb3J0cy5zZWxlY3RvciA9IGZ1bmN0aW9uIChpZCkge1xyXG4gIHJldHVybiBkb2N1bWVudC5xdWVyeVNlbGVjdG9yKCdba2VldC1pZD1cIicgKyBpZCArICdcIl0nKVxyXG59XHJcblxyXG5leHBvcnRzLmdlbklkID0gZnVuY3Rpb24oKSB7XHJcbiAgcmV0dXJuIChNYXRoLnJvdW5kKE1hdGgucmFuZG9tKCkgKiAweDEqMWUxMikpLnRvU3RyaW5nKDMyKVxyXG59XHJcblxyXG5leHBvcnRzLmdldElkID0gZnVuY3Rpb24gKGlkKSB7XHJcbiAgcmV0dXJuIGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKGlkKVxyXG59XHJcblxyXG5leHBvcnRzLmh0bWwgPSBmdW5jdGlvbiAobGl0ZXJhbFNlY3Rpb25zLCAuLi5zdWJzdHMpIHtcclxuICAvLyBVc2UgcmF3IGxpdGVyYWwgc2VjdGlvbnM6IHdlIGRvbuKAmXQgd2FudFxyXG4gIC8vIGJhY2tzbGFzaGVzIChcXG4gZXRjLikgdG8gYmUgaW50ZXJwcmV0ZWRcclxuICBsZXQgcmF3ID0gbGl0ZXJhbFNlY3Rpb25zLnJhdztcclxuXHJcbiAgbGV0IHJlc3VsdCA9ICcnO1xyXG5cclxuICBzdWJzdHMuZm9yRWFjaCgoc3Vic3QsIGkpID0+IHtcclxuICAgICAgLy8gUmV0cmlldmUgdGhlIGxpdGVyYWwgc2VjdGlvbiBwcmVjZWRpbmdcclxuICAgICAgLy8gdGhlIGN1cnJlbnQgc3Vic3RpdHV0aW9uXHJcbiAgICAgIGxldCBsaXQgPSByYXdbaV07XHJcblxyXG4gICAgICAvLyBJbiB0aGUgZXhhbXBsZSwgbWFwKCkgcmV0dXJucyBhbiBhcnJheTpcclxuICAgICAgLy8gSWYgc3Vic3RpdHV0aW9uIGlzIGFuIGFycmF5IChhbmQgbm90IGEgc3RyaW5nKSxcclxuICAgICAgLy8gd2UgdHVybiBpdCBpbnRvIGEgc3RyaW5nXHJcbiAgICAgIGlmIChBcnJheS5pc0FycmF5KHN1YnN0KSkge1xyXG4gICAgICAgICAgc3Vic3QgPSBzdWJzdC5qb2luKCcnKTtcclxuICAgICAgfVxyXG5cclxuICAgICAgLy8gSWYgdGhlIHN1YnN0aXR1dGlvbiBpcyBwcmVjZWRlZCBieSBhIGRvbGxhciBzaWduLFxyXG4gICAgICAvLyB3ZSBlc2NhcGUgc3BlY2lhbCBjaGFyYWN0ZXJzIGluIGl0XHJcbiAgICAgIGlmIChsaXQuZW5kc1dpdGgoJyQnKSkge1xyXG4gICAgICAgICAgc3Vic3QgPSBodG1sRXNjYXBlKHN1YnN0KTtcclxuICAgICAgICAgIGxpdCA9IGxpdC5zbGljZSgwLCAtMSk7XHJcbiAgICAgIH1cclxuICAgICAgcmVzdWx0ICs9IGxpdDtcclxuICAgICAgcmVzdWx0ICs9IHN1YnN0O1xyXG4gIH0pO1xyXG4gIC8vIFRha2UgY2FyZSBvZiBsYXN0IGxpdGVyYWwgc2VjdGlvblxyXG4gIC8vIChOZXZlciBmYWlscywgYmVjYXVzZSBhbiBlbXB0eSB0ZW1wbGF0ZSBzdHJpbmdcclxuICAvLyBwcm9kdWNlcyBvbmUgbGl0ZXJhbCBzZWN0aW9uLCBhbiBlbXB0eSBzdHJpbmcpXHJcbiAgcmVzdWx0ICs9IHJhd1tyYXcubGVuZ3RoLTFdOyAvLyAoQSlcclxuXHJcbiAgcmV0dXJuIHJlc3VsdDtcclxufVxyXG5cclxuZXhwb3J0cy5pbnRlbGxpVXBkYXRlID0gZnVuY3Rpb24oc3RhdGUsIGNhbGxiYWNrKSB7XHJcbiAgLy8gb25seSB1cGRhdGUgd2hlbiBuZWNlc3NhcnlcclxuICBpZiAoc3RhdGUpIGNsZWFyVGltZW91dChzdGF0ZSlcclxuICBzdGF0ZSA9IHNldFRpbWVvdXQoZnVuY3Rpb24oKSB7XHJcbiAgICBjYWxsYmFjaygpXHJcbiAgfSwgMTApXHJcbn0iXX0=
