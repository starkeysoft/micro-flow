# conditional_step_comparators Enum

Defines comparison operators for use in ConditionalStep when comparing values.

## Values

The enum provides both named and symbolic formats for each operator:

### Named Format

| Constant | Value | Description |
|----------|-------|-------------|
| `EQUALS` | `'equals'` | Loose equality (==) |
| `STRICT_EQUALS` | `'strict_equals'` | Strict equality (===) |
| `NOT_EQUALS` | `'not_equals'` | Loose inequality (!=) |
| `STRICT_NOT_EQUALS` | `'strict_not_equals'` | Strict inequality (!==) |
| `GREATER_THAN` | `'greater_than'` | Greater than (>) |
| `LESS_THAN` | `'less_than'` | Less than (<) |
| `GREATER_THAN_OR_EQUAL` | `'greater_than_or_equal'` | Greater than or equal (>=) |
| `LESS_THAN_OR_EQUAL` | `'less_than_or_equal'` | Less than or equal (<=) |

### Symbolic Format

| Constant | Value | Description |
|----------|-------|-------------|
| `SIGN_EQUALS` | `'=='` | Loose equality |
| `SIGN_STRICT_EQUALS` | `'==='` | Strict equality |
| `SIGN_NOT_EQUALS` | `'!='` | Loose inequality |
| `SIGN_STRICT_NOT_EQUALS` | `'!=='` | Strict inequality |
| `SIGN_GREATER_THAN` | `'>'` | Greater than |
| `SIGN_LESS_THAN` | `'<'` | Less than |
| `SIGN_GREATER_THAN_OR_EQUAL` | `'>='` | Greater than or equal |
| `SIGN_LESS_THAN_OR_EQUAL` | `'<='` | Less than or equal |

## Import

```javascript
import { ConditionalStepComparators } from 'micro-flow';
// or
import ConditionalStepComparators from 'micro-flow/enums/conditional_step_comparators';
```

## Usage

ConditionalStep callables can return these operators along with values to compare:

```javascript
import { ConditionalStep, ConditionalStepComparators } from 'micro-flow';

const conditional = new ConditionalStep({
  name: 'Check Value',
  callable: async function() {
    const value = this.workflow.userAge;
    return {
      comparator: ConditionalStepComparators.GREATER_THAN_OR_EQUAL,
      value_a: value,
      value_b: 18
    };
  },
  if_true_steps: [/* ... */],
  if_false_steps: [/* ... */]
});

await conditional.execute();
```

## Comparison Operators

### EQUALS / SIGN_EQUALS (==)

Loose equality - performs type coercion.

```javascript
new ConditionalStep({
  name: 'Check Loose Equality',
  callable: async function() {
    return {
      comparator: ConditionalStepComparators.EQUALS,
      value_a: '5',
      value_b: 5
    }; // true ('5' == 5)
  },
  if_true_steps: [/* ... */]
});
```

### STRICT_EQUALS / SIGN_STRICT_EQUALS (===)

Strict equality - no type coercion.

```javascript
new ConditionalStep({
  name: 'Check Strict Equality',
  callable: async function() {
    return {
      comparator: ConditionalStepComparators.STRICT_EQUALS,
      value_a: '5',
      value_b: 5
    }; // false ('5' !== 5)
  },
  if_false_steps: [/* ... */]
});
```

### NOT_EQUALS / SIGN_NOT_EQUALS (!=)

Loose inequality - performs type coercion.

```javascript
new ConditionalStep({
  name: 'Check Not Equal',
  callable: async function() {
    return {
      comparator: ConditionalStepComparators.NOT_EQUALS,
      value_a: this.workflow.status,
      value_b: 'complete'
    };
  },
  if_true_steps: [/* continue processing */]
});
```

### STRICT_NOT_EQUALS / SIGN_STRICT_NOT_EQUALS (!==)

Strict inequality - no type coercion.

```javascript
new ConditionalStep({
  name: 'Check Strict Not Equal',
  callable: async function() {
    return {
      comparator: ConditionalStepComparators.STRICT_NOT_EQUALS,
      value_a: null,
      value_b: undefined
    }; // true (null !== undefined)
  },
  if_true_steps: [/* ... */]
});
```

### GREATER_THAN / SIGN_GREATER_THAN (>)

Value A is greater than Value B.

```javascript
new ConditionalStep({
  name: 'Check Age',
  callable: async function() {
    return {
      comparator: ConditionalStepComparators.GREATER_THAN,
      value_a: this.workflow.userAge,
      value_b: 21
    };
  },
  if_true_steps: [/* adult content */],
  if_false_steps: [/* restricted */]
});
```

### LESS_THAN / SIGN_LESS_THAN (<)

Value A is less than Value B.

