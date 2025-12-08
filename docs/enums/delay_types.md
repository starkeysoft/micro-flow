# Delay Types

Enumeration of delay types for DelayStep. Defines how delays are calculated and executed.

## Values

- `ABSOLUTE` - `'absolute'` - Delay until a specific absolute timestamp or Date
- `CRON` - `'cron'` - Delay using a cron expression for scheduled execution
- `RELATIVE` - `'relative'` - Delay for a relative duration in milliseconds

## Usage

### Node.js - Relative Delay

```javascript
import { DelayStep, delay_types } from 'micro-flow';

const relativeDelay = new DelayStep({
  name: 'wait-5-seconds',
  delay_type: delay_types.RELATIVE,
  delay_duration: 5000  // 5 seconds in milliseconds
});

await relativeDelay.execute();
console.log('5 seconds have passed');
```

### Node.js - Absolute Delay

```javascript
import { DelayStep, delay_types } from 'micro-flow';

// Wait until specific time
const targetTime = new Date('2025-12-31T23:59:59');

const absoluteDelay = new DelayStep({
  name: 'wait-until-midnight',
  delay_type: delay_types.ABSOLUTE,
  delay_timestamp: targetTime
});

await absoluteDelay.execute();
console.log('It is now midnight!');
```

### Node.js - Cron-Based Delay

```javascript
import { DelayStep, delay_types } from 'micro-flow';

// Execute at specific times using cron expression
const cronDelay = new DelayStep({
  name: 'daily-task',
  delay_type: delay_types.CRON,
  cron_expression: '0 9 * * *'  // Every day at 9 AM
});

await cronDelay.execute();
console.log('Daily task executed at 9 AM');
```

### Node.js - Scheduled Workflow

```javascript
import { Workflow, Step, DelayStep, delay_types } from 'micro-flow';

const scheduledWorkflow = new Workflow({
  name: 'scheduled-backup',
  steps: [
    new DelayStep({
      name: 'wait-for-schedule',
      delay_type: delay_types.CRON,
      cron_expression: '0 2 * * *'  // Every day at 2 AM
    }),
    new Step({
      name: 'backup-database',
      callable: async () => {
        console.log('Running database backup...');
        await performBackup();
      }
    }),
    new Step({
      name: 'notify-completion',
      callable: async () => {
        await sendNotification('Backup completed');
      }
    })
  ]
});

// This will wait until 2 AM, then execute backup
await scheduledWorkflow.execute();
```

### Browser - Animated Sequence

```javascript
import { Workflow, Step, DelayStep, delay_types } from './micro-flow.js';

const animationWorkflow = new Workflow({
  name: 'animation-sequence',
  steps: [
    new Step({
      name: 'fade-in',
      callable: async () => {
        document.getElementById('element').style.opacity = '1';
      }
    }),
    new DelayStep({
      name: 'pause',
      delay_type: delay_types.RELATIVE,
      delay_duration: 2000  // Wait 2 seconds
    }),
    new Step({
      name: 'slide-left',
      callable: async () => {
        document.getElementById('element').style.transform = 'translateX(-100px)';
      }
    }),
    new DelayStep({
      name: 'pause-2',
      delay_type: delay_types.RELATIVE,
      delay_duration: 1000  // Wait 1 second
    }),
    new Step({
      name: 'fade-out',
      callable: async () => {
        document.getElementById('element').style.opacity = '0';
      }
    })
  ]
});

await animationWorkflow.execute();
```

### React - Timed Notifications

```javascript
import { Workflow, Step, DelayStep, delay_types } from './micro-flow.js';
import { useState } from 'react';

function NotificationSystem() {
  const [message, setMessage] = useState('');

  const showTimedMessage = async (text, duration) => {
    const workflow = new Workflow({
      name: 'timed-notification',
      steps: [
        new Step({
          name: 'show',
          callable: async () => {
            setMessage(text);
          }
        }),
        new DelayStep({
          name: 'wait',
          delay_type: delay_types.RELATIVE,
          delay_duration: duration
        }),
        new Step({
          name: 'hide',
          callable: async () => {
            setMessage('');
          }
        })
      ]
    });

    await workflow.execute();
  };

  return (
    <div>
      <button onClick={() => showTimedMessage('Success!', 3000)}>
        Show 3s Message
      </button>
      {message && <div className="notification">{message}</div>}
    </div>
  );
}
```

### Vue - Countdown Timer

```vue
<template>
  <div>
    <h2>{{ timeRemaining }}</h2>
    <button @click="startCountdown">Start Countdown</button>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import { DelayStep, delay_types } from './micro-flow.js';

const timeRemaining = ref(10);

const startCountdown = async () => {
  for (let i = 10; i > 0; i--) {
    timeRemaining.value = i;
    
    const delay = new DelayStep({
      name: `countdown-${i}`,
      delay_type: delay_types.RELATIVE,
      delay_duration: 1000
    });
    
    await delay.execute();
  }
  
  timeRemaining.value = 'Done!';
};
</script>
```

### Node.js - Rate Limiting with Delays

```javascript
import { Workflow, Step, DelayStep, delay_types } from 'micro-flow';

async function rateLimitedRequests(urls) {
  const steps = [];
  
  urls.forEach((url, index) => {
    // Add API call step
    steps.push(new Step({
      name: `fetch-${index}`,
      callable: async () => {
        const response = await fetch(url);
        return response.json();
      }
    }));
    
    // Add delay between requests (except after last one)
    if (index < urls.length - 1) {
      steps.push(new DelayStep({
        name: `delay-${index}`,
        delay_type: delay_types.RELATIVE,
        delay_duration: 1000  // 1 second between requests
      }));
    }
  });

  const workflow = new Workflow({
    name: 'rate-limited-fetcher',
    steps
  });

  return await workflow.execute();
}

const urls = [
  'https://api.example.com/1',
  'https://api.example.com/2',
  'https://api.example.com/3'
];

await rateLimitedRequests(urls);
```

## Cron Expression Examples

When using `delay_types.CRON`:

| Expression | Description |
|---|---|
| `0 * * * *` | Every hour |
| `0 0 * * *` | Every day at midnight |
| `0 9 * * 1-5` | Weekdays at 9 AM |
| `*/15 * * * *` | Every 15 minutes |
| `0 0 1 * *` | First day of every month |

## See Also

- [DelayStep](../classes/steps/delay_step.md) - Step that uses delay types
- [Step Types](step_types.md) - General step categorization
