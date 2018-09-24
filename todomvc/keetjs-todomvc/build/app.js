var app=function(){"use strict";function t(t,e){"function"==typeof e&&e(t)}function e(t,e){var n=t.getElementById(e);n&&n.childNodes[1].remove()}function n(t,n,o){var i=void 0,r=void 0,l=void 0,a=void 0,c=void 0,s=void 0,u=void 0;if(rt[n]=rt[n]||{},s=this[n]&&this[n].enableFiltering?"listFilter":"list",rt[n][s]||(rt[n][s]=t.nextSibling.cloneNode(!0),t.nextSibling.remove(),e(this.__pristineFragment__,t.parentNode.id)),o&&(c=rt[n][s],void 0!==this[n]&&this[n].hasOwnProperty(s))){if(a=t.parentNode.nodeType===it?tt(this.el):t.parentNode,i=this[n][s],!this[n].dirty)return void a.setAttribute("pristine-model","");for(r=0,u=i.length;r<u;)l=c.cloneNode(!0),o.call(this,l,null,i[r]),l.setAttribute("kdata-id",i[r]["kdata-id"]),a.insertBefore(l,a.lastChild),r++;this[n].dirty=!1}}function o(t,e){for(var n=void 0;t;)n=t,t=t.nextSibling,n&&n.nodeType===st?n.isEqualNode(e)?(n.remove(),e=e.nextSibling):o(n.firstChild,e):n.isEqualNode(e)&&(n.remove(),e=e.nextSibling)}function i(t,e){for(var o=void 0;e;)if(o=e,e=e.nextSibling,o.nodeType===st)i.call(this,t,o.firstChild);else if(o.nodeType===ut&&o.nodeValue.match(at)){var r=o.nodeValue.trim().match(ct);r.length&&(dt[t].models=dt[t].models||[],dt[t].models=dt[t].models.concat(r),n.call(this,o,r,null))}}function r(t,e,n,r,l){var a=this,c=void 0,s=void 0,u=void 0,d=document.createDocumentFragment();if("initial"!==n||dt.hasOwnProperty(e)){if("conditional-set"===n){if(t.nextSibling.isEqualNode(dt[e].frag.firstChild))return;u=dt[e].frag.cloneNode(!0),dt[e].models&&dt[e].models.length&&dt[e].models.map(function(t){a[t].dirty=!0}),r.call(this,u.firstChild,l),t.parentNode.insertBefore(u,t.nextSibling)}}else for(s=t;s;)c=s,s=s.nextSibling,c.nodeType!==st&&c.nodeValue.match(lt)?(s=null,dt[e]=dt[e]||{},o(this.__pristineFragment__.firstChild,d.firstChild),i.call(this,e,d.firstChild),dt[e].frag=d):c.nodeType!==ut&&d.appendChild(c)}function l(t){for(;t;)yt=t,t=t.nextSibling,yt.nodeType===ht?l.call(this,yt.firstChild):yt.nodeType===ft&&yt.nodeValue.match(pt)&&(vt=yt.nodeValue.trim().match(mt),gt=gt.concat(vt),bt=bt.concat(yt))}function a(e){gt=[],bt=[],l.call(this,this.base.firstChild);for(var n=gt.length;n>0;)n--,t(gt[n],e.bind(this)),r.call(this,bt[n],gt[n],"initial")}function c(t){if(window&&"object"===G(window.__keetGlobalComponentRef__)){var e=window.__keetGlobalComponentRef__.map(function(t){return t.identifier}).indexOf(t);if(~e)return window.__keetGlobalComponentRef__[e].component}}function s(t,e){var n=t.replace("component:",""),o=this[n]||c(n);void 0!==o?wt[o.ID]?tt(o.el)?(e.parentNode.replaceChild(wt[o.ID].cloneNode(!0),e),o.callBatchPoolUpdate()):(o.base=o.__pristineFragment__.cloneNode(!0),o.cycleVirtualDomTree(!0),e.parentNode.replaceChild(o.base,e)):(o.cycleVirtualDomTree(!0),wt[o.ID]=o.base.cloneNode(!0),e.parentNode.replaceChild(o.base,e)):et(!1,"Component "+n+" does not exist.")}function u(t){var e=void 0,n=void 0;return"string"==typeof t&&(e=t.match(kt),e&&e.length&&(this.IS_SVG=!0,e.map(function(e){n=X(),Ct[n]=e,t=t.replace(e,"<!-- {{svg:"+n+"}} -->")}))),t}function d(t){for(var e=void 0;t;)e=t,t=t.nextSibling,e.nodeType===Tt?d(e.firstChild):e.nodeType===_t&&" "===e.nodeValue&&e.remove()}function h(t,e){var n=document.createElement("div");for(n.innerHTML=e,d(n.firstChild);n.firstChild;)t.appendChild(n.firstChild)}function f(t){if(t.match(/([^?]*)\?([^:]*):([^;]*)|(\s*=\s*)[^;]*/g)){var e=t.split("?"),n=e[0],o=e[1].split(":")[0],i=e[1].split(":")[1];return!!this&&(this[n]?{value:xt(o),state:n}:{value:xt(i),state:n})}return!1}function p(e,n,o){n&&(o=!1),n=n||this;var i=e.match(/{{([^{}]+)}}/g);for(Et=e,Lt=0,It=i.length;Lt<It;Lt++){if(At=i[Lt].replace(/{{([^{}]+)}}/g,"$1"),Mt=f.call(n,At),Ot=St(At),Mt)t(At,o),Et=Et.replace("{{"+At+"}}",Mt.value);else if(Ot){if("this"===Ot[0]&&"function"==typeof this[Ot[1]]){var r=this[Ot[1]](n);void 0!==r&&(Et=Et.replace("{{"+At+"}}",r))}}else void 0!==n[At]&&(t(At,o),Et=Et.replace("{{"+At+"}}",n[At]));Dt=Et.match(Nt),Dt&&(Et=17===Dt[0].length?Et.replace(' checked="checked"'," checked"):Et.replace(' checked=""',""))}return Et}function m(t,e,n,o){var i=t.replace("svg:",""),r=Ct[i],l=p.call(this,r,n,o);l.match(jt)||(h(Vt,l),e.parentNode.replaceChild(Vt.firstChild,e))}function v(t,e,o,i,r){var l=void 0,a=void 0;t.match(Pt)&&(l=t.replace(Pt,"$1").trim(),l.match(Rt)?(a=l.replace("model:",""),n.call(this,e,a,o)):l.match(Ft)?s.call(this,l,e):this.IS_SVG&&l.match(Ut)&&m.call(this,l,e,i,r))}function y(t,e,n){t.nodeValue=t.nodeValue.replace(RegExp(e,"g"),n)}function g(e,n,o,i,r){var l=e.match(Gt);if(l)for(var a=l.length,c=void 0,s=void 0,u=void 0,d=this,h=r||this;a;)if(a--,c=l[a].replace(Gt,"$1"),s=f.call(h,c),u=St(c)){if(i){if("this"===u[0]&&void 0!==d[u[1]]&&"function"==typeof d[u[1]]){var p=d[u[1]](h);return void 0!==p?p:e}return t(c,o),e.replace(l,d[u[0]][u[1]])}if("this"===u[0]&&void 0!==d[u[1]]&&"function"==typeof d[u[1]]){var m=d[u[1]]();void 0!==m&&y(n,"{{"+c+"}}",m)}else t(c,o),y(n,"{{"+c+"}}",d[u[0]][u[1]])}else if(s){if(t(s.state,o),i)return e.replace(l,s.value);c=c.replace("?","\\?"),y(n,"{{"+c+"}}",s.value)}else if(void 0!==h[c]){if(t(c,o),i)return e.replace(l,h[c]);y(n,"{{"+c+"}}",h[c])}}function b(t,e,n){var o=t.attributes,i=0,r=void 0,l=void 0,a=void 0;for(i=o.length;i--;)r=o[i],a=r.localName,l=r.nodeValue,Bt.test(a)?(t.removeAttribute(a),a=g.call(this,a,t,e,!0,n),t.setAttribute(a,l)):Bt.test(l)&&(l=g.call(this,l,t,e,!0,n),"checked"===a?""===l?t.removeAttribute(a):t.setAttribute(a,""):""===l?t.setAttribute(a,""):t.setAttribute(a,l))}function w(t,e){for(var n=void 0;e;){if(n=e,e=e.parentNode,n.nodeType===qt&&n.hasAttribute("kdata-id"))return{id:n.getAttribute("kdata-id"),node:n};n.isEqualNode(t)&&(e=null)}}function k(t,e){var n=Object.keys(e)[0],o=e[n];void 0!==this[o]&&"function"==typeof this[o]&&t.addEventListener(n,this[o].bind(this),!!e.useCapture)}function C(t,e,n,o){if(o.stopPropagation(),o.target!==o.currentTarget){var i=w(n,o.target);this[e](t.list[$t(i.id,t)],o.target,i.node,o)}}function _(t,e){var n=Object.keys(e)[0],o=e[n];if(void 0!==this[o]&&"function"==typeof this[o]){var i=t.firstChild.nodeValue.replace(Wt,"$1").trim();i=i.replace("model:","");t.addEventListener(n,C.bind(this,this[i],o,t),!!e.useCapture)}}function T(t){for(var e=t.attributes,n=0,o=void 0,i=void 0,r=void 0,l=void 0,a=void 0,c=[],s=void 0,u=void 0;n<e.length;)o=e[n],i=o.localName,r=o.nodeValue,/^k-/.test(i)&&(l=i.replace(/^k-/,""),a=r.match(/[a-zA-Z]+(?![^(]*\))/)[0],u=r.match(/\(([^{}]+)\)/),u=u?u[1]:"",s={},s[l]=a,u&&(s[u]=!0),s.isModel=!1,c.push(s),t.hasChildNodes()&&t.firstChild.nodeType!==Zt&&t.firstChild.nodeValue.match(Kt)&&(s.isModel=!0)),n++;return c}function x(t,e,n){for(var o=this;t;)te=t,t=t.nextSibling,te.nodeType===Zt?(te.hasAttributes()&&(b.call(this,te,e,n),tt(te.id)||(Qt=T.call(this,te),Qt.length&&Qt.map(function(t){t.isModel?_.call(o,te,t):k.call(o,te,t),te.removeAttribute("k-"+Object.keys(t)[0])}))),x.call(this,te.firstChild,e,n)):te.nodeType===Jt&&te.nodeValue.match(zt)?(Xt=te.nodeValue.trim().match(Yt),Xt=Xt&&Xt[0],this[Xt]&&r.call(this,te,Xt,"conditional-set",S,e)):te.nodeType===Jt&&te.nodeValue.match(Ht)&&!te.nodeValue.match(zt)?v.call(this,te.nodeValue,te,S,n,e):g.call(this,te.nodeValue,te,e,null,n)}function S(){x.apply(this,arguments)}function N(t,e){return j(e)||E(t,e)||t.isEqualNode(e)}function E(t,e){return A(t)&&A(e)}function A(t){return null!=t.getAttribute("data-ignore")}function M(t,e){"INPUT"===t.nodeName&&t.checked!==e.checked&&(t.checked=e.checked)}function L(t,e){for(var n=e.attributes,o={},i=0;i<n.length;)o[n[i].name]=n[i].value,i++;for(var r=t.attributes,l={},a=0;a<r.length;)l[r[a].name]=r[a].value,a++;for(var c in o)t.attributes[c]&&t.attributes[c].name===c&&t.attributes[c].value!==o[c]?t.setAttribute(c,o[c]):t.hasAttribute(c)||/^k-/.test(c)||t.setAttribute(c,o[c]);for(var s in l)e.attributes[s]&&t.attributes[s]||t.removeAttribute(s)}function I(t,e){if(t.nodeType===e.nodeType)if(t.nodeType===ee){if(M(t,e),N(t,e))return;O(t.firstChild,e.firstChild),t.nodeName===e.nodeName?L(t,e):t.parentNode.replaceChild(e,t)}else t.nodeValue!==e.nodeValue&&(t.nodeValue=e.nodeValue);else t.parentNode.replaceChild(e,t)}function D(t,e){return t.length-e-1}function O(t,e){for(var n=0,o=[];e;)n++,ne=e,e=e.nextSibling,o.push(ne);for(var i=void 0,r=t&&t.parentNode;t;)if(n--,oe=t,t=t.nextSibling,i=D(o,n),oe&&o[i]?I(oe,o[i]):oe&&!o[i]&&r.removeChild(oe),null===t)for(;n>0;)n--,i=D(o,n),r.appendChild(o[i])}function j(t){return t.hasAttribute("pristine-model")}function V(t){var e=tt(this.el);e&&!this.IS_STUB?O(e.firstChild,t):e&&!j(t)&&O(e.firstChild,t.firstChild)}function P(){ue[this.ID]&&(ue[this.ID]=[])}function R(t){ue[this.ID]=ue[this.ID]||[],ue[this.ID].indexOf(t)===-1&&(ue[this.ID]=ue[this.ID].concat(t))}function F(t){a.call(this,R.bind(this)),S.call(this,this.base.firstChild,R.bind(this));var e=t||tt(this.el);e?(e.nodeType===he?e.setAttribute("data-ignore",""):(et(1===this.base.childNodes.length,"Sub-component should only has a single rootNode."),!this.base.firstChild.hasAttribute("data-ignore")&&this.base.firstChild.setAttribute("data-ignore","")),se.call(this),t||e.appendChild(this.base),this.componentDidMount&&"function"==typeof this.componentDidMount&&this.componentDidMount()):et(!1,'No element id: "'+this.el+'" exist or is this a child component?')}function U(t){var e=void 0,n=document.createDocumentFragment();return P.call(this),"string"==typeof t?(e=t.trim().replace(/\s+/g," "),e=u.call(this,e),h(n,e)):"object"===(void 0===t?"undefined":G(t))&&t.nodeType?t.nodeType===be?n.appendChild(t):t.nodeType===ye?n=t:t.nodeType===ge?n.appendChild(t):et(!1,"Unable to parse instance, unknown type."):et(!1,"Parameter is not a string or a html element."),this.__pristineFragment__=n.cloneNode(!0),this.base=n,this}var G="function"==typeof Symbol&&"symbol"==typeof Symbol.iterator?function(t){return typeof t}:function(t){return t&&"function"==typeof Symbol&&t.constructor===Symbol&&t!==Symbol.prototype?"symbol":typeof t},B=function(t){return function(){var e=t.apply(this,arguments);return new Promise(function(t,n){function o(i,r){try{var l=e[i](r),a=l.value}catch(t){return void n(t)}return l.done?void t(a):Promise.resolve(a).then(function(t){o("next",t)},function(t){o("throw",t)})}return o("next")})}},q=function(){function t(t,e){for(var n=0;n<e.length;n++){var o=e[n];o.enumerable=o.enumerable||!1,o.configurable=!0,"value"in o&&(o.writable=!0),Object.defineProperty(t,o.key,o)}}return function(e,n,o){return n&&t(e.prototype,n),o&&t(e,o),e}}(),W=Object.assign||function(t){for(var e=1;e<arguments.length;e++){var n=arguments[e];for(var o in n)Object.prototype.hasOwnProperty.call(n,o)&&(t[o]=n[o])}return t},$=function(t,e){if("function"!=typeof e&&null!==e)throw new TypeError("Super expression must either be null or a function, not "+typeof e);t.prototype=Object.create(e&&e.prototype,{constructor:{value:t,enumerable:!1,writable:!0,configurable:!0}}),e&&(Object.setPrototypeOf?Object.setPrototypeOf(t,e):t.__proto__=e)},z=function(t,e){if(!t)throw new ReferenceError("this hasn't been initialised - super() hasn't been called");return!e||"object"!=typeof e&&"function"!=typeof e?t:e},Y=function(t,e){return t.raw=e,t};!function(t){function e(t,e,n,i){var r=e&&e.prototype instanceof o?e:o,l=Object.create(r.prototype);return l._invoke=c(t,n,new h(i||[])),l}function n(t,e,n){try{return{type:"normal",arg:t.call(e,n)}}catch(t){return{type:"throw",arg:t}}}function o(){}function i(){}function r(){}function l(t){["next","throw","return"].forEach(function(e){t[e]=function(t){return this._invoke(e,t)}})}function a(t){function e(o,i,r,l){var a=n(t[o],t,i);if("throw"!==a.type){var c=a.arg,s=c.value;return s&&"object"===(m===s?"undefined":G(s))&&y.call(s,"__await")?Promise.resolve(s.__await).then(function(t){e("next",t,r,l)},function(t){e("throw",t,r,l)}):Promise.resolve(s).then(function(t){c.value=t,r(c)},l)}l(a.arg)}function o(t,n){function o(){return new Promise(function(o,i){e(t,n,o,i)})}return i=i?i.then(o,o):o()}var i;this._invoke=o}function c(t,e,o){var i=T;return function(r,l){if(i===S)throw Error("Generator is already running");if(i===N){if("throw"===r)throw l;return p()}for(o.method=r,o.arg=l;;){var a=o.delegate;if(a){var c=s(a,o);if(c){if(c===E)continue;return c}}if("next"===o.method)o.sent=o._sent=o.arg;else if("throw"===o.method){if(i===T)throw i=N,o.arg;o.dispatchException(o.arg)}else"return"===o.method&&o.abrupt("return",o.arg);i=S;var u=n(t,e,o);if("normal"===u.type){if(i=o.done?N:x,u.arg===E)continue;return{value:u.arg,done:o.done}}"throw"===u.type&&(i=N,o.method="throw",o.arg=u.arg)}}}function s(t,e){var o=t.iterator[e.method];if(o===m){if(e.delegate=null,"throw"===e.method){if(t.iterator.return&&(e.method="return",e.arg=m,s(t,e),"throw"===e.method))return E;e.method="throw",e.arg=new TypeError("The iterator does not provide a 'throw' method")}return E}var i=n(o,t.iterator,e.arg);if("throw"===i.type)return e.method="throw",e.arg=i.arg,e.delegate=null,E;var r=i.arg;return r?r.done?(e[t.resultName]=r.value,e.next=t.nextLoc,"return"!==e.method&&(e.method="next",e.arg=m),e.delegate=null,E):r:(e.method="throw",e.arg=new TypeError("iterator result is not an object"),e.delegate=null,E)}function u(t){var e={tryLoc:t[0]};1 in t&&(e.catchLoc=t[1]),2 in t&&(e.finallyLoc=t[2],e.afterLoc=t[3]),this.tryEntries.push(e)}function d(t){var e=t.completion||{};e.type="normal",delete e.arg,t.completion=e}function h(t){this.tryEntries=[{tryLoc:"root"}],t.forEach(u,this),this.reset(!0)}function f(t){if(t){var e=t[b];if(e)return e.call(t);if("function"==typeof t.next)return t;if(!isNaN(t.length)){var n=-1,o=function e(){for(;++n<t.length;)if(y.call(t,n))return e.value=t[n],e.done=!1,e;return e.value=m,e.done=!0,e};return o.next=o}}return{next:p}}function p(){return{value:m,done:!0}}var m,v=Object.prototype,y=v.hasOwnProperty,g="function"==typeof Symbol?Symbol:{},b=g.iterator||"@@iterator",w=g.asyncIterator||"@@asyncIterator",k=g.toStringTag||"@@toStringTag",C="object"===("undefined"==typeof module?"undefined":G(module)),_=t.regeneratorRuntime;if(_)return C&&(module.exports=_),m;_=t.regeneratorRuntime=C?module.exports:{},_.wrap=e;var T="suspendedStart",x="suspendedYield",S="executing",N="completed",E={},A={};A[b]=function(){return this};var M=Object.getPrototypeOf,L=M&&M(M(f([])));L&&L!==v&&y.call(L,b)&&(A=L);var I=r.prototype=o.prototype=Object.create(A);i.prototype=I.constructor=r,r.constructor=i,r[k]=i.displayName="GeneratorFunction",_.isGeneratorFunction=function(t){var e="function"==typeof t&&t.constructor;return!!e&&(e===i||"GeneratorFunction"===(e.displayName||e.name))},_.mark=function(t){return Object.setPrototypeOf?Object.setPrototypeOf(t,r):(t.__proto__=r,k in t||(t[k]="GeneratorFunction")),t.prototype=Object.create(I),t},_.awrap=function(t){return{__await:t}},l(a.prototype),a.prototype[w]=function(){return this},_.AsyncIterator=a,_.async=function(t,n,o,i){var r=new a(e(t,n,o,i));return _.isGeneratorFunction(n)?r:r.next().then(function(t){return t.done?t.value:r.next()})},l(I),I[k]="Generator",I[b]=function(){return this},I.toString=function(){return"[object Generator]"},_.keys=function(t){var e=[];for(var n in t)e.push(n);return e.reverse(),function n(){for(;e.length;){var o=e.pop();if(o in t)return n.value=o,n.done=!1,n}return n.done=!0,n}},_.values=f,h.prototype={constructor:h,reset:function(t){if(this.prev=0,this.next=0,this.sent=this._sent=m,this.done=!1,this.delegate=null,this.method="next",this.arg=m,this.tryEntries.forEach(d),!t)for(var e in this)"t"===e.charAt(0)&&y.call(this,e)&&!isNaN(+e.slice(1))&&(this[e]=m)},stop:function(){this.done=!0;var t=this.tryEntries[0],e=t.completion;if("throw"===e.type)throw e.arg;return this.rval},dispatchException:function(t){function e(e,o){return r.type="throw",r.arg=t,n.next=e,o&&(n.method="next",n.arg=m),!!o}if(this.done)throw t;for(var n=this,o=this.tryEntries.length-1;o>=0;--o){var i=this.tryEntries[o],r=i.completion;if("root"===i.tryLoc)return e("end");if(i.tryLoc<=this.prev){var l=y.call(i,"catchLoc"),a=y.call(i,"finallyLoc");if(l&&a){if(this.prev<i.catchLoc)return e(i.catchLoc,!0);if(this.prev<i.finallyLoc)return e(i.finallyLoc)}else if(l){if(this.prev<i.catchLoc)return e(i.catchLoc,!0)}else{if(!a)throw Error("try statement without catch or finally");if(this.prev<i.finallyLoc)return e(i.finallyLoc)}}}},abrupt:function(t,e){for(var n=this.tryEntries.length-1;n>=0;--n){var o=this.tryEntries[n];if(o.tryLoc<=this.prev&&y.call(o,"finallyLoc")&&this.prev<o.finallyLoc){var i=o;break}}i&&("break"===t||"continue"===t)&&i.tryLoc<=e&&e<=i.finallyLoc&&(i=null);var r=i?i.completion:{};return r.type=t,r.arg=e,i?(this.method="next",this.next=i.finallyLoc,E):this.complete(r)},complete:function(t,e){if("throw"===t.type)throw t.arg;return"break"===t.type||"continue"===t.type?this.next=t.arg:"return"===t.type?(this.rval=this.arg=t.arg,this.method="return",this.next="end"):"normal"===t.type&&e&&(this.next=e),E},finish:function(t){for(var e=this.tryEntries.length-1;e>=0;--e){var n=this.tryEntries[e];if(n.finallyLoc===t)return this.complete(n.completion,n.afterLoc),d(n),E}},catch:function(t){for(var e=this.tryEntries.length-1;e>=0;--e){var n=this.tryEntries[e];if(n.tryLoc===t){var o=n.completion;if("throw"===o.type){var i=o.arg;d(n)}return i}}throw Error("illegal catch attempt")},delegateYield:function(t,e,n){return this.delegate={iterator:f(t),resultName:e,nextLoc:n},"next"===this.method&&(this.arg=m),E}}}(function(){return this}()||Function("return this")());var H,K,Z,J,Q=function(){var t=function(){return(1*Math.random()*1e17).toString(36)};return"KDATA-"+t()+"-"+t()},X=function(){return(1*Math.random()*1e17).toString(36)},tt=function(t){return document.getElementById(t)},et=function(t,e){if(!t)throw Error("(keet) "+e)},nt=function(){for(var t=arguments.length,e=Array(t),n=0;n<t;n++)e[n]=arguments[n];var o=e.shift(),i=e.slice(),r=o.raw.reduce(function(t,e,n){return t+i[n-1]+e});return r=r.split(/\n+/),r=r.map(function(t){return t.trim()}).join("")},ot=function(){return function(t){t.IS_STUB=!0}},it=11,rt={},lt=/\{\{\/([^{}]+)\}\}/g,at=/\{\{model:([^{}]+)\}\}/g,ct=/([^{{model:])(.*?)(?=\}\})/g,st=1,ut=8,dt={},ht=1,ft=8,pt=/\{\{\?([^{}]+)\}\}/g,mt=/([^{?])(.*?)(?=\}\})/g,vt=void 0,yt=void 0,gt=void 0,bt=void 0,wt={},kt=/(<svg)([^<]*|[^>]*)(.*?)(?=<\/svg>)/g,Ct={},_t=3,Tt=1,xt=function(t){return"''"===t||'""'===t||"null"===t?"":t},St=function(t){var e=t.match(/\.*\./g);return e&&e.length>0?t.split("."):void 0},Nt=RegExp(/(\schecked=")(.*?)(?=")/g),Et="",At=void 0,Mt=void 0,Lt=void 0,It=void 0,Dt=void 0,Ot=void 0,jt=/{{([^{}]+)}}/g,Vt=document.createDocumentFragment(),Pt=/{{([^{}]+)}}/g,Rt=/^model:/g,Ft=/^component:([^{}]+)/g,Ut=/^svg:([^{}]+)/g,Gt=/{{([^{}]+)}}/g,Bt=/{{([^{}]+)}}/g,qt=1,Wt=/{{([^{}]+)}}/g,$t=function(t,e){return e.list.map(function(t){return t["kdata-id"]}).indexOf(t)},zt=/\{\{\?([^{}]+)\}\}/g,Yt=/([^{?])(.*?)(?=\}\})/g,Ht=/{{([^{}]+)}}/g,Kt=/\{\{model:([^{}]+)\}\}/g,Zt=1,Jt=8,Qt=void 0,Xt=void 0,te=void 0,ee=1,ne=void 0,oe=void 0,ie=0,re=function(){de.call(this),this.componentDidUpdate&&"function"==typeof this.componentDidUpdate&&this.componentDidUpdate()},le={},ae=function(t,e){var n=this;le[this.ID]=le[this.ID]||null,clearTimeout(le[this.ID]),le[this.ID]=setTimeout(function(){return t.call(n)},e)},ce=function t(e){var n=this,o=void 0,i=void 0;if(ue[this.ID]&&e<ue[this.ID].length){if(o=ue[this.ID][e],i=this[o],void 0===i&&(i=St(o)),i&&Array.isArray(i)){var r=this[i[0]][i[1]];Object.defineProperty(this[i[0]],i[1],{enumerable:!1,configurable:!0,get:function(){return r},set:function(t){r=t,ae.call(n,re,ie)}})}else Object.defineProperty(this,o,{enumerable:!1,configurable:!0,get:function(){return i},set:function(t){i=t,ae.call(n,re,ie)}});e++,t.call(this,e)}},se=function(){ce.call(this,0)},ue={},de=function(){this.base=this.__pristineFragment__.cloneNode(!0),S.call(this,this.base.firstChild,R.bind(this)),V.call(this,this.base.firstChild)},he=1,fe=function(t,e){return t["kdata-id"]!==e["kdata-id"]},pe={},me=function(){for(var t=this,e=arguments.length,n=Array(e),o=0;o<e;o++)n[o]=arguments[o];pe[this.mId]&&clearTimeout(pe[this.mId]),pe[this.mId]=setTimeout(function(){return t.exec&&"function"==typeof t.exec&&t.exec.apply(null,n)},0)},ve=function(){function t(e){this.mId=t.genIdentity,pe[this.mId]=null,this.enableFiltering=e||null,this.model=[],Object.defineProperty(this,"list",{enumerable:!1,configurable:!0,get:function(){return this.model},set:function(t){this.model=t,this.dirty=!0,me.call(this,this.model,this.listFilter)}}),Object.defineProperty(this,"listFilter",{enumerable:!1,configurable:!0,get:function(){var t=this;return this.prop?this.model.filter(function(e){return e[t.prop]===t.value}):this.model}})}return t.prototype.subscribe=function(t){this.exec=t},t.prototype.add=function(t){this.list=this.list.concat(W({},t,{"kdata-id":X()}))},t.prototype.update=function(t){this.list=this.list.map(function(e){return fe(e,t)?e:t})},t.prototype.filter=function(t,e){this.prop=t,this.value=e,this.list=this.list},t.prototype.destroy=function(t){this.list=this.list.filter(function(e){return fe(e,t)})},q(t,null,[{key:"genIdentity",get:function(){return X()}}]),t}(),ye=11,ge=3,be=1,we=function(){function t(e){e&&(this.LOCAL=!0),this.ID=t.indentity,this.autoRender()}return t.prototype.autoRender=function(){function t(){return e.apply(this,arguments)}var e=B(regeneratorRuntime.mark(function t(){var e,n;return regeneratorRuntime.wrap(function(t){for(;;)switch(t.prev=t.next){case 0:return t.next=2,this.el;case 2:if("function"!=typeof this.render){t.next=9;break}if(e=this.render(),this.mount(e),n=Object.getPrototypeOf(this),!(this.IS_STUB||n&&n.constructor.IS_STUB)){t.next=8;break}return t.abrupt("return");case 8:this.cycleVirtualDomTree();case 9:case"end":return t.stop()}},t,this)}));return t}(),t.prototype.mount=function(t){return this.LOCAL||(this.el?this.storeRef(this.el):et(!1,"Component has no unique identifier.")),U.call(this,t)},t.prototype.cycleVirtualDomTree=function(t){this.componentWillMount&&"function"==typeof this.componentWillMount&&this.componentWillMount(),t&&(this.IS_STUB=!0),F.call(this,t)},t.prototype.callBatchPoolUpdate=function(){ae.call(this,re,1)},t.prototype.subscribe=function(t){this.exec=t},t.prototype.inform=function(){for(var t=arguments.length,e=Array(t),n=0;n<t;n++)e[n]=arguments[n];this.exec&&"function"==typeof this.exec&&this.exec.apply(null,e)},t.prototype.storeRef=function(t){window.__keetGlobalComponentRef__=window.__keetGlobalComponentRef__||[],~window.__keetGlobalComponentRef__.map(function(t){return t.identifier}).indexOf(t)?et(!1,"The component name: "+t+" already exist in the global pool."):window.__keetGlobalComponentRef__=window.__keetGlobalComponentRef__.concat({identifier:t,component:this})},q(t,null,[{key:"indentity",get:function(){return Q()}}]),t}(),ke=function(t){function e(){return z(this,t.apply(this,arguments))}return $(e,t),e.prototype.clearCompleted=function(){this.list=this.list.filter(function(t){return!t.completed})},e.prototype.updateAll=function(t){this.list=this.list.map(function(e){return W({},e,{completed:t})})},e}(ve),Ce=Y(['\n      <ul id="todoList" class="todo-list" k-click="evtTodo()" k-dblclick="editTodo()" k-keydown="keyTodo()" k-blur="blurTodo(useCapture)">\n        <!-- {{model:todoModel}} -->\n          <li class="{{this.activeClass}}">\n            <div class="view">\n              <input class="toggle" type="checkbox" checked="{{completed?checked:\'\'}}">\n              <label>{{title}}</label>\n              <button class="destroy"></button>\n            </div>\n            <input class="edit" value="{{title}}">\n          </li>\n        <!-- {{/model:todoModel}} -->\n      </ul>\n    '],['\n      <ul id="todoList" class="todo-list" k-click="evtTodo()" k-dblclick="editTodo()" k-keydown="keyTodo()" k-blur="blurTodo(useCapture)">\n        <!-- {{model:todoModel}} -->\n          <li class="{{this.activeClass}}">\n            <div class="view">\n              <input class="toggle" type="checkbox" checked="{{completed?checked:\'\'}}">\n              <label>{{title}}</label>\n              <button class="destroy"></button>\n            </div>\n            <input class="edit" value="{{title}}">\n          </li>\n        <!-- {{/model:todoModel}} -->\n      </ul>\n    ']),_e=13,Te=27,xe=(H=ot(),H(K=function(t){function e(){for(var e,n,o,i=arguments.length,r=Array(i),l=0;l<i;l++)r[l]=arguments[l];return e=n=z(this,t.call.apply(t,[this].concat(r))),n.el="todoList",n.todoModel=new ke("filter"),o=e,z(n,o)}return $(e,t),e.prototype.activeClass=function(t){if(t){var e=[];return t.completed&&(e=e.concat("completed")),t.editing&&(e=e.concat("editing")),e.join(" ")}},e.prototype.addTodo=function(t){this.todoModel.add(t)},e.prototype.evtTodo=function(t,e){"toggle"===e.className?this.todoModel.update(W({},t,{completed:!t.completed})):"destroy"===e.className&&this.todoModel.destroy(t)},e.prototype.filterTodo=function(t){"#/all"===t?this.todoModel.filter(null):"#/active"===t?this.todoModel.filter("completed",!1):"#/completed"===t&&this.todoModel.filter("completed",!0)},e.prototype.saveEditing=function(t,e){""===e?this.todoModel.destroy(t):this.todoModel.update(W({},t,{title:e,editing:!1})),this.isEditing=!1,this.tgt=null},e.prototype.focus=function(t,e){t.focus(),t.setSelectionRange(e,e)},e.prototype.editTodo=function(t,e,n){"LABEL"===e.nodeName&&(this.isEditing=!0,this.tgt=n.querySelector(".edit"),this.todoModel.update(W({},t,{editing:!0})))},e.prototype.componentDidUpdate=function(){this.tgt&&this.focus(this.tgt,this.tgt.value.length)},e.prototype.blurTodo=function(t,e){this.isEditing&&this.saveEditing(t,e.value.trim())},e.prototype.keyTodo=function(t,e,n,o){o.which!==_e&&o.which!==Te||(o.which===_e?this.saveEditing(t,e.value.trim()):this.saveEditing(t,t.title))},e.prototype.render=function(){return nt(Ce)},e}(we))||K),Se=new xe,Ne=Se.todoModel,Ee=function(t){return t.charAt(0).toUpperCase()+t.slice(1)},Ae=function(t){function e(){return z(this,t.apply(this,arguments))}return $(e,t),e.prototype.switch=function(t,e){this.list=this.list.map(function(n){return n.hash===t?W({},n,e):W({},n,{selected:!1})})},e}(ve),Me=Y(['\n      <ul id="filters" class="filters">\n        <!-- {{model:filterModel}} -->\n        <li id="{{name}}" k-click="updateUrl()"><a class="{{selected?selected:\'\'}}" href="{{hash}}">{{name}}</a></li>\n        <!-- {{/model:filterModel}} -->\n      </ul>\n    '],['\n      <ul id="filters" class="filters">\n        <!-- {{model:filterModel}} -->\n        <li id="{{name}}" k-click="updateUrl()"><a class="{{selected?selected:\'\'}}" href="{{hash}}">{{name}}</a></li>\n        <!-- {{/model:filterModel}} -->\n      </ul>\n    ']);new(Z=ot(),Z(J=function(t){function e(){for(var e,n,o,i=arguments.length,r=Array(i),l=0;l<i;l++)r[l]=arguments[l];return e=n=z(this,t.call.apply(t,[this].concat(r))),n.el="filters",n.filterModel=new Ae,o=e,z(n,o)}return $(e,t),e.prototype.componentWillMount=function(){var t=this;this.filterModel.subscribe(function(){return t.callBatchPoolUpdate()}),""===window.location.hash&&window.history.pushState({},null,"#/all")},e.prototype.componentDidMount=function(){var t=this;this.filterModel.switch(window.location.hash,{selected:!0}),"#/all"!==window.location.hash&&Se.filterTodo(window.location.hash),window.onpopstate=function(){return t.updateUrl(window.location.hash)}},e.prototype.updateUrl=function(t){this.filterModel.switch(t,{selected:!0}),Se.filterTodo(t)},e.prototype.render=function(){var t=this;return Array.from(["all","active","completed"]).map(function(e){return t.filterModel.add({hash:"#/"+e,name:Ee(e),selected:!1})}),nt(Me)},e}(we))||J);var Le=Y(['\n      <section class="todoapp">\n        <header id="header">\n          <h1>todos</h1>\n          <input id="new-todo" class="new-todo" k-keydown="create()" placeholder="What needs to be done?" autofocus>\n        </header>\n        <!-- {{?todoState}} -->\n        <section class="main">\n          <input id="toggle-all" class="toggle-all" type="checkbox" checked="{{isChecked?checked:\'\'}}" k-click="completeAll()">\n          <label for="toggle-all">Mark all as complete</label>\n          <!-- {{component:todoList}} -->\n        </section>\n        <footer class="footer">\n          <span class="todo-count">\n            <strong>{{count}}</strong> item{{plural}} left\n          </span>\n          <!-- {{component:filters}} -->\n          <!-- {{?clearToggle}} -->\n          <button id="clear-completed" k-click="clearCompleted()" class="clear-completed">Clear completed</button>\n          <!-- {{/clearToggle}} -->\n        </footer>\n        <!-- {{/todoState}} -->\n      </section>\n      <footer class="info">\n        <p>Double-click to edit a todo</p>\n        <p>Created by <a href="https://github.com/syarul">Shahrul Nizam Selamat</a></p>\n        <p>Part of <a href="http://todomvc.com">TodoMVC</a></p>\n      </footer>\n    '],['\n      <section class="todoapp">\n        <header id="header">\n          <h1>todos</h1>\n          <input id="new-todo" class="new-todo" k-keydown="create()" placeholder="What needs to be done?" autofocus>\n        </header>\n        <!-- {{?todoState}} -->\n        <section class="main">\n          <input id="toggle-all" class="toggle-all" type="checkbox" checked="{{isChecked?checked:\'\'}}" k-click="completeAll()">\n          <label for="toggle-all">Mark all as complete</label>\n          <!-- {{component:todoList}} -->\n        </section>\n        <footer class="footer">\n          <span class="todo-count">\n            <strong>{{count}}</strong> item{{plural}} left\n          </span>\n          <!-- {{component:filters}} -->\n          <!-- {{?clearToggle}} -->\n          <button id="clear-completed" k-click="clearCompleted()" class="clear-completed">Clear completed</button>\n          <!-- {{/clearToggle}} -->\n        </footer>\n        <!-- {{/todoState}} -->\n      </section>\n      <footer class="info">\n        <p>Double-click to edit a todo</p>\n        <p>Created by <a href="https://github.com/syarul">Shahrul Nizam Selamat</a></p>\n        <p>Part of <a href="http://todomvc.com">TodoMVC</a></p>\n      </footer>\n    ']);return new(function(t){function e(){for(var e,n,o,i=arguments.length,r=Array(i),l=0;l<i;l++)r[l]=arguments[l];return e=n=z(this,t.call.apply(t,[this].concat(r))),n.el="todo",n.isChecked=!1,n.count=0,n.plural="",n.clearToggle=!1,n.todoState=!1,o=e,z(n,o)}return $(e,t),e.prototype.componentWillMount=function(){var t=this;Ne.subscribe(function(e){var n=e.filter(function(t){return!t.completed});t.clearToggle=!!e.filter(function(t){return t.completed}).length,t.todoState=!!e.length,t.plural=1===n.length?"":"s",t.count=n.length,t.isChecked=!n.length})},e.prototype.componentDidMount=function(){},e.prototype.create=function(t){if(13===t.keyCode){var e=t.target.value.trim();e&&(Se.addTodo({title:e,completed:!1,editing:!1}),t.target.value="")}},e.prototype.completeAll=function(){this.isChecked=!this.isChecked,Ne.updateAll(this.isChecked)},e.prototype.clearCompleted=function(){Ne.clearCompleted()},e.prototype.render=function(){return nt(Le)},e}(we))}();
//# sourceMappingURL=app.js.map