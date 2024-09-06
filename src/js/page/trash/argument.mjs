// @flow strict
// Copyright  Alexandre Díaz <dev@redneboa.es>
// License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).

// $FlowIgnore
import i18n from 'i18next';
import {ARG} from './constants';
import difference from './utils/difference';
import isEmpty from './utils/is_empty';
import isFalsy from './utils/is_falsy';
import type {ArgDef, ArgInfo, CMDDef, ParseInfo} from './interpreter';
import type {default as VMachine, EvalOptions} from './vmachine';
import type Frame from './frame';
import { FUNCTION_TYPE } from './function.mjs';

/**
 * Resolve argument information
 */
export function getArgumentInfo(arg: ArgDef | void): ArgInfo | null {
  if (typeof arg === 'undefined') {
    return null;
  }
  const [type, names, is_required, descr, default_value, strict_values] = arg;
  const [short_name, long_name] = names;
  const list_mode = (type & ARG.List) === ARG.List;
  return {
    type: type,
    names: {
      short: short_name,
      long: long_name,
    },
    description: descr,
    default_value: default_value,
    strict_values: strict_values,
    is_required: Boolean(Number(is_required)),
    list_mode: list_mode,
    raw: arg,
  };
}

/**
 * @param {Array} args
 * @param {String} arg_name
 * @returns {Object}
 */
export function getArgumentInfoByName(args: $ReadOnlyArray<ArgDef>, arg_name: string): ArgInfo | null {
  for (const arg of args) {
    const [short_name, long_name] = arg[1];
    if (short_name === arg_name || long_name === arg_name) {
      return getArgumentInfo(arg);
    }
  }

  return null;
}

function sanitizeArgumentValue(val: mixed, arg_type: number): mixed {
  if (isEmpty(val)) {
    return val;
  }

  // Allow declare arrays in old format
  if (!(val instanceof Array) && (arg_type & ARG.List) === ARG.List) {
    const item_type = arg_type & ~ARG.List;
    if (typeof val === 'string') {
      return val.split(',').map(item => ARG.cast(item.trim(), item_type));
    }
    return [val];
  }

  return (typeof val === 'string') ? ARG.cast(val.trim(), arg_type) : val;
}

function checkArgumentValueType(val: mixed, arg_type: number) {
  if (arg_type === ARG.Any) {
    return true;
  }

  if ((arg_type & ARG.List) === ARG.List) {
    if (ARG.getType(val) !== ARG.List) {
      return false;
    }
    const item_type = arg_type & ~ARG.List;
    if (item_type === ARG.Any) {
      return true;
    }
    if (val instanceof Array) {
      for (const item of val) {
        const citem_type = ARG.getType(item);
        if ((citem_type & item_type) !== item_type) {
          return false;
        }
      }
    }
    return true;
  }

  const carg_type = ARG.getType(val);
  return (arg_type & carg_type) === carg_type;
}

/**
 * Check if the parameter type correspond with the expected type.
 */
export async function validateAndFormatArguments(cmd_def: CMDDef, kwargs: {[string]: mixed}, vmachine: VMachine, opts: EvalOptions, aframe?: Frame): Promise<{[string]: mixed}> {
  // Map full info arguments
  const args_infos_map: Array<[string, ArgInfo]> = cmd_def.args
    .map(x => getArgumentInfo(x))
    .filter(x => x !== null)
    // $FlowFixMe
    .map(x => [x.names.long, x]);
  const args_infos = Object.fromEntries(args_infos_map);

  // Normalize Names
  const in_arg_names = Object.keys(kwargs);
  let full_kwargs: {[string]: mixed} = {};
  for (const arg_name of in_arg_names) {
    const arg_info = getArgumentInfoByName(cmd_def.args, arg_name);
    if (!arg_info) {
      throw new Error(i18n.t('trash.argument.noExist', "The argument '{{arg_name}}' does not exist", {arg_name}));
    }
    full_kwargs[arg_info.names.long] = [sanitizeArgumentValue(kwargs[arg_name], arg_info.type), false];
  }

  // Get default/required values/args
  const default_values_map: Array<[string, mixed]> = [];
  const required_args: Array<string> = [];
  for (const arg_name in args_infos) {
    const arg_def = args_infos[arg_name];
    if (typeof arg_def.default_value !== 'undefined') {
      let def_val: ParseInfo | mixed = arg_def.default_value;
      if (cmd_def.type === FUNCTION_TYPE.Native) {
        // $FlowIgnore
        def_val = await vmachine.execute(def_val, opts, aframe);
      }
      default_values_map.push([arg_name, [def_val, true]]);
    }
    if (arg_def.is_required) {
      required_args.push(arg_def.names.long);
    }
  }
  // Apply default values
  const default_values = default_values_map.length === 0 ? {} : Object.fromEntries(default_values_map);
  full_kwargs = Object.assign(default_values, full_kwargs);

  if (Object.keys(full_kwargs).length === 0) {
    return full_kwargs;
  }

  // Check required
  const full_kwargs_keys = Object.keys(full_kwargs);
  const required_not_set = difference(required_args, full_kwargs_keys).map(item => `--${item}`);
  if (required_not_set.length) {
    throw new Error(
      i18n.t('trash.argument.requiredNotSet', 'Required arguments not set! ({{required_not_set}})', {
        required_not_set: required_not_set.join(','),
      }),
    );
  }

  // Use full argument name
  const arg_names = Object.keys(full_kwargs);
  const new_kwargs: {[string]: mixed} = {};
  for (const arg_name of arg_names) {
    const arg_info = args_infos[arg_name];
    const [arg_value, is_default] = full_kwargs[arg_name];
    const arg_long_name = arg_info.names.long;
    const s_arg_long_name = arg_long_name.replaceAll('-', '_');
    if (!is_default && !checkArgumentValueType(arg_value, arg_info.type)) {
      // $FlowFixMe
      const value_type = isFalsy(arg_value) ? 'null/undefined' : arg_value.constructor?.name;
      throw new Error(
        i18n.t(
          'trash.argument.invalid',
          "Invalid argument '{{arg_long_name}}' value type: {{value_type}} is not {{arg_type}}",
          {
            arg_long_name,
            value_type: value_type,
            arg_type: ARG.getHumanType(arg_info.type),
          },
        ),
      );
    }
    new_kwargs[s_arg_long_name] = arg_value;
  }

  return new_kwargs;
}

export function getArgumentInputCount(args: $ReadOnlyArray<ArgDef>, required: boolean = false): number {
  let count = 0;
  for (const arg of args) {
    const arg_def = getArgumentInfo(arg);
    if (arg_def !== null && arg_def.type !== ARG.Flag && (!required || arg_def.is_required)) {
      ++count;
    }
  }
  return count;
}
