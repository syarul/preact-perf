
const { store } = require('./util')

// note: copy with modification from preact-todomvc

module.exports = todo => {

  let onChanges = []

  function inform () {
    for (let i = onChanges.length; i--;) {
      onChanges[i](this.base.model)
    }
  }

  let model = {

    subscribe (fn) {
      onChanges.push(fn)
    },

    addTodo (title) {
      let m = {
        title,
        completed: ''
      }
      todo.add(m, inform)
    },

    toggleAll(completed) {
      todo.base.model.map(m => {
        console.log(m)
        todo.update(m['keet-id'], 'keet-id', { 
          completed: completed, 
          checked: completed === 'completed' ? 'checked' : ''
        })
      })
      inform.call(todo)
      // todo.base.model = model.todos.map(
      //   todo => ({ ...todo, completed })
      // );
      // inform();
    },
    
    toggle(todoToToggle) {
      // model.todos = model.todos.map( todo => (
      //   todo !== todoToToggle ? todo : ({ ...todo, completed: !todo.completed })
      // ) );
      // inform();
    },
    /*
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
