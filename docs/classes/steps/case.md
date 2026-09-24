# Case

A single case in a `SwitchStep`. `Case` extends `LogicStep` and is designed to work alongside `SwitchStep`, which automatically injects the shared `subject` into each case before evaluation. The case's callable runs when `checkCondition()` returns `true`.

**Extends:** [LogicStep](logic_step.md)

## Table of Contents
- [Constructor](#constructor)
- [Properties](#properties)
- [Setters](#setters)
- [Methods](#methods)
- [Examples](#examples)
- [Related](#related)

## Constructor

### `new Case(options)`

Creates a new Case instance.

#### Parameters

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `options.name` | `string` | `'step-<uuid>'` | Human-readable identifier. |
| `options.conditional` | `Object` | — | Conditional configuration. Copied into `conditional_config`; the case doesn't keep a reference to the object you pass. |
| `options.conditional.subject` | `any\|Function` | `null` | Subject to evaluate. Typically provided by the parent `SwitchStep`. If set here, it is used unless `force_subject_override` is `true`. |
| `options.conditional.operator` | `string` | `null` | Comparison operator (see [`conditional_step_comparators`](../../../enums/conditional_step_comparators.md)). |
| `options.conditional.value` | `any\|Function` | `null` | Value to compare against. |
| `options.callable` | `Function\|Step\|Workflow` | `Step.noop` | Executed when the case matches. |
| `options.callable_registry_key` | `string\|null` | `null` | Registry key to serialize `callable` under when it's a function, instead of the function's name. Resolved from the `CallableRegistry` passed to `hydrate()`, and restored onto the hydrated step. See [Persistence](step.md#persistence). |
| `options.force_subject_override` | `boolean` | `false` | When `true`, the subject injected by `SwitchStep` will override an existing `conditional.subject`. |
| `options.max_retries` | `number` | `0` | Maximum number of additional attempts after a failure. See [Step](step.md#constructor). |
| `options.max_timeout_ms` | `number\|null` | `30000` | Milliseconds before an attempt times out and is treated as a failure. Each retry gets the full budget. `null` (or `Infinity`) disables the timeout. |

## Properties

| Property | Type | Description |
|----------|------|-------------|
| `force_subject_override` | `boolean` | Whether the `SwitchStep`'s subject overrides a locally-set subject. |
| `is_matched` | `boolean` | Internal flag indicating that the case has been matched. Not typically used externally. |
| `switch_subject` | `any` | Read-only getter for the subject last provided by the parent `SwitchStep` (stored internally as `_switch_subject`), or `null` if none has been provided. Held only in memory and never serialized. |

All properties from [LogicStep](logic_step.md) are inherited.

## Getters and Setters

### `get switch_subject` / `set switch_subject(subject)`

The setter is called automatically by `SwitchStep` before evaluating cases. It stores the subject transiently in `_switch_subject`. It does **not** write to `conditional_config`, so the switch subject is never serialized and can't go stale after hydration. The getter returns the stored value.

- If `subject` is `null`/`undefined` **and** no subject exists on the case → throws `Error`.
- Otherwise stores `subject` (or `null` if it wasn't provided).
- Throws `Error` if the resulting conditional is invalid (i.e., `conditionalIsValid()` returns `false`).

Which subject is actually evaluated is decided by [`getConditionalSubject()`](#getconditionalsubject--anyfunction).

**Example:**
```javascript
import { Case } from '@ronaldroe/micro-flow';

const myCase = new Case({
  name: 'status-200',
  conditional: { operator: '===', value: 200 },
  callable: async () => ({ ok: true }),
});

// SwitchStep calls this automatically; you can also call it manually:
myCase.switch_subject = 200;
console.log(myCase.checkCondition()); // true
```

## Methods

### `getConditionalSubject()` → `any|Function`

Overrides [`LogicStep.getConditionalSubject()`](logic_step.md#getconditionalsubject--anyfunction) to return the effective subject used by `checkCondition()`:

- If a switch subject has been provided **and** the case has no subject of its own (or `force_subject_override` is `true`) → returns the switch subject.
- Otherwise → returns `conditional_config.subject`.

---

### `prepareForSerialization()` → `Object`

Extends [`LogicStep.prepareForSerialization()`](logic_step.md#prepareforserialization--object) with `force_subject_override` and `is_matched`.

**Returns:** The `LogicStep` fields plus `force_subject_override` and `is_matched`:

```
{
  ...,                          // Step/LogicStep fields — see Step § prepareForSerialization()
  conditional: { subject, operator, value },   // the case's own subject only, never the switch subject
  conditional_callables: { subject, value },   // see LogicStep § prepareForSerialization()
  force_subject_override: boolean,
  is_matched: boolean
}
```

---

### `static hydrate(parsed_step, callableRegistry?)` → `Case`

Delegates to `super.hydrate()` (which resolves any function-valued `subject`/`value`; see [`LogicStep.hydrate()`](logic_step.md#static-hydrateparsed_step-callableregistry--logicstep)), then restores `is_matched`.

**Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `parsed_step` | `Object` | A parsed step object (e.g., from `JSON.parse()`). |
| `callableRegistry` | `CallableRegistry\|null` | Registry used to resolve a function `callable`, if any. |

**Returns:** A hydrated `Case` instance.

## Examples

### Used within a SwitchStep

```javascript
import { SwitchStep, Case } from '@ronaldroe/micro-flow';

const paymentStep = new SwitchStep({
  name: 'process-payment',
  subject: 'stripe',
  cases: [
    new Case({
      name: 'stripe',
      conditional: { operator: '===', value: 'stripe' },
      callable: async () => {
        console.log('Charging via Stripe');
        return { provider: 'stripe', charged: true };
      },
    }),
    new Case({
      name: 'paypal',
      conditional: { operator: '===', value: 'paypal' },
      callable: async () => {
        console.log('Charging via PayPal');
        return { provider: 'paypal', charged: true };
      },
    }),
  ],
  default_callable: async () => {
    throw new Error('Unsupported payment provider');
  },
});

const result = await paymentStep.execute();
console.log(result.result); // { provider: 'stripe', charged: true }
```

### Case with pre-set subject (standalone usage)

```javascript
import { Case } from '@ronaldroe/micro-flow';

// Subject is set directly — useful for testing a case in isolation
const adminCase = new Case({
  name: 'admin-access',
  conditional: {
    subject: 'admin',
    operator: '===',
    value: 'admin',
  },
  callable: async () => ({ permissions: ['read', 'write', 'delete'] }),
});

console.log(adminCase.checkCondition()); // true
await adminCase.execute();
```

### force_subject_override

```javascript
import { SwitchStep, Case } from '@ronaldroe/micro-flow';

// Case has its own subject, but force_subject_override lets the SwitchStep override it
const step = new SwitchStep({
  name: 'override-demo',
  subject: 42,
  cases: [
    new Case({
      name: 'forty-two',
      conditional: {
        subject: 0,             // initially 0
        operator: '===',
        value: 42,
      },
      force_subject_override: true, // SwitchStep will replace subject with 42
      callable: async () => ({ matched: true }),
    }),
  ],
  default_callable: async () => ({ matched: false }),
});

const result = await step.execute();
console.log(result.result); // { matched: true }
```

### Range-based case matching

```javascript
import { SwitchStep, Case } from '@ronaldroe/micro-flow';

function categorizeAge(age) {
  return new SwitchStep({
    name: 'categorize-age',
    subject: age,
    cases: [
      new Case({ name: 'child',  conditional: { operator: '<',  value: 13  }, callable: async () => 'child' }),
      new Case({ name: 'teen',   conditional: { operator: '<',  value: 18  }, callable: async () => 'teen' }),
      new Case({ name: 'adult',  conditional: { operator: '<',  value: 65  }, callable: async () => 'adult' }),
      new Case({ name: 'senior', conditional: { operator: '>=', value: 65  }, callable: async () => 'senior' }),
    ],
    default_callable: async () => 'unknown',
  });
}

const result = await categorizeAge(25).execute();
console.log(result.result); // 'adult'
```

## Related

- [SwitchStep](switch_step.md) — The parent container that manages and evaluates cases. `SwitchStep` hydrates its `cases` array by dispatching each entry through [`Step.hydrateAny()`](step.md#static-hydrateanyparsed_step-callableregistry--step), which is how a serialized case comes back as a `Case` (not a plain `Step`). It also stamps each case with its own `parent_workflow_id`/`use_state_singleton`/`state` right before evaluating it, so `this.getState()`/`this.setState()` inside a case's callable share the parent workflow's state.
- [LogicStep](logic_step.md) — Parent class providing `checkCondition()` and `conditional_config`.
- [Step § Persistence](step.md#persistence) — General serialization/hydration model.
- [conditional_step_comparators](../../../enums/conditional_step_comparators.md) — Full operator reference.
