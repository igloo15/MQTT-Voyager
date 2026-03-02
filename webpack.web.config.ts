import type { Configuration } from 'webpack';
import path from 'path';
import HtmlWebpackPlugin from 'html-webpack-plugin';

const webConfig: Configuration = {
  target: 'web',
  mode: process.env.NODE_ENV === 'production' ? 'production' : 'development',
  entry: './src/renderer.tsx',
  output: {
    path: path.resolve(__dirname, 'dist/web'),
    filename: 'bundle.[contenthash].js',
    publicPath: '/',
    clean: true,
  },
  resolve: {
    extensions: ['.js', '.ts', '.jsx', '.tsx', '.css'],
    alias: {
      '@shared': path.resolve(__dirname, 'shared'),
      // Stub electron-specific modules so they don't break the web build
      electron: path.resolve(__dirname, 'src/renderer/stubs/electron.ts'),
    },
    fallback: {
      // Node.js built-ins not available in browser — webpack polyfills
      path: false,
      fs: false,
      crypto: false,
      buffer: require.resolve('buffer/'),
    },
  },
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        exclude: /node_modules/,
        use: {
          loader: 'ts-loader',
          options: {
            transpileOnly: true,
            compilerOptions: {
              // Override for web build — no JSX transform issues
              jsx: 'react-jsx',
            },
          },
        },
      },
      {
        test: /\.css$/,
        use: ['style-loader', 'css-loader'],
      },
    ],
  },
  plugins: [
    new HtmlWebpackPlugin({
      template: './src/index.html',
    }),
  ],
};

export default webConfig;
