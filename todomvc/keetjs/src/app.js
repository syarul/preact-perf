const Keet = require('../keet')
const { camelCase } = require('./util')
const { inform, getId } = require('./util')

// const createTodoModel = require('./todoModel')

const { createTodoModel, todoApp } = require('./todo')

const log = console.log.bind(console)

const filterPage = ['all', 'active', 'completed']

class App extends Keet {

  model = createTodoModel(this)

  page = 'All'

  isChecked = ''

  count = 0

  plural = ''

  clearToggle = 'none'

  componentWillMount() {

    filterPage.map(f => this[`c_${f}`] = '')
    log(this.model)
    // this.model.subscribe( store => {
    //   let m = store.todos
    //   let c = m.filter(c => !c.completed)
    //   this.todoState = m.length ? true : false
    //   this.plural = c.length === 1 ? '' : 's'
    //   this.count = c.length
    // })
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

    // let obj = {
    //   title: evt.target.value.trim(),
    //   completed: '',
    //   display: window.location.hash == '#/all' || window.location.hash == '#/active' ? 'block' : 'none',
    //   checked: false
    // }
    this.model.addTodo(evt.target.value.trim())
    evt.target.value = ''
  }

  completeAll(){

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
  filtersTmpl += `<li k-click="updateUrl(${f.hash})"><a class="${f.className}" href="${f.hash}">${f.name}</a></li>`
}

filterPage.map(page => filters(page))

const vmodel = `
  <section id="todoapp">
    <header id="header">
      <h1>todos</h1>
      <input id="new-todo" k-keydown="create()" placeholder="What needs to be done?" autofocus>
    </header>
    {{?todoState}}
    <section id="main">
      <input id="toggle-all" type="checkbox" {{isChecked}} k-click="completeAll()">
      <label for="toggle-all">Mark all as complete</label>
      <ul id="todo-list"></ul>
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

app.mount(vmodel).register(todoApp).link('todo')//.cluster(todoInit)

// console.log(app)

module.exports = app