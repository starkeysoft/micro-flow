# ConditionalStep

Branch your logic flow based on state evaluation. `ConditionalStep` executes one of two branches by evaluating a subject against an operator and a value.

Extends: [LogicStep](logic_step.md)

## Constructor

### `new ConditionalStep(options)`

Initializes a new ConditionalStep instance.

**Parameters:**
- `options` (Object) - Configuration options
  - `name` (string, optional) - Unique name for identification.
  - `conditional` (Object) - Configuration for the comparison logic.
    - `subject` (any|Function) - The value to evaluate.
    - `operator` (string) - The comparison operator (e.g., '===', '>', 'includes').
    - `value` (any|Function) - The value to compare against.
  - `true_callable` (Function|Step|Workflow) - Executed if the condition is met.
  - `false_callable` (Function|Step|Workflow) - Executed if the condition fails.

## Resilience Example
Ensure your branching logic is resilient to external failures:

```javascript
new ConditionalStep({
  name: 'verify-account',
  max_retries: 3, // Retry the check if the network is flaky
  max_timeout_ms: 5000, // Fail fast if the check takes too long
  conditional: {
    subject: async () => await checkAuthStatus(),
    operator: '===',
    value: 'AUTHORIZED'
  },
  true_callable: processOrderWorkflow,
  false_callable: redirectToLoginStep
});
```

## Methods

### `async execute()`

Evaluates the condition and triggers the appropriate branch.

**Returns:** Promise\<any\> - The result of the executed branch.
