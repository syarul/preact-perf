const Keet = require('keet')
const { containerInit, container } = require('./container')
const { inform, getId } = require('./util')

const { footer } = require('./footer')
const { filters } = require('./filters')

const log = console.log.bind(console)

class App extends Keet {
  constructor() {
    super()
    this.page = 'All'
  }
  routeUpdate() {
    if (window.location.hash !== '') {
      this.updateFilter(window.location.hash)
    } else {
      this.updateFilter('#/all')
      window.history.pushState({}, null, '#/all')
    }

    window.onpopstate = () => this.updateFilter(window.location.hash)
  }
  updateFilter(hash) {
  	let el = getId(filters.el)
  	if(!el) return
    filters.base.model.map(f => {
      let c = {}
      c.className = f.hash === hash ? 'selected' : ''
      if (f.className === 'selected') this.page = f.nodeValue
      filters.update(f.hash, 'hash', c)
    })
  }
}

const app = new App

const todo = {
  todoapp: {
    tag: 'section',
    id: 'todoapp'
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

app.mount(todo).link('todo').cluster(containerInit)

app.routeUpdate()

module.exports = app

setTimeout(() => {
  inform(container, [1])
  inform(footer, [{completed: 'completed'}, {completed: ''}])
  app.routeUpdate()
}, 2000)

setTimeout(() => {
  // inform(container, [])
  // inform(footer, [{completed: 'completed'}, {completed: ''}])
  // app.routeUpdate()
}, 4000)