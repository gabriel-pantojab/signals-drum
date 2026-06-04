import type { Context, ContextListener, Unsubscribe } from "./types";

function createContext(): Context {
  const listeners: Array<ContextListener> = [];
  const unsubscribes: Unsubscribe[] = [];
  let isSchedulingOpen: boolean = false;
  const pendingListeners = new Map<(value: unknown) => void, () => void>();

  return {
    pushListener: (listener: ContextListener) => listeners.push(listener),
    popLastListener: () => listeners.pop(),
    getLastListener: () => listeners.at(-1),
    addUnsubscribe: (unsubscribe: Unsubscribe) => unsubscribes.push(unsubscribe),
    getUnsubscribes: () => {
      const res = [...unsubscribes];
      unsubscribes.length = 0;
      return res;
    },
    startScheduling: () => {
      if (!isSchedulingOpen) {
        isSchedulingOpen = true;
        queueMicrotask(() => {
          for (const call of pendingListeners.values()) {
            call();
          }
          pendingListeners.clear();
          isSchedulingOpen = false;
        });
      }
    },
    addPendingListener: <T>(listener: (value: T) => void, value: T) => {
      if (!isSchedulingOpen) {
        throw Error("Cannot add a pending listener because scheduling is not open.");
      }

      pendingListeners.set(listener as (value: unknown) => void, () => listener(value));
    },
  };
}

export const context: Context = createContext();
