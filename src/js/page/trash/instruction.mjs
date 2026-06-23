// @flow strict
// Copyright  Alexandre Díaz <dev@redneboa.es>
// License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).

export default class {
  type: number;
  inputTokenIndex: number;
  level: number;
  operand: number;

  constructor(type: number, input_token_index: number, level: number, operand: number = -1) {
    this.type = type;
    this.inputTokenIndex = input_token_index;
    this.level = level;
    this.operand = operand;
  }
}
