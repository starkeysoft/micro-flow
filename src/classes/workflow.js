import crypto from 'crypto';
import Base from './base.js';
import CallableRegistry from './callable_registry.js';
import Step from './steps/step.js';
import { base_types } from '../enums/index.js';

/**
 * Workflow class for managing and executing a sequence of steps.
 * @class Workflow
 * @extends Base
 */
export default class Workflow extends Base {
  /**
   * Creates a new Workflow instance.
   * @param {Object} options - Configuration options.
   * @param {string} [options.name] - Name of the workflow.
   * @param {CallableRegistry|null} [options.callable_registry=null] - Registry for callable objects.
   * @param {boolean} [options.exit_on_error=false] - Whether to exit on error.
   * @param {Array<Step>} [options.steps=[]] - Array of steps to add to the workflow.
   * @param {boolean} [options.throw_on_empty=false] - Whether to throw error if workflow is empty.
   */
  constructor({
    name,
    callable_registry = null,
    exit_on_error = false,
    steps = [],
    throw_on_empty = false,
  }) {
    super({ name, base_type: base_types.WORKFLOW });
    
    this.callable_registry = callable_registry ?? new CallableRegistry();
    this.current_session_id = null;
    this.exit_on_error = exit_on_error;
    this.sessions = {};
    this.throw_on_empty = throw_on_empty;

    this.initializeWorkflowState();
    this.addSteps(steps);
  }

  /**
   * Executes the workflow by running all steps in sequence.
   * @async
   * @returns {Promise<Workflow>} The workflow instance with execution results.
   * @throws {Error} Throws if workflow is empty and throw_on_empty is true.
   */
  async execute() {
    if (!this.current_session_id) {
      this.current_session_id = crypto.randomUUID();
    }

    if (this.isEmpty()) {
      if (this.throw_on_empty) {
        throw new Error('Cannot execute an empty workflow');
      }

      this.markAsComplete();
      this.prepareResult('Workflow is empty', null);
      return this;
    }
  
    this.markAsRunning();

    for (let i = 0; i < this._steps.length; i++) {
      if (this.should_break) {
        this.log(this.getState('event_names.workflow').WORKFLOW_BREAK_EXECUTED, `Workflow "${this.name}" execution broken at step ${this._steps[i].name} - ${this._steps[i].id}.`);
        break;
      }

      if (this.should_skip) {
        this.log(
          this.getState('events.workflow.event_names.WORKFLOW_STEP_SKIPPED'),
          `Workflow "${this.name}" skipping step ${this._steps[i].name} - ${this._steps[i].id}.`
        );
        this.should_skip = false;
        continue;
      }

      this.current_step = this._steps[i].id;

      try {
        const step_result = await this.step();
        this.prepareResult('Success', step_result);
      } catch (error) {
        this.markAsFailed();
        this.prepareResult(`Workflow execution failed at step ${this.steps_by_id[this.current_step].name} - ${this.current_step}`, { error });
  
        if (this.exit_on_error) {
          return this;
        }
      }

      if (this.should_pause) {
        this.markAsPaused();
        this.should_pause = false;
        return this;
      }
    }

    this.markAsComplete();
    return this.prepareForSerialization();
  }

  /**
   * Resumes a paused workflow.
   * @async
   * @returns {Promise<Workflow>} The workflow instance.
   */
  async resume() {
    this.should_pause = false;
    this.timing.resume_time = new Date();

    this.getState('events.workflow').emit(
      this.getState('event_names.workflow').WORKFLOW_RESUMED,
      this.getState()
    );
    return this.execute();
  }

  /**
   * Executes a single step in the workflow.
   * @async
   * @returns {Promise<*>} The result of the step execution.
   */
  async step() {
    const step = this.steps_by_id[this.current_step];

    const result = await step.execute();

    if (step.status === this.getState('statuses.step.FAILED')) {
      throw step.errors[step.errors.length - 1] ?? new Error(`Step "${step.name}" failed`);
    }

    return result;
  }

  /**
   * Adds a step to the workflow.
   * @param {Step} step - The step to add.
   * @throws {Error} Throws if step is not a valid Step instance.
   */
  addStep(step) {
    // This check only ensures that the getCallableType method exists,
    // which is a characteristic of Step instances
    if (typeof step.getCallableType !== 'function') {
      throw new Error('Invalid input. Must be an instance of Step.');
    }

    if (!Array.isArray(this._steps)) {
      this._steps = [];
    }

    if (!this.steps_by_id || typeof this.steps_by_id !== 'object') {
      this.steps_by_id = {};
    }

    this.steps_by_id[step.id] = step;

    step.parent_workflow_id = this.id;
    step.parent_workflow = this.prepareForSerialization();
    this._steps.push(step);
  }

