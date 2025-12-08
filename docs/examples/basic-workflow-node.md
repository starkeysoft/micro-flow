# Basic Workflow - Node.js

A simple workflow example demonstrating basic usage in Node.js.

## Overview

This example creates a basic workflow with multiple steps that execute sequentially.

## Code

```javascript
import { Workflow, Step } from 'micro-flow';

// Create steps
const step1 = new Step({
  name: 'initialize',
  callable: async () => {
    console.log('Step 1: Initializing...');
    return { initialized: true };
  }
});

const step2 = new Step({
  name: 'process',
  callable: async () => {
    console.log('Step 2: Processing...');
    await new Promise(resolve => setTimeout(resolve, 1000));
    return { processed: true };
  }
});

const step3 = new Step({
  name: 'finalize',
  callable: async () => {
    console.log('Step 3: Finalizing...');
    return { finalized: true };
  }
});

// Create workflow
const workflow = new Workflow({
  name: 'basic-workflow',
  steps: [step1, step2, step3]
});

// Execute workflow
const result = await workflow.execute();

console.log('Workflow completed!');
console.log('Results:', result.results);
console.log('Execution time:', result.timing.execution_time_ms, 'ms');
```

## Output

```
Step 1: Initializing...
Step 2: Processing...
Step 3: Finalizing...
Workflow completed!
Results: [
  { message: 'Success', data: { initialized: true } },
  { message: 'Success', data: { processed: true } },
  { message: 'Success', data: { finalized: true } }
]
Execution time: 1005 ms
```

## Key Points

- Steps execute in order
- Each step can return data
- Timing information is automatically tracked
- Results are collected in an array

## Related Examples

- [Data Processing Pipeline](data-pipeline-node.md)
- [API Integration](api-integration-node.md)
