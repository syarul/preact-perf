import Keet from '../keet'
import { html } from '../keet/utils'
import { genId } from './util'
import filterApp  from './filter'
import todoApp, { subscribe } from './todo'

class App extends Keet {
  todoApp = todoApp
  filter = filterApp
  isChecked = false
  count = 0
  plural = ''
  clearToggle = false
  // todoState = true

  componentWillMount() {
    // this.todoModel.subscribe(todos => this.callBatchPoolUpdate())
    // this.todoState = this.todoApp.todoModel.list.length ? true : false
    // const self = this
    subscribe(todos => {
      // console.log(todos)
      let uncompleted = todos.filter(c => !c.completed)
      // let completed = todos.filter(c => c.completed)
      // this.clearToggle = completed.length ? true : false
      // this.todoState = todos.length ? true : false
      // this.plural = uncompleted.length === 1 ? '' : 's'
      this.count = uncompleted.length
      // console.log(this)
      // this.callBatchPoolUpdate()
    })
  }

  create (evt) {
    if(evt.keyCode !== 13) return
    evt.preventDefault()
    let title = evt.target.value.trim()
    if(title){
      this.todoApp.addTodo({ id: genId(), title, completed: false })
      evt.target.value = ''
    }
  }

  completeAll(){
    this.isChecked = !this.isChecked
    // this.todoApp.updateAll(this.isChecked)
  }

  clearCompleted() {
    this.todoApp.clearCompleted()
  }
  editMode(){

  }
  // componentDidUpdate(){
  //   c++
  //   console.log(c/*, time, Date.now() - time*/)
  // }
}

const vmodel = html`
  <section class="todoapp">
    <header id="header">
      <h1>todos</h1>
      <input class="new-todo" k-keydown="create()" placeholder="What needs to be done?" autofocus>
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
      <button id="clear-completed" class="clear-completed">Clear completed</button>
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
