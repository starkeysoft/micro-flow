# Loop Types

Enumeration of loop types for LoopStep.

## Values

- `FOR` - `'for'` - For loop - runs the callable a fixed number of times using `iterations`
- `WHILE` - `'while'` - While loop - continues while condition is true
- `FOR_EACH` - `'for_each'` - For-each loop - iterates over collection items
- `GENERATOR` - `'generator'` - Generator loop - iterates yielded values from a generator/async generator callable

## Usage

### Node.js - For Loop (Fixed Iterations)

```javascript
import { LoopStep, loop_types } from 'micro-flow';

const heartbeat = new LoopStep({
  name: 'heartbeat',
  loop_type: loop_types.FOR,
  iterations: 3,
  callable: async () => {
    console.log('tick');
  }
});

await heartbeat.execute();
```

### Node.js - For-Each Loop

```javascript
import { LoopStep, loop_types } from 'micro-flow';

const users = [
  { id: 1, name: 'Alice' },
  { id: 2, name: 'Bob' },
  { id: 3, name: 'Charlie' }
];

const forEachLoop = new LoopStep({
  name: 'process-users',
  loop_type: loop_types.FOR_EACH,
  iterable: users,
  callable: async function() {
    const user = this.current_item;
    console.log(`Processing user: ${user.name}`);
    await saveToDatabase(user);
  }
});

await forEachLoop.execute();
```

### Node.js - While Loop

```javascript
import { LoopStep, loop_types, State } from 'micro-flow';

State.set('counter', 0);

const whileLoop = new LoopStep({
  name: 'retry-until-success',
  loop_type: loop_types.WHILE,
  conditional: {
    subject: State.get('counter'),
    operator: '<',
    value: 5
  },
  callable: async () => {
    const counter = State.get('counter');
    console.log(`Attempt ${counter + 1}`);
    
    try {
      await attemptOperation();
      State.set('counter', 10); // Exit loop on success
    } catch (error) {
      State.set('counter', counter + 1);
    }
    this.subject = State.get('counter');
  }
});

await whileLoop.execute();
```

### Node.js - Generator Loop

```javascript
import { LoopStep, loop_types } from 'micro-flow';

const generatorLoop = new LoopStep({
  name: 'stream-events',
  loop_type: loop_types.GENERATOR,
  callable: async function* () {
    yield { event: 'start' };
    yield { event: 'finish' };
  }
});

const result = await generatorLoop.execute();
console.log(result.result);
```

### Browser - Processing Array

```javascript
import { Workflow, Step, LoopStep, loop_types } from './micro-flow.js';

const imageUrls = [
  'image1.jpg',
  'image2.jpg',
  'image3.jpg'
];

const imageWorkflow = new Workflow({
  name: 'load-images',
  steps: [
    new LoopStep({
      name: 'load-each-image',
      loop_type: loop_types.FOR_EACH,
      iterable: imageUrls,
      callable: async function() {
        const url = this.current_item;
        const img = new Image();
        img.src = url;
        
        await new Promise((resolve, reject) => {
          img.onload = resolve;
          img.onerror = reject;
        });
        
        document.getElementById('gallery').appendChild(img);
      }
    })
  ]
});

await imageWorkflow.execute();
```

### React - Batch Processing

```javascript
import { LoopStep, loop_types } from './micro-flow.js';
import { useState } from 'react';

function BatchProcessor() {
  const [items, setItems] = useState([1, 2, 3, 4, 5]);
  const [processed, setProcessed] = useState([]);
  const [isProcessing, setIsProcessing] = useState(false);

  const processBatch = async () => {
    setIsProcessing(true);
    setProcessed([]);

    const loop = new LoopStep({
      name: 'process-batch',
      loop_type: loop_types.FOR_EACH,
      iterable: items,
      callable: async function() {
        const item = this.current_item;
        // Simulate processing
        await new Promise(resolve => setTimeout(resolve, 500));
        
        const result = item * 2;
        setProcessed(prev => [...prev, result]);
        
        return result;
      }
    });

    await loop.execute();
    setIsProcessing(false);
  };

  return (
    <div>
      <button onClick={processBatch} disabled={isProcessing}>
        {isProcessing ? 'Processing...' : 'Process Items'}
      </button>
      <div>
        <h3>Original: {items.join(', ')}</h3>
        <h3>Processed: {processed.join(', ')}</h3>
      </div>
    </div>
  );
}
```

