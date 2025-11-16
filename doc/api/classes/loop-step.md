# LoopStep Class

The `LoopStep` class enables iteration in workflows with support for both while loops (condition-based) and for-each loops (collection-based).

## Constructor

```javascript
new LoopStep(options)
```

### Parameters

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `options.callable` | `Workflow` | Yes | - | Workflow to execute repeatedly |
| `options.loop_type` | `string` | No | `LoopTypes.WHILE` | Type of loop (WHILE or FOR_EACH) |
| `options.subject` | `any` | Conditional | - | Value to compare (for WHILE loops) |
| `options.operator` | `string` | Conditional | - | Comparison operator (for WHILE loops) |
| `options.value` | `any` | Conditional | - | Value to compare against (for WHILE loops) |
| `options.iterable` | `Array` | Conditional | - | Collection to iterate (for FOR_EACH loops) |
| `options.name` | `string` | No | `'Loop Step'` | Name for the loop step |
| `options.max_iterations` | `number` | No | `20` | Maximum iterations to prevent infinite loops |

### Example

```javascript
import { LoopStep, Step, StepTypes, LoopTypes } from 'micro-flow';

// WHILE loop
const whileLoop = new LoopStep({
  name: 'Process Until Complete',
  loop_type: LoopTypes.WHILE,
  subject: itemsRemaining,
  operator: '>',
  value: 0,
  callable: loopWorkflow,
  max_iterations: 100
});

// FOR_EACH loop
const forEachLoop = new LoopStep({
  name: 'Process Each Item',
  loop_type: LoopTypes.FOR_EACH,
  iterable: items,
  callable: itemWorkflow
});
```

## Properties

### Static Properties

- **`step_name`**: `logic_step_types.LOOP` - Identifier for loop steps

### State Properties

In addition to LogicStep state properties:

| Property | Type | Description |
|----------|------|-------------|
| `loop_type` | `string` | Loop type (WHILE or FOR_EACH) |
| `iterable` | `Array` | Collection for FOR_EACH loops |
| `max_iterations` | `number` | Maximum iteration limit |
| `should_break` | `boolean` | Flag to break from loop |

## Methods

### `runCallable()`

Executes the sub-workflow and resets its state for the next iteration.

```javascript
async runCallable(): Promise<Workflow>
```

**Returns:**
- `Promise<Workflow>` - The executed workflow instance

### `whileLoopStep()`

Executes a while loop that repeatedly runs the sub-workflow while the condition is met.

```javascript
async whileLoopStep(): Promise<Workflow>
```

**Returns:**
- `Promise<Workflow>` - The workflow instance from the last execution

**Throws:**
- `Error` if loop configuration is invalid

### `forEachLoopStep()`

Executes a for-each loop that iterates over collection elements.

```javascript
async forEachLoopStep(): Promise<Workflow>
```

**Returns:**
- `Promise<Workflow>` - The workflow instance from the last execution

## Usage Examples

### WHILE Loop - Basic

```javascript
const loopWorkflow = new Workflow({ name: 'Loop Body' });
loopWorkflow.pushSteps([
  new Step({
    name: 'Process Item',
    type: StepTypes.ACTION,
    callable: async function() {
      this.workflow.itemsRemaining--;
      return { processed: true };
    }
  })
]);

const whileLoop = new LoopStep({
  name: 'Process All Items',
  loop_type: LoopTypes.WHILE,
  subject: () => workflow.state.get('itemsRemaining'),
  operator: '>',
  value: 0,
  callable: loopWorkflow,
  max_iterations: 50
});

workflow.state.set('itemsRemaining', 10);
await whileLoop.execute();
```

### FOR_EACH Loop - Basic

