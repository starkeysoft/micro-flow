# DelayStep

DelayStep class for introducing delays in workflow execution. Supports both absolute and relative delays.

Extends: [Step](step.md)

## Constructor

### `new DelayStep(options)`

Creates a new DelayStep instance.

**Parameters:**
- `options` (Object) - Configuration options
  - `name` (string, optional) - Name of the step
  - `absolute_timestamp` (Date|string, optional) - Absolute timestamp to delay until (default: `new Date()`)
  - `relative_delay_ms` (number, optional) - Relative delay in milliseconds (default: `0`)
  - `delay_type` (string, optional) - Type of delay: `'absolute'` or `'relative'` (default: `delay_types.RELATIVE`)

**Example (Node.js - Relative Delay):**
```javascript
import { DelayStep, delay_types } from 'micro-flow';

const waitStep = new DelayStep({
  name: 'wait-5-seconds',
  delay_type: delay_types.RELATIVE,
  relative_delay_ms: 5000
});

console.log('Starting delay...');
await waitStep.execute();
console.log('Delay complete!');
```

**Example (Node.js - Absolute Delay):**
```javascript
import { DelayStep, delay_types } from 'micro-flow';

const scheduledDelay = new DelayStep({
  name: 'wait-until-midnight',
  delay_type: delay_types.ABSOLUTE,
  absolute_timestamp: new Date('2026-01-30T00:00:00')
});

console.log('Waiting until midnight...');
await scheduledDelay.execute();
console.log('Midnight reached!');
```

**Example (Browser - Animation Timing):**
```javascript
import { DelayStep, Workflow, Step } from './micro-flow.js';

const animationWorkflow = new Workflow({
  name: 'sequential-animation',
  steps: [
    new Step({
      name: 'fade-in',
      callable: async () => {
        document.getElementById('box').style.opacity = '1';
      }
    }),
    new DelayStep({
      name: 'wait-2-seconds',
      relative_delay_ms: 2000
    }),
    new Step({
      name: 'fade-out',
      callable: async () => {
        document.getElementById('box').style.opacity = '0';
      }
    })
  ]
});

await animationWorkflow.execute();
```

## Properties

- `delay_type` (string) - Type of delay ('absolute' or 'relative')
- `absolute_timestamp` (Date) - Absolute timestamp to delay until
- `relative_delay_ms` (number) - Relative delay in milliseconds
- `scheduled_job` (Job) - Reference to the scheduled job (from node-schedule)

All properties inherited from [Step](step.md)

## Methods

### `async absolute()`

Executes an absolute delay until the specified timestamp. If the timestamp is in the past, it continues immediately.

**Returns:** Promise\<DelayStep\> - The DelayStep instance

**Example (Node.js - Scheduled Task):**
```javascript
import { DelayStep } from 'micro-flow';

const futureTime = new Date(Date.now() + 10000); // 10 seconds from now

const scheduleStep = new DelayStep({
  name: 'scheduled-task',
  delay_type: 'absolute',
  absolute_timestamp: futureTime
});

console.log('Task scheduled for:', futureTime.toISOString());
await scheduleStep.execute();
console.log('Task executed!');
```

### `async delay(delay_until)`

Schedules a delay until the specified date and time using node-schedule.

**Parameters:**
- `delay_until` (Date) - The date and time to delay until

**Returns:** Promise\<DelayStep\> - Resolves with the DelayStep instance when delay completes

**Example (Node.js - Custom Delay):**
```javascript
import { DelayStep } from 'micro-flow';

const customDelay = new DelayStep({
  name: 'custom-delay',
  delay_type: 'relative',
  relative_delay_ms: 3000
});

// Internal method called by execute()
// Not typically called directly by users
```

### `async relative()`

Executes a relative delay for the specified duration. If the delay duration is zero or negative, it continues immediately.

**Returns:** Promise\<DelayStep\> - The DelayStep instance

**Example (Node.js - Retry with Backoff):**
```javascript
import { DelayStep, Step, Workflow } from 'micro-flow';

async function retryWithBackoff(operation, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await operation();
    } catch (error) {
      if (i === maxRetries - 1) throw error;
      
      const backoffDelay = new DelayStep({
        name: `retry-delay-${i + 1}`,
        delay_type: 'relative',
        relative_delay_ms: Math.pow(2, i) * 1000 // Exponential backoff
      });
      
      console.log(`Retrying in ${Math.pow(2, i)} seconds...`);
      await backoffDelay.execute();
    }
  }
}

await retryWithBackoff(async () => {
  const response = await fetch('/api/data');
  if (!response.ok) throw new Error('Request failed');
  return response.json();
});
```

## Common Patterns

### Rate Limiting (Node.js)

