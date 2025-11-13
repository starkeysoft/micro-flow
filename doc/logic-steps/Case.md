# Case

**Represents a case in a switch statement that evaluates a condition and executes a callable if matched.**

## Overview

The `Case` class is used within `SwitchStep` to define individual case branches. Each case evaluates a condition and executes its callable if the condition is met.

## Class Definition

```javascript
class Case extends LogicStep
```

**Extends:** [LogicStep](LogicStep.md)  
**Location:** `src/classes/case.js`

## Properties

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `shouldBreak` | `boolean` | `false` | Flag indicating if the case matched and should break the switch evaluation |

*Inherits all properties from [LogicStep](LogicStep.md)*

## Constructor

### `constructor(options)`

Creates a new Case instance.

**Parameters:**

- `options` (Object) - Configuration options
  - `subject` (*) - The value to compare against
  - `operator` (string) - The comparison operator (e.g., '===', '==', '!=', '>', '<', '>=', '<=')
  - `value` (*) - The value to compare the subject with
  - `callable` (Step | Workflow | Function) *[optional]* - The Step, Workflow, or async function to execute if condition is met (default: `async()=>{}`)

**Example:**

```javascript
const case1 = new Case({
  subject: userRole,
  operator: '===',
  value: 'admin',
  callable: async () => {
    return { access: 'full' };
  }
});
```

## Methods

### `check()`

Checks the condition and executes the callable if the condition is met. Sets `shouldBreak` to `true` if the condition matches.

**Returns:** `Promise<*|boolean>` - The result of the callable if matched, `false` otherwise

**Async:** Yes

**Example:**

```javascript
const case1 = new Case({
  subject: status,
  operator: '===',
  value: 'active',
  callable: async () => ({ message: 'Active user' })
});

const result = await case1.check();
if (result !== false) {
  console.log('Case matched:', result);
  console.log('Should break:', case1.shouldBreak); // true
}
```

*Inherits all methods from [LogicStep](LogicStep.md) and [Step](../base-classes/Step.md)*

## Usage

Cases are typically used within a SwitchStep:

```javascript
import { SwitchStep, Case } from './classes';

const switchStep = new SwitchStep({
  name: 'Handle Status',
  cases: [
    new Case({
      subject: status,
      operator: '===',
      value: 'active',
      callable: async () => ({ allowed: true })
    }),
    new Case({
      subject: status,
      operator: '===',
      value: 'inactive',
      callable: async () => ({ allowed: false })
    })
  ]
});
```

## Related Classes

- [SwitchStep](SwitchStep.md) - Multi-way branching
- [LogicStep](LogicStep.md) - Base logic evaluation
