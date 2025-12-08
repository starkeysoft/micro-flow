# ConditionalStep

ConditionalStep class for branching logic based on conditions.

Extends: [LogicStep](logic_step.md)

## Constructor

### `new ConditionalStep(options)`

Creates a new ConditionalStep instance.

**Parameters:**
- `options` (Object) - Configuration options
  - `name` (string, optional) - Name of the step
  - `conditional` (Object, required) - Conditional configuration
    - `subject` (any) - Subject to evaluate
    - `operator` (string) - Comparison operator
    - `value` (any) - Value to compare against
  - `true_callable` (Function|Step|Workflow, optional) - Callable to execute if condition is true (default: `async () => {}`)
  - `false_callable` (Function|Step|Workflow, optional) - Callable to execute if condition is false (default: `async () => {}`)

**Example (Node.js - File Processing):**
```javascript
import { ConditionalStep } from 'micro-flow';
import fs from 'fs/promises';

const fileCheck = new ConditionalStep({
  name: 'check-file-size',
  conditional: {
    subject: await (await fs.stat('./data.json')).size,
    operator: '>',
    value: 1024 * 1024 // 1MB
  },
  true_callable: async () => {
    console.log('File is large, using streaming');
    return await processLargeFile('./data.json');
  },
  false_callable: async () => {
    console.log('File is small, loading into memory');
    return await processSmallFile('./data.json');
  }
});

await fileCheck.execute();
```

**Example (Browser - API Response Handling):**
```javascript
import { ConditionalStep } from './micro-flow.js';

const apiCall = new ConditionalStep({
  name: 'fetch-data',
  conditional: {
    subject: navigator.onLine,
    operator: '===',
    value: true
  },
  true_callable: async () => {
    const response = await fetch('/api/data');
    return response.json();
  },
  false_callable: async () => {
    console.log('Offline, using cached data');
    return JSON.parse(localStorage.getItem('cachedData'));
  }
});
```

## Properties

- `true_callable` (Function|Step|Workflow) - Executed when condition is true
- `false_callable` (Function|Step|Workflow) - Executed when condition is false

All properties inherited from [LogicStep](logic_step.md)

## Methods

### `async conditional()`

Executes the appropriate branch based on the condition evaluation.

**Returns:** Promise\<any\> - The result of the executed branch

**Example (Node.js - Environment-Based Configuration):**
```javascript
import { ConditionalStep } from 'micro-flow';

const configLoader = new ConditionalStep({
  name: 'load-config',
  conditional: {
    subject: process.env.NODE_ENV,
    operator: '===',
    value: 'production'
  },
  true_callable: async () => {
    console.log('Loading production config');
    return {
      apiUrl: 'https://api.production.com',
      debug: false,
      timeout: 5000
    };
  },
  false_callable: async () => {
    console.log('Loading development config');
    return {
      apiUrl: 'http://localhost:3000',
      debug: true,
      timeout: 30000
    };
  }
});

const config = await configLoader.execute();
console.log('Config:', config.result);
```

**Example (Browser with React - Form Validation):**
```javascript
import { ConditionalStep, Workflow } from './micro-flow.js';
import { useState } from 'react';

function FormSubmit() {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');

  const handleSubmit = async () => {
    const validationStep = new ConditionalStep({
      name: 'validate-email',
      conditional: {
        subject: /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email),
        operator: '===',
        value: true
      },
      true_callable: async () => {
        const response = await fetch('/api/submit', {
          method: 'POST',
          body: JSON.stringify({ email })
        });
        return { success: true, data: await response.json() };
      },
      false_callable: async () => {
        return { 
          success: false, 
          error: 'Invalid email format' 
        };
      }
    });

    const result = await validationStep.execute();
    setMessage(result.result.success 
      ? 'Submitted successfully' 
      : result.result.error
    );
  };

  return (
    <form onSubmit={(e) => { e.preventDefault(); handleSubmit(); }}>
      <input value={email} onChange={(e) => setEmail(e.target.value)} />
      <button type="submit">Submit</button>
      {message && <p>{message}</p>}
    </form>
  );
}
```

## Common Patterns

### Authentication Flow (Node.js)

