# SwitchStep Class

The `SwitchStep` class provides multi-way branching based on case matching, similar to switch statements in traditional programming.

## Constructor

```javascript
new SwitchStep(options)
```

### Parameters

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `options.cases` | `Array<Case> \| Array<Step> \| Array<Workflow>` | Yes | - | Array of Cases to evaluate |
| `options.default_case` | `Case\|Step\|Workflow` | No | `null` | Fallback if no cases match |
| `options.name` | `string` | No | `'Switch Step'` | Name for the switch step |

**Note**: If you use an entity other than an instance of Case, you _must_ provide your own break mechanism. For steps, set `this.state.set('should_break')` inside the callable. For workflows, ensure one of the internal steps sets `this.state.set('should_break')`. Case instances will do this automatically if the condition is met.

### Example

```javascript
import { SwitchStep, Case, Step, StepTypes } from 'micro-flow';

const switchStep = new SwitchStep({
  name: 'Route By Status',
  cases: [
    new Case({
      subject: status,
      operator: '===',
      value: 'pending',
      callable: pendingWorkflow
    }),
    new Case({
      subject: status,
      operator: '===',
      value: 'approved',
      callable: approvedWorkflow
    }),
    new Case({
      subject: status,
      operator: '===',
      value: 'rejected',
      callable: rejectedWorkflow
    })
  ],
  default_case: defaultWorkflow
});
```

## Properties

### Static Properties

- **`step_name`**: `logic_step_types.SWITCH` - Identifier for switch steps

### State Properties

In addition to LogicStep state properties:

| Property | Type | Description |
|----------|------|-------------|
| `cases` | `Array<Case>` | Array of cases to evaluate |
| `default_case` | `Function\|Case\|Step\|Workflow\|null` | Default case if no matches |

## Methods

### `getMatchedCase()`

Evaluates cases sequentially until one matches, then executes its callable.

```javascript
async getMatchedCase(): Promise<any>
```

**Returns:**
- `Promise<any>` - Result from the matched case or default case

**Behavior:**
- Evaluates cases in order
- Stops at first match (no fall-through)
- Executes default_case if no matches
- Returns result from executed case

## Usage Examples

### Basic Switch - Status Routing

```javascript
const pendingWorkflow = new Workflow({ name: 'Handle Pending' });
pendingWorkflow.pushSteps([
  new Step({
    name: 'Queue Review',
    type: StepTypes.ACTION,
    callable: async () => queueForReview()
  })
]);

const approvedWorkflow = new Workflow({ name: 'Handle Approved' });
approvedWorkflow.pushSteps([
  new Step({
    name: 'Process Payment',
    type: StepTypes.ACTION,
    callable: async () => processPayment()
  })
]);

const rejectedWorkflow = new Workflow({ name: 'Handle Rejected' });
rejectedWorkflow.pushSteps([
  new Step({
    name: 'Send Notification',
    type: StepTypes.ACTION,
    callable: async () => sendRejectionEmail()
  })
]);

const statusSwitch = new SwitchStep({
  name: 'Route By Status',
  cases: [
    new Case({
      subject: () => order.status,
      operator: '===',
      value: 'pending',
      callable: pendingWorkflow
    }),
    new Case({
      subject: () => order.status,
      operator: '===',
      value: 'approved',
      callable: approvedWorkflow
    }),
    new Case({
      subject: () => order.status,
      operator: '===',
      value: 'rejected',
      callable: rejectedWorkflow
    })
  ]
});

await statusSwitch.execute();
```

### With Default Case

```javascript
const defaultWorkflow = new Workflow({ name: 'Handle Unknown' });
defaultWorkflow.pushSteps([
  new Step({
    name: 'Log Error',
    type: StepTypes.ACTION,
    callable: async function() {
      console.error('Unknown status:', this.workflow.status);
      return { error: 'Unknown status' };
    }
  })
]);

const switchWithDefault = new SwitchStep({
  name: 'Process Request',
  cases: [
    new Case({
      subject: () => request.type,
      operator: '===',
      value: 'GET',
      callable: getHandler
    }),
    new Case({
      subject: () => request.type,
      operator: '===',
      value: 'POST',
      callable: postHandler
    }),
    new Case({
      subject: () => request.type,
      operator: '===',
      value: 'PUT',
      callable: putHandler
    })
  ],
  default_case: defaultWorkflow
});

await switchWithDefault.execute();
```

