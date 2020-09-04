const path = require('path')

module.exports = {
  paths: {
    app: {
      favicon: path.resolve(__dirname, 'public/img/favicon.ico'),
      html: path.resolve(__dirname, 'public/index.html'),
      mainJs: path.resolve(__dirname, 'src/main.tsx'),
      src: path.resolve(__dirname, 'src'),
      styles: path.resolve(__dirname, 'src/styles'),
    },
    babelCache: path.resolve(__dirname, '.babel-cache'),
    base: path.resolve(__dirname, '.'),
    dist: path.resolve(__dirname, 'dist'),
  },
  webpackDevServerPort: 9051,
}
