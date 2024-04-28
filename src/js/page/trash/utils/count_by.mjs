// @flow strict
// Copyright  Alexandre Díaz <dev@redneboa.es>
// License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).

export type CountByCallback = (item: mixed) => mixed;

export default function (data: string | $ReadOnlyArray<mixed>, func: CountByCallback): { [mixed]: number } {
  const counters: { [mixed]: number } = {};
  if (!data) {
    return counters;
  }
  const list = typeof data === 'string' ? data.split('') : data;
  list.forEach(item => {
    const cat = func(item);
    if (Object.hasOwn(counters, cat)) {
      ++counters[cat];
    } else {
      counters[cat] = 1;
    }
  });
  return counters;
}
