const { camelCase, html } = require('./util')

module.exports = function(filterPage) {
  let str = ''
  const filters = page => {
    let f = {
      className: `{{page${camelCase(page)}}}`,
      hash: '#/' + page,
      name: camelCase(page)
    }
    str += html`<li k-click="updateUrl(${f.hash})"><a class="${f.className}" href="${f.hash}">${f.name}</a></li>`
  }
  filterPage.map(page => filters(page))
  return str
}
