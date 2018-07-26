const Keet = require('../keet')
const { camelCase, html } = require('./util')
const todoApp = require('./todo')
const filterPage = ['all', 'active', 'completed']
const filtersTmpl = require('./filters')(filterPage)

class App extends Keet {

  page = 'All'
  isChecked = false
  count = 0
  plural = ''
  clearToggle = false

  componentWillMount() {
    filterPage.map(f => this[`page${camelCase(f)}`] = '')
    todoApp.subscribe( store => {
      let filterUncomplete = store.filter(c => !c.completed)
      let filterCompleted = store.filter(c => c.completed)
      this.clearToggle = filterCompleted.length ? true : false
      this.todoState = store.length ? true : false
      this.plural = filterUncomplete.length === 1 ? '' : 's'
      this.count = filterUncomplete.length
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
    todoApp.addTodo(evt.target.value.trim())
    evt.target.value = ''
  }

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
      <ul id="todo-list" data-ignore></ul>
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
