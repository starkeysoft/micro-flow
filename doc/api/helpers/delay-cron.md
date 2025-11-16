# delay_cron Helper

Delays execution until a specific timestamp is reached using a polling mechanism.

## Signature

```javascript
async delay_cron(fire_time)
```

## Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `fire_time` | `number` | Yes | Target timestamp in milliseconds (epoch time) |

## Returns

- **Type:** `Promise<number>`
- **Description:** Resolves with the `fire_time` value when the delay completes

## Description

The `delay_cron` helper provides a polling-based delay mechanism that waits until a specific timestamp is reached. It checks every second (1000ms) whether the current time has reached or exceeded the target time.

This is particularly useful for:
- Scheduling tasks to run at specific times
- Implementing time-based delays in workflows
- Creating cron-like behavior without external schedulers

## Polling Mechanism

The function uses a polling interval of **1 second (1000ms)** to check if the target time has been reached. This means:
- Resolution is limited to ~1 second accuracy
- Not suitable for sub-second precision timing
- Low overhead for long-duration delays

## Examples

### Basic Delay

```javascript
import { delay_cron } from 'micro-flow';

// Wait for 10 seconds
const targetTime = Date.now() + 10000;
await delay_cron(targetTime);
console.log('10 seconds have passed');
```

### Specific Future Time

```javascript
// Wait until a specific date/time
const futureDate = new Date('2024-12-31T23:59:59');
const timestamp = futureDate.getTime();

await delay_cron(timestamp);
console.log('Happy New Year!');
```

### Integration with DelayStep

```javascript
import { DelayStep, DelayTypes } from 'micro-flow';

// DelayStep uses delay_cron internally for ABSOLUTE delays
const step = new DelayStep({
  name: 'Wait Until Midnight',
  delay_type: DelayTypes.ABSOLUTE,
  delay_value: new Date().setHours(24, 0, 0, 0) // Next midnight
});

await step.execute();
```

### Scheduled Task Execution

```javascript
async function scheduleTask(taskFn, executeAt) {
  console.log(`Task scheduled for ${new Date(executeAt)}`);
  
  await delay_cron(executeAt);
  
  console.log('Executing scheduled task');
  await taskFn();
}

// Schedule a task for 5 minutes from now
const fiveMinutesLater = Date.now() + (5 * 60 * 1000);
await scheduleTask(
  async () => console.log('Task executed!'),
  fiveMinutesLater
);
```

### Multiple Timed Steps

```javascript
const steps = [
  { name: 'Step 1', at: Date.now() + 5000 },
  { name: 'Step 2', at: Date.now() + 10000 },
  { name: 'Step 3', at: Date.now() + 15000 }
];

for (const step of steps) {
  await delay_cron(step.at);
  console.log(`Executing ${step.name}`);
}
```

### Conditional Delays

```javascript
async function processWithDelay(data) {
  if (data.scheduledTime) {
    // Wait until scheduled time
    console.log('Waiting until:', new Date(data.scheduledTime));
    await delay_cron(data.scheduledTime);
  }
  
  // Process immediately if no scheduled time
  return processData(data);
}
```

### Workflow Integration

```javascript
import { Workflow, Step, StepTypes } from 'micro-flow';

const workflow = new Workflow({ name: 'Scheduled Workflow' });

workflow.pushSteps([
  new Step({
    name: 'Wait Until Launch Time',
    type: StepTypes.ACTION,
    callable: async function(data) {
      const launchTime = data.scheduledLaunchTime;
      console.log(`Waiting for launch at ${new Date(launchTime)}`);
      await delay_cron(launchTime);
      return { launched: true };
    }
  }),
  new Step({
    name: 'Execute Launch',
    type: StepTypes.ACTION,
    callable: async () => {
      console.log('Launching!');
      return { status: 'launched' };
    }
  })
]);

const launchTime = Date.now() + 30000; // 30 seconds from now
await workflow.execute({ scheduledLaunchTime: launchTime });
```

## Accuracy and Limitations

### Timing Accuracy
- **Resolution:** ~1 second (1000ms polling interval)
- **Precision:** May complete up to 1 second after target time
- **Not suitable for:** Sub-second timing requirements

```javascript
// Example of timing variance
const targetTime = Date.now() + 5000;
const startTime = Date.now();

await delay_cron(targetTime);

const actualDelay = Date.now() - startTime;
console.log(`Target: 5000ms, Actual: ${actualDelay}ms`);
// Output: "Target: 5000ms, Actual: 5001ms" (or similar)
```

### Performance Considerations

- **CPU Usage:** Minimal (checks every second, sleeps between checks)
- **Memory:** Constant (no accumulation of timers)
- **Long Delays:** Efficient for delays of minutes, hours, or days

```javascript
// Efficient for long delays
const tomorrow = Date.now() + (24 * 60 * 60 * 1000);
await delay_cron(tomorrow); // Only checks once per second
```

### Edge Cases

```javascript
// Past time resolves immediately
const pastTime = Date.now() - 5000;
await delay_cron(pastTime); // Resolves immediately

// Very long delay (24 hours)
const oneDayLater = Date.now() + (24 * 60 * 60 * 1000);
await delay_cron(oneDayLater); // Works fine, low overhead
```

## Comparison with Alternatives

### vs setTimeout

```javascript
// setTimeout: Better for short, precise delays
setTimeout(() => {
  console.log('Precise timing');
}, 5000);

// delay_cron: Better for scheduling to specific times
const specificTime = new Date('2024-12-25T09:00:00').getTime();
await delay_cron(specificTime);
```

### vs Cron Libraries

```javascript
// Cron libraries: Better for recurring schedules
// cron: '0 9 * * *' (every day at 9 AM)

// delay_cron: Better for one-time future execution
const nineAM = new Date().setHours(9, 0, 0, 0);
await delay_cron(nineAM);
```

## Internal Usage

`delay_cron` is used internally by:
- **DelayStep:** For ABSOLUTE delay type
- **Workflow scheduling:** Time-based workflow execution

## See Also

- [DelayStep Class](../classes/delay-step.md) - Uses delay_cron for absolute delays
- [delay_types Enum](../enums/delay-types.md) - ABSOLUTE vs RELATIVE delays
- [deep_clone Helper](./deep-clone.md) - Other helper function
