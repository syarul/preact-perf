import Keet from '../../keet'
import { html } from '../../keet/utils'
import todoModel from './todo-model'
let x
class App extends Keet {
  el = 'todo-list'
  todoModel = todoModel
  constructor() {
    super()
    this.todoModel.subscribe(model => {
      this.inform(model)
    })
  }
  addTodo(newTodo){
    this.todoModel.add(newTodo)
  }
  evtTodo(obj, target){
    if(!x){
      x = true
      window.t = new Date()
    }
    // console.log(obj)
    if(target.className === 'toggle')
      this.todoModel.update({ ...obj,  completed: !obj.completed })
    else if(target.className === 'destroy')  
      this.todoModel.destroy(obj)
  }
  // toggleTodo(obj) {
  //   console.log(obj)
  //   this.todoModel.update({ ...obj,  completed: !obj.completed })
  // }
  // toggleTodo(id, completed) {
  //   this.todoModel.update( 'id', { id, completed })
  // }
  // todoDestroy(obj) {
  //   this.todoModel.destroy(obj)
  // }
  editMode(){
    
  }
  clearCompleted(){
    console.log('do!!!!!!!')
  }
}

const todoApp = new App()

let vmodel = html`
  <ul id="todo-list" class="todo-list" k-click="evtTodo()">
    <!-- {{model:todoModel}} -->
      <li class="{{completed?completed:''}}">
        <div class="view">
          <input class="toggle" type="checkbox" checked="{{completed?checked:''}}">
          <label>{{title}}</label>
          <button class="destroy"></button>
        </div>
        <input class="edit" value="{{title}}">
      </li>
    <!-- {{/model:todoModel}} -->
  </ul>
`

todoApp.mount(vmodel)

export default todoApp