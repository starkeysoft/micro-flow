import { v4 as uuidv4 } from 'uuid';
import StepEvents from './step_event.js';
import State from './state.js';
import Workflow from './workflow.js';
import step_statuses from '../enums/step_statuses.js';
import step_types from '../enums/step_types.js';
import sub_step_types from '../enums/sub_step_types.js';

/**
 * Base class representing a workflow step with lifecycle management and event handling.
 * @class Step
 */
export default class Step {
  dontCopyStateKeys = [
    'id',
    'name',
    'should_break',
    'should_continue',
    'should_skip',
    'events',
    'start_time',
    'end_time',
    'execution_time_ms',
    'output_data'
  ];
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
    this.events = new StepEvents();
    this.state = new State({
      status: step_statuses.WAITING,
      step_types: step_types,
      sub_step_types: sub_step_types,
      start_time: null,
      name: name,
      type: type,
      callable: callable,
      log_suppress: log_suppress,
      id: uuidv4()
    });
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
    let callable = this.state.get('callable');
    if (typeof callable.markAsComplete === 'function') {
      callable = callable.state.get('callable');
      this.state.set('callable', callable);
    }

    let result;

    try {
      // Steps can be instances of workflows
      if (callable instanceof Workflow) {
        this.events.emit(this.events.event_names.STEP_RUNNING, { step: this });

        result = await callable.execute();

        this.markAsComplete();
        this.state.set('execution_time_ms', callable.state.get('execution_time_ms'));
        this.events.emit(this.events.event_names.STEP_COMPLETED, { step: this, result });
        return result;
      }

      this.state.set('start_time', Date.now());
      this.events.emit(this.events.event_names.STEP_RUNNING, { step: this });
      
      // or they can be simple functions
      result = await callable(this.state.getState());
    } catch (error) {
      this.state.set('execution_time_ms', Date.now() - this.state.get('start_time'));
      this.events.emit(this.events.event_names.STEP_FAILED, { step: this, error });
      this.markAsFailed(error);
      throw error;
    }
  
    this.markAsComplete();

    this.state.set('execution_time_ms', Date.now() - this.state.get('start_time'));
    this.events.emit(this.events.event_names.STEP_COMPLETED, { step: this, result });

    return result;
  }

  /**
   * Logs step status information to the console unless logging is suppressed.
   * Failed steps are logged as errors, all others as standard logs.
   * @param {string} [message] - Optional custom message to log. If not provided, uses default status message.
   * @returns {void}
   */
  logStep(message) {
    if (this.state.get('log_suppress')) {
      return;
    }

    const log_type = this.state.get('status') === step_statuses.FAILED ? 'error' : 'log';
    console[log_type](message ? message : `Step "${this.state.get('name')}" ${this.state.get('status')}.`);
  }

  /**
   * Marks the step as complete and logs the status change.
   * @returns {void}
   */
  markAsComplete() {
    this.logStep();

    this.state.set('status', step_statuses.COMPLETE);
    this.events.emit(this.events.event_names.STEP_COMPLETED, { step: this });
  }

  /**
   * Marks the step as failed and logs the status change with error details.
   * @param {Error} error - The error that caused the step to fail.
   * @returns {void}
   */
  markAsFailed(error) {
    this.logStep(`Step "${this.state.get('name')}" failed with error: ${error.message}`);

    this.state.set('status', step_statuses.FAILED);
    this.events.emit(this.events.event_names.STEP_FAILED, { step: this, error });
  }

  /**
   * Marks the step as waiting and logs the status change.
   * @returns {void}
   */
  markAsWaiting() {
    this.logStep();

    this.state.set('status', step_statuses.WAITING);
    this.events.emit(this.events.event_names.STEP_WAITING, { step: this });
  }

  /**
   * Marks the step as pending and logs the status change.
   * @returns {void}
   */
  markAsPending() {
    this.logStep();

    this.state.set('status', step_statuses.PENDING);
    this.events.emit(this.events.event_names.STEP_PENDING, { step: this });
  }

  /**
   * Marks the step as running and logs the status change.
   * @returns {void}
   */
  markAsRunning() {
    this.logStep();

    this.state.set('status', step_statuses.RUNNING);
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
   * Sets the execution state for this step. Provides a snapshot of the workflow state
   * at the time of execution. The state is an object containing state information
   * accessible during step execution. Also creates a mapping of steps by their IDs
   * for easy access.
   * @param {State | WorkflowState} state - The State instance to set.
   * @returns {void}
   */
  setState(state) {
    if (!state || typeof state.getState !== 'function') {
      throw new Error('setState requires a State instance');
    }

    const working_state = new State(state.getStateClone());

    for (const key of this.dontCopyStateKeys) {
      if (key in working_state) {
        delete working_state[key];
      }
    }

    if (this.state.get('callable') instanceof Workflow) {
      delete working_state['steps'];
      delete working_state['steps_by_id'];
    }

    this.state.merge(working_state);

    const steps_by_id = {};
    const steps = working_state.get('steps');

    if (steps && steps.length && !(this.state.get('callable') instanceof Workflow)) {
      steps.forEach(step => {
        steps_by_id[step.state.get('id')] = step;
      });

      this.state.set('steps_by_id', steps_by_id);
    }
  }

  /**
   * Sets the callable function for this action step. This is the only step that
   * can do that after instantiation. It is deliberately designed to be generic
   * and run whatever function is provided.
   * @param {Step | Workflow | Function} callable - The function to execute when this step runs.
   * @returns {void}
   * @throws {Error} If the provided callable is not a function.
   */
  setCallable(callable) {
    this.state.set('callable', callable);
  }
}
