# LogicStep Class

The `LogicStep` class is the base class for all logic-based steps that control workflow execution flow. It provides condition evaluation capabilities and serves as the parent class for specialized logic steps.

## Constructor

```javascript
new LogicStep(options)
```

### Parameters

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `options.type` | `string` | Yes | - | Logic step type (from logic_step_types enum) |
| `options.callable` | `Function` | No | `async()=>{}` | Function to execute |
| `options.name` | `string` | No | `''` | Name for the step |

### Example

```javascript
import { LogicStep, LogicStepTypes } from 'micro-flow';

const logicStep = new LogicStep({
  type: LogicStepTypes.CONDITIONAL,
  name: 'Check Condition',
  callable: async () => true
});
```

## Properties

### Static Properties

- **`step_name`**: `'logic'` - Identifier for the logic step type

### State Properties

In addition to base Step state properties, LogicStep includes:

| Property | Type | Description |
|----------|------|-------------|
| `subject` | `any` | The value to compare (left side) |
| `operator` | `string` | Comparison operator |
| `value` | `any` | The value to compare against (right side) |

## Methods

### `checkCondition()`

Evaluates a condition using the subject, operator, and value properties.

```javascript
checkCondition(): boolean
```

**Returns:**
- `boolean` - True if the condition is met, false otherwise

**Throws:**
- `Error` if the operator is unknown

**Supported Operators:**

From `conditional_step_comparators` enum:

- `'==='` / `'strict_equals'` - Strict equality
- `'=='` / `'equals'` - Loose equality
- `'!=='` / `'strict_not_equals'` - Strict inequality
- `'!='` / `'not_equals'` - Loose inequality
- `'>'` / `'greater_than'` - Greater than
- `'<'` / `'less_than'` - Less than
- `'>='` / `'greater_than_or_equal'` - Greater than or equal
- `'<='` / `'less_than_or_equal'` - Less than or equal

**Example:**

```javascript
const logicStep = new LogicStep({
  type: LogicStepTypes.CONDITIONAL,
  name: 'Age Check'
});

logicStep.state.set('subject', 25);
logicStep.state.set('operator', '>=');
logicStep.state.set('value', 18);

const result = logicStep.checkCondition(); // true
```

## Usage Examples

### Basic Condition Check

```javascript
const logicStep = new LogicStep({
  type: LogicStepTypes.CONDITIONAL,
  name: 'Compare Values'
});

logicStep.state.set('subject', 'active');
logicStep.state.set('operator', '===');
logicStep.state.set('value', 'active');

if (logicStep.checkCondition()) {
  console.log('Condition met');
}
```

### Numeric Comparison

```javascript
const logicStep = new LogicStep({
  type: LogicStepTypes.CONDITIONAL,
  name: 'Check Quantity'
});

logicStep.state.set('subject', 150);
logicStep.state.set('operator', '>');
logicStep.state.set('value', 100);

console.log(logicStep.checkCondition()); // true
```

### Loose vs Strict Equality

```javascript
const logicStep = new LogicStep({
  type: LogicStepTypes.CONDITIONAL,
  name: 'Type Comparison'
});

// Loose equality
logicStep.state.set('subject', '5');
logicStep.state.set('operator', '==');
logicStep.state.set('value', 5);
console.log(logicStep.checkCondition()); // true

// Strict equality
logicStep.state.set('operator', '===');
console.log(logicStep.checkCondition()); // false
```

## Specialized Subclasses

LogicStep serves as the base class for:

1. **ConditionalStep** - If/else branching
2. **LoopStep** - While/for-each iteration
3. **SwitchStep** - Multi-way branching
4. **FlowControlStep** - Break/continue in loops
5. **SkipStep** - Conditional skip
6. **Case** - Switch case statement

Each subclass extends LogicStep and uses `checkCondition()` for evaluation.

## Inheritance

```
Step
└── LogicStep (base for logic operations)
    ├── ConditionalStep
    ├── LoopStep
    ├── SwitchStep
    ├── FlowControlStep
    ├── SkipStep
    └── Case
```

## Complete Example

```javascript
import { LogicStep, LogicStepTypes, ConditionalStepComparators } from 'micro-flow';

// Create a custom logic step
class CustomLogicStep extends LogicStep {
  constructor(options) {
    super({
      type: LogicStepTypes.CONDITIONAL,
      ...options
    });
  }
  
  async evaluate(subject, operator, value) {
    this.state.set('subject', subject);
    this.state.set('operator', operator);
    this.state.set('value', value);
    
    return this.checkCondition();
  }
}

const customStep = new CustomLogicStep({ name: 'Custom Check' });

// Test various conditions
const tests = [
  { subject: 10, operator: '>', value: 5, expected: true },
  { subject: 'hello', operator: '===', value: 'hello', expected: true },
  { subject: null, operator: '!==', value: undefined, expected: true },
  { subject: 3, operator: '<=', value: 3, expected: true }
];

for (const test of tests) {
  const result = await customStep.evaluate(
    test.subject,
    test.operator,
    test.value
  );
  console.log(`${test.subject} ${test.operator} ${test.value} = ${result}`);
}
```

## Error Handling

```javascript
const logicStep = new LogicStep({
  type: LogicStepTypes.CONDITIONAL,
  name: 'Invalid Operator Test'
});

logicStep.state.set('subject', 10);
logicStep.state.set('operator', 'invalid'); // Unknown operator
logicStep.state.set('value', 5);

try {
  logicStep.checkCondition();
} catch (error) {
  console.error('Invalid operator:', error.message);
}
```

## Design Pattern

LogicStep implements the **Template Method Pattern**:

- Base class (`LogicStep`) provides `checkCondition()` for evaluation
- Subclasses implement specific logic behavior
- All logic steps share common comparison functionality

## See Also

- [Step Class](./step.md) - Parent class
- [ConditionalStep Class](./conditional-step.md) - If/else branching
- [LoopStep Class](./loop-step.md) - Loop iteration
- [SwitchStep Class](./switch-step.md) - Multi-way branching
- [FlowControlStep Class](./flow-control-step.md) - Flow control
- [SkipStep Class](./skip-step.md) - Conditional skip
- [Case Class](./case.md) - Switch cases
- [conditional_step_comparators Enum](../enums/conditional-step-comparators.md)
- [logic_step_types Enum](../enums/logic-step-types.md)
