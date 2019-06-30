const webpack = require('webpack')
const path = require('path')
const HtmlWebpackPlugin = require('html-webpack-plugin')

const config = {
  target: 'web',
  node: {
    fs: 'empty'
  },
  entry: [
    'babel-polyfill',
    './src/index.js'
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
      }
    ]
  },
  resolve: {
    modules: ['node_modules'],
    extensions: ['*', '.js']
  },
  plugins: [
    new webpack.HotModuleReplacementPlugin(),
    new HtmlWebpackPlugin({
      title: 'index.html',
      //favicon: 'website/static/img/favicon.png',
      template: path.join('src', 'index.html')
    }),
    new webpack.optimize.OccurrenceOrderPlugin()
  ],
  devServer: {
    hot: true,
    inline: true
  },
  devtool: 'source-map'
}

module.exports = config
