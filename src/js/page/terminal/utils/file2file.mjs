// @flow strict
// Copyright  Alexandre Díaz <dev@redneboa.es>
// License MIT (https://opensource.org/license/mit).

import i18n from 'i18next';
import pickFile from './pick_file';

export default async function (filename: ?string, options: ?{[string]: mixed}): Promise<File> {
  const {file, path} = await pickFile(i18n.t('file2file.aborted', 'Aborted by user. No file given...'));
  const soptions = {
    ...options,
    type: 'application/octet-stream',
  };
  const sfilename = (filename === undefined ? path : filename) ?? 'unnamed';
  // $FlowFixMe[incompatible-type]
  return new File([file], sfilename, soptions);
}
