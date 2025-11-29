import { v4 as uuidv4 } from 'uuid';
import StepEvents from './step_event.js';
import state from './state.js';
import Workflow from './workflow.js';
import step_statuses from '../enums/step_statuses.js';
import step_types from '../enums/step_types.js';
import sub_step_types from '../enums/sub_step_types.js';

/**
 * Base class representing a workflow step with lifecycle management and event handling.
 * @class Step
 */
export default class Step {
  /**
   * Creates a new Step instance.
   * 
   * @constructor
   * @param {Object} options - Configuration options for the step.
   * @param {string} options.name - The name of the step.
   * @param {string} options.type - The type of the step (from step_types enum).
   * @param {Function | Step | Workflow} [options.callable=async()=>{}] - The async function, Step, or Workflow to execute for this step.
   * The callable receives { workflow, step } context as its parameter.
   * @example
   * // With async function
   * const step = new Step({
   *   name: 'process-data',
   *   type: step_types.ACTION,
   *   callable: async ({ workflow, step }) => {
   *     const data = workflow.get('input_data');
   *     return { processed: data };
   *   }
   * });
   * 
   * // With another Step
   * const innerStep = new Step({ name: 'inner', type: step_types.ACTION });
   * const outerStep = new Step({
   *   name: 'outer',
   *   type: step_types.ACTION,
   *   callable: innerStep
   * });
   */
  constructor({
    name,
    type,
    callable = async () => {},
  }) {
    this.name = name;
    this.type = type;
    this.callable = callable;
    this.current_step_index = null;

    this.status = step_statuses.WAITING;
    this.step_types = step_types;
    this.sub_step_types = sub_step_types;
    this.events = new StepEvents();
    this.setListeners();
  }
  
  /**
   * Executes the step's callable function. The global workflow state is accessible via the
   * state singleton import.
   * 
   * This method:
   * 1. Initializes step state in the global state object
   * 2. Executes the callable (function, Step, or Workflow)
   * 3. Handles errors and marks step status accordingly
   * 4. Supports retries if configured
   * 
   * @async
   * @returns {Promise<Object>} An object containing the result and step state: {result, state}.
   * @throws {Error} If the callable function throws an error during execution.
   * @example
   * const step = new Step({
   *   name: 'my-step',
   *   type: step_types.ACTION,
   *   callable: async ({ workflow, step }) => {
   *     // Access global state
   *     const data = workflow.get('user_data');
   *     return { success: true, data };
   *   }
   * });
   * 
   * const result = await step.execute();
   * console.log(result.result); // { success: true, data: ... }
  */
 async execute() {
    this.initializeStepState(this.name, this.type, this.callable);
    const retries = this.getStepStateValue('retries', 0);

    let callable = this.getStepStateValue('callable');
    let result = {};

    try {
      // Callables can be instances of workflows or other steps
      if (callable instanceof Workflow) {
        result = await callable.execute(state, this);
      } else if ((typeof callable.markAsComplete === 'function')) {
        result = await callable.callable.execute(state, this);
      } else {
        // or they can be async functions
        result = await callable(state, this);
      }

    } catch (error) {
      this.setStepStateValue('execution_time_ms', Date.now() - this.getStepStateValue('start_time'));
      this.markAsFailed(error);
      result.error = error;
    }

    if (retries > 0) {
      this.setStepStateValue('retries', retries - 1);
      const retriedResult = await this.execute();

      if (Array.isArray(this.getStepStateValue('retry_results'))) {
        const existingResults = this.getStepStateValue('retry_results');
        existingResults.push(retriedResult);
        this.setStepStateValue('retry_results', existingResults);
      } else {
        this.setStepStateValue('retry_results', [retriedResult]);
      }
    }

    return this.prepareReturnData(result);
  }

  /**
   * Logs step status information to the console unless logging is suppressed.
   * Failed steps are logged as errors, all others as standard logs.
   * @param {string} [event_name] - Event object associated with the log.
   * @param {string} [message] - Optional custom message to log. If not provided, uses default status message.
   * @returns {void}
   */
  logStep(event_name, data = this.getStepStateValue(), message = null) {
    this.events.emit(event_name, { step: this, ...data });

    if (state.get('log_suppress', false)) {
      return;
    }

    const log_type = this.getStepStateValue('status') === step_statuses.FAILED ? 'error' : 'log';

    const message_to_log = `[${new Date().toISOString()}] - ${message ? message : `Step "${this.getStepStateValue('name')}" ${this.getStepStateValue('status')}.`}`
    console[log_type](message_to_log);
  }

  /**
   * Marks the step as complete and logs the status change.
   * @returns {void}
   */
  markAsComplete() {
    const end_time = Date.now();
    this.setStepStateValue('execution_time_ms', end_time - this.getStepStateValue('start_time'));
    this.setStepStateValue('end_time', end_time);
    this.setStepStateValue('status', step_statuses.COMPLETE);
    this.logStep(this.events.event_names.STEP_COMPLETED, null, `Step "${this.getStepStateValue('name')}" completed in ${this.getStepStateValue('execution_time_ms')}ms.`);
  }

