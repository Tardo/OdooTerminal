// @flow strict
// Copyright  Alexandre Díaz <dev@redneboa.es>
// License MIT (https://opensource.org/license/mit).

import {buildScriptingPrompt} from '@ai/prompts/trash';
import type {SkillDef} from '@ai/skills/__all__';


const skill: SkillDef = {
  name: 'trash-syntax',
  description: 'TraSH 2.3.0: blocks/loops, lexical closures, callback references ($fn vs $$fn), execution limits, and stdlib 2.0.0 (arrays, dicts, strings, rounding, time, encoding, network). Load before writing blocks, loops, functions, or stdlib calls; basic ternaries are covered in the main prompt.',
  content: (): string => buildScriptingPrompt(),
};

export default skill;
