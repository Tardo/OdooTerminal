# Copyright 2020 Alexandre Díaz
# License AGPL-3.0 or later (http://www.gnu.org/licenses/lgpl.html).
import os
import pathlib
from selenium import webdriver
from selenium.webdriver.firefox.service import Service
from selenium.webdriver.firefox.options import Options
from selenium.webdriver.firefox.firefox_profile import FirefoxProfile
from webdriver_manager.firefox import GeckoDriverManager
from tests.common import SeleniumTestCase


class FirefoxTestCase(SeleniumTestCase):
    @classmethod
    def setUpClass(cls):
        cls.ODOO_INSTANCE = os.environ.get('TEST_ODOO_INSTANCE', SeleniumTestCase.ODOO_INSTANCE)
        cls.ODOO_INSTANCE_TYPE = os.environ.get('TEST_ODOO_INSTANCE_TYPE', SeleniumTestCase.ODOO_INSTANCE_TYPE)
        service = Service(GeckoDriverManager(log_level=0).install())
        options = Options()
        options.profile = FirefoxProfile()
        cls.browser = webdriver.Firefox(service=service, options=options)
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
