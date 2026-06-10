# Step Hopping — React

Demonstrates dynamic workflow manipulation inside a React component: adding steps at runtime, deleting steps by ID, reordering with `moveStep`, and pausing / resuming — all driven by user interaction.

## Overview

You will learn:
- Managing a `Workflow` instance in a React ref (`useRef`) across renders
- Adding steps with `addStep()`, `addStepAtIndex()`, `unshiftStep()`
- Removing steps with `deleteStep()`, `popStep()`
- Reordering steps with `moveStep(fromIndex, toIndex)`
- Pausing and resuming execution via `pause()` / `resume()`
- Displaying live step order and execution results with React state
- Listening to `WORKFLOW_STEP_ADDED`, `WORKFLOW_STEP_REMOVED`, `WORKFLOW_STEP_MOVED` events

## Complete Example

```jsx
// WorkflowBuilder.jsx
import { useState, useEffect, useRef, useCallback } from 'react';
import {
  Workflow,
  Step,
  DelayStep,
  ConditionalStep,
  State,
  delay_types,
  workflow_event_names,
  step_event_names,
} from '@ronaldroe/micro-flow';

// ─── Step factory ─────────────────────────────────────────────────────────────

let stepCounter = 0;

function makeStep(type) {
  stepCounter++;
  const id = stepCounter;

  switch (type) {
    case 'action':
      return new Step({
        name: `action-${id}`,
        callable: async function () {
          await new Promise((r) => setTimeout(r, 100 + Math.random() * 200));
          const count = (this.getState('pipeline.actionCount') ?? 0) + 1;
          this.setState('pipeline.actionCount', count);
          return { type: 'action', id, count };
        },
      });

    case 'delay':
      return new DelayStep({
        name: `delay-${id}`,
        delay_type: delay_types.RELATIVE,
        relative_delay_ms: 500,
      });

    case 'conditional':
      return new ConditionalStep({
        name: `conditional-${id}`,
        conditional: {
          subject: () => (State.get('pipeline.actionCount') ?? 0) % 2 === 0,
          operator: '===',
          value: true,
        },
        true_callable: async () => ({ branch: 'even', id }),
        false_callable: async () => ({ branch: 'odd', id }),
      });

    default:
      return new Step({
        name: `step-${id}`,
        callable: async () => ({ id }),
      });
  }
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function WorkflowBuilder() {
  const workflowRef  = useRef(null);
  const runningRef   = useRef(false);

  const [stepList,    setStepList]    = useState([]);     // [{id, name}]
  const [results,     setResults]     = useState([]);
  const [status,      setStatus]      = useState('idle');
  const [currentStep, setCurrentStep] = useState(null);
  const [logs,        setLogs]        = useState([]);

  // ── Helpers ─────────────────────────────────────────────────────────────────

  function log(message) {
    setLogs((prev) => [...prev.slice(-49), `[${new Date().toLocaleTimeString()}] ${message}`]);
  }

  function syncStepList() {
    const wf = workflowRef.current;
    if (!wf) return;
    setStepList(wf.steps.map((s) => ({ id: s.id, name: s.name, type: s.constructor.name })));
  }

  function getOrCreateWorkflow() {
    if (!workflowRef.current) {
      workflowRef.current = new Workflow({ name: 'builder-flow', exit_on_error: false });
    }
    return workflowRef.current;
  }

  // ── Event wiring ─────────────────────────────────────────────────────────────

  useEffect(() => {
    const wfEvents   = State.get('events.workflow');
    const stepEvents = State.get('events.step');

    const onRunning = (data) => {
      setStatus('running');
      setResults([]);
      log(`Workflow "${data.name}" started`);
    };

    const onComplete = (data) => {
      setStatus('complete');
      runningRef.current = false;
      setCurrentStep(null);
      setResults(data.results ?? []);
      log(`Workflow complete (${data.timing?.execution_time_ms}ms)`);
    };

    const onFailed = (data) => {
      setStatus('failed');
      runningRef.current = false;
      setCurrentStep(null);
      log(`Workflow failed`);
    };

    const onPaused = (data) => {
      setStatus('paused');
      log(`Paused after step: ${data.current_step}`);
    };

    const onResumed = () => {
      setStatus('running');
      log('Resumed');
    };

    const onStepRunning = (data) => {
      setCurrentStep(data.id);
      log(`  ▶ ${data.name}`);
    };

    const onStepComplete = (data) => {
      setCurrentStep(null);
      log(`  ✓ ${data.name} (${data.timing?.execution_time_ms}ms)`);
    };

    const onStepFailed = (data) => {
      log(`  ✗ ${data.name}: ${data.errors?.[0]?.message}`);
    };

    const onStepAdded = () => {
      syncStepList();
      log(`Step added`);
    };

    const onStepRemoved = () => {
      syncStepList();
      log(`Step removed`);
    };

    const onStepMoved = () => {
      syncStepList();
      log(`Step moved`);
    };

    wfEvents.on(workflow_event_names.WORKFLOW_RUNNING,      onRunning);
    wfEvents.on(workflow_event_names.WORKFLOW_COMPLETE,     onComplete);
    wfEvents.on(workflow_event_names.WORKFLOW_FAILED,       onFailed);
    wfEvents.on(workflow_event_names.WORKFLOW_PAUSED,       onPaused);
    wfEvents.on(workflow_event_names.WORKFLOW_RESUMED,      onResumed);
    wfEvents.on(workflow_event_names.WORKFLOW_STEP_ADDED,   onStepAdded);
    wfEvents.on(workflow_event_names.WORKFLOW_STEP_REMOVED, onStepRemoved);
    wfEvents.on(workflow_event_names.WORKFLOW_STEP_MOVED,   onStepMoved);
    stepEvents.on(step_event_names.STEP_RUNNING,  onStepRunning);
    stepEvents.on(step_event_names.STEP_COMPLETE, onStepComplete);
    stepEvents.on(step_event_names.STEP_FAILED,   onStepFailed);

    return () => {
      wfEvents.off(workflow_event_names.WORKFLOW_RUNNING,      onRunning);
      wfEvents.off(workflow_event_names.WORKFLOW_COMPLETE,     onComplete);
      wfEvents.off(workflow_event_names.WORKFLOW_FAILED,       onFailed);
      wfEvents.off(workflow_event_names.WORKFLOW_PAUSED,       onPaused);
      wfEvents.off(workflow_event_names.WORKFLOW_RESUMED,      onResumed);
      wfEvents.off(workflow_event_names.WORKFLOW_STEP_ADDED,   onStepAdded);
      wfEvents.off(workflow_event_names.WORKFLOW_STEP_REMOVED, onStepRemoved);
      wfEvents.off(workflow_event_names.WORKFLOW_STEP_MOVED,   onStepMoved);
      stepEvents.off(step_event_names.STEP_RUNNING,  onStepRunning);
      stepEvents.off(step_event_names.STEP_COMPLETE, onStepComplete);
      stepEvents.off(step_event_names.STEP_FAILED,   onStepFailed);
    };
  }, []);

  // ── Manipulation handlers ─────────────────────────────────────────────────

  const handleAddStep = useCallback((type) => {
    const wf   = getOrCreateWorkflow();
    const step = makeStep(type);
    wf.addStep(step);
  }, []);

  const handlePrependStep = useCallback((type) => {
    const wf   = getOrCreateWorkflow();
    const step = makeStep(type);
    wf.unshiftStep(step);
  }, []);

  const handleInsertMiddle = useCallback((type) => {
    const wf    = getOrCreateWorkflow();
    const step  = makeStep(type);
    const mid   = Math.floor(wf.steps.length / 2);
    wf.addStepAtIndex(step, mid);
  }, []);

  const handleRemoveStep = useCallback((stepId) => {
    const wf = workflowRef.current;
    if (!wf) return;
    wf.deleteStep(stepId);
  }, []);

  const handlePopStep = useCallback(() => {
    const wf = workflowRef.current;
    if (!wf || wf.isEmpty()) return;
    const popped = wf.popStep();
    log(`Popped step: ${popped.name}`);
  }, []);

  const handleMoveUp = useCallback((stepId) => {
    const wf  = workflowRef.current;
    if (!wf) return;
    const idx = wf.steps.findIndex((s) => s.id === stepId);
    if (idx > 0) wf.moveStep(idx, idx - 1);
  }, []);

  const handleMoveDown = useCallback((stepId) => {
    const wf  = workflowRef.current;
    if (!wf) return;
    const idx = wf.steps.findIndex((s) => s.id === stepId);
    if (idx < wf.steps.length - 1) wf.moveStep(idx, idx + 1);
  }, []);

  const handleClearSteps = useCallback(() => {
    const wf = workflowRef.current;
    if (!wf) return;
    wf.clearSteps();
    log('All steps cleared');
    syncStepList();
  }, []);

  const handleRun = useCallback(async () => {
    if (runningRef.current) return;

    const wf = getOrCreateWorkflow();
    if (wf.isEmpty()) {
      log('No steps to run');
      return;
    }

    runningRef.current = true;
    State.reset();
    await wf.execute();
  }, []);

  const handlePause = useCallback(() => {
    workflowRef.current?.pause();
  }, []);

  const handleResume = useCallback(async () => {
    const wf = workflowRef.current;
    if (!wf) return;
    await wf.resume();
  }, []);

  const handleReset = useCallback(() => {
    workflowRef.current = new Workflow({ name: 'builder-flow', exit_on_error: false });
    runningRef.current  = false;
    setStepList([]);
    setResults([]);
    setStatus('idle');
    setCurrentStep(null);
    setLogs([]);
    State.reset();
    log('Reset complete');
  }, []);

  // ── Render ──────────────────────────────────────────────────────────────────

  const isRunning = status === 'running';
  const isPaused  = status === 'paused';

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, padding: 24, fontFamily: 'system-ui', maxWidth: 1200 }}>

      {/* Left: Controls + Step List */}
      <div>
        <h2>Workflow Builder</h2>
        <p style={{ color: '#6b7280' }}>Status: <strong>{status}</strong></p>

        {/* Add step buttons */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
          <button onClick={() => handleAddStep('action')}      disabled={isRunning}>+ Action (end)</button>
          <button onClick={() => handlePrependStep('action')}  disabled={isRunning}>+ Action (start)</button>
          <button onClick={() => handleInsertMiddle('action')} disabled={isRunning}>+ Action (middle)</button>
          <button onClick={() => handleAddStep('delay')}       disabled={isRunning}>+ Delay</button>
          <button onClick={() => handleAddStep('conditional')} disabled={isRunning}>+ Conditional</button>
          <button onClick={handlePopStep}    disabled={isRunning || stepList.length === 0}>Pop Last</button>
          <button onClick={handleClearSteps} disabled={isRunning || stepList.length === 0}>Clear All</button>
        </div>

        {/* Execution controls */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 24 }}>
          <button onClick={handleRun}    disabled={isRunning || stepList.length === 0} style={{ background: '#6366f1', color: '#fff' }}>
            Run
          </button>
          <button onClick={handlePause}  disabled={!isRunning}>Pause</button>
          <button onClick={handleResume} disabled={!isPaused}>Resume</button>
          <button onClick={handleReset}  disabled={isRunning}>Reset</button>
        </div>

        {/* Step list */}
        <div>
          <h3>Steps ({stepList.length})</h3>
          {stepList.length === 0 ? (
            <p style={{ color: '#9ca3af' }}>No steps — add some above</p>
          ) : (
            <ol style={{ padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 8 }}>
              {stepList.map((s, i) => (
                <li
                  key={s.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    padding: '8px 12px',
                    background: s.id === currentStep ? '#ede9fe' : '#f9fafb',
                    border: '1px solid',
                    borderColor: s.id === currentStep ? '#6366f1' : '#e5e7eb',
                    borderRadius: 8,
                  }}
                >
                  <span style={{ color: '#9ca3af', width: 20 }}>{i + 1}.</span>
                  <span style={{ flex: 1, fontFamily: 'monospace', fontSize: 13 }}>{s.name}</span>
                  <span style={{ fontSize: 11, color: '#6b7280', background: '#e5e7eb', padding: '2px 6px', borderRadius: 4 }}>
                    {s.type}
                  </span>
                  <button onClick={() => handleMoveUp(s.id)}   disabled={isRunning || i === 0} style={{ padding: '2px 8px' }}>↑</button>
                  <button onClick={() => handleMoveDown(s.id)} disabled={isRunning || i === stepList.length - 1} style={{ padding: '2px 8px' }}>↓</button>
                  <button onClick={() => handleRemoveStep(s.id)} disabled={isRunning} style={{ padding: '2px 8px', color: '#ef4444' }}>✕</button>
                </li>
              ))}
            </ol>
          )}
        </div>
      </div>

      {/* Right: Logs + Results */}
      <div>
        <h2>Execution Log</h2>
        <div style={{ height: 300, overflowY: 'auto', background: '#0f0f0f', color: '#d1fae5', fontFamily: 'monospace', fontSize: 12, padding: 12, borderRadius: 8, marginBottom: 24 }}>
          {logs.length === 0
            ? <span style={{ color: '#374151' }}>No activity yet</span>
            : logs.map((l, i) => <div key={i}>{l}</div>)
          }
        </div>

        <h2>Results ({results.length})</h2>
        {results.length === 0 ? (
          <p style={{ color: '#9ca3af' }}>Run the workflow to see results</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {results.map((r, i) => (
              <div key={i} style={{ background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: 8, padding: '8px 12px', fontFamily: 'monospace', fontSize: 12 }}>
                <strong>{i + 1}. {r.message}</strong>
                <pre style={{ margin: '4px 0 0', color: '#374151' }}>{JSON.stringify(r.data, null, 2)}</pre>
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  );
}
```

