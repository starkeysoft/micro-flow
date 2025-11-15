import LogicStep from './logic_step';
import logic_step_types from '../enums/logic_step_types';

/**
 * Represents a skip step that conditionally skips execution based on a condition.
 * @class SkipStep
 * @extends LogicStep
 */
class SkipStep extends LogicStep {
  static step_name = logic_step_types.SKIP;

  /**
   * Creates a new SkipStep instance.
   * @constructor
   * @param {Object} options - Configuration options for the skip step.
   * @param {*} options.subject - The value to compare against.
   * @param {string} options.operator - The comparison operator to use (e.g., '===', '==', '!=', '>', '<', '>=', '<=').
   * @param {*} options.value - The value to compare the subject with.
   * @param {string} [options.name=''] - The name of the skip step.
   */
  constructor({
    subject,
    operator,
    value,
    name = ''
  }) {
    super({
      type: logic_step_types.SKIP,
      name,
    });

    this.setConditional({ subject, operator, value });
    this.state.set('should_skip', false);
    this.state.set('callable', this.skipStep.bind(this));
  }

  /**
   * Evaluates the condition and sets the should_skip flag accordingly.
   * @returns {boolean} True if the step should be skipped, false otherwise.
   */
  skipStep() {
    if (this.checkCondition()) {
      this.state.set('should_skip', true);
    }

    return this.state.get('should_skip');
  }
}

export default SkipStep;
