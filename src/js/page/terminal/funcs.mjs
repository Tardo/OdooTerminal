// Copyright  Alexandre Díaz <dev@redneboa.es>
// License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).

import {file2File, isEmpty, save2File, uniqueId} from "./core/utils.mjs";
import {ARG, INSTRUCTION_TYPE} from "./trash/constants.mjs";

function printHelpDetailed(cmd, cmd_def) {
  this.screen.eprint("NAME");
  this.screen.print(
    `<div class="terminal-info-section">${cmd} - ${cmd_def.definition}</div>`
  );
  this.screen.print(" ");
  this.screen.eprint("DESCRIPTION");
  this.screen.print(
    `<div class="terminal-info-section">${cmd_def.detail}</div>`
  );
  // Create arguments text
  this.screen.print(" ");
  this.screen.eprint("ARGUMENTS");
  const args = [];
  let arg_info_str = "";
  for (const arg of cmd_def.args) {
    const arg_info = this.virtMachine.getInterpreter().getArgumentInfo(arg);
    const lnames = [`-${arg_info.names.short}`, `--${arg_info.names.long}`];
    const arg_symbols = arg_info.is_required ? ["<", ">"] : ["[", "]"];
    arg_info_str += `${arg_symbols[0]}${lnames.join(", ")} [${ARG.getHumanType(
      arg_info.type
    )}`;
    if (isEmpty(arg_info.strict_values)) {
      arg_info_str += `]${arg_symbols[1]}`;
    } else {
      arg_info_str += `(${arg_info.strict_values.join("|")})]${arg_symbols[1]}`;
    }
    if (typeof arg_info.default_value !== "undefined") {
      if (
        (arg_info.type & ARG.List) === ARG.List ||
        (arg_info.type & ARG.Dictionary) === ARG.Dictionary
      ) {
        arg_info_str += JSON.stringify(arg_info.default_value);
      } else {
        arg_info_str += arg_info.default_value;
      }
    }
    arg_info_str += `<div class="terminal-info-description">${arg_info.description}</div>`;
    arg_info_str += "<br/>";
  }
  this.screen.print(`<div class="terminal-info-section">${arg_info_str}</div>`);
  this.screen.print(args);
  if (cmd_def.example) {
    this.screen.eprint("EXAMPLE");
    this.screen.print(
      `<div class="terminal-info-section">${cmd} ${cmd_def.example}</div>`
    );
  }
}

function cmdPrintHelp(kwargs) {
  if (typeof kwargs.cmd === "undefined") {
    const sorted_cmd_keys = Object.keys(this.registeredCmds).sort();
    const sorted_keys_len = sorted_cmd_keys.length;
    for (let x = 0; x < sorted_keys_len; ++x) {
      const _cmd = sorted_cmd_keys[x];
      this.screen.printHelpSimple(_cmd, this.registeredCmds[_cmd]);
    }
  } else if (Object.hasOwn(this.registeredCmds, kwargs.cmd)) {
    printHelpDetailed.call(this, kwargs.cmd, this.registeredCmds[kwargs.cmd]);
  } else {
    return Promise.reject(`'${kwargs.cmd}' command doesn't exists`);
  }
  return Promise.resolve();
}

function cmdClear(kwargs) {
  if (kwargs.section === "history") {
    this.cleanInputHistory();
  } else {
    this.screen.clean();
  }
  return Promise.resolve();
}

function cmdPrint(kwargs) {
  this.screen.print(kwargs.msg);
  return Promise.resolve(kwargs.msg);
}

function cmdLoadResource(kwargs) {
  const inURL = new URL(kwargs.url);
  const pathname = inURL.pathname.toLowerCase();
  if (pathname.endsWith(".js")) {
    return new Promise((resolve, reject) => {
      $.getScript(inURL.href).done(resolve).fail(reject);
    });
  } else if (pathname.endsWith(".css")) {
    $("<link>").appendTo("head").attr({
      type: "text/css",
      rel: "stylesheet",
      href: inURL.href,
    });
  } else {
    return Promise.reject("Invalid file type");
  }
  return Promise.resolve();
}

function cmdTerminalContextOperation(kwargs) {
  if (kwargs.operation === "set") {
    this.userContext = kwargs.value;
  } else if (kwargs.operation === "write") {
    Object.assign(this.userContext, kwargs.value);
  } else if (kwargs.operation === "delete") {
    if (Object.hasOwn(this.userContext, kwargs.value)) {
      delete this.userContext[kwargs.value];
    } else {
      return Promise.reject(
        "The selected key is not present in the terminal context"
      );
    }
  }
  this.screen.print(this.userContext);
  return Promise.resolve(this.userContext);
}

