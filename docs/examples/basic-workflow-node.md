# Orchestrating Multi-Step Data Pipelines

Execute complex, sequential logic chains with automatic timing, result aggregation, and observability.

## Overview
This example demonstrates the core power of `micro-flow`: turning a "wall of awaits" into a structured, manageable pipeline. Every step is automatically timed and its results are captured for easy auditing.

## Implementation

```javascript
import { Workflow, Step } from 'micro-flow';

const pipeline = new Workflow({
  name: 'data-processing-pipeline',
  steps: [
    new Step({
      name: 'ingest',
      callable: async () => ({ raw: [1, 2, 3] })
    }),
    new Step({
      name: 'transform',
      callable: async function() {
        const data = this.getState('pipeline.raw');
        return data.map(n => n * 2);
      }
    }),
    new Step({
      name: 'persist',
      max_retries: 2,
      callable: async (results) => {
        await db.save(results);
      }
    })
  ]
});

const result = await pipeline.execute();
console.log(`Pipeline finished in ${result.timing.execution_time_ms}ms`);
```

## Key Benefits
- **Total Visibility**: Monitor the execution time and status of every pipeline stage.
- **Atomic Retries**: Retry individual failed stages without restarting the entire pipeline.
- **State Persistence**: Access processed data at any point in the chain via the shared State singleton.
