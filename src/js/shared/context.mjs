// @flow strict
// Copyright  Alexandre Díaz <dev@redneboa.es>
// License MIT (https://opensource.org/license/mit).

export type Context = {
  isOdoo: boolean,
  isLoaded: boolean,
  isCompatible: boolean,
  isBackOffice: boolean,
  isSaas: boolean,
  isEnterprise: boolean,
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
  isEnterprise: false,
};

export function updateContext(...values: Array<{...}>) {
  // $FlowFixMe[unsafe-object-assign]
  Object.assign(InstanceContext, ...values);
}
