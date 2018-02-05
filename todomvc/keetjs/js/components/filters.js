import Keet from 'keet'
import app from '../../'
import { camelCase } from '../utils'

let filterPage = ['all', 'active', 'completed']

class Filters extends Keet {
  updateUrl (uri) {
    app.updateFilter(uri)
  }
}

const filters = new Filters()

const vmodel = {
  template: `
    <li k-click="updateUrl({{hash}})">
      <a class="{{className}}" href="{{hash}}">{{nodeValue}}</a>
    </li>`.trim(),
  list: filterPage.map(f => {
    return {
      className: '',
      hash: '#/' + f,
      nodeValue: camelCase(f)
    }
  })
}

const filtersInit = () => filters.mount(vmodel).link('filters')

export {
  filtersInit as default,
  filters
}
