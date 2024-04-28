// @flow strict
// Copyright  Alexandre Díaz <dev@redneboa.es>
// License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).

// $FlowIgnore
import i18n from 'i18next';
import {ARG} from '@trash/constants';
import type {CMDCallbackArgs, CMDCallbackContext, CMDDef} from '@trash/interpreter';

async function cmdWebSocket(kwargs: CMDCallbackArgs, ctx: CMDCallbackContext) {
  if (kwargs.operation === 'open') {
    if (!kwargs.endpoint) {
      throw new Error(i18n.t('cmdWs.error.noEndpoint', 'Need an endpoint to connect'));
    }
    const url = `ws${kwargs.no_tls ? '' : 's'}://${window.location.host}${kwargs.endpoint}`;
    const socket = new WebSocket(url);
    socket.onopen = () => {
      ctx.screen.print(i18n.t('cmdWs.result.connectionEstablished', '[{{url}}] Connection established', {url}));
      socket.send('initialized');
    };
    socket.onmessage = ev => {
      ctx.screen.print(`[${url}] ${new String(ev.data).toString()}`);
    };
    socket.onclose = ev => {
      if (ev.wasClean) {
        ctx.screen.print(
          i18n.t(
            'cmdWs.result.connectionClosed',
            '[{{url}}] Connection closed cleanly, code={{code}} reason={{reason}}',
            {
              url,
              code: ev.code,
              reason: ev.reason,
            },
          ),
        );
      } else {
        ctx.screen.print(
          i18n.t('cmdWs.result.connectionDied', '[{{url}}] Connection died', {
            url,
          }),
        );
      }
    };
    socket.onerror = () => {
      ctx.screen.eprint(i18n.t('cmdWs.result.connectionError', '[{{url}}] ERROR!', {url}));
    };
    return socket;
  } else if (kwargs.operation === 'send') {
    if (!kwargs.websocket || kwargs.websocket.constructor !== WebSocket) {
      throw new Error(i18n.t('cmdWs.result.connectionError', 'Need a websocket to operate'));
    }
    // { event_name: 'subscribe', data: { channels: allTabsChannels, last: this.lastNotificationId } }
    const payload = JSON.stringify(kwargs.data);
    ctx.screen.eprint(`Sending '${payload}'...`);
    kwargs.websocket.send(payload);
    return;
  } else if (kwargs.operation === 'close') {
    if (!kwargs.websocket || kwargs.websocket.constructor !== WebSocket) {
      throw new Error(i18n.t('cmdWs.error.noWebsocket', 'Need a websocket to operate'));
    }
    kwargs.websocket.close(kwargs.data);
    return;
  } else if (kwargs.operation === 'health') {
    kwargs.websocket.close(kwargs.data);
    return;
  }
  throw new Error(i18n.t('cmdWs.error.invalidOperation', 'Invalid operation'));
}

export default function (): Partial<CMDDef> {
  return {
    definition: i18n.t('cmdWs.definition', 'Open a web socket'),
    callback: cmdWebSocket,
    detail: i18n.t('cmdWs.detail', 'Open a web socket'),
    args: [
      [
        ARG.String,
        ['o', 'operation'],
        true,
        i18n.t('cmdWs.args.operation', 'The operation'),
        'open',
        ['open', 'close', 'send', 'health'],
      ],
      [ARG.String, ['e', 'endpoint'], false, i18n.t('cmdWs.args.endpoint', 'The endpoint')],
      [ARG.Any, ['wo', 'websocket'], false, i18n.t('cmdWs.args.websocket', 'The websocket object')],
      [ARG.Any, ['d', 'data'], false, i18n.t('cmdWs.args.data', 'The data')],
      [ARG.Flag, ['no-tls', 'no-tls'], false, i18n.t('cmdWs.args.noTls', "Don't use TLS")],
    ],
    example: '-o open -e /websocket',
  };
}
