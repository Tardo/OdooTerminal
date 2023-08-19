// Copyright  Alexandre Díaz <dev@redneboa.es>
// License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).

export default function (values) {
  return (
    "<div>" +
    `<h4>${values.error_name}</h4>` +
    `<span>${values.error_message}</span>` +
    "<ul>" +
    "<li name='exception_type'>" +
    `<a class='btn btn-sm btn-secondary' data-bs-toggle='collapse' data-toggle='collapse' href='#collapseExceptionType${values.error_id}' role='button' aria-expanded='false' aria-controls='collapseExceptionType${values.error_id}'>` +
    "Exception Type" +
    "</a>" +
    `<div class='collapse' id='collapseExceptionType${values.error_id}'>` +
    `<div class='card card-body'>${values.exception_type}</div>` +
    "</div>" +
    "</li>" +
    "<li name='context'>" +
    `<a class='btn btn-sm btn-secondary' data-bs-toggle='collapse' data-toggle='collapse' href='#collapseContext${values.error_id}' role='button' aria-expanded='false' aria-controls='collapseContext${values.error_id}'>` +
    "Context" +
    "</a>" +
    `<div class='collapse' id='collapseContext${values.error_id}'>` +
    `<div class='card card-body'>${values.context}</div>` +
    "</div>" +
    "</li>" +
    "<li name='args'>" +
    `<a class='btn btn-sm btn-secondary' data-bs-toggle='collapse' data-toggle='collapse' href='#collapseArguments${values.error_id}' role='button' aria-expanded='false' aria-controls='collapseArguments${values.error_id}'>` +
    "Arguments" +
    "</a>" +
    `<div class='collapse' id='collapseArguments${values.error_id}'>` +
    `<div class='card card-body'>${values.args}</div>` +
    "</div>" +
    "</li>" +
    "<li name='debug'>" +
    `<a class='btn btn-sm btn-secondary' data-bs-toggle='collapse' data-toggle='collapse' href='#collapseDebug${values.error_id}' role='button' aria-expanded='false' aria-controls='collapseDebug${values.error_id}'>` +
    "Debug" +
    "</a>" +
    `<div class='collapse' id='collapseDebug${values.error_id}'>` +
    `<div class='card card-body'>${values.debug}</div>` +
    "</div>" +
    "</li>" +
    "</ul>" +
    "</div>"
  );
}
