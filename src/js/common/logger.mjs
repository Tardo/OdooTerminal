// @flow strict
// Copyright  Alexandre Díaz <dev@redneboa.es>
// License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).

function get_line_log_head(section: string) {
  return `[OdooTerminal][${section}]`;
}

export default {
  info: (section: string, ...values: Array<mixed>) => {
    console.info(get_line_log_head(section), ...values);
  },
  warn: (section: string, ...values: Array<mixed>) => {
    console.warn(get_line_log_head(section), ...values);
  },
  error: (section: string, ...values: Array<mixed>) => {
    console.error(get_line_log_head(section), ...values);
  },
};
