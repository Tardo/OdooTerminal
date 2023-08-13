// Copyright  Alexandre Díaz <dev@redneboa.es>
// License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).

import {ARG} from "@trash/constants";

function longPollingAddChannel(name) {
  if (typeof name === "undefined") {
    this.screen.printError("Invalid channel name.");
  } else {
    this.longpolling.addChannel(name);
    this.screen.print(`Joined the '${name}' channel.`);
  }
}

function longPollingDelChannel(name) {
  if (typeof name === "undefined") {
    this.screen.printError("Invalid channel name.");
  } else {
    this.longpolling.deleteChannel(name);
    this.screen.print(`Leave the '${name}' channel.`);
  }
}

function cmdLongpolling(kwargs) {
  if (!this.longpolling) {
    return Promise.reject(
      "Can't use longpolling, 'bus' module is not installed"
    );
  }

  if (typeof kwargs.operation === "undefined") {
    this.screen.print(this.longpolling.isVerbose() || "off");
  } else if (kwargs.operation === "verbose") {
    this.longpolling.setVerbose(true);
    this.screen.print("Now long-polling is in verbose mode.");
  } else if (kwargs.operation === "off") {
    this.longpolling.setVerbose(false);
    this.screen.print("Now long-polling verbose mode is disabled");
  } else if (kwargs.operation === "add_channel") {
    longPollingAddChannel(kwargs.param);
  } else if (kwargs.operation === "del_channel") {
    longPollingDelChannel(kwargs.param);
  } else if (kwargs.operation === "start") {
    this.longpolling.startPoll();
    this.screen.print("Longpolling started");
  } else if (kwargs.operation === "stop") {
    this.longpolling.stopPoll();
    this.screen.print("Longpolling stopped");
  } else {
    return Promise.reject("Invalid Operation.");
  }
  return Promise.resolve();
}

export default {
  definition: "Long-Polling operations",
  callback: cmdLongpolling,
  detail: "Operations over long-polling.",
  args: [
    [
      ARG.String,
      ["o", "operation"],
      false,
      "The operation to do<br>- verbose > Print incoming notificacions<br>- off > Stop verbose mode<br>- add_channel > Add a channel to listen<br>- del_channel > Delete a listening channel<br>- start > Start client longpolling service<br> - stop > Stop client longpolling service",
      undefined,
      ["verbose", "off", "add_channel", "del_channel", "start", "stop"],
    ],
    [ARG.String, ["p", "param"], false, "The parameter"],
  ],
  example: "add_channel example_channel",
};
