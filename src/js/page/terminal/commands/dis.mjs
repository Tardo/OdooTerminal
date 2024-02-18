// Copyright  Alexandre Díaz <dev@redneboa.es>
// License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).

import i18n from 'i18next';
import {ARG, INSTRUCTION_TYPE} from '@trash/constants';

async function cmdDis(kwargs, screen) {
  const parse_info = this.parse(kwargs.code);
  const rows = [];
  const {stack} = parse_info;
  for (const instr of stack.instructions) {
    const row_index = rows.push([]) - 1;
    let lvalue = '';
    switch (instr.type) {
      case INSTRUCTION_TYPE.LOAD_NAME:
      case INSTRUCTION_TYPE.LOAD_GLOBAL:
      case INSTRUCTION_TYPE.STORE_NAME:
      case INSTRUCTION_TYPE.STORE_SUBSCR:
        lvalue = stack.names[instr.level][instr.dataIndex];
        break;
      case INSTRUCTION_TYPE.LOAD_CONST:
        lvalue = stack.values[instr.level][instr.dataIndex];
        break;
      case INSTRUCTION_TYPE.LOAD_ARG:
        lvalue = stack.arguments[instr.level][instr.dataIndex];
        break;
    }

    const humanType = INSTRUCTION_TYPE.getHumanType(instr.type);
    rows[row_index].push(
      humanType[0],
      instr.type,
      lvalue,
      instr.dataIndex,
      instr.level,
      instr.level >= 0
        ? parse_info.inputTokens[instr.level][instr.inputTokenIndex]?.raw || ''
        : '',
    );
  }
  screen.printTable(
    [
      i18n.t('cmdDis.table.instrName', 'Instr. Name'),
      i18n.t('cmdDis.table.instrCode', 'Instr. Code'),
      i18n.t('cmdDis.table.value', 'Name/Value/Argument'),
      i18n.t('cmdDis.table.dataIndex', 'Data Index'),
      i18n.t('cmdDis.table.level', 'Level'),
      i18n.t('cmdDis.table.token', 'Token'),
    ],
    rows,
  );
}

export default {
  definition: i18n.t('cmdDis.definition', 'Dissasembler bytecode'),
  callback: cmdDis,
  detail: i18n.t('cmdDis.detail', 'Shows the bytecode generated for the input'),
  args: [
    [ARG.String, ['c', 'code'], true, i18n.t('cmdDis.args.code', 'TraSH Code')],
  ],
  example: "-c \"print $var[0]['key'] + ' -> ' + 1234\"",
};
