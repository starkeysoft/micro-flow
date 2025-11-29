# flow_control_types Enum

Defines flow control operations that can be used within loops to alter execution flow.

## Values

| Constant | Value | Description |
|----------|-------|-------------|
| `BREAK` | `'break'` | Exit the current loop immediately |
| `CONTINUE` | `'continue'` | Skip remaining steps and continue to next iteration |

## Import

```javascript
import { FlowControlTypes } from 'micro-flow';
// or
import FlowControlTypes from 'micro-flow/enums/flow_control_types';
```

## Usage

### Using FlowControlStep

```javascript
import { 
  LoopStep,
  FlowControlStep,
  FlowControlTypes,
  LoopTypes
} from 'micro-flow';

const loop = new LoopStep({
  name: 'Search Loop',
  loop_type: LoopTypes.FOR_EACH,
  callable: async function() {
    return this.workflow.items;
  },
  loop_steps: [
    new Step({
      name: 'Check Item',
      type: StepTypes.ACTION,
      callable: async (item) => {
        return { found: item.id === targetId };
      }
    }),
    new FlowControlStep({
      name: 'Break If Found',
      flow_control_type: FlowControlTypes.BREAK,
      callable: async function(data) {
        return data.found; // Break if condition is true
      }
    })
  ]
});

await loop.execute();
```

### Using Workflow Flags Directly

```javascript
const loop = new LoopStep({
  name: 'Process Items',
  loop_type: LoopTypes.FOR_EACH,
  callable: async function() {
    return this.workflow.items;
  },
  loop_steps: [
    new Step({
      name: 'Process',
      type: StepTypes.ACTION,
      callable: async function(item) {
        if (item.invalid) {
          this.workflow.should_continue = true; // Skip to next item
          return { skipped: true };
        }
        
        if (item.critical) {
          this.workflow.should_break = true; // Exit loop
          return { stopped: true };
        }
        
        return processItem(item);
      }
    })
  ]
});

await loop.execute();
```

## BREAK

Exits the current loop immediately, skipping all remaining iterations and steps.

### Use Cases
- Found target item in search
- Error condition requires stopping
- Quota or limit reached
- Critical condition detected

### Example: Search and Break

```javascript
const searchLoop = new LoopStep({
  name: 'Find User',
  loop_type: LoopTypes.FOR_EACH,
  callable: async function() {
    return this.workflow.users;
  },
  loop_steps: [
    new Step({
      name: 'Check User',
      type: StepTypes.ACTION,
      callable: async function(user) {
        if (user.email === this.workflow.targetEmail) {
          this.workflow.foundUser = user;
          this.workflow.should_break = true; // Stop searching
          return { found: true };
        }
        return { found: false };
      }
    })
  ]
});

workflow.state.set('targetEmail', 'john@example.com');
await searchLoop.execute();
console.log('Found:', workflow.state.get('foundUser'));
```

### Example: Break on Error

```javascript
const batchLoop = new LoopStep({
  name: 'Process Batches',
  loop_type: LoopTypes.FOR_EACH,
  callable: async function() {
    return this.workflow.batches;
  },
  loop_steps: [
    new Step({
      name: 'Process Batch',
      type: StepTypes.ACTION,
      callable: async function(batch) {
        const result = await processBatch(batch);
        
        if (result.criticalError) {
          this.workflow.should_break = true;
          return { error: result.error };
        }
        
        return result;
      }
    })
  ]
});

await batchLoop.execute();
```

### Example: Using FlowControlStep for Break

```javascript
const downloadWorkflow = new Workflow({ name: 'Download Workflow' });
downloadWorkflow.pushSteps([
  new Step({
    name: 'Download',
    type: StepTypes.ACTION,
    callable: async function() {
      const url = this.state.get('currentUrl');
      const result = await downloadFile(url);
      this.state.set('downloadResult', result);
      return result;
    }
  }),
  new FlowControlStep({
    name: 'Break on Failure',
    flow_control_type: FlowControlTypes.BREAK,
    callable: async function() {
      const downloadResult = this.state.get('downloadResult');
      // Break if download failed
      return !downloadResult.success;
    }
  })
]);

const loop = new LoopStep({
  name: 'Download Files',
  loop_type: LoopTypes.FOR_EACH,
  iterable: fileUrls,
  callable: downloadWorkflow
});

await loop.execute();
```

## CONTINUE

Skips the remaining steps in the current iteration and moves to the next iteration.

### Use Cases
- Skip invalid/malformed data
- Filter out unwanted items
- Handle non-critical errors
- Selective processing

### Example: Skip Invalid Items

