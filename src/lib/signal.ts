export type Listener<T> = (value: T) => void;
export type Unsubscribe = () => void;
type Subscribe<T> = (listener: Listener<T>) => Unsubscribe;

export interface Signal<T> {
  (): T;
  subscribe: (listener: Listener<T>) => Unsubscribe;
}

export interface WritableSignal<T> extends Signal<T> {
  set: (value: T) => void;
  update: (callback: (prev: T) => T) => void;
  asReadonly: () => Signal<T>;
}

export function signal<T>(initialValue: T): WritableSignal<T> {
  let value: T = initialValue;
  const listeners: Set<Listener<T>> = new Set<Listener<T>>();

  const subscribe: Subscribe<T> = (listener: Listener<T>): Unsubscribe => {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  };

  const notify: () => void = () => {
    listeners.forEach((listener) => listener(value));
  };

  const signalFunction: WritableSignal<T> = () => value;
  const signalReadonly: Signal<T> = () => value;
  signalReadonly.subscribe = subscribe;

  signalFunction.set = (newValue: T) => {
    if (newValue === value) return;
    value = newValue;
    notify();
  };

  signalFunction.update = (callback: (prev: T) => T) => {
    const newValue: T = callback(value);
    if (newValue === value) return;
    value = newValue;
    notify();
  };

  signalFunction.subscribe = subscribe;
  signalFunction.asReadonly = () => signalReadonly;

  return signalFunction;
}
