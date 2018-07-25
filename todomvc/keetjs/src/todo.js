const Keet = require('../keet')
const { store, inform, genId, html } = require('./util')

const log = console.log.bind(console)

class TodoApp extends Keet {
  
  args = [].slice.call(arguments)
  
  el = 'todo-list'

  onChanges = []

  editMode(id) {
    // App.editTodos(id, this)
  }
  todoDestroy(id, evt) {
    // this.destroy(id, 'keet-id', evt.target.parentNode.parentNode)
    // App.todoDestroy()
  }
  completeTodo(id, evt) {
    // App.todoCheck(id, 'keet-id', evt.target.parentNode.parentNode)
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
}

const todoApp = new TodoApp('checked')

const vmodel = {
  template: html`
	<li k-dblclick="editMode({{keet-id}})" class="{{completed}}">
		<div class="view"><input k-click="completeTodo({{keet-id}})" class="toggle" type="checkbox" checked="{{checked}}">
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