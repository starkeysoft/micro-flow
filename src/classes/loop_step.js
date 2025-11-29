import LogicStep from './logic_step.js';
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

    this.setStepStateValue('sub_callable', callable);
    this.setStepStateValue('subject', subject);
    this.setStepStateValue('operator', operator);
    this.setStepStateValue('loop_type', loop_type);
    this.setStepStateValue('iterable', iterable);
    this.setStepStateValue('value', value);
    this.setStepStateValue('max_iterations', max_iterations);
    this.setStepStateValue('should_break', false);
    this.setStepStateValue('current_item', null);
    this.setStepStateValue('current_index', 0);
    
    this.setStepStateValue('callable', this[loop_type === loop_types.WHILE ? 'whileLoopStep' : 'forEachLoopStep'].bind(this));
  }

  /**
   * Executes the sub-workflow associated with this loop step and resets its state for the next iteration.
   * @async
   * @returns {Promise<Function> | Promise<Step> | Promise<Workflow>} The executed workflow instance with final state.
   */
  async runCallable() {
    const sub_callable = this.getStepStateValue('sub_callable');
    
    if (typeof sub_callable === 'function') {
      return await sub_callable({ workflow: state, step: this });
    } else if (sub_callable && typeof sub_callable.execute === 'function') {
      // Step or Workflow instance
      if (!(sub_callable instanceof Workflow)) {
        sub_callable.this.setStepStateValue('workflow', state);
      }

      return await sub_callable.execute({ workflow: state, step: this });
    }
    
    throw new Error('Invalid sub_callable: must be a function, Step, or Workflow');
  }

  /**
   * Executes a while loop that repeatedly runs the sub-workflow while the condition is met.
   * Includes protection against infinite loops via max_iterations.
   * @async
   * @throws {Error} If the loop configuration is invalid (missing subject, operator, or value).
   * @returns {Promise<Function> | Promise<Step> | Promise<Workflow>} The workflow instance from the last execution.
   */
  async whileLoopStep() {
    const subject = this.getStepStateValue('subject');
    const operator = this.getStepStateValue('operator');
    const value = this.getStepStateValue('value');
    const max_iterations = this.getStepStateValue('max_iterations');
    const sub_callable = this.getStepStateValue('sub_callable');
    
    if (!subject || !operator || value === undefined) {
      throw new Error('Invalid configuration for while loop step');
    }

    this.logStep(`Starting while loop step: ${this.getStepStateValue('name')}`);

    let iterations = 0;
    let result = {};

    while (this.checkCondition()) {
      const break_on_iteration = max_iterations <= iterations;
      const break_on_signal = sub_callable?.state?.get('should_break') ?? false;
      const should_break = break_on_iteration || break_on_signal;
      this.setStepStateValue('should_break', should_break);

      if (should_break) {
        this.logStep(`Breaking out of while loop step: ${this.getStepStateValue('name')} due to ${break_on_iteration ? 'max iterations reached' : 'break signal received'}`);
        this.setStepStateValue('should_break', true);
        break;
      }

      this.logStep(`Iteration ${iterations + 1} for loop step: ${this.getStepStateValue('name')}`);

      result = await this.runCallable();

      iterations++;
    }

    return {
      message: `While loop step: ${this.getStepStateValue('name')} completed after ${iterations} iterations`,
      result
    };
  }

  /**
   * Executes a for-each loop that runs the callable once for each item in the iterable.
   * Includes protection against infinite loops via max_iterations.
   * @async
   * @throws {Error} If the iterable configuration is invalid or not iterable.
   * @returns {Promise<Function> | Promise<Step> | Promise<Workflow>} The workflow instance from the last execution.
   */
  async forEachLoopStep() {
    let iterable = this.getStepStateValue('iterable');
    const max_iterations = this.getStepStateValue('max_iterations');
    const sub_callable = this.getStepStateValue('sub_callable');
    
    if (!iterable) {
      throw new Error('Invalid configuration for for_each loop step');
    }

    if (typeof iterable === 'function') {
      iterable = await iterable({ workflow: state, step: this });
    }

    this.logStep(`Starting for_each loop step: ${this.getStepStateValue('name')}`);

    let iterations = 0;
    const results = [];

    for await (const item of iterable) {
      const break_on_iteration = max_iterations <= iterations;
      const break_on_signal = sub_callable?.state?.get('should_break') ?? this.getStepStateValue('should_break');
      const should_break = break_on_iteration || break_on_signal;
      this.setStepStateValue('should_break', should_break);

      if (should_break) {
        this.logStep(`Breaking out of for_each loop step: ${this.getStepStateValue('name')} due to ${break_on_iteration ? 'max iterations reached' : 'break signal received'}`);
        this.setStepStateValue('should_break', true);
        break;
      }

      this.logStep(`Iteration ${iterations + 1} for loop step: ${this.getStepStateValue('name')}`);

      this.setStepStateValue('current_item', item);
      this.setStepStateValue('current_index', iterations);
      const result = await this.runCallable();
      results.push(result);

      iterations++;
    }

    return results;
  }
}
