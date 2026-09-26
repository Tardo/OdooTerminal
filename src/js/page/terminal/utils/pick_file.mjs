// @flow strict
// Copyright  Alexandre Díaz <dev@redneboa.es>
// License MIT (https://opensource.org/license/mit).

export default function pickFile(aborted: string, noFile: string = aborted): Promise<{file: File, path: string}> {
  const input = document.createElement('input');
  input.type = 'file';
  input.hidden = true;
  document.body?.appendChild(input);
  let timer;
  let onFocus;
  return new Promise<{file: File, path: string}>((resolve, reject) => {
    const cancel = () => reject(aborted);
    // Older browsers lack the file input's cancel event; wait for change after focus returns.
    onFocus = () => {
      clearTimeout(timer);
      timer = setTimeout(() => {
        if (!input.files?.length) cancel();
      }, 200);
    };
    window.addEventListener('focus', onFocus);
    input.addEventListener('cancel', cancel);
    input.onchange = () => {
      const file = input.files?.[0];
      if (file) resolve({file, path: input.value});
      else reject(noFile);
    };
    input.click();
  }).finally(() => {
    clearTimeout(timer);
    window.removeEventListener('focus', onFocus);
    input.remove();
  });
}
