import { v4 as uuidv4 } from 'uuid';
import WorkflowEvents from './workflow_event.js';
import step_types from '../enums/step_types.js';
import WorkflowState from './state.js';

/**
 * Represents a workflow that manages and executes a sequence of steps.
 * @class Workflow
 */
export default class Workflow {
  events = new WorkflowEvents();
  
  /**
   * Creates a new Workflow instance.
   * @constructor
   * @param {Array} [steps=[]] - An array of step objects to be executed in the workflow.
   * @param {string} [name=null] - Optional name for the workflow. If not provided, generates a unique name.
   * @param {boolean} [exit_on_failure=true] - Whether to exit the workflow when a step fails.
  */
 constructor(steps = [], name = null, exit_on_failure = true) {
    this.state = new WorkflowState();
    this.state.set('steps', steps);
    this.state.set('id', uuidv4());
    this.state.set('name', name ?? `workflow_${this.state.id}`);
    this.state.set('exit_on_failure', exit_on_failure);
    this.state.set('should_break', false);
    this.state.set('should_continue', false);
    this.state.set('should_skip', false);
    this.state.set('current_step', null);
    this.state.set('current_step_index', 0);

    this.events.emit(this.events.event_names.WORKFLOW_CREATED, { workflow: this.state });
  }

  /**
   * Adds a single step to the end of the workflow.
   * @param {Object} step - The step object to add to the workflow.
   * @returns {void}
   */
  pushStep(step) {
    this.state.get('steps').push(step);
    this.events.emit(this.events.event_names.WORKFLOW_STEP_ADDED, { workflow: this.state, step });
  }

  /**
   * Adds multiple steps to the end of the workflow.
   * @param {Array} steps - An array of step objects to add to the workflow.
   * @returns {void}
   */
  pushSteps(steps) {
    this.state.set('steps', [...this.state.get('steps'), ...steps]);
    this.events.emit(this.events.event_names.WORKFLOW_STEPS_ADDED, { workflow: this.state, steps });
  }

  /**
   * Removes all steps from the workflow.
   * @returns {void}
   */
  clearSteps() {
    this.state.set('steps', []);
    this.events.emit(this.events.event_names.WORKFLOW_STEPS_CLEARED, { workflow: this.state });
  }

  /**
   * Executes all steps in the workflow sequentially until completion or error.
   * Emits workflow started, completed, and errored events as appropriate.
   * @async
   * @param {Object} [initialState=null] - Optional initial state to merge before execution.
   * @returns {Promise<State>} The final workflow state after execution.
   * @throws {Error} If any step in the workflow throws an error during execution and exit_on_failure is true.
   */
  async execute(initialState = null) {
    const start_time = Date.now();

    if (initialState) {
      this.state.merge(initialState);
    }

    this.events.emit(this.events.event_names.WORKFLOW_STARTED, { workflow: this.state });

    this.state.set('output_data', []);

    if (this.isEmpty()) {
      throw new Error('No steps available in the workflow.');
    }

    let iterator = 0;
    const steps = this.state.get('steps');
    for await (const step of steps) {
      if (this.state.get('should_break')) {
        break;
      }

      if (this.state.get('should_skip')) {
        this.state.set('should_skip', false);
        iterator++;
        continue;
      }

      this.state.set('current_step_index', iterator++);

      try {
        this.state.get('output_data').push(await this.step(step));
      } catch (error) {
        this.events.emit(this.events.event_names.WORKFLOW_ERRORED, { workflow: this.state, error });
        if (this.state.get('exit_on_failure')) {
          this.state.prepare(start_time);
          return this.state;
        }

        continue;
      }
    }

    this.state.prepare(start_time);

    this.events.emit(this.events.event_names.WORKFLOW_COMPLETED, { workflow: this.state });

    return this.state;
  }

  /**
   * Retrieves all steps in the workflow.
   * @returns {Array} An array of all step objects in the workflow.
   */
  getSteps() {
    return this.state.get('steps');
  }

  /**
   * Checks if the workflow has no steps.
   * @returns {boolean} True if the workflow is empty, false otherwise.
   */
  isEmpty() {
    return !this.state.get('steps').length;
  }

  /**
   * Moves a step from one position to another in the workflow.
   * @param {number} fromIndex - The index of the step to move.
   * @param {number} toIndex - The destination index where the step should be placed.
   * @returns {Array} The result of the splice operation.
   */
  moveStep(fromIndex, toIndex) {
    const [movedStep] = this.state.get('steps').splice(fromIndex, 1);
    this.state.get('steps').splice(toIndex, 0, movedStep);
    this.events.emit(this.events.event_names.WORKFLOW_STEP_MOVED, { workflow: this.state, movedStep });
  }

  /**
   * Removes a step from the workflow at the specified index.
   * @param {number} index - The index of the step to remove.
   * @returns {Array} An array containing the removed step.
   */
  removeStep(index) {
    const removedStep = this.state.get('steps').splice(index, 1);
    this.events.emit(this.events.event_names.WORKFLOW_STEP_REMOVED, { workflow: this.state, removedStep });
    return removedStep;
  }

  /**
   * Removes and returns the first step from the workflow.
   * @returns {Object|undefined} The first step object, or undefined if the workflow is empty.
   */
  shiftStep() {
    const shiftedStep = this.state.get('steps').shift();
    this.events.emit(this.events.event_names.WORKFLOW_STEP_SHIFTED, { workflow: this.state, shiftedStep });
    return shiftedStep;
  }

  /**
   * Executes the next step in the workflow.
   * Removes the first step from the workflow, marks its status, executes it, and handles errors.
   * DELAY type steps are marked as pending, all other steps are marked as running.
   * @async
   * @throws {Error} Throws an error if the workflow is empty or if a step execution fails.
   * @returns {Promise<*>} The result of executing the step.
   */
  async step(step) {
    if (this.isEmpty()) {
      throw new Error('No steps available in the workflow.');
    }

    this.state.set('current_step', step);

    if (step.type === step_types.DELAY) {
      this.state.get('steps')[0].markAsPending();
      step.markAsWaiting();
    } else {
      step.markAsRunning();
    }

    let result;

    try {
      step.setContext(this.state.getStateClone());
      result = await step.execute();

      this.state.set('should_break', step.should_break ?? this.state.get('should_break'));
      this.state.set('should_continue', step.should_continue ?? this.state.get('should_continue'));
      this.state.set('should_skip', step.should_skip ?? this.state.get('should_skip'));
    } catch (error) {
      step.markAsFailed(error);
      throw error;
    }

    step.markAsComplete();

    return result;
  }
}
