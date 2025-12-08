# Broadcast

Simplified wrapper around the BroadcastChannel API for cross-context communication. Enables communication between browser tabs, windows, and workers that share the same origin.

## Constructor

### `new Broadcast(channelName)`

Creates a new Broadcast instance for a named channel.

**Parameters:**
- `channelName` (string) - Name of the broadcast channel. Multiple instances with the same name can communicate.

**Example:**

```javascript
import { Broadcast } from './micro-flow.js';

const broadcast = new Broadcast('my-channel');
```

## Methods

### `send(data)`

Sends data to all other contexts listening on this channel.

**Parameters:**
- `data` (*) - Data to broadcast. Must be structured-cloneable (primitives, objects, arrays). Cannot send functions or DOM nodes.

**Returns:** void

**Example:**

```javascript
broadcast.send({ type: 'update', value: 42 });
```

### `onReceive(callback)`

Registers a callback to handle incoming messages.

**Parameters:**
- `callback` (Function) - Called when a message is received. Receives message data as parameter.

**Returns:** void

**Example:**

```javascript
broadcast.onReceive((data) => {
  console.log('Received:', data);
});
```

### `destroy()`

Closes the broadcast channel and releases resources. Instance can no longer send/receive after calling.

**Returns:** void

**Example:**

```javascript
broadcast.destroy();
```

## Browser Examples

### Basic Tab Communication

```javascript
import { Broadcast } from './micro-flow.js';

// In tab 1
const broadcast = new Broadcast('app-sync');

broadcast.onReceive((data) => {
  console.log('Tab 1 received:', data);
});

document.getElementById('sendBtn').addEventListener('click', () => {
  broadcast.send({ from: 'tab1', message: 'Hello from tab 1!' });
});

// In tab 2 (same code, different tab)
const broadcast = new Broadcast('app-sync');

broadcast.onReceive((data) => {
  console.log('Tab 2 received:', data);
});

document.getElementById('sendBtn').addEventListener('click', () => {
  broadcast.send({ from: 'tab2', message: 'Hello from tab 2!' });
});
```

### Syncing State Across Tabs

```javascript
import { Broadcast, State } from './micro-flow.js';

const stateSyncer = new Broadcast('state-sync');

// Send state updates to other tabs
function updateState(key, value) {
  State.set(key, value);
  stateSyncer.send({ type: 'state-update', key, value });
}

// Receive state updates from other tabs
stateSyncer.onReceive((data) => {
  if (data.type === 'state-update') {
    State.set(data.key, data.value);
    console.log(`State synced: ${data.key} = ${data.value}`);
  }
});

// Usage
updateState('user.name', 'Alice'); // All tabs will update
```

### Real-Time Collaboration

```javascript
import { Broadcast } from './micro-flow.js';

class CollaborativeEditor {
  constructor(editorId) {
    this.broadcast = new Broadcast('editor-sync');
    this.editorId = editorId;
    
    this.broadcast.onReceive((data) => {
      if (data.senderId !== this.editorId) {
        this.applyRemoteChange(data);
      }
    });
  }
  
  handleLocalChange(change) {
    // Apply change locally
    this.applyChange(change);
    
    // Broadcast to other editors
    this.broadcast.send({
      senderId: this.editorId,
      type: 'change',
      change
    });
  }
  
  applyRemoteChange(data) {
    console.log('Remote change from:', data.senderId);
    this.applyChange(data.change);
  }
  
  applyChange(change) {
    document.getElementById('editor').value = change.text;
  }
  
  destroy() {
    this.broadcast.destroy();
  }
}

const editor = new CollaborativeEditor('editor-1');
```

## React Examples

### Multi-Tab Authentication

