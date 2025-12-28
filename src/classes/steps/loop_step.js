import { loop_types, step_types } from '../../enums/index.js';
import LogicStep from './logic_step.js';

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
   * @param {Array|Iterable} options.iterable - Iterable to loop over or function returning an iterable. Required for 'for_each' loops.
   * @param {Function} [options.callable=async () => {}] - Function to execute for each iteration.
   * @param {Object} [options.conditional] - Conditional configuration for while loops. Required for 'while' loops.
   * @param {*} [options.conditional.subject] - Subject to evaluate.
   * @param {string} [options.conditional.operator] - Comparison operator.
   * @param {*} [options.conditional.value] - Value to compare against.
   * @param {string} [options.loop_type=loop_types.FOR_EACH] - Type of loop ('for_each' or 'while').
   * @param {number} [options.max_iterations=1000] - Maximum number of iterations to prevent infinite loops.
   */
  constructor({
    name,
    iterable,
    callable = async () => {},
    conditional = {
      operator: null,
      subject: null,
      value: null,
    },
    loop_type = loop_types.FOR_EACH,
    max_iterations = 1000,
  }) {
    super({ name, conditional });
    this.iterable = iterable;
    this.loop_type = loop_type;
    this.max_iterations = max_iterations;
    this.results = [];
    this.current_item = null;

    this.callable = this[`${loop_type}_loop`].bind(this);

    // When this.callable is set, it binds the callable function to this instance
    // so that it can access instance properties like current_item.
    // Because we're using a local method instead, we bind it here.
    this.callable_type = this.getCallableType(callable);
    this._callable = this.callable_type === 'function'
      ? callable.bind(this)
      : callable.execute.bind(callable);
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

    let iterations = 0;
    for (const item of this.iterable) {
      if (iterations >= this.max_iterations) {
        break;
      }

      iterations++;
      this.current_item = item;
      this.results.push(await this._callable());
    }

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

    let iterations = 0;
    while (this.checkCondition() && iterations < this.max_iterations) {
      iterations++;
      this.results.push(await this._callable());
    }

    return {
      message: `While loop ${this.name} completed after ${iterations} iterations`,
      result: this.results
    };
  }
}
