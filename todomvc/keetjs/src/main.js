const Keet = require('keet')
const { todoListInit } = require('./todoList')

const log = console.log.bind(console)

class Main extends Keet {
  constructor (...args) {
    super()
    this.args = args
    this.display = 'none'
    this.isCheck = false

    this.onChanges = []
    this.subscribe(todos =>
      this.toggleDisplay(todos.length ? 'block' : 'none')
    )
  }
  toggleDisplay (display) {
    this.display = display
  }
  toggleCheck (check) {
    this.isCheck = check || false
  }
  completeAll (evt) {
    app.checkedAll(evt)
  }
  subscribe(fn) {
    this.onChanges.push(fn)
  }
}

const main = new Main('checked')

const vmodel = {
  toggleAll: {
    tag: 'input',
    id: 'toggle-all',
    type: 'checkbox',
    checked: '{{isCheck}}',
    style: {
      display: '{{display}}'
    },
    'k-click': 'completeAll()'

  },
  toggleLabel: `<label for="toggle-all">Mark all as complete</label>`,
  todoList: {
    tag: 'ul',
    id: 'todo-list'
  }
}

log(todoListInit)

const mainInit = () => main.mount(vmodel).link('main').cluster(todoListInit)

module.exports = {
  mainInit,
  main
}