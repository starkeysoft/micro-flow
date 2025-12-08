# State

Singleton class representing the global state for workflows, steps, and processes. Provides methods for managing state with getter/setter functionality, nested path access, and immutability options. The state is shared across all workflow and step instances.

## Static Methods

### `State.delete(path)`

Deletes a state property using dot-notation or bracket-notation path access.

**Parameters:**
- `path` (string) - The path of the state property to delete (e.g., "user.profile.email" or "users[0].email")

**Throws:** Error if path is empty or invalid

**Example (Node.js):**
```javascript
import { State } from 'micro-flow';

// Set some data
State.set('user.profile.email', 'user@example.com');

// Delete it
State.delete('user.profile.email');
```

**Example (Browser):**
```javascript
import { State } from './micro-flow.js';

State.set('cache.data', { items: [] });
State.delete('cache.data');
```

---

### `State.get(path, defaultValue)`

Gets the value of a state property using dot-notation or bracket-notation path access.

**Parameters:**
- `path` (string) - The path of the state property to get. Supports both dot notation (e.g., "user.profile.name") and bracket notation (e.g., "users[0].name" or "data['key-name']")
  - Special values:
    - Falsy values (null, undefined, false): Returns entire state object
    - "*" or "": Returns entire state object
- `defaultValue` (any, optional) - Default value to return if the path doesn't exist (default: `null`)

**Returns:** any - The value of the state property, or defaultValue if not found

**Example (Node.js):**
```javascript
import { State } from 'micro-flow';

// Get entire state
const allState = State.get();

// Get specific value with default
const userName = State.get('user.name', 'Guest');

// Get nested array value
State.set('users[0].name', 'Alice');
const firstUser = State.get('users[0].name'); // 'Alice'
```

**Example (Browser with React):**
```javascript
import { State } from './micro-flow.js';
import { useEffect, useState } from 'react';

function WorkflowMonitor() {
  const [workflows, setWorkflows] = useState({});

  useEffect(() => {
    const interval = setInterval(() => {
      const activeWorkflows = State.get('workflows', {});
      setWorkflows(activeWorkflows);
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div>
      <h3>Active Workflows: {Object.keys(workflows).length}</h3>
    </div>
  );
}
```

---

### `State.getState()`

Gets the entire state object.

**Returns:** Object - The entire state object

**Example (Node.js):**
```javascript
import { State } from 'micro-flow';

const fullState = State.getState();
console.log('State keys:', Object.keys(fullState));
// Output: ['messages', 'statuses', 'event_names', 'events', 'types', 'workflows', 'conditional_step_comparators']
```

---

### `State.set(path, value)`

Sets the value of a state property using dot-notation or bracket-notation path access. Creates intermediate objects if they don't exist.

**Parameters:**
- `path` (string) - The path of the state property to set. Supports both dot notation (e.g., "user.profile.name") and bracket notation (e.g., "users[0].name" or "data['key-name']")
- `value` (any) - The value to set for the state property

**Throws:** Error if path is empty or invalid

**Example (Node.js):**
```javascript
import { State } from 'micro-flow';

// Simple set
State.set('app.version', '1.0.0');

// Create nested structure
State.set('config.api.baseUrl', 'https://api.example.com');
State.set('config.api.timeout', 5000);

// Array indexing
State.set('users[0].name', 'Alice');
State.set('users[1].name', 'Bob');
```

**Example (Browser with Vue):**
```vue
<template>
  <div>
    <input v-model="userInput" @change="saveToState">
    <p>Saved: {{ savedValue }}</p>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import { State } from './micro-flow.js';

const userInput = ref('');
const savedValue = ref('');

const saveToState = () => {
  State.set('user.input', userInput.value);
  savedValue.value = State.get('user.input');
};
</script>
```

---

### `State.merge(newState)`

Merges an object into the current State.

**Parameters:**
- `newState` (Object) - The object to merge into the current State

**Example (Node.js):**
```javascript
import { State } from 'micro-flow';

State.merge({
  customSettings: {
    theme: 'dark',
    language: 'en'
  }
});
```

---

### `State.parsePath(path)`

Parses a property path string into an array of keys, supporting both dot notation and bracket notation.

**Parameters:**
- `path` (string) - The path to parse (e.g., "user.profile.name", "users[0].name", "data['key-name']")

**Returns:** Array\<string\> - Array of property keys

**Example (Node.js):**
```javascript
import { State } from 'micro-flow';

const parts1 = State.parsePath('user.profile.name');
// ['user', 'profile', 'name']

const parts2 = State.parsePath('users[0].email');
// ['users', '0', 'email']

const parts3 = State.parsePath("data['key-name'].value");
// ['data', 'key-name', 'value']
```

---

### `State.getFromPropertyPath(path)`

Resolves a nested property path within the state object. Supports both dot notation and bracket notation.

**Parameters:**
- `path` (string) - The path to the property (e.g., "user.profile.name", "users[0].name", "data['key-name']")

**Returns:** any - The value at the specified path, or undefined if not found

---

### `State.setToPropertyPath(path, value)`

Sets a nested property value within the state object based on a path. Supports both dot notation and bracket notation. Creates intermediate objects/arrays as needed.

**Parameters:**
- `path` (string) - The path to the property (e.g., "user.profile.name", "users[0].name", "data['key-name']")
- `value` (any) - The value to set at the specified path

## Default State Structure

The State singleton initializes with the following structure:

```javascript
{
  messages: {
    errors: { /* Error messages */ },
    warnings: { /* Warning messages */ }
  },
  statuses: {
    workflow: { /* Workflow status constants */ },
    step: { /* Step status constants */ }
  },
  event_names: {
    workflow: { /* Workflow event names */ },
    step: { /* Step event names */ }
  },
  events: {
    workflow: WorkflowEvent,
    step: StepEvent
  },
  types: {
    base_types: { /* Base type constants */ },
    step_types: { /* Step type constants */ },
    sub_step_types: { /* Sub-step type constants */ }
  },
  workflows: {}, // Active workflows indexed by ID
  conditional_step_comparators: { /* Comparison operators */ }
}
```

## Common Patterns

### Tracking Custom Data

**Node.js:**
```javascript
import { Workflow, Step, State } from 'micro-flow';

const workflow = new Workflow({
  name: 'data-tracker',
  steps: [
    new Step({
      name: 'collect',
      callable: async () => {
        const data = await fetchData();
        State.set('collected.data', data);
      }
    }),
    new Step({
      name: 'process',
      callable: async () => {
        const data = State.get('collected.data');
        return processData(data);
      }
    })
  ]
});
```

### Sharing State Between Components (Browser)

**React:**
```javascript
import { State } from './micro-flow.js';

// Component 1 - writes to state
function DataCollector() {
  const handleSubmit = (data) => {
    State.set('shared.formData', data);
  };
  
  return <form onSubmit={handleSubmit}>...</form>;
}

// Component 2 - reads from state
function DataDisplay() {
  const [data, setData] = useState(null);
  
  useEffect(() => {
    const formData = State.get('shared.formData');
    setData(formData);
  }, []);
  
  return <div>{JSON.stringify(data)}</div>;
}
```

## See Also

- [Base](base.md) - Uses State for state management
- [Workflow](workflow.md) - Stores workflow instances in State
- [Event System](events/event.md) - Event emitters stored in State
