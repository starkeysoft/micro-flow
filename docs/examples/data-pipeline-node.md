# Data Pipeline — Node.js

A multi-step ETL (Extract, Transform, Load) pipeline built with `Workflow`, `Step`, `LoopStep`, `ConditionalStep`, and the `State` singleton. Data flows between steps exclusively through shared state — no argument passing required.

## Overview

You will learn:
- Building an end-to-end ETL pipeline with clearly separated stages
- Using `State` as the pipeline bus between steps
- Processing each record with a `LoopStep`
- Branching with `ConditionalStep` to handle data quality checks
- Aggregating statistics across the pipeline run
- Structured error handling with `exit_on_error: false`

## Complete Example

```javascript
import {
  Workflow,
  Step,
  LoopStep,
  ConditionalStep,
  State,
  loop_types,
} from '@ronaldroe/micro-flow';

// ─── Simulated source data ─────────────────────────────────────────────────────

const SOURCE_RECORDS = [
  { id: 1,  name: 'Alice Johnson',   email: 'alice@example.com',  revenue: '1200.50', country: 'US', active: true },
  { id: 2,  name: 'Bob Smith',       email: 'invalid-email',      revenue: '800.00',  country: 'UK', active: true },
  { id: 3,  name: 'Carol Williams',  email: 'carol@example.com',  revenue: '-50.00',  country: 'CA', active: false },
  { id: 4,  name: 'David Brown',     email: 'david@example.com',  revenue: '3400.75', country: 'US', active: true },
  { id: 5,  name: '  ',              email: 'empty@example.com',  revenue: '500.00',  country: 'AU', active: true },
  { id: 6,  name: 'Eve Davis',       email: 'eve@example.com',    revenue: '2100.00', country: 'DE', active: true },
  { id: 7,  name: 'Frank Miller',    email: 'frank@example.com',  revenue: '950.25',  country: 'US', active: false },
  { id: 8,  name: 'Grace Lee',       email: 'grace@example.com',  revenue: '4800.00', country: 'JP', active: true },
];

// ─── Validation helper ────────────────────────────────────────────────────────

function validateRecord(record) {
  const errors = [];
  if (!record.name?.trim()) errors.push('name is empty');
  if (!record.email?.includes('@')) errors.push('email is invalid');
  if (parseFloat(record.revenue) < 0) errors.push('revenue is negative');
  return errors;
}

// ─── Simulated database ───────────────────────────────────────────────────────

const database = { customers: [] };

// ─── Pipeline workflow ────────────────────────────────────────────────────────

const etlPipeline = new Workflow({
  name: 'customer-etl-pipeline',
  exit_on_error: false,
  steps: [

    // ── Stage 1: Extract ───────────────────────────────────────────────────────
    new Step({
      name: 'extract',
      callable: async function () {
        console.log('Stage 1: Extracting source data...');

        // In production this would be an API call, file read, or database query
        const raw = SOURCE_RECORDS;

        this.setState('pipeline.raw', raw);
        this.setState('pipeline.stats.extracted', raw.length);

        console.log(`  Extracted ${raw.length} records`);
        return { count: raw.length };
      },
    }),

    // ── Stage 2: Validate and partition ───────────────────────────────────────
    new Step({
      name: 'validate',
      callable: async function () {
        console.log('Stage 2: Validating records...');

        const raw = this.getState('pipeline.raw');
        const valid   = [];
        const invalid = [];

        for (const record of raw) {
          const errors = validateRecord(record);
          if (errors.length > 0) {
            invalid.push({ record, errors });
          } else {
            valid.push(record);
          }
        }

        this.setState('pipeline.valid',   valid);
        this.setState('pipeline.invalid', invalid);
        this.setState('pipeline.stats.valid',   valid.length);
        this.setState('pipeline.stats.invalid', invalid.length);

        console.log(`  Valid:   ${valid.length}`);
        console.log(`  Invalid: ${invalid.length}`);
        if (invalid.length > 0) {
          console.log('  Invalid records:');
          invalid.forEach((i) => console.log(`    ID ${i.record.id}: ${i.errors.join(', ')}`));
        }

        return { valid: valid.length, invalid: invalid.length };
      },
    }),

    // ── Stage 3: Check there's valid data to process ──────────────────────────
    new ConditionalStep({
      name: 'check-has-valid-data',
      conditional: {
        subject: () => State.get('pipeline.stats.valid'),
        operator: '>',
        value: 0,
      },
      true_callable: async function () {
        console.log('Stage 3: Data quality check passed — proceeding');
        return { proceed: true };
      },
      false_callable: async function () {
        console.error('Stage 3: No valid records — aborting pipeline');
        this.setState('pipeline.aborted', true);
        throw new Error('Pipeline aborted: no valid records to process');
      },
    }),

    // ── Stage 4: Transform (per-record via LoopStep) ──────────────────────────
    new LoopStep({
      name: 'transform',
      loop_type: loop_types.FOR_EACH,
      iterable: () => State.get('pipeline.valid'),
      callable: async function () {
        const record = this.current_item;

        const transformed = {
          id:           record.id,
          fullName:     record.name.trim(),
          emailAddress: record.email.toLowerCase(),
          revenueUsd:   Math.round(parseFloat(record.revenue) * 100) / 100,
          countryCode:  record.country.toUpperCase(),
          isActive:     Boolean(record.active),
          processedAt:  new Date().toISOString(),
        };

        // Append to transformed list in state
        const existing = this.getState('pipeline.transformed') ?? [];
        this.setState('pipeline.transformed', [...existing, transformed]);

        return transformed;
      },
    }),

    // ── Stage 5: Enrich — add region labels ───────────────────────────────────
    new Step({
      name: 'enrich',
      callable: async function () {
        console.log('Stage 5: Enriching records with region data...');

        const regionMap = {
          US: 'North America', CA: 'North America', MX: 'North America',
          UK: 'Europe', DE: 'Europe', FR: 'Europe',
          JP: 'Asia Pacific', AU: 'Asia Pacific', SG: 'Asia Pacific',
        };

        const transformed = this.getState('pipeline.transformed') ?? [];
        const enriched = transformed.map((r) => ({
          ...r,
          region: regionMap[r.countryCode] ?? 'Other',
        }));

        this.setState('pipeline.enriched', enriched);
        console.log(`  Enriched ${enriched.length} records`);
        return { count: enriched.length };
      },
    }),

    // ── Stage 6: Load into "database" ─────────────────────────────────────────
    new Step({
      name: 'load',
      callable: async function () {
        console.log('Stage 6: Loading into database...');

        const enriched = this.getState('pipeline.enriched') ?? [];

        // Simulate a batch insert
        await new Promise((r) => setTimeout(r, 20));
        database.customers.push(...enriched);

        this.setState('pipeline.stats.loaded', enriched.length);
        console.log(`  Loaded ${enriched.length} records`);
        return { loaded: enriched.length };
      },
    }),

    // ── Stage 7: Summarize ────────────────────────────────────────────────────
    new Step({
      name: 'summarize',
      callable: async function () {
        const enriched = this.getState('pipeline.enriched') ?? [];

        const totalRevenue = enriched.reduce((sum, r) => sum + r.revenueUsd, 0);
        const byRegion = enriched.reduce((acc, r) => {
          acc[r.region] = (acc[r.region] ?? 0) + 1;
          return acc;
        }, {});
        const activeCount = enriched.filter((r) => r.isActive).length;

        const summary = {
          totalRecords:    enriched.length,
          totalRevenueUsd: Math.round(totalRevenue * 100) / 100,
          activeCustomers: activeCount,
          byRegion,
          runAt: new Date().toISOString(),
        };

        this.setState('pipeline.summary', summary);
        return summary;
      },
    }),
  ],
});

// ─── Execute ──────────────────────────────────────────────────────────────────

console.log('Starting ETL pipeline...\n');
const result = await etlPipeline.execute();

// ─── Report ───────────────────────────────────────────────────────────────────

console.log('\n' + '='.repeat(50));
console.log('Pipeline complete');
console.log('Status:  ', result.status);
console.log('Duration:', result.timing.execution_time_ms + 'ms');
console.log('');

const stats   = State.get('pipeline.stats');
const summary = State.get('pipeline.summary');

console.log('Extraction stats:');
console.log('  Extracted:', stats?.extracted);
console.log('  Valid:    ', stats?.valid);
console.log('  Invalid:  ', stats?.invalid);
console.log('  Loaded:   ', stats?.loaded);
console.log('');

if (summary) {
  console.log('Pipeline summary:');
  console.log('  Total revenue: $' + summary.totalRevenueUsd);
  console.log('  Active customers:', summary.activeCustomers, '/', summary.totalRecords);
  console.log('  By region:');
  for (const [region, count] of Object.entries(summary.byRegion)) {
    console.log(`    ${region}: ${count}`);
  }
}
```

