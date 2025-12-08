/**
 * Enumeration of delay types for DelayStep.
 * 
 * @enum {string}
 * @readonly
 * @example
 * import delay_types from 'micro-flow';
 * 
 * const delayStep = new DelayStep({
 *   name: 'wait-5-seconds',
 *   delay_type: delay_types.RELATIVE,
 *   delay_duration: 5000
 * });
 */
const delay_types = {
  /**
   * Delay until a specific absolute timestamp or Date.
   * Use with delay_timestamp property.
   * @type {string}
   */
  ABSOLUTE: 'absolute',
  
  /**
   * Delay using a cron expression for scheduled execution.
   * Use with cron_expression property.
   * @type {string}
   */
  CRON: 'cron',
  
  /**
   * Delay for a relative duration in milliseconds.
   * Use with delay_duration property.
   * @type {string}
   */
  RELATIVE: 'relative',
};

export default delay_types;
