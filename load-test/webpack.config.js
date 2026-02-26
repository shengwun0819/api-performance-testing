/**
 * 選用：與 sygna-load-test bridge 相同的 webpack 建置方式。
 * 建置後輸出至 load_test/，可用 k6 run load_test/api_load_test.test.js 執行。
 * 預設仍可直接執行 k6 run tests/api-load.test.js，無需建置。
 */
const path = require('path');

module.exports = {
  mode: 'development',
  entry: {
    api_load_test: './tests/api-load.test.js',
  },
  output: {
    path: path.resolve(__dirname, 'load_test'),
    filename: '[name].test.js',
    libraryTarget: 'commonjs',
  },
  module: {
    rules: [{ test: /\.js$/, use: 'babel-loader', exclude: /node_modules/ }],
  },
  stats: {
    colors: true,
    warnings: false,
  },
  target: 'node',
  externals: [
    /^k6(\/.*)?$/,
    /^https:\/\//,
  ],
  devtool: 'source-map',
};
