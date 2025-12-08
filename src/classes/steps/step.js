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

  /**
   * Creates a new Step instance.
   * @param {Object} options - Configuration options.
   * @param {string} [options.name] - Name of the step.
   * @param {string} [options.step_type=step_types.ACTION] - Type of the step.
   * @param {Function|Step|Workflow} [options.callable=async () => {}] - Function, Step, or Workflow to execute.
   * @param {string} [options.sub_step_type=null] - Sub-type of the step.
   */
  constructor({
    name,
    step_type = step_types.ACTION,
    callable = async () => {},
    sub_step_type = null,
  }) {
    super({ name, base_type: base_types.STEP });

    this.callable = callable;

    // Store off the original callable object, because if it's a Step or Workflow,
    // this.callable is set to the execute method of that object, but we may need to access its properties later.
    this.callable_object = callable;

    this.step_type = step_type;
    this.sub_step_type = sub_step_type;

    this.errors = [];
    this.result = null;
    this.retry_results = [];
  }

  /**
   * Executes the step's callable function, Step, or Workflow.
   * @async
   * @returns {Promise<Step>} The step instance with execution results.
   */
  async execute() {
    this.markAsRunning();

    try {
      this.result = await this._callable();
    } catch (error) {
      this.errors.push(error);
      this.markAsFailed();

      this.timing.end_time = new Date();
      this.timing.execution_time_ms = this.timing.end_time - this.timing.start_time;

      if (this.getState('exit_on_error')) {
        throw error;
      }
    }

    if (this.status !== this.getState('statuses')[this.base_type].FAILED) {
      this.markAsComplete();
    }

    if (['step', 'workflow'].includes(this.callable_type)) {
      this.callable_object.prepareReturnData();
    }

    return this;
  }

  /**
   * Determines the type of the callable (function, step, or workflow).
   * @param {Function|Step|Workflow} callable - The callable to check.
   * @returns {string} The type: 'function', 'step', or 'workflow'.
   * @throws {Error} Throws if callable type is invalid.
   */
  getCallableType(callable) {
    if (callable instanceof Workflow) {
      return 'workflow';
    } else if (callable instanceof Step) {
      return 'step';
    } else if (typeof callable === 'function') {
      return 'function';
    } 

    throw new Error('Invalid callable type. Must be one of function, Step, or Workflow.');
  }

  /**
   * Sets the callable for the step and determines its type.
   * @param {Function|Step|Workflow} callable - The callable to set.
   */
  set callable(callable) {
    this.callable_type = this.getCallableType(callable);

    if (['step', 'workflow'].includes(this.callable_type)) {
      if (this.callable_type === 'step') {
        callable.parentWorkflowId = this.parentWorkflowId ?? null;
      }

      this._callable = callable.execute.bind(callable);
    } else {
      this._callable = callable;
    }
  }
}
