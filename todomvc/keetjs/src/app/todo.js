import Keet, { html } from '../../keet'
import todoModel from './todo-model'

class App extends Keet {
  el = 'todo-list'
  todoModel = todoModel
  constructor () {
    super()
    this.todoModel.subscribe((model, filterModel) =>
      this.inform(model)
    )
  }
  addTodo (newTodo) {
    this.todoModel.add(newTodo)
  }
  evtTodo (obj, target) {
    if (target.className === 'toggle') { 
      this.todoModel.update({ ...obj, completed: !obj.completed }) 
    } else if (target.className === 'destroy') { 
      this.todoModel.destroy(obj) 
    }
  }
  filterTodo (page) {
    if (page === '#/all') {
      this.todoModel.filter(null)
    } else if (page === '#/active') {
      this.todoModel.filter('completed', false)
    } else if (page === '#/completed') {
      this.todoModel.filter('completed', true)
    }
  }
  editMode () {
  }
}

const todoList = new App()

todoList.mount(html`
  <ul id="todo-list" class="todo-list" k-click="evtTodo()">
    <!-- {{model:todoModel}} -->
      <li class="{{completed?completed:''}}">
        <div class="view">
          <input class="toggle" type="checkbox" checked="{{completed?checked:''}}">
          <label>{{title}}</label>
          <button class="destroy"></button>
        </div>
        <input class="edit" value="{{title}}">
      </li>
    <!-- {{/model:todoModel}} -->
  </ul>`)

export default todoList
