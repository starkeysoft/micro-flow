# Step Hopping - React

Dynamic workflow navigation using step indices and step IDs in a React application.

## Overview

This example demonstrates "step hopping" - the ability to navigate to specific steps in a workflow by either their array index or their unique ID. This is useful for implementing features like "skip to step", "go back to step", or conditional navigation in multi-step processes.

## Code

```javascript
import React, { useState, useRef } from 'react';
import { Workflow, Step, ConditionalStep } from 'micro-flow';

function StepHoppingDemo() {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [executionLog, setExecutionLog] = useState([]);
  const [stepResults, setStepResults] = useState({});
  const workflowRef = useRef(null);

  // Initialize workflow with identifiable steps
  const initializeWorkflow = () => {
    const step1 = new Step({
      name: 'user-info',
      callable: async () => {
        addLog('Collecting user information...');
        return { step: 'user-info', data: { collected: true } };
      }
    });

    const step2 = new Step({
      name: 'preferences',
      callable: async () => {
        addLog('Setting preferences...');
        return { step: 'preferences', data: { set: true } };
      }
    });

    const step3 = new Step({
      name: 'review',
      callable: async () => {
        addLog('Reviewing data...');
        return { step: 'review', data: { reviewed: true } };
      }
    });

    const step4 = new Step({
      name: 'confirmation',
      callable: async () => {
        addLog('Confirming submission...');
        return { step: 'confirmation', data: { confirmed: true } };
      }
    });

    const workflow = new Workflow({
      name: 'step-hopping-demo',
      steps: [step1, step2, step3, step4]
    });

    workflowRef.current = workflow;
    return workflow;
  };

  // Method 1: Hop to step using array index
  const hopToStepByIndex = async (index) => {
    if (!workflowRef.current) {
      workflowRef.current = initializeWorkflow();
    }

    const workflow = workflowRef.current;

    // Validate index
    if (index < 0 || index >= workflow._steps.length) {
      addLog(`❌ Invalid index: ${index}. Valid range: 0-${workflow._steps.length - 1}`);
      return;
    }

    // Get step by index
    const step = workflow._steps[index];
    
    addLog(`🎯 Hopping to step at index ${index}: "${step.name}"`);
    
    // Set current step and execute
    workflow.current_step = step.id;
    setCurrentStepIndex(index);
    
    try {
      const result = await step.execute();
      setStepResults(prev => ({ ...prev, [step.name]: result }));
      addLog(`✅ Step "${step.name}" completed successfully`);
    } catch (error) {
      addLog(`❌ Step "${step.name}" failed: ${error.message}`);
    }
  };

  // Method 2: Hop to step using step ID
  const hopToStepById = async (stepId) => {
    if (!workflowRef.current) {
      workflowRef.current = initializeWorkflow();
    }

    const workflow = workflowRef.current;

    // Get step by ID from steps_by_id object
    const step = workflow.steps_by_id[stepId];

    if (!step) {
      addLog(`❌ Step with ID "${stepId}" not found`);
      return;
    }

    // Find the index for UI update
    const index = workflow._steps.findIndex(s => s.id === stepId);
    
    addLog(`🎯 Hopping to step with ID "${stepId}": "${step.name}"`);
    
    // Set current step and execute
    workflow.current_step = stepId;
    setCurrentStepIndex(index);
    
    try {
      const result = await step.execute();
      setStepResults(prev => ({ ...prev, [step.name]: result }));
      addLog(`✅ Step "${step.name}" completed successfully`);
    } catch (error) {
      addLog(`❌ Step "${step.name}" failed: ${error.message}`);
    }
  };

  // Helper function to add to execution log
  const addLog = (message) => {
    setExecutionLog(prev => [...prev, `[${new Date().toLocaleTimeString()}] ${message}`]);
  };

  // Get all step IDs for the ID selector
  const getStepIds = () => {
    if (!workflowRef.current) return [];
    return workflowRef.current._steps.map(step => ({ id: step.id, name: step.name }));
  };

  // Initialize workflow on mount
  React.useEffect(() => {
    initializeWorkflow();
  }, []);

  return (
    <div style={{ padding: '20px', fontFamily: 'Arial, sans-serif' }}>
      <h1>Step Hopping Demo</h1>
      
      <div style={{ marginBottom: '20px' }}>
        <h2>Method 1: Hop by Array Index</h2>
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          {[0, 1, 2, 3].map(index => (
            <button
              key={index}
              onClick={() => hopToStepByIndex(index)}
              style={{
                padding: '10px 20px',
                backgroundColor: currentStepIndex === index ? '#4CAF50' : '#008CBA',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer'
              }}
            >
              Jump to Index {index}
            </button>
          ))}
        </div>
      </div>

      <div style={{ marginBottom: '20px' }}>
        <h2>Method 2: Hop by Step ID</h2>
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          {getStepIds().map(({ id, name }) => (
            <button
              key={id}
              onClick={() => hopToStepById(id)}
              style={{
                padding: '10px 20px',
                backgroundColor: '#FF9800',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer'
              }}
            >
              Jump to "{name}"
            </button>
          ))}
        </div>
      </div>

      <div style={{ marginBottom: '20px' }}>
        <h3>Current Step: {currentStepIndex}</h3>
        {workflowRef.current && workflowRef.current._steps[currentStepIndex] && (
          <p>
            <strong>Name:</strong> {workflowRef.current._steps[currentStepIndex].name}<br />
            <strong>ID:</strong> {workflowRef.current._steps[currentStepIndex].id}
          </p>
        )}
      </div>

      <div style={{ marginBottom: '20px' }}>
        <h3>Step Results:</h3>
        <pre style={{ 
          backgroundColor: '#f5f5f5', 
          padding: '10px', 
          borderRadius: '4px',
          maxHeight: '200px',
          overflow: 'auto'
        }}>
          {JSON.stringify(stepResults, null, 2)}
        </pre>
      </div>

      <div>
        <h3>Execution Log:</h3>
        <div style={{ 
          backgroundColor: '#f5f5f5', 
          padding: '10px', 
          borderRadius: '4px',
          maxHeight: '300px',
          overflow: 'auto',
          fontFamily: 'monospace',
          fontSize: '12px'
        }}>
          {executionLog.map((log, index) => (
            <div key={index}>{log}</div>
          ))}
        </div>
      </div>

      <div style={{ marginTop: '20px', padding: '10px', backgroundColor: '#e3f2fd', borderRadius: '4px' }}>
        <h4>💡 Tips:</h4>
        <ul>
          <li><strong>By Index:</strong> Use when you know the step's position in the workflow</li>
          <li><strong>By ID:</strong> Use when you have a reference to a specific step or need guaranteed targeting</li>
          <li>Step IDs are unique and persist even if steps are reordered</li>
          <li>Array indices change if steps are added/removed before them</li>
        </ul>
      </div>
    </div>
  );
}

export default StepHoppingDemo;
```

