# Callables

In Micro Flow, a **callable** is the executable action associated with a step. Callables define what happens when a step runs and can take multiple forms, providing flexibility in how you structure your workflows.

## What is a Callable?

A callable is the `callable` property passed to a Step constructor. It determines what code executes when the step runs. Callables can be:

1. **Async Functions** - Simple async functions
2. **Steps** - Other Step instances (composition)
3. **Workflows** - Entire Workflow instances (sub-workflows)

## Async Function Callables

The most common callable type is an async function:

```javascript
const step = new Step({
  name: 'Fetch User',
  type: StepTypes.ACTION,
  callable: async (state, step) => {
    const response = await fetch('/api/user');
    return response.json();
  }
});
```

### Accessing Workflow and Step State

Async function callables receive a context object with `workflow` and `step` properties:

```javascript
const step = new Step({
  name: 'Process Data',
  type: StepTypes.ACTION,
  callable: async (state, step) => {
    // Access workflow state
    const userId = state.get('userId');
    
    // Fetch data
    const data = await fetchUserData(userId);
    
    // Update workflow state
    state.set('userData', data);
    
    // Access step properties
    const stepName = step.state.get('name');
    
    return data;
  }
});
```

> **Note**: Callables receive two parameters: `state` (the global state singleton) and `step` (the current Step instance).

### Accessing Previous Step Data

Steps can access data from previous steps through the workflow state. Each step stores its execution result in the workflow's `output_data` array, and you can also access steps by their ID:

```javascript
const workflow = new Workflow({ name: 'Data Pipeline' });

workflow.pushSteps([
  new Step({
    name: 'Fetch Data',
    type: StepTypes.ACTION,
    callable: async (state, step) => {
      const data = { id: 123, name: 'John' };
      // Store in workflow state for later access
      state.set('userData', data);
      return data;
    }
  }),
  new Step({
    name: 'Transform Data',
    type: StepTypes.ACTION,
    callable: async (state, step) => {
      // Access data from workflow state
      const userData = state.get('userData');
      
      // Or access output_data array from previous steps
      const outputData = state.get('output_data');
      const previousResult = outputData[outputData.length - 1];
      
      return {
        ...userData,
        transformed: true,
        timestamp: Date.now()
      };
    }
  }),
  new Step({
    name: 'Save Data',
    type: StepTypes.ACTION,
    callable: async (state, step) => {
      const transformedData = state.get('userData');
      await saveToDatabase(transformedData);
      return { saved: true };
    }
  })
]);

await workflow.execute();
```

You can also access steps by their ID using `steps_by_id`:

```javascript
const step = new Step({
  name: 'Access Specific Step',
  type: StepTypes.ACTION,
  callable: async (state, step) => {
    // Get a specific step by its ID
    const stepsById = state.get('steps_by_id');
    const specificStep = stepsById['some-step-id'];
    const stepResult = specificStep.state.get('result');
    
    return stepResult;
  }
});
```

## Step Callables

You can use a Step instance as a callable for another Step:

```javascript
const fetchStep = new Step({
  name: 'Fetch User',
  type: StepTypes.ACTION,
  callable: async () => {
    const response = await fetch('/api/user');
    return response.json();
  }
});

const wrapperStep = new Step({
  name: 'Wrapped Fetch',
  type: StepTypes.ACTION,
  callable: fetchStep // Step as callable
});

await wrapperStep.execute();
```

This is useful for:
- Reusing step definitions
- Composing complex steps from simpler ones
- Creating step templates

## Workflow Callables

Workflows can be used as callables, creating **sub-workflows**:

