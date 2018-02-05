import Keet from 'keet'
import { uuid } from 'utils'

import main from 'components/main'
import footer from 'components/footer'
import { todoList } from 'components/todoList'

class Container extends Keet {
  constructor () {
    super()
    this.mainDisplay = 'none'
    this.footerDisplay = 'none'
  }
  toggleMain (show) {
    this.mainDisplay = show ? 'block' : 'none'
  }
  toggleFooter (show) {
    this.footerDisplay = show ? 'block' : 'none'
  }
  create (evt) {
    if(evt.keyCode !== 13) return
    todoList.addTodo.call(todoList, evt.target.value.trim())
    evt.target.value = ''
  }
}

const container = new Container()

const vmodel = {
  header: {
    tag: 'header',
    id: 'header',
    template: `
      <h1>todos</h1>
      <input id="new-todo" k-keydown="create()" placeholder="What needs to be done?" autofocus>`
  },
  main: {
    tag: 'section',
    id: 'main',
    style: {
      display: '{{mainDisplay}}'
    }
  },
  footer: {
    tag: 'footer',
    id: 'footer',
    style: {
      display: '{{footerDisplay}}'
    }
  }
}

const containerInit = () => container.mount(vmodel).link('todoapp').cluster(main, footer)

module.exports = {
  containerInit,
  container
}
