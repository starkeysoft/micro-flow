import Base from '../base.js';
import Workflow from '../workflow.js';
import { base_types, step_types } from '../../enums/index.js';

// Populated by each Step subclass file registering itself (see the bottom of
// step.js and each subclass file) - keeps this file from importing every
// subclass directly, which would create an import cycle through the hierarchy.
const step_class_registry = {};

/**
 * Step class representing an executable unit within a workflow.
 * @class Step
 * @extends Base
 */
export default class Step extends Base {
  static step_name = 'step';
  #callable_object = null;
  static callable_types = {
    FUNCTION: 'function',
    STEP: 'step',
    WORKFLOW: 'workflow',
  }

  /**
   * Creates a new Step instance.
   * @param {Object} options - Configuration options.
   * @param {string} [options.name] - Name of the step.
   * @param {Function|Step|Workflow} [options.callable=async () => {}] - Function, Step, or Workflow to execute.
   * @param {number} [options.max_retries=0] - Maximum number of retries on failure.
   * @param {number} [options.max_timeout_ms=30000] - Maximum execution time in milliseconds before timing out.
   * @param {string} [options.step_type=step_types.ACTION] - Type of the step.
   * @param {sub_step_types|null} [options.sub_step_type=null] - Sub-type of the step (use values from the sub_step_types enum).
   */
  constructor({
    name,
    callable = async () => {},
    callable_registry_key = null,
    max_retries = 0,
    max_timeout_ms = 30000,
    step_type = step_types.ACTION,
    sub_step_type = null,
  }) {
    super({ name, base_type: base_types.STEP });

    this.callable = callable;

    // Optional key to reference the callable to be rehydrated after serialization.
    this.callable_registry_key = callable_registry_key;

    // Store off the original callable object, because if it's a Step or Workflow,
    // this.callable is set to the execute method of that object, but we may need to access its properties later.
    this.#callable_object = callable;

    this.max_retries = max_retries;
    this.retry_count = 0;
    this.max_timeout_ms = max_timeout_ms;
    this.step_type = step_type;
    this.sub_step_type = sub_step_type;

    this.errors = [];
    this.result = null;
    this.retry_results = [];
    this.timeout = null;
  }

  /**
   * Executes the step's callable function, Step, or Workflow.
   * @async
   * @returns {Promise<Step>} The step instance with execution results.
   */
  async execute() {
    if (!this.timeout) {
      this.timeout = new Promise((_, reject) =>
        setTimeout(
          reject,
          this.max_timeout_ms,
          new Error(`Step "${this.name}" timed out after ${this.max_timeout_ms}ms`)
        )
      );
    }

    this.markAsRunning();

    try {
      this.result = await Promise.race([this._callable(), this.timeout]);
    } catch (error) {
      if (this.max_retries && this.retry_count < this.max_retries) {
        this.retry_count++;
        this.retry_results.push({
          retry_count: this.retry_count,
          result: await this.execute(),
        });
      } else {
        this.errors.push(error);

        this.markAsFailed();

        if (this.getState('exit_on_error')) {
          throw error;
        }
      }
    }

    const { FAILED, COMPLETE } = Workflow.statuses[this.base_type];

    if (![FAILED, COMPLETE].includes(this.status)) {
      this.markAsComplete();
    }

    if (['step', 'workflow'].includes(this.callable_type)) {
      return this.#callable_object;
    }

    return this.prepareForSerialization();
  }

  /**
   * Determines the type of the callable (function, step, or workflow).
   * @param {Function|Step|Workflow} callable - The callable to check.
   * @returns {string} The type: 'function', 'step', or 'workflow'.
   * @throws {Error} Throws if callable type is invalid.
   */
  getCallableType(callable) {
    return Step.getCallableType(callable);
  }

  /**
   * Determines the type of the callable (function, step, or workflow).
   * @param {Function|Step|Workflow} callable - The callable to check.
   * @returns {string} The type: 'function', 'step', or 'workflow'.
   * @throws {Error} Throws if callable type is invalid.
   */
  static getCallableType(callable) {
    if (callable && callable.base_type === base_types.WORKFLOW) {
      return Step.callable_types.WORKFLOW;
    } else if (callable && callable.base_type === base_types.STEP) {
      return Step.callable_types.STEP;
    } else if (typeof callable === 'function') {
      return Step.callable_types.FUNCTION;
    }

    throw new Error('Invalid callable type. Must be one of function, Step, or Workflow.');
  }