```javascript
import { Broadcast } from './micro-flow.js';
import { useState, useEffect } from 'react';

function useAuthSync() {
  const [user, setUser] = useState(null);
  const [broadcast] = useState(() => new Broadcast('auth-sync'));

  useEffect(() => {
    broadcast.onReceive((data) => {
      if (data.type === 'login') {
        setUser(data.user);
        console.log('User logged in from another tab');
      } else if (data.type === 'logout') {
        setUser(null);
        console.log('User logged out from another tab');
      }
    });

    return () => broadcast.destroy();
  }, [broadcast]);

  const login = (userData) => {
    setUser(userData);
    broadcast.send({ type: 'login', user: userData });
  };

  const logout = () => {
    setUser(null);
    broadcast.send({ type: 'logout' });
  };

  return { user, login, logout };
}

function App() {
  const { user, login, logout } = useAuthSync();

  return (
    <div>
      {user ? (
        <div>
          <p>Welcome, {user.name}!</p>
          <button onClick={logout}>Logout</button>
        </div>
      ) : (
        <button onClick={() => login({ name: 'Alice', id: 1 })}>
          Login
        </button>
      )}
    </div>
  );
}
```

### Shopping Cart Sync

```javascript
import { Broadcast } from './micro-flow.js';
import { useState, useEffect } from 'react';

function ShoppingCart() {
  const [cart, setCart] = useState([]);
  const [broadcast] = useState(() => new Broadcast('cart-sync'));

  useEffect(() => {
    broadcast.onReceive((data) => {
      if (data.type === 'cart-add') {
        setCart(prev => [...prev, data.item]);
      } else if (data.type === 'cart-remove') {
        setCart(prev => prev.filter(item => item.id !== data.itemId));
      } else if (data.type === 'cart-clear') {
        setCart([]);
      }
    });

    return () => broadcast.destroy();
  }, [broadcast]);

  const addItem = (item) => {
    setCart(prev => [...prev, item]);
    broadcast.send({ type: 'cart-add', item });
  };

  const removeItem = (itemId) => {
    setCart(prev => prev.filter(item => item.id !== itemId));
    broadcast.send({ type: 'cart-remove', itemId });
  };

  const clearCart = () => {
    setCart([]);
    broadcast.send({ type: 'cart-clear' });
  };

  return (
    <div>
      <h2>Shopping Cart ({cart.length} items)</h2>
      {cart.map(item => (
        <div key={item.id}>
          {item.name} - ${item.price}
          <button onClick={() => removeItem(item.id)}>Remove</button>
        </div>
      ))}
      <button onClick={clearCart}>Clear Cart</button>
    </div>
  );
}
```

## Vue Examples

### Notification System

```vue
<template>
  <div>
    <div v-for="notification in notifications" :key="notification.id" class="notification">
      {{ notification.message }}
    </div>
    <button @click="sendNotification">Send Notification to All Tabs</button>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue';
import { Broadcast } from './micro-flow.js';

const notifications = ref([]);
let broadcast;

onMounted(() => {
  broadcast = new Broadcast('notifications');
  
  broadcast.onReceive((data) => {
    if (data.type === 'notification') {
      notifications.value.push(data);
      
      // Auto-remove after 5 seconds
      setTimeout(() => {
        notifications.value = notifications.value.filter(n => n.id !== data.id);
      }, 5000);
    }
  });
});

onUnmounted(() => {
  if (broadcast) {
    broadcast.destroy();
  }
});

const sendNotification = () => {
  const notification = {
    type: 'notification',
    id: Date.now(),
    message: `Notification from tab at ${new Date().toLocaleTimeString()}`
  };
  
  // Add locally
  notifications.value.push(notification);
  
  // Broadcast to other tabs
  broadcast.send(notification);
  
  // Auto-remove after 5 seconds
  setTimeout(() => {
    notifications.value = notifications.value.filter(n => n.id !== notification.id);
  }, 5000);
};
</script>
```

### Theme Sync

