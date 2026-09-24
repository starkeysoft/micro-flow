# Persisting and Resuming a Workflow — Node.js

Demonstrates saving a `Workflow` to disk, reloading it in what simulates a separate process, and resuming it from exactly the step where it paused — including a `LoopStep` and a `ConditionalStep`, which must come back as their original subclasses (not plain `Step`s) for the workflow to behave correctly after reload.

## Overview

You will learn:
- Registering function callables in a `CallableRegistry` so they survive `serialize()`
- Writing `workflow.serialize()` to an actual file and reading it back with `Workflow.hydrateSerialized()`
- Why hydration needs the *same* `CallableRegistry` names re-registered before it can resolve function callables
- Confirming a reloaded workflow's steps come back as the correct subclass (`LoopStep`, `ConditionalStep`), not a plain `Step`
- Pausing mid-flow (`should_pause` via `setParentWorkflowValue`), persisting, reloading, and calling `resume()` — which continues after the step that paused it, not from the beginning
- Why a `Step`/`Workflow` used directly as a callable needs no registry at all

## Complete Example

```javascript
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {
  Workflow,
  Step,
  LoopStep,
  ConditionalStep,
  CallableRegistry,
  State,
} from '@ronaldroe/micro-flow';

State.set('log_suppress', true);

const SAVE_PATH = path.join(os.tmpdir(), 'micro-flow-order-fulfillment.json');

// ─── Build a registry of named, persistable callables ─────────────────────────
//
// Anything that ends up in a step's `callable` (or a ConditionalStep branch, a
// LoopStep's per-iteration body, a SwitchStep's default_callable, etc.) as a
// plain function has to be registered here under a matching name — functions
// can't be serialized to JSON, so hydration looks them back up by name instead.

function buildRegistry() {
  const registry = new CallableRegistry();

  registry.register('lineItemTotal', async function lineItemTotal() {
    const total = this.current_item.qty * this.current_item.price;
    // Accumulate into State rather than reading back through workflow.results —
    // simpler, and it's the idiomatic way to pass data between steps anyway.
    const totals = this.getState('order.lineTotals') ?? [];
    this.setState('order.lineTotals', [...totals, total]);
    return total;
  });

  registry.register('flagForReview', async function flagForReview() {
    console.log('  Order total exceeds $500 — pausing for manual fraud review');
    this.setParentWorkflowValue(this.parent_workflow_id, 'should_pause', true);
    return { flagged: true };
  });

  registry.register('autoApprove', async function autoApprove() {
    console.log('  Order auto-approved (under review threshold)');
    return { approved: true };
  });

  registry.register('chargeCard', async function chargeCard() {
    console.log('  Charging card');
    return { charged: true };
  });

  registry.register('shipOrder', async function shipOrder() {
    console.log('  Shipping order');
    return { shipped: true };
  });

  return registry;
}

// ─── Part 1: Build and run the workflow until it pauses ────────────────────────

console.log('=== Part 1: Running until fraud review pauses the workflow ===\n');

const registry = buildRegistry();

const workflow = new Workflow({
  name: 'order-fulfillment',
  exit_on_error: true,
  callable_registry: registry,
  steps: [
    new LoopStep({
      name: 'calculate-totals',
      loop_type: 'for_each',
      iterable: [
        { sku: 'WIDGET-A', qty: 4, price: 149.99 },
        { sku: 'GADGET-B', qty: 1, price: 29.99 },
      ],
      callable: registry.get('lineItemTotal'),
    }),
    new ConditionalStep({
      name: 'fraud-check',
      conditional: {
        subject: () => (State.get('order.lineTotals') ?? []).reduce((sum, n) => sum + n, 0),
        operator: '>',
        value: 500,
      },
      true_callable: registry.get('flagForReview'),
      false_callable: registry.get('autoApprove'),
    }),
    new Step({ name: 'charge-card', callable: registry.get('chargeCard'), callable_registry_key: 'chargeCard' }),
    new Step({ name: 'ship-order', callable: registry.get('shipOrder'), callable_registry_key: 'shipOrder' }),
  ],
});

await workflow.execute();
console.log('\nStatus after first run:', workflow.status); // 'paused'
console.log('Steps completed so far:', workflow.results.length); // 2

// ─── Part 2: Persist it to disk ────────────────────────────────────────────────

await fs.writeFile(SAVE_PATH, workflow.serialize(), 'utf-8');
console.log(`\nSaved paused workflow to ${SAVE_PATH}`);

// ─── Part 3: "Restart the process" and reload ──────────────────────────────────
//
// In a real app this is a separate process — a server restart, a new worker
// picking up a queued approval, a cron job hours later. The important part is
// that the CallableRegistry has to be rebuilt with the same function names
// before hydration can resolve them; nothing about the functions themselves
// is stored in the JSON.

console.log('\n=== Part 2: Reloading in a fresh process ===\n');

const savedJson = await fs.readFile(SAVE_PATH, 'utf-8');
const freshRegistry = buildRegistry(); // re-register the same names
const reloaded = Workflow.hydrateSerialized(savedJson, freshRegistry);

console.log('Reloaded status:', reloaded.status); // 'paused'
console.log(
  'Reloaded step classes:',
  reloaded.steps.map((s) => s.constructor.name)
);
// [ 'LoopStep', 'ConditionalStep', 'Step', 'Step' ] — not ['Step', 'Step', 'Step', 'Step']

// ─── Part 4: Approve and resume ────────────────────────────────────────────────

console.log('\n--- Manual review complete, approving and resuming ---\n');

await reloaded.resume();

console.log('\nFinal status:', reloaded.status); // 'complete'
console.log('Total steps run:', reloaded.results.length); // 4 — no step re-ran
console.log('Results in order:', reloaded.results.map((r) => r.data?.name));
// [ 'calculate-totals', 'fraud-check', 'charge-card', 'ship-order' ]

await fs.unlink(SAVE_PATH);
```

