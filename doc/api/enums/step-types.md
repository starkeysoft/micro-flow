# step_types Enum

Defines the four fundamental types of steps in a Micro Flow workflow.

## Values

| Constant | Value | Description |
|----------|-------|-------------|
| `INITIATOR` | `'initiator'` | Steps that begin a workflow or process |
| `ACTION` | `'action'` | Steps that perform operations or transformations |
| `LOGIC` | `'logic'` | Steps that control flow (conditionals, loops, switches) |
| `DELAY` | `'delay'` | Steps that introduce time-based delays |

## Import

```javascript
import { StepTypes } from 'micro-flow';
// or
import StepTypes from 'micro-flow/enums/step_types';
```

## Usage

### Creating Steps with Types

```javascript
import { Step, StepTypes } from 'micro-flow';

// INITIATOR: Starts the workflow
const initiatorStep = new Step({
  name: 'Initialize',
  type: StepTypes.INITIATOR,
  callable: async () => ({ started: true })
});

// ACTION: Performs work
const actionStep = new Step({
  name: 'Process Data',
  type: StepTypes.ACTION,
  callable: async (data) => processData(data)
});

// LOGIC: Controls flow (automatically set by specialized classes)
const logicStep = new ConditionalStep({
  name: 'Check Condition',
  type: StepTypes.LOGIC, // Set automatically
  callable: async (data) => data.value > 10
});

// DELAY: Introduces delays
const delayStep = new DelayStep({
  name: 'Wait',
  type: StepTypes.DELAY, // Set automatically
  delay_type: DelayTypes.RELATIVE,
  delay_value: 5000
});
```

### Type Checking

```javascript
if (step.state.get('type') === StepTypes.ACTION) {
  console.log('This is an action step');
}

// Filter steps by type
const actionSteps = workflow.getSteps().filter(
  step => step.state.get('type') === StepTypes.ACTION
);
```

## Step Type Behaviors

### INITIATOR
- **Purpose:** Mark workflow entry points
- **Typical Use:** Data fetching, initialization, setup
- **Example:**
  ```javascript
  new Step({
    type: StepTypes.INITIATOR,
    callable: async () => {
      const config = await loadConfig();
      return { config, initialized: true };
    }
  })
  ```

### ACTION
- **Purpose:** Perform business logic and transformations
- **Typical Use:** API calls, data processing, file operations
- **Example:**
  ```javascript
  new Step({
    type: StepTypes.ACTION,
    callable: async (data) => {
      const result = await apiClient.post('/endpoint', data);
      return result;
    }
  })
  ```

### LOGIC
- **Purpose:** Control workflow execution flow
- **Typical Use:** Conditionals, loops, switches, flow control
- **Automatically set by:** ConditionalStep, LoopStep, SwitchStep, FlowControlStep, SkipStep
- **Example:**
  ```javascript
  new ConditionalStep({
    // type: StepTypes.LOGIC is automatic
    callable: async function(data) {
      return this.workflow.userRole === 'admin';
    }
  })
  ```

### DELAY
- **Purpose:** Introduce time-based pauses
- **Typical Use:** Rate limiting, scheduled execution, polling intervals
- **Automatically set by:** DelayStep
- **Example:**
  ```javascript
  new DelayStep({
    // type: StepTypes.DELAY is automatic
    delay_type: DelayTypes.RELATIVE,
    delay_value: 3000 // 3 seconds
  })
  ```

## Complete Workflow Example

```javascript
import { 
  Workflow,
  Step,
  ConditionalStep,
  DelayStep,
  StepTypes,
  DelayTypes
} from 'micro-flow';

const workflow = new Workflow({ name: 'Data Pipeline' });

workflow.pushSteps([
  // INITIATOR: Start workflow
  new Step({
    name: 'Fetch Data',
    type: StepTypes.INITIATOR,
    callable: async () => {
      const data = await fetchFromAPI();
      return { records: data };
    }
  }),
  
  // ACTION: Transform data
  new Step({
    name: 'Transform',
    type: StepTypes.ACTION,
    callable: async function(data) {
      const records = this.workflow.records;
      return records.map(r => transformRecord(r));
    }
  }),
  
  // LOGIC: Conditional check
  new ConditionalStep({
    name: 'Check Quality',
    // type: StepTypes.LOGIC (automatic)
    callable: async function() {
      return this.workflow.output_data.length > 0;
    }
  }),
  
  // DELAY: Rate limiting
  new DelayStep({
    name: 'Rate Limit',
    // type: StepTypes.DELAY (automatic)
    delay_type: DelayTypes.RELATIVE,
    delay_value: 1000
  }),
  
  // ACTION: Save results
  new Step({
    name: 'Save',
    type: StepTypes.ACTION,
    callable: async function() {
      const transformed = this.workflow.output_data[1].result;
      await saveToDatabase(transformed);
      return { saved: true };
    }
  })
]);

await workflow.execute();
```

## Type Usage Guidelines

1. **INITIATOR** - Use for the first step(s) that set up workflow data
2. **ACTION** - Use for most data processing and I/O operations
3. **LOGIC** - Reserved for specialized step classes (automatically set)
4. **DELAY** - Reserved for DelayStep class (automatically set)

## See Also

- [Step Class](../classes/step.md)
- [step_statuses Enum](./step-statuses.md)
- [logic_step_types Enum](./logic-step-types.md)
- [Core Concepts - Steps](../../core-concepts/steps.md)
