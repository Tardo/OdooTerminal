// @flow strict
// Copyright  Alexandre Díaz <dev@redneboa.es>
// License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).

import i18n from 'i18next';
import {ARG, LEXER, SYMBOLS} from './constants';
import {NODE} from './ast';
import InvalidTokenError from './exceptions/invalid_token_error';
import type {ASTNode, ASTUnit, CommandArg} from './ast';
import type {ArgDef, ParseInfo, ParserOptions, RegisteredCMD, TokenInfo} from './interpreter';

export type ParserServices = {
  tokenize: (data: string, options: ParserOptions) => Array<TokenInfo>,
  compile: (data: string, options: ParserOptions) => ParseInfo,
  getCanonicalCommandName: (cmd_name: string, registered_cmds: RegisteredCMD) => string | void,
};

type UnitOptions = {
  isData?: boolean,
  silent?: boolean,
  // True for logic-block/condition units: statements are expressions, so
  // postfix ++/-- yields the old value instead of acting as an assignment
  exprContext?: boolean,
};

// Binding powers (higher binds tighter). Same observable behaviour as the
// legacy MATH_OPER_PRIORITIES passes, plus correct short-circuit nesting.
const BINARY_BP: Map<number, number> = new Map([
  [LEXER.Multiply, 60],
  [LEXER.Divide, 60],
  [LEXER.Modulo, 60],
  [LEXER.Add, 50],
  [LEXER.Substract, 50],
  [LEXER.Equal, 40],
  [LEXER.NotEqual, 40],
  [LEXER.GreaterThanOpen, 40],
  [LEXER.LessThanOpen, 40],
  [LEXER.GreaterThanClosed, 40],
  [LEXER.LessThanClosed, 40],
  [LEXER.And, 30],
  [LEXER.Or, 20],
]);

const ASSIGN_TOKENS: Set<number> = new Set([
  LEXER.Assignment,
  LEXER.AssignmentAdd,
  LEXER.AssignmentSubstract,
  LEXER.AssignmentMultiply,
  LEXER.AssignmentDivide,
  LEXER.Increment,
  LEXER.Decrement,
]);

/**
 * Builds the AST from the token stream. Nested composite tokens
 * (blocks, logic blocks, arrays, dictionaries, data attributes) carry their
 * raw content, which is re-tokenized here into child units — each child unit
 * becomes one 'level' of the compiled program.
 */
export default class ASTParser {
  #services: ParserServices;
  #options: ParserOptions;
  #units: Array<ASTUnit> = [];

  constructor(services: ParserServices, options: ParserOptions) {
    this.#services = services;
    this.#options = options;
  }

  getUnits(): Array<ASTUnit> {
    return this.#units;
  }

  parse(tokens: Array<TokenInfo>): ASTUnit {
    return this.#parseUnit(tokens, {
      isData: !isFalsyOpt(this.#options.isData),
      silent: !isFalsyOpt(this.#options.silent),
    });
  }