## Key Concepts

### Workflow in a Ref

The `Workflow` instance is stored in `useRef` so it persists across renders without triggering re-renders. `getOrCreateWorkflow()` lazily initializes it on the first interaction.

### Syncing React State from Events

`syncStepList()` reads `wf.steps` and updates the React `stepList` state. It is called from the `WORKFLOW_STEP_ADDED`, `WORKFLOW_STEP_REMOVED`, and `WORKFLOW_STEP_MOVED` event handlers, ensuring the UI always reflects the actual workflow structure.

### Move Up / Move Down

`moveStep(fromIndex, toIndex)` takes the current index and target index. The up/down buttons compute these by finding the step's current position in `wf.steps`.

### Pause During Execution

`handlePause` calls `workflowRef.current.pause()`, which sets `should_pause = true`. After the current step completes (or delay resolves), execution suspends. The UI transitions to the `'paused'` status and enables the Resume button.

### Clean Event Listener Teardown

All listeners registered with `wfEvents.on()` and `stepEvents.on()` inside the `useEffect` are removed via `.off()` in the cleanup function. This prevents duplicate handlers across React StrictMode double-invocations and component unmounts.

## Related Examples

- [Step Hopping — Node.js](step-hopping-node.md) — Same patterns outside React
- [Form Workflow — React](form-workflow-react.md) — Multi-step form
- [Basic Workflow — Node.js](basic-workflow-node.md) — Core patterns
