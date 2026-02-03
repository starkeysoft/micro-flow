# LoopStep

LoopStep class for executing loops within a workflow. Supports both `for_each` and `while` loop types.

Extends: [LogicStep](logic_step.md)

## Constructor

### `new LoopStep(options)`

Creates a new LoopStep instance.

**Parameters:**
- `options` (Object) - Configuration options
  - `name` (string, optional) - Name of the step
  - `iterable` (Array|Iterable|Function, required for `for_each`) - Iterable to loop over, or function returning an iterable
  - `callable` (Function, optional) - Function to execute for each iteration (default: `async () => {}`)
  - `conditional` (Object, required for `while`) - Conditional configuration for while loops
    - `subject` (any) - Subject to evaluate
    - `operator` (string) - Comparison operator
    - `value` (any) - Value to compare against
  - `loop_type` (string, optional) - Type of loop: `'for_each'` or `'while'` (default: `loop_types.FOR_EACH`)
  - `max_iterations` (number, optional) - Maximum iterations to prevent infinite loops (default: `1000`)

**Example (Node.js - For Each Loop):**
```javascript
import { LoopStep, loop_types } from 'micro-flow';

const processFiles = new LoopStep({
  name: 'process-files',
  iterable: ['file1.txt', 'file2.txt', 'file3.txt'],
  loop_type: loop_types.FOR_EACH,
  callable: async function() {
    console.log('Processing:', this.current_item);
    return { processed: this.current_item };
  }
});

const result = await processFiles.execute();
console.log('Results:', result.result);
// Results: { message: 'For each loop process-files completed after 3 iterations', result: [...] }
```

**Example (Node.js - While Loop):**
```javascript
import { LoopStep, loop_types, State } from 'micro-flow';

State.set('counter', 0);

const countToTen = new LoopStep({
  name: 'count-to-10',
  loop_type: loop_types.WHILE,
  conditional: {
    subject: State.get('counter'),
    operator: '<',
    value: 10
  },
  callable: async () => {
    const current = State.get('counter');
    console.log('Count:', current);
    State.set('counter', current + 1);
    return current;
  },
  max_iterations: 100
});

await countToTen.execute();
console.log('Final count:', State.get('counter'));
```

**Example (Browser - Processing Array Data):**
```javascript
import { LoopStep, loop_types } from './micro-flow.js';

const users = [
  { id: 1, name: 'Alice' },
  { id: 2, name: 'Bob' },
  { id: 3, name: 'Charlie' }
];

const sendEmails = new LoopStep({
  name: 'send-user-emails',
  iterable: users,
  loop_type: loop_types.FOR_EACH,
  callable: async function() {
    const user = this.current_item;
    console.log(`Sending email to ${user.name}`);
    await fetch('/api/send-email', {
      method: 'POST',
      body: JSON.stringify({ userId: user.id })
    });
    return { sent: user.name };
  }
});

await sendEmails.execute();
```

## Properties

- `iterable` (Array|Iterable|Function) - The iterable to loop over (for `for_each` loops)
- `loop_type` (string) - Type of loop: `'for_each'` or `'while'`
- `max_iterations` (number) - Maximum number of iterations allowed
- `results` (Array) - Array containing results from each iteration
- `current_item` (any) - The current item being processed (in `for_each` loops)
- `_callable` (Function) - The bound callable function

All properties inherited from [LogicStep](logic_step.md)

## Methods

### `async for_each_loop()`

Executes the callable for each item in the iterable.

**Returns:** Object - Contains message and array of results
  - `message` (string) - Completion message with iteration count
  - `result` (Array) - Array of results from each iteration

**Throws:** Error - If iterable is not provided

**Example (Node.js - Batch Processing):**
```javascript
import { LoopStep, loop_types } from 'micro-flow';
import { db } from './database.js';

const records = await db.query('SELECT * FROM pending_tasks');

const batchProcessor = new LoopStep({
  name: 'process-batch',
  iterable: records.rows,
  loop_type: loop_types.FOR_EACH,
  callable: async function() {
    const record = this.current_item;
    // Process the record
    await db.query('UPDATE tasks SET status = $1 WHERE id = $2', 
      ['processed', record.id]);
    return { id: record.id, status: 'processed' };
  }
});

const result = await batchProcessor.execute();
console.log(`Processed ${result.result.result.length} records`);
```

