# LogicStep

LogicStep class for conditional logic operations.

Extends: [Step](step.md)

## Constructor

### `new LogicStep(options)`

Creates a new LogicStep instance.

**Parameters:**
- `options` (Object) - Configuration options
  - `name` (string, optional) - Name of the step
  - `conditional` (Object, required) - Conditional configuration
    - `subject` (any) - Subject to evaluate
    - `operator` (string) - Comparison operator
    - `value` (any) - Value to compare against
  - `callable` (Function, optional) - Function to execute (default: `async () => {}`)

**Example (Node.js):**
```javascript
import { LogicStep, conditional_step_comparators } from 'micro-flow';

const logicStep = new LogicStep({
  name: 'check-temperature',
  conditional: {
    subject: 75,
    operator: conditional_step_comparators.GREATER_THAN,
    value: 70
  },
  callable: async () => {
    console.log('Temperature is above threshold');
  }
});

await logicStep.execute();
```

**Example (Browser):**
```javascript
import { LogicStep } from './micro-flow.js';

const userAge = 25;

const ageCheck = new LogicStep({
  name: 'verify-age',
  conditional: {
    subject: userAge,
    operator: '>=',
    value: 18
  },
  callable: async () => {
    console.log('User is adult');
  }
});
```

## Properties

- `subject` (any) - Subject value to evaluate
- `operator` (string) - Comparison operator
- `value` (any) - Value to compare subject against

All properties inherited from [Step](step.md)

## Methods

### `checkCondition()`

Evaluates the conditional expression.

**Returns:** boolean - True if the condition is met

**Throws:** Error if operator is unknown

**Supported Operators:**
- `STRICT_EQUALS` / `===` - Strict equality
- `EQUALS` / `==` - Loose equality
- `NOT_EQUALS` / `!=` - Loose inequality
- `STRICT_NOT_EQUALS` / `!==` - Strict inequality
- `GREATER_THAN` / `>` - Greater than
- `LESS_THAN` / `<` - Less than
- `GREATER_THAN_OR_EQUAL` / `>=` - Greater than or equal
- `LESS_THAN_OR_EQUAL` / `<=` - Less than or equal

**Example (Node.js - Environment Check):**
```javascript
import { LogicStep } from 'micro-flow';

const envCheck = new LogicStep({
  name: 'check-env',
  conditional: {
    subject: process.env.NODE_ENV,
    operator: '===',
    value: 'production'
  },
  callable: async () => {
    console.log('Running in production mode');
    // Enable production features
  }
});

if (envCheck.checkCondition()) {
  await envCheck.execute();
}
```

**Example (Browser with React - Feature Flag):**
```javascript
import { LogicStep } from './micro-flow.js';
import { useState, useEffect } from 'react';

function FeatureGate({ featureName, children }) {
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    const checkFeature = new LogicStep({
      name: 'check-feature',
      conditional: {
        subject: localStorage.getItem('features.' + featureName),
        operator: '===',
        value: 'enabled'
      }
    });

    setEnabled(checkFeature.checkCondition());
  }, [featureName]);

  return enabled ? children : null;
}
```

---

### `validateAndSetConditional(conditional)`

Validates and sets the conditional properties.

**Parameters:**
- `conditional` (Object) - Conditional configuration object

**Throws:** Error if conditional is invalid

## Common Patterns

### Dynamic Thresholds (Node.js)

```javascript
import { LogicStep, Workflow, State } from 'micro-flow';

const checkMetrics = new Workflow({
  name: 'metrics-check',
  steps: [
    new Step({
      name: 'fetch-metrics',
      callable: async () => {
        const metrics = await getSystemMetrics();
        State.set('current.cpu', metrics.cpu);
        State.set('current.memory', metrics.memory);
      }
    }),
    new LogicStep({
      name: 'check-cpu',
      conditional: {
        subject: State.get('current.cpu'),
        operator: '>',
        value: 80
      },
      callable: async () => {
        console.log('High CPU usage detected');
        await sendAlert('CPU', State.get('current.cpu'));
      }
    }),
    new LogicStep({
      name: 'check-memory',
      conditional: {
        subject: State.get('current.memory'),
        operator: '>',
        value: 90
      },
      callable: async () => {
        console.log('High memory usage detected');
        await sendAlert('Memory', State.get('current.memory'));
      }
    })
  ]
});
```

### Conditional Rendering (Browser with Vue)

```vue
<template>
  <div>
    <button @click="checkAndRender">Check Condition</button>
    <div v-if="shouldRender">Content visible</div>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import { LogicStep } from './micro-flow.js';

const shouldRender = ref(false);
const userScore = ref(85);

const checkAndRender = async () => {
  const scoreCheck = new LogicStep({
    name: 'score-threshold',
    conditional: {
      subject: userScore.value,
      operator: '>=',
      value: 80
    },
    callable: async () => {
      shouldRender.value = true;
    }
  });

  if (scoreCheck.checkCondition()) {
    await scoreCheck.execute();
  }
};
</script>
```

### Data Validation Pipeline (Node.js)

```javascript
import { LogicStep, Workflow } from 'micro-flow';

function createValidationWorkflow(data) {
  return new Workflow({
    name: 'validate-data',
    exit_on_error: true,
    steps: [
      new LogicStep({
        name: 'check-required-fields',
        conditional: {
          subject: data.email && data.password,
          operator: '===',
          value: true
        },
        callable: async () => {
          console.log('Required fields present');
        }
      }),
      new LogicStep({
        name: 'validate-email-format',
        conditional: {
          subject: /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email),
          operator: '===',
          value: true
        },
        callable: async () => {
          console.log('Email format valid');
        }
      }),
      new LogicStep({
        name: 'check-password-length',
        conditional: {
          subject: data.password.length,
          operator: '>=',
          value: 8
        },
        callable: async () => {
          console.log('Password length valid');
        }
      })
    ]
  });
}

const workflow = createValidationWorkflow({
  email: 'user@example.com',
  password: 'securepass123'
});

await workflow.execute();
```

### Permission Checking (Browser with React)

```javascript
import { LogicStep, State } from './micro-flow.js';
import { useEffect, useState } from 'react';

function ProtectedAction({ requiredRole, onSuccess }) {
  const [canAccess, setCanAccess] = useState(false);
  
  useEffect(() => {
    const checkPermission = new LogicStep({
      name: 'check-role',
      conditional: {
        subject: State.get('user.role'),
        operator: '===',
        value: requiredRole
      }
    });
    
    setCanAccess(checkPermission.checkCondition());
  }, [requiredRole]);

  return (
    <button 
      disabled={!canAccess}
      onClick={onSuccess}
    >
      {canAccess ? 'Execute' : 'Access Denied'}
    </button>
  );
}
```

## See Also

- [ConditionalStep](conditional_step.md) - Branching logic with true/false callables
- [FlowControlStep](flow_control_step.md) - Control workflow execution flow
- [Step](step.md) - Parent class
- [Conditional Step Comparators](../../enums/conditional_step_comparators.md) - Available operators
