// @flow strict
// Copyright  Alexandre Díaz <dev@redneboa.es>
// License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).

// FIXME: This is an anti-pattern. Use only if you know what you are doing.
export default function (): Deferred {
  let resolve_fn, reject_fn;
  const promise = new Promise((resolve, reject) => {
    resolve_fn = resolve;
    reject_fn = reject;
  });
  return {
    promise,
    resolve: resolve_fn,
    reject: reject_fn,
  };
}
