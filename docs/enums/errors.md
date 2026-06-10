# errors / warnings

Named string constants for errors and warnings thrown or logged by the library. Exported as named exports (not default exports).

## Table of Contents
- [Values](#values)
- [Usage](#usage)
- [Related](#related)

## Values

### errors

| Key | Value | Description |
|-----|-------|-------------|
| `INVALID_STATE_PATH` | `'The provided state path is invalid.\n'` | Thrown when `State.get()`, `State.set()`, or `State.delete()` receives an empty or malformed path. |
| `INVALID_CONDITIONAL` | `'Conditional properties are required for LogicStep.'` | Thrown when a `LogicStep` subclass is constructed or evaluated without a valid `conditional` configuration. |
| `OBJECT_NOT_PARSEABLE` | `'The provided object could not be parsed.\n'` | Thrown when an object cannot be serialized (e.g., during BroadcastChannel broadcasting). |
| `VALUE_NOT_ITERABLE` | `'The provided value is not iterable.\n'` | Thrown by `LoopStep.for_each_loop()` when `iterable` is not a valid iterable. |

### warnings

| Key | Value | Description |
|-----|-------|-------------|
| `DO_NOT_SET_STEPS_DIRECTLY` | *(string)* | Logged when the `steps` setter on `Workflow` is used instead of `addSteps()`. |
| `BROADCAST_FAILED` | *(string)* | Logged when a `BroadcastChannel` emission fails (e.g., in environments without BroadcastChannel support). |

## Usage

```javascript
import { errors, warnings } from '@ronaldroe/micro-flow';

// Checking against a caught error message
try {
  State.set('', 'value');
} catch (e) {
  if (e.message.includes(errors.INVALID_STATE_PATH)) {
    console.error('Invalid path provided to State.set()');
  }
}

// Referencing error strings for custom validation
function validateConditional(config) {
  if (!config.subject || !config.operator) {
    throw new Error(errors.INVALID_CONDITIONAL);
  }
}
```

## Related

- [State](../classes/state.md) — Throws `INVALID_STATE_PATH` on bad paths.
- [LogicStep](../classes/steps/logic_step.md) — Throws `INVALID_CONDITIONAL` on bad conditional config.
- [LoopStep](../classes/steps/loop_step.md) — Throws `VALUE_NOT_ITERABLE` when iterable is absent.
- [Event](../classes/events/event.md) — Logs `BROADCAST_FAILED` on BroadcastChannel errors.
