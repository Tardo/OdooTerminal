# Copyright 2020 Alexandre Díaz
# License AGPL-3.0 or later (http://www.gnu.org/licenses/lgpl.html).
from selenium import webdriver
from webdriver_manager.chrome import ChromeDriverManager
from tests.common import SeleniumTestCase


class ChromeTestCase(SeleniumTestCase):

    @classmethod
    def setUpClass(cls):
        options = webdriver.ChromeOptions()
        options.add_extension('./OdooTerminal.zip')
        cls.browser = webdriver.Chrome(ChromeDriverManager(log_level=0).install(), options=options)

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
