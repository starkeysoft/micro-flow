# API Request Workflow (Backend)

This example demonstrates how to use Micro Flow to orchestrate a multi-step API request workflow with authentication, data fetching, transformation, and error handling.

## Use Case

Building a backend service that:
1. Authenticates with an external API
2. Fetches user data
3. Fetches additional details from multiple endpoints
4. Transforms and aggregates the data
5. Saves to a database

## Full Implementation

```javascript
import { Workflow, Step, StepTypes, DelayStep, ConditionalStep } from 'micro-flow';

// Simulated API client
class APIClient {
  constructor() {
    this.token = null;
  }
  
  async authenticate(apiKey) {
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 100));
    this.token = `token_${Date.now()}`;
    return this.token;
  }
  
  async fetchUser(userId) {
    if (!this.token) throw new Error('Not authenticated');
    await new Promise(resolve => setTimeout(resolve, 150));
    return {
      id: userId,
      name: 'John Doe',
      email: 'john@example.com',
      accountType: 'premium'
    };
  }
  
  async fetchUserOrders(userId) {
    await new Promise(resolve => setTimeout(resolve, 100));
    return [
      { id: 1, amount: 99.99, status: 'completed' },
      { id: 2, amount: 149.99, status: 'pending' }
    ];
  }
  
  async fetchUserPreferences(userId) {
    await new Promise(resolve => setTimeout(resolve, 80));
    return {
      notifications: true,
      theme: 'dark',
      language: 'en'
    };
  }
}

// Database simulation
class Database {
  static async saveUserData(data) {
    await new Promise(resolve => setTimeout(resolve, 50));
    console.log('Saved to database:', data);
    return { id: data.userId, saved: true };
  }
}

// Create the workflow
async function createUserDataWorkflow(userId, apiKey) {
  const client = new APIClient();
  const workflow = new Workflow({
    name: 'User Data Collection',
    exit_on_failure: false
  });
  
  // Step 1: Authenticate
  const authStep = new Step({
    name: 'Authenticate',
    type: StepTypes.ACTION,
    callable: async function() {
      console.log('Authenticating...');
      const token = await client.authenticate(apiKey);
      this.workflow.set('authToken', token);
      this.workflow.set('userId', userId);
      return { authenticated: true, token };
    }
  });
  
  // Step 2: Fetch user data
  const fetchUserStep = new Step({
    name: 'Fetch User',
    type: StepTypes.ACTION,
    callable: async function() {
      const userId = this.workflow.get('userId');
      console.log(`Fetching user ${userId}...`);
      const user = await client.fetchUser(userId);
      this.workflow.set('userData', user);
      return user;
    }
  });
  
  // Step 3: Check if premium user (conditional processing)
  const checkPremiumStep = new ConditionalStep({
    name: 'Check Premium Status',
    subject: function() { return this.workflow.get('userData')?.accountType; },
    operator: '===',
    value: 'premium',
    step_left: new Step({
      name: 'Fetch Premium Data',
      type: StepTypes.ACTION,
      callable: async function() {
        const userId = this.workflow.get('userId');
        console.log('Fetching premium user data...');
        
        // Fetch additional data for premium users
        const [orders, preferences] = await Promise.all([
          client.fetchUserOrders(userId),
          client.fetchUserPreferences(userId)
        ]);
        
        this.workflow.set('orders', orders);
        this.workflow.set('preferences', preferences);
        
        return { orders, preferences };
      }
    }),
    step_right: new Step({
      name: 'Skip Premium Data',
      type: StepTypes.ACTION,
      callable: async function() {
        console.log('Standard user - skipping premium data');
        this.workflow.set('orders', []);
        this.workflow.set('preferences', {});
        return { message: 'Standard user' };
      }
    })
  });
  
  // Step 4: Transform and aggregate data
  const transformStep = new Step({
    name: 'Transform Data',
    type: StepTypes.ACTION,
    callable: async function() {
      console.log('Transforming data...');
      
      const userData = this.workflow.get('userData');
      const orders = this.workflow.get('orders') || [];
      const preferences = this.workflow.get('preferences') || {};
      
      const aggregated = {
        userId: userData.id,
        profile: {
          name: userData.name,
          email: userData.email,
          accountType: userData.accountType
        },
        stats: {
          totalOrders: orders.length,
          totalSpent: orders.reduce((sum, order) => sum + order.amount, 0),
          pendingOrders: orders.filter(o => o.status === 'pending').length
        },
        preferences,
        lastUpdated: new Date().toISOString()
      };
      
      this.workflow.set('aggregatedData', aggregated);
      return aggregated;
    }
  });
  
  // Step 5: Save to database
  const saveStep = new Step({
    name: 'Save to Database',
    type: StepTypes.ACTION,
    callable: async function() {
      console.log('Saving to database...');
      const data = this.workflow.get('aggregatedData');
      const result = await Database.saveUserData(data);
      return result;
    }
  });
  
  // Add error handling
  workflow.events.on('WORKFLOW_ERRORED', (data) => {
    console.error('Workflow failed:', data.error.message);
    // Could send alert, log to monitoring service, etc.
  });
  
  workflow.events.on('STEP_FAILED', (data) => {
    console.error(`Step "${data.step.state.get('name')}" failed:`, data.error);
  });
  
  // Monitor progress
  workflow.events.on('STEP_COMPLETED', (data) => {
    const stepName = data.step.state.get('name');
    const duration = data.step.state.get('execution_time_ms');
    console.log(`✓ ${stepName} completed in ${duration}ms`);
  });
  
  // Build workflow
  workflow.pushSteps([
    authStep,
    fetchUserStep,
    checkPremiumStep,
    transformStep,
    saveStep
  ]);
  
  return workflow;
}

// Execute the workflow
async function main() {
  const userId = 12345;
  const apiKey = 'test_api_key_12345';
  
  console.log('=== Starting User Data Collection Workflow ===\n');
  
  const workflow = await createUserDataWorkflow(userId, apiKey);
  
  try {
    const result = await workflow.execute();
    
    console.log('\n=== Workflow Completed ===');
    console.log('Total execution time:', result.state.get('execution_time_ms'), 'ms');
    console.log('Final data:', result.state.get('aggregatedData'));
    
  } catch (error) {
    console.error('\n=== Workflow Failed ===');
    console.error('Error:', error.message);
  }
}

// Run it
main().catch(console.error);
```

