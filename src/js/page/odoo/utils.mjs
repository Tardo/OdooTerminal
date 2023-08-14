// Copyright  Alexandre Díaz <dev@redneboa.es>
// License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).

const service_cache = {};
export function getOdooService(...service_names) {
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

export function getOdooSession() {
  const sess_obj = getOdooService("web.session", "@web/session");
  if (!sess_obj) {
    return odoo.session_info;
  }
  if (Object.hasOwn(sess_obj, "session")) {
    return sess_obj.session;
  }
  return sess_obj;
}

export function getUID() {
  const session = getOdooSession();
  return session?.uid || session?.user_id || -1;
}

export function getUsername() {
  return getOdooSession()?.username;
}

export function getOdooVersion() {
  return (
    getOdooSession()?.server_version ||
    __OdooTerminal.raw_server_info.serverVersionRaw
  );
}

export function getOdooVersionMajor() {
  return Number(getOdooVersion().split(".", 1)[0]);
}

export function getOdooVersionInfo() {
  return (
    getOdooSession()?.server_version_info ||
    __OdooTerminal.raw_server_info.serverVersionInfo
  );
}

export function isPublicUser() {
  return getOdooSession()?.is_website_user;
}

export function isBackOffice() {
  return __OdooTerminal.raw_server_info.isBackOffice;
}

export function getContent(options, onerror) {
  return getOdooSession()?.get_file({
    complete: getOdooService("web.framework")?.unblockUI,
    data: Object.assign({}, options, {
      download: true,
      data: getOdooService("web.utils")?.is_bin_size(options.data)
        ? null
        : options.data,
    }),
    error: onerror,
    url: "/web/content",
  });
}
