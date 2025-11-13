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
  static step_name = 'loop';
  /**
   * Creates a new LoopStep instance.
   * @constructor
   * @param {Object} options - Configuration options for the loop step.
   * @param {Workflow} options.sub_workflow - The sub-workflow to execute for this step (required).
   * @param {*} options.subject - The value to compare against (for while loops).
   * @param {string} options.operator - The comparison operator to use (e.g., '===', '==', '!=', '>', '<', '>=', '<=').
   * @param {*} options.value - The value to compare the subject with (for while loops).
   * @param {Array} [options.iterable] - The iterable to loop over (for 'for_each' loop type).
   * @param {string} [options.loop_type='while'] - The type of loop to execute (from loop_types enum).
   * @param {string} [options.name='Loop Step'] - The name of the loop step.
   * @param {number} [options.max_iterations=20] - Maximum number of loop iterations to prevent infinite loops.
   */
  constructor({
    sub_workflow,
    subject,
    operator,
    value,
    iterable,
    loop_type = loop_types.WHILE,
    name = 'Loop Step',
    max_iterations = 20,
  } = {}) {
    if (!sub_workflow || !(sub_workflow instanceof Workflow)) {
      throw new Error('sub_workflow must be an instance of Workflow');
    }
    this.sub_workflow = sub_workflow;

    this.subject = subject;
    this.operator = operator
    this.loop_type = loop_type;
    this.iterable = iterable;
    this.value = value
    this.max_iterations = max_iterations;

    super({
      type: logic_step_types.LOOP,
      name,
      callable: this[this.loop_type === loop_types.WHILE ? 'whileLoopStep' : 'forEachLoopStep'].bind(this)
    });
  }

  /**
   * Executes the sub-workflow associated with this loop step.
   * @async
   * @returns {Promise<*>} The result of the sub-workflow execution.
   */
  async runSubWorkflow() {
    return await this.sub_workflow.execute();
  }

  /**
   * Executes a while loop that repeatedly runs the sub-workflow while the condition is met.
   * Includes protection against infinite loops via max_iterations.
   * @async
   * @throws {Error} Throws an error if the loop configuration is invalid.
   * @returns {Promise<void>}
   */
  async whileLoopStep() {
    if (!this.subject || !this.operator || this.value === undefined) {
      throw new Error('Invalid configuration for while loop step');
    }

    this.logStep(`Starting while loop step: ${this.name}`);

    let iterations = 0;

    while (this.checkCondition()) {
      const break_on_iteration = this.max_iterations <= iterations;
      const break_on_signal = this.sub_workflow.state.get('should_break');
      this.should_break = break_on_iteration || break_on_signal;

      if (this.should_break) {
        this.logStep(`Breaking out of while loop step: ${this.name} due to ${break_on_iteration ? 'max iterations reached' : 'break signal received'}`);
        this.context.set('should_break', true);
        break;
      }

      this.logStep(`Iteration ${iterations + 1} for loop step: ${this.name}`);

      const result = await this.runSubWorkflow();

      iterations++;

      return result;
    }
  }

  /**
   * Executes a for-each loop that runs the sub-workflow once for each item in the iterable.
   * @async
   * @throws {Error} Throws an error if the iterable configuration is invalid.
   * @returns {Promise<*>}
   */
  async forEachLoopStep() {
    if (!this.iterable || typeof this.iterable[Symbol.iterator] !== 'function') {
      throw new Error('Invalid configuration for for_each loop step');
    }

    this.logStep(`Starting for_each loop step: ${this.name}`);

    let iterations = 0;

    for await (item of this.iterable) {
      const break_on_iteration = this.max_iterations <= iterations;
      const break_on_signal = this.sub_workflow.state.get('should_break');
      this.should_break = break_on_iteration || break_on_signal;

      if (this.should_break) {
        this.logStep(`Breaking out of while loop step: ${this.name} due to ${break_on_iteration ? 'max iterations reached' : 'break signal received'}`);
        this.context.set('should_break', true);
        break;
      }

      this.logStep(`Iteration ${iterations + 1} for loop step: ${this.name}`);

      const result = await this.runSubWorkflow();

      iterations++;

      return result;
    }
  }
}
