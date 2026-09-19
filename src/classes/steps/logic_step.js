import Step from './step.js';
import { conditional_step_comparators, step_types } from '../../enums/index.js';

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
   * @param {*|Function} [options.conditional.subject] - Subject to evaluate. Can be a function that returns the value.
   * @param {conditional_step_comparators|string} [options.conditional.operator] - Comparison operator.
   * @param {*|Function, optional} [options.conditional.value] - Value to compare against. Can be a function that returns the value.
   * @param {Function} [options.callable=async () => {}] - Function to execute.
   * @param {string|null} [options.callable_registry_key=null] - Optional key to reference the callable to be rehydrated after serialization.
   */
  constructor({
    name,
    callable = async () => {},
    callable_registry_key = null,
    conditional = {
      operator: null,
      subject: null,
      value: null,
    },
  }) {
    super({
      name,
      step_type: step_types.LOGIC,
      callable,
      callable_registry_key,
    });

    this.setConditional(conditional);
  }

  /**
   * Evaluates the conditional expression.
   * Supports function subjects and values - they are called to get the actual value.
   * @returns {boolean} True if the condition is met.
   * @throws {Error} Throws if operator is unknown.
   */
  checkCondition() {
    const raw_subject = this.conditional_config.subject;
    const raw_value = this.conditional_config.value;
    const operator = this.conditional_config.operator;
    
    // Resolve subject - call it if it's a function
    const subject = typeof raw_subject === 'function' ? raw_subject() : raw_subject;
    
    // Don't resolve value for CUSTOM_FUNCTION - the value IS the function to call
    const is_custom_function = operator === this.getState('conditional_step_comparators.CUSTOM_FUNCTION');
    const value = (!is_custom_function && typeof raw_value === 'function') ? raw_value() : raw_value;

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
      case this.getState('conditional_step_comparators.STRING_CONTAINS'):
      case this.getState('conditional_step_comparators.STRING_INCLUDES'):
      case this.getState('conditional_step_comparators.ARRAY_CONTAINS'):
      case this.getState('conditional_step_comparators.ARRAY_INCLUDES'):
        return (Array.isArray(subject) || typeof subject === 'string') && subject.includes(value);
      case this.getState('conditional_step_comparators.IN'):
        return (Array.isArray(value) || typeof value === 'string') && value.includes(subject);
      case this.getState('conditional_step_comparators.STRING_NOT_CONTAINS'):
      case this.getState('conditional_step_comparators.STRING_NOT_INCLUDES'):
      case this.getState('conditional_step_comparators.ARRAY_NOT_CONTAINS'):
      case this.getState('conditional_step_comparators.ARRAY_NOT_INCLUDES'):
        return (Array.isArray(subject) || typeof subject === 'string') && !subject.includes(value);
      case this.getState('conditional_step_comparators.NOT_IN'):
        return (Array.isArray(value) || typeof value === 'string') && !value.includes(subject);
      case this.getState('conditional_step_comparators.EMPTY'):
        return subject === '' || subject === null || subject === undefined || subject.length === 0;
      case this.getState('conditional_step_comparators.NOT_EMPTY'):
        return subject !== '' && subject !== null && subject !== undefined && subject.length > 0;
      case this.getState('conditional_step_comparators.REGEX_MATCH'):
        if (typeof value !== 'string') {
          throw new Error(`Regex input must be a string.`);
        }
        const regex = new RegExp(value);
        return regex.test(subject);
      case this.getState('conditional_step_comparators.REGEX_NOT_MATCH'):
        if (typeof value !== 'string') {
          throw new Error(`Regex input must be a string.`);
        }
        const not_match_regex = new RegExp(value);
        return !not_match_regex.test(subject);
      case this.getState('conditional_step_comparators.STRING_STARTS_WITH'):
        return typeof subject === 'string' && typeof value === 'string' && subject.startsWith(value);
      case this.getState('conditional_step_comparators.STRING_ENDS_WITH'):
        return typeof subject === 'string' && typeof value === 'string' && subject.endsWith(value);
      case this.getState('conditional_step_comparators.NULLISH'):
        return subject === null || subject === undefined;
      case this.getState('conditional_step_comparators.NOT_NULLISH'):
        return subject !== null && subject !== undefined;
      case this.getState('conditional_step_comparators.IS_TYPE'):
        return typeof subject === value;
      case this.getState('conditional_step_comparators.IS_NOT_TYPE'):
        return typeof subject !== value;
      case this.getState('conditional_step_comparators.CUSTOM_FUNCTION'):
        if (typeof value !== 'function') {
          throw new Error(`Invalid custom function: ${value}`);
        }
        return value(subject);
      default:
        throw new Error(`Unknown operator: ${operator}`);
    }
  }

  /**
   * Checks if the conditional configuration is valid.
   * A valid conditional has subject and operator set (not null/undefined).
   * Functions are valid as subject or value - they will be called during checkCondition().
   * @returns {boolean} True if conditional is valid.
   */
  conditionalIsValid() {
    // Check if all conditional properties are set (not null or undefined)
    // Can't use falsy check here because valid values could be falsy (e.g. empty string, 0, false)
    // Functions are valid - they'll be called to get the actual value
    return (
      this.conditional_config.subject !== null &&
      this.conditional_config.subject !== undefined &&
      this.conditional_config.operator !== null &&
      this.conditional_config.operator !== undefined
    );
  }

  /**
   * Sets the conditional properties.
   * @param {Object} conditional - Conditional configuration object.
   */
  setConditional(conditional) {
    this.conditional_config = { subject: conditional.subject, operator: conditional.operator, value: conditional.value };
  }

  /**
   * Inserts safely serializable properties of the step into a new object for serialization.
   * Note: function-valued subject/value are not persisted - there's no registry for them,
   * only the plain-callable field supports registry-based rehydration.
   * @returns {Object} An object containing the step's properties ready for serialization.
   */
  prepareForSerialization() {
    return {
      ...super.prepareForSerialization(),
      conditional: { ...this.conditional_config },
    };
  }
}

LogicStep.registerStepClass(LogicStep);
