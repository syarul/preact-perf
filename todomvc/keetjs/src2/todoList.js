import Keet from '../keet'
import { html } from '../keet/utils'
import { camelCase , genId } from './util'
import filterApp from './filter'
import todos from './todo'

class App extends Keet {
  el = 'todo-list'
  todoModel = todos
  componentWillMount() {
    this.todoModel.subscribe(todos => {
      this.callBatchPoolUpdate()
    })
  }

  addTodo (title) {
    this.todoModel.add({ id: genId(), title, completed: false })
  }

  toggleTodo(id, evt) {
    this.todoModel.update( 'id', { id, completed: !!evt.target.checked })
  }

  todoDestroy(id) {
    this.todoModel.destroy('id', id)
  }
}

const app = new App()

app.mount(html`
  <ul id="todo-list">
    {{model:todoModel}}
    <li id="{{id}}" k-dblclick="editMode({{id}})" class="{{completed?completed:''}}">
      <div class="view"><input k-click="toggleTodo({{id}})" class="toggle" type="checkbox" {{completed?checked:''}}>
        <label>{{title}}</label>
        <button k-click="todoDestroy({{id}})" class="destroy"></button>
      </div>
      <input class="edit" value="{{title}}">
    </li>
    {{/model:todoModel}}
  </ul>
`)

export default app