### Vue - Paginated Data Loading

```vue
<template>
  <div>
    <button @click="loadAllPages" :disabled="loading">
      Load All Pages
    </button>
    <div v-for="item in allItems" :key="item.id">
      {{ item.name }}
    </div>
    <p>Loaded {{ allItems.length }} items</p>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import { LoopStep, loop_types, State } from './micro-flow.js';

const allItems = ref([]);
const loading = ref(false);

const loadAllPages = async () => {
  loading.value = true;
  State.set('page', 1);
  State.set('hasMore', true);

  const whileLoop = new LoopStep({
    name: 'load-pages',
    loop_type: loop_types.WHILE,
    conditional: {
      subject: State.get('hasMore'),
      operator: '===',
      value: true
    },
    callable: async () => {
      const page = State.get('page');
      const response = await fetch(`/api/items?page=${page}`);
      const data = await response.json();
      
      allItems.value.push(...data.items);
      
      if (data.items.length === 0 || !data.hasMore) {
        State.set('hasMore', false);
      } else {
        State.set('page', page + 1);
      }
      this.subject = State.get('hasMore');
    }
  });

  await whileLoop.execute();
  loading.value = false;
};
</script>
```

### Node.js - Retry Logic with While Loop

```javascript
import { Workflow, LoopStep, Step, loop_types, State } from 'micro-flow';

const retryWorkflow = new Workflow({
  name: 'retry-api-call',
  steps: [
    new Step({
      name: 'initialize',
      callable: async () => {
        State.set('retry.attempts', 0);
        State.set('retry.success', false);
        State.set('retry.max', 3);
      }
    }),
    new LoopStep({
      name: 'retry-loop',
      loop_type: loop_types.WHILE,
      conditional: {
        subject: State.get('retry.success'),
        operator: '===',
        value: false
      },
      max_iterations: State.get('retry.max'),
      callable: async () => {
        const attempts = State.get('retry.attempts');
        
        try {
          console.log(`Attempt ${attempts + 1}...`);
          const result = await fetch('https://api.example.com/data');
          
          if (result.ok) {
            State.set('retry.success', true);
            State.set('retry.result', await result.json());
            console.log('Success!');
          } else {
            throw new Error('Request failed');
          }
        } catch (error) {
          console.error(`Attempt ${attempts + 1} failed:`, error.message);
          State.set('retry.attempts', attempts + 1);
          
          // Exponential backoff
          await new Promise(resolve => 
            setTimeout(resolve, Math.pow(2, attempts) * 1000)
          );
        }
        this.subject = State.get('retry.success');
      }
    }),
    new Step({
      name: 'handle-result',
      callable: async () => {
        if (State.get('retry.success')) {
          console.log('Final result:', State.get('retry.result'));
        } else {
          console.error('All retry attempts failed');
        }
      }
    })
  ]
});

await retryWorkflow.execute();
```

### Node.js - Batch Processing with Chunks

```javascript
import { LoopStep, loop_types } from 'micro-flow';

function chunk(array, size) {
  const chunks = [];
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size));
  }
  return chunks;
}

const largeDataset = Array.from({ length: 1000 }, (_, i) => i);
const chunks = chunk(largeDataset, 100);
let chunkIndex = 0;

const batchLoop = new LoopStep({
  name: 'process-chunks',
  loop_type: loop_types.FOR_EACH,
  iterable: chunks,
  callable: async function() {
    const currentIndex = chunkIndex++;
    const chunk = this.current_item;
    console.log(`Processing chunk ${currentIndex + 1}/${chunks.length}`);
    
    // Process chunk
    await Promise.all(
      chunk.map(item => processItem(item))
    );
    
    console.log(`Chunk ${currentIndex + 1} complete`);
  }
});

await batchLoop.execute();
```

## See Also

- [LoopStep](../classes/steps/loop_step.md) - Step that uses loop types
- [Logic Step Types](logic_step_types.md) - Logic step categorization
- [FlowControlStep](../classes/steps/flow_control_step.md) - Break/continue loops
