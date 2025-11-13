# LoopStep

**Represents a loop step that repeatedly executes a sub-workflow while a condition is met.**

## Overview

The `LoopStep` class provides iteration capabilities within workflows. It supports both while loops (condition-based) and for-each loops (iterable-based), repeatedly executing a sub-workflow until the loop condition is no longer met or all items are processed.

## Class Definition

```javascript
class LoopStep extends LogicStep
```

**Extends:** [LogicStep](LogicStep.md)  
**Location:** `src/classes/loop_step.js`

## Properties

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `step_name` | `string` (static) | `'loop'` | Static identifier for the step type |
| `sub_workflow` | `Workflow` | - | The sub-workflow to execute each iteration |
| `loop_type` | `string` | `loop_types.WHILE` | Type of loop (WHILE or FOR_EACH) |
| `iterable` | `Array` | - | The iterable to loop over (for FOR_EACH) |
| `max_iterations` | `number` | `20` | Maximum loop iterations (infinite loop protection) |

*Inherits all properties from [LogicStep](LogicStep.md)*

## Constructor

### `constructor(options)`

Creates a new LoopStep instance.

**Parameters:**

- `options` (Object) *[optional]* - Configuration options for the loop step
  - `sub_workflow` (Workflow) - The sub-workflow to execute for this step (required)
  - `subject` (*) - The value to compare against (for while loops)
  - `operator` (string) - The comparison operator to use (e.g., '===', '==', '!=', '>', '<', '>=', '<=')
  - `value` (*) - The value to compare the subject with (for while loops)
  - `iterable` (Array) *[optional]* - The iterable to loop over (for 'for_each' loop type)
  - `loop_type` (string) *[optional]* - The type of loop to execute (from loop_types enum) (default: `'while'`)
  - `name` (string) *[optional]* - The name of the loop step (default: `'Loop Step'`)
  - `max_iterations` (number) *[optional]* - Maximum number of loop iterations to prevent infinite loops (default: `20`)

**Throws:** `Error` - If sub_workflow is not provided or is not an instance of Workflow

**Example:**

```javascript
import { LoopStep, Workflow, ActionStep, loop_types } from './classes';

// While loop
const whileLoop = new LoopStep({
  name: 'Process Until Done',
  sub_workflow: processingWorkflow,
  subject: (context) => context.itemsRemaining,
  operator: '>',
  value: 0,
  loop_type: loop_types.WHILE,
  max_iterations: 100
});

// For-each loop
const forEachLoop = new LoopStep({
  name: 'Process Each Item',
  sub_workflow: itemProcessingWorkflow,
  iterable: items,
  loop_type: loop_types.FOR_EACH
});
```

## Methods

### `runSubWorkflow()`

Executes the sub-workflow associated with this loop step.

**Returns:** `Promise<*>` - The result of the sub-workflow execution

**Async:** Yes

---

### `whileLoopStep()`

Executes a while loop that repeatedly runs the sub-workflow while the condition is met. Includes protection against infinite loops via max_iterations.

**Returns:** `Promise<void>`

**Throws:** `Error` - Throws an error if the loop configuration is invalid

**Async:** Yes

---

### `forEachLoopStep()`

Executes a for-each loop that runs the sub-workflow once for each item in the iterable. Includes protection against infinite loops via max_iterations.

**Returns:** `Promise<void>`

**Throws:** `Error` - Throws an error if the iterable configuration is invalid

**Async:** Yes

*Inherits all methods from [LogicStep](LogicStep.md) and [Step](../base-classes/Step.md)*

## Usage Examples

### While Loop - Basic

```javascript
import { LoopStep, Workflow, ActionStep, loop_types } from './classes';

const subWorkflow = new Workflow([
  new ActionStep({
    name: 'Process Item',
    callable: async (context) => {
      const item = context.queue.shift();
      await processItem(item);
      context.processedCount++;
      return item;
    }
  })
], 'Item Processor');

const loop = new LoopStep({
  name: 'Process Queue',
  sub_workflow: subWorkflow,
  subject: (context) => context.queue.length,
  operator: '>',
  value: 0,
  loop_type: loop_types.WHILE,
  max_iterations: 50
});

const workflow = new Workflow([loop]);
await workflow.execute({ 
  queue: [1, 2, 3, 4, 5],
  processedCount: 0
});
```

### For-Each Loop - Processing Array

```javascript
import { LoopStep, Workflow, ActionStep, loop_types } from './classes';

const itemWorkflow = new Workflow([
  new ActionStep({
    name: 'Validate',
    callable: async (context) => {
      return validateItem(context.currentItem);
    }
  }),
  new ActionStep({
    name: 'Transform',
    callable: async (context) => {
      return transformItem(context.currentItem);
    }
  }),
  new ActionStep({
    name: 'Save',
    callable: async (context) => {
      return await saveItem(context.currentItem);
    }
  })
], 'Item Processing');

const forEachLoop = new LoopStep({
  name: 'Process All Items',
  sub_workflow: itemWorkflow,
  iterable: items,
  loop_type: loop_types.FOR_EACH
});

await forEachLoop.execute();
```

### Retry Loop

```javascript
import { LoopStep, Workflow, ActionStep, loop_types } from './classes';

const retryWorkflow = new Workflow([
  new ActionStep({
    name: 'Attempt Operation',
    callable: async (context) => {
      try {
        const result = await riskyOperation();
        context.success = true;
        context.result = result;
        return result;
      } catch (error) {
        context.attempts++;
        context.lastError = error;
        if (context.attempts >= context.maxAttempts) {
          throw error;
        }
        return null;
      }
    }
  })
], 'Retry Logic');

const retryLoop = new LoopStep({
  name: 'Retry Until Success',
  sub_workflow: retryWorkflow,
  subject: (context) => context.success,
  operator: '===',
  value: false,
  loop_type: loop_types.WHILE,
  max_iterations: 5
});

const workflow = new Workflow([retryLoop]);
await workflow.execute({ 
  success: false,
  attempts: 0,
  maxAttempts: 5
});
```

