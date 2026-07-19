// @flow strict
// Copyright  Alexandre Díaz <dev@redneboa.es>
// License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).

// Renders a raw in-memory field value (as returned by FormRecordAdapter#read) into a short
// human-readable string — shared by `inspect -e record` and the AI pet's guardian consult.
export default function formatFieldValue(raw: mixed): string {
  if (raw === null || raw === undefined) {
    return '';
  }
  if (Array.isArray(raw) && raw.length === 2) {
    // many2one: [id, display_name]
    return String(raw[1] ?? raw[0]);
  }
  if (typeof raw === 'object') {
    // Some field values (e.g. an OWL datapoint/reactive record with parent<->children back-
    // references) are genuinely circular — JSON.stringify throws on those ("cyclic object value"
    // in Firefox, "Converting circular structure to JSON" in Chrome). This is framework data we
    // don't control, so treat it as a trust boundary rather than assuming every object is plain.
    try {
      return JSON.stringify(raw);
    } catch (_e) {
      return '[unserializable value]';
    }
  }
  return String(raw);
}
