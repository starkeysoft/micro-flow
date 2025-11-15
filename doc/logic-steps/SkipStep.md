# SkipStep

**Represents a skip step that conditionally skips execution based on a condition.**

## Overview

The `SkipStep` class provides conditional skipping logic within workflows. It evaluates a condition and sets a flag to indicate whether the step should be skipped during workflow execution.

## Class Definition

```javascript
class SkipStep extends LogicStep
```

**Extends:** [LogicStep](LogicStep.md)  
**Location:** `src/classes/skip_step.js`

## Properties

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `step_name` | `string` (static) | `logic_step_types.SKIP` | Static identifier for the step type |
| `should_skip` | `boolean` | `false` | Flag indicating if the step should be skipped |

*Inherits all properties from [LogicStep](LogicStep.md)*

## Constructor

### `constructor(options)`

Creates a new SkipStep instance.

**Parameters:**

- `options` (Object) - Configuration options for the skip step
  - `subject` (*) - The value to compare against
  - `operator` (string) - The comparison operator to use (e.g., '===', '==', '!=', '>', '<', '>=', '<=')
  - `value` (*) - The value to compare the subject with
  - `name` (string) *[optional]* - The name of the skip step (default: `''`)

**Example:**

```javascript
import { SkipStep } from './classes';

const skipOnError = new SkipStep({
  name: 'Skip if No Data',
  subject: (context) => context.dataCount,
  operator: '===',
  value: 0
});
```

## Methods

### `skipStep()`

Evaluates the condition and sets the should_skip flag accordingly.

**Returns:** `boolean` - True if the step should be skipped, false otherwise

**Example:**

```javascript
const shouldSkip = skipOnError.skipStep();
if (shouldSkip) {
  console.log('Step will be skipped');
}
```

*Inherits all methods from [LogicStep](LogicStep.md) and [Step](../base-classes/Step.md)*

## Usage Examples

### Basic Skip Condition

```javascript
import { SkipStep, Workflow, Step, step_types } from './classes';

const skipStep = new SkipStep({
  name: 'Skip Empty Processing',
  subject: items.length,
  operator: '===',
  value: 0
});

const workflow = new Workflow({
  name: 'Process Items',
  steps: [
    skipStep,
    new Step({
      name: 'Process',
      type: step_types.ACTION,
      callable: async () => {
        if (skipStep.state.get('should_skip')) {
          console.log('Skipping processing - no items');
          return;
        }
        // Process items
      }
    })
  ]
});
```

### Skip Based on Dynamic Value

```javascript
import { SkipStep } from './classes';

const skipOnThreshold = new SkipStep({
  name: 'Skip Low Priority',
  subject: (context) => context.priority,
  operator: '<',
  value: 5
});

await skipOnThreshold.execute();
if (skipOnThreshold.state.get('should_skip')) {
  console.log('Task skipped due to low priority');
}
```

### Skip in Complex Workflow

```javascript
import { SkipStep, ConditionalStep, Step, step_types, Workflow } from './classes';

const skipValidation = new SkipStep({
  name: 'Skip Validation Check',
  subject: config.skipValidation,
  operator: '===',
  value: true
});

const validationStep = new Step({
  name: 'Validate Data',
  type: step_types.ACTION,
  callable: async (context) => {
    if (skipValidation.state.get('should_skip')) {
      return { valid: true, skipped: true };
    }
    // Perform validation
    return { valid: true, skipped: false };
  }
});

const workflow = new Workflow({
  name: 'Data Processing',
  steps: [skipValidation, validationStep]
});
```

## State Management

The SkipStep maintains the following state properties:

| State Key | Type | Description |
|-----------|------|-------------|
| `should_skip` | `boolean` | Whether the step should be skipped |
| `subject` | `*` | The value being compared |
| `operator` | `string` | The comparison operator |
| `value` | `*` | The value to compare against |

## Best Practices

1. **Clear Naming**: Use descriptive names that indicate what condition triggers the skip
2. **Check State**: Always check the `should_skip` state in subsequent steps that depend on this logic
3. **Logging**: Use the inherited logging capabilities to track skip decisions
4. **Dynamic Values**: Use functions for `subject` when values need to be evaluated at runtime

## Related Classes

- [LogicStep](LogicStep.md) - Base class providing condition evaluation
- [ConditionalStep](ConditionalStep.md) - Provides branching logic
- [FlowControlStep](FlowControlStep.md) - Provides loop control
- [Step](../base-classes/Step.md) - Base step class

## See Also

- [Workflow](../base-classes/Workflow.md) - For managing step execution
- [Enums](../enums/Enums.md) - For available operators and step types
