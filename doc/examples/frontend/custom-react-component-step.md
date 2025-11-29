````markdown
# Custom React Component Step (React)

This example demonstrates how to extend the `Step` class to create a custom step that integrates deeply with React components, managing UI state, side effects, and component lifecycle.

## Use Case

Building a custom step that:
1. Extends `Step` with React-specific functionality
2. Manages component state and side effects
3. Coordinates async operations with UI updates
4. Provides reusable UI workflow patterns
5. Integrates with React hooks and context

## Custom Step Implementation

```jsx
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Step, Workflow, StepTypes } from 'micro-flow';

/**
 * Extended Step class that integrates with React components
 * and manages UI state throughout step execution.
 */
class ReactComponentStep extends Step {
  constructor({
    name,
    type,
    callable = async () => {},
    component = null,
    componentProps = {},
    updateInterval = 100,
    preserveState = false,
    onStateChange = null
  }) {
    super({ name, type, callable });
    
    // Add React-specific properties
    this.state.set('component', component);
    this.state.set('componentProps', componentProps);
    this.state.set('updateInterval', updateInterval);
    this.state.set('preserveState', preserveState);
    this.state.set('onStateChange', onStateChange);
    this.state.set('uiState', {});
    this.state.set('progressCallbacks', []);
    this.state.set('componentRefs', new Map());
  }
  
  /**
   * Extended execute method that manages React component updates
   */
  async execute() {
    this.markAsRunning();
    
    // Initialize UI state
    this.updateUIState({
      isExecuting: true,
      progress: 0,
      message: `Starting ${this.state.get('name')}...`,
      error: null
    });
    
    try {
      // Execute the original step
      result = await super.execute();
      
      // Update UI state for completion
      this.updateUIState({
        isExecuting: false,
        progress: 100,
        message: `${this.state.get('name')} completed`,
        error: null,
        result
      });
      
      this.events.emit(this.events.event_names.STEP_COMPLETED, { step: this, result });
      
      return this.prepareReturnData(result);
      
    } catch (error) {
      this.state.set('execution_time_ms', Date.now() - this.state.get('start_time'));
      
      // Update UI state for error
      this.updateUIState({
        isExecuting: false,
        progress: 0,
        message: `${this.state.get('name')} failed`,
        error: error.message
      });
      
      this.markAsFailed(error);
      throw error;
    }
  }
  
  /**
   * Update UI state and trigger React component re-renders
   */
  updateUIState(updates) {
    const currentState = this.state.get('uiState');
    const newState = { ...currentState, ...updates };
    
    this.state.set('uiState', newState);
    
    // Notify all registered callbacks
    const callbacks = this.state.get('progressCallbacks');
    callbacks.forEach(callback => {
      try {
        callback(newState);
      } catch (error) {
        console.error('[ReactComponentStep] Error in progress callback:', error);
      }
    });
    
    // Custom state change handler
    const onStateChange = this.state.get('onStateChange');
    if (onStateChange) {
      onStateChange(newState, this);
    }
  }
  
  /**
   * Register a callback for UI state changes (used by React hooks)
   */
  registerProgressCallback(callback) {
    const callbacks = this.state.get('progressCallbacks');
    callbacks.push(callback);
    
    // Return unregister function
    return () => {
      const index = callbacks.indexOf(callback);
      if (index > -1) {
        callbacks.splice(index, 1);
      }
    };
  }
  
  /**
   * Update progress during long-running operations
   */
  updateProgress(progress, message) {
    this.updateUIState({
      progress: Math.min(100, Math.max(0, progress)),
      message: message || this.state.get('uiState').message
    });
  }
  
  /**
   * Set component ref for direct access
   */
  setComponentRef(key, ref) {
    const refs = this.state.get('componentRefs');
    refs.set(key, ref);
  }
  
  /**
   * Get component ref
   */
  getComponentRef(key) {
    const refs = this.state.get('componentRefs');
    return refs.get(key);
  }
  
  /**
   * Get current UI state
   */
  getUIState() {
    return this.state.get('uiState');
  }
  
  /**
   * Get component props merged with dynamic data
   */
  getComponentProps() {
    const baseProps = this.state.get('componentProps');
    const uiState = this.state.get('uiState');
    
    return {
      ...baseProps,
      step: this,
      uiState,
      updateProgress: this.updateProgress.bind(this),
      workflow: this.workflow
    };
  }
}

// React Hook for using ReactComponentStep in components
function useWorkflowStep(step) {
  const [uiState, setUIState] = useState(step?.getUIState() || {});
  const [isExecuting, setIsExecuting] = useState(false);
  
  useEffect(() => {
    if (!step) return;
    
    // Register for state updates
    const unregister = step.registerProgressCallback((newState) => {
      setUIState(newState);
      setIsExecuting(newState.isExecuting || false);
    });
    
    // Cleanup
    return () => {
      unregister();
    };
  }, [step]);
  
  const execute = useCallback(async () => {
    if (!step) return;
    
    try {
      setIsExecuting(true);
      const result = await step.execute();
      return result;
    } finally {
      setIsExecuting(false);
    }
  }, [step]);
  
  return {
    uiState,
    isExecuting,
    execute,
    step
  };
}

// Example 1: Image Upload and Processing Workflow
function ImageUploadWorkflow() {
  const [workflow, setWorkflow] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [results, setResults] = useState(null);
  const [selectedFile, setSelectedFile] = useState(null);
  
  // Create workflow
  useEffect(() => {
    const wf = new Workflow({
      name: 'Image Processing'
    });
    
    // Step 1: Validate file
    const validateStep = new ReactComponentStep({
      name: 'Validate File',
      type: StepTypes.ACTION,
      callable: async function() {
        this.updateProgress(10, 'Validating file...');
        await new Promise(resolve => setTimeout(resolve, 500));
        
        const file = this.state.get('file');
        
        if (!file) {
          throw new Error('No file selected');
        }
        
        if (!file.type.startsWith('image/')) {
          throw new Error('File must be an image');
        }
        
        if (file.size > 5 * 1024 * 1024) {
          throw new Error('File must be smaller than 5MB');
        }
        
        this.updateProgress(100, 'File validated');
        
        return { valid: true, fileName: file.name, fileSize: file.size };
      }
    });
    
    // Step 2: Upload file
    const uploadStep = new ReactComponentStep({
      name: 'Upload File',
      type: StepTypes.ACTION,
      callable: async function() {
        const file = this.state.get('file');
        
        this.updateProgress(0, 'Starting upload...');
        
        // Simulate chunked upload with progress
        for (let i = 0; i <= 100; i += 10) {
          await new Promise(resolve => setTimeout(resolve, 200));
          this.updateProgress(i, `Uploading: ${i}%`);
        }
        
        // Simulate upload completion
        const uploadUrl = `https://cdn.example.com/${Date.now()}_${file.name}`;
        this.state.set('uploadUrl', uploadUrl);
        
        this.updateProgress(100, 'Upload complete');
        
        return { uploaded: true, url: uploadUrl };
      }
    });
    
    // Step 3: Generate thumbnails
    const thumbnailStep = new ReactComponentStep({
      name: 'Generate Thumbnails',
      type: StepTypes.ACTION,
      callable: async function() {
        const sizes = [
          { name: 'small', width: 150, height: 150 },
          { name: 'medium', width: 300, height: 300 },
          { name: 'large', width: 600, height: 600 }
        ];
        
        const thumbnails = [];
        
        for (let i = 0; i < sizes.length; i++) {
          const size = sizes[i];
          const progress = ((i + 1) / sizes.length) * 100;
          
          this.updateProgress(progress, `Generating ${size.name} thumbnail...`);
          
          await new Promise(resolve => setTimeout(resolve, 400));
          
          thumbnails.push({
            size: size.name,
            url: `${this.state.get('uploadUrl')}_${size.name}`,
            width: size.width,
            height: size.height
          });
        }
        
        this.state.set('thumbnails', thumbnails);
        this.updateProgress(100, 'Thumbnails generated');
        
        return { thumbnails };
      }
    });
    
    // Step 4: Save metadata
    const saveMetadataStep = new ReactComponentStep({
      name: 'Save Metadata',
      type: StepTypes.ACTION,
      callable: async function() {
        this.updateProgress(50, 'Saving metadata...');
        
        await new Promise(resolve => setTimeout(resolve, 300));
        
        const metadata = {
          originalUrl: this.state.get('uploadUrl'),
          thumbnails: this.state.get('thumbnails'),
          uploadedAt: new Date().toISOString(),
          fileSize: this.state.get('file').size,
          fileName: this.state.get('file').name
        };
        
        this.updateProgress(100, 'Metadata saved');
        
        return { metadata, id: 'img_' + Date.now() };
      }
    });
    
    wf.pushSteps([validateStep, uploadStep, thumbnailStep, saveMetadataStep]);
    setWorkflow(wf);
  }, []);
  
  const handleFileSelect = (event) => {
    const file = event.target.files[0];
    setSelectedFile(file);
    setResults(null);
  };
  
  const handleUpload = async () => {
    if (!selectedFile || !workflow) return;
    
    workflow.state.set('file', selectedFile);
    setIsProcessing(true);
    setResults(null);
    
    try {
      const result = await workflow.execute();
      setResults(result.state.getState());
    } catch (error) {
      console.error('Upload failed:', error);
    } finally {
      setIsProcessing(false);
    }
  };
  
  return (
    <div className="image-upload-workflow">
      <h2>Image Upload & Processing</h2>
      
      <div className="upload-section">
        <input
          type="file"
          accept="image/*"
          onChange={handleFileSelect}
          disabled={isProcessing}
        />
        
        {selectedFile && (
          <div className="file-info">
            <p><strong>Selected:</strong> {selectedFile.name}</p>
            <p><strong>Size:</strong> {(selectedFile.size / 1024).toFixed(2)} KB</p>
          </div>
        )}
        
        <button
          onClick={handleUpload}
          disabled={!selectedFile || isProcessing}
          className="upload-button"
        >
          {isProcessing ? 'Processing...' : 'Upload & Process'}
        </button>
      </div>
      
      {workflow && isProcessing && (
        <WorkflowStepVisualizer workflow={workflow} />
      )}
      
      {results && (
        <ResultsDisplay results={results} />
      )}
    </div>
  );
}

