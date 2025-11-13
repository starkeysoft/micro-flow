import Step from './step.js';
import step_types from '../enums/step_types.js';
import delay_types from '../enums/delay_types.js';

/**
 * Represents a delay step that pauses workflow execution for a specified duration.
 * Supports both absolute (specific timestamp) and relative (duration) delays.
 * @class DelayStep
 * @extends Step
 */
export default class DelayStep extends Step {
  static step_name = 'delay';

  /**
   * Creates a new DelayStep instance.
   * @constructor
   * @param {Object} options - Configuration options for the delay step.
   * @param {string} [options.name=''] - The name of the delay step.
   * @param {number} [options.delay_duration=1000] - The delay duration in milliseconds (for relative) or timestamp (for absolute).
   * @param {string} [options.delay_type=delay_types.ABSOLUTE] - The type of delay (ABSOLUTE or RELATIVE).
   */
  constructor({
    name = '',
    delay_duration = 1000,
    delay_type = delay_types.ABSOLUTE
  } = {}) {
    super({
      type: step_types.DELAY,
      name,
      callable: this[delay_type].bind(this, delay_duration)
    });
  }

  /**
   * Executes an absolute delay until a specific timestamp.
   * @async
   * @param {Date} timestamp - The absolute timestamp to wait until.
   * @returns {Promise<void>}
   */
  async absolute(timestamp) {

    while (Date.now() < new Date(timestamp).getTime()) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }

  /**
   * Executes a relative delay for a specified duration from the current time.
   * @async
   * @param {number} duration - The duration in milliseconds to wait.
   * @returns {Promise<void>}
   */
  async relative(duration) {
    await new Promise(resolve => setTimeout(resolve, duration));
  }
}
