// @flow strict
// Copyright  Alexandre Díaz <dev@redneboa.es>
// License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).

import genHash from './gen_hash';
import hex2rgb from './hex2rgb';
import type {RGB} from './hex2rgb';

export default function (str: string): RGB {
  return hex2rgb(genHash(str));
}
