// Copyright  Alexandre Díaz <dev@redneboa.es>
// License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).

import {ARG} from "@trash/constants";

function cmdWebSocket(kwargs) {
  if (kwargs.operation === "open") {
    if (!kwargs.endpoint) {
      return Promise.reject("Need an endpoint to connect");
    }
    const url = `ws${kwargs.no_tls ? "" : "s"}://${window.location.host}${
      kwargs.endpoint
    }`;
    const socket = new WebSocket(url);
    socket.onopen = () => {
      this.screen.print(`[${url}] Connection established`);
      socket.send("initialized");
    };
    socket.onmessage = (ev) => {
      this.screen.print(`[${url}] ${ev.data}`);
    };
    socket.onclose = (ev) => {
      if (ev.wasClean) {
        this.screen.print(
          `[${url}] Connection closed cleanly, code=${ev.code} reason=${ev.reason}`
        );
      } else {
        this.screen.print(`[${url}] Connection died`);
      }
    };
    socket.onerror = () => {
      this.screen.eprint(`[${url}] ERROR!`);
    };
    return Promise.resolve(socket);
  } else if (kwargs.operation === "send") {
    if (!kwargs.websocket || kwargs.websocket.constructor !== WebSocket) {
      return Promise.reject("Need a websocket to operate");
    }
    // { event_name: 'subscribe', data: { channels: allTabsChannels, last: this.lastNotificationId } }
    const payload = JSON.stringify(kwargs.data);
    this.screen.eprint(`Sending '${payload}'...`);
    kwargs.websocket.send(payload);
    return Promise.resolve();
  } else if (kwargs.operation === "close") {
    if (!kwargs.websocket || kwargs.websocket.constructor !== WebSocket) {
      return Promise.reject("Need a websocket to operate");
    }
    kwargs.websocket.close(kwargs.data);
    return Promise.resolve();
  } else if (kwargs.operation === "health") {
    kwargs.websocket.close(kwargs.data);
    return Promise.resolve();
  }
  return Promise.reject("Invalid operation");
}

export default {
  definition: "Open a web socket",
  callback: cmdWebSocket,
  detail: "Open a web socket",
  args: [
    [
      ARG.String,
      ["o", "operation"],
      true,
      "The operation",
      "open",
      ["open", "close", "send", "health"],
    ],
    [ARG.String, ["e", "endpoint"], false, "The endpoint"],
    [ARG.Any, ["wo", "websocket"], false, "The websocket object"],
    [ARG.Any, ["d", "data"], false, "The data"],
    [ARG.Flag, ["no-tls", "no-tls"], false, "Don't use TLS"],
  ],
  example: "-o open -e /websocket",
};
