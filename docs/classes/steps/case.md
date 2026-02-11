# Case

Case class representing a single case in a switch statement. Used in conjunction with SwitchStep to create switch/case logic.

**Note:** Plain [LogicStep](logic_step.md) instances can be used in place of Case, but they **MUST** have a complete, valid `conditional` object set. `conditional.subject` can be set on the SwitchStep instance, if it is common across all of the cases.

Extends: [LogicStep](logic_step.md)

## Constructor

### `new Case(options)`

Creates a new Case instance.

**Parameters:**
- `options` (Object) - Configuration options
  - `name` (string, optional) - Name of the case
  - `conditional` (Object, optional) - Conditional configuration
    - `subject` (any, optional) - Subject to evaluate (typically set by SwitchStep) (default: `null`)
    - `operator` (conditional_step_comparators|string, optional) - Comparison operator (default: `null`)
    - `value` (any, optional) - Value to compare against (default: `null`)
  - `callable` (Function|Step|Workflow, optional) - Function, Step, or Workflow to execute when case matches (default: `async () => {}`)
  - `force_subject_override` (boolean, optional) - Force override of subject even if already set (default: `false`)

**Example (Node.js - Basic Case):**
```javascript
import { Case } from 'micro-flow';

const successCase = new Case({
  name: 'success-case',
  conditional: {
    operator: '===',
    value: 200
  },
  callable: async () => {
    console.log('Success!');
    return { status: 'ok' };
  }
});

// Subject is typically set by SwitchStep
successCase.switch_subject = 200;

if (successCase.checkCondition()) {
  await successCase.execute();
}
```

**Example (Browser - String Matching):**
```javascript
import { Case } from './micro-flow.js';

const adminCase = new Case({
  name: 'admin-role',
  conditional: {
    operator: '===',
    value: 'admin'
  },
  callable: async () => {
    console.log('Admin permissions granted');
    return { permissions: ['read', 'write', 'delete'] };
  }
});
```

**Example (Node.js - With Custom Subject):**
```javascript
import { Case } from 'micro-flow';

// Case with pre-set subject (useful for standalone usage)
const priceCheck = new Case({
  name: 'price-under-100',
  conditional: {
    subject: 75.99,
    operator: '<',
    value: 100
  },
  callable: async () => {
    return { affordable: true };
  }
});

if (priceCheck.checkCondition()) {
  console.log('Price is affordable');
}
```

## Properties

- `conditional` (Object) - The conditional configuration
  - `subject` (any) - The subject value to evaluate
  - `operator` (string) - The comparison operator
  - `value` (any) - The value to compare against
- `force_subject_override` (boolean) - Whether to force override of subject
- `is_matched` (boolean) - Internal flag indicating if case has been matched

All properties inherited from [LogicStep](logic_step.md)

## Setters

### `set switch_subject(subject)`

Sets the switch subject from the parent SwitchStep. Automatically sets the conditional subject if not already set or if `force_subject_override` is true.

**Parameters:**
- `subject` (any) - The subject value from the SwitchStep

**Throws:** Error - If no subject is provided and conditional.subject is not set

**Example (Node.js - Subject Override):**
```javascript
import { Case } from 'micro-flow';

const statusCase = new Case({
  name: 'not-found',
  conditional: {
    operator: '===',
    value: 404
  },
  callable: async () => {
    return { error: 'Not found' };
  }
});

// Set subject from switch
statusCase.switch_subject = 404;

console.log('Subject set:', statusCase.conditional.subject); // 404
```

**Example (Node.js - Force Override):**
```javascript
import { Case } from 'micro-flow';

const overrideCase = new Case({
  name: 'override-example',
  conditional: {
    subject: 'initial',
    operator: '===',
    value: 'test'
  },
  force_subject_override: true,
  callable: async () => {
    return { matched: true };
  }
});

// Will override the initial subject
overrideCase.switch_subject = 'test';

console.log('Subject overridden:', overrideCase.conditional.subject); // 'test'
```

## Common Patterns

### Range-Based Cases (Node.js)

```javascript
import { SwitchStep, Case } from 'micro-flow';

const score = 85;

// Using multiple cases for ranges
const gradeSwitch = new SwitchStep({
  name: 'calculate-grade',
  subject: score,
  cases: [
    new Case({
      name: 'grade-a',
      conditional: { operator: '>=', value: 90 },
      callable: async () => ({ grade: 'A', message: 'Excellent!' })
    }),
    new Case({
      name: 'grade-b',
      conditional: { operator: '>=', value: 80 },
      callable: async () => ({ grade: 'B', message: 'Good job!' })
    }),
    new Case({
      name: 'grade-c',
      conditional: { operator: '>=', value: 70 },
      callable: async () => ({ grade: 'C', message: 'Fair' })
    }),
    new Case({
      name: 'grade-d',
      conditional: { operator: '>=', value: 60 },
      callable: async () => ({ grade: 'D', message: 'Needs improvement' })
    })
  ],
  default_callable: async () => ({ grade: 'F', message: 'Failed' })
});

const result = await gradeSwitch.execute();
console.log('Grade:', result.result);
```

