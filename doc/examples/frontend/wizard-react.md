# Multi-Step Form Wizard (React)

This example demonstrates building a multi-step form wizard in React using Micro Flow for state management and flow control.

## Use Case

A user onboarding wizard with:
1. Personal information collection
2. Account preferences
3. Payment setup
4. Confirmation and submission
5. Real-time validation
6. Progress tracking

## Full Implementation

```jsx
import React, { useState, useEffect, useCallback } from 'react';
import { 
  Workflow, 
  Step, 
  StepTypes, 
  ConditionalStep,
  WorkflowState 
} from 'micro-flow';

// Validation utilities
const validators = {
  email: (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value),
  phone: (value) => /^\d{10}$/.test(value.replace(/\D/g, '')),
  required: (value) => value && value.trim().length > 0,
  minLength: (value, min) => value && value.length >= min
};

// API simulation
const api = {
  checkEmailAvailability: async (email) => {
    await new Promise(resolve => setTimeout(resolve, 500));
    return !email.includes('taken');
  },
  
  createAccount: async (data) => {
    await new Promise(resolve => setTimeout(resolve, 1000));
    return { userId: Math.random().toString(36).substr(2, 9), success: true };
  },
  
  processPayment: async (paymentData) => {
    await new Promise(resolve => setTimeout(resolve, 800));
    return { transactionId: 'txn_' + Date.now(), success: true };
  }
};

// Main Wizard Component
function OnboardingWizard() {
  const [currentStep, setCurrentStep] = useState(0);
  const [formData, setFormData] = useState({
    // Step 1: Personal Info
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    
    // Step 2: Preferences
    notifications: true,
    newsletter: false,
    accountType: 'free',
    
    // Step 3: Payment (for premium accounts)
    cardNumber: '',
    expiryDate: '',
    cvv: '',
    
    // Results
    userId: null,
    transactionId: null
  });
  
  const [errors, setErrors] = useState({});
  const [isProcessing, setIsProcessing] = useState(false);
  const [workflowStatus, setWorkflowStatus] = useState('idle');
  const [progress, setProgress] = useState(0);
  
  const steps = [
    'Personal Information',
    'Preferences',
    'Payment',
    'Confirmation'
  ];
  
  // Create validation workflow
  const createValidationWorkflow = useCallback((stepIndex) => {
    const workflow = new Workflow({ name: 'Form Validation' });
    
    if (stepIndex === 0) {
      // Validate personal info
      workflow.pushStep(new Step({
        name: 'Validate Personal Info',
        type: StepTypes.ACTION,
        callable: async () => {
          const newErrors = {};
          
          if (!validators.required(formData.firstName)) {
            newErrors.firstName = 'First name is required';
          }
          if (!validators.required(formData.lastName)) {
            newErrors.lastName = 'Last name is required';
          }
          if (!validators.email(formData.email)) {
            newErrors.email = 'Valid email is required';
          }
          if (!validators.phone(formData.phone)) {
            newErrors.phone = 'Valid 10-digit phone number is required';
          }
          
          if (Object.keys(newErrors).length > 0) {
            throw new Error('Validation failed');
          }
          
          return newErrors;
        }
      }));
      
      // Check email availability
      workflow.pushStep(new Step({
        name: 'Check Email',
        type: StepTypes.ACTION,
        callable: async () => {
          const available = await api.checkEmailAvailability(formData.email);
          if (!available) {
            throw new Error('Email already taken');
          }
          return { available };
        }
      }));
      
    } else if (stepIndex === 2 && formData.accountType === 'premium') {
      // Validate payment info
      workflow.pushStep(new Step({
        name: 'Validate Payment',
        type: StepTypes.ACTION,
        callable: async () => {
          const newErrors = {};
          
          if (!validators.minLength(formData.cardNumber.replace(/\s/g, ''), 16)) {
            newErrors.cardNumber = 'Valid card number is required';
          }
          if (!formData.expiryDate.match(/^\d{2}\/\d{2}$/)) {
            newErrors.expiryDate = 'Valid expiry date (MM/YY) is required';
          }
          if (!validators.minLength(formData.cvv, 3)) {
            newErrors.cvv = 'Valid CVV is required';
          }
          
          if (Object.keys(newErrors).length > 0) {
            throw new Error('Validation failed');
          }
          
          return {};
        }
      }));
    }
    
    return workflow;
  }, [formData]);
  
  // Create submission workflow
  const createSubmissionWorkflow = useCallback(() => {
    const workflow = new Workflow({
      name: 'Account Creation',
      exit_on_failure: false
    });
    
    // Step 1: Create account
    const createAccountStep = new Step({
      name: 'Create Account',
      type: StepTypes.ACTION,
      callable: async function() {
        const accountData = {
          firstName: formData.firstName,
          lastName: formData.lastName,
          email: formData.email,
          phone: formData.phone,
          accountType: formData.accountType,
          notifications: formData.notifications,
          newsletter: formData.newsletter
        };
        
        const result = await api.createAccount(accountData);
        this.workflow.set('userId', result.userId);
        
        return result;
      }
    });
    
    // Step 2: Process payment (conditional - only for premium)
    const paymentStep = new ConditionalStep({
      name: 'Payment Processing',
      subject: formData.accountType,
      operator: '===',
      value: 'premium',
      step_left: new Step({
        name: 'Process Payment',
        type: StepTypes.ACTION,
        callable: async function() {
          const paymentData = {
            userId: this.workflow.get('userId'),
            cardNumber: formData.cardNumber,
            expiryDate: formData.expiryDate,
            amount: 9.99
          };
          
          const result = await api.processPayment(paymentData);
          this.workflow.set('transactionId', result.transactionId);
          
          return result;
        }
      }),
      step_right: new Step({
        name: 'Skip Payment',
        type: StepTypes.ACTION,
        callable: async () => ({ message: 'Free account - no payment needed' })
      })
    });
    
    workflow.pushSteps([createAccountStep, paymentStep]);
    
    // Event listeners
    workflow.events.on('WORKFLOW_STARTED', () => {
      setWorkflowStatus('processing');
    });
    
    workflow.events.on('STEP_COMPLETED', (data) => {
      const currentIndex = data.step.workflow.get('current_step_index');
      const totalSteps = data.step.workflow.get('steps').length;
      setProgress((currentIndex / totalSteps) * 100);
    });
    
    workflow.events.on('WORKFLOW_COMPLETED', () => {
      setWorkflowStatus('completed');
      setProgress(100);
    });
    
    workflow.events.on('WORKFLOW_ERRORED', (data) => {
      setWorkflowStatus('error');
      setErrors({ submit: data.error.message });
    });
    
    return workflow;
  }, [formData]);
  
  // Handle next button
  const handleNext = async () => {
    setErrors({});
    setIsProcessing(true);
    
    try {
      const validationWorkflow = createValidationWorkflow(currentStep);
      
      if (!validationWorkflow.isEmpty()) {
        await validationWorkflow.execute();
      }
      
      setCurrentStep(prev => prev + 1);
      
    } catch (error) {
      const stepErrors = {};
      if (error.message === 'Email already taken') {
        stepErrors.email = error.message;
      } else if (error.message === 'Validation failed') {
        // Errors already set by validation step
      } else {
        stepErrors.general = error.message;
      }
      setErrors(stepErrors);
      
    } finally {
      setIsProcessing(false);
    }
  };
  
  // Handle form submission
  const handleSubmit = async () => {
    setErrors({});
    setIsProcessing(true);
    
    try {
      const workflow = createSubmissionWorkflow();
      const result = await workflow.execute();
      
      const userId = result.state.get('userId');
      const transactionId = result.state.get('transactionId');
      
      setFormData(prev => ({ ...prev, userId, transactionId }));
      setCurrentStep(prev => prev + 1);
      
    } catch (error) {
      setErrors({ submit: error.message });
    } finally {
      setIsProcessing(false);
    }
  };
  
  // Handle input changes
  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error for this field
    if (errors[field]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };
  
  return (
    <div className="wizard-container">
      <h1>Create Your Account</h1>
      
      {/* Progress Bar */}
      <div className="progress-bar">
        <div 
          className="progress-fill" 
          style={{ width: `${((currentStep + 1) / steps.length) * 100}%` }}
        />
      </div>
      
      {/* Step Indicators */}
      <div className="step-indicators">
        {steps.map((step, index) => (
          <div 
            key={index}
            className={`step-indicator ${index === currentStep ? 'active' : ''} ${index < currentStep ? 'completed' : ''}`}
          >
            <div className="step-number">{index + 1}</div>
            <div className="step-label">{step}</div>
          </div>
        ))}
      </div>
      
      {/* Step Content */}
      <div className="step-content">
        {currentStep === 0 && (
          <PersonalInfoStep 
            formData={formData}
            errors={errors}
            onChange={handleChange}
          />
        )}
        
        {currentStep === 1 && (
          <PreferencesStep 
            formData={formData}
            errors={errors}
            onChange={handleChange}
          />
        )}
        
        {currentStep === 2 && (
          <PaymentStep 
            formData={formData}
            errors={errors}
            onChange={handleChange}
          />
        )}
        
        {currentStep === 3 && (
          <ConfirmationStep 
            formData={formData}
            workflowStatus={workflowStatus}
          />
        )}
      </div>
      
      {/* Navigation Buttons */}
      <div className="wizard-actions">
        {currentStep > 0 && currentStep < 3 && (
          <button 
            onClick={() => setCurrentStep(prev => prev - 1)}
            disabled={isProcessing}
          >
            Back
          </button>
        )}
        
        {currentStep < 2 && (
          <button 
            onClick={handleNext}
            disabled={isProcessing}
            className="primary"
          >
            {isProcessing ? 'Validating...' : 'Next'}
          </button>
        )}
        
        {currentStep === 2 && (
          <button 
            onClick={handleSubmit}
            disabled={isProcessing}
            className="primary"
          >
            {isProcessing ? (
              <>
                <span>Processing... {Math.round(progress)}%</span>
              </>
            ) : (
              'Create Account'
            )}
          </button>
        )}
      </div>
      
      {errors.submit && (
        <div className="error-message">{errors.submit}</div>
      )}
    </div>
  );
}

// Step Components
function PersonalInfoStep({ formData, errors, onChange }) {
  return (
    <div className="form-step">
      <h2>Personal Information</h2>
      
      <div className="form-group">
        <label>First Name *</label>
        <input
          type="text"
          value={formData.firstName}
          onChange={(e) => onChange('firstName', e.target.value)}
          className={errors.firstName ? 'error' : ''}
        />
        {errors.firstName && <span className="field-error">{errors.firstName}</span>}
      </div>
      
      <div className="form-group">
        <label>Last Name *</label>
        <input
          type="text"
          value={formData.lastName}
          onChange={(e) => onChange('lastName', e.target.value)}
          className={errors.lastName ? 'error' : ''}
        />
        {errors.lastName && <span className="field-error">{errors.lastName}</span>}
      </div>
      
      <div className="form-group">
        <label>Email *</label>
        <input
          type="email"
          value={formData.email}
          onChange={(e) => onChange('email', e.target.value)}
          className={errors.email ? 'error' : ''}
        />
        {errors.email && <span className="field-error">{errors.email}</span>}
      </div>
      
      <div className="form-group">
        <label>Phone *</label>
        <input
          type="tel"
          value={formData.phone}
          onChange={(e) => onChange('phone', e.target.value)}
          placeholder="(555) 123-4567"
          className={errors.phone ? 'error' : ''}
        />
        {errors.phone && <span className="field-error">{errors.phone}</span>}
      </div>
    </div>
  );
}

function PreferencesStep({ formData, errors, onChange }) {
  return (
    <div className="form-step">
      <h2>Account Preferences</h2>
      
      <div className="form-group">
        <label>Account Type</label>
        <select
          value={formData.accountType}
          onChange={(e) => onChange('accountType', e.target.value)}
        >
          <option value="free">Free</option>
          <option value="premium">Premium ($9.99/month)</option>
        </select>
      </div>
      
      <div className="form-group checkbox">
        <label>
          <input
            type="checkbox"
            checked={formData.notifications}
            onChange={(e) => onChange('notifications', e.target.checked)}
          />
          Enable email notifications
        </label>
      </div>
      
      <div className="form-group checkbox">
        <label>
          <input
            type="checkbox"
            checked={formData.newsletter}
            onChange={(e) => onChange('newsletter', e.target.checked)}
          />
          Subscribe to newsletter
        </label>
      </div>
    </div>
  );
}

function PaymentStep({ formData, errors, onChange }) {
  if (formData.accountType === 'free') {
    return (
      <div className="form-step">
        <h2>Payment</h2>
        <p className="info-message">No payment required for free accounts.</p>
      </div>
    );
  }
  
  return (
    <div className="form-step">
      <h2>Payment Information</h2>
      <p className="info-text">Premium Account: $9.99/month</p>
      
      <div className="form-group">
        <label>Card Number *</label>
        <input
          type="text"
          value={formData.cardNumber}
          onChange={(e) => onChange('cardNumber', e.target.value)}
          placeholder="1234 5678 9012 3456"
          maxLength="19"
          className={errors.cardNumber ? 'error' : ''}
        />
        {errors.cardNumber && <span className="field-error">{errors.cardNumber}</span>}
      </div>
      
      <div className="form-row">
        <div className="form-group">
          <label>Expiry Date *</label>
          <input
            type="text"
            value={formData.expiryDate}
            onChange={(e) => onChange('expiryDate', e.target.value)}
            placeholder="MM/YY"
            maxLength="5"
            className={errors.expiryDate ? 'error' : ''}
          />
          {errors.expiryDate && <span className="field-error">{errors.expiryDate}</span>}
        </div>
        
        <div className="form-group">
          <label>CVV *</label>
          <input
            type="text"
            value={formData.cvv}
            onChange={(e) => onChange('cvv', e.target.value)}
            placeholder="123"
            maxLength="4"
            className={errors.cvv ? 'error' : ''}
          />
          {errors.cvv && <span className="field-error">{errors.cvv}</span>}
        </div>
      </div>
    </div>
  );
}

function ConfirmationStep({ formData, workflowStatus }) {
  return (
    <div className="form-step confirmation">
      {workflowStatus === 'completed' ? (
        <>
          <div className="success-icon">✓</div>
          <h2>Account Created Successfully!</h2>
          <p>User ID: <strong>{formData.userId}</strong></p>
          {formData.transactionId && (
            <p>Transaction ID: <strong>{formData.transactionId}</strong></p>
          )}
          <p>A confirmation email has been sent to <strong>{formData.email}</strong></p>
        </>
      ) : (
        <>
          <h2>Creating Your Account...</h2>
          <div className="spinner"></div>
        </>
      )}
    </div>
  );
}

export default OnboardingWizard;
```

