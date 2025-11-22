// @flow strict
// Copyright  Alexandre Díaz <dev@redneboa.es>
// License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).

// $FlowIgnore
import JSZip from 'jszip';


export default async function(items: $ReadOnlyArray<[string, string | Blob, ?{string: mixed}]>, options: {string: mixed}): Promise<Blob> {
  const zip = new JSZip();
  for (const [filename, filedata, fileopts] of items) {
    zip.file(filename, filedata, fileopts);
  }
  return await zip.generateAsync(options);
}
