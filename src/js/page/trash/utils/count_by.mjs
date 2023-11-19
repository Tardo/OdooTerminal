// Copyright  Alexandre Díaz <dev@redneboa.es>
// License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).

export default function (data, func) {
  const counters = {};
  if (!data) {
    return counters;
  }
  const list = data.constructor === String ? data.split('') : data;
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
