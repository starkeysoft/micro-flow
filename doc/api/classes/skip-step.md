# SkipStep Class

The `SkipStep` class provides conditional skipping of step execution within workflows, similar to early returns in functions.

## Constructor

```javascript
new SkipStep(options)
```

### Parameters

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `options.subject` | `any` | Yes | - | Value to compare |
| `options.operator` | `string` | Yes | - | Comparison operator |
| `options.value` | `any` | Yes | - | Value to compare against |
| `options.name` | `string` | No | `''` | Name for the skip step |

### Example

```javascript
import { SkipStep } from 'micro-flow';

const skipStep = new SkipStep({
  name: 'Skip if Already Processed',
  subject: () => item.processed,
  operator: '===',
  value: true
});
```

## Properties

### Static Properties

- **`step_name`**: `logic_step_types.SKIP` - Identifier for skip steps

### State Properties

In addition to LogicStep state properties:

| Property | Type | Description |
|----------|------|-------------|
| `should_skip` | `boolean` | Flag indicating step should be skipped |

## Methods

### `skipStep()`

Evaluates condition and sets `should_skip` flag if condition is true.

```javascript
async skipStep(): Promise<boolean>
```

**Returns:**
- `Promise<boolean>` - True if step should be skipped

## Usage Examples

### Skip Already Processed Items

```javascript
const workflow = new Workflow({ name: 'Process Items' });
workflow.pushSteps([
  new SkipStep({
    name: 'Skip Processed',
    subject: () => item.processed,
    operator: '===',
    value: true
  }),
  new Step({
    name: 'Process Item',
    type: StepTypes.ACTION,
    callable: async (item) => {
      // Only runs if not already processed
      return await processItem(item);
    }
  })
]);

await workflow.execute();
```

### Skip Invalid Data

```javascript
const validationWorkflow = new Workflow({ name: 'Validate and Process' });
validationWorkflow.pushSteps([
  new Step({
    name: 'Check Validity',
    type: StepTypes.ACTION,
    callable: async function(data) {
      this.workflow.isValid = data && data.id && data.name;
      return data;
    }
  }),
  new SkipStep({
    name: 'Skip Invalid',
    subject: () => workflow.state.get('isValid'),
    operator: '===',
    value: false
  }),
  new Step({
    name: 'Process Valid Data',
    type: StepTypes.ACTION,
    callable: async (data) => processValidData(data)
  })
]);

await validationWorkflow.execute();
```

### Skip on Permission Denied

```javascript
const permissionWorkflow = new Workflow({ name: 'Check Permissions' });
permissionWorkflow.pushSteps([
  new Step({
    name: 'Check Access',
    type: StepTypes.ACTION,
    callable: async function() {
      this.workflow.hasAccess = await checkUserPermissions(user, resource);
      return this.workflow.hasAccess;
    }
  }),
  new SkipStep({
    name: 'Skip if No Access',
    subject: () => workflow.state.get('hasAccess'),
    operator: '===',
    value: false
  }),
  new Step({
    name: 'Perform Action',
    type: StepTypes.ACTION,
    callable: async () => performRestrictedAction()
  })
]);

await permissionWorkflow.execute();
```

### Skip Empty Collections

```javascript
const collectionWorkflow = new Workflow({ name: 'Process Collection' });
collectionWorkflow.pushSteps([
  new SkipStep({
    name: 'Skip Empty',
    subject: () => items.length,
    operator: '===',
    value: 0
  }),
  new Step({
    name: 'Process Items',
    type: StepTypes.ACTION,
    callable: async () => items.map(item => processItem(item))
  })
]);

await collectionWorkflow.execute();
```

### Skip on Feature Flag

```javascript
const featureWorkflow = new Workflow({ name: 'Feature Workflow' });
featureWorkflow.pushSteps([
  new Step({
    name: 'Check Feature Flag',
    type: StepTypes.ACTION,
    callable: async function() {
      this.workflow.featureEnabled = await getFeatureFlag('new-feature');
      return this.workflow.featureEnabled;
    }
  }),
  new SkipStep({
    name: 'Skip if Disabled',
    subject: () => workflow.state.get('featureEnabled'),
    operator: '===',
    value: false
  }),
  new Step({
    name: 'Run New Feature',
    type: StepTypes.ACTION,
    callable: async () => runNewFeature()
  })
]);

await featureWorkflow.execute();
```

### Skip on Cache Hit

```javascript
const cacheWorkflow = new Workflow({ name: 'Cache Check' });
cacheWorkflow.pushSteps([
  new Step({
    name: 'Check Cache',
    type: StepTypes.ACTION,
    callable: async function(key) {
      this.workflow.cached = await cache.get(key);
      return this.workflow.cached;
    }
  }),
  new SkipStep({
    name: 'Skip if Cached',
    subject: () => workflow.state.get('cached'),
    operator: '!==',
    value: undefined
  }),
  new Step({
    name: 'Fetch from Database',
    type: StepTypes.ACTION,
    callable: async function(key) {
      const data = await database.get(key);
      await cache.set(key, data);
      return data;
    }
  })
]);

await cacheWorkflow.execute();
```

### Skip on Rate Limit

