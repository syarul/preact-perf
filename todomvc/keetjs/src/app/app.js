import Keet from '../../keet'
import { html } from '../../keet/utils'
import { genId } from './util'
import filterApp  from './filter'
import todoApp from './todo'

class App extends Keet {
  todoApp = todoApp
  filter = filterApp
  isChecked = false
  count = 0
  plural = ''
  clearToggle = false
  todoState = false

  componentWillMount() {
    todoApp.subscribe(todos => {
      let uncompleted = todos.filter(c => !c.completed)
      let completed = todos.filter(c => c.completed)
      this.clearToggle = completed.length ? true : false
      this.todoState = todos.length ? true : false
      this.plural = uncompleted.length === 1 ? '' : 's'
      this.count = uncompleted.length
    })
  }

  create (e) {
    if(e.keyCode !== 13) return
    let title = e.target.value.trim()
    if(title){
      this.todoApp.addTodo({ title, completed: false })
      e.target.value = ''
    }
  }

  completeAll(){
    this.isChecked = !this.isChecked
    l(this)
    // this.todoApp.updateAll(this.isChecked)
  }

  clearCompleted(e) {
    this.todoApp.todoModel.clearCompleted()
  }
  editMode(){

  }
}

const vmodel = html`
  <section class="todoapp">
    <header id="header">
      <h1>todos</h1>
      <input id="new-todo" class="new-todo" k-keydown="create()" placeholder="What needs to be done?" autofocus>
    </header>
    <!-- {{?todoState}} -->
    <section class="main">
      <input id="toggle-all" class="toggle-all" type="checkbox" checked="{{isChecked?checked:''}}" k-click="completeAll()">
      <label for="toggle-all">Mark all as complete</label>
      <!-- {{component:todoApp}} -->
    </section>
    <footer class="footer">
      <span class="todo-count">
        <strong>{{count}}</strong> item{{plural}} left
      </span>
      <!-- {{component:filter}} -->
      <!-- {{?clearToggle}} -->
      <button id="clear-completed" k-click="clearCompleted()" class="clear-completed">Clear completed</button>
      <!-- {{/clearToggle}} -->
    </footer>
    <!-- {{/todoState}} -->
  </section>
  <footer class="info">
    <p>Double-click to edit a todo</p>
    <p>Created by <a href="https://github.com/syarul">Shahrul Nizam Selamat</a></p>
    <p>Part of <a href="http://todomvc.com">TodoMVC</a></p>
  </footer>`

const app = new App()

app.mount(vmodel).link('todo')

// console.log(app)