const Keet = require('../keet')
const { camelCase, html } = require('./util')
const createTodoModel = require('./todoModel')
const todoApp = require('./todo')
const filterPage = ['all', 'active', 'completed']

class App extends Keet {

  model = createTodoModel(todoApp)
  page = 'All'
  isChecked = ''
  count = 0
  plural = ''
  clearToggle = 'none'
  // todoState = true

  componentWillMount() {
    filterPage.map(f => this[`c_${f}`] = '')
    todoApp.subscribe( store => {
      let c = store.filter(c => !c.completed)
      this.todoState = store.length ? true : false
      this.plural = c.length === 1 ? '' : 's'
      this.count = c.length
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
      this[`c_${f}`] = hash.split('#/')[1] === f ? 'selected' : ''
      if(hash.split('#/')[1] === f) this.page = f.name
    })
  }

  create (evt) {
    if(evt.keyCode !== 13) return
    todoApp.addTodo(evt.target.value.trim())
    evt.target.value = ''
  }

  completeAll(){
    this.isChecked = this.isChecked === '' ? 'checked' : ''
    console.log(this.isChecked)
    // this.model.toggleAll(this.isChecked === '' ? '' : 'completed')
  }

  clearCompleted(){

  }
}

const app = new App()

let filtersTmpl = ''

const filters = page => {
  let f = {
    className: `{{c_${page}}}`,
    hash: '#/' + page,
    name: camelCase(page)
  }
  filtersTmpl += html`<li k-click="updateUrl(${f.hash})"><a class="${f.className}" href="${f.hash}">${f.name}</a></li>`
}

filterPage.map(page => filters(page))

const vmodel = html`
  <section id="todoapp">
    <header id="header">
      <h1>todos</h1>
      <input id="new-todo" k-keydown="create()" placeholder="What needs to be done?" autofocus>
    </header>
    {{?todoState}}
    <section id="main">
      <input id="toggle-all" type="checkbox" {{isChecked}} k-click="completeAll()">
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
      <button id="clear-completed" style="display: {{clearToggle}}" k-clicked="clearCompleted()">Clear completed</button>
    </footer>
    {{/todoState}}
  </section>
  <footer id="info">
    <p>Double-click to edit a todo</p>
    <p>Created by <a href="https://github.com/syarul">Shahrul Nizam Selamat</a></p>
    <p>Part of <a href="http://todomvc.com">TodoMVC</a></p>
  </footer>`

app.mount(vmodel).link('todo')
