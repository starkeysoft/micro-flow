# Persisting a Checkout Wizard Across Reloads — React

Demonstrates a multi-page checkout wizard backed by a single, long-lived `Workflow` that survives a page refresh (or a closed tab) by saving itself to `localStorage` after every page and resuming from exactly where the user left off — not from page one.

## Overview

You will learn:
- Modeling each wizard page as one `Step` in a single `Workflow`, rather than rebuilding a workflow per page
- Pausing after each page (`setParentWorkflowValue(..., 'should_pause', true)`) so the wizard advances one step at a time
- Saving `workflow.serialize()` to `localStorage` after each page, and clearing it once the order completes
- Rehydrating on mount with `Workflow.hydrateSerialized()`, and deriving which page to show from `reloaded.results.length`
- Why data a later step needs (like the final order summary) must come from **earlier steps' own results**, not from `State` — `State` is an in-memory singleton and does **not** survive an actual page reload, even though the workflow itself does

## Complete Example

```jsx
// PersistentCheckoutWizard.jsx
import { useState, useEffect, useRef, useCallback } from 'react';
import { Workflow, Step, CallableRegistry, State } from '@ronaldroe/micro-flow';

const STORAGE_KEY = 'checkout-workflow-v1';
const PAGES = ['contact', 'shipping', 'payment', 'review'];

// ─── Registry + workflow builders ──────────────────────────────────────────────
//
// These have to be plain, self-contained functions — no closures over component
// state — because buildRegistry() gets called fresh on every mount, including
// after a real page reload, before we know whether we're resuming or starting over.

function buildRegistry() {
  const registry = new CallableRegistry();

  function makePageStep(name, page) {
    registry.register(name, async function () {
      const draft = this.getState(`checkout.draft.${page}`) ?? {};
      // Pausing here (rather than looping over all steps in one execute() call)
      // is what lets the UI show one page at a time and persist between them.
      this.setParentWorkflowValue(this.parent_workflow_id, 'should_pause', true);
      return { page, data: draft };
    });
  }

  makePageStep('collectContact', 'contact');
  makePageStep('collectShipping', 'shipping');
  makePageStep('collectPayment', 'payment');

  registry.register('submitOrder', async function submitOrder() {
    // Pull prior pages' data from the workflow's own results, not from State —
    // State doesn't survive a real page reload, but the workflow's results do.
    const workflow = this.getState('workflows')[this.parent_workflow_id];
    const pageData = (page) =>
      workflow.results.find((r) => r.data?.name === page)?.data.result.data;

    return {
      orderId: `ORD-${Date.now()}`,
      contact: pageData('contact'),
      shipping: pageData('shipping'),
      payment: { last4: pageData('payment')?.cardNumber?.slice(-4) },
    };
  });

  return registry;
}

function buildCheckoutWorkflow(registry) {
  return new Workflow({
    name: 'checkout-wizard',
    exit_on_error: true,
    callable_registry: registry,
    steps: [
      new Step({ name: 'contact', callable: registry.get('collectContact'), callable_registry_key: 'collectContact' }),
      new Step({ name: 'shipping', callable: registry.get('collectShipping'), callable_registry_key: 'collectShipping' }),
      new Step({ name: 'payment', callable: registry.get('collectPayment'), callable_registry_key: 'collectPayment' }),
      new Step({ name: 'submit', callable: registry.get('submitOrder'), callable_registry_key: 'submitOrder' }),
    ],
  });
}

// ─── Field definitions per page (kept minimal — this example is about
// persistence, not form validation; see the Multi-Step Form example for that) ──

const FIELDS = {
  contact: [{ key: 'email', label: 'Email' }],
  shipping: [{ key: 'address', label: 'Address' }],
  payment: [{ key: 'cardNumber', label: 'Card Number' }],
};

// ─── Main component ────────────────────────────────────────────────────────────

export default function PersistentCheckoutWizard() {
  const [pageIndex, setPageIndex] = useState(0);
  const [formData, setFormData] = useState({});
  const [order, setOrder] = useState(null);

  const workflowRef = useRef(null);
  const registryRef = useRef(null);

  // On mount, resume an in-progress checkout from localStorage if one exists.
  useEffect(() => {
    registryRef.current = buildRegistry();

    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const reloaded = Workflow.hydrateSerialized(saved, registryRef.current);
      workflowRef.current = reloaded;
      // Every completed step corresponds to one finished page — pick up right after them.
      setPageIndex(reloaded.results.length);
    } else {
      workflowRef.current = buildCheckoutWorkflow(registryRef.current);
    }
  }, []);

  const handleChange = useCallback((field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  }, []);

  async function handleNext() {
    const pageName = PAGES[pageIndex];
    if (pageName !== 'review') {
      State.set(`checkout.draft.${pageName}`, formData);
    }

    const workflow = workflowRef.current;
    const isFirstStep = workflow.results.length === 0;

    await (isFirstStep ? workflow.execute() : workflow.resume());

    if (workflow.status === 'complete') {
      localStorage.removeItem(STORAGE_KEY);
      setOrder(workflow.results.at(-1).data.result);
      return;
    }

    // Still mid-flow — persist progress and move to the next page.
    localStorage.setItem(STORAGE_KEY, workflow.serialize());
    setFormData({});
    setPageIndex((p) => p + 1);
  }

  if (order) {
    return (
      <div className="order-confirmed">
        <h1>✓ Order Confirmed</h1>
        <p>Order ID: <strong>{order.orderId}</strong></p>
        <p>{order.contact?.email}</p>
        <p>{order.shipping?.address}</p>
        <p>Card ending in {order.payment?.last4}</p>
      </div>
    );
  }

  const pageName = PAGES[pageIndex];

  return (
    <div className="checkout-wizard">
      <p>Step {pageIndex + 1} of {PAGES.length}: {pageName}</p>

      {pageName === 'review' ? (
        <p>Review your details, then place your order.</p>
      ) : (
        FIELDS[pageName].map(({ key, label }) => (
          <div key={key} className="field">
            <label>{label}</label>
            <input value={formData[key] ?? ''} onChange={(e) => handleChange(key, e.target.value)} />
          </div>
        ))
      )}

      <button onClick={handleNext}>
        {pageName === 'review' ? 'Place Order' : 'Continue'}
      </button>
    </div>
  );
}
```

