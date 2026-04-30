# Micro-Flow Documentation

Master micro-flow, the lightweight logic orchestration engine for Node.js and modern browser environments.

## Table of Contents

### Getting Started
- [Installation](#installation)
- [Quick Start](#quick-start)
- [Examples](examples/)

### Core Classes

#### Orchestration
- [Workflow](classes/workflow.md) - Manage and execute complex logic sequences with precision.
- [State](classes/state.md) - Coordinate global application state and cross-context events.

#### Specialized Steps
- [Step](classes/steps/step.md) - Orchestrate individual units of work with built-in resilience.
- [LogicStep](classes/steps/logic_step.md) - Evaluate conditional logic during execution.
- [ConditionalStep](classes/steps/conditional_step.md) - Branch your logic flow based on state evaluation.
- [FlowControlStep](classes/steps/flow_control_step.md) - Control execution dynamically (break, skip).
- [CaseStep](classes/steps/case.md) - Implement match-style logic branches.
- [SwitchStep](classes/steps/switch_step.md) - Orchestrate switch-style logic paths.
- [LoopStep](classes/steps/loop_step.md) - Iterate over collections or repeat tasks.
- [DelayStep](classes/steps/delay_step.md) - Introduce precise delays into your pipeline.

#### Monitoring & Communication
- [Event](classes/events/event.md) - Broadcast and listen for lifecycle events.
- [WorkflowEvent](classes/events/workflow_event.md) - Monitor workflow-specific triggers.
- [StepEvent](classes/events/step_event.md) - Track individual step progress.
- [StateEvent](classes/events/state_event.md) - React to state mutations instantly.

### Enumerations
(Rest of Table of Contents remains the same...)

## Node.js Compatibility

Requires **Node.js 18+** for full ESM and native API support.
