/**
 * Enumeration of possible step execution statuses.
 * Steps transition through these statuses during their lifecycle.
 * 
 * @enum {string}
 * @readonly
 */
const step_statuses = {
  COMPLETE: 'complete',
  FAILED: 'failed',
  PENDING: 'pending',
  QUEUED: 'queued',
  RUNNING: 'running',
  WAITING: 'waiting',
};

export default step_statuses;
