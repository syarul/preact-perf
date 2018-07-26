const Keet = require('../keet')
const { store, html } = require('./util')

const log = console.log.bind(console)

let onChanges = []

function inform () {
  for (let i = onChanges.length; i--;) {
    onChanges[i](this.base.model)
  }
}

class TodoApp extends Keet {

  el = 'todo-list'

  addTodo (title) {
    let m = {
      title,
      completed: false
    }
    this.add(m, inform)
  }

  updateAll(checked) {
    this.base.model.map(model => {
      this.update(model['keet-id'], 'keet-id', { completed: checked })
    })
    inform.call(this)
  }

  clearCompleted(){
    console.log('clearCompleted')
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

  subscribe (fn) {
    onChanges.push(fn)
  }
}

const todoApp = new TodoApp()

const vmodel = {
  template: html`
	<li k-dblclick="editMode({{keet-id}})" class="{{completed?completed:''}}">
		<div class="view"><input k-click="toggleTodo({{keet-id}})" class="toggle" type="checkbox" {{completed?checked:''}}>
			<label>{{title}}</label>
			<button k-click="todoDestroy({{keet-id}})" class="destroy"></button>
		</div>
		<input class="edit" value="{{title}}">
	</li>`,
  model: store('todos-keetjs')
}

todoApp.mount(vmodel)

module.exports = todoApp