# Contributing

## Prerequisites

Before contributing, make sure the project dependencies and Husky git hooks are installed:

```sh
pnpm install
```

This command installs all dependencies and sets up the pre-commit hooks automatically.

## Pre-commit Hooks

This project uses [Husky](https://typicode.github.io/husky/) to run quality checks before every commit. The hooks
execute ESLint (with the Hermes parser) and Prettier on staged files.

If a hook fails, the commit is cancelled. Husky may have auto-fixed some files during the run — re-stage those
files and commit again.

## Workflow

1. Fork the repository and create a feature branch.
2. Make your changes following the code conventions described in [Developing](./developing.md).
3. Run the linter and type checker locally to catch issues early:
   ```sh
   pnpm run dev:eslint
   pnpm run dev:flowcheck
   ```
4. Commit your changes. The pre-commit hooks will run automatically.
5. Open a pull request against the `master` branch.

## Code Conventions

- All source files must include `// @flow strict` at the top.
- Use `.mjs` for ES modules.
- Follow the Prettier config defined in `package.json` (`printWidth: 120`, single quotes, trailing commas).
- Use `i18n.t('key', 'default')` for any user-facing string in command files.

## Running Tests

See [Testing](./testing.md) for instructions on running integration and unit tests before submitting a pull request.
