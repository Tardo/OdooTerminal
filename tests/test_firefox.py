# Copyright 2020 Alexandre Díaz
# License AGPL-3.0 or later (http://www.gnu.org/licenses/lgpl.html).
import pathlib
from selenium import webdriver
from webdriver_manager.firefox import GeckoDriverManager
from tests.common import SeleniumTestCase


class FirefoxTestCase(SeleniumTestCase):

    @classmethod
    def setUpClass(cls):
        profile = webdriver.FirefoxProfile()
        cls.browser = webdriver.Firefox(firefox_profile=profile, executable_path=GeckoDriverManager(log_level=0).install())
        cls.browser.install_addon(str(pathlib.Path('./OdooTerminal.zip').absolute()), temporary=True)

    # Test No Terminal
    def test_NoTerminal(self):
        self._execute_test_empty()

    # Test Odoo 11.0 CE
    def test_Odoo11BasicCE(self):
        self._execute_test_ce(self._ODOO_SERVERS['ce']['11'])

    # Test Odoo 12.0 CE
    def test_Odoo12BasicCE(self):
        self._execute_test_ce(self._ODOO_SERVERS['ce']['12'])

    # Test Odoo 13.0 CE
    def test_Odoo13BasicCE(self):
        self._execute_test_ce(self._ODOO_SERVERS['ce']['13'])
