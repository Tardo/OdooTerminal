import alias from '@rollup/plugin-alias';
import {nodeResolve} from '@rollup/plugin-node-resolve';
import terser from '@rollup/plugin-terser';
import {babel} from '@rollup/plugin-babel';
import eslint from '@rollup/plugin-eslint';
import commonjs from '@rollup/plugin-commonjs';
import autoprefixer from 'autoprefixer';
import cssnano from 'cssnano';
import path from 'path';
import analyze from 'rollup-plugin-analyzer';
import postcss from 'rollup-plugin-postcss';
const is_production = process.env.ODOO_TERMINAL_ENV === 'production';

export default [
  {
    input: 'src/js/private/legacy/content_script.js',
    output: {
      sourcemap: (!is_production && 'inline') || false,
      format: 'iife',
      dir: 'dist/priv',
      entryFileNames: '[name].js',
      chunkFileNames: '[name]-[hash].js',
    },
    plugins: [
      nodeResolve({
        browser: true,
      }),
      commonjs(),

      babel({
        babelHelpers: 'bundled',
      }),

      eslint({
        fix: true,
      }),

      is_production && terser(),
      is_production && analyze(),
    ],
    watch: {
      clearScreen: false,
      include: ['src/js/private/legacy/content_script.js'],
    },
  },
  {
    input: [
      'src/js/page/loader.mjs',
      'src/js/page/volatile/instance_analyzer.mjs',
      'src/js/shared/content_script.mjs',
    ],
    output: {
      sourcemap: (!is_production && 'inline') || false,
      format: 'esm',
      dir: 'dist/pub',
      entryFileNames: '[name].mjs',
      chunkFileNames: '[name]-[hash].mjs',
    },
    plugins: [
      alias({
        entries: [
          {
            find: '@common',
            replacement: path.resolve('src/js/common'),
          },
          {
            find: '@shared',
            replacement: path.resolve('src/js/shared'),
          },
          {
            find: '@odoo',
            replacement: path.resolve('src/js/page/odoo'),
          },
          {
            find: '@terminal',
            replacement: path.resolve('src/js/page/terminal'),
          },
          {
            find: '@trash',
            replacement: path.resolve('src/js/page/trash'),
          },
          {
            find: '@tests',
            replacement: path.resolve('src/js/page/tests'),
          },
          {
            find: '@css',
            replacement: path.resolve('src/css'),
          },
          {
            find: '@i18n',
            replacement: path.resolve('_locales/'),
          },
        ],
      }),

      nodeResolve({
        browser: true,
      }),
      commonjs(),

      babel({
        babelHelpers: 'bundled',
      }),

      postcss({
        plugins: [autoprefixer(), is_production && cssnano()],
      }),

      eslint({
        fix: true,
      }),

      is_production && terser(),
      is_production && analyze(),
    ],
    watch: {
      clearScreen: false,
      include: [
        'src/js/common/**',
        'src/js/page/**',
        'src/js/shared/**',
        'src/css/terminal.css',
        '_locales/**/translation.json',
      ],
    },
  },
  {
    input: ['src/js/private/options.mjs', 'src/js/private/background.mjs'],
    output: {
      sourcemap: (!is_production && 'inline') || false,
      format: 'esm',
      dir: 'dist/priv',
      entryFileNames: '[name].mjs',
      chunkFileNames: '[name]-[hash].mjs',
    },
    plugins: [
      alias({
        entries: [
          {
            find: '@common',
            replacement: path.resolve('src/js/common'),
          },
          {
            find: '@shared',
            replacement: path.resolve('src/js/shared'),
          },
          {
            find: '@css',
            replacement: path.resolve('src/css'),
          },
        ],
      }),
      nodeResolve({
        browser: true,
      }),
      commonjs(),

      babel({
        babelHelpers: 'bundled',
      }),

      postcss({
        plugins: [autoprefixer(), is_production && cssnano()],
      }),
      eslint({
        fix: true,
      }),

      is_production && terser(),
      is_production && analyze(),
    ],
    watch: {
      clearScreen: false,
      include: ['src/css/options.css', 'src/js/private/**'],
    },
  },
];
