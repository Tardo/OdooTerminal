import setupPuppeteer from 'jest-environment-puppeteer/setup';
import * as compose from 'docker-compose'

const sleep = (waitTimeInMs) => new Promise(resolve => setTimeout(resolve, waitTimeInMs));

export default async function globalSetup(globalConfig) {
  await setupPuppeteer(globalConfig);
  await compose.upOne('db', {
    cwd: 'tests/docker/',
    commandOptions: [['--pull', 'missing']],
  });
  const odoo_ver = process.env.ODOO_VERSION;
  const odoo_major = Number(odoo_ver.split('.', 1));
  const odoo_cli_params = ['--stop-after-init', '-d', 'postgres', '-r', 'odoo', '-w', 'odoo', '-i', 'base,bus,barcodes,mail'];
  if (odoo_major >= 19) {
    odoo_cli_params.push('--with-demo');
  }
  await compose.run('odoo', odoo_cli_params, {
    cwd: 'tests/docker/',
    commandOptions: [['--rm']],
  });
  await compose.upOne('odoo', {
    cwd: 'tests/docker/',
    commandOptions: [['--pull', 'missing']],
  });
  await sleep(10000);
};