  /**
   * Registers a Step subclass so hydration can rebuild instances of the correct type.
   * Called as a side effect at the bottom of each step subclass file.
   * @param {typeof Step} StepClass - The Step subclass to register, keyed by its static `step_name`.
   */
  static registerStepClass(StepClass) {
    step_class_registry[StepClass.step_name] = StepClass;
  }

  /**
   * Resolves a `step_name` (as stored in `class_name` on a serialized step) to its class.
   * Falls back to the base `Step` class if the name is unknown.
   * @param {string} step_name - The step_name to resolve.
   * @returns {typeof Step} The resolved Step subclass.
   */
  static resolveStepClass(step_name) {
    return step_class_registry[step_name] ?? Step;
  }

  /**
   * Serializes a callable-like value (function, Step, or Workflow) into a plain, JSON-safe descriptor.
   * @param {Function|Step|Workflow|null} callable - The callable to serialize.
   * @returns {Object|null} A `{ type, value }` descriptor, or null if no callable was given.
   */
  static serializeCallableField(callable) {
    if (callable === null || callable === undefined) {
      return null;
    }

    const type = Step.getCallableType(callable);

    if (type === Step.callable_types.FUNCTION) {
      return { type, value: callable.name };
    }

    return { type, value: callable.prepareForSerialization() };
  }

  /**
   * Hydrates a callable-like descriptor (as produced by `serializeCallableField`) back into a
   * live function, Step, or Workflow. Idempotent - passing an already-hydrated value through
   * returns it unchanged, since subclass `hydrate` overrides may resolve a field before
   * delegating to a superclass `hydrate` that would otherwise try to resolve it again.
   * @param {Object|Function|Step|Workflow|null} serialized - The descriptor (or already-hydrated value) to hydrate.
   * @param {import('../callable_registry.js').default|null} [callable_registry] - Registry used to resolve function callables.
   * @returns {Function|Step|Workflow|undefined} The hydrated callable, or undefined if nothing was given.
   * @throws {Error} Throws if a function callable can't be found in the registry, or the descriptor type is unknown.
   */
  static hydrateCallableField(serialized, callable_registry = null) {
    if (serialized === null || serialized === undefined) {
      return undefined;
    }

    if (typeof serialized === 'function' || serialized instanceof Step || serialized?.base_type) {
      return serialized;
    }

    const { type, value } = serialized;

    if (type === Step.callable_types.FUNCTION) {
      if (!callable_registry || !callable_registry.has(value)) {
        throw new Error(`Callable registry key "${value}" not found in registry or registry not provided.`);
      }

      return callable_registry.get(value);
    }

    if (type === Step.callable_types.STEP) {
      return Step.hydrateAny(value, callable_registry);
    }

    if (type === Step.callable_types.WORKFLOW) {
      return Workflow.hydrate(value, callable_registry);
    }

    throw new Error(`Unknown callable type "${type}" encountered during hydration.`);
  }

  /**
   * Hydrates a parsed step object into an instance of its correct Step subclass,
   * resolved from its serialized `class_name`.
   * @param {Object} parsed_step - The parsed step object.
   * @param {import('../callable_registry.js').default|null} [callable_registry] - Registry used to resolve function callables.
   * @returns {Step} The hydrated Step (or subclass) instance.
   */
  static hydrateAny(parsed_step, callable_registry = null) {
    const StepClass = Step.resolveStepClass(parsed_step.class_name);

    return StepClass.hydrate(parsed_step, callable_registry);
  }

