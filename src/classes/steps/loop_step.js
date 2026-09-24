import { loop_types, step_types } from '../../enums/index.js';
import Step from './step.js';
import LogicStep from './logic_step.js';
import { conditional_step_comparators } from '../../enums/index.js';

/**
 * LoopStep class for executing loops within a workflow.
 * @class LoopStep
 * @extends LogicStep
 */
export default class LoopStep extends LogicStep {
  static step_name = step_types.LOOP;

  /**
   * Creates a new LoopStep instance.
   * @param {Object} options - Configuration options.
   * @param {string} [options.name] - Name of the step.
   * @param {Array|Iterable|Function} options.iterable - Iterable to loop over or function returning an iterable. Required for 'for_each' and 'generator' loops.
   * @param {Function} [options.callable=Step.noop] - Function to execute for each iteration.
   * @param {Object} [options.conditional] - Conditional configuration for while loops. Required for 'while' loops.
   * @param {*|Function} [options.conditional.subject] - Subject to evaluate. Can be a function that returns the value.
   * @param {conditional_step_comparators|string} [options.conditional.operator] - Comparison operator.
   * @param {*|Function} [options.conditional.value] - Value to compare against. Can be a function that returns the value.
   * @param {string} [options.loop_type=loop_types.FOR_EACH] - Type of loop ('for', 'for_each', 'while', or 'generator').
   * @param {number} [options.iterations=0] - Number of iterations to execute. Only used for 'for' loops.
   * @param {number} [options.max_iterations=1000] - Maximum number of iterations to prevent infinite loops.
   * @param {string|null} [options.loop_callable_registry_key=null] - Registry key to serialize the per-iteration `callable` under when it's a function (defaults to the function's name); it's resolved from the `CallableRegistry` passed to `hydrate()`.
   * @param {number} [options.max_retries=0] - Maximum number of retries on failure.
   * @param {number|null} [options.max_timeout_ms=30000] - Maximum execution time per attempt in milliseconds, covering the whole loop (all iterations). `null` disables the timeout.
   */
  constructor({
    name,
    iterable,
    callable = Step.noop,
    conditional = {
      operator: null,
      subject: null,
      value: null,
    },
    loop_type = loop_types.FOR_EACH,
    iterations = 0,
    max_iterations = 1000,
    loop_callable_registry_key = null,
    max_retries,
    max_timeout_ms,
  }) {
    super({ name, conditional, max_retries, max_timeout_ms });
    this.iterable = iterable;
    this.loop_type = loop_type;
    this.iterations = iterations > max_iterations ? max_iterations : iterations;
    this.max_iterations = max_iterations;
    this.results = [];
    this.current_item = null;

    // Optional key to reference the per-iteration callable to be rehydrated after serialization.
    this.loop_callable_registry_key = loop_callable_registry_key;

    // Store the user's callable separately so loop methods can invoke it.
    // this._callable will be set to the loop method by the setter below.
    // The raw object is kept too (distinct from the bound version) so serialization
    // can recover the original function/Step/Workflow instead of the loop-runner method.
    this._loop_callable_type = this.getCallableType(callable);
    this._loop_callable_object = callable;
    this._loop_callable = this._loop_callable_type === 'function'
      ? callable.bind(this)
      : callable.execute.bind(callable);

    this.callable = this[`${loop_type}_loop`].bind(this);
  }

  /**
   * When the per-iteration callable is a `Step`/`Workflow` (not a plain function), stamps it with
   * this loop step's own `parent_workflow_id`/`use_state_singleton`/`state` right before the loop
   * runs - mirrors what `Workflow.addStep()` does for top-level steps, since a loop callable is
   * never added to the workflow directly.
   */
  propagateStateToLoopCallable() {
    if (this._loop_callable_type === 'function') {
      return;
    }

    this._loop_callable_object.parent_workflow_id = this.parent_workflow_id;
    this._loop_callable_object.use_state_singleton = this.use_state_singleton;
    this._loop_callable_object.state = this.state;
  }

  /**
   * Runs one iteration of the per-iteration callable. A nested `Step`/`Workflow` that ends up
   * failed fails the loop (and so this step), rather than the loop carrying on as complete.
   * @async
   * @returns {Promise<*>} The iteration's result.
   */
  async runIteration() {
    const result = await this._loop_callable();
    Step.throwIfFailed(this._loop_callable_object);

    return result;
  }

