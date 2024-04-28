// @flow strict
// Copyright  Alexandre Díaz <dev@redneboa.es>
// License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).
export type DebounceCallback = (ev: {...}) => void;
export type DebounceInnerCallback = (...args: Array<{...}>) => mixed;

export default function <T>(this: T, func: DebounceCallback, timeout: number = 300): DebounceInnerCallback {
  let timer = null;
  return (...args: Array<{...}>) => {
    clearTimeout(timer);
    timer = setTimeout(() => {
      func.apply(this, args);
    }, timeout);
  };
}
