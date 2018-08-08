import Keet from '../keet'
import { createModel } from '../keet/utils'

class CreateModel extends createModel {

  clearCompleted() {
    this.list = this.list.filter(todo => !todo.completed)
  } 
}

const todos = new CreateModel()

export default todos
