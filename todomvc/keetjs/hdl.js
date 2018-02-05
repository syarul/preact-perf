var Handlebars = require('handlebars');

// var genTemplate = require('keet/components/genTemplate')

// var a = Handlebars.compile('{{ name }}<%= name %>')({name: 'Jon'});


function genTemplate(template, obj) {
  var arrProps = template.match(/{{([^{}]+)}}/g)
  var tmpl
  var tempDiv
  tmpl = template
  var args = ['checked']
  arrProps.map(function (s) {
    // console.log(s)
    var rep = s.replace(/{{([^{}]+)}}/g, '$1')
    tmpl = tmpl.replace(/{{([^{}]+)}}/, obj[rep])
    if (args && ~args.indexOf(rep) && !obj[rep]) {
      var re = new RegExp(' ' + rep + '="' + obj[rep] + '"', 'g')
      // console.log(re, rep, obj[rep])
      tmpl = tmpl.replace(re, '')
    }
  })
  return tmpl
  // tempDiv = document.createElement('div')
  // tempDiv.innerHTML = tmpl
  // var isevt = / k-/.test(tmpl)
  // if (isevt) { processEvent.call(this, tempDiv) }
  // return tempDiv.childNodes[0]
}


var tmpl = `
    <li k-dblclick="editMode({{id}})" class="{{#if checked}}{{completed}}{{/if}}" data-id="{{id}}" style="display:{{display}}">
      <div class="view"><input k-click="completeTodo()" class="toggle" type="checkbox"{{#if checked}}{{checkedStr}}{{/if}}>
        <label>{{title}}</label>
        <button k-click="destroy()" class="destroy"></button>
      </div>
      <input class="edit" value="{{title}}">
    </li>`.trim()

var tmpl2 = `
    <li k-dblclick="editMode({{id}})" class="{{completed}}" data-id="{{id}}" style="display:{{display}}">
      <div class="view"><input k-click="completeTodo()" class="toggle" type="checkbox" checked="{{checked}}">
        <label>{{title}}</label>
        <button k-click="destroy()" class="destroy"></button>
      </div>
      <input class="edit" value="{{title}}">
    </li>`.trim()

let obj = {
  id: 1234,
  title: 'hello world',
  completed: 'completed',
  display: 'block',
  checked: false,
  checkedStr: ' checked'
}

console.time('hdl')
var b = Handlebars.compile(tmpl)(obj);
// console.log(b)
console.timeEnd('hdl')

console.time('hdl2')
var c = genTemplate(tmpl2,obj)
// console.log(c)
console.timeEnd('hdl2')