## Key Concepts

### One long-lived `Workflow`, paused between pages

Unlike an approach that builds a fresh `Workflow` per page, this wizard is a single `Workflow` with one step per page. Each page's step calls `setParentWorkflowValue(this.parent_workflow_id, 'should_pause', true)` before returning, so `execute()`/`resume()` only ever runs one step per click — the same mechanism `FlowControlStep` uses internally.

### `reloaded.results.length` tells you which page to show

Since each completed step corresponds to exactly one finished page, the number of entries in `results` after hydration is the index of the next page to render. No separate "which page was I on" bookkeeping is needed.

### `resume()` continues, it doesn't restart

Because `current_step` is part of what `serialize()` captures, `Workflow.hydrateSerialized()` followed by `resume()` continues from the step *after* the one that was running when it paused — even when the pause and the resume happen in different page loads (different JS runtimes entirely, in a real browser).

### `State` doesn't survive a reload — step results do

The `submitOrder` step deliberately does **not** read `checkout.contact` / `checkout.shipping` from `State`, since a real page reload wipes the in-memory `State` singleton along with all other JS state. Instead it reads them back out of `workflow.results`, which round-trips through `serialize()`/`hydrateSerialized()` along with everything else. `State` is still useful for passing data *within* a single page's validation/submit logic (as `checkout.draft.*` is here), just not across a reload boundary.

### The `CallableRegistry` is rebuilt on every mount

`buildRegistry()` is called at the top of the mount `useEffect`, every time — whether or not there's a saved workflow to resume. It has to be, since a `CallableRegistry` (and the functions in it) can't be part of what's stored in `localStorage`; only their names can.

## Related Examples

- [Multi-Step Form — React](form-workflow-react.md) — Per-page `ConditionalStep` validation, without persistence across reloads.
- [Persisting and Resuming a Workflow — Node.js](persistence-node.md) — The same save/reload/resume pattern with `LoopStep`/`ConditionalStep` and real file I/O.
- [Step Hopping — React](step-hopping-react.md) — Dynamic step manipulation in React.
