import Keet from 'keet'

import { containerInit, container } from 'components/container'
import { main } from 'components/main'
import { todoList } from 'components/todoList'
import { footer } from 'components/footer'
import { filters } from 'components/filters'

import createTodoModel from './model'

import { store as todoStore, uuid } from 'utils'

let log = console.log.bind(console)

class App extends Keet {
  constructor(){
    super()
    this.updating = false
  }
  componentWillMount() {
    todoList.subscribe(todos => {
      this.intelliUpdate(todos)
    })
  }
  intelliUpdate(todos, store){
    // only update when necessary
    if(this.updating) clearTimeout(this.updating)
    this.updating = setTimeout(() => this.getActive(todos, store), 10)
  }
  getActive(todos, store) {
    if(container.mainDisplay == 'none' && todos.length){
      main.toggleDisplay(todos.length)
      container.toggleMain(todos.length)
      container.toggleFooter(todos.length)
    } else if(container.mainDisplay == 'block' && !todos.length){
      main.toggleDisplay(todos.length)
      container.toggleMain(todos.length)
      container.toggleFooter(todos.length)
    }

    const actives = todos.filter(f => f.completed !== 'completed')

    footer.updateCount(actives.length)
    // only store if requested
    if(store) todoStore('todos-keetjs', todos)
  }
  updateFilter(hash) {
    filters.list.map((f, i, r) => {
      let c = {}
      c.className = f.hash === hash ? 'selected' : ''
      if (f.className === 'selected') this.page = f.nodeValue
      r[i] = Object.assign(f, c)
    })
    // this.updatePage();
  }
  todoCheck(id) {
    todoList.list.filter((todo, idx, todos) => {
      if(todo.id === id){
        let chg = {}
        chg.completed = todo.completed === '' ? 'completed' : ''
        todos[idx] = Object.assign(todo, chg)
      }
    })

    this.intelliUpdate('store')
    // this.focus()
  }
  destroy(id, node) {
    var self = this
    // todoList.list = todoList.list.filter(function(todo, index){
    //   if(id == todo.id)
    //     node.remove()
    //   else
    //     return todo
    // })
    // this.intelliUpdate('store')
    // util.store('todos-keetjs', this.todos);
    // this.getActive();
    // this.updateCheckAll();
    // this.focus();
  }
  updatePage() {
    var self = this;
    this.todos.map(function (f, i, r) {
      if (self.page === 'Active' && f.completed === 'completed') f.display = 'none';
      else if (self.page === 'Completed' && f.completed !== 'completed') f.display = 'none';
      else f.display = 'block';
      r.update(i, f);
    });
    util.store('todos-keetjs', this.todos);
    this.updateCheckAll();
    this.focus();
  }
  renderFooter() {
    var self = this;
    if (window.location.hash !== '') {
      this.updateFilter(window.location.hash)
    } else {
      this.updateFilter('#/all')
      window.history.pushState({}, null, '#/all')
    }

    window.onpopstate = function () {
      self.updateFilter(window.location.hash)
    }
  }
  checkedAll(/*todoList, state, initial*/) {
    todoList.list.map((f, i) => {
      log(f)

      // log(todoList)
      // if (!initial && state && f.completed !== 'completed') todoList.evented(i, 'class', 'toggle', { click: true });
      // else if (!initial && !state && f.completed === 'completed') todoList.evented(i, 'class', 'toggle', { click: true });
      // else if (initial && f.completed === 'completed') todoList.evented(i, 'class', 'toggle', { checked: true });
    });
    // this.focus()
  }
  focus() {
    document.getElementById('new-todo').focus()
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

setTimeout(() => {
  app.getActive(todoList.base.list)
  app.renderFooter()
}, 0)

// log(app)

export default app




