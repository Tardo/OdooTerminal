## Testing

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
