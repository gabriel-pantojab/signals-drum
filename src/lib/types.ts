export type Listener<T> = (value: T) => void;
export type Unsubscribe = () => void;
export type Subscribe<T> = (listener: Listener<T>) => Unsubscribe;

export interface Signal<T> {
  (): T;
}

export interface WritableSignal<T> extends Signal<T> {
  set: (value: T) => void;
  update: (callback: (prev: T) => T) => void;
  subscribe: (listener: Listener<T>) => Unsubscribe;
  asReadonly: () => Signal<T>;
}

export interface ContextListener {
  type: "computed" | "effect";
  listener: () => void;
}

export interface Context {
  pushListener: (listener: ContextListener) => void;
  popLastListener: () => ContextListener | undefined;
  getLastListener: () => ContextListener | undefined;
  addUnsubscribe: (unsubscribe: Unsubscribe) => void;
  getUnsubscribes: () => Unsubscribe[];
  startScheduling: () => void;
  addPendingListener: <T>(listener: (value: T) => void, value: T) => void;
}
