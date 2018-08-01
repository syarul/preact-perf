const Keet = require('../keet')
const { createModel } = require('../keet/utils')

class CreateModel extends createModel {

  clearCompleted() {
    this.list = this.list.filter(todo => !todo.completed)
  } 
}

const todos = new CreateModel()

module.exports = todos