```javascript
const itemWorkflow = new Workflow({ name: 'Process Item' });
itemWorkflow.pushSteps([
  new Step({
    name: 'Validate',
    type: StepTypes.ACTION,
    callable: async (item) => {
      if (!item.valid) throw new Error('Invalid item');
      return item;
    }
  }),
  new Step({
    name: 'Transform',
    type: StepTypes.ACTION,
    callable: async (item) => ({
      ...item,
      processed: true,
      timestamp: Date.now()
    })
  })
]);

const forEachLoop = new LoopStep({
  name: 'Process All Records',
  loop_type: LoopTypes.FOR_EACH,
  iterable: records,
  callable: itemWorkflow
});

await forEachLoop.execute();
```

### Polling Pattern

```javascript
const pollWorkflow = new Workflow({ name: 'Poll' });
pollWorkflow.pushSteps([
  new Step({
    name: 'Check Status',
    type: StepTypes.ACTION,
    callable: async function() {
      const status = await checkExternalStatus();
      if (status === 'ready') {
        this.workflow.should_break = true;
      }
      return { status, ready: status === 'ready' };
    }
  }),
  new DelayStep({
    name: 'Wait',
    delay_type: DelayTypes.RELATIVE,
    delay_duration: 2000 // 2 seconds
  })
]);

const pollLoop = new LoopStep({
  name: 'Poll Until Ready',
  loop_type: LoopTypes.WHILE,
  subject: () => true, // Always true, break via should_break flag
  operator: '===',
  value: true,
  callable: pollWorkflow,
  max_iterations: 30 // Max 1 minute (30 * 2 seconds)
});

await pollLoop.execute();
```

### Batch Processing

```javascript
const batchWorkflow = new Workflow({ name: 'Process Batch' });
batchWorkflow.pushSteps([
  new Step({
    name: 'Get Batch',
    type: StepTypes.ACTION,
    callable: async function() {
      return this.workflow.queue.splice(0, 100); // Get 100 items
    }
  }),
  new Step({
    name: 'Process Batch',
    type: StepTypes.ACTION,
    callable: async (batch) => {
      return await processBatch(batch);
    }
  })
]);

const batchLoop = new LoopStep({
  name: 'Process All Batches',
  loop_type: LoopTypes.WHILE,
  subject: () => workflow.state.get('queue').length,
  operator: '>',
  value: 0,
  callable: batchWorkflow
});

workflow.state.set('queue', largeDataArray);
await batchLoop.execute();
```

### FOR_EACH with Break

```javascript
const searchWorkflow = new Workflow({ name: 'Search Item' });
searchWorkflow.pushSteps([
  new Step({
    name: 'Check Item',
    type: StepTypes.ACTION,
    callable: async function(item) {
      if (item.id === this.workflow.targetId) {
        this.workflow.foundItem = item;
        this.workflow.should_break = true; // Exit loop
        return { found: true, item };
      }
      return { found: false };
    }
  })
]);

const searchLoop = new LoopStep({
  name: 'Search for Item',
  loop_type: LoopTypes.FOR_EACH,
  iterable: items,
  callable: searchWorkflow
});

workflow.state.set('targetId', 'item-123');
await searchLoop.execute();
console.log('Found:', workflow.state.get('foundItem'));
```

### FOR_EACH with Continue (Skip)

```javascript
const processWorkflow = new Workflow({ name: 'Process Valid Item' });
processWorkflow.pushSteps([
  new FlowControlStep({
    name: 'Skip Invalid',
    flow_control_type: FlowControlTypes.CONTINUE,
    callable: async function(item) {
      return !item.valid; // Continue (skip) if not valid
    }
  }),
  new Step({
    name: 'Process Item',
    type: StepTypes.ACTION,
    callable: async (item) => {
      return await processValidItem(item);
    }
  })
]);

const validationLoop = new LoopStep({
  name: 'Process Valid Items',
  loop_type: LoopTypes.FOR_EACH,
  iterable: items,
  callable: processWorkflow
});

await validationLoop.execute();
```

### Nested Loops

