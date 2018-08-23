'use strict';
var app = app || {};

(function () {
	var STORAGE_ID = 'todos-mithril';
	app.storage = {
		get: function () {
<<<<<<< HEAD
			return [] //JSON.parse(localStorage.getItem(STORAGE_ID) || '[]');
		},
		put: function (todos) {
			// localStorage.setItem(STORAGE_ID, JSON.stringify(todos));
=======
			return JSON.parse(localStorage.getItem(STORAGE_ID) || '[]');
		},
		put: function (todos) {
			localStorage.setItem(STORAGE_ID, JSON.stringify(todos));
>>>>>>> cleanup
		}
	};
})();
