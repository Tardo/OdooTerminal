import { FlatCompat } from "@eslint/eslintrc";
import js from "@eslint/js";
import path from "path";
import { fileURLToPath } from "url";

// mimic CommonJS variables -- not needed if using CommonJS
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const compat = new FlatCompat({
    baseDirectory: __dirname,                  // optional; default: process.cwd()
    resolvePluginsRelativeTo: __dirname,       // optional
    recommendedConfig: js.configs.recommended, // optional unless you're using "eslint:recommended"
});

export default [
  ...compat.extends("plugin:json/recommended-legacy", "plugin:ft-flow/recommended", "prettier"),

  ...compat.env({
    browser: true,
    webextensions: true,
    jquery: true,
    es6: true,
    es2024: true
  }),

  ...compat.plugins("ft-flow"),

  {
    "ignores": [
      "node_modules",
      ".wdm",
      ".pbin",
      ".github",
      ".husky",
      "dist",
      "*.code-workspace",
      "*.lock",
      "*.toml",
      "*.cjs",
      "*.css",
      "package-lock.json",
      "scripts",
      "src/js/flow-typed*"
    ],
  },

  ...compat.config({
    "root": true,
    "parser": "hermes-eslint",
    "overrides": [
      {
        "files": [
          "src/js/**/*.mjs"
        ],
        "parserOptions": {
          "sourceType": "module"
        }
      },
      {
        "files": [
          "tests/**/*.mjs"
        ],
        "env": {
          "jest": true
        }
      }
    ],
    "globals": {
      "__OdooTerminal": "readonly",
      "_": "off",
      "moment": "readonly",
      "odoo": "readonly",
      "owl": "readonly",
      "luxon": "readonly",
      "openerp": "off"
    },
    "rules": {
      "eqeqeq": "error",
      "no-empty-function": "error",
      "no-eval": "error",
      "no-implicit-coercion": "error",
      "no-implicit-globals": "off",
      "no-implied-eval": "error",
      "no-return-assign": "error",
      "no-undef-init": "error",
      "no-shadow": "error",
      "no-script-url": "error",
      "no-unneeded-ternary": "error",
      "no-unused-expressions": "error",
      "no-labels": "error",
      "no-useless-call": "error",
      "no-useless-computed-key": "error",
      "no-useless-concat": "error",
      "no-useless-constructor": "error",
      "no-useless-rename": "error",
      "no-useless-return": "error",
      "no-void": "error",
      "no-unused-vars": [
        "error",
        {
          "destructuredArrayIgnorePattern": "^_",
          "varsIgnorePattern": "^_",
          "caughtErrorsIgnorePattern": "^_",
        }
      ],
      "no-console": [
        "warn",
        {
          "allow": [
            "info",
            "warn",
            "error"
          ]
        }
      ],
      "prefer-const": "error",
      "prefer-numeric-literals": "error",
      "prefer-object-has-own": "error",
      "spaced-comment": "error",
      "radix": "error",
      "prefer-arrow-callback": "warn",
      "no-var": "warn",
      "no-extra-bind": "warn",
      "no-lone-blocks": "warn"
    }
  }),
]
