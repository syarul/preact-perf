import Keet from '../keet'
import { html } from '../keet/utils'
import { camelCase , genId } from './util'
import filterApp from './filter'
import todoListApp from './todoList'

class App extends Keet {
  filter = filterApp
  todoList = todoListApp
  page = 'All'
  isChecked = false
  count = 0
  plural = ''
  clearToggle = false
  todoState = true

  componentWillMount() {

    // this.todoState = this.todoModel.list.length ? true : false

    // this.todoModel.subscribe(todos => {
    //   let uncompleted = todos.filter(c => !c.completed)
    //   let completed = todos.filter(c => c.completed)
    //   this.clearToggle = completed.length ? true : false
    //   this.todoState = todos.length ? true : false
    //   this.plural = uncompleted.length === 1 ? '' : 's'
    //   this.count = uncompleted.length
    // })
  }

  create (evt) {
    if(evt.keyCode !== 13) return
    let title = evt.target.value.trim()
    if(title){
      this.todoList.addTodo(title)
      evt.target.value = ''
    }
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
      {{component:todoList}}
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
