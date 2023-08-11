#!/usr/bin/env python
# Copyright  Alexandre Díaz <dev@redneboa.es>
# License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).
"""
This script makes a package and can changes the version number

Options
=======
Can use one of these version mode to change it automatically.
If no version mode given, the script only will makes the package.

- major -> Change X.0.0
- minor -> Change 0.X.0
- patch -> Change 0.0.X
- <empty> -> Only make the package
"""

import argparse
import re
import os
import zipfile
import git


def update_version(mode, create_tag=False):
    def _file_sub(filepath, cregex, nvalue):
        fin = open(filepath, 'rt')
        data = fin.read()
        fin.close()
        fout = open(filepath, 'wt')
        data = re.sub(cregex, nvalue, data)
        fout.write(data)
        fout.close()

    # Get Extension Version
    fin = open('manifest.json', 'rt')
    data = fin.read()
    fin.close()
    extension_ver = re.search(r'"version": "(\d+\.\d+\.\d+)"', data).group(1)
    extension_ver = extension_ver.split('.')
    if mode == 'major':
        extension_ver[0] = str(int(extension_ver[0]) + 1)
        extension_ver[1] = '0'
        extension_ver[2] = '0'
    elif mode == 'minor':
        extension_ver[1] = str(int(extension_ver[1]) + 1)
        extension_ver[2] = '0'
    else:
        extension_ver[2] = str(int(extension_ver[2]) + 1)
    extension_ver = '.'.join(extension_ver)

    # manifest.json
    _file_sub(
        'manifest.json',
        r'"version": "\d+\.\d+\.\d+"',
        '"version": "%s"' % extension_ver)
    # abstract_terminal.js
    _file_sub(
        'odoo/js/terminal.js',
        r'VERSION: "\d+\.\d+\.\d+"',
        'VERSION: "%s"' % extension_ver)
    # pyproject.toml
    _file_sub(
        'pyproject.toml',
        r'version = "\d+\.\d+\.\d+"',
        'version = "%s"' % extension_ver)

    # git release commit
    if create_tag:
        repo = git.Repo()
        repo.git.add(u=True)
        repo.index.commit('[REL] Version %s' % extension_ver)
        repo.remotes.origin.push('master')
        new_tag = repo.create_tag('v%s' % extension_ver,
                                  message="Automatic tag '%s'" % extension_ver)
        repo.remotes.origin.push(new_tag)


def create_package():
    zipf = zipfile.ZipFile('OdooTerminal.zip', 'w', zipfile.ZIP_DEFLATED)

    def zipdir(path):
        for root, _dirs, files in os.walk(path):
            for file in files:
                zipf.write(os.path.join(root, file))

    zipdir('icons/')
    zipdir('settings/')
    zipdir('src/')
    zipf.write('manifest.json')
    zipf.write('README.md')

    zipf.close()


if __name__ == '__main__':
    parser = argparse.ArgumentParser(
        description='Generates a release package',
        add_help=True)
    parser.add_argument(
        '-m', '--mode',
        help='Version mode',
        choices=['major', 'minor', 'patch'])
    parser.add_argument(
        '--git',
        action='store_true',
        default=False,
        help='Create commit and tag')
    args = parser.parse_args()
    if args.mode:
        print('Changing extension version...')
        update_version(args.mode, args.git)
    print('Creating extension package...')
    create_package()
    print('All done, bye!')
