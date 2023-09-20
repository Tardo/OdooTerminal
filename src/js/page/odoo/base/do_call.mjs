// Copyright  Alexandre Díaz <dev@redneboa.es>
// License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).

import doTrigger from './do_trigger';

export default function (service, method) {
  const args = Array.prototype.slice.call(arguments, 2);
  let result = null;
  doTrigger('call_service', {
    service: service,
    method: method,
    args: args,
    callback: function (r) {
      result = r;
    },
  });
  return result;
}
