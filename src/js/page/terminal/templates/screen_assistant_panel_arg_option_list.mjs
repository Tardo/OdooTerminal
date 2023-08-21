// Copyright  Alexandre Díaz <dev@redneboa.es>
// License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).

export default function (option_html_items) {
  return `<ul class="nav nav-pills">${option_html_items.join('')}</ul>`;
}
