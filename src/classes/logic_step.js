import Step from './step.js';
import step_types from '../enums/step_types.js';
import conditional_step_comparators from '../enums/conditional_step_comparators.js';

/**
 * Represents a logic step that evaluates conditions using various comparison operators.
 * @class LogicStep
 * @extends Step
 */
export default class LogicStep extends Step {
  static step_name = 'logic';
  subject;
  operator;
  value;

  /**
   * Creates a new LogicStep instance.
   * @constructor
   * @param {Object} options - Configuration options for the logic step.
   * @param {string} options.type - The type of the logic step (from logic_step_types enum).
   * @param {Step | Workflow | Function} [options.callable=()=>{}] - The function to execute for this step.
   * @param {string} [options.name=''] - The name of the logic step.
   */
  constructor({
    type,
    callable = async () => {},
    name = '',
  }) {
    super({
      type,
      name,
      callable,
    });
  }

  /**
   * Evaluates the subject using the specified this.operator.
   * Supports strict/loose equality, inequality, and relational operators.
   * @returns {boolean} True if the condition is met, false otherwise.
   * @throws {Error} Throws an error if the this.operator is unknown.
   */
  checkCondition() {
    switch (this.operator) {
      case conditional_step_comparators.STRICT_EQUALS:
      case conditional_step_comparators.SIGN_STRICT_EQUALS:
        return this.subject === this.value;
      case conditional_step_comparators.SIGN_EQUALS:
      case conditional_step_comparators.EQUALS:
        return this.subject == this.value;
      case conditional_step_comparators.NOT_EQUALS:
      case conditional_step_comparators.SIGN_NOT_EQUALS:
        return this.subject != this.value;
      case conditional_step_comparators.STRICT_NOT_EQUALS:
      case conditional_step_comparators.SIGN_STRICT_NOT_EQUALS:
        return this.subject !== this.value;
      case conditional_step_comparators.GREATER_THAN:
      case conditional_step_comparators.SIGN_GREATER_THAN:
        return this.subject > this.value;
      case conditional_step_comparators.LESS_THAN:
      case conditional_step_comparators.SIGN_LESS_THAN:
        return this.subject < this.value;
      case conditional_step_comparators.GREATER_THAN_OR_EQUAL:
      case conditional_step_comparators.SIGN_GREATER_THAN_OR_EQUAL:
        return this.subject >= this.value;
      case conditional_step_comparators.LESS_THAN_OR_EQUAL:
      case conditional_step_comparators.SIGN_LESS_THAN_OR_EQUAL:
        return this.subject <= this.value;
      default:
        throw new Error(`Unknown operator: ${this.operator}`);
    }
  }

  /**
   * Sets the conditional properties for this logic step.
   * @param {Object} options - The conditional configuration.
   * @param {*} options.subject - The value to compare against.
   * @param {string} options.operator - The comparison operator to use.
   * @param {*} options.value - The value to compare the subject with.
   * @returns {void}
   */
  setConditional({ subject, operator, value }) {
    this.subject = subject;
    this.operator = operator;
    this.value = value;
  }
}