## Key Concepts

### State as the Pipeline Bus

Each stage reads its input from `State` and writes its output back. For example, `extract` writes `pipeline.raw`, `validate` reads `pipeline.raw` and writes `pipeline.valid`, and so on. This decouples stages — you can reorder, skip, or replace any stage independently.

### LoopStep for Per-Record Processing

Stage 4 uses a `LoopStep` with `loop_type: loop_types.FOR_EACH` and a dynamic iterable (`() => State.get('pipeline.valid')`). The iterable is a function so it is evaluated at execution time — after the validate stage has populated the state. Inside the callable, `this.current_item` holds the current record.

### ConditionalStep for Data Quality Gates

The `check-has-valid-data` step acts as a gate: if zero valid records exist it throws, triggering `exit_on_error`-independent failure handling. This prevents wasted work in downstream stages.

### Non-Halting Error Collection

`exit_on_error: false` allows all steps to run even if earlier ones fail. After execution, you can inspect `result.results` for failed steps and read error details from `step.errors`.

## Related Examples

- [Basic Workflow — Node.js](basic-workflow-node.md) — Foundational patterns
- [API Integration — Node.js](api-integration-node.md) — HTTP calls with retries
- [Step Hopping — Node.js](step-hopping-node.md) — Dynamic step manipulation
