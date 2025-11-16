# ConditionalStep Class

The `ConditionalStep` class enables if/else branching in workflows based on condition evaluation. It executes one of two possible paths depending on whether the condition is true or false.

## Constructor

```javascript
new ConditionalStep(options)
```

### Parameters

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `options.subject` | `any` | No | - | Value to compare (left side) |
| `options.operator` | `string` | No | - | Comparison operator |
| `options.value` | `any` | No | - | Value to compare against (right side) |
| `options.step_left` | `Step\|Workflow` | No | - | Step/workflow to execute if condition is true |
| `options.step_right` | `Step\|Workflow` | No | - | Step/workflow to execute if condition is false |
| `options.name` | `string` | No | `''` | Name for the conditional step |
| `options.callable` | `Function` | No | - | Alternative: function returning boolean |

### Example

```javascript
import { ConditionalStep, Step, StepTypes } from 'micro-flow';

const conditional = new ConditionalStep({
  name: 'Check User Role',
  subject: userRole,
  operator: '===',
  value: 'admin',
  step_left: new Step({
    name: 'Admin Action',
    type: StepTypes.ACTION,
    callable: async () => performAdminAction()
  }),
  step_right: new Step({
    name: 'User Action',
    type: StepTypes.ACTION,
    callable: async () => performUserAction()
  })
});

await conditional.execute();
```

## Properties

### Static Properties

- **`step_name`**: `logic_step_types.CONDITIONAL` - Identifier for conditional steps

### State Properties

In addition to LogicStep state properties:

| Property | Type | Description |
|----------|------|-------------|
| `step_left` | `Step\|Workflow` | True branch (executed if condition is met) |
| `step_right` | `Step\|Workflow` | False branch (executed if condition is not met) |

## Methods

### `conditional()`

Executes either the left or right step based on the condition evaluation.

```javascript
async conditional(): Promise<Object|null>
```

**Returns:**
- `Promise<Object|null>` - Result from executing the chosen step `{result, state}`, or null if no step provided

**Example:**

```javascript
const result = await conditional.execute();
console.log(result.result); // Result from either step_left or step_right
```

## Usage Examples

### Simple Boolean Condition

```javascript
const conditional = new ConditionalStep({
  name: 'Check Authentication',
  callable: async function() {
    // Access workflow state
    return this.workflow.isAuthenticated === true;
  },
  step_left: new Step({
    name: 'Authenticated Flow',
    type: StepTypes.ACTION,
    callable: async () => loadUserData()
  }),
  step_right: new Step({
    name: 'Login Required',
    type: StepTypes.ACTION,
    callable: async () => redirectToLogin()
  })
});

await conditional.execute();
```

### Value Comparison

```javascript
const conditional = new ConditionalStep({
  name: 'Age Check',
  subject: user.age,
  operator: '>=',
  value: 18,
  step_left: new Step({
    name: 'Adult Content',
    type: StepTypes.ACTION,
    callable: async () => showAdultContent()
  }),
  step_right: new Step({
    name: 'Restricted',
    type: StepTypes.ACTION,
    callable: async () => showRestricted()
  })
});

await conditional.execute();
```

### Workflow State Access

```javascript
const conditional = new ConditionalStep({
  name: 'Check Quota',
  callable: async function() {
    const usage = this.workflow.currentUsage;
    const limit = this.workflow.quotaLimit;
    return usage < limit;
  },
  step_left: new Step({
    name: 'Allow Operation',
    type: StepTypes.ACTION,
    callable: async function() {
      this.workflow.currentUsage++;
      return performOperation();
    }
  }),
  step_right: new Step({
    name: 'Quota Exceeded',
    type: StepTypes.ACTION,
    callable: async () => {
      throw new Error('Quota exceeded');
    }
  })
});

await conditional.execute();
```

### Nested Conditionals

```javascript
const outerConditional = new ConditionalStep({
  name: 'Check Role',
  subject: user.role,
  operator: '===',
  value: 'admin',
  step_left: new ConditionalStep({
    name: 'Check Premium',
    subject: user.isPremium,
    operator: '===',
    value: true,
    step_left: premiumAdminStep,
    step_right: regularAdminStep
  }),
  step_right: new ConditionalStep({
    name: 'Check Basic User Type',
    subject: user.type,
    operator: '===',
    value: 'basic',
    step_left: basicUserStep,
    step_right: guestUserStep
  })
});

await outerConditional.execute();
```

### Conditional with Workflow

