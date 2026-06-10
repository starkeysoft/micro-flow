# step_event_names

Event names emitted during the lifecycle of steps. All events are available on the `StepEvent` instance at `State.get('events.step')`.

## Table of Contents
- [Values](#values)
- [Usage](#usage)
- [Related](#related)

## Values

| Key | Value | Description |
|-----|-------|-------------|
| `STEP_PENDING` | `'step_pending'` | Emitted when a step is set to pending status. |
| `STEP_RUNNING` | `'step_running'` | Emitted when a step begins executing. |
| `STEP_COMPLETE` | `'step_complete'` | Emitted when a step finishes successfully. |
| `STEP_FAILED` | `'step_failed'` | Emitted when a step fails (all retries exhausted). |
| `STEP_RETRYING` | `'step_retrying'` | Emitted when the engine automatically retries a failed step. |
| `STEP_WAITING` | `'step_waiting'` | Emitted when a step enters a waiting state (e.g., `DelayStep`). |
| `CONDITIONAL_TRUE_BRANCH_EXECUTED` | `'conditional_true_branch_executed'` | Emitted when a `ConditionalStep` executes the true branch. |
| `CONDITIONAL_FALSE_BRANCH_EXECUTED` | `'conditional_false_branch_executed'` | Emitted when a `ConditionalStep` executes the false branch. |
| `LOOP_ITERATION_COMPLETE` | `'loop_iteration_complete'` | Emitted after each `LoopStep` iteration. |
| `SWITCH_CASE_MATCHED` | `'switch_case_matched'` | Emitted when a `SwitchStep` case matches. |
| `DELAY_STEP_RELATIVE_SCHEDULED` | `'delay_step_relative_scheduled'` | Emitted when a relative `DelayStep` schedules its job. |
| `DELAY_STEP_RELATIVE_COMPLETE` | `'delay_step_relative_complete'` | Emitted when a relative `DelayStep` delay completes. |
| `DELAY_STEP_ABSOLUTE_SCHEDULED` | `'delay_step_absolute_scheduled'` | Emitted when an absolute `DelayStep` schedules its job. |
| `DELAY_STEP_ABSOLUTE_COMPLETE` | `'delay_step_absolute_complete'` | Emitted when an absolute `DelayStep` delay completes. |

## Usage

```javascript
import { Workflow, Step, State, step_event_names } from '@ronaldroe/micro-flow';

const stepEvents = State.get('events.step');

stepEvents.on(step_event_names.STEP_RUNNING, (data) => {
  console.log(`▶ Running: ${data.name}`);
});

stepEvents.on(step_event_names.STEP_COMPLETE, (data) => {
  console.log(`✓ Done: ${data.name} in ${data.timing.execution_time_ms}ms`);
});

stepEvents.on(step_event_names.STEP_FAILED, (data) => {
  console.error(`✗ Failed: ${data.name}`, data.errors?.[0]?.message);
});

stepEvents.on(step_event_names.STEP_RETRYING, (data) => {
  console.warn(`↺ Retrying: ${data.name} (attempt ${data.retry_count}/${data.max_retries})`);
});

stepEvents.on(step_event_names.LOOP_ITERATION_COMPLETE, (data) => {
  console.log(`Loop iteration done in: ${data.name}`);
});

stepEvents.on(step_event_names.SWITCH_CASE_MATCHED, (data) => {
  console.log(`Switch matched case in: ${data.name}`);
});
```

## Related

- [StepEvent](../classes/events/step_event.md) — Registers and emits these events.
- [Step](../classes/steps/step.md) — Emits `STEP_RUNNING`, `STEP_COMPLETE`, `STEP_FAILED`, `STEP_RETRYING`.
- [ConditionalStep](../classes/steps/conditional_step.md) — Emits branch events.
- [LoopStep](../classes/steps/loop_step.md) — Emits `LOOP_ITERATION_COMPLETE`.
- [SwitchStep](../classes/steps/switch_step.md) — Emits `SWITCH_CASE_MATCHED`.
- [DelayStep](../classes/steps/delay_step.md) — Emits delay-specific events.
