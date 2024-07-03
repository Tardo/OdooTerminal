import teardownPuppeteer from 'jest-environment-puppeteer/teardown';
import { v2 as compose } from 'docker-compose'

export default async function globalTeardown(globalConfig) {
  await teardownPuppeteer(globalConfig);
  await compose.rm({
    cwd: 'tests/docker/',
    commandOptions: [["--stop"], ["--volumes"]],
  });
};
