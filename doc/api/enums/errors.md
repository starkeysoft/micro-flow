# Errors and Warnings Enums

Error messages and warnings used throughout the micro-flow library for consistent error handling and debugging.

## Import

```javascript
import { errors, warnings } from 'micro-flow';
```

## Errors

### `INVALID_STATE_PATH`

**Value:** `'The provided state path is invalid.\n'`

**When thrown:** When an empty or invalid path is provided to State methods like `set()`, `get()`, or `delete()`.

**Example:**

```javascript
import state, { errors } from 'micro-flow';

function safeSets(path, value) {
  if (!path) {
    throw new Error(errors.INVALID_STATE_PATH);
  }
  state.set(path, value);
}
```

## Warnings

### `DO_NOT_SET_STEPS_DIRECTLY`

**Value:** `'Directly setting the "steps" property is not recommended.\n\tState will not be initialized correctly.\n\tUse workflow methods to manage steps.\n'`

**When logged:** When attempting to set the `'steps'` property directly in state without using Workflow methods.

**Why:** Direct manipulation of the steps array bypasses proper state initialization, which can lead to steps not having their `current_step_index` set correctly.

**Correct approach:**

```javascript
// ❌ Wrong - triggers warning
state.set('steps', [step1, step2, step3]);

// ✅ Correct - use Workflow methods
const workflow = new Workflow();
workflow.pushSteps([step1, step2, step3]);
```

## Usage Example

```javascript
import state, { errors, warnings } from 'micro-flow';

// Check for errors
function validatePath(path) {
  if (!path) {
    throw new Error(errors.INVALID_STATE_PATH);
  }
  return true;
}

// Check warnings
if (path === 'steps' && !state.get('suppress_step_warning')) {
  console.warn(warnings.DO_NOT_SET_STEPS_DIRECTLY);
}
```

## See Also

- [State Class](../classes/state.md)
- [Workflow Class](../classes/workflow.md)
