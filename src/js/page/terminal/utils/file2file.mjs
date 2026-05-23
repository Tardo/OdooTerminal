// @flow strict
// Copyright  Alexandre Díaz <dev@redneboa.es>
// License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).

import i18n from 'i18next';
import debounce from './debounce';

export default function <T>(this: T, filename: ?string, options: ?{[string]: mixed}): Promise<File> {
  const soptions = {
    ...options,
    type: 'application/octet-stream',
  };
  const input_elm = window.document.createElement('input');
  input_elm.type = 'file';
  document.body?.appendChild(input_elm);
  const onBodyFocus = (reject: (msg: string) => void) => {
    if (!input_elm.value.length) {
      return reject(i18n.t('file2file.aborted', 'Aborted by user. No file given...'));
    }
  };

  // $FlowFixMe[incompatible-type]
  return new Promise((resolve, reject) => {
    window.addEventListener('focus', debounce(onBodyFocus.bind(this, reject), 200));
    input_elm.onchange = e => {
      const file = e.target.files[0];
      const reader = new FileReader();
      reader.readAsArrayBuffer(file);

      reader.onerror = reject;
      reader.onabort = reject;
      reader.onload = readerEvent => {
        // $FlowFixMe[prop-missing]
        // $FlowFixMe[incompatible-type]
        // $FlowFixMe[incompatible-type]
        // $FlowFixMe[incompatible-type]
        const blob = new Blob([readerEvent.target.result], soptions);
        const sfilename = (typeof filename === 'undefined' ? input_elm.value : filename) ?? 'unnamed';
        // $FlowFixMe[incompatible-type]
        return resolve(new File([blob], sfilename, soptions));
      };
    };
    input_elm.click();
  }).finally(() => {
    window.removeEventListener('focus', onBodyFocus);
    document.body?.removeChild(input_elm);
  });
}
