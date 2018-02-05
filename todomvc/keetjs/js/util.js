(function (exports) {
	'use strict';

	var next = function (i, c, rem, proxy) {
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
	        c.addEventListener(evtName, isHandler.bind.apply(isHandler.bind(proxy), [c].concat(argv)), false)
	      }
	    }
	    i++
	    next.apply(this, [ i, c, rem, proxy ])
	  } else {
	    rem.map(function (f) { c.removeAttribute(f) })
	  }
	}

	function loopChilds(arr, elem) {
	  if (!elem) return false
	  for (var child = elem.firstChild; child !== null; child = child.nextSibling) {
	    arr.push(child)
	    if (child.hasChildNodes()) {
	      loopChilds(arr, child)
	    }
	  }
	}

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

	function processEvent (kNode, proxy) {
	  var self = this
	  var listKnodeChild = []
	  var rem = []
	  loopChilds(listKnodeChild, kNode)
	  listKnodeChild.map(function (c) {
	    if (c.nodeType === 1 && c.hasAttributes()) {
	      next.apply(self, [ 0, c, rem, proxy ])
	    }
	  })
	  listKnodeChild = []
	}

	var tmpl = ''

	function nextTmpl(i, obj, arrProps, args){
	  if (i < arrProps.length) {
	    var rep = arrProps[i].replace(/{{([^{}]+)}}/g, '$1')
	    tmpl = tmpl.replace(/{{([^{}]+)}}/, obj[rep])
	    if (args && ~args.indexOf(rep) && !obj[rep]) {
	      var re = new RegExp(' ' + rep + '="' + obj[rep] + '"', 'g')
	      tmpl = tmpl.replace(re, '')
	    }
	    i++
	    nextTmpl(i, obj, arrProps, args)
	  }
	}

	exports.util = {
		store: function(namespace, data) {
			if (arguments.length > 1) {
				return localStorage.setItem(namespace, JSON.stringify(data));
			} else {
				var store = localStorage.getItem(namespace);
				return store && JSON.parse(store) || [];
			}
		},
		camelCase: function(s) {
			return s.charAt(0).toUpperCase() + s.slice(1);
		},
		genId: function() {
			return (Math.round(Math.random() * 0x1000)).toString(32);
		},
		cat: function() {
			return [].slice.call(arguments).join('');
		},
		genObj: function(){
			var self = this
			var argv = [].slice.call(arguments)
			argv.forEach(function(f){
				self[f] = {}
			})
		},
		genTemplate: function (obj) {
		  var args = this.args
		  var arrProps = this.base.template.match(/{{([^{}]+)}}/g)
		  var tempDiv
		  tmpl = this.base.template
		  nextTmpl(0, obj, arrProps, args)
		  tempDiv = document.createElement('div')
		  tempDiv.innerHTML = tmpl
		  var isevt = / k-/.test(tmpl)
		  if (isevt) { processEvent.call(this, tempDiv) }
		  return tempDiv.childNodes[0]
		},
		updateElem: function (oldElem, newElem) {
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
		},
		getId: function (id) {
		  return document.getElementById(id)
		}

	};



})(window);