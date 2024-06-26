declare var odoo: Object;
declare var owl: Object;
declare var luxon: Object;
declare type OdooDomainTuple = [string, string, string | number | $ReadOnlyArray<string | number>];
declare type OdooMany2One = [number, string];
declare type OdooSearchRecord = {[string]: mixed};
declare type OdooSession = {
  get_file: (options: {[string]: mixed}) => boolean,
  _session_authenticate: (db: string, login: string, passwd: string) => boolean,
  session_logout: void => void,
  user_context: {[string]: string | number},
  db: string,
  uid: number,
  user_id: number,
  [string]: number | string,
};
declare type OdooLongpollingItem = [string, string] | {...};
declare type OdooSearchResponse = Object;
