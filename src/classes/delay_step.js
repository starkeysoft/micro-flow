import { isAfter, parseISO, addMilliseconds } from 'date-fns';
import schedule from 'node-schedule';
import Step from './step.js';
import step_types from '../enums/step_types.js';
import delay_types from '../enums/delay_types.js';
import step_event_names from '../enums/step_event_names.js';

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
      name
    });

    this.delay_duration = delay_duration;
    this.delay_type = delay_type;
    this.scheduled_job = null;
    
    this.callable = this[delay_type].bind(this, delay_duration);
  }

  /**
   * Executes an absolute delay until a specific timestamp using node-schedule.
   * Schedules an event emission at the specified time and returns a promise.
   * @async
   * @param {Date|string|number} timestamp - The absolute timestamp to wait until.
   * @returns {Promise<void>}
   */
  async absolute(timestamp) {
    return new Promise((resolve, reject) => {
      let target_date;
      if (timestamp instanceof Date) {
        target_date = timestamp;
      } else if (typeof timestamp === 'string') {
        target_date = parseISO(timestamp);
      } else if (typeof timestamp === 'number') {
        target_date = new Date(timestamp);
      } else {
        reject(new Error('Invalid timestamp format'));
        return;
      }

      if (!isAfter(target_date, new Date())) {
        resolve();
        return;
      }

      const callback = () => {
        this.events.emit(step_event_names.DELAY_STEP_ABSOLUTE_COMPLETE, {
          step: this,
          timestamp: target_date
        });
        resolve();
      };

      this.scheduled_job = schedule.scheduleJob(target_date, callback);

      if (!this.scheduled_job) {
        reject(new Error('Failed to schedule job'));
      }
    });
  }

  /**
   * Executes a relative delay for a specified duration from the current time.
   * Uses node-schedule for longer delays (>100ms) and setTimeout for shorter ones.
   * @async
   * @param {number} duration - The duration in milliseconds to wait.
   * @returns {Promise<void>}
   */
  async relative(duration) {
    return new Promise((resolve, reject) => {
      if (typeof duration !== 'number' || duration < 0) {
        reject(new Error('Duration must be a positive number'));
        return;
      }

      if (duration === 0) {
        resolve();
        return;
      }

      const callback = () => {
        this.events.emit(step_event_names.DELAY_STEP_RELATIVE_COMPLETE, {
          step: this,
          duration,
          completed_at: new Date()
        });
        resolve();
      };

      if (duration < 100) {
        setTimeout(callback, duration);
        return;
      }

      const target_date = addMilliseconds(new Date(), duration);

      this.scheduled_job = schedule.scheduleJob(target_date, callback);

      if (!this.scheduled_job) {
        setTimeout(callback, duration);
      }
    });
  }

  /**
   * Cancels any scheduled job for this delay step.
   * @returns {void}
   */
  cancel() {
    if (this.scheduled_job) {
      this.scheduled_job.cancel();
      this.scheduled_job = null;
    }
  }
}
