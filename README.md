# signals-drum

A minimal reactive primitives library written in TypeScript. Provides `signal`, `computed`, and `effect` — the three building blocks of a fine-grained reactivity system.

## Primitives

### `signal`

Holds a mutable reactive value. Reading it inside a `computed` or `effect` automatically registers it as a dependency.

```ts
import { signal } from "signals-drum";

const count = signal(0);

count();              // read → 0
count.set(1);         // write
count.update(n => n + 1); // write via callback
count.asReadonly();   // returns a Signal<T> without set/update
```

`signal` returns a `WritableSignal<T>`:

| Member | Description |
|---|---|
| `()` | Read the current value |
| `.set(value)` | Replace the value (no-op if identical) |
| `.update(fn)` | Derive a new value from the previous one (no-op if identical) |
| `.subscribe(listener)` | Subscribe to changes, returns an `Unsubscribe` |
| `.asReadonly()` | Return a read-only view of the signal |

---

### `computed`

Derives a value from one or more signals. Re-evaluates automatically when its dependencies change. Dependencies are tracked dynamically — only the signals read during the last evaluation are tracked.

```ts
import { signal, computed } from "signals-drum";

const firstName = signal("gabriel");
const lastName  = signal("pantoja");

const fullName = computed(() => `${firstName()} ${lastName()}`);

fullName(); // "gabriel pantoja"

firstName.set("gabdrum");
fullName(); // "gabdrum pantoja"
```

`computed` returns a readonly `Signal<T>`:

| Member | Description |
|---|---|
| `()` | Read the current derived value |
| `.subscribe(listener)` | Subscribe to changes, returns an `Unsubscribe` |

---

### `effect`

Runs a side-effectful callback immediately and re-runs it whenever its reactive dependencies change. Supports a cleanup function that runs before each re-execution and on destroy.

```ts
import { signal, effect } from "signals-drum";

const name = signal("gabriel");

const stop = effect((onCleanup) => {
  console.log(`Hello, ${name()}`);

  onCleanup(() => {
    console.log("cleaning up");
  });
});

name.set("pantoja");
// logs: "cleaning up"
// logs: "Hello, pantoja"

stop(); // unsubscribes and runs the last cleanup
```

`effect` returns an `Unsubscribe` function. Calling it stops the effect and runs any pending cleanup.

---

## How they compose

```ts
const show    = signal(false);
const message = signal("hello");

// computed re-evaluates only when show or message change
const display = computed(() => show() ? message() : "hidden");

// effect re-runs whenever display changes
effect(() => {
  document.title = display();
});

show.set(true);    // effect runs: title = "hello"
message.set("hi"); // effect runs: title = "hi"
show.set(false);   // effect runs: title = "hidden"
                   // message is no longer tracked
message.set("bye"); // no re-run
```

---

## Dynamic dependency tracking

Both `computed` and `effect` track dependencies dynamically on each run. If a signal is no longer read (e.g. behind a conditional), it is automatically unsubscribed — no stale updates, no manual dependency lists.
