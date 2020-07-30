# Copyright 2020 Alexandre Díaz
# License AGPL-3.0 or later (http://www.gnu.org/licenses/lgpl.html).
from selenium import webdriver
from webdriver_manager.chrome import ChromeDriverManager
from tests.common import SeleniumTestCase


class ChromeTestCase(SeleniumTestCase):

    def setUp(self):
        options = webdriver.ChromeOptions()
        options.add_extension('./OdooTerminal.zip')
        self.browser = webdriver.Chrome(ChromeDriverManager(log_level=0).install(), options=options)
        super().setUp()

    # Test No Terminal
    def test_NoTerminal(self):
        self.browser.get('http://www.duckduckgo.com')
        self.assertIn('DuckDuckGo', self.browser.title)
        elem = self._waitForElement('terminal', 3)
        self.assertFalse(elem)

    # Test Odoo 11.0
    def test_Odoo11CE(self):
        self._execute_test_ce(self._ODOO_SERVERS['ce']['11'])

    # def test_Odoo11EE(self):
    #     self._execute_test_ee(self._ODOO_SERVERS['ee']['11'])

    # Test Odoo 12.0
    def test_Odoo12CE(self):
        self._execute_test_ce(self._ODOO_SERVERS['ce']['12'])

    # def test_Odoo12EE(self):
    #     self._execute_test_ee(self._ODOO_SERVERS['ee']['12'])

    # Test Odoo 13.0
    def test_Odoo13CE(self):
        self._execute_test_ce(self._ODOO_SERVERS['ce']['13'])

    # def test_Odoo13EE(self):
    #     self._execute_test_ee(self._ODOO_SERVERS['ee']['13'])

    # Test Odoo 14.0 (master)
    # def test_Odoo14CE(self):
    #     self._execute_test_ce(self._ODOO_SERVERS['ce']['14'])

    # def test_Odoo14EE(self):
    #     self._execute_test_ee(self._ODOO_SERVERS['ee']['14'])
