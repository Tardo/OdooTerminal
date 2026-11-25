// @flow strict
// Copyright  Alexandre Díaz <dev@redneboa.es>
// License MIT (https://opensource.org/license/mit).

import {ubrowser} from './constants';

// Secrets must not be synced to the browser account, and these values can exceed the 8 KB
// per-item quota of 'storage.sync'.
const LOCAL_NAMES: $ReadOnlyArray<string> = ['ai_models', 'mcp_servers', 'ai_custom_skills', 'terminal_copy_data'];
const SECRET_NAMES: $ReadOnlyArray<string> = ['ai_models', 'mcp_servers'];

// $FlowFixMe[unclear-type]
function call(area: string, method: string, arg: mixed): Promise<any> {
  return new Promise((resolve, reject) => {
    // $FlowFixMe[invalid-computed-prop]
    // $FlowFixMe[prop-missing]
    ubrowser.storage[area][method](arg, result => {
      if (ubrowser.runtime?.lastError) {
        reject(ubrowser.runtime.lastError);
      } else {
        resolve(result);
      }
    });
  });
}

// $FlowFixMe[unclear-type]
export async function getStorageSync(keys: $ReadOnlyArray<string>): Promise<Object> {
  const local_keys = keys.filter(key => LOCAL_NAMES.includes(key));
  // Sync also holds the values saved by versions older than the local storage split.
  const synced = await call('sync', 'get', keys);
  return local_keys.length ? {...synced, ...(await call('local', 'get', local_keys))} : synced;
}

export async function setStorageSync(values: {...}): Promise<void> {
  const local: {[string]: mixed} = {};
  const synced: {[string]: mixed} = {};
  for (const [key, value] of Object.entries(values)) {
    (LOCAL_NAMES.includes(key) ? local : synced)[key] = value;
  }
  if (Object.keys(local).length) {
    await call('local', 'set', local);
  }
  if (Object.keys(synced).length) {
    await call('sync', 'set', synced);
  }
}

/**
 * Copies to 'storage.local' the values saved by older versions and then removes the API keys
 * from 'storage.sync'. The rest of each entry is kept there: other devices may still read it.
 */
export async function migrateLocalStorage(): Promise<void> {
  const synced = await call('sync', 'get', LOCAL_NAMES);
  const local = await call('local', 'get', LOCAL_NAMES);
  const missing: {[string]: mixed} = {};
  const stripped: {[string]: mixed} = {};
  for (const name of LOCAL_NAMES) {
    if (synced[name] !== undefined && local[name] === undefined) {
      missing[name] = synced[name];
    }
    if (SECRET_NAMES.includes(name) && Array.isArray(synced[name]) && synced[name].some(item => item.api_key)) {
      stripped[name] = synced[name].map(item => ({...item, api_key: ''}));
    }
  }
  if (Object.keys(missing).length) {
    await call('local', 'set', missing);
  }
  if (Object.keys(stripped).length) {
    await call('sync', 'set', stripped);
  }
}