  /**
   * Adds a step at a specific index in the workflow.
   * @param {Step} step - The step to add.
   * @param {number} index - The index at which to insert the step.
   */
  addStepAtIndex(step, index) {
    if (!this.steps_by_id || typeof this.steps_by_id !== 'object') {
      this.steps_by_id = {};
    }

    this.steps_by_id[step.id] = step;
    step.parent_workflow_id = this.id;
    step.parent_workflow = this.prepareForSerialization();
    this._steps.splice(index, 0, step);
  }

  /**
   * Adds multiple steps to the workflow.
   * @param {Step[]} steps - Array of steps to add.
   */
  addSteps(steps) {
    if (!Array.isArray(steps)) {
      throw new Error('Invalid input. Must be an array of Step instances.');
    }

    steps.forEach(step => this.addStep(step));
  }

  /**
   * Clears all steps from the workflow.
   */
  clearSteps() {
    this._steps = [];
    this.steps_by_id = {};
  }

  /**
   * Closes the current session and stores a snapshot of the workflow state.
   */
  closeCurrentSession() {
    if (!this.current_session_id) {
      return;
    }

    this.sessions[this.current_session_id] = {
      results: [...this.results],
      status: this.status,
      timing: { ...this.timing },
      closed_at: new Date()
    };
    this.current_session_id = null;
  }

  /**
   * Deletes a step from the workflow by its ID.
   * @param {string} stepId - The ID of the step to delete.
   */
  deleteStepById(stepId) {
    if (!Array.isArray(this._steps)) {
      this._steps = [];
    }

    this._steps = this._steps.filter(step => step.id !== stepId);
  }

  /**
   * Deletes a step from the workflow by its index.
   * @param {number} index - The index of the step to delete.
   */
  deleteStepByIndex(index) {
    if (!Array.isArray(this._steps)) {
      this._steps = [];
    }

    this._steps.splice(index, 1);
  }

  /**
   * Initializes the workflow state with default values.
   */
  initializeWorkflowState() {
    this.current_step = ! this.isEmpty() ? this._steps[0].id : null;
    this.results = this.results ?? [];
    this.sessions = this.sessions ?? {};
    this.should_break = this.should_break ?? false;
    this.should_continue = this.should_continue ?? false;
    this.should_pause = this.should_pause ?? false;
    this.should_skip = this.should_skip ?? false;
    this.status = this.status ?? this.getState('statuses.workflow').CREATED;
    this.timing = this.timing ?? {
      ...this.timing,
      create_time: new Date(),
      pause_time: this.timing?.pause_time ?? null,
      resume_time: this.timing?.resume_time ?? null,
    }

    const workflows = this.getState('workflows');
    workflows[this.id] = this;
    this.setState('workflows', workflows);

    this.log(
      this.getState('event_names.workflow').WORKFLOW_CREATED,
      `Workflow "${this.name}" initialized.`
    );
  }

  /**
   * Checks if the workflow has no steps.
   * @returns {boolean} True if the workflow is empty.
   */
  isEmpty() {
    return !Array.isArray(this._steps) || !this._steps.length;
  }

  /**
   * Marks the workflow as complete and closes the current session.
   */
  markAsComplete() {
    super.markAsComplete();
    this.closeCurrentSession();
  }

  /**
   * Marks the workflow as created.
   * @returns {string} The CREATED status.
   */
  markAsCreated() {
    this.timing.create_time = new Date();
    
    this.log(
      this.getState('event_names.workflow').WORKFLOW_CREATED,
      `Workflow "${this.name}" created.`
    );

    return this.getState('statuses.workflow').CREATED;
  }

  /**
   * Marks the workflow as failed and closes the current session.
   */
  markAsFailed() {
    super.markAsFailed();
    this.closeCurrentSession();
  }

  /**
   * Marks the workflow as paused.
   */
  markAsPaused() {
    this.timing.pause_time = new Date();
    this.status = this.getState('statuses.workflow').PAUSED;

    this.getState('events.workflow').emit(
      this.getState('event_names.workflow').WORKFLOW_PAUSED,
      this.getState()
    );
  }
  
  /**
   * Marks the workflow as resumed.
   */
  markAsResumed() {
    this.timing.resume_time = new Date();
    this.status = this.getState('statuses.workflow').RUNNING;

    this.getState('events.workflow').emit(
      this.getState('event_names.workflow').WORKFLOW_RESUMED,
      this.getState()
    );
  }

  /**
   * Moves a step from one index to another.
   * @param {number} fromIndex - The current index of the step.
   * @param {number} toIndex - The target index for the step.
   */
  moveStep(fromIndex, toIndex) {
    const [step] = this._steps.splice(fromIndex, 1);
    this._steps.splice(toIndex, 0, step);

    this.getState('events.workflow').emit(
      this.getState('event_names.workflow').WORKFLOW_STEP_MOVED,
      this.getState()
    );
  }

