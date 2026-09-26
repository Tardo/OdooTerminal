// @flow strict
// Copyright  Alexandre Díaz <dev@redneboa.es>
// License MIT (https://opensource.org/license/mit).

import i18n from 'i18next';
import {ARG, INSTRUCTION_TYPE} from '@tardo/trash/constants';
import decodeInstructions from '@terminal/utils/decode_instructions';
import type {CMDCallbackArgs, CMDCallbackContext, CMDDef} from '@tardo/trash/interpreter';
import type Terminal from '@terminal/terminal';

type RowInfo = [string, number, string, number, number, string];

async function cmdDis(this: Terminal, kwargs: CMDCallbackArgs, ctx: CMDCallbackContext): Promise<Array<RowInfo>> {
  const parse_info = this.getShell().parse(kwargs.code);
  const rows: Array<RowInfo> = [];
  const {program} = parse_info;
  for (const instr of decodeInstructions(parse_info)) {
    let lvalue: string = '';
    switch (instr.type) {
      case INSTRUCTION_TYPE.LOAD_NAME:
      case INSTRUCTION_TYPE.LOAD_GLOBAL:
      case INSTRUCTION_TYPE.STORE_NAME: {
        const rec_name = program.constants[instr.operand];
        lvalue = new String(rec_name).toString();
        break;
      }
      case INSTRUCTION_TYPE.LOAD_CONST: {
        const rec_value = program.constants[instr.operand];
        lvalue = new String(rec_value).toString();
        break;
      }
    }

    const humanType = INSTRUCTION_TYPE.getHumanType(instr.type);
    rows.push([
      humanType,
      instr.type,
      lvalue,
      instr.operand,
      instr.level,
      instr.level >= 0 ? parse_info.inputTokens[instr.level][instr.inputTokenIndex]?.raw || '' : '',
    ]);
  }
  ctx.screen.printTable(
    [
      i18n.t('cmdDis.table.instrName', 'Instr. Name'),
      i18n.t('cmdDis.table.instrCode', 'Instr. Code'),
      i18n.t('cmdDis.table.value', 'Name/Value/Argument'),
      i18n.t('cmdDis.table.meta', 'Meta'),
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
    category: 'terminal',
    callback: cmdDis,
    detail: i18n.t('cmdDis.detail', 'Shows the bytecode generated for the input'),
    args: [[ARG.String, ['c', 'code'], true, i18n.t('cmdDis.args.code', 'TraSH Code')]],
    example: "-c \"print $var[0]['key'] + ' -> ' + 1234\"",
  };
}
