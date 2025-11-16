# FlowControlStep Class

The `FlowControlStep` class provides loop control mechanisms similar to `break` and `continue` statements in traditional programming.

## Constructor

```javascript
new FlowControlStep(options)
```

### Parameters

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `options.subject` | `any` | Yes | - | Value to compare |
| `options.operator` | `string` | Yes | - | Comparison operator |
| `options.value` | `any` | Yes | - | Value to compare against |
| `options.flow_control_type` | `string` | No | `FlowControlTypes.BREAK` | Type of flow control (BREAK or CONTINUE) |
| `options.name` | `string` | No | `''` | Name for the flow control step |

### Example

```javascript
import { FlowControlStep, FlowControlTypes } from 'micro-flow';

// Break from loop when condition is met
const breakStep = new FlowControlStep({
  name: 'Break on Error',
  subject: () => hasError,
  operator: '===',
  value: true,
  flow_control_type: FlowControlTypes.BREAK
});

// Continue (skip) when condition is met
const continueStep = new FlowControlStep({
  name: 'Skip Invalid Items',
  subject: () => item.valid,
  operator: '===',
  value: false,
  flow_control_type: FlowControlTypes.CONTINUE
});
```

## Properties

### Static Properties

- **`step_name`**: `'flow_control'` - Identifier for flow control steps

### State Properties

In addition to LogicStep state properties:

| Property | Type | Description |
|----------|------|-------------|
| `flow_control_type` | `string` | Type of flow control (BREAK or CONTINUE) |
| `should_break` | `boolean` | Flag indicating loop should break |
| `should_continue` | `boolean` | Flag indicating loop should continue |

## Methods

### `shouldBreakFlow()`

Evaluates condition and sets `should_break` flag if condition is true.

```javascript
async shouldBreakFlow(): Promise<boolean>
```

**Returns:**
- `Promise<boolean>` - True if loop should break

### `shouldContinueFlow()`

Evaluates condition and sets `should_continue` flag if condition is false (skip when condition not met).

```javascript
async shouldContinueFlow(): Promise<boolean>
```

**Returns:**
- `Promise<boolean>` - False if loop should continue to next iteration

## Usage Examples

### Break on Error

```javascript
const processWorkflow = new Workflow({ name: 'Process Items' });
processWorkflow.pushSteps([
  new Step({
    name: 'Process Item',
    type: StepTypes.ACTION,
    callable: async function(item) {
      try {
        return await processItem(item);
      } catch (error) {
        this.workflow.hasError = true;
        this.workflow.lastError = error;
        return { error };
      }
    }
  }),
  new FlowControlStep({
    name: 'Break on Error',
    subject: () => workflow.state.get('hasError'),
    operator: '===',
    value: true,
    flow_control_type: FlowControlTypes.BREAK
  })
]);

const loop = new LoopStep({
  name: 'Process All Items',
  loop_type: LoopTypes.FOR_EACH,
  iterable: items,
  callable: processWorkflow
});

await loop.execute();
```

### Continue on Invalid Items

```javascript
const validationWorkflow = new Workflow({ name: 'Validate and Process' });
validationWorkflow.pushSteps([
  new Step({
    name: 'Validate',
    type: StepTypes.ACTION,
    callable: async function(item) {
      this.workflow.isValid = item && item.id && item.name;
      return item;
    }
  }),
  new FlowControlStep({
    name: 'Skip Invalid',
    subject: () => workflow.state.get('isValid'),
    operator: '===',
    value: false,
    flow_control_type: FlowControlTypes.CONTINUE
  }),
  new Step({
    name: 'Process Valid Item',
    type: StepTypes.ACTION,
    callable: async (item) => processValidItem(item)
  })
]);

const loop = new LoopStep({
  name: 'Process Valid Items',
  loop_type: LoopTypes.FOR_EACH,
  iterable: items,
  callable: validationWorkflow
});

await loop.execute();
```

### Break on Target Found

```javascript
const searchWorkflow = new Workflow({ name: 'Search' });
searchWorkflow.pushSteps([
  new Step({
    name: 'Check Item',
    type: StepTypes.ACTION,
    callable: async function(item) {
      if (item.id === this.workflow.targetId) {
        this.workflow.found = item;
      }
      return item;
    }
  }),
  new FlowControlStep({
    name: 'Break When Found',
    subject: () => workflow.state.get('found'),
    operator: '!==',
    value: undefined,
    flow_control_type: FlowControlTypes.BREAK
  })
]);

const searchLoop = new LoopStep({
  name: 'Search Items',
  loop_type: LoopTypes.FOR_EACH,
  iterable: items,
  callable: searchWorkflow
});

workflow.state.set('targetId', 'item-123');
await searchLoop.execute();
console.log('Found:', workflow.state.get('found'));
```

