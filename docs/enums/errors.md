# Errors and Warnings

Error and warning messages used in the micro-flow library.

## Error Messages

### `INVALID_STATE_PATH`

**Value:** `'The provided state path is invalid.\n'`

**Thrown when:** A state path is empty, null, or malformed.

**Example:**

```javascript
import { State } from 'micro-flow';

try {
  State.get(''); // Empty path
} catch (error) {
  console.error(error.message); // "The provided state path is invalid."
}
```

### `INVALID_CONDITIONAL`

**Value:** `'Conditional properties are required for LogicStep.'`

**Thrown when:** Creating a LogicStep without valid conditional properties.

**Example:**

```javascript
import { LogicStep } from 'micro-flow';

try {
  const step = new LogicStep({
    name: 'test',
    conditional: {
      subject: null,  // Invalid
      operator: null,
      value: null
    }
  });
} catch (error) {
  console.error(error.message); // "Conditional properties are required for LogicStep."
}
```

## Warning Messages

### `DO_NOT_SET_STEPS_DIRECTLY`

**Value:** `'Using this.setState("steps", ...) is not recommended. State will not be initialized correctly. Use workflow methods to manage steps instead.'`

**When shown:** Attempting to set workflow steps directly via setState.

**Example:**

```javascript
import { Workflow, State } from 'micro-flow';

const workflow = new Workflow({ name: 'test' });

// ⚠️ Warning: Don't do this
State.set('steps', []);

// ✅ Correct way
workflow.addStep(new Step({ name: 'step1' }));
```

### `BROADCAST_FAILED`

**Value:** `'Broadcast failed or is not supported in this environment. The error has more detail:\n'`

**When shown:** Event broadcasting fails (e.g., in environments without BroadcastChannel support).

**Example:**

```javascript
import { State } from 'micro-flow';

const events = State.get('events.workflow');

// This may trigger the warning in unsupported environments
events.emit('custom_event', { data: 'test' });
```

## Usage in Code

### Node.js - Error Handling

```javascript
import { State, errors } from 'micro-flow';

function safeStateAccess(path, defaultValue = null) {
  try {
    return State.get(path, defaultValue);
  } catch (error) {
    if (error.message === errors.INVALID_STATE_PATH) {
      console.error('Invalid state path:', path);
      return defaultValue;
    }
    throw error;
  }
}

const value = safeStateAccess('', 'default'); // Returns 'default'
```

### Node.js - Validation

```javascript
import { LogicStep, errors } from 'micro-flow';

function createSafeLogicStep(config) {
  try {
    return new LogicStep({
      name: config.name,
      conditional: config.conditional,
      callable: config.callable
    });
  } catch (error) {
    if (error.message === errors.INVALID_CONDITIONAL) {
      console.error('Invalid conditional configuration');
      return null;
    }
    throw error;
  }
}

const step = createSafeLogicStep({
  name: 'test',
  conditional: { subject: null, operator: null, value: null }
});
// Returns null due to invalid conditional
```

### Browser - Warning Suppression

```javascript
import { State } from './micro-flow.js';

// Suppress console warnings if needed
State.set('log_suppress', true);

// Perform operations...

// Re-enable logging
State.set('log_suppress', false);
```

### React - Error Boundary

```javascript
import { errors } from './micro-flow.js';
import { Component } from 'react';

class WorkflowErrorBoundary extends Component {
  state = { hasError: false, error: null };

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  render() {
    if (this.state.hasError) {
      const errorMessage = this.state.error?.message || 'Unknown error';
      
      if (errorMessage === errors.INVALID_STATE_PATH) {
        return <div>Invalid state path. Please check your configuration.</div>;
      }
      
      if (errorMessage === errors.INVALID_CONDITIONAL) {
        return <div>Invalid conditional logic. Please review your steps.</div>;
      }
      
      return <div>An error occurred: {errorMessage}</div>;
    }

    return this.props.children;
  }
}
```

### Vue - Error Handler

```vue
<template>
  <div>
    <div v-if="error" class="error">
      {{ formatError(error) }}
    </div>
    <slot v-else></slot>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import { errors } from './micro-flow.js';

const error = ref(null);

const formatError = (err) => {
  switch (err.message) {
    case errors.INVALID_STATE_PATH:
      return 'Configuration error: Invalid path specified';
    case errors.INVALID_CONDITIONAL:
      return 'Logic error: Invalid conditional statement';
    default:
      return `Error: ${err.message}`;
  }
};

// Expose error setter for child components
defineExpose({ setError: (e) => error.value = e });
</script>
```

## Best Practices

### Always Validate Input

```javascript
import { State, errors } from 'micro-flow';

function validateAndSet(path, value) {
  if (!path || typeof path !== 'string') {
    throw new Error(errors.INVALID_STATE_PATH);
  }
  
  State.set(path, value);
}
```

### Use Try-Catch for Critical Operations

```javascript
import { LogicStep, errors } from 'micro-flow';

async function createWorkflowWithValidation(steps) {
  const validSteps = [];
  
  for (const stepConfig of steps) {
    try {
      const step = new LogicStep(stepConfig);
      validSteps.push(step);
    } catch (error) {
      if (error.message === errors.INVALID_CONDITIONAL) {
        console.warn(`Skipping invalid step: ${stepConfig.name}`);
        continue;
      }
      throw error;
    }
  }
  
  return validSteps;
}
```

### Log Warnings Appropriately

```javascript
import { warnings } from 'micro-flow';

function logWarning(warning, context) {
  if (process.env.NODE_ENV === 'development') {
    console.warn(warning, context);
  }
  
  // In production, send to error tracking service
  if (process.env.NODE_ENV === 'production') {
    errorTracker.captureWarning(warning, context);
  }
}
```

## See Also

- [State](../classes/state.md) - State management (throws INVALID_STATE_PATH)
- [LogicStep](../classes/steps/logic_step.md) - Logic step (throws INVALID_CONDITIONAL)
- [Event](../classes/events/event.md) - Event system (may show BROADCAST_FAILED warning)
