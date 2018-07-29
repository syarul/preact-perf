import { camelCase, html } from './util'
import createTodoModel from './todoModel'
import filterApp from './filter'
import * as Keet from '../keet'

// const Keet = require('keet')

const filterPage = ['all', 'active', 'completed']

class App extends Keet {
  todoModel = createTodoModel()
  filter = filterApp
  page = 'All'
  isChecked = false
  count = 0
  plural = ''
  clearToggle = false

  componentWillMount() {
    filterPage.map(f => this[`page${camelCase(f)}`] = '')

    this.todoState = this.todoModel.list.length ? true : false

    this.todoModel.subscribe( m => {
      let todos = m.list
      let uncompleted = todos.filter(c => !c.completed)
      let completed = todos.filter(c => c.completed)
      this.clearToggle = completed.length ? true : false
      this.todoState = todos.length ? true : false
      this.plural = uncompleted.length === 1 ? '' : 's'
      this.count = uncompleted.length
    })
  }
  componentDidMount(){
    if (window.location.hash == '') {
      this.updateUrl('#/all')
      window.history.pushState({}, null, '#/all')
    }
    window.onpopstate = () => this.updateUrl(window.location.hash)
  }

  updateUrl(hash) {
    filterPage.map(f => {
      this[`page${camelCase(f)}`] = hash.split('#/')[1] === f ? 'selected' : ''
      if(hash.split('#/')[1] === f) this.page = f.name
    })
  }

  create (evt) {
    if(evt.keyCode !== 13) return
    let val = evt.target.value.trim()
    if(val){
      this.todoModel.addTodo(val)
      evt.target.value = ''
    }
  }

  toggleTodo(id, evt) {
    this.todoModel.toggle({ 
      id: id,
      completed: !!evt.target.checked
    })
  }

  todoDestroy(id) {
    this.todoModel.destroy(id)
  }

  completeAll(){
    this.isChecked = !this.isChecked
    this.todoModel.updateAll(this.isChecked)
  }

  clearCompleted() {
    this.todoModel.clearCompleted()
  }
}

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
