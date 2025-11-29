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
    
    this.setStepStateValue('subject', undefined);
    this.setStepStateValue('operator', undefined);
    this.setStepStateValue('value', undefined);
  }

  /**
   * Evaluates the subject using the specified operator.
   * Supports strict/loose equality, inequality, and relational operators.
   * @returns {boolean} True if the condition is met, false otherwise.
   * @throws {Error} If the operator is unknown.
   */
  checkCondition() {
    const subject = this.getStepStateValue('subject');
    const operator = this.getStepStateValue('operator');
    const value = this.getStepStateValue('value');

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
   * @param {Object} options - The conditional properties to set. Optional. If not provided, uses the current state values.
   * May be either a static value or a string path to resolve from state.
   * @param {*} [options.subject] - Optional. The subject to evaluate. If not provided, uses the subject from the current state.
   * @param {string} [options.operator] - Optional. The operator to use for evaluation. If not provided, uses the operator from the current state.
   * @param {*} [options.value] - Optional. The value to compare against. If not provided, uses the value from the current state.
   * @param {boolean} [options.shouldResolve=true] - Optional. Whether to resolve the values from a dot-delimited path string. Defaults to true.
   * If you need to pass in a string for the subject or value, set this to false, otherwise it will attempt to resolve it from state.
   * @returns {Object} An object containing the resolved subject, operator, and value.
   */
  setConditional({ subject, operator, value, shouldResolve = true } = {}) {
    const currentSubject = subject ?? this.getStepStateValue('subject');
    const resolvedSubject = shouldResolve ? this.getStepStateValue(currentSubject) : currentSubject;
    this.setStepStateValue(
      'subject',
      resolvedSubject
    );
  
    const currentOperator = operator ?? this.getStepStateValue('operator');
    const resolvedOperator = shouldResolve ? this.getStepStateValue(currentOperator) : currentOperator;
    this.setStepStateValue(
      'operator',
      resolvedOperator
    );

    const currentValue = value ?? this.getStepStateValue('value');
    const resolvedValue = shouldResolve ? this.getStepStateValue(currentValue) : currentValue;
    this.setStepStateValue(
      'value',
      resolvedValue
    );

    return { resolvedSubject, resolvedOperator, resolvedValue };
  }

  /**
   * Gets the conditional properties for this logic step.
   * @returns {Object} An object containing the subject, operator, and value.
   */
  getConditional() {
    return {
      subject: this.getStepStateValue('subject'),
      operator: this.getStepStateValue('operator'),
      value: this.getStepStateValue('value'),
    };
  }
}
