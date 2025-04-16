// @flow strict
// Copyright  Alexandre Díaz <dev@redneboa.es>
// License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).

// $FlowIgnore
import i18n from 'i18next';
import {ARG} from '@trash/constants';
import type {CMDCallbackArgs, CMDCallbackContext, CMDDef} from '@trash/interpreter';
import type Terminal from '@odoo/terminal';

async function cmdLongpolling(this: Terminal, kwargs: CMDCallbackArgs, ctx: CMDCallbackContext) {
  if (!this.longpolling) {
    throw new Error(
      i18n.t('cmdLongpolling.error.notAvailable', "Can't use longpolling, 'bus' module is not installed"),
    );
  }

  if (typeof kwargs.operation === 'undefined') {
    ctx.screen.print(this.longpolling.isVerbose() || 'off');
  } else if (kwargs.operation === 'verbose') {
    this.longpolling.setVerbose(true);
    ctx.screen.print(i18n.t('cmdLongpolling.result.verboseEnabled', 'Now long-polling is in verbose mode'));
  } else if (kwargs.operation === 'off') {
    this.longpolling.setVerbose(false);
    ctx.screen.print(i18n.t('cmdLongpolling.result.verboseDisabled', 'Now long-polling verbose mode is disabled'));
  } else if (kwargs.operation === 'add_channel' || kwargs.operation === 'del_channel') {
    const channel_name = kwargs.param;
    if (typeof channel_name === 'undefined') {
      ctx.screen.printError(i18n.t('cmdLongpolling.error.invalidChannel', 'Invalid channel name'));
    } else {
      if (kwargs.operation === 'add_channel') {
        this.longpolling.addChannel(channel_name);
        ctx.screen.print(i18n.t('cmdLongpolling.result.join', "Joined the '{{channel_name}}' channel", {channel_name}));
      } else if (kwargs.operation === 'del_channel') {
        this.longpolling.deleteChannel(channel_name);
        ctx.screen.print(i18n.t('cmdLongpolling.result.leave', "Leave the '{{channel_name}}' channel", {channel_name}));
      }
    }
  } else if (kwargs.operation === 'start') {
    this.longpolling.startPoll();
    ctx.screen.print(i18n.t('cmdLongpolling.result.start', 'Longpolling started'));
  } else if (kwargs.operation === 'stop') {
    this.longpolling.stopPoll();
    ctx.screen.print(i18n.t('cmdLongpolling.result.stop', 'Longpolling stopped'));
  } else if (kwargs.operation === 'subscribe' || kwargs.operation === 'unsubscribe') {
    const subs_name = kwargs.param;
    if (typeof subs_name === 'undefined') {
      ctx.screen.printError(i18n.t('cmdLongpolling.error.invalidSubscription', 'Invalid subscription name'));
    }
    if (kwargs.operation === 'subscribe') {
      // $FlowIgnore
      this.longpolling.subscribe(subs_name);
      ctx.screen.print(i18n.t('cmdLongpolling.result.subscribe', "Subscribed to '{{subscription}}'"), {subscription: subs_name});
    } else {
      // $FlowIgnore
      this.longpolling.unsubscribe(subs_name);
      ctx.screen.print(i18n.t('cmdLongpolling.result.unsubscribe', "Unsubscribed from '{{subscription}}'"), {subscription: subs_name});
    }
  }
}

export default function (): Partial<CMDDef> {
  return {
    definition: i18n.t('cmdLongpolling.definition', 'Long-Polling operations'),
    callback: cmdLongpolling,
    detail: i18n.t('cmdLongpolling.detail', 'Operations over long-polling.'),
    args: [
      [
        ARG.String,
        ['o', 'operation'],
        false,
        i18n.t(
          'cmdLongpolling.args.operation',
          'The operation to do<br>- verbose > Print incoming notificacions<br>- off > Stop verbose mode<br>- add_channel > Add a channel to listen<br>- del_channel > Delete a listening channel<br>- start > Start client longpolling service<br> - stop > Stop client longpolling service',
        ),
        undefined,
        ['verbose', 'off', 'add_channel', 'del_channel', 'start', 'stop', 'subscribe', 'unsubcribe'],
      ],
      [ARG.String, ['p', 'param'], false, i18n.t('cmdLongpolling.args.param', 'The parameter')],
    ],
    example: '-o add_channel -p example_channel',
  };
}
