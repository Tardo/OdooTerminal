// @flow strict
// Copyright  Alexandre Díaz <dev@redneboa.es>
// License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).\

declare var chrome: Browser;
declare var browser: Browser;

export const isFirefox: boolean = typeof chrome === 'undefined';
export const ubrowser: Browser = isFirefox ? browser : chrome;
