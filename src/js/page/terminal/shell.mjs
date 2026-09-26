// @flow strict
// Copyright  Alexandre Díaz <dev@redneboa.es>
// License MIT (https://opensource.org/license/mit).

import i18n from 'i18next';
import VMachine from '@tardo/trash/vmachine';
import {FUNCTION_TYPE} from '@tardo/trash/function';
import Frame from '@tardo/trash/frame';
import ProcessJobError from './exceptions/process_job_error';
import ExecutionStoppedError from '@tardo/trash/exceptions/execution_stopped_error';
import Interpreter from '@tardo/trash/interpreter';
import {SETTING_DEFAULTS} from '@common/constants';
import type {ExtensionSettings} from '@common/constants';
import type {CMDCallbackInternal, CMDDef, ParserOptions, ParseInfo} from '@tardo/trash/interpreter';
import type {EvalOptions, ProcessCommandJobOptions} from '@tardo/trash/vmachine';

// Host callbacks consume typed kwargs. TraSH's Command path also stringifies the
// raw stack (including arrays and records), so register host callbacks as Internal.
class HostVMachine extends VMachine {
  #hostCommands: Set<string> = new Set();

  isHostCommand(name: string): boolean {
    return this.#hostCommands.has(name);
  }

  registerCommand(name: string, definition: Partial<CMDDef>): CMDDef {
    if (definition.type !== undefined && definition.type !== FUNCTION_TYPE.Command) {
      return super.registerCommand(name, definition);
    }
    const command = VMachine.makeCommand(definition);
    this.#hostCommands.add(name);
    const callback: CMDCallbackInternal = async (_vm, kwargs, _frame, opts) =>
      this.options.processCommandJob(
        {cmdRaw: name, cmdName: name, cmdDef: command, kwargs, args: [], signal: opts.signal, executionOptions: opts},
        opts.silent === true,
      );
    return super.registerCommand(name, {
      ...command,
      type: FUNCTION_TYPE.Internal,
      callback,
    });
  }
}

export type ShellCMDCallback = (job_info: JobInfo) => void;

export type ShellOptions = {
  invokeExternalCommand: ShellInvokeExternalCallback,
  confirmUnsafe?: (cmdName: string, cmdRaw: string) => Promise<boolean>,
  // Marks long-running jobs as unhealthy; does not cancel execution. Omit to disable.
  commandTimeout?: number,
  onStartCommand?: ShellCMDCallback,
  onTimeoutCommand?: ShellCMDCallback,
  onFinishCommand?: ShellCMDCallback,
};

export type JobInfo = {
  cmdInfo: ProcessCommandJobOptions,
  healthy: boolean,
  timeout?: TimeoutID,
};

export type JobMetaInfo = {
  info: ProcessCommandJobOptions,
  jobIndex: number,
  silent: boolean,
};

export type ShellInvokeExternalCallback = (meta: JobMetaInfo) => Promise<mixed>;

export default class Shell {
  #virtMachine: HostVMachine;
  #interpreter: Interpreter;
  #jobs: Array<JobInfo | void> = [];
  #options: ShellOptions;
  #parserOptions: ParserOptions = {};
  #executionTimeout: number = 0;
  #registerVMCommands: ((vm: VMachine) => void) | void;

