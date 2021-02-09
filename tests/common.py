# Copyright 2020 Alexandre Díaz
# License AGPL-3.0 or later (http://www.gnu.org/licenses/lgpl.html).
import unittest
import urllib.parse
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.common.keys import Keys
from selenium.webdriver.common.by import By
from selenium.common.exceptions import TimeoutException


class SeleniumTestCase(unittest.TestCase):

    _ODOO_SERVERS = {
        'ce': {
            '11': 'https://runbot.odoo-community.org/runbot/189/11.0',
            '12': 'https://runbot.odoo-community.org/runbot/189/12.0',
            '13': 'https://runbot.odoo-community.org/runbot/189/13.0',
            '14': 'https://runbot.odoo-community.org/runbot/189/14.0',
        },
        # 'ee': {
        #     '11': 'http://runbot.odoo.com/runbot/quick_connect/33836',
        #     '12': 'http://runbot.odoo.com/runbot/quick_connect/47161',
        #     '13': 'http://runbot.odoo.com/runbot/quick_connect/72617',
        #     '14': 'http://runbot.odoo.com/runbot/quick_connect/9471',
        # }
    }
    _WAIT_SECS = 5

    @classmethod
    def tearDownClass(cls):
        cls.browser.quit

    def _relative_get(self, url):
        self.browser.get(urllib.parse.urljoin(self.base_url, url))

    def _waitForElement(self, elementId, delay, by=By.ID):
        try:
            founded_elem = WebDriverWait(self.browser, delay).until(
                EC.presence_of_element_located((by, elementId)))
        except TimeoutException:
            founded_elem = False
        return founded_elem

    def _loginAs(self, login, password):
        self._relative_get('web/login')
        self.browser.find_element_by_xpath("//input[@id='login']")\
            .send_keys(login)
        self.browser.find_element_by_xpath("//input[@id='password']")\
            .send_keys(password)
        self.browser.find_element_by_xpath("//button[@type='submit']")\
            .click()
        elem = self._waitForElement(
            'p.alert-danger', self._WAIT_SECS, by=By.CSS_SELECTOR)
        if elem and not 'Only employee can access this database' in elem.text:
            raise Exception('Ooops! Invalid login :/')

    def _send_terminal_command(self, cmd):
        elem = self.browser.find_element_by_css_selector(
            'input#terminal_input')
        elem.send_keys(cmd)
        elem.send_keys(Keys.RETURN)

    def _do_user_actions(self, delay, wait_cmd):
        elem = self._waitForElement('terminal', delay)
        self.assertTrue(elem)
        self.browser.execute_script("document.querySelector('.o_terminal')"
                                    + ".dispatchEvent(new Event('toggle'));")
        self._waitForElement(
            "#terminal[style='top 0px;']", 3, by=By.CSS_SELECTOR)
        self._send_terminal_command('help')
        elem = self._waitForElement(
            "strong[data-cmd='help %s']" % wait_cmd, 3, By.CSS_SELECTOR)
        self.assertTrue(elem)

    def _execute_test_empty(self):
        self.browser.get('http://www.duckduckgo.com')
        self.assertIn('DuckDuckGo', self.browser.title)
        elem = self._waitForElement('terminal', 3)
        self.assertFalse(elem)

    def _execute_test_ce(self, serv_url):
        self.browser.get(serv_url)
        url_parse = urllib.parse.urlparse(self.browser.current_url)
        self.base_url = '%s://%s' % (url_parse.scheme, url_parse.netloc)

        # Public
        self._do_user_actions(self._WAIT_SECS, 'whoami')

        # Portal
        self._loginAs('portal', 'portal')
        self._do_user_actions(self._WAIT_SECS, 'whoami')

        # Admin
        self._loginAs('admin', 'admin')
        self._do_user_actions(self._WAIT_SECS*2, 'view')

        # Close Session
        self._relative_get('/web/session/logout')

    def _execute_test_ee(self, serv_url):
        self.browser.get(serv_url)
        url_parse = urllib.parse.urlparse(self.browser.current_url)
        self.base_url = '%s://%s' % (url_parse.scheme, url_parse.netloc)

        # Public
        self._do_user_actions(self._WAIT_SECS, 'whoami')

        # Portal
        self._loginAs('portal', 'portal')
        self._do_user_actions(self._WAIT_SECS, 'whoami')

        # Admin
        self._loginAs('admin', 'admin')
        elem = self._waitForElement(
            "a.o_menuitem:not([data-action-id='']):first-child",
            self._WAIT_SECS,
            by=By.CSS_SELECTOR)
        elem.click()
        elem = self._waitForElement(
            'body:not(.o_home_menu_background):not(.o_app_switcher_background)',
            self._WAIT_SECS*2,
            by=By.CSS_SELECTOR)
        self.assertTrue(elem)
        self._do_user_actions(self._WAIT_SECS*2, 'view')

        # Close Session
        self._relative_get('/web/session/logout')
