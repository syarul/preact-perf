const Keet = require('keet')
const { camelCase } = require('./util')
// const { containerInit, container } = require('./container')
const { inform, getId } = require('./util')

// const { footer } = require('./footer')
// const { filters } = require('./filters')

const log = console.log.bind(console)

const filterPage = ['all', 'active', 'completed']

class App extends Keet {
  constructor() {
    super()

    this.onChanges = []
    this.ignoreNodes = ['todo-list']
    this.page = 'All'
    this.isChecked = ''
    this.count = 0
    this.plural = ''
    this.clearToggle = 'none'

    filterPage.map(f => this[`c_${f}`] = '')

    let gen = false

    this.subscribe(todos => {
      if(todos.length){
        if(!gen) {
          gen = true
          this.base.todoapp.template = tmpl(gen)
          // log(this.base)
          this.flush().render()
        }
      } 
      else if(!todos.length){
        if(gen){
          gen = false
          this.base.todoapp.template = tmpl(gen)
          this.flush().render()
        }
      }
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
  completeAll(){

  }
  clearCompleted(){

  }
  subscribe(stack) {
    this.onChanges.push(stack)
  }
}

const app = new App

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

const tmpl = todoLength => {
  let static = `
    <header id="header">
      <h1>todos</h1>
      <input id="new-todo" k-keydown="create()" placeholder="What needs to be done?" autofocus>
    </header>
  `
  let main = `
    <section id="main">
      <input id="toggle-all" type="checkbox" {{isChecked}} k-click="completeAll()">
      <label for="toggle-all">Mark all as complete</label>
      <!-- todo list component dom entry-->
      <ul id="todo-list"></ul>
    </section>
  `
  let footer = `
    <footer id="footer">
      <span id="todo-count">
        <strong>{{count}}</strong> item{{plural}} left
      </span>
      <ul id="filters">
        ${filtersTmpl}
      </ul>
      <button id="clear-completed" style="display: {{clearToggle}}" k-clicked="clearCompleted()">Clear completed</button>
    </footer>
  `
  return todoLength ?  static.concat(main, footer) : static
}

const todo = {
  todoapp: {
    tag: 'section',
    id: 'todoapp',
    template: tmpl(false)
  },
  info: {
    tag: 'footer',
    id: 'info',
    template: `
      <p>Double-click to edit a todo</p>
      <p>Created by <a href="https://github.com/syarul">Shahrul Nizam Selamat</a></p>
      <p>Part of <a href="http://todomvc.com">TodoMVC</a></p>`
  }
}

app.mount(todo).link('todo')//.cluster(containerInit)

// app.routeUpdate()

module.exports = app

setTimeout(() => {
  inform(app, [1])
  // inform(container, [1])
  // inform(footer, [{completed: 'completed'}, {completed: ''}])
  app.updateUrl(window.location.hash)
}, 2000)

setTimeout(() => {
  // inform(container, [])
  // inform(footer, [{completed: 'completed'}, {completed: ''}])
  // app.routeUpdate()
}, 4000)