  constructor(options: ShellOptions) {
    this.#options = {...options};
    this.#interpreter = new Interpreter();
    this.#virtMachine = new HostVMachine({
      processCommandJob: (cmdInfo, silent) => this.#processCommandJob(cmdInfo, silent),
      confirmUnsafe: (name, raw) =>
        this.#options.confirmUnsafe ? this.#options.confirmUnsafe(name, raw) : Promise.resolve(true),
    });
  }

  getCommandJobMeta(command_info: ProcessCommandJobOptions, job_index: number, silent: boolean = false): JobMetaInfo {
    return {
      info: command_info,
      jobIndex: job_index,
      silent: silent,
    };
  }

  getVM(): VMachine {
    return this.#virtMachine;
  }

  registerVMCommands(register: (vm: VMachine) => void) {
    register(this.#virtMachine);
    this.#registerVMCommands = register;
  }

  resetVM() {
    const vm = new HostVMachine({...this.#virtMachine.options});
    this.#registerVMCommands?.(vm);
    this.#virtMachine = vm;
  }

  isHostCommand(name: string): boolean {
    return this.#virtMachine.isHostCommand(name);
  }

  configureExecution(settings: ExtensionSettings) {
    const limit = (key: $Keys<ExtensionSettings>): number => {
      const value = settings[key];
      const fallback = SETTING_DEFAULTS[key];
      return typeof value === 'number' && Number.isSafeInteger(value) && value > 0
        ? value
        : typeof fallback === 'number'
          ? fallback
          : 1;
    };
    this.#executionTimeout =
      Number.isSafeInteger(settings.execution_timeout) && settings.execution_timeout > 0
        ? Math.min(settings.execution_timeout, 2147483647)
        : 0;
    this.#virtMachine.options.maxInstructions = limit('execution_max_instructions');
    this.#virtMachine.options.maxCollectionLength = limit('execution_max_collection_length');
    this.#virtMachine.options.maxStringLength = limit('execution_max_string_length');
    this.#parserOptions = {
      maxSourceLength: limit('execution_max_source_length'),
      maxNestingDepth: limit('execution_max_nesting_depth'),
    };
  }

  getActiveJobs(): $ReadOnlyArray<JobInfo> {
    return this.#jobs.filter(item => item !== undefined);
  }

  parse(data: string, options?: ParserOptions, level?: number = 0): ParseInfo {
    const parse_options: ParserOptions = {...this.#parserOptions, ...options};
    parse_options.registeredCmds = this.#virtMachine.getRegisteredCmds();
    return this.#interpreter.parse(data, parse_options, level);
  }

  // $FlowFixMe[unclear-type]
  async eval(code: string, options?: Partial<EvalOptions>, isolated_frame?: boolean = false): Promise<any> {
    return await this.#evaluate(code, options, isolated_frame, false);
  }

  // $FlowFixMe[unclear-type]
  async evalAll(code: string, options?: Partial<EvalOptions>, isolated_frame?: boolean = false): Promise<any> {
    return await this.#evaluate(code, {...options, throwSilentErrors: true}, isolated_frame, true);
  }

  async #evaluate(
    code: string,
    options: Partial<EvalOptions> | void,
    isolated_frame: boolean,
    collect_all: boolean,
  ): Promise<mixed> {
    if (typeof code !== 'string') {
      throw new Error('Invalid input!');
    }
    // Preserve identity: nested host calls must share the VM instruction budget.
    const controller = !options?.signal && this.#executionTimeout > 0 ? new AbortController() : undefined;
    const opts: EvalOptions = controller ? {...options, signal: controller.signal} : (options ?? {});
    const parse_info = this.parse(code, {
      isData: opts.isData,
    });
    const root_frame = isolated_frame ? new Frame() : undefined;
    const timer = controller ? setTimeout(() => controller.abort(), this.#executionTimeout) : undefined;
    try {
      return await this.#virtMachine.execute(parse_info, opts, root_frame, collect_all);
    } finally {
      clearTimeout(timer);
    }
  }

  async #processCommandJob(command_info: ProcessCommandJobOptions, silent: boolean = false): Promise<mixed> {
    const job_index = this.onStartCommand(command_info);
    const meta = this.getCommandJobMeta(command_info, job_index, silent);
    try {
      return await this.#options.invokeExternalCommand(meta);
    } catch (err) {
      if (err instanceof ExecutionStoppedError) {
        throw err;
      }
      // Keep the original error (e.g. an Odoo RPCError with '.data.name/.message/.debug')
      // instead of flattening it to '.message' — that discards the real server-side
      // reason and leaves only a generic label for both the screen and the AI agent.
      const error =
        err ?? i18n.t('terminal.error.unknown', '[!] Oops! Unknown error! (no detailed error message given :/)');
      throw new ProcessJobError(command_info.cmdName, error);
    } finally {
      this.onFinishCommand(job_index);
    }
  }

  onStartCommand(command_info: ProcessCommandJobOptions): number {
    const job_info: JobInfo = {
      cmdInfo: command_info,
      healthy: true,
    };
    // Add new job on a empty space or new one
    let index = this.#jobs.findIndex(item => {
      return typeof item === 'undefined';
    });
    if (index === -1) {
      index = this.#jobs.push(job_info) - 1;
    } else {
      this.#jobs[index] = job_info;
    }
    if (this.#options.commandTimeout !== undefined) {
      job_info.timeout = setTimeout(() => {
        this.onTimeoutCommand(index);
      }, this.#options.commandTimeout);
    }

    if (typeof this.#options.onStartCommand !== 'undefined') {
      try {
        this.#options.onStartCommand(job_info);
      } catch (err) {
        clearTimeout(job_info.timeout);
        delete this.#jobs[index];
        throw err;
      }
    }
    return index;
  }
  onTimeoutCommand(job_index: number) {
    const job_info = this.#jobs[job_index];
    if (!job_info) return;
    job_info.healthy = false;
    if (typeof this.#options.onTimeoutCommand !== 'undefined') {
      this.#options.onTimeoutCommand(job_info);
    }
  }
  onFinishCommand(job_index: number) {
    const job_info = this.#jobs[job_index];
    if (!job_info) return;
    clearTimeout(job_info.timeout);
    delete this.#jobs[job_index];
    if (typeof this.#options.onFinishCommand !== 'undefined') {
      this.#options.onFinishCommand(job_info);
    }
  }
}
