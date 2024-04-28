// @flow strict
// Copyright  Alexandre Díaz <dev@redneboa.es>
// License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).

// $FlowIgnore
import i18n from 'i18next';

export default function (src: URL, type?: string): Promise<> {
  let res_type;
  if (typeof type === 'undefined') {
    const pathname = src.pathname.toLowerCase();
    if (pathname.endsWith('.mjs') || pathname.endsWith('.esm.js')) {
      res_type = 'mjs';
    } else if (pathname.endsWith('.js')) {
      res_type = 'js';
    } else if (pathname.endsWith('.css')) {
      res_type = 'css';
    }
  } else {
    res_type = type;
  }
  return new Promise((resolve, reject) => {
    if (res_type === 'js' || res_type === 'mjs') {
      const script = document.createElement('script');
      script.setAttribute('src', src.href);
      script.setAttribute('type', res_type === 'mjs' ? 'module' : 'application/javascript');
      script.addEventListener('load', resolve);
      script.addEventListener('error', reject);
      document.head?.appendChild(script);
    } else if (res_type === 'css') {
      const link = document.createElement('link');
      link.setAttribute('href', src.href);
      link.setAttribute('type', 'text/css');
      link.setAttribute('rel', 'stylesheet');
      link.addEventListener('load', resolve);
      link.addEventListener('error', reject);
      document.head?.appendChild(link);
    } else {
      reject(i18n.t('utilInjectResource.error.invalidType', 'Invalid resource type'));
    }
  });
}
