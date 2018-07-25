exports.inform = function(base, input) {
  for (var i = base.onChanges.length; i--;) {
    base.onChanges[i](input)
  }
}

exports.store = function(namespace, data) {
  if (arguments.length > 1) {
    return localStorage.setItem(namespace, JSON.stringify(data))
  } else {
    var store = localStorage.getItem(namespace)
    return store && JSON.parse(store) || []
  }
}

exports.camelCase = function(s) {
  return s.charAt(0).toUpperCase() + s.slice(1)
}

exports.genId = function() {
  return (Math.round(Math.random() * 0x1*1e12)).toString(32)
}

exports.getId = function (id) {
  return document.getElementById(id)
}