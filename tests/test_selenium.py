# Copyright 2020 Alexandre Díaz
# License LGPL-3.0 or later (http://www.gnu.org/licenses/lgpl.html).
import unittest
import urllib.parse
from selenium import webdriver
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.common.by import By
from selenium.common.exceptions import TimeoutException

WAIT_SECS = 8


class SeleniumTestCase(unittest.TestCase):

    _odoo_servers = {
        'ce': {
            '11': 'https://runbot.odoo-community.org/runbot/113/11.0',
            '12': 'https://runbot.odoo-community.org/runbot/113/12.0',
            '13': 'https://runbot.odoo-community.org/runbot/113/13.0',
        },
        'ee': {
            '11': 'http://runbot.odoo.com/runbot/quick_connect/33836',
            '12': 'http://runbot.odoo.com/runbot/quick_connect/47161',
            '13': 'http://runbot.odoo.com/runbot/quick_connect/72617',
            '14': 'http://runbot.odoo.com/runbot/quick_connect/9471',
        }
    }

    def setUp(self):
        options = webdriver.ChromeOptions()
        options.add_extension(r'./OdooTerminal.zip')
        self.browser = webdriver.Chrome(
            options=options)
        self.addCleanup(self.browser.quit)

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
            'p.alert-danger', WAIT_SECS, by=By.CSS_SELECTOR)
        self.assertFalse(elem, 'Ooops! Invalid login :/')

    def _execute_test_ce(self, serv_url):
        self.browser.get(serv_url)
        url_parse = urllib.parse.urlparse(self.browser.current_url)
        self.base_url = '%s://%s' % (url_parse.scheme, url_parse.netloc)

        # Public
        elem = self._waitForElement('terminal', WAIT_SECS)
        self.assertTrue(elem)
        # elem = self.browser.find_element_by_css_selector('div#terminal')
        # self.assertTrue(elem)

        # Portal
        self._loginAs('portal', 'portal')
        elem = self._waitForElement('terminal', WAIT_SECS)
        self.assertTrue(elem)

        # Admin
        self._loginAs('admin', 'admin')
        elem = self._waitForElement('terminal', WAIT_SECS*2)
        self.assertTrue(elem)

        # Close Session
        self._relative_get('/web/session/logout')

    def _execute_test_ee(self, serv_url):
        self.browser.get(serv_url)
        url_parse = urllib.parse.urlparse(self.browser.current_url)
        self.base_url = '%s://%s' % (url_parse.scheme, url_parse.netloc)

        # Public
        elem = self._waitForElement('terminal', WAIT_SECS)
        self.assertTrue(elem)
        # elem = self.browser.find_element_by_css_selector('div#terminal')
        # self.assertTrue(elem)

        # Portal
        self._loginAs('portal', 'portal')
        elem = self._waitForElement('terminal', WAIT_SECS)
        self.assertTrue(elem)

        # Admin
        self._loginAs('admin', 'admin')
        elem = self._waitForElement(
            "a.o_menuitem:not([data-action-id='']):first-child",
            WAIT_SECS,
            by=By.CSS_SELECTOR)
        elem.click()
        # FIXME: Needed by Odoo 11.0+e
        self._waitForElement(
            'body:not(.o_home_menu_background)',
            WAIT_SECS,
            by=By.CSS_SELECTOR)
        self.browser.refresh()
        # FIXME-END
        elem = self._waitForElement('terminal', WAIT_SECS*2)
        self.assertTrue(elem)

        # Close Session
        self._relative_get('/web/session/logout')

    def testNoTerminal(self):
        self.browser.get('http://www.google.com')
        self.assertIn('Google', self.browser.title)
        elem = self._waitForElement('terminal', 3)
        self.assertFalse(elem)

    def testOdoo11CE(self):
        self._execute_test_ce(self._odoo_servers['ce']['11'])

    def testOdoo12CE(self):
        self._execute_test_ce(self._odoo_servers['ce']['12'])

    # Odoo 13 CE is down
    # def testOdoo13CE(self):
    #     self._execute_test(self._odoo_servers['ce']['13'])

    def testOdoo11EE(self):
        self._execute_test_ee(self._odoo_servers['ee']['11'])

    def testOdoo12EE(self):
        self._execute_test_ee(self._odoo_servers['ee']['12'])

    def testOdoo13EE(self):
        self._execute_test_ee(self._odoo_servers['ee']['13'])

    def testOdoo14EE(self):
        self._execute_test_ee(self._odoo_servers['ee']['14'])


if __name__ == '__main__':
    unittest.main(verbosity=2)
