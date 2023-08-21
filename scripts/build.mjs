// Copyright  Alexandre Díaz <dev@redneboa.es>
// License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).

import {execSync} from 'child_process';
import AdmZip from 'adm-zip';
import {rimraf} from 'rimraf';

function removeDist() {
  rimraf.sync('./dist');
}

function execRollup() {
  execSync('rollup -c');
}

function createZipArchive() {
  const zip = new AdmZip();
  const outputFile = 'OdooTerminal.zip';

  zip.addLocalFolder('./src/html', './src/html');
  zip.addLocalFolder('./src/img', './src/img');
  zip.addLocalFolder('./dist', './dist');
  zip.addLocalFile('manifest.json');
  zip.addLocalFile('README.md');
  zip.writeZip(outputFile);
}

removeDist();
execRollup();
createZipArchive();

console.log(`Build ${outputFile} successfully done`);
