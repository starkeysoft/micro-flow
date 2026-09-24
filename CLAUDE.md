# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Micro-Flow (`@ronaldroe/micro-flow`) is a lightweight, isomorphic logic orchestration library that runs unmodified in Node.js (>=18) and modern browsers. It turns multi-step async processes into structured, observable, pauseable `Workflow` objects instead of ad-hoc chains of `await` calls.

> **Terminology note:** When describing the project conceptually, use "logic flow" rather than "workflow" — "workflow" refers specifically to the `Workflow` class, which is only one part of the library.

## Commands

```bash
npm test              # Run the full test suite (vitest run)
npm run test:watch    # Run tests in watch mode
npm run test:coverage # Run tests with v8 coverage report
npm run build         # Minify src/ -> dist/ via esbuild (also runs automatically on prepublishOnly)
```

Run a single test file:

```bash
npx vitest run test/state.test.js
```

Tests live in `test/*.test.js` (flat directory, not colocated with source) and are matched via `test/**/*.test.js` in `vitest.config.js`. Coverage is collected over `src/**/*.js`.

## Architecture

### Class hierarchy

```
Base (id, name, timing, status, State access)
├── Workflow         (sequential step runner, pause/resume, results[], sessions)
└── Step             (callable executor — function | Step | Workflow)
    ├── LogicStep    (adds conditional: subject/operator/value)
    │   ├── ConditionalStep   (true_callable / false_callable branching)
    │   ├── FlowControlStep   (sets should_break or should_skip on parent workflow)
    │   ├── LoopStep          (for / for_each / while / generator loops)
    │   └── Case              (single case in a SwitchStep)
    ├── DelayStep    (absolute timestamp or relative ms, uses node-schedule + date-fns)
    └── SwitchStep   (evaluates Case[] in order, falls through to default_callable)
```

`Workflow.execute()` runs `this._steps` sequentially by index, looking each up via `this.steps_by_id[this.current_step]` and awaiting `step.execute()`. On each iteration it checks `should_break` (stop), `should_skip` (skip this step, then reset the flag), and after each step `should_pause` (mark paused and return immediately, preserving `current_step` so `resume()` can pick back up). Each executed step's outcome is appended to `this.results` via `prepareResult(message, data)`. When a workflow finishes (complete or failed), `closeCurrentSession()` snapshots `results`/`status`/`timing` into `this.sessions[current_session_id]` and clears `current_session_id`. At the top of `execute()`, if there's no open session (i.e. not resuming from a pause), `startNewSession()` assigns a new `current_session_id` and resets `results`, `should_break`/`should_skip`, and `timing.start_time`/`complete_time`/`execution_time_ms`, so a workflow can be executed any number of times (e.g. as a `LoopStep` body). `Base.markAsComplete()` must not delete `steps_by_id`, or a second `execute()` would throw.

`Step.execute()` likewise resets `retry_count`, `retry_results`, and the timing fields at the start of every run (`errors` is intentionally kept as a history across runs), and `LoopStep` resets its `results` at the start of each run. `max_timeout_ms` (default `30000`; `null`/`Infinity` disables it) and `max_retries` are accepted by every step subclass constructor and survive serialize/hydrate. `DelayStep` defaults `max_timeout_ms` to `null`. For `LoopStep` the timeout covers the whole loop, not each iteration.

### Per-instance state (and the deprecated `State` singleton)

`Base` gives every `Workflow`/`Step` its own state via `this.getState(path)` / `this.setState(path, value)` / `this.deleteState(path)`. By default (`use_state_singleton: false`, the default on `Base`/`Workflow`) these read/write an `InstanceState` (`src/classes/instance_state.js`) instance held at `this.state`. A `Workflow` creates one in its own constructor and shares the *same* `InstanceState` object with every `Step` it owns — `addStep`/`addStepAtIndex`/`unshiftStep` stamp `step.state = this.state` and `step.use_state_singleton = this.use_state_singleton` alongside `parent_workflow_id`. This is "the current state of the workflow instance": state is scoped to a workflow's own tree, not shared process-wide, and holds the workflow's own actual state rather than a copy of framework internals.

`InstanceState` starts empty (`{}`). A `Workflow` registers itself under its own `workflow` key in `initializeWorkflowState()` (`this.setState('workflow', this)`), so `getState('workflow')` resolves to the live owning `Workflow` instance - always current, since it's a reference, not a snapshot - and every `Step` sharing that state can reach it the same way. Anything else under that state is arbitrary data set via `setState()` by your own code (e.g. `setState('pipeline.raw', data)`).

Framework constants the old singleton provided - `statuses.workflow/step`, `event_names.workflow/step/state`, `events.workflow/step/state` (the *same* `Event` instances as the singleton, by reference, so `on()`/`off()` listeners keep working regardless of `use_state_singleton`), `types`, `conditional_step_comparators`, `messages` - are static members of the `Workflow` class (`Workflow.statuses`, `Workflow.events`, etc.), built once in `instance_state.js` and assigned onto `Workflow` in `workflow.js`. They are **not** part of any instance's state - `this.getState('statuses.workflow')` etc. no longer resolves. Step classes that need one of these directly (e.g. `LogicStep.checkCondition()` needs `conditional_step_comparators`) import the named export straight from `instance_state.js` rather than going through `Workflow`, avoiding an import cycle.

