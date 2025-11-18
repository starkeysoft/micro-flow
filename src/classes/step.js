import { v4 as uuidv4 } from 'uuid';
import StepEvents from './step_event.js';
import State from './state.js';
import Workflow from './workflow.js';
import step_statuses from '../enums/step_statuses.js';
import step_types from '../enums/step_types.js';
import generate_sub_step_types from '../enums/sub_step_types.js';

/**
 * Base class representing a workflow step with lifecycle management and event handling.
 * @class Step
 */
export default class Step {
  /**
   * Creates a new Step instance.
   * @constructor
   * @param {Object} options - Configuration options for the step.
   * @param {string} options.name - The name of the step.
   * @param {string} options.type - The type of the step (from step_types enum).
   * @param {Function | Step | Workflow} [options.callable=async()=>{}] - The async function to execute for this step.
   */
  constructor({
    name,
    type,
    callable = async () => {},
  }) {
    this.events = new StepEvents();
    this.state = new State({
      status: step_statuses.WAITING,
      step_types: step_types,
      sub_step_types: generate_sub_step_types(),
      start_time: null,
      end_time: null,
      execution_time_ms: 0,
      name: name,
      type: type,
      callable: callable,
      id: uuidv4()
    });
  }

  /**
   * Executes the step's callable function. The workflow state is available via this.workflow,
   * which is set by the parent workflow through setWorkflow() before execution.
   * @async
   * @param {WorkflowState} [workflow] - The workflow state passed from the parent workflow.
   * @returns {Promise<Object>} An object containing the result and step state: {result, state}.
   * @throws {Error} If the callable function throws an error during execution.
   */
  async execute(workflow) {
    this.markAsRunning();

    let callable = this.state.get('callable');
    let result = {};

    try {
      // Callables can be instances of workflows or other steps
      if (callable instanceof Workflow) {
        result = await callable.execute({ workflow, step: this });
      } else if ((typeof callable.markAsComplete === 'function')) {
        result = await callable.callable.execute({ workflow, step: this });
      } else {
        // or they can be async functions
        result = await callable({ workflow, step: this });
      }

    } catch (error) {
      this.state.set('execution_time_ms', Date.now() - this.state.get('start_time'));
      this.markAsFailed(error);
      result.error = error;
    }
  
    result.error ?? this.markAsComplete();

    return this.prepareReturnData(result);
  }

  /**
   * Logs step status information to the console unless logging is suppressed.
   * Failed steps are logged as errors, all others as standard logs.
   * @param {string} [event_name] - Event object associated with the log.
   * @param {string} [message] - Optional custom message to log. If not provided, uses default status message.
   * @returns {void}
   */
  logStep(event_name, data = this.state.getState(), message = null) {
    this.events.emit(event_name, { step: this, ...data });

    if (this.workflow.get('log_suppress', false)) {
      return;
    }

    const log_type = this.state.get('status') === step_statuses.FAILED ? 'error' : 'log';

    const message_to_log = `[${new Date().toISOString()}] - ${message ? message : `Step "${this.state.get('name')}" ${this.state.get('status')}.`}`
    console[log_type](message_to_log);
  }

  /**
   * Marks the step as complete and logs the status change.
   * @returns {void}
   */
  markAsComplete() {
    const end_time = Date.now();
    this.state.set('execution_time_ms', end_time - this.state.get('start_time'));
    this.state.set('end_time', end_time);
    this.state.set('status', step_statuses.COMPLETE);
    this.logStep(this.events.event_names.STEP_COMPLETED, null, `Step "${this.state.get('name')}" completed in ${this.state.get('execution_time_ms')}ms.`);
  }

  /**
   * Marks the step as failed and logs the status change with error details.
   * @param {Error} error - The error that caused the step to fail.
   * @returns {void}
   */
  markAsFailed(error) {
    const end_time = Date.now();
    this.state.set('end_time', end_time);
    this.state.set('execution_time_ms', end_time - this.state.get('start_time'));
    this.state.set('status', step_statuses.FAILED);
    this.logStep(this.events.event_names.STEP_FAILED, { step: this, error }, `Step "${this.state.get('name')}" failed with error: ${error.stack}`);
  }

  /**
   * Marks the step as waiting and logs the status change.
   * @returns {void}
   */
  markAsWaiting() {
    this.state.set('status', step_statuses.WAITING);
    this.logStep(this.events.event_names.STEP_WAITING, null, `Step "${this.state.get('name')}" is now waiting.`);
  }

  /**
   * Marks the step as pending and logs the status change.
   * @returns {void}
   */
  markAsPending() {
    this.state.set('status', step_statuses.PENDING);
    this.logStep(this.events.event_names.STEP_PENDING, null, `Step "${this.state.get('name')}" is now pending.`);
  }

  /**
   * Marks the step as running and logs the status change.
   * @returns {void}
   */
  markAsRunning() {
    this.state.set('start_time', Date.now());
    this.state.set('status', step_statuses.RUNNING);
    this.logStep(this.events.event_names.STEP_RUNNING, null, `Step "${this.state.get('name')}" is now running.`);
  }

  /**
   * Prepares the return data for this step, including the result and step state.
   * @param {*} result - The result from the callable execution.
   * @returns {Object} An object containing the result and step state: {result, state}.
   */
  prepareReturnData(result) {
    return {
      result: result,
      state: this.state.getState(),
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
    this.events.on(this.events.event_names.STEP_RUNNING, (data) => {
      this.state.set('status', step_statuses.RUNNING);
      this.logStep(`Step "${data.step.state.get('name')}" is now running.`);
    });

    this.events.on(this.events.event_names.STEP_COMPLETED, (data) => {
      this.state.set('status', step_statuses.COMPLETE);
      this.logStep(`Step "${data.step.state.get('name')}" has completed.`);
    });

    this.events.on(this.events.event_names.STEP_FAILED, (data) => {
      this.state.set('status', step_statuses.FAILED);
      this.logStep(`Step "${data.step.state.get('name')}" has failed with error: ${data.error.stack}`);
    });

    this.events.on(this.events.event_names.STEP_PENDING, (data) => {
      this.state.set('status', step_statuses.PENDING);
      this.logStep(`Step "${data.step.state.get('name')}" is now pending.`);
    });

    this.events.on(this.events.event_names.STEP_WAITING, (data) => {
      this.state.set('status', step_statuses.WAITING);
      this.logStep(`Step "${data.step.state.get('name')}" is now waiting.`);
    });
  
    this.events.on(this.events.event_names.DELAY_STEP_ABSOLUTE_COMPLETE, (data) => {
      this.logStep(`Delay step "${data.step.state.get('name')}" absolute delay completed at ${data.timestamp}.`);
    });

    this.events.on(this.events.event_names.DELAY_STEP_RELATIVE_COMPLETE, (data) => {
      this.logStep(`Delay step "${data.step.state.get('name')}" relative delay of ${data.duration}ms completed at ${data.completed_at}.`);
    });
  }

  /**
   * Sets the workflow state reference for this step. This is called by the parent workflow
   * before step execution to provide access to the workflow's state data. Steps can access
   * workflow state through this.workflow during execution.
   * @param {WorkflowState} workflow - The WorkflowState instance from the parent workflow.
   * @returns {void}
   */
  setWorkflow(workflow_state) {
    this.workflow = workflow_state;
    this.state.set('sub_step_types', generate_sub_step_types(workflow_state.get('sub_step_type_paths')));
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
