# LogicStep

LogicStep class for conditional logic operations. Provides the foundation for conditional branching with comparison operators.

Extends: [Step](step.md)

## Constructor

### `new LogicStep(options)`

Creates a new LogicStep instance.

**Parameters:**
- `options` (Object) - Configuration options
  - `name` (string, optional) - Name of the step
  - `callable` (Function, optional) - Function to execute (default: `async () => {}`)
  - `conditional` (Object, optional) - Conditional configuration
    - `subject` (any) - Subject to evaluate
    - `operator` (string) - Comparison operator
    - `value` (any) - Value to compare against

**Example (Node.js - Basic Logic):**
```javascript
import { LogicStep } from 'micro-flow';

const ageCheck = new LogicStep({
  name: 'check-age',
  conditional: {
    subject: 25,
    operator: '>=',
    value: 18
  },
  callable: async () => {
    return { allowed: true };
  }
});

const result = await ageCheck.execute();
console.log('Age check:', result.result);
```

**Example (Browser - Dynamic Validation):**
```javascript
import { LogicStep } from './micro-flow.js';

const passwordStrength = new LogicStep({
  name: 'validate-password',
  conditional: {
    subject: 'MyP@ssw0rd'.length,
    operator: '>=',
    value: 8
  },
  callable: async () => {
    return { valid: true, message: 'Password is strong' };
  }
});

if (passwordStrength.checkCondition()) {
  console.log('Password meets requirements');
}
```

**Example (Node.js - Environment Check):**
```javascript
import { LogicStep } from 'micro-flow';

const envCheck = new LogicStep({
  name: 'check-environment',
  conditional: {
    subject: process.env.NODE_ENV,
    operator: '===',
    value: 'production'
  },
  callable: async () => {
    console.log('Running in production mode');
  }
});
```

## Properties

- `subject` (any) - The subject value to evaluate
- `operator` (string) - The comparison operator to use
- `value` (any) - The value to compare the subject against

All properties inherited from [Step](step.md)

## Methods

### `checkCondition()`

Evaluates the conditional expression using the configured operator.

**Returns:** boolean - True if the condition is met

**Throws:** Error - If the operator is unknown

**Supported Operators:**
- `'==='`, `'strict_equals'` - Strict equality
- `'=='`, `'equals'` - Loose equality
- `'!='`, `'not_equals'` - Loose inequality
- `'!=='`, `'strict_not_equals'` - Strict inequality
- `'>'`, `'greater_than'` - Greater than
- `'<'`, `'less_than'` - Less than
- `'>='`, `'greater_than_or_equal'` - Greater than or equal
- `'<='`, `'less_than_or_equal'` - Less than or equal
- `'string_contains'`, `'string_includes'` - String contains value
- `'array_contains'`, `'array_includes'` - Array contains value
- `'empty'` - Subject is empty (`''`, `null`, `undefined`, or length `0`)
- `'not_empty'` - Subject is not empty
- `'regex_match'` - Subject matches regex pattern string in `value`
- `'regex_not_match'` - Subject does not match regex pattern string in `value`
- `'starts_with'` - Subject starts with string `value`
- `'ends_with'` - Subject ends with string `value`
- `'in'` - Subject is included in array `value`
- `'not_in'` - Subject is not included in array `value`
- `'nullish'` - Subject is `null` or `undefined`
- `'not_nullish'` - Subject is not `null` or `undefined`
- `'custom_function'` - `value` is a function invoked as `value(subject)`

**Example (Node.js - Custom Validation):**
```javascript
import { LogicStep } from 'micro-flow';

const priceCheck = new LogicStep({
  name: 'validate-price',
  conditional: {
    subject: 99.99,
    operator: '<=',
    value: 100
  }
});

if (priceCheck.checkCondition()) {
  console.log('Price is within budget');
} else {
  console.log('Price exceeds budget');
}
```

