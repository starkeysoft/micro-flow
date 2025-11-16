# loop_types Enum

Defines the two loop iteration strategies available in LoopStep.

## Values

| Constant | Value | Description |
|----------|-------|-------------|
| `WHILE` | `'while'` | Condition-based looping (while condition is true) |
| `FOR_EACH` | `'for_each'` | Iteration over collection elements |

## Import

```javascript
import { LoopTypes } from 'micro-flow';
// or
import LoopTypes from 'micro-flow/enums/loop_types';
```

## Usage

### WHILE Loops

Execute steps repeatedly while a condition remains true.

```javascript
import { LoopStep, LoopTypes } from 'micro-flow';

const whileLoop = new LoopStep({
  name: 'Process Until Complete',
  loop_type: LoopTypes.WHILE,
  callable: async function() {
    // Return true to continue, false to stop
    return this.workflow.itemsRemaining > 0;
  },
  loop_steps: [
    new Step({
      name: 'Process Item',
      type: StepTypes.ACTION,
      callable: async function() {
        this.workflow.itemsRemaining--;
        return { processed: true };
      }
    })
  ]
});

workflow.state.set('itemsRemaining', 10);
await whileLoop.execute();
```

### FOR_EACH Loops

Iterate over each element in a collection.

```javascript
import { LoopStep, LoopTypes } from 'micro-flow';

const forEachLoop = new LoopStep({
  name: 'Process Each User',
  loop_type: LoopTypes.FOR_EACH,
  callable: async function() {
    return this.workflow.users; // Return array to iterate
  },
  loop_steps: [
    new Step({
      name: 'Send Email',
      type: StepTypes.ACTION,
      callable: async (user) => {
        await sendEmail(user.email, 'Welcome!');
        return { sent: true, user: user.email };
      }
    })
  ]
});

workflow.state.set('users', [
  { email: 'user1@example.com' },
  { email: 'user2@example.com' },
  { email: 'user3@example.com' }
]);

await forEachLoop.execute();
```

## Comparison

| Feature | WHILE | FOR_EACH |
|---------|-------|----------|
| **Condition** | Evaluates subject/operator/value | Iterates over array |
| **Iteration** | Repeats while condition is true | Once per array element |
| **Loop Data** | Access via workflow state | Access iteration via workflow state |
| **Max Iterations** | Controlled by `max_iterations` | Array length (or `max_iterations`) |
| **Use Case** | Unknown iteration count | Known collection to process |

## Examples

### WHILE: Polling Until Ready

```javascript
const pollLoop = new LoopStep({
  name: 'Poll API Until Ready',
  loop_type: LoopTypes.WHILE,
  max_iterations: 30, // Prevent infinite loop
  callable: async function() {
    const status = await checkStatus();
    return status !== 'ready'; // Continue while not ready
  },
  loop_steps: [
    new DelayStep({
      name: 'Wait',
      delay_type: DelayTypes.RELATIVE,
      delay_value: 2000 // 2 seconds between polls
    })
  ]
});

await pollLoop.execute();
```

### WHILE: Batch Processing

```javascript
const batchLoop = new LoopStep({
  name: 'Process Batches',
  loop_type: LoopTypes.WHILE,
  callable: async function() {
    // Continue while there are items to process
    return this.workflow.queue.length > 0;
  },
  loop_steps: [
    new Step({
      name: 'Process Batch',
      type: StepTypes.ACTION,
      callable: async function() {
        const batch = this.workflow.queue.splice(0, 100);
        await processBatch(batch);
        return { processed: batch.length };
      }
    })
  ]
});

workflow.state.set('queue', largeArrayOfItems);
await batchLoop.execute();
```

### FOR_EACH: Data Transformation

```javascript
const transformLoop = new LoopStep({
  name: 'Transform Records',
  loop_type: LoopTypes.FOR_EACH,
  callable: async function() {
    return this.workflow.records; // Array of records
  },
  loop_steps: [
    new Step({
      name: 'Validate',
      type: StepTypes.ACTION,
      callable: async (record) => {
        if (!record.id) throw new Error('Invalid record');
        return record;
      }
    }),
    new Step({
      name: 'Transform',
      type: StepTypes.ACTION,
      callable: async (record) => {
        return {
          ...record,
          processed: true,
          timestamp: Date.now()
        };
      }
    }),
    new Step({
      name: 'Save',
      type: StepTypes.ACTION,
      callable: async (transformedRecord) => {
        await saveToDatabase(transformedRecord);
        return { saved: true };
      }
    })
  ]
});

await transformLoop.execute();
```

