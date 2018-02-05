import Keet from 'keet'
import app from '../../'

import todoListInit from './todoList'

class Main extends Keet {
  constructor (...args) {
    super()
    this.args = args
    this.display = 'none'
    this.isCheck = false
  }
  toggleDisplay (display) {
    this.display = display ? 'block' : 'none'
  }
  toggleCheck (check) {
    this.isCheck = check || false
  }
  completeAll (evt) {
    app.checkedAll(evt)
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

const mainInit = () => main.mount(vmodel).link('main').cluster(todoListInit)

export {
  mainInit as default,
  main
}
