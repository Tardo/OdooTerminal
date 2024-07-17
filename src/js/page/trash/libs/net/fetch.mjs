// @flow strict
// Copyright  Alexandre Díaz <dev@redneboa.es>
// License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).

// $FlowIgnore
import i18n from 'i18next';
import {ARG} from '@trash/constants';
import type {CMDCallbackArgs, CMDDef} from '@trash/interpreter';
import type VMachine from '@trash/vmachine';

async function funcFetch(vmachine: VMachine, kwargs: CMDCallbackArgs): Promise<Response | void | false> {
  if (typeof kwargs.timeout !== 'undefined') {
    const controller = new AbortController();
    const prom = fetch(
      kwargs.url,
      Object.assign({signal: controller.signal}, kwargs.options),
    );
    setTimeout(() => controller.abort('timeout'), kwargs.timeout);
    let res;
    try {
      res = await prom;
    } catch (err) {
      // FIXME: This is necessary because TraSH does not handle exceptions.
      // If it is null it is an unhandled exception failure.
      if (err === 'timeout') {
        return false;
      }
      throw err;
    }
    return res;
  }
  return await fetch(
    kwargs.url,
    kwargs.options,
  );
}

export default function (): Partial<CMDDef> {
  return {
    definition: i18n.t('funcFetch.definition', 'HTTP requests'),
    callback_internal: funcFetch,
    is_function: true,
    detail: i18n.t('funcFetch.detail', 'Interface for making HTTP requests and processing the responses.'),
    args: [
      [ARG.String, ['u', 'url'], true, i18n.t('funcFetch.args.url', 'The URL')],
      [ARG.Dictionary, ['o', 'options'], false, i18n.t('funcFetch.args.url', 'The fetch options')],
      [ARG.Number, ['t', 'timeout'], false, i18n.t('funcFetch.args.timeout', 'The timeout')],
    ],
    example: "-u /icon/ -o {method:'HEAD'}",
  };
}
