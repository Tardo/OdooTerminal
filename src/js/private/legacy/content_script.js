// Copyright  Alexandre Díaz <dev@redneboa.es>
// License MIT (https://opensource.org/license/mit).

const BrowserObj = typeof chrome === 'undefined' ? browser : chrome;
import(BrowserObj.runtime.getURL('dist/pub/content_script.mjs'));
