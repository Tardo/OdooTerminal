// @flow strict
// Copyright  Alexandre Díaz <dev@redneboa.es>
// License MIT (https://opensource.org/license/mit).

// See https://en.wikipedia.org/wiki/List_of_Unicode_characters
export default function (text: string): string {
  return text?.replaceAll(/[\u00A0-\u9999\u003C-\u003E\u0022-\u002F]/gim, i => `&#${i.charCodeAt(0)};`);
}
