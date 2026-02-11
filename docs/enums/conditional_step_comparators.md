# Conditional Step Comparators

Enumeration of comparison operators for conditional steps. Provides both named and symbolic operator formats.

## Values

### Equality Operators

- `EQUALS` - `'equals'` - Loose equality comparison
- `SIGN_EQUALS` - `'=='` - Loose equality (symbolic)
- `STRICT_EQUALS` - `'strict_equals'` - Strict equality comparison
- `SIGN_STRICT_EQUALS` - `'==='` - Strict equality (symbolic)

### Inequality Operators

- `NOT_EQUALS` - `'not_equals'` - Loose inequality comparison
- `SIGN_NOT_EQUALS` - `'!='` - Loose inequality (symbolic)
- `STRICT_NOT_EQUALS` - `'strict_not_equals'` - Strict inequality comparison
- `SIGN_STRICT_NOT_EQUALS` - `'!=='` - Strict inequality (symbolic)

### Comparison Operators

- `GREATER_THAN` - `'greater_than'` - Greater than comparison
- `SIGN_GREATER_THAN` - `'>'` - Greater than (symbolic)
- `LESS_THAN` - `'less_than'` - Less than comparison
- `SIGN_LESS_THAN` - `'<'` - Less than (symbolic)
- `GREATER_THAN_OR_EQUAL` - `'greater_than_or_equal'` - Greater than or equal comparison
- `SIGN_GREATER_THAN_OR_EQUAL` - `'>='` - Greater than or equal (symbolic)
- `LESS_THAN_OR_EQUAL` - `'less_than_or_equal'` - Less than or equal comparison
- `SIGN_LESS_THAN_OR_EQUAL` - `'<='` - Less than or equal (symbolic)

### String Operators

- `STRING_CONTAINS` - `'string_contains'` - Subject contains the value (string)
- `STRING_INCLUDES` - `'string_includes'` - Subject includes the value (string)
- `STRING_STARTS_WITH` - `'string_starts_with'` - Subject starts with the value
- `STRING_ENDS_WITH` - `'string_ends_with'` - Subject ends with the value

### Array Operators

- `ARRAY_CONTAINS` - `'array_contains'` - Subject contains the value (array)
- `ARRAY_INCLUDES` - `'array_includes'` - Subject includes the value (array)

### Empty Checks

- `EMPTY` - `'empty'` - Subject is empty (string/array/object)
- `NOT_EMPTY` - `'not_empty'` - Subject is not empty (string/array/object)

### Regex Operators

- `REGEX_MATCH` - `'regex_match'` - Subject matches the regex value
- `REGEX_NOT_MATCH` - `'regex_not_match'` - Subject does not match the regex value

### Set Membership Operators

- `IN` - `'in'` - Subject is in the value collection
- `NOT_IN` - `'not_in'` - Subject is not in the value collection

### Nullish Checks

- `NULLISH` - `'nullish'` - Subject is null or undefined
- `NOT_NULLISH` - `'not_nullish'` - Subject is not null or undefined

### Custom Operator

- `CUSTOM_FUNCTION` - `'custom_function'` - Delegates evaluation to a custom function. When using custom function, the `value` must be a function that takes one argument. The `subject` is passed to the `value` function.

## Usage Examples

### Node.js - Numeric Comparison

```javascript
import { LogicStep, conditional_step_comparators } from 'micro-flow';

const temperatureCheck = new LogicStep({
  name: 'check-temp',
  conditional: {
    subject: 75,
    operator: conditional_step_comparators.GREATER_THAN,
    value: 70
  },
  callable: async () => {
    console.log('Temperature is above threshold');
  }
});
```

### Node.js - String Comparison

```javascript
import { ConditionalStep, conditional_step_comparators } from 'micro-flow';

const envCheck = new ConditionalStep({
  name: 'env-check',
  conditional: {
    subject: process.env.NODE_ENV,
    operator: conditional_step_comparators.STRICT_EQUALS,
    value: 'production'
  },
  true_callable: async () => {
    return loadProductionConfig();
  },
  false_callable: async () => {
    return loadDevConfig();
  }
});
```

### Browser - Using Symbolic Operators

```javascript
import { LogicStep } from './micro-flow.js';

const ageVerification = new LogicStep({
  name: 'verify-age',
  conditional: {
    subject: userAge,
    operator: '>=', // Using symbolic operator
    value: 18
  },
  callable: async () => {
    console.log('User is an adult');
  }
});
```

### React - Dynamic Conditionals

