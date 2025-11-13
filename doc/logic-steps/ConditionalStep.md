# ConditionalStep

**Represents a conditional step that executes one of two possible paths based on a condition.**

## Overview

The `ConditionalStep` class provides if/else branching logic within workflows. Based on a condition evaluation, it executes either the left step (if condition is true) or the right step (if condition is false).

## Class Definition

```javascript
class ConditionalStep extends LogicStep
```

**Extends:** [LogicStep](LogicStep.md)  
**Location:** `src/classes/conditional_step.js`

## Properties

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `step_name` | `string` (static) | `logic_step_types.CONDITIONAL` | Static identifier for the step type |
| `step_left` | `Step` | - | The step to execute if the condition is met |
| `step_right` | `Step` | - | The step to execute if the condition is not met |

*Inherits all properties from [LogicStep](LogicStep.md)*

## Constructor

### `constructor(options)`

Creates a new ConditionalStep instance.

**Parameters:**

- `options` (Object) *[optional]* - Configuration options for the conditional step
  - `subject` (*) - The value to compare against
  - `operator` (string) - The comparison operator to use (e.g., '===', '==', '!=', '>', '<', '>=', '<=')
  - `value` (*) - The value to compare the subject with
  - `step_left` (Step) - The step to execute if the condition is met
  - `step_right` (Step) - The step to execute if the condition is not met
  - `name` (string) *[optional]* - The name of the conditional step (default: `''`)

**Example:**

```javascript
import { ConditionalStep, ActionStep } from './classes';

const conditional = new ConditionalStep({
  name: 'Age Check',
  subject: user.age,
  operator: '>=',
  value: 18,
  step_left: new ActionStep({
    name: 'Adult Path',
    callable: async () => console.log('User is an adult')
  }),
  step_right: new ActionStep({
    name: 'Minor Path',
    callable: async () => console.log('User is a minor')
  })
});
```

## Methods

### `conditional()`

Executes either the left or right step based on the condition evaluation.

**Returns:** `Promise<*|null>` - The result of executing the chosen step, or null if no step is provided

**Async:** Yes

**Example:**

```javascript
const result = await conditional.conditional();
```

*Inherits all methods from [LogicStep](LogicStep.md) and [Step](../base-classes/Step.md)*

## Usage Examples

### Basic Conditional

```javascript
import { ConditionalStep, ActionStep, Workflow } from './classes';

const checkAge = new ConditionalStep({
  name: 'Verify Age',
  subject: 25,
  operator: '>=',
  value: 18,
  step_left: new ActionStep({
    name: 'Grant Access',
    callable: async () => {
      console.log('Access granted');
      return { access: true };
    }
  }),
  step_right: new ActionStep({
    name: 'Deny Access',
    callable: async () => {
      console.log('Access denied');
      return { access: false };
    }
  })
});

const workflow = new Workflow([checkAge]);
await workflow.execute();
```

### Context-Based Conditional

```javascript
import { ConditionalStep, ActionStep, Workflow } from './classes';

const workflow = new Workflow([
  new ActionStep({
    name: 'Fetch User',
    callable: async (context) => {
      context.user = await fetchUser(context.userId);
      return context.user;
    }
  }),
  new ConditionalStep({
    name: 'Check Premium Status',
    subject: (context) => context.user.tier,
    operator: '===',
    value: 'premium',
    step_left: new ActionStep({
      name: 'Premium Features',
      callable: async (context) => {
        return await enablePremiumFeatures(context.user);
      }
    }),
    step_right: new ActionStep({
      name: 'Standard Features',
      callable: async (context) => {
        return await enableStandardFeatures(context.user);
      }
    })
  })
]);

await workflow.execute({ userId: 123 });
```

### Nested Conditionals

```javascript
import { ConditionalStep, ActionStep } from './classes';

const ageCheck = new ConditionalStep({
  name: 'Age Check',
  subject: user.age,
  operator: '>=',
  value: 18,
  step_left: new ConditionalStep({
    name: 'Senior Check',
    subject: user.age,
    operator: '>=',
    value: 65,
    step_left: new ActionStep({
      name: 'Senior Discount',
      callable: async () => ({ discount: 0.20 })
    }),
    step_right: new ActionStep({
      name: 'Adult Price',
      callable: async () => ({ discount: 0 })
    })
  }),
  step_right: new ActionStep({
    name: 'Youth Discount',
    callable: async () => ({ discount: 0.10 })
  })
});

const result = await ageCheck.execute();
```

### Multiple Conditions in Workflow

