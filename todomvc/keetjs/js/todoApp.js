/*global Keet, util*/

(function (exports) {
	'use strict';

	exports.todoApp = function(App) {

		var self = this

		var log = console.log.bind(console)

		var todo = { 
			todoapp: {
				tag: 'section',
				id: 'todoapp'
			},
			info: {
				tag: 'footer',
				id: 'info',
				template: `
					<p>Double-click to edit a todo</p>
					<p>Created by <a href="https://github.com/syarul">Shahrul Nizam Selamat</a></p>
					<p>Part of <a href="http://todomvc.com">TodoMVC</a></p>`
			}
		}

		var todoListCluster = function(){
			class TodoList extends Keet {
				constructor(){
					super()
					this.args = [].slice.call(arguments)
				}
				editMode(id){
					// App.editTodos(id, this)
				}
				todoDestroy(id, evt){
					this.destroy(id, 'keet-id', evt.target.parentNode.parentNode)
					App.todoDestroy()
				}
				completeTodo(id, evt){
					App.todoCheck(id, 'keet-id', evt.target.parentNode.parentNode)
				}

			}
			self.todoList = new TodoList('checked')
			self.todoList.mount({
				template: `
					<li k-dblclick="editMode({{id}})" class="{{completed}}" data-id="{{id}}" style="display:{{display}}">
						<div class="view"><input k-click="completeTodo({{keet-id}})" class="toggle" type="checkbox" checked="{{checked}}">
							<label>{{title}}</label>
							<button k-click="todoDestroy({{keet-id}})" class="destroy"></button>
						</div>
						<input class="edit" value="{{title}}">
					</li>`,
				model: util.store('todos-keetjs')
			}).link('todo-list')
		}

		var toggleCluster = function() {
			class Toggle extends Keet {
				constructor(...args){
					super()
					this.args = args
					this.display = 'none'
					this.isCheck = false
				}
				toggleDisplay(display){
					this.display = display === 'none' ? 'block' : 'none'
				}
				toggleCheck(check){
					this.isCheck = check || false
				}
				completeAll(evt){
					App.checkedAll(evt)
				}
			}
			self.toggler = new Toggle('checked')
			self.toggler.mount({
				toggler: {
					tag: 'input',
					id: 'toggle-all',
					type: 'checkbox',
					checked: '{{isCheck}}',
					style: {
						display: '{{display}}'
					},
					'k-click': 'completeAll()'
					
				}
			}).link('toggleAllContainer')
		}

		var mainCluster = function() {
			class Main extends Keet {}
			self.main = new Main()
			self.main.mount({
				toggleAll: {
					tag: 'div',
					id: 'toggleAllContainer'	
				},
				toggleLabel: `<label for="toggle-all">Mark all as complete</label>`,
				todoList: {
					tag: 'ul',
					id: 'todo-list'
				}
			}).link('main').cluster(toggleCluster, todoListCluster)
		}

		var filtersCluster = function() {

			let filters = ['all', 'active', 'completed']

			filters = filters.map(function (f) {
				return {
					className: '',
					hash: '#/' + f,
					nodeValue: util.camelCase(f)
				};
			})
			class Filters extends Keet {
				updateUrl(uri){
					App.updateFilter(uri)
				}
			}
			self.filters = new Filters()
			self.filters.mount({
				template: `
					<li k-click="updateUrl({{hash}})">
						<a class="{{className}}" href="{{hash}}">{{nodeValue}}</a>
					</li>`.trim(),
				model: filters
			}).link('filters')
		}

		var footerCluster = function(){
			class Footer extends Keet {
				constructor(){
					super()
					this.count = ' '
					this.s = ' '
					this.clearCompletedDisplay = 'none'
				}
				toggleClearComplete(display){
					this.clearCompletedDisplay = display || 'none'
				}
				updateCount(count){
					this.count = count.toString()
					this.s = count === 1 ? '' : 's'
				}
				clearCompletedClicked(evt){
					App.clearCompleted.bind(App)
				}
			}
			self.footer = new Footer()
			self.footer.mount({
				todoCount: {
					tag: 'span',
					id: 'todo-count',
					template: '<strong>{{count}}</strong> item{{s}} left'
				},
				filters: {
					tag: 'ul',
					id: 'filters'
				},
				clearCompleted: {
					tag: 'button',
					id: 'clear-completed',
					style: {
						display: '{{clearCompletedDisplay}}'
					},
					'k-click': 'clearCompletedClicked()',
					template: 'Clear completed'
				}
			}).link('footer').cluster(filtersCluster)
		}

		var containerCluster = function() {
			class Container extends Keet {
				constructor(){
					super()
					this.mainDisplay = 'none'
					this.footerDisplay = 'none'
				}
				toggleMain(show){
					this.mainDisplay = show ? 'block' : 'none'
				}
				toggleFooter(show){
					this.footerDisplay = show ? 'block' : 'none'
				}
				create(evt){
					if(evt.keyCode !== 13) return
					let obj = {
				      title: evt.target.value.trim(),
				      completed: '',
				      display: window.location.hash == '#/all' || window.location.hash == '#/active' ? 'block' : 'none',
				      checked: false
				    }
				    self.todoList.add(obj, 'createId')
					App.create()
					evt.target.value = ''
				}
			}
			self.container = new Container()

			var vdom = {
				header: {
					tag: 'header',
					id: 'header',
					template: `
						<h1>todos</h1>
						<input id="new-todo" k-keydown="create()" placeholder="What needs to be done?" autofocus>`
				},
				main: {
					tag: 'section',
					id: 'main',
					style: {
						display: '{{mainDisplay}}'
					}
				},
				footer: {
					tag: 'footer',
					id: 'footer',
					style: {
						display: '{{footerDisplay}}'
					}
				}
			}

			/*var vdomTodos = {
				main: {
					tag: 'section',
					id: 'main',
					style: {
						display: '{{mainDisplay}}'
					}
				},
				footer: {
					tag: 'footer',
					id: 'footer',
					style: {
						display: '{{footerDisplay}}'
					}
				}
			}*/

			self.container.mount(vdom).link('todoapp').cluster(mainCluster, footerCluster)
			// setTimeout(() => {
			  	// Object.assign(self.container.base, vdomTodos)
			  	// self.container.render()
			// }, 2000)
		}

		this.todoapp = new Keet()

		this.todoapp.mount(todo).link('todo').cluster(containerCluster)

	}

})(window);