## Output

```
=== Starting User Data Collection Workflow ===

Authenticating...
✓ Authenticate completed in 102ms
Fetching user 12345...
✓ Fetch User completed in 151ms
Fetching premium user data...
✓ Fetch Premium Data completed in 152ms
✓ Check Premium Status completed in 153ms
Transforming data...
✓ Transform Data completed in 1ms
Saving to database...
Saved to database: { userId: 12345, profile: {...}, stats: {...}, ... }
✓ Save to Database completed in 51ms

=== Workflow Completed ===
Total execution time: 612 ms
Final data: {
  userId: 12345,
  profile: {
    name: 'John Doe',
    email: 'john@example.com',
    accountType: 'premium'
  },
  stats: {
    totalOrders: 2,
    totalSpent: 249.98,
    pendingOrders: 1
  },
  preferences: { notifications: true, theme: 'dark', language: 'en' },
  lastUpdated: '2025-11-16T...'
}
```

## Key Features Demonstrated

1. **Sequential API Calls** - Steps execute in order with proper authentication
2. **Conditional Logic** - Different processing for premium vs standard users
3. **State Management** - Data flows between steps via workflow state
4. **Error Handling** - Comprehensive error tracking and logging
5. **Performance Monitoring** - Track execution time for each step
6. **Async Operations** - All steps properly handle promises
7. **Data Aggregation** - Combine data from multiple sources

## Error Handling

```javascript
// Add retry logic to a step
const fetchWithRetry = new Step({
  name: 'Fetch with Retry',
  type: StepTypes.ACTION,
  callable: async function() {
    let attempts = 0;
    const maxAttempts = 3;
    
    while (attempts < maxAttempts) {
      try {
        return await client.fetchUser(this.workflow.get('userId'));
      } catch (error) {
        attempts++;
        if (attempts === maxAttempts) throw error;
        console.log(`Attempt ${attempts} failed, retrying...`);
        await new Promise(resolve => setTimeout(resolve, 1000 * attempts));
      }
    }
  }
});
```

## Adding Rate Limiting

```javascript
import { DelayStep, DelayTypes } from 'micro-flow';

// Add delays between API calls to respect rate limits
workflow.pushSteps([
  authStep,
  new DelayStep({ name: 'Rate Limit Delay', delay_duration: 500, delay_type: DelayTypes.RELATIVE }),
  fetchUserStep,
  new DelayStep({ name: 'Rate Limit Delay', delay_duration: 500, delay_type: DelayTypes.RELATIVE }),
  checkPremiumStep
]);
```

## Use Cases

- **Data Aggregation Services** - Collect data from multiple APIs
- **ETL Pipelines** - Extract, transform, and load data
- **Microservice Orchestration** - Coordinate multiple service calls
- **Background Jobs** - Process queued tasks with multiple steps
- **Webhook Handlers** - Handle incoming webhooks with multi-step processing

## See Also

- [Data Processing Pipeline](./data-pipeline.md)
- [Conditional Steps](../../step-types/conditional-step.md)
- [Error Handling](../../advanced/error-handling.md)
