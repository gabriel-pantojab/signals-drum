import { context } from "./context";
import { signal } from "./signal";
import type { Listener, Signal, Unsubscribe, WritableSignal } from "./types";

export function computed<T>(callback: () => T): Signal<T> {
  let internalSignal: WritableSignal<T> | undefined = undefined;
  const unsubscribes: Unsubscribe[] = [];

  const recompute: () => T = () => {
    for (const unsubscribe of unsubscribes) {
      unsubscribe();
    }
    context.pushListener({
      type: "computed",
      listener,
    });
    const value = callback();
    unsubscribes.length = 0;
    unsubscribes.push(...context.getUnsubscribes());
    context.popLastListener();
    return value;
  };

  const listener: () => void = () => {
    if (!internalSignal) return;

    internalSignal.set(recompute());
  };

  const getSafeInternalSignal: () => WritableSignal<T> = () => {
    if (!internalSignal) {
      internalSignal = signal(recompute());
    }
    return internalSignal;
  };

  const readonlySignal: Signal<T> = () => {
    return getSafeInternalSignal()();
  };

  readonlySignal.subscribe = (listener: Listener<T>) => {
    return getSafeInternalSignal().subscribe(listener);
  };

  return readonlySignal;
}
