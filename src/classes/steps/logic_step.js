import Step from './step.js';
import { step_types } from '../../enums/index.js';

/**
 * LogicStep class for conditional logic operations.
 * @class LogicStep
 * @extends Step
 */
export default class LogicStep extends Step {
  static step_name = 'logic';

  /**
   * Creates a new LogicStep instance.
   * @param {Object} options - Configuration options.
   * @param {string} [options.name] - Name of the step.
   * @param {Object} [options.conditional] - Conditional configuration.
   * @param {*} [options.conditional.subject] - Subject to evaluate.
   * @param {string} [options.conditional.operator] - Comparison operator.
   * @param {*} [options.conditional.value] - Value to compare against.
   * @param {Function} [options.callable=async () => {}] - Function to execute.
   */
  constructor({
    name,
    callable = async () => {},
    conditional = {
      operator: null,
      subject: null,
      value: null,
    },
  }) {
    super({
      name,
      base_type: step_types.LOGIC_STEP,
      callable
    });

    this.setConditional(conditional);
  }

  /**
   * Evaluates the conditional expression.
   * @returns {boolean} True if the condition is met.
   * @throws {Error} Throws if operator is unknown.
   */
  checkCondition() {
    const subject = this.subject;
    const operator = this.operator;
    const value = this.value;

    switch (operator) {
      case this.getState('conditional_step_comparators.STRICT_EQUALS'):
      case this.getState('conditional_step_comparators.SIGN_STRICT_EQUALS'):
        return subject === value;
      case this.getState('conditional_step_comparators.SIGN_EQUALS'):
      case this.getState('conditional_step_comparators.EQUALS'):
        return subject == value;
      case this.getState('conditional_step_comparators.NOT_EQUALS'):
      case this.getState('conditional_step_comparators.SIGN_NOT_EQUALS'):
        return subject != value;
      case this.getState('conditional_step_comparators.STRICT_NOT_EQUALS'):
      case this.getState('conditional_step_comparators.SIGN_STRICT_NOT_EQUALS'):
        return subject !== value;
      case this.getState('conditional_step_comparators.GREATER_THAN'):
      case this.getState('conditional_step_comparators.SIGN_GREATER_THAN'):
        return subject > value;
      case this.getState('conditional_step_comparators.LESS_THAN'):
      case this.getState('conditional_step_comparators.SIGN_LESS_THAN'):
        return subject < value;
      case this.getState('conditional_step_comparators.GREATER_THAN_OR_EQUAL'):
      case this.getState('conditional_step_comparators.SIGN_GREATER_THAN_OR_EQUAL'):
        return subject >= value;
      case this.getState('conditional_step_comparators.LESS_THAN_OR_EQUAL'):
      case this.getState('conditional_step_comparators.SIGN_LESS_THAN_OR_EQUAL'):
        return subject <= value;
      default:
        throw new Error(`Unknown operator: ${operator}`);
    }
  }

  /**
   * Checks if the conditional configuration is valid.
   * @returns {boolean} True if conditional is valid.
   */
  conditionalIsValid() {
    return (
      this.subject !== null &&
      this.subject !== undefined &&
      this.operator !== null &&
      this.operator !== undefined &&
      this.value !== null &&
      this.value !== undefined
    );
  }

  /**
   * Sets the conditional properties.
   * @param {Object} conditional - Conditional configuration object.
   * @throws {Error} Throws if conditional is invalid.
   */
  setConditional(conditional) {
    this.subject = conditional.subject;
    this.operator = conditional.operator;
    this.value = conditional.value;
  }
}
