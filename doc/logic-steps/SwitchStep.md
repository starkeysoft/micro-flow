# SwitchStep

**Represents a switch step that evaluates multiple cases and executes the matched one.**

## Overview

The `SwitchStep` class provides multi-way branching logic, similar to a switch statement in programming languages. It evaluates an array of cases in order and executes the first matching case, or a default case if no matches are found.

## Class Definition

```javascript
class SwitchStep extends LogicStep
```

**Extends:** [LogicStep](LogicStep.md)  
**Location:** `src/classes/switch_step.js`

## Properties

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `step_name` | `string` (static) | `logic_step_types.SWITCH` | Static identifier |
| `cases` | `Array<Case>` | `[]` | Array of Case instances to evaluate |
| `default_case` | `Case\|Step\|Workflow\|null` | `null` | Default Case/Step or Workflow if no case matches |

*Inherits all properties from [LogicStep](LogicStep.md)*

## Constructor

### `constructor(options)`

Creates a new SwitchStep instance.

**Parameters:**

- `options` (Object) *[optional]* - Configuration options
  - `name` (string) *[optional]* - The name of the switch step (default: `''`)
  - `cases` (Array<Case>) *[optional]* - The array of cases to evaluate (default: `[]`)
  - `default_case` (Case | Step | Workflow) *[optional]* - Default Case/Step or Workflow to execute if no cases match (default: `null`)

**Example:**

```javascript
import { SwitchStep, Case } from './classes';

const switchStep = new SwitchStep({
  name: 'Route by Type',
  cases: [
    new Case({
      subject: type,
      operator: '===',
      value: 'A',
      callable: async () => handleTypeA()
    }),
    new Case({
      subject: type,
      operator: '===',
      value: 'B',
      callable: async () => handleTypeB()
    })
  ],
  default_case: async () => handleDefault()
});
```

## Methods

### `getMatchedCase()`

Evaluates the cases and returns the result of the matched case or the default case.

**Returns:** `Promise<*>` - The result of the matched case or default case

**Async:** Yes

## Usage Examples

### Basic Switch

```javascript
import { SwitchStep, Case, Workflow } from './classes';

const userType = 'admin';

const switchStep = new SwitchStep({
  name: 'Route by User Type',
  cases: [
    new Case({
      subject: userType,
      operator: '===',
      value: 'admin',
      callable: async () => {
        console.log('Admin route');
        return { route: 'admin-dashboard' };
      }
    }),
    new Case({
      subject: userType,
      operator: '===',
      value: 'user',
      callable: async () => {
        console.log('User route');
        return { route: 'user-dashboard' };
      }
    }),
    new Case({
      subject: userType,
      operator: '===',
      value: 'guest',
      callable: async () => {
        console.log('Guest route');
        return { route: 'landing-page' };
      }
    })
  ],
  default_case: async () => {
    console.log('Unknown user type');
    return { route: 'error-page' };
  }
});

const result = await switchStep.execute();
```

### HTTP Status Code Handler

```javascript
import { SwitchStep, Case } from './classes';

function createStatusHandler(statusCode) {
  return new SwitchStep({
    name: 'Handle HTTP Status',
    cases: [
      new Case({
        subject: statusCode,
        operator: '===',
        value: 200,
        callable: async () => ({ status: 'success' })
      }),
      new Case({
        subject: statusCode,
        operator: '===',
        value: 404,
        callable: async () => ({ status: 'not_found', retry: false })
      }),
      new Case({
        subject: statusCode,
        operator: '===',
        value: 500,
        callable: async () => ({ status: 'server_error', retry: true })
      }),
      new Case({
        subject: statusCode,
        operator: '===',
        value: 503,
        callable: async () => ({ status: 'unavailable', retry: true })
      })
    ],
    default_case: async () => ({ status: 'unknown', code: statusCode })
  });
}

const handler = createStatusHandler(response.status);
const result = await handler.execute();
```

### Range-Based Switching

```javascript
import { SwitchStep, Case } from './classes';

const score = 85;

const gradeSwitch = new SwitchStep({
  name: 'Assign Grade',
  cases: [
    new Case({
      subject: score,
      operator: '>=',
      value: 90,
      callable: async () => ({ grade: 'A', message: 'Excellent!' })
    }),
    new Case({
      subject: score,
      operator: '>=',
      value: 80,
      callable: async () => ({ grade: 'B', message: 'Good job!' })
    }),
    new Case({
      subject: score,
      operator: '>=',
      value: 70,
      callable: async () => ({ grade: 'C', message: 'Satisfactory' })
    }),
    new Case({
      subject: score,
      operator: '>=',
      value: 60,
      callable: async () => ({ grade: 'D', message: 'Needs improvement' })
    })
  ],
  default_case: async () => ({ grade: 'F', message: 'Failed' })
});

const result = await gradeSwitch.execute();
```

### Context-Based Routing

```javascript
import { SwitchStep, Case, Workflow, Step, step_types } from './classes';

const workflow = new Workflow([
  new Step({
    name: 'Determine Action',
    type: step_types.ACTION,
    callable: async (context) => {
      context.action = context.request.action;
      return context.action;
    }
  }),
  new SwitchStep({
    name: 'Route Action',
    cases: [
      new Case({
        subject: (context) => context.action,
        operator: '===',
        value: 'create',
        callable: async (context) => await createResource(context.data)
      }),
      new Case({
        subject: (context) => context.action,
        operator: '===',
        value: 'update',
        callable: async (context) => await updateResource(context.id, context.data)
      }),
      new Case({
        subject: (context) => context.action,
        operator: '===',
        value: 'delete',
        callable: async (context) => await deleteResource(context.id)
      }),
      new Case({
        subject: (context) => context.action,
        operator: '===',
        value: 'read',
        callable: async (context) => await readResource(context.id)
      })
    ],
    default_case: async (context) => {
      throw new Error(`Unknown action: ${context.action}`);
    }
  })
]);

await workflow.execute({ request: apiRequest });
```

## Case Class

The `Case` class is used within `SwitchStep` to define individual cases:

```javascript
class Case extends LogicStep
```

### Constructor

```javascript
new Case({
  subject: value,
  operator: '===',
  value: matchValue,
  callable: async () => { /* handler */ }
})
```

### Method: `check()`

Evaluates the case condition and executes the callable if matched.

**Returns:** `Promise<*|boolean>` - Result of callable if matched, `false` otherwise

See [Case Documentation](Case.md) for more details.

## Switch vs Conditional

### Use Switch When:
- Multiple (3+) possible branches
- All branches check the same subject
- Clear categorical values
- Need a default case

### Use Conditional When:
- Two branches (if/else)
- Different subjects per branch
- Complex nested conditions
- Binary decisions

## Best Practices

1. **Order Matters**: Cases are evaluated in order; most specific first
2. **Always Include Default**: Provide a default_case for unexpected values
3. **Keep Cases Simple**: Each case should handle one specific value
4. **Avoid Side Effects**: Keep case evaluation pure
5. **Document Cases**: Comment complex case logic
6. **Consider Performance**: Switch evaluates sequentially

## Related Classes

- [Case](Case.md) - Individual switch cases
- [LogicStep](LogicStep.md) - Base logic evaluation
- [ConditionalStep](ConditionalStep.md) - Two-way branching
