const Keet = require('../keet')
const { store, inform } = require('./util')

const log = console.log.bind(console)

let main = null

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
  addTodo (title) {
    this.add({
      id: genId(),
      title,
      completed: false
    })
    inform(main, this.base.model)
  }
  subscribe(stack) {
    this.onChanges.push(stack)
  }
}

log(store('todos-keetjs'))

const todoApp = new TodoApp('checked')

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



module.exports = {
  createTodoModel: function(app) {
    console.log(2)
    main = app
    todoApp.mount(vmodel)
  },
  todoApp: todoApp
}