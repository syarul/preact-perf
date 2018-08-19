!function(){"use strict";function t(t){if(t.match(/([^?]*)\?([^:]*):([^;]*)|(\s*=\s*)[^;]*/g)){var e=t.split("?"),n=e[0],o=e[1].split(":")[0],i=e[1].split(":")[1];return!!this&&(this[n]?{value:_(o),state:n}:{value:_(i),state:n})}return!1}function e(t,e){"function"==typeof e&&e(t)}function n(t,e,n,o){e=e.replace(n,o),t&&(t.nodeValue=e)}function o(o,i,l,r,a,d){for(var c=o.match(D),s=c.length,u=void 0,h=void 0,f=void 0;s;)if(s--,u=c[s].replace(D,"$1"),h=t.call(l,u),f=I(u))e(u,r),n(i,o,"{{"+u+"}}",l[f[0]][f[1]]);else if(h){if(e(h.state,r),d)return h.value;n(i,o,"{{"+u+"}}",h.value)}else if(void 0!==l[u]){if(e(u,r),d)return l[u];n(i,o,"{{"+u+"}}",l[u])}}function i(t,e){rt=nt(t,e),at=it.createContextualFragment(rt),at.firstChild.setAttribute("kdata-id",e["kdata-id"])}function l(t,e,n){var o=void 0,l=void 0,r=void 0,a=void 0,d=void 0,c=void 0,s=void 0,u=void 0,h=void 0,f=void 0,p=void 0,m=void 0,v=void 0,g=void 0,b=void 0,y=void 0,k=void 0;if(lt[e]=lt[e]||{},g=this[e].enableFiltering?"listFilter":"list",lt[e][g]||(lt[e][g]=t.nextSibling.cloneNode(!0)),f=lt[e][g],lt[e].str||(lt[e].str=t.nextSibling.cloneNode(!0).outerHTML,t.nextSibling.remove(),v=this.__pristineFragment__.getElementById(t.parentNode.id),v&&v.childNodes[1].remove()),p=lt[e].str,void 0!==this[e]&&this[e].hasOwnProperty(g))if(a=t.parentNode,it&&!a.hasAttribute("data-ignore")&&a.setAttribute("data-ignore",""),o=this[e][g],m=lt[e].oldModel||[],it){d=ot(o,m),c=ot(m,o);var C=function(){for(var t=arguments.length,n=Array(t),r=0;r<t;r++)n[r]=arguments[r];if(s=n.pop(),u=m.length===o.length)for(l=0;l<d.length;)h=s.querySelector(d[l]["kdata-id"]===c[l]["kdata-id"]?'[kdata-id="'+d[l]["kdata-id"]+'"]':'[kdata-id="'+c[l]["kdata-id"]+'"]'),h&&(i(p,d[l]),s.replaceChild(at,h)),l++;else if(d.length>0&&0===c.length)for(l=0;l<d.length;)i(p,d[l]),d[l]["kdata-id"]===o[o.length-1]["kdata-id"]?y=s.lastChild:(b=o.map(function(t){return t["kdata-id"]}).indexOf(d[l]["kdata-id"]),y=s.childNodes[b].nextSibling),s.insertBefore(at,y),l++;else if(0===d.length&&c.length>0)for(l=0;l<c.length;)h=s.querySelector('[kdata-id="'+c[l]["kdata-id"]+'"]'),h&&s.removeChild(h),l++;else if(d.length>0&&c.length>0)for(l=0;l<c.length;)if(h=s.querySelector('[kdata-id="'+c[l]["kdata-id"]+'"]'),h&&s.removeChild(h),l++,l===c.length)for(k=0;k<d.length;)i(p,d[k]),s.insertBefore(at,s.lastChild),k++;lt[e].oldModel=JSON.parse(JSON.stringify(o))};a.hasAttribute("id")&&(s=q(a.id),s?C.call(this,null,null,s):R({el:a.id},e,C.bind(this),function(){lt[e].oldModel=[]}))}else for(l=0;l<o.length;)r=f.cloneNode(!0),n(this,null,r,o[l],null,"update"),r.setAttribute("kdata-id",o[l]["kdata-id"]),a.insertBefore(r,a.lastChild),l++}function r(t,e){for(var n=void 0;t;)n=t,t=t.nextSibling,n&&n.nodeType===ct?n.isEqualNode(e)?(n.remove(),e=e.nextSibling):r(n.firstChild,e):n.isEqualNode(e)&&(n.remove(),e=e.nextSibling)}function a(t,e,n,o,i){var l=void 0,a=void 0,d=void 0,c=document.createDocumentFragment();if("initial"!==i||ut.hasOwnProperty(n)){if(t.nextSibling.isEqualNode(ut[n].frag.firstChild))return;d=ut[n].frag.cloneNode(!0),this[n]?t.parentNode.insertBefore(d,t.nextSibling):o(this,null,null,null,d,"update")}else for(a=t;a;)l=a,a=a.nextSibling,l.nodeType!==ct&&l.nodeValue.match(dt)?(ut[n]=ut[n]||{},r(this.__pristineFragment__.firstChild,c.firstChild),Object.keys(ut).map(function(t){return t!==n&&r(ut[t].frag.firstChild,c.firstChild)}),ut[n].frag=c,d=ut[n].frag.cloneNode(!0),o(this,null,null,null,d,"initial"),this[n]&&l.parentNode.insertBefore(d,l)):l.nodeType!==st&&c.appendChild(l)}function d(t,e){var n=t.replace("component:",""),o=this[n];void 0!==o?(ht[o.ID]?q(this[n].el)?e.parentNode.replaceChild(ht[o.ID].cloneNode(!0),e):(o.base=o.__pristineFragment__.cloneNode(!0),o.render(!0),e.parentNode.replaceChild(o.base,e)):(o.render(!0),ht[o.ID]=o.base.cloneNode(!0),e.parentNode.replaceChild(o.base,e)),o.callBatchPoolUpdate()):W(!1,"Component "+n+" does not exist.")}function c(t,n,o,i,r,c){var s=void 0,u=void 0,h=void 0;t.match(ft)&&(u=t.replace(ft,"$1").trim(),u.match(pt)&&"initial"!==c?(h=u.replace("model:",""),l.call(this,n,h,r)):u.match(mt)?(s=u.replace("?",""),void 0!==o[s]&&(e(s,i),a.call(this,n,i,s,r,c))):u.match(vt)&&"initial"!==c&&d.call(this,u,n))}function s(t,e){for(var n=void 0;e;){if(n=e,e=e.parentNode,n.nodeType===gt&&n.hasAttribute("kdata-id"))return{id:n.getAttribute("kdata-id"),node:n};n.isEqualNode(t)&&(e=null)}}function u(t,e){delete e.isModel;var n=Object.keys(e)[0],o=e[n];void 0!==this[o]&&"function"==typeof this[o]&&t.addEventListener(n,this[o].bind(this),!!e.useCapture)}function h(t,e,n,o){if(o.stopPropagation(),o.target!==o.currentTarget){var i=s(n,o.target);this[e](t.list[yt(i.id,t)],o.target,i.node,o)}}function f(t,e){delete e.isModel;var n=Object.keys(e)[0],o=e[n];if(void 0!==this[o]&&"function"==typeof this[o]){var i=t.firstChild.nodeValue.replace(bt,"$1").trim();i=i.replace("model:","");t.addEventListener(n,h.bind(this,this[i],o,t),!!e.useCapture)}}function p(t,e,n,i,l,r){var a=void 0,d=void 0,s=void 0;i?s=n:l?s=l.firstChild:(d=t.base,s=d.firstChild);var h=i||t,m=function(t){var e=t.attributes,n=0,i=void 0,l=void 0,r=void 0;for(n=e.length;n--;)i=e[n],r=i.localName,l=i.nodeValue,Nt.test(r)?(t.removeAttribute(r),r=o(r,t,h,null,null,!0),t.setAttribute(r,l)):Nt.test(l)&&(l=o(l,t,h,null,null,!0),"checked"===r?(t.checked=""!==l,t.removeAttribute(r)):""===l?t.setAttribute(r,""):t.setAttribute(r,l))},v=function(t){for(var e=t.attributes,n=0,o=void 0,i=void 0,l=void 0,r=void 0,a=void 0,d=[],c=void 0,s=void 0;n<e.length;)o=e[n],i=o.localName,l=o.nodeValue,/^k-/.test(i)&&(r=i.replace(/^k-/,""),a=l.match(/[a-zA-Z]+(?![^(]*\))/)[0],s=l.match(/\(([^{}]+)\)/),s=s?s[1]:"",c={},c[r]=a,s&&(c[s]=!0),c.isModel=!1,d.push(c),t.hasChildNodes()&&t.firstChild.nodeType!==kt&&t.firstChild.nodeValue.match(Tt)&&(c.isModel=!0)),n++;return d},g=void 0,b=function e(n,o){for(;n;)a=n,n=n.nextSibling,a.nodeType===kt&&(a.hasAttributes()&&!q(a.id)&&(g=v(a),g.length&&g.map(function(e){return e.isModel?f.call(t,a,e):u.call(t,a,e)})),e(a.firstChild,o))},y=function n(i,l){for(;i;)a=i,i=i.nextSibling,a.nodeType===kt?("update"===l&&a.hasAttributes()&&m(a),n(a.firstChild,l)):a.nodeValue.match(Nt)&&(a.nodeType===Ct?c.call(t,a.nodeValue,a,h,e,p,l):"update"===l&&o.call(t,a.nodeValue,a,h,e,p))};"initial"===r||"update"===r?y(s,r):"event"===r&&b(s,r)}function m(t,e){var n=St.parseFromString(t,Et);return n.body?e===Mt?n.documentElement:n.body.firstChild:v(t,e)}function v(t,e){if(e===Mt){if(xt)return Pt.innerHTML=t,Pt;var n=t.match(jt);if(n){var o=n[2],i=n.index+n[1].length,l=i+o.length;t=t.slice(0,i)+t.slice(l),Ut.innerHTML=o}for(var r=St.parseFromString(t,At),a=r.body;Ut.firstChild;)a.appendChild(Ut.firstChild);return r.documentElement}return Ut.innerHTML=t,Ut.firstChild}function g(t,e){E(t&&t.nodeType,"You must provide a valid node to update."),t.nodeType===qt&&(t=t.documentElement),e.nodeType===Rt?k(t,e):b(t,"string"==typeof e?Vt(e,t.nodeName):e),t[Bt]||(t[Bt]=!0,M(t))}function b(t,e){if(t.nodeType===e.nodeType)if(t.nodeType===Ht){if("INPUT"===t.nodeName&&t.checked!==e.checked&&(t.checked=e.checked),N(t,e))return;if(k(t,e),t.nodeName===e.nodeName)y(t.attributes,e.attributes);else{for(var n=e.cloneNode();t.firstChild;)n.appendChild(t.firstChild);t.parentNode.replaceChild(n,t)}}else t.nodeValue!==e.nodeValue&&(t.nodeValue=e.nodeValue);else t.parentNode.replaceChild(e,w(t)),M(e)}function y(t,e){var n,o,i,l,r;for(n=t.length;n--;)o=t[n],l=o.namespaceURI,r=o.localName,i=e.getNamedItemNS(l,r),i||t.removeNamedItemNS(l,r);for(n=e.length;n--;)o=e[n],l=o.namespaceURI,r=o.localName,i=t.getNamedItemNS(l,r),i?i.value!==o.value&&(i.value=o.value):(e.removeNamedItemNS(l,r),t.setNamedItemNS(o))}function k(t,e){for(var n,o,i,l,r,a,d=t.firstChild,c=e.firstChild,s=0;d;)s++,n=d,o=C(n),d=d.nextSibling,o&&(a||(a={}),a[o]=n);for(d=t.firstChild;c;)s--,i=c,c=c.nextSibling,a&&(l=C(i))&&(r=a[l])?(delete a[l],r!==d?t.insertBefore(r,d):d=d.nextSibling,b(r,i)):d?(n=d,d=d.nextSibling,C(n)?(t.insertBefore(i,n),M(i)):b(n,i)):(t.appendChild(i),M(i));for(o in a)s--,t.removeChild(w(a[o]));for(;--s>=0;)t.removeChild(w(t.lastChild))}function C(t){if(t.nodeType===Ht){var e=t.getAttribute(g.KEY)||t.id;return e?Ft+e:void 0}}function N(t,e){return S(t)&&S(e)||T(t)===T(e)||t.isEqualNode(e)}function T(t){return t.getAttribute(g.CHECKSUM)||NaN}function S(t){return null!=t.getAttribute(g.IGNORE)}function M(t){return x(t,"mount")}function w(t){return x(t,"dismount")}function x(t,e){if(C(t)){var n=document.createEvent("Event"),o={value:t};n.initEvent(e,!1,!1),Object.defineProperty(n,"target",o),Object.defineProperty(n,"srcElement",o),t.dispatchEvent(n)}for(var i=t.firstChild;i;)i=x(i,e).nextSibling;return t}function E(t,e){if(!t)throw Error("set-dom: "+e)}function A(t){p(this,te,null,null,null,"initial"),p(this,te,null,null,null,"update"),p(this,te,null,null,null,"event");var e=t||q(this.el);e?(e.nodeType===ne?e.setAttribute("data-ignore",""):(W(1===this.base.childNodes.length,"Sub-component should only has a single rootNode."),!this.base.firstChild.hasAttribute("data-ignore")&&this.base.firstChild.setAttribute("data-ignore","")),Zt.call(this),t||e.appendChild(this.base),this.componentDidMount&&"function"==typeof this.componentDidMount&&this.componentDidMount()):W(!1,'No element with id: "'+this.el+'" exist.')}function O(t){var e=void 0,n=void 0,o=document.createDocumentFragment();if("string"==typeof t)for(e=t.trim().replace(/\s+/g," "),n=document.createElement("div"),n.innerHTML=e;n.firstChild;)o.appendChild(n.firstChild);else"object"===(void 0===t?"undefined":L(t))&&t.nodeType?t.nodeType===le?o.appendChild(t):t.nodeType===oe?o=t:t.nodeType===ie?o.appendChild(t):W(!1,"Unable to parse instance, unknown type."):W(!1,"Parameter is not a string or a html element.");return this.__pristineFragment__=o.cloneNode(!0),this.base=o,Xt(),this}var _=function(t){return"''"===t||'""'===t||"null"===t?"":t},I=function(t){var e=t.match(/\.*\./g);return e&&e.length>0?t.split("."):void 0},D=/{{([^{}]+)}}/g,L="function"==typeof Symbol&&"symbol"==typeof Symbol.iterator?function(t){return typeof t}:function(t){return t&&"function"==typeof Symbol&&t.constructor===Symbol&&t!==Symbol.prototype?"symbol":typeof t},P=function(){function t(t,e){for(var n=0;n<e.length;n++){var o=e[n];o.enumerable=o.enumerable||!1,o.configurable=!0,"value"in o&&(o.writable=!0),Object.defineProperty(t,o.key,o)}}return function(e,n,o){return n&&t(e.prototype,n),o&&t(e,o),e}}(),U=Object.assign||function(t){for(var e=1;e<arguments.length;e++){var n=arguments[e];for(var o in n)Object.prototype.hasOwnProperty.call(n,o)&&(t[o]=n[o])}return t},j=function(t,e){if("function"!=typeof e&&null!==e)throw new TypeError("Super expression must either be null or a function, not "+typeof e);t.prototype=Object.create(e&&e.prototype,{constructor:{value:t,enumerable:!1,writable:!0,configurable:!0}}),e&&(Object.setPrototypeOf?Object.setPrototypeOf(t,e):t.__proto__=e)},V=function(t,e){if(!t)throw new ReferenceError("this hasn't been initialised - super() hasn't been called");return!e||"object"!=typeof e&&"function"!=typeof e?t:e},F=function(t,e){return t.raw=e,t},B=function(){var t=function(){return(1*Math.random()*1e17).toString(36)};return"KDATA-"+t()+"-"+t()},H=function(){return(1*Math.random()*1e17).toString(36)},q=function(t){return document.getElementById(t)},R=function(t,e,n,o){function i(){r=q(t.el),r&&(clearInterval(d),a=!0,n(t,e,r))}function l(){clearInterval(d),!a&&o&&"function"==typeof o&&o()}var r=q(t.el),a=!1,d=void 0;return r?r:(d=setInterval(i,0),void setTimeout(l,5))},W=function(t,e){if(!t)throw Error("(keet) "+e)},K=function(){for(var t=arguments.length,e=Array(t),n=0;n<t;n++)e[n]=arguments[n];var o=e.shift(),i=e.slice(),l=o.raw.reduce(function(t,e,n){return t+i[n-1]+e});return l=l.split(/\n+/),l=l.map(function(t){return t.trim()}).join("")},Y=function(t,e){return t["kdata-id"]!==e["kdata-id"]},$=function(){for(var t=arguments.length,e=Array(t),n=0;n<t;n++)e[n]=arguments[n];this.exec&&"function"==typeof this.exec&&this.exec.apply(null,e)},z=function(){function t(t){this.enableFiltering=t||null,this.exec=null,this.model=[],Object.defineProperty(this,"list",{enumerable:!1,configurable:!0,get:function(){return this.model},set:function(t){this.model=t,$.call(this,this.model,this.listFilter)}}),Object.defineProperty(this,"listFilter",{enumerable:!1,configurable:!0,get:function(){var t=this;return this.prop?this.model.filter(function(e){return e[t.prop]===t.value}):this.model}})}return t.prototype.subscribe=function(t){this.exec=t},t.prototype.add=function(t){this.list=this.list.concat(U({},t,{"kdata-id":H()}))},t.prototype.update=function(t){this.list=this.list.map(function(e){return Y(e,t)?e:t})},t.prototype.filter=function(t,e){this.prop=t,this.value=e,this.list=this.list.map(function(t){return t})},t.prototype.destroy=function(t){this.list=this.list.filter(function(e){return Y(e,t)})},t}(),G=RegExp(/(\schecked=")(.*?)(?=")/g),J="",Z=void 0,Q=void 0,X=void 0,tt=void 0,et=void 0,nt=function(e,n){var o=e.match(/{{([^{}]+)}}/g);for(J=e,X=0,tt=o.length;X<tt;X++)Z=o[X].replace(/{{([^{}]+)}}/g,"$1"),Q=t.call(n,Z),J=Q?J.replace("{{"+Z+"}}",Q.value):J.replace("{{"+Z+"}}",n[Z]),et=J.match(G),et&&(J=17===et[0].length?J.replace(' checked="checked"'," checked"):J.replace(' checked=""',""));return J},ot=function(t,e){return t.filter(function(t){return!e.some(function(e){var n=!0;for(var o in e)t[o]!==e[o]&&(n=!1);return n})})},it=void 0;"function"==typeof document.createRange&&(it=document.createRange());var lt={},rt=void 0,at=void 0,dt=/\{\{\/([^{}]+)\}\}/g,ct=1,st=8,ut={},ht={},ft=/{{([^{}]+)}}/g,pt=/^model:/g,mt=/^\?/g,vt=/^component:([^{}]+)/g,gt=1,bt=/{{([^{}]+)}}/g,yt=function(t,e){return e.list.map(function(t){return t["kdata-id"]}).indexOf(t)},kt=1,Ct=8,Nt=/{{([^{}]+)}}/g,Tt=/\{\{model:([^{}]+)\}\}/g,St=window.DOMParser&&new window.DOMParser,Mt="HTML",wt=!1,xt=!1,Et="text/html",At="application/xhtml+xml",Ot="A",_t='<wbr class="'+Ot+'"/>';try{var It=St.parseFromString(_t,Et).body.firstChild,Dt=document.createElement("div");if(Dt.appendChild(It),Dt.firstChild.classList[0]!==Ot)throw Error();wt=!0}catch(t){}var Lt=document.implementation.createHTMLDocument(""),Pt=Lt.documentElement,Ut=Lt.body;try{Pt.innerHTML+="",xt=!0}catch(t){St.parseFromString(_t,At);var jt=/(<body[^>]*>)([\s\S]*)<\/body>/}var Vt=wt?m:v;g.KEY="data-key",g.IGNORE="data-ignore",g.CHECKSUM="data-checksum";var Ft="_set-dom-",Bt=Ft+"mounted",Ht=1,qt=9,Rt=11,Wt=g;Wt.KEY="kdata-id";var Kt=2.5,Yt=void 0,$t=function(){Yt=q(this.el),ee.call(this),Yt&&(this.IS_STUB?Wt(Yt,this.base.firstChild):Wt(Yt,this.base)),this.componentDidUpdate&&"function"==typeof this.componentDidUpdate&&this.componentDidUpdate()},zt={},Gt=function(t,e){var n=this;zt[this.ID]=zt[this.ID]||null,clearTimeout(zt[this.ID]),zt[this.ID]=setTimeout(function(){return t.call(n)},e)},Jt=function t(e){var n=void 0,o=void 0;if(e<Qt.length){if(n=Qt[e],o=this[n],void 0===o&&(o=I(n)),o&&Array.isArray(o)){var i=this[o[0]][o[1]];Object.defineProperty(this[o[0]],o[1],{enumerable:!1,configurable:!0,get:function(){return i},set:function(t){i=t,Gt.call(this,$t,Kt)}})}else Object.defineProperty(this,n,{enumerable:!1,configurable:!0,get:function(){return o},set:function(t){o=t,Gt.call(this,$t,Kt)}});e++,t.call(this,e)}},Zt=function(){Jt.call(this,0)},Qt=[],Xt=function(){Qt=[]},te=function(t){Qt.indexOf(t)===-1&&(Qt=Qt.concat(t))},ee=function(){this.base=this.__pristineFragment__.cloneNode(!0),p(this,te,null,null,null,"initial"),p(this,te,null,null,null,"update"),p(this,te,null,null,null,"event")},ne=1,oe=11,ie=3,le=1;window.l=console.log.bind(console),window.tr=console.trace.bind(console);var re=function(){function t(){this.ID=t.indentity}return t.prototype.mount=function(t){return O.call(this,t)},t.prototype.link=function(t){return t||W(t,"No id is given as parameter."),this.el=t,this.render(),this},t.prototype.render=function(t){this.componentWillMount&&"function"==typeof this.componentWillMount&&this.componentWillMount(),t&&(this.IS_STUB=!0),A.call(this,t)},t.prototype.callBatchPoolUpdate=function(){Gt.call(this,$t,1)},t.prototype.subscribe=function(t){this.exec=t},t.prototype.inform=function(t){this.exec&&"function"==typeof this.exec&&this.exec(t)},P(t,null,[{key:"indentity",get:function(){return B()}}]),t}(),ae=function(t){return t.charAt(0).toUpperCase()+t.slice(1)},de=function(t){function e(){return V(this,t.apply(this,arguments))}return j(e,t),e.prototype.switch=function(t,e){this.list=this.list.map(function(n){return n.hash===t?U({},n,e):U({},n,{selected:!1})})},e}(z),ce=new de;Array.from(["all","active","completed"]).map(function(t){return ce.add({hash:"#/"+t,name:ae(t),selected:!1})});var se=function(t){function e(){return V(this,t.apply(this,arguments))}return j(e,t),e.prototype.clearCompleted=function(){this.list=this.list.filter(function(t){return!t.completed})},e.prototype.updateAll=function(t){this.list=this.list.map(function(e){return U({},e,{completed:t})})},e}(z),ue=new se("filter"),he=F(['\n  <ul id="todo-list" class="todo-list" k-click="evtTodo()" k-dblclick="editTodo()" k-keydown="keyTodo()" k-blur="blurTodo(useCapture)" >\n    <!-- {{model:todoModel}} -->\n      <li class="{{completed?completed:\'\'}}">\n        <div class="view">\n          <input class="toggle" type="checkbox" checked="{{completed?checked:\'\'}}">\n          <label>{{title}}</label>\n          <button class="destroy"></button>\n        </div>\n        <input class="edit" value="{{title}}">\n      </li>\n    <!-- {{/model:todoModel}} -->\n  </ul>'],['\n  <ul id="todo-list" class="todo-list" k-click="evtTodo()" k-dblclick="editTodo()" k-keydown="keyTodo()" k-blur="blurTodo(useCapture)" >\n    <!-- {{model:todoModel}} -->\n      <li class="{{completed?completed:\'\'}}">\n        <div class="view">\n          <input class="toggle" type="checkbox" checked="{{completed?checked:\'\'}}">\n          <label>{{title}}</label>\n          <button class="destroy"></button>\n        </div>\n        <input class="edit" value="{{title}}">\n      </li>\n    <!-- {{/model:todoModel}} -->\n  </ul>']),fe=13,pe=27,me=function(t){function e(){var e=V(this,t.call(this));return e.el="todo-list",e.todoModel=ue,e.todoModel.subscribe(function(t){return e.inform(t)}),e}return j(e,t),e.prototype.addTodo=function(t){this.todoModel.add(t)},e.prototype.evtTodo=function(t,e){"toggle"===e.className?this.todoModel.update(U({},t,{completed:!t.completed})):"destroy"===e.className&&this.todoModel.destroy(t)},e.prototype.filterTodo=function(t){"#/all"===t?this.todoModel.filter(null):"#/active"===t?this.todoModel.filter("completed",!1):"#/completed"===t&&this.todoModel.filter("completed",!0)},e.prototype.saveEditing=function(t,e){""===e?this.todoModel.destroy(t):this.todoModel.update(U({},t,{title:e}))},e.prototype.editTodo=function(t,e,n){if("LABEL"===e.nodeName){this.isEditing=!0,n.classList.add("editing");var o=n.querySelector(".edit");this.currentValue=o.value,o.value="",o.focus(),o.value=this.currentValue}},e.prototype.blurTodo=function(t,e,n){this.isEditing&&(this.saveEditing(t,e.value.trim()),n.classList.remove("editing"),this.isEditing=!1)},e.prototype.keyTodo=function(t,e,n,o){o.which!==fe&&o.which!==pe||(n.classList.remove("editing"),this.isEditing=!1,o.which===fe?this.saveEditing(t,e.value.trim()):e.value=this.currentValue)},e}(re),ve=new me;ve.mount(K(he));var ge=F(['\n  <ul id="filters" class="filters">\n    <!-- {{model:filterModel}} -->\n    <li id="{{name}}" k-click="updateUrl({{hash}})"><a class="{{selected?selected:\'\'}}" href="{{hash}}">{{name}}</a></li>\n    <!-- {{/model:filterModel}} -->\n  </ul>'],['\n  <ul id="filters" class="filters">\n    <!-- {{model:filterModel}} -->\n    <li id="{{name}}" k-click="updateUrl({{hash}})"><a class="{{selected?selected:\'\'}}" href="{{hash}}">{{name}}</a></li>\n    <!-- {{/model:filterModel}} -->\n  </ul>']),be=function(t){function e(){for(var e,n,o,i=arguments.length,l=Array(i),r=0;r<i;r++)l[r]=arguments[r];return e=n=V(this,t.call.apply(t,[this].concat(l))),n.el="filters",n.filterModel=ce,o=e,V(n,o)}return j(e,t),e.prototype.componentWillMount=function(){var t=this;this.filterModel.subscribe(function(){return t.callBatchPoolUpdate()}),""===window.location.hash&&window.history.pushState({},null,"#/all")},e.prototype.componentDidMount=function(){var t=this;this.updateUrl(window.location.hash),window.onpopstate=function(){return t.updateUrl(window.location.hash)}},e.prototype.updateUrl=function(t){this.filterModel.switch(t,{selected:!0}),ve.filterTodo(t)},e}(re),ye=new be;ye.mount(K(ge));var ke=F(['\n  <section class="todoapp">\n    <header id="header">\n      <h1>todos</h1>\n      <input id="new-todo" class="new-todo" k-keydown="create()" placeholder="What needs to be done?" autofocus>\n    </header>\n    <!-- {{?todoState}} -->\n    <section class="main">\n      <input id="toggle-all" class="toggle-all" type="checkbox" checked="{{isChecked?checked:\'\'}}" k-click="completeAll()">\n      <label for="toggle-all">Mark all as complete</label>\n      <!-- {{component:todoList}} -->\n    </section>\n    <footer class="footer">\n      <span class="todo-count">\n        <strong>{{count}}</strong> item{{plural}} left\n      </span>\n      <!-- {{component:filter}} -->\n      <!-- {{?clearToggle}} -->\n      <button id="clear-completed" k-click="clearCompleted()" class="clear-completed">Clear completed</button>\n      <!-- {{/clearToggle}} -->\n    </footer>\n    <!-- {{/todoState}} -->\n  </section>\n  <footer class="info">\n    <p>Double-click to edit a todo</p>\n    <p>Created by <a href="https://github.com/syarul">Shahrul Nizam Selamat</a></p>\n    <p>Part of <a href="http://todomvc.com">TodoMVC</a></p>\n  </footer>'],['\n  <section class="todoapp">\n    <header id="header">\n      <h1>todos</h1>\n      <input id="new-todo" class="new-todo" k-keydown="create()" placeholder="What needs to be done?" autofocus>\n    </header>\n    <!-- {{?todoState}} -->\n    <section class="main">\n      <input id="toggle-all" class="toggle-all" type="checkbox" checked="{{isChecked?checked:\'\'}}" k-click="completeAll()">\n      <label for="toggle-all">Mark all as complete</label>\n      <!-- {{component:todoList}} -->\n    </section>\n    <footer class="footer">\n      <span class="todo-count">\n        <strong>{{count}}</strong> item{{plural}} left\n      </span>\n      <!-- {{component:filter}} -->\n      <!-- {{?clearToggle}} -->\n      <button id="clear-completed" k-click="clearCompleted()" class="clear-completed">Clear completed</button>\n      <!-- {{/clearToggle}} -->\n    </footer>\n    <!-- {{/todoState}} -->\n  </section>\n  <footer class="info">\n    <p>Double-click to edit a todo</p>\n    <p>Created by <a href="https://github.com/syarul">Shahrul Nizam Selamat</a></p>\n    <p>Part of <a href="http://todomvc.com">TodoMVC</a></p>\n  </footer>']);(new(function(t){function e(){for(var e,n,o,i=arguments.length,l=Array(i),r=0;r<i;r++)l[r]=arguments[r];return e=n=V(this,t.call.apply(t,[this].concat(l))),n.todoList=ve,n.filter=ye,n.isChecked=!1,n.count=0,n.plural="",n.clearToggle=!1,n.todoState=!1,o=e,V(n,o)}return j(e,t),e.prototype.componentWillMount=function(){var t=this;ve.subscribe(function(e){var n=e.filter(function(t){return!t.completed});t.clearToggle=!!e.filter(function(t){return t.completed}).length,t.todoState=!!e.length,t.plural=1===n.length?"":"s",t.count=n.length,t.isChecked=!n.length})},e.prototype.create=function(t){if(13===t.keyCode){var e=t.target.value.trim();e&&(this.todoList.addTodo({title:e,completed:!1}),t.target.value="")}},e.prototype.completeAll=function(){this.isChecked=!this.isChecked,this.todoList.todoModel.updateAll(this.isChecked)},e.prototype.clearCompleted=function(){this.todoList.todoModel.clearCompleted()},e}(re))).mount(K(ke)).link("todo")}();
//# sourceMappingURL=app.js.map