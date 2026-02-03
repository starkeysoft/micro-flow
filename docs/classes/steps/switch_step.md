# SwitchStep

SwitchStep class for implementing switch/case logic in workflows. Evaluates cases in order and executes the first matching case, or a default callable if no cases match.

Extends: [Step](step.md)

## Constructor

### `new SwitchStep(options)`

Creates a new SwitchStep instance.

**Parameters:**
- `options` (Object) - Configuration options
  - `name` (string, optional) - Name of the step
  - `cases` (Array\<Case|LogicStep\>, optional) - Array of Case or LogicStep instances to evaluate. **Note:** LogicStep instances MUST have `conditional.subject` set. (default: `[]`)
  - `default_callable` (Function|Step|Workflow, optional) - Function, Step, or Workflow to execute if no cases match (default: `async () => {}`)
  - `subject` (any, optional) - Subject value to evaluate against each case (default: `null`)

**Example (Node.js - HTTP Status Codes):**
```javascript
import { SwitchStep, Case } from 'micro-flow';

const statusCode = 404;

const handleResponse = new SwitchStep({
  name: 'handle-http-status',
  subject: statusCode,
  cases: [
    new Case({
      name: 'success',
      conditional: { operator: '===', value: 200 },
      callable: async () => {
        console.log('Success!');
        return { status: 'ok' };
      }
    }),
    new Case({
      name: 'not-found',
      conditional: { operator: '===', value: 404 },
      callable: async () => {
        console.log('Resource not found');
        return { status: 'not_found', error: 'Resource does not exist' };
      }
    }),
    new Case({
      name: 'server-error',
      conditional: { operator: '===', value: 500 },
      callable: async () => {
        console.log('Server error');
        return { status: 'error', error: 'Internal server error' };
      }
    })
  ],
  default_callable: async () => {
    console.log('Unknown status code');
    return { status: 'unknown' };
  }
});

const result = await handleResponse.execute();
console.log('Result:', result.result);
```

**Example (Browser - User Role Permissions):**
```javascript
import { SwitchStep, Case } from './micro-flow.js';

const userRole = 'moderator';

const checkPermissions = new SwitchStep({
  name: 'check-user-permissions',
  subject: userRole,
  cases: [
    new Case({
      name: 'admin-permissions',
      conditional: { operator: '===', value: 'admin' },
      callable: async () => ({
        canEdit: true,
        canDelete: true,
        canModerate: true,
        canView: true
      })
    }),
    new Case({
      name: 'moderator-permissions',
      conditional: { operator: '===', value: 'moderator' },
      callable: async () => ({
        canEdit: true,
        canDelete: false,
        canModerate: true,
        canView: true
      })
    }),
    new Case({
      name: 'user-permissions',
      conditional: { operator: '===', value: 'user' },
      callable: async () => ({
        canEdit: false,
        canDelete: false,
        canModerate: false,
        canView: true
      })
    })
  ],
  default_callable: async () => ({
    canEdit: false,
    canDelete: false,
    canModerate: false,
    canView: false
  })
});

const permissions = await checkPermissions.execute();
console.log('User permissions:', permissions.result);
```

**Example (Node.js - API Version Routing):**
```javascript
import { SwitchStep, Case, Workflow } from 'micro-flow';

const apiVersion = 'v2';

const apiRouter = new SwitchStep({
  name: 'route-api-version',
  subject: apiVersion,
  cases: [
    new Case({
      name: 'v1-handler',
      conditional: { operator: '===', value: 'v1' },
      callable: async () => {
        return await handleV1Request();
      }
    }),
    new Case({
      name: 'v2-handler',
      conditional: { operator: '===', value: 'v2' },
      callable: async () => {
        return await handleV2Request();
      }
    }),
    new Case({
      name: 'v3-handler',
      conditional: { operator: '===', value: 'v3' },
      callable: async () => {
        return await handleV3Request();
      }
    })
  ],
  default_callable: async () => {
    throw new Error('Unsupported API version');
  }
});

await apiRouter.execute();
```

