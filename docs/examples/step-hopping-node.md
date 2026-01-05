# Step Hopping - Node.js

Dynamic workflow navigation using step indices and step IDs in a Node.js application.

## Overview

This example demonstrates "step hopping" - the ability to programmatically navigate to specific steps in a workflow using either their array index or unique step ID. This is particularly useful for implementing complex business logic, error recovery, conditional branching, and workflow orchestration in backend systems.

## Code

```javascript
import { Workflow, Step, ConditionalStep } from 'micro-flow';

/**
 * Example 1: Step hopping by array index
 * Useful for sequential workflows where position matters
 */
async function exampleHopByIndex() {
  console.log('\n=== Example 1: Hopping by Array Index ===\n');

  // Create workflow with multiple steps
  const validateData = new Step({
    name: 'validate-data',
    callable: async () => {
      console.log('Step 0: Validating input data...');
      return { valid: true };
    }
  });

  const processPayment = new Step({
    name: 'process-payment',
    callable: async () => {
      console.log('Step 1: Processing payment...');
      return { paymentId: 'PAY-12345' };
    }
  });

  const sendConfirmation = new Step({
    name: 'send-confirmation',
    callable: async () => {
      console.log('Step 2: Sending confirmation email...');
      return { emailSent: true };
    }
  });

  const updateInventory = new Step({
    name: 'update-inventory',
    callable: async () => {
      console.log('Step 3: Updating inventory...');
      return { inventoryUpdated: true };
    }
  });

  const workflow = new Workflow({
    name: 'order-processing',
    steps: [validateData, processPayment, sendConfirmation, updateInventory]
  });

  // Method 1: Access step by index and execute directly
  console.log('→ Jumping directly to index 2 (send-confirmation)');
  const stepAtIndex2 = workflow._steps[2];
  workflow.current_step = stepAtIndex2.id;
  const result = await stepAtIndex2.execute();
  console.log('Result:', result);

  console.log('\n→ Jumping to index 3 (update-inventory)');
  const stepAtIndex3 = workflow._steps[3];
  workflow.current_step = stepAtIndex3.id;
  await stepAtIndex3.execute();

  // You can also iterate and skip to a specific index
  console.log('\n→ Executing workflow from index 1');
  for (let i = 1; i < workflow._steps.length; i++) {
    const step = workflow._steps[i];
    workflow.current_step = step.id;
    console.log(`Executing step at index ${i}: ${step.name}`);
    await step.execute();
  }
}

/**
 * Example 2: Step hopping by step ID
 * Useful when you need stable references that don't change
 */
async function exampleHopById() {
  console.log('\n=== Example 2: Hopping by Step ID ===\n');

  // Create workflow
  const step1 = new Step({
    name: 'fetch-user-data',
    callable: async () => {
      console.log('Fetching user data from database...');
      return { userId: 123, name: 'John Doe' };
    }
  });

  const step2 = new Step({
    name: 'check-permissions',
    callable: async () => {
      console.log('Checking user permissions...');
      return { hasAccess: true };
    }
  });

  const step3 = new Step({
    name: 'generate-report',
    callable: async () => {
      console.log('Generating report...');
      return { reportId: 'RPT-789' };
    }
  });

  const step4 = new Step({
    name: 'send-notification',
    callable: async () => {
      console.log('Sending notification...');
      return { notificationSent: true };
    }
  });

  const workflow = new Workflow({
    name: 'report-generation',
    steps: [step1, step2, step3, step4]
  });

  // Store step IDs for later reference
  const stepIds = {
    fetchUser: step1.id,
    checkPerms: step2.id,
    generateReport: step3.id,
    sendNotif: step4.id
  };

  console.log('Available step IDs:');
  Object.entries(stepIds).forEach(([key, id]) => {
    console.log(`  ${key}: ${id}`);
  });

  // Method 2: Access step by ID using steps_by_id object
  console.log('\n→ Jumping directly to "generate-report" step using ID');
  const reportStep = workflow.steps_by_id[stepIds.generateReport];
  workflow.current_step = reportStep.id;
  const reportResult = await reportStep.execute();
  console.log('Result:', reportResult);

  console.log('\n→ Jumping to "send-notification" step using ID');
  const notifStep = workflow.steps_by_id[stepIds.sendNotif];
  workflow.current_step = notifStep.id;
  await notifStep.execute();
}

/**
 * Example 3: Advanced use case - Conditional hopping
 * Demonstrates hopping based on business logic
 */
async function exampleConditionalHopping() {
  console.log('\n=== Example 3: Conditional Step Hopping ===\n');

  let userData = { isPremium: false, needsVerification: true };

  const checkUserStatus = new Step({
    name: 'check-status',
    callable: async () => {
      console.log('Checking user status...');
      return userData;
    }
  });

  const basicProcessing = new Step({
    name: 'basic-processing',
    callable: async () => {
      console.log('Running basic processing...');
      return { processed: true, tier: 'basic' };
    }
  });

  const premiumProcessing = new Step({
    name: 'premium-processing',
    callable: async () => {
      console.log('Running premium processing...');
      return { processed: true, tier: 'premium' };
    }
  });

  const verification = new Step({
    name: 'verification',
    callable: async () => {
      console.log('Running verification...');
      return { verified: true };
    }
  });

  const finalize = new Step({
    name: 'finalize',
    callable: async () => {
      console.log('Finalizing...');
      return { complete: true };
    }
  });

  const workflow = new Workflow({
    name: 'conditional-workflow',
    steps: [checkUserStatus, basicProcessing, premiumProcessing, verification, finalize]
  });

  // Execute first step to get user data
  console.log('→ Executing initial check...');
  workflow.current_step = workflow._steps[0].id;
  const statusResult = await workflow._steps[0].execute();
  console.log('User status:', statusResult);

  // Conditional hopping by index
  if (statusResult.data.isPremium) {
    console.log('\n→ User is premium, jumping to index 2 (premium-processing)');
    workflow.current_step = workflow._steps[2].id;
    await workflow._steps[2].execute();
  } else {
    console.log('\n→ User is basic, jumping to index 1 (basic-processing)');
    workflow.current_step = workflow._steps[1].id;
    await workflow._steps[1].execute();
  }

  // Conditional hopping by ID
  if (statusResult.data.needsVerification) {
    console.log('\n→ Verification needed, jumping by ID');
    const verificationStep = workflow.steps_by_id[verification.id];
    workflow.current_step = verification.id;
    await verificationStep.execute();
  }

  // Always finalize
  console.log('\n→ Jumping to final step');
  const finalStep = workflow._steps[workflow._steps.length - 1];
  workflow.current_step = finalStep.id;
  await finalStep.execute();
}

/**
 * Example 4: Error recovery using step hopping
 */
async function exampleErrorRecovery() {
  console.log('\n=== Example 4: Error Recovery with Step Hopping ===\n');

  let attemptCount = 0;
  const maxAttempts = 3;

  const riskyOperation = new Step({
    name: 'risky-operation',
    callable: async () => {
      attemptCount++;
      console.log(`Attempt ${attemptCount}: Executing risky operation...`);
      
      if (attemptCount < 2) {
        throw new Error('Operation failed - simulated error');
      }
      
      return { success: true, attempts: attemptCount };
    }
  });

  const errorHandler = new Step({
    name: 'error-handler',
    callable: async () => {
      console.log('Handling error...');
      return { errorHandled: true };
    }
  });

  const retry = new Step({
    name: 'retry-logic',
    callable: async () => {
      console.log('Preparing retry...');
      return { retryReady: true };
    }
  });

  const success = new Step({
    name: 'success-handler',
    callable: async () => {
      console.log('Operation succeeded!');
      return { completed: true };
    }
  });

  const workflow = new Workflow({
    name: 'error-recovery',
    steps: [riskyOperation, errorHandler, retry, success]
  });

  // Store step IDs for easy reference
  const stepIndices = {
    riskyOp: 0,
    errorHandler: 1,
    retry: 2,
    success: 3
  };

  // Attempt the risky operation with retry logic
  while (attemptCount < maxAttempts) {
    try {
      console.log(`\n→ Executing risky operation (index ${stepIndices.riskyOp})`);
      workflow.current_step = workflow._steps[stepIndices.riskyOp].id;
      const result = await workflow._steps[stepIndices.riskyOp].execute();
      
      console.log('→ Success! Jumping to success handler');
      workflow.current_step = workflow._steps[stepIndices.success].id;
      await workflow._steps[stepIndices.success].execute();
      break;
      
    } catch (error) {
      console.log(`✗ Error: ${error.message}`);
      
      if (attemptCount < maxAttempts) {
        console.log('→ Jumping to error handler');
        workflow.current_step = workflow._steps[stepIndices.errorHandler].id;
        await workflow._steps[stepIndices.errorHandler].execute();
        
        console.log('→ Jumping to retry logic');
        workflow.current_step = workflow._steps[stepIndices.retry].id;
        await workflow._steps[stepIndices.retry].execute();
      } else {
        console.log('✗ Max attempts reached, giving up');
      }
    }
  }
}

// Run all examples
async function runAllExamples() {
  await exampleHopByIndex();
  await exampleHopById();
  await exampleConditionalHopping();
  await exampleErrorRecovery();
  
  console.log('\n=== All Examples Completed ===\n');
}

runAllExamples().catch(console.error);
```

