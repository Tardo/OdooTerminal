// @flow strict
// Copyright  Alexandre Díaz <dev@redneboa.es>
// License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).

// $FlowIgnore
import i18n from 'i18next';
import VMachine from '@trash/vmachine';
import Frame from '@trash/frame';
import ProcessJobError from './exceptions/process_job_error';
import Interpreter from '@trash/interpreter';
import codeArray from '@trash/tl/array';
import type {ParserOptions, ParseInfo} from '@trash/interpreter';
import type {EvalOptions, ProcessCommandJobOptions} from '@trash/vmachine';


export type ShellCMDCallback = (job_info: JobInfo) => void;

export type ShellOptions = {
  invokeExternalCommand: ShellInvokeExternalCallback,
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
  #virtMachine: VMachine;
  #interpreter: Interpreter;
  #jobs: Array<JobInfo> = [];
  #options: ShellOptions;

  constructor(options: ShellOptions) {
    this.#options = {
      ...options,
      commandTimeout: 30000,
    };
    this.#interpreter = new Interpreter();
    this.#virtMachine = new VMachine({
      processCommandJob: (cmdInfo, silent) => this.#processCommandJob(cmdInfo, silent),
      silent: false,
    });

    // Load TL
    this.eval(codeArray);
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

  getActiveJobs(): $ReadOnlyArray<JobInfo> {
    return this.#jobs.filter(item => item);
  }

  validateCommand(cmd: string): [?string, ?string] {
    if (!cmd) {
      return [undefined, undefined];
    }
    const cmd_split = cmd.split(' ');
    const cmd_name = cmd_split[0];
    if (!cmd_name) {
      return [cmd, undefined];
    }
    return [cmd, cmd_name];
  }

  parse(data: string, options?: ParserOptions, level?: number = 0): ParseInfo {
    const parse_options: ParserOptions = typeof options !== 'undefined' ? structuredClone(options) : {};
    parse_options.registeredCmds = this.#virtMachine.getRegisteredCmds();
    return this.#interpreter.parse(data, parse_options, level);
  }

  async eval(code: string, options?: Partial<EvalOptions>, isolated_frame?: boolean = false): Promise<mixed> {
    if (code?.constructor !== String) {
      throw new Error('Invalid input!');
    }
    const opts: EvalOptions = {
      aliases: {},
      isData: false,
      silent: false,
      ...options,
    };
    const parse_info = this.parse(code, {
      isData: opts.isData,
    });
    const root_frame = isolated_frame ? new Frame() : undefined;
    return await this.#virtMachine.execute(parse_info, opts, root_frame);
  }

  async #processCommandJob(command_info: ProcessCommandJobOptions, silent: boolean = false): Promise<mixed> {
    const job_index = this.onStartCommand(command_info);
    if (job_index === -1) {
      throw new Error(i18n.t('terminal.error.notInitJob', "Unexpected error: can't initialize the job!"));
    }
    let result: mixed = null;
    let error = '';
    let is_failed = false;
    const meta = this.getCommandJobMeta(command_info, job_index, silent);
    try {
      result = await this.#options.invokeExternalCommand(meta);
    } catch (err) {
      is_failed = true;
      error =
        err?.message ||
        i18n.t('terminal.error.unknown', '[!] Oops! Unknown error! (no detailed error message given :/)');
    } finally {
      this.onFinishCommand(job_index);
    }
    if (is_failed && !silent) {
      throw new ProcessJobError(command_info.cmdName, error);
    }
    return result;
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
    job_info.timeout = setTimeout(() => {
      this.onTimeoutCommand(index);
    }, this.#options.commandTimeout);

    if (typeof this.#options.onStartCommand !== 'undefined') {
      this.#options.onStartCommand(job_info);
    }
    return index;
  }
  onTimeoutCommand(job_index: number) {
    this.#jobs[job_index].healthy = false;
    if (typeof this.#options.onTimeoutCommand !== 'undefined') {
      this.#options.onTimeoutCommand(this.#jobs[job_index]);
    }
  }
  onFinishCommand(job_index: number) {
    const job_info = this.#jobs[job_index];
    clearTimeout(job_info.timeout);
    delete this.#jobs[job_index];
    if (typeof this.#options.onFinishCommand !== 'undefined') {
      this.#options.onFinishCommand(job_info);
    }
  }
}
