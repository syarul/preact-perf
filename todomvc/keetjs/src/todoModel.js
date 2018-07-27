
const { store, genId } = require('./util')

// note: copy with modification from preact-todomvc

module.exports = () => {

  let onChanges = []

  function inform () {
    for (let i = onChanges.length; i--;) {
      onChanges[i](model.list)
    }
  }

  let model = {

    list: [],

    subscribe (fn) {
      onChanges.push(fn)
    },

    addTodo (title) {
      model.list = model.list.concat({
        id: genId(),
        title,
        completed: false
      })
      inform()
    },

    toggleAll(completed) {
      model.list= model.list.map(
        todo => ({ ...todo, completed })
      );
      inform()
    },
    
    toggle(todoToToggle) {
      model.list = model.list.map(todo =>
        todo.id !== todoToToggle.id ? todo : ({ ...todo, ...todoToToggle})
      )
      inform()
    },
    
    destroy(id) {
      console.log(id)
      model.list = model.list.filter(t => t.id !== id)
      inform()
    },
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
