# Copyright 2020 Alexandre Díaz
# License AGPL-3.0 or later (http://www.gnu.org/licenses/lgpl.html).
import os
from selenium import webdriver
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.chrome.options import Options
from webdriver_manager.chrome import ChromeDriverManager
from tests.common import SeleniumTestCase


class ChromeTestCase(SeleniumTestCase):
    @classmethod
    def setUpClass(cls):
        cls.ODOO_INSTANCE = os.environ.get('TEST_ODOO_INSTANCE', SeleniumTestCase.ODOO_INSTANCE)
        cls.ODOO_INSTANCE_TYPE = os.environ.get('TEST_ODOO_INSTANCE_TYPE', SeleniumTestCase.ODOO_INSTANCE_TYPE)
        service = Service(ChromeDriverManager(log_level=0).install())
        options = Options()
        options.add_extension('./OdooTerminal.zip')
        cls.browser = webdriver.Chrome(service=service, options=options)

    # Test No Terminal
    def test_NoTerminal(self):
        self.execute_test_empty()

    # Test Odoo Instance
    def test_OdooInstance(self):
        if self.ODOO_INSTANCE_TYPE == 'ee':
            self.execute_test_ee(self.ODOO_INSTANCE)
        else:
            self.execute_test_ce(self.ODOO_INSTANCE)
