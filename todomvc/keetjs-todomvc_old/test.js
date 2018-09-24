
function ret() {
  return (`{o: "<div id="foo">foo</div>"}`)
}

function h(){
  return ret()
}

let ff

function t(){

	ff = h()
	// c = 2
	// console.log(c)
}

t()