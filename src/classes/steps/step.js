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
   * Shared no-op used as the default for every step's optional callables (`callable`,
   * `true_callable`/`false_callable`, `default_callable`). Keeping it a single, identifiable
   * function lets `serializeCallableField` store a default callable as `null` (so hydration falls
   * back to the constructor default) rather than as a registry reference to an inline function's
   * inferred name (e.g. "true_callable") that was never registered.
   * @async
   * @returns {Promise<void>}
   */
  static noop = async () => {};

  /**
   * Creates a new Step instance.
   * @param {Object} options - Configuration options.
   * @param {string} [options.name] - Name of the step.
   * @param {Function|Step|Workflow} [options.callable=Step.noop] - Function, Step, or Workflow to execute.
   * @param {string|null} [options.callable_registry_key=null] - Registry key to serialize `callable` under when it's a function (defaults to the function's name); it's resolved from the `CallableRegistry` passed to `hydrate()`.
   * @param {number} [options.max_retries=0] - Maximum number of retries on failure.
   * @param {number|null} [options.max_timeout_ms=30000] - Maximum execution time per attempt in milliseconds
   * before timing out. `null` (or `Infinity`) disables the timeout.
   * @param {string} [options.step_type=step_types.ACTION] - Type of the step.
   * @param {sub_step_types|null} [options.sub_step_type=null] - Sub-type of the step (use values from the sub_step_types enum).
   */
  constructor({
    name,
    callable = Step.noop,
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
  }

  /**
   * Executes the step's callable function, Step, or Workflow. Each attempt is bounded by
   * `max_timeout_ms`, and a failed attempt (including a nested `Step`/`Workflow` that ends up
   * failed) is retried up to `max_retries` times, emitting `step_retrying` before each retry.
   * Once retries are exhausted the step is marked failed.
   * @async
   * @returns {Promise<Step>} The step instance with execution results.
   */
  async execute() {
    // Each run gets its full retry budget and accurate timing, so a step that runs more than
    // once (e.g. inside a LoopStep, or a workflow that's executed again) behaves the same every
    // time. `errors` is deliberately kept, as a history across runs.
    this.retry_count = 0;
    this.retry_results = [];
    this.timing.start_time = null;
    this.timing.complete_time = null;
    this.timing.execution_time_ms = null;

    this.markAsRunning();

    while (true) {
      try {
        this.result = await this.runWithTimeout();

        if (this.retry_count > 0) {
          this.retry_results.push({ retry_count: this.retry_count, result: this.result });
        }

        break;
      } catch (error) {
        // retry_results only records the outcome of retries, not of the initial attempt.
        if (this.retry_count > 0) {
          this.retry_results.push({ retry_count: this.retry_count, error });
        }

        if (this.max_retries && this.retry_count < this.max_retries) {
          this.markAsRetrying(error);
          continue;
        }

        this.errors.push(error);

        this.markAsFailed();

        if (this.getState('exit_on_error')) {
          throw error;
        }

        break;
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
   * Runs a single attempt of the step's callable, racing it against a timeout of
   * `max_timeout_ms`. A fresh timer is created for every attempt (so a retry after a timeout
   * gets its full time budget) and always cleared afterwards. A `max_timeout_ms` of `null` or
   * `Infinity` disables the timeout. A nested `Step`/`Workflow` callable that ends up failed
   * makes the attempt fail too (see `throwIfFailed()`).
   * @async
   * @returns {Promise<*>} The callable's result.
   * @throws {Error} Throws the callable's error, or a timeout error.
   */
  async runWithTimeout() {
    if (this.max_timeout_ms === null || this.max_timeout_ms === Infinity) {
      return this.runCallable();
    }

    let timer = null;
    const timeout = new Promise((_, reject) => {
      timer = setTimeout(
        reject,
        this.max_timeout_ms,
        new Error(`Step "${this.name}" timed out after ${this.max_timeout_ms}ms`)
      );
    });

    try {
      return await Promise.race([this.runCallable(), timeout]);
    } finally {
      clearTimeout(timer);
    }
  }

  /**
   * Invokes the callable once, failing if it was a nested `Step`/`Workflow` that failed.
   * @async
   * @returns {Promise<*>} The callable's result.
   */
  async runCallable() {
    const result = await this._callable();
    Step.throwIfFailed(this.#callable_object);

    return result;
  }

  /**
   * Throws if the given value is a `Step` or `Workflow` whose status is failed. Nested
   * steps/workflows record their failure rather than throwing it (a `Workflow` with
   * `exit_on_error` returns itself in a failed state), so whatever ran them uses this to
   * propagate the failure. Anything else (e.g. a plain function) is ignored.
   * @param {*} callable_object - The value to check.
   * @throws {Error} The nested step's last error, the nested workflow's failing error, or a
   * generic error if neither is available.
   */
  static throwIfFailed(callable_object) {
    const base_type = callable_object?.base_type;

    if (!base_type || callable_object.status !== Workflow.statuses[base_type]?.FAILED) {
      return;
    }

    const error = base_type === base_types.STEP
      ? callable_object.errors?.at(-1)
      : callable_object.results?.at(-1)?.data?.error;

    throw error ?? new Error(`Nested ${base_type} "${callable_object.name}" failed`);
  }

  /**
   * Increments `retry_count` and emits `step_retrying` before the next attempt.
   * @param {Error} error - The error that caused the retry.
   */
  markAsRetrying(error) {
    this.retry_count++;

    this.log(
      Workflow.event_names.step.STEP_RETRYING,
      `Step "${this.name}" retrying (${this.retry_count}/${this.max_retries}) after error: ${error?.message ?? error}`
    );
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
   * @returns {Object|null} A `{ type, value }` descriptor, or null if no callable was given or it's
   * the default `Step.noop` (which the constructor restores on hydration).
   */
  static serializeCallableField(callable) {
    if (callable === null || callable === undefined || callable === Step.noop) {
      return null;
    }

    const type = Step.getCallableType(callable);

    if (type === Step.callable_types.FUNCTION) {
      return { type, value: callable.name };
    }

    return { type, value: callable.prepareForSerialization() };
  }

  /**
   * Serializes a plain function (e.g. a function-valued conditional subject) into a registry
   * reference descriptor, so it can be resolved from a `CallableRegistry` on hydration.
   * @param {Function|*} fn - The function to serialize. Non-functions return null.
   * @param {string|null} [registry_key=null] - Explicit registry key; defaults to the function's name.
   * @returns {Object|null} A `{ type: 'function', value }` descriptor, or null if `fn` isn't a
   * function or has no usable key (e.g. an anonymous function with no explicit key).
   */
  static serializeFunctionRef(fn, registry_key = null) {
    if (typeof fn !== 'function') {
      return null;
    }

    const value = registry_key ?? fn.name;

    return value ? { type: Step.callable_types.FUNCTION, value } : null;
  }

  /**
   * Resolves a descriptor produced by `serializeFunctionRef` from a registry. Unlike
   * `hydrateCallableField`, a missing registry entry doesn't throw - it warns and returns null,
   * since these optional fields (e.g. a conditional subject) often hold inline functions whose
   * inferred name was never registered.
   * @param {Object|null} descriptor - The `{ type: 'function', value }` descriptor.
   * @param {import('../callable_registry.js').default|null} [callable_registry] - Registry used to resolve the function.
   * @returns {Function|null} The resolved function, or null.
   */
  static hydrateFunctionRef(descriptor, callable_registry = null) {
    if (!descriptor?.value) {
      return null;
    }

    if (!callable_registry || !callable_registry.has(descriptor.value)) {
      console.warn(`Callable registry key "${descriptor.value}" not found in registry or registry not provided. Re-attach this function after hydrating.`);
      return null;
    }

    return callable_registry.get(descriptor.value);
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
