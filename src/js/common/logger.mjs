// Copyright  Alexandre Díaz <dev@redneboa.es>
// License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).

function get_line_log_head(section) {
  return `[OdooTerminal][${section}]`;
}

export default {
  info: (section, ...values) => {
    console.info(get_line_log_head(section), ...values);
  },
  warn: (section, ...values) => {
    console.warn(get_line_log_head(section), ...values);
  },
  error: (section, ...values) => {
    console.error(get_line_log_head(section), ...values);
  },
};
