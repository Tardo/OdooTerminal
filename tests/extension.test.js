const WAIT_MINS = 60000;

function construct_url(relative_path = '') {
  return new URL(relative_path, 'http://localhost:8069');
}

async function loginAs(login, password) {
  await page.goto(construct_url('/web/login'));
  await page.waitForSelector('input#login', {visible: true});
  await page.type('input#login', login);
  await page.waitForSelector('input#password', {visible: true});
  await page.type('input#password', password);
  await page.waitForSelector('button[type="submit"]:not(.oe_search_button)', {visible: true});
  await page.click('button[type="submit"]:not(.oe_search_button)');

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
  let optionsUrl;
  beforeAll(async () => {
    await loginAs('admin', 'admin');
    const worker = await browser.waitForTarget(target => target.type() === 'service_worker');
    optionsUrl = new URL('/src/html/options.html', worker.url()).href;
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

    const result = await page.waitForSelector('.o_terminal .terminal-test-ok,.o_terminal .terminal-test-fail', {
      timeout: WAIT_MINS * 30,
    });
    const text = await page.evaluate(() => {
      const elm = document.querySelector('.o_terminal #terminal_screen');
      return elm.textContent;
    });
    console.debug('---- TERMINAL OUTPUT:', text); // eslint-disable-line no-console

    expect(await result.evaluate(element => element.classList.contains('terminal-test-ok'))).toBe(true);
  }, WAIT_MINS * 35);

  it('persists execution controls in extension options', async () => {
    const options = await browser.newPage();
    try {
      await options.goto(optionsUrl);
      await options.waitForSelector('#sec-execution input');
      await options.waitForSelector('.loading-overlay', {hidden: true});
      const inputs = await options.$$eval('#sec-execution input', nodes => nodes.map(node => node.name));
      expect(inputs).toHaveLength(6);
      await options.$eval('input[name="execution_max_instructions"]', input => {
        input.value = '12345';
        input.dispatchEvent(new Event('change', {bubbles: true}));
      });
      await options.waitForSelector('.header-actions .ot-btn-primary:not([disabled])');
      await options.click('.header-actions .ot-btn-primary');
      await options.waitForSelector('.header-actions .ot-btn-primary[disabled]:not(:has(.ot-spin-mini))');
      await options.reload();
      await options.waitForFunction(() =>
        document.querySelector('input[name="execution_max_instructions"]')?.value === '12345',
      );
    } finally {
      await options.close();
    }
  }, WAIT_MINS);
});