```javascript
const rateLimitWorkflow = new Workflow({ name: 'Rate Limited API' });
rateLimitWorkflow.pushSteps([
  new Step({
    name: 'Check Rate Limit',
    type: StepTypes.ACTION,
    callable: async function() {
      this.workflow.remaining = await getRateLimitRemaining();
      return this.workflow.remaining;
    }
  }),
  new SkipStep({
    name: 'Skip if Limited',
    subject: () => workflow.state.get('remaining'),
    operator: '<=',
    value: 0
  }),
  new Step({
    name: 'Call API',
    type: StepTypes.ACTION,
    callable: async () => callExternalAPI()
  })
]);

await rateLimitWorkflow.execute();
```

### Skip on Business Hours

```javascript
const businessHoursWorkflow = new Workflow({ name: 'Business Hours Check' });
businessHoursWorkflow.pushSteps([
  new Step({
    name: 'Check Hours',
    type: StepTypes.ACTION,
    callable: async function() {
      const hour = new Date().getHours();
      this.workflow.isBusinessHours = hour >= 9 && hour < 17;
      return this.workflow.isBusinessHours;
    }
  }),
  new SkipStep({
    name: 'Skip Outside Hours',
    subject: () => workflow.state.get('isBusinessHours'),
    operator: '===',
    value: false
  }),
  new Step({
    name: 'Send Notification',
    type: StepTypes.ACTION,
    callable: async () => sendBusinessHoursNotification()
  })
]);

await businessHoursWorkflow.execute();
```

### Skip on Environment

```javascript
const envWorkflow = new Workflow({ name: 'Environment Check' });
envWorkflow.pushSteps([
  new SkipStep({
    name: 'Skip in Production',
    subject: () => process.env.NODE_ENV,
    operator: '===',
    value: 'production'
  }),
  new Step({
    name: 'Debug Operation',
    type: StepTypes.ACTION,
    callable: async () => performDebugOperation()
  })
]);

await envWorkflow.execute();
```

### Multiple Skip Conditions

```javascript
const multiSkipWorkflow = new Workflow({ name: 'Multi Skip' });
multiSkipWorkflow.pushSteps([
  // Skip if user is not authenticated
  new SkipStep({
    name: 'Skip Unauthenticated',
    subject: () => user.authenticated,
    operator: '===',
    value: false
  }),
  
  // Skip if user is blocked
  new SkipStep({
    name: 'Skip Blocked',
    subject: () => user.blocked,
    operator: '===',
    value: true
  }),
  
  // Skip if subscription expired
  new SkipStep({
    name: 'Skip Expired',
    subject: () => user.subscriptionExpired,
    operator: '===',
    value: true
  }),
  
  new Step({
    name: 'Perform Action',
    type: StepTypes.ACTION,
    callable: async () => performUserAction()
  })
]);

await multiSkipWorkflow.execute();
```

### Skip with Logging

```javascript
const loggedSkipWorkflow = new Workflow({ name: 'Logged Skip' });
loggedSkipWorkflow.pushSteps([
  new Step({
    name: 'Validate',
    type: StepTypes.ACTION,
    callable: async function(data) {
      this.workflow.isValid = validateData(data);
      
      if (!this.workflow.isValid) {
        console.log('Skipping invalid data:', data.id);
      }
      
      return data;
    }
  }),
  new SkipStep({
    name: 'Skip Invalid',
    subject: () => workflow.state.get('isValid'),
    operator: '===',
    value: false
  }),
  new Step({
    name: 'Process Data',
    type: StepTypes.ACTION,
    callable: async (data) => processData(data)
  })
]);

await loggedSkipWorkflow.execute();
```

### Skip on Conditional Workflow State

```javascript
const stateSkipWorkflow = new Workflow({ name: 'State Skip' });

// Set up initial state
stateSkipWorkflow.state.set('processedCount', 0);
stateSkipWorkflow.state.set('maxProcessed', 100);

stateSkipWorkflow.pushSteps([
  new SkipStep({
    name: 'Skip if Limit Reached',
    subject: () => workflow.state.get('processedCount'),
    operator: '>=',
    value: () => workflow.state.get('maxProcessed')
  }),
  new Step({
    name: 'Process Item',
    type: StepTypes.ACTION,
    callable: async function(item) {
      const result = await processItem(item);
      this.workflow.processedCount++;
      return result;
    }
  })
]);

await stateSkipWorkflow.execute();
```

### Skip on Type Mismatch

```javascript
const typeCheckWorkflow = new Workflow({ name: 'Type Check' });
typeCheckWorkflow.pushSteps([
  new SkipStep({
    name: 'Skip Non-Objects',
    subject: () => typeof data,
    operator: '!==',
    value: 'object'
  }),
  new SkipStep({
    name: 'Skip Null',
    subject: () => data,
    operator: '===',
    value: null
  }),
  new Step({
    name: 'Process Object',
    type: StepTypes.ACTION,
    callable: async (data) => processObject(data)
  })
]);

await typeCheckWorkflow.execute();
```

## Skip vs FlowControl CONTINUE

- **SkipStep**: Skips execution of remaining steps in the current workflow when condition is true
- **FlowControlStep (CONTINUE)**: In loops, skips to next iteration when condition is false

Use SkipStep for:
- Early returns from workflows
- Conditional workflow execution
- Guard clauses

Use FlowControlStep for:
- Loop iteration control
- Breaking from loops
- Continuing to next iteration

## See Also

- [FlowControlStep Class](./flow-control-step.md) - Loop control (break/continue)
- [ConditionalStep Class](./conditional-step.md) - If/else branching
- [LogicStep Class](./logic-step.md) - Parent class
- [logic_step_types Enum](../enums/logic-step-types.md)
- [Core Concepts - Steps](../../core-concepts/steps.md)
