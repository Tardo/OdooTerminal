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
`;
