# Data Fetching — Vue 3

Demonstrates using `Workflow`, `Step`, `LoopStep`, and `State` in a Vue 3 Composition API component to manage asynchronous data fetching, transformation, and reactive UI updates. Events from the library drive Vue's reactive state.

## Overview

You will learn:
- Integrating `Workflow` in a Vue 3 `<script setup>` component
- Driving Vue `ref` and `reactive` values from workflow step events
- Using `LoopStep` to process a paginated API collection
- Storing fetched data in `State` and reading it in the component
- Handling loading, error, and success UI states
- Cleaning up event listeners with `onUnmounted`

## Complete Example

```vue
<!-- UserDirectory.vue -->
<template>
  <div class="user-directory">
    <header>
      <h1>User Directory</h1>
      <button :disabled="loading" @click="loadUsers">
        {{ loading ? 'Loading…' : 'Refresh' }}
      </button>
    </header>

    <!-- Progress bar -->
    <div v-if="loading" class="progress">
      <div class="progress-bar" :style="{ width: progress + '%' }"></div>
      <span>{{ statusMessage }}</span>
    </div>

    <!-- Error state -->
    <div v-if="error" class="error-banner">
      <strong>Error:</strong> {{ error }}
      <button @click="clearError">Dismiss</button>
    </div>

    <!-- Stats -->
    <div v-if="!loading && stats.total > 0" class="stats">
      <div class="stat">
        <span class="stat-value">{{ stats.total }}</span>
        <span class="stat-label">Users</span>
      </div>
      <div class="stat">
        <span class="stat-value">{{ stats.active }}</span>
        <span class="stat-label">Active</span>
      </div>
      <div class="stat">
        <span class="stat-value">{{ Object.keys(stats.byDepartment).length }}</span>
        <span class="stat-label">Departments</span>
      </div>
    </div>

    <!-- User grid -->
    <div v-if="users.length > 0" class="user-grid">
      <div
        v-for="user in filteredUsers"
        :key="user.id"
        class="user-card"
        :class="{ inactive: !user.isActive }"
      >
        <div class="avatar">{{ user.initials }}</div>
        <div class="user-info">
          <strong>{{ user.displayName }}</strong>
          <span>{{ user.email }}</span>
          <span class="department">{{ user.department }}</span>
        </div>
        <span class="badge" :class="user.isActive ? 'active' : 'inactive'">
          {{ user.isActive ? 'Active' : 'Inactive' }}
        </span>
      </div>
    </div>

    <!-- Empty state -->
    <div v-else-if="!loading && !error" class="empty-state">
      <p>No users loaded. Click Refresh to fetch data.</p>
    </div>

    <!-- Filter -->
    <div v-if="users.length > 0" class="filters">
      <label>
        <input v-model="showInactive" type="checkbox" />
        Show inactive users
      </label>
      <input v-model="search" type="text" placeholder="Search by name or email…" />
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, onUnmounted } from 'vue';
import {
  Workflow,
  Step,
  LoopStep,
  State,
  loop_types,
  workflow_event_names,
  step_event_names,
} from '@ronaldroe/micro-flow';

// ─── Reactive state ──────────────────────────────────────────────────────────

const users         = ref([]);
const loading       = ref(false);
const error         = ref(null);
const statusMessage = ref('');
const progress      = ref(0);
const showInactive  = ref(false);
const search        = ref('');

const stats = reactive({
  total: 0,
  active: 0,
  byDepartment: {},
});

// ─── Computed ─────────────────────────────────────────────────────────────────

const filteredUsers = computed(() => {
  let result = users.value;

  if (!showInactive.value) {
    result = result.filter((u) => u.isActive);
  }

  if (search.value.trim()) {
    const q = search.value.toLowerCase();
    result = result.filter(
      (u) =>
        u.displayName.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q)
    );
  }

  return result;
});

// ─── Event listeners ─────────────────────────────────────────────────────────

const wfEvents   = State.get('events.workflow');
const stepEvents = State.get('events.step');

function onWorkflowRunning() {
  loading.value       = true;
  error.value         = null;
  progress.value      = 0;
  statusMessage.value = 'Starting…';
}

function onWorkflowComplete() {
  loading.value       = false;
  progress.value      = 100;
  statusMessage.value = 'Done';

  // Read final data from State
  const fetched = State.get('users.processed') ?? [];
  users.value   = fetched;

  stats.total        = fetched.length;
  stats.active       = fetched.filter((u) => u.isActive).length;
  stats.byDepartment = fetched.reduce((acc, u) => {
    acc[u.department] = (acc[u.department] ?? 0) + 1;
    return acc;
  }, {});
}

function onWorkflowFailed(data) {
  loading.value = false;
  error.value   = data?.errors?.[0]?.message ?? 'An unexpected error occurred';
}

function onStepComplete(data) {
  const stepOrder = ['fetch-users', 'validate', 'process-users', 'compute-stats'];
  const idx       = stepOrder.indexOf(data.name);
  if (idx >= 0) {
    progress.value      = Math.round(((idx + 1) / stepOrder.length) * 90);
    statusMessage.value = data.name.replace(/-/g, ' ');
  }
}

function onLoopIteration(data) {
  if (data.name === 'process-users') {
    const total = State.get('users.raw')?.length ?? 1;
    const done  = State.get('users.processedCount') ?? 0;
    progress.value = Math.round(20 + (done / total) * 50);
  }
}

// Register event listeners
wfEvents.on(workflow_event_names.WORKFLOW_RUNNING,  onWorkflowRunning);
wfEvents.on(workflow_event_names.WORKFLOW_COMPLETE, onWorkflowComplete);
wfEvents.on(workflow_event_names.WORKFLOW_FAILED,   onWorkflowFailed);
stepEvents.on(step_event_names.STEP_COMPLETE,           onStepComplete);
stepEvents.on(step_event_names.LOOP_ITERATION_COMPLETE, onLoopIteration);

// Clean up on component unmount
onUnmounted(() => {
  wfEvents.off(workflow_event_names.WORKFLOW_RUNNING,  onWorkflowRunning);
  wfEvents.off(workflow_event_names.WORKFLOW_COMPLETE, onWorkflowComplete);
  wfEvents.off(workflow_event_names.WORKFLOW_FAILED,   onWorkflowFailed);
  stepEvents.off(step_event_names.STEP_COMPLETE,           onStepComplete);
  stepEvents.off(step_event_names.LOOP_ITERATION_COMPLETE, onLoopIteration);
});

// ─── Workflow ─────────────────────────────────────────────────────────────────

async function loadUsers() {
  const wf = new Workflow({
    name: 'load-users',
    exit_on_error: true,
    steps: [
      // Step 1: Fetch raw user list from API
      new Step({
        name: 'fetch-users',
        max_retries: 3,
        max_timeout_ms: 10000,
        callable: async function () {
          statusMessage.value = 'Fetching users…';
          const res = await fetch('https://jsonplaceholder.typicode.com/users');
          if (!res.ok) throw new Error(`API error: ${res.status}`);
          const raw = await res.json();
          this.setState('users.raw', raw);
          return { count: raw.length };
        },
      }),

      // Step 2: Validate response
      new Step({
        name: 'validate',
        callable: async function () {
          const raw = this.getState('users.raw');
          if (!Array.isArray(raw) || raw.length === 0) {
            throw new Error('API returned no users');
          }
          return { valid: true, count: raw.length };
        },
      }),

      // Step 3: Process each user with LoopStep
      new LoopStep({
        name: 'process-users',
        loop_type: loop_types.FOR_EACH,
        iterable: () => State.get('users.raw') ?? [],
        callable: async function () {
          const u = this.current_item;

          const processed = {
            id:          u.id,
            displayName: u.name,
            email:       u.email.toLowerCase(),
            initials:    u.name.split(' ').map((p) => p[0]).join('').toUpperCase().slice(0, 2),
            department:  u.company?.name ?? 'Unknown',
            isActive:    u.id % 3 !== 0, // simulate some inactive users
            location:    u.address?.city ?? 'Unknown',
          };

          const list = this.getState('users.processed') ?? [];
          this.setState('users.processed', [...list, processed]);

          const done = (this.getState('users.processedCount') ?? 0) + 1;
          this.setState('users.processedCount', done);

          return processed;
        },
      }),

      // Step 4: Compute statistics
      new Step({
        name: 'compute-stats',
        callable: async function () {
          const processed = this.getState('users.processed') ?? [];

          const byDept = processed.reduce((acc, u) => {
            acc[u.department] = (acc[u.department] ?? 0) + 1;
            return acc;
          }, {});

          const statsData = {
            total:        processed.length,
            active:       processed.filter((u) => u.isActive).length,
            byDepartment: byDept,
          };

          this.setState('users.stats', statsData);
          return statsData;
        },
      }),
    ],
  });

  await wf.execute();
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function clearError() {
  error.value = null;
}

// Load on mount
onMounted(() => loadUsers());
</script>

<style scoped>
.user-directory { max-width: 900px; margin: 0 auto; padding: 24px; font-family: system-ui; }
header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px; }
.progress { background: #f0f0f0; border-radius: 8px; overflow: hidden; margin-bottom: 16px; }
.progress-bar { height: 4px; background: #6366f1; transition: width 0.3s; }
.error-banner { background: #fee2e2; color: #b91c1c; padding: 12px 16px; border-radius: 8px; margin-bottom: 16px; display: flex; justify-content: space-between; }
.stats { display: flex; gap: 24px; margin-bottom: 24px; }
.stat { text-align: center; }
.stat-value { font-size: 32px; font-weight: bold; display: block; }
.stat-label { font-size: 12px; color: #666; text-transform: uppercase; }
.user-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 16px; }
.user-card { border: 1px solid #e5e7eb; border-radius: 12px; padding: 16px; display: flex; align-items: center; gap: 12px; }
.user-card.inactive { opacity: 0.6; }
.avatar { width: 40px; height: 40px; border-radius: 50%; background: #6366f1; color: #fff; display: flex; align-items: center; justify-content: center; font-weight: bold; flex-shrink: 0; }
.user-info { flex: 1; display: flex; flex-direction: column; font-size: 13px; }
.department { color: #6b7280; font-size: 12px; }
.badge { padding: 2px 8px; border-radius: 12px; font-size: 12px; }
.badge.active { background: #d1fae5; color: #065f46; }
.badge.inactive { background: #f3f4f6; color: #6b7280; }
.filters { margin-top: 24px; display: flex; gap: 16px; align-items: center; }
.empty-state { text-align: center; padding: 48px; color: #9ca3af; }
</style>
```

## Key Concepts

### Event-Driven Reactivity

Vue's reactive refs are updated inside event handlers registered on `State.get('events.workflow')` and `State.get('events.step')`. This separates the async logic (in the workflow) from the UI updates (in Vue).

### Cleanup with onUnmounted

Each listener registered with `wfEvents.on()` / `stepEvents.on()` is removed with `off()` in `onUnmounted`. This prevents memory leaks and stale callbacks when the component is destroyed.

### LoopStep for Per-Record Processing

The `process-users` `LoopStep` iterates over every user and appends the transformed record to `users.processed` in `State`. The loop step also increments a counter (`users.processedCount`) so the `LOOP_ITERATION_COMPLETE` handler can calculate progress.

### State as Data Bus

Data flows from the API through `State.set('users.raw', ...)` → `State.get('users.raw')` in the loop iterable → `State.set('users.processed', ...)` → `State.get('users.processed')` in the final reactive update. No prop-drilling or Vuex/Pinia required.

## Related Examples

- [Form Workflow — React](form-workflow-react.md) — Similar pattern in React
- [Basic Workflow — Node.js](basic-workflow-node.md) — Core patterns
- [Data Pipeline — Node.js](data-pipeline-node.md) — Multi-step ETL
