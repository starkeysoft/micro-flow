# Logic Step Types

Enumeration of logic step types for control flow operations. These types define different kinds of logic-based workflow steps.

## Values

- `CONDITIONAL` - `'conditional'` - Conditional branching step
- `LOOP` - `'loop'` - Looping/iteration step
- `FLOW_CONTROL` - `'flow_control'` - Flow control step (break, skip)
- `SWITCH` - `'switch'` - Switch/case statement step
- `SKIP` - `'skip'` - Skip execution step

## Usage

Logic step types provide fine-grained categorization of logic-based steps.

### Node.js - Conditional Type

```javascript
import { ConditionalStep, logic_step_types } from 'micro-flow';

const conditionalStep = new ConditionalStep({
  name: 'env-check',
  sub_step_type: logic_step_types.CONDITIONAL,
  conditional: {
    subject: process.env.NODE_ENV,
    operator: '===',
    value: 'production'
  },
  true_callable: async () => console.log('Production'),
  false_callable: async () => console.log('Development')
});
```

### Node.js - Loop Type

```javascript
import { LoopStep, logic_step_types } from 'micro-flow';

const loopStep = new LoopStep({
  name: 'process-items',
  sub_step_type: logic_step_types.LOOP,
  loop_type: 'for_each',
  items: [1, 2, 3, 4, 5],
  callable: async (item) => {
    console.log('Processing:', item);
  }
});
```

### Node.js - Flow Control Type

```javascript
import { FlowControlStep, logic_step_types, flow_control_types } from 'micro-flow';

const flowControl = new FlowControlStep({
  name: 'break-on-error',
  sub_step_type: logic_step_types.FLOW_CONTROL,
  conditional: {
    subject: errorCount,
    operator: '>',
    value: 0
  },
  flow_control_type: flow_control_types.BREAK
});
```

### Browser - Switch Type

```javascript
import { SwitchStep, logic_step_types } from './micro-flow.js';

const switchStep = new SwitchStep({
  name: 'route-handler',
  sub_step_type: logic_step_types.SWITCH,
  subject: userRole,
  cases: {
    'admin': async () => loadAdminPanel(),
    'user': async () => loadUserPanel(),
    'guest': async () => loadGuestPanel()
  },
  default: async () => loadDefaultPanel()
});
```

### React - Type-Based Rendering

```javascript
import { logic_step_types } from './micro-flow.js';
import { useState } from 'react';

function StepTypeVisualizer({ step }) {
  const getIcon = () => {
    switch (step.sub_step_type) {
      case logic_step_types.CONDITIONAL:
        return '🔀';
      case logic_step_types.LOOP:
        return '🔁';
      case logic_step_types.FLOW_CONTROL:
        return '⏸️';
      case logic_step_types.SWITCH:
        return '🔀';
      case logic_step_types.SKIP:
        return '⏭️';
      default:
        return '▶️';
    }
  };

  return (
    <div className="step-card">
      <span className="icon">{getIcon()}</span>
      <span className="name">{step.name}</span>
      <span className="type">{step.sub_step_type}</span>
    </div>
  );
}
```

### Vue - Logic Step Counter

```vue
<template>
  <div>
    <h3>Logic Step Distribution</h3>
    <div v-for="(count, type) in logicStepCounts" :key="type">
      {{ formatType(type) }}: {{ count }}
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { logic_step_types, State } from './micro-flow.js';

const workflows = ref({});

const logicStepCounts = computed(() => {
  const counts = {};
  
  Object.values(workflows.value).forEach(workflow => {
    workflow.steps.forEach(step => {
      if (step.sub_step_type) {
        counts[step.sub_step_type] = (counts[step.sub_step_type] || 0) + 1;
      }
    });
  });
  
  return counts;
});

const formatType = (type) => {
  return type.split('_').map(word => 
    word.charAt(0).toUpperCase() + word.slice(1)
  ).join(' ');
};

onMounted(() => {
  workflows.value = State.get('workflows');
});
</script>
```

### Node.js - Dynamic Step Creation

```javascript
import { 
  ConditionalStep, 
  LoopStep, 
  FlowControlStep,
  logic_step_types 
} from 'micro-flow';

function createLogicStep(config) {
  switch (config.type) {
    case logic_step_types.CONDITIONAL:
      return new ConditionalStep({
        name: config.name,
        conditional: config.conditional,
        true_callable: config.true_callable,
        false_callable: config.false_callable
      });
      
    case logic_step_types.LOOP:
      return new LoopStep({
        name: config.name,
        loop_type: config.loop_type,
        items: config.items,
        callable: config.callable
      });
      
    case logic_step_types.FLOW_CONTROL:
      return new FlowControlStep({
        name: config.name,
        conditional: config.conditional,
        flow_control_type: config.flow_control_type
      });
      
    default:
      throw new Error(`Unknown logic step type: ${config.type}`);
  }
}

const step = createLogicStep({
  type: logic_step_types.CONDITIONAL,
  name: 'check-value',
  conditional: { subject: 5, operator: '>', value: 3 },
  true_callable: async () => console.log('Greater'),
  false_callable: async () => console.log('Not greater')
});
```

## See Also

- [ConditionalStep](../classes/steps/conditional_step.md) - Conditional logic step
- [LogicStep](../classes/steps/logic_step.md) - Base logic step
- [FlowControlStep](../classes/steps/flow_control_step.md) - Flow control step
- [Step Types](step_types.md) - General step categorization
