// @flow strict

export default `
function arr_clone(arr) {
  $res = []
  for ($i = 0; $i < $arr['length']; $i = $i + 1) {
    $res[$i] = $arr[$i]
  }
  return $res
}

function arr_append(arr, item) {
  $arr[$arr['length']] = $item
}

function arr_prepend(arr, item) {
  for ($i = $arr['length']; $i >= 1; $i = $i - 1) {
    $arr[$i] = $arr[$i - 1]
  }
  $arr[0] = $item
}

function arr_reduce(arr, initial, reducer) {
  $res = $initial
  for ($i = 0; $i < $arr['length']; $i = $i + 1) {
    $res = ($$reducer $res $arr[$i])
  }
  return $res
}

function arr_map(arr, mapper) {
  $res = []
  for ($i = 0; $i < $arr['length']; $i = $i + 1) {
    arr_append $res ($$mapper $arr[$i])
  }
  return $res
}

function arr_filter(arr, filter) {
  $res = []
  for ($i = 0; $i < $arr['length']; $i = $i + 1) {
    if (($$filter $arr[$i])) {
      arr_append $res $arr[$i]
    }
  }
  return $res
}
`;