  /**
   * Pauses the workflow execution.
   */
  pause() {
    this.should_pause = true;
    this.timing.pause_time = new Date();

    this.getState('events.workflow').emit(
      this.getState('event_names.workflow').WORKFLOW_PAUSED,
      this.getState()
    );
  }

  /**
   * Removes and returns the last step from the workflow.
   * @returns {Step} The last step.
   */
  popStep() {
    return this._steps.pop();
  }

  /**
   * Inserts safely serializable properties of the workflow into a new object for serialization.
   * @returns {Object} An object containing the workflow's properties ready for serialization.
  */
  prepareForSerialization() {
    const serialized_workflow = {
      id: this.id,
      current_session_id: this.current_session_id,
      exit_on_error: this.exit_on_error,
      name: this.name,
      sessions: this.sessions,
      status: this.status,
      steps: this._steps.map(step => step.prepareForSerialization()),
      throw_on_empty: this.throw_on_empty,
      timing: this.timing,
      results: this.results,
    };

    return serialized_workflow;
  }

  /**
   * Prepares a result object and adds it to the results array.
   * @param {string} message - Result message.
   * @param {*} data - Result data.
   */
  prepareResult(message, data) {
    this.results.push({ message, data });
  }

  /**
   * Adds a step to the end of the workflow.
   * @param {Step} step - The step to add.
   */
  pushStep(step) {
    this.addStep(step);
  }

  /**
   * Adds multiple steps to the end of the workflow.
   * @param {Step[]} steps - Array of steps to add.
   */
  pushSteps(steps) {
    steps.forEach(step => this.addStep(step));
  }

  /**
   * Serializes the workflow into a JSON string.
   * @returns {string} The JSON string representation of the workflow.
   */
  serialize() {
    return JSON.stringify(this.prepareForSerialization());
  }

  /**
   * Removes and returns the first step from the workflow.
   * @returns {Step} The first step.
   */
  shiftStep() {
    return this._steps.shift();
  }

  /**
   * Adds a step to the beginning of the workflow.
   * @param {Step} step - The step to add.
   * @throws {Error} Throws if step is not a valid Step instance.
   */
  unshiftStep(step) {
    if (typeof step.getCallableType !== 'function') {
      throw new Error('Invalid step type. Must be an instance of Step.');
    }

    if (!this.steps_by_id || typeof this.steps_by_id !== 'object') {
      this.steps_by_id = {};
    }

    this.steps_by_id[step.id] = step;

    step.parent_workflow_id = this.id;
    this._steps.unshift(step);
  }

  /**
   * Custom JSON serializer
   * @returns {Object} The JSON representation of the workflow.
   */
  toJSON() {
    return this.serialize();
  }

  /**
   * Gets the array of steps in the workflow.
   * @returns {Step[]} Array of steps.
   */
  get steps() {
    return this._steps;
  }

  /**
   * Sets the steps array by adding multiple steps.
   * @param {Step[]} steps - Array of steps to add.
   */
  set steps(steps) {
    this.addSteps(steps);
  }

  /**
   * Deserializes a JSON string into a Workflow instance and hydrates it.
   * @param {string} serialized_workflow - The JSON string representation of the workflow.
   * @returns {Workflow} The hydrated Workflow instance.
   * @throws {Error} Throws if the serialized workflow is not a string.
   */
  static hydrateSerialized(serialized_workflow) {
    // TODO: Validate structure of serialized workflow
    if (typeof serialized_workflow !== 'string') {
      throw new Error('Invalid serialized workflow. Must be a string.');
    }

    const parsed = JSON.parse(serialized_workflow);

    return Workflow.hydrate(parsed);
  }

  /**
   * Hydrates a parsed workflow object into a Workflow instance.
   * @param {Object} parsed_workflow - The parsed workflow object.
   * @returns {Workflow} The hydrated Workflow instance.
   * @throws {Error} Throws if the parsed workflow is not a valid object.
   */
  static hydrate(parsed_workflow) {
    // TODO: Validate structure of serialized workflow
    // TODO: Use event system to handle errors?
    if (typeof parsed_workflow !== 'object' || parsed_workflow === null) {
      throw new Error('Invalid parsed workflow. Must be a valid object.');
    }

    const hydrated_workflow = new Workflow({
      name: parsed_workflow.name,
      exit_on_error: parsed_workflow.exit_on_error,
      steps: parsed_workflow.steps.map(step => Step.hydrate(step)),
      throw_on_empty: parsed_workflow.throw_on_empty,
    });

    hydrated_workflow.id = parsed_workflow.id;
    hydrated_workflow.current_session_id = parsed_workflow.current_session_id;
    hydrated_workflow.status = parsed_workflow.status;
    hydrated_workflow.timing = parsed_workflow.timing;
    hydrated_workflow.results = parsed_workflow.results;

    return hydrated_workflow;
  }
}
