````markdown
# Custom Validation Logic Step (Backend)

This example demonstrates how to extend the `LogicStep` class to create a custom validation step with enhanced functionality for backend data validation workflows.

## Use Case

Building a custom validation step that:
1. Extends `LogicStep` with schema validation
2. Supports multiple validation rules
3. Provides detailed error messages
4. Integrates with database queries
5. Caches validation results

## Custom LogicStep Implementation

```javascript
import { LogicStep, Workflow, Step, StepTypes } from 'micro-flow';

/**
 * Extended LogicStep that provides comprehensive validation capabilities
 * for backend data processing workflows.
 */
class ValidationLogicStep extends LogicStep {
  constructor({
    name,
    type,
    callable = async () => {},
    validationRules = [],
    cacheResults = false,
    customErrorMessages = {}
  }) {
    super({ name, type, callable });
    
    // Add custom properties to state
    this.state.set('validationRules', validationRules);
    this.state.set('cacheResults', cacheResults);
    this.state.set('customErrorMessages', customErrorMessages);
    this.state.set('validationCache', new Map());
    this.state.set('validationErrors', []);
  }
  
  /**
   * Extended execute method that performs validation before running the callable
   */
  async execute() {
    this.markAsRunning();
    
    try {
      // Run all validation rules
      const isValid = await this.runValidations();
      
      if (!isValid) {
        const errors = this.state.get('validationErrors');
        throw new Error(`Validation failed: ${errors.join(', ')}`);
      }
      
      // If validation passes, execute the original callable
      const result = await super.execute();
      return result;
      
    } catch (error) {
      this.state.set('execution_time_ms', Date.now() - this.state.get('start_time'));
      this.markAsFailed(error);
      throw error;
    }
  }
  
  /**
   * Run all validation rules and collect errors
   */
  async runValidations() {
    const rules = this.state.get('validationRules');
    const errors = [];
    const cache = this.state.get('validationCache');
    const cacheEnabled = this.state.get('cacheResults');
    
    for (const rule of rules) {
      const cacheKey = JSON.stringify(rule);
      
      // Check cache if enabled
      if (cacheEnabled && cache.has(cacheKey)) {
        const cachedResult = cache.get(cacheKey);
        if (!cachedResult.isValid) {
          errors.push(cachedResult.error);
        }
        continue;
      }
      
      // Run validation
      try {
        const isValid = await this.validateRule(rule);
        
        if (!isValid) {
          const errorMsg = this.getErrorMessage(rule);
          errors.push(errorMsg);
          
          if (cacheEnabled) {
            cache.set(cacheKey, { isValid: false, error: errorMsg });
          }
        } else if (cacheEnabled) {
          cache.set(cacheKey, { isValid: true });
        }
        
      } catch (error) {
        errors.push(`Validation error for ${rule.field}: ${error.message}`);
      }
    }
    
    this.state.set('validationErrors', errors);
    return errors.length === 0;
  }
  
  /**
   * Validate a single rule
   */
  async validateRule(rule) {
    const { field, type, operator, value, customValidator } = rule;
    const fieldValue = this.state.get(field);
    
    // Use custom validator if provided
    if (customValidator) {
      return await customValidator(fieldValue, this.workflow);
    }
    
    // Built-in validation types
    switch (type) {
      case 'required':
        return fieldValue !== null && fieldValue !== undefined && fieldValue !== '';
        
      case 'type':
        return typeof fieldValue === value;
        
      case 'range':
        return fieldValue >= value.min && fieldValue <= value.max;
        
      case 'length':
        return fieldValue && fieldValue.length >= value.min && fieldValue.length <= value.max;
        
      case 'pattern':
        return new RegExp(value).test(fieldValue);
        
      case 'unique':
        // Check database for uniqueness
        return await this.checkUniqueness(field, fieldValue);
        
      case 'exists':
        // Check if referenced entity exists
        return await this.checkExists(field, fieldValue);
        
      case 'conditional':
        // Use LogicStep's built-in comparison
        this.setConditional({ subject: fieldValue, operator, value });
        return this.checkCondition();
        
      default:
        throw new Error(`Unknown validation type: ${type}`);
    }
  }
  
  /**
   * Check database for unique constraint
   */
  async checkUniqueness(field, value) {
    const db = this.state.get('database');
    if (!db) return true;
    
    const result = await db.query(
      `SELECT COUNT(*) as count FROM ${this.state.get('tableName')} WHERE ${field} = ?`,
      [value]
    );
    
    return result[0].count === 0;
  }
  
  /**
   * Check if referenced entity exists
   */
  async checkExists(field, value) {
    const db = this.state.get('database');
    if (!db) return true;
    
    const referenceTable = this.state.get(`${field}_reference_table`);
    const result = await db.query(
      `SELECT COUNT(*) as count FROM ${referenceTable} WHERE id = ?`,
      [value]
    );
    
    return result[0].count > 0;
  }
  
  /**
   * Get error message for a validation rule
   */
  getErrorMessage(rule) {
    const customMessages = this.state.get('customErrorMessages');
    
    if (customMessages[rule.field]) {
      return customMessages[rule.field];
    }
    
    const { field, type, value } = rule;
    
    switch (type) {
      case 'required':
        return `${field} is required`;
      case 'type':
        return `${field} must be of type ${value}`;
      case 'range':
        return `${field} must be between ${value.min} and ${value.max}`;
      case 'length':
        return `${field} length must be between ${value.min} and ${value.max}`;
      case 'pattern':
        return `${field} has invalid format`;
      case 'unique':
        return `${field} must be unique`;
      case 'exists':
        return `Referenced ${field} does not exist`;
      default:
        return `Validation failed for ${field}`;
    }
  }
  
  /**
   * Add a validation rule dynamically
   */
  addValidationRule(rule) {
    const rules = this.state.get('validationRules');
    rules.push(rule);
    this.state.set('validationRules', rules);
  }
  
  /**
   * Clear validation cache
   */
  clearCache() {
    this.state.set('validationCache', new Map());
  }
}

// Database mock for demonstration
class DatabaseMock {
  constructor() {
    this.users = [
      { id: 1, email: 'existing@example.com', username: 'existing_user' }
    ];
  }
  
  async query(sql, params) {
    // Simulate database query
    await new Promise(resolve => setTimeout(resolve, 50));
    
    if (sql.includes('COUNT')) {
      if (sql.includes('users') && sql.includes('email')) {
        const count = this.users.filter(u => u.email === params[0]).length;
        return [{ count }];
      }
      if (sql.includes('users') && sql.includes('username')) {
        const count = this.users.filter(u => u.username === params[0]).length;
        return [{ count }];
      }
    }
    
    return [{ count: 0 }];
  }
}

// Example usage in a user registration workflow
async function createUserRegistrationWorkflow(userData) {
  const workflow = new Workflow({
    name: 'User Registration',
    exit_on_failure: false
  });
  
  // Set up database connection
  const db = new DatabaseMock();
  workflow.state.set('database', db);
  workflow.state.set('tableName', 'users');
  
  // Set user data in workflow state
  workflow.state.merge(userData);
  
  // Step 1: Validate email with custom rules
  const validateEmail = new ValidationLogicStep({
    name: 'Validate Email',
    type: StepTypes.ACTION,
    validationRules: [
      {
        field: 'email',
        type: 'required'
      },
      {
        field: 'email',
        type: 'pattern',
        value: '^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$'
      },
      {
        field: 'email',
        type: 'unique'
      }
    ],
    customErrorMessages: {
      email: 'Please provide a valid, unique email address'
    },
    cacheResults: true,
    callable: async function() {
      console.log('✓ Email validation passed');
      return { emailValid: true };
    }
  });
  
  // Step 2: Validate username
  const validateUsername = new ValidationLogicStep({
    name: 'Validate Username',
    type: StepTypes.ACTION,
    validationRules: [
      {
        field: 'username',
        type: 'required'
      },
      {
        field: 'username',
        type: 'length',
        value: { min: 3, max: 20 }
      },
      {
        field: 'username',
        type: 'pattern',
        value: '^[a-zA-Z0-9_]+$'
      },
      {
        field: 'username',
        type: 'unique'
      }
    ],
    customErrorMessages: {
      username: 'Username must be 3-20 characters, alphanumeric with underscores only, and unique'
    },
    callable: async function() {
      console.log('✓ Username validation passed');
      return { usernameValid: true };
    }
  });
  
  // Step 3: Validate password strength
  const validatePassword = new ValidationLogicStep({
    name: 'Validate Password',
    type: StepTypes.ACTION,
    validationRules: [
      {
        field: 'password',
        type: 'required'
      },
      {
        field: 'password',
        type: 'length',
        value: { min: 8, max: 100 }
      },
      {
        field: 'password',
        type: 'conditional',
        operator: '!==',
        value: function() {
          // Password shouldn't match username
          return this.state.get('username');
        },
        customValidator: async (password, workflowState) => {
          // Custom strength validation
          const hasUpperCase = /[A-Z]/.test(password);
          const hasLowerCase = /[a-z]/.test(password);
          const hasNumbers = /\d/.test(password);
          const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);
          
          return hasUpperCase && hasLowerCase && hasNumbers && hasSpecialChar;
        }
      }
    ],
    customErrorMessages: {
      password: 'Password must be 8-100 characters with uppercase, lowercase, numbers, and special characters'
    },
    callable: async function() {
      console.log('✓ Password validation passed');
      return { passwordValid: true };
    }
  });
  
  // Step 4: Validate age
  const validateAge = new ValidationLogicStep({
    name: 'Validate Age',
    type: StepTypes.ACTION,
    validationRules: [
      {
        field: 'age',
        type: 'required'
      },
      {
        field: 'age',
        type: 'type',
        value: 'number'
      },
      {
        field: 'age',
        type: 'range',
        value: { min: 18, max: 120 }
      }
    ],
    callable: async function() {
      console.log('✓ Age validation passed');
      return { ageValid: true };
    }
  });
  
  // Step 5: Create user account
  const createAccount = new Step({
    name: 'Create Account',
    type: StepTypes.ACTION,
    callable: async function() {
      const db = this.state.get('database');
      const userData = {
        email: this.state.get('email'),
        username: this.state.get('username'),
        age: this.state.get('age')
      };
      
      console.log('Creating user account:', userData);
      
      // Simulate account creation
      await new Promise(resolve => setTimeout(resolve, 200));
      
      const userId = Math.floor(Math.random() * 10000);
      this.state.set('userId', userId);
      
      console.log('✓ Account created with ID:', userId);
      
      return { userId, created: true };
    }
  });
  
  // Add event listeners
  workflow.events.on('STEP_FAILED', (data) => {
    console.error(`✗ ${data.step.state.get('name')} failed:`, data.error.message);
  });
  
  workflow.events.on('WORKFLOW_COMPLETED', () => {
    console.log('\n=== Registration Completed Successfully ===');
  });
  
  // Build workflow
  workflow.pushSteps([
    validateEmail,
    validateUsername,
    validatePassword,
    validateAge,
    createAccount
  ]);
  
  return workflow;
}

// Example 1: Successful registration
async function example1() {
  console.log('=== Example 1: Valid User Registration ===\n');
  
  const validUserData = {
    email: 'newuser@example.com',
    username: 'new_user_123',
    password: 'SecurePass123!',
    age: 25
  };
  
  const workflow = await createUserRegistrationWorkflow(validUserData);
  
  try {
    const result = await workflow.execute();
    console.log('\nResult:', {
      userId: result.state.get('userId'),
      executionTime: result.state.get('execution_time_ms') + 'ms'
    });
  } catch (error) {
    console.error('Registration failed:', error.message);
  }
}

// Example 2: Failed validation - duplicate email
async function example2() {
  console.log('\n\n=== Example 2: Duplicate Email ===\n');
  
  const duplicateEmailData = {
    email: 'existing@example.com', // Already exists in database
    username: 'another_user',
    password: 'SecurePass123!',
    age: 30
  };
  
  const workflow = await createUserRegistrationWorkflow(duplicateEmailData);
  
  try {
    await workflow.execute();
  } catch (error) {
    console.error('Expected failure:', error.message);
  }
}

// Example 3: Failed validation - weak password
async function example3() {
  console.log('\n\n=== Example 3: Weak Password ===\n');
  
  const weakPasswordData = {
    email: 'user3@example.com',
    username: 'user_three',
    password: 'weak', // Too short, no complexity
    age: 28
  };
  
  const workflow = await createUserRegistrationWorkflow(weakPasswordData);
  
  try {
    await workflow.execute();
  } catch (error) {
    console.error('Expected failure:', error.message);
  }
}

// Example 4: Dynamic rule addition
async function example4() {
  console.log('\n\n=== Example 4: Dynamic Validation Rules ===\n');
  
  const workflow = new Workflow({ name: 'Dynamic Validation' });
  
  const dynamicStep = new ValidationLogicStep({
    name: 'Dynamic Validation',
    type: StepTypes.ACTION,
    validationRules: [],
    callable: async function() {
      console.log('All dynamic validations passed!');
      return { success: true };
    }
  });
  
  // Set up workflow state
  workflow.state.set('productName', 'Test Product');
  workflow.state.set('price', 19.99);
  workflow.state.set('stock', 100);
  
  // Add rules dynamically
  dynamicStep.addValidationRule({
    field: 'productName',
    type: 'required'
  });
  
  dynamicStep.addValidationRule({
    field: 'price',
    type: 'range',
    value: { min: 0, max: 1000 }
  });
  
  dynamicStep.addValidationRule({
    field: 'stock',
    type: 'conditional',
    operator: '>',
    value: 0
  });
  
  workflow.pushStep(dynamicStep);
  
  try {
    const result = await workflow.execute();
    console.log('\nDynamic validation succeeded!');
  } catch (error) {
    console.error('Validation failed:', error.message);
  }
}

// Run all examples
async function runExamples() {
  await example1();
  await example2();
  await example3();
  await example4();
}

runExamples().catch(console.error);
```