## Output

When you interact with the component, you'll see:

```
[10:30:45] 🎯 Hopping to step at index 2: "review"
[10:30:45] Reviewing data...
[10:30:45] ✅ Step "review" completed successfully

[10:30:52] 🎯 Hopping to step with ID "a1b2c3d4": "preferences"
[10:30:52] Setting preferences...
[10:30:52] ✅ Step "preferences" completed successfully
```

## Key Points

### Method 1: Array Index (`workflow._steps[index]`)
- **Pros:**
  - Simple numeric access
  - Fast O(1) lookup
  - Intuitive for sequential navigation
- **Cons:**
  - Indices change when steps are added/removed
  - Must validate bounds

### Method 2: Step ID (`workflow.steps_by_id[stepId]`)
- **Pros:**
  - Stable reference (doesn't change)
  - Safe for dynamic workflows
  - Better for persistence (save/restore state)
- **Cons:**
  - Must track step IDs
  - Slightly more verbose

## Use Cases

- **Wizard navigation:** "Go to Step 3" or "Back to Review"
- **Conditional routing:** Skip steps based on user input
- **Error recovery:** Jump to a specific step after validation failure
- **Save/Resume:** Store step ID to resume workflow later
- **A/B testing:** Route users to different steps dynamically

## Related Examples

- [Multi-Step Form](form-workflow-react.md)
- [Basic Workflow](basic-workflow-node.md)
- [Data Fetching](data-fetching-vue.md)