```javascript
new ConditionalStep({
  name: 'Check Quota',
  callable: async function() {
    return {
      comparator: ConditionalStepComparators.LESS_THAN,
      value_a: this.workflow.currentUsage,
      value_b: this.workflow.maxQuota
    };
  },
  if_true_steps: [/* allow operation */],
  if_false_steps: [/* quota exceeded */]
});
```

### GREATER_THAN_OR_EQUAL / SIGN_GREATER_THAN_OR_EQUAL (>=)

Value A is greater than or equal to Value B.

```javascript
new ConditionalStep({
  name: 'Check Minimum',
  callable: async function() {
    return {
      comparator: ConditionalStepComparators.GREATER_THAN_OR_EQUAL,
      value_a: this.workflow.items.length,
      value_b: 1
    };
  },
  if_true_steps: [/* process items */],
  if_false_steps: [/* no items */]
});
```

### LESS_THAN_OR_EQUAL / SIGN_LESS_THAN_OR_EQUAL (<=)

Value A is less than or equal to Value B.

```javascript
new ConditionalStep({
  name: 'Check Maximum',
  callable: async function() {
    return {
      comparator: ConditionalStepComparators.LESS_THAN_OR_EQUAL,
      value_a: this.workflow.fileSize,
      value_b: 1024 * 1024 * 10 // 10 MB
    };
  },
  if_true_steps: [/* upload file */],
  if_false_steps: [/* file too large */]
});
```

## Named vs Symbolic

Both formats are functionally identical - choose based on preference:

```javascript
// Named format (more readable)
{
  comparator: ConditionalStepComparators.GREATER_THAN_OR_EQUAL,
  value_a: 10,
  value_b: 5
}

// Symbolic format (more concise)
{
  comparator: ConditionalStepComparators.SIGN_GREATER_THAN_OR_EQUAL,
  value_a: 10,
  value_b: 5
}

// Or use string literals
{
  comparator: '>=',
  value_a: 10,
  value_b: 5
}
```

## Complete Examples

### Range Check

```javascript
const checkRange = new ConditionalStep({
  name: 'Check Valid Range',
  callable: async function() {
    const value = this.workflow.inputValue;
    const min = 0;
    const max = 100;
    
    // Check if value is within range
    if (value < min || value > max) {
      return false; // Simple boolean
    }
    
    return true;
  },
  if_false_steps: [
    new Step({
      name: 'Handle Out of Range',
      type: StepTypes.ACTION,
      callable: async () => {
        throw new Error('Value out of range');
      }
    })
  ]
});
```

### Multi-Level Comparison

```javascript
const checkPermission = new ConditionalStep({
  name: 'Check Permission Level',
  callable: async function() {
    return {
      comparator: ConditionalStepComparators.GREATER_THAN_OR_EQUAL,
      value_a: this.workflow.userPermissionLevel,
      value_b: 5 // Required permission level
    };
  },
  if_true_steps: [
    new Step({
      name: 'Grant Access',
      type: StepTypes.ACTION,
      callable: async () => grantAccess()
    })
  ],
  if_false_steps: [
    new Step({
      name: 'Deny Access',
      type: StepTypes.ACTION,
      callable: async () => denyAccess()
    })
  ]
});
```

### Type-Safe Comparison

```javascript
const strictTypeCheck = new ConditionalStep({
  name: 'Validate Input Type',
  callable: async function() {
    const input = this.workflow.userInput;
    
    return {
      comparator: ConditionalStepComparators.STRICT_EQUALS,
      value_a: typeof input,
      value_b: 'number'
    };
  },
  if_false_steps: [
    new Step({
      name: 'Convert to Number',
      type: StepTypes.ACTION,
      callable: async function() {
        this.workflow.userInput = Number(this.workflow.userInput);
      }
    })
  ]
});
```

### Null/Undefined Check

```javascript
const checkExists = new ConditionalStep({
  name: 'Check Data Exists',
  callable: async function() {
    return {
      comparator: ConditionalStepComparators.STRICT_NOT_EQUALS,
      value_a: this.workflow.data,
      value_b: null
    };
  },
  if_true_steps: [
    // Process data
  ],
  if_false_steps: [
    // Fetch data
  ]
});
```

## Boolean Shorthand

For simple true/false checks, return a boolean directly instead of using comparators:

```javascript
new ConditionalStep({
  name: 'Simple Check',
  callable: async function() {
    // Return boolean directly
    return this.workflow.isAuthenticated === true;
  },
  if_true_steps: [/* ... */],
  if_false_steps: [/* ... */]
});
```

## See Also

- [ConditionalStep Class](../classes/conditional-step.md)
- [logic_step_types Enum](./logic-step-types.md)
- [Step Types - Conditional Step](../step-types/conditional-step.md)
