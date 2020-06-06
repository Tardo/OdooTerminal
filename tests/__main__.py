# Copyright 2020 Alexandre Díaz
# License AGPL-3.0 or later (http://www.gnu.org/licenses/lgpl.html).
import sys
import subprocess
import unittest


subprocess.call(['python3', 'tools/release.py'])
sys.path.append('.')

loader = unittest.TestLoader()
testSuite = loader.discover('tests')
testRunner = unittest.TextTestRunner(verbosity=2)
result = not testRunner.run(testSuite).wasSuccessful()
sys.exit(result)
