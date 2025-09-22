const path = require('path');

/** @type {import('jest-environment-puppeteer').JestPuppeteerConfig} */
module.exports = {
  launch: {
    dumpio: true,
    headless: process.env.PUPPETEER_HEADLESS !== 'false',
    product: process.env.PUPPETEER_BROWSER || 'chrome',
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      `--disable-extensions-except=${path.resolve(__dirname)}`,
      `--load-extension=${path.resolve(__dirname)}`,
    ],
  },
};
