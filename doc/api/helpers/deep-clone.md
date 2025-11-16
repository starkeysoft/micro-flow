# deep_clone Helper

Creates a deep copy of an object with comprehensive support for circular references and special JavaScript types.

## Signature

```javascript
deep_clone(obj, visited = new WeakMap())
```

## Parameters

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `obj` | `any` | Yes | - | The value to deep clone |
| `visited` | `WeakMap` | No | `new WeakMap()` | Internal tracking for circular references |

## Returns

- **Type:** `any`
- **Description:** A deep copy of the input value

## Description

The `deep_clone` helper creates a complete deep copy of JavaScript values, handling:

- **Primitives:** strings, numbers, booleans, null, undefined, symbols, bigints
- **Objects:** Plain objects with proper prototype chain
- **Arrays:** With all elements recursively cloned
- **Special Types:**
  - `Date` objects (preserves timestamp)
  - `RegExp` objects (preserves pattern and flags)
  - `Map` objects (clones keys and values)
  - `Set` objects (clones values)
- **Circular References:** Detects and handles circular references to prevent infinite loops

## Supported Types

| Type | Cloning Behavior |
|------|------------------|
| Primitives | Returned as-is (immutable) |
| `null` / `undefined` | Returned as-is |
| `Date` | New Date with same timestamp |
| `RegExp` | New RegExp with same pattern/flags |
| `Map` | New Map with cloned entries |
| `Set` | New Set with cloned values |
| `Array` | New array with cloned elements |
| `Object` | New object with cloned properties |
| Circular refs | Reference to cloned instance |
| Functions | Returns original function reference |

## Examples

### Basic Object Cloning

```javascript
import { deep_clone } from 'micro-flow';

const original = {
  name: 'John',
  age: 30,
  address: {
    city: 'New York',
    zip: '10001'
  }
};

const cloned = deep_clone(original);

// Modify cloned object
cloned.address.city = 'Boston';

console.log(original.address.city); // 'New York' (unchanged)
console.log(cloned.address.city);   // 'Boston'
```

### Array Cloning

```javascript
const originalArray = [
  { id: 1, name: 'Item 1' },
  { id: 2, name: 'Item 2' }
];

const clonedArray = deep_clone(originalArray);

clonedArray[0].name = 'Modified';

console.log(originalArray[0].name); // 'Item 1' (unchanged)
console.log(clonedArray[0].name);   // 'Modified'
```

### Circular Reference Handling

```javascript
const obj = { name: 'Parent' };
obj.self = obj; // Circular reference

const cloned = deep_clone(obj);

console.log(cloned.self === cloned); // true (circular reference preserved)
console.log(cloned === obj);          // false (different objects)
```

### Date Objects

```javascript
const original = {
  createdAt: new Date('2024-01-01'),
  metadata: { value: 42 }
};

const cloned = deep_clone(original);

cloned.createdAt.setDate(15);

console.log(original.createdAt.getDate()); // 1 (unchanged)
console.log(cloned.createdAt.getDate());   // 15
```

### RegExp Objects

```javascript
const original = {
  pattern: /test/gi
};

const cloned = deep_clone(original);

console.log(cloned.pattern.source); // 'test'
console.log(cloned.pattern.flags);  // 'gi'
console.log(cloned.pattern === original.pattern); // false
```

### Map and Set

```javascript
const original = {
  map: new Map([['key1', { value: 1 }], ['key2', { value: 2 }]]),
  set: new Set([1, 2, { id: 3 }])
};

const cloned = deep_clone(original);

// Modify cloned Map
cloned.map.get('key1').value = 100;

console.log(original.map.get('key1').value); // 1 (unchanged)
console.log(cloned.map.get('key1').value);   // 100
```

### Nested Complex Structures

```javascript
const workflow = {
  id: 'wf-123',
  steps: [
    {
      id: 'step-1',
      config: {
        retries: 3,
        metadata: new Map([['key', 'value']])
      }
    }
  ],
  createdAt: new Date()
};

const clonedWorkflow = deep_clone(workflow);

// Safe to modify without affecting original
clonedWorkflow.steps[0].config.retries = 5;
clonedWorkflow.steps[0].config.metadata.set('key', 'new value');

console.log(workflow.steps[0].config.retries); // 3 (unchanged)
```

## Implementation Notes

- Uses `WeakMap` for tracking visited objects to handle circular references efficiently
- Preserves object prototypes for proper instanceof checks
- Functions are not cloned (returned by reference) as they are typically immutable
- Symbols are preserved in object properties
- Does not clone non-enumerable properties
- Class instances maintain their prototype chain

## Performance Considerations

- Efficient for moderate-sized objects
- `WeakMap` usage ensures circular references don't cause memory leaks
- For very large data structures, consider shallow copying or selective cloning
- Most expensive for deeply nested structures with many special types

## Use Cases

### State Management

```javascript
// Clone state before mutation
const originalState = workflow.state.toJSON();
const newState = deep_clone(originalState);
newState.customData.value = 'modified';
```

### Step Result Preservation

```javascript
// Preserve step results without reference sharing
const stepResults = steps.map(step => 
  deep_clone(step.state.get('result'))
);
```

### Testing

```javascript
// Create independent test fixtures
const baseTestData = { /* ... */ };
const testCase1 = deep_clone(baseTestData);
const testCase2 = deep_clone(baseTestData);

// Modify each independently
testCase1.scenario = 'success';
testCase2.scenario = 'failure';
```

## See Also

- [State Class](../classes/state.md) - Uses deep_clone internally
- [Workflow Class](../classes/workflow.md) - State cloning for immutability
- [delay_cron Helper](./delay-cron.md) - Other helper function
