// @flow strict
// Copyright  Alexandre Díaz <dev@redneboa.es>
// License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).

import getOdooRoot from './get_odoo_root';

export type ActiveModalInfo = {model: string, id: number | void};

// Odoo 16+: dialogs are rendered via DialogWrapper near the top of the OWL
// component tree. DialogWrapper receives { subComponent, subProps } where
// subProps contains the original dialog props (resModel, resId).
// $FlowFixMe[unclear-type]
function findInOwlTree(component: Object | null, depth: number): ActiveModalInfo | null {
  if (!component || depth > 10) {
    return null;
  }
  // $FlowFixMe[prop-missing]
  const props = component.props;
  if (typeof props?.resModel === 'string') {
    return {model: props.resModel, id: props.resId};
  }
  // DialogWrapper pattern
  if (typeof props?.subProps?.resModel === 'string') {
    return {model: props.subProps.resModel, id: props.subProps.resId};
  }
  // $FlowFixMe[prop-missing]
  const children = component.__owl__?.children ?? {};
  for (const child of Object.values(children)) {
    // $FlowFixMe[prop-missing]
    const result = findInOwlTree(child?.component ?? null, depth + 1);
    if (result) {
      return result;
    }
  }
  return null;
}

function getOwlDialogInfo(): ActiveModalInfo | null {
  if (!document.querySelector('.o_dialog')) {
    return null;
  }
  try {
    return findInOwlTree(getOdooRoot(), 0);
  } catch (_err) {
    // not available
  }
  return null;
}

// Odoo 14: action_manager.currentDialogController holds the active dialog's
// controller object { widget: FormController, dialog: Dialog, ... }.
// FormController exposes modelName; res_id comes from BasicModel.localData[handle]
// (BasicModel has no public get() — only the internal __get).
function getLegacyDialogInfo(): ActiveModalInfo | null {
  try {
    const root = getOdooRoot();
    // $FlowFixMe[prop-missing]
    const widget = root.action_manager?.currentDialogController?.widget;
    if (!widget) {
      return null;
    }
    // $FlowFixMe[prop-missing]
    const model: mixed = widget.modelName;
    if (typeof model !== 'string') {
      return null;
    }
    // $FlowFixMe[prop-missing]
    const record = widget.model?.localData?.[widget.handle];
    // $FlowFixMe[prop-missing]
    const resId: mixed = record?.res_id ?? widget.initialState?.res_id;
    return {model, id: typeof resId === 'number' ? resId : undefined};
  } catch (_err) {
    // not available
  }
  return null;
}

export default function (): ActiveModalInfo | null {
  return getOwlDialogInfo() ?? getLegacyDialogInfo();
}
