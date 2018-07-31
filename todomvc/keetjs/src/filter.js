const Keet = require('../keet')
const { camelCase, html } = require('./util')
const { createModel } = require('../keet/utils')


class CreateModel extends createModel {
  switch(hash, obj){
    this.list = this.list.map(filter => {
      let non = { selected: false }
      return filter.hash === hash ? ({ ...filter, ...obj}) : ({ ...filter, ...non})
    })
    this.inform()
  }
}
const filters = new CreateModel()

Array.from(['all', 'active', 'completed']).map(page => {
	filters.add({
      hash: '#/' + page,
      name: camelCase(page),
      selected: false
    })
})

class App extends Keet {
  el = 'filters'
  filterModel = filters
  componentWillMount() {
    this.filterModel.subscribe(model => {
      console.log(model)
      this.callBatchPoolUpdate()
    })
  }
  componentDidMount(){
    if (window.location.hash == '') {
      this.updateUrl('#/all')
       window.history.pushState({}, null, '#/all')
    }
    window.onpopstate = () => this.updateUrl(window.location.hash)
  }

  updateUrl(hash) {
    this.filterModel.switch(hash, { selected: true })
    // this.callBatchPoolUpdate()
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

console.log(filterApp)

module.exports = filterApp