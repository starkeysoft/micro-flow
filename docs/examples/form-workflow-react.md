# Multi-Step Form - React

A multi-step form implementation using workflows in React.

## Overview

This example demonstrates building a complex multi-step form with validation, progress tracking, and data persistence using React and micro-flow.

## Code

```javascript
import React, { useState } from 'react';
import { Workflow, Step, ConditionalStep, State } from './micro-flow.js';

function MultiStepForm() {
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    name: '',
    phone: ''
  });
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitResult, setSubmitResult] = useState(null);

  // Update form data
  const updateField = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    State.set(`form.${field}`, value);
  };

  // Validation workflows
  const createValidationWorkflow = (step) => {
    const workflows = {
      1: new Workflow({
        name: 'validate-step-1',
        steps: [
          new ConditionalStep({
            name: 'validate-email',
            conditional: {
              subject: /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email),
              operator: '===',
              value: true
            },
            true_callable: async () => ({ valid: true }),
            false_callable: async () => {
              throw new Error('Invalid email format');
            }
          }),
          new ConditionalStep({
            name: 'validate-password',
            conditional: {
              subject: formData.password.length,
              operator: '>=',
              value: 8
            },
            true_callable: async () => ({ valid: true }),
            false_callable: async () => {
              throw new Error('Password must be at least 8 characters');
            }
          })
        ]
      }),
      2: new Workflow({
        name: 'validate-step-2',
        steps: [
          new ConditionalStep({
            name: 'validate-name',
            conditional: {
              subject: formData.name.trim().length,
              operator: '>',
              value: 0
            },
            true_callable: async () => ({ valid: true }),
            false_callable: async () => {
              throw new Error('Name is required');
            }
          }),
          new ConditionalStep({
            name: 'validate-phone',
            conditional: {
              subject: /^\d{10}$/.test(formData.phone.replace(/\D/g, '')),
              operator: '===',
              value: true
            },
            true_callable: async () => ({ valid: true }),
            false_callable: async () => {
              throw new Error('Invalid phone number');
            }
          })
        ]
      })
    };

    return workflows[step];
  };

  // Handle next step
  const handleNext = async () => {
    setErrors({});
    
    const validationWorkflow = createValidationWorkflow(currentStep);
    
    try {
      await validationWorkflow.execute();
      setCurrentStep(prev => prev + 1);
    } catch (error) {
      setErrors({ general: error.message });
    }
  };

  // Handle previous step
  const handlePrev = () => {
    setCurrentStep(prev => prev - 1);
  };

  // Submit form
  const handleSubmit = async () => {
    setIsSubmitting(true);
    setErrors({});

    const submitWorkflow = new Workflow({
      name: 'submit-form',
      steps: [
        new Step({
          name: 'validate-all',
          callable: async () => {
            // Validate all steps
            for (let i = 1; i <= 2; i++) {
              const validation = createValidationWorkflow(i);
              await validation.execute();
            }
          }
        }),
        new Step({
          name: 'save-to-backend',
          callable: async () => {
            console.log('Submitting form data:', formData);
            
            const response = await fetch('/api/register', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(formData)
            });

            if (!response.ok) {
              throw new Error('Submission failed');
            }

            return await response.json();
          }
        }),
        new Step({
          name: 'clear-cache',
          callable: async () => {
            // Clear form state
            State.delete('form');
            localStorage.removeItem('formData');
          }
        }),
        new Step({
          name: 'send-confirmation',
          callable: async () => {
            // Send confirmation email
            await fetch('/api/send-confirmation', {
              method: 'POST',
              body: JSON.stringify({ email: formData.email })
            });
          }
        })
      ]
    });

    try {
      const result = await submitWorkflow.execute();
      setSubmitResult({ success: true, message: 'Registration successful!' });
    } catch (error) {
      setSubmitResult({ success: false, message: error.message });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Render current step
  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="form-step">
            <h2>Step 1: Account Information</h2>
            <div className="form-group">
              <label>Email</label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => updateField('email', e.target.value)}
                placeholder="your@email.com"
              />
            </div>
            <div className="form-group">
              <label>Password</label>
              <input
                type="password"
                value={formData.password}
                onChange={(e) => updateField('password', e.target.value)}
                placeholder="Min 8 characters"
              />
            </div>
          </div>
        );

      case 2:
        return (
          <div className="form-step">
            <h2>Step 2: Personal Information</h2>
            <div className="form-group">
              <label>Full Name</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => updateField('name', e.target.value)}
                placeholder="John Doe"
              />
            </div>
            <div className="form-group">
              <label>Phone Number</label>
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) => updateField('phone', e.target.value)}
                placeholder="(555) 555-5555"
              />
            </div>
          </div>
        );

      case 3:
        return (
          <div className="form-step">
            <h2>Step 3: Review</h2>
            <div className="review">
              <p><strong>Email:</strong> {formData.email}</p>
              <p><strong>Name:</strong> {formData.name}</p>
              <p><strong>Phone:</strong> {formData.phone}</p>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  // Render result
  if (submitResult) {
    return (
      <div className={`result ${submitResult.success ? 'success' : 'error'}`}>
        <h2>{submitResult.success ? '✓ Success!' : '✗ Error'}</h2>
        <p>{submitResult.message}</p>
        {submitResult.success && (
          <button onClick={() => window.location.href = '/dashboard'}>
            Go to Dashboard
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="multi-step-form">
      <div className="progress-bar">
        <div className="progress" style={{ width: `${(currentStep / 3) * 100}%` }}></div>
      </div>

      <div className="form-container">
        {renderStep()}

        {errors.general && (
          <div className="error-message">{errors.general}</div>
        )}

        <div className="form-actions">
          {currentStep > 1 && (
            <button onClick={handlePrev} disabled={isSubmitting}>
              Previous
            </button>
          )}

          {currentStep < 3 ? (
            <button onClick={handleNext} disabled={isSubmitting}>
              Next
            </button>
          ) : (
            <button onClick={handleSubmit} disabled={isSubmitting}>
              {isSubmitting ? 'Submitting...' : 'Submit'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default MultiStepForm;
```

