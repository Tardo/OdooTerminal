// Copyright  Alexandre Díaz <dev@redneboa.es>
// License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).

export default class {
  constructor(type, input_token_index, level, dataIndex = -1) {
    this.type = type;
    this.inputTokenIndex = input_token_index;
    this.level = level;
    this.dataIndex = dataIndex;
  }
}