**Example (Browser - Image Processing):**
```javascript
import { LoopStep, loop_types } from './micro-flow.js';

const imageUrls = [
  '/images/photo1.jpg',
  '/images/photo2.jpg',
  '/images/photo3.jpg'
];

const loadImages = new LoopStep({
  name: 'load-images',
  iterable: imageUrls,
  loop_type: loop_types.FOR_EACH,
  callable: async function() {
    const url = this.current_item;
    const response = await fetch(url);
    const blob = await response.blob();
    return { url, size: blob.size };
  }
});

const result = await loadImages.execute();
console.log('Loaded images:', result.result.result);
```

### `async while_loop()`

Executes the callable while the condition is true.

**Returns:** Object - Contains message and array of results
  - `message` (string) - Completion message with iteration count
  - `result` (Array) - Array of results from each iteration

**Throws:** Error - If conditional is not valid

**Example (Node.js - Paginated API Calls):**
```javascript
import { LoopStep, loop_types, State } from 'micro-flow';

State.set('hasMore', true);
State.set('page', 1);
State.set('allData', []);

const fetchAllPages = new LoopStep({
  name: 'fetch-all-pages',
  loop_type: loop_types.WHILE,
  conditional: {
    subject: State.get('hasMore'),
    operator: '===',
    value: true
  },
  callable: async () => {
    const page = State.get('page');
    const response = await fetch(`/api/data?page=${page}`);
    const data = await response.json();
    
    State.set('allData', [...State.get('allData'), ...data.items]);
    State.set('hasMore', data.hasNextPage);
    State.set('page', page + 1);
    
    return { page, itemCount: data.items.length };
  },
  max_iterations: 50
});

await fetchAllPages.execute();
console.log('Total items:', State.get('allData').length);
```

**Example (Browser - Retry Until Success):**
```javascript
import { LoopStep, loop_types, State } from './micro-flow.js';

State.set('success', false);
State.set('attempts', 0);

const retryOperation = new LoopStep({
  name: 'retry-until-success',
  loop_type: loop_types.WHILE,
  conditional: {
    subject: State.get('success'),
    operator: '===',
    value: false
  },
  callable: async () => {
    const attempts = State.get('attempts');
    State.set('attempts', attempts + 1);
    
    try {
      const response = await fetch('/api/unstable-endpoint');
      if (response.ok) {
        State.set('success', true);
        return { success: true, attempts: attempts + 1 };
      }
      return { success: false, attempts: attempts + 1 };
    } catch (error) {
      console.log(`Attempt ${attempts + 1} failed`);
      return { success: false, attempts: attempts + 1, error: error.message };
    }
  },
  max_iterations: 10
});

const result = await retryOperation.execute();
console.log('Operation result:', result.result);
```

## Common Patterns

### Data Transformation Pipeline (Node.js)

```javascript
import { LoopStep, loop_types } from 'micro-flow';

const rawData = [
  { name: 'apple', price: '1.50' },
  { name: 'banana', price: '0.75' },
  { name: 'orange', price: '2.00' }
];

const transformData = new LoopStep({
  name: 'transform-products',
  iterable: rawData,
  loop_type: loop_types.FOR_EACH,
  callable: async function() {
    const item = this.current_item;
    return {
      name: item.name.toUpperCase(),
      price: parseFloat(item.price),
      formattedPrice: `$${item.price}`
    };
  }
});

const result = await transformData.execute();
console.log('Transformed data:', result.result.result);
```

### Parallel Task Processing (Node.js)

```javascript
import { LoopStep, loop_types } from 'micro-flow';

const taskIds = [101, 102, 103, 104, 105];

const processTasks = new LoopStep({
  name: 'process-tasks',
  iterable: taskIds,
  loop_type: loop_types.FOR_EACH,
  callable: async function() {
    const taskId = this.current_item;
    // Simulate async processing
    const result = await fetch(`/api/tasks/${taskId}/process`, {
      method: 'POST'
    });
    return await result.json();
  }
});

const result = await processTasks.execute();
console.log('Processing complete:', result.result.message);
```

### Polling with Timeout (Node.js)

```javascript
import { LoopStep, loop_types, State } from 'micro-flow';

State.set('jobComplete', false);
State.set('pollAttempts', 0);

const pollJobStatus = new LoopStep({
  name: 'poll-job',
  loop_type: loop_types.WHILE,
  conditional: {
    subject: State.get('jobComplete'),
    operator: '===',
    value: false
  },
  callable: async () => {
    const attempts = State.get('pollAttempts');
    State.set('pollAttempts', attempts + 1);
    
    const response = await fetch('/api/job/123/status');
    const status = await response.json();
    
    if (status.state === 'completed') {
      State.set('jobComplete', true);
    }
    
    // Wait 1 second between polls
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    return { attempt: attempts + 1, state: status.state };
  },
  max_iterations: 30 // 30 second timeout
});

const result = await pollJobStatus.execute();
console.log('Job polling result:', result.result);
```

