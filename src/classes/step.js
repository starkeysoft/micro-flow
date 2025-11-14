import { v4 as uuidv4 } from 'uuid';
import StepEvents from './step_event.js';
import step_types from '../enums/step_types.js';
import sub_step_types from '../enums/sub_step_types.js';
import step_statuses from '../enums/step_statuses.js';
import Workflow from './workflow.js';

/**
 * Base class representing a workflow step with lifecycle management and event handling.
 * @class Step
 */
export default class Step {
  events = new StepEvents();
  status = step_statuses.WAITING;
  step_types = step_types;
  sub_step_types = sub_step_types;
  context = {};

  /**
   * Creates a new Step instance.
   * @constructor
   * @param {Object} options - Configuration options for the step.
   * @param {string} options.name - The name of the step.
   * @param {string} options.type - The type of the step (from step_types enum).
   * @param {Function | Step | Workflow} [options.callable=async()=>{}] - The async function to execute for this step.
   * @param {boolean} [options.log_suppress=false] - Whether to suppress logging for this step.
   */
  constructor({
    name,
    type,
    callable = async () => {},
    log_suppress = false,
  }) {
    this.name = name;
    this.type = type;
    this.callable = callable;
    this.log_suppress = log_suppress;
    this.id = uuidv4();
  }

  /**
   * Executes the step's callable function with any provided arguments.
   * @async
   * @returns {Promise<*>} The result of the callable function.
   * @throws {Error} If the callable function throws an error during execution.
   */
  async execute() {
    this.markAsRunning();

    // Steps can be instances of other steps
    if (typeof this.callable.markAsComplete === 'function') {
      this.callable = this.callable.callable;
    }

    let result;

    try {
      // Steps can be instances of workflows
      if (this.callable instanceof Workflow) {
        // Don't pass context.steps to avoid overwriting the workflow's own steps
        const { steps, steps_by_id, ...contextWithoutSteps } = this.context || {};
        result = await this.callable.execute(contextWithoutSteps);
        this.markAsComplete();
        return result;
      }

      // or they can be simple functions
      result = await this.callable(this.context);
    } catch (error) {
      this.markAsFailed(error);
      throw error;
    }
  
    this.markAsComplete();
    return result;
  }

  /**
   * Logs step status information to the console unless logging is suppressed.
   * Failed steps are logged as errors, all others as standard logs.
   * @param {string} [message] - Optional custom message to log. If not provided, uses default status message.
   * @returns {void}
   */
  logStep(message) {
    if (this.log_suppress) {
      return;
    }

    const log_type = this.status === step_statuses.FAILED ? 'error' : 'log';
    console[log_type](message ? message : `Step "${this.name}" ${this.status}.`);
  }

  /**
   * Marks the step as complete and logs the status change.
   * @returns {void}
   */
  markAsComplete() {
    this.logStep();

    this.status= step_statuses.COMPLETE;
    this.events.emit(this.events.event_names.STEP_COMPLETED, { step: this });
  }

  /**
   * Marks the step as failed and logs the status change with error details.
   * @param {Error} error - The error that caused the step to fail.
   * @returns {void}
   */
  markAsFailed(error) {
    this.logStep(`Step "${this.name}" failed with error: ${error.message}`);

    this.status = step_statuses.FAILED;
    this.events.emit(this.events.event_names.STEP_FAILED, { step: this, error });
  }

  /**
   * Marks the step as waiting and logs the status change.
   * @returns {void}
   */
  markAsWaiting() {
    this.logStep();

    this.status = step_statuses.WAITING;
    this.events.emit(this.events.event_names.STEP_WAITING, { step: this });
  }

  /**
   * Marks the step as pending and logs the status change.
   * @returns {void}
   */
  markAsPending() {
    this.logStep();

    this.status = step_statuses.PENDING;
    this.events.emit(this.events.event_names.STEP_PENDING, { step: this });
  }

  /**
   * Marks the step as running and logs the status change.
   * @returns {void}
   */
  markAsRunning() {
    this.logStep();

    this.status = step_statuses.RUNNING;
    this.events.emit(this.events.event_names.STEP_RUNNING, { step: this });
  }

  /**
   * Sets a custom events object for this step.
   * @param {StepEvents} events - The StepEvents instance to use for this step.
   * @throws {Error} Throws an error if the provided events object is invalid.
   * @returns {void}
   */
  setEvents(events) {
    if (!events || typeof events.registerStepEvents !== 'function') {
      throw new Error('Invalid events object provided. Must be an instance of StepEvents.');
    }
    this.events = events;
  }

  /**
   * Sets the execution context for this step. Provides a snapshot of the workflow state
   * at the time of execution. The context is an object containing state information
   * accessible during step execution. Also creates a mapping of steps by their IDs
   * for easy access.
   * @param {Object} state - The state object to set as the context.
   * @returns {void}
   */
  setContext(state) {
    this.context = state;

    this.context.steps_by_id = {};

    this.context.steps.forEach(step => {
      this.context.steps_by_id[step.id] = step;
    });
  }
}
