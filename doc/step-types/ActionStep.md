# ActionStep

**Represents an action step in a workflow that executes a callable function.**

## Overview

The `ActionStep` class is a specialized step type designed to execute custom functions within a workflow. It is the most generic and flexible step type, allowing any async function to be executed.

## Class Definition

```javascript
class ActionStep extends Step
```

**Extends:** [Step](../base-classes/Step.md)  
**Location:** `src/classes/action_step.js`

## Properties

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `step_name` | `string` (static) | `'action'` | Static identifier for the step type |

*Inherits all properties from [Step](../base-classes/Step.md)*

## Constructor

### `constructor(options)`

Creates a new ActionStep instance.

**Parameters:**

- `options` (Object) *[optional]* - Configuration options for the action step
  - `name` (string) *[optional]* - The name of the action step (default: `''`)
  - `callable` (Step | Workflow | Function) *[optional]* - The step, workflow, or function to execute when this step runs (default: `async () => {}`)

**Example:**

```javascript
const actionStep = new ActionStep({
  name: 'Process User Data',
  callable: async (context) => {
    const user = await fetchUser(context.userId);
    return { user };
  }
});
```

## Methods

### `setCallable(callable)`

Sets the callable function for this action step. This is the only step that can do that after instantiation. It is deliberately designed to be generic and run whatever function is provided.

**Parameters:**

- `callable` (Step | Workflow | Function) - The step, workflow, or function to execute when this step runs

**Returns:** `void`

**Throws:** `Error` - If the provided callable is not a function

**Example:**

```javascript
const step = new ActionStep({ name: 'Dynamic Action' });

// Set the callable later
step.setCallable(async (context) => {
  console.log('Executing dynamic action');
  return { success: true };
});
```

*Inherits all methods from [Step](../base-classes/Step.md)*

## Usage Examples

### Basic Action Step

```javascript
import { ActionStep } from './classes';

const step = new ActionStep({
  name: 'Send Email',
  callable: async (context) => {
    await emailService.send({
      to: context.email,
      subject: 'Welcome',
      body: 'Welcome to our service!'
    });
    return { emailSent: true };
  }
});

const result = await step.execute();
```

### Dynamic Callable Assignment

```javascript
import { ActionStep } from './classes';

// Create step without callable
const step = new ActionStep({
  name: 'Conditional Processing'
});

// Assign callable based on runtime conditions
if (condition) {
  step.setCallable(async (context) => {
    return await processA(context);
  });
} else {
  step.setCallable(async (context) => {
    return await processB(context);
  });
}

await step.execute();
```

### Using Context

```javascript
import { ActionStep, Workflow } from './classes';

const step1 = new ActionStep({
  name: 'Fetch Data',
  callable: async (context) => {
    const data = await api.fetch(context.query);
    context.fetchedData = data;
    return data;
  }
});

const step2 = new ActionStep({
  name: 'Process Data',
  callable: async (context) => {
    // Access data from previous step via context
    const processed = transform(context.fetchedData);
    return processed;
  }
});

const workflow = new Workflow([step1, step2]);
await workflow.execute({ query: 'SELECT * FROM users' });
```

## Design Philosophy

The `ActionStep` is intentionally designed to be the most flexible step type:

- **Generic by Design**: Can execute any async function
- **Runtime Modification**: Supports changing the callable after instantiation via `setCallable()`
- **Context-Aware**: Receives workflow state as context parameter
- **Composable**: Can be combined with other step types in workflows

## When to Use

Use `ActionStep` when you need to:

- Execute custom business logic
- Make API calls
- Perform database operations
- Process data transformations
- Execute any generic async operation

For specialized behaviors, consider using:

- [DelayStep](DelayStep.md) for timed delays
- [ConditionalStep](../logic-steps/ConditionalStep.md) for branching logic
- [LoopStep](../logic-steps/LoopStep.md) for repetitive operations
- [SubflowStep](SubflowStep.md) for executing nested workflows

## Related Classes

- [Step](../base-classes/Step.md) - Base step class
- [DelayStep](DelayStep.md) - Delay execution
- [SubflowStep](SubflowStep.md) - Execute sub-workflows
