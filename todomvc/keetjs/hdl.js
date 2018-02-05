var Handlebars = require('handlebars');

// var genTemplate = require('keet/components/genTemplate')

// var a = Handlebars.compile('{{ name }}<%= name %>')({name: 'Jon'});


function genTemplate(template, obj) {
  var arrProps = template.match(/{{([^{}]+)}}/g)
  var tmpl
  tmpl = template
  var args = ['checked']
  arrProps.map(function (s) {
    var rep = s.replace(/{{([^{}]+)}}/g, '$1')
    tmpl = tmpl.replace(/{{([^{}]+)}}/, obj[rep])
    if (args && ~args.indexOf(rep) && !obj[rep]) {
      var re = new RegExp(' ' + rep + '="' + obj[rep] + '"', 'g')
      tmpl = tmpl.replace(re, '')
    }
  })
  return tmpl
}

var tmpl2 = ''

function next(i, obj, arrProps, args){
  if (i < arrProps.length) {
    var rep = arrProps[i].replace(/{{([^{}]+)}}/g, '$1')
    tmpl2 = tmpl2.replace(/{{([^{}]+)}}/, obj[rep])
    if (args && ~args.indexOf(rep) && !obj[rep]) {
      var re = new RegExp(' ' + rep + '="' + obj[rep] + '"', 'g')
      tmpl2 = tmpl2.replace(re, '')
    }
    i++
    next(i, obj, arrProps, args)
  }
}

function genTemplateNomap(template, obj) {
  var arrProps = template.match(/{{([^{}]+)}}/g)
  tmpl2 = template
  var args = ['checked']
  next(0, obj, arrProps, args)
  return tmpl2
}


var tmpl = `
    <li k-dblclick="editMode({{id}})" class="{{#if checked}}{{completed}}{{/if}}" data-id="{{id}}" style="display:{{display}}">
      <div class="view"><input k-click="completeTodo()" class="toggle" type="checkbox"{{#if checked}}{{checkedStr}}{{/if}}>
        <label>{{title}}</label>
        <button k-click="destroy()" class="destroy"></button>
      </div>
      <input class="edit" value="{{title}}">
    </li>`.trim()

var tmpl1 = `
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
var c1 = genTemplate(tmpl1,obj)
// console.log(c1)
console.timeEnd('hdl2')

console.time('hdl3')
var c2 = genTemplateNomap(tmpl1, obj)
// console.log(c2)
console.timeEnd('hdl3')