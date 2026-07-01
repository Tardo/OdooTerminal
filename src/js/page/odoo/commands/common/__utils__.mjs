// @flow strict
// Copyright  Alexandre Díaz <dev@redneboa.es>
// License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).

import searchRead from '@odoo/orm/search_read';
import cachedSearchRead from '@odoo/net_utils/cached_search_read';
import type Terminal from '@odoo/terminal';

export async function searchModules(
  this: Terminal,
  module_names: $ReadOnlyArray<string> | string,
): Promise<Array<OdooSearchResponse>> {
  let domain: Array<OdooDomainTuple> = [];
  if (typeof module_names === 'string') {
    domain = [['name', '=', module_names]];
  } else if (module_names?.length === 1) {
    domain = [['name', '=', module_names[0]]];
  } else {
    domain = [['name', 'in', module_names]];
  }
  return searchRead('ir.module.module', domain, ['name', 'display_name'], await this.getContext());
}

export async function getModelOptions(this: Terminal, arg_name: string): Promise<Array<string>> {
  if (arg_name === 'model') {
    return cachedSearchRead(
      'options_ir.model_active',
      'ir.model',
      [],
      ['model'],
      await this.getContext({active_test: true}),
      undefined,
      {orderBy: 'model ASC'},
      item => item.model,
    );
  }
  return [];
}
