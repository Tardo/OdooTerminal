// @flow strict
// Copyright  Alexandre Díaz <dev@redneboa.es>
// License MIT (https://opensource.org/license/mit).

import {INSTRUCTION_SIZE} from '@tardo/trash/constants';
import type {ParseInfo} from '@tardo/trash/interpreter';

export type DecodedInstruction = {type: number, operand: number, level: number, inputTokenIndex: number};

export default function decodeInstructions(parse_info: ParseInfo): Array<DecodedInstruction> {
  const {instructions, sourceMap} = parse_info.program;
  const view = new DataView(instructions.buffer, instructions.byteOffset, instructions.byteLength);
  const result = [];
  for (let index = 0; index < instructions.length / INSTRUCTION_SIZE; index++) {
    result.push({
      type: instructions[index * INSTRUCTION_SIZE],
      operand: view.getInt32(index * INSTRUCTION_SIZE + 1, true),
      level: sourceMap[index * 2],
      inputTokenIndex: sourceMap[index * 2 + 1],
    });
  }
  return result;
}
