// Copyright  Alexandre Díaz <dev@redneboa.es>
// License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).

import {ARG} from '@trash/constants';

async function cmdWebSocket(kwargs) {
  if (kwargs.operation === 'open') {
    if (!kwargs.endpoint) {
      throw new Error('Need an endpoint to connect');
    }
    const url = `ws${kwargs.no_tls ? '' : 's'}://${window.location.host}${
      kwargs.endpoint
    }`;
    const socket = new WebSocket(url);
    socket.onopen = () => {
      screen.print(`[${url}] Connection established`);
      socket.send('initialized');
    };
    socket.onmessage = ev => {
      screen.print(`[${url}] ${ev.data}`);
    };
    socket.onclose = ev => {
      if (ev.wasClean) {
        screen.print(
          `[${url}] Connection closed cleanly, code=${ev.code} reason=${ev.reason}`,
        );
      } else {
        screen.print(`[${url}] Connection died`);
      }
    };
    socket.onerror = () => {
      screen.eprint(`[${url}] ERROR!`);
    };
    return socket;
  } else if (kwargs.operation === 'send') {
    if (!kwargs.websocket || kwargs.websocket.constructor !== WebSocket) {
      throw new Error('Need a websocket to operate');
    }
    // { event_name: 'subscribe', data: { channels: allTabsChannels, last: this.lastNotificationId } }
    const payload = JSON.stringify(kwargs.data);
    screen.eprint(`Sending '${payload}'...`);
    kwargs.websocket.send(payload);
    return;
  } else if (kwargs.operation === 'close') {
    if (!kwargs.websocket || kwargs.websocket.constructor !== WebSocket) {
      throw new Error('Need a websocket to operate');
    }
    kwargs.websocket.close(kwargs.data);
    return;
  } else if (kwargs.operation === 'health') {
    kwargs.websocket.close(kwargs.data);
    return;
  }
  throw new Error('Invalid operation');
}

export default {
  definition: 'Open a web socket',
  callback: cmdWebSocket,
  detail: 'Open a web socket',
  args: [
    [
      ARG.String,
      ['o', 'operation'],
      true,
      'The operation',
      'open',
      ['open', 'close', 'send', 'health'],
    ],
    [ARG.String, ['e', 'endpoint'], false, 'The endpoint'],
    [ARG.Any, ['wo', 'websocket'], false, 'The websocket object'],
    [ARG.Any, ['d', 'data'], false, 'The data'],
    [ARG.Flag, ['no-tls', 'no-tls'], false, "Don't use TLS"],
  ],
  example: '-o open -e /websocket',
};
