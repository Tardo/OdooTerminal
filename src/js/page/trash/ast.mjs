// @flow strict
// Copyright  Alexandre Díaz <dev@redneboa.es>
// License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).

import type {ArgDef, ParseInfo, TokenInfo} from './interpreter';

export const NODE = {
  // Statements
  CommandCall: 1,
  VarCallStatement: 2,
  Assignment: 3,
  ExpressionStatement: 4,
  FunctionDef: 5,
  If: 6,
  For: 7,
  Return: 8,
  Break: 9,
  Continue: 10,
  BlockStatement: 11,
  ForIn: 12,
  // Expressions
  Literal: 20,
  Variable: 21,
  VarCall: 22,
  Unary: 23,
  Binary: 24,
  ArrayExpr: 25,
  DictExpr: 26,
  Subscript: 27,
  InlineUnit: 28,
  AnonFunction: 29,
  Missing: 30,
  PostfixUpdate: 31,
};

// A unit is one tokenized chunk of input: the root program or the inner
// content of a block/logic-block/array/dictionary/data-attribute. Each unit
// owns its token array and becomes one 'level' of the compiled program.
export type ASTUnit = {
  id: number,
  silent: boolean,
  tokens: Array<TokenInfo>,
  statements: Array<ASTNode>,
};

export type ASTNode = {
  node: number,
  // Token that anchors this node. The VM reads it at runtime for STORE
  // semantics and error positions, so it must map to the right unit token.
  token: TokenInfo | null,
  // Position of `token` within its unit token array (instr.inputTokenIndex)
  tokenIndex?: number,
  endTokenIndex?: number,
  // Statement flags
  silent?: boolean,
  // CommandCall / VarCallStatement
  name?: string,
  args?: Array<CommandArg>,
  // Assignment
  target?: ASTNode,
  value?: ASTNode | null,
  // ExpressionStatement / Return / Unary
  expr?: ASTNode | null,
  // FunctionDef / AnonFunction
  funcName?: string | void,
  funcArgs?: Array<ArgDef>,
  funcCode?: ParseInfo,
  // If
  branches?: Array<{check: ASTUnit, body: ASTUnit}>,
  elseBody?: ASTUnit | void,
  // For
  init?: ASTUnit,
  check?: ASTUnit,
  iter?: ASTUnit,
  body?: ASTUnit,
  // Literal
  literal?: mixed,
  // Unary / Binary
  op?: number,
  left?: ASTNode,
  right?: ASTNode | null,
  // ArrayExpr / DictExpr
  items?: Array<ASTNode>,
  entries?: Array<[ASTNode, ASTNode]>,
  // Subscript
  base?: ASTNode,
  index?: ASTUnit,
  // InlineUnit / BlockStatement / ArrayExpr / DictExpr / ForIn (loop header)
  unit?: ASTUnit,
};

export type CommandArg = {
  // Named argument marker (-x / --xxx). When null, it is a positional value.
  argToken: TokenInfo | null,
  argTokenIndex: number,
  value: ASTNode | null,
};
