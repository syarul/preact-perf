const Keet = require('../keet')
const { camelCase, html } = require('./util')
const todo = require('./todo')
const createTodoModel = require('./todoModel')
const filterPage = ['all', 'active', 'completed']
const filtersTmpl = require('./filters')(filterPage)

class App extends Keet {
  todoModel = createTodoModel()
  page = 'All'
  isChecked = false
  count = 0
  plural = ''
  clearToggle = false

  componentWillMount() {
    filterPage.map(f => this[`page${camelCase(f)}`] = '')

    this.todoState = this.todoModel.list.length ? true : false

    this.todoModel.subscribe( todos => {
      let uncompleted = todos.filter(c => !c.completed)
      let completed = todos.filter(c => c.completed)
      // this.clearToggle = filterCompleted.length ? true : false
      this.todoState = todos.length ? true : false
      // this.plural = filterUncomplete.length === 1 ? '' : 's'
      // this.count = filterUncomplete.length
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
    // todoApp.addTodo(evt.target.value.trim())
    this.todoModel.addTodo(evt.target.value.trim())
    evt.target.value = ''
  }

  toggleTodo(id, evt) {
    this.todoModel.toggle({ 
      id: id,
      completed: !!evt.target.checked
    })
  }

  // todoDestroy(id) {
  //   console.log(id)
  //   this.todoModel.destroy(id)
  // }

  completeAll(){
    this.isChecked = !this.isChecked
    todoApp.updateAll(this.isChecked)
  }

  clearCompleted() {
    todoApp.clearCompleted()
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
          <li keet-id="{{id}}" k-dblclick="editMode({{id}})" class="{{completed?completed:''}}">
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
      <ul id="filters">
        ${filtersTmpl}
      </ul>
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

// console.log(app)
