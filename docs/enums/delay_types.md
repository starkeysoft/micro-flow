# delay_types

Determines the scheduling strategy used by a `DelayStep`. `RELATIVE` waits for a duration from the current time; `ABSOLUTE` waits until a specific timestamp.

## Table of Contents
- [Values](#values)
- [Usage](#usage)
- [Related](#related)

## Values

| Key | Value | Description |
|-----|-------|-------------|
| `RELATIVE` | `'relative'` | Wait for `relative_delay_ms` milliseconds from now. |
| `ABSOLUTE` | `'absolute'` | Wait until `absolute_timestamp` (a `Date` object). |

## Usage

```javascript
import { DelayStep, delay_types } from '@ronaldroe/micro-flow';

// Relative delay — wait 3 seconds
const relativeDelay = new DelayStep({
  name: 'pause-3s',
  delay_type: delay_types.RELATIVE,
  relative_delay_ms: 3000,
});

// Absolute delay — wait until a specific future moment
const scheduledAt = new Date('2026-07-01T09:00:00Z');
const absoluteDelay = new DelayStep({
  name: 'wait-until-launch',
  delay_type: delay_types.ABSOLUTE,
  absolute_timestamp: scheduledAt,
});

// Both proceed immediately if the time has already passed
const pastDelay = new DelayStep({
  name: 'already-past',
  delay_type: delay_types.ABSOLUTE,
  absolute_timestamp: new Date(Date.now() - 10000), // 10 seconds ago
});
await pastDelay.execute();
console.log(pastDelay.result.delayed); // false
```

Using the string values directly is also valid:

```javascript
import { DelayStep } from '@ronaldroe/micro-flow';

const delay = new DelayStep({
  name: 'throttle',
  delay_type: 'relative',
  relative_delay_ms: 500,
});
```

## Related

- [DelayStep](../classes/steps/delay_step.md) — Uses `delay_types` to select the scheduling strategy.