**Example (Node.js - Using LogicStep Instead of Case):**
```javascript
import { SwitchStep, LogicStep } from 'micro-flow';

const statusCode = 200;

// LogicStep instances can be used, but MUST have conditional.subject set
const handleStatus = new SwitchStep({
  name: 'handle-status',
  subject: statusCode,
  cases: [
    new LogicStep({
      name: 'success',
      conditional: {
        subject: statusCode,  // REQUIRED: Must set subject explicitly
        operator: '===',
        value: 200
      },
      callable: async () => ({ status: 'ok' })
    }),
    new LogicStep({
      name: 'not-found',
      conditional: {
        subject: statusCode,  // REQUIRED: Must set subject explicitly
        operator: '===',
        value: 404
      },
      callable: async () => ({ status: 'not_found' })
    })
  ],
  default_callable: async () => ({ status: 'unknown' })
});

await handleStatus.execute();
```

## Properties

- `cases` (Array\<Case|LogicStep\>) - Array of Case or LogicStep instances to evaluate
- `default_callable` (Function|Step|Workflow) - Function, Step, or Workflow to execute when no cases match
- `subject` (any) - Subject value to compare against each case

All properties inherited from [Step](step.md)

## Methods

### `async switch()`

Executes the switch logic by evaluating each case in order. Returns the result of the first matching case, or the default callable if no match is found.

**Returns:** Promise\<any\> - The result of the matched case or default callable

**Example (Node.js - Payment Method Handler):**
```javascript
import { SwitchStep, Case } from 'micro-flow';

const paymentMethod = 'credit_card';
const amount = 99.99;

const processPayment = new SwitchStep({
  name: 'process-payment',
  subject: paymentMethod,
  cases: [
    new Case({
      name: 'credit-card',
      conditional: { operator: '===', value: 'credit_card' },
      callable: async () => {
        console.log('Processing credit card payment');
        return await chargeCreditCard(amount);
      }
    }),
    new Case({
      name: 'paypal',
      conditional: { operator: '===', value: 'paypal' },
      callable: async () => {
        console.log('Processing PayPal payment');
        return await chargePayPal(amount);
      }
    }),
    new Case({
      name: 'bank-transfer',
      conditional: { operator: '===', value: 'bank_transfer' },
      callable: async () => {
        console.log('Initiating bank transfer');
        return await initiateBankTransfer(amount);
      }
    })
  ],
  default_callable: async () => {
    throw new Error('Invalid payment method');
  }
});

const result = await processPayment.execute();
console.log('Payment result:', result.result);
```

**Example (Browser - Theme Selector):**
```javascript
import { SwitchStep, Case } from './micro-flow.js';

const selectedTheme = localStorage.getItem('theme') || 'auto';

const applyTheme = new SwitchStep({
  name: 'apply-theme',
  subject: selectedTheme,
  cases: [
    new Case({
      name: 'dark-theme',
      conditional: { operator: '===', value: 'dark' },
      callable: async () => {
        document.body.classList.add('dark-theme');
        document.body.classList.remove('light-theme');
        return { theme: 'dark' };
      }
    }),
    new Case({
      name: 'light-theme',
      conditional: { operator: '===', value: 'light' },
      callable: async () => {
        document.body.classList.add('light-theme');
        document.body.classList.remove('dark-theme');
        return { theme: 'light' };
      }
    }),
    new Case({
      name: 'auto-theme',
      conditional: { operator: '===', value: 'auto' },
      callable: async () => {
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        document.body.classList.toggle('dark-theme', prefersDark);
        document.body.classList.toggle('light-theme', !prefersDark);
        return { theme: 'auto', resolved: prefersDark ? 'dark' : 'light' };
      }
    })
  ],
  default_callable: async () => {
    // Fallback to light theme
    document.body.classList.add('light-theme');
    return { theme: 'light' };
  }
});

await applyTheme.execute();
```

## Common Patterns

### Content Type Handler (Node.js)

```javascript
import { SwitchStep, Case } from 'micro-flow';

async function handleRequest(req, res) {
  const contentType = req.headers['content-type'];
  
  const contentHandler = new SwitchStep({
    name: 'handle-content-type',
    subject: contentType,
    cases: [
      new Case({
        name: 'json',
        conditional: { operator: '===', value: 'application/json' },
        callable: async () => {
          const data = await parseJSON(req.body);
          return await processJSON(data);
        }
      }),
      new Case({
        name: 'xml',
        conditional: { operator: '===', value: 'application/xml' },
        callable: async () => {
          const data = await parseXML(req.body);
          return await processXML(data);
        }
      }),
      new Case({
        name: 'form',
        conditional: { operator: '===', value: 'application/x-www-form-urlencoded' },
        callable: async () => {
          const data = await parseForm(req.body);
          return await processForm(data);
        }
      })
    ],
    default_callable: async () => {
      res.status(415).send('Unsupported Media Type');
      return { error: 'Unsupported content type' };
    }
  });
  
  const result = await contentHandler.execute();
  res.json(result.result);
}
```

