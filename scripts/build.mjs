// Copyright  Alexandre Díaz <dev@redneboa.es>
// License MIT (https://opensource.org/license/mit).

import {execSync} from 'child_process';
import AdmZip from 'adm-zip';
import {rmSync} from 'node:fs';

// Remove 'dist' folder
rmSync('./dist', {recursive: true, force: true});
// Generate 'dist' files
execSync('rollup -c');
// Create Zip
const zip = new AdmZip();
zip.addLocalFolder('./src/html', './src/html');
zip.addLocalFolder('./src/img', './src/img');
zip.addLocalFolder('./dist', './dist');
zip.addLocalFolder('./_locales', './_locales');
zip.addLocalFolder('./themes', './themes');
zip.addLocalFile('manifest.json');
zip.addLocalFile('README.md');
zip.writeZip('OdooTerminal.zip');

console.log('Build successfully completed');
