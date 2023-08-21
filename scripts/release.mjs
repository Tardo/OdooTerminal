// Copyright  Alexandre Díaz <dev@redneboa.es>
// License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).

import fs from 'fs';
import {simpleGit} from 'simple-git';
import minimist from 'minimist';

function getCurrentVersion() {
  const data = fs.readFileSync('./manifest.json', 'utf-8');
  const groups = data.match(/"version": "(\d+\.\d+\.\d+)"/);
  if (groups && groups.length > 1) {
    return groups[1].split('.').map(item => Number(item));
  }
  return [0, 0, 0];
}

function replaceFileVersion(filepath, cregex, nvalue) {
  let data = fs.readFileSync(filepath, 'utf-8');
  data = data.replace(cregex, nvalue);
  fs.writeFileSync(filepath, data, 'utf-8');
}

function update_version(mode) {
  const extension_ver = getCurrentVersion();
  if (mode === 'major') {
    extension_ver[0] = extension_ver[0] + 1;
    extension_ver[1] = 0;
    extension_ver[2] = 0;
  } else if (mode === 'minor') {
    extension_ver[1] = extension_ver[1] + 1;
    extension_ver[2] = 0;
  } else {
    extension_ver[2] = extension_ver[2] + 1;
  }
  extension_ver = extension_ver.join('.');

  // manifest.json
  replaceFileVersion(
    './manifest.json',
    /"version": "\d+\.\d+\.\d+"/,
    `"version": "${extension_ver}"`,
  );
  // abstract_terminal.js
  replaceFileVersion(
    './src/js/page/terminal/terminal.mjs',
    /VERSION\s?=\s?"\d+\.\d+\.\d+"/,
    `VERSION = "${extension_ver}"`,
  );
  // pyproject.toml
  replaceFileVersion(
    './pyproject.toml',
    /version = "\d+\.\d+\.\d+"/,
    `version = "${extension_ver}"`,
  );

  return extension_ver;
}

async function gitPush(extension_ver) {
  const git = simpleGit();

  await git.add('.');
  await git.commit(`[REL] Version ${extension_ver}`);
  await git.push('origin', 'master');
  await git.addAnnotatedTag(
    `v${extension_ver}`,
    `Automatic tag '${extension_ver}'`,
  );
  await git.pushTags('origin');
}

const argv = minimist(process.argv.slice(2));

const valid_modes = ['major', 'minor', 'patch'];
if (!argv.mode || !valid_modes.includes(argv.mode)) {
  console.error('Invalid mode. Valid modes are: major, minor, patch');
  process.exit(1);
}

const nver = update_version(argv.mode);
if (argv.git) {
  await gitPush(nver);
}

console.log(`Release '${nver}' successfully done`);
