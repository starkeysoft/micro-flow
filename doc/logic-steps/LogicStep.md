# LogicStep

**Base class representing a logic step that evaluates conditions using various comparison operators.**

## Overview

The `LogicStep` class extends the base `Step` class to provide condition evaluation capabilities. It serves as the foundation for all logic-based step types like conditionals, loops, switches, and flow control steps.

## Class Definition

```javascript
class LogicStep extends Step
```

**Extends:** [Step](../base-classes/Step.md)  
**Location:** `src/classes/logic_step.js`

## Properties

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `step_name` | `string` (static) | `'logic'` | Static identifier for the step type |
| `subject` | `*` | `undefined` | The value to compare against |
| `operator` | `string` | `undefined` | The comparison operator to use |
| `value` | `*` | `undefined` | The value to compare the subject with |

*Inherits all properties from [Step](../base-classes/Step.md)*

## Constructor

### `constructor(options)`

Creates a new LogicStep instance.

**Parameters:**

- `options` (Object) - Configuration options for the logic step
  - `type` (string) - The type of the logic step (from logic_step_types enum)
  - `callable` (Step | Workflow | Function) *[optional]* - The Step, Workflow, or function to execute for this step (default: `async () => {}`)
  - `name` (string) *[optional]* - The name of the logic step (default: `''`)

**Example:**

```javascript
const logicStep = new LogicStep({
  type: logic_step_types.CONDITIONAL,
  name: 'Check Condition',
  callable: async () => {}
});
```

## Methods

### `checkCondition()`

Evaluates the subject using the specified operator. Supports strict/loose equality, inequality, and relational operators.

**Returns:** `boolean` - True if the condition is met, false otherwise

**Throws:** `Error` - Throws an error if the operator is unknown

**Supported Operators:**

- `===` or `STRICT_EQUALS` - Strict equality
- `==` or `EQUALS` - Loose equality
- `!=` or `NOT_EQUALS` - Loose inequality
- `!==` or `STRICT_NOT_EQUALS` - Strict inequality
- `>` or `GREATER_THAN` - Greater than
- `<` or `LESS_THAN` - Less than
- `>=` or `GREATER_THAN_OR_EQUAL` - Greater than or equal
- `<=` or `LESS_THAN_OR_EQUAL` - Less than or equal

**Example:**

```javascript
logicStep.subject = 10;
logicStep.operator = '>';
logicStep.value = 5;

const result = logicStep.checkCondition(); // true
```

---

### `setConditional(options)`

Sets the conditional properties for this logic step.

**Parameters:**

- `options` (Object) - The conditional configuration
  - `subject` (*) - The value to compare against
  - `operator` (string) - The comparison operator to use
  - `value` (*) - The value to compare the subject with

**Returns:** `void`

**Example:**

```javascript
logicStep.setConditional({
  subject: userAge,
  operator: '>=',
  value: 18
});

const isAdult = logicStep.checkCondition();
```

*Inherits all methods from [Step](../base-classes/Step.md)*

## Usage Examples

### Basic Condition Check

```javascript
import { LogicStep, logic_step_types } from './classes';

const step = new LogicStep({
  type: logic_step_types.CONDITIONAL,
  name: 'Age Check'
});

step.subject = 25;
step.operator = '>=';
step.value = 18;

if (step.checkCondition()) {
  console.log('Condition met: Age is 18 or older');
}
```

### Equality Comparisons

```javascript
// Strict equality
step.subject = '5';
step.operator = '===';
step.value = 5;
console.log(step.checkCondition()); // false (string !== number)

// Loose equality
step.operator = '==';
console.log(step.checkCondition()); // true (string == number)

// Strict inequality
step.operator = '!==';
console.log(step.checkCondition()); // true (string !== number)

// Loose inequality
step.operator = '!=';
console.log(step.checkCondition()); // false (string == number)
```

### Relational Comparisons

