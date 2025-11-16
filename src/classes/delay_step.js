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
    delay_timestamp = null,
    delay_duration = 1000,
    delay_type = delay_types.ABSOLUTE
  } = {}) {
    super({
      type: step_types.DELAY,
      name
    });

    this.state.set('delay_duration', delay_duration);
    this.state.set('delay_type', delay_type);
    this.state.set('delay_timestamp', delay_timestamp);
    this.state.set('scheduled_job', null);
    
    // Set the callable based on delay type
    const method = delay_type === delay_types.ABSOLUTE ? this.absolute : this.relative;
    this.state.set('callable', method.bind(this));
  }

  /**
   * Executes an absolute delay until a specific timestamp using node-schedule.
   * Schedules an event emission at the specified time and returns a promise.
   * @async
   * @throws {Error} If timestamp is not provided or in an invalid format.
   * @returns {Promise<Object>} Resolves with a message object when delay completes.
   */
  async absolute() {
    if (!this.state.get('delay_timestamp')) {
      throw new Error('Timestamp is required for absolute delay');
    }

    return new Promise((resolve, reject) => {
      let target_date;
      if (this.state.get('delay_timestamp') instanceof Date) {
        target_date = this.state.get('delay_timestamp');
      } else if (typeof this.state.get('delay_timestamp') === 'string') {
        target_date = parseISO(this.state.get('delay_timestamp'));
      } else if (typeof this.state.get('delay_timestamp') === 'number') {
        target_date = new Date(this.state.get('delay_timestamp'));
      } else {
        reject(new Error('Invalid timestamp format'));
        return;
      }

      if (!isAfter(target_date, new Date())) {
        resolve({message: 'Timestamp is in the past, firing immediately'});
        return;
      }

      const callback = () => {
        this.events.emit(step_event_names.DELAY_STEP_ABSOLUTE_COMPLETE, {
          step: this,
          timestamp: target_date
        });
        resolve({message: 'Delay complete'});
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
   * Uses node-schedule for longer delays (>=100ms) and setTimeout for shorter ones.
   * @async
   * @throws {Error} If duration is not provided, not a number, or negative.
   * @returns {Promise<void>} Resolves when the delay period completes.
   */
  async relative() {
    if (!this.state.get('delay_duration') && this.state.get('delay_duration') !== 0) {
      throw new Error('Duration is required for relative delay');
    }

    return new Promise((resolve, reject) => {
      if (typeof this.state.get('delay_duration') !== 'number' || this.state.get('delay_duration') < 0) {
        reject(new Error('Duration must be a positive number'));
        return;
      }

      if (this.state.get('delay_duration') === 0) {
        resolve();
        return;
      }

      const callback = () => {
        this.events.emit(step_event_names.DELAY_STEP_RELATIVE_COMPLETE, {
          step: this,
          duration: this.state.get('delay_duration'),
          completed_at: new Date()
        });
        resolve();
      };

      if (this.state.get('delay_duration') < 100) {
        setTimeout(callback, this.state.get('delay_duration'));
        return;
      }

      const target_date = addMilliseconds(new Date(), this.state.get('delay_duration'));

      const job = schedule.scheduleJob(target_date, callback);
      this.state.set('scheduled_job', job);

      if (!this.state.get('scheduled_job')) {
        setTimeout(callback, this.state.get('delay_duration'));
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
