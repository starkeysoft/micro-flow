# DelayStep

Introduce precise execution delays into your pipeline. `DelayStep` supports both relative durations and absolute scheduled timestamps.

Extends: [Step](step.md)

## Constructor

### `new DelayStep(options)`

Initializes a new DelayStep instance.

**Parameters:**
- `options` (Object) - Configuration options
  - `delay_type` (string) - Choose `'relative'` or `'absolute'`.
  - `relative_delay_ms` (number) - Duration to wait in milliseconds.
  - `absolute_timestamp` (Date|string) - Exact time to resume execution.

## Resilience Example
Implement a retry-ready delay (e.g., waiting for a resource to become available):

```javascript
new DelayStep({
  name: 'wait-for-provisioning',
  delay_type: 'relative',
  relative_delay_ms: 10000, // Wait 10 seconds
  max_timeout_ms: 15000, // Ensure the delay doesn't hang indefinitely
});
```

## Methods

### `async execute()`

Activates the non-blocking delay. The workflow will pause execution and yield the thread until the timer resolves.
