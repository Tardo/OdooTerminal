// @flow strict
// Copyright  Alexandre Díaz <dev@redneboa.es>
// License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).

import i18n from 'i18next';
import debounce from './debounce';

export default function (): Promise<AIAttachment> {
  const input_elm = window.document.createElement('input');
  input_elm.type = 'file';
  document.body?.appendChild(input_elm);
  // $FlowFixMe[unclear-type]
  const onBodyFocus = (reject: Function) => {
    if (!input_elm.value.length) {
      return reject(i18n.t('file2attachment.aborted', 'Aborted by user. No file given...'));
    }
  };

  // $FlowFixMe[incompatible-type]
  return new Promise((resolve, reject) => {
    window.addEventListener('focus', debounce(onBodyFocus.bind(null, reject), 200));
    input_elm.onchange = e => {
      // $FlowFixMe[prop-missing]
      const file = e.target.files[0];
      if (!file) {
        return reject(i18n.t('file2attachment.noFile', 'No file selected'));
      }
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
    };
    input_elm.click();
  }).finally(() => {
    window.removeEventListener('focus', onBodyFocus);
    document.body?.removeChild(input_elm);
  });
}
