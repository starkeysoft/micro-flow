import LogicStep from './logic_step';
import Step from './step';
import logic_step_types from '../enums/logic_step_types';

/**
 * Represents a conditional step that executes one of two possible paths based on a condition.
 * @class ConditionalStep
 * @extends LogicStep
 */
export default class ConditionalStep extends LogicStep {
  static step_name = logic_step_types.CONDITIONAL;
  /**
   * Creates a new ConditionalStep instance.
   * @constructor
   * @param {Object} options - Configuration options for the conditional step.
   * @param {*} options.subject - The value to compare against.
   * @param {string} options.operator - The comparison operator to use (e.g., '===', '==', '!=', '>', '<', '>=', '<=').
   * @param {*} options.value - The value to compare the subject with.
   * @param {Step} options.step_left - The step to execute if the condition is met.
   * @param {Step} options.step_right - The step to execute if the condition is not met.
   * @param {string} [options.name=''] - The name of the conditional step.
   */
  constructor({
    subject,
    operator,
    value,
    step_left,
    step_right,
    name = '',
  } = {}) {
    this.subject = subject;
    this.operator = operator;
    this.value = value;
    this.step_left = step_left;
    this.step_right = step_right;

    super({
      type: logic_step_types.CONDITIONAL,
      name,
      callable: this.conditional.bind(this)
    });
  }

  /**
   * Executes either the left or right step based on the condition evaluation.
   * @async
   * @returns {Promise<*|null>} The result of executing the chosen step, or null if no step is provided.
   */
  conditional() {
    if (this.checkCondition()) {
      this.logStep(`Condition met for step: ${this.name}, executing left branch '${this.step_left.name}'`);

      return this.step_left && typeof this.step_left.markAsComplete === 'function' ? this.step_left.execute() : null;
    }

    this.logStep(`Condition not met for step: ${this.name}, executing right branch '${this.step_right.name}'`);
    return this.step_right && typeof this.step_right.markAsComplete === 'function' ? this.step_right.execute() : null;
  }
}
