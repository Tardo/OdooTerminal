// Copyright  Alexandre Díaz <dev@redneboa.es>
// License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).

export function pluck(obj, skey) {
  return Object.keys(obj).map((key) => obj[key][skey]);
}

export function difference(list_a, list_b) {
  return list_a.filter((x) => !list_b.includes(x));
}

export function countBy(list, func) {
  const counters = {};
  if (!list) {
    return counters;
  }
  if (list.constructor.name === "String") {
    list = list.split("");
  }
  list.forEach((item) => {
    const cat = func(item);
    if (Object.hasOwn(counters, cat)) {
      ++counters[cat];
    } else {
      counters[cat] = 1;
    }
  });
  return counters;
}
