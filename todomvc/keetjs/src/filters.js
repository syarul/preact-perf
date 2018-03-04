const Keet = require('keet')
const app = require('./app')
const { camelCase } = require('./util')

let filterPage = ['all', 'active', 'completed']

class Filters extends Keet {
  updateUrl (uri) {
    // console.log(app)
    // app.updateFilter(uri)
  }
}

const filters = new Filters()

const vmodel = {
  template: `
    <li k-click="updateUrl({{hash}})">
      <a class="{{className}}" href="{{hash}}">{{nodeValue}}</a>
    </li>`.trim(),
  model: filterPage.map((f, i) => {
    return {
      className: '',
      hash: '#/' + f,
      nodeValue: camelCase(f)
    }
  })
}

const filtersInit = () => {
  filters.mount(vmodel).link('filters')
}

module.exports = {
  filtersInit,
  filters
}