### Environment Configuration (Node.js)

```javascript
import { SwitchStep, Case } from 'micro-flow';

const environment = process.env.NODE_ENV || 'development';

const loadConfig = new SwitchStep({
  name: 'load-environment-config',
  subject: environment,
  cases: [
    new Case({
      name: 'production',
      conditional: { operator: '===', value: 'production' },
      callable: async () => ({
        apiUrl: 'https://api.production.com',
        debug: false,
        logLevel: 'error',
        cacheEnabled: true,
        timeout: 5000
      })
    }),
    new Case({
      name: 'staging',
      conditional: { operator: '===', value: 'staging' },
      callable: async () => ({
        apiUrl: 'https://api.staging.com',
        debug: true,
        logLevel: 'warn',
        cacheEnabled: true,
        timeout: 10000
      })
    }),
    new Case({
      name: 'development',
      conditional: { operator: '===', value: 'development' },
      callable: async () => ({
        apiUrl: 'http://localhost:3000',
        debug: true,
        logLevel: 'debug',
        cacheEnabled: false,
        timeout: 30000
      })
    })
  ],
  default_callable: async () => ({
    apiUrl: 'http://localhost:3000',
    debug: true,
    logLevel: 'debug',
    cacheEnabled: false,
    timeout: 30000
  })
});

const config = await loadConfig.execute();
console.log('Loaded config:', config.result);
```

### File Type Processor (Node.js)

```javascript
import { SwitchStep, Case } from 'micro-flow';
import path from 'path';

async function processFile(filePath) {
  const extension = path.extname(filePath).toLowerCase();
  
  const fileProcessor = new SwitchStep({
    name: 'process-file-by-type',
    subject: extension,
    cases: [
      new Case({
        name: 'image',
        conditional: { operator: '===', value: '.jpg' },
        callable: async () => {
          return await processImage(filePath);
        }
      }),
      new Case({
        name: 'image-png',
        conditional: { operator: '===', value: '.png' },
        callable: async () => {
          return await processImage(filePath);
        }
      }),
      new Case({
        name: 'pdf',
        conditional: { operator: '===', value: '.pdf' },
        callable: async () => {
          return await processPDF(filePath);
        }
      }),
      new Case({
        name: 'video',
        conditional: { operator: '===', value: '.mp4' },
        callable: async () => {
          return await processVideo(filePath);
        }
      }),
      new Case({
        name: 'text',
        conditional: { operator: '===', value: '.txt' },
        callable: async () => {
          return await processText(filePath);
        }
      })
    ],
    default_callable: async () => {
      console.log('Unsupported file type:', extension);
      return { error: 'Unsupported file type', extension };
    }
  });
  
  return await fileProcessor.execute();
}

const result = await processFile('./document.pdf');
```

### Language Selector (Browser)

```javascript
import { SwitchStep, Case } from './micro-flow.js';

const userLanguage = navigator.language.split('-')[0];

const setLanguage = new SwitchStep({
  name: 'set-language',
  subject: userLanguage,
  cases: [
    new Case({
      name: 'english',
      conditional: { operator: '===', value: 'en' },
      callable: async () => {
        const translations = await fetch('/i18n/en.json').then(r => r.json());
        return { lang: 'en', translations };
      }
    }),
    new Case({
      name: 'spanish',
      conditional: { operator: '===', value: 'es' },
      callable: async () => {
        const translations = await fetch('/i18n/es.json').then(r => r.json());
        return { lang: 'es', translations };
      }
    }),
    new Case({
      name: 'french',
      conditional: { operator: '===', value: 'fr' },
      callable: async () => {
        const translations = await fetch('/i18n/fr.json').then(r => r.json());
        return { lang: 'fr', translations };
      }
    }),
    new Case({
      name: 'german',
      conditional: { operator: '===', value: 'de' },
      callable: async () => {
        const translations = await fetch('/i18n/de.json').then(r => r.json());
        return { lang: 'de', translations };
      }
    })
  ],
  default_callable: async () => {
    // Default to English
    const translations = await fetch('/i18n/en.json').then(r => r.json());
    return { lang: 'en', translations };
  }
});

const language = await setLanguage.execute();
console.log('Loaded language:', language.result.lang);
```

