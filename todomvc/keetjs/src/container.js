const Keet = require('keet')
const { main, mainInit } = require('./main')
const { footer, footerInit } = require('./footer')
const { filters } = require('./filters')
const { todoList } = require('./todoList')

const log = console.log.bind(console)

class Container extends Keet {
  constructor(){
    super()
    this.onChanges = []
    this.gen = false
    this.subscribe(todos => {
      if(todos.length && !this.gen){
        this.gen = true
        this.mountChild('main', { tag: 'section', id: 'main'})
        this.mountChild('footer', { tag: 'footer', id: 'footer'})
        this.render()
        this.subRender()
      } 
      else if(!todos.length && this.gen){
        this.gen = false
        this.removeTodoContainer()
      }
    })
  }
  create (evt) {
    if(evt.keyCode !== 13) return
    let obj = {
      title: evt.target.value.trim(),
      completed: '',
      display: window.location.hash == '#/all' || window.location.hash == '#/active' ? 'block' : 'none',
      checked: false
    }
    log(todoList)
    todoList.add(obj)
    evt.target.value = ''
  }
  mountChild(child, prop, component){
    this.baseProxy[child] = prop
  }
  subRender() {
    main.render()
    footer.render()
  }
  removeTodoContainer(){
    delete this.baseProxy.main
    delete this.baseProxy.footer
    this.render()
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