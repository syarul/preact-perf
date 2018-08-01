const { camelCase } = require('./util')
const { createModel } = require('../keet/utils')

class CreateFilterModel extends createModel {
  switch(hash, obj){
    this.list = this.list.map(filter =>
      filter.hash === hash ? ({ ...filter, ...obj}) : ({ ...filter, ...{ selected: false }})
    )
  }
}

const filterModel = new CreateFilterModel()

Array.from(['all', 'active', 'completed']).map(page => {
	filterModel.add({
      hash: '#/' + page,
      name: camelCase(page),
      selected: false
    })
})

module.exports = filterModel