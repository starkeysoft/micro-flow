# Data Fetching with Vue

A Vue 3 Composition API example demonstrating advanced data fetching with workflows.

## Overview

This example shows how to build a data-fetching component with loading states, error handling, caching, and automatic retry logic using Vue 3 and micro-flow.

## Code

```vue
<template>
  <div class="data-fetcher">
    <div class="controls">
      <button @click="fetchData" :disabled="isLoading">
        {{ isLoading ? 'Loading...' : 'Fetch Data' }}
      </button>
      <button @click="refreshData" :disabled="isLoading">
        Refresh
      </button>
      <button @click="clearCache">
        Clear Cache
      </button>
    </div>

    <div v-if="error" class="error">
      <h3>Error</h3>
      <p>{{ error }}</p>
      <button @click="fetchData">Retry</button>
    </div>

    <div v-if="isLoading" class="loading">
      <div class="spinner"></div>
      <p>{{ loadingMessage }}</p>
    </div>

    <div v-if="data && !isLoading" class="data">
      <h2>Users ({{ data.length }})</h2>
      <div class="user-list">
        <div v-for="user in data" :key="user.id" class="user-card">
          <h3>{{ user.name }}</h3>
          <p>{{ user.email }}</p>
          <p class="company">{{ user.company.name }}</p>
          <button @click="fetchUserDetails(user.id)">
            View Details
          </button>
        </div>
      </div>
    </div>

    <div v-if="selectedUser" class="modal" @click="selectedUser = null">
      <div class="modal-content" @click.stop>
        <h2>{{ selectedUser.name }}</h2>
        <p><strong>Email:</strong> {{ selectedUser.email }}</p>
        <p><strong>Phone:</strong> {{ selectedUser.phone }}</p>
        <p><strong>Website:</strong> {{ selectedUser.website }}</p>
        <p><strong>Company:</strong> {{ selectedUser.company.name }}</p>
        
        <h3>Posts ({{ selectedUser.posts?.length || 0 }})</h3>
        <div v-if="selectedUser.posts" class="posts">
          <div v-for="post in selectedUser.posts" :key="post.id" class="post">
            <h4>{{ post.title }}</h4>
            <p>{{ post.body }}</p>
          </div>
        </div>

        <button @click="selectedUser = null">Close</button>
      </div>
    </div>

    <div v-if="metadata" class="metadata">
      <p><strong>Last fetched:</strong> {{ new Date(metadata.timestamp).toLocaleString() }}</p>
      <p><strong>Cache hits:</strong> {{ metadata.cacheHits }}</p>
      <p><strong>Fetch time:</strong> {{ metadata.fetchTime }}ms</p>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { Workflow, Step, ConditionalStep, State } from './micro-flow.js';

// Reactive state
const data = ref(null);
const isLoading = ref(false);
const error = ref(null);
const loadingMessage = ref('');
const selectedUser = ref(null);
const metadata = ref(null);

// Initialize cache
State.set('cache.users', null);
State.set('cache.timestamp', null);
State.set('cache.hits', 0);

// Create data fetching workflow
const createFetchWorkflow = (forceRefresh = false) => {
  return new Workflow({
    name: 'fetch-users',
    steps: [
      new ConditionalStep({
        name: 'check-cache',
        conditional: {
          subject: State.get('cache.users') !== null && !forceRefresh,
          operator: '===',
          value: true
        },
        true_callable: async () => {
          loadingMessage.value = 'Loading from cache...';
          console.log('Cache hit');
          
          const hits = State.get('cache.hits') + 1;
          State.set('cache.hits', hits);
          
          return {
            data: State.get('cache.users'),
            cached: true
          };
        },
        false_callable: async () => {
          loadingMessage.value = 'Fetching from API...';
          console.log('Cache miss - fetching from API');
          return null;
        }
      }),

      new ConditionalStep({
        name: 'fetch-from-api',
        conditional: {
          subject: State.get('cache.users') === null || forceRefresh,
          operator: '===',
          value: true
        },
        true_callable: async () => {
          const startTime = Date.now();
          
          const response = await fetch('https://jsonplaceholder.typicode.com/users');
          
          if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
          }

          const users = await response.json();
          
          // Update cache
          State.set('cache.users', users);
          State.set('cache.timestamp', Date.now());
          
          const fetchTime = Date.now() - startTime;
          
          return {
            data: users,
            cached: false,
            fetchTime
          };
        },
        false_callable: async () => {
          return {
            data: State.get('cache.users'),
            cached: true
          };
        }
      }),

      new Step({
        name: 'process-results',
        callable: async () => {
          const result = State.get('fetch.result');
          
          metadata.value = {
            timestamp: State.get('cache.timestamp'),
            cacheHits: State.get('cache.hits'),
            fetchTime: result?.fetchTime || 0
          };

          return result;
        }
      })
    ]
  });
};

// Fetch data
const fetchData = async () => {
  isLoading.value = true;
  error.value = null;

  try {
    const workflow = createFetchWorkflow();
    const result = await workflow.execute();
    
    const finalResult = result.results[result.results.length - 1].data;
    data.value = finalResult.data;
    
    State.set('fetch.result', finalResult);
  } catch (err) {
    error.value = err.message;
    console.error('Fetch error:', err);
  } finally {
    isLoading.value = false;
    loadingMessage.value = '';
  }
};

// Refresh data (bypass cache)
const refreshData = async () => {
  isLoading.value = true;
  error.value = null;

  try {
    const workflow = createFetchWorkflow(true);
    const result = await workflow.execute();
    
    const finalResult = result.results[result.results.length - 1].data;
    data.value = finalResult.data;
    
    State.set('fetch.result', finalResult);
  } catch (err) {
    error.value = err.message;
  } finally {
    isLoading.value = false;
  }
};

// Clear cache
const clearCache = () => {
  State.delete('cache.users');
  State.delete('cache.timestamp');
  State.set('cache.hits', 0);
  metadata.value = null;
  console.log('Cache cleared');
};

// Fetch user details
const fetchUserDetails = async (userId) => {
  const detailsWorkflow = new Workflow({
    name: 'fetch-user-details',
    steps: [
      new Step({
        name: 'get-user',
        callable: async () => {
          const user = data.value.find(u => u.id === userId);
          State.set('selected.user', user);
          return user;
        }
      }),
      new Step({
        name: 'fetch-posts',
        callable: async () => {
          loadingMessage.value = 'Loading user posts...';
          const response = await fetch(`https://jsonplaceholder.typicode.com/posts?userId=${userId}`);
          const posts = await response.json();
          return posts;
        }
      }),
      new Step({
        name: 'combine-data',
        callable: async () => {
          const user = State.get('selected.user');
          const posts = State.get('user.posts');
          
          return {
            ...user,
            posts
          };
        }
      })
    ]
  });

  isLoading.value = true;

  try {
    const result = await detailsWorkflow.execute();
    State.set('user.posts', result.results[1].data);
    
    const userWithPosts = {
      ...State.get('selected.user'),
      posts: State.get('user.posts')
    };
    
    selectedUser.value = userWithPosts;
  } catch (err) {
    error.value = err.message;
  } finally {
    isLoading.value = false;
    loadingMessage.value = '';
  }
};

