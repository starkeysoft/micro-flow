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

  /**
   * Creates a new LogicStep instance.
   * @constructor
   * @param {Object} options - Configuration options for the logic step.
   * @param {string} options.type - The type of the logic step (from logic_step_types enum).
   * @param {Function|Step|Workflow} [options.callable=async()=>{}] - The function, Step, or Workflow to execute for this step.
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
    
    this.state.set('subject', undefined);
    this.state.set('operator', undefined);
    this.state.set('value', undefined);
  }

  /**
   * Evaluates the subject using the specified operator.
   * Supports strict/loose equality, inequality, and relational operators.
   * @returns {boolean} True if the condition is met, false otherwise.
   * @throws {Error} If the operator is unknown.
   */
  checkCondition() {
    const subject = this.state.get('subject');
    const operator = this.state.get('operator');
    const value = this.state.get('value');
    
    switch (operator) {
      case conditional_step_comparators.STRICT_EQUALS:
      case conditional_step_comparators.SIGN_STRICT_EQUALS:
        return subject === value;
      case conditional_step_comparators.SIGN_EQUALS:
      case conditional_step_comparators.EQUALS:
        return subject == value;
      case conditional_step_comparators.NOT_EQUALS:
      case conditional_step_comparators.SIGN_NOT_EQUALS:
        return subject != value;
      case conditional_step_comparators.STRICT_NOT_EQUALS:
      case conditional_step_comparators.SIGN_STRICT_NOT_EQUALS:
        return subject !== value;
      case conditional_step_comparators.GREATER_THAN:
      case conditional_step_comparators.SIGN_GREATER_THAN:
        return subject > value;
      case conditional_step_comparators.LESS_THAN:
      case conditional_step_comparators.SIGN_LESS_THAN:
        return subject < value;
      case conditional_step_comparators.GREATER_THAN_OR_EQUAL:
      case conditional_step_comparators.SIGN_GREATER_THAN_OR_EQUAL:
        return subject >= value;
      case conditional_step_comparators.LESS_THAN_OR_EQUAL:
      case conditional_step_comparators.SIGN_LESS_THAN_OR_EQUAL:
        return subject <= value;
      default:
        throw new Error(`Unknown operator: ${operator}`);
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
    this.state.set('subject', subject);
    this.state.set('operator', operator);
    this.state.set('value', value);
  }
}
