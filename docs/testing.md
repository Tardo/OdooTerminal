## Integration Tests

This tests only checks that the extension is loaded successfully on all
compatible Odoo versions.

#### Installation

_For environments without a real X11 server see 'xvfb' (X11 Virtual
FrameBuffer)_

```
apt-get install python python-pip
pip install -r tests/requirements.txt
pip install -r tools/requirements.txt
```

#### Usage

First need set 'TEST_ODOO_INSTANCE' and 'TEST_ODOO_INSTANCE_TYPE' (ce or ee,
default is ce) env. variables:

```
export TEST_ODOO_INSTANCE=https://runbot.odoo-community.org/runbot/142/14.0
```

\*\* This example uses OCA CE 14.0 instance to run the test

- All (Automated packaging)

```
python -m tests
```

- Chrome

```
python tools/release.py
python -m unittest tests.test_chrome
```

- Firefox

```
python tools/release.py
python -m unittest tests.test_firefox
```

## Unit Tests

**All**:
`document.querySelector(".o_terminal").dispatchEvent(new Event('start_terminal_tests'))`

**Selected (Example: whoami and search)**
`document.querySelector(".o_terminal").dispatchEvent(new CustomEvent('start_terminal_tests', {detail:'test_whoami,test_search'}))`

#### Untested Commands

- clear
- exportfile
- reload
- debug
- post
- jstest
- tour (partial)
- logout
- lang
