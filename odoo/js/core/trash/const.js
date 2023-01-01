// Copyright  Alexandre Díaz <dev@redneboa.es>
// License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).

odoo.define("terminal.core.trash.const", function () {
    "use strict";

    const LEXER = {
        Delimiter: 1,
        Add: 2,
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
        Math: 17,
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
        ADD: 13,
        SUBTRACT: 14,
        MULTIPLY: 15,
        DIVIDE: 16,
        MODULO: 17,

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
                if (entry[1] & (type === type)) {
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
    };

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
        KEYMAP: KEYMAP,
    };
});
