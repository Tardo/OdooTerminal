// @flow strict
// Copyright  Alexandre Díaz <dev@redneboa.es>
// License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).\

// $FlowFixMe
declare var chrome: Object;
// $FlowFixMe
declare var browser: Object;

export const isFirefox: boolean = typeof chrome === 'undefined';

// $FlowFixMe
export const ubrowser: Object = isFirefox ? browser : chrome;
