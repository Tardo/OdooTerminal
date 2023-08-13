# Copyright  Alexandre Díaz <dev@redneboa.es>
# License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).
import pytest
import time
import pathlib
import logging
from selenium import webdriver
from selenium.webdriver.chrome.service import Service as ChromeService
from selenium.webdriver.chrome.options import Options as ChromeOptions
from selenium.webdriver.firefox.service import Service as FirefoxService
from selenium.webdriver.firefox.options import Options as FirefoxOptions
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.common.keys import Keys
from selenium.webdriver.common.by import By
from selenium.common.exceptions import TimeoutException
from webdriver_manager.chrome import ChromeDriverManager
from webdriver_manager.firefox import GeckoDriverManager
from webdriver_manager.core.os_manager import ChromeType

logging.basicConfig(level=logging.INFO)


class TestExtension:
    _WAIT_SECS = 15

    @pytest.fixture(scope='session')
    def browser(self, pytestconfig):
        browser_name = pytestconfig.getoption('browser')
        if browser_name in ('chrome', 'chromium'):
            if browser_name == 'chromium':
                chrome_type = ChromeType.CHROMIUM
            else:
                chrome_type = ChromeType.GOOGLE
            service = ChromeService(ChromeDriverManager(chrome_type=chrome_type).install())
            options = ChromeOptions()
            options.add_extension('./OdooTerminal.zip')
            browser = webdriver.Chrome(service=service, options=options)
        else:
            service = FirefoxService(GeckoDriverManager().install())
            options = FirefoxOptions()
            options.set_preference('profile', False)
            browser = webdriver.Firefox(service=service, options=options)
            browser.install_addon(str(pathlib.Path('./OdooTerminal.zip').absolute()), temporary=True)
        time.sleep(5)   # Wait for browser up
        yield browser
        browser.quit()

    def _wait_for_element_located(self, browser, elementId, delay=None, by=By.ID):
        try:
            founded_elem = WebDriverWait(browser, delay or self._WAIT_SECS).until(
                EC.presence_of_element_located((by, elementId)))
        except TimeoutException:
            founded_elem = None
        return founded_elem

    def _wait_for_element_clickable(self, browser, elementId, delay=None, by=By.ID):
        try:
            founded_elem = WebDriverWait(browser, delay or self._WAIT_SECS).until(
                EC.element_to_be_clickable((by, elementId)))
        except TimeoutException:
            founded_elem = None
        return founded_elem

    def _login_as(self, browser, construct_url, login, password):
        browser.get(construct_url('web/login'))
        browser.find_element('xpath', "//input[@id='login']")\
            .send_keys(login)
        browser.find_element('xpath', "//input[@id='password']")\
            .send_keys(password)
        browser.find_element('xpath', "//button[@type='submit']")\
            .click()
        elem = self._wait_for_element_located(
            browser, 'p.alert-danger', delay=self._WAIT_SECS*2, by=By.CSS_SELECTOR)
        if elem and not 'Only employee can access this database' in elem.text:
            raise Exception('Ooops! Invalid login :/')

    def _open_terminal(self, browser):
        elem = self._wait_for_element_located(browser, 'terminal')
        assert elem
        browser.execute_script("document.querySelector('.o_terminal')"
                                    + ".dispatchEvent(new Event('toggle'));")
        time.sleep(1.7) # Wait for the animation
        terminal = self._wait_for_element_located(
            browser, '#terminal.terminal-transition-topdown', by=By.CSS_SELECTOR)
        assert terminal
        elem_pin_btn = self._wait_for_element_clickable(browser, '#terminal .terminal-screen-icon-pin', by=By.CSS_SELECTOR)
        assert elem_pin_btn
        elem_pin_btn_classes = elem_pin_btn.get_attribute('class').split()
        if 'btn-light' not in elem_pin_btn_classes:
            elem_pin_btn.click()
        elem_pin_btn = self._wait_for_element_clickable(browser, '#terminal .terminal-screen-icon-pin.btn-light', by=By.CSS_SELECTOR)
        assert elem_pin_btn
        elem_pin_btn.click()
        elem_maximize_btn = self._wait_for_element_clickable(browser, '#terminal .terminal-screen-icon-maximize', by=By.CSS_SELECTOR)
        assert elem_maximize_btn
        elem_maximize_btn_classes = elem_maximize_btn.get_attribute('class').split()
        if 'btn-light' not in elem_maximize_btn_classes:
            elem_maximize_btn.click()
            time.sleep(1.7) # Wait for the animation
        elem_maximize_btn = self._wait_for_element_clickable(browser, '#terminal .terminal-screen-icon-maximize.btn-light', by=By.CSS_SELECTOR)
        assert elem_maximize_btn
        elem_maximize_btn.click()
        return elem

    # Test No Terminal
    # def test_noTerminal(self, browser):
    #     browser.get('http://www.duckduckgo.com')
    #     assert 'DuckDuckGo' in browser.title
    #     elem = self._wait_for_element_located(browser, 'terminal', delay=5)
    #     assert not elem

    # def test_public(self, browser, docker_compose, construct_url):
    #     browser.get(construct_url('/'))
    #     self._open_terminal(browser)

    # def test_portal(self, browser, docker_compose, construct_url):
    #     browser.get(construct_url('/'))
    #     self._login_as(browser, construct_url, 'portal', 'portal')
    #     self._open_terminal(browser)

    def test_admin(self, browser, docker_compose, construct_url):
        browser.get(construct_url('/'))
        self._login_as(browser, construct_url, 'admin', 'admin')
        self._open_terminal(browser)
        # Tests run as admin user to avoid access rights issues
        browser.execute_script("document.querySelector('.o_terminal').dispatchEvent(new Event('start_terminal_tests'));")
        # browser.execute_script("document.querySelector('.o_terminal').dispatchEvent(new CustomEvent('start_terminal_tests', {detail:'test_create'}))")
        elem = self._wait_for_element_located(
            browser, '.o_terminal .terminal-test-ok,.o_terminal .terminal-test-fail', delay=1200, by=By.CSS_SELECTOR)
        # Always print Terminal Output
        log = logging.getLogger('terminal')
        term_screen = self._wait_for_element_located(
            browser, '#terminal #terminal_screen', by=By.CSS_SELECTOR)
        if term_screen:
            print('---- TERMINAL OUTPUT')
            print(term_screen.get_attribute('innerText'))
        assert elem
        finish_clasess = elem.get_attribute('class').split(' ')
        assert 'terminal-test-ok' in finish_clasess