### Type-Based Cases (Browser)

```javascript
import { SwitchStep, Case } from './micro-flow.js';

function handleInput(value) {
  const valueType = typeof value;
  
  const typeHandler = new SwitchStep({
    name: 'handle-type',
    subject: valueType,
    cases: [
      new Case({
        name: 'string',
        conditional: { operator: '===', value: 'string' },
        callable: async () => {
          return { type: 'string', length: value.length, value };
        }
      }),
      new Case({
        name: 'number',
        conditional: { operator: '===', value: 'number' },
        callable: async () => {
          return { type: 'number', isInteger: Number.isInteger(value), value };
        }
      }),
      new Case({
        name: 'boolean',
        conditional: { operator: '===', value: 'boolean' },
        callable: async () => {
          return { type: 'boolean', value };
        }
      }),
      new Case({
        name: 'object',
        conditional: { operator: '===', value: 'object' },
        callable: async () => {
          return { 
            type: 'object', 
            isArray: Array.isArray(value),
            isNull: value === null,
            value 
          };
        }
      })
    ],
    default_callable: async () => {
      return { type: 'unknown', value };
    }
  });
  
  return typeHandler.execute();
}

await handleInput('hello');
await handleInput(42);
await handleInput([1, 2, 3]);
```

### Command Pattern (Node.js)

```javascript
import { SwitchStep, Case } from 'micro-flow';

class CommandProcessor {
  async processCommand(command, args) {
    const commandSwitch = new SwitchStep({
      name: 'process-command',
      subject: command,
      cases: [
        new Case({
          name: 'create',
          conditional: { operator: '===', value: 'create' },
          callable: async () => {
            return await this.createResource(args);
          }
        }),
        new Case({
          name: 'read',
          conditional: { operator: '===', value: 'read' },
          callable: async () => {
            return await this.readResource(args);
          }
        }),
        new Case({
          name: 'update',
          conditional: { operator: '===', value: 'update' },
          callable: async () => {
            return await this.updateResource(args);
          }
        }),
        new Case({
          name: 'delete',
          conditional: { operator: '===', value: 'delete' },
          callable: async () => {
            return await this.deleteResource(args);
          }
        }),
        new Case({
          name: 'list',
          conditional: { operator: '===', value: 'list' },
          callable: async () => {
            return await this.listResources(args);
          }
        })
      ],
      default_callable: async () => {
        throw new Error(`Unknown command: ${command}`);
      }
    });
    
    return await commandSwitch.execute();
  }
  
  async createResource(args) {
    console.log('Creating resource:', args);
    return { action: 'created', ...args };
  }
  
  async readResource(args) {
    console.log('Reading resource:', args.id);
    return { action: 'read', id: args.id };
  }
  
  async updateResource(args) {
    console.log('Updating resource:', args.id);
    return { action: 'updated', ...args };
  }
  
  async deleteResource(args) {
    console.log('Deleting resource:', args.id);
    return { action: 'deleted', id: args.id };
  }
  
  async listResources(args) {
    console.log('Listing resources');
    return { action: 'listed', count: 0 };
  }
}

const processor = new CommandProcessor();
await processor.processCommand('create', { name: 'New Resource' });
```

### State Machine (Browser)

