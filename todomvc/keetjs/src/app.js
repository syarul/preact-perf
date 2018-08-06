const Keet = require('../keet')
const { html } = require ('../keet/utils')
const { camelCase , genId } = require('./util')
const createTodoModel = require('./todoModel')
const filterPage = ['all', 'active', 'completed']
// const filtersTmpl = require('./filters')(filterPage)
const filterApp = require('./filter')
const todos = require('./todo')

let c = 0

// let start

// let time

class App extends Keet {
  todoModel = todos
  filter = filterApp
  page = 'All'
  isChecked = false
  count = 0
  plural = ''
  clearToggle = false
  // todoState = true

  componentWillMount() {
    filterPage.map(f => this[`page${camelCase(f)}`] = '')

    this.todoState = this.todoModel.list.length ? true : false

    this.todoModel.subscribe(todos => {
      // let uncompleted = todos.filter(c => !c.completed)
      // let completed = todos.filter(c => c.completed)
      // this.clearToggle = completed.length ? true : false
      this.todoState = todos.length ? true : false
      // this.plural = uncompleted.length === 1 ? '' : 's'
      // this.count = uncompleted.length
    })
  }

  create (evt) {
    if(evt.keyCode !== 13) return
    // if(!start){
    //   start = true
    //   time = Date.now()
    // }
    let title = evt.target.value.trim()
    if(title){
      this.todoModel.add({ id: genId(), title, completed: false })
      evt.target.value = ''
    }
  }

  evtTodo(...args){
    let target = args[0]
    let id = args[args.length - 2]
    let evt = args[args.length - 1]

    if(target === 'toggle')  
      this.toggleTodo(id, evt)
    else if(target === 'destroy')  
      this.todoDestroy(id)
  }

  toggleTodo(id, evt) {
    this.todoModel.update( 'id', { id, completed: !!evt.target.checked })
  }

  todoDestroy(id) {
    this.todoModel.destroy('id', id)
  }

  completeAll(){
    console.log(this)
    this.isChecked = !this.isChecked
    // this.todoModel.updateAll(this.isChecked)
  }

  clearCompleted() {
    this.todoModel.clearCompleted()
  }
  editMode(){

  }
  // componentDidUpdate(){
  //   c++
  //   console.log(c/*, time, Date.now() - time*/)
  // }
}

// <ul id="filters">
// ${filtersTmpl}
// </ul>

const vmodel = html`
  <section id="todoapp">
    <header id="header">
      <h1>todos</h1>
      <input id="new-todo" k-keydown="create()" placeholder="What needs to be done?" autofocus>
    </header>
    {{?todoState}}
    <section id="main">
      <input id="toggle-all" type="checkbox" checked="{{isChecked?checked:''}}" k-click="completeAll()">
      <label for="toggle-all">Mark all as complete</label>
      <ul id="todo-list" k-click="evtTodo()" k-dblclick="editMode()">
        {{model:todoModel}}
          <li id="{{id}}" class="{{completed?completed:''}}">
            <div class="view">
              <input class="toggle" type="checkbox" checked="{{completed?checked:''}}">
              <label>{{title}}</label>
              <button class="destroy"></button>
            </div>
            <input class="edit" value="{{title}}">
          </li>
        {{/model:todoModel}}
      </ul>
    </section>
    <footer id="footer">
      <span id="todo-count">
        <strong>{{count}}</strong> item{{plural}} left
      </span>
      {{component:filter}}
      {{?clearToggle}}
      <button id="clear-completed" k-click="clearCompleted()">Clear completed</button>
      {{/clearToggle}}
    </footer>
    {{/todoState}}
  </section>
  <footer id="info">
    <p>Double-click to edit a todo</p>
    <p>Created by <a href="https://github.com/syarul">Shahrul Nizam Selamat</a></p>
    <p>Part of <a href="http://todomvc.com">TodoMVC</a></p>
  </footer>`

const app = new App()

app.mount(vmodel).link('todo')

// console.log(app)
