// @flow strict
// Copyright  Alexandre Díaz <dev@redneboa.es>
// License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).

import callModel from '@odoo/osv/call_model';
import getOdooRoot from './get_odoo_root';
import getUrlInfo from './get_url_info';

function getCurrentViewContext(): {model: string | void, viewId: number | false} {
  let model: string | void;
  let viewId: number | false = false;
  try {
    const controller = getOdooRoot()?.actionService?.currentController;
    // $FlowFixMe[prop-missing]
    model = controller?.props?.resModel;
    // $FlowFixMe[prop-missing]
    const rawId: mixed = controller?.view?.id;
    viewId = typeof rawId === 'number' ? rawId : false;
  } catch (_e) {
    // Legacy Odoo: no actionService
  }
  if (typeof model !== 'string') {
    // $FlowFixMe[incompatible-type]
    model = getUrlInfo('hash', 'model');
  }
  return {model, viewId};
}

export async function getFormViewArch(context: {[string]: mixed}): Promise<string | null> {
  const {model, viewId} = getCurrentViewContext();
  if (typeof model !== 'string') {
    return null;
  }
  try {
    // Odoo 16+ (get_views)
    // $FlowFixMe[unclear-type]
    const result: Object = await callModel(
      model,
      'get_views',
      [[[viewId, 'form']]],
      {options: {}},
      context,
    );
    // $FlowFixMe[prop-missing]
    const arch: mixed = result?.views?.form?.arch;
    if (typeof arch === 'string') {
      return arch;
    }
  } catch (_e) {
    // fall through to fields_view_get
  }
  try {
    // Odoo <17 fallback (fields_view_get)
    // $FlowFixMe[unclear-type]
    const result: Object = await callModel(
      model,
      'fields_view_get',
      [viewId, 'form'],
      null,
      context,
    );
    // $FlowFixMe[prop-missing]
    const arch: mixed = result?.arch;
    if (typeof arch === 'string') {
      return arch;
    }
  } catch (_e) {
    // not available
  }
  return null;
}

// Returns the stack of page `string` attributes (outermost first) that lead to
// the field within notebook elements. Returns [] when the field is not inside
// any notebook (i.e., it is directly visible on the form).
export function findFieldNotebookPath(arch: string, fieldName: string): Array<string> {
  // $FlowFixMe[prop-missing]
  const doc = new DOMParser().parseFromString(arch, 'text/xml');

  function search(node: Element, path: $ReadOnlyArray<string>): Array<string> {
    // $FlowFixMe[prop-missing]
    for (const child of node.children) {
      if (child.tagName === 'notebook') {
        // $FlowFixMe[prop-missing]
        for (const page of child.children) {
          if (page.tagName !== 'page') {
            continue;
          }
          const label = page.getAttribute('string') ?? '';
          const nextPath = [...path, label];
          // Direct child field match
          if (page.querySelector(`field[name="${fieldName}"]`)) {
            return nextPath;
          }
          // Recurse into nested structure (nested notebooks, groups, etc.)
          const deeper = search(page, nextPath);
          if (deeper.length > 0) {
            return deeper;
          }
        }
      } else {
        const deeper = search(child, path);
        if (deeper.length > 0) {
          return deeper;
        }
      }
    }
    return [];
  }

  const root = doc.documentElement;
  if (!root) {
    return [];
  }
  return search(root, []);
}
