!function(e){if("object"==typeof exports&&"undefined"!=typeof module)module.exports=e();else if("function"==typeof define&&define.amd)define([],e);else{("undefined"!=typeof window?window:"undefined"!=typeof global?global:"undefined"!=typeof self?self:this).Keet=e()}}(function(){return function e(t,n,r){function i(o,l){if(!n[o]){if(!t[o]){var s="function"==typeof require&&require;if(!l&&s)return s(o,!0);if(a)return a(o,!0);var c=new Error("Cannot find module '"+o+"'");throw c.code="MODULE_NOT_FOUND",c}var p=n[o]={exports:{}};t[o][0].call(p.exports,function(e){var n=t[o][1][e];return i(n||e)},p,p.exports,e,t,n,r)}return n[o].exports}for(var a="function"==typeof require&&require,o=0;o<r.length;o++)i(r[o]);return i}({1:[function(e,t,n){t.exports=function(e){return Array.isArray(e)?e.map(function(e){return e}):function(e){var t={};if("object"!=typeof e)return t.copy=e,t.copy;for(var n in e)t[n]=e[n];return t}(e)}},{}],2:[function(e,t,n){var r=function(e,t){if(!t)return!1;for(var n=t.firstChild;null!==n;n=n.nextSibling)e.push(n),n.hasChildNodes()&&r(e,n)};n.loopChilds=r;n.updateElem=function(e,t){var n=[],i=[];n.push(e),i.push(t),r(n,e),r(i,t),n.map(function(e,t,r){var a,o;e&&1===e.nodeType&&e.hasAttributes()?function(e,t){if(e){for(var n=e.attributes,r={},i=n.length-1;i>=0;i--)r[n[i].name]=n[i].value;for(var a in r)t.attributes[a]&&t.attributes[a].name===a&&t.attributes[a].value!==r[a]&&t.setAttribute(a,r[a]);""===t.textContent&&e.textContent&&(t.textContent=e.textContent),"checkbox"===t.type&&!t.checked&&e.checked&&(t.checked=!0),"checkbox"===t.type&&t.checked&&!e.checked&&(t.checked=!1),r={}}}(i[t],e):e&&3===e.nodeType&&(a=i[t],o=e,a&&a.nodeValue!==o.nodeValue&&(o.nodeValue=a.nodeValue)),t===r.length-1&&(n.splice(0),i.splice(0))})}},{}],3:[function(e,t,n){var r=e("./copy"),i=e("./tag"),a=e("./tmplHandler"),o=e("./tmplStylesHandler"),l=e("./tmplClassHandler"),s=e("./tmplAttrHandler"),c=e("./processEvent"),p=e("./elementUtils").updateElem,u=e("./utils").selector,f=e("./utils").getId,h=e("./genTemplate"),d=function(){var e=this;return new Proxy(e,{set:function(t,n,r){var i={};i[n]=r;var a=[].slice.call(arguments);return a.unshift(i),a.unshift(n),function(){var e=this,t=[].shift.call(arguments),n=[].shift.call(arguments);Object.keys(this.base).map(function(r){var i=e.base[r].template;if(i){var a=i.match("{{"+t+"}}");a&&a.length&&Object.assign(e,n)}var o=e.base[r].style;o&&Object.keys(o).map(function(r){o[r].match("{{"+t+"}}")&&Object.assign(e,n)});var l,s=e.base[r]["keet-id"],c=u(s);e.hasOwnProperty(t)&&(e[t]=n[t]);var f=[].slice.call(arguments);l=m.apply(e,[e.base[r]].concat(f)),p(c,l)})}.apply(e,a),t[n]=r,!0}})},m=function(){var e=[].shift.call(arguments),t=[].slice.call(arguments),n=document.createElement("div"),p=r(e);delete p.template,delete p.tag,delete p.style,delete p.class;var u=e.template?a.call(this,e.template):null,f=o.call(this,e.style),h=l.call(this,e);h&&(p.class=h),t&&t.length&&s.apply(this,[p].concat(t));var m=e.tag?i(e.tag,u||"",p,f):e.template;n.innerHTML=m,"input"===e.tag&&(p.checked?n.childNodes[0].checked=!0:n.childNodes[0].removeAttribute("checked"));var v=d.apply(this,t);return this.__proxy__=v,c.apply(this,[n,v]),n.childNodes[0]};n.proxy=d,n.proxyList=function(e){var t=this;return new Proxy(e,{set:function(e,n,r){var i=parseInt(n);return Number.isInteger(i)&&function(e,t){var n=f(this.el),r=n.childNodes[e];if(r){var i=h.call(this,t);r.replaceWith(i)}else n.appendChild(h.call(this,t))}.apply(t,[i,r]),e[n]=r,!0},deleteProperty:function(e,n){var r=f(t.el),i=parseInt(n);return r.childNodes[i].remove(),!0}})},n.genElement=m},{"./copy":1,"./elementUtils":2,"./genTemplate":4,"./processEvent":6,"./tag":7,"./tmplAttrHandler":9,"./tmplClassHandler":10,"./tmplHandler":11,"./tmplStylesHandler":12,"./utils":13}],4:[function(e,t,n){var r=e("./processEvent");t.exports=function(e){var t,n,i=this.args,a=this.base.template.match(/{{([^{}]+)}}/g);return t=this.base.template,a.map(function(n){var r=n.replace(/{{([^{}]+)}}/g,"$1");if(t=t.replace(/{{([^{}]+)}}/,e[r]),i&&~i.indexOf(r)&&!e[r]){var a=new RegExp(" "+r+"='"+e[r]+"'","g");t=t.replace(a,"")}}),(n=document.createElement("div")).innerHTML=t,r.call(this,n),n.childNodes[0]}},{"./processEvent":6}],5:[function(e,t,n){var r=e("./genElement").genElement,i=e("./genElement").proxy,a=e("./tmplHandler"),o=e("./tmplArrayHandler"),l=e("./processEvent"),s=e("./utils").genId;t.exports=function(){if("object"!=typeof this.base)throw new Error("instance is not an object");var e=this,t=[],n=[].slice.call(arguments);if(Array.isArray(this.base.list)){var c=o.apply(this,n);c.tmpl.map(function(n){var r=document.createElement("div");r.innerHTML=n,l.apply(e,[r,c.proxyRes]),t.push(r.childNodes[0])}),this.list=c.proxyRes}else Object.keys(this.base).map(function(o){var c=e.base[o];if(c&&"object"==typeof c){var p=s();c["keet-id"]=p,e.base[o]["keet-id"]=p;var u=r.apply(e,[c].concat(n));t.push(u)}else{var f=a.call(e,c),h=document.createElement("div");h.innerHTML=f;var d=i.call(e);e.__proxy__=d,l.apply(e,[h,d]),t.push(h.childNodes[0])}});return t}},{"./genElement":3,"./processEvent":6,"./tmplArrayHandler":8,"./tmplHandler":11,"./utils":13}],6:[function(e,t,n){var r=e("./elementUtils").loopChilds,i=function(e,t,n,r){var a,o,l,s,c,p=t.attributes;e<p.length?(/^k-/.test(p[e].nodeName)&&(a=p[e].nodeName.split("-")[1],"function"==typeof(l=this[(o=p[e].nodeValue.split("("))[0]])&&(n.push(p[e].nodeName),s=[],(c=o[1].slice(0,-1).split(",").filter(function(e){return""!==e})).length&&c.map(function(e){s.push(e)}),t.addEventListener(a,l.bind.apply(l.bind(r),[t].concat(s)),!1))),e++,i.apply(this,[e,t,n,r])):n.map(function(e){t.removeAttribute(e)})};t.exports=function(e,t){var n=this,a=[],o=[];r(a,e),a.map(function(e){1===e.nodeType&&e.hasAttributes()&&i.apply(n,[0,e,o,t])}),a=[]}},{"./elementUtils":2}],7:[function(e,t,n){t.exports=function(){return function(){var e,t,n=[].slice.call(arguments),r=["<",n[0],">",n[1],"</",n[0],">"];if(n.length>2&&"object"==typeof n[2])for(e in n[2])"boolean"==typeof n[2][e]&&n[2][e]?r.splice(2,0," ",e):"class"===e&&Array.isArray(n[2][e])?r.splice(2,0," ",e,'="',n[2][e].join(" ").trim(),'"'):r.splice(2,0," ",e,'="',n[2][e],'"');if(n.length>3&&"object"==typeof n[3]){for(e in t=[r.indexOf(">"),0,' style="'],n[3])t.push(e),t.push(":"),t.push(n[3][e]),t.push(";");t.push('"'),r.splice.apply(r,t)}return r}.apply(null,arguments).join("")}},{}],8:[function(e,t,n){var r=e("./genElement").proxyList;t.exports=function(){var e=[].slice.call(arguments),t=this.base.template;t=t.trim().replace(/\s+/g," "),this.base.template=t;var n,i=this.base.list,a=t.match(/{{([^{}]+)}}/g),o=[];a&&a.length&&i.map(function(r){n=t,a.map(function(t){var i=t.replace(/{{([^{}]+)}}/g,"$1");if(n=n.replace(/{{([^{}]+)}}/,r[i]),e&&~e.indexOf(i)&&!r[i]){var a=new RegExp(" "+i+"='"+r[i]+"'","g");n=n.replace(a,"")}}),o.push(n)});var l=r.call(this,i);return{tmpl:o,proxyRes:l}}},{"./genElement":3}],9:[function(e,t,n){t.exports=function(){var e=this,t=[].shift.call(arguments);Object.keys(t).map(function(n){var r=t[n].match(/{{([^{}]+)}}/g);if(r&&r.length){var i="";r.map(function(r){var a=r.replace(/{{([^{}]+)}}/g,"$1");void 0!==e[a]&&(!1===e[a]?delete t[n]:(i+=e[a],t[n]=i))})}})}},{}],10:[function(e,t,n){t.exports=function(e){var t=this;if(e.class){var n=e.class.match(/{{([^{}]+)}}/g),r="";return n&&n.length&&n.map(function(e){var n=e.replace(/{{([^{}]+)}}/g,"$1");void 0!==t[n]&&t[n].cstore.map(function(e){r+=e+" "})}),r.length?r.trim():e.class}return!1}},{}],11:[function(e,t,n){t.exports=function(e){var t=this,n=(e=e.trim().replace(/\s+/g," ")).match(/{{([^{}]+)}}/g);return n&&n.length&&n.map(function(n){var r=n.replace(/{{([^{}]+)}}/g,"$1");void 0!==t[r]&&(e=e.replace(/{{([^{}]+)}}/,t[r]))}),e}},{}],12:[function(e,t,n){var r=e("./copy");t.exports=function(e){var t=this,n=r(e);return e&&Object.keys(n).map(function(e){var r=n[e].match(/{{([^{}]+)}}/g);r&&r.length&&r.map(function(r){var i=r.replace(/{{([^{}]+)}}/g,"$1");void 0!==t[i]&&(n[e]=n[e].replace(/{{([^{}]+)}}/,t[i]))})}),n}},{"./copy":1}],13:[function(e,t,n){n.getId=function(e){return document.getElementById(e)},n.genId=function(){return Math.round(1*Math.random()*1e12).toString(32)},n.selector=function(e){return document.querySelector('[keet-id="'+e+'"]')}},{}],14:[function(e,t,n){"use strict";var r=e("./components/utils").getId,i=e("./components/parseStr"),a=function(e,t,n){var r=this;e<n.length?(t.appendChild(n[e]),e++,a.apply(this,[e,t,n])):(Object.getOwnPropertyNames(Object.getPrototypeOf(this)).filter(function(e){return"constructor"!==e}).map(function(e){r[e]=r[e].bind(r.__proxy__)}),this.componentDidMount&&"function"==typeof this.componentDidMount&&this.componentDidMount())};function o(){this.base={},Object.defineProperty(this,"__proxy__",{enumerable:!1,writable:!0})}o.prototype.mount=function(e){return this.base=e,this},o.prototype.link=function(e){return this.el=e,this.componentWillMount&&"function"==typeof this.componentWillMount&&this.componentWillMount(),this.render(),this},o.prototype.render=function(){var e=r(this.el),t=i.apply(this,this.args);return e&&(e.innerHTML="",a.apply(this,[0,e,t])),this},o.prototype.cluster=function(){var e=[].slice.call(arguments);e.length>0&&e.map(function(e){"function"==typeof e&&e()})},t.exports=o},{"./components/parseStr":5,"./components/utils":13}]},{},[14])(14)});