### Batch Processing

```javascript
import { LoopStep, Workflow, ActionStep, loop_types } from './classes';

const batchWorkflow = new Workflow([
  new ActionStep({
    name: 'Get Batch',
    callable: async (context) => {
      context.currentBatch = context.data.splice(0, context.batchSize);
      return context.currentBatch;
    }
  }),
  new ActionStep({
    name: 'Process Batch',
    callable: async (context) => {
      return await processBatch(context.currentBatch);
    }
  }),
  new ActionStep({
    name: 'Update Progress',
    callable: async (context) => {
      context.processed += context.currentBatch.length;
      console.log(`Processed ${context.processed} items`);
      return context.processed;
    }
  })
], 'Batch Processor');

const batchLoop = new LoopStep({
  name: 'Process All Batches',
  sub_workflow: batchWorkflow,
  subject: (context) => context.data.length,
  operator: '>',
  value: 0,
  loop_type: loop_types.WHILE
});

await batchLoop.execute({
  data: largeDataset,
  batchSize: 100,
  processed: 0
});
```

### Pagination Loop

```javascript
import { LoopStep, Workflow, ActionStep, loop_types } from './classes';

const pageWorkflow = new Workflow([
  new ActionStep({
    name: 'Fetch Page',
    callable: async (context) => {
      const response = await api.fetchPage(context.page);
      context.items.push(...response.items);
      context.hasMore = response.hasMore;
      context.page++;
      return response;
    }
  })
], 'Page Fetcher');

const paginationLoop = new LoopStep({
  name: 'Fetch All Pages',
  sub_workflow: pageWorkflow,
  subject: (context) => context.hasMore,
  operator: '===',
  value: true,
  loop_type: loop_types.WHILE,
  max_iterations: 100
});

await paginationLoop.execute({
  items: [],
  page: 1,
  hasMore: true
});
```

### Conditional Processing in Loop

```javascript
import { 
  LoopStep, 
  Workflow, 
  ActionStep, 
  ConditionalStep,
  loop_types 
} from './classes';

const processWorkflow = new Workflow([
  new ActionStep({
    name: 'Get Next Item',
    callable: async (context) => {
      context.currentItem = context.items[context.index];
      context.index++;
      return context.currentItem;
    }
  }),
  new ConditionalStep({
    name: 'Check Item Type',
    subject: (context) => context.currentItem.type,
    operator: '===',
    value: 'premium',
    step_left: new ActionStep({
      name: 'Premium Processing',
      callable: async (context) => {
        return await processPremium(context.currentItem);
      }
    }),
    step_right: new ActionStep({
      name: 'Standard Processing',
      callable: async (context) => {
        return await processStandard(context.currentItem);
      }
    })
  })
], 'Conditional Item Processor');

const loop = new LoopStep({
  name: 'Process All Items',
  sub_workflow: processWorkflow,
  subject: (context) => context.index,
  operator: '<',
  value: (context) => context.items.length,
  loop_type: loop_types.WHILE
});

await loop.execute({ items: allItems, index: 0 });
```

## Loop Types

### WHILE Loop
Repeatedly executes the sub-workflow while a condition remains true.

**Configuration:**
- Requires: `subject`, `operator`, `value`
- Optional: `max_iterations`

**Use Cases:**
- Processing until queue is empty
- Retrying until success
- Polling until condition met
- Processing paginated data

### FOR_EACH Loop
Executes the sub-workflow once for each item in an iterable.

**Configuration:**
- Requires: `iterable`
- Optional: None

**Use Cases:**
- Processing arrays of items
- Batch operations
- Data transformations
- Validation of collections

## Infinite Loop Protection

The `max_iterations` parameter prevents infinite loops:

```javascript
const loop = new LoopStep({
  sub_workflow: myWorkflow,
  subject: true, // Always true!
  operator: '===',
  value: true,
  max_iterations: 10 // Will stop after 10 iterations
});
```

When `max_iterations` is reached:
- Loop execution stops
- A log message is emitted
- Workflow continues to next step
- No error is thrown

## Best Practices

1. **Set max_iterations**: Always set an appropriate max to prevent infinite loops
2. **Modify Loop Variables**: Ensure loop conditions can actually change
3. **Context Management**: Use context to track loop state
4. **Performance**: Consider batch size for large datasets
5. **Error Handling**: Handle errors within sub-workflow appropriately
6. **Logging**: Log loop progress for long-running operations
7. **Break Conditions**: Design clear exit conditions

## Common Pitfalls

### Infinite Loop
```javascript
// BAD: Condition never changes
const badLoop = new LoopStep({
  sub_workflow: workflow,
  subject: true,
  operator: '===',
  value: true,
  max_iterations: 1000 // Will hit max every time
});

// GOOD: Condition can change
const goodLoop = new LoopStep({
  sub_workflow: workflow,
  subject: (context) => context.keepGoing,
  operator: '===',
  value: true
});
```

### Context Mutation
```javascript
// Ensure sub-workflow can modify context
const workflow = new Workflow([
  new ActionStep({
    callable: async (context) => {
      context.counter--;  // Modify loop variable
      return context.counter;
    }
  })
]);
```

## Related Classes

- [LogicStep](LogicStep.md) - Base logic evaluation
- [FlowControlStep](FlowControlStep.md) - Break/continue in loops
- [ConditionalStep](ConditionalStep.md) - Conditional branching
- [Workflow](../base-classes/Workflow.md) - Sub-workflow execution
