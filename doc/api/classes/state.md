# State Class

The `State` class provides a singleton state management system for workflows, steps, and processes. It offers getter/setter functionality with flexible path access (dot notation and bracket notation), state merging, cloning, and immutability through freezing.

**Important:** State is exported as a **singleton instance**, not a class. All workflows and steps share the same global state object.

## Import

```javascript
import state from 'micro-flow';
// or
import state from './src/classes/state.js';
```

## Property Path Notation

State uses a path notation that is a string just like the way you'd access data in an object or an array, including dynamic keys:

### Dot Notation

Traditional dot-separated paths for accessing nested objects:

```javascript
state.set('user.profile.name', 'Alice');
state.get('user.profile.name'); // 'Alice'
```

### Bracket Notation

Use brackets to access array indices or object keys with special characters:

```javascript
// Array indices
state.set('users[0].name', 'Bob');
state.get('users[0].name'); // 'Bob'

// Dynamic or special keys
state.set("config['api-key']", 'secret123');
state.get("config['api-key']"); // 'secret123'

// Nested arrays
state.set('matrix[0][1]', 42);
state.get('matrix[0][1]'); // 42
```

### Mixed Notation

You can combine both notations in a single path:

```javascript
// Accessing nested structures
state.set('data.items[0].properties.name', 'First Item');
state.get('data.items[0].properties.name'); // 'First Item'

// Complex paths
state.set("users[0].settings['theme-preference'].color", 'dark');
state.get("users[0].settings['theme-preference'].color"); // 'dark'
```

### Path Notation Rules

1. **Array Indices**: Use numeric indices in brackets: `items[0]`, `items[1]`
2. **Object Keys**: Use quoted keys in brackets for special characters: `data['api-key']`, `config["my-setting"]`
3. **Nesting**: Combine dots and brackets: `data.items[0].name`
4. **Automatic Creation**: When setting values, intermediate objects and arrays are created automatically
5. **Type Detection**: If the next key is numeric, an array is created; otherwise, an object is created

### Examples

```javascript
// Initialize state with nested data
state.set('users', []);

// Add users using bracket notation
state.set('users[0]', { name: 'Alice', age: 30 });
state.set('users[1]', { name: 'Bob', age: 25 });

// Access nested properties
state.get('users[0].name'); // 'Alice'
state.get('users[1].age'); // 25

// Update specific array elements
state.set('users[0].age', 31);

// Work with keys containing special characters
state.set("config['api-endpoints'].primary", 'https://api.example.com');
state.set("config['api-endpoints'].secondary", 'https://backup.example.com');
state.get("config['api-endpoints'].primary"); // 'https://api.example.com'

// Complex nested structures
state.set('data.records[0].metadata["created-at"]', '2025-01-01');
state.get('data.records[0].metadata["created-at"]'); // '2025-01-01'
```

## Default State Properties

```javascript
{
  id: null,
  name: null,
  exit_on_failure: true,
  current_step: null,
  steps: [],
  events: null,
  should_break: false,
  should_continue: false
}
```

## Methods

### `get(path, defaultValue)`

Retrieves the value of a state property using dot-notation or bracket-notation path access.

**Parameters:**
- `path` (string|null) - Path to the property. Supports:
  - Dot notation: `"user.profile.name"`
  - Bracket notation: `"users[0].name"` or `"data['api-key']"`
  - Mixed: `"data.items[0].properties.name"`
  - Special values: `null`, `""`, or `"*"` returns entire state
- `defaultValue` (any) - Value to return if the path doesn't exist (default: `null`)

**Returns:** The value at the specified path, or `defaultValue` if not found.

**Examples:**

```javascript
// Get top-level properties
state.get('id'); // 'workflow-123'

// Get nested values with dot notation
state.get('user.profile.name'); // 'Alice'

// Get array elements with bracket notation
state.get('users[0]'); // { name: 'Bob', age: 25 }
state.get('users[0].name'); // 'Bob'

// Get keys with special characters
state.get("config['api-key']"); // 'secret123'

// Mixed notation
state.get('data.items[0].properties.name'); // 'First Item'

// Get with default
state.get('user.email', 'no-email@example.com');

// Get entire state
const allState = state.get(); // or state.get('*') or state.get('')
```

