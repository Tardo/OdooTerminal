// @flow strict
// Copyright  Alexandre Díaz <dev@redneboa.es>
// License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).

import getOdooEnv from './get_odoo_env';

// $FlowFixMe
export default function (service_name: string): Object {
  const {services} = getOdooEnv();
  if (!Object.hasOwn(services, service_name)) {
    throw new Error(`Service '${service_name}' not available`);
  }
  return services[service_name];
}
