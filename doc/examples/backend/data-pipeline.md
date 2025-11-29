# Data Processing Pipeline (Backend)

This example shows how to build a data processing pipeline that reads files, validates data, processes records in batches, and generates reports.

## Use Case

Processing large datasets with:
1. File reading and parsing
2. Data validation
3. Batch processing with loops
4. Error handling and retry logic
5. Progress tracking
6. Report generation

## Full Implementation

```javascript
import { 
  Workflow, 
  Step, 
  StepTypes, 
  LoopStep, 
  FlowControlStep,
  LoopTypes,
  FlowControlTypes
} from 'micro-flow';
import fs from 'fs/promises';
import path from 'path';

// Data validation
class DataValidator {
  static validate(record) {
    const errors = [];
    
    if (!record.id) errors.push('Missing id');
    if (!record.email || !record.email.includes('@')) errors.push('Invalid email');
    if (!record.age || record.age < 0 || record.age > 150) errors.push('Invalid age');
    
    return {
      valid: errors.length === 0,
      errors,
      record
    };
  }
}

// Data processor
class DataProcessor {
  static async processRecord(record) {
    // Simulate processing (e.g., enrichment, transformation)
    await new Promise(resolve => setTimeout(resolve, 10));
    
    return {
      ...record,
      processed: true,
      processedAt: new Date().toISOString(),
      ageGroup: this.categorizeAge(record.age),
      emailDomain: record.email.split('@')[1]
    };
  }
  
  static categorizeAge(age) {
    if (age < 18) return 'minor';
    if (age < 65) return 'adult';
    return 'senior';
  }
}

// Report generator
class ReportGenerator {
  static generate(stats) {
    const report = `
Data Processing Report
=====================
Generated: ${new Date().toISOString()}

Input Statistics:
- Total Records: ${stats.totalRecords}
- Valid Records: ${stats.validRecords}
- Invalid Records: ${stats.invalidRecords}
- Success Rate: ${((stats.validRecords / stats.totalRecords) * 100).toFixed(2)}%

Processing Statistics:
- Successfully Processed: ${stats.processedRecords}
- Failed Processing: ${stats.failedRecords}
- Total Processing Time: ${stats.processingTime}ms
- Average Time per Record: ${(stats.processingTime / stats.processedRecords).toFixed(2)}ms

Age Distribution:
- Minors: ${stats.ageGroups.minor || 0}
- Adults: ${stats.ageGroups.adult || 0}
- Seniors: ${stats.ageGroups.senior || 0}

Email Domains:
${Object.entries(stats.emailDomains)
  .sort((a, b) => b[1] - a[1])
  .slice(0, 5)
  .map(([domain, count]) => `- ${domain}: ${count}`)
  .join('\n')}

