// Copyright  Alexandre Díaz <dev@redneboa.es>
// License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).

export default function (option, index, selected_option_index) {
  return `<li class="nav-item"><a class="nav-link p-1 px-2 ${
    option.is_default ? 'text-info' : ''
  } ${option.is_required ? 'text-warning' : ''} ${
    index === selected_option_index ? 'bg-black active' : ''
  }" data-string="${option.string}" style="padding:0.25em" href="#">${
    option.name
  }</a></li>`;
}