```javascript
import { SwitchStep, Case, State } from './micro-flow.js';

class FormStateMachine {
  constructor() {
    State.set('formState', 'idle');
  }
  
  async transition(event) {
    const currentState = State.get('formState');
    
    const stateTransition = new SwitchStep({
      name: 'form-state-transition',
      subject: currentState,
      cases: [
        new Case({
          name: 'idle-state',
          conditional: { operator: '===', value: 'idle' },
          callable: async () => {
            if (event === 'submit') {
              State.set('formState', 'validating');
              return { from: 'idle', to: 'validating' };
            }
            return { from: 'idle', to: 'idle' };
          }
        }),
        new Case({
          name: 'validating-state',
          conditional: { operator: '===', value: 'validating' },
          callable: async () => {
            const isValid = await this.validateForm();
            if (isValid && event === 'validated') {
              State.set('formState', 'submitting');
              return { from: 'validating', to: 'submitting' };
            }
            State.set('formState', 'error');
            return { from: 'validating', to: 'error' };
          }
        }),
        new Case({
          name: 'submitting-state',
          conditional: { operator: '===', value: 'submitting' },
          callable: async () => {
            const success = await this.submitForm();
            if (success) {
              State.set('formState', 'success');
              return { from: 'submitting', to: 'success' };
            }
            State.set('formState', 'error');
            return { from: 'submitting', to: 'error' };
          }
        }),
        new Case({
          name: 'error-state',
          conditional: { operator: '===', value: 'error' },
          callable: async () => {
            if (event === 'retry') {
              State.set('formState', 'idle');
              return { from: 'error', to: 'idle' };
            }
            return { from: 'error', to: 'error' };
          }
        }),
        new Case({
          name: 'success-state',
          conditional: { operator: '===', value: 'success' },
          callable: async () => {
            if (event === 'reset') {
              State.set('formState', 'idle');
              return { from: 'success', to: 'idle' };
            }
            return { from: 'success', to: 'success' };
          }
        })
      ],
      default_callable: async () => {
        return { from: currentState, to: currentState };
      }
    });
    
    return await stateTransition.execute();
  }
  
  async validateForm() {
    // Validation logic
    return true;
  }
  
  async submitForm() {
    // Submission logic
    return true;
  }
}

const fsm = new FormStateMachine();
await fsm.transition('submit');
```

### Multi-Language Response (Node.js)

```javascript
import { SwitchStep, Case } from 'micro-flow';

function getGreeting(language) {
  const greetingSwitch = new SwitchStep({
    name: 'get-greeting',
    subject: language,
    cases: [
      new Case({
        name: 'english',
        conditional: { operator: '===', value: 'en' },
        callable: async () => ({ greeting: 'Hello', farewell: 'Goodbye' })
      }),
      new Case({
        name: 'spanish',
        conditional: { operator: '===', value: 'es' },
        callable: async () => ({ greeting: 'Hola', farewell: 'Adiós' })
      }),
      new Case({
        name: 'french',
        conditional: { operator: '===', value: 'fr' },
        callable: async () => ({ greeting: 'Bonjour', farewell: 'Au revoir' })
      }),
      new Case({
        name: 'german',
        conditional: { operator: '===', value: 'de' },
        callable: async () => ({ greeting: 'Hallo', farewell: 'Auf Wiedersehen' })
      }),
      new Case({
        name: 'japanese',
        conditional: { operator: '===', value: 'ja' },
        callable: async () => ({ greeting: 'こんにちは', farewell: 'さようなら' })
      }),
      new Case({
        name: 'chinese',
        conditional: { operator: '===', value: 'zh' },
        callable: async () => ({ greeting: '你好', farewell: '再见' })
      })
    ],
    default_callable: async () => ({ greeting: 'Hello', farewell: 'Goodbye' })
  });
  
  return greetingSwitch.execute();
}

const greeting = await getGreeting('es');
console.log(greeting.result); // { greeting: 'Hola', farewell: 'Adiós' }
```

### Custom Comparison Cases (Node.js)

```javascript
import { SwitchStep, Case } from 'micro-flow';

const userAge = 25;

const ageBasedAccess = new SwitchStep({
  name: 'age-based-access',
  subject: userAge,
  cases: [
    new Case({
      name: 'child',
      conditional: { operator: '<', value: 13 },
      callable: async () => ({
        category: 'child',
        restrictions: ['no-purchases', 'parental-control'],
        content: 'kids'
      })
    }),
    new Case({
      name: 'teen',
      conditional: { operator: '<', value: 18 },
      callable: async () => ({
        category: 'teen',
        restrictions: ['age-appropriate-content'],
        content: 'teen'
      })
    }),
    new Case({
      name: 'adult',
      conditional: { operator: '>=', value: 18 },
      callable: async () => ({
        category: 'adult',
        restrictions: [],
        content: 'all'
      })
    })
  ],
  default_callable: async () => ({
    category: 'unknown',
    restrictions: ['all'],
    content: 'none'
  })
});

const access = await ageBasedAccess.execute();
console.log('Access level:', access.result);
```

## Notes

- Case instances are typically used within a SwitchStep
- The `switch_subject` setter is automatically called by SwitchStep for each case
- If `force_subject_override` is false (default), the subject is only set if `conditional.subject` is not already defined
- Cases inherit all methods from LogicStep, including `checkCondition()` for evaluating the match
- The `is_matched` property is for internal tracking and is not typically used by external code
- You can use any comparison operator supported by LogicStep (see conditional_step_comparators enum)

## Related

- [SwitchStep](switch_step.md) - Container for Cases that implements switch logic
- [LogicStep](logic_step.md) - Parent class providing conditional logic
- [ConditionalStep](conditional_step.md) - For simple if/else branching
- [Step](step.md) - Base step class
- [conditional_step_comparators enum](../../enums/conditional_step_comparators.md) - Available comparison operators
