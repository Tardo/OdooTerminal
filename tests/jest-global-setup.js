import setupPuppeteer from 'jest-environment-puppeteer/setup';
import { v2 as compose } from 'docker-compose'

const sleep = (waitTimeInMs) => new Promise(resolve => setTimeout(resolve, waitTimeInMs));

export default async function globalSetup(globalConfig) {
  await setupPuppeteer(globalConfig);
  await compose.buildOne('odoo', {
    cwd: 'tests/docker/',
    commandOptions: [["--build-arg", `ODOO_VERSION=${process.env.ODOO_VERSION}`]],
  });
  await compose.upOne('db', {
    cwd: 'tests/docker/',
  });
  await compose.run('odoo', ['addons', 'init', '-w', 'base,bus,barcodes,mail'], {
    cwd: 'tests/docker/',
    commandOptions: [["--rm"]],
  })
  await compose.upOne('odoo', {
    cwd: 'tests/docker/',
  });
  await sleep(10000);
};
