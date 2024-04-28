// @flow strict
// Copyright  Alexandre Díaz <dev@redneboa.es>
// License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).

export type Context = {
  isOdoo: boolean,
  isLoaded: boolean,
  isCompatible: boolean,
  isBackOffice: boolean,
  isSaas: boolean,
  serverVersion?: {
    raw: string,
    major: number,
    minor: number,
    status: string,
    statusLevel: number,
  },
};

export const InstanceContext: Context = {
  isOdoo: false,
  isLoaded: false,
  isCompatible: false,
  isBackOffice: false,
  isSaas: false,
};

export function updateContext(...values: Array<{...}>) {
  Object.assign(InstanceContext, ...values);
}
