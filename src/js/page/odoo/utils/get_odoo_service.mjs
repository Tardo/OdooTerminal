// @flow strict
// Copyright  Alexandre Díaz <dev@redneboa.es>
// License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).

function getOrigService(serv_name: string) {
  if (odoo.__DEBUG__) {
    return odoo.__DEBUG__.services[serv_name];
  }
  return odoo.loader.modules.get(serv_name);
}

// $FlowFixMe
const service_cache: {[Array<string>]: OdooService} = {};
// $FlowFixMe
export default function (...service_names: Array<string>): OdooService {
  const service_names_set = Array.from(new Set(service_names));
  if (Object.hasOwn(service_cache, service_names_set)) {
    return service_cache[service_names_set];
  }
  const service_name = Array.from(service_names_set).find(
    sname => Object.hasOwn(odoo?.__DEBUG__?.services || {}, sname) || odoo?.loader?.modules?.has(sname),
  );
  if (typeof service_name !== 'undefined' && service_name !== '') {
    const service = getOrigService(service_name);
    service_cache[service_names_set] = service;
    return service;
  }
  return undefined;
}