### Continue on Rate Limit

```javascript
const apiWorkflow = new Workflow({ name: 'API Call' });
apiWorkflow.pushSteps([
  new Step({
    name: 'Call API',
    type: StepTypes.ACTION,
    callable: async function(endpoint) {
      try {
        const response = await fetch(endpoint);
        
        if (response.status === 429) { // Rate limited
          this.workflow.rateLimited = true;
          return { skipped: true };
        }
        
        this.workflow.rateLimited = false;
        return await response.json();
      } catch (error) {
        this.workflow.rateLimited = false;
        throw error;
      }
    }
  }),
  new FlowControlStep({
    name: 'Skip if Rate Limited',
    subject: () => workflow.state.get('rateLimited'),
    operator: '===',
    value: true,
    flow_control_type: FlowControlTypes.CONTINUE
  }),
  new Step({
    name: 'Process Response',
    type: StepTypes.ACTION,
    callable: async (data) => processResponse(data)
  })
]);

const apiLoop = new LoopStep({
  name: 'Call All APIs',
  loop_type: LoopTypes.FOR_EACH,
  iterable: endpoints,
  callable: apiWorkflow
});

await apiLoop.execute();
```

### Break on Threshold

```javascript
const accumulateWorkflow = new Workflow({ name: 'Accumulate' });
accumulateWorkflow.pushSteps([
  new Step({
    name: 'Add Value',
    type: StepTypes.ACTION,
    callable: async function(value) {
      if (!this.workflow.total) {
        this.workflow.total = 0;
      }
      this.workflow.total += value;
      return this.workflow.total;
    }
  }),
  new FlowControlStep({
    name: 'Break at Threshold',
    subject: () => workflow.state.get('total'),
    operator: '>=',
    value: 1000,
    flow_control_type: FlowControlTypes.BREAK
  })
]);

const loop = new LoopStep({
  name: 'Accumulate Values',
  loop_type: LoopTypes.FOR_EACH,
  iterable: values,
  callable: accumulateWorkflow
});

await loop.execute();
console.log('Total:', workflow.state.get('total'));
```

### Continue on Already Processed

```javascript
const processWorkflow = new Workflow({ name: 'Process' });

// Initialize processed set
workflow.state.set('processedIds', new Set());

processWorkflow.pushSteps([
  new Step({
    name: 'Check if Processed',
    type: StepTypes.ACTION,
    callable: async function(item) {
      this.workflow.alreadyProcessed = this.workflow.processedIds.has(item.id);
      return item;
    }
  }),
  new FlowControlStep({
    name: 'Skip Already Processed',
    subject: () => workflow.state.get('alreadyProcessed'),
    operator: '===',
    value: true,
    flow_control_type: FlowControlTypes.CONTINUE
  }),
  new Step({
    name: 'Process Item',
    type: StepTypes.ACTION,
    callable: async function(item) {
      const result = await processItem(item);
      this.workflow.processedIds.add(item.id);
      return result;
    }
  })
]);

const loop = new LoopStep({
  name: 'Process Unique Items',
  loop_type: LoopTypes.FOR_EACH,
  iterable: items,
  callable: processWorkflow
});

await loop.execute();
```

### Break on Timeout

```javascript
const timeoutWorkflow = new Workflow({ name: 'Timeout Check' });

// Set start time
workflow.state.set('startTime', Date.now());

timeoutWorkflow.pushSteps([
  new Step({
    name: 'Update Elapsed',
    type: StepTypes.ACTION,
    callable: async function() {
      this.workflow.elapsed = Date.now() - this.workflow.startTime;
      return this.workflow.elapsed;
    }
  }),
  new FlowControlStep({
    name: 'Break on Timeout',
    subject: () => workflow.state.get('elapsed'),
    operator: '>',
    value: 30000, // 30 seconds
    flow_control_type: FlowControlTypes.BREAK
  }),
  new Step({
    name: 'Do Work',
    type: StepTypes.ACTION,
    callable: async () => performWork()
  }),
  new DelayStep({
    name: 'Wait',
    delay_type: DelayTypes.RELATIVE,
    delay_duration: 1000
  })
]);

const loop = new LoopStep({
  name: 'Work with Timeout',
  loop_type: LoopTypes.WHILE,
  subject: () => true,
  operator: '===',
  value: true,
  callable: timeoutWorkflow,
  max_iterations: 100
});

await loop.execute();
```

