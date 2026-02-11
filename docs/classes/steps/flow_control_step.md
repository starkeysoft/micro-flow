# FlowControlStep

FlowControlStep class for controlling workflow execution flow (break, continue, skip, pause).

Extends: [LogicStep](logic_step.md)

## Constructor

### `new FlowControlStep(options)`

Creates a new FlowControlStep instance.

**Parameters:**
- `options` (Object) - Configuration options
  - `conditional` (Object, required) - Conditional configuration
    - `subject` (any) - Subject to evaluate
    - `operator` (conditional_step_comparators|string) - Comparison operator
    - `value` (any) - Value to compare against
  - `name` (string, optional) - Name of the step
  - `flow_control_type` (string, optional) - Type of flow control (default: `flow_control_types.BREAK`)

**Flow Control Types:**
- `BREAK` - Stops workflow execution
- `SKIP` - Skips the next step in the workflow

**Throws:** Error if flow_control_type is invalid

**Example (Node.js - Break on Error):**
```javascript
import { FlowControlStep, Workflow, Step, flow_control_types } from 'micro-flow';

const workflow = new Workflow({
  name: 'data-processing',
  steps: [
    new Step({
      name: 'validate-data',
      callable: async () => {
        const data = await fetchData();
        State.set('validation.errors', data.errors || []);
        return data;
      }
    }),
    new FlowControlStep({
      name: 'break-on-errors',
      conditional: {
        subject: State.get('validation.errors').length,
        operator: '>',
        value: 0
      },
      flow_control_type: flow_control_types.BREAK
    }),
    new Step({
      name: 'process-data',
      callable: async () => {
        console.log('This will not run if there are errors');
        return processData();
      }
    })
  ]
});

await workflow.execute();
```

**Example (Browser - Skip Optional Step):**
```javascript
import { FlowControlStep, Workflow, flow_control_types } from './micro-flow.js';

const analyticsWorkflow = new Workflow({
  name: 'track-user',
  steps: [
    new Step({
      name: 'track-pageview',
      callable: async () => {
        await analytics.track('pageview');
      }
    }),
    new FlowControlStep({
      name: 'skip-if-opted-out',
      conditional: {
        subject: localStorage.getItem('analytics-opt-out'),
        operator: '===',
        value: 'true'
      },
      flow_control_type: flow_control_types.SKIP
    }),
    new Step({
      name: 'track-detailed-metrics',
      callable: async () => {
        // This step is skipped if user opted out
        await analytics.trackDetailed();
      }
    })
  ]
});
```

## Properties

- `flow_control_type` (string) - Type of flow control to apply

All properties inherited from [LogicStep](logic_step.md)

## Methods

### `async shouldFlowControl()`

Evaluates the condition and sets the appropriate flow control flag.

**Returns:** Promise\<boolean\> - True if the flow control should be activated

**Example (Node.js - Retry Limit):**
```javascript
import { FlowControlStep, State } from 'micro-flow';

State.set('retry.count', 0);
State.set('retry.max', 3);

const retryBreak = new FlowControlStep({
  name: 'break-on-max-retries',
  conditional: {
    subject: State.get('retry.count'),
    operator: '>=',
    value: State.get('retry.max')
  },
  flow_control_type: 'break'
});

const shouldBreak = await retryBreak.shouldFlowControl();
if (shouldBreak) {
  console.log('Maximum retries reached');
}
```

## Common Patterns

### Circuit Breaker (Node.js)

```javascript
import { FlowControlStep, Workflow, Step, State } from 'micro-flow';

State.set('circuit.failures', 0);
State.set('circuit.threshold', 5);

const apiWorkflow = new Workflow({
  name: 'api-calls-with-circuit-breaker',
  steps: [
    new FlowControlStep({
      name: 'circuit-breaker',
      conditional: {
        subject: State.get('circuit.failures'),
        operator: '>=',
        value: State.get('circuit.threshold')
      },
      flow_control_type: 'break'
    }),
    new Step({
      name: 'call-api-1',
      callable: async () => {
        try {
          return await fetch('https://api.example.com/endpoint1');
        } catch (error) {
          State.set('circuit.failures', State.get('circuit.failures') + 1);
          throw error;
        }
      }
    }),
    new Step({
      name: 'call-api-2',
      callable: async () => {
        try {
          return await fetch('https://api.example.com/endpoint2');
        } catch (error) {
          State.set('circuit.failures', State.get('circuit.failures') + 1);
          throw error;
        }
      }
    }),
    new Step({
      name: 'reset-circuit',
      callable: async () => {
        State.set('circuit.failures', 0);
      }
    })
  ]
});
```

### Feature Toggle (Browser with React)