  /**
   * Inserts safely serializable properties of the step into a new object for serialization.
   * @returns {Object} An object containing the step's properties ready for serialization.
   */
  prepareForSerialization() {
    const serialized_step = {
      id: this.id,
      class_name: this.constructor.step_name,
      name: this.name,
      callable_type: this.callable_type,
      step_type: this.step_type,
      sub_step_type: this.sub_step_type,
      max_retries: this.max_retries,
      max_timeout_ms: this.max_timeout_ms,
      retry_count: this.retry_count,
      retry_results: this.retry_results,
      errors: this.errors,
      result: this.result,
      timing: this.timing,
      status: this.status,
      parent_workflow_id: this.parent_workflow_id,
    };

    serialized_step.callable = this.callable_registry_key
      ? { type: Step.callable_types.FUNCTION, value: this.callable_registry_key }
      : Step.serializeCallableField(this.#callable_object);

    return serialized_step;
  }

  /**
   * Sets a value on the parent workflow instance itself. Normally this is the live object
   * shared via this step's own state under the `workflow` key (see `initializeWorkflowState()`
   * in `workflow.js`); when `use_state_singleton` is `true`, several unrelated workflows can
   * share the same process-wide state, so it's looked up by id in the singleton's `workflows`
   * registry instead.
   * @param {string} workflow_id - ID of the parent workflow.
   * @param {string} path - Property name to set on the workflow instance.
   * @param {*} value - Value to set at the specified path.
   * @throws {Error} Throws if the parent workflow is not found.
   */
  setParentWorkflowValue(workflow_id, path, value) {
    const parent_workflow = this.use_state_singleton
      ? this.getState('workflows')[workflow_id]
      : this.getState('workflow');

    if (!parent_workflow || parent_workflow.id !== workflow_id) {
      throw new Error(`Parent workflow with ID ${workflow_id} not found.`);
    }

    parent_workflow[path] = value;
  }

  /**
   * Serializes the step into a JSON string.
   * @returns {string} The JSON string representation of the step.
   */
  serialize() {
    return JSON.stringify(this.prepareForSerialization());
  }

  /**
   * Custom JSON serializer
   * @returns {Object} The JSON representation of the step.
   */
  toJSON() {
    return this.prepareForSerialization();
  }

  /**
   * Sets the callable for the step and determines its type.
   * @param {Function|Step|Workflow} callable - The callable to set.
   */
  set callable(callable) {
    this.callable_type = this.getCallableType(callable);

    if (['step', 'workflow'].includes(this.callable_type)) {
      if (this.callable_type === 'step') {
        callable.parent_workflow_id = this.parent_workflow_id ?? null;
      }

      this._callable = callable.execute.bind(callable);
    } else {
      this._callable = callable.bind(this);
    }
  }

  /**
   * Deserializes a JSON string into a Step instance and hydrates it, dispatching to the correct subclass.
   * @param {string} serialized_step - The JSON string representation of the step.
   * @param {import('../callable_registry.js').default|null} [callable_registry] - Registry used to resolve function callables.
   * @returns {Step} The hydrated Step (or subclass) instance.
   * @throws {Error} Throws if the serialized step is not a string.
   */
  static hydrateSerialized(serialized_step, callable_registry = null) {
    if (typeof serialized_step !== 'string') {
      throw new Error('Invalid serialized step. Must be a string.');
    }

    return Step.hydrateAny(JSON.parse(serialized_step), callable_registry);
  }

  /**
   * Hydrates a parsed step object into an instance of `this` class, resolving its callable
   * (and restoring execution metadata) from the serialized data.
   * Subclasses with extra callable-like fields (e.g. ConditionalStep's true_callable/false_callable)
   * should resolve those fields with `Step.hydrateCallableField` and delegate to `super.hydrate()`.
   * @param {Object} parsed_step - The parsed step object.
   * @param {import('../callable_registry.js').default|null} [callable_registry] - Registry used to resolve function callables.
   * @returns {Step} The hydrated Step instance.
   * @throws {Error} Throws if a callable registry key is specified but not found in the registry.
   */
  static hydrate(parsed_step, callable_registry = null) {
    const callable_descriptor = parsed_step.callable;
    const callable = Step.hydrateCallableField(callable_descriptor, callable_registry);
    const callable_registry_key = callable_descriptor?.type === Step.callable_types.FUNCTION
      ? callable_descriptor.value
      : null;

    const instance = new this({ ...parsed_step, callable, callable_registry_key });

    instance.id = parsed_step.id;
    instance.retry_count = parsed_step.retry_count ?? 0;
    instance.retry_results = parsed_step.retry_results ?? [];
    instance.errors = parsed_step.errors ?? [];
    instance.result = parsed_step.result ?? null;
    instance.timing = parsed_step.timing;
    instance.status = parsed_step.status;
    instance.parent_workflow_id = parsed_step.parent_workflow_id ?? null;

    return instance;
  }
}

Step.registerStepClass(Step);
