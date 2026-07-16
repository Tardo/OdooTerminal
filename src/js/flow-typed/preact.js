// @flow strict
// Minimal Flow libdefs for preact and @preact/signals used by the options page.

declare module 'preact' {
  declare type VNode = any;
  declare type ComponentType<P> = any;
  declare export function h(type: any, props: any | null, ...children: any[]): VNode;
  declare export function render(vnode: VNode, parent: Element | Document | null): void;
  declare export function hydrate(vnode: VNode, parent: Element | Document | null): void;
  declare export function cloneElement(vnode: VNode, props?: any, ...children: any[]): VNode;
  declare export function createRef<T>(): {current: T | null};
  declare export const Fragment: any;
  declare export function createContext<T>(defaultValue: T): any;
}

declare module 'preact/hooks' {
  declare export function useState<S>(init: S | (() => S)): [S, (S | ((prev: S) => S)) => void];
  declare export function useEffect(fn: () => void | (() => void), deps?: $ReadOnlyArray<any>): void;
  declare export function useLayoutEffect(fn: () => void | (() => void), deps?: $ReadOnlyArray<any>): void;
  declare export function useRef<T>(init: T): {current: T};
  declare export function useCallback<T>(fn: T, deps?: $ReadOnlyArray<any>): T;
  declare export function useMemo<T>(fn: () => T, deps?: $ReadOnlyArray<any>): T;
  declare export function useContext<T>(ctx: any): T;
  declare export function useReducer<S, A>(reducer: (S, A) => S, init: S, initFn?: (S) => S): [S, (A) => void];
}

declare module '@preact/signals' {
  declare export interface Signal<T> {
    +value: T;
  }
  declare export function signal<T>(value: T): Signal<T>;
  declare export function computed<T>(fn: () => T): Signal<T>;
  declare export function effect(fn: () => void | (() => void)): () => void;
  declare export function useSignal<T>(init: T): Signal<T>;
  declare export function useComputed<T>(fn: () => T): Signal<T>;
}