```javascript
// Create a reusable sub-workflow
const validationWorkflow = new Workflow({ name: 'Validation' });
validationWorkflow.pushSteps([
  new Step({
    name: 'Check Required Fields',
    type: StepTypes.ACTION,
    callable: async function() {
      const data = this.state.get('inputData');
      if (!data.email || !data.name) {
        throw new Error('Missing required fields');
      }
      return data;
    }
  }),
  new Step({
    name: 'Validate Email',
    type: StepTypes.ACTION,
    callable: async function() {
      const data = this.state.get('inputData');
      if (!data.email.includes('@')) {
        throw new Error('Invalid email');
      }
      this.state.set('isValid', true);
      return data;
    }
  })
]);

// Use it as a callable in a step
const mainWorkflow = new Workflow({ name: 'Main Process' });
mainWorkflow.state.set('inputData', { email: 'user@example.com', name: 'John' });

mainWorkflow.pushSteps([
  new Step({
    name: 'Validate Input',
    type: StepTypes.ACTION,
    callable: validationWorkflow // Workflow as callable
  }),
  new Step({
    name: 'Process Valid Data',
    type: StepTypes.ACTION,
    callable: async (state, step) => {
      const data = state.get('inputData');
      return await processData(data);
    }
  })
]);

await mainWorkflow.execute();
```

### Sub-Workflow Benefits

Using workflows as callables provides:

1. **Modularity** - Break complex processes into manageable sub-workflows
2. **Reusability** - Share common workflows across multiple steps
3. **Encapsulation** - Isolate concerns and maintain clean separation
4. **Testing** - Test sub-workflows independently

## Callable Context

### The Context Object

Callables receive a context object as their first parameter with `workflow` and `step` properties:

```javascript
const step = new Step({
  name: 'Access Context',
  type: StepTypes.ACTION,
  callable: async (state, step) => {
    // workflow - The parent workflow's state object
    // step - The current Step instance
    
    const config = state.get('config');
    state.set('result', 'processed');
    
    // Access step properties
    const stepName = step.state.get('name');
    const stepStatus = step.state.get('status');
    
    return { success: true, stepName };
  }
});
```

### Context Object Properties

The context object passed to callables contains:

- **`workflow`** - The parent workflow's state object (WorkflowState instance)
  - Access with `state.get(key)` and `state.set(key, value)`
  - Contains all workflow-level data and step results
  
- **`step`** - The current Step instance
  - Access step state with `step.state.get(key)`
  - Access step events with `step.events`
  - Useful for accessing step-specific data like loop iteration info

```javascript
const step = new Step({
  name: 'Use Context',
  type: StepTypes.ACTION,
  callable: async (state, step) => {
    // Workflow state access
    const userId = state.get('userId');
    const previousStepResults = state.get('output_data');
    
    // Step state access
    const stepId = step.state.get('id');
    const stepType = step.state.get('type');
    
    return { userId, stepId };
  }
});
```

> **Best Practice**: Both arrow functions and regular functions work the same way since the context is passed as a parameter, not through `this` binding.

## Callable Return Values

Callables should return values that are stored in the workflow's `output_data` array. Subsequent steps can access these results through the workflow state:

```javascript
workflow.pushSteps([
  new Step({
    name: 'Step 1',
    type: StepTypes.ACTION,
    callable: async (state, step) => {
      return { userId: 123 }; // Stored in output_data
    }
  }),
  new Step({
    name: 'Step 2',
    type: StepTypes.ACTION,
    callable: async (state, step) => {
      // Access previous step's result from output_data
      const outputData = state.get('output_data');
      const previousResult = outputData[outputData.length - 1]?.result;
      
      return { userId: previousResult.userId, name: 'John' };
    }
  }),
  new Step({
    name: 'Step 3',
    type: StepTypes.ACTION,
    callable: async (state, step) => {
      // Access any previous step's result
      const outputData = state.get('output_data');
      const step2Result = outputData[1]?.result; // Index 1 = Step 2
      
      console.log(step2Result.name); // "John"
      return step2Result;
    }
  })
]);
```

## Specialized Step Callables

Some step types have specialized callable behavior:

### ConditionalStep

```javascript
const conditional = new ConditionalStep({
  subject: () => user.age,
  operator: '>=',
  value: 18,
  step_left: new Step({ // Executed if condition is true
    name: 'Adult Process',
    type: StepTypes.ACTION,
    callable: async () => processAdult()
  }),
  step_right: new Step({ // Executed if condition is false
    name: 'Minor Process',
    type: StepTypes.ACTION,
    callable: async () => processMinor()
  })
});
```

### LoopStep

