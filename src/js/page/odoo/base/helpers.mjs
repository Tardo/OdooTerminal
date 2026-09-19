// @flow strict
// Copyright  Alexandre Díaz <dev@redneboa.es>
// License MIT (https://opensource.org/license/mit).

export default `
$RMOD = function () {
  return (info --active-model)
}
$RID = function () {
  return (info --active-id)
}
$UID = function () {
  return (info --user-id)
}
$UNAME = function () {
  return (info --user-login)
}
`;