```javascript
// Greater than
step.subject = 100;
step.operator = '>';
step.value = 50;
console.log(step.checkCondition()); // true

// Less than
step.operator = '<';
console.log(step.checkCondition()); // false

// Greater than or equal
step.subject = 100;
step.operator = '>=';
step.value = 100;
console.log(step.checkCondition()); // true

// Less than or equal
step.operator = '<=';
console.log(step.checkCondition()); // true
```

### Using Enum Constants

```javascript
import { 
  LogicStep, 
  logic_step_types, 
  conditional_step_comparators 
} from './classes';

const step = new LogicStep({
  type: logic_step_types.CONDITIONAL,
  name: 'Status Check'
});

step.subject = 'active';
step.operator = conditional_step_comparators.STRICT_EQUALS;
step.value = 'active';

if (step.checkCondition()) {
  console.log('Status is active');
}
```

### Dynamic Conditions

```javascript
import { LogicStep, logic_step_types } from './classes';

function createConditionChecker(subject, operator, value) {
  const step = new LogicStep({
    type: logic_step_types.CONDITIONAL,
    name: `Check ${subject} ${operator} ${value}`
  });
  
  step.subject = subject;
  step.operator = operator;
  step.value = value;
  
  return () => step.checkCondition();
}

// Create various condition checkers
const isAdult = createConditionChecker(age, '>=', 18);
const isPremium = createConditionChecker(tier, '===', 'premium');
const hasCredit = createConditionChecker(balance, '>', 0);

if (isAdult() && (isPremium() || hasCredit())) {
  console.log('Eligible for offer');
}
```

## Operator Reference

| Operator | Enum Constant | Description | Example |
|----------|---------------|-------------|---------|
| `===` | `STRICT_EQUALS` | Strict equality (type and value) | `5 === 5` → true |
| `==` | `EQUALS` | Loose equality (coerced) | `'5' == 5` → true |
| `!==` | `STRICT_NOT_EQUALS` | Strict inequality | `5 !== '5'` → true |
| `!=` | `NOT_EQUALS` | Loose inequality | `5 != '5'` → false |
| `>` | `GREATER_THAN` | Greater than | `10 > 5` → true |
| `<` | `LESS_THAN` | Less than | `5 < 10` → true |
| `>=` | `GREATER_THAN_OR_EQUAL` | Greater than or equal | `5 >= 5` → true |
| `<=` | `LESS_THAN_OR_EQUAL` | Less than or equal | `5 <= 10` → true |

## Design Notes

The `LogicStep` class is designed to be extended by specialized logic step types:

- **[ConditionalStep](ConditionalStep.md)** - Branching logic (if/else)
- **[LoopStep](LoopStep.md)** - Repetitive execution (while/for-each)
- **[SwitchStep](SwitchStep.md)** - Multi-way branching (switch/case)
- **[FlowControlStep](FlowControlStep.md)** - Loop control (break/continue)

These specialized classes leverage the `checkCondition()` method to evaluate their conditions and determine execution flow.

## Error Handling

If an unknown operator is provided, `checkCondition()` throws an error:

```javascript
step.subject = 10;
step.operator = 'unknown';
step.value = 5;

try {
  step.checkCondition();
} catch (error) {
  console.error('Error:', error.message);
  // Error: Unknown subject: 10
}
```

## Best Practices

1. **Use Enum Constants**: Prefer using enum constants over string literals for operators
2. **Type Consistency**: Be aware of strict vs loose equality when comparing different types
3. **Null/Undefined**: Handle null and undefined values appropriately in your conditions
4. **Complex Logic**: For complex conditions, consider creating custom logic classes
5. **Documentation**: Document the expected types for subject and value in custom implementations

## Related Classes

- [Step](../base-classes/Step.md) - Base step class
- [ConditionalStep](ConditionalStep.md) - If/else branching
- [LoopStep](LoopStep.md) - Loops and iteration
- [SwitchStep](SwitchStep.md) - Multi-way branching
- [FlowControlStep](FlowControlStep.md) - Break/continue flow control
- [Case](Case.md) - Switch case evaluation
