# Workflow Enums

**Enumeration constants used throughout the Node Workflow library**

---

## Overview

The workflow system uses several enumerations to provide type-safe constants for various operations, states, and configurations. All enums are exported as plain JavaScript objects with uppercase keys and lowercase string values.

---

## Step Types

**Location:** `src/enums/step_types.js`

Categorizes steps by their primary function within the workflow.

```javascript
import step_types from './enums/step_types.js';
```

| Constant | Value | Description |
|----------|-------|-------------|
| `INITIATOR` | `'initiator'` | Step that initiates a workflow |
| `ACTION` | `'action'` | Step that executes an action or function |
| `LOGIC` | `'logic'` | Step that implements control flow logic |
| `DELAY` | `'delay'` | Step that introduces a time delay |
| `SUBFLOW` | `'subflow'` | Step that executes a nested sub-workflow |

**Example:**

```javascript
import { ActionStep } from './classes';
import step_types from './enums/step_types.js';

const step = new ActionStep({
  name: 'Process Data',
  type: step_types.ACTION,
  callable: async (context) => { /* ... */ }
});
```

---

## Logic Step Types

**Location:** `src/enums/logic_step_types.js`

Defines types of logic-based workflow control flow steps.

```javascript
import logic_step_types from './enums/logic_step_types.js';
```

| Constant | Value | Description |
|----------|-------|-------------|
| `CONDITIONAL` | `'conditional'` | Conditional branching (if/else) |
| `LOOP` | `'loop'` | Loop iteration (while/for-each) |
| `FLOW_CONTROL` | `'flow_control'` | Flow control (break/continue) |
| `SWITCH` | `'switch'` | Multi-way branching (switch/case) |

**Example:**

```javascript
import { ConditionalStep } from './classes';
import logic_step_types from './enums/logic_step_types.js';

const conditionalStep = new ConditionalStep({
  type: logic_step_types.CONDITIONAL,
  subject: (context) => context.user.age,
  operator: '>=',
  value: 18,
  step_left: adultStep,
  step_right: minorStep
});
```

---

## Step Statuses

**Location:** `src/enums/step_statuses.js`

Represents the execution status of a step during its lifecycle.

```javascript
import step_statuses from './enums/step_statuses.js';
```

| Constant | Value | Description |
|----------|-------|-------------|
| `WAITING` | `'waiting'` | Step is waiting to be executed |
| `PENDING` | `'pending'` | Step is pending execution |
| `RUNNING` | `'running'` | Step is currently executing |
| `COMPLETE` | `'complete'` | Step has completed successfully |
| `FAILED` | `'failed'` | Step has failed with an error |

**Status Lifecycle:**

```
WAITING → PENDING → RUNNING → COMPLETE
                           ↘ FAILED
```

**Example:**

```javascript
import step_statuses from './enums/step_statuses.js';

step.events.on('STEP_COMPLETED', ({ step }) => {
  console.log(step.status === step_statuses.COMPLETE); // true
});
```

---

## Conditional Step Comparators

**Location:** `src/enums/conditional_step_comparators.js`

Comparison operators for conditional logic evaluation.

```javascript
import conditional_step_comparators from './enums/conditional_step_comparators.js';
```

### Named Comparators

| Constant | Value | Symbol | Description |
|----------|-------|--------|-------------|
| `EQUALS` | `'equals'` | `==` | Loose equality |
| `STRICT_EQUALS` | `'strict_equals'` | `===` | Strict equality |
| `NOT_EQUALS` | `'not_equals'` | `!=` | Loose inequality |
| `STRICT_NOT_EQUALS` | `'strict_not_equals'` | `!==` | Strict inequality |
| `GREATER_THAN` | `'greater_than'` | `>` | Greater than |
| `LESS_THAN` | `'less_than'` | `<` | Less than |
| `GREATER_THAN_OR_EQUAL` | `'greater_than_or_equal'` | `>=` | Greater than or equal |
| `LESS_THAN_OR_EQUAL` | `'less_than_or_equal'` | `<=` | Less than or equal |

### Symbolic Comparators

| Constant | Value | Description |
|----------|-------|-------------|
| `SIGN_EQUALS` | `'=='` | Symbolic loose equality |
| `SIGN_STRICT_EQUALS` | `'==='` | Symbolic strict equality |
| `SIGN_NOT_EQUALS` | `'!='` | Symbolic loose inequality |
| `SIGN_STRICT_NOT_EQUALS` | `'!=='` | Symbolic strict inequality |
| `SIGN_GREATER_THAN` | `'>'` | Symbolic greater than |
| `SIGN_LESS_THAN` | `'<'` | Symbolic less than |
| `SIGN_GREATER_THAN_OR_EQUAL` | `'>='` | Symbolic greater than or equal |
| `SIGN_LESS_THAN_OR_EQUAL` | `'<='` | Symbolic less than or equal |

