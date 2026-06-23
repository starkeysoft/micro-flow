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
| `options.true_callable` | `Function\|Step\|Workflow` | `async () => {}` | Executed when the condition is `true`. Functions are bound to `this`. |
| `options.false_callable` | `Function\|Step\|Workflow` | `async () => {}` | Executed when the condition is `false`. Functions are bound to `this`. |

## Properties

| Property | Type | Description |
|----------|------|-------------|
| `true_callable` | `Function` | The resolved internal callable for the true branch. |
| `false_callable` | `Function` | The resolved internal callable for the false branch. |

All properties from [LogicStep](logic_step.md) and [Step](step.md) are inherited.

## Methods

### `async execute()` → `Promise<{message: string, result: any}>`

Evaluates the condition and executes the appropriate branch. Internally delegates to `conditional()`.

**Returns:** Object with `{ message, result }` where `message` indicates which branch ran and `result` is the branch callable's return value.

---

### `async conditional()` → `Promise<{message: string, result: any}>`

Core conditional logic. Calls `checkCondition()`, then executes either `true_callable` or `false_callable`.

**Returns:** `{ message: 'True branch executed' | 'False branch executed', result: <branch return value> }`

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

## Related

- [LogicStep](logic_step.md) — Parent class providing `checkCondition()`.
- [FlowControlStep](flow_control_step.md) — Alters workflow flow instead of branching.
- [SwitchStep](switch_step.md) — Multi-branch alternative for more than two outcomes.
- [conditional_step_comparators](../../../enums/conditional_step_comparators.md) — Available operators.
- [step_event_names](../../../enums/step_event_names.md) — Event names.
