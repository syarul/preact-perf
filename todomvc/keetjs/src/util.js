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

exports.html = function (literalSections, ...substs) {
  // Use raw literal sections: we don’t want
  // backslashes (\n etc.) to be interpreted
  let raw = literalSections.raw;

  let result = '';

  substs.forEach((subst, i) => {
      // Retrieve the literal section preceding
      // the current substitution
      let lit = raw[i];

      // In the example, map() returns an array:
      // If substitution is an array (and not a string),
      // we turn it into a string
      if (Array.isArray(subst)) {
          subst = subst.join('');
      }

      // If the substitution is preceded by a dollar sign,
      // we escape special characters in it
      if (lit.endsWith('$')) {
          subst = htmlEscape(subst);
          lit = lit.slice(0, -1);
      }
      result += lit;
      result += subst;
  });
  // Take care of last literal section
  // (Never fails, because an empty template string
  // produces one literal section, an empty string)
  result += raw[raw.length-1]; // (A)

  return result;
}