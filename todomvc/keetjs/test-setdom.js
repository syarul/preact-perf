const setDOM = require('set-dom')

// just disable this
// setDOM.KEY = 'keet-id'

let log = console.log.bind(console)

let temp1 = document.createElement('div')
temp1.id = 'list-1'

let temp2 = document.createElement('div')
temp2.id = 'list-1'

let str = `
	<ul>
		<div keet-id="1">
			<input type="checkbox">
		</div>
		<div keet-id="2">
			<input type="checkbox">
		</div>
	</ul>
`
let str2 = `
	<ul>
		<div keet-id="2">
			<input type="checkbox">
		</div>
	<ul>
`
temp1.innerHTML = str
temp2.innerHTML = str2

document.body.appendChild(temp1)

setTimeout(() => {
	let el = document.querySelector('[keet-id="1"]')
	el.childNodes[1].click()
}, 1000)

setTimeout(() => {
	let el = document.getElementById('list-1')
	setDOM(el, temp2)
}, 3000)