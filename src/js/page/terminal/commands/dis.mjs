// Copyright  Alexandre Díaz <dev@redneboa.es>
// License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).

import {ARG, INSTRUCTION_TYPE} from "@trash/constants";

function cmdDis(kwargs) {
  const parse_info = this.virtMachine.interpreter.parse(kwargs.code, {
    registeredCmds: this.registeredCmds,
  });
  let body = "";
  const stack = parse_info.stack;
  for (const instr of stack.instructions) {
    let lvalue = "";
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
    body += `<tr><td>${humanType[0]}</td><td>${
      humanType[1]
    }</td><td>${lvalue}</td><td>${instr.dataIndex}</td><td>${
      instr.level
    }</td><td>${
      parse_info.inputTokens[instr.level][instr.inputTokenIndex]?.raw || ""
    }</td></tr>`;
  }
  this.screen.printTable(
    [
      "Instr. Name",
      "Instr. Code",
      "Name/Value/Argument",
      "Data Index",
      "Level",
      "Token",
    ],
    body
  );

  return Promise.resolve(true);
}

export default {
  definition: "Dissasembler bytecode",
  callback: cmdDis,
  detail: "Shows the bytecode generated for the input",
  args: [[ARG.String, ["c", "code"], true, "TraSH Code"]],
  example: "-c \"print $var[0]['key'] + ' -> ' + 1234\"",
};
