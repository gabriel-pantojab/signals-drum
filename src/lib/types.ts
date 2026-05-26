export type Listener<T> = (value: T) => void;
export type Unsubscribe = () => void;
export type Subscribe<T> = (listener: Listener<T>) => Unsubscribe;

export interface Signal<T> {
  (): T;
  subscribe: (listener: Listener<T>) => Unsubscribe;
}

export interface WritableSignal<T> extends Signal<T> {
  set: (value: T) => void;
  update: (callback: (prev: T) => T) => void;
  asReadonly: () => Signal<T>;
}

export interface Context {
  addListener: (listener: () => void) => void;
  popLastListener: () => (() => void) | undefined;
  getLastListener: () => (() => void) | undefined;
  addUnsubscribe: (unsubscribe: Unsubscribe) => void;
  getUnsubscribes: () => Unsubscribe[];
}
