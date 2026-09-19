// @flow strict
// Copyright  Alexandre Díaz <dev@redneboa.es>
// License MIT (https://opensource.org/license/mit).

import accountingSkill from './accounting';
import graphicsSkill from './graphics';
import instanceSkill from './instance';
import trashSyntaxSkill from './trash_syntax';


export type SkillDef = {
  name: string,
  description: string,
  content: (majorVersion: number) => string,
};

const SKILLS: $ReadOnlyArray<SkillDef> = [
  trashSyntaxSkill,
  instanceSkill,
  accountingSkill,
  graphicsSkill,
];

export default SKILLS;
