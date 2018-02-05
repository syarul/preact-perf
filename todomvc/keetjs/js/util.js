(function (exports) {
	'use strict';

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
		}
	};

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

	exports.genTemplate = function (obj) {
	  var args = this.args
	  var arrProps = this.base.template.match(/{{([^{}]+)}}/g)
	  var tmpl
	  var tempDiv
	  tmpl = this.base.template
	  arrProps.map(function (s) {
	    // console.log(s)
	    var rep = s.replace(/{{([^{}]+)}}/g, '$1')
	    tmpl = tmpl.replace(/{{([^{}]+)}}/, obj[rep])
	    if (args && ~args.indexOf(rep) && !obj[rep]) {
	      var re = new RegExp(' ' + rep + '="' + obj[rep] + '"', 'g')
	      tmpl = tmpl.replace(re, '')
	    }
	  })
	  tempDiv = document.createElement('div')
	  tempDiv.innerHTML = tmpl
	  var isevt = / k-/.test(tmpl)
	  if (isevt) { processEvent.call(this, tempDiv) }
	  return tempDiv.childNodes[0]
	}

})(window);