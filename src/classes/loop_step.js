import LogicStep from './logic_step';
import Workflow from './workflow.js';
import logic_step_types from '../enums/logic_step_types.js';
import loop_types from '../enums/loop_types.js';

/**
 * Represents a loop step that repeatedly executes a step while a subject is met.
 * @class LoopStep
 * @extends LogicStep
 */
export default class LoopStep extends LogicStep {
  static step_name = logic_step_types.LOOP;
  /**
   * Creates a new LoopStep instance.
   * @constructor
   * @param {Object} options - Configuration options for the loop step.
   * @param {Workflow} options.callable - The workflow to execute repeatedly (required).
   * @param {*} [options.subject] - The value to compare against (required for while loops).
   * @param {string} [options.operator] - The comparison operator to use (required for while loops, e.g., '===', '==', '!=', '>', '<', '>=', '<=').
   * @param {*} [options.value] - The value to compare the subject with (required for while loops).
   * @param {Array} [options.iterable] - The iterable to loop over (required for 'for_each' loop type).
   * @param {string} [options.loop_type='while'] - The type of loop to execute (from loop_types enum: 'while' or 'for_each').
   * @param {string} [options.name='Loop Step'] - The name of the loop step.
   * @param {number} [options.max_iterations=20] - Maximum number of loop iterations to prevent infinite loops.
   */
  constructor({
    callable,
    subject,
    operator,
    value,
    iterable,
    loop_type = loop_types.WHILE,
    name = 'Loop Step',
    max_iterations = 20,
  } = {}) {
    super({
      type: logic_step_types.LOOP,
      name,
    });

    this.state.set('callable', callable);
    this.state.set('subject', subject);
    this.state.set('operator', operator);
    this.state.set('loop_type', loop_type);
    this.state.set('iterable', iterable);
    this.state.set('value', value);
    this.state.set('max_iterations', max_iterations);
    this.state.set('should_break', false);
    
    this.state.set('callable', this[loop_type === loop_types.WHILE ? 'whileLoopStep' : 'forEachLoopStep'].bind(this));
  }

  /**
   * Executes the sub-workflow associated with this loop step and resets its state for the next iteration.
   * @async
   * @returns {Promise<Workflow>} The executed workflow instance with final state.
   */
  async runCallable() {
    const callable = this.state.get('callable');
    const result = await callable.execute();

    callable.state.set('current_step_index', 0);

    return result;
  }

  /**
   * Executes a while loop that repeatedly runs the sub-workflow while the condition is met.
   * Includes protection against infinite loops via max_iterations.
   * @async
   * @throws {Error} If the loop configuration is invalid (missing subject, operator, or value).
   * @returns {Promise<Workflow>} The workflow instance from the last execution.
   */
  async whileLoopStep() {
    const subject = this.state.get('subject');
    const operator = this.state.get('operator');
    const value = this.state.get('value');
    const max_iterations = this.state.get('max_iterations');
    const callable = this.state.get('callable');
    
    if (!subject || !operator || value === undefined) {
      throw new Error('Invalid configuration for while loop step');
    }

    this.logStep(`Starting while loop step: ${this.state.get('name')}`);

    let iterations = 0;

    while (this.checkCondition()) {
      const break_on_iteration = max_iterations <= iterations;
      const break_on_signal = callable.state.get('should_break');
      const should_break = break_on_iteration || break_on_signal;
      this.state.set('should_break', should_break);

      if (should_break) {
        this.logStep(`Breaking out of while loop step: ${this.state.get('name')} due to ${break_on_iteration ? 'max iterations reached' : 'break signal received'}`);
        this.state.set('should_break', true);
        break;
      }

      this.logStep(`Iteration ${iterations + 1} for loop step: ${this.state.get('name')}`);

      const result = await this.runCallable();

      iterations++;

      return result;
    }
  }

  /**
   * Executes a for-each loop that runs the callable once for each item in the iterable.
   * Includes protection against infinite loops via max_iterations.
   * @async
   * @throws {Error} If the iterable configuration is invalid or not iterable.
   * @returns {Promise<Workflow>} The workflow instance from the last execution.
   */
  async forEachLoopStep() {
    const iterable = this.state.get('iterable');
    const max_iterations = this.state.get('max_iterations');
    const callable = this.state.get('callable');
    
    if (!iterable || typeof iterable[Symbol.iterator] !== 'function') {
      throw new Error('Invalid configuration for for_each loop step');
    }

    this.logStep(`Starting for_each loop step: ${this.state.get('name')}`);

    let iterations = 0;

    for await (const item of iterable) {
      const break_on_iteration = max_iterations <= iterations;
      const break_on_signal = callable.state.get('should_break');
      const should_break = break_on_iteration || break_on_signal;
      this.state.set('should_break', should_break);

      if (should_break) {
        this.logStep(`Breaking out of while loop step: ${this.state.get('name')} due to ${break_on_iteration ? 'max iterations reached' : 'break signal received'}`);
        this.state.set('should_break', true);
        break;
      }

      this.logStep(`Iteration ${iterations + 1} for loop step: ${this.state.get('name')}`);

      const result = await this.runCallable();

      iterations++;

      return result;
    }
  }
}
