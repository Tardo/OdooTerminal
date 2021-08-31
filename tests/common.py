# Copyright 2020 Alexandre Díaz
# License AGPL-3.0 or later (http://www.gnu.org/licenses/lgpl.html).
import unittest
import urllib.parse
import time
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
    _WAIT_SECS = 15

    @classmethod
    def tearDownClass(cls):
        cls.browser.quit()

    def _relative_get(self, url):
        self.browser.get(urllib.parse.urljoin(self.base_url, url))

    def _wait_for_element_located(self, elementId, delay=None, by=By.ID):
        try:
            founded_elem = WebDriverWait(self.browser, delay or self._WAIT_SECS).until(
                EC.presence_of_element_located((by, elementId)))
        except TimeoutException:
            founded_elem = None
        return founded_elem

    def _wait_for_element_clickable(self, elementId, delay=None, by=By.ID):
        try:
            founded_elem = WebDriverWait(self.browser, delay or self._WAIT_SECS).until(
                EC.element_to_be_clickable((by, elementId)))
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
        elem = self._wait_for_element_located(
            'p.alert-danger', delay=self._WAIT_SECS*2, by=By.CSS_SELECTOR)
        if elem and not 'Only employee can access this database' in elem.text:
            raise Exception('Ooops! Invalid login :/')

    def _run_tests(self):
        self.browser.execute_script("document.querySelector('.o_terminal')"
                                    + ".dispatchEvent(new Event('start_terminal_tests'));")
        elem = self._wait_for_element_located(
            '.o_terminal .terminal-test-ok', delay=600, by=By.CSS_SELECTOR)
        self.assertTrue(elem)

    def _open_terminal(self):
        elem = self._wait_for_element_located('terminal')
        self.assertTrue(elem)
        self.browser.execute_script("document.querySelector('.o_terminal')"
                                    + ".dispatchEvent(new Event('toggle'));")
        time.sleep(1.7) # Wait for the animation
        terminal = self._wait_for_element_located(
            '#terminal.terminal-transition-topdown', by=By.CSS_SELECTOR)
        self.assertTrue(terminal)
        elem_pin_btn = self._wait_for_element_clickable('#terminal .terminal-screen-icon-pin', by=By.CSS_SELECTOR)
        self.assertTrue(elem_pin_btn)
        elem_pin_btn_classes = elem_pin_btn.get_attribute('class').split()
        if 'btn-light' not in elem_pin_btn_classes:
            elem_pin_btn.click()
        elem_pin_btn = self._wait_for_element_clickable('#terminal .terminal-screen-icon-pin.btn-light', by=By.CSS_SELECTOR)
        self.assertTrue(elem_pin_btn)
        elem_pin_btn.click()
        elem_maximize_btn = self._wait_for_element_clickable('#terminal .terminal-screen-icon-maximize', by=By.CSS_SELECTOR)
        self.assertTrue(elem_maximize_btn)
        elem_maximize_btn_classes = elem_maximize_btn.get_attribute('class').split()
        if 'btn-light' not in elem_maximize_btn_classes:
            elem_maximize_btn.click()
            time.sleep(1.7) # Wait for the animation
        elem_maximize_btn = self._wait_for_element_clickable('#terminal .terminal-screen-icon-maximize.btn-light', by=By.CSS_SELECTOR)
        self.assertTrue(elem_maximize_btn)
        elem_maximize_btn.click()
        return elem

    def execute_test_empty(self):
        self.browser.get('http://www.duckduckgo.com')
        self.assertIn('DuckDuckGo', self.browser.title)
        elem = self._wait_for_element_located('terminal', delay=5)
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
        elem = self._wait_for_element_clickable(
            "a.o_menuitem:not([data-action-id='']):first-child",
            by=By.CSS_SELECTOR)
        elem.click()
        elem = self._wait_for_element_located(
            'body:not(.o_home_menu_background):not(.o_app_switcher_background)',
            by=By.CSS_SELECTOR)
        self.assertTrue(elem)
        self._exec_full_command_test()

        # Close Session
        self._relative_get('/web/session/logout')
