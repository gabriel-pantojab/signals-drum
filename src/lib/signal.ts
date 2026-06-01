import { context } from "./context";
import type {
  ContextListener,
  Listener,
  Signal,
  Subscribe,
  Unsubscribe,
  WritableSignal,
} from "./types";

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
    const currentListeners: Set<Listener<T>> = new Set(listeners);
    currentListeners.forEach((listener) => listener(value));
  };

  const trackInContext = (): void => {
    const lastContextListener: ContextListener | undefined = context.getLastListener();

    if (lastContextListener) {
      const unsubscribe: Unsubscribe = subscribe(lastContextListener.listener);
      context.addUnsubscribe(unsubscribe);
    }
  };

  const validateMutation = (): void => {
    const lastContextListener: ContextListener | undefined = context.getLastListener();
    if (lastContextListener?.type === "computed") {
      throw Error("Writing to signals is not allowed in a computed");
    }

    if (lastContextListener?.type === "effect" && listeners.has(lastContextListener.listener)) {
      throw Error("Cannot write to a signal that is a dependency of the current effect.");
    }
  };

  const signalFunction: WritableSignal<T> = () => {
    trackInContext();
    return value;
  };

  const signalReadonly: Signal<T> = () => {
    trackInContext();
    return value;
  };

  signalReadonly.subscribe = subscribe;

  signalFunction.set = (newValue: T) => {
    validateMutation();

    if (newValue === value) return;
    value = newValue;
    notify();
  };

  signalFunction.update = (callback: (prev: T) => T) => {
    validateMutation();

    const newValue: T = callback(value);
    if (newValue === value) return;
    value = newValue;
    notify();
  };

  signalFunction.subscribe = subscribe;
  signalFunction.asReadonly = () => signalReadonly;

  return signalFunction;
}