### Multiple Flow Controls

```javascript
const multiControlWorkflow = new Workflow({ name: 'Multi Control' });
multiControlWorkflow.pushSteps([
  // Skip empty items
  new FlowControlStep({
    name: 'Skip Empty',
    subject: () => !item || item.length === 0,
    operator: '===',
    value: true,
    flow_control_type: FlowControlTypes.CONTINUE
  }),
  
  new Step({
    name: 'Process Item',
    type: StepTypes.ACTION,
    callable: async function(item) {
      try {
        return await processItem(item);
      } catch (error) {
        this.workflow.criticalError = error.critical;
        throw error;
      }
    }
  }),
  
  // Break on critical error
  new FlowControlStep({
    name: 'Break on Critical',
    subject: () => workflow.state.get('criticalError'),
    operator: '===',
    value: true,
    flow_control_type: FlowControlTypes.BREAK
  })
]);

const loop = new LoopStep({
  name: 'Process with Controls',
  loop_type: LoopTypes.FOR_EACH,
  iterable: items,
  callable: multiControlWorkflow
});

await loop.execute();
```

### Conditional Continue

```javascript
const conditionalWorkflow = new Workflow({ name: 'Conditional' });
conditionalWorkflow.pushSteps([
  new Step({
    name: 'Categorize',
    type: StepTypes.ACTION,
    callable: async function(item) {
      this.workflow.shouldSkip = 
        item.status === 'draft' || 
        item.archived === true ||
        item.deleted === true;
      return item;
    }
  }),
  new FlowControlStep({
    name: 'Skip Inactive',
    subject: () => workflow.state.get('shouldSkip'),
    operator: '===',
    value: true,
    flow_control_type: FlowControlTypes.CONTINUE
  }),
  new Step({
    name: 'Process Active Item',
    type: StepTypes.ACTION,
    callable: async (item) => processActiveItem(item)
  })
]);

const loop = new LoopStep({
  name: 'Process Active Items',
  loop_type: LoopTypes.FOR_EACH,
  iterable: items,
  callable: conditionalWorkflow
});

await loop.execute();
```

### Break with Cleanup

```javascript
const cleanupWorkflow = new Workflow({ name: 'With Cleanup' });
cleanupWorkflow.pushSteps([
  new Step({
    name: 'Acquire Resource',
    type: StepTypes.ACTION,
    callable: async () => acquireResource()
  }),
  new Step({
    name: 'Process',
    type: StepTypes.ACTION,
    callable: async function(resource) {
      this.workflow.shouldStop = await shouldStopProcessing();
      return processResource(resource);
    }
  }),
  new Step({
    name: 'Release Resource',
    type: StepTypes.ACTION,
    callable: async (resource) => releaseResource(resource)
  }),
  new FlowControlStep({
    name: 'Break if Done',
    subject: () => workflow.state.get('shouldStop'),
    operator: '===',
    value: true,
    flow_control_type: FlowControlTypes.BREAK
  })
]);

const loop = new LoopStep({
  name: 'Process with Cleanup',
  loop_type: LoopTypes.WHILE,
  subject: () => true,
  operator: '===',
  value: true,
  callable: cleanupWorkflow,
  max_iterations: 100
});

await loop.execute();
```

## BREAK vs CONTINUE

- **BREAK**: Exits the loop entirely when condition is met
- **CONTINUE**: Skips remaining steps in current iteration and moves to next when condition is NOT met

## Flow Control in Nested Loops

Flow control only affects the immediate parent loop:

```javascript
// Inner loop break doesn't affect outer loop
const innerWorkflow = new Workflow({ name: 'Inner' });
innerWorkflow.pushSteps([
  new FlowControlStep({
    name: 'Break Inner',
    flow_control_type: FlowControlTypes.BREAK,
    // This only breaks the inner loop
  })
]);

const innerLoop = new LoopStep({
  callable: innerWorkflow
});

const outerWorkflow = new Workflow({ name: 'Outer' });
outerWorkflow.pushSteps([innerLoop]);

const outerLoop = new LoopStep({
  callable: outerWorkflow
  // Outer loop continues after inner breaks
});
```

## See Also

- [LoopStep Class](./loop-step.md) - Loop execution
- [LogicStep Class](./logic-step.md) - Parent class
- [flow_control_types Enum](../enums/flow-control-types.md) - BREAK and CONTINUE
- [Core Concepts - Steps](../../core-concepts/steps.md)
