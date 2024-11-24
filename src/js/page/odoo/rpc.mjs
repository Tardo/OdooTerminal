// @flow strict
// Copyright  Alexandre Díaz <dev@redneboa.es>
// License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).

/** This is a clone of Odoo implementation but without data transformations and adapted to new versions */
import getOdooService from './utils/get_odoo_service';

export type BuildQueryOptions = {
  args: $ReadOnlyArray<mixed>,
  context: {[string]: mixed},
  domain: $ReadOnlyArray<OdooDomainTuple>,
  fields: $ReadOnlyArray<string>,
  groupBy: $ReadOnlyArray<string>,
  kwargs: {[string]: mixed},
  limit: number,
  method: string,
  model: string,
  offset: number,
  orderBy: $ReadOnlyArray<string>,
  params: OdooQueryRPCParams,
  route: string,
  lazy: boolean,
  expand: Boolean,
  expand_limit: number,
  expand_orderby: $ReadOnlyArray<string>,
};

export type BuildQuery = {
  route: string,
  params: {[string]: mixed},
};

/**
 * @param {Object} options
 * @param {any[]} [options.args]
 * @param {Object} [options.context]
 * @param {any[]} [options.domain]
 * @param {string[]} [options.fields]
 * @param {string[]} [options.groupBy]
 * @param {Object} [options.kwargs]
 * @param {integer|false} [options.limit]
 * @param {String} [options.method]
 * @param {String} [options.model]
 * @param {integer} [options.offset]
 * @param {string[]} [options.orderBy]
 * @param {Object} [options.params]
 * @param {String} [options.route]
 * @returns {Object} with 2 keys: route and params
 */
function buildQuery(options: Partial<BuildQueryOptions>): BuildQuery {
  let route = '';
  const params: OdooQueryRPCParams = options.params || {};
  let orderBy: $ReadOnlyArray<string> = [];
  if (typeof options.route !== 'undefined') {
    route = options.route;
  } else if (typeof options.model !== 'undefined' && typeof options.method !== 'undefined') {
    route = '/web/dataset/call_kw/' + options.model + '/' + options.method;
  }
  if (typeof options.method !== 'undefined') {
    params.args = options.args || [];
    params.model = options.model;
    params.method = options.method;
    params.kwargs = Object.assign(params.kwargs || {}, options.kwargs);
    params.kwargs.context = options.context || params.context || params.kwargs.context;

    // Compatibility with Odoo 12.0-
    if (options.route === '/jsonrpc' && options.method === 'server_version') {
      const keys_count = Object.keys(params.kwargs).length;
      if (!keys_count || (keys_count === 1 && !params.kwargs.context)) {
        delete params.kwargs;
      }
    }
  }

  if (options.method === 'read_group' || options.method === 'web_read_group') {
    if (!(params.args && typeof params.args[0] !== 'undefined')) {
      params.kwargs.domain = options.domain || params.domain || params.kwargs.domain || [];
    }
    if (!(params.args && typeof params.args[1] !== 'undefined')) {
      params.kwargs.fields = options.fields || params.fields || params.kwargs.fields || [];
    }
    if (!(params.args && typeof params.args[2] !== 'undefined')) {
      params.kwargs.groupby = options.groupBy || params.groupBy || params.kwargs.groupby || [];
    }
    params.kwargs.offset =
      (typeof options.offset !== 'undefined' && options.offset) || params.offset || params.kwargs.offset;
    params.kwargs.limit =
      (typeof options.limit !== 'undefined' && options.limit) || params.limit || params.kwargs.limit;
    // In kwargs, we look for "orderby" rather than "orderBy" (note the absence of capital B),
    // since the Python argument to the actual function is "orderby".
    orderBy = options.orderBy || params.orderBy || params.kwargs.orderby;
    params.kwargs.orderby = orderBy;
    params.kwargs.lazy = 'lazy' in options ? options.lazy : params.lazy;

    if (options.method === 'web_read_group') {
      params.kwargs.expand = options.expand || params.expand || params.kwargs.expand;
      params.kwargs.expand_limit =
        (typeof options.expand_limit !== 'undefined' && options.expand_limit) ||
        params.expand_limit ||
        params.kwargs.expand_limit;
      const expandOrderBy =
        (typeof options.expand_orderby !== 'undefined' && options.expand_orderby) ||
        params.expand_orderby ||
        params.kwargs.expand_orderby;
      params.kwargs.expand_orderby = expandOrderBy;
    }
  }

  if (options.method === 'search_read') {
    // Call the model method
    params.kwargs.domain = options.domain || params.domain || params.kwargs.domain;
    params.kwargs.fields = options.fields || params.fields || params.kwargs.fields;
    params.kwargs.offset =
      (typeof options.offset !== 'undefined' && options.offset) || params.offset || params.kwargs.offset;
    params.kwargs.limit =
      (typeof options.limit !== 'undefined' && options.limit) || params.limit || params.kwargs.limit;
    // In kwargs, we look for "order" rather than "orderBy" since the Python
    // argument to the actual function is "order".
    orderBy = options.orderBy || params.orderBy || params.kwargs.order;
    params.kwargs.order = orderBy;
  }

  if (options.route === '/web/dataset/search_read') {
    // Specifically call the controller
    params.model = (typeof options.model !== 'undefined' && options.model) || params.model;
    params.domain = options.domain || params.domain;
    params.fields = options.fields || params.fields;
    params.limit = (typeof options.limit !== 'undefined' && options.limit) || params.limit;
    params.offset = (typeof options.offset !== 'undefined' && options.offset) || params.offset;
    orderBy = options.orderBy || params.orderBy;
    params.sort = orderBy;
    params.context = options.context || params.context || {};
  }

  return {route, params};
}

/**
 * Perform a RPC.  Please note that this is not the preferred way to do a
 * rpc if you are in the context of a widget.  In that case, you should use
 * the this._rpc method.
 *
 * @param {Object} params @see buildQuery for a description
 * @param {Object} options
 * @returns {Promise<any>}
 */
export default function doQuery<T>(params: Partial<BuildQueryOptions>, options: ?{[string]: mixed}): Promise<T> {
  const query = buildQuery(params);
  const rpc_service = getOdooService('web.ajax', '@web/legacy/js/core/ajax', '@web/core/network/rpc_service', '@web/core/network/rpc');
  if (typeof rpc_service === 'undefined') {
    return Promise.reject();
  }
  if (Object.hasOwn(rpc_service, 'rpc')) {
    return rpc_service.rpc(query.route, query.params, options);
  } else if (Object.hasOwn(rpc_service, 'jsonrpc')) {
    return rpc_service.jsonrpc(query.route, query.params, options);
  }
  return rpc_service.jsonRpc(query.route, 'call', query.params, options);
}
