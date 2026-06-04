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
  const contextListeners: Set<ContextListener> = new Set<ContextListener>();

  const subscribe: Subscribe<T> = (listener: Listener<T>): Unsubscribe => {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  };

  const notify: () => void = () => {
    context.startScheduling();
    listeners.forEach((listener) => context.addPendingListener(listener, value));

    // Use a snapshot of the current listeners to prevent mutations
    // during notification dispatch from affecting this iteration.
    [...contextListeners].forEach((contextListener) => {
      if (contextListener.type === "computed") {
        contextListener.listener();
      } else {
        context.addPendingListener(contextListener.listener, value);
      }
    });
  };

  const trackInContext = (): void => {
    const lastContextListener: ContextListener | undefined = context.getLastListener();

    if (lastContextListener) {
      contextListeners.add(lastContextListener);
      context.addUnsubscribe(() => contextListeners.delete(lastContextListener));
    }
  };

  const validateMutation = (): void => {
    const lastContextListener: ContextListener | undefined = context.getLastListener();
    if (lastContextListener?.type === "computed") {
      throw Error("Writing to signals is not allowed in a computed");
    }

    if (lastContextListener?.type === "effect" && contextListeners.has(lastContextListener)) {
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
