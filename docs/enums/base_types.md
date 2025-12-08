# Base Types

Enumeration of base types used to categorize workflow components.

## Values

- `STEP` - `'step'` - Represents a Step instance
- `WORKFLOW` - `'workflow'` - Represents a Workflow instance

## Usage

Base types are used internally to identify whether a component is a step or workflow. This helps with event routing, state management, and logging.

### Node.js Example

```javascript
import { Base, base_types } from 'micro-flow';

const instance = new Base({
  name: 'my-instance',
  base_type: base_types.STEP
});

console.log(instance.base_type); // 'step'
```

### Browser Example

```javascript
import { Workflow, Step, base_types } from './micro-flow.js';

const workflow = new Workflow({ name: 'test' });
console.log(workflow.base_type); // 'workflow'

const step = new Step({ name: 'test' });
console.log(step.base_type); // 'step'
```

### Checking Instance Type

```javascript
import { Workflow, Step, base_types } from 'micro-flow';

function processInstance(instance) {
  if (instance.base_type === base_types.WORKFLOW) {
    console.log('Processing workflow:', instance.name);
    console.log('Steps:', instance.steps.length);
  } else if (instance.base_type === base_types.STEP) {
    console.log('Processing step:', instance.name);
    console.log('Type:', instance.step_type);
  }
}
```

### Event Routing (Node.js)

```javascript
import { State, base_types } from 'micro-flow';

function setupEventListeners(instance) {
  const eventEmitter = State.get(`events.${instance.base_type}`);
  
  if (instance.base_type === base_types.WORKFLOW) {
    eventEmitter.on('workflow_complete', (data) => {
      console.log('Workflow completed:', data.name);
    });
  } else {
    eventEmitter.on('step_complete', (data) => {
      console.log('Step completed:', data.name);
    });
  }
}
```

## See Also

- [Base](../classes/base.md) - Base class that uses base_types
- [Workflow](../classes/workflow.md) - Uses WORKFLOW base type
- [Step](../classes/steps/step.md) - Uses STEP base type
