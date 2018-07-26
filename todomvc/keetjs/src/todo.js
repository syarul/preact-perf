const Keet = require('../keet')
const { store, genId, html, intelliUpdate } = require('./util')

const log = console.log.bind(console)

// log(intelliUpdate)

// intelliUpdate(function(){
//   console.log(1)
// })

let onChanges = []

// let flag = false

function inform () {
  for (let i = onChanges.length; i--;) {
    // if(flag) 
    onChanges[i](this.base.model)
  }
}

class TodoApp extends Keet {
  
  args = [].slice.call(arguments)
  
  el = 'todo-list'

  addTodo (title) {
    let m = {
      title,
      completed: false
    }
    this.add(m, inform)
  }

  editMode(id) {
    // App.editTodos(id, this)
  }
  todoDestroy(id, evt) {
    // this.destroy(id, 'keet-id', evt.target.parentNode.parentNode)
    // App.todoDestroy()
  }
  toggleTodo(id, evt) {
    this.update(id, 'keet-id', { completed: evt.target.checked ? true : false }, inform)
  }
  // addTodo (title) {
  //   this.add({
  //     id: genId(),
  //     title,
  //     completed: false
  //   })
  //   inform(main, this.base.model)
  // }
  // subscribe(stack) {
  //   this.onChanges.push(stack)
  // }

  subscribe (fn) {
    onChanges.push(fn)
  }
}

const todoApp = new TodoApp('checked')

const vmodel = {
  template: html`
	<li k-dblclick="editMode({{keet-id}})" class="{{completed?completed:''}}">
		<div class="view"><input k-click="toggleTodo({{keet-id}})" class="toggle" type="checkbox" {{complete?checked:''}}>
			<label>{{title}}</label>
			<button k-click="todoDestroy({{keet-id}})" class="destroy"></button>
		</div>
		<input class="edit" value="{{title}}">
	</li>`,
  model: store('todos-keetjs')
}

todoApp.mount(vmodel)

module.exports = todoApp

// module.exports = function(app) {
//   main = app
//   todoApp.mount(vmodel)
//   return todoApp
// }