```javascript
const loopBody = new Step({
  name: 'Process Item',
  type: StepTypes.ACTION,
  callable: async (state, step) => {
    // Access current iteration data from the parent loop step's state
    // Note: In a loop, you'd typically access this from the loop step context
    const currentItem = step.state.get('current_item');
    return await processItem(currentItem);
  }
});

const loop = new LoopStep({
  name: 'Process Items',
  loop_type: LoopTypes.FOR_EACH,
  iterable: items,
  callable: loopBody // Step or Workflow executed for each iteration
});
```

### SwitchStep with Case

```javascript
const switchStep = new SwitchStep({
  name: 'Route Request',
  cases: [
    new Case({
      subject: () => request.method,
      operator: '===',
      value: 'GET',
      callable: async () => handleGet() // Function callable
    }),
    new Case({
      subject: () => request.method,
      operator: '===',
      value: 'POST',
      callable: postWorkflow // Workflow callable
    }),
    new Case({
      subject: () => request.method,
      operator: '===',
      value: 'PUT',
      callable: putStep // Step callable
    })
  ]
});
```

## Error Handling in Callables

Callables can throw errors that will be caught by the step:

```javascript
const step = new Step({
  name: 'Validate Data',
  type: StepTypes.ACTION,
  callable: async ({ workflow, step }, data) => {
    if (!data.valid) {
      throw new Error('Invalid data');
    }
    
    try {
      return await processData(data);
    } catch (error) {
      // Handle or re-throw
      state.set('error', error);
      throw error;
    }
  }
});
```

When a callable throws an error:
1. The step is marked as `FAILED`
2. A `STEP_FAILED` event is emitted
3. The workflow stops (if `exit_on_failure` is true)
4. The error is propagated up

## Async Operations in Callables

Callables are always async and can perform any async operation:

```javascript
const asyncStep = new Step({
  name: 'Multiple Async Operations',
  type: StepTypes.ACTION,
  callable: async () => {
    // Sequential async operations
    const user = await fetchUser();
    const posts = await fetchUserPosts(user.id);
    const comments = await fetchPostComments(posts);
    
    // Parallel async operations
    const [profile, settings, stats] = await Promise.all([
      fetchProfile(user.id),
      fetchSettings(user.id),
      fetchStats(user.id)
    ]);
    
    return {
      user,
      posts,
      comments,
      profile,
      settings,
      stats
    };
  }
});
```

## Callable Best Practices

### 1. Keep Callables Focused

Each callable should have a single responsibility:

```javascript
// Good: Focused callable
const fetchStep = new Step({
  name: 'Fetch User',
  type: StepTypes.ACTION,
  callable: async (userId) => {
    return await fetchUser(userId);
  }
});

// Bad: Doing too much
const megaStep = new Step({
  name: 'Do Everything',
  type: StepTypes.ACTION,
  callable: async () => {
    const user = await fetchUser();
    const validated = await validateUser(user);
    const transformed = await transformUser(validated);
    await saveUser(transformed);
    await sendEmail(user);
    // Too much!
  }
});
```

### 2. Use Workflow State for Shared Data

```javascript
workflow.pushSteps([
  new Step({
    name: 'Set Config',
    type: StepTypes.ACTION,
    callable: async (state, step) => {
      state.set('apiUrl', 'https://api.example.com');
      state.set('timeout', 5000);
    }
  }),
  new Step({
    name: 'Use Config',
    type: StepTypes.ACTION,
    callable: async (state, step) => {
      const url = state.get('apiUrl');
      const timeout = state.get('timeout');
      return await fetch(url, { timeout });
    }
  })
]);
```

### 3. Return Meaningful Values

```javascript
// Good: Descriptive return value
const goodStep = new Step({
  name: 'Process Order',
  type: StepTypes.ACTION,
  callable: async (order) => {
    const processed = await processOrder(order);
    return {
      orderId: order.id,
      status: 'processed',
      timestamp: Date.now(),
      result: processed
    };
  }
});

// Bad: Unclear return value
const badStep = new Step({
  name: 'Process Order',
  type: StepTypes.ACTION,
  callable: async (order) => {
    await processOrder(order);
    return true; // What does this mean?
  }
});
```

