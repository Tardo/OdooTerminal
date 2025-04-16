// @flow strict
// Copyright  Alexandre Díaz <dev@redneboa.es>
// License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).

export default function replacer(key: string, value: mixed): mixed {
  let svalue = value;
  if (value instanceof Array) {
    for (const i in value) {
      // $FlowFixMe
      svalue[i] = replacer(key, value[i]);
    }
  }

  // FIXME: Odoo 18.0 has a limited access in Record objects.
  // This check should be moved to the Odoo “zone” and check the
  // 'Record' type.
  if (value !== null && typeof value === 'object' && Object.hasOwn(value, '_proxy')) {
    svalue = "##!ProxyObject!##";
  }

  return svalue;
}
