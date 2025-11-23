// Copyright  Alexandre Díaz <dev@redneboa.es>
// License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).

import {execSync} from 'child_process';
import AdmZip from 'adm-zip';
import {rimraf} from 'rimraf';


// Remove 'dist' folder
rimraf.sync('./dist');
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
zip.writeZip("OdooTerminal.zip");

console.log("Build successfully completed");
