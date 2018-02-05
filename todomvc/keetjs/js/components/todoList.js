import Keet from 'keet'
import genTemplate from 'keet/components/genTemplate'
import { updateElem } from 'keet/components/elementUtils'
import app from '../../'

import { store as todoStore, getId, uuid } from '../utils'

let log = console.log.bind(console)

let onChanges = [];

function inform() {
  for (let i=onChanges.length; i--; ) {
    onChanges[i](todoList.base.list)
  }
}

class TodoList extends Keet {
  constructor (...args) {
    super()
    this.args = args
  }
  editMode (id) {
    // app.editTodos(id, this)
  }
  destroy (evt) {
    let id = evt.target.parentNode.parentNode.getAttribute('data-id')
    todoList.base.list = todoList.base.list.filter(function(todo, index){
      if(id == todo.id)
        evt.target.parentNode.parentNode.remove()
      else
        return todo
    })
    inform()
  }
  completeTodo (evt) {

    let id = evt.target.parentNode.parentNode.getAttribute('data-id')

    todoList.base.list = todoList.base.list.map((todo, idx, todos) => {
      if(todo.id === id){
        todo.completed = todo.completed === '' ? 'completed' : ''
        todo.checked = todo.completed === '' ? false : true
        // evt.target.parentNode.parentNode.replaceWith(genTemplate.call(todoList, todo))
        updateElem(evt.target.parentNode.parentNode, genTemplate.call(todoList, todo))
      }
      return todo
    })

    // todoList.base.list = todoList.base.list.map( todo => (
    //     todo !== todoToToggle ? todo : ({ ...todo, completed: !todo.completed })
    // ) )
    inform()
  }
  addTodo(value){
    let obj = {
      id: uuid(),
      title: value,
      completed: '',
      display: window.location.hash == '#/all' || window.location.hash == '#/active' ? 'block' : 'none',
      checked: false
    }
    todoList.base.list = todoList.base.list.concat(obj)
    getId(todoList.el).appendChild(genTemplate.call(todoList, obj))
    inform()
  }
  subscribe(fn) {
    onChanges.push(fn)
  }
}
const todoList = new TodoList('checked') // assigned `checked` as custom attribute that we want to watch

const vmodel = {
  template: `
    <li k-dblclick="editMode({{id}})" class="{{completed}}" data-id="{{id}}" style="display:{{display}}">
      <div class="view"><input k-click="completeTodo()" class="toggle" type="checkbox" checked="{{checked}}">
        <label>{{title}}</label>
        <button k-click="destroy()" class="destroy"></button>
      </div>
      <input class="edit" value="{{title}}">
    </li>`,
    list: todoStore('todos-keetjs')
}

const todoListInit = () => todoList.mount(vmodel).link('todo-list')

export {
  todoListInit as default,
  todoList
}
