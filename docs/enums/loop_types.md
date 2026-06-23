# loop_types

Determines the iteration strategy used by a `LoopStep`. Selects between count-based, collection-based, condition-based, and generator-based looping.

## Table of Contents
- [Values](#values)
- [Usage](#usage)
- [Related](#related)

## Values

| Key | Value | Description |
|-----|-------|-------------|
| `FOR` | `'for'` | Runs the callable a fixed number of times (`iterations`). |
| `FOR_EACH` | `'for_each'` | Iterates over `iterable`, setting `this.current_item` before each call. |
| `WHILE` | `'while'` | Loops as long as `checkCondition()` returns `true` (up to `max_iterations`). |
| `GENERATOR` | `'generator'` | The callable is a generator or async generator; collects yielded values. |

## Usage

```javascript
import { LoopStep, loop_types } from '@ronaldroe/micro-flow';

// FOR — repeat N times
const countLoop = new LoopStep({
  name: 'retry-loop',
  loop_type: loop_types.FOR,
  iterations: 5,
  callable: async () => ({ attempt: true }),
});

// FOR_EACH — iterate over a collection
const eachLoop = new LoopStep({
  name: 'process-items',
  loop_type: loop_types.FOR_EACH,
  iterable: ['a', 'b', 'c'],
  callable: async function () {
    return { item: this.current_item };
  },
});

// WHILE — loop until condition fails
let counter = 0;
const whileLoop = new LoopStep({
  name: 'increment',
  loop_type: loop_types.WHILE,
  conditional: {
    subject: () => counter,
    operator: '<',
    value: 3,
  },
  callable: async () => { counter++; return counter; },
});

// GENERATOR — collect yielded values
async function* idGenerator() {
  let id = 1;
  while (id <= 4) yield id++;
}

const genLoop = new LoopStep({
  name: 'gen-ids',
  loop_type: loop_types.GENERATOR,
  max_iterations: 4,
  callable: idGenerator,
});
```

## Related

- [LoopStep](../classes/steps/loop_step.md) — Consumes `loop_types` to select iteration strategy.