// Auto-fetch on mount
onMounted(() => {
  fetchData();
});
</script>

<style scoped>
.data-fetcher {
  max-width: 1200px;
  margin: 20px auto;
  padding: 20px;
}

.controls {
  display: flex;
  gap: 10px;
  margin-bottom: 20px;
}

button {
  padding: 10px 20px;
  border: none;
  border-radius: 4px;
  background: #42b983;
  color: white;
  cursor: pointer;
  font-size: 14px;
}

button:hover {
  background: #359268;
}

button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.error {
  padding: 20px;
  background: #ffebee;
  color: #c62828;
  border-radius: 4px;
  margin-bottom: 20px;
}

.loading {
  text-align: center;
  padding: 40px;
}

.spinner {
  width: 40px;
  height: 40px;
  border: 4px solid #f3f3f3;
  border-top: 4px solid #42b983;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin: 0 auto 20px;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.user-list {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
  gap: 20px;
}

.user-card {
  padding: 20px;
  border: 1px solid #ddd;
  border-radius: 8px;
  background: white;
}

.user-card h3 {
  margin-top: 0;
  color: #2c3e50;
}

.company {
  color: #666;
  font-size: 14px;
}

.modal {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal-content {
  background: white;
  padding: 30px;
  border-radius: 8px;
  max-width: 600px;
  max-height: 80vh;
  overflow-y: auto;
}

.posts {
  margin-top: 20px;
}

.post {
  padding: 15px;
  background: #f5f5f5;
  border-radius: 4px;
  margin-bottom: 10px;
}

.post h4 {
  margin-top: 0;
}

.metadata {
  margin-top: 20px;
  padding: 15px;
  background: #f5f5f5;
  border-radius: 4px;
  font-size: 14px;
}
</style>
```

## Key Features

- **Intelligent caching** with automatic cache management
- **Loading states** with progress messages
- **Error handling** with retry capability
- **Nested workflows** for fetching related data
- **Cache statistics** tracking
- **Force refresh** option
- **Modal details view** with additional data fetching

## Related Examples

- [React Form Workflow](form-workflow-react.md)
- [API Integration (Node.js)](api-integration-node.md)