function cmdAlias(kwargs) {
  const aliases = this.storageLocal.getItem("terminal_aliases") || {};
  if (!kwargs.name) {
    if (isEmpty(aliases)) {
      this.screen.print("No aliases defined.");
    } else {
      for (const alias_name in aliases) {
        this.screen.printHTML(
          ` - ${alias_name}  <small class="text-muted"><i>${aliases[alias_name]}</i></small>`
        );
      }
    }
    return Promise.resolve(aliases);
  } else if (Object.hasOwn(this.registeredCmds, kwargs.name)) {
    return Promise.reject("Invalid alias name");
  }
  if (kwargs.cmd && kwargs.cmd.length) {
    aliases[kwargs.name] = kwargs.cmd;
    this.screen.print("Alias created successfully");
  } else if (Object.hasOwn(aliases, kwargs.name)) {
    delete aliases[kwargs.name];
    this.screen.print("Alias removed successfully");
  } else {
    return Promise.reject("The selected alias not exists");
  }
  this.storageLocal.setItem("terminal_aliases", aliases, (err) =>
    this.screen.printHTML(err)
  );
  return Promise.resolve(aliases);
}

function cmdQuit() {
  this.doHide();
  return Promise.resolve();
}

function cmdExportVar(kwargs) {
  const varname = uniqueId("term");
  window[varname] = kwargs.value;
  this.screen.print(
    `Command result exported! now you can use '${varname}' variable in the browser console`
  );
  return Promise.resolve(varname);
}

function cmdExportFile(kwargs) {
  const filename = `${uniqueId("term")}_${new Date().getTime()}.json`;
  const data = JSON.stringify(kwargs.value, null, 4);
  save2File(filename, "text/json", data);
  this.screen.print(`Command result exported to '${filename}' file`);
  return Promise.resolve(filename);
}

function cmdChrono(kwargs) {
  return new Promise(async (resolve, reject) => {
    let time_elapsed_secs = -1;
    try {
      const start_time = new Date();
      await this.execute(kwargs.cmd, false);
      time_elapsed_secs = (new Date() - start_time) / 1000.0;
      this.screen.print(`Time elapsed: '${time_elapsed_secs}' seconds`);
    } catch (err) {
      return reject(err);
    }
    return resolve(time_elapsed_secs);
  });
}

function cmdRepeat(kwargs) {
  return new Promise((resolve, reject) => {
    if (kwargs.times < 0) {
      return reject("'Times' parameter must be positive");
    }
    const res = [];
    const do_repeat = (rtimes) => {
      if (!rtimes) {
        this.screen.print(
          `<i>** Repeat finsihed: '${kwargs.cmd}' called ${kwargs.times} times</i>`
        );
        return resolve(res);
      }
      return this.virtMachine
        .eval(kwargs.cmd, {
          silent: kwargs.silent,
          needResetStores: false,
        })
        .then((result) => res.push(result))
        .finally(() => do_repeat(rtimes - 1));
    };
    return do_repeat(kwargs.times);
  });
}

function cmdJobs() {
  const jobs = this.jobs.filter((item) => item);
  this.screen.print(
    jobs.map(
      (item) =>
        `${item.cmdInfo.cmdName} <small><i>${item.cmdInfo.cmdRaw}</i></small> ${
          item.healthy
            ? ""
            : '<span class="text-warning">This job is taking a long time</span>'
        }`
    )
  );
  return Promise.resolve(jobs);
}

function cmdToggleTerm() {
  return this.doToggle();
}

function cmdDis(kwargs) {
  const parse_info = this.virtMachine.interpreter.parse(kwargs.code, {
    registeredCmds: this.registeredCmds,
  });
  let body = "";
  const stack = parse_info.stack;
  for (const instr of stack.instructions) {
    let lvalue = "";
    switch (instr.type) {
      case INSTRUCTION_TYPE.LOAD_NAME:
      case INSTRUCTION_TYPE.LOAD_GLOBAL:
      case INSTRUCTION_TYPE.STORE_NAME:
      case INSTRUCTION_TYPE.STORE_SUBSCR:
        lvalue = stack.names[instr.level][instr.dataIndex];
        break;
      case INSTRUCTION_TYPE.LOAD_CONST:
        lvalue = stack.values[instr.level][instr.dataIndex];
        break;
      case INSTRUCTION_TYPE.LOAD_ARG:
        lvalue = stack.arguments[instr.level][instr.dataIndex];
        break;
    }

    const humanType = INSTRUCTION_TYPE.getHumanType(instr.type);
    body += `<tr><td>${humanType[0]}</td><td>${
      humanType[1]
    }</td><td>${lvalue}</td><td>${instr.dataIndex}</td><td>${
      instr.level
    }</td><td>${
      parse_info.inputTokens[instr.level][instr.inputTokenIndex]?.raw || ""
    }</td></tr>`;
  }
  this.screen.printTable(
    [
      "Instr. Name",
      "Instr. Code",
      "Name/Value/Argument",
      "Data Index",
      "Level",
      "Token",
    ],
    body
  );

  return Promise.resolve(true);
}

function cmdGenFile(kwargs) {
  return file2File(kwargs.name, kwargs.options);
}

