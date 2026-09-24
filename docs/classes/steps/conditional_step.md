# ConditionalStep

Evaluates a conditional expression and executes one of two branch callables depending on the result. Each branch can be an async function, a `Step`, or a `Workflow`.

**Extends:** [LogicStep](logic_step.md)

## Table of Contents
- [Constructor](#constructor)
- [Properties](#properties)
- [Methods](#methods)
- [Events](#events)
- [Examples](#examples)
- [Related](#related)

## Constructor

### `new ConditionalStep(options)`

Creates a new ConditionalStep instance.

#### Parameters

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `options.name` | `string` | `'step-<uuid>'` | Human-readable identifier. |
| `options.conditional` | `Object` | — | Conditional configuration (see [LogicStep](logic_step.md)). |
| `options.conditional.subject` | `any\|Function` | — | Value or function returning value to evaluate. |
| `options.conditional.operator` | `string` | — | Comparison operator string. |
| `options.conditional.value` | `any\|Function` | — | Value or function returning value to compare against. |
| `options.true_callable` | `Function\|Step\|Workflow` | `Step.noop` | Executed when the condition is `true`. Functions are bound to `this`. A `Step`/`Workflow` inherits this step's `parent_workflow_id` and state (see below) right before it runs. |
| `options.false_callable` | `Function\|Step\|Workflow` | `Step.noop` | Executed when the condition is `false`. Functions are bound to `this`. A `Step`/`Workflow` inherits this step's `parent_workflow_id` and state (see below) right before it runs. |
| `options.true_callable_registry_key` | `string\|null` | `null` | Registry key to serialize `true_callable` under when it's a function, instead of the function's name. Resolved from the `CallableRegistry` passed to `hydrate()`, and restored onto the hydrated step. See [Persistence](step.md#persistence). |
| `options.false_callable_registry_key` | `string\|null` | `null` | Registry key to serialize `false_callable` under when it's a function, instead of the function's name. Resolved from the `CallableRegistry` passed to `hydrate()`, and restored onto the hydrated step. See [Persistence](step.md#persistence). |
| `options.max_retries` | `number` | `0` | Maximum number of additional attempts after a failure. See [Step](step.md#constructor). |
| `options.max_timeout_ms` | `number\|null` | `30000` | Milliseconds before an attempt times out and is treated as a failure. Each retry gets the full budget. `null` (or `Infinity`) disables the timeout. |

> A `true_callable`/`false_callable` that's a `Step`/`Workflow` isn't added to the parent workflow via `addStep()`, so it wouldn't otherwise share the workflow's state - `ConditionalStep` stamps it with this step's own `parent_workflow_id`, `use_state_singleton`, and `state` right before invoking it, so `this.getState()`/`this.setState()` inside it read and write the same state as every other step in the workflow.

## Properties

| Property | Type | Description |
|----------|------|-------------|
| `true_callable` | `Function` | The resolved internal callable for the true branch. |
| `false_callable` | `Function` | The resolved internal callable for the false branch. |
| `true_callable_registry_key` | `string\|null` | Registry key `true_callable` is serialized under when it's a function, instead of the function's name. |
| `false_callable_registry_key` | `string\|null` | Registry key `false_callable` is serialized under when it's a function, instead of the function's name. |

All properties from [LogicStep](logic_step.md) and [Step](step.md) are inherited.

## Methods

### `async execute()` → `Promise<{message: string, result: any}>`

Evaluates the condition and executes the appropriate branch. Internally delegates to `conditional()`.

**Returns:** Object with `{ message, result }` where `message` indicates which branch ran and `result` is the branch callable's return value.

---

### `async conditional()` → `Promise<{message: string, result: any}>`

Core conditional logic. Calls `checkCondition()`, then executes either `true_callable` or `false_callable`. If the branch that ran is a `Step`/`Workflow` that ended up failed, [`Step.throwIfFailed()`](step.md#static-throwiffailedobj) rethrows its error, so this `ConditionalStep` fails too (and retries, if `max_retries` is set).

**Returns:** `{ message: 'True branch executed' | 'False branch executed', result: <branch return value> }`

---

### `prepareForSerialization()` → `Object`

Extends [`LogicStep.prepareForSerialization()`](logic_step.md#prepareforserialization--object) with the resolved `true_callable`/`false_callable`. The base `callable` field is reported as `null` — it's just the internal bound `conditional` method, not real data, since `ConditionalStep`'s constructor doesn't accept a `callable` option.

**Returns:** The `LogicStep` fields (with `callable: null`) plus `true_callable`/`false_callable`, each serialized via [`Step.serializeCallableField()`](step.md#static-serializecallablefieldcallable--objectnull):

```
{
  ...,                          // Step/LogicStep fields — see Step § prepareForSerialization()
  conditional: { subject, operator, value },
  callable: null,
  true_callable: { type: 'function', value: string } | { type: 'step' | 'workflow', value: {...} } | null,  // null for the default Step.noop
  false_callable: { type: 'function', value: string } | { type: 'step' | 'workflow', value: {...} } | null
}
```

**Note:** Branches are serialized from the *unbound* originals, not `this.true_callable`/`this.false_callable` — binding a function renames it (e.g. `approvedBranch` → `bound approvedBranch`), which would break the by-name lookup used to resolve a function branch from a `CallableRegistry` on hydration.

---

### `static hydrate(parsed_step, callableRegistry?)` → `ConditionalStep`

Resolves `true_callable`/`false_callable` via [`Step.hydrateCallableField()`](step.md#static-hydratecallablefieldserialized-callableregistry--functionstepworkflowundefined), then delegates to `super.hydrate()`.

**Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `parsed_step` | `Object` | A parsed step object (e.g., from `JSON.parse()`). |
| `callableRegistry` | `CallableRegistry\|null` | Registry used to resolve function branch callables. |

**Returns:** A hydrated `ConditionalStep` instance.

## Events

Emitted on `State.get('events.step')`:

| Event | When |
|-------|------|
| `CONDITIONAL_TRUE_BRANCH_EXECUTED` | The condition evaluated to `true` and the true branch ran. |
| `CONDITIONAL_FALSE_BRANCH_EXECUTED` | The condition evaluated to `false` and the false branch ran. |

## Examples

### Basic if/else in a workflow

```javascript
import { Workflow, Step, ConditionalStep, State } from '@ronaldroe/micro-flow';

State.set('user.isPremium', true);

const wf = new Workflow({
  name: 'content-gating',
  steps: [
    new ConditionalStep({
      name: 'check-premium',
      conditional: {
        subject: () => State.get('user.isPremium'),
        operator: '===',
        value: true,
      },
      true_callable: async function () {
        this.setState('content.type', 'premium');
        return { access: 'full', content: 'premium-video.mp4' };
      },
      false_callable: async function () {
        this.setState('content.type', 'free');
        return { access: 'limited', content: 'preview-video.mp4' };
      },
    }),
    new Step({
      name: 'log-access',
      callable: async function () {
        const type = this.getState('content.type');
        console.log(`Serving ${type} content`);
        return { logged: true };
      },
    }),
  ],
});

const result = await wf.execute();
console.log(result.results[0].data); // { message: 'True branch executed', result: { access: 'full', ... } }
```

### Listening to branch events

```javascript
import { ConditionalStep, State } from '@ronaldroe/micro-flow';

const stepEvents = State.get('events.step');

stepEvents.on('conditional_true_branch_executed', (data) => {
  console.log(`[${data.name}] Took true branch`);
});

stepEvents.on('conditional_false_branch_executed', (data) => {
  console.log(`[${data.name}] Took false branch`);
});

const step = new ConditionalStep({
  name: 'age-gate',
  conditional: { subject: 17, operator: '>=', value: 18 },
  true_callable: async () => ({ allowed: true }),
  false_callable: async () => ({ allowed: false }),
});

await step.execute();
// logs: [age-gate] Took false branch
```

### Using a Workflow as a branch

```javascript
import { Workflow, Step, ConditionalStep, State } from '@ronaldroe/micro-flow';

const approvalFlow = new Workflow({
  name: 'approval-flow',
  steps: [
    new Step({ name: 'notify-manager', callable: async () => ({ notified: true }) }),
    new Step({ name: 'create-ticket', callable: async () => ({ ticketId: 'TKT-001' }) }),
  ],
});

const rejectionFlow = new Workflow({
  name: 'rejection-flow',
  steps: [
    new Step({ name: 'notify-user', callable: async () => ({ notified: true }) }),
    new Step({ name: 'log-rejection', callable: async () => ({ logged: true }) }),
  ],
});

const gate = new ConditionalStep({
  name: 'approval-gate',
  conditional: {
    subject: () => State.get('request.score'),
    operator: '>=',
    value: 80,
  },
  true_callable: approvalFlow,
  false_callable: rejectionFlow,
});

State.set('request.score', 92);
const result = await gate.execute();
console.log(result.result.name); // 'approval-flow'
```

### Dynamic subject and value

```javascript
import { ConditionalStep, State } from '@ronaldroe/micro-flow';

State.set('metrics.errorRate', 0.03);
State.set('thresholds.maxErrorRate', 0.05);

const alert = new ConditionalStep({
  name: 'error-rate-alert',
  conditional: {
    subject: () => State.get('metrics.errorRate'),
    operator: '>',
    value: () => State.get('thresholds.maxErrorRate'),
  },
  true_callable: async () => {
    console.warn('Error rate exceeded threshold — alerting on-call');
    return { alert: 'sent' };
  },
  false_callable: async () => {
    console.log('Error rate within acceptable range');
    return { alert: 'none' };
  },
});

await alert.execute(); // Error rate within acceptable range
```

### Serializing and reloading a branch

```javascript
import { ConditionalStep, Step, CallableRegistry } from '@ronaldroe/micro-flow';

const registry = new CallableRegistry();
registry.register('approvedBranch', async function approvedBranch() { return { approved: true }; });
registry.register('rejectedBranch', async function rejectedBranch() { return { approved: false }; });

const step = new ConditionalStep({
  name: 'approval-check',
  conditional: { subject: 100, operator: '>', value: 50 },
  true_callable: registry.get('approvedBranch'),
  false_callable: registry.get('rejectedBranch'),
});

const saved = step.serialize();
const hydrated = Step.hydrateSerialized(saved, registry); // dispatches back to ConditionalStep
console.log(hydrated instanceof ConditionalStep); // true

const result = await hydrated.execute();
console.log(result.result.result); // { approved: true }
```

## Related

- [LogicStep](logic_step.md) — Parent class providing `checkCondition()`.
- [FlowControlStep](flow_control_step.md) — Alters workflow flow instead of branching.
- [SwitchStep](switch_step.md) — Multi-branch alternative for more than two outcomes.
- [Step § Persistence](step.md#persistence) — General serialization/hydration model.
- [CallableRegistry](../callable_registry.md) — Resolves function branch callables by name.
- [conditional_step_comparators](../../../enums/conditional_step_comparators.md) — Available operators.
- [step_event_names](../../../enums/step_event_names.md) — Event names.
