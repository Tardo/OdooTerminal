/**
 * @jest-environment ./tests/custom-environment
 */
const WAIT_MINS = 60000;

function construct_url(relative_path = '') {
  return new URL(relative_path, 'http://localhost:8069');
}

async function loginAs(login, password) {
  await page.goto(construct_url('/web/login'));
  await page.waitForSelector('input#login');
  let input_el = await page.$('input#login');
  await input_el.type(login);
  input_el = await page.$('input#password');
  await input_el.type(password);
  await page.click('button[type="submit"]');

  try {
    const elem_selector = await page.waitForSelector('p.alert-danger', {timeout: 5000});
    if (elem_selector) {
      const text = await page.evaluate(() => {
        const par = document.querySelector('p.alert-danger');
        return par.textContent;
      });
      expect(text).toContain('Only employee can access this database');
    }
  } catch (_err) {
    // do nothing
  }
}

describe('OdooTerminal', () => {
  beforeAll(async () => {
    await loginAs('admin', 'admin');
  }, 30000);

  it('test open terminal', async () => {
    await page.waitForSelector('#terminal');
    await page.evaluate(() => {
      document.querySelector('.o_terminal').dispatchEvent(new Event('toggle'));
    });
    await page.waitForSelector('#terminal', {visible: true});
  });

  it('test all', async () => {
    await page.evaluate(() => {
      document.querySelector('.o_terminal').dispatchEvent(new Event('start_terminal_tests'));
    });

    await page.waitForSelector('.o_terminal .terminal-test-ok,.o_terminal .terminal-test-fail', {
      timeout: WAIT_MINS * 30,
    });
    const text = await page.evaluate(() => {
      const elm = document.querySelector('.o_terminal #terminal_screen');
      return elm.textContent;
    });
    console.debug('---- TERMINAL OUTPUT:', text); // eslint-disable-line no-console

    await page.waitForSelector('.o_terminal .terminal-test-ok');
  }, WAIT_MINS * 35);
});
