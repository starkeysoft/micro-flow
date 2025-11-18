import { v4 as uuidv4 } from 'uuid';
import WorkflowEvents from './workflow_event.js';
import WorkflowState from './state.js';
import Step from './step.js';
import step_types from '../enums/step_types.js';
import workflow_statuses from '../enums/workflow_statuses.js';

/**
 * Represents a workflow that executes a series of steps sequentially.
 * Provides step management, execution control (pause/resume), state tracking,
 * event emission, and error handling capabilities.
 * 
 * @class Workflow
 */
export default class Workflow {
  /**
   * Creates a new Workflow instance.
   * @constructor
   * @param {Object} options - Configuration options for the workflow.
   * @param {Array} [options.steps=[]] - An array of step objects to be executed in the workflow.
   * @param {string} [options.name=null] - Optional name for the workflow. If not provided, generates a unique name.
   * @param {boolean} [options.exit_on_failure=true] - Whether to exit the workflow when a step fails.
   * @param {boolean} [options.freeze_on_completion=true] - Whether to freeze the state after completion.
   * @param {string[]} [options.sub_step_type_paths=[]] - Additional directories to scan for sub step types.
   */
  constructor({ steps = [], name = null, exit_on_failure = true, freeze_on_completion = true, sub_step_type_paths = [] } = {}) {
    const id = uuidv4();
    const workflowName = name ?? `workflow_${id}`;
    this.events = new WorkflowEvents();
    this.state = new WorkflowState({
      complete_time: null,
      create_time: null,
      cancel_time: null,
      current_step: null,
      current_step_index: 0,
      exit_on_failure: exit_on_failure,
      freeze_on_completion: freeze_on_completion,
      id: id,
      name: workflowName,
      pause_time: null,
      resume_time: null,
      should_break: false,
      should_continue: false,
      should_pause: false,
      should_skip: false,
      start_time: null,
      status: null,
      output_data: [],
      steps: steps,
      sub_step_type_paths: sub_step_type_paths,
    });

    this.setListeners();

    this.events.emit(this.events.event_names.WORKFLOW_CREATED, { workflow: this });
  }

  /**
   * Removes all steps from the workflow.
   * @returns {void}
   */
  clearSteps() {
    this.state.set('steps', []);
    this.events.emit(this.events.event_names.WORKFLOW_STEPS_CLEARED, { workflow: this });
  }

  /**
   * Decrements the current step index by 1.
   * @returns {void}
   */
  decrementStepIndex() {
    this.state.set('current_step_index', this.state.get('current_step_index') - 1);
  }

  /**
   * Executes all steps in the workflow sequentially until completion or error.
   * Emits workflow started, completed, and errored events as appropriate.
   * Passes workflow state to each step via setWorkflow() before execution.
   * @async
   * @param {WorkflowState} [initialState=null] - Optional initial state to merge before execution.
   * @returns {Promise<Workflow>} The workflow instance with final state after execution.
   * @throws {Error} If any step in the workflow throws an error during execution and exit_on_failure is true.
   */
  async execute(initialState = null) {
    if (initialState && !(initialState instanceof WorkflowState)) {
      throw new Error('initialState must be an instance of WorkflowState');
    }

    if (initialState) {
      this.state.merge(initialState);
    }

    this.logWorkflow(this.events.event_names.WORKFLOW_STARTED, { workflow: this.state.getState() }, `Workflow "${this.state.get('name')}" started.`);
    this.markAsRunning();

    this.state.set('output_data', []);

    if (this.isEmpty()) {
      this.markAsComplete();
      return this.state.getStateClone();
    }

    let iterator = this.state.get('current_step_index');
    const steps = this.state.get('steps').slice(iterator);
    for await (const step of steps) {
      if (this.state.get('should_break')) {
        break;
      }

      if (this.state.get('should_skip')) {
        this.state.set('should_skip', false);
        continue;
      }
      
      try {
        const result = await this.step(step);
        this.state.get('output_data').push(result);
      } catch (error) {
        this.incrementStepIndex();
        this.markAsFailed(error, true, false);

        if (this.state.get('exit_on_failure')) {
          return { ...this.state.getStateClone(), error };
        }
      }

      this.incrementStepIndex();

      if (this.state.get('should_pause')) {
        this.pause();
        break;
      }
    }

    this.markAsComplete();

    return this.state.getStateClone();
  }

