// @flow strict
// Copyright  Alexandre Díaz <dev@redneboa.es>
// License MIT (https://opensource.org/license/mit).

export default function (option_html_items: Array<string>): string {
  return `<ul class="nav nav-pills text-white">${option_html_items.join('')}</ul>`;
}
