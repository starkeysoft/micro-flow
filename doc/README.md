# Node Workflow Documentation

**Comprehensive documentation for the Node Workflow library - A powerful, flexible workflow orchestration system for Node.js**

---

## Table of Contents

- [Overview](#overview)
- [Quick Start](#quick-start)
- [Core Concepts](#core-concepts)
- [API Reference](#api-reference)
  - [Base Classes](#base-classes)
  - [Step Types](#step-types)
  - [Logic Steps](#logic-steps)
  - [Events](#events)
  - [Utilities](#utilities)
  - [Enums](#enums)
- [Examples](#examples)
- [Best Practices](#best-practices)

---

## Overview

Node Workflow is a robust workflow orchestration library that enables you to build complex, maintainable workflows with support for:

- ✅ **Sequential step execution** with lifecycle management
- ✅ **Conditional branching** (if/else logic)
- ✅ **Loops** (while and for-each)
- ✅ **Switch statements** (multi-way branching)
- ✅ **Sub-workflows** (composition and reusability)
- ✅ **Delays** (relative and absolute timing)
- ✅ **Event system** (lifecycle hooks)
- ✅ **State management** (context passing between steps)
- ✅ **Error handling** (try/catch with recovery)

---

## Quick Start

```javascript
import { Workflow, Step, step_types } from './classes';

// Create steps
const step1 = new Step({
  name: 'Fetch Data',
  type: step_types.ACTION,
  callable: async (context) => {
    const data = await fetchData();
    context.data = data;
    return data;
  }
});

const step2 = new Step({
  name: 'Process Data',
  type: step_types.ACTION,
  callable: async (context) => {
    return processData(context.data);
  }
});

// Create and execute workflow
const workflow = new Workflow([step1, step2], 'My First Workflow');
const result = await workflow.execute();

console.log('Workflow completed:', result);
```

---

## Core Concepts

### Workflows

Workflows orchestrate the execution of steps in sequence. They manage state, handle errors, and emit lifecycle events.

### Steps

Steps are the building blocks of workflows. Each step represents a discrete unit of work with its own callable function and lifecycle.

### Context

Context gives a step the information about the workflow's data. It also serves as a snapshot of the state of the workflow at the time the step was executed.

### Events

Both workflows and steps emit events throughout their lifecycle, enabling monitoring, logging, and reactive behaviors.

---

## API Reference

### Base Classes

Core classes that form the foundation of the workflow system.

| Class | Description | Documentation |
|-------|-------------|---------------|
| **[Workflow](base-classes/Workflow.md)** | Orchestrates and executes sequences of steps | [View →](base-classes/Workflow.md) |
| **[Step](base-classes/Step.md)** | Base class for all step types with lifecycle management | [View →](base-classes/Step.md) |

---

### Step Types

Specialized step implementations for common workflow patterns.

| Class | Description | Documentation |
|-------|-------------|---------------|
| **[DelayStep](step-types/DelayStep.md)** | Pause execution for relative or absolute durations | [View →](step-types/DelayStep.md) |

**Key Features:**

- **Step**: Base class for all steps, most flexible, executes any async function or workflow
- **DelayStep**: Supports both relative delays (duration) and absolute delays (timestamp)

---

### Logic Steps

Advanced step types for implementing complex control flow logic.

| Class | Description | Documentation |
|-------|-------------|---------------|
| **[LogicStep](logic-steps/LogicStep.md)** | Base class for condition evaluation | [View →](logic-steps/LogicStep.md) |
| **[ConditionalStep](logic-steps/ConditionalStep.md)** | If/else branching based on conditions | [View →](logic-steps/ConditionalStep.md) |
| **[LoopStep](logic-steps/LoopStep.md)** | While and for-each loops | [View →](logic-steps/LoopStep.md) |
| **[SwitchStep](logic-steps/SwitchStep.md)** | Multi-way branching (switch/case) | [View →](logic-steps/SwitchStep.md) |
| **[SkipStep](logic-steps/SkipStep.md)** | Conditionally skip step execution | [View →](logic-steps/SkipStep.md) |
| **[FlowControlStep](logic-steps/FlowControlStep.md)** | Break and continue for flows and loops | [View →](logic-steps/FlowControlStep.md) |
| **[Case](logic-steps/Case.md)** | Individual case for switch statements | [View →](logic-steps/Case.md) |

**Comparison Operators Supported:**

- `===` - Strict equality
- `==` - Loose equality
- `!==` - Strict inequality
- `!=` - Loose inequality
- `>` - Greater than
- `<` - Less than
- `>=` - Greater than or equal
- `<=` - Less than or equal

---

### Events

Event management system for workflow and step lifecycles.

| Class | Description | Documentation |
|-------|-------------|---------------|
| **[Event](events/Event.md)** | Base event class with cross-platform support | [View →](events/Event.md) |
| **[StepEvent](events/StepEvent.md)** | Step lifecycle events | [View →](events/StepEvent.md) |
| **[WorkflowEvent](events/WorkflowEvent.md)** | Workflow lifecycle events | [View →](events/WorkflowEvent.md) |

**Step Events:**
- `STEP_COMPLETED` - Step finished successfully
- `STEP_FAILED` - Step encountered an error
- `STEP_RUNNING` - Step execution started
- `STEP_WAITING` - Step in waiting state
- `STEP_PENDING` - Step in pending state

**Workflow Events:**
- `WORKFLOW_CREATED` - Workflow instantiated
- `WORKFLOW_STARTED` - Workflow execution began
- `WORKFLOW_COMPLETED` - Workflow finished successfully
- `WORKFLOW_ERRORED` - Workflow encountered an error
- `WORKFLOW_STEP_ADDED` - Step added to workflow
- `WORKFLOW_STEP_REMOVED` - Step removed from workflow

---

### Utilities

Helper classes and functions for state management and data manipulation.

| Class/Function | Description | Documentation |
|----------------|-------------|---------------|
| **[State](utilities/State.md)** | Workflow state management with get/set/merge | [View →](utilities/State.md) |
| **[deep_clone](utilities/deep_clone.md)** | Deep clone utility with circular reference support | [View →](utilities/deep_clone.md) |

---

### Enums

Enumeration constants used throughout the workflow system for type safety and consistency.

| Enum Category | Description | Documentation |
|---------------|-------------|---------------|
| **[All Enums](enums/Enums.md)** | Complete enumeration reference | [View →](enums/Enums.md) |

**Available Enums:**
- `step_types` - Step type categorization
- `logic_step_types` - Logic step types
- `step_statuses` - Step execution statuses
- `conditional_step_comparators` - Comparison operators
- `delay_types` - Delay types (relative/absolute)
- `loop_types` - Loop types (while/for-each)
- `step_event_names` - Step lifecycle events
- `workflow_event_names` - Workflow lifecycle events
- `sub_step_types` - Dynamic step class mappings

---

## Examples

### Example 1: Simple Sequential Workflow

```javascript
import { Workflow, Step, step_types } from './classes';

const workflow = new Workflow([
  new Step({
    name: 'Initialize',
    type: step_types.ACTION,
    callable: async (context) => {
      context.initialized = true;
      return 'initialized';
    }
  }),
  new Step({
    name: 'Process',
    type: step_types.ACTION,
    callable: async (context) => {
      return 'processed';
    }
  }),
  new Step({
    name: 'Finalize',
    type: step_types.ACTION,
    callable: async (context) => {
      return 'complete';
    }
  })
]);

await workflow.execute();
```

### Example 2: Conditional Workflow

```javascript
import { Workflow, Step, step_types, ConditionalStep } from './classes';

const workflow = new Workflow([
  new Step({
    name: 'Get User',
    type: step_types.ACTION,
    callable: async (context) => {
      context.user = await getUser(context.userId);
    }
  }),
  new ConditionalStep({
    name: 'Check Premium',
    subject: (context) => context.user.isPremium,
    operator: '===',
    value: true,
    step_left: new Step({
      name: 'Premium Features',
      type: step_types.ACTION,
      callable: async (context) => {
        return await enablePremiumFeatures(context.user);
      }
    }),
    step_right: new Step({
      name: 'Standard Features',
      type: step_types.ACTION,
      callable: async (context) => {
        return await enableStandardFeatures(context.user);
      }
    })
  })
]);

await workflow.execute({ userId: 123 });
```

### Example 3: Loop Processing

```javascript
import { LoopStep, Workflow, Step, step_types, loop_types } from './classes';

const itemProcessor = new Workflow([
  new Step({
    name: 'Process Item',
    type: step_types.ACTION,
    callable: async (context) => {
      const item = context.queue.shift();
      await processItem(item);
    }
  })
]);

const workflow = new Workflow([
  new LoopStep({
    name: 'Process All Items',
    sub_workflow: itemProcessor,
    subject: (context) => context.queue.length,
    operator: '>',
    value: 0,
    loop_type: loop_types.WHILE,
    max_iterations: 100
  })
]);

await workflow.execute({ queue: [1, 2, 3, 4, 5] });
```

### Example 4: Error Handling

```javascript
import { Workflow, Step, step_types } from './classes';

const workflow = new Workflow([], 'Error Handling Example');

workflow.events.on(workflow.events.event_names.WORKFLOW_ERRORED, (data) => {
  console.error('Workflow error:', data.error);
  // Handle error, send notification, etc.
});

workflow.pushStep(new Step({
  name: 'Risky Operation',
  type: step_types.ACTION,
  callable: async (context) => {
    try {
      return await riskyOperation();
    } catch (error) {
      // Handle or rethrow
      throw new Error(`Operation failed: ${error.message}`);
    }
  }
}));

try {
  await workflow.execute();
} catch (error) {
  console.error('Caught error:', error);
}
```

### Example 5: Nested Workflows

```javascript
import { Workflow, Step, step_types } from './classes';

// Reusable sub-workflow
const validationWorkflow = new Workflow([
  new Step({
    name: 'Validate Email',
    type: step_types.ACTION,
    callable: async (context) => validateEmail(context.email)
  }),
  new Step({
    name: 'Validate Age',
    type: step_types.ACTION,
    callable: async (context) => validateAge(context.age)
  })
], 'Validation');

// Main workflow - pass workflow as callable to Step
const mainWorkflow = new Workflow([
  new Step({
    name: 'Fetch User Data',
    type: step_types.ACTION,
    callable: async (context) => {
      const user = await fetchUser(context.userId);
      Object.assign(context, user);
    }
  }),
  new Step({
    name: 'Validate User',
    type: step_types.ACTION,
    callable: validationWorkflow
  }),
  new Step({
    name: 'Save User',
    type: step_types.ACTION,
    callable: async (context) => await saveUser(context)
  })
]);

await mainWorkflow.execute({ userId: 123 });
```

---

## Best Practices

### 1. Step Design

✅ **DO:**
- Keep steps focused on a single responsibility
- Use descriptive names that explain what the step does
- Make steps reusable where possible
- Handle errors within steps when appropriate

❌ **DON'T:**
- Create steps that do too many things
- Use generic names like "Step 1", "Step 2"
- Mix concerns (I/O, validation, transformation) in one step
- Ignore error handling

### 2. Context Management

✅ **DO:**
- Document what context properties your workflows expect
- Use context to pass data between steps
- Initialize required context properties before workflow execution
- Clean up sensitive data from context when done

❌ **DON'T:**
- Assume context properties exist without checking
- Mutate context in unexpected ways
- Store large objects unnecessarily
- Leave sensitive data in context

### 3. Error Handling

✅ **DO:**
- Use try/catch within steps for expected errors
- Set `exit_on_failure` appropriately
- Listen to error events for monitoring
- Provide meaningful error messages
- Implement retry logic where appropriate

❌ **DON'T:**
- Swallow errors silently
- Let workflows fail without cleanup
- Use error handling for control flow
- Ignore error events

### 4. Workflow Composition

✅ **DO:**
- Break complex workflows into reusable sub-workflows
- Pass workflows as callables to Step for modular design
- Document workflow dependencies
- Keep workflow hierarchy reasonable (3-4 levels max)

❌ **DON'T:**
- Create monolithic workflows
- Nest workflows too deeply
- Duplicate workflow logic
- Create circular dependencies

### 5. Performance

✅ **DO:**
- Use appropriate batch sizes for loops
- Set reasonable `max_iterations` for loops
- Optimize step execution where possible
- Consider parallelization for independent operations

❌ **DON'T:**
- Process large datasets without batching
- Create infinite loops
- Perform blocking operations in steps
- Ignore performance monitoring

### 6. Testing

✅ **DO:**
- Test workflows with various inputs
- Test error scenarios
- Mock external dependencies
- Test individual steps in isolation
- Test workflow event emissions

❌ **DON'T:**
- Only test happy paths
- Test workflows with production data
- Skip edge case testing
- Ignore event testing

### 7. Monitoring

✅ **DO:**
- Listen to workflow and step events
- Log important lifecycle events
- Track workflow execution times
- Monitor failure rates
- Use event data for debugging

❌ **DON'T:**
- Run workflows without monitoring
- Ignore event data
- Over-log (log everything)
- Forget to clean up event listeners

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                         Workflow                            │
│  ┌────────────┐  ┌────────────┐  ┌────────────┐           │
│  │   Step 1   │─→│   Step 2   │─→│   Step 3   │           │
│  └────────────┘  └────────────┘  └────────────┘           │
│                                                              │
│  State Management │ Event Emission │ Error Handling        │
└─────────────────────────────────────────────────────────────┘
                           │
                           ├─→ Step (execute functions/workflows)
                           ├─→ DelayStep (timing)
                           ├─→ ConditionalStep (branching)
                           ├─→ LoopStep (iteration)
                           ├─→ SwitchStep (multi-branch)
                           └─→ FlowControlStep (break/continue)
```

---

## Contributing

When extending this library:

1. Extend appropriate base classes (`Step`, `LogicStep`, `Event`)
2. Follow JSDoc documentation standards
3. Emit appropriate lifecycle events
4. Include comprehensive examples
5. Write tests for new functionality

---

## Support

For issues, questions, or contributions, please refer to the individual class documentation or check the source code in `src/classes/`.

---

**Last Updated:** November 13, 2025  
**Version:** 1.0.0
