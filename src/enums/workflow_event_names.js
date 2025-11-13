/**
 * Enumeration of workflow lifecycle event names.
 * Workflows emit these events during their creation and execution lifecycle.
 * 
 * @enum {string}
 * @readonly
 */
const workflow_event_names = {
  WORKFLOW_COMPLETED: 'workflow_completed',
  WORKFLOW_CREATED: 'workflow_created',
  WORKFLOW_ERRORED: 'workflow_errored',
  WORKFLOW_FAILED: 'workflow_failed',
  WORKFLOW_STARTED: 'workflow_started',
  WORKFLOW_STEP_ADDED: 'workflow_step_added',
  WORKFLOW_STEP_MOVED: 'workflow_step_moved',
  WORKFLOW_STEP_REMOVED: 'workflow_step_removed',
  WORKFLOW_STEP_SHIFTED: 'workflow_step_shifted',
  WORKFLOW_STEPS_ADDED: 'workflow_steps_added',
  WORKFLOW_STEPS_CLEARED: 'workflow_steps_cleared',
}

export default workflow_event_names;