**Example (Browser - Form Validation):**
```javascript
import { LogicStep } from './micro-flow.js';

function validateForm(formData) {
  const emailCheck = new LogicStep({
    name: 'validate-email',
    conditional: {
      subject: formData.email.includes('@'),
      operator: '===',
      value: true
    }
  });
  
  const ageCheck = new LogicStep({
    name: 'validate-age',
    conditional: {
      subject: parseInt(formData.age),
      operator: '>=',
      value: 13
    }
  });
  
  return emailCheck.checkCondition() && ageCheck.checkCondition();
}

const isValid = validateForm({ email: 'user@example.com', age: '25' });
console.log('Form is valid:', isValid);
```

**Example (Node.js - Custom Function Comparator):**
```javascript
import { LogicStep } from 'micro-flow';

const customCheck = new LogicStep({
  name: 'custom-check',
  conditional: {
    subject: { score: 42 },
    operator: 'custom_function',
    value: (subject) => subject.score >= 40
  }
});

if (customCheck.checkCondition()) {
  console.log('Custom check passed');
}
```

### `conditionalIsValid()`

Checks if the conditional configuration is valid (all required properties are set).

**Returns:** boolean - True if conditional is valid

**Example (Node.js - Validation):**
```javascript
import { LogicStep } from 'micro-flow';

const incompleteLogic = new LogicStep({
  name: 'incomplete',
  conditional: {
    subject: null,
    operator: '===',
    value: null
  }
});

if (!incompleteLogic.conditionalIsValid()) {
  console.log('Conditional configuration is incomplete');
}

const completeLogic = new LogicStep({
  name: 'complete',
  conditional: {
    subject: 10,
    operator: '>',
    value: 5
  }
});

if (completeLogic.conditionalIsValid()) {
  console.log('Conditional configuration is valid');
}
```

### `setConditional(conditional)`

Sets the conditional properties (subject, operator, value).

**Parameters:**
- `conditional` (Object) - Conditional configuration object
  - `subject` (any) - Subject to evaluate
  - `operator` (string) - Comparison operator
  - `value` (any) - Value to compare against

**Example (Node.js - Dynamic Conditions):**
```javascript
import { LogicStep } from 'micro-flow';

const dynamicLogic = new LogicStep({
  name: 'dynamic-check',
  conditional: {
    subject: 0,
    operator: '===',
    value: 0
  }
});

// Update condition dynamically
dynamicLogic.setConditional({
  subject: userScore,
  operator: '>=',
  value: passingScore
});

if (dynamicLogic.checkCondition()) {
  console.log('User passed!');
}
```

## Common Patterns

### Data Validation Pipeline (Node.js)

```javascript
import { LogicStep, Workflow, Step } from 'micro-flow';

async function validateUserData(userData) {
  const validations = [
    new LogicStep({
      name: 'validate-username',
      conditional: {
        subject: userData.username.length,
        operator: '>=',
        value: 3
      }
    }),
    new LogicStep({
      name: 'validate-email',
      conditional: {
        subject: /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(userData.email),
        operator: '===',
        value: true
      }
    }),
    new LogicStep({
      name: 'validate-age',
      conditional: {
        subject: userData.age,
        operator: '>=',
        value: 18
      }
    })
  ];
  
  const results = validations.map(step => ({
    name: step.name,
    valid: step.checkCondition()
  }));
  
  const allValid = results.every(r => r.valid);
  return { valid: allValid, validations: results };
}

const validation = await validateUserData({
  username: 'john_doe',
  email: 'john@example.com',
  age: 25
});

console.log('Validation results:', validation);
```

### Access Control (Node.js)

```javascript
import { LogicStep } from 'micro-flow';

class AccessControl {
  constructor(userRole) {
    this.userRole = userRole;
  }
  
  canAccess(requiredRole) {
    const roleHierarchy = {
      admin: 3,
      moderator: 2,
      user: 1,
      guest: 0
    };
    
    const accessCheck = new LogicStep({
      name: 'check-access',
      conditional: {
        subject: roleHierarchy[this.userRole] || 0,
        operator: '>=',
        value: roleHierarchy[requiredRole] || 0
      }
    });
    
    return accessCheck.checkCondition();
  }
}

const ac = new AccessControl('moderator');
console.log('Can access admin panel:', ac.canAccess('admin')); // false
console.log('Can access user panel:', ac.canAccess('user')); // true
```

