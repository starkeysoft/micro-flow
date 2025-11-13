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
}

export default step_event_names;
