// Copyright  Alexandre Díaz <dev@redneboa.es>
// License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).

// See https://en.wikipedia.org/wiki/List_of_Unicode_characters
export default function (text) {
  return text?.replaceAll(
    /[\u00A0-\u9999\u003C-\u003E\u0022-\u002F]/gim,
    (i) => `&#${i.charCodeAt(0)};`
  );
}
