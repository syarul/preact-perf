(function(){function r(e,n,t){function o(i,f){if(!n[i]){if(!e[i]){var c="function"==typeof require&&require;if(!f&&c)return c(i,!0);if(u)return u(i,!0);var a=new Error("Cannot find module '"+i+"'");throw a.code="MODULE_NOT_FOUND",a}var p=n[i]={exports:{}};e[i][0].call(p.exports,function(r){var n=e[i][1][r];return o(n||r)},p,p.exports,r,e,n,t)}return n[i].exports}for(var u="function"==typeof require&&require,i=0;i<t.length;i++)o(t[i]);return o}return r})()({1:[function(require,module,exports){
module.exports = function (string) {
  var self = this
  this.__componentList__.map(function (component) {
    if (self[component]) {
      // register this component as a sub-component
      self[component].IS_STUB = true
      var regx = '(\\{\\{component:' + component + '\\}\\})'
      var re = new RegExp(regx, 'g')
      var tpl = self[component].render('asString')
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
var strInterpreter = require('./strInterpreter')
var componentParse = require('./componentParse')
var modelParse = require('./modelParse')
var nodesVisibility = require('./nodesVisibility')
var morph = require('morphdom')

var updateContext = function () {
  var ele = getId(this.el)
  var newElem = genElement.call(this)
  var frag = []
  // morp as sub-component
  if (this.IS_STUB) {
    morph(ele, newElem.childNodes[0])
  } else {
  // otherwise moph as whole
    newElem.id = this.el
    morph(ele, newElem)
    // clean up document creation from potential memory leaks
    loopChilds(frag, newElem)
    frag.map(function (fragment) {
      fragment.remove()
    })
  }
  // exec life-cycle componentDidUpdate
  if (this.componentDidUpdate && typeof this.componentDidUpdate === 'function') {
    this.componentDidUpdate()
  }
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
  testEvent(tpl) && processEvent.call(this, tempDiv)
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
  if (this.componentWillMount && typeof this.componentWillMount === 'function') {
    this.componentWillMount()
  }
  this.render()
  return this
}

Keet.prototype.render = function (stub) {
  if (stub) {
    return parseStr.call(this, stub)
  } else {
    // Render this component to the target DOM
    parseStr.call(this)
    // since component already rendered, trigger its life-cycle method
    if (this.componentDidMount && typeof this.componentDidMount === 'function') {
      this.componentDidMount()
    }
    return this
  }
}

Keet.prototype.cluster = function () {
  // Chain method to run external function(s), this basically serve
  // as an initializer for all child components within the instance tree
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
  if (this.componentDidMount && typeof this.componentDidMount === 'function') {
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

var cov_140h9s3pvc = function () {
  var path = 'D:\\distro\\preact-perf\\todomvc\\keetjs\\keet\\utils.js',
      hash = 'd2057c2a5811d7d92ef159c3ba2470a9471d1730',
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
          line: 47,
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
          line: 33,
          column: 2
        },
        end: {
          line: 46,
          column: 3
        }
      },
      '14': {
        start: {
          line: 33,
          column: 11
        },
        end: {
          line: 33,
          column: 21
        }
      },
      '15': {
        start: {
          line: 35,
          column: 12
        },
        end: {
          line: 41,
          column: 9
        }
      },
      '16': {
        start: {
          line: 36,
          column: 6
        },
        end: {
          line: 36,
          column: 31
        }
      },
      '17': {
        start: {
          line: 37,
          column: 6
        },
        end: {
          line: 40,
          column: 7
        }
      },
      '18': {
        start: {
          line: 38,
          column: 8
        },
        end: {
          line: 38,
          column: 24
        }
      },
      '19': {
        start: {
          line: 39,
          column: 8
        },
        end: {
          line: 39,
          column: 47
        }
      },
      '20': {
        start: {
          line: 43,
          column: 4
        },
        end: {
          line: 45,
          column: 11
        }
      },
      '21': {
        start: {
          line: 44,
          column: 6
        },
        end: {
          line: 44,
          column: 22
        }
      },
      '22': {
        start: {
          line: 58,
          column: 0
        },
        end: {
          line: 60,
          column: 1
        }
      },
      '23': {
        start: {
          line: 59,
          column: 2
        },
        end: {
          line: 59,
          column: 44
        }
      },
      '24': {
        start: {
          line: 59,
          column: 12
        },
        end: {
          line: 59,
          column: 44
        }
      },
      '25': {
        start: {
          line: 72,
          column: 0
        },
        end: {
          line: 82,
          column: 1
        }
      },
      '26': {
        start: {
          line: 73,
          column: 24
        },
        end: {
          line: 73,
          column: 48
        }
      },
      '27': {
        start: {
          line: 74,
          column: 12
        },
        end: {
          line: 74,
          column: 31
        }
      },
      '28': {
        start: {
          line: 76,
          column: 13
        },
        end: {
          line: 76,
          column: 32
        }
      },
      '29': {
        start: {
          line: 77,
          column: 2
        },
        end: {
          line: 77,
          column: 26
        }
      },
      '30': {
        start: {
          line: 78,
          column: 2
        },
        end: {
          line: 80,
          column: 13
        }
      },
      '31': {
        start: {
          line: 79,
          column: 4
        },
        end: {
          line: 79,
          column: 19
        }
      },
      '32': {
        start: {
          line: 81,
          column: 2
        },
        end: {
          line: 81,
          column: 13
        }
      },
      '33': {
        start: {
          line: 92,
          column: 0
        },
        end: {
          line: 166,
          column: 1
        }
      },
      '34': {
        start: {
          line: 94,
          column: 18
        },
        end: {
          line: 94,
          column: 20
        }
      },
      '35': {
        start: {
          line: 96,
          column: 2
        },
        end: {
          line: 101,
          column: 3
        }
      },
      '36': {
        start: {
          line: 97,
          column: 4
        },
        end: {
          line: 97,
          column: 39
        }
      },
      '37': {
        start: {
          line: 98,
          column: 4
        },
        end: {
          line: 100,
          column: 5
        }
      },
      '38': {
        start: {
          line: 99,
          column: 6
        },
        end: {
          line: 99,
          column: 29
        }
      },
      '39': {
        start: {
          line: 108,
          column: 2
        },
        end: {
          line: 108,
          column: 16
        }
      },
      '40': {
        start: {
          line: 118,
          column: 2
        },
        end: {
          line: 120,
          column: 3
        }
      },
      '41': {
        start: {
          line: 119,
          column: 4
        },
        end: {
          line: 119,
          column: 22
        }
      },
      '42': {
        start: {
          line: 130,
          column: 2
        },
        end: {
          line: 133,
          column: 3
        }
      },
      '43': {
        start: {
          line: 131,
          column: 4
        },
        end: {
          line: 131,
          column: 37
        }
      },
      '44': {
        start: {
          line: 132,
          column: 4
        },
        end: {
          line: 132,
          column: 17
        }
      },
      '45': {
        start: {
          line: 144,
          column: 2
        },
        end: {
          line: 149,
          column: 3
        }
      },
      '46': {
        start: {
          line: 145,
          column: 4
        },
        end: {
          line: 147,
          column: 6
        }
      },
      '47': {
        start: {
          line: 146,
          column: 6
        },
        end: {
          line: 146,
          column: 88
        }
      },
      '48': {
        start: {
          line: 148,
          column: 4
        },
        end: {
          line: 148,
          column: 17
        }
      },
      '49': {
        start: {
          line: 160,
          column: 2
        },
        end: {
          line: 165,
          column: 3
        }
      },
      '50': {
        start: {
          line: 161,
          column: 4
        },
        end: {
          line: 163,
          column: 6
        }
      },
      '51': {
        start: {
          line: 162,
          column: 6
        },
        end: {
          line: 162,
          column: 36
        }
      },
      '52': {
        start: {
          line: 164,
          column: 4
        },
        end: {
          line: 164,
          column: 17
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
            column: 78
          },
          end: {
            line: 47,
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
            line: 41,
            column: 5
          }
        },
        line: 35
      },
      '5': {
        name: '(anonymous_5)',
        decl: {
          start: {
            line: 43,
            column: 15
          },
          end: {
            line: 43,
            column: 16
          }
        },
        loc: {
          start: {
            line: 43,
            column: 27
          },
          end: {
            line: 45,
            column: 5
          }
        },
        line: 43
      },
      '6': {
        name: '(anonymous_6)',
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
      '7': {
        name: '(anonymous_7)',
        decl: {
          start: {
            line: 72,
            column: 15
          },
          end: {
            line: 72,
            column: 16
          }
        },
        loc: {
          start: {
            line: 72,
            column: 27
          },
          end: {
            line: 82,
            column: 1
          }
        },
        line: 72
      },
      '8': {
        name: '(anonymous_8)',
        decl: {
          start: {
            line: 78,
            column: 18
          },
          end: {
            line: 78,
            column: 19
          }
        },
        loc: {
          start: {
            line: 78,
            column: 31
          },
          end: {
            line: 80,
            column: 3
          }
        },
        line: 78
      },
      '9': {
        name: '(anonymous_9)',
        decl: {
          start: {
            line: 92,
            column: 22
          },
          end: {
            line: 92,
            column: 23
          }
        },
        loc: {
          start: {
            line: 92,
            column: 34
          },
          end: {
            line: 166,
            column: 1
          }
        },
        line: 92
      },
      '10': {
        name: '(anonymous_10)',
        decl: {
          start: {
            line: 96,
            column: 16
          },
          end: {
            line: 96,
            column: 17
          }
        },
        loc: {
          start: {
            line: 96,
            column: 27
          },
          end: {
            line: 101,
            column: 3
          }
        },
        line: 96
      },
      '11': {
        name: '(anonymous_11)',
        decl: {
          start: {
            line: 118,
            column: 19
          },
          end: {
            line: 118,
            column: 20
          }
        },
        loc: {
          start: {
            line: 118,
            column: 33
          },
          end: {
            line: 120,
            column: 3
          }
        },
        line: 118
      },
      '12': {
        name: '(anonymous_12)',
        decl: {
          start: {
            line: 130,
            column: 13
          },
          end: {
            line: 130,
            column: 14
          }
        },
        loc: {
          start: {
            line: 130,
            column: 28
          },
          end: {
            line: 133,
            column: 3
          }
        },
        line: 130
      },
      '13': {
        name: '(anonymous_13)',
        decl: {
          start: {
            line: 144,
            column: 16
          },
          end: {
            line: 144,
            column: 17
          }
        },
        loc: {
          start: {
            line: 144,
            column: 47
          },
          end: {
            line: 149,
            column: 3
          }
        },
        line: 144
      },
      '14': {
        name: '(anonymous_14)',
        decl: {
          start: {
            line: 145,
            column: 30
          },
          end: {
            line: 145,
            column: 31
          }
        },
        loc: {
          start: {
            line: 145,
            column: 45
          },
          end: {
            line: 147,
            column: 5
          }
        },
        line: 145
      },
      '15': {
        name: '(anonymous_15)',
        decl: {
          start: {
            line: 160,
            column: 17
          },
          end: {
            line: 160,
            column: 18
          }
        },
        loc: {
          start: {
            line: 160,
            column: 44
          },
          end: {
            line: 165,
            column: 3
          }
        },
        line: 160
      },
      '16': {
        name: '(anonymous_16)',
        decl: {
          start: {
            line: 161,
            column: 33
          },
          end: {
            line: 161,
            column: 34
          }
        },
        loc: {
          start: {
            line: 161,
            column: 48
          },
          end: {
            line: 163,
            column: 5
          }
        },
        line: 161
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
            line: 46,
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
            line: 46,
            column: 3
          }
        }, {
          start: {
            line: 33,
            column: 2
          },
          end: {
            line: 46,
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
            line: 40,
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
            line: 40,
            column: 7
          }
        }, {
          start: {
            line: 37,
            column: 6
          },
          end: {
            line: 40,
            column: 7
          }
        }],
        line: 37
      },
      '3': {
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
      '4': {
        loc: {
          start: {
            line: 146,
            column: 13
          },
          end: {
            line: 146,
            column: 88
          }
        },
        type: 'cond-expr',
        locations: [{
          start: {
            line: 146,
            column: 53
          },
          end: {
            line: 146,
            column: 56
          }
        }, {
          start: {
            line: 146,
            column: 59
          },
          end: {
            line: 146,
            column: 88
          }
        }],
        line: 146
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
      '52': 0
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
      '16': 0
    },
    b: {
      '0': [0, 0],
      '1': [0, 0],
      '2': [0, 0],
      '3': [0, 0],
      '4': [0, 0]
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
var loopChilds = function loopChilds(arr, elem) {
  cov_140h9s3pvc.f[1]++;
  cov_140h9s3pvc.s[4]++;

  for (var child = elem.firstChild; child !== null; child = child.nextSibling) {
    cov_140h9s3pvc.s[5]++;

    arr.push(child);
    cov_140h9s3pvc.s[6]++;
    if (child.hasChildNodes()) {
      cov_140h9s3pvc.b[0][0]++;
      cov_140h9s3pvc.s[7]++;

      loopChilds(arr, child);
    } else {
      cov_140h9s3pvc.b[0][1]++;
    }
  }
};

cov_140h9s3pvc.s[8]++;
exports.loopChilds = loopChilds;

cov_140h9s3pvc.s[9]++;
exports.testEvent = function (tmpl) {
  cov_140h9s3pvc.f[2]++;
  cov_140h9s3pvc.s[10]++;

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
cov_140h9s3pvc.s[11]++;
exports.checkNodeAvailability = function (component, componentName, callback) {
  cov_140h9s3pvc.f[3]++;

  var ele = (cov_140h9s3pvc.s[12]++, getId(component.el));

  cov_140h9s3pvc.s[13]++;
  if (ele) {
      cov_140h9s3pvc.b[1][0]++;
      cov_140h9s3pvc.s[14]++;
      return ele;
    } else {
    cov_140h9s3pvc.b[1][1]++;

    var t = (cov_140h9s3pvc.s[15]++, setInterval(function () {
      cov_140h9s3pvc.f[4]++;
      cov_140h9s3pvc.s[16]++;

      ele = getId(component.el);
      cov_140h9s3pvc.s[17]++;
      if (ele) {
        cov_140h9s3pvc.b[2][0]++;
        cov_140h9s3pvc.s[18]++;

        clearInterval(t);
        cov_140h9s3pvc.s[19]++;
        callback(component, componentName, ele);
      } else {
        cov_140h9s3pvc.b[2][1]++;
      }
    }, 0));
    // silently ignore finding the node after sometimes
    cov_140h9s3pvc.s[20]++;
    setTimeout(function () {
      cov_140h9s3pvc.f[5]++;
      cov_140h9s3pvc.s[21]++;

      clearInterval(t);
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
cov_140h9s3pvc.s[22]++;
exports.assert = function (val, msg) {
  cov_140h9s3pvc.f[6]++;
  cov_140h9s3pvc.s[23]++;

  if (!val) {
      cov_140h9s3pvc.b[3][0]++;
      cov_140h9s3pvc.s[24]++;
      throw new Error('(keet) ' + msg);
    } else {
    cov_140h9s3pvc.b[3][1]++;
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
 */
cov_140h9s3pvc.s[25]++;
exports.html = function () {
  cov_140h9s3pvc.f[7]++;

  var literalSections = (cov_140h9s3pvc.s[26]++, [].shift.call(arguments));
  var raw = (cov_140h9s3pvc.s[27]++, literalSections.raw);
  // remove spacing, indentation
  var trim = (cov_140h9s3pvc.s[28]++, raw[raw.length - 1]);
  cov_140h9s3pvc.s[29]++;
  trim = trim.split(/\n+/);
  cov_140h9s3pvc.s[30]++;
  trim = trim.map(function (t) {
    cov_140h9s3pvc.f[8]++;
    cov_140h9s3pvc.s[31]++;

    return t.trim();
  }).join('');
  cov_140h9s3pvc.s[32]++;
  return trim;
};

/**
 * @private
 * @description
 * Copy with modification from preact-todomvc. Model constructor
 *
 * {{model:<myModel>}}<myModelTemplateString>{{/model:<myModel>}}
 *
 */
cov_140h9s3pvc.s[33]++;
exports.createModel = function () {
  cov_140h9s3pvc.f[9]++;


  var onChanges = (cov_140h9s3pvc.s[34]++, []);

  cov_140h9s3pvc.s[35]++;
  this.inform = function () {
    cov_140h9s3pvc.f[10]++;
    cov_140h9s3pvc.s[36]++;

    console.log(this, onChanges.length);
    cov_140h9s3pvc.s[37]++;
    for (var i = onChanges.length; i--;) {
      cov_140h9s3pvc.s[38]++;

      onChanges[i](this.list);
    }
  };

  /**
   * @private
   * @description
   * The array model store
   */
  cov_140h9s3pvc.s[39]++;
  this.list = [];

  /**
   * @private
   * @description
   * Subscribe to the model changes (add/update/destroy)
   *
   * @param {Object} model - the model including all prototypes
   *
   */
  cov_140h9s3pvc.s[40]++;
  this.subscribe = function (fn) {
    cov_140h9s3pvc.f[11]++;
    cov_140h9s3pvc.s[41]++;

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
  cov_140h9s3pvc.s[42]++;
  this.add = function (obj) {
    cov_140h9s3pvc.f[12]++;
    cov_140h9s3pvc.s[43]++;

    this.list = this.list.concat(obj);
    cov_140h9s3pvc.s[44]++;
    this.inform();
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
    cov_140h9s3pvc.f[13]++;
    cov_140h9s3pvc.s[46]++;

    this.list = this.list.map(function (obj) {
      cov_140h9s3pvc.f[14]++;
      cov_140h9s3pvc.s[47]++;

      return obj[lookupId] !== updateObj[lookupId] ? (cov_140h9s3pvc.b[4][0]++, obj) : (cov_140h9s3pvc.b[4][1]++, Object.assign(obj, updateObj));
    });
    cov_140h9s3pvc.s[48]++;
    this.inform();
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
  cov_140h9s3pvc.s[49]++;
  this.destroy = function (lookupId, objId) {
    cov_140h9s3pvc.f[15]++;
    cov_140h9s3pvc.s[50]++;

    this.list = this.list.filter(function (obj) {
      cov_140h9s3pvc.f[16]++;
      cov_140h9s3pvc.s[51]++;

      return obj[lookupId] !== objId;
    });
    cov_140h9s3pvc.s[52]++;
    this.inform();
  };
};

},{}],14:[function(require,module,exports){
'use strict';

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _templateObject = _taggedTemplateLiteral(['\n  <section id="todoapp">\n    <header id="header">\n      <h1>todos</h1>\n      <input id="new-todo" k-keydown="create()" placeholder="What needs to be done?" autofocus>\n    </header>\n    {{?todoState}}\n    <section id="main">\n      <input id="toggle-all" type="checkbox" {{isChecked?checked:\'\'}} k-click="completeAll()">\n      <label for="toggle-all">Mark all as complete</label>\n      <ul id="todo-list">\n        {{model:todoModel}}\n          <li id="{{id}}" k-dblclick="editMode({{id}})" class="{{completed?completed:\'\'}}">\n            <div class="view"><input k-click="toggleTodo({{id}})" class="toggle" type="checkbox" {{completed?checked:\'\'}}>\n              <label>{{title}}</label>\n              <button k-click="todoDestroy({{id}})" class="destroy"></button>\n            </div>\n            <input class="edit" value="{{title}}">\n          </li>\n        {{/model:todoModel}}\n      </ul>\n    </section>\n    <footer id="footer">\n      <span id="todo-count">\n        <strong>{{count}}</strong> item{{plural}} left\n      </span>\n      {{component:filter}}\n      {{?clearToggle}}\n      <button id="clear-completed" k-click="clearCompleted()">Clear completed</button>\n      {{/clearToggle}}\n    </footer>\n    {{/todoState}}\n  </section>\n  <footer id="info">\n    <p>Double-click to edit a todo</p>\n    <p>Created by <a href="https://github.com/syarul">Shahrul Nizam Selamat</a></p>\n    <p>Part of <a href="http://todomvc.com">TodoMVC</a></p>\n  </footer>'], ['\n  <section id="todoapp">\n    <header id="header">\n      <h1>todos</h1>\n      <input id="new-todo" k-keydown="create()" placeholder="What needs to be done?" autofocus>\n    </header>\n    {{?todoState}}\n    <section id="main">\n      <input id="toggle-all" type="checkbox" {{isChecked?checked:\'\'}} k-click="completeAll()">\n      <label for="toggle-all">Mark all as complete</label>\n      <ul id="todo-list">\n        {{model:todoModel}}\n          <li id="{{id}}" k-dblclick="editMode({{id}})" class="{{completed?completed:\'\'}}">\n            <div class="view"><input k-click="toggleTodo({{id}})" class="toggle" type="checkbox" {{completed?checked:\'\'}}>\n              <label>{{title}}</label>\n              <button k-click="todoDestroy({{id}})" class="destroy"></button>\n            </div>\n            <input class="edit" value="{{title}}">\n          </li>\n        {{/model:todoModel}}\n      </ul>\n    </section>\n    <footer id="footer">\n      <span id="todo-count">\n        <strong>{{count}}</strong> item{{plural}} left\n      </span>\n      {{component:filter}}\n      {{?clearToggle}}\n      <button id="clear-completed" k-click="clearCompleted()">Clear completed</button>\n      {{/clearToggle}}\n    </footer>\n    {{/todoState}}\n  </section>\n  <footer id="info">\n    <p>Double-click to edit a todo</p>\n    <p>Created by <a href="https://github.com/syarul">Shahrul Nizam Selamat</a></p>\n    <p>Part of <a href="http://todomvc.com">TodoMVC</a></p>\n  </footer>']);

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

},{"../keet":11,"../keet/utils":13,"./filter":15,"./todo":16,"./todoModel":17,"./util":18}],15:[function(require,module,exports){
'use strict';

var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

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

var _require2 = require('../keet/utils'),
    createModel = _require2.createModel;

var CreateModel = function (_createModel) {
  _inherits(CreateModel, _createModel);

  function CreateModel() {
    _classCallCheck(this, CreateModel);

    return _possibleConstructorReturn(this, (CreateModel.__proto__ || Object.getPrototypeOf(CreateModel)).apply(this, arguments));
  }

  _createClass(CreateModel, [{
    key: 'switch',
    value: function _switch(hash, obj) {
      this.list = this.list.map(function (filter) {
        var non = { selected: false };
        return filter.hash === hash ? _extends({}, filter, obj) : _extends({}, filter, non);
      });
      this.inform();
    }
  }]);

  return CreateModel;
}(createModel);

var filters = new CreateModel();

Array.from(['all', 'active', 'completed']).map(function (page) {
  filters.add({
    hash: '#/' + page,
    name: camelCase(page),
    selected: false
  });
});

var App = function (_Keet) {
  _inherits(App, _Keet);

  function App() {
    var _ref;

    var _temp, _this2, _ret;

    _classCallCheck(this, App);

    for (var _len = arguments.length, args = Array(_len), _key = 0; _key < _len; _key++) {
      args[_key] = arguments[_key];
    }

    return _ret = (_temp = (_this2 = _possibleConstructorReturn(this, (_ref = App.__proto__ || Object.getPrototypeOf(App)).call.apply(_ref, [this].concat(args))), _this2), _this2.el = 'filters', _this2.filterModel = filters, _temp), _possibleConstructorReturn(_this2, _ret);
  }

  _createClass(App, [{
    key: 'componentWillMount',
    value: function componentWillMount() {
      var _this3 = this;

      this.filterModel.subscribe(function (model) {
        console.log(model);
        _this3.callBatchPoolUpdate();
      });
    }
  }, {
    key: 'componentDidMount',
    value: function componentDidMount() {
      var _this4 = this;

      if (window.location.hash == '') {
        this.updateUrl('#/all');
        window.history.pushState({}, null, '#/all');
      }
      window.onpopstate = function () {
        return _this4.updateUrl(window.location.hash);
      };
    }
  }, {
    key: 'updateUrl',
    value: function updateUrl(hash) {
      this.filterModel.switch(hash, { selected: true });
      // this.callBatchPoolUpdate()
    }
  }]);

  return App;
}(Keet);

var filterApp = new App();

var vmodel = html(_templateObject);

filterApp.mount(vmodel);

console.log(filterApp);

module.exports = filterApp;

},{"../keet":11,"../keet/utils":13,"./util":18}],16:[function(require,module,exports){
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
      this.inform();
    }
  }]);

  return CreateModel;
}(createModel);

var todos = new CreateModel();

module.exports = todos;

},{"../keet":11,"../keet/utils":13}],17:[function(require,module,exports){
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

},{}]},{},[14])
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIkM6L1VzZXJzL3BpcGV5L0FwcERhdGEvUm9hbWluZy9ucG0vbm9kZV9tb2R1bGVzL2Jyb3dzZXJpZnkvbm9kZV9tb2R1bGVzL2Jyb3dzZXItcGFjay9fcHJlbHVkZS5qcyIsImtlZXQvY29tcG9uZW50cy9jb21wb25lbnRQYXJzZS5qcyIsImtlZXQvY29tcG9uZW50cy9nZW5FbGVtZW50LmpzIiwia2VldC9jb21wb25lbnRzL2dlbk1vZGVsVGVtcGxhdGUuanMiLCJrZWV0L2NvbXBvbmVudHMvbW9kZWxQYXJzZS5qcyIsImtlZXQvY29tcG9uZW50cy9ub2Rlc1Zpc2liaWxpdHkuanMiLCJrZWV0L2NvbXBvbmVudHMvcGFyc2VTdHIuanMiLCJrZWV0L2NvbXBvbmVudHMvcHJvY2Vzc0V2ZW50LmpzIiwia2VldC9jb21wb25lbnRzL3N0ckludGVycHJldGVyLmpzIiwia2VldC9jb21wb25lbnRzL3Rlcm5hcnlPcHMuanMiLCJrZWV0L2NvbXBvbmVudHMvdG1wbEhhbmRsZXIuanMiLCJrZWV0L2tlZXQuanMiLCJrZWV0L25vZGVfbW9kdWxlcy9tb3JwaGRvbS9kaXN0L21vcnBoZG9tLmpzIiwia2VldC91dGlscy5qcyIsInNyYy9hcHAuanMiLCJzcmMvZmlsdGVyLmpzIiwic3JjL3RvZG8uanMiLCJzcmMvdG9kb01vZGVsLmpzIiwic3JjL3V0aWwuanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7QUNBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNmQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3hJQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ25CQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3RCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNyQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNqREE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDaERBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNSQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzVCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDekNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzlIQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUMxcUJBLElBQUksUUFBUSxTQUFSLEtBQVEsQ0FBVSxFQUFWLEVBQWM7QUFBQTtBQUFBOztBQUN4QixTQUFPLFNBQVMsY0FBVCxDQUF3QixFQUF4QixDQUFQO0FBQ0QsQ0FGRDs7O0FBSUEsUUFBUSxLQUFSLEdBQWdCLEtBQWhCOzs7QUFFQSxJQUFJLGFBQWEsU0FBYixVQUFhLENBQVUsR0FBVixFQUFlLElBQWYsRUFBcUI7QUFB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VSxLQUFWO0FBQ0gsR0FwQkQ7QUFxQkE7QUFDQTtBQUNBO0FBQ0EsWUFBVSxJQUFJLElBQUksTUFBSixHQUFXLENBQWYsQ0FBVixDQS9CbUQsQ0ErQnRCOztBQUU3QixTQUFPLE1BQVA7QUFDRCxDQWxDRDs7QUFvQ0EsUUFBUSxhQUFSLEdBQXdCLFVBQVMsS0FBVCxFQUFnQixRQUFoQixFQUEwQjtBQUNoRDtBQUNBLE1BQUksS0FBSixFQUFXLGFBQWEsS0FBYjtBQUNYLFVBQVEsV0FBVyxZQUFXO0FBQzVCO0FBQ0QsR0FGTyxFQUVMLEVBRkssQ0FBUjtBQUdELENBTkQiLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXNDb250ZW50IjpbIihmdW5jdGlvbigpe2Z1bmN0aW9uIHIoZSxuLHQpe2Z1bmN0aW9uIG8oaSxmKXtpZighbltpXSl7aWYoIWVbaV0pe3ZhciBjPVwiZnVuY3Rpb25cIj09dHlwZW9mIHJlcXVpcmUmJnJlcXVpcmU7aWYoIWYmJmMpcmV0dXJuIGMoaSwhMCk7aWYodSlyZXR1cm4gdShpLCEwKTt2YXIgYT1uZXcgRXJyb3IoXCJDYW5ub3QgZmluZCBtb2R1bGUgJ1wiK2krXCInXCIpO3Rocm93IGEuY29kZT1cIk1PRFVMRV9OT1RfRk9VTkRcIixhfXZhciBwPW5baV09e2V4cG9ydHM6e319O2VbaV1bMF0uY2FsbChwLmV4cG9ydHMsZnVuY3Rpb24ocil7dmFyIG49ZVtpXVsxXVtyXTtyZXR1cm4gbyhufHxyKX0scCxwLmV4cG9ydHMscixlLG4sdCl9cmV0dXJuIG5baV0uZXhwb3J0c31mb3IodmFyIHU9XCJmdW5jdGlvblwiPT10eXBlb2YgcmVxdWlyZSYmcmVxdWlyZSxpPTA7aTx0Lmxlbmd0aDtpKyspbyh0W2ldKTtyZXR1cm4gb31yZXR1cm4gcn0pKCkiLCJtb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uIChzdHJpbmcpIHtcclxuICB2YXIgc2VsZiA9IHRoaXNcclxuICB0aGlzLl9fY29tcG9uZW50TGlzdF9fLm1hcChmdW5jdGlvbiAoY29tcG9uZW50KSB7XHJcbiAgICBpZiAoc2VsZltjb21wb25lbnRdKSB7XHJcbiAgICAgIC8vIHJlZ2lzdGVyIHRoaXMgY29tcG9uZW50IGFzIGEgc3ViLWNvbXBvbmVudFxyXG4gICAgICBzZWxmW2NvbXBvbmVudF0uSVNfU1RVQiA9IHRydWVcclxuICAgICAgdmFyIHJlZ3ggPSAnKFxcXFx7XFxcXHtjb21wb25lbnQ6JyArIGNvbXBvbmVudCArICdcXFxcfVxcXFx9KSdcclxuICAgICAgdmFyIHJlID0gbmV3IFJlZ0V4cChyZWd4LCAnZycpXHJcbiAgICAgIHZhciB0cGwgPSBzZWxmW2NvbXBvbmVudF0ucmVuZGVyKCdhc1N0cmluZycpXHJcbiAgICAgIHNlbGYuX19jb21wb25lbnRTdHViX19bY29tcG9uZW50XSA9IHRwbFxyXG4gICAgICBzdHJpbmcgPSBzdHJpbmcucmVwbGFjZShyZSwgdHBsKVxyXG4gICAgfVxyXG4gIH0pXHJcbiAgcmV0dXJuIHN0cmluZ1xyXG59XHJcbiIsInZhciB0bXBsSGFuZGxlciA9IHJlcXVpcmUoJy4vdG1wbEhhbmRsZXInKVxyXG52YXIgcHJvY2Vzc0V2ZW50ID0gcmVxdWlyZSgnLi9wcm9jZXNzRXZlbnQnKVxyXG52YXIgZ2V0SWQgPSByZXF1aXJlKCcuLi91dGlscycpLmdldElkXHJcbnZhciB0ZXN0RXZlbnQgPSByZXF1aXJlKCcuLi91dGlscycpLnRlc3RFdmVudFxyXG52YXIgbG9vcENoaWxkcyA9IHJlcXVpcmUoJy4uL3V0aWxzJykubG9vcENoaWxkc1xyXG52YXIgc3RySW50ZXJwcmV0ZXIgPSByZXF1aXJlKCcuL3N0ckludGVycHJldGVyJylcclxudmFyIGNvbXBvbmVudFBhcnNlID0gcmVxdWlyZSgnLi9jb21wb25lbnRQYXJzZScpXHJcbnZhciBtb2RlbFBhcnNlID0gcmVxdWlyZSgnLi9tb2RlbFBhcnNlJylcclxudmFyIG5vZGVzVmlzaWJpbGl0eSA9IHJlcXVpcmUoJy4vbm9kZXNWaXNpYmlsaXR5JylcclxudmFyIG1vcnBoID0gcmVxdWlyZSgnbW9ycGhkb20nKVxyXG5cclxudmFyIHVwZGF0ZUNvbnRleHQgPSBmdW5jdGlvbiAoKSB7XHJcbiAgdmFyIGVsZSA9IGdldElkKHRoaXMuZWwpXHJcbiAgdmFyIG5ld0VsZW0gPSBnZW5FbGVtZW50LmNhbGwodGhpcylcclxuICB2YXIgZnJhZyA9IFtdXHJcbiAgLy8gbW9ycCBhcyBzdWItY29tcG9uZW50XHJcbiAgaWYgKHRoaXMuSVNfU1RVQikge1xyXG4gICAgbW9ycGgoZWxlLCBuZXdFbGVtLmNoaWxkTm9kZXNbMF0pXHJcbiAgfSBlbHNlIHtcclxuICAvLyBvdGhlcndpc2UgbW9waCBhcyB3aG9sZVxyXG4gICAgbmV3RWxlbS5pZCA9IHRoaXMuZWxcclxuICAgIG1vcnBoKGVsZSwgbmV3RWxlbSlcclxuICAgIC8vIGNsZWFuIHVwIGRvY3VtZW50IGNyZWF0aW9uIGZyb20gcG90ZW50aWFsIG1lbW9yeSBsZWFrc1xyXG4gICAgbG9vcENoaWxkcyhmcmFnLCBuZXdFbGVtKVxyXG4gICAgZnJhZy5tYXAoZnVuY3Rpb24gKGZyYWdtZW50KSB7XHJcbiAgICAgIGZyYWdtZW50LnJlbW92ZSgpXHJcbiAgICB9KVxyXG4gIH1cclxuICAvLyBleGVjIGxpZmUtY3ljbGUgY29tcG9uZW50RGlkVXBkYXRlXHJcbiAgaWYgKHRoaXMuY29tcG9uZW50RGlkVXBkYXRlICYmIHR5cGVvZiB0aGlzLmNvbXBvbmVudERpZFVwZGF0ZSA9PT0gJ2Z1bmN0aW9uJykge1xyXG4gICAgdGhpcy5jb21wb25lbnREaWRVcGRhdGUoKVxyXG4gIH1cclxuICBiYXRjaFBvb2wuc3RhdHVzID0gJ3JlYWR5J1xyXG59XHJcblxyXG4vLyBiYXRjaCBwb29sIHVwZGF0ZSBzdGF0ZXMgdG8gRE9NXHJcbnZhciBiYXRjaFBvb2wgPSB7XHJcbiAgdHRsOiAwLFxyXG4gIHN0YXR1czogJ3JlYWR5J1xyXG59XHJcblxyXG4vLyBUaGUgaWRlYSBiZWhpbmQgdGhpcyBpcyB0byByZWR1Y2UgbW9ycGhpbmcgdGhlIERPTSB3aGVuIG11bHRpcGxlIHVwZGF0ZXNcclxuLy8gaGl0IHRoZSBkZWNrLiBJZiBwb3NzaWJsZSB3ZSB3YW50IHRvIHBvb2wgdGhlbSBiZWZvcmUgaW5pdGlhdGluZyBET01cclxuLy8gbW9ycGhpbmcsIGJ1dCBpbiB0aGUgZXZlbnQgdGhlIHVwZGF0ZSBpcyBub3QgZmFzdCBlbm91Z2ggd2Ugd2FudCB0byByZXR1cm5cclxuLy8gdG8gbm9ybWFsIHN5bmNocm9ub3VzIHVwZGF0ZS5cclxudmFyIGJhdGNoUG9vbEV4ZWMgPSBmdW5jdGlvbiAoKSB7XHJcbiAgaWYgKGJhdGNoUG9vbC5zdGF0dXMgPT09ICdwb29saW5nJykge1xyXG4gICAgLy9cclxuICB9IGVsc2Uge1xyXG4gICAgdmFyIHNlbGYgPSB0aGlzXHJcbiAgICBiYXRjaFBvb2wuc3RhdHVzID0gJ3Bvb2xpbmcnXHJcbiAgICAvLyBpZiBiYXRjaHBvb2wgaXMgbm90IHlldCBleGVjdXRlZCBvciBpdCB3YXMgaWRsZSAoYWZ0ZXIgMTAwbXMpXHJcbiAgICAvLyBkaXJlY3QgbW9ycGggdGhlIERPTVxyXG4gICAgaWYgKCFiYXRjaFBvb2wudHRsKSB7XHJcbiAgICAgIHVwZGF0ZUNvbnRleHQuY2FsbCh0aGlzKVxyXG4gICAgfSBlbHNlIHtcclxuICAgIC8vIHdlIHdhaXQgdW50aWwgcG9vbGluZyBpcyByZWFkeSBiZWZvcmUgaW5pdGlhdGluZyBET00gbW9ycGhpbmdcclxuICAgICAgY2xlYXJUaW1lb3V0KGJhdGNoUG9vbC50dGwpXHJcbiAgICAgIGJhdGNoUG9vbC50dGwgPSBzZXRUaW1lb3V0KGZ1bmN0aW9uICgpIHtcclxuICAgICAgICB1cGRhdGVDb250ZXh0LmNhbGwoc2VsZilcclxuICAgICAgfSwgMClcclxuICAgIH1cclxuICAgIC8vIHdlIGNsZWFyIHRoZSBiYXRjaCBwb29sIGlmIGl0IG1vcmUgdGhlbiAxMDBtcyBmcm9tXHJcbiAgICAvLyBsYXN0IHVwZGF0ZVxyXG4gICAgYmF0Y2hQb29sLnR0bCA9IHNldFRpbWVvdXQoZnVuY3Rpb24gKCkge1xyXG4gICAgICBiYXRjaFBvb2wudHRsID0gMFxyXG4gICAgfSwgMTAwKVxyXG4gIH1cclxufVxyXG5cclxudmFyIG5leHRTdGF0ZSA9IGZ1bmN0aW9uIChpKSB7XHJcbiAgdmFyIHNlbGYgPSB0aGlzXHJcbiAgaWYgKGkgPCB0aGlzLl9fc3RhdGVMaXN0X18ubGVuZ3RoKSB7XHJcbiAgICB2YXIgc3RhdGUgPSB0aGlzLl9fc3RhdGVMaXN0X19baV1cclxuICAgIHZhciB2YWx1ZSA9IHRoaXNbc3RhdGVdXHJcbiAgICAvLyBpZiB2YWx1ZSBpcyB1bmRlZmluZWQsIGxpa2VseSBoYXMgb2JqZWN0IG5vdGF0aW9uIHdlIGNvbnZlcnQgaXQgdG8gYXJyYXlcclxuICAgIGlmICh2YWx1ZSA9PT0gdW5kZWZpbmVkKSB2YWx1ZSA9IHN0ckludGVycHJldGVyKHN0YXRlKVxyXG5cclxuICAgIGlmICh2YWx1ZSAmJiBBcnJheS5pc0FycmF5KHZhbHVlKSkge1xyXG4gICAgICAvLyB1c2luZyBzcGxpdCBvYmplY3Qgbm90YXRpb24gYXMgYmFzZSBmb3Igc3RhdGUgdXBkYXRlXHJcbiAgICAgIHZhciBpblZhbCA9IHRoaXNbdmFsdWVbMF1dW3ZhbHVlWzFdXVxyXG4gICAgICBPYmplY3QuZGVmaW5lUHJvcGVydHkodGhpc1t2YWx1ZVswXV0sIHZhbHVlWzFdLCB7XHJcbiAgICAgICAgZW51bWVyYWJsZTogZmFsc2UsXHJcbiAgICAgICAgY29uZmlndXJhYmxlOiB0cnVlLFxyXG4gICAgICAgIGdldDogZnVuY3Rpb24gKCkge1xyXG4gICAgICAgICAgcmV0dXJuIGluVmFsXHJcbiAgICAgICAgfSxcclxuICAgICAgICBzZXQ6IGZ1bmN0aW9uICh2YWwpIHtcclxuICAgICAgICAgIGluVmFsID0gdmFsXHJcbiAgICAgICAgICBiYXRjaFBvb2xFeGVjLmNhbGwoc2VsZilcclxuICAgICAgICB9XHJcbiAgICAgIH0pXHJcbiAgICB9IGVsc2Uge1xyXG4gICAgICAvLyBoYW5kbGUgcGFyZW50IHN0YXRlIHVwZGF0ZSBpZiB0aGUgc3RhdGUgaXMgbm90IGFuIG9iamVjdFxyXG4gICAgICBPYmplY3QuZGVmaW5lUHJvcGVydHkodGhpcywgc3RhdGUsIHtcclxuICAgICAgICBlbnVtZXJhYmxlOiBmYWxzZSxcclxuICAgICAgICBjb25maWd1cmFibGU6IHRydWUsXHJcbiAgICAgICAgZ2V0OiBmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgICByZXR1cm4gdmFsdWVcclxuICAgICAgICB9LFxyXG4gICAgICAgIHNldDogZnVuY3Rpb24gKHZhbCkge1xyXG4gICAgICAgICAgdmFsdWUgPSB2YWxcclxuICAgICAgICAgIGJhdGNoUG9vbEV4ZWMuY2FsbChzZWxmKVxyXG4gICAgICAgIH1cclxuICAgICAgfSlcclxuICAgIH1cclxuICAgIGkrK1xyXG4gICAgbmV4dFN0YXRlLmNhbGwodGhpcywgaSlcclxuICB9XHJcbn1cclxuXHJcbnZhciBzZXRTdGF0ZSA9IGZ1bmN0aW9uIChhcmdzKSB7XHJcbiAgbmV4dFN0YXRlLmNhbGwodGhpcywgMClcclxufVxyXG5cclxudmFyIHVwZGF0ZVN0YXRlTGlzdCA9IGZ1bmN0aW9uIChzdGF0ZSkge1xyXG4gIGlmICghfnRoaXMuX19zdGF0ZUxpc3RfXy5pbmRleE9mKHN0YXRlKSkgdGhpcy5fX3N0YXRlTGlzdF9fID0gdGhpcy5fX3N0YXRlTGlzdF9fLmNvbmNhdChzdGF0ZSlcclxufVxyXG5cclxudmFyIGdlbkVsZW1lbnQgPSBmdW5jdGlvbiAoZm9yY2UpIHtcclxuICB2YXIgdGVtcERpdiA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2RpdicpXHJcbiAgdmFyIHRwbCA9IHRtcGxIYW5kbGVyLmNhbGwodGhpcywgdXBkYXRlU3RhdGVMaXN0LmJpbmQodGhpcykpXHJcbiAgdHBsID0gY29tcG9uZW50UGFyc2UuY2FsbCh0aGlzLCB0cGwpXHJcbiAgdHBsID0gbW9kZWxQYXJzZS5jYWxsKHRoaXMsIHRwbClcclxuICB0cGwgPSBub2Rlc1Zpc2liaWxpdHkuY2FsbCh0aGlzLCB0cGwpXHJcbiAgdGVtcERpdi5pbm5lckhUTUwgPSB0cGxcclxuXHJcbiAgc2V0U3RhdGUuY2FsbCh0aGlzKVxyXG4gIHRlc3RFdmVudCh0cGwpICYmIHByb2Nlc3NFdmVudC5jYWxsKHRoaXMsIHRlbXBEaXYpXHJcbiAgaWYgKGZvcmNlKSBiYXRjaFBvb2xFeGVjLmNhbGwodGhpcylcclxuICByZXR1cm4gdGVtcERpdlxyXG59XHJcblxyXG5leHBvcnRzLmdlbkVsZW1lbnQgPSBnZW5FbGVtZW50XHJcbmV4cG9ydHMuc2V0U3RhdGUgPSBzZXRTdGF0ZVxyXG5leHBvcnRzLnVwZGF0ZVN0YXRlTGlzdCA9IHVwZGF0ZVN0YXRlTGlzdFxyXG4iLCJ2YXIgdGVybmFyeU9wcyA9IHJlcXVpcmUoJy4vdGVybmFyeU9wcycpXHJcbnZhciB0bXBsID0gJydcclxuXHJcbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24gKHN0cmluZywgb2JqKSB7XHJcbiAgdmFyIGFyclByb3BzID0gc3RyaW5nLm1hdGNoKC97eyhbXnt9XSspfX0vZylcclxuICB2YXIgcmVwXHJcbiAgdmFyIGlzVGVybmFyeVxyXG4gIHRtcGwgPSBzdHJpbmdcclxuICBmb3IgKHZhciBpID0gMCwgbGVuID0gYXJyUHJvcHMubGVuZ3RoOyBpIDwgbGVuOyBpKyspIHtcclxuICAgIHJlcCA9IGFyclByb3BzW2ldLnJlcGxhY2UoL3t7KFtee31dKyl9fS9nLCAnJDEnKVxyXG4gICAgaXNUZXJuYXJ5ID0gdGVybmFyeU9wcy5jYWxsKG9iaiwgcmVwKVxyXG4gICAgaWYgKGlzVGVybmFyeSkge1xyXG4gICAgICB0bXBsID0gdG1wbC5yZXBsYWNlKCd7eycgKyByZXAgKyAnfX0nLCBpc1Rlcm5hcnkudmFsdWUpXHJcbiAgICB9IGVsc2Uge1xyXG4gICAgICB0bXBsID0gdG1wbC5yZXBsYWNlKCd7eycgKyByZXAgKyAnfX0nLCBvYmpbcmVwXSlcclxuICAgIH1cclxuICB9XHJcbiAgcmV0dXJuIHRtcGxcclxufVxyXG4iLCJ2YXIgZ2VuTW9kZWxUZW1wbGF0ZSA9IHJlcXVpcmUoJy4vZ2VuTW9kZWxUZW1wbGF0ZScpXHJcbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24gKHN0cmluZykge1xyXG4gIHZhciBzZWxmID0gdGhpc1xyXG4gIHRoaXMuX19tb2RlbExpc3RfXy5tYXAoZnVuY3Rpb24gKG1vZGVsLCBpbmRleCkge1xyXG4gICAgaWYgKHNlbGZbbW9kZWxdKSB7XHJcbiAgICAgIHZhciByZWd4ID0gJyhcXFxce1xcXFx7bW9kZWw6JyArIG1vZGVsICsgJ1xcXFx9XFxcXH0pKC4qPykoXFxcXHtcXFxce1xcXFwvbW9kZWw6JyArIG1vZGVsICsgJ1xcXFx9XFxcXH0pJ1xyXG4gICAgICB2YXIgcmUgPSBuZXcgUmVnRXhwKHJlZ3gpXHJcbiAgICAgIHZhciBtYXRjaCA9IHN0cmluZy5tYXRjaChyZSlcclxuICAgICAgaWYgKG1hdGNoKSB7XHJcbiAgICAgICAgdmFyIG1hdGNoUHJpc3RpbmUgPSBzZWxmLmJhc2UubWF0Y2gocmUpXHJcbiAgICAgICAgdmFyIG1vZGVsVGVtcGxhdGUgPSAnJ1xyXG4gICAgICAgIHNlbGZbbW9kZWxdWydsaXN0J10ubWFwKGZ1bmN0aW9uIChvYmopIHtcclxuICAgICAgICAgIG1vZGVsVGVtcGxhdGUgKz0gZ2VuTW9kZWxUZW1wbGF0ZS5jYWxsKHNlbGYsIG1hdGNoUHJpc3RpbmVbMl0sIG9iailcclxuICAgICAgICB9KVxyXG4gICAgICAgIHN0cmluZyA9IHN0cmluZy5yZXBsYWNlKG1hdGNoWzJdLCBtb2RlbFRlbXBsYXRlKVxyXG4gICAgICB9XHJcbiAgICB9XHJcbiAgICBzdHJpbmcgPSBzdHJpbmcucmVwbGFjZSgne3ttb2RlbDonICsgbW9kZWwgKyAnfX0nLCAnJylcclxuICAgIHN0cmluZyA9IHN0cmluZy5yZXBsYWNlKCd7ey9tb2RlbDonICsgbW9kZWwgKyAnfX0nLCAnJylcclxuICB9KVxyXG4gIHJldHVybiBzdHJpbmdcclxufVxyXG4iLCJtb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uIChzdHJpbmcpIHtcclxuICB2YXIgc2VsZiA9IHRoaXNcclxuICB0aGlzLl9fc3RhdGVMaXN0X18ubWFwKGZ1bmN0aW9uIChzdGF0ZSkge1xyXG4gICAgaWYgKCFzZWxmW3N0YXRlXSkge1xyXG4gICAgICB2YXIgZiA9ICdcXFxce1xcXFx7XFxcXD8nICsgc3RhdGUgKyAnXFxcXH1cXFxcfSdcclxuICAgICAgdmFyIGIgPSAnXFxcXHtcXFxce1xcXFwvJyArIHN0YXRlICsgJ1xcXFx9XFxcXH0nXHJcbiAgICAgIC8vIHZhciByZWd4ID0gJyg/PD0nICsgZiArICcpKC4qPykoPz0nICsgYiArICcpJ1xyXG4gICAgICAvLyAqKiBvbGQgYnJvd3NlciBkb2VzIG5vdCBzdXBwb3J0IHBvc2l0aXZlIGxvb2sgYmVoaW5kICoqXHJcbiAgICAgIHZhciByZWd4ID0gJygnICsgZiArICcpKC4qPykoPz0nICsgYiArICcpJ1xyXG4gICAgICB2YXIgcmUgPSBuZXcgUmVnRXhwKHJlZ3gpXHJcbiAgICAgIHZhciBpc0NvbmRpdGlvbmFsID0gcmUudGVzdChzdHJpbmcpXHJcbiAgICAgIHZhciBtYXRjaCA9IHN0cmluZy5tYXRjaChyZSlcclxuICAgICAgaWYgKGlzQ29uZGl0aW9uYWwgJiYgbWF0Y2gpIHtcclxuICAgICAgICBzdHJpbmcgPSBzdHJpbmcucmVwbGFjZShtYXRjaFsyXSwgJycpXHJcbiAgICAgIH1cclxuICAgIH1cclxuICAgIHN0cmluZyA9IHN0cmluZy5yZXBsYWNlKCd7ez8nICsgc3RhdGUgKyAnfX0nLCAnJylcclxuICAgIHN0cmluZyA9IHN0cmluZy5yZXBsYWNlKCd7ey8nICsgc3RhdGUgKyAnfX0nLCAnJylcclxuICB9KVxyXG4gIHJldHVybiBzdHJpbmdcclxufVxyXG4iLCJ2YXIgc2V0U3RhdGUgPSByZXF1aXJlKCcuL2dlbkVsZW1lbnQnKS5zZXRTdGF0ZVxyXG52YXIgdG1wbEhhbmRsZXIgPSByZXF1aXJlKCcuL3RtcGxIYW5kbGVyJylcclxudmFyIHByb2Nlc3NFdmVudCA9IHJlcXVpcmUoJy4vcHJvY2Vzc0V2ZW50JylcclxudmFyIGdldElkID0gcmVxdWlyZSgnLi4vdXRpbHMnKS5nZXRJZFxyXG52YXIgdGVzdEV2ZW50ID0gcmVxdWlyZSgnLi4vdXRpbHMnKS50ZXN0RXZlbnRcclxudmFyIGNvbXBvbmVudFBhcnNlID0gcmVxdWlyZSgnLi9jb21wb25lbnRQYXJzZScpXHJcbnZhciBtb2RlbFBhcnNlID0gcmVxdWlyZSgnLi9tb2RlbFBhcnNlJylcclxudmFyIG5vZGVzVmlzaWJpbGl0eSA9IHJlcXVpcmUoJy4vbm9kZXNWaXNpYmlsaXR5JylcclxudmFyIGNoZWNrTm9kZUF2YWlsYWJpbGl0eSA9IHJlcXVpcmUoJy4uL3V0aWxzJykuY2hlY2tOb2RlQXZhaWxhYmlsaXR5XHJcblxyXG52YXIgcmVuZGVyU3ViID0gZnVuY3Rpb24gKGMsIGNOYW1lLCBub2RlKSB7XHJcbiAgYy5zdHViUmVuZGVyKHRoaXMuX19jb21wb25lbnRTdHViX19bY05hbWVdLCBub2RlKVxyXG59XHJcblxyXG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uIChzdHViKSB7XHJcbiAgdmFyIHNlbGYgPSB0aGlzXHJcbiAgdmFyIGVsXHJcbiAgdmFyIHRwbFxyXG4gIGlmICh0eXBlb2YgdGhpcy5iYXNlID09PSAnc3RyaW5nJykge1xyXG4gICAgdGhpcy5fX3N0YXRlTGlzdF9fID0gdGhpcy5fX3N0YXRlTGlzdF9fIHx8IFtdXHJcbiAgICB0aGlzLl9fbW9kZWxMaXN0X18gPSB0aGlzLl9fbW9kZWxMaXN0X18gfHwgW11cclxuICAgIHRoaXMuX19jb21wb25lbnRMaXN0X18gPSB0aGlzLl9fY29tcG9uZW50TGlzdF9fIHx8IFtdXHJcbiAgICB0aGlzLl9fY29tcG9uZW50U3R1Yl9fID0gdGhpcy5fX2NvbXBvbmVudFN0dWJfXyB8fCB7fVxyXG4gICAgdHBsID0gdG1wbEhhbmRsZXIuY2FsbCh0aGlzLCBmdW5jdGlvbiAoc3RhdGUpIHtcclxuICAgICAgaWYgKCF+c2VsZi5fX3N0YXRlTGlzdF9fLmluZGV4T2Yoc3RhdGUpKSBzZWxmLl9fc3RhdGVMaXN0X18gPSBzZWxmLl9fc3RhdGVMaXN0X18uY29uY2F0KHN0YXRlKVxyXG4gICAgfSlcclxuICAgIHRwbCA9IGNvbXBvbmVudFBhcnNlLmNhbGwodGhpcywgdHBsKVxyXG4gICAgdHBsID0gbW9kZWxQYXJzZS5jYWxsKHRoaXMsIHRwbClcclxuICAgIHRwbCA9IG5vZGVzVmlzaWJpbGl0eS5jYWxsKHRoaXMsIHRwbClcclxuICAgIGlmIChzdHViKSB7XHJcbiAgICAgIHJldHVybiB0cGxcclxuICAgIH0gZWxzZSB7XHJcbiAgICAgIGVsID0gZ2V0SWQodGhpcy5lbClcclxuICAgICAgaWYgKGVsKSB7XHJcbiAgICAgICAgZWwuaW5uZXJIVE1MID0gdHBsXHJcbiAgICAgICAgdGhpcy5fX2NvbXBvbmVudExpc3RfXy5tYXAoZnVuY3Rpb24gKGNvbXBvbmVudE5hbWUpIHtcclxuICAgICAgICAgIHZhciBjb21wb25lbnQgPSBzZWxmW2NvbXBvbmVudE5hbWVdXHJcbiAgICAgICAgICBpZiAoY29tcG9uZW50KSB7XHJcbiAgICAgICAgICAgIC8vIGRvIGluaXRpYWwgY2hlY2tpbmcgb2YgdGhlIG5vZGUgYXZhaWxhYmlsaXR5XHJcbiAgICAgICAgICAgIHZhciBub2RlID0gY2hlY2tOb2RlQXZhaWxhYmlsaXR5KGNvbXBvbmVudCwgY29tcG9uZW50TmFtZSwgcmVuZGVyU3ViLmJpbmQoc2VsZikpXHJcbiAgICAgICAgICAgIGlmIChub2RlKSByZW5kZXJTdWIuY2FsbChzZWxmLCBjb21wb25lbnQsIGNvbXBvbmVudE5hbWUsIG5vZGUpXHJcbiAgICAgICAgICB9XHJcbiAgICAgICAgfSlcclxuICAgICAgICBzZXRTdGF0ZS5jYWxsKHRoaXMpXHJcbiAgICAgICAgdGVzdEV2ZW50KHRwbCkgJiYgcHJvY2Vzc0V2ZW50LmNhbGwodGhpcywgZWwpXHJcbiAgICAgIH1cclxuICAgIH1cclxuICB9XHJcbn1cclxuIiwidmFyIGxvb3BDaGlsZHMgPSByZXF1aXJlKCcuLi91dGlscycpLmxvb3BDaGlsZHNcclxuXHJcbnZhciBuZXh0ID0gZnVuY3Rpb24gKGksIGMsIHJlbSkge1xyXG4gIHZhciBoYXNrXHJcbiAgdmFyIGV2dE5hbWVcclxuICB2YXIgaGFuZGxlclxyXG4gIHZhciBoYW5kbGVyQXJnc1xyXG4gIHZhciBpc0hhbmRsZXJcclxuICB2YXIgYXJndlxyXG4gIHZhciB2XHJcbiAgdmFyIGhcclxuICB2YXIgYXR0cyA9IGMuYXR0cmlidXRlc1xyXG5cclxuICBpZiAoaSA8IGF0dHMubGVuZ3RoKSB7XHJcbiAgICBoYXNrID0gL15rLS8udGVzdChhdHRzW2ldLm5vZGVOYW1lKVxyXG4gICAgaWYgKGhhc2spIHtcclxuICAgICAgZXZ0TmFtZSA9IGF0dHNbaV0ubm9kZU5hbWUucmVwbGFjZSgvXlteLV0rLS8sICcnKVxyXG4gICAgICBoYW5kbGVyID0gYXR0c1tpXS5ub2RlVmFsdWUubWF0Y2goL1thLXpBLVpdKyg/IVteKF0qXFwpKS8pWzBdXHJcbiAgICAgIGggPSBhdHRzW2ldLm5vZGVWYWx1ZS5tYXRjaCgvXFwoKFtee31dKylcXCkvKVxyXG4gICAgICBoYW5kbGVyQXJncyA9IGggPyBoWzFdIDogJydcclxuICAgICAgaXNIYW5kbGVyID0gdGhpc1toYW5kbGVyXVxyXG4gICAgICBpZiAodHlwZW9mIGlzSGFuZGxlciA9PT0gJ2Z1bmN0aW9uJykge1xyXG4gICAgICAgIHJlbS5wdXNoKGF0dHNbaV0ubm9kZU5hbWUpXHJcbiAgICAgICAgYXJndiA9IFtdXHJcbiAgICAgICAgdiA9IGhhbmRsZXJBcmdzLnNwbGl0KCcsJykuZmlsdGVyKGZ1bmN0aW9uIChmKSB7IHJldHVybiBmICE9PSAnJyB9KVxyXG4gICAgICAgIGlmICh2Lmxlbmd0aCkgdi5tYXAoZnVuY3Rpb24gKHYpIHsgYXJndi5wdXNoKHYpIH0pXHJcbiAgICAgICAgYy5hZGRFdmVudExpc3RlbmVyKGV2dE5hbWUsIGlzSGFuZGxlci5iaW5kLmFwcGx5KGlzSGFuZGxlci5iaW5kKHRoaXMpLCBbY10uY29uY2F0KGFyZ3YpKSwgZmFsc2UpXHJcbiAgICAgIH1cclxuICAgIH1cclxuICAgIGkrK1xyXG4gICAgbmV4dC5hcHBseSh0aGlzLCBbIGksIGMsIHJlbSBdKVxyXG4gIH0gZWxzZSB7XHJcbiAgICByZW0ubWFwKGZ1bmN0aW9uIChmKSB7IGMucmVtb3ZlQXR0cmlidXRlKGYpIH0pXHJcbiAgfVxyXG59XHJcblxyXG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uIChrTm9kZSkge1xyXG4gIHZhciBzZWxmID0gdGhpc1xyXG4gIHZhciBsaXN0S25vZGVDaGlsZCA9IFtdXHJcbiAgdmFyIHJlbSA9IFtdXHJcbiAgbG9vcENoaWxkcyhsaXN0S25vZGVDaGlsZCwga05vZGUpXHJcbiAgbGlzdEtub2RlQ2hpbGQubWFwKGZ1bmN0aW9uIChjKSB7XHJcbiAgICBpZiAoYy5ub2RlVHlwZSA9PT0gMSAmJiBjLmhhc0F0dHJpYnV0ZXMoKSkge1xyXG4gICAgICBuZXh0LmFwcGx5KHNlbGYsIFsgMCwgYywgcmVtIF0pXHJcbiAgICB9XHJcbiAgfSlcclxuICBsaXN0S25vZGVDaGlsZCA9IFtdXHJcbn1cclxuIiwibW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbiAoc3RyKSB7XHJcbiAgdmFyIHJlcyA9IHN0ci5tYXRjaCgvXFwuKlxcLi9nKVxyXG4gIHZhciByZXN1bHRcclxuICBpZiAocmVzICYmIHJlcy5sZW5ndGggPiAwKSB7XHJcbiAgICByZXR1cm4gc3RyLnNwbGl0KCcuJylcclxuICB9XHJcbiAgcmV0dXJuIHJlc3VsdFxyXG59XHJcbiIsIi8vIGZ1bmN0aW9uIHRvIHJlc29sdmUgdGVybmFyeSBvcGVyYXRpb25cclxuXHJcbmZ1bmN0aW9uIHRlc3QgKHN0cikge1xyXG4gIGlmIChzdHIgPT09ICdcXCdcXCcnIHx8IHN0ciA9PT0gJ1wiXCInKSB7IHJldHVybiAnJyB9XHJcbiAgcmV0dXJuIHN0clxyXG59XHJcblxyXG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uIChpbnB1dCkge1xyXG4gIGlmIChpbnB1dC5tYXRjaCgvKFteP10qKVxcPyhbXjpdKik6KFteO10qKXwoXFxzKj1cXHMqKVteO10qL2cpKSB7XHJcbiAgICB2YXIgdCA9IGlucHV0LnNwbGl0KCc/JylcclxuICAgIHZhciBjb25kaXRpb24gPSB0WzBdXHJcbiAgICB2YXIgbGVmdEhhbmQgPSB0WzFdLnNwbGl0KCc6JylbMF1cclxuICAgIHZhciByaWdodEhhbmQgPSB0WzFdLnNwbGl0KCc6JylbMV1cclxuXHJcbiAgICAvLyBjaGVjayB0aGUgY29uZGl0aW9uIGZ1bGZpbGxtZW50XHJcbiAgICBpZiAodGhpc1tjb25kaXRpb25dKSB7XHJcbiAgICAgIHJldHVybiB7XHJcbiAgICAgICAgdmFsdWU6IHRlc3QobGVmdEhhbmQpLFxyXG4gICAgICAgIHN0YXRlOiBjb25kaXRpb25cclxuICAgICAgfVxyXG4gICAgfSBlbHNlIHtcclxuICAgICAgcmV0dXJuIHtcclxuICAgICAgICB2YWx1ZTogdGVzdChyaWdodEhhbmQpLFxyXG4gICAgICAgIHN0YXRlOiBjb25kaXRpb25cclxuICAgICAgfVxyXG4gICAgfVxyXG4gIH0gZWxzZSByZXR1cm4gZmFsc2VcclxufVxyXG4iLCJ2YXIgc3RySW50ZXJwcmV0ZXIgPSByZXF1aXJlKCcuL3N0ckludGVycHJldGVyJylcclxudmFyIHRlcm5hcnlPcHMgPSByZXF1aXJlKCcuL3Rlcm5hcnlPcHMnKVxyXG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uICh1cGRhdGVTdGF0ZUxpc3QpIHtcclxuICB2YXIgc2VsZiA9IHRoaXNcclxuICB2YXIgc3RyID0gdGhpcy5iYXNlXHJcbiAgdmFyIGFyclByb3BzID0gc3RyLm1hdGNoKC97eyhbXnt9XSspfX0vZylcclxuICBpZiAoYXJyUHJvcHMgJiYgYXJyUHJvcHMubGVuZ3RoKSB7XHJcbiAgICBhcnJQcm9wcy5tYXAoZnVuY3Rpb24gKHMpIHtcclxuICAgICAgdmFyIHJlcCA9IHMucmVwbGFjZSgve3soW157fV0rKX19L2csICckMScpXHJcbiAgICAgIHZhciBpc09iamVjdE5vdGF0aW9uID0gc3RySW50ZXJwcmV0ZXIocmVwKVxyXG4gICAgICB2YXIgaXNUZXJuYXJ5ID0gdGVybmFyeU9wcy5jYWxsKHNlbGYsIHJlcClcclxuICAgICAgaWYgKCFpc09iamVjdE5vdGF0aW9uKSB7XHJcbiAgICAgICAgaWYgKHNlbGZbcmVwXSAhPT0gdW5kZWZpbmVkKSB7XHJcbiAgICAgICAgICB1cGRhdGVTdGF0ZUxpc3QocmVwKVxyXG4gICAgICAgICAgc3RyID0gc3RyLnJlcGxhY2UoJ3t7JyArIHJlcCArICd9fScsIHNlbGZbcmVwXSlcclxuICAgICAgICB9IGVsc2UgaWYgKGlzVGVybmFyeSkge1xyXG4gICAgICAgICAgdXBkYXRlU3RhdGVMaXN0KGlzVGVybmFyeS5zdGF0ZSlcclxuICAgICAgICAgIHN0ciA9IHN0ci5yZXBsYWNlKCd7eycgKyByZXAgKyAnfX0nLCBpc1Rlcm5hcnkudmFsdWUpXHJcbiAgICAgICAgfVxyXG4gICAgICB9IGVsc2Uge1xyXG4gICAgICAgIHVwZGF0ZVN0YXRlTGlzdChyZXApXHJcbiAgICAgICAgc3RyID0gc3RyLnJlcGxhY2UoJ3t7JyArIHJlcCArICd9fScsIHNlbGZbaXNPYmplY3ROb3RhdGlvblswXV1baXNPYmplY3ROb3RhdGlvblsxXV0pXHJcbiAgICAgIH1cclxuICAgICAgLy8gcmVzb2x2ZSBub2RlVmlzaWJpbGl0eVxyXG4gICAgICBpZiAocmVwLm1hdGNoKC9eXFw/L2cpKSB7XHJcbiAgICAgICAgdXBkYXRlU3RhdGVMaXN0KHJlcC5yZXBsYWNlKCc/JywgJycpKVxyXG4gICAgICB9XHJcbiAgICAgIC8vIHJlc29sdmUgbW9kZWxcclxuICAgICAgaWYgKHJlcC5tYXRjaCgvXm1vZGVsOi9nKSkge1xyXG4gICAgICAgIHZhciBtb2RlbFJlcCA9IHJlcC5yZXBsYWNlKCdtb2RlbDonLCAnJylcclxuICAgICAgICBpZiAoIX5zZWxmLl9fbW9kZWxMaXN0X18uaW5kZXhPZihtb2RlbFJlcCkpIHsgc2VsZi5fX21vZGVsTGlzdF9fLnB1c2gobW9kZWxSZXApIH1cclxuICAgICAgfVxyXG4gICAgICAvLyByZXNvbHZlIGNvbXBvbmVudFxyXG4gICAgICBpZiAocmVwLm1hdGNoKC9eY29tcG9uZW50Oi9nKSkge1xyXG4gICAgICAgIHZhciBjb21wb25lbnRSZXAgPSByZXAucmVwbGFjZSgnY29tcG9uZW50OicsICcnKVxyXG4gICAgICAgIGlmICghfnNlbGYuX19jb21wb25lbnRMaXN0X18uaW5kZXhPZihjb21wb25lbnRSZXApKSB7IHNlbGYuX19jb21wb25lbnRMaXN0X18ucHVzaChjb21wb25lbnRSZXApIH1cclxuICAgICAgfVxyXG4gICAgfSlcclxuICB9XHJcbiAgcmV0dXJuIHN0clxyXG59XHJcbiIsIid1c2Ugc3RyaWN0J1xyXG4vKipcclxuICogS2VldGpzIHY0LjAuMCBBbHBoYSByZWxlYXNlOiBodHRwczovL2dpdGh1Yi5jb20va2VldGpzL2tlZXQuanNcclxuICogTWluaW1hbGlzdCB2aWV3IGxheWVyIGZvciB0aGUgd2ViXHJcbiAqXHJcbiAqIDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PCBLZWV0anMgPj4+Pj4+Pj4+Pj4+Pj4+Pj4+Pj4+Pj4+Pj4+Pj4+XHJcbiAqXHJcbiAqIENvcHlyaWdodCAyMDE4LCBTaGFocnVsIE5pemFtIFNlbGFtYXRcclxuICogUmVsZWFzZWQgdW5kZXIgdGhlIE1JVCBMaWNlbnNlLlxyXG4gKi9cclxuXHJcbnZhciBwYXJzZVN0ciA9IHJlcXVpcmUoJy4vY29tcG9uZW50cy9wYXJzZVN0cicpXHJcbnZhciBzZXRTdGF0ZSA9IHJlcXVpcmUoJy4vY29tcG9uZW50cy9nZW5FbGVtZW50Jykuc2V0U3RhdGVcclxudmFyIGdlbkVsZW1lbnQgPSByZXF1aXJlKCcuL2NvbXBvbmVudHMvZ2VuRWxlbWVudCcpLmdlbkVsZW1lbnRcclxudmFyIHByb2Nlc3NFdmVudCA9IHJlcXVpcmUoJy4vY29tcG9uZW50cy9wcm9jZXNzRXZlbnQnKVxyXG52YXIgZ2V0SWQgPSByZXF1aXJlKCcuL3V0aWxzJykuZ2V0SWRcclxudmFyIHRlc3RFdmVudCA9IHJlcXVpcmUoJy4vdXRpbHMnKS50ZXN0RXZlbnRcclxudmFyIGxvb3BDaGlsZHMgPSByZXF1aXJlKCcuL3V0aWxzJykubG9vcENoaWxkc1xyXG52YXIgYXNzZXJ0ID0gcmVxdWlyZSgnLi91dGlscycpLmFzc2VydFxyXG5cclxuLyoqXHJcbiAqIEBkZXNjcmlwdGlvblxyXG4gKiBUaGUgbWFpbiBjb25zdHJ1Y3RvciBvZiBLZWV0XHJcbiAqXHJcbiAqIEJhc2ljIFVzYWdlIDotXHJcbiAqXHJcbiAqICAgIGNvbnN0IEFwcCBleHRlbmRzIEtlZXQge31cclxuICogICAgY29uc3QgYXBwID0gbmV3IEFwcCgpXHJcbiAqICAgIGFwcC5tb3VudCgnaGVsbG8gd29ybGQnKS5saW5rKCdhcHAnKVxyXG4gKlxyXG4gKi9cclxuZnVuY3Rpb24gS2VldCAoKSB7fVxyXG5cclxuS2VldC5wcm90b3R5cGUubW91bnQgPSBmdW5jdGlvbiAoaW5zdGFuY2UpIHtcclxuICB2YXIgYmFzZVxyXG4gIHZhciBmcmFnID0gW11cclxuICAvLyBCZWZvcmUgd2UgYmVnaW4gdG8gcGFyc2UgYW4gaW5zdGFuY2UsIGRvIGEgcnVuLWRvd24gY2hlY2tzXHJcbiAgLy8gdG8gY2xlYW4gdXAgYmFjay10aWNrIHN0cmluZyB3aGljaCB1c3VhbGx5IGhhcyBsaW5lIHNwYWNpbmcuXHJcbiAgaWYgKHR5cGVvZiBpbnN0YW5jZSA9PT0gJ3N0cmluZycpIHtcclxuICAgIGJhc2UgPSBpbnN0YW5jZS50cmltKCkucmVwbGFjZSgvXFxzKy9nLCAnICcpXHJcbiAgLy8gSWYgaW5zdGFuY2UgaXMgYSBodG1sIGVsZW1lbnQgKHVzdWFsbHkgdXNpbmcgdGVtcGxhdGUgbGl0ZXJhbHMpLFxyXG4gIC8vIGNvbnZlcnQgaXQgYmFjayB0byBzdHJpbmcuXHJcbiAgfSBlbHNlIGlmICh0eXBlb2YgaW5zdGFuY2UgPT09ICdvYmplY3QnICYmIGluc3RhbmNlWydub2RlVHlwZSddKSB7XHJcbiAgICBpZiAoaW5zdGFuY2VbJ25vZGVUeXBlJ10gPT09IDEpIHtcclxuICAgICAgYmFzZSA9IGluc3RhbmNlLm91dGVySFRNTC50b1N0cmluZygpXHJcbiAgICB9IGVsc2UgaWYgKGluc3RhbmNlWydub2RlVHlwZSddID09PSAxMSB8fCBpbnN0YW5jZVsnbm9kZVR5cGUnXSA9PT0gMykge1xyXG4gICAgICB2YXIgc2VyaWFsaXplciA9IG5ldyBYTUxTZXJpYWxpemVyKClcclxuICAgICAgYmFzZSA9IHNlcmlhbGl6ZXIuc2VyaWFsaXplVG9TdHJpbmcoaW5zdGFuY2UpXHJcbiAgICB9IGVsc2Uge1xyXG4gICAgICBhc3NlcnQoZmFsc2UsICdVbmFibGUgdG8gcGFyc2UgaW5zdGFuY2UsIHVua25vd24gdHlwZS4nKVxyXG4gICAgfVxyXG4gICAgLy8gY2xlYW4gdXAgZG9jdW1lbnQgY3JlYXRpb24gZnJvbSBwb3RlbnRpYWwgbWVtb3J5IGxlYWtzXHJcbiAgICBsb29wQ2hpbGRzKGZyYWcsIGluc3RhbmNlKVxyXG4gICAgZnJhZy5tYXAoZnVuY3Rpb24gKGZyYWdtZW50KSB7IGZyYWdtZW50LnJlbW92ZSgpIH0pXHJcbiAgfSBlbHNlIHtcclxuICAgIGFzc2VydCh0eXBlb2YgaW5zdGFuY2UgPT09ICdzdHJpbmcnIHx8IHR5cGVvZiBpbnN0YW5jZSA9PT0gJ29iamVjdCcsICdQYXJhbWV0ZXIgaXMgbm90IGEgc3RyaW5nIG9yIGEgaHRtbCBlbGVtZW50LicpXHJcbiAgfVxyXG4gIC8vIHdlIHN0b3JlIHRoZSBwcmlzdGluZSBpbnN0YW5jZSBpbiBDb21wb25lbnQuYmFzZVxyXG4gIHRoaXMuYmFzZSA9IGJhc2VcclxuICByZXR1cm4gdGhpc1xyXG59XHJcblxyXG5LZWV0LnByb3RvdHlwZS5mbHVzaCA9IGZ1bmN0aW9uIChpbnN0YW5jZSkge1xyXG4gIC8vIEN1c3RvbSBtZXRob2QgdG8gY2xlYW4gdXAgdGhlIGNvbXBvbmVudCBET00gdHJlZVxyXG4gIC8vIHVzZWZ1bCBpZiB3ZSBuZWVkIHRvIGRvIGNsZWFuIHVwIHJlcmVuZGVyLlxyXG4gIHZhciBlbCA9IGluc3RhbmNlIHx8IHRoaXMuZWxcclxuICB2YXIgZWxlID0gZ2V0SWQoZWwpXHJcbiAgaWYgKGVsZSkgZWxlLmlubmVySFRNTCA9ICcnXHJcbiAgcmV0dXJuIHRoaXNcclxufVxyXG5cclxuS2VldC5wcm90b3R5cGUubGluayA9IGZ1bmN0aW9uIChpZCkge1xyXG4gIC8vIFRoZSB0YXJnZXQgRE9NIHdoZXJlIHRoZSByZW5kZXJpbmcgd2lsbCB0b29rIHBsYWNlLlxyXG4gIC8vIFdlIGNvdWxkIGFsc28gYXBwbHkgbGlmZS1jeWNsZSBtZXRob2QgYmVmb3JlIHRoZVxyXG4gIC8vIHJlbmRlciBoYXBwZW4uXHJcbiAgaWYgKCFpZCkgYXNzZXJ0KGlkLCAnTm8gaWQgaXMgZ2l2ZW4gYXMgcGFyYW1ldGVyLicpXHJcbiAgdGhpcy5lbCA9IGlkXHJcbiAgaWYgKHRoaXMuY29tcG9uZW50V2lsbE1vdW50ICYmIHR5cGVvZiB0aGlzLmNvbXBvbmVudFdpbGxNb3VudCA9PT0gJ2Z1bmN0aW9uJykge1xyXG4gICAgdGhpcy5jb21wb25lbnRXaWxsTW91bnQoKVxyXG4gIH1cclxuICB0aGlzLnJlbmRlcigpXHJcbiAgcmV0dXJuIHRoaXNcclxufVxyXG5cclxuS2VldC5wcm90b3R5cGUucmVuZGVyID0gZnVuY3Rpb24gKHN0dWIpIHtcclxuICBpZiAoc3R1Yikge1xyXG4gICAgcmV0dXJuIHBhcnNlU3RyLmNhbGwodGhpcywgc3R1YilcclxuICB9IGVsc2Uge1xyXG4gICAgLy8gUmVuZGVyIHRoaXMgY29tcG9uZW50IHRvIHRoZSB0YXJnZXQgRE9NXHJcbiAgICBwYXJzZVN0ci5jYWxsKHRoaXMpXHJcbiAgICAvLyBzaW5jZSBjb21wb25lbnQgYWxyZWFkeSByZW5kZXJlZCwgdHJpZ2dlciBpdHMgbGlmZS1jeWNsZSBtZXRob2RcclxuICAgIGlmICh0aGlzLmNvbXBvbmVudERpZE1vdW50ICYmIHR5cGVvZiB0aGlzLmNvbXBvbmVudERpZE1vdW50ID09PSAnZnVuY3Rpb24nKSB7XHJcbiAgICAgIHRoaXMuY29tcG9uZW50RGlkTW91bnQoKVxyXG4gICAgfVxyXG4gICAgcmV0dXJuIHRoaXNcclxuICB9XHJcbn1cclxuXHJcbktlZXQucHJvdG90eXBlLmNsdXN0ZXIgPSBmdW5jdGlvbiAoKSB7XHJcbiAgLy8gQ2hhaW4gbWV0aG9kIHRvIHJ1biBleHRlcm5hbCBmdW5jdGlvbihzKSwgdGhpcyBiYXNpY2FsbHkgc2VydmVcclxuICAvLyBhcyBhbiBpbml0aWFsaXplciBmb3IgYWxsIGNoaWxkIGNvbXBvbmVudHMgd2l0aGluIHRoZSBpbnN0YW5jZSB0cmVlXHJcbiAgdmFyIGFyZ3MgPSBbXS5zbGljZS5jYWxsKGFyZ3VtZW50cylcclxuICBpZiAoYXJncy5sZW5ndGggPiAwKSB7XHJcbiAgICBhcmdzLm1hcChmdW5jdGlvbiAoZikge1xyXG4gICAgICBpZiAodHlwZW9mIGYgPT09ICdmdW5jdGlvbicpIGYoKVxyXG4gICAgfSlcclxuICB9XHJcbn1cclxuXHJcbktlZXQucHJvdG90eXBlLnN0dWJSZW5kZXIgPSBmdW5jdGlvbiAodHBsLCBub2RlKSB7XHJcbiAgLy8gc3ViLWNvbXBvbmVudCByZW5kZXJpbmdcclxuICBzZXRTdGF0ZS5jYWxsKHRoaXMpXHJcbiAgdGVzdEV2ZW50KHRwbCkgJiYgcHJvY2Vzc0V2ZW50LmNhbGwodGhpcywgbm9kZSlcclxuICAvLyBzaW5jZSBjb21wb25lbnQgYWxyZWFkeSByZW5kZXJlZCwgdHJpZ2dlciBpdHMgbGlmZS1jeWNsZSBtZXRob2RcclxuICBpZiAodGhpcy5jb21wb25lbnREaWRNb3VudCAmJiB0eXBlb2YgdGhpcy5jb21wb25lbnREaWRNb3VudCA9PT0gJ2Z1bmN0aW9uJykge1xyXG4gICAgdGhpcy5jb21wb25lbnREaWRNb3VudCgpXHJcbiAgfVxyXG59XHJcblxyXG5LZWV0LnByb3RvdHlwZS5jYWxsQmF0Y2hQb29sVXBkYXRlID0gZnVuY3Rpb24gKCkge1xyXG4gIC8vIGZvcmNlIGNvbXBvbmVudCB0byB1cGRhdGUsIGlmIGFueSBzdGF0ZSAvIG5vbi1zdGF0ZVxyXG4gIC8vIHZhbHVlIGNoYW5nZWQgRE9NIGRpZmZpbmcgd2lsbCBvY2N1clxyXG4gIGdlbkVsZW1lbnQuY2FsbCh0aGlzLCB0cnVlKVxyXG59XHJcblxyXG5tb2R1bGUuZXhwb3J0cyA9IEtlZXRcclxuIiwiJ3VzZSBzdHJpY3QnO1xuXG52YXIgcmFuZ2U7IC8vIENyZWF0ZSBhIHJhbmdlIG9iamVjdCBmb3IgZWZmaWNlbnRseSByZW5kZXJpbmcgc3RyaW5ncyB0byBlbGVtZW50cy5cbnZhciBOU19YSFRNTCA9ICdodHRwOi8vd3d3LnczLm9yZy8xOTk5L3hodG1sJztcblxudmFyIGRvYyA9IHR5cGVvZiBkb2N1bWVudCA9PT0gJ3VuZGVmaW5lZCcgPyB1bmRlZmluZWQgOiBkb2N1bWVudDtcblxudmFyIHRlc3RFbCA9IGRvYyA/XG4gICAgZG9jLmJvZHkgfHwgZG9jLmNyZWF0ZUVsZW1lbnQoJ2RpdicpIDpcbiAgICB7fTtcblxuLy8gRml4ZXMgPGh0dHBzOi8vZ2l0aHViLmNvbS9wYXRyaWNrLXN0ZWVsZS1pZGVtL21vcnBoZG9tL2lzc3Vlcy8zMj5cbi8vIChJRTcrIHN1cHBvcnQpIDw9SUU3IGRvZXMgbm90IHN1cHBvcnQgZWwuaGFzQXR0cmlidXRlKG5hbWUpXG52YXIgYWN0dWFsSGFzQXR0cmlidXRlTlM7XG5cbmlmICh0ZXN0RWwuaGFzQXR0cmlidXRlTlMpIHtcbiAgICBhY3R1YWxIYXNBdHRyaWJ1dGVOUyA9IGZ1bmN0aW9uKGVsLCBuYW1lc3BhY2VVUkksIG5hbWUpIHtcbiAgICAgICAgcmV0dXJuIGVsLmhhc0F0dHJpYnV0ZU5TKG5hbWVzcGFjZVVSSSwgbmFtZSk7XG4gICAgfTtcbn0gZWxzZSBpZiAodGVzdEVsLmhhc0F0dHJpYnV0ZSkge1xuICAgIGFjdHVhbEhhc0F0dHJpYnV0ZU5TID0gZnVuY3Rpb24oZWwsIG5hbWVzcGFjZVVSSSwgbmFtZSkge1xuICAgICAgICByZXR1cm4gZWwuaGFzQXR0cmlidXRlKG5hbWUpO1xuICAgIH07XG59IGVsc2Uge1xuICAgIGFjdHVhbEhhc0F0dHJpYnV0ZU5TID0gZnVuY3Rpb24oZWwsIG5hbWVzcGFjZVVSSSwgbmFtZSkge1xuICAgICAgICByZXR1cm4gZWwuZ2V0QXR0cmlidXRlTm9kZShuYW1lc3BhY2VVUkksIG5hbWUpICE9IG51bGw7XG4gICAgfTtcbn1cblxudmFyIGhhc0F0dHJpYnV0ZU5TID0gYWN0dWFsSGFzQXR0cmlidXRlTlM7XG5cblxuZnVuY3Rpb24gdG9FbGVtZW50KHN0cikge1xuICAgIGlmICghcmFuZ2UgJiYgZG9jLmNyZWF0ZVJhbmdlKSB7XG4gICAgICAgIHJhbmdlID0gZG9jLmNyZWF0ZVJhbmdlKCk7XG4gICAgICAgIHJhbmdlLnNlbGVjdE5vZGUoZG9jLmJvZHkpO1xuICAgIH1cblxuICAgIHZhciBmcmFnbWVudDtcbiAgICBpZiAocmFuZ2UgJiYgcmFuZ2UuY3JlYXRlQ29udGV4dHVhbEZyYWdtZW50KSB7XG4gICAgICAgIGZyYWdtZW50ID0gcmFuZ2UuY3JlYXRlQ29udGV4dHVhbEZyYWdtZW50KHN0cik7XG4gICAgfSBlbHNlIHtcbiAgICAgICAgZnJhZ21lbnQgPSBkb2MuY3JlYXRlRWxlbWVudCgnYm9keScpO1xuICAgICAgICBmcmFnbWVudC5pbm5lckhUTUwgPSBzdHI7XG4gICAgfVxuICAgIHJldHVybiBmcmFnbWVudC5jaGlsZE5vZGVzWzBdO1xufVxuXG4vKipcbiAqIFJldHVybnMgdHJ1ZSBpZiB0d28gbm9kZSdzIG5hbWVzIGFyZSB0aGUgc2FtZS5cbiAqXG4gKiBOT1RFOiBXZSBkb24ndCBib3RoZXIgY2hlY2tpbmcgYG5hbWVzcGFjZVVSSWAgYmVjYXVzZSB5b3Ugd2lsbCBuZXZlciBmaW5kIHR3byBIVE1MIGVsZW1lbnRzIHdpdGggdGhlIHNhbWVcbiAqICAgICAgIG5vZGVOYW1lIGFuZCBkaWZmZXJlbnQgbmFtZXNwYWNlIFVSSXMuXG4gKlxuICogQHBhcmFtIHtFbGVtZW50fSBhXG4gKiBAcGFyYW0ge0VsZW1lbnR9IGIgVGhlIHRhcmdldCBlbGVtZW50XG4gKiBAcmV0dXJuIHtib29sZWFufVxuICovXG5mdW5jdGlvbiBjb21wYXJlTm9kZU5hbWVzKGZyb21FbCwgdG9FbCkge1xuICAgIHZhciBmcm9tTm9kZU5hbWUgPSBmcm9tRWwubm9kZU5hbWU7XG4gICAgdmFyIHRvTm9kZU5hbWUgPSB0b0VsLm5vZGVOYW1lO1xuXG4gICAgaWYgKGZyb21Ob2RlTmFtZSA9PT0gdG9Ob2RlTmFtZSkge1xuICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9XG5cbiAgICBpZiAodG9FbC5hY3R1YWxpemUgJiZcbiAgICAgICAgZnJvbU5vZGVOYW1lLmNoYXJDb2RlQXQoMCkgPCA5MSAmJiAvKiBmcm9tIHRhZyBuYW1lIGlzIHVwcGVyIGNhc2UgKi9cbiAgICAgICAgdG9Ob2RlTmFtZS5jaGFyQ29kZUF0KDApID4gOTAgLyogdGFyZ2V0IHRhZyBuYW1lIGlzIGxvd2VyIGNhc2UgKi8pIHtcbiAgICAgICAgLy8gSWYgdGhlIHRhcmdldCBlbGVtZW50IGlzIGEgdmlydHVhbCBET00gbm9kZSB0aGVuIHdlIG1heSBuZWVkIHRvIG5vcm1hbGl6ZSB0aGUgdGFnIG5hbWVcbiAgICAgICAgLy8gYmVmb3JlIGNvbXBhcmluZy4gTm9ybWFsIEhUTUwgZWxlbWVudHMgdGhhdCBhcmUgaW4gdGhlIFwiaHR0cDovL3d3dy53My5vcmcvMTk5OS94aHRtbFwiXG4gICAgICAgIC8vIGFyZSBjb252ZXJ0ZWQgdG8gdXBwZXIgY2FzZVxuICAgICAgICByZXR1cm4gZnJvbU5vZGVOYW1lID09PSB0b05vZGVOYW1lLnRvVXBwZXJDYXNlKCk7XG4gICAgfSBlbHNlIHtcbiAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cbn1cblxuLyoqXG4gKiBDcmVhdGUgYW4gZWxlbWVudCwgb3B0aW9uYWxseSB3aXRoIGEga25vd24gbmFtZXNwYWNlIFVSSS5cbiAqXG4gKiBAcGFyYW0ge3N0cmluZ30gbmFtZSB0aGUgZWxlbWVudCBuYW1lLCBlLmcuICdkaXYnIG9yICdzdmcnXG4gKiBAcGFyYW0ge3N0cmluZ30gW25hbWVzcGFjZVVSSV0gdGhlIGVsZW1lbnQncyBuYW1lc3BhY2UgVVJJLCBpLmUuIHRoZSB2YWx1ZSBvZlxuICogaXRzIGB4bWxuc2AgYXR0cmlidXRlIG9yIGl0cyBpbmZlcnJlZCBuYW1lc3BhY2UuXG4gKlxuICogQHJldHVybiB7RWxlbWVudH1cbiAqL1xuZnVuY3Rpb24gY3JlYXRlRWxlbWVudE5TKG5hbWUsIG5hbWVzcGFjZVVSSSkge1xuICAgIHJldHVybiAhbmFtZXNwYWNlVVJJIHx8IG5hbWVzcGFjZVVSSSA9PT0gTlNfWEhUTUwgP1xuICAgICAgICBkb2MuY3JlYXRlRWxlbWVudChuYW1lKSA6XG4gICAgICAgIGRvYy5jcmVhdGVFbGVtZW50TlMobmFtZXNwYWNlVVJJLCBuYW1lKTtcbn1cblxuLyoqXG4gKiBDb3BpZXMgdGhlIGNoaWxkcmVuIG9mIG9uZSBET00gZWxlbWVudCB0byBhbm90aGVyIERPTSBlbGVtZW50XG4gKi9cbmZ1bmN0aW9uIG1vdmVDaGlsZHJlbihmcm9tRWwsIHRvRWwpIHtcbiAgICB2YXIgY3VyQ2hpbGQgPSBmcm9tRWwuZmlyc3RDaGlsZDtcbiAgICB3aGlsZSAoY3VyQ2hpbGQpIHtcbiAgICAgICAgdmFyIG5leHRDaGlsZCA9IGN1ckNoaWxkLm5leHRTaWJsaW5nO1xuICAgICAgICB0b0VsLmFwcGVuZENoaWxkKGN1ckNoaWxkKTtcbiAgICAgICAgY3VyQ2hpbGQgPSBuZXh0Q2hpbGQ7XG4gICAgfVxuICAgIHJldHVybiB0b0VsO1xufVxuXG5mdW5jdGlvbiBtb3JwaEF0dHJzKGZyb21Ob2RlLCB0b05vZGUpIHtcbiAgICB2YXIgYXR0cnMgPSB0b05vZGUuYXR0cmlidXRlcztcbiAgICB2YXIgaTtcbiAgICB2YXIgYXR0cjtcbiAgICB2YXIgYXR0ck5hbWU7XG4gICAgdmFyIGF0dHJOYW1lc3BhY2VVUkk7XG4gICAgdmFyIGF0dHJWYWx1ZTtcbiAgICB2YXIgZnJvbVZhbHVlO1xuXG4gICAgZm9yIChpID0gYXR0cnMubGVuZ3RoIC0gMTsgaSA+PSAwOyAtLWkpIHtcbiAgICAgICAgYXR0ciA9IGF0dHJzW2ldO1xuICAgICAgICBhdHRyTmFtZSA9IGF0dHIubmFtZTtcbiAgICAgICAgYXR0ck5hbWVzcGFjZVVSSSA9IGF0dHIubmFtZXNwYWNlVVJJO1xuICAgICAgICBhdHRyVmFsdWUgPSBhdHRyLnZhbHVlO1xuXG4gICAgICAgIGlmIChhdHRyTmFtZXNwYWNlVVJJKSB7XG4gICAgICAgICAgICBhdHRyTmFtZSA9IGF0dHIubG9jYWxOYW1lIHx8IGF0dHJOYW1lO1xuICAgICAgICAgICAgZnJvbVZhbHVlID0gZnJvbU5vZGUuZ2V0QXR0cmlidXRlTlMoYXR0ck5hbWVzcGFjZVVSSSwgYXR0ck5hbWUpO1xuXG4gICAgICAgICAgICBpZiAoZnJvbVZhbHVlICE9PSBhdHRyVmFsdWUpIHtcbiAgICAgICAgICAgICAgICBmcm9tTm9kZS5zZXRBdHRyaWJ1dGVOUyhhdHRyTmFtZXNwYWNlVVJJLCBhdHRyTmFtZSwgYXR0clZhbHVlKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGZyb21WYWx1ZSA9IGZyb21Ob2RlLmdldEF0dHJpYnV0ZShhdHRyTmFtZSk7XG5cbiAgICAgICAgICAgIGlmIChmcm9tVmFsdWUgIT09IGF0dHJWYWx1ZSkge1xuICAgICAgICAgICAgICAgIGZyb21Ob2RlLnNldEF0dHJpYnV0ZShhdHRyTmFtZSwgYXR0clZhbHVlKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH1cblxuICAgIC8vIFJlbW92ZSBhbnkgZXh0cmEgYXR0cmlidXRlcyBmb3VuZCBvbiB0aGUgb3JpZ2luYWwgRE9NIGVsZW1lbnQgdGhhdFxuICAgIC8vIHdlcmVuJ3QgZm91bmQgb24gdGhlIHRhcmdldCBlbGVtZW50LlxuICAgIGF0dHJzID0gZnJvbU5vZGUuYXR0cmlidXRlcztcblxuICAgIGZvciAoaSA9IGF0dHJzLmxlbmd0aCAtIDE7IGkgPj0gMDsgLS1pKSB7XG4gICAgICAgIGF0dHIgPSBhdHRyc1tpXTtcbiAgICAgICAgaWYgKGF0dHIuc3BlY2lmaWVkICE9PSBmYWxzZSkge1xuICAgICAgICAgICAgYXR0ck5hbWUgPSBhdHRyLm5hbWU7XG4gICAgICAgICAgICBhdHRyTmFtZXNwYWNlVVJJID0gYXR0ci5uYW1lc3BhY2VVUkk7XG5cbiAgICAgICAgICAgIGlmIChhdHRyTmFtZXNwYWNlVVJJKSB7XG4gICAgICAgICAgICAgICAgYXR0ck5hbWUgPSBhdHRyLmxvY2FsTmFtZSB8fCBhdHRyTmFtZTtcblxuICAgICAgICAgICAgICAgIGlmICghaGFzQXR0cmlidXRlTlModG9Ob2RlLCBhdHRyTmFtZXNwYWNlVVJJLCBhdHRyTmFtZSkpIHtcbiAgICAgICAgICAgICAgICAgICAgZnJvbU5vZGUucmVtb3ZlQXR0cmlidXRlTlMoYXR0ck5hbWVzcGFjZVVSSSwgYXR0ck5hbWUpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgaWYgKCFoYXNBdHRyaWJ1dGVOUyh0b05vZGUsIG51bGwsIGF0dHJOYW1lKSkge1xuICAgICAgICAgICAgICAgICAgICBmcm9tTm9kZS5yZW1vdmVBdHRyaWJ1dGUoYXR0ck5hbWUpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH1cbn1cblxuZnVuY3Rpb24gc3luY0Jvb2xlYW5BdHRyUHJvcChmcm9tRWwsIHRvRWwsIG5hbWUpIHtcbiAgICBpZiAoZnJvbUVsW25hbWVdICE9PSB0b0VsW25hbWVdKSB7XG4gICAgICAgIGZyb21FbFtuYW1lXSA9IHRvRWxbbmFtZV07XG4gICAgICAgIGlmIChmcm9tRWxbbmFtZV0pIHtcbiAgICAgICAgICAgIGZyb21FbC5zZXRBdHRyaWJ1dGUobmFtZSwgJycpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgZnJvbUVsLnJlbW92ZUF0dHJpYnV0ZShuYW1lLCAnJyk7XG4gICAgICAgIH1cbiAgICB9XG59XG5cbnZhciBzcGVjaWFsRWxIYW5kbGVycyA9IHtcbiAgICAvKipcbiAgICAgKiBOZWVkZWQgZm9yIElFLiBBcHBhcmVudGx5IElFIGRvZXNuJ3QgdGhpbmsgdGhhdCBcInNlbGVjdGVkXCIgaXMgYW5cbiAgICAgKiBhdHRyaWJ1dGUgd2hlbiByZWFkaW5nIG92ZXIgdGhlIGF0dHJpYnV0ZXMgdXNpbmcgc2VsZWN0RWwuYXR0cmlidXRlc1xuICAgICAqL1xuICAgIE9QVElPTjogZnVuY3Rpb24oZnJvbUVsLCB0b0VsKSB7XG4gICAgICAgIHN5bmNCb29sZWFuQXR0clByb3AoZnJvbUVsLCB0b0VsLCAnc2VsZWN0ZWQnKTtcbiAgICB9LFxuICAgIC8qKlxuICAgICAqIFRoZSBcInZhbHVlXCIgYXR0cmlidXRlIGlzIHNwZWNpYWwgZm9yIHRoZSA8aW5wdXQ+IGVsZW1lbnQgc2luY2UgaXQgc2V0c1xuICAgICAqIHRoZSBpbml0aWFsIHZhbHVlLiBDaGFuZ2luZyB0aGUgXCJ2YWx1ZVwiIGF0dHJpYnV0ZSB3aXRob3V0IGNoYW5naW5nIHRoZVxuICAgICAqIFwidmFsdWVcIiBwcm9wZXJ0eSB3aWxsIGhhdmUgbm8gZWZmZWN0IHNpbmNlIGl0IGlzIG9ubHkgdXNlZCB0byB0aGUgc2V0IHRoZVxuICAgICAqIGluaXRpYWwgdmFsdWUuICBTaW1pbGFyIGZvciB0aGUgXCJjaGVja2VkXCIgYXR0cmlidXRlLCBhbmQgXCJkaXNhYmxlZFwiLlxuICAgICAqL1xuICAgIElOUFVUOiBmdW5jdGlvbihmcm9tRWwsIHRvRWwpIHtcbiAgICAgICAgc3luY0Jvb2xlYW5BdHRyUHJvcChmcm9tRWwsIHRvRWwsICdjaGVja2VkJyk7XG4gICAgICAgIHN5bmNCb29sZWFuQXR0clByb3AoZnJvbUVsLCB0b0VsLCAnZGlzYWJsZWQnKTtcblxuICAgICAgICBpZiAoZnJvbUVsLnZhbHVlICE9PSB0b0VsLnZhbHVlKSB7XG4gICAgICAgICAgICBmcm9tRWwudmFsdWUgPSB0b0VsLnZhbHVlO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKCFoYXNBdHRyaWJ1dGVOUyh0b0VsLCBudWxsLCAndmFsdWUnKSkge1xuICAgICAgICAgICAgZnJvbUVsLnJlbW92ZUF0dHJpYnV0ZSgndmFsdWUnKTtcbiAgICAgICAgfVxuICAgIH0sXG5cbiAgICBURVhUQVJFQTogZnVuY3Rpb24oZnJvbUVsLCB0b0VsKSB7XG4gICAgICAgIHZhciBuZXdWYWx1ZSA9IHRvRWwudmFsdWU7XG4gICAgICAgIGlmIChmcm9tRWwudmFsdWUgIT09IG5ld1ZhbHVlKSB7XG4gICAgICAgICAgICBmcm9tRWwudmFsdWUgPSBuZXdWYWx1ZTtcbiAgICAgICAgfVxuXG4gICAgICAgIHZhciBmaXJzdENoaWxkID0gZnJvbUVsLmZpcnN0Q2hpbGQ7XG4gICAgICAgIGlmIChmaXJzdENoaWxkKSB7XG4gICAgICAgICAgICAvLyBOZWVkZWQgZm9yIElFLiBBcHBhcmVudGx5IElFIHNldHMgdGhlIHBsYWNlaG9sZGVyIGFzIHRoZVxuICAgICAgICAgICAgLy8gbm9kZSB2YWx1ZSBhbmQgdmlzZSB2ZXJzYS4gVGhpcyBpZ25vcmVzIGFuIGVtcHR5IHVwZGF0ZS5cbiAgICAgICAgICAgIHZhciBvbGRWYWx1ZSA9IGZpcnN0Q2hpbGQubm9kZVZhbHVlO1xuXG4gICAgICAgICAgICBpZiAob2xkVmFsdWUgPT0gbmV3VmFsdWUgfHwgKCFuZXdWYWx1ZSAmJiBvbGRWYWx1ZSA9PSBmcm9tRWwucGxhY2Vob2xkZXIpKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBmaXJzdENoaWxkLm5vZGVWYWx1ZSA9IG5ld1ZhbHVlO1xuICAgICAgICB9XG4gICAgfSxcbiAgICBTRUxFQ1Q6IGZ1bmN0aW9uKGZyb21FbCwgdG9FbCkge1xuICAgICAgICBpZiAoIWhhc0F0dHJpYnV0ZU5TKHRvRWwsIG51bGwsICdtdWx0aXBsZScpKSB7XG4gICAgICAgICAgICB2YXIgc2VsZWN0ZWRJbmRleCA9IC0xO1xuICAgICAgICAgICAgdmFyIGkgPSAwO1xuICAgICAgICAgICAgdmFyIGN1ckNoaWxkID0gdG9FbC5maXJzdENoaWxkO1xuICAgICAgICAgICAgd2hpbGUoY3VyQ2hpbGQpIHtcbiAgICAgICAgICAgICAgICB2YXIgbm9kZU5hbWUgPSBjdXJDaGlsZC5ub2RlTmFtZTtcbiAgICAgICAgICAgICAgICBpZiAobm9kZU5hbWUgJiYgbm9kZU5hbWUudG9VcHBlckNhc2UoKSA9PT0gJ09QVElPTicpIHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKGhhc0F0dHJpYnV0ZU5TKGN1ckNoaWxkLCBudWxsLCAnc2VsZWN0ZWQnKSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgc2VsZWN0ZWRJbmRleCA9IGk7XG4gICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICBpKys7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGN1ckNoaWxkID0gY3VyQ2hpbGQubmV4dFNpYmxpbmc7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGZyb21FbC5zZWxlY3RlZEluZGV4ID0gaTtcbiAgICAgICAgfVxuICAgIH1cbn07XG5cbnZhciBFTEVNRU5UX05PREUgPSAxO1xudmFyIFRFWFRfTk9ERSA9IDM7XG52YXIgQ09NTUVOVF9OT0RFID0gODtcblxuZnVuY3Rpb24gbm9vcCgpIHt9XG5cbmZ1bmN0aW9uIGRlZmF1bHRHZXROb2RlS2V5KG5vZGUpIHtcbiAgICByZXR1cm4gbm9kZS5pZDtcbn1cblxuZnVuY3Rpb24gbW9ycGhkb21GYWN0b3J5KG1vcnBoQXR0cnMpIHtcblxuICAgIHJldHVybiBmdW5jdGlvbiBtb3JwaGRvbShmcm9tTm9kZSwgdG9Ob2RlLCBvcHRpb25zKSB7XG4gICAgICAgIGlmICghb3B0aW9ucykge1xuICAgICAgICAgICAgb3B0aW9ucyA9IHt9O1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKHR5cGVvZiB0b05vZGUgPT09ICdzdHJpbmcnKSB7XG4gICAgICAgICAgICBpZiAoZnJvbU5vZGUubm9kZU5hbWUgPT09ICcjZG9jdW1lbnQnIHx8IGZyb21Ob2RlLm5vZGVOYW1lID09PSAnSFRNTCcpIHtcbiAgICAgICAgICAgICAgICB2YXIgdG9Ob2RlSHRtbCA9IHRvTm9kZTtcbiAgICAgICAgICAgICAgICB0b05vZGUgPSBkb2MuY3JlYXRlRWxlbWVudCgnaHRtbCcpO1xuICAgICAgICAgICAgICAgIHRvTm9kZS5pbm5lckhUTUwgPSB0b05vZGVIdG1sO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICB0b05vZGUgPSB0b0VsZW1lbnQodG9Ob2RlKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIHZhciBnZXROb2RlS2V5ID0gb3B0aW9ucy5nZXROb2RlS2V5IHx8IGRlZmF1bHRHZXROb2RlS2V5O1xuICAgICAgICB2YXIgb25CZWZvcmVOb2RlQWRkZWQgPSBvcHRpb25zLm9uQmVmb3JlTm9kZUFkZGVkIHx8IG5vb3A7XG4gICAgICAgIHZhciBvbk5vZGVBZGRlZCA9IG9wdGlvbnMub25Ob2RlQWRkZWQgfHwgbm9vcDtcbiAgICAgICAgdmFyIG9uQmVmb3JlRWxVcGRhdGVkID0gb3B0aW9ucy5vbkJlZm9yZUVsVXBkYXRlZCB8fCBub29wO1xuICAgICAgICB2YXIgb25FbFVwZGF0ZWQgPSBvcHRpb25zLm9uRWxVcGRhdGVkIHx8IG5vb3A7XG4gICAgICAgIHZhciBvbkJlZm9yZU5vZGVEaXNjYXJkZWQgPSBvcHRpb25zLm9uQmVmb3JlTm9kZURpc2NhcmRlZCB8fCBub29wO1xuICAgICAgICB2YXIgb25Ob2RlRGlzY2FyZGVkID0gb3B0aW9ucy5vbk5vZGVEaXNjYXJkZWQgfHwgbm9vcDtcbiAgICAgICAgdmFyIG9uQmVmb3JlRWxDaGlsZHJlblVwZGF0ZWQgPSBvcHRpb25zLm9uQmVmb3JlRWxDaGlsZHJlblVwZGF0ZWQgfHwgbm9vcDtcbiAgICAgICAgdmFyIGNoaWxkcmVuT25seSA9IG9wdGlvbnMuY2hpbGRyZW5Pbmx5ID09PSB0cnVlO1xuXG4gICAgICAgIC8vIFRoaXMgb2JqZWN0IGlzIHVzZWQgYXMgYSBsb29rdXAgdG8gcXVpY2tseSBmaW5kIGFsbCBrZXllZCBlbGVtZW50cyBpbiB0aGUgb3JpZ2luYWwgRE9NIHRyZWUuXG4gICAgICAgIHZhciBmcm9tTm9kZXNMb29rdXAgPSB7fTtcbiAgICAgICAgdmFyIGtleWVkUmVtb3ZhbExpc3Q7XG5cbiAgICAgICAgZnVuY3Rpb24gYWRkS2V5ZWRSZW1vdmFsKGtleSkge1xuICAgICAgICAgICAgaWYgKGtleWVkUmVtb3ZhbExpc3QpIHtcbiAgICAgICAgICAgICAgICBrZXllZFJlbW92YWxMaXN0LnB1c2goa2V5KTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAga2V5ZWRSZW1vdmFsTGlzdCA9IFtrZXldO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgZnVuY3Rpb24gd2Fsa0Rpc2NhcmRlZENoaWxkTm9kZXMobm9kZSwgc2tpcEtleWVkTm9kZXMpIHtcbiAgICAgICAgICAgIGlmIChub2RlLm5vZGVUeXBlID09PSBFTEVNRU5UX05PREUpIHtcbiAgICAgICAgICAgICAgICB2YXIgY3VyQ2hpbGQgPSBub2RlLmZpcnN0Q2hpbGQ7XG4gICAgICAgICAgICAgICAgd2hpbGUgKGN1ckNoaWxkKSB7XG5cbiAgICAgICAgICAgICAgICAgICAgdmFyIGtleSA9IHVuZGVmaW5lZDtcblxuICAgICAgICAgICAgICAgICAgICBpZiAoc2tpcEtleWVkTm9kZXMgJiYgKGtleSA9IGdldE5vZGVLZXkoY3VyQ2hpbGQpKSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgLy8gSWYgd2UgYXJlIHNraXBwaW5nIGtleWVkIG5vZGVzIHRoZW4gd2UgYWRkIHRoZSBrZXlcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIHRvIGEgbGlzdCBzbyB0aGF0IGl0IGNhbiBiZSBoYW5kbGVkIGF0IHRoZSB2ZXJ5IGVuZC5cbiAgICAgICAgICAgICAgICAgICAgICAgIGFkZEtleWVkUmVtb3ZhbChrZXkpO1xuICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgLy8gT25seSByZXBvcnQgdGhlIG5vZGUgYXMgZGlzY2FyZGVkIGlmIGl0IGlzIG5vdCBrZXllZC4gV2UgZG8gdGhpcyBiZWNhdXNlXG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBhdCB0aGUgZW5kIHdlIGxvb3AgdGhyb3VnaCBhbGwga2V5ZWQgZWxlbWVudHMgdGhhdCB3ZXJlIHVubWF0Y2hlZFxuICAgICAgICAgICAgICAgICAgICAgICAgLy8gYW5kIHRoZW4gZGlzY2FyZCB0aGVtIGluIG9uZSBmaW5hbCBwYXNzLlxuICAgICAgICAgICAgICAgICAgICAgICAgb25Ob2RlRGlzY2FyZGVkKGN1ckNoaWxkKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChjdXJDaGlsZC5maXJzdENoaWxkKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgd2Fsa0Rpc2NhcmRlZENoaWxkTm9kZXMoY3VyQ2hpbGQsIHNraXBLZXllZE5vZGVzKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgICAgIGN1ckNoaWxkID0gY3VyQ2hpbGQubmV4dFNpYmxpbmc7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgLyoqXG4gICAgICAgICAqIFJlbW92ZXMgYSBET00gbm9kZSBvdXQgb2YgdGhlIG9yaWdpbmFsIERPTVxuICAgICAgICAgKlxuICAgICAgICAgKiBAcGFyYW0gIHtOb2RlfSBub2RlIFRoZSBub2RlIHRvIHJlbW92ZVxuICAgICAgICAgKiBAcGFyYW0gIHtOb2RlfSBwYXJlbnROb2RlIFRoZSBub2RlcyBwYXJlbnRcbiAgICAgICAgICogQHBhcmFtICB7Qm9vbGVhbn0gc2tpcEtleWVkTm9kZXMgSWYgdHJ1ZSB0aGVuIGVsZW1lbnRzIHdpdGgga2V5cyB3aWxsIGJlIHNraXBwZWQgYW5kIG5vdCBkaXNjYXJkZWQuXG4gICAgICAgICAqIEByZXR1cm4ge3VuZGVmaW5lZH1cbiAgICAgICAgICovXG4gICAgICAgIGZ1bmN0aW9uIHJlbW92ZU5vZGUobm9kZSwgcGFyZW50Tm9kZSwgc2tpcEtleWVkTm9kZXMpIHtcbiAgICAgICAgICAgIGlmIChvbkJlZm9yZU5vZGVEaXNjYXJkZWQobm9kZSkgPT09IGZhbHNlKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBpZiAocGFyZW50Tm9kZSkge1xuICAgICAgICAgICAgICAgIHBhcmVudE5vZGUucmVtb3ZlQ2hpbGQobm9kZSk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIG9uTm9kZURpc2NhcmRlZChub2RlKTtcbiAgICAgICAgICAgIHdhbGtEaXNjYXJkZWRDaGlsZE5vZGVzKG5vZGUsIHNraXBLZXllZE5vZGVzKTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIC8vIFRyZWVXYWxrZXIgaW1wbGVtZW50YXRpb24gaXMgbm8gZmFzdGVyLCBidXQga2VlcGluZyB0aGlzIGFyb3VuZCBpbiBjYXNlIHRoaXMgY2hhbmdlcyBpbiB0aGUgZnV0dXJlXG4gICAgICAgIC8vIGZ1bmN0aW9uIGluZGV4VHJlZShyb290KSB7XG4gICAgICAgIC8vICAgICB2YXIgdHJlZVdhbGtlciA9IGRvY3VtZW50LmNyZWF0ZVRyZWVXYWxrZXIoXG4gICAgICAgIC8vICAgICAgICAgcm9vdCxcbiAgICAgICAgLy8gICAgICAgICBOb2RlRmlsdGVyLlNIT1dfRUxFTUVOVCk7XG4gICAgICAgIC8vXG4gICAgICAgIC8vICAgICB2YXIgZWw7XG4gICAgICAgIC8vICAgICB3aGlsZSgoZWwgPSB0cmVlV2Fsa2VyLm5leHROb2RlKCkpKSB7XG4gICAgICAgIC8vICAgICAgICAgdmFyIGtleSA9IGdldE5vZGVLZXkoZWwpO1xuICAgICAgICAvLyAgICAgICAgIGlmIChrZXkpIHtcbiAgICAgICAgLy8gICAgICAgICAgICAgZnJvbU5vZGVzTG9va3VwW2tleV0gPSBlbDtcbiAgICAgICAgLy8gICAgICAgICB9XG4gICAgICAgIC8vICAgICB9XG4gICAgICAgIC8vIH1cblxuICAgICAgICAvLyAvLyBOb2RlSXRlcmF0b3IgaW1wbGVtZW50YXRpb24gaXMgbm8gZmFzdGVyLCBidXQga2VlcGluZyB0aGlzIGFyb3VuZCBpbiBjYXNlIHRoaXMgY2hhbmdlcyBpbiB0aGUgZnV0dXJlXG4gICAgICAgIC8vXG4gICAgICAgIC8vIGZ1bmN0aW9uIGluZGV4VHJlZShub2RlKSB7XG4gICAgICAgIC8vICAgICB2YXIgbm9kZUl0ZXJhdG9yID0gZG9jdW1lbnQuY3JlYXRlTm9kZUl0ZXJhdG9yKG5vZGUsIE5vZGVGaWx0ZXIuU0hPV19FTEVNRU5UKTtcbiAgICAgICAgLy8gICAgIHZhciBlbDtcbiAgICAgICAgLy8gICAgIHdoaWxlKChlbCA9IG5vZGVJdGVyYXRvci5uZXh0Tm9kZSgpKSkge1xuICAgICAgICAvLyAgICAgICAgIHZhciBrZXkgPSBnZXROb2RlS2V5KGVsKTtcbiAgICAgICAgLy8gICAgICAgICBpZiAoa2V5KSB7XG4gICAgICAgIC8vICAgICAgICAgICAgIGZyb21Ob2Rlc0xvb2t1cFtrZXldID0gZWw7XG4gICAgICAgIC8vICAgICAgICAgfVxuICAgICAgICAvLyAgICAgfVxuICAgICAgICAvLyB9XG5cbiAgICAgICAgZnVuY3Rpb24gaW5kZXhUcmVlKG5vZGUpIHtcbiAgICAgICAgICAgIGlmIChub2RlLm5vZGVUeXBlID09PSBFTEVNRU5UX05PREUpIHtcbiAgICAgICAgICAgICAgICB2YXIgY3VyQ2hpbGQgPSBub2RlLmZpcnN0Q2hpbGQ7XG4gICAgICAgICAgICAgICAgd2hpbGUgKGN1ckNoaWxkKSB7XG4gICAgICAgICAgICAgICAgICAgIHZhciBrZXkgPSBnZXROb2RlS2V5KGN1ckNoaWxkKTtcbiAgICAgICAgICAgICAgICAgICAgaWYgKGtleSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgZnJvbU5vZGVzTG9va3VwW2tleV0gPSBjdXJDaGlsZDtcbiAgICAgICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgICAgIC8vIFdhbGsgcmVjdXJzaXZlbHlcbiAgICAgICAgICAgICAgICAgICAgaW5kZXhUcmVlKGN1ckNoaWxkKTtcblxuICAgICAgICAgICAgICAgICAgICBjdXJDaGlsZCA9IGN1ckNoaWxkLm5leHRTaWJsaW5nO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIGluZGV4VHJlZShmcm9tTm9kZSk7XG5cbiAgICAgICAgZnVuY3Rpb24gaGFuZGxlTm9kZUFkZGVkKGVsKSB7XG4gICAgICAgICAgICBvbk5vZGVBZGRlZChlbCk7XG5cbiAgICAgICAgICAgIHZhciBjdXJDaGlsZCA9IGVsLmZpcnN0Q2hpbGQ7XG4gICAgICAgICAgICB3aGlsZSAoY3VyQ2hpbGQpIHtcbiAgICAgICAgICAgICAgICB2YXIgbmV4dFNpYmxpbmcgPSBjdXJDaGlsZC5uZXh0U2libGluZztcblxuICAgICAgICAgICAgICAgIHZhciBrZXkgPSBnZXROb2RlS2V5KGN1ckNoaWxkKTtcbiAgICAgICAgICAgICAgICBpZiAoa2V5KSB7XG4gICAgICAgICAgICAgICAgICAgIHZhciB1bm1hdGNoZWRGcm9tRWwgPSBmcm9tTm9kZXNMb29rdXBba2V5XTtcbiAgICAgICAgICAgICAgICAgICAgaWYgKHVubWF0Y2hlZEZyb21FbCAmJiBjb21wYXJlTm9kZU5hbWVzKGN1ckNoaWxkLCB1bm1hdGNoZWRGcm9tRWwpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBjdXJDaGlsZC5wYXJlbnROb2RlLnJlcGxhY2VDaGlsZCh1bm1hdGNoZWRGcm9tRWwsIGN1ckNoaWxkKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIG1vcnBoRWwodW5tYXRjaGVkRnJvbUVsLCBjdXJDaGlsZCk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICBoYW5kbGVOb2RlQWRkZWQoY3VyQ2hpbGQpO1xuICAgICAgICAgICAgICAgIGN1ckNoaWxkID0gbmV4dFNpYmxpbmc7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICBmdW5jdGlvbiBtb3JwaEVsKGZyb21FbCwgdG9FbCwgY2hpbGRyZW5Pbmx5KSB7XG4gICAgICAgICAgICB2YXIgdG9FbEtleSA9IGdldE5vZGVLZXkodG9FbCk7XG4gICAgICAgICAgICB2YXIgY3VyRnJvbU5vZGVLZXk7XG5cbiAgICAgICAgICAgIGlmICh0b0VsS2V5KSB7XG4gICAgICAgICAgICAgICAgLy8gSWYgYW4gZWxlbWVudCB3aXRoIGFuIElEIGlzIGJlaW5nIG1vcnBoZWQgdGhlbiBpdCBpcyB3aWxsIGJlIGluIHRoZSBmaW5hbFxuICAgICAgICAgICAgICAgIC8vIERPTSBzbyBjbGVhciBpdCBvdXQgb2YgdGhlIHNhdmVkIGVsZW1lbnRzIGNvbGxlY3Rpb25cbiAgICAgICAgICAgICAgICBkZWxldGUgZnJvbU5vZGVzTG9va3VwW3RvRWxLZXldO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBpZiAodG9Ob2RlLmlzU2FtZU5vZGUgJiYgdG9Ob2RlLmlzU2FtZU5vZGUoZnJvbU5vZGUpKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBpZiAoIWNoaWxkcmVuT25seSkge1xuICAgICAgICAgICAgICAgIGlmIChvbkJlZm9yZUVsVXBkYXRlZChmcm9tRWwsIHRvRWwpID09PSBmYWxzZSkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgbW9ycGhBdHRycyhmcm9tRWwsIHRvRWwpO1xuICAgICAgICAgICAgICAgIG9uRWxVcGRhdGVkKGZyb21FbCk7XG5cbiAgICAgICAgICAgICAgICBpZiAob25CZWZvcmVFbENoaWxkcmVuVXBkYXRlZChmcm9tRWwsIHRvRWwpID09PSBmYWxzZSkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBpZiAoZnJvbUVsLm5vZGVOYW1lICE9PSAnVEVYVEFSRUEnKSB7XG4gICAgICAgICAgICAgICAgdmFyIGN1clRvTm9kZUNoaWxkID0gdG9FbC5maXJzdENoaWxkO1xuICAgICAgICAgICAgICAgIHZhciBjdXJGcm9tTm9kZUNoaWxkID0gZnJvbUVsLmZpcnN0Q2hpbGQ7XG4gICAgICAgICAgICAgICAgdmFyIGN1clRvTm9kZUtleTtcblxuICAgICAgICAgICAgICAgIHZhciBmcm9tTmV4dFNpYmxpbmc7XG4gICAgICAgICAgICAgICAgdmFyIHRvTmV4dFNpYmxpbmc7XG4gICAgICAgICAgICAgICAgdmFyIG1hdGNoaW5nRnJvbUVsO1xuXG4gICAgICAgICAgICAgICAgb3V0ZXI6IHdoaWxlIChjdXJUb05vZGVDaGlsZCkge1xuICAgICAgICAgICAgICAgICAgICB0b05leHRTaWJsaW5nID0gY3VyVG9Ob2RlQ2hpbGQubmV4dFNpYmxpbmc7XG4gICAgICAgICAgICAgICAgICAgIGN1clRvTm9kZUtleSA9IGdldE5vZGVLZXkoY3VyVG9Ob2RlQ2hpbGQpO1xuXG4gICAgICAgICAgICAgICAgICAgIHdoaWxlIChjdXJGcm9tTm9kZUNoaWxkKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBmcm9tTmV4dFNpYmxpbmcgPSBjdXJGcm9tTm9kZUNoaWxkLm5leHRTaWJsaW5nO1xuXG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoY3VyVG9Ob2RlQ2hpbGQuaXNTYW1lTm9kZSAmJiBjdXJUb05vZGVDaGlsZC5pc1NhbWVOb2RlKGN1ckZyb21Ob2RlQ2hpbGQpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY3VyVG9Ob2RlQ2hpbGQgPSB0b05leHRTaWJsaW5nO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGN1ckZyb21Ob2RlQ2hpbGQgPSBmcm9tTmV4dFNpYmxpbmc7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY29udGludWUgb3V0ZXI7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAgICAgICAgIGN1ckZyb21Ob2RlS2V5ID0gZ2V0Tm9kZUtleShjdXJGcm9tTm9kZUNoaWxkKTtcblxuICAgICAgICAgICAgICAgICAgICAgICAgdmFyIGN1ckZyb21Ob2RlVHlwZSA9IGN1ckZyb21Ob2RlQ2hpbGQubm9kZVR5cGU7XG5cbiAgICAgICAgICAgICAgICAgICAgICAgIHZhciBpc0NvbXBhdGlibGUgPSB1bmRlZmluZWQ7XG5cbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChjdXJGcm9tTm9kZVR5cGUgPT09IGN1clRvTm9kZUNoaWxkLm5vZGVUeXBlKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGN1ckZyb21Ob2RlVHlwZSA9PT0gRUxFTUVOVF9OT0RFKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIEJvdGggbm9kZXMgYmVpbmcgY29tcGFyZWQgYXJlIEVsZW1lbnQgbm9kZXNcblxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoY3VyVG9Ob2RlS2V5KSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBUaGUgdGFyZ2V0IG5vZGUgaGFzIGEga2V5IHNvIHdlIHdhbnQgdG8gbWF0Y2ggaXQgdXAgd2l0aCB0aGUgY29ycmVjdCBlbGVtZW50XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBpbiB0aGUgb3JpZ2luYWwgRE9NIHRyZWVcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChjdXJUb05vZGVLZXkgIT09IGN1ckZyb21Ob2RlS2V5KSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gVGhlIGN1cnJlbnQgZWxlbWVudCBpbiB0aGUgb3JpZ2luYWwgRE9NIHRyZWUgZG9lcyBub3QgaGF2ZSBhIG1hdGNoaW5nIGtleSBzb1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIGxldCdzIGNoZWNrIG91ciBsb29rdXAgdG8gc2VlIGlmIHRoZXJlIGlzIGEgbWF0Y2hpbmcgZWxlbWVudCBpbiB0aGUgb3JpZ2luYWxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBET00gdHJlZVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmICgobWF0Y2hpbmdGcm9tRWwgPSBmcm9tTm9kZXNMb29rdXBbY3VyVG9Ob2RlS2V5XSkpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGN1ckZyb21Ob2RlQ2hpbGQubmV4dFNpYmxpbmcgPT09IG1hdGNoaW5nRnJvbUVsKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBTcGVjaWFsIGNhc2UgZm9yIHNpbmdsZSBlbGVtZW50IHJlbW92YWxzLiBUbyBhdm9pZCByZW1vdmluZyB0aGUgb3JpZ2luYWxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIERPTSBub2RlIG91dCBvZiB0aGUgdHJlZSAoc2luY2UgdGhhdCBjYW4gYnJlYWsgQ1NTIHRyYW5zaXRpb25zLCBldGMuKSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIHdlIHdpbGwgaW5zdGVhZCBkaXNjYXJkIHRoZSBjdXJyZW50IG5vZGUgYW5kIHdhaXQgdW50aWwgdGhlIG5leHRcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIGl0ZXJhdGlvbiB0byBwcm9wZXJseSBtYXRjaCB1cCB0aGUga2V5ZWQgdGFyZ2V0IGVsZW1lbnQgd2l0aCBpdHMgbWF0Y2hpbmdcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIGVsZW1lbnQgaW4gdGhlIG9yaWdpbmFsIHRyZWVcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlzQ29tcGF0aWJsZSA9IGZhbHNlO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gV2UgZm91bmQgYSBtYXRjaGluZyBrZXllZCBlbGVtZW50IHNvbWV3aGVyZSBpbiB0aGUgb3JpZ2luYWwgRE9NIHRyZWUuXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBMZXQncyBtb3ZpbmcgdGhlIG9yaWdpbmFsIERPTSBub2RlIGludG8gdGhlIGN1cnJlbnQgcG9zaXRpb24gYW5kIG1vcnBoXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBpdC5cblxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gTk9URTogV2UgdXNlIGluc2VydEJlZm9yZSBpbnN0ZWFkIG9mIHJlcGxhY2VDaGlsZCBiZWNhdXNlIHdlIHdhbnQgdG8gZ28gdGhyb3VnaFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gdGhlIGByZW1vdmVOb2RlKClgIGZ1bmN0aW9uIGZvciB0aGUgbm9kZSB0aGF0IGlzIGJlaW5nIGRpc2NhcmRlZCBzbyB0aGF0XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBhbGwgbGlmZWN5Y2xlIGhvb2tzIGFyZSBjb3JyZWN0bHkgaW52b2tlZFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZnJvbUVsLmluc2VydEJlZm9yZShtYXRjaGluZ0Zyb21FbCwgY3VyRnJvbU5vZGVDaGlsZCk7XG5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGZyb21OZXh0U2libGluZyA9IGN1ckZyb21Ob2RlQ2hpbGQubmV4dFNpYmxpbmc7XG5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChjdXJGcm9tTm9kZUtleSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIFNpbmNlIHRoZSBub2RlIGlzIGtleWVkIGl0IG1pZ2h0IGJlIG1hdGNoZWQgdXAgbGF0ZXIgc28gd2UgZGVmZXJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyB0aGUgYWN0dWFsIHJlbW92YWwgdG8gbGF0ZXJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBhZGRLZXllZFJlbW92YWwoY3VyRnJvbU5vZGVLZXkpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBOT1RFOiB3ZSBza2lwIG5lc3RlZCBrZXllZCBub2RlcyBmcm9tIGJlaW5nIHJlbW92ZWQgc2luY2UgdGhlcmUgaXNcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyAgICAgICBzdGlsbCBhIGNoYW5jZSB0aGV5IHdpbGwgYmUgbWF0Y2hlZCB1cCBsYXRlclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJlbW92ZU5vZGUoY3VyRnJvbU5vZGVDaGlsZCwgZnJvbUVsLCB0cnVlIC8qIHNraXAga2V5ZWQgbm9kZXMgKi8pO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjdXJGcm9tTm9kZUNoaWxkID0gbWF0Y2hpbmdGcm9tRWw7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBUaGUgbm9kZXMgYXJlIG5vdCBjb21wYXRpYmxlIHNpbmNlIHRoZSBcInRvXCIgbm9kZSBoYXMgYSBrZXkgYW5kIHRoZXJlXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIGlzIG5vIG1hdGNoaW5nIGtleWVkIG5vZGUgaW4gdGhlIHNvdXJjZSB0cmVlXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlzQ29tcGF0aWJsZSA9IGZhbHNlO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfSBlbHNlIGlmIChjdXJGcm9tTm9kZUtleSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gVGhlIG9yaWdpbmFsIGhhcyBhIGtleVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaXNDb21wYXRpYmxlID0gZmFsc2U7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpc0NvbXBhdGlibGUgPSBpc0NvbXBhdGlibGUgIT09IGZhbHNlICYmIGNvbXBhcmVOb2RlTmFtZXMoY3VyRnJvbU5vZGVDaGlsZCwgY3VyVG9Ob2RlQ2hpbGQpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoaXNDb21wYXRpYmxlKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBXZSBmb3VuZCBjb21wYXRpYmxlIERPTSBlbGVtZW50cyBzbyB0cmFuc2Zvcm1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIHRoZSBjdXJyZW50IFwiZnJvbVwiIG5vZGUgdG8gbWF0Y2ggdGhlIGN1cnJlbnRcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIHRhcmdldCBET00gbm9kZS5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIG1vcnBoRWwoY3VyRnJvbU5vZGVDaGlsZCwgY3VyVG9Ob2RlQ2hpbGQpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKGN1ckZyb21Ob2RlVHlwZSA9PT0gVEVYVF9OT0RFIHx8IGN1ckZyb21Ob2RlVHlwZSA9PSBDT01NRU5UX05PREUpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gQm90aCBub2RlcyBiZWluZyBjb21wYXJlZCBhcmUgVGV4dCBvciBDb21tZW50IG5vZGVzXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlzQ29tcGF0aWJsZSA9IHRydWU7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIFNpbXBseSB1cGRhdGUgbm9kZVZhbHVlIG9uIHRoZSBvcmlnaW5hbCBub2RlIHRvXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIGNoYW5nZSB0aGUgdGV4dCB2YWx1ZVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoY3VyRnJvbU5vZGVDaGlsZC5ub2RlVmFsdWUgIT09IGN1clRvTm9kZUNoaWxkLm5vZGVWYWx1ZSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY3VyRnJvbU5vZGVDaGlsZC5ub2RlVmFsdWUgPSBjdXJUb05vZGVDaGlsZC5ub2RlVmFsdWU7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGlzQ29tcGF0aWJsZSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIEFkdmFuY2UgYm90aCB0aGUgXCJ0b1wiIGNoaWxkIGFuZCB0aGUgXCJmcm9tXCIgY2hpbGQgc2luY2Ugd2UgZm91bmQgYSBtYXRjaFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGN1clRvTm9kZUNoaWxkID0gdG9OZXh0U2libGluZztcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjdXJGcm9tTm9kZUNoaWxkID0gZnJvbU5leHRTaWJsaW5nO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnRpbnVlIG91dGVyO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBObyBjb21wYXRpYmxlIG1hdGNoIHNvIHJlbW92ZSB0aGUgb2xkIG5vZGUgZnJvbSB0aGUgRE9NIGFuZCBjb250aW51ZSB0cnlpbmcgdG8gZmluZCBhXG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBtYXRjaCBpbiB0aGUgb3JpZ2luYWwgRE9NLiBIb3dldmVyLCB3ZSBvbmx5IGRvIHRoaXMgaWYgdGhlIGZyb20gbm9kZSBpcyBub3Qga2V5ZWRcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIHNpbmNlIGl0IGlzIHBvc3NpYmxlIHRoYXQgYSBrZXllZCBub2RlIG1pZ2h0IG1hdGNoIHVwIHdpdGggYSBub2RlIHNvbWV3aGVyZSBlbHNlIGluIHRoZVxuICAgICAgICAgICAgICAgICAgICAgICAgLy8gdGFyZ2V0IHRyZWUgYW5kIHdlIGRvbid0IHdhbnQgdG8gZGlzY2FyZCBpdCBqdXN0IHlldCBzaW5jZSBpdCBzdGlsbCBtaWdodCBmaW5kIGFcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIGhvbWUgaW4gdGhlIGZpbmFsIERPTSB0cmVlLiBBZnRlciBldmVyeXRoaW5nIGlzIGRvbmUgd2Ugd2lsbCByZW1vdmUgYW55IGtleWVkIG5vZGVzXG4gICAgICAgICAgICAgICAgICAgICAgICAvLyB0aGF0IGRpZG4ndCBmaW5kIGEgaG9tZVxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGN1ckZyb21Ob2RlS2V5KSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gU2luY2UgdGhlIG5vZGUgaXMga2V5ZWQgaXQgbWlnaHQgYmUgbWF0Y2hlZCB1cCBsYXRlciBzbyB3ZSBkZWZlclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIHRoZSBhY3R1YWwgcmVtb3ZhbCB0byBsYXRlclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGFkZEtleWVkUmVtb3ZhbChjdXJGcm9tTm9kZUtleSk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIE5PVEU6IHdlIHNraXAgbmVzdGVkIGtleWVkIG5vZGVzIGZyb20gYmVpbmcgcmVtb3ZlZCBzaW5jZSB0aGVyZSBpc1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vICAgICAgIHN0aWxsIGEgY2hhbmNlIHRoZXkgd2lsbCBiZSBtYXRjaGVkIHVwIGxhdGVyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcmVtb3ZlTm9kZShjdXJGcm9tTm9kZUNoaWxkLCBmcm9tRWwsIHRydWUgLyogc2tpcCBrZXllZCBub2RlcyAqLyk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAgICAgICAgIGN1ckZyb21Ob2RlQ2hpbGQgPSBmcm9tTmV4dFNpYmxpbmc7XG4gICAgICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgICAgICAvLyBJZiB3ZSBnb3QgdGhpcyBmYXIgdGhlbiB3ZSBkaWQgbm90IGZpbmQgYSBjYW5kaWRhdGUgbWF0Y2ggZm9yXG4gICAgICAgICAgICAgICAgICAgIC8vIG91ciBcInRvIG5vZGVcIiBhbmQgd2UgZXhoYXVzdGVkIGFsbCBvZiB0aGUgY2hpbGRyZW4gXCJmcm9tXCJcbiAgICAgICAgICAgICAgICAgICAgLy8gbm9kZXMuIFRoZXJlZm9yZSwgd2Ugd2lsbCBqdXN0IGFwcGVuZCB0aGUgY3VycmVudCBcInRvXCIgbm9kZVxuICAgICAgICAgICAgICAgICAgICAvLyB0byB0aGUgZW5kXG4gICAgICAgICAgICAgICAgICAgIGlmIChjdXJUb05vZGVLZXkgJiYgKG1hdGNoaW5nRnJvbUVsID0gZnJvbU5vZGVzTG9va3VwW2N1clRvTm9kZUtleV0pICYmIGNvbXBhcmVOb2RlTmFtZXMobWF0Y2hpbmdGcm9tRWwsIGN1clRvTm9kZUNoaWxkKSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgZnJvbUVsLmFwcGVuZENoaWxkKG1hdGNoaW5nRnJvbUVsKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIG1vcnBoRWwobWF0Y2hpbmdGcm9tRWwsIGN1clRvTm9kZUNoaWxkKTtcbiAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHZhciBvbkJlZm9yZU5vZGVBZGRlZFJlc3VsdCA9IG9uQmVmb3JlTm9kZUFkZGVkKGN1clRvTm9kZUNoaWxkKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChvbkJlZm9yZU5vZGVBZGRlZFJlc3VsdCAhPT0gZmFsc2UpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAob25CZWZvcmVOb2RlQWRkZWRSZXN1bHQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY3VyVG9Ob2RlQ2hpbGQgPSBvbkJlZm9yZU5vZGVBZGRlZFJlc3VsdDtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoY3VyVG9Ob2RlQ2hpbGQuYWN0dWFsaXplKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGN1clRvTm9kZUNoaWxkID0gY3VyVG9Ob2RlQ2hpbGQuYWN0dWFsaXplKGZyb21FbC5vd25lckRvY3VtZW50IHx8IGRvYyk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGZyb21FbC5hcHBlbmRDaGlsZChjdXJUb05vZGVDaGlsZCk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaGFuZGxlTm9kZUFkZGVkKGN1clRvTm9kZUNoaWxkKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgICAgIGN1clRvTm9kZUNoaWxkID0gdG9OZXh0U2libGluZztcbiAgICAgICAgICAgICAgICAgICAgY3VyRnJvbU5vZGVDaGlsZCA9IGZyb21OZXh0U2libGluZztcbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAvLyBXZSBoYXZlIHByb2Nlc3NlZCBhbGwgb2YgdGhlIFwidG8gbm9kZXNcIi4gSWYgY3VyRnJvbU5vZGVDaGlsZCBpc1xuICAgICAgICAgICAgICAgIC8vIG5vbi1udWxsIHRoZW4gd2Ugc3RpbGwgaGF2ZSBzb21lIGZyb20gbm9kZXMgbGVmdCBvdmVyIHRoYXQgbmVlZFxuICAgICAgICAgICAgICAgIC8vIHRvIGJlIHJlbW92ZWRcbiAgICAgICAgICAgICAgICB3aGlsZSAoY3VyRnJvbU5vZGVDaGlsZCkge1xuICAgICAgICAgICAgICAgICAgICBmcm9tTmV4dFNpYmxpbmcgPSBjdXJGcm9tTm9kZUNoaWxkLm5leHRTaWJsaW5nO1xuICAgICAgICAgICAgICAgICAgICBpZiAoKGN1ckZyb21Ob2RlS2V5ID0gZ2V0Tm9kZUtleShjdXJGcm9tTm9kZUNoaWxkKSkpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIFNpbmNlIHRoZSBub2RlIGlzIGtleWVkIGl0IG1pZ2h0IGJlIG1hdGNoZWQgdXAgbGF0ZXIgc28gd2UgZGVmZXJcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIHRoZSBhY3R1YWwgcmVtb3ZhbCB0byBsYXRlclxuICAgICAgICAgICAgICAgICAgICAgICAgYWRkS2V5ZWRSZW1vdmFsKGN1ckZyb21Ob2RlS2V5KTtcbiAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIE5PVEU6IHdlIHNraXAgbmVzdGVkIGtleWVkIG5vZGVzIGZyb20gYmVpbmcgcmVtb3ZlZCBzaW5jZSB0aGVyZSBpc1xuICAgICAgICAgICAgICAgICAgICAgICAgLy8gICAgICAgc3RpbGwgYSBjaGFuY2UgdGhleSB3aWxsIGJlIG1hdGNoZWQgdXAgbGF0ZXJcbiAgICAgICAgICAgICAgICAgICAgICAgIHJlbW92ZU5vZGUoY3VyRnJvbU5vZGVDaGlsZCwgZnJvbUVsLCB0cnVlIC8qIHNraXAga2V5ZWQgbm9kZXMgKi8pO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIGN1ckZyb21Ob2RlQ2hpbGQgPSBmcm9tTmV4dFNpYmxpbmc7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICB2YXIgc3BlY2lhbEVsSGFuZGxlciA9IHNwZWNpYWxFbEhhbmRsZXJzW2Zyb21FbC5ub2RlTmFtZV07XG4gICAgICAgICAgICBpZiAoc3BlY2lhbEVsSGFuZGxlcikge1xuICAgICAgICAgICAgICAgIHNwZWNpYWxFbEhhbmRsZXIoZnJvbUVsLCB0b0VsKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSAvLyBFTkQ6IG1vcnBoRWwoLi4uKVxuXG4gICAgICAgIHZhciBtb3JwaGVkTm9kZSA9IGZyb21Ob2RlO1xuICAgICAgICB2YXIgbW9ycGhlZE5vZGVUeXBlID0gbW9ycGhlZE5vZGUubm9kZVR5cGU7XG4gICAgICAgIHZhciB0b05vZGVUeXBlID0gdG9Ob2RlLm5vZGVUeXBlO1xuXG4gICAgICAgIGlmICghY2hpbGRyZW5Pbmx5KSB7XG4gICAgICAgICAgICAvLyBIYW5kbGUgdGhlIGNhc2Ugd2hlcmUgd2UgYXJlIGdpdmVuIHR3byBET00gbm9kZXMgdGhhdCBhcmUgbm90XG4gICAgICAgICAgICAvLyBjb21wYXRpYmxlIChlLmcuIDxkaXY+IC0tPiA8c3Bhbj4gb3IgPGRpdj4gLS0+IFRFWFQpXG4gICAgICAgICAgICBpZiAobW9ycGhlZE5vZGVUeXBlID09PSBFTEVNRU5UX05PREUpIHtcbiAgICAgICAgICAgICAgICBpZiAodG9Ob2RlVHlwZSA9PT0gRUxFTUVOVF9OT0RFKSB7XG4gICAgICAgICAgICAgICAgICAgIGlmICghY29tcGFyZU5vZGVOYW1lcyhmcm9tTm9kZSwgdG9Ob2RlKSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgb25Ob2RlRGlzY2FyZGVkKGZyb21Ob2RlKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIG1vcnBoZWROb2RlID0gbW92ZUNoaWxkcmVuKGZyb21Ob2RlLCBjcmVhdGVFbGVtZW50TlModG9Ob2RlLm5vZGVOYW1lLCB0b05vZGUubmFtZXNwYWNlVVJJKSk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAvLyBHb2luZyBmcm9tIGFuIGVsZW1lbnQgbm9kZSB0byBhIHRleHQgbm9kZVxuICAgICAgICAgICAgICAgICAgICBtb3JwaGVkTm9kZSA9IHRvTm9kZTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9IGVsc2UgaWYgKG1vcnBoZWROb2RlVHlwZSA9PT0gVEVYVF9OT0RFIHx8IG1vcnBoZWROb2RlVHlwZSA9PT0gQ09NTUVOVF9OT0RFKSB7IC8vIFRleHQgb3IgY29tbWVudCBub2RlXG4gICAgICAgICAgICAgICAgaWYgKHRvTm9kZVR5cGUgPT09IG1vcnBoZWROb2RlVHlwZSkge1xuICAgICAgICAgICAgICAgICAgICBpZiAobW9ycGhlZE5vZGUubm9kZVZhbHVlICE9PSB0b05vZGUubm9kZVZhbHVlKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBtb3JwaGVkTm9kZS5ub2RlVmFsdWUgPSB0b05vZGUubm9kZVZhbHVlO1xuICAgICAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIG1vcnBoZWROb2RlO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIC8vIFRleHQgbm9kZSB0byBzb21ldGhpbmcgZWxzZVxuICAgICAgICAgICAgICAgICAgICBtb3JwaGVkTm9kZSA9IHRvTm9kZTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICBpZiAobW9ycGhlZE5vZGUgPT09IHRvTm9kZSkge1xuICAgICAgICAgICAgLy8gVGhlIFwidG8gbm9kZVwiIHdhcyBub3QgY29tcGF0aWJsZSB3aXRoIHRoZSBcImZyb20gbm9kZVwiIHNvIHdlIGhhZCB0b1xuICAgICAgICAgICAgLy8gdG9zcyBvdXQgdGhlIFwiZnJvbSBub2RlXCIgYW5kIHVzZSB0aGUgXCJ0byBub2RlXCJcbiAgICAgICAgICAgIG9uTm9kZURpc2NhcmRlZChmcm9tTm9kZSk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBtb3JwaEVsKG1vcnBoZWROb2RlLCB0b05vZGUsIGNoaWxkcmVuT25seSk7XG5cbiAgICAgICAgICAgIC8vIFdlIG5vdyBuZWVkIHRvIGxvb3Agb3ZlciBhbnkga2V5ZWQgbm9kZXMgdGhhdCBtaWdodCBuZWVkIHRvIGJlXG4gICAgICAgICAgICAvLyByZW1vdmVkLiBXZSBvbmx5IGRvIHRoZSByZW1vdmFsIGlmIHdlIGtub3cgdGhhdCB0aGUga2V5ZWQgbm9kZVxuICAgICAgICAgICAgLy8gbmV2ZXIgZm91bmQgYSBtYXRjaC4gV2hlbiBhIGtleWVkIG5vZGUgaXMgbWF0Y2hlZCB1cCB3ZSByZW1vdmVcbiAgICAgICAgICAgIC8vIGl0IG91dCBvZiBmcm9tTm9kZXNMb29rdXAgYW5kIHdlIHVzZSBmcm9tTm9kZXNMb29rdXAgdG8gZGV0ZXJtaW5lXG4gICAgICAgICAgICAvLyBpZiBhIGtleWVkIG5vZGUgaGFzIGJlZW4gbWF0Y2hlZCB1cCBvciBub3RcbiAgICAgICAgICAgIGlmIChrZXllZFJlbW92YWxMaXN0KSB7XG4gICAgICAgICAgICAgICAgZm9yICh2YXIgaT0wLCBsZW49a2V5ZWRSZW1vdmFsTGlzdC5sZW5ndGg7IGk8bGVuOyBpKyspIHtcbiAgICAgICAgICAgICAgICAgICAgdmFyIGVsVG9SZW1vdmUgPSBmcm9tTm9kZXNMb29rdXBba2V5ZWRSZW1vdmFsTGlzdFtpXV07XG4gICAgICAgICAgICAgICAgICAgIGlmIChlbFRvUmVtb3ZlKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZW1vdmVOb2RlKGVsVG9SZW1vdmUsIGVsVG9SZW1vdmUucGFyZW50Tm9kZSwgZmFsc2UpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgaWYgKCFjaGlsZHJlbk9ubHkgJiYgbW9ycGhlZE5vZGUgIT09IGZyb21Ob2RlICYmIGZyb21Ob2RlLnBhcmVudE5vZGUpIHtcbiAgICAgICAgICAgIGlmIChtb3JwaGVkTm9kZS5hY3R1YWxpemUpIHtcbiAgICAgICAgICAgICAgICBtb3JwaGVkTm9kZSA9IG1vcnBoZWROb2RlLmFjdHVhbGl6ZShmcm9tTm9kZS5vd25lckRvY3VtZW50IHx8IGRvYyk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICAvLyBJZiB3ZSBoYWQgdG8gc3dhcCBvdXQgdGhlIGZyb20gbm9kZSB3aXRoIGEgbmV3IG5vZGUgYmVjYXVzZSB0aGUgb2xkXG4gICAgICAgICAgICAvLyBub2RlIHdhcyBub3QgY29tcGF0aWJsZSB3aXRoIHRoZSB0YXJnZXQgbm9kZSB0aGVuIHdlIG5lZWQgdG9cbiAgICAgICAgICAgIC8vIHJlcGxhY2UgdGhlIG9sZCBET00gbm9kZSBpbiB0aGUgb3JpZ2luYWwgRE9NIHRyZWUuIFRoaXMgaXMgb25seVxuICAgICAgICAgICAgLy8gcG9zc2libGUgaWYgdGhlIG9yaWdpbmFsIERPTSBub2RlIHdhcyBwYXJ0IG9mIGEgRE9NIHRyZWUgd2hpY2hcbiAgICAgICAgICAgIC8vIHdlIGtub3cgaXMgdGhlIGNhc2UgaWYgaXQgaGFzIGEgcGFyZW50IG5vZGUuXG4gICAgICAgICAgICBmcm9tTm9kZS5wYXJlbnROb2RlLnJlcGxhY2VDaGlsZChtb3JwaGVkTm9kZSwgZnJvbU5vZGUpO1xuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIG1vcnBoZWROb2RlO1xuICAgIH07XG59XG5cbnZhciBtb3JwaGRvbSA9IG1vcnBoZG9tRmFjdG9yeShtb3JwaEF0dHJzKTtcblxubW9kdWxlLmV4cG9ydHMgPSBtb3JwaGRvbTtcbiIsInZhciBnZXRJZCA9IGZ1bmN0aW9uIChpZCkge1xyXG4gIHJldHVybiBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChpZClcclxufVxyXG5cclxuZXhwb3J0cy5nZXRJZCA9IGdldElkXHJcblxyXG52YXIgbG9vcENoaWxkcyA9IGZ1bmN0aW9uIChhcnIsIGVsZW0pIHtcclxuICBmb3IgKHZhciBjaGlsZCA9IGVsZW0uZmlyc3RDaGlsZDsgY2hpbGQgIT09IG51bGw7IGNoaWxkID0gY2hpbGQubmV4dFNpYmxpbmcpIHtcclxuICAgIGFyci5wdXNoKGNoaWxkKVxyXG4gICAgaWYgKGNoaWxkLmhhc0NoaWxkTm9kZXMoKSkge1xyXG4gICAgICBsb29wQ2hpbGRzKGFyciwgY2hpbGQpXHJcbiAgICB9XHJcbiAgfVxyXG59XHJcblxyXG5leHBvcnRzLmxvb3BDaGlsZHMgPSBsb29wQ2hpbGRzXHJcblxyXG5leHBvcnRzLnRlc3RFdmVudCA9IGZ1bmN0aW9uICh0bXBsKSB7XHJcbiAgcmV0dXJuIC8gay0vLnRlc3QodG1wbClcclxufVxyXG5cclxuLyoqXHJcbiAqIEBwcml2YXRlXHJcbiAqIEBkZXNjcmlwdGlvblxyXG4gKiBDaGVjayBhIG5vZGUgYXZhaWxhYmlsaXR5IGluIDI1MG1zLCBpZiBub3QgZm91bmQgc2lsZW50eSBza2lwIHRoZSBldmVudFxyXG4gKlxyXG4gKiBAcGFyYW0ge3N0cmluZ30gaWQgLSB0aGUgbm9kZSBpZFxyXG4gKiBAcGFyYW0ge2Z1bmN0aW9ufSBjYWxsYmFjayAtIHRoZSBmdW5jdGlvbiB0byBleGVjdXRlIG9uY2UgdGhlIG5vZGUgaXMgZm91bmRcclxuICovXHJcbmV4cG9ydHMuY2hlY2tOb2RlQXZhaWxhYmlsaXR5ID0gZnVuY3Rpb24gKGNvbXBvbmVudCwgY29tcG9uZW50TmFtZSwgY2FsbGJhY2spIHtcclxuICB2YXIgZWxlID0gZ2V0SWQoY29tcG9uZW50LmVsKVxyXG5cclxuICBpZiAoZWxlKSByZXR1cm4gZWxlXHJcbiAgZWxzZSB7XHJcbiAgICB2YXIgdCA9IHNldEludGVydmFsKGZ1bmN0aW9uICgpIHtcclxuICAgICAgZWxlID0gZ2V0SWQoY29tcG9uZW50LmVsKVxyXG4gICAgICBpZiAoZWxlKSB7XHJcbiAgICAgICAgY2xlYXJJbnRlcnZhbCh0KVxyXG4gICAgICAgIGNhbGxiYWNrKGNvbXBvbmVudCwgY29tcG9uZW50TmFtZSwgZWxlKVxyXG4gICAgICB9XHJcbiAgICB9LCAwKVxyXG4gICAgLy8gc2lsZW50bHkgaWdub3JlIGZpbmRpbmcgdGhlIG5vZGUgYWZ0ZXIgc29tZXRpbWVzXHJcbiAgICBzZXRUaW1lb3V0KGZ1bmN0aW9uICgpIHtcclxuICAgICAgY2xlYXJJbnRlcnZhbCh0KVxyXG4gICAgfSwgMjUwKVxyXG4gIH1cclxufVxyXG5cclxuLyoqXHJcbiAqIEBwcml2YXRlXHJcbiAqIEBkZXNjcmlwdGlvblxyXG4gKiBDb25maXJtIHRoYXQgYSB2YWx1ZSBpcyB0cnV0aHksIHRocm93cyBhbiBlcnJvciBtZXNzYWdlIG90aGVyd2lzZS5cclxuICpcclxuICogQHBhcmFtIHsqfSB2YWwgLSB0aGUgdmFsIHRvIHRlc3QuXHJcbiAqIEBwYXJhbSB7c3RyaW5nfSBtc2cgLSB0aGUgZXJyb3IgbWVzc2FnZSBvbiBmYWlsdXJlLlxyXG4gKiBAdGhyb3dzIHtFcnJvcn1cclxuICovXHJcbmV4cG9ydHMuYXNzZXJ0ID0gZnVuY3Rpb24gKHZhbCwgbXNnKSB7XHJcbiAgaWYgKCF2YWwpIHRocm93IG5ldyBFcnJvcignKGtlZXQpICcgKyBtc2cpXHJcbn1cclxuXHJcbi8qKlxyXG4gKiBAcHJpdmF0ZVxyXG4gKiBAZGVzY3JpcHRpb25cclxuICogU2ltcGxlIGh0bWwgdGVtcGxhdGUgbGl0ZXJhbHMgTU9ESUZJRUQgZnJvbSA6IGh0dHA6Ly8yYWxpdHkuY29tLzIwMTUvMDEvdGVtcGxhdGUtc3RyaW5ncy1odG1sLmh0bWxcclxuICogYnkgRHIuIEF4ZWwgUmF1c2NobWF5ZXJcclxuICogbm8gY2hlY2tpbmcgZm9yIHdyYXBwaW5nIGluIHJvb3QgZWxlbWVudFxyXG4gKiBubyBzdHJpY3QgY2hlY2tpbmdcclxuICogcmVtb3ZlIHNwYWNpbmcgLyBpbmRlbnRhdGlvblxyXG4gKiBrZWVwIGFsbCBzcGFjaW5nIHdpdGhpbiBodG1sIHRhZ3NcclxuICovXHJcbmV4cG9ydHMuaHRtbCA9IGZ1bmN0aW9uICgpIHtcclxuICB2YXIgbGl0ZXJhbFNlY3Rpb25zID0gW10uc2hpZnQuY2FsbChhcmd1bWVudHMpXHJcbiAgdmFyIHJhdyA9IGxpdGVyYWxTZWN0aW9ucy5yYXdcclxuICAvLyByZW1vdmUgc3BhY2luZywgaW5kZW50YXRpb25cclxuICB2YXIgdHJpbSA9IHJhd1tyYXcubGVuZ3RoIC0gMV1cclxuICB0cmltID0gdHJpbS5zcGxpdCgvXFxuKy8pXHJcbiAgdHJpbSA9IHRyaW0ubWFwKGZ1bmN0aW9uICh0KSB7XHJcbiAgICByZXR1cm4gdC50cmltKClcclxuICB9KS5qb2luKCcnKVxyXG4gIHJldHVybiB0cmltXHJcbn1cclxuXHJcbi8qKlxyXG4gKiBAcHJpdmF0ZVxyXG4gKiBAZGVzY3JpcHRpb25cclxuICogQ29weSB3aXRoIG1vZGlmaWNhdGlvbiBmcm9tIHByZWFjdC10b2RvbXZjLiBNb2RlbCBjb25zdHJ1Y3RvclxyXG4gKlxyXG4gKiB7e21vZGVsOjxteU1vZGVsPn19PG15TW9kZWxUZW1wbGF0ZVN0cmluZz57ey9tb2RlbDo8bXlNb2RlbD59fVxyXG4gKlxyXG4gKi9cclxuZXhwb3J0cy5jcmVhdGVNb2RlbCA9IGZ1bmN0aW9uICgpIHtcclxuXHJcbiAgdmFyIG9uQ2hhbmdlcyA9IFtdXHJcblxyXG4gIHRoaXMuaW5mb3JtID0gZnVuY3Rpb24oKSB7XHJcbiAgICBjb25zb2xlLmxvZyh0aGlzLCBvbkNoYW5nZXMubGVuZ3RoKVxyXG4gICAgZm9yICh2YXIgaSA9IG9uQ2hhbmdlcy5sZW5ndGg7IGktLTspIHtcclxuICAgICAgb25DaGFuZ2VzW2ldKHRoaXMubGlzdClcclxuICAgIH1cclxuICB9XHJcblxyXG4vKipcclxuICogQHByaXZhdGVcclxuICogQGRlc2NyaXB0aW9uXHJcbiAqIFRoZSBhcnJheSBtb2RlbCBzdG9yZVxyXG4gKi9cclxuICB0aGlzLmxpc3QgPSBbXVxyXG5cclxuLyoqXHJcbiAqIEBwcml2YXRlXHJcbiAqIEBkZXNjcmlwdGlvblxyXG4gKiBTdWJzY3JpYmUgdG8gdGhlIG1vZGVsIGNoYW5nZXMgKGFkZC91cGRhdGUvZGVzdHJveSlcclxuICpcclxuICogQHBhcmFtIHtPYmplY3R9IG1vZGVsIC0gdGhlIG1vZGVsIGluY2x1ZGluZyBhbGwgcHJvdG90eXBlc1xyXG4gKlxyXG4gKi9cclxuICB0aGlzLnN1YnNjcmliZSA9IGZ1bmN0aW9uIChmbikge1xyXG4gICAgb25DaGFuZ2VzLnB1c2goZm4pXHJcbiAgfVxyXG5cclxuLyoqXHJcbiAqIEBwcml2YXRlXHJcbiAqIEBkZXNjcmlwdGlvblxyXG4gKiBBZGQgbmV3IG9iamVjdCB0byB0aGUgbW9kZWwgbGlzdFxyXG4gKlxyXG4gKiBAcGFyYW0ge09iamVjdH0gb2JqIC0gbmV3IG9iamVjdCB0byBhZGQgaW50byB0aGUgbW9kZWwgbGlzdFxyXG4gKlxyXG4gKi9cclxuICB0aGlzLmFkZCA9IGZ1bmN0aW9uIChvYmopIHtcclxuICAgIHRoaXMubGlzdCA9IHRoaXMubGlzdC5jb25jYXQob2JqKVxyXG4gICAgdGhpcy5pbmZvcm0oKVxyXG4gIH1cclxuXHJcbi8qKlxyXG4gKiBAcHJpdmF0ZVxyXG4gKiBAZGVzY3JpcHRpb25cclxuICogVXBkYXRlIGV4aXN0aW5nIG9iamVjdCBpbiB0aGUgbW9kZWwgbGlzdFxyXG4gKlxyXG4gKiBAcGFyYW0ge1N0cmluZ30gbG9va3VwSWQgLSBsb29rdXAgaWQgcHJvcGVydHkgbmFtZSBvZiB0aGUgb2JqZWN0XHJcbiAqIEBwYXJhbSB7T2JqZWN0fSB1cGRhdGVPYmogLSB0aGUgdXBkYXRlZCBwcm9wZXJ0aWVzXHJcbiAqXHJcbiAqL1xyXG4gIHRoaXMudXBkYXRlID0gZnVuY3Rpb24gKGxvb2t1cElkLCB1cGRhdGVPYmopIHtcclxuICAgIHRoaXMubGlzdCA9IHRoaXMubGlzdC5tYXAoZnVuY3Rpb24gKG9iaikge1xyXG4gICAgICByZXR1cm4gb2JqW2xvb2t1cElkXSAhPT0gdXBkYXRlT2JqW2xvb2t1cElkXSA/IG9iaiA6IE9iamVjdC5hc3NpZ24ob2JqLCB1cGRhdGVPYmopXHJcbiAgICB9KVxyXG4gICAgdGhpcy5pbmZvcm0oKVxyXG4gIH1cclxuXHJcbi8qKlxyXG4gKiBAcHJpdmF0ZVxyXG4gKiBAZGVzY3JpcHRpb25cclxuICogUmVtb3ZlZCBleGlzdGluZyBvYmplY3QgaW4gdGhlIG1vZGVsIGxpc3RcclxuICpcclxuICogQHBhcmFtIHtTdHJpbmd9IGxvb2t1cElkIC0gbG9va3VwIGlkIHByb3BlcnR5IG5hbWUgb2YgdGhlIG9iamVjdFxyXG4gKiBAcGFyYW0ge1N0cmluZ30gb2JqSWQgLSB1bmlxdWUgaWRlbnRpZmllciBvZiB0aGUgbG9va3VwIGlkXHJcbiAqXHJcbiAqL1xyXG4gIHRoaXMuZGVzdHJveSA9IGZ1bmN0aW9uIChsb29rdXBJZCwgb2JqSWQpIHtcclxuICAgIHRoaXMubGlzdCA9IHRoaXMubGlzdC5maWx0ZXIoZnVuY3Rpb24gKG9iaikge1xyXG4gICAgICByZXR1cm4gb2JqW2xvb2t1cElkXSAhPT0gb2JqSWRcclxuICAgIH0pXHJcbiAgICB0aGlzLmluZm9ybSgpXHJcbiAgfVxyXG59XHJcbiIsImNvbnN0IEtlZXQgPSByZXF1aXJlKCcuLi9rZWV0JylcclxuY29uc3QgeyBodG1sIH0gPSByZXF1aXJlICgnLi4va2VldC91dGlscycpXHJcbmNvbnN0IHsgY2FtZWxDYXNlICwgZ2VuSWQgfSA9IHJlcXVpcmUoJy4vdXRpbCcpXHJcbmNvbnN0IGNyZWF0ZVRvZG9Nb2RlbCA9IHJlcXVpcmUoJy4vdG9kb01vZGVsJylcclxuY29uc3QgZmlsdGVyUGFnZSA9IFsnYWxsJywgJ2FjdGl2ZScsICdjb21wbGV0ZWQnXVxyXG4vLyBjb25zdCBmaWx0ZXJzVG1wbCA9IHJlcXVpcmUoJy4vZmlsdGVycycpKGZpbHRlclBhZ2UpXHJcbmNvbnN0IGZpbHRlckFwcCA9IHJlcXVpcmUoJy4vZmlsdGVyJylcclxuY29uc3QgdG9kb3MgPSByZXF1aXJlKCcuL3RvZG8nKVxyXG5cclxuY2xhc3MgQXBwIGV4dGVuZHMgS2VldCB7XHJcbiAgdG9kb01vZGVsID0gdG9kb3NcclxuICBmaWx0ZXIgPSBmaWx0ZXJBcHBcclxuICBwYWdlID0gJ0FsbCdcclxuICBpc0NoZWNrZWQgPSBmYWxzZVxyXG4gIGNvdW50ID0gMFxyXG4gIHBsdXJhbCA9ICcnXHJcbiAgY2xlYXJUb2dnbGUgPSBmYWxzZVxyXG4gIHRvZG9TdGF0ZSA9IHRydWVcclxuXHJcbiAgY29tcG9uZW50V2lsbE1vdW50KCkge1xyXG4gICAgZmlsdGVyUGFnZS5tYXAoZiA9PiB0aGlzW2BwYWdlJHtjYW1lbENhc2UoZil9YF0gPSAnJylcclxuXHJcbiAgICAvLyB0aGlzLnRvZG9TdGF0ZSA9IHRoaXMudG9kb01vZGVsLmxpc3QubGVuZ3RoID8gdHJ1ZSA6IGZhbHNlXHJcblxyXG4gICAgdGhpcy50b2RvTW9kZWwuc3Vic2NyaWJlKHRvZG9zID0+IHtcclxuICAgICAgbGV0IHVuY29tcGxldGVkID0gdG9kb3MuZmlsdGVyKGMgPT4gIWMuY29tcGxldGVkKVxyXG4gICAgICBsZXQgY29tcGxldGVkID0gdG9kb3MuZmlsdGVyKGMgPT4gYy5jb21wbGV0ZWQpXHJcbiAgICAgIHRoaXMuY2xlYXJUb2dnbGUgPSBjb21wbGV0ZWQubGVuZ3RoID8gdHJ1ZSA6IGZhbHNlXHJcbiAgICAgIHRoaXMudG9kb1N0YXRlID0gdG9kb3MubGVuZ3RoID8gdHJ1ZSA6IGZhbHNlXHJcbiAgICAgIHRoaXMucGx1cmFsID0gdW5jb21wbGV0ZWQubGVuZ3RoID09PSAxID8gJycgOiAncydcclxuICAgICAgdGhpcy5jb3VudCA9IHVuY29tcGxldGVkLmxlbmd0aFxyXG4gICAgfSlcclxuICB9XHJcblxyXG4gIGNyZWF0ZSAoZXZ0KSB7XHJcbiAgICBpZihldnQua2V5Q29kZSAhPT0gMTMpIHJldHVyblxyXG4gICAgbGV0IHRpdGxlID0gZXZ0LnRhcmdldC52YWx1ZS50cmltKClcclxuICAgIGlmKHRpdGxlKXtcclxuICAgICAgdGhpcy50b2RvTW9kZWwuYWRkKHsgaWQ6IGdlbklkKCksIHRpdGxlLCBjb21wbGV0ZWQ6IGZhbHNlIH0pXHJcbiAgICAgIGV2dC50YXJnZXQudmFsdWUgPSAnJ1xyXG4gICAgfVxyXG4gIH1cclxuXHJcbiAgdG9nZ2xlVG9kbyhpZCwgZXZ0KSB7XHJcbiAgICB0aGlzLnRvZG9Nb2RlbC51cGRhdGUoICdpZCcsIHsgaWQsIGNvbXBsZXRlZDogISFldnQudGFyZ2V0LmNoZWNrZWQgfSlcclxuICB9XHJcblxyXG4gIHRvZG9EZXN0cm95KGlkKSB7XHJcbiAgICB0aGlzLnRvZG9Nb2RlbC5kZXN0cm95KCdpZCcsIGlkKVxyXG4gIH1cclxuXHJcbiAgY29tcGxldGVBbGwoKXtcclxuICAgIHRoaXMuaXNDaGVja2VkID0gIXRoaXMuaXNDaGVja2VkXHJcbiAgICB0aGlzLnRvZG9Nb2RlbC51cGRhdGVBbGwodGhpcy5pc0NoZWNrZWQpXHJcbiAgfVxyXG5cclxuICBjbGVhckNvbXBsZXRlZCgpIHtcclxuICAgIHRoaXMudG9kb01vZGVsLmNsZWFyQ29tcGxldGVkKClcclxuICB9XHJcbn1cclxuXHJcbi8vIDx1bCBpZD1cImZpbHRlcnNcIj5cclxuLy8gJHtmaWx0ZXJzVG1wbH1cclxuLy8gPC91bD5cclxuXHJcbmNvbnN0IHZtb2RlbCA9IGh0bWxgXHJcbiAgPHNlY3Rpb24gaWQ9XCJ0b2RvYXBwXCI+XHJcbiAgICA8aGVhZGVyIGlkPVwiaGVhZGVyXCI+XHJcbiAgICAgIDxoMT50b2RvczwvaDE+XHJcbiAgICAgIDxpbnB1dCBpZD1cIm5ldy10b2RvXCIgay1rZXlkb3duPVwiY3JlYXRlKClcIiBwbGFjZWhvbGRlcj1cIldoYXQgbmVlZHMgdG8gYmUgZG9uZT9cIiBhdXRvZm9jdXM+XHJcbiAgICA8L2hlYWRlcj5cclxuICAgIHt7P3RvZG9TdGF0ZX19XHJcbiAgICA8c2VjdGlvbiBpZD1cIm1haW5cIj5cclxuICAgICAgPGlucHV0IGlkPVwidG9nZ2xlLWFsbFwiIHR5cGU9XCJjaGVja2JveFwiIHt7aXNDaGVja2VkP2NoZWNrZWQ6Jyd9fSBrLWNsaWNrPVwiY29tcGxldGVBbGwoKVwiPlxyXG4gICAgICA8bGFiZWwgZm9yPVwidG9nZ2xlLWFsbFwiPk1hcmsgYWxsIGFzIGNvbXBsZXRlPC9sYWJlbD5cclxuICAgICAgPHVsIGlkPVwidG9kby1saXN0XCI+XHJcbiAgICAgICAge3ttb2RlbDp0b2RvTW9kZWx9fVxyXG4gICAgICAgICAgPGxpIGlkPVwie3tpZH19XCIgay1kYmxjbGljaz1cImVkaXRNb2RlKHt7aWR9fSlcIiBjbGFzcz1cInt7Y29tcGxldGVkP2NvbXBsZXRlZDonJ319XCI+XHJcbiAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJ2aWV3XCI+PGlucHV0IGstY2xpY2s9XCJ0b2dnbGVUb2RvKHt7aWR9fSlcIiBjbGFzcz1cInRvZ2dsZVwiIHR5cGU9XCJjaGVja2JveFwiIHt7Y29tcGxldGVkP2NoZWNrZWQ6Jyd9fT5cclxuICAgICAgICAgICAgICA8bGFiZWw+e3t0aXRsZX19PC9sYWJlbD5cclxuICAgICAgICAgICAgICA8YnV0dG9uIGstY2xpY2s9XCJ0b2RvRGVzdHJveSh7e2lkfX0pXCIgY2xhc3M9XCJkZXN0cm95XCI+PC9idXR0b24+XHJcbiAgICAgICAgICAgIDwvZGl2PlxyXG4gICAgICAgICAgICA8aW5wdXQgY2xhc3M9XCJlZGl0XCIgdmFsdWU9XCJ7e3RpdGxlfX1cIj5cclxuICAgICAgICAgIDwvbGk+XHJcbiAgICAgICAge3svbW9kZWw6dG9kb01vZGVsfX1cclxuICAgICAgPC91bD5cclxuICAgIDwvc2VjdGlvbj5cclxuICAgIDxmb290ZXIgaWQ9XCJmb290ZXJcIj5cclxuICAgICAgPHNwYW4gaWQ9XCJ0b2RvLWNvdW50XCI+XHJcbiAgICAgICAgPHN0cm9uZz57e2NvdW50fX08L3N0cm9uZz4gaXRlbXt7cGx1cmFsfX0gbGVmdFxyXG4gICAgICA8L3NwYW4+XHJcbiAgICAgIHt7Y29tcG9uZW50OmZpbHRlcn19XHJcbiAgICAgIHt7P2NsZWFyVG9nZ2xlfX1cclxuICAgICAgPGJ1dHRvbiBpZD1cImNsZWFyLWNvbXBsZXRlZFwiIGstY2xpY2s9XCJjbGVhckNvbXBsZXRlZCgpXCI+Q2xlYXIgY29tcGxldGVkPC9idXR0b24+XHJcbiAgICAgIHt7L2NsZWFyVG9nZ2xlfX1cclxuICAgIDwvZm9vdGVyPlxyXG4gICAge3svdG9kb1N0YXRlfX1cclxuICA8L3NlY3Rpb24+XHJcbiAgPGZvb3RlciBpZD1cImluZm9cIj5cclxuICAgIDxwPkRvdWJsZS1jbGljayB0byBlZGl0IGEgdG9kbzwvcD5cclxuICAgIDxwPkNyZWF0ZWQgYnkgPGEgaHJlZj1cImh0dHBzOi8vZ2l0aHViLmNvbS9zeWFydWxcIj5TaGFocnVsIE5pemFtIFNlbGFtYXQ8L2E+PC9wPlxyXG4gICAgPHA+UGFydCBvZiA8YSBocmVmPVwiaHR0cDovL3RvZG9tdmMuY29tXCI+VG9kb01WQzwvYT48L3A+XHJcbiAgPC9mb290ZXI+YFxyXG5cclxuY29uc3QgYXBwID0gbmV3IEFwcCgpXHJcblxyXG5hcHAubW91bnQodm1vZGVsKS5saW5rKCd0b2RvJylcclxuXHJcbmNvbnNvbGUubG9nKGFwcClcclxuIiwiY29uc3QgS2VldCA9IHJlcXVpcmUoJy4uL2tlZXQnKVxyXG5jb25zdCB7IGNhbWVsQ2FzZSwgaHRtbCB9ID0gcmVxdWlyZSgnLi91dGlsJylcclxuY29uc3QgeyBjcmVhdGVNb2RlbCB9ID0gcmVxdWlyZSgnLi4va2VldC91dGlscycpXHJcblxyXG5cclxuY2xhc3MgQ3JlYXRlTW9kZWwgZXh0ZW5kcyBjcmVhdGVNb2RlbCB7XHJcbiAgc3dpdGNoKGhhc2gsIG9iail7XHJcbiAgICB0aGlzLmxpc3QgPSB0aGlzLmxpc3QubWFwKGZpbHRlciA9PiB7XHJcbiAgICAgIGxldCBub24gPSB7IHNlbGVjdGVkOiBmYWxzZSB9XHJcbiAgICAgIHJldHVybiBmaWx0ZXIuaGFzaCA9PT0gaGFzaCA/ICh7IC4uLmZpbHRlciwgLi4ub2JqfSkgOiAoeyAuLi5maWx0ZXIsIC4uLm5vbn0pXHJcbiAgICB9KVxyXG4gICAgdGhpcy5pbmZvcm0oKVxyXG4gIH1cclxufVxyXG5jb25zdCBmaWx0ZXJzID0gbmV3IENyZWF0ZU1vZGVsKClcclxuXHJcbkFycmF5LmZyb20oWydhbGwnLCAnYWN0aXZlJywgJ2NvbXBsZXRlZCddKS5tYXAocGFnZSA9PiB7XHJcblx0ZmlsdGVycy5hZGQoe1xyXG4gICAgICBoYXNoOiAnIy8nICsgcGFnZSxcclxuICAgICAgbmFtZTogY2FtZWxDYXNlKHBhZ2UpLFxyXG4gICAgICBzZWxlY3RlZDogZmFsc2VcclxuICAgIH0pXHJcbn0pXHJcblxyXG5jbGFzcyBBcHAgZXh0ZW5kcyBLZWV0IHtcclxuICBlbCA9ICdmaWx0ZXJzJ1xyXG4gIGZpbHRlck1vZGVsID0gZmlsdGVyc1xyXG4gIGNvbXBvbmVudFdpbGxNb3VudCgpIHtcclxuICAgIHRoaXMuZmlsdGVyTW9kZWwuc3Vic2NyaWJlKG1vZGVsID0+IHtcclxuICAgICAgY29uc29sZS5sb2cobW9kZWwpXHJcbiAgICAgIHRoaXMuY2FsbEJhdGNoUG9vbFVwZGF0ZSgpXHJcbiAgICB9KVxyXG4gIH1cclxuICBjb21wb25lbnREaWRNb3VudCgpe1xyXG4gICAgaWYgKHdpbmRvdy5sb2NhdGlvbi5oYXNoID09ICcnKSB7XHJcbiAgICAgIHRoaXMudXBkYXRlVXJsKCcjL2FsbCcpXHJcbiAgICAgICB3aW5kb3cuaGlzdG9yeS5wdXNoU3RhdGUoe30sIG51bGwsICcjL2FsbCcpXHJcbiAgICB9XHJcbiAgICB3aW5kb3cub25wb3BzdGF0ZSA9ICgpID0+IHRoaXMudXBkYXRlVXJsKHdpbmRvdy5sb2NhdGlvbi5oYXNoKVxyXG4gIH1cclxuXHJcbiAgdXBkYXRlVXJsKGhhc2gpIHtcclxuICAgIHRoaXMuZmlsdGVyTW9kZWwuc3dpdGNoKGhhc2gsIHsgc2VsZWN0ZWQ6IHRydWUgfSlcclxuICAgIC8vIHRoaXMuY2FsbEJhdGNoUG9vbFVwZGF0ZSgpXHJcbiAgfVxyXG59XHJcblxyXG5jb25zdCBmaWx0ZXJBcHAgPSBuZXcgQXBwKClcclxuXHJcbmxldCB2bW9kZWwgPSBodG1sYFxyXG5cdDx1bCBpZD1cImZpbHRlcnNcIj5cclxuXHRcdHt7bW9kZWw6ZmlsdGVyTW9kZWx9fVxyXG5cdFx0PGxpIGstY2xpY2s9XCJ1cGRhdGVVcmwoe3toYXNofX0pXCI+PGEgY2xhc3M9XCJ7e3NlbGVjdGVkP3NlbGVjdGVkOicnfX1cIiBocmVmPVwie3toYXNofX1cIj57e25hbWV9fTwvYT48L2xpPlxyXG5cdFx0e3svbW9kZWw6ZmlsdGVyTW9kZWx9fVxyXG5cdDwvdWw+XHJcbmBcclxuXHJcbmZpbHRlckFwcC5tb3VudCh2bW9kZWwpXHJcblxyXG5jb25zb2xlLmxvZyhmaWx0ZXJBcHApXHJcblxyXG5tb2R1bGUuZXhwb3J0cyA9IGZpbHRlckFwcCIsImNvbnN0IEtlZXQgPSByZXF1aXJlKCcuLi9rZWV0JylcclxuY29uc3QgeyBjcmVhdGVNb2RlbCB9ID0gcmVxdWlyZSgnLi4va2VldC91dGlscycpXHJcblxyXG5jbGFzcyBDcmVhdGVNb2RlbCBleHRlbmRzIGNyZWF0ZU1vZGVsIHtcclxuXHJcbiAgY2xlYXJDb21wbGV0ZWQoKSB7XHJcbiAgICB0aGlzLmxpc3QgPSB0aGlzLmxpc3QuZmlsdGVyKHRvZG8gPT4gIXRvZG8uY29tcGxldGVkKVxyXG4gICAgdGhpcy5pbmZvcm0oKVxyXG4gIH0gXHJcbn1cclxuXHJcbmNvbnN0IHRvZG9zID0gbmV3IENyZWF0ZU1vZGVsKClcclxuXHJcbm1vZHVsZS5leHBvcnRzID0gdG9kb3NcclxuIiwiXHJcbmNvbnN0IHsgZ2VuSWQgfSA9IHJlcXVpcmUoJy4vdXRpbCcpXHJcblxyXG4vLyBub3RlOiBjb3B5IHdpdGggbW9kaWZpY2F0aW9uIGZyb20gcHJlYWN0LXRvZG9tdmNcclxuXHJcbm1vZHVsZS5leHBvcnRzID0gKCkgPT4ge1xyXG5cclxuICBsZXQgb25DaGFuZ2VzID0gW11cclxuXHJcbiAgZnVuY3Rpb24gaW5mb3JtICgpIHtcclxuICAgIGZvciAobGV0IGkgPSBvbkNoYW5nZXMubGVuZ3RoOyBpLS07KSB7XHJcbiAgICAgIG9uQ2hhbmdlc1tpXShtb2RlbClcclxuICAgIH1cclxuICB9XHJcblxyXG4gIGxldCBtb2RlbCA9IHtcclxuXHJcbiAgICBsaXN0OiBbXSxcclxuXHJcbiAgICAvLyBvcHM6IG51bGwsXHJcblxyXG4gICAgc3Vic2NyaWJlIChmbikge1xyXG4gICAgICBvbkNoYW5nZXMucHVzaChmbilcclxuICAgIH0sXHJcblxyXG4gICAgYWRkVG9kbyAodGl0bGUpIHtcclxuICAgICAgLy8gdGhpcy5vcHMgPSAnYWRkJ1xyXG4gICAgICB0aGlzLmxpc3QgPSB0aGlzLmxpc3QuY29uY2F0KHtcclxuICAgICAgICBpZDogZ2VuSWQoKSxcclxuICAgICAgICB0aXRsZSxcclxuICAgICAgICBjb21wbGV0ZWQ6IGZhbHNlXHJcbiAgICAgIH0pXHJcbiAgICAgIGluZm9ybSgpXHJcbiAgICB9LFxyXG5cclxuICAgIHRvZ2dsZUFsbChjb21wbGV0ZWQpIHtcclxuICAgICAgdGhpcy5vcHMgPSAndG9nZ2xlQWxsJ1xyXG4gICAgICB0aGlzLmxpc3QgPSB0aGlzLmxpc3QubWFwKFxyXG4gICAgICAgIHRvZG8gPT4gKHsgLi4udG9kbywgY29tcGxldGVkIH0pXHJcbiAgICAgICk7XHJcbiAgICAgIGluZm9ybSgpXHJcbiAgICB9LFxyXG4gICAgXHJcbiAgICB0b2dnbGUodG9kb1RvVG9nZ2xlKSB7XHJcbiAgICAgIC8vIHRoaXMub3BzID0gJ3RvZ2dsZSdcclxuICAgICAgdGhpcy5saXN0ID0gdGhpcy5saXN0Lm1hcCh0b2RvID0+XHJcbiAgICAgICAgdG9kby5pZCAhPT0gdG9kb1RvVG9nZ2xlLmlkID8gdG9kbyA6ICh7IC4uLnRvZG8sIC4uLnRvZG9Ub1RvZ2dsZX0pXHJcbiAgICAgIClcclxuICAgICAgaW5mb3JtKClcclxuICAgIH0sXHJcbiAgICBcclxuICAgIGRlc3Ryb3koaWQpIHtcclxuICAgICAgLy8gdGhpcy5vcHMgPSAnZGVzdHJveSdcclxuICAgICAgdGhpcy5saXN0ID0gdGhpcy5saXN0LmZpbHRlcih0ID0+IHQuaWQgIT09IGlkKVxyXG4gICAgICBpbmZvcm0oKVxyXG4gICAgfSxcclxuICAgIC8qXHJcbiAgICBzYXZlKHRvZG9Ub1NhdmUsIHRpdGxlKSB7XHJcbiAgICAgIG1vZGVsLnRvZG9zID0gbW9kZWwudG9kb3MubWFwKCB0b2RvID0+IChcclxuICAgICAgICB0b2RvICE9PSB0b2RvVG9TYXZlID8gdG9kbyA6ICh7IC4uLnRvZG8sIHRpdGxlIH0pXHJcbiAgICAgICkpO1xyXG4gICAgICBpbmZvcm0oKTtcclxuICAgIH0sXHJcblxyXG4gICAgY2xlYXJDb21wbGV0ZWQoKSB7XHJcbiAgICAgIG1vZGVsLnRvZG9zID0gbW9kZWwudG9kb3MuZmlsdGVyKCB0b2RvID0+ICF0b2RvLmNvbXBsZXRlZCApO1xyXG4gICAgICBpbmZvcm0oKTtcclxuICAgIH0gKi9cclxuICB9XHJcblxyXG4gIHJldHVybiBtb2RlbFxyXG59XHJcbiIsImV4cG9ydHMuaW5mb3JtID0gZnVuY3Rpb24oYmFzZSwgaW5wdXQpIHtcclxuICBmb3IgKHZhciBpID0gYmFzZS5vbkNoYW5nZXMubGVuZ3RoOyBpLS07KSB7XHJcbiAgICBiYXNlLm9uQ2hhbmdlc1tpXShpbnB1dClcclxuICB9XHJcbn1cclxuXHJcbmV4cG9ydHMuc3RvcmUgPSBmdW5jdGlvbihuYW1lc3BhY2UsIGRhdGEpIHtcclxuICBpZiAoYXJndW1lbnRzLmxlbmd0aCA+IDEpIHtcclxuICAgIHJldHVybiBsb2NhbFN0b3JhZ2Uuc2V0SXRlbShuYW1lc3BhY2UsIEpTT04uc3RyaW5naWZ5KGRhdGEpKVxyXG4gIH0gZWxzZSB7XHJcbiAgICB2YXIgc3RvcmUgPSBsb2NhbFN0b3JhZ2UuZ2V0SXRlbShuYW1lc3BhY2UpXHJcbiAgICByZXR1cm4gc3RvcmUgJiYgSlNPTi5wYXJzZShzdG9yZSkgfHwgW11cclxuICB9XHJcbn1cclxuXHJcbmV4cG9ydHMuY2FtZWxDYXNlID0gZnVuY3Rpb24ocykge1xyXG4gIHJldHVybiBzLmNoYXJBdCgwKS50b1VwcGVyQ2FzZSgpICsgcy5zbGljZSgxKVxyXG59XHJcblxyXG5leHBvcnRzLnNlbGVjdG9yID0gZnVuY3Rpb24gKGlkKSB7XHJcbiAgcmV0dXJuIGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3IoJ1trZWV0LWlkPVwiJyArIGlkICsgJ1wiXScpXHJcbn1cclxuXHJcbmV4cG9ydHMuZ2VuSWQgPSBmdW5jdGlvbigpIHtcclxuICByZXR1cm4gKE1hdGgucm91bmQoTWF0aC5yYW5kb20oKSAqIDB4MSoxZTEyKSkudG9TdHJpbmcoMzIpXHJcbn1cclxuXHJcbmV4cG9ydHMuZ2V0SWQgPSBmdW5jdGlvbiAoaWQpIHtcclxuICByZXR1cm4gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoaWQpXHJcbn1cclxuXHJcbmV4cG9ydHMuaHRtbCA9IGZ1bmN0aW9uIChsaXRlcmFsU2VjdGlvbnMsIC4uLnN1YnN0cykge1xyXG4gIC8vIFVzZSByYXcgbGl0ZXJhbCBzZWN0aW9uczogd2UgZG9u4oCZdCB3YW50XHJcbiAgLy8gYmFja3NsYXNoZXMgKFxcbiBldGMuKSB0byBiZSBpbnRlcnByZXRlZFxyXG4gIGxldCByYXcgPSBsaXRlcmFsU2VjdGlvbnMucmF3O1xyXG5cclxuICBsZXQgcmVzdWx0ID0gJyc7XHJcblxyXG4gIHN1YnN0cy5mb3JFYWNoKChzdWJzdCwgaSkgPT4ge1xyXG4gICAgICAvLyBSZXRyaWV2ZSB0aGUgbGl0ZXJhbCBzZWN0aW9uIHByZWNlZGluZ1xyXG4gICAgICAvLyB0aGUgY3VycmVudCBzdWJzdGl0dXRpb25cclxuICAgICAgbGV0IGxpdCA9IHJhd1tpXTtcclxuXHJcbiAgICAgIC8vIEluIHRoZSBleGFtcGxlLCBtYXAoKSByZXR1cm5zIGFuIGFycmF5OlxyXG4gICAgICAvLyBJZiBzdWJzdGl0dXRpb24gaXMgYW4gYXJyYXkgKGFuZCBub3QgYSBzdHJpbmcpLFxyXG4gICAgICAvLyB3ZSB0dXJuIGl0IGludG8gYSBzdHJpbmdcclxuICAgICAgaWYgKEFycmF5LmlzQXJyYXkoc3Vic3QpKSB7XHJcbiAgICAgICAgICBzdWJzdCA9IHN1YnN0LmpvaW4oJycpO1xyXG4gICAgICB9XHJcblxyXG4gICAgICAvLyBJZiB0aGUgc3Vic3RpdHV0aW9uIGlzIHByZWNlZGVkIGJ5IGEgZG9sbGFyIHNpZ24sXHJcbiAgICAgIC8vIHdlIGVzY2FwZSBzcGVjaWFsIGNoYXJhY3RlcnMgaW4gaXRcclxuICAgICAgaWYgKGxpdC5lbmRzV2l0aCgnJCcpKSB7XHJcbiAgICAgICAgICBzdWJzdCA9IGh0bWxFc2NhcGUoc3Vic3QpO1xyXG4gICAgICAgICAgbGl0ID0gbGl0LnNsaWNlKDAsIC0xKTtcclxuICAgICAgfVxyXG4gICAgICByZXN1bHQgKz0gbGl0O1xyXG4gICAgICByZXN1bHQgKz0gc3Vic3Q7XHJcbiAgfSk7XHJcbiAgLy8gVGFrZSBjYXJlIG9mIGxhc3QgbGl0ZXJhbCBzZWN0aW9uXHJcbiAgLy8gKE5ldmVyIGZhaWxzLCBiZWNhdXNlIGFuIGVtcHR5IHRlbXBsYXRlIHN0cmluZ1xyXG4gIC8vIHByb2R1Y2VzIG9uZSBsaXRlcmFsIHNlY3Rpb24sIGFuIGVtcHR5IHN0cmluZylcclxuICByZXN1bHQgKz0gcmF3W3Jhdy5sZW5ndGgtMV07IC8vIChBKVxyXG5cclxuICByZXR1cm4gcmVzdWx0O1xyXG59XHJcblxyXG5leHBvcnRzLmludGVsbGlVcGRhdGUgPSBmdW5jdGlvbihzdGF0ZSwgY2FsbGJhY2spIHtcclxuICAvLyBvbmx5IHVwZGF0ZSB3aGVuIG5lY2Vzc2FyeVxyXG4gIGlmIChzdGF0ZSkgY2xlYXJUaW1lb3V0KHN0YXRlKVxyXG4gIHN0YXRlID0gc2V0VGltZW91dChmdW5jdGlvbigpIHtcclxuICAgIGNhbGxiYWNrKClcclxuICB9LCAxMClcclxufSJdfQ==
