# base_types

Identifies whether a component is a `Step` or a `Workflow`. Used internally by `Base` and the event system to route log events and determine component identity.

## Table of Contents
- [Values](#values)
- [Usage](#usage)
- [Related](#related)

## Values

| Key | Value | Description |
|-----|-------|-------------|
| `STEP` | `'step'` | Represents any `Step` instance or subclass. |
| `WORKFLOW` | `'workflow'` | Represents a `Workflow` instance. |

## Usage

```javascript
import { base_types } from '@ronaldroe/micro-flow';

console.log(base_types.STEP);     // 'step'
console.log(base_types.WORKFLOW); // 'workflow'
```

The `base_type` property is set automatically in the `Base` constructor and is available on every `Step`, `Workflow`, and their subclasses:

```javascript
import { Step, Workflow } from '@ronaldroe/micro-flow';

const step = new Step({ name: 'my-step', callable: async () => {} });
const wf   = new Workflow({ name: 'my-flow' });

console.log(step.base_type); // 'step'
console.log(wf.base_type);   // 'workflow'
```

Checking the type at runtime:

```javascript
import { Step, Workflow, base_types } from '@ronaldroe/micro-flow';

function describe(component) {
  if (component.base_type === base_types.WORKFLOW) {
    return `Workflow "${component.name}" with ${component.steps.length} step(s)`;
  }
  return `Step "${component.name}"`;
}

const wf   = new Workflow({ name: 'demo' });
const step = new Step({ name: 'task', callable: async () => {} });

console.log(describe(wf));   // 'Workflow "demo" with 0 step(s)'
console.log(describe(step)); // 'Step "task"'
```

## Related

- [Base](../classes/base.md) — Sets `base_type` in its constructor.
- [sub_step_types](sub_step_types.md) — More granular type information for step subclasses.