## CSS Styles

```css
.wizard-container {
  max-width: 600px;
  margin: 0 auto;
  padding: 20px;
}

.progress-bar {
  height: 4px;
  background: #e0e0e0;
  border-radius: 2px;
  margin: 20px 0;
}

.progress-fill {
  height: 100%;
  background: #4caf50;
  border-radius: 2px;
  transition: width 0.3s ease;
}

.step-indicators {
  display: flex;
  justify-content: space-between;
  margin: 30px 0;
}

.step-indicator {
  flex: 1;
  text-align: center;
  opacity: 0.5;
}

.step-indicator.active,
.step-indicator.completed {
  opacity: 1;
}

.step-number {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: #e0e0e0;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto 8px;
  font-weight: bold;
}

.step-indicator.active .step-number {
  background: #2196f3;
  color: white;
}

.step-indicator.completed .step-number {
  background: #4caf50;
  color: white;
}

.form-group {
  margin-bottom: 20px;
}

.form-group label {
  display: block;
  margin-bottom: 8px;
  font-weight: 500;
}

.form-group input,
.form-group select {
  width: 100%;
  padding: 10px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 14px;
}

.form-group input.error {
  border-color: #f44336;
}

.field-error {
  color: #f44336;
  font-size: 12px;
  margin-top: 4px;
  display: block;
}

.wizard-actions {
  display: flex;
  gap: 10px;
  justify-content: flex-end;
  margin-top: 30px;
}

button {
  padding: 10px 24px;
  border: 1px solid #ddd;
  border-radius: 4px;
  background: white;
  cursor: pointer;
  font-size: 14px;
}

button.primary {
  background: #2196f3;
  color: white;
  border-color: #2196f3;
}

button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.confirmation {
  text-align: center;
  padding: 40px 0;
}

.success-icon {
  width: 80px;
  height: 80px;
  border-radius: 50%;
  background: #4caf50;
  color: white;
  font-size: 48px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto 20px;
}

.spinner {
  width: 40px;
  height: 40px;
  border: 4px solid #e0e0e0;
  border-top-color: #2196f3;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin: 20px auto;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}
```

## Key Features

1. **Multi-Step Form** - Guided user experience with clear progress
2. **Real-Time Validation** - Async validation using workflows
3. **Conditional Logic** - Payment step only for premium accounts
4. **Progress Tracking** - Visual feedback during submission
5. **Error Handling** - Field-level and form-level error display
6. **State Management** - Workflow state manages form data
7. **Event-Driven UI** - React components respond to workflow events
8. **Async Operations** - All API calls properly handled

## Use Cases

- User onboarding flows
- Checkout processes
- Survey forms
- Application wizards
- Configuration wizards

## See Also

- [State Management](../../core-concepts/state-management.md)
- [Conditional Steps](../../step-types/conditional-step.md)
- [Events](../../core-concepts/events.md)
