(function () {

  function genId() {
    return (Math.round(Math.random() * 0x1*1e12)).toString(32)
  }

  function html () {
    var literals = [].shift.call(arguments)
    var substs = [].slice.call(arguments)

    var result = literals.raw.reduce(function (acc, lit, i) {
      return acc + substs[i - 1] + lit
    })
    // remove spacing, indentation from every line
    result = result.split(/\n+/)
    result = result.map(function (t) {
      return t.trim()
    }).join('')
    return result
  }

  function createModel() {
    var model = []
    var onChanges = []

    var inform = function () {
      for (var i = onChanges.length; i--;) {
        onChanges[i](model)
      }
    }

    Object.defineProperty(this, 'list', {
      enumerable: false,
      configurable: true,
      get: function () {
        return model
      },
      set: function (val) {
        model = val
        inform()
      }
    })

    this.subscribe = function (fn) {
      onChanges.push(fn)
    }

    this.add = function (obj) {
      this.list = this.list.concat(obj)
    }

    this.update = function (lookupId, updateObj) {
      this.list = this.list.map(function (obj) {
        return obj[lookupId] !== updateObj[lookupId] ? obj : Object.assign(obj, updateObj)
      })
    }

    this.destroy = function (lookupId, objId) {
      this.list = this.list.filter(function (obj) {
        return obj[lookupId] !== objId
      })
    }
  }

  var todos = new createModel()

  todos.clearCompleted = function() {
    this.list = this.list.filter(function(todo) {
      return !todo.completed
    })
  }

  function App(){
    this.todoModel = todos
    // this.filter = filterApp
    this.page = 'All'
    this.isChecked = false
    this.count = 0
    this.plural = ''
    this.clearToggle = false
    this.todoState = true

    this.create = function(evt) {
      if(evt.keyCode !== 13) return
      var title = evt.target.value.trim()
      if(title){
        this.todoModel.add({ id: genId(), title, completed: false })
        evt.target.value = ''
      }
    }

    var self = this

    this.todoModel.subscribe(function(todos){
      var uncompleted = todos.filter(function(c) { return !c.completed })
      var completed = todos.filter(function(c) { return c.completed })
      self.clearToggle = completed.length ? true : false
      self.todoState = todos.length ? true : false
      self.plural = uncompleted.length === 1 ? '' : 's'
      self.count = uncompleted.length
    })

    this.toggleTodo = function(id, evt) {
      this.todoModel.update( 'id', { id, completed: !!evt.target.checked })
    }

    this.todoDestroy = function(id) {
      this.todoModel.destroy('id', id)
    }

    this.completeAll = function(){
      this.isChecked = !this.isChecked
      this.todoModel.updateAll(this.isChecked)
    }

    this.clearCompleted = function() {
      this.todoModel.clearCompleted()
    }
  }

  App.prototype = Object.create(Keet.prototype)
  App.prototype.constructor = App

  var app = new App()

  app.mount(html`
  <section id="todoapp">
    <header id="header">
      <h1>todos</h1>
      <input id="new-todo" k-keydown="create()" placeholder="What needs to be done?" autofocus>
    </header>
    {{?todoState}}
    <section id="main">
      <input id="toggle-all" type="checkbox" {{isChecked?checked:''}} k-click="completeAll()">
      <label for="toggle-all">Mark all as complete</label>
      <ul id="todo-list">
        {{model:todoModel}}
          <li id="{{id}}" k-dblclick="editMode({{id}})" class="{{completed?completed:''}}">
            <div class="view"><input k-click="toggleTodo({{id}})" class="toggle" type="checkbox" {{completed?checked:''}}>
              <label>{{title}}</label>
              <button k-click="todoDestroy({{id}})" class="destroy"></button>
            </div>
            <input class="edit" value="{{title}}">
          </li>
        {{/model:todoModel}}
      </ul>
    </section>
    <footer id="footer">
      <span id="todo-count">
        <strong>{{count}}</strong> item{{plural}} left
      </span>
      {{component:filter}}
      {{?clearToggle}}
      <button id="clear-completed" k-click="clearCompleted()">Clear completed</button>
      {{/clearToggle}}
    </footer>
    {{/todoState}}
  </section>
  <footer id="info">
    <p>Double-click to edit a todo</p>
    <p>Created by <a href="https://github.com/syarul">Shahrul Nizam Selamat</a></p>
    <p>Part of <a href="http://todomvc.com">TodoMVC</a></p>
  </footer>
  `).link('todo')
})()