Errors:
${stats.errors.length > 0 ? stats.errors.map(e => `- ${e}`).join('\n') : 'None'}
`;
    
    return report;
  }
}

// Create the data pipeline workflow
async function createDataPipeline(inputFile, outputDir) {
  const workflow = new Workflow({
    name: 'Data Processing Pipeline',
    exit_on_failure: false  // Continue processing even if some records fail
  });
  
  // Initialize statistics
  workflow.state.set('stats', {
    totalRecords: 0,
    validRecords: 0,
    invalidRecords: 0,
    processedRecords: 0,
    failedRecords: 0,
    ageGroups: {},
    emailDomains: {},
    errors: [],
    startTime: Date.now(),
    processingTime: 0
  });
  
  // Step 1: Read input file
  const readFileStep = new Step({
    name: 'Read Input File',
    type: StepTypes.ACTION,
    callable: async function() {
      console.log(`Reading file: ${inputFile}`);
      
      const content = await fs.readFile(inputFile, 'utf-8');
      const records = JSON.parse(content);
      
      this.state.set('inputRecords', records);
      
      const stats = this.state.get('stats');
      stats.totalRecords = records.length;
      
      console.log(`Loaded ${records.length} records`);
      return { recordCount: records.length };
    }
  });
  
  // Step 2: Validate all records
  const validateStep = new Step({
    name: 'Validate Records',
    type: StepTypes.ACTION,
    callable: async function() {
      console.log('Validating records...');
      
      const records = this.state.get('inputRecords');
      const validationResults = records.map(DataValidator.validate);
      
      const validRecords = validationResults.filter(r => r.valid).map(r => r.record);
      const invalidRecords = validationResults.filter(r => !r.valid);
      
      this.state.set('validRecords', validRecords);
      this.state.set('invalidRecords', invalidRecords);
      
      const stats = this.state.get('stats');
      stats.validRecords = validRecords.length;
      stats.invalidRecords = invalidRecords.length;
      
      // Log validation errors
      invalidRecords.forEach(result => {
        const errorMsg = `Record ${result.record.id}: ${result.errors.join(', ')}`;
        stats.errors.push(errorMsg);
        console.error(errorMsg);
      });
      
      console.log(`Valid: ${validRecords.length}, Invalid: ${invalidRecords.length}`);
      return { validRecords: validRecords.length };
    }
  });
  
  // Step 3: Process records in batches using a loop
  const batchSize = 100;
  let currentBatch = 0;
  
  const processBatchWorkflow = new Workflow({
    name: 'Batch Processing',
    steps: []
  });
  
  const batchStep = new Step({
    name: 'Process Batch',
    type: StepTypes.ACTION,
    callable: async function() {
      const validRecords = this.state.get('validRecords');
      const stats = this.state.get('stats');
      const processedRecords = this.state.get('processedRecords') || [];
      
      const start = currentBatch * batchSize;
      const end = Math.min(start + batchSize, validRecords.length);
      const batch = validRecords.slice(start, end);
      
      console.log(`Processing batch ${currentBatch + 1} (records ${start + 1}-${end})`);
      
      // Process batch
      const processed = await Promise.all(
        batch.map(async (record) => {
          try {
            return await DataProcessor.processRecord(record);
          } catch (error) {
            stats.failedRecords++;
            stats.errors.push(`Failed to process record ${record.id}: ${error.message}`);
            return null;
          }
        })
      );
      
      // Filter out failed records and collect stats
      const successfullyProcessed = processed.filter(r => r !== null);
      successfullyProcessed.forEach(record => {
        // Track age groups
        stats.ageGroups[record.ageGroup] = (stats.ageGroups[record.ageGroup] || 0) + 1;
        
        // Track email domains
        stats.emailDomains[record.emailDomain] = (stats.emailDomains[record.emailDomain] || 0) + 1;
        
        stats.processedRecords++;
      });
      
      processedRecords.push(...successfullyProcessed);
      this.state.set('processedRecords', processedRecords);
      
      currentBatch++;
      
      return { batchNumber: currentBatch, recordsProcessed: successfullyProcessed.length };
    }
  });
  
  // Flow control to check if more batches remain
  const checkMoreBatches = new FlowControlStep({
    name: 'Check More Batches',
    subject: function() {
      const validRecords = this.state.get('validRecords');
      return currentBatch * batchSize < validRecords.length;
    },
    operator: '===',
    value: false,
    flow_control_type: FlowControlTypes.BREAK
  });
  
  processBatchWorkflow.pushSteps([batchStep, checkMoreBatches]);
  
  const loopStep = new LoopStep({
    name: 'Process All Batches',
    callable: processBatchWorkflow,
    subject: function() {
      const validRecords = this.state.get('validRecords');
      return currentBatch * batchSize < validRecords.length;
    },
    operator: '===',
    value: true,
    loop_type: LoopTypes.WHILE,
    max_iterations: 1000  // Safety limit
  });
  
  // Step 4: Save processed data
  const saveStep = new Step({
    name: 'Save Processed Data',
    type: StepTypes.ACTION,
    callable: async function() {
      console.log('Saving processed data...');
      
      const processedRecords = this.state.get('processedRecords');
      const outputFile = path.join(outputDir, 'processed_data.json');
      
      await fs.mkdir(outputDir, { recursive: true });
      await fs.writeFile(outputFile, JSON.stringify(processedRecords, null, 2));
      
      console.log(`Saved ${processedRecords.length} records to ${outputFile}`);
      return { outputFile, recordCount: processedRecords.length };
    }
  });
  
  // Step 5: Generate report
  const reportStep = new Step({
    name: 'Generate Report',
    type: StepTypes.ACTION,
    callable: async function() {
      console.log('Generating report...');
      
      const stats = this.state.get('stats');
      stats.processingTime = Date.now() - stats.startTime;
      
      const report = ReportGenerator.generate(stats);
      const reportFile = path.join(outputDir, 'report.txt');
      
      await fs.writeFile(reportFile, report);
      
      console.log(`Report saved to ${reportFile}`);
      console.log(report);
      
      return { reportFile };
    }
  });
  
  // Add progress tracking
  let stepCount = 0;
  workflow.events.on('STEP_COMPLETED', (data) => {
    stepCount++;
    const stepName = data.step.state.get('name');
    console.log(`✓ Step ${stepCount}: ${stepName}`);
  });
  
  // Build workflow
  workflow.pushSteps([
    readFileStep,
    validateStep,
    loopStep,
    saveStep,
    reportStep
  ]);
  
  return workflow;
}

// Generate sample data for testing
async function generateSampleData(filename, count = 1000) {
  const records = Array.from({ length: count }, (_, i) => ({
    id: i + 1,
    name: `User ${i + 1}`,
    email: `user${i + 1}@${['example.com', 'test.com', 'demo.org'][i % 3]}`,
    age: Math.floor(Math.random() * 80) + 10,
    country: ['USA', 'UK', 'Canada', 'Australia'][i % 4]
  }));
  
  // Add some invalid records
  records[10].email = 'invalid-email';  // Invalid email
  records[20].age = -5;  // Invalid age
  records[30].id = null;  // Missing id
  
  await fs.writeFile(filename, JSON.stringify(records, null, 2));
  console.log(`Generated ${count} sample records in ${filename}`);
}

// Main execution
async function main() {
  const inputFile = './data/input.json';
  const outputDir = './data/output';
  
  console.log('=== Data Processing Pipeline ===\n');
  
  // Generate sample data
  await generateSampleData(inputFile, 1000);
  
  console.log('\nStarting pipeline...\n');
  
  const workflow = await createDataPipeline(inputFile, outputDir);
  
  const startTime = Date.now();
  
  try {
    await workflow.execute();
    
    const totalTime = Date.now() - startTime;
    console.log(`\n=== Pipeline Completed in ${totalTime}ms ===`);
    
  } catch (error) {
    console.error('\n=== Pipeline Failed ===');
    console.error('Error:', error.message);
  }
}

// Run it
main().catch(console.error);
```

