import Keet from 'keet'
import app from '../../'
import filtersInit from './filters'

class Footer extends Keet {
  constructor () {
    super()
    this.count = ' '
    this.s = ' '
    this.clearCompletedDisplay = 'none'
  }
  toggleClearComplete (display) {
    this.clearCompletedDisplay = display || 'none'
  }
  updateCount (count) {
    this.count = count.toString()
    this.s = count === 1 ? '' : 's'
  }
  clearCompletedClicked (evt) {
    app.clearCompleted.bind(app)
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

const footerInit = () => footer.mount(vmodel).link('footer').cluster(filtersInit)

export {
  footerInit as default,
  footer
}
