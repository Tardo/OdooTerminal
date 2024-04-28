// @flow strict
// Copyright  Alexandre Díaz <dev@redneboa.es>
// License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).

// FIXME: This is an anti-pattern. Use only if you know what you are doing.
// $FlowFixMe
export default function (): Object {
  // $FlowFixMe
  const deferred: Object = {};
  deferred.promise = new Promise((resolve, reject) => {
    deferred.resolve = resolve;
    deferred.reject = reject;
  });
  return deferred;
}
