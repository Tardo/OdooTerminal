// @flow strict
// Copyright  Alexandre Díaz <dev@redneboa.es>
// License MIT (https://opensource.org/license/mit).

import i18n from 'i18next';
import pickFile from './pick_file';

export default async function (): Promise<string> {
  const {file} = await pickFile(i18n.t('file2base64.aborted', 'Aborted by user. No file given...'));
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsBinaryString(file);

    reader.onerror = reject;
    reader.onabort = reject;
    reader.onload = readerEvent => {
      // $FlowFixMe[prop-missing]
      resolve(btoa(readerEvent.target.result));
    };
  });
}