`src/classes/state.js` still exports the deprecated `State` class — static methods operating on a module-level `state` object shared across the whole process, including its own `workflows` id-registry (this one still exists, and still needs to - `use_state_singleton: true` workflows share the same process-wide state, so looking one up by id, e.g. in `Step.setParentWorkflowValue()`, still requires a registry there; per-instance state never needs one since it only ever represents a single workflow). Pass `use_state_singleton: true` to a `Workflow` (it propagates to every `Step` it owns) to fall back to it; `getState`/`setState`/`deleteState` will then read/write `State` directly (with a `console.warn`) instead of the instance's own `InstanceState`. `State.reset()`/`State.get()`/etc. are otherwise unchanged. Prefer `this.getState()`/`this.setState()`/`this.deleteState()` over importing `State` (or `InstanceState`) directly inside step/workflow subclasses.

### Event system

`Event` (in `src/classes/events/`) extends `EventTarget` but exposes an EventEmitter-style API (`on`, `once`, `off`, `emit`). Every `emit` call also broadcasts over a same-named `BroadcastChannel`, giving cross-tab/worker delivery with zero extra configuration. Listener data arrives as `event.detail` (CustomEvent), unwrapped automatically by the `on()` wrapper.

Events are reached via `State.get('events.workflow')`, `State.get('events.step')`, `State.get('events.state')` (or, equivalently, `Workflow.events.workflow` etc. — same `Event` instances either way, see above). Event names follow `BASE_TYPE_ACTION` (e.g. `WORKFLOW_COMPLETE`, `STEP_FAILED`, `CONDITIONAL_TRUE_BRANCH_EXECUTED`).

All status transitions route through `Base.log(event_name, message = null, data = this)`, which emits the event with `data` as its payload (the instance by default; e.g. `workflow_errored` passes `{ workflow, step, error }`, and `workflow_step_skipped`/`workflow_break_executed` pass `{ workflow, step }`) via `State.get('events.<base_type>')` and conditionally `console.log`/`console.error`s (errors when `event_name` ends in `_failed`). Suppress console logging (events still fire) with `State.set('log_suppress', true)`.

### Callables

A `Step`'s `callable` can be an `async function`, another `Step`, or a `Workflow` — the setter detects the type automatically via `getCallableType()`. When a `Step`/`Workflow` is passed, `execute()` is bound as the internal `_callable` and the original object (not the step wrapper) is returned from `execute()`. Plain `async () => {}` functions are bound to the step instance (`callable.bind(this)`), giving them access to `this.getState()` etc. from inside the callable.

Every optional callable (`callable`, `true_callable`/`false_callable`, `default_callable`) defaults to the shared `Step.noop`, never a fresh inline `async () => {}` — an inline default would get its `.name` inferred from the parameter (e.g. `"true_callable"`) and serialize as a registry reference nobody registered. `Step.serializeCallableField()` writes `Step.noop` as `null`, so hydration falls back to the constructor default.

A nested `Step`/`Workflow` callable is never added to the parent workflow's `_steps` via `addStep()` (that's how top-level steps get `parent_workflow_id`/`use_state_singleton`/`state` stamped onto them), so `ConditionalStep`/`LoopStep`/`SwitchStep` each stamp those three properties onto it themselves, right before invoking it — `ConditionalStep.conditional()` on whichever of `true_callable`/`false_callable` runs, `LoopStep.propagateStateToLoopCallable()` (called at the top of each `*_loop()` method) on `_loop_callable_object`, and `SwitchStep.switch()` on every `Case` in `cases` plus `default_callable` when it isn't a plain function. Skipping this would leave that nested callable reading/writing its own disconnected state instead of the workflow's.

Nested `Step`/`Workflow` callables record failure rather than throw it, so `static Step.throwIfFailed(obj)` rethrows it: the step's last `errors` entry, the workflow's last result `data.error`, or a generic `Nested <type> "<name>" failed` error (non-Step/Workflow values are ignored). It's called by `Step.runCallable()` (via `runWithTimeout()`, so the wrapping step fails and retries), `LoopStep.runIteration()` (for/for_each/while loops), `ConditionalStep` after a `Step`/`Workflow` branch, and `SwitchStep` after the matched `Case` and a `Step`/`Workflow` `default_callable`. A nested workflow with `exit_on_error: false` ends `complete` (it only emits `workflow_errored`), so it doesn't fail its parent.

### Flow control

`FlowControlStep` affects its *parent workflow* by calling `this.setParentWorkflowValue(parentWorkflowId, 'should_break' | 'should_skip', true)`. `Workflow.execute()`'s loop reads `should_break`/`should_skip`/`should_pause` off `this` each iteration — flow control only works because every step is given `parentWorkflowId` when added (`addStep`, `addStepAtIndex`, `unshiftStep`).

### Module exports

Public surface: `index.js` → `src/index.js` → `src/classes/index.js` + `src/enums/index.js`. Everything re-exported from those two barrel files is part of the public API — new classes/enums must be added there to be reachable by consumers. Enums live in `src/enums/` as plain objects (`const name = { KEY: 'value' }`, `export default name`); always use enum values instead of raw strings.

### Build

`build.js` uses esbuild to individually minify every file under `src/classes/`, `src/helpers/`, and `src/enums/`, plus the root `index.js` and `src/index.js`, into `dist/` — preserving directory structure and **without bundling** (each file stays a separate ESM module). Target is `node18`, format `esm`, with sourcemaps and `keepNames: true`.

## Conventions

- Strict ES Modules (`"type": "module"`); no CommonJS.
- Files and properties: `snake_case`. Classes: `PascalCase`.
- Private fields use JS private syntax (`#callable_object`).
- Each step class has a static `step_name` property (e.g. `Step.step_name = 'step'`).
- Do not add `Co-authored-by` trailers to commit messages.
- For any change, check and update as needed: tests (`test/`), docs (`docs/`, `README.md`, and this file), and the JSDoc docblocks of every function or class the change touches.
