// Copyright  Alexandre Díaz <dev@redneboa.es>
// License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).

/*
    A first attempt for fuzzing in Odoo
*/

odoo.define("terminal.functions.Fuzz", function (require) {
    "use strict";

    const Terminal = require("terminal.Terminal");
    const ParameterGenerator = require("terminal.core.ParameterGenerator");
    const Class = require("web.Class");
    const rpc = require("terminal.core.rpc");
    const field_utils = require("web.field_utils");
    const utils = require("web.utils");

    const FieldValueGenerator = Class.extend({
        _minStr: 4,
        _maxStr: 40,
        _minNumber: 4,
        _maxNumber: 999999,

        init: function () {
            this._generators = {
                char: this._generateCharValue.bind(this),
                text: this._generateTextValue.bind(this),
                float: this._generateFloatValue.bind(this),
                integer: this._generateIntValue.bind(this),
                date: this._generateDateValue.bind(this),
                datetime: this._generateDatetimeValue.bind(this),
                selection: this._generateSelectionValue.bind(this),
                many2one: this._generateMany2OneValue.bind(this),
                one2many: this._generateOne2ManyValue.bind(this),
                many2many: this._generateMany2ManyValue.bind(this),
                boolean: this._generateBooleanValue.bind(this),
                monetary: this._generateFloatValue.bind(this),
                html: this._generateHTML.bind(this),

                phone: this._generatePhoneValue.bind(this),
                email: this._generateEmailValue.bind(this),
                url: this._generateUrlValue.bind(this),
            };
            this._parameterGenerator = new ParameterGenerator();
        },

        process: function (field, omitted_values) {
            const hasWidgetGenerator = Object.hasOwn(
                this._generators,
                field.widget
            );
            const callback =
                this._generators[
                    hasWidgetGenerator ? field.widget : field.type
                ];
            if (callback) {
                return callback(field, omitted_values);
            }
            return false;
        },

        /* CORE TYPES */
        _generateCharValue: function () {
            return this._parameterGenerator.generateString(
                this._minStr,
                this._maxStr
            );
        },

        _generateTextValue: function () {
            return this._parameterGenerator.generateString(
                this._minStr,
                this._maxStr * 10
            );
        },

        _generateHTML: function () {
            return `<p>${this._generateTextValue()}</p>`;
        },

        _generateFloatValue: function () {
            return this._parameterGenerator.generateFloat(
                this._minNumber,
                this._maxNumber
            );
        },

        _generateIntValue: function () {
            return this._parameterGenerator.generateInt(
                this._minNumber,
                this._maxNumber
            );
        },

        _generateDateValue: function () {
            const cur_time = new Date().getTime();
            return field_utils.parse.date(
                this._parameterGenerator.generateDate(cur_time / 2, cur_time)
            );
        },

        _generateDatetimeValue: function () {
            const cur_time = new Date().getTime();
            return field_utils.parse.datetime(
                this._parameterGenerator.generateDate(cur_time / 2, cur_time)
            );
        },

        _generateSelectionValue: function (field) {
            return _.sample(field.values);
        },

        _generateOne2ManyValue: function (field) {
            const keys = Object.keys(field.values);
            const keys_len = keys.length;
            if (!keys_len) {
                return false;
            }
            const record = {};

            let index = 0;
            while (index < keys_len) {
                const key = keys[index];
                const extra_field = field.values[key];
                record[key] = this.process(extra_field);
                ++index;
            }
            return {
                operation: "CREATE",
                data: record,
            };
        },

        _generateMany2OneValue: function (field, omitted_values) {
            const value = _.sample(
                _.difference(field.values, omitted_values || [])
            );
            if (value) {
                return {operation: "ADD", id: value};
            }
            return false;
        },

        _generateMany2ManyValue: function (field) {
            const num = this._parameterGenerator.generateInt(
                0,
                field.values.length - 1
            );
            const ids = _.sample(field.values, num);
            if (ids.length) {
                return {
                    operation: "ADD_M2M",
                    ids: _.map(ids, (id) => Object({id: id})),
                };
            }
            return false;
        },

        _generateBooleanValue: function () {
            return Boolean(this._parameterGenerator.generateInt(0, 1));
        },

        /* WIDGETS */
        _generatePhoneValue: function () {
            return this._parameterGenerator
                .generateInt(100000000, 999999999)
                .toString();
        },

        _generateEmailValue: function () {
            return this._parameterGenerator.generateEmail(
                this._minStr,
                this._maxStr
            );
        },

        _generateUrlValue: function () {
            return this._parameterGenerator.generateUrl(
                this._minStr,
                this._maxStr
            );
        },
    });

    const FuzzForm = Class.extend({
        init: function (term) {
            this._term = term;
            this._fieldValueGenerator = new FieldValueGenerator();
        },

        destroy: function () {
            this._fieldValueGenerator.destroy();
        },

        processFormFields: function (
            controller,
            fields,
            def_value,
            o2m_num_records = 1
        ) {
            return new Promise(async (resolve, reject) => {
                const controller_state = controller.widget.renderer.state;
                const controller_fields = controller_state.fields;
                const fields_info =
                    controller_state.fieldsInfo[controller_state.viewType];
                const processed = {};
                const ignored = [];
                let fields_ignored = [];
                let fields_view = this._getArchFields(
                    controller.widget.renderer.arch
                );
                if (!_.isEmpty(fields)) {
                    fields_view = _.filter(fields_view, (item) => {
                        return fields.indexOf(item?.attrs.name) !== -1;
                    });
                }
                const fields_view_len = fields_view.length;
                let index = 0;
                while (index < fields_view_len) {
                    const field_view_def = fields_view[index];
                    const field_name = field_view_def.attrs.name;
                    if (fields_ignored.indexOf(field_name) !== -1) {
                        this._term.screen.eprint(
                            ` [i] Aborting changes for '${field_name}': Already changed by an 'onchange'`
                        );
                        ignored.push(field_name);
                        continue;
                    }
                    const field_info = fields_info[field_name];
                    const field = controller_fields[field_name];
                    const is_invisible = utils.toBoolElse(
                        field_info.modifiersValue?.invisible
                    );
                    const is_readonly = utils.toBoolElse(
                        field_info.modifiersValue?.readonly,
                        field.readonly
                    );
                    if (!is_invisible && !is_readonly) {
                        // Create more than one 'one2many' record
                        const num_records =
                            field.type === "one2many" ? o2m_num_records : 1;
                        this._O2MRequiredStore = {};
                        try {
                            for (let i = 0; i < num_records; ++i) {
                                const [field_def, affected_fields] =
                                    await this._fillField(
                                        controller,
                                        field,
                                        field_info,
                                        def_value
                                    );
                                processed[field_name] = field_def;
                                fields_ignored = _.union(
                                    fields_ignored,
                                    affected_fields
                                );
                            }
                        } catch (err) {
                            return reject(err);
                        }
                    }
                    ++index;
                }
                return resolve([processed, ignored]);
            });
        },

        _convertData2State: function (data) {
            const res = {};
            const keys = Object.keys(data);
            const keys_len = keys.length;
            let index = 0;
            while (index < keys_len) {
                const key = keys[index];
                const value = data[key];
                if (typeof value === "object" && !moment.isMoment(value)) {
                    res[key] = value.data?.id;
                } else {
                    res[key] = value;
                }
                ++index;
            }
            return res;
        },

        _fillField: function (controller, field, field_info, def_value) {
            return new Promise(async (resolve) => {
                const local_data =
                    controller.widget.model.localData[controller.widget.handle];
                const domain = controller.widget.model._getDomain(local_data, {
                    fieldName: field_info.name,
                });
                const state_data = controller.widget.renderer.state.data;
                this._term.screen.eprint(
                    ` [o] Getting information of '${field_info.name}' field...`
                );

                let changes = {};
                let gen_field_def = {};
                // One2many fields need be handled in a special way
                if (field.type === "one2many") {
                    gen_field_def = await this._generateFieldDef(
                        field,
                        field_info,
                        domain
                    );
                    changes = await this._generateChangesFieldO2M(
                        field_info,
                        controller.widget
                    );
                    if (def_value) {
                        changes[field_info.name].data = $.extend(
                            true,
                            changes[field_info.name].data,
                            def_value
                        );
                    }
                } else {
                    gen_field_def = await this._generateFieldDef(
                        field,
                        field_info,
                        domain
                    );
                    changes[field_info.name] =
                        this._fieldValueGenerator.process(gen_field_def);
                    if (def_value) {
                        if (field.type === "many2one") {
                            changes[field_info.name].id = Number(def_value);
                        } else if (field.type === "many2many") {
                            changes[field_info.name].ids.push(
                                Number(def_value)
                            );
                        } else {
                            changes[field_info.name] = def_value;
                        }
                    }
                }
                // Get the raw value to human printing
                let raw_value = changes[field_info.name];
                if (
                    typeof raw_value === "object" &&
                    Object.hasOwn(raw_value, "operation")
                ) {
                    if (raw_value.operation === "ADD") {
                        raw_value = raw_value.id;
                    } else if (raw_value.operation === "ADD_M2M") {
                        raw_value = _.map(
                            raw_value.ids,
                            (item) => item.id
                        ).join();
                    } else if (raw_value.operation === "CREATE") {
                        raw_value = raw_value.data;
                    }
                }
                if (typeof raw_value === "object") {
                    this._term.screen.eprint(
                        ` [o] Writing the new random value:`
                    );
                    this._term.screen.print(
                        this._term.screen._prettyObjectString(raw_value)
                    );
                } else {
                    this._term.screen.eprint(
                        ` [o] Writing the new random value: ${raw_value}`
                    );
                }
                try {
                    const record_id = controller.widget.handle;
                    const model = controller.widget.model;
                    await model.trigger_up("field_changed", {
                        dataPointID: record_id,
                        changes: changes,
                        onSuccess: (datas) => {
                            const fields_affected = _.reject(
                                this._processFieldChanges(
                                    field_info.name,
                                    datas,
                                    state_data
                                ),
                                (item) => item === field_info.name
                            );
                            this._term.screen.eprint(
                                ` [i] Random value for '${field_info.name}' written`
                            );
                            if (_.some(fields_affected)) {
                                this._term.screen.eprint(
                                    `  ** 'onchange' fields detected: ${fields_affected.join()}`
                                );
                            }
                            return resolve([gen_field_def, fields_affected]);
                        },
                    });
                } catch (err) {
                    this._term.screen.eprint(
                        ` [x] Can't write the value for '${field_info.name}': ${err}`
                    );
                }

                return resolve([false, false]);
            });
        },

        _getArchFields: function (arch) {
            let fields = [];
            const childrens = arch?.children || [];
            const childrens_len = childrens.length;
            let index = 0;
            while (index < childrens_len) {
                const children = childrens[index];
                if (children.tag === "field") {
                    fields.push(children);
                } else if (_.some(children.children)) {
                    fields = _.union(fields, this._getArchFields(children));
                }
                ++index;
            }
            return fields;
        },

        _getChangesValues: function (changes) {
            const values = {};
            const keys = Object.keys(changes);
            const keys_len = keys.length;
            let index = 0;
            while (index < keys_len) {
                const field_name = keys[index];
                const change = changes[field_name];
                if (
                    typeof change === "object" &&
                    Object.hasOwn(change, "operation")
                ) {
                    if (change.operation === "ADD") {
                        values[field_name] = change.id;
                    } else if (change.operation === "ADD_M2M") {
                        values[field_name] = _.map(
                            change.ids,
                            (item) => item.id
                        );
                    } else if (change.operation === "CREATE") {
                        values[field_name] = change.data;
                    }
                } else {
                    values[field_name] = change;
                }
                ++index;
            }
            return values;
        },

        _processO2MRequiredField: function (
            parent_field_name,
            field_name,
            field_view,
            changes
        ) {
            if (field_view.required) {
                const s_changes = this._getChangesValues(
                    changes[parent_field_name].data
                );
                if (!Object.hasOwn(this._O2MRequiredStore, parent_field_name)) {
                    this._O2MRequiredStore[parent_field_name] = {};
                }
                if (
                    !Object.hasOwn(
                        this._O2MRequiredStore[parent_field_name],
                        field_name
                    )
                ) {
                    this._O2MRequiredStore[parent_field_name][field_name] = [];
                }
                this._O2MRequiredStore[parent_field_name][field_name].push(
                    s_changes[field_name]
                );
            }
        },

        _generateChangesFieldO2M: async function (field_info, widget) {
            // eslint-disable-next-line
            return new Promise(async (resolve) => {
                const changes = {};
                changes[field_info.name] = {
                    operation: "CREATE",
                    data: {},
                };
                if (field_info.views) {
                    const o2m_fields = this._getArchFields(
                        field_info.views[field_info.mode]?.arch
                    );
                    const o2m_fields_len = o2m_fields.length;
                    let index = 0;
                    while (index < o2m_fields_len) {
                        const field = o2m_fields[index];
                        const field_view_name = field.attrs.name;
                        const field_view_def =
                            field_info.views[field_info.mode].fields[
                                field_view_name
                            ];
                        const field_view =
                            field_info.views[field_info.mode].fields[
                                field_view_name
                            ];
                        const field_info_view =
                            field_info.views[field_info.mode].fieldsInfo[
                                field_info.mode
                            ][field_view_name];
                        if (!field_info_view) {
                            ++index;
                            continue;
                        }
                        const is_invisible = utils.toBoolElse(
                            field_info_view.modifiers?.invisible,
                            false
                        );
                        if (
                            field_view.type === "one2many" ||
                            is_invisible ||
                            field_view_def.readonly ||
                            field_view_name.startsWith("_") ||
                            field_view_name === "id"
                        ) {
                            ++index;
                            continue;
                        }

                        const model_data = widget.model.get(widget.handle);
                        const state = this._convertData2State(model_data.data);
                        const proc_domain =
                            (field.attrs.domain &&
                                py.eval(
                                    field.attrs.domain,
                                    _.extend(
                                        {
                                            parent: state,
                                        },
                                        this._getChangesValues(
                                            changes[field_info.name].data
                                        )
                                    )
                                )) ||
                            [];
                        const gen_field_def = await this._generateFieldDef(
                            field_view,
                            field_info_view,
                            proc_domain
                        );
                        let omitted_values = null;
                        if (
                            Object.hasOwn(
                                this._O2MRequiredStore,
                                field_info.name
                            )
                        ) {
                            omitted_values =
                                this._O2MRequiredStore[field_info.name][
                                    field_view_name
                                ];
                        }
                        const data = this._fieldValueGenerator.process(
                            gen_field_def,
                            omitted_values
                        );
                        if (data) {
                            changes[field_info.name].data[field_view_name] =
                                data;
                            this._processO2MRequiredField(
                                field_info.name,
                                field_view_name,
                                field_view,
                                changes
                            );
                        }
                        ++index;
                    }
                }
                // Do not apply changes if doesn't exists changes to apply
                if (!Object.keys(changes[field_info.name].data).length) {
                    changes[field_info.name] = false;
                }
                return resolve(changes);
            });
        },

        _generateFieldDef: function (field, field_info = false, domain = []) {
            return new Promise(async (resolve) => {
                const gen_field_def = {
                    type: field.type,
                    relation: field.relation,
                    widget: "",
                    required: field.required,
                };
                if (field_info) {
                    gen_field_def.widget = field_info.widget;
                    gen_field_def.required =
                        field_info.modifiersValue?.required;
                }

                if (gen_field_def.relation) {
                    gen_field_def.values = await rpc.query({
                        model: gen_field_def.relation,
                        method: "search",
                        args: [domain],
                    });
                } else if (field.selection) {
                    gen_field_def.values = [];
                    if (!field.required) {
                        gen_field_def.values.push(false);
                    }
                    const selection_len = field.selection.length;
                    let index = 0;
                    while (index < selection_len) {
                        const option = field.selection[index];
                        gen_field_def.values.push(option[0]);
                        ++index;
                    }
                }

                return resolve(gen_field_def);
            });
        },

        _processFieldChanges: function (field_name, datas, state_data) {
            const fields_changed = [];
            const datas_len = datas.length;
            let index = 0;
            while (index < datas_len) {
                const data = datas[index];
                if (data.name === field_name) {
                    const keys = Object.keys(data.recordData);
                    const keys_len = keys.length;
                    let index_b = 0;
                    while (index_b < keys_len) {
                        const rf_name = keys[index_b];
                        if (
                            !_.isEqual(
                                data.recordData[rf_name],
                                state_data[rf_name]
                            )
                        ) {
                            fields_changed.push(rf_name);
                        }
                        ++index_b;
                    }
                    break;
                }
                ++index;
            }
            return fields_changed;
        },
    });

    Terminal.include({
        init: function () {
            this._super.apply(this, arguments);

            this.registerCommand("fuzz", {
                definition: "Run a 'Fuzz Test'",
                callback: this._cmdFuzz,
                detail: "Runs a 'Fuzz Test' over the selected model and view",
                args: [
                    "s::m:model::1::The model technical name",
                    "s::r:ref::0::The view reference name",
                ],
                example: "-m res.partner -r base.view_partner_simple_form",
            });
            this.registerCommand("fuzz_field", {
                definition:
                    "Fill a field with a random or given values on the active form",
                callback: this._cmdFuzzField,
                detail: "Fill a field/s with a random or given values on the active form",
                args: [
                    "ls::f:field::1::The field names",
                    "-::v:value::0::The value to use",
                    "i::c:count::0::The count of 02M records",
                ],
                example: "-f order_line -v \"{'display_type': false}\" -c 4",
            });
        },

        _cmdFuzzField: function (kwargs) {
            let ovalues = kwargs.value;
            if (typeof ovalues !== "undefined") {
                ovalues = JSON.parse(kwargs.value);
            }
            const controller_stack =
                this.getParent().action_manager.controllerStack;
            if (!controller_stack.length) {
                return Promise.reject("Can't detect any controller");
            }
            const controller = this._getController(
                controller_stack[controller_stack.length - 1]
            );
            if (controller.viewType !== "form") {
                return Promise.reject(
                    "The current controller is not for a form view"
                );
            }
            return this._runFuzz(
                controller,
                kwargs.field,
                ovalues,
                kwargs.count
            );
        },

        _cmdFuzz: function (kwargs) {
            return new Promise(async (resolve, reject) => {
                try {
                    this.screen.eprint(
                        `Opening selected ${kwargs.model} form...`
                    );
                    const context = this._getContext({
                        form_view_ref: kwargs.ref,
                    });
                    const action = await this.do_action({
                        type: "ir.actions.act_window",
                        name: "View Record",
                        res_model: kwargs.model,
                        res_id: false,
                        views: [[false, "form"]],
                        target: "new",
                        context: context,
                    });
                    const form_controller = this._getController(
                        action.controllerID
                    );
                    await this._runFuzz(form_controller, 4);
                    this.screen.eprint("Saving changes...");
                    form_controller.widget
                        .saveRecord()
                        .then(() => {
                            const record = form_controller.widget.model.get(
                                form_controller.widget.handle
                            );
                            this.screen.eprint(
                                `Fuzz test finished successfully: ${record.res_id}`
                            );
                            if (!form_controller.dialog.isDestroyed()) {
                                form_controller.dialog.close();
                            }
                            this.doShow();
                            return resolve(record.res_id);
                        })
                        .catch((err) => {
                            return reject(err);
                        });
                } catch (err) {
                    return reject(err);
                }

                return resolve();
            });
        },

        _runFuzz: function (
            form_controller,
            fields,
            def_values,
            o2m_num_records
        ) {
            return new Promise(async (resolve, reject) => {
                try {
                    this.screen.eprint("Writing random values...");
                    const fuzz_form = new FuzzForm(this);
                    const [processed_fields, ignored_fields] =
                        await fuzz_form.processFormFields(
                            form_controller,
                            fields,
                            def_values,
                            o2m_num_records
                        );
                    const required_count = _.size(
                        _.filter(processed_fields, (field) => field.required)
                    );
                    this.screen.eprint(
                        ` - Founded ${_.size(
                            processed_fields
                        )} visible fields (${required_count} required)`
                    );
                    this.screen.eprint(
                        ` - Ignored ${_.size(
                            ignored_fields
                        )} fields affected by an 'onchange'`
                    );
                } catch (err) {
                    return reject(err);
                }

                return resolve();
            });
        },

        _getController: function (controller_id) {
            return this.getParent().action_manager.controllers[controller_id];
        },
    });
});
