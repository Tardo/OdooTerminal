// Copyright  Alexandre Díaz <dev@redneboa.es>
// License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).

import getOdooService from './utils/get_odoo_service';

/**
 * This class is used to generate values for terminal command parameters.
 */
export default class ParameterGenerator {
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

      const isVocal = letter => vocals.indexOf(letter) !== -1;

      for (;;) {
        if (cc_count % 2 !== 0 && (!last_char || isVocal(last_char))) {
          cur_char = characters.charAt(
            Math.floor(Math.random() * characters_length),
          );
          ++cc_count;
        } else {
          cur_char = vocals.charAt(Math.floor(Math.random() * vocals_length));
          cc_count = 0;
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

  generateEmail(min, max) {
    if (typeof min === 'undefined') {
      return false;
    }
    const email_name = this.generateString(min, max);
    const email_domain_a = this.generateString(min, max);
    const email_domain_b = this.generateString(2, 3);
    return `${email_name}@${email_domain_a}.${email_domain_b}`
      .replaceAll(' ', '')
      .toLowerCase();
  }

  generateUrl(min, max) {
    if (typeof min === 'undefined') {
      return false;
    }
    const url = this.generateString(min, max);
    const ext = this.generateString(2, 3);
    return `https://www.${url}.${ext}`.replaceAll(' ', '').toLowerCase();
  }

  generateFloat(min, max) {
    if (typeof min === 'undefined') {
      return false;
    }
    const min_s = typeof max === 'undefined' ? 0 : Number(min);
    const max_s = typeof max === 'undefined' ? Number(min) : Number(max);
    return Number((Math.random() * (max_s - min_s + 1.0) + min_s).toFixed(2));
  }

  generateInt(min, max) {
    if (typeof min === 'undefined') {
      return false;
    }
    const min_s = typeof max === 'undefined' ? 0 : Number(min);
    const max_s = typeof max === 'undefined' ? Number(min) : Number(max);
    return Math.floor(Math.random() * (max_s - min_s + 1) + min_s);
  }

  generateIntSeq(min, max) {
    if (typeof min === 'undefined') {
      return false;
    }
    const min_s = typeof max === 'undefined' ? 0 : Number(min);
    const max_s = typeof max === 'undefined' ? Number(min) : Number(max);
    const numbers = [];
    for (let i = min_s; i <= max_s; ++i) {
      numbers.push(i);
    }
    return numbers;
  }

  generateString(min, max) {
    if (typeof min === 'undefined') {
      return false;
    }
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

  generateTzDate(min, max) {
    if (typeof min === 'undefined') {
      return false;
    }
    const rdate = this.generateInt(min, max);
    return moment(new Date(rdate)).format(
      getOdooService('web.time').getLangDateFormat(),
    );
  }

  generateDate(min, max) {
    if (typeof min === 'undefined') {
      return false;
    }
    const rdate = this.generateInt(min, max);
    return getOdooService('web.time').date_to_str(new Date(rdate));
  }

  generateTzTime(min, max) {
    if (typeof min === 'undefined') {
      return false;
    }
    const rdate = this.generateInt(min, max);
    return moment(new Date(rdate)).format(
      getOdooService('web.time').getLangTimeFormat(),
    );
  }

  generateTime(min, max) {
    if (typeof min === 'undefined') {
      return false;
    }
    const rdate = this.generateInt(min, max);
    return getOdooService('web.time').time_to_str(new Date(rdate));
  }

  generateTzDateTime(min, max) {
    if (typeof min === 'undefined') {
      return false;
    }
    const rdate = this.generateInt(min, max);
    return moment(new Date(rdate)).format(
      getOdooService('web.time').getLangDatetimeFormat(),
    );
  }

  generateDateTime(min, max) {
    if (typeof min === 'undefined') {
      return false;
    }
    const rdate = this.generateInt(min, max);
    return getOdooService('web.time').datetime_to_str(new Date(rdate));
  }
}
