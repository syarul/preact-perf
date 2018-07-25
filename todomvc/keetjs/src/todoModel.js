// const Keet = require('../keet')
const { store } = require('./util')

// note: copy with modification from preact-todomvc

// const todo = require('./todo')

module.exports = todo => {

  let onChanges = []

  function inform () {
    for (let i = onChanges.length; i--;) {
      console.log(this)
      this && onChanges[i](this.base.model)
    }
  }

  let model = {
    // todos: [],

    // onChanges: [],

    subscribe (fn) {
      onChanges.push(fn)
    },

    addTodo (title) {
      let m = {
        title,
        completed: ''
      }
      // model.todos = model.todos.concat(m)
      todo.add(m, inform)
      // console.log(todo)
    }

    /* toggleAll(completed) {
      model.todos = model.todos.map(
        todo => ({ ...todo, completed })
      );
      inform();
    },

    toggle(todoToToggle) {
      model.todos = model.todos.map( todo => (
        todo !== todoToToggle ? todo : ({ ...todo, completed: !todo.completed })
      ) );
      inform();
    },

    destroy(todo) {
      model.todos = model.todos.filter( t => t !== todo );
      inform();
    },

    save(todoToSave, title) {
      model.todos = model.todos.map( todo => (
        todo !== todoToSave ? todo : ({ ...todo, title })
      ));
      inform();
    },

    clearCompleted() {
      model.todos = model.todos.filter( todo => !todo.completed );
      inform();
    } */
  }

  return model
}