// Component to visualize workflow steps in real-time
function WorkflowStepVisualizer({ workflow }) {
  const steps = workflow.state.get('steps');
  
  return (
    <div className="workflow-visualizer">
      <h3>Processing Steps</h3>
      {steps.map((step, index) => (
        <StepProgress key={index} step={step} />
      ))}
    </div>
  );
}

// Individual step progress component
function StepProgress({ step }) {
  const { uiState, isExecuting } = useWorkflowStep(step);
  const { progress = 0, message = '', error = null } = uiState;
  
  const getStatusClass = () => {
    if (error) return 'error';
    if (isExecuting) return 'executing';
    if (progress === 100) return 'complete';
    return 'waiting';
  };
  
  return (
    <div className={`step-progress ${getStatusClass()}`}>
      <div className="step-header">
        <span className="step-name">{step.state.get('name')}</span>
        <span className="step-status">
          {error ? '✗' : progress === 100 ? '✓' : isExecuting ? '⟳' : '○'}
        </span>
      </div>
      
      {isExecuting && (
        <>
          <div className="progress-bar">
            <div 
              className="progress-fill" 
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="progress-message">{message}</p>
        </>
      )}
      
      {error && (
        <p className="error-message">{error}</p>
      )}
      
      {progress === 100 && !error && (
        <p className="success-message">{message}</p>
      )}
    </div>
  );
}

