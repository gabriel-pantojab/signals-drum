import type { Context, ContextListener, Unsubscribe } from "./types";

function createContext(): Context {
  const listeners: Array<ContextListener> = [];
  const unsubscribes: Unsubscribe[] = [];

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
  };
}

export const context: Context = createContext();
