
import { genId } from './util'

// note: copy with modification from preact-todomvc

export default () => {
  let onChanges = []

  function inform () {
    for (let i = onChanges.length; i--;) {
      onChanges[i](model)
    }
  }

  let model = {

    list: [],

    // ops: null,

    subscribe (fn) {
      onChanges.push(fn)
    },

    addTodo (title) {
      // this.ops = 'add'
      this.list = this.list.concat({
        id: genId(),
        title,
        completed: false
      })
      inform()
    },

    toggleAll (completed) {
      this.ops = 'toggleAll'
      this.list = this.list.map(
        todo => ({ ...todo, completed })
      )
      inform()
    },

    toggle (todoToToggle) {
      // this.ops = 'toggle'
      this.list = this.list.map(todo => todo.id !== todoToToggle.id ? todo : ({ ...todo, ...todoToToggle}))
      inform()
    },

    destroy (id) {
      // this.ops = 'destroy'
      this.list = this.list.filter(t => t.id !== id)
      inform()
    }
    /*
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