// Results display component
function ResultsDisplay({ results }) {
  const thumbnails = results.thumbnails || [];
  const metadata = results.metadata || {};
  
  return (
    <div className="results-display">
      <h3>Upload Successful! ✓</h3>
      
      <div className="metadata">
        <p><strong>Image ID:</strong> {metadata.id}</p>
        <p><strong>Original URL:</strong> <a href={results.uploadUrl} target="_blank" rel="noopener noreferrer">View</a></p>
        <p><strong>Uploaded:</strong> {new Date(metadata.uploadedAt).toLocaleString()}</p>
        <p><strong>Processing Time:</strong> {results.execution_time_ms}ms</p>
      </div>
      
      <div className="thumbnails">
        <h4>Generated Thumbnails</h4>
        <div className="thumbnail-grid">
          {thumbnails.map((thumb, index) => (
            <div key={index} className="thumbnail-item">
              <div className="thumbnail-placeholder">
                {thumb.width} × {thumb.height}
              </div>
              <p>{thumb.size}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// Example 2: Multi-Step Data Fetching with React
function DataFetchingWorkflow() {
  const [workflow, setWorkflow] = useState(null);
  const [data, setData] = useState(null);
  
  useEffect(() => {
    const wf = new Workflow({ name: 'Data Fetching' });
    
    // Step 1: Fetch users
    const fetchUsers = new ReactComponentStep({
      name: 'Fetch Users',
      type: StepTypes.ACTION,
      callable: async function() {
        this.updateProgress(25, 'Fetching users...');
        await new Promise(resolve => setTimeout(resolve, 500));
        
        const users = [
          { id: 1, name: 'Alice', role: 'admin' },
          { id: 2, name: 'Bob', role: 'user' },
          { id: 3, name: 'Charlie', role: 'user' }
        ];
        
        this.state.set('users', users);
        this.updateProgress(100, `Fetched ${users.length} users`);
        
        return { users, count: users.length };
      }
    });
    
    // Step 2: Fetch posts for each user
    const fetchPosts = new ReactComponentStep({
      name: 'Fetch Posts',
      type: StepTypes.ACTION,
      callable: async function() {
        const users = this.state.get('users');
        const allPosts = [];
        
        for (let i = 0; i < users.length; i++) {
          const progress = ((i + 1) / users.length) * 100;
          this.updateProgress(progress, `Fetching posts for ${users[i].name}...`);
          
          await new Promise(resolve => setTimeout(resolve, 300));
          
          const posts = [
            { userId: users[i].id, title: `Post 1 by ${users[i].name}` },
            { userId: users[i].id, title: `Post 2 by ${users[i].name}` }
          ];
          
          allPosts.push(...posts);
        }
        
        this.state.set('posts', allPosts);
        this.updateProgress(100, `Fetched ${allPosts.length} total posts`);
        
        return { posts: allPosts, count: allPosts.length };
      }
    });
    
    // Step 3: Aggregate data
    const aggregateData = new ReactComponentStep({
      name: 'Aggregate Data',
      type: StepTypes.ACTION,
      callable: async function() {
        this.updateProgress(50, 'Aggregating data...');
        await new Promise(resolve => setTimeout(resolve, 200));
        
        const users = this.state.get('users');
        const posts = this.state.get('posts');
        
        const aggregated = users.map(user => ({
          ...user,
          posts: posts.filter(p => p.userId === user.id)
        }));
        
        this.updateProgress(100, 'Data aggregated');
        
        return { data: aggregated };
      }
    });
    
    wf.pushSteps([fetchUsers, fetchPosts, aggregateData]);
    setWorkflow(wf);
  }, []);
  
  const handleFetch = async () => {
    if (!workflow) return;
    
    try {
      const result = await workflow.execute();
      setData(result.result.data);
    } catch (error) {
      console.error('Fetch failed:', error);
    }
  };
  
  return (
    <div className="data-fetching-workflow">
      <h2>Data Fetching Workflow</h2>
      <button onClick={handleFetch}>Fetch Data</button>
      
      {workflow && (
        <WorkflowStepVisualizer workflow={workflow} />
      )}
      
      {data && (
        <div className="data-display">
          <h3>Fetched Data</h3>
          {data.map(user => (
            <div key={user.id} className="user-card">
              <h4>{user.name} ({user.role})</h4>
              <p>{user.posts.length} posts</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// CSS Styles
const styles = `
.image-upload-workflow,
.data-fetching-workflow {
  max-width: 800px;
  margin: 0 auto;
  padding: 20px;
}

.upload-section {
  margin: 20px 0;
  padding: 20px;
  border: 2px dashed #ddd;
  border-radius: 8px;
  text-align: center;
}

.file-info {
  margin: 15px 0;
  padding: 10px;
  background: #f5f5f5;
  border-radius: 4px;
}

.upload-button {
  padding: 12px 24px;
  background: #2196f3;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 16px;
}

.upload-button:disabled {
  background: #ccc;
  cursor: not-allowed;
}

.workflow-visualizer {
  margin: 30px 0;
  padding: 20px;
  background: #fafafa;
  border-radius: 8px;
}

.step-progress {
  margin: 15px 0;
  padding: 15px;
  border-radius: 6px;
  background: white;
  border-left: 4px solid #ccc;
}

.step-progress.executing {
  border-left-color: #2196f3;
  animation: pulse 2s infinite;
}

.step-progress.complete {
  border-left-color: #4caf50;
}

.step-progress.error {
  border-left-color: #f44336;
}

.step-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10px;
}

.step-name {
  font-weight: 600;
}

.step-status {
  font-size: 20px;
}

.progress-bar {
  height: 8px;
  background: #e0e0e0;
  border-radius: 4px;
  overflow: hidden;
  margin: 10px 0;
}

.progress-fill {
  height: 100%;
  background: #2196f3;
  transition: width 0.3s ease;
}

.progress-message {
  font-size: 14px;
  color: #666;
  margin: 5px 0;
}

.success-message {
  color: #4caf50;
  font-size: 14px;
}

.error-message {
  color: #f44336;
  font-size: 14px;
}

.results-display {
  margin: 30px 0;
  padding: 20px;
  background: #e8f5e9;
  border-radius: 8px;
}

.metadata {
  margin: 15px 0;
}

.metadata p {
  margin: 8px 0;
}

.thumbnails {
  margin-top: 20px;
}

.thumbnail-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 15px;
  margin-top: 10px;
}

.thumbnail-item {
  text-align: center;
}

.thumbnail-placeholder {
  background: #fff;
  border: 2px solid #ddd;
  border-radius: 4px;
  padding: 40px 20px;
  font-size: 12px;
  color: #999;
}

.data-display {
  margin-top: 20px;
}

.user-card {
  padding: 15px;
  margin: 10px 0;
  background: white;
  border-radius: 6px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.7; }
}
`;

// Export components
export {
  ReactComponentStep,
  useWorkflowStep,
  ImageUploadWorkflow,
  DataFetchingWorkflow,
  WorkflowStepVisualizer,
  StepProgress
};

export default ImageUploadWorkflow;
```

## Key Features Demonstrated

1. **Extended Step Class** - Custom class with React integration
2. **React Hook Integration** - `useWorkflowStep` hook for component state
3. **Real-Time UI Updates** - Progress updates during step execution
4. **Component Lifecycle** - Proper cleanup and subscription management
5. **Progress Tracking** - Visual feedback for long-running operations
6. **Error Handling** - UI updates for errors and failures
7. **State Synchronization** - Workflow state syncs with React state
8. **Reusable Components** - Generic visualizer components

## Usage in React App

```jsx
import { ImageUploadWorkflow } from './components/ImageUploadWorkflow';

function App() {
  return (
    <div className="App">
      <ImageUploadWorkflow />
    </div>
  );
}

export default App;
```

## Advanced Patterns

### Custom Hook for Workflow

```jsx
function useCustomWorkflow() {
  const [workflow, setWorkflow] = useState(null);
  const [isRunning, setIsRunning] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  
  const execute = useCallback(async (input) => {
    if (!workflow) return;
    
    setIsRunning(true);
    setError(null);
    
    try {
      const res = await workflow.execute();
      setResult(res);
      return res;
    } catch (err) {
      setError(err);
      throw err;
    } finally {
      setIsRunning(false);
    }
  }, [workflow]);
  
  return { workflow, setWorkflow, execute, isRunning, result, error };
}
```

### Integration with React Context

```jsx
const WorkflowContext = React.createContext(null);

function WorkflowProvider({ children }) {
  const [workflows, setWorkflows] = useState(new Map());
  
  const registerWorkflow = (name, workflow) => {
    setWorkflows(prev => new Map(prev).set(name, workflow));
  };
  
  const executeWorkflow = async (name) => {
    const workflow = workflows.get(name);
    if (workflow) {
      return await workflow.execute();
    }
  };
  
  return (
    <WorkflowContext.Provider value={{ workflows, registerWorkflow, executeWorkflow }}>
      {children}
    </WorkflowContext.Provider>
  );
}
```

## Use Cases

- **File Upload** - Multi-step upload with progress tracking
- **Data Fetching** - Coordinated API calls with loading states
- **Form Wizards** - Multi-step forms with validation
- **Checkout Flows** - E-commerce checkout with visual feedback
- **Onboarding** - User onboarding with progress visualization
- **Batch Processing** - Process multiple items with progress updates

## See Also

- [Step API](../../api/classes/step.md)
- [React Integration Guide](../frontend/react-integration.md)
- [State Management](../../core-concepts/state-management.md)
- [Events](../../core-concepts/events.md)
- [Form Wizard Example](./wizard-react.md)

````