  /**
   * Retrieves all steps in the workflow.
   * @returns {Array} An array of all step objects in the workflow.
   */
  getSteps() {
    return this.state.get('steps');
  }

  /**
   * Increments the current step index by 1.
   * @returns {void}
   */
  incrementStepIndex() {
    this.state.set('current_step_index', this.state.get('current_step_index') + 1);
  }

  /**
   * Checks if the workflow has no steps.
   * @returns {boolean} True if the workflow is empty, false otherwise.
   */
  isEmpty() {
    return !this.state.get('steps').length;
  }

  /**
   * Logs workflow status information to the console unless logging is suppressed.
   * Failed workflows are logged as errors, all others as standard logs.
   * @param {string} event_name - The event name to emit.
   * @param {Object} [data=this.state.getState()] - Event data to emit and potentially log.
   * @param {string} [message=null] - Optional custom message to log. If not provided, uses default status message.
   * @returns {void}
   */
  logWorkflow(event_name, data = this.state.getState(), message = null) {
    if (event_name) {
      this.events.emit(event_name, { step: this, ...data });
    }

    if (this.state.get('log_suppress')) {
      return;
    }

    const log_type = this.state.get('status') === workflow_statuses.FAILED ? 'error' : 'log';
    const message_to_log = `[${new Date().toISOString()}] - ${message ? message : `Workflow "${this.state.get('name')}" ${this.state.get('status')}.`}`
    console[log_type](message_to_log);
  }

  /**
   * Marks the workflow as complete and updates completion metrics.
   * Sets execution time, end time, and status to COMPLETE.
   * @returns {void}
   */
  markAsComplete() {
    const end_time = Date.now();
    this.state.set('execution_time_ms', end_time - this.state.get('start_time'));
    this.state.set('end_time', end_time);
    this.state.set('status', workflow_statuses.COMPLETE);
    this.state.prepare(this.state.get('start_time'), this.state.get('freeze_on_completion') ?? true);
    this.logWorkflow(this.events.event_names.WORKFLOW_COMPLETED, null, `Workflow "${this.state.get('name')}" is now complete.`);
  }

  /**
   * Marks the workflow as failed and updates failure metrics.
   * Sets execution time, end time, and status to FAILED.
   * @param {Error} error - The error that caused the workflow to fail.
   * @param {boolean} [fire_event=true] - Whether to emit the WORKFLOW_FAILED event.
   * @returns {void}
   */
  markAsFailed(error, fire_event = true, freeze = true) {
    const end_time = Date.now();
    this.state.set('end_time', end_time);
    this.state.set('status', workflow_statuses.FAILED);

    if (freeze) {
      this.state.prepare(this.state.get('start_time'), this.state.get('freeze_on_completion') ?? true);
    }

    this.logWorkflow(fire_event ? this.events.event_names.WORKFLOW_FAILED : null, { error }, `Workflow "${this.state.get('name')}" failed with error: ${error.message}`);
  }

  /**
   * Marks the workflow as created and logs creation event.
   * Sets status to CREATED.
   * @param {boolean} [fire_event=true] - Whether to emit the WORKFLOW_CREATED event.
   * @returns {void}
   */
  markAsCreated(fire_event = true) {
    this.state.set('status', workflow_statuses.CREATED);
    this.logWorkflow(fire_event ? this.events.event_names.WORKFLOW_CREATED : null, null, `Workflow "${this.state.get('name')}" is now created.`);
  }

  /**
   * Marks the workflow as paused and logs pause event.
   * Sets status to PAUSED.
   * @param {boolean} [fire_event=true] - Whether to emit the WORKFLOW_PAUSED event.
   * @returns {void}
   */
  markAsPaused(fire_event = true) {
    this.state.set('status', workflow_statuses.PAUSED);
    this.logWorkflow(fire_event ? this.events.event_names.WORKFLOW_PAUSED : null, null, `Workflow "${this.state.get('name')}" is now paused.`); 
  }

  /**
   * Marks the workflow as resumed and logs resume event.
   * Sets status to RESUMED.
   * @param {boolean} [fire_event=true] - Whether to emit the WORKFLOW_RESUMED event.
   * @returns {void}
   */
  markAsResumed(fire_event = true) {
    this.state.set('should_pause', false);
    this.state.set('resume_time', Date.now());
    this.state.set('status', workflow_statuses.RESUMED);
    this.logWorkflow(fire_event ? this.events.event_names.WORKFLOW_RESUMED : null, null, `Workflow "${this.state.get('name')}" is now resumed.`);
  }

