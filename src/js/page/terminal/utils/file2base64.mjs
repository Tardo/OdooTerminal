// @flow strict
// Copyright  Alexandre Díaz <dev@redneboa.es>
// License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).

// $FlowIgnore
import i18n from 'i18next';
import debounce from './debounce';

export default function <T>(this: T): Promise<> {
  const input_elm = window.document.createElement('input');
  input_elm.type = 'file';
  document.body?.appendChild(input_elm);
  // $FlowFixMe
  const onBodyFocus = (reject: Function) => {
    if (!input_elm.value.length) {
      return reject(i18n.t('file2base64.aborted', 'Aborted by user. No file given...'));
    }
  };

  return new Promise((resolve, reject) => {
    window.addEventListener('focus', debounce(onBodyFocus.bind(this, reject), 200));
    input_elm.onchange = e => {
      const file = e.target.files[0];
      const reader = new FileReader();
      reader.readAsArrayBuffer(file);

      reader.onerror = reject;
      reader.onabort = reject;
      reader.onload = readerEvent => {
        // $FlowFixMe
        resolve(btoa(String.fromCharCode(...new Uint8Array(readerEvent.target.result))));
      };
    };
    input_elm.click();
  }).finally(() => {
    window.removeEventListener('focus', onBodyFocus);
    document.body?.removeChild(input_elm);
  });
}
