# Case

A single case in a `SwitchStep`. `Case` extends `LogicStep` and is designed to work alongside `SwitchStep`, which automatically injects the shared `subject` into each case before evaluation. The case's callable runs when `checkCondition()` returns `true`.

**Extends:** [LogicStep](logic_step.md)

## Table of Contents
- [Constructor](#constructor)
- [Properties](#properties)
- [Setters](#setters)
- [Examples](#examples)
- [Related](#related)

## Constructor

### `new Case(options)`

Creates a new Case instance.

#### Parameters

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `options.name` | `string` | `'step-<uuid>'` | Human-readable identifier. |
| `options.conditional` | `Object` | — | Conditional configuration. |
| `options.conditional.subject` | `any\|Function` | `null` | Subject to evaluate. Typically provided by the parent `SwitchStep`. If set here, it is used unless `force_subject_override` is `true`. |
| `options.conditional.operator` | `string` | `null` | Comparison operator (see [`conditional_step_comparators`](../../../enums/conditional_step_comparators.md)). |
| `options.conditional.value` | `any\|Function` | `null` | Value to compare against. |
| `options.callable` | `Function\|Step\|Workflow` | `async () => {}` | Executed when the case matches. |
| `options.force_subject_override` | `boolean` | `false` | When `true`, the subject injected by `SwitchStep` will override an existing `conditional.subject`. |

## Properties

| Property | Type | Description |
|----------|------|-------------|
| `force_subject_override` | `boolean` | Whether the `SwitchStep`'s subject overrides a locally-set subject. |
| `is_matched` | `boolean` | Internal flag indicating that the case has been matched. Not typically used externally. |

All properties from [LogicStep](logic_step.md) are inherited.

## Setters

### `set switch_subject(subject)`

Called automatically by `SwitchStep` before evaluating cases. Applies the subject to `conditional_config.subject` according to the following rules:

- If `subject` is `null`/`undefined` **and** no subject exists on the case → throws `Error`.
- If `subject` is provided **and** no existing subject (or `force_subject_override` is `true`) → sets `conditional_config.subject`.
- If an existing subject is already set and `force_subject_override` is `false` → leaves `conditional_config.subject` unchanged.
- Throws `Error` if the resulting conditional is invalid (i.e., `conditionalIsValid()` returns `false`).

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

- [SwitchStep](switch_step.md) — The parent container that manages and evaluates cases.
- [LogicStep](logic_step.md) — Parent class providing `checkCondition()` and `conditional_config`.
- [conditional_step_comparators](../../../enums/conditional_step_comparators.md) — Full operator reference.
