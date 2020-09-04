module.exports = {
  env: {
    test: {
      presets: [
        '@babel/react',
        [
          '@babel/env',
          {
            targets: {
              node: true,
            },
          },
        ],
      ],
    },
  },
  plugins: [
    '@babel/plugin-proposal-class-properties',
    'lodash',
    'react-hot-loader/babel',
  ],
  presets: [
    '@babel/react',
    [
      '@babel/env',
      {
        corejs: 3,
        modules: false,
        useBuiltIns: 'usage',
      },
    ],
    '@babel/typescript',
  ],
}
