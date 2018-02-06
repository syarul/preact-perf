const Keet = require('keet')
const { main, mainInit } = require('./main')
const { footer, footerInit } = require('./footer')
const { filters } = require('./filters')

class Container extends Keet {
  constructor(){
    super()
    this.onChanges = []
    this.gen = false
    this.subscribe(todos => {
      if(todos.length && !this.gen){
        this.gen = true
        this.mountChild('main', { tag: 'section', id: 'main'}, main)
        this.mountChild('footer', { tag: 'footer', id: 'footer'}, footer)
      } 
      else if(!todos.length && this.gen){
        this.gen = false
        this.removeTodoContainer()
      }
    })
  }
  create (evt) {
    if(evt.keyCode !== 13) return
    todoList.addTodo.call(todoList, evt.target.value.trim())
    evt.target.value = ''
  }
  mountChild(child, prop, component){
    this.baseProxy[child] = prop
    component.render()
    filters.render()
  }
  removeTodoContainer(){
    delete this.baseProxy.main
    delete this.baseProxy.footer
  }
  subscribe(fn) {
    this.onChanges.push(fn)
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
  }
}

exports.containerInit = () => container.mount(vmodel).link('todoapp').cluster(mainInit, footerInit)

exports.container = container