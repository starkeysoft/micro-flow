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

    this.state.set('delay_duration', delay_duration);
    this.state.set('delay_type', delay_type);
    this.state.set('scheduled_job', null);
    
    this.state.set('callable', this[delay_type].bind(this, delay_duration));
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

      const job = schedule.scheduleJob(target_date, callback);
      this.state.set('scheduled_job', job);

      if (!this.state.get('scheduled_job')) {
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

      const job = schedule.scheduleJob(target_date, callback);
      this.state.set('scheduled_job', job);

      if (!this.state.get('scheduled_job')) {
        setTimeout(callback, duration);
      }
    });
  }

  /**
   * Cancels any scheduled job for this delay step.
   * @returns {void}
   */
  cancel() {
    const job = this.state.get('scheduled_job');
    if (job) {
      job.cancel();
      this.state.set('scheduled_job', null);
    }
  }
}
