// @flow strict
// Copyright  Taois <taoist.han@vertechs.com>
// License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).

import getOdooRoot from '@odoo/utils/get_odoo_root';

const CLASS_NAME = 'ot-technical-model-name';
const CLASS_BREADCRUMB = 'ot-technical-model-name-breadcrumb';
const SELECTORS = ['ol.breadcrumb', 'div.o_breadcrumb', 'div.o_control_panel_navigation'];

// Read the major version straight off window.odoo — the service-based
// getOdooVersionInfo() chain breaks on production builds (no __DEBUG__).
function getOdooMajorVersion(): number | void {
  const info = window.odoo?.info || window.odoo?.session_info;
  if (!info) {
    return undefined;
  }
  const svi = info.server_version_info;
  if (Array.isArray(svi) && svi.length && typeof svi[0] === 'number') {
    return svi[0];
  }
  const sv = info.server_version;
  if (typeof sv === 'string') {
    const m = sv.match(/(\d+)/);
    if (m) {
      return Number(m[1]);
    }
  }
  return undefined;
}

function getCurrentModel(): string | void {
  let root;
  try {
    root = getOdooRoot();
  } catch (_err) {
    return;
  }
  const resModel = root?.actionService?.currentController?.props?.resModel;
  if (typeof resModel === 'string') {
    return resModel;
  }
}

function createModelSpan(modelName: string): HTMLSpanElement {
  const span = document.createElement('span');
  span.classList.add(CLASS_NAME, CLASS_BREADCRUMB);
  span.textContent = `(${modelName})`;
  return span;
}

function handleNode(target: Element | Document): void {
  // Fast path: most mutated nodes aren't breadcrumb hosts — bail before
  // calling getOdooRoot(), which walks the service registry.
  let host: Element | void;
  for (const selector of SELECTORS) {
    const el =
      target instanceof Element && target.matches(selector)
        ? target
        : (target.querySelector?.(selector): ?Element);
    if (el instanceof Element) {
      if (el.querySelector(`span.${CLASS_NAME}`)) {
        return;
      }
      host = el;
      break;
    }
  }
  if (!host) {
    return;
  }
  const modelName = getCurrentModel();
  if (typeof modelName !== 'string') {
    return;
  }
  host.appendChild(createModelSpan(modelName));
}

let started = false;
export function startTechnicalModelObserver(minVersion: number = 18): void {
  if (started) {
    return;
  }
  let attempt = 0;
  const tryStart = () => {
    const major = getOdooMajorVersion();
    if (typeof major !== 'number') {
      if (attempt++ < 30) {
        setTimeout(tryStart, 500);
      }
      return;
    }
    if (major < minVersion) {
      return;
    }
    try {
      getOdooRoot();
    } catch (_err) {
      if (attempt++ < 30) {
        setTimeout(tryStart, 500);
      }
      return;
    }
    const body = document.body;
    if (!body) {
      return;
    }
    started = true;
    handleNode(body);
    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        if (mutation.type !== 'childList' || mutation.addedNodes.length === 0) {
          continue;
        }
        mutation.addedNodes.forEach((node) => {
          if (node.nodeType === Node.ELEMENT_NODE && node instanceof Element) {
            handleNode(node);
          }
        });
      }
    });
    observer.observe(body, {childList: true, subtree: true});
  };
  tryStart();
}
