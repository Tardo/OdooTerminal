// Copyright  Alexandre Díaz <dev@redneboa.es>
// License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).

import i18n from 'i18next';
import callModel from '@odoo/osv/call_model';
import cachedSearchRead from '@odoo/utils/cached_search_read';
import {ARG} from '@trash/constants';

async function cmdCheckModelAccess(kwargs, screen) {
  return callModel(
    kwargs.model,
    'check_access_rights',
    [kwargs.operation, false],
    null,
    this.getContext(),
  ).then(result => {
    if (result) {
      screen.print(
        i18n.t(
          'cmdCam.result.haveAccessRights',
          "You have access rights for '{{operation}}' on {{model}}",
          {
            operation: kwargs.operation,
            model: kwargs.model,
          },
        ),
      );
    } else {
      screen.print(
        i18n.t(
          'cmdCam.result.notAccessRights',
          "You can't '{{operation}}' on {{model}}",
          {
            operation: kwargs.operation,
            model: kwargs.model,
          },
        ),
      );
    }
    return result;
  });
}

function getOptions(arg_name) {
  if (arg_name === 'model') {
    return cachedSearchRead(
      'options_ir.model_active',
      'ir.model',
      [],
      ['model'],
      this.getContext({active_test: true}),
      null,
      item => item.model,
    );
  }
  return Promise.resolve([]);
}

export default {
  definition: i18n.t('cmdCam.definition', 'Check model access'),
  callback: cmdCheckModelAccess,
  options: getOptions,
  detail: i18n.t(
    'cmdCam.detail',
    'Show access rights for the selected operation on the selected model',
  ),
  args: [
    [
      ARG.String,
      ['m', 'model'],
      true,
      i18n.t('cmdCam.args.model', 'The model technical name'),
    ],
    [
      ARG.String,
      ['o', 'operation'],
      true,
      i18n.t('cmdCam.args.operation', 'The operation to do'),
      undefined,
      ['create', 'read', 'write', 'unlink'],
    ],
  ],
  example: '-m res.partner -o read',
};
