const Keet = require('../keet')
const { camelCase, html } = require('./util')
const filters = require('./filter-model')


class App extends Keet {
  el = 'filters'
  filterModel = filters
  componentWillMount() {
    this.filterModel.subscribe(model => {
      this.callBatchPoolUpdate()
    })
    if(window.location.hash == '') {
      window.history.pushState({}, null, '#/all')
    }
  }
  componentDidMount(){
    this.updateUrl(window.location.hash)
    window.onpopstate = () => this.updateUrl(window.location.hash)
  }

  // componentDidUnMount(){
    //
  // }

  updateUrl(hash) {
    this.filterModel.switch(hash, { selected: true })
  }
}

const filterApp = new App()

let vmodel = html`
	<ul id="filters">
		{{model:filterModel}}
		<li k-click="updateUrl({{hash}})"><a class="{{selected?selected:''}}" href="{{hash}}">{{name}}</a></li>
		{{/model:filterModel}}
	</ul>
`

filterApp.mount(vmodel)

module.exports = filterApp