import * as Keet from 'keet'
import { camelCase } from './util'

// const Keet = require('keet')

const createFilterModel = function() {
	
	let filterPage = ['all', 'active', 'completed']

	let filter = {}

	filter.list = filterPage.map(page => {
		return {
	      className: `{{page${camelCase(page)}}}`,
	      hash: '#/' + page,
	      name: camelCase(page)
	    }
	})

	return filter
}

class App extends Keet {
	el = 'filters'
	filterModel = createFilterModel()
}

const filterApp = new App()

let vmodel = `
	<ul id="filters">
		{{model:filterModel}}
		<li k-click="updateUrl({{hash}})"><a class="{{className}}" href="{{hash}}">{{name}}</a></li>
		{{/model:filterModel}}
	</ul>
`

filterApp.mount(vmodel)

export default filterApp