import { v4 as uuidv4 } from 'uuid';
import WorkflowEvents from './workflow_event.js';
import state from './state.js';
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
   * @param {boolean} [options.exit_on_failure=false] - Whether to exit the workflow when a step fails.
   * @param {boolean} [options.freeze_on_completion=true] - Whether to freeze the state after completion.
   * @param {string[]} [options.sub_step_type_paths=[]] - Additional directories to scan for sub step types.
   */
  constructor({ steps = [], name = null, exit_on_failure = false, freeze_on_completion = true, sub_step_type_paths = [] } = {}) {
    this.id = uuidv4();
    const workflowName = name ?? `workflow_${this.id}`;
    this.events = new WorkflowEvents();

    this.initializeWorkflowState(this.id, steps, workflowName, exit_on_failure, freeze_on_completion, sub_step_type_paths);

    this.setListeners();

    this.events.emit(this.events.event_names.WORKFLOW_CREATED, { workflow: this });
  }

  /**
   * Removes all steps from the workflow.
   * @returns {void}
   */
  clearSteps() {
    this.setWorkflowValue('steps', []);
    this.events.emit(this.events.event_names.WORKFLOW_STEPS_CLEARED, { workflow: this });
  }

  /**
   * Decrements the current step index by 1.
   * @returns {void}
   */
  decrementStepIndex() {
    this.setWorkflowValue('current_step_index', this.getWorkflowValue('current_step_index') - 1);
  }

  /**
   * Executes all steps in the workflow sequentially until completion or error.
   * Emits workflow started, completed, and errored events as appropriate.
   * 
   * The workflow:
   * 1. Merges any initial state provided
   * 2. Iterates through each step in sequence
   * 3. Handles flow control flags (should_break, should_skip, should_pause)
   * 4. Collects output data from each step
   * 5. Returns a clone of the final global state
   * 
   * @async
   * @param {Object} [initialState=null] - Optional initial state properties to merge into global state before execution.
   * @returns {Promise<Object>} A deep clone of the global state after execution, including output_data array.
   * @throws {Error} If any step in the workflow throws an error during execution and exit_on_failure is true.
   * @example
   * const workflow = new Workflow({
   *   name: 'data-processor',
   *   steps: [step1, step2, step3]
   * });
   * 
   * const result = await workflow.execute({ input_data: [1, 2, 3] });
   * console.log(result.output_data); // Array of results from each step
   */
  async execute(initialState = null) {
    // Push this workflow onto the stack
    const workflowStack = state.get('workflow_stack') || [];
    workflowStack.push(this.id);
    state.set('workflow_stack', workflowStack);
    state.set('active_workflow_id', this.id);

    if (initialState) {
      state.merge(initialState);
    }

    this.logWorkflow(this.events.event_names.WORKFLOW_STARTED, { workflow: this.getWorkflowState() }, `Workflow "${this.getWorkflowValue('name')}" started.`);
    this.markAsRunning();

    if (this.isEmpty()) {
      this.markAsComplete();
      this.popWorkflowStack();
      return this.buildReturnState();
    }

    let iterator = this.getWorkflowValue('current_step_index');
    const steps = this.getWorkflowValue('steps').slice(iterator);
    for await (const step of steps) {
      if (this.getWorkflowValue('should_break')) {
        break;
      }

      if (this.getWorkflowValue('should_skip')) {
        this.setWorkflowValue('should_skip', false);
        continue;
      }
     
      try {
        const result = await this.step(step);

        const output_data = this.getWorkflowValue('output_data');
        output_data.push(result);
        this.setWorkflowValue('output_data', output_data);
      } catch (error) {
        this.markAsFailed(error, true);

        if (this.getWorkflowValue('exit_on_failure')) {
          this.popWorkflowStack();
          return { ...this.buildReturnState(), error };
        }
      }

      if (this.getWorkflowValue('should_pause')) {
        this.pause();
        break;
      }
    }

    this.markAsComplete();

    this.popWorkflowStack();

    return this.buildReturnState();
  }

  /**
   * Retrieves all steps in the workflow.
   * @returns {Array} An array of all step objects in the workflow.
   */
  getSteps() {
    return this.getWorkflowValue('steps');
  }

  /**
   * Increments the current step index by 1.
   * @returns {void}
   */
  incrementStepIndex() {
    this.setWorkflowValue('current_step_index', this.getWorkflowValue('current_step_index') + 1);
  }

  /**
   * Initializes all workflow state properties in the global state object.
   * Called automatically by the constructor.
   * 
   * Sets up:
   * - Workflow identification (id, name)
   * - Execution configuration (exit_on_failure, freeze_on_completion)
   * - Control flags (should_break, should_continue, should_pause, should_skip)
   * - Timing properties (start_time, pause_time, resume_time, etc.)
   * - Steps array via pushSteps()
   * 
   * @param {string} id - Unique UUID for this workflow instance.
   * @param {Array} steps - Initial array of steps to add.
   * @param {string} name - Name of the workflow.
   * @param {boolean} exit_on_failure - Whether to stop execution on step failure.
   * @param {boolean} freeze_on_completion - Whether to freeze state after completion.
   * @param {Array<string>} sub_step_type_paths - Additional directories for custom step types.
   * @returns {void}
   * @private
   */
  initializeWorkflowState(id, steps, name, exit_on_failure, freeze_on_completion, sub_step_type_paths) {
    // Ensure workflows object exists
    if (!state.get('workflows')) {
      state.set('workflows', {});
    }

    // Initialize this workflow's namespaced state
    state.set(`workflows.${id}`, {
      id: id,
      name: name,
      exit_on_failure: exit_on_failure,
      freeze_on_completion: freeze_on_completion,
      complete_time: null,
      create_time: null,
      cancel_time: null,
      current_step: null,
      current_step_index: 0,
      pause_time: null,
      resume_time: null,
      should_break: false,
      should_continue: false,
      should_pause: false,
      should_skip: false,
      start_time: null,
      status: null,
      output_data: [],
      sub_step_type_paths: sub_step_type_paths,
      steps: []
    });

    this.pushSteps(steps);
  }

  /**
   * Checks if the workflow has no steps.
   * @returns {boolean} True if the workflow is empty, false otherwise.
   */
  isEmpty() {
    const steps = this.getWorkflowValue('steps');
    return !steps || steps.length === 0;
  }

  /**
   * Logs workflow status information to the console unless logging is suppressed.
   * Failed workflows are logged as errors, all others as standard logs.
   * @param {string} event_name - The event name to emit.
   * @param {Object} [data=state.getState()] - Event data to emit and potentially log.
   * @param {string} [message=null] - Optional custom message to log. If not provided, uses default status message.
   * @returns {void}
   */
  logWorkflow(event_name, data = this.getWorkflowState(), message = null) {
    if (event_name) {
      this.events.emit(event_name, { step: this, ...data });
    }

    if (state.get('log_suppress')) {
      return;
    }

    const log_type = this.getWorkflowValue('status') === workflow_statuses.FAILED ? 'error' : 'log';
    const message_to_log = `[${new Date().toISOString()}] - ${message ? message : `Workflow "${this.getWorkflowValue('name')}" ${this.getWorkflowValue('status')}.`}`
    console[log_type](message_to_log);
  }

  /**
   * Marks the workflow as complete and updates completion metrics.
   * Sets execution time, end time, and status to COMPLETE.
   * @returns {void}
   */
  markAsComplete() {
    this.logWorkflow(this.events.event_names.WORKFLOW_COMPLETED, null, `Workflow "${this.getWorkflowValue('name')}" is now complete.`);
  }

  /**
   * Marks the workflow as failed and updates failure metrics.
   * Sets execution time, end time, and status to FAILED.
   * @param {Error} error - The error that caused the workflow to fail.
   * @param {boolean} [fire_event=true] - Whether to emit the WORKFLOW_FAILED event.
   * @returns {void}
   */
  markAsFailed(error, fire_event = true) {
    const end_time = Date.now();
    this.setWorkflowValue('end_time', end_time);
    this.setWorkflowValue('status', workflow_statuses.FAILED);
    this.setWorkflowValue('execution_time_ms', end_time - this.getWorkflowValue('start_time'));

    this.logWorkflow(fire_event ? this.events.event_names.WORKFLOW_FAILED : null, { error }, `Workflow "${this.getWorkflowValue('name')}" failed with error: ${error.message}`);
  }

  /**
   * Marks the workflow as created and logs creation event.
   * Sets status to CREATED.
   * @param {boolean} [fire_event=true] - Whether to emit the WORKFLOW_CREATED event.
   * @returns {void}
   */
  markAsCreated(fire_event = true) {
    this.setWorkflowValue('status', workflow_statuses.CREATED);
    this.logWorkflow(fire_event ? this.events.event_names.WORKFLOW_CREATED : null, null, `Workflow "${this.getWorkflowValue('name')}" is now created.`);
  }

  /**
   * Marks the workflow as paused and logs pause event.
   * Sets status to PAUSED.
   * @param {boolean} [fire_event=true] - Whether to emit the WORKFLOW_PAUSED event.
   * @returns {void}
   */
  markAsPaused(fire_event = true) {
    this.setWorkflowValue('status', workflow_statuses.PAUSED);
    this.logWorkflow(fire_event ? this.events.event_names.WORKFLOW_PAUSED : null, null, `Workflow "${this.getWorkflowValue('name')}" is now paused.`); 
  }

  /**
   * Marks the workflow as resumed and logs resume event.
   * Sets status to RESUMED.
   * @param {boolean} [fire_event=true] - Whether to emit the WORKFLOW_RESUMED event.
   * @returns {void}
   */
  markAsResumed(fire_event = true) {
    this.setWorkflowValue('should_pause', false);
    this.setWorkflowValue('resume_time', Date.now());
    this.setWorkflowValue('status', workflow_statuses.RESUMED);
    this.logWorkflow(fire_event ? this.events.event_names.WORKFLOW_RESUMED : null, null, `Workflow "${this.getWorkflowValue('name')}" is now resumed.`);
  }

  /**
   * Marks the workflow as running and updates start metrics.
   * Sets start time and status to RUNNING.
   * @returns {void}
   */
  markAsRunning() {
    this.setWorkflowValue('start_time', Date.now());
    this.setWorkflowValue('status', workflow_statuses.RUNNING);
    this.logWorkflow(this.events.event_names.WORKFLOW_RUNNING, null, `Workflow "${this.getWorkflowValue('name')}" is now running.`);
  }

  /**
   * Moves a step from one position to another in the workflow.
   * @param {number} fromIndex - The index of the step to move.
   * @param {number} toIndex - The destination index where the step should be placed.
   * @returns {Array} The result of the splice operation.
   */
  moveStep(fromIndex, toIndex) {
    const steps = this.getWorkflowValue('steps');
    const [movedStep] = steps.splice(fromIndex, 1);
    steps.splice(toIndex, 0, movedStep);
    this.setWorkflowValue('steps', steps);
    this.events.emit(this.events.event_names.WORKFLOW_STEP_MOVED, { workflow: this, movedStep });
  }

  /**
   * Pauses the workflow execution.
   * Sets the should_pause flag to true.
   * @returns {void}
   */
  pause() {
    this.setWorkflowValue('should_pause', true);
    this.setWorkflowValue('paused_time', Date.now());
    this.markAsPaused();
  }

  /**
   * Adds a single step to the end of the workflow.
   * 
   * This method:
   * 1. Sets the step's current_step_index property
   * 2. Adds the step to the global state steps array
   * 3. Suppresses the "direct steps modification" warning
   * 4. Emits WORKFLOW_STEP_ADDED event
   * 
   * @param {Step} step - The step object to add to the workflow.
   * @returns {void}
   * @example
   * const workflow = new Workflow({ name: 'my-workflow' });
   * const step = new Step({
   *   name: 'process-data',
   *   type: step_types.ACTION,
   *   callable: async () => ({ result: 'done' })
   * });
   * workflow.pushStep(step);
   */
  pushStep(step) {
    state.set('suppress_step_warning', true);

    step.current_step_index = this.getWorkflowValue('steps').length;
    const currentSteps = this.getWorkflowValue('steps') ?? [];
    currentSteps.push(step);

    this.setWorkflowValue('steps', currentSteps);

    state.delete('suppress_step_warning');
    this.events.emit(this.events.event_names.WORKFLOW_STEP_ADDED, { workflow: this, step });
  }

  /**
   * Adds multiple steps to the end of the workflow.
   * Internally calls pushStep() for each step to ensure proper state initialization.
   * 
   * @param {Array<Step>} steps - An array of step objects to add to the workflow.
   * @returns {void}
   * @example
   * const workflow = new Workflow({ name: 'my-workflow' });
   * workflow.pushSteps([step1, step2, step3]);
   */
  pushSteps(steps) {
    if (!steps.length || !Array.isArray(steps)) {
      console.warn('No steps provided to pushSteps.');
      return;
    }

    for (const step of steps) {
      this.pushStep(step);
    }

    this.events.emit(this.events.event_names.WORKFLOW_STEPS_ADDED, { workflow: this, steps });
  }

  /**
   * Removes a step from the workflow at the specified index.
   * @param {number} index - The index of the step to remove.
   * @returns {Array} An array containing the removed step.
   */
  removeStep(index) {
    const steps = this.getWorkflowValue('steps');
    const removedStep = steps.splice(index, 1);
    this.setWorkflowValue('steps', steps);
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
        // Try to get ID for circular reference
        let refId = null;
        if (isWorkflow) {
          refId = value.id;
        } else if (isStep && value.current_step_index !== null) {
          const activeWorkflowId = state.get('active_workflow_id');
          if (activeWorkflowId) {
            refId = state.get(`workflows.${activeWorkflowId}.steps.${value.current_step_index}.id`);
          }
        }
        
        if (refId) {
          return `[CircularReference: ${refId}]`;
        }
        // Fallback to property name from path
        const pathParts = pathMap.get(value).split('.');
        const propertyName = pathParts[pathParts.length - 1];
        return `[CircularReference: ${propertyName}]`;
      }

      seen.set(value, true);
      pathMap.set(value, path);

      const serialized = {
        __type: isWorkflow ? 'Workflow' : 'Step'
      };

      if (isWorkflow) {
        // Serialize workflow using namespaced state
        const workflowId = value.id;
        serialized.name = state.get(`workflows.${workflowId}.name`) || 'unnamed';
        serialized.id = state.get(`workflows.${workflowId}.id`);
        serialized.status = state.get(`workflows.${workflowId}.status`);
        serialized.current_step_index = state.get(`workflows.${workflowId}.current_step_index`);
        serialized.exit_on_failure = state.get(`workflows.${workflowId}.exit_on_failure`);
        serialized.freeze_on_completion = state.get(`workflows.${workflowId}.freeze_on_completion`);
        serialized.should_break = state.get(`workflows.${workflowId}.should_break`);
        serialized.should_continue = state.get(`workflows.${workflowId}.should_continue`);
        serialized.should_pause = state.get(`workflows.${workflowId}.should_pause`);
        serialized.should_skip = state.get(`workflows.${workflowId}.should_skip`);
        serialized.start_time = state.get(`workflows.${workflowId}.start_time`);
        serialized.end_time = state.get(`workflows.${workflowId}.end_time`);
        serialized.execution_time_ms = state.get(`workflows.${workflowId}.execution_time_ms`);
        serialized.pause_time = state.get(`workflows.${workflowId}.pause_time`);
        serialized.resume_time = state.get(`workflows.${workflowId}.resume_time`);
        
        // Serialize steps array
        const steps = state.get(`workflows.${workflowId}.steps`);
        if (steps && Array.isArray(steps)) {
          serialized.steps = this.serializeValue(steps, depth + 1, `${path}.steps`, options, seen, pathMap);
        }
        
        // Serialize output data
        const outputData = state.get(`workflows.${workflowId}.output_data`);
        if (outputData) {
          serialized.output_data = this.serializeValue(outputData, depth + 1, `${path}.output_data`, options, seen, pathMap);
        }
      } else if (isStep) {
        // Serialize step using its state path within the active workflow
        const stepIndex = value.current_step_index;
        const activeWorkflowId = state.get('active_workflow_id');
        if (stepIndex !== null && activeWorkflowId) {
          serialized.name = state.get(`workflows.${activeWorkflowId}.steps.${stepIndex}.name`) || 'unnamed';
          serialized.id = state.get(`workflows.${activeWorkflowId}.steps.${stepIndex}.id`);
          serialized.type = state.get(`workflows.${activeWorkflowId}.steps.${stepIndex}.type`);
          serialized.status = value.status;
          serialized.start_time = state.get(`workflows.${activeWorkflowId}.steps.${stepIndex}.start_time`);
          serialized.end_time = state.get(`workflows.${activeWorkflowId}.steps.${stepIndex}.end_time`);
          serialized.execution_time_ms = state.get(`workflows.${activeWorkflowId}.steps.${stepIndex}.execution_time_ms`);
          
          // Serialize callable if it's another Step or Workflow
          const callable = state.get(`workflows.${activeWorkflowId}.steps.${stepIndex}.callable`);
          if (callable && (callable instanceof Workflow || callable instanceof Step)) {
            serialized.callable = this.serializeValue(callable, depth + 1, `${path}.callable`, options, seen, pathMap);
          } else if (typeof callable === 'function') {
            serialized.callable = `[Function: ${callable.name || 'anonymous'}]`;
          }
        } else {
          // Step without index - use basic properties
          serialized.name = value.name || 'unnamed';
          serialized.type = value.type;
          serialized.status = value.status;
        }
      }

      seen.delete(value);
      return serialized;
    }

    // Handle arrays
    if (Array.isArray(value)) {
      // Check for circular reference
      if (seen.has(value)) {
        // Try to extract a meaningful identifier from the path
        const pathParts = path.split('.');
        const propertyName = pathParts[pathParts.length - 1];
        return `[CircularReference: ${propertyName}]`;
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
        // Try to get an ID from the object
        let refId = null;
        if (value.id) {
          refId = value.id;
        } else if (value.state && typeof value.state.get === 'function') {
          refId = value.state.get('id');
        }
        
        if (refId) {
          return `[CircularReference: ${refId}]`;
        }
        
        // Fallback to property name from path
        const pathParts = path.split('.');
        const propertyName = pathParts[pathParts.length - 1].replace(/\[.*\]$/, '');
        return `[CircularReference: ${propertyName}]`;
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
      this.setWorkflowValue('status', workflow_statuses.CANCELLED);
      const end_time = Date.now();
      this.setWorkflowValue('execution_time_ms', end_time - this.getWorkflowValue('start_time'));
      this.setWorkflowValue('end_time', end_time);
    });

    this.events.on(this.events.event_names.WORKFLOW_COMPLETED, (data) => {
      const end_time = Date.now();
      this.setWorkflowValue('execution_time_ms', end_time - this.getWorkflowValue('start_time'));
      this.setWorkflowValue('end_time', end_time);
      this.setWorkflowValue('status', workflow_statuses.COMPLETE);
    });

    this.events.on(this.events.event_names.WORKFLOW_CREATED, (data) => {
      // Status already set by markAsCreated()
    });

    this.events.on(this.events.event_names.WORKFLOW_ERRORED, (data) => {
      this.setWorkflowValue('status', workflow_statuses.ERRORED);
      const end_time = Date.now();
      this.setWorkflowValue('execution_time_ms', end_time - this.getWorkflowValue('start_time'));
      this.setWorkflowValue('end_time', end_time);
    });

    this.events.on(this.events.event_names.WORKFLOW_FAILED, (data) => {
      // Status and logging already handled by markAsFailed()
    });

    this.events.on(this.events.event_names.WORKFLOW_PAUSED, (data) => {
      // Status already set by markAsPaused()
    });

    this.events.on(this.events.event_names.WORKFLOW_RESUMED, (data) => {
      // Status already set by markAsResumed()
    });

    this.events.on(this.events.event_names.WORKFLOW_STARTED, (data) => {
      // Status and start time already set by the execute() method
    });

    this.events.on(this.events.event_names.WORKFLOW_STEP_ADDED, (data) => {
      // External hook for step addition
    });

    this.events.on(this.events.event_names.WORKFLOW_STEP_MOVED, (data) => {
      // External hook for step movement
    });

    this.events.on(this.events.event_names.WORKFLOW_STEP_REMOVED, (data) => {
      // External hook for step removal
    });

    this.events.on(this.events.event_names.WORKFLOW_STEP_SHIFTED, (data) => {
      // External hook for step shifting
    });

    this.events.on(this.events.event_names.WORKFLOW_STEP_SKIPPED, (data) => {
      // External hook for step skipping
    });

    this.events.on(this.events.event_names.WORKFLOW_STEPS_ADDED, (data) => {
      // External hook for steps addition
    });

    this.events.on(this.events.event_names.WORKFLOW_STEPS_CLEARED, (data) => {
      // External hook for steps clearing
    });
  }

  /**
   * Removes and returns the first step from the workflow.
   * @returns {Object|undefined} The first step object, or undefined if the workflow is empty.
   */
  shiftStep() {
    const steps = this.getWorkflowValue('steps');
    const shiftedStep = steps.shift();
    this.setWorkflowValue('steps', steps);
    this.events.emit(this.events.event_names.WORKFLOW_STEP_SHIFTED, { workflow: this, shiftedStep });
    return shiftedStep;
  }

  /**
   * Executes a step in the workflow. Marks its status, executes it, and handles flow
   * control flags (should_break, should_continue, should_skip). DELAY type steps are marked as waiting,
   * all other steps are marked as running.
   * @async
   * @param {Step} step - The step to execute.
   * @throws {Error} Throws an error if the workflow is empty or if a step execution fails.
   * @returns {Promise<Object>} The result of executing the step containing {result, state}.
   */
  async step(step) {
    if (this.isEmpty()) {
      throw new Error('No steps available in the workflow.');
    }

    this.incrementStepIndex();

    this.setWorkflowValue('current_step', step);

    if (step.getStepStateValue('type') === step_types.DELAY) {
      const currentIndex = this.getWorkflowValue('current_step_index');
      const steps = this.getWorkflowValue('steps');
      if (currentIndex + 1 < steps.length) {
        steps[currentIndex + 1].markAsPending();
      }
      step.markAsWaiting();
    } else {
      step.markAsRunning();
    }

    let result;

    try {
      result = await step.execute();

      this.setWorkflowValue('should_break', step.getStepStateValue('should_break') ?? this.getWorkflowValue('should_break'));
      this.setWorkflowValue('should_continue', step.getStepStateValue('should_continue') ?? this.getWorkflowValue('should_continue'));
      this.setWorkflowValue('should_skip', step.getStepStateValue('should_skip') ?? this.getWorkflowValue('should_skip'));
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

  /**
   * Gets a value from this workflow's namespaced state.
   * @param {string} path - The path within the workflow state to retrieve.
   * @param {*} [defaultValue=null] - Default value to return if path doesn't exist.
   * @returns {*} The value at the specified path.
   */
  getWorkflowValue(path, defaultValue = null) {
    return state.get(`workflows.${this.id}.${path}`, defaultValue);
  }

  /**
   * Sets a value in this workflow's namespaced state.
   * @param {string} path - The path within the workflow state to set.
   * @param {*} value - The value to set.
   * @returns {void}
   */
  setWorkflowValue(path, value) {
    state.set(`workflows.${this.id}.${path}`, value);
  }

  /**
   * Gets the entire workflow state object.
   * @returns {Object} The workflow state.
   */
  getWorkflowState() {
    return state.get(`workflows.${this.id}`);
  }

  /**
   * Pops this workflow from the execution stack and restores parent as active.
   * @returns {void}
   */
  popWorkflowStack() {
    const workflowStack = state.get('workflow_stack') || [];
    workflowStack.pop();
    state.set('workflow_stack', workflowStack);
    
    if (workflowStack.length > 0) {
      state.set('active_workflow_id', workflowStack[workflowStack.length - 1]);
    } else {
      state.set('active_workflow_id', null);
    }
  }

  /**
   * Builds the return state combining workflow state and user data.
   * @returns {Object} Combined state object.
   */
  buildReturnState() {
    const clonedState = state.getStateClone();
    return {
      ...clonedState,
      // Override with this workflow's specific state for backwards compatibility
      id: this.getWorkflowValue('id'),
      name: this.getWorkflowValue('name'),
      steps: this.getWorkflowValue('steps'),
      current_step_index: this.getWorkflowValue('current_step_index'),
      status: this.getWorkflowValue('status'),
      output_data: this.getWorkflowValue('output_data'),
      exit_on_failure: this.getWorkflowValue('exit_on_failure'),
      freeze_on_completion: this.getWorkflowValue('freeze_on_completion')
    };
  }
}
