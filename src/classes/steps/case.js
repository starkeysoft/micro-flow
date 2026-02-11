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
   * @param {*} [options.conditional.subject=null] - Subject to evaluate (typically set by SwitchStep).
   * @param {conditional_step_comparators|string} [options.conditional.operator=null] - Comparison operator.
   * @param {*} [options.conditional.value=null] - Value to compare against.
   * @param {Function|Step|Workflow} [options.callable=async () => {}] - Function, Step, or Workflow to execute when case matches.
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
    force_subject_override = false,
  }) {
    super({
      name,
      step_type: Case.step_name,
      callable,
    });

    this.conditional = conditional;
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
    if (!subject && !this.conditional.subject) {
      throw new Error(`No subject set for case step: ${this.name}, using default equality check`);
    }

    if (subject && (!this.conditional.subject || this.force_subject_override)) {
      this.conditional.subject = subject;
    }

    if (!this.conditionalIsValid()) {
      throw new Error(`Invalid conditional configuration for case step: ${this.name}`);
    }
  }
}
