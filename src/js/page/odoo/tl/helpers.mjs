// @flow strict
// Copyright  Alexandre Díaz <dev@redneboa.es>
// License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).

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
