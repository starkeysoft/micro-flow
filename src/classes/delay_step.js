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

    if (!Object.values(delay_types).includes(delay_type)) {
      throw new Error(`Invalid delay type: ${delay_type}`);
    }

    this.setStepStateValue('delay_duration', delay_duration);
    this.setStepStateValue('delay_type', delay_type);
    this.setStepStateValue('delay_timestamp', delay_timestamp);
    this.setStepStateValue('scheduled_job', null);

    const callable = this[this.getStepStateValue('delay_type')];
    this.setStepStateValue('callable', callable.bind(this));
  }

  /**
   * Executes an absolute delay until a specific timestamp using node-schedule.
   * Schedules an event emission at the specified time and returns a promise.
   * @async
   * @throws {Error} If timestamp is not provided or in an invalid format.
   * @returns {Promise<Object>} Resolves with a message object when delay completes.
   */
  async absolute() {
    if (!this.getStepStateValue('delay_timestamp')) {
      throw new Error('Timestamp is required for absolute delay');
    }

    const result = await new Promise((resolve, reject) => {
      let target_date;
      if (this.getStepStateValue('delay_timestamp') instanceof Date) {
        target_date = this.getStepStateValue('delay_timestamp');
      } else if (typeof this.getStepStateValue('delay_timestamp') === 'string') {
        target_date = parseISO(this.getStepStateValue('delay_timestamp'));
      } else if (typeof this.getStepStateValue('delay_timestamp') === 'number') {
        target_date = new Date(this.getStepStateValue('delay_timestamp'));
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
        resolve();
      };

      const job = schedule.scheduleJob(target_date, callback);
      this.setStepStateValue('scheduled_job', job);
    });

    return { message: `Absolute delay step: ${this.getStepStateValue('name')} until ${this.getStepStateValue('delay_timestamp')} scheduled`, ...result };
  }

  /**
   * Cancels any scheduled job for this delay step.
   * @returns {void}
   */
  cancel() {
    const job = this.getStepStateValue('scheduled_job');
    if (job) {
      job.cancel();
      this.setStepStateValue('scheduled_job', null);
    }
  }

  /**
   * Executes a cron-based delay.
   * @async
   * @returns {Promise<void>} Resolves when the delay period completes.
   */
  async cron() {
    throw new Error('Cron delay type is not yet implemented');
  }

  /**
   * Executes a relative delay for a specified duration from the current time.
   * Uses node-schedule for longer delays (>=100ms) and setTimeout for shorter ones.
   * @async
   * @throws {Error} If duration is not provided, not a number, or negative.
   * @returns {Promise<void>} Resolves when the delay period completes.
   */
  async relative() {
    if (!this.getStepStateValue('delay_duration') && this.getStepStateValue('delay_duration') !== 0) {
      throw new Error('Duration is required for relative delay');
    }

    const result = await new Promise((resolve, reject) => {
      if (typeof this.getStepStateValue('delay_duration') !== 'number' || this.getStepStateValue('delay_duration') < 0) {
        reject(new Error('Duration must be a positive number'));
        return;
      }

      if (this.getStepStateValue('delay_duration') === 0) {
        resolve();
        return;
      }

      const callback = () => {
        this.events.emit(step_event_names.DELAY_STEP_RELATIVE_COMPLETE, {
          step: this,
          duration: this.getStepStateValue('delay_duration'),
          completed_at: new Date()
        });
        resolve();
      };

      const target_date = addMilliseconds(new Date(), this.getStepStateValue('delay_duration'));

      const job = schedule.scheduleJob(target_date, callback);
      this.setStepStateValue('scheduled_job', job);
    });

    return { message: `Relative delay step: ${this.getStepStateValue('name')} for duration ${this.getStepStateValue('delay_duration')}ms scheduled`, ...result };
  }
}
