// @flow strict
// Copyright  Alexandre Díaz <dev@redneboa.es>
// License MIT (https://opensource.org/license/mit).

import i18n from 'i18next';
import pickFile from './pick_file';

export default async function (): Promise<AIAttachment> {
  const {file} = await pickFile(
    i18n.t('file2attachment.aborted', 'Aborted by user. No file given...'),
    i18n.t('file2attachment.noFile', 'No file selected'),
  );
  return new Promise((resolve, reject) => {
    const name: string = file.name;
    const media_type: string = file.type || 'application/octet-stream';

    if (media_type.startsWith('text/')) {
      const reader = new FileReader();
      reader.onerror = reject;
      reader.onabort = reject;
      reader.onload = readerEvent => {
        // $FlowFixMe[prop-missing]
        const text: string = readerEvent.target.result;
        // $FlowFixMe[incompatible-call]
        resolve({name, media_type, data: btoa(unescape(encodeURIComponent(text)))});
      };
      reader.readAsText(file);
    } else {
      const reader = new FileReader();
      reader.onerror = reject;
      reader.onabort = reject;
      reader.onload = readerEvent => {
        // $FlowFixMe[prop-missing]
        const dataUrl: string = readerEvent.target.result;
        const commaIdx = dataUrl.indexOf(',');
        const data = commaIdx !== -1 ? dataUrl.slice(commaIdx + 1) : '';
        resolve({name, media_type, data});
      };
      reader.readAsDataURL(file);
    }
  });
}