```javascript
import { FlowControlStep, Workflow, Step } from './micro-flow.js';
import { useEffect, useState } from 'react';

function FeatureWorkflow() {
  const [features, setFeatures] = useState([]);

  useEffect(() => {
    const loadFeatures = new Workflow({
      name: 'load-features',
      steps: [
        new Step({
          name: 'load-core',
          callable: async () => {
            const core = await import('./features/core.js');
            return core;
          }
        }),
        new FlowControlStep({
          name: 'skip-beta-if-disabled',
          conditional: {
            subject: localStorage.getItem('beta-features'),
            operator: '!==',
            value: 'enabled'
          },
          flow_control_type: 'skip'
        }),
        new Step({
          name: 'load-beta',
          callable: async () => {
            const beta = await import('./features/beta.js');
            return beta;
          }
        }),
        new Step({
          name: 'load-stable',
          callable: async () => {
            const stable = await import('./features/stable.js');
            return stable;
          }
        })
      ]
    });

    loadFeatures.execute().then(result => {
      setFeatures(result.results);
    });
  }, []);

  return <div>Features loaded: {features.length}</div>;
}
```

### Conditional Pipeline (Node.js)

```javascript
import { FlowControlStep, Workflow, Step, State } from 'micro-flow';

function createDataPipeline(options) {
  return new Workflow({
    name: 'data-pipeline',
    steps: [
      new Step({
        name: 'fetch-data',
        callable: async () => {
          const data = await fetchRawData();
          State.set('pipeline.data', data);
          State.set('pipeline.size', data.length);
          return data;
        }
      }),
      new FlowControlStep({
        name: 'skip-if-empty',
        conditional: {
          subject: State.get('pipeline.size'),
          operator: '===',
          value: 0
        },
        flow_control_type: 'break'
      }),
      new FlowControlStep({
        name: 'skip-transform-if-small',
        conditional: {
          subject: State.get('pipeline.size'),
          operator: '<',
          value: 100
        },
        flow_control_type: 'skip'
      }),
      new Step({
        name: 'heavy-transform',
        callable: async () => {
          // Only runs for datasets >= 100 items
          return await expensiveTransformation(State.get('pipeline.data'));
        }
      }),
      new Step({
        name: 'save-results',
        callable: async () => {
          return await saveToDatabase(State.get('pipeline.data'));
        }
      })
    ]
  });
}
```

### Rate Limiting (Browser with Vue)

```vue
<template>
  <div>
    <button @click="makeRequest" :disabled="rateLimited">
      Make Request
    </button>
    <p v-if="rateLimited">Rate limit exceeded. Please wait.</p>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import { FlowControlStep, Workflow, Step, State } from './micro-flow.js';

const rateLimited = ref(false);

State.set('requests.count', 0);
State.set('requests.limit', 10);

const makeRequest = async () => {
  const requestWorkflow = new Workflow({
    name: 'rate-limited-request',
    steps: [
      new Step({
        name: 'increment-counter',
        callable: async () => {
          const current = State.get('requests.count');
          State.set('requests.count', current + 1);
        }
      }),
      new FlowControlStep({
        name: 'check-rate-limit',
        conditional: {
          subject: State.get('requests.count'),
          operator: '>',
          value: State.get('requests.limit')
        },
        flow_control_type: 'break'
      }),
      new Step({
        name: 'execute-request',
        callable: async () => {
          const response = await fetch('/api/data');
          return response.json();
        }
      })
    ]
  });

  const result = await requestWorkflow.execute();
  rateLimited.value = result.status === 'FAILED';
};
</script>
```

### Validation Chain (Node.js)

```javascript
import { FlowControlStep, Workflow, Step, State } from 'micro-flow';

function createValidationChain(userData) {
  State.set('validation.data', userData);
  State.set('validation.passed', true);

  return new Workflow({
    name: 'validation-chain',
    exit_on_error: false,
    steps: [
      new Step({
        name: 'check-email',
        callable: async () => {
          const valid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(userData.email);
          if (!valid) State.set('validation.passed', false);
          return valid;
        }
      }),
      new FlowControlStep({
        name: 'break-if-invalid',
        conditional: {
          subject: State.get('validation.passed'),
          operator: '===',
          value: false
        },
        flow_control_type: 'break'
      }),
      new Step({
        name: 'check-password',
        callable: async () => {
          const valid = userData.password.length >= 8;
          if (!valid) State.set('validation.passed', false);
          return valid;
        }
      }),
      new FlowControlStep({
        name: 'break-if-invalid-2',
        conditional: {
          subject: State.get('validation.passed'),
          operator: '===',
          value: false
        },
        flow_control_type: 'break'
      }),
      new Step({
        name: 'check-username',
        callable: async () => {
          const valid = userData.username.length >= 3;
          return valid;
        }
      })
    ]
  });
}

const validation = createValidationChain({
  email: 'user@example.com',
  password: 'secure123',
  username: 'john'
});

await validation.execute();
console.log('Validation passed:', State.get('validation.passed'));
```

## See Also

- [LogicStep](logic_step.md) - Parent class with condition checking
- [ConditionalStep](conditional_step.md) - Branching logic
- [Workflow](../workflow.md) - Workflow execution control
- [Flow Control Types](../../enums/flow_control_types.md) - Available flow control types