## Key Concepts

### Class-correct hydration

`Workflow.hydrateSerialized()` rebuilds each step as its original subclass by reading `class_name` off the serialized data and dispatching through `Step.hydrateAny()`. Without this, a reloaded `LoopStep` or `ConditionalStep` would come back as a plain `Step` and lose its loop/branching behavior entirely.

### The `CallableRegistry` must be rebuilt, not restored

Nothing about a JavaScript function — its closure, its source — survives `JSON.stringify`. Only its *name* is stored. Hydration expects a `CallableRegistry` with the same names registered again; in this example that's `buildRegistry()`, called fresh in "Part 2" exactly as it was in "Part 1". A `Step`/`Workflow` used directly as a callable doesn't have this problem, since it serializes recursively as its own object graph.

### Resuming continues, it doesn't restart

`resume()` picks up from the step *after* the one that was running when `pause()` (or, as here, setting `should_pause` from inside a step) took effect — whether the workflow was paused in memory or reloaded from disk first. `current_step` is part of what gets serialized, which is what makes this possible after a reload.

### Pausing from inside a `ConditionalStep` branch

`flagForReview` calls `this.setParentWorkflowValue(this.parent_workflow_id, 'should_pause', true)` — the same mechanism `FlowControlStep` uses internally. Any callable, in any step type, can request a pause this way.

### Function-valued conditional subjects need a registry entry too

`fraud-check`'s `subject` is a function, so it's serialized as `null` in `conditional` with a registry reference in `conditional_callables`, keyed by the function's name. An inline arrow assigned to `subject` gets the inferred name `'subject'`, and nothing is registered under that name here, so `hydrateSerialized()` logs a `console.warn` and leaves the reloaded step's subject `null`. It doesn't throw, the way a missing primary `callable` would. That's harmless in this example because `fraud-check` already ran before the pause and doesn't run again. If a reloaded workflow still needs to evaluate a function subject, register the function in the `CallableRegistry` under its name (e.g. `registry.register('subject', ...)`, or use a named function and register it under that name).

### State doesn't persist — step results do

`order.lineTotals` is only read once, by `fraud-check`, before the workflow ever pauses — so it doesn't matter that state isn't part of `serialize()`'s output. Neither the workflow's own instance state (what `this.setState()`/`this.getState()` read and write) nor the deprecated `State` singleton is serialized; that's deliberate. In a real separate process, both would come back empty. Any data a *later* step needs after a reload has to come from an earlier step's own return value (which does round-trip, inside `result`/`results`), not from state.

## Related Examples

- [Basic Workflow — Node.js](basic-workflow-node.md) — Foundational patterns without persistence.
- [Step Hopping — Node.js](step-hopping-node.md) — In-memory pause/resume and dynamic step manipulation.
- [Data Pipeline — Node.js](data-pipeline-node.md) — Multi-step ETL with `LoopStep` and `State`.