### Threshold Monitoring (Node.js)

```javascript
import { LogicStep, Step, Workflow } from 'micro-flow';

class ThresholdMonitor {
  constructor(threshold, metricGetter) {
    this.threshold = threshold;
    this.metricGetter = metricGetter;
  }
  
  async check() {
    const currentValue = await this.metricGetter();
    
    const thresholdCheck = new LogicStep({
      name: 'check-threshold',
      conditional: {
        subject: currentValue,
        operator: '>',
        value: this.threshold
      }
    });
    
    if (thresholdCheck.checkCondition()) {
      console.warn(`Threshold exceeded: ${currentValue} > ${this.threshold}`);
      await this.triggerAlert(currentValue);
    }
    
    return {
      exceeded: thresholdCheck.checkCondition(),
      value: currentValue,
      threshold: this.threshold
    };
  }
  
  async triggerAlert(value) {
    console.log(`ALERT: Value ${value} exceeded threshold ${this.threshold}`);
  }
}

const cpuMonitor = new ThresholdMonitor(80, async () => {
  // Get CPU usage (mock)
  return Math.random() * 100;
});

const result = await cpuMonitor.check();
console.log('Monitor result:', result);
```

### Feature Flags (Browser)

```javascript
import { LogicStep } from './micro-flow.js';

class FeatureFlags {
  constructor(flags) {
    this.flags = flags;
  }
  
  isEnabled(featureName) {
    const featureCheck = new LogicStep({
      name: `check-${featureName}`,
      conditional: {
        subject: this.flags[featureName],
        operator: '===',
        value: true
      }
    });
    
    return featureCheck.checkCondition();
  }
}

const flags = new FeatureFlags({
  newUI: true,
  darkMode: false,
  betaFeatures: true
});

if (flags.isEnabled('newUI')) {
  console.log('Showing new UI');
}

if (!flags.isEnabled('darkMode')) {
  console.log('Using light mode');
}
```

### Range Validation (Node.js)

```javascript
import { LogicStep } from 'micro-flow';

function isInRange(value, min, max) {
  const minCheck = new LogicStep({
    name: 'check-minimum',
    conditional: {
      subject: value,
      operator: '>=',
      value: min
    }
  });
  
  const maxCheck = new LogicStep({
    name: 'check-maximum',
    conditional: {
      subject: value,
      operator: '<=',
      value: max
    }
  });
  
  return minCheck.checkCondition() && maxCheck.checkCondition();
}

console.log('Score in range:', isInRange(75, 0, 100)); // true
console.log('Temperature in range:', isInRange(-5, 0, 100)); // false
```

### Type Checking (Browser)

```javascript
import { LogicStep } from './micro-flow.js';

function validateInput(input, expectedType) {
  const typeCheck = new LogicStep({
    name: 'validate-type',
    conditional: {
      subject: typeof input,
      operator: '===',
      value: expectedType
    }
  });
  
  if (!typeCheck.checkCondition()) {
    throw new TypeError(
      `Expected ${expectedType}, got ${typeof input}`
    );
  }
  
  return true;
}

validateInput('hello', 'string'); // OK
validateInput(42, 'number'); // OK
// validateInput('hello', 'number'); // Throws TypeError
```

## Notes

- LogicStep is the base class for [ConditionalStep](conditional_step.md) and [LoopStep](loop_step.md)
- The `checkCondition()` method is used internally by child classes for decision making
- Supports both symbol operators (`===`, `>=`) and word operators (`strict_equals`, `greater_than_or_equal`)
- All comparisons follow JavaScript's standard comparison rules
- The `conditionalIsValid()` method checks for null and undefined values, not type validity

## Related

- [ConditionalStep](conditional_step.md) - Extends LogicStep for branching logic
- [LoopStep](loop_step.md) - Extends LogicStep for iterative execution
- [Step](step.md) - Base step class
- [conditional_step_comparators enum](../../enums/conditional_step_comparators.md) - Available comparison operators
