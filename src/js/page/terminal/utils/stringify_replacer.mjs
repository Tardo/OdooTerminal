// @flow strict
// Copyright  Alexandre Díaz <dev@redneboa.es>
// License MIT (https://opensource.org/license/mit).

export default function replacer(key: string, value: mixed): mixed {
  if (typeof HTMLCanvasElement !== 'undefined' && value instanceof HTMLCanvasElement) {
    return {type: 'HTMLCanvasElement', id: value.id, width: value.width, height: value.height};
  }
  // FIXME: Odoo 18.0 has a limited access in Record objects.
  // This check should be moved to the Odoo “zone” and check the
  // 'Record' type.
  if (value !== null && typeof value === 'object' && Object.hasOwn(value, '_proxy')) {
    return '##!ProxyObject!##';
  }

  return value;
}