```javascript
import { ConditionalStep, Workflow, State } from 'micro-flow';
import jwt from 'jsonwebtoken';

const authWorkflow = new Workflow({
  name: 'authenticate-user',
  steps: [
    new Step({
      name: 'parse-token',
      callable: async () => {
        const token = State.get('request.headers.authorization');
        State.set('auth.token', token);
      }
    }),
    new ConditionalStep({
      name: 'verify-token',
      conditional: {
        subject: State.get('auth.token'),
        operator: '!==',
        value: null
      },
      true_callable: async () => {
        try {
          const decoded = jwt.verify(
            State.get('auth.token'), 
            process.env.JWT_SECRET
          );
          State.set('auth.user', decoded);
          return { authenticated: true, user: decoded };
        } catch (error) {
          return { authenticated: false, error: 'Invalid token' };
        }
      },
      false_callable: async () => {
        return { 
          authenticated: false, 
          error: 'No token provided' 
        };
      }
    })
  ]
});
```

### A/B Testing (Browser with Vue)

```vue
<template>
  <div>
    <div v-if="variant === 'A'">
      <h2>Version A</h2>
      <button class="button-blue">Click Me</button>
    </div>
    <div v-else>
      <h2>Version B</h2>
      <button class="button-green">Click Me</button>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { ConditionalStep, State } from './micro-flow.js';

const variant = ref('A');

onMounted(async () => {
  const abTest = new ConditionalStep({
    name: 'ab-test',
    conditional: {
      subject: Math.random(),
      operator: '>',
      value: 0.5
    },
    true_callable: async () => {
      State.set('experiment.variant', 'A');
      return 'A';
    },
    false_callable: async () => {
      State.set('experiment.variant', 'B');
      return 'B';
    }
  });

  const result = await abTest.execute();
  variant.value = result.result;
});
</script>
```

### Data Routing (Node.js)

```javascript
import { ConditionalStep, Workflow } from 'micro-flow';

function createDataRouter(dataSize) {
  return new Workflow({
    name: 'data-router',
    steps: [
      new ConditionalStep({
        name: 'route-by-size',
        conditional: {
          subject: dataSize,
          operator: '>',
          value: 10000
        },
        true_callable: async () => {
          console.log('Large dataset - using batch processor');
          return await batchProcessor.process();
        },
        false_callable: async () => {
          console.log('Small dataset - using quick processor');
          return await quickProcessor.process();
        }
      })
    ]
  });
}

const router = createDataRouter(15000);
await router.execute();
```

### Responsive Feature Loading (Browser with React)

```javascript
import { ConditionalStep } from './micro-flow.js';
import { useState, useEffect } from 'react';

function AdaptiveFeature() {
  const [feature, setFeature] = useState(null);

  useEffect(() => {
    const loadFeature = new ConditionalStep({
      name: 'load-adaptive',
      conditional: {
        subject: window.innerWidth,
        operator: '>',
        value: 768
      },
      true_callable: async () => {
        // Load full desktop features
        const module = await import('./features/desktop.js');
        return module.default;
      },
      false_callable: async () => {
        // Load lightweight mobile features
        const module = await import('./features/mobile.js');
        return module.default;
      }
    });

    loadFeature.execute().then(result => {
      setFeature(result.result);
    });
  }, []);

  return feature ? <feature.Component /> : <div>Loading...</div>;
}
```

### Cache Strategy (Node.js)

```javascript
import { ConditionalStep, State } from 'micro-flow';
import Redis from 'redis';

const redis = Redis.createClient();

async function getData(key) {
  const cacheCheck = new ConditionalStep({
    name: 'check-cache',
    conditional: {
      subject: await redis.exists(key),
      operator: '===',
      value: 1
    },
    true_callable: async () => {
      console.log('Cache hit');
      const cached = await redis.get(key);
      return JSON.parse(cached);
    },
    false_callable: async () => {
      console.log('Cache miss - fetching from database');
      const data = await database.query('SELECT * FROM data WHERE id = ?', [key]);
      await redis.set(key, JSON.stringify(data), 'EX', 3600);
      return data;
    }
  });

  const result = await cacheCheck.execute();
  return result.result;
}
```

## See Also

- [LogicStep](logic_step.md) - Parent class with condition checking
- [FlowControlStep](flow_control_step.md) - Control workflow execution
- [Step](step.md) - Base step class
- [Conditional Step Comparators](../../enums/conditional_step_comparators.md) - Available operators
