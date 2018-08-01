const store = (namespace, data) => {
  if (arguments.length > 1) {
    return localStorage.setItem(namespace, JSON.stringify(data))
  } else {
    let store = localStorage.getItem(namespace)
    return store && JSON.parse(store) || []
  }
}

const camelCase = s => s.charAt(0).toUpperCase() + s.slice(1)

const genId = () => (Math.round(Math.random() * 0x1*1e12)).toString(32)

export {
  store as default,
  camelCase,
  genId
}