## Output

```
=== Example 1: Hopping by Array Index ===

→ Jumping directly to index 2 (send-confirmation)
Step 2: Sending confirmation email...
Result: { message: 'Success', data: { emailSent: true } }

→ Jumping to index 3 (update-inventory)
Step 3: Updating inventory...

→ Executing workflow from index 1
Executing step at index 1: process-payment
Step 1: Processing payment...
Executing step at index 2: send-confirmation
Step 2: Sending confirmation email...
Executing step at index 3: update-inventory
Step 3: Updating inventory...

=== Example 2: Hopping by Step ID ===

Available step IDs:
  fetchUser: 9a7b8c6d-1e2f-3a4b-5c6d-7e8f9a0b1c2d
  checkPerms: 8b6c7d5e-2f3a-4b5c-6d7e-8f9a0b1c2d3e
  generateReport: 7c5d6e4f-3a4b-5c6d-7e8f-9a0b1c2d3e4f
  sendNotif: 6d4e5f3a-4b5c-6d7e-8f9a-0b1c2d3e4f5a

→ Jumping directly to "generate-report" step using ID
Generating report...
Result: { message: 'Success', data: { reportId: 'RPT-789' } }

→ Jumping to "send-notification" step using ID
Sending notification...

=== Example 3: Conditional Step Hopping ===

→ Executing initial check...
Checking user status...
User status: { message: 'Success', data: { isPremium: false, needsVerification: true } }

→ User is basic, jumping to index 1 (basic-processing)
Running basic processing...

→ Verification needed, jumping by ID
Running verification...

→ Jumping to final step
Finalizing...

=== Example 4: Error Recovery with Step Hopping ===

→ Executing risky operation (index 0)
Attempt 1: Executing risky operation...
✗ Error: Operation failed - simulated error
→ Jumping to error handler
Handling error...
→ Jumping to retry logic
Preparing retry...

→ Executing risky operation (index 0)
Attempt 2: Executing risky operation...
→ Success! Jumping to success handler
Operation succeeded!

=== All Examples Completed ===
```

