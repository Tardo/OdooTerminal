// Copyright  Alexandre Díaz <dev@redneboa.es>
// License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).

odoo.define("terminal.core.trash.const", function () {
    "use strict";

    const LEXER = {
        Delimiter: 1,
        Concat: 2,
        Variable: 3,
        Command: 4,
        ArgumentShort: 5,
        ArgumentLong: 6,
        Assignment: 7,
        DataAttribute: 8,
        Runner: 9,
        Array: 10,
        String: 11,
        StringSimple: 12,
        Number: 13,
        Dictionary: 14,
        Boolean: 15,
        Space: 16,
    };

    const PARSER = {
        LOAD_NAME: 1,
        LOAD_GLOBAL: 2,
        LOAD_ARG: 3,
        LOAD_CONST: 4,
        STORE_NAME: 5,
        STORE_SUBSCR: 6,
        CONCAT: 7,
        CALL_FUNCTION: 8,
        CALL_FUNCTION_SILENT: 9,
        RETURN_VALUE: 10,
        LOAD_DATA_ATTR: 11,
        BUILD_LIST: 12,
        BUILD_MAP: 13,
    };

    const SYMBOLS = {
        CONCAT: "+",
        ASSIGNMENT: "=",
        ARGUMENT: "-",
        ARRAY_START: "[",
        ARRAY_END: "]",
        DICTIONARY_START: "{",
        DICTIONARY_END: "}",
        DICTIONARY_SEPARATOR: ":",
        ITEM_DELIMITER: ",",
        RUNNER_START: "(",
        RUNNER_END: ")",
        STRING: '"',
        STRING_SIMPLE: "'",
        VARIABLE: "$",
        SPACE: " ",
        EOC: ";",
        EOL: "\n",
        TRUE: "true",
        FALSE: "false",
        ESCAPE: "\\",
    };

    return {
        LEXER: LEXER,
        PARSER: PARSER,
        SYMBOLS: SYMBOLS,
    };
});