## Output

```
=== Example 1: Valid User Registration ===

✓ Email validation passed
✓ Username validation passed
✓ Password validation passed
✓ Age validation passed
Creating user account: { email: 'newuser@example.com', username: 'new_user_123', age: 25 }
✓ Account created with ID: 7842

=== Registration Completed Successfully ===

Result: { userId: 7842, executionTime: '512ms' }


=== Example 2: Duplicate Email ===

✗ Validate Email failed: Validation failed: Please provide a valid, unique email address
Expected failure: Validation failed: Please provide a valid, unique email address


=== Example 3: Weak Password ===

✓ Email validation passed
✓ Username validation passed
✗ Validate Password failed: Validation failed: Password must be 8-100 characters with uppercase, lowercase, numbers, and special characters
Expected failure: Validation failed: Password must be 8-100 characters with uppercase, lowercase, numbers, and special characters


=== Example 4: Dynamic Validation Rules ===

All dynamic validations passed!

Dynamic validation succeeded!
```

## Key Features Demonstrated

1. **Extended LogicStep** - Custom class inherits LogicStep functionality
2. **Schema Validation** - Multiple validation rules per step
3. **Database Integration** - Async uniqueness and existence checks
4. **Custom Validators** - Support for complex validation logic
5. **Error Messages** - Customizable error messaging
6. **Caching** - Optional validation result caching for performance
7. **Dynamic Rules** - Add validation rules at runtime
8. **Built-in Comparisons** - Leverages LogicStep's condition checking