## CSS

```css
.multi-step-form {
  max-width: 500px;
  margin: 50px auto;
  padding: 20px;
}

.progress-bar {
  height: 4px;
  background: #e0e0e0;
  border-radius: 2px;
  margin-bottom: 30px;
}

.progress {
  height: 100%;
  background: #4CAF50;
  border-radius: 2px;
  transition: width 0.3s ease;
}

.form-step {
  margin-bottom: 30px;
}

.form-group {
  margin-bottom: 20px;
}

.form-group label {
  display: block;
  margin-bottom: 5px;
  font-weight: bold;
}

.form-group input {
  width: 100%;
  padding: 10px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 16px;
}

.form-actions {
  display: flex;
  justify-content: space-between;
  gap: 10px;
}

button {
  padding: 10px 20px;
  border: none;
  border-radius: 4px;
  background: #2196F3;
  color: white;
  cursor: pointer;
  font-size: 16px;
}

button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.error-message {
  padding: 10px;
  background: #ffebee;
  color: #c62828;
  border-radius: 4px;
  margin-bottom: 20px;
}

.result {
  padding: 40px;
  text-align: center;
  border-radius: 8px;
}

.result.success {
  background: #e8f5e9;
  color: #2e7d32;
}

.result.error {
  background: #ffebee;
  color: #c62828;
}
```

## Key Features

- **Step-by-step validation** using workflows
- **Progress tracking** with visual indicator
- **State persistence** using micro-flow State
- **Error handling** with user-friendly messages
- **Multi-step submission** workflow
- **Review step** before final submission

## Related Examples

- [Vue Data Fetching](data-fetching-vue.md)
- [Vanilla JS Animation](animation-browser.md)
