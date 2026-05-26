import { expect, it, describe, vi } from "vitest";
import { signal } from "../lib/signal";
import type { WritableSignal, Signal, Unsubscribe } from "../lib/signal";

describe("signal", () => {
  describe("reading values", () => {
    it("returns initial value", () => {
      const name: WritableSignal<string> = signal("Gabriel");
      expect(name()).toBe("Gabriel");
    });

    it("supports number type", () => {
      const age: WritableSignal<number> = signal(42);
      expect(age()).toBe(42);
    });

    it("supports boolean type", () => {
      const active: WritableSignal<boolean> = signal(true);
      expect(active()).toBe(true);
    });

    it("supports null", () => {
      const empty: WritableSignal<null> = signal(null);
      expect(empty()).toBe(null);
    });

    it("returns the same object reference", () => {
      const sourceObject: { a: number } = { a: 1 };
      const objectSignal: WritableSignal<{ a: number }> = signal(sourceObject);
      expect(objectSignal()).toBe(sourceObject);
    });
  });

  describe("set", () => {
    it("updates the stored value", () => {
      const nickname: WritableSignal<string> = signal("gab");
      nickname.set("gabdrum");
      expect(nickname()).toBe("gabdrum");
    });

    it("notifies subscriber with the new value", () => {
      const text: WritableSignal<string> = signal("a");
      const onChangeSpy = vi.fn<(value: string) => void>();
      text.subscribe(onChangeSpy);
      text.set("b");
      expect(onChangeSpy).toHaveBeenCalledOnce();
      expect(onChangeSpy).toHaveBeenCalledWith("b");
    });

    it("does not notify when setting the same value", () => {
      const counter: WritableSignal<number> = signal(0);
      const onChangeSpy = vi.fn<(value: number) => void>();
      counter.subscribe(onChangeSpy);
      counter.set(0);
      expect(onChangeSpy).not.toHaveBeenCalled();
    });
  });

  describe("update", () => {
    it("updates value via callback", () => {
      const age: WritableSignal<number> = signal(24);
      age.update((prev: number) => prev + 1);
      expect(age()).toBe(25);
    });

    it("passes previous value to the callback", () => {
      const numberSignal: WritableSignal<number> = signal(10);
      const doublerSpy = vi.fn<(prev: number) => number>((prev: number) => prev * 2);
      numberSignal.update(doublerSpy);
      expect(doublerSpy).toHaveBeenCalledWith(10);
      expect(numberSignal()).toBe(20);
    });

    it("does not notify when callback returns the same value", () => {
      const valueSignal: WritableSignal<number> = signal(5);
      const onChangeSpy = vi.fn<(value: number) => void>();
      valueSignal.subscribe(onChangeSpy);
      valueSignal.update((current: number) => current);
      expect(onChangeSpy).not.toHaveBeenCalled();
    });

    it("notifies subscriber after update", () => {
      const message: WritableSignal<string> = signal("details");
      let lastCapturedValue: string = "";
      message.subscribe((value: string) => {
        lastCapturedValue = value;
      });
      message.update((prev: string) => prev + " extra");
      expect(lastCapturedValue).toBe("details extra");
    });
  });

  describe("subscribe", () => {
    it("does not call subscriber for the initial value", () => {
      const numberSignal: WritableSignal<number> = signal(42);
      const onChangeSpy = vi.fn<(value: number) => void>();
      numberSignal.subscribe(onChangeSpy);
      expect(onChangeSpy).not.toHaveBeenCalled();
    });

    it("notifies all active subscribers", () => {
      const counter: WritableSignal<number> = signal(0);
      const listenerA = vi.fn<(value: number) => void>();
      const listenerB = vi.fn<(value: number) => void>();
      counter.subscribe(listenerA);
      counter.subscribe(listenerB);
      counter.set(1);
      expect(listenerA).toHaveBeenCalledWith(1);
      expect(listenerB).toHaveBeenCalledWith(1);
    });

    it("stops notifications after unsubscribe", () => {
      const counter: WritableSignal<number> = signal(0);
      const onChangeSpy = vi.fn<(value: number) => void>();
      const stopListening: Unsubscribe = counter.subscribe(onChangeSpy);
      stopListening();
      counter.set(1);
      expect(onChangeSpy).not.toHaveBeenCalled();
    });

    it("only stops the unsubscribed listener, not others", () => {
      const counter: WritableSignal<number> = signal(0);
      const listenerA = vi.fn<(value: number) => void>();
      const listenerB = vi.fn<(value: number) => void>();
      const unsubscribeA: Unsubscribe = counter.subscribe(listenerA);
      counter.subscribe(listenerB);
      unsubscribeA();
      counter.set(1);
      expect(listenerA).not.toHaveBeenCalled();
      expect(listenerB).toHaveBeenCalledWith(1);
    });

    it("calling unsubscribe twice is safe", () => {
      const counter: WritableSignal<number> = signal(0);
      const onChangeSpy = vi.fn<(value: number) => void>();
      const stopListening: Unsubscribe = counter.subscribe(onChangeSpy);
      stopListening();
      expect(() => stopListening()).not.toThrow();
    });
  });

  describe("asReadonly", () => {
    it("returns the current value", () => {
      const numberSignal: WritableSignal<number> = signal(5);
      const readonlySignal: Signal<number> = numberSignal.asReadonly();
      expect(readonlySignal()).toBe(5);
    });

    it("reflects updates made to the writable signal", () => {
      const name: WritableSignal<string> = signal("hello");
      const readonlySignal: Signal<string> = name.asReadonly();
      name.set("world");
      expect(readonlySignal()).toBe("world");
    });

    it("readonly can be subscribed and receives updates", () => {
      const counter: WritableSignal<number> = signal(0);
      const readonlySignal: Signal<number> = counter.asReadonly();
      const onChangeSpy = vi.fn<(value: number) => void>();
      readonlySignal.subscribe(onChangeSpy);
      counter.set(1);
      expect(onChangeSpy).toHaveBeenCalledWith(1);
    });

    it("readonly does not expose set method", () => {
      const numberSignal: WritableSignal<number> = signal(0);
      const readonlySignal: Signal<number> = numberSignal.asReadonly();
      expect((readonlySignal as unknown as Record<string, unknown>).set).toBeUndefined();
    });

    it("readonly does not expose update method", () => {
      const numberSignal: WritableSignal<number> = signal(0);
      const readonlySignal: Signal<number> = numberSignal.asReadonly();
      expect((readonlySignal as unknown as Record<string, unknown>).update).toBeUndefined();
    });
  });
});
