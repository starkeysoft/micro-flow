# API Reference - Helpers

Complete reference for all helper functions in Micro Flow.

## Overview

Helper functions provide utility operations used internally by the library and available for external use.

## Available Helpers

- **[deep_clone](./deep-clone.md)** - Deep cloning with circular reference handling
- **[delay_cron](./delay-cron.md)** - Polling-based delay until timestamp

## Import Examples

```javascript
// Import from main package
import { deep_clone, delay_cron } from 'micro-flow';

// Direct imports
import deep_clone from 'micro-flow/helpers/deep_clone';
import delay_cron from 'micro-flow/helpers/delay_cron';
```

## Quick Reference

### deep_clone(obj)
Creates a deep copy of an object, handling circular references and special types.

```javascript
const original = { a: 1, b: { c: 2 } };
const cloned = deep_clone(original);
cloned.b.c = 3; // Original unchanged
```

### delay_cron(fire_time)
Delays execution until a specific timestamp using polling.

```javascript
const targetTime = Date.now() + 5000; // 5 seconds from now
await delay_cron(targetTime);
console.log('Delay complete');
```

## See Also

- [Classes Reference](../classes/index.md)
- [Enums Reference](../enums/index.md)
