import { expect, it, describe, vi } from "vitest";
import { signal, effect } from "../lib";
import type { WritableSignal, Unsubscribe } from "../lib/types";

describe("effect", () => {
  describe("initial execution", () => {
    it("runs the callback immediately on creation", () => {
      const callbackSpy = vi.fn<(onCleanup: (fn: () => void) => void) => void>();
      effect(callbackSpy);
      expect(callbackSpy).toHaveBeenCalledOnce();
    });

    it("returns an unsubscribe function", () => {
      const stopEffect: Unsubscribe = effect(() => {});
      expect(typeof stopEffect).toBe("function");
    });
  });

  describe("reactivity", () => {
    it("re-runs when a tracked signal changes", async () => {
      const name: WritableSignal<string> = signal("gabriel");
      const callbackSpy = vi.fn<() => void>(() => {
        name();
      });
      effect(callbackSpy);

      name.set("pantoja");
      await Promise.resolve();

      expect(callbackSpy).toHaveBeenCalledTimes(2);
    });

    it("re-runs when any of multiple tracked signals change", async () => {
      const firstName: WritableSignal<string> = signal("gabriel");
      const lastName: WritableSignal<string> = signal("pantoja");
      const callbackSpy = vi.fn<() => void>(() => {
        firstName();
        lastName();
      });
      effect(callbackSpy);

      firstName.set("jorge");
      await Promise.resolve();
      expect(callbackSpy).toHaveBeenCalledTimes(2);

      lastName.set("bustamante");
      await Promise.resolve();
      expect(callbackSpy).toHaveBeenCalledTimes(3);
    });

    it("batches consecutive sets — effect re-runs once with the latest value", async () => {
      const counter: WritableSignal<number> = signal(0);
      const capturedValues: number[] = [];
      effect(() => {
        capturedValues.push(counter());
      });

      counter.set(1);
      counter.set(2);
      await Promise.resolve();

      expect(capturedValues).toEqual([0, 2]);
    });
  });

  describe("dynamic dependency tracking", () => {
    it("stops tracking a signal that is no longer read", async () => {
      const active: WritableSignal<boolean> = signal(true);
      const name: WritableSignal<string> = signal("gabriel");
      const callbackSpy = vi.fn<() => void>(() => {
        if (active()) name();
      });
      effect(callbackSpy);

      active.set(false);
      await Promise.resolve(); // effect re-runs, name is now untracked
      const callsAfterDeactivation: number = callbackSpy.mock.calls.length;

      name.set("pantoja");
      await Promise.resolve();
      expect(callbackSpy.mock.calls.length).toBe(callsAfterDeactivation);
    });

    it("starts tracking a signal that becomes reachable", async () => {
      const active: WritableSignal<boolean> = signal(false);
      const name: WritableSignal<string> = signal("gabriel");
      const callbackSpy = vi.fn<() => void>(() => {
        if (active()) name();
      });
      effect(callbackSpy);

      active.set(true);
      await Promise.resolve(); // effect re-runs, name is now tracked
      const callsAfterActivation: number = callbackSpy.mock.calls.length;

      name.set("pantoja");
      await Promise.resolve();
      expect(callbackSpy.mock.calls.length).toBe(callsAfterActivation + 1);
    });
  });

  describe("cleanup", () => {
    it("calls the cleanup function before re-running", async () => {
      const counter: WritableSignal<number> = signal(0);
      const cleanupSpy = vi.fn<() => void>();
      effect((onCleanup) => {
        counter();
        onCleanup(cleanupSpy);
      });

      expect(cleanupSpy).not.toHaveBeenCalled();

      counter.set(1);
      await Promise.resolve();
      expect(cleanupSpy).toHaveBeenCalledOnce();

      counter.set(2);
      await Promise.resolve();
      expect(cleanupSpy).toHaveBeenCalledTimes(2);
    });

    it("calls the cleanup function when unsubscribed", () => {
      const cleanupSpy = vi.fn<() => void>();
      const stopEffect: Unsubscribe = effect((onCleanup) => {
        onCleanup(cleanupSpy);
      });

      stopEffect();

      expect(cleanupSpy).toHaveBeenCalledOnce();
    });

    it("only the last onCleanup registered per run is stored", () => {
      const firstCleanup = vi.fn<() => void>();
      const secondCleanup = vi.fn<() => void>();

      const stopEffect: Unsubscribe = effect((onCleanup) => {
        onCleanup(firstCleanup);
        onCleanup(secondCleanup);
      });

      stopEffect();

      expect(firstCleanup).not.toHaveBeenCalled();
      expect(secondCleanup).toHaveBeenCalledOnce();
    });

    it("does not throw if no cleanup was registered", () => {
      const stopEffect: Unsubscribe = effect(() => {});
      expect(() => stopEffect()).not.toThrow();
    });
  });

  describe("write guard", () => {
    it("throws when an effect sets a signal it depends on", () => {
      const counter: WritableSignal<number> = signal(0);
      expect(() => {
        effect(() => {
          const value = counter();
          counter.set(value + 1);
        });
      }).toThrow("Cannot write to a signal that is a dependency of the current effect.");
    });

    it("throws when an effect updates a signal it depends on", () => {
      const counter: WritableSignal<number> = signal(0);
      expect(() => {
        effect(() => {
          counter();
          counter.update((n) => n + 1);
        });
      }).toThrow("Cannot write to a signal that is a dependency of the current effect.");
    });

    it("does not throw when an effect writes to a signal that is not a dependency", () => {
      const source: WritableSignal<number> = signal(0);
      const other: WritableSignal<number> = signal(10);
      expect(() => {
        effect(() => {
          source();
          other.set(99);
        });
      }).not.toThrow();
    });
  });

  describe("unsubscribe", () => {
    it("stops re-running after unsubscribe", () => {
      const counter: WritableSignal<number> = signal(0);
      const callbackSpy = vi.fn<() => void>(() => {
        counter();
      });
      const stopEffect: Unsubscribe = effect(callbackSpy);

      stopEffect();
      counter.set(1);

      expect(callbackSpy).toHaveBeenCalledOnce();
    });

    it("calling unsubscribe twice is safe", () => {
      const stopEffect: Unsubscribe = effect(() => {});
      stopEffect();
      expect(() => stopEffect()).not.toThrow();
    });
  });
});
