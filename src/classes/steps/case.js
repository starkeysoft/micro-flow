import Step from './step.js';
import LogicStep from './logic_step.js';
import { conditional_step_comparators } from '../../enums/index.js';

/**
 * Case class representing a single case in a switch statement.
 * Used in conjunction with SwitchStep to create switch/case logic.
 * @class Case
 * @extends LogicStep
 */
export default class Case extends LogicStep {
  static step_name = 'case';

  /**
   * Creates a new Case instance.
   * Note: Plain LogicStep instances can be used in place of Case, but they MUST have conditional.subject set.
   * @param {Object} options - Configuration options.
   * @param {string} [options.name] - Name of the case.
   * @param {Object} [options.conditional] - Conditional configuration.
   * @param {*|Function} [options.conditional.subject=null] - Subject to evaluate (typically set by SwitchStep). Can be a function.
   * @param {conditional_step_comparators|string} [options.conditional.operator=null] - Comparison operator.
   * @param {*|Function} [options.conditional.value=null] - Value to compare against. Can be a function that returns the value.
   * @param {Function|Step|Workflow} [options.callable=Step.noop] - Function, Step, or Workflow to execute when case matches.
   * @param {string|null} [options.callable_registry_key=null] - Registry key to serialize `callable` under when it's a function (defaults to the function's name); it's resolved from the `CallableRegistry` passed to `hydrate()`.
   * @param {boolean} [options.force_subject_override=false] - Force override of subject even if already set.
   * @param {number} [options.max_retries=0] - Maximum number of retries on failure.
   * @param {number|null} [options.max_timeout_ms=30000] - Maximum execution time per attempt in milliseconds. `null` disables the timeout.
   */
  constructor({
    name,
    conditional = {
      subject: null,
      operator: null,
      value: null,
    },
    callable = Step.noop,
    callable_registry_key = null,
    force_subject_override = false,
    max_retries,
    max_timeout_ms,
  }) {
    super({
      name,
      step_type: Case.step_name,
      callable,
      callable_registry_key,
      max_retries,
      max_timeout_ms,
    });

    this.setConditional(conditional);
    this.force_subject_override = force_subject_override;

    // Subject provided by the parent SwitchStep at run time. Kept separate from
    // conditional_config so it's never serialized (it would be stale after hydration).
    this._switch_subject = null;

    this.is_matched = false;
  }

  /**
   * Sets the switch subject from the parent SwitchStep. It's held separately from
   * `conditional_config` (so it's never serialized) and used as the conditional subject when this
   * case has no subject of its own, or when `force_subject_override` is true - see
   * `getConditionalSubject()`.
   * @param {*} subject - The subject value from the SwitchStep.
   * @throws {Error} If no subject is provided and conditional.subject is not set.
   * @throws {Error} If the resulting conditional configuration is invalid.
   */
  set switch_subject(subject) {
    const subject_provided = subject !== null && subject !== undefined;
    const has_existing_subject = this.conditional_config.subject !== null && this.conditional_config.subject !== undefined;

    if (!subject_provided && !has_existing_subject) {
      throw new Error(`No subject set for case step: ${this.name}, using default equality check`);
    }

    this._switch_subject = subject_provided ? subject : null;

    if (!this.conditionalIsValid()) {
      throw new Error(`Invalid conditional configuration for case step: ${this.name}`);
    }
  }

  /**
   * Gets the switch subject last provided by the parent SwitchStep.
   * @returns {*} The switch subject, or null if none has been provided.
   */
  get switch_subject() {
    return this._switch_subject;
  }

  /**
   * Returns the subject to evaluate: the switch subject if one was provided and this case has no
   * subject of its own (or `force_subject_override` is set), otherwise the configured subject.
   * @returns {*|Function} The effective conditional subject.
   */
  getConditionalSubject() {
    const own_subject = this.conditional_config.subject;
    const has_own_subject = own_subject !== null && own_subject !== undefined;
    const has_switch_subject = this._switch_subject !== null && this._switch_subject !== undefined;

    if (has_switch_subject && (!has_own_subject || this.force_subject_override)) {
      return this._switch_subject;
    }

    return own_subject;
  }

  /**
   * Inserts safely serializable properties of the step into a new object for serialization.
   * @returns {Object} An object containing the step's properties ready for serialization.
   */
  prepareForSerialization() {
    return {
      ...super.prepareForSerialization(),
      force_subject_override: this.force_subject_override,
      is_matched: this.is_matched,
    };
  }

  /**
   * Hydrates a parsed step object into a Case instance, restoring match state.
   * @param {Object} parsed_step - The parsed step object.
   * @param {import('../callable_registry.js').default|null} [callable_registry] - Registry used to resolve function callables.
   * @returns {Case} The hydrated Case instance.
   */
  static hydrate(parsed_step, callable_registry = null) {
    const instance = super.hydrate(parsed_step, callable_registry);
    instance.is_matched = parsed_step.is_matched ?? false;

    return instance;
  }
}

Case.registerStepClass(Case);
