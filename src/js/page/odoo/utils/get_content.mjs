// @flow strict
// Copyright  Alexandre Díaz <dev@redneboa.es>
// License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).

import getOdooService from './get_odoo_service';
import save2file from '@terminal/utils/save2file';

export type GetContentOnErrorCallback = (error: {[string]: mixed}) => void;

function getFilenameFromContentDisposition(contentDisposition: string | null): string | null {
  if (typeof contentDisposition !== 'string') {
    return null;
  }
  try {
    const filenameRegex = /filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/i;
    const matches = contentDisposition.match(filenameRegex);
    if (!matches || matches.length < 1) {
        return null;
    }
    let filename = matches[1].replace(/['"]/g, '');
    // TODO: Support more charsets?
    if (filename.startsWith('UTF-8')) {
        const utf8Match = contentDisposition.match(/filename\*=UTF-8''(.+?)(?:;|$)/i);
        if (utf8Match && utf8Match[1]) {
            filename = decodeURIComponent(utf8Match[1]);
        }
    } else {
        filename = decodeURIComponent(filename);
    }

    return filename.trim() || null;
  } catch (error) {
    console.error('Error parsing Content-Disposition:', error);
  }
  return null;
}

export default async function (data_opts: {[string]: mixed}, onerror: GetContentOnErrorCallback): Promise<boolean | void> {
  const data = Object.assign({}, data_opts, {
    csrf_token: odoo.csrf_token,
    download: true,
    data: getOdooService('web.utils')?.is_bin_size(data_opts.data) ? null : data_opts.data,
  });
  const search_data = new URLSearchParams();
  for (const [key, value] of Object.entries(data)) {
    search_data.append(key, value);
  }

  try {
    const response = await fetch('/web/content', {
      method: 'POST',
      body: search_data,
    });
    const filename = getFilenameFromContentDisposition(response.headers.get('Content-Disposition'));
    const mime = response.headers.get("content-type") || 'text/plain';
    // $FlowFixMe
    return save2file(filename || 'unnamed', mime, await response.bytes());
  } catch (_err) {
    onerror(_err);
  }
}
