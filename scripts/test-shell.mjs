// Run with: node scripts/test-shell.mjs
import assert from 'node:assert/strict';
import {registerHooks} from 'node:module';
import {setTimeout as delay} from 'node:timers/promises';
import {transformSync} from '@babel/core';
import ExecutionStoppedError from '@tardo/trash/exceptions/execution_stopped_error';
import {FUNCTION_TYPE} from '@tardo/trash/function';

// Load the actual Flow source without a browser or the translation-extraction plugin.
const sourceRoot = new URL('../src/', import.meta.url).href;
registerHooks({
  resolve(specifier, context, nextResolve) {
    if (context.parentURL?.startsWith(sourceRoot) && specifier.startsWith('.') && !specifier.endsWith('.mjs')) {
      specifier += '.mjs';
    }
    return nextResolve(specifier, context);
  },
  load(url, context, nextLoad) {
    const result = nextLoad(url, context);
    if (!url.startsWith(sourceRoot)) return result;
    return {
      ...result,
      source: transformSync(Buffer.from(result.source).toString(), {
        filename: url,
        babelrc: false,
        configFile: false,
        presets: ['@babel/preset-flow'],
        plugins: ['babel-plugin-syntax-hermes-parser'],
      }).code,
    };
  },
});
const {default: Shell} = await import('../src/js/page/terminal/shell.mjs');
const failure = new Error('RPC failed');
const pending = new Map();
const shell = new Shell({
  invokeExternalCommand: async meta => {
    if (meta.info.cmdName === 'fail') throw failure;
    if (meta.info.cmdName === 'stop') throw new ExecutionStoppedError('stopped');
    if (meta.info.cmdName === 'alias') {
      return shell.eval('fail', {...meta.info.executionOptions, silent: meta.silent});
    }
    return new Promise(resolve => pending.set(meta.info.cmdName, resolve));
  },
});
for (const name of ['fail', 'stop', 'alias', 'first', 'second', 'legacy']) {
  shell.getVM().registerCommand(name, {});
}
shell.getVM().registerCommand('native_fail', {
  type: FUNCTION_TYPE.Native,
  callback: async () => { throw failure; },
});
const isRPCError = err => err.name === 'ProcessJobError' && err.data === failure;
await assert.rejects(shell.evalAll('fail', {silent: true}), isRPCError);
await assert.rejects(shell.eval('fail'), isRPCError);
assert.equal(await shell.eval('fail', {silent: true}), null);
await assert.rejects(shell.evalAll('native_fail', {silent: true}), err => err === failure);
await assert.rejects(shell.evalAll('$value = (fail)'), isRPCError);
await assert.rejects(shell.evalAll('alias', {silent: true}), err => isRPCError(err.data));
await assert.rejects(shell.eval('stop', {silent: true}), ExecutionStoppedError);
await assert.rejects(shell.eval(42), /Invalid input/);
await assert.rejects(shell.evalAll('fail', {signal: AbortSignal.abort()}), ExecutionStoppedError);
await shell.eval('$persistent = 7');
assert.equal(await shell.eval('$persistent'), 7);
await shell.eval('$persistent = 9', {}, true);
assert.equal(await shell.eval('$persistent'), 7);
assert.deepEqual(await shell.evalAll('1; 2'), [1, 2]);
assert.equal(shell.getActiveJobs().length, 0);

// Overlap evaluations, finish one, and fail another while a legacy silent run is active.
const first = shell.evalAll('first', {silent: true});
const second = assert.rejects(shell.evalAll('second; fail', {silent: true}), isRPCError);
const legacy = shell.eval('legacy; fail', {silent: true});
await delay(10);
assert.equal(shell.getActiveJobs().length, 3);
assert.ok(shell.getActiveJobs().every(job => job.healthy && job.timeout === undefined));
pending.get('first')(1);
await first;
pending.get('second')(2);
await second;
pending.get('legacy')(3);
await legacy;
assert.equal(shell.getActiveJobs().length, 0);

let finish;
let timeouts = 0;
const timed = new Shell({
  commandTimeout: 0,
  invokeExternalCommand: () => new Promise(resolve => { finish = resolve; }),
  onTimeoutCommand: () => { timeouts++; },
});
timed.getVM().registerCommand('wait', {});
const waiting = timed.eval('wait');
await delay(10);
assert.equal(timeouts, 1);
assert.equal(timed.getActiveJobs()[0].healthy, false);
finish(7);
assert.equal(await waiting, 7);
assert.equal(timed.getActiveJobs().length, 0);
timed.onTimeoutCommand(0);
timed.onFinishCommand(0);
assert.equal(timeouts, 1);

const brokenHook = new Shell({
  invokeExternalCommand: async () => assert.fail('must not execute'),
  onStartCommand: () => { throw failure; },
});
brokenHook.getVM().registerCommand('fail', {});
await assert.rejects(brokenHook.eval('fail'), err => err === failure);
assert.equal(brokenHook.getActiveJobs().length, 0);
console.info('Shell regression checks passed.');
