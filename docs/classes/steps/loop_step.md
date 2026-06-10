# LoopStep

Iterates over a collection or repeats logic according to one of four loop types: `for`, `for_each`, `while`, and `generator`. Each iteration executes the configured `callable` and the results are collected into an array.

**Extends:** [LogicStep](logic_step.md)

## Table of Contents
- [Constructor](#constructor)
- [Properties](#properties)
- [Loop Types](#loop-types)
- [Methods](#methods)
- [Events](#events)
- [Examples](#examples)
- [Related](#related)

## Constructor

### `new LoopStep(options)`

Creates a new LoopStep instance.

#### Parameters

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `options.name` | `string` | `'step-<uuid>'` | Human-readable identifier. |
| `options.loop_type` | `string` | `loop_types.FOR_EACH` | One of `'for'`, `'for_each'`, `'while'`, `'generator'`. See [`loop_types`](../../../enums/loop_types.md). |
| `options.iterable` | `Array\|Iterable\|Function` | — | Collection to iterate. Required for `for_each` and `generator` loops. Can be a function that returns the iterable (evaluated at execution time). |
| `options.callable` | `Function\|Step\|Workflow` | `async () => {}` | Body executed each iteration. Access `this.current_item` for the current element. |
| `options.conditional` | `Object` | — | `{ subject, operator, value }` — used by `while` loops to decide whether to continue. |
| `options.iterations` | `number` | `0` | Number of iterations for `for` loops. Clamped to `max_iterations`. |
| `options.max_iterations` | `number` | `1000` | Safety cap on the number of iterations to prevent infinite loops. |

## Properties

| Property | Type | Description |
|----------|------|-------------|
| `iterable` | `any` | The iterable (or function returning one) used by `for_each` and `generator` loops. |
| `loop_type` | `string` | The configured loop type. |
| `iterations` | `number` | Iteration count for `for` loops, or number of iterations completed. |
| `max_iterations` | `number` | Maximum allowed iterations. |
| `results` | `Array` | Accumulated results from each iteration's callable. |
| `current_item` | `any` | The item currently being processed in `for_each` (set before each iteration). |

All properties from [LogicStep](logic_step.md) are inherited.

## Loop Types

### `for` — Fixed iteration count

Runs `callable` exactly `iterations` times (capped at `max_iterations`). Useful when you need to repeat an action a known number of times.

### `for_each` — Iterate over a collection

Iterates over `iterable`. Before each invocation of `callable`, `this.current_item` is set to the current element. Throws if no iterable is provided.

### `while` — Condition-based loop

Loops as long as `checkCondition()` returns `true` and `iterations < max_iterations`. Requires a valid `conditional` configuration.

### `generator` — Generator/async generator

`callable` must be a generator or async generator function. Each `yield` value is collected. Respects `max_iterations`.

## Methods

### `async for_loop()` → `Promise<{message: string, result: any[]}>`

Executes the `for` loop logic.

**Returns:** `{ message: 'For loop complete', result: results[] }`

---

### `async for_each_loop()` → `Promise<{message: string, result: any[]}>`

Executes the `for_each` loop logic.

**Returns:** `{ message: 'For each loop complete', result: results[] }`

**Throws:** `Error` if `iterable` is not set or is not iterable.

---

### `async while_loop()` → `Promise<{message: string, result: any[]}>`

Executes the `while` loop logic.

**Returns:** `{ message: 'While loop complete', result: results[] }`

**Throws:** `Error` if the conditional configuration is invalid.

---

### `async generator_loop()` → `Promise<{message: string, result: any[]}>`

Executes the generator loop. The callable is called as a generator, and each yielded value is collected.

**Returns:** `{ message: 'Generator loop complete', result: yielded[] }`

## Events

Emitted on `State.get('events.step')`:

| Event | When |
|-------|------|
| `LOOP_ITERATION_COMPLETE` | After each individual iteration completes. |

## Examples

### For loop — repeat N times

```javascript
import { Workflow, LoopStep, loop_types, State } from '@ronaldroe/micro-flow';

State.set('counters.pings', 0);

const wf = new Workflow({
  name: 'ping-service',
  steps: [
    new LoopStep({
      name: 'ping-3-times',
      loop_type: loop_types.FOR,
      iterations: 3,
      callable: async function () {
        const count = this.getState('counters.pings') + 1;
        this.setState('counters.pings', count);
        console.log(`Ping #${count}`);
        return { ping: count };
      },
    }),
  ],
});

const result = await wf.execute();
console.log(State.get('counters.pings')); // 3
```

### For each — process a collection

```javascript
import { Workflow, LoopStep, loop_types, State } from '@ronaldroe/micro-flow';

const users = [
  { id: 1, email: 'alice@example.com' },
  { id: 2, email: 'bob@example.com' },
  { id: 3, email: 'carol@example.com' },
];

const wf = new Workflow({
  name: 'email-blast',
  steps: [
    new LoopStep({
      name: 'send-emails',
      loop_type: loop_types.FOR_EACH,
      iterable: users,
      callable: async function () {
        const user = this.current_item;
        console.log(`Sending email to ${user.email}`);
        return { sent: true, userId: user.id };
      },
    }),
  ],
});

const result = await wf.execute();
// results[0].data.result → [{ sent: true, userId: 1 }, ...]
```

### For each — dynamic iterable from State

```javascript
import { Workflow, Step, LoopStep, loop_types, State } from '@ronaldroe/micro-flow';

const wf = new Workflow({
  name: 'process-queue',
  steps: [
    new Step({
      name: 'load-queue',
      callable: async function () {
        const tasks = [{ id: 'a' }, { id: 'b' }, { id: 'c' }];
        this.setState('queue.tasks', tasks);
        return tasks;
      },
    }),
    new LoopStep({
      name: 'execute-tasks',
      loop_type: loop_types.FOR_EACH,
      iterable: () => State.get('queue.tasks'),
      callable: async function () {
        const task = this.current_item;
        return { taskId: task.id, done: true };
      },
    }),
  ],
});

await wf.execute();
```

### While loop — poll until ready

```javascript
import { Workflow, LoopStep, loop_types, State } from '@ronaldroe/micro-flow';

State.set('job.status', 'pending');
let pollCount = 0;

// Simulates a job completing after 3 polls
setInterval(() => {
  pollCount++;
  if (pollCount >= 3) State.set('job.status', 'complete');
}, 100);

const wf = new Workflow({
  name: 'job-poller',
  steps: [
    new LoopStep({
      name: 'poll-job',
      loop_type: loop_types.WHILE,
      max_iterations: 20,
      conditional: {
        subject: () => State.get('job.status'),
        operator: '!==',
        value: 'complete',
      },
      callable: async () => {
        await new Promise(r => setTimeout(r, 100));
        return { status: State.get('job.status') };
      },
    }),
  ],
});

await wf.execute();
console.log('Job status:', State.get('job.status')); // 'complete'
```

### Generator loop — produce values lazily

```javascript
import { Workflow, LoopStep, loop_types } from '@ronaldroe/micro-flow';

async function* fibonacci() {
  let [a, b] = [0, 1];
  while (true) {
    yield a;
    [a, b] = [b, a + b];
  }
}

const wf = new Workflow({
  name: 'fibonacci-sequence',
  steps: [
    new LoopStep({
      name: 'generate-fibs',
      loop_type: loop_types.GENERATOR,
      max_iterations: 10,
      callable: fibonacci,
    }),
  ],
});

const result = await wf.execute();
console.log(result.results[0].data.result);
// [0, 1, 1, 2, 3, 5, 8, 13, 21, 34]
```

### Listening to iteration events

```javascript
import { LoopStep, loop_types, State } from '@ronaldroe/micro-flow';

const stepEvents = State.get('events.step');
stepEvents.on('loop_iteration_complete', (data) => {
  console.log(`Iteration complete in "${data.name}"`);
});

const loop = new LoopStep({
  name: 'counted-loop',
  loop_type: loop_types.FOR,
  iterations: 3,
  callable: async () => ({ done: true }),
});

await loop.execute();
// logs 3 'Iteration complete' messages
```

## Related

- [LogicStep](logic_step.md) — Parent class providing `checkCondition()` for `while` loops.
- [loop_types](../../../enums/loop_types.md) — `FOR`, `FOR_EACH`, `WHILE`, `GENERATOR` enum.
- [conditional_step_comparators](../../../enums/conditional_step_comparators.md) — Operators for `while` conditions.
- [step_event_names](../../../enums/step_event_names.md) — `LOOP_ITERATION_COMPLETE` and others.
