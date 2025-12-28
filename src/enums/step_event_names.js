/**
 * Enumeration of step lifecycle event names.
 * Steps emit these events during their execution lifecycle.
 * 
 * @enum {string}
 * @readonly
 */
const step_event_names = {
  CONDITIONAL_FALSE_BRANCH_EXECUTED: 'conditional_false_branch_executed',
  CONDITIONAL_TRUE_BRANCH_EXECUTED: 'conditional_true_branch_executed',
  DELAY_STEP_ABSOLUTE_SCHEDULED: 'delay_step_absolute_scheduled',
  DELAY_STEP_RELATIVE_SCHEDULED: 'delay_step_relative_scheduled',
  DELAY_STEP_ABSOLUTE_COMPLETE: 'delay_step_absolute_complete',
  DELAY_STEP_RELATIVE_COMPLETE: 'delay_step_relative_complete',
  LOOP_ITERATION_COMPLETE: 'loop_iteration_complete',
  STEP_COMPLETE: 'step_complete',
  STEP_FAILED: 'step_failed',
  STEP_RUNNING: 'step_running',
  STEP_PENDING: 'step_pending',
  STEP_WAITING: 'step_waiting',
  STEP_RETRYING: 'step_retrying',
}

export default step_event_names;
