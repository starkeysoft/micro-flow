# Data Processing Pipeline - Node.js

An ETL (Extract, Transform, Load) pipeline example using workflows.

## Overview

This example demonstrates building a data processing pipeline that extracts data from an API, transforms it, and loads it into a database.

## Code

```javascript
import { Workflow, Step, ConditionalStep, State } from 'micro-flow';
import fs from 'fs/promises';
import fetch from 'node-fetch';

// Simulated database
const database = {
  records: [],
  insert: async (data) => {
    database.records.push(...data);
    return database.records.length;
  }
};

// Create ETL workflow
const etlWorkflow = new Workflow({
  name: 'etl-pipeline',
  exit_on_error: true,
  steps: [
    // Extract step
    new Step({
      name: 'extract-data',
      callable: async () => {
        console.log('Extracting data from API...');
        const response = await fetch('https://jsonplaceholder.typicode.com/users');
        const users = await response.json();
        
        State.set('pipeline.raw', users);
        State.set('pipeline.count', users.length);
        
        console.log(`Extracted ${users.length} records`);
        return users;
      }
    }),

    // Validate step
    new ConditionalStep({
      name: 'validate-data',
      conditional: {
        subject: State.get('pipeline.count'),
        operator: '>',
        value: 0
      },
      true_callable: async () => {
        console.log('Data validation passed');
        return { valid: true };
      },
      false_callable: async () => {
        throw new Error('No data to process');
      }
    }),

    // Transform step
    new Step({
      name: 'transform-data',
      callable: async () => {
        console.log('Transforming data...');
        const raw = State.get('pipeline.raw');
        
        const transformed = raw.map(user => ({
          id: user.id,
          name: user.name,
          email: user.email.toLowerCase(),
          company: user.company.name,
          city: user.address.city,
          processed_at: new Date().toISOString()
        }));
        
        State.set('pipeline.transformed', transformed);
        console.log(`Transformed ${transformed.length} records`);
        return transformed;
      }
    }),

    // Load step
    new Step({
      name: 'load-data',
      callable: async () => {
        console.log('Loading data into database...');
        const transformed = State.get('pipeline.transformed');
        
        const count = await database.insert(transformed);
        console.log(`Loaded ${transformed.length} records. Total in DB: ${count}`);
        
        return { loaded: transformed.length, total: count };
      }
    }),

    // Archive step
    new Step({
      name: 'archive-data',
      callable: async () => {
        console.log('Archiving raw data...');
        const raw = State.get('pipeline.raw');
        
        await fs.writeFile(
          './data-archive.json',
          JSON.stringify(raw, null, 2)
        );
        
        console.log('Data archived to data-archive.json');
        return { archived: true };
      }
    })
  ]
});

// Execute the pipeline
console.log('Starting ETL pipeline...\n');

const result = await etlWorkflow.execute();

console.log('\n=== Pipeline Complete ===');
console.log('Status:', result.status);
console.log('Execution time:', result.timing.execution_time_ms, 'ms');
console.log('Records in database:', database.records.length);
```

## Output

```
Starting ETL pipeline...

Extracting data from API...
Extracted 10 records
Data validation passed
Transforming data...
Transformed 10 records
Loading data into database...
Loaded 10 records. Total in DB: 10
Archiving raw data...
Data archived to data-archive.json

=== Pipeline Complete ===
Status: complete
Execution time: 892 ms
Records in database: 10
```

## Key Features

- **Extract**: Fetches data from external API
- **Validate**: Ensures data quality before processing
- **Transform**: Normalizes and enriches data
- **Load**: Persists to database
- **Archive**: Saves raw data for audit trail

## Error Handling

```javascript
// Add error recovery
const safeETL = new Workflow({
  name: 'safe-etl',
  exit_on_error: false,
  steps: [
    ...etlWorkflow.steps,
    new Step({
      name: 'error-notification',
      callable: async () => {
        const errors = State.get('pipeline.errors') || [];
        if (errors.length > 0) {
          console.error('Pipeline errors:', errors);
          // Send notification
        }
      }
    })
  ]
});
```

## Related Examples

- [API Integration](api-integration-node.md)
- [Basic Workflow](basic-workflow-node.md)
