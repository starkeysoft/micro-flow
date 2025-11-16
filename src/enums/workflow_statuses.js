/**
 * Enumeration of possible workflow execution statuses.
 * Workflows transition through these statuses during their lifecycle.
 * 
 * @enum {string}
 * @readonly
 */
const workflow_statuses = {
  CANCELLED: 'cancelled',
  COMPLETED: 'completed',
  CREATED: 'created',
  ERRORED: 'errored',
  FROZEN: 'frozen',
  FAILED: 'failed',
  PAUSED: 'paused',
  PENDING: 'pending',
  RUNNING: 'running',
  SKIPPED: 'skipped'
};

export default workflow_statuses;
