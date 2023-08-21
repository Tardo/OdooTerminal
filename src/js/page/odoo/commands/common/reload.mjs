// Copyright  Alexandre Díaz <dev@redneboa.es>
// License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).

async function cmdReloadPage() {
  location.reload();
}

export default {
  definition: 'Reload current page',
  callback: cmdReloadPage,
  detail: 'Reload current page.',
};
