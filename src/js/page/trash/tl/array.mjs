// @flow strict

export default `
function arr_clone(arr: List | Any) {
  $res = []
  for ($i = 0; $i < $arr['length']; $i = $i + 1) {
    $res[$i] = $arr[$i]
  }
  return $res
}

function arr_append(arr: List | Any, item) {
  $arr[$arr['length']] = $item
}

function arr_prepend(arr: List | Any, item) {
  for ($i = $arr['length']; $i >= 1; $i = $i - 1) {
    $arr[$i] = $arr[$i - 1]
  }
  $arr[0] = $item
}

function arr_reduce(arr: List | Any, initial, reducer) {
  $res = $initial
  for ($i = 0; $i < $arr['length']; $i = $i + 1) {
    $res = ($$reducer $res $arr[$i])
  }
  return $res
}

function arr_map(arr: List | Any, mapper) {
  $res = []
  for ($i = 0; $i < $arr['length']; $i = $i + 1) {
    arr_append $res ($$mapper $arr[$i])
  }
  return $res
}

function arr_filter(arr: List | Any, filter) {
  $res = []
  for ($i = 0; $i < $arr['length']; $i = $i + 1) {
    if (($$filter $arr[$i])) {
      arr_append $res $arr[$i]
    }
  }
  return $res
}
`;
