// @flow strict
// Copyright  Alexandre Díaz <dev@redneboa.es>
// License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).

export default function (): string {
  return `<div class='container-fluid' style='width:100%' id='terminal_assistant'>
    <div class='row'>
      <div class='col-sm-12 col-lg-12 col-12 p-0' style='padding:0' id='terminal_assistant_desc' tabindex='-1'></div>
    </div>
    <div class='row'>
      <div class='col-sm-12 col-lg-12 col-12 p-0' style='padding:0' id='terminal_assistant_args' tabindex='-1'></div>
    </div>
    <span class='px-2 text-white' id='terminal_assistant_args_info' tabindex='-1'></span>
  </div>`;
}
