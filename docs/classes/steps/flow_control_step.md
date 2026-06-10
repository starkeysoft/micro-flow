# FlowControlStep

Conditionally stops or skips execution in the parent workflow. When the condition is met, `FlowControlStep` sets either `should_break` (halt after current step) or `should_skip` (skip the next step) on the workflow instance.

**Extends:** [LogicStep](logic_step.md)

## Table of Contents
- [Constructor](#constructor)
- [Properties](#properties)
- [Methods](#methods)
- [Examples](#examples)
- [Related](#related)

## Constructor

### `new FlowControlStep(options)`

Creates a new FlowControlStep instance.

#### Parameters

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `options.name` | `string` | `'step-<uuid>'` | Human-readable identifier. |
| `options.conditional` | `Object` | — | Conditional configuration (see [LogicStep](logic_step.md)). |
| `options.conditional.subject` | `any\|Function` | `null` | Value or function to evaluate. |
| `options.conditional.operator` | `string` | `null` | Comparison operator string. |
| `options.conditional.value` | `any\|Function` | `null` | Value or function to compare against. |
| `options.flow_control_type` | `string` | `flow_control_types.BREAK` | Either `'break'` or `'skip'`. See [`flow_control_types`](../../../enums/flow_control_types.md). |

**Throws:** `Error` if `flow_control_type` is not a valid value from `flow_control_types`.

## Properties

| Property | Type | Description |
|----------|------|-------------|
| `flow_control_type` | `string` | The type of flow control: `'break'` or `'skip'`. |

All properties from [LogicStep](logic_step.md) are inherited.

## Methods

### `async shouldFlowControl()` → `Promise<boolean>`

Evaluates the condition. If it returns `true`, calls `setParentWorkflowValue(parentWorkflowId, 'should_break'|'should_skip', true)` on the parent workflow. If the condition is false, sets the flag back to `false`.

**Returns:** `true` if flow control was activated, `false` otherwise.

**Example:**
```javascript
import { FlowControlStep, flow_control_types, State } from '@ronaldroe/micro-flow';

State.set('retries', 5);

const breakStep = new FlowControlStep({
  name: 'max-retries-guard',
  conditional: {
    subject: () => State.get('retries'),
    operator: '>=',
    value: 5,
  },
  flow_control_type: flow_control_types.BREAK,
});

// In a workflow context, parentWorkflowId is set automatically.
// shouldFlowControl() is called internally by execute().
```

## Examples

### Break on validation failure

```javascript
import { Workflow, Step, FlowControlStep, State, flow_control_types } from '@ronaldroe/micro-flow';

const wf = new Workflow({
  name: 'validation-pipeline',
  steps: [
    new Step({
      name: 'validate-input',
      callable: async function () {
        const input = this.getState('pipeline.input');
        const isValid = input != null && input.length > 0;
        this.setState('pipeline.valid', isValid);
        return { valid: isValid };
      },
    }),
    new FlowControlStep({
      name: 'halt-if-invalid',
      conditional: {
        subject: () => State.get('pipeline.valid'),
        operator: '===',
        value: false,
      },
      flow_control_type: flow_control_types.BREAK,
    }),
    new Step({
      name: 'process-data',
      callable: async function () {
        // Only reached if input was valid
        const data = this.getState('pipeline.input');
        return { processed: data.toUpperCase() };
      },
    }),
    new Step({
      name: 'save-result',
      callable: async () => ({ saved: true }),
    }),
  ],
});

State.set('pipeline.input', '');
await wf.execute();
console.log(wf.results.length); // 2 — only validate-input and halt-if-invalid ran
```

### Skip optional step based on feature flag

```javascript
import { Workflow, Step, FlowControlStep, State, flow_control_types } from '@ronaldroe/micro-flow';

State.set('features.analytics', false);

const wf = new Workflow({
  name: 'page-load',
  steps: [
    new Step({
      name: 'render-page',
      callable: async () => ({ html: '<html>...</html>' }),
    }),
    new FlowControlStep({
      name: 'skip-analytics-if-disabled',
      conditional: {
        subject: () => State.get('features.analytics'),
        operator: '===',
        value: false,
      },
      flow_control_type: flow_control_types.SKIP,
    }),
    new Step({
      name: 'track-pageview',
      callable: async () => {
        // Skipped when analytics is disabled
        return { tracked: true };
      },
    }),
    new Step({
      name: 'log-request',
      callable: async () => ({ logged: true }),
    }),
  ],
});

await wf.execute();
// track-pageview is skipped; render-page, skip-analytics-if-disabled, and log-request run
```

### Conditional break based on HTTP response

```javascript
import { Workflow, Step, FlowControlStep, State, flow_control_types } from '@ronaldroe/micro-flow';

const wf = new Workflow({
  name: 'api-pipeline',
  exit_on_error: false,
  steps: [
    new Step({
      name: 'call-api',
      callable: async function () {
        try {
          const res = await fetch('https://api.example.com/health');
          this.setState('api.status', res.status);
          return { status: res.status };
        } catch (e) {
          this.setState('api.status', 0);
          return { status: 0 };
        }
      },
    }),
    new FlowControlStep({
      name: 'abort-if-unavailable',
      conditional: {
        subject: () => State.get('api.status'),
        operator: 'not_equals',
        value: 200,
      },
      flow_control_type: flow_control_types.BREAK,
    }),
    new Step({
      name: 'process-response',
      callable: async () => ({ processed: true }),
    }),
  ],
});

await wf.execute();
```

## Related

- [LogicStep](logic_step.md) — Parent class.
- [Workflow](../workflow.md) — The `should_break` and `should_skip` flags are on the workflow.
- [flow_control_types](../../../enums/flow_control_types.md) — `BREAK` and `SKIP` enum values.
- [conditional_step_comparators](../../../enums/conditional_step_comparators.md) — Available operators.
