# Managing Complex Multi-Step Form Logic

Build sophisticated registration flows and wizards with declarative validation, progress tracking, and cross-tab state synchronization.

## Overview
Building multi-step forms in React often leads to messy "state soup." This example shows how to decouple your business logic (validation, submission, caching) from your UI components using `micro-flow` workflows.

## Implementation

```javascript
import { Workflow, Step, ConditionalStep, State } from 'micro-flow';

const registrationWorkflow = new Workflow({
  name: 'user-registration',
  steps: [
    // 1. Validate Email
    new ConditionalStep({
      name: 'validate-input',
      conditional: {
        subject: () => State.get('form.email'),
        operator: 'includes',
        value: '@'
      },
      true_callable: async () => ({ valid: true }),
      false_callable: async () => { throw new Error('Invalid email'); }
    }),

    // 2. Submit to API
    new Step({
      name: 'api-submission',
      max_retries: 3,
      callable: async () => {
        const data = State.get('form');
        return await api.post('/register', data);
      }
    }),

    // 3. Sync across tabs
    new Step({
      name: 'broadcast-success',
      callable: async () => {
        State.get('events.workflow').emit('auth-success', { user: 'new-user' });
      }
    })
  ]
});
```

## Key Benefits
- **Pure Components**: Keep your React components focused on rendering while the workflow handles the logic.
- **Resilient Submission**: Use built-in retries to ensure form submissions succeed even on spotty mobile connections.
- **Cross-Tab Sync**: Automatically notify other open browser tabs when a form completes successfully.
