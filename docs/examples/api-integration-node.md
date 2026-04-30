# Building Resilient API Integrations

Orchestrate robust external service calls using retry logic, circuit breaker patterns, and state-driven flow control.

## Overview
This example demonstrates how to safeguard your application against flaky external APIs. You will learn how to implement automatic retries with exponential backoff and use a circuit breaker to prevent cascading failures.

## Implementation

```javascript
import { Workflow, Step, FlowControlStep, State, flow_control_types } from 'micro-flow';

// Initialize circuit breaker state
State.set('circuit.open', false);

const apiWorkflow = new Workflow({
  name: 'resilient-api-flow',
  steps: [
    // 1. Safety Check: Halt if the circuit is open
    new FlowControlStep({
      name: 'circuit-breaker-guard',
      conditional: {
        subject: () => State.get('circuit.open'),
        operator: '===',
        value: true
      },
      flow_control_type: flow_control_types.BREAK
    }),

    // 2. Execution: Fetch data with built-in retries
    new Step({
      name: 'fetch-external-data',
      max_retries: 3,
      max_timeout_ms: 5000,
      callable: async () => {
        const response = await fetch('https://api.example.com/data');
        if (!response.ok) throw new Error('API Unavailable');
        return response.json();
      }
    })
  ]
});

await apiWorkflow.execute();
```

## Key Benefits
- **Automatic Resilience**: Handle network blips without manual try/catch blocks.
- **Fail-Fast Protection**: Protect your system resources using the circuit breaker pattern.
- **Centralized Logic**: Manage retry policies and error boundaries in the workflow structure.