### Database Connection Router (Node.js)

```javascript
import { SwitchStep, Case, State } from 'micro-flow';

const dbType = process.env.DATABASE_TYPE || 'postgres';

const connectDatabase = new SwitchStep({
  name: 'connect-to-database',
  subject: dbType,
  cases: [
    new Case({
      name: 'postgres',
      conditional: { operator: '===', value: 'postgres' },
      callable: async () => {
        const { Pool } = await import('pg');
        const pool = new Pool({
          host: process.env.DB_HOST,
          database: process.env.DB_NAME,
          user: process.env.DB_USER,
          password: process.env.DB_PASSWORD
        });
        State.set('db', pool);
        return { type: 'postgres', connected: true };
      }
    }),
    new Case({
      name: 'mysql',
      conditional: { operator: '===', value: 'mysql' },
      callable: async () => {
        const mysql = await import('mysql2/promise');
        const connection = await mysql.createConnection({
          host: process.env.DB_HOST,
          database: process.env.DB_NAME,
          user: process.env.DB_USER,
          password: process.env.DB_PASSWORD
        });
        State.set('db', connection);
        return { type: 'mysql', connected: true };
      }
    }),
    new Case({
      name: 'mongodb',
      conditional: { operator: '===', value: 'mongodb' },
      callable: async () => {
        const { MongoClient } = await import('mongodb');
        const client = new MongoClient(process.env.MONGODB_URI);
        await client.connect();
        State.set('db', client);
        return { type: 'mongodb', connected: true };
      }
    })
  ],
  default_callable: async () => {
    throw new Error(`Unsupported database type: ${dbType}`);
  }
});

await connectDatabase.execute();
```

### Error Severity Handler (Node.js)

```javascript
import { SwitchStep, Case } from 'micro-flow';

class ErrorHandler {
  async handleError(error) {
    const severity = this.determineSeverity(error);
    
    const errorSwitch = new SwitchStep({
      name: 'handle-error-by-severity',
      subject: severity,
      cases: [
        new Case({
          name: 'critical',
          conditional: { operator: '===', value: 'critical' },
          callable: async () => {
            await this.notifyOps(error);
            await this.logToDatabase(error, 'critical');
            await this.shutdownGracefully();
            return { action: 'shutdown', notified: true };
          }
        }),
        new Case({
          name: 'error',
          conditional: { operator: '===', value: 'error' },
          callable: async () => {
            await this.notifyOps(error);
            await this.logToDatabase(error, 'error');
            return { action: 'logged', notified: true };
          }
        }),
        new Case({
          name: 'warning',
          conditional: { operator: '===', value: 'warning' },
          callable: async () => {
            await this.logToDatabase(error, 'warning');
            return { action: 'logged', notified: false };
          }
        }),
        new Case({
          name: 'info',
          conditional: { operator: '===', value: 'info' },
          callable: async () => {
            console.log('Info:', error.message);
            return { action: 'console', notified: false };
          }
        })
      ],
      default_callable: async () => {
        console.log('Unknown error severity:', error);
        return { action: 'ignored' };
      }
    });
    
    return await errorSwitch.execute();
  }
  
  determineSeverity(error) {
    if (error.code === 'ECONNREFUSED') return 'critical';
    if (error.name === 'ValidationError') return 'warning';
    if (error.statusCode >= 500) return 'error';
    return 'info';
  }
}
```

## Events

SwitchStep emits the following events during execution:

- `SWITCH_CASE_MATCHED` - Emitted when a case matches and is about to be executed

## Notes

- Cases are evaluated in the order they are defined in the `cases` array
- Only the first matching case is executed (no fall-through behavior)
- If no cases match, the `default_callable` is executed
- The `subject` is automatically passed to each Case instance via the `switch_subject` setter
- Each Case can use any comparison operator supported by LogicStep
- The switch method returns immediately after the first match, making it efficient for large case lists
- **LogicStep vs Case:** You can use plain LogicStep instances instead of Case, but they MUST have `conditional.subject` explicitly set. Case is more convenient as it allows SwitchStep to automatically set the subject

## Related

- [Case](case.md) - Individual case for SwitchStep
- [LogicStep](logic_step.md) - Base class for conditional logic
- [ConditionalStep](conditional_step.md) - For simple if/else logic
- [Step](step.md) - Base step class
- [conditional_step_comparators enum](../../enums/conditional_step_comparators.md) - Available comparison operators
