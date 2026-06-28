# Translations

## Modifying an Existing Language

Navigate to the `_locales/` folder, select the language directory, and edit the `.json` files directly.

## Adding a New Language

1. Add the new language tag to `package.json` under `babel > plugins > "i18next-extract" > locales`.
2. Add the new language tag to the `supportedLngs` array in `src/js/page/loader.mjs` inside `initTranslations`.
3. Add the new language option to `src/html/options.html`.
4. Run `pnpm install` (skip if dependencies are already installed).
5. Run `pnpm run dev:rollup` to trigger the translation key extraction.
6. Edit the generated `_locales/<NEW_LANGUAGE_TAG>/*.json` files with the translated strings.

Language tags can be validated at [r12a.github.io/app-subtags](https://r12a.github.io/app-subtags/).

> **Note:** Hyphen-separated tags must use underscores (e.g. `en-US` must be written as `en_US`).

> **Important:** Do not rely solely on the translation export system. Always keep a backup copy of your translation
> files (the `backups/` folder is a suitable location). There is a risk of losing the entire translation if the
> export overwrites existing content.
