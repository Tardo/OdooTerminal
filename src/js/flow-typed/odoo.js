declare var odoo: Object;
declare var owl: Object;
declare var luxon: Object;
declare var moment: Object;
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
  storeData: Object,
  [string]: number | string,
};
declare type OdooSessionInfo = Object;
declare type OdooSessionInfoUserContext = Object;
declare type OdooLongpollingData = Object;
declare type OdooLongpollingItem = [string, string] | {...};
declare type OdooSearchResponse = Object;

declare type OdooRoot = Object;
declare type OdooService = Object;
declare type BusService = OdooService;
declare type BarcodeService = OdooService;
declare type UserService = OdooService;

declare type OdooQueryRPCParams = Object;

declare type OdooMetadataInfo = {
  id: number,
  create_uid: number,
  create_date: string,
  write_uid: number,
  write_date: string,
  noupdate: boolean,
  xmlid: string,
};
