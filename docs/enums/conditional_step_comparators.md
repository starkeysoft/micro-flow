# conditional_step_comparators

The full set of comparison operators supported by `LogicStep.checkCondition()`. Each operator has a named string form and most also have a sign alias (e.g. `'==='` alongside `'strict_equals'`). Both forms are accepted anywhere an operator is expected.

## Table of Contents
- [Values](#values)
- [Usage](#usage)
- [Related](#related)

## Values

### Equality

| Key | Value | Description |
|-----|-------|-------------|
| `STRICT_EQUALS` | `'strict_equals'` | Strict equality: `subject === value` |
| `SIGN_STRICT_EQUALS` | `'==='` | Sign alias for `STRICT_EQUALS` |
| `EQUALS` | `'equals'` | Loose equality: `subject == value` |
| `SIGN_EQUALS` | `'=='` | Sign alias for `EQUALS` |
| `STRICT_NOT_EQUALS` | `'strict_not_equals'` | Strict inequality: `subject !== value` |
| `SIGN_STRICT_NOT_EQUALS` | `'!=='` | Sign alias for `STRICT_NOT_EQUALS` |
| `NOT_EQUALS` | `'not_equals'` | Loose inequality: `subject != value` |
| `SIGN_NOT_EQUALS` | `'!='` | Sign alias for `NOT_EQUALS` |

### Comparison

| Key | Value | Description |
|-----|-------|-------------|
| `GREATER_THAN` | `'greater_than'` | `subject > value` |
| `SIGN_GREATER_THAN` | `'>'` | Sign alias for `GREATER_THAN` |
| `LESS_THAN` | `'less_than'` | `subject < value` |
| `SIGN_LESS_THAN` | `'<'` | Sign alias for `LESS_THAN` |
| `GREATER_THAN_OR_EQUAL` | `'greater_than_or_equal'` | `subject >= value` |
| `SIGN_GREATER_THAN_OR_EQUAL` | `'>='` | Sign alias for `GREATER_THAN_OR_EQUAL` |
| `LESS_THAN_OR_EQUAL` | `'less_than_or_equal'` | `subject <= value` |
| `SIGN_LESS_THAN_OR_EQUAL` | `'<='` | Sign alias for `LESS_THAN_OR_EQUAL` |

### String

| Key | Value | Description |
|-----|-------|-------------|
| `STRING_CONTAINS` | `'string_contains'` | `subject.includes(value)` |
| `STRING_INCLUDES` | `'string_includes'` | Alias for `STRING_CONTAINS` |
| `STRING_NOT_CONTAINS` | `'string_not_contains'` | `!subject.includes(value)` |
| `STRING_NOT_INCLUDES` | `'string_not_includes'` | Alias for `STRING_NOT_CONTAINS` |
| `STRING_STARTS_WITH` | `'string_starts_with'` | `subject.startsWith(value)` |
| `STRING_ENDS_WITH` | `'string_ends_with'` | `subject.endsWith(value)` |
| `REGEX_MATCH` | `'regex_match'` | `new RegExp(value).test(subject)` |
| `REGEX_NOT_MATCH` | `'regex_not_match'` | `!new RegExp(value).test(subject)` |

### Array

| Key | Value | Description |
|-----|-------|-------------|
| `ARRAY_CONTAINS` | `'array_contains'` | `subject.includes(value)` (subject is array) |
| `ARRAY_INCLUDES` | `'array_includes'` | Alias for `ARRAY_CONTAINS` |
| `ARRAY_NOT_CONTAINS` | `'array_not_contains'` | `!subject.includes(value)` (subject is array) |
| `ARRAY_NOT_INCLUDES` | `'array_not_includes'` | Alias for `ARRAY_NOT_CONTAINS` |
| `IN` | `'in'` | `value.includes(subject)` (value is array) |
| `NOT_IN` | `'not_in'` | `!value.includes(subject)` (value is array) |

### Existence

| Key | Value | Description |
|-----|-------|-------------|
| `EMPTY` | `'empty'` | Subject is `''`, `null`, `undefined`, or has length `0` |
| `NOT_EMPTY` | `'not_empty'` | Subject is not empty |
| `NULLISH` | `'nullish'` | `subject == null` (null or undefined) |
| `NOT_NULLISH` | `'not_nullish'` | `subject != null` |

### Type

| Key | Value | Description |
|-----|-------|-------------|
| `IS_TYPE` | `'is_type'` | `typeof subject === value` |
| `IS_NOT_TYPE` | `'is_not_type'` | `typeof subject !== value` |

### Custom

| Key | Value | Description |
|-----|-------|-------------|
| `CUSTOM_FUNCTION` | `'custom_function'` | `value(subject)` — `value` is the comparison function; returns truthy/falsy |

## Usage

```javascript
import { LogicStep, conditional_step_comparators } from '@ronaldroe/micro-flow';

// Using the named constant
const check = new LogicStep({
  name: 'email-check',
  conditional: {
    subject: 'user@example.com',
    operator: conditional_step_comparators.STRING_CONTAINS,
    value: '@',
  },
});
console.log(check.checkCondition()); // true

// Using the sign alias directly
const gtCheck = new LogicStep({
  name: 'age-check',
  conditional: { subject: 25, operator: '>=', value: 18 },
});
console.log(gtCheck.checkCondition()); // true

// CUSTOM_FUNCTION — value is the comparator
const customCheck = new LogicStep({
  name: 'credit-score',
  conditional: {
    subject: { score: 720, history: 5 },
    operator: conditional_step_comparators.CUSTOM_FUNCTION,
    value: (profile) => profile.score >= 700 && profile.history >= 2,
  },
});
console.log(customCheck.checkCondition()); // true

// IN operator — subject is in an allowed list
const roleCheck = new LogicStep({
  name: 'role-check',
  conditional: {
    subject: 'editor',
    operator: conditional_step_comparators.IN,
    value: ['admin', 'editor', 'moderator'],
  },
});
console.log(roleCheck.checkCondition()); // true

// EMPTY / NOT_EMPTY
const notEmpty = new LogicStep({
  name: 'has-items',
  conditional: { subject: [1, 2, 3], operator: 'not_empty' },
});
console.log(notEmpty.checkCondition()); // true

// IS_TYPE
const typeCheck = new LogicStep({
  name: 'is-number',
  conditional: { subject: 42, operator: 'is_type', value: 'number' },
});
console.log(typeCheck.checkCondition()); // true
```

## Related

- [LogicStep](../classes/steps/logic_step.md) — Consumes these operators in `checkCondition()`.
- [ConditionalStep](../classes/steps/conditional_step.md) — Uses operators for branching.
- [FlowControlStep](../classes/steps/flow_control_step.md) — Uses operators for break/skip decisions.
- [LoopStep](../classes/steps/loop_step.md) — Uses operators for `while` conditions.
- [Case](../classes/steps/case.md) — Uses operators for switch case matching.
