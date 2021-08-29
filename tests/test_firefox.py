# Copyright 2020 Alexandre Díaz
# License AGPL-3.0 or later (http://www.gnu.org/licenses/lgpl.html).
import os
import pathlib
from selenium import webdriver
from webdriver_manager.firefox import GeckoDriverManager
from tests.common import SeleniumTestCase


class FirefoxTestCase(SeleniumTestCase):
    @classmethod
    def setUpClass(cls):
        cls.ODOO_INSTANCE = os.environ.get('TEST_ODOO_INSTANCE', SeleniumTestCase.ODOO_INSTANCE)
        cls.ODOO_INSTANCE_TYPE = os.environ.get('TEST_ODOO_INSTANCE_TYPE', SeleniumTestCase.ODOO_INSTANCE_TYPE)
        profile = webdriver.FirefoxProfile()
        cls.browser = webdriver.Firefox(firefox_profile=profile, executable_path=GeckoDriverManager(log_level=0).install())
        cls.browser.install_addon(str(pathlib.Path('./OdooTerminal.zip').absolute()), temporary=True)

    # Test No Terminal
    def test_NoTerminal(self):
        self.execute_test_empty()

    # Test Odoo Instance
    def test_OdooInstance(self):
        if self.ODOO_INSTANCE_TYPE == 'ee':
            self.execute_test_ee(self.ODOO_INSTANCE)
        else:
            self.execute_test_ce(self.ODOO_INSTANCE)