  /**
   * Executes a generator/async generator and appends yielded values to results.
   * @throws {Error} If the callable is not a generator or async generator function.
   * @returns {Object} - An object containing a message and the results of the loop.
   */
  async generator_loop() {
    if (!this._loop_callable.constructor.name.includes('Generator')) {
      throw new Error('Iterable must be a generator function for generator loops');
    }

    this.propagateStateToLoopCallable();
    // Each run starts with fresh results, rather than appending to a previous run's.
    this.results = [];

    let iterations = 0;
    // Use for await...of to handle both sync and async generators
    for await (const item of this._loop_callable()) {
      this.results.push(item);

      if (++iterations >= this.max_iterations) {
        break;
      }
    }

    this.iterations = iterations;

    return {
      message: `Generator loop ${this.name} completed after ${iterations} iterations`,
      result: this.results
    };
  }

  /**
   * Executes a for loop calling the callable for a set number of iterations
   * @returns {Object} - An object containing a message and the results of the loop.
   */
  async for_loop() {
    this.propagateStateToLoopCallable();
    // Each run starts with fresh results, rather than appending to a previous run's.
    this.results = [];

    const target = this.iterations;
    let i = 0;
    for (; i < target; i++) {
      this.results.push(await this.runIteration());
    }

    this.iterations = i;

    return {
      message: `For loop ${this.name} completed after ${i} iterations`,
      result: this.results
    };
  }

  /**
   * Executes the callable for each item in the iterable.
   * @throws {Error} If the iterable is not provided.
   * @returns {Object} - An object containing a message and the results of the loop.
   */
  async for_each_loop() {
    if (!this.iterable) {
      throw new Error('Iterable is required for for_each loops');
    }

    this.propagateStateToLoopCallable();
    // Each run starts with fresh results, rather than appending to a previous run's.
    this.results = [];

    // Resolve a function iterable into a local, rather than overwriting this.iterable, so the
    // function is still there to serialize (and to call again on a later run).
    const iterable = typeof this.iterable === 'function' ? this.iterable() : this.iterable;

    let iterations = 0;
    for (const item of iterable) {
      iterations++;
      this.current_item = item;
      this.results.push(await this.runIteration());
    }

    this.iterations = iterations;

    return {
      message: `For each loop ${this.name} completed after ${iterations} iterations`,
      result: this.results
    };
  }

  /**
   * Executes the callable while the condition is true.
   * @throws {Error} If the conditional is not valid.
   * @returns {Object} - An object containing a message and the results of the loop.
   */
  async while_loop() {
    if (!this.conditionalIsValid()) {
      throw new Error('Valid conditional is required for while loops');
    }

    this.propagateStateToLoopCallable();
    // Each run starts with fresh results, rather than appending to a previous run's.
    this.results = [];

    let iterations = 0;
    while (this.checkCondition() && iterations < this.max_iterations) {
      iterations++;
      this.results.push(await this.runIteration());
    }

    this.iterations = iterations;

    return {
      message: `While loop ${this.name} completed after ${iterations} iterations`,
      result: this.results
    };
  }

  /**
   * Inserts safely serializable properties of the step into a new object for serialization.
   * A function-valued `iterable` is stored as `null`, with a registry reference (keyed by the
   * function's name) in `iterable_callable`, so it can be resolved on hydration. Non-array
   * iterables (e.g. a Set) are not persisted.
   * @returns {Object} An object containing the step's properties ready for serialization.
   */
  prepareForSerialization() {
    return {
      ...super.prepareForSerialization(),
      callable: this.loop_callable_registry_key
        ? { type: Step.callable_types.FUNCTION, value: this.loop_callable_registry_key }
        : Step.serializeCallableField(this._loop_callable_object),
      loop_type: this.loop_type,
      iterations: this.iterations,
      max_iterations: this.max_iterations,
      iterable: Array.isArray(this.iterable) ? this.iterable : null,
      iterable_callable: Step.serializeFunctionRef(this.iterable),
      results: this.results,
    };
  }

  /**
   * Hydrates a parsed step object into a LoopStep instance, resolving the per-iteration callable
   * and (if function-valued) iterable.
   * @param {Object} parsed_step - The parsed step object.
   * @param {import('../callable_registry.js').default|null} [callable_registry] - Registry used to resolve function callables.
   * @returns {LoopStep} The hydrated LoopStep instance.
   */
  static hydrate(parsed_step, callable_registry = null) {
    const callable_descriptor = parsed_step.callable;

    const instance = super.hydrate({
      ...parsed_step,
      callable: Step.hydrateCallableField(callable_descriptor, callable_registry),
      iterable: parsed_step.iterable_callable
        ? Step.hydrateFunctionRef(parsed_step.iterable_callable, callable_registry)
        : parsed_step.iterable,
      loop_callable_registry_key: callable_descriptor?.type === Step.callable_types.FUNCTION
        ? callable_descriptor.value
        : null,
    }, callable_registry);

    instance.results = parsed_step.results ?? [];

    return instance;
  }
}

LoopStep.registerStepClass(LoopStep);
