// Copyright  Alexandre Díaz <dev@redneboa.es>
// License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).

async function cmdQuit() {
  this.doHide();
}

export default {
  definition: "Close terminal",
  callback: cmdQuit,
  detail: "Close the terminal.",
};