## Advanced Features

### Custom Validator Function

```javascript
const customStep = new ValidationLogicStep({
  name: 'Custom Validation',
  type: StepTypes.ACTION,
  validationRules: [
    {
      field: 'customField',
      customValidator: async (value, workflowState) => {
        // Access other workflow data
        const relatedField = workflowState.get('relatedField');
        
        // Complex validation logic
        return value > relatedField * 2;
      }
    }
  ],
  callable: async function() {
    return { validated: true };
  }
});
```

### Validation Rule Types

- **required**: Field must have a value
- **type**: Check JavaScript type
- **range**: Numeric min/max validation
- **length**: String length validation
- **pattern**: Regular expression matching
- **unique**: Database uniqueness check
- **exists**: Foreign key validation
- **conditional**: Use LogicStep operators

## Use Cases

- **User Registration** - Validate user input with database checks
- **API Input Validation** - Validate incoming API requests
- **Data Import** - Validate CSV/JSON data before processing
- **Form Submission** - Backend validation for form data
- **Business Rules** - Enforce complex business logic
- **Data Integrity** - Ensure referential integrity

## See Also

- [LogicStep API](../../api/classes/logic-step.md)
- [ConditionalStep](../../api/classes/conditional-step.md)
- [State Management](../../core-concepts/state-management.md)
- [Error Handling](../../advanced/error-handling.md)

````
