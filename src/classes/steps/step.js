import Base from '../base.js';
import Workflow from '../workflow.js';
import { base_types, step_types } from '../../enums/index.js';

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

    const { FAILED, COMPLETE } = this.getState('statuses')[this.base_type];

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
   * Inserts safely serializable properties of the step into a new object for serialization.
   * @returns {Object} An object containing the step's properties ready for serialization.
   */
  prepareForSerialization() {
    const serialized_step = {
      id: this.id,
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

    if (this.callable_type === Step.callable_types.FUNCTION) {
      if (this.callable_registry_key) {
        serialized_step.callable = this.callable_registry_key;
      } else {
        serialized_step.callable = this._callable.name;
      }
    }

    if (['step', 'workflow'].includes(this.callable_type)) {
      if (this.callable_registry_key) {
        serialized_step.callable = this.callable_registry_key;
      } else {
        serialized_step.callable = this.#callable_object.serialize();
      }
    }

    return serialized_step;
  }

  /**
   * Sets a value in the parent workflow's state.
   * @param {string} workflow_id - ID of the parent workflow.
   * @param {string} path - Path in the workflow state to set.
   * @param {*} value - Value to set at the specified path.
   * @throws {Error} Throws if parent workflow is not found.
   */
  setParentWorkflowValue(workflow_id, path, value) {
    const parent_workflow = this.getState('workflows')[workflow_id];

    if (!parent_workflow) {
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
   * @returns {Object} The JSON representation of the workflow.
   */
  toJSON() {
    return this.serialize();
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
   * Deserializes a JSON string into a Step instance and hydrates it.
  * @param {string} serialized_step - The JSON string representation of the step.
   * @returns {Step} The hydrated Step instance.
   * @throws {Error} Throws if the serialized step is not a string.
   */
  static hydrateSerialized(serialized_step) {
    if (typeof serialized_step !== 'string') {
      throw new Error('Invalid serialized step. Must be a string.');
    }

    const parsed_step = JSON.parse(serialized_step);

    return Step.hydrate(parsed_step);
  }

  /**
   * Hydrates a parsed step object into a Step instance, resolving callables from the registry if necessary.
   * @param {Object} parsed_step - The parsed step object.
   * @param {Object} registry - An optional registry mapping keys to callables for hydration.
   * @returns {Step} The hydrated Step instance.
   * @throws {Error} Throws if a callable registry key is specified but not found in the registry.
   */
  static hydrate(parsed_step) {
    if (typeof parsed_step.callable === 'string') {
      const registry_key = parsed_step.callable;

      if (
        registry_key &&
        this.parent_workflow
        && this.parent_workflow.callable_registry
        && this.parent_workflow.callable_registry.has(registry_key)
      ) {
        parsed_step.callable = this.parent_workflow.callable_registry.get(registry_key);
        parsed_step.callable_registry_key = registry_key;
      } else {
        throw new Error(`Callable registry key "${registry_key}" not found in registry or registry not initialized.`);
      }

      return new Step(parsed_step);
    }

    // If the callable is a Step or Workflow, hydrate it as well
    try {
      parsed_step.callable = parsed_step.callable.hydrate()
      return new Step(parsed_step);
    } catch (error) {
      console.error(`Error hydrating callable for step "${parsed_step.name}": `, error);
      // TODO: Throw with custom message
    }
  }
}