### 4. Handle Errors Appropriately

```javascript
const robustStep = new Step({
  name: 'Robust Operation',
  type: StepTypes.ACTION,
  callable: async ({ workflow, step }, data) => {
    try {
      const result = await riskyOperation(data);
      return { success: true, result };
    } catch (error) {
      // Log error to workflow state
      state.set('lastError', {
        step: 'Robust Operation',
        error: error.message,
        timestamp: Date.now()
      });
      
      // Decide whether to throw or handle gracefully
      if (error.critical) {
        throw error; // Stop workflow
      } else {
        return { success: false, error: error.message }; // Continue workflow
      }
    }
  }
});
```

### 5. Use Sub-Workflows for Complexity

```javascript
// Break complex logic into sub-workflows
const validationWorkflow = new Workflow({ name: 'Validation' });
validationWorkflow.pushSteps([
  new Step({ name: 'Check Schema', type: StepTypes.ACTION, callable: checkSchema }),
  new Step({ name: 'Check Business Rules', type: StepTypes.ACTION, callable: checkRules }),
  new Step({ name: 'Check Permissions', type: StepTypes.ACTION, callable: checkPerms })
]);

const processingWorkflow = new Workflow({ name: 'Processing' });
processingWorkflow.pushSteps([
  new Step({ name: 'Transform', type: StepTypes.ACTION, callable: transform }),
  new Step({ name: 'Enrich', type: StepTypes.ACTION, callable: enrich }),
  new Step({ name: 'Save', type: StepTypes.ACTION, callable: save })
]);

// Use sub-workflows in main workflow
const mainWorkflow = new Workflow({ name: 'Main' });
mainWorkflow.pushSteps([
  new Step({ name: 'Validate', type: StepTypes.ACTION, callable: validationWorkflow }),
  new Step({ name: 'Process', type: StepTypes.ACTION, callable: processingWorkflow })
]);
```

## Common Patterns

### Factory Pattern for Callables

```javascript
function createApiCallable(endpoint, method = 'GET') {
  return async (state, step) => {
    const baseUrl = state.get('apiUrl');
    const response = await fetch(`${baseUrl}${endpoint}`, { method });
    return response.json();
  };
}

workflow.pushSteps([
  new Step({
    name: 'Fetch Users',
    type: StepTypes.ACTION,
    callable: createApiCallable('/users', 'GET')
  }),
  new Step({
    name: 'Fetch Posts',
    type: StepTypes.ACTION,
    callable: createApiCallable('/posts', 'GET')
  })
]);
```

### Retry Pattern

```javascript
function createRetryCallable(fn, maxRetries = 3) {
  return async (context, ...args) => {
    let lastError;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await fn(context, ...args);
      } catch (error) {
        lastError = error;
        console.log(`Attempt ${attempt} failed, retrying...`);
        await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
      }
    }
    
    throw lastError;
  };
}

const step = new Step({
  name: 'Fetch with Retry',
  type: StepTypes.ACTION,
  callable: createRetryCallable(async (state, step) => {
    const response = await fetch('https://api.example.com/data');
    return response.json();
  })
});
```

### Middleware Pattern

```javascript
function withLogging(callable) {
  return async (context, ...args) => {
    const { workflow, step } = context;
    console.log(`Starting: ${step.state?.get('name')}`);
    const startTime = Date.now();
    
    try {
      const result = await callable(context, ...args);
      console.log(`Completed in ${Date.now() - startTime}ms`);
      return result;
    } catch (error) {
      console.error(`Failed after ${Date.now() - startTime}ms`);
      throw error;
    }
  };
}

const step = new Step({
  name: 'Logged Operation',
  type: StepTypes.ACTION,
  callable: withLogging(async (state, step) => {
    return await performOperation();
  })
});
```

## See Also

- [Steps](./steps.md) - Understanding step types and execution
- [Workflows](./workflows.md) - How workflows orchestrate callables
- [State Management](./state-management.md) - Accessing workflow state in callables
- [Step Class API](../api/classes/step.md) - Detailed step API documentation
- [Workflow Class API](../api/classes/workflow.md) - Detailed workflow API documentation
