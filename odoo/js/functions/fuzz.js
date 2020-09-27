// Copyright 2018-2020 Alexandre Díaz <dev@redneboa.es>
// License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).

/*
    A first attempt for fuzzing in Odoo
*/

odoo.define("terminal.functions.Fuzz", function(require) {
    "use strict";

    const Terminal = require("terminal.Terminal");
    const ParameterGenerator = require("terminal.core.ParameterGenerator");
    const Class = require("web.Class");
    const rpc = require("web.rpc");
    const field_utils = require("web.field_utils");

    const FieldValueGenerator = Class.extend({
        _minStr: 4,
        _maxStr: 40,
        _minNumber: 4,
        _maxNumber: 999999,

        init: function() {
            this._generators = {
                char: this._generateCharValue.bind(this),
                text: this._generateTextValue.bind(this),
                float: this._generateFloatValue.bind(this),
                integer: this._generateIntValue.bind(this),
                date: this._generateDateValue.bind(this),
                datetime: this._generateDatetimeValue.bind(this),
                selection: this._generateSelectionValue.bind(this),
                many2one: this._generateMany2OneValue.bind(this),
                // One2many: this._generateOne2ManyValue.bind(this),
                many2many: this._generateMany2ManyValue.bind(this),
                boolean: this._generateBooleanValue.bind(this),

                phone: this._generatePhoneValue.bind(this),
                email: this._generateEmailValue.bind(this),
                url: this._generateUrlValue.bind(this),
            };
            this._parameterGenerator = new ParameterGenerator();
        },

        process: function(field) {
            const hasWidgetGenerator = field.widget in this._generators;
            const callback = this._generators[
                hasWidgetGenerator ? field.widget : field.type
            ];
            if (callback) {
                return callback(field);
            }
            return false;
        },

        /* CORE TYPES */
        _generateCharValue: function() {
            return this._parameterGenerator.generateString(
                this._minStr,
                this._maxStr
            );
        },

        _generateTextValue: function() {
            return this._parameterGenerator.generateString(
                this._minStr,
                this._maxStr * 10
            );
        },

        _generateFloatValue: function() {
            return Number(
                this._parameterGenerator.generateInt(
                    this._minNumber,
                    this._maxNumber
                )
            );
        },

        _generateIntValue: function() {
            return this._parameterGenerator.generateInt(
                this._minNumber,
                this._maxNumber
            );
        },

        _generateDateValue: function() {
            const cur_time = new Date().getTime();
            return field_utils.parse.date(
                this._parameterGenerator.generateDate(cur_time / 2, cur_time)
            );
        },

        _generateDatetimeValue: function() {
            const cur_time = new Date().getTime();
            return field_utils.parse.datetime(
                this._parameterGenerator.generateDate(cur_time / 2, cur_time)
            );
        },

        _generateSelectionValue: function(field) {
            const index = this._parameterGenerator.generateInt(
                0,
                field.values.length - 1
            );
            return field.values[index];
        },

        _generateOne2ManyValue: function() {
            // TODO: CREATE NEW RECORDS FOR THIS TYPE OF FIELD
            // {
            //     operation: 'CREATE',
            //     data: values,
            // },
            return false;
        },

        _generateMany2OneValue: function(field) {
            const index = this._parameterGenerator.generateInt(
                0,
                field.values.length - 1
            );
            return {operation: "ADD", id: field.values[index]};
        },

        _generateMany2ManyValue: function(field) {
            const end = this._parameterGenerator.generateInt(
                0,
                field.values.length - 1
            );
            const start = this._parameterGenerator.generateInt(
                field.values.length - end,
                field.values.length - 1
            );
            const ids = field.values.slice(start, start + end);
            return {
                operation: "ADD_M2M",
                ids: _.map(ids, id => Object({id: id})),
            };
        },

        _generateBooleanValue: function() {
            return Boolean(this._parameterGenerator.generateInt(0, 1));
        },

        /* WIDGETS */
        _generatePhoneValue: function() {
            return this._parameterGenerator
                .generateInt(100000000, 999999999)
                .toString();
        },

        _generateEmailValue: function() {
            return this._parameterGenerator.generateEmail(
                this._minStr,
                this._maxStr
            );
        },

        _generateUrlValue: function() {
            return this._parameterGenerator.generateUrl(
                this._minStr,
                this._maxStr
            );
        },
    });

    Terminal.include({
        init: function() {
            this._super.apply(this, arguments);

            this._fieldValueGenerator = new FieldValueGenerator();

            this.registerCommand("fuzz", {
                definition: "Run a 'Fuzz Test'",
                callback: this._cmdFuzz,
                detail: "Runs a 'Fuzz Test' over the selected model and view",
                syntaxis: "<STRING: MODEL NAME> [STRING: VIEW REF]",
                args: "s?s",
            });
        },

        _cmdFuzz: function(model, view_ref = false) {
            return new Promise(async (resolve, reject) => {
                this.screen.eprint(`Opening selected ${model} form...`);
                const context = _.extend({}, this._getContext(), {
                    form_view_ref: view_ref,
                });
                const action = await this.do_action({
                    type: "ir.actions.act_window",
                    name: "View Record",
                    res_model: model,
                    res_id: false,
                    views: [[false, "form"]],
                    target: "new",
                    context: context,
                });
                this.screen.eprint("Writing random values...");
                const form_controller = this._getController(
                    action.controllerID
                );
                const [
                    processed_fields,
                    ignored_fields,
                ] = await this._processFormFields(form_controller);
                const required_count = _.size(
                    _.filter(processed_fields, field => field.required)
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
                    .fail(err => {
                        return reject(err);
                    });
            });
        },

        _getController: function(controller_id) {
            return this.getParent().action_manager.controllers[controller_id];
        },

        _processFormFields: function(controller) {
            return new Promise(async resolve => {
                const fields = controller.widget.renderer.state.fields;
                const fields_info =
                    controller.widget.renderer.state.fieldsInfo.form;
                const model = controller.widget.model;
                const record_id = controller.widget.handle;
                const processed = {};
                const ignored = [];
                let fields_ignored = [];
                for (const field_name in fields_info) {
                    if (fields_ignored.indexOf(field_name) !== -1) {
                        this.screen.eprint(
                            ` [i] Aborting changes for '${field_name}': Already changed by an 'onchange'`
                        );
                        ignored.push(field_name);
                        continue;
                    }
                    const field_info = fields_info[field_name];
                    const field = fields[field_name];
                    const $input = controller.dialog.$(
                        `input[name='${field_info.name}']:not(.o_invisible_modifier),div[name='${field_info.name}']:not(.o_invisible_modifier) input,select[name='${field_info.name}']:not(.o_invisible_modifier),textarea[name='${field_info.name}']:not(.o_invisible_modifier)`
                    );
                    if (
                        $input.length &&
                        !$input.parent().hasClass("o_invisible_modifier")
                    ) {
                        const local_data =
                            controller.widget.model.localData[
                                controller.widget.handle
                            ];
                        const domain = controller.widget.model._getDomain(
                            local_data,
                            {fieldName: field_info.name}
                        );
                        const state_data =
                            controller.widget.renderer.state.data;
                        const [
                            field_def,
                            affected_fields,
                        ] = await this._fillField(
                            $input,
                            record_id,
                            model,
                            domain,
                            field,
                            field_info,
                            state_data
                        );
                        processed[field_name] = field_def;
                        fields_ignored = _.union(
                            fields_ignored,
                            affected_fields
                        );
                    }
                }
                return resolve([processed, ignored]);
            });
        },

        _fillField: function(
            $input,
            record_id,
            model,
            domain,
            field,
            field_info,
            state_data
        ) {
            return new Promise(async resolve => {
                this.screen.eprint(
                    ` [o] Getting information of '${field_info.name}' field...`
                );
                const gen_field_def = {
                    $input: $input,
                    type: field.type,
                    relation: field.relation,
                    widget: field_info.widget,
                    required: field_info.modifiersValue?.required,
                };
                if (gen_field_def.relation) {
                    gen_field_def.values = await rpc.query({
                        model: gen_field_def.relation,
                        method: "search",
                        args: [domain],
                    });
                } else if (field.selection) {
                    gen_field_def.values = [];
                    for (const option of field.selection) {
                        gen_field_def.values.push(option[0]);
                    }
                }

                const changes = {};
                changes[field_info.name] = this._fieldValueGenerator.process(
                    gen_field_def
                );
                // Get the raw value to human printing
                let raw_value = changes[field_info.name];
                if (typeof raw_value === "object" && "operation" in raw_value) {
                    if (raw_value.operation === "ADD") {
                        raw_value = raw_value.id;
                    } else if (raw_value.operation === "ADD_M2M") {
                        raw_value = _.map(
                            raw_value.ids,
                            item => item.id
                        ).join();
                    }
                }
                this.screen.eprint(
                    ` [o] Writing the new random value: ${raw_value}`
                );
                try {
                    await model.trigger_up("field_changed", {
                        dataPointID: record_id,
                        changes: changes,
                        onSuccess: datas => {
                            const fields_affected = _.reject(
                                this._processFieldChanges(
                                    field_info.name,
                                    datas,
                                    state_data
                                ),
                                item => item === field_info.name
                            );
                            this.screen.eprint(
                                ` [i] Random value for '${field_info.name}' written`
                            );
                            if (_.some(fields_affected)) {
                                this.screen.eprint(
                                    `  ** 'onchange' fields detected: ${fields_affected.join()}`
                                );
                            }
                            return resolve([gen_field_def, fields_affected]);
                        },
                    });
                } catch (err) {
                    this.screen.eprint(
                        ` [x] Can't write the value for '${field_info.name}': ${err}`
                    );
                }
            });
        },

        _processFieldChanges: function(field_name, datas, state_data) {
            const fields_changed = [];
            for (const data of datas) {
                if (data.name === field_name) {
                    for (const rf_name in data.recordData) {
                        if (
                            !_.isEqual(
                                data.recordData[rf_name],
                                state_data[rf_name]
                            )
                        ) {
                            fields_changed.push(rf_name);
                        }
                    }
                    break;
                }
            }
            return fields_changed;
        },
    });
});
