// @flow strict
// Copyright  Alexandre Díaz <dev@redneboa.es>
// License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).

// $FlowIgnore
import i18n from 'i18next';
import getOdooVersionInfo from '@odoo/utils/get_odoo_version_info';
import type {CMDCallbackArgs, CMDCallbackContext, CMDDef} from '@trash/interpreter';

async function cmdShowOdooVersion(kwargs: CMDCallbackArgs, ctx: CMDCallbackContext) {
  const version_info = getOdooVersionInfo();
  if (typeof version_info === 'undefined') {
    throw new Error(
      i18n.t('cmdVersion.error.notVersionInfo', 'Cannot find version information')
    );
  }

  ctx.screen.print(`${version_info.slice(0, 3).join('.')} (${version_info.slice(3).join(' ')})`);
  return version_info;
}

export default function (): Partial<CMDDef> {
  return {
    definition: i18n.t('cmdVersion.definition', 'Know Odoo version'),
    callback: cmdShowOdooVersion,
    detail: i18n.t('cmdVersion.detail', 'Shows Odoo version'),
  };
}