  /**
   * Marks the workflow as running and updates start metrics.
   * Sets start time and status to RUNNING.
   * @returns {void}
   */
  markAsRunning() {
    this.state.set('start_time', Date.now());
    this.state.set('status', workflow_statuses.RUNNING);
    this.logWorkflow(this.events.event_names.WORKFLOW_RUNNING, null, `Workflow "${this.state.get('name')}" is now running.`);
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
    this.events.emit(this.events.event_names.WORKFLOW_STEP_MOVED, { workflow: this, movedStep });
  }

  /**
   * Pauses the workflow execution.
   * Sets the should_pause flag to true.
   * @returns {void}
   */
  pause() {
    this.state.set('should_pause', true);
    this.state.set('paused_time', Date.now());
    this.markAsPaused();
  }

  /**
   * Adds a single step to the end of the workflow.
   * @param {Object} step - The step object to add to the workflow.
   * @returns {void}
   */
  pushStep(step) {
    this.state.get('steps').push(step);
    this.events.emit(this.events.event_names.WORKFLOW_STEP_ADDED, { workflow: this, step });
  }

  /**
   * Adds multiple steps to the end of the workflow.
   * @param {Array} steps - An array of step objects to add to the workflow.
   * @returns {void}
   */
  pushSteps(steps) {
    this.state.set('steps', [...this.state.get('steps'), ...steps]);
    this.events.emit(this.events.event_names.WORKFLOW_STEPS_ADDED, { workflow: this, steps });
  }

  /**
   * Removes a step from the workflow at the specified index.
   * @param {number} index - The index of the step to remove.
   * @returns {Array} An array containing the removed step.
   */
  removeStep(index) {
    const removedStep = this.state.get('steps').splice(index, 1);
    this.events.emit(this.events.event_names.WORKFLOW_STEP_REMOVED, { workflow: this, removedStep });
    return removedStep;
  }

  /**
   * Continues execution of a paused workflow.
   * Resets the should_pause flag and resumes execution from the current step index.
   * @async
   * @returns {Promise<Workflow>} The workflow instance with final state after execution.
   */
  async resume() {
    this.markAsResumed();
    return await this.execute();
  }

  /**
   * Serializes a value recursively, handling circular references and various data types.
   * @private
   * @param {*} value - The value to serialize.
   * @param {number} depth - Current recursion depth.
   * @param {string} path - Current path in the object tree.
   * @param {Object} options - Serialization options.
   * @param {WeakMap} seen - Map to track circular references.
   * @param {WeakMap} pathMap - Map to track paths of seen objects.
   * @returns {*} Serialized value.
   */
  serializeValue(value, depth = 0, path = 'root', options = {}, seen = new WeakMap(), pathMap = new WeakMap()) {
    const {
      includeEvents = false,
      maxDepth = 50
    } = options;

    // Handle depth limit
    if (depth > maxDepth) {
      return '[Max Depth Exceeded]';
    }

    // Handle null and undefined
    if (value === null) return null;
    if (value === undefined) return undefined;

    // Handle primitives
    const valueType = typeof value;
    if (valueType === 'string' || valueType === 'number' || valueType === 'boolean') {
      return value;
    }

    // Handle functions - always serialize as string identifier
    if (valueType === 'function') {
      return `[Function: ${value.name || 'anonymous'}]`;
    }

    // Handle dates
    if (value instanceof Date) {
      return value.toISOString();
    }

    // Handle Step and Workflow instances
    const isWorkflow = value instanceof Workflow || (value.execute && typeof value.step === 'function');
    const isStep = !isWorkflow && (value.execute && value.markAsComplete && typeof value.markAsComplete === 'function');

    if (isStep || isWorkflow) {
      // Check for circular reference
      if (seen.has(value)) {
        return `[CircularReference: ${pathMap.get(value)}]`;
      }

      seen.set(value, true);
      pathMap.set(value, path);

      const serialized = {
        __type: isWorkflow ? 'Workflow' : 'Step',
        name: value.state?.get('name') || 'unnamed',
        id: value.state?.get('id')
      };

      if (isStep && value.state?.get('type')) {
        serialized.type = value.state.get('type');
      }

      // Serialize the state if available
      if (value.state && typeof value.state.getState === 'function') {
        serialized.state = this.serializeValue(value.state, depth + 1, `${path}.state`, options, seen, pathMap);
      }

      seen.delete(value);
      return serialized;
    }

    // Handle arrays
    if (Array.isArray(value)) {
      // Check for circular reference
      if (seen.has(value)) {
        return `[CircularReference: ${pathMap.get(value)}]`;
      }

      seen.set(value, true);
      pathMap.set(value, path);

      const serialized = value.map((item, index) =>
        this.serializeValue(item, depth + 1, `${path}[${index}]`, options, seen, pathMap)
      );

      seen.delete(value);
      return serialized;
    }

    // Handle objects
    if (valueType === 'object') {
      // Check for circular reference
      if (seen.has(value)) {
        return `[CircularReference: ${pathMap.get(value)}]`;
      }

      seen.set(value, true);
      pathMap.set(value, path);

      const serialized = {};

      // Handle special object types
      if (value.constructor && value.constructor.name !== 'Object') {
        serialized.__className = value.constructor.name;
      }

      // Get state from State instances
      if (value.getState && typeof value.getState === 'function') {
        const stateData = value.getState();
        Object.keys(stateData).forEach(key => {
          // Skip events unless explicitly included
          if (key === 'events' && !includeEvents) return;

          serialized[key] = this.serializeValue(
            stateData[key],
            depth + 1,
            `${path}.${key}`,
            options,
            seen,
            pathMap
          );
        });

        seen.delete(value);
        return serialized;
      }

      // Serialize regular objects dynamically
      for (const key in value) {
        // Skip prototype chain properties
        if (!Object.prototype.hasOwnProperty.call(value, key)) continue;

        // Skip events and event emitters unless explicitly included
        if ((key === 'events' || key === '_events' || key === '_eventsCount') && !includeEvents) {
          continue;
        }

        serialized[key] = this.serializeValue(
          value[key],
          depth + 1,
          `${path}.${key}`,
          options,
          seen,
          pathMap
        );
      }

      seen.delete(value);
      return serialized;
    }

    // Fallback for other types
    return String(value);
  };