### Numeric Range Matching

```javascript
const gradingSwitch = new SwitchStep({
  name: 'Assign Grade',
  cases: [
    new Case({
      subject: () => score,
      operator: '>=',
      value: 90,
      callable: new Step({
        name: 'A Grade',
        type: StepTypes.ACTION,
        callable: async () => ({ grade: 'A', message: 'Excellent!' })
      })
    }),
    new Case({
      subject: () => score,
      operator: '>=',
      value: 80,
      callable: new Step({
        name: 'B Grade',
        type: StepTypes.ACTION,
        callable: async () => ({ grade: 'B', message: 'Good job!' })
      })
    }),
    new Case({
      subject: () => score,
      operator: '>=',
      value: 70,
      callable: new Step({
        name: 'C Grade',
        type: StepTypes.ACTION,
        callable: async () => ({ grade: 'C', message: 'Passing' })
      })
    }),
    new Case({
      subject: () => score,
      operator: '>=',
      value: 60,
      callable: new Step({
        name: 'D Grade',
        type: StepTypes.ACTION,
        callable: async () => ({ grade: 'D', message: 'Needs improvement' })
      })
    })
  ],
  default_case: new Step({
    name: 'F Grade',
    type: StepTypes.ACTION,
    callable: async () => ({ grade: 'F', message: 'Failed' })
  })
});

await gradingSwitch.execute();
```

### User Role-Based Routing

```javascript
const adminWorkflow = new Workflow({ name: 'Admin Actions' });
adminWorkflow.pushSteps([
  new Step({
    name: 'Full Access',
    type: StepTypes.ACTION,
    callable: async () => grantFullAccess()
  })
]);

const moderatorWorkflow = new Workflow({ name: 'Moderator Actions' });
moderatorWorkflow.pushSteps([
  new Step({
    name: 'Moderate Access',
    type: StepTypes.ACTION,
    callable: async () => grantModerateAccess()
  })
]);

const userWorkflow = new Workflow({ name: 'User Actions' });
userWorkflow.pushSteps([
  new Step({
    name: 'Basic Access',
    type: StepTypes.ACTION,
    callable: async () => grantBasicAccess()
  })
]);

const roleSwitch = new SwitchStep({
  name: 'Route By Role',
  cases: [
    new Case({
      subject: () => user.role,
      operator: '===',
      value: 'admin',
      callable: adminWorkflow
    }),
    new Case({
      subject: () => user.role,
      operator: '===',
      value: 'moderator',
      callable: moderatorWorkflow
    }),
    new Case({
      subject: () => user.role,
      operator: '===',
      value: 'user',
      callable: userWorkflow
    })
  ],
  default_case: new Step({
    name: 'Deny Access',
    type: StepTypes.ACTION,
    callable: async () => ({ error: 'Invalid role' })
  })
});

await roleSwitch.execute();
```

### Type-Based Processing

```javascript
const processString = new Step({
  name: 'Process String',
  type: StepTypes.ACTION,
  callable: async (value) => value.toUpperCase()
});

const processNumber = new Step({
  name: 'Process Number',
  type: StepTypes.ACTION,
  callable: async (value) => value * 2
});

const processArray = new Step({
  name: 'Process Array',
  type: StepTypes.ACTION,
  callable: async (value) => value.map(v => v * 2)
});

const processObject = new Step({
  name: 'Process Object',
  type: StepTypes.ACTION,
  callable: async (value) => ({ ...value, processed: true })
});

const typeSwitch = new SwitchStep({
  name: 'Process By Type',
  cases: [
    new Case({
      subject: () => typeof data,
      operator: '===',
      value: 'string',
      callable: processString
    }),
    new Case({
      subject: () => typeof data,
      operator: '===',
      value: 'number',
      callable: processNumber
    }),
    new Case({
      subject: () => Array.isArray(data),
      operator: '===',
      value: true,
      callable: processArray
    }),
    new Case({
      subject: () => typeof data,
      operator: '===',
      value: 'object',
      callable: processObject
    })
  ]
});

await typeSwitch.execute();
```