export function registerCoreFuncs(TerminalObj) {
  TerminalObj.registerCommand("help", {
    definition: "Print this help or command detailed info",
    callback: cmdPrintHelp,
    detail:
      "Show commands and a quick definition.<br/>- " +
      "<> ~> Required Parameter<br/>- [] ~> Optional Parameter",
    args: [[ARG.String, ["c", "cmd"], false, "The command to consult"]],
    example: "-c search",
  });
  TerminalObj.registerCommand("clear", {
    definition: "Clean terminal section",
    callback: cmdClear,
    detail: "Clean the selected section",
    args: [
      [
        ARG.String,
        ["s", "section"],
        false,
        "The section to clear<br/>- screen: Clean the screen<br/>- history: Clean the command history",
        "screen",
        ["screen", "history"],
      ],
    ],
    example: "-s history",
  });
  TerminalObj.registerCommand("print", {
    definition: "Print a message",
    callback: cmdPrint,
    detail: "Eval parameters and print the result.",
    args: [[ARG.Any, ["m", "msg"], true, "The message to print"]],
    aliases: ["echo"],
    example: "-m 'This is a example'",
  });
  TerminalObj.registerCommand("load", {
    definition: "Load external resource",
    callback: cmdLoadResource,
    detail: "Load external source (javascript & css)",
    args: [[ARG.String, ["u", "url"], true, "The URL of the asset"]],
    example: "-u 'https://example.com/libs/term_extra.js'",
  });
  TerminalObj.registerCommand("context_term", {
    definition: "Operations over terminal context dictionary",
    callback: cmdTerminalContextOperation,
    detail:
      "Operations over terminal context dictionary. " +
      "This context only affects to the terminal operations.",
    args: [
      [
        ARG.String,
        ["o", "operation"],
        false,
        "The operation to do",
        "read",
        ["read", "write", "set", "delete"],
      ],
      [ARG.Any, ["v", "value"], false, "The value"],
    ],
    example: "-o write -v {the_example: 1}",
  });
  TerminalObj.registerCommand("alias", {
    definition: "Create aliases",
    callback: cmdAlias,
    detail:
      "Define aliases to run commands easy. " +
      "<br><b>WARNING:</b> This command uses 'local storage' " +
      "to persist the data even if you close the browser. " +
      "This data can be easy accessed by other computer users. " +
      "Don't use sensible data if you are using a shared " +
      "computer." +
      "<br><br>Can use positional parameters ($1,$2,$3,$N...)",
    args: [
      [ARG.String, ["n", "name"], false, "The name of the alias"],
      [ARG.String, ["c", "cmd"], false, "The command to run"],
    ],
    example: "-n myalias -c \"print 'Hello, $1!'\"",
  });
  TerminalObj.registerCommand("quit", {
    definition: "Close terminal",
    callback: cmdQuit,
    detail: "Close the terminal.",
  });
  TerminalObj.registerCommand("exportvar", {
    definition: "Exports the command result to a browser console variable",
    callback: cmdExportVar,
    detail: "Exports the command result to a browser console variable.",
    args: [[ARG.Any, ["v", "value"], true, "The value to export"]],
    example: "-v $(search res.partner)",
  });
  TerminalObj.registerCommand("exportfile", {
    definition: "Exports the command result to a text/json file",
    callback: cmdExportFile,
    detail: "Exports the command result to a text/json file.",
    args: [[ARG.Any, ["v", "value"], true, "The value to export"]],
    example: "-c 'search res.partner'",
  });
  TerminalObj.registerCommand("chrono", {
    definition: "Print the time expended executing a command",
    callback: cmdChrono,
    detail:
      "Print the elapsed time in seconds to execute a command. " +
      "<br/>Notice that this time includes the time to format the result!",
    syntax: "<STRING: COMMAND>",
    args: [[ARG.String, ["c", "cmd"], true, "The command to run"]],
    example: "-c 'search res.partner'",
  });
  TerminalObj.registerCommand("repeat", {
    definition: "Repeat a command N times",
    callback: cmdRepeat,
    detail: "Repeat a command N times.",
    args: [
      [ARG.Number, ["t", "times"], true, "Times to run"],
      [ARG.String, ["c", "cmd"], true, "The command to run"],
      [
        ARG.Flag,
        ["silent", "silent"],
        false,
        "Used to don't print command output",
      ],
    ],
    example:
      "-t 20 -c \"create res.partner {name: 'Example Partner #'+$(gen intiter)}\"",
  });
  TerminalObj.registerCommand("jobs", {
    definition: "Display running jobs",
    callback: cmdJobs,
    detail: "Display running jobs",
  });
  TerminalObj.registerCommand("toggle_term", {
    definition: "Toggle terminal visibility",
    callback: cmdToggleTerm,
    detail: "Toggle terminal visibility",
  });
  TerminalObj.registerCommand("dis", {
    definition: "Dissasembler bytecode",
    callback: cmdDis,
    detail: "Shows the bytecode generated for the input",
    args: [[ARG.String, ["c", "code"], true, "TraSH Code"]],
    example: "-c \"print $var[0]['key'] + ' -> ' + 1234\"",
  });
  TerminalObj.registerCommand("genfile", {
    definition: "Generate a File object",
    callback: cmdGenFile,
    detail:
      "Open a browser file dialog and instanciates a File object with the content of the selected file",
    args: [
      [ARG.String, ["n", "name"], false, "The File object file name"],
      [ARG.Dictionary, ["o", "options"], false, "The File object options"],
    ],
    example: "-n unnecessaryName.png",
  });
}
