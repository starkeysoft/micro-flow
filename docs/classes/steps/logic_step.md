# LogicStep

Extends `Step` with a configurable conditional expression. `LogicStep` evaluates a `{ subject, operator, value }` triple and exposes `checkCondition()` as a boolean test. It is the base class for `ConditionalStep`, `FlowControlStep`, `LoopStep`, and `Case`.

**Extends:** [Step](step.md)

## Table of Contents
- [Constructor](#constructor)
- [Properties](#properties)
- [Methods](#methods)
- [Supported Operators](#supported-operators)
- [Examples](#examples)
- [Related](#related)

## Constructor

### `new LogicStep(options)`

Creates a new LogicStep instance.

#### Parameters

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `options.name` | `string` | `'step-<uuid>'` | Human-readable identifier. |
| `options.callable` | `Function\|Step\|Workflow` | `async () => {}` | Work to execute when `execute()` is called. |
| `options.callable_registry_key` | `string\|null` | `null` | Registry key to serialize `callable` under when it's a function, instead of the function's name. Resolved from the `CallableRegistry` passed to `hydrate()`, and restored onto the hydrated step. See [Persistence](step.md#persistence). |
| `options.conditional` | `Object` | `{ subject: null, operator: null, value: null }` | Conditional configuration. |
| `options.conditional.subject` | `any\|Function` | `null` | Value (or function returning value) to evaluate. Evaluated at check time if a function. |
| `options.conditional.operator` | `string` | `null` | Comparison operator string (see [Supported Operators](#supported-operators)). |
| `options.conditional.value` | `any\|Function` | `null` | Value (or function returning value) to compare against. For `CUSTOM_FUNCTION`, `value` is the comparison function itself. |
| `options.max_retries` | `number` | `0` | Maximum number of additional attempts after a failure. See [Step](step.md#constructor). |
| `options.max_timeout_ms` | `number\|null` | `30000` | Milliseconds before an attempt times out and is treated as a failure. Each retry gets the full budget. `null` (or `Infinity`) disables the timeout. |

## Properties

| Property | Type | Description |
|----------|------|-------------|
| `conditional_config` | `Object` | Stores `{ subject, operator, value }`. Updated by `setConditional()`. |

All properties from [Step](step.md) are inherited.

## Methods

### `checkCondition()` → `boolean`

Evaluates the conditional expression, taking the subject from `getConditionalSubject()`. If `subject` or `value` are functions, they are called first to resolve the actual values. For the `CUSTOM_FUNCTION` operator, `value(subject)` is called directly.

**Returns:** `true` if the condition is satisfied, `false` otherwise.

**Throws:** `Error` if the operator is unknown.

**Example:**
```javascript
import { LogicStep, State } from '@ronaldroe/micro-flow';

const check = new LogicStep({
  name: 'inventory-check',
  conditional: {
    subject: () => State.get('inventory.count'),
    operator: '>',
    value: 0,
  },
});

State.set('inventory.count', 5);
console.log(check.checkCondition()); // true

State.set('inventory.count', 0);
console.log(check.checkCondition()); // false
```

---

### `conditionalIsValid()` → `boolean`

Returns `true` if both the subject (as returned by `getConditionalSubject()`) and `conditional_config.operator` are non-null and non-undefined.

**Returns:** `boolean`

**Example:**
```javascript
import { LogicStep } from '@ronaldroe/micro-flow';

const invalid = new LogicStep({
  name: 'incomplete',
  conditional: { subject: null, operator: '===', value: true },
});
console.log(invalid.conditionalIsValid()); // false

const valid = new LogicStep({
  name: 'complete',
  conditional: { subject: 5, operator: '>', value: 0 },
});
console.log(valid.conditionalIsValid()); // true
```

---

### `getConditionalSubject()` → `any|Function`

Returns the unresolved subject used by `checkCondition()` and `conditionalIsValid()`. On `LogicStep` this is `conditional_config.subject`. Subclasses can override it to supply a subject from somewhere else without persisting it; [`Case`](case.md#getconditionalsubject--anyfunction) uses it to return its parent `SwitchStep`'s subject.

**Returns:** The subject, or the function that produces it.

---

### `setConditional(conditional)`

Updates the `conditional_config` with a new configuration object.

**Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `conditional` | `Object` | Object with `subject`, `operator`, and optionally `value`. |

**Example:**
```javascript
import { LogicStep } from '@ronaldroe/micro-flow';

const step = new LogicStep({
  name: 'updatable-check',
  conditional: { subject: 0, operator: '===', value: 0 },
});

step.setConditional({ subject: 10, operator: '>=', value: 5 });
console.log(step.checkCondition()); // true
```

---

### `prepareForSerialization()` → `Object`

Extends [`Step.prepareForSerialization()`](step.md#prepareforserialization--object) with the step's `conditional` configuration. A function-valued `subject` or `value` is stored as `null` in `conditional`, with a registry reference in `conditional_callables` (built by [`Step.serializeFunctionRef()`](step.md#static-serializefunctionreffn-registry_key--objectnull), keyed by the function's name).

**Returns:** The base `Step` fields plus `conditional` and `conditional_callables`.

```
{
  ...,                          // Step fields — see Step § prepareForSerialization()
  conditional: { subject, operator, value },   // function-valued subject/value become null
  conditional_callables: {
    subject: { type: 'function', value: string } | null,
    value: { type: 'function', value: string } | null
  }
}
```

**Note:** To round-trip a function-valued `subject`/`value`, register the function in the [`CallableRegistry`](../callable_registry.md) under its name. Inline arrow functions get an inferred name from the property they're assigned to, so `subject: () => State.get('x')` is named `'subject'`. A named function (`subject: function inventoryCount() { ... }`) or one registered separately and referenced by name is easier to manage. Anonymous functions have no name and serialize as `null`.

---

### `static hydrate(parsed_step, callableRegistry?)` → `LogicStep`

Resolves any function-valued `subject`/`value` from `conditional_callables` via [`Step.hydrateFunctionRef()`](step.md#static-hydratefunctionrefdescriptor-callableregistry--functionnull), then delegates to [`Step.hydrate()`](step.md#static-hydrateparsed_step-callableregistry--step). Inherited by `ConditionalStep`, `FlowControlStep`, `LoopStep`, and `Case`. If a function's name isn't found in `callableRegistry`, it logs a `console.warn` and leaves that field `null` instead of throwing (unlike a missing primary `callable`). Re-attach it with `setConditional()` after hydrating.

**Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `parsed_step` | `Object` | A parsed step object (e.g., from `JSON.parse()`). |
| `callableRegistry` | `CallableRegistry\|null` | Registry used to resolve function callables and function-valued conditional fields. |

**Returns:** A hydrated instance of `this` class.

## Supported Operators

| Enum Key | String Value | Description |
|----------|-------------|-------------|
| `STRICT_EQUALS` | `'strict_equals'` or `'==='` | Strict equality (`===`) |
| `EQUALS` | `'equals'` or `'=='` | Loose equality (`==`) |
| `NOT_EQUALS` | `'not_equals'` or `'!='` | Loose inequality (`!=`) |
| `STRICT_NOT_EQUALS` | `'strict_not_equals'` or `'!=='` | Strict inequality (`!==`) |
| `GREATER_THAN` | `'greater_than'` or `'>'` | Greater than |
| `LESS_THAN` | `'less_than'` or `'<'` | Less than |
| `GREATER_THAN_OR_EQUAL` | `'greater_than_or_equal'` or `'>='` | Greater than or equal |
| `LESS_THAN_OR_EQUAL` | `'less_than_or_equal'` or `'<='` | Less than or equal |
| `STRING_CONTAINS` | `'string_contains'` / `'string_includes'` | String includes substring |
| `STRING_NOT_CONTAINS` | `'string_not_contains'` / `'string_not_includes'` | String does not include substring |
| `STRING_STARTS_WITH` | `'string_starts_with'` | String starts with value |
| `STRING_ENDS_WITH` | `'string_ends_with'` | String ends with value |
| `ARRAY_CONTAINS` | `'array_contains'` / `'array_includes'` | Array includes element |
| `ARRAY_NOT_CONTAINS` | `'array_not_contains'` / `'array_not_includes'` | Array does not include element |
| `IN` | `'in'` | Subject is in array value |
| `NOT_IN` | `'not_in'` | Subject is not in array value |
| `EMPTY` | `'empty'` | Subject is `''`, `null`, `undefined`, or length `0` |
| `NOT_EMPTY` | `'not_empty'` | Subject is not empty |
| `REGEX_MATCH` | `'regex_match'` | Subject matches regex pattern in value |
| `REGEX_NOT_MATCH` | `'regex_not_match'` | Subject does not match regex |
| `NULLISH` | `'nullish'` | Subject is `null` or `undefined` |
| `NOT_NULLISH` | `'not_nullish'` | Subject is not `null`/`undefined` |
| `IS_TYPE` | `'is_type'` | `typeof subject === value` |
| `IS_NOT_TYPE` | `'is_not_type'` | `typeof subject !== value` |
| `CUSTOM_FUNCTION` | `'custom_function'` | `value(subject)` — `value` is the comparison function |

## Examples

### Dynamic subject from State

```javascript
import { LogicStep, State } from '@ronaldroe/micro-flow';

State.set('queue.length', 7);

const queueCheck = new LogicStep({
  name: 'queue-not-empty',
  conditional: {
    subject: () => State.get('queue.length'),
    operator: 'greater_than',
    value: 0,
  },
});

console.log(queueCheck.checkCondition()); // true
```

### Custom function operator

```javascript
import { LogicStep } from '@ronaldroe/micro-flow';

const complexCheck = new LogicStep({
  name: 'credit-check',
  conditional: {
    subject: { score: 720, income: 80000 },
    operator: 'custom_function',
    value: (profile) => profile.score >= 700 && profile.income >= 50000,
  },
});

console.log(complexCheck.checkCondition()); // true
```

### Using operators from enum

```javascript
import { LogicStep, conditional_step_comparators } from '@ronaldroe/micro-flow';

const emailCheck = new LogicStep({
  name: 'validate-email',
  conditional: {
    subject: 'user@example.com',
    operator: conditional_step_comparators.STRING_CONTAINS,
    value: '@',
  },
});

console.log(emailCheck.checkCondition()); // true
```

### Array membership check

```javascript
import { LogicStep } from '@ronaldroe/micro-flow';

const roleCheck = new LogicStep({
  name: 'has-admin-role',
  conditional: {
    subject: 'admin',
    operator: 'in',
    value: ['admin', 'superadmin'],
  },
});

console.log(roleCheck.checkCondition()); // true
```

### Regex validation

```javascript
import { LogicStep } from '@ronaldroe/micro-flow';

const phoneCheck = new LogicStep({
  name: 'valid-phone',
  conditional: {
    subject: '+1-555-867-5309',
    operator: 'regex_match',
    value: '^\\+?[1-9]\\d{1,14}$',
  },
});

console.log(phoneCheck.checkCondition()); // true
```

## Related

- [Step](step.md) — Parent class. See [Step § Persistence](step.md#persistence) for how serialization/hydration works.
- [ConditionalStep](conditional_step.md) — Branches based on `checkCondition()`.
- [FlowControlStep](flow_control_step.md) — Breaks or skips the parent workflow.
- [LoopStep](loop_step.md) — Loops while `checkCondition()` is true.
- [Case](case.md) — A single case in a `SwitchStep`.
- [conditional_step_comparators](../../../enums/conditional_step_comparators.md) — Full enum of operator values.
