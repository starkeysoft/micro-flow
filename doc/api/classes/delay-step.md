# DelayStep Class

The `DelayStep` class pauses workflow execution for a specified duration or until a specific timestamp. It supports both relative (duration-based) and absolute (timestamp-based) delays.

## Constructor

```javascript
new DelayStep(options)
```

### Parameters

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `options.name` | `string` | No | `''` | Name for the delay step |
| `options.delay_timestamp` | `Date\|string\|number` | No | `null` | Target timestamp for absolute delays |
| `options.delay_duration` | `number` | No | `1000` | Duration in milliseconds for relative delays |
| `options.delay_type` | `string` | No | `DelayTypes.ABSOLUTE` | Type of delay (ABSOLUTE or RELATIVE) |

### Example

```javascript
import { DelayStep, DelayTypes } from 'micro-flow';

// Relative delay (wait 5 seconds)
const relativeDelay = new DelayStep({
  name: 'Wait 5 Seconds',
  delay_type: DelayTypes.RELATIVE,
  delay_duration: 5000
});

// Absolute delay (wait until specific time)
const absoluteDelay = new DelayStep({
  name: 'Wait Until Midnight',
  delay_type: DelayTypes.ABSOLUTE,
  delay_timestamp: new Date('2024-12-31T23:59:59')
});
```

## Properties

### Static Properties

- **`step_name`**: `'delay'` - Identifier for delay steps

### State Properties

In addition to base Step state properties:

| Property | Type | Description |
|----------|------|-------------|
| `delay_duration` | `number` | Duration in milliseconds |
| `delay_type` | `string` | Delay type (ABSOLUTE or RELATIVE) |
| `delay_timestamp` | `Date\|string\|number` | Target timestamp for absolute delays |
| `scheduled_job` | `Job` | node-schedule job instance (absolute delays) |

## Methods

### `absolute()`

Executes an absolute delay until a specific timestamp using node-schedule.

```javascript
async absolute(): Promise<Object>
```

**Returns:**
- `Promise<Object>` - Resolves with message object when delay completes

**Throws:**
- `Error` if timestamp is not provided or in invalid format

**Supported Timestamp Formats:**
- `Date` object
- ISO 8601 string (e.g., `'2024-12-31T23:59:59'`)
- Unix timestamp (milliseconds)

**Example:**

```javascript
const delayStep = new DelayStep({
  name: 'Wait Until Launch',
  delay_type: DelayTypes.ABSOLUTE,
  delay_timestamp: Date.now() + 60000 // 1 minute from now
});

await delayStep.execute();
console.log('Launch time reached!');
```

### `relative()`

Executes a relative delay for a specified duration.

```javascript
async relative(): Promise<Object>
```

**Returns:**
- `Promise<Object>` - Resolves with message object when delay completes

**Example:**

```javascript
const delayStep = new DelayStep({
  name: 'Wait 3 Seconds',
  delay_type: DelayTypes.RELATIVE,
  delay_duration: 3000
});

await delayStep.execute();
console.log('3 seconds have passed');
```

## Usage Examples

### Relative Delay

```javascript
import { Workflow, Step, DelayStep, StepTypes, DelayTypes } from 'micro-flow';

const workflow = new Workflow({ name: 'Rate Limited API' });

workflow.pushSteps([
  new Step({
    name: 'API Call 1',
    type: StepTypes.ACTION,
    callable: async () => await fetch('/api/endpoint')
  }),
  new DelayStep({
    name: 'Rate Limit',
    delay_type: DelayTypes.RELATIVE,
    delay_duration: 1000 // 1 second
  }),
  new Step({
    name: 'API Call 2',
    type: StepTypes.ACTION,
    callable: async () => await fetch('/api/endpoint')
  })
]);

await workflow.execute();
```

### Absolute Delay

```javascript
import { DelayStep, DelayTypes } from 'micro-flow';

// Schedule for specific date/time
const launchTime = new Date('2024-12-31T23:59:59');

const delayStep = new DelayStep({
  name: 'Wait for New Year',
  delay_type: DelayTypes.ABSOLUTE,
  delay_timestamp: launchTime
});

console.log('Waiting for new year...');
await delayStep.execute();
console.log('Happy New Year!');
```

### Dynamic Delay Calculation

