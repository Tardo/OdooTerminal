// Copyright  Alexandre Díaz <dev@redneboa.es>
// License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).

const BrowserObj = typeof chrome === 'undefined' ? browser : chrome;
import(BrowserObj.extension.getURL('dist/pub/content_script.mjs'));