  /**
   * Marks the step as failed and logs the status change with error details.
   * @param {Error} error - The error that caused the step to fail.
   * @returns {void}
   */
  markAsFailed(error) {
    const end_time = Date.now();
    this.setStepStateValue('end_time', end_time);
    this.setStepStateValue('execution_time_ms', end_time - this.getStepStateValue('start_time'));
    this.setStepStateValue('status', step_statuses.FAILED);
    this.logStep(this.events.event_names.STEP_FAILED, { step: this, error }, `Step "${this.getStepStateValue('name')}" failed with error: ${error.stack}`);
  }

  /**
   * Marks the step as waiting and logs the status change.
   * @returns {void}
   */
  markAsWaiting() {
    this.setStepStateValue('status', step_statuses.WAITING);
    this.logStep(this.events.event_names.STEP_WAITING, null, `Step "${this.getStepStateValue('name')}" is now waiting.`);
  }

  /**
   * Marks the step as pending and logs the status change.
   * @returns {void}
   */
  markAsPending() {
    this.setStepStateValue('status', step_statuses.PENDING);
    this.logStep(this.events.event_names.STEP_PENDING, null, `Step "${this.getStepStateValue('name')}" is now pending.`);
  }

  /**
   * Marks the step as running and logs the status change.
   * @returns {void}
   */
  markAsRunning() {
    this.setStepStateValue('start_time', Date.now());
    this.setStepStateValue('status', step_statuses.RUNNING);
    this.logStep(this.events.event_names.STEP_RUNNING, null, `Step "${this.getStepStateValue('name')}" is now running.`);
  }

  /**
   * Prepares the return data for this step, including the result and step state.
   * @param {*} result - The result from the callable execution.
   * @returns {Object} An object containing the result and step state: {result, state}.
   */
  prepareReturnData(result) {
    return {
      result: result,
      state: this.getStepStateValue(),
    };
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

  setListeners() {
    this.events.on(this.events.event_names.DELAY_STEP_ABSOLUTE_COMPLETE, (data) => {
      this.logStep(`Delay step "${this.getStepStateValue('name')}" absolute delay completed at ${data.timestamp}.`);
    });

    this.events.on(this.events.event_names.DELAY_STEP_RELATIVE_COMPLETE, (data) => {
      this.logStep(`Delay step "${this.getStepStateValue('name')}" relative delay of ${data.duration}ms completed at ${data.completed_at}.`);
    });
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
    this.setStepStateValue('callable', callable);
  }

  /**
   * Initializes the step state properties in the global state object at the path
   * `steps[current_step_index]`. This method is called automatically by execute().
   * 
   * Initializes the following properties:
   * - `name`: Step name
   * - `type`: Step type
   * - `callable`: The callable function/Step/Workflow
   * - `id`: Unique UUID for this step instance
   * - `start_time`, `end_time`: Timing information
   * - `execution_time_ms`: Execution duration
   * 
   * @param {string} name - The name of the step.
   * @param {string} type - The type of the step.
   * @param {Function|Step|Workflow} callable - The callable for this step.
   * @returns {void}
   * @private
   */
  initializeStepState(name, type, callable) {
    this.setStepStateValue("start_time", null);
    this.setStepStateValue("end_time", null);
    this.setStepStateValue("execution_time_ms", 0);
    this.setStepStateValue("name", name);
    this.setStepStateValue("type", type);
    this.setStepStateValue("callable", callable);
    this.setStepStateValue("id", uuidv4());
  }

  /**
   * Sets a value in the step state at the specified path within the global state.
   * The path is automatically prefixed with `workflows[active_workflow_id].steps[current_step_index]`.
   * 
   * @param {string} path - The path within the step state to set (e.g., 'custom_field' or 'nested.value').
   * @param {*} value - The value to set at the specified path.
   * @returns {void}
   * @example
   * // Inside a step's callable
   * async function myCallable({ workflow, step }) {
   *   step.setStepStateValue('custom_field', 'my_value');
   *   step.setStepStateValue('nested.data', { count: 5 });
   * }
   */
  setStepStateValue(path, value) {
    const workflowId = state.get('active_workflow_id');
    if (!workflowId) {
      throw new Error('No active workflow found. Steps must be executed within a workflow context.');
    }
    state.set(`workflows.${workflowId}.steps.${this.current_step_index}.${path}`, value);
  }

  /**
   * Retrieves a value from the step state at the specified path within the global state.
   * The path is automatically prefixed with `workflows[active_workflow_id].steps[current_step_index]`.
   * 
   * If path is omitted or empty, returns the entire step state object.
   * 
   * @param {string} [path] - The path within the step state to retrieve (e.g., 'custom_field' or 'nested.value').
   * If omitted, returns the entire step state.
   * @param {*} [defaultValue] - The default value to return if the path does not exist.
   * @returns {*} The value at the specified path or the entire step state if path is omitted.
   * @example
   * // Inside a step's callable
   * async function myCallable({ workflow, step }) {
   *   const name = step.getStepStateValue('name');
   *   const customValue = step.getStepStateValue('custom_field', 'default');
   *   const allState = step.getStepStateValue(); // Returns entire step state
   * }
   */
  getStepStateValue(path, defaultValue) {
    const workflowId = state.get('active_workflow_id');
    if (!workflowId) {
      throw new Error('No active workflow found. Steps must be executed within a workflow context.');
    }
    return state.get(`workflows.${workflowId}.steps.${this.current_step_index}.${path}`, defaultValue);
  }
}
