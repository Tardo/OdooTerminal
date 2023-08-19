// Copyright  Alexandre Díaz <dev@redneboa.es>
// License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).

export default function (values) {
  return (
    `<span style='color: gray;'>Create UID</span>: ${values.create_uid}<br>` +
    `<span style='color: gray;'>Create Date</span>: ${values.create_date}<br>` +
    `<span style='color: gray;'>Write UID</span>: ${values.write_uid}<br>` +
    `<span style='color: gray;'>Write Date</span>: ${values.write_date}<br>` +
    `<span style='color: gray;'>No Update</span>: ${values.noupdate}<br>` +
    `<span style='color: gray;'>XML-ID</span>: ${values.xmlid}`
  );
}
