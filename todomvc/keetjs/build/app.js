(function () {
  'use strict';

  // function to resolve ternary operation

  var test = function test(str) {
    return str === '\'\'' || str === '""' || str === 'null' ? '' : str;
  };

  function ternaryOps (input) {
    if (input.match(/([^?]*)\?([^:]*):([^;]*)|(\s*=\s*)[^;]*/g)) {
      var t = input.split('?');
      var condition = t[0];
      var leftHand = t[1].split(':')[0];
      var rightHand = t[1].split(':')[1];

      // check the condition fulfillment

      if (this) {
        if (this[condition]) {
          return {
            value: test(leftHand),
            state: condition
          };
        } else {
          return {
            value: test(rightHand),
            state: condition
          };
        }
      }
      return false;
    } else return false;
  }

  var strInterpreter = (function (str) {
    var res = str.match(/\.*\./g);
    var result = void 0;
    if (res && res.length > 0) {
      return str.split('.');
    }
    return result;
  });

  function updateState (state, updateStateList) {
    if (typeof updateStateList === 'function') updateStateList(state);
  }

  function valAssign (node, value, replace, withTo) {
    value = value.replace(replace, withTo);
    if (node) node.nodeValue = value;
  }

  var re = /{{([^{}]+)}}/g;

  function replaceHandleBars (value, node, ins, updateStateList, templateParse, isAttr) {
    var props = value.match(re);
    var ln = props.length;
    var rep = void 0;
    var tnr = void 0;
    var isObjectNotation = void 0;
    while (ln) {
      ln--;
      rep = props[ln].replace(re, '$1');
      tnr = ternaryOps.call(ins, rep);
      isObjectNotation = strInterpreter(rep);
      if (isObjectNotation) {
        updateState(rep, updateStateList);
        valAssign(node, value, '{{' + rep + '}}', ins[isObjectNotation[0]][isObjectNotation[1]]);
      } else {
        if (tnr) {
          updateState(tnr.state, updateStateList);
          if (!isAttr) {
            valAssign(node, value, '{{' + rep + '}}', tnr.value);
          } else {
            return tnr.value;
          }
        } else {
          if (ins[rep] !== undefined) {
            updateState(rep, updateStateList);
            if (!isAttr) {
              valAssign(node, value, '{{' + rep + '}}', ins[rep]);
            } else {
              return ins[rep];
            }
          }
        }
      }
    }
  }

  var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) {
    return typeof obj;
  } : function (obj) {
    return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj;
  };

  var classCallCheck = function (instance, Constructor) {
    if (!(instance instanceof Constructor)) {
      throw new TypeError("Cannot call a class as a function");
    }
  };

  var createClass = function () {
    function defineProperties(target, props) {
      for (var i = 0; i < props.length; i++) {
        var descriptor = props[i];
        descriptor.enumerable = descriptor.enumerable || false;
        descriptor.configurable = true;
        if ("value" in descriptor) descriptor.writable = true;
        Object.defineProperty(target, descriptor.key, descriptor);
      }
    }

    return function (Constructor, protoProps, staticProps) {
      if (protoProps) defineProperties(Constructor.prototype, protoProps);
      if (staticProps) defineProperties(Constructor, staticProps);
      return Constructor;
    };
  }();

  var _extends = Object.assign || function (target) {
    for (var i = 1; i < arguments.length; i++) {
      var source = arguments[i];

      for (var key in source) {
        if (Object.prototype.hasOwnProperty.call(source, key)) {
          target[key] = source[key];
        }
      }
    }

    return target;
  };

  var inherits = function (subClass, superClass) {
    if (typeof superClass !== "function" && superClass !== null) {
      throw new TypeError("Super expression must either be null or a function, not " + typeof superClass);
    }

    subClass.prototype = Object.create(superClass && superClass.prototype, {
      constructor: {
        value: subClass,
        enumerable: false,
        writable: true,
        configurable: true
      }
    });
    if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass;
  };

  var possibleConstructorReturn = function (self, call) {
    if (!self) {
      throw new ReferenceError("this hasn't been initialised - super() hasn't been called");
    }

    return call && (typeof call === "object" || typeof call === "function") ? call : self;
  };

  var taggedTemplateLiteralLoose = function (strings, raw) {
    strings.raw = raw;
    return strings;
  };

  var genId = function genId() {
    var rd = function rd() {
      return (Math.random() * 1 * 1e17).toString(36);
    };
    return 'KDATA-' + rd() + '-' + rd();
  };

  var minId = function minId() {
    return (Math.random() * 1 * 1e17).toString(36);
  };

  var getId = function getId(id) {
    return document.getElementById(id);
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
  var checkNodeAvailability = function checkNodeAvailability(component, componentName, callback, notFound) {
    var ele = getId(component.el);
    var found = false;
    var t = void 0;
    function find() {
      ele = getId(component.el);
      if (ele) {
        clearInterval(t);
        found = true;
        callback(component, componentName, ele);
      }
    }
    function fail() {
      clearInterval(t);
      if (!found && notFound && typeof notFound === 'function') notFound();
    }
    if (ele) return ele;else {
      t = setInterval(find, 0);
      // ignore finding the node after sometimes
      setTimeout(fail, 5);
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
  var assert$1 = function assert(val, msg) {
    if (!val) throw new Error('(keet) ' + msg);
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
  var html = function html() {
    for (var _len = arguments.length, args = Array(_len), _key = 0; _key < _len; _key++) {
      args[_key] = arguments[_key];
    }

    var literals = args.shift();
    var substs = args.slice();

    var result = literals.raw.reduce(function (acc, lit, i) {
      return acc + substs[i - 1] + lit;
    });
    // remove spacing, indentation from every line
    result = result.split(/\n+/);
    result = result.map(function (t) {
      return t.trim();
    }).join('');
    return result;
  };

  var notEqual = function notEqual(a, b) {
    return a['kdata-id'] !== b['kdata-id'];
  };

  var inform = function inform(model) {
    this.exec && typeof this.exec === 'function' && this.exec(model);
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

  var createModel = function () {
    function createModel() {
      classCallCheck(this, createModel);

      this.model = [];
      this.exec = null;

      /**
       * @private
       * @description
       * Register callback listener of any changes
       */
      Object.defineProperty(this, 'list', {
        enumerable: false,
        configurable: true,
        get: function get$$1() {
          return this.model;
        },
        set: function set$$1(val) {
          this.model = val;
          inform.call(this, this.model);
        }
      });
    }

    /**
    * @private
    * @description
    * Subscribe to the model changes (add/update/destroy)
    *
    * @param {Object} model - the model including all prototypes
    *
    */


    createModel.prototype.subscribe = function subscribe(fn) {
      this.exec = fn;
    };

    /**
    * @private
    * @description
    * Add new object to the model list
    *
    * @param {Object} obj - new object to add into the model list
    *
    */


    createModel.prototype.add = function add(obj) {
      this.list = this.list.concat(_extends({}, obj, { 'kdata-id': minId() }));
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
    // update (lookupId, updateObj) {
    //   this.list = this.list.map(obj =>
    //     obj[lookupId] !== updateObj[lookupId] ? obj : Object.assign(obj, updateObj)
    //   )
    // }


    createModel.prototype.update = function update(updateObj) {
      this.list = this.list.map(function (obj) {
        return notEqual(obj, updateObj) ? obj : updateObj;
      }
      // ( obj !== updateObj ? obj : updateObj)
      );
    };
    // this.todos = this.todos.map( todo => (
    //     todo !== todoToToggle ? todo : ({ ...todo, completed: !todo.completed })
    //   ) );
    /**
    * @private
    * @description
    * Removed existing object in the model list
    *
    * @param {String} lookupId - lookup id property name of the object
    * @param {String} objId - unique identifier of the lookup id
    *
    */


    createModel.prototype.destroy = function destroy(destroyObj) {
      this.list = this.list.filter(function (obj) {
        return notEqual(obj, destroyObj);
      });
    };
    // destroy (lookupId, objId) {
    //   this.list = this.list.filter(obj =>
    //     obj[lookupId] !== objId
    //   )
    // }


    return createModel;
  }();

  var re$1 = new RegExp(/(\schecked=")(.*?)(?=")/g);

  var tmpl = '';
  var rep = void 0;
  var isTernary = void 0;
  var i = void 0;
  var len = void 0;
  var match = void 0;

  var genModelTemplate = (function (string, obj) {
    var arrProps = string.match(/{{([^{}]+)}}/g);
    tmpl = string;
    for (i = 0, len = arrProps.length; i < len; i++) {
      rep = arrProps[i].replace(/{{([^{}]+)}}/g, '$1');
      isTernary = ternaryOps.call(obj, rep);
      if (isTernary) {
        tmpl = tmpl.replace('{{' + rep + '}}', isTernary.value);
      } else {
        tmpl = tmpl.replace('{{' + rep + '}}', obj[rep]);
      }

      match = tmpl.match(re$1);
      if (match) {
        if (match[0].length === 17) {
          tmpl = tmpl.replace(' checked="checked"', ' checked');
        } else {
          tmpl = tmpl.replace(' checked=""', '');
        }
      }
    }
    return tmpl;
  });

  // diffing two array of objects, including object properties differences
  var diff = function diff(fst, sec) {
    return fst.filter(function (obj) {
      return !sec.some(function (inr) {
        var predicate = true;
        for (var attr in inr) {
          if (obj[attr] !== inr[attr]) {
            predicate = false;
          }
        }
        return predicate;
      });
    });
  };

  // check if browser support createRange
  var range = void 0;
  if (typeof document.createRange === 'function') {
    range = document.createRange();
  }

  // storage for model state
  var cache = {};

  var m = void 0;
  var documentFragment = void 0;
  function render(str, obj) {
    m = genModelTemplate(str, obj);
    documentFragment = range.createContextualFragment(m);
    documentFragment.firstChild.setAttribute('kdata-id', obj['kdata-id']);
  }

  function genModelList (node, model, tmplHandler) {
    // console.time('uu')
    var modelList = void 0;
    var i = void 0;
    var listClone = void 0;
    var parentNode = void 0;
    var updateOfNew = void 0;
    var diffOfOld = void 0;
    var pNode = void 0;
    var equalLength = void 0;
    var child = void 0;
    var list = void 0;
    var str = void 0;
    var oldModel = void 0;
    var p = void 0;

    cache[model] = cache[model] || {};

    if (!cache[model].list) {
      cache[model].list = node.nextSibling.cloneNode(true);
    }
    list = cache[model].list;

    if (!cache[model].str) {
      cache[model].str = node.nextSibling.cloneNode(true).outerHTML;
      // remove the first prototype node
      node.nextSibling.remove();
      // also remove from pristine node
      p = this.__pristineFragment__.getElementById(node.parentNode.id);
      if (p) p.childNodes[1].remove();
    }
    str = cache[model].str;

    if (this[model] !== undefined && this[model].hasOwnProperty('list')) {
      parentNode = node.parentNode;

      if (range && !parentNode.hasAttribute('data-ignore')) {
        parentNode.setAttribute('data-ignore', '');
      }

      modelList = this[model].list;

      oldModel = cache[model].oldModel || [];

      // check if current browser doesn't support createRange()
      if (!range) {
        i = 0;
        while (i < modelList.length) {
          // fallback to regular node generation handler
          listClone = list.cloneNode(true);
          tmplHandler(this, null, listClone, modelList[i]);
          listClone.setAttribute('kdata-id', modelList[i]['kdata-id']);
          parentNode.insertBefore(listClone, null);
          i++;
        }
      } else {
        updateOfNew = diff(modelList, oldModel);
        diffOfOld = diff(oldModel, modelList);

        var diffModel = function diffModel() {
          for (var _len = arguments.length, args = Array(_len), _key = 0; _key < _len; _key++) {
            args[_key] = arguments[_key];
          }

          pNode = args.pop();
          // check if both models are equally in length
          equalLength = oldModel.length === modelList.length;

          // do properties update
          if (equalLength) {
            // console.log( new Date() - window.t)
            // console.time('u')
            i = 0;
            while (i < updateOfNew.length) {
              child = pNode.querySelector('[kdata-id="' + updateOfNew[i]['kdata-id'] + '"]');
              render(str, updateOfNew[i]);
              pNode.replaceChild(documentFragment, child);
              i++;
            }
            // console.timeEnd('u')
            // add new objects
          } else if (updateOfNew.length > 0 && diffOfOld.length === 0) {
            i = 0;
            while (i < updateOfNew.length) {
              render(str, updateOfNew[i]);
              pNode.insertBefore(documentFragment, pNode.lastChild);
              i++;
            }
            // destroy selected objects
          } else if (updateOfNew.length === 0 && diffOfOld.length > 0) {
            i = 0;
            while (i < diffOfOld.length) {
              child = pNode.querySelector('[kdata-id="' + diffOfOld[i]['kdata-id'] + '"]');
              pNode.removeChild(child);
              i++;
            }
          }
          // replace oldModel after diffing
          cache[model].oldModel = JSON.parse(JSON.stringify(modelList));
        };

        // check existing parentNode in the DOM
        if (parentNode.hasAttribute('id')) {
          pNode = getId(parentNode.id);

          if (pNode) {
            diffModel.call(this, null, null, pNode);
          } else {
            checkNodeAvailability({ el: parentNode.id }, model, diffModel.bind(this), function () {
              // we cleanup cache on failed search
              cache[model].oldModel = [];
            });
          }
        }
      }
    } else {
      assert$1(false, 'Model "' + model + '" does not exist.');
    }
    // console.timeEnd('uu')
  }

  var conditionalNodesRawStart = /\{\{\?([^{}]+)\}\}/g;
  var conditionalNodesRawEnd = /\{\{\/([^{}]+)\}\}/g;
  var DOCUMENT_ELEMENT_TYPE$1 = 1;
  function conditionalNodes (node, conditional, tmplHandler) {
    var frag = document.createDocumentFragment();
    var entryNode = void 0;
    var currentNode = void 0;
    var isGen = void 0;
    var cNode = void 0;
    while (node) {
      currentNode = node;
      node = node.nextSibling;
      if (currentNode.nodeType !== DOCUMENT_ELEMENT_TYPE$1) {
        if (currentNode.nodeValue.match(conditionalNodesRawStart)) {
          entryNode = currentNode;
        } else if (currentNode.nodeValue.match(conditionalNodesRawEnd)) {
          // currentNode.remove()
          // star generating the conditional nodes range, if not yet
          if (!isGen) {
            isGen = true;
            tmplHandler(this, null, null, null, frag);
          }
          if (this[conditional]) {
            entryNode.parentNode.insertBefore(frag, entryNode);
          }
          // entryNode.remove()
          node = null;
        }
      } else {
        cNode = currentNode.cloneNode(true);
        frag.appendChild(cNode);
        currentNode.remove();
      }
    }
  }

  var cacheInit = {};

  function componentParse (componentStr, node) {
    var component = componentStr.replace('component:', '');
    var c = this[component];

    if (c !== undefined) {
      // this is for initial component runner
      if (!cacheInit[c.ID]) {
        c.render.call(c, true);
        cacheInit[c.ID] = c.base.cloneNode(true);
        node.parentNode.replaceChild(c.base, node);
      } else {
        // we need to reattach event listeners if the node is not available on DOM
        if (!getId(this[component].el)) {
          c.base = c.__pristineFragment__.cloneNode(true);
          c.render.call(c, true);
          node.parentNode.replaceChild(c.base, node);
        } else {
          node.parentNode.replaceChild(cacheInit[c.ID].cloneNode(true), node);
        }
      }
      // inform sub-component to update
      c.callBatchPoolUpdate();
    } else {
      assert$1(false, 'Component ' + component + ' does not exist.');
    }
  }

  var re$3 = /{{([^{}]+)}}/g;
  var model = /^model:/g;
  var conditionalRe = /^\?/g;
  var component = /^component:([^{}]+)/g;

  function replaceCommentBlock (value, node, ins, updateStateList, templateParse) {
    var conditionalRep = void 0;
    var rep = void 0;
    var modelRep = void 0;
    if (value.match(re$3)) {
      rep = value.replace(re$3, '$1').trim();
      if (rep.match(model)) {
        modelRep = rep.replace('model:', '');
        genModelList.call(this, node, modelRep, templateParse);
      } else if (rep.match(conditionalRe)) {
        conditionalRep = rep.replace('?', '');
        if (ins[conditionalRep] !== undefined) {
          updateState(conditionalRep, updateStateList);
          conditionalNodes.call(this, node, conditionalRep, templateParse);
        }
      } else if (rep.match(component)) {
        componentParse.call(this, rep, node);
      }
    }
  }

  var DOCUMENT_ELEMENT_TYPE$2 = 1;

  var re$4 = /{{([^{}]+)}}/g;
  var modelRaw = /\{\{model:([^{}]+)\}\}/g;

  var lookUpEvtNode = function lookUpEvtNode(node) {
    return !!(node.hasAttribute('id') && getId(node.id) && node.hasAttribute('evt-node'));
  };

  function lookupParentNode(rootNode, node) {
    var cNode = void 0;
    while (node) {
      cNode = node;
      node = node.parentNode;
      if (cNode.nodeType === DOCUMENT_ELEMENT_TYPE$2 && cNode.hasAttribute('kdata-id')) {
        return cNode.getAttribute('kdata-id');
      }
      if (cNode.isEqualNode(rootNode)) {
        node = null;
      }
    }
  }

  var nodeAttributes = void 0;
  var i$1 = 0;
  var a = void 0;
  var ns = void 0;
  var evtName = void 0;
  var c = void 0;
  var h = void 0;
  var handlerArgs = void 0;
  var argv = void 0;
  var handler = void 0;
  var name = void 0;
  var p = void 0;
  var model$1 = void 0;
  var rep$1 = void 0;
  var t = void 0;

  var getIndex = function getIndex(id) {
    return model$1.list.map(function (m) {
      return m['kdata-id'];
    }).indexOf(id);
  };

  function addEvent (node) {

    nodeAttributes = node.attributes;
    if (lookUpEvtNode(node)) ; else {
      // only add event when node does not has one
      for (i$1 = nodeAttributes.length; i$1--;) {
        a = nodeAttributes[i$1];
        name = a.localName;
        ns = a.nodeValue;
        if (/^k-/.test(name)) {
          evtName = name.replace(/^k-/, '');
          handler = ns.match(/[a-zA-Z]+(?![^(]*\))/)[0];
          c = this[handler];
          if (c !== undefined && typeof c === 'function') {
            h = ns.match(/\(([^{}]+)\)/);
            handlerArgs = h ? h[1] : '';
            argv = handlerArgs.split(',').filter(function (f) {
              return f !== '';
            });

            // if node is the rootNode for model, we wrap the eventListener and
            // rebuild the arguments by appending id/className util rootNode.
            if (node.hasChildNodes() && node.firstChild.nodeType !== DOCUMENT_ELEMENT_TYPE$2 && node.firstChild.nodeValue.match(modelRaw)) {
              var _fn = function _fn(e) {
                e.stopPropagation();
                if (e.target !== e.currentTarget) {
                  t = lookupParentNode(node, e.target);
                  c.apply(this, [model$1.list[getIndex(t)], e.target, e]);
                }
              };

              rep$1 = node.firstChild.nodeValue.replace(re$4, '$1').trim();
              rep$1 = rep$1.replace('model:', '');
              model$1 = this[rep$1];

              node.addEventListener(evtName, _fn.bind(this), false);
            } else {
              node.addEventListener(evtName, c.bind.apply(c.bind(this), [node].concat(argv)), false);
            }
            if (!node.hasAttribute('evt-node')) {
              node.setAttribute('evt-node', '');
              if (node.hasAttribute('id')) {
                p = this.__pristineFragment__.getElementById(node.id);
                p.setAttribute('evt-node', '');
              }
            }
          }
        }
      }
    }
  }

  var DOCUMENT_ELEMENT_TYPE$3 = 1;
  var DOCUMENT_COMMENT_TYPE = 8;
  var re$5 = /{{([^{}]+)}}/g;

  function templateParse(ctx, updateStateList, modelInstance, modelObject, conditional) {

    var currentNode = void 0;
    var fragment = void 0;
    var instance = void 0;
    var nodeAttributes = void 0;
    var i = 0;
    var a = void 0;
    var ns = void 0;
    var name = void 0;

    if (modelObject) {
      instance = modelInstance;
    } else if (conditional) {
      instance = conditional.firstChild;
    } else {
      fragment = ctx.base;
      instance = fragment.firstChild;
    }

    var ins = modelObject || ctx;

    var inspectAttributes = function inspectAttributes(node) {
      nodeAttributes = node.attributes;
      for (i = nodeAttributes.length; i--;) {
        a = nodeAttributes[i];
        name = a.localName;
        ns = a.nodeValue;
        if (re$5.test(name)) {
          node.removeAttribute(name);
          name = replaceHandleBars(name, node, ins, null, null, true);
          node.setAttribute(name, ns);
        } else if (re$5.test(ns)) {
          ns = replaceHandleBars(ns, node, ins, null, null, true);
          if (ns === '') {
            node.removeAttribute(name);
          } else {
            if (name === 'checked') {
              node.setAttribute(name, '');
            } else {
              node.setAttribute(name, ns);
            }
          }
        }
      }
    };

    var check = function check(node) {
      while (node) {
        currentNode = node;
        if (currentNode.nodeType === DOCUMENT_ELEMENT_TYPE$3) {
          if (currentNode.hasAttributes()) {
            addEvent.call(ctx, currentNode);
            inspectAttributes(currentNode);
          }
          check(currentNode.firstChild);
        } else if (currentNode.nodeValue.match(re$5)) {
          if (currentNode.nodeType === DOCUMENT_COMMENT_TYPE) {
            replaceCommentBlock.call(ctx, currentNode.nodeValue, currentNode, ins, updateStateList, templateParse);
          } else {
            replaceHandleBars.call(ctx, currentNode.nodeValue, currentNode, ins, updateStateList, templateParse);
          }
        }
        node = node.nextSibling;
      }
    };

    check(instance);
  }

  var parser = window.DOMParser && new window.DOMParser();
  var documentRootName = 'HTML';
  var supportsHTMLType = false;
  var supportsInnerHTML = false;
  var htmlType = 'text/html';
  var xhtmlType = 'application/xhtml+xml';
  var testClass = 'A';
  var testCode = '<wbr class="' + testClass + '"/>';

  try {
    // Check if browser supports text/html DOMParser
    var parsed = parser.parseFromString(testCode, htmlType).body.firstChild;
    // Some browsers (iOS 9 and Safari 9) lowercase classes for parsed elements
    // but only when appending to DOM, so use innerHTML instead
    var d = document.createElement('div');
    d.appendChild(parsed);
    if (d.firstChild.classList[0] !== testClass) throw new Error();
    supportsHTMLType = true;
  } catch (e) {}

  var mockDoc = document.implementation.createHTMLDocument('');
  var mockHTML = mockDoc.documentElement;
  var mockBody = mockDoc.body;
  try {
    // Check if browser supports documentElement.innerHTML
    mockHTML.innerHTML += '';
    supportsInnerHTML = true;
  } catch (e) {
    // Check if browser supports xhtml parsing.
    parser.parseFromString(testCode, xhtmlType);
    var bodyReg = /(<body[^>]*>)([\s\S]*)<\/body>/;
  }

  function DOMParserParse(markup, rootName) {
    var doc = parser.parseFromString(markup, htmlType);
    // Patch for iOS UIWebView not always returning doc.body synchronously
    if (!doc.body) {
      return fallbackParse(markup, rootName);
    }

    return rootName === documentRootName ? doc.documentElement : doc.body.firstChild;
  }

  function fallbackParse(markup, rootName) {
    // Fallback to innerHTML for other older browsers.
    if (rootName === documentRootName) {
      if (supportsInnerHTML) {
        mockHTML.innerHTML = markup;
        return mockHTML;
      } else {
        // IE9 does not support innerhtml at root level.
        // We get around this by parsing everything except the body as xhtml.
        var bodyMatch = markup.match(bodyReg);
        if (bodyMatch) {
          var bodyContent = bodyMatch[2];
          var startBody = bodyMatch.index + bodyMatch[1].length;
          var endBody = startBody + bodyContent.length;
          markup = markup.slice(0, startBody) + markup.slice(endBody);
          mockBody.innerHTML = bodyContent;
        }

        var doc = parser.parseFromString(markup, xhtmlType);
        var body = doc.body;
        while (mockBody.firstChild) {
          body.appendChild(mockBody.firstChild);
        }return doc.documentElement;
      }
    } else {
      mockBody.innerHTML = markup;
      return mockBody.firstChild;
    }
  }

  /**
   * Returns the results of a DOMParser as an HTMLElement.
   * (Shims for older browsers).
   */
  var parseHtml = supportsHTMLType ? DOMParserParse : fallbackParse;

  setDOM.KEY = 'data-key';
  setDOM.IGNORE = 'data-ignore';
  setDOM.CHECKSUM = 'data-checksum';

  var KEY_PREFIX = '_set-dom-';
  var NODE_MOUNTED = KEY_PREFIX + 'mounted';
  var ELEMENT_TYPE = 1;
  var DOCUMENT_TYPE = 9;
  var DOCUMENT_FRAGMENT_TYPE = 11;

  // Expose api.
  var src = setDOM;

  /**
   * @description
   * Updates existing dom to match a new dom.
   *
   * @param {Node} oldNode - The html entity to update.
   * @param {String|Node} newNode - The updated html(entity).
   */
  function setDOM(oldNode, newNode) {
    // Ensure a realish dom node is provided.
    assert$2(oldNode && oldNode.nodeType, 'You must provide a valid node to update.');

    // Alias document element with document.
    if (oldNode.nodeType === DOCUMENT_TYPE) oldNode = oldNode.documentElement;

    // Document Fragments don't have attributes, so no need to look at checksums, ignored, attributes, or node replacement.
    if (newNode.nodeType === DOCUMENT_FRAGMENT_TYPE) {
      // Simply update all children (and subchildren).
      setChildNodes(oldNode, newNode);
    } else {
      // Otherwise we diff the entire old node.
      setNode(oldNode, typeof newNode === 'string'
      // If a string was provided we will parse it as dom.
      ? parseHtml(newNode, oldNode.nodeName) : newNode);
    }

    // Trigger mount events on initial set.
    if (!oldNode[NODE_MOUNTED]) {
      oldNode[NODE_MOUNTED] = true;
      mount(oldNode);
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
  function setNode(oldNode, newNode) {
    if (oldNode.nodeType === newNode.nodeType) {
      // Handle regular element node updates.
      if (oldNode.nodeType === ELEMENT_TYPE) {
        // Checks if nodes are equal before diffing.
        if (isEqualNode(oldNode, newNode)) return;

        // Update all children (and subchildren).
        setChildNodes(oldNode, newNode);

        // Update the elements attributes / tagName.
        if (oldNode.nodeName === newNode.nodeName) {
          // If we have the same nodename then we can directly update the attributes.
          setAttributes(oldNode.attributes, newNode.attributes);
        } else {
          // Otherwise clone the new node to use as the existing node.
          var newPrev = newNode.cloneNode();
          // Copy over all existing children from the original node.
          while (oldNode.firstChild) {
            newPrev.appendChild(oldNode.firstChild);
          } // Replace the original node with the new one with the right tag.
          oldNode.parentNode.replaceChild(newPrev, oldNode);
        }
      } else {
        // Handle other types of node updates (text/comments/etc).
        // If both are the same type of node we can update directly.
        if (oldNode.nodeValue !== newNode.nodeValue) {
          oldNode.nodeValue = newNode.nodeValue;
        }
      }
    } else {
      // we have to replace the node.
      oldNode.parentNode.replaceChild(newNode, dismount(oldNode));
      mount(newNode);
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
  function setAttributes(oldAttributes, newAttributes) {
    var i, a, b, ns, name;

    // Remove old attributes.
    for (i = oldAttributes.length; i--;) {
      a = oldAttributes[i];
      ns = a.namespaceURI;
      name = a.localName;
      b = newAttributes.getNamedItemNS(ns, name);
      if (!b) oldAttributes.removeNamedItemNS(ns, name);
    }

    // Set new attributes.
    for (i = newAttributes.length; i--;) {
      a = newAttributes[i];
      ns = a.namespaceURI;
      name = a.localName;
      b = oldAttributes.getNamedItemNS(ns, name);
      if (!b) {
        // Add a new attribute.
        newAttributes.removeNamedItemNS(ns, name);
        oldAttributes.setNamedItemNS(a);
      } else if (b.value !== a.value) {
        // Update existing attribute.
        b.value = a.value;
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
  function setChildNodes(oldParent, newParent) {
    var checkOld, oldKey, checkNew, newKey, foundNode, keyedNodes;
    var oldNode = oldParent.firstChild;
    var newNode = newParent.firstChild;
    var extra = 0;

    // Extract keyed nodes from previous children and keep track of total count.
    while (oldNode) {
      extra++;
      checkOld = oldNode;
      oldKey = getKey(checkOld);
      oldNode = oldNode.nextSibling;

      if (oldKey) {
        if (!keyedNodes) keyedNodes = {};
        keyedNodes[oldKey] = checkOld;
      }
    }

    // Loop over new nodes and perform updates.
    oldNode = oldParent.firstChild;
    while (newNode) {
      extra--;
      checkNew = newNode;
      newNode = newNode.nextSibling;

      if (keyedNodes && (newKey = getKey(checkNew)) && (foundNode = keyedNodes[newKey])) {
        delete keyedNodes[newKey];
        // If we have a key and it existed before we move the previous node to the new position if needed and diff it.
        if (foundNode !== oldNode) {
          oldParent.insertBefore(foundNode, oldNode);
        } else {
          oldNode = oldNode.nextSibling;
        }

        setNode(foundNode, checkNew);
      } else if (oldNode) {
        checkOld = oldNode;
        oldNode = oldNode.nextSibling;
        if (getKey(checkOld)) {
          // If the old child had a key we skip over it until the end.
          oldParent.insertBefore(checkNew, checkOld);
          mount(checkNew);
        } else {
          // Otherwise we diff the two non-keyed nodes.
          setNode(checkOld, checkNew);
        }
      } else {
        // Finally if there was no old node we add the new node.
        oldParent.appendChild(checkNew);
        mount(checkNew);
      }
    }

    // Remove old keyed nodes.
    for (oldKey in keyedNodes) {
      extra--;
      oldParent.removeChild(dismount(keyedNodes[oldKey]));
    }

    // If we have any remaining unkeyed nodes remove them from the end.
    while (--extra >= 0) {
      oldParent.removeChild(dismount(oldParent.lastChild));
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
  function getKey(node) {
    if (node.nodeType !== ELEMENT_TYPE) return;
    var key = node.getAttribute(setDOM.KEY) || node.id;
    if (key) return KEY_PREFIX + key;
  }

  /**
   * Checks if nodes are equal using the following by checking if
   * they are both ignored, have the same checksum, or have the
   * same contents.
   *
   * @param {Node} a - One of the nodes to compare.
   * @param {Node} b - Another node to compare.
   */
  function isEqualNode(a, b) {
    return (
      // Check if both nodes are ignored.
      isIgnored(a) && isIgnored(b) ||
      // Check if both nodes have the same checksum.
      getCheckSum(a) === getCheckSum(b) ||
      // Fall back to native isEqualNode check.
      a.isEqualNode(b)
    );
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
  function getCheckSum(node) {
    return node.getAttribute(setDOM.CHECKSUM) || NaN;
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
  function isIgnored(node) {
    return node.getAttribute(setDOM.IGNORE) != null;
  }

  /**
   * Dispatches a mount event for the given node and children.
   *
   * @param {Node} node - the node to mount.
   * @return {node}
   */
  function mount(node) {
    return dispatch(node, 'mount');
  }

  /**
   * Dispatches a dismount event for the given node and children.
   *
   * @param {Node} node - the node to dismount.
   * @return {node}
   */
  function dismount(node) {
    return dispatch(node, 'dismount');
  }

  /**
   * Recursively trigger an event for a node and it's children.
   * Only emits events for keyed nodes.
   *
   * @param {Node} node - the initial node.
   * @return {Node}
   */
  function dispatch(node, type) {
    // Trigger event for this element if it has a key.
    if (getKey(node)) {
      var ev = document.createEvent('Event');
      var prop = { value: node };
      ev.initEvent(type, false, false);
      Object.defineProperty(ev, 'target', prop);
      Object.defineProperty(ev, 'srcElement', prop);
      node.dispatchEvent(ev);
    }

    // Dispatch to all children.
    var child = node.firstChild;
    while (child) {
      child = dispatch(child, type).nextSibling;
    }return node;
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
  function assert$2(val, msg) {
    if (!val) throw new Error('set-dom: ' + msg);
  }

  src.KEY = 'kdata-id';

  var DELAY = 1;
  var el = void 0;

  var morpher = function morpher() {
    if (this.el === 'todo-list') ;
    el = getId(this.el);
    genElement.call(this);
    if (this.el === 'todo-list') ;
    if (el) {
      this.IS_STUB ? src(el, this.base.firstChild) : src(el, this.base);
    }
    // exec life-cycle componentDidUpdate
    if (this.componentDidUpdate && typeof this.componentDidUpdate === 'function') {
      this.componentDidUpdate();
    }
  };

  var timer = {};
  var updateContext = function updateContext(fn, delay) {
    var _this = this;

    // if(this.el === 'todo-list'){
    //   window.t = new Date()
    // }
    timer[this.ID] = timer[this.ID] || null;
    clearTimeout(timer[this.ID]);
    timer[this.ID] = setTimeout(function () {
      return fn.call(_this);
    }, delay);
  };

  var nextState = function nextState(i) {
    var state = void 0;
    var value = void 0;
    if (i < stateList.length) {
      state = stateList[i];
      value = this[state];

      // if value is undefined, likely has object notation we convert it to array
      if (value === undefined) value = strInterpreter(state);

      if (value && Array.isArray(value)) {
        // using split object notation as base for state update
        var inVal = this[value[0]][value[1]];
        Object.defineProperty(this[value[0]], value[1], {
          enumerable: false,
          configurable: true,
          get: function get() {
            return inVal;
          },
          set: function set(val) {
            inVal = val;
            updateContext.call(this, morpher, DELAY);
          }
        });
      } else {
        // handle parent state update if the state is not an object
        Object.defineProperty(this, state, {
          enumerable: false,
          configurable: true,
          get: function get() {
            return value;
          },
          set: function set(val) {
            value = val;
            updateContext.call(this, morpher, DELAY);
          }
        });
      }
      i++;
      nextState.call(this, i);
    }
  };

  var setState = function setState() {
    nextState.call(this, 0);
  };

  var stateList = [];

  var clearState = function clearState() {
    stateList = [];
  };

  var addState = function addState(state) {
    if (stateList.indexOf(state) === -1) {
      stateList = stateList.concat(state);
    }
  };

  var genElement = function genElement() {
    this.base = this.__pristineFragment__.cloneNode(true);
    templateParse(this, addState);
  };

  var DOCUMENT_ELEMENT_TYPE$4 = 1;

  function parseStr (stub) {
    templateParse(this, addState);
    var el = stub || getId(this.el);
    if (el) {
      if (el.nodeType === DOCUMENT_ELEMENT_TYPE$4) {
        el.setAttribute('data-ignore', '');
      } else {
        assert$1(this.base.childNodes.length === 1, 'Sub-component should only has a single rootNode.');
        !this.base.firstChild.hasAttribute('data-ignore') && this.base.firstChild.setAttribute('data-ignore', '');
      }
      // listen to state changes
      setState.call(this);

      // mount fragment to DOM
      if (!stub) {
        el.appendChild(this.base);
      }

      // since component already rendered, trigger its life-cycle method
      if (this.componentDidMount && typeof this.componentDidMount === 'function') {
        this.componentDidMount();
      }
    } else {
      assert$1(false, 'No element with id: "' + this.el + '" exist.');
    }
  }

  var DOCUMENT_FRAGMENT_TYPE$1 = 11;
  var DOCUMENT_TEXT_TYPE = 3;
  var DOCUMENT_ELEMENT_TYPE$5 = 1;
  /**
   * @private
   * @description
   * Mount an instance of string or html elements
   *
   * @param {String|Object} instance - the html/string 
   */
  function _mount (instance) {
    var base = void 0;
    var tempDiv = void 0;
    var frag = document.createDocumentFragment();
    // Before we begin to parse an instance, do a run-down checks
    // to clean up back-tick string which usually has line spacing.
    if (typeof instance === 'string') {
      base = instance.trim().replace(/\s+/g, ' ');
      tempDiv = document.createElement('div');
      tempDiv.innerHTML = base;
      while (tempDiv.firstChild) {
        frag.appendChild(tempDiv.firstChild);
      }
      // If instance is a html element process as html entities
    } else if ((typeof instance === 'undefined' ? 'undefined' : _typeof(instance)) === 'object' && instance['nodeType']) {
      if (instance['nodeType'] === DOCUMENT_ELEMENT_TYPE$5) {
        frag.appendChild(instance);
      } else if (instance['nodeType'] === DOCUMENT_FRAGMENT_TYPE$1) {
        frag = instance;
      } else if (instance['nodeType'] === DOCUMENT_TEXT_TYPE) {
        frag.appendChild(instance);
      } else {
        assert(false, 'Unable to parse instance, unknown type.');
      }
    } else {
      assert(false, 'Parameter is not a string or a html element.');
    }
    // we store the pristine instance in __pristineFragment__
    this.__pristineFragment__ = frag.cloneNode(true);
    this.base = frag;

    // cleanup states on mount
    clearState();
    return this;
  }

  /**
   * Keetjs v4.0.0 Alpha release: https://github.com/keetjs/keet.js
   * Minimali4.0.0ew layer for the web
   *
   * <<<<<<<<<<<<<<<<<<<<<<<<<<<<<< Keetjs >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
   *
   * Copyright 2018, Shahrul Nizam Selamat
   * Released under the MIT License.
   */

  window.l = console.log.bind(console);

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

  var Keet = function () {
    function Keet() {
      classCallCheck(this, Keet);

      this.ID = Keet.indentity;
    }

    // generate ID for the component


    Keet.prototype.mount = function mount(instance) {
      return _mount.call(this, instance);
    };

    Keet.prototype.link = function link(id) {
      // The target DOM where the rendering will took place.
      if (!id) assert$1(id, 'No id is given as parameter.');
      this.el = id;
      this.render();
      return this;
    };

    Keet.prototype.render = function render(stub) {
      // life-cycle method before rendering the component
      if (this.componentWillMount && typeof this.componentWillMount === 'function') {
        this.componentWillMount();
      }

      // Render this component to the target DOM
      if (stub) {
        this.IS_STUB = true;
      }
      parseStr.call(this, stub);
    };

    Keet.prototype.callBatchPoolUpdate = function callBatchPoolUpdate() {
      // force component to update, if any state / non-state
      // value changed DOM diffing will occur
      updateContext.call(this, morpher, 1);
    };

    Keet.prototype.subscribe = function subscribe(fn) {
      this.exec = fn;
    };

    Keet.prototype.inform = function inform(model) {
      this.exec && typeof this.exec === 'function' && this.exec(model);
    };

    createClass(Keet, null, [{
      key: 'indentity',
      get: function get$$1() {
        return genId();
      }
    }]);
    return Keet;
  }();

  var camelCase = function camelCase(s) {
    return s.charAt(0).toUpperCase() + s.slice(1);
  };

  var CreateFilterModel = function (_createModel) {
    inherits(CreateFilterModel, _createModel);

    function CreateFilterModel() {
      classCallCheck(this, CreateFilterModel);
      return possibleConstructorReturn(this, _createModel.apply(this, arguments));
    }

    CreateFilterModel.prototype.switch = function _switch(hash, obj) {
      this.list = this.list.map(function (filter) {
        return filter.hash === hash ? _extends({}, filter, obj) : _extends({}, filter, { selected: false });
      });
    };

    return CreateFilterModel;
  }(createModel);

  var filterModel = new CreateFilterModel();

  Array.from(['all', 'active', 'completed']).map(function (page) {
    return filterModel.add({
      hash: '#/' + page,
      name: camelCase(page),
      selected: false
    });
  });

  var _templateObject = taggedTemplateLiteralLoose(['\n\t<ul id="filters" class="filters">\n\t\t<!-- {{model:filterModel}} -->\n\t\t<li id="{{name}}" k-click="updateUrl({{hash}})"><a class="{{selected?selected:\'\'}}" href="{{hash}}">{{name}}</a></li>\n\t\t<!-- {{/model:filterModel}} -->\n\t</ul>\n'], ['\n\t<ul id="filters" class="filters">\n\t\t<!-- {{model:filterModel}} -->\n\t\t<li id="{{name}}" k-click="updateUrl({{hash}})"><a class="{{selected?selected:\'\'}}" href="{{hash}}">{{name}}</a></li>\n\t\t<!-- {{/model:filterModel}} -->\n\t</ul>\n']);

  var App = function (_Keet) {
    inherits(App, _Keet);

    function App() {
      var _temp, _this, _ret;

      classCallCheck(this, App);

      for (var _len = arguments.length, args = Array(_len), _key = 0; _key < _len; _key++) {
        args[_key] = arguments[_key];
      }

      return _ret = (_temp = (_this = possibleConstructorReturn(this, _Keet.call.apply(_Keet, [this].concat(args))), _this), _this.el = 'filters', _this.filterModel = filterModel, _temp), possibleConstructorReturn(_this, _ret);
    }

    App.prototype.componentWillMount = function componentWillMount() {
      var _this2 = this;

      this.filterModel.subscribe(function (model) {
        return _this2.callBatchPoolUpdate();
      });
      if (window.location.hash == '') {
        window.history.pushState({}, null, '#/all');
      }
    };

    App.prototype.componentDidMount = function componentDidMount() {
      var _this3 = this;

      this.updateUrl(window.location.hash);
      window.onpopstate = function () {
        return _this3.updateUrl(window.location.hash);
      };
    };

    App.prototype.updateUrl = function updateUrl(hash) {
      this.filterModel.switch(hash, { selected: true });
    };

    return App;
  }(Keet);

  var filterApp = new App();

  var vmodel = html(_templateObject);

  filterApp.mount(vmodel);

  var CreateModel = function (_createModel) {
    inherits(CreateModel, _createModel);

    function CreateModel() {
      classCallCheck(this, CreateModel);
      return possibleConstructorReturn(this, _createModel.apply(this, arguments));
    }

    CreateModel.prototype.clearCompleted = function clearCompleted() {
      this.list = this.list.filter(function (todo) {
        return !todo.completed;
      });
    };

    return CreateModel;
  }(createModel);

  var todoModel = new CreateModel();

  var _templateObject$1 = taggedTemplateLiteralLoose(['\n  <ul id="todo-list" class="todo-list" k-click="evtTodo()">\n    <!-- {{model:todoModel}} -->\n      <li class="{{completed?completed:\'\'}}">\n        <div class="view">\n          <input class="toggle" type="checkbox" checked="{{completed?checked:\'\'}}">\n          <label>{{title}}</label>\n          <button class="destroy"></button>\n        </div>\n        <input class="edit" value="{{title}}">\n      </li>\n    <!-- {{/model:todoModel}} -->\n  </ul>\n'], ['\n  <ul id="todo-list" class="todo-list" k-click="evtTodo()">\n    <!-- {{model:todoModel}} -->\n      <li class="{{completed?completed:\'\'}}">\n        <div class="view">\n          <input class="toggle" type="checkbox" checked="{{completed?checked:\'\'}}">\n          <label>{{title}}</label>\n          <button class="destroy"></button>\n        </div>\n        <input class="edit" value="{{title}}">\n      </li>\n    <!-- {{/model:todoModel}} -->\n  </ul>\n']);
  var x = void 0;

  var App$1 = function (_Keet) {
    inherits(App, _Keet);

    function App() {
      classCallCheck(this, App);

      var _this = possibleConstructorReturn(this, _Keet.call(this));

      _this.el = 'todo-list';
      _this.todoModel = todoModel;

      _this.todoModel.subscribe(function (model) {
        _this.inform(model);
      });
      return _this;
    }

    App.prototype.addTodo = function addTodo(newTodo) {
      this.todoModel.add(newTodo);
    };

    App.prototype.evtTodo = function evtTodo(obj, target) {
      if (!x) {
        x = true;
        window.t = new Date();
      }
      // console.log(obj)
      if (target.className === 'toggle') this.todoModel.update(_extends({}, obj, { completed: !obj.completed }));else if (target.className === 'destroy') this.todoModel.destroy(obj);
    };
    // toggleTodo(obj) {
    //   console.log(obj)
    //   this.todoModel.update({ ...obj,  completed: !obj.completed })
    // }
    // toggleTodo(id, completed) {
    //   this.todoModel.update( 'id', { id, completed })
    // }
    // todoDestroy(obj) {
    //   this.todoModel.destroy(obj)
    // }


    App.prototype.editMode = function editMode() {};

    return App;
  }(Keet);

  var todoApp = new App$1();

  var vmodel$1 = html(_templateObject$1);

  todoApp.mount(vmodel$1);

  var _templateObject$2 = taggedTemplateLiteralLoose(['\n  <section class="todoapp">\n    <header id="header">\n      <h1>todos</h1>\n      <input id="new-todo" class="new-todo" k-keydown="create()" placeholder="What needs to be done?" autofocus>\n    </header>\n    <!-- {{?todoState}} -->\n    <section class="main">\n      <input id="toggle-all" class="toggle-all" type="checkbox" checked="{{isChecked?checked:\'\'}}" k-click="completeAll()">\n      <label for="toggle-all">Mark all as complete</label>\n      <!-- {{component:todoApp}} -->\n    </section>\n    <footer class="footer">\n      <span class="todo-count">\n        <strong>{{count}}</strong> item{{plural}} left\n      </span>\n      <!-- {{component:filter}} -->\n      <!-- {{?clearToggle}} -->\n      <button id="clear-completed" class="clear-completed">Clear completed</button>\n      <!-- {{/clearToggle}} -->\n    </footer>\n    <!-- {{/todoState}} -->\n  </section>\n  <footer class="info">\n    <p>Double-click to edit a todo</p>\n    <p>Created by <a href="https://github.com/syarul">Shahrul Nizam Selamat</a></p>\n    <p>Part of <a href="http://todomvc.com">TodoMVC</a></p>\n  </footer>'], ['\n  <section class="todoapp">\n    <header id="header">\n      <h1>todos</h1>\n      <input id="new-todo" class="new-todo" k-keydown="create()" placeholder="What needs to be done?" autofocus>\n    </header>\n    <!-- {{?todoState}} -->\n    <section class="main">\n      <input id="toggle-all" class="toggle-all" type="checkbox" checked="{{isChecked?checked:\'\'}}" k-click="completeAll()">\n      <label for="toggle-all">Mark all as complete</label>\n      <!-- {{component:todoApp}} -->\n    </section>\n    <footer class="footer">\n      <span class="todo-count">\n        <strong>{{count}}</strong> item{{plural}} left\n      </span>\n      <!-- {{component:filter}} -->\n      <!-- {{?clearToggle}} -->\n      <button id="clear-completed" class="clear-completed">Clear completed</button>\n      <!-- {{/clearToggle}} -->\n    </footer>\n    <!-- {{/todoState}} -->\n  </section>\n  <footer class="info">\n    <p>Double-click to edit a todo</p>\n    <p>Created by <a href="https://github.com/syarul">Shahrul Nizam Selamat</a></p>\n    <p>Part of <a href="http://todomvc.com">TodoMVC</a></p>\n  </footer>']);

  var App$2 = function (_Keet) {
    inherits(App, _Keet);

    function App() {
      var _temp, _this, _ret;

      classCallCheck(this, App);

      for (var _len = arguments.length, args = Array(_len), _key = 0; _key < _len; _key++) {
        args[_key] = arguments[_key];
      }

      return _ret = (_temp = (_this = possibleConstructorReturn(this, _Keet.call.apply(_Keet, [this].concat(args))), _this), _this.todoApp = todoApp, _this.filter = filterApp, _this.isChecked = false, _this.count = 0, _this.plural = '', _this.clearToggle = false, _this.todoState = false, _temp), possibleConstructorReturn(_this, _ret);
    }

    App.prototype.componentWillMount = function componentWillMount() {
      var _this2 = this;

      todoApp.subscribe(function (todos) {
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
        console.log(todos);
      });
    };

    App.prototype.create = function create(evt) {
      if (evt.keyCode !== 13) return;
      evt.preventDefault();
      var title = evt.target.value.trim();
      if (title) {
        this.todoApp.addTodo({ title: title, completed: false });
        evt.target.value = '';
      }
    };

    App.prototype.completeAll = function completeAll() {
      this.isChecked = !this.isChecked;
      // this.todoApp.updateAll(this.isChecked)
    };

    App.prototype.clearCompleted = function clearCompleted() {
      this.todoApp.clearCompleted();
    };

    App.prototype.editMode = function editMode() {};

    return App;
  }(Keet);

  var vmodel$2 = html(_templateObject$2);

  var app = new App$2();

  app.mount(vmodel$2).link('todo');

}());
//# sourceMappingURL=app.js.map
