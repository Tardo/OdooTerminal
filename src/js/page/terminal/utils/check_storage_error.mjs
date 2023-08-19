// Copyright  Alexandre Díaz <dev@redneboa.es>
// License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).

/**
 * Return a friendly error exception
 *
 * @param {Exception} err
 * @returns {Boolean}
 */
export default function (err) {
  if (err.name !== "QuotaExceededError") {
    return false;
  }
  return (
    "<span style='color:navajowhite'>" +
    "<strong>WARNING:</strong> Clear the " +
    "<b class='o_terminal_click o_terminal_cmd' " +
    "data-cmd='clear screen' style='color:orange;'>screen</b> " +
    "or/and " +
    "<b class='o_terminal_click o_terminal_cmd' " +
    "data-cmd='clear history' style='color:orange;'>" +
    "history</b> " +
    "to free storage space. Browser <u>Storage Quota Exceeded</u>" +
    " 😭 </strong><br>"
  );
}
