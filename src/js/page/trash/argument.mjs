// Copyright  Alexandre Díaz <dev@redneboa.es>
// License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).

import {ARG} from "./constants";
import difference from "./utils/difference";

/**
 * Resolve argument information
 *
 * @param {String} arg
 * @returns {Object}
 */
export function getArgumentInfo(arg) {
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
export function getArgumentInfoByName(args, arg_name) {
  for (const arg of args) {
    const [short_name, long_name] = arg[1];
    if (short_name === arg_name || long_name === arg_name) {
      return getArgumentInfo(arg);
    }
  }

  return null;
}

function sanitizeArgumentValue(val, arg_type) {
  if (!val) {
    return val;
  }

  // Allow declare arrays in old format
  const cname = val.constructor.name;
  if (cname !== "Array" && (arg_type & ARG.List) === ARG.List) {
    const item_type = arg_type & ~ARG.List;
    if (cname === "String") {
      return val.split(",").map((item) => ARG.cast(item.trim(), item_type));
    }
    return [val];
  }

  return val;
}

function checkArgumentValueType(val, arg_type) {
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
    for (const item of val) {
      const citem_type = ARG.getType(item);
      if ((citem_type & item_type) !== item_type) {
        return false;
      }
    }
    return true;
  }

  const carg_type = ARG.getType(val);
  return (arg_type & carg_type) === carg_type;
}

/**
 * Check if the parameter type correspond with the expected type.
 * @param {Object} cmd_def
 * @param {Object} kwargs
 * @returns {Boolean}
 */
export function validateAndFormatArguments(cmd_def, kwargs) {
  // Map full info arguments
  let args_infos = cmd_def.args
    .map((x) => getArgumentInfo(x))
    .map((x) => [x.names.long, x]);
  args_infos = Object.fromEntries(args_infos);

  // Normalize Names
  const in_arg_names = Object.keys(kwargs);
  let full_kwargs = {};
  for (const arg_name of in_arg_names) {
    const arg_info = getArgumentInfoByName(cmd_def.args, arg_name);
    if (!arg_info) {
      throw new Error(`The argument '${arg_name}' does not exist`);
    }
    full_kwargs[arg_info.names.long] = kwargs[arg_name];
  }

  // Get default/required values/args
  let default_values = [];
  const required_args = [];
  for (const arg_name in args_infos) {
    const arg_def = args_infos[arg_name];
    if (typeof arg_def.default_value !== "undefined") {
      default_values.push([arg_name, arg_def.default_value]);
    }
    if (arg_def.is_required) {
      required_args.push(arg_def.names.long);
    }
  }
  // Apply default values
  default_values =
    default_values.length === 0 ? {} : Object.fromEntries(default_values);
  full_kwargs = Object.assign(default_values, full_kwargs);

  if (Object.keys(full_kwargs).length === 0) {
    return full_kwargs;
  }

  // Check required
  const full_kwargs_keys = Object.keys(full_kwargs);
  const required_not_set = difference(required_args, full_kwargs_keys);
  if (required_not_set.length) {
    throw new Error(
      `Required arguments not set! (${required_not_set.join(",")})`
    );
  }

  // Use full argument name
  const arg_names = Object.keys(full_kwargs);
  const new_kwargs = {};
  for (const arg_name of arg_names) {
    const arg_info = args_infos[arg_name];
    const arg_value = sanitizeArgumentValue(
      full_kwargs[arg_name],
      arg_info.type
    );
    const arg_long_name = arg_info.names.long;
    const s_arg_long_name = arg_long_name.replaceAll("-", "_");
    if (!checkArgumentValueType(arg_value, arg_info.type)) {
      throw new Error(
        `Invalid argument '${arg_long_name}' value type: ${
          arg_value?.constructor?.name
        } is not ${ARG.getHumanType(arg_info.type)}`
      );
    }
    new_kwargs[s_arg_long_name] = arg_value;
  }

  return new_kwargs;
}
