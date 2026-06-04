import { context } from "./context";
import type { ContextListener, Signal, Unsubscribe } from "./types";

export function computed<T>(callback: () => T): Signal<T> {
  let value: T;
  let isDirty: boolean = true;
  const listeners: Set<ContextListener> = new Set<ContextListener>();
  const unsubscribes: Unsubscribe[] = [];

  const recompute: () => T = () => {
    for (const unsubscribe of unsubscribes) {
      unsubscribe();
    }
    context.pushListener({
      type: "computed",
      listener,
    });
    const recomputedValue: T = callback();
    unsubscribes.length = 0;
    unsubscribes.push(...context.getUnsubscribes());
    context.popLastListener();
    return recomputedValue;
  };

  const listener: () => void = () => {
    isDirty = true;
    context.startScheduling();
    listeners.forEach((contextListener) => {
      if (contextListener.type === "computed") {
        contextListener.listener();
      } else {
        context.addPendingListener(contextListener.listener, value);
      }
    });
  };

  const subscribe: (listener: ContextListener) => Unsubscribe = (
    listener: ContextListener,
  ): Unsubscribe => {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  };

  const trackInContext = (): void => {
    const lastContextListener: ContextListener | undefined = context.getLastListener();

    if (lastContextListener) {
      const unsubscribe: Unsubscribe = subscribe(lastContextListener);
      context.addUnsubscribe(unsubscribe);
    }
  };

  const readonlySignal: Signal<T> = (): T => {
    if (isDirty) {
      value = recompute();
      isDirty = false;
    }

    trackInContext();

    return value;
  };

  return readonlySignal;
}