  /**
   * Sets up event listeners for all workflow lifecycle events.
   * Configures handlers for workflow creation, execution, completion, errors, pausing,
   * resuming, and step management events.
   * @returns {void}
   */
  setListeners() {
    this.events.on(this.events.event_names.WORKFLOW_CANCELLED, (data) => {
      this.logWorkflow(null, `Workflow "${this.state.get('name')}" cancelled at ${this.state.get('cancel_time')}.`);
      this.state.set('status', workflow_statuses.CANCELLED);
      this.state.prepare(this.state.get('start_time'), this.state.get('freeze_on_completion') ?? true);
    });

    this.events.on(this.events.event_names.WORKFLOW_COMPLETED, (data) => {
      this.markAsComplete(false);
      this.state.prepare(this.state.get('start_time'), this.state.get('freeze_on_completion') ?? true);
    });

    this.events.on(this.events.event_names.WORKFLOW_CREATED, (data) => {
      this.markAsCreated(false);
    });

    this.events.on(this.events.event_names.WORKFLOW_ERRORED, (data) => {
      this.logWorkflow(null, `Workflow "${this.state.get('name')}" errored: ${data.error}`);
      this.state.set('status', workflow_statuses.ERRORED);
      this.state.prepare(this.state.get('start_time'), this.state.get('freeze_on_completion') ?? true);
    });

    this.events.on(this.events.event_names.WORKFLOW_FAILED, (data) => {
      this.markAsFailed(data, false);
      this.state.prepare(this.state.get('start_time'), this.state.get('freeze_on_completion') ?? true);
    });

    this.events.on(this.events.event_names.WORKFLOW_PAUSED, (data) => {
      this.markAsPaused(false);
    });

    this.events.on(this.events.event_names.WORKFLOW_RESUMED, (data) => {
      this.markAsResumed(false);
    });

    this.events.on(this.events.event_names.WORKFLOW_STARTED, (data) => {
      this.state.set('start_time', Date.now());
      this.logWorkflow(null, `Workflow "${this.state.get('name')}" started at ${this.state.get('start_time')}.`);
      this.state.set('status', workflow_statuses.RUNNING);
    });

    this.events.on(this.events.event_names.WORKFLOW_STEP_ADDED, (data) => {
      this.logWorkflow(null, `Step added to workflow "${this.state.get('name')}" with ID: ${this.state.get('id')}.`);
    });

    this.events.on(this.events.event_names.WORKFLOW_STEP_MOVED, (data) => {
      this.logWorkflow(null, `Step moved in workflow "${this.state.get('name')}" with ID: ${this.state.get('id')}.`);
    });

    this.events.on(this.events.event_names.WORKFLOW_STEP_REMOVED, (data) => {
      this.logWorkflow(null, `Step removed from workflow "${this.state.get('name')}" with ID: ${this.state.get('id')}.`);
    });

    this.events.on(this.events.event_names.WORKFLOW_STEP_SHIFTED, (data) => {
      this.logWorkflow(null, `Step shifted from workflow "${this.state.get('name')}" with ID: ${this.state.get('id')}.`);
    });

    this.events.on(this.events.event_names.WORKFLOW_STEP_SKIPPED, (data) => {
      this.logWorkflow(null, `Step skipped in workflow "${this.state.get('name')}" with ID: ${this.state.get('id')}.`);
    });

    this.events.on(this.events.event_names.WORKFLOW_STEPS_ADDED, (data) => {
      this.logWorkflow(null, `Steps added to workflow "${this.state.get('name')}" with ID: ${this.state.get('id')}.`);
    });

    this.events.on(this.events.event_names.WORKFLOW_STEPS_CLEARED, (data) => {
      this.logWorkflow(null, `Steps cleared from workflow "${this.state.get('name')}" with ID: ${this.state.get('id')}.`);
    });
  }

