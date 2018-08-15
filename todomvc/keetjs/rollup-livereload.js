import nodeResolve from 'rollup-plugin-node-resolve'
import commonjs from 'rollup-plugin-commonjs'
import babel from 'rollup-plugin-babel'
import serve from 'rollup-plugin-serve'
import livereload from 'rollup-plugin-livereload'

export default {
	input: 'src/app/app.js',
	output: {
		file: 'build/app.js',
		format: 'iife',
		sourcemap: true
	},
	external: [],
	plugins: [
		babel({
			babelrc: false,
			presets: [
				['es2015', { loose:true, modules:false }],
				'stage-0'
			],
			plugins: [
				'external-helpers'
			]
		}),
		nodeResolve(),
		commonjs(),
		serve(),
		livereload()
	]
}