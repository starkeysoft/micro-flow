/**
 * Enumeration of possible workflow execution statuses.
 * Workflows transition through these statuses during their lifecycle.
 * 
 * @enum {string}
 * @readonly
 */
const workflow_statuses = {
  PENDING: 'pending',
  RUNNING: 'running',
  COMPLETED: 'completed',
  FAILED: 'failed',
  PAUSED: 'paused',
  SKIPPED: 'skipped',
  CANCELLED: 'cancelled'
};

export default workflow_statuses;