### Nested Loops (Node.js)

```javascript
import { LoopStep, loop_types, Workflow, Step } from 'micro-flow';

const categories = ['electronics', 'clothing', 'books'];

const processCategoriesWorkflow = new Workflow({
  name: 'process-all-categories',
  steps: [
    new LoopStep({
      name: 'category-loop',
      iterable: categories,
      loop_type: loop_types.FOR_EACH,
      callable: async function() {
        const category = this.current_item;
        
        // Inner loop for items in category
        const items = await fetchItemsInCategory(category);
        const itemLoop = new LoopStep({
          name: `process-${category}-items`,
          iterable: items,
          loop_type: loop_types.FOR_EACH,
          callable: async function() {
            const item = this.current_item;
            console.log(`Processing ${item.name} in ${category}`);
            return { category, item: item.name };
          }
        });
        
        return await itemLoop.execute();
      }
    })
  ]
});

await processCategoriesWorkflow.execute();
```

### Array Filtering with Loop (Browser)

```javascript
import { LoopStep, loop_types } from './micro-flow.js';

const numbers = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
const evenNumbers = [];

const filterEvens = new LoopStep({
  name: 'filter-even-numbers',
  iterable: numbers,
  loop_type: loop_types.FOR_EACH,
  callable: async function() {
    const num = this.current_item;
    if (num % 2 === 0) {
      evenNumbers.push(num);
      return { included: true, value: num };
    }
    return { included: false, value: num };
  }
});

await filterEvens.execute();
console.log('Even numbers:', evenNumbers); // [2, 4, 6, 8, 10]
```

### Batch API Calls with Rate Limiting (Node.js)

```javascript
import { LoopStep, DelayStep, loop_types, Workflow } from 'micro-flow';

const userIds = [1, 2, 3, 4, 5];
const batchResults = [];

const batchApiWorkflow = new Workflow({
  name: 'batch-api-calls',
  steps: [
    new LoopStep({
      name: 'call-api-for-users',
      iterable: userIds,
      loop_type: loop_types.FOR_EACH,
      callable: async function() {
        const userId = this.current_item;
        
        // Make API call
        const response = await fetch(`/api/users/${userId}`);
        const data = await response.json();
        batchResults.push(data);
        
        // Rate limit: wait 500ms between calls
        if (this.current_item !== userIds[userIds.length - 1]) {
          await new DelayStep({
            name: 'rate-limit',
            relative_delay_ms: 500
          }).execute();
        }
        
        return data;
      }
    })
  ]
});

await batchApiWorkflow.execute();
console.log('Batch results:', batchResults);
```

### Countdown Timer (Browser)

```javascript
import { LoopStep, DelayStep, loop_types, State } from './micro-flow.js';

State.set('countdown', 10);

const countdownTimer = new LoopStep({
  name: 'countdown',
  loop_type: loop_types.WHILE,
  conditional: {
    subject: State.get('countdown'),
    operator: '>',
    value: 0
  },
  callable: async () => {
    const current = State.get('countdown');
    console.log(`Countdown: ${current}`);
    document.getElementById('timer').textContent = current;
    
    await new DelayStep({
      name: 'wait-1-second',
      relative_delay_ms: 1000
    }).execute();
    
    State.set('countdown', current - 1);
    return { remaining: current - 1 };
  },
  max_iterations: 20
});

await countdownTimer.execute();
console.log('Countdown complete!');
```

## Notes

- The `max_iterations` parameter prevents infinite loops by limiting the number of iterations
- In `for_each` loops, the current item is available via `this.current_item` in the callable
- In `while` loops, the condition is re-evaluated before each iteration
- The callable is automatically bound to the LoopStep instance, allowing access to instance properties
- Both loop types return an object with a message and a results array
- When using while loops, ensure the callable modifies the condition to eventually become false

## Related

- [LogicStep](logic_step.md) - Parent class providing conditional logic
- [Step](step.md) - Base step class
- [ConditionalStep](conditional_step.md) - For branching logic
- [loop_types enum](../../enums/loop_types.md) - Available loop types
- [conditional_step_comparators enum](../../enums/conditional_step_comparators.md) - Comparison operators for while loops
