odoo.define("terminal.core.trash.exception", function () {
    "use strict";

    class UnknownCommandError extends Error {
        constructor(cmd_name, start, end) {
            super(`Unknown Command '${cmd_name}' at ${start}:${end}`);
            this.name = this.constructor.name;
            this.cmd_name = cmd_name;
            this.start = start;
            this.end = end;
        }
    }

    class InvalidCommandArgumentsError extends Error {
        constructor(cmd_name, args) {
            super("Invalid command arguments");
            this.name = this.constructor.name;
            this.cmd_name = cmd_name;
            this.args = args;
        }
    }

    class InvalidCommandArgumentValueError extends Error {
        constructor(cmd_name, arg_value) {
            super(`Unexpected '${arg_value}' value!`);
            this.name = this.constructor.name;
            this.cmd_name = cmd_name;
            this.arg_value = arg_value;
        }
    }

    class InvalidCommandArgumentFormatError extends Error {
        constructor(message, cmd_name) {
            super(message);
            this.name = this.constructor.name;
            this.cmd_name = cmd_name;
        }
    }

    class NotExpectedCommandArgumentError extends Error {
        constructor(arg_name, start, end) {
            super(`Argument '${arg_name}' not expected at ${start}:${end}`);
            this.name = this.constructor.name;
            this.arg_name = arg_name;
            this.start = start;
            this.end = end;
        }
    }

    class UnknownNameError extends Error {
        constructor(vname, start, end) {
            super(`Unknown name '${vname}' at ${start}:${end}`);
            this.name = this.constructor.name;
            this.vname = vname;
            this.start = start;
            this.end = end;
        }
    }

    class InvalidNameError extends Error {
        constructor(vname, start, end) {
            super(`Invalid name '${vname}' at ${start}:${end}`);
            this.name = this.constructor.name;
            this.vname = vname;
            this.start = start;
            this.end = end;
        }
    }

    class CallFunctionError extends Error {
        constructor(message) {
            super(message);
            this.name = this.constructor.name;
        }
    }

    class InvalidInstructionError extends Error {
        constructor(message) {
            super(message || "Invalid instruction");
            this.name = this.constructor.name;
        }
    }

    class InvalidTokenError extends Error {
        constructor(vname, start, end) {
            super(`Invalid token '${vname}' at ${start}:${end}`);
            this.name = this.constructor.name;
            this.vname = vname;
            this.start = start;
            this.end = end;
        }
    }

    class UndefinedValueError extends Error {
        constructor(vname) {
            super(`Cannot read properties of undefined (reading '${vname}')`);
            this.name = this.constructor.name;
            this.vname = vname;
        }
    }

    return {
        UnknownCommandError: UnknownCommandError,
        InvalidCommandArgumentsError: InvalidCommandArgumentsError,
        InvalidCommandArgumentValueError: InvalidCommandArgumentValueError,
        InvalidCommandArgumentFormatError: InvalidCommandArgumentFormatError,
        NotExpectedCommandArgumentError: NotExpectedCommandArgumentError,
        UnknownNameError: UnknownNameError,
        InvalidNameError: InvalidNameError,
        CallFunctionError: CallFunctionError,
        InvalidInstructionError: InvalidInstructionError,
        InvalidTokenError: InvalidTokenError,
        UndefinedValueError: UndefinedValueError,
    };
});
