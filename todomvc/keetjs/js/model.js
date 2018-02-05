import { uuid } from './utils';

// note: copied from preact model.js

export default () => {
	let onChanges = [];

	function inform(type) {
		for (let i=onChanges.length; i--; ) {
			onChanges[i](model, type);
		}
	}

	let model = {
		todos: [],

		onChanges: [],

		subscribe(fn) {
			onChanges.push(fn);
		},

		addTodo(title) {
			model.todos = model.todos.concat({
				id: uuid(),
				title,
				completed: ''
			});
			inform('add');
		},

		toggleAll(completed) {
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
		}
	};

	return model;
};