### Environment-Based Configuration

```javascript
const devWorkflow = new Workflow({ name: 'Dev Config' });
devWorkflow.pushSteps([
  new Step({
    name: 'Load Dev Config',
    type: StepTypes.ACTION,
    callable: async () => ({
      apiUrl: 'http://localhost:3000',
      debug: true,
      cache: false
    })
  })
]);

const stagingWorkflow = new Workflow({ name: 'Staging Config' });
stagingWorkflow.pushSteps([
  new Step({
    name: 'Load Staging Config',
    type: StepTypes.ACTION,
    callable: async () => ({
      apiUrl: 'https://staging.example.com',
      debug: true,
      cache: true
    })
  })
]);

const prodWorkflow = new Workflow({ name: 'Prod Config' });
prodWorkflow.pushSteps([
  new Step({
    name: 'Load Prod Config',
    type: StepTypes.ACTION,
    callable: async () => ({
      apiUrl: 'https://api.example.com',
      debug: false,
      cache: true
    })
  })
]);

const envSwitch = new SwitchStep({
  name: 'Load Environment Config',
  cases: [
    new Case({
      subject: () => process.env.NODE_ENV,
      operator: '===',
      value: 'development',
      callable: devWorkflow
    }),
    new Case({
      subject: () => process.env.NODE_ENV,
      operator: '===',
      value: 'staging',
      callable: stagingWorkflow
    }),
    new Case({
      subject: () => process.env.NODE_ENV,
      operator: '===',
      value: 'production',
      callable: prodWorkflow
    })
  ],
  default_case: devWorkflow
});

const config = await envSwitch.execute();
```

### Payment Method Routing

```javascript
const creditCardWorkflow = new Workflow({ name: 'Credit Card' });
creditCardWorkflow.pushSteps([
  new Step({
    name: 'Validate Card',
    type: StepTypes.ACTION,
    callable: async (data) => validateCreditCard(data)
  }),
  new Step({
    name: 'Charge Card',
    type: StepTypes.ACTION,
    callable: async (data) => chargeCreditCard(data)
  })
]);

const paypalWorkflow = new Workflow({ name: 'PayPal' });
paypalWorkflow.pushSteps([
  new Step({
    name: 'Redirect to PayPal',
    type: StepTypes.ACTION,
    callable: async (data) => initiatePayPalPayment(data)
  })
]);

const cryptoWorkflow = new Workflow({ name: 'Cryptocurrency' });
cryptoWorkflow.pushSteps([
  new Step({
    name: 'Generate Wallet Address',
    type: StepTypes.ACTION,
    callable: async (data) => generateCryptoAddress(data)
  })
]);

const paymentSwitch = new SwitchStep({
  name: 'Process Payment',
  cases: [
    new Case({
      subject: () => payment.method,
      operator: '===',
      value: 'credit_card',
      callable: creditCardWorkflow
    }),
    new Case({
      subject: () => payment.method,
      operator: '===',
      value: 'paypal',
      callable: paypalWorkflow
    }),
    new Case({
      subject: () => payment.method,
      operator: '===',
      value: 'crypto',
      callable: cryptoWorkflow
    })
  ],
  default_case: new Step({
    name: 'Invalid Method',
    type: StepTypes.ACTION,
    callable: async () => {
      throw new Error('Invalid payment method');
    }
  })
});

await paymentSwitch.execute();
```

### File Type Processing

