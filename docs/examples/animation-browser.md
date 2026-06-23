# Animation Sequencing — Browser

Demonstrates using `Workflow`, `Step`, and `DelayStep` in the browser to coordinate a multi-phase animation sequence. Steps execute in order, delays create precise timing between phases, and the event system drives UI updates.

## Overview

You will learn:
- Running micro-flow in the browser (no bundler required for modern browsers with import maps)
- Sequencing CSS animations with `DelayStep` for precise inter-phase timing
- Updating the DOM from within step callables
- Using `State` to track animation phase progress
- Listening to step lifecycle events to drive a progress indicator
- Pausing and resuming animations via `workflow.pause()` / `workflow.resume()`

## Complete Example

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>micro-flow Animation Sequence</title>
  <style>
    * { box-sizing: border-box; }

    body {
      font-family: system-ui, sans-serif;
      background: #0f0f0f;
      color: #fff;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      gap: 32px;
      margin: 0;
    }

    #stage {
      position: relative;
      width: 400px;
      height: 400px;
    }

    .orb {
      position: absolute;
      border-radius: 50%;
      transition: all 0.6s cubic-bezier(0.34, 1.56, 0.64, 1);
      opacity: 0;
    }

    .orb.visible  { opacity: 1; }
    .orb.expanded { transform: scale(2.5) !important; }

    #orb-a { width: 80px; height: 80px; background: #6366f1; top: 50%; left: 50%; transform: translate(-50%, -50%); }
    #orb-b { width: 60px; height: 60px; background: #ec4899; top: 20%; left: 20%; }
    #orb-c { width: 60px; height: 60px; background: #10b981; top: 20%; right: 20%; }
    #orb-d { width: 60px; height: 60px; background: #f59e0b; bottom: 20%; left: 20%; }
    #orb-e { width: 60px; height: 60px; background: #3b82f6; bottom: 20%; right: 20%; }

    #progress {
      display: flex;
      gap: 8px;
    }

    .dot {
      width: 10px; height: 10px;
      border-radius: 50%;
      background: #333;
      transition: background 0.3s;
    }
    .dot.active   { background: #6366f1; }
    .dot.complete { background: #10b981; }

    #status {
      font-size: 14px;
      color: #888;
      min-height: 24px;
    }

    #controls { display: flex; gap: 12px; }

    button {
      padding: 8px 20px;
      border-radius: 8px;
      border: 1px solid #333;
      background: #1a1a1a;
      color: #fff;
      cursor: pointer;
      font-size: 14px;
    }
    button:hover { background: #2a2a2a; }
    button:disabled { opacity: 0.4; cursor: not-allowed; }
  </style>
</head>
<body>

<div id="stage">
  <div class="orb" id="orb-a"></div>
  <div class="orb" id="orb-b"></div>
  <div class="orb" id="orb-c"></div>
  <div class="orb" id="orb-d"></div>
  <div class="orb" id="orb-e"></div>
</div>

<div id="progress">
  <div class="dot" id="dot-0"></div>
  <div class="dot" id="dot-1"></div>
  <div class="dot" id="dot-2"></div>
  <div class="dot" id="dot-3"></div>
  <div class="dot" id="dot-4"></div>
  <div class="dot" id="dot-5"></div>
</div>

<div id="status">Ready</div>

<div id="controls">
  <button id="btn-run">Run Animation</button>
  <button id="btn-pause" disabled>Pause</button>
  <button id="btn-resume" disabled>Resume</button>
  <button id="btn-reset" disabled>Reset</button>
</div>

<script type="importmap">
{
  "imports": {
    "@ronaldroe/micro-flow": "https://cdn.jsdelivr.net/npm/@ronaldroe/micro-flow/dist/index.js"
  }
}
</script>

<script type="module">
import {
  Workflow,
  Step,
  DelayStep,
  State,
  delay_types,
  workflow_event_names,
  step_event_names,
} from '@ronaldroe/micro-flow';

// ─── DOM helpers ──────────────────────────────────────────────────────────────

const statusEl   = document.getElementById('status');
const btnRun     = document.getElementById('btn-run');
const btnPause   = document.getElementById('btn-pause');
const btnResume  = document.getElementById('btn-resume');
const btnReset   = document.getElementById('btn-reset');

function setStatus(text) { statusEl.textContent = text; }

function setDot(index, state) {
  const dot = document.getElementById(`dot-${index}`);
  if (!dot) return;
  dot.classList.remove('active', 'complete');
  if (state) dot.classList.add(state);
}

function resetAll() {
  document.querySelectorAll('.orb').forEach((el) => {
    el.classList.remove('visible', 'expanded');
  });
  for (let i = 0; i < 6; i++) setDot(i, null);
  setStatus('Ready');
}

// ─── Animation workflow ───────────────────────────────────────────────────────

let animationFlow;

function buildAnimationFlow() {
  animationFlow = new Workflow({ name: 'orb-animation', exit_on_error: false });

  const steps = [
    // Phase 0: Fade in central orb
    new Step({
      name: 'phase-fade-in',
      callable: async function () {
        setStatus('Phase 1: Fade in');
        setDot(0, 'active');
        this.setState('animation.phase', 'fade-in');

        document.getElementById('orb-a').classList.add('visible');
        return { phase: 'fade-in' };
      },
    }),

    // Wait 600ms
    new DelayStep({ name: 'delay-0', delay_type: delay_types.RELATIVE, relative_delay_ms: 600 }),

    // Phase 1: Reveal satellite orbs
    new Step({
      name: 'phase-reveal-satellites',
      callable: async function () {
        setStatus('Phase 2: Reveal satellites');
        setDot(0, 'complete');
        setDot(1, 'active');
        this.setState('animation.phase', 'reveal-satellites');

        ['orb-b', 'orb-c', 'orb-d', 'orb-e'].forEach((id) => {
          document.getElementById(id).classList.add('visible');
        });
        return { phase: 'reveal-satellites' };
      },
    }),

    // Wait 800ms
    new DelayStep({ name: 'delay-1', delay_type: delay_types.RELATIVE, relative_delay_ms: 800 }),

    // Phase 2: Expand central orb
    new Step({
      name: 'phase-expand',
      callable: async function () {
        setStatus('Phase 3: Expand');
        setDot(1, 'complete');
        setDot(2, 'active');
        this.setState('animation.phase', 'expand');

        document.getElementById('orb-a').classList.add('expanded');
        return { phase: 'expand' };
      },
    }),

    // Wait 600ms
    new DelayStep({ name: 'delay-2', delay_type: delay_types.RELATIVE, relative_delay_ms: 600 }),

    // Phase 3: Contract (remove expanded)
    new Step({
      name: 'phase-contract',
      callable: async function () {
        setStatus('Phase 4: Contract');
        setDot(2, 'complete');
        setDot(3, 'active');
        this.setState('animation.phase', 'contract');

        document.getElementById('orb-a').classList.remove('expanded');
        return { phase: 'contract' };
      },
    }),

    // Wait 700ms
    new DelayStep({ name: 'delay-3', delay_type: delay_types.RELATIVE, relative_delay_ms: 700 }),

    // Phase 4: Hide satellites
    new Step({
      name: 'phase-hide-satellites',
      callable: async function () {
        setStatus('Phase 5: Hide satellites');
        setDot(3, 'complete');
        setDot(4, 'active');
        this.setState('animation.phase', 'hide-satellites');

        ['orb-b', 'orb-c', 'orb-d', 'orb-e'].forEach((id) => {
          document.getElementById(id).classList.remove('visible');
        });
        return { phase: 'hide-satellites' };
      },
    }),

    // Wait 600ms
    new DelayStep({ name: 'delay-4', delay_type: delay_types.RELATIVE, relative_delay_ms: 600 }),

    // Phase 5: Fade out
    new Step({
      name: 'phase-fade-out',
      callable: async function () {
        setStatus('Phase 6: Fade out');
        setDot(4, 'complete');
        setDot(5, 'active');
        this.setState('animation.phase', 'fade-out');

        document.getElementById('orb-a').classList.remove('visible');
        return { phase: 'fade-out' };
      },
    }),
  ];

  animationFlow.addSteps(steps);
  return animationFlow;
}

// ─── Event listeners ──────────────────────────────────────────────────────────

const wfEvents = State.get('events.workflow');

wfEvents.on(workflow_event_names.WORKFLOW_COMPLETE, () => {
  setDot(5, 'complete');
  setStatus('Animation complete ✓');
  btnRun.disabled    = false;
  btnPause.disabled  = true;
  btnResume.disabled = true;
  btnReset.disabled  = false;
});

wfEvents.on(workflow_event_names.WORKFLOW_PAUSED, () => {
  setStatus('Paused — click Resume to continue');
  btnPause.disabled  = true;
  btnResume.disabled = false;
});

wfEvents.on(workflow_event_names.WORKFLOW_RESUMED, () => {
  setStatus('Resumed');
  btnPause.disabled  = false;
  btnResume.disabled = true;
});

// ─── Button handlers ──────────────────────────────────────────────────────────

btnRun.addEventListener('click', async () => {
  resetAll();
  btnRun.disabled    = true;
  btnPause.disabled  = false;
  btnResume.disabled = true;
  btnReset.disabled  = true;

  buildAnimationFlow();
  await animationFlow.execute();
});

btnPause.addEventListener('click', () => {
  animationFlow?.pause();
});

btnResume.addEventListener('click', async () => {
  if (animationFlow) {
    btnPause.disabled  = false;
    btnResume.disabled = true;
    await animationFlow.resume();
  }
});

btnReset.addEventListener('click', () => {
  resetAll();
  btnReset.disabled = true;
  btnRun.disabled   = false;
});
</script>

</body>
</html>
```

## Key Concepts

### DelayStep for Animation Timing

Each `DelayStep` with `delay_type: delay_types.RELATIVE` and a `relative_delay_ms` value creates a non-blocking pause between animation phases. The workflow thread yields during the delay, allowing CSS transitions to complete before the next step runs.

### State for Phase Tracking

`this.setState('animation.phase', 'fade-in')` stores the current animation phase in the global `State`. This makes it easy to inspect or react to the phase from outside the workflow (e.g., in other event handlers or UI components).

### Pause / Resume for User Control

`animationFlow.pause()` is called inside a button handler. It sets `should_pause = true` on the workflow, which suspends execution after the current step (or delay) completes. `workflow.resume()` picks up from the next step.

### Rebuilding on Each Run

The `buildAnimationFlow()` function creates a fresh `Workflow` and step instances on each run. This avoids stale state from a previous execution — `step.status` and `step.result` are reset.

## Related Examples

- [Basic Workflow — Node.js](basic-workflow-node.md) — Core patterns
- [Data Fetching — Vue](data-fetching-vue.md) — Reactive UI with Workflow
- [Form Workflow — React](form-workflow-react.md) — Multi-step form management
