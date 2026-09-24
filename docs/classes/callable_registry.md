# CallableRegistry

A name-keyed registry for functions used with **persistence mode**. Functions can't be serialized to JSON, so any `Step` (or `ConditionalStep`/`LoopStep`/`SwitchStep` branch, loop body, or default callable) that needs to survive `serialize()` → `hydrateSerialized()` must reference its function through a `CallableRegistry` instead of a raw closure. The same goes for other function-valued fields: a conditional `subject`/`value`, a `SwitchStep`'s `subject`, a `LoopStep`'s function `iterable`, and a workflow's `result_per_step_function`. Unlike callables, a missing registry entry for one of those doesn't throw on hydration; it logs a `console.warn` and leaves the field `null`.

Each `Workflow` gets its own `CallableRegistry` instance automatically (`workflow.callable_registry`) unless one is passed in explicitly. Passing the same instance to multiple workflows lets them share a set of named callables.

## Table of Contents
- [Constructor](#constructor)
- [Methods](#methods)
- [Examples](#examples)
- [Related](#related)

## Constructor

### `new CallableRegistry()`

Creates a new, empty registry.

## Methods

### `register(name, callable)`

Registers a function under a given name.

**Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `name` | `string` | The key to register the callable under. |
| `callable` | `Function` | The function to register. |

**Throws:** `Error` if `callable` is not a function.

---

### `registerMany(callables)`

Registers multiple callables at once from a name → function map.

**Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `callables` | `Object` | An object where each key is a name and each value is the function to register under it. |

**Throws:** `Error` if any value in `callables` is not a function.

---

### `get(name)` → `Function`

Retrieves a registered callable.

**Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `name` | `string` | The name the callable was registered under. |

**Returns:** The registered function.

**Throws:** `Error` if no callable is registered under `name`.

---

### `has(name)` → `boolean`

Checks whether a callable is registered under the given name.

**Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `name` | `string` | The name to check. |

**Returns:** `true` if a callable is registered under `name`, `false` otherwise.

---

### `deregister(name)`

Removes a callable from the registry.

**Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `name` | `string` | The name of the callable to remove. |

**Throws:** `Error` if no callable is registered under `name`.

---

### `clear()`

Removes every callable from the registry.

## Examples

### Registering functions by name

```javascript
import { CallableRegistry } from '@ronaldroe/micro-flow';

const registry = new CallableRegistry();

registry.register('chargeCard', async function chargeCard() {
  return { charged: true };
});

registry.registerMany({
  reserveInventory: async function reserveInventory() { return { reserved: true }; },
  sendReceipt: async function sendReceipt() { return { sent: true }; },
});

registry.has('chargeCard'); // true
```

**Naming convention:** always give the registered function a name that matches its registry key (`async function chargeCard() {}` registered as `'chargeCard'`, not an anonymous arrow). Serialization stores `callable.name` for most callable-like fields (`true_callable`, `false_callable`, a loop's per-iteration callable, `default_callable`) and for function-valued conditional subjects/values, `SwitchStep.subject`, and a function `LoopStep.iterable`. An explicit key can be given for a `Step`'s primary `callable` (via `callable_registry_key`) and a workflow's `result_per_step_function` (via `result_per_step_function_registry_key`). An anonymous function assigned as an object property (`false_callable: async () => {}`) gets its `.name` inferred by JS as the **property key** (`"false_callable"`), which won't match anything in the registry once serialized and rehydrated. Likewise, `conditional: { subject: () => x }` produces a function named `"subject"`.

### Sharing one registry across workflows

```javascript
import { Workflow, Step, CallableRegistry } from '@ronaldroe/micro-flow';

const sharedRegistry = new CallableRegistry();
sharedRegistry.register('logStart', async function logStart() {
  console.log('starting');
  return { logged: true };
});

const workflowA = new Workflow({
  name: 'flow-a',
  callable_registry: sharedRegistry,
  steps: [new Step({ name: 'start', callable: sharedRegistry.get('logStart'), callable_registry_key: 'logStart' })],
});

const workflowB = new Workflow({
  name: 'flow-b',
  callable_registry: sharedRegistry, // same registry — 'logStart' resolves here too
  steps: [new Step({ name: 'start', callable: sharedRegistry.get('logStart'), callable_registry_key: 'logStart' })],
});
```

### Saving and reloading a workflow definition

```javascript
import { Workflow, Step, CallableRegistry } from '@ronaldroe/micro-flow';

const registry = new CallableRegistry();
registry.register('fetchOrder', async function fetchOrder() {
  return { id: 'ORD-1', total: 42 };
});

const workflow = new Workflow({
  name: 'order-lookup',
  callable_registry: registry,
  steps: [
    new Step({ name: 'fetch', callable: registry.get('fetchOrder'), callable_registry_key: 'fetchOrder' }),
  ],
});

// Persist the definition (e.g. to a database) before ever running it.
const saved = workflow.serialize();

// ...later, in a fresh process, having re-registered the same functions:
const reloaded = Workflow.hydrateSerialized(saved, registry);
await reloaded.execute();
```

## Related

- [Workflow](workflow.md) — Holds a `CallableRegistry` instance via `callable_registry` and threads it through `hydrateSerialized()`/`hydrate()`.
- [Step](steps/step.md) — Uses `callable_registry_key` and `CallableRegistry` to survive serialization when its `callable` is a plain function.
- [ConditionalStep](steps/conditional_step.md), [LoopStep](steps/loop_step.md), [SwitchStep](steps/switch_step.md) — Their branch/loop/default callables are also resolved through a `CallableRegistry` on hydration.
- [LogicStep](steps/logic_step.md) — Function-valued conditional `subject`/`value` are resolved through a `CallableRegistry` on hydration (via `Step.hydrateFunctionRef()`).
