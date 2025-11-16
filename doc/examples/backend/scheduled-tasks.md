# Scheduled Task Runner (Backend)

This example demonstrates building a scheduled task runner using Micro Flow with cron-style scheduling, task queues, and monitoring.

## Use Case

An automated task system that:
1. Runs scheduled maintenance tasks
2. Processes queued jobs
3. Monitors system health
4. Sends notifications
5. Handles failures and retries

## Full Implementation

```javascript
import { 
  Workflow, 
  Step, 
  StepTypes, 
  DelayStep,
  DelayTypes,
  ConditionalStep,
  LoopStep,
  LoopTypes
} from 'micro-flow';
import { parseISO, addHours, addMinutes, isBefore } from 'date-fns';

// Task queue simulation
class TaskQueue {
  constructor() {
    this.tasks = [];
  }
  
  enqueue(task) {
    this.tasks.push({
      ...task,
      id: Math.random().toString(36).substr(2, 9),
      status: 'pending',
      enqueuedAt: new Date(),
      attempts: 0
    });
  }
  
  dequeue() {
    return this.tasks.find(t => t.status === 'pending');
  }
  
  markComplete(taskId) {
    const task = this.tasks.find(t => t.id === taskId);
    if (task) {
      task.status = 'completed';
      task.completedAt = new Date();
    }
  }
  
  markFailed(taskId, error) {
    const task = this.tasks.find(t => t.id === taskId);
    if (task) {
      task.status = 'failed';
      task.error = error;
      task.failedAt = new Date();
    }
  }
  
  retry(taskId) {
    const task = this.tasks.find(t => t.id === taskId);
    if (task && task.attempts < 3) {
      task.status = 'pending';
      task.attempts++;
      return true;
    }
    return false;
  }
  
  getStats() {
    return {
      total: this.tasks.length,
      pending: this.tasks.filter(t => t.status === 'pending').length,
      completed: this.tasks.filter(t => t.status === 'completed').length,
      failed: this.tasks.filter(t => t.status === 'failed').length
    };
  }
}

// Notification service
class NotificationService {
  static async send(message, priority = 'info') {
    console.log(`📧 [${priority.toUpperCase()}] ${message}`);
    // In real app: send email, Slack message, etc.
    await new Promise(resolve => setTimeout(resolve, 100));
    return { sent: true };
  }
}

// Database maintenance simulation
class DatabaseMaintenance {
  static async vacuum() {
    console.log('Running database vacuum...');
    await new Promise(resolve => setTimeout(resolve, 1000));
    return { freedSpace: '1.2GB', duration: 1000 };
  }
  
  static async analyze() {
    console.log('Analyzing database tables...');
    await new Promise(resolve => setTimeout(resolve, 500));
    return { tablesAnalyzed: 42, duration: 500 };
  }
  
  static async backup() {
    console.log('Creating database backup...');
    await new Promise(resolve => setTimeout(resolve, 2000));
    return { 
      backupFile: `/backups/db_${Date.now()}.sql`,
      size: '524MB',
      duration: 2000
    };
  }
}

// System monitoring
class SystemMonitor {
  static async checkHealth() {
    const metrics = {
      cpu: Math.random() * 100,
      memory: Math.random() * 100,
      disk: Math.random() * 100,
      responseTime: Math.random() * 1000
    };
    
    await new Promise(resolve => setTimeout(resolve, 200));
    
    return {
      healthy: metrics.cpu < 90 && metrics.memory < 90 && metrics.disk < 90,
      metrics
    };
  }
  
  static async checkServices() {
    const services = ['api', 'database', 'cache', 'queue'];
    const statuses = {};
    
    for (const service of services) {
      await new Promise(resolve => setTimeout(resolve, 100));
      statuses[service] = Math.random() > 0.1 ? 'up' : 'down';
    }
    
    return {
      allUp: Object.values(statuses).every(s => s === 'up'),
      statuses
    };
  }
}

// Task processor
class TaskProcessor {
  static async processEmail(task) {
    console.log(`Sending email to ${task.data.recipient}...`);
    await new Promise(resolve => setTimeout(resolve, 300));
    return { sent: true, messageId: 'msg_' + Date.now() };
  }
  
  static async processReport(task) {
    console.log(`Generating report: ${task.data.reportType}...`);
    await new Promise(resolve => setTimeout(resolve, 1500));
    return { 
      reportFile: `/reports/${task.data.reportType}_${Date.now()}.pdf`,
      pages: Math.floor(Math.random() * 50) + 10
    };
  }
  
  static async processDataSync(task) {
    console.log(`Syncing data from ${task.data.source}...`);
    await new Promise(resolve => setTimeout(resolve, 800));
    return { 
      recordsSynced: Math.floor(Math.random() * 1000) + 100,
      duration: 800
    };
  }
}

// Create scheduled maintenance workflow
function createMaintenanceWorkflow() {
  const workflow = new Workflow({
    name: 'Scheduled Maintenance',
    exit_on_failure: false
  });
  
  // Step 1: Check if maintenance window is open
  const checkWindowStep = new ConditionalStep({
    name: 'Check Maintenance Window',
    subject: () => {
      const hour = new Date().getHours();
      return hour >= 2 && hour < 4; // 2 AM - 4 AM
    },
    operator: '===',
    value: true,
    step_left: new Step({
      name: 'Proceed with Maintenance',
      type: StepTypes.ACTION,
      callable: async () => {
        console.log('✓ Maintenance window is open');
        return { proceed: true };
      }
    }),
    step_right: new Step({
      name: 'Skip Maintenance',
      type: StepTypes.ACTION,
      callable: async () => {
        console.log('⏰ Outside maintenance window - skipping');
        throw new Error('Outside maintenance window');
      }
    })
  });
  
  // Step 2: Notify start
  const notifyStartStep = new Step({
    name: 'Notify Maintenance Start',
    type: StepTypes.ACTION,
    callable: async () => {
      return await NotificationService.send('Starting scheduled maintenance', 'info');
    }
  });
  
  // Step 3: Database vacuum
  const vacuumStep = new Step({
    name: 'Database Vacuum',
    type: StepTypes.ACTION,
    callable: async function() {
      const result = await DatabaseMaintenance.vacuum();
      this.workflow.set('vacuumResult', result);
      return result;
    }
  });
  
  // Step 4: Database analyze
  const analyzeStep = new Step({
    name: 'Database Analyze',
    type: StepTypes.ACTION,
    callable: async function() {
      const result = await DatabaseMaintenance.analyze();
      this.workflow.set('analyzeResult', result);
      return result;
    }
  });
  
  // Step 5: Create backup
  const backupStep = new Step({
    name: 'Database Backup',
    type: StepTypes.ACTION,
    callable: async function() {
      const result = await DatabaseMaintenance.backup();
      this.workflow.set('backupResult', result);
      return result;
    }
  });
  
  // Step 6: Notify completion
  const notifyEndStep = new Step({
    name: 'Notify Maintenance Complete',
    type: StepTypes.ACTION,
    callable: async function() {
      const vacuum = this.workflow.get('vacuumResult');
      const analyze = this.workflow.get('analyzeResult');
      const backup = this.workflow.get('backupResult');
      
      const message = `
