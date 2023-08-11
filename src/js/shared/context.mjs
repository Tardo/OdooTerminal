// Copyright  Alexandre Díaz <dev@redneboa.es>
// License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).

export const InstanceContext = {
  isOdoo: false,
  isLoaded: false,
  serverVersionRaw: null,
  isCompatible: false,
  isBackOffice: false,
  serverVersion: {
    major: 0,
    minor: 0,
  },
};

/**
 * Update the instance context and update the action badge
 * @param  {...any} values
 */
export function updateContext(...values) {
  Object.assign(InstanceContext, ...values);
}

/**
 * Get necessary resources to initialize the terminal
 * @returns {Array}
 */
export function getResources() {
  return {
    css: ["src/css/terminal.css"],
    js: ["src/js/page/loader.mjs"],
  };
}
