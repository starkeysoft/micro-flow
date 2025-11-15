# DelayStep

**Represents a delay step that pauses workflow execution for a specified duration.**

## Overview

The `DelayStep` class provides the ability to pause workflow execution either for a specific duration (relative delay) or until a specific timestamp (absolute delay). This is useful for scheduling, rate limiting, or waiting for external conditions.

## Class Definition

```javascript
class DelayStep extends Step
```

**Extends:** [Step](../base-classes/Step.md)  
**Location:** `src/classes/delay_step.js`

## Properties

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `step_name` | `string` (static) | `'delay'` | Static identifier for the step type |

*Inherits all properties from [Step](../base-classes/Step.md)*

## Constructor

### `constructor(options)`

Creates a new DelayStep instance.

**Parameters:**

- `options` (Object) *[optional]* - Configuration options for the delay step
  - `name` (string) *[optional]* - The name of the delay step (default: `''`)
  - `delay_duration` (number) *[optional]* - The delay duration in milliseconds (for relative) or timestamp (for absolute) (default: `1000`)
  - `delay_type` (string) *[optional]* - The type of delay (ABSOLUTE or RELATIVE) (default: `delay_types.ABSOLUTE`)

**Example:**

```javascript
import { DelayStep, delay_types } from './classes';

// Relative delay - wait 5 seconds
const relativeDelay = new DelayStep({
  name: 'Wait 5 Seconds',
  delay_duration: 5000,
  delay_type: delay_types.RELATIVE
});

// Absolute delay - wait until specific time
const futureTime = Date.now() + 10000;
const absoluteDelay = new DelayStep({
  name: 'Wait Until Timestamp',
  delay_duration: futureTime,
  delay_type: delay_types.ABSOLUTE
});
```

## Methods

### `absolute(timestamp)`

Executes an absolute delay until a specific timestamp.

**Parameters:**

- `timestamp` (Date) - The absolute timestamp to wait until

**Returns:** `Promise<void>`

**Async:** Yes

**Example:**

```javascript
const futureDate = new Date('2025-12-31T23:59:59');
await delayStep.absolute(futureDate);
```

---

### `relative(duration)`

Executes a relative delay for a specified duration from the current time.

**Parameters:**

- `duration` (number) - The duration in milliseconds to wait

**Returns:** `Promise<void>`

**Async:** Yes

**Example:**

```javascript
await delayStep.relative(3000); // Wait 3 seconds
```

*Inherits all methods from [Step](../base-classes/Step.md)*

## Usage Examples

### Relative Delay

```javascript
import { DelayStep, Workflow, Step, step_types, delay_types } from './classes';

const step1 = new Step({
  type: step_types.ACTION,
  name: 'Start Process',
  callable: async () => {
    console.log('Process started');
    return { started: Date.now() };
  }
});

const delay = new DelayStep({
  name: 'Wait 2 Seconds',
  delay_duration: 2000,
  delay_type: delay_types.RELATIVE
});

const step2 = new Step({
  type: step_types.ACTION,
  name: 'Continue Process',
  callable: async () => {
    console.log('Process continued after delay');
    return { continued: Date.now() };
  }
});

const workflow = new Workflow([step1, delay, step2]);
await workflow.execute();
```

### Absolute Delay (Scheduled Execution)

```javascript
import { DelayStep, Step, step_types, Workflow, delay_types } from './classes';

// Schedule execution for a specific time
const scheduledTime = new Date('2025-12-25T12:00:00');

const scheduleDelay = new DelayStep({
  name: 'Wait Until Christmas Noon',
  delay_duration: scheduledTime.getTime(),
  delay_type: delay_types.ABSOLUTE
});

const holidayAction = new Step({
  type: step_types.ACTION,
  name: 'Send Holiday Greetings',
  callable: async () => {
    console.log('Merry Christmas!');
    await sendGreetings();
    return { sent: true };
  }
});

const workflow = new Workflow([scheduleDelay, holidayAction]);
await workflow.execute();
```

### Rate Limiting

```javascript
import { DelayStep, Step, step_types, delay_types } from './classes';

async function processWithRateLimit(items) {
  const steps = [];
  
  for (const item of items) {
    // Add processing step
    steps.push(new Step({
      type: step_types.ACTION,
      name: `Process ${item.id}`,
      callable: async () => await processItem(item)
    }));
    
    // Add delay between requests
    steps.push(new DelayStep({
      name: 'Rate Limit Delay',
      delay_duration: 1000, // 1 second between requests
      delay_type: delay_types.RELATIVE
    }));
  }
  
  const workflow = new Workflow(steps);
  return await workflow.execute();
}
```

### Retry with Backoff

```javascript
import { DelayStep, Step, step_types, delay_types } from './classes';

async function retryWithBackoff(operation, maxRetries = 3) {
  const steps = [];
  
  for (let i = 0; i < maxRetries; i++) {
    steps.push(new Step({
      type: step_types.ACTION,
      name: `Attempt ${i + 1}`,
      callable: async (context) => {
        try {
          return await operation();
        } catch (error) {
          if (i === maxRetries - 1) throw error;
          context.lastError = error;
          return null;
        }
      }
    }));
    
    // Exponential backoff delay
    if (i < maxRetries - 1) {
      steps.push(new DelayStep({
        name: `Backoff Delay ${i + 1}`,
        delay_duration: Math.pow(2, i) * 1000,
        delay_type: delay_types.RELATIVE
      }));
    }
  }
  
  const workflow = new Workflow(steps);
  return await workflow.execute();
}
```

## Delay Types

The `DelayStep` supports two delay types from the `delay_types` enum:

### RELATIVE
Delays for a specific duration from the current time. The `delay_duration` parameter represents milliseconds.

```javascript
// Wait 5 seconds from now
new DelayStep({
  delay_duration: 5000,
  delay_type: delay_types.RELATIVE
});
```

### ABSOLUTE
Delays until a specific timestamp. The `delay_duration` parameter represents a Unix timestamp in milliseconds.

```javascript
// Wait until specific date/time
const targetTime = new Date('2025-12-31T23:59:59').getTime();
new DelayStep({
  delay_duration: targetTime,
  delay_type: delay_types.ABSOLUTE
});
```

## Use Cases

- **Rate Limiting**: Add delays between API calls to respect rate limits
- **Scheduled Execution**: Wait until a specific time to execute steps
- **Retry Logic**: Implement exponential backoff for retries
- **Throttling**: Control the pace of workflow execution
- **Time-based Coordination**: Synchronize with external events or schedules
- **Testing**: Add predictable delays for testing async workflows

## Related Classes

- [Step](../base-classes/Step.md) - Base step class

- [Workflow](../base-classes/Workflow.md) - Orchestrate steps
