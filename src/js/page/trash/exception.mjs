// Copyright  Alexandre Díaz <dev@redneboa.es>
// License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).

export class UnknownCommandError extends Error {
  constructor(cmd_name, start, end) {
    super(`Unknown Command '${cmd_name}' at ${start}:${end}`);
    this.name = this.constructor.name;
    this.cmd_name = cmd_name;
    this.start = start;
    this.end = end;
  }
}

export class InvalidCommandArgumentsError extends Error {
  constructor(cmd_name, args) {
    super("Invalid command arguments");
    this.name = this.constructor.name;
    this.cmd_name = cmd_name;
    this.args = args;
  }
}

export class InvalidCommandArgumentValueError extends Error {
  constructor(cmd_name, arg_value) {
    super(`Unexpected '${arg_value}' value!`);
    this.name = this.constructor.name;
    this.cmd_name = cmd_name;
    this.arg_value = arg_value;
  }
}

export class InvalidCommandArgumentFormatError extends Error {
  constructor(message, cmd_name) {
    super(message);
    this.name = this.constructor.name;
    this.cmd_name = cmd_name;
  }
}

export class NotExpectedCommandArgumentError extends Error {
  constructor(arg_name, start, end) {
    super(`Argument '${arg_name}' not expected at ${start}:${end}`);
    this.name = this.constructor.name;
    this.arg_name = arg_name;
    this.start = start;
    this.end = end;
  }
}

export class UnknownNameError extends Error {
  constructor(vname, start, end) {
    super(`Unknown name '${vname}' at ${start}:${end}`);
    this.name = this.constructor.name;
    this.vname = vname;
    this.start = start;
    this.end = end;
  }
}

export class InvalidNameError extends Error {
  constructor(vname, start, end) {
    super(`Invalid name '${vname}' at ${start}:${end}`);
    this.name = this.constructor.name;
    this.vname = vname;
    this.start = start;
    this.end = end;
  }
}

export class CallFunctionError extends Error {
  constructor(message) {
    super(message);
    this.name = this.constructor.name;
  }
}

export class InvalidInstructionError extends Error {
  constructor(message) {
    super(message || "Invalid instruction");
    this.name = this.constructor.name;
  }
}

export class InvalidTokenError extends Error {
  constructor(vname, start, end) {
    super(`Invalid token '${vname}' at ${start}:${end}`);
    this.name = this.constructor.name;
    this.vname = vname;
    this.start = start;
    this.end = end;
  }
}

export class UndefinedValueError extends Error {
  constructor(vname) {
    super(`Cannot read properties of undefined (reading '${vname}')`);
    this.name = this.constructor.name;
    this.vname = vname;
  }
}
