# State

Coordinate global application state and cross-context events. The `State` singleton acts as the central hub for data sharing, logic discovery, and observability.

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

---

### `State.each(path, callback)`

Iterates over a collection (array or object) located at the specified state path.

**Parameters:**
- `path` (string) - The path of the state property to iterate over.
- `callback` (Function) - The function to execute for each item. Receives `(item, index/key)`.

---

### `State.get(path, defaultValue, type)`

Retrieves a value from the state. Supports dot and bracket notation.

**Parameters:**
- `path` (string) - The path to get. Use `"*"` or an empty string for the entire state.
- `defaultValue` (any, optional) - Value to return if path is not found (default: `null`).
- `type` (string, optional) - Type to cast the result to (`string`, `number`, `boolean`).

---

### `State.set(path, value)`

Sets a value in the state. Automatically creates intermediate objects or arrays if they do not exist.

**Parameters:**
- `path` (string) - The path to set.
- `value` (any) - The value to store.

**Example:**
```javascript
State.set('config.api.baseUrl', 'https://api.example.com');
State.set('users[0].name', 'Alice');
```

---

### `State.merge(newState)`

Merges an object into the current State.

---

### `State.reset()`

Resets the state to its initial default configuration.

---

### `State.freeze()`

Freezes the state object, making it immutable.
