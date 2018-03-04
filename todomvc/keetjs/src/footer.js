const Keet = require('keet')
const { filtersInit } =require('./filters')

class Footer extends Keet {
  constructor () {
    super()
    this.count = 0
    this.s = ''
    this.clearCompletedDisplay = 'none'

    this.onChanges = []
    this.subscribe(todos => {
      let actives = todos.filter(f => f.completed !== 'completed')
      this.updateCount(actives.length)
      this.toggleClearComplete(actives.length !== todos.length ? true : false)
      filtersInit()
    })
  }
  toggleClearComplete (display) {
    this.clearCompletedDisplay = display || 'none'
  }
  updateCount (count) {
    this.count = count//.toString()
    this.s = count === 1 ? '' : 's'
  }
  clearCompletedClicked (evt) {
    app.clearCompleted.bind(app)
  }
  subscribe(fn) {
    this.onChanges.push(fn)
  }
}

const footer = new Footer()

const vmodel = {
  todoCount: {
    tag: 'span',
    id: 'todo-count',
    template: `<strong>{{count}}</strong> item{{s}} left`
  },
  filters: {
    tag: 'ul',
    id: 'filters'
  },
  clearCompleted: {
    tag: 'button',
    id: 'clear-completed',
    style: {
      display: '{{clearCompletedDisplay}}'
    },
    'k-click': 'clearCompletedClicked()',
    template: 'Clear completed'
  }
}

const footerInit = () => footer.mount(vmodel).link('footer')//.cluster(filtersInit)

module.exports = {
  footerInit,
  footer
}
