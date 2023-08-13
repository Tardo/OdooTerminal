/* eslint-disable */
import path from "path";
import autoprefixer from "autoprefixer";
import cssnano from "cssnano";
import postcss from "rollup-plugin-postcss";
import {terser} from "rollup-plugin-terser";
import alias from "@rollup/plugin-alias";
import commonjs from "@rollup/plugin-commonjs";
import {nodeResolve} from "@rollup/plugin-node-resolve";

const is_production = process.env.NODE_ENV === "production";

export default {
  input: "src/js/page/loader.mjs",
  output: {
    sourcemap: (!is_production && "inline") || false,
    format: "iife",
    name: "terminal",
    file: "src/dist/terminal.js",
  },
  plugins: [
    alias({
      entries: [
        {
          find: "@common",
          replacement: path.resolve("src/js/common"),
        },
        {
          find: "@shared",
          replacement: path.resolve("src/js/shared"),
        },
        {
          find: "@odoo",
          replacement: path.resolve("src/js/page/odoo"),
        },
        {
          find: "@terminal",
          replacement: path.resolve("src/js/page/terminal"),
        },
        {
          find: "@trash",
          replacement: path.resolve("src/js/page/trash"),
        },
        {
          find: "@tests",
          replacement: path.resolve("src/js/page/tests"),
        },
        {
          find: "@css",
          replacement: path.resolve("src/css"),
        },
      ],
    }),
    nodeResolve(),
    commonjs(),

    postcss({
      plugins: [autoprefixer(), is_production && cssnano()],
    }),

    is_production && terser(),
  ],
  watch: {
    clearScreen: false,
    include: [
      "src/css/terminal.css",
      "src/js/common/**",
      "src/js/page/**",
      "src/js/shared/**",
    ],
  },
};
