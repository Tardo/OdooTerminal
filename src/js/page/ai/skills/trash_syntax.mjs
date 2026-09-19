// @flow strict
// Copyright  Alexandre Díaz <dev@redneboa.es>
// License MIT (https://opensource.org/license/mit).

import {buildScriptingPrompt} from '@ai/prompts/trash';
import type {SkillDef} from '@ai/skills/__all__';


const skill: SkillDef = {
  name: 'trash-syntax',
  description: 'Control flow (if/for/break/continue/return), functions (named, anonymous, higher-order), built-in stdlib (arr_*, dict_*, math, time, encoding, network), and complete examples. Load before writing any script with loops, functions, or stdlib calls.',
  content: (): string => buildScriptingPrompt(),
};

export default skill;
