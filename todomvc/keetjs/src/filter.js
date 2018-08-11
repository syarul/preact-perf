import Keet from '../keet'
import { html } from '../keet/utils'
import filterModel from './filter-model'


class App extends Keet {
  el = 'filters'
  filterModel = filterModel
  componentWillMount() {
    this.filterModel.subscribe(model => this.callBatchPoolUpdate())
    if(window.location.hash == '') {
      window.history.pushState({}, null, '#/all')
    }
  }
  componentDidMount(){
    this.updateUrl(window.location.hash)
    window.onpopstate = () => this.updateUrl(window.location.hash)
  }
  updateUrl(hash) {
    this.filterModel.switch(hash, { selected: true })
  }
}

const filterApp = new App()

let vmodel = html`
	<ul id="filters" class="filters">
		<!-- {{model:filterModel}} -->
		<li id="{{name}}" k-click="updateUrl({{hash}})"><a class="{{selected?selected:''}}" href="{{hash}}">{{name}}</a></li>
		<!-- {{/model:filterModel}} -->
	</ul>
`

filterApp.mount(vmodel)

export default filterApp