import nodeResolve from 'rollup-plugin-node-resolve';
import commonjs from 'rollup-plugin-commonjs';
import babel from 'rollup-plugin-babel';

export default {
	input: 'src/app.js',
	output: {
		file: 'build.js',
		format: 'iife',
		sourcemap: true
	},
	plugins: [
		nodeResolve({ 
			module: true
		}),
		commonjs({
			include: 'node_modules/**',
			namedExports: { '../keet/utils.js': [ 'html' ] }
		}),
		babel({
			babelrc: false,
			presets: [
				[
					'env',
					{
				        "modules": false
				    }
				],
			],
			plugins: [
				'external-helpers',
				'transform-class-properties',
      			'transform-object-rest-spread'
			]
		})
	]
};