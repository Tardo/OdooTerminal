// @flow strict
// Copyright  Alexandre Díaz <dev@redneboa.es>
// License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).

export default function (
  error_name: string,
  error_message: string,
  error_id: number,
  exception_type: string,
  context: string,
  args: string,
  debug: string,
): string {
  // const container = document.createElement('div');
  // const name_elm = document.createElement('h4');
  // name_elm.textContent = error_name;
  // container.append(name_elm);
  // const msg_elm = document.createElement('span');
  // msg_elm.textContent = error_message;
  // container.append(msg_elm);

  // const list_elm = document.createElement('ul');

  return (
    '<div>' +
    `<h4>${error_name}</h4>` +
    `<span>${error_message}</span>` +

    '<ul>' +
    "<li name='exception_type'>" +
    `<a class='btn btn-sm terminal-btn-secondary' data-bs-toggle='collapse' data-toggle='collapse' href='#collapseExceptionType${error_id}' role='button' aria-expanded='false' aria-controls='collapseExceptionType${error_id}'>` +
    'Exception Type' +
    '</a>' +
    `<div class='collapse' id='collapseExceptionType${error_id}'>` +
    `<div class='card card-body'>${exception_type}</div>` +
    '</div>' +
    '</li>' +
    "<li name='context'>" +
    `<a class='btn btn-sm terminal-btn-secondary' data-bs-toggle='collapse' data-toggle='collapse' href='#collapseContext${error_id}' role='button' aria-expanded='false' aria-controls='collapseContext${error_id}'>` +
    'Context' +
    '</a>' +
    `<div class='collapse' id='collapseContext${error_id}'>` +
    `<div class='card card-body'>${context}</div>` +
    '</div>' +
    '</li>' +
    "<li name='args'>" +
    `<a class='btn btn-sm terminal-btn-secondary' data-bs-toggle='collapse' data-toggle='collapse' href='#collapseArguments${error_id}' role='button' aria-expanded='false' aria-controls='collapseArguments${error_id}'>` +
    'Arguments' +
    '</a>' +
    `<div class='collapse' id='collapseArguments${error_id}'>` +
    `<div class='card card-body'>${args}</div>` +
    '</div>' +
    '</li>' +
    "<li name='debug'>" +
    `<a class='btn btn-sm terminal-btn-secondary' data-bs-toggle='collapse' data-toggle='collapse' href='#collapseDebug${error_id}' role='button' aria-expanded='false' aria-controls='collapseDebug${error_id}'>` +
    'Debug' +
    '</a>' +
    `<div class='collapse' id='collapseDebug${error_id}'>` +
    `<div class='card card-body'>${debug}</div>` +
    '</div>' +
    '</li>' +
    '</ul>' +
    '</div>'
  );
}
