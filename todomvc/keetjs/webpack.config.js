const webpack = require('webpack')
const path = require('path')
const HtmlWebpackPlugin = require('html-webpack-plugin')
const UglifyJSPlugin = require('uglifyjs-webpack-plugin')

const config = {
  target: 'web',
  node: {
    fs: 'empty'
  },
  entry: [
    './src/app.js',
    //'./view/layout.pug'
  ],
  output: {
    path: path.resolve(__dirname, './dist'),
    filename: 'build.js'
  },
  module: {
    rules: [
      {
        test: /\.js$/,
        loader: 'babel-loader',
        exclude: /node_modules/
      },
      // {
      //   test: /\.pug$/,
      //   use: ['html-loader', 'pug-html-loader?pretty&exports=false']
      // }
    ]
  },
  resolve: {
    modules: ['node_modules'],
    extensions: ['*', '.js', '.styl'],
    alias: {
      components: path.resolve(__dirname, './js/components'),
      // keet: path.resolve(__dirname, './keet.js/keet'),
      app: path.resolve(__dirname, './index'),
      utils: path.resolve(__dirname, './js/utils/index'),
      // '@keet/classList': path.resolve(__dirname, './keet.js/classList')
    }
  },
  plugins: [
    new webpack.HotModuleReplacementPlugin(),
    new HtmlWebpackPlugin({
      title: 'index.html',
      // favicon: 'favicon.ico',
      template: './webpack.html'
    }),
    new webpack.optimize.OccurrenceOrderPlugin()
  ],
  devServer: {
    hot: true,
    inline: true
  },
  devtool: 'source-map'
}

if (process.env.NODE_ENV === 'production') {
  console.log('on production mode')

  delete config.devtool

  config.plugins = (config.plugins || []).concat([
    new webpack.DefinePlugin({
      'process.env': {
        NODE_ENV: '"production"'
      }
    }),
    new webpack.optimize.UglifyJsPlugin({
      output: { comments:false },
      mangle: true,
      sourceMap: true,
      compress: {
        properties: true,
        keep_fargs: false,
        pure_getters: true,
        collapse_vars: true,
        warnings: false,
        screw_ie8: true,
        sequences: true,
        dead_code: true,
        drop_debugger: true,
        comparisons: true,
        conditionals: true,
        evaluate: true,
        booleans: true,
        loops: true,
        unused: true,
        hoist_funs: true,
        if_return: true,
        join_vars: true,
        cascade: true,
        drop_console: false,
        pure_funcs: [
          'classCallCheck',
          '_classCallCheck',
          '_possibleConstructorReturn',
          'Object.freeze',
          'invariant',
          'warning'
        ]
      }
    }),
    new webpack.LoaderOptionsPlugin({
      minimize: true
    })
  ])
}

module.exports = config
