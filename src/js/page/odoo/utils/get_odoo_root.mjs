// @flow strict
// Copyright  Alexandre Díaz <dev@redneboa.es>
// License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).

// $FlowIgnore
import i18n from 'i18next';
import getOdooService from './get_odoo_service';

export default function (): OdooRoot {
  const root_obj = getOdooService('root.widget', 'web.web_client', '@web/legacy/js/env');
  if (typeof root_obj === 'undefined') {
    throw new Error(
      i18n.t('odoo.error.notRootService', 'Cannot find root service')
    );
  }

  let root;
  // This is necessary for master branch, public pages.
  if (!root_obj || root_obj.constructor === Promise) {
    root = odoo?.__WOWL_DEBUG__?.root;
  } else {
    root = root_obj;
  }

  if (typeof root === 'undefined') {
    throw new Error(
      i18n.t('odoo.error.notRoot', 'Cannot find root object')
    );
  }
  return root;
}