```javascript
const adminWorkflow = new Workflow({ name: 'Admin Flow' });
adminWorkflow.pushSteps([
  adminStep1,
  adminStep2,
  adminStep3
]);

const userWorkflow = new Workflow({ name: 'User Flow' });
userWorkflow.pushSteps([
  userStep1,
  userStep2
]);

const conditional = new ConditionalStep({
  name: 'Route by Role',
  subject: currentUser.role,
  operator: '===',
  value: 'admin',
  step_left: new Step({
    name: 'Admin Workflow',
    type: StepTypes.ACTION,
    callable: adminWorkflow
  }),
  step_right: new Step({
    name: 'User Workflow',
    type: StepTypes.ACTION,
    callable: userWorkflow
  })
});

await conditional.execute();
```

### Type Comparison

```javascript
const conditional = new ConditionalStep({
  name: 'Type Check',
  callable: async function() {
    const input = this.workflow.userInput;
    return typeof input === 'number';
  },
  step_left: new Step({
    name: 'Process Number',
    type: StepTypes.ACTION,
    callable: async function() {
      return this.workflow.userInput * 2;
    }
  }),
  step_right: new Step({
    name: 'Convert to Number',
    type: StepTypes.ACTION,
    callable: async function() {
      this.workflow.userInput = Number(this.workflow.userInput);
      return this.workflow.userInput;
    }
  })
});

await conditional.execute();
```

### Error Handling Branches

```javascript
const conditional = new ConditionalStep({
  name: 'Check Previous Step',
  callable: async function() {
    const prevStep = this.workflow.output_data[this.workflow.current_step_index - 1];
    return prevStep?.result?.success === true;
  },
  step_left: new Step({
    name: 'Continue Processing',
    type: StepTypes.ACTION,
    callable: async () => continueProcessing()
  }),
  step_right: new Step({
    name: 'Handle Error',
    type: StepTypes.ACTION,
    callable: async () => handleError()
  })
});

await conditional.execute();
```

### In Workflow Context

```javascript
const workflow = new Workflow({ name: 'Conditional Workflow' });

workflow.pushSteps([
  new Step({
    name: 'Fetch Data',
    type: StepTypes.INITIATOR,
    callable: async function() {
      const data = await fetchData();
      this.workflow.dataSize = data.length;
      return data;
    }
  }),
  
  new ConditionalStep({
    name: 'Check Data Size',
    callable: async function() {
      return this.workflow.dataSize > 100;
    },
    step_left: new Step({
      name: 'Batch Process',
      type: StepTypes.ACTION,
      callable: async function() {
        return processBatch(this.workflow.output_data[0].result);
      }
    }),
    step_right: new Step({
      name: 'Direct Process',
      type: StepTypes.ACTION,
      callable: async function() {
        return processDirect(this.workflow.output_data[0].result);
      }
    })
  }),
  
  new Step({
    name: 'Save Results',
    type: StepTypes.ACTION,
    callable: async function() {
      const processed = this.workflow.output_data[1].result;
      return await save(processed);
    }
  })
]);

await workflow.execute();
```

### Multiple Comparison Operators

```javascript
// Strict equality
const strictCheck = new ConditionalStep({
  name: 'Strict Check',
  subject: '5',
  operator: '===',
  value: 5,
  step_left: strictMatchStep,
  step_right: noMatchStep
});

// Loose equality
const looseCheck = new ConditionalStep({
  name: 'Loose Check',
  subject: '5',
  operator: '==',
  value: 5,
  step_left: matchStep,
  step_right: noMatchStep
});

// Inequality
const notEqualCheck = new ConditionalStep({
  name: 'Not Equal',
  subject: status,
  operator: '!==',
  value: 'error',
  step_left: continueStep,
  step_right: errorHandlerStep
});

// Greater than
const greaterCheck = new ConditionalStep({
  name: 'Greater Check',
  subject: count,
  operator: '>',
  value: 10,
  step_left: highCountStep,
  step_right: lowCountStep
});
```

## Callable Return Formats

ConditionalStep callable can return:

### Boolean

```javascript
callable: async function() {
  return true; // or false
}
```

### Comparison Object

```javascript
callable: async function() {
  return {
    comparator: '>=',
    value_a: this.workflow.age,
    value_b: 18
  };
}
```

## Branch Selection Logic

- If condition is **true**: Execute `step_left` (if provided)
- If condition is **false**: Execute `step_right` (if provided)
- If chosen branch is `null`: Returns `null`

## See Also

- [LogicStep Class](./logic-step.md) - Parent class
- [LoopStep Class](./loop-step.md) - Loop iteration
- [SwitchStep Class](./switch-step.md) - Multi-way branching
- [conditional_step_comparators Enum](../enums/conditional-step-comparators.md)
- [logic_step_types Enum](../enums/logic-step-types.md)
- [Core Concepts - Steps](../../core-concepts/steps.md)
