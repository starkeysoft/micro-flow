# API Integration - Node.js

Building a resilient API integration with retry logic and circuit breaker pattern.

## Overview

This example demonstrates how to build a robust API integration with error handling, retries, and rate limiting.

## Code

```javascript
import { Workflow, Step, FlowControlStep, State, flow_control_types } from 'micro-flow';
import fetch from 'node-fetch';

// Initialize circuit breaker state
State.set('circuit.failures', 0);
State.set('circuit.threshold', 3);
State.set('circuit.open', false);

// API wrapper with retry logic
class APIClient {
  constructor(baseUrl, maxRetries = 3) {
    this.baseUrl = baseUrl;
    this.maxRetries = maxRetries;
  }

  async request(endpoint, options = {}) {
    const url = `${this.baseUrl}${endpoint}`;
    
    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      try {
        console.log(`Attempt ${attempt}/${this.maxRetries}: ${endpoint}`);
        
        const response = await fetch(url, options);
        
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        // Reset failures on success
        State.set('circuit.failures', 0);
        State.set('circuit.open', false);
        
        return await response.json();
      } catch (error) {
        console.error(`Attempt ${attempt} failed:`, error.message);
        
        if (attempt === this.maxRetries) {
          // Increment circuit breaker counter
          const failures = State.get('circuit.failures') + 1;
          State.set('circuit.failures', failures);
          
          if (failures >= State.get('circuit.threshold')) {
            State.set('circuit.open', true);
            console.error('Circuit breaker OPEN');
          }
          
          throw error;
        }
        
        // Exponential backoff
        await new Promise(resolve => 
          setTimeout(resolve, Math.pow(2, attempt) * 1000)
        );
      }
    }
  }
}

const api = new APIClient('https://jsonplaceholder.typicode.com');

// Create API workflow with circuit breaker
const apiWorkflow = new Workflow({
  name: 'api-integration',
  exit_on_error: false,
  steps: [
    // Check circuit breaker
    new FlowControlStep({
      name: 'circuit-breaker-check',
      conditional: {
        subject: State.get('circuit.open'),
        operator: '===',
        value: true
      },
      flow_control_type: flow_control_types.BREAK
    }),

    // Fetch users
    new Step({
      name: 'fetch-users',
      callable: async () => {
        console.log('\n--- Fetching Users ---');
        const users = await api.request('/users?_limit=5');
        State.set('api.users', users);
        console.log(`Fetched ${users.length} users`);
        return users;
      }
    }),

    // Fetch posts for first user
    new Step({
      name: 'fetch-user-posts',
      callable: async () => {
        console.log('\n--- Fetching Posts ---');
        const users = State.get('api.users');
        const userId = users[0].id;
        
        const posts = await api.request(`/posts?userId=${userId}`);
        State.set('api.posts', posts);
        console.log(`Fetched ${posts.length} posts for user ${userId}`);
        return posts;
      }
    }),

    // Fetch comments for first post
    new Step({
      name: 'fetch-post-comments',
      callable: async () => {
        console.log('\n--- Fetching Comments ---');
        const posts = State.get('api.posts');
        const postId = posts[0].id;
        
        const comments = await api.request(`/comments?postId=${postId}`);
        State.set('api.comments', comments);
        console.log(`Fetched ${comments.length} comments for post ${postId}`);
        return comments;
      }
    }),

    // Aggregate results
    new Step({
      name: 'aggregate-results',
      callable: async () => {
        console.log('\n--- Aggregating Results ---');
        
        const users = State.get('api.users');
        const posts = State.get('api.posts');
        const comments = State.get('api.comments');
        
        const summary = {
          users: users.length,
          posts: posts.length,
          comments: comments.length,
          user: users[0].name,
          post: posts[0].title
        };
        
        console.log('Summary:', summary);
        return summary;
      }
    })
  ]
});

// Execute the workflow
console.log('Starting API Integration Workflow...');

const result = await apiWorkflow.execute();

console.log('\n=== Workflow Complete ===');
console.log('Status:', result.status);
console.log('Execution time:', result.timing.execution_time_ms, 'ms');
console.log('Circuit breaker failures:', State.get('circuit.failures'));

// Test with circuit breaker open
if (State.get('circuit.open')) {
  console.log('\n=== Testing Circuit Breaker ===');
  const result2 = await apiWorkflow.execute();
  console.log('Second execution status:', result2.status);
  console.log('Note: Workflow stopped early due to circuit breaker');
}
```

## Output

```
Starting API Integration Workflow...

--- Fetching Users ---
Attempt 1/3: /users?_limit=5
Fetched 5 users

--- Fetching Posts ---
Attempt 1/3: /posts?userId=1
Fetched 10 posts for user 1

--- Fetching Comments ---
Attempt 1/3: /comments?postId=1
Fetched 5 comments for post 1

--- Aggregating Results ---
Summary: {
  users: 5,
  posts: 10,
  comments: 5,
  user: 'Leanne Graham',
  post: 'sunt aut facere repellat provident'
}

=== Workflow Complete ===
Status: complete
Execution time: 1243 ms
Circuit breaker failures: 0
```

## Key Features

- **Retry Logic**: Automatic retry with exponential backoff
- **Circuit Breaker**: Prevents cascading failures
- **Rate Limiting**: Can be added with additional flow control steps
- **Error Recovery**: Graceful degradation on failures
- **State Management**: Track API state across steps

## Advanced Usage

### Adding Rate Limiting

```javascript
import { FlowControlStep } from 'micro-flow';

State.set('rate.requests', 0);
State.set('rate.limit', 10);
State.set('rate.window', Date.now());

const rateLimiter = new FlowControlStep({
  name: 'rate-limiter',
  conditional: {
    subject: State.get('rate.requests'),
    operator: '>=',
    value: State.get('rate.limit')
  },
  flow_control_type: flow_control_types.BREAK
});
```

### Caching API Responses

```javascript
import { ConditionalStep } from 'micro-flow';

const cachedFetch = new ConditionalStep({
  name: 'cached-fetch',
  conditional: {
    subject: State.get(`cache.${endpoint}`),
    operator: '!==',
    value: null
  },
  true_callable: async () => {
    console.log('Cache hit');
    return State.get(`cache.${endpoint}`);
  },
  false_callable: async () => {
    console.log('Cache miss - fetching');
    const data = await api.request(endpoint);
    State.set(`cache.${endpoint}`, data);
    return data;
  }
});
```

## Related Examples

- [Data Processing Pipeline](data-pipeline-node.md)
- [Basic Workflow](basic-workflow-node.md)
