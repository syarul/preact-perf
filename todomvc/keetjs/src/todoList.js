const Keet = require('keet')
const { store } = require('./util')

const log = console.log.bind(console)

class TodoList extends Keet {
  constructor() {
    super()
    this.args = [].slice.call(arguments)
  }
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

}

const todoList = new TodoList('checked')

const vmodel = {
  template: `
	<li k-dblclick="editMode({{id}})" class="{{completed}}" data-id="{{id}}" style="display: {{display}}">
		<div class="view"><input k-click="completeTodo({{keet-id}})" class="toggle" type="checkbox" checked="{{checked}}">
			<label>{{title}}</label>
			<button k-click="todoDestroy({{keet-id}})" class="destroy"></button>
		</div>
		<input class="edit" value="{{title}}">
	</li>`,
  model: store('todos-keetjs')
}

const todoListInit = () => todoList.mount(vmodel).link('todo-list')

module.exports = {
  todoListInit,
  todoList
}