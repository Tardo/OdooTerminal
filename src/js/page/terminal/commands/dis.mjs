// @flow strict
// Copyright  Alexandre Díaz <dev@redneboa.es>
// License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).

// $FlowIgnore
import i18n from 'i18next';
import {ARG, INSTRUCTION_TYPE} from '@trash/constants';
import type {CMDCallbackArgs, CMDCallbackContext, CMDDef} from '@trash/interpreter';
import type Terminal from '@terminal/terminal';

type RowInfo = [string, number, string, number, number, string];

async function cmdDis(this: Terminal, kwargs: CMDCallbackArgs, ctx: CMDCallbackContext): Promise<Array<RowInfo>> {
  const parse_info = this.getShell().parse(kwargs.code);
  const rows: Array<RowInfo> = [];
  const {stack} = parse_info;
  for (const instr of stack.instructions) {
    let lvalue: string = '';
    switch (instr.type) {
      case INSTRUCTION_TYPE.LOAD_NAME:
      case INSTRUCTION_TYPE.LOAD_GLOBAL:
      case INSTRUCTION_TYPE.STORE_NAME:
      case INSTRUCTION_TYPE.STORE_SUBSCR: {
        const rec_name = stack.names[instr.level][instr.dataIndex];
        lvalue = new String(rec_name).toString();
        break;
      }
      case INSTRUCTION_TYPE.LOAD_CONST: {
        const rec_value = stack.values[instr.level][instr.dataIndex];
        lvalue = new String(rec_value).toString();
        break;
      }
    }

    const humanType = INSTRUCTION_TYPE.getHumanType(instr.type);
    rows.push([
      humanType,
      instr.type,
      lvalue,
      instr.dataIndex,
      instr.level,
      instr.level >= 0 ? parse_info.inputTokens[instr.level][instr.inputTokenIndex]?.raw || '' : '',
    ]);
  }
  ctx.screen.printTable(
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

  return rows;
}

export default function (): Partial<CMDDef> {
  return {
    definition: i18n.t('cmdDis.definition', 'Dissasembler bytecode'),
    callback: cmdDis,
    detail: i18n.t('cmdDis.detail', 'Shows the bytecode generated for the input'),
    args: [[ARG.String, ['c', 'code'], true, i18n.t('cmdDis.args.code', 'TraSH Code')]],
    example: "-c \"print $var[0]['key'] + ' -> ' + 1234\"",
  };
}
