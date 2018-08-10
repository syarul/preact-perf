import Keet from '../keet'
import { html } from '../keet/utils'
import { genId } from './util'
import filterApp  from './filter'
import todos from './todo'
let x 
class App extends Keet {
  todoModel = todos
  filter = filterApp
  page = 'All'
  isChecked = false
  count = 0
  plural = ''
  clearToggle = false
  todoState = true

  componentWillMount() {
    // this.todoModel.subscribe(todos => this.callBatchPoolUpdate())
    // this.todoState = this.todoModel.list.length ? true : false

    this.todoModel.subscribe(todos => {
      this.callBatchPoolUpdate()
      // let uncompleted = todos.filter(c => !c.completed)
      // let completed = todos.filter(c => c.completed)
      // this.clearToggle = completed.length ? true : false
      // this.todoState = todos.length ? true : false
      // this.plural = uncompleted.length === 1 ? '' : 's'
      // this.count = uncompleted.length
    })
  }

  create (evt) {
    if(evt.keyCode !== 13) return
    evt.preventDefault()
    let title = evt.target.value.trim()
    if(title){
      this.todoModel.add({ id: genId(), title, completed: false })
      evt.target.value = ''
    }
  }

  evtTodo(target){
    if(target.className === 'toggle')  
      this.toggleTodo(target.getAttribute('data-id'), !!target.checked)
    else if(target.className === 'destroy')  
      this.todoDestroy(target.getAttribute('data-id'))
  }

  toggleTodo(id, completed) {
    if(!x){
      x = true
      window.time = new Date()
    }
    this.todoModel.update( 'id', { id, completed })
  }

  todoDestroy(id) {
    this.todoModel.destroy('id', id)
  }

  completeAll(){
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

const vmodel = html`
  <section class="todoapp">
    <header id="header">
      <h1>todos</h1>
      <input class="new-todo" k-keydown="create()" placeholder="What needs to be done?" autofocus>
    </header>
    {{?todoState}}
    <section class="main">
      <input id="toggle-all" class="toggle-all" type="checkbox" checked="{{isChecked?checked:''}}" k-click="completeAll()">
      <label for="toggle-all">Mark all as complete</label>
      <ul id="todo-list" class="todo-list" k-click="evtTodo()" k-dblclick="editMode()">
        {{model:todoModel}}
          <li id="{{id}}" class="{{completed?completed:''}}">
            <div class="view">
              <input class="toggle" data-id="{{id}}" type="checkbox" checked="{{completed?checked:''}}">
              <label>{{title}}</label>
              <button class="destroy" data-id="{{id}}"></button>
            </div>
            <input class="edit" data-id="{{id}}" value="{{title}}">
          </li>
        {{/model:todoModel}}
      </ul>
    </section>
    <footer class="footer">
      <span class="todo-count">
        <strong>{{count}}</strong> item{{plural}} left
      </span>
      <!-- component:filter -->
      <!-- {{?clearToggle}} -->
      <button id="clear-completed" class="clear-completed">Clear completed</button>
      <!-- {{/clearToggle}} -->
    </footer>
    {{/todoState}}
  </section>
  <footer class="info">
    <p>Double-click to edit a todo</p>
    <p>Created by <a href="https://github.com/syarul">Shahrul Nizam Selamat</a></p>
    <p>Part of <a href="http://todomvc.com">TodoMVC</a></p>
  </footer>`

const app = new App()

app.mount(vmodel).link('todo')