## Key Points

### Method 1: Array Index (`workflow._steps[index]`)
```javascript
const step = workflow._steps[2];  // Get step at index 2
workflow.current_step = step.id;   // Set as current
await step.execute();              // Execute
```

**Best for:**
- Sequential workflows
- Numeric position-based logic
- Simple iteration patterns

### Method 2: Step ID (`workflow.steps_by_id[stepId]`)
```javascript
const step = workflow.steps_by_id[savedStepId];  // Get step by ID
workflow.current_step = step.id;                 // Set as current
await step.execute();                            // Execute
```

**Best for:**
- Persistent references
- Dynamic workflows (steps added/removed)
- Save/resume functionality
- Distributed systems

## Use Cases

### Backend Applications
- **Order Processing:** Skip payment for free orders
- **Data Pipelines:** Resume from last successful step
- **API Orchestration:** Retry specific failed operations
- **Batch Jobs:** Checkpoint and resume processing
- **State Machines:** Navigate to states based on events
- **Error Recovery:** Jump to error handling steps
- **A/B Testing:** Route to different processing logic

### Advantages
- **Flexibility:** Navigate non-linearly through workflows
- **Resilience:** Implement retry and error recovery logic
- **Efficiency:** Skip unnecessary steps based on conditions
- **Maintainability:** Clear, explicit navigation logic

## Best Practices

1. **Always validate** before hopping:
   ```javascript
   if (index >= 0 && index < workflow._steps.length) {
     // Safe to hop
   }
   ```

2. **Store step IDs** for important steps:
   ```javascript
   const criticalSteps = {
     validation: step1.id,
     payment: step2.id
   };
   ```

3. **Update current_step** to maintain workflow state:
   ```javascript
   workflow.current_step = targetStep.id;
   ```

4. **Handle errors** when hopping to risky steps:
   ```javascript
   try {
     await workflow.steps_by_id[stepId].execute();
   } catch (error) {
     // Handle error
   }
   ```

## Related Examples

- [Basic Workflow](basic-workflow-node.md)
- [Data Pipeline](data-pipeline-node.md)
- [API Integration](api-integration-node.md)
- [Step Hopping React](step-hopping-react.md)
