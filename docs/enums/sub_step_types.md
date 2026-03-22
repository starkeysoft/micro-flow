# Sub Step Types

Static mapping of Step class names to their `step_name` identifiers.

## Overview

Sub step types provide a mapping from class names to their step type identifiers. This is useful for:

- Type checking and validation
- Dynamic step creation
- Debugging and logging
- Step class discovery

## Mapping

The library provides mappings for all built-in step classes:

```javascript
{
  Step: 'step',
  LogicStep: 'logic',
  ConditionalStep: 'conditional',
  FlowControlStep: 'flow_control',
  LoopStep: 'loop',
  SwitchStep: 'switch',
  Case: 'case',
  DelayStep: 'delay',
}
```

## Usage

### Node.js - Check Step Type

```javascript
import { sub_step_types } from 'micro-flow';

console.log(sub_step_types);
// {
//   Step: 'step',
//   LogicStep: 'logic',
//   ConditionalStep: 'conditional',
//   FlowControlStep: 'flow_control',
//   LoopStep: 'loop',
//   SwitchStep: 'switch',
//   Case: 'case',
//   DelayStep: 'delay',
// }

// Check if a class is a registered step type
if (sub_step_types.ConditionalStep) {
  console.log('ConditionalStep identifier:', sub_step_types.ConditionalStep);
  // Output: "ConditionalStep identifier: conditional"
}
```

### Node.js - Dynamic Step Factory

```javascript
import { 
  sub_step_types, 
  Step,
  ConditionalStep,
  LoopStep,
  DelayStep
} from 'micro-flow';

const stepClasses = {
  Step,
  ConditionalStep,
  LoopStep,
  DelayStep
};

function createStepByClassName(className, config) {
  if (!sub_step_types[className]) {
    throw new Error(`Unknown step class: ${className}`);
  }
  
  const StepClass = stepClasses[className];
  return new StepClass(config);
}

// Create steps dynamically
const step1 = createStepByClassName('ConditionalStep', {
  name: 'check-value',
  conditional: { subject: 5, operator: '>', value: 3 }
});

const step2 = createStepByClassName('DelayStep', {
  name: 'wait',
  delay_type: 'relative',
  delay_duration: 1000
});
```

### Node.js - Validation

```javascript
import { sub_step_types } from 'micro-flow';

function isValidStepClass(className) {
  return className in sub_step_types;
}

function getStepTypeFromClass(className) {
  if (!isValidStepClass(className)) {
    throw new Error(`Invalid step class: ${className}`);
  }
  
  return sub_step_types[className];
}

console.log(getStepTypeFromClass('ConditionalStep')); // "conditional"
console.log(getStepTypeFromClass('Step')); // "step"
```

### Browser - Step Registry

```javascript
import { sub_step_types } from './micro-flow.js';

class StepRegistry {
  constructor() {
    this.registry = new Map();
    
    // Register all known step types
    Object.entries(sub_step_types).forEach(([className, stepType]) => {
      if (stepType) {
        this.registry.set(stepType, className);
      }
    });
  }
  
  getClassName(stepType) {
    return this.registry.get(stepType);
  }
  
  getStepType(className) {
    return sub_step_types[className];
  }
  
  getAllTypes() {
    return Array.from(this.registry.keys());
  }
}

const registry = new StepRegistry();
console.log(registry.getClassName('conditional')); // "ConditionalStep"
console.log(registry.getAllTypes()); // ["step", "logic", "conditional", "flow_control", "loop", "switch", "case", "delay"]
```

### React - Step Type Selector

```javascript
import { sub_step_types } from './micro-flow.js';
import { useState } from 'react';

function StepTypeSelector({ onSelect }) {
  const [selectedClass, setSelectedClass] = useState('');

  const stepClasses = Object.keys(sub_step_types);

  const handleSelect = (e) => {
    const className = e.target.value;
    setSelectedClass(className);
    onSelect({
      className,
      stepType: sub_step_types[className]
    });
  };

  return (
    <div>
      <label>Select Step Type:</label>
      <select value={selectedClass} onChange={handleSelect}>
        <option value="">Choose...</option>
        {stepClasses.map(className => (
          <option key={className} value={className}>
            {className} ({sub_step_types[className]})
          </option>
        ))}
      </select>
    </div>
  );
}
```

