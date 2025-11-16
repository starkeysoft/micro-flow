# Case Class

The `Case` class represents a single case in a switch statement, evaluating a condition and executing a callable if the condition matches.

## Constructor

```javascript
new Case(options)
```

### Parameters

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `options.subject` | `any` | Yes | - | Value to compare |
| `options.operator` | `string` | Yes | - | Comparison operator |
| `options.value` | `any` | Yes | - | Value to compare against |
| `options.callable` | `Function\|Step\|Workflow` | No | `async () => {}` | Action to execute if condition matches |

### Example

```javascript
import { Case, Step, Workflow, StepTypes } from 'micro-flow';

// Case with inline function
const case1 = new Case({
  subject: () => status,
  operator: '===',
  value: 'pending',
  callable: async () => ({ action: 'queue' })
});

// Case with Step
const case2 = new Case({
  subject: () => status,
  operator: '===',
  value: 'approved',
  callable: new Step({
    name: 'Approve',
    type: StepTypes.ACTION,
    callable: async () => processApproval()
  })
});

// Case with Workflow
const case3 = new Case({
  subject: () => status,
  operator: '===',
  value: 'rejected',
  callable: rejectionWorkflow
});
```

## Properties

### State Properties

Inherited from LogicStep:

| Property | Type | Description |
|----------|------|-------------|
| `subject` | `any` | Value being evaluated |
| `operator` | `string` | Comparison operator |
| `value` | `any` | Value to compare against |
| `callable` | `Function\|Step\|Workflow` | Action to execute on match |
| `shouldBreak` | `boolean` | Flag set to true when case matches |

## Methods

### `check()`

Evaluates the case condition and executes the callable if it matches.

```javascript
async check(): Promise<Object|boolean>
```

**Returns:**
- `Promise<Object>` - Result with `{ result, state }` from callable execution if condition matches
- `Promise<boolean>` - `false` if condition does not match

**Behavior:**
- Evaluates condition using `checkCondition()`
- Sets `shouldBreak` to true if condition matches
- Executes `callable` and returns result if matched
- Returns `false` if condition does not match

## Usage Examples

### Basic Case with Function

```javascript
const statusCase = new Case({
  subject: () => order.status,
  operator: '===',
  value: 'pending',
  callable: async () => {
    console.log('Order is pending');
    return { action: 'wait' };
  }
});

const result = await statusCase.check();
if (result) {
  console.log('Case matched:', result);
}
```

### Case with Step

```javascript
const processStep = new Step({
  name: 'Process Payment',
  type: StepTypes.ACTION,
  callable: async () => {
    const result = await processPayment();
    return { success: true, transactionId: result.id };
  }
});

const paymentCase = new Case({
  subject: () => payment.status,
  operator: '===',
  value: 'ready',
  callable: processStep
});

await paymentCase.check();
```

### Case with Workflow

```javascript
const approvalWorkflow = new Workflow({ name: 'Approval Process' });
approvalWorkflow.pushSteps([
  new Step({
    name: 'Validate',
    type: StepTypes.ACTION,
    callable: async () => validateApproval()
  }),
  new Step({
    name: 'Notify',
    type: StepTypes.ACTION,
    callable: async () => notifyStakeholders()
  }),
  new Step({
    name: 'Update Status',
    type: StepTypes.ACTION,
    callable: async () => updateStatus('approved')
  })
]);

const approvalCase = new Case({
  subject: () => request.status,
  operator: '===',
  value: 'pending_approval',
  callable: approvalWorkflow
});

await approvalCase.check();
```

### Numeric Comparison Cases

```javascript
// Greater than
const highValueCase = new Case({
  subject: () => cart.total,
  operator: '>',
  value: 1000,
  callable: async () => applyPremiumDiscount()
});

// Greater than or equal
const bulkCase = new Case({
  subject: () => order.quantity,
  operator: '>=',
  value: 100,
  callable: async () => applyBulkDiscount()
});

// Less than
const expressCase = new Case({
  subject: () => order.weight,
  operator: '<',
  value: 5,
  callable: async () => enableExpressShipping()
});
```

### String Comparison Cases

```javascript
const regionCase = new Case({
  subject: () => user.region,
  operator: '===',
  value: 'US',
  callable: async () => ({
    currency: 'USD',
    shippingProvider: 'USPS',
    taxRate: 0.07
  })
});

const languageCase = new Case({
  subject: () => user.language,
  operator: '===',
  value: 'es',
  callable: async () => loadSpanishContent()
});
```

### Boolean Cases

```javascript
const premiumCase = new Case({
  subject: () => user.isPremium,
  operator: '===',
  value: true,
  callable: async () => enablePremiumFeatures()
});

const verifiedCase = new Case({
  subject: () => user.isVerified,
  operator: '===',
  value: true,
  callable: async () => allowFullAccess()
});
```

### Complex Subject Evaluation

