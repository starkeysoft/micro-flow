# SubflowStep

**Represents a subflow step in a workflow that executes a sub-workflow.**

## Overview

The `SubflowStep` class enables workflow composition by allowing one workflow to execute another workflow as a step. This promotes modularity, reusability, and hierarchical workflow design.

## Class Definition

```javascript
class SubflowStep extends Step
```

**Extends:** [Step](../base-classes/Step.md)  
**Location:** `src/classes/subflow_step.js`

## Properties

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `step_name` | `string` (static) | `step_types.SUBFLOW` | Static identifier for the step type |
| `subflow` | `Workflow` | - | The sub-workflow to execute |

*Inherits all properties from [Step](../base-classes/Step.md)*

## Constructor

### `constructor(options)`

Creates a new SubflowStep instance.

**Parameters:**

- `options` (Object) - Configuration options for the subflow step
  - `subflow` (Workflow) - The sub-workflow to execute (required)
  - `name` (string) *[optional]* - The name of the subflow step (default: `''`)

**Example:**

```javascript
import { SubflowStep, Workflow, ActionStep } from './classes';

// Create a sub-workflow
const subWorkflow = new Workflow([
  new ActionStep({ name: 'Sub Step 1', callable: async () => {} }),
  new ActionStep({ name: 'Sub Step 2', callable: async () => {} })
], 'My Sub-Workflow');

// Create subflow step
const subflowStep = new SubflowStep({
  name: 'Execute Sub-Workflow',
  subflow: subWorkflow
});
```

## Methods

### `executeSubflow(args)`

Executes the sub-workflow with the provided arguments.

**Parameters:**

- `args` (Object) - The arguments to pass to the sub-workflow

**Returns:** `Promise<*>` - The result of executing the sub-workflow

**Async:** Yes

**Example:**

```javascript
const result = await subflowStep.executeSubflow({ 
  userId: 123,
  action: 'process' 
});
```

*Inherits all methods from [Step](../base-classes/Step.md)*

## Usage Examples

### Basic Subflow

```javascript
import { SubflowStep, Workflow, ActionStep } from './classes';

// Create reusable sub-workflow
const validationWorkflow = new Workflow([
  new ActionStep({
    name: 'Validate Email',
    callable: async (context) => {
      if (!context.email.includes('@')) {
        throw new Error('Invalid email');
      }
      return { emailValid: true };
    }
  }),
  new ActionStep({
    name: 'Validate Age',
    callable: async (context) => {
      if (context.age < 18) {
        throw new Error('Must be 18+');
      }
      return { ageValid: true };
    }
  })
], 'User Validation');

// Use in main workflow
const mainWorkflow = new Workflow([
  new ActionStep({
    name: 'Fetch User Data',
    callable: async (context) => {
      context.email = 'user@example.com';
      context.age = 25;
      return context;
    }
  }),
  new SubflowStep({
    name: 'Validate User',
    subflow: validationWorkflow
  }),
  new ActionStep({
    name: 'Save User',
    callable: async (context) => {
      await database.save(context);
      return { saved: true };
    }
  })
]);

await mainWorkflow.execute();
```

### Nested Subflows

```javascript
import { SubflowStep, Workflow, ActionStep } from './classes';

// Level 3: Deepest workflow
const databaseWorkflow = new Workflow([
  new ActionStep({ name: 'Connect DB', callable: async () => {} }),
  new ActionStep({ name: 'Execute Query', callable: async () => {} }),
  new ActionStep({ name: 'Close Connection', callable: async () => {} })
], 'Database Operations');

// Level 2: Middle workflow uses Level 3
const dataWorkflow = new Workflow([
  new ActionStep({ name: 'Prepare Data', callable: async () => {} }),
  new SubflowStep({ 
    name: 'Save to DB', 
    subflow: databaseWorkflow 
  })
], 'Data Processing');

// Level 1: Top workflow uses Level 2
const mainWorkflow = new Workflow([
  new ActionStep({ name: 'Initialize', callable: async () => {} }),
  new SubflowStep({ 
    name: 'Process Data', 
    subflow: dataWorkflow 
  }),
  new ActionStep({ name: 'Finalize', callable: async () => {} })
], 'Main Workflow');

await mainWorkflow.execute();
```

### Reusable Components