Maintenance completed:
- Vacuum: ${vacuum.freedSpace} freed
- Analyze: ${analyze.tablesAnalyzed} tables
- Backup: ${backup.size} (${backup.backupFile})
      `.trim();
      
      return await NotificationService.send(message, 'success');
    }
  });
  
  workflow.pushSteps([
    checkWindowStep,
    notifyStartStep,
    vacuumStep,
    analyzeStep,
    backupStep,
    notifyEndStep
  ]);
  
  // Error handling
  workflow.events.on('WORKFLOW_ERRORED', async (data) => {
    if (data.error.message !== 'Outside maintenance window') {
      await NotificationService.send(
        `Maintenance failed: ${data.error.message}`,
        'error'
      );
    }
  });
  
  return workflow;
}

// Create task queue processor workflow
function createTaskProcessorWorkflow(taskQueue) {
  const workflow = new Workflow({
    name: 'Task Queue Processor',
    exit_on_failure: false
  });
  
  let processedTasks = 0;
  
  // Create processing workflow
  const processingWorkflow = new Workflow({ name: 'Process Single Task' });
  
  const processStep = new Step({
    name: 'Process Task',
    type: StepTypes.ACTION,
    callable: async function() {
      const task = taskQueue.dequeue();
      
      if (!task) {
        this.workflow.set('noMoreTasks', true);
        return { noTasks: true };
      }
      
      console.log(`Processing task ${task.id} (${task.type}) - Attempt ${task.attempts + 1}`);
      
      try {
        let result;
        switch (task.type) {
          case 'email':
            result = await TaskProcessor.processEmail(task);
            break;
          case 'report':
            result = await TaskProcessor.processReport(task);
            break;
          case 'dataSync':
            result = await TaskProcessor.processDataSync(task);
            break;
          default:
            throw new Error(`Unknown task type: ${task.type}`);
        }
        
        taskQueue.markComplete(task.id);
        processedTasks++;
        console.log(`✓ Task ${task.id} completed`);
        
        return { taskId: task.id, result };
        
      } catch (error) {
        console.error(`✗ Task ${task.id} failed:`, error.message);
        
        if (taskQueue.retry(task.id)) {
          console.log(`Retrying task ${task.id}...`);
        } else {
          taskQueue.markFailed(task.id, error.message);
          await NotificationService.send(
            `Task ${task.id} failed after 3 attempts: ${error.message}`,
            'error'
          );
        }
        
        throw error;
      }
    }
  });
  
  const delayStep = new DelayStep({
    name: 'Inter-task Delay',
    delay_duration: 100,
    delay_type: DelayTypes.RELATIVE
  });
  
  processingWorkflow.pushSteps([processStep, delayStep]);
  
  // Loop through all pending tasks
  const loopStep = new LoopStep({
    name: 'Process All Tasks',
    callable: processingWorkflow,
    subject: function() {
      return this.workflow.get('noMoreTasks') !== true;
    },
    operator: '===',
    value: true,
    loop_type: LoopTypes.WHILE,
    max_iterations: 100
  });
  
  workflow.pushStep(loopStep);
  
  workflow.events.on('WORKFLOW_COMPLETED', async () => {
    const stats = taskQueue.getStats();
    console.log(`\nTask processing complete: ${processedTasks} tasks processed`);
    console.log('Queue stats:', stats);
    
    if (stats.failed > 0) {
      await NotificationService.send(
        `Task processing complete: ${stats.completed} succeeded, ${stats.failed} failed`,
        'warning'
      );
    }
  });
  
  return workflow;
}

// Create health monitoring workflow
function createHealthMonitorWorkflow() {
  const workflow = new Workflow({
    name: 'Health Monitor',
    exit_on_failure: false
  });
  
  // Check system health
  const healthCheckStep = new Step({
    name: 'System Health Check',
    type: StepTypes.ACTION,
    callable: async function() {
      const health = await SystemMonitor.checkHealth();
      this.workflow.set('systemHealth', health);
      
      console.log('System Health:', health.healthy ? '✓ Healthy' : '✗ Unhealthy');
      console.log('Metrics:', health.metrics);
      
      return health;
    }
  });
  
  // Check services
  const servicesCheckStep = new Step({
    name: 'Services Check',
    type: StepTypes.ACTION,
    callable: async function() {
      const services = await SystemMonitor.checkServices();
      this.workflow.set('servicesStatus', services);
      
      console.log('Services:', services.allUp ? '✓ All up' : '✗ Some down');
      console.log('Status:', services.statuses);
      
      return services;
    }
  });
  
  // Alert if unhealthy
  const alertStep = new ConditionalStep({
    name: 'Check Alert Needed',
    subject: function() {
      const health = this.workflow.get('systemHealth');
      const services = this.workflow.get('servicesStatus');
      return !health.healthy || !services.allUp;
    },
    operator: '===',
    value: true,
    step_left: new Step({
      name: 'Send Alert',
      type: StepTypes.ACTION,
      callable: async function() {
        const health = this.workflow.get('systemHealth');
        const services = this.workflow.get('servicesStatus');
        
        let message = 'System health alert:\n';
        
        if (!health.healthy) {
          message += '- System metrics above threshold\n';
          message += `  CPU: ${health.metrics.cpu.toFixed(1)}%\n`;
          message += `  Memory: ${health.metrics.memory.toFixed(1)}%\n`;
          message += `  Disk: ${health.metrics.disk.toFixed(1)}%\n`;
        }
        
        if (!services.allUp) {
          message += '- Some services are down:\n';
          Object.entries(services.statuses).forEach(([service, status]) => {
            if (status === 'down') {
              message += `  ${service}: DOWN\n`;
            }
          });
        }
        
        return await NotificationService.send(message, 'critical');
      }
    }),
    step_right: new Step({
      name: 'No Alert Needed',
      type: StepTypes.ACTION,
      callable: async () => {
        console.log('✓ All systems nominal');
        return { alert: false };
      }
    })
  });
  
  workflow.pushSteps([healthCheckStep, servicesCheckStep, alertStep]);
  
  return workflow;
}

// Main scheduler
async function runScheduledTasks() {
  console.log('='.repeat(60));
  console.log('SCHEDULED TASK RUNNER');
  console.log('='.repeat(60));
  console.log(`Started at: ${new Date().toISOString()}\n`);
  
  // Create task queue and add some tasks
  const taskQueue = new TaskQueue();
  
  taskQueue.enqueue({
    type: 'email',
    data: { recipient: 'admin@example.com', subject: 'Daily Report' }
  });
  
  taskQueue.enqueue({
    type: 'report',
    data: { reportType: 'sales', period: 'daily' }
  });
  
  taskQueue.enqueue({
    type: 'dataSync',
    data: { source: 'external-api', destination: 'database' }
  });
  
  taskQueue.enqueue({
    type: 'email',
    data: { recipient: 'user@example.com', subject: 'Weekly Summary' }
  });
  
  console.log(`Task queue initialized with ${taskQueue.tasks.length} tasks\n`);
  
  // Run workflows
  console.log('>>> Running Health Monitor...\n');
  const healthWorkflow = createHealthMonitorWorkflow();
  await healthWorkflow.execute();
  
  console.log('\n>>> Processing Task Queue...\n');
  const taskWorkflow = createTaskProcessorWorkflow(taskQueue);
  await taskWorkflow.execute();
  
  console.log('\n>>> Running Scheduled Maintenance...\n');
  const maintenanceWorkflow = createMaintenanceWorkflow();
  try {
    await maintenanceWorkflow.execute();
  } catch (error) {
    // Expected if outside maintenance window
  }
  
  console.log('\n' + '='.repeat(60));
  console.log('ALL SCHEDULED TASKS COMPLETE');
  console.log('='.repeat(60));
}

// Run immediately
runScheduledTasks().catch(console.error);

// In production, you would schedule this with cron or a scheduler:
// import cron from 'node-cron';
// 
// // Run every hour
// cron.schedule('0 * * * *', () => {
//   runScheduledTasks().catch(console.error);
// });
```

