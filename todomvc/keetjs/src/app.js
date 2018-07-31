const Keet = require('../keet')
const { html } = require ('../keet/utils')
const { camelCase , genId } = require('./util')
const createTodoModel = require('./todoModel')
const filterPage = ['all', 'active', 'completed']
// const filtersTmpl = require('./filters')(filterPage)
const filterApp = require('./filter')
const todos = require('./todo')

class App extends Keet {
  todoModel = todos
  filter = filterApp
  page = 'All'
  isChecked = false
  count = 0
  plural = ''
  clearToggle = false
  todoState = true

  componentWillMount() {
    filterPage.map(f => this[`page${camelCase(f)}`] = '')

    // this.todoState = this.todoModel.list.length ? true : false

    this.todoModel.subscribe(todos => {
      let uncompleted = todos.filter(c => !c.completed)
      let completed = todos.filter(c => c.completed)
      this.clearToggle = completed.length ? true : false
      this.todoState = todos.length ? true : false
      this.plural = uncompleted.length === 1 ? '' : 's'
      this.count = uncompleted.length
    })
  }

  create (evt) {
    if(evt.keyCode !== 13) return
    let title = evt.target.value.trim()
    if(title){
      this.todoModel.add({ id: genId(), title, completed: false })
      evt.target.value = ''
    }
  }

  toggleTodo(id, evt) {
    this.todoModel.update( 'id', { id, completed: !!evt.target.checked })
  }

  todoDestroy(id) {
    this.todoModel.destroy('id', id)
  }

  completeAll(){
    this.isChecked = !this.isChecked
    this.todoModel.updateAll(this.isChecked)
  }

  clearCompleted() {
    this.todoModel.clearCompleted()
  }
}

// <ul id="filters">
// ${filtersTmpl}
// </ul>

const vmodel = html`
  <section id="todoapp">
    <header id="header">
      <h1>todos</h1>
      <input id="new-todo" k-keydown="create()" placeholder="What needs to be done?" autofocus>
    </header>
    {{?todoState}}
    <section id="main">
      <input id="toggle-all" type="checkbox" {{isChecked?checked:''}} k-click="completeAll()">
      <label for="toggle-all">Mark all as complete</label>
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
    </section>
    <footer id="footer">
      <span id="todo-count">
        <strong>{{count}}</strong> item{{plural}} left
      </span>
      {{component:filter}}
      {{?clearToggle}}
      <button id="clear-completed" k-click="clearCompleted()">Clear completed</button>
      {{/clearToggle}}
    </footer>
    {{/todoState}}
  </section>
  <footer id="info">
    <p>Double-click to edit a todo</p>
    <p>Created by <a href="https://github.com/syarul">Shahrul Nizam Selamat</a></p>
    <p>Part of <a href="http://todomvc.com">TodoMVC</a></p>
  </footer>`

const app = new App()

app.mount(vmodel).link('todo')

console.log(app)