```javascript
const innerWorkflow = new Workflow({ name: 'Inner Loop' });
innerWorkflow.pushSteps([
  new Step({
    name: 'Process Sub-Item',
    type: StepTypes.ACTION,
    callable: async (subItem) => {
      console.log('Processing:', subItem);
      return { processed: subItem };
    }
  })
]);

const innerLoop = new LoopStep({
  name: 'Inner Loop',
  loop_type: LoopTypes.FOR_EACH,
  iterable: (category) => category.items, // Access items from outer loop
  callable: innerWorkflow
});

const outerWorkflow = new Workflow({ name: 'Outer Loop' });
outerWorkflow.pushSteps([innerLoop]);

const outerLoop = new LoopStep({
  name: 'Outer Loop',
  loop_type: LoopTypes.FOR_EACH,
  iterable: categories,
  callable: outerWorkflow
});

await outerLoop.execute();
```

### Dynamic Iteration Count

```javascript
const dynamicWorkflow = new Workflow({ name: 'Dynamic Loop' });
dynamicWorkflow.pushSteps([
  new Step({
    name: 'Check Condition',
    type: StepTypes.ACTION,
    callable: async function() {
      // Dynamic condition based on runtime data
      const shouldContinue = await checkShouldContinue();
      
      if (!shouldContinue) {
        this.workflow.should_break = true;
      }
      
      return { shouldContinue };
    }
  }),
  new Step({
    name: 'Perform Work',
    type: StepTypes.ACTION,
    callable: async () => performWork()
  })
]);

const dynamicLoop = new LoopStep({
  name: 'Dynamic Loop',
  loop_type: LoopTypes.WHILE,
  subject: () => true, // Always true, controlled by should_break
  operator: '===',
  value: true,
  callable: dynamicWorkflow,
  max_iterations: 1000
});

await dynamicLoop.execute();
```

### Rate-Limited API Calls

```javascript
const apiCallWorkflow = new Workflow({ name: 'API Call' });
apiCallWorkflow.pushSteps([
  new Step({
    name: 'Call API',
    type: StepTypes.ACTION,
    callable: async (endpoint) => {
      const response = await fetch(endpoint);
      return response.json();
    }
  }),
  new DelayStep({
    name: 'Rate Limit',
    delay_type: DelayTypes.RELATIVE,
    delay_duration: 1000 // 1 second between calls
  })
]);

const apiLoop = new LoopStep({
  name: 'Call All APIs',
  loop_type: LoopTypes.FOR_EACH,
  iterable: apiEndpoints,
  callable: apiCallWorkflow
});

await apiLoop.execute();
```

### Accumulating Results

```javascript
const accumulateWorkflow = new Workflow({ name: 'Accumulate' });
accumulateWorkflow.pushSteps([
  new Step({
    name: 'Process and Accumulate',
    type: StepTypes.ACTION,
    callable: async function(item) {
      const result = await processItem(item);
      
      // Accumulate results in workflow state
      if (!this.workflow.results) {
        this.workflow.results = [];
      }
      this.workflow.results.push(result);
      
      return result;
    }
  })
]);

const accumulateLoop = new LoopStep({
  name: 'Process and Collect',
  loop_type: LoopTypes.FOR_EACH,
  iterable: items,
  callable: accumulateWorkflow
});

await accumulateLoop.execute();
console.log('All results:', workflow.state.get('results'));
```

## Max Iterations Protection

All loops respect `max_iterations` to prevent infinite loops:

```javascript
const safeLoop = new LoopStep({
  name: 'Safe Loop',
  loop_type: LoopTypes.WHILE,
  subject: () => true, // Would be infinite
  operator: '===',
  value: true,
  callable: loopWorkflow,
  max_iterations: 100 // Safety limit
});
```

## Flow Control

Loops support `should_break` and `should_continue` flags:

```javascript
// Break from loop
this.workflow.should_break = true;

// Continue to next iteration (skip remaining steps)
this.workflow.should_continue = true;
```

## See Also

- [LogicStep Class](./logic-step.md) - Parent class
- [FlowControlStep Class](./flow-control-step.md) - Break/continue operations
- [loop_types Enum](../enums/loop-types.md) - WHILE vs FOR_EACH
- [flow_control_types Enum](../enums/flow-control-types.md)
- [Core Concepts - Steps](../../core-concepts/steps.md)
