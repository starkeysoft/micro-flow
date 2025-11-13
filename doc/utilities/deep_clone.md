# deep_clone

**Utility function for creating deep clones of JavaScript values with circular reference support.**

## Overview

The `deep_clone` function creates a complete deep copy of any JavaScript value, handling various built-in types, circular references, and nested structures. It preserves the structure and state of objects, arrays, and built-in types while breaking all references to the original.

## Function Definition

```javascript
function deep_clone(value, hash = new WeakMap())
```

**Location:** `src/helpers/deep_clone.js`

## Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `value` | `*` | The value to clone. Can be any JavaScript value including primitives, objects, arrays, and built-in types. |
| `hash` | `WeakMap` | *[internal]* Internal cache for tracking circular references. Should not be provided by external callers. (default: `new WeakMap()`) |

## Returns

`*` - A deep clone of the input value with the following behaviors:
- Primitives and null/undefined are returned as-is
- Objects and arrays are recursively cloned
- Dates and RegExps are cloned with their state preserved
- Maps and Sets are deeply cloned (both keys/values are cloned)
- Functions, WeakMaps, and WeakSets are returned by reference (not cloned)
- Circular references are handled correctly

## Supported Types

### Cloned Types
These types are deeply cloned:

- **Objects** - Plain objects are recursively cloned
- **Arrays** - Arrays are recursively cloned
- **Date** - Cloned with the same timestamp
- **RegExp** - Cloned with the same pattern and flags
- **Map** - Deeply cloned including both keys and values
- **Set** - Deeply cloned including all values

### Returned by Reference
These types are returned by reference (not cloned):

- **Functions** - Functions are shared by reference
- **WeakMap** - Cannot be iterated, returned by reference
- **WeakSet** - Cannot be iterated, returned by reference

### Returned as-is
These types are returned unchanged:

- **Primitives** - Numbers, strings, booleans, symbols, BigInt
- **null** and **undefined**

## Examples

### Basic Object Cloning

```javascript
import deep_clone from './helpers/deep_clone';

const original = { 
  a: 1, 
  b: { c: 2, d: [3, 4] } 
};

const cloned = deep_clone(original);

cloned.b.c = 999;
cloned.b.d.push(5);

console.log(original.b.c); // 2 (original unchanged)
console.log(original.b.d);  // [3, 4] (original unchanged)
```

### Array Cloning

```javascript
const original = [1, [2, 3], { a: 4 }];
const cloned = deep_clone(original);

cloned[1][0] = 999;
cloned[2].a = 888;

console.log(original[1][0]); // 2 (original unchanged)
console.log(original[2].a);   // 4 (original unchanged)
```

### Circular References

```javascript
const obj = { name: 'root' };
obj.self = obj; // Circular reference

const cloned = deep_clone(obj);

console.log(cloned.self === cloned); // true
console.log(cloned === obj);         // false
console.log(cloned.self === obj);    // false
```

### Date and RegExp

```javascript
const original = {
  date: new Date('2025-01-01'),
  pattern: /test/gi
};

const cloned = deep_clone(original);

cloned.date.setFullYear(2026);

console.log(original.date.getFullYear()); // 2025 (original unchanged)
console.log(cloned.date.getFullYear());    // 2026
console.log(cloned.pattern.test('TEST'));  // true (flags preserved)
```

### Map and Set

```javascript
const map = new Map([
  ['key1', { value: 1 }],
  ['key2', { value: 2 }]
]);

const clonedMap = deep_clone(map);
clonedMap.get('key1').value = 999;

console.log(map.get('key1').value); // 1 (original unchanged)

const set = new Set([{ id: 1 }, { id: 2 }]);
const clonedSet = deep_clone(set);

const firstItem = [...clonedSet][0];
firstItem.id = 999;

console.log([...set][0].id); // 1 (original unchanged)
```

### Functions (By Reference)

```javascript
const obj = {
  data: { count: 0 },
  increment: function() { this.data.count++; }
};

const cloned = deep_clone(obj);

console.log(cloned.increment === obj.increment); // true (same function)

// data is cloned, but function is shared
cloned.increment();
console.log(obj.data.count);    // 0 (cloned data)
console.log(cloned.data.count); // 1
```

## Use Cases

### State Snapshots

```javascript
import { State } from './classes';

const state = new State({ step: 1 });

// Create snapshot
const snapshot = deep_clone(state.getState());

// Modify original
state.set('step', 2);

// Snapshot remains unchanged
console.log(snapshot.step); // 1
```

### Immutable Operations

```javascript
function updateUser(user, updates) {
  const cloned = deep_clone(user);
  Object.assign(cloned, updates);
  return cloned;
}

const user = { name: 'John', age: 30 };
const updated = updateUser(user, { age: 31 });

console.log(user.age);    // 30 (original unchanged)
console.log(updated.age); // 31
```

### Testing

```javascript
import { expect, test } from 'vitest';

test('data transformation preserves original', () => {
  const input = { items: [1, 2, 3] };
  const original = deep_clone(input);
  
  transformData(input); // Modifies input
  
  expect(input).not.toEqual(original);
});
```

## Performance Considerations

1. **Deep Structures**: Cloning deeply nested structures can be computationally expensive
2. **Large Collections**: Maps and Sets with many items will take longer to clone
3. **Circular References**: The WeakMap cache adds minimal overhead for circular reference detection
4. **Functions**: Functions are not cloned, reducing overhead for function-heavy objects

## Limitations

1. **WeakMap/WeakSet**: Cannot be cloned due to their non-iterable nature; returned by reference
2. **Symbols**: Symbol properties are not cloned (only string keys are processed)
3. **Getters/Setters**: Property descriptors and accessors are not preserved
4. **Prototypes**: Only own enumerable properties are cloned; prototype chain is not preserved
5. **Built-in Objects**: Some built-in objects (Buffers, TypedArrays, etc.) may not be fully supported

## Best Practices

1. **Use for State Management**: Ideal for creating immutable snapshots of state
2. **Avoid in Hot Paths**: Don't use in performance-critical loops
3. **Consider Shallow Clone**: Use `Object.assign()` or spread if deep clone is not needed
4. **Test with Your Data**: Test with your specific data structures to ensure correct behavior
5. **Handle Functions Carefully**: Remember that functions are shared by reference

## Related Documentation

- [State](./State.md) - Uses `deep_clone` in `getStateClone()` method

## See Also

- `State.getStateClone()` - Returns a deep clone of workflow state
- `Object.assign()` - For shallow copying
- Structured Clone Algorithm - For cloning in web workers/messaging
