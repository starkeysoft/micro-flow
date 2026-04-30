# LoopStep

Iterate over collections or repeat tasks within a workflow. `LoopStep` supports `for`, `for_each`, `while`, and `generator` iteration patterns.

Extends: [LogicStep](logic_step.md)

## Constructor

### `new LoopStep(options)`

Initializes a new LoopStep instance.

**Parameters:**
- `options` (Object) - Configuration options
  - `loop_type` (string) - Choose from `'for'`, `'for_each'`, `'generator'`, or `'while'`.
  - `iterable` (Array|Iterable|Function) - Required for `for_each`.
  - `iterations` (number) - Required for `for`.
  - `max_iterations` (number, optional) - Safety limit to prevent infinite loops (default: `1000`).
  - `callable` (Function) - The logic to execute for every iteration.

## Resilience Example
Process batches of data with built-in protection:

```javascript
new LoopStep({
  name: 'batch-upload',
  loop_type: 'for_each',
  iterable: fileList,
  max_retries: 2, // Retry the entire loop if it encounters a global error
  max_timeout_ms: 60000, // Maximum time for the entire batch
  callable: async function() {
    const file = this.current_item;
    return await uploadFile(file);
  }
});
```

## Note on Scope
In `for_each` loops, access the current item via `this.current_item` within the callable.