```vue
<template>
  <div :class="theme">
    <button @click="toggleTheme">
      Current Theme: {{ theme }}
    </button>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue';
import { Broadcast } from './micro-flow.js';

const theme = ref('light');
let broadcast;

onMounted(() => {
  broadcast = new Broadcast('theme-sync');
  
  // Load saved theme
  theme.value = localStorage.getItem('theme') || 'light';
  
  broadcast.onReceive((data) => {
    if (data.type === 'theme-change') {
      theme.value = data.theme;
      localStorage.setItem('theme', data.theme);
    }
  });
});

onUnmounted(() => {
  if (broadcast) {
    broadcast.destroy();
  }
});

const toggleTheme = () => {
  const newTheme = theme.value === 'light' ? 'dark' : 'light';
  theme.value = newTheme;
  localStorage.setItem('theme', newTheme);
  
  // Sync to other tabs
  broadcast.send({ type: 'theme-change', theme: newTheme });
};
</script>

<style scoped>
.light {
  background: white;
  color: black;
}

.dark {
  background: #1a1a1a;
  color: white;
}
</style>
```

## Advanced Examples

### Workflow Coordination Across Tabs

```javascript
import { Broadcast, Workflow, Step, State } from './micro-flow.js';

const workflowSync = new Broadcast('workflow-sync');

// Listen for workflow events from other tabs
workflowSync.onReceive((data) => {
  if (data.type === 'workflow-start') {
    console.log(`Workflow "${data.name}" started in another tab`);
    State.set(`workflows.${data.name}.status`, 'running');
  } else if (data.type === 'workflow-complete') {
    console.log(`Workflow "${data.name}" completed in another tab`);
    State.set(`workflows.${data.name}.status`, 'complete');
    State.set(`workflows.${data.name}.results`, data.results);
  }
});

// Create a workflow that broadcasts its status
const distributedWorkflow = new Workflow({
  name: 'distributed-task',
  steps: [
    new Step({
      name: 'start',
      callable: async () => {
        workflowSync.send({
          type: 'workflow-start',
          name: 'distributed-task'
        });
      }
    }),
    new Step({
      name: 'process',
      callable: async () => {
        // Do work
        return { processed: true };
      }
    }),
    new Step({
      name: 'complete',
      callable: async () => {
        workflowSync.send({
          type: 'workflow-complete',
          name: 'distributed-task',
          results: State.get('workflows.distributed-task.results')
        });
      }
    })
  ]
});
```

### Tab Leader Election

```javascript
import { Broadcast } from './micro-flow.js';

class TabLeader {
  constructor() {
    this.isLeader = false;
    this.tabId = `tab-${Date.now()}-${Math.random()}`;
    this.broadcast = new Broadcast('leader-election');
    
    this.broadcast.onReceive((data) => {
      if (data.type === 'election') {
        // Respond to election
        this.broadcast.send({ type: 'alive', tabId: this.tabId });
      } else if (data.type === 'leader') {
        this.isLeader = (data.tabId === this.tabId);
        console.log(this.isLeader ? 'I am the leader' : 'Leader is', data.tabId);
      }
    });
    
    // Start election
    this.electLeader();
    
    // Re-elect on page visibility
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden) {
        this.electLeader();
      }
    });
  }
  
  electLeader() {
    setTimeout(() => {
      this.isLeader = true;
      this.broadcast.send({ type: 'leader', tabId: this.tabId });
    }, 100);
    
    this.broadcast.send({ type: 'election' });
  }
  
  destroy() {
    this.broadcast.destroy();
  }
}

const leader = new TabLeader();
```

## Browser Compatibility

The Broadcast class requires the [BroadcastChannel API](https://developer.mozilla.org/en-US/docs/Web/API/BroadcastChannel), which is supported in:

- Chrome 54+
- Firefox 38+
- Edge 79+
- Safari 15.4+
- Opera 41+

Not supported in Internet Explorer.

## See Also

- [Event](event.md) - Base event emitter class
- [WorkflowEvent](workflow_event.md) - Workflow events
- [StepEvent](step_event.md) - Step events
- [State](../state.md) - Global state management
