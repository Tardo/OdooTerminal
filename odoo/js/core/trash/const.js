// Copyright  Alexandre Díaz <dev@redneboa.es>
// License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).

odoo.define("terminal.core.trash.const", function () {
    "use strict";

    const LEXER = {
        Delimiter: 1,
        Concat: 2,
        Variable: 3,
        ArgumentShort: 4,
        ArgumentLong: 5,
        Assignment: 6,
        DataAttribute: 7,
        Runner: 8,
        Array: 9,
        String: 10,
        StringSimple: 11,
        Number: 12,
        Dictionary: 13,
        Boolean: 14,
        Space: 15,
        Math: 16,
        Add: 17,
        Substract: 18,
        Multiply: 19,
        Divide: 20,
        Modulo: 21,
        Pow: 22,
    };

    const PARSER = {
        LOAD_NAME: 1,
        LOAD_GLOBAL: 2,
        LOAD_ARG: 3,
        LOAD_CONST: 4,
        STORE_NAME: 5,
        STORE_SUBSCR: 6,
        CALL_FUNCTION: 7,
        CALL_FUNCTION_SILENT: 8,
        RETURN_VALUE: 9,
        LOAD_DATA_ATTR: 10,
        BUILD_LIST: 11,
        BUILD_MAP: 12,
        CONCAT: 13,
        ADD: 14,
        SUBSTRACT: 15,
        MULTIPLY: 16,
        DIVIDE: 17,
        MODULO: 18,
        POW: 19,

        getHumanType: function (type) {
            return Object.entries(this).find((item) => item[1] === type) || "";
        },
    };

    const ARG = {
        String: 1 << 0,
        Number: 1 << 1,
        Dictionary: 1 << 2,
        Flag: 1 << 3,
        Any: 1 << 4,
        List: 1 << 5,

        getHumanType: function (type) {
            const utypes = [];
            const entries = Object.entries(this);
            for (const entry of entries) {
                if ((entry[1] & type) === type) {
                    utypes.push(entry[0].toUpperCase());
                }
            }
            if ((type & this.List) === this.List) {
                return `LIST OF ${utypes.join(" or ")}`;
            }
            return utypes.join(" or ");
        },
    };

    const SYMBOLS = {
        ADD: "+",
        SUBSTRACT: "-",
        MULTIPLY: "*",
        DIVIDE: "/",
        MODULO: "%",
        POW: "^",
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
        MATH_START: "(",
        MATH_END: ")",
        MATH_BLOCK_START: "(",
        MATH_BLOCK_END: ")",
    };

    const MATH_OPER_PRIORITIES = [
        SYMBOLS.POW,
        SYMBOLS.DIVIDE,
        SYMBOLS.MULTIPLY,
        SYMBOLS.MODULO,
        SYMBOLS.SUBSTRACT,
        SYMBOLS.ADD,
    ];

    // FIXME: Inaccurate keymap
    //      '_' and '-' positions are only valid for spanish layout
    const KEYMAP = [
        "q",
        "w",
        "e",
        "r",
        "t",
        "y",
        "u",
        "i",
        "o",
        "p",
        "a",
        "s",
        "d",
        "f",
        "g",
        "h",
        "j",
        "k",
        "l",
        null,
        "z",
        "x",
        "c",
        "v",
        "b",
        "n",
        "m",
        "_",
        "-",
        null,
    ];

    return {
        LEXER: LEXER,
        PARSER: PARSER,
        ARG: ARG,
        SYMBOLS: SYMBOLS,
        MATH_OPER_PRIORITIES: MATH_OPER_PRIORITIES,
        KEYMAP: KEYMAP,
    };
});
