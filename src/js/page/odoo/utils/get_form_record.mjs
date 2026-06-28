// @flow strict
// Copyright  Alexandre Díaz <dev@redneboa.es>
// License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).

import getOdooRoot from './get_odoo_root';
import callModel from '@odoo/osv/call_model';

type FieldDef = {type?: string, relation?: string};

// Legacy (Odoo 11–13): probe well-known direct property paths on the action
// manager's inner_widget (a ViewManager in 11-13) to reach the FormController
// without recursively walking the entire widget tree (which can hang).
// $FlowFixMe[unclear-type]
function findLegacyFormController(root: Object): Object | null {
  try {
    // $FlowFixMe[prop-missing]
    const vm = root.action_manager?.inner_widget;
    if (!vm) return null;
    // Candidate paths used across Odoo 11-13 ViewManager implementations
    const candidates = [
      vm,                            // inner_widget IS the FormController
      // $FlowFixMe[prop-missing]
      vm.active_view?.controller,    // ViewManager.active_view.controller
      // $FlowFixMe[prop-missing]
      vm.current_view?.controller,   // alternate property name
      // $FlowFixMe[prop-missing]
      vm.views?.form?.controller,    // ViewManager.views['form'].controller
    ];
    for (const c of candidates) {
      // $FlowFixMe[prop-missing]
      if (c?.model?.localData && typeof c.handle === 'string') {
        return c;
      }
    }
  } catch (_e) {}
  return null;
}

// OWL (Odoo 16+): walk the component tree looking for a component whose
// model.root has an update() method — that's the FormController's record.
// $FlowFixMe[unclear-type]
function findOwlFormRoot(component: Object | null, depth: number): Object | null {
  if (!component || depth > 20) {
    return null;
  }
  try {
    // $FlowFixMe[prop-missing]
    const model = component.model;
    // $FlowFixMe[prop-missing]
    if (model?.root && typeof model.root.update === 'function') {
      // $FlowFixMe[prop-missing]
      return model.root;
    }
  } catch (_e) {
    // ignore
  }
  // $FlowFixMe[prop-missing]
  const children = component.__owl__?.children ?? {};
  for (const child of Object.values(children)) {
    // $FlowFixMe[prop-missing]
    const result = findOwlFormRoot(child?.component ?? null, depth + 1);
    if (result !== null) {
      return result;
    }
  }
  return null;
}

// For any many2one field whose value is a bare integer, fetch the display_name
// and convert to [id, display_name] — the canonical Odoo wire format understood
// by both RelationalModel.root.update and legacy trigger_up('field_changed').
async function enrichMany2oneValues(
  fields: {[string]: FieldDef},
  changes: {[string]: mixed},
  context: {[string]: mixed},
): Promise<{[string]: mixed}> {
  const result: {[string]: mixed} = {};
  for (const [fieldName, value] of Object.entries(changes)) {
    const fieldDef = fields[fieldName];
    if (
      fieldDef?.type === 'many2one' &&
      typeof value === 'number' &&
      typeof fieldDef.relation === 'string'
    ) {
      try {
        const rows: Array<{display_name?: mixed, ...}> = await callModel(
          fieldDef.relation,
          'read',
          [[value], ['display_name']],
          {},
          context,
        );
        const displayName: mixed = rows[0]?.display_name;
        result[fieldName] = [value, typeof displayName === 'string' ? displayName : String(value)];
      } catch (_e) {
        result[fieldName] = [value, String(value)];
      }
    } else {
      result[fieldName] = value;
    }
  }
  return result;
}

export type FormRecordAdapter = {
  update(changes: {[string]: mixed}, context: {[string]: mixed}): Promise<void>,
};

// Returns an adapter to edit the currently open form view's in-memory record,
// or null if no editable form is found.
// OWL path (Odoo 16+) is tried first; then the legacy BasicModel path (11–15).
export default function getFormRecord(): FormRecordAdapter | null {
  // OWL path (Odoo 16+)
  try {
    const root = getOdooRoot();
    const record = findOwlFormRoot(root, 0);
    if (record !== null) {
      return {
        update: async (changes, context) => {
          // $FlowFixMe[prop-missing]
          const fields: {[string]: FieldDef} = record.fields ?? {};
          const enriched = await enrichMany2oneValues(fields, changes, context);
          await record.update(enriched);
        },
      };
    }
  } catch (_e) {
    // not OWL or root unavailable
  }

  // Legacy path (Odoo 11–15): BasicModel via action_manager
  try {
    const root = getOdooRoot();
    // Odoo 14-15: action_manager exposes currentController.widget directly.
    // Odoo 11-13: currentController does not exist; probe inner_widget paths.
    // $FlowFixMe[prop-missing]
    let widget = root.action_manager?.currentController?.widget;
    if (!widget?.model?.localData || typeof widget.handle !== 'string') {
      widget = findLegacyFormController(root);
    }
    if (widget?.model && typeof widget.handle === 'string') {
      return {
        update: async (changes, context) => {
          // Switch to edit mode if the form is currently read-only.
          // Odoo 11-13 uses mode 'view'; Odoo 14-15 uses 'readonly'.
          // trigger_up('field_changed') is a no-op unless in edit mode.
          // $FlowFixMe[prop-missing]
          const currentMode: mixed = widget.mode;
          if (
            (currentMode === 'readonly' || currentMode === 'read' || currentMode === 'view') &&
            typeof widget.setMode === 'function'
          ) {
            // $FlowFixMe[prop-missing]
            const modeResult: mixed = widget.setMode('edit');
            // setMode may return a jQuery Deferred or Promise in some versions
            // $FlowFixMe[prop-missing]
            if (modeResult !== null && modeResult !== undefined && typeof modeResult.then === 'function') {
              // $FlowFixMe[incompatible-call]
              await modeResult;
            }
            // Let the renderer finish applying the mode change
            await new Promise(resolve => setTimeout(resolve, 100));
          }
          // $FlowFixMe[prop-missing]
          const localRecord = widget.model.localData?.[widget.handle];
          // $FlowFixMe[prop-missing]
          const fields: {[string]: FieldDef} = localRecord?.fields ?? {};
          const enriched = await enrichMany2oneValues(fields, changes, context);
          widget.trigger_up('field_changed', {
            dataPointID: widget.handle,
            changes: enriched,
            force_save: false,
          });
        },
      };
    }
  } catch (_e) {
    // not legacy or unavailable
  }

  return null;
}
