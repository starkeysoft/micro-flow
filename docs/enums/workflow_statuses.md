# Workflow Statuses

Enumeration of possible workflow execution statuses. Workflows transition through these statuses during their lifecycle.

## Values

- `CANCELLED` - `'cancelled'` - Workflow execution was cancelled
- `COMPLETE` - `'complete'` - Workflow completed successfully
- `CREATED` - `'created'` - Workflow was created
- `ERRORED` - `'errored'` - Workflow encountered an error
- `FROZEN` - `'frozen'` - Workflow is frozen
- `FAILED` - `'failed'` - Workflow execution failed
- `PAUSED` - `'paused'` - Workflow is paused
- `PENDING` - `'pending'` - Workflow is pending execution
- `RUNNING` - `'running'` - Workflow is currently executing
- `SKIPPED` - `'skipped'` - Workflow was skipped

## See Also

- [Workflow](../classes/workflow.md)
- [Step Statuses](step_statuses.md)
