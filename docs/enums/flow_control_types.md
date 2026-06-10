# flow_control_types

Determines how a `FlowControlStep` affects the parent workflow's execution when its condition is met. `BREAK` stops the entire workflow loop; `SKIP` skips only the immediately following step.

## Table of Contents
- [Values](#values)
- [Usage](#usage)
- [Related](#related)

## Values

| Key | Value | Description |
|-----|-------|-------------|
| `BREAK` | `'break'` | Sets `should_break = true` on the parent workflow. Execution stops after the current step. |
| `SKIP` | `'skip'` | Sets `should_skip = true` on the parent workflow. The next step is skipped; execution continues from the step after. |

## Usage

```javascript
import { FlowControlStep, Workflow, Step, flow_control_types, State } from '@ronaldroe/micro-flow';

// BREAK — stop the entire workflow when the condition is met
const wf = new Workflow({
  name: 'guarded-pipeline',
  steps: [
    new Step({
      name: 'fetch',
      callable: async function () {
        const data = await fetch('https://api.example.com/items').then(r => r.json());
        this.setState('items', data);
        return data;
      },
    }),
    new FlowControlStep({
      name: 'abort-if-empty',
      conditional: {
        subject: () => State.get('items')?.length ?? 0,
        operator: '===',
        value: 0,
      },
      flow_control_type: flow_control_types.BREAK,
    }),
    new Step({
      name: 'process',
      callable: async () => ({ processed: true }),
    }),
  ],
});

await wf.execute();

// SKIP — skip the next step when the condition is met
const skipWf = new Workflow({
  name: 'optional-step-flow',
  steps: [
    new FlowControlStep({
      name: 'skip-if-cached',
      conditional: {
        subject: () => State.get('cache.hit'),
        operator: '===',
        value: true,
      },
      flow_control_type: flow_control_types.SKIP,
    }),
    new Step({
      name: 'fetch-from-api',
      callable: async () => {
        // Only runs if cache missed
        return { fromCache: false, data: {} };
      },
    }),
    new Step({
      name: 'render',
      callable: async () => ({ rendered: true }),
    }),
  ],
});
```

Using the raw string values is also valid:

```javascript
import { FlowControlStep } from '@ronaldroe/micro-flow';

const step = new FlowControlStep({
  name: 'check',
  conditional: { subject: 1, operator: '===', value: 1 },
  flow_control_type: 'break', // same as flow_control_types.BREAK
});
```

## Related

- [FlowControlStep](../classes/steps/flow_control_step.md) — The class that consumes these values.
- [Workflow](../classes/workflow.md) — Has `should_break` and `should_skip` properties set by `FlowControlStep`.
