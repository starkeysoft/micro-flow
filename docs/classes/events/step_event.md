# StepEvent

Manages step-specific events by extending the base Event class.

Extends: [Event](event.md)

## Constructor

### `new StepEvent()`

Creates a new StepEvent instance and registers all step events.

**Example (Node.js):**
```javascript
import { StepEvent } from 'micro-flow';

const stepEvents = new StepEvent();

stepEvents.on('step_complete', (data) => {
  console.log('Step completed:', data);
});
```

## Properties

- `event_names` (Object) - Step event name constants

All properties inherited from [Event](event.md)

## Methods

### `registerStepEvents()`

Registers all step event names defined in the step_event_names enum.

## Available Events

The StepEvent class automatically registers the following events:

- `conditional_false_branch_executed` - False branch of conditional step executed
- `conditional_true_branch_executed` - True branch of conditional step executed
- `delay_step_absolute_complete` - Absolute delay step completed
- `delay_step_relative_complete` - Relative delay step completed
- `loop_iteration_complete` - Loop iteration completed
- `step_complete` - Step completed successfully
- `step_failed` - Step execution failed
- `step_running` - Step started executing
- `step_pending` - Step is pending
- `step_waiting` - Step is waiting
- `step_retrying` - Step is retrying after failure

## Common Usage Patterns

### Step Execution Logger (Node.js)

```javascript
import { Workflow, Step, State } from 'micro-flow';

const stepEvents = State.get('events.step');

// Log all step events
stepEvents.on('step_running', (data) => {
  console.log(`▶ Starting: ${data.name}`);
});

stepEvents.on('step_complete', (data) => {
  console.log(`✓ Completed: ${data.name} (${data.timing.execution_time_ms}ms)`);
});

stepEvents.on('step_failed', (data) => {
  console.error(`✗ Failed: ${data.name}`);
  console.error('Errors:', data.errors);
});

const workflow = new Workflow({
  name: 'logged-workflow',
  steps: [
    new Step({ name: 'step-1', callable: async () => 'done' }),
    new Step({ name: 'step-2', callable: async () => 'done' }),
    new Step({ name: 'step-3', callable: async () => 'done' })
  ]
});

await workflow.execute();
```

### React Step Progress

```javascript
import { State } from './micro-flow.js';
import { useState, useEffect } from 'react';

function StepProgress({ workflow }) {
  const [steps, setSteps] = useState([]);
  const [currentStep, setCurrentStep] = useState(null);

  useEffect(() => {
    const stepEvents = State.get('events.step');

    const onRunning = (data) => {
      setCurrentStep(data.name);
      setSteps(prev => [...prev, {
        name: data.name,
        status: 'running',
        startTime: Date.now()
      }]);
    };

    const onComplete = (data) => {
      setSteps(prev => prev.map(step =>
        step.name === data.name
          ? { ...step, status: 'complete', duration: data.timing.execution_time_ms }
          : step
      ));
    };

    const onFailed = (data) => {
      setSteps(prev => prev.map(step =>
        step.name === data.name
          ? { ...step, status: 'failed', errors: data.errors }
          : step
      ));
    };

    stepEvents.on('step_running', onRunning);
    stepEvents.on('step_complete', onComplete);
    stepEvents.on('step_failed', onFailed);

    return () => {
      stepEvents.off('step_running', onRunning);
      stepEvents.off('step_complete', onComplete);
      stepEvents.off('step_failed', onFailed);
    };
  }, []);

  return (
    <div>
      <h3>Current Step: {currentStep || 'None'}</h3>
      <ul>
        {steps.map((step, idx) => (
          <li key={idx} className={step.status}>
            {step.name} - {step.status}
            {step.duration && ` (${step.duration}ms)`}
          </li>
        ))}
      </ul>
    </div>
  );
}
```

### Vue Conditional Branch Tracker

```vue
<template>
  <div>
    <h3>Conditional Branches</h3>
    <ul>
      <li v-for="branch in branches" :key="branch.id">
        <span :class="branch.type">{{ branch.stepName }}</span>
        - {{ branch.type === 'true' ? 'True' : 'False' }} branch executed
      </li>
    </ul>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { State } from './micro-flow.js';

const branches = ref([]);

onMounted(() => {
  const stepEvents = State.get('events.step');

  stepEvents.on('conditional_true_branch_executed', (data) => {
    branches.value.push({
      id: Date.now(),
      stepName: data.name,
      type: 'true'
    });
  });

  stepEvents.on('conditional_false_branch_executed', (data) => {
    branches.value.push({
      id: Date.now(),
      stepName: data.name,
      type: 'false'
    });
  });
});
</script>

<style scoped>
.true { color: green; }
.false { color: orange; }
</style>
```

### Performance Metrics Collector (Node.js)

```javascript
import { State } from 'micro-flow';
import fs from 'fs/promises';

class PerformanceCollector {
  constructor() {
    this.metrics = {
      steps: {},
      totalTime: 0,
      failures: 0
    };
    this.setupListeners();
  }

  setupListeners() {
    const stepEvents = State.get('events.step');

    stepEvents.on('step_complete', (data) => {
      if (!this.metrics.steps[data.name]) {
        this.metrics.steps[data.name] = {
          count: 0,
          totalTime: 0,
          avgTime: 0
        };
      }

      const stepMetric = this.metrics.steps[data.name];
      stepMetric.count++;
      stepMetric.totalTime += data.timing.execution_time_ms;
      stepMetric.avgTime = stepMetric.totalTime / stepMetric.count;
    });

    stepEvents.on('step_failed', (data) => {
      this.metrics.failures++;
    });
  }

  async saveReport(filename) {
    await fs.writeFile(
      filename,
      JSON.stringify(this.metrics, null, 2)
    );
  }

  getMetrics() {
    return this.metrics;
  }
}

const collector = new PerformanceCollector();

// After workflows execute
setTimeout(async () => {
  await collector.saveReport('./performance-report.json');
  console.log('Performance metrics:', collector.getMetrics());
}, 5000);
```

## See Also

- [Event](event.md) - Parent class
- [WorkflowEvent](workflow_event.md) - Workflow-specific events
- [Step Event Names](../../enums/step_event_names.md) - Event name constants
- [Step](../steps/step.md) - Emits these events
