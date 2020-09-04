const HtmlWebpackPlugin = require('html-webpack-plugin')
const MiniCssExtractPlugin = require('mini-css-extract-plugin')
const webpack = require('webpack')

const buildConfig = require('./buildConfig')

module.exports = {
  bail: true,
  context: __dirname,
  devtool: 'source-map',
  entry: {
    main: buildConfig.paths.app.mainJs,
  },
  mode: 'production',
  module: {
    rules: [
      {
        test: /\.jsx?|\.tsx?$/,
        include: [buildConfig.paths.app.src],
        loader: 'babel-loader',
      },
      {
        test: /\.scss$/,
        include: [buildConfig.paths.app.styles],
        use: [
          MiniCssExtractPlugin.loader,
          {
            loader: 'css-loader',
            options: {
              // Applies postcss-loader to @imported resources.
              importLoaders: 1,
            },
          },
          'postcss-loader',
          'sass-loader',
        ],
      },
      {
        test: /\.(woff(2)?|ttf|eot|svg)(\?v=\d+\.\d+\.\d+)?$/,
        loader: 'file-loader',
        options: {
          name: '[name].[hash].[ext]',
        },
      },
    ],
  },
  optimization: {
    runtimeChunk: {
      name: 'manifest',
    },
    splitChunks: {
      chunks: 'all',
    },
  },
  output: {
    chunkFilename: 'js/[name].[chunkhash].js',
    filename: 'js/[name].[chunkhash].js',
    path: `${buildConfig.paths.dist}-${process.env.DEPLOY_ENV}/${process.env.GIT_HASH}`,
    publicPath: `${process.env.ASSETS_URL}/${process.env.GIT_HASH}/`,
  },
  plugins: [
    // This is a shorthand plugin for the DefinePlugin.
    new webpack.EnvironmentPlugin(['APP_ENV', 'NODE_ENV']),
    new HtmlWebpackPlugin({
      favicon: buildConfig.paths.app.favicon,
      // "inject: true" places all JavaScript resources at the bottom of the body element.
      inject: true,
      template: buildConfig.paths.app.html,
    }),

    // Ignore locales from moment.
    new webpack.IgnorePlugin(/^\.\/locale$/, /moment$/),

    // Need this to preserve the IDs of Webpack modules between builds. Otherwise having new imports in the main bundle
    // will cache-bust the vendor bundle.
    new webpack.HashedModuleIdsPlugin(),

    new MiniCssExtractPlugin({
      filename: 'css/[name].[contenthash].css',
    }),
  ],
  resolve: {
    extensions: ['.js', '.jsx', '.ts', '.tsx'],
    modules: ['node_modules', buildConfig.paths.base],
  },
}
