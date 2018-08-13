import Keet from '../keet'
import { createModel } from '../keet/utils'

class CreateModel extends createModel {

  clearCompleted() {
    this.list = this.list.filter(todo => !todo.completed)
  } 
}

const todoModel = new CreateModel()

// todoModel.add({
// 	id: '12345',
// 	title: 'what the',
// 	completed: false
// })

export default todoModel
