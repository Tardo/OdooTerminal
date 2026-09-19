// @flow strict
// Copyright  Alexandre Díaz <dev@redneboa.es>
// License MIT (https://opensource.org/license/mit).\

declare var chrome: Browser;
declare var browser: Browser;

export const isFirefox: boolean = typeof chrome === 'undefined';
export const ubrowser: Browser = isFirefox ? browser : chrome;
