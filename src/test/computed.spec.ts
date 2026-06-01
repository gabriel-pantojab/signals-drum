import { expect, it, describe, vi } from "vitest";
import { signal, computed } from "../lib";
import type { Signal, WritableSignal, Unsubscribe } from "../lib/types";

describe("computed", () => {
  describe("initial value", () => {
    it("returns the value from the callback", () => {
      const name: WritableSignal<string> = signal("gabriel");
      const upperName: Signal<string> = computed(() => name().toUpperCase());
      expect(upperName()).toBe("GABRIEL");
    });

    it("does not evaluate callback on creation, only on first read", () => {
      const computeSpy = vi.fn<() => number>(() => 42);
      const c = computed(computeSpy);
      expect(computeSpy).not.toHaveBeenCalled();
      c();
      expect(computeSpy).toHaveBeenCalledOnce();
    });
  });

  describe("reactivity", () => {
    it("updates when a dependency changes", () => {
      const name: WritableSignal<string> = signal("gabriel");
      const upperName: Signal<string> = computed(() => name().toUpperCase());
      name.set("pantoja");
      expect(upperName()).toBe("PANTOJA");
    });

    it("tracks multiple dependencies", () => {
      const firstName: WritableSignal<string> = signal("gabriel");
      const lastName: WritableSignal<string> = signal("pantoja");
      const fullName: Signal<string> = computed(() => `${firstName()} ${lastName()}`);
      firstName.set("jorge");
      expect(fullName()).toBe("jorge pantoja");
      lastName.set("bustamante");
      expect(fullName()).toBe("jorge bustamante");
    });

    it("recomputes only when a dependency changes, not on every read", () => {
      const counter: WritableSignal<number> = signal(0);
      const computeSpy = vi.fn<() => number>(() => counter() * 2);
      const doubled: Signal<number> = computed(computeSpy);

      doubled();
      doubled();
      doubled();

      // Once on creation, zero more on reads
      expect(computeSpy).toHaveBeenCalledOnce();

      counter.set(1);
      expect(computeSpy).toHaveBeenCalledTimes(2);
    });
  });

  describe("dynamic dependency tracking", () => {
    it("stops tracking a dependency that is no longer read", () => {
      const showDetails: WritableSignal<boolean> = signal(true);
      const name: WritableSignal<string> = signal("gabriel");
      const computeSpy = vi.fn<() => string>(() => (showDetails() ? name() : "hidden"));
      const detail: Signal<string> = computed(computeSpy);

      expect(detail()).toBe("gabriel");
      const callsAfterCreation: number = computeSpy.mock.calls.length;

      showDetails.set(false);
      expect(detail()).toBe("hidden");

      // name is no longer read — changing it must not trigger a recompute
      name.set("pantoja");
      expect(computeSpy.mock.calls.length).toBe(callsAfterCreation + 1);
      expect(detail()).toBe("hidden");
    });

    it("starts tracking a new dependency when it becomes reachable", () => {
      const showDetails: WritableSignal<boolean> = signal(false);
      const name: WritableSignal<string> = signal("gabriel");
      const detail: Signal<string> = computed(() => (showDetails() ? name() : "hidden"));

      expect(detail()).toBe("hidden");

      showDetails.set(true);
      expect(detail()).toBe("gabriel");

      // Now name is tracked — changing it must update the computed
      name.set("pantoja");
      expect(detail()).toBe("pantoja");
    });
  });

  describe("subscribe", () => {
    it("notifies subscriber when the computed value changes", () => {
      const counter: WritableSignal<number> = signal(0);
      const doubled: Signal<number> = computed(() => counter() * 2);
      const onChangeSpy = vi.fn<(value: number) => void>();
      doubled.subscribe(onChangeSpy);
      counter.set(3);
      expect(onChangeSpy).toHaveBeenCalledWith(6);
    });

    it("does not notify subscriber if recomputed value is the same", () => {
      const counter: WritableSignal<number> = signal(2);
      const isEven: Signal<boolean> = computed(() => counter() % 2 === 0);
      const onChangeSpy = vi.fn<(value: boolean) => void>();
      isEven.subscribe(onChangeSpy);

      // 2 → 4: isEven stays true — no notification expected
      counter.set(4);
      expect(onChangeSpy).not.toHaveBeenCalled();
    });

    it("stops notifications after unsubscribe", () => {
      const counter: WritableSignal<number> = signal(0);
      const doubled: Signal<number> = computed(() => counter() * 2);
      const onChangeSpy = vi.fn<(value: number) => void>();
      const stopListening: Unsubscribe = doubled.subscribe(onChangeSpy);
      stopListening();
      counter.set(5);
      expect(onChangeSpy).not.toHaveBeenCalled();
    });
  });

  describe("multiple computed from the same signal", () => {
    it("each computed updates independently", () => {
      const counter: WritableSignal<number> = signal(2);
      const doubled: Signal<number> = computed(() => counter() * 2);
      const tripled: Signal<number> = computed(() => counter() * 3);

      counter.set(5);

      expect(doubled()).toBe(10);
      expect(tripled()).toBe(15);
    });

    it("each computed notifies its own subscribers independently", () => {
      const counter: WritableSignal<number> = signal(0);
      const doubled: Signal<number> = computed(() => counter() * 2);
      const isPositive: Signal<boolean> = computed(() => counter() > 0);
      const onDoubledChange = vi.fn<(value: number) => void>();
      const onIsPositiveChange = vi.fn<(value: boolean) => void>();
      doubled.subscribe(onDoubledChange);
      isPositive.subscribe(onIsPositiveChange);

      counter.set(3);

      expect(onDoubledChange).toHaveBeenCalledWith(6);
      expect(onIsPositiveChange).toHaveBeenCalledWith(true);
    });

    it("one computed updating does not trigger the other if their values differ", () => {
      const name: WritableSignal<string> = signal("gabriel");
      const upper: Signal<string> = computed(() => name().toUpperCase());
      const length: Signal<number> = computed(() => name().length);
      const onLengthChange = vi.fn<(value: number) => void>();
      length.subscribe(onLengthChange);

      // Same length — length computed must not notify
      name.set("GABRIEL");

      expect(upper()).toBe("GABRIEL");
      expect(onLengthChange).not.toHaveBeenCalled();
    });
  });

  describe("computed depending on another computed", () => {
    it("derives correctly from a chained computed", () => {
      const counter: WritableSignal<number> = signal(1);
      const doubled: Signal<number> = computed(() => counter() * 2);
      const quadrupled: Signal<number> = computed(() => doubled() * 2);

      expect(quadrupled()).toBe(4);
    });

    it("propagates a signal change through the chain", () => {
      const counter: WritableSignal<number> = signal(1);
      const doubled: Signal<number> = computed(() => counter() * 2);
      const quadrupled: Signal<number> = computed(() => doubled() * 2);

      counter.set(3);

      expect(doubled()).toBe(6);
      expect(quadrupled()).toBe(12);
    });

    it("notifies a subscriber at the end of a chain", () => {
      const counter: WritableSignal<number> = signal(1);
      const doubled: Signal<number> = computed(() => counter() * 2);
      const quadrupled: Signal<number> = computed(() => doubled() * 2);
      const onChangeSpy = vi.fn<(value: number) => void>();
      quadrupled.subscribe(onChangeSpy);

      counter.set(3);

      expect(onChangeSpy).toHaveBeenCalledWith(12);
    });

    it("supports a three-level chain", () => {
      const base: WritableSignal<number> = signal(1);
      const level1: Signal<number> = computed(() => base() + 1);
      const level2: Signal<number> = computed(() => level1() + 1);
      const level3: Signal<number> = computed(() => level2() + 1);

      base.set(10);

      expect(level1()).toBe(11);
      expect(level2()).toBe(12);
      expect(level3()).toBe(13);
    });

    it("mixing signals and computed as dependencies", () => {
      const firstName: WritableSignal<string> = signal("gabriel");
      const lastName: WritableSignal<string> = signal("pantoja");
      const fullName: Signal<string> = computed(() => `${firstName()} ${lastName()}`);
      const greeting: Signal<string> = computed(() => `hola, ${fullName()}!`);

      expect(greeting()).toBe("hola, gabriel pantoja!");

      firstName.set("jorge");
      expect(greeting()).toBe("hola, jorge pantoja!");

      lastName.set("bustamante");
      expect(greeting()).toBe("hola, jorge bustamante!");
    });
  });

  describe("write guard", () => {
    it("throws when attempting to set a signal inside a computed", () => {
      const count: WritableSignal<number> = signal(0);
      const bad: Signal<number> = computed(() => {
        count.set(1);
        return count();
      });
      expect(() => bad()).toThrow("Writing to signals is not allowed in a computed");
    });

    it("throws when attempting to update a signal inside a computed", () => {
      const count: WritableSignal<number> = signal(0);
      const bad: Signal<number> = computed(() => {
        count.update((n) => n + 1);
        return count();
      });
      expect(() => bad()).toThrow("Writing to signals is not allowed in a computed");
    });
  });

  describe("readonly contract", () => {
    it("does not expose a set method", () => {
      const computed$ = computed(() => 1);
      expect((computed$ as unknown as Record<string, unknown>).set).toBeUndefined();
    });

    it("does not expose an update method", () => {
      const computed$ = computed(() => 1);
      expect((computed$ as unknown as Record<string, unknown>).update).toBeUndefined();
    });
  });
});