```javascript
import { DelayStep, Step, Workflow } from 'micro-flow';

const rateLimitedWorkflow = new Workflow({
  name: 'rate-limited-api-calls',
  steps: [
    new Step({
      name: 'api-call-1',
      callable: async () => await fetch('/api/endpoint1')
    }),
    new DelayStep({
      name: 'rate-limit-delay',
      relative_delay_ms: 1000 // 1 second between calls
    }),
    new Step({
      name: 'api-call-2',
      callable: async () => await fetch('/api/endpoint2')
    }),
    new DelayStep({
      name: 'rate-limit-delay-2',
      relative_delay_ms: 1000
    }),
    new Step({
      name: 'api-call-3',
      callable: async () => await fetch('/api/endpoint3')
    })
  ]
});

await rateLimitedWorkflow.execute();
```

### Scheduled Batch Processing (Node.js)

```javascript
import { DelayStep, Step, Workflow } from 'micro-flow';
import { db } from './database.js';

// Schedule for next day at 2 AM
const tomorrow2AM = new Date();
tomorrow2AM.setDate(tomorrow2AM.getDate() + 1);
tomorrow2AM.setHours(2, 0, 0, 0);

const batchProcessor = new Workflow({
  name: 'nightly-batch-job',
  steps: [
    new DelayStep({
      name: 'wait-until-2am',
      delay_type: 'absolute',
      absolute_timestamp: tomorrow2AM
    }),
    new Step({
      name: 'process-records',
      callable: async () => {
        const records = await db.query('SELECT * FROM pending_tasks');
        for (const record of records.rows) {
          await processRecord(record);
        }
        console.log('Batch processing complete');
      }
    })
  ]
});

console.log(`Batch job scheduled for: ${tomorrow2AM.toISOString()}`);
await batchProcessor.execute();
```

### Polling with Delay (Browser)

```javascript
import { DelayStep, Step, Workflow, ConditionalStep } from './micro-flow.js';

async function pollForCompletion(taskId, maxAttempts = 10) {
  let attempts = 0;
  let completed = false;
  
  while (!completed && attempts < maxAttempts) {
    const checkStep = new Step({
      name: `check-status-${attempts}`,
      callable: async () => {
        const response = await fetch(`/api/tasks/${taskId}/status`);
        const data = await response.json();
        completed = data.status === 'completed';
        return data;
      }
    });
    
    const result = await checkStep.execute();
    
    if (!completed) {
      const delay = new DelayStep({
        name: `poll-delay-${attempts}`,
        relative_delay_ms: 2000 // Poll every 2 seconds
      });
      await delay.execute();
    }
    
    attempts++;
  }
  
  return completed;
}

const isComplete = await pollForCompletion('task-123');
console.log('Task completed:', isComplete);
```

### Debouncing User Input (Browser)

```javascript
import { DelayStep, Step } from './micro-flow.js';

let debounceTimeout;

async function debounceSearch(query) {
  // Clear previous timeout
  clearTimeout(debounceTimeout);
  
  debounceTimeout = setTimeout(async () => {
    const searchStep = new Step({
      name: 'search',
      callable: async () => {
        const response = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
        return response.json();
      }
    });
    
    const results = await searchStep.execute();
    displayResults(results.result);
  }, 300); // 300ms debounce
}

document.getElementById('search-input').addEventListener('input', (e) => {
  debounceSearch(e.target.value);
});
```

### Timed Workflow Execution (Node.js)

```javascript
import { DelayStep, Step, Workflow } from 'micro-flow';

const timedWorkflow = new Workflow({
  name: 'timed-operation',
  steps: [
    new Step({
      name: 'start-timer',
      callable: async () => {
        console.log('Starting timed operation...');
        return Date.now();
      }
    }),
    new Step({
      name: 'perform-task',
      callable: async () => {
        // Simulate some work
        await performComplexOperation();
      }
    }),
    new DelayStep({
      name: 'ensure-minimum-time',
      relative_delay_ms: 5000 // Ensure at least 5 seconds total
    }),
    new Step({
      name: 'end-timer',
      callable: async () => {
        console.log('Timed operation complete');
      }
    })
  ]
});

await timedWorkflow.execute();
```

## Events

DelayStep emits the following events during execution:

- `DELAY_STEP_ABSOLUTE_SCHEDULED` - Emitted when an absolute delay is scheduled
- `DELAY_STEP_ABSOLUTE_COMPLETE` - Emitted when an absolute delay completes
- `DELAY_STEP_RELATIVE_SCHEDULED` - Emitted when a relative delay is scheduled
- `DELAY_STEP_RELATIVE_COMPLETE` - Emitted when a relative delay completes

## Notes

- Uses `node-schedule` library for scheduling delays
- If `absolute_timestamp` is in the past when executing an absolute delay, the step continues immediately
- If `relative_delay_ms` is zero or negative, the step continues immediately
- Delays are non-blocking and use promise-based scheduling
- The `scheduled_job` property can be used to cancel a scheduled delay if needed

## Related

- [Step](step.md) - Base step class
- [Workflow](../workflow.md) - Workflow orchestration
- [delay_types enum](../../enums/delay_types.md) - Available delay types
