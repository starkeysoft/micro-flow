# Form Validation Flow (Frontend - Vanilla JS)

This example demonstrates building a progressive form validation system using Micro Flow in vanilla JavaScript.

## Use Case

Real-time form validation with:
1. Field-level validation on blur
2. Cross-field validation
3. Async validation (email/username availability)
4. Visual feedback
5. Progressive disclosure of errors

## Full Implementation

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Form Validation with Micro Flow</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      max-width: 500px;
      margin: 50px auto;
      padding: 20px;
    }
    
    .form-group {
      margin-bottom: 20px;
    }
    
    .form-group label {
      display: block;
      margin-bottom: 5px;
      font-weight: 500;
    }
    
    .form-group input {
      width: 100%;
      padding: 10px;
      border: 2px solid #ddd;
      border-radius: 4px;
      font-size: 14px;
      transition: border-color 0.3s;
    }
    
    .form-group input:focus {
      outline: none;
      border-color: #2196f3;
    }
    
    .form-group input.valid {
      border-color: #4caf50;
    }
    
    .form-group input.invalid {
      border-color: #f44336;
    }
    
    .form-group input.validating {
      border-color: #ff9800;
    }
    
    .validation-message {
      font-size: 12px;
      margin-top: 5px;
      display: none;
    }
    
    .validation-message.error {
      color: #f44336;
      display: block;
    }
    
    .validation-message.success {
      color: #4caf50;
      display: block;
    }
    
    .validation-message.info {
      color: #ff9800;
      display: block;
    }
    
    button {
      width: 100%;
      padding: 12px;
      background: #2196f3;
      color: white;
      border: none;
      border-radius: 4px;
      font-size: 16px;
      cursor: pointer;
      transition: background 0.3s;
    }
    
    button:hover:not(:disabled) {
      background: #1976d2;
    }
    
    button:disabled {
      background: #ccc;
      cursor: not-allowed;
    }
    
    .success-message {
      background: #4caf50;
      color: white;
      padding: 15px;
      border-radius: 4px;
      margin-bottom: 20px;
      display: none;
    }
    
    .strength-meter {
      height: 4px;
      background: #ddd;
      border-radius: 2px;
      margin-top: 5px;
      overflow: hidden;
    }
    
    .strength-meter-fill {
      height: 100%;
      transition: width 0.3s, background 0.3s;
      width: 0;
    }
    
    .strength-weak { background: #f44336; }
    .strength-medium { background: #ff9800; }
    .strength-strong { background: #4caf50; }
  </style>
</head>
<body>
  <h1>Create Account</h1>
  
  <div class="success-message" id="successMessage">
    Account created successfully!
  </div>
  
  <form id="registrationForm">
    <div class="form-group">
      <label for="username">Username</label>
      <input 
        type="text" 
        id="username" 
        name="username"
        autocomplete="off"
      />
      <div class="validation-message" id="usernameMessage"></div>
    </div>
    
    <div class="form-group">
      <label for="email">Email</label>
      <input 
        type="email" 
        id="email" 
        name="email"
        autocomplete="off"
      />
      <div class="validation-message" id="emailMessage"></div>
    </div>
    
    <div class="form-group">
      <label for="password">Password</label>
      <input 
        type="password" 
        id="password" 
        name="password"
      />
      <div class="strength-meter">
        <div class="strength-meter-fill" id="strengthFill"></div>
      </div>
      <div class="validation-message" id="passwordMessage"></div>
    </div>
    
    <div class="form-group">
      <label for="confirmPassword">Confirm Password</label>
      <input 
        type="password" 
        id="confirmPassword" 
        name="confirmPassword"
      />
      <div class="validation-message" id="confirmPasswordMessage"></div>
    </div>
    
    <button type="submit" id="submitButton">Create Account</button>
  </form>
  
  <script type="module">
    import { Workflow, Step, StepTypes, ConditionalStep } from 'micro-flow';
    
    // Validation rules
    const validators = {
      username: {
        minLength: 3,
        maxLength: 20,
        pattern: /^[a-zA-Z0-9_]+$/
      },
      email: {
        pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      },
      password: {
        minLength: 8,
        requireUppercase: true,
        requireLowercase: true,
        requireNumber: true
      }
    };
    
    // Simulated API
    const api = {
      checkUsername: async (username) => {
        await new Promise(resolve => setTimeout(resolve, 500));
        return !['admin', 'user', 'test'].includes(username.toLowerCase());
      },
      
      checkEmail: async (email) => {
        await new Promise(resolve => setTimeout(resolve, 500));
        return !email.endsWith('@blocked.com');
      },
      
      register: async (data) => {
        await new Promise(resolve => setTimeout(resolve, 1000));
        return { success: true, userId: Math.random().toString(36).substr(2, 9) };
      }
    };
    
    // Form elements
    const form = document.getElementById('registrationForm');
    const inputs = {
      username: document.getElementById('username'),
      email: document.getElementById('email'),
      password: document.getElementById('password'),
      confirmPassword: document.getElementById('confirmPassword')
    };
    const messages = {
      username: document.getElementById('usernameMessage'),
      email: document.getElementById('emailMessage'),
      password: document.getElementById('passwordMessage'),
      confirmPassword: document.getElementById('confirmPasswordMessage')
    };
    const submitButton = document.getElementById('submitButton');
    const successMessage = document.getElementById('successMessage');
    const strengthFill = document.getElementById('strengthFill');
    
    // Validation state
    const fieldValidation = {
      username: false,
      email: false,
      password: false,
      confirmPassword: false
    };
    
    // Helper functions
    function showMessage(field, message, type = 'error') {
      const el = messages[field];
      el.textContent = message;
      el.className = `validation-message ${type}`;
      
      const input = inputs[field];
      input.className = type === 'error' ? 'invalid' : (type === 'success' ? 'valid' : 'validating');
    }
    
    function clearMessage(field) {
      messages[field].className = 'validation-message';
      inputs[field].className = '';
    }
    
    function updateSubmitButton() {
      const allValid = Object.values(fieldValidation).every(v => v === true);
      submitButton.disabled = !allValid;
    }
    
    function calculatePasswordStrength(password) {
      let strength = 0;
      if (password.length >= 8) strength += 25;
      if (password.length >= 12) strength += 25;
      if (/[a-z]/.test(password)) strength += 12.5;
      if (/[A-Z]/.test(password)) strength += 12.5;
      if (/[0-9]/.test(password)) strength += 12.5;
      if (/[^a-zA-Z0-9]/.test(password)) strength += 12.5;
      return Math.min(strength, 100);
    }
    
    // Create validation workflow
    function createFieldValidationWorkflow(field, value) {
      const workflow = new Workflow({ name: `Validate ${field}` });
      
      if (field === 'username') {
        // Client-side validation
        workflow.pushStep(new Step({
          name: 'Check Format',
          type: StepTypes.ACTION,
          callable: async () => {
            if (value.length < validators.username.minLength) {
              throw new Error(`Username must be at least ${validators.username.minLength} characters`);
            }
            if (value.length > validators.username.maxLength) {
              throw new Error(`Username must be at most ${validators.username.maxLength} characters`);
            }
            if (!validators.username.pattern.test(value)) {
              throw new Error('Username can only contain letters, numbers, and underscores');
            }
            return { valid: true };
          }
        }));
        
        // Server-side validation
        workflow.pushStep(new Step({
          name: 'Check Availability',
          type: StepTypes.ACTION,
          callable: async () => {
            const available = await api.checkUsername(value);
            if (!available) {
              throw new Error('Username is already taken');
            }
            return { available };
          }
        }));
        
      } else if (field === 'email') {
        workflow.pushStep(new Step({
          name: 'Check Format',
          type: StepTypes.ACTION,
          callable: async () => {
            if (!validators.email.pattern.test(value)) {
              throw new Error('Please enter a valid email address');
            }
            return { valid: true };
          }
        }));
        
        workflow.pushStep(new Step({
          name: 'Check Availability',
          type: StepTypes.ACTION,
          callable: async () => {
            const available = await api.checkEmail(value);
            if (!available) {
              throw new Error('Email domain is blocked');
            }
            return { available };
          }
        }));
        
      } else if (field === 'password') {
        workflow.pushStep(new Step({
          name: 'Check Strength',
          type: StepTypes.ACTION,
          callable: async () => {
            if (value.length < validators.password.minLength) {
              throw new Error(`Password must be at least ${validators.password.minLength} characters`);
            }
            if (validators.password.requireUppercase && !/[A-Z]/.test(value)) {
              throw new Error('Password must contain an uppercase letter');
            }
            if (validators.password.requireLowercase && !/[a-z]/.test(value)) {
              throw new Error('Password must contain a lowercase letter');
            }
            if (validators.password.requireNumber && !/[0-9]/.test(value)) {
              throw new Error('Password must contain a number');
            }
            return { valid: true };
          }
        }));
        
      } else if (field === 'confirmPassword') {
        workflow.pushStep(new Step({
          name: 'Check Match',
          type: StepTypes.ACTION,
          callable: async () => {
            if (value !== inputs.password.value) {
              throw new Error('Passwords do not match');
            }
            return { valid: true };
          }
        }));
      }
      
      return workflow;
    }
    
    // Validation handler
    async function validateField(field) {
      const value = inputs[field].value;
      
      if (!value) {
        clearMessage(field);
        fieldValidation[field] = false;
        updateSubmitButton();
        return;
      }
      
      // Show validating state for async fields
      if (field === 'username' || field === 'email') {
        showMessage(field, 'Checking...', 'info');
      }
      
      try {
        const workflow = createFieldValidationWorkflow(field, value);
        await workflow.execute();
        
        showMessage(field, '✓ Looks good!', 'success');
        fieldValidation[field] = true;
        
      } catch (error) {
        showMessage(field, error.message, 'error');
        fieldValidation[field] = false;
      }
      
      updateSubmitButton();
    }
    
    // Password strength indicator
    inputs.password.addEventListener('input', (e) => {
      const password = e.target.value;
      if (!password) {
        strengthFill.style.width = '0';
        return;
      }
      
      const strength = calculatePasswordStrength(password);
      strengthFill.style.width = strength + '%';
      
      if (strength < 40) {
        strengthFill.className = 'strength-meter-fill strength-weak';
      } else if (strength < 70) {
        strengthFill.className = 'strength-meter-fill strength-medium';
      } else {
        strengthFill.className = 'strength-meter-fill strength-strong';
      }
    });
    
    // Attach blur validators
    Object.keys(inputs).forEach(field => {
      inputs[field].addEventListener('blur', () => validateField(field));
      
      // Re-validate confirm password when password changes
      if (field === 'password') {
        inputs[field].addEventListener('input', () => {
          if (inputs.confirmPassword.value) {
            validateField('confirmPassword');
          }
        });
      }
    });
    
    // Form submission
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      
      submitButton.disabled = true;
      submitButton.textContent = 'Creating Account...';
      
      try {
        const formData = {
          username: inputs.username.value,
          email: inputs.email.value,
          password: inputs.password.value
        };
        
        const result = await api.register(formData);
        
        successMessage.style.display = 'block';
        form.style.display = 'none';
        
        console.log('Registration successful:', result);
        
      } catch (error) {
        alert('Registration failed: ' + error.message);
        submitButton.disabled = false;
        submitButton.textContent = 'Create Account';
      }
    });
  </script>
</body>
</html>
```

## Key Features

1. **Progressive Validation** - Fields validate as user completes them
2. **Async Validation** - Username/email availability checks
3. **Visual Feedback** - Color-coded borders and messages
4. **Password Strength** - Real-time strength indicator
5. **Cross-Field Validation** - Password confirmation matching
6. **EventTarget API** - Works natively in browser

## Workflow Benefits

- **Structured Validation** - Each validation step is isolated and testable
- **Sequential Checks** - Format validation before API calls
- **Error Handling** - Graceful handling of validation failures
- **Async Support** - Seamless handling of API validations
- **Event-Driven** - Responds to DOM events

## See Also

- [Workflows](../../core-concepts/workflows.md)
- [Events](../../core-concepts/events.md)
- [Conditional Steps](../../step-types/conditional-step.md)
