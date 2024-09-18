# Modify an existing language

Go to `_locales` folder, select the language and edit the `.json` files.

# Add a new language

1. Edit `package.json / babel / plugins / "i18next-extract" / locales` to include the new language tag.
2. Edit `src / js / page / loader.mjs / function initTranslations / supportedLngs` to include the new language tag.
3. Edit `src / html / options.hml` to include the new language tag.
4. Run `npm install` (If the project is already installed, skip this step.)
5. Run `npm run dev:rollup`
6. Edit `_locales / <NEW LANGUAGE TAG> / *.json` files

\*\* You can use https://r12a.github.io/app-subtags/ to `check` if the new language tag is valid.

**IMPORTANT:** Hyphen-separated tags must use 'underscore' (ex. en-US --must be--> en_US).

**MORE IMPORTANT:** Do not rely on the translation export system. ALWAYS work with a backup file (you can use the
'backups' folder of the project). You take the risk of losing the entire translation.
