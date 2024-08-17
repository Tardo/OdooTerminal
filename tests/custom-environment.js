import { TestEnvironment } from 'jest-environment-puppeteer';

// FIXME: Here due to https://github.com/argos-ci/jest-puppeteer/issues/586
class Env extends TestEnvironment {
  async setup() {
    await super.setup();
    if (!Object.hasOwn(this.global.context, 'isIncognito')) {
      this.global.context.isIncognito = () => false;
    }
  }
}

export default Env;