  #tolerates(): boolean {
    return this.#options.ignoreErrors === true;
  }

  #throwToken(token: TokenInfo): empty {
    throw new InvalidTokenError(token.value, token.start, token.end);
  }

  #subTokens(content: string, offset: number, extra?: {isData?: boolean, delimiter?: string}): Array<TokenInfo> {
    return this.#services.tokenize(content, {
      registeredCmds: this.#options.registeredCmds,
      isData: extra?.isData === true,
      delimiter: extra?.delimiter,
      offset: offset,
      ignoreErrors: this.#options.ignoreErrors,
    });
  }

  #subUnit(content: string, offset: number, uopts: UnitOptions, delimiter?: string): ASTUnit {
    const tokens = this.#subTokens(content, offset, {isData: uopts.isData === true, delimiter});
    return this.#parseUnit(tokens, uopts);
  }

  #parseUnit(tokens: Array<TokenInfo>, uopts: UnitOptions): ASTUnit {
    const unit: ASTUnit = {
      id: this.#units.length,
      silent: uopts.silent === true,
      tokens: tokens,
      statements: [],
    };
    this.#units.push(unit);
    const cursor = {pos: 0};
    const tokens_len = tokens.length;
    while (cursor.pos < tokens_len) {
      if (tokens[cursor.pos].type === LEXER.Delimiter) {
        ++cursor.pos;
        continue;
      }
      const start_pos = cursor.pos;
      try {
        const stmt = uopts.isData === true
          ? this.#parseDataItem(unit, cursor)
          : this.#parseStatement(unit, cursor, uopts);
        if (stmt !== null) {
          unit.statements.push(stmt);
        }
      } catch (err) {
        if (!this.#tolerates()) {
          throw err;
        }
        // Error recovery: skip one token and retry from there
        cursor.pos = start_pos + 1;
        continue;
      }
      // Safety: always make progress
      if (cursor.pos === start_pos) {
        ++cursor.pos;
      }
    }
    return unit;
  }

  #parseDataItem(unit: ASTUnit, cursor: {pos: number}): ASTNode | null {
    const expr = this.#parseExpression(unit, cursor, 0);
    if (expr.node === NODE.Missing) {
      return null;
    }
    return {node: NODE.ExpressionStatement, token: expr.token, expr: expr};
  }

  #parseStatement(unit: ASTUnit, cursor: {pos: number}, uopts: UnitOptions): ASTNode | null {
    let silent = uopts.silent === true;
    let token = unit.tokens[cursor.pos];
    if (token.type === LEXER.Silent) {
      silent = true;
      ++cursor.pos;
      token = unit.tokens[cursor.pos];
      if (typeof token === 'undefined' || token.type === LEXER.Delimiter) {
        return null;
      }
    }

    switch (token.type) {
      case LEXER.Function:
        return this.#parseFunctionDef(unit, cursor);
      case LEXER.If:
        return this.#parseIf(unit, cursor);
      case LEXER.For:
        return this.#parseFor(unit, cursor);
      case LEXER.Return: {
        ++cursor.pos;
        const next = unit.tokens[cursor.pos];
        let expr: ASTNode | null = null;
        if (typeof next !== 'undefined' && next.type !== LEXER.Delimiter) {
          expr = this.#parseExpression(unit, cursor, 0);
        }
        return {node: NODE.Return, token: token, expr: expr, tokenIndex: this.#ti(unit, token)};
      }
      case LEXER.Break:
        ++cursor.pos;
        return {node: NODE.Break, token: token, tokenIndex: this.#ti(unit, token)};
      case LEXER.Continue:
        ++cursor.pos;
        return {node: NODE.Continue, token: token, tokenIndex: this.#ti(unit, token)};
      case LEXER.Block: {
        ++cursor.pos;
        const sub = this.#subUnit(token.value, token.start + 1, {isData: false, silent: false});
        return {node: NODE.BlockStatement, token: token, tokenIndex: this.#ti(unit, token), unit: sub};
      }
      case LEXER.VariableCall: {
        ++cursor.pos;
        const args = this.#parseCommandArgs(unit, cursor);
        return {
          node: NODE.VarCallStatement,
          token: token,
          tokenIndex: this.#ti(unit, token),
          name: token.value,
          args: args,
          silent: silent,
        };
      }
      case LEXER.String:
      case LEXER.StringSimple: {
        const raw_san = token.raw.trim();
        if (raw_san[0] !== SYMBOLS.STRING && raw_san[0] !== SYMBOLS.STRING_SIMPLE) {
          // Bare word at statement start: command call
          ++cursor.pos;
          const can_name = this.#services.getCanonicalCommandName(token.value, this.#options.registeredCmds || {});
          const args = this.#parseCommandArgs(unit, cursor);
          return {
            node: NODE.CommandCall,
            token: token,
            tokenIndex: this.#ti(unit, token),
            name: typeof can_name === 'undefined' ? token.value : can_name,
            args: args,
            silent: silent,
          };
        }
        break;
      }
    }

    // Expression statement or assignment
    const expr = this.#parseExpression(unit, cursor, 0, uopts.exprContext !== true);
    if (expr.node === NODE.Missing) {
      if (!this.#tolerates()) {
        this.#throwToken(token);
      }
      return null;
    }
    const next = unit.tokens[cursor.pos];
    if (typeof next !== 'undefined' && ASSIGN_TOKENS.has(next.type)) {
      if (expr.node !== NODE.Variable && expr.node !== NODE.Subscript) {
        this.#throwToken(next);
      }
      ++cursor.pos;
      let value: ASTNode | null = null;
      if (next.type !== LEXER.Increment && next.type !== LEXER.Decrement) {
        value = this.#parseExpression(unit, cursor, 0);
      }
      return {
        node: NODE.Assignment,
        token: next,
        tokenIndex: this.#ti(unit, next),
        target: expr,
        value: value,
      };
    }
    return {node: NODE.ExpressionStatement, token: expr.token, expr: expr};
  }

  #parseCommandArgs(unit: ASTUnit, cursor: {pos: number}): Array<CommandArg> {
    const args: Array<CommandArg> = [];
    for (;;) {
      const token = unit.tokens[cursor.pos];
      if (typeof token === 'undefined' || token.type === LEXER.Delimiter) {
        break;
      }
      if (token.type === LEXER.ArgumentShort || token.type === LEXER.ArgumentLong) {
        ++cursor.pos;
        args.push({argToken: token, argTokenIndex: this.#ti(unit, token), value: null});
        continue;
      }
      const expr = this.#parseExpression(unit, cursor, 0);
      if (expr.node === NODE.Missing) {
        this.#throwToken(token);
      }
      args.push({argToken: null, argTokenIndex: -1, value: expr});
    }
    return args;
  }

   
  #parsePrimary(unit: ASTUnit, cursor: {pos: number}): ASTNode {
    const token = unit.tokens[cursor.pos];
    if (typeof token === 'undefined' || token.type === LEXER.Delimiter) {
      return {node: NODE.Missing, token: null};
    }
    const ti = this.#ti(unit, token);
    switch (token.type) {
      case LEXER.Number:
        ++cursor.pos;
        return {node: NODE.Literal, token, tokenIndex: ti, literal: Number(token.value)};
      case LEXER.Boolean:
        ++cursor.pos;
        return {node: NODE.Literal, token, tokenIndex: ti, literal: token.value.toLocaleLowerCase() === 'true'};
      case LEXER.Null:
        ++cursor.pos;
        return {node: NODE.Literal, token, tokenIndex: ti, literal: null};
      case LEXER.String:
      case LEXER.StringSimple:
        ++cursor.pos;
        return {node: NODE.Literal, token, tokenIndex: ti, literal: token.value};
      case LEXER.Variable:
        ++cursor.pos;
        return {node: NODE.Variable, token, tokenIndex: ti, name: token.value};
      case LEXER.VariableCall:
        ++cursor.pos;
        return {node: NODE.VarCall, token, tokenIndex: ti, name: token.value};
      case LEXER.Array: {
        ++cursor.pos;
        const sub = this.#subUnit(token.value, token.start + 1, {isData: true, silent: true});
        const items = sub.statements.map(st => st.expr).filter(Boolean);
        return {node: NODE.ArrayExpr, token, tokenIndex: ti, unit: sub, items: items};
      }
      case LEXER.Dictionary: {
        ++cursor.pos;
        const sub = this.#subUnit(token.value, token.start + 1, {isData: true, silent: true});
        const flat = sub.statements.map(st => st.expr).filter(Boolean);
        const entries: Array<[ASTNode, ASTNode]> = [];
        for (let i = 0; i + 1 < flat.length; i += 2) {
          entries.push([flat[i], flat[i + 1]]);
        }
        return {node: NODE.DictExpr, token, tokenIndex: ti, unit: sub, entries: entries};
      }
      case LEXER.LogicBlock: {
        ++cursor.pos;
        const sub = this.#subUnit(token.value, token.start + 1, {isData: false, silent: true, exprContext: true});
        return {node: NODE.InlineUnit, token, tokenIndex: ti, unit: sub};
      }
      case LEXER.Function:
        return this.#parseFunctionDef(unit, cursor);
      case LEXER.Negative: {
        ++cursor.pos;
        const operand = this.#parsePostfix(unit, cursor, this.#parsePrimary(unit, cursor));
        return {node: NODE.Unary, token, tokenIndex: ti, op: LEXER.Negative, expr: operand};
      }
      case LEXER.Not: {
        ++cursor.pos;
        const operand = this.#parsePostfix(unit, cursor, this.#parsePrimary(unit, cursor));
        return {node: NODE.Unary, token, tokenIndex: ti, op: LEXER.Not, expr: operand};
      }
      case LEXER.Unknown:
        if (!this.#tolerates()) {
          this.#throwToken(token);
        }
        // Legacy fall-through behaviour: treat as variable load
        ++cursor.pos;
        return {node: NODE.Variable, token, tokenIndex: ti, name: token.value};
    }
    return {node: NODE.Missing, token: token};
  }

  #parsePostfix(unit: ASTUnit, cursor: {pos: number}, base: ASTNode): ASTNode {
    let res = base;
    for (;;) {
      const token = unit.tokens[cursor.pos];
      if (typeof token === 'undefined' || token.type !== LEXER.DataAttribute) {
        break;
      }
      ++cursor.pos;
      const sub = this.#subUnit(token.value, token.start + 1, {isData: true, silent: true});
      res = {node: NODE.Subscript, token, tokenIndex: this.#ti(unit, token), base: res, index: sub};
    }
    return res;
  }

  #parseExpression(unit: ASTUnit, cursor: {pos: number}, min_bp: number, stop_on_assign?: boolean): ASTNode {
    let left = this.#parsePostfix(unit, cursor, this.#parsePrimary(unit, cursor));
    if (left.node === NODE.Missing) {
      return left;
    }
    const update_token = unit.tokens[cursor.pos];
    if (
      stop_on_assign !== true &&
      typeof update_token !== 'undefined' &&
      (update_token.type === LEXER.Increment || update_token.type === LEXER.Decrement)
    ) {
      // Postfix update as expression: yields the OLD value. Restricted to
      // plain variables (STORE_SUBSCR would leave the container on the stack)
      if (left.node !== NODE.Variable) {
        this.#throwToken(update_token);
      }
      ++cursor.pos;
      left = {
        node: NODE.PostfixUpdate,
        token: update_token,
        tokenIndex: this.#ti(unit, update_token),
        target: left,
      };
    }
    for (;;) {
      const token = unit.tokens[cursor.pos];
      if (typeof token === 'undefined' || token.type === LEXER.Delimiter) {
        break;
      }
      if (stop_on_assign === true && ASSIGN_TOKENS.has(token.type)) {
        break;
      }
      const bp = BINARY_BP.get(token.type);
      if (typeof bp === 'undefined' || bp < min_bp) {
        break;
      }
      ++cursor.pos;
      const right = this.#parseExpression(unit, cursor, bp + 1);
      left = {
        node: NODE.Binary,
        token: token,
        tokenIndex: this.#ti(unit, token),
        op: token.type,
        left: left,
        right: right.node === NODE.Missing ? null : right,
      };
    }
    return left;
  }

  #parseFunctionDef(unit: ASTUnit, cursor: {pos: number}): ASTNode {
    const fun_token = unit.tokens[cursor.pos];
    let token = unit.tokens[++cursor.pos];
    if (typeof token === 'undefined') {
      this.#throwToken(fun_token);
    }

    let fun_name: string | void;
    let fun_args: Array<ArgDef> = [];
    let active_value = token.raw.trim();
    if (active_value.startsWith(SYMBOLS.FUNCTION_ARGS_START)) {
      // Anonymous function
      fun_args = this.#parseFunctionParams(token.value.trim());
    } else {
      fun_name = active_value;
      token = unit.tokens[++cursor.pos];
      if (typeof token === 'undefined') {
        this.#throwToken(fun_token);
      }
      active_value = token.value.trim();
      fun_args = this.#parseFunctionParams(active_value);
    }

    // Code block
    token = unit.tokens[++cursor.pos];
    if (typeof token === 'undefined' || token.type !== LEXER.Block) {
      this.#throwToken(fun_token);
    }
    ++cursor.pos;
    const fun_code = this.#services.compile(token.value.trim(), this.#options);
    return {
      node: typeof fun_name === 'undefined' ? NODE.AnonFunction : NODE.FunctionDef,
      token: fun_token,
      tokenIndex: this.#ti(unit, fun_token),
      endTokenIndex: this.#ti(unit, token),
      funcName: fun_name,
      funcArgs: fun_args,
      funcCode: fun_code,
    };
  }

  #parseFunctionParams(value: string): Array<ArgDef> {
    if (value.length === 0) {
      return [];
    }
    return value.split(',').map(item => {
      // eslint-disable-next-line prefer-const
      let [varass, vardef] = item.split('=');
      vardef = vardef && vardef.trim();
      let cdefault: mixed;
      if (vardef) {
        cdefault = this.#services.compile(vardef, this.#options);
      }
      let [varname, vartype] = varass.split(':');
      varname = varname && varname.trim();
      vartype = vartype && vartype.trim();
      const vartypes = vartype?.split('|');
      let svartype = 0;
      if (vartypes?.length > 0) {
        for (const vtype of vartypes) {
          if (Object.hasOwn(ARG, vtype)) {
            svartype |= ARG[vtype];
          }
        }
      }
      if (svartype === 0) {
        svartype = ARG.Any;
      }
      return [svartype, [varname, varname], false, i18n.t('cmdFuncTrash.args.name', 'The function parameter'), cdefault];
    });
  }

  #parseIf(unit: ASTUnit, cursor: {pos: number}): ASTNode {
    const if_token = unit.tokens[cursor.pos];
    const branches: Array<{check: ASTUnit, body: ASTUnit}> = [];

    const readBranch = (): {check: ASTUnit, body: ASTUnit} => {
      const check_token = unit.tokens[++cursor.pos];
      if (typeof check_token === 'undefined' || check_token.type !== LEXER.LogicBlock) {
        this.#throwToken(if_token);
      }
      const body_token = unit.tokens[++cursor.pos];
      if (typeof body_token === 'undefined' || body_token.type !== LEXER.Block) {
        this.#throwToken(if_token);
      }
      const check = this.#subUnit(check_token.value, check_token.start + 1, {isData: false, silent: true, exprContext: true});
      const body = this.#subUnit(body_token.value, body_token.start + 1, {isData: false, silent: false});
      return {check, body};
    };

    branches.push(readBranch());
    ++cursor.pos;
    while (typeof unit.tokens[cursor.pos] !== 'undefined' && unit.tokens[cursor.pos].type === LEXER.Elif) {
      branches.push(readBranch());
      ++cursor.pos;
    }

    let elseBody: ASTUnit | void;
    const else_token = unit.tokens[cursor.pos];
    if (typeof else_token !== 'undefined' && else_token.type === LEXER.Else) {
      const body_token = unit.tokens[++cursor.pos];
      if (typeof body_token === 'undefined' || body_token.type !== LEXER.Block) {
        this.#throwToken(if_token);
      }
      ++cursor.pos;
      elseBody = this.#subUnit(body_token.value, body_token.start + 1, {isData: false, silent: false});
    }

    return {
      node: NODE.If,
      token: if_token,
      tokenIndex: this.#ti(unit, if_token),
      branches: branches,
      elseBody: elseBody,
    };
  }

  #parseFor(unit: ASTUnit, cursor: {pos: number}): ASTNode {
    const for_token = unit.tokens[cursor.pos];
    const head_token = unit.tokens[++cursor.pos];
    if (
      typeof head_token === 'undefined' ||
      !head_token.raw.trim().startsWith(SYMBOLS.FUNCTION_ARGS_START)
    ) {
      this.#throwToken(for_token);
    }
    const sections = head_token.value.split(';');
    if (sections.length === 1) {
      return this.#parseForIn(unit, cursor, for_token, head_token);
    }
    if (sections.length !== 3) {
      this.#throwToken(for_token);
    }
    const body_token = unit.tokens[++cursor.pos];
    if (typeof body_token === 'undefined' || body_token.type !== LEXER.Block) {
      this.#throwToken(for_token);
    }
    ++cursor.pos;

    const offset = head_token.start + 1;
    const init = this.#subUnit(sections[0], offset, {isData: false, silent: true}, SYMBOLS.ITEM_DELIMITER);
    const check = this.#subUnit(sections[1], offset, {isData: false, silent: true, exprContext: true});
    const body = this.#subUnit(body_token.value, body_token.start + 1, {isData: false, silent: false});
    const iter = this.#subUnit(sections[2], offset, {isData: false, silent: true}, SYMBOLS.ITEM_DELIMITER);

    return {
      node: NODE.For,
      token: for_token,
      tokenIndex: this.#ti(unit, for_token),
      init: init,
      check: check,
      iter: iter,
      body: body,
    };
  }

  // for ($item in <iterable-expr>) { ... } — arrays/strings only
  #parseForIn(unit: ASTUnit, cursor: {pos: number}, for_token: TokenInfo, head_token: TokenInfo): ASTNode {
    const head_tokens = this.#subTokens(head_token.value, head_token.start + 1, {isData: false});
    const head: ASTUnit = {
      id: this.#units.length,
      silent: true,
      tokens: head_tokens,
      statements: [],
    };
    this.#units.push(head);

    const item_token = head_tokens[0];
    const in_token = head_tokens[1];
    if (
      typeof item_token === 'undefined' ||
      item_token.type !== LEXER.Variable ||
      typeof in_token === 'undefined' ||
      (in_token.type !== LEXER.String && in_token.type !== LEXER.StringSimple) ||
      in_token.value !== 'in' ||
      in_token.raw.trim()[0] === SYMBOLS.STRING ||
      in_token.raw.trim()[0] === SYMBOLS.STRING_SIMPLE
    ) {
      this.#throwToken(for_token);
    }
    const head_cursor = {pos: 2};
    const iterable = this.#parseExpression(head, head_cursor, 0);
    if (iterable.node === NODE.Missing) {
      this.#throwToken(for_token);
    }

    const body_token = unit.tokens[++cursor.pos];
    if (typeof body_token === 'undefined' || body_token.type !== LEXER.Block) {
      this.#throwToken(for_token);
    }
    ++cursor.pos;
    const body = this.#subUnit(body_token.value, body_token.start + 1, {isData: false, silent: false});

    return {
      node: NODE.ForIn,
      token: for_token,
      tokenIndex: this.#ti(unit, for_token),
      name: item_token.value,
      endTokenIndex: 0, // item token position within the head unit
      unit: head,
      expr: iterable,
      body: body,
    };
  }

  #ti(unit: ASTUnit, token: TokenInfo): number {
    return unit.tokens.indexOf(token);
  }
}

function isFalsyOpt(val: mixed): boolean {
  return val === null || typeof val === 'undefined' || val === false;
}
