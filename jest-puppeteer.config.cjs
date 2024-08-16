const path = require('path');

/** @type {import('jest-environment-puppeteer').JestPuppeteerConfig} */
module.exports = {
  testEnvironment: './tests/custom-environment.js',
  launch: {
    dumpio: true,
    headless: process.env.PUPPETEER_HEADLESS !== 'false',
    product: process.env.PUPPETEER_BROWSER || 'chrome',
    protocol: 'webDriverBiDi',
    args: [`--disable-extensions-except=${path.resolve(__dirname)}`, `--load-extension=${path.resolve(__dirname)}`],
  },
};
