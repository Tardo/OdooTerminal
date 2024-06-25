// @flow strict
// Copyright  Alexandre Díaz <dev@redneboa.es>
// License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).

import getOdooService from './utils/get_odoo_service';
import getOdooVersion from './utils/get_odoo_version';
import getUserTZ from './utils/get_user_tz';

/**
 * This class is used to generate values for terminal command parameters.
 */
export default class ParameterGenerator {
  // $FlowFixMe
  #rndLetter = {
    [Symbol.iterator]: function* () {
      const characters = 'bcdfghjklmnpqrstvwxyz ';
      const vocals = 'aeiou';
      const characters_length = characters.length;
      const vocals_length = vocals.length;
      let cur_char = '';
      let last_char = '';
      let count = 0;
      let cc_count = 0;

      const isVocal = (letter: string) => vocals.indexOf(letter) !== -1;

      for (;;) {
        if (cc_count % 2 !== 0 && (!last_char || isVocal(last_char))) {
          cur_char = characters.charAt(Math.floor(Math.random() * characters_length));
          cc_count = 0;
        } else {
          cur_char = vocals.charAt(Math.floor(Math.random() * vocals_length));
          ++cc_count;
        }

        if (count === 0 || last_char === ' ') {
          cur_char = cur_char.toUpperCase();
        }
        if (cur_char !== last_char) {
          last_char = cur_char;
          ++count;
          yield cur_char;
        }
      }
    },
  };

  generateEmail(min: number, max: ?number): string {
    const email_name = this.generateString(min, max);
    const email_domain_a = this.generateString(min, max);
    const email_domain_b = this.generateString(2, 3);
    return `${email_name}@${email_domain_a}.${email_domain_b}`.replaceAll(' ', '').toLowerCase();
  }

  generateUrl(min: number, max: ?number): string {
    const url = this.generateString(min, max);
    const ext = this.generateString(2, 3);
    return `https://www.${url}.${ext}`.replaceAll(' ', '').toLowerCase();
  }

  generateFloat(min: number, max: ?number): number {
    const min_s = typeof max === 'undefined' ? 0 : Number(min);
    const max_s = typeof max === 'undefined' ? Number(min) : Number(max);
    return Number((Math.random() * (max_s - min_s + 1.0) + min_s).toFixed(2));
  }

  generateInt(min: number, max: ?number): number {
    const min_s = typeof max === 'undefined' ? 0 : Number(min);
    const max_s = typeof max === 'undefined' ? Number(min) : Number(max);
    return parseInt(Math.floor(Math.random() * (max_s - min_s + 1) + min_s), 10);
  }

  generateIntSeq(min: number, max: ?number): $ReadOnlyArray<number> {
    const min_s = typeof max === 'undefined' ? 0 : Number(min);
    const max_s = typeof max === 'undefined' ? Number(min) : Number(max);
    const numbers = [];
    for (let i = min_s; i <= max_s; ++i) {
      numbers.push(i);
    }
    return numbers;
  }

  generateString(min: number, max: ?number): string {
    const rlen = this.generateInt(min, max);
    let result = '';
    let index = 0;
    for (const letter of this.#rndLetter) {
      if (index >= rlen) {
        break;
      }
      result += letter;
      ++index;
    }
    return result;
  }

  // $FlowFixMe
  generateTzDate(min: number, max: ?number): Object {
    const OdooVerMajor = getOdooVersion('major');
    const rdate = this.generateInt(min, max);
    if (typeof OdooVerMajor === 'number' && OdooVerMajor >= 17) {
      return getOdooService('@web/core/l10n/dates').formatDate(
        // $FlowFixMe
        luxon.DateTime.fromSeconds(rdate, {zone: 'utc'}).setZone(getUserTZ()),
      );
    }
    // $FlowFixMe
    return moment(new Date(rdate)).format(getOdooService('web.time').getLangDateFormat());
  }

  // $FlowFixMe
  generateDate(min: number, max: ?number): Object {
    const OdooVerMajor = getOdooVersion('major');
    const rdate = this.generateInt(min, max);
    if (typeof OdooVerMajor === 'number' && OdooVerMajor >= 17) {
      // $FlowFixMe
      return getOdooService('@web/core/l10n/dates').serializeDate(luxon.DateTime.fromSeconds(rdate, {zone: 'utc'}));
    }
    return getOdooService('web.time').date_to_str(new Date(rdate));
  }

  // $FlowFixMe
  generateTzDateTime(min: number, max: ?number): Object {
    const rdate = this.generateInt(min, max);
    const OdooVerMajor = getOdooVersion('major');
    if (typeof OdooVerMajor === 'number' && OdooVerMajor >= 17) {
      return getOdooService('@web/core/l10n/dates').formatDateTime(
        // $FlowFixMe
        luxon.DateTime.fromSeconds(rdate, {zone: 'utc'}).setZone(getUserTZ()),
      );
    }
    // $FlowFixMe
    return moment(new Date(rdate)).format(getOdooService('web.time').getLangDatetimeFormat());
  }

  // $FlowFixMe
  generateDateTime(min: number, max: ?number): Object {
    const rdate = this.generateInt(min, max);
    const OdooVerMajor = getOdooVersion('major');
    if (typeof OdooVerMajor === 'number' && OdooVerMajor >= 17) {
      // $FlowFixMe
      return getOdooService('@web/core/l10n/dates').serializeDateTime(luxon.DateTime.fromSeconds(rdate, {zone: 'utc'}));
    }
    return getOdooService('web.time').datetime_to_str(new Date(rdate));
  }

  // $FlowFixMe
  generateTzTime(min: number, max: ?number): Object {
    const OdooVerMajor = getOdooVersion('major');
    const rdate = this.generateInt(min, max);
    if (typeof OdooVerMajor === 'number' && OdooVerMajor >= 17) {
      const dt = this.generateTzDateTime(min, max);
      return dt.split(' ')[1];
    }
    // $FlowFixMe
    return moment(new Date(rdate)).format(getOdooService('web.time').getLangTimeFormat());
  }

  // $FlowFixMe
  generateTime(min: number, max: ?number): Object {
    const OdooVerMajor = getOdooVersion('major');
    const rdate = this.generateInt(min, max);
    if (typeof OdooVerMajor === 'number' && OdooVerMajor >= 17) {
      const dt = this.generateDateTime(min, max);
      return dt.split(' ')[1];
    }
    return getOdooService('web.time').time_to_str(new Date(rdate));
  }
}
