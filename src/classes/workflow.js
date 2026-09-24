import crypto from 'crypto';
import Base from './base.js';
import CallableRegistry from './callable_registry.js';
import Step from './steps/step.js';
import State from './state.js';
import { statuses, event_names, events, types, conditional_step_comparators, messages } from './instance_state.js';
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
   * @param {boolean} [options.result_per_step=false] - Whether to call `result_per_step_function` after each step.
   * @param {Function|null} [options.result_per_step_function=null] - Called with the serialized workflow after each step.
   * @param {string|null} [options.result_per_step_function_registry_key=null] - Optional key to reference
   * `result_per_step_function` to be rehydrated after serialization. Defaults to the function's name.
   * @param {Array<Step>} [options.steps=[]] - Array of steps to add to the workflow.
   * @param {boolean} [options.throw_on_empty=false] - Whether to throw error if workflow is empty.
   * @param {boolean} [options.use_state_singleton=false] - Deprecated. When true, this workflow (and every
   * `Step` it owns) reads/writes `getState`/`setState`/`deleteState` calls through the process-wide `State`
   * singleton instead of this workflow's own state.
   */
  constructor({
    name,
    callable_registry = null,
    exit_on_error = false,
    result_per_step = false,
    result_per_step_function = null,
    result_per_step_function_registry_key = null,
    steps = [],
    throw_on_empty = false,
    use_state_singleton = false,
  }) {
    super({ name, base_type: base_types.WORKFLOW, use_state_singleton });

    this.callable_registry = callable_registry ?? new CallableRegistry();
    this.current_session_id = null;
    this.exit_on_error = exit_on_error;
    this.result_per_step = result_per_step;
    this.sessions = {};
    this.throw_on_empty = throw_on_empty;
    this.result_per_step_function = result_per_step_function;
    this.result_per_step_function_registry_key = result_per_step_function_registry_key;

    // _steps/steps_by_id must exist before initializeWorkflowState(): it reads this._steps
    // (to set current_step) and logs, which serializes `this` - both need this._steps to
    // already be an array, even when no steps are passed (addSteps([]) never calls addStep,
    // so it wouldn't otherwise get initialized).
    this._steps = [];
    this.steps_by_id = {};
    this.addSteps(steps);
    this.initializeWorkflowState();
  }

  /**
   * Executes the workflow by running all steps in sequence.
   * If the workflow is currently `paused`, resumes from the step after the one
   * that was running when it paused, rather than starting over from the beginning.
   * Otherwise a new session starts: `results`, the break/skip flags and the timing of the
   * previous run are reset (earlier runs remain available in `sessions`), so a workflow can be
   * executed any number of times - e.g. as the body of a `LoopStep`.
   * @async
   * @returns {Promise<Workflow>} The workflow instance with execution results.
   * @throws {Error} Throws if workflow is empty and throw_on_empty is true.
   */
  async execute() {
    if (!this.current_session_id) {
      this.startNewSession();
    }

    if (this.isEmpty()) {
      if (this.throw_on_empty) {
        throw new Error('Cannot execute an empty workflow');
      }

      this.markAsComplete();
      await this.prepareResult('Workflow is empty', null);
      return this;
    }

    const is_resuming = this.status === statuses.workflow.PAUSED;
    const paused_at_index = this._steps.findIndex(step => step.id === this.current_step);
    const start_index = is_resuming ? paused_at_index + 1 : 0;

    this.markAsRunning();

    for (let i = start_index; i < this._steps.length; i++) {
      if (this.should_break) {
        this.log(
          event_names.workflow.WORKFLOW_BREAK_EXECUTED,
          `Workflow "${this.name}" execution broken at step ${this._steps[i].name} - ${this._steps[i].id}.`,
          { workflow: this, step: this._steps[i] }
        );
        break;
      }

      if (this.should_skip) {
        this.log(
          event_names.workflow.WORKFLOW_STEP_SKIPPED,
          `Workflow "${this.name}" skipping step ${this._steps[i].name} - ${this._steps[i].id}.`,
          { workflow: this, step: this._steps[i] }
        );
        this.should_skip = false;
        continue;
      }

      this.current_step = this._steps[i].id;

      try {
        const step_result = await this.step();
        await this.prepareResult('Success', step_result);
      } catch (error) {
        const failed_step = this.steps_by_id[this.current_step];

        if (this.exit_on_error) {
          this.markAsFailed();
          await this.prepareResult(`Workflow execution failed at step ${failed_step.name} - ${this.current_step}`, { error });
          return this;
        }

        // Non-fatal: report the error, but keep the workflow running (and its session open) so
        // it can still finish as complete.
        this.log(
          event_names.workflow.WORKFLOW_ERRORED,
          `Workflow "${this.name}" step ${failed_step.name} - ${this.current_step} failed, continuing.`,
          { workflow: this, step: failed_step, error }
        );
        await this.prepareResult(`Step ${failed_step.name} - ${this.current_step} failed`, { error });
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

    events.workflow.emit(
      event_names.workflow.WORKFLOW_RESUMED,
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

    if (step.status === statuses.step.FAILED) {
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
    step.use_state_singleton = this.use_state_singleton;
    step.state = this.state;
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
    step.use_state_singleton = this.use_state_singleton;
    step.state = this.state;
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
   * Starts a new session, resetting the per-run state left over from a previous run.
   * A paused workflow keeps its open session, so this isn't called when resuming.
   */
  startNewSession() {
    this.current_session_id = crypto.randomUUID();
    this.results = [];
    this.should_break = false;
    this.should_skip = false;
    this.timing.start_time = null;
    this.timing.complete_time = null;
    this.timing.execution_time_ms = null;
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
  deleteStep(stepId) {
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
   * Resolves a nested property path within this workflow's own state - the low-level counterpart
   * to `getState()`. Falls back to the deprecated `State` singleton's resolver when
   * `use_state_singleton` is `true`.
   * @param {string} path - Path to the state property.
   * @param {boolean} [emit=true] - Only meaningful when `use_state_singleton` is `true`; whether
   * to emit the singleton's `GET_FROM_PROPERTY_PATH` state event.
   * @returns {*} The value at the specified path, or undefined if not found.
   */
  getStateFromPropertyPath(path, emit = true) {
    if (this.use_state_singleton) {
      console.warn('The state singleton has been deprecated. Use the .prepareForSerialization() method on the workflow instance instead.');
      return State.getFromPropertyPath(path, emit);
    }

    return this.state.getStateFromPropertyPath(path);
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
    this.status = this.status ?? statuses.workflow.CREATED;
    this.timing = {
      ...this.timing,
      create_time: this.timing?.create_time ?? new Date(),
      pause_time: this.timing?.pause_time ?? null,
      resume_time: this.timing?.resume_time ?? null,
    }

    if (this.use_state_singleton) {
      // The deprecated `State` singleton is shared by every workflow that opts into it, so it
      // still needs an id-keyed registry (unlike per-instance state, which only ever has one
      // workflow to represent and can just reference it directly - see the else branch).
      const workflows = this.getState('workflows');
      workflows[this.id] = this;
      this.setState('workflows', workflows);
    } else {
      this.setState('workflow', this);
    }

    this.log(
      event_names.workflow.WORKFLOW_CREATED,
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
      event_names.workflow.WORKFLOW_CREATED,
      `Workflow "${this.name}" created.`
    );

    return statuses.workflow.CREATED;
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
    this.status = statuses.workflow.PAUSED;

    events.workflow.emit(
      event_names.workflow.WORKFLOW_PAUSED,
      this.getState()
    );
  }

  /**
   * Marks the workflow as resumed.
   */
  markAsResumed() {
    this.timing.resume_time = new Date();
    this.status = statuses.workflow.RUNNING;

    events.workflow.emit(
      event_names.workflow.WORKFLOW_RESUMED,
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

    events.workflow.emit(
      event_names.workflow.WORKFLOW_STEP_MOVED,
      this.getState()
    );
  }

  /**
   * Parses a property path string into an array of keys, supporting both dot notation and
   * bracket notation (e.g. `"users[0].name"`). Pure utility - not affected by `use_state_singleton`.
   * @param {string} path - The path to parse.
   * @returns {string[]} Array of property keys.
   */
  parseStatePath(path) {
    return this.use_state_singleton ? State.parsePath(path) : this.state.parseStatePath(path);
  }

  /**
   * Requests that the workflow pause once its current step finishes. Emits
   * `workflow_pause_requested`; `workflow_paused` is emitted by `markAsPaused()` when the
   * pause actually takes effect.
   */
  pause() {
    this.should_pause = true;

    events.workflow.emit(
      event_names.workflow.WORKFLOW_PAUSE_REQUESTED,
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
      current_step: this.current_step,
      exit_on_error: this.exit_on_error,
      name: this.name,
      result_per_step: this.result_per_step,
      result_per_step_function: Step.serializeFunctionRef(
        this.result_per_step_function,
        this.result_per_step_function_registry_key
      ),
      sessions: this.sessions,
      status: this.status,
      steps: this._steps.map(step => step.prepareForSerialization()),
      throw_on_empty: this.throw_on_empty,
      timing: this.timing,
      results: this.results,
      use_state_singleton: this.use_state_singleton,
    };

    return serialized_workflow;
  }

  /**
   * Prepares a result object and adds it to the results array.
   * @param {string} message - Result message.
   * @param {*} data - Result data.
   */
  async prepareResult(message, data) {
    if (this.result_per_step && typeof this.result_per_step_function === 'function') {
      await this.result_per_step_function(this.prepareForSerialization());
    }

    const result = { message, data };
    this.results.push(result);
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
   * Sets a nested property value within this workflow's own state, creating intermediate
   * objects/arrays as needed - the low-level counterpart to `setState()`. Falls back to the
   * deprecated `State` singleton's setter when `use_state_singleton` is `true`.
   * @param {string} path - Path to the state property.
   * @param {*} value - The value to set at the specified path.
   * @param {boolean} [emit=true] - Only meaningful when `use_state_singleton` is `true`; whether
   * to emit the singleton's `SET_TO_PROPERTY_PATH` state event.
   */
  setStateToPropertyPath(path, value, emit = true) {
    if (this.use_state_singleton) {
      console.warn('The state singleton has been deprecated. Use the .prepareForSerialization() method on the workflow instance instead.');
      State.setToPropertyPath(path, value, emit);
      return;
    }

    this.state.setStateToPropertyPath(path, value);
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
    step.use_state_singleton = this.use_state_singleton;
    step.state = this.state;
    this._steps.unshift(step);
  }

  /**
   * Custom JSON serializer
   * @returns {Object} The JSON representation of the workflow.
   */
  toJSON() {
    return this.prepareForSerialization();
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
   * @param {CallableRegistry|null} [callable_registry] - Registry used to resolve function callables in the workflow's steps.
   * @returns {Workflow} The hydrated Workflow instance.
   * @throws {Error} Throws if the serialized workflow is not a string.
   */
  static hydrateSerialized(serialized_workflow, callable_registry = null) {
    // TODO: Validate structure of serialized workflow
    if (typeof serialized_workflow !== 'string') {
      throw new Error('Invalid serialized workflow. Must be a string.');
    }

    const parsed = JSON.parse(serialized_workflow);

    return Workflow.hydrate(parsed, callable_registry);
  }

  /**
   * Hydrates a parsed workflow object into a Workflow instance.
   * @param {Object} parsed_workflow - The parsed workflow object.
   * @param {CallableRegistry|null} [callable_registry] - Registry used to resolve function callables in the workflow's steps.
   * @returns {Workflow} The hydrated Workflow instance.
   * @throws {Error} Throws if the parsed workflow is not a valid object.
   */
  static hydrate(parsed_workflow, callable_registry = null) {
    // TODO: Validate structure of serialized workflow
    // TODO: Use event system to handle errors?
    if (typeof parsed_workflow !== 'object' || parsed_workflow === null) {
      throw new Error('Invalid parsed workflow. Must be a valid object.');
    }

    const result_per_step_descriptor = parsed_workflow.result_per_step_function;

    const hydrated_workflow = new Workflow({
      name: parsed_workflow.name,
      callable_registry,
      exit_on_error: parsed_workflow.exit_on_error,
      result_per_step: parsed_workflow.result_per_step ?? false,
      result_per_step_function: Step.hydrateFunctionRef(result_per_step_descriptor, callable_registry),
      result_per_step_function_registry_key: result_per_step_descriptor?.value ?? null,
      steps: parsed_workflow.steps.map(step => Step.hydrateAny(step, callable_registry)),
      throw_on_empty: parsed_workflow.throw_on_empty,
      use_state_singleton: parsed_workflow.use_state_singleton ?? false,
    });

    // The constructor above (via Base) always generates a fresh id, and addStep() has
    // already stamped that fresh id onto each step's parent_workflow_id and (in singleton mode)
    // registered the workflow under it in the singleton's `workflows` registry. Restoring the
    // real id below would otherwise leave both referencing a discarded id, so fix them up here
    // too. Per-instance state needs no such fixup for its `workflow` key - it's the same live
    // object, so the id mutation below is reflected automatically.
    const stale_id = hydrated_workflow.id;
    hydrated_workflow.id = parsed_workflow.id;

    if (hydrated_workflow.use_state_singleton) {
      const workflows = hydrated_workflow.getState('workflows');
      delete workflows[stale_id];
      workflows[hydrated_workflow.id] = hydrated_workflow;
      hydrated_workflow.setState('workflows', workflows);
    }

    hydrated_workflow.steps.forEach(step => {
      step.parent_workflow_id = hydrated_workflow.id;
    });

    hydrated_workflow.current_session_id = parsed_workflow.current_session_id;
    hydrated_workflow.current_step = parsed_workflow.current_step ?? hydrated_workflow.current_step;
    hydrated_workflow.sessions = parsed_workflow.sessions ?? {};
    hydrated_workflow.status = parsed_workflow.status;
    hydrated_workflow.timing = parsed_workflow.timing;
    hydrated_workflow.results = parsed_workflow.results;

    return hydrated_workflow;
  }
}

// Framework constants, exposed as static members rather than duplicated into every
// Workflow's own state (see instance_state.js, the canonical source for these values).
Workflow.statuses = statuses;
Workflow.event_names = event_names;
Workflow.events = events;
Workflow.types = types;
Workflow.conditional_step_comparators = conditional_step_comparators;
Workflow.messages = messages;
