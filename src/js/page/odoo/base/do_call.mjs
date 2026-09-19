// @flow strict
// Copyright  Alexandre Díaz <dev@redneboa.es>
// License MIT (https://opensource.org/license/mit).

import doTrigger from './do_trigger';

export default function <T>(service: string, method: string): ?T {
  const args = Array.from(arguments).slice(2);
  let result: T;
  doTrigger('call_service', {
    service: service,
    method: method,
    args: args,
    callback: function (r: T) {
      result = r;
    },
  });
  return result;
}
