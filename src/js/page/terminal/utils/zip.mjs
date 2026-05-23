// @flow strict
// Copyright  Alexandre Díaz <dev@redneboa.es>
// License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).

import { ZipWriter, BlobWriter, BlobReader, TextReader, Uint8ArrayReader, configure } from '@zip.js/zip.js';
configure({ useWebWorkers: false });

export default async function(
  items: $ReadOnlyArray<[string, string | Blob, ?{[string]: mixed}]>
): Promise<Blob> {

  const zipWriter = new ZipWriter(new BlobWriter("application/zip"));
  for (const [filename, content, fileOptions] of items) {
    if (fileOptions?.base64 === true && typeof content === "string") {
      delete fileOptions.base64;
      const binary = atob(content);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; ++i) {
        bytes[i] = binary.charCodeAt(i);
      }
      await zipWriter.add(filename, new Uint8ArrayReader(bytes), fileOptions);
    }
    else if (content instanceof Blob) {
      await zipWriter.add(filename, new BlobReader(content), fileOptions);
    } else {
      await zipWriter.add(filename, new TextReader(content), fileOptions);
    }
  }

  const blobURL = await zipWriter.close();
  return blobURL;
}