### FOR_EACH: Parallel Processing (Sequential)

```javascript
const apiLoop = new LoopStep({
  name: 'Call Multiple APIs',
  loop_type: LoopTypes.FOR_EACH,
  callable: async function() {
    return [
      { url: '/api/endpoint1', method: 'GET' },
      { url: '/api/endpoint2', method: 'POST', data: {} },
      { url: '/api/endpoint3', method: 'GET' }
    ];
  },
  loop_steps: [
    new Step({
      name: 'API Call',
      type: StepTypes.ACTION,
      callable: async (apiConfig) => {
        const response = await fetch(apiConfig.url, {
          method: apiConfig.method,
          body: apiConfig.data ? JSON.stringify(apiConfig.data) : undefined
        });
        return response.json();
      }
    }),
    new DelayStep({
      name: 'Rate Limit',
      delay_type: DelayTypes.RELATIVE,
      delay_value: 1000 // 1 second between calls
    })
  ]
});

await apiLoop.execute();
```

### WHILE with Break Condition

```javascript
const searchLoop = new LoopStep({
  name: 'Search Until Found',
  loop_type: LoopTypes.WHILE,
  max_iterations: 100,
  callable: async function() {
    return !this.workflow.found; // Continue while not found
  },
  loop_steps: [
    new Step({
      name: 'Search Page',
      type: StepTypes.ACTION,
      callable: async function() {
        const result = await searchPage(this.workflow.currentPage);
        
        if (result.found) {
          this.workflow.found = true;
          this.workflow.should_break = true; // Exit loop immediately
        }
        
        this.workflow.currentPage++;
        return result;
      }
    })
  ]
});

workflow.state.set('found', false);
workflow.state.set('currentPage', 1);
await searchLoop.execute();
```

### FOR_EACH with Skip

```javascript
const selectiveLoop = new LoopStep({
  name: 'Process Valid Items Only',
  loop_type: LoopTypes.FOR_EACH,
  callable: async function() {
    return this.workflow.items;
  },
  loop_steps: [
    new SkipStep({
      name: 'Skip Invalid',
      callable: async function(item) {
        return !item.valid; // Skip if not valid
      }
    }),
    new Step({
      name: 'Process Valid Item',
      type: StepTypes.ACTION,
      callable: async (item) => {
        return await processValidItem(item);
      }
    })
  ]
});

workflow.state.set('items', [
  { id: 1, valid: true },
  { id: 2, valid: false }, // Will be skipped
  { id: 3, valid: true }
]);

await selectiveLoop.execute();
```

### Nested Loops

```javascript
const outerLoop = new LoopStep({
  name: 'Process Categories',
  loop_type: LoopTypes.FOR_EACH,
  callable: async function() {
    return this.workflow.categories;
  },
  loop_steps: [
    new LoopStep({
      name: 'Process Items in Category',
      loop_type: LoopTypes.FOR_EACH,
      callable: async function(category) {
        return category.items; // Nested array
      },
      loop_steps: [
        new Step({
          name: 'Process Item',
          type: StepTypes.ACTION,
          callable: async (item) => {
            console.log('Processing:', item);
            return { processed: item };
          }
        })
      ]
    })
  ]
});

workflow.state.set('categories', [
  { name: 'Category 1', items: ['item1', 'item2'] },
  { name: 'Category 2', items: ['item3', 'item4', 'item5'] }
]);

await outerLoop.execute();
```

## Max Iterations

Both loop types support `max_iterations` to prevent infinite loops:

```javascript
const safeLoop = new LoopStep({
  name: 'Safe Loop',
  loop_type: LoopTypes.WHILE,
  max_iterations: 1000, // Safety limit
  callable: async function() {
    return this.workflow.shouldContinue;
  },
  loop_steps: [/* ... */]
});
```

## Flow Control in Loops

### Break
```javascript
// In a loop step
this.workflow.should_break = true; // Exit loop immediately
```

### Continue
```javascript
// In a loop step
this.workflow.should_continue = true; // Skip to next iteration
```

## See Also

- [LoopStep Class](../classes/loop-step.md)
- [flow_control_types Enum](./flow-control-types.md)
- [Core Concepts - Steps](../../core-concepts/steps.md)
- [Step Types - Loop Step](../step-types/loop-step.md)
