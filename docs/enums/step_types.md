# Step Types

Enumeration of step types used throughout the workflow system. These types categorize steps by their primary function.

## Values

- `ACTION` - `'action'` - General purpose action step (default)
- `LOGIC` - `'logic'` - Logic-based step with conditional evaluation
- `DELAY` - `'delay'` - Time-based delay step
- `LOOP` - `'loop'` - Loop-based step for iterating over data or conditions

## Usage

Step types categorize the behavior and purpose of steps within workflows.

### Node.js - Action Step

```javascript
import { Step, step_types } from 'micro-flow';

const actionStep = new Step({
  name: 'process-data',
  step_type: step_types.ACTION,  // Default type
  callable: async () => {
    // Perform some action
    return { processed: true };
  }
});
```

### Node.js - Logic Step

```javascript
import { LogicStep, step_types } from 'micro-flow';

const logicStep = new LogicStep({
  name: 'check-condition',
  step_type: step_types.LOGIC,
  conditional: {
    subject: value,
    operator: '>',
    value: 10
  },
  callable: async () => {
    console.log('Condition met');
  }
});
```

### Browser - Delay Step

```javascript
import { DelayStep, step_types } from './micro-flow.js';

const delayStep = new DelayStep({
  name: 'wait-period',
  step_type: step_types.DELAY,
  delay_type: 'relative',
  delay_duration: 5000  // 5 seconds
});
```

### Node.js - Loop Step

```javascript
import { LoopStep, loop_types, step_types } from 'micro-flow';

const loopStep = new LoopStep({
  name: 'loop-items',
  step_type: step_types.LOOP,
  loop_type: loop_types.FOR_EACH,
  iterable: ['a', 'b', 'c'],
  callable: async function() {
    return this.current_item;
  }
});

await loopStep.execute();
```

### React - Filtering Steps by Type

```javascript
import { Workflow, Step, step_types } from './micro-flow.js';
import { useState, useEffect } from 'react';

function WorkflowAnalyzer({ workflow }) {
  const [stepSummary, setStepSummary] = useState({});

  useEffect(() => {
    const summary = workflow.steps.reduce((acc, step) => {
      acc[step.step_type] = (acc[step.step_type] || 0) + 1;
      return acc;
    }, {});
    
    setStepSummary(summary);
  }, [workflow]);

  return (
    <div>
      <h3>Step Summary</h3>
      <p>Action steps: {stepSummary[step_types.ACTION] || 0}</p>
      <p>Logic steps: {stepSummary[step_types.LOGIC] || 0}</p>
      <p>Delay steps: {stepSummary[step_types.DELAY] || 0}</p>
    </div>
  );
}
```

### Vue - Dynamic Step Creation

```vue
<template>
  <div>
    <select v-model="selectedType">
      <option :value="step_types.ACTION">Action</option>
      <option :value="step_types.LOGIC">Logic</option>
      <option :value="step_types.DELAY">Delay</option>
    </select>
    <button @click="createStep">Create Step</button>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import { Step, LogicStep, DelayStep, step_types } from './micro-flow.js';

const selectedType = ref(step_types.ACTION);

const createStep = () => {
  let step;
  
  switch (selectedType.value) {
    case step_types.ACTION:
      step = new Step({ name: 'action', callable: async () => {} });
      break;
    case step_types.LOGIC:
      step = new LogicStep({ 
        name: 'logic',
        conditional: { subject: true, operator: '===', value: true }
      });
      break;
    case step_types.DELAY:
      step = new DelayStep({ 
        name: 'delay',
        delay_type: 'relative',
        delay_duration: 1000
      });
      break;
  }
  
  console.log('Created step:', step);
};
</script>
```

### Node.js - Step Type Validation

```javascript
import { Workflow, Step, step_types } from 'micro-flow';

function createValidatedWorkflow(stepConfigs) {
  const steps = stepConfigs.map(config => {
    if (!Object.values(step_types).includes(config.type)) {
      throw new Error(`Invalid step type: ${config.type}`);
    }
    
    return new Step({
      name: config.name,
      step_type: config.type,
      callable: config.callable
    });
  });

  return new Workflow({
    name: 'validated-workflow',
    steps
  });
}

const workflow = createValidatedWorkflow([
  { name: 'step1', type: step_types.ACTION, callable: async () => {} },
  { name: 'step2', type: step_types.LOGIC, callable: async () => {} }
]);
```

## See Also

- [Step](../classes/steps/step.md) - Uses step types
- [LogicStep](../classes/steps/logic_step.md) - Logic type step
- [Sub Step Types](sub_step_types.md) - More specific step categorization