**Example:**

```javascript
import { ConditionalStep } from './classes';

// Using named comparator
const namedComparison = new ConditionalStep({
  subject: (context) => context.score,
  operator: 'greater_than',
  value: 90,
  // ...
});

// Using symbolic comparator (recommended)
const symbolicComparison = new ConditionalStep({
  subject: (context) => context.score,
  operator: '>',
  value: 90,
  // ...
});
```

---

## Delay Types

**Location:** `src/enums/delay_types.js`

Types of delays for DelayStep execution.

```javascript
import delay_types from './enums/delay_types.js';
```

| Constant | Value | Description |
|----------|-------|-------------|
| `RELATIVE` | `'relative'` | Delay for a relative duration (milliseconds) |
| `ABSOLUTE` | `'absolute'` | Delay until a specific timestamp |

**Example:**

```javascript
import { DelayStep } from './classes';
import delay_types from './enums/delay_types.js';

// Relative delay (wait 5 seconds)
const relativeDelay = new DelayStep({
  name: 'Wait 5 seconds',
  type: delay_types.RELATIVE,
  delay: 5000
});

// Absolute delay (wait until specific time)
const absoluteDelay = new DelayStep({
  name: 'Wait until midnight',
  type: delay_types.ABSOLUTE,
  delay: new Date('2025-11-14T00:00:00Z').getTime()
});
```

---

## Loop Types

**Location:** `src/enums/loop_types.js`

Types of loop iterations for LoopStep.

```javascript
import loop_types from './enums/loop_types.js';
```

| Constant | Value | Description |
|----------|-------|-------------|
| `WHILE` | `'while'` | While loop - continues while condition is true |
| `FOR_EACH` | `'for_each'` | For-each loop - iterates over an array |

**Example:**

```javascript
import { LoopStep } from './classes';
import loop_types from './enums/loop_types.js';

// While loop
const whileLoop = new LoopStep({
  name: 'Process until empty',
  loop_type: loop_types.WHILE,
  subject: (context) => context.queue.length,
  operator: '>',
  value: 0,
  sub_workflow: processingWorkflow
});

// For-each loop
const forEachLoop = new LoopStep({
  name: 'Process each item',
  loop_type: loop_types.FOR_EACH,
  subject: (context) => context.items,
  sub_workflow: itemWorkflow
});
```

---

## Flow Control Types

**Location:** `src/enums/flow_control_types.js`

Types of flow control operations for breaking or continuing execution.

```javascript
import flow_control_types from './enums/flow_control_types.js';
```

| Constant | Value | Description |
|----------|-------|-------------|
| `BREAK` | `'break'` | Break out of the current loop or workflow |
| `CONTINUE` | `'continue'` | Continue to the next iteration of the loop |

**Example:**

```javascript
import { FlowControlStep } from './classes';
import flow_control_types from './enums/flow_control_types.js';

const breakStep = new FlowControlStep({
  name: 'Break if error',
  subject: (context) => context.hasError,
  operator: '===',
  value: true
});

const continueStep = new FlowControlStep({
  name: 'Skip invalid items',
  subject: (context) => context.current.isValid,
  operator: '===',
  value: false
});
```

---

## Step Event Names

**Location:** `src/enums/step_event_names.js`

Event names emitted during step lifecycle.

```javascript
import step_event_names from './enums/step_event_names.js';
```

| Constant | Value | Description |
|----------|-------|-------------|
| `STEP_PENDING` | `'step_pending'` | Step enters pending state |
| `STEP_RUNNING` | `'step_running'` | Step starts running |
| `STEP_COMPLETED` | `'step_completed'` | Step completes successfully |
| `STEP_FAILED` | `'step_failed'` | Step fails with an error |

**Example:**

```javascript
import step_event_names from './enums/step_event_names.js';

step.events.on(step_event_names.STEP_COMPLETED, ({ step }) => {
  console.log(`Step ${step.name} completed`);
});

step.events.on(step_event_names.STEP_FAILED, ({ step, error }) => {
  console.error(`Step ${step.name} failed:`, error);
});
```

---

## Workflow Event Names

