# DelayStep

Introduces a timed pause in a logic flow. Supports two modes: **relative** (wait N milliseconds from now) and **absolute** (wait until a specific timestamp). Uses `node-schedule` for scheduling and `date-fns/addMilliseconds` for timestamp calculation.

**Extends:** [Step](step.md)

## Table of Contents
- [Constructor](#constructor)
- [Properties](#properties)
- [Methods](#methods)
- [Events](#events)
- [Examples](#examples)
- [Related](#related)

## Constructor

### `new DelayStep(options)`

Creates a new DelayStep instance.

#### Parameters

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `options.name` | `string` | `'step-<uuid>'` | Human-readable identifier. |
| `options.delay_type` | `string` | `delay_types.RELATIVE` | `'relative'` or `'absolute'`. See [`delay_types`](../../../enums/delay_types.md). |
| `options.relative_delay_ms` | `number` | `0` | Milliseconds to wait when `delay_type` is `'relative'`. If `<= 0`, execution continues immediately. |
| `options.absolute_timestamp` | `Date` | `new Date()` | The point in time to wait until when `delay_type` is `'absolute'`. If in the past, execution continues immediately. |

## Properties

| Property | Type | Description |
|----------|------|-------------|
| `delay_type` | `string` | `'relative'` or `'absolute'`. |
| `relative_delay_ms` | `number` | Millisecond delay for relative mode. |
| `absolute_timestamp` | `Date` | Target timestamp for absolute mode. |
| `scheduled_job` | `Object\|null` | The `node-schedule` job, set during `delay()`. |

All properties from [Step](step.md) are inherited.

## Methods

### `async execute()` → `Promise<DelayStep>`

Dispatches to `relative()` or `absolute()` based on `delay_type`.

---

### `async relative()` → `Promise<{delayed: boolean, delay_type: string, timestamp: string}>`

Handles relative delays. If `relative_delay_ms <= 0`, continues immediately without scheduling. Otherwise, schedules a job at `addMilliseconds(now, relative_delay_ms)` and waits.

**Returns:** `{ delayed: boolean, delay_type: 'relative', timestamp: ISO string }`

---

### `async absolute()` → `Promise<{delayed: boolean, delay_type: string, timestamp: string}>`

Handles absolute delays. If `absolute_timestamp` is in the past, continues immediately. Otherwise, waits until the timestamp.

**Returns:** `{ delayed: boolean, delay_type: 'absolute', timestamp: ISO string }`

---

### `async delay(delay_until)` → `Promise<void>`

Internal scheduler. Creates a `node-schedule` job at `delay_until`, stores it in `this.scheduled_job`, and resolves when the job fires.

**Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `delay_until` | `Date` | The `Date` at which execution should resume. |

## Events

Emitted on `State.get('events.step')`:

| Event | When |
|-------|------|
| `DELAY_STEP_RELATIVE_SCHEDULED` | A relative delay has been scheduled. |
| `DELAY_STEP_RELATIVE_COMPLETE` | A relative delay has completed. |
| `DELAY_STEP_ABSOLUTE_SCHEDULED` | An absolute delay has been scheduled. |
| `DELAY_STEP_ABSOLUTE_COMPLETE` | An absolute delay has completed. |

## Examples

### Relative delay between steps

```javascript
import { Workflow, Step, DelayStep, delay_types } from '@ronaldroe/micro-flow';

const wf = new Workflow({
  name: 'rate-limited-pipeline',
  steps: [
    new Step({ name: 'step-1', callable: async () => ({ done: true }) }),

    new DelayStep({
      name: 'throttle',
      delay_type: delay_types.RELATIVE,
      relative_delay_ms: 2000, // 2-second pause
    }),

    new Step({ name: 'step-2', callable: async () => ({ done: true }) }),
  ],
});

await wf.execute();
```

### Absolute delay — schedule work for a future time

```javascript
import { Workflow, Step, DelayStep, delay_types } from '@ronaldroe/micro-flow';

// Schedule for 30 seconds from now
const runAt = new Date(Date.now() + 30_000);

const wf = new Workflow({
  name: 'scheduled-task',
  steps: [
    new Step({
      name: 'prepare',
      callable: async () => {
        console.log('Preparing task...');
        return { ready: true };
      },
    }),
    new DelayStep({
      name: 'wait-until-scheduled',
      delay_type: delay_types.ABSOLUTE,
      absolute_timestamp: runAt,
    }),
    new Step({
      name: 'execute-task',
      callable: async () => {
        console.log('Running scheduled task at', new Date().toISOString());
        return { executed: true };
      },
    }),
  ],
});

await wf.execute();
```

### Listening to delay events

```javascript
import { DelayStep, delay_types, State } from '@ronaldroe/micro-flow';

const stepEvents = State.get('events.step');

stepEvents.on('delay_step_relative_scheduled', (data) => {
  console.log(`[${data.name}] Delay scheduled until ${data.result.timestamp}`);
});

stepEvents.on('delay_step_relative_complete', (data) => {
  console.log(`[${data.name}] Delay complete`);
});

const delay = new DelayStep({
  name: 'brief-pause',
  delay_type: delay_types.RELATIVE,
  relative_delay_ms: 500,
});

await delay.execute();
```

### Zero delay — pass-through

```javascript
import { DelayStep, delay_types } from '@ronaldroe/micro-flow';

// relative_delay_ms <= 0 → continues immediately without scheduling
const passthrough = new DelayStep({
  name: 'no-op-delay',
  delay_type: delay_types.RELATIVE,
  relative_delay_ms: 0,
});

const result = await passthrough.execute();
console.log(result.result.delayed); // false
```

### Retry-ready delay (wait for resource availability)

```javascript
import { Workflow, Step, DelayStep, ConditionalStep, delay_types } from '@ronaldroe/micro-flow';

const wf = new Workflow({
  name: 'wait-for-service',
  steps: [
    new Step({
      name: 'check-service',
      max_retries: 5,
      callable: async function () {
        const res = await fetch('https://service.example.com/health').catch(() => null);
        const up = res?.ok ?? false;
        this.setState('service.up', up);
        if (!up) throw new Error('Service unavailable');
        return { up: true };
      },
    }),
    new DelayStep({
      name: 'backoff',
      delay_type: delay_types.RELATIVE,
      relative_delay_ms: 5000,
    }),
    new Step({
      name: 'proceed',
      callable: async () => ({ message: 'Service is up, proceeding' }),
    }),
  ],
});

await wf.execute();
```

## Related

- [Step](step.md) — Parent class.
- [delay_types](../../../enums/delay_types.md) — `RELATIVE` and `ABSOLUTE` enum.
- [step_event_names](../../../enums/step_event_names.md) — Delay-specific event names.
- [Workflow](../workflow.md) — Sequences `DelayStep` along with other steps.
