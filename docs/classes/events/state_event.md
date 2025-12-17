# StateEvent

Manages state-specific events by extending the base Event class. Emits events whenever state operations are performed.

Extends: [Event](event.md)

## Constructor

### `new StateEvent()`

Creates a new StateEvent instance and registers all state events.

**Example (Node.js):**
```javascript
import { StateEvent } from 'micro-flow';

const stateEvents = new StateEvent();

stateEvents.on('set', (data) => {
  console.log('State updated:', data);
});
```

## Properties

- `event_names` (Object) - State event name constants

All properties inherited from [Event](event.md)

## Methods

### `registerStateEvents()`

Registers all state event names defined in the state_event_names enum.

## Available Events

The StateEvent class automatically registers the following events:

- `deleted` - State property was deleted
- `each` - State collection was iterated over
- `frozen` - State was frozen (made immutable)
- `get` - State property was retrieved
- `get_from_property_path` - Property retrieved using path resolution
- `get_state` - Entire state object was retrieved
- `merge` - Object was merged into state
- `reset` - State was reset to default values
- `set` - State property was set
- `set_to_property_path` - Property set using path resolution

See [State Event Names](../../enums/state_event_names.md) for complete list.

## Common Usage Patterns

### State Change Monitoring (Node.js)

```javascript
import { State } from 'micro-flow';

const stateEvents = State.get('events.state');

// Monitor all state changes
stateEvents.on('set', (data) => {
  console.log('State modified:', data.state);
});

stateEvents.on('deleted', (data) => {
  console.log('State property deleted:', data.state);
});

stateEvents.on('reset', (data) => {
  console.log('State reset to defaults');
});

// Perform state operations
State.set('user.name', 'Alice');
State.delete('user.name');
State.reset();
```

### State Change Logger (Node.js)

```javascript
import { State } from 'micro-flow';
import fs from 'fs';

const stateEvents = State.get('events.state');
const logFile = 'state-changes.log';

// Log all state modifications
const logChange = (eventName, data) => {
  const entry = {
    timestamp: new Date().toISOString(),
    event: eventName,
    state: data.state
  };
  fs.appendFileSync(logFile, JSON.stringify(entry) + '\n');
};

stateEvents.on('set', (data) => logChange('SET', data));
stateEvents.on('deleted', (data) => logChange('DELETE', data));
stateEvents.on('merge', (data) => logChange('MERGE', data));
stateEvents.on('reset', (data) => logChange('RESET', data));
```

### State Persistence (Browser)

```javascript
import { State } from './micro-flow.js';

const stateEvents = State.get('events.state');

// Save state to localStorage on changes
stateEvents.on('set', (data) => {
  localStorage.setItem('appState', JSON.stringify(data.state));
});

stateEvents.on('deleted', (data) => {
  localStorage.setItem('appState', JSON.stringify(data.state));
});

// Load state on startup
window.addEventListener('load', () => {
  const saved = localStorage.getItem('appState');
  if (saved) {
    State.merge(JSON.parse(saved));
  }
});
```

### React State Sync

```javascript
import { State } from './micro-flow.js';
import { useEffect, useState } from 'react';

function useStateSync(path) {
  const [value, setValue] = useState(State.get(path));
  
  useEffect(() => {
    const stateEvents = State.get('events.state');
    
    const handler = (data) => {
      setValue(State.get(path));
    };
    
    stateEvents.on('set', handler);
    stateEvents.on('deleted', handler);
    stateEvents.on('merge', handler);
    stateEvents.on('reset', handler);
    
    return () => {
      stateEvents.off('set', handler);
      stateEvents.off('deleted', handler);
      stateEvents.off('merge', handler);
      stateEvents.off('reset', handler);
    };
  }, [path]);
  
  return value;
}

// Usage in component
function UserProfile() {
  const userName = useStateSync('user.name');
  
  return <div>Hello, {userName}!</div>;
}
```

### Vue State Watcher

```vue
<template>
  <div>
    <h2>Workflow Status</h2>
    <p>Active Workflows: {{ workflowCount }}</p>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue';
import { State } from './micro-flow.js';

const workflowCount = ref(0);
let stateEvents;

const updateCount = () => {
  const workflows = State.get('workflows', {});
  workflowCount.value = Object.keys(workflows).length;
};

onMounted(() => {
  stateEvents = State.get('events.state');
  
  stateEvents.on('set', updateCount);
  stateEvents.on('deleted', updateCount);
  stateEvents.on('merge', updateCount);
  
  updateCount();
});

onUnmounted(() => {
  stateEvents.off('set', updateCount);
  stateEvents.off('deleted', updateCount);
  stateEvents.off('merge', updateCount);
});
</script>
```

### State Debugging

```javascript
import { State } from 'micro-flow';

const stateEvents = State.get('events.state');

// Debug all state operations
stateEvents.on('get', (data) => {
  console.log('[STATE GET]', data.state);
});

stateEvents.on('set', (data) => {
  console.log('[STATE SET]', data.state);
});

stateEvents.on('get_from_property_path', (data) => {
  console.log('[STATE GET PATH]', data.state);
});

stateEvents.on('set_to_property_path', (data) => {
  console.log('[STATE SET PATH]', data.state);
});
```

## Event Data Structure

All StateEvent events emit data with the following structure:

```javascript
{
  state: Object  // Current state or relevant state portion
}
```

## See Also

- [Event](event.md) - Base event class
- [State](../state.md) - State management class
- [State Event Names](../../enums/state_event_names.md) - Event name constants
- [WorkflowEvent](workflow_event.md) - Workflow-specific events
- [StepEvent](step_event.md) - Step-specific events
