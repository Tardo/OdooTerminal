// Copyright  Alexandre Díaz <dev@redneboa.es>
// License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).

import debounce from './debounce';

export default function (filename, options) {
  const soptions = Object.assign({}, options, {
    type: 'application/octet-stream',
  });
  const input_elm = window.document.createElement('input');
  input_elm.type = 'file';
  document.body.appendChild(input_elm);
  const onBodyFocus = reject => {
    if (!input_elm.value.length) {
      return reject('Aborted by user. No file given...');
    }
  };

  return new Promise((resolve, reject) => {
    window.addEventListener(
      'focus',
      debounce(onBodyFocus.bind(this, reject), 200),
    );
    input_elm.onchange = e => {
      const file = e.target.files[0];
      const reader = new FileReader();
      reader.readAsArrayBuffer(file);

      reader.onerror = reject;
      reader.onabort = reject;
      reader.onload = readerEvent => {
        const blob = new Blob([readerEvent.target.result], soptions);
        const sfilename = filename ? filename : input_elm.value;
        return resolve(new File([blob], sfilename, soptions));
      };
    };
    input_elm.click();
  }).finally(() => {
    window.removeEventListener('focus', onBodyFocus);
    document.body.removeChild(input_elm);
  });
}
