// Copyright  Alexandre Díaz <dev@redneboa.es>
// License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).

function cmdQuit() {
  this.doHide();
  return Promise.resolve();
}

export default {
  definition: "Close terminal",
  callback: cmdQuit,
  detail: "Close the terminal.",
};