```javascript
// Function as subject
const complexCase = new Case({
  subject: () => calculateRiskScore(user, transaction),
  operator: '>',
  value: 0.8,
  callable: async () => flagForReview()
});

// Multiple conditions in subject
const combinedCase = new Case({
  subject: () => user.isPremium && user.credits > 0,
  operator: '===',
  value: true,
  callable: async () => allowPremiumDownload()
});
```

### Cases in SwitchStep

```javascript
const switchStep = new SwitchStep({
  name: 'Process By Type',
  cases: [
    new Case({
      subject: () => data.type,
      operator: '===',
      value: 'image',
      callable: imageProcessor
    }),
    new Case({
      subject: () => data.type,
      operator: '===',
      value: 'video',
      callable: videoProcessor
    }),
    new Case({
      subject: () => data.type,
      operator: '===',
      value: 'document',
      callable: documentProcessor
    })
  ],
  default_case: new Case({
    subject: () => true,
    operator: '===',
    value: true,
    callable: async () => ({ error: 'Unsupported type' })
  })
});

await switchStep.execute();
```

### Nested Workflow Cases

```javascript
const userTypeWorkflow = new Workflow({ name: 'User Type Handler' });
userTypeWorkflow.pushSteps([
  new Step({
    name: 'Load Permissions',
    type: StepTypes.ACTION,
    callable: async () => loadUserPermissions()
  }),
  new Step({
    name: 'Load Preferences',
    type: StepTypes.ACTION,
    callable: async () => loadUserPreferences()
  }),
  new Step({
    name: 'Load Dashboard',
    type: StepTypes.ACTION,
    callable: async () => loadUserDashboard()
  })
]);

const adminCase = new Case({
  subject: () => user.role,
  operator: '===',
  value: 'admin',
  callable: userTypeWorkflow
});

await adminCase.check();
```

### Dynamic Value Cases

```javascript
// Value from workflow state
const thresholdCase = new Case({
  subject: () => metrics.cpu,
  operator: '>',
  value: () => workflow.state.get('cpuThreshold'),
  callable: async () => scaleUpInstances()
});

// Value from environment
const envCase = new Case({
  subject: () => currentEnv,
  operator: '===',
  value: process.env.TARGET_ENV || 'production',
  callable: async () => loadProductionConfig()
});
```

### Error Handling Cases

```javascript
const errorCase = new Case({
  subject: () => response.status,
  operator: '===',
  value: 500,
  callable: new Step({
    name: 'Handle Server Error',
    type: StepTypes.ACTION,
    callable: async function() {
      console.error('Server error occurred');
      this.workflow.shouldRetry = true;
      return { error: 'Server error', retry: true };
    }
  })
});

await errorCase.check();
```

### State-Based Cases

```javascript
const stateCase = new Case({
  subject: () => machine.state,
  operator: '===',
  value: 'running',
  callable: async function() {
    // Access workflow state
    const startTime = this.workflow?.state?.get('startTime');
    const uptime = Date.now() - startTime;
    
    return {
      state: 'running',
      uptime,
      healthy: uptime < 86400000 // Less than 24 hours
    };
  }
});

await stateCase.check();
```

### Array/Collection Cases

```javascript
const emptyCase = new Case({
  subject: () => items.length,
  operator: '===',
  value: 0,
  callable: async () => ({ message: 'No items to process' })
});

const singleCase = new Case({
  subject: () => items.length,
  operator: '===',
  value: 1,
  callable: async () => processSingleItem(items[0])
});

const multipleCase = new Case({
  subject: () => items.length,
  operator: '>',
  value: 1,
  callable: async () => processMultipleItems(items)
});
```

### Null/Undefined Cases

```javascript
const nullCase = new Case({
  subject: () => optionalValue,
  operator: '===',
  value: null,
  callable: async () => useDefaultValue()
});

const undefinedCase = new Case({
  subject: () => optionalValue,
  operator: '===',
  value: undefined,
  callable: async () => useDefaultValue()
});

const existsCase = new Case({
  subject: () => optionalValue,
  operator: '!==',
  value: undefined,
  callable: async () => processValue(optionalValue)
});
```

## Supported Operators

The Case class supports all comparison operators from the parent LogicStep class:

- `===` - Strict equality
- `==` - Loose equality
- `!==` - Strict inequality
- `!=` - Loose inequality
- `>` - Greater than
- `<` - Less than
- `>=` - Greater than or equal
- `<=` - Less than or equal

## shouldBreak Flag

When a case matches, the `shouldBreak` flag is automatically set to `true`. This is used by SwitchStep to stop evaluating subsequent cases:

```javascript
const myCase = new Case({
  subject: () => value,
  operator: '===',
  value: 'target',
  callable: async () => ({ matched: true })
});

const result = await myCase.check();
console.log(myCase.state.get('shouldBreak')); // true if matched
```

## See Also

- [SwitchStep Class](./switch-step.md) - Uses Case for multi-way branching
- [LogicStep Class](./logic-step.md) - Parent class
- [ConditionalStep Class](./conditional-step.md) - If/else branching
- [conditional_step_comparators Enum](../enums/conditional-step-comparators.md)
- [Core Concepts - Steps](../../core-concepts/steps.md)
