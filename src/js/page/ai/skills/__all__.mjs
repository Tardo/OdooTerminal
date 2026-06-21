// @flow strict
// Copyright  Alexandre Díaz <dev@redneboa.es>
// License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).

import accountingSkill from './accounting';
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
];

export default SKILLS;
