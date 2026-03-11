# Micro-Flow Copilot Instructions

## Project Overview

Micro-Flow is a workflow orchestration library published as `@ronaldroe/micro-flow`. It runs in Node.js (>=18) and all modern browsers. The package uses ES modules (`"type": "module"` in package.json).

## Commands

```bash
npm run build   # Minifies src/ → dist/ using esbuild (run before publishing)
```

## Architecture

### Class Hierarchy

```
Base (id, name, timing, status, State access)
├── Workflow         (sequential step runner, pause/resume, results[])
└── Step             (callable executor — function | Step | Workflow)
    └── LogicStep    (adds conditional: subject/operator/value)
        ├── ConditionalStep   (true_callable / false_callable branching)
        ├── FlowControlStep   (sets should_break or should_skip on parent workflow)
        ├── LoopStep          (for / for_each / while / generator loops)
        └── Case              (single case in a SwitchStep)
    └── DelayStep    (absolute timestamp or relative ms, uses node-schedule + date-fns)
    └── SwitchStep   (evaluates Case[] in order, falls through to default_callable)
```

### Global Singleton: `State`

`State` is a module-level singleton object (not a class instance) shared across all workflows and steps. It holds:
- `statuses.workflow` / `statuses.step` — status enums
- `event_names.workflow` / `event_names.step` / `event_names.state` — event name enums
- `events.workflow` / `events.step` / `events.state` — `Event` instances (extend `EventTarget`)
- `workflows` — registry of all live `Workflow` instances keyed by UUID
- `conditional_step_comparators` — operator strings used by `LogicStep`

Access state from anywhere: `State.get('dot.path')`, `State.set('dot.path', value)`, `State.delete(path)`, `State.merge({...})`. Both dot-notation and bracket-notation (`users[0].name`) are supported.

**`Base` exposes `this.getState()` / `this.setState()` / `this.deleteState()` as instance shortcuts to the same singleton.**

### Event System

`Event` extends `EventTarget` but exposes an EventEmitter-style API (`on`, `once`, `off`, `emit`). Every `emit` call also broadcasts over a `BroadcastChannel` (same event name as channel name), enabling cross-tab/worker delivery.

Events are accessed via `State.get('events.workflow')`, `State.get('events.step')`, `State.get('events.state')`. Listener data arrives as `event.detail` (CustomEvent) unwrapped automatically by the `on()` wrapper.

### Build

`build.js` uses esbuild to individually minify every file under `src/classes/`, `src/helpers/`, and `src/enums/`, plus the root `index.js`, into `dist/` (preserving directory structure). It does **not** bundle — each file remains a separate module. The `prepublishOnly` hook runs the build automatically before `npm publish`.

## Key Conventions

### Callable Types
A `Step`'s `callable` can be an `async function`, another `Step`, or a `Workflow`. The setter detects the type automatically via `getCallableType()`. When a `Step` or `Workflow` is passed, `execute()` is bound as the internal `_callable`, and the original object is returned from `execute()` (not the step wrapper).

Plain `async () => {}` functions are bound to the step instance (`callable.bind(this)`), giving them access to `this.getState()` etc.

### Enums
All enums live in `src/enums/` as plain objects with `const name = { KEY: 'value' }` and `export default name`. They are re-exported from `src/enums/index.js` and included in the public API. Always use enum values (e.g., `flow_control_types.BREAK`) rather than raw strings.

### Logging / Events
All status changes go through `Base.log(event_name, message)`, which emits the event via `State.get('events.<base_type>')` and conditionally `console.log`s. Log suppression: `State.set('log_suppress', true)`.

Event names follow the pattern `BASE_TYPE_ACTION` (e.g., `WORKFLOW_COMPLETE`, `STEP_FAILED`, `CONDITIONAL_TRUE_BRANCH_EXECUTED`).

### Flow Control
`FlowControlStep` controls parent workflow execution by calling `this.setParentWorkflowValue(parentWorkflowId, 'should_break' | 'should_skip', true)`. The `Workflow.execute()` loop checks `this.getState('should_break')` and `this.getState('should_skip')` on each iteration.

### Naming
- Files and properties use `snake_case`.
- Classes use `PascalCase`.
- Each step class has a static `step_name` property (e.g., `Step.step_name = 'step'`).
- Private fields use JS private syntax (`#callable_object`).

### Module Exports
Public surface: `index.js` → `src/index.js` → `src/classes/index.js` + `src/enums/index.js`. Everything exported from those barrel files is part of the public API.