## Output

```
============================================================
SCHEDULED TASK RUNNER
============================================================
Started at: 2025-11-16T10:30:00.000Z

Task queue initialized with 4 tasks

>>> Running Health Monitor...

System Health: ✓ Healthy
Metrics: { cpu: 45.2, memory: 62.1, disk: 38.7, responseTime: 234.5 }
Services: ✓ All up
Status: { api: 'up', database: 'up', cache: 'up', queue: 'up' }
✓ All systems nominal

>>> Processing Task Queue...

Processing task abc123 (email) - Attempt 1
Sending email to admin@example.com...
✓ Task abc123 completed
Processing task def456 (report) - Attempt 1
Generating report: sales...
✓ Task def456 completed
Processing task ghi789 (dataSync) - Attempt 1
Syncing data from external-api...
✓ Task ghi789 completed
Processing task jkl012 (email) - Attempt 1
Sending email to user@example.com...
✓ Task jkl012 completed

Task processing complete: 4 tasks processed
Queue stats: { total: 4, pending: 0, completed: 4, failed: 0 }

>>> Running Scheduled Maintenance...

⏰ Outside maintenance window - skipping

============================================================
ALL SCHEDULED TASKS COMPLETE
============================================================
```

## Key Features

1. **Task Queue Processing** - Process queued tasks with retry logic
2. **Scheduled Maintenance** - Run maintenance during specific time windows
3. **Health Monitoring** - Check system and service health
4. **Conditional Execution** - Only run tasks when conditions are met
5. **Error Handling** - Retry failed tasks and send notifications
6. **Loop Processing** - Process all queued tasks efficiently
7. **Workflow Composition** - Combine multiple workflows

## Integration with Cron

```javascript
import cron from 'node-cron';

// Run health check every 5 minutes
cron.schedule('*/5 * * * *', async () => {
  const workflow = createHealthMonitorWorkflow();
  await workflow.execute();
});

// Run task processor every minute
cron.schedule('* * * * *', async () => {
  const workflow = createTaskProcessorWorkflow(taskQueue);
  await workflow.execute();
});

// Run maintenance daily at 2 AM
cron.schedule('0 2 * * *', async () => {
  const workflow = createMaintenanceWorkflow();
  await workflow.execute();
});
```

## Use Cases

- Background job processing
- Scheduled maintenance tasks
- System monitoring and alerts
- Data synchronization
- Report generation
- Email campaigns
- Backup automation

## See Also

- [Loop Steps](../../step-types/loop-step.md)
- [Conditional Steps](../../step-types/conditional-step.md)
- [Delay Steps](../../step-types/delay-step.md)
- [Error Handling](../../advanced/error-handling.md)
