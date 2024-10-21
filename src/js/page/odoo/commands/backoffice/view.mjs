// @flow strict
// Copyright  Alexandre Díaz <dev@redneboa.es>
// License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).

// $FlowIgnore
import i18n from 'i18next';
import doAction from '@odoo/base/do_action';
import getParentAdapter from '@odoo/utils/get_parent_adapter';
import getOdooService from '@odoo/utils/get_odoo_service';
import getOdooVersion from '@odoo/utils/get_odoo_version';
import cachedSearchRead from '@odoo/net_utils/cached_search_read';
import {ARG} from '@trash/constants';
import type {CMDCallbackArgs, CMDDef} from '@trash/interpreter';
import type Terminal from '@terminal/terminal';

// $FlowFixMe
export type CMDViewOnSelectedCallback = (records: $ReadOnlyArray<Object>) => mixed;

function openSelectCreateDialog(
  model: string,
  title: string,
  domain: $ReadOnlyArray<OdooDomainTuple>,
  on_selected: CMDViewOnSelectedCallback,
) {
  const OdooVerMajor = getOdooVersion('major');
  if (typeof OdooVerMajor === 'number' && OdooVerMajor < 16) {
    const dialogs = getOdooService('web.view_dialogs');
    if (typeof dialogs === 'undefined') {
      throw new Error(
        i18n.t('cmdView.error.notViewDialogsService', 'Cannot find view dialog service')
      );
    }
    const dialog = new dialogs.SelectCreateDialog(getParentAdapter(), {
      res_model: model,
      title: title,
      domain: domain || '[]',
      disable_multiple_selection: true,
      on_selected: on_selected,
    });
    dialog.open();
    return dialog.opened();
  }

  const {Component} = owl;
  const select_create_dialog_obj = getOdooService('@web/views/view_dialogs/select_create_dialog');
  if (typeof select_create_dialog_obj !== 'undefined') {
    const {SelectCreateDialog} = select_create_dialog_obj;
    Component.env.services.dialog.add(SelectCreateDialog, {
      resModel: model,
      domain: domain,
      title: title,
      multiSelect: false,
      onSelected: on_selected,
    });
  }
}

async function cmdViewModelRecord(this: Terminal, kwargs: CMDCallbackArgs): Promise<mixed> {
  const context = this.getContext({
    form_view_ref: kwargs.ref || false,
  });
  if (kwargs.id) {
    await doAction({
      type: 'ir.actions.act_window',
      name: i18n.t('cmdView.result.viewRecord', 'View Record'),
      res_model: kwargs.model,
      res_id: kwargs.id,
      views: [[false, 'form']],
      target: 'current',
      context: context,
    });
    this.doHide();
    return;
  }
  return openSelectCreateDialog(kwargs.model, i18n.t('cmdView.result.selectRecord', 'Select a record'), [], records => {
    doAction({
      type: 'ir.actions.act_window',
      name: i18n.t('cmdView.result.viewRecord', 'View Record'),
      res_model: kwargs.model,
      res_id: records[0].id || records[0],
      views: [[false, 'form']],
      target: 'current',
      context: context,
    }).then(() => this.doHide());
  });
}

function getOptions(this: Terminal, arg_name: string) {
  if (arg_name === 'model') {
    return cachedSearchRead(
      'options_ir.model_active',
      'ir.model',
      [],
      ['model'],
      this.getContext({active_test: true}),
      undefined,
      {orderBy: 'model ASC'},
      item => item.model,
    );
  }
  return Promise.resolve([]);
}

export default function (): Partial<CMDDef> {
  return {
    definition: i18n.t('cmdView.definition', 'View model record/s'),
    callback: cmdViewModelRecord,
    options: getOptions,
    detail: i18n.t('cmdView.detail', 'Open model record in form view or records in list view.'),
    args: [
      [ARG.String, ['m', 'model'], true, i18n.t('cmdView.args.model', 'The model technical name')],
      [ARG.Number, ['i', 'id'], false, i18n.t('cmdView.args.id', 'The record id')],
      [ARG.String, ['r', 'ref'], false, i18n.t('cmdView.args.ref', 'The view reference name')],
    ],
    example: '-m res.partner -i 10 -r base.view_partner_simple_form',
  };
}