### Vue - Step Type Inspector

```vue
<template>
  <div>
    <h3>Available Step Types</h3>
    <table>
      <thead>
        <tr>
          <th>Class Name</th>
          <th>Step Type</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="[className, stepType] in stepTypes" :key="className">
          <td><code>{{ className }}</code></td>
          <td>{{ stepType }}</td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { sub_step_types } from './micro-flow.js';

const stepTypes = ref([]);

onMounted(() => {
  stepTypes.value = Object.entries(sub_step_types);
});
</script>
```

### Node.js - Debugging Helper

```javascript
import { sub_step_types } from 'micro-flow';

function debugStepInstance(step) {
  const className = step.constructor.name;
  const expectedType = sub_step_types[className];
  const actualType = step.sub_step_type || step.step_type;
  
  console.log('Step Debug Info:');
  console.log('  Class:', className);
  console.log('  Expected Type:', expectedType);
  console.log('  Actual Type:', actualType);
  console.log('  Match:', expectedType === actualType);
  
  if (expectedType !== actualType) {
    console.warn('⚠️ Type mismatch detected!');
  }
}

// Usage
import { ConditionalStep } from 'micro-flow';

const step = new ConditionalStep({
  name: 'test',
  conditional: { subject: 1, operator: '===', value: 1 }
});

debugStepInstance(step);
// Output:
// Step Debug Info:
//   Class: ConditionalStep
//   Expected Type: conditional
//   Actual Type: conditional
//   Match: true
```

### Node.js - Type-Safe Step Builder

```javascript
import { 
  sub_step_types,
  Step,
  ConditionalStep,
  LoopStep,
  DelayStep
} from 'micro-flow';

class TypeSafeStepBuilder {
  constructor() {
    this.classMap = {
      Step,
      ConditionalStep,
      LoopStep,
      DelayStep
    };
  }
  
  build(className, config) {
    // Validate class name
    if (!sub_step_types[className]) {
      throw new Error(
        `Unknown step class: ${className}. ` +
        `Available: ${Object.keys(sub_step_types).join(', ')}`
      );
    }
    
    // Get the class
    const StepClass = this.classMap[className];
    if (!StepClass) {
      throw new Error(`Step class ${className} not imported`);
    }
    
    // Create instance
    const instance = new StepClass(config);
    
    // Verify type matches
    const expectedType = sub_step_types[className];
    const actualType = instance.sub_step_type || instance.step_type;
    
    if (expectedType && expectedType !== actualType) {
      console.warn(
        `Type mismatch for ${className}: ` +
        `expected ${expectedType}, got ${actualType}`
      );
    }
    
    return instance;
  }
  
  listAvailableTypes() {
    return Object.entries(sub_step_types)
      .map(([className, type]) => ({ className, type }));
  }
}

const builder = new TypeSafeStepBuilder();

// List available types
console.log(builder.listAvailableTypes());

// Build steps safely
const step = builder.build('ConditionalStep', {
  name: 'check',
  conditional: { subject: true, operator: '===', value: true }
});
```

## Custom Step Types

If you create custom step classes, you can add them to the `sub_step_types` enum:

```javascript
import { sub_step_types } from 'micro-flow';

// Add your custom step class
sub_step_types.CustomStep = 'custom';
```

## API Reference

### Properties

All properties are class name strings mapped to their step type identifiers.

```javascript
{
  [className: string]: string
}
```

## See Also

- [Step Types](step_types.md) - General step categorization
- [Logic Step Types](logic_step_types.md) - Logic step subcategories  
- [Step](../classes/steps/step.md) - Base step class
- [LogicStep](../classes/steps/logic_step.md) - Logic step class
