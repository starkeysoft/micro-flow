import { loop_types, step_types } from '../../enums/index.js';
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
   * @param {Function} [options.callable=async () => {}] - Function to execute for each iteration.
   * @param {Object} [options.conditional] - Conditional configuration for while loops. Required for 'while' loops.
   * @param {*|Function} [options.conditional.subject] - Subject to evaluate. Can be a function that returns the value.
   * @param {conditional_step_comparators|string} [options.conditional.operator] - Comparison operator.
   * @param {*|Function} [options.conditional.value] - Value to compare against. Can be a function that returns the value.
   * @param {string} [options.loop_type=loop_types.FOR_EACH] - Type of loop ('for', 'for_each', 'while', or 'generator').
   * @param {number} [options.iterations=0] - Number of iterations to execute. Only used for 'for' loops.
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
    iterations = 0,
    max_iterations = 1000,
  }) {
    super({ name, conditional });
    this.iterable = iterable;
    this.loop_type = loop_type;
    this.iterations = iterations > max_iterations ? max_iterations : iterations;
    this.max_iterations = max_iterations;
    this.results = [];
    this.current_item = null;

    // Store the user's callable separately so loop methods can invoke it.
    // this._callable will be set to the loop method by the setter below.
    const userCallableType = this.getCallableType(callable);
    this._loop_callable = userCallableType === 'function'
      ? callable.bind(this)
      : callable.execute.bind(callable);

    this.callable = this[`${loop_type}_loop`].bind(this);
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

    let iterations = 0;
    // Use for await...of to handle both sync and async generators
    for await (const item of this._loop_callable()) {
      this.results.push(item);

      if (++iterations >= this.max_iterations) {
        break;
      }
    }

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
    let i = 0;
    for (; i < this.iterations; i++) {
      this.results.push(await this._loop_callable());
    }

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

    if (typeof this.iterable === 'function') {
      this.iterable = this.iterable();
    }

    let iterations = 0;
    for (const item of this.iterable) {
      iterations++;
      this.current_item = item;
      this.results.push(await this._loop_callable());
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
      this.results.push(await this._loop_callable());
    }

    return {
      message: `While loop ${this.name} completed after ${iterations} iterations`,
      result: this.results
    };
  }
}