  /**
   * Sets the execution state for this workflow. Provides a snapshot of the workflow state
   * at the time of execution. The state is an object containing state information
   * accessible during workflow execution. Also creates a mapping of steps by their IDs
   * for easy access.
   * @param {Object} state - The state object to set.
   * @returns {WorkflowState} The workflow state object.
   */
  setState(state) {
    if (!state || typeof state.getState !== 'function') {
      throw new Error('setState requires a State instance');
    }

    const stateClone = state.getStateClone();
    const originalSteps = state.get('steps');
    
    this.state = new WorkflowState(stateClone);
    
    // Preserve the original step instances instead of cloned objects
    this.state.set('steps', originalSteps);

    const steps_by_id = {};
    const steps = this.state.get('steps');

    if (steps && steps.length) {
      steps.forEach(step => {
        steps_by_id[step.state.get('id')] = step;
      });
    }

    this.state.set('steps_by_id', steps_by_id);

    return this.state;
  }

  /**
   * Removes and returns the first step from the workflow.
   * @returns {Object|undefined} The first step object, or undefined if the workflow is empty.
   */
  shiftStep() {
    const shiftedStep = this.state.get('steps').shift();
    this.events.emit(this.events.event_names.WORKFLOW_STEP_SHIFTED, { workflow: this, shiftedStep });
    return shiftedStep;
  }

  /**
   * Executes a step in the workflow. Sets the step's workflow reference via setWorkflow(),
   * marks its status, executes it, and handles flow control flags (should_break, should_continue, should_skip).
   * DELAY type steps are marked as waiting, all other steps are marked as running.
   * @async
   * @param {Step} step - The step to execute.
   * @throws {Error} Throws an error if the workflow is empty or if a step execution fails.
   * @returns {Promise<Object>} The result of executing the step containing {result, state}.
   */
  async step(step) {
    if (this.isEmpty()) {
      throw new Error('No steps available in the workflow.');
    }

    step.setWorkflow(this.state);

    this.state.set('current_step', step);

    if (step.state.get('type') === step_types.DELAY) {
      const currentIndex = this.state.get('current_step_index');
      const steps = this.state.get('steps');
      if (currentIndex + 1 < steps.length) {
        steps[currentIndex + 1].markAsPending();
      }
      step.markAsWaiting();
    } else {
      step.markAsRunning();
    }

    let result;

    try {
      result = await step.execute(this.state);

      this.state.set('should_break', step.state.get('should_break') ?? this.state.get('should_break'));
      this.state.set('should_continue', step.state.get('should_continue') ?? this.state.get('should_continue'));
      this.state.set('should_skip', step.state.get('should_skip') ?? this.state.get('should_skip'));
    } catch (error) {
      step.markAsFailed(error);
      throw error;
    }

    step.markAsComplete();

    return result;
  }

  /**
   * Serializes the workflow data to a JSON-compatible object, handling circular references.
   * @param {number} [tabs=2] - Number of spaces for indentation in the JSON string.
   * @returns {Object} A JSON-serializable representation of the workflow.
   */
  toJSON(tabs = 2) {
    return JSON.stringify(this.serializeValue(this, 0, 'workflow'), null, tabs);
  }  
}