```javascript
// Calculate delay based on business logic
function createScheduledDelay(hours, minutes) {
  const now = new Date();
  const target = new Date(now);
  target.setHours(hours, minutes, 0, 0);
  
  // If time has passed today, schedule for tomorrow
  if (target < now) {
    target.setDate(target.getDate() + 1);
  }
  
  return new DelayStep({
    name: `Wait Until ${hours}:${minutes}`,
    delay_type: DelayTypes.ABSOLUTE,
    delay_timestamp: target
  });
}

// Wait until 9 AM
const morningDelay = createScheduledDelay(9, 0);
await morningDelay.execute();
```

### Polling with Delays

```javascript
const workflow = new Workflow({ name: 'Polling Workflow' });

for (let i = 0; i < 10; i++) {
  workflow.pushSteps([
    new Step({
      name: `Check Status ${i + 1}`,
      type: StepTypes.ACTION,
      callable: async function() {
        const ready = await checkIfReady();
        if (ready) {
          this.workflow.should_break = true;
        }
        return { ready, attempt: i + 1 };
      }
    }),
    new DelayStep({
      name: `Poll Delay ${i + 1}`,
      delay_type: DelayTypes.RELATIVE,
      delay_duration: 2000 // 2 seconds between checks
    })
  ]);
}

await workflow.execute();
```

### Batch Processing with Delays

```javascript
const items = [/* large array */];
const batchSize = 10;

for (let i = 0; i < items.length; i += batchSize) {
  workflow.pushSteps([
    new Step({
      name: `Process Batch ${i / batchSize + 1}`,
      type: StepTypes.ACTION,
      callable: async () => {
        const batch = items.slice(i, i + batchSize);
        return await processBatch(batch);
      }
    }),
    new DelayStep({
      name: 'Batch Delay',
      delay_type: DelayTypes.RELATIVE,
      delay_duration: 500 // 500ms between batches
    })
  ]);
}

await workflow.execute();
```

### Event Tracking

```javascript
const delayStep = new DelayStep({
  name: 'Tracked Delay',
  delay_type: DelayTypes.RELATIVE,
  delay_duration: 5000
});

delayStep.events.on('STEP_STARTED', () => {
  console.log('Delay started');
});

delayStep.events.on('DELAY_STEP_RELATIVE_COMPLETE', ({ step, duration }) => {
  console.log(`Delay completed: ${duration}ms`);
});

delayStep.events.on('DELAY_STEP_ABSOLUTE_COMPLETE', ({ step, timestamp }) => {
  console.log(`Reached timestamp: ${timestamp}`);
});

await delayStep.execute();
```

### Timeout Handling

```javascript
const delayStep = new DelayStep({
  name: 'Long Delay',
  delay_type: DelayTypes.RELATIVE,
  delay_duration: 10000, // 10 seconds
  timeout_ms: 5000 // But timeout after 5 seconds
});

try {
  await delayStep.execute();
} catch (error) {
  if (delayStep.state.get('status') === 'timeout') {
    console.log('Delay timed out');
  }
}
```

## Delay Type Comparison

| Feature | RELATIVE | ABSOLUTE |
|---------|----------|----------|
| **Input** | Duration in milliseconds | Timestamp (Date/string/number) |
| **Use Case** | Fixed delays, rate limiting | Scheduled execution |
| **Implementation** | `setTimeout` + Promise | `node-schedule` |
| **Accuracy** | High (precise) | ~1 second polling |
| **Best For** | Short delays (ms to minutes) | Scheduled tasks (any duration) |

## Past Timestamp Behavior

If an absolute delay timestamp is in the past:

```javascript
const pastDelay = new DelayStep({
  name: 'Past Time',
  delay_type: DelayTypes.ABSOLUTE,
  delay_timestamp: Date.now() - 5000 // 5 seconds ago
});

await pastDelay.execute();
// Resolves immediately with message:
// { message: 'Timestamp is in the past, firing immediately' }
```

## Cancellation

Absolute delays can be cancelled through the scheduled job:

```javascript
const delayStep = new DelayStep({
  name: 'Cancellable Delay',
  delay_type: DelayTypes.ABSOLUTE,
  delay_timestamp: Date.now() + 60000
});

// Start delay
const executePromise = delayStep.execute();

// Cancel after 5 seconds
setTimeout(() => {
  const job = delayStep.state.get('scheduled_job');
  if (job) {
    job.cancel();
  }
}, 5000);

await executePromise;
```

## See Also

- [Step Class](./step.md) - Parent class
- [delay_types Enum](../enums/delay-types.md) - ABSOLUTE vs RELATIVE
- [delay_cron Helper](../helpers/delay-cron.md) - Polling-based delays
- [Core Concepts - Steps](../../core-concepts/steps.md)
- [Examples - Scheduled Tasks](../../examples/backend/scheduled-tasks.md)