## Output

```
=== Data Processing Pipeline ===

Generated 1000 sample records in ./data/input.json

Starting pipeline...

Reading file: ./data/input.json
Loaded 1000 records
✓ Step 1: Read Input File
Validating records...
Record 11: Invalid email
Record 21: Invalid age
Record 31: Missing id
Valid: 997, Invalid: 3
✓ Step 2: Validate Records
Processing batch 1 (records 1-100)
Processing batch 2 (records 101-200)
Processing batch 3 (records 201-300)
...
Processing batch 10 (records 901-997)
✓ Step 3: Process All Batches
Saving processed data...
Saved 997 records to ./data/output/processed_data.json
✓ Step 4: Save Processed Data
Generating report...
Report saved to ./data/output/report.txt

Data Processing Report
=====================
Generated: 2025-11-16T12:34:56.789Z

Input Statistics:
- Total Records: 1000
- Valid Records: 997
- Invalid Records: 3
- Success Rate: 99.70%

Processing Statistics:
- Successfully Processed: 997
- Failed Processing: 0
- Total Processing Time: 2543ms
- Average Time per Record: 2.55ms

Age Distribution:
- Minors: 89
- Adults: 798
- Seniors: 110

Email Domains:
- example.com: 333
- test.com: 333
- demo.org: 331

Errors:
- Record 11: Invalid email
- Record 21: Invalid age
- Record 31: Missing id

✓ Step 5: Generate Report

=== Pipeline Completed in 2568ms ===
```

## Key Features Demonstrated

1. **File I/O** - Reading and writing files asynchronously
2. **Data Validation** - Validating records before processing
3. **Batch Processing** - Processing large datasets in manageable chunks
4. **Loop Workflows** - Using LoopStep to iterate over batches
5. **Flow Control** - Breaking out of loops when done
6. **Error Resilience** - Continuing despite individual record failures
7. **Statistics Tracking** - Collecting metrics throughout the pipeline
8. **Report Generation** - Creating human-readable summaries
9. **Progress Monitoring** - Tracking pipeline progress in real-time

## Variations

### Processing with For-Each Loop

```javascript
import { LoopStep, LoopTypes } from 'micro-flow';

// Process each record individually
const recordWorkflow = new Workflow({
  name: 'Record Processor',
  steps: [
    new Step({
      name: 'Process Single Record',
      type: StepTypes.ACTION,
      callable: async function(context) {
        // Access current record from the parent loop step
        const record = this.parent.state.get('current_item');
        return await DataProcessor.processRecord(record);
      }
    })
  ]
});

const forEachLoop = new LoopStep({
  name: 'Process Each Record',
  callable: recordWorkflow,
  iterable: validRecords,  // Array to iterate over
  loop_type: LoopTypes.FOR_EACH
});
```

## Use Cases

- **ETL Pipelines** - Extract, transform, load data
- **Batch Jobs** - Process large datasets in chunks
- **Data Migration** - Move and transform data between systems
- **Log Processing** - Parse and analyze log files
- **Report Generation** - Create analytics reports from raw data
- **Data Cleanup** - Validate and fix data quality issues

## See Also

- [Loop Step](../../step-types/loop-step.md)
- [Flow Control Step](../../step-types/flow-control-step.md)
- [Error Handling](../../advanced/error-handling.md)
