import Keet from '../../keet'
import { createModel } from '../../keet/utils'

class CreateModel extends createModel {
  clearCompleted() {
    this.list = this.list.filter(todo => !todo.completed)
  } 
  updateAll(checked){
  	this.list = this.list.map(todo => ({ ...todo, completed: checked}))
  }
}

const todoModel = new CreateModel()

export default todoModel