### `set(path, value)`

Sets the value of a state property using dot-notation or bracket-notation path access. Creates intermediate objects and arrays automatically as needed.

**Parameters:**
- `path` (string) - Path to the property. Supports:
  - Dot notation: `"user.profile.name"`
  - Bracket notation: `"users[0].name"` or `"data['api-key']"`
  - Mixed: `"data.items[0].properties.name"`
- `value` (any) - Value to set at the specified path

**Throws:** Error if path is empty or invalid.

**Examples:**

```javascript
// Set top-level properties
state.set('id', 'workflow-123');

// Set nested properties (creates intermediate objects)
state.set('user.profile.name', 'Alice');
state.set('user.profile.age', 30);

// Set array elements (creates arrays automatically)
state.set('users[0].name', 'Bob');
state.set('users[1].name', 'Charlie');

// Set keys with special characters
state.set("config['api-key']", 'secret123');
state.set("settings['theme-preference']", 'dark');

// Mixed notation with automatic structure creation
state.set('data.items[0].properties.name', 'First Item');
state.set('data.items[0].properties.tags[0]', 'important');

// Deep nested values
state.set('config.database.connection.host', 'localhost');
```

### `delete(path)`

Deletes a state property using dot-notation or bracket-notation path access.

**Parameters:**
- `path` (string) - Path to the property to delete. Supports:
  - Dot notation: `"user.profile.age"`
  - Bracket notation: `"users[0].email"` or `"data['api-key']"`
  - Mixed: `"data.items[0].properties.name"`

**Throws:** Error if path is empty or invalid.

**Examples:**

```javascript
// Delete top-level property
state.delete('temporary_data');

// Delete nested property
state.delete('user.profile.age');

// Delete array element property
state.delete('users[0].email');

// Delete key with special characters
state.delete("config['api-key']");

// Mixed notation
state.delete('data.items[0].properties.tags[0]');
```

### `merge(newState)`

Merges new properties into the current state. Existing properties are overwritten.

**Parameters:**
- `newState` (object) - Object containing properties to merge into state

**Examples:**

```javascript
state.merge({ 
  id: 'new-id',
  custom_field: 'value' 
});
```

### `getState()`

Returns a reference to the entire state object. Modifications to the returned object will affect the internal state.

**Returns:** Object containing all state properties.

**Examples:**

```javascript
const currentState = state.getState();
console.log(currentState.id);
```

### `getStateClone()`

Returns a deep clone of the entire state object. Modifications to the returned object will not affect the internal state.

**Returns:** Deep cloned copy of all state properties.

**Examples:**

```javascript
const snapshot = state.getStateClone();
snapshot.id = 'different-id'; // Does not affect state
```

### `freeze()`

Freezes the state object, making it immutable. No further modifications can be made.

**Examples:**

```javascript
state.freeze();
// Any subsequent set() calls will throw an error
```

### `getFromPropertyPath(path)`

Resolves a path (dot notation or bracket notation) and returns the value at that location.

**Parameters:**
- `path` (string) - Path to resolve. Supports dot notation, bracket notation, or mixed.

**Returns:** The value at the path, or `undefined` if not found.

**Examples:**

```javascript
// Dot notation
const name = state.getFromPropertyPath('user.profile.name');

// Bracket notation
const firstUser = state.getFromPropertyPath('users[0]');

// Mixed notation
const itemName = state.getFromPropertyPath('data.items[0].name');
```

### `setToPropertyPath(path, value)`

Sets a value at a path (dot notation or bracket notation), creating intermediate objects and arrays as needed.

**Parameters:**
- `path` (string) - Path where to set the value. Supports dot notation, bracket notation, or mixed.
- `value` (any) - Value to set

**Examples:**

```javascript
// Dot notation
state.setToPropertyPath('deeply.nested.value', 42);

// Bracket notation
state.setToPropertyPath('users[0].name', 'Alice');

// Mixed notation
state.setToPropertyPath('data.items[0].properties.name', 'Item 1');
```

## See Also

- [Workflow Class](./workflow.md)
- [Step Class](./step.md)
- [Errors Enum](../enums/errors.md)
