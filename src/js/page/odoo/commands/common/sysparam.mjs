// @flow strict
// Copyright Baptiste <swano@ik.me>
// License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).

// $FlowIgnore
import i18n from 'i18next';
import callModel from '@odoo/osv/call_model';
import cachedSearchRead from '@odoo/net_utils/cached_search_read';
import {ARG} from '@trash/constants';
import type {CMDCallbackArgs, CMDCallbackContext, CMDDef} from '@trash/interpreter';
import type Terminal from '@odoo/terminal';

type SystemParameter = {
  key: string,
  value: string,
};

async function cmdSysParam(this: Terminal, kwargs: CMDCallbackArgs, ctx: CMDCallbackContext) {
  const operation = kwargs.operation || 'get';

  // Operation: list - List all system parameters
  if (operation === 'list') {
    return callModel<Array<SystemParameter>>(
      'ir.config_parameter',
      'search_read',
      [[], ['key', 'value']],
      null,
      await this.getContext(),
    ).then(result => {
      if (result && result.length) {
        ctx.screen.print(i18n.t('cmdSysParam.result.listTitle', 'System Parameters:'));
        result.forEach(param => {
          ctx.screen.print(`${param.key}: ${param.value}`);
        });
      } else {
        ctx.screen.printError(i18n.t('cmdSysParam.error.listEmpty', "No system parameters found"));
      }
      return result;
    });
  }

  // Operation: get - Get a specific parameter value
  if (operation === 'get') {
    if (!kwargs.key) {
      ctx.screen.printError(i18n.t('cmdSysParam.error.missingKey', "Key parameter is required for get operation"));
      return false;
    }

    return callModel<SystemParameter>(
      'ir.config_parameter',
      'get_param',
      [kwargs.key],
      null,
      await this.getContext(),
    ).then(result => {
      if (result) {
        ctx.screen.print(result);
      } else {
        ctx.screen.printError(i18n.t('cmdSysParam.error.notFound', "Parameter not found"));
      }
      return result;
    });
  }

  // Operation: set - Set a parameter value
  if (operation === 'set') {
    if (!kwargs.key) {
      ctx.screen.printError(i18n.t('cmdSysParam.error.missingKey', "Key parameter is required for set operation"));
      return false;
    }

    if (!kwargs.value) {
      ctx.screen.printError(i18n.t('cmdSysParam.error.missingValue', "Value parameter is required for set operation"));
      return false;
    }

    return callModel<SystemParameter>(
      'ir.config_parameter',
      'set_param',
      [kwargs.key, kwargs.value],
      null,
      await this.getContext(),
    ).then(() => {
      // If the system have to create a new parameter the reply is going to be `false`
      // https://github.com/odoo/odoo/commit/d5debf686f752cbb417a3150eba48aaf10baaf1a
      ctx.screen.print(i18n.t('cmdSysParam.result.success', 'Parameter set successfully'));
      return true;
    }).catch(() => {
        ctx.screen.printError(i18n.t('cmdSysParam.error.noUpdate', "Failed to update the parameter"));
        return false;
    });
  }

  // If operation is not recognized
  ctx.screen.printError(i18n.t('cmdSysParam.error.invalidOperation', "Invalid operation. Use 'get', 'set', or 'list'"));
  return false;
}

async function getOptions(this: Terminal, arg_name: string) {
  if (arg_name === 'key') {
    return cachedSearchRead(
      'options_ir.config_parameter_keys',
      'ir.config_parameter',
      [],
      ['key'],
      await this.getContext(),
      undefined,
      {orderBy: 'key ASC'},
      item => item.key,
    );
  }
  return [];
}

export default function (): Partial<CMDDef> {
  return {
    definition: i18n.t('cmdSysParam.definition', 'Manage system parameters'),
    callback: cmdSysParam,
    options: getOptions,
    detail: i18n.t('cmdSysParam.detail', 'Get, set, or list parameters in ir.config_parameter model.'),
    args: [
      [ARG.String, ['o', 'operation'], true, i18n.t('cmdSysParam.args.operation', "Operation to perform."), 'get', ['get', 'set', 'list']],
      [ARG.String, ['k', 'key'], false, i18n.t('cmdSysParam.args.key', 'Parameter key (required for get/set operations)')],
      [ARG.String, ['v', 'value'], false, i18n.t('cmdSysParam.args.value', 'Parameter value (required for set operation)')],
    ],
    example: `-o get -k account_online_synchronization.proxy_mode\n-o set -k account_online_synchronization.proxy_mode -v sandbox\n-o list`,
  };
}
