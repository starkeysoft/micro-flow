/**
 * Enumeration of step lifecycle event names.
 * Steps emit these events during their execution lifecycle.
 * 
 * @enum {string}
 * @readonly
 */
const step_event_names = {
  STEP_COMPLETED: 'step_completed',
  STEP_FAILED: 'step_failed',
  STEP_RUNNING: 'step_running',
  STEP_PENDING: 'step_pending',
  STEP_WAITING: 'step_waiting',
  DELAY_STEP_ABSOLUTE_COMPLETE: 'delay_step_absolute_complete',
  DELAY_STEP_RELATIVE_COMPLETE: 'delay_step_relative_complete',
}

export default step_event_names;
