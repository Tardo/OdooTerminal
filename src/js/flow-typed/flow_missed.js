declare function structuredClone<T>(value: T, options?: {| transfer: any[] |}): T;
declare function $<T>(data: mixed): T;

declare type Browser = Object;

declare type AMutex = Object;

declare type Deferred = {
  promise: Promise<>,
  resolve?: (value?: mixed) => void,
  reject?: (reason?: mixed) => void,
};
