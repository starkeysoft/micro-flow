import Step from './step.js';
import { delay_types, step_types } from '../../enums/index.js';
import { event_names } from '../instance_state.js';
import schedule from 'node-schedule';
import { addMilliseconds } from 'date-fns';

/**
 * DelayStep class for introducing delays in workflow execution.
 * Supports both absolute and relative delays.
 * @class DelayStep
 * @extends Step
 */
export default class DelayStep extends Step {
  static step_name = 'delay';

  /**
   * Creates a new DelayStep instance.
   * @param {Object} options - Configuration options.
   * @param {string} [options.name] - Name of the step.
   * @param {Date|string} [options.absolute_timestamp=new Date()] - Absolute timestamp to delay until.
   * @param {number} [options.relative_delay_ms=0] - Relative delay in milliseconds.
   * @param {string} [options.delay_type=delay_types.RELATIVE] - Type of delay ('absolute' or 'relative').
   * @param {number} [options.max_retries=0] - Maximum number of retries on failure.
   * @param {number|null} [options.max_timeout_ms=null] - Maximum execution time per attempt in milliseconds.
   * Defaults to `null` (no timeout), since waiting is this step's whole job - a timeout would otherwise
   * cut any delay longer than it short.
   */
  constructor({
    name,
    absolute_timestamp = new Date(),
    relative_delay_ms = 0,
    delay_type = delay_types.RELATIVE,
    max_retries,
    max_timeout_ms = null,
  }) {
    super({
      name,
      step_type: step_types.DELAY,
      max_retries,
      max_timeout_ms,
    });

    this.delay_type = delay_type;
    this.absolute_timestamp = new Date(absolute_timestamp);
    this.relative_delay_ms = relative_delay_ms;

    this.callable = this[delay_type].bind(this);
  }

  /**
   * Executes an absolute delay until the specified timestamp. If the timestamp is in the past, it continues immediately.
   * @returns {Promise<Object>} Resolves with delay completion info when delay completes.
   */
  async absolute() {
    const now = new Date();

    if (this.absolute_timestamp.getTime() <= now.getTime()) {
      this.log(
        event_names.step.DELAY_STEP_ABSOLUTE_COMPLETE,
        `No delay for step: ${this.name}. Continuing.`
      );
      return { delayed: false, delay_type: this.delay_type, timestamp: now.toISOString() };
    }

    return this.delay(this.absolute_timestamp);
  }

  /** Schedules a delay until the specified date and time.
   * @param {Date} delay_until - The date and time to delay until.
   * @returns {Promise<Object>} Resolves with delay completion info when delay completes.
   */
  async delay(delay_until) {
    return new Promise((resolve) => {
      this.log(
        event_names.step[`DELAY_STEP_${this.delay_type.toUpperCase()}_SCHEDULED`],
        `Delay scheduled for step: ${this.name} until ${delay_until.toISOString()}`
      );

      const job = schedule.scheduleJob(delay_until, () => {
        this.log(
          event_names.step[`DELAY_STEP_${this.delay_type.toUpperCase()}_COMPLETE`],
          `Delay complete for step: ${this.name}. Continuing.`
        );
        resolve({ delayed: true, delay_type: this.delay_type, timestamp: new Date().toISOString() });
      });

      this.scheduled_job = job;
    });
  }

  /**
   * Executes a relative delay for the specified duration. If the delay duration is zero or negative, it continues immediately.
   * @returns {Promise<Object>} Resolves with delay completion info when delay completes.
   */
  async relative() {
    if (this.relative_delay_ms <= 0) {
      this.log(
        event_names.step.DELAY_STEP_RELATIVE_COMPLETE,
        `No delay for step: ${this.name}. Continuing.`
      );
      return { delayed: false, delay_type: this.delay_type, timestamp: new Date().toISOString() };
    }

    const delay_until = addMilliseconds(new Date(), this.relative_delay_ms);

    return this.delay(delay_until);
  }

  /**
   * Inserts safely serializable properties of the step into a new object for serialization.
   * @returns {Object} An object containing the step's properties ready for serialization.
   */
  prepareForSerialization() {
    return {
      ...super.prepareForSerialization(),
      // The base `callable` is an internal wiring detail (the bound absolute/relative method) -
      // DelayStep's constructor doesn't take a callable, so it isn't real data to persist.
      callable: null,
      delay_type: this.delay_type,
      absolute_timestamp: this.absolute_timestamp,
      relative_delay_ms: this.relative_delay_ms,
    };
  }
}

DelayStep.registerStepClass(DelayStep);
