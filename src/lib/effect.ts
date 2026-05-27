import { context } from "./context";
import type { Unsubscribe } from "./types";

export function effect(callback: (onCleanup: (fn: () => void) => void) => void): Unsubscribe {
  const unsubscribes: Unsubscribe[] = [];
  let cleanFn: (() => void) | undefined = undefined;
  const onCleanup: (fn: () => void) => void = (fn: () => void) => (cleanFn = fn);

  const run: () => void = () => {
    cleanFn?.();
    cleanFn = undefined;
    for (const unsubscribe of unsubscribes) {
      unsubscribe();
    }
    context.addListener(() => run());
    callback(onCleanup);
    unsubscribes.length = 0;
    unsubscribes.push(...context.getUnsubscribes());
    context.popLastListener();
  };

  run();

  return (): void => {
    cleanFn?.();
    cleanFn = undefined;
    for (const unsubscribe of unsubscribes) {
      unsubscribe();
    }
  };
}
