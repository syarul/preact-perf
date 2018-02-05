/*global util, todoApp*/

(function () {
	'use strict'

	var log = console.log.bind(console)

	var TODO_APP

	var onChanges = []

	function inform() {
	  for (let i=onChanges.length; i--; ) {
	    onChanges[i](TODO_APP.todoList.list)
	  }
	}

	var App = {
		init: function() {

			TODO_APP = new todoApp(this)

			this.todos = TODO_APP.todoList.list

			this.filters = TODO_APP.filters.list

			this.renderFooter()

			this.getActive()

			this.updating = false

		},
		intelliUpdate: function(store){

			var self = this
			// only update when necessary
			if(this.updating) clearTimeout(this.updating)
			this.updating = setTimeout(function() {
			 	self.getActive(store)
			}, 10)
		},
		getActive: function(store) {
			if(TODO_APP.container.mainDisplay == 'none'){
				TODO_APP.main.toggleDisplay(this.todos.length)
				TODO_APP.container.toggleMain(this.todos.length)
				TODO_APP.container.toggleFooter(this.todos.length)
			} else if(TODO_APP.container.mainDisplay == 'block' && !this.todos.length){
				TODO_APP.main.toggleDisplay(this.todos.length)
				TODO_APP.container.toggleMain(this.todos.length)
				TODO_APP.container.toggleFooter(this.todos.length)
			}

			var actives = this.todos.filter(function(f) {
				return f.completed !== 'completed'
			})

			TODO_APP.footer.updateCount(actives.length)
			// only store if requested
			if(store) util.store('todos-keetjs', this.todos)
		},
		getCompleted: function() {
			var completed = this.filterTodos('completed', 'completed');

			this.complete['css-display'] = completed.length ? 'block' : 'none';
			return completed;
		},
		renderFooter: function() {
			var self = this;
			if (window.location.hash !== '') {
				this.updateFilter(window.location.hash);
			} else {
				this.updateFilter('#/all');
				window.history.pushState({}, null, '#/all');
			}

			window.onpopstate = function () {
				self.updateFilter(window.location.hash);
			};
		},
		updateFilter: function(hash) {
			this.filters.map((f, i, r) => {
				let c = {}
				c.className = f.hash === hash ? 'selected' : ''
				if (f.className === 'selected') this.page = f.nodeValue
				r[i] = Object.assign(f, c)
			})
			// this.updatePage();
		},
		updatePage: function() {
			var self = this;
			this.todos.map(function (f, i, r) {
				if (self.page === 'Active' && f.completed === 'completed') f.display = 'none';
				else if (self.page === 'Completed' && f.completed !== 'completed') f.display = 'none';
				else f.display = 'block';
				r.update(i, f);
			});
			util.store('todos-keetjs', this.todos);
			this.updateCheckAll();
			this.focus();
		},
		create: function(evt) {
			let obj = {
		      id: util.genId(),
		      title: value,
		      completed: '',
		      display: window.location.hash == '#/all' || window.location.hash == '#/active' ? 'block' : 'none',
		      checked: false
		    }
		    TODO_APP.todoList.list = TODO_APP.todoList.list.concat(obj)
		    getId(TODO_APP.todoList.el).appendChild(util.genTemplate.call(TODO_APP.todoList, obj))
		    inform()
		},
		editTodos: function(id, ele) {
			var self = this
			,	val
			,	input
			,	isEsc;
			ele.classList.add('editing');
			input = ele.querySelector('.edit');
			val = input.value;
			input.value = '';
			input.focus();
			input.value = val;

			function saveEditing() {
				var ctx = this;
				self.getIndex(id, function (idx) {
					if (ctx.value !== '') {
						ele.classList.remove('editing');
						var changed = self.todos[idx];
						changed.title = ctx.value.trim();
						self.todos.assign(idx, changed);
						self.focus();
					} else if (ctx.value === '') {
						ele.classList.remove('editing');
						self.todos.splice(idx, 1);
					}
				});
			}

			input.onblur = function () {
				ele.classList.remove('editing');
				if (isEsc) return;
				else {
					saveEditing.call(this);
					isEsc = false;
				}
			};

			input.onkeydown = function (e) {
				if (e.which === 13) {
					saveEditing.call(this);
				} else if (e.which === 27) {
					isEsc = true;
					ele.classList.remove('editing');
				}
			};
		},
		todoCheck: function(id) {

			this.todos.filter((todo, idx, todos) => {
				if(todo.id === id){
					let chg = {}
					chg.completed = todo.completed === '' ? 'completed' : ''
					todos[idx] = Object.assign(todo, chg)
				}
			})

			this.intelliUpdate('store')
			// this.focus()
		},
		// function packArray(tgtArray) {
		//    if (!tgtArray || !tgtArray.length) return;
		//    var srcIndex = 0;
		//    var dstIndex = 0;
		//    var arrayLength = tgtArray.length ;
		//    do {
		//        var currentItem = tgtArray[srcIndex]; 
		//        if (currentItem.alive) {
		//          if (srcIndex != dstIndex) {
		//             tgtArray[dstIndex] = currentItem ;
		//          }
		//          dstIndex++;
		//        } 
		//        srcIndex++;
		//    } while (srcIndex != arrayLength) ;
		//     dstIndex--;
		//     tgtArray.length = dstIndex > 0 ? dstIndex : 0 ;
		// }
		destroy: function(id, node) {
			var self = this
			// if (!this.todos || !this.todos.length) return
			// let srcIndex = 0
			// let dstIndex = 0
			// let arrayLength = this.todos.length
			// do {
			// 	let currentItem = this.todos[srcIndex]
			// 	if(id == currentItem.id) {
			// 		log(currentItem, dstIndex, srcIndex)
			// 		if(srcIndex == dstIndex){
			// 			this.todos[dstIndex] = this.todos[srcIndex+1] 
			// 		}
			// 		dstIndex++
			// 	}
			// 	srcIndex++
			// }  while (srcIndex != arrayLength)
			// dstIndex--
			// this.todos.length = dstIndex > 0 ? dstIndex : 0
			// this.todos = this.todos.filter(f => {
			// 	if(f.id == id)
			// 		node.remove()
			// 	else
			// 		return f.id != id
			// })
	        let idx = this.todos.map(f => f.id).indexOf(id)
	        if(~idx)
	          this.todos.splice(idx, 1)
			this.intelliUpdate('store')
			// util.store('todos-keetjs', this.todos);
			// this.getActive();
			// this.updateCheckAll();
			// this.focus();
		},
		clearCompleted: function() {
			log('clear!!')
			return
			var len = this.todos.length;
			while (len--) {
				var idx = this.todos.map(function (f, i) {
					return f.completed;
				}).indexOf('completed');

				if (~idx) this.todos.splice(idx, 1);
				util.store('todos-keetjs', this.todos);
				this.getActive();
			}
			this.updateCheckAll();
			this.focus();
		},
		focus: function() {
			document.getElementById('new-todo').focus();
		},
		updateCheckAll: function() {
			// this.toggle['css-display'] = this.todos.length ? 'block' : 'none';
			TODO_APP.main.toggle('toggleAll', this.todos.length ? 'block' : 'none')

			this.page === 'All' ? this.updateCheckPageAll() : this.page === 'Active' ? this.updateCheckPageActive() : this.updateCheckPageCompleted();
		},
		updateCheckPageAll: function() {
			// this.toggle['el-checked'] = this.todos.length === this.getCompleted().length ? true : false;
			TODO_APP.main.setAttr('toggleAll', 'checked', this.todos.length === this.getCompleted().length ? true : false)
		},
		updateCheckPageActive: function() {
			// this.todos.length === this.getCompleted().length ?  this.toggle['css-display'] = 'none' : this.toggle['el-checked'] = false;
			this.todos.length === this.getCompleted().length ? TODO_APP.main.toggle('toggleAll', 'none') : TODO_APP.main.setAttr('toggleAll', 'checked', false)
		},
		updateCheckPageCompleted: function() {
			if(this.todos.length) {
				this.toggle['css-display'] = this.todos.length === this.getActive().length ? 'none' : 'block';
				this.toggle['el-checked'] = this.todos.length === this.getCompleted().length ? true : false;
			};
		},
		checkedAll: function(/*todoList, state, initial*/) {
			this.todos.map((f, i) => {
				log(f)

				// log(todoList)
				// if (!initial && state && f.completed !== 'completed') todoList.evented(i, 'class', 'toggle', { click: true });
				// else if (!initial && !state && f.completed === 'completed') todoList.evented(i, 'class', 'toggle', { click: true });
				// else if (initial && f.completed === 'completed') todoList.evented(i, 'class', 'toggle', { checked: true });
			});
			this.focus();
		}
		subscribe(fn) {
	        onChanges.push(fn)
	    }
	};

	App.init();
})();