```javascript
import { ConditionalStep } from './micro-flow.js';
import { useState } from 'react';

function DynamicComparison() {
  const [value, setValue] = useState(0);
  const [operator, setOperator] = useState('===');
  const [threshold, setThreshold] = useState(10);

  const runCheck = async () => {
    const step = new ConditionalStep({
      name: 'dynamic-check',
      conditional: {
        subject: value,
        operator: operator,
        value: threshold
      },
      true_callable: async () => 'Condition met',
      false_callable: async () => 'Condition not met'
    });

    const result = await step.execute();
    console.log(result.result);
  };

  return (
    <div>
      <input type="number" value={value} onChange={e => setValue(Number(e.target.value))} />
      <select value={operator} onChange={e => setOperator(e.target.value)}>
        <option value="===">Strictly equals</option>
        <option value="==">Equals</option>
        <option value=">">Greater than</option>
        <option value="<">Less than</option>
        <option value=">=">Greater or equal</option>
        <option value="<=">Less or equal</option>
      </select>
      <input type="number" value={threshold} onChange={e => setThreshold(Number(e.target.value))} />
      <button onClick={runCheck}>Check</button>
    </div>
  );
}
```

### Vue - Type Checking

```vue
<template>
  <div>
    <button @click="checkType">Check Type</button>
    <p>{{ message }}</p>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import { LogicStep } from './micro-flow.js';

const message = ref('');

const checkType = async () => {
  const value = '42';
  
  // Loose equality - will match
  const looseCheck = new LogicStep({
    name: 'loose',
    conditional: { subject: value, operator: '==', value: 42 }
  });
  
  // Strict equality - will not match
  const strictCheck = new LogicStep({
    name: 'strict',
    conditional: { subject: value, operator: '===', value: 42 }
  });

  message.value = `Loose: ${looseCheck.checkCondition()}, Strict: ${strictCheck.checkCondition()}`;
};
</script>
```

### Node.js - Range Validation

```javascript
import { Workflow, LogicStep } from 'micro-flow';

function validateRange(value, min, max) {
  return new Workflow({
    name: 'range-validation',
    steps: [
      new LogicStep({
        name: 'check-min',
        conditional: {
          subject: value,
          operator: '>=',
          value: min
        },
        callable: async () => {
          console.log('Value meets minimum');
        }
      }),
      new LogicStep({
        name: 'check-max',
        conditional: {
          subject: value,
          operator: '<=',
          value: max
        },
        callable: async () => {
          console.log('Value meets maximum');
        }
      })
    ]
  });
}

const workflow = validateRange(50, 0, 100);
await workflow.execute();
```

## Operator Comparison Table

| Named Operator | Symbolic | Description | Example |
|---|---|---|---|
| `STRICT_EQUALS` | `===` | Strict equality (type + value) | `5 === 5` → true, `'5' === 5` → false |
| `EQUALS` | `==` | Loose equality (value) | `5 == '5'` → true |
| `STRICT_NOT_EQUALS` | `!==` | Strict inequality | `5 !== '5'` → true |
| `NOT_EQUALS` | `!=` | Loose inequality | `5 != 6` → true |
| `GREATER_THAN` | `>` | Greater than | `10 > 5` → true |
| `LESS_THAN` | `<` | Less than | `3 < 7` → true |
| `GREATER_THAN_OR_EQUAL` | `>=` | Greater than or equal | `5 >= 5` → true |
| `LESS_THAN_OR_EQUAL` | `<=` | Less than or equal | `4 <= 4` → true |
| `STRING_CONTAINS` | n/a | String contains | `'abc' contains 'b'` → true |
| `STRING_INCLUDES` | n/a | String includes | `'abc' includes 'b'` → true |
| `STRING_STARTS_WITH` | n/a | String starts with | `'abc' startsWith 'a'` → true |
| `STRING_ENDS_WITH` | n/a | String ends with | `'abc' endsWith 'c'` → true |
| `ARRAY_CONTAINS` | n/a | Array contains | `[1,2] contains 2` → true |
| `ARRAY_INCLUDES` | n/a | Array includes | `[1,2] includes 2` → true |
| `EMPTY` | n/a | Empty check | `'' is empty` → true |
| `NOT_EMPTY` | n/a | Not empty check | `'a' not empty` → true |
| `REGEX_MATCH` | n/a | Regex match | `'abc' =~ /a/` → true |
| `REGEX_NOT_MATCH` | n/a | Regex non-match | `'abc' !~ /z/` → true |
| `IN` | n/a | Membership | `2 in [1,2,3]` → true |
| `NOT_IN` | n/a | Non-membership | `4 not in [1,2,3]` → true |
| `NULLISH` | n/a | Null/undefined check | `null is nullish` → true |
| `NOT_NULLISH` | n/a | Not null/undefined check | `'a' not nullish` → true |
| `CUSTOM_FUNCTION` | n/a | Custom evaluation | `fn(subject, value)` → result |

## See Also

- [LogicStep](../classes/steps/logic_step.md) - Uses these comparators
- [ConditionalStep](../classes/steps/conditional_step.md) - Uses these comparators
- [FlowControlStep](../classes/steps/flow_control_step.md) - Uses these comparators