```javascript
const loop = new LoopStep({
  name: 'Validate and Process',
  loop_type: LoopTypes.FOR_EACH,
  callable: async function() {
    return this.workflow.records;
  },
  loop_steps: [
    new Step({
      name: 'Validate',
      type: StepTypes.ACTION,
      callable: async function(record) {
        if (!record.id || !record.email) {
          this.workflow.should_continue = true; // Skip invalid
          return { valid: false };
        }
        return { valid: true, record };
      }
    }),
    new Step({
      name: 'Process', // Only reached if valid
      type: StepTypes.ACTION,
      callable: async (data) => {
        return await processRecord(data.record);
      }
    })
  ]
});

await loop.execute();
```

### Example: Filter Items

```javascript
const loop = new LoopStep({
  name: 'Process Active Users',
  loop_type: LoopTypes.FOR_EACH,
  callable: async function() {
    return this.workflow.users;
  },
  loop_steps: [
    new FlowControlStep({
      name: 'Skip Inactive',
      flow_control_type: FlowControlTypes.CONTINUE,
      callable: async function(user) {
        // Continue (skip) if user is inactive
        return !user.active;
      }
    }),
    new Step({
      name: 'Send Notification',
      type: StepTypes.ACTION,
      callable: async (user) => {
        await sendNotification(user);
        return { sent: true };
      }
    })
  ]
});

await loop.execute();
```

### Example: Error Recovery with Continue

```javascript
const loop = new LoopStep({
  name: 'Process with Error Handling',
  loop_type: LoopTypes.FOR_EACH,
  callable: async function() {
    return this.workflow.items;
  },
  loop_steps: [
    new Step({
      name: 'Process Item',
      type: StepTypes.ACTION,
      callable: async function(item) {
        try {
          return await processItem(item);
        } catch (error) {
          console.error('Non-critical error:', error);
          this.workflow.should_continue = true; // Skip to next item
          return { error: true, message: error.message };
        }
      }
    }),
    new Step({
      name: 'Save Result', // Only reached if no error
      type: StepTypes.ACTION,
      callable: async function() {
        const result = this.state.get('processResult');
        await saveResult(result);
        return { saved: true };
      }
    })
  ]
});

await loop.execute();
```

## Combining BREAK and CONTINUE

```javascript
const loop = new LoopStep({
  name: 'Smart Processing',
  loop_type: LoopTypes.FOR_EACH,
  callable: async function() {
    return this.workflow.items;
  },
  loop_steps: [
    new Step({
      name: 'Analyze',
      type: StepTypes.ACTION,
      callable: async function(item) {
        // Skip if already processed
        if (item.processed) {
          this.workflow.should_continue = true;
          return { action: 'skip' };
        }
        
        // Break if critical item found
        if (item.critical) {
          this.workflow.should_break = true;
          return { action: 'critical_stop' };
        }
        
        // Process normally
        return { action: 'process', data: item };
      }
    }),
    new Step({
      name: 'Process',
      type: StepTypes.ACTION,
      callable: async (analysis) => {
        return await processNormalItem(analysis.data);
      }
    })
  ]
});

await loop.execute();
```

## Flow Control in Nested Loops

Flow control affects only the immediate loop:

```javascript
const outerLoop = new LoopStep({
  name: 'Outer',
  loop_type: LoopTypes.FOR_EACH,
  callable: async () => [1, 2, 3],
  loop_steps: [
    new LoopStep({
      name: 'Inner',
      loop_type: LoopTypes.FOR_EACH,
      callable: async () => ['a', 'b', 'c'],
      loop_steps: [
        new Step({
          name: 'Process',
          type: StepTypes.ACTION,
          callable: async function(data) {
            // This break only exits the inner loop
            if (data === 'b') {
              this.workflow.should_break = true;
            }
            return data;
          }
        })
      ]
    })
  ]
});

await outerLoop.execute();
// Outer loop continues normally
```

## Workflow State Flags

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `should_break` | `boolean` | `false` | Set to true to break current loop |
| `should_continue` | `boolean` | `false` | Set to true to continue to next iteration |

These flags are automatically reset after each iteration.

## Best Practices

### Use BREAK when:
- You've found what you're looking for
- A critical error occurs
- A limit or quota is reached
- Further processing is unnecessary

### Use CONTINUE when:
- Item doesn't meet criteria
- Non-critical error occurs
- Item is already processed
- Selective filtering needed

### Prefer FlowControlStep when:
- Condition logic is complex
- Reusability is important
- Clear separation of concerns needed

### Use direct flags when:
- Simple inline conditions
- Quick conditional exits
- Performance is critical

## See Also

- [FlowControlStep Class](../classes/flow-control-step.md)
- [LoopStep Class](../classes/loop-step.md)
- [loop_types Enum](./loop-types.md)
- [Step Types - Flow Control](../step-types/flow-control-step.md)
