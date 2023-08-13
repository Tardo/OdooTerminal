// Copyright  Alexandre Díaz <dev@redneboa.es>
// License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).

function cmdReloadPage() {
  location.reload();
  return Promise.resolve();
}

export default {
  definition: "Reload current page",
  callback: cmdReloadPage,
  detail: "Reload current page.",
};
