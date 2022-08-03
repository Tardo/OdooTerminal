// Copyright  Alexandre Díaz <dev@redneboa.es>
// License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).

/** This is a clone of Odoo implementation but without data transformations */
odoo.define("terminal.core.rpc", function (require) {
    "use strict";

    var ajax = require("web.ajax");

    return {
        /**
         * Perform a RPC.  Please note that this is not the preferred way to do a
         * rpc if you are in the context of a widget.  In that case, you should use
         * the this._rpc method.
         *
         * @param {Object} params @see buildQuery for a description
         * @param {Object} options
         * @returns {Promise<any>}
         */
        query: function (params, options) {
            var query = this.buildQuery(params);
            return ajax.rpc(query.route, query.params, options);
        },

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
        buildQuery: function (options) {
            var route = false;
            var params = options.params || {};
            var orderBy = false;
            if (options.route) {
                route = options.route;
            } else if (options.model && options.method) {
                route =
                    "/web/dataset/call_kw/" +
                    options.model +
                    "/" +
                    options.method;
            }
            if (options.method) {
                params.args = options.args || [];
                params.model = options.model;
                params.method = options.method;
                params.kwargs = _.extend(params.kwargs || {}, options.kwargs);
                params.kwargs.context =
                    options.context || params.context || params.kwargs.context;

                // Compatibility with Odoo 12.0-
                if (
                    options.route === "/jsonrpc" &&
                    options.method === "server_version"
                ) {
                    const keys_count = Object.keys(params.kwargs).length;
                    if (
                        !keys_count ||
                        (keys_count === 1 && !params.kwargs.context)
                    ) {
                        delete params.kwargs;
                    }
                }
            }

            if (
                options.method === "read_group" ||
                options.method === "web_read_group"
            ) {
                if (!(params.args && params.args[0] !== undefined)) {
                    params.kwargs.domain =
                        options.domain ||
                        params.domain ||
                        params.kwargs.domain ||
                        [];
                }
                if (!(params.args && params.args[1] !== undefined)) {
                    params.kwargs.fields =
                        options.fields ||
                        params.fields ||
                        params.kwargs.fields ||
                        [];
                }
                if (!(params.args && params.args[2] !== undefined)) {
                    params.kwargs.groupby =
                        options.groupBy ||
                        params.groupBy ||
                        params.kwargs.groupby ||
                        [];
                }
                params.kwargs.offset =
                    options.offset || params.offset || params.kwargs.offset;
                params.kwargs.limit =
                    options.limit || params.limit || params.kwargs.limit;
                // In kwargs, we look for "orderby" rather than "orderBy" (note the absence of capital B),
                // since the Python argument to the actual function is "orderby".
                orderBy =
                    options.orderBy || params.orderBy || params.kwargs.orderby;
                params.kwargs.orderby = orderBy;
                params.kwargs.lazy =
                    "lazy" in options ? options.lazy : params.lazy;

                if (options.method === "web_read_group") {
                    params.kwargs.expand =
                        options.expand || params.expand || params.kwargs.expand;
                    params.kwargs.expand_limit =
                        options.expand_limit ||
                        params.expand_limit ||
                        params.kwargs.expand_limit;
                    var expandOrderBy =
                        options.expand_orderby ||
                        params.expand_orderby ||
                        params.kwargs.expand_orderby;
                    params.kwargs.expand_orderby = expandOrderBy;
                }
            }

            if (options.method === "search_read") {
                // Call the model method
                params.kwargs.domain =
                    options.domain || params.domain || params.kwargs.domain;
                params.kwargs.fields =
                    options.fields || params.fields || params.kwargs.fields;
                params.kwargs.offset =
                    options.offset || params.offset || params.kwargs.offset;
                params.kwargs.limit =
                    options.limit || params.limit || params.kwargs.limit;
                // In kwargs, we look for "order" rather than "orderBy" since the Python
                // argument to the actual function is "order".
                orderBy =
                    options.orderBy || params.orderBy || params.kwargs.order;
                params.kwargs.order = orderBy;
            }

            if (options.route === "/web/dataset/search_read") {
                // Specifically call the controller
                params.model = options.model || params.model;
                params.domain = options.domain || params.domain;
                params.fields = options.fields || params.fields;
                params.limit = options.limit || params.limit;
                params.offset = options.offset || params.offset;
                orderBy = options.orderBy || params.orderBy;
                params.sort = orderBy;
                params.context = options.context || params.context || {};
            }

            return {
                route: route,
                params: JSON.parse(JSON.stringify(params)),
            };
        },
    };
});
