import setupPuppeteer from 'jest-environment-puppeteer/setup';
import { v2 as compose } from 'docker-compose'

const sleep = (waitTimeInMs) => new Promise(resolve => setTimeout(resolve, waitTimeInMs));

export default async function globalSetup(globalConfig) {
  await setupPuppeteer(globalConfig);
  await compose.upOne('db', {
    cwd: 'tests/docker/',
    commandOptions: [['--pull', 'missing']],
  });
  await compose.run('odoo', ['--stop-after-init', '-d', 'postgres', '-r', 'odoo', '-w', 'odoo', '-i', 'base,bus,barcodes,mail'], {
    cwd: 'tests/docker/',
    commandOptions: [['--rm']],
  });
  await compose.upOne('odoo', {
    cwd: 'tests/docker/',
    commandOptions: [['--pull', 'missing']],
  });
  await sleep(10000);
};
