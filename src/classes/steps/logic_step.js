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
   * @param {string|null} [options.callable_registry_key=null] - Registry key to serialize `callable` under when it's a function (defaults to the function's name); it's resolved from the `CallableRegistry` passed to `hydrate()`.
   * @param {number} [options.max_retries=0] - Maximum number of retries on failure.
   * @param {number|null} [options.max_timeout_ms=30000] - Maximum execution time per attempt in milliseconds. `null` disables the timeout.
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
    max_retries,
    max_timeout_ms,
  }) {
    super({
      name,
      step_type: step_types.LOGIC,
      callable,
      callable_registry_key,
      max_retries,
      max_timeout_ms,
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
    const raw_subject = this.getConditionalSubject();
    const raw_value = this.conditional_config.value;
    const operator = this.conditional_config.operator;
    
    // Resolve subject - call it if it's a function
    const subject = typeof raw_subject === 'function' ? raw_subject() : raw_subject;
    
    // Don't resolve value for CUSTOM_FUNCTION - the value IS the function to call
    const is_custom_function = operator === conditional_step_comparators.CUSTOM_FUNCTION;
    const value = (!is_custom_function && typeof raw_value === 'function') ? raw_value() : raw_value;

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
      case conditional_step_comparators.STRING_CONTAINS:
      case conditional_step_comparators.STRING_INCLUDES:
      case conditional_step_comparators.ARRAY_CONTAINS:
      case conditional_step_comparators.ARRAY_INCLUDES:
        return (Array.isArray(subject) || typeof subject === 'string') && subject.includes(value);
      case conditional_step_comparators.IN:
        return (Array.isArray(value) || typeof value === 'string') && value.includes(subject);
      case conditional_step_comparators.STRING_NOT_CONTAINS:
      case conditional_step_comparators.STRING_NOT_INCLUDES:
      case conditional_step_comparators.ARRAY_NOT_CONTAINS:
      case conditional_step_comparators.ARRAY_NOT_INCLUDES:
        return (Array.isArray(subject) || typeof subject === 'string') && !subject.includes(value);
      case conditional_step_comparators.NOT_IN:
        return (Array.isArray(value) || typeof value === 'string') && !value.includes(subject);
      case conditional_step_comparators.EMPTY:
        return subject === '' || subject === null || subject === undefined || subject.length === 0;
      case conditional_step_comparators.NOT_EMPTY:
        return subject !== '' && subject !== null && subject !== undefined && subject.length > 0;
      case conditional_step_comparators.REGEX_MATCH:
        if (typeof value !== 'string') {
          throw new Error(`Regex input must be a string.`);
        }
        const regex = new RegExp(value);
        return regex.test(subject);
      case conditional_step_comparators.REGEX_NOT_MATCH:
        if (typeof value !== 'string') {
          throw new Error(`Regex input must be a string.`);
        }
        const not_match_regex = new RegExp(value);
        return !not_match_regex.test(subject);
      case conditional_step_comparators.STRING_STARTS_WITH:
        return typeof subject === 'string' && typeof value === 'string' && subject.startsWith(value);
      case conditional_step_comparators.STRING_ENDS_WITH:
        return typeof subject === 'string' && typeof value === 'string' && subject.endsWith(value);
      case conditional_step_comparators.NULLISH:
        return subject === null || subject === undefined;
      case conditional_step_comparators.NOT_NULLISH:
        return subject !== null && subject !== undefined;
      case conditional_step_comparators.IS_TYPE:
        return typeof subject === value;
      case conditional_step_comparators.IS_NOT_TYPE:
        return typeof subject !== value;
      case conditional_step_comparators.CUSTOM_FUNCTION:
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
    const subject = this.getConditionalSubject();

    return (
      subject !== null &&
      subject !== undefined &&
      this.conditional_config.operator !== null &&
      this.conditional_config.operator !== undefined
    );
  }

  /**
   * Returns the (unresolved) subject used when evaluating the conditional. Subclasses can
   * override this to supply a subject from somewhere other than `conditional_config` (e.g.
   * `Case` uses its parent `SwitchStep`'s subject) without persisting it.
   * @returns {*|Function} The conditional subject.
   */
  getConditionalSubject() {
    return this.conditional_config.subject;
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
   * Function-valued subject/value are stored as `null` in `conditional`, with a registry
   * reference (keyed by the function's name) in `conditional_callables` instead, so they can be
   * resolved from a `CallableRegistry` on hydration. Anonymous functions can't be referenced
   * and are dropped.
   * @returns {Object} An object containing the step's properties ready for serialization.
   */
  prepareForSerialization() {
    const { subject, operator, value } = this.conditional_config;

    return {
      ...super.prepareForSerialization(),
      conditional: {
        subject: typeof subject === 'function' ? null : subject,
        operator,
        value: typeof value === 'function' ? null : value,
      },
      conditional_callables: {
        subject: Step.serializeFunctionRef(subject),
        value: Step.serializeFunctionRef(value),
      },
    };
  }

  /**
   * Hydrates a parsed step object into an instance of `this` class, resolving any function-valued
   * conditional subject/value from `conditional_callables`.
   * @param {Object} parsed_step - The parsed step object.
   * @param {import('../callable_registry.js').default|null} [callable_registry] - Registry used to resolve function callables.
   * @returns {LogicStep} The hydrated LogicStep (or subclass) instance.
   */
  static hydrate(parsed_step, callable_registry = null) {
    const conditional = { ...(parsed_step.conditional ?? {}) };
    const callables = parsed_step.conditional_callables ?? {};

    for (const key of ['subject', 'value']) {
      if (callables[key]) {
        conditional[key] = Step.hydrateFunctionRef(callables[key], callable_registry);
      }
    }

    return super.hydrate({ ...parsed_step, conditional }, callable_registry);
  }
}

LogicStep.registerStepClass(LogicStep);
