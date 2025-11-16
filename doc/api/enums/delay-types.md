# delay_types Enum

Defines the two strategies for calculating delays in DelayStep.

## Values

| Constant | Value | Description |
|----------|-------|-------------|
| `ABSOLUTE` | `'absolute'` | Delay until a specific timestamp |
| `RELATIVE` | `'relative'` | Delay for a duration in milliseconds |

## Import

```javascript
import { DelayTypes } from 'micro-flow';
// or
import DelayTypes from 'micro-flow/enums/delay_types';
```

## Usage

### ABSOLUTE Delays

Delay execution until a specific point in time (timestamp).

```javascript
import { DelayStep, DelayTypes } from 'micro-flow';

// Wait until midnight
const midnight = new Date();
midnight.setHours(24, 0, 0, 0);

const step = new DelayStep({
  name: 'Wait Until Midnight',
  delay_type: DelayTypes.ABSOLUTE,
  delay_value: midnight.getTime() // Timestamp in ms
});

await step.execute();
console.log('It is now midnight!');
```

### RELATIVE Delays

Delay execution for a specific duration from now.

```javascript
import { DelayStep, DelayTypes } from 'micro-flow';

// Wait for 5 seconds
const step = new DelayStep({
  name: 'Wait 5 Seconds',
  delay_type: DelayTypes.RELATIVE,
  delay_value: 5000 // Duration in ms
});

await step.execute();
console.log('5 seconds have passed');
```

## Comparison

| Feature | ABSOLUTE | RELATIVE |
|---------|----------|----------|
| **Value Type** | Timestamp (epoch ms) | Duration (ms) |
| **Use Case** | Schedule to specific time | Pause for duration |
| **Example Value** | `1735689600000` | `5000` |
| **Calculation** | Wait until timestamp | Wait for N milliseconds |
| **Implementation** | Uses `delay_cron` helper | Uses `setTimeout` |

## Examples

### Scheduled Task (ABSOLUTE)

```javascript
// Execute at specific time
const launchTime = new Date('2024-12-31T23:59:59').getTime();

const delayStep = new DelayStep({
  name: 'Wait for Launch',
  delay_type: DelayTypes.ABSOLUTE,
  delay_value: launchTime
});

console.log('Waiting for launch...');
await delayStep.execute();
console.log('Launching!');
```

### Rate Limiting (RELATIVE)

```javascript
// Add delays between API calls
const workflow = new Workflow({ name: 'API Calls' });

for (let i = 0; i < 5; i++) {
  workflow.pushSteps([
    new Step({
      name: `API Call ${i + 1}`,
      type: StepTypes.ACTION,
      callable: async () => await fetch('/api/endpoint')
    }),
    new DelayStep({
      name: `Rate Limit ${i + 1}`,
      delay_type: DelayTypes.RELATIVE,
      delay_value: 1000 // 1 second between calls
    })
  ]);
}

await workflow.execute();
```

### Business Hours Execution (ABSOLUTE)

```javascript
// Wait until business hours
function getNextBusinessHourStart() {
  const now = new Date();
  const next = new Date(now);
  
  // Set to 9 AM
  next.setHours(9, 0, 0, 0);
  
  // If it's already past 9 AM, move to tomorrow
  if (now.getHours() >= 17) {
    next.setDate(next.getDate() + 1);
  }
  
  return next.getTime();
}

const businessHoursDelay = new DelayStep({
  name: 'Wait for Business Hours',
  delay_type: DelayTypes.ABSOLUTE,
  delay_value: getNextBusinessHourStart()
});

await businessHoursDelay.execute();
// Now it's 9 AM on a business day
```

### Polling with Timeout (RELATIVE)

```javascript
async function pollUntilReady(maxWaitMs = 60000) {
  const workflow = new Workflow({ name: 'Polling' });
  const pollInterval = 2000; // 2 seconds
  const maxAttempts = Math.floor(maxWaitMs / pollInterval);
  
  for (let i = 0; i < maxAttempts; i++) {
    workflow.pushSteps([
      new Step({
        name: `Check Status ${i + 1}`,
        type: StepTypes.ACTION,
        callable: async function() {
          const ready = await checkIfReady();
          if (ready) {
            this.workflow.should_break = true; // Exit loop
          }
          return { ready, attempt: i + 1 };
        }
      }),
      new DelayStep({
        name: `Poll Delay ${i + 1}`,
        delay_type: DelayTypes.RELATIVE,
        delay_value: pollInterval
      })
    ]);
  }
  
  await workflow.execute();
}
```

### Combining Both Types

```javascript
const workflow = new Workflow({ name: 'Scheduled with Delays' });

workflow.pushSteps([
  // Wait until specific time
  new DelayStep({
    name: 'Wait Until Scheduled Time',
    delay_type: DelayTypes.ABSOLUTE,
    delay_value: scheduledStartTime
  }),
  
  new Step({
    name: 'Task 1',
    type: StepTypes.ACTION,
    callable: async () => performTask1()
  }),
  
  // Wait 5 seconds
  new DelayStep({
    name: 'Short Delay',
    delay_type: DelayTypes.RELATIVE,
    delay_value: 5000
  }),
  
  new Step({
    name: 'Task 2',
    type: StepTypes.ACTION,
    callable: async () => performTask2()
  })
]);

await workflow.execute();
```

## Dynamic Delay Type Selection

```javascript
function createDelayStep(config) {
  if (config.scheduledTime) {
    // Use ABSOLUTE for scheduled execution
    return new DelayStep({
      name: 'Scheduled Delay',
      delay_type: DelayTypes.ABSOLUTE,
      delay_value: config.scheduledTime
    });
  } else if (config.durationMs) {
    // Use RELATIVE for duration-based delay
    return new DelayStep({
      name: 'Duration Delay',
      delay_type: DelayTypes.RELATIVE,
      delay_value: config.durationMs
    });
  }
  
  throw new Error('Must specify scheduledTime or durationMs');
}

// Usage
const absoluteDelay = createDelayStep({ 
  scheduledTime: Date.now() + 10000 
});

const relativeDelay = createDelayStep({ 
  durationMs: 5000 
});
```

## Implementation Details

### ABSOLUTE
- Uses `delay_cron` helper internally
- Polls every second until timestamp is reached
- Suitable for delays of any duration
- ~1 second timing accuracy

### RELATIVE
- Uses native `setTimeout` internally
- Precise for short durations
- Suitable for sub-second to minute-range delays
- Better precision than ABSOLUTE

## Best Practices

**Use ABSOLUTE when:**
- Scheduling to specific times (e.g., "run at 9 AM")
- Coordinating with external schedules
- Implementing cron-like behavior
- Delays span across time boundaries (e.g., overnight)

**Use RELATIVE when:**
- Adding fixed delays between operations
- Implementing rate limiting
- Creating retry backoffs
- Delays are short to moderate duration

## See Also

- [DelayStep Class](../classes/delay-step.md)
- [delay_cron Helper](../helpers/delay-cron.md)
- [Core Concepts - Steps](../../core-concepts/steps.md)
