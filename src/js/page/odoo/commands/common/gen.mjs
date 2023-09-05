// Copyright  Alexandre Díaz <dev@redneboa.es>
// License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).

import {ARG} from '@trash/constants';

// FIXME: I don't like the '__meta' usage here... but needed due to the
// 'intiter' generator.
// This generator needs mantain an store that 'conflicts' with the
// 'repeat' command.
// Considerations:
//  - Repeat must mantain iterator sequence
//  - Commands are 'async'... this means that one or more iterators can
//    run at the same time
async function cmdGen(kwargs) {
  const type = kwargs.type.toLowerCase();
  let result = false;
  if (type === 'email') {
    result = this.__meta.parameterGenerator.generateEmail(
      kwargs.min,
      kwargs.max,
    );
  } else if (type === 'url') {
    result = this.__meta.parameterGenerator.generateUrl(kwargs.min, kwargs.max);
  } else if (type === 'float') {
    result = this.__meta.parameterGenerator.generateFloat(
      kwargs.min,
      kwargs.max,
    );
  } else if (type === 'int') {
    result = this.__meta.parameterGenerator.generateInt(kwargs.min, kwargs.max);
  } else if (type === 'intseq') {
    result = this.__meta.parameterGenerator.generateIntSeq(
      kwargs.min,
      kwargs.max,
    );
  } else if (type === 'intiter') {
    result = this.__meta.parameterGenerator.doIntIter(kwargs.min, kwargs.max);
  } else if (type === 'str') {
    result = this.__meta.parameterGenerator.generateString(
      kwargs.min,
      kwargs.max,
    );
  } else if (type === 'tzdate') {
    result = this.__meta.parameterGenerator.generateTzDate(
      kwargs.min,
      kwargs.max,
    );
  } else if (type === 'date') {
    result = this.__meta.parameterGenerator.generateDate(
      kwargs.min,
      kwargs.max,
    );
  } else if (type === 'tztime') {
    result = this.__meta.parameterGenerator.generateTzTime(
      kwargs.min,
      kwargs.max,
    );
  } else if (type === 'time') {
    result = this.__meta.parameterGenerator.generateTime(
      kwargs.min,
      kwargs.max,
    );
  } else if (type === 'tzdatetime') {
    result = this.__meta.parameterGenerator.generateTzDateTime(
      kwargs.min,
      kwargs.max,
    );
  } else if (type === 'datetime') {
    result = this.__meta.parameterGenerator.generateDateTime(
      kwargs.min,
      kwargs.max,
    );
  }
  this.screen.print(result);
  return result;
}

export default {
  definition: 'Generate random values',
  callback: cmdGen,
  detail: "Generate numbers, strings, url's, dates, etc...",
  args: [
    [
      ARG.String,
      ['t', 'type'],
      true,
      'Generator type',
      'str',
      [
        'str',
        'float',
        'int',
        'intseq',
        'intiter',
        'date',
        'tzdate',
        'time',
        'tztime',
        'datetime',
        'tzdatetime',
        'email',
        'url',
      ],
    ],
    [ARG.Number, ['mi', 'min'], false, 'Min. value', 1],
    [ARG.Number, ['ma', 'max'], false, 'Max. value'],
  ],
  example: '-t str -mi 2 -ma 4',
};
