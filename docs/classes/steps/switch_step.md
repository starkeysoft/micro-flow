# SwitchStep

Evaluates an ordered list of `Case` (or `LogicStep`) instances against a subject and executes the first match. Falls through to a `default_callable` when no cases match. Cases are evaluated in declaration order; only the first match runs.

**Extends:** [Step](step.md)

## Table of Contents
- [Constructor](#constructor)
- [Properties](#properties)
- [Methods](#methods)
- [Events](#events)
- [Examples](#examples)
- [Related](#related)

## Constructor

### `new SwitchStep(options)`

Creates a new SwitchStep instance.

#### Parameters

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `options.name` | `string` | `'step-<uuid>'` | Human-readable identifier. |
| `options.subject` | `any\|Function` | `null` | Value (or function returning value) passed to each case as `switch_subject`. Evaluated when `switch()` runs. |
| `options.cases` | `Array<Case\|LogicStep>` | `[]` | Ordered list of cases. `LogicStep` instances **must** have `conditional.subject` set explicitly. |
| `options.default_callable` | `Function\|Step\|Workflow` | `async () => {}` | Executed if no case matches. |

## Properties

| Property | Type | Description |
|----------|------|-------------|
| `cases` | `Array<Case\|LogicStep>` | The list of cases evaluated in order. |
| `default_callable` | `Function\|Step\|Workflow` | Fallback callable when no cases match. |
| `subject` | `any\|Function` | The subject passed to each case, or a function returning it. |

All properties from [Step](step.md) are inherited.

## Methods

### `async execute()` → `Promise<SwitchStep>`

Delegates to `switch()` and returns the `SwitchStep` instance.

---

### `async switch()` → `Promise<any>`

Resolves the subject (calling it if it is a function), assigns it to each case via `case.switch_subject`, then evaluates cases in order. Executes the first matching case and returns its result. If no case matches, executes `default_callable`. Emits `SWITCH_CASE_MATCHED` on a match.

**Returns:** The return value of the matched case's callable, or the `default_callable`'s return value.

## Events

Emitted on `State.get('events.step')`:

| Event | When |
|-------|------|
| `SWITCH_CASE_MATCHED` | When a case matches and is about to be executed. |

## Examples

### HTTP status code handler

```javascript
import { Workflow, Step, SwitchStep, Case, State } from '@ronaldroe/micro-flow';

const wf = new Workflow({
  name: 'api-response-handler',
  steps: [
    new Step({
      name: 'call-api',
      callable: async function () {
        const res = await fetch('https://api.example.com/resource/1');
        this.setState('response.status', res.status);
        return { status: res.status };
      },
    }),
    new SwitchStep({
      name: 'handle-status',
      subject: () => State.get('response.status'),
      cases: [
        new Case({
          name: '200-ok',
          conditional: { operator: '===', value: 200 },
          callable: async function () {
            this.setState('response.outcome', 'success');
            return { message: 'Request successful' };
          },
        }),
        new Case({
          name: '401-unauthorized',
          conditional: { operator: '===', value: 401 },
          callable: async function () {
            this.setState('response.outcome', 'auth_error');
            return { message: 'Authentication required' };
          },
        }),
        new Case({
          name: '404-not-found',
          conditional: { operator: '===', value: 404 },
          callable: async function () {
            this.setState('response.outcome', 'not_found');
            return { message: 'Resource not found' };
          },
        }),
        new Case({
          name: '500-server-error',
          conditional: { operator: '>=', value: 500 },
          callable: async function () {
            this.setState('response.outcome', 'server_error');
            return { message: 'Server error — retry later' };
          },
        }),
      ],
      default_callable: async function () {
        this.setState('response.outcome', 'unknown');
        return { message: 'Unexpected status code' };
      },
    }),
  ],
});

await wf.execute();
```

### Environment-based configuration

```javascript
import { SwitchStep, Case } from '@ronaldroe/micro-flow';

const loadConfig = new SwitchStep({
  name: 'load-env-config',
  subject: process.env.NODE_ENV ?? 'development',
  cases: [
    new Case({
      name: 'production',
      conditional: { operator: '===', value: 'production' },
      callable: async () => ({
        apiUrl: 'https://api.acme.com',
        logLevel: 'error',
        debug: false,
      }),
    }),
    new Case({
      name: 'staging',
      conditional: { operator: '===', value: 'staging' },
      callable: async () => ({
        apiUrl: 'https://api-staging.acme.com',
        logLevel: 'warn',
        debug: true,
      }),
    }),
    new Case({
      name: 'development',
      conditional: { operator: '===', value: 'development' },
      callable: async () => ({
        apiUrl: 'http://localhost:3000',
        logLevel: 'debug',
        debug: true,
      }),
    }),
  ],
  default_callable: async () => ({
    apiUrl: 'http://localhost:3000',
    logLevel: 'debug',
    debug: true,
  }),
});

const result = await loadConfig.execute();
console.log('Config:', result.result);
```

### Range-based cases with operator `>=`

```javascript
import { SwitchStep, Case } from '@ronaldroe/micro-flow';

const score = 85;

// Cases are evaluated in order — use >= with descending thresholds for range matching
const gradeStep = new SwitchStep({
  name: 'assign-grade',
  subject: score,
  cases: [
    new Case({ name: 'A', conditional: { operator: '>=', value: 90 }, callable: async () => 'A' }),
    new Case({ name: 'B', conditional: { operator: '>=', value: 80 }, callable: async () => 'B' }),
    new Case({ name: 'C', conditional: { operator: '>=', value: 70 }, callable: async () => 'C' }),
    new Case({ name: 'D', conditional: { operator: '>=', value: 60 }, callable: async () => 'D' }),
  ],
  default_callable: async () => 'F',
});

const result = await gradeStep.execute();
console.log(result.result); // 'B'
```

### Using LogicStep instances directly

```javascript
import { SwitchStep, LogicStep } from '@ronaldroe/micro-flow';

const status = 'active';

// When using LogicStep (not Case), conditional.subject MUST be set
const step = new SwitchStep({
  name: 'status-handler',
  cases: [
    new LogicStep({
      name: 'active',
      conditional: { subject: status, operator: '===', value: 'active' },
      callable: async () => ({ ui: 'green', label: 'Active' }),
    }),
    new LogicStep({
      name: 'suspended',
      conditional: { subject: status, operator: '===', value: 'suspended' },
      callable: async () => ({ ui: 'yellow', label: 'Suspended' }),
    }),
  ],
  default_callable: async () => ({ ui: 'gray', label: 'Unknown' }),
});

const result = await step.execute();
console.log(result.result); // { ui: 'green', label: 'Active' }
```

## Related

- [Case](case.md) — The preferred way to define cases in a `SwitchStep`.
- [LogicStep](logic_step.md) — Can be used as a case; requires `conditional.subject` to be set.
- [ConditionalStep](conditional_step.md) — Simpler two-branch alternative.
- [Step](step.md) — Parent class.
- [conditional_step_comparators](../../../enums/conditional_step_comparators.md) — Available operators.
- [step_event_names](../../../enums/step_event_names.md) — `SWITCH_CASE_MATCHED`.
