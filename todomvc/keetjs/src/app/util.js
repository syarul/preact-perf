const store = function(namespace, data) {
  if (arguments.length > 1) {
    return localStorage.setItem(namespace, JSON.stringify(data))
  } else {
    var store = localStorage.getItem(namespace)
    return store && JSON.parse(store) || []
  }
}

const camelCase = function(s) {
  return s.charAt(0).toUpperCase() + s.slice(1)
}

export {
  store,
  camelCase
}