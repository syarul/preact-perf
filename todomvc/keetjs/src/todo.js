import Keet from '../keet'
import { html } from '../keet/utils'
import todoModel from './todo-model'

class App extends Keet {
  el = 'todo-list'
  todoModel = todoModel
  componentWillMount() {
    this.todoModel.subscribe(model => {
      // console.log(model)
      // this.callBatchPoolUpdate()
     this.inform(model)
    })
  }
  addTodo(newTodo){
    this.todoModel.add(newTodo)
  }
  evtTodo(target){
    console.log('clicked!')
    if(target.className === 'toggle')  
      this.toggleTodo(target.getAttribute('data-id'), !!target.checked)
    else if(target.className === 'destroy')  
      this.todoDestroy(target.getAttribute('data-id'))
  }
  toggleTodo(id, completed) {
    this.todoModel.update( 'id', { id, completed })
  }
  todoDestroy(id) {
    this.todoModel.destroy('id', id)
  }
  editMode(){
    
  }
}

const todoApp = new App()

let vmodel = html`
  <ul id="todo-list" class="todo-list" k-click="evtTodo()">
    <!-- {{model:todoModel}} -->
      <li id="{{id}}" class="{{completed?completed:''}}">
        <div class="view">
          <input class="toggle" data-id="{{id}}" type="checkbox" checked="{{completed?checked:''}}">
          <label>{{title}}</label>
          <button class="destroy" data-id="{{id}}"></button>
        </div>
        <input class="edit" data-id="{{id}}" value="{{title}}">
      </li>
    <!-- {{/model:todoModel}} -->
  </ul>
`

todoApp.mount(vmodel)

export default todoApp