**Location:** `src/enums/workflow_event_names.js`

Event names emitted during workflow lifecycle.

```javascript
import workflow_event_names from './enums/workflow_event_names.js';
```

| Constant | Value | Description |
|----------|-------|-------------|
| `WORKFLOW_CREATED` | `'workflow_created'` | Workflow is created |
| `WORKFLOW_STARTED` | `'workflow_started'` | Workflow starts execution |
| `WORKFLOW_COMPLETED` | `'workflow_completed'` | Workflow completes successfully |
| `WORKFLOW_ERRORED` | `'workflow_errored'` | Workflow encounters an error |
| `WORKFLOW_FAILED` | `'workflow_failed'` | Workflow fails |
| `WORKFLOW_STEP_ADDED` | `'workflow_step_added'` | Single step is added |
| `WORKFLOW_STEPS_ADDED` | `'workflow_steps_added'` | Multiple steps are added |
| `WORKFLOW_STEP_REMOVED` | `'workflow_step_removed'` | Step is removed |
| `WORKFLOW_STEP_SHIFTED` | `'workflow_step_shifted'` | Step is shifted (removed from beginning) |
| `WORKFLOW_STEP_MOVED` | `'workflow_step_moved'` | Step is moved within the workflow |
| `WORKFLOW_STEPS_CLEARED` | `'workflow_steps_cleared'` | All steps are cleared |

**Example:**

```javascript
import workflow_event_names from './enums/workflow_event_names.js';

workflow.events.on(workflow_event_names.WORKFLOW_STARTED, ({ workflow }) => {
  console.log(`Workflow ${workflow.name} started`);
});

workflow.events.on(workflow_event_names.WORKFLOW_COMPLETED, ({ workflow, state }) => {
  console.log(`Workflow completed in ${state.get('execution_time_ms')}ms`);
});

workflow.events.on(workflow_event_names.WORKFLOW_ERRORED, ({ workflow, error }) => {
  console.error(`Workflow error:`, error);
});
```

---

## Sub-Step Types

**Location:** `src/enums/sub_step_types.js`

Dynamic mapping of Step class names to their step_name identifiers. This enum is generated at runtime by reading class files from the filesystem to avoid circular dependencies.

```javascript
import sub_step_types from './enums/sub_step_types.js';
```

**Generated Mapping:**

```javascript
{
  "ActionStep": "action",
  "ConditionalStep": "conditional",
  "DelayStep": "delay",
  "FlowControlStep": "flow_control",
  "LogicStep": "logic",
  "LoopStep": "loop",
  "SubflowStep": "subflow",
  "SwitchStep": "switch",
  "Step": null,
  "Case": null,
  // ... other classes without step_name
}
```

**Note:** This enum is generated dynamically by parsing class files and resolving enum references. Classes without a `step_name` property are mapped to `null`.

---

## Best Practices

### 1. Use Enums for Type Safety

✅ **DO:**
```javascript
import step_types from './enums/step_types.js';

const step = new ActionStep({
  type: step_types.ACTION,
  // ...
});
```

❌ **DON'T:**
```javascript
const step = new ActionStep({
  type: 'action', // String literal, prone to typos
  // ...
});
```

### 2. Import Only What You Need

✅ **DO:**
```javascript
import loop_types from './enums/loop_types.js';
```

❌ **DON'T:**
```javascript
import * as enums from './enums'; // Avoid wildcard imports
```

### 3. Use Symbolic Comparators

For conditional operations, symbolic comparators (`>`, `<`, `===`, etc.) are more readable:

✅ **DO:**
```javascript
operator: '>=',
operator: '===',
```

❌ **DON'T:**
```javascript
operator: 'greater_than_or_equal',
operator: 'strict_equals',
```

### 4. Check Status with Enums

✅ **DO:**
```javascript
import step_statuses from './enums/step_statuses.js';

if (step.status === step_statuses.COMPLETE) {
  // ...
}
```

❌ **DON'T:**
```javascript
if (step.status === 'complete') {
  // ...
}
```

---

## Related Documentation

- [Step](../base-classes/Step.md) - Base class using step types and statuses
- [Workflow](../base-classes/Workflow.md) - Workflow events and lifecycle
- [ConditionalStep](../logic-steps/ConditionalStep.md) - Uses comparators
- [LoopStep](../logic-steps/LoopStep.md) - Uses loop types
- [DelayStep](../step-types/DelayStep.md) - Uses delay types

---

**Last Updated:** November 13, 2025
