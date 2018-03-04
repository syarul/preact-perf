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
		uuid: function() {
			let uuid = '';
			for (let i=0; i<32; i++) {
				let random = Math.random() * 16 | 0;
				if (i === 8 || i === 12 || i === 16 || i === 20) {
					uuid += '-';
				}
				uuid += (i === 12 ? 4 : (i === 16 ? (random & 3 | 8) : random)).toString(16);
			}
			return uuid;
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