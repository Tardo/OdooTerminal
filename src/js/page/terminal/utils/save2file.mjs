// Copyright  Alexandre Díaz <dev@redneboa.es>
// License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).

export default function (filename, type, data) {
  const blob = new Blob([data], {type: type});
  const elem = window.document.createElement("a");
  const objURL = window.URL.createObjectURL(blob);
  elem.href = objURL;
  elem.download = filename;
  document.body.appendChild(elem);
  elem.click();
  document.body.removeChild(elem);
  URL.revokeObjectURL(objURL);
}
