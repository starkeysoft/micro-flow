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
   * @param {Function|Step|Workflow} [options.callable=async () => {}] - Function, Step, or Workflow to execute when case matches.
   * @param {string|null} [options.callable_registry_key=null] - Optional key to reference the callable to be rehydrated after serialization.
   * @param {boolean} [options.force_subject_override=false] - Force override of subject even if already set.
   */
  constructor({
    name,
    conditional = {
      subject: null,
      operator: null,
      value: null,
    },
    callable = async () => {},
    callable_registry_key = null,
    force_subject_override = false,
  }) {
    super({
      name,
      step_type: Case.step_name,
      callable,
      callable_registry_key,
    });

    this.conditional_config = conditional;
    this.force_subject_override = force_subject_override;

    this.is_matched = false;
  }

  /**
   * Sets the switch subject from the parent SwitchStep.
   * Automatically sets the conditional subject if not already set or if force_subject_override is true.
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

    if (subject_provided && (!has_existing_subject || this.force_subject_override)) {
      this.conditional_config.subject = subject;
    }

    if (!this.conditionalIsValid()) {
      throw new Error(`Invalid conditional configuration for case step: ${this.name}`);
    }
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
