import { context } from "./context";
import { signal } from "./signal";
import type { Signal, Unsubscribe, WritableSignal } from "./types";

export function computed<T>(callback: () => T): Signal<T> {
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
    internalSignal.set(recompute());
  };

  const internalSignal: WritableSignal<T> = signal(recompute());

  return internalSignal.asReadonly();
}
