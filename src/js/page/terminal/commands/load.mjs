// Copyright  Alexandre Díaz <dev@redneboa.es>
// License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).

import {ARG} from '@trash/constants';

async function cmdLoadResource(kwargs) {
  const inURL = new URL(kwargs.url);
  const pathname = inURL.pathname.toLowerCase();
  if (pathname.endsWith('.js')) {
    return new Promise((resolve, reject) => {
      $.getScript(inURL.href).done(resolve).fail(reject);
    });
  } else if (pathname.endsWith('.css')) {
    $('<link>').appendTo('head').attr({
      type: 'text/css',
      rel: 'stylesheet',
      href: inURL.href,
    });
  } else {
    throw new Error('Invalid file type');
  }
}

export default {
  definition: 'Load external resource',
  callback: cmdLoadResource,
  detail: 'Load external source (javascript & css)',
  args: [[ARG.String, ['u', 'url'], true, 'The URL of the asset']],
  example: "-u 'https://example.com/libs/term_extra.js'",
};
