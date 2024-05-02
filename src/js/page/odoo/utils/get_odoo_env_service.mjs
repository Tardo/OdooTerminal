// @flow strict
// Copyright  Alexandre Díaz <dev@redneboa.es>
// License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).

// $FlowIgnore
import i18n from 'i18next';
import getOdooEnv from './get_odoo_env';

// $FlowFixMe
export default function (service_name: string): Object {
  const {services} = getOdooEnv();
  if (!Object.hasOwn(services, service_name)) {
    throw new Error(i18n.t('getOdooEnvService.error', "Service '{{service_name}}' is not available", {service_name}));
  }
  return services[service_name];
}
