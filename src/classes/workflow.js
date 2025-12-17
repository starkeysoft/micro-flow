import { Base } from './index.js';
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
   * @param {boolean} [options.exit_on_error=false] - Whether to exit on error.
   * @param {Array<Step>} [options.steps=[]] - Array of steps to add to the workflow.
   * @param {boolean} [options.throw_on_empty=false] - Whether to throw error if workflow is empty.
   */
  constructor({
    name,
    exit_on_error = false,
    steps = [],
    throw_on_empty = false
  }) {
    super({ name, base_type: base_types.WORKFLOW });

    this.initializeWorkflowState();

    this.addSteps(steps);

    this.exit_on_error = exit_on_error;
    this.throw_on_empty = throw_on_empty;
  }

  /**
   * Executes the workflow by running all steps in sequence.
   * @async
   * @returns {Promise<Workflow>} The workflow instance with execution results.
   * @throws {Error} Throws if workflow is empty and throw_on_empty is true.
   */
  async execute() {
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
      if (this.should_pause) {
        this.markAsPaused();
        this.should_pause = false;
        return this;
      }
  
      if (this.getState('should_break')) {
        this.log('workflow_break_executed', `Workflow "${this.name}" execution broken at step ${this._steps[i].name} - ${this._steps[i].id}.`);
        break;
      }

      if (this.getState('should_skip')) {
        this.log(
          this.getState('events.workflow.event_names.WORKFLOW_STEP_SKIPPED'),
          `Workflow "${this.name}" skipping step ${this._steps[i].name} - ${this._steps[i].id}.`
        );
        this.setState('should_skip', false);
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
    }

    this.markAsComplete();
    return this;
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

    let result;
    try {
      step.parentWorkflowId = this.id;
      result = await step.execute();
      this.results.push(result);
    } catch (error) {
      if (this.exit_on_error) {
        throw error;
      }
    }

    return result;
  }

  /**
   * Adds a step to the workflow.
   * @param {Step} step - The step to add.
   * @throws {Error} Throws if step is not a valid Step instance.
   */
  addStep(step) {
    if (typeof step.getCallableType !== 'function') {
      throw new Error('Invalid step type. Must be an instance of Step.');
    }

    if (!Array.isArray(this._steps)) {
      this._steps = [];
    }

    if (!this.steps_by_id || typeof this.steps_by_id !== 'object') {
      this.steps_by_id = {};
    }

    this.steps_by_id[step.id] = step;

    step.parentWorkflowId = this.id;
    this._steps.push(step);
  }

  /**
   * Adds a step at a specific index in the workflow.
   * @param {Step} step - The step to add.
   * @param {number} index - The index at which to insert the step.
   */
  addStepAtIndex(step, index) {
    step.parentWorkflowId = this.id;
    this._steps.splice(index, 0, step);
  }

  /**
   * Adds multiple steps to the workflow.
   * @param {Step[]} steps - Array of steps to add.
   */
  addSteps(steps) {
    steps.forEach(step => this.addStep(step));
  }

  /**
   * Clears all steps from the workflow.
   */
  clearSteps() {
    this._steps = [];
  }

  /**
   * Deletes a step from the workflow by its ID.
   * @param {string} stepId - The ID of the step to delete.
   */
  deleteStep(stepId) {
    this._steps = this._steps.filter(step => step.id !== stepId);
  }

  /**
   * Deletes a step from the workflow by its index.
   * @param {number} index - The index of the step to delete.
   */
  deleteStepByIndex(index) {
    this._steps.splice(index, 1);
  }

  /**
   * Initializes the workflow state with default values.
   */
  initializeWorkflowState() {
    this.results = [];
    this.exit_on_error = false;
    this.current_step = null;
    this.should_break = false;
    this.should_continue = false;
    this.should_pause = false;
    this.should_skip = false;
    this.status = this.getState('statuses.workflow').CREATED;
    this._steps = [];
    this.throw_on_empty = this.throw_on_empty;
    this.timing = {
      ...this.timing,
      create_time: new Date(),
      pause_time: null,
      resume_time: null,
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
    return !this._steps || !this._steps.length
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

    step.parentWorkflowId = this.id;
    this._steps.unshift(step);
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
    steps.forEach((step, index) => {
      if (typeof step.getCallableType !== 'function') {
        throw new Error(`Invalid step type. Step at index ${index} is not an instance of Step.`);
      }
    });

    this.addSteps(steps);
  }
}
