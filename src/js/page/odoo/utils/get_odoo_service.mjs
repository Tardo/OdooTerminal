// Copyright  Alexandre Díaz <dev@redneboa.es>
// License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).

const service_cache = {};
export default function (...service_names) {
  const service_names_set = Array.from(new Set(service_names));
  if (Object.hasOwn(service_cache, service_names_set)) {
    return service_cache[service_names_set];
  }
  const service_name = Array.from(service_names_set).find((sname) =>
    Object.hasOwn(odoo.__DEBUG__.services, sname)
  );
  if (service_name) {
    const service = odoo.__DEBUG__.services[service_name];
    service_cache[service_names_set] = service;
    return service;
  }
  return null;
}
