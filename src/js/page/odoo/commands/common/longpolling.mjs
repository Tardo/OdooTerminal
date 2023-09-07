// Copyright  Alexandre Díaz <dev@redneboa.es>
// License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).

import {ARG} from '@trash/constants';

function cmdLongpolling(kwargs, screen) {
  if (!this.longpolling) {
    throw new Error("Can't use longpolling, 'bus' module is not installed");
  }

  if (typeof kwargs.operation === 'undefined') {
    screen.print(this.longpolling.isVerbose() || 'off');
  } else if (kwargs.operation === 'verbose') {
    this.longpolling.setVerbose(true);
    screen.print('Now long-polling is in verbose mode.');
  } else if (kwargs.operation === 'off') {
    this.longpolling.setVerbose(false);
    screen.print('Now long-polling verbose mode is disabled');
  } else if (
    kwargs.operation === 'add_channel' ||
    kwargs.operation === 'del_channel'
  ) {
    const channel_name = kwargs.param;
    if (typeof channel_name === 'undefined') {
      screen.printError('Invalid channel name.');
    } else {
      if (kwargs.operation === 'add_channel') {
        this.longpolling.addChannel(channel_name);
        screen.print(`Joined the '${channel_name}' channel.`);
      } else if (kwargs.operation === 'del_channel') {
        this.longpolling.deleteChannel(channel_name);
        screen.print(`Leave the '${channel_name}' channel.`);
      }
    }
  } else if (kwargs.operation === 'start') {
    this.longpolling.startPoll();
    screen.print('Longpolling started');
  } else if (kwargs.operation === 'stop') {
    this.longpolling.stopPoll();
    screen.print('Longpolling stopped');
  } else {
    throw new Error('Invalid Operation.');
  }
}

export default {
  definition: 'Long-Polling operations',
  callback: cmdLongpolling,
  detail: 'Operations over long-polling.',
  args: [
    [
      ARG.String,
      ['o', 'operation'],
      false,
      'The operation to do<br>- verbose > Print incoming notificacions<br>- off > Stop verbose mode<br>- add_channel > Add a channel to listen<br>- del_channel > Delete a listening channel<br>- start > Start client longpolling service<br> - stop > Stop client longpolling service',
      undefined,
      ['verbose', 'off', 'add_channel', 'del_channel', 'start', 'stop'],
    ],
    [ARG.String, ['p', 'param'], false, 'The parameter'],
  ],
  example: '-o add_channel -p example_channel',
};