```javascript
import { ConditionalStep, ActionStep, Workflow } from './classes';

const orderProcessing = new Workflow([
  new ActionStep({
    name: 'Calculate Total',
    callable: async (context) => {
      context.total = context.items.reduce((sum, item) => sum + item.price, 0);
      return context.total;
    }
  }),
  new ConditionalStep({
    name: 'Check Free Shipping',
    subject: (context) => context.total,
    operator: '>=',
    value: 50,
    step_left: new ActionStep({
      name: 'Apply Free Shipping',
      callable: async (context) => {
        context.shipping = 0;
        return context;
      }
    }),
    step_right: new ActionStep({
      name: 'Add Shipping Cost',
      callable: async (context) => {
        context.shipping = 5.99;
        return context;
      }
    })
  }),
  new ConditionalStep({
    name: 'Check Discount Eligibility',
    subject: (context) => context.user.membershipYears,
    operator: '>',
    value: 5,
    step_left: new ActionStep({
      name: 'Apply Loyalty Discount',
      callable: async (context) => {
        context.total *= 0.90; // 10% off
        return context;
      }
    }),
    step_right: new ActionStep({
      name: 'No Discount',
      callable: async (context) => context
    })
  }),
  new ActionStep({
    name: 'Process Payment',
    callable: async (context) => {
      return await processPayment(context.total + context.shipping);
    }
  })
]);

await orderProcessing.execute({ items: cart, user: currentUser });
```

### Error Handling

```javascript
import { ConditionalStep, ActionStep } from './classes';

const processWithFallback = new ConditionalStep({
  name: 'Try Primary Service',
  subject: (context) => context.primaryServiceAvailable,
  operator: '===',
  value: true,
  step_left: new ActionStep({
    name: 'Use Primary',
    callable: async (context) => {
      try {
        return await primaryService.process(context.data);
      } catch (error) {
        context.primaryServiceAvailable = false;
        throw error;
      }
    }
  }),
  step_right: new ActionStep({
    name: 'Use Fallback',
    callable: async (context) => {
      console.log('Using fallback service');
      return await fallbackService.process(context.data);
    }
  })
});
```

### Dynamic Conditions

```javascript
import { ConditionalStep, ActionStep } from './classes';

function createFeatureGate(featureName, enabledStep, disabledStep) {
  return new ConditionalStep({
    name: `Feature Gate: ${featureName}`,
    subject: (context) => context.features[featureName],
    operator: '===',
    value: true,
    step_left: enabledStep,
    step_right: disabledStep
  });
}

// Usage
const betaFeatureGate = createFeatureGate(
  'beta_ui',
  new ActionStep({
    name: 'Load Beta UI',
    callable: async () => loadBetaUI()
  }),
  new ActionStep({
    name: 'Load Standard UI',
    callable: async () => loadStandardUI()
  })
);
```

## Comparison Operators

The ConditionalStep supports all operators from [LogicStep](LogicStep.md):

| Operator | Description | Example |
|----------|-------------|---------|
| `===` | Strict equality | `status === 'active'` |
| `==` | Loose equality | `count == '5'` |
| `!==` | Strict inequality | `type !== 'guest'` |
| `!=` | Loose inequality | `value != 0` |
| `>` | Greater than | `age > 18` |
| `<` | Less than | `price < 100` |
| `>=` | Greater than or equal | `score >= 70` |
| `<=` | Less than or equal | `attempts <= 3` |

## Best Practices

1. **Descriptive Names**: Use clear names that describe the condition being checked
2. **Single Responsibility**: Each branch should handle one logical path
3. **Null Safety**: Ensure subject and value handle null/undefined appropriately
4. **Type Safety**: Be mindful of strict vs loose equality for different types
5. **Avoid Deep Nesting**: For multiple conditions, consider using SwitchStep
6. **Context Usage**: Leverage context for dynamic condition evaluation
7. **Error Handling**: Handle errors in both branches appropriately

## Common Patterns

### Authentication Gate
```javascript
new ConditionalStep({
  subject: (context) => context.user.authenticated,
  operator: '===',
  value: true,
  step_left: authenticatedFlow,
  step_right: loginFlow
});
```

### Feature Toggle
```javascript
new ConditionalStep({
  subject: (context) => context.features.newFeature,
  operator: '===',
  value: true,
  step_left: newFeatureImplementation,
  step_right: legacyImplementation
});
```

### Threshold Check
```javascript
new ConditionalStep({
  subject: (context) => context.score,
  operator: '>=',
  value: passingScore,
  step_left: successHandler,
  step_right: failureHandler
});
```

## Related Classes

- [LogicStep](LogicStep.md) - Base logic evaluation class
- [SwitchStep](SwitchStep.md) - Multi-way branching
- [LoopStep](LoopStep.md) - Conditional loops
- [FlowControlStep](FlowControlStep.md) - Loop flow control
- [ActionStep](../step-types/ActionStep.md) - Action execution