```javascript
const fileTypeSwitch = new SwitchStep({
  name: 'Process File',
  cases: [
    new Case({
      subject: () => file.extension,
      operator: '===',
      value: '.jpg',
      callable: imageProcessor
    }),
    new Case({
      subject: () => file.extension,
      operator: '===',
      value: '.png',
      callable: imageProcessor
    }),
    new Case({
      subject: () => file.extension,
      operator: '===',
      value: '.pdf',
      callable: pdfProcessor
    }),
    new Case({
      subject: () => file.extension,
      operator: '===',
      value: '.docx',
      callable: documentProcessor
    }),
    new Case({
      subject: () => file.extension,
      operator: '===',
      value: '.csv',
      callable: csvProcessor
    })
  ],
  default_case: new Step({
    name: 'Unsupported File',
    type: StepTypes.ACTION,
    callable: async () => {
      throw new Error('Unsupported file type');
    }
  })
});

await fileTypeSwitch.execute();
```

### Priority-Based Handling

```javascript
const criticalWorkflow = new Workflow({ name: 'Critical' });
criticalWorkflow.pushSteps([
  new Step({
    name: 'Immediate Action',
    type: StepTypes.ACTION,
    callable: async () => handleImmediately()
  }),
  new Step({
    name: 'Notify Team',
    type: StepTypes.ACTION,
    callable: async () => notifyTeam()
  })
]);

const highWorkflow = new Workflow({ name: 'High Priority' });
highWorkflow.pushSteps([
  new Step({
    name: 'Priority Queue',
    type: StepTypes.ACTION,
    callable: async () => addToPriorityQueue()
  })
]);

const normalWorkflow = new Workflow({ name: 'Normal Priority' });
normalWorkflow.pushSteps([
  new Step({
    name: 'Standard Queue',
    type: StepTypes.ACTION,
    callable: async () => addToStandardQueue()
  })
]);

const prioritySwitch = new SwitchStep({
  name: 'Route By Priority',
  cases: [
    new Case({
      subject: () => ticket.priority,
      operator: '===',
      value: 'critical',
      callable: criticalWorkflow
    }),
    new Case({
      subject: () => ticket.priority,
      operator: '===',
      value: 'high',
      callable: highWorkflow
    }),
    new Case({
      subject: () => ticket.priority,
      operator: '===',
      value: 'normal',
      callable: normalWorkflow
    })
  ],
  default_case: normalWorkflow
});

await prioritySwitch.execute();
```

### Complex Condition Matching

```javascript
const complexSwitch = new SwitchStep({
  name: 'Complex Routing',
  cases: [
    // Check if user is premium AND in specific region
    new Case({
      subject: () => user.premium && user.region === 'US',
      operator: '===',
      value: true,
      callable: premiumUSWorkflow
    }),
    // Check if cart value exceeds threshold
    new Case({
      subject: () => cart.total,
      operator: '>',
      value: 1000,
      callable: highValueWorkflow
    }),
    // Check if user has special status
    new Case({
      subject: () => user.status,
      operator: '===',
      value: 'vip',
      callable: vipWorkflow
    })
  ],
  default_case: standardWorkflow
});

await complexSwitch.execute();
```

## No Fall-Through

Unlike traditional switch statements, SwitchStep does not have fall-through behavior. Once a case matches and executes, the switch completes.

## Case Order Matters

Cases are evaluated in order. Place more specific conditions before general ones:

```javascript
// Good: Specific to general
new SwitchStep({
  cases: [
    new Case({ subject: () => value, operator: '===', value: 100, callable: exact100 }),
    new Case({ subject: () => value, operator: '>', value: 50, callable: over50 }),
    new Case({ subject: () => value, operator: '>', value: 0, callable: positive })
  ]
});

// Bad: General first will catch all
new SwitchStep({
  cases: [
    new Case({ subject: () => value, operator: '>', value: 0, callable: positive }), // Catches all positive
    new Case({ subject: () => value, operator: '>', value: 50, callable: over50 }), // Never reached
    new Case({ subject: () => value, operator: '===', value: 100, callable: exact100 }) // Never reached
  ]
});
```

## See Also

- [Case Class](./case.md) - Individual case matching
- [LogicStep Class](./logic-step.md) - Parent class
- [ConditionalStep Class](./conditional-step.md) - If/else branching
- [logic_step_types Enum](../enums/logic-step-types.md)
- [Core Concepts - Steps](../../core-concepts/steps.md)