```javascript
import { SubflowStep, Workflow, ActionStep } from './classes';

// Create reusable workflow components
const authWorkflow = new Workflow([
  new ActionStep({ name: 'Check Token', callable: async () => {} }),
  new ActionStep({ name: 'Verify Permissions', callable: async () => {} })
], 'Authentication');

const loggingWorkflow = new Workflow([
  new ActionStep({ name: 'Log Event', callable: async () => {} }),
  new ActionStep({ name: 'Update Metrics', callable: async () => {} })
], 'Logging');

// Compose multiple workflows
const apiWorkflow = new Workflow([
  new SubflowStep({ name: 'Authenticate', subflow: authWorkflow }),
  new ActionStep({ 
    name: 'Handle Request', 
    callable: async (context) => {
      return await processApiRequest(context);
    }
  }),
  new SubflowStep({ name: 'Log Activity', subflow: loggingWorkflow })
], 'API Handler');

await apiWorkflow.execute({ request: apiRequest });
```

### Dynamic Subflow Selection

```javascript
import { SubflowStep, Workflow, ActionStep, ConditionalStep } from './classes';

// Define different processing workflows
const fastProcessing = new Workflow([
  new ActionStep({ name: 'Quick Process', callable: async () => {} })
], 'Fast Processing');

const thoroughProcessing = new Workflow([
  new ActionStep({ name: 'Deep Analysis', callable: async () => {} }),
  new ActionStep({ name: 'Validation', callable: async () => {} }),
  new ActionStep({ name: 'Final Check', callable: async () => {} })
], 'Thorough Processing');

// Select workflow based on conditions
const workflow = new Workflow([
  new ActionStep({
    name: 'Determine Priority',
    callable: async (context) => {
      context.priority = calculatePriority(context.data);
      return context;
    }
  }),
  new ConditionalStep({
    name: 'Choose Processing Method',
    subject: (context) => context.priority,
    operator: '===',
    value: 'high',
    step_left: new SubflowStep({ 
      name: 'Thorough', 
      subflow: thoroughProcessing 
    }),
    step_right: new SubflowStep({ 
      name: 'Fast', 
      subflow: fastProcessing 
    })
  })
]);
```

### Error Handling in Subflows

```javascript
import { SubflowStep, Workflow, ActionStep } from './classes';

// Subflow with error handling
const riskyWorkflow = new Workflow([
  new ActionStep({
    name: 'Risky Operation',
    callable: async (context) => {
      try {
        return await riskyOperation();
      } catch (error) {
        context.subflowError = error;
        throw error;
      }
    }
  })
], 'Risky Operations');

// Main workflow handles subflow errors
const mainWorkflow = new Workflow([
  new ActionStep({
    name: 'Pre-Process',
    callable: async () => ({ ready: true })
  }),
  new SubflowStep({
    name: 'Execute Risky Workflow',
    subflow: riskyWorkflow
  }),
  new ActionStep({
    name: 'Handle Result',
    callable: async (context) => {
      if (context.subflowError) {
        console.error('Subflow failed:', context.subflowError);
        return await fallbackOperation();
      }
      return { success: true };
    }
  })
], 'Main with Error Handling');

await mainWorkflow.execute();
```

## Benefits of Subflows

1. **Modularity**: Break complex workflows into manageable, reusable components
2. **Reusability**: Use the same workflow in multiple places
3. **Maintainability**: Update a workflow in one place, affect all usages
4. **Testing**: Test workflows independently
5. **Composition**: Build complex behaviors from simple parts
6. **Clarity**: Improve readability with named, purposeful subflows

## Best Practices

- **Name Clearly**: Give subflows descriptive names
- **Single Responsibility**: Each subflow should have one clear purpose
- **Context Management**: Be mindful of context passed between workflows
- **Error Handling**: Handle errors at appropriate levels
- **Avoid Deep Nesting**: Keep hierarchy reasonable (3-4 levels max)
- **Document Dependencies**: Note what context data subflows require

## Related Classes

- [Step](../base-classes/Step.md) - Base step class
- [Workflow](../base-classes/Workflow.md) - Workflow orchestration
- [ActionStep](ActionStep.md) - Execute actions
- [ConditionalStep](../logic-steps/ConditionalStep.md) - Conditional branching
