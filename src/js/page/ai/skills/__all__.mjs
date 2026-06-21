// @flow strict
// Copyright  Alexandre Díaz <dev@redneboa.es>
// License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).

import accountingSkill from './accounting';
import instanceSkill from './instance';


export type SkillDef = {
  name: string,
  description: string,
  content: (majorVersion: number) => string,
};

const SKILLS: $ReadOnlyArray<SkillDef> = [
  instanceSkill,
  accountingSkill,
];

export default SKILLS;
