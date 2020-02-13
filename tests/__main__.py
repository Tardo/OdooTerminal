# Copyright 2020 Alexandre Díaz
# License AGPL-3.0 or later (http://www.gnu.org/licenses/lgpl.html).
import sys
import unittest

sys.path.append('.')

loader = unittest.TestLoader()
testSuite = loader.discover('tests')
testRunner = unittest.TextTestRunner(verbosity=2)
result = not testRunner.run(testSuite).wasSuccessful()
sys.exit(result)
