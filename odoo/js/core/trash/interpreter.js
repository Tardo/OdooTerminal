// Copyright  Alexandre Díaz <dev@redneboa.es>
// License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).

odoo.define("terminal.core.TraSH.interpreter", function (require) {
    "use strict";

    const TrashConst = require("terminal.core.trash.const");
    const ParameterGenerator = require("terminal.core.ParameterGenerator");
    const Class = require("web.Class");
    const mixins = require("web.mixins");

    const Instruction = Class.extend({
        init: function (type, input_token_index, level, dataIndex = -1) {
            this.type = type;
            this.inputTokenIndex = input_token_index;
            this.level = level;
            this.dataIndex = dataIndex;
        },
    });

    /**
     * This is TraSH
     */
    const Interpreter = Class.extend(mixins.ParentedMixin, {
        init: function (parent, storage_local) {
            this.setParent(parent);
            this._storageLocal = storage_local;
            this._regexComments = new RegExp(
                /^(\s*)?\/\/.*|^(\s*)?\/\*.+\*\//gm
            );
            this._parameterGenerator = new ParameterGenerator();
        },

        /**
         * Split and trim values
         * @param {String} text
         * @param {String} separator
         * @returns {Array}
         */
        splitAndTrim: function (text, separator = ",") {
            return _.map(text.split(separator), (item) => item.trim());
        },

        /**
         * Resolve argument information
         *
         * @param {String} arg
         * @returns {Object}
         */
        getArgumentInfo: function (arg) {
            const [
                type,
                names,
                is_required,
                descr,
                default_value,
                strict_values,
            ] = arg;
            const [short_name, long_name] = names;
            const list_mode =
                (type & TrashConst.ARG.List) === TrashConst.ARG.List;
            return {
                type: type,
                names: {
                    short: short_name,
                    long: long_name,
                },
                description: descr,
                default_value: _.clone(default_value),
                strict_values: strict_values,
                is_required: Boolean(Number(is_required)),
                list_mode: list_mode,
                raw: arg,
            };
        },

        /**
         * @param {Array} args
         * @param {String} arg_name
         * @returns {Object}
         */
        getArgumentInfoByName: function (args, arg_name) {
            for (const arg of args) {
                const arg_info = this.getArgumentInfo(arg);
                if (
                    arg_info.names.short === arg_name ||
                    arg_info.names.long === arg_name
                ) {
                    return arg_info;
                }
            }

            return null;
        },

        parseAliases: function (cmd_name, args) {
            let alias_cmd = this.getAliasCommand(cmd_name);
            if (alias_cmd) {
                const params_len = args.length;
                let index = 0;
                while (index < params_len) {
                    const re = new RegExp(
                        `\\$${Number(index) + 1}(?:\\[[^\\]]+\\])?`,
                        "g"
                    );
                    alias_cmd = alias_cmd.replaceAll(re, args[index]);
                    ++index;
                }
                alias_cmd = alias_cmd.replaceAll(
                    /\$\d+(?:\[([^\]]+)\])?/g,
                    (_, group) => {
                        return group || "";
                    }
                );
                return alias_cmd;
            }
            return null;
        },

        getCanonicalCommandName: function (cmd_name, registered_cmds) {
            if (Object.hasOwn(registered_cmds, cmd_name)) {
                return cmd_name;
            }

            const entries = Object.entries(registered_cmds);
            for (const [cname, cmd_def] of entries) {
                if (cmd_def.aliases.indexOf(cmd_name) !== -1) {
                    return cname;
                }
            }

            return null;
        },

        // Key Distance Comparison (Simple mode)
        // Comparison by distance between keys.
        //
        // This mode of analysis limit it to qwerty layouts
        // but can predict words with a better accuracy.
        // Example Case:
        //   - Two commands: horse, house
        //   - User input: hoese
        //
        //   - Output using simple comparison: horse and house (both have the
        //     same weight)
        //   - Output using KDC: horse
        searchSimiliarCommand: function (in_cmd, registered_cmds) {
            if (in_cmd.length < 3) {
                return false;
            }

            // Only consider words with score lower than this limit
            const SCORE_LIMIT = 50;
            // Columns per Key and Rows per Key
            const cpk = 10,
                rpk = 3;
            const max_dist = Math.sqrt(cpk + rpk);
            const _get_key_dist = function (from, to) {
                const _get_key_pos2d = function (key) {
                    const i = TrashConst.KEYMAP.indexOf(key);
                    if (i === -1) {
                        return [cpk, rpk];
                    }
                    return [i / cpk, i % rpk];
                };

                const from_pos = _get_key_pos2d(from);
                const to_pos = _get_key_pos2d(to);
                const x = (to_pos[0] - from_pos[0]) * (to_pos[0] - from_pos[0]);
                const y = (to_pos[1] - from_pos[1]) * (to_pos[1] - from_pos[1]);
                return Math.sqrt(x + y);
            };

            const sanitized_in_cmd = in_cmd.toLowerCase();
            const sorted_cmd_keys = _.keys(registered_cmds).sort();
            const min_score = [0, ""];
            const sorted_keys_len = sorted_cmd_keys.length;
            for (let x = 0; x < sorted_keys_len; ++x) {
                const cmd = sorted_cmd_keys[x];
                // Analize typo's
                const search_index = sanitized_in_cmd.search(cmd);
                let cmd_score = 0;
                if (search_index === -1) {
                    // Penalize word length diff
                    cmd_score =
                        Math.abs(sanitized_in_cmd.length - cmd.length) / 2 +
                        max_dist;
                    // Analize letter key distances
                    for (let i = 0; i < sanitized_in_cmd.length; ++i) {
                        if (i < cmd.length) {
                            const score = _get_key_dist(
                                sanitized_in_cmd.charAt(i),
                                cmd.charAt(i)
                            );
                            if (score === 0) {
                                --cmd_score;
                            } else {
                                cmd_score += score;
                            }
                        } else {
                            break;
                        }
                    }
                    // Using all letters?
                    const cmd_vec = _.map(cmd, (k) => k.charCodeAt(0));
                    const in_cmd_vec = _.map(sanitized_in_cmd, (k) =>
                        k.charCodeAt(0)
                    );
                    if (_.difference(in_cmd_vec, cmd_vec).length === 0) {
                        cmd_score -= max_dist;
                    }
                } else {
                    cmd_score =
                        Math.abs(sanitized_in_cmd.length - cmd.length) / 2;
                }

                // Search lower score
                // if zero = perfect match (this never should happens)
                if (min_score[1] === "" || cmd_score < min_score[0]) {
                    min_score[0] = cmd_score;
                    min_score[1] = cmd;
                    if (min_score[0] === 0.0) {
                        break;
                    }
                }
            }

            return min_score[0] < SCORE_LIMIT ? min_score[1] : false;
        },

        /**
         * Split the input data into usable tokens
         * @param {String} data
         * @returns {Array}
         */
        tokenize: function (data, options) {
            // Remove comments
            const clean_data = data.replaceAll(this._regexComments, "");
            const tokens = [];
            let value = "";
            let in_string = "";
            let in_array = 0;
            let in_dict = 0;
            let in_runner = 0;
            let do_cut = false;
            let do_skip = false;
            let prev_char = "";
            for (const char of clean_data) {
                const in_data_type = in_array || in_dict || in_runner;
                if (prev_char !== TrashConst.SYMBOLS.ESCAPE) {
                    if (
                        char === TrashConst.SYMBOLS.STRING ||
                        char === TrashConst.SYMBOLS.STRING_SIMPLE
                    ) {
                        if (in_string && char === in_string) {
                            in_string = "";
                        } else if (!in_string && !in_data_type) {
                            in_string = char;
                            do_cut = true;
                        }
                    } else if (!in_string) {
                        if (char === TrashConst.SYMBOLS.ARRAY_START) {
                            if (!in_array && !in_dict && !in_runner) {
                                do_cut = true;
                            }
                            ++in_array;
                        } else if (
                            in_array &&
                            char === TrashConst.SYMBOLS.ARRAY_END
                        ) {
                            --in_array;
                        } else if (
                            char === TrashConst.SYMBOLS.DICTIONARY_START
                        ) {
                            if (!in_array && !in_dict && !in_runner) {
                                do_cut = true;
                            }
                            ++in_dict;
                        } else if (
                            in_dict &&
                            char === TrashConst.SYMBOLS.DICTIONARY_END
                        ) {
                            --in_dict;
                        } else if (
                            prev_char === TrashConst.SYMBOLS.VARIABLE &&
                            char === TrashConst.SYMBOLS.RUNNER_START
                        ) {
                            ++in_runner;
                        } else if (
                            in_runner &&
                            char === TrashConst.SYMBOLS.RUNNER_END
                        ) {
                            --in_runner;
                        } else if (!in_data_type) {
                            if (
                                char === TrashConst.SYMBOLS.ASSIGNMENT ||
                                char === TrashConst.SYMBOLS.ADD ||
                                prev_char === TrashConst.SYMBOLS.ASSIGNMENT ||
                                prev_char === TrashConst.SYMBOLS.ADD
                            ) {
                                do_cut = true;
                            } else if (
                                char === TrashConst.SYMBOLS.EOC ||
                                char === TrashConst.SYMBOLS.EOL ||
                                char === TrashConst.SYMBOLS.VARIABLE
                            ) {
                                do_cut = true;
                            } else if (
                                (prev_char !== TrashConst.SYMBOLS.SPACE &&
                                    char === TrashConst.SYMBOLS.SPACE) ||
                                (prev_char === TrashConst.SYMBOLS.SPACE &&
                                    char !== TrashConst.SYMBOLS.SPACE)
                            ) {
                                do_cut = true;
                            } else if (
                                options?.ignoreCommandMode &&
                                (char === TrashConst.SYMBOLS.ITEM_DELIMITER ||
                                    char ===
                                        TrashConst.SYMBOLS.DICTIONARY_SEPARATOR)
                            ) {
                                do_cut = true;
                                do_skip = true;
                            }
                        }
                    }

                    if (do_cut) {
                        if (value) {
                            tokens.push(value);
                            value = "";
                        }
                        do_cut = false;
                    }
                    if (!do_skip) {
                        value += char;
                    }
                }
                prev_char = char;
                do_skip = false;
            }
            if (value) {
                tokens.push(value);
            }
            // Console.log("TOKENS: ", tokens);
            return tokens;
        },

        /**
         * Classify tokens
         * @param {Array} tokens
         */
        lex: function (data, options) {
            const tokens_info = [];
            let offset = 0;
            const tokens = this.tokenize(data, options);
            let prev_token_info = null;
            let num_word = 1;
            tokens.forEach((token, index) => {
                let token_san = token.trim();
                const token_san_lower = token_san.toLocaleLowerCase();
                let ttype = TrashConst.LEXER.String;
                if (!token_san) {
                    ttype = TrashConst.LEXER.Space;
                } else if (token_san[0] === TrashConst.SYMBOLS.ARGUMENT) {
                    if (token_san[1] === TrashConst.SYMBOLS.ARGUMENT) {
                        ttype = TrashConst.LEXER.ArgumentLong;
                        token_san = token_san.substr(2);
                    } else {
                        ttype = TrashConst.LEXER.ArgumentShort;
                        token_san = token_san.substr(1);
                    }
                } else if (
                    token_san === TrashConst.SYMBOLS.EOC ||
                    token_san === TrashConst.SYMBOLS.EOL
                ) {
                    num_word = 0;
                    ttype = TrashConst.LEXER.Delimiter;
                } else if (token_san === TrashConst.SYMBOLS.ADD) {
                    ttype = TrashConst.LEXER.Add;
                } else if (token_san === TrashConst.SYMBOLS.ASSIGNMENT) {
                    ttype = TrashConst.LEXER.Assignment;
                } else if (
                    token_san[0] === TrashConst.SYMBOLS.ARRAY_START &&
                    token_san.at(-1) === TrashConst.SYMBOLS.ARRAY_END
                ) {
                    token_san = token_san.substr(1, token_san.length - 2);
                    token_san = token_san.trim();
                    if (
                        prev_token_info &&
                        (prev_token_info.type === TrashConst.LEXER.Variable ||
                            prev_token_info.type ===
                                TrashConst.LEXER.DataAttribute ||
                            prev_token_info.type === TrashConst.LEXER.Runner)
                    ) {
                        ttype = TrashConst.LEXER.DataAttribute;
                    } else {
                        ttype = TrashConst.LEXER.Array;
                    }
                } else if (
                    token_san[0] === TrashConst.SYMBOLS.DICTIONARY_START &&
                    token_san.at(-1) === TrashConst.SYMBOLS.DICTIONARY_END
                ) {
                    token_san = token_san.substr(1, token_san.length - 2);
                    token_san = token_san.trim();
                    ttype = TrashConst.LEXER.Dictionary;
                } else if (
                    token_san[0] === TrashConst.SYMBOLS.VARIABLE &&
                    token_san[1] === TrashConst.SYMBOLS.RUNNER_START &&
                    token_san[2] === TrashConst.SYMBOLS.MATH_START &&
                    token_san.at(-1) === TrashConst.SYMBOLS.RUNNER_END &&
                    token_san.at(-2) === TrashConst.SYMBOLS.MATH_END
                ) {
                    ttype = TrashConst.LEXER.Math;
                    token_san = token_san
                        .substr(3, token_san.length - 5)
                        .trim();
                } else if (
                    token_san[0] === TrashConst.SYMBOLS.VARIABLE &&
                    token_san[1] === TrashConst.SYMBOLS.RUNNER_START &&
                    token_san.at(-1) === TrashConst.SYMBOLS.RUNNER_END
                ) {
                    ttype = TrashConst.LEXER.Runner;
                    token_san = token_san
                        .substr(2, token_san.length - 3)
                        .trim();
                } else if (token_san[0] === TrashConst.SYMBOLS.VARIABLE) {
                    ttype = TrashConst.LEXER.Variable;
                    token_san = token_san.substr(1);
                } else if (
                    token_san[0] === TrashConst.SYMBOLS.STRING &&
                    token_san.at(-1) === TrashConst.SYMBOLS.STRING
                ) {
                    ttype = TrashConst.LEXER.String;
                } else if (
                    token_san[0] === TrashConst.SYMBOLS.STRING_SIMPLE &&
                    token_san.at(-1) === TrashConst.SYMBOLS.STRING_SIMPLE
                ) {
                    ttype = TrashConst.LEXER.StringSimple;
                } else if (!_.isNaN(Number(token_san))) {
                    ttype = TrashConst.LEXER.Number;
                } else if (
                    token_san_lower === TrashConst.SYMBOLS.TRUE ||
                    token_san_lower === TrashConst.SYMBOLS.FALSE
                ) {
                    ttype = TrashConst.LEXER.Boolean;
                } else if (!options?.ignoreCommandMode && num_word === 1) {
                    const can_name = this.getCanonicalCommandName(
                        token_san,
                        options.registeredCmds
                    );
                    ttype = TrashConst.LEXER.Command;
                    token_san = can_name || token_san;
                }

                if (
                    ttype === TrashConst.LEXER.String ||
                    ttype === TrashConst.LEXER.StringSimple
                ) {
                    token_san = this._trimQuotes(token_san);
                }
                prev_token_info = {
                    value: token_san,
                    raw: token,
                    type: ttype,
                    start: offset,
                    end: offset + token.length,
                    index: index,
                };
                tokens_info.push(prev_token_info);
                offset += token.length;
                if (ttype !== TrashConst.LEXER.Space) {
                    ++num_word;
                }
            });
            return tokens_info;
        },

        /**
         * Create the execution stack
         * FIXME: maybe RL?
         * @param {String} data
         * @param {Boolean} need_reset_stores
         * @returns {Object}
         */
        parse: function (data, options, level = 0) {
            if (options?.needResetStores) {
                this._parameterGenerator.resetStores();
            }
            const blevel = level;
            let mlevel = level;
            const res = {
                stack: {
                    instructions: [],
                    names: [[]],
                    values: [[]],
                    arguments: [[]],
                },
                inputTokens: [this.lex(data, options)],
            };

            const pushParseData = (parse_data) => {
                res.stack.instructions.push(...parse_data.instructions);
                if (parse_data.arguments.length) {
                    res.stack.arguments[0].push(...parse_data.arguments);
                }
                if (parse_data.values.length) {
                    res.stack.values[0].push(...parse_data.values);
                }
                if (parse_data.names.length) {
                    res.stack.names[0].push(...parse_data.names);
                }
                if (parse_data.inputTokens.length) {
                    res.inputTokens.push(...parse_data.inputTokens);
                }

                parse_data.instructions = [];
                parse_data.arguments = [];
                parse_data.values = [];
                parse_data.names = [];
                parse_data.inputTokens = [];
            };

            // Create Stack Entries
            const tokens_len = res.inputTokens[0].length;
            const to_append_eoc = {
                instructions: [],
                names: [],
                values: [],
                arguments: [],
                inputTokens: [],
            };
            const to_append_eoi = {
                instructions: [],
                names: [],
                values: [],
                arguments: [],
                inputTokens: [],
            };
            let last_token_index = -1;
            for (let index = 0; index < tokens_len; ++index) {
                const token = res.inputTokens[0][index];
                const token_next = res.inputTokens[0][index + 1];
                let ignore_instr_eoi =
                    token_next?.type !== TrashConst.LEXER.Space;
                const to_append = {
                    instructions: [],
                    names: [],
                    values: [],
                    arguments: [],
                    inputTokens: [],
                };
                switch (token.type) {
                    case TrashConst.LEXER.Variable:
                        {
                            to_append.names.push(token.value);
                            const dindex = res.stack.names[0].length;
                            to_append.instructions.push(
                                new Instruction(
                                    TrashConst.PARSER.LOAD_NAME,
                                    index,
                                    level,
                                    dindex
                                )
                            );
                        }
                        break;
                    case TrashConst.LEXER.Command:
                        {
                            to_append.names.push(token.value);
                            const dindex = res.stack.names[0].length;
                            to_append.instructions.push(
                                new Instruction(
                                    TrashConst.PARSER.LOAD_GLOBAL,
                                    index,
                                    level,
                                    dindex
                                )
                            );
                            to_append_eoc.instructions.push(
                                new Instruction(
                                    options?.silent
                                        ? TrashConst.PARSER.CALL_FUNCTION_SILENT
                                        : TrashConst.PARSER.CALL_FUNCTION,
                                    -1,
                                    level
                                )
                            );
                        }
                        break;
                    case TrashConst.LEXER.ArgumentLong:
                    case TrashConst.LEXER.ArgumentShort:
                        {
                            to_append.arguments.push(token.value);
                            const dindex = res.stack.arguments[0].length;
                            to_append.instructions.push(
                                new Instruction(
                                    TrashConst.PARSER.LOAD_ARG,
                                    index,
                                    level,
                                    dindex
                                )
                            );
                        }
                        break;
                    case TrashConst.LEXER.Add:
                        ignore_instr_eoi = true;
                        to_append_eoi.instructions.push(
                            new Instruction(TrashConst.PARSER.ADD, index, level)
                        );
                        break;
                    case TrashConst.LEXER.Number:
                        {
                            to_append.values.push(Number(token.value));
                            const dindex = res.stack.values[0].length;
                            to_append.instructions.push(
                                new Instruction(
                                    TrashConst.PARSER.LOAD_CONST,
                                    index,
                                    level,
                                    dindex
                                )
                            );
                        }
                        break;
                    case TrashConst.LEXER.Boolean:
                        {
                            to_append.values.push(
                                token.value.toLocaleLowerCase() === "true"
                            );
                            const dindex = res.stack.values[0].length;
                            to_append.instructions.push(
                                new Instruction(
                                    TrashConst.PARSER.LOAD_CONST,
                                    index,
                                    level,
                                    dindex
                                )
                            );
                        }
                        break;
                    case TrashConst.LEXER.String:
                    case TrashConst.LEXER.StringSimple:
                        {
                            to_append.values.push(token.value);
                            const dindex = res.stack.values[0].length;
                            to_append.instructions.push(
                                new Instruction(
                                    TrashConst.PARSER.LOAD_CONST,
                                    index,
                                    level,
                                    dindex
                                )
                            );
                        }
                        break;
                    case TrashConst.LEXER.Array:
                        {
                            const parsed_array = this.parse(
                                token.value,
                                {
                                    needResetStores: false,
                                    registeredCmds: options.registeredCmds,
                                    silent: true,
                                    ignoreCommandMode: true,
                                },
                                ++mlevel
                            );
                            res.stack.values.push(...parsed_array.stack.values);
                            res.stack.names.push(...parsed_array.stack.names);
                            to_append.inputTokens.push(
                                ...parsed_array.inputTokens
                            );
                            to_append.instructions.push(
                                ...parsed_array.stack.instructions
                            );
                            to_append.instructions.push(
                                new Instruction(
                                    TrashConst.PARSER.BUILD_LIST,
                                    index,
                                    level,
                                    mlevel
                                )
                            );
                            mlevel = parsed_array.maxULevel;
                        }
                        break;
                    case TrashConst.LEXER.Dictionary:
                        {
                            const parsed_dict = this.parse(
                                token.value,
                                {
                                    needResetStores: false,
                                    registeredCmds: options.registeredCmds,
                                    silent: true,
                                    ignoreCommandMode: true,
                                },
                                ++mlevel
                            );
                            res.stack.values.push(...parsed_dict.stack.values);
                            res.stack.names.push(...parsed_dict.stack.names);
                            to_append.inputTokens.push(
                                ...parsed_dict.inputTokens
                            );
                            to_append.instructions.push(
                                ...parsed_dict.stack.instructions
                            );
                            to_append.instructions.push(
                                new Instruction(
                                    TrashConst.PARSER.BUILD_MAP,
                                    index,
                                    level,
                                    mlevel
                                )
                            );
                            mlevel = parsed_dict.maxULevel;
                        }
                        break;
                    case TrashConst.LEXER.Assignment:
                        {
                            const last_instr = res.stack.instructions.at(-1);
                            if (last_instr) {
                                if (
                                    last_instr.type ===
                                    TrashConst.PARSER.LOAD_DATA_ATTR
                                ) {
                                    res.stack.instructions.pop();
                                    to_append_eoc.instructions.push(
                                        new Instruction(
                                            TrashConst.PARSER.STORE_SUBSCR,
                                            index,
                                            level,
                                            res.stack.names.length - 1
                                        )
                                    );
                                } else {
                                    res.stack.instructions.pop();
                                    let dindex = -1;
                                    if (
                                        last_instr.type ===
                                        TrashConst.PARSER.LOAD_NAME
                                    ) {
                                        to_append_eoc.names.push(
                                            res.stack.names[0].pop()
                                        );
                                        dindex = res.stack.names[0].length;
                                    } else {
                                        to_append_eoc.names.push(undefined);
                                        dindex = res.stack.names[0].length - 1;
                                    }
                                    to_append_eoc.instructions.push(
                                        new Instruction(
                                            TrashConst.PARSER.STORE_NAME,
                                            last_token_index,
                                            level,
                                            dindex
                                        )
                                    );
                                }
                            } else {
                                to_append_eoc.names.push(undefined);
                                const dindex = res.stack.names[0].length;
                                to_append_eoc.instructions.push(
                                    new Instruction(
                                        TrashConst.PARSER.STORE_NAME,
                                        last_token_index,
                                        level,
                                        dindex
                                    )
                                );
                            }
                        }
                        break;
                    case TrashConst.LEXER.DataAttribute:
                        ignore_instr_eoi = true;
                        const parsed_attribute = this.parse(
                            token.value,
                            {
                                needResetStores: false,
                                registeredCmds: options.registeredCmds,
                                silent: true,
                                ignoreCommandMode: true,
                            },
                            ++mlevel
                        );
                        to_append.arguments.push(
                            ...parsed_attribute.stack.arguments
                        );
                        res.stack.values.push(...parsed_attribute.stack.values);
                        res.stack.names.push(...parsed_attribute.stack.names);
                        to_append.inputTokens.push(
                            ...parsed_attribute.inputTokens
                        );
                        to_append.instructions.push(
                            ...parsed_attribute.stack.instructions
                        );
                        to_append.instructions.push(
                            new Instruction(
                                TrashConst.PARSER.LOAD_DATA_ATTR,
                                index,
                                level
                            )
                        );
                        mlevel = parsed_attribute.maxULevel;
                        break;
                    case TrashConst.LEXER.Runner:
                        const parsed_runner = this.parse(
                            token.value,
                            {
                                needResetStores: false,
                                registeredCmds: options.registeredCmds,
                                silent: true,
                            },
                            ++mlevel
                        );
                        to_append.arguments.push(
                            ...parsed_runner.stack.arguments[0]
                        );
                        res.stack.values.push(...parsed_runner.stack.values);
                        res.stack.names.push(...parsed_runner.stack.names);
                        to_append.inputTokens.push(
                            ...parsed_runner.inputTokens
                        );
                        to_append.instructions.push(
                            ...parsed_runner.stack.instructions
                        );
                        mlevel = parsed_runner.maxULevel;
                        break;
                    case TrashConst.LEXER.Space:
                        ignore_instr_eoi = true;
                        break;
                    case TrashConst.LEXER.Math:
                        to_append.values.push(token.value);
                        const dindex = res.stack.values[0].length;
                        to_append.instructions.push(
                            new Instruction(
                                TrashConst.PARSER.LOAD_MATH,
                                index,
                                level,
                                dindex
                            )
                        );
                        break;
                }

                pushParseData(to_append);
                if (index === tokens_len - 1 || !ignore_instr_eoi) {
                    pushParseData(to_append_eoi);
                    ignore_instr_eoi = false;
                }
                if (
                    index === tokens_len - 1 ||
                    token.type === TrashConst.LEXER.Delimiter
                ) {
                    pushParseData(to_append_eoc);
                }

                if (token.type !== TrashConst.LEXER.Space) {
                    last_token_index = index;
                }
            }

            if (!options?.ignoreCommandMode || options?.forceReturn) {
                res.stack.instructions.push(
                    new Instruction(TrashConst.PARSER.RETURN_VALUE, -1, blevel)
                );
            }

            return {
                inputRawString: data,
                inputTokens: res.inputTokens,
                stack: {
                    instructions: res.stack.instructions,
                    names: res.stack.names,
                    values: res.stack.values,
                    arguments: res.stack.arguments,
                },
                maxULevel: mlevel,
            };
        },

        /**
         * Check if the parameter type correspond with the expected type.
         * @param {Object} cmd_def
         * @param {Object} kwargs
         * @returns {Boolean}
         */
        validateAndFormatArguments: function (cmd_def, kwargs) {
            return new Promise(async (resolve, reject) => {
                // Map full info arguments
                let args_infos = _.chain(cmd_def.args)
                    .map((x) => this.getArgumentInfo(x))
                    .map((x) => [x.names.long, x])
                    .value();
                args_infos = Object.fromEntries(args_infos);

                // Normalize Names
                const in_arg_names = Object.keys(kwargs);
                let full_kwargs = {};
                for (const arg_name of in_arg_names) {
                    const arg_info = this.getArgumentInfoByName(
                        cmd_def.args,
                        arg_name
                    );
                    if (_.isEmpty(arg_info)) {
                        return reject(
                            `The argument '${arg_name}' does not exist`
                        );
                    }
                    full_kwargs[arg_info.names.long] = kwargs[arg_name];
                }

                // Apply default values
                let default_values = _.chain(args_infos)
                    .filter((x) => typeof x.default_value !== "undefined")
                    .map((x) => [x.names.long, x.default_value])
                    .value();
                default_values = _.isEmpty(default_values)
                    ? {}
                    : Object.fromEntries(default_values);
                full_kwargs = _.defaults(full_kwargs, default_values);

                if (_.isEmpty(full_kwargs)) {
                    return resolve(full_kwargs);
                }

                // Check required
                const required_args = _.chain(args_infos)
                    .filter("is_required")
                    .map((x) => x.names.long)
                    .value();
                const required_not_set = _.difference(
                    required_args,
                    Object.keys(full_kwargs)
                );
                if (!_.isEmpty(required_not_set)) {
                    return reject(
                        `Required arguments not set! (${required_not_set.join(
                            ","
                        )})`
                    );
                }

                // Check all
                const arg_names = Object.keys(full_kwargs);
                const new_kwargs = {};
                for (const arg_name of arg_names) {
                    const arg_value = full_kwargs[arg_name];
                    const arg_info = args_infos[arg_name];
                    const arg_long_name = arg_info.names.long;
                    const s_arg_long_name = arg_long_name.replaceAll("-", "_");
                    try {
                        new_kwargs[s_arg_long_name] = await this._format(
                            arg_value,
                            arg_info
                        );
                    } catch (err) {
                        return reject(err);
                    }
                }

                return resolve(new_kwargs);
            });
        },

        getAliasCommand: function (cmd_name) {
            const aliases =
                this._storageLocal.getItem("terminal_aliases") || {};
            return aliases[cmd_name];
        },

        /**
         * @param {String} str
         * @returns {String}
         */
        _trimQuotes: function (str) {
            const str_trim = str.trim();
            const first_char = str_trim[0];
            const last_char = str_trim.at(-1);
            if (
                (first_char === '"' && last_char === '"') ||
                (first_char === "'" && last_char === "'") ||
                (first_char === "`" && last_char === "`")
            ) {
                return str_trim.substring(1, str_trim.length - 1);
            }
            return str_trim;
        },

        /**
         * This is necessary to get support to old input format
         *
         * @param {Any} param
         * @param {Object} arg_info
         * @returns
         */
        _format: function (param, arg_info) {
            let san_param = param;

            const doFormat = async (val, type) => {
                let ret = val;
                if ((type & TrashConst.ARG.String) === TrashConst.ARG.String) {
                    if (typeof val === "string") {
                        return ret;
                    }
                    ret = val.toString();
                } else if (
                    (type & TrashConst.ARG.Number) ===
                    TrashConst.ARG.Number
                ) {
                    if (typeof val === "number") {
                        return ret;
                    }
                    ret = Number(val);
                } else if (
                    (type & TrashConst.ARG.Flag) ===
                    TrashConst.ARG.Flag
                ) {
                    if (typeof val === "boolean") {
                        return ret;
                    }
                    ret = Boolean(val);
                } else if (
                    (type & TrashConst.ARG.Dictionary) ===
                    TrashConst.ARG.Dictionary
                ) {
                    if (val.constructor === Object) {
                        return ret;
                    }
                    ret = (
                        await this.getParent().eval(param, {silent: true})
                    )[0];
                }
                if (_.isNull(ret) || _.isNaN(ret) || _.isUndefined(ret)) {
                    return Promise.reject(`Invalid '${val}' argument!`);
                }
                return ret;
            };

            return new Promise(async (resolve, reject) => {
                try {
                    if (arg_info.list_mode) {
                        if (typeof param === "string") {
                            san_param = param.split(",");
                        } else if (param.constructor !== Array) {
                            san_param = [param];
                        }

                        const fparam = [];
                        for (const val of san_param) {
                            fparam.push(await doFormat(val, arg_info.type));
                        }
                        return resolve(fparam);
                    }
                    return resolve(await doFormat(param, arg_info.type));
                } catch (err) {
                    return reject(err);
                }
            });
        },
    });

    return Interpreter;
});
