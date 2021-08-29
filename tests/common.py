# Copyright 2020 Alexandre Díaz
# License AGPL-3.0 or later (http://www.gnu.org/licenses/lgpl.html).
import unittest
import urllib.parse
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.common.keys import Keys
from selenium.webdriver.common.by import By
from selenium.common.exceptions import TimeoutException


class CommandTestInfoParam(object):
    def __init__(self, string, selector):
        self.string = string
        self.selector = selector

class CommandTestInfo(object):
    def __init__(self, params):
        self.params = params

class SeleniumTestCase(unittest.TestCase):
    ODOO_INSTANCE = ''
    ODOO_INSTANCE_TYPE = 'ce'

    _ODOO_SERVERS = {
        'ce': {
            '11': 'https://runbot.odoo-community.org/runbot/142/11.0',
            '12': 'https://runbot.odoo-community.org/runbot/142/12.0',
            '13': 'https://runbot.odoo-community.org/runbot/142/13.0',
            '14': 'https://runbot.odoo-community.org/runbot/142/14.0',
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
        cls.browser.quit()

    def _relative_get(self, url):
        self.browser.get(urllib.parse.urljoin(self.base_url, url))

    def _wait_for_element(self, elementId, delay=None, by=By.ID):
        try:
            founded_elem = WebDriverWait(self.browser, delay or self._WAIT_SECS).until(
                EC.presence_of_element_located((by, elementId)))
        except TimeoutException:
            founded_elem = None
        return founded_elem

    def _login_as(self, login, password):
        self._relative_get('web/login')
        self.browser.find_element_by_xpath("//input[@id='login']")\
            .send_keys(login)
        self.browser.find_element_by_xpath("//input[@id='password']")\
            .send_keys(password)
        self.browser.find_element_by_xpath("//button[@type='submit']")\
            .click()
        elem = self._wait_for_element(
            'p.alert-danger', delay=self._WAIT_SECS*2, by=By.CSS_SELECTOR)
        if elem and not 'Only employee can access this database' in elem.text:
            raise Exception('Ooops! Invalid login :/')

    def _run_tests(self):
        self.browser.execute_script("document.querySelector('.o_terminal')"
                                    + ".dispatchEvent(new Event('start_terminal_tests'));")
        elem = self._wait_for_element(
            '.o_terminal .terminal-test-ok', delay=600, by=By.CSS_SELECTOR)
        self.assertTrue(elem)

    def _open_terminal(self):
        elem = self._wait_for_element('terminal')
        self.assertTrue(elem)
        self.browser.execute_script("document.querySelector('.o_terminal')"
                                    + ".dispatchEvent(new Event('toggle'));")
        self._wait_for_element(
            "#terminal[style='top 0px;']", by=By.CSS_SELECTOR)
        elem_pin_btn = self._wait_for_element('#terminal .terminal-screen-icon-pin', by=By.CSS_SELECTOR)
        elem_pin_btn_classes = elem_pin_btn.get_attribute('class').split()
        if 'btn-light' not in elem_pin_btn_classes:
            elem_pin_btn.click()
        elem_pin_btn_classes = elem_pin_btn.get_attribute('class').split()
        self.assertTrue('btn-light' in elem_pin_btn_classes)
        elem_maximize_btn = self._wait_for_element('#terminal .terminal-screen-icon-maximize', by=By.CSS_SELECTOR)
        elem_maximize_btn_classes = elem_maximize_btn.get_attribute('class').split()
        if 'btn-light' not in elem_maximize_btn_classes:
            elem_maximize_btn.click()
        elem_maximize_btn_classes = elem_maximize_btn.get_attribute('class').split()
        self.assertTrue('btn-light' in elem_maximize_btn_classes)
        return elem

    def execute_test_empty(self):
        self.browser.get('http://www.duckduckgo.com')
        self.assertIn('DuckDuckGo', self.browser.title)
        elem = self._wait_for_element('terminal')
        self.assertFalse(elem)

    def execute_test_ce(self, serv_url):
        self.browser.get(serv_url)
        url_parse = urllib.parse.urlparse(self.browser.current_url)
        self.base_url = '{}://{}'.format(url_parse.scheme, url_parse.netloc)

        # Public
        self._open_terminal()

        # Portal
        self._login_as('portal', 'portal')
        self._open_terminal()

        # Admin
        self._login_as('admin', 'admin')
        self._open_terminal()
        # Tests run as admin user to avoid access rights issues
        self._run_tests()

        # Close Session
        self._relative_get('/web/session/logout')

    def execute_test_ee(self, serv_url):
        self.browser.get(serv_url)
        url_parse = urllib.parse.urlparse(self.browser.current_url)
        self.base_url = '{}://{}'.format(url_parse.scheme, url_parse.netloc)

        # Public
        self._open_terminal()

        # Portal
        self._login_as('portal', 'portal')
        self._open_terminal()

        # Admin
        self._login_as('admin', 'admin')
        elem = self._wait_for_element(
            "a.o_menuitem:not([data-action-id='']):first-child",
            by=By.CSS_SELECTOR)
        elem.click()
        elem = self._wait_for_element(
            'body:not(.o_home_menu_background):not(.o_app_switcher_background)',
            by=By.CSS_SELECTOR)
        self.assertTrue(elem)
        self._exec_full_command_test()

        # Close Session
        self._relative_get('/